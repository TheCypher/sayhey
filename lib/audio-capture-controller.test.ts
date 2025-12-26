import {
  createAudioCaptureController,
  type AudioCaptureStatus,
} from "./audio-capture-controller";

function createMockStream() {
  const track = { enabled: true, stop: jest.fn() };
  const stream = {
    getTracks: () => [track],
  } as unknown as MediaStream;

  return { stream, track };
}

describe("audio capture controller", () => {
  it("transitions to active after a successful start", async () => {
    const { stream } = createMockStream();
    const getUserMedia = jest.fn().mockResolvedValue(stream);
    const controller = createAudioCaptureController({ getUserMedia });
    const statuses: AudioCaptureStatus[] = [];

    const unsubscribe = controller.subscribe((status) => {
      statuses.push(status);
    });

    await controller.start();

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(controller.getStatus()).toBe("active");
    expect(statuses).toContain("requesting");
    expect(statuses[statuses.length - 1]).toBe("active");

    unsubscribe();
  });

  it("marks status as blocked when access is denied", async () => {
    const getUserMedia = jest.fn().mockRejectedValue(new Error("denied"));
    const controller = createAudioCaptureController({ getUserMedia });

    await controller.start();

    expect(controller.getStatus()).toBe("blocked");
  });

  it("pauses, resumes, and stops the active stream", async () => {
    const { stream, track } = createMockStream();
    const getUserMedia = jest.fn().mockResolvedValue(stream);
    const controller = createAudioCaptureController({ getUserMedia });

    await controller.start();
    expect(controller.getStream()).toBe(stream);
    controller.pause();

    expect(track.enabled).toBe(false);
    expect(controller.getStatus()).toBe("paused");

    controller.resume();
    expect(track.enabled).toBe(true);
    expect(controller.getStatus()).toBe("active");

    controller.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(controller.getStatus()).toBe("stopped");
    expect(controller.getStream()).toBeNull();
  });
});
