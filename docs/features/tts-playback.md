# TTS Playback

## Overview
- Queue-based audio playback for journal replies via ElevenLabs.

## Goals
- Speak replies by default when requested.
- Prevent overlapping audio with a single playback queue.
- Provide clear stop/clear controls.

## Non-Goals
- Streaming audio to the client.

## Architecture
- `hooks/use-tts-playback.ts` handles queueing, synthesis, and playback.
- `components/application/conversation-pane.tsx` enqueues every reply for playback.

## Data Model
- No persistence; queue lives in memory only.

## UI/UX Notes
- Playback states: `idle`, `loading`, `playing`, `stopped`, `error`.
- Stop control clears the entire queue.

## API/Integration
- POST `/api/tts` with `{ text }` JSON body.
- Response is `audio/mpeg` bytes.

## Tests
- `hooks/__tests__/use-tts-playback.test.ts` covers queue behavior and stop handling.

## Risks
- Long replies increase latency before playback.
- Users may stack queues if they speak quickly.

## Decisions
- 2025-12-25: Use a sequential queue with single audio element.
