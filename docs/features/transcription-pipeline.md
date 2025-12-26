# Realtime Transcription Pipeline

> Deprecated for the journal MVP. Replaced by request/response STT in `docs/features/voice-capture.md`.

## Overview
- Low-latency speech-to-text over a realtime transport with a deferred fallback path.

## Goals
- Stream audio over WebSockets to a realtime service for Groq STT.
- Preserve the "silence by default" UX with no AI responses.
- Ensure audio remains ephemeral and is never stored long-term.

## Non-Goals
- AI responses or intent handling (explicit request only, later).
- Wake words or activation commands.
- Audio persistence in the MVP.

## Architecture
- Client transport: `lib/transcription-client.ts` manages WebSocket state and streaming.
- Pipeline orchestration: `lib/transcription-pipeline.ts` with `lib/audio-encoder.ts`.
- MediaStream source: `lib/media-stream-frame-source.ts` produces audio frames.
- Client hook: `hooks/use-transcription-pipeline.ts` wires stream to transport.
- Local stub: `realtime/server.js` for development.
- Realtime session: `realtime/transcription-session.js` chunks PCM audio, queues transcription, and emits segments.
- Transcriber: `realtime/bolt-groq-transcriber.js` uses Bolt Runner to call a Groq STT tool.
- Bolt runtime: `realtime/bolt-runtime.js` initializes the Bolt router and Groq provider.
- Fallback: if realtime fails, capture continues and transcription is deferred on pause or close entry.
- Accuracy: the session reuses a bounded prompt tail from prior segments when invoking STT.

## Data Model
- Transcript segments stored via Prisma in Supabase Postgres.
- Audio is transient and discarded after transcription.

## UI/UX Notes
- No "error" language; failures behave like pause.
- Keep the user informed via listening state, not system prompts.
- Do not surface live segments during capture; display transcripts after pause or close entry.
- Send a flush control message on pause or close entry so buffered audio is transcribed.
- Segments stream back to the client as `{ type: "segment", segment: { id, sequence, text, startedAt } }`.
- Flush acknowledgements stream back as `{ type: "flushed" }`.

## API/Integration
- WebSocket transport (realtime service, not in Next.js runtime).
- Groq STT for realtime transcription (invoked via Bolt tool execution).
- Client URL via `NEXT_PUBLIC_TRANSCRIPTION_WS_URL`.
- Local stub uses `ws` on `REALTIME_PORT`.
- Realtime service loads `.env`/`.env.local` on startup.
- Bolt router via `@bolt-ai/core` with Groq provider (`@bolt-ai/providers-groq`) and `BOLT_PRESET`.
- Groq STT via `GROQ_API_KEY`, `GROQ_STT_MODEL`, and optional `GROQ_STT_ENDPOINT`.
- Segment sizing via `REALTIME_SEGMENT_MS` and `REALTIME_SAMPLE_RATE`.
- Prompt context length via `REALTIME_PROMPT_CHARS`.

## Tests
- `lib/transcription-client.test.ts` covers WebSocket state transitions.
- `lib/transcription-pipeline.test.ts` validates pipeline orchestration.
- `lib/audio-encoder.test.ts` validates PCM encoding.
- `realtime/bolt-groq-transcriber.test.js` validates Bolt runner invocation and Groq STT calls.
- `realtime/pcm-wav.test.js` validates WAV encoding.
- `realtime/transcription-session.test.js` validates chunking and segment emission.

## Risks
- Realtime transport availability across platforms.
- Latency spikes that could erode trust.

## Open Questions
- Chunk size and send interval for audio frames.
- How to represent deferred transcription progress in the UI.

## Decisions
- 2025-12-25: Use WebSocket transport and Groq STT with a deferred fallback path.
