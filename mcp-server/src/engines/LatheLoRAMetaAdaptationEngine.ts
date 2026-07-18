/**
 * LatheLoRAMetaAdaptationEngine — LATHE-LORA-MS0/U-LLR-META
 *
 * The meta-adaptation / promotion-decision capstone of the lathe self-improving-AI loop.
 * After a retrain (driven by the ledger #2 → extractor #1 → fusion #4 → calibration #5 →
 * select/ensemble #6/#7 cycle), this engine answers: should the newly-adapted lathe LoRA
 * adapter REPLACE the incumbent in production?
 *
 * Two gates, both required to promote (R12 — a model is promoted only on EARNED evidence):
 *   1. ABSOLUTE deploy-ready gate — mirrors the canonical nn-graph retrain gate
 *      (scripts/lib/nn-graph-eval.mjs `gradeMetrics` / `GATE_THRESHOLDS`):
 *      AUROC ≥ 0.78 · macro-F1 ≥ 0.55 · Brier ≤ 0.15. A missing/non-finite metric is a
 *      FAILURE, never a silent pass.
 *   2. MEASURED LIFT over the incumbent — the candidate must out-perform the current
 *      production adapter by at least `minLift` on the chosen higher-is-better metric.
 *      A candidate that merely clears the absolute gate but does NOT beat the incumbent is
 *      HELD (keep the incumbent — no churn, no regression risk). Unmeasurable lift → HOLD.
 *
 *   verdict ∈ { "promote" | "hold" | "reject" }
 *     reject  — fails the absolute deploy-ready gate (not fit to deploy at all)
 *     hold    — deploy-ready but no measurable lift over the incumbent (keep incumbent)
 *     promote — deploy-ready AND beats the incumbent by ≥ minLift (or there is no incumbent)
 *
 * Reuses the nn-graph promote-decision PATTERN; the gate thresholds are duplicated as
 * documented named constants (the canonical source is an .mjs script outside src/ — a
 * cross-module-system import would break the TS build; they are ML-policy gates, not
 * physics material constants). Deterministic + pure; holds no state.
 */

export type PromotionVerdict = "promote" | "hold" | "reject";
export type LiftMetric = "auroc" | "macroF1" | "successRate";

/**
 * Canonical deploy-ready gate thresholds — mirror of
 * scripts/lib/nn-graph-eval.mjs `GATE_THRESHOLDS` (AUROC ≥ 0.78 · macro-F1 ≥ 0.55 · Brier ≤ 0.15).
 * Keep in sync with that file if the canonical gate ever moves.
 */
const GATE_AUROC = 0.78; // higher is better → minimum
const GATE_MACRO_F1 = 0.55; // higher is better → minimum
const GATE_BRIER = 0.15; // lower is better → maximum
/** Default minimum measured lift over the incumbent on the chosen metric (absolute, anti-churn margin). */
const DEFAULT_MIN_LIFT = 0.02;
/** Lift metric default — AUROC (a primary deploy gate metric). */
const DEFAULT_LIFT_METRIC: LiftMetric = "auroc";
const VALID_LIFT_METRICS: readonly LiftMetric[] = ["auroc", "macroF1", "successRate"] as const;

/** Held-out evaluation metrics for one adapter. */
export interface AdapterMetrics {
  /** Area under ROC ∈ [0,1] (higher better). */
  auroc?: number;
  /** Macro-averaged F1 ∈ [0,1] (higher better). */
  macroF1?: number;
  /** Brier score ∈ [0,1] (LOWER better). */
  brier?: number;
  /** Lathe-domain held-out success rate ∈ [0,1] (higher better) — optional lift metric. */
  successRate?: number;
}

export interface LatheMetaAdaptationInput {
  /** The retrained candidate adapter's held-out eval. Required. */
  candidate: AdapterMetrics;
  /** The current production adapter's eval. Omit → no incumbent (first deployable model). */
  incumbent?: AdapterMetrics;
  /** Override the absolute gate thresholds (default 0.78 / 0.55 / 0.15). */
  gates?: { auroc?: number; macroF1?: number; brier?: number };
  /** Minimum measured lift over the incumbent to justify promotion (default 0.02; clamped ≥0). */
  minLift?: number;
  /** Which higher-is-better metric defines lift (default "auroc"). */
  liftMetric?: LiftMetric;
}

export interface LatheMetaAdaptationResult {
  verdict: PromotionVerdict;
  /** Absolute deploy-ready gate outcome (mirrors gradeMetrics). */
  absoluteGate: { pass: boolean; failures: string[] };
  /** Measured-lift assessment over the incumbent. */
  lift: {
    metric: LiftMetric;
    candidate: number | null;
    incumbent: number | null;
    /** candidate − incumbent on the lift metric (null if either side unmeasurable / no incumbent). */
    delta: number | null;
    required: number;
    meets: boolean;
  };
  reasons: string[];
  gates: { auroc: number; macroF1: number; brier: number };
}

const isFiniteNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export class LatheLoRAMetaAdaptationEngine {
  /**
   * Mirror of nn-graph-eval `gradeMetrics` — grade an adapter's metrics against the absolute gates.
   * A missing/non-finite metric is a failure, never a silent pass.
   */
  private gradeAbsolute(
    m: AdapterMetrics,
    gates: { auroc: number; macroF1: number; brier: number },
  ): { pass: boolean; failures: string[] } {
    const failures: string[] = [];
    if (!isFiniteNum(m.auroc) || m.auroc < gates.auroc) {
      failures.push(`AUROC ${isFiniteNum(m.auroc) ? m.auroc.toFixed(4) : "n/a"} < ${gates.auroc}`);
    }
    if (!isFiniteNum(m.macroF1) || m.macroF1 < gates.macroF1) {
      failures.push(`macro-F1 ${isFiniteNum(m.macroF1) ? m.macroF1.toFixed(4) : "n/a"} < ${gates.macroF1}`);
    }
    if (!isFiniteNum(m.brier) || m.brier > gates.brier) {
      failures.push(`Brier ${isFiniteNum(m.brier) ? m.brier.toFixed(4) : "n/a"} > ${gates.brier}`);
    }
    return { pass: failures.length === 0, failures };
  }

  /**
   * Decide whether to promote a retrained lathe LoRA adapter over the incumbent.
   * @param input candidate (required) + optional incumbent + gate/lift overrides
   * @returns verdict (promote|hold|reject) + absolute-gate detail + measured-lift detail + reasons
   * @throws if `candidate` metrics are missing
   */
  decide(input: LatheMetaAdaptationInput): LatheMetaAdaptationResult {
    if (!input || typeof input !== "object" || !input.candidate || typeof input.candidate !== "object") {
      throw new Error("LatheLoRAMetaAdaptation.decide: 'candidate' metrics object required");
    }
    const gates = {
      auroc: isFiniteNum(input.gates?.auroc) ? input.gates!.auroc! : GATE_AUROC,
      macroF1: isFiniteNum(input.gates?.macroF1) ? input.gates!.macroF1! : GATE_MACRO_F1,
      brier: isFiniteNum(input.gates?.brier) ? input.gates!.brier! : GATE_BRIER,
    };
    const minLift = Math.max(0, isFiniteNum(input.minLift) ? input.minLift : DEFAULT_MIN_LIFT);
    const liftMetric: LiftMetric = VALID_LIFT_METRICS.includes(input.liftMetric as LiftMetric)
      ? (input.liftMetric as LiftMetric)
      : DEFAULT_LIFT_METRIC;

    const reasons: string[] = [];

    // --- Gate 1: absolute deploy-ready (reused nn-graph pattern). ---
    const absoluteGate = this.gradeAbsolute(input.candidate, gates);

    // --- Gate 2: measured lift over the incumbent. ---
    const candVal = input.candidate[liftMetric];
    const incVal = input.incumbent?.[liftMetric];
    const hasIncumbent = input.incumbent != null && typeof input.incumbent === "object";
    let delta: number | null = null;
    let liftMeets = false;
    if (hasIncumbent && isFiniteNum(candVal) && isFiniteNum(incVal)) {
      delta = round4(candVal - incVal);
      liftMeets = delta >= minLift;
    }

    const lift = {
      metric: liftMetric,
      candidate: isFiniteNum(candVal) ? round4(candVal) : null,
      incumbent: isFiniteNum(incVal) ? round4(incVal) : null,
      delta,
      required: minLift,
      meets: liftMeets,
    };

    // --- Verdict. ---
    let verdict: PromotionVerdict;
    if (!absoluteGate.pass) {
      verdict = "reject";
      reasons.push(`REJECT — candidate fails the deploy-ready gate: ${absoluteGate.failures.join("; ")}`);
    } else if (!hasIncumbent) {
      verdict = "promote";
      reasons.push("PROMOTE — deploy-ready and there is no incumbent (first deployable adapter).");
    } else if (delta == null) {
      verdict = "hold";
      reasons.push(`HOLD — deploy-ready but lift on '${liftMetric}' is unmeasurable (candidate or incumbent value missing).`);
    } else if (liftMeets) {
      verdict = "promote";
      reasons.push(`PROMOTE — deploy-ready and beats incumbent on ${liftMetric} by ${delta} ≥ ${minLift}.`);
    } else {
      verdict = "hold";
      reasons.push(`HOLD — deploy-ready but lift on ${liftMetric} is ${delta} < required ${minLift} (keep incumbent, avoid churn/regression).`);
    }

    return { verdict, absoluteGate, lift, reasons, gates };
  }
}

export const latheLoRAMetaAdaptationEngine = new LatheLoRAMetaAdaptationEngine();
