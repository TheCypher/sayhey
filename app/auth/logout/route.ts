import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/auth/env";

export const runtime = "nodejs";

export async function GET() {
  const response = NextResponse.redirect(new URL("/auth", getAppUrl()));

  response.cookies.set("sayhey_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
