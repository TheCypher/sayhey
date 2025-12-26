import { NextResponse } from "next/server";

const DEFAULT_ENDPOINT =
  "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-large-v3";

const computeConfidence = (data: any) => {
  if (typeof data?.confidence === "number") {
    return data.confidence;
  }

  const segments = Array.isArray(data?.segments) ? data.segments : [];
  const values = segments
    .map((segment: any) => segment?.avg_logprob)
    .filter((value: unknown) => typeof value === "number") as number[];

  if (values.length === 0) {
    return 0;
  }

  const avgLogProb = values.reduce((sum, value) => sum + value, 0) / values.length;
  const probability = Math.exp(avgLogProb);
  return Math.max(0, Math.min(1, probability));
};

const readErrorDetail = async (response: Response) => {
  try {
    const data = await response.json();
    return data?.error || data?.message || JSON.stringify(data);
  } catch {
    return undefined;
  }
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio blob" }, { status: 400 });
  }

  const endpoint = process.env.GROQ_STT_ENDPOINT || DEFAULT_ENDPOINT;
  const model = process.env.GROQ_STT_MODEL || DEFAULT_MODEL;
  const language = process.env.GROQ_STT_LANGUAGE;

  const upstream = new FormData();
  upstream.append("file", audio, "audio.webm");
  upstream.append("model", model);
  upstream.append("response_format", "verbose_json");
  if (language) {
    upstream.append("language", language);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: upstream,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    return NextResponse.json(
      { error: "Transcription failed", detail },
      { status: 502 }
    );
  }

  const data = await response.json();
  const transcript =
    typeof data?.text === "string"
      ? data.text
      : typeof data?.transcription === "string"
        ? data.transcription
        : "";
  const confidence = computeConfidence(data);

  return NextResponse.json({ transcript, confidence }, { status: 200 });
}
