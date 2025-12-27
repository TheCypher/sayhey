export const getWebCrypto = () => {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    throw new Error("WebCrypto is unavailable");
  }
  return globalThis.crypto;
};
