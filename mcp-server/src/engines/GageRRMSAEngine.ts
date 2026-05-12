/**
 * GageRRMSAEngine
 * ================
 *
 * Measurement System Analysis — Gauge R&R (Repeatability & Reproducibility).
 * Supports both Average-Range (AR) method and ANOVA method per AIAG MSA 4th.
 *
 * Variance decomposition:
 *   σ²_total = σ²_part + σ²_EV + σ²_AV + σ²_INT
 *     EV  = Equipment Variation (repeatability; same operator, same part)
 *     AV  = Appraiser Variation (reproducibility; operator effect)
 *     INT = Part × Operator interaction (ANOVA only)
 *     PV  = Part Variation (product spread)
 *
 * Average-Range method (AIAG eq. III-B):
 *   EV  = R̄̄ / d₂(m)                     where m = trials, d₂ from table
 *   AV  = sqrt((X̄_diff/d₂(k))² − EV²/(n·r))
 *   R&R = sqrt(EV² + AV²)
 *   PV  = R_p / d₂(n)                    where R_p = range of part averages
 *   TV  = sqrt(R&R² + PV²)
 *
 * Acceptance criteria (% of tolerance or total variation):
 *   %GR&R ≤ 10%     : acceptable
 *   10% < %GR&R ≤ 30% : marginal (conditionally accept)
 *   %GR&R > 30%    : unacceptable — fix measurement system
 *
 * NDC (number of distinct categories): 1.41 × (PV/GR&R)
 *   NDC < 2   : useless for process control
 *   NDC 2-4   : rough classification only
 *   NDC ≥ 5   : adequate for continuous process control
 *
 * Canonical references:
 *   - AIAG MSA 4th ed. (2010), Chapter III
 *   - ASTM E2782-11 (MSA Guide)
 *
 * @module engines/GageRRMSAEngine
 * @milestone LATHE-PRO-MS8
 */

/** d₂ constant table (AIAG MSA 4th App. C) indexed by subgroup size */
const D2_TABLE: Record<number, number> = {
  1: 1.0,
  2: 1.128,
  3: 1.693,
  4: 2.059,
  5: 2.326,
  6: 2.534,
  7: 2.704,
  8: 2.847,
  9: 2.970,
  10: 3.078,
  15: 3.472,
  20: 3.735,
  25: 3.931,
};

function d2(n: number): number {
  if (D2_TABLE[n] !== undefined) return D2_TABLE[n]!;
  // Interpolate or extrapolate
  const keys = Object.keys(D2_TABLE).map(Number).sort((a, b) => a - b);
  if (n < keys[0]!) return D2_TABLE[keys[0]!]!;
  if (n > keys[keys.length - 1]!) return D2_TABLE[keys[keys.length - 1]!]!;
  for (let i = 0; i < keys.length - 1; i++) {
    if (n >= keys[i]! && n <= keys[i + 1]!) {
      const x0 = keys[i]!, x1 = keys[i + 1]!;
      const y0 = D2_TABLE[x0]!, y1 = D2_TABLE[x1]!;
      return y0 + ((y1 - y0) * (n - x0)) / (x1 - x0);
    }
  }
  return 2.326;
}

/** Measurement data organized as [operator][part][trial] */
export interface MSAInput {
  /** Raw measurements: measurements[operator][part][trial] */
  measurements: number[][][];
  /** Specification tolerance width (USL - LSL). Optional. */
  tolerance_width?: number;
  /** Method — "range" (quick) or "anova" (preferred) */
  method?: "range" | "anova";
  /** Process sigma if known (for %GR&R of process). Optional. */
  process_sigma?: number;
}

export type MSAAcceptance = "acceptable" | "marginal" | "unacceptable";

export interface MSAResult {
  method: "range" | "anova";
  ev: number;               // Equipment variation (σ)
  av: number;               // Appraiser variation (σ)
  interaction: number;      // Part × operator (ANOVA only, else 0)
  rr: number;               // Total R&R
  pv: number;               // Part variation
  tv: number;               // Total variation
  /** % Gauge R&R as fraction of TV (or tolerance if provided) */
  pct_grr_tv: number;
  pct_grr_tolerance?: number;
  /** Number of distinct categories */
  ndc: number;
  acceptance: MSAAcceptance;
  warnings: string[];
  reasoning: string[];
  /** Summary counts */
  design: { operators: number; parts: number; trials: number };
}

class GageRRMSAEngineImpl {
  analyze(i: MSAInput): MSAResult {
    const warnings: string[] = [];
    const reasoning: string[] = [];

    const method: "range" | "anova" = i.method ?? "range";
    const m = i.measurements;
    const nOp = m.length;
    const nPart = m[0]?.length ?? 0;
    const nTrial = m[0]?.[0]?.length ?? 0;

    if (nOp < 2) warnings.push("Need ≥2 operators for AV estimate — AV will be 0");
    if (nPart < 2) warnings.push("Need ≥2 parts for PV estimate");
    if (nTrial < 2) warnings.push("Need ≥2 trials for EV estimate");

    // Validate rectangular data
    for (let o = 0; o < nOp; o++) {
      if (m[o]!.length !== nPart) {
        warnings.push(`Operator ${o} has ${m[o]!.length} parts vs expected ${nPart}`);
      }
      for (let p = 0; p < m[o]!.length; p++) {
        if (m[o]![p]!.length !== nTrial) {
          warnings.push(`Operator ${o}, part ${p}: ${m[o]![p]!.length} trials vs ${nTrial}`);
        }
      }
    }

    let ev = 0, av = 0, interaction = 0, pv = 0;

    if (method === "range" || nOp === 1) {
      // --- Average-Range method ---
      reasoning.push(`Using Average-Range method on ${nOp}op × ${nPart}parts × ${nTrial}trials`);

      // Ranges per (operator, part) across trials
      const rangesPerOpPart: number[][] = [];
      for (let o = 0; o < nOp; o++) {
        rangesPerOpPart[o] = [];
        for (let p = 0; p < nPart; p++) {
          const trials = m[o]![p]!;
          const r = Math.max(...trials) - Math.min(...trials);
          rangesPerOpPart[o]![p] = r;
        }
      }
      // R̄̄ = grand mean range
      const allR = rangesPerOpPart.flat();
      const rBarBar = allR.reduce((s, x) => s + x, 0) / allR.length;
      ev = rBarBar / d2(nTrial);
      reasoning.push(`EV = R̄̄ ${rBarBar.toFixed(4)} / d₂(${nTrial})=${d2(nTrial).toFixed(3)} = ${ev.toFixed(4)}`);

      // Operator averages (mean of all measurements per operator)
      const opAvg: number[] = [];
      for (let o = 0; o < nOp; o++) {
        let sum = 0, count = 0;
        for (let p = 0; p < nPart; p++) {
          for (let t = 0; t < nTrial; t++) {
            sum += m[o]![p]![t]!;
            count++;
          }
        }
        opAvg[o] = count > 0 ? sum / count : 0;
      }
      const xDiff = nOp > 1 ? Math.max(...opAvg) - Math.min(...opAvg) : 0;
      // AV: sqrt((xDiff/d₂(nOp))² − EV²/(nPart × nTrial)), guard non-negative
      const term1 = Math.pow(xDiff / d2(nOp), 2);
      const term2 = (ev * ev) / Math.max(1, nPart * nTrial);
      av = Math.sqrt(Math.max(0, term1 - term2));
      reasoning.push(`AV from X̄_diff=${xDiff.toFixed(4)} → AV=${av.toFixed(4)}`);

      // PV: range of part averages across all operators/trials
      const partAvg: number[] = [];
      for (let p = 0; p < nPart; p++) {
        let sum = 0, count = 0;
        for (let o = 0; o < nOp; o++) {
          for (let t = 0; t < nTrial; t++) {
            sum += m[o]![p]![t]!;
            count++;
          }
        }
        partAvg[p] = count > 0 ? sum / count : 0;
      }
      const rp = partAvg.length > 0 ? Math.max(...partAvg) - Math.min(...partAvg) : 0;
      pv = rp / d2(nPart);
    } else {
      // --- ANOVA method ---
      reasoning.push(`Using ANOVA method on ${nOp}op × ${nPart}parts × ${nTrial}trials`);
      const N = nOp * nPart * nTrial;

      // Grand mean
      let grand = 0;
      for (let o = 0; o < nOp; o++) {
        for (let p = 0; p < nPart; p++) {
          for (let t = 0; t < nTrial; t++) grand += m[o]![p]![t]!;
        }
      }
      grand /= N;

      // Means
      const opMean: number[] = new Array(nOp).fill(0);
      const partMean: number[] = new Array(nPart).fill(0);
      const cellMean: number[][] = Array.from({ length: nOp }, () => new Array(nPart).fill(0));
      for (let o = 0; o < nOp; o++) {
        for (let p = 0; p < nPart; p++) {
          let cell = 0;
          for (let t = 0; t < nTrial; t++) cell += m[o]![p]![t]!;
          cell /= nTrial;
          cellMean[o]![p] = cell;
          opMean[o]! += cell / nPart;
          partMean[p]! += cell / nOp;
        }
      }

      // Sum of squares
      let ssOp = 0, ssPart = 0, ssInt = 0, ssErr = 0;
      for (let o = 0; o < nOp; o++) ssOp += nPart * nTrial * Math.pow(opMean[o]! - grand, 2);
      for (let p = 0; p < nPart; p++) ssPart += nOp * nTrial * Math.pow(partMean[p]! - grand, 2);
      for (let o = 0; o < nOp; o++) {
        for (let p = 0; p < nPart; p++) {
          ssInt += nTrial * Math.pow(cellMean[o]![p]! - opMean[o]! - partMean[p]! + grand, 2);
          for (let t = 0; t < nTrial; t++) {
            ssErr += Math.pow(m[o]![p]![t]! - cellMean[o]![p]!, 2);
          }
        }
      }

      // Mean squares
      const msOp = ssOp / Math.max(1, nOp - 1);
      const msPart = ssPart / Math.max(1, nPart - 1);
      const msInt = ssInt / Math.max(1, (nOp - 1) * (nPart - 1));
      const msErr = ssErr / Math.max(1, nOp * nPart * (nTrial - 1));

      // Variance components (guard non-negative)
      const varErr = Math.max(0, msErr);
      const varInt = Math.max(0, (msInt - msErr) / nTrial);
      const varOp = Math.max(0, (msOp - msInt) / (nPart * nTrial));
      const varPart = Math.max(0, (msPart - msInt) / (nOp * nTrial));

      ev = Math.sqrt(varErr);
      av = Math.sqrt(varOp);
      interaction = Math.sqrt(varInt);
      pv = Math.sqrt(varPart);
      reasoning.push(`MS: op=${msOp.toFixed(4)} part=${msPart.toFixed(4)} int=${msInt.toFixed(4)} err=${msErr.toFixed(4)}`);
    }

    const rr = Math.sqrt(ev * ev + av * av + interaction * interaction);
    const tv = Math.sqrt(rr * rr + pv * pv);
    const pctGrrTv = tv > 0 ? (rr / tv) * 100 : 0;

    let pctGrrTol: number | undefined;
    if (i.tolerance_width && i.tolerance_width > 0) {
      pctGrrTol = ((6 * rr) / i.tolerance_width) * 100;
    }

    const ndc = rr > 0 ? 1.41 * (pv / rr) : 0;

    const controllingMetric = pctGrrTol ?? pctGrrTv;
    let acceptance: MSAAcceptance;
    if (controllingMetric <= 10) acceptance = "acceptable";
    else if (controllingMetric <= 30) acceptance = "marginal";
    else acceptance = "unacceptable";

    if (ndc < 2) warnings.push(`NDC=${ndc.toFixed(1)} < 2 — measurement cannot distinguish parts`);
    else if (ndc < 5) warnings.push(`NDC=${ndc.toFixed(1)} < 5 — limited resolution for process control`);

    return {
      method,
      ev: round4(ev),
      av: round4(av),
      interaction: round4(interaction),
      rr: round4(rr),
      pv: round4(pv),
      tv: round4(tv),
      pct_grr_tv: round2(pctGrrTv),
      pct_grr_tolerance: pctGrrTol !== undefined ? round2(pctGrrTol) : undefined,
      ndc: round2(ndc),
      acceptance,
      warnings,
      reasoning,
      design: { operators: nOp, parts: nPart, trials: nTrial },
    };
  }

  getStats(): { acceptance_thresholds: Record<MSAAcceptance, string>; reference: string } {
    return {
      acceptance_thresholds: {
        acceptable: "%GR&R ≤ 10%",
        marginal: "10% < %GR&R ≤ 30%",
        unacceptable: "%GR&R > 30%",
      },
      reference: "AIAG MSA 4th ed. (2010) Chapter III",
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const gageRRMSAEngine = new GageRRMSAEngineImpl();
export type { GageRRMSAEngineImpl };
