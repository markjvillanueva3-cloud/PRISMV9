/**
 * CrossProcessFormulaNeuralEnsembleEngine — XPROC-NEURAL Tier 8 (T8-04)
 *
 * Weighted blend: prediction = α · formula(state) + (1-α) · neural(state)
 *
 * α adapts based on confidence signals:
 *   - High formula confidence (well-validated material/process) → α↑ (trust formula)
 *   - High neural drift / low calibration (T5-04) → α↓ (formula override)
 *   - High agreement between formula and neural → α≈0.5 (either works)
 *   - High disagreement → escalate; report both candidates with explanation
 *
 * Default α adaptation rule (Lakshminarayanan et al. 2017 deep ensembles
 * + Gal & Ghahramani 2016 MC dropout adaptive blending):
 *
 *   α = clamp(α_base + κ_calib · (calibration - 0.5) - κ_drift · drift, α_min, α_max)
 *
 * where:
 *   α_base       = 0.5 (equal trust)
 *   calibration  = ∈[0,1] from T5-04 (1 = well-calibrated neural)
 *   drift        = ∈[0,1] from T3-02 (1 = high drift)
 *   κ_calib      = 0.4 (how much calibration shifts trust toward neural)
 *   κ_drift      = 0.3 (how much drift shifts trust toward formula)
 *   α_min, α_max = 0.05, 0.95 (never drop a side completely)
 *
 * Disagreement escalation: if |formula − neural| / max(|formula|, |neural|, ε)
 * exceeds disagreement_threshold (default 0.30), the engine returns
 * blend_decision='escalate' and refuses to commit to a single number — the
 * operator must adjudicate per CLAUDE.md operator-in-the-loop mandate.
 *
 * Per T8-01 composition: blended prediction is OPTIONALLY projected onto
 * the symbolic feasible region. We do NOT auto-import T8-01 here (avoids
 * circular coupling); instead the orchestrator chains T8-04 → T8-01.
 *
 * @module CrossProcessFormulaNeuralEnsembleEngine
 */

import { z } from "zod";

const BlendInputSchema = z.object({
  formula_prediction: z.number().finite().describe("Physics-based prediction (e.g. Kienzle SF estimate)"),
  neural_prediction: z.number().finite().describe("Neural prediction from T1-02 surrogate"),
  calibration_score: z.number().min(0).max(1).default(0.5).describe("T5-04 calibration ∈[0,1]; 1 = well-calibrated neural"),
  drift_score: z.number().min(0).max(1).default(0.0).describe("T3-02 drift ∈[0,1]; 1 = high drift"),
  alpha_base: z.number().min(0).max(1).default(0.5),
  kappa_calib: z.number().min(0).max(1).default(0.4),
  kappa_drift: z.number().min(0).max(1).default(0.3),
  alpha_min: z.number().min(0).max(0.5).default(0.05),
  alpha_max: z.number().min(0.5).max(1).default(0.95),
  disagreement_threshold: z.number().min(0).max(1).default(0.3),
  formula_label: z.string().min(1).default("kienzle"),
  neural_label: z.string().min(1).default("T1-02"),
});
export type BlendInput = z.infer<typeof BlendInputSchema>;

export type BlendDecision = "ok" | "escalate";

export interface BlendResult {
  blended_prediction: number | null;  // null when escalated
  alpha: number;
  formula_weight: number;
  neural_weight: number;
  formula_prediction: number;
  neural_prediction: number;
  disagreement: number;       // |formula − neural| / max(|formula|, |neural|, ε)
  decision: BlendDecision;
  rationale: string;
}

const WeightReportInputSchema = z.object({
  calibration_score: z.number().min(0).max(1),
  drift_score: z.number().min(0).max(1),
  alpha_base: z.number().min(0).max(1).default(0.5),
  kappa_calib: z.number().min(0).max(1).default(0.4),
  kappa_drift: z.number().min(0).max(1).default(0.3),
  alpha_min: z.number().min(0).max(0.5).default(0.05),
  alpha_max: z.number().min(0.5).max(1).default(0.95),
});
export type WeightReportInput = z.infer<typeof WeightReportInputSchema>;

export interface WeightReportResult {
  alpha: number;
  formula_weight: number;
  neural_weight: number;
  contributions: {
    base: number;
    calib_shift: number;
    drift_shift: number;
  };
  rationale: string;
}

const EPS = 1e-9;

function computeAlpha(input: WeightReportInput): { alpha: number; baseTerm: number; calibTerm: number; driftTerm: number } {
  const baseTerm = input.alpha_base;
  const calibTerm = input.kappa_calib * (input.calibration_score - 0.5);
  const driftTerm = -input.kappa_drift * input.drift_score;
  const raw = baseTerm + calibTerm + driftTerm;
  const alpha = Math.min(input.alpha_max, Math.max(input.alpha_min, raw));
  return { alpha, baseTerm, calibTerm, driftTerm };
}

export class CrossProcessFormulaNeuralEnsembleEngine {
  /**
   * Compute blended prediction with adaptive α; escalate if disagreement is too high.
   */
  static blendPredict(input: BlendInput): BlendResult {
    const parsed = BlendInputSchema.parse(input);

    const { alpha } = computeAlpha({
      calibration_score: parsed.calibration_score,
      drift_score: parsed.drift_score,
      alpha_base: parsed.alpha_base,
      kappa_calib: parsed.kappa_calib,
      kappa_drift: parsed.kappa_drift,
      alpha_min: parsed.alpha_min,
      alpha_max: parsed.alpha_max,
    });

    const formulaWeight = alpha;
    const neuralWeight = 1 - alpha;

    const denom = Math.max(Math.abs(parsed.formula_prediction), Math.abs(parsed.neural_prediction), EPS);
    const disagreement = Math.abs(parsed.formula_prediction - parsed.neural_prediction) / denom;

    if (disagreement > parsed.disagreement_threshold) {
      return {
        blended_prediction: null,
        alpha,
        formula_weight: formulaWeight,
        neural_weight: neuralWeight,
        formula_prediction: parsed.formula_prediction,
        neural_prediction: parsed.neural_prediction,
        disagreement,
        decision: "escalate",
        rationale:
          `ESCALATE: |${parsed.formula_label}=${parsed.formula_prediction.toFixed(3)} − ` +
          `${parsed.neural_label}=${parsed.neural_prediction.toFixed(3)}| / max = ` +
          `${disagreement.toFixed(3)} > ${parsed.disagreement_threshold}. ` +
          `Operator must adjudicate per CLAUDE.md.`,
      };
    }

    const blended = formulaWeight * parsed.formula_prediction + neuralWeight * parsed.neural_prediction;
    return {
      blended_prediction: blended,
      alpha,
      formula_weight: formulaWeight,
      neural_weight: neuralWeight,
      formula_prediction: parsed.formula_prediction,
      neural_prediction: parsed.neural_prediction,
      disagreement,
      decision: "ok",
      rationale:
        `Blend OK: α=${alpha.toFixed(3)} · ${parsed.formula_label}=${parsed.formula_prediction.toFixed(3)} + ` +
        `(1−α)=${neuralWeight.toFixed(3)} · ${parsed.neural_label}=${parsed.neural_prediction.toFixed(3)} = ` +
        `${blended.toFixed(3)}; disagreement=${disagreement.toFixed(3)}.`,
    };
  }

  /**
   * Report α and the per-term decomposition for audit.
   */
  static weightReport(input: WeightReportInput): WeightReportResult {
    const parsed = WeightReportInputSchema.parse(input);
    const { alpha, baseTerm, calibTerm, driftTerm } = computeAlpha(parsed);
    return {
      alpha,
      formula_weight: alpha,
      neural_weight: 1 - alpha,
      contributions: {
        base: baseTerm,
        calib_shift: calibTerm,
        drift_shift: driftTerm,
      },
      rationale:
        `α = clamp(${baseTerm.toFixed(3)} + ${calibTerm.toFixed(3)} + ${driftTerm.toFixed(3)}, ` +
        `${parsed.alpha_min}, ${parsed.alpha_max}) = ${alpha.toFixed(3)}.`,
    };
  }

  static readonly engineId = "CrossProcessFormulaNeuralEnsembleEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T8-04";
}

export const crossProcessFormulaNeuralEnsembleEngine = CrossProcessFormulaNeuralEnsembleEngine;

export function crossProcessFormulaNeuralEnsemble(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_blend_predict":
      return CrossProcessFormulaNeuralEnsembleEngine.blendPredict(params as BlendInput);
    case "xproc_blend_weight_report":
      return CrossProcessFormulaNeuralEnsembleEngine.weightReport(params as WeightReportInput);
    default:
      throw new Error(`crossProcessFormulaNeuralEnsemble: unknown action '${action}'`);
  }
}
