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
  queue: string[];
  error: string | null;
};

type AudioLike = {
  play: () => Promise<void> | void;
  pause: () => void;
  src: string;
  onended: (() => void) | null;
  onerror: (() => void) | null;
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
  enqueue: (text: string) => void;
  clear: () => void;
  subscribe: (listener: (snapshot: TtsPlaybackSnapshot) => void) => () => void;
};

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
    error: null,
  };
  let currentAudio: AudioLike | null = null;
  let currentUrl: string | null = null;
  let playbackId = 0;

  const listeners = new Set<(snapshot: TtsPlaybackSnapshot) => void>();

  const emit = () => {
    listeners.forEach((listener) => listener({ ...snapshot }));
  };

  const setStatus = (status: TtsPlaybackStatus, error: string | null = null) => {
    snapshot = { ...snapshot, status, error };
    emit();
  };

  const cleanupAudio = () => {
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
      setStatus("idle");
      return;
    }

    const text = snapshot.queue[0];
    snapshot = { ...snapshot, queue: snapshot.queue.slice(1) };
    emit();

    const runId = playbackId;

    try {
      setStatus("loading");
      const synthesizeSpeech =
        options.synthesizeSpeech ??
        ((value) => defaultSynthesizeSpeech(value, options.endpoint));
      const buffer = await synthesizeSpeech(text);

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

      currentAudio.onended = () => {
        cleanupAudio();
        playNext();
      };
      currentAudio.onerror = () => {
        cleanupAudio();
        setStatus("error", "Audio playback failed.");
      };

      currentAudio.src = currentUrl;
      await Promise.resolve(currentAudio.play());
      setStatus("playing");
    } catch (error) {
      cleanupAudio();
      setStatus(
        "error",
        error instanceof Error ? error.message : "Audio playback failed."
      );
    }
  };

  const enqueue = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    snapshot = { ...snapshot, queue: [...snapshot.queue, trimmed] };
    emit();

    if (
      snapshot.status === "idle" ||
      snapshot.status === "stopped" ||
      snapshot.status === "error"
    ) {
      void playNext();
    }
  };

  const clear = () => {
    playbackId += 1;
    snapshot = { ...snapshot, queue: [] };
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
    error: snapshot.error,
    enqueue: controller.enqueue,
    clear: controller.clear,
  };
}

export type { TtsPlaybackStatus, TtsPlaybackSnapshot, AudioLike };
