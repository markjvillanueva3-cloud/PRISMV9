/**
 * RegretMinimizationEngine — Multi-armed bandit with UCB and Thompson sampling
 *
 * Phase 0.20 U-MATH16 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Minimises
 * cumulative regret when choosing among strategies with unknown reward
 * distributions. Implements two canonical algorithms:
 *
 *   UCB1 (Auer et al., 2002): pick arm maximizing mean + sqrt(2 ln t / n_i).
 *   Thompson sampling (Beta-Bernoulli conjugate): sample θ_i ~ Beta(α_i, β_i).
 *
 * Rewards are assumed in [0, 1]; callers scale if needed. Thompson sampling
 * uses a deterministic seed (provided PRNG) so tests can pin behaviour.
 *
 * @module engines/RegretMinimizationEngine
 * @milestone PP-0.20-U-MATH16
 */

export interface ArmStats {
  id: string;
  pulls: number;
  totalReward: number;
  mean: number;
}

export interface SelectionTrace {
  arm: string;
  reason: string;
  scores: Record<string, number>;
}

export type Rng = () => number;

function defaultRng(): Rng {
  return () => Math.random();
}

/** Seeded PRNG (mulberry32) for deterministic tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RegretMinimizationEngine {
  private readonly arms = new Map<string, ArmStats>();
  private totalPulls = 0;

  addArm(id: string): ArmStats {
    if (!id || id.trim() === "") throw new Error("id required");
    if (this.arms.has(id)) return this.arms.get(id)!;
    const stats: ArmStats = { id, pulls: 0, totalReward: 0, mean: 0 };
    this.arms.set(id, stats);
    return stats;
  }

  addArms(ids: readonly string[]): void {
    for (const id of ids) this.addArm(id);
  }

  record(arm: string, reward: number): ArmStats {
    const stats = this.arms.get(arm);
    if (!stats) throw new Error(`unknown arm: ${arm}`);
    if (!(reward >= 0 && reward <= 1)) throw new Error("reward must be in [0,1]");
    stats.pulls += 1;
    stats.totalReward += reward;
    stats.mean = stats.totalReward / stats.pulls;
    this.totalPulls += 1;
    return stats;
  }

  selectUcb(c = Math.SQRT2): SelectionTrace {
    if (this.arms.size === 0) throw new Error("no arms registered");
    const scores: Record<string, number> = {};
    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const a of this.arms.values()) {
      const score =
        a.pulls === 0
          ? Number.POSITIVE_INFINITY
          : a.mean + c * Math.sqrt(Math.log(Math.max(1, this.totalPulls)) / a.pulls);
      scores[a.id] = Number.isFinite(score) ? round4(score) : score;
      if (score > bestScore) {
        bestScore = score;
        bestId = a.id;
      }
    }
    return {
      arm: bestId!,
      reason: `UCB1 (c=${c.toFixed(4)})`,
      scores,
    };
  }

  /**
   * Thompson sampling with Beta(α, β) priors. Seeds α=β=1 by default.
   */
  selectThompson(rng: Rng = defaultRng()): SelectionTrace {
    if (this.arms.size === 0) throw new Error("no arms registered");
    const scores: Record<string, number> = {};
    let bestId: string | null = null;
    let best = -Infinity;

    for (const a of this.arms.values()) {
      const alpha = 1 + a.totalReward;
      const beta = 1 + (a.pulls - a.totalReward);
      const theta = sampleBeta(alpha, beta, rng);
      scores[a.id] = round4(theta);
      if (theta > best) {
        best = theta;
        bestId = a.id;
      }
    }
    return { arm: bestId!, reason: "Thompson Beta-Bernoulli", scores };
  }

  stats(): ArmStats[] {
    return [...this.arms.values()].map((a) => ({ ...a, mean: round4(a.mean) }));
  }

  totalPullsCount(): number {
    return this.totalPulls;
  }

  clear(): void {
    this.arms.clear();
    this.totalPulls = 0;
  }
}

/** Beta sample via two Gamma draws: X=Gamma(α), Y=Gamma(β), returns X/(X+Y). */
function sampleBeta(alpha: number, beta: number, rng: Rng): number {
  const x = sampleGamma(alpha, rng);
  const y = sampleGamma(beta, rng);
  const denom = x + y;
  return denom === 0 ? 0.5 : x / denom;
}

/**
 * Marsaglia–Tsang Gamma sampler for α ≥ 1. For α < 1 we use the boost:
 * Gamma(α) = Gamma(α+1) · U^(1/α).
 */
function sampleGamma(shape: number, rng: Rng): number {
  if (shape < 1) {
    const boosted = sampleGamma(shape + 1, rng);
    return boosted * Math.pow(rng() || 1e-12, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number;
    let v: number;
    do {
      x = standardNormal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * Math.pow(x, 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function standardNormal(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const regretMinimizationEngine = new RegretMinimizationEngine();
