"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthFormProps = {
  errorMessage?: string;
};

type FormStatus = "idle" | "sending" | "sent" | "error";

export function AuthForm({ errorMessage }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [formError, setFormError] = useState<string | null>(
    errorMessage ?? null
  );
  const inputId = "auth-email";

  const isSending = status === "sending";
  const hasSent = status === "sent";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setStatus("sending");

    try {
      const response = await fetch("/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to send magic link.");
      }

      setStatus("sent");
    } catch (error) {
      setStatus("error");
      setFormError(
        error instanceof Error ? error.message : "Unable to send magic link."
      );
    }
  };

  return (
    <form
      data-form="magic-link"
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
    >
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <Input
        id={inputId}
        type="email"
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email"
        required
        autoComplete="email"
        className="h-11 rounded-full border-[color:var(--page-border)] bg-white/80 px-4 text-[color:var(--page-ink-strong)] placeholder:text-[color:var(--page-muted)] focus-visible:ring-[color:var(--page-accent)]"
      />

      {formError ? (
        <p className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
          {formError}
        </p>
      ) : null}

      {hasSent ? (
        <div className="space-y-2">
          <p className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
            Check your email for a sign-in link.
          </p>
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isSending}
        className="h-11 rounded-full bg-[color:var(--page-ink-strong)] px-6 text-[color:var(--page-paper)] hover:bg-[color:var(--page-ink)]"
      >
        {isSending
          ? "Sending link..."
          : hasSent
            ? "Send another link"
            : "Continue with email"}
      </Button>
      <p className="text-xs text-[color:var(--page-muted)]">
        We only email you for sign-in links.
      </p>
    </form>
  );
}
