import type {
  ConversationIndexItem,
  ConversationStore,
  TranscriptRecord,
} from "./types";

const DB_NAME = "app_local_chat";
const DB_VERSION = 1;
const CONVERSATIONS_STORE = "conversations";
const TRANSCRIPTS_STORE = "transcripts";
const META_STORE = "meta";

const ensureIndexedDb = () => {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable");
  }
  return indexedDB;
};

const openDatabase = () => {
  ensureIndexedDb();
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        const store = db.createObjectStore(CONVERSATIONS_STORE, {
          keyPath: "id",
        });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("createdAt", "createdAt");
        store.createIndex("pinned_updatedAt", ["pinned", "updatedAt"]);
        store.createIndex("archived_updatedAt", ["archived", "updatedAt"]);
      }
      if (!db.objectStoreNames.contains(TRANSCRIPTS_STORE)) {
        db.createObjectStore(TRANSCRIPTS_STORE, {
          keyPath: "conversationId",
        });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, {
          keyPath: "key",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
) => {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error ?? request.error);
  });
};

export const createIndexedDbStore = (): ConversationStore => ({
  async listConversations() {
    const items = await withStore<ConversationIndexItem[]>(
      CONVERSATIONS_STORE,
      "readonly",
      (store) => store.getAll()
    );
    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async getConversation(id) {
    return withStore<ConversationIndexItem | undefined>(
      CONVERSATIONS_STORE,
      "readonly",
      (store) => store.get(id)
    ).then((value) => value ?? null);
  },
  async saveConversation(item) {
    await withStore(CONVERSATIONS_STORE, "readwrite", (store) =>
      store.put(item)
    );
  },
  async deleteConversation(id) {
    await withStore(CONVERSATIONS_STORE, "readwrite", (store) =>
      store.delete(id)
    );
  },
  async getTranscript(conversationId) {
    const record = await withStore<TranscriptRecord | undefined>(
      TRANSCRIPTS_STORE,
      "readonly",
      (store) => store.get(conversationId)
    );
    return record?.payload ?? null;
  },
  async saveTranscript(record) {
    await withStore(TRANSCRIPTS_STORE, "readwrite", (store) =>
      store.put(record)
    );
  },
  async deleteTranscript(conversationId) {
    await withStore(TRANSCRIPTS_STORE, "readwrite", (store) =>
      store.delete(conversationId)
    );
  },
  async getMeta(key) {
    const record = await withStore<{ key: string; value: string } | undefined>(
      META_STORE,
      "readonly",
      (store) => store.get(key)
    );
    return record?.value ?? null;
  },
  async setMeta(key, value) {
    await withStore(META_STORE, "readwrite", (store) =>
      store.put({ key, value })
    );
  },
});
