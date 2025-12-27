import type {
  ConversationIndexItem,
  ConversationStore,
  EncryptedTranscriptPayload,
  TranscriptRecord,
} from "./types";

export const createMemoryConversationStore = (): ConversationStore => {
  const conversations = new Map<string, ConversationIndexItem>();
  const transcripts = new Map<string, EncryptedTranscriptPayload>();
  const meta = new Map<string, string>();

  return {
    async listConversations() {
      return Array.from(conversations.values()).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
    },
    async getConversation(id) {
      return conversations.get(id) ?? null;
    },
    async saveConversation(item) {
      conversations.set(item.id, { ...item });
    },
    async deleteConversation(id) {
      conversations.delete(id);
    },
    async getTranscript(conversationId) {
      return transcripts.get(conversationId) ?? null;
    },
    async saveTranscript(record: TranscriptRecord) {
      transcripts.set(record.conversationId, record.payload);
    },
    async deleteTranscript(conversationId) {
      transcripts.delete(conversationId);
    },
    async getMeta(key) {
      return meta.get(key) ?? null;
    },
    async setMeta(key, value) {
      meta.set(key, value);
    },
  };
};
