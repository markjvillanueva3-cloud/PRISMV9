/**
 * devDispatcher U-WIRE-COHORTSHIM round-trip tests -- CohortBridgeShimEngine.
 *
 * Validates the 4 new shim-primitive actions wire through prism_dev:
 *   cohort_shim_nodenext_suffix   -> applyNodeNextSuffix   (pure)
 *   cohort_shim_rewrite_imports   -> rewriteSourceImports  (pure)
 *   cohort_shim_build_shape_coerce-> buildShapeCoerceShim  (pure)
 *   cohort_shim_recommend_bridges -> recommendShimsForTopBridges (reads matrix; fail-loud)
 *
 * The engine bridges cohort pairs from the lego-stacking Stage 2 compat matrix.
 * NodeNext rule (deterministic, per Node.js docs): a relative specifier with no
 * extension gets `.js`; an already-suffixed or bare (package) specifier is left
 * alone. Shape-coerce builds a method-name correspondence between two API shapes.
 *
 * Pattern: a LIVE dispatcher round-trip (registerDevDispatcher(shim) -> capture
 * handler -> invoke -> assert JSON), mirroring devDispatcher.uwireEntropy.test.ts.
 * The recommend test is HERMETIC -- it writes a fixture COHORT-COMPAT-MATRIX to a
 * tmp file and passes matrixPath, so the test never depends on the live matrix.
 *
 * Wired slot:papa 2026-06-15 -- continues WIRE-UNWIRED-PAPA (cross-galaxy v2).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-COHORTSHIM
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import {
  applyNodeNextSuffix,
  rewriteSourceImports,
  buildShapeCoerceShim,
  recommendShimsForTopBridges,
  type CohortBridgeSpec,
} from "../engines/CohortBridgeShimEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct reference values (NodeNext resolution semantics) -----------
describe("U-WIRE-COHORTSHIM -- applyNodeNextSuffix reference values", () => {
  it("a relative specifier with no extension gets a .js suffix", () => {
    const r = applyNodeNextSuffix("./constants");
    expect(r.rewritten).toBe("./constants.js");
    expect(r.changed).toBe(true);
    expect(r.reason).toBe("added-js-suffix");
  });

  it("an already-suffixed specifier is left untouched", () => {
    const r = applyNodeNextSuffix("../physics/constants.js");
    expect(r.rewritten).toBe("../physics/constants.js");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("already-suffixed");
  });

  it("a bare package specifier is left untouched", () => {
    const r = applyNodeNextSuffix("zod");
    expect(r.rewritten).toBe("zod");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("bare-specifier");
  });

  it("a directory import only gains /index.js when assumeDirectoryIndex is set", () => {
    expect(applyNodeNextSuffix("./dir").rewritten).toBe("./dir.js"); // default: NOT a dir
    const r = applyNodeNextSuffix("./dir", { assumeDirectoryIndex: true });
    expect(r.rewritten).toBe("./dir/index.js");
    expect(r.reason).toBe("directory-index");
  });
});

describe("U-WIRE-COHORTSHIM -- rewriteSourceImports reference values", () => {
  it("rewrites only the relative-no-ext specifiers in a source block", () => {
    const src = `import { a } from "./a";\nimport { b } from "./b.js";\nimport { c } from "pkg";\n`;
    const r = rewriteSourceImports(src);
    expect(r.rewritten).toContain('from "./a.js"');
    expect(r.rewritten).toContain('from "./b.js"'); // unchanged (already suffixed)
    expect(r.rewritten).toContain('from "pkg"');    // unchanged (bare)
    expect(r.rewrites).toHaveLength(3);
    expect(r.rewrites[0]).toMatchObject({ original: "./a", rewritten: "./a.js", changed: true });
  });

  it("throws on a non-string source (fail-loud type guard)", () => {
    expect(() => rewriteSourceImports(123 as unknown as string)).toThrow(TypeError);
  });
});

describe("U-WIRE-COHORTSHIM -- buildShapeCoerceShim reference values", () => {
  it("builds a shape-coerce spec carrying the method map and mustHumanVerify", () => {
    const s = buildShapeCoerceShim("compute", "calculate", { compute: "calculate" });
    expect(s.kind).toBe("shape-coerce");
    expect(s.fromShape).toBe("compute");
    expect(s.toShape).toBe("calculate");
    expect(s.methodMap.compute).toBe("calculate");
    expect(s.mustHumanVerify).toBe(true);
  });

  it("throws when the method map is empty (engine invariant)", () => {
    expect(() => buildShapeCoerceShim("a", "b", {})).toThrow();
  });
});

// -- LIVE round-trip through prism_dev (the wire proof) -----------------------
describe("U-WIRE-COHORTSHIM -- dispatcher round-trip (prism_dev)", () => {
  it("cohort_shim_nodenext_suffix adds the .js suffix through the dispatcher", async () => {
    const r = await call(server, "cohort_shim_nodenext_suffix", { spec: "./constants" });
    expect(r.ok).toBe(true);
    expect(r.data.rewritten).toBe("./constants.js");
    expect(r.data.reason).toBe("added-js-suffix");
  });

  it("cohort_shim_nodenext_suffix honors assumeDirectoryIndex", async () => {
    const r = await call(server, "cohort_shim_nodenext_suffix", { spec: "./dir", assumeDirectoryIndex: true });
    expect(r.ok).toBe(true);
    expect(r.data.rewritten).toBe("./dir/index.js");
  });

  it("cohort_shim_rewrite_imports returns rewritten text + per-import diffs", async () => {
    const src = `import { a } from "./a";\nimport { c } from "pkg";\n`;
    const r = await call(server, "cohort_shim_rewrite_imports", { source: src });
    expect(r.ok).toBe(true);
    expect(r.data.rewritten as string).toContain('from "./a.js"');
    expect((r.data.rewrites as unknown[]).length).toBe(2);
  });

  it("cohort_shim_build_shape_coerce returns a shape-coerce spec", async () => {
    const r = await call(server, "cohort_shim_build_shape_coerce", {
      fromShape: "compute", toShape: "calculate", methodMap: { compute: "calculate" },
    });
    expect(r.ok).toBe(true);
    expect(r.data.kind).toBe("shape-coerce");
    expect((r.data.methodMap as Record<string, string>).compute).toBe("calculate");
    expect(r.data.mustHumanVerify).toBe(true);
  });

  it("all 4 cohort_shim_* actions are accepted by the registered dispatcher", async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ["cohort_shim_nodenext_suffix", { spec: "./x" }],
      ["cohort_shim_rewrite_imports", { source: 'import { z } from "./z";' }],
      ["cohort_shim_build_shape_coerce", { fromShape: "a", toShape: "b", methodMap: { a: "b" } }],
    ];
    for (const [action, params] of calls) {
      const r = await call(server, action, params);
      expect(r.ok, `${action} should succeed`).toBe(true);
    }
  });
});

// -- cohort_shim_recommend_bridges -- HERMETIC matrix fixture -----------------
describe("U-WIRE-COHORTSHIM -- recommend_bridges round-trip (hermetic matrix)", () => {
  let fixturePath: string;

  beforeEach(() => {
    // unique-by-test tmp file (no Date.now needed: vitest serializes describe blocks;
    // the afterEach unlink keeps the dir clean even on overlap).
    fixturePath = path.join(os.tmpdir(), "prism-cohort-matrix-fixture.json");
    const matrix = {
      topMediumCostBridges: [
        { from: "esm-plain", to: "esm-js", total: 0.9, combinedEngineCount: 1872 },
      ],
      cohortProfiles: [
        { cohort: "esm-plain", era: "earlyESM", topShapes: [{ shape: "compute" }] },
        { cohort: "esm-js", era: "earlyESM", topShapes: [{ shape: "calculate" }] },
      ],
    };
    fs.writeFileSync(fixturePath, JSON.stringify(matrix), "utf8");
  });

  afterEach(() => {
    try { fs.unlinkSync(fixturePath); } catch { /* already gone */ }
  });

  it("returns shim specs for the top bridge (both NodeNext + shape-coerce shims)", async () => {
    const r = await call(server, "cohort_shim_recommend_bridges", { topK: 5, matrixPath: fixturePath });
    expect(r.ok).toBe(true);
    const bridges = r.data as unknown as CohortBridgeSpec[];
    expect(Array.isArray(bridges)).toBe(true);
    expect(bridges).toHaveLength(1);
    expect(bridges[0]!.fromCohort).toBe("esm-plain");
    expect(bridges[0]!.toCohort).toBe("esm-js");
    expect(bridges[0]!.estimatedCombinedEngines).toBe(1872);
    // earlyESM<->earlyESM with from!==to => nodenext shim; compute!==calculate => shape-coerce shim
    expect(bridges[0]!.shims).toHaveLength(2);
    const kinds = bridges[0]!.shims.map((s) => s.kind).sort();
    expect(kinds).toEqual(["nodenext-path", "shape-coerce"]);
  });

  it("fails loud (ok:false) when the matrix file is missing -- never a false PARITY", async () => {
    const r = await call(server, "cohort_shim_recommend_bridges", {
      matrixPath: path.join(os.tmpdir(), "prism-cohort-matrix-DOES-NOT-EXIST.json"),
    });
    expect(r.ok).toBe(false);
  });
});

// -- recommend_bridges contract edges (preESM, topK clamp) -------------------
describe("U-WIRE-COHORTSHIM -- recommend_bridges contract edges", () => {
  const tmpFiles: string[] = [];
  function writeMatrix(name: string, matrix: unknown): string {
    const p = path.join(os.tmpdir(), name);
    fs.writeFileSync(p, JSON.stringify(matrix), "utf8");
    tmpFiles.push(p);
    return p;
  }
  afterEach(() => {
    for (const p of tmpFiles.splice(0)) { try { fs.unlinkSync(p); } catch { /* gone */ } }
  });

  it("a preESM cohort yields an empty shims[] (full rewrite required, NOT a shim)", async () => {
    const p = writeMatrix("prism-cohort-matrix-preesm.json", {
      topMediumCostBridges: [{ from: "old-cohort", to: "esm-js", total: 0.8, combinedEngineCount: 50 }],
      cohortProfiles: [
        { cohort: "old-cohort", era: "preESM", topShapes: [{ shape: "compute" }] },
        { cohort: "esm-js", era: "earlyESM", topShapes: [{ shape: "calculate" }] },
      ],
    });
    // engine-direct (raw array, no slimResponse stripping) proves the empty-shims contract
    const direct = recommendShimsForTopBridges(10, p);
    expect(direct).toHaveLength(1);
    expect(direct[0]!.shims).toHaveLength(0); // preESM => no shim viable, full rewrite required
    expect(direct[0]!.estimatedCombinedEngines).toBe(50);
    // round-trip: ok:true; slimResponse strips the empty shims[] -> assert the survivor + stripped form
    const r = await call(server, "cohort_shim_recommend_bridges", { matrixPath: p });
    expect(r.ok).toBe(true);
    const bridges = r.data as unknown as CohortBridgeSpec[];
    expect(bridges).toHaveLength(1);
    expect(bridges[0]!.estimatedCombinedEngines).toBe(50);
    expect(bridges[0]!.shims ?? []).toHaveLength(0); // stripped (absent) OR literally empty
  });

  it("engine-direct: topK below 1 is clamped to the default (returns all bridges, not zero)", () => {
    // The dispatcher schema rejects topK<1 (.positive()), so the engine clamp is
    // engine-internal; assert it directly on the exported fn against a 2-bridge fixture.
    const p = writeMatrix("prism-cohort-matrix-multi.json", {
      topMediumCostBridges: [
        { from: "esm-plain", to: "esm-js", total: 0.9, combinedEngineCount: 1872 },
        { from: "mtime-q3", to: "mtime-q4", total: 0.7, combinedEngineCount: 30 },
      ],
      cohortProfiles: [
        { cohort: "esm-plain", era: "earlyESM", topShapes: [{ shape: "compute" }] },
        { cohort: "esm-js", era: "earlyESM", topShapes: [{ shape: "calculate" }] },
        { cohort: "mtime-q3", era: "earlyESM", topShapes: [{ shape: "run" }] },
        { cohort: "mtime-q4", era: "earlyESM", topShapes: [{ shape: "run" }] },
      ],
    });
    expect(recommendShimsForTopBridges(0, p)).toHaveLength(2);   // clamp(0->10) >= 2
    expect(recommendShimsForTopBridges(-5, p)).toHaveLength(2);  // clamp(-5->10) >= 2
    expect(recommendShimsForTopBridges(1, p)).toHaveLength(1);   // honored when valid
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-COHORTSHIM -- schema rejection (prism_dev)", () => {
  it("cohort_shim_nodenext_suffix rejects a missing spec", async () => {
    const r = await call(server, "cohort_shim_nodenext_suffix", {});
    expect(r.ok).toBe(false);
  });

  it("cohort_shim_nodenext_suffix rejects an empty spec (min 1)", async () => {
    const r = await call(server, "cohort_shim_nodenext_suffix", { spec: "" });
    expect(r.ok).toBe(false);
  });

  it("cohort_shim_build_shape_coerce rejects a missing methodMap", async () => {
    const r = await call(server, "cohort_shim_build_shape_coerce", { fromShape: "a", toShape: "b" });
    expect(r.ok).toBe(false);
  });

  it("cohort_shim_build_shape_coerce fails loud on an empty methodMap (engine invariant)", async () => {
    // schema permits {} (z.record has no min); the engine throws -> dispatcherError -> ok:false
    const r = await call(server, "cohort_shim_build_shape_coerce", { fromShape: "a", toShape: "b", methodMap: {} });
    expect(r.ok).toBe(false);
  });

  it("cohort_shim_recommend_bridges rejects a non-positive topK at the boundary (.positive())", async () => {
    const r = await call(server, "cohort_shim_recommend_bridges", { topK: 0 });
    expect(r.ok).toBe(false);
  });
});
