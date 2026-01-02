# Agent Docs Workflow

Purpose: keep Codex and Claude aligned without duplicating rules or drifting on feature scope.

## Sources of Truth
- `AGENTS.md` owns shared rules, feature scope, and file locations.
- `CLAUDE.md` only adds Claude-specific guidance and references `AGENTS.md` for shared rules.
- `docs/product-reference.md` defines product behavior.
- `README.md` mirrors roadmap changes noted in `AGENTS.md`.

## Update Sequence
1. Update `docs/product-reference.md` before changing behavior.
2. Update `AGENTS.md` for feature scope, shared rules, and the feature catalog.
3. Update `CLAUDE.md` only if Claude needs an agent-specific rule or a short reminder pointing back to `AGENTS.md`.
4. Mirror roadmap changes or new doc links in `README.md`.

## Consistency Rules
- If `AGENTS.md` and `CLAUDE.md` conflict, treat `AGENTS.md` as authoritative and fix the mismatch immediately.
- Avoid duplicating shared rules in `CLAUDE.md`; link to `AGENTS.md` instead.
- Keep timestamps in `AGENTS.md` current when you change shared rules or features.

## Commit + PR Flow
- Follow the red/green/refactor cadence in `docs/testing-playbook-doc.md`; commit the failing test at red when you are making commits.
- Use Conventional Commits for commit messages: `type(scope): subject`. Scope is required; use `repo` when the change spans multiple areas or no single scope fits.
- Allowed `type` values: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `build`, `ci`, `revert`.
- Prefer path-derived scopes like `app`, `components`, `hooks`, `lib`, `docs`, `realtime`, `prisma`, `agents`, or `config`.
- Keep subjects imperative and concise; prefer small, focused commits.
- If you are opening a PR, include the agent-doc checklist results, test status, and doc updates in the PR description.

## Quick Checklist
- Behavior change documented in `docs/product-reference.md`.
- Feature catalog updated in `AGENTS.md`.
- Agent-specific guidance updated in `CLAUDE.md` (if needed).
- Roadmap or doc links updated in `README.md`.
- Commits follow Conventional Commits with required scopes and imperative subjects, and PR descriptions reflect the red/green cadence plus doc updates.
