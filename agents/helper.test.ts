import helperAgent from "./helper";

describe("journal helper", () => {
  it("ignores low-confidence hints when building the prompt", async () => {
    const call = jest.fn().mockResolvedValue("OK");

    await helperAgent.run({
      input: {
        message: "Explain this",
        conversationHistory: [],
        uncertainTranscript: true,
      },
      call,
    } as any);

    const prompt = call.mock.calls[0][0].prompt as string;

    expect(prompt).not.toContain("confidence was low");
    expect(prompt).not.toContain("confirm");
  });
});
