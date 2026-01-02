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

const createRequest = (
  body: Record<string, unknown>,
  cookie: string | null = "sayhey_session=token"
) =>
  new NextRequest("http://localhost/account/display-name", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

describe("POST /account/display-name", () => {
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

  it("returns 401 when the session is missing", async () => {
    const response = await POST(
      createRequest({ displayName: "Taylor" }, null)
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Not signed in.");
  });

  it("returns 400 when the display name is missing", async () => {
    const response = await POST(createRequest({ displayName: " " }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Display name is required.");
  });

  it("updates the display name when valid", async () => {
    const response = await POST(createRequest({ displayName: "  Taylor " }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.displayName).toBe("Taylor");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { displayName: "Taylor" },
    });
  });
});
