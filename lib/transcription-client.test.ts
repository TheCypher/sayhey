import { createTranscriptionClient } from "./transcription-client";

class FakeWebSocket {
  onopen: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => {
    this.onclose?.();
  });

  open() {
    this.onopen?.();
  }

  error() {
    this.onerror?.({ message: "failed" });
  }

  message(payload: unknown) {
    this.onmessage?.({ data: payload });
  }
}

describe("transcription client", () => {
  it("connects and transitions to connected", async () => {
    const socket = new FakeWebSocket();
    const client = createTranscriptionClient({
      url: "wss://example.test",
      createSocket: () => socket,
    });

    const connectPromise = client.connect();
    expect(client.getStatus()).toBe("connecting");

    socket.open();
    await connectPromise;

    expect(client.getStatus()).toBe("connected");
  });

  it("sends audio only after connecting", async () => {
    const socket = new FakeWebSocket();
    const client = createTranscriptionClient({
      url: "wss://example.test",
      createSocket: () => socket,
    });

    expect(client.sendAudio(new Uint8Array([1]))).toBe(false);

    const connectPromise = client.connect();
    socket.open();
    await connectPromise;

    expect(client.sendAudio(new Uint8Array([1, 2]))).toBe(true);
    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(client.getStatus()).toBe("streaming");
  });

  it("sends control messages only after connecting", async () => {
    const socket = new FakeWebSocket();
    const client = createTranscriptionClient({
      url: "wss://example.test",
      createSocket: () => socket,
    });

    expect(client.sendMessage({ type: "config" })).toBe(false);

    const connectPromise = client.connect();
    socket.open();
    await connectPromise;

    expect(client.sendMessage({ type: "config", sampleRate: 48000 })).toBe(true);
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "config", sampleRate: 48000 })
    );
  });

  it("marks the client failed on connection errors", async () => {
    const socket = new FakeWebSocket();
    const client = createTranscriptionClient({
      url: "wss://example.test",
      createSocket: () => socket,
    });

    const connectPromise = client.connect();
    socket.error();
    await connectPromise;

    expect(client.getStatus()).toBe("failed");
  });

  it("closes the connection when requested", async () => {
    const socket = new FakeWebSocket();
    const client = createTranscriptionClient({
      url: "wss://example.test",
      createSocket: () => socket,
    });

    const connectPromise = client.connect();
    socket.open();
    await connectPromise;

    client.close();

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(client.getStatus()).toBe("closed");
  });

  it("emits transcript segments from incoming messages", async () => {
    const socket = new FakeWebSocket();
    const client = createTranscriptionClient({
      url: "wss://example.test",
      createSocket: () => socket,
    });
    const segments: Array<{ id: string }> = [];
    const unsubscribe = client.subscribeSegments((segment) => {
      segments.push(segment);
    });

    const connectPromise = client.connect();
    socket.open();
    await connectPromise;

    socket.message(
      JSON.stringify({
        type: "segment",
        segment: {
          id: "seg-1",
          sequence: 1,
          text: "hello",
          startedAt: "2025-12-25T00:00:00.000Z",
        },
      })
    );

    expect(segments).toHaveLength(1);
    expect(segments[0].id).toBe("seg-1");

    unsubscribe();
  });

  it("emits a flush event when the server acknowledges a flush", async () => {
    const socket = new FakeWebSocket();
    const client = createTranscriptionClient({
      url: "wss://example.test",
      createSocket: () => socket,
    });
    const onFlush = jest.fn();
    const unsubscribe = client.subscribeFlush(onFlush);

    const connectPromise = client.connect();
    socket.open();
    await connectPromise;

    socket.message(JSON.stringify({ type: "flushed" }));

    expect(onFlush).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
