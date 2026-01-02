import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HomeShell } from "@/components/home/home-shell";
import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sayhey_session")?.value;
  const session = token ? verifySessionToken(token) : null;
  let displayName: string | undefined;

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { displayName: true, onboardingStatus: true },
    });

    if (user?.onboardingStatus === "PENDING") {
      redirect("/onboarding");
    }

    displayName = user?.displayName?.trim() || undefined;
  }

  return (
    <HomeShell isAuthenticated={Boolean(session)} displayName={displayName} />
  );
}
