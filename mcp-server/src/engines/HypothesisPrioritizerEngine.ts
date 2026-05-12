/**
 * HypothesisPrioritizerEngine — MILL-AGI-P0/U-P0.2
 *
 * Bayesian prior management for hypothesis ranking in milling decisions.
 * Feeds into HypothesisRankerEngine with calibrated priors based on:
 *   - Historical success rates per material/operation
 *   - Shop-specific preferences (JM Die calibration)
 *   - Physics-model confidence bounds
 *   - Tribal knowledge endorsements
 *
 * Maintains a belief distribution over hypothesis space that updates
 * with each observation (feedback loop ready for P7).
 *
 * @module engines/HypothesisPrioritizerEngine
 * @milestone MILL-AGI-P0.2
 */

import { log } from "../utils/Logger.js";

export interface HypothesisCategory {
  id: string;
  name: string;
  description: string;
  domain: "speed" | "feed" | "depth" | "tool" | "strategy" | "coolant" | "material";
}

export interface HypothesisPrior {
  hypothesis_id: string;
  category: HypothesisCategory;
  prior_probability: number;
  confidence_interval: [number, number];
  evidence_count: number;
  success_rate: number;
  last_updated: string;
  sources: string[];
}

export interface PriorUpdateInput {
  hypothesis_id: string;
  outcome: "success" | "partial" | "failure";
  context: {
    material_iso?: string;
    operation?: string;
    machine?: string;
    operator_feedback?: string;
  };
  weight?: number;
}

export interface HypothesisRankingInput {
  hypotheses: Array<{
    id: string;
    description: string;
    category: HypothesisCategory["domain"];
    predicted_outcome: number;
  }>;
  context: {
    material_iso_group: string;
    operation: string;
    customer?: string;
    machine?: string;
  };
}

export interface RankedHypothesis {
  id: string;
  description: string;
  posterior_probability: number;
  rank: number;
  confidence: number;
  supporting_evidence: string[];
  risk_flags: string[];
}

export interface PrioritizationResult {
  ranked_hypotheses: RankedHypothesis[];
  top_recommendation: string;
  consensus_confidence: number;
  disagreement_flags: string[];
}

const DEFAULT_PRIORS: Record<string, Record<string, number>> = {
  P: { conservative: 0.6, aggressive: 0.25, experimental: 0.15 },
  M: { conservative: 0.7, aggressive: 0.2, experimental: 0.1 },
  K: { conservative: 0.5, aggressive: 0.35, experimental: 0.15 },
  N: { conservative: 0.4, aggressive: 0.45, experimental: 0.15 },
  S: { conservative: 0.75, aggressive: 0.15, experimental: 0.1 },
  H: { conservative: 0.8, aggressive: 0.15, experimental: 0.05 },
};

const OPERATION_MODIFIERS: Record<string, Record<string, number>> = {
  roughing: { conservative: -0.1, aggressive: +0.15, experimental: -0.05 },
  "semi-finishing": { conservative: 0, aggressive: 0, experimental: 0 },
  finishing: { conservative: +0.1, aggressive: -0.1, experimental: 0 },
};

const TRIBAL_ENDORSEMENTS: Record<string, string[]> = {
  trochoidal_roughing: ["JM-MILL-004", "MIT-2.008-DYN"],
  conservative_hardened: ["JM-MILL-006", "SANDVIK-H10"],
  aggressive_aluminum: ["JM-MILL-008", "KENNAMETAL-N05"],
};

export class HypothesisPrioritizerEngine {
  private priorCache: Map<string, HypothesisPrior> = new Map();
  private updateHistory: PriorUpdateInput[] = [];

  getPrior(hypothesisId: string, context: { material_iso_group: string; operation: string }): HypothesisPrior | null {
    const cached = this.priorCache.get(hypothesisId);
    if (cached) return cached;

    const basePriors = DEFAULT_PRIORS[context.material_iso_group] ?? DEFAULT_PRIORS["P"];
    const opMod = OPERATION_MODIFIERS[context.operation] ?? OPERATION_MODIFIERS["semi-finishing"];

    const category = this.inferCategory(hypothesisId);
    const style = this.inferStyle(hypothesisId);
    const basePrior = basePriors[style] ?? 0.33;
    const modifier = opMod[style] ?? 0;
    const prior = Math.max(0.01, Math.min(0.99, basePrior + modifier));

    return {
      hypothesis_id: hypothesisId,
      category: {
        id: category,
        name: category,
        description: `${category} hypothesis`,
        domain: category as HypothesisCategory["domain"],
      },
      prior_probability: prior,
      confidence_interval: [prior * 0.8, Math.min(0.99, prior * 1.2)],
      evidence_count: 0,
      success_rate: 0.5,
      last_updated: new Date().toISOString(),
      sources: TRIBAL_ENDORSEMENTS[hypothesisId] ?? [],
    };
  }

  updatePrior(input: PriorUpdateInput): HypothesisPrior {
    log.info("HypothesisPrioritizerEngine.updatePrior", { hypothesis: input.hypothesis_id, outcome: input.outcome });

    this.updateHistory.push(input);

    const existing = this.priorCache.get(input.hypothesis_id);
    const weight = input.weight ?? 1.0;

    const outcomeValue = input.outcome === "success" ? 1.0 : input.outcome === "partial" ? 0.5 : 0.0;
    const newCount = (existing?.evidence_count ?? 0) + 1;
    const oldRate = existing?.success_rate ?? 0.5;
    const newRate = (oldRate * (newCount - 1) + outcomeValue * weight) / newCount;

    const newPrior = existing?.prior_probability ?? 0.33;
    const adjustedPrior = newPrior + (outcomeValue - 0.5) * 0.05 * weight;
    const clampedPrior = Math.max(0.05, Math.min(0.95, adjustedPrior));

    const updated: HypothesisPrior = {
      hypothesis_id: input.hypothesis_id,
      category: existing?.category ?? {
        id: "unknown",
        name: "Unknown",
        description: "Unknown category",
        domain: "strategy",
      },
      prior_probability: clampedPrior,
      confidence_interval: [clampedPrior * 0.85, Math.min(0.99, clampedPrior * 1.15)],
      evidence_count: newCount,
      success_rate: newRate,
      last_updated: new Date().toISOString(),
      sources: existing?.sources ?? [],
    };

    this.priorCache.set(input.hypothesis_id, updated);
    return updated;
  }

  prioritize(input: HypothesisRankingInput): PrioritizationResult {
    log.info("HypothesisPrioritizerEngine.prioritize", { count: input.hypotheses.length });

    const ranked: RankedHypothesis[] = [];
    const disagreements: string[] = [];

    for (const hyp of input.hypotheses) {
      const prior = this.getPrior(hyp.id, {
        material_iso_group: input.context.material_iso_group,
        operation: input.context.operation,
      });

      const priorProb = prior?.prior_probability ?? 0.33;
      const likelihood = this.estimateLikelihood(hyp.predicted_outcome, hyp.category);
      const posterior = this.computePosterior(priorProb, likelihood);

      const evidence = prior?.sources ?? [];
      const risks = this.assessRisks(hyp, input.context);

      if (priorProb < 0.3 && likelihood > 0.7) {
        disagreements.push(`${hyp.id}: low prior but high predicted outcome — verify with physics`);
      }

      ranked.push({
        id: hyp.id,
        description: hyp.description,
        posterior_probability: posterior,
        rank: 0,
        confidence: prior?.confidence_interval ? (prior.confidence_interval[1] - prior.confidence_interval[0]) : 0.2,
        supporting_evidence: evidence,
        risk_flags: risks,
      });
    }

    ranked.sort((a, b) => b.posterior_probability - a.posterior_probability);
    ranked.forEach((r, i) => (r.rank = i + 1));

    const consensus = this.calculateConsensus(ranked);

    return {
      ranked_hypotheses: ranked,
      top_recommendation: ranked[0]?.description ?? "No hypothesis ranked",
      consensus_confidence: consensus,
      disagreement_flags: disagreements,
    };
  }

  getTribalEndorsements(hypothesisId: string): string[] {
    return TRIBAL_ENDORSEMENTS[hypothesisId] ?? [];
  }

  resetForTests(): void {
    this.priorCache.clear();
    this.updateHistory = [];
  }

  private inferCategory(hypothesisId: string): string {
    if (/speed|rpm|sfm|vc/i.test(hypothesisId)) return "speed";
    if (/feed|fz|ipm/i.test(hypothesisId)) return "feed";
    if (/depth|ap|doc/i.test(hypothesisId)) return "depth";
    if (/tool|cutter|insert/i.test(hypothesisId)) return "tool";
    if (/strategy|trochoidal|hsm/i.test(hypothesisId)) return "strategy";
    if (/coolant|mql|flood/i.test(hypothesisId)) return "coolant";
    return "strategy";
  }

  private inferStyle(hypothesisId: string): string {
    if (/conservative|safe|reduced/i.test(hypothesisId)) return "conservative";
    if (/aggressive|high|max/i.test(hypothesisId)) return "aggressive";
    if (/experimental|novel|test/i.test(hypothesisId)) return "experimental";
    return "conservative";
  }

  private estimateLikelihood(predictedOutcome: number, category: string): number {
    return Math.max(0.1, Math.min(0.9, predictedOutcome));
  }

  private computePosterior(prior: number, likelihood: number): number {
    const evidence = prior * likelihood + (1 - prior) * (1 - likelihood);
    if (evidence === 0) return prior;
    return (prior * likelihood) / evidence;
  }

  private assessRisks(
    hypothesis: HypothesisRankingInput["hypotheses"][0],
    context: HypothesisRankingInput["context"]
  ): string[] {
    const risks: string[] = [];

    if (context.material_iso_group === "H" && /aggressive|high/i.test(hypothesis.description)) {
      risks.push("Aggressive approach on hardened material — verify thermal limits");
    }

    if (context.material_iso_group === "S" && /experimental/i.test(hypothesis.description)) {
      risks.push("Experimental approach on superalloy — high-value material at risk");
    }

    return risks;
  }

  private calculateConsensus(ranked: RankedHypothesis[]): number {
    if (ranked.length < 2) return 0.9;

    const top = ranked[0]?.posterior_probability ?? 0;
    const second = ranked[1]?.posterior_probability ?? 0;

    const gap = top - second;
    return Math.min(0.95, 0.5 + gap);
  }
}

export const hypothesisPrioritizerEngine = new HypothesisPrioritizerEngine();
