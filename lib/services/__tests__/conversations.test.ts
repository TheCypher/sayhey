import { webcrypto } from "crypto";

import { createMasterKey } from "../../crypto/keys";
import { createConversationService } from "../conversations";
import { createMemoryConversationStore } from "../../storage/memory-store";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as unknown as Crypto;
}

const buildService = async () => {
  const store = createMemoryConversationStore();
  const key = await createMasterKey();
  const service = createConversationService({
    store,
    getKey: async () => key,
    now: () => 1700000000000,
    createId: () => "conv-1",
  });
  return { store, service, key };
};

describe("conversation service", () => {
  it("creates a conversation with an empty transcript", async () => {
    const { service } = await buildService();

    const created = await service.createConversation();
    const transcript = await service.loadConversation(created.id);

    expect(created.title).toBe("Untitled chat");
    expect(transcript).not.toBeNull();
    expect(transcript?.messages).toEqual([]);
  });

  it("creates a conversation when appending the first message", async () => {
    const { service } = await buildService();

    const message = {
      id: "msg-1",
      role: "user" as const,
      content: "First entry",
      createdAt: 1700000000100,
    };

    const conversationId = await service.appendMessage(null, message);

    const list = await service.listConversations();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(conversationId);
    expect(list[0]?.messageCount).toBe(1);
    expect(list[0]?.preview).toBe("First entry");

    const transcript = await service.loadConversation(conversationId);
    expect(transcript?.messages).toEqual([message]);
  });

  it("appends messages and updates the index", async () => {
    const { service } = await buildService();

    const created = await service.createConversation();
    await service.appendMessage(created.id, {
      id: "msg-1",
      role: "user",
      content: "Hello world",
      createdAt: 1700000000100,
    });
    await service.appendMessage(created.id, {
      id: "msg-2",
      role: "assistant",
      content: "Second reply",
      createdAt: 1700000000200,
    });

    const list = await service.listConversations();
    const item = list.find((entry) => entry.id === created.id);
    expect(item?.messageCount).toBe(2);
    expect(item?.title).toBe("Hello world");
    expect(item?.preview).toBe("Hello world");

    const transcript = await service.loadConversation(created.id);
    expect(transcript?.messages).toHaveLength(2);
  });

  it("deletes conversations and transcripts", async () => {
    const { service } = await buildService();

    const created = await service.createConversation();
    await service.deleteConversation(created.id);

    const list = await service.listConversations();
    expect(list.find((entry) => entry.id === created.id)).toBeUndefined();
    await expect(service.loadConversation(created.id)).resolves.toBeNull();
  });

  it("backfills previews from the first message", async () => {
    const { service, store } = await buildService();

    const created = await service.createConversation();
    await service.appendMessage(created.id, {
      id: "msg-1",
      role: "user",
      content: "First message",
      createdAt: 1700000000100,
    });
    await service.appendMessage(created.id, {
      id: "msg-2",
      role: "assistant",
      content: "Latest message",
      createdAt: 1700000000200,
    });

    const existing = await store.getConversation(created.id);
    await store.saveConversation({
      ...(existing ?? created),
      preview: "Latest message",
      title: "Untitled chat",
    });

    const updated = await service.ensurePreviewFromTranscript(created.id);

    expect(updated?.preview).toBe("First message");
    expect(updated?.title).toBe("First message");
  });
});
