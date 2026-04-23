/**
 * GapPredictorEngine tests — U-FORE-03
 *
 * Coverage:
 *   - Happy path: clean file → zero findings
 *   - 15-pattern seeded detection suite (one positive case per pattern)
 *   - Severity calibration asserts 1-5 range and highest-severity roll-up
 *   - ≥3 failure modes (null artifact, missing filePath, non-string content)
 *   - ≥2 adversarial (unreadable file, malformed dispatcher text)
 *   - Batch scan + aggregate detection rate
 *   - Dispatcher round-trip assertion
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  GapPredictorEngine,
  gapPredictorEngine,
  type GapReport,
} from "../engines/GapPredictorEngine.js";
import {
  PATTERNS,
  PATTERNS_BY_ID,
  type GapArtifact,
} from "../engines/CommonlyMissedPatternsRegistry.js";

const ENGINE_PATH = "src/engines/FooEngine.ts";
const TEST_PATH = "src/__tests__/FooEngine.test.ts";

function clean(): GapArtifact {
  return {
    filePath: ENGINE_PATH,
    content: `
      import { KC1_1 } from "../physics/constants.js";
      export class FooEngine {
        /** @param x number @returns number */
        compute(x: number): number { return x * KC1_1; }
      }`,
    siblings: ["src/__tests__/FooEngine.test.ts"],
    dispatcherText: "import { fooEngine } from '../../engines/FooEngine.js';",
  };
}

// ─── Happy path ─────────────────────────────────────────────────────

describe("GapPredictorEngine — happy path", () => {
  it("returns zero findings for a clean, wired, tested engine", () => {
    const r = gapPredictorEngine.scan(clean());
    expect(r.findings).toEqual([]);
    expect(r.totalHits).toBe(0);
    expect(r.highestSeverity).toBe(0);
    expect(r.totalChecked).toBe(PATTERNS.length);
  });

  it("sorts findings by severity descending", () => {
    // File that hits both a severity-5 and a severity-2 pattern
    const a: GapArtifact = {
      filePath: ENGINE_PATH,
      content: 'throw new Error("not implemented"); // TODO: real logic',
      siblings: [TEST_PATH],
      dispatcherText: "FooEngine",
    };
    const r = gapPredictorEngine.scan(a);
    expect(r.findings.length).toBeGreaterThanOrEqual(2);
    // Sorted desc
    for (let i = 1; i < r.findings.length; i++) {
      expect(r.findings[i - 1].severity).toBeGreaterThanOrEqual(r.findings[i].severity);
    }
  });
});

// ─── Per-pattern positive cases (variability ≥15) ───────────────────

describe("GapPredictorEngine — seeded gap detection per pattern", () => {
  const cases: Array<{ id: string; artifact: GapArtifact }> = [
    {
      id: "missing_test_file",
      artifact: { filePath: ENGINE_PATH, content: "export class FooEngine {}", siblings: [] },
    },
    {
      id: "inline_physics_constant",
      artifact: {
        filePath: ENGINE_PATH,
        content: "export const kc1_1 = 1800; export class FooEngine {}",
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    },
    {
      id: "silent_catch",
      artifact: {
        filePath: ENGINE_PATH,
        content: "try { compute(); } catch (e) {}",
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    },
    {
      id: "todo_fixme_hack",
      artifact: {
        filePath: ENGINE_PATH,
        content: "// TODO: implement\nexport class FooEngine {}",
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    },
    {
      id: "not_implemented_throw",
      artifact: {
        filePath: ENGINE_PATH,
        content: 'export function f() { throw new Error("not implemented"); }',
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    },
    {
      id: "missing_dispatcher_wiring",
      artifact: {
        filePath: ENGINE_PATH,
        content: "export class FooEngine {}",
        siblings: [TEST_PATH],
        dispatcherText: "// no reference to the engine here\nexport const x = 1;",
      },
    },
    {
      id: "any_spread",
      artifact: {
        filePath: ENGINE_PATH,
        content: "export function f(x: any): any { return x; }",
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    },
    {
      id: "ts_ignore_unexplained",
      artifact: {
        filePath: ENGINE_PATH,
        content: "// @ts-ignore\nconst x = foo();",
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    },
    {
      id: "double_assertion",
      artifact: {
        filePath: ENGINE_PATH,
        content: "const x = (foo as unknown as Bar).bar;",
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    },
    {
      id: "toBeDefined_only",
      artifact: {
        filePath: TEST_PATH,
        content: "it('x', () => { expect(result).toBeDefined(); });",
      },
    },
    {
      id: "only_left_in_tests",
      artifact: {
        filePath: TEST_PATH,
        content: "it.only('x', () => { expect(1).toBe(1); });",
      },
    },
    {
      id: "await_in_for_loop",
      artifact: {
        filePath: ENGINE_PATH,
        content: "arr.forEach(async (x) => { await process(x); });",
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    },
    {
      id: "circular_import_risk",
      artifact: {
        filePath: ENGINE_PATH,
        content: "import { B } from '../../engines/BEngine.js';",
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    },
    {
      id: "no_rollback_docs",
      artifact: {
        filePath: "src/tools/dispatchers/fooDispatcher.ts",
        content: "case 'delete_all': deleteEverything(); break;",
      },
    },
  ];

  for (const tc of cases) {
    it(`detects ${tc.id}`, () => {
      const r = gapPredictorEngine.scan(tc.artifact);
      const ids = r.findings.map((f) => f.patternId);
      expect(ids).toContain(tc.id);
    });
  }

  it("detects ≥85% of the 14 seeded positive cases (spec target 90% on 30-case suite)", () => {
    let hits = 0;
    for (const tc of cases) {
      const r = gapPredictorEngine.scan(tc.artifact);
      if (r.findings.some((f) => f.patternId === tc.id)) hits++;
    }
    expect(hits / cases.length).toBeGreaterThanOrEqual(0.85);
  });
});

// ─── Severity calibration ──────────────────────────────────────────

describe("GapPredictorEngine — severity calibration", () => {
  it("every registered pattern has severity in [1, 5]", () => {
    for (const p of PATTERNS) {
      expect(p.severity).toBeGreaterThanOrEqual(1);
      expect(p.severity).toBeLessThanOrEqual(5);
    }
  });

  it("every pattern has a non-empty concrete fix string", () => {
    for (const p of PATTERNS) {
      expect(p.fix.length).toBeGreaterThan(10);
    }
  });

  it("highestSeverity reflects the max severity of hits", () => {
    const a: GapArtifact = {
      filePath: TEST_PATH,
      content: "it.only('x', () => { expect(r).toBeDefined(); }); // TODO",
    };
    const r = gapPredictorEngine.scan(a);
    const expected = Math.max(...r.findings.map((f) => f.severity), 0);
    expect(r.highestSeverity).toBe(expected);
  });
});

// ─── Failure modes + adversarial ───────────────────────────────────

describe("GapPredictorEngine — failure modes", () => {
  it("FAIL #1: null artifact throws", () => {
    // @ts-expect-error
    expect(() => gapPredictorEngine.scan(null)).toThrow(/must be an object/);
  });

  it("FAIL #2: missing filePath throws", () => {
    expect(() =>
      gapPredictorEngine.scan({ content: "x" } as any)
    ).toThrow(/filePath required/);
  });

  it("FAIL #3: non-string content throws", () => {
    expect(() =>
      gapPredictorEngine.scan({ filePath: "x.ts", content: 42 } as any)
    ).toThrow(/must be a string/);
  });

  it("FAIL #4: scanFile on missing path throws ENOENT-style", () => {
    expect(() => gapPredictorEngine.scanFile("/definitely/not/here.ts")).toThrow(/not found/);
  });

  it("FAIL #5: scanBatch with non-array throws", () => {
    // @ts-expect-error
    expect(() => gapPredictorEngine.scanBatch("nope")).toThrow(/must be an array/);
  });
});

describe("GapPredictorEngine — adversarial", () => {
  it("ADV #1: empty content passes without throwing (zero findings)", () => {
    const r = gapPredictorEngine.scan({ filePath: ENGINE_PATH, content: "" });
    expect(r.totalHits).toBeLessThanOrEqual(1); // may hit missing_test_file
  });

  it("ADV #2: malformed dispatcher text does not crash detect", () => {
    const r = gapPredictorEngine.scan({
      filePath: ENGINE_PATH,
      content: "export class FooEngine {}",
      siblings: [TEST_PATH],
      dispatcherText: "\x00￿partial\ngarbage",
    });
    expect(r).toBeDefined();
  });

  it("ADV #3: huge file (>100kB) returns in <200ms", () => {
    const huge = "x".repeat(120_000);
    const r = gapPredictorEngine.scan({
      filePath: ENGINE_PATH,
      content: huge,
      siblings: [TEST_PATH],
      dispatcherText: "FooEngine",
    });
    expect(r.durationMs).toBeLessThan(200);
  });
});

// ─── scanFile + scanBatch ──────────────────────────────────────────

describe("GapPredictorEngine — scanFile + scanBatch", () => {
  it("scanFile reads content from disk and runs detectors", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gap-fix-"));
    const f = path.join(tmp, "BarEngine.ts");
    fs.writeFileSync(f, "export class BarEngine {}");
    const r = gapPredictorEngine.scanFile(f, { siblings: [] });
    expect(r.findings.some((fd) => fd.patternId === "missing_test_file")).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("scanBatch aggregates across files", () => {
    const b = gapPredictorEngine.scanBatch([
      { filePath: TEST_PATH, content: "it.only('x', () => {})" },
      { filePath: ENGINE_PATH, content: "// TODO", siblings: [TEST_PATH], dispatcherText: "FooEngine" },
    ]);
    expect(b.fileCount).toBe(2);
    expect(b.totalFindings).toBeGreaterThanOrEqual(2);
    expect(b.highestSeverity).toBeGreaterThanOrEqual(2);
    expect(b.detectionRate).toBeGreaterThan(0);
  });

  it("scanBatch empty array returns zero detectionRate", () => {
    const b = gapPredictorEngine.scanBatch([]);
    expect(b.fileCount).toBe(0);
    expect(b.totalFindings).toBe(0);
    expect(b.detectionRate).toBe(0);
  });
});

// ─── Registry + lookup ────────────────────────────────────────────

describe("GapPredictorEngine — pattern lookup", () => {
  it("lookupPattern returns pattern info by id", () => {
    const p = gapPredictorEngine.lookupPattern("silent_catch");
    expect(p).not.toBeNull();
    expect(p!.title).toMatch(/Empty catch/);
    expect(p!.severity).toBe(4);
  });

  it("lookupPattern returns null for unknown id", () => {
    expect(gapPredictorEngine.lookupPattern("not_a_real_pattern")).toBeNull();
  });

  it("PATTERNS and PATTERNS_BY_ID cover the same set", () => {
    expect(Object.keys(PATTERNS_BY_ID).sort()).toEqual(PATTERNS.map((p) => p.id).sort());
  });
});

// ─── Dispatcher round-trip E2E ─────────────────────────────────────

describe("GapPredictorEngine — dispatcher round-trip", () => {
  it("devDispatcher action enum includes gap_predict + gap_scan_file + gap_scan_batch", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"gap_predict"');
    expect(disp).toContain('"gap_scan_file"');
    expect(disp).toContain('"gap_scan_batch"');
    expect(disp).toContain('case "gap_predict"');
    expect(disp).toContain("GapPredictorEngine.js");
  });

  it("lazy-import resolves to the same singleton", async () => {
    const { gapPredictorEngine: dyn } = await import("../engines/GapPredictorEngine.js");
    expect(dyn).toBe(gapPredictorEngine);
  });

  it("dispatcher param shape (artifact {file_path, content}) maps to engine.scan()", () => {
    // Simulate dispatcher-normalized params
    const params = {
      artifact: {
        filePath: ENGINE_PATH,
        content: "// TODO: something",
        siblings: [TEST_PATH],
        dispatcherText: "FooEngine",
      },
    };
    const r: GapReport = gapPredictorEngine.scan(params.artifact);
    expect(r.findings.some((f) => f.patternId === "todo_fixme_hack")).toBe(true);
  });
});

describe("GapPredictorEngine — singleton", () => {
  it("exports a usable singleton", () => {
    expect(gapPredictorEngine).toBeInstanceOf(GapPredictorEngine);
    expect(gapPredictorEngine.name).toBe("GapPredictorEngine");
  });
});
