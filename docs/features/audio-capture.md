# Audio Capture (Client)

> Deprecated: replaced by push-to-talk capture in `docs/features/voice-capture.md`.

## Overview
- Client-side microphone capture that drives the listening UI without storing audio.

## Goals
- Request microphone access only when the user taps to speak.
- Keep UI state in sync with actual capture status.
- Avoid error language and keep failure behavior calm.

## Non-Goals
- Streaming audio to the backend (deferred).
- On-device transcription or AI responses.
- Persisting any audio data.

## Architecture
- `lib/audio-capture-controller.ts` manages MediaStream lifecycle.
- `hooks/use-audio-capture.ts` exposes status, stream, and controls to the UI.
- `components/voice-capture.tsx` maps capture status to UI copy.
- Audio streaming to STT is handled separately in `docs/features/transcription-pipeline.md`.

## Data Model
- None; audio is ephemeral and not stored.

## UI/UX Notes
- No wake words or activation commands.
- If access is blocked, show a calm prompt without "error" language.
- Required labels remain unchanged (Tap to speak, Listening..., Pause, Continue entry, Close entry).

## API/Integration
- Browser MediaStream API for microphone access.

## Tests
- `lib/audio-capture-controller.test.ts` covers capture lifecycle transitions.
- `components/voice-capture.test.tsx` covers blocked-state messaging.

## Risks
- Permissions denial could feel like a silent failure without the prompt.
- Browser API differences across platforms.

## Open Questions
- Whether to add long-silence auto-pause detection before backend streaming.

## Decisions
- 2025-12-25: Keep capture local-only and map capture status to UI state.
