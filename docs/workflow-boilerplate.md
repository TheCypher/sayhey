# Workflow Boilerplate (Internal Agents)

Purpose: teach an internal agent how to recreate this project's working model in another repo. It explains the core docs, how they interact, and the daily loop to keep planning, testing, and delivery in sync.

## Audience
- Internal agents with full repo access and familiarity with our Codex conventions. Do not share outside the team; remove any secrets/keys before copying patterns elsewhere.

## Core Docs and Roles
- `AGENTS.md` (root): Feature catalog with What/Where/Why for every capability. Treat it as the source of truth for scope and technical location. Update it whenever you ship or adjust a feature. Also requires updating `README.md` roadmap when features change.
- `docs/product-reference.md`: Authoritative behavior reference and non-negotiable product principles.
- `docs/orchestrator-doc.md`: Live, short-horizon plan. Holds Current Objective, Upcoming Tasks (ordered), Blockers, Open Questions, and Decisions. Refresh before and after each work session.
- `docs/workflow-handbook.md`: Collaboration loop overview (plan -> tests -> implement -> log -> decide). Defines which doc to open first and how updates roll between docs.
- `docs/testing-playbook-doc.md`: TDD/Jest guardrails. Shows where tests live, how to structure specs, and the red -> green -> refactor -> document cadence.
- Optional supporting docs: feature blueprints under `docs/features/` (architecture + rationale for specific areas).

## How They Work Together (Day-to-Day)
1) Start in `docs/orchestrator-doc.md`: confirm Current Objective, pick the top Upcoming Task, and note blockers/questions.
2) Translate the task into tests using `docs/testing-playbook-doc.md` guidance (write failing Jest first).
3) Build to green. Keep UI/agent work aligned to any relevant feature docs under `docs/features/`.
4) Update `AGENTS.md` with What/Where/Why for any new/changed feature; mirror roadmap status in `README.md` when applicable.
5) Log outcomes and verification in `docs/context-doc.md` (if present) and capture decisions in the orchestrator Decisions Log.

## How to Port This Workflow to a New Project
- Copy the doc set: `AGENTS.md`, `docs/product-reference.md`, `docs/orchestrator-doc.md`, `docs/workflow-handbook.md`, `docs/testing-playbook-doc.md`, plus `docs/context-doc.md` if you use a running log. Keep paths the same.
- Seed `AGENTS.md` with an empty Feature Catalog and the standard rules (TDD, Jest, documentation What/Where/Why).
- Set an initial Current Objective and 3-5 Upcoming Tasks in `docs/orchestrator-doc.md`. Add a Decisions Log entry for any starting assumptions.
- Adopt the loop from `docs/workflow-handbook.md`: every session begins in orchestrator, moves to tests-first, ends with docs updates.
- Enforce TDD via `docs/testing-playbook-doc.md`: all new behavior must ship with Jest specs first; co-locate tests.
- Keep documentation centralized under `/docs` (except the root `README.md` and `AGENTS.md`). Each new workflow/agent gets its own README under its directory.

## Operational Guardrails
- TDD always: write/see failing Jest before implementation; rerun after refactor.
- Never delete files without explicit approval.
- Keep docs current: every feature change updates `AGENTS.md` (and `README.md` roadmap when relevant).
- Product behavior must align with `docs/product-reference.md`; no silent behavior changes.
- Use shadcn/ui as the UI component library for building the interface.
- Prefer functional React components + hooks; co-locate logic with UI; ensure accessibility.
- Anchor new workflows to live data first (Prisma/Supabase) before UI polish.
