import { rateLimit } from "./rate-limit";

describe("rate limiting", () => {
  it("allows requests within the window", () => {
    const key = "user:1";
    const now = Date.now();

    const first = rateLimit(key, { windowMs: 60000, max: 2 }, now);
    const second = rateLimit(key, { windowMs: 60000, max: 2 }, now + 1000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const key = "user:2";
    const now = Date.now();

    rateLimit(key, { windowMs: 60000, max: 1 }, now);
    const blocked = rateLimit(key, { windowMs: 60000, max: 1 }, now + 500);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
