/**
 * FuzzyLogicEngine — Fuzzy Inference System
 *
 * Implements fuzzy logic for manufacturing decision-making:
 * - Membership functions (triangular, trapezoidal, Gaussian)
 * - Fuzzy rule evaluation (Mamdani inference)
 * - Defuzzification (centroid, bisector, MOM)
 * - Fuzzy PID-like control
 *
 * Manufacturing use: adaptive feed rate control, surface quality
 * classification, tool wear assessment, process parameter tuning
 * under uncertainty.
 *
 * @module FuzzyLogicEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MembershipType = "triangular" | "trapezoidal" | "gaussian";

export interface MembershipFunction {
  name: string;
  type: MembershipType;
  params: number[];  // tri: [a,b,c], trap: [a,b,c,d], gauss: [mean,sigma]
}

export interface FuzzyVariable {
  name: string;
  range: [number, number];
  terms: MembershipFunction[];
}

export interface FuzzyRule {
  conditions: { variable: string; term: string }[];
  operator: "AND" | "OR";
  output: { variable: string; term: string };
  weight?: number;
}

export interface FuzzySystem {
  inputs: FuzzyVariable[];
  outputs: FuzzyVariable[];
  rules: FuzzyRule[];
}

export interface FuzzyResult {
  crispOutputs: Record<string, number>;
  ruleActivations: number[];
  membershipValues: Record<string, Record<string, number>>;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class FuzzyLogicEngineImpl {

  /**
   * Evaluate membership degree of a value in a membership function.
   */
  membership(value: number, mf: MembershipFunction): number {
    switch (mf.type) {
      case "triangular": {
        const [a, b, c] = mf.params;
        if (value <= a || value >= c) return 0;
        if (value <= b) return (value - a) / (b - a || 1);
        return (c - value) / (c - b || 1);
      }
      case "trapezoidal": {
        const [a, b, c, d] = mf.params;
        if (value <= a || value >= d) return 0;
        if (value >= b && value <= c) return 1;
        if (value < b) return (value - a) / (b - a || 1);
        return (d - value) / (d - c || 1);
      }
      case "gaussian": {
        const [mean, sigma] = mf.params;
        return Math.exp(-0.5 * ((value - mean) / (sigma || 1)) ** 2);
      }
      default:
        return 0;
    }
  }

  /**
   * Fuzzify a crisp input: compute membership in all terms.
   */
  fuzzify(value: number, variable: FuzzyVariable): Record<string, number> {
    const result: Record<string, number> = {};
    for (const term of variable.terms) {
      result[term.name] = this.membership(value, term);
    }
    return result;
  }

  /**
   * Evaluate a complete fuzzy inference system (Mamdani).
   */
  evaluate(
    system: FuzzySystem,
    inputs: Record<string, number>,
    defuzzMethod: "centroid" | "bisector" | "mom" = "centroid"
  ): FuzzyResult {
    // Step 1: Fuzzify all inputs
    const membershipValues: Record<string, Record<string, number>> = {};
    for (const inputVar of system.inputs) {
      const value = inputs[inputVar.name] ?? 0;
      membershipValues[inputVar.name] = this.fuzzify(value, inputVar);
    }

    // Step 2: Evaluate rules
    const ruleActivations: number[] = [];
    const outputAggregations: Record<string, { term: string; activation: number }[]> = {};

    for (const outputVar of system.outputs) {
      outputAggregations[outputVar.name] = [];
    }

    for (const rule of system.rules) {
      const weight = rule.weight ?? 1;
      let activation: number;

      if (rule.operator === "AND") {
        activation = Math.min(
          ...rule.conditions.map(c =>
            membershipValues[c.variable]?.[c.term] ?? 0
          )
        );
      } else {
        activation = Math.max(
          ...rule.conditions.map(c =>
            membershipValues[c.variable]?.[c.term] ?? 0
          )
        );
      }

      activation *= weight;
      ruleActivations.push(activation);

      if (activation > 0) {
        const outVar = rule.output.variable;
        if (!outputAggregations[outVar]) outputAggregations[outVar] = [];
        outputAggregations[outVar].push({
          term: rule.output.term,
          activation,
        });
      }
    }

    // Step 3: Defuzzify each output
    const crispOutputs: Record<string, number> = {};
    for (const outputVar of system.outputs) {
      const aggs = outputAggregations[outputVar.name] ?? [];
      crispOutputs[outputVar.name] = this._defuzzify(
        outputVar, aggs, defuzzMethod
      );
    }

    return { crispOutputs, ruleActivations, membershipValues };
  }

  /**
   * Create a standard 3-term fuzzy variable (low, medium, high).
   */
  createStandard3Term(
    name: string, min: number, max: number
  ): FuzzyVariable {
    const mid = (min + max) / 2;
    return {
      name,
      range: [min, max],
      terms: [
        { name: "low", type: "triangular", params: [min, min, mid] },
        { name: "medium", type: "triangular", params: [min, mid, max] },
        { name: "high", type: "triangular", params: [mid, max, max] },
      ],
    };
  }

  /**
   * Create a standard 5-term fuzzy variable.
   */
  createStandard5Term(
    name: string, min: number, max: number
  ): FuzzyVariable {
    const range = max - min;
    const q = range / 4;
    return {
      name,
      range: [min, max],
      terms: [
        { name: "very_low", type: "triangular", params: [min, min, min + q] },
        { name: "low", type: "triangular", params: [min, min + q, min + 2 * q] },
        { name: "medium", type: "triangular", params: [min + q, min + 2 * q, min + 3 * q] },
        { name: "high", type: "triangular", params: [min + 2 * q, min + 3 * q, max] },
        { name: "very_high", type: "triangular", params: [min + 3 * q, max, max] },
      ],
    };
  }

  /**
   * Create a manufacturing process control system.
   * Inputs: error, error_change. Output: control_action.
   */
  createProcessController(
    errorRange: [number, number],
    outputRange: [number, number]
  ): FuzzySystem {
    const errorVar = this.createStandard5Term("error", errorRange[0], errorRange[1]);
    const errorChangeVar = this.createStandard5Term("error_change", errorRange[0], errorRange[1]);
    const outputVar = this.createStandard5Term("control", outputRange[0], outputRange[1]);

    const termNames = ["very_low", "low", "medium", "high", "very_high"];

    // Rule matrix (classic fuzzy PD controller)
    const ruleMatrix: number[][] = [
      [0, 0, 1, 1, 2],  // error=VL
      [0, 1, 1, 2, 3],  // error=L
      [1, 1, 2, 3, 3],  // error=M
      [1, 2, 3, 3, 4],  // error=H
      [2, 3, 3, 4, 4],  // error=VH
    ];

    const rules: FuzzyRule[] = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        rules.push({
          conditions: [
            { variable: "error", term: termNames[i] },
            { variable: "error_change", term: termNames[j] },
          ],
          operator: "AND",
          output: { variable: "control", term: termNames[ruleMatrix[i][j]] },
        });
      }
    }

    return { inputs: [errorVar, errorChangeVar], outputs: [outputVar], rules };
  }

  // -------------------------------------------------------------------------
  // Defuzzification
  // -------------------------------------------------------------------------

  private _defuzzify(
    outputVar: FuzzyVariable,
    aggregations: { term: string; activation: number }[],
    method: "centroid" | "bisector" | "mom"
  ): number {
    if (aggregations.length === 0) {
      return (outputVar.range[0] + outputVar.range[1]) / 2;
    }

    const [min, max] = outputVar.range;
    const steps = 100;
    const dx = (max - min) / steps;

    // Build aggregated output membership function
    const aggValues: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = min + i * dx;
      let maxMu = 0;
      for (const agg of aggregations) {
        const mf = outputVar.terms.find(t => t.name === agg.term);
        if (mf) {
          const mu = Math.min(agg.activation, this.membership(x, mf));
          maxMu = Math.max(maxMu, mu);
        }
      }
      aggValues.push(maxMu);
    }

    if (method === "centroid") {
      let num = 0, den = 0;
      for (let i = 0; i <= steps; i++) {
        const x = min + i * dx;
        num += x * aggValues[i];
        den += aggValues[i];
      }
      return den > 0 ? num / den : (min + max) / 2;
    }

    if (method === "bisector") {
      const total = aggValues.reduce((s, v) => s + v, 0);
      let cumSum = 0;
      for (let i = 0; i <= steps; i++) {
        cumSum += aggValues[i];
        if (cumSum >= total / 2) return min + i * dx;
      }
      return (min + max) / 2;
    }

    // MOM: mean of maximum
    const maxVal = Math.max(...aggValues);
    if (maxVal <= 0) return (min + max) / 2;
    let sum = 0, count = 0;
    for (let i = 0; i <= steps; i++) {
      if (Math.abs(aggValues[i] - maxVal) < 1e-10) {
        sum += min + i * dx;
        count++;
      }
    }
    return count > 0 ? sum / count : (min + max) / 2;
  }
}

export const fuzzyLogicEngine = new FuzzyLogicEngineImpl();
