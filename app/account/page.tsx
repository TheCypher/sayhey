import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AccountDisplayNameForm } from "@/components/application/account-display-name-form";
import { SiteNav } from "@/components/application/site-nav";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sayhey_session")?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect("/auth");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
  });

  if (!user) {
    redirect("/auth");
  }

  const displayName = user.displayName?.trim() ?? "";

  return (
    <main
      data-page="account"
      data-auth-theme="sunset"
      className="relative min-h-[100dvh] overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-ink)] [--page-bg:#f7f1e9] [--page-ink:#2b231a] [--page-ink-strong:#1d160e] [--page-muted:#71675d] [--page-border:#e7dacd] [--page-card:#fffaf4] [--page-paper:#fffdf9] [--page-accent:#7ca596] [--page-accent-strong:#30594f]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,_rgba(255,252,246,0.95),_rgba(238,223,205,0.6)_45%,_rgba(230,214,196,0.35)_70%,_transparent_100%)]" />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(120,171,152,0.45),_transparent_70%)] blur-3xl animate-drift" />
        <div className="absolute right-[-10rem] top-8 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(219,164,112,0.35),_transparent_70%)] blur-3xl animate-drift-slow" />
        <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(252,223,179,0.55),_transparent_70%)] blur-3xl animate-drift" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-12 px-6 py-12 md:px-10 md:py-16">
        <SiteNav current="account" isAuthenticated />

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--page-muted)] animate-fade-up">
              Account
            </p>
            <div className="space-y-3 animate-fade-up [animation-delay:120ms]">
              <h1 className="font-display text-4xl text-[color:var(--page-ink-strong)] md:text-5xl">
                Your account
              </h1>
              <p className="text-base text-[color:var(--page-muted)] md:text-lg">
                Signed in with {user.email}. Your journal stays private and
                local, always.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/journals/new"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "rounded-full bg-[color:var(--page-ink-strong)] px-5 py-2 text-[color:var(--page-paper)] hover:bg-[color:var(--page-ink)]"
                  )}
                >
                  Start a journal
                </Link>
                <Link
                  href="/auth/logout"
                  prefetch={false}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-full border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-5 py-2 text-[color:var(--page-ink-strong)] hover:bg-[color:var(--page-card)] hover:text-[color:var(--page-ink-strong)]"
                  )}
                >
                  Logout
                </Link>
              </div>
            </div>
          </div>

          <Card className="border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-xl shadow-black/10 animate-fade-up [animation-delay:180ms]">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Profile details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[color:var(--page-muted)]">
              <div className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] p-4 text-[color:var(--page-ink)]">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                  Email
                </p>
                <p className="mt-2 text-base">{user.email}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] p-4 text-[color:var(--page-ink)]">
                <AccountDisplayNameForm initialDisplayName={displayName} />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
