import { GET } from "../route";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link-service";

jest.mock("@/lib/auth/magic-link-service", () => ({
  verifyMagicLinkToken: jest.fn(),
}));

describe("GET /auth/verify", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://sayhey.local";
  });

  afterEach(() => {
    delete process.env.APP_URL;
    jest.resetAllMocks();
  });

  it("sets the session cookie and redirects to / when the token is valid", async () => {
    (verifyMagicLinkToken as jest.Mock).mockResolvedValue({
      status: "ok",
      sessionToken: "session-token",
      userId: "user-1",
      email: "hello@example.com",
      onboardingRequired: false,
    });

    const response = await GET(
      new Request("https://sayhey.local/auth/verify?token=token-123")
    );

    expect(response.headers.get("location")).toBe("https://sayhey.local/");
    expect(response.headers.get("set-cookie")).toContain("sayhey_session=");
  });
});
