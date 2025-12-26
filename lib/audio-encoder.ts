export function encodePcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);

  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
  }

  return output;
}
