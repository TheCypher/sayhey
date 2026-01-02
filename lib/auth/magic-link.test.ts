import {
  MAGIC_LINK_TTL_MINUTES,
  createMagicLinkToken,
  hashMagicToken,
  isMagicLinkExpired,
} from "./magic-link";

describe("magic link tokens", () => {
  beforeEach(() => {
    process.env.TOKEN_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.TOKEN_SECRET;
  });

  it("hashes tokens deterministically", () => {
    const token = "sample-token";

    expect(hashMagicToken(token)).toEqual(hashMagicToken(token));
  });

  it("creates a hashed token with a fixed expiry window", () => {
    const now = new Date("2024-02-01T12:00:00.000Z");

    const { token, tokenHash, expiresAt } = createMagicLinkToken(now);

    expect(token).toMatch(/^[a-f0-9]+$/);
    expect(tokenHash).toEqual(hashMagicToken(token));
    expect(expiresAt).toEqual(
      new Date(now.getTime() + MAGIC_LINK_TTL_MINUTES * 60 * 1000)
    );
  });

  it("flags expired tokens", () => {
    const now = new Date("2024-02-01T12:00:00.000Z");
    const expiredAt = new Date(now.getTime() - 1000);

    expect(isMagicLinkExpired(expiredAt, now)).toBe(true);
  });

  it("accepts valid tokens", () => {
    const now = new Date("2024-02-01T12:00:00.000Z");
    const expiresAt = new Date(now.getTime() + 1000);

    expect(isMagicLinkExpired(expiresAt, now)).toBe(false);
  });

  it("does not include a verification code payload", () => {
    const now = new Date("2024-02-01T12:00:00.000Z");

    const token = createMagicLinkToken(now);

    expect("verificationCode" in token).toBe(false);
    expect("verificationCodeHash" in token).toBe(false);
  });
});
