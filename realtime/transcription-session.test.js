const { createTranscriptionSession } = require("./transcription-session");

function createSocket() {
  return {
    send: jest.fn(),
  };
}

describe("transcription session", () => {
  it("transcribes audio chunks and sends segments", async () => {
    const socket = createSocket();
    const transcriber = {
      transcribe: jest.fn().mockResolvedValue("hello world"),
    };
    const session = createTranscriptionSession({
      socket,
      transcriber,
      sampleRate: 1000,
      segmentDurationMs: 10,
    });

    const audio = Buffer.alloc(20);
    await session.handleMessage(audio, true);

    expect(transcriber.transcribe).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(socket.send.mock.calls[0][0]);
    expect(payload.type).toBe("segment");
    expect(payload.segment.text).toBe("hello world");
  });

  it("flushes buffered audio and acknowledges flush requests", async () => {
    const socket = createSocket();
    const transcriber = {
      transcribe: jest.fn().mockResolvedValue("hello"),
    };
    const session = createTranscriptionSession({
      socket,
      transcriber,
      sampleRate: 1000,
      segmentDurationMs: 1000,
    });

    await session.handleMessage(Buffer.alloc(10), true);

    expect(transcriber.transcribe).not.toHaveBeenCalled();

    await session.handleMessage(JSON.stringify({ type: "flush" }), false);

    expect(transcriber.transcribe).toHaveBeenCalledTimes(1);

    const payloads = socket.send.mock.calls.map(([payload]) =>
      JSON.parse(payload)
    );
    expect(payloads.some((payload) => payload.type === "segment")).toBe(true);
    expect(payloads.some((payload) => payload.type === "flushed")).toBe(true);
  });

  it("queues chunks and reuses prior transcript as prompt", async () => {
    const socket = createSocket();
    let resolveFirst;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const transcriber = {
      transcribe: jest
        .fn()
        .mockImplementationOnce(() => firstPromise)
        .mockResolvedValueOnce("follow up"),
    };
    const session = createTranscriptionSession({
      socket,
      transcriber,
      sampleRate: 1,
      segmentDurationMs: 1000,
      promptMaxChars: 200,
    });

    const audio = Buffer.alloc(2);
    const first = session.handleMessage(audio, true);
    const second = session.handleMessage(audio, true);

    resolveFirst("hello");

    await Promise.all([first, second]);

    expect(transcriber.transcribe).toHaveBeenNthCalledWith(
      1,
      expect.any(Buffer),
      undefined
    );
    expect(transcriber.transcribe).toHaveBeenNthCalledWith(
      2,
      expect.any(Buffer),
      { prompt: "hello" }
    );
  });

  it("updates sample rate from config messages", async () => {
    const socket = createSocket();
    const transcriber = {
      transcribe: jest.fn().mockResolvedValue("ok"),
    };
    const session = createTranscriptionSession({
      socket,
      transcriber,
      sampleRate: 16000,
      segmentDurationMs: 10,
    });

    await session.handleMessage(
      JSON.stringify({ type: "config", sampleRate: 8000 }),
      false
    );

    expect(session.getSampleRate()).toBe(8000);
  });
});
