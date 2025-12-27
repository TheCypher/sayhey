import { spawnSync } from "node:child_process";
import path from "node:path";

import { unwrapLayerAtRule } from "../unlayer";

describe("unlayer PostCSS helper", () => {
  it("unwraps @layer blocks with nodes", () => {
    const replaceWith = jest.fn();
    const remove = jest.fn();
    const nodes = [{ kind: "rule" }, { kind: "decl" }];

    unwrapLayerAtRule({ nodes, replaceWith, remove });

    expect(replaceWith).toHaveBeenCalledWith(...nodes);
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes empty @layer declarations", () => {
    const replaceWith = jest.fn();
    const remove = jest.fn();

    unwrapLayerAtRule({ nodes: [], replaceWith, remove });

    expect(remove).toHaveBeenCalled();
    expect(replaceWith).not.toHaveBeenCalled();
  });

  it("loads via the Node CJS loader for PostCSS", () => {
    const repoRoot = path.resolve(__dirname, "..", "..", "..");
    const result = spawnSync(
      process.execPath,
      ["-e", "require('./lib/postcss/unlayer.js')"],
      { cwd: repoRoot }
    );

    expect(result.status).toBe(0);
  });
});
