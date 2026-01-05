# Voice Capture (Push-to-Talk)

## Overview
- Voice capture layer that records audio in-memory, posts it to STT, and returns transcript + confidence.

## Goals
- Provide a predictable push-to-talk workflow.
- Keep audio ephemeral (no persistence).
- Surface mic states for clear user feedback.
- Gate journal replies to explicit commands.

## Non-Goals
- Streaming audio or live transcription.
- Background recording or wake words.
- Audio persistence or editing.

## Architecture
- `hooks/use-voice-capture.ts` wraps MediaRecorder lifecycle and STT submission.
- The hook exposes `idle`, `recording`, `paused`, `processing`, `ready`, and `error` states.
- `components/application/conversation-pane.tsx` consumes the hook and sends transcripts after capture stops.

## Data Model
- No persistence; transcript lives in client state only.
- Confidence travels with the voice turn to guard low-confidence field updates.

## UI/UX Notes
- Push-to-talk: tap to start, tap again to stop and process.
- Spacebar toggles start, pause, and resume when focus is not inside a text input.
- Double-tap Spacebar stops capture; the mic button still stops and submits.
- Show immediate recording feedback and a processing indicator.
- Use state-based Talk button colors (waiting, listening, paused, processing) to reinforce mic status.
- Errors are inline and do not block voice capture.

## API/Integration
- POST to `/api/stt` with `FormData` key `audio`.
- Response includes `{ transcript, confidence }`.

## Tests
- `hooks/__tests__/use-voice-capture.test.ts` mocks MediaRecorder and verifies state transitions.

## Risks
- Browser support for `audio/webm`.
- Long recordings increase memory usage.

## Open Questions
- Fallback format for non-WebM browsers.

## Decisions
- 2025-12-25: Use a single blob upload on stop for simplicity.
