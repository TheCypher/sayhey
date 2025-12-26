import { encodePcm16 } from "./audio-encoder";
import { type TranscriptionClient } from "./transcription-client";

export type AudioFrameSource = {
  subscribe: (listener: (frame: Float32Array) => void) => () => void;
  start?: () => void;
  stop?: () => void;
  getSampleRate?: () => number | null;
};

export type TranscriptionPipelineStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "deferred"
  | "stopped";

export type TranscriptionPipeline = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  subscribe: (
    listener: (status: TranscriptionPipelineStatus) => void
  ) => () => void;
  getStatus: () => TranscriptionPipelineStatus;
};

type PipelineOptions = {
  source: AudioFrameSource;
  client: TranscriptionClient;
};

export function createTranscriptionPipeline({
  source,
  client,
}: PipelineOptions): TranscriptionPipeline {
  let status: TranscriptionPipelineStatus = "idle";
  let unsubscribe: (() => void) | null = null;
  const listeners = new Set<(status: TranscriptionPipelineStatus) => void>();
  const flushTimeoutMs = 8000;

  const emit = (next: TranscriptionPipelineStatus) => {
    status = next;
    listeners.forEach((listener) => listener(status));
  };

  const start = async () => {
    if (status === "connecting" || status === "streaming") {
      return;
    }

    emit("connecting");
    source.start?.();
    await client.connect();

    if (client.getStatus() === "failed") {
      emit("deferred");
    } else {
      emit("streaming");
    }

    const sampleRate = source.getSampleRate?.();
    if (sampleRate) {
      client.sendMessage({ type: "config", sampleRate });
    }

    unsubscribe = source.subscribe((frame) => {
      if (status !== "streaming") {
        return;
      }
      const encoded = encodePcm16(frame);
      const sent = client.sendAudio(encoded);
      if (!sent) {
        emit("deferred");
      }
    });
  };

  const stop = async () => {
    if (status === "stopped" || status === "idle") {
      return;
    }
    unsubscribe?.();
    unsubscribe = null;
    source.stop?.();
    emit("stopped");

    const clientStatus = client.getStatus();
    if (clientStatus !== "connected" && clientStatus !== "streaming") {
      client.close();
      return;
    }

    await new Promise<void>((resolve) => {
      let closed = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const finalize = () => {
        if (closed) {
          return;
        }
        closed = true;
        client.close();
        resolve();
      };

      const unsubscribeFlush = client.subscribeFlush(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        unsubscribeFlush();
        finalize();
      });

      timeoutId = setTimeout(() => {
        unsubscribeFlush();
        finalize();
      }, flushTimeoutMs);

      const sent = client.sendMessage({ type: "flush" });
      if (!sent) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        unsubscribeFlush();
        finalize();
      }
    });
  };

  const subscribe = (listener: (status: TranscriptionPipelineStatus) => void) => {
    listeners.add(listener);
    listener(status);
    return () => listeners.delete(listener);
  };

  return {
    start,
    stop,
    subscribe,
    getStatus: () => status,
  };
}
