# Developer Reference: Voice-First Journal
Version: 3.0
Status: Design Locked - Voice Journal MVP

## 1. Purpose of This Document
This document defines how the voice-first journal behaves, why it behaves that way, and what constraints engineers must respect when building or extending the system.

It exists to:
- Align product, design, and engineering on the voice-first journal scope.
- Preserve predictable audio behavior and accessibility.
- Prevent silent UX regressions.
- Serve as the authoritative behavioral and technical reference.

If a decision is not permitted here, it should be challenged.

## 2. Product Principles (Non-Negotiable)
1) Voice is the primary interface; the text composer lives behind a secondary toggle for direct typed commands.
2) Transcripts are always visible as journal entries.
3) The journal stays quiet unless explicitly asked with a direct, unambiguous command.
4) Replies are generated only after transcription completes.
5) When a reply is requested, it renders as text and spoken audio.
6) Push-to-talk keeps intent explicit and low risk.
7) Errors must degrade to text-only, never block capture.
8) Predictability beats automation.

Violating these principles is a product bug.

## 3. Target User
- Students and learners who benefit from hands-free journaling.
- Users who want to capture thoughts aloud but read replies at their own pace.
- Accessibility-first users who rely on voice input/output.

## 4. Core Experience

### 4.1 Voice Turn (Push-to-Talk)
- User presses the mic to start recording.
- Spacebar toggles start, pause, and resume when focus is not inside a text input.
- Double-tap Spacebar stops capture; the mic button still stops and submits.
- User taps the mic again to finish; audio is sent to STT.
- Transcript appears as a single-paragraph journal entry.
- After transcription completes, the journal responds only if the transcript contains an explicit, direct command.
- When a reply is requested, it renders as text and is spoken aloud.

### 4.2 Text Turns
- The text composer is hidden by default and revealed in the sticky top controls above the journal stream; it auto-collapses after send.
- Submitting text always adds a journal entry to the stream.
- Replies are only requested when the text includes an explicit, direct command.
- Voice capture remains the primary workflow.

### 4.3 Audio Playback Rules
- Replies are spoken by default when requested.
- TTS failures fall back to text-only without blocking capture.
- Users can stop playback; stopping clears the queue.

## 5. Architecture Overview
The system is a three-hop pipeline:
1) Voice capture (client) -> STT (server) -> chat -> TTS.
2) All third-party calls happen in server routes.
3) Conversation history is stored locally in the browser only (IndexedDB) and is never persisted server-side.

### 5.1 Local-First History (Tier 1)
- Conversations are persisted automatically in IndexedDB without prompts.
- Transcripts are encrypted at rest using AES-GCM; a local master key is generated on first run.
- A plaintext conversation index (title + preview) is stored for fast navigation and search.
- Export/import is user-initiated; export can include encrypted backups and optional plaintext.

## 6. Data Model
- Conversation index items (id, title, preview, updatedAt, pinned, archived) are stored in IndexedDB for navigation.
- Encrypted transcripts are stored separately from the index to keep listing fast.
- Field updates (when returned by the helper) may be persisted per the workflow.
- Audio is ephemeral and never stored.

## 7. Safety and Guardrails

### 7.1 Voice Confidence Threshold
- Voice turns include `transcriptConfidence`.
- If confidence < 0.82:
  - Still invoke the helper and return a reply.
  - Suppress any field updates from the response.
  - Mark `uncertainTranscript: true` for downstream handling.

### 7.2 Error Resilience
- Mic permission failures show inline errors and allow immediate retry.
- STT/TTS failures return 502 errors but do not block capture.
- Chat failures return a placeholder reply; audio playback is still queued.

## 8. UI Behavior and States

### 8.1 Mic States
- `idle`, `recording`, `paused`, `processing`, `ready`, `error`.
- Tapping the mic while recording stops capture and triggers transcription; there is no separate Send control.

### 8.2 Audio Playback States
- `idle`, `loading`, `playing`, `stopped`, `error`.
- Users can stop audio; stop clears the entire queue.
- Starting a new voice recording clears audio.

### 8.3 Transcript and Playback Rules
- All voice turns render as text in the journal pane.
- Voice transcripts are merged into a single paragraph before processing or playback.
- The journal entries pane stays page-sized; the entry stream fills the remaining height and scrolls vertically so entries never resize the pane.
- Past journals render as a full-width white canvas with plain text blocks for entries (no card styling), while the homepage keeps the split card layout.
- Past journals use a sticky header for mic controls and the optional text composer above the stream; the homepage keeps the dedicated voice controls card.
- Replies render Markdown lists, code blocks, and inline emphasis (bold/italic/inline code).
- Spoken audio strips saved-update blocks to stay concise.

### 8.4 Text Entry Visibility
- The text composer is collapsed by default.
- A labeled toggle in the journal header reveals it above the stream; a hide control sits next to Send.
- Text submissions always create a journal entry; the composer auto-collapses after send and replies still require explicit requests.

### 8.5 Keyboard Shortcuts
- Spacebar toggles start, pause, and resume for voice capture.
- Double-tap Spacebar stops capture; the mic button still stops and submits.
- Spacebar shortcuts are ignored when typing in text inputs.

### 8.6 Responsive Layout
- The app sets a device-width viewport so responsive breakpoints stack panes on smaller screens.
- Pages are sized to the dynamic viewport height; scrolling appears only when content exceeds the visible page.
- On desktop, the conversation sidebar is a full-height left rail aligned to the viewport edge with square corners.
- The sidebar is collapsible and defaults to closed; a header toggle reopens it.
- On mobile, selecting a past conversation or starting a new chat closes the sidebar to reveal the journal.
- On mobile, the journal entries panel stays tall enough to keep the stream readable.
- On desktop, the sidebar stays open after selecting history, and its open/closed state persists across sessions.
- The sidebar shows a loading state until local conversation history hydrates on the client.
- Conversation rows show title-only entries (no preview or timestamp) with a simple action menu; pinned and recent chats share the main list, ordered newest to oldest.
- Conversations are created when the first entry is saved; the first entry snippet becomes the title unless renamed, falling back to "Untitled chat" if empty.
- Past journals hide the top navigation bar; the homepage keeps it visible.

### 8.7 First-Run Welcome
### 8.7 New Journal Welcome
- When the active journal has no saved entries and hydration completes, the journal stream shows a welcome panel even if other journals have entries.
- The welcome panel introduces the main controls, feature highlights, and the privacy-first philosophy.
- The panel disappears as soon as the active journal receives its first entry.

### 8.8 Navigation
- The Hey brand link always routes to Home and starts a new chat.

### 8.9 Privacy Sentence
- No standalone privacy sentence appears on the journal surface.

## 9. Tone and Reply Style
- Helpful, calm, and concise.
- No replies unless explicitly asked.
- Does not override the chat guardrails or safety checks.

## 10. Configuration
Required:
- `GROQ_API_KEY` for STT.
- `ELEVENLABS_API_KEY` for TTS.

Optional:
- `ELEVENLABS_VOICE_ID` (default: pNInz6obpgDQGcFmaJgB).
- `ELEVENLABS_TTS_MODEL` (default: eleven_multilingual_v2).

## 11. Out of Scope (MVP)
- Streaming TTS to the client.
- Passphrase-protected encryption (Tier 2).
- Encrypted index fields (title/preview).
- Full-text search across transcripts.
- Rich text composer features (attachments, formatting controls).
- Complex NLP-based intent detection.
