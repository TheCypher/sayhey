# Hey — Voice-First Journal

Hey is a privacy-first, voice-led journal that stays quiet unless you ask for a reply. It captures spoken entries, transcribes them, and optionally responds with text and speech while keeping history local to the browser.

## Product Principles
- Voice is the primary interface; text entry is secondary and hidden by default.
- Transcripts are always visible as journal entries.
- Replies only happen on explicit, direct requests.
- Audio errors fall back to text-only; capture never blocks.

## Core Capabilities
- Push-to-talk recording with spacebar start/pause/resume and double-tap stop.
- STT via Groq Whisper proxy; TTS via ElevenLabs proxy.
- Spoken reply playback queue with sentence-level highlighting.
- Local-first conversation history in IndexedDB with AES-GCM encrypted transcripts.
- Unique per-journal URLs at `/journals/:id` with a new-journal launcher at `/journals/new`.
- Magic-link authentication with Mailtrap email delivery and HttpOnly session cookies.
- New-user onboarding after magic-link sign-in with terms, intent, plan, consent, and display name capture.
- Minimal marketing homepage with animated listening controls, a hero CTA, a Spacebar shortcut into the journal workspace, and an in-place sidebar toggle for local history.
- Pricing page with the Free plan available now and Pro marked as coming soon.
- Dedicated welcome tour at `/welcome` plus a privacy-first About page.
- Chat turn orchestration with confidence gating on low-quality transcripts.

## Architecture (High Level)
1. Client voice capture -> server STT -> chat turn -> server TTS.
2. Third-party APIs are called only from server routes; audio stays ephemeral.
3. Conversation index and transcripts persist locally only.

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript.
- Tailwind CSS v4 + shadcn/ui.
- Prisma schema foundation.
- Jest for unit tests.
- Bolt AI router with Groq provider.

## Getting Started

### Prerequisites
- Node.js (latest LTS recommended).
- `pnpm` (recommended) or npm/yarn/bun.

### Install
```bash
pnpm install
```

### Configure Environment
Copy `.env.example` to `.env.local` and fill in:
- `GROQ_API_KEY` (required for STT)
- `ELEVENLABS_API_KEY` (required for TTS)
- Optional tuning: `ELEVENLABS_VOICE_ID`, `ELEVENLABS_TTS_MODEL`
- Optional data/realtime settings: `DATABASE_URL`, `DIRECT_URL`, `REALTIME_PORT`, `NEXT_PUBLIC_TRANSCRIPTION_WS_URL`
- Auth settings: `MAILTRAP_API_TOKEN`, `APP_URL`, `TOKEN_SECRET`

### Run the App
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000).
Start a new journal at [http://localhost:3000/journals/new](http://localhost:3000/journals/new) and each conversation renders at `/journals/:id`.

### Optional Realtime Server
```bash
pnpm realtime:dev
```
The websocket server runs on `REALTIME_PORT` (default 4001). Point `NEXT_PUBLIC_TRANSCRIPTION_WS_URL` at it when experimenting with streaming transcription.

### Build + Start
```bash
pnpm build
pnpm start
```

## Scripts
- `pnpm dev` - start Next.js dev server
- `pnpm build` - production build
- `pnpm start` - run production server
- `pnpm lint` - ESLint
- `pnpm test` - Jest tests
- `pnpm realtime:dev` - local realtime websocket server

## Testing
- Tests are co-located with the code and run with Jest.
- Follow TDD: start with a failing test before implementation.

## Project Structure
- `app/` - routes, API endpoints, layouts
- `components/` - UI and application components
- `hooks/` - voice capture, playback, local history hooks
- `lib/` - storage, crypto, services, Bolt router
- `agents/` - helper agent definitions and tests
- `docs/` - product reference, feature guides, workflow docs
- `realtime/` - optional websocket server

## Documentation
- Feature catalog: `AGENTS.md`
- Product behavior: `docs/product-reference.md`
- Feature deep-dives: `docs/features/README.md`
- Orchestrator plan: `docs/orchestrator-doc.md`
- Workflow loop: `docs/workflow-handbook.md`
- Agent docs workflow: `docs/agent-workflow.md`
- Testing guide: `docs/testing-playbook-doc.md`

## Roadmap
- [x] Establish workflow docs and operating loop
- [x] Lock product behavior reference (`docs/product-reference.md`)
- [x] Define voice journal features in `AGENTS.md` and `docs/features/`
- [x] Add Jest setup and first red-green-refactor cycle
- [x] Build push-to-talk voice capture with Groq Whisper STT proxy
- [x] Add ElevenLabs TTS proxy and queued playback hook
- [x] Add chat turn endpoint with Bolt routing and confidence-aware field update gating
- [x] Ship the voice-first journal pane with explicit request gating and spoken replies
- [x] Add new-journal welcome tour with feature highlights and philosophy
- [x] Add privacy-first about page
- [x] Add primary navigation with Home/Journal/About links
- [x] Ship a minimal marketing homepage with a hero CTA and Spacebar shortcut
- [x] Ship local-first conversation history + navigation (encrypted IndexedDB)
- [x] Add magic-link authentication with Mailtrap delivery
- [x] Add new-user onboarding flow
- [ ] Add confirmation flow for low-confidence field updates
- [ ] Add streaming TTS/chunking for long replies
- [ ] Add export/import and deletion flows

## Contribution Workflow
- Update `docs/product-reference.md` before changing behavior.
- Update `AGENTS.md` when shipping or modifying features.
- Follow `docs/agent-workflow.md` to keep `AGENTS.md` and `CLAUDE.md` synchronized.
- Use shadcn/ui for UI components and keep accessibility in mind.
- Anchor new workflows to live data (Prisma/Supabase) before UI polish.

## Status
This is an active, private project. There is no public release or license yet.
