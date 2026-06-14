/**
 * U-LATHE-PROG-OPT-WIRE — wiring-gate test
 * =========================================
 *
 * Verifies that `lathe_program_optimize` and `lathe_program_estimate` are
 * exposed on the turning dispatcher and correctly route to the matching
 * `LatheProgramOptimizerEngine` methods, against REAL Okuma `.min` JM Die
 * fixtures (the same set that `lathe-real-program-validation.test.ts`
 * exercises — so a structural change to the fixture corpus breaks both
 * tests symmetrically).
 *
 * The trio:
 *   lathe_program_analyze   → analyzeProgram          (already wired BATCH3)
 *   lathe_program_optimize  → generateOptimizedProgram (this unit)
 *   lathe_program_estimate  → estimateImprovements     (this unit)
 *
 * @module __tests__/U-LATHE-PROG-OPT-WIRE
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  latheProgramOptimizerEngine,
  type OptimizedProgram,
  type ImprovementEstimate,
} from "../engines/LatheProgramOptimizerEngine.js";
import {
  TURNING_ACTION_SCHEMAS,
} from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "fixtures", "okuma-programs");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

// ──────────────────────────────────────────────────────────────────────────
// READ THE DISPATCHER SOURCE FOR ANTI-REGRESSION GREP CHECKS
// ──────────────────────────────────────────────────────────────────────────

const DISPATCHER_PATH = join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts");
const DISPATCHER_SRC = readFileSync(DISPATCHER_PATH, "utf-8");

// Cast helper for the heterogeneous schema map.
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>;

describe("U-LATHE-PROG-OPT-WIRE — turning-dispatcher wiring", () => {
  // ────────────────────────────────────────────────────────────────────────
  // SCHEMA SURFACE — actions are present in TURNING_ACTION_SCHEMAS
  // ────────────────────────────────────────────────────────────────────────

  it("registers lathe_program_optimize in TURNING_ACTION_SCHEMAS with a working safeParse", () => {
    const schema = SCHEMA_MAP["lathe_program_optimize"];
    if (!schema) throw new Error("lathe_program_optimize missing from TURNING_ACTION_SCHEMAS");
    expect(typeof schema.safeParse).toBe("function");
    const valid = schema.safeParse({ content: "G50 S2000\nG96 S250 M3\nM30" });
    expect(valid.success).toBe(true);
  });

  it("registers lathe_program_estimate in TURNING_ACTION_SCHEMAS with a working safeParse", () => {
    const schema = SCHEMA_MAP["lathe_program_estimate"];
    if (!schema) throw new Error("lathe_program_estimate missing from TURNING_ACTION_SCHEMAS");
    expect(typeof schema.safeParse).toBe("function");
    const valid = schema.safeParse({ content: "G50 S2000\nG96 S250 M3\nM30" });
    expect(valid.success).toBe(true);
  });

  it("rejects lathe_program_optimize input without 'content'", () => {
    const got = SCHEMA_MAP["lathe_program_optimize"]!.safeParse({ file_path: "anywhere.min" });
    expect(got.success).toBe(false);
  });

  it("rejects lathe_program_estimate input with empty 'content' string (z.string().min(1))", () => {
    const got = SCHEMA_MAP["lathe_program_estimate"]!.safeParse({ content: "" });
    expect(got.success).toBe(false);
  });

  it("accepts lathe_program_optimize input with valid 'content' + optional 'file_path'", () => {
    const got = SCHEMA_MAP["lathe_program_optimize"]!.safeParse({
      content: "G50 S2000\nG96 S250 M3\nM30",
      file_path: "/some/path/PART.min",
    });
    expect(got.success).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────
  // DISPATCHER SOURCE — enum + case ARM presence (anti-regression grep)
  // Catches a bug we have hit twice before where the enum lists a new action
  // but the switch case never lands (or vice versa) so the route 404s at
  // runtime even though TypeScript still compiles green.
  // ────────────────────────────────────────────────────────────────────────

  it("dispatcher source contains BOTH the action name and the case block for lathe_program_optimize", () => {
    expect(DISPATCHER_SRC.includes('"lathe_program_optimize"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_program_optimize":')).toBe(true);
  });

  it("dispatcher source contains BOTH the action name and the case block for lathe_program_estimate", () => {
    expect(DISPATCHER_SRC.includes('"lathe_program_estimate"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_program_estimate":')).toBe(true);
  });

  it("lathe_program_optimize case routes to generateOptimizedProgram (not sibling method)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_program_optimize":');
    if (startIdx < 0) throw new Error("lathe_program_optimize case missing from dispatcher");
    const block = DISPATCHER_SRC.slice(startIdx, startIdx + 600);
    expect(block.includes("generateOptimizedProgram")).toBe(true);
    // Negative: must NOT be wired to a sibling method (the bug class this guards).
    if (block.includes("analyzeProgram(") || block.includes("estimateImprovements(")) {
      throw new Error("lathe_program_optimize case wired to wrong engine method — must call generateOptimizedProgram");
    }
  });

  it("lathe_program_estimate case routes to estimateImprovements (not sibling method)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_program_estimate":');
    if (startIdx < 0) throw new Error("lathe_program_estimate case missing from dispatcher");
    const block = DISPATCHER_SRC.slice(startIdx, startIdx + 600);
    expect(block.includes("estimateImprovements")).toBe(true);
    if (block.includes("analyzeProgram(") || block.includes("generateOptimizedProgram(")) {
      throw new Error("lathe_program_estimate case wired to wrong engine method — must call estimateImprovements");
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// REAL JM DIE OKUMA PROGRAM — engine-level round trip
// (the dispatcher case block above proves the wiring; here we prove the
// engine returns the expected shape against real customer programs so a
// future engine refactor that breaks the shape ALSO breaks the wiring test)
// ──────────────────────────────────────────────────────────────────────────

describe("U-LATHE-PROG-OPT-WIRE — engine round-trip against real JM Die Okuma fixtures", () => {
  const FIXTURES = [
    "BRICO-132.min",      // grooving on 1030 steel, G97 CSS-clamp pattern
    "A-6266.min",         // 12-op turning + thread + cutoff (typical full part)
    "hex-pins-mark.min",  // C-axis live-tool turn-mill
  ];

  for (const fname of FIXTURES) {
    it(`${fname} — generateOptimizedProgram returns shape-correct OptimizedProgram with do-no-harm metric`, () => {
      const src = loadFixture(fname);
      const result: OptimizedProgram = latheProgramOptimizerEngine.generateOptimizedProgram(src, fname);
      // Required shape per the OptimizedProgram interface contract.
      expect(typeof result.original).toBe("string");
      expect(typeof result.optimized).toBe("string");
      expect(Array.isArray(result.changes)).toBe(true);
      expect(typeof result.metrics.originalScore).toBe("number");
      expect(typeof result.metrics.optimizedScore).toBe("number");
      // Original text must be byte-for-byte preserved on the .original field
      // (operator-recovery invariant: you can always reconstruct the input).
      expect(result.original).toBe(src);
      // The optimized score is never worse than the original (a "do no harm"
      // invariant — the optimizer always either improves or leaves alone).
      if (result.metrics.optimizedScore < result.metrics.originalScore) {
        throw new Error(`${fname}: optimizedScore (${result.metrics.optimizedScore}) < originalScore (${result.metrics.originalScore}) — optimizer regressed`);
      }
    });

    it(`${fname} — estimateImprovements returns shape-correct ImprovementEstimate with bounded gains`, () => {
      const src = loadFixture(fname);
      const result: ImprovementEstimate = latheProgramOptimizerEngine.estimateImprovements(src, fname);
      expect(typeof result.currentScore).toBe("number");
      expect(typeof result.projectedScore).toBe("number");
      expect(typeof result.projectedImprovement).toBe("number");
      // Projected improvement is exactly projected - current (definitional invariant).
      expect(result.projectedImprovement).toBeCloseTo(result.projectedScore - result.currentScore, 5);
      // Projected improvement is non-negative (never project a regression).
      if (result.projectedImprovement < 0) {
        throw new Error(`${fname}: projectedImprovement negative (${result.projectedImprovement}) — estimator predicting regression`);
      }
      // Cycle-time and tool-life are bounded per the engine documentation.
      expect(result.estimatedCycleTimeReduction).toBeGreaterThanOrEqual(0);
      expect(result.estimatedCycleTimeReduction).toBeLessThanOrEqual(15);
      expect(result.estimatedToolLifeImprovement).toBeGreaterThanOrEqual(0);
      expect(result.estimatedToolLifeImprovement).toBeLessThanOrEqual(25);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  }

  it("estimate matches the front of optimize for the same input (consistency invariant)", () => {
    // Both methods internally call analyzeProgram → so the currentScore of
    // estimate must equal the originalScore of optimize for the same content.
    const src = loadFixture("BRICO-132.min");
    const opt = latheProgramOptimizerEngine.generateOptimizedProgram(src, "BRICO-132.min");
    // Clear cache to force a fresh analyze on the estimate path.
    latheProgramOptimizerEngine.clearCache();
    const est = latheProgramOptimizerEngine.estimateImprovements(src, "BRICO-132.min");
    expect(est.currentScore).toBe(opt.metrics.originalScore);
  });

  it("dispatcher source carries both new actions twice each (enum entry + case label)", () => {
    // The whole point of the wire-up — both must appear in the dispatcher source.
    const optCount = (DISPATCHER_SRC.match(/"lathe_program_optimize"/g) || []).length;
    const estCount = (DISPATCHER_SRC.match(/"lathe_program_estimate"/g) || []).length;
    // Enum entry (1) + case label (1) = 2 occurrences minimum per action.
    expect(optCount).toBeGreaterThanOrEqual(2);
    expect(estCount).toBeGreaterThanOrEqual(2);
  });
});
