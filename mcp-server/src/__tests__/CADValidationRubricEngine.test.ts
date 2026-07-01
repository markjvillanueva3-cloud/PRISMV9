/**
 * CADValidationRubricEngine.test.ts — CAD-DRAW-MAX-MS1/U-VALIDATION-50-SCORING
 *
 * Hermetic tests for the richer pluggable scorer.
 */

import { describe, it, expect } from "vitest";
import type { DrawAnyPartResult } from "../engines/CADDrawAnyPartOrchestratorEngine.js";
import {
  CADValidationRubricEngine,
  cadValidationRubricEngine,
  clamp01,
  scoreIterEfficiency,
  scoreOpCount,
  score,
  scoreCaseRich,
  WEIGHT_EXPORTED,
  WEIGHT_ITER_EFFICIENCY,
  WEIGHT_OP_COUNT,
  WEIGHT_NO_FAILURE_HALT,
  DEFAULT_RUBRIC_PASS_THRESHOLD,
  DEFAULT_MAX_OPS_REFERENCE,
} from "../engines/CADValidationRubricEngine.js";
import {
  cadDrawAnyPartValidationHarnessEngine,
  type ValidationTestCase,
} from "../engines/CADDrawAnyPartValidationHarnessEngine.js";

function makeResult(overrides: Partial<DrawAnyPartResult> = {}): DrawAnyPartResult {
  return {
    opLog: overrides.opLog ?? [],
    steps: overrides.steps ?? [],
    exportedSuccessfully: overrides.exportedSuccessfully ?? true,
    stopReason: overrides.stopReason ?? "exported",
    iterations: overrides.iterations ?? 3,
  };
}

function makeCase(o: Partial<ValidationTestCase> = {}): ValidationTestCase {
  return {
    id: o.id ?? "TC",
    description: o.description ?? "case",
    input: o.input ?? { intent: "make it" },
    expectedOpLogMin: o.expectedOpLogMin,
    mustNotStopFor: o.mustNotStopFor,
  };
}

// ── Weight invariants ────────────────────────────────────────────────────────

describe("rubric weight invariants", () => {
  it("weights sum to exactly 1.0", () => {
    const sum = WEIGHT_EXPORTED + WEIGHT_ITER_EFFICIENCY + WEIGHT_OP_COUNT + WEIGHT_NO_FAILURE_HALT;
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("each weight is in [0..1]", () => {
    for (const w of [WEIGHT_EXPORTED, WEIGHT_ITER_EFFICIENCY, WEIGHT_OP_COUNT, WEIGHT_NO_FAILURE_HALT]) {
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
    }
  });

  it("default pass threshold is 0.70 (matches harness gate default)", () => {
    expect(DEFAULT_RUBRIC_PASS_THRESHOLD).toBe(0.70);
  });

  it("default max-ops reference matches orchestrator DEFAULT_MAX_OPS", () => {
    expect(DEFAULT_MAX_OPS_REFERENCE).toBe(15);
  });
});

// ── clamp01 ──────────────────────────────────────────────────────────────────

describe("clamp01", () => {
  it("returns the value when in range", () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });

  it("clamps above 1.0 to 1.0", () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(99)).toBe(1);
  });

  it("clamps below 0.0 to 0.0", () => {
    expect(clamp01(-0.1)).toBe(0);
    expect(clamp01(-99)).toBe(0);
  });

  it("non-finite input returns lower bound (NaN→lo)", () => {
    expect(clamp01(NaN)).toBe(0);
  });

  it("Infinity returns lower bound (non-finite guard fires first)", () => {
    expect(clamp01(Infinity)).toBe(0);
  });
});

// ── scoreIterEfficiency ──────────────────────────────────────────────────────

describe("scoreIterEfficiency", () => {
  it("0 iters → 1.0 (max efficiency)", () => {
    expect(scoreIterEfficiency(0)).toBe(1);
  });

  it("iters == maxOps → 0.0 (no efficiency)", () => {
    expect(scoreIterEfficiency(15, 15)).toBe(0);
  });

  it("iters > maxOps → 0.0 (over-budget)", () => {
    expect(scoreIterEfficiency(20, 15)).toBe(0);
  });

  it("linear midpoint: half maxOps → 0.5", () => {
    expect(scoreIterEfficiency(7.5, 15)).toBeCloseTo(0.5, 5);
  });

  it("negative iters → 0", () => {
    expect(scoreIterEfficiency(-1)).toBe(0);
  });

  it("non-finite maxOps → 0", () => {
    expect(scoreIterEfficiency(5, NaN)).toBe(0);
  });
});

// ── scoreOpCount ─────────────────────────────────────────────────────────────

describe("scoreOpCount", () => {
  it("no bounds + opCount > 0 → 1.0", () => {
    expect(scoreOpCount(3)).toBe(1);
  });

  it("no bounds + opCount === 0 → 0.0", () => {
    expect(scoreOpCount(0)).toBe(0);
  });

  it("within [min, max] → 1.0", () => {
    expect(scoreOpCount(5, 3, 8)).toBe(1);
    expect(scoreOpCount(3, 3, 8)).toBe(1);
    expect(scoreOpCount(8, 3, 8)).toBe(1);
  });

  it("below min → linear falloff to 0 at 0 ops", () => {
    expect(scoreOpCount(2, 4)).toBe(0.5);
    expect(scoreOpCount(0, 4)).toBe(0);
  });

  it("above max → linear falloff to 0 at 2× max", () => {
    expect(scoreOpCount(15, undefined, 10)).toBe(0.5);
    expect(scoreOpCount(20, undefined, 10)).toBe(0);
  });

  it("negative opCount → 0", () => {
    expect(scoreOpCount(-3, 0, 10)).toBe(0);
  });

  it("non-finite opCount → 0", () => {
    expect(scoreOpCount(NaN, 0, 10)).toBe(0);
  });

  it("expectedMin=0 + opCount=0 → 1 (degenerate but valid 'no ops required')", () => {
    expect(scoreOpCount(0, 0, 5)).toBe(1);
  });
});

// ── score (full breakdown) ───────────────────────────────────────────────────

describe("score (full breakdown)", () => {
  it("perfect score: exported + 0 iter + opCount in band + no halt", () => {
    const r = makeResult({ exportedSuccessfully: true, iterations: 0, opLog: Array(3).fill({}) as never, stopReason: "exported" });
    const b = score(r, { expectedOpLogMin: 2, expectedOpLogMax: 5 });
    expect(b.exportedScore).toBe(1);
    expect(b.iterEfficiencyScore).toBe(1);
    expect(b.opCountScore).toBe(1);
    expect(b.noFailureHaltScore).toBe(1);
    expect(b.total).toBeCloseTo(1, 10);
  });

  it("zero score: not exported + max iter + 0 ops + failure halt", () => {
    const r = makeResult({ exportedSuccessfully: false, iterations: 15, opLog: [], stopReason: "live-failure-halt" });
    const b = score(r);
    expect(b.exportedScore).toBe(0);
    expect(b.iterEfficiencyScore).toBe(0);
    expect(b.opCountScore).toBe(0);
    expect(b.noFailureHaltScore).toBe(0);
    expect(b.total).toBe(0);
  });

  it("exported + max-ops halt: 0.5*1 + 0.2*0 + 0.2*0 + 0.1*1 = 0.6", () => {
    const r = makeResult({ exportedSuccessfully: true, iterations: 15, opLog: [], stopReason: "max-ops" });
    const b = score(r);
    expect(b.total).toBeCloseTo(0.6, 5);
  });

  it("scoring is deterministic across repeated calls", () => {
    const r = makeResult({ exportedSuccessfully: true, iterations: 5, opLog: Array(4).fill({}) as never });
    const a = score(r);
    const b = score(r);
    expect(a).toEqual(b);
  });

  it("total is always clamped to [0..1]", () => {
    const r = makeResult({ exportedSuccessfully: true, iterations: 0, opLog: Array(2).fill({}) as never, stopReason: "exported" });
    const b = score(r);
    expect(b.total).toBeGreaterThanOrEqual(0);
    expect(b.total).toBeLessThanOrEqual(1);
  });
});

// ── scoreCaseRich (verdict) ──────────────────────────────────────────────────

describe("scoreCaseRich (verdict)", () => {
  it("passes when total >= threshold", () => {
    const tc = makeCase();
    const r = makeResult({ exportedSuccessfully: true, iterations: 3, opLog: Array(3).fill({}) as never, stopReason: "exported" });
    const v = scoreCaseRich(tc, r);
    expect(v.verdict).toBe("pass");
    expect(v.reason).toMatch(/rich score \d+\.\d+%/);
    expect(v.reason).toMatch(/>= threshold/);
  });

  it("fails when total < threshold + cites worst component", () => {
    const tc = makeCase();
    const r = makeResult({ exportedSuccessfully: false, iterations: 15, opLog: [], stopReason: "live-failure-halt" });
    const v = scoreCaseRich(tc, r);
    expect(v.verdict).toBe("fail");
    expect(v.reason).toMatch(/< threshold/);
    expect(v.reason).toMatch(/worst:/);
  });

  it("uses case-supplied expectedOpLogMin when opts.expectedOpLogMin not given", () => {
    const tc = makeCase({ expectedOpLogMin: 5 });
    const r = makeResult({ exportedSuccessfully: true, iterations: 3, opLog: Array(2).fill({}) as never });
    const v = scoreCaseRich(tc, r);
    expect(v.reason).toMatch(/op-count=0\.40/);
  });

  it("custom passThreshold is clamped to [0..1]", () => {
    const tc = makeCase();
    const r = makeResult({ exportedSuccessfully: true, iterations: 3, opLog: Array(3).fill({}) as never });
    const vLow = scoreCaseRich(tc, r, { passThreshold: -1 });
    const vHigh = scoreCaseRich(tc, r, { passThreshold: 99 });
    expect(vLow.verdict).toBe("pass");
    expect(vHigh.verdict).toBe("fail");
  });

  it("preserves stopReason + iterations + exported flag", () => {
    const tc = makeCase({ id: "X" });
    const r = makeResult({ exportedSuccessfully: false, iterations: 7, stopReason: "decoder-null" });
    const v = scoreCaseRich(tc, r);
    expect(v.id).toBe("X");
    expect(v.stopReason).toBe("decoder-null");
    expect(v.iterations).toBe(7);
    expect(v.exported).toBe(false);
  });
});

// ── Engine class + plugin compat ─────────────────────────────────────────────

describe("CADValidationRubricEngine (singleton + class)", () => {
  it("singleton instance is an engine", () => {
    expect(cadValidationRubricEngine).toBeInstanceOf(CADValidationRubricEngine);
  });

  it("engine.score delegates to pure score()", () => {
    const r = makeResult({ exportedSuccessfully: true, iterations: 5, opLog: Array(3).fill({}) as never });
    expect(cadValidationRubricEngine.score(r)).toEqual(score(r));
  });

  it("engine.scoreCase delegates to pure scoreCaseRich()", () => {
    const tc = makeCase();
    const r = makeResult({ exportedSuccessfully: true, iterations: 5, opLog: Array(3).fill({}) as never });
    expect(cadValidationRubricEngine.scoreCase(tc, r)).toEqual(scoreCaseRich(tc, r));
  });

  it("harness companion has validate + renderMarkdown methods (no circular import)", () => {
    expect(typeof cadDrawAnyPartValidationHarnessEngine.validate).toBe("function");
    expect(typeof cadDrawAnyPartValidationHarnessEngine.renderMarkdown).toBe("function");
  });
});
