"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { useTranscriptionPipeline } from "@/hooks/use-transcription-pipeline";
import { type AudioCaptureStatus } from "@/lib/audio-capture-controller";
import { type ListeningState } from "@/lib/listening-state";
import { cn } from "@/lib/utils";

const STATE_COPY: Record<
  ListeningState,
  {
    heading: string;
    body: string;
    primaryLabel: string;
    status: string;
    stream: string;
  }
> = {
  idle: {
    heading: "Tap to speak when you are ready",
    body:
      "This is your private journal. Say what is on your mind. We listen and stay quiet unless you ask for help.",
    primaryLabel: "Tap to speak",
    status: "Listening status: idle",
    stream: "Waiting for your first words.",
  },
  active: {
    heading: "Listening...",
    body: "We are capturing your words. Ask for help when you want a response.",
    primaryLabel: "Listening...",
    status: "Listening status: active",
    stream: "Capturing quietly. Transcript appears after you pause or close the entry.",
  },
  paused: {
    heading: "Paused",
    body: "Your entry is safe. Continue when you are ready.",
    primaryLabel: "Continue entry",
    status: "Listening status: paused",
    stream: "Entry paused. Transcript appears below.",
  },
  stopped: {
    heading: "Entry closed",
    body: "Entry closed. New speech starts a new entry.",
    primaryLabel: "Tap to speak",
    status: "Listening status: closed",
    stream: "Entry closed. Transcript appears below.",
  },
};

type VoiceCaptureProps = {
  initialAudioStatus?: AudioCaptureStatus;
};

export function VoiceCapture({ initialAudioStatus }: VoiceCaptureProps) {
  const { status, stream, start, pause, resume, stop } = useAudioCapture({
    initialStatus: initialAudioStatus,
  });
  const [optimisticListening, setOptimisticListening] = useState(false);
  const optimisticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const streamRef = useRef<HTMLDivElement | null>(null);
  const isListening =
    optimisticListening || status === "active" || status === "requesting";
  const { segments } = useTranscriptionPipeline({
    stream,
    enabled: status === "active",
    url: process.env.NEXT_PUBLIC_TRANSCRIPTION_WS_URL,
  });
  const showSegments =
    segments.length > 0 && (status === "paused" || status === "stopped");
  const uiState: ListeningState =
    isListening
      ? "active"
      : status === "paused"
        ? "paused"
        : status === "stopped"
          ? "stopped"
          : "idle";
  const copy = STATE_COPY[uiState];
  const isActive = status === "active";
  const isPaused = uiState === "paused";
  const isRequesting = status === "requesting";
  const isBlocked = status === "blocked";
  const showStop = isActive || isPaused;

  useEffect(() => {
    if (status === "active" || status === "requesting") {
      setOptimisticListening(false);
      if (optimisticTimeoutRef.current) {
        clearTimeout(optimisticTimeoutRef.current);
        optimisticTimeoutRef.current = null;
      }
      return;
    }
    if (status !== "idle") {
      setOptimisticListening(false);
    }
  }, [status]);

  useEffect(
    () => () => {
      if (optimisticTimeoutRef.current) {
        clearTimeout(optimisticTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!streamRef.current || !showSegments) {
      return;
    }
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [segments.length, showSegments]);

  const triggerOptimisticListening = () => {
    setOptimisticListening(true);
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }
    optimisticTimeoutRef.current = setTimeout(() => {
      setOptimisticListening(false);
      optimisticTimeoutRef.current = null;
    }, 1500);
  };

  const handlePrimary = () => {
    if (status === "paused") {
      resume();
      return;
    }
    triggerOptimisticListening();
    start();
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,_rgba(122,162,147,0.35),_transparent_70%)] blur-2xl animate-drift" />
        <div className="absolute right-[-6rem] top-1/3 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(231,214,182,0.55),_transparent_70%)] blur-3xl animate-drift-slow" />
        <div className="absolute bottom-[-6rem] left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(210,230,224,0.6),_transparent_70%)] blur-3xl animate-drift" />
      </div>

      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col gap-10 px-6 py-10 md:px-10 md:py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <Link href="/?new=1" className="text-xl font-semibold tracking-tight">
              Hey
            </Link>
            <span className="text-xs uppercase tracking-[0.35em] text-[color:var(--page-muted)]">
              Voice journal
            </span>
          </div>
          <div className="text-xs text-[color:var(--page-muted)]">
            Silence by default. Help only when asked.
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <div className="space-y-4 animate-fade-up">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--page-muted)]">
              Current state
            </p>
            <h1 className="font-display text-4xl leading-tight md:text-5xl">
              {copy.heading}
            </h1>
            <p className="mx-auto max-w-xl text-base text-[color:var(--page-muted)] md:text-lg">
              {copy.body}
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            <div
              className={cn(
                "pointer-events-none absolute h-48 w-48 rounded-full border opacity-80 animate-soft-pulse",
                isListening
                  ? "border-[color:var(--page-accent)] opacity-90"
                  : "border-[color:var(--page-border)]"
              )}
            />
            <div
              className={cn(
                "pointer-events-none absolute h-64 w-64 rounded-full border opacity-60 animate-soft-pulse [animation-delay:1.2s]",
                isListening
                  ? "border-[color:var(--page-accent)] opacity-70"
                  : "border-[color:var(--page-border)]"
              )}
            />
            <Button
              className={cn(
                "relative z-10 h-24 w-24 rounded-full text-sm font-semibold shadow-xl shadow-black/10 transition-[transform,colors] active:scale-95 disabled:opacity-100",
                isListening
                  ? "bg-[color:var(--page-accent)] text-[color:var(--page-paper)] hover:bg-[color:var(--page-accent-strong)]"
                  : "bg-[color:var(--page-ink)] text-[color:var(--page-paper)] hover:bg-[color:var(--page-ink-strong)]"
              )}
              aria-label={copy.primaryLabel}
              aria-pressed={isListening}
              data-listening={isListening ? "true" : "false"}
              onClick={handlePrimary}
              disabled={isActive || isRequesting}
            >
              {copy.primaryLabel}
            </Button>
          </div>

          <div className="animate-fade-up text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)] [animation-delay:150ms]">
            {copy.status}
          </div>

          {isActive && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="secondary"
                className="border border-[color:var(--page-border)] bg-[color:var(--page-paper)] text-[color:var(--page-ink)] shadow-sm"
                data-control="pause"
                onClick={pause}
              >
                Pause
              </Button>
            </div>
          )}

          {isBlocked && (
            <div className="text-xs text-[color:var(--page-muted)]">
              Microphone access is needed to listen.
            </div>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-lg shadow-black/5">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="font-display text-lg">
                  Journal entry stream
                </CardTitle>
                {showStop && (
                  <Button
                    variant="ghost"
                    className="text-[color:var(--page-muted)] hover:text-[color:var(--page-ink)]"
                    data-control="stop"
                    onClick={stop}
                  >
                    Close entry
                  </Button>
                )}
              </div>
              <CardDescription>
                Continuous entries, quiet by default.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] p-5">
                <div
                  ref={streamRef}
                  data-stream="entry"
                  className="max-h-64 overflow-y-auto pr-2 text-sm text-[color:var(--page-ink)]"
                >
                  {!showSegments ? (
                    <>
                      <p className="text-sm text-[color:var(--page-muted)]">
                        {copy.stream}
                      </p>
                      <div className="mt-4 space-y-2">
                        <div className="h-2 w-10/12 rounded-full bg-[color:var(--page-border)] opacity-70" />
                        <div className="h-2 w-8/12 rounded-full bg-[color:var(--page-border)] opacity-60" />
                        <div className="h-2 w-9/12 rounded-full bg-[color:var(--page-border)] opacity-50" />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 text-sm text-[color:var(--page-ink)]">
                      {segments.map((segment) => (
                        <p key={segment.id}>{segment.text}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color:var(--page-border)] bg-[color:var(--page-card)] shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Listening rules
              </CardTitle>
              <CardDescription>Voice-first and trust-forward.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-[color:var(--page-muted)]">
                <li>No wake words. No commands.</li>
                <li>We stay quiet unless you ask for help.</li>
                <li>Pause means you are coming back.</li>
                <li>Audio is ephemeral. Transcripts persist.</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
