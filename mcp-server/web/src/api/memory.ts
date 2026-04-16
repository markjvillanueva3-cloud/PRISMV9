/**
 * ClusterAnalysisEngine — K-means clustering analysis
 *
 * Models: K-means++ initialization, Lloyd's algorithm,
 *         silhouette score, elbow method, cluster metrics
 * References: Arthur & Vassilvitskii 2007, Rousseeuw 1987
 */
function mkAv(v, u, unc, s, w) {
    return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}
function euclidean(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++)
        sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
}
export class ClusterAnalysisEngine {
    calculate(input) {
        const { data, max_iterations = 100, } = input;
        const recs = [];
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
                if (score > bestScore) {
                    bestScore = score;
                    bestK = tryK;
                }
            }
            k = bestK;
        }
        const result = this._kmeans(data, Math.min(k, n), max_iterations);
        // Total variance
        const globalMean = Array(p).fill(0);
        for (const row of data)
            for (let j = 0; j < p; j++)
                globalMean[j] += row[j] / n;
        let totalVar = 0;
        for (const row of data) {
            for (let j = 0; j < p; j++)
                totalVar += (row[j] - globalMean[j]) ** 2;
        }
        const betweenVar = totalVar > 0 ? ((totalVar - result.inertia) / totalVar) * 100 : 0;
        // Cluster sizes
        const sizes = Array(k).fill(0);
      