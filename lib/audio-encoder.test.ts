import { encodePcm16 } from "./audio-encoder";

describe("encodePcm16", () => {
  it("clamps and converts float samples to 16-bit PCM", () => {
    const input = new Float32Array([-1, -0.5, 0, 0.5, 1, 1.5]);
    const output = encodePcm16(input);

    expect(Array.from(output)).toEqual([
      -32768,
      -16384,
      0,
      16384,
      32767,
      32767,
    ]);
  });
});
