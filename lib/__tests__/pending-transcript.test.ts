import {
  consumePendingTranscript,
  resetPendingTranscript,
  setPendingTranscriptPromise,
} from "@/lib/pending-transcript";

describe("pending transcript store", () => {
  beforeEach(() => {
    resetPendingTranscript();
  });

  it("consumes a resolved pending transcript", async () => {
    setPendingTranscriptPromise(
      Promise.resolve({ transcript: "Hello", confidence: 0.92 })
    );

    await expect(consumePendingTranscript()).resolves.toEqual({
      transcript: "Hello",
      confidence: 0.92,
    });
    await expect(consumePendingTranscript()).resolves.toBeNull();
  });

  it("waits for an in-flight transcript promise", async () => {
    let resolvePromise: (value: {
      transcript: string;
      confidence: number | null;
    }) => void = () => undefined;
    const pending = new Promise<{ transcript: string; confidence: number | null }>(
      (resolve) => {
        resolvePromise = resolve;
      }
    );

    setPendingTranscriptPromise(pending);

    const resultPromise = consumePendingTranscript();
    resolvePromise({ transcript: "Saved", confidence: null });

    await expect(resultPromise).resolves.toEqual({
      transcript: "Saved",
      confidence: null,
    });
  });
});
