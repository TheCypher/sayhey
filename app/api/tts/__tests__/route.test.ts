import { POST } from "../route";

describe("POST /api/tts", () => {
  const originalKey = process.env.ELEVENLABS_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.ELEVENLABS_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  it("returns 400 when text is missing", async () => {
    process.env.ELEVENLABS_API_KEY = "test";

    const response = await POST(
      new Request("http://localhost/api/tts", {
        method: "POST",
        body: JSON.stringify({ text: "" }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing text to synthesize");
  });

  it("returns 500 when API key is missing", async () => {
    process.env.ELEVENLABS_API_KEY = "";

    const response = await POST(
      new Request("http://localhost/api/tts", {
        method: "POST",
        body: JSON.stringify({ text: "Hello" }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("ELEVENLABS_API_KEY is not configured");
  });

  it("returns 502 when upstream synthesis fails", async () => {
    process.env.ELEVENLABS_API_KEY = "test";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const response = await POST(
      new Request("http://localhost/api/tts", {
        method: "POST",
        body: JSON.stringify({ text: "Hello" }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("TTS synthesis failed");
  });

  it("returns audio bytes on success", async () => {
    process.env.ELEVENLABS_API_KEY = "test";
    global.fetch = jest.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      })
    );

    const response = await POST(
      new Request("http://localhost/api/tts", {
        method: "POST",
        body: JSON.stringify({ text: "Hello" }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
  });
});
