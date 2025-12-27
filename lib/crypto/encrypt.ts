import { base64ToBytes, bytesToBase64 } from "./encoding";
import { getWebCrypto } from "./web-crypto";
import type { EncryptedTranscriptPayload, Transcript } from "../storage/types";

const ENVELOPE_VERSION = 1;

const buildAad = (conversationId: string, schemaVersion: number) =>
  `conversation:${conversationId}|schema:${schemaVersion}`;

const parseSchemaVersion = (aadText: string) => {
  const match = aadText.match(/schema:(\d+)/);
  if (!match) {
    return 1;
  }
  const parsed = Number(match[1]);
  return Number.isNaN(parsed) ? 1 : parsed;
};

export const encryptTranscript = async (
  transcript: Transcript,
  options: {
    conversationId: string;
    key: CryptoKey;
    now?: () => number;
  }
): Promise<EncryptedTranscriptPayload> => {
  const crypto = getWebCrypto();
  const encoder = new TextEncoder();
  const schemaVersion = transcript.schemaVersion ?? 1;
  const aadText = buildAad(options.conversationId, schemaVersion);
  const aadBytes = encoder.encode(aadText);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(transcript));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aadBytes,
    },
    options.key,
    plaintext
  );
  const now = options.now ? options.now() : Date.now();

  return {
    v: ENVELOPE_VERSION,
    alg: "AES-GCM",
    nonce: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
    aad: bytesToBase64(aadBytes),
    createdAt: now,
    updatedAt: now,
  };
};

export const decryptTranscript = async (
  payload: EncryptedTranscriptPayload,
  options: {
    conversationId: string;
    key: CryptoKey;
  }
): Promise<Transcript> => {
  const crypto = getWebCrypto();
  const encoder = new TextEncoder();
  const aadText = payload.aad
    ? new TextDecoder().decode(base64ToBytes(payload.aad))
    : buildAad(options.conversationId, 1);
  const expectedAad = buildAad(
    options.conversationId,
    parseSchemaVersion(aadText)
  );
  if (aadText !== expectedAad) {
    throw new Error("Unable to decrypt transcript");
  }
  const aadBytes = encoder.encode(aadText);
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBytes(payload.nonce),
        additionalData: aadBytes,
      },
      options.key,
      base64ToBytes(payload.ciphertext)
    );
    const decoded = new TextDecoder().decode(plaintext);
    return JSON.parse(decoded) as Transcript;
  } catch (error) {
    throw new Error("Unable to decrypt transcript");
  }
};
