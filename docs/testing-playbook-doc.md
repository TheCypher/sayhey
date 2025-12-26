# Testing Playbook (Jest)

Purpose: enforce a test-first workflow with clear structure and guardrails.

## Core Rules
- Write a failing test before implementation (red -> green -> refactor -> document).
- Keep tests co-located with the code they cover.
- Favor unit tests for logic and integration tests for user flows.

## Test Locations
- Co-locate tests next to modules using `*.test.ts` or `*.test.tsx`.
- For shared helpers, use a `__tests__` folder adjacent to the file.

## Spec Structure
1) Arrange: set up inputs and dependencies.
2) Act: call the unit or render the component.
3) Assert: verify expected behavior and edge cases.

## Jest Cadence
- Red: commit the failing test.
- Green: implement the smallest change to pass.
- Refactor: clean up implementation and tests.
- Document: update `AGENTS.md` and any relevant feature docs.

## Sample Skeleton
```ts
describe("FeatureName", () => {
  it("does the expected behavior", () => {
    // Arrange
    // Act
    // Assert
  });
});
```
