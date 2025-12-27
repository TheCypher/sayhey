import { base64ToBytes, bytesToBase64 } from "./encoding";
import { getWebCrypto } from "./web-crypto";
import type { ConversationStore } from "../storage/types";

const MASTER_KEY_META_KEY = "masterKey.v1";

export const createMasterKey = async () => {
  const crypto = getWebCrypto();
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
};

export const exportMasterKey = async (key: CryptoKey) => {
  const crypto = getWebCrypto();
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToBase64(raw);
};

export const importMasterKey = async (base64: string) => {
  const crypto = getWebCrypto();
  const raw = base64ToBytes(base64);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
};

export const getOrCreateMasterKey = async (store: ConversationStore) => {
  const existing = await store.getMeta(MASTER_KEY_META_KEY);
  if (existing) {
    return importMasterKey(existing);
  }

  const key = await createMasterKey();
  const exported = await exportMasterKey(key);
  await store.setMeta(MASTER_KEY_META_KEY, exported);
  return key;
};
