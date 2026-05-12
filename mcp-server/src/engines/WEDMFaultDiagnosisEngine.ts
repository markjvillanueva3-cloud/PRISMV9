/**
 * WEDMFaultDiagnosisEngine — WEDM AGI Phase 2 / U-P2-03
 *
 * Given a set of observed symptoms (high Ra, frequent wire breaks,
 * dimensional errors, etc.), returns the most likely root causes ranked
 * by a symptom-weighted confidence score derived from the causal graph.
 *
 * Algorithm:
 *   1. For each symptom s, call causality.rootCausesOf(s) AND
 *      causality.whatAffects(s, deep=true-ish) to gather upstream nodes.
 *   2. For each upstream node u, aggregate the product of path
 *      confidences from u to every observed symptom. Symptoms with
 *      higher severity weight their root candidates more.
 *   3. Rank candidates by aggregate score, return top_n with explanation.
 *
 * Delegates graph math to WEDMProcessCausalityEngine — no duplication.
 *
 * Exit gate (P2-MS1):
 *   - ≥80 % top-1 accuracy on 10 synthetic expert-labelled failure cases
 *     (tests/wedm_fault_diagnosis.test.ts).
 */

import {
  wedmProcessCausalityEngine,
  WEDMProcessCausalityEngine,
} from "./WEDMProcessCausalityEngine.js";

// ────────────────────────── Types ──────────────────────────

export type SymptomSeverity = "low" | "medium" | "high";

export interface ObservedSymptom {
  variable: string;
  /** Direction of observed deviation: "up" means outcome is higher than normal. */
  direction: "up" | "down";
  severity?: SymptomSeverity;
}

export interface DiagnosisInput {
  symptoms: ObservedSymptom[];
  max_hops?: number;
  top_n?: number;
}

export interface RootCauseCandidate {
  variable: string;
  score: number;
  /** Direction the operator should change this variable (up or down). */
  recommended_change: "up" | "down" | "investigate";
  explanations: string[];
}

export interface DiagnosisResult {
  top_candidate: RootCauseCandidate | null;
  candidates: RootCauseCandidate[];
  notes: string[];
}

// ────────────────────────── Engine ──────────────────────────

const SEVERITY_WEIGHT: Record<SymptomSeverity, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.7,
};

export class WEDMFaultDiagnosisEngine {
  constructor(
    private readonly causality: WEDMProcessCausalityEngine = wedmProcessCausalityEngine,
  ) {}

  diagnose(input: DiagnosisInput): DiagnosisResult {
    this.validate(input);
    const maxHops = input.max_hops ?? 4;
    const topN = Math.max(1, input.top_n ?? 5);
    const edges = this.causality.edges();

    // Aggregate upstream scores per candidate root.
    const scores = new Map<string, RootCauseCandidate>();

    for (const sym of input.symptoms) {
      const weight = SEVERITY_WEIGHT[sym.severity ?? "medium"];
      const upstream = this.collectUpstream(sym.variable, edges, maxHops);
      for (const [source, path] of upstream) {
        // Recommended change direction on the source to counter the symptom:
        //   sym_direction * polarity_chain = target_direction.
        // To push target in the OPPOSITE of observed, we need the change
        // that, through polarity_chain, yields -sym_direction.
        const symSign = sym.direction === "up" ? 1 : -1;
        const polSign = path.polarity === "positive" ? 1 : path.polarity === "negative" ? -1 : 0;
        const needed = polSign === 0 ? 0 : -symSign * polSign; // up=+1, down=-1
        const rec =
          needed > 0 ? "up" : needed < 0 ? "down" : "investigate";

        const entry = scores.get(source) ?? {
          variable: source,
          score: 0,
          recommended_change: rec,
          explanations: [],
        };
        entry.score += path.confidence * weight;
        entry.explanations.push(
          `${sym.variable} is ${sym.direction.toUpperCase()} (severity ${sym.severity ?? "medium"}) — upstream via ${path.via.join(" → ")} (conf ${(path.confidence * 100).toFixed(0)}%, ${path.polarity})`,
        );
        // If two symptoms agree on recommended direction, keep it;
        // if they disagree, downgrade to investigate.
        if (entry.recommended_change !== rec && entry.explanations.length > 1) {
          entry.recommended_change = "investigate";
        }
        scores.set(source, entry);
      }
    }

    const ranked = [...scores.values()].sort((a, b) => b.score - a.score);
    const top = ranked.slice(0, topN);
    const top_candidate = top.length > 0 ? top[0] : null;

    const notes: string[] = [];
    if (!top_candidate) {
      notes.push(
        "No upstream parameters found for the reported symptoms. Verify that symptom names match graph node IDs.",
      );
    } else if (
      ranked.length > 1 &&
      ranked[1].score > ranked[0].score * 0.85
    ) {
      notes.push(
        `Close call: ${ranked[0].variable} (${ranked[0].score.toFixed(2)}) vs ${ranked[1].variable} (${ranked[1].score.toFixed(2)}). Investigate both.`,
      );
    }

    return { top_candidate, candidates: top, notes };
  }

  // ─── internals ────────────────────────────────────────────

  /**
   * Collect every upstream node within `maxHops` of `target`, along with
   * the best (highest-confidence) reverse path. Emulates BFS backwards.
   */
  private collectUpstream(
    target: string,
    edges: readonly { from: string; to: string; confidence: number; polarity: "positive" | "negative" | "unknown" }[],
    maxHops: number,
  ): Map<string, { confidence: number; polarity: "positive" | "negative" | "unknown"; via: string[] }> {
    const best = new Map<
      string,
      { confidence: number; polarity: "positive" | "negative" | "unknown"; via: string[] }
    >();
    const frontier: Array<{
      node: string;
      hops: number;
      confidence: number;
      polarity: "positive" | "negative" | "unknown";
      via: string[];
    }> = [{ node: target, hops: 0, confidence: 1, polarity: "positive", via: [target] }];

    while (frontier.length > 0) {
      const cur = frontier.shift()!;
      if (cur.hops >= maxHops) continue;
      for (const e of edges) {
        if (e.to !== cur.node) continue;
        const conf = cur.confidence * e.confidence;
        const polarity = combinePolarity(cur.polarity, e.polarity);
        const via = [e.from, ...cur.via];
        const existing = best.get(e.from);
        if (!existing || conf > existing.confidence) {
          best.set(e.from, { confidence: conf, polarity, via });
          frontier.push({ node: e.from, hops: cur.hops + 1, confidence: conf, polarity, via });
        }
      }
    }
    // Strip the target itself (appears as hops=0 seed).
    best.delete(target);
    return best;
  }

  private validate(input: DiagnosisInput): void {
    if (!Array.isArray(input.symptoms) || input.symptoms.length === 0) {
      throw new Error("symptoms required (non-empty array)");
    }
    for (const s of input.symptoms) {
      if (!s.variable || s.variable.trim() === "") {
        throw new Error("symptom.variable required");
      }
      if (s.direction !== "up" && s.direction !== "down") {
        throw new Error("symptom.direction must be 'up' or 'down'");
      }
    }
  }
}

function combinePolarity(
  a: "positive" | "negative" | "unknown",
  b: "positive" | "negative" | "unknown",
): "positive" | "negative" | "unknown" {
  if (a === "unknown" || b === "unknown") return "unknown";
  return a === b ? "positive" : "negative";
}

export const wedmFaultDiagnosisEngine = new WEDMFaultDiagnosisEngine();
