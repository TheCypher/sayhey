const fs = require("fs");
const os = require("os");
const path = require("path");

const { loadRealtimeEnv } = require("./env-loader");

function restoreEnv(snapshot) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, snapshot);
}

describe("realtime env loader", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    restoreEnv(envSnapshot);
  });

  it("loads .env files from a provided directory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "realtime-env-"));
    fs.writeFileSync(path.join(dir, ".env"), "GROQ_API_KEY=from-file\n");

    delete process.env.GROQ_API_KEY;
    loadRealtimeEnv({ dir });

    expect(process.env.GROQ_API_KEY).toBe("from-file");
  });
});
