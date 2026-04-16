/**
 * BeliefStateReasoningEngine — Maintain probability distributions over states
 *
 * Phase 0.18 U-AGI13 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Upgrades the
 * existing uncertainty-tagging story to a full distribution:
 *
 *   "SESSION_INSIGHTS_LEDGER.jsonl is 80% current, 15% stale, 5% corrupted"
 *
 * The engine stores named distributions (Category → probability), supports
 * Bayesian updates (likelihood-weighted), entropy queries, and top-k most
 * likely states. Pure in-memory. No sampler — this is a discrete categorical
 * tracker, not a continuous model.
 *
 * @module engines/BeliefStateReasoningEngine
 * @milestone PP-0.18-U-AGI13
 */

export interface Distribution {
  [state: string]: number;
}

export interface BeliefEntry {
  id: string;
  description?: string;
  distribution: Distribution;
  updatedAt: string;
}

export interface TopState {
  state: string;
  probability: number;
}

const EPSILON = 1e-9;

export class BeliefStateReasoningEngine {
  private readonly beliefs = new Map<string, BeliefEntry>();

  set(id: string, distribution: Distribution, description?: string, at?: string): BeliefEntry {
    if (!id || id.trim() === "") throw new Error("id must be non-empty");
    const normalized = this.normalize(distribution);
    const entry: BeliefEntry = {
      id,
      description,
      distribution: normalized,
      updatedAt: at ?? new Date().toISOString(),
    };
    this.beliefs.set(id, entry);
    return entry;
  }

  get(id: string): BeliefEntry | null {
    return this.beliefs.get(id) ?? null;
  }

  /**
   * Bayesian update: multiply the current distribution by the likelihood
   * vector and renormalize. States missing from the likelihood keep their
   * prior mass at zero if their likelihood is explicitly 0, otherwise at 1.
   */
  update(id: string, likelihood: Distribution, at?: string): BeliefEntry {
    const existing = this.beliefs.get(id);
    if (!existing) throw new Error(`Unknown belief id: ${id}`);
    this.validateLikelihood(likelihood);

    const posterior: Distribution = {};
    for (const [state, prior] of Object.entries(existing.distribution)) {
      const lk = likelihood[state] !== undefined ? likelihood[state] : 1;
      posterior[state] = prior * lk;
    }

    // States appearing only in likelihood with non-zero mass are introduced
    // with prior mass equal to the mean of existing priors (uniform fallback).
    for (const [state, lk] of Object.entries(likelihood)) {
      if (posterior[state] === undefined && lk > 0) {
        const fallback = this.meanProbability(existing.distribution);
        posterior[state] = fallback * lk;
      }
    }

    existing.distribution = this.normalize(posterior);
    existing.updatedAt = at ?? new Date().toISOString();
    return existing;
  }

  topK(id: string, k = 3): TopState[] {
    const e = this.beliefs.get(id);
    if (!e) return [];
    if (k <= 0) return [];
    return Object.entries(e.distribution)
      .map(([state, probability]) => ({ state, probability }))
      .sort((a, b) => {
        if (b.probability !== a.probability) return b.probability - a.probability;
        return a.state.localeCompare(b.state);
      })
      .slice(0, k);
  }

  /**
   * Shannon entropy in bits. Uniform over N states → log2(N). A certain
   * belief (one state with P=1) → 0.
   */
  entropy(id: string): number {
    const e = this.beliefs.get(id);
    if (!e) return 0;
    let h = 0;
    for (const p of Object.values(e.distribution)) {
      if (p > EPSILON) h -= p * Math.log2(p);
    }
    return Math.round(h * 10000) / 10000;
  }

  /** The probability mass of a single state, or 0 if the belief or state is unknown. */
  probabilityOf(id: string, state: string): number {
    return this.beliefs.get(id)?.distribution[state] ?? 0;
  }

  list(): BeliefEntry[] {
    return [...this.beliefs.values()];
  }

  size(): number {
    return this.beliefs.size;
  }

  delete(id: string): boolean {
    return this.beliefs.delete(id);
  }

  clear(): void {
    this.beliefs.clear();
  }

  // --- internals ---------------------------------------------------------

  private normalize(dist: Distribution): Distribution {
    const entries = Object.entries(dist).filter(([, v]) => Number.isFinite(v) && v >= 0);
    if (entries.length === 0) throw new Error("distribution must contain at least one non-negative value");

    const sum = entries.reduce((a, [, v]) => a + v, 0);
    if (sum <= EPSILON) {
      // All zeros → uniform over provided states.
      const uniform = 1 / entries.length;
      return Object.fromEntries(entries.map(([k]) => [k, round4(uniform)]));
    }
    return Object.fromEntries(entries.map(([k, v]) => [k, round4(v / sum)]));
  }

  private validateLikelihood(lk: Distribution): void {
    for (const [k, v] of Object.entries(lk)) {
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(`likelihood for ${k} must be a non-negative finite number`);
      }
    }
  }

  private meanProbability(dist: Distribution): number {
    const values = Object.values(dist);
    if (values.length === 0) return 0;
    return values.reduce((a, v) => a + v, 0) / values.length;
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const beliefStateReasoningEngine = new BeliefStateReasoningEngine();
