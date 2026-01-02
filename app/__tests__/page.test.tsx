import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";
import { redirect, useRouter } from "next/navigation";

import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import Home from "../page";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
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

describe("Home page", () => {
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
  const mockVerifySessionToken =
    verifySessionToken as jest.MockedFunction<typeof verifySessionToken>;
  const mockFindUnique = prisma.user
    .findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;

  beforeEach(() => {
    mockUseRouter.mockReturnValue({ push: jest.fn(), replace: jest.fn() });
    mockCookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    } as Awaited<ReturnType<typeof cookies>>);
    mockVerifySessionToken.mockReturnValue(null);
    mockFindUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the landing hero", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain('data-page="home"');
    expect(html).toContain('data-layout="home-split"');
    expect(html).toContain('data-section="home-hero"');
    expect(html).toContain("Don&#x27;t type,");
    expect(html).toContain("just speak.");
    expect(html).toContain("Start journaling");
    expect(html).toContain("Space to talk");
    expect(html).toContain("double-tap to stop");
  });

  it("renders the landing navigation", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain('data-nav="landing"');
    expect(html).toContain('data-control="sidebar-toggle"');
    expect(html).toContain("Say hey");
    expect(html).toContain("Home");
    expect(html).toContain("Welcome");
    expect(html).toContain("About");
    expect(html).toContain("Login");
  });

  it("defaults the homepage sidebar to open on desktop", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain('data-sidebar-state="open"');
    expect(html).toMatch(
      /data-control="sidebar-toggle"[^>]*aria-expanded="true"/
    );
  });

  it("includes the home voice controls", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain('data-control="home-voice-controls"');
    expect(html).toContain('data-section="home-voice-card"');
  });

  it("renders the orbiting home accent", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain('data-animation="home-orbit"');
    expect(html).toContain('data-orbit="hero"');
    expect(html).toContain('data-orbit-size="2xl"');
    expect(html).toContain('attributeName="startOffset"');
  });

  it("seeds the orbit accent with variant, direction, and timing defaults on the server render", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain('data-orbit-variant="swoop-left-high"');
    expect(html).toContain('data-orbit-direction="ltr"');
    expect(html).toContain('startOffset="0%"');
    expect(html).toMatch(/dur="\d+s"/);
  });

  it("keeps the orbit accent visible on mobile", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toMatch(/data-orbit="hero"[^>]*data-orbit-visible="all"/);
  });

  it("swaps Login for Account when the session is valid", async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn(() => ({ value: "session-token" })),
    } as Awaited<ReturnType<typeof cookies>>);
    mockVerifySessionToken.mockReturnValue({
      sub: "user-1",
      email: "user@example.com",
      iat: 0,
      exp: 999999,
    });
    mockFindUnique.mockResolvedValue({
      displayName: "Taylor",
    });

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain(">Account<");
    expect(html).not.toContain(">Login<");
  });

  it("personalizes the hero copy with the signed-in display name", async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn(() => ({ value: "session-token" })),
    } as Awaited<ReturnType<typeof cookies>>);
    mockVerifySessionToken.mockReturnValue({
      sub: "user-1",
      email: "user@example.com",
      iat: 0,
      exp: 999999,
    });
    mockFindUnique.mockResolvedValue({
      displayName: "Taylor",
    });

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Welcome back, Taylor");
  });

  it("redirects pending onboarding users to /onboarding", async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn(() => ({ value: "session-token" })),
    } as Awaited<ReturnType<typeof cookies>>);
    mockVerifySessionToken.mockReturnValue({
      sub: "user-1",
      email: "user@example.com",
      iat: 0,
      exp: 999999,
    });
    mockFindUnique.mockResolvedValue({
      displayName: "Taylor",
      onboardingStatus: "PENDING",
    });

    await Home();

    expect(mockRedirect).toHaveBeenCalledWith("/onboarding");
  });
});
