/**
 * WEDMOffsetSPCEngine — Statistical process control for wire-EDM wire-offset drift.
 *
 * Roadmap unit muS-D54..D55 (ARC-MS10 — "Wire EDM offset SPC").
 *
 * Monitors a series of measured effective wire-offset values (the kerf
 * compensation ≈ wire radius + spark gap, in micrometres) sampled across
 * parts or cuts, and:
 *
 *   1. Builds X-bar / R control charts          → LeanSixSigmaEngine.xBarRChart
 *   2. Applies Western Electric / Nelson rules  → NelsonSPCRulesEngine.evaluateAllRules
 *   3. WEDM domain layer (this engine): classifies offset-drift root-cause
 *      hypotheses and recommends an offset re-centring adjustment.
 *
 * This is a domain specialisation by composition — the chart maths and run
 * rules are reused, not reimplemented.
 *
 * References:
 *   - Montgomery, "Introduction to Statistical Quality Control", 7e, ch.6
 *     (X-bar/R control charts; Western Electric run rules).
 *   - Shewhart control-chart factor tables (A2, D3, D4, d2) live in
 *     LeanSixSigmaEngine — not duplicated here.
 */

import { z } from "zod";
import { leanSixSigmaEngine } from "./LeanSixSigmaEngine.js";
import { nelsonSPCRulesEngine, type NelsonViolation } from "./NelsonSPCRulesEngine.js";

/**
 * The four classic Western Electric run rules expressed as Nelson rule numbers.
 *   Nelson 1 = 1 point beyond 3σ        (WE rule 1)
 *   Nelson 2 = 9 points same side       (WE rule 4 — classic WE uses an 8-run;
 *                                        Nelson's 9-run is the documented substitute)
 *   Nelson 5 = 2 of 3 beyond 2σ         (WE rule 2)
 *   Nelson 6 = 4 of 5 beyond 1σ         (WE rule 3)
 */
const WESTERN_ELECTRIC_NELSON_RULES = new Set<number>([1, 2, 5, 6]);

/** Minimum / maximum subgroup size covered by the Shewhart factor table. */
const MIN_SUBGROUP = 2;
const MAX_SUBGROUP = 10;

/**
 * Drift-significance threshold: the least-squares slope of the X-bar series is
 * treated as a genuine drift when |slope| exceeds this many standard errors.
 * t ≈ 2 corresponds to roughly 95% confidence that the slope is not noise.
 */
const DRIFT_SIGNIFICANCE_T = 2;

/** A finite number — Zod's `.finite()` is deprecated, so refine explicitly. */
const finiteNumber = z.number().refine(Number.isFinite, "must be a finite number");
/** A finite, strictly-positive number. */
const finitePositive = z
  .number()
  .positive()
  .refine(Number.isFinite, "must be a finite number");

export const WEDMOffsetSPCInputSchema = z.object({
  /**
   * Subgroups of measured effective wire-offset values, µm. Each inner array
   * is one rational subgroup (e.g. repeated measures on one part, or a run of
   * consecutive parts). All subgroups must have equal size (2..10).
   */
  subgroups: z.array(z.array(finiteNumber).min(MIN_SUBGROUP)).min(2),
  /** Target / programmed nominal offset, µm — used for the compensation calc. */
  nominalOffsetUm: finitePositive.optional(),
  /** Optional dimensional spec limits on the offset, µm, for Cp/Cpk. */
  specLimitsUm: z
    .object({ lower: finiteNumber, upper: finiteNumber })
    .optional(),
  /** Optional WEDM context used to sharpen root-cause hypotheses. */
  context: z
    .object({
      wireDiameterMm: finitePositive.optional(),
      passNumber: z.number().int().positive().optional(),
      dielectric: z.string().optional(),
    })
    .optional(),
});
export type WEDMOffsetSPCInput = z.infer<typeof WEDMOffsetSPCInputSchema>;

export type OffsetDriftDirection = "rising" | "falling" | "stable" | "erratic";
export type OffsetSPCVerdict = "in_control" | "drifting" | "out_of_control";
export type OffsetSPCSeverity = "ok" | "watch" | "act";

export interface OffsetRootCause {
  /** Short root-cause label. */
  cause: string;
  /** Hypothesis confidence, 0..1 — these are ranked hypotheses, not assertions. */
  confidence: number;
  /** What in the chart/rules supports this hypothesis. */
  evidence: string;
  /** Recommended corrective action. */
  remedy: string;
}

export interface WEDMOffsetSPCResult {
  chart: ReturnType<typeof leanSixSigmaEngine.xBarRChart>;
  westernElectric: {
    /** Violations restricted to the four classic Western Electric rules. */
    violations: NelsonViolation[];
    /** Full Nelson rule set (superset of Western Electric). */
    allNelsonViolations: NelsonViolation[];
    rulesFired: number[];
    /** True when no Western Electric run rule fired on the X-bar series.
     *  Note: this covers the run rules ONLY — a point beyond the R-chart
     *  limits does not affect it. The top-level `verdict` is authoritative. */
    runRulesClean: boolean;
  };
  drift: {
    direction: OffsetDriftDirection;
    /** Least-squares slope of the X-bar series, µm per subgroup. */
    slopeUmPerSubgroup: number;
    /** Projected total offset shift across the sampled window, µm. */
    totalShiftUm: number;
    /** Slope expressed as a multiple of its standard error (window-independent). */
    significanceT: number;
  };
  /** Cp/Cpk — only populated when both spec limits are supplied. */
  capability: { cp: number; cpk: number; sigmaUm: number } | null;
  /** Ranked root-cause hypotheses (highest confidence first, never empty). */
  rootCauses: OffsetRootCause[];
  /** Offset re-centring recommendation, or null when not advisable. */
  compensation:
    | { recommendedOffsetAdjustmentUm: number; rationale: string }
    | null;
  verdict: OffsetSPCVerdict;
  severity: OffsetSPCSeverity;
  summary: string;
  warnings: string[];
}

class WEDMOffsetSPCEngine {
  /**
   * Run the full wire-offset SPC analysis on a series of measured offsets.
   *
   * @param rawInput - {@link WEDMOffsetSPCInput} (Zod-validated).
   * @returns A {@link WEDMOffsetSPCResult} with chart, run rules, drift
   *          characterisation, capability, root causes and compensation.
   * @throws  ZodError on malformed input; Error on subgroup-shape violations.
   */
  analyze(rawInput: unknown): WEDMOffsetSPCResult {
    const input = WEDMOffsetSPCInputSchema.parse(rawInput);
    const warnings: string[] = [];

    // The schema guarantees every subgroup has at least MIN_SUBGROUP members;
    // only the upper bound and equal-size invariant need a runtime check.
    const n = input.subgroups[0].length;
    if (n > MAX_SUBGROUP) {
      throw new Error(
        `WEDMOffsetSPC: subgroup size must be ${MIN_SUBGROUP}..${MAX_SUBGROUP} ` +
          `(Shewhart factor table coverage); got ${n}`,
      );
    }
    if (input.subgroups.some((sg) => sg.length !== n)) {
      throw new Error(
        "WEDMOffsetSPC: all subgroups must have equal size for X-bar/R charting",
      );
    }
    const k = input.subgroups.length;

    // 1 — X-bar / R control chart (delegated to LeanSixSigmaEngine).
    const chart = leanSixSigmaEngine.xBarRChart(input.subgroups);

    // 2 — Western Electric / Nelson run rules on the X-bar series (delegated).
    //     sigmaXbar is the standard error of the subgroup mean = A2·Rbar/3.
    const sigmaXbar = (chart.xBar.UCL - chart.xBar.centerline) / 3;
    let allNelsonViolations: NelsonViolation[] = [];
    if (sigmaXbar > 0) {
      const nelson = nelsonSPCRulesEngine.evaluateAllRules(
        chart.xBar.values,
        chart.xBar.centerline,
        sigmaXbar,
      );
      allNelsonViolations = nelson.violations;
    } else {
      warnings.push(
        "X-bar control limits collapsed (zero between-subgroup range) — run rules skipped",
      );
    }
    const weViolations = allNelsonViolations.filter((v) =>
      WESTERN_ELECTRIC_NELSON_RULES.has(v.rule),
    );
    const rulesFired = [...new Set(weViolations.map((v) => v.rule))].sort(
      (a, b) => a - b,
    );

    // 3 — drift characterisation. The slope is judged by its t-statistic
    //     (slope ÷ standard error) rather than the raw window shift, so the
    //     verdict does not depend on how many subgroups were sampled.
    const { slope, sxx } = this.#leastSquaresSlope(chart.xBar.values);
    const totalShiftUm = slope * (k - 1);
    const slopeSE = sigmaXbar > 0 && sxx > 0 ? sigmaXbar / Math.sqrt(sxx) : 0;
    const significanceT = slopeSE > 0 ? Math.abs(slope) / slopeSE : 0;
    const rChartOut = chart.range.values.some(
      (r) => r > chart.range.UCL || r < chart.range.LCL,
    );
    let direction: OffsetDriftDirection;
    if (rChartOut) direction = "erratic";
    else if (significanceT > DRIFT_SIGNIFICANCE_T && slope > 0) direction = "rising";
    else if (significanceT > DRIFT_SIGNIFICANCE_T && slope < 0) direction = "falling";
    else direction = "stable";

    // process capability (only with both spec limits).
    let capability: WEDMOffsetSPCResult["capability"] = null;
    if (input.specLimitsUm) {
      const { lower, upper } = input.specLimitsUm;
      const sigma = chart.estimatedSigma;
      if (sigma > 0 && upper > lower) {
        const cp = (upper - lower) / (6 * sigma);
        const cpk = Math.min(
          (upper - chart.xBar.centerline) / (3 * sigma),
          (chart.xBar.centerline - lower) / (3 * sigma),
        );
        capability = { cp, cpk, sigmaUm: sigma };
      } else {
        warnings.push(
          "Cp/Cpk skipped — non-positive estimated sigma or inverted spec limits",
        );
      }
    }

    const rootCauses = this.#rootCauses(direction, rulesFired, rChartOut, chart);
    const compensation = this.#compensation(direction, rChartOut, chart, sigmaXbar, input);
    const { verdict, severity } = this.#verdict(chart, weViolations, direction);
    const summary = this.#summary(verdict, direction, totalShiftUm, rootCauses);

    return {
      chart,
      westernElectric: {
        violations: weViolations,
        allNelsonViolations,
        rulesFired,
        runRulesClean: weViolations.length === 0,
      },
      drift: { direction, slopeUmPerSubgroup: slope, totalShiftUm, significanceT },
      capability,
      rootCauses,
      compensation,
      verdict,
      severity,
      summary,
      warnings,
    };
  }

  /**
   * Least-squares fit of a series y[i] against its index i.
   * @returns slope and Sxx = Σ(i-ī)² (needed to derive the slope's std error).
   */
  #leastSquaresSlope(ys: number[]): { slope: number; sxx: number } {
    const m = ys.length;
    if (m < 2) return { slope: 0, sxx: 0 };
    const xMean = (m - 1) / 2;
    const yMean = ys.reduce((a, b) => a + b, 0) / m;
    let sxy = 0;
    let sxx = 0;
    for (let i = 0; i < m; i++) {
      const dx = i - xMean;
      sxy += dx * (ys[i] - yMean);
      sxx += dx * dx;
    }
    return { slope: sxx === 0 ? 0 : sxy / sxx, sxx };
  }

  /** Ranked WEDM-domain offset-drift root-cause hypotheses (never empty). */
  #rootCauses(
    direction: OffsetDriftDirection,
    rulesFired: number[],
    rChartOut: boolean,
    chart: ReturnType<typeof leanSixSigmaEngine.xBarRChart>,
  ): OffsetRootCause[] {
    const causes: OffsetRootCause[] = [];

    if (rChartOut) {
      causes.push({
        cause: "Inconsistent flushing / dielectric contamination",
        confidence: 0.7,
        evidence:
          "R chart out of control — within-subgroup spread exceeds limits",
        remedy:
          "Check flushing pressure and nozzle alignment, inspect dielectric " +
          "filter and resin bed, verify wire tension stability",
      });
    }

    if ((direction === "rising" || direction === "falling") && !rChartOut) {
      causes.push({
        cause: "Systematic offset shift (dielectric conductivity / guide wear / thermal)",
        confidence: 0.62,
        evidence:
          `X-bar series drifts ${direction} with the R chart in control — a ` +
          "stable mean shift points to a slow systematic cause",
        remedy:
          "Re-zero offset against a master, measure dielectric resistivity, " +
          "inspect wire guides / diamond dies, allow machine thermal soak",
      });
      if (rulesFired.includes(6)) {
        causes.push({
          cause: "Progressive wear (wire guide or wire-feed components)",
          confidence: 0.66,
          evidence: "Western Electric rule 6 (4 of 5 beyond 1σ) — a sustained trend",
          remedy: "Schedule guide / power-feed-contact inspection and replacement",
        });
      }
    }

    if (rulesFired.includes(1) && direction !== "rising" && direction !== "falling") {
      causes.push({
        cause: "Transient event (wire break re-thread, contamination spike, power glitch)",
        confidence: 0.6,
        evidence: "Isolated point beyond 3σ with an otherwise stable mean",
        remedy:
          "Review the flagged part(s) only — no standing process change unless recurring",
      });
    }

    if (causes.length === 0) {
      const stable = chart.inControl;
      causes.push({
        cause: stable
          ? "No assignable cause — process in statistical control"
          : "Out-of-control points without a clear drift pattern",
        confidence: stable ? 0.9 : 0.45,
        evidence: stable
          ? "All X-bar and R points within limits, no Western Electric rules fired"
          : "Control-limit excursions present but neither trending nor erratic-spread",
        remedy: stable
          ? "Continue monitoring — no corrective action required"
          : "Investigate the flagged subgroups individually before adjusting offset",
      });
    }

    return causes.sort((a, b) => b.confidence - a.confidence);
  }

  /** Offset re-centring recommendation, or null when not advisable. */
  #compensation(
    direction: OffsetDriftDirection,
    rChartOut: boolean,
    chart: ReturnType<typeof leanSixSigmaEngine.xBarRChart>,
    sigmaXbar: number,
    input: WEDMOffsetSPCInput,
  ): WEDMOffsetSPCResult["compensation"] {
    if (input.nominalOffsetUm === undefined) return null;
    const deviation = input.nominalOffsetUm - chart.xBar.centerline;

    if (rChartOut || direction === "erratic") {
      return {
        recommendedOffsetAdjustmentUm: 0,
        rationale:
          "Variation is unstable (R chart out of control) — stabilise the process " +
          "before applying any static offset compensation",
      };
    }
    // Re-centre only when the mean has meaningfully left nominal. The mean's
    // own sigma (sigmaXbar) — not the individuals sigma — is the right yardstick.
    if (Math.abs(deviation) <= sigmaXbar) {
      return {
        recommendedOffsetAdjustmentUm: 0,
        rationale:
          "Mean offset is within one X-bar control sigma of nominal — no re-centring needed",
      };
    }
    return {
      recommendedOffsetAdjustmentUm: Number(deviation.toFixed(2)),
      rationale:
        `Mean offset ${chart.xBar.centerline.toFixed(2)} µm sits ` +
        `${deviation > 0 ? "below" : "above"} nominal ${input.nominalOffsetUm} µm; ` +
        `apply ${deviation > 0 ? "+" : ""}${deviation.toFixed(2)} µm to re-centre`,
    };
  }

  /** Overall verdict + severity from chart state, run rules and drift. */
  #verdict(
    chart: ReturnType<typeof leanSixSigmaEngine.xBarRChart>,
    weViolations: NelsonViolation[],
    direction: OffsetDriftDirection,
  ): { verdict: OffsetSPCVerdict; severity: OffsetSPCSeverity } {
    if (!chart.inControl) {
      return { verdict: "out_of_control", severity: "act" };
    }
    if (weViolations.length > 0 || direction !== "stable") {
      return { verdict: "drifting", severity: "watch" };
    }
    return { verdict: "in_control", severity: "ok" };
  }

  /** One-line human-readable summary. */
  #summary(
    verdict: OffsetSPCVerdict,
    direction: OffsetDriftDirection,
    totalShiftUm: number,
    rootCauses: OffsetRootCause[],
  ): string {
    const head =
      verdict === "in_control"
        ? "Wire offset in statistical control"
        : verdict === "drifting"
          ? `Wire offset ${direction} (${totalShiftUm >= 0 ? "+" : ""}${totalShiftUm.toFixed(2)} µm over window)`
          : "Wire offset OUT OF CONTROL";
    return `${head} — likely cause: ${rootCauses[0].cause}`;
  }
}

export const wedmOffsetSPCEngine = new WEDMOffsetSPCEngine();
