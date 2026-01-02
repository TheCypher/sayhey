import { NextRequest, NextResponse } from "next/server";

import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type DisplayNameBody = {
  displayName?: string;
};

export async function POST(request: NextRequest) {
  let body: DisplayNameBody | null = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const token = request.cookies.get("sayhey_session")?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (!displayName) {
    return NextResponse.json(
      { error: "Display name is required." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.sub },
    data: { displayName },
  });

  return NextResponse.json({ ok: true, displayName });
}
