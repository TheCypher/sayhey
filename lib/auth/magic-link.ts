import crypto from "crypto";

import { getTokenSecret } from "./env";

export const MAGIC_LINK_TTL_MINUTES = 15;
const TOKEN_BYTES = 32;

export type MagicLinkToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export function hashMagicToken(token: string): string {
  const secret = getTokenSecret();

  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export function createMagicLinkToken(now: Date = new Date()): MagicLinkToken {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashMagicToken(token);
  const expiresAt = new Date(
    now.getTime() + MAGIC_LINK_TTL_MINUTES * 60 * 1000
  );

  return { token, tokenHash, expiresAt };
}

export function isMagicLinkExpired(
  expiresAt: Date,
  now: Date = new Date()
): boolean {
  return expiresAt.getTime() <= now.getTime();
}
