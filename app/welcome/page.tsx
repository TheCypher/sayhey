import Link from "next/link";
import { cookies } from "next/headers";

import { WelcomePanel } from "@/components/application/welcome-panel";
import { SiteNav } from "@/components/application/site-nav";
import { verifySessionToken } from "@/lib/auth/session";

export default async function WelcomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sayhey_session")?.value;
  const session = token ? verifySessionToken(token) : null;

  return (
    <main
      data-auth-theme="sunset"
      className="relative min-h-[100dvh] overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-ink)] [--page-bg:#f7efe4] [--page-ink:#2b2218] [--page-ink-strong:#1c140c] [--page-muted:#6f6257] [--page-border:#ead6c1] [--page-card:#fff8f1] [--page-paper:#fffcf7] [--page-accent:#cf8259] [--page-accent-strong:#a85435]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,_rgba(255,248,239,0.9),_rgba(244,226,206,0.55)_45%,_rgba(231,205,176,0.35)_70%,_transparent_100%)]" />
        <div className="absolute -left-24 top-6 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(209,117,76,0.5),_transparent_70%)] blur-3xl animate-drift" />
        <div className="absolute right-[-10rem] top-10 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(84,148,140,0.45),_transparent_70%)] blur-3xl animate-drift-slow" />
        <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(244,206,153,0.55),_transparent_70%)] blur-3xl animate-drift" />
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:36px_36px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-10 px-6 py-10 md:px-10 md:py-14">
        <SiteNav
          current="welcome"
          isAuthenticated={Boolean(session)}
          accountLabel={session?.email}
        />

        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <WelcomePanel variant="card" />

          <div className="space-y-5 rounded-3xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)]/90 p-6 shadow-sm shadow-black/5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                Start now
              </p>
              <h2 className="font-display text-2xl text-[color:var(--page-ink-strong)]">
                Ready to journal?
              </h2>
              <p className="text-sm text-[color:var(--page-muted)]">
                Press Space to start recording from anywhere, double-tap Space to stop and send, or jump straight into a fresh journal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/journals/new"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Start a journal
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-[color:var(--page-ink-strong)] transition hover:bg-accent hover:text-accent-foreground"
              >
                Back home
              </Link>
            </div>

            <div className="rounded-2xl border border-[color:var(--page-border)] bg-white/80 p-4 text-sm text-[color:var(--page-muted)] shadow-sm shadow-black/5">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                Shortcuts
              </p>
              <p className="mt-2">
                Space toggles recording. Double-tap Space to stop & save. The sidebar lists your local journals and stays private.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
