/**
 * FisherInformationEngine — Information-theoretic quantities for discrete distributions
 *
 * Phase 0.25.3 U-MATH-B5 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Provides
 * closed-form information quantities used by AGI-safety and active-learning
 * callers:
 *
 *   - Shannon entropy H(P) = −Σ p·log₂ p
 *   - KL divergence D(P‖Q) = Σ p·log₂(p/q)
 *   - Jensen–Shannon divergence (symmetric, bounded 0≤JSD≤1)
 *   - Mutual information I(X;Y) from a joint distribution
 *   - Maximum-entropy distribution (uniform over non-forbidden outcomes)
 *   - Discrete Fisher information score for a parameterised Bernoulli family
 *
 * All inputs are finite non-negative; the engine normalises silently so
 * callers can pass in un-normalised counts. No sampling, no external libs.
 *
 * References:
 *   - Cover & Thomas (2006) "Elements of Information Theory" ch. 2, 8
 *   - Lin (1991) "Divergence measures based on the Shannon entropy"
 *
 * @module engines/FisherInformationEngine
 * @milestone PP-0.25.3-U-MATH-B5
 */

export type Distribution = Record<string, number>;

const EPSILON = 1e-12;

export interface MutualInfoJoint {
  [row: string]: Record<string, number>; // row = X, column = Y, value = joint probability (or count)
}

export class FisherInformationEngine {
  /** Shannon entropy in bits. Accepts unnormalised mass. */
  entropy(dist: Distribution): number {
    const p = this.normalize(dist);
    let h = 0;
    for (const v of Object.values(p)) if (v > EPSILON) h -= v * Math.log2(v);
    return round6(h);
  }

  /** Kullback–Leibler divergence D(P‖Q) in bits. Zero mass in Q with non-zero mass in P → ∞. */
  klDivergence(p: Distribution, q: Distribution): number {
    const P = this.normalize(p);
    const Q = this.normalize(q);
    let kl = 0;
    for (const [key, pVal] of Object.entries(P)) {
      if (pVal <= EPSILON) continue;
      const qVal = Q[key] ?? 0;
      if (qVal <= EPSILON) return Number.POSITIVE_INFINITY;
      kl += pVal * Math.log2(pVal / qVal);
    }
    return round6(kl);
  }

  /** Jensen–Shannon divergence in bits; symmetric, 0 ≤ JSD ≤ 1. */
  jsDivergence(p: Distribution, q: Distribution): number {
    const P = this.normalize(p);
    const Q = this.normalize(q);
    const M: Distribution = {};
    const keys = new Set([...Object.keys(P), ...Object.keys(Q)]);
    for (const k of keys) M[k] = 0.5 * ((P[k] ?? 0) + (Q[k] ?? 0));
    const jsd = 0.5 * this.rawKl(P, M) + 0.5 * this.rawKl(Q, M);
    return round6(Math.max(0, Math.min(1, jsd)));
  }

  /** Mutual information I(X;Y) in bits from a joint count table. */
  mutualInformation(joint: MutualInfoJoint): number {
    this.validateJoint(joint);
    const flat: Array<[string, string, number]> = [];
    let total = 0;
    for (const [x, row] of Object.entries(joint)) {
      for (const [y, value] of Object.entries(row)) {
        flat.push([x, y, value]);
        total += value;
      }
    }
    if (total <= EPSILON) return 0;

    const rowSums = new Map<string, number>();
    const colSums = new Map<string, number>();
    for (const [x, y, v] of flat) {
      rowSums.set(x, (rowSums.get(x) ?? 0) + v);
      colSums.set(y, (colSums.get(y) ?? 0) + v);
    }

    let mi = 0;
    for (const [x, y, v] of flat) {
      if (v <= EPSILON) continue;
      const pXY = v / total;
      const pX = (rowSums.get(x) ?? 0) / total;
      const pY = (colSums.get(y) ?? 0) / total;
      if (pX <= EPSILON || pY <= EPSILON) continue;
      mi += pXY * Math.log2(pXY / (pX * pY));
    }
    return round6(Math.max(0, mi));
  }

  /** Maximum-entropy distribution over a set of outcomes, excluding any
   * outcomes listed as forbidden. */
  maxEntropyDistribution(outcomes: readonly string[], forbidden: readonly string[] = []): Distribution {
    if (!Array.isArray(outcomes) || outcomes.length === 0) throw new Error("outcomes must be non-empty array");
    const forbid = new Set(forbidden);
    const allowed = outcomes.filter((o) => !forbid.has(o));
    if (allowed.length === 0) throw new Error("all outcomes are forbidden");
    const p = 1 / allowed.length;
    const out: Distribution = {};
    for (const o of allowed) out[o] = round6(p);
    return out;
  }

  /**
   * Fisher information for a Bernoulli(θ) family evaluated at `theta`.
   * I(θ) = 1 / [θ(1−θ)]. Returns ∞ at the boundary.
   */
  bernoulliFisherInformation(theta: number): number {
    if (!(theta >= 0 && theta <= 1)) throw new Error("theta must be in [0, 1]");
    if (theta === 0 || theta === 1) return Number.POSITIVE_INFINITY;
    return round6(1 / (theta * (1 - theta)));
  }

  /** Cramér–Rao lower bound for the variance of an unbiased Bernoulli estimator. */
  cramerRaoLowerBound(theta: number, sampleSize: number): number {
    if (!Number.isInteger(sampleSize) || sampleSize <= 0) throw new Error("sampleSize must be a positive integer");
    const fi = this.bernoulliFisherInformation(theta);
    if (!Number.isFinite(fi)) return 0;
    return round6(1 / (sampleSize * fi));
  }

  // --- internals ---------------------------------------------------------

  private normalize(dist: Distribution): Distribution {
    if (!dist || typeof dist !== "object") throw new Error("distribution must be an object");
    const entries = Object.entries(dist);
    if (entries.length === 0) throw new Error("distribution must contain at least one state");
    let sum = 0;
    for (const [, v] of entries) {
      if (!Number.isFinite(v) || v < 0) throw new Error("distribution values must be non-negative finite");
      sum += v;
    }
    if (sum <= EPSILON) {
      const uniform = 1 / entries.length;
      const out: Distribution = {};
      for (const [k] of entries) out[k] = uniform;
      return out;
    }
    const out: Distribution = {};
    for (const [k, v] of entries) out[k] = v / sum;
    return out;
  }

  private rawKl(P: Distribution, Q: Distribution): number {
    let kl = 0;
    for (const [key, pVal] of Object.entries(P)) {
      if (pVal <= EPSILON) continue;
      const qVal = Q[key] ?? 0;
      if (qVal <= EPSILON) return Number.POSITIVE_INFINITY;
      kl += pVal * Math.log2(pVal / qVal);
    }
    return kl;
  }

  private validateJoint(joint: MutualInfoJoint): void {
    if (!joint || typeof joint !== "object") throw new Error("joint must be an object");
    for (const [, row] of Object.entries(joint)) {
      if (!row || typeof row !== "object") throw new Error("each joint row must be an object");
      for (const [, v] of Object.entries(row)) {
        if (!Number.isFinite(v) || v < 0) throw new Error("joint values must be non-negative finite");
      }
    }
  }
}

function round6(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 1_000_000) / 1_000_000;
}

export const fisherInformationEngine = new FisherInformationEngine();
