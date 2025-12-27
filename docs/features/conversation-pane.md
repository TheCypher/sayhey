# Journal Pane

## Overview
- The primary journal surface that combines voice capture, transcript display, and spoken replies.

## Goals
- Keep voice capture and replies in one predictable flow.
- Always render transcripts as journal entries.
- Speak replies by default when requested.
- Respond only to explicit, direct commands; text entries still land in the journal.

## Non-Goals
- Server-side transcript storage.
- Streaming transcripts in real time.
- Rich text composer features (attachments, formatting controls).

## Architecture
- `components/application/conversation-pane.tsx` hosts the full experience.
- `components/application/conversation-sidebar.tsx` renders local history navigation.
- Hooks: `use-voice-capture` for mic capture, `use-tts-playback` for audio.
- `hooks/use-local-conversations.ts` persists history locally and hydrates the active transcript.
- Chat turns are sent to `/api/chat/turns` for Bolt routing.

## Data Model
- Entries and replies persist locally in IndexedDB; transcripts are encrypted at rest.
- The conversation history sent to the server is trimmed to the last 6 messages; the pending turn is sent separately.

## UI/UX Notes
- Push-to-talk mic button toggles between talk and stop; entries finalize on stop.
- Spacebar toggles start, pause, and resume when focus is not inside a text input.
- Double-tap Spacebar stops capture; the mic button still stops and submits.
- The journal stays silent unless the user issues a direct command.
- Text submissions always add a journal entry; replies require explicit commands.
- Journal entries live in a page-sized stream that stays fixed and scrolls within the pane.
- Stop audio clears the entire queue.
- Low-confidence transcripts still receive replies; field updates are suppressed server-side.
- The text composer is collapsed by default and revealed via a header toggle; the hide control sits next to Send and the composer auto-collapses after submit.
- Replies render Markdown blocks with inline emphasis (bold/italic/inline code).
- The layout uses a device-width viewport so the history, voice controls, and journal panes stack on small screens.
- On mobile, selecting a past conversation or starting a new chat closes the sidebar to reveal the journal; desktop keeps the sidebar open and persists its open/closed state.

## API/Integration
- STT: `/api/stt`
- Chat: `/api/chat/turns`
- TTS: `/api/tts`

## Tests
- `components/application/__tests__/conversation-pane.test.tsx`

## Risks
- Audio and chat race conditions if turns are sent rapidly.
- Long replies delay TTS playback.

## Decisions
- 2024-xx-xx: Persist transcripts locally in IndexedDB with encrypted payloads; no server-side storage.
