const DIRECT_VERBS = [
  "reply",
  "respond",
  "answer",
  "help",
  "explain",
  "summarize",
  "tell",
  "give",
  "show",
  "walk",
  "review",
  "draft",
  "outline",
  "translate",
  "repeat",
  "read",
  "say",
  "check",
  "confirm",
];

const DIRECT_COMMAND_PATTERNS = [
  new RegExp(
    `^(?:\\s*(?:hey|hi|hello)\\b[,\\s]*)?(?:please\\s+)?(?:${DIRECT_VERBS.join(
      "|"
    )})\\b`
  ),
  new RegExp(
    `\\b(?:please\\s+)?(?:can|could|would|will)\\s+you\\s+(?:please\\s+)?(?:${DIRECT_VERBS.join(
      "|"
    )})\\b`
  ),
  new RegExp(`\\bplease\\s+(?:${DIRECT_VERBS.join("|")})\\b`),
  new RegExp(
    `\\bi\\s+(?:need|want|would like)\\s+you\\s+to\\s+(?:${DIRECT_VERBS.join(
      "|"
    )})\\b`
  ),
];

export const looksLikeExplicitRequest = (text: string) => {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return DIRECT_COMMAND_PATTERNS.some((pattern) => pattern.test(normalized));
};
