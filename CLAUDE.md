# Claude Code Instructions

> **Important**: This file extends the shared rules in `AGENTS.md`. Read and follow everything in `AGENTS.md` first, then apply the Claude-specific guidance below. Place this file at the repo root next to `AGENTS.md`.

## Purpose
- **What**: Claude-specific operating rules layered on top of your project’s global agent instructions.
- **Where**: Root `CLAUDE.md` alongside `AGENTS.md`; mirror updates whenever shared rules change.
- **Why**: Keeps Claude Code aligned with the project’s standards while documenting any Claude-only behavior.

---

## Read Order
1. Read `AGENTS.md` for global development rules, stack references, and feature policies.
2. Then read this `CLAUDE.md` for Claude-only additions or overrides.

## Claude Code Capabilities
- MCP servers for external connections when allowed.
- Multi-file reading/editing with parallel tool execution for speed.
- Shell command execution (respect project sandbox/approval policies).
- Web search/fetch when permitted by the project’s network rules.

## Claude-Specific Rules
- Batch independent file reads/searches when parallel tools are available.
- Use Claude’s task tracking (e.g., TodoWrite) to outline multi-step work when helpful.
- Prefer concise diffs and minimal-touch edits; avoid unnecessary churn.
- Ask for clarification when requirements, APIs, or boundaries are unclear.
- When project policies require tests first (e.g., Jest/TDD), write/adjust tests before implementing code.

## Project-Specific Additions
- Follow the "Agent Docs Sync Workflow" in `AGENTS.md`; update AGENTS.md before adding or revising shared rules here.
- If a rule is shared, keep the source in AGENTS.md and add only a short Claude-only reminder when it helps execution.
- If AGENTS.md and CLAUDE.md conflict, treat AGENTS.md as authoritative and resolve the mismatch immediately.
- Use `docs/agent-workflow.md` as the checklist for updates and commit/PR notes.

## Sync Notice
- Shared rules live in `AGENTS.md`; Claude-only rules live here.
- Update both files together so Claude and other agents stay consistent across the project.
