import Groq from "groq-sdk";

export type IntentAttachmentInput = {
  id: string;
  name?: string;
  dataUrl: string;
};

export type IntentAttachmentDescription = {
  id: string;
  description: string;
};

const buildImagePrompt = (name?: string) => {
  const nameHint = name?.trim();
  return [
    "Describe this image for a journal intent summary.",
    "Focus on visible people, objects, actions, setting, and any readable text.",
    "Keep it to 1-2 short sentences and avoid speculation.",
    "Return plain text only.",
    nameHint ? `Image filename: ${nameHint}` : null,
  ]
    .filter(Boolean)
    .join(" ");
};

export const describeIntentAttachments = async (
  attachments: IntentAttachmentInput[]
): Promise<IntentAttachmentDescription[]> => {
  if (attachments.length === 0) {
    return [];
  }

  const apiKey = process.env.GROQ_API_KEY ?? "";
  if (!apiKey) {
    return [];
  }

  const model =
    process.env.GROQ_VISION_MODEL ??
    process.env.GROQ_MODEL ??
    "llama-3.2-11b-vision-preview";
  const client = new Groq({ apiKey });

  const results = await Promise.all(
    attachments.map(async (attachment) => {
      try {
        const response = await client.chat.completions.create({
          model,
          temperature: 0.2,
          max_tokens: 120,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: buildImagePrompt(attachment.name) },
                {
                  type: "image_url",
                  image_url: { url: attachment.dataUrl },
                },
              ],
            },
          ],
        });
        const description =
          response.choices?.[0]?.message?.content?.trim() ?? "";

        if (!description) {
          return null;
        }

        return { id: attachment.id, description };
      } catch {
        return null;
      }
    })
  );

  return results.filter(
    (item): item is IntentAttachmentDescription => Boolean(item)
  );
};
