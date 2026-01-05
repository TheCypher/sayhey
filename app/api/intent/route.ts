import { NextResponse } from "next/server";

import { getBoltRouter } from "@/lib/bolt/router";

type IntentSourceInput = {
  id: string;
  type: "sentence" | "paragraph" | "attachment";
  text: string;
};

const extractIntent = (result: unknown) => {
  if (typeof result === "string") {
    return result;
  }
  if (result && typeof result === "object") {
    const candidate = (result as { intent?: unknown }).intent;
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
  const entry = typeof body?.entry === "string" ? body.entry.trim() : "";
  const rawSources = Array.isArray(body?.sources) ? body.sources : [];
  const sources: IntentSourceInput[] = rawSources
    .map((source) => {
      if (!source || typeof source !== "object") {
        return null;
      }
      const candidate = source as Partial<IntentSourceInput>;
      if (typeof candidate.id !== "string") {
        return null;
      }
      if (
        candidate.type !== "sentence" &&
        candidate.type !== "paragraph" &&
        candidate.type !== "attachment"
      ) {
        return null;
      }
      if (typeof candidate.text !== "string") {
        return null;
      }
      return {
        id: candidate.id,
        type: candidate.type,
        text: candidate.text,
      };
    })
    .filter((item): item is IntentSourceInput => Boolean(item));

  if (!entry) {
    return NextResponse.json({ error: "Missing entry" }, { status: 400 });
  }

  try {
    const router = await getBoltRouter();
    const result = await router.route({
      id: `intent-${Date.now()}`,
      agentId: "intent",
      input: sources.length > 0 ? { entry, sources } : { entry },
    });
    const intent = extractIntent(result).trim();

    if (!intent) {
      return NextResponse.json(
        { error: "Intent request failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ intent });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Intent request failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
