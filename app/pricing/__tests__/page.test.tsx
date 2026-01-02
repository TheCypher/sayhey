import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth/session";

import PricingPage from "../page";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  verifySessionToken: jest.fn(),
}));

describe("Pricing page", () => {
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

  it("lists the disabled Team and API options in the plan selector", async () => {
    const html = renderToStaticMarkup(await PricingPage());

    expect(html).toContain(">Individual<");
    expect(html).toContain(">Team<");
    expect(html).toContain(">API<");
  });
});
