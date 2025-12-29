# AGENTS.md

Purpose: source of truth for feature scope and technical location. Update this file whenever you ship or adjust a feature, and mirror roadmap changes in `README.md` when applicable.

## Feature Catalog
### Voice Journal Pane
- What: Dedicated journal surface that blends push-to-talk voice capture with tap-to-stop transcription, transcript display as single-paragraph entries, and spoken replies with clear mic/playback states plus sentence-level playback highlighting that advances as each sentence loads and plays; spacebar commands are emphasized in the header and voice controls, the journal canvas renders on `/journals/:id` as a full-width white view with a sticky top header for the mic and optional text composer above a page-sized scrollable stream (no top navbar), entries render as plain text blocks on the canvas with visible timestamps and a bottom-right Listen control for replaying entries via voice, the overall layout locks to the dynamic viewport height so the page only scrolls when content overflows while the shell and sidebar stay pinned to the viewport height, responsive breakpoints stack panes on small screens via a device-width viewport, and a text composer is revealed from the journal header with a hide control beside Send that auto-collapses after sending while always saving text entries before optional replies with Markdown emphasis.
- Where: `app/journals/[id]/page.tsx`, `app/journals/new/page.tsx`, `app/welcome/page.tsx`, `components/application/welcome-panel.tsx`, `components/application/conversation-pane.tsx`, `components/application/conversation-sidebar.tsx`, `hooks/use-voice-capture.ts`, `hooks/use-tts-playback.ts`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/textarea.tsx`, `app/globals.css`, `app/layout.tsx`, `docs/features/conversation-pane.md`.
- Why: Keep voice-first journaling and replies in one predictable workflow aligned to `docs/product-reference.md` and shadcn/ui.

### New Journal Welcome Tour
- What: A dedicated welcome page at `/welcome` that walks users through voice capture, text entry, spoken replies, the history rail, and the privacy-first philosophy; empty journals nudge users to that guide instead of inlining the tour.
- Where: `app/welcome/page.tsx`, `components/application/welcome-panel.tsx`, `components/application/__tests__/conversation-pane.test.tsx`, `docs/features/conversation-pane.md`, `docs/product-reference.md`.
- Why: Orient users each time they start a new journal and reinforce the local-first, explicit-reply workflow.

### Local-First Conversation History + Navigation
- What: Encrypted local conversation persistence with a ChatGPT-style, full-height left sidebar flush to the viewport edge (action rail for new journal/search/library, lightweight chat list where pinned + recent share the main list and archived sits behind the Library toggle, title rows show the timestamp beneath the title in smaller type, titles truncate to 30 characters, no previews, and a simple action menu, ordered newest to oldest with deterministic tie-breakers), collapsible with a default-closed state and a loading state until client hydration; on mobile, selecting history closes the sidebar and the New Journal action navigates to `/`, while desktop keeps the sidebar open and persists its open/closed state; conversations create local records with the first entry snippet as the title unless renamed (falling back to "Untitled chat" when empty); each journal owns a unique `/journals/:id` URL with the new-journal flow starting from `/` and routing through `/journals/new` before landing on the conversation; plus rename, pin, archive, and delete actions.
- Where: `app/journals/[id]/page.tsx`, `components/application/conversation-pane.tsx`, `components/application/conversation-sidebar.tsx`, `hooks/use-local-conversations.ts`, `lib/storage/types.ts`, `lib/storage/indexeddb-store.ts`, `lib/storage/memory-store.ts`, `lib/crypto/keys.ts`, `lib/crypto/encrypt.ts`, `lib/crypto/encoding.ts`, `lib/crypto/web-crypto.ts`, `lib/services/conversations.ts`, `docs/features/local-history.md`, `docs/product-reference.md`.
- Why: Keep transcripts local-only, encrypted at rest, and easy to navigate without server storage.

### Voice Capture (Client)
- What: Push-to-talk capture using MediaRecorder with in-memory audio, spacebar start/pause/resume toggling with double-tap stop, tap-to-stop STT submission, and explicit-request gating before agent replies.
- Where: `hooks/use-voice-capture.ts`, `components/application/conversation-pane.tsx`, `docs/features/voice-capture.md`.
- Why: Centralizes mic lifecycle, keeps audio ephemeral, and provides UI-ready status.

### TTS Playback (Client)
- What: Queue-based audio playback with stop/clear controls for spoken replies, plus sentence-level tracking with robust sentence splitting (including quoted endings) and end-of-playback fallback detection so the active sentence can be highlighted and advance reliably.
- Where: `hooks/use-tts-playback.ts`, `components/application/conversation-pane.tsx`, `docs/features/tts-playback.md`.
- Why: Prevent overlapping audio and keep playback intent explicit.

### STT Proxy (Groq Whisper)
- What: Server-side transcription endpoint that forwards audio to Groq Whisper and normalizes output.
- Where: `app/api/stt/route.ts`, `.env.example`.
- Why: Keep API keys server-only and provide a stable contract to the client.

### TTS Proxy (ElevenLabs)
- What: Server-side speech synthesis endpoint that forwards text to ElevenLabs and returns audio bytes.
- Where: `app/api/tts/route.ts`, `.env.example`.
- Why: High-quality synthesis without exposing secrets in the browser.

### Chat Turn Orchestration
- What: Shared chat endpoint for voice and text turns, including confidence gating that suppresses low-confidence field updates while still returning replies.
- Where: `app/api/chat/turns/route.ts`, `lib/bolt/router.ts`, `agents/helper.ts`, `agents/helper.test.ts`.
- Why: Keep guardrails and reply behavior consistent across modalities.

### Conversation Model (Foundation)
- What: Domain rules and schema for persisted conversations and segments, pending integration with the agent UI.
- Where: `lib/conversation-domain.ts`, `lib/conversation-domain.test.ts`, `prisma/schema.prisma`, `docs/features/conversation-model.md`, `.env.example`.
- Why: Prepare for future persistence without blocking the MVP.

### About Page
- What: Privacy-first narrative about who we are, our mission, and why data stays local, presented in a viewport-sized layout that only scrolls when content exceeds the page.
- Where: `app/about/page.tsx`, `app/about/__tests__/page.test.tsx`.
- Why: Make the product principles and local-first trust model explicit to users.

### Marketing Homepage
- What: Minimal landing page with a pill-style nav linking Home/Welcome/About, a green "Say hey" logo, a split hero + capture card layout with warm color washes, a full-width streaming orbit text accent anchored to the hero (scaled for readability, randomized start/direction/paths, and faster flow), an in-place sidebar toggle for local history, and a primary CTA that sends users to the journal workspace; the homepage shows animated listening controls, Space starts capture, double-tap Space stops it, and the app routes to `/journals/new` when transcription begins, then auto-saves the transcript to create the conversation and route to `/journals/:id`.
- Where: `app/page.tsx`, `components/home/home-shell.tsx`, `components/home/home-spacebar-capture.tsx`, `components/application/conversation-sidebar.tsx`, `components/application/conversation-pane.tsx`, `lib/pending-transcript.ts`, `components/ui/button.tsx`, `app/globals.css`.
- Why: Provide a focused first impression before entering the voice journal while keeping the Spacebar workflow front and center.

### Site Navigation
- What: Primary navigation bar linking Welcome and About with an active state; the green "Say hey" logo link returns to the homepage.
- Where: `components/application/site-nav.tsx`, `components/application/__tests__/site-nav.test.tsx`, `components/application/conversation-pane.tsx`, `app/about/page.tsx`.
- Why: Give users a consistent path between the journal and the about narrative.

### Styling Compatibility
- What: PostCSS layer unwrapping with a CJS-compatible plugin so Tailwind utilities render on older mobile browsers without cascade layer support.
- Where: `postcss.config.mjs`, `lib/postcss/unlayer.js`, `lib/postcss/__tests__/unlayer.test.ts`.
- Why: Keep styling consistent on iOS browsers that skip `@layer` rules.

## Catalog Format (What / Where / Why)
- What: concise capability name and behavior.
- Where: primary files or directories.
- Why: user or system rationale for the capability.

## Working Rules
- TDD always: write a failing Jest test before implementation and keep tests co-located with the code.
- Keep documentation current: update this file for any feature change.
- Product behavior is defined in `docs/product-reference.md`; update it before changing behavior.
- Use shadcn/ui as the UI component library for all interface work.
- Prefer functional React components + hooks; co-locate logic with UI; ensure accessibility.
- Anchor new workflows to live data first (Prisma/Supabase) before UI polish.
