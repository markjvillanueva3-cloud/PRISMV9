/**
 * ClusterAnalysisEngine — K-means clustering analysis
 *
 * Models: K-means++ initialization, Lloyd's algorithm,
 *         silhouette score, elbow method, cluster metrics
 * References: Arthur & Vassilvitskii 2007, Rousseeuw 1987
 */

export interface ClusterAnalysisInput {
  data: number[][];                    // rows = observations, cols = features
  k?: number;                         // default auto (2-10 elbow)
  max_iterations?: number;            // default 100
  num_restarts?: number;              // default 5
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ClusterAnalysisResult {
  num_clusters: AtomicValue;
  inertia: AtomicValue;
  silhouette_score: AtomicValue;
  cluster_sizes: AtomicValue;
  between_variance_pct: AtomicValue;
  largest_cluster_pct: AtomicValue;
  smallest_cluster_pct: AtomicValue;
  iterations_used: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export class ClusterAnalysisEngine {
  calculate(input: ClusterAnalysisInput): ClusterAnalysisResult {
    const {
      data,
      max_iterations = 100,
    } = input;

    const recs: string[] = [];
    const n = data.length;
    const p = data[0]?.length ?? 0;

    // Auto-select k via simplified elbow
    let k = input.k ?? 3;
    if (input.k === undefined && n > 6) {
      let bestK = 2;
      let bestScore = -Infinity;
      for (let tryK = 2; tryK <= Math.min(8, Math.floor(n / 2)); tryK++) {
        const result = this._kmeans(data, tryK, max_iterations);
        const score = -result.inertia / tryK; // penalize more clusters
        if (score > bestScore) { bestScore = score; bestK = tryK; }
      }
      k = bestK;
    }

    const result = this._kmeans(data, Math.min(k, n), max_iterations);

    // Total variance
    const globalMean = Array(p).fill(0);
    for (const row of data) for (let j = 0; j < p; j++) globalMean[j] += row[j] / n;
    let totalVar = 0;
    for (const row of data) {
      for (let j = 0; j < p; j++) totalVar += (row[j] - globalMean[j]) ** 2;
    }

    const betweenVar = totalVar > 0 ? ((totalVar - result.inertia) / totalVar) * 100 : 0;

    // Cluster sizes
    const sizes = Array(k).fill(0);
    for (const label of result.labels) sizes[label]++;
    const largestPct = (Math.max(...sizes) / n) * 100;
    const smallestPct = (Math.min(...sizes) / n) * 100;

    // Simplified silhouette score
    let silhouette = 0;
    if (k > 1 && n > k) {
      for (let i = 0; i < Math.min(n, 200); i++) { // sample for speed
        const ci = result.labels[i];
        let ai = 0, bi = Infinity;
        let aiCount = 0;
        const bSums = Array(k).fill(0);
        const bCounts = Array(k).fill(0);

        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const d = euclidean(data[i], data[j]);
          if (result.labels[j] === ci) { ai += d; aiCount++; }
          else { bSums[result.labels[j]] += d; bCounts[result.labels[j]]++; }
        }
        ai = aiCount > 0 ? ai / aiCount : 0;
        for (let c = 0; c < k; c++) {
          if (c !== ci && bCounts[c] > 0) bi = Math.min(bi, bSums[c] / bCounts[c]);
        }
        if (bi === Infinity) bi = 0;
        const si = Math.max(ai, bi) > 0 ? (bi - ai) / Math.max(ai, bi) : 0;
        silhouette += si;
      }
      silhouette /= Math.min(n, 200);
    }

    const isSafe = n >= k * 2 && k >= 2 && silhouette > -0.5;

    if (silhouette < 0.25) recs.push(`Low silhouette ${silhouette.toFixed(2)} — clusters poorly separated`);
    if (smallestPct < 5) recs.push(`Tiny cluster (${smallestPct.toFixed(0)}%) — possible outlier cluster`);
    if (largestPct > 80) recs.push(`Dominant cluster (${largestPct.toFixed(0)}%) — data may be unimodal`);
    if (n < k * 5) recs.push(`Few observations per cluster (${Math.floor(n / k)}) — results unstable`);
    if (recs.length === 0) recs.push(`K-means — k=${k}, silhouette=${silhouette.toFixed(2)}, between-var=${betweenVar.toFixed(0)}%`);

    return {
      num_clusters: mkAv(k, "count", 0, "selected"),
      inertia: mkAv(Math.round(result.inertia * 100) / 100, "sum_sq", result.inertia * 0.05, "within_cluster"),
      silhouette_score: mkAv(Math.round(silhouette * 1000) / 1000, "score", silhouette * 0.10, "rousseeuw"),
      cluster_sizes: mkAv(sizes.length, "count", 0, "labels"),
      between_variance_pct: mkAv(Math.round(betweenVar * 10) / 10, "%", betweenVar * 0.05, "variance_ratio"),
      largest_cluster_pct: mkAv(Math.round(largestPct * 10) / 10, "%", 0, "distribution"),
      smallest_cluster_pct: mkAv(Math.round(smallestPct * 10) / 10, "%", 0, "distribution"),
      iterations_used: mkAv(result.iterations, "count", 0, "convergence"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }

  private _kmeans(data: number[][], k: number, maxIter: number): { labels: number[]; inertia: number; iterations: number } {
    const n = data.length;
    const p = data[0].length;

    // K-means++ initialization
    const centroids: number[][] = [data[Math.floor(Math.random() * n)].slice()];
    for (let c = 1; c < k; c++) {
      const dists = data.map(x => {
        let minD = Infinity;
        for (const cen of centroids) minD = Math.min(minD, euclidean(x, cen));
        return minD * minD;
      });
      const total = dists.reduce((s, d) => s + d, 0);
      let r = Math.random() * total;
      for (let i = 0; i < n; i++) {
        r -= dists[i];
        if (r <= 0) { centroids.push(data[i].slice()); break; }
      }
      if (centroids.length <= c) centroids.push(data[c].slice());
    }

    const labels = Array(n).fill(0);
    let iterations = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      iterations = iter + 1;
      let changed = false;

      // Assign
      for (let i = 0; i < n; i++) {
        let best = 0, bestD = Infinity;
        for (let c = 0; c < k; c++) {
          const d = euclidean(data[i], centroids[c]);
          if (d < bestD) { bestD = d; best = c; }
        }
        if (labels[i] !== best) { labels[i] = best; changed = true; }
      }

      if (!changed) break;

      // Update centroids
      for (let c = 0; c < k; c++) {
        const members = data.filter((_, i) => labels[i] === c);
        if (members.length > 0) {
          for (let j = 0; j < p; j++) {
            centroids[c][j] = members.reduce((s, m) => s + m[j], 0) / members.length;
          }
        }
      }
    }

    let inertia = 0;
    for (let i = 0; i < n; i++) inertia += euclidean(data[i], centroids[labels[i]]) ** 2;

    return { labels, inertia, iterations };
  }
}

export const clusterAnalysisEngine = new ClusterAnalysisEngine();
