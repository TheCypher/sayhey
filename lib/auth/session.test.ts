import {
  SESSION_TTL_DAYS,
  createSessionToken,
  verifySessionToken,
} from "./session";

describe("session tokens", () => {
  beforeEach(() => {
    process.env.TOKEN_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.TOKEN_SECRET;
  });

  it("creates a signed session token with expiry", () => {
    const now = new Date("2024-02-01T12:00:00.000Z");

    const token = createSessionToken(
      { userId: "user-123", email: "hello@example.com" },
      now
    );

    const payload = verifySessionToken(token, now);

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user-123");
    expect(payload?.email).toBe("hello@example.com");
    expect(payload?.exp).toBe(
      Math.floor(now.getTime() / 1000) + SESSION_TTL_DAYS * 24 * 60 * 60
    );
  });

  it("rejects expired tokens", () => {
    const now = new Date("2024-02-01T12:00:00.000Z");
    const token = createSessionToken(
      { userId: "user-123", email: "hello@example.com" },
      now
    );

    const later = new Date(
      now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000 + 1000
    );

    expect(verifySessionToken(token, later)).toBeNull();
  });

  it("rejects tampered tokens", () => {
    const now = new Date("2024-02-01T12:00:00.000Z");
    const token = createSessionToken(
      { userId: "user-123", email: "hello@example.com" },
      now
    );

    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}-oops.${parts[2]}`;

    expect(verifySessionToken(tampered, now)).toBeNull();
  });
});
