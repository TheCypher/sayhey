import { NextRequest, NextResponse } from "next/server";

import { getAppUrl } from "@/lib/auth/env";
import { verifyMagicLinkToken } from "@/lib/auth/magic-link-service";
import { SESSION_TTL_DAYS } from "@/lib/auth/session";

export const runtime = "nodejs";

function redirectToAuth(error: string) {
  const url = new URL("/auth", getAppUrl());
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return redirectToAuth("invalid");
  }

  const result = await verifyMagicLinkToken(token);

  if (result.status !== "ok") {
    return redirectToAuth(result.status);
  }

  const response = NextResponse.redirect(new URL("/", getAppUrl()));

  response.cookies.set("sayhey_session", result.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });

  return response;
}
