"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLocalConversations } from "@/hooks/use-local-conversations";

export default function NewJournalPage() {
  const router = useRouter();
  const { createConversation, isLoading } = useLocalConversations();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const id = await createConversation();
      if (!active) {
        return;
      }
      if (id) {
        router.replace(`/journals/${encodeURIComponent(id)}`);
        return;
      }
      setError("Unable to start a new journal right now.");
    })();

    return () => {
      active = false;
    };
  }, [createConversation, router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[color:var(--page-bg)] px-6 text-[color:var(--page-ink)]">
      <div className="space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
          Starting a new journal
        </p>
        <h1 className="font-display text-3xl text-[color:var(--page-ink-strong)]">
          Preparing your workspace...
        </h1>
        <p className="text-sm text-[color:var(--page-muted)]">
          {error ?? "We will take you to your journal in a moment."}
        </p>
        {error && (
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => router.replace("/")}>Return home</Button>
          </div>
        )}
        {!error && isLoading && (
          <div className="mx-auto h-1.5 w-40 rounded-full bg-[color:var(--page-border)]">
            <div className="h-full w-1/3 rounded-full bg-[color:var(--page-accent)] animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
