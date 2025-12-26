let routerPromise;

function getBoltRouter() {
  if (!routerPromise) {
    routerPromise = Promise.resolve().then(() => {
      const { createAppRouter } = require("@bolt-ai/core");
      const { createGroqProvider } = require("@bolt-ai/providers-groq");

      if (typeof createAppRouter !== "function") {
        throw new Error("bolt-router-unavailable");
      }

      const preset = process.env.BOLT_PRESET || "fast";
      const routerPromise = Promise.resolve(createAppRouter({ preset }));

      return routerPromise.then((router) => {
        if (typeof router?.registerProvider === "function") {
          router.registerProvider(createGroqProvider());
        }
        return router;
      });
    });
  }

  return routerPromise;
}

module.exports = { getBoltRouter };
