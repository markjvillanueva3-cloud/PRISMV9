/**
 * U-FORE-05 tests — InMemoryFileOverlayEngine + CounterfactualBuildSimulatorEngine
 *
 * Coverage floor per engine: happy path + ≥3 failure modes + ≥2 adversarial.
 * Variability: 4 plan shapes (clean create, bug-in-new-code, circular-import,
 * delete-with-dependents) exercise the simulator's decision surface.
 * Dispatcher round-trip included.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  InMemoryFileOverlayEngine,
} from "../engines/InMemoryFileOverlayEngine.js";
import {
  CounterfactualBuildSimulatorEngine,
  counterfactualBuildSimulatorEngine,
  type SimulationPlan,
} from "../engines/CounterfactualBuildSimulatorEngine.js";
import type { BuildStep } from "../engines/AtomicStepDecomposerEngine.js";

function makeSteps(n = 2): BuildStep[] {
  const out: BuildStep[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `S${i}`,
      kind: "write_engine",
      description: `step ${i}`,
      estTokens: 500,
      estDurationSec: 10,
      risk: 0.1,
      rollback: "revert write",
    } as BuildStep);
  }
  return out;
}

// ─── InMemoryFileOverlayEngine ──────────────────────────────────────

describe("InMemoryFileOverlayEngine — core ops", () => {
  it("write + read round-trips overlay content", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/engines/FooEngine.ts", "export const x = 1;");
    expect(o.read("src/engines/FooEngine.ts")).toBe("export const x = 1;");
  });

  it("read falls through to disk when path not overlaid", () => {
    const o = new InMemoryFileOverlayEngine();
    const real = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(real)) return;
    expect(o.read(real)).toContain("{");
  });

  it("delete makes read return null", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/engines/Foo.ts", "content");
    o.delete("src/engines/Foo.ts");
    expect(o.read("src/engines/Foo.ts")).toBeNull();
  });

  it("exists tracks overlay presence correctly", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/Foo.ts", "x");
    expect(o.exists("src/Foo.ts")).toBe(true);
    o.delete("src/Foo.ts");
    expect(o.exists("src/Foo.ts")).toBe(false);
  });

  it("countByOp tallies create/modify/delete", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("a.ts", "a");
    o.write("b.ts", "b");
    o.delete("c.ts");
    const c = o.countByOp();
    expect(c.create + c.modify).toBe(2);
    expect(c.delete).toBe(1);
  });

  it("diff reports byte deltas for creates", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/new-file-abc123.ts", "x".repeat(100));
    const d = o.diff();
    expect(d.created.length).toBe(1);
    expect(d.totalBytesAdded).toBeGreaterThanOrEqual(100);
  });

  it("fork produces an independent overlay", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("a.ts", "1");
    const child = o.fork();
    child.write("a.ts", "2");
    expect(o.read("a.ts")).toBe("1");
    expect(child.read("a.ts")).toBe("2");
  });

  it("reset clears all entries", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("a.ts", "x");
    o.reset();
    expect(o.has("a.ts")).toBe(false);
  });

  it("impactedTestFiles picks up overlaid test siblings", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/engines/FooEngine.ts", "export class FooEngine {}");
    o.write("src/engines/FooEngine.test.ts", "it('x', () => {})");
    const impacted = o.impactedTestFiles();
    expect(impacted.some((p) => p.endsWith("FooEngine.test.ts"))).toBe(true);
  });

  it("FAIL: write with non-string content throws", () => {
    const o = new InMemoryFileOverlayEngine();
    // @ts-expect-error
    expect(() => o.write("x.ts", 42)).toThrow(/must be a string/);
  });

  it("FAIL: empty path throws", () => {
    const o = new InMemoryFileOverlayEngine();
    expect(() => o.write("", "x")).toThrow(/non-empty string/);
  });

  it("ADV: normalizes backslash paths to forward slashes", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src\\engines\\Foo.ts", "x");
    expect(o.read("src/engines/Foo.ts")).toBe("x");
  });

  it("ADV: overlay with huge content still completes quickly", () => {
    const o = new InMemoryFileOverlayEngine();
    const start = Date.now();
    o.write("src/Big.ts", "x".repeat(200_000));
    const d = o.diff();
    expect(d.totalBytesAdded).toBeGreaterThanOrEqual(200_000);
    expect(Date.now() - start).toBeLessThan(200);
  });
});

// ─── CounterfactualBuildSimulatorEngine ─────────────────────────────

describe("CounterfactualBuildSimulatorEngine — simulate", () => {
  function clean(unitId = "U-C1"): SimulationPlan {
    return {
      unitId,
      steps: makeSteps(),
      plannedContent: {
        "src/engines/CleanEngine.ts":
          `import { KC1_1 } from "../physics/constants.js";\nexport class CleanEngine { compute(x: number) { return x * KC1_1; } }\n`,
        "src/__tests__/CleanEngine.test.ts":
          `it("works", () => { expect(1).toBe(1); });`,
      },
    };
  }

  it("happy path: clean plan → wouldPass=true", () => {
    const r = counterfactualBuildSimulatorEngine.simulate(clean());
    expect(r.wouldPass).toBe(true);
    expect(r.filesTouched).toBe(2);
    expect(r.typeErrors).toEqual([]);
    expect(r.circularImports).toEqual([]);
  });

  it("reports tokenDelta > 0 for creates", () => {
    const r = counterfactualBuildSimulatorEngine.simulate(clean());
    expect(r.tokenDelta).toBeGreaterThan(0);
  });

  it("confidence is between 0 and 1", () => {
    const r = counterfactualBuildSimulatorEngine.simulate(clean());
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("completes under 5s for a small plan", () => {
    const r = counterfactualBuildSimulatorEngine.simulate(clean());
    expect(r.elapsedMs).toBeLessThan(5000);
  });

  it("VARIABILITY #1: severity-5 finding → wouldPass=false", () => {
    const r = counterfactualBuildSimulatorEngine.simulate({
      unitId: "U-BAD1",
      steps: makeSteps(),
      plannedContent: {
        "src/engines/BadEngine.ts":
          'export function f() { throw new Error("not implemented"); }',
      },
    });
    expect(r.wouldPass).toBe(false);
    expect(r.gapFindings.some((f) => f.patternId === "not_implemented_throw")).toBe(true);
  });

  it("VARIABILITY #2: circular import detected between 2 overlay files", () => {
    const r = counterfactualBuildSimulatorEngine.simulate({
      unitId: "U-CYC",
      steps: makeSteps(),
      plannedContent: {
        "src/engines/A.ts": 'import { b } from "./B.js";\nexport const a = b;\n',
        "src/engines/B.ts": 'import { a } from "./A.js";\nexport const b = a;\n',
      },
    });
    expect(r.circularImports.length).toBeGreaterThan(0);
    expect(r.wouldPass).toBe(false);
  });

  it("VARIABILITY #3: type-error hint fires on 'as unknown as' double cast", () => {
    const r = counterfactualBuildSimulatorEngine.simulate({
      unitId: "U-T1",
      steps: makeSteps(),
      plannedContent: {
        "src/engines/Dbl.ts": "const x = (foo as unknown as Bar).thing;",
      },
    });
    expect(r.typeErrors.some((t) => /double assertion/.test(t.message))).toBe(true);
  });

  it("VARIABILITY #4: test file with severity-5 finding → failingTests includes it", () => {
    const r = counterfactualBuildSimulatorEngine.simulate({
      unitId: "U-ONLY",
      steps: makeSteps(),
      plannedContent: {
        "src/__tests__/Bad.test.ts": "it.only('x', () => { expect(1).toBe(1); });",
      },
    });
    expect(r.failingTests.some((t) => t.includes("Bad.test.ts"))).toBe(true);
  });

  it("zero disk writes during simulate (sentinel file never created)", () => {
    const sentinel = path.join(
      process.cwd(),
      "src/engines/SENTINEL_DO_NOT_EXIST_EVER_XYZ.ts"
    );
    counterfactualBuildSimulatorEngine.simulate({
      unitId: "U-Z",
      steps: makeSteps(),
      plannedContent: { [sentinel]: "export const x = 1;" },
    });
    expect(fs.existsSync(sentinel)).toBe(false);
  });

  it("FAIL: null plan throws", () => {
    // @ts-expect-error
    expect(() => counterfactualBuildSimulatorEngine.simulate(null)).toThrow(
      /must be an object/
    );
  });

  it("FAIL: missing unitId throws", () => {
    expect(() =>
      counterfactualBuildSimulatorEngine.simulate({
        steps: [],
      } as any)
    ).toThrow(/unitId required/);
  });

  it("FAIL: non-array steps throws", () => {
    expect(() =>
      counterfactualBuildSimulatorEngine.simulate({
        unitId: "U-X",
        steps: "nope",
      } as any)
    ).toThrow(/steps must be an array/);
  });

  it("ADV: empty plannedContent → wouldPass defaults true, zero findings", () => {
    const r = counterfactualBuildSimulatorEngine.simulate({
      unitId: "U-EMPTY",
      steps: makeSteps(),
      plannedContent: {},
    });
    expect(r.wouldPass).toBe(true);
    expect(r.filesTouched).toBe(0);
    expect(r.gapFindings).toEqual([]);
  });

  it("ADV: oversized file (100kB) simulates in under 1s", () => {
    const huge = "x".repeat(100_000);
    const r = counterfactualBuildSimulatorEngine.simulate({
      unitId: "U-BIG",
      steps: makeSteps(),
      plannedContent: { "src/engines/Big.ts": huge },
    });
    expect(r.elapsedMs).toBeLessThan(1000);
  });

  it("summarize renders a multi-line string", () => {
    const r = counterfactualBuildSimulatorEngine.simulate(clean());
    const s = counterfactualBuildSimulatorEngine.summarize(r);
    expect(s).toContain("Simulation");
    expect(s).toContain("U-C1");
    expect(s.split("\n").length).toBeGreaterThan(1);
  });
});

// ─── Dispatcher round-trip ──────────────────────────────────────────

describe("U-FORE-05 — dispatcher round-trip", () => {
  it("devDispatcher exposes simulate_build + overlay_preview actions", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"simulate_build"');
    expect(disp).toContain('"overlay_preview"');
    expect(disp).toContain("CounterfactualBuildSimulatorEngine.js");
    expect(disp).toContain("InMemoryFileOverlayEngine.js");
  });
});
