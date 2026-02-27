/**
 * Fuzzy Logic Controller — Mamdani Inference
 *
 * Fuzzy inference system for adaptive machining control where crisp
 * thresholds are too rigid. Implements fuzzification → rule evaluation →
 * aggregation → centroid defuzzification.
 *
 * Manufacturing uses: adaptive feed control, surface finish optimization,
 * vibration response, tool wear compensation with linguistic rules.
 *
 * References:
 * - Mamdani, E.H. (1974). "Application of Fuzzy Algorithms for Control"
 * - Liang, S.Y. et al. (2004). "Machining Process Monitoring and Control"
 *
 * @module algorithms/FuzzyController
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export type MembershipType = "triangular" | "trapezoidal" | "gaussian";

export interface FuzzySet {
  name: string;
  type: MembershipType;
  /** Parameters: triangular [a,b,c], trapezoidal [a,b,c,d], gaussian [mean,sigma]. */
  params: number[];
}

export interface FuzzyVariable {
  name: string;
  range: [number, number];
  sets: FuzzySet[];
}

export interface FuzzyRule {
  /** Antecedent: list of (variable_name, set_name) pairs. */
  conditions: Array<{ variable: string; set: string }>;
  /** Consequent: (output_variable, output_set). */
  output: { variable: string; set: string };
  /** Rule weight [0-1]. Default 1. */
  weight?: number;
}

export interface FuzzyControllerInput {
  /** Input variables with membership functions. */
  inputs: FuzzyVariable[];
  /** Output variables with membership functions. */
  outputs: FuzzyVariable[];
  /** Fuzzy rules. */
  rules: FuzzyRule[];
  /** Crisp input values (keyed by variable name). */
  values: Record<string, number>;
  /** Defuzzification resolution. Default 100. */
  resolution?: number;
}

export interface FuzzyControllerOutput extends WithWarnings {
  crisp_outputs: Record<string, number>;
  rule_activations: Array<{ rule_index: number; strength: number }>;
  membership_values: Record<string, Record<string, number>>;
  calculation_method: string;
}

export class FuzzyController implements Algorithm<FuzzyControllerInput, FuzzyControllerOutput> {

  validate(input: FuzzyControllerInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.inputs?.length) issues.push({ field: "inputs", message: "At least 1 input variable required", severity: "error" });
    if (!input.outputs?.length) issues.push({ field: "outputs", message: "At least 1 output variable required", severity: "error" });
    if (!input.rules?.length) issues.push({ field: "rules", message: "At least 1 rule required", severity: "error" });
    if (!input.values || Object.keys(input.values).length === 0) {
      issues.push({ field: "values", message: "Crisp input values required", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: FuzzyControllerInput): FuzzyControllerOutput {
    const warnings: string[] = [];
    const { inputs, outputs, rules, values } = input;
    const resolution = input.resolution ?? 100;

    // Build lookup maps
    const varMap = new Map<string, FuzzyVariable>();
    [...inputs, ...outputs].forEach(v => varMap.set(v.name, v));

    // Membership function evaluation
    const mu = (set: FuzzySet, x: number): number => {
      const p = set.params;
      switch (set.type) {
        case "triangular": {
          const [a, b, c] = p;
          if (x <= a || x >= c) return 0;
          return x <= b ? (x - a) / (b - a) : (c - x) / (c - b);
        }
        case "trapezoidal": {
          const [a, b, c, d] = p;
          if (x <= a || x >= d) return 0;
          if (x >= b && x <= c) return 1;
          return x < b ? (x - a) / (b - a) : (d - x) / (d - c);
        }
        case "gaussian": {
          const [mean, sigma] = p;
          return Math.exp(-0.5 * ((x - mean) / sigma) ** 2);
        }
        default: return 0;
      }
    };

    // Step 1: Fuzzify inputs
    const membershipValues: Record<string, Record<string, number>> = {};
    for (const iv of inputs) {
      const x = values[iv.name] ?? 0;
      membershipValues[iv.name] = {};
      for (const set of iv.sets) {
        membershipValues[iv.name][set.name] = mu(set, x);
      }
    }

    // Step 2: Evaluate rules (AND = min, OR = max)
    const ruleActivations: Array<{ rule_index: number; strength: number }> = [];
    const outputAggregation = new Map<string, number[]>();

    for (const ov of outputs) {
      const range = ov.range;
      const step = (range[1] - range[0]) / resolution;
      outputAggregation.set(ov.name, Array(resolution + 1).fill(0));
    }

    for (let ri = 0; ri < rules.length; ri++) {
      const rule = rules[ri];
      const weight = rule.weight ?? 1.0;

      // AND all conditions (min)
      let strength = 1.0;
      for (const cond of rule.conditions) {
        const fv = membershipValues[cond.variable];
        strength = Math.min(strength, fv?.[cond.set] ?? 0);
      }
      strength *= weight;
      ruleActivations.push({ rule_index: ri, strength });

      if (strength <= 0) continue;

      // Clip output membership function at strength level
      const ov = varMap.get(rule.output.variable);
      if (!ov) continue;
      const outSet = ov.sets.find(s => s.name === rule.output.set);
      if (!outSet) continue;

      const agg = outputAggregation.get(rule.output.variable)!;
      const range = ov.range;
      const step = (range[1] - range[0]) / resolution;

      for (let i = 0; i <= resolution; i++) {
        const x = range[0] + i * step;
        agg[i] = Math.max(agg[i], Math.min(strength, mu(outSet, x)));
      }
    }

    // Step 3: Defuzzify (centroid method)
    const crisp_outputs: Record<string, number> = {};
    for (const ov of outputs) {
      const agg = outputAggregation.get(ov.name)!;
      const range = ov.range;
      const step = (range[1] - range[0]) / resolution;

      let num = 0, den = 0;
      for (let i = 0; i <= resolution; i++) {
        const x = range[0] + i * step;
        num += x * agg[i];
        den += agg[i];
      }
      crisp_outputs[ov.name] = den > 0 ? num / den : (range[0] + range[1]) / 2;
    }

    return {
      crisp_outputs,
      rule_activations,
      membership_values: membershipValues,
      warnings,
      calculation_method: "Mamdani fuzzy inference (AND=min, OR=max, centroid defuzzification)",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "fuzzy-controller",
      name: "Fuzzy Logic Controller (Mamdani)",
      description: "Fuzzy inference system for adaptive machining control with linguistic rules",
      formula: "Fuzzify → Rule eval (AND=min) → Aggregate (OR=max) → Centroid defuzzify",
      reference: "Mamdani (1974); Liang et al. (2004)",
      safety_class: "standard",
      domain: "control",
      inputs: { inputs: "Fuzzy input variables", rules: "IF-THEN rules", values: "Crisp inputs" },
      outputs: { crisp_outputs: "Defuzzified outputs", rule_activations: "Rule firing strengths" },
    };
  }
}
