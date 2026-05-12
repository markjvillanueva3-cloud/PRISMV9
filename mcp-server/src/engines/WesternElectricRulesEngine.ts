/**
 * WesternElectricRulesEngine — 8 classic control-chart rules
 *
 * Phase 0.22 U-SPC1 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a time
 * series of measurements with known mean μ and stddev σ, flags the eight
 * Western Electric / Nelson control-chart rules:
 *
 *   1. 1 point beyond 3σ
 *   2. 2 of 3 consecutive points beyond 2σ (same side)
 *   3. 4 of 5 consecutive points beyond 1σ (same side)
 *   4. 8 consecutive points on one side of the center
 *   5. 6 consecutive points trending up or down
 *   6. 14 points alternating up/down
 *   7. 15 consecutive points within 1σ (stratification)
 *   8. 8 consecutive points with none within 1σ (mixture)
 *
 * No I/O. Callers pass in μ and σ along with the point series.
 *
 * @module engines/WesternElectricRulesEngine
 * @milestone PP-0.22-U-SPC1
 */

export interface SpcChartInput {
  values: readonly number[];
  mean: number;
  stddev: number;
}

export type WeRuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface WeRuleViolation {
  rule: WeRuleId;
  description: string;
  indices: number[]; // indices in `values` involved in the violation
}

export interface WeAnalysisResult {
  violations: WeRuleViolation[];
  passed: boolean;
  pointCount: number;
}

const RULE_DESCRIPTIONS: Record<WeRuleId, string> = {
  1: "1 point beyond 3σ",
  2: "2 of 3 consecutive points beyond 2σ (same side)",
  3: "4 of 5 consecutive points beyond 1σ (same side)",
  4: "8 consecutive points on one side of the center line",
  5: "6 consecutive points trending up or down",
  6: "14 points alternating up and down",
  7: "15 consecutive points within 1σ of the center (stratification)",
  8: "8 consecutive points with none within 1σ of the center (mixture)",
};

export class WesternElectricRulesEngine {
  analyze(input: SpcChartInput): WeAnalysisResult {
    this.validate(input);
    const { values, mean, stddev } = input;
    const violations: WeRuleViolation[] = [];

    for (const rule of [1, 2, 3, 4, 5, 6, 7, 8] as WeRuleId[]) {
      const detected = this.checkRule(rule, values, mean, stddev);
      violations.push(...detected);
    }

    return {
      violations,
      passed: violations.length === 0,
      pointCount: values.length,
    };
  }

  /** Run a single rule — useful for callers that want finer control. */
  checkRule(rule: WeRuleId, values: readonly number[], mean: number, stddev: number): WeRuleViolation[] {
    switch (rule) {
      case 1:
        return this.rule1(values, mean, stddev);
      case 2:
        return this.ruleKofN(values, mean, stddev, 2, 3, 2);
      case 3:
        return this.ruleKofN(values, mean, stddev, 4, 5, 1);
      case 4:
        return this.consecutiveSameSide(values, mean, 8);
      case 5:
        return this.consecutiveTrend(values, 6);
      case 6:
        return this.alternating(values, 14);
      case 7:
        return this.consecutiveWithin(values, mean, stddev, 15, 1);
      case 8:
        return this.consecutiveOutside(values, mean, stddev, 8, 1);
    }
  }

  // --- rule implementations ---------------------------------------------

  private rule1(values: readonly number[], mean: number, sd: number): WeRuleViolation[] {
    const out: WeRuleViolation[] = [];
    for (let i = 0; i < values.length; i += 1) {
      if (Math.abs(values[i] - mean) > 3 * sd) {
        out.push({ rule: 1, description: RULE_DESCRIPTIONS[1], indices: [i] });
      }
    }
    return out;
  }

  private ruleKofN(
    values: readonly number[],
    mean: number,
    sd: number,
    k: number,
    n: number,
    sigmaThreshold: number
  ): WeRuleViolation[] {
    const out: WeRuleViolation[] = [];
    for (let i = 0; i + n <= values.length; i += 1) {
      const window = values.slice(i, i + n);
      const above = window.filter((v) => v - mean > sigmaThreshold * sd).length;
      const below = window.filter((v) => mean - v > sigmaThreshold * sd).length;
      if (above >= k || below >= k) {
        out.push({
          rule: (k === 2 ? 2 : 3) as WeRuleId,
          description: RULE_DESCRIPTIONS[(k === 2 ? 2 : 3) as WeRuleId],
          indices: Array.from({ length: n }, (_, j) => i + j),
        });
      }
    }
    return this.dedupe(out);
  }

  private consecutiveSameSide(values: readonly number[], mean: number, n: number): WeRuleViolation[] {
    const out: WeRuleViolation[] = [];
    for (let i = 0; i + n <= values.length; i += 1) {
      const window = values.slice(i, i + n);
      if (window.every((v) => v > mean) || window.every((v) => v < mean)) {
        out.push({
          rule: 4,
          description: RULE_DESCRIPTIONS[4],
          indices: Array.from({ length: n }, (_, j) => i + j),
        });
      }
    }
    return this.dedupe(out);
  }

  private consecutiveTrend(values: readonly number[], n: number): WeRuleViolation[] {
    const out: WeRuleViolation[] = [];
    for (let i = 0; i + n <= values.length; i += 1) {
      const window = values.slice(i, i + n);
      let up = true;
      let down = true;
      for (let j = 1; j < window.length; j += 1) {
        if (window[j] <= window[j - 1]) up = false;
        if (window[j] >= window[j - 1]) down = false;
      }
      if (up || down) {
        out.push({
          rule: 5,
          description: RULE_DESCRIPTIONS[5],
          indices: Array.from({ length: n }, (_, j) => i + j),
        });
      }
    }
    return this.dedupe(out);
  }

  private alternating(values: readonly number[], n: number): WeRuleViolation[] {
    const out: WeRuleViolation[] = [];
    for (let i = 0; i + n <= values.length; i += 1) {
      const window = values.slice(i, i + n);
      let alt = true;
      for (let j = 1; j < window.length - 1; j += 1) {
        const signA = Math.sign(window[j] - window[j - 1]);
        const signB = Math.sign(window[j + 1] - window[j]);
        if (signA === 0 || signB === 0 || signA === signB) {
          alt = false;
          break;
        }
      }
      if (alt) {
        out.push({
          rule: 6,
          description: RULE_DESCRIPTIONS[6],
          indices: Array.from({ length: n }, (_, j) => i + j),
        });
      }
    }
    return this.dedupe(out);
  }

  private consecutiveWithin(
    values: readonly number[],
    mean: number,
    sd: number,
    n: number,
    sigmaRadius: number
  ): WeRuleViolation[] {
    const out: WeRuleViolation[] = [];
    for (let i = 0; i + n <= values.length; i += 1) {
      const window = values.slice(i, i + n);
      if (window.every((v) => Math.abs(v - mean) <= sigmaRadius * sd)) {
        out.push({
          rule: 7,
          description: RULE_DESCRIPTIONS[7],
          indices: Array.from({ length: n }, (_, j) => i + j),
        });
      }
    }
    return this.dedupe(out);
  }

  private consecutiveOutside(
    values: readonly number[],
    mean: number,
    sd: number,
    n: number,
    sigmaRadius: number
  ): WeRuleViolation[] {
    const out: WeRuleViolation[] = [];
    for (let i = 0; i + n <= values.length; i += 1) {
      const window = values.slice(i, i + n);
      if (window.every((v) => Math.abs(v - mean) > sigmaRadius * sd)) {
        out.push({
          rule: 8,
          description: RULE_DESCRIPTIONS[8],
          indices: Array.from({ length: n }, (_, j) => i + j),
        });
      }
    }
    return this.dedupe(out);
  }

  private dedupe(violations: WeRuleViolation[]): WeRuleViolation[] {
    const seen = new Set<string>();
    const out: WeRuleViolation[] = [];
    for (const v of violations) {
      const key = `${v.rule}:${v.indices.join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  }

  private validate(input: SpcChartInput): void {
    if (!Array.isArray(input.values)) throw new Error("values must be an array");
    if (!Number.isFinite(input.mean)) throw new Error("mean must be finite");
    if (!(input.stddev > 0) || !Number.isFinite(input.stddev)) throw new Error("stddev must be > 0");
    for (const v of input.values) {
      if (!Number.isFinite(v)) throw new Error("all values must be finite");
    }
  }
}

export const westernElectricRulesEngine = new WesternElectricRulesEngine();
