# Journal Entry Model and Lifecycle

## Overview
- Persistent, resumable journal entries with system-managed transcript segments.

## Goals
- Enforce pause vs close entry semantics and the current entry pointer rules.
- Keep transcripts continuous and reliable across pauses and failures.
- Store minimal metadata while preserving ordering and timestamps.

## Non-Goals
- Topic detection or automatic entry splitting.
- Multi-user collaboration or shared entries.
- Audio retention beyond ephemeral capture.

## Architecture
- Domain rules live in `lib/conversation-domain.ts` (internal naming).
- Data model lives in `prisma/schema.prisma` and is accessed through Prisma Client.
- Current entry pointer is stored on the user record.

## Data Model
- User: owns journal entries and the current entry pointer.
- Journal Entry (Conversation table): lifecycle state (Active/Paused/Closed) with timestamps.
- Closed is stored as `stopped` in the current schema and state enums.
- TranscriptSegment: ordered segments with timestamps and text.
- Deletion: removing an entry cascades to segments and clears the current pointer.

## UI/UX Notes
- No user-facing segment boundaries; segments are merged visually.
- Pause preserves intent; Close entry ends intent without deleting data.
- Use shadcn/ui for all UI surfaces.

## API/Integration
- Supabase hosts PostgreSQL; Prisma is the ORM.
- Audio capture and transcription pipeline remains separate and ephemeral.

## Tests
- `lib/conversation-domain.test.ts` covers pointer and lifecycle rules.

## Risks
- State mismatch between UI and persisted entry state.
- Incorrect pointer updates causing unexpected new entries.

## Open Questions
- Long-silence threshold for segment boundary creation.
- Segment metadata needed for recovery and debugging.

## Decisions
- 2025-12-25: Store current entry pointer on the user record.
