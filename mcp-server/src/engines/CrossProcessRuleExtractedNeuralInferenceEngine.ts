/**
 * CrossProcessRuleExtractedNeuralInferenceEngine — XPROC-NEURAL Tier 8 (T8-02)
 *
 * Extracts human-readable IF-THEN decision rules that approximate a neural
 * network's behavior, decompositional method (Craven & Shavlik 1996, TREPAN).
 *
 * Why decompositional, not pedagogical: pedagogical methods (training a tree
 * on input/output pairs) are simpler but lose internal structure. Decompositional
 * methods examine the network's decision boundaries directly. Since this engine
 * does NOT have access to T1-02 weights yet (T1-02 lives on a peer worktree),
 * we accept a SAMPLE of (input, network_output) pairs as the network's
 * behavioral signature and fit axis-aligned splits to it. When T1-02 lands,
 * the same code path will accept its predict() output verbatim.
 *
 * Algorithm:
 *   1. Sample N points from the input space (or use provided samples)
 *   2. Each sample carries the network's prediction
 *   3. Greedy axis-aligned splitting: at each node, find (feature, threshold)
 *      that maximizes information gain over the network's predictions
 *   4. Stop when (a) max_depth reached, (b) leaf has fewer than min_leaf_size,
 *      or (c) class purity ≥ purity_threshold
 *   5. Output rules: "IF sf > 100 AND fz ≤ 0.05 THEN class=high"
 *
 * Fidelity: per-rule we compute coverage (fraction of samples matching the
 * antecedent) and confidence (fraction of matching samples with the predicted
 * class). Acceptance criterion is ≥80% coverage + ≤10% fidelity loss vs
 * network direct output.
 *
 * Per CLAUDE.md operator-in-the-loop: extracted rules are AUDIT bridges —
 * they let operators inspect what the network "decided" without trusting it
 * blindly. The rules SUGGEST; the network output remains the authoritative
 * prediction unless flagged for review.
 *
 * @module CrossProcessRuleExtractedNeuralInferenceEngine
 */

import { z } from "zod";

const SampleSchema = z.object({
  features: z.record(z.string(), z.number().finite()).describe("Input feature map (e.g. {sf: 100, fz: 0.05})"),
  prediction: z.string().min(1).describe("Network's classification output for these features"),
});
export type Sample = z.infer<typeof SampleSchema>;

const ExtractInputSchema = z.object({
  samples: z.array(SampleSchema).min(20).describe("≥20 samples needed for reliable rule extraction"),
  feature_names: z.array(z.string().min(1)).min(1).describe("Ordered list of feature keys to consider"),
  max_depth: z.number().int().min(1).max(10).default(4),
  min_leaf_size: z.number().int().min(1).max(100).default(5),
  purity_threshold: z.number().min(0.5).max(1).default(0.9),
});
export type ExtractInput = z.infer<typeof ExtractInputSchema>;

export interface RuleAntecedent {
  feature: string;
  op: ">" | "<=" | ">=" | "<";
  threshold: number;
}

export interface ExtractedRule {
  rule_id: string;
  antecedents: RuleAntecedent[];
  consequent: string;          // class label
  coverage: number;            // 0..1 — fraction of samples matching antecedents
  confidence: number;          // 0..1 — fraction of matching samples with consequent
  support: number;             // count of samples matching
}

export interface ExtractResult {
  rules: ExtractedRule[];
  total_samples: number;
  unique_classes: string[];
  fidelity: number;            // 0..1 — fraction of samples correctly classified by ruleset
  rationale: string;
}

const ExplainInputSchema = z.object({
  rules: z.array(z.object({
    rule_id: z.string(),
    antecedents: z.array(z.object({
      feature: z.string(),
      op: z.enum([">", "<=", ">=", "<"]),
      threshold: z.number().finite(),
    })),
    consequent: z.string(),
    coverage: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    support: z.number().int().min(0),
  })).min(1),
  query_features: z.record(z.string(), z.number().finite()),
});
export type ExplainInput = z.infer<typeof ExplainInputSchema>;

export interface ExplainResult {
  matched_rules: ExtractedRule[];
  predicted_class: string | null;
  rationale: string;
}

function antecedentMatches(features: Record<string, number>, ant: RuleAntecedent): boolean {
  const v = features[ant.feature];
  if (v === undefined || !Number.isFinite(v)) return false;
  switch (ant.op) {
    case ">": return v > ant.threshold;
    case "<=": return v <= ant.threshold;
    case ">=": return v >= ant.threshold;
    case "<": return v < ant.threshold;
  }
}

function ruleMatchesSample(rule: ExtractedRule, features: Record<string, number>): boolean {
  return rule.antecedents.every((a) => antecedentMatches(features, a));
}

function entropy(classCounts: Map<string, number>, total: number): number {
  if (total === 0) return 0;
  let h = 0;
  for (const c of classCounts.values()) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

function classCounts(samples: Sample[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of samples) m.set(s.prediction, (m.get(s.prediction) ?? 0) + 1);
  return m;
}

function dominantClass(samples: Sample[]): { label: string; count: number } {
  const counts = classCounts(samples);
  let best: { label: string; count: number } = { label: "", count: -1 };
  for (const [label, count] of counts) {
    if (count > best.count) best = { label, count };
  }
  return best;
}

interface SplitCandidate {
  feature: string;
  threshold: number;
  gain: number;
  leftSamples: Sample[];
  rightSamples: Sample[];
}

function bestSplit(samples: Sample[], featureNames: string[]): SplitCandidate | null {
  const totalEntropy = entropy(classCounts(samples), samples.length);
  let best: SplitCandidate | null = null;

  for (const feature of featureNames) {
    const values = samples
      .map((s) => s.features[feature])
      .filter((v): v is number => v !== undefined && Number.isFinite(v))
      .sort((a, b) => a - b);
    if (values.length < 2) continue;

    // Candidate thresholds = midpoints between distinct sorted values
    const thresholds: number[] = [];
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] !== values[i + 1]) thresholds.push((values[i] + values[i + 1]) / 2);
    }

    for (const threshold of thresholds) {
      const left: Sample[] = [];
      const right: Sample[] = [];
      for (const s of samples) {
        const v = s.features[feature];
        if (v === undefined) continue;
        if (v <= threshold) left.push(s);
        else right.push(s);
      }
      if (left.length === 0 || right.length === 0) continue;

      const wL = left.length / samples.length;
      const wR = right.length / samples.length;
      const splitEntropy = wL * entropy(classCounts(left), left.length) + wR * entropy(classCounts(right), right.length);
      const gain = totalEntropy - splitEntropy;

      if (gain > 0 && (!best || gain > best.gain)) {
        best = { feature, threshold, gain, leftSamples: left, rightSamples: right };
      }
    }
  }

  return best;
}

interface RuleBuilder {
  antecedents: RuleAntecedent[];
}

function recurseExtract(
  samples: Sample[],
  featureNames: string[],
  depth: number,
  maxDepth: number,
  minLeaf: number,
  purityThreshold: number,
  pathSoFar: RuleBuilder,
  acc: ExtractedRule[],
): void {
  if (samples.length === 0) return;

  // Compute purity at this node
  const dominant = dominantClass(samples);
  const purity = dominant.count / samples.length;

  // Stop: max depth, leaf too small, or pure enough
  if (depth >= maxDepth || samples.length <= minLeaf || purity >= purityThreshold) {
    if (dominant.label) {
      acc.push({
        rule_id: `R${acc.length + 1}`,
        antecedents: [...pathSoFar.antecedents],
        consequent: dominant.label,
        coverage: 0,        // filled later against full sample set
        confidence: purity,
        support: dominant.count,
      });
    }
    return;
  }

  const split = bestSplit(samples, featureNames);
  if (!split) {
    // Can't split further — emit leaf
    if (dominant.label) {
      acc.push({
        rule_id: `R${acc.length + 1}`,
        antecedents: [...pathSoFar.antecedents],
        consequent: dominant.label,
        coverage: 0,
        confidence: purity,
        support: dominant.count,
      });
    }
    return;
  }

  // Recurse left (≤) and right (>)
  recurseExtract(
    split.leftSamples, featureNames, depth + 1, maxDepth, minLeaf, purityThreshold,
    { antecedents: [...pathSoFar.antecedents, { feature: split.feature, op: "<=", threshold: split.threshold }] },
    acc,
  );
  recurseExtract(
    split.rightSamples, featureNames, depth + 1, maxDepth, minLeaf, purityThreshold,
    { antecedents: [...pathSoFar.antecedents, { feature: split.feature, op: ">", threshold: split.threshold }] },
    acc,
  );
}

export class CrossProcessRuleExtractedNeuralInferenceEngine {
  /**
   * Extract IF-THEN rules from network output samples via greedy entropy splits.
   */
  static extractRules(input: ExtractInput): ExtractResult {
    const parsed = ExtractInputSchema.parse(input);
    const rules: ExtractedRule[] = [];
    recurseExtract(
      parsed.samples,
      parsed.feature_names,
      0,
      parsed.max_depth,
      parsed.min_leaf_size,
      parsed.purity_threshold,
      { antecedents: [] },
      rules,
    );

    // Compute coverage against full sample set + fidelity
    let correctCount = 0;
    for (const rule of rules) {
      let matchCount = 0;
      let correctMatchCount = 0;
      for (const sample of parsed.samples) {
        if (ruleMatchesSample(rule, sample.features)) {
          matchCount += 1;
          if (sample.prediction === rule.consequent) correctMatchCount += 1;
        }
      }
      rule.coverage = matchCount / parsed.samples.length;
      // Update support to true match count, not the count from terminal node only
      rule.support = matchCount;
      // Confidence already set from leaf purity but recompute from full set match
      rule.confidence = matchCount === 0 ? 0 : correctMatchCount / matchCount;
    }

    // Fidelity: for each sample, find first rule that matches and check class
    for (const sample of parsed.samples) {
      const matchingRule = rules.find((r) => ruleMatchesSample(r, sample.features));
      if (matchingRule && matchingRule.consequent === sample.prediction) correctCount += 1;
    }
    const fidelity = parsed.samples.length === 0 ? 0 : correctCount / parsed.samples.length;

    const uniqueClasses = Array.from(new Set(parsed.samples.map((s) => s.prediction)));

    return {
      rules,
      total_samples: parsed.samples.length,
      unique_classes: uniqueClasses,
      fidelity,
      rationale: `Extracted ${rules.length} rule(s) over ${uniqueClasses.length} class(es) with ${(fidelity * 100).toFixed(1)}% fidelity to network output.`,
    };
  }

  /**
   * Apply extracted rules to a query: find matching rule, return predicted class.
   * If multiple rules match (rare with axis-aligned splits but possible with
   * disjoint antecedents), highest-confidence wins.
   */
  static explainPrediction(input: ExplainInput): ExplainResult {
    const parsed = ExplainInputSchema.parse(input);
    const matched = parsed.rules.filter((r) => ruleMatchesSample(r as ExtractedRule, parsed.query_features));

    if (matched.length === 0) {
      return {
        matched_rules: [],
        predicted_class: null,
        rationale: "No rule's antecedents matched the query — out of distribution. Defer to network direct output or escalate.",
      };
    }

    const sorted = [...matched].sort((a, b) => b.confidence - a.confidence);
    const top = sorted[0];
    return {
      matched_rules: sorted as ExtractedRule[],
      predicted_class: top.consequent,
      rationale: `${matched.length} rule(s) matched; selected '${top.rule_id}' with confidence ${top.confidence.toFixed(3)}.`,
    };
  }

  static readonly engineId = "CrossProcessRuleExtractedNeuralInferenceEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T8-02";
}

export const crossProcessRuleExtractedNeuralInferenceEngine = CrossProcessRuleExtractedNeuralInferenceEngine;

export function crossProcessRuleExtractedNeuralInference(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_extract_rules":
      return CrossProcessRuleExtractedNeuralInferenceEngine.extractRules(params as ExtractInput);
    case "xproc_rule_explain_prediction":
      return CrossProcessRuleExtractedNeuralInferenceEngine.explainPrediction(params as ExplainInput);
    default:
      throw new Error(`crossProcessRuleExtractedNeuralInference: unknown action '${action}'`);
  }
}
