import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Check, Sparkles } from "lucide-react";

import { SiteNav } from "@/components/application/site-nav";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySessionToken } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing | Say hey",
  description:
    "See Say hey pricing. The Free plan is available now, with Pro coming soon.",
};

const PLAN_TABS = [
  { label: "Individual", status: "active" },
  { label: "Team", status: "soon" },
  { label: "API", status: "soon" },
] as const;

const FREE_FEATURES = [
  "Push-to-talk voice journaling with Spacebar control.",
  "Pause and resume entries without losing your place.",
  "Editable entries with Undo/Restore and inline attachments.",
  "Local-only history with encrypted transcripts.",
  "Explicit, on-demand replies with spoken playback.",
];

const PRO_FEATURES = [
  "Higher daily capture limits.",
  "Expanded voice options.",
  "Priority support and early access.",
];

export default async function PricingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sayhey_session")?.value;
  const session = token ? verifySessionToken(token) : null;

  return (
    <main
      data-pricing="page"
      className="relative min-h-[100dvh] overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-ink)] [--page-bg:#f7f3ec] [--page-ink:#28211a] [--page-ink-strong:#1a140e] [--page-muted:#6f675f] [--page-border:#e6dbcf] [--page-card:#fffaf4] [--page-paper:#fffdf9] [--page-accent:#7ca596] [--page-accent-strong:#30594f]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,_rgba(255,252,246,0.95),_rgba(238,223,205,0.6)_45%,_rgba(230,214,196,0.35)_70%,_transparent_100%)]" />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(120,171,152,0.45),_transparent_70%)] blur-3xl animate-drift" />
        <div className="absolute right-[-10rem] top-8 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(219,164,112,0.35),_transparent_70%)] blur-3xl animate-drift-slow" />
        <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(252,223,179,0.55),_transparent_70%)] blur-3xl animate-drift" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-12 px-6 py-12 md:px-10 md:py-16">
        <SiteNav
          current="pricing"
          isAuthenticated={Boolean(session)}
          accountLabel={session?.email}
        />

        <header className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 text-center">
          <p className="text-xs uppercase tracking-[0.45em] text-[color:var(--page-muted)] animate-fade-up">
            Pricing
          </p>
          <h1 className="font-display text-4xl text-[color:var(--page-ink-strong)] md:text-5xl lg:text-6xl animate-fade-up [animation-delay:120ms]">
            Pricing for a voice journal.
          </h1>
          <p className="text-base text-[color:var(--page-muted)] md:text-lg animate-fade-up [animation-delay:160ms]">
            Start with Free today. Pro is on the way, built for longer sessions
            and deeper tools.
          </p>
          <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-2 py-2 text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)] shadow-sm shadow-black/5 animate-fade-up [animation-delay:200ms]">
            {PLAN_TABS.map((tab) => (
              <span
                key={tab.label}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1",
                  tab.status === "active"
                    ? "bg-white text-[color:var(--page-ink-strong)] shadow-sm shadow-black/10"
                    : "text-[color:var(--page-muted)]"
                )}
              >
                {tab.label}
                {tab.status === "soon" && (
                  <span className="rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-2 py-0.5 text-[10px] tracking-[0.2em]">
                    Soon
                  </span>
                )}
              </span>
            ))}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="relative border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-xl shadow-black/10 animate-fade-up">
            <CardHeader className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--page-border)] bg-white text-[color:var(--page-accent-strong)] shadow-sm shadow-black/10">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="rounded-full bg-[color:var(--page-paper)] px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                  Active
                </span>
              </div>
              <div>
                <CardTitle className="font-display text-3xl text-[color:var(--page-ink-strong)]">
                  Free
                </CardTitle>
                <p className="mt-2 text-sm text-[color:var(--page-muted)]">
                  A calm voice journal that listens first and keeps entries
                  editable as notes.
                </p>
              </div>
              <div>
                <p className="text-3xl font-display text-[color:var(--page-ink-strong)]">
                  $0
                </p>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                  Free for everyone
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Link
                href="/journals/new"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "w-full rounded-full bg-[color:var(--page-ink-strong)] text-[color:var(--page-paper)] hover:bg-[color:var(--page-ink)]"
                )}
              >
                Start for free
              </Link>
              <ul className="space-y-3 text-sm text-[color:var(--page-muted)]">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--page-paper)] text-[color:var(--page-accent-strong)]">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="relative border-[color:var(--page-border)] bg-[color:var(--page-paper)] shadow-lg shadow-black/5 animate-fade-up [animation-delay:120ms]">
            <CardHeader className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-[color:var(--page-border)] bg-white/80 text-[color:var(--page-muted)]">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="rounded-full border border-[color:var(--page-border)] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                  Coming soon
                </span>
              </div>
              <div>
                <CardTitle className="font-display text-3xl text-[color:var(--page-ink-strong)]">
                  Pro
                </CardTitle>
                <p className="mt-2 text-sm text-[color:var(--page-muted)]">
                  For longer sessions and richer voice depth.
                </p>
              </div>
              <div>
                <p className="text-3xl font-display text-[color:var(--page-ink-strong)]">
                  Coming soon
                </p>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                  Pricing updates shared here first
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <button
                type="button"
                disabled
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full rounded-full border-[color:var(--page-border)] bg-transparent text-[color:var(--page-muted)]"
                )}
              >
                Pro coming soon
              </button>
              <ul className="space-y-3 text-sm text-[color:var(--page-muted)]">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--page-border)] text-[color:var(--page-muted)]">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <p className="text-center text-xs text-[color:var(--page-muted)]">
          Free stays local-first. Pro will expand limits without changing how
          your data is stored. Notes workspace tools like AI Edit, summaries,
          and tags are coming soon.
        </p>
      </div>
    </main>
  );
}
