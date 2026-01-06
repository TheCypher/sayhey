import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth/session";

import WelcomePage from "../page";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  verifySessionToken: jest.fn(),
}));

describe("Welcome page", () => {
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

  it("uses the shared sunset background", async () => {
    const html = renderToStaticMarkup(await WelcomePage());

    expect(html).toContain('data-auth-theme="sunset"');
    expect(html).toContain("min-h-[100dvh]");
  });

  it("renders the quick tour content", async () => {
    const html = renderToStaticMarkup(await WelcomePage());

    expect(html).toContain("Ready to think out loud?");
    expect(html).toContain("Shortcuts");
    expect(html).toContain("Undo/Restore");
  });
});
