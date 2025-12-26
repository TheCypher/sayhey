export type AudioCaptureStatus =
  | "idle"
  | "requesting"
  | "active"
  | "paused"
  | "stopped"
  | "blocked";

export type GetUserMedia = (
  constraints: MediaStreamConstraints
) => Promise<MediaStream>;

export type AudioCaptureControllerOptions = {
  getUserMedia?: GetUserMedia;
  initialStatus?: AudioCaptureStatus;
};

export type AudioCaptureController = {
  getStatus: () => AudioCaptureStatus;
  getStream: () => MediaStream | null;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  subscribe: (listener: (status: AudioCaptureStatus) => void) => () => void;
};

export function createAudioCaptureController(
  options: AudioCaptureControllerOptions = {}
): AudioCaptureController {
  const defaultGetUserMedia: GetUserMedia = (constraints) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      return Promise.reject(new Error("media-devices-unavailable"));
    }
    return navigator.mediaDevices.getUserMedia(constraints);
  };

  const getUserMedia = options.getUserMedia ?? defaultGetUserMedia;
  let status: AudioCaptureStatus = options.initialStatus ?? "idle";
  let stream: MediaStream | null = null;
  const listeners = new Set<(status: AudioCaptureStatus) => void>();

  const emit = (nextStatus: AudioCaptureStatus) => {
    status = nextStatus;
    listeners.forEach((listener) => listener(status));
  };

  const start = async () => {
    if (status === "active" || status === "requesting") {
      return;
    }

    if (status === "paused" && stream) {
      stream.getTracks().forEach((track) => {
        track.enabled = true;
      });
      emit("active");
      return;
    }

    emit("requesting");
    try {
      stream = await getUserMedia({ audio: true });
      emit("active");
    } catch {
      stream = null;
      emit("blocked");
    }
  };

  const pause = () => {
    if (status !== "active" || !stream) {
      return;
    }
    stream.getTracks().forEach((track) => {
      track.enabled = false;
    });
    emit("paused");
  };

  const resume = () => {
    if (status !== "paused" || !stream) {
      return;
    }
    stream.getTracks().forEach((track) => {
      track.enabled = true;
    });
    emit("active");
  };

  const stop = () => {
    if (status !== "active" && status !== "paused") {
      return;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    emit("stopped");
  };

  const subscribe = (listener: (status: AudioCaptureStatus) => void) => {
    listeners.add(listener);
    listener(status);
    return () => listeners.delete(listener);
  };

  return {
    getStatus: () => status,
    getStream: () => stream,
    start,
    pause,
    resume,
    stop,
    subscribe,
  };
}
