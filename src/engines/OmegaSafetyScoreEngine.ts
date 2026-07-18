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
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GATE_THRESHOLD = 0.70;

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
   */
  score(assessment: SafetyAssessment): OmegaSafetyResult {
    const perDim: Record<string, number> = {};
    let product = 1;
    let count = 0;

    for (const dimName of DIMENSION_NAMES) {
      const dim: RiskDimension = assessment.dimensions[dimName];
      const s = RISK_SCORE[dim.risk] ?? 0;
      perDim[dimName] = s;
      product *= s;
      count++;
    }

    // Geometric mean: (s1 × s2 × ... × sN)^(1/N)
    const omega = assessment.vetoed ? 0 : Math.pow(product, 1 / count);
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
    }

    return {
      omega_safety: Math.round(omega * 1000) / 1000,
      passed,
      gate_threshold: GATE_THRESHOLD,
      per_dimension: perDim,
      vetoed: assessment.vetoed,
      justification,
      recommendations,
    };
  }

  /**
   * Full evaluate: run PipelineSafetyOrchestrator assessment then score it.
   */
  evaluate(
    operation: OperationInput,
    material: MaterialInput,
    machine: MachineInput,
    tool: ToolInput,
    workholding: WorkholdingInput,
  ): OmegaSafetyResult {
    const assessment = pipelineSafetyOrchestratorEngine.assess(
      operation, material, machine, tool, workholding,
    );
    return this.score(assessment);
  }
}

export const omegaSafetyScoreEngine = new OmegaSafetyScoreEngine();
