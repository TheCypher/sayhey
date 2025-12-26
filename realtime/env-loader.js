const fs = require("fs");
const path = require("path");

function parseEnvLine(line) {
  const cleaned = line.replace(/^export\s+/, "").trim();
  if (!cleaned || cleaned.startsWith("#")) {
    return null;
  }
  const eqIndex = cleaned.indexOf("=");
  if (eqIndex === -1) {
    return null;
  }
  const key = cleaned.slice(0, eqIndex).trim();
  let value = cleaned.slice(eqIndex + 1).trim();
  if (!key) {
    return null;
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  value = value.replace(/\\n/g, "\n");
  return { key, value };
}

function loadEnvFile(filepath, lockedKeys) {
  if (!fs.existsSync(filepath)) {
    return;
  }
  const content = fs.readFileSync(filepath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }
    if (lockedKeys.has(parsed.key)) {
      continue;
    }
    process.env[parsed.key] = parsed.value;
  }
}

function loadRealtimeEnv({ dir, files } = {}) {
  const cwd = dir || process.cwd();
  const mode = process.env.NODE_ENV || "development";
  const envFiles =
    files ||
    [
      ".env",
      `.env.${mode}`,
      ".env.local",
      `.env.${mode}.local`,
    ];
  const lockedKeys = new Set(Object.keys(process.env));
  for (const file of envFiles) {
    loadEnvFile(path.join(cwd, file), lockedKeys);
  }
}

module.exports = { loadRealtimeEnv };
