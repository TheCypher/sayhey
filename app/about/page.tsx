import type { Metadata } from "next";

import { SiteNav } from "@/components/application/site-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About | Hey",
  description:
    "Privacy-first technology built for people, with local-only data and explicit trust by design.",
};

const PRIVACY_BULLETS = [
  "We do not host your information.",
  "We do not store your conversations.",
  "We do not keep transcripts on our servers.",
];

const TRUST_LINES = [
  "Trust should not rely on policies, promises, or fine print. It should be built directly into how the technology works.",
  "That is why we have made a clear choice: we cannot misuse your data because we do not have it.",
  "This is not about us. This is not about building databases or extracting value from people. This is about empowering individuals.",
];

const PEOPLE_LINES = [
  "Use it freely.",
  "Use it confidently.",
  "Use it knowing that what you say stays with you.",
];

export default function AboutPage() {
  return (
    <main
      data-about="page"
      className="relative min-h-screen overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-ink)]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-14 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,_rgba(122,162,147,0.38),_transparent_70%)] blur-2xl animate-drift" />
        <div className="absolute right-[-9rem] top-1/3 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(231,214,182,0.55),_transparent_70%)] blur-3xl animate-drift-slow" />
        <div className="absolute bottom-[-7rem] left-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(210,230,224,0.6),_transparent_70%)] blur-3xl animate-drift" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-14 px-6 py-12 md:px-10 md:py-20">
        <SiteNav current="about" tagline="Private by design" />

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
                Who We Are &amp; What We Stand For
              </h1>
              <p className="text-lg text-[color:var(--page-ink-strong)] md:text-xl">
                We are building technology for people, not for platforms.
              </p>
              <p className="text-base text-[color:var(--page-muted)] md:text-lg">
                Our philosophy is simple: your information belongs to you, not to
                us, not to anyone else. That belief drives everything we do.
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
                  All transcripts and data live locally on your own device.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                Your laptop. Your system. Your space.
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
                Our goal is to give people powerful tools without asking them to
                give up their privacy in return. We want you to feel safe using
                our product, confident that what you say, think, or create is
                never stored, tracked, or owned by us.
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
                designed the product this way because we do not want access to
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
              Our product exists to serve people, nothing more, nothing less. We
              want users to experience the full power of our technology while
              maintaining complete anonymity and control.
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
