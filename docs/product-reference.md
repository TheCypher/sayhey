# Developer Reference: Voice-First Journal
Version: 3.2
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
- Transcript appears as an inline-editable journal entry.
- After transcription completes, the journal responds only if the transcript contains an explicit, direct command.
- When a reply is requested, it renders as text and is spoken aloud.

### 4.2 Text Turns
- The text composer is hidden by default and revealed in the bottom text entry rail below the journal stream; it auto-collapses after send.
- Submitting text always adds a journal entry to the stream.
- Replies are only requested when the text includes an explicit, direct command.
- Voice capture remains the primary workflow.

### 4.3 Audio Playback Rules
- Replies are spoken by default when requested.
- TTS failures fall back to text-only without blocking capture.
- Users can stop playback; stopping clears the queue.
- Each journal entry includes a Listen control at the bottom right; using it stops current audio and speaks that entry.
- Each journal entry includes an Intent control at the bottom right; it returns a short, first-person interpretation of the entry's goal and motivation without advice, with citations that highlight the referenced entry sentence, paragraph, or attachment on hover or tap.
- Intent summaries can be saved per entry to avoid regeneration; saved intents render inline with a delete control.

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

### 5.2 Authentication (Magic Link)
- Authentication is passwordless and email-only; users request a magic link at `/auth`.
- Magic links are single-use, short-lived (10-15 minutes), and stored as hashed tokens.
- Clicking a magic link signs the user in immediately and redirects to `/`.
- Sign-in sets an HttpOnly session cookie.
- Invalid, expired, or reused links return a safe redirect to `/auth` with generic error messaging.
- Auth emails include only the sign-in link (no verification code).
- New emails with pending onboarding are routed to `/onboarding` after sign-in; returning users stay on `/`.
- Onboarding captures terms acceptance, usage intent, plan preference, consent to improve, and a display name, then marks onboarding complete.
- Onboarding steps allow users to move backward to adjust earlier choices before finishing.
- Onboarding completion routes users to `/`.
- Email delivery uses Mailtrap in development; auth emails never expose raw secrets.

## 6. Data Model
- Conversation index items (id, title, preview, updatedAt, pinned, archived) are stored in IndexedDB for navigation.
- Encrypted transcripts are stored separately from the index to keep listing fast.
- Entry attachments (images) are stored inside encrypted transcripts with cursor offsets so they can be reinserted inline while text stays plain.
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
- The Talk button color maps to mic state: waiting (warm sand), listening (sunset ember), paused (amber), processing (clay); journal pages use the warm sunset palette while the homepage uses green brand accents for the same state mapping.

### 8.2 Audio Playback States
- `idle`, `loading`, `playing`, `stopped`, `error`.
- Users can stop audio; stop clears the entire queue.
- Starting a new voice recording clears audio.

### 8.3 Transcript and Playback Rules
- All voice turns render as text in the journal pane.
- Voice transcripts are merged into a single paragraph before processing or playback.
- The journal entries pane stays page-sized; the entry stream fills the remaining height and scrolls vertically so entries never resize the pane.
- Entry and reply headers show the saved date and time.
- Entry cards include bottom-right Listen and Intent controls; Listen plays the entry aloud and Intent summarizes goal and motivation in the user's voice without advice.
- Saved intent summaries remain visible on the entry until deleted by the user.
- Intent summaries render inline citations that highlight the referenced sentence, paragraph, or attachment in the entry on hover or tap.
- While audio plays or prepares the next sentence, the active sentence stays highlighted in the active entry or reply and advances as playback progresses; it clears when playback stops or errors.
- Sentence highlighting uses native sentence segmentation when available and preserves sentence boundaries around closing quotes or brackets.
- Journals render as a full-width white canvas with editable text blocks for entries (no card styling), a sticky full-width journal navbar with a desktop single row (sidebar toggle + JOURNAL left, centered mic/audio controls, user name + account menu right) that wraps the center controls onto a second row on smaller screens, plus a bottom text entry rail below the stream.
- The journal footer divider aligns with the text entry rail width.
- Audio queue labels and the Stop audio control appear only after audio playback has been activated at least once.
- Replies render Markdown lists, code blocks, and inline emphasis (bold/italic/inline code).
- Spoken audio strips saved-update blocks to stay concise.
- User entries are inline-editable in place; focusing an entry reveals a compact editor-style toolbar with labeled Undo and Restore controls, and edits save locally on blur while keeping the same presentation (Restore returns the entry to its pre-edit text and attachments).
- Drag-and-drop image attachments insert at the caret and render inline with the text; attachments stay locked in place during editing and metadata stores cursor offsets to rehydrate placement.

### 8.4 Text Entry Visibility
- The text composer is collapsed by default.
- A labeled toggle in the journal footer reveals it below the stream; a hide control sits next to Send.
- The footer instructions are bolded and the Show text entry toggle is visually emphasized; on mobile, the instruction bar collapses to only the Show text entry button.
- Text submissions always create a journal entry; the composer auto-collapses after send and replies still require explicit requests.

### 8.5 Keyboard Shortcuts
- Spacebar toggles start, pause, and resume for voice capture.
- Double-tap Spacebar stops capture; the mic button still stops and submits.
- Spacebar shortcuts are ignored when typing in text inputs.
- On desktop, a compact hint next to the Talk button reads: "Spacebar - press Space to start, pause, or resume; double-tap Space to stop and send, or use Show text entry." On mobile the navbar omits this hint.

### 8.6 Responsive Layout
- The app sets a device-width viewport so responsive breakpoints stack panes on smaller screens.
- Pages are sized to the dynamic viewport height; scrolling appears only when content exceeds the visible page.
- On desktop, the conversation sidebar is a full-height left rail aligned to the viewport edge with square corners.
- The sidebar is collapsible and defaults to open on desktop while staying closed on mobile; a header toggle reopens it when hidden.
- On mobile, selecting a past conversation closes the sidebar; tapping New Journal closes it and routes to `/` to start fresh.
- On mobile, the journal entries panel stays tall enough to keep the stream readable.
- On mobile, scrolling down hides the footer instruction bar and scrolling up reveals it.
- On desktop, the sidebar stays open after selecting history, and its open/closed state persists across sessions.
- The sidebar shows a loading state until local conversation history hydrates on the client.
- Conversation rows show title-only entries with the updated timestamp beneath the title in smaller type; titles truncate to 30 characters, no previews, and a simple action menu; pinned and recent chats share the main list, ordered newest to oldest.
- Conversations are created when the first entry is saved; the first entry snippet becomes the title unless renamed, falling back to "Untitled chat" if empty.
- After a new entry is saved, the journal switches to the full-width white canvas view for that conversation.
- Journal pages use a slim journal navbar: the header row anchors the sidebar toggle + JOURNAL label left, centers mic/audio controls, and places the user name + account menu right; on mobile the center controls drop beneath the header row to avoid horizontal scrolling; the marketing nav stays hidden.

### 8.7 First-Run Welcome
### 8.7 New Journal Welcome
- A dedicated welcome page at `/welcome` introduces the main controls, feature highlights, and the privacy-first philosophy.
- Empty journals point users to the welcome page instead of rendering the tour inline.

### 8.8 Navigation
- The "Say hey" logo uses the page accent green and links back to the homepage.
- Primary navigation links include Home, Pricing, Welcome, About, and Login when logged out.
- When a valid session cookie is present, the navigation replaces Login with a journal-style account control (initials) that links to `/account`.
- The `/account` page shows the signed-in email, lets users edit their display name, provides a logout action, and redirects to `/auth` without a valid session.
- Each journal has a unique `/journals/:id` URL; the marketing homepage remains `/`.
- The sidebar New Journal action navigates to `/` before starting a new capture.

### 8.9 Privacy Sentence
- No standalone privacy sentence appears on the journal surface.

### 8.10 Marketing Home
- The `/` route is a minimal landing page with a hero, pill navigation, and a CTA to start journaling.
- The landing navigation includes Home, Welcome, About, and Login when logged out.
- Logged-in visitors see the journal-style account control (initials, linking to `/account`) instead of Login.
- Logged-in visitors see a personalized greeting using their display name.
- The landing page is separate from the journal workspace; new journals initiate from `/` and route to `/journals/new` once capture begins.
- The `/journals/new` workspace does not create a conversation until the first entry is saved.
- New entries started from `/journals/new` always create a fresh conversation; entries append only when the user is already on that journal's `/journals/:id`.
- The homepage includes a visible listening control with animated rings that reflect mic state.
- The homepage Talk control uses green accent tones for waiting, listening, paused, and processing, with the rings keyed to the same state colors.
- The homepage shows a full-width streaming orbit text accent anchored to the hero on larger screens, scaled for readability with randomized start/direction/paths and a faster flow.
- A sidebar toggle shortcut appears in the homepage header and opens/closes the journal history rail in place.
- Pressing Space on the homepage starts the first voice capture; double-tap Space stops it, and once transcription begins the app routes to `/journals/new`.
- Homepage transcripts auto-save once transcription completes, creating the conversation and routing to `/journals/:id`.
- The homepage copy instructs users to press Space to begin and how to stop.

### 8.11 Pricing
- The `/pricing` route presents the Free plan and its included voice-first features.
- Pro is labeled "Coming soon" and does not allow purchase or activation.
- The plan selector is a visual cue only; Individual is the default state and Team/API remain disabled.
- Free plan calls-to-action route to `/journals/new`.

### 8.12 Signed-in Personalization
- Signed-in journal views surface the account menu in the journal navbar and show the user name in the header.
- The account menu links to Welcome, Account, and Logout; account access remains available via the site navigation on non-journal pages.

## 9. Tone and Reply Style
- Helpful, calm, and concise.
- No replies unless explicitly asked.
- Does not override the chat guardrails or safety checks.

## 10. Configuration
Required:
- `GROQ_API_KEY` for STT.
- `ELEVENLABS_API_KEY` for TTS.
- `MAILTRAP_API_TOKEN` for magic-link emails.
- `APP_URL` for building magic links.
- `TOKEN_SECRET` for signing auth tokens and sessions.

Optional:
- `ELEVENLABS_VOICE_ID` (default: pNInz6obpgDQGcFmaJgB).
- `ELEVENLABS_TTS_MODEL` (default: eleven_multilingual_v2).

## 11. Out of Scope (MVP)
- Streaming TTS to the client.
- Passphrase-protected encryption (Tier 2).
- Encrypted index fields (title/preview).
- Full-text search across transcripts.
- Rich text formatting toolbars beyond Undo/Restore and inline image attachments.
- Complex NLP-based intent detection.
