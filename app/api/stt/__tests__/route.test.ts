import { POST } from "../route";

const createRequest = (audio?: Blob) => {
  const form = new FormData();
  if (audio) {
    form.append("audio", audio, "audio.webm");
  }
  return new Request("http://localhost/api/stt", {
    method: "POST",
    body: form,
  });
};

describe("POST /api/stt", () => {
  const originalKey = process.env.GROQ_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.GROQ_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  it("returns 400 when audio is missing", async () => {
    process.env.GROQ_API_KEY = "test";
    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing audio blob");
  });

  it("returns 500 when API key is missing", async () => {
    process.env.GROQ_API_KEY = "";
    const response = await POST(
      createRequest(new Blob(["audio"], { type: "audio/webm" }))
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("GROQ_API_KEY is not configured");
  });

  it("returns 502 when upstream transcription fails", async () => {
    process.env.GROQ_API_KEY = "test";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const response = await POST(
      createRequest(new Blob(["audio"], { type: "audio/webm" }))
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Transcription failed");
  });

  it("returns transcript and confidence on success", async () => {
    process.env.GROQ_API_KEY = "test";
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "hello",
          segments: [{ avg_logprob: -0.1 }],
        }),
        { status: 200 }
      )
    );

    const response = await POST(
      createRequest(new Blob(["audio"], { type: "audio/webm" }))
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transcript).toBe("hello");
    expect(data.confidence).toBeCloseTo(Math.exp(-0.1), 4);
  });
});
