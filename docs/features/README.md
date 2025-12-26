# Feature Blueprints

Purpose: keep architecture and rationale for each feature area in one place.

## How To Use
- Create one file per feature: `docs/features/<feature-name>.md`
- Keep decisions and open questions current as the feature evolves.
- Align each blueprint to `docs/product-reference.md` non-negotiables.

## Template

```md
# Feature Name

## Overview
- What it does and who it serves.

## Goals
- Primary outcomes.

## Non-Goals
- Explicitly out of scope.

## Architecture
- Key components and data flow.

## Data Model
- Tables, fields, and relationships (or external sources).

## UI/UX Notes
- Screens, states, accessibility notes, and shadcn/ui usage.

## API/Integration
- Endpoints, providers, or services.

## Tests
- Coverage plan and key scenarios.

## Risks
- Known risks and mitigation.

## Open Questions
- Anything unresolved.

## Decisions
- Decision log with dates.
```
