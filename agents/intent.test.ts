import intentAgent from "./intent";

describe("intent agent", () => {
  it("frames intent summaries in the user's voice without advice", async () => {
    const call = jest.fn().mockResolvedValue("OK");

    await intentAgent.run({
      input: {
        entry: "I keep delaying my study plan.",
      },
      call,
    } as any);

    const prompt = call.mock.calls[0][0].prompt as string;

    expect(prompt).toContain("first-person");
    expect(prompt).toContain("goal and motivation");
    expect(prompt).toContain("without advice");
    expect(prompt).toContain("Entry: I keep delaying my study plan.");
  });

  it("includes sources for citations", async () => {
    const call = jest.fn().mockResolvedValue("OK");

    await intentAgent.run({
      input: {
        entry: "I keep delaying my study plan.",
        sources: [
          { id: "1", type: "sentence", text: "I keep delaying my study plan." },
        ],
      },
      call,
    } as any);

    const prompt = call.mock.calls[0][0].prompt as string;

    expect(prompt).toContain("Sources:");
    expect(prompt).toContain("[1]");
    expect(prompt).toContain("Sentence:");
  });
});
