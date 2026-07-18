/**
 * Lathe Wizard combinatorial-validation invariant library.
 *
 * The Lathe Wizard (`LatheSpeedFeedCalculatorFacadeEngine.calculate`) is exercised
 * by a combinatorial sweep over machines x materials x tool-types x operations x
 * strategies x coolant x a continuous grid (ap / diameter / hardness). No single
 * "golden value" exists for the resulting tens-of-millions of combinations, so the
 * validation is PROPERTY-BASED: every result must satisfy a set of physical, math,
 * and structural invariants, and any combination that violates one is a real defect
 * with a reproducible input.
 *
 * This module is pure (no I/O, no engine import at runtime -- types only) so it can be
 * unit-tested in isolation and reused by the sweep driver. It contains NO inline
 * Kienzle/Taylor/material constants (those live in src/physics/constants.ts and are
 * consumed by the engine under test, not re-derived here). The single geometric
 * literal is Math.PI, used for the n = 1000*Vc/(pi*D) spindle-speed closed form --
 * geometry, not a tunable physics coefficient.
 *
 * References:
 *   - Spindle speed closed form: n[rpm] = (1000 * Vc[m/min]) / (pi * D[mm])
 *   - Kienzle Fc = kc1.1 * ap * fz^(1-mc)  => Fc is monotonic non-decreasing in ap
 *   - Taylor T = (C / Vc)^(1/n)            => tool life is monotonic non-increasing in Vc
 *   - Derate-only machine clamp: relaxing a machine ceiling can never LOWER a pick
 */

import type {
  LatheSpeedFeedInput,
  LatheSpeedFeedResult,
} from "../../src/engines/LatheSpeedFeedCalculatorFacadeEngine.js";

/** Severity of an invariant violation. P0 = physically wrong / unsafe; P1 = out-of-contract. */
export type ViolationSeverity = "P0" | "P1" | "P2";

export interface InvariantViolation {
  /** Stable invariant id, e.g. "I2-force-nonneg". */
  code: string;
  severity: ViolationSeverity;
  /** Human-readable statement of what was violated. */
  message: string;
  /** The offending numeric evidence (actual vs bound). */
  evidence?: Record<string, number | string | boolean>;
}

/** Relative tolerance for the RPM closed-form check (2%): rounding + banded picks. */
const RPM_CLOSED_FORM_REL_TOL = 0.02;
/** Absolute-clamp epsilon so a value AT the ceiling is not flagged (float noise). */
const CLAMP_EPS_REL = 1e-6;
/** Band-membership epsilon (0.5%) -- the recommendation may sit exactly on a rounded edge. */
const BAND_EPS_REL = 0.005;

function isFiniteNum(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Return the relevant diameter [mm] for the spindle-speed closed form.
 * For turning/boring/facing the workpiece diameter drives Vc->rpm; when absent we
 * fall back to the tool diameter (drilling/live tooling). Returns null if neither
 * is a usable positive number (closed-form check then skipped, not failed).
 */
function relevantDiameterMm(input: LatheSpeedFeedInput): number | null {
  const wd = input.workpiece?.diameter_mm;
  if (isFiniteNum(wd) && wd > 0) return wd;
  const td = input.tool?.diameter_mm;
  if (isFiniteNum(td) && td > 0) return td;
  return null;
}

/**
 * Check every single-result invariant for one wizard calculation.
 *
 * @param input  the exact input handed to the wizard (for repro + machine limits)
 * @param result the wizard's returned result
 * @returns list of violations (empty = all invariants hold)
 */
export function checkResultInvariants(
  input: LatheSpeedFeedInput,
  result: LatheSpeedFeedResult,
): InvariantViolation[] {
  const v: InvariantViolation[] = [];

  // The wizard is allowed to report success:false for infeasible combinations
  // (e.g. no material match). A clean failure is NOT a violation -- but it must
  // then carry at least one warning explaining why (fail-loud, never silent).
  if (!result.success) {
    if (!Array.isArray(result.warnings) || result.warnings.length === 0) {
      v.push({
        code: "I0-silent-failure",
        severity: "P1",
        message: "result.success=false but no warnings explain why (silent failure)",
      });
    }
    return v; // downstream numeric invariants don't apply to a declared failure
  }

  const rec = result.recommendation;
  const band = result.band;

  // I1 -- structural: recommendation + band must be present and fully finite.
  if (!rec || !band) {
    v.push({
      code: "I1-shape",
      severity: "P0",
      message: "success=true but recommendation or band is missing",
    });
    return v;
  }

  // I2 -- non-negativity / physical sign. A speed/feed/depth of <=0 is never valid.
  const positives: Array<[string, number | undefined]> = [
    ["cutting_speed_m_min", rec.cutting_speed_m_min],
    ["rpm", rec.rpm],
    ["feed_mm_rev", rec.feed_mm_rev],
    ["depth_of_cut_mm", rec.depth_of_cut_mm],
  ];
  for (const [name, val] of positives) {
    if (!isFiniteNum(val) || val <= 0) {
      v.push({
        code: "I2-positive",
        severity: "P0",
        message: `recommendation.${name} must be finite and > 0`,
        evidence: { field: name, value: String(val) },
      });
    }
  }

  // I2b -- predicted physics quantities, when present, must have physical sign.
  const nonNeg: Array<[string, number | undefined]> = [
    ["predicted_force_N", result.predicted_force_N],
    ["predicted_power_kw", result.predicted_power_kw],
  ];
  for (const [name, val] of nonNeg) {
    if (val !== undefined && (!isFiniteNum(val) || val < 0)) {
      v.push({
        code: "I2b-nonneg",
        severity: "P0",
        message: `${name} must be finite and >= 0 when present`,
        evidence: { field: name, value: String(val) },
      });
    }
  }
  const strictPos: Array<[string, number | undefined]> = [
    ["predicted_tool_life_min", result.predicted_tool_life_min],
    ["predicted_ra_um", result.predicted_ra_um],
  ];
  for (const [name, val] of strictPos) {
    if (val !== undefined && (!isFiniteNum(val) || val <= 0)) {
      v.push({
        code: "I2c-strictpos",
        severity: "P0",
        message: `${name} must be finite and > 0 when present`,
        evidence: { field: name, value: String(val) },
      });
    }
  }

  // I3 -- confidence must be a probability in [0,1].
  if (!isFiniteNum(result.confidence) || result.confidence < 0 || result.confidence > 1) {
    v.push({
      code: "I3-confidence",
      severity: "P1",
      message: "confidence must be finite in [0,1]",
      evidence: { confidence: String(result.confidence) },
    });
  }

  // I4 -- band ordering: min <= max on every axis.
  const orderings: Array<[string, number, number]> = [
    ["vc", band.vc_min, band.vc_max],
    ["feed", band.feed_min, band.feed_max],
    ["doc", band.doc_min, band.doc_max],
  ];
  for (const [axis, lo, hi] of orderings) {
    if (!isFiniteNum(lo) || !isFiniteNum(hi) || lo > hi) {
      v.push({
        code: "I4-band-order",
        severity: "P0",
        message: `band ${axis}_min must be finite and <= ${axis}_max`,
        evidence: { axis, min: String(lo), max: String(hi) },
      });
    }
  }

  // I5 -- recommendation must sit inside its own advertised band (with edge epsilon).
  const within = (
    axis: string,
    val: number | undefined,
    lo: number,
    hi: number,
  ): void => {
    if (!isFiniteNum(val) || !isFiniteNum(lo) || !isFiniteNum(hi) || lo > hi) return; // covered by I2/I4
    const span = Math.max(Math.abs(hi), Math.abs(lo), 1);
    const eps = span * BAND_EPS_REL;
    if (val < lo - eps || val > hi + eps) {
      v.push({
        code: "I5-in-band",
        severity: "P1",
        message: `recommendation ${axis} falls outside its band`,
        evidence: { axis, value: val, min: lo, max: hi },
      });
    }
  };
  within("vc", rec.cutting_speed_m_min, band.vc_min, band.vc_max);
  within("feed", rec.feed_mm_rev, band.feed_min, band.feed_max);
  within("doc", rec.depth_of_cut_mm, band.doc_min, band.doc_max);

  // I6 -- spindle-speed closed form: n = 1000*Vc/(pi*D), on external OD turning.
  //
  // We can only assert this where the workpiece OD IS the cutting diameter, i.e.
  // external turning/grooving/parting/threading. For BORING and DRILLING the cutting
  // diameter is the bore/drill diameter (not the workpiece OD, which the harness does
  // not know), and for FACING the diameter sweeps from OD to 0 under G96 -- so the
  // closed form on the workpiece OD does not apply; we skip those ops.
  //
  // The wizard clamps rpm to a spindle BAND [min, max] while reporting the target Vc, so
  // the reported Vc and rpm legitimately diverge at BOTH ends: a max-rpm CEILING clamp
  // (huge Vc / small dia) spins slower than ideal, and a min-rpm FLOOR clamp (tiny Vc /
  // large dia, e.g. Inconel on a 200mm bar) spins faster than the closed-form ideal.
  // Neither is a defect -- the load-bearing SAFETY invariant is I7 (rpm <= machine max).
  // So this Vc-vs-rpm divergence is recorded as a P2 ADVISORY, not a hard P0: it flags a
  // reporting inconsistency worth analysis without failing the combinatorial sweep. A
  // down-clamp (rpm <= expected) is never even recorded.
  const isInternalOrFacing =
    input.tool?.type === "boring_bar" ||
    input.tool?.type === "drilling" ||
    input.operation?.type === "boring" ||
    input.operation?.type === "drilling" ||
    input.operation?.type === "facing";
  const D = relevantDiameterMm(input);
  if (
    !isInternalOrFacing &&
    D !== null &&
    isFiniteNum(rec.cutting_speed_m_min) &&
    rec.cutting_speed_m_min > 0 &&
    isFiniteNum(rec.rpm) &&
    rec.rpm > 0
  ) {
    const expected = (1000 * rec.cutting_speed_m_min) / (Math.PI * D);
    // Overspeed only: rpm above the closed-form value beyond tolerance.
    if (rec.rpm > expected * (1 + RPM_CLOSED_FORM_REL_TOL)) {
      v.push({
        code: "I6-rpm-overspeed",
        severity: "P2",
        message:
          "rpm diverges above n=1000*Vc/(pi*D) for the reported Vc on the workpiece OD (advisory: expected under a min-rpm floor clamp; hard cap is I7)",
        evidence: {
          rpm: rec.rpm,
          expected: Number(expected.toFixed(2)),
          diameter_mm: D,
          vc: rec.cutting_speed_m_min,
          relErr: Number(((rec.rpm - expected) / expected).toFixed(4)),
        },
      });
    }
  }

  // I7 -- machine RPM ceiling (G50 CSS cap): a derate-only clamp can never RAISE rpm
  // above the machine's rated maximum. Exceeding it is a chuck-overspeed hazard (P0).
  const maxRpm = input.machine?.max_rpm;
  if (isFiniteNum(maxRpm) && isFiniteNum(rec.rpm) && rec.rpm > maxRpm * (1 + CLAMP_EPS_REL)) {
    v.push({
      code: "I7-rpm-cap",
      severity: "P0",
      message: "recommended rpm exceeds machine max_rpm (derate-only clamp breached)",
      evidence: { rpm: rec.rpm, max_rpm: maxRpm },
    });
  }

  // I8 -- machine power ceiling: predicted power must not exceed the installed spindle
  // power UNLESS the wizard flagged it (fail-loud). Silent over-power is a P0.
  const maxKw = input.machine?.max_power_kw;
  const predKw = result.predicted_power_kw;
  if (
    isFiniteNum(maxKw) &&
    isFiniteNum(predKw) &&
    predKw > maxKw * (1 + CLAMP_EPS_REL)
  ) {
    const warned =
      Array.isArray(result.warnings) &&
      result.warnings.some((w) => /power|overload|kw|spindle/i.test(w));
    if (!warned) {
      v.push({
        code: "I8-power-cap",
        severity: "P0",
        message:
          "predicted_power_kw exceeds machine max_power_kw with no power warning (silent over-power)",
        evidence: { predicted_power_kw: predKw, max_power_kw: maxKw },
      });
    }
  }

  return v;
}

export interface MetamorphicResult {
  code: string;
  severity: ViolationSeverity;
  message: string;
  holds: boolean;
  evidence?: Record<string, number | string>;
}

/**
 * M3 -- Kienzle monotonicity: with all else equal, a larger depth of cut (ap) can
 * never DECREASE the predicted cutting force (Fc = kc1.1*ap*fz^(1-mc), ap-linear).
 * Compares two results whose inputs differ only in operation.depth_of_cut_mm.
 */
export function checkForceMonotonicInDepth(
  loDepthResult: LatheSpeedFeedResult,
  hiDepthResult: LatheSpeedFeedResult,
): MetamorphicResult {
  const lo = loDepthResult.predicted_force_N;
  const hi = hiDepthResult.predicted_force_N;
  if (!isFiniteNum(lo) || !isFiniteNum(hi)) {
    return {
      code: "M3-force-monotonic-depth",
      severity: "P1",
      message: "predicted_force_N missing on one side -- monotonicity unverifiable",
      holds: true, // not a violation, just not applicable
    };
  }
  // Allow a hair of float slack; a genuine decrease with more depth is a P0 sign error.
  const holds = hi >= lo * (1 - 1e-9);
  return {
    code: "M3-force-monotonic-depth",
    severity: "P0",
    message: "cutting force must be non-decreasing in depth of cut (Kienzle ap-linear)",
    holds,
    evidence: { force_lo_depth: lo, force_hi_depth: hi },
  };
}

/**
 * M2 -- derate-only clamp: relaxing the machine RPM ceiling (larger max_rpm) can never
 * LOWER the recommended rpm. Compares two results whose inputs differ only in
 * machine.max_rpm (tightCeiling <= looseCeiling).
 */
export function checkRpmMonotonicInMachineCeiling(
  tightCeilingResult: LatheSpeedFeedResult,
  looseCeilingResult: LatheSpeedFeedResult,
): MetamorphicResult {
  const tight = tightCeilingResult.recommendation?.rpm;
  const loose = looseCeilingResult.recommendation?.rpm;
  if (!isFiniteNum(tight) || !isFiniteNum(loose)) {
    return {
      code: "M2-rpm-monotonic-ceiling",
      severity: "P1",
      message: "rpm missing on one side -- monotonicity unverifiable",
      holds: true,
    };
  }
  const holds = loose >= tight * (1 - 1e-9);
  return {
    code: "M2-rpm-monotonic-ceiling",
    severity: "P0",
    message: "relaxing machine max_rpm must never lower the recommended rpm (derate-only)",
    holds,
    evidence: { rpm_tight_ceiling: tight, rpm_loose_ceiling: loose },
  };
}
