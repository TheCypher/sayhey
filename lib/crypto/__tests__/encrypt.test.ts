import { webcrypto } from "crypto";

import { createMasterKey } from "../keys";
import { decryptTranscript, encryptTranscript } from "../encrypt";
import type { Transcript } from "../../storage/types";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as unknown as Crypto;
}

describe("transcript encryption", () => {
  it("roundtrips encrypted transcripts", async () => {
    const key = await createMasterKey();
    const transcript: Transcript = {
      conversationId: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "Hello there",
          createdAt: 1700000000000,
        },
      ],
      schemaVersion: 1,
    };

    const payload = await encryptTranscript(transcript, {
      conversationId: transcript.conversationId,
      key,
    });

    const decrypted = await decryptTranscript(payload, {
      conversationId: transcript.conversationId,
      key,
    });

    expect(decrypted).toEqual(transcript);
  });

  it("fails when associated data mismatches", async () => {
    const key = await createMasterKey();
    const transcript: Transcript = {
      conversationId: "conv-1",
      messages: [],
      schemaVersion: 1,
    };

    const payload = await encryptTranscript(transcript, {
      conversationId: transcript.conversationId,
      key,
    });

    await expect(
      decryptTranscript(payload, { conversationId: "conv-2", key })
    ).rejects.toThrow("Unable to decrypt transcript");
  });
});
