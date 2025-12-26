"use client";

import { useEffect, useRef, useState } from "react";

import { createMediaStreamFrameSource } from "@/lib/media-stream-frame-source";
import {
  createTranscriptionPipeline,
  type TranscriptionPipeline,
  type TranscriptionPipelineStatus,
} from "@/lib/transcription-pipeline";
import {
  createTranscriptionClient,
  type TranscriptionClient,
  type TranscriptSegment,
} from "@/lib/transcription-client";

type UseTranscriptionPipelineOptions = {
  stream: MediaStream | null;
  enabled: boolean;
  url?: string;
};

export function useTranscriptionPipeline({
  stream,
  enabled,
  url,
}: UseTranscriptionPipelineOptions) {
  const pipelineRef = useRef<TranscriptionPipeline | null>(null);
  const [status, setStatus] = useState<TranscriptionPipelineStatus>("idle");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);

  useEffect(() => {
    if (!enabled || !stream) {
      if (pipelineRef.current) {
        void pipelineRef.current.stop();
        pipelineRef.current = null;
      }
      setStatus("idle");
      return;
    }

    if (!url) {
      setStatus("deferred");
      return;
    }

    const client: TranscriptionClient = createTranscriptionClient({ url });
    const unsubscribeSegments = client.subscribeSegments((segment) => {
      setSegments((prev) => [...prev, segment]);
    });
    const source = createMediaStreamFrameSource(stream);
    const pipeline = createTranscriptionPipeline({
      source,
      client,
    });
    pipelineRef.current = pipeline;
    const unsubscribe = pipeline.subscribe(setStatus);

    void pipeline.start();

    return () => {
      unsubscribe();
      void pipeline.stop().finally(() => {
        unsubscribeSegments();
      });
      pipelineRef.current = null;
    };
  }, [enabled, stream, url]);

  return { status, segments };
}
