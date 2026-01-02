import { NextRequest } from "next/server";

import { POST } from "../route";
import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/session", () => ({
  verifySessionToken: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

const createRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/onboarding/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: "sayhey_session=token",
    },
    body: JSON.stringify(body),
  });

describe("POST /onboarding/complete", () => {
  const mockVerifySessionToken =
    verifySessionToken as jest.MockedFunction<typeof verifySessionToken>;
  const mockUpdate = prisma.user
    .update as jest.MockedFunction<typeof prisma.user.update>;

  beforeEach(() => {
    mockVerifySessionToken.mockReturnValue({
      sub: "user-123",
      email: "hello@example.com",
      iat: 0,
      exp: 999999,
    });
    mockUpdate.mockResolvedValue({} as Awaited<ReturnType<typeof mockUpdate>>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns a homepage redirect on success", async () => {
    const response = await POST(
      createRequest({
        acceptedTerms: true,
        intent: "personal",
        plan: "free",
        consentToImprove: true,
        displayName: "Taylor",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.redirect).toBe("/");
  });
});
