type PendingTranscript = {
  transcript: string;
  confidence: number | null;
  autoSave?: boolean;
};

type PendingTranscriptStore = {
  promise: Promise<PendingTranscript> | null;
  result: PendingTranscript | null;
};

const GLOBAL_KEY = "__heyPendingTranscript__" as const;

const getStore = (): PendingTranscriptStore => {
  const scope = globalThis as typeof globalThis & {
    __heyPendingTranscript__?: PendingTranscriptStore;
  };

  if (!scope[GLOBAL_KEY]) {
    scope[GLOBAL_KEY] = { promise: null, result: null };
  }

  return scope[GLOBAL_KEY];
};

export const setPendingTranscriptPromise = (
  promise: Promise<PendingTranscript>
) => {
  const store = getStore();
  store.promise = promise;
  store.result = null;

  promise
    .then((result) => {
      store.result = result;
    })
    .catch(() => {
      store.result = null;
    })
    .finally(() => {
      store.promise = null;
    });
};

export const consumePendingTranscript = async () => {
  const store = getStore();

  if (store.result) {
    const result = store.result;
    store.result = null;
    return result;
  }

  if (store.promise) {
    try {
      const result = await store.promise;
      store.result = null;
      return result;
    } catch {
      store.result = null;
      return null;
    }
  }

  return null;
};

export const resetPendingTranscript = () => {
  const store = getStore();
  store.promise = null;
  store.result = null;
};

export type { PendingTranscript };
