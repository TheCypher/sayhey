import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AuthForm } from "@/components/application/auth-form";
import { SiteNav } from "@/components/application/site-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySessionToken } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in | Hey",
  description: "Sign in with a one-time magic link to your voice journal.",
};

type AuthSearchParams = {
  error?: string | string[];
};

type AuthPageProps = {
  searchParams?: Promise<AuthSearchParams>;
};

const ERROR_COPY: Record<string, string> = {
  invalid: "That link is invalid or expired. Request a new one below.",
  expired: "That link is invalid or expired. Request a new one below.",
  used: "That link is invalid or expired. Request a new one below.",
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sayhey_session")?.value;
  const session = token ? verifySessionToken(token) : null;
  const resolvedSearchParams = await searchParams;
  const errorKey = Array.isArray(resolvedSearchParams?.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams?.error;
  const errorMessage = errorKey ? ERROR_COPY[errorKey] : undefined;
  return (
    <main
      data-page="auth"
      data-auth-theme="sunset"
      className="relative min-h-[100dvh] overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-ink)] [--page-bg:#fbf6f0] [--page-ink:#231b14] [--page-ink-strong:#1a120b] [--page-muted:#7b6f66] [--page-border:#eaded2] [--page-card:#ffffff] [--page-paper:#fff9f4] [--page-accent:#c06a43] [--page-accent-strong:#8b3e23] [--panel-bg:#b25d38] [--panel-mid:#c97047] [--panel-light:#e2a06a] [--panel-deep:#8c3f25] [--panel-ink:#fff8f1] [--panel-wood:#a8643d] [--panel-wood-light:#d7a070] [--panel-cloth:#6f8b7f] [--panel-skin:#f0c7a0]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_10%_0%,_rgba(255,250,243,0.95),_rgba(248,238,226,0.7)_55%,_rgba(241,227,213,0.4)_80%,_transparent_100%)]" />
        <div className="absolute right-[-12rem] top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(193,106,67,0.18),_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[-6rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(114,160,148,0.2),_transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,rgba(255,255,255,0.32)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.32)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col gap-12 px-6 py-10 md:px-10 md:py-12">
        <SiteNav
          current="auth"
          isAuthenticated={Boolean(session)}
          accountLabel={session?.email}
        />

        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div
            data-auth-panel="form"
            className="flex flex-col gap-10 text-center lg:text-left"
          >
            <div className="relative space-y-4 animate-fade-up">
              <div className="pointer-events-none absolute -left-6 -top-10 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_center,_rgba(226,169,120,0.45),_transparent_70%)] blur-2xl" />
              <p className="mx-auto inline-flex items-center gap-3 rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-paper)]/85 px-4 py-1 text-[11px] uppercase tracking-[0.4em] text-[color:var(--page-muted)] shadow-sm shadow-black/5 lg:mx-0">
                <span
                  className="h-2 w-2 rounded-full bg-[color:var(--page-accent)] shadow-[0_0_10px_rgba(192,106,67,0.45)]"
                  aria-hidden="true"
                />
                Sign in
              </p>
              <div className="space-y-3">
                <h1 className="font-display text-5xl leading-tight text-[color:var(--page-ink-strong)] md:text-6xl">
                  <span className="block">Make space for</span>
                  <span className="block">what matters.</span>
                </h1>
                <p className="text-base text-[color:var(--page-muted)] md:text-lg">
                  A calm place to speak, capture, and return to your thoughts to
                  reflect, expand, organize, and act when you are ready.
                </p>
              </div>
            </div>

            <div className="w-full max-w-md">
              <Card className="rounded-[28px] border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-[0_30px_60px_-45px_rgba(35,22,14,0.75)] animate-fade-up [animation-delay:120ms]">
                <CardHeader className="space-y-2 pb-2">
                  <CardTitle className="font-display text-2xl">
                    Continue with email
                  </CardTitle>
                  <p className="text-sm text-[color:var(--page-muted)]">
                    Sign in with a one-time link.
                  </p>
                </CardHeader>
                <CardContent>
                  <AuthForm errorMessage={errorMessage} />
                </CardContent>
              </Card>
            </div>
          </div>

          <div
            data-auth-panel="visual"
            className="relative min-h-[360px] overflow-hidden rounded-[32px] bg-[linear-gradient(150deg,_var(--panel-light),_var(--panel-mid)_45%,_var(--panel-bg))] p-8 text-[color:var(--panel-ink)] shadow-[0_40px_80px_-60px_rgba(44,25,14,0.7)] animate-fade-up [animation-delay:180ms] lg:min-h-[520px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45),_transparent_60%)]" />
            <svg
              viewBox="0 0 520 320"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
              aria-hidden="true"
            >
              <path
                d="M32 70 C 120 30, 210 60, 290 40 S 420 50, 488 30"
                fill="none"
                stroke="rgba(132, 210, 193, 0.9)"
                strokeWidth="3"
                strokeDasharray="10 16"
              />
              <path
                d="M40 140 C 130 120, 210 160, 300 130 S 430 120, 500 150"
                fill="none"
                stroke="rgba(255, 213, 162, 0.75)"
                strokeWidth="2"
                strokeDasharray="8 14"
              />
            </svg>
            <div className="relative flex h-full flex-col justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">
                  Private voice journal
                </p>
                <p className="max-w-xs font-display text-2xl text-white">
                  Listen when you choose. Speak only when you want.
                </p>
              </div>

              <div className="relative h-56 w-full lg:h-72">
                <div
                  className="absolute bottom-2 left-0 right-0 h-20 rounded-[28px] bg-[color:var(--panel-wood)] shadow-[0_18px_30px_rgba(70,32,18,0.4)]"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-14 left-8 h-14 w-44 rounded-[26px] bg-[color:var(--panel-wood-light)] shadow-[0_12px_24px_rgba(70,32,18,0.35)]"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-20 right-12 h-32 w-24 rounded-[24px] bg-[color:var(--panel-cloth)] shadow-[0_16px_28px_rgba(34,20,14,0.35)]"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-44 right-16 h-10 w-10 rounded-full bg-[color:var(--panel-skin)] shadow-[0_10px_20px_rgba(34,20,14,0.3)]"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-32 right-14 h-20 w-28 rounded-[22px] bg-[color:var(--panel-deep)] opacity-40"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
