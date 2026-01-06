import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth/session";

import AboutPage from "../page";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  verifySessionToken: jest.fn(),
}));

describe("About page", () => {
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

  it("renders the hero narrative", async () => {
    const html = renderToStaticMarkup(await AboutPage());

    expect(html).toContain('data-about="page"');
    expect(html).toContain('data-auth-theme="sunset"');
    expect(html).toContain("min-h-[100dvh]");
    expect(html).toContain("A voice journal for thinking out loud.");
    expect(html).toContain(
      "edit, refine, and organize them into notes over time."
    );
  });

  it("highlights privacy and trust commitments", async () => {
    const html = renderToStaticMarkup(await AboutPage());

    expect(html).toContain("Privacy First - By Design");
    expect(html).toContain("We do not store your audio.");
    expect(html).toContain("Entries stay editable with Undo/Restore today");
    expect(html).toContain("Trust Through Architecture, Not Promises");
  });
});
