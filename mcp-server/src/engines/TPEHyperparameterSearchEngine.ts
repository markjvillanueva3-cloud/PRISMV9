/**
 * TPEHyperparameterSearchEngine (U-LPR-HPSEARCH, ML B5)
 *
 * Tree-structured Parzen Estimator hyperparameter search as used by
 * Optuna. Distinct from the existing LatheLoRAHyperparameterOptimizerEngine
 * which uses grid / random / GP-BO — TPE uses a non-parametric ratio
 * of Parzen-window density estimators, which handles the LoRA search
 * space (mix of categorical `target_modules` with numeric rank / lr /
 * dropout) without the kernel engineering that Gaussian Processes need.
 *
 * Algorithm (Bergstra et al. 2011, NeurIPS):
 *
 *   1. Sort historical trials by loss, ascending.
 *   2. Let γ ∈ (0, 1) be the split quantile (default 0.25). Take top
 *      ⌈γ · n⌉ as the "good" set D_l, the rest as D_g.
 *   3. Fit a Parzen density l(x) = (1/|D_l|) · Σ_i K(x − x_i) to the
 *      good set, and g(x) similarly on the bad set. Kernel K is a
 *      truncated Gaussian for continuous params and a Laplace-smoothed
 *      histogram for categoricals.
 *   4. Sample n_candidates from l(x), score each by l(x)/g(x) — this
 *      is a proxy for Expected Improvement (EI(x) ∝ l(x)/g(x) under
 *      mild assumptions). Return the candidate with the highest ratio.
 *   5. Cold-start (n < 2·warmup) uses pure random sampling; TPE only
 *      activates after the warmup budget.
 *
 * 8-trial budget per plan: warmup=2, TPE=6. LoRA search space fixed:
 *   rank ∈ {8, 16, 32, 64}
 *   alpha ∈ {rank, 2·rank}              (conditional on rank)
 *   dropout ∈ [0.0, 0.2]                (continuous, log-uniform)
 *   lr ∈ [1e-5, 1e-3]                   (continuous, log-uniform)
 *   warmup_ratio ∈ [0.01, 0.10]         (continuous, linear)
 *   target_modules ∈ {"qkvo", "all-linear"}  (categorical)
 *
 * Pure engine, seeded PRNG for reproducibility. Storage is in-memory;
 * caller persists snapshot to JSON.
 *
 * Refs:
 *   - Bergstra, Bardenet, Bengio, Kégl (2011) "Algorithms for Hyper-
 *     Parameter Optimization", NeurIPS. TPE algorithm, §4.
 *   - Watanabe (2023) "Tree-Structured Parzen Estimator: Understanding
 *     Its Algorithm Components", arXiv:2304.11127. Pseudo-code reference.
 *   - Optuna docs (2025) — γ default, Parzen bandwidth heuristic.
 */

export type HPRank = 8 | 16 | 32 | 64;
export type HPTargetModules = "qkvo" | "all-linear";

export interface HPSample {
  rank: HPRank;
  alpha: number;             // either rank or 2·rank
  dropout: number;           // [0.0, 0.2]
  lr: number;                // [1e-5, 1e-3]
  warmup_ratio: number;      // [0.01, 0.10]
  target_modules: HPTargetModules;
}

export interface TrialRecord {
  trial_id: number;
  sample: HPSample;
  loss: number;                      // objective — lower is better
  elapsed_ms: number;
  completed_at: number;
  source: "warmup" | "tpe";
  note?: string;
}

export interface SearchConfig {
  total_budget: number;              // default 8
  warmup_trials: number;             // default 2
  gamma_split: number;               // default 0.25
  candidates_per_tpe_step: number;   // default 24
  seed: number;                      // PRNG seed
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  total_budget: 8,
  warmup_trials: 2,
  gamma_split: 0.25,
  candidates_per_tpe_step: 24,
  seed: 1337,
};

const RANKS: HPRank[] = [8, 16, 32, 64];
const TARGET_OPTIONS: HPTargetModules[] = ["qkvo", "all-linear"];
const DROPOUT_RANGE: [number, number] = [0.0, 0.2];
const LR_RANGE: [number, number] = [1e-5, 1e-3];
const WARMUP_RANGE: [number, number] = [0.01, 0.10];

export class TPEHyperparameterSearchEngine {
  private config: SearchConfig;
  private trials: TrialRecord[] = [];
  private prng: () => number;

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config };
    this.validateConfig(this.config);
    this.prng = mulberry32(this.config.seed);
  }

  /** Request next candidate. Returns null once budget exhausted. */
  suggest(): { trial_id: number; sample: HPSample; source: "warmup" | "tpe" } | null {
    if (this.trials.length >= this.config.total_budget) return null;
    const trial_id = this.trials.length;
    if (trial_id < this.config.warmup_trials) {
      return { trial_id, sample: this.randomSample(), source: "warmup" };
    }
    // TPE phase: fit densities and pick best EI proxy from candidates.
    const sorted = this.trials.slice().sort((a, b) => a.loss - b.loss);
    const n_good = Math.max(1, Math.ceil(this.config.gamma_split * sorted.length));
    const D_l = sorted.slice(0, n_good);
    const D_g = sorted.slice(n_good);
    // If one side is empty (edge case n=1 with γ=1), fall back to random.
    if (D_l.length === 0 || D_g.length === 0) {
      return { trial_id, sample: this.randomSample(), source: "tpe" };
    }
    let bestSample: HPSample | null = null;
    let bestRatio = -Infinity;
    for (let i = 0; i < this.config.candidates_per_tpe_step; i++) {
      // Sample from l(x): draw one exemplar from D_l and perturb around it
      const exemplar = D_l[Math.floor(this.prng() * D_l.length)].sample;
      const candidate = this.perturb(exemplar);
      const l = this.parzenLogDensity(candidate, D_l);
      const g = this.parzenLogDensity(candidate, D_g);
      const ratio = l - g; // log(l/g); higher → more promising
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestSample = candidate;
      }
    }
    return { trial_id, sample: bestSample ?? this.randomSample(), source: "tpe" };
  }

  /** Report completed trial. Rejects out-of-order IDs / duplicates. */
  tell(input: {
    trial_id: number;
    sample: HPSample;
    loss: number;
    elapsed_ms: number;
    completed_at: number;
    source: "warmup" | "tpe";
    note?: string;
  }): TrialRecord {
    if (!Number.isFinite(input.loss)) throw new Error("loss must be finite");
    if (input.elapsed_ms < 0) throw new Error("elapsed_ms must be ≥0");
    this.validateSample(input.sample);
    if (input.trial_id !== this.trials.length) {
      throw new Error(
        `expected trial_id=${this.trials.length}, got ${input.trial_id}`,
      );
    }
    const rec: TrialRecord = {
      trial_id: input.trial_id,
      sample: { ...input.sample },
      loss: input.loss,
      elapsed_ms: input.elapsed_ms,
      completed_at: input.completed_at,
      source: input.source,
      note: input.note?.trim() || undefined,
    };
    this.trials.push(rec);
    return { ...rec, sample: { ...rec.sample } };
  }

  bestTrial(): TrialRecord | null {
    if (this.trials.length === 0) return null;
    let best = this.trials[0];
    for (const t of this.trials) if (t.loss < best.loss) best = t;
    return { ...best, sample: { ...best.sample } };
  }

  listTrials(): TrialRecord[] {
    return this.trials.map((t) => ({ ...t, sample: { ...t.sample } }));
  }

  getConfig(): SearchConfig {
    return { ...this.config };
  }

  isExhausted(): boolean {
    return this.trials.length >= this.config.total_budget;
  }

  toSnapshot(): {
    schemaVersion: 1;
    config: SearchConfig;
    trials: TrialRecord[];
  } {
    return {
      schemaVersion: 1,
      config: this.getConfig(),
      trials: this.listTrials(),
    };
  }

  loadSnapshot(snap: {
    schemaVersion: number;
    config: SearchConfig;
    trials: TrialRecord[];
  }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.validateConfig(snap.config);
    for (const t of snap.trials) this.validateSample(t.sample);
    this.config = { ...snap.config };
    this.prng = mulberry32(this.config.seed);
    this.trials = snap.trials.map((t) => ({
      ...t,
      sample: { ...t.sample },
    }));
  }

  clearAll(): void {
    this.trials.length = 0;
    this.prng = mulberry32(this.config.seed);
  }

  // ────────────────────────────────────────────────────────────────────
  // Sampling primitives
  // ────────────────────────────────────────────────────────────────────

  randomSample(): HPSample {
    const rank = RANKS[Math.floor(this.prng() * RANKS.length)];
    const alpha = this.prng() < 0.5 ? rank : 2 * rank;
    const dropout = lerp(DROPOUT_RANGE[0], DROPOUT_RANGE[1], this.prng());
    const lr = logLerp(LR_RANGE[0], LR_RANGE[1], this.prng());
    const warmup_ratio = lerp(WARMUP_RANGE[0], WARMUP_RANGE[1], this.prng());
    const target_modules = TARGET_OPTIONS[Math.floor(this.prng() * 2)];
    return { rank, alpha, dropout, lr, warmup_ratio, target_modules };
  }

  /**
   * Perturb an exemplar — sample continuous params from truncated
   * Gaussian centred on exemplar value with σ = 0.25·range, and
   * resample categoricals with 30 % probability.
   */
  perturb(x: HPSample): HPSample {
    const rank =
      this.prng() < 0.7
        ? x.rank
        : RANKS[Math.floor(this.prng() * RANKS.length)];
    // alpha conditional on rank
    const alpha = this.prng() < 0.7 ? (x.rank === rank ? x.alpha : rank) : this.prng() < 0.5 ? rank : 2 * rank;
    const dropoutSigma = (DROPOUT_RANGE[1] - DROPOUT_RANGE[0]) * 0.25;
    const dropout = clamp(
      gaussian(this.prng, x.dropout, dropoutSigma),
      DROPOUT_RANGE[0],
      DROPOUT_RANGE[1],
    );
    // lr: perturb in log space
    const lrSigma = (Math.log(LR_RANGE[1]) - Math.log(LR_RANGE[0])) * 0.25;
    const lrLog = gaussian(this.prng, Math.log(x.lr), lrSigma);
    const lr = clamp(Math.exp(lrLog), LR_RANGE[0], LR_RANGE[1]);
    const warmupSigma = (WARMUP_RANGE[1] - WARMUP_RANGE[0]) * 0.25;
    const warmup_ratio = clamp(
      gaussian(this.prng, x.warmup_ratio, warmupSigma),
      WARMUP_RANGE[0],
      WARMUP_RANGE[1],
    );
    const target_modules =
      this.prng() < 0.7
        ? x.target_modules
        : TARGET_OPTIONS[Math.floor(this.prng() * 2)];
    return { rank, alpha, dropout, lr, warmup_ratio, target_modules };
  }

  /**
   * log Parzen density of x under trial set D (each trial is an
   * exemplar with σ-scaled kernel). Numerical note: we sum density in
   * log-space via log-sum-exp to avoid underflow at small bandwidths.
   */
  parzenLogDensity(x: HPSample, D: TrialRecord[]): number {
    if (D.length === 0) return -Infinity;
    const bandwidth = 0.25;
    const logs: number[] = [];
    for (const t of D) {
      const s = t.sample;
      // Continuous contributions in log space
      const dropoutZ = (x.dropout - s.dropout) / bandwidth;
      const lrZ = (Math.log(x.lr) - Math.log(s.lr)) / bandwidth;
      const warmupZ = (x.warmup_ratio - s.warmup_ratio) / bandwidth;
      // Gaussian kernel log density: -0.5·z² - log(σ·√(2π))
      let logK =
        -0.5 * (dropoutZ * dropoutZ + lrZ * lrZ + warmupZ * warmupZ) -
        3 * Math.log(bandwidth * Math.sqrt(2 * Math.PI));
      // Categorical contributions: Laplace-smoothed indicator
      logK += x.rank === s.rank ? Math.log(0.9) : Math.log(0.1);
      logK +=
        x.target_modules === s.target_modules
          ? Math.log(0.85)
          : Math.log(0.15);
      logs.push(logK);
    }
    // log-sum-exp then subtract log|D|
    const max = logs.reduce((a, b) => Math.max(a, b), -Infinity);
    let sum = 0;
    for (const l of logs) sum += Math.exp(l - max);
    return max + Math.log(sum) - Math.log(D.length);
  }

  // ────────────────────────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────────────────────────

  private validateSample(s: HPSample): void {
    if (!RANKS.includes(s.rank)) throw new Error(`rank must be one of ${RANKS}`);
    if (s.alpha !== s.rank && s.alpha !== 2 * s.rank) {
      throw new Error(`alpha must be rank or 2·rank`);
    }
    if (s.dropout < DROPOUT_RANGE[0] || s.dropout > DROPOUT_RANGE[1]) {
      throw new Error(`dropout out of range`);
    }
    if (s.lr < LR_RANGE[0] || s.lr > LR_RANGE[1]) {
      throw new Error(`lr out of range`);
    }
    if (s.warmup_ratio < WARMUP_RANGE[0] || s.warmup_ratio > WARMUP_RANGE[1]) {
      throw new Error(`warmup_ratio out of range`);
    }
    if (!TARGET_OPTIONS.includes(s.target_modules)) {
      throw new Error(`target_modules must be qkvo or all-linear`);
    }
  }

  private validateConfig(c: SearchConfig): void {
    if (c.total_budget < 2) throw new Error("total_budget must be ≥2");
    if (c.warmup_trials < 1) throw new Error("warmup_trials must be ≥1");
    if (c.warmup_trials >= c.total_budget) {
      throw new Error("warmup_trials must be < total_budget");
    }
    if (c.gamma_split <= 0 || c.gamma_split >= 1) {
      throw new Error("gamma_split must be in (0, 1)");
    }
    if (c.candidates_per_tpe_step < 1) {
      throw new Error("candidates_per_tpe_step must be ≥1");
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function logLerp(a: number, b: number, t: number): number {
  return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function gaussian(prng: () => number, mu: number, sigma: number): number {
  // Box-Muller
  const u1 = Math.max(1e-12, prng());
  const u2 = prng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + sigma * z;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const tpeHyperparameterSearchEngine = new TPEHyperparameterSearchEngine();
