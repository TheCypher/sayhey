import { createTtsPlaybackController } from "@/hooks/use-tts-playback";

type MockAudio = {
  play: jest.Mock;
  pause: jest.Mock;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
  ended?: boolean;
  currentTime?: number;
  duration?: number;
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

    const playingSnapshot = controller.getSnapshot();
    expect(playingSnapshot.status).toBe("playing");
    expect(playingSnapshot.currentItem?.text).toBe("Speak this");
    expect(audio.play).toHaveBeenCalled();

    audio.onended?.();

    const idleSnapshot = controller.getSnapshot();
    expect(idleSnapshot.status).toBe("idle");
    expect(idleSnapshot.currentItem).toBeNull();
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
    expect(snapshot.currentItem).toBeNull();
    expect(audio.pause).toHaveBeenCalled();
  });

  it("plays enqueued items sequentially without overlapping starts", async () => {
    const audioInstances: MockAudio[] = [];
    const synthesizeSpeech = jest
      .fn()
      .mockResolvedValue(new ArrayBuffer(4));

    const controller = createTtsPlaybackController({
      synthesizeSpeech,
      audioFactory: () => {
        const audio = createMockAudio();
        audioInstances.push(audio);
        return audio;
      },
      createObjectUrl: jest.fn().mockReturnValue("blob:audio"),
      revokeObjectUrl: jest.fn(),
    });

    controller.enqueue({ id: "tts-1", text: "First" });
    controller.enqueue({ id: "tts-2", text: "Second" });
    await tick();

    expect(audioInstances).toHaveLength(1);
    expect(controller.getSnapshot().currentItem?.id).toBe("tts-1");

    audioInstances[0].onended?.();
    await tick();

    expect(audioInstances).toHaveLength(2);
    expect(controller.getSnapshot().currentItem?.id).toBe("tts-2");
  });

  it("advances when ended is detected without an ended event", async () => {
    jest.useFakeTimers();
    const audioInstances: MockAudio[] = [];
    const synthesizeSpeech = jest
      .fn()
      .mockResolvedValue(new ArrayBuffer(4));

    const controller = createTtsPlaybackController({
      synthesizeSpeech,
      audioFactory: () => {
        const audio = {
          ...createMockAudio(),
          ended: false,
          currentTime: 0,
          duration: 1,
        };
        audioInstances.push(audio);
        return audio;
      },
      createObjectUrl: jest.fn().mockReturnValue("blob:audio"),
      revokeObjectUrl: jest.fn(),
    });

    controller.enqueue({ id: "tts-1", text: "First" });
    controller.enqueue({ id: "tts-2", text: "Second" });

    await Promise.resolve();

    expect(controller.getSnapshot().currentItem?.id).toBe("tts-1");

    audioInstances[0].ended = true;
    audioInstances[0].currentTime = 1;

    jest.advanceTimersByTime(250);
    await Promise.resolve();

    expect(controller.getSnapshot().currentItem?.id).toBe("tts-2");
    jest.useRealTimers();
  });
});
