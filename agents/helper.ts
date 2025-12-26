import type { Agent } from "@bolt-ai/core";

type ConversationHistoryItem = {
  role?: "user" | "assistant";
  content?: string;
};

type HelperInput = {
  message?: string;
  conversationHistory?: ConversationHistoryItem[];
};

const formatHistory = (history: ConversationHistoryItem[] = []) =>
  history
    .filter((item) => item?.content)
    .map((item) => {
      const role = item.role === "assistant" ? "Reply" : "Entry";
      return `${role}: ${item.content}`;
    })
    .join("\n");

const buildPrompt = (input: HelperInput) => {
  const history = formatHistory(input.conversationHistory);
  return [
    "You are a calm, concise journal helper who answers direct questions.",
    "Keep replies short and specific (3-6 sentences).",
    "If the student asked for steps, provide them clearly.",
    "Use Markdown for lists or code when helpful.",
    "Journal so far:",
    history || "(no prior messages)",
    `Entry: ${input.message ?? ""}`,
    "Reply:",
  ]
    .filter(Boolean)
    .join("\n");
};

const helperAgent: Agent = {
  id: "helper",
  description: "Voice-first journal helper for student questions.",
  capabilities: ["text"],
  async run({ input, call }) {
    const payload: HelperInput =
      typeof input === "string" ? { message: input } : (input ?? {});
    const prompt = buildPrompt(payload);
    const response = await call({ kind: "text", prompt });

    return typeof response === "string" ? response : JSON.stringify(response);
  },
};

export default helperAgent;
