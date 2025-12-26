# AGENTS.md

Purpose: source of truth for feature scope and technical location. Update this file whenever you ship or adjust a feature, and mirror roadmap changes in `README.md` when applicable.

## Feature Catalog
### Voice Journal Pane
- What: Dedicated journal surface that blends push-to-talk voice capture with tap-to-stop transcription, transcript display as single-paragraph entries, and spoken replies with clear mic/playback states; spacebar commands are emphasized in the header and voice controls, voice controls stay in view, entries scroll within a page-sized fixed-height stream in the right pane, and a text composer is revealed from the journal header with a hide control beside Send that auto-collapses after sending while always saving text entries before optional replies with Markdown emphasis.
- Where: `app/page.tsx`, `components/application/conversation-pane.tsx`, `hooks/use-voice-capture.ts`, `hooks/use-tts-playback.ts`, `components/ui/button.tsx`, `components/ui/card.tsx`, `app/globals.css`, `app/layout.tsx`, `docs/features/conversation-pane.md`.
- Why: Keep voice-first journaling and replies in one predictable workflow aligned to `docs/product-reference.md` and shadcn/ui.

### Voice Capture (Client)
- What: Push-to-talk capture using MediaRecorder with in-memory audio, spacebar start/pause/resume toggling with double-tap stop, tap-to-stop STT submission, and explicit-request gating before agent replies.
- Where: `hooks/use-voice-capture.ts`, `components/application/conversation-pane.tsx`, `docs/features/voice-capture.md`.
- Why: Centralizes mic lifecycle, keeps audio ephemeral, and provides UI-ready status.

### TTS Playback (Client)
- What: Queue-based audio playback with stop/clear controls for spoken replies.
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
- What: Privacy-first narrative about who we are, our mission, and why data stays local.
- Where: `app/about/page.tsx`, `app/about/__tests__/page.test.tsx`.
- Why: Make the product principles and local-first trust model explicit to users.

### Site Navigation
- What: Primary navigation bar linking Home and About with an active state.
- Where: `components/application/site-nav.tsx`, `components/application/__tests__/site-nav.test.tsx`, `components/application/conversation-pane.tsx`, `app/about/page.tsx`.
- Why: Give users a consistent path between the journal and the about narrative.

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
