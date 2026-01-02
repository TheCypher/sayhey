import { NextRequest, NextResponse } from "next/server";

import {
  MAGIC_LINK_RATE_LIMIT,
  buildMagicLinkUrl,
  createMagicLinkForEmail,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth/magic-link-service";
import { rateLimit } from "@/lib/auth/rate-limit";
import { sendMagicLinkEmail } from "@/lib/email/mailtrap";

export const runtime = "nodejs";

function getRequestIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  let body: { email?: string } | null = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const rawEmail = typeof body?.email === "string" ? body.email : "";
  const email = normalizeEmail(rawEmail);

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const rateKey = `${getRequestIp(request)}:${email}`;
  const limit = rateLimit(rateKey, MAGIC_LINK_RATE_LIMIT);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429 }
    );
  }

  const { token } = await createMagicLinkForEmail(email);
  const magicLink = buildMagicLinkUrl(token);

  await sendMagicLinkEmail(email, magicLink);

  return NextResponse.json({ ok: true });
}
