/**
 * CADValidationRubricEngine — CAD-DRAW-MAX-MS1/U-VALIDATION-50-SCORING
 *
 * Richer scoring rubric for the {@link CADDrawAnyPartValidationHarnessEngine}.
 * Replaces the v1 binary pass/fail rubric (exported? → 1.0 : 0.0) with a
 * weighted partial-credit score that distinguishes:
 *
 *   - exportedSuccessfully (0.50 weight)  — primary success signal
 *   - iter-efficiency      (0.20 weight)  — reward < maxOps utilization
 *   - op-count adequacy    (0.20 weight)  — reward opLog length within expected band
 *   - no-failure-halt      (0.10 weight)  — reward absence of "live-failure-halt" stop
 *
 * Weights sum to exactly 1.0. The score is in [0..1]; verdict is `pass` iff
 * `score >= passThreshold` (default 0.70, same as the harness gate semantics).
 *
 * **Pluggable into harness:** the harness's `opts.scorer` injection point
 * accepts a function `(case, result) → ValidationCaseVerdict`. This rubric
 * exports `score()` + a thin adapter `scoreCaseRich()` matching that signature.
 *
 * Pure (no I/O). Hermetic-testable. Deterministic given inputs.
 *
 * Refs: CADDrawAnyPartValidationHarnessEngine (v1 binary rubric, P0-U01-VALIDATION-50);
 *       CADDrawAnyPartOrchestratorEngine (the consumer producing DrawAnyPartResult).
 */

import type {
  DrawAnyPartResult,
  DrawAnyPartInput,
} from "./CADDrawAnyPartOrchestratorEngine.js";
import type {
  ValidationTestCase,
  ValidationCaseVerdict,
} from "./CADDrawAnyPartValidationHarnessEngine.js";

// ── Weights (sum = 1.0; pinned by tests so any drift is loud) ────────────────

export const WEIGHT_EXPORTED = 0.50;
export const WEIGHT_ITER_EFFICIENCY = 0.20;
export const WEIGHT_OP_COUNT = 0.20;
export const WEIGHT_NO_FAILURE_HALT = 0.10;

export const DEFAULT_RUBRIC_PASS_THRESHOLD = 0.70;
export const DEFAULT_MAX_OPS_REFERENCE = 15; // mirrors DEFAULT_MAX_OPS in orchestrator

// ── Types ────────────────────────────────────────────────────────────────────

export interface RichScoreBreakdown {
  exportedScore: number;
  iterEfficiencyScore: number;
  opCountScore: number;
  noFailureHaltScore: number;
  /** Sum, in [0..1]. */
  total: number;
}

export interface RichScoreInput {
  /** Optional caller-supplied expected minimum ops; falls back to undefined. */
  expectedOpLogMin?: number;
  /** Optional caller-supplied expected maximum ops (the orchestrator's maxOps). */
  expectedOpLogMax?: number;
  /** Threshold for pass/fail verdict. Default 0.70. */
  passThreshold?: number;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Clamp a value into [lo, hi]. Non-finite input → lo.
 * Exported for tests.
 */
export function clamp01(v: number, lo = 0, hi = 1): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/**
 * iter-efficiency: reward LOWER iter counts (fewer steps = more efficient).
 * Linear from 1.0 (zero iters) to 0.0 (iters >= maxOps).
 * Pure.
 */
export function scoreIterEfficiency(iterations: number, maxOps = DEFAULT_MAX_OPS_REFERENCE): number {
  if (!Number.isFinite(iterations) || iterations < 0) return 0;
  if (!Number.isFinite(maxOps) || maxOps <= 0) return 0;
  if (iterations >= maxOps) return 0;
  return 1 - iterations / maxOps;
}

/**
 * op-count adequacy: 1.0 iff opCount is within [expectedMin, expectedMax];
 * otherwise linear falloff (below min → 0 at 0 ops; above max → 0 at 2× max).
 * If no bounds supplied, returns 1.0 as long as opCount > 0 (default pass).
 * Pure.
 */
export function scoreOpCount(
  opCount: number,
  expectedMin?: number,
  expectedMax?: number,
): number {
  if (!Number.isFinite(opCount) || opCount < 0) return 0;
  const hasMin = typeof expectedMin === "number" && Number.isFinite(expectedMin) && expectedMin >= 0;
  const hasMax = typeof expectedMax === "number" && Number.isFinite(expectedMax) && expectedMax > 0;
  if (!hasMin && !hasMax) return opCount > 0 ? 1 : 0;
  const lo = hasMin ? Math.floor(expectedMin!) : 0;
  const hi = hasMax ? Math.floor(expectedMax!) : Infinity;
  if (opCount >= lo && opCount <= hi) return 1;
  if (opCount < lo) return lo === 0 ? 1 : clamp01(opCount / lo);
  // opCount > hi: linear falloff to 0 at 2 × hi (lenient — over-shooting is less bad than under-shooting).
  const ceiling = 2 * hi;
  if (opCount >= ceiling) return 0;
  return clamp01((ceiling - opCount) / hi);
}

/**
 * Compute the full breakdown + total from a {@link DrawAnyPartResult}.
 * Pure — exported for direct testing.
 */
export function score(result: DrawAnyPartResult, opts: RichScoreInput = {}): RichScoreBreakdown {
  const exportedScore = result.exportedSuccessfully ? 1 : 0;
  const iterEfficiencyScore = scoreIterEfficiency(result.iterations);
  const opCountScore = scoreOpCount(result.opLog.length, opts.expectedOpLogMin, opts.expectedOpLogMax);
  const noFailureHaltScore = result.stopReason === "live-failure-halt" ? 0 : 1;

  const total = clamp01(
    exportedScore * WEIGHT_EXPORTED
      + iterEfficiencyScore * WEIGHT_ITER_EFFICIENCY
      + opCountScore * WEIGHT_OP_COUNT
      + noFailureHaltScore * WEIGHT_NO_FAILURE_HALT,
  );

  return { exportedScore, iterEfficiencyScore, opCountScore, noFailureHaltScore, total };
}

/**
 * Adapter matching the harness's pluggable scorer signature:
 * `(case, result) → ValidationCaseVerdict`.
 *
 * Verdict logic:
 *   - `pass` iff `total >= passThreshold`
 *   - `fail` otherwise; reason cites the worst-performing component
 */
export function scoreCaseRich(
  testCase: ValidationTestCase,
  result: DrawAnyPartResult,
  opts: RichScoreInput = {},
): ValidationCaseVerdict {
  const threshold = clamp01(
    typeof opts.passThreshold === "number" ? opts.passThreshold : DEFAULT_RUBRIC_PASS_THRESHOLD,
  );
  const breakdown = score(result, {
    expectedOpLogMin: opts.expectedOpLogMin ?? testCase.expectedOpLogMin,
    expectedOpLogMax: opts.expectedOpLogMax,
  });

  const base = {
    id: testCase.id,
    description: testCase.description,
    stopReason: result.stopReason,
    iterations: result.iterations,
    exported: result.exportedSuccessfully,
  };

  const totalPct = (breakdown.total * 100).toFixed(1);
  const thresholdPct = (threshold * 100).toFixed(1);

  if (breakdown.total >= threshold) {
    return {
      ...base,
      verdict: "pass",
      reason: `rich score ${totalPct}% >= threshold ${thresholdPct}%`
        + ` (exported=${breakdown.exportedScore}, iter-eff=${breakdown.iterEfficiencyScore.toFixed(2)},`
        + ` op-count=${breakdown.opCountScore.toFixed(2)}, no-halt=${breakdown.noFailureHaltScore})`,
    };
  }

  // Cite the worst-performing component to make the fail actionable.
  const components: Array<{ name: string; value: number }> = [
    { name: "exported", value: breakdown.exportedScore },
    { name: "iter-efficiency", value: breakdown.iterEfficiencyScore },
    { name: "op-count", value: breakdown.opCountScore },
    { name: "no-failure-halt", value: breakdown.noFailureHaltScore },
  ];
  const worst = components.reduce((acc, c) => (c.value < acc.value ? c : acc), components[0]);

  return {
    ...base,
    verdict: "fail",
    reason: `rich score ${totalPct}% < threshold ${thresholdPct}% (worst: ${worst.name}=${worst.value.toFixed(2)})`,
  };
}

// ── Engine (singleton wrapper for dispatcher wiring + future state) ──────────

export class CADValidationRubricEngine {
  /** Pure pass-through to {@link score}. Singleton API entry. */
  score(result: DrawAnyPartResult, opts: RichScoreInput = {}): RichScoreBreakdown {
    return score(result, opts);
  }

  /** Pure pass-through to {@link scoreCaseRich}. */
  scoreCase(
    testCase: ValidationTestCase,
    result: DrawAnyPartResult,
    opts: RichScoreInput = {},
  ): ValidationCaseVerdict {
    return scoreCaseRich(testCase, result, opts);
  }

  /** Suppress unused-import warning if DrawAnyPartInput becomes referenced later. */
  readonly _drawAnyPartInputType?: DrawAnyPartInput;
}

export const cadValidationRubricEngine = new CADValidationRubricEngine();
