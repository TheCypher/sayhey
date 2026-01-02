import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import OnboardingPage from "../page";

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

jest.mock("@/components/application/onboarding-flow", () => ({
  OnboardingFlow: ({ email }: { email: string }) => (
    <div data-testid="onboarding-flow">{email}</div>
  ),
}));

describe("Onboarding page", () => {
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
      onboardingStatus: "PENDING",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the onboarding layout when the session is valid", async () => {
    const element = await OnboardingPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain('data-page="onboarding"');
    expect(html).toContain(
      'class="relative mx-auto flex min-h-[100dvh] w-full max-w-9xl flex-col items-center justify-center gap-10 px-6 py-10 md:px-10 md:py-14"'
    );
    expect(html).toContain("hello@example.com");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
