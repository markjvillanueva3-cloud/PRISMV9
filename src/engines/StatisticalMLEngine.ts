// @ts-nocheck
/**
 * StatisticalMLEngine — 7 statistical/ML methods for PRISM
 *
 * Methods:
 *   1. MCMC (Metropolis-Hastings) — Metropolis et al. 1953, Hastings 1970
 *   2. Bootstrap Resampling (BCa) — Efron 1979, Efron & Tibshirani 1993
 *   3. PCA (Principal Component Analysis) — Pearson 1901, Hotelling 1933
 *   4. K-Means Clustering (Lloyd + k-means++) — Lloyd 1982, Arthur & Vassilvitskii 2007
 *   5. Logistic Regression (gradient descent) — Cox 1958
 *   6. Wavelet Transform (Haar) — Haar 1909, Mallat 1989
 *   7. CUSUM & EWMA Control Charts — Page 1954, Roberts 1959
 *
 * All methods use seeded PRNG (Park-Miller) for reproducibility.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** MCMC Metropolis-Hastings input */
export interface MCMCInput {
  /** Log of target density function ln(pi(x)) */
  logDensityFn: (state: number[]) => number;
  /** Starting state vector */
  initialState: number[];
  /** Number of samples to collect (after burn-in) */
  nSamples: number;
  /** Number of initial samples to discard */
  burnIn: number;
  /** Keep every nth sample */
  thinning: number;
  /** Standard deviation of Gaussian proposal */
  stepSize: number;
  /** PRNG seed */
  seed: number;
}

/** MCMC result */
export interface MCMCResult {
  /** Collected samples, each a state vector */
  samples: number[][];
  /** Fraction of proposals accepted */
  acceptanceRate: number;
  /** Component-wise mean of samples */
  meanEstimate: number[];
  /** Sample covariance matrix */
  covEstimate: number[][];
}

/** Bootstrap resampling input */
export interface BootstrapInput {
  /** Original data */
  data: number[];
  /** Statistic to compute on each resample */
  statistic: (sample: number[]) => number;
  /** Number of bootstrap resamples */
  nBootstrap: number;
  /** Confidence level (e.g. 0.95) */
  confidenceLevel: number;
  /** PRNG seed */
  seed: number;
}

/** Bootstrap result */
export interface BootstrapResult {
  /** Point estimate on original data */
  estimate: number;
  /** Bootstrap standard error */
  standardError: number;
  /** BCa confidence interval */
  confidenceInterval: [number, number];
  /** Full bootstrap distribution */
  bootstrapDistribution: number[];
  /** Bootstrap bias estimate */
  bias: number;
}

/** PCA input */
export interface PCAInput {
  /** Data matrix, N rows x D columns */
  data: number[][];
  /** Number of principal components to retain (default: all) */
  nComponents?: number;
}

/** PCA result */
export interface PCAResult {
  /** Principal component eigenvectors (nComponents x D) */
  components: number[][];
  /** Eigenvalues sorted descending */
  eigenvalues: number[];
  /** Fraction of variance explained per component */
  explainedVarianceRatio: number[];
  /** Data projected onto principal components (N x nComponents) */
  projectedData: number[][];
  /** Cumulative explained variance */
  cumulativeVariance: number[];
}

/** K-Means input */
export interface KMeansInput {
  /** Data points, N x D */
  data: number[][];
  /** Number of clusters */
  k: number;
  /** Maximum Lloyd iterations */
  maxIterations: number;
  /** PRNG seed */
  seed: number;
}

/** K-Means result */
export interface KMeansResult {
  /** Cluster centroids, k x D */
  centroids: number[][];
  /** Cluster assignment per data point */
  assignments: number[];
  /** Sum of squared distances to assigned centroid */
  inertia: number;
  /** Iterations until convergence */
  iterations: number;
  /** Number of points per cluster */
  clusterSizes: number[];
}

/** Logistic regression input */
export interface LogRegInput {
  /** Feature matrix, N x D */
  X: number[][];
  /** Binary labels (0 or 1), length N */
  y: number[];
  /** Gradient descent learning rate */
  learningRate: number;
  /** Max gradient descent iterations */
  maxIterations: number;
  /** L2 regularization strength (0 = none) */
  lambda: number;
}

/** Logistic regression result */
export interface LogRegResult {
  /** Learned weight vector, length D */
  weights: number[];
  /** Learned bias term */
  bias: number;
  /** Predicted probabilities for training data */
  predictions: number[];
  /** Classification accuracy on training data */
  accuracy: number;
  /** Cross-entropy loss per iteration */
  lossHistory: number[];
}

/** Haar wavelet transform input */
export interface WaveletInput {
  /** Input signal (length should be power of 2 for clean decomposition) */
  signal: number[];
  /** Number of decomposition levels (default: max possible) */
  levels?: number;
}

/** Wavelet transform result */
export interface WaveletResult {
  /** Final approximation coefficients */
  approximation: number[];
  /** Detail coefficients per level */
  details: number[][];
  /** Reconstructed signal from inverse transform */
  reconstructed: number[];
  /** Energy fraction per decomposition level */
  energyByLevel: number[];
}

/** Control chart input */
export interface ControlChartInput {
  /** Process observations */
  data: number[];
  /** Process target mean mu_0 */
  target: number;
  /** Process standard deviation sigma */
  sigma: number;
  /** Chart type(s) to compute */
  type: "cusum" | "ewma" | "both";
  /** CUSUM reference value K (default: 0.5 * sigma) */
  cusumK?: number;
  /** CUSUM decision interval H (default: 5 * sigma) */
  cusumH?: number;
  /** EWMA smoothing parameter lambda (default: 0.2) */
  ewmaLambda?: number;
  /** EWMA control limit width L (default: 3) */
  ewmaL?: number;
}

/** Control chart result */
export interface ControlChartResult {
  /** CUSUM upper cumulative sum values */
  cusumUpper: number[];
  /** CUSUM lower cumulative sum values */
  cusumLower: number[];
  /** EWMA smoothed values */
  ewmaValues: number[];
  /** EWMA upper control limit per point */
  ewmaUCL: number[];
  /** EWMA lower control limit per point */
  ewmaLCL: number[];
  /** Indices where process is out of control */
  outOfControlIndices: number[];
  /** Detailed alarm points */
  alarmPoints: { index: number; type: string; value: number }[];
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class StatisticalMLEngine {
  private totalCalculations = 0;

  // ── Seeded PRNG (Park-Miller LCG) ──────────────────────────────────────

  /**
   * Park-Miller minimal standard PRNG.
   * s(n+1) = (s(n) * 16807) mod 2147483647
   * Returns value in (0, 1).
   */
  private createRng(seed: number): () => number {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }

  /**
   * Box-Muller transform: generates standard normal variate from uniform.
   */
  private gaussianRng(rng: () => number): () => number {
    let spare: number | null = null;
    return () => {
      if (spare !== null) {
        const v = spare;
        spare = null;
        return v;
      }
      let u: number, v: number, s: number;
      do {
        u = 2 * rng() - 1;
        v = 2 * rng() - 1;
        s = u * u + v * v;
      } while (s >= 1 || s === 0);
      const mul = Math.sqrt(-2 * Math.log(s) / s);
      spare = v * mul;
      return u * mul;
    };
  }

  // ── 1. MCMC (Metropolis-Hastings) ──────────────────────────────────────

  /**
   * Markov Chain Monte Carlo using the Metropolis-Hastings algorithm
   * with symmetric Gaussian random-walk proposal.
   *
   * Acceptance ratio: min(1, exp(logDensity(x') - logDensity(x)))
   *
   * @ref Metropolis, Rosenbluth, Rosenbluth, Teller, Teller (1953).
   *      "Equation of State Calculations by Fast Computing Machines."
   * @ref Hastings (1970). "Monte Carlo sampling methods using Markov chains
   *      and their applications."
   */
  mcmc(input: MCMCInput): MCMCResult {
    this.totalCalculations++;
    const { logDensityFn, initialState, nSamples, burnIn = 0, thinning = 1, stepSize = 1.0, seed = 42 } = input;
    const dim = initialState.length;
    const rng = this.createRng(seed);
    const gauss = this.gaussianRng(rng);

    const totalNeeded = burnIn + nSamples * thinning;
    const samples: number[][] = [];
    let current = [...initialState];
    let currentLogDensity = logDensityFn(current);
    let accepted = 0;

    for (let i = 0; i < totalNeeded; i++) {
      // Propose: x' = x + N(0, stepSize^2)
      const proposal = current.map((c) => c + stepSize * gauss());
      const proposalLogDensity = logDensityFn(proposal);

      // Acceptance ratio (log scale): min(0, log(pi(x')/pi(x)))
      const logAlpha = proposalLogDensity - currentLogDensity;
      const u = rng();

      if (Math.log(u) < logAlpha) {
        current = proposal;
        currentLogDensity = proposalLogDensity;
        accepted++;
      }

      // Collect sample after burn-in, respecting thinning
      if (i >= burnIn && (i - burnIn) % thinning === 0) {
        samples.push([...current]);
      }
    }

    const acceptanceRate = accepted / totalNeeded;

    // Compute mean
    const meanEstimate = new Array(dim).fill(0);
    for (const s of samples) {
      for (let d = 0; d < dim; d++) meanEstimate[d] += s[d];
    }
    for (let d = 0; d < dim; d++) meanEstimate[d] /= samples.length;

    // Compute covariance
    const covEstimate: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (const s of samples) {
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          covEstimate[i][j] += (s[i] - meanEstimate[i]) * (s[j] - meanEstimate[j]);
        }
      }
    }
    const n = samples.length;
    if (n > 1) {
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          covEstimate[i][j] /= n - 1;
        }
      }
    }

    return { samples, acceptanceRate, meanEstimate, covEstimate };
  }

  // ── 2. Bootstrap Resampling (BCa) ─────────────────────────────────────

  /**
   * Non-parametric bootstrap with BCa (bias-corrected and accelerated)
   * confidence intervals.
   *
   * BCa interval adjusts percentile endpoints using:
   *   - z0 (bias correction): Phi^-1(#{theta_b < theta_hat} / B)
   *   - a (acceleration): sum(jackknife_i^3) / (6 * (sum(jackknife_i^2))^(3/2))
   *
   * Adjusted percentiles:
   *   alpha1 = Phi(z0 + (z0 + z_alpha)/(1 - a*(z0 + z_alpha)))
   *   alpha2 = Phi(z0 + (z0 + z_(1-alpha))/(1 - a*(z0 + z_(1-alpha))))
   *
   * @ref Efron (1979). "Bootstrap methods: another look at the jackknife."
   * @ref Efron, Tibshirani (1993). "An Introduction to the Bootstrap."
   */
  bootstrap(input: BootstrapInput): BootstrapResult {
    this.totalCalculations++;
    const { data, statistic, nBootstrap, confidenceLevel, seed } = input;
    const rng = this.createRng(seed);
    const n = data.length;

    // Original estimate
    const estimate = statistic(data);

    // Generate bootstrap distribution
    const bootstrapDistribution: number[] = [];
    for (let b = 0; b < nBootstrap; b++) {
      const resample: number[] = [];
      for (let i = 0; i < n; i++) {
        resample.push(data[Math.floor(rng() * n)]);
      }
      bootstrapDistribution.push(statistic(resample));
    }

    // Bootstrap mean & standard error
    const bMean = bootstrapDistribution.reduce((a, b) => a + b, 0) / nBootstrap;
    const bias = bMean - estimate;
    const standardError = Math.sqrt(
      bootstrapDistribution.reduce((acc, v) => acc + (v - bMean) ** 2, 0) / (nBootstrap - 1)
    );

    // BCa: bias correction z0
    const countBelow = bootstrapDistribution.filter((v) => v < estimate).length;
    const z0 = this.probitInv(countBelow / nBootstrap);

    // Jackknife for acceleration constant a
    const jackValues: number[] = [];
    for (let i = 0; i < n; i++) {
      const jackSample = [...data.slice(0, i), ...data.slice(i + 1)];
      jackValues.push(statistic(jackSample));
    }
    const jackMean = jackValues.reduce((a, b) => a + b, 0) / n;
    const jackDiffs = jackValues.map((v) => jackMean - v);
    const sumCubed = jackDiffs.reduce((acc, d) => acc + d ** 3, 0);
    const sumSquared = jackDiffs.reduce((acc, d) => acc + d ** 2, 0);
    const a = sumSquared > 0 ? sumCubed / (6 * Math.pow(sumSquared, 1.5)) : 0;

    // BCa adjusted percentiles
    const alpha = 1 - confidenceLevel;
    const zAlphaLow = this.probitInv(alpha / 2);
    const zAlphaHigh = this.probitInv(1 - alpha / 2);

    const adjLow = this.probitCdf(z0 + (z0 + zAlphaLow) / (1 - a * (z0 + zAlphaLow)));
    const adjHigh = this.probitCdf(z0 + (z0 + zAlphaHigh) / (1 - a * (z0 + zAlphaHigh)));

    // Get percentiles from sorted bootstrap distribution
    const sorted = [...bootstrapDistribution].sort((a, b) => a - b);
    const lo = sorted[Math.max(0, Math.min(nBootstrap - 1, Math.floor(adjLow * nBootstrap)))];
    const hi = sorted[Math.max(0, Math.min(nBootstrap - 1, Math.floor(adjHigh * nBootstrap)))];

    return {
      estimate,
      standardError,
      confidenceInterval: [lo, hi],
      bootstrapDistribution,
      bias,
    };
  }

  /**
   * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
   */
  private probitCdf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + p * absX);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 0.5 * (1 + sign * y);
  }

  /**
   * Inverse standard normal (probit) via rational approximation
   * (Beasley-Springer-Moro algorithm).
   */
  private probitInv(p: number): number {
    if (p <= 0) return -8;
    if (p >= 1) return 8;
    if (p === 0.5) return 0;

    const a = [
      -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
      1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
    ];
    const b = [
      -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
      6.680131188771972e1, -1.328068155288572e1,
    ];
    const c = [
      -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
      -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
    ];
    const d = [
      7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
      3.754408661907416e0,
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q: number, r: number;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (
        ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
      );
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return (
        -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    }
  }

  // ── 3. PCA (Principal Component Analysis) ─────────────────────────────

  /**
   * Principal Component Analysis via eigenvalue decomposition of the
   * covariance matrix. Uses Jacobi eigenvalue algorithm for symmetric matrices.
   *
   * Steps:
   *   1. Mean-center the data
   *   2. Compute covariance matrix C = (1/(N-1)) X^T X
   *   3. Eigendecomposition of C via Jacobi rotations
   *   4. Sort eigenvectors by descending eigenvalue
   *   5. Project data onto top-k components
   *
   * @ref Pearson (1901). "On lines and planes of closest fit."
   * @ref Hotelling (1933). "Analysis of a complex of statistical variables
   *      into principal components."
   */
  pca(input: PCAInput): PCAResult {
    this.totalCalculations++;
    const { data, nComponents: reqComponents } = input;
    const N = data.length;
    const D = data[0].length;
    const nComp = reqComponents ?? D;

    // 1. Mean-center
    const mean = new Array(D).fill(0);
    for (const row of data) {
      for (let j = 0; j < D; j++) mean[j] += row[j];
    }
    for (let j = 0; j < D; j++) mean[j] /= N;

    const centered = data.map((row) => row.map((v, j) => v - mean[j]));

    // 2. Covariance matrix (D x D)
    const cov: number[][] = Array.from({ length: D }, () => new Array(D).fill(0));
    for (const row of centered) {
      for (let i = 0; i < D; i++) {
        for (let j = i; j < D; j++) {
          cov[i][j] += row[i] * row[j];
        }
      }
    }
    const denom = N > 1 ? N - 1 : 1;
    for (let i = 0; i < D; i++) {
      for (let j = i; j < D; j++) {
        cov[i][j] /= denom;
        cov[j][i] = cov[i][j];
      }
    }

    // 3. Jacobi eigenvalue algorithm for symmetric matrix
    const { eigenvalues: rawEig, eigenvectors: rawVec } = this.jacobiEigen(cov, D);

    // 4. Sort by descending eigenvalue
    const indices = rawEig.map((_, i) => i).sort((a, b) => rawEig[b] - rawEig[a]);
    const eigenvalues = indices.slice(0, nComp).map((i) => Math.max(0, rawEig[i]));
    const components = indices.slice(0, nComp).map((i) => {
      const vec: number[] = [];
      for (let d = 0; d < D; d++) vec.push(rawVec[d][i]);
      return vec;
    });

    // Explained variance ratio
    const totalVar = rawEig.reduce((a, b) => a + Math.max(0, b), 0);
    const explainedVarianceRatio = eigenvalues.map((ev) => (totalVar > 0 ? ev / totalVar : 0));
    const cumulativeVariance: number[] = [];
    let cum = 0;
    for (const r of explainedVarianceRatio) {
      cum += r;
      cumulativeVariance.push(cum);
    }

    // 5. Project data
    const projectedData = centered.map((row) => {
      return components.map((comp) => {
        let dot = 0;
        for (let d = 0; d < D; d++) dot += row[d] * comp[d];
        return dot;
      });
    });

    return { components, eigenvalues, explainedVarianceRatio, projectedData, cumulativeVariance };
  }

  /**
   * Jacobi eigenvalue algorithm for real symmetric matrices.
   * Iteratively applies Givens rotations to annihilate off-diagonal elements.
   */
  private jacobiEigen(
    matrix: number[][],
    n: number
  ): { eigenvalues: number[]; eigenvectors: number[][] } {
    // Work on a copy
    const A: number[][] = matrix.map((r) => [...r]);
    // Eigenvectors start as identity
    const V: number[][] = Array.from({ length: n }, (_, i) => {
      const row = new Array(n).fill(0);
      row[i] = 1;
      return row;
    });

    const maxIter = 100 * n * n;
    for (let iter = 0; iter < maxIter; iter++) {
      // Find largest off-diagonal element
      let maxVal = 0;
      let p = 0;
      let q = 1;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(A[i][j]) > maxVal) {
            maxVal = Math.abs(A[i][j]);
            p = i;
            q = j;
          }
        }
      }

      if (maxVal < 1e-12) break; // Converged

      // Compute rotation angle
      const app = A[p][p];
      const aqq = A[q][q];
      const apq = A[p][q];
      let theta: number;
      if (Math.abs(app - aqq) < 1e-15) {
        theta = Math.PI / 4;
      } else {
        theta = 0.5 * Math.atan2(2 * apq, app - aqq);
      }

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Apply rotation to A: A' = G^T A G
      // Update rows/cols p and q
      const newAp = new Array(n);
      const newAq = new Array(n);
      for (let i = 0; i < n; i++) {
        newAp[i] = cosT * A[p][i] + sinT * A[q][i];
        newAq[i] = -sinT * A[p][i] + cosT * A[q][i];
      }
      for (let i = 0; i < n; i++) {
        A[p][i] = newAp[i];
        A[q][i] = newAq[i];
        A[i][p] = newAp[i];
        A[i][q] = newAq[i];
      }
      // Fix diagonal and off-diagonal for p,q
      A[p][p] = cosT * cosT * app + 2 * cosT * sinT * apq + sinT * sinT * aqq;
      A[q][q] = sinT * sinT * app - 2 * cosT * sinT * apq + cosT * cosT * aqq;
      A[p][q] = 0;
      A[q][p] = 0;

      // Update eigenvectors
      for (let i = 0; i < n; i++) {
        const vip = V[i][p];
        const viq = V[i][q];
        V[i][p] = cosT * vip + sinT * viq;
        V[i][q] = -sinT * vip + cosT * viq;
      }
    }

    const eigenvalues = new Array(n);
    for (let i = 0; i < n; i++) eigenvalues[i] = A[i][i];

    return { eigenvalues, eigenvectors: V };
  }

  // ── 4. K-Means Clustering ─────────────────────────────────────────────

  /**
   * K-Means clustering using Lloyd's algorithm with k-means++ initialization.
   *
   * k-means++ selects initial centroids proportional to D(x)^2, where D(x)
   * is the distance from x to the nearest already-chosen centroid.
   *
   * Lloyd's algorithm alternates:
   *   1. Assign each point to nearest centroid
   *   2. Recompute centroids as cluster means
   *
   * @ref Lloyd (1982). "Least squares quantization in PCM."
   * @ref Arthur, Vassilvitskii (2007). "k-means++: The Advantages of
   *      Careful Seeding."
   */
  kMeans(input: KMeansInput): KMeansResult {
    this.totalCalculations++;
    const { data, k, maxIterations, seed } = input;
    const N = data.length;
    const D = data[0].length;
    const rng = this.createRng(seed);

    // k-means++ initialization
    const centroids: number[][] = [];

    // First centroid: random point
    const firstIdx = Math.floor(rng() * N);
    centroids.push([...data[firstIdx]]);

    // Subsequent centroids: proportional to D(x)^2
    for (let c = 1; c < k; c++) {
      const dists = data.map((point) => {
        let minDist = Infinity;
        for (const cent of centroids) {
          const dist = this.squaredEuclidean(point, cent);
          if (dist < minDist) minDist = dist;
        }
        return minDist;
      });

      const totalDist = dists.reduce((a, b) => a + b, 0);
      let r = rng() * totalDist;
      let chosen = 0;
      for (let i = 0; i < N; i++) {
        r -= dists[i];
        if (r <= 0) {
          chosen = i;
          break;
        }
      }
      centroids.push([...data[chosen]]);
    }

    // Lloyd's iterations
    let assignments = new Array(N).fill(0);
    let iterations = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1;
      let changed = false;

      // Assignment step
      for (let i = 0; i < N; i++) {
        let bestCluster = 0;
        let bestDist = Infinity;
        for (let c = 0; c < k; c++) {
          const dist = this.squaredEuclidean(data[i], centroids[c]);
          if (dist < bestDist) {
            bestDist = dist;
            bestCluster = c;
          }
        }
        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      if (!changed) break;

      // Update step: recompute centroids
      const sums: number[][] = Array.from({ length: k }, () => new Array(D).fill(0));
      const counts = new Array(k).fill(0);
      for (let i = 0; i < N; i++) {
        const c = assignments[i];
        counts[c]++;
        for (let d = 0; d < D; d++) sums[c][d] += data[i][d];
      }
      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          for (let d = 0; d < D; d++) centroids[c][d] = sums[c][d] / counts[c];
        }
      }
    }

    // Compute inertia
    let inertia = 0;
    for (let i = 0; i < N; i++) {
      inertia += this.squaredEuclidean(data[i], centroids[assignments[i]]);
    }

    // Cluster sizes
    const clusterSizes = new Array(k).fill(0);
    for (const a of assignments) clusterSizes[a]++;

    return { centroids, assignments, inertia, iterations, clusterSizes };
  }

  /** Squared Euclidean distance between two vectors. */
  private squaredEuclidean(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return sum;
  }

  // ── 5. Logistic Regression ────────────────────────────────────────────

  /**
   * Binary logistic regression via gradient descent on cross-entropy loss
   * with optional L2 regularization.
   *
   * Model: P(y=1|x) = sigma(w^T x + b), sigma(z) = 1/(1+e^-z)
   *
   * Loss: L = -(1/N) sum[y*log(p) + (1-y)*log(1-p)] + (lambda/2)||w||^2
   *
   * Gradients:
   *   dL/dw = (1/N) X^T (p - y) + lambda * w
   *   dL/db = (1/N) sum(p - y)
   *
   * @ref Cox (1958). "The regression analysis of binary sequences."
   */
  logisticRegression(input: LogRegInput): LogRegResult {
    this.totalCalculations++;
    const { X, y, learningRate = 0.01, maxIterations = 1000, lambda = 0 } = input;
    const N = X.length;
    const D = X[0].length;

    const weights = new Array(D).fill(0);
    let bias = 0;
    const lossHistory: number[] = [];

    for (let iter = 0; iter < maxIterations; iter++) {
      // Forward pass: compute predictions
      const probs: number[] = [];
      for (let i = 0; i < N; i++) {
        let z = bias;
        for (let d = 0; d < D; d++) z += weights[d] * X[i][d];
        probs.push(this.sigmoid(z));
      }

      // Compute cross-entropy loss
      let loss = 0;
      for (let i = 0; i < N; i++) {
        const p = Math.max(1e-15, Math.min(1 - 1e-15, probs[i]));
        loss -= y[i] * Math.log(p) + (1 - y[i]) * Math.log(1 - p);
      }
      loss /= N;
      // L2 regularization term
      if (lambda > 0) {
        let wNormSq = 0;
        for (let d = 0; d < D; d++) wNormSq += weights[d] ** 2;
        loss += (lambda / 2) * wNormSq;
      }
      lossHistory.push(loss);

      // Gradients
      const gradW = new Array(D).fill(0);
      let gradB = 0;
      for (let i = 0; i < N; i++) {
        const err = probs[i] - y[i];
        for (let d = 0; d < D; d++) gradW[d] += err * X[i][d];
        gradB += err;
      }
      for (let d = 0; d < D; d++) {
        gradW[d] = gradW[d] / N + lambda * weights[d];
      }
      gradB /= N;

      // Update
      for (let d = 0; d < D; d++) weights[d] -= learningRate * gradW[d];
      bias -= learningRate * gradB;
    }

    // Final predictions
    const predictions: number[] = [];
    let correct = 0;
    for (let i = 0; i < N; i++) {
      let z = bias;
      for (let d = 0; d < D; d++) z += weights[d] * X[i][d];
      const p = this.sigmoid(z);
      predictions.push(p);
      if ((p >= 0.5 ? 1 : 0) === y[i]) correct++;
    }
    const accuracy = correct / N;

    return { weights, bias, predictions, accuracy, lossHistory };
  }

  /** Sigmoid activation: 1/(1+e^-z) with numerical stability. */
  private sigmoid(z: number): number {
    if (z >= 0) {
      return 1 / (1 + Math.exp(-z));
    } else {
      const ez = Math.exp(z);
      return ez / (1 + ez);
    }
  }

  // ── 6. Wavelet Transform (Haar) ───────────────────────────────────────

  /**
   * Discrete Wavelet Transform using the Haar wavelet basis.
   *
   * Haar wavelet:
   *   psi(t) = +1 for 0 <= t < 0.5, -1 for 0.5 <= t < 1, 0 otherwise
   *
   * Decomposition at each level:
   *   approximation[k] = (signal[2k] + signal[2k+1]) / sqrt(2)
   *   detail[k]        = (signal[2k] - signal[2k+1]) / sqrt(2)
   *
   * Reconstruction (inverse):
   *   signal[2k]   = (approximation[k] + detail[k]) / sqrt(2)
   *   signal[2k+1] = (approximation[k] - detail[k]) / sqrt(2)
   *
   * @ref Haar (1909). "Zur Theorie der orthogonalen Funktionensysteme."
   * @ref Mallat (1989). "A theory for multiresolution signal decomposition."
   */
  waveletTransform(input: WaveletInput): WaveletResult {
    this.totalCalculations++;
    const { signal } = input;

    // Pad signal to next power of 2 if needed
    let len = signal.length;
    let padLen = 1;
    while (padLen < len) padLen *= 2;
    const padded = [...signal];
    while (padded.length < padLen) padded.push(0);

    const maxLevels = Math.floor(Math.log2(padLen));
    const levels = input.levels ?? maxLevels;
    const actualLevels = Math.min(levels, maxLevels);

    const sqrt2 = Math.SQRT2;
    const details: number[][] = [];
    let approx = [...padded];

    // Forward transform: decompose level by level
    for (let l = 0; l < actualLevels; l++) {
      const n = approx.length;
      if (n < 2) break;
      const half = n / 2;
      const newApprox: number[] = [];
      const newDetail: number[] = [];

      for (let k = 0; k < half; k++) {
        newApprox.push((approx[2 * k] + approx[2 * k + 1]) / sqrt2);
        newDetail.push((approx[2 * k] - approx[2 * k + 1]) / sqrt2);
      }

      details.push(newDetail);
      approx = newApprox;
    }

    // Inverse transform: reconstruct from approximation + details
    let reconstructed = [...approx];
    for (let l = details.length - 1; l >= 0; l--) {
      const detail = details[l];
      const n = reconstructed.length;
      const newSignal: number[] = [];
      for (let k = 0; k < n; k++) {
        newSignal.push((reconstructed[k] + detail[k]) / sqrt2);
        newSignal.push((reconstructed[k] - detail[k]) / sqrt2);
      }
      reconstructed = newSignal;
    }

    // Trim reconstruction to original signal length
    reconstructed = reconstructed.slice(0, signal.length);

    // Energy by level: sum of squared coefficients / total energy
    const totalEnergy =
      approx.reduce((a, v) => a + v * v, 0) +
      details.reduce((a, d) => a + d.reduce((s, v) => s + v * v, 0), 0);

    const energyByLevel = details.map((d) => {
      const levelEnergy = d.reduce((s, v) => s + v * v, 0);
      return totalEnergy > 0 ? levelEnergy / totalEnergy : 0;
    });

    return {
      approximation: approx,
      details,
      reconstructed,
      energyByLevel,
    };
  }

  // ── 7. CUSUM & EWMA Control Charts ───────────────────────────────────

  /**
   * CUSUM (Cumulative Sum) and EWMA (Exponentially Weighted Moving Average)
   * control charts for statistical process monitoring.
   *
   * CUSUM (Page 1954):
   *   C+(i) = max(0, x(i) - (mu0 + K) + C+(i-1))
   *   C-(i) = max(0, (mu0 - K) - x(i) + C-(i-1))
   *   Signal when C+(i) > H or C-(i) > H
   *
   * EWMA (Roberts 1959):
   *   Z(i) = lambda * x(i) + (1 - lambda) * Z(i-1), Z(0) = mu0
   *   UCL(i) = mu0 + L * sigma * sqrt(lambda/(2-lambda) * (1-(1-lambda)^(2i)))
   *   LCL(i) = mu0 - L * sigma * sqrt(lambda/(2-lambda) * (1-(1-lambda)^(2i)))
   *
   * @ref Page (1954). "Continuous inspection schemes."
   * @ref Roberts (1959). "Control chart tests based on geometric moving averages."
   */
  controlChart(input: ControlChartInput): ControlChartResult {
    this.totalCalculations++;
    const { data, target, sigma, type } = input;
    const n = data.length;
    const cusumK = input.cusumK ?? 0.5 * sigma;
    const cusumH = input.cusumH ?? 5 * sigma;
    const ewmaLambda = input.ewmaLambda ?? 0.2;
    const ewmaL = input.ewmaL ?? 3;

    const cusumUpper: number[] = [];
    const cusumLower: number[] = [];
    const ewmaValues: number[] = [];
    const ewmaUCL: number[] = [];
    const ewmaLCL: number[] = [];
    const outOfControlIndices: number[] = [];
    const alarmPoints: { index: number; type: string; value: number }[] = [];

    const oocSet = new Set<number>();

    // CUSUM
    if (type === "cusum" || type === "both") {
      let cPlus = 0;
      let cMinus = 0;

      for (let i = 0; i < n; i++) {
        cPlus = Math.max(0, data[i] - (target + cusumK) + cPlus);
        cMinus = Math.max(0, (target - cusumK) - data[i] + cMinus);

        cusumUpper.push(cPlus);
        cusumLower.push(cMinus);

        if (cPlus > cusumH) {
          oocSet.add(i);
          alarmPoints.push({ index: i, type: "cusum_upper", value: cPlus });
        }
        if (cMinus > cusumH) {
          oocSet.add(i);
          alarmPoints.push({ index: i, type: "cusum_lower", value: cMinus });
        }
      }
    }

    // EWMA
    if (type === "ewma" || type === "both") {
      let z = target; // Z(0) = mu0

      for (let i = 0; i < n; i++) {
        z = ewmaLambda * data[i] + (1 - ewmaLambda) * z;
        ewmaValues.push(z);

        // Control limits with exact variance (time-varying)
        const factor = Math.sqrt(
          (ewmaLambda / (2 - ewmaLambda)) * (1 - Math.pow(1 - ewmaLambda, 2 * (i + 1)))
        );
        const ucl = target + ewmaL * sigma * factor;
        const lcl = target - ewmaL * sigma * factor;
        ewmaUCL.push(ucl);
        ewmaLCL.push(lcl);

        if (z > ucl) {
          oocSet.add(i);
          alarmPoints.push({ index: i, type: "ewma_upper", value: z });
        }
        if (z < lcl) {
          oocSet.add(i);
          alarmPoints.push({ index: i, type: "ewma_lower", value: z });
        }
      }
    }

    // Collect unique out-of-control indices, sorted
    for (const idx of oocSet) outOfControlIndices.push(idx);
    outOfControlIndices.sort((a, b) => a - b);

    return {
      cusumUpper,
      cusumLower,
      ewmaValues,
      ewmaUCL,
      ewmaLCL,
      outOfControlIndices,
      alarmPoints,
    };
  }

  // ── Stats ─────────────────────────────────────────────────────────────

  /**
   * Returns engine metadata: available methods and total calculations performed.
   */
  stats(): { methods: string[]; totalCalculations: number } {
    return {
      methods: [
        "mcmc (Metropolis-Hastings MCMC)",
        "bootstrap (BCa Bootstrap Resampling)",
        "pca (Principal Component Analysis)",
        "kMeans (K-Means Clustering with k-means++)",
        "logisticRegression (Binary Logistic Regression)",
        "waveletTransform (Haar Discrete Wavelet Transform)",
        "controlChart (CUSUM & EWMA Control Charts)",
      ],
      totalCalculations: this.totalCalculations,
    };
  }
}
