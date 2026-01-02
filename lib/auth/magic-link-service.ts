import { prisma } from "@/lib/prisma";

import { getAppUrl } from "./env";
import {
  createMagicLinkToken,
  hashMagicToken,
  isMagicLinkExpired,
} from "./magic-link";
import { createSessionToken } from "./session";

export const MAGIC_LINK_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  max: 5,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function buildMagicLinkUrl(token: string): string {
  const url = new URL("/auth/verify", getAppUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

export async function createMagicLinkForEmail(
  email: string,
  now: Date = new Date()
) {
  const normalized = normalizeEmail(email);
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
  });
  let user = existing;
  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: { email: normalized, onboardingStatus: "PENDING" },
    });
    isNewUser = true;
  }

  const { token, tokenHash, expiresAt } = createMagicLinkToken(now);

  await prisma.magicLink.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      isNewUser,
    },
  });

  return { user, token, expiresAt };
}

export type VerifyMagicLinkResult =
  | {
      status: "ok";
      sessionToken: string;
      userId: string;
      email: string;
      onboardingRequired: boolean;
    }
  | { status: "invalid" | "expired" | "used" };

export async function verifyMagicLinkToken(
  token: string,
  now: Date = new Date()
): Promise<VerifyMagicLinkResult> {
  const tokenHash = hashMagicToken(token);
  const magicLink = await prisma.magicLink.findFirst({
    where: { tokenHash },
    include: { user: true },
  });

  if (!magicLink) {
    return { status: "invalid" };
  }

  if (magicLink.usedAt) {
    return { status: "used" };
  }

  if (isMagicLinkExpired(magicLink.expiresAt, now)) {
    return { status: "expired" };
  }

  const [, user] = await prisma.$transaction([
    prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: now },
    }),
    prisma.user.update({
      where: { id: magicLink.userId },
      data: { lastLoginAt: now },
    }),
  ]);

  const sessionToken = createSessionToken(
    { userId: magicLink.userId, email: user.email },
    now
  );

  return {
    status: "ok",
    sessionToken,
    userId: user.id,
    email: user.email,
    onboardingRequired: user.onboardingStatus === "PENDING",
  };
}
