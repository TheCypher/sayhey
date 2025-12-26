"use client";

import { useEffect, useRef, useState } from "react";

import {
  createAudioCaptureController,
  type AudioCaptureController,
  type AudioCaptureStatus,
  type GetUserMedia,
} from "@/lib/audio-capture-controller";

type UseAudioCaptureOptions = {
  initialStatus?: AudioCaptureStatus;
  getUserMedia?: GetUserMedia;
};

export function useAudioCapture(options: UseAudioCaptureOptions = {}) {
  const controllerRef = useRef<AudioCaptureController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createAudioCaptureController({
      getUserMedia: options.getUserMedia,
      initialStatus: options.initialStatus,
    });
  }

  const controller = controllerRef.current;
  const [status, setStatus] = useState<AudioCaptureStatus>(
    controller.getStatus()
  );
  const [stream, setStream] = useState<MediaStream | null>(
    controller.getStream()
  );

  useEffect(
    () =>
      controller.subscribe((nextStatus) => {
        setStatus(nextStatus);
        setStream(controller.getStream());
      }),
    [controller]
  );

  return {
    status,
    stream,
    start: controller.start,
    pause: controller.pause,
    resume: controller.resume,
    stop: controller.stop,
  };
}
