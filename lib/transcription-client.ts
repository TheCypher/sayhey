export type TranscriptionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "streaming"
  | "failed"
  | "closed";

export type WebSocketLike = {
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  send: (data: ArrayBuffer | ArrayBufferView | Blob | string) => void;
  close: () => void;
};

export type WebSocketFactory = (url: string) => WebSocketLike;

export type TranscriptionClientOptions = {
  url: string;
  createSocket?: WebSocketFactory;
};

export type TranscriptSegment = {
  id: string;
  sequence: number;
  text: string;
  startedAt: string;
  endedAt?: string;
};

export type TranscriptionClient = {
  connect: () => Promise<void>;
  sendAudio: (data: ArrayBuffer | ArrayBufferView | Blob) => boolean;
  sendMessage: (message: object | string) => boolean;
  close: () => void;
  subscribe: (listener: (status: TranscriptionStatus) => void) => () => void;
  subscribeSegments: (
    listener: (segment: TranscriptSegment) => void
  ) => () => void;
  subscribeFlush: (listener: () => void) => () => void;
  getStatus: () => TranscriptionStatus;
};

export function createTranscriptionClient(
  options: TranscriptionClientOptions
): TranscriptionClient {
  const defaultFactory: WebSocketFactory = (url) => {
    if (typeof WebSocket === "undefined") {
      throw new Error("websocket-unavailable");
    }
    return new WebSocket(url);
  };

  const createSocket = options.createSocket ?? defaultFactory;
  let status: TranscriptionStatus = "idle";
  let socket: WebSocketLike | null = null;
  const listeners = new Set<(status: TranscriptionStatus) => void>();
  const segmentListeners = new Set<(segment: TranscriptSegment) => void>();
  const flushListeners = new Set<() => void>();

  const emit = (next: TranscriptionStatus) => {
    status = next;
    listeners.forEach((listener) => listener(status));
  };

  const connect = () => {
    if (status === "connecting" || status === "connected" || status === "streaming") {
      return Promise.resolve();
    }

    emit("connecting");
    socket = createSocket(options.url);

    return new Promise<void>((resolve) => {
      if (!socket) {
        emit("failed");
        resolve();
        return;
      }

      socket.onopen = () => {
        emit("connected");
        resolve();
      };
      socket.onerror = () => {
        emit("failed");
        resolve();
      };
      socket.onclose = () => {
        emit("closed");
      };
      socket.onmessage = (event) => {
        if (typeof event.data !== "string") {
          return;
        }
        try {
          const payload = JSON.parse(event.data) as {
            type?: string;
            segment?: TranscriptSegment;
          };
          const segment = payload.segment;
          if (payload.type === "segment" && segment) {
            segmentListeners.forEach((listener) => listener(segment));
          } else if (payload.type === "flushed") {
            flushListeners.forEach((listener) => listener());
          }
        } catch {
          // Ignore malformed messages.
        }
      };
    });
  };

  const sendAudio = (data: ArrayBuffer | ArrayBufferView | Blob) => {
    if (!socket || (status !== "connected" && status !== "streaming")) {
      return false;
    }

    socket.send(data);

    if (status === "connected") {
      emit("streaming");
    }

    return true;
  };

  const sendMessage = (message: object | string) => {
    if (!socket || (status !== "connected" && status !== "streaming")) {
      return false;
    }

    const payload = typeof message === "string" ? message : JSON.stringify(message);
    socket.send(payload);
    return true;
  };

  const close = () => {
    if (!socket || status === "closed") {
      return;
    }
    socket.close();
    emit("closed");
  };

  const subscribe = (listener: (status: TranscriptionStatus) => void) => {
    listeners.add(listener);
    listener(status);
    return () => listeners.delete(listener);
  };

  const subscribeSegments = (listener: (segment: TranscriptSegment) => void) => {
    segmentListeners.add(listener);
    return () => segmentListeners.delete(listener);
  };

  const subscribeFlush = (listener: () => void) => {
    flushListeners.add(listener);
    return () => flushListeners.delete(listener);
  };

  return {
    connect,
    sendAudio,
    sendMessage,
    close,
    subscribe,
    subscribeSegments,
    subscribeFlush,
    getStatus: () => status,
  };
}
