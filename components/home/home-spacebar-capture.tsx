"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";

import { transcribeAudioBlob, useVoiceCapture } from "@/hooks/use-voice-capture";
import type { VoiceCaptureStatus } from "@/hooks/use-voice-capture";
import { setPendingTranscriptPromise } from "@/lib/pending-transcript";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SpacebarShortcutTarget = EventTarget | {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => Element | null;
};

const isEditableTarget = (target: SpacebarShortcutTarget | null) => {
  if (!target) {
    return false;
  }

  const element = target as {
    tagName?: string;
    isContentEditable?: boolean;
    closest?: (selector: string) => Element | null;
  };

  if (element.isContentEditable) {
    return true;
  }

  const tagName =
    typeof element.tagName === "string" ? element.tagName.toLowerCase() : "";
  if (tagName === "textarea" || tagName === "input" || tagName === "select") {
    return true;
  }

  if (typeof element.closest === "function") {
    const editableParent = element.closest(
      'textarea, input, select, [contenteditable="true"], [contenteditable=""]'
    );
    if (editableParent) {
      return true;
    }
  }

  return false;
};

const isSpacebarKey = (event: KeyboardEvent) =>
  event.code === "Space" || event.key === " " || event.key === "Spacebar";

const SPACEBAR_DOUBLE_TAP_MS = 280;

const isSpacebarShortcut = (event: KeyboardEvent) => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  if (!isSpacebarKey(event)) {
    return false;
  }

  return !isEditableTarget(event.target);
};

const getSpacebarCaptureAction = (status: VoiceCaptureStatus) => {
  if (status === "recording") {
    return "pause";
  }
  if (status === "paused") {
    return "resume";
  }
  if (status === "idle" || status === "error") {
    return "start";
  }
  return null;
};

const shouldStopOnSpacebarDoubleTap = (
  status: VoiceCaptureStatus,
  lastTapAt: number | null,
  now: number,
  windowMs: number = SPACEBAR_DOUBLE_TAP_MS
) => {
  if (!lastTapAt || now - lastTapAt > windowMs) {
    return false;
  }

  return status === "recording" || status === "paused";
};

export function HomeSpacebarCapture() {
  const router = useRouter();
  const lastSpacebarTapRef = useRef<number | null>(null);
  const hasNavigatedRef = useRef(false);
  const voiceStatusRef = useRef<VoiceCaptureStatus>("idle");
  const transcribeAudio = useCallback(
    (blob: Blob) => {
      const promise = transcribeAudioBlob(blob).then((result) => ({
        transcript: result.transcript,
        confidence:
          typeof result.confidence === "number" ? result.confidence : null,
        autoSave: true,
      }));
      setPendingTranscriptPromise(promise);
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        router.push("/journals/new");
      }
      return promise;
    },
    [router, setPendingTranscriptPromise, transcribeAudioBlob]
  );

  const {
    status,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useVoiceCapture({ transcribeAudio });

  useEffect(() => {
    voiceStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (typeof document !== "undefined" && !document.hasFocus()) {
        return;
      }

      if (!isSpacebarShortcut(event)) {
        return;
      }

      const now = Date.now();
      const currentStatus = voiceStatusRef.current;

      if (
        shouldStopOnSpacebarDoubleTap(
          currentStatus,
          lastSpacebarTapRef.current,
          now
        )
      ) {
        event.preventDefault();
        lastSpacebarTapRef.current = null;
        stopRecording();
        voiceStatusRef.current = "processing";
        return;
      }

      const action = getSpacebarCaptureAction(currentStatus);
      if (!action) {
        return;
      }

      event.preventDefault();
      lastSpacebarTapRef.current = now;

      if (action === "start") {
        startRecording();
        voiceStatusRef.current = "recording";
        return;
      }

      if (action === "pause") {
        pauseRecording();
        voiceStatusRef.current = "paused";
        return;
      }

      if (action === "resume") {
        resumeRecording();
        voiceStatusRef.current = "recording";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pauseRecording, resumeRecording, startRecording, stopRecording]);

  const isListening = status === "recording" || status === "paused";
  const isProcessing = status === "processing";
  const statusCopy = useMemo(() => {
    if (status === "recording") {
      return "Listening...";
    }
    if (status === "paused") {
      return "Paused.";
    }
    if (status === "processing") {
      return "Transcribing...";
    }
    if (status === "error") {
      return "Microphone error.";
    }
    return "Ready to listen.";
  }, [status]);
  const helperCopy = useMemo(() => {
    if (status === "recording") {
      return "Speak your entry. Double-tap Space to stop.";
    }
    if (status === "paused") {
      return "Press Space to resume or double-tap to stop.";
    }
    if (status === "processing") {
      return "Sending your audio for transcription.";
    }
    if (status === "error") {
      return "Check mic permissions and press Space to try again.";
    }
    return "Press Space to start. Double-tap to stop & save.";
  }, [status]);

  const handlePrimary = () => {
    const currentStatus = voiceStatusRef.current;
    if (currentStatus === "recording") {
      stopRecording();
      voiceStatusRef.current = "processing";
      return;
    }
    if (currentStatus === "paused") {
      resumeRecording();
      voiceStatusRef.current = "recording";
      return;
    }
    startRecording();
    voiceStatusRef.current = "recording";
  };

  return (
    <div
      data-control="home-voice-controls"
      data-state={status}
      className="flex flex-col items-center gap-3"
    >
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "pointer-events-none absolute h-24 w-24 rounded-full border opacity-80",
            isListening
              ? "border-[color:var(--page-accent)] opacity-90 animate-soft-pulse"
              : "border-[color:var(--page-border)]"
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute h-32 w-32 rounded-full border opacity-60 [animation-delay:1.2s]",
            isListening
              ? "border-[color:var(--page-accent)] opacity-70 animate-soft-pulse"
              : "border-[color:var(--page-border)]"
          )}
        />
        <Button
          type="button"
          size="lg"
          variant={isListening ? "default" : "outline"}
          disabled={isProcessing}
          onClick={handlePrimary}
          className={cn(
            "h-16 w-16 rounded-full p-0 shadow-md shadow-black/10 transition",
            isListening
              ? "bg-[color:var(--page-accent-strong)] text-[color:var(--page-paper)] hover:bg-[color:var(--page-accent)]"
              : "border-[color:var(--page-border)] bg-white text-[color:var(--page-ink-strong)] hover:bg-[color:var(--page-paper)]"
          )}
          aria-label={isListening ? "Stop recording" : "Start recording"}
          aria-pressed={isListening}
        >
          <Mic className="h-5 w-5" />
        </Button>
      </div>
      <div className="text-xs uppercase tracking-[0.35em] text-[color:var(--page-muted)]">
        {statusCopy}
      </div>
      <p
        className="text-xs text-[color:var(--page-muted)]"
        aria-live="polite"
      >
        {helperCopy}
      </p>
    </div>
  );
}
