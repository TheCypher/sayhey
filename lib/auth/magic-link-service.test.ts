import { buildMagicLinkUrl, normalizeEmail } from "./magic-link-service";

describe("magic link service helpers", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://sayhey.local";
  });

  afterEach(() => {
    delete process.env.APP_URL;
  });

  it("normalizes email casing and whitespace", () => {
    expect(normalizeEmail("  Hello@Example.com ")).toBe("hello@example.com");
  });

  it("builds a magic-link verification url from APP_URL", () => {
    const url = buildMagicLinkUrl("token-123");

    expect(url).toBe("https://sayhey.local/auth/verify?token=token-123");
  });
});
