/**
 * PRISM MCP Server -- TDA Condition Monitor Engine
 *
 * Topological Data Analysis (TDA) condition monitor for vibration / cutting-force
 * signals. Detects chatter onset and tool-wear regime change from the *shape* of
 * the reconstructed dynamics rather than a spectral magnitude threshold, giving
 * robustness to broadband noise that defeats naive FFT-peak thresholds.
 *
 * Pipeline:
 *   1. Takens time-delay embedding of a 1-D series x[t] into R^d:
 *        p_t = ( x[t], x[t+tau], ..., x[t+(d-1)*tau] )                     (Takens 1981)
 *      A periodic (limit-cycle) signal embeds to a topological circle; broadband
 *      noise embeds to a space-filling blob; a constant embeds to a single point.
 *   2. Deterministic even-stride subsample (no RNG) to keep the Vietoris-Rips
 *      complex tractable.
 *   3. Self-contained Vietoris-Rips filtration + standard mod-2 persistence
 *      (matrix reduction with the low-inverse pivot optimization) over dims 0/1/2,
 *      yielding the H0 (component) and H1 (loop) persistence diagram.
 *   4. Monitor: the most-persistent H1 bar is the dominant limit cycle. Its
 *      lifetime (normalized by the point-cloud diameter, so it is scale-free)
 *      is the health metric:
 *        - one strong, well-separated loop  -> stable regular cut (limit cycle)
 *        - >= 2 significant loops            -> period-doubling / chatter onset
 *        - no loop above the noise floor     -> no organized periodicity
 *
 * SELF-CONTAINED: this engine deliberately carries its own minimal Vietoris-Rips
 * / persistence so parallel builds do not race on TopologyEngine (which operates
 * on 3-D CAD point clouds, not delay-embedded time series). No shared mutable
 * state; all methods are pure and deterministic.
 *
 * Numeric epsilon is imported from the canonical physics constants module (never
 * inlined). The remaining thresholds are *algorithmic* TDA parameters (analogous
 * to TopologyEngine.CONFIG.MIN_PERSISTENCE), documented at their definition.
 *
 * References:
 *   - F. Takens, "Detecting strange attractors in turbulence", 1981.
 *   - Edelsbrunner & Harer, "Computational Topology: An Introduction", 2010.
 *   - Khasawneh & Munch, "Chatter detection in turning using persistent
 *     homology", Mech. Syst. Signal Process. 70-71 (2016) 527-541.
 *
 * @module TDAConditionMonitorEngine
 */

import { EPS_MACHINE } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

/** Result of a Takens time-delay embedding. */
export interface EmbeddingResult {
  /** Embedded points, each a length-`dimension` coordinate vector. */
  points: number[][];
  /** Embedding dimension d (>= 2). */
  dimension: number;
  /** Time delay tau in samples (>= 1). */
  delay: number;
  /** Length of the source series. */
  sourceLength: number;
  /** Number of embedded points = sourceLength - (dimension-1)*delay. */
  pointCount: number;
}

/** A single H1 (loop) persistence bar. */
export interface LoopFeature {
  /** Filtration scale (Rips epsilon) at which the loop is born. */
  birth: number;
  /** Filtration scale at which the loop is filled (dies). */
  death: number;
  /** Absolute lifetime = death - birth. */
  persistence: number;
  /** Lifetime normalized by the point-cloud diameter (scale-free, in [0,1]). */
  normalizedPersistence: number;
}

/** Persistence summary over the embedded point cloud. */
export interface PersistenceSummary {
  /** Number of connected components alive at maxEpsilon (H0 Betti estimate). */
  h0Components: number;
  /** All H1 loop bars, sorted by persistence descending. */
  h1Features: LoopFeature[];
  /** Absolute lifetime of the most persistent loop (0 if none). */
  dominantLoopLifetime: number;
  /** Diameter-normalized lifetime of the most persistent loop, in [0,1]. */
  normalizedDominantLifetime: number;
  /** Absolute lifetime of the 2nd most persistent loop (the H1 noise floor). */
  secondLoopLifetime: number;
  /** Separation ratio dominant / max(secondLoop, eps) — how isolated the top loop is. */
  loopSeparation: number;
  /** Filtration ceiling used (= point-cloud diameter). */
  maxEpsilon: number;
  /** Number of simplices in the filtration (dims 0/1/2). */
  simplexCount: number;
}

/** Scale-free headline metric in AtomicValue form (engine convention). */
export interface AtomicMetric {
  value: number;
  unit: string;
  confidence: number;
  source: string;
}

/** Dynamical regime inferred from the persistence diagram. */
export type Regime =
  | "stable_limit_cycle"
  | "multi_loop"
  | "no_periodicity"
  | "degenerate"
  | "insufficient_data";

/** Full condition-monitor result. */
export interface ConditionMonitorResult {
  regime: Regime;
  /** Count of H1 loops whose normalized persistence exceeds SIGNIFICANCE_RATIO. */
  significantLoopCount: number;
  /** Chatter risk band derived from the loop-count signature. */
  chatterRisk: "low" | "elevated" | "high";
  embedding: {
    dimension: number;
    delay: number;
    sourceLength: number;
    pointCount: number;
    sampledPointCount: number;
  };
  persistence: PersistenceSummary;
  /** Headline scale-free dominant-loop lifetime as an AtomicValue. */
  dominantLoop: AtomicMetric;
  message: string;
}

/** Options for {@link TDAConditionMonitorEngine.monitor}. */
export interface MonitorOptions {
  /** Embedding dimension d (default CONFIG.DEFAULT_DIMENSION). Must be integer >= 2. */
  dimension?: number;
  /** Time delay tau in samples. If omitted, auto-selected via suggestDelay(). */
  delay?: number;
  /** Deterministic subsample cap (default CONFIG.DEFAULT_MAX_POINTS). Must be integer >= MIN_POINTS. */
  maxPoints?: number;
}

/** Result of comparing a current monitor result against a baseline. */
export interface RegimeChangeResult {
  changed: boolean;
  baselineRegime: Regime;
  currentRegime: Regime;
  loopCountDelta: number;
  normalizedLifetimeDelta: number;
  reason: string;
}

// ============================================================================
// CONFIG (algorithmic TDA parameters — not physics constants)
// ============================================================================

const CONFIG = {
  /** Takens embedding dimension. d=3 robustly reconstructs a 1-torus/limit cycle
   *  (Takens sufficient dim 2m+1; a single-frequency cycle needs only 2, so 3
   *  gives margin). */
  DEFAULT_DIMENSION: 3,
  /** Deterministic subsample cap. Vietoris-Rips over the full complex is
   *  O(n^3) in triangles; ~48 points keeps it well under a second while leaving
   *  the dominant cycle amply resolved. */
  DEFAULT_MAX_POINTS: 48,
  /** Below this many sampled points the persistent homology is not meaningful. */
  MIN_POINTS: 6,
  /** Normalized-persistence (lifetime / diameter) above which an H1 loop is
   *  considered a *real* topological cycle rather than sampling noise. A clean
   *  delay-embedded circle scores ~0.6-0.85; broadband-noise loops score <0.15. */
  SIGNIFICANCE_RATIO: 0.2,
} as const;

// ============================================================================
// ENGINE
// ============================================================================

class TDAConditionMonitorEngine {
  /** Config surface (read-only) for consumers / tests. */
  readonly config = CONFIG;

  /**
   * Takens time-delay embedding of a 1-D series into R^dimension.
   *
   * @param series   Finite numeric samples x[0..N-1].
   * @param dimension Embedding dimension d (integer >= 2).
   * @param delay    Time delay tau in samples (integer >= 1).
   * @returns Embedded points and shape metadata.
   * @throws {Error} on non-array/empty input, non-finite samples, or invalid d/tau.
   */
  embed(series: number[], dimension: number, delay: number): EmbeddingResult {
    this._assertSeries(series);
    this._assertIntGte(dimension, 2, "dimension");
    this._assertIntGte(delay, 1, "delay");

    const span = (dimension - 1) * delay;
    const pointCount = series.length - span;
    const points: number[][] = [];
    for (let t = 0; t < pointCount; t++) {
      const coords = new Array<number>(dimension);
      for (let k = 0; k < dimension; k++) coords[k] = series[t + k * delay];
      points.push(coords);
    }
    return { points, dimension, delay, sourceLength: series.length, pointCount: Math.max(0, pointCount) };
  }

  /**
   * Suggest a delay tau from the first zero-crossing of the (biased) autocorrelation.
   * For a pure sinusoid of period P the autocorrelation is a cosine and this returns
   * ~P/4 — the quarter-period that maps the sinusoid to a clean circle.
   *
   * @param series Finite numeric samples (length >= 4).
   * @returns Integer delay in samples, clamped to [1, floor((N-1)/1)].
   * @throws {Error} on invalid series.
   */
  suggestDelay(series: number[]): number {
    this._assertSeries(series);
    const n = series.length;
    if (n < 4) return 1;
    const mean = series.reduce((s, v) => s + v, 0) / n;
    const dev = series.map((v) => v - mean);
    const denom = dev.reduce((s, v) => s + v * v, 0);
    if (denom <= EPS_MACHINE) return 1; // constant series — no structure
    let prev = 1; // r(0) normalized = 1 > 0
    const maxLag = Math.min(n - 1, Math.floor(n / 2));
    for (let lag = 1; lag <= maxLag; lag++) {
      let acc = 0;
      for (let t = 0; t < n - lag; t++) acc += dev[t] * dev[t + lag];
      const r = acc / denom;
      if (prev > 0 && r <= 0) return lag; // first zero-crossing
      prev = r;
    }
    // No zero-crossing found: fall back to a quarter of the usable window.
    return Math.max(1, Math.floor(maxLag / 2));
  }

  /**
   * Compute the H0/H1 persistence diagram of a point cloud via a self-contained
   * Vietoris-Rips filtration (maxEpsilon = cloud diameter) and standard mod-2
   * matrix reduction. Deterministic; no RNG.
   *
   * @param rawPoints Embedded points (each a coordinate vector of equal length).
   * @param maxPoints Deterministic even-stride subsample cap.
   * @returns Persistence summary (H0 components, sorted H1 bars, dominant lifetime).
   */
  computePersistence(rawPoints: number[][], maxPoints: number = CONFIG.DEFAULT_MAX_POINTS): PersistenceSummary {
    const points = this._subsample(rawPoints, maxPoints);
    const n = points.length;
    const empty: PersistenceSummary = {
      h0Components: n,
      h1Features: [],
      dominantLoopLifetime: 0,
      normalizedDominantLifetime: 0,
      secondLoopLifetime: 0,
      loopSeparation: 0,
      maxEpsilon: 0,
      simplexCount: n,
    };
    if (n < 3) return empty;

    // Pairwise distances + diameter (filtration ceiling).
    const dist = (i: number, j: number): number => {
      const a = points[i], b = points[j];
      let s = 0;
      for (let k = 0; k < a.length; k++) { const d = a[k] - b[k]; s += d * d; }
      return Math.sqrt(s);
    };
    let maxEps = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = dist(i, j); if (d > maxEps) maxEps = d; }
    if (maxEps <= EPS_MACHINE) return empty; // degenerate (constant / collapsed) cloud

    // Filtered simplices: vertices (birth 0), edges (birth = length), triangles
    // (birth = max edge = Rips rule). All triples qualify since maxEps = diameter.
    interface Simplex { dim: number; birth: number; key: string; faces: string[] }
    const simplices: Simplex[] = [];
    for (let i = 0; i < n; i++) simplices.push({ dim: 0, birth: 0, key: `${i}`, faces: [] });

    const edgeBirth = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = dist(i, j);
        const key = `${i},${j}`;
        edgeBirth.set(key, d);
        simplices.push({ dim: 1, birth: d, key, faces: [`${i}`, `${j}`] });
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          const b = Math.max(edgeBirth.get(`${i},${j}`)!, edgeBirth.get(`${i},${k}`)!, edgeBirth.get(`${j},${k}`)!);
          simplices.push({ dim: 2, birth: b, key: `${i},${j},${k}`, faces: [`${i},${j}`, `${i},${k}`, `${j},${k}`] });
        }
      }
    }

    // Filtration order: birth asc, then dimension asc (faces before cofaces at ties).
    simplices.sort((a, b) => (a.birth !== b.birth ? a.birth - b.birth : a.dim - b.dim));

    const index = new Map<string, number>();
    simplices.forEach((s, i) => index.set(s.key, i));

    // Boundary columns as sorted index sets (mod 2).
    const columns: number[][] = simplices.map((s) => {
      if (s.dim === 0) return [];
      const rows: number[] = [];
      for (const f of s.faces) { const fi = index.get(f); if (fi !== undefined) rows.push(fi); }
      rows.sort((a, b) => a - b);
      return rows;
    });

    // Standard mod-2 reduction with low-inverse pivot map (near-linear in practice).
    const lowOf = (col: number[]): number => (col.length ? col[col.length - 1] : -1);
    const symdiff = (a: number[], b: number[]): number[] => {
      const out: number[] = [];
      let i = 0, j = 0;
      while (i < a.length && j < b.length) {
        if (a[i] === b[j]) { i++; j++; }
        else if (a[i] < b[j]) out.push(a[i++]);
        else out.push(b[j++]);
      }
      while (i < a.length) out.push(a[i++]);
      while (j < b.length) out.push(b[j++]);
      return out;
    };

    const pivotToCol = new Map<number, number>();
    const paired = new Uint8Array(simplices.length);
    const pairs: Array<{ dim: number; birth: number; death: number }> = [];

    for (let j = 0; j < simplices.length; j++) {
      let col = columns[j];
      let low = lowOf(col);
      while (low >= 0 && pivotToCol.has(low)) {
        const i = pivotToCol.get(low)!;
        col = symdiff(col, columns[i]);
        low = lowOf(col);
      }
      columns[j] = col;
      if (low >= 0) {
        pivotToCol.set(low, j);
        paired[low] = 1;
        paired[j] = 1;
        pairs.push({ dim: simplices[low].dim, birth: simplices[low].birth, death: simplices[j].birth });
      }
    }
    // Essential (never-filled) classes: die at maxEps. A simplex is essential iff it
    // was never used to kill (paired[low]) nor itself killed (paired[j]) another class
    // during reduction -- `paired[i]` already tracks exactly that, so count H0 Betti
    // (components alive at the ceiling) directly from the true essential dim-0 set
    // here, NOT by comparing a pair's `death` against maxEps below: a *finite* (already
    // merged) dim-0 pair's death can coincidentally tie with maxEps whenever the edge
    // that performs the last component-merge happens to equal the cloud's own diameter
    // (e.g. two clusters bridged only by their mutually-farthest points) -- comparing
    // death >= maxEps - EPS_MACHINE would then double-count that merged component
    // alongside the one genuine survivor, even though the filtration ceiling maxEps is
    // by construction >= every pairwise distance, so the 1-skeleton at maxEps is always
    // the complete graph K_n and is therefore always fully connected (Betti0 = 1).
    let h0Components = 0;
    for (let i = 0; i < simplices.length; i++) {
      if (!paired[i] && simplices[i].dim <= 1) {
        pairs.push({ dim: simplices[i].dim, birth: simplices[i].birth, death: maxEps });
        if (simplices[i].dim === 0) h0Components++;
      }
    }

    // Split by dimension (H1 bars only -- h0Components is already resolved above).
    const h1: LoopFeature[] = [];
    for (const p of pairs) {
      const life = p.death - p.birth;
      if (p.dim === 1 && life > EPS_MACHINE) {
        h1.push({ birth: p.birth, death: p.death, persistence: life, normalizedPersistence: life / maxEps });
      }
    }
    h1.sort((a, b) => b.persistence - a.persistence);

    const dominant = h1.length ? h1[0].persistence : 0;
    const second = h1.length > 1 ? h1[1].persistence : 0;
    return {
      h0Components: Math.max(1, h0Components),
      h1Features: h1,
      dominantLoopLifetime: dominant,
      normalizedDominantLifetime: h1.length ? h1[0].normalizedPersistence : 0,
      secondLoopLifetime: second,
      loopSeparation: dominant / Math.max(second, EPS_MACHINE),
      maxEpsilon: maxEps,
      simplexCount: simplices.length,
    };
  }

  /**
   * End-to-end condition monitor: embed a signal, compute persistence, and
   * classify the dynamical regime / chatter risk.
   *
   * @param series  Finite vibration / force samples.
   * @param options Embedding + subsample options (see {@link MonitorOptions}).
   * @returns Full {@link ConditionMonitorResult}.
   * @throws {Error} on non-array/empty input, non-finite samples, or invalid options.
   */
  monitor(series: number[], options: MonitorOptions = {}): ConditionMonitorResult {
    this._assertSeries(series);
    const dimension = options.dimension ?? CONFIG.DEFAULT_DIMENSION;
    this._assertIntGte(dimension, 2, "dimension");
    const maxPoints = options.maxPoints ?? CONFIG.DEFAULT_MAX_POINTS;
    this._assertIntGte(maxPoints, CONFIG.MIN_POINTS, "maxPoints");
    const delay = options.delay ?? this.suggestDelay(series);
    this._assertIntGte(delay, 1, "delay");

    // Normalize (z-score) so the diameter and thresholds are comparable across
    // signals; a constant series collapses to the origin (zero variation).
    const normalized = this._zscore(series);
    const embedding = this.embed(normalized, dimension, delay);
    const sampled = Math.min(embedding.pointCount, maxPoints);

    const meta = {
      dimension,
      delay,
      sourceLength: series.length,
      pointCount: embedding.pointCount,
      sampledPointCount: sampled,
    };

    // Guard: degenerate or too-short embeddings before running homology.
    if (embedding.pointCount < CONFIG.MIN_POINTS) {
      return this._degenerateResult("insufficient_data", meta,
        `Only ${embedding.pointCount} embedded point(s); need >= ${CONFIG.MIN_POINTS} for topology.`);
    }

    const persistence = this.computePersistence(embedding.points, maxPoints);
    if (persistence.maxEpsilon <= EPS_MACHINE) {
      return this._degenerateResult("degenerate", meta,
        "Point cloud collapsed to a single location (constant / zero-variation signal); no cycles.");
    }

    const significant = persistence.h1Features.filter(
      (f) => f.normalizedPersistence >= CONFIG.SIGNIFICANCE_RATIO,
    );
    const significantLoopCount = significant.length;

    let regime: Regime;
    let chatterRisk: ConditionMonitorResult["chatterRisk"];
    let message: string;
    if (significantLoopCount === 0) {
      regime = "no_periodicity";
      chatterRisk = "low";
      message = "No persistent loop above the noise floor — broadband / aperiodic signal, no limit cycle.";
    } else if (significantLoopCount === 1) {
      regime = "stable_limit_cycle";
      chatterRisk = "low";
      message = `One dominant limit cycle (normalized lifetime ${persistence.normalizedDominantLifetime.toFixed(3)}) — regular, stable dynamics.`;
    } else {
      regime = "multi_loop";
      chatterRisk = "high";
      message = `${significantLoopCount} significant loops — period-doubling / chatter-onset signature.`;
    }

    // Confidence: how far the dominant loop sits above the significance gate.
    const confidence = Math.max(0, Math.min(1, persistence.normalizedDominantLifetime));
    return {
      regime,
      significantLoopCount,
      chatterRisk,
      embedding: meta,
      persistence,
      dominantLoop: {
        value: persistence.normalizedDominantLifetime,
        unit: "dimensionless (lifetime/diameter)",
        confidence,
        source: "takens-embedding+vietoris-rips-H1",
      },
      message,
    };
  }

  /**
   * Compare a current monitor result against a baseline to flag a regime change
   * (e.g., stable cut -> chatter onset, or tool-wear-driven loss of the limit cycle).
   *
   * @param baseline Reference monitor result (nominal/healthy).
   * @param current  Latest monitor result.
   * @returns {@link RegimeChangeResult} with deltas and a human-readable reason.
   */
  detectRegimeChange(baseline: ConditionMonitorResult, current: ConditionMonitorResult): RegimeChangeResult {
    const loopCountDelta = current.significantLoopCount - baseline.significantLoopCount;
    const normalizedLifetimeDelta =
      current.persistence.normalizedDominantLifetime - baseline.persistence.normalizedDominantLifetime;
    const changed = current.regime !== baseline.regime || loopCountDelta !== 0;
    let reason: string;
    if (!changed) {
      reason = `Regime unchanged (${baseline.regime}).`;
    } else if (loopCountDelta > 0) {
      reason = `Loop count rose ${baseline.significantLoopCount} -> ${current.significantLoopCount} (${baseline.regime} -> ${current.regime}): possible chatter / period-doubling onset.`;
    } else if (loopCountDelta < 0) {
      reason = `Loop count fell ${baseline.significantLoopCount} -> ${current.significantLoopCount} (${baseline.regime} -> ${current.regime}): loss of the stable limit cycle.`;
    } else {
      reason = `Regime shifted ${baseline.regime} -> ${current.regime}.`;
    }
    return { changed, baselineRegime: baseline.regime, currentRegime: current.regime, loopCountDelta, normalizedLifetimeDelta, reason };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Even-stride deterministic subsample down to at most `maxPoints` points. */
  private _subsample(points: number[][], maxPoints: number): number[][] {
    const m = points.length;
    if (m <= maxPoints) return points;
    const stride = m / maxPoints; // fractional stride, floored per index — even coverage, no RNG
    const out: number[][] = [];
    for (let i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * stride)]);
    return out;
  }

  /** Z-score normalize; a constant series maps to all-zeros (guarded by EPS). */
  private _zscore(series: number[]): number[] {
    const n = series.length;
    const mean = series.reduce((s, v) => s + v, 0) / n;
    let varAcc = 0;
    for (const v of series) { const d = v - mean; varAcc += d * d; }
    const std = Math.sqrt(varAcc / n);
    if (std <= EPS_MACHINE) return series.map(() => 0);
    return series.map((v) => (v - mean) / std);
  }

  private _degenerateResult(regime: Regime, meta: ConditionMonitorResult["embedding"], message: string): ConditionMonitorResult {
    return {
      regime,
      significantLoopCount: 0,
      chatterRisk: "low",
      embedding: meta,
      persistence: {
        h0Components: Math.max(1, meta.sampledPointCount),
        h1Features: [],
        dominantLoopLifetime: 0,
        normalizedDominantLifetime: 0,
        secondLoopLifetime: 0,
        loopSeparation: 0,
        maxEpsilon: 0,
        simplexCount: meta.sampledPointCount,
      },
      dominantLoop: { value: 0, unit: "dimensionless (lifetime/diameter)", confidence: 0, source: "takens-embedding+vietoris-rips-H1" },
      message,
    };
  }

  private _assertSeries(series: number[]): void {
    if (!Array.isArray(series) || series.length === 0) {
      throw new Error("TDAConditionMonitorEngine: series must be a non-empty number[].");
    }
    for (let i = 0; i < series.length; i++) {
      if (typeof series[i] !== "number" || !Number.isFinite(series[i])) {
        throw new Error(`TDAConditionMonitorEngine: series[${i}] is not a finite number (got ${series[i]}).`);
      }
    }
  }

  private _assertIntGte(value: number, min: number, name: string): void {
    if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
      throw new Error(`TDAConditionMonitorEngine: ${name} must be an integer >= ${min} (got ${value}).`);
    }
  }
}

// Singleton export (matches TopologyEngine convention).
export const tdamonitorEngine = new TDAConditionMonitorEngine();
export { TDAConditionMonitorEngine };
