import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SiteNav } from "@/components/application/site-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySessionToken } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "About | Say hey",
  description:
    "A voice journal for thinking out loud, private and local by default.",
};

const PRIVACY_BULLETS = [
  "We do not store your audio.",
  "We do not host your transcripts.",
  "We do not train on your entries.",
];

const TRUST_LINES = [
  "The journal listens first and replies only when explicitly invited.",
  "Entries stay editable with Undo/Restore today, with AI Edit tools coming next.",
  "Your journal stays in your browser, encrypted at rest by default.",
];

const PEOPLE_LINES = [
  "Speak freely.",
  "Pause without pressure.",
  "Return when you are ready.",
];

export default async function AboutPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sayhey_session")?.value;
  const session = token ? verifySessionToken(token) : null;

  return (
    <main
      data-about="page"
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

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-14 px-6 py-12 md:px-10 md:py-20">
        <SiteNav
          current="about"
          isAuthenticated={Boolean(session)}
          accountLabel={session?.email}
        />

        <section
          data-about="hero"
          className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
        >
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--page-muted)] animate-fade-up">
              Who we are
            </p>
            <div className="space-y-4 animate-fade-up [animation-delay:120ms]">
              <h1 className="font-display text-4xl leading-tight text-[color:var(--page-ink-strong)] md:text-5xl lg:text-6xl">
                A voice journal for thinking out loud.
              </h1>
              <p className="text-lg text-[color:var(--page-ink-strong)] md:text-xl">
                Say hey is built for reflection, not performance.
              </p>
              <p className="text-base text-[color:var(--page-muted)] md:text-lg">
                Speak naturally, pause, continue, and revisit your entries. The
                journal listens first and lets you edit, refine, and organize
                them into notes over time.
              </p>
            </div>
          </div>

          <Card className="border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-xl shadow-black/10 animate-fade-up [animation-delay:200ms]">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Privacy is automatic.
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[color:var(--page-muted)]">
              <p>
                We believe privacy is not something you opt into. It is something
                you should automatically have.
              </p>
              <div className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] p-4 text-[color:var(--page-ink)]">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                  Local by default
                </p>
                <p className="mt-2 text-base">
                  Transcripts live locally in your browser and are encrypted at
                  rest.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                Your device. Your journal. Your space.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-lg shadow-black/5 animate-fade-up">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[color:var(--page-muted)]">
              <p>
                Our goal is to make journaling effortless through voice. There are
                no prompts required, no right way to do it, and no pressure to be
                polished. Entries stay editable with Undo/Restore and inline
                attachments so they can grow into notes.
              </p>
            </CardContent>
          </Card>

          <Card className="border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-lg shadow-black/5 animate-fade-up [animation-delay:120ms]">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Privacy First - By Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[color:var(--page-muted)]">
              <ul className="space-y-2">
                {PRIVACY_BULLETS.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span
                      className="mt-2 h-1.5 w-1.5 rounded-full bg-[color:var(--page-accent-strong)]"
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <p>
                That is not a feature. It is a core principle. We deliberately
                designed the journal this way because we do not want access to
                your thoughts, your conversations, or your private information.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-[color:var(--page-border)] bg-[color:var(--page-paper)] shadow-xl shadow-black/10 animate-fade-up">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Trust Through Architecture, Not Promises
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[color:var(--page-muted)]">
              {TRUST_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 animate-fade-up">
            <h2 className="font-display text-3xl text-[color:var(--page-ink-strong)]">
              For the People
            </h2>
            <p className="text-[color:var(--page-muted)]">
              This journal exists to serve people, nothing more, nothing less.
              We want you to speak freely, pause when you need to, and return on
              your own terms.
            </p>
            <p className="text-[color:var(--page-muted)]">
              That is the foundation we are building on, and that is where we
              start.
            </p>
          </div>

          <Card className="border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-lg shadow-black/5 animate-fade-up [animation-delay:120ms]">
            <CardContent className="space-y-3 py-8 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--page-muted)]">
                Use it this way
              </p>
              <div className="space-y-2 text-lg font-semibold text-[color:var(--page-ink-strong)] md:text-xl">
                {PEOPLE_LINES.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
