import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import AccountPage from "../page";

const mockNextLink = jest.fn((props: any) => {
  const { href, children, prefetch, ...rest } = props;

  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
});

jest.mock("next/link", () => ({
  __esModule: true,
  default: (props: any) => mockNextLink(props),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  verifySessionToken: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Account page", () => {
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
  const mockVerifySessionToken =
    verifySessionToken as jest.MockedFunction<typeof verifySessionToken>;
  const mockFindUnique = prisma.user
    .findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;

  beforeEach(() => {
    mockCookies.mockResolvedValue({
      get: jest.fn(() => ({ value: "signed-token" })),
    } as Awaited<ReturnType<typeof cookies>>);
    mockVerifySessionToken.mockReturnValue({
      sub: "user-123",
      email: "hello@example.com",
      iat: 0,
      exp: 999999,
    });
    mockFindUnique.mockResolvedValue({
      id: "user-123",
      email: "hello@example.com",
      displayName: "Hello",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders signed-in account details", async () => {
    const html = renderToStaticMarkup(await AccountPage());

    expect(html).toContain('data-page="account"');
    expect(html).toContain("Account");
    expect(html).toContain("hello@example.com");
    expect(html).toContain('data-control="display-name-form"');
    expect(html).toContain('href="/auth/logout"');
    expect(html).toContain("Logout");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("disables prefetch on the logout link", async () => {
    renderToStaticMarkup(await AccountPage());

    const logoutCall = mockNextLink.mock.calls.find(
      ([props]) => props?.href === "/auth/logout"
    );

    expect(logoutCall?.[0].prefetch).toBe(false);
  });
});
