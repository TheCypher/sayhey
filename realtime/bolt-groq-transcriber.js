const { runPlan } = require("@bolt-ai/core");
const { getBoltRouter } = require("./bolt-runtime");

const { FormData, Blob } = globalThis;

function createGroqSttClient({
  apiKey,
  endpoint,
  model,
  language,
  fetchImpl,
} = {}) {
  if (!apiKey) {
    throw new Error("missing-groq-api-key");
  }

  if (!fetchImpl) {
    throw new Error("fetch-unavailable");
  }

  if (!FormData || !Blob) {
    throw new Error("formdata-unavailable");
  }

  return async function transcribe(wavBuffer, options = {}) {
    const resolvedOptions =
      options && typeof options === "object" && ("signal" in options || "prompt" in options)
        ? options
        : { signal: options };
    const { signal, prompt } = resolvedOptions;
    const form = new FormData();
    const blob = new Blob([wavBuffer], { type: "audio/wav" });
    form.append("file", blob, "audio.wav");
    form.append("model", model);
    if (language) {
      form.append("language", language);
    }
    if (prompt) {
      form.append("prompt", prompt);
    }

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
      signal,
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    return data.text || data.transcription || data.data?.text || "";
  };
}

function createTranscriptionPlan() {
  const id = `stt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    steps: [
      {
        id: "transcribe",
        kind: "tool",
        toolId: "stt.groq",
      },
    ],
    outputs: ["transcribe"],
  };
}

function createBoltGroqTranscriber(options = {}) {
  const hasOption = (key) => Object.prototype.hasOwnProperty.call(options, key);
  const groqApiKey = hasOption("groqApiKey")
    ? options.groqApiKey
    : process.env.GROQ_API_KEY;
  const model = hasOption("model")
    ? options.model
    : process.env.GROQ_STT_MODEL || "whisper-large-v3";
  const language = hasOption("language")
    ? options.language
    : process.env.GROQ_STT_LANGUAGE;
  const endpoint = hasOption("endpoint")
    ? options.endpoint
    : process.env.GROQ_STT_ENDPOINT ||
      "https://api.groq.com/openai/v1/audio/transcriptions";
  const fetchImpl = options.fetch || globalThis.fetch;

  const transcribeWithGroq = createGroqSttClient({
    apiKey: groqApiKey,
    endpoint,
    model,
    language,
    fetchImpl,
  });

  return {
    async transcribe(wavBuffer, options = {}) {
      const { prompt } = options ?? {};
      const router = await getBoltRouter();
      const plan = createTranscriptionPlan();
      const tools = {
        "stt.groq": async (_args, ctx = {}) => ({
          text: await transcribeWithGroq(wavBuffer, {
            signal: ctx.signal,
            prompt,
          }),
        }),
      };

      const result = await runPlan(
        router,
        plan,
        {
          taskId: plan.id,
          agentId: "stt",
          input: "transcribe",
          tools,
        },
        { maxConcurrency: 1 }
      );

      const output = result?.outputs?.[plan.outputs[0]];
      return output?.text || "";
    },
  };
}

module.exports = { createBoltGroqTranscriber };
