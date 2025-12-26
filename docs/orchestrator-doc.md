# Orchestrator Doc

## Current Objective
- Deliver the MVP for the voice journal, aligned to `docs/product-reference.md`.

## Upcoming Tasks (Ordered)
1) [x] Create a feature blueprint for the core journal entry model and lifecycle.
2) [x] Define the data model for journal entries, transcript segments, and the current entry pointer.
3) [x] Implement client-side audio capture (MediaStream) and the capture hook.
4) [x] Create a feature blueprint for audio capture.
5) [x] Select the audio capture and transcription pipeline with ephemeral audio handling and fallback behavior.
6) [x] Build the realtime transcription service and WebSocket endpoint.
7) [x] Wire audio frames to the transcription pipeline.
8) [x] Scaffold a local realtime WebSocket stub.
9) [ ] Add Prisma migrations and connect to Supabase.
10) [ ] Define export and deletion flows that match retention and portability requirements.
11) [x] Implement the UI states and controls (Idle/Active/Paused/Closed) using shadcn/ui and the required labels.
12) [x] Set up Jest and write initial specs for lifecycle transitions and homepage copy.
13) [x] Create a feature blueprint for the voice capture surface.

## Blockers
- None.

## Open Questions
- What is the default long-silence threshold for segment boundaries?
- Which transcription provider and streaming strategy match real-time plus deferred fallback?
- What segment metadata is required for recovery without bloating storage?

## Decisions Log
- Adopt `docs/product-reference.md` as the authoritative behavior reference.
- 2025-12-25: Map capture status to UI state to avoid drift.
- 2025-12-25: Store the current entry pointer on the user record.
- 2025-12-25: Use WebSocket transport with Groq STT and a deferred fallback path.
- 2025-12-25: Stream transcript segments back over the WebSocket connection.
- 2025-12-25: Route Groq STT calls through Bolt Runner tooling in the realtime service.
