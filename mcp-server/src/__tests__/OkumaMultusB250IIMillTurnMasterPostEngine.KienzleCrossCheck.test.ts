/**
 * Kienzle Fc cross-check tests for the Multus facade (U-PPGMU06).
 *
 * The v5.2.7 .cps emits `(PRISM EST. CUTTING FORCE: NNN N)` per op when
 * `usePRISMCuttingForceEstimate` is on. The engine's
 * `verifyEmittedForceEstimates()` parses these comments, computes the
 * canonical Kienzle Fc per op (using `physics/constants.ts:CANONICAL_KIENZLE`),
 * and flags drift > threshold (default 15%).
 *
 * Coverage discipline (per comprehensive-build hook):
 *   - 3 spanning configs:    ISO P / M / S material families
 *   - 4 failure modes:       drift > 15%, surplus emitted, missing op spec,
 *                            negative ap rejection
 *   - 3 adversarial inputs:  non-string gcode lines (mixed array),
 *                            NaN feed, non-array gcodeLines
 */

import { describe, it, expect } from "vitest";

import {
  OkumaMultusB250IIMillTurnMasterPostEngine,
  MULTUS_KIENZLE_DRIFT_THRESHOLD_PCT_DEFAULT,
  type MultusOpKienzleSpec,
} from "../engines/OkumaMultusB250IIMillTurnMasterPostEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ============================================================================
// Reference values (computed from CANONICAL_KIENZLE) — keep in sync with
// physics/constants.ts so test stays trustworthy.
// ============================================================================

/** Kienzle: Fc = kc1_1 × ap × fz^(1-mc). Pure math. */
function canonicalFc(iso: keyof typeof CANONICAL_KIENZLE, ap_mm: number, fz_mm: number): number {
  const { kc1_1, mc } = CANONICAL_KIENZLE[iso];
  return kc1_1 * ap_mm * Math.pow(fz_mm, 1 - mc);
}

// ============================================================================
// Happy path
// ============================================================================

describe("OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates — happy path", () => {
  it("ISO P op with emitted Fc within 1% of canonical passes the default 15% gate", () => {
    const ops: MultusOpKienzleSpec[] = [
      { op_id: "rough_face", material_iso: "P", ap_mm: 2, fz_mm: 0.1 },
    ];
    const expected = canonicalFc("P", 2, 0.1);
    const gcode = [
      "(OP 1: ROUGH FACE)",
      `(PRISM EST. CUTTING FORCE: ${Math.round(expected)} N)`,
      "G01 X10 F500",
    ];
    const r = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops);
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([]);
    expect(r.fc_estimates_found_count).toBe(1);
    expect(r.perOp).toHaveLength(1);
    expect(r.perOp[0].flagged).toBe(false);
    expect(r.perOp[0].drift_pct).toBeLessThan(1);
    expect(r.perOp[0].canonical_fc_n).toBeCloseTo(expected, 2);
    expect(r.surplus_emitted_count).toBe(0);
    expect(r.drift_threshold_pct).toBe(MULTUS_KIENZLE_DRIFT_THRESHOLD_PCT_DEFAULT);
  });

  it("3 ops spanning ISO P / M / S all canonical-correct → ok=true", () => {
    const ops: MultusOpKienzleSpec[] = [
      { op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: 0.1 },
      { op_id: 2, material_iso: "M", ap_mm: 1.5, fz_mm: 0.08 },
      { op_id: 3, material_iso: "S", ap_mm: 0.5, fz_mm: 0.05 },
    ];
    const gcode = [
      `(PRISM EST. CUTTING FORCE: ${Math.round(canonicalFc("P", 2, 0.1))} N)`,
      `(PRISM EST. CUTTING FORCE: ${Math.round(canonicalFc("M", 1.5, 0.08))} N)`,
      `(PRISM EST. CUTTING FORCE: ${Math.round(canonicalFc("S", 0.5, 0.05))} N)`,
    ];
    const r = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops);
    expect(r.ok).toBe(true);
    expect(r.fc_estimates_found_count).toBe(3);
    expect(r.perOp.every((p) => !p.flagged)).toBe(true);
    expect(r.perOp.map((p) => p.op_id)).toEqual([1, 2, 3]);
  });

  it("no (PRISM EST. CUTTING FORCE: ...) comments at all → ok=true (feature disabled, not a failure)", () => {
    const ops: MultusOpKienzleSpec[] = [
      { op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: 0.1 },
    ];
    const gcode = ["(OP 1: ROUGH FACE)", "G01 X10 F500", "M30"];
    const r = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops);
    expect(r.ok).toBe(true);
    expect(r.fc_estimates_found_count).toBe(0);
    expect(r.warnings).toEqual([]);
    // canonical_fc_n is still populated for reference even when emission absent
    expect(r.perOp[0].canonical_fc_n).toBeGreaterThan(0);
    expect(r.perOp[0].emitted_fc_n).toBeNull();
    expect(r.perOp[0].drift_pct).toBeNull();
    expect(r.perOp[0].flagged).toBe(false);
  });
});

// ============================================================================
// Failure modes — drift detection
// ============================================================================

describe("OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates — drift detection", () => {
  it("emitted Fc 18% high (operator left prismMaterialKc at default 2000) → flagged at default 15% threshold", () => {
    const ops: MultusOpKienzleSpec[] = [
      { op_id: "drift_op", material_iso: "P", ap_mm: 2, fz_mm: 0.1 },
    ];
    const expected = canonicalFc("P", 2, 0.1);
    // Emit value that drifts 18% high
    const drifted = Math.round(expected * 1.18);
    const gcode = [`(PRISM EST. CUTTING FORCE: ${drifted} N)`];
    const r = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops);
    expect(r.ok).toBe(false);
    expect(r.perOp[0].flagged).toBe(true);
    expect(r.perOp[0].drift_pct).toBeGreaterThan(15);
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain("drift_op");
    expect(r.warnings[0]).toContain("prismMaterialKc");
  });

  it("emitted Fc 5% high → ok=true at default 15% threshold, ok=false at custom 3% threshold", () => {
    const ops: MultusOpKienzleSpec[] = [
      { op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: 0.1 },
    ];
    const expected = canonicalFc("P", 2, 0.1);
    const slightlyDrifted = Math.round(expected * 1.05);
    const gcode = [`(PRISM EST. CUTTING FORCE: ${slightlyDrifted} N)`];

    const lenient = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops);
    expect(lenient.ok).toBe(true);
    expect(lenient.perOp[0].flagged).toBe(false);
    expect(lenient.drift_threshold_pct).toBe(15);

    const strict = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops, 3);
    expect(strict.ok).toBe(false);
    expect(strict.perOp[0].flagged).toBe(true);
    expect(strict.drift_threshold_pct).toBe(3);
  });

  it("surplus emitted Fcs (more comments than ops) → flagged with surplus count", () => {
    const ops: MultusOpKienzleSpec[] = [
      { op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: 0.1 },
    ];
    const expected = canonicalFc("P", 2, 0.1);
    const gcode = [
      `(PRISM EST. CUTTING FORCE: ${Math.round(expected)} N)`,
      `(PRISM EST. CUTTING FORCE: 999 N)`, // surplus
      `(PRISM EST. CUTTING FORCE: 1234 N)`, // surplus
    ];
    const r = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops);
    expect(r.ok).toBe(false);
    expect(r.surplus_emitted_count).toBe(2);
    expect(r.fc_estimates_found_count).toBe(3);
    expect(r.warnings.some((w) => w.includes("2 surplus"))).toBe(true);
  });

  it("missing emission (more ops than emitted Fcs) → ok=true (treated as 'feature off for that op'), but emitted_fc_n=null", () => {
    const ops: MultusOpKienzleSpec[] = [
      { op_id: "covered", material_iso: "P", ap_mm: 2, fz_mm: 0.1 },
      { op_id: "uncovered", material_iso: "M", ap_mm: 1.5, fz_mm: 0.08 },
    ];
    const expected = canonicalFc("P", 2, 0.1);
    const gcode = [`(PRISM EST. CUTTING FORCE: ${Math.round(expected)} N)`];
    const r = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops);
    expect(r.ok).toBe(true); // missing emission is not itself a failure
    expect(r.perOp[0].emitted_fc_n).not.toBeNull();
    expect(r.perOp[1].emitted_fc_n).toBeNull();
    expect(r.perOp[1].drift_pct).toBeNull();
    expect(r.perOp[1].flagged).toBe(false);
    expect(r.surplus_emitted_count).toBe(0);
  });
});

// ============================================================================
// Adversarial inputs
// ============================================================================

describe("OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates — adversarial inputs", () => {
  it("rejects negative ap_mm with a clear error pointing at the op_id", () => {
    expect(() =>
      OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(
        [],
        [{ op_id: "bad", material_iso: "P", ap_mm: -1, fz_mm: 0.1 }],
      ),
    ).toThrow(/ap_mm.*positive|op_id=bad/i);
  });

  it("rejects NaN fz_mm", () => {
    expect(() =>
      OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(
        [],
        [{ op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: Number.NaN }],
      ),
    ).toThrow(/fz_mm/);
  });

  it("rejects unknown ISO group", () => {
    expect(() =>
      OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(
        [],
        // @ts-expect-error — runtime rejection of bad ISO
        [{ op_id: 1, material_iso: "Z", ap_mm: 2, fz_mm: 0.1 }],
      ),
    ).toThrow(/material_iso.*"Z"|CANONICAL_KIENZLE/);
  });

  it("rejects driftThresholdPct <= 0", () => {
    expect(() =>
      OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(
        [],
        [{ op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: 0.1 }],
        0,
      ),
    ).toThrow(/driftThresholdPct/);
    expect(() =>
      OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(
        [],
        [{ op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: 0.1 }],
        -5,
      ),
    ).toThrow(/driftThresholdPct/);
  });

  it("rejects non-array gcodeLines", () => {
    expect(() =>
      OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(
        // @ts-expect-error — runtime rejection of non-array
        "G01 X10",
        [{ op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: 0.1 }],
      ),
    ).toThrow(/gcodeLines.*array/);
  });

  it("tolerates non-string entries inside the gcodeLines array (silently skipped, not crashing)", () => {
    const ops: MultusOpKienzleSpec[] = [
      { op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: 0.1 },
    ];
    const expected = canonicalFc("P", 2, 0.1);
    const gcode = [
      "(OP 1)",
      // @ts-expect-error — runtime should skip non-string lines
      null,
      // @ts-expect-error — runtime should skip non-string lines
      42,
      `(PRISM EST. CUTTING FORCE: ${Math.round(expected)} N)`,
    ];
    const r = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops);
    expect(r.ok).toBe(true);
    expect(r.fc_estimates_found_count).toBe(1);
  });

  it("comment regex tolerates spacing variations (extra whitespace, lowercase 'n')", () => {
    const ops: MultusOpKienzleSpec[] = [
      { op_id: 1, material_iso: "P", ap_mm: 2, fz_mm: 0.1 },
    ];
    const expected = Math.round(canonicalFc("P", 2, 0.1));
    // The .cps emits with "EST." (period) and uppercase N. The regex is
    // case-insensitive and tolerates extra whitespace inside the parens —
    // protects against future minor format drift.
    const gcode = [`(  PRISM   est   CUTTING  FORCE:   ${expected}    n  )`];
    const r = OkumaMultusB250IIMillTurnMasterPostEngine.verifyEmittedForceEstimates(gcode, ops);
    expect(r.fc_estimates_found_count).toBe(1);
    expect(r.perOp[0].emitted_fc_n).toBe(expected);
  });
});
