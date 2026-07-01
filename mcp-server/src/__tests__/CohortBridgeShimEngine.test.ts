/**
 * CohortBridgeShimEngine test — Stage 3 of lego-stacking.
 *
 * Concrete-value assertions only (no toBeDefined() stubs).
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  applyNodeNextSuffix,
  rewriteSourceImports,
  buildShapeCoerceShim,
  recommendShimsForTopBridges,
} from "../engines/CohortBridgeShimEngine.js";

describe("applyNodeNextSuffix", () => {
  it("adds .js suffix to relative imports without extension", () => {
    const r = applyNodeNextSuffix("./foo");
    expect(r.changed).toBe(true);
    expect(r.rewritten).toBe("./foo.js");
    expect(r.reason).toBe("added-js-suffix");
  });

  it("adds .js suffix to parent-relative imports", () => {
    const r = applyNodeNextSuffix("../bar/baz");
    expect(r.rewritten).toBe("../bar/baz.js");
    expect(r.changed).toBe(true);
  });

  it("leaves bare specifiers alone", () => {
    const r = applyNodeNextSuffix("node:fs");
    expect(r.changed).toBe(false);
    expect(r.rewritten).toBe("node:fs");
    expect(r.reason).toBe("bare-specifier");
  });

  it("leaves npm-package specifiers alone", () => {
    const r = applyNodeNextSuffix("zod");
    expect(r.changed).toBe(false);
    expect(r.rewritten).toBe("zod");
  });

  it("leaves already-suffixed paths alone (.js)", () => {
    const r = applyNodeNextSuffix("./foo.js");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("already-suffixed");
  });

  it("leaves already-suffixed paths alone (.mjs/.cjs/.json/.ts/.tsx/.node)", () => {
    for (const suffix of [".mjs", ".cjs", ".json", ".ts", ".tsx", ".node"]) {
      const r = applyNodeNextSuffix("./foo" + suffix);
      expect(r.changed).toBe(false);
    }
  });

  it("respects assumeDirectoryIndex=true for extensionless directories", () => {
    const r = applyNodeNextSuffix("./mydir", { assumeDirectoryIndex: true });
    expect(r.changed).toBe(true);
    expect(r.rewritten).toBe("./mydir/index.js");
    expect(r.reason).toBe("directory-index");
  });

  it("does NOT assume directory by default (deterministic fallback)", () => {
    const r = applyNodeNextSuffix("./mydir");
    expect(r.rewritten).toBe("./mydir.js");
  });

  it("handles empty string defensively", () => {
    const r = applyNodeNextSuffix("");
    expect(r.changed).toBe(false);
    expect(r.reason).toBe("empty-or-non-string");
  });
});

describe("rewriteSourceImports", () => {
  it("rewrites import-from with double-quoted specifier", () => {
    const src = `import { X } from "./foo";`;
    const r = rewriteSourceImports(src);
    expect(r.rewritten).toBe(`import { X } from "./foo.js";`);
    expect(r.rewrites).toHaveLength(1);
    expect(r.rewrites[0].changed).toBe(true);
  });

  it("rewrites import-from with single-quoted specifier", () => {
    const src = `import { Y } from './bar';`;
    const r = rewriteSourceImports(src);
    expect(r.rewritten).toBe(`import { Y } from './bar.js';`);
  });

  it("rewrites export-from clauses", () => {
    const src = `export { Z } from "./z";`;
    const r = rewriteSourceImports(src);
    expect(r.rewritten).toBe(`export { Z } from "./z.js";`);
  });

  it("rewrites dynamic import() expressions", () => {
    const src = `const m = await import("./lazy");`;
    const r = rewriteSourceImports(src);
    expect(r.rewritten).toBe(`const m = await import("./lazy.js");`);
  });

  it("leaves bare-specifier imports alone", () => {
    const src = `import { z } from "zod";`;
    const r = rewriteSourceImports(src);
    expect(r.rewritten).toBe(src);
    expect(r.rewrites[0].changed).toBe(false);
  });

  it("handles mixed imports in one file (only relatives rewritten)", () => {
    const src = `import a from "./a";\nimport b from "zod";\nimport c from "../c.ts";`;
    const r = rewriteSourceImports(src);
    expect(r.rewritten).toBe(`import a from "./a.js";\nimport b from "zod";\nimport c from "../c.ts";`);
    expect(r.rewrites).toHaveLength(3);
    expect(r.rewrites.filter(x => x.changed)).toHaveLength(1);
  });

  it("throws on non-string source", () => {
    expect(() => rewriteSourceImports(null as unknown as string)).toThrow(TypeError);
  });
});

describe("buildShapeCoerceShim", () => {
  it("builds a shim spec with the supplied method map", () => {
    const s = buildShapeCoerceShim("Engine", "Service", { compute: "calculate", run: "execute" });
    expect(s.kind).toBe("shape-coerce");
    expect(s.fromShape).toBe("Engine");
    expect(s.toShape).toBe("Service");
    expect(s.methodMap).toEqual({ compute: "calculate", run: "execute" });
    expect(s.mustHumanVerify).toBe(true);
  });

  it("rejects missing fromShape", () => {
    expect(() => buildShapeCoerceShim("", "Service", { a: "b" })).toThrow(/required/);
  });

  it("rejects empty methodMap", () => {
    expect(() => buildShapeCoerceShim("Engine", "Service", {})).toThrow(/methodMap/);
  });

  it("clones the method map (caller can't mutate via reference)", () => {
    const m: Record<string, string> = { x: "y" };
    const s = buildShapeCoerceShim("E", "S", m);
    m.x = "MUTATED";
    expect(s.methodMap.x).toBe("y");
  });
});

describe("recommendShimsForTopBridges", () => {
  it("throws when matrix file missing", () => {
    expect(() =>
      recommendShimsForTopBridges(5, "/nonexistent-path-xyz/matrix.json")
    ).toThrow(/COHORT-COMPAT-MATRIX missing/);
  });

  it("returns top-K shim specs from a planted matrix", () => {
    // Plant a minimal valid matrix file
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cbse-test-"));
    const matrixPath = path.join(dir, "matrix.json");
    fs.writeFileSync(matrixPath, JSON.stringify({
      topMediumCostBridges: [
        { from: "esm-js (current)", to: "esm-plain (pre)", total: 0.58, combinedEngineCount: 1872 },
        { from: "esm-plain (pre)", to: "mtime-q3", total: 0.59, combinedEngineCount: 783 },
        { from: "cjs-era (pre-ESM)", to: "esm-js (current)", total: 0.30, combinedEngineCount: 50 },
      ],
      cohortProfiles: [
        { cohort: "esm-js (current)", era: "currentESM", topShapes: [{ shape: "Engine", count: 28 }] },
        { cohort: "esm-plain (pre)", era: "earlyESM",   topShapes: [{ shape: "Engine", count: 29 }] },
        { cohort: "mtime-q3",         era: "earlyESM",   topShapes: [{ shape: "Service", count: 5 }] },
        { cohort: "cjs-era (pre-ESM)",era: "preESM",     topShapes: [{ shape: "Manager", count: 3 }] },
      ],
    }));

    const out = recommendShimsForTopBridges(10, matrixPath);
    expect(out).toHaveLength(3);

    // Pair #1: currentESM ↔ earlyESM with same shape → NodeNext shim only (no shape coerce)
    expect(out[0].fromCohort).toBe("esm-js (current)");
    expect(out[0].toCohort).toBe("esm-plain (pre)");
    expect(out[0].shims).toHaveLength(1);
    expect(out[0].shims[0].kind).toBe("nodenext-path");
    expect(out[0].estimatedCombinedEngines).toBe(1872);

    // Pair #2: earlyESM ↔ earlyESM with DIFFERENT shape (Engine→Service) → shape-coerce shim
    expect(out[1].shims.some(s => s.kind === "shape-coerce")).toBe(true);
    const shape = out[1].shims.find(s => s.kind === "shape-coerce")!;
    expect((shape as { fromShape: string; toShape: string }).fromShape).toBe("Engine");
    expect((shape as { fromShape: string; toShape: string }).toShape).toBe("Service");

    // Pair #3: preESM cohort → empty shims (full rewrite, no adapter viable)
    expect(out[2].shims).toEqual([]);
    expect(out[2].mustHumanVerify).toBe(true);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("clamps topK to >=1", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cbse-test-"));
    const matrixPath = path.join(dir, "matrix.json");
    fs.writeFileSync(matrixPath, JSON.stringify({
      topMediumCostBridges: [
        { from: "a", to: "b", total: 0.6, combinedEngineCount: 10 },
      ],
      cohortProfiles: [
        { cohort: "a", era: "currentESM", topShapes: [{ shape: "Engine", count: 1 }] },
        { cohort: "b", era: "currentESM", topShapes: [{ shape: "Engine", count: 1 }] },
      ],
    }));
    const out = recommendShimsForTopBridges(-5, matrixPath);
    expect(out).toHaveLength(1); // clamped to default 10, only 1 in matrix
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
