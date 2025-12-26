const { loadRealtimeEnv } = require("./env-loader");
const { WebSocketServer } = require("ws");
const { createBoltGroqTranscriber } = require("./bolt-groq-transcriber");
const { createTranscriptionSession } = require("./transcription-session");

loadRealtimeEnv();

const port = Number.parseInt(process.env.REALTIME_PORT || "4001", 10);
const segmentDurationMs = Number.parseInt(
  process.env.REALTIME_SEGMENT_MS || "2000",
  10
);
const defaultSampleRate = Number.parseInt(
  process.env.REALTIME_SAMPLE_RATE || "48000",
  10
);
const promptMaxChars = Number.parseInt(
  process.env.REALTIME_PROMPT_CHARS || "240",
  10
);

let transcriber;
try {
  transcriber = createBoltGroqTranscriber();
} catch (error) {
  console.error("Transcriber unavailable:", error.message);
  process.exit(1);
}

const server = new WebSocketServer({ port });

server.on("connection", (socket) => {
  const session = createTranscriptionSession({
    socket,
    transcriber,
    sampleRate: defaultSampleRate,
    segmentDurationMs,
    promptMaxChars: Number.isFinite(promptMaxChars) ? promptMaxChars : 0,
  });

  socket.on("message", (data, isBinary) => {
    void session.handleMessage(data, isBinary);
  });

  socket.on("close", () => {
    void session.flush();
  });
});

console.log(`Realtime server listening on ws://localhost:${port}`);
