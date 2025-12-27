export const bytesToBase64 = (bytes: ArrayBuffer | Uint8Array) => {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  let binary = "";
  buffer.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
};

export const base64ToBytes = (base64: string) => {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};
