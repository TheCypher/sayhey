export type ConversationState = "active" | "paused" | "stopped";

export type ConversationSummary = {
  id: string;
  state: ConversationState;
};

export type StartAction =
  | { action: "resume"; conversationId: string }
  | { action: "create" }
  | { action: "noop" };

export type ConversationEvent = "pause" | "resume" | "stop";

export function decideStartAction(
  current: ConversationSummary | null
): StartAction {
  if (!current) {
    return { action: "create" };
  }

  if (current.state === "paused") {
    return { action: "resume", conversationId: current.id };
  }

  if (current.state === "stopped") {
    return { action: "create" };
  }

  return { action: "noop" };
}

export function transitionConversationState(
  state: ConversationState,
  event: ConversationEvent
): ConversationState {
  switch (event) {
    case "pause":
      return state === "active" ? "paused" : state;
    case "resume":
      return state === "paused" ? "active" : state;
    case "stop":
      return state === "active" || state === "paused" ? "stopped" : state;
    default:
      return state;
  }
}
