import { prisma } from "@/lib/prisma";

import { verifySessionToken } from "./session";
import { getSessionIdentity } from "./session-identity";

jest.mock("./session", () => ({
  verifySessionToken: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("getSessionIdentity", () => {
  const mockVerifySessionToken =
    verifySessionToken as jest.MockedFunction<typeof verifySessionToken>;
  const mockFindUnique = prisma.user
    .findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;

  beforeEach(() => {
    mockVerifySessionToken.mockReturnValue(null);
    mockFindUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when no token is provided", async () => {
    const identity = await getSessionIdentity();

    expect(identity).toBeNull();
  });

  it("returns null when the session token fails verification", async () => {
    const identity = await getSessionIdentity("session-token");

    expect(identity).toBeNull();
  });

  it("returns null when the user has no display name", async () => {
    mockVerifySessionToken.mockReturnValue({
      sub: "user-123",
      email: "hello@example.com",
      iat: 0,
      exp: 999999,
    });
    mockFindUnique.mockResolvedValue({ displayName: "   " });

    const identity = await getSessionIdentity("session-token");

    expect(identity).toBeNull();
  });

  it("returns the identity when the session has a display name", async () => {
    mockVerifySessionToken.mockReturnValue({
      sub: "user-123",
      email: "hello@example.com",
      iat: 0,
      exp: 999999,
    });
    mockFindUnique.mockResolvedValue({ displayName: "Taylor" });

    const identity = await getSessionIdentity("session-token");

    expect(identity).toEqual({
      displayName: "Taylor",
      email: "hello@example.com",
    });
  });
});
