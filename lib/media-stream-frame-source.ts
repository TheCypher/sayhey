import { type AudioFrameSource } from "./transcription-pipeline";

type MediaStreamFrameSourceOptions = {
  bufferSize?: number;
  channel?: number;
};

export function createMediaStreamFrameSource(
  stream: MediaStream,
  options: MediaStreamFrameSourceOptions = {}
): AudioFrameSource {
  const listeners = new Set<(frame: Float32Array) => void>();
  const bufferSize = options.bufferSize ?? 4096;
  const channel = options.channel ?? 0;

  let audioContext: AudioContext | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let processorNode: ScriptProcessorNode | null = null;
  let gainNode: GainNode | null = null;

  const start = () => {
    if (audioContext) {
      return;
    }

    const AudioContextCtor =
      typeof window !== "undefined"
        ? window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;

    if (!AudioContextCtor) {
      return;
    }

    audioContext = new AudioContextCtor();
    sourceNode = audioContext.createMediaStreamSource(stream);
    processorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
    gainNode = audioContext.createGain();
    gainNode.gain.value = 0;

    processorNode.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(channel);
      const frame = new Float32Array(input.length);
      frame.set(input);
      listeners.forEach((listener) => listener(frame));
    };

    sourceNode.connect(processorNode);
    processorNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    void audioContext.resume();
  };

  const stop = () => {
    processorNode?.disconnect();
    sourceNode?.disconnect();
    gainNode?.disconnect();
    processorNode = null;
    sourceNode = null;
    gainNode = null;
    if (audioContext) {
      void audioContext.close();
      audioContext = null;
    }
  };

  const subscribe = (listener: (frame: Float32Array) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const getSampleRate = () => audioContext?.sampleRate ?? null;

  return { subscribe, start, stop, getSampleRate };
}
