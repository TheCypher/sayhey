# Realtime Transcription Service (Local Stub)

Purpose: local WebSocket stub for development while the full STT service is built.

The server loads `.env` and `.env.local` on startup.

## Run
```bash
node realtime/server.js
```

## Env
```bash
REALTIME_PORT=4001
REALTIME_SEGMENT_MS=2000
REALTIME_SAMPLE_RATE=48000
REALTIME_PROMPT_CHARS=240
NEXT_PUBLIC_TRANSCRIPTION_WS_URL=ws://localhost:4001
BOLT_PRESET=fast
GROQ_API_KEY=...
GROQ_STT_MODEL=whisper-large-v3
GROQ_STT_LANGUAGE=en
GROQ_STT_ENDPOINT=https://api.groq.com/openai/v1/audio/transcriptions
```
