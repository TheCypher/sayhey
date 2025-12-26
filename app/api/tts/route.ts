import { NextResponse } from "next/server";

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";
const DEFAULT_MODEL = "eleven_multilingual_v2";

const readErrorDetail = async (response: Response) => {
  try {
    const data = await response.json();
    return data?.detail || data?.error || data?.message || JSON.stringify(data);
  } catch {
    return undefined;
  }
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json(
      { error: "Missing text to synthesize" },
      { status: 400 }
    );
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_TTS_MODEL || DEFAULT_MODEL;
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    return NextResponse.json(
      { error: "TTS synthesis failed", detail },
      { status: 502 }
    );
  }

  const audioBuffer = await response.arrayBuffer();
  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
