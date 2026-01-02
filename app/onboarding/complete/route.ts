import { NextRequest, NextResponse } from "next/server";

import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type OnboardingBody = {
  acceptedTerms?: boolean;
  intent?: string;
  plan?: string;
  consentToImprove?: boolean;
  displayName?: string;
};

const INTENT_MAP: Record<string, "PERSONAL" | "TEAM"> = {
  personal: "PERSONAL",
  team: "TEAM",
};

const PLAN_MAP: Record<string, "FREE" | "PRO"> = {
  free: "FREE",
  pro: "PRO",
};

export async function POST(request: NextRequest) {
  let body: OnboardingBody | null = null;

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

  const acceptedTerms = body?.acceptedTerms === true;
  const intent = body?.intent ? INTENT_MAP[body.intent] : undefined;
  const plan = body?.plan ? PLAN_MAP[body.plan] : undefined;
  const consentToImprove = body?.consentToImprove === true;
  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (!acceptedTerms || !intent || !plan || !displayName) {
    return NextResponse.json(
      { error: "Complete each onboarding step before continuing." },
      { status: 400 }
    );
  }

  const now = new Date();

  await prisma.user.update({
    where: { id: session.sub },
    data: {
      displayName,
      onboardingIntent: intent,
      onboardingPlan: plan,
      consentToImprove,
      acceptedTermsAt: now,
      onboardingStatus: "COMPLETED",
      onboardingCompletedAt: now,
    },
  });

  return NextResponse.json({ ok: true, redirect: "/" });
}
