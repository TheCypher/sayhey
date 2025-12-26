import { listeningReducer } from "./listening-state";

describe("listeningReducer", () => {
  it("starts listening from idle or stopped", () => {
    expect(listeningReducer("idle", { type: "start" })).toBe("active");
    expect(listeningReducer("stopped", { type: "start" })).toBe("active");
  });

  it("pauses only from active", () => {
    expect(listeningReducer("active", { type: "pause" })).toBe("paused");
    expect(listeningReducer("idle", { type: "pause" })).toBe("idle");
  });

  it("resumes only from paused", () => {
    expect(listeningReducer("paused", { type: "resume" })).toBe("active");
    expect(listeningReducer("active", { type: "resume" })).toBe("active");
  });

  it("stops from active or paused", () => {
    expect(listeningReducer("active", { type: "stop" })).toBe("stopped");
    expect(listeningReducer("paused", { type: "stop" })).toBe("stopped");
  });

  it("ignores unsupported transitions", () => {
    expect(listeningReducer("idle", { type: "stop" })).toBe("idle");
    expect(listeningReducer("idle", { type: "pause" })).toBe("idle");
    expect(listeningReducer("active", { type: "resume" })).toBe("active");
    expect(listeningReducer("paused", { type: "start" })).toBe("paused");
    expect(listeningReducer("stopped", { type: "pause" })).toBe("stopped");
  });
});
