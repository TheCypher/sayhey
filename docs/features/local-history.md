# Local-First Conversation History + Navigation

## Overview
- Persist conversations locally in IndexedDB with encrypted transcripts and a plaintext index for fast navigation.

## Goals
- Zero-install, zero-prompt local persistence.
- Encrypted transcripts at rest using AES-GCM with a locally stored master key.
- Sidebar navigation with search, pin, archive, rename, and delete.

## Non-Goals
- Passphrase-protected encryption (Tier 2).
- Full-text transcript search.
- Server-side transcript storage.

## Architecture
- IndexedDB database `app_local_chat` with stores for conversation index, transcripts, and key metadata.
- WebCrypto AES-GCM encrypt/decrypt for transcripts with per-save nonce.
- Service layer to create, update, and query conversations with debounced persistence.

## Data Model
- ConversationIndexItem: id, title, preview, createdAt, updatedAt, pinned, archived, messageCount, schemaVersion.
- Transcript: conversationId, messages, meta, schemaVersion.
- EncryptedTranscriptPayload: v, alg, nonce, ciphertext, aad, createdAt, updatedAt.

## UI/UX Notes
- Sidebar is a full-height left rail flush to the viewport edge (no rounded container) that mirrors ChatGPT-style navigation (new journal, search, library toggle) with a lightweight chat list.
- The sidebar is collapsible and defaults to closed on load; a toggle control in the main header reopens it.
- On mobile, selecting a past conversation or starting a new journal closes the sidebar to reveal the journal; desktop keeps the sidebar open and persists its open/closed state.
- Chat rows show title-only entries with the updated timestamp beneath the title in smaller type; titles truncate to 30 characters, no previews, and a simple action menu; pinned and recent chats share the main list, ordered newest to oldest.
- Conversations are created when the first entry is saved; the first entry snippet becomes the title unless renamed, falling back to "Untitled chat" if empty.
- Pinned and recent chats stay in the main list; archived chats live under the library toggle.
- Context actions (rename, pin, archive, delete) appear as compact hover controls.
- No storage prompts or setup screens.

## API/Integration
- No server-side storage; only local IndexedDB and WebCrypto.

## Tests
- Crypto roundtrip + AAD mismatch.
- CRUD operations for conversation index and transcripts.
- Create -> append -> reload -> open integration flow.

## Risks
- IndexedDB eviction under storage pressure.
- Corrupt payloads; require recovery UI to delete or export what is available.

## Open Questions
- Export/import UX affordances and conflict resolution defaults.
- Whether to encrypt title/preview in a future tier.

## Decisions
- 2024-xx-xx: Tier 1 uses a locally stored master key with AES-GCM envelopes.
