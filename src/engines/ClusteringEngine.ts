/**
 * PRISM MCP Server -- Clustering Engine
 *
 * Unsupervised clustering algorithms:
 * - K-Medoids (PAM: Partitioning Around Medoids) — robust to outliers
 * - Mean Shift — non-parametric density mode finding
 * - Silhouette score for cluster quality evaluation
 *
 * Based on MIT 6.036, Stanford CS 229.
 * Ported from PRISM_CLUSTERING_COMPLETE.js (monolith R2.3.1).
 *
 * @module ClusteringEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface KMedoidsResult {
  medoids: number[][];
  medoidIndices: number[];
  labels: number[];
  cost: number;
  iterations: number;
}

export interface MeanShiftResult {
  labels: number[];
  clusterCenters: number[][];
  numClusters: number;
  bandwidth: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class ClusteringEngineImpl {

  // --------------------------------------------------------------------------
  // K-MEDOIDS (PAM)
  // --------------------------------------------------------------------------

  /**
   * K-Medoids clustering using Partitioning Around Medoids.
   * More robust to outliers than K-Means (uses actual data points as centers).
   */
  kMedoids(
    data: number[][],
    k: number,
    distanceFn?: (a: number[], b: number[]) => number,
    maxIter: number = 100
  ): KMedoidsResult {
    const n = data.length;
    if (k > n) throw new Error("k cannot exceed number of data points");
    if (k <= 0) throw new Error("k must be positive");

    const dist = distanceFn ?? this._euclidean;

    // Precompute distance matrix
    const D: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = dist(data[i], data[j]);
        D[i][j] = d;
        D[j][i] = d;
      }
    }

    // Initialize medoids randomly
    let medoids = this._randomSample(n, k);
    let labels = this._assignLabels(D, medoids);
    let cost = this._computeCost(D, medoids, labels);
    let iterations = 0;

    // PAM swap phase
    for (let iter = 0; iter < maxIter; iter++) {
      let improved = false;
      iterations++;

      for (let m = 0; m < k; m++) {
        for (let i = 0; i < n; i++) {
          if (medoids.includes(i)) continue;

          const newMedoids = [...medoids];
          newMedoids[m] = i;
          const newLabels = this._assignLabels(D, newMedoids);
          const newCost = this._computeCost(D, newMedoids, newLabels);

          if (newCost < cost) {
            medoids = newMedoids;
            labels = newLabels;
            cost = newCost;
            improved = true;
          }
        }
      }

      if (!improved) break;
    }

    return {
      medoids: medoids.map(i => data[i]),
      medoidIndices: medoids,
      labels,
      cost,
      iterations,
    };
  }

  // --------------------------------------------------------------------------
  // MEAN SHIFT
  // --------------------------------------------------------------------------

  /**
   * Mean Shift clustering — finds modes of the data density.
   * Bandwidth auto-estimated via Scott's rule if not provided.
   */
  meanShift(
    data: number[][],
    bandwidth?: number,
    maxIter: number = 300,
    tolerance: number = 1e-4
  ): MeanShiftResult {
    const n = data.length;
    const bw = bandwidth ?? this._estimateBandwidth(data);

    // Initialize shifted points at data locations
    let points = data.map(p => [...p]);

    for (let iter = 0; iter < maxIter; iter++) {
      let maxShift = 0;

      for (let i = 0; i < n; i++) {
        const newPoint = this._meanShiftPoint(points[i], data, bw);
        let shift = 0;
        for (let d = 0; d < points[i].length; d++) {
          shift += (points[i][d] - newPoint[d]) * (points[i][d] - newPoint[d]);
        }
        shift = Math.sqrt(shift);
        if (shift > maxShift) maxShift = shift;
        points[i] = newPoint;
      }

      if (maxShift < tolerance) break;
    }

    // Merge nearby modes
    const { centers, labels } = this._mergeModes(points, bw / 2);

    return { labels, clusterCenters: centers, numClusters: centers.length, bandwidth: bw };
  }

  // --------------------------------------------------------------------------
  // SILHOUETTE SCORE
  // --------------------------------------------------------------------------

  /**
   * Compute average silhouette score for evaluating cluster quality.
   * Range: [-1, 1]. Higher is better.
   */
  silhouetteScore(
    data: number[][],
    labels: number[],
    distanceFn?: (a: number[], b: number[]) => number
  ): number {
    const n = data.length;
    const dist = distanceFn ?? this._euclidean;
    const clusters = new Set(labels);
    if (clusters.size <= 1 || clusters.size >= n) return 0;

    let totalSil = 0;

    for (let i = 0; i < n; i++) {
      const myCluster = labels[i];

      // a(i) = mean distance to same-cluster points
      let aSum = 0;
      let aCount = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i && labels[j] === myCluster) {
          aSum += dist(data[i], data[j]);
          aCount++;
        }
      }
      const a = aCount > 0 ? aSum / aCount : 0;

      // b(i) = min mean distance to other clusters
      let b = Infinity;
      for (const c of clusters) {
        if (c === myCluster) continue;
        let sum = 0;
        let count = 0;
        for (let j = 0; j < n; j++) {
          if (labels[j] === c) {
            sum += dist(data[i], data[j]);
            count++;
          }
        }
        if (count > 0) {
          const mean = sum / count;
          if (mean < b) b = mean;
        }
      }

      const s = b === Infinity ? 0 : (b - a) / Math.max(a, b);
      totalSil += s;
    }

    return totalSil / n;
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  _euclidean(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) * (a[i] - b[i]);
    return Math.sqrt(sum);
  }

  _randomSample(n: number, k: number): number[] {
    const indices: number[] = [];
    while (indices.length < k) {
      const i = Math.floor(Math.random() * n);
      if (!indices.includes(i)) indices.push(i);
    }
    return indices;
  }

  _assignLabels(D: number[][], medoids: number[]): number[] {
    const n = D.length;
    const labels = new Array(n);
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let label = 0;
      for (let m = 0; m < medoids.length; m++) {
        if (D[i][medoids[m]] < minDist) {
          minDist = D[i][medoids[m]];
          label = m;
        }
      }
      labels[i] = label;
    }
    return labels;
  }

  _computeCost(D: number[][], medoids: number[], labels: number[]): number {
    let cost = 0;
    for (let i = 0; i < labels.length; i++) cost += D[i][medoids[labels[i]]];
    return cost;
  }

  _meanShiftPoint(point: number[], data: number[][], bandwidth: number): number[] {
    const dim = point.length;
    const numerator = new Array(dim).fill(0);
    let denominator = 0;

    for (const x of data) {
      let dist = 0;
      for (let d = 0; d < dim; d++) dist += (point[d] - x[d]) * (point[d] - x[d]);
      dist = Math.sqrt(dist);
      const w = Math.exp(-0.5 * (dist / bandwidth) * (dist / bandwidth));

      for (let d = 0; d < dim; d++) numerator[d] += w * x[d];
      denominator += w;
    }

    return denominator > 0 ? numerator.map(v => v / denominator) : [...point];
  }

  _estimateBandwidth(data: number[][]): number {
    const n = data.length;
    const dim = data[0].length;

    let avgStd = 0;
    for (let d = 0; d < dim; d++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += data[i][d];
      const mean = sum / n;
      let variance = 0;
      for (let i = 0; i < n; i++) variance += (data[i][d] - mean) * (data[i][d] - mean);
      avgStd += Math.sqrt(variance / n);
    }
    avgStd /= dim;

    // Scott's rule
    return avgStd * Math.pow(n, -1 / (dim + 4));
  }

  _mergeModes(modes: number[][], mergeDistance: number): { centers: number[][]; labels: number[] } {
    const centers: number[][] = [];
    const labels = new Array(modes.length).fill(-1);

    for (let i = 0; i < modes.length; i++) {
      let merged = false;
      for (let c = 0; c < centers.length; c++) {
        let dist = 0;
        for (let d = 0; d < modes[i].length; d++) {
          dist += (modes[i][d] - centers[c][d]) * (modes[i][d] - centers[c][d]);
        }
        if (Math.sqrt(dist) < mergeDistance) {
          labels[i] = c;
          merged = true;
          break;
        }
      }
      if (!merged) {
        labels[i] = centers.length;
        centers.push([...modes[i]]);
      }
    }

    return { centers, labels };
  }
}

export const clusteringEngine = new ClusteringEngineImpl();
