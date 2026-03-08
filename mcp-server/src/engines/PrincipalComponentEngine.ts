/**
 * PrincipalComponentEngine — Principal Component Analysis
 *
 * Models: Covariance-based PCA, eigenvalue decomposition (power iteration),
 *         explained variance, dimensionality reduction
 * References: Jolliffe PCA, Abdi & Williams 2010
 */

export interface PrincipalComponentInput {
  data: number[][];                    // rows = observations, cols = variables
  num_components?: number;             // default all
  standardize?: boolean;               // default true
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PrincipalComponentResult {
  num_components_retained: AtomicValue;
  total_variance_explained_pct: AtomicValue;
  first_pc_variance_pct: AtomicValue;
  second_pc_variance_pct: AtomicValue;
  kaiser_components: AtomicValue;
  condition_number: AtomicValue;
  num_variables: AtomicValue;
  num_observations: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class PrincipalComponentEngine {
  calculate(input: PrincipalComponentInput): PrincipalComponentResult {
    const {
      data,
      standardize = true,
    } = input;

    const recs: string[] = [];
    const n = data.length;
    const p = data[0]?.length ?? 0;
    const k = input.num_components ?? p;

    // Compute means and std
    const means: number[] = Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      for (let i = 0; i < n; i++) means[j] += data[i][j];
      means[j] /= n;
    }

    const stds: number[] = Array(p).fill(1);
    if (standardize) {
      for (let j = 0; j < p; j++) {
        let ss = 0;
        for (let i = 0; i < n; i++) ss += (data[i][j] - means[j]) ** 2;
        stds[j] = Math.sqrt(ss / n) || 1;
      }
    }

    // Covariance/correlation matrix
    const C: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
    for (let j1 = 0; j1 < p; j1++) {
      for (let j2 = j1; j2 < p; j2++) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          sum += ((data[i][j1] - means[j1]) / stds[j1]) * ((data[i][j2] - means[j2]) / stds[j2]);
        }
        C[j1][j2] = sum / n;
        C[j2][j1] = C[j1][j2];
      }
    }

    // Power iteration for eigenvalues (simplified — extract top eigenvalues)
    const eigenvalues: number[] = [];
    const Cwork = C.map(row => [...row]);

    for (let comp = 0; comp < Math.min(k, p); comp++) {
      // Power iteration
      let v = Array(p).fill(1 / Math.sqrt(p));
      let lambda = 0;

      for (let iter = 0; iter < 100; iter++) {
        const Av: number[] = Array(p).fill(0);
        for (let i = 0; i < p; i++) {
          for (let j = 0; j < p; j++) {
            Av[i] += Cwork[i][j] * v[j];
          }
        }
        lambda = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
        if (lambda < 1e-10) break;
        v = Av.map(x => x / lambda);
      }

      eigenvalues.push(lambda);

      // Deflate
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          Cwork[i][j] -= lambda * v[i] * v[j];
        }
      }
    }

    const totalVar = eigenvalues.reduce((s, e) => s + e, 0);
    const pc1Pct = totalVar > 0 ? (eigenvalues[0] / totalVar) * 100 : 0;
    const pc2Pct = eigenvalues.length > 1 && totalVar > 0 ? (eigenvalues[1] / totalVar) * 100 : 0;

    // Kaiser criterion: eigenvalues > 1 (for correlation matrix)
    const kaiserK = standardize ? eigenvalues.filter(e => e > 1).length : eigenvalues.filter(e => e > totalVar / p).length;

    // Cumulative variance for retained components
    const retainedK = Math.min(k, eigenvalues.length);
    const cumVar = eigenvalues.slice(0, retainedK).reduce((s, e) => s + e, 0);
    const cumPct = totalVar > 0 ? (cumVar / totalVar) * 100 : 0;

    // Condition number
    const maxEig = eigenvalues[0] || 1;
    const minEig = eigenvalues[eigenvalues.length - 1] || 0.001;
    const condNum = maxEig / Math.max(minEig, 1e-10);

    const isSafe = n > p && p >= 2 && eigenvalues[0] > 0;

    if (n < p) recs.push(`More variables (${p}) than observations (${n}) — results unstable`);
    if (pc1Pct > 90) recs.push(`PC1 explains ${pc1Pct.toFixed(0)}% — data nearly 1-dimensional`);
    if (kaiserK < p * 0.3) recs.push(`Kaiser suggests ${kaiserK}/${p} components — significant reduction possible`);
    if (condNum > 1000) recs.push(`High condition number ${condNum.toFixed(0)} — multicollinearity present`);
    if (recs.length === 0) recs.push(`PCA — ${kaiserK} Kaiser components, PC1=${pc1Pct.toFixed(0)}%, PC2=${pc2Pct.toFixed(0)}%`);

    return {
      num_components_retained: mkAv(retainedK, "count", 0, "requested"),
      total_variance_explained_pct: mkAv(Math.round(cumPct * 10) / 10, "%", cumPct * 0.02, "eigenvalues"),
      first_pc_variance_pct: mkAv(Math.round(pc1Pct * 10) / 10, "%", pc1Pct * 0.05, "eigenvalue_1"),
      second_pc_variance_pct: mkAv(Math.round(pc2Pct * 10) / 10, "%", pc2Pct * 0.05, "eigenvalue_2"),
      kaiser_components: mkAv(kaiserK, "count", 0, "kaiser_criterion"),
      condition_number: mkAv(Math.round(condNum * 10) / 10, "ratio", condNum * 0.10, "eigenvalue_ratio"),
      num_variables: mkAv(p, "count", 0, "input"),
      num_observations: mkAv(n, "count", 0, "input"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const principalComponentEngine = new PrincipalComponentEngine();
