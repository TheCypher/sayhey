import {
  decideStartAction,
  transitionConversationState,
  type ConversationState,
} from "./conversation-domain";

describe("conversation domain rules", () => {
  it("resumes the current conversation when paused", () => {
    const decision = decideStartAction({ id: "c1", state: "paused" });

    expect(decision).toEqual({ action: "resume", conversationId: "c1" });
  });

  it("creates a new conversation when current is stopped", () => {
    const decision = decideStartAction({ id: "c2", state: "stopped" });

    expect(decision).toEqual({ action: "create" });
  });

  it("creates a new conversation when no current exists", () => {
    const decision = decideStartAction(null);

    expect(decision).toEqual({ action: "create" });
  });

  it("does nothing when already active", () => {
    const decision = decideStartAction({ id: "c3", state: "active" });

    expect(decision).toEqual({ action: "noop" });
  });

  it("transitions conversation state with pause, resume, and stop", () => {
    expect(transitionConversationState("active", "pause")).toBe("paused");
    expect(transitionConversationState("paused", "resume")).toBe("active");
    expect(transitionConversationState("active", "stop")).toBe("stopped");
    expect(transitionConversationState("paused", "stop")).toBe("stopped");
  });

  it("ignores invalid transitions", () => {
    const states: ConversationState[] = ["active", "paused", "stopped"];
    for (const state of states) {
      expect(transitionConversationState(state, "pause")).toBe(
        state === "active" ? "paused" : state
      );
      expect(transitionConversationState(state, "resume")).toBe(
        state === "paused" ? "active" : state
      );
    }
    expect(transitionConversationState("stopped", "stop")).toBe("stopped");
  });
});
