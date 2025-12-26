"use client";

import { useEffect, useRef, useState } from "react";

type VoiceCaptureStatus =
  | "idle"
  | "recording"
  | "paused"
  | "processing"
  | "ready"
  | "error";

type VoiceCaptureSnapshot = {
  status: VoiceCaptureStatus;
  transcript: string;
  confidence: number | null;
  error: string | null;
};

type VoiceCaptureResult = {
  transcript: string;
  confidence?: number | null;
};

type GetUserMedia = (
  constraints: MediaStreamConstraints
) => Promise<MediaStream>;

type MediaRecorderLike = {
  start: () => void;
  stop: () => void;
  pause?: () => void;
  resume?: () => void;
  stream: MediaStream;
  state: "inactive" | "recording" | "paused";
  ondataavailable:
    | MediaRecorder["ondataavailable"]
    | ((event: { data: Blob }) => void);
  onstop: MediaRecorder["onstop"] | (() => void);
};

type VoiceCaptureControllerOptions = {
  getUserMedia?: GetUserMedia;
  mediaRecorderFactory?: (stream: MediaStream) => MediaRecorderLike;
  transcribeAudio?: (blob: Blob) => Promise<VoiceCaptureResult>;
  sttEndpoint?: string;
};

type VoiceCaptureController = {
  getSnapshot: () => VoiceCaptureSnapshot;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  reset: () => void;
  subscribe: (listener: (snapshot: VoiceCaptureSnapshot) => void) => () => void;
};

const defaultTranscribeAudio = async (
  blob: Blob,
  endpoint = "/api/stt"
): Promise<VoiceCaptureResult> => {
  if (typeof fetch !== "function") {
    throw new Error("Transcription is unavailable in this environment.");
  }

  const formData = new FormData();
  formData.append("audio", blob, "audio.webm");

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Transcription failed.");
  }

  const data = (await response.json()) as VoiceCaptureResult;
  return {
    transcript: typeof data.transcript === "string" ? data.transcript : "",
    confidence:
      typeof data.confidence === "number" ? data.confidence : data.confidence ?? null,
  };
};

export const createVoiceCaptureController = (
  options: VoiceCaptureControllerOptions = {}
): VoiceCaptureController => {
  let snapshot: VoiceCaptureSnapshot = {
    status: "idle",
    transcript: "",
    confidence: null,
    error: null,
  };

  let recorder: MediaRecorderLike | null = null;
  let chunks: Blob[] = [];
  let stopPromise: Promise<void> | null = null;
  let stopResolver: (() => void) | null = null;

  const listeners = new Set<(snapshot: VoiceCaptureSnapshot) => void>();

  const emit = () => {
    listeners.forEach((listener) => listener({ ...snapshot }));
  };

  const setError = (message: string) => {
    snapshot = {
      ...snapshot,
      status: "error",
      error: message,
    };
    emit();
  };

  const cleanupRecorder = () => {
    if (recorder?.stream) {
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
    recorder = null;
    chunks = [];
  };

  const pause = () => {
    if (!recorder || snapshot.status !== "recording") {
      return;
    }
    if (typeof recorder.pause !== "function") {
      setError("Recording pause is unavailable.");
      return;
    }
    recorder.pause();
    snapshot = { ...snapshot, status: "paused", error: null };
    emit();
  };

  const resume = () => {
    if (!recorder || snapshot.status !== "paused") {
      return;
    }
    if (typeof recorder.resume !== "function") {
      setError("Recording resume is unavailable.");
      return;
    }
    recorder.resume();
    snapshot = { ...snapshot, status: "recording", error: null };
    emit();
  };

  const start = async () => {
    if (snapshot.status === "recording") {
      return;
    }
    if (snapshot.status === "paused" && recorder) {
      resume();
      return;
    }

    snapshot = {
      status: "recording",
      transcript: "",
      confidence: null,
      error: null,
    };
    emit();

    try {
      const getUserMedia =
        options.getUserMedia ??
        (typeof navigator !== "undefined"
          ? navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
          : undefined);

      if (!getUserMedia) {
        setError("Microphone access is not available.");
        return;
      }

      const stream = await getUserMedia({ audio: true });
      const createRecorder =
        options.mediaRecorderFactory ??
        ((inputStream) => {
          const mimeType = "audio/webm";
          if (
            typeof MediaRecorder !== "undefined" &&
            typeof MediaRecorder.isTypeSupported === "function" &&
            MediaRecorder.isTypeSupported(mimeType)
          ) {
            return new MediaRecorder(inputStream, { mimeType });
          }
          return new MediaRecorder(inputStream);
        });

      recorder = createRecorder(stream);
      chunks = [];

      recorder.ondataavailable = (event: { data: Blob }) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        chunks = [];
        cleanupRecorder();

        if (audioBlob.size === 0) {
          setError("No audio captured. Please try again.");
          stopResolver?.();
          stopResolver = null;
          stopPromise = null;
          return;
        }

        try {
          const transcribeAudio =
            options.transcribeAudio ??
            ((blob) => defaultTranscribeAudio(blob, options.sttEndpoint));
          const result = await transcribeAudio(audioBlob);

          snapshot = {
            status: "ready",
            transcript: result.transcript ?? "",
            confidence:
              typeof result.confidence === "number" ? result.confidence : null,
            error: null,
          };
          emit();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Transcription failed."
          );
        } finally {
          stopResolver?.();
          stopResolver = null;
          stopPromise = null;
        }
      };

      recorder.start();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Microphone error.");
      cleanupRecorder();
    }
  };

  const stop = async () => {
    if (
      !recorder ||
      (snapshot.status !== "recording" && snapshot.status !== "paused")
    ) {
      return;
    }

    snapshot = {
      ...snapshot,
      status: "processing",
      error: null,
    };
    emit();

    stopPromise = new Promise<void>((resolve) => {
      stopResolver = resolve;
    });

    recorder.stop();
    await stopPromise;
  };

  const reset = () => {
    snapshot = {
      status: "idle",
      transcript: "",
      confidence: null,
      error: null,
    };
    emit();
  };

  const subscribe = (listener: (snapshot: VoiceCaptureSnapshot) => void) => {
    listeners.add(listener);
    listener({ ...snapshot });
    return () => listeners.delete(listener);
  };

  return {
    getSnapshot: () => ({ ...snapshot }),
    start,
    pause,
    resume,
    stop,
    reset,
    subscribe,
  };
};

export function useVoiceCapture(options: VoiceCaptureControllerOptions = {}) {
  const controllerRef = useRef<VoiceCaptureController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createVoiceCaptureController(options);
  }

  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = useState(controller.getSnapshot());

  useEffect(() => controller.subscribe(setSnapshot), [controller]);

  return {
    status: snapshot.status,
    transcript: snapshot.transcript,
    confidence: snapshot.confidence,
    error: snapshot.error,
    startRecording: controller.start,
    pauseRecording: controller.pause,
    resumeRecording: controller.resume,
    stopRecording: controller.stop,
    reset: controller.reset,
  };
}

export type { VoiceCaptureStatus, VoiceCaptureSnapshot, GetUserMedia };
