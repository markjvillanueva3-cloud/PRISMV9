/**
 * OmegaSafetyScoreEngine — Scalar safety gate for G-code output
 *
 * Converts the 6-dimension SafetyAssessment from PipelineSafetyOrchestratorEngine
 * into a scalar S(x) ∈ [0, 1]. G-code output is BLOCKED when S(x) < 0.70.
 *
 * Scoring:
 *   Per-dimension: safe=1.0, caution=0.85, warning=0.60, critical=0.25, veto=0
 *   S(x) = geometric mean of 6 dimension scores
 *   Any single veto → S(x) = 0 (hard block)
 *
 * Ref: PRISM safety philosophy — no program leaves the system without
 * quantified safety confidence. 0.70 threshold maps to: every dimension
 * at "caution" or better, or max one "warning" with others "safe".
 *
 * @module engines/OmegaSafetyScoreEngine
 */

import type {
  SafetyAssessment,
  RiskLevel,
  RiskDimension,
  OperationInput,
  MaterialInput,
  MachineInput,
  ToolInput,
  WorkholdingInput,
} from "./PipelineSafetyOrchestratorEngine.js";
import { pipelineSafetyOrchestratorEngine } from "./PipelineSafetyOrchestratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface OmegaSafetyResult {
  /** Scalar safety score S(x) ∈ [0, 1] */
  omega_safety: number;
  /** Whether S(x) >= gate threshold */
  passed: boolean;
  /** Gate threshold (0.70) */
  gate_threshold: number;
  /** Per-dimension scores [0, 1] */
  per_dimension: Record<string, number>;
  /** Any hard veto from underlying assessment */
  vetoed: boolean;
  /** Human-readable justification */
  justification: string[];
  /** Recommendations if blocked */
  recommendations: string[];
  /** U-CN03: NN-confidence input echoed back when supplied (else undefined) */
  nn_confidence?: number;
  /** U-CN03: NN weight used in the weighted geometric mean (else undefined) */
  nn_weight?: number;
}

/**
 * U-CN03: Optional NN-confidence input. When provided, treats the calibrated
 * NN confidence as an additional soft-prior dimension in the geometric mean,
 * weighted by `nnWeight`. Default behavior (omitted): identical to pre-CN03
 * call shape, fully backward-compatible.
 *
 * Math: with N base dimensions of weight 1 each + NN with weight w_nn:
 *   S(x) = (Π base_dim_scores × nnConf^w_nn)^(1/(N + w_nn))
 * w_nn = 0 collapses to the base geometric mean (degenerate, no effect).
 *
 * The veto path still wins: when assessment.vetoed === true, S(x) = 0
 * regardless of NN confidence — physics-derived hard blocks are NOT
 * overridable by a learned signal.
 */
export interface OmegaScoreOptions {
  /** NN-calibrated confidence ∈ [0, 1]. Pre-OPT-A this is raw softmax max. */
  nnConfidence?: number;
  /**
   * Weight of NN dimension in the geometric mean. ≥ 0. Default 0 (no
   * contribution). Common values: 0.5 (advisory), 1.0 (peer dimension),
   * 2.0 (dominant — only when NN is heavily calibrated).
   */
  nnWeight?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GATE_THRESHOLD = 0.70;

// U-CN03: Minimum value substituted for zero in the log-product. Without this
// floor, a single critical/veto dimension would force exp(-∞)=0 even when the
// caller wants the score to reflect a graded blend. The legacy code used a
// plain product where any zero collapsed it; we preserve that for vetoed
// assessments via the explicit `assessment.vetoed` short-circuit. For
// non-vetoed scoring, MIN_GEO_FLOOR = 1e-6 keeps the math defined while
// keeping the geometric mean sharply low (critical=0.25 still dominates).
const MIN_GEO_FLOOR = 1e-6;

const RISK_SCORE: Record<RiskLevel, number> = {
  safe: 1.0,
  caution: 0.85,
  warning: 0.60,
  critical: 0.25,
  veto: 0,
};

const DIMENSION_NAMES = ["collision", "overload", "chatter", "thermal", "breakage", "workholding"] as const;

// ============================================================================
// ENGINE
// ============================================================================

export class OmegaSafetyScoreEngine {

  /**
   * Score a pre-computed SafetyAssessment.
   *
   * U-CN03: Optional `opts.nnConfidence` + `opts.nnWeight` lets callers fold
   * the cross-process neural learner's calibrated confidence into the
   * composite as a weighted 7th dimension. Pure backward-compat when omitted
   * — the legacy 6-dimension geometric mean path is bit-equivalent.
   */
  score(assessment: SafetyAssessment, opts?: OmegaScoreOptions): OmegaSafetyResult {
    const perDim: Record<string, number> = {};
    let logSum = 0; // weighted log-product (numerically stable)
    let totalWeight = 0;

    for (const dimName of DIMENSION_NAMES) {
      const dim: RiskDimension = assessment.dimensions[dimName];
      const s = RISK_SCORE[dim.risk] ?? 0;
      perDim[dimName] = s;
      // log(0) → -Infinity; geometric mean ⇒ 0 (any zero kills product).
      // Floor at MIN_GEO_FLOOR so a single critical doesn't inadvertently
      // collapse the product when not vetoed (preserves legacy behavior:
      // critical=0.25 contributes geometrically, doesn't zero out).
      const safeS = s > 0 ? s : MIN_GEO_FLOOR;
      logSum += Math.log(safeS) * 1; // base dimension weight = 1
      totalWeight += 1;
    }

    // U-CN03: include NN dimension when caller supplies confidence + weight.
    // Defends against NaN/Infinity/out-of-range; invalid → silently skip
    // (degrade open — the safety floor stays the physics-derived score).
    let nnConfidenceUsed: number | undefined;
    let nnWeightUsed: number | undefined;
    const nnConf = opts?.nnConfidence;
    const nnWeight = opts?.nnWeight ?? 0;
    if (
      typeof nnConf === "number" &&
      Number.isFinite(nnConf) &&
      nnConf >= 0 &&
      nnConf <= 1 &&
      Number.isFinite(nnWeight) &&
      nnWeight > 0
    ) {
      const safeNn = nnConf > 0 ? nnConf : MIN_GEO_FLOOR;
      logSum += Math.log(safeNn) * nnWeight;
      totalWeight += nnWeight;
      perDim["nn_confidence"] = nnConf;
      nnConfidenceUsed = nnConf;
      nnWeightUsed = nnWeight;
    }

    // Weighted geometric mean: exp((Σ w_i · ln(s_i)) / Σ w_i)
    const omegaRaw = totalWeight > 0 ? Math.exp(logSum / totalWeight) : 0;
    const omega = assessment.vetoed ? 0 : omegaRaw;
    const passed = omega >= GATE_THRESHOLD;

    const justification = [...assessment.justification];
    const recommendations: string[] = [];

    if (!passed) {
      justification.push(`GATE BLOCKED: S(x) = ${omega.toFixed(3)} < ${GATE_THRESHOLD} — G-code output suppressed`);

      // Identify worst dimensions for actionable guidance
      const worst = DIMENSION_NAMES
        .filter(d => perDim[d] < 0.70)
        .sort((a, b) => perDim[a] - perDim[b]);

      for (const d of worst) {
        const dim = assessment.dimensions[d];
        recommendations.push(`Fix ${d}: ${dim.detail} (score ${perDim[d].toFixed(2)})`);
      }
      if (assessment.escalation_actions.length > 0) {
        recommendations.push(...assessment.escalation_actions);
      }
      // U-CN03: if NN confidence pulled the score below gate, surface that.
      if (nnConfidenceUsed !== undefined && nnConfidenceUsed < GATE_THRESHOLD) {
        recommendations.push(
          `NN confidence ${nnConfidenceUsed.toFixed(3)} (weight ${nnWeightUsed!.toFixed(2)}) lowered the composite — operator review or retraining recommended before override`,
        );
      }
    }

    return {
      omega_safety: Math.round(omega * 1000) / 1000,
      passed,
      gate_threshold: GATE_THRESHOLD,
      per_dimension: perDim,
      vetoed: assessment.vetoed,
      justification,
      recommendations,
      nn_confidence: nnConfidenceUsed,
      nn_weight: nnWeightUsed,
    };
  }

  /**
   * Full evaluate: run PipelineSafetyOrchestrator assessment then score it.
   *
   * U-CN03: Optional `opts.nnConfidence` + `opts.nnWeight` forward to score().
   */
  evaluate(
    operation: OperationInput,
    material: MaterialInput,
    machine: MachineInput,
    tool: ToolInput,
    workholding: WorkholdingInput,
    opts?: OmegaScoreOptions,
  ): OmegaSafetyResult {
    const assessment = pipelineSafetyOrchestratorEngine.assess(
      operation, material, machine, tool, workholding,
    );
    return this.score(assessment, opts);
  }
}

export const omegaSafetyScoreEngine = new OmegaSafetyScoreEngine();
