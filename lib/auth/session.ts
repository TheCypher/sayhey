import crypto from "crypto";

import { getTokenSecret } from "./env";

export const SESSION_TTL_DAYS = 7;

export type SessionPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

type SessionInput = {
  userId: string;
  email: string;
};

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;

  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const paddedValue = `${padded}${"=".repeat(padLength)}`;

  return Buffer.from(paddedValue, "base64").toString("utf8");
}

function sign(input: string, secret: string): string {
  return base64UrlEncode(
    crypto.createHmac("sha256", secret).update(input).digest()
  );
}

export function createSessionToken(
  input: SessionInput,
  now: Date = new Date()
): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + SESSION_TTL_DAYS * 24 * 60 * 60;
  const header = { alg: "HS256", typ: "JWT" };
  const payload: SessionPayload = {
    sub: input.userId,
    email: input.email,
    iat: issuedAt,
    exp: expiresAt,
  };
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${headerEncoded}.${payloadEncoded}`;
  const signature = sign(unsigned, getTokenSecret());

  return `${unsigned}.${signature}`;
}

export function verifySessionToken(
  token: string,
  now: Date = new Date()
): SessionPayload | null {
  try {
    const [header, payload, signature] = token.split(".");

    if (!header || !payload || !signature) {
      return null;
    }

    const unsigned = `${header}.${payload}`;
    const expectedSignature = sign(unsigned, getTokenSecret());
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payloadJson = base64UrlDecode(payload);
    const parsed = JSON.parse(payloadJson) as SessionPayload;

    if (!parsed.exp || now.getTime() / 1000 > parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
