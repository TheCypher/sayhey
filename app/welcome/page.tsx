import Link from "next/link";

import { WelcomePanel } from "@/components/application/welcome-panel";
import { SiteNav } from "@/components/application/site-nav";

export default function WelcomePage() {
  return (
    <div className="relative min-h-[100dvh] bg-[color:var(--page-bg)] text-[color:var(--page-ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-6 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,_rgba(242,182,109,0.28),_transparent_60%)] blur-2xl animate-drift" />
        <div className="absolute right-[-10rem] bottom-[-6rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(111,176,154,0.35),_transparent_70%)] blur-3xl animate-drift-slow" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-10 px-6 py-10 md:px-10 md:py-14">
        <SiteNav current="welcome" tagline="Quick tour" />

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
    </div>
  );
}
