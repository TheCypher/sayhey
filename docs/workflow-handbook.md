# Workflow Handbook

Purpose: define the collaboration loop so planning, testing, implementation, and logging stay in sync.

## Start Here
- Open `docs/orchestrator-doc.md` first.
- Confirm Current Objective and select the top Upcoming Task.
- Review `docs/product-reference.md` for non-negotiables before planning work.
- Note any blockers or open questions before coding.

## Daily Loop (Plan -> Tests -> Implement -> Log -> Decide)
1) Plan: align on the task and constraints in `docs/orchestrator-doc.md` and `docs/product-reference.md`.
2) Tests: follow `docs/testing-playbook-doc.md` to write a failing Jest spec.
3) Implement: build to green; use shadcn/ui for UI; keep changes aligned to feature docs if they exist.
4) Log: record outcomes and verification in `docs/context-doc.md`.
5) Decide: update the Decisions Log in `docs/orchestrator-doc.md` when a choice is made.

## Doc Update Flow
- New or changed capability: update `AGENTS.md` (What/Where/Why).
- Behavior changes: update `docs/product-reference.md` before shipping.
- Feature-level rationale: add or update a blueprint in `docs/features/`.
- Roadmap impact: mirror status in `README.md` when applicable.

## Session Closeout
- Rerun tests and document results.
- Refresh Upcoming Tasks and Blockers before ending the session.
