"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OnboardingFlowProps = {
  email: string;
  initialStep?: number;
};

type UsageIntent = "personal" | "team";
type PlanChoice = "free" | "pro";

const TOTAL_STEPS = 5;

const FREE_FEATURES = [
  "Push-to-talk voice journaling with Spacebar control.",
  "Local-only history with encrypted transcripts.",
  "On-demand spoken replies with sentence highlights.",
  "Welcome tour and privacy-first onboarding.",
  "Listen controls on every entry.",
];

const PRO_FEATURES = [
  "Higher daily capture limits.",
  "Expanded voice options.",
  "Priority support and early access.",
];

const PRICING_PLANS = [
  {
    value: "free",
    title: "Free",
    status: "active",
    description: "Everything you need to journal with voice and intention.",
    price: "$0",
    priceNote: "Free for everyone",
    cta: "Start for free",
    features: FREE_FEATURES,
  },
  {
    value: "pro",
    title: "Pro",
    status: "soon",
    description: "For longer sessions and richer voice depth.",
    price: "Coming soon",
    priceNote: "Pricing updates shared here first",
    cta: "Pro coming soon",
    features: PRO_FEATURES,
  },
] as const;

export function OnboardingFlow({
  email,
  initialStep = 0,
}: OnboardingFlowProps) {
  const router = useRouter();
  const safeInitialStep = Math.min(Math.max(initialStep, 0), TOTAL_STEPS - 1);
  const [step, setStep] = useState(safeInitialStep);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [usageIntent, setUsageIntent] = useState<UsageIntent | null>(null);
  const [planChoice, setPlanChoice] = useState<PlanChoice | null>(null);
  const [consentToImprove, setConsentToImprove] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stepLabel = useMemo(
    () => `Step ${step + 1} of ${TOTAL_STEPS}`,
    [step]
  );

  const advance = () => {
    setErrorMessage(null);
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  };

  const retreat = () => {
    setErrorMessage(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = async () => {
    const trimmedName = displayName.trim();

    if (!termsAccepted || !usageIntent || !planChoice || !trimmedName) {
      setErrorMessage("Complete each step before continuing.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptedTerms: termsAccepted,
          intent: usageIntent,
          plan: planChoice,
          consentToImprove,
          displayName: trimmedName,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to finish onboarding.");
      }

      router.push(payload?.redirect ?? "/");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to finish onboarding."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (() => {
    switch (step) {
      case 0:
        return (
          <Card className="w-full max-w-xl rounded-[28px] border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-[0_30px_60px_-45px_rgba(35,22,14,0.55)]">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="font-display text-3xl text-[color:var(--page-ink-strong)]">
                Let's create your account
              </CardTitle>
              <p className="text-sm text-[color:var(--page-muted)]">
                A few things for you to review.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-4 py-3 text-sm text-[color:var(--page-ink)]">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[color:var(--page-border)] text-[color:var(--page-accent)]"
                />
                <span>
                  I agree to the Consumer Terms and Acceptable Use Policy and
                  confirm that I am at least 18 years of age.
                </span>
              </label>
              <Button
                type="button"
                size="lg"
                onClick={advance}
                disabled={!termsAccepted}
                className="h-11 w-full rounded-full bg-[color:var(--page-ink-strong)] text-[color:var(--page-paper)] hover:bg-[color:var(--page-ink)]"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        );
      case 1:
        return (
          <Card className="w-full max-w-2xl rounded-[28px] border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-[0_30px_60px_-45px_rgba(35,22,14,0.55)]">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="font-display text-3xl text-[color:var(--page-ink-strong)]">
                How are you planning to use Say hey?
              </CardTitle>
              <p className="text-sm text-[color:var(--page-muted)]">
                Choose the path that fits your day-to-day work.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    value: "personal",
                    title: "For personal use",
                    description:
                      "For individuals who want to build and experiment with their own projects.",
                    icon: (
                      <path
                        d="M6 12V7a4 4 0 0 1 8 0v5m-8 0h8m-8 0v3a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    ),
                  },
                  {
                    value: "team",
                    title: "With my team",
                    description:
                      "For teams who want to collaborate, organize, and scale together.",
                    icon: (
                      <>
                        <circle
                          cx="8"
                          cy="8"
                          r="3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <circle
                          cx="16"
                          cy="8"
                          r="3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <path
                          d="M3 18c1.5-3 7.5-3 9 0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <path
                          d="M12 18c1-2.3 6-2.3 7 0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                      </>
                    ),
                  },
                ].map((option) => {
                  const isSelected = usageIntent === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setUsageIntent(option.value as UsageIntent)
                      }
                      aria-pressed={isSelected}
                      className={cn(
                        "flex h-full flex-col items-start gap-4 rounded-2xl border px-5 py-4 text-left transition",
                        isSelected
                          ? "border-[color:var(--page-accent)] bg-[color:var(--page-paper)] shadow-[0_14px_30px_-20px_rgba(192,106,67,0.55)]"
                          : "border-[color:var(--page-border)] bg-white/80 hover:border-[color:var(--page-accent)]"
                      )}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-paper)] text-[color:var(--page-ink-strong)]">
                        <svg viewBox="0 0 24 24" className="h-6 w-6">
                          {option.icon}
                        </svg>
                      </span>
                      <div>
                        <p className="font-display text-xl text-[color:var(--page-ink-strong)]">
                          {option.title}
                        </p>
                        <p className="text-sm text-[color:var(--page-muted)]">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                size="lg"
                onClick={advance}
                disabled={!usageIntent}
                className="h-11 w-full rounded-full bg-[color:var(--page-ink-strong)] text-[color:var(--page-paper)] hover:bg-[color:var(--page-ink)]"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card className="w-full max-w-5xl rounded-[28px] border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-[0_30px_60px_-45px_rgba(35,22,14,0.55)]">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="font-display text-3xl text-[color:var(--page-ink-strong)]">
                Pricing
              </CardTitle>
              <p className="text-sm text-[color:var(--page-muted)]">
                Start with Free today. Pro is on the way, built for longer
                sessions and deeper focus.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                {PRICING_PLANS.map((plan) => {
                  const isSelected = planChoice === plan.value;
                  const isActive = plan.status === "active";
                  return (
                    <button
                      key={plan.value}
                      type="button"
                      onClick={() => setPlanChoice(plan.value as PlanChoice)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex h-full flex-col rounded-2xl border px-5 py-5 text-left transition",
                        isSelected
                          ? "border-[color:var(--page-accent)] bg-[color:var(--page-paper)] shadow-[0_18px_34px_-24px_rgba(192,106,67,0.6)]"
                          : "border-[color:var(--page-border)] bg-white/90 hover:border-[color:var(--page-accent)]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                          {plan.title}
                        </p>
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.3em]",
                            isActive
                              ? "border-[color:var(--page-border)] bg-[color:var(--page-paper)] text-[color:var(--page-ink-strong)]"
                              : "border-[color:var(--page-border)] bg-white text-[color:var(--page-muted)]"
                          )}
                        >
                          {isActive ? "Active" : "Coming soon"}
                        </span>
                      </div>
                      <div className="mt-4 space-y-2">
                        <p className="font-display text-3xl text-[color:var(--page-ink-strong)]">
                          {plan.price}
                        </p>
                        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                          {plan.priceNote}
                        </p>
                        <p className="text-sm text-[color:var(--page-muted)]">
                          {plan.description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "mt-4 inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]",
                          isActive
                            ? "border-transparent bg-[color:var(--page-ink-strong)] text-[color:var(--page-paper)]"
                            : "border-[color:var(--page-border)] bg-transparent text-[color:var(--page-muted)]"
                        )}
                      >
                        {plan.cta}
                      </span>
                      <ul className="mt-4 space-y-2 text-xs text-[color:var(--page-muted)]">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <span
                              className={cn(
                                "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full",
                                isActive
                                  ? "bg-[color:var(--page-paper)] text-[color:var(--page-accent-strong)]"
                                  : "border border-[color:var(--page-border)] text-[color:var(--page-muted)]"
                              )}
                            >
                              <Check
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                            </span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                size="lg"
                onClick={advance}
                disabled={!planChoice}
                className="h-11 w-full rounded-full bg-[color:var(--page-ink-strong)] text-[color:var(--page-paper)] hover:bg-[color:var(--page-ink)]"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card className="w-full max-w-xl rounded-[28px] border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-[0_30px_60px_-45px_rgba(35,22,14,0.55)]">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="font-display text-3xl text-[color:var(--page-ink-strong)]">
                Hey there, I'm Say hey.
              </CardTitle>
              <p className="text-sm text-[color:var(--page-muted)]">
                I'm your assistant for capturing, reflecting, and learning.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                {
                  title: "Curious? Just ask",
                  description:
                    "From quick prompts to deep dives, I'm always ready to help.",
                },
                {
                  title: "Built to help, never harm",
                  description:
                    "Safeguards protect against harmful, abusive, or deceptive content.",
                },
                {
                  title: "Help improve Say hey for everyone",
                  description:
                    "Share anonymized usage data to make Say hey better over time.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 text-sm">
                  <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-paper)] text-[color:var(--page-ink-strong)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4">
                      <path
                        d="M6 12l4 4 8-8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="font-semibold text-[color:var(--page-ink-strong)]">
                      {item.title}
                    </p>
                    <p className="text-[color:var(--page-muted)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-4 py-3 text-sm">
                <span className="text-[color:var(--page-ink)]">
                  Help improve Say hey
                </span>
                <button
                  type="button"
                  onClick={() => setConsentToImprove((prev) => !prev)}
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition",
                    consentToImprove
                      ? "bg-[color:var(--page-accent)]"
                      : "bg-[color:var(--page-border)]"
                  )}
                  aria-pressed={consentToImprove}
                  aria-label="Toggle consent to improve"
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 rounded-full bg-white shadow transition",
                      consentToImprove ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              <Button
                type="button"
                size="lg"
                onClick={advance}
                className="h-11 w-full rounded-full bg-[color:var(--page-ink-strong)] text-[color:var(--page-paper)] hover:bg-[color:var(--page-ink)]"
              >
                I understand
              </Button>
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card className="w-full max-w-lg rounded-[28px] border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-[0_30px_60px_-45px_rgba(35,22,14,0.55)]">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="font-display text-3xl text-[color:var(--page-ink-strong)]">
                Before we get started, what should I call you?
              </CardTitle>
              <p className="text-sm text-[color:var(--page-muted)]">
                Add a name so your journal feels like yours.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Enter your name"
                className="h-11 rounded-full border-[color:var(--page-border)] bg-white/90 px-4 text-[color:var(--page-ink-strong)] placeholder:text-[color:var(--page-muted)] focus-visible:ring-[color:var(--page-accent)]"
              />
              {errorMessage ? (
                <p className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
                  {errorMessage}
                </p>
              ) : null}
              <Button
                type="button"
                size="lg"
                onClick={handleComplete}
                disabled={!displayName.trim() || isSubmitting}
                className="h-11 w-full rounded-full bg-[color:var(--page-ink-strong)] text-[color:var(--page-paper)] hover:bg-[color:var(--page-ink)]"
              >
                {isSubmitting ? "Saving..." : "Start journaling"}
              </Button>
            </CardContent>
          </Card>
        );
    }
  })();

  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-1 text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
        <span>{stepLabel}</span>
      </div>
      <div key={step} className="w-full animate-fade-up flex justify-center">
        {content}
      </div>
      {step > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={retreat}
          disabled={isSubmitting}
          className="rounded-full px-4 text-[11px] uppercase tracking-[0.3em] text-[color:var(--page-muted)] hover:bg-[color:var(--page-border)]/60 hover:text-[color:var(--page-ink-strong)]"
        >
          Back
        </Button>
      ) : null}
      {step < TOTAL_STEPS - 1 && errorMessage ? (
        <p className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
          {errorMessage}
        </p>
      ) : null}
      <div className="text-xs text-[color:var(--page-muted)]">
        Email verified as {email}.{" "}
        <Link href="/auth" className="underline underline-offset-4">
          Use a different email
        </Link>
      </div>
    </div>
  );
}
