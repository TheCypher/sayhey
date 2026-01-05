export type MessageRole = "user" | "assistant" | "system" | "tool";

export type AttachmentMeta = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  dataUrl?: string;
  position?: number;
};

export type IntentSource = {
  id: string;
  type: "sentence" | "paragraph" | "attachment";
  sentenceIndex?: number;
  paragraphIndex?: number;
  attachmentId?: string;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  intent?: string | null;
  intentSources?: IntentSource[];
  createdAt: number;
  attachments?: AttachmentMeta[];
  tokens?: number;
};

export type Transcript = {
  conversationId: string;
  messages: Message[];
  meta?: Record<string, unknown>;
  schemaVersion: number;
};

export type ConversationIndexItem = {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  archived: boolean;
  messageCount: number;
  schemaVersion: number;
};

export type EncryptedTranscriptPayload = {
  v: number;
  alg: "AES-GCM";
  nonce: string;
  ciphertext: string;
  aad?: string;
  createdAt: number;
  updatedAt: number;
};

export type TranscriptRecord = {
  conversationId: string;
  payload: EncryptedTranscriptPayload;
};

export type ConversationStore = {
  listConversations: () => Promise<ConversationIndexItem[]>;
  getConversation: (id: string) => Promise<ConversationIndexItem | null>;
  saveConversation: (item: ConversationIndexItem) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  getTranscript: (conversationId: string) => Promise<EncryptedTranscriptPayload | null>;
  saveTranscript: (record: TranscriptRecord) => Promise<void>;
  deleteTranscript: (conversationId: string) => Promise<void>;
  getMeta: (key: string) => Promise<string | null>;
  setMeta: (key: string, value: string) => Promise<void>;
};
