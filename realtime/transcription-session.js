const { buildWavBuffer } = require("./pcm-wav");

function createTranscriptionSession({
  socket,
  transcriber,
  sampleRate = 48000,
  segmentDurationMs = 2000,
  promptMaxChars = 240,
} = {}) {
  let buffer = Buffer.alloc(0);
  let sequence = 0;
  let promptTail = "";
  let pending = Promise.resolve();
  let currentSampleRate = sampleRate;
  let currentSegmentMs = segmentDurationMs;
  const resolvedPromptMax = Number.isFinite(promptMaxChars)
    ? promptMaxChars
    : 0;

  const computeSegmentBytes = () => {
    const bytesPerSecond = currentSampleRate * 2;
    return Math.max(1, Math.floor((bytesPerSecond * currentSegmentMs) / 1000));
  };

  const enqueue = (task) => {
    pending = pending.then(task).catch(() => {});
    return pending;
  };

  const handleConfig = (payload) => {
    if (typeof payload.sampleRate === "number" && payload.sampleRate > 0) {
      currentSampleRate = payload.sampleRate;
    }
    if (
      typeof payload.segmentDurationMs === "number" &&
      payload.segmentDurationMs > 0
    ) {
      currentSegmentMs = payload.segmentDurationMs;
    }
  };

  const updatePrompt = (text) => {
    if (!resolvedPromptMax || !text) {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const combined = promptTail ? `${promptTail} ${trimmed}` : trimmed;
    promptTail =
      combined.length > resolvedPromptMax
        ? combined.slice(-resolvedPromptMax)
        : combined;
  };

  const sendSegment = (text) => {
    if (!text || !text.trim()) {
      return;
    }
    sequence += 1;
    const segment = {
      id: `seg-${Date.now()}-${sequence}`,
      sequence,
      text,
      startedAt: new Date().toISOString(),
    };
    socket.send(JSON.stringify({ type: "segment", segment }));
    updatePrompt(text);
  };

  const transcribeChunk = async (pcmChunk) => {
    const wavBuffer = buildWavBuffer(pcmChunk, currentSampleRate, 1);
    const prompt = resolvedPromptMax > 0 ? promptTail : "";
    const text = await transcriber.transcribe(
      wavBuffer,
      prompt ? { prompt } : undefined
    );
    sendSegment(text);
  };

  const appendAudio = async (pcmBuffer) => {
    buffer = Buffer.concat([buffer, pcmBuffer]);
    const segmentBytes = computeSegmentBytes();

    while (buffer.length >= segmentBytes) {
      const chunk = buffer.subarray(0, segmentBytes);
      buffer = buffer.subarray(segmentBytes);
      await transcribeChunk(chunk);
    }
  };

  const flushBuffer = async () => {
    if (buffer.length === 0) {
      return;
    }
    const pcmBuffer = buffer;
    buffer = Buffer.alloc(0);
    await transcribeChunk(pcmBuffer);
  };

  const flush = () => enqueue(flushBuffer);

  const handleFlush = () =>
    enqueue(async () => {
      await flushBuffer();
      socket.send(JSON.stringify({ type: "flushed" }));
    });

  const handleMessage = (data, isBinary) => {
    if (isBinary || Buffer.isBuffer(data)) {
      const pcmBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      return enqueue(() => appendAudio(pcmBuffer));
    }

    if (typeof data === "string") {
      try {
        const payload = JSON.parse(data);
        if (payload?.type === "config") {
          return enqueue(() => handleConfig(payload));
        }
        if (payload?.type === "flush") {
          return handleFlush();
        }
      } catch {
        // Ignore malformed control payloads.
      }
    }

    return Promise.resolve();
  };

  return {
    handleMessage,
    flush,
    getSampleRate: () => currentSampleRate,
  };
}

module.exports = { createTranscriptionSession };
