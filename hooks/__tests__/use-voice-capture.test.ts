import { createVoiceCaptureController } from "@/hooks/use-voice-capture";

const createStream = (trackStop: jest.Mock) =>
  ({
    getTracks: () => [{ stop: trackStop }],
  }) as unknown as MediaStream;

class FakeMediaRecorder {
  stream: MediaStream;
  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(stream: MediaStream) {
    this.stream = stream;
  }

  start() {
    this.state = "recording";
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    const blob = new Blob(["voice"], { type: "audio/webm" });
    this.ondataavailable?.({ data: blob });
    this.onstop?.();
  }
}

describe("createVoiceCaptureController", () => {
  it("captures audio and returns transcript on stop", async () => {
    const trackStop = jest.fn();
    const getUserMedia = jest.fn().mockResolvedValue(createStream(trackStop));
    const transcribeAudio = jest
      .fn()
      .mockResolvedValue({ transcript: "Hello there", confidence: 0.93 });

    const controller = createVoiceCaptureController({
      getUserMedia,
      mediaRecorderFactory: (stream) => new FakeMediaRecorder(stream),
      transcribeAudio,
    });

    await controller.start();
    await controller.stop();

    const snapshot = controller.getSnapshot();
    expect(snapshot.status).toBe("ready");
    expect(snapshot.transcript).toBe("Hello there");
    expect(snapshot.confidence).toBe(0.93);
    expect(trackStop).toHaveBeenCalled();
  });

  it("pauses and resumes without ending the capture", async () => {
    const getUserMedia = jest.fn().mockResolvedValue(createStream(jest.fn()));
    const transcribeAudio = jest
      .fn()
      .mockResolvedValue({ transcript: "Full entry", confidence: 0.91 });

    const controller = createVoiceCaptureController({
      getUserMedia,
      mediaRecorderFactory: (stream) => new FakeMediaRecorder(stream),
      transcribeAudio,
    });

    await controller.start();
    controller.pause();
    expect(controller.getSnapshot().status).toBe("paused");

    controller.resume();
    expect(controller.getSnapshot().status).toBe("recording");

    await controller.stop();

    const snapshot = controller.getSnapshot();
    expect(snapshot.status).toBe("ready");
    expect(snapshot.transcript).toBe("Full entry");
  });

  it("surfaces mic failures as error state", async () => {
    const getUserMedia = jest
      .fn()
      .mockRejectedValue(new Error("mic blocked"));

    const controller = createVoiceCaptureController({
      getUserMedia,
      mediaRecorderFactory: (stream) => new FakeMediaRecorder(stream),
      transcribeAudio: jest.fn(),
    });

    await controller.start();

    const snapshot = controller.getSnapshot();
    expect(snapshot.status).toBe("error");
    expect(snapshot.error).toContain("mic blocked");
  });

  it("resets transcript state back to idle", async () => {
    const getUserMedia = jest.fn().mockResolvedValue(createStream(jest.fn()));
    const transcribeAudio = jest
      .fn()
      .mockResolvedValue({ transcript: "Reset me", confidence: 0.81 });

    const controller = createVoiceCaptureController({
      getUserMedia,
      mediaRecorderFactory: (stream) => new FakeMediaRecorder(stream),
      transcribeAudio,
    });

    await controller.start();
    await controller.stop();
    controller.reset();

    const snapshot = controller.getSnapshot();
    expect(snapshot.status).toBe("idle");
    expect(snapshot.transcript).toBe("");
  });
});
