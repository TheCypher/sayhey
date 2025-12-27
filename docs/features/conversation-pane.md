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
- Entry and reply headers show the saved date and time.
- Each entry includes a bottom-right Listen button that stops current audio and speaks the entry.
- Past journals render as a full-width white canvas with plain text entries (no card styling), while the homepage keeps the split card layout.
- Past journals use a sticky header for mic controls and the optional text composer above the stream; the homepage keeps the dedicated voice controls card.
- Stop audio clears the entire queue.
- Low-confidence transcripts still receive replies; field updates are suppressed server-side.
- The text composer is collapsed by default and revealed via a header toggle above the stream; the hide control sits next to Send and the composer auto-collapses after submit.
- Replies render Markdown blocks with inline emphasis (bold/italic/inline code).
- The layout uses a device-width viewport so the history rail and journal pane stack on small screens.
- Past journals hide the top navigation bar; the homepage keeps it visible.
- On mobile, the journal entries panel stays tall enough to keep the stream readable.
- On mobile, selecting a past conversation or starting a new journal closes the sidebar to reveal the journal; desktop keeps the sidebar open and persists its open/closed state.
- When the active journal has no saved entries after history hydration, the journal stream renders a welcome tour even if other journals have entries.

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
