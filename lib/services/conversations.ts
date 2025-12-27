import { decryptTranscript, encryptTranscript } from "../crypto/encrypt";
import type {
  ConversationIndexItem,
  ConversationStore,
  Message,
  Transcript,
} from "../storage/types";

const DEFAULT_TITLE = "Untitled chat";
const SCHEMA_VERSION = 1;
const PREVIEW_LIMIT = 120;

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const createIdFallback = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `conv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const buildPreview = (message: Message) =>
  normalizeText(message.content).slice(0, PREVIEW_LIMIT);

const isDefaultTitle = (title?: string | null) => {
  if (!title) {
    return true;
  }
  const trimmed = title.trim();
  return !trimmed || trimmed === DEFAULT_TITLE;
};

export const createConversationService = (options: {
  store: ConversationStore;
  getKey: () => Promise<CryptoKey>;
  now?: () => number;
  createId?: () => string;
}) => {
  const now = options.now ?? (() => Date.now());
  const createId = options.createId ?? createIdFallback;

  const createConversation = async () => {
    const id = createId();
    const timestamp = now();
    const item: ConversationIndexItem = {
      id,
      title: DEFAULT_TITLE,
      preview: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      pinned: false,
      archived: false,
      messageCount: 0,
      schemaVersion: SCHEMA_VERSION,
    };

    await options.store.saveConversation(item);

    const transcript: Transcript = {
      conversationId: id,
      messages: [],
      schemaVersion: SCHEMA_VERSION,
    };
    const key = await options.getKey();
    const payload = await encryptTranscript(transcript, {
      conversationId: id,
      key,
      now,
    });
    await options.store.saveTranscript({ conversationId: id, payload });

    return item;
  };

  const listConversations = async () => options.store.listConversations();

  const loadConversation = async (conversationId: string) => {
    const payload = await options.store.getTranscript(conversationId);
    if (!payload) {
      return null;
    }
    const key = await options.getKey();
    return decryptTranscript(payload, { conversationId, key });
  };

  const appendMessage = async (conversationId: string, message: Message) => {
    const existingTranscript = await loadConversation(conversationId);
    const transcript: Transcript = existingTranscript ?? {
      conversationId,
      messages: [],
      schemaVersion: SCHEMA_VERSION,
    };
    transcript.messages = [...transcript.messages, message];

    const key = await options.getKey();
    const payload = await encryptTranscript(transcript, {
      conversationId,
      key,
      now,
    });
    await options.store.saveTranscript({ conversationId, payload });

    const existingIndex = await options.store.getConversation(conversationId);
    const timestamp = now();
    const previewSource = transcript.messages[0] ?? message;
    const preview = buildPreview(previewSource);
    const shouldAutoTitle =
      isDefaultTitle(existingIndex?.title) &&
      (existingIndex?.messageCount ?? 0) === 0;
    const nextTitle = shouldAutoTitle
      ? preview || DEFAULT_TITLE
      : existingIndex?.title ?? DEFAULT_TITLE;
    const updatedIndex: ConversationIndexItem = {
      id: conversationId,
      title: nextTitle,
      preview,
      createdAt: existingIndex?.createdAt ?? timestamp,
      updatedAt: timestamp,
      pinned: existingIndex?.pinned ?? false,
      archived: existingIndex?.archived ?? false,
      messageCount: (existingIndex?.messageCount ?? 0) + 1,
      schemaVersion: existingIndex?.schemaVersion ?? SCHEMA_VERSION,
    };
    await options.store.saveConversation(updatedIndex);
  };

  const ensurePreviewFromTranscript = async (conversationId: string) => {
    const existingIndex = await options.store.getConversation(conversationId);
    if (!existingIndex) {
      return null;
    }
    const transcript = await loadConversation(conversationId);
    const firstMessage = transcript?.messages?.[0];
    if (!firstMessage) {
      return existingIndex;
    }
    const preview = buildPreview(firstMessage);
    const nextTitle = isDefaultTitle(existingIndex.title)
      ? preview || DEFAULT_TITLE
      : existingIndex.title;
    if (preview === existingIndex.preview && nextTitle === existingIndex.title) {
      return existingIndex;
    }
    const updatedIndex: ConversationIndexItem = {
      ...existingIndex,
      preview,
      title: nextTitle,
    };
    await options.store.saveConversation(updatedIndex);
    return updatedIndex;
  };

  const renameConversation = async (conversationId: string, title: string) => {
    const existing = await options.store.getConversation(conversationId);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, title, updatedAt: now() };
    await options.store.saveConversation(updated);
    return updated;
  };

  const pinConversation = async (conversationId: string, pinned: boolean) => {
    const existing = await options.store.getConversation(conversationId);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, pinned, updatedAt: now() };
    await options.store.saveConversation(updated);
    return updated;
  };

  const archiveConversation = async (
    conversationId: string,
    archived: boolean
  ) => {
    const existing = await options.store.getConversation(conversationId);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, archived, updatedAt: now() };
    await options.store.saveConversation(updated);
    return updated;
  };

  const deleteConversation = async (conversationId: string) => {
    await options.store.deleteConversation(conversationId);
    await options.store.deleteTranscript(conversationId);
  };

  return {
    createConversation,
    listConversations,
    loadConversation,
    appendMessage,
    ensurePreviewFromTranscript,
    renameConversation,
    pinConversation,
    archiveConversation,
    deleteConversation,
  };
};
