/**
 * LatheLoRAUncertaintyQuantifierEngine — LATHE-LORA-MS0/U-LLR-UNCERTAINTY
 *
 * The calibration / uncertainty gate of the lathe self-improving-AI loop. It takes a
 * candidate LoRA prediction (its stated confidence + the evidence around it) and answers
 * ONE safety-critical question: can this prediction run autonomously, or must a human
 * review it, or must it be rejected outright?
 *
 *   verdict ∈ { "auto" | "review" | "reject" }
 *
 * It quantifies total uncertainty from the signals that ARE present — epistemic (how much
 * past data backs it), aleatoric/conflict (did the fusion sources disagree — see U-LLR-FUSION),
 * and reliability (is the model historically over-confident) — RENORMALISING the weights over
 * the present signals so an absent signal contributes no dead weight (per the alarm-component
 * doctrine: exclude null-signal families, never add a phantom +0). With NO modulating signal it
 * defaults to NEUTRAL uncertainty so an unsupported prediction can never silently auto-pass.
 *
 * Calibrated confidence = modelConfidence · (1 − uncertainty).
 *
 * SAFETY (never softened): canonical S(x) bands gate hard — S(x) < 0.70 (HARD BLOCK / red) →
 * reject regardless of confidence; 0.70 ≤ S(x) < 0.90 (WARNING / yellow) → capped at "review"
 * (auto is impossible). Any explicit hazard flag (tool-breakage / collision risk) → reject.
 * S(x) band thresholds per physics/CLAUDE.md §"S(x) Safety Scoring".
 *
 * Deterministic + pure (no Date.now / RNG / I/O). Holds no state. Dual-wired:
 * prism_turning:lathe_lora_calibration_gate AND prism_safety:lathe_lora_calibration_gate.
 */

export type CalibrationVerdict = "auto" | "review" | "reject";

/** Calibrated-confidence gate thresholds (autonomy policy, not physics material constants). */
const AUTO_CONFIDENCE = 0.85; // ≥ → eligible for autonomous execution
const REVIEW_CONFIDENCE = 0.5; // ≥ → operator review; below → reject
/** Canonical S(x) safety bands — physics/CLAUDE.md §"S(x) Safety Scoring". NEVER soften. */
const SX_HARD_BLOCK = 0.7; // S(x) < 0.70 → reject (red)
const SX_WARNING = 0.9; // 0.70 ≤ S(x) < 0.90 → cap at review (yellow)
/** Sample count at which epistemic uncertainty saturates to 0 (enough history to trust). */
const SUPPORT_SATURATION = 20;
/** Uncertainty when NO modulating signal is present — conservative (cannot auto-pass on nothing). */
const NEUTRAL_UNCERTAINTY = 0.5;
/** Default component weights (renormalised over present signals). */
const W_EPISTEMIC = 0.4;
const W_CONFLICT = 0.35;
const W_RELIABILITY = 0.25;

export interface LatheUncertaintyInput {
  /** The model/adapter's own stated confidence ∈ [0,1]. Required (clamped if out of range). */
  modelConfidence: number;
  /** # of past similar outcomes supporting this prediction (epistemic — more → less uncertain). */
  sampleSupport?: number;
  /** Historical success rate of this model/adapter ∈ [0,1] (over-confidence calibration reference). */
  historicalSuccessRate?: number;
  /** # of fused params whose sources conflicted (from U-LLR-FUSION conflicts[]). */
  conflictCount?: number;
  /** Total fused params considered (denominator for the conflict fraction; >0 to count). */
  paramCount?: number;
  /** Canonical S(x) safety score ∈ [0,1] (from prism_safety) — drives the hard bands. */
  safetyScore?: number;
  /** Hard hazard flags — any true forces reject (safety override). */
  toolBreakageRisk?: boolean;
  collisionRisk?: boolean;
}

export interface LatheUncertaintyComponent {
  name: "epistemic" | "conflict" | "reliability";
  /** Component uncertainty ∈ [0,1] (higher = more uncertain). */
  value: number;
  /** Renormalised weight applied to this component. */
  weight: number;
}

export interface LatheUncertaintyResult {
  verdict: CalibrationVerdict;
  /** modelConfidence · (1 − uncertainty), clamped [0,1]. */
  calibratedConfidence: number;
  /** Total renormalised uncertainty ∈ [0,1]. */
  uncertainty: number;
  /** The signals that contributed (absent signals are omitted, not zero-weighted). */
  components: LatheUncertaintyComponent[];
  /** Human-readable WHY for the verdict (R12 — surface the reasoning, never a bare label). */
  reasons: string[];
  thresholds: { autoConfidence: number; reviewConfidence: number; sxHardBlock: number; sxWarning: number };
}

const isFiniteNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export class LatheLoRAUncertaintyQuantifierEngine {
  /**
   * Quantify uncertainty + emit a calibration gate verdict for a lathe LoRA prediction.
   * @param input prediction confidence + surrounding evidence (epistemic / conflict / reliability / S(x) / hazards)
   * @returns verdict (auto|review|reject) + calibrated confidence + renormalised uncertainty + reasons
   * @throws if modelConfidence is not a finite number
   */
  assess(input: LatheUncertaintyInput): LatheUncertaintyResult {
    if (!input || typeof input !== "object" || !isFiniteNum(input.modelConfidence)) {
      throw new Error("LatheLoRAUncertaintyQuantifier.assess: finite numeric 'modelConfidence' required");
    }
    const reasons: string[] = [];
    const modelConfidence = clamp01(input.modelConfidence);
    if (input.modelConfidence !== modelConfidence) {
      reasons.push(`modelConfidence ${input.modelConfidence} clamped to ${modelConfidence}`);
    }

    // --- Build the uncertainty components that ARE present. ---
    const raw: { name: LatheUncertaintyComponent["name"]; value: number; baseWeight: number }[] = [];

    if (isFiniteNum(input.sampleSupport)) {
      const support = Math.max(0, input.sampleSupport);
      const epistemic = clamp01(1 - support / SUPPORT_SATURATION);
      raw.push({ name: "epistemic", value: epistemic, baseWeight: W_EPISTEMIC });
    }
    if (isFiniteNum(input.conflictCount) && isFiniteNum(input.paramCount) && input.paramCount > 0) {
      const conflict = clamp01(Math.max(0, input.conflictCount) / input.paramCount);
      raw.push({ name: "conflict", value: conflict, baseWeight: W_CONFLICT });
    }
    if (isFiniteNum(input.historicalSuccessRate)) {
      // Only the OVER-confidence gap adds uncertainty (claimed > delivered). Under-confidence does not.
      const reliability = clamp01(modelConfidence - clamp01(input.historicalSuccessRate));
      raw.push({ name: "reliability", value: reliability, baseWeight: W_RELIABILITY });
    }

    let uncertainty: number;
    const components: LatheUncertaintyComponent[] = [];
    if (raw.length === 0) {
      uncertainty = NEUTRAL_UNCERTAINTY;
      reasons.push(`no epistemic/conflict/reliability signal — neutral uncertainty ${NEUTRAL_UNCERTAINTY} applied (cannot auto-pass unsupported)`);
    } else {
      // Renormalise weights over present components (no dead phantom weight from absent signals).
      const wsum = raw.reduce((s, c) => s + c.baseWeight, 0);
      uncertainty = 0;
      for (const c of raw) {
        const weight = c.baseWeight / wsum;
        uncertainty += c.value * weight;
        components.push({ name: c.name, value: round3(c.value), weight: round3(weight) });
      }
    }
    uncertainty = clamp01(uncertainty);
    const calibratedConfidence = clamp01(modelConfidence * (1 - uncertainty));

    // --- Verdict: confidence-based, then non-softenable safety overrides. ---
    let verdict: CalibrationVerdict =
      calibratedConfidence >= AUTO_CONFIDENCE
        ? "auto"
        : calibratedConfidence >= REVIEW_CONFIDENCE
          ? "review"
          : "reject";
    reasons.push(
      `calibrated confidence ${round3(calibratedConfidence)} (model ${modelConfidence} × (1−${round3(uncertainty)})) → ${verdict} by confidence band`,
    );

    // Hard hazard flags — unconditional reject.
    if (input.toolBreakageRisk === true || input.collisionRisk === true) {
      verdict = "reject";
      reasons.push(
        `HARD REJECT — hazard flag set (${[input.toolBreakageRisk && "tool-breakage", input.collisionRisk && "collision"].filter(Boolean).join(", ")})`,
      );
    } else if (isFiniteNum(input.safetyScore)) {
      const sx = clamp01(input.safetyScore);
      if (sx < SX_HARD_BLOCK) {
        verdict = "reject";
        reasons.push(`HARD REJECT — S(x) ${round3(sx)} < ${SX_HARD_BLOCK} (canonical red band)`);
      } else if (sx < SX_WARNING && verdict === "auto") {
        verdict = "review";
        reasons.push(`auto→review — S(x) ${round3(sx)} in [${SX_HARD_BLOCK},${SX_WARNING}) warning band (autonomy not permitted)`);
      }
    }

    return {
      verdict,
      calibratedConfidence: round3(calibratedConfidence),
      uncertainty: round3(uncertainty),
      components,
      reasons,
      thresholds: {
        autoConfidence: AUTO_CONFIDENCE,
        reviewConfidence: REVIEW_CONFIDENCE,
        sxHardBlock: SX_HARD_BLOCK,
        sxWarning: SX_WARNING,
      },
    };
  }
}

export const latheLoRAUncertaintyQuantifierEngine = new LatheLoRAUncertaintyQuantifierEngine();
