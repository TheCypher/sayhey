import { prisma } from "@/lib/prisma";

import { verifySessionToken } from "./session";

export type SessionIdentity = {
  displayName: string;
  email: string;
};

export const getSessionIdentity = async (
  token?: string | null
): Promise<SessionIdentity | null> => {
  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { displayName: true },
  });

  const displayName = user?.displayName?.trim();

  if (!displayName) {
    return null;
  }

  return {
    displayName,
    email: session.email,
  };
};
