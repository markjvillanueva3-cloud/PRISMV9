/**
 * AdaptiveShopRateEngine — Self-learning shop-rate optimizer.
 *
 * Closes the actual-vs-predicted loop the static `ShopRates` input in
 * `JobCostingEngine` and `QuoteEstimatorEngine` ignores. Every completed job
 * gets a `JobEconomicsOutcome` recorded; the engine then runs a conjugate
 * Gaussian Bayesian update of the shop-rate prior using each observation.
 *
 * Math (conjugate Gaussian update of unknown mean with known observation variance):
 *
 *   prior:        μ_prior, σ²_prior
 *   observation:  x_obs (= actual_cost / actual_hours), σ²_obs
 *
 *   posterior_precision = 1/σ²_prior + 1/σ²_obs
 *   posterior_mean = (μ_prior/σ²_prior + x_obs/σ²_obs) / posterior_precision
 *   posterior_var  = 1 / posterior_precision
 *
 * Multi-observation update: sequentially apply per-observation update, OR
 * use the closed-form n-observation update:
 *
 *   posterior_precision_n = 1/σ²_prior + n/σ²_obs
 *   posterior_mean_n      = (μ_prior/σ²_prior + Σx_i/σ²_obs) / posterior_precision_n
 *
 * Per-machine priors live in `priors` keyed by `machineId`. Default prior on
 * a new machine: μ_prior = MachineRateDatabase typical, σ_prior = 0.25 × μ_prior
 * (25% uncertainty before observations land).
 *
 * Hotel-soul invariants:
 *   - Cents-resolution on every $-value return.
 *   - R12 fail-loud: NaN / Infinity / negative inputs throw.
 *   - Defensive copy on every return (Object.frozen).
 *   - PII-free: ledger stores only job_id, machine_id, $ amounts.
 *   - Never overwrites prior silently — every update records observation
 *     count + last-update-at + ledger ids contributing.
 *
 * References:
 *   - Gelman et al. "Bayesian Data Analysis" 3e §2.5 (conjugate Gaussian prior)
 *   - Murphy "Probabilistic Machine Learning" §3.6.2 (sequential Bayesian update)
 *
 * @module AdaptiveShopRateEngine
 * @milestone HOTEL/U-ADAPTIVE-SHOP-RATE (2026-05-25, slot:hotel iter3)
 */
import { machineRateDatabaseEngine } from "./MachineRateDatabaseEngine.js";
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ─── Persistence (U-QP-ADAPTIVE-PERSIST) ──────────────────────
/** Schema version for the persisted posterior/outcome state. */
const ADAPTIVE_STATE_SCHEMA_VERSION = "1.0.0";
/** Default on-disk state so learned posteriors survive a restart. */
const DEFAULT_ADAPTIVE_STATE_PATH = resolve(process.cwd(), "state/shared/quoting/adaptive-shop-rate-state.json");

// ─── Constants ────────────────────────────────────────────────
/** Initial prior uncertainty as fraction of mean (25%). */
const INITIAL_PRIOR_SIGMA_FRACTION = 0.25;
/** Default observation noise floor — assumed σ_obs as fraction of x_obs (15%). */
const DEFAULT_OBSERVATION_SIGMA_FRACTION = 0.15;
/** Minimum σ floor to prevent precision-explosion on near-zero variance. */
const MIN_SIGMA = 0.5;
/** Minimum actual_hours to avoid divide-by-zero in cost/hour observation. */
const MIN_ACTUAL_HOURS = 0.01;

// ─── Types ────────────────────────────────────────────────────

export interface JobEconomicsOutcome {
  /** Job / part identifier. */
  job_id: string;
  /** Machine used (matches MachineRateDatabase id). */
  machine_id: string;
  /** ISO timestamp this outcome landed. */
  recorded_at: string;
  /** Predicted total cost at quote time. */
  predicted_cost: number;
  /** Realized total cost. */
  actual_cost: number;
  /** Predicted productive hours. */
  predicted_hours: number;
  /** Realized productive hours. */
  actual_hours: number;
  /** Quoted revenue (top-line). */
  quoted_revenue: number;
  /** Realized revenue (after any change orders / credits). */
  actual_revenue: number;
}

export interface ShopRatePrior {
  machine_id: string;
  /** Posterior mean — current best estimate of $/productive-hour. */
  mu: number;
  /** Posterior std dev — uncertainty around the mean. */
  sigma: number;
  /** Number of observations folded in. */
  n_observations: number;
  /** ISO timestamp of last update. */
  last_updated: string | null;
  /** Outcome IDs that contributed to this prior. */
  contributing_outcomes: ReadonlyArray<string>;
}

export interface AdaptiveUpdateResult {
  machine_id: string;
  prior_before: { mu: number; sigma: number; n: number };
  prior_after: { mu: number; sigma: number; n: number };
  delta_mu: number;
  delta_mu_pct: number;
  observations_applied: number;
  /** Posterior credible interval (95%). */
  credible_interval_95: { lower: number; upper: number };
  currency: "USD";
  source: "AdaptiveShopRateEngine.v1";
}

export interface MarginAnalysis {
  machine_id: string;
  n_jobs: number;
  predicted_margin_avg: number;
  actual_margin_avg: number;
  margin_drift_pct: number;
  bias_dollars: number;
  signal: "calibrated" | "under_quoting" | "over_quoting";
  currency: "USD";
}

// ─── Engine ───────────────────────────────────────────────────

class AdaptiveShopRateEngine {
  private outcomes: Map<string, JobEconomicsOutcome[]> = new Map();
  private priors: Map<string, ShopRatePrior> = new Map();
  // Persistence (U-QP-ADAPTIVE-PERSIST): learned posteriors + outcome ledger
  // survive a restart. Lazy-loaded on first access; auto-persisted on mutation.
  private statePath: string = DEFAULT_ADAPTIVE_STATE_PATH;
  private loaded = false;

  /** Override the on-disk state path (tests + multi-shop). Resets load state. */
  configureStatePath(path: string): void {
    this.statePath = path;
    this.loaded = false;
    this.outcomes.clear();
    this.priors.clear();
  }

  /**
   * Lazy-load persisted state once. Fail-soft: a missing/corrupt/schema-mismatched
   * file starts fresh (never throws at read; a restart must not break quoting).
   */
  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true; // set first: re-entrancy + repeated-miss guard
    try {
      if (!existsSync(this.statePath)) return;
      const raw = JSON.parse(readFileSync(this.statePath, "utf-8"));
      if (raw?.schemaVersion !== ADAPTIVE_STATE_SCHEMA_VERSION) return; // N-1: start fresh
      for (const [k, v] of Object.entries(raw.outcomes ?? {})) {
        if (Array.isArray(v)) this.outcomes.set(k, v.map(o => Object.freeze({ ...(o as JobEconomicsOutcome) })));
      }
      for (const [k, v] of Object.entries(raw.priors ?? {})) {
        const p = v as ShopRatePrior;
        this.priors.set(k, Object.freeze({ ...p, contributing_outcomes: Object.freeze([...(p.contributing_outcomes ?? [])]) }));
      }
    } catch {
      // Corrupt/unreadable -> start fresh. State is rebuilt as new outcomes land.
    }
  }

  /**
   * Persist current posteriors + outcome ledger atomically (tmp + rename).
   * Fail-soft: a write failure must not break recordOutcome/adaptShopRate.
   */
  persist(path?: string): void {
    const target = path ?? this.statePath;
    const payload = {
      schemaVersion: ADAPTIVE_STATE_SCHEMA_VERSION,
      persisted_at: new Date().toISOString(),
      outcomes: Object.fromEntries(this.outcomes),
      priors: Object.fromEntries(this.priors),
    };
    const tmp = `${target}.tmp-${process.pid}`;
    try {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(tmp, JSON.stringify(payload), "utf-8");
      renameSync(tmp, target);
    } catch (err) {
      // R12: surface, but never throw out of a mutation path.
      console.error(`AdaptiveShopRateEngine.persist failed: ${err instanceof Error ? err.message : String(err)}`);
      // Best-effort: clean the tmp orphan if the rename failed mid-write.
      try { rmSync(tmp, { force: true }); } catch { /* nothing more to do */ }
    }
  }

  /**
   * Record a single job-economics outcome (predicted vs actual). Stored in
   * the per-machine ledger and used by the next call to `adaptShopRate`.
   *
   * @throws Error on NaN/negative/zero-hour observations (R12 fail-loud)
   */
  recordOutcome(outcome: JobEconomicsOutcome): JobEconomicsOutcome {
    this.ensureLoaded();
    this.validateOutcome(outcome);
    const frozen = Object.freeze({ ...outcome });
    const list = this.outcomes.get(outcome.machine_id) ?? [];
    list.push(frozen);
    this.outcomes.set(outcome.machine_id, list);
    this.persist();
    return frozen;
  }

  /**
   * List outcomes for a machine (defensive copy).
   */
  listOutcomes(machineId: string): ReadonlyArray<JobEconomicsOutcome> {
    this.ensureLoaded();
    return Object.freeze([...(this.outcomes.get(machineId) ?? [])]);
  }

  /**
   * Get current posterior for a machine. Returns null if no prior + no
   * MachineRateDatabase fallback exists.
   */
  getPrior(machineId: string): ShopRatePrior | null {
    this.ensureLoaded();
    const existing = this.priors.get(machineId);
    if (existing) return Object.freeze({ ...existing, contributing_outcomes: [...existing.contributing_outcomes] });
    // Bootstrap prior from MachineRateDatabase if available.
    const machine = machineRateDatabaseEngine.getMachine(machineId);
    if (!machine) return null;
    return Object.freeze({
      machine_id: machineId,
      mu: machine.hourlyRate.typical,
      sigma: Math.max(MIN_SIGMA, machine.hourlyRate.typical * INITIAL_PRIOR_SIGMA_FRACTION),
      n_observations: 0,
      last_updated: null,
      contributing_outcomes: Object.freeze([]),
    });
  }

  /**
   * Apply all recorded outcomes for a machine to update its shop-rate prior
   * via closed-form n-observation Gaussian update.
   *
   * @param machineId machine to adapt
   * @param obsSigmaFraction observation noise as fraction of x_obs (default 0.15)
   * @returns full update breakdown with credible-interval
   * @throws Error if no machine + no outcomes (R12 fail-loud)
   */
  adaptShopRate(machineId: string, obsSigmaFraction = DEFAULT_OBSERVATION_SIGMA_FRACTION): AdaptiveUpdateResult {
    this.ensureLoaded();
    if (!machineId || typeof machineId !== "string") {
      throw new Error("AdaptiveShopRateEngine: machineId required");
    }
    if (!Number.isFinite(obsSigmaFraction) || obsSigmaFraction <= 0 || obsSigmaFraction >= 1) {
      throw new Error(
        `AdaptiveShopRateEngine: obsSigmaFraction must be in (0,1), got ${obsSigmaFraction}`,
      );
    }
    const prior = this.getPrior(machineId);
    if (!prior) {
      throw new Error(
        `AdaptiveShopRateEngine: no prior for "${machineId}" (not in MachineRateDatabase and no outcomes recorded)`,
      );
    }
    const outcomes = this.outcomes.get(machineId) ?? [];
    if (outcomes.length === 0) {
      // No-op update — return prior unchanged.
      return Object.freeze({
        machine_id: machineId,
        prior_before: { mu: this.round2(prior.mu), sigma: this.round2(prior.sigma), n: prior.n_observations },
        prior_after: { mu: this.round2(prior.mu), sigma: this.round2(prior.sigma), n: prior.n_observations },
        delta_mu: 0,
        delta_mu_pct: 0,
        observations_applied: 0,
        credible_interval_95: this.ci95(prior.mu, prior.sigma),
        currency: "USD" as const,
        source: "AdaptiveShopRateEngine.v1" as const,
      });
    }

    // Compute observations: x_obs_i = actual_cost / actual_hours
    let sumX = 0;
    let n = 0;
    const obsIds: string[] = [];
    for (const o of outcomes) {
      const x = o.actual_cost / Math.max(MIN_ACTUAL_HOURS, o.actual_hours);
      if (!Number.isFinite(x) || x < 0) continue;
      sumX += x;
      n++;
      obsIds.push(o.job_id);
    }
    if (n === 0) {
      throw new Error(`AdaptiveShopRateEngine: no usable observations for "${machineId}"`);
    }

    const muPrior = prior.mu;
    const sigPrior = Math.max(MIN_SIGMA, prior.sigma);
    const sigObs = Math.max(MIN_SIGMA, sigPrior * obsSigmaFraction === 0 ? MIN_SIGMA : (muPrior * obsSigmaFraction));
    const varPrior = sigPrior * sigPrior;
    const varObs = sigObs * sigObs;

    // Closed-form n-observation Gaussian conjugate update.
    const posteriorPrecision = 1 / varPrior + n / varObs;
    const posteriorMean = (muPrior / varPrior + sumX / varObs) / posteriorPrecision;
    const posteriorVar = 1 / posteriorPrecision;
    const posteriorSigma = Math.sqrt(posteriorVar);

    const updated: ShopRatePrior = {
      machine_id: machineId,
      mu: posteriorMean,
      sigma: posteriorSigma,
      n_observations: prior.n_observations + n,
      last_updated: new Date().toISOString(),
      contributing_outcomes: Object.freeze([...prior.contributing_outcomes, ...obsIds]),
    };
    this.priors.set(machineId, updated);
    this.persist();

    return Object.freeze({
      machine_id: machineId,
      prior_before: {
        mu: this.round2(muPrior),
        sigma: this.round2(sigPrior),
        n: prior.n_observations,
      },
      prior_after: {
        mu: this.round2(posteriorMean),
        sigma: this.round2(posteriorSigma),
        n: updated.n_observations,
      },
      delta_mu: this.round2(posteriorMean - muPrior),
      delta_mu_pct: this.round2(((posteriorMean - muPrior) / muPrior) * 100),
      observations_applied: n,
      credible_interval_95: this.ci95(posteriorMean, posteriorSigma),
      currency: "USD" as const,
      source: "AdaptiveShopRateEngine.v1" as const,
    });
  }

  /**
   * Margin-drift analysis — compares quoted-margin vs actual-margin across
   * outcomes; signals whether the shop is under-quoting (margin lower than
   * predicted) or over-quoting (margin higher than predicted).
   */
  analyzeMargin(machineId: string): MarginAnalysis {
    this.ensureLoaded();
    const outcomes = this.outcomes.get(machineId) ?? [];
    if (outcomes.length === 0) {
      throw new Error(`AdaptiveShopRateEngine.analyzeMargin: no outcomes for "${machineId}"`);
    }
    let predictedMarginSum = 0;
    let actualMarginSum = 0;
    let biasSum = 0;
    for (const o of outcomes) {
      const predM = o.quoted_revenue > 0 ? (o.quoted_revenue - o.predicted_cost) / o.quoted_revenue : 0;
      const actM = o.actual_revenue > 0 ? (o.actual_revenue - o.actual_cost) / o.actual_revenue : 0;
      predictedMarginSum += predM;
      actualMarginSum += actM;
      biasSum += o.actual_cost - o.predicted_cost;
    }
    const n = outcomes.length;
    const predAvg = predictedMarginSum / n;
    const actAvg = actualMarginSum / n;
    const drift = ((actAvg - predAvg) / Math.max(0.001, Math.abs(predAvg))) * 100;
    const bias = biasSum / n;
    let signal: MarginAnalysis["signal"] = "calibrated";
    if (actAvg < predAvg - 0.05) signal = "under_quoting"; // actual margin >5pp below predicted
    else if (actAvg > predAvg + 0.05) signal = "over_quoting";
    return Object.freeze({
      machine_id: machineId,
      n_jobs: n,
      predicted_margin_avg: this.round4(predAvg),
      actual_margin_avg: this.round4(actAvg),
      margin_drift_pct: this.round2(drift),
      bias_dollars: this.round2(bias),
      signal,
      currency: "USD" as const,
    });
  }

  /**
   * Reset state — for tests + clean re-runs only.
   */
  reset(): void {
    this.outcomes.clear();
    this.priors.clear();
    this.loaded = true; // empty in-memory state; do NOT reload from disk after a reset
  }

  // ─── Internals ──────────────────────────────────────────────

  private validateOutcome(o: JobEconomicsOutcome): void {
    if (!o || typeof o !== "object") {
      throw new Error("AdaptiveShopRateEngine: outcome is required");
    }
    if (!o.job_id || !o.machine_id) {
      throw new Error("AdaptiveShopRateEngine: job_id + machine_id required");
    }
    const numFields = ["predicted_cost", "actual_cost", "predicted_hours", "actual_hours", "quoted_revenue", "actual_revenue"] as const;
    for (const f of numFields) {
      const v = o[f];
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(`AdaptiveShopRateEngine: outcome.${f} must be a non-negative finite number, got ${v}`);
      }
    }
    if (o.actual_hours <= 0) {
      throw new Error("AdaptiveShopRateEngine: actual_hours must be > 0");
    }
  }

  private ci95(mu: number, sigma: number): { lower: number; upper: number } {
    return {
      lower: this.round2(mu - 1.96 * sigma),
      upper: this.round2(mu + 1.96 * sigma),
    };
  }

  private round2(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }

  private round4(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 10000) / 10000;
  }
}

export const adaptiveShopRateEngine = new AdaptiveShopRateEngine();
