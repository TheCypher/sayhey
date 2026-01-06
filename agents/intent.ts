import type { Agent } from "@bolt-ai/core";

type IntentInput = {
  entry?: string;
  sources?: Array<{
    id: string;
    type: "sentence" | "paragraph" | "attachment";
    text: string;
  }>;
};

const buildPrompt = (input: IntentInput) => {
  const entry = input.entry ?? "";
  const sources = input.sources ?? [];
  const hasSources = sources.length > 0;
  const sourceLines = hasSources
    ? [
        "Sources:",
        ...sources.map((source) => {
          const label =
            source.type === "sentence"
              ? "Sentence"
              : source.type === "paragraph"
                ? "Paragraph"
                : "Attachment";
          return `[${source.id}] ${label}: ${source.text}`;
        }),
      ]
    : [];
  return [
    "You interpret the intent behind a journal entry.",
    "Write in the user's voice using first-person language.",
    "Capture the goal and motivation without advice or next steps.",
    "Keep it concise but insightful (1-3 short sentences).",
    "Cite claims with bracketed source ids like [1], using the Sources list.",
    "Prefer sentence citations; cite paragraphs only if the intent spans them.",
    "Attachment sources include brief image descriptions.",
    "Cite attachments only if the intent references an image.",
    "No lists, headings, or markdown.",
    ...sourceLines,
    `Entry: ${entry}`,
    "Intent:",
  ]
    .filter(Boolean)
    .join("\n");
};

const intentAgent: Agent = {
  id: "intent",
  description: "Short, first-person intent summaries for journal entries.",
  capabilities: ["text"],
  async run({ input, call }) {
    const payload: IntentInput =
      typeof input === "string" ? { entry: input } : (input ?? {});
    const prompt = buildPrompt(payload);
    const response = await call({ kind: "text", prompt });

    return typeof response === "string" ? response : JSON.stringify(response);
  },
};

export default intentAgent;
