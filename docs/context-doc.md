# Context Log

Purpose: running log of work completed, verification performed, and follow-ups.

## Session Entries

### 2025-12-25
- Scope: Add state-driven homepage UI, state machine, tests, and blueprint docs.
- Changes: Introduced `lib/listening-state.ts`, `components/voice-capture.tsx`, new Jest specs, and the voice capture feature blueprint.
- Verification: `pnpm test`.
- Follow-ups: Decide transcription pipeline and long-silence behavior.

### 2025-12-25
- Scope: Define journal entry domain rules and data model with Prisma for Supabase.
- Changes: Added `lib/conversation-domain.ts`, `lib/conversation-domain.test.ts`, `prisma/schema.prisma`, `.env.example`, and `docs/features/conversation-model.md`.
- Verification: `pnpm test`.
- Follow-ups: Run Prisma migrations against Supabase and wire data access.

### 2025-12-25
- Scope: Add client-side audio capture and hook to drive listening UI.
- Changes: Added `lib/audio-capture-controller.ts`, `hooks/use-audio-capture.ts`, audio capture tests, and `docs/features/audio-capture.md`. Updated `components/voice-capture.tsx` to map capture status to UI.
- Verification: `pnpm test`.
- Follow-ups: Select transcription pipeline and decide on silence auto-pause.

### 2025-12-25
- Scope: Define the realtime transcription transport and client contract.
- Changes: Added `lib/transcription-client.ts`, `lib/transcription-client.test.ts`, and `docs/features/transcription-pipeline.md`. Updated workflow docs to capture the decision.
- Verification: `pnpm test`.
- Follow-ups: Implement realtime WebSocket service and wire audio frames.

### 2025-12-25
- Scope: Wire audio frames to the transcription pipeline and add encoding utilities.
- Changes: Added `lib/audio-encoder.ts`, `lib/transcription-pipeline.ts`, `lib/media-stream-frame-source.ts`, `hooks/use-transcription-pipeline.ts`, and tests. Updated `components/voice-capture.tsx` to start the pipeline during active capture. Added `NEXT_PUBLIC_TRANSCRIPTION_WS_URL` and `REALTIME_PORT` to `.env.example`. Added a local WebSocket stub in `realtime/server.js`.
- Verification: `pnpm test`.
- Follow-ups: Build the realtime WebSocket service and define audio chunking strategy.

### 2025-12-25
- Scope: Wire the realtime server to Bolt AI + Groq STT and stream transcript segments back to the client.
- Changes: Added `realtime/bolt-groq-transcriber.js`, `realtime/transcription-session.js`, `realtime/pcm-wav.js` and tests. Extended the transcription client/pipeline for control messages and segment reception. Updated `components/voice-capture.tsx` to render segments when present. Added env placeholders for Bolt/Groq.
- Verification: `pnpm test`.
- Follow-ups: Decide on segment duration defaults and add backpressure handling.

### 2025-12-25
- Scope: Refactor STT to use Bolt Runner with Groq tooling.
- Changes: Added `realtime/bolt-runtime.js`, refactored `realtime/bolt-groq-transcriber.js` to run a Bolt tool plan, added new tests, and updated env/docs for Bolt presets and Groq STT endpoint.
- Verification: Not run (new Bolt dependencies not installed in this environment).
- Follow-ups: Install Bolt packages and re-run `pnpm test`.

### 2025-12-25
- Scope: Load `.env` for the realtime server so Groq keys resolve outside Next.js.
- Changes: Added `realtime/env-loader.js` + test, updated `realtime/server.js` to load env before reading config, and refreshed transcription docs.
- Verification: Not run (user to re-run `pnpm test`).
- Follow-ups: Confirm `pnpm realtime:dev` reads `.env` locally.

### 2025-12-25
- Scope: Make the capture CTA show immediate listening feedback.
- Changes: Updated `components/voice-capture.tsx` to treat the requesting state as listening for UI feedback, added accent ring/button styling, and extended `components/voice-capture.test.tsx`.
- Verification: `pnpm test -- components/voice-capture.test.tsx`.
- Follow-ups: None.

### 2025-12-25
- Scope: Ensure the CTA shows immediate click feedback even before mic status updates.
- Changes: Added optimistic click feedback state in `components/voice-capture.tsx` and locked it in with `components/voice-capture.test.tsx`.
- Verification: `pnpm test -- components/voice-capture.test.tsx`.
- Follow-ups: Confirm UX behavior in the browser with mic permissions.

### 2025-12-25
- Scope: Improve listening controls placement and make the stream scrollable.
- Changes: Moved Pause/Continue/Close into a dedicated control bar below status, added a scrollable journal entry stream with auto-scroll, and extended `components/voice-capture.test.tsx`.
- Verification: `pnpm test -- components/voice-capture.test.tsx`.
- Follow-ups: None.

### 2025-12-25
- Scope: Reduce control clutter by consolidating start/resume and separating close entry.
- Changes: Removed duplicate pause/resume buttons from the control bar so the primary CTA handles start/resume, leaving a single close entry control.
- Verification: `pnpm test -- components/voice-capture.test.tsx`.
- Follow-ups: Decide final close entry placement.

### 2025-12-25
- Scope: Place close entry away from the main CTA and restore pause access.
- Changes: Added a Pause button below the status line for active capture and moved Close entry into the journal entry stream card header.
- Verification: `pnpm test -- components/voice-capture.test.tsx`.
- Follow-ups: Confirm the control placement feels right in the UI.

### 2025-12-25
- Scope: Pivot language to Voice Journal across docs and UI copy.
- Changes: Updated `docs/product-reference.md`, added `docs/product-requirements.md`, refreshed feature docs, and aligned the capture UI copy with journal entry language.
- Verification: Not run (copy and documentation updates only).
- Follow-ups: Re-run `pnpm test`.

### YYYY-MM-DD
- Scope:
- Changes:
- Verification:
- Follow-ups:
