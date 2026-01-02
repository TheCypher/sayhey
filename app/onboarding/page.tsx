import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/application/onboarding-flow";
import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("sayhey_session")?.value;

  if (!cookie) {
    redirect("/auth");
  }

  const session = verifySessionToken(cookie);

  if (!session) {
    redirect("/auth");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
  });

  if (!user) {
    redirect("/auth");
  }

  if (user.onboardingStatus !== "PENDING") {
    redirect("/");
  }

  return (
    <main
      data-page="onboarding"
      data-auth-theme="sunset"
      className="relative min-h-[100dvh] overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-ink)] [--page-bg:#fbf6f0] [--page-ink:#231b14] [--page-ink-strong:#1a120b] [--page-muted:#7b6f66] [--page-border:#eaded2] [--page-card:#ffffff] [--page-paper:#fff9f4] [--page-accent:#c06a43] [--page-accent-strong:#8b3e23]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_0%,_rgba(255,250,243,0.95),_rgba(248,238,226,0.7)_55%,_rgba(241,227,213,0.4)_80%,_transparent_100%)]" />
        <div className="absolute right-[-10rem] top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(193,106,67,0.16),_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[-6rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(114,160,148,0.2),_transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,rgba(255,255,255,0.32)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.32)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-9xl flex-col items-center justify-center gap-10 px-6 py-10 md:px-10 md:py-14">
        <div className="flex items-center justify-center gap-3 text-[color:var(--page-ink-strong)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-accent)] text-sm font-semibold text-white shadow-sm shadow-black/10">
            H
          </span>
          <span className="font-display text-xl">Say hey</span>
        </div>

        <OnboardingFlow email={user.email} />
      </div>
    </main>
  );
}
