import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth/session";

import AuthPage from "../page";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  verifySessionToken: jest.fn(),
}));

describe("Auth page", () => {
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
  const mockVerifySessionToken =
    verifySessionToken as jest.MockedFunction<typeof verifySessionToken>;

  beforeEach(() => {
    mockCookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    } as Awaited<ReturnType<typeof cookies>>);
    mockVerifySessionToken.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the editorial hero and form layout", async () => {
    const html = renderToStaticMarkup(await AuthPage({}));

    expect(html).toContain('data-page="auth"');
    expect(html).toContain('data-auth-theme="sunset"');
    expect(html).toContain("Make space for");
    expect(html).toContain("what matters.");
    expect(html).toContain('data-auth-panel="form"');
  });

  it("includes the visual panel and primary CTA", async () => {
    const html = renderToStaticMarkup(await AuthPage({}));

    expect(html).toContain('data-auth-panel="visual"');
    expect(html).toContain("Continue with email");
  });

  it("surfaces auth errors from promised search params", async () => {
    const html = renderToStaticMarkup(
      await AuthPage({
        searchParams: Promise.resolve({ error: "invalid" }),
      })
    );

    expect(html).toContain(
      "That link is invalid or expired. Request a new one below."
    );
  });

  it("ignores verification code search params", async () => {
    const html = renderToStaticMarkup(
      await AuthPage({
        searchParams: Promise.resolve({ code: "123456" }),
      })
    );

    expect(html).not.toContain('value="123456"');
    expect(html).not.toContain("Verify code");
  });
});
