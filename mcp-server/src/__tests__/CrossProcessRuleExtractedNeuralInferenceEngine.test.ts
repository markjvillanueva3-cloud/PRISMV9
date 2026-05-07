/**
 * CrossProcessRuleExtractedNeuralInferenceEngine — T8-02 tests.
 * TREPAN-style decision rule extraction from network output samples.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessRuleExtractedNeuralInferenceEngine as Extractor,
  crossProcessRuleExtractedNeuralInference,
  type Sample,
  type ExtractInput,
} from "../engines/CrossProcessRuleExtractedNeuralInferenceEngine.js";

// Synthetic dataset: separable in 2D — sf>100 AND fz<=0.05 → "high"; else "low"
function makeSeparableSamples(): Sample[] {
  const out: Sample[] = [];
  for (let sf = 50; sf <= 200; sf += 10) {
    for (let fz = 0.02; fz <= 0.10; fz += 0.01) {
      const fzR = Math.round(fz * 100) / 100;
      const label = sf > 100 && fzR <= 0.05 ? "high" : "low";
      out.push({ features: { sf, fz: fzR }, prediction: label });
    }
  }
  return out;
}

const SAMPLES = makeSeparableSamples();

describe("extractRules — TREPAN decision tree", () => {
  it("recovers separation on 2D synthetic dataset (≥80% fidelity)", () => {
    const r = Extractor.extractRules({
      samples: SAMPLES,
      feature_names: ["sf", "fz"],
      max_depth: 4,
      min_leaf_size: 5,
      purity_threshold: 0.95,
    });
    expect(r.fidelity).toBeGreaterThanOrEqual(0.8);
    expect(r.rules.length).toBeGreaterThan(0);
  });

  it("each rule's antecedent operates on a known feature", () => {
    const r = Extractor.extractRules({
      samples: SAMPLES,
      feature_names: ["sf", "fz"],
    });
    for (const rule of r.rules) {
      for (const ant of rule.antecedents) {
        expect(["sf", "fz"]).toContain(ant.feature);
      }
    }
  });

  it("each rule's confidence in [0, 1]", () => {
    const r = Extractor.extractRules({ samples: SAMPLES, feature_names: ["sf", "fz"] });
    for (const rule of r.rules) {
      expect(rule.confidence).toBeGreaterThanOrEqual(0);
      expect(rule.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("each rule's coverage in [0, 1]", () => {
    const r = Extractor.extractRules({ samples: SAMPLES, feature_names: ["sf", "fz"] });
    for (const rule of r.rules) {
      expect(rule.coverage).toBeGreaterThanOrEqual(0);
      expect(rule.coverage).toBeLessThanOrEqual(1);
    }
  });

  it("rule support is non-negative integer", () => {
    const r = Extractor.extractRules({ samples: SAMPLES, feature_names: ["sf", "fz"] });
    for (const rule of r.rules) {
      expect(Number.isInteger(rule.support)).toBe(true);
      expect(rule.support).toBeGreaterThanOrEqual(0);
    }
  });

  it("max_depth constrains rule depth (each rule has ≤ max_depth antecedents)", () => {
    const r = Extractor.extractRules({
      samples: SAMPLES,
      feature_names: ["sf", "fz"],
      max_depth: 2,
      min_leaf_size: 3,
      purity_threshold: 0.99,
    });
    for (const rule of r.rules) {
      expect(rule.antecedents.length).toBeLessThanOrEqual(2);
    }
  });

  it("unique_classes lists every distinct prediction in samples", () => {
    const r = Extractor.extractRules({ samples: SAMPLES, feature_names: ["sf", "fz"] });
    const expected = new Set(SAMPLES.map((s) => s.prediction));
    expect(new Set(r.unique_classes)).toEqual(expected);
  });

  it("total_samples matches input length", () => {
    const r = Extractor.extractRules({ samples: SAMPLES, feature_names: ["sf", "fz"] });
    expect(r.total_samples).toBe(SAMPLES.length);
  });

  it("higher purity_threshold causes deeper splits and more rules", () => {
    const lax = Extractor.extractRules({
      samples: SAMPLES, feature_names: ["sf", "fz"], purity_threshold: 0.6, max_depth: 5, min_leaf_size: 3,
    });
    const strict = Extractor.extractRules({
      samples: SAMPLES, feature_names: ["sf", "fz"], purity_threshold: 0.99, max_depth: 5, min_leaf_size: 3,
    });
    expect(strict.rules.length).toBeGreaterThanOrEqual(lax.rules.length);
  });

  it("rejects samples shorter than 20 (Zod min(20))", () => {
    expect(() => Extractor.extractRules({
      samples: SAMPLES.slice(0, 5),
      feature_names: ["sf", "fz"],
    })).toThrow();
  });

  it("rejects empty feature_names (Zod min(1))", () => {
    expect(() => Extractor.extractRules({
      samples: SAMPLES,
      feature_names: [],
    })).toThrow();
  });

  it("rejects max_depth=0 (Zod min(1))", () => {
    expect(() => Extractor.extractRules({
      samples: SAMPLES, feature_names: ["sf"], max_depth: 0,
    })).toThrow();
  });

  it("rejects max_depth>10 (Zod max(10))", () => {
    expect(() => Extractor.extractRules({
      samples: SAMPLES, feature_names: ["sf"], max_depth: 99,
    })).toThrow();
  });

  it("rejects purity_threshold<0.5 (Zod min(0.5))", () => {
    expect(() => Extractor.extractRules({
      samples: SAMPLES, feature_names: ["sf"], purity_threshold: 0.1,
    })).toThrow();
  });

  it("handles single-class samples (degenerate but valid)", () => {
    const oneClass: Sample[] = Array.from({ length: 25 }, (_, i) => ({
      features: { x: i },
      prediction: "only",
    }));
    const r = Extractor.extractRules({ samples: oneClass, feature_names: ["x"] });
    expect(r.unique_classes).toEqual(["only"]);
    expect(r.fidelity).toBe(1);
  });

  it("rationale includes class count and fidelity percentage", () => {
    const r = Extractor.extractRules({ samples: SAMPLES, feature_names: ["sf", "fz"] });
    expect(r.rationale).toMatch(/class\(es\)/);
    expect(r.rationale).toMatch(/fidelity/);
  });
});

describe("explainPrediction — apply rules to query", () => {
  it("returns matching rule for in-distribution query", () => {
    const r = Extractor.extractRules({ samples: SAMPLES, feature_names: ["sf", "fz"] });
    const explain = Extractor.explainPrediction({
      rules: r.rules,
      query_features: { sf: 150, fz: 0.04 },
    });
    expect(explain.predicted_class).toBe("high");
    expect(explain.matched_rules.length).toBeGreaterThan(0);
  });

  it("returns 'low' for query in low region", () => {
    const r = Extractor.extractRules({ samples: SAMPLES, feature_names: ["sf", "fz"] });
    const explain = Extractor.explainPrediction({
      rules: r.rules,
      query_features: { sf: 60, fz: 0.08 },
    });
    expect(explain.predicted_class).toBe("low");
  });

  it("returns null prediction when no rule matches", () => {
    const fakeRules = [
      { rule_id: "R1", antecedents: [{ feature: "x", op: ">" as const, threshold: 100 }],
        consequent: "yes", coverage: 0.5, confidence: 0.9, support: 10 },
    ];
    const explain = Extractor.explainPrediction({
      rules: fakeRules,
      query_features: { x: 50 },
    });
    expect(explain.predicted_class).toBeNull();
    expect(explain.rationale).toMatch(/out of distribution|escalate/i);
  });

  it("rejects empty rules array (Zod min(1))", () => {
    expect(() => Extractor.explainPrediction({
      rules: [],
      query_features: { sf: 100 },
    })).toThrow();
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T8-02", () => {
    expect(Extractor.engineId).toBe("CrossProcessRuleExtractedNeuralInferenceEngine");
    expect(Extractor.version).toBe("1.0.0");
    expect(Extractor.tier).toBe("T8-02");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_extract_rules returns ExtractResult", () => {
    const r = crossProcessRuleExtractedNeuralInference("xproc_extract_rules", {
      samples: SAMPLES, feature_names: ["sf", "fz"],
    } as ExtractInput) as { rules: unknown[]; fidelity: number };
    expect(r.rules.length).toBeGreaterThan(0);
    expect(r.fidelity).toBeGreaterThan(0);
  });

  it("xproc_rule_explain_prediction returns matched rules", () => {
    const ext = Extractor.extractRules({ samples: SAMPLES, feature_names: ["sf", "fz"] });
    const r = crossProcessRuleExtractedNeuralInference("xproc_rule_explain_prediction", {
      rules: ext.rules,
      query_features: { sf: 150, fz: 0.04 },
    }) as { predicted_class: string };
    expect(r.predicted_class).toBe("high");
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessRuleExtractedNeuralInference("unknown", {})).toThrow(/unknown action/i);
  });
});
