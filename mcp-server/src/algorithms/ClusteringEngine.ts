/**
 * Clustering Engine — K-Means with Elbow Method
 *
 * Unsupervised clustering for manufacturing data segmentation.
 * Groups materials, process conditions, or parts into natural categories.
 * Includes silhouette scoring and automatic K selection via elbow method.
 *
 * Manufacturing uses: material grouping by machinability, process regime
 * identification, part family classification, workholding strategy clustering.
 *
 * References:
 * - Lloyd, S.P. (1982). "Least Squares Quantization in PCM"
 * - Rousseeuw, P.J. (1987). "Silhouettes: Graphical Aid for Clustering"
 *
 * @module algorithms/ClusteringEngine
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface ClusteringEngineInput {
  /** Data points: each row is a data vector. */
  data: number[][];
  /** Number of clusters (0 = auto-detect via elbow). Default 0. */
  k?: number;
  /** Max K to try for elbow method. Default 10. */
  max_k?: number;
  /** Max iterations. Default 100. */
  max_iterations?: number;
  /** Number of random restarts. Default 5. */
  n_restarts?: number;
  /** Seed for reproducibility. */
  seed?: number;
}

export interface ClusterResult {
  centroid: number[];
  size: number;
  inertia: number;
  members: number[];
}

export interface ClusteringEngineOutput extends WithWarnings {
  k: number;
  clusters: ClusterResult[];
  labels: number[];
  inertia: number;
  silhouette_score: number;
  elbow_scores: Array<{ k: number; inertia: number }>;
  calculation_method: string;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class ClusteringEngine implements Algorithm<ClusteringEngineInput, ClusteringEngineOutput> {

  validate(input: ClusteringEngineInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.data?.length || input.data.length < 2) {
      issues.push({ field: "data", message: "At least 2 data points required", severity: "error" });
    }
    if (input.data?.length && input.data.some(d => d.length !== input.data[0].length)) {
      issues.push({ field: "data", message: "All data points must have same dimensions", severity: "error" });
    }
    if ((input.k ?? 0) > (input.data?.length ?? 0)) {
      issues.push({ field: "k", message: "K must be <= data length", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: ClusteringEngineInput): ClusteringEngineOutput {
    const warnings: string[] = [];
    const { data } = input;
    const n = data.length;
    const dims = data[0].length;
    const maxK = Math.min(input.max_k ?? 10, n);
    const maxIter = input.max_iterations ?? 100;
    const nRestarts = input.n_restarts ?? 5;
    const rand = mulberry32(input.seed ?? Date.now());

    const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

    const runKMeans = (k: number): { labels: number[]; centroids: number[][]; inertia: number } => {
      let bestLabels: number[] = [];
      let bestCentroids: number[][] = [];
      let bestInertia = Infinity;

      for (let r = 0; r < nRestarts; r++) {
        // K-Means++ initialization
        const centroids: number[][] = [data[Math.floor(rand() * n)]];
        while (centroids.length < k) {
          const dists = data.map(p => Math.min(...centroids.map(c => dist(p, c) ** 2)));
          const total = dists.reduce((s, d) => s + d, 0);
          let target = rand() * total;
          for (let i = 0; i < n; i++) {
            target -= dists[i];
            if (target <= 0) { centroids.push([...data[i]]); break; }
          }
          if (centroids.length === k - 1 + 1) continue;
          centroids.push([...data[Math.floor(rand() * n)]]);
        }

        let labels = new Array(n).fill(0);
        for (let iter = 0; iter < maxIter; iter++) {
          // Assign
          const newLabels = data.map(p => {
            let minD = Infinity, minK = 0;
            centroids.forEach((c, ki) => { const d = dist(p, c); if (d < minD) { minD = d; minK = ki; } });
            return minK;
          });

          // Update centroids
          let changed = false;
          for (let ki = 0; ki < k; ki++) {
            const members = data.filter((_, i) => newLabels[i] === ki);
            if (members.length === 0) continue;
            const newC = Array(dims).fill(0);
            members.forEach(m => m.forEach((v, d) => newC[d] += v / members.length));
            if (dist(centroids[ki], newC) > 1e-8) changed = true;
            centroids[ki] = newC;
          }
          labels = newLabels;
          if (!changed) break;
        }

        const inertia = data.reduce((s, p, i) => s + dist(p, centroids[labels[i]]) ** 2, 0);
        if (inertia < bestInertia) {
          bestInertia = inertia;
          bestLabels = labels;
          bestCentroids = centroids.map(c => [...c]);
        }
      }
      return { labels: bestLabels, centroids: bestCentroids, inertia: bestInertia };
    };

    // Elbow method if k=0
    const elbowScores: Array<{ k: number; inertia: number }> = [];
    let chosenK = input.k ?? 0;
    if (chosenK === 0) {
      for (let k = 1; k <= maxK; k++) {
        const { inertia } = runKMeans(k);
        elbowScores.push({ k, inertia });
      }
      // Find elbow: max second derivative
      let maxDiff2 = 0;
      chosenK = 2;
      for (let i = 1; i < elbowScores.length - 1; i++) {
        const diff2 = Math.abs(elbowScores[i - 1].inertia - 2 * elbowScores[i].inertia + elbowScores[i + 1].inertia);
        if (diff2 > maxDiff2) { maxDiff2 = diff2; chosenK = elbowScores[i].k; }
      }
    }

    const { labels, centroids, inertia } = runKMeans(chosenK);

    // Build cluster results
    const clusters: ClusterResult[] = centroids.map((c, ki) => {
      const members = labels.map((l, i) => l === ki ? i : -1).filter(i => i >= 0);
      return {
        centroid: c,
        size: members.length,
        inertia: members.reduce((s, i) => s + dist(data[i], c) ** 2, 0),
        members,
      };
    });

    // Silhouette score
    let silhouetteSum = 0;
    for (let i = 0; i < n; i++) {
      const myCluster = labels[i];
      const sameCluster = labels.filter((l, j) => l === myCluster && j !== i);
      const a = sameCluster.length > 0
        ? data.reduce((s, p, j) => labels[j] === myCluster && j !== i ? s + dist(data[i], p) : s, 0) / sameCluster.length
        : 0;
      let minB = Infinity;
      for (let ki = 0; ki < chosenK; ki++) {
        if (ki === myCluster) continue;
        const otherMembers = labels.filter(l => l === ki);
        if (otherMembers.length === 0) continue;
        const b = data.reduce((s, p, j) => labels[j] === ki ? s + dist(data[i], p) : s, 0) / otherMembers.length;
        minB = Math.min(minB, b);
      }
      if (minB === Infinity) minB = 0;
      const maxAB = Math.max(a, minB);
      silhouetteSum += maxAB > 0 ? (minB - a) / maxAB : 0;
    }

    return {
      k: chosenK,
      clusters,
      labels,
      inertia,
      silhouette_score: n > 0 ? silhouetteSum / n : 0,
      elbow_scores: elbowScores,
      warnings,
      calculation_method: `K-Means++ (k=${chosenK}, ${nRestarts} restarts, ${maxIter} max iter)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "clustering-engine",
      name: "K-Means Clustering",
      description: "Unsupervised clustering with K-Means++, elbow method, and silhouette scoring",
      formula: "min Σ||x_i - μ_k||²; K selected via elbow (max 2nd derivative of inertia)",
      reference: "Lloyd (1982); Rousseeuw (1987)",
      safety_class: "informational",
      domain: "ml",
      inputs: { data: "Feature vectors", k: "Cluster count (0=auto)" },
      outputs: { clusters: "Cluster centroids+members", silhouette_score: "Cluster quality [-1,1]" },
    };
  }
}
