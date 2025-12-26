import {
  createTranscriptionPipeline,
  type AudioFrameSource,
  type TranscriptionPipelineStatus,
} from "./transcription-pipeline";

type FakeClient = {
  connect: jest.Mock<Promise<void>, []>;
  sendAudio: jest.Mock<boolean, [ArrayBuffer | Uint8Array | Blob]>;
  sendMessage: jest.Mock<boolean, [object | string]>;
  subscribeFlush: jest.Mock<() => void, [() => void]>;
  close: jest.Mock<void, []>;
  getStatus: () => "idle" | "connected" | "failed" | "closed" | "streaming";
};

function createFrameSource() {
  const listeners = new Set<(frame: Float32Array) => void>();
  const source: AudioFrameSource = {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    source,
    emit: (frame: Float32Array) => listeners.forEach((listener) => listener(frame)),
  };
}

function createClient(options: { fail?: boolean } = {}) {
  type ClientStatus = ReturnType<FakeClient["getStatus"]>;
  let status: ClientStatus = "idle";
  const flushListeners = new Set<() => void>();
  const connect = jest.fn(async () => {
    status = options.fail ? "failed" : "connected";
  });
  const sendAudio = jest.fn(() => {
    if (status === "connected" || status === "streaming") {
      status = "streaming";
      return true;
    }
    return false;
  });
  const sendMessage = jest.fn(() => status === "connected" || status === "streaming");
  const subscribeFlush = jest.fn((listener: () => void) => {
    flushListeners.add(listener);
    return () => flushListeners.delete(listener);
  });
  const close = jest.fn(() => {
    status = "closed";
  });

  return {
    connect,
    sendAudio,
    sendMessage,
    subscribeFlush,
    close,
    getStatus: () => status,
    emitFlush: () => flushListeners.forEach((listener) => listener()),
  } satisfies FakeClient;
}

describe("transcription pipeline", () => {
  it("connects and streams frames when available", async () => {
    const { source, emit } = createFrameSource();
    const client = createClient();
    const pipeline = createTranscriptionPipeline({ source, client });
    const statuses: TranscriptionPipelineStatus[] = [];
    const unsubscribe = pipeline.subscribe((status) => statuses.push(status));

    await pipeline.start();
    emit(new Float32Array([0.2, -0.2]));

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.sendAudio).toHaveBeenCalledTimes(1);
    expect(client.sendMessage).toHaveBeenCalledTimes(0);
    expect(statuses).toContain("streaming");

    unsubscribe();
  });

  it("marks the pipeline deferred when connection fails", async () => {
    const { source, emit } = createFrameSource();
    const client = createClient({ fail: true });
    const pipeline = createTranscriptionPipeline({ source, client });

    await pipeline.start();
    emit(new Float32Array([0.4]));

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.sendAudio).not.toHaveBeenCalled();
    expect(client.sendMessage).not.toHaveBeenCalled();
    expect(pipeline.getStatus()).toBe("deferred");
  });

  it("flushes before closing the client", async () => {
    const { source } = createFrameSource();
    const client = createClient();
    const pipeline = createTranscriptionPipeline({ source, client });

    await pipeline.start();
    const stopPromise = pipeline.stop();

    expect(client.sendMessage).toHaveBeenCalledWith({ type: "flush" });
    expect(client.close).not.toHaveBeenCalled();

    client.emitFlush();
    await stopPromise;

    expect(client.close).toHaveBeenCalledTimes(1);
    expect(pipeline.getStatus()).toBe("stopped");
  });

  it("sends a config message when sample rate is available", async () => {
    const { source } = createFrameSource();
    const client = createClient();
    const pipeline = createTranscriptionPipeline({
      source: { ...source, getSampleRate: () => 44100 },
      client,
    });

    await pipeline.start();

    expect(client.sendMessage).toHaveBeenCalledWith({
      type: "config",
      sampleRate: 44100,
    });
  });
});
