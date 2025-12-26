import { createTtsPlaybackController } from "@/hooks/use-tts-playback";

type MockAudio = {
  play: jest.Mock;
  pause: jest.Mock;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
};

const createMockAudio = (): MockAudio => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  onended: null,
  onerror: null,
  src: "",
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createTtsPlaybackController", () => {
  it("queues audio and advances on end", async () => {
    const audio = createMockAudio();
    const synthesizeSpeech = jest
      .fn()
      .mockResolvedValue(new ArrayBuffer(4));
    const createObjectUrl = jest.fn().mockReturnValue("blob:audio");
    const revokeObjectUrl = jest.fn();

    const controller = createTtsPlaybackController({
      synthesizeSpeech,
      audioFactory: () => audio,
      createObjectUrl,
      revokeObjectUrl,
    });

    controller.enqueue("Speak this");
    await tick();

    expect(controller.getSnapshot().status).toBe("playing");
    expect(audio.play).toHaveBeenCalled();

    audio.onended?.();

    expect(controller.getSnapshot().status).toBe("idle");
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:audio");
  });

  it("clears the queue and stops audio", async () => {
    const audio = createMockAudio();
    const controller = createTtsPlaybackController({
      synthesizeSpeech: jest.fn().mockResolvedValue(new ArrayBuffer(2)),
      audioFactory: () => audio,
      createObjectUrl: jest.fn().mockReturnValue("blob:audio"),
      revokeObjectUrl: jest.fn(),
    });

    controller.enqueue("Stop me");
    await tick();

    controller.clear();

    const snapshot = controller.getSnapshot();
    expect(snapshot.status).toBe("stopped");
    expect(audio.pause).toHaveBeenCalled();
  });
});
