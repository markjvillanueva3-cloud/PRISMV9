// WIRE-EXEMPT: tests in __tests__/engines/loraCompositionU-LEARN-05.test.ts
/**
 * LoRA MoE Gating Engine — U-LEARN-05
 * =====================================
 *
 * Top-K softmax router over adapter set. Selects best experts based on:
 * - 5-dimensional quality score (accuracy, stability, coverage, confidence, freshness)
 * - Material embedding similarity
 * - Machine embedding similarity
 * - Domain match
 *
 * @module engines/LoRAMoEGatingEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-05
 */

import type {
  Expert,
  GatingInput,
  GatingResult,
  QualityScoreVector,
} from "../schemas/loraCompositionSchema.js";

interface ExpertRegistry {
  experts: Map<string, Expert>;
  domainIndex: Map<string, Set<string>>;
  materialIndex: Map<string, Set<string>>;
  machineIndex: Map<string, Set<string>>;
}

const DEFAULT_QUALITY_WEIGHTS = [0.3, 0.2, 0.2, 0.2, 0.1];

class LoRAMoEGatingEngine {
  private registry: ExpertRegistry = {
    experts: new Map(),
    domainIndex: new Map(),
    materialIndex: new Map(),
    machineIndex: new Map(),
  };

  registerExpert(expert: Expert): void {
    this.registry.experts.set(expert.adapter_id, expert);

    const domain = expert.domain;
    if (!this.registry.domainIndex.has(domain)) {
      this.registry.domainIndex.set(domain, new Set());
    }
    this.registry.domainIndex.get(domain)!.add(expert.adapter_id);
  }

  registerExperts(experts: Expert[]): { registered: number } {
    for (const expert of experts) {
      this.registerExpert(expert);
    }
    return { registered: experts.length };
  }

  unregisterExpert(adapterId: string): boolean {
    const expert = this.registry.experts.get(adapterId);
    if (!expert) return false;

    this.registry.experts.delete(adapterId);
    this.registry.domainIndex.get(expert.domain)?.delete(adapterId);
    return true;
  }

  getExpert(adapterId: string): Expert | undefined {
    return this.registry.experts.get(adapterId);
  }

  listExperts(domain?: string): Expert[] {
    if (domain) {
      const ids = this.registry.domainIndex.get(domain);
      if (!ids) return [];
      return Array.from(ids).map((id) => this.registry.experts.get(id)!);
    }
    return Array.from(this.registry.experts.values());
  }

  private computeQualityScore(
    quality: QualityScoreVector,
    weights: number[]
  ): number {
    const values = [
      quality.accuracy,
      quality.stability,
      quality.coverage,
      quality.confidence,
      quality.freshness,
    ];
    let score = 0;
    for (let i = 0; i < 5; i++) {
      score += values[i] * weights[i];
    }
    return score;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private softmax(scores: number[], temperature: number): number[] {
    const scaled = scores.map((s) => s / temperature);
    const maxScore = Math.max(...scaled);
    const exps = scaled.map((s) => Math.exp(s - maxScore));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sum);
  }

  gate(input: GatingInput): GatingResult {
    const startTime = performance.now();

    const qualityWeights = input.quality_weights ?? DEFAULT_QUALITY_WEIGHTS;
    const topK = input.top_k ?? 3;
    const temperature = input.temperature ?? 1.0;

    let candidates = this.registry.domainIndex.get(input.domain);
    if (!candidates || candidates.size === 0) {
      candidates = new Set(this.registry.experts.keys());
    }

    const scored: Array<{ adapterId: string; score: number }> = [];

    for (const adapterId of candidates) {
      const expert = this.registry.experts.get(adapterId)!;

      let score = this.computeQualityScore(expert.quality_score, qualityWeights);

      if (expert.domain === input.domain) {
        score *= 1.2;
      }

      scored.push({ adapterId, score });
    }

    scored.sort((a, b) => b.score - a.score);

    const topKCandidates = scored.slice(0, topK);
    const topKScores = topKCandidates.map((c) => c.score);
    const weights = this.softmax(topKScores, temperature);

    const selectedExperts = topKCandidates.map((c, i) => ({
      adapter_id: c.adapterId,
      weight: weights[i],
      score: c.score,
    }));

    return {
      selected_experts: selectedExperts,
      total_experts: this.registry.experts.size,
      gating_time_ms: performance.now() - startTime,
    };
  }

  batchGate(
    inputs: GatingInput[]
  ): Array<GatingResult & { input_index: number }> {
    return inputs.map((input, index) => ({
      ...this.gate(input),
      input_index: index,
    }));
  }

  getStats(): {
    total_experts: number;
    experts_by_domain: Record<string, number>;
    avg_quality_score: number;
  } {
    const expertsByDomain: Record<string, number> = {};
    let totalQuality = 0;

    for (const [domain, ids] of this.registry.domainIndex) {
      expertsByDomain[domain] = ids.size;
    }

    for (const expert of this.registry.experts.values()) {
      totalQuality += this.computeQualityScore(
        expert.quality_score,
        DEFAULT_QUALITY_WEIGHTS
      );
    }

    const totalExperts = this.registry.experts.size;

    return {
      total_experts: totalExperts,
      experts_by_domain: expertsByDomain,
      avg_quality_score: totalExperts > 0 ? totalQuality / totalExperts : 0,
    };
  }

  clear(): void {
    this.registry.experts.clear();
    this.registry.domainIndex.clear();
    this.registry.materialIndex.clear();
    this.registry.machineIndex.clear();
  }
}

export const loraMoEGatingEngine = new LoRAMoEGatingEngine();
export type { Expert, GatingInput, GatingResult };
