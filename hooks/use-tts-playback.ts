"use client";

import { useEffect, useRef, useState } from "react";

type TtsPlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "stopped"
  | "error";

type TtsPlaybackSnapshot = {
  status: TtsPlaybackStatus;
  queue: TtsPlaybackItem[];
  currentItem: TtsPlaybackItem | null;
  error: string | null;
};

type TtsPlaybackItem = {
  id: string;
  text: string;
  meta?: Record<string, unknown>;
};

type AudioLike = {
  play: () => Promise<void> | void;
  pause: () => void;
  src: string;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  addEventListener?: (
    type: "ended" | "error",
    listener: () => void,
    options?: boolean | AddEventListenerOptions
  ) => void;
  removeEventListener?: (
    type: "ended" | "error",
    listener: () => void,
    options?: boolean | EventListenerOptions
  ) => void;
  ended?: boolean;
  currentTime?: number;
  duration?: number;
};

type TtsPlaybackControllerOptions = {
  synthesizeSpeech?: (text: string) => Promise<ArrayBuffer>;
  audioFactory?: () => AudioLike;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  endpoint?: string;
};

type TtsPlaybackController = {
  getSnapshot: () => TtsPlaybackSnapshot;
  enqueue: (input: TtsPlaybackInput) => void;
  clear: () => void;
  subscribe: (listener: (snapshot: TtsPlaybackSnapshot) => void) => () => void;
};

type TtsPlaybackInput = string | TtsPlaybackItem;

const defaultSynthesizeSpeech = async (
  text: string,
  endpoint = "/api/tts"
) => {
  if (typeof fetch !== "function") {
    throw new Error("Speech synthesis is unavailable in this environment.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error("TTS synthesis failed.");
  }

  return response.arrayBuffer();
};

export const createTtsPlaybackController = (
  options: TtsPlaybackControllerOptions = {}
): TtsPlaybackController => {
  let snapshot: TtsPlaybackSnapshot = {
    status: "idle",
    queue: [],
    currentItem: null,
    error: null,
  };
  let currentAudio: AudioLike | null = null;
  let currentUrl: string | null = null;
  let playbackId = 0;
  let queueCounter = 0;
  let endCheckId: ReturnType<typeof setInterval> | null = null;

  const listeners = new Set<(snapshot: TtsPlaybackSnapshot) => void>();

  const emit = () => {
    listeners.forEach((listener) => listener({ ...snapshot }));
  };

  const setSnapshot = (next: Partial<TtsPlaybackSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    emit();
  };

  const setStatus = (status: TtsPlaybackStatus, error: string | null = null) => {
    setSnapshot({ status, error });
  };

  const cleanupAudio = () => {
    if (endCheckId) {
      clearInterval(endCheckId);
      endCheckId = null;
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
    }
    if (currentUrl) {
      const revokeObjectUrl =
        options.revokeObjectUrl ??
        ((url: string) => {
          if (typeof URL !== "undefined" && URL.revokeObjectURL) {
            URL.revokeObjectURL(url);
          }
        });
      revokeObjectUrl(currentUrl);
      currentUrl = null;
    }
    currentAudio = null;
  };

  const playNext = async () => {
    if (snapshot.queue.length === 0) {
      setSnapshot({ status: "idle", currentItem: null, error: null });
      return;
    }

    const [nextItem, ...restQueue] = snapshot.queue;
    setSnapshot({
      queue: restQueue,
      currentItem: nextItem,
      error: null,
    });

    const runId = playbackId;

    try {
      setStatus("loading");
      const synthesizeSpeech =
        options.synthesizeSpeech ??
        ((value) => defaultSynthesizeSpeech(value, options.endpoint));
      const buffer = await synthesizeSpeech(nextItem.text);

      if (runId !== playbackId) {
        return;
      }

      const createObjectUrl =
        options.createObjectUrl ??
        ((blob: Blob) => {
          if (typeof URL === "undefined" || !URL.createObjectURL) {
            throw new Error("Audio URLs are not supported in this environment.");
          }
          return URL.createObjectURL(blob);
        });
      const audioFactory =
        options.audioFactory ?? (() => new Audio() as AudioLike);

      const blob = new Blob([buffer], { type: "audio/mpeg" });
      currentUrl = createObjectUrl(blob);
      currentAudio = audioFactory();
      let hasFinished = false;

      const handleEnded = () => {
        if (hasFinished || runId !== playbackId) {
          return;
        }
        hasFinished = true;
        cleanupAudio();
        playNext();
      };

      const handleError = () => {
        if (hasFinished || runId !== playbackId) {
          return;
        }
        hasFinished = true;
        cleanupAudio();
        setSnapshot({
          status: "error",
          currentItem: null,
          error: "Audio playback failed.",
        });
      };

      currentAudio.onended = handleEnded;
      currentAudio.onerror = handleError;
      if (typeof currentAudio.addEventListener === "function") {
        currentAudio.addEventListener("ended", handleEnded, { once: true });
        currentAudio.addEventListener("error", handleError, { once: true });
      }

      currentAudio.src = currentUrl;
      if (
        typeof currentAudio.ended === "boolean" ||
        (typeof currentAudio.duration === "number" &&
          Number.isFinite(currentAudio.duration))
      ) {
        endCheckId = setInterval(() => {
          if (!currentAudio || runId !== playbackId) {
            if (endCheckId) {
              clearInterval(endCheckId);
              endCheckId = null;
            }
            return;
          }
          const duration = currentAudio.duration;
          const currentTime = currentAudio.currentTime;
          if (
            currentAudio.ended === true ||
            (typeof currentTime === "number" &&
              typeof duration === "number" &&
              Number.isFinite(duration) &&
              duration > 0 &&
              currentTime >= duration - 0.05)
          ) {
            handleEnded();
          }
        }, 250);
      }
      await Promise.resolve(currentAudio.play());
      setStatus("playing");
    } catch (error) {
      cleanupAudio();
      setSnapshot({
        status: "error",
        currentItem: null,
        error:
          error instanceof Error ? error.message : "Audio playback failed.",
      });
    }
  };

  const normalizeItem = (input: TtsPlaybackInput) => {
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) {
        return null;
      }
      queueCounter += 1;
      return {
        id: `tts-${Date.now()}-${queueCounter}`,
        text: trimmed,
      };
    }
    const trimmed = input.text.trim();
    if (!trimmed) {
      return null;
    }
    return { ...input, text: trimmed };
  };

  const enqueue = (input: TtsPlaybackInput) => {
    const item = normalizeItem(input);
    if (!item) {
      return;
    }

    snapshot = { ...snapshot, queue: [...snapshot.queue, item] };
    emit();

    if (
      snapshot.status === "idle" ||
      snapshot.status === "stopped" ||
      snapshot.status === "error"
    ) {
      setStatus("loading");
      void playNext();
    }
  };

  const clear = () => {
    playbackId += 1;
    snapshot = { ...snapshot, queue: [], currentItem: null, error: null };
    cleanupAudio();
    setStatus("stopped");
  };

  const subscribe = (listener: (snapshot: TtsPlaybackSnapshot) => void) => {
    listeners.add(listener);
    listener({ ...snapshot });
    return () => listeners.delete(listener);
  };

  return {
    getSnapshot: () => ({ ...snapshot }),
    enqueue,
    clear,
    subscribe,
  };
};

export function useTtsPlayback(options: TtsPlaybackControllerOptions = {}) {
  const controllerRef = useRef<TtsPlaybackController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createTtsPlaybackController(options);
  }

  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = useState(controller.getSnapshot());

  useEffect(() => controller.subscribe(setSnapshot), [controller]);

  return {
    status: snapshot.status,
    queue: snapshot.queue,
    currentItem: snapshot.currentItem,
    error: snapshot.error,
    enqueue: controller.enqueue,
    clear: controller.clear,
  };
}

export type {
  TtsPlaybackStatus,
  TtsPlaybackSnapshot,
  TtsPlaybackItem,
  TtsPlaybackInput,
  AudioLike,
};
