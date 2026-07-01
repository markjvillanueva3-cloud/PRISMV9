/**
 * NelsonSPCRulesEngine — Western Electric / Nelson Rules for SPC Pattern Detection
 *
 * Implements all 8 Nelson rules for detecting non-random patterns in control charts.
 * Each rule identifies a specific type of special-cause variation common in
 * CNC manufacturing: tool wear trends, process shifts, over-adjustment, mixture, etc.
 *
 * Rules:
 *   1. One point beyond 3sigma (outlier / special cause)
 *   2. Nine consecutive same side of mean (shift)
 *   3. Six consecutive increasing or decreasing (trend)
 *   4. Fourteen consecutive alternating up/down (over-adjustment)
 *   5. Two of three beyond 2sigma same side (shift warning)
 *   6. Four of five beyond 1sigma same side (shift warning, stronger)
 *   7. Fifteen consecutive within 1sigma (stratification)
 *   8. Eight consecutive beyond 1sigma either side (mixture)
 *
 * Reference: Nelson, L.S. (1984). "The Shewhart Control Chart—Tests for Special Causes",
 *   Journal of Quality Technology, 16(4), 237-239.
 *
 * @module engines/NelsonSPCRulesEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Zone classification per Western Electric zones */
export type ControlZone = "A+" | "A-" | "B+" | "B-" | "C+" | "C-";

/** A single violation detected by a Nelson rule */
export interface NelsonViolation {
  /** Rule number (1-8) */
  rule: number;
  /** Human-readable rule name */
  rule_name: string;
  /** Indices of the data points involved in the violation */
  indices: number[];
  /** Description of the violation */
  description: string;
  /** Severity: critical (Rule 1), warning (Rules 2-6), info (Rules 7-8) */
  severity: "critical" | "warning" | "info";
}

/** Result from evaluating a single rule */
export interface RuleResult {
  rule: number;
  rule_name: string;
  violated: boolean;
  violation_count: number;
  violations: NelsonViolation[];
}

/** Diagnostic recommendation for a detected pattern */
export interface PatternDiagnosis {
  rule: number;
  probable_causes: string[];
  manufacturing_recommendations: string[];
  urgency: "immediate" | "investigate" | "monitor";
}

/** A single point in the control chart */
export interface ControlChartPoint {
  index: number;
  value: number;
  zone: ControlZone;
  violations: number[]; // rule numbers violated at this point
}

/** Full control chart data structure */
export interface ControlChartData {
  points: ControlChartPoint[];
  mean: number;
  sigma: number;
  ucl: number;       // Upper control limit (mean + 3sigma)
  lcl: number;       // Lower control limit (mean - 3sigma)
  uwl: number;       // Upper warning limit (mean + 2sigma)
  lwl: number;       // Lower warning limit (mean - 2sigma)
  uzone_b: number;   // Upper Zone B boundary (mean + 1sigma)
  lzone_b: number;   // Lower Zone B boundary (mean - 1sigma)
  violations: NelsonViolation[];
  overall_in_control: boolean;
}

/** Complete evaluation result */
export interface NelsonEvaluationResult {
  violations: NelsonViolation[];
  rule_results: RuleResult[];
  overall_in_control: boolean;
  summary: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RULE_NAMES: Record<number, string> = {
  1: "Beyond 3-sigma",
  2: "Nine consecutive same side",
  3: "Six consecutive increasing/decreasing",
  4: "Fourteen alternating up/down",
  5: "Two of three beyond 2-sigma",
  6: "Four of five beyond 1-sigma",
  7: "Fifteen within 1-sigma (stratification)",
  8: "Eight beyond 1-sigma either side (mixture)",
};

const SOURCE = "NelsonSPCRulesEngine";

// ============================================================================
// ENGINE
// ============================================================================

/**
 * NelsonSPCRulesEngine — Implements all 8 Nelson rules for SPC pattern detection.
 *
 * @reference Nelson, L.S. (1984). "The Shewhart Control Chart—Tests for Special Causes",
 *   Journal of Quality Technology, 16(4), 237-239.
 */
class NelsonSPCRulesEngineImpl {

  // ── Helpers ──────────────────────────────────────────────────────────

  /** Calculate arithmetic mean */
  private calcMean(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((s, v) => s + v, 0) / data.length;
  }

  /** Calculate sample standard deviation (Bessel-corrected) */
  private calcSigma(data: number[], mean: number): number {
    if (data.length < 2) return 0;
    const ss = data.reduce((s, v) => s + (v - mean) ** 2, 0);
    return Math.sqrt(ss / (data.length - 1));
  }

  /** Resolve mean and sigma — use provided or auto-calculate */
  private resolve(data: number[], mean?: number, sigma?: number): { mean: number; sigma: number } {
    const m = mean ?? this.calcMean(data);
    const s = sigma ?? this.calcSigma(data, m);
    return { mean: m, sigma: s };
  }

  /** Classify a point into a control zone */
  private classifyZone(value: number, mean: number, sigma: number): ControlZone {
    const diff = value - mean;
    if (sigma === 0) return diff >= 0 ? "C+" : "C-";
    const z = diff / sigma;
    if (z > 2) return "A+";
    if (z > 1) return "B+";
    if (z >= 0) return "C+";
    if (z >= -1) return "C-";
    if (z >= -2) return "B-";
    return "A-";
  }

  // ── Rule 1: One point beyond 3sigma ──────────────────────────────────

  /**
   * Rule 1 — One point beyond 3 standard deviations from the center line.
   * Indicates a special cause: tool breakage, measurement error, material defect.
   */
  checkBeyond3Sigma(data: number[], mean: number, sigma: number): NelsonViolation[] {
    const violations: NelsonViolation[] = [];
    if (sigma === 0) return violations;
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i] - mean) > 3 * sigma) {
        violations.push({
          rule: 1,
          rule_name: RULE_NAMES[1],
          indices: [i],
          description: `Point ${i} (value=${data[i].toFixed(4)}) is beyond ` +
            `3-sigma (${(Math.abs(data[i] - mean) / sigma).toFixed(2)}sigma from mean)`,
          severity: "critical",
        });
      }
    }
    return violations;
  }

  // ── Rule 2: Nine consecutive same side of mean ──────────────────────

  /**
   * Rule 2 — Nine or more consecutive points on the same side of the center line.
   * Indicates a process shift: tool wear, fixture drift, new material batch.
   */
  checkNineConsecutiveSameSide(data: number[], mean: number): NelsonViolation[] {
    const violations: NelsonViolation[] = [];
    if (data.length < 9) return violations;

    let runStart = 0;
    let runAbove = data[0] >= mean;

    for (let i = 1; i <= data.length; i++) {
      const above = i < data.length ? data[i] >= mean : !runAbove; // force flush at end
      if (above !== runAbove || i === data.length) {
        const runLen = i - runStart;
        if (runLen >= 9) {
          const indices = Array.from({ length: runLen }, (_, k) => runStart + k);
          violations.push({
            rule: 2,
            rule_name: RULE_NAMES[2],
            indices,
            description: `${runLen} consecutive points ` +
              `${runAbove ? "above" : "below"} mean starting at index ${runStart}`,
            severity: "warning",
          });
        }
        runStart = i;
        runAbove = above;
      }
    }
    return violations;
  }

  // ── Rule 3: Six consecutive increasing or decreasing ────────────────

  /**
   * Rule 3 — Six or more consecutive points steadily increasing or decreasing.
   * Indicates a trend: progressive tool wear, thermal drift, coolant degradation.
   */
  checkSixConsecutiveIncreasingDecreasing(data: number[]): NelsonViolation[] {
    const violations: NelsonViolation[] = [];
    if (data.length < 6) return violations;

    // Track runs of increasing and decreasing
    let incStart = 0, incLen = 1;
    let decStart = 0, decLen = 1;

    for (let i = 1; i < data.length; i++) {
      if (data[i] > data[i - 1]) {
        incLen++;
        if (decLen >= 6) {
          const indices = Array.from({ length: decLen }, (_, k) => decStart + k);
          violations.push({
            rule: 3,
            rule_name: RULE_NAMES[3],
            indices,
            description: `${decLen} consecutive decreasing points starting at index ${decStart}`,
            severity: "warning",
          });
        }
        decStart = i;
        decLen = 1;
      } else if (data[i] < data[i - 1]) {
        decLen++;
        if (incLen >= 6) {
          const indices = Array.from({ length: incLen }, (_, k) => incStart + k);
          violations.push({
            rule: 3,
            rule_name: RULE_NAMES[3],
            indices,
            description: `${incLen} consecutive increasing points starting at index ${incStart}`,
            severity: "warning",
          });
        }
        incStart = i;
        incLen = 1;
      } else {
        // Equal: reset both
        if (incLen >= 6) {
          const indices = Array.from({ length: incLen }, (_, k) => incStart + k);
          violations.push({
            rule: 3,
            rule_name: RULE_NAMES[3],
            indices,
            description: `${incLen} consecutive increasing points starting at index ${incStart}`,
            severity: "warning",
          });
        }
        if (decLen >= 6) {
          const indices = Array.from({ length: decLen }, (_, k) => decStart + k);
          violations.push({
            rule: 3,
            rule_name: RULE_NAMES[3],
            indices,
            description: `${decLen} consecutive decreasing points starting at index ${decStart}`,
            severity: "warning",
          });
        }
        incStart = i;
        incLen = 1;
        decStart = i;
        decLen = 1;
      }
    }

    // Flush remaining
    if (incLen >= 6) {
      const indices = Array.from({ length: incLen }, (_, k) => incStart + k);
      violations.push({
        rule: 3,
        rule_name: RULE_NAMES[3],
        indices,
        description: `${incLen} consecutive increasing points starting at index ${incStart}`,
        severity: "warning",
      });
    }
    if (decLen >= 6) {
      const indices = Array.from({ length: decLen }, (_, k) => decStart + k);
      violations.push({
        rule: 3,
        rule_name: RULE_NAMES[3],
        indices,
        description: `${decLen} consecutive decreasing points starting at index ${decStart}`,
        severity: "warning",
      });
    }

    return violations;
  }

  // ── Rule 4: Fourteen alternating up/down ────────────────────────────

  /**
   * Rule 4 — Fourteen or more consecutive points alternating up and down.
   * Indicates over-adjustment: operator hunting, control system oscillation.
   */
  checkFourteenAlternating(data: number[]): NelsonViolation[] {
    const violations: NelsonViolation[] = [];
    if (data.length < 14) return violations;

    // Build direction array: +1 up, -1 down, 0 equal
    const dir: number[] = [];
    for (let i = 1; i < data.length; i++) {
      dir.push(data[i] > data[i - 1] ? 1 : data[i] < data[i - 1] ? -1 : 0);
    }

    // Find runs of alternating sign (non-zero, each differs from prior)
    let altStart = 0;
    let altLen = 1;

    for (let i = 1; i < dir.length; i++) {
      if (dir[i] !== 0 && dir[i - 1] !== 0 && dir[i] !== dir[i - 1]) {
        altLen++;
      } else {
        if (altLen >= 13) {
          // altLen in dir[] = altLen+1 points in data
          const pointCount = altLen + 1;
          const indices = Array.from({ length: pointCount }, (_, k) => altStart + k);
          violations.push({
            rule: 4,
            rule_name: RULE_NAMES[4],
            indices,
            description: `${pointCount} consecutive alternating points starting at index ${altStart}`,
            severity: "warning",
          });
        }
        altStart = i;
        altLen = 1;
      }
    }

    // Flush
    if (altLen >= 13) {
      const pointCount = altLen + 1;
      const indices = Array.from({ length: pointCount }, (_, k) => altStart + k);
      violations.push({
        rule: 4,
        rule_name: RULE_NAMES[4],
        indices,
        description: `${pointCount} consecutive alternating points starting at index ${altStart}`,
        severity: "warning",
      });
    }

    return violations;
  }

  // ── Rule 5: Two of three beyond 2sigma same side ────────────────────

  /**
   * Rule 5 — Two out of three consecutive points beyond 2sigma on the same side.
   * Indicates developing process drift.
   */
  checkTwoOfThreeBeyond2Sigma(data: number[], mean: number, sigma: number): NelsonViolation[] {
    const violations: NelsonViolation[] = [];
    if (data.length < 3 || sigma === 0) return violations;

    for (let i = 0; i <= data.length - 3; i++) {
      const window = [data[i], data[i + 1], data[i + 2]];

      // Check upper side: count points beyond mean + 2sigma
      const upperCount = window.filter(v => v > mean + 2 * sigma).length;
      if (upperCount >= 2) {
        const indices = [i, i + 1, i + 2].filter(j => data[j] > mean + 2 * sigma);
        violations.push({
          rule: 5,
          rule_name: RULE_NAMES[5],
          indices: [i, i + 1, i + 2],
          description: `${upperCount} of 3 points beyond +2sigma in window [${i}, ${i + 2}]`,
          severity: "warning",
        });
        continue; // Don't double-count same window
      }

      // Check lower side
      const lowerCount = window.filter(v => v < mean - 2 * sigma).length;
      if (lowerCount >= 2) {
        violations.push({
          rule: 5,
          rule_name: RULE_NAMES[5],
          indices: [i, i + 1, i + 2],
          description: `${lowerCount} of 3 points beyond -2sigma in window [${i}, ${i + 2}]`,
          severity: "warning",
        });
      }
    }

    return violations;
  }

  // ── Rule 6: Four of five beyond 1sigma same side ────────────────────

  /**
   * Rule 6 — Four out of five consecutive points beyond 1sigma on the same side.
   * Indicates a stronger process shift signal.
   */
  checkFourOfFiveBeyond1Sigma(data: number[], mean: number, sigma: number): NelsonViolation[] {
    const violations: NelsonViolation[] = [];
    if (data.length < 5 || sigma === 0) return violations;

    for (let i = 0; i <= data.length - 5; i++) {
      const window = data.slice(i, i + 5);

      // Check upper
      const upperCount = window.filter(v => v > mean + sigma).length;
      if (upperCount >= 4) {
        violations.push({
          rule: 6,
          rule_name: RULE_NAMES[6],
          indices: [i, i + 1, i + 2, i + 3, i + 4],
          description: `${upperCount} of 5 points beyond +1sigma in window [${i}, ${i + 4}]`,
          severity: "warning",
        });
        continue;
      }

      // Check lower
      const lowerCount = window.filter(v => v < mean - sigma).length;
      if (lowerCount >= 4) {
        violations.push({
          rule: 6,
          rule_name: RULE_NAMES[6],
          indices: [i, i + 1, i + 2, i + 3, i + 4],
          description: `${lowerCount} of 5 points beyond -1sigma in window [${i}, ${i + 4}]`,
          severity: "warning",
        });
      }
    }

    return violations;
  }

  // ── Rule 7: Fifteen within 1sigma (stratification) ──────────────────

  /**
   * Rule 7 — Fifteen consecutive points within 1sigma of the center line.
   * Indicates stratification: multiple operators/machines mixed, measurement resolution.
   */
  checkFifteenWithin1Sigma(data: number[], mean: number, sigma: number): NelsonViolation[] {
    const violations: NelsonViolation[] = [];
    if (data.length < 15 || sigma === 0) return violations;

    let runStart = 0;
    let runLen = 0;

    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i] - mean) <= sigma) {
        if (runLen === 0) runStart = i;
        runLen++;
      } else {
        if (runLen >= 15) {
          const indices = Array.from({ length: runLen }, (_, k) => runStart + k);
          violations.push({
            rule: 7,
            rule_name: RULE_NAMES[7],
            indices,
            description: `${runLen} consecutive points within 1-sigma starting at index ${runStart}`,
            severity: "info",
          });
        }
        runLen = 0;
      }
    }

    // Flush
    if (runLen >= 15) {
      const indices = Array.from({ length: runLen }, (_, k) => runStart + k);
      violations.push({
        rule: 7,
        rule_name: RULE_NAMES[7],
        indices,
        description: `${runLen} consecutive points within 1-sigma starting at index ${runStart}`,
        severity: "info",
      });
    }

    return violations;
  }

  // ── Rule 8: Eight beyond 1sigma either side (mixture) ───────────────

  /**
   * Rule 8 — Eight consecutive points beyond 1sigma on either side (not necessarily same side).
   * Indicates mixture: two processes mixed, bimodal distribution.
   */
  checkEightBeyond1Sigma(data: number[], mean: number, sigma: number): NelsonViolation[] {
    const violations: NelsonViolation[] = [];
    if (data.length < 8 || sigma === 0) return violations;

    let runStart = 0;
    let runLen = 0;

    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i] - mean) > sigma) {
        if (runLen === 0) runStart = i;
        runLen++;
      } else {
        if (runLen >= 8) {
          const indices = Array.from({ length: runLen }, (_, k) => runStart + k);
          violations.push({
            rule: 8,
            rule_name: RULE_NAMES[8],
            indices,
            description: `${runLen} consecutive points beyond 1-sigma ` +
            `(either side) starting at index ${runStart}`,
            severity: "info",
          });
        }
        runLen = 0;
      }
    }

    // Flush
    if (runLen >= 8) {
      const indices = Array.from({ length: runLen }, (_, k) => runStart + k);
      violations.push({
        rule: 8,
        rule_name: RULE_NAMES[8],
        indices,
        description: `${runLen} consecutive points beyond 1-sigma (either side) starting at index ${runStart}`,
        severity: "info",
      });
    }

    return violations;
  }

  // ── Evaluate All Rules ──────────────────────────────────────────────

  /**
   * Run all 8 Nelson rules against the provided data.
   *
   * @param data - Array of measurement values (time-ordered)
   * @param mean - Process center line (auto-calculated if omitted)
   * @param sigma - Process standard deviation (auto-calculated if omitted)
   * @returns Complete evaluation with violations, per-rule results, and summary
   */
  evaluateAllRules(data: number[], mean?: number, sigma?: number): NelsonEvaluationResult {
    if (data.length === 0) {
      return {
        violations: [],
        rule_results: Array.from({ length: 8 }, (_, i) => ({
          rule: i + 1,
          rule_name: RULE_NAMES[i + 1],
          violated: false,
          violation_count: 0,
          violations: [],
        })),
        overall_in_control: true,
        summary: "No data provided.",
      };
    }

    const { mean: m, sigma: s } = this.resolve(data, mean, sigma);

    log.info(`${SOURCE}: Evaluating ${data.length} points (mean=${m.toFixed(4)}, sigma=${s.toFixed(4)})`);

    const ruleChecks: NelsonViolation[][] = [
      this.checkBeyond3Sigma(data, m, s),
      this.checkNineConsecutiveSameSide(data, m),
      this.checkSixConsecutiveIncreasingDecreasing(data),
      this.checkFourteenAlternating(data),
      this.checkTwoOfThreeBeyond2Sigma(data, m, s),
      this.checkFourOfFiveBeyond1Sigma(data, m, s),
      this.checkFifteenWithin1Sigma(data, m, s),
      this.checkEightBeyond1Sigma(data, m, s),
    ];

    const allViolations: NelsonViolation[] = [];
    const ruleResults: RuleResult[] = [];

    for (let i = 0; i < 8; i++) {
      const v = ruleChecks[i];
      allViolations.push(...v);
      ruleResults.push({
        rule: i + 1,
        rule_name: RULE_NAMES[i + 1],
        violated: v.length > 0,
        violation_count: v.length,
        violations: v,
      });
    }

    const violatedRules = ruleResults.filter(r => r.violated).map(r => r.rule);
    const inControl = violatedRules.length === 0;

    const summary = inControl
      ? `Process in control: ${data.length} points evaluated, no Nelson rule violations detected.`
      : `Process OUT OF CONTROL: ${allViolations.length} violation(s) across rule(s) ${violatedRules.join(", ")}. ${data.length} points evaluated.`;

    return {
      violations: allViolations,
      rule_results: ruleResults,
      overall_in_control: inControl,
      summary,
    };
  }

  // ── Control Chart Generation ────────────────────────────────────────

  /**
   * Generate a complete control chart data structure with zone classification
   * and violation markers for each data point.
   *
   * @param data - Array of measurement values (time-ordered)
   * @param mean - Process center line (auto-calculated if omitted)
   * @param sigma - Process standard deviation (auto-calculated if omitted)
   * @returns Control chart data suitable for visualization
   */
  generateControlChart(data: number[], mean?: number, sigma?: number): ControlChartData {
    const { mean: m, sigma: s } = this.resolve(data, mean, sigma);

    // Run all rules to get violations
    const evalResult = this.evaluateAllRules(data, m, s);

    // Build violation lookup: index -> rule numbers
    const violationMap = new Map<number, Set<number>>();
    for (const v of evalResult.violations) {
      for (const idx of v.indices) {
        if (!violationMap.has(idx)) violationMap.set(idx, new Set());
        violationMap.get(idx)!.add(v.rule);
      }
    }

    // Classify each point
    const points: ControlChartPoint[] = data.map((value, index) => ({
      index,
      value,
      zone: this.classifyZone(value, m, s),
      violations: Array.from(violationMap.get(index) ?? []).sort((a, b) => a - b),
    }));

    return {
      points,
      mean: m,
      sigma: s,
      ucl: m + 3 * s,
      lcl: m - 3 * s,
      uwl: m + 2 * s,
      lwl: m - 2 * s,
      uzone_b: m + s,
      lzone_b: m - s,
      violations: evalResult.violations,
      overall_in_control: evalResult.overall_in_control,
    };
  }

  // ── Pattern Diagnosis ───────────────────────────────────────────────

  /**
   * Map detected Nelson rule violations to probable manufacturing causes
   * and provide actionable diagnostic recommendations.
   *
   * @param violations - Array of NelsonViolation from evaluateAllRules
   * @returns Array of diagnoses with probable causes and recommendations
   */
  diagnosePattern(violations: NelsonViolation[]): PatternDiagnosis[] {
    const rulesTriggered = new Set(violations.map(v => v.rule));
    const diagnoses: PatternDiagnosis[] = [];

    if (rulesTriggered.has(1)) {
      diagnoses.push({
        rule: 1,
        probable_causes: [
          "Tool breakage or chipping",
          "Measurement error or transducer spike",
          "Material defect (inclusion, void, hard spot)",
          "Fixture failure or workpiece shift",
        ],
        manufacturing_recommendations: [
          "Inspect the tool immediately for damage",
          "Verify measurement system (re-measure the flagged part)",
          "Check raw material certification for the batch",
          "Inspect fixture clamping force and workpiece seating",
          "Quarantine parts produced near the violation point",
        ],
        urgency: "immediate",
      });
    }

    if (rulesTriggered.has(2)) {
      diagnoses.push({
        rule: 2,
        probable_causes: [
          "Tool wear causing gradual dimensional shift",
          "Fixture drift or thermal growth of machine",
          "New material batch with different properties",
          "Coolant concentration change",
          "Operator change with different technique",
        ],
        manufacturing_recommendations: [
          "Check tool wear and replace if beyond threshold",
          "Verify fixture datum and re-qualify if needed",
          "Compare material certs between batches",
          "Measure machine thermal state (spindle, bed, column)",
          "Adjust tool offset to re-center the process",
        ],
        urgency: "investigate",
      });
    }

    if (rulesTriggered.has(3)) {
      diagnoses.push({
        rule: 3,
        probable_causes: [
          "Progressive tool wear (flank, crater, or notch)",
          "Thermal drift during warm-up or continuous operation",
          "Coolant degradation or level drop",
          "Gradual fixture wear or loosening",
        ],
        manufacturing_recommendations: [
          "Plot tool wear vs. part count and project remaining life",
          "Implement tool wear compensation in the CNC program",
          "Monitor machine temperature and correlate with drift",
          "Check coolant concentration, pH, and level",
          "Consider in-process gauging for closed-loop correction",
        ],
        urgency: "investigate",
      });
    }

    if (rulesTriggered.has(4)) {
      diagnoses.push({
        rule: 4,
        probable_causes: [
          "Operator over-adjusting offsets between parts",
          "Control system oscillation (feedback loop too aggressive)",
          "Two alternating fixtures or spindles",
          "Measurement system alternating between two states",
        ],
        manufacturing_recommendations: [
          "Review offset adjustment policy — avoid adjusting on every part",
          "Implement control chart-based adjustment rules (only adjust on signal)",
          "Check if two fixtures/pallets alternate and qualify each separately",
          "Audit measurement procedure for systematic alternation",
          "Reduce controller gain if automated compensation oscillates",
        ],
        urgency: "investigate",
      });
    }

    if (rulesTriggered.has(5)) {
      diagnoses.push({
        rule: 5,
        probable_causes: [
          "Developing process drift (early stage of shift)",
          "Intermittent special cause appearing",
          "Tool wear approaching critical threshold",
        ],
        manufacturing_recommendations: [
          "Increase sampling frequency temporarily",
          "Monitor the next 10-20 points closely for Rule 2 confirmation",
          "Prepare replacement tooling",
          "Check for environmental changes (temperature, humidity)",
        ],
        urgency: "monitor",
      });
    }

    if (rulesTriggered.has(6)) {
      diagnoses.push({
        rule: 6,
        probable_causes: [
          "Process shift signal (stronger than Rule 5)",
          "Systematic cause developing",
          "Tooling or fixture degradation",
        ],
        manufacturing_recommendations: [
          "Investigate root cause before it becomes a Rule 2 violation",
          "Check tool condition and dimensional offsets",
          "Verify fixture and workholding integrity",
          "Consider process adjustment if confirmed by additional data",
        ],
        urgency: "investigate",
      });
    }

    if (rulesTriggered.has(7)) {
      diagnoses.push({
        rule: 7,
        probable_causes: [
          "Data from multiple operators or machines mixed in one chart",
          "Measurement resolution too coarse (rounding effect)",
          "Incorrect control limits (sigma underestimated)",
          "Process has been significantly improved but limits not updated",
        ],
        manufacturing_recommendations: [
          "Stratify data by operator, machine, fixture, and shift",
          "Verify gage resolution is adequate (rule of 10)",
          "Recalculate control limits from current data",
          "If process truly improved, update limits to reflect new capability",
        ],
        urgency: "monitor",
      });
    }

    if (rulesTriggered.has(8)) {
      diagnoses.push({
        rule: 8,
        probable_causes: [
          "Two distinct processes or conditions mixed",
          "Bimodal distribution (e.g., two machines, two lots)",
          "Over-adjustment causing systematic oscillation",
          "Two different measurement methods mixed",
        ],
        manufacturing_recommendations: [
          "Stratify data by machine, operator, lot, or time period",
          "Check if two sources are being plotted on one chart",
          "Histogram the data to check for bimodality",
          "Create separate control charts per stratum",
          "Investigate if process is alternating between two states",
        ],
        urgency: "investigate",
      });
    }

    return diagnoses;
  }
}

/** Singleton instance of NelsonSPCRulesEngine */
export const nelsonSPCRulesEngine = new NelsonSPCRulesEngineImpl();
