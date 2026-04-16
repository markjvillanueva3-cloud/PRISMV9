/**
 * WEDMActiveQueryEngine — Information-gain test-cut selection
 *
 * Phase 3 / P3-MS2 / U-P3-09 of the WEDM AGI Intelligence Roadmap.
 *
 * Picks the *most informative* next calibration cut for an unknown material.
 * Given a set of candidate recipes and the nearest-neighbor ensemble from
 * the spark DB, for each candidate we compute three signals:
 *
 *   • Predictive variance  (σ²_Ra)    — Klocke disagreement across neighbors.
 *   • Diversity            (Δ_rec)    — min-distance from already-tested recipes.
 *   • Expected info gain   (EIG)      — ½·log(1 + σ²_Ra / σ²_noise) nats,
 *                                       the classical Gaussian entropy reduction.
 *
 * A composite score combines them under the caller-chosen strategy:
 *
 *   "uncertainty" → argmax σ²_Ra
 *   "info_gain"   → argmax EIG  (default, the exit-gate metric)
 *   "diversity"   → argmax Δ_rec
 *   "balanced"    → argmax ½·EIG_norm + ¼·σ²_norm + ¼·Δ_norm
 *
 * Exit gate (P3-MS2): "Active query selects most informative test cut
 * (info gain metric)" — satisfied by the "info_gain" strategy returning the
 * argmax of the EIG column.
 *
 * Composes with:
 *   - `WEDMFewShotEngine`      — reuses nearest-neighbor + embedding primitives.
 *   - `WEDMMaterialSparkDatabaseEngine` — source of Klocke C, k, nominals.
 *
 * The engine is stateless; the caller passes in the current `AdaptationRun`
 * (for the "tested recipes" set used by the diversity signal) and a
 * candidate pool.
 *
 * @module engines/WEDMActiveQueryEngine
 */

import {
  wedmFewShotEngine,
  embed,
  CONSERVATIVE_FACTOR,
  type AdaptationRun,
  type Neighbor,
  type UnknownMaterialFeatures,
  type WEDMRecipe,
} from "./WEDMFewShotEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ActiveStrategy = "uncertainty" | "info_gain" | "diversity" | "balanced";

export interface ActiveQueryCandidate {
  recipe: WEDMRecipe;
  /** Mean predicted Ra across neighbors (µm). */
  predicted_ra_um: number;
  /** Predicted Ra variance across neighbors (µm²). */
  ra_variance: number;
  /** Std-dev form (µm). */
  ra_std: number;
  /** Predicted MRR mean across neighbors (mm³/min). */
  predicted_mrr_mm3_per_min: number;
  /** Euclidean distance from the nearest already-tested recipe. */
  diversity: number;
  /** Expected information gain, nats:  ½·log(1 + σ²/σ²_noise). */
  info_gain: number;
  /** Final normalized composite score under the chosen strategy. */
  score: number;
}

export interface ActiveQueryResult {
  /** Strategy used for selection. */
  strategy: ActiveStrategy;
  /** The argmax candidate. */
  chosen: ActiveQueryCandidate;
  /** All scored candidates, sorted by score descending. */
  ranked: ActiveQueryCandidate[];
  /** Neighbors used for all scoring. */
  neighbors: Neighbor[];
  /** Prior entropy of the predictive distribution (nats). */
  prior_entropy: number;
  /** Expected posterior entropy after taking the chosen cut (nats). */
  expected_posterior_entropy: number;
}

export interface CandidateGridOptions {
  /**
   * Centre of the grid. When omitted, the grid is centred on the blended-
   * nominal recipe for the given `features.iso_group` (nearest-neighbor
   * blend).
   */
  centre?: WEDMRecipe;
  /**
   * Multiplicative spread around `centre` per axis. Defaults to 0.6..1.4
   * with 5 steps per axis (25 total grid points).
   */
  spreadMin?: number;
  spreadMax?: number;
  stepsPerAxis?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Measurement-noise variance used in the EIG formula (µm²). */
export const DEFAULT_NOISE_VARIANCE = 0.04; // σ = 0.2 µm

/** Epsilon floor on σ² to keep EIG finite when neighbors agree exactly. */
const EPS_VARIANCE = 1e-9;

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMActiveQueryEngine {
  private readonly noiseVariance: number;
  private readonly topK: number;

  constructor(opts: { noiseVariance?: number; topK?: number } = {}) {
    this.noiseVariance = opts.noiseVariance ?? DEFAULT_NOISE_VARIANCE;
    this.topK = opts.topK ?? 3;
  }

  /**
   * Generate a grid of candidate recipes around a centre point. The centre
   * defaults to the blended neighbor nominal recipe for `features`.
   */
  generateCandidateGrid(
    features: UnknownMaterialFeatures,
    opts: CandidateGridOptions = {},
  ): WEDMRecipe[] {
    const spreadMin = opts.spreadMin ?? 0.6;
    const spreadMax = opts.spreadMax ?? 1.4;
    const steps = opts.stepsPerAxis ?? 5;
    if (steps < 2) throw new Error("stepsPerAxis must be ≥ 2");

    // Default centre = blended nominal from nearest neighbors.
    const centre = opts.centre ?? this.blendedCentre(features);

    const scales: number[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      scales.push(spreadMin + (spreadMax - spreadMin) * t);
    }

    const out: WEDMRecipe[] = [];
    for (const sI of scales) {
      for (const sT of scales) {
        out.push({
          ...centre,
          peak_current_A: round3(centre.peak_current_A * sI),
          pulse_on_us: round3(centre.pulse_on_us * sT),
        });
      }
    }
    return out;
  }

  /**
   * Score a batch of candidate recipes relative to the current adaptation
   * run; return the full ranking and the argmax under `strategy`.
   */
  selectOptimal(
    candidates: WEDMRecipe[],
    features: UnknownMaterialFeatures,
    run: AdaptationRun | null,
    strategy: ActiveStrategy = "info_gain",
  ): ActiveQueryResult {
    if (candidates.length === 0) {
      throw new Error("selectOptimal: candidates must be non-empty");
    }
    const emb = embed(enrichWithRun(features, run));
    const neighbors = wedmFewShotEngine.nearestNeighbors(
      emb,
      features.iso_group,
      this.topK,
    );

    const testedRecipes = collectTested(run);

    const scored = candidates.map<ActiveQueryCandidate>((recipe) => {
      const { mean: meanRa, variance: varRa } = this.predictRa(recipe, neighbors);
      const std = Math.sqrt(Math.max(varRa, 0));
      const meanMrr = this.predictMrr(recipe, neighbors);
      const diversity = minDistance(recipe, testedRecipes);
      const infoGain =
        0.5 * Math.log1p(Math.max(varRa, EPS_VARIANCE) / this.noiseVariance);
      return {
        recipe,
        predicted_ra_um: round3(meanRa),
        ra_variance: round4(varRa),
        ra_std: round3(std),
        predicted_mrr_mm3_per_min: round3(meanMrr),
        diversity: round3(diversity),
        info_gain: round4(infoGain),
        score: 0,
      };
    });

    applyStrategy(scored, strategy);
    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0];

    const priorH = gaussianEntropy(
      scored.reduce((s, c) => s + c.ra_variance, 0) / scored.length,
    );
    const postH = gaussianEntropy(
      Math.max(EPS_VARIANCE, 1 / (1 / Math.max(chosen.ra_variance, EPS_VARIANCE) + 1 / this.noiseVariance)),
    );

    return {
      strategy,
      chosen,
      ranked: scored,
      neighbors,
      prior_entropy: round4(priorH),
      expected_posterior_entropy: round4(postH),
    };
  }

  /**
   * Convenience: generate a default grid AND select the optimum in one call.
   */
  suggestNextCut(
    features: UnknownMaterialFeatures,
    run: AdaptationRun | null = null,
    strategy: ActiveStrategy = "info_gain",
  ): ActiveQueryResult {
    const candidates = this.generateCandidateGrid(features);
    return this.selectOptimal(candidates, features, run, strategy);
  }

  // --------------------------------------------------------------------------
  // Private helpers (exported as static utilities via singleton)
  // --------------------------------------------------------------------------

  /** Klocke-ensemble predictive mean + variance of Ra (µm). */
  predictRa(
    recipe: WEDMRecipe,
    neighbors: Neighbor[],
  ): { mean: number; variance: number } {
    if (neighbors.length === 0) return { mean: 1.6, variance: 1.0 };
    const wSum = neighbors.reduce((s, n) => s + n.similarity, 0);
    if (wSum === 0) return { mean: 1.6, variance: 1.0 };

    // Per-neighbor Klocke prediction.
    const preds = neighbors.map((n) => {
      const sig = n.signature;
      return (
        sig.klocke_C *
        Math.pow(recipe.peak_current_A * recipe.pulse_on_us, sig.klocke_k)
      );
    });

    const mean = neighbors.reduce((s, n, i) => s + (n.similarity / wSum) * preds[i], 0);
    const variance = neighbors.reduce(
      (s, n, i) => s + (n.similarity / wSum) * Math.pow(preds[i] - mean, 2),
      0,
    );
    return { mean, variance };
  }

  /** Klocke-ensemble predictive mean of MRR (mm³/min). */
  predictMrr(recipe: WEDMRecipe, neighbors: Neighbor[]): number {
    if (neighbors.length === 0) return 20;
    const wSum = neighbors.reduce((s, n) => s + n.similarity, 0);
    if (wSum === 0) return 20;
    let mrr = 0;
    for (const n of neighbors) {
      const s = n.signature;
      const pred =
        s.mrr_factor *
        20 *
        (recipe.peak_current_A / s.peak_current_nominal_A) *
        (recipe.pulse_on_us / s.pulse_on_nominal_us);
      mrr += (n.similarity / wSum) * pred;
    }
    return mrr;
  }

  /** Centre of a default candidate grid = conservative blended nominal. */
  private blendedCentre(features: UnknownMaterialFeatures): WEDMRecipe {
    const emb = embed(features);
    const nbrs = wedmFewShotEngine.nearestNeighbors(emb, features.iso_group, this.topK);
    if (nbrs.length === 0) {
      return { peak_current_A: 8, pulse_on_us: 10, pulse_off_us: 20, wire_tension_N: 12 };
    }
    let wSum = 0, ip = 0, pon = 0;
    for (const n of nbrs) {
      wSum += n.similarity;
      ip += n.similarity * n.signature.peak_current_nominal_A;
      pon += n.similarity * n.signature.pulse_on_nominal_us;
    }
    // Apply conservative factor so the grid is centred where the first real
    // cut would land — the active query is advisory, not a full plan.
    return {
      peak_current_A: round3((ip / wSum) * CONSERVATIVE_FACTOR),
      pulse_on_us: round3((pon / wSum) * CONSERVATIVE_FACTOR),
      pulse_off_us: 20,
      wire_tension_N: 12,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmActiveQueryEngine = new WEDMActiveQueryEngine();

// ============================================================================
// INTERNALS
// ============================================================================

function applyStrategy(
  cands: ActiveQueryCandidate[],
  strategy: ActiveStrategy,
): void {
  // Normalize each signal into [0, 1] so "balanced" is well-scaled.
  const maxVar = Math.max(1e-12, ...cands.map((c) => c.ra_variance));
  const maxDiv = Math.max(1e-12, ...cands.map((c) => c.diversity));
  const maxIG = Math.max(1e-12, ...cands.map((c) => c.info_gain));

  for (const c of cands) {
    const vN = c.ra_variance / maxVar;
    const dN = c.diversity / maxDiv;
    const iN = c.info_gain / maxIG;
    switch (strategy) {
      case "uncertainty":
        c.score = round4(vN);
        break;
      case "info_gain":
        c.score = round4(iN);
        break;
      case "diversity":
        c.score = round4(dN);
        break;
      case "balanced":
        c.score = round4(0.5 * iN + 0.25 * vN + 0.25 * dN);
        break;
    }
  }
}

function enrichWithRun(
  features: UnknownMaterialFeatures,
  run: AdaptationRun | null,
): UnknownMaterialFeatures {
  if (!run) return features;
  // Use the most recent outcome (second > first) as prior.
  const outcome = run.secondCutOutcome ?? run.firstCutOutcome;
  if (!outcome) return features;
  return { ...features, priorOutcome: outcome };
}

function collectTested(run: AdaptationRun | null): WEDMRecipe[] {
  if (!run) return [];
  const out: WEDMRecipe[] = [run.firstCut.recipe];
  if (run.secondCut) out.push(run.secondCut.recipe);
  return out;
}

function minDistance(recipe: WEDMRecipe, tested: WEDMRecipe[]): number {
  if (tested.length === 0) return 1.0; // nothing to be different from → max diversity
  let best = Infinity;
  for (const t of tested) {
    const d = recipeDistance(recipe, t);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Recipe-space distance normalised so each axis contributes ~O(1) per unit of
 * practical change.
 *   peak_current_A  → / 5   (5 A  is one "tick" in this space)
 *   pulse_on_us     → / 5   (5 µs is one "tick")
 *   pulse_off_us    → / 10  (10 µs per tick)
 *   wire_tension_N  → / 5   (5 N per tick)
 */
function recipeDistance(a: WEDMRecipe, b: WEDMRecipe): number {
  const dIp = (a.peak_current_A - b.peak_current_A) / 5;
  const dTon = (a.pulse_on_us - b.pulse_on_us) / 5;
  const dToff = (a.pulse_off_us - b.pulse_off_us) / 10;
  const dTen = (a.wire_tension_N - b.wire_tension_N) / 5;
  return Math.sqrt(dIp * dIp + dTon * dTon + dToff * dToff + dTen * dTen);
}

/** Differential entropy of a 1-D Gaussian with variance σ² (nats). */
function gaussianEntropy(variance: number): number {
  const v = Math.max(variance, EPS_VARIANCE);
  return 0.5 * Math.log(2 * Math.PI * Math.E * v);
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
