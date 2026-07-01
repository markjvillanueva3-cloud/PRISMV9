/**
 * DBSCANAlgorithm — Density-Based Spatial Clustering of Applications with Noise.
 *
 * U-EXTRACT-DBSCAN (slot:golf 2026-05-24 iter17): extracted from
 * extracted_modules/ai_ml_engines/PRISM_CLUSTERING_ENHANCED.js (only the
 * DBSCAN portion; K-Medoids + t-SNE filed as follow-up extractions
 * U-EXTRACT-KMEDOIDS + U-EXTRACT-TSNE). Verified zero pre-existing DBSCAN
 * implementation in src/algorithms/ or src/engines/ via grep.
 *
 * Algorithm (Ester, Kriegel, Sander, Xu 1996):
 *   1. For each unvisited point p:
 *      - Find all neighbors within Euclidean distance ≤ eps
 *      - If fewer than minPts neighbors → mark p as noise
 *      - Else → start a new cluster, recursively expand via density-reachability
 *   2. Returns label per point: 0 = noise, 1+ = cluster id
 *
 * Pure function. Deterministic given an input point list (insertion order).
 * Distance metric: Euclidean (L2). n-dimensional points supported.
 *
 * Complexity: O(n²) worst-case (naive region query); fine for n < ~5000.
 * For larger n, prefer a k-d tree backend (future U-DBSCAN-KDTREE).
 */

export class DBSCANAlgorithm {
  /**
   * Cluster points by density. Returns a label per input point (same order):
   *  - 0 → noise (not in any cluster)
   *  - 1, 2, 3, ... → cluster id
   *
   * Throws on invalid input (non-array, ragged dimensions, non-finite values).
   */
  static cluster(points: number[][], eps: number, minPts: number): number[] {
    if (!Array.isArray(points)) {
      throw new TypeError("DBSCANAlgorithm.cluster: points must be an array");
    }
    if (points.length === 0) return [];
    const dim = points[0]?.length ?? 0;
    if (dim === 0) {
      throw new RangeError("DBSCANAlgorithm.cluster: points must have ≥1 dimension");
    }
    for (const p of points) {
      if (!Array.isArray(p) || p.length !== dim) {
        throw new RangeError("DBSCANAlgorithm.cluster: ragged dimensions detected");
      }
      for (const v of p) {
        if (!Number.isFinite(v)) {
          throw new RangeError("DBSCANAlgorithm.cluster: non-finite coordinate");
        }
      }
    }
    if (!Number.isFinite(eps) || eps <= 0) {
      throw new RangeError("DBSCANAlgorithm.cluster: eps must be a positive finite number");
    }
    if (!Number.isInteger(minPts) || minPts < 1) {
      throw new RangeError("DBSCANAlgorithm.cluster: minPts must be a positive integer");
    }

    const n = points.length;
    const UNVISITED = -1;
    const NOISE = 0;
    const labels = new Array<number>(n).fill(UNVISITED);
    let clusterId = 0;

    const distance = (a: number[], b: number[]): number => {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        sum += d * d;
      }
      return Math.sqrt(sum);
    };

    const regionQuery = (pIdx: number): number[] => {
      const neighbors: number[] = [];
      for (let i = 0; i < n; i++) {
        if (distance(points[pIdx], points[i]) <= eps) neighbors.push(i);
      }
      return neighbors;
    };

    for (let i = 0; i < n; i++) {
      if (labels[i] !== UNVISITED) continue;
      const neighbors = regionQuery(i);

      if (neighbors.length < minPts) {
        labels[i] = NOISE;
        continue;
      }

      clusterId++;
      labels[i] = clusterId;

      const seeds = neighbors.filter(j => j !== i);
      let seedIdx = 0;
      const seedSet = new Set(seeds);

      while (seedIdx < seeds.length) {
        const q = seeds[seedIdx++];

        if (labels[q] === NOISE) {
          labels[q] = clusterId; // promote noise → border
        }
        if (labels[q] !== UNVISITED) continue;

        labels[q] = clusterId;
        const qNeighbors = regionQuery(q);
        if (qNeighbors.length >= minPts) {
          for (const nb of qNeighbors) {
            if ((labels[nb] === UNVISITED || labels[nb] === NOISE) && !seedSet.has(nb)) {
              seeds.push(nb);
              seedSet.add(nb);
            }
          }
        }
      }
    }

    return labels;
  }

  /** Count cluster ids (excluding noise). */
  static clusterCount(labels: number[]): number {
    if (!Array.isArray(labels)) return 0;
    const ids = new Set<number>();
    for (const l of labels) if (l > 0) ids.add(l);
    return ids.size;
  }

  /** Count noise points (label === 0). */
  static noiseCount(labels: number[]): number {
    if (!Array.isArray(labels)) return 0;
    let c = 0;
    for (const l of labels) if (l === 0) c++;
    return c;
  }
}

/** Singleton export per PRISM convention. */
export const dbscanAlgorithm = DBSCANAlgorithm;
