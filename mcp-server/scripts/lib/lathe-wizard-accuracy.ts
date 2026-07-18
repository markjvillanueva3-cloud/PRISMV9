/**
 * Accuracy-oracle integration for the Lathe Wizard combinatorial sweep (slot:oscar).
 * =====================================================================================
 * Bridges the REAL facade result (`LatheSpeedFeedResult`) to the turning silent-wrong
 * identity oracle (`turning-sweep-oracle`). This is the NUMERIC-CORRECTNESS half of
 * "check accuracy and validity" that the property-based invariant library
 * (`lathe-wizard-invariants.ts`) does not cover:
 *
 *   - invariants prove a result is NOT OBVIOUSLY BROKEN (finite / positive / monotone /
 *     in-band / within machine ceilings) -- necessary but NOT sufficient for correctness.
 *   - the oracle re-derives the load-bearing TURNING identities from the engine's OWN
 *     outputs, so a dropped unit factor, an omitted efficiency term, or a value decoupled
 *     from its inputs surfaces as a DIVERGENCE instead of passing silently.
 *
 * Pure + tested in isolation (`lathe-wizard-accuracy.test.ts`, real-facade round-trip); the
 * sweep driver is a thin consumer. No `as any` cast at the facade boundary -- the view is
 * built by explicit field map so a facade field rename fails LOUDLY at compile time rather
 * than silently swallowing a mismatch (the class of defect behind the chuck-jaw NaN bug).
 *
 * Torque + MRR identities stay field-blocked (the facade emits neither `predicted_torque_Nm`
 * nor `predicted_mrr_cm3_min`); per R12 they are surfaced as NOT-VERIFIED coverage gaps via
 * `blockedTurningIdentities`, never silently skipped.
 */

import type {
  LatheSpeedFeedInput,
  LatheSpeedFeedResult,
} from "../../src/engines/LatheSpeedFeedCalculatorFacadeEngine.js";
import {
  turningPerCellOracle,
  blockedTurningIdentities,
  type TurningResultView,
  type TurningCellParams,
  type OracleViolation,
} from "./turning-sweep-oracle.js";

/**
 * Map a facade result onto the oracle's structural view by EXPLICIT field assignment
 * (never a cast). `predicted_torque_Nm` / `predicted_mrr_cm3_min` are intentionally omitted
 * because the facade emits neither -- their omission is what `blockedTurningIdentities`
 * detects and reports as a coverage gap.
 */
export function latheResultToTurningView(result: LatheSpeedFeedResult): TurningResultView {
  return {
    recommendation: result.recommendation,
    predicted_force_N: result.predicted_force_N,
    predicted_power_kw: result.predicted_power_kw,
    predicted_tool_life_min: result.predicted_tool_life_min,
    material_properties: result.material_properties,
  };
}

/**
 * The facade clamps the reported spindle rpm to a HARD practical band regardless of the
 * machine ceiling: `calculateRPM` first applies the optional machine max
 * (LatheSpeedFeedCalculatorFacadeEngine.ts:466 `if (maxRPM && rpm > maxRPM) rpm = maxRPM`),
 * THEN a hard band `rpm = Math.max(50, Math.min(6000, rpm))` (:471), then integer-rounds
 * (:474). The EFFECTIVE band the reported rpm lands in is therefore
 * [50, min(machine.max_rpm ?? Inf, 6000)]. These are mirror-of-the-engine reference constants
 * for a validation instrument (NOT physics constants) -- if the facade band changes, this must
 * follow it. A missing `machine.max_rpm` (several JM lathes lack the field in ShopConfig) means
 * the facade falls to its hard 6000 default, so the oracle must forgive against 6000, not
 * `undefined` -- otherwise every small-diameter / high-Vc cell false-flags a legitimate ceiling
 * clamp (the 3457 false positives observed on the first wired run).
 */
const FACADE_RPM_HARD_MAX = 6000; // facade :471 Math.min(6000, ...)
const FACADE_RPM_HARD_MIN = 50; // facade :471 Math.max(50, ...)

/**
 * Oracle params for one cell. The rpm identity is checked against the WORKPIECE diameter for
 * EVERY op, because the facade computes rpm the same way for all of them:
 * `calculateRPM(vcResult.vc, workpiece?.diameter_mm, machine?.max_rpm)` is called UNCONDITIONALLY
 * (LatheSpeedFeedCalculatorFacadeEngine.ts:690) -- there is no boring/drilling/facing branch, and
 * `tool.diameter_mm` is a dead field never referenced in the rpm calc. An earlier version skipped
 * the rpm identity on internal/facing ops (mirroring invariant I6's `isInternalOrFacing`) on the
 * premise that the facade used a bore/drill diameter -- adversarial verification proved that
 * premise FALSE for this facade, so the exclusion silently dropped rpm coverage on ~46% of
 * tool x op combos for no reason. The exclusion is removed: rpm self-consistency is now checked on
 * ALL ops. (Whether using the workpiece OD for a boring/drilling op's surface speed is the RIGHT
 * physics is a separate upstream-derivation question -- see module header -- not a self-consistency
 * one.) The EFFECTIVE spindle band (machine cap folded with the facade hard [50,6000]) is threaded
 * so the rpm identity forgives a legitimate ceiling/floor clamp, but ONLY at a band edge with the
 * ideal beyond it; a within-band divergence is still caught.
 */
export function accuracyOracleParams(input: LatheSpeedFeedInput): TurningCellParams {
  const effectiveMaxRpm = Math.min(
    input.machine?.max_rpm ?? FACADE_RPM_HARD_MAX,
    FACADE_RPM_HARD_MAX,
  );
  return {
    diameter_mm: input.workpiece?.diameter_mm,
    machine_max_rpm: effectiveMaxRpm,
    machine_min_rpm: FACADE_RPM_HARD_MIN,
  };
}

export interface AccuracyResult {
  /** Identity divergences (silent-wrong numeric defects). Any is a real correctness bug. */
  violations: OracleViolation[];
  /** Field-absent advisories (coverage gaps, NOT defects) -- torque / MRR not emitted. */
  blocked: OracleViolation[];
}

/**
 * Run the accuracy oracle on one facade result. Pure and never throws (the underlying
 * per-check functions are input-guarded and return null when a value is not checkable).
 */
export function runAccuracyOracle(
  input: LatheSpeedFeedInput,
  result: LatheSpeedFeedResult,
): AccuracyResult {
  const view = latheResultToTurningView(result);
  return {
    violations: turningPerCellOracle(accuracyOracleParams(input), view),
    blocked: blockedTurningIdentities(view),
  };
}
