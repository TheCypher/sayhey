import { NextResponse } from "next/server";

import { getBoltRouter } from "@/lib/bolt/router";
import { looksLikeExplicitRequest } from "@/lib/explicit-request";

const VOICE_CONFIDENCE_THRESHOLD = 0.82;

const normalizeHistory = (history: unknown) => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((item) => {
      const role = item?.role === "assistant" ? "assistant" : "user";
      const content = typeof item?.content === "string" ? item.content : "";
      return content ? { role, content } : null;
    })
    .filter(Boolean)
    .slice(-8);
};

const extractAssistantMessage = (result: unknown) => {
  if (typeof result === "string") {
    return result;
  }
  if (result && typeof result === "object") {
    const candidate = (result as { assistantMessage?: unknown }).assistantMessage;
    if (typeof candidate === "string") {
      return candidate;
    }
    const alt = (result as { text?: unknown }).text;
    if (typeof alt === "string") {
      return alt;
    }
  }
  return "";
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const agentId = typeof body?.agentId === "string" ? body.agentId : "helper";
  const inputType = body?.inputType === "voice" ? "voice" : "text";
  const transcriptConfidence =
    typeof body?.transcriptConfidence === "number"
      ? body.transcriptConfidence
      : null;

  const conversationHistory = normalizeHistory(body?.conversationHistory);
  const isExplicitRequest = looksLikeExplicitRequest(message);
  const uncertainTranscript =
    inputType === "voice" &&
    typeof transcriptConfidence === "number" &&
    transcriptConfidence < VOICE_CONFIDENCE_THRESHOLD;

  if (!isExplicitRequest) {
    return NextResponse.json({
      assistantMessage: "",
      fieldUpdateResults: [],
      ignored: true,
      inputType,
      transcriptConfidence,
    });
  }

  try {
    const router = await getBoltRouter();
    const result = await router.route({
      id: `turn-${Date.now()}`,
      agentId,
      input: {
        message,
        conversationHistory,
        inputType,
        transcriptConfidence,
        uncertainTranscript,
      },
    });

    const assistantMessage = extractAssistantMessage(result);
    const fieldUpdateResults = Array.isArray(
      (result as { fieldUpdateResults?: unknown })?.fieldUpdateResults
    )
      ? (result as { fieldUpdateResults: unknown[] }).fieldUpdateResults
      : [];

    return NextResponse.json({
      assistantMessage,
      fieldUpdateResults: uncertainTranscript ? [] : fieldUpdateResults,
      uncertainTranscript,
      inputType,
      transcriptConfidence,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Chat turn failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
