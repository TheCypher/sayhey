import { createAppRouter, InMemoryStore, type AppRouter } from "@bolt-ai/core";
import { createGroqProvider } from "@bolt-ai/providers-groq";

import helperAgent from "@/agents/helper";
import intentAgent from "@/agents/intent";

let routerPromise: Promise<AppRouter> | null = null;

export const getBoltRouter = async () => {
  if (!routerPromise) {
    routerPromise = Promise.resolve().then(() => {
      const router = createAppRouter({
        providers: [createGroqProvider()],
        memory: new InMemoryStore(),
      });

      router.registerAgents({
        helper: helperAgent,
        intent: intentAgent,
      });

      return router;
    });
  }

  return routerPromise;
};
