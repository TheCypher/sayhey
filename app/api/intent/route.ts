import { NextResponse } from "next/server";

import { getBoltRouter } from "@/lib/bolt/router";
import {
  describeIntentAttachments,
  type IntentAttachmentInput,
} from "@/lib/services/intent-attachments";

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

  const rawAttachments = Array.isArray(body?.attachments)
    ? body.attachments
    : [];
  const attachments: IntentAttachmentInput[] = rawAttachments
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") {
        return null;
      }
      const candidate = attachment as Partial<IntentAttachmentInput>;
      if (typeof candidate.id !== "string") {
        return null;
      }
      const dataUrl =
        typeof candidate.dataUrl === "string" ? candidate.dataUrl.trim() : "";
      if (!dataUrl.startsWith("data:image/")) {
        return null;
      }
      const name =
        typeof candidate.name === "string" ? candidate.name.trim() : undefined;
      return {
        id: candidate.id,
        name,
        dataUrl,
      };
    })
    .filter((item): item is IntentAttachmentInput => Boolean(item));

  try {
    const attachmentSourceIds = new Set(
      sources
        .filter((source) => source.type === "attachment")
        .map((source) => source.id)
    );
    const attachmentsForIntent = attachments.filter((attachment) =>
      attachmentSourceIds.has(attachment.id)
    );
    let attachmentDescriptions: Array<{
      id: string;
      description: string;
    }> = [];

    if (attachmentsForIntent.length > 0) {
      try {
        attachmentDescriptions = await describeIntentAttachments(
          attachmentsForIntent
        );
      } catch {
        attachmentDescriptions = [];
      }
    }

    const attachmentDescriptionsById = new Map(
      attachmentDescriptions.map((item) => [item.id, item.description])
    );
    const hydratedSources = sources.map((source) => {
      if (source.type !== "attachment") {
        return source;
      }
      const description = attachmentDescriptionsById.get(source.id);
      if (!description) {
        return source;
      }
      const label = source.text?.trim();
      return {
        ...source,
        text: label ? `${label}: ${description}` : description,
      };
    });

    const router = await getBoltRouter();
    const result = await router.route({
      id: `intent-${Date.now()}`,
      agentId: "intent",
      input:
        hydratedSources.length > 0
          ? { entry, sources: hydratedSources }
          : { entry },
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
