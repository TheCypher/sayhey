jest.mock(
  "@bolt-ai/core",
  () => ({
    createAppRouter: jest.fn(() => ({
      registerProvider: jest.fn(),
      events: { subscribe: jest.fn() },
    })),
    runPlan: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  "@bolt-ai/providers-groq",
  () => ({
    createGroqProvider: jest.fn(() => ({ id: "groq" })),
  }),
  { virtual: true }
);

const { runPlan } = require("@bolt-ai/core");
const { createBoltGroqTranscriber } = require("./bolt-groq-transcriber");

function ensureFormData() {
  global.FormData = class {
    constructor() {
      this.entries = [];
    }

    append(key, value) {
      this.entries.push([key, value]);
    }
  };

  global.Blob = class {
    constructor() {}
  };
}

describe("bolt groq transcriber", () => {
  beforeEach(() => {
    ensureFormData();
    runPlan.mockReset();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "hello world" }),
    });
  });

  it("runs a Bolt plan that calls the Groq STT tool", async () => {
    runPlan.mockImplementation(async (_router, plan, ctx) => {
      const output = await ctx.tools["stt.groq"]({}, {});
      return { outputs: { [plan.outputs[0]]: output } };
    });

    const transcriber = createBoltGroqTranscriber({ groqApiKey: "test-key" });
    const text = await transcriber.transcribe(Buffer.from("audio"));

    expect(runPlan).toHaveBeenCalledTimes(1);
    const [, plan, ctx] = runPlan.mock.calls[0];
    expect(plan.steps[0].toolId).toBe("stt.groq");
    expect(ctx.tools["stt.groq"]).toEqual(expect.any(Function));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("groq.com"),
      expect.objectContaining({ method: "POST" })
    );
    expect(text).toBe("hello world");
  });

  it("includes prompt context when provided", async () => {
    runPlan.mockImplementation(async (_router, plan, ctx) => {
      const output = await ctx.tools["stt.groq"]({}, {});
      return { outputs: { [plan.outputs[0]]: output } };
    });

    const transcriber = createBoltGroqTranscriber({ groqApiKey: "test-key" });
    await transcriber.transcribe(Buffer.from("audio"), { prompt: "prior words" });

    const body = global.fetch.mock.calls[0][1].body;
    const entries =
      typeof body.entries === "function" ? Array.from(body.entries()) : body.entries;
    expect(entries).toEqual(expect.arrayContaining([["prompt", "prior words"]]));
  });

  it("throws when the Groq API key is missing", () => {
    expect(() => createBoltGroqTranscriber({ groqApiKey: "" })).toThrow(
      "missing-groq-api-key"
    );
  });
});
