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
- Functional rich text formatting beyond Undo/Restore and inline image attachments (the toolbar shows coming-soon controls only).

## Architecture
- `components/application/conversation-pane.tsx` hosts the full experience.
- `components/application/conversation-sidebar.tsx` renders local history navigation.
- Hooks: `use-voice-capture` for mic capture, `use-tts-playback` for audio.
- `hooks/use-local-conversations.ts` persists history locally and hydrates the active transcript.
- Chat turns are sent to `/api/chat/turns` for Bolt routing.

## Data Model
- Entries and replies persist locally in IndexedDB; transcripts are encrypted at rest.
- Entry image attachments are stored inside encrypted transcripts with cursor offsets for inline placement.
- The conversation history sent to the server is trimmed to the last 6 messages; the pending turn is sent separately.

## UI/UX Notes
- Push-to-talk mic button toggles between talk and stop; entries finalize on stop.
- The Talk button uses warm sunset colors to signal waiting, listening, paused, and processing states.
- Spacebar toggles start, pause, and resume when focus is not inside a text input.
- Double-tap Spacebar stops capture; the mic button still stops and submits.
- On desktop, a compact hint next to the Talk button reads: "Spacebar - press Space to start, pause, or resume; double-tap Space to stop and send, or use Show text entry." On mobile the journal navbar omits this hint.
- The journal stays silent unless the user issues a direct command.
- Text submissions always add a journal entry; replies require explicit commands.
- Journal entries live in a page-sized stream that stays fixed and scrolls within the pane.
- Entry and reply headers show the saved date and time.
- Each entry includes bottom-right Listen and Intent buttons; Listen stops current audio and speaks the entry, while Intent summarizes the entry's goal and motivation in the user's voice without advice.
- Intent summaries can be saved per entry; saved intents stay visible until deleted.
- Intent summaries include inline citations; hovering or tapping a citation highlights the referenced sentence, paragraph, or image (with described image sources) in the entry.
- The active sentence stays highlighted while audio playback runs or loads the next sentence.
- Journals render as a full-width white canvas with editable text entries (no card styling), a sticky full-width journal navbar with a desktop single row (sidebar toggle + JOURNAL left, centered mic/audio controls, user name + account menu right) that wraps the center controls onto a second row on smaller screens, plus a bottom text entry rail below the stream.
- Audio queue labels and the Stop audio control appear only after playback has been activated at least once.
- Stop audio clears the entire queue.
- Low-confidence transcripts still receive replies; field updates are suppressed server-side.
- The text composer is collapsed by default and revealed via a footer toggle below the stream; the hide control sits next to Send and the composer auto-collapses after submit.
- Replies render Markdown blocks with inline emphasis (bold/italic/inline code).
- User entries are inline-editable in place; focus reveals a compact editor-style toolbar with labeled Undo and Restore controls plus disabled, coming-soon controls for AI Edit, typography, formatting, lists, links, alignment/indentation, and strike/script options. Restore returns the entry to its pre-edit text and attachments.
- Drag-and-drop image attachments insert at the caret and render inline, while entry text remains plain and attachments stay locked in place during edits.
- The layout uses a device-width viewport so the history rail and journal pane stack on small screens.
- Journal pages use a slim journal navbar: the header row anchors the sidebar toggle + JOURNAL label left, centers mic/audio controls, and places the user name + account menu right; on mobile the center controls drop beneath the header row to avoid horizontal scrolling; the marketing nav stays hidden.
- On mobile, the journal entries panel stays tall enough to keep the stream readable.
- On mobile, selecting a past conversation or starting a new journal closes the sidebar to reveal the journal; desktop keeps the sidebar open and persists its open/closed state.
- Each journal renders at `/journals/:id`; the marketing homepage remains `/`, and new journals launch at `/journals/new`.
- Homepage spacebar captures auto-save after transcription, creating the conversation and routing to `/journals/:id`.
- When the active journal has no saved entries, the UI nudges to the `/welcome` guide instead of rendering the tour inline.
- After a new entry is saved, the journal switches to the full-width white canvas view for that conversation.

## API/Integration
- STT: `/api/stt`
- Chat: `/api/chat/turns`
- TTS: `/api/tts`
- Intent: `/api/intent`

## Tests
- `components/application/__tests__/conversation-pane.test.tsx`

## Risks
- Audio and chat race conditions if turns are sent rapidly.
- Long replies delay TTS playback.

## Decisions
- 2024-xx-xx: Persist transcripts locally in IndexedDB with encrypted payloads; no server-side storage.
