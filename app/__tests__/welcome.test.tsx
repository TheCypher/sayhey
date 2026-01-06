import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth/session";

import WelcomePage from "../welcome/page";

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

  it("renders the welcome tour panel", async () => {
    const html = renderToStaticMarkup(await WelcomePage());

    expect(html).toContain('data-state="welcome"');
    expect(html).toContain("Welcome to Say hey");
    expect(html).toContain("Quick tour");
    expect(html).toContain("Editable notes");
    expect(html).toContain("Our philosophy");
  });

  it("includes navigation and start CTA", async () => {
    const html = renderToStaticMarkup(await WelcomePage());

    expect(html).toContain('data-nav="primary"');
    expect(html).toContain("Welcome");
    expect(html).toContain("About");
    expect(html).toMatch(/href="\/journals\/new"[^>]*>Start a journal</);
    expect(html).toMatch(/href="\/"[^>]*>Back home</);
  });
});
