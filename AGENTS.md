# AGENTS.md

Purpose: source of truth for feature scope and technical location. Update this file whenever you ship or adjust a feature, and mirror roadmap changes in `README.md` when applicable.
Last updated: 2026-01-04

## Feature Catalog
### Voice Journal Pane
- Status: shipped
- What:
  - Push-to-talk capture with tap-to-stop transcription, clear mic/playback states, and sentence-level playback highlighting.
  - Entries render as single-paragraph text blocks with timestamps and a bottom-right Listen control.
  - Full-width white `/journals/:id` canvas with a sticky journal navbar: desktop single-row header anchors sidebar toggle + JOURNAL left, centered mic/audio controls, and user name + account menu right; on mobile the mic/audio controls wrap beneath the header row to avoid horizontal scrolling and the compact Spacebar hint beside Talk is hidden; the hint reads "Spacebar - press Space to start, pause, or resume; double-tap Space to stop and send, or use Show text entry"; audio queue labels + Stop audio only appear after playback activates; bottom text entry rail with spacebar cues; no top navbar.
  - Footer spacebar guidance stays compact and centered with bold instructions and an emphasized Show text entry link; on mobile the instruction bar collapses to only the Show text entry button and hides on scroll down/reappears on scroll up; the journal footer divider matches the text entry rail width.
  - Viewport-locked layout keeps shell and sidebar pinned; responsive stacking on small screens; text composer auto-collapses after send and saves text before optional Markdown-emphasis replies.
- Where: `app/journals/[id]/page.tsx`, `app/journals/new/page.tsx`, `components/application/conversation-pane.tsx`, `components/application/conversation-sidebar.tsx`, `hooks/use-voice-capture.ts`, `hooks/use-tts-playback.ts`, `docs/features/conversation-pane.md`.
- Why: Keep voice-first journaling and replies in one predictable workflow aligned to `docs/product-reference.md` and shadcn/ui.

### New Journal Welcome Tour
- Status: shipped
- What:
  - Dedicated `/welcome` tour covering voice capture, text entry, spoken replies, the history rail, and the privacy-first philosophy.
  - Warm sunset background shared with the magic-link sign-in page.
  - Empty journals nudge users to the guide instead of inlining the tour.
- Where: `app/welcome/page.tsx`, `components/application/welcome-panel.tsx`, `docs/features/conversation-pane.md`, `docs/product-reference.md`.
- Why: Orient users each time they start a new journal and reinforce the local-first, explicit-reply workflow.

### Local-First Conversation History + Navigation
- Status: shipped
- What:
  - Encrypted local persistence with a full-height, left-rail sidebar and lightweight chat list.
  - Sidebar rules: pinned + recent share the main list, archived behind Library; titles truncate to 30 characters with timestamps below and no previews.
  - Navigation: default-closed sidebar with hydration loading state; mobile closes on selection and New Journal routes to `/`, desktop persists open state.
  - Journals own `/journals/:id` URLs, start at `/` then `/journals/new`, and only create after the first entry is saved before rename/pin/archive/delete ordering applies.
  - New entries always start a fresh journal unless the user is already on that journal's `/journals/:id`.
- Where: `app/journals/[id]/page.tsx`, `components/application/conversation-sidebar.tsx`, `hooks/use-local-conversations.ts`, `lib/storage`, `lib/crypto`, `lib/services/conversations.ts`, `docs/features/local-history.md`, `docs/product-reference.md`.
- Why: Keep transcripts local-only, encrypted at rest, and easy to navigate without server storage.

### Voice Capture (Client)
- Status: shipped
- What:
  - Push-to-talk capture using MediaRecorder with in-memory audio.
  - Spacebar toggles start/pause/resume with double-tap stop; tap-to-stop STT submission; explicit-request gating before agent replies.
- Where: `hooks/use-voice-capture.ts`, `components/application/conversation-pane.tsx`, `docs/features/voice-capture.md`.
- Why: Centralizes mic lifecycle, keeps audio ephemeral, and provides UI-ready status.

### TTS Playback (Client)
- Status: shipped
- What:
  - Queue-based audio playback with stop/clear controls for spoken replies.
  - Sentence-level tracking with robust splitting (including quoted endings) and end-of-playback fallback detection for reliable highlighting.
- Where: `hooks/use-tts-playback.ts`, `components/application/conversation-pane.tsx`, `docs/features/tts-playback.md`.
- Why: Prevent overlapping audio and keep playback intent explicit.

### STT Proxy (Groq Whisper)
- Status: shipped
- What:
  - Server-side transcription endpoint forwards audio to Groq Whisper and normalizes output.
- Where: `app/api/stt/route.ts`, `.env.example`.
- Why: Keep API keys server-only and provide a stable contract to the client.

### TTS Proxy (ElevenLabs)
- Status: shipped
- What:
  - Server-side speech synthesis endpoint forwards text to ElevenLabs and returns audio bytes.
- Where: `app/api/tts/route.ts`, `.env.example`.
- Why: High-quality synthesis without exposing secrets in the browser.

### Chat Turn Orchestration
- Status: shipped
- What:
  - Shared chat endpoint for voice and text turns.
  - Confidence gating suppresses low-confidence field updates while still returning replies.
- Where: `app/api/chat/turns/route.ts`, `lib/bolt/router.ts`, `agents/helper.ts`, `agents/helper.test.ts`.
- Why: Keep guardrails and reply behavior consistent across modalities.

### Conversation Model (Foundation)
- Status: foundation
- What:
  - Domain rules and schema for persisted conversations and segments.
  - Pending integration with the agent UI.
- Where: `lib/conversation-domain.ts`, `prisma/schema.prisma`, `docs/features/conversation-model.md`, `.env.example`.
- Why: Prepare for future persistence without blocking the MVP.

### About Page
- Status: shipped
- What:
  - Privacy-first narrative about who we are, our mission, and why data stays local.
  - Warm sunset background shared with the magic-link sign-in page.
  - Viewport-sized layout only scrolls when content exceeds the page.
- Where: `app/about/page.tsx`, `app/about/__tests__/page.test.tsx`.
- Why: Make the product principles and local-first trust model explicit to users.

### Account Page
- Status: shipped
- What:
  - Signed-in account overview with email, editable display name, plus a CTA back to journaling.
  - Logout button routes to `/auth/logout`.
  - Redirects to `/auth` when no valid session cookie is present.
- Where: `app/account/page.tsx`, `components/application/account-display-name-form.tsx`, `app/account/display-name/route.ts`, `app/account/__tests__/page.test.tsx`, `docs/product-reference.md`.
- Why: Give logged-in users a clear identity checkpoint and quick return to the journal.

### Marketing Homepage
- Status: shipped
- What:
  - Minimal landing page with pill-style nav, green "Say hey" logo, and a split hero + capture card layout with warm color washes.
  - Hero includes a signed-in display-name greeting plus the full-width streaming orbit text accent with randomized flow and faster motion.
  - In-place sidebar toggle for local history and a primary CTA into the journal workspace.
  - Animated listening controls: Space starts capture, double-tap Space stops, then routes to `/journals/new` and `/journals/:id` after auto-save.
- Where: `app/page.tsx`, `components/home/home-shell.tsx`, `components/home/home-spacebar-capture.tsx`, `components/application/conversation-sidebar.tsx`, `lib/pending-transcript.ts`, `app/globals.css`.
- Why: Provide a focused first impression before entering the voice journal while keeping the Spacebar workflow front and center.

### Pricing Page
- Status: shipped
- What:
  - Pricing overview with the Free plan available now and Pro marked as coming soon.
  - Individual plan selector rendered as a visual cue while Team and API stay disabled.
  - Free plan call-to-action routes into `/journals/new`.
- Where: `app/pricing/page.tsx`, `components/application/site-nav.tsx`, `components/home/home-shell.tsx`, `docs/product-reference.md`.
- Why: Set expectations around plan availability without disrupting the voice-first onboarding flow.

### Site Navigation
- Status: shipped
- What:
  - Primary navigation bar links Home, Pricing, Welcome, About, and Login when logged out, swapping Login for the journal-style account control (initials) linking to `/account` when logged in.
  - Green "Say hey" logo link returns to the homepage.
- Where: `components/application/site-nav.tsx`, `components/home/home-shell.tsx`, `components/application/__tests__/site-nav.test.tsx`, `app/about/page.tsx`, `app/account/page.tsx`.
- Why: Give users a consistent path between the journal and the about narrative.

### Magic Link Authentication
- Status: shipped
- What:
  - Passwordless sign-in with email-based magic links that sign users in on click and land on `/`.
  - HttpOnly session cookie creation plus invalid/expired link handling and safe redirects back to `/auth`.
  - Editorial two-column sign-in layout with serif hero copy, an email card, and a warm illustrative panel.
- Where: `app/auth/page.tsx`, `app/auth/request-magic-link/route.ts`, `app/auth/verify/route.ts`, `components/application/auth-form.tsx`, `lib/auth`, `lib/email/mailtrap.ts`, `lib/prisma.ts`, `prisma/schema.prisma`, `docs/product-reference.md`.
- Why: Provide passwordless access without Supabase Auth while keeping email delivery and token handling under our control.

### New User Onboarding
- Status: shipped
- What:
  - New emails with pending onboarding are routed into a multi-step onboarding flow after sign-in.
  - Steps capture terms acceptance, usage intent, plan preference, consent-to-improve, and a display name.
  - Onboarding flow centers within the sunset layout for focus.
  - Users can move back to earlier steps to adjust onboarding selections.
  - Completing onboarding routes users back to `/`.
- Where: `app/onboarding/page.tsx`, `components/application/onboarding-flow.tsx`, `app/onboarding/complete/route.ts`, `app/page.tsx`, `lib/auth`, `lib/prisma.ts`, `prisma/schema.prisma`, `docs/product-reference.md`.
- Why: Ensure new users explicitly opt in, set context, and land in the journal with the right preferences.

### Styling Compatibility
- Status: shipped
- What:
  - PostCSS layer unwrapping with a CJS-compatible plugin.
  - Tailwind utilities render on older mobile browsers without cascade layer support.
- Where: `postcss.config.mjs`, `lib/postcss/unlayer.js`, `lib/postcss/__tests__/unlayer.test.ts`.
- Why: Keep styling consistent on iOS browsers that skip `@layer` rules.

## Non-goals / Out of scope
- No default cloud sync or server-side journal storage unless explicitly added to this catalog and `docs/product-reference.md`.
- No ambient or always-on microphone capture; voice input remains explicit and push-to-talk.
- No UI component library outside shadcn/ui unless the catalog calls it out.

## Catalog Format (Status / What / Where / Why)
- Status: shipped | foundation | in-progress | planned.
- What: concise capability name and behavior, broken into 2-4 short bullets.
- Where: primary files or directories plus one relevant doc link.
- Why: user or system rationale for the capability.

## Agent Docs Sync Workflow
- AGENTS.md is the single source of truth for shared rules; CLAUDE.md only adds Claude-only guidance.
- When changing shared rules or feature scope, update AGENTS.md first, then mirror any relevant guidance in CLAUDE.md in the same change set.
- Keep shared rules in AGENTS.md and reference them from CLAUDE.md instead of duplicating unless a short reminder improves clarity.
- If a rule applies only to Claude or only to Codex, keep it in the respective file and label it as agent-specific.
- Update `docs/product-reference.md` before behavior changes, then update the Feature Catalog (and `README.md` if the roadmap changes).
- See `docs/agent-workflow.md` for the full checklist and commit/PR cadence.

## Working Rules
- For code changes or implementation tasks (not general questions), start by restating the request with the phrase "Explain to me what I am asking so I know we are on the same page:" unless the task is obvious.
- TDD always: write a failing Jest test before implementation and keep tests co-located with the code.
- Keep documentation current: update this file for any feature change.
- Product behavior is defined in `docs/product-reference.md`; update it before changing behavior.
- Use shadcn/ui as the UI component library for all interface work.
- Prefer functional React components + hooks; co-locate logic with UI; ensure accessibility.
- Anchor new workflows to live data first (Prisma/Supabase) before UI polish.
