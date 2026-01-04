import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";
import { useRouter, useSearchParams } from "next/navigation";

import { getSessionIdentity } from "@/lib/auth/session-identity";

import JournalPage from "../page";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("@/lib/auth/session-identity", () => ({
  getSessionIdentity: jest.fn(),
}));

describe("Journal page", () => {
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
  const mockGetSessionIdentity =
    getSessionIdentity as jest.MockedFunction<typeof getSessionIdentity>;
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<
    typeof useSearchParams
  >;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    mockCookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    } as Awaited<ReturnType<typeof cookies>>);
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseRouter.mockReturnValue({ replace: jest.fn(), push: jest.fn() });
    mockGetSessionIdentity.mockResolvedValue(null);
  });

  afterEach(() => {
    mockCookies.mockReset();
    mockUseSearchParams.mockReset();
    mockUseRouter.mockReset();
    mockGetSessionIdentity.mockReset();
  });

  it("renders the full-width journal canvas for routed journals", async () => {
    const element = await JournalPage({
      params: Promise.resolve({ id: "conv-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('data-layout="journal-canvas"');
    expect(html).toContain("--page-accent:#6fb09a");
    expect(html).toContain("--page-accent-strong:#1d554c");
    expect(html).not.toContain('data-nav="primary"');
  });

  it("surfaces the user name in the journal header", async () => {
    mockGetSessionIdentity.mockResolvedValue({
      displayName: "Taylor",
      email: "hello@example.com",
    });

    const element = await JournalPage({
      params: Promise.resolve({ id: "conv-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain(">Taylor<");
  });
});
