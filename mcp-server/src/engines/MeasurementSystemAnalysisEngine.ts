/**
 * MeasurementSystemAnalysisEngine — Gage R&R via ANOVA (crossed design)
 *
 * Phase 0.22 U-SPC5. Quantifies the portion of total observed variation that
 * comes from the measurement system itself, per the AIAG MSA 4th edition
 * (2010) methodology. Uses the two-factor crossed ANOVA with interaction, the
 * default for typical shop-floor repeatability & reproducibility studies
 * (parts × appraisers × trials).
 *
 * Variance-component model:
 *
 *   σ²_total     = σ²_part + σ²_appraiser + σ²_interaction + σ²_repeatability
 *   EV² (repeatability) = MS_E
 *   AV² (reproducibility, appraiser) = (MS_A − MS_AP) / (n_part · n_trial)
 *   IV² (interaction)   = (MS_AP − MS_E) / n_trial
 *   PV² (part-to-part)  = (MS_P − MS_AP) / (n_app · n_trial)
 *   GRR² = EV² + AV² + IV²
 *   TV²  = GRR² + PV²
 *
 * Negative estimates are set to zero (AIAG §III.B.2). %Study = 100·σ/σ_total.
 * NDC = ⌊1.41 · (PV / GRR)⌋ (distinct-category count; ≥5 is acceptable).
 *
 * AIAG acceptability on %GRR (σ basis): <10% acceptable, 10–30% marginal,
 * >30% unacceptable.
 *
 * @module engines/MeasurementSystemAnalysisEngine
 * @milestone PP-0.22-U-SPC5
 */

import { z } from "zod";

export const MsaStudySchema = z.object({
  /**
   * Trials as measurements[part][appraiser][trial]. All three dimensions
   * must be rectangular (same length across the inner arrays).
   */
  measurements: z
    .array(z.array(z.array(z.number().finite())).nonempty())
    .nonempty(),
  /** Tolerance (USL−LSL). Required for %Tolerance column; otherwise omit. */
  tolerance: z.number().positive().optional(),
  /** Historical process variation (6σ). Overrides computed TV if provided. */
  processVariation: z.number().positive().optional(),
});

export type MsaStudy = z.infer<typeof MsaStudySchema>;

export interface MsaComponent {
  variance: number;
  stddev: number;
  percentStudy: number;
  percentTolerance: number | null;
}

export type MsaVerdict = "acceptable" | "marginal" | "unacceptable";

export interface MsaResult {
  nParts: number;
  nAppraisers: number;
  nTrials: number;
  anova: {
    SS_part: number;
    SS_appraiser: number;
    SS_interaction: number;
    SS_equipment: number;
    SS_total: number;
    DF_part: number;
    DF_appraiser: number;
    DF_interaction: number;
    DF_equipment: number;
    DF_total: number;
    MS_part: number;
    MS_appraiser: number;
    MS_interaction: number;
    MS_equipment: number;
    F_part: number;
    F_appraiser: number;
    F_interaction: number;
  };
  repeatability: MsaComponent;
  reproducibility: MsaComponent;
  interaction: MsaComponent;
  partVariation: MsaComponent;
  gageRR: MsaComponent;
  totalVariation: { variance: number; stddev: number };
  ndc: number;
  verdict: MsaVerdict;
  interactionSignificant: boolean;
}

const ACCEPTABLE_PCT = 10;
const MARGINAL_PCT = 30;

export class MeasurementSystemAnalysisEngine {
  static analyze(study: MsaStudy): MsaResult {
    const parsed = MsaStudySchema.parse(study);
    const { measurements } = parsed;

    const nParts = measurements.length;
    const nAppraisers = measurements[0].length;
    const nTrials = measurements[0][0].length;

    if (nParts < 2) throw new Error("need ≥2 parts for MSA");
    if (nAppraisers < 1) throw new Error("need ≥1 appraiser for MSA");
    if (nTrials < 2) throw new Error("need ≥2 trials per part·appraiser for MSA");

    for (const partRow of measurements) {
      if (partRow.length !== nAppraisers) {
        throw new Error("measurements rectangular: inconsistent appraiser count");
      }
      for (const trialRow of partRow) {
        if (trialRow.length !== nTrials) {
          throw new Error("measurements rectangular: inconsistent trial count");
        }
      }
    }

    // Grand mean and totals
    let grandSum = 0;
    let grandN = 0;
    const partMeans = new Array<number>(nParts).fill(0);
    const appraiserMeans = new Array<number>(nAppraisers).fill(0);
    const cellMeans: number[][] = Array.from({ length: nParts }, () =>
      new Array<number>(nAppraisers).fill(0),
    );

    for (let p = 0; p < nParts; p += 1) {
      for (let a = 0; a < nAppraisers; a += 1) {
        let cellSum = 0;
        for (let t = 0; t < nTrials; t += 1) {
          const v = measurements[p][a][t];
          cellSum += v;
          grandSum += v;
          grandN += 1;
        }
        cellMeans[p][a] = cellSum / nTrials;
      }
    }
    const grandMean = grandSum / grandN;

    for (let p = 0; p < nParts; p += 1) {
      let rowSum = 0;
      for (let a = 0; a < nAppraisers; a += 1) rowSum += cellMeans[p][a];
      partMeans[p] = rowSum / nAppraisers;
    }
    for (let a = 0; a < nAppraisers; a += 1) {
      let colSum = 0;
      for (let p = 0; p < nParts; p += 1) colSum += cellMeans[p][a];
      appraiserMeans[a] = colSum / nParts;
    }

    // Sums of squares
    let SS_part = 0;
    for (let p = 0; p < nParts; p += 1) {
      SS_part += (partMeans[p] - grandMean) ** 2;
    }
    SS_part *= nAppraisers * nTrials;

    let SS_appraiser = 0;
    for (let a = 0; a < nAppraisers; a += 1) {
      SS_appraiser += (appraiserMeans[a] - grandMean) ** 2;
    }
    SS_appraiser *= nParts * nTrials;

    let SS_interaction = 0;
    for (let p = 0; p < nParts; p += 1) {
      for (let a = 0; a < nAppraisers; a += 1) {
        SS_interaction +=
          (cellMeans[p][a] - partMeans[p] - appraiserMeans[a] + grandMean) ** 2;
      }
    }
    SS_interaction *= nTrials;

    let SS_equipment = 0;
    for (let p = 0; p < nParts; p += 1) {
      for (let a = 0; a < nAppraisers; a += 1) {
        for (let t = 0; t < nTrials; t += 1) {
          SS_equipment += (measurements[p][a][t] - cellMeans[p][a]) ** 2;
        }
      }
    }

    const SS_total = SS_part + SS_appraiser + SS_interaction + SS_equipment;

    // Degrees of freedom
    const DF_part = nParts - 1;
    const DF_appraiser = Math.max(0, nAppraisers - 1);
    const DF_interaction = DF_part * DF_appraiser;
    const DF_equipment = nParts * nAppraisers * (nTrials - 1);
    const DF_total = grandN - 1;

    // Mean squares
    const MS_part = SS_part / DF_part;
    const MS_appraiser = DF_appraiser > 0 ? SS_appraiser / DF_appraiser : 0;
    const MS_interaction = DF_interaction > 0 ? SS_interaction / DF_interaction : 0;
    const MS_equipment = SS_equipment / DF_equipment;

    // F statistics (use MS_interaction as denominator where it exists)
    const F_part = MS_interaction > 0 ? MS_part / MS_interaction : MS_part / MS_equipment;
    const F_appraiser =
      MS_interaction > 0 ? MS_appraiser / MS_interaction : MS_appraiser / MS_equipment;
    const F_interaction = MS_equipment > 0 ? MS_interaction / MS_equipment : 0;

    // Interaction significance: F > ~Fcrit(0.25) ≈ thumb-rule 1.0 (AIAG pools if F<1)
    const interactionSignificant = F_interaction > 2.0;

    // Variance components (AIAG MSA 4e §III.B.2, crossed model with interaction)
    const var_equipment = Math.max(0, MS_equipment);
    const var_interaction = nTrials > 0 ? Math.max(0, (MS_interaction - MS_equipment) / nTrials) : 0;
    const var_appraiser =
      nParts * nTrials > 0
        ? Math.max(0, (MS_appraiser - MS_interaction) / (nParts * nTrials))
        : 0;
    const var_part = Math.max(0, (MS_part - MS_interaction) / (nAppraisers * nTrials));

    const var_grr = var_equipment + var_appraiser + var_interaction;
    const var_tv_computed = var_grr + var_part;
    const var_tv = parsed.processVariation
      ? (parsed.processVariation / 6) ** 2
      : var_tv_computed;
    const sd_tv = Math.sqrt(var_tv);

    const toComponent = (variance: number): MsaComponent => {
      const stddev = Math.sqrt(variance);
      const pctStudy = sd_tv > 0 ? (stddev / sd_tv) * 100 : 0;
      const pctTol = parsed.tolerance ? ((stddev * 6) / parsed.tolerance) * 100 : null;
      return {
        variance: round(variance),
        stddev: round(stddev),
        percentStudy: round(pctStudy),
        percentTolerance: pctTol === null ? null : round(pctTol),
      };
    };

    const repeatability = toComponent(var_equipment);
    const reproducibility = toComponent(var_appraiser);
    const interaction = toComponent(var_interaction);
    const partVariation = toComponent(var_part);
    const gageRR = toComponent(var_grr);

    // NDC = 1.41 · (σ_PV / σ_GRR), truncated to integer
    const ndc =
      gageRR.stddev > 0 ? Math.floor(1.41 * (partVariation.stddev / gageRR.stddev)) : 0;

    const verdict: MsaVerdict =
      gageRR.percentStudy < ACCEPTABLE_PCT
        ? "acceptable"
        : gageRR.percentStudy < MARGINAL_PCT
          ? "marginal"
          : "unacceptable";

    return {
      nParts,
      nAppraisers,
      nTrials,
      anova: {
        SS_part: round(SS_part),
        SS_appraiser: round(SS_appraiser),
        SS_interaction: round(SS_interaction),
        SS_equipment: round(SS_equipment),
        SS_total: round(SS_total),
        DF_part,
        DF_appraiser,
        DF_interaction,
        DF_equipment,
        DF_total,
        MS_part: round(MS_part),
        MS_appraiser: round(MS_appraiser),
        MS_interaction: round(MS_interaction),
        MS_equipment: round(MS_equipment),
        F_part: round(F_part),
        F_appraiser: round(F_appraiser),
        F_interaction: round(F_interaction),
      },
      repeatability,
      reproducibility,
      interaction,
      partVariation,
      gageRR,
      totalVariation: { variance: round(var_tv), stddev: round(sd_tv) },
      ndc,
      verdict,
      interactionSignificant,
    };
  }

  /** Bias = mean(measurements) − reference. Simple linearity/bias summary. */
  static bias(measurements: readonly number[], reference: number): {
    bias: number;
    stdDev: number;
    tStatistic: number;
    n: number;
  } {
    if (measurements.length < 2) throw new Error("need ≥2 measurements for bias");
    if (!Number.isFinite(reference)) throw new Error("reference must be finite");
    const n = measurements.length;
    const mean = measurements.reduce((acc, v) => acc + v, 0) / n;
    let sq = 0;
    for (const v of measurements) sq += (v - mean) ** 2;
    const s = Math.sqrt(sq / (n - 1));
    const bias = mean - reference;
    const tStatistic = s > 0 ? (bias * Math.sqrt(n)) / s : 0;
    return { bias: round(bias), stdDev: round(s), tStatistic: round(tStatistic), n };
  }

  /** Linearity via least-squares on (reference, bias) pairs. */
  static linearity(
    points: ReadonlyArray<{ reference: number; measurement: number }>,
  ): { slope: number; intercept: number; rSquared: number; n: number } {
    if (points.length < 2) throw new Error("need ≥2 linearity points");
    const n = points.length;
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.reference;
      sumY += p.measurement - p.reference; // bias
    }
    const mx = sumX / n;
    const my = sumY / n;
    let ssxx = 0;
    let ssyy = 0;
    let ssxy = 0;
    for (const p of points) {
      const dx = p.reference - mx;
      const dy = p.measurement - p.reference - my;
      ssxx += dx * dx;
      ssyy += dy * dy;
      ssxy += dx * dy;
    }
    const slope = ssxx > 0 ? ssxy / ssxx : 0;
    const intercept = my - slope * mx;
    const rSquared = ssxx > 0 && ssyy > 0 ? (ssxy * ssxy) / (ssxx * ssyy) : 0;
    return { slope: round(slope), intercept: round(intercept), rSquared: round(rSquared), n };
  }
}

function round(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export const measurementSystemAnalysisEngine = MeasurementSystemAnalysisEngine;
