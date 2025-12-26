export type ListeningState = "idle" | "active" | "paused" | "stopped";

export type ListeningAction =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" };

export function listeningReducer(
  state: ListeningState,
  action: ListeningAction
): ListeningState {
  switch (action.type) {
    case "start":
      return state === "idle" || state === "stopped" ? "active" : state;
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
