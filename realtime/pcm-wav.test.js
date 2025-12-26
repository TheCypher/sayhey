const { buildWavBuffer } = require("./pcm-wav");

describe("buildWavBuffer", () => {
  it("builds a WAV header with the expected length and sample rate", () => {
    const pcm = Buffer.from([0, 1, 2, 3]);
    const wav = buildWavBuffer(pcm, 16000, 1);

    expect(wav.length).toBe(44 + pcm.length);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt32LE(24)).toBe(16000);
  });
});
