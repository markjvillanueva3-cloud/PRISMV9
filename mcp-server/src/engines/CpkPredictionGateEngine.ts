/**
 * CpkPredictionGateEngine — CAMX-MS12/U12
 *
 * Process-capability (Cpk) gate for strategy selection.  For each candidate
 * strategy, estimates Cpk from predicted process variability vs tolerance.
 * Rejects strategies with Cpk < 1.33 (MIN_ACCEPTABLE).  Prefers Cpk > 2.0
 * (IDEAL).  Uses 6σ definition: Cpk = min((USL-μ)/3σ, (μ-LSL)/3σ).
 *
 * Methods:
 *   gate(candidates, tolerance_mm, min_cpk?)      → GateResult
 *   filter(candidates, tolerance_mm, min_cpk?)    → CandidatePrediction[] passing only
 *   computeCpk(mean, stddev, lsl, usl)            → number
 *
 * @engine CpkPredictionGateEngine
 * @shortcode E1203
 * @dispatcher camDispatcher
 * @actions strategy_cpk_gate, strategy_cpk_filter
 * @milestone CAMX-MS12/U12
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum acceptable Cpk — reject below this threshold. */
export const MIN_ACCEPTABLE_CPK = 1.33;
/** Ideal target Cpk — prefer candidates above this. */
export const IDEAL_CPK = 2.0;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CandidatePrediction {
  strategy_id: string;
  /** Predicted dimensional mean (bias), mm. Typically 0 for centered process. */
  predicted_mean_error_mm?: number;
  /** Predicted dimensional stddev σ, mm. Must be > 0. */
  predicted_stddev_mm: number;
  /** Optional extra metadata carried through. */
  meta?: Record<string, unknown>;
}

export interface CpkGateDecision {
  strategy_id: string;
  cpk: number;
  status: "ideal" | "acceptable" | "rejected";
  reason: string;
  meta?: Record<string, unknown>;
}

export interface GateResult {
  decisions: CpkGateDecision[];
  accepted: CpkGateDecision[];
  ideal: CpkGateDecision[];
  rejected: CpkGateDecision[];
  min_cpk_threshold: number;
  ideal_threshold: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cpk = min((USL-μ)/3σ, (μ-LSL)/3σ).  Returns finite number (0 when σ≤0). */
export function computeCpk(mean: number, stddev: number, lsl: number, usl: number): number {
  if (!Number.isFinite(mean) || !Number.isFinite(stddev) || stddev <= 0) return 0;
  const upper = (usl - mean) / (3 * stddev);
  const lower = (mean - lsl) / (3 * stddev);
  return Math.min(upper, lower);
}

function classify(cpk: number, minThreshold: number, idealThreshold: number): "ideal" | "acceptable" | "rejected" {
  if (cpk >= idealThreshold) return "ideal";
  if (cpk >= minThreshold) return "acceptable";
  return "rejected";
}

function reasonFor(cpk: number, status: string, minT: number, idealT: number): string {
  if (status === "ideal") return `Cpk ${cpk.toFixed(2)} ≥ ${idealT.toFixed(2)} (ideal). High process margin.`;
  if (status === "acceptable") return `Cpk ${cpk.toFixed(2)} in [${minT.toFixed(2)}, ${idealT.toFixed(2)}) — acceptable but not ideal.`;
  return `Cpk ${cpk.toFixed(2)} < ${minT.toFixed(2)} — process capability insufficient, rejected.`;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class CpkPredictionGateEngine {
  readonly MIN_ACCEPTABLE = MIN_ACCEPTABLE_CPK;
  readonly IDEAL = IDEAL_CPK;

  computeCpk(mean: number, stddev: number, lsl: number, usl: number): number {
    return computeCpk(mean, stddev, lsl, usl);
  }

  /**
   * Gate candidates against min_cpk threshold.
   *
   * @param candidates      Array of CandidatePrediction
   * @param tolerance_mm    Bilateral tolerance (±). USL=+tol, LSL=-tol.
   * @param min_cpk         Minimum acceptable (default 1.33)
   * @param ideal_cpk       Ideal threshold (default 2.0)
   */
  gate(
    candidates: CandidatePrediction[],
    tolerance_mm: number,
    min_cpk: number = MIN_ACCEPTABLE_CPK,
    ideal_cpk: number = IDEAL_CPK,
  ): GateResult {
    if (tolerance_mm <= 0) throw new Error("tolerance_mm must be > 0");
    if (min_cpk <= 0) throw new Error("min_cpk must be > 0");
    if (ideal_cpk < min_cpk) throw new Error("ideal_cpk must be ≥ min_cpk");

    const lsl = -tolerance_mm;
    const usl = +tolerance_mm;

    const decisions: CpkGateDecision[] = candidates.map(c => {
      const cpk = computeCpk(c.predicted_mean_error_mm ?? 0, c.predicted_stddev_mm, lsl, usl);
      const status = classify(cpk, min_cpk, ideal_cpk);
      return {
        strategy_id: c.strategy_id,
        cpk: Math.round(cpk * 1000) / 1000,
        status,
        reason: reasonFor(cpk, status, min_cpk, ideal_cpk),
        meta: c.meta,
      };
    });

    return {
      decisions,
      accepted: decisions.filter(d => d.status !== "rejected"),
      ideal: decisions.filter(d => d.status === "ideal"),
      rejected: decisions.filter(d => d.status === "rejected"),
      min_cpk_threshold: min_cpk,
      ideal_threshold: ideal_cpk,
    };
  }

  /** Return only candidates passing the gate (ideal or acceptable). */
  filter(
    candidates: CandidatePrediction[],
    tolerance_mm: number,
    min_cpk: number = MIN_ACCEPTABLE_CPK,
  ): CandidatePrediction[] {
    const lsl = -tolerance_mm;
    const usl = +tolerance_mm;
    return candidates.filter(c => {
      const cpk = computeCpk(c.predicted_mean_error_mm ?? 0, c.predicted_stddev_mm, lsl, usl);
      return cpk >= min_cpk;
    });
  }
}

export const cpkPredictionGateEngine = new CpkPredictionGateEngine();
export { CpkPredictionGateEngine };
