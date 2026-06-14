/**
 * KMedoidsAlgorithm — Partitioning Around Medoids (PAM) clustering.
 *
 * U-EXTRACT-KMEDOIDS (slot:golf 2026-05-24 iter18): extracted from
 * extracted_modules/ai_ml_engines/PRISM_CLUSTERING_ENHANCED.js (k-medoids
 * portion). Sibling to U-EXTRACT-DBSCAN (DBSCAN) and U-EXTRACT-TSNE (deferred).
 *
 * K-Medoids is more robust to outliers than K-Means because medoids are
 * actual data points (not centroids), making the model resistant to
 * extreme values. Classic PAM algorithm (Kaufman & Rousseeuw 1990):
 *   1. Initialize k medoids (random selection from points)
 *   2. Assign each point to nearest medoid
 *   3. For each (medoid, non-medoid) pair, try swapping; keep swap if cost
 *      decreases. Iterate until no improving swap exists or maxIter reached.
 *
 * Pure function (deterministic given an RNG). Distance: Euclidean.
 * Complexity: O(k·(n-k)² per iteration) — fine for n<500. For larger n,
 * prefer CLARA or CLARANS (future U-EXTRACT-CLARA).
 */

export interface KMedoidsResult {
  /** Per-point cluster id (0..k-1), index aligned with input points. */
  labels: number[];
  /** Indices (into the input points array) of the k selected medoids. */
  medoids: number[];
  /** Total cost: sum of distances from each point to its medoid. */
  cost: number;
  /** Number of PAM iterations actually executed. */
  iterations: number;
}

export class KMedoidsAlgorithm {
  /**
   * Cluster points into k groups around k medoids. `rng` defaults to
   * Math.random; pass a seeded RNG for determinism in tests.
   */
  static cluster(
    points: number[][],
    k: number,
    opts: { maxIter?: number; rng?: () => number } = {},
  ): KMedoidsResult {
    if (!Array.isArray(points)) {
      throw new TypeError("KMedoidsAlgorithm.cluster: points must be an array");
    }
    if (!Number.isInteger(k) || k < 1) {
      throw new RangeError("KMedoidsAlgorithm.cluster: k must be a positive integer");
    }
    if (points.length < k) {
      throw new RangeError(`KMedoidsAlgorithm.cluster: need ≥k=${k} points, got ${points.length}`);
    }
    const dim = points[0]?.length ?? 0;
    if (dim === 0) {
      throw new RangeError("KMedoidsAlgorithm.cluster: points must have ≥1 dimension");
    }
    for (const p of points) {
      if (!Array.isArray(p) || p.length !== dim) {
        throw new RangeError("KMedoidsAlgorithm.cluster: ragged dimensions detected");
      }
      for (const v of p) {
        if (!Number.isFinite(v)) {
          throw new RangeError("KMedoidsAlgorithm.cluster: non-finite coordinate");
        }
      }
    }
    const maxIter = Number.isInteger(opts.maxIter) && opts.maxIter! > 0 ? opts.maxIter! : 100;
    const rng = typeof opts.rng === "function" ? opts.rng : Math.random;
    const n = points.length;

    // Precompute distance matrix
    const dist: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let sum = 0;
        for (let d = 0; d < dim; d++) {
          const delta = points[i][d] - points[j][d];
          sum += delta * delta;
        }
        const dd = Math.sqrt(sum);
        dist[i][j] = dd;
        dist[j][i] = dd;
      }
    }

    // Initialize medoids by random selection without replacement
    let medoids: number[] = [];
    const available = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < k; i++) {
      const idx = Math.floor(rng() * available.length);
      medoids.push(available.splice(idx, 1)[0]);
    }

    let labels = KMedoidsAlgorithm._assign(dist, medoids);
    let totalCost = KMedoidsAlgorithm._cost(dist, labels, medoids);
    let iterations = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      iterations++;
      let improved = false;

      for (let i = 0; i < k; i++) {
        for (let j = 0; j < n; j++) {
          if (medoids.includes(j)) continue;
          const trial = medoids.slice();
          trial[i] = j;
          const trialLabels = KMedoidsAlgorithm._assign(dist, trial);
          const trialCost = KMedoidsAlgorithm._cost(dist, trialLabels, trial);
          if (trialCost < totalCost) {
            medoids = trial;
            labels = trialLabels;
            totalCost = trialCost;
            improved = true;
          }
        }
      }

      if (!improved) break;
    }

    return { labels, medoids, cost: totalCost, iterations };
  }

  /** Internal: assign each point to its nearest medoid. */
  static _assign(dist: number[][], medoids: number[]): number[] {
    const n = dist.length;
    const labels = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let label = 0;
      for (let m = 0; m < medoids.length; m++) {
        const d = dist[i][medoids[m]];
        if (d < minDist) {
          minDist = d;
          label = m;
        }
      }
      labels[i] = label;
    }
    return labels;
  }

  /** Internal: sum of distances from each point to its assigned medoid. */
  static _cost(dist: number[][], labels: number[], medoids: number[]): number {
    let cost = 0;
    for (let i = 0; i < labels.length; i++) cost += dist[i][medoids[labels[i]]];
    return cost;
  }
}

/** Singleton export per PRISM convention. */
export const kMedoidsAlgorithm = KMedoidsAlgorithm;
