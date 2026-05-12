/**
 * ActiveLearningStrategyEngine — Rank learning targets by expected info gain
 *
 * Phase 0.18 U-AGI7 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a set of
 * candidate learning targets (pages to read, registry entries to verify,
 * experiments to run), rank them by expected information gain weighted by
 * their Ψ impact and cost.
 *
 * Info gain is modeled as `entropy_before - expected_entropy_after` on a
 * coarse certainty scale. Callers supply `currentUncertainty` ∈ [0,1] and an
 * `expectedReduction` that estimates how much the target will drop it.
 *
 * @module engines/ActiveLearningStrategyEngine
 * @milestone PP-0.18-U-AGI7
 */

export interface LearningCandidate {
  id: string;
  topic: string;
  currentUncertainty: number; // 0..1
  expectedReduction: number; // 0..1
  psiImpact?: number; // projected Ψ delta in percentage points
  costMinutes: number; // must be > 0
  tags?: string[];
}

export interface RankedCandidate extends LearningCandidate {
  infoGain: number;
  score: number;
  rank: number;
}

export class ActiveLearningStrategyEngine {
  rank(candidates: readonly LearningCandidate[]): RankedCandidate[] {
    this.assertUnique(candidates);
    const scored: RankedCandidate[] = candidates.map((c) => {
      this.assertValid(c);
      const before = this.binaryEntropy(c.currentUncertainty);
      const afterUncertainty = Math.max(0, c.currentUncertainty * (1 - c.expectedReduction));
      const after = this.binaryEntropy(afterUncertainty);
      const infoGain = Math.max(0, before - after);
      const psi = c.psiImpact ?? 0;
      const perMinute = (infoGain + 0.1 * psi) / c.costMinutes;
      return {
        ...c,
        infoGain: this.round4(infoGain),
        score: this.round4(perMinute),
        rank: 0,
      };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });
    for (let i = 0; i < scored.length; i += 1) scored[i].rank = i + 1;
    return scored;
  }

  summary(ranked: readonly RankedCandidate[]): {
    total: number;
    totalInfoGain: number;
    topTopic: string | null;
  } {
    const totalInfoGain = this.round4(ranked.reduce((a, r) => a + r.infoGain, 0));
    return { total: ranked.length, totalInfoGain, topTopic: ranked[0]?.topic ?? null };
  }

  // --- internals ---------------------------------------------------------

  private binaryEntropy(p: number): number {
    if (p <= 0 || p >= 1) return 0;
    return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  }

  private assertValid(c: LearningCandidate): void {
    if (!c.id || c.id.trim() === "") throw new Error("id required");
    if (!c.topic || c.topic.trim() === "") throw new Error("topic required");
    if (!(c.currentUncertainty >= 0 && c.currentUncertainty <= 1)) throw new Error("currentUncertainty must be in [0,1]");
    if (!(c.expectedReduction >= 0 && c.expectedReduction <= 1)) throw new Error("expectedReduction must be in [0,1]");
    if (!(c.costMinutes > 0)) throw new Error("costMinutes must be > 0");
    if (c.psiImpact !== undefined && !Number.isFinite(c.psiImpact)) throw new Error("psiImpact must be finite");
  }

  private assertUnique(candidates: readonly LearningCandidate[]): void {
    const seen = new Set<string>();
    for (const c of candidates) {
      if (seen.has(c.id)) throw new Error(`duplicate id: ${c.id}`);
      seen.add(c.id);
    }
  }

  private round4(n: number): number {
    return Math.round(n * 10000) / 10000;
  }
}

export const activeLearningStrategyEngine = new ActiveLearningStrategyEngine();
