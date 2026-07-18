/**
 * InformationTheoryEngine — Entropy-based process monitoring for CNC machining.
 *
 * Implements 5 information-theoretic measures:
 *   1. Shannon entropy — signal stability assessment
 *   2. Mutual information — sensor channel redundancy
 *   3. KL divergence — distribution drift detection
 *   4. Transfer entropy — causal direction between channels
 *   5. Sample entropy (SampEn) — time-series regularity
 *
 * @module InformationTheoryEngine
 */

// ── Interfaces ──────────────────────────────────────────────────────────────

type MeasureType = "shannon" | "mutual_info" | "kl_divergence" | "transfer_entropy" | "sample_entropy";

interface InfoTheoryInput {
  signal_x: number[];
  signal_y?: number[];
  reference_signal?: number[];
  n_bins?: number;
  sample_entropy_m?: number;
  sample_entropy_r?: number;
  transfer_entropy_lag?: number;
  measures?: MeasureType[];
}

interface ShannonResult {
  value: number;
  max_possible: number;
  normalized: number;
  stability: "stable" | "moderate" | "chaotic";
}

interface MutualInfoResult {
  value: number;
  normalized: number;
  redundancy: "high" | "medium" | "low";
}

interface KLDivergenceResult {
  value: number;
  drift_detected: boolean;
  drift_severity: "none" | "mild" | "moderate" | "severe";
}

interface TransferEntropyResult {
  x_to_y: number;
  y_to_x: number;
  dominant_direction: "x→y" | "y→x" | "bidirectional" | "independent";
  causality_strength: number;
}

interface SampleEntropyResult {
  value: number;
  complexity: "regular" | "moderate" | "complex" | "random";
}

interface InfoTheoryResult {
  shannon_entropy?: ShannonResult;
  mutual_information?: MutualInfoResult;
  kl_divergence?: KLDivergenceResult;
  transfer_entropy?: TransferEntropyResult;
  sample_entropy?: SampleEntropyResult;
  process_health_score: number;
  warnings: string[];
  formula: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_BINS = 20;
const DEFAULT_M = 2;
const DEFAULT_R = 0.2;
const DEFAULT_LAG = 1;
const EPSILON = 1e-12;
const MIN_SIGNAL_LENGTH = 10;
const MIN_SAMPEN_LENGTH = 30;

// ── Engine ──────────────────────────────────────────────────────────────────

export class InformationTheoryEngine {
  /**
   * Build a normalized histogram (probability distribution) from a signal.
   * Values are binned uniformly across [min, max].
   */
  histogram(signal: number[], bins: number): number[] {
    const n = signal.length;
    if (n === 0) return [];
    const min = Math.min(...signal);
    const max = Math.max(...signal);
    const range = max - min;
    const counts = new Array<number>(bins).fill(0);

    if (range === 0) {
      // Constant signal — all mass in one bin
      counts[0] = n;
    } else {
      for (const v of signal) {
        const idx = Math.min(Math.floor(((v - min) / range) * bins), bins - 1);
        counts[idx]++;
      }
    }
    return counts.map((c) => c / n);
  }

  /**
   * Build a 2-D joint histogram for two signals. Returns a flat array of
   * bins_x * bins_y probabilities (row-major).
   */
  private jointHistogram(x: number[], y: number[], bins: number): number[] {
    const n = x.length;
    const joint = new Array<number>(bins * bins).fill(0);
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    const yMin = Math.min(...y);
    const yMax = Math.max(...y);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    for (let i = 0; i < n; i++) {
      const xi = Math.min(Math.floor(((x[i] - xMin) / xRange) * bins), bins - 1);
      const yi = Math.min(Math.floor(((y[i] - yMin) / yRange) * bins), bins - 1);
      joint[xi * bins + yi]++;
    }
    return joint.map((c) => c / n);
  }

  /**
   * Shannon entropy: H(X) = -Σ p(x) log₂ p(x)
   */
  shannonEntropy(signal: number[], bins: number = DEFAULT_BINS): number {
    const p = this.histogram(signal, bins);
    let h = 0;
    for (const px of p) {
      if (px > EPSILON) {
        h -= px * Math.log2(px);
      }
    }
    return h;
  }

  /**
   * Mutual information: I(X;Y) = H(X) + H(Y) - H(X,Y)
   */
  mutualInformation(x: number[], y: number[], bins: number = DEFAULT_BINS): number {
    const hx = this.shannonEntropy(x, bins);
    const hy = this.shannonEntropy(y, bins);
    const joint = this.jointHistogram(x, y, bins);

    let hxy = 0;
    for (const p of joint) {
      if (p > EPSILON) {
        hxy -= p * Math.log2(p);
      }
    }
    return Math.max(0, hx + hy - hxy);
  }

  /**
   * KL divergence: D_KL(P||Q) = Σ P(x) log(P(x)/Q(x))
   * Uses the same bin edges derived from p's signal range applied to q.
   */
  klDivergence(p: number[], q: number[], bins: number = DEFAULT_BINS): number {
    const pDist = this.histogram(p, bins);
    const qDist = this.histogram(q, bins);
    let dkl = 0;
    for (let i = 0; i < bins; i++) {
      const pi = pDist[i];
      const qi = qDist[i];
      if (pi > EPSILON) {
        // Smoothing: avoid log(0) by clamping q
        dkl += pi * Math.log2(pi / Math.max(qi, EPSILON));
      }
    }
    return Math.max(0, dkl);
  }

  /**
   * Transfer entropy: TE(X→Y) = H(Y_{t+1}|Y_t) - H(Y_{t+1}|Y_t, X_t)
   *
   * Estimated via histogram-based conditional entropies:
   *   TE = H(Y_{t+1}, Y_t) - H(Y_t) - H(Y_{t+1}, Y_t, X_t) + H(Y_t, X_t)
   */
  transferEntropy(x: number[], y: number[], lag: number = DEFAULT_LAG, bins: number = DEFAULT_BINS): number {
    const n = Math.min(x.length, y.length) - lag;
    if (n < MIN_SIGNAL_LENGTH) return 0;

    const yt = y.slice(0, n);
    const yt1 = y.slice(lag, lag + n);
    const xt = x.slice(0, n);

    // H(Y_{t+1}, Y_t)
    const hYt1Yt = this.jointEntropy2(yt1, yt, bins);
    // H(Y_t)
    const hYt = this.shannonEntropy(yt, bins);
    // H(Y_{t+1}, Y_t, X_t)
    const hYt1YtXt = this.jointEntropy3(yt1, yt, xt, bins);
    // H(Y_t, X_t)
    const hYtXt = this.jointEntropy2(yt, xt, bins);

    return Math.max(0, hYt1Yt - hYt - hYt1YtXt + hYtXt);
  }

  /**
   * Sample entropy (SampEn): regularity measure for time-series.
   * Counts template matches of length m and m+1 within tolerance r * std(signal).
   * Lower values = more regular.
   */
  sampleEntropy(signal: number[], m: number = DEFAULT_M, r: number = DEFAULT_R): number {
    const n = signal.length;
    if (n < MIN_SAMPEN_LENGTH) return 0;

    const std = this.standardDeviation(signal);
    if (std === 0) return 0; // constant signal — perfectly regular
    const tolerance = r * std;

    let countM = 0;
    let countM1 = 0;

    for (let i = 0; i < n - m; i++) {
      for (let j = i + 1; j < n - m; j++) {
        // Check m-length match
        let matchM = true;
        for (let k = 0; k < m; k++) {
          if (Math.abs(signal[i + k] - signal[j + k]) > tolerance) {
            matchM = false;
            break;
          }
        }
        if (matchM) {
          countM++;
          // Check (m+1)-length match
          if (i + m < n && j + m < n && Math.abs(signal[i + m] - signal[j + m]) <= tolerance) {
            countM1++;
          }
        }
      }
    }

    if (countM === 0) return Infinity;
    return -Math.log(countM1 / countM);
  }

  /**
   * Run requested information-theoretic measures and produce a composite result.
   */
  analyze(input: InfoTheoryInput): InfoTheoryResult {
    const bins = input.n_bins ?? DEFAULT_BINS;
    const measures = input.measures ?? ["shannon", "mutual_info", "kl_divergence", "transfer_entropy", "sample_entropy"];
    const warnings: string[] = [];
    const formulas: string[] = [];
    const result: InfoTheoryResult = { process_health_score: 100, warnings, formula: "" };

    const scores: number[] = [];

    if (input.signal_x.length < MIN_SIGNAL_LENGTH) {
      warnings.push(`signal_x has only ${input.signal_x.length} samples; minimum recommended is ${MIN_SIGNAL_LENGTH}`);
    }

    // ── Shannon entropy ──
    if (measures.includes("shannon")) {
      const h = this.shannonEntropy(input.signal_x, bins);
      const maxH = Math.log2(bins);
      const norm = maxH > 0 ? h / maxH : 0;
      const stability: ShannonResult["stability"] = norm < 0.3 ? "stable" : norm < 0.7 ? "moderate" : "chaotic";
      result.shannon_entropy = { value: h, max_possible: maxH, normalized: round(norm), stability };
      formulas.push("H(X) = -Σ p(x) log₂ p(x)");
      // Chaotic → penalise health
      scores.push(Math.max(0, 100 - norm * 100));
    }

    // ── Mutual information ──
    if (measures.includes("mutual_info")) {
      if (!input.signal_y) {
        warnings.push("mutual_info requires signal_y; skipped");
      } else {
        const mi = this.mutualInformation(input.signal_x, input.signal_y, bins);
        const hx = this.shannonEntropy(input.signal_x, bins);
        const hy = this.shannonEntropy(input.signal_y, bins);
        const maxMI = Math.min(hx, hy) || 1;
        const norm = Math.min(mi / maxMI, 1);
        const redundancy: MutualInfoResult["redundancy"] = norm > 0.7 ? "high" : norm > 0.3 ? "medium" : "low";
        result.mutual_information = { value: round(mi), normalized: round(norm), redundancy };
        formulas.push("I(X;Y) = H(X) + H(Y) - H(X,Y)");
        scores.push(norm * 100); // Higher MI = more sensor agreement = healthier
      }
    }

    // ── KL divergence ──
    if (measures.includes("kl_divergence")) {
      if (!input.reference_signal) {
        warnings.push("kl_divergence requires reference_signal; skipped");
      } else {
        const dkl = this.klDivergence(input.signal_x, input.reference_signal, bins);
        const severity: KLDivergenceResult["drift_severity"] =
          dkl < 0.1 ? "none" : dkl < 0.5 ? "mild" : dkl < 2.0 ? "moderate" : "severe";
        result.kl_divergence = {
          value: round(dkl),
          drift_detected: dkl >= 0.1,
          drift_severity: severity,
        };
        formulas.push("D_KL(P||Q) = Σ P(x) log₂(P(x)/Q(x))");
        // Lower divergence = healthier
        scores.push(Math.max(0, 100 - Math.min(dkl, 5) * 20));
      }
    }

    // ── Transfer entropy ──
    if (measures.includes("transfer_entropy")) {
      if (!input.signal_y) {
        warnings.push("transfer_entropy requires signal_y; skipped");
      } else {
        const lag = input.transfer_entropy_lag ?? DEFAULT_LAG;
        const teXY = this.transferEntropy(input.signal_x, input.signal_y, lag, bins);
        const teYX = this.transferEntropy(input.signal_y, input.signal_x, lag, bins);
        const ratio = (teXY + EPSILON) / (teYX + EPSILON);
        const strength = Math.abs(teXY - teYX);

        let direction: TransferEntropyResult["dominant_direction"];
        if (ratio > 2) direction = "x→y";
        else if (ratio < 0.5) direction = "y→x";
        else if (teXY > 0.05 && teYX > 0.05) direction = "bidirectional";
        else direction = "independent";

        result.transfer_entropy = {
          x_to_y: round(teXY),
          y_to_x: round(teYX),
          dominant_direction: direction,
          causality_strength: round(strength),
        };
        formulas.push("TE(X→Y) = H(Y_{t+1}|Y_t) - H(Y_{t+1}|Y_t,X_t)");
        // Strong unidirectional causality is healthy (predictable), independence is neutral
        scores.push(direction === "independent" ? 70 : 85);
      }
    }

    // ── Sample entropy ──
    if (measures.includes("sample_entropy")) {
      const m = input.sample_entropy_m ?? DEFAULT_M;
      const r = input.sample_entropy_r ?? DEFAULT_R;
      if (input.signal_x.length < MIN_SAMPEN_LENGTH) {
        warnings.push(`sample_entropy requires at least ${MIN_SAMPEN_LENGTH} samples; skipped`);
      } else {
        const se = this.sampleEntropy(input.signal_x, m, r);
        const complexity: SampleEntropyResult["complexity"] =
          se < 0.5 ? "regular" : se < 1.5 ? "moderate" : se < 2.5 ? "complex" : "random";
        result.sample_entropy = { value: round(se), complexity };
        formulas.push("SampEn(m,r,N) = -ln(A/B)");
        scores.push(se < 1.5 ? 90 : se < 2.5 ? 60 : 30);
      }
    }

    // ── Composite health score ──
    result.process_health_score = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 100;

    result.formula = formulas.join(" | ");
    return result;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /** Joint entropy of two signals via 2-D histogram. */
  private jointEntropy2(a: number[], b: number[], bins: number): number {
    const joint = this.jointHistogram(a, b, bins);
    let h = 0;
    for (const p of joint) {
      if (p > EPSILON) h -= p * Math.log2(p);
    }
    return h;
  }

  /** Joint entropy of three signals via 3-D histogram. */
  private jointEntropy3(a: number[], b: number[], c: number[], bins: number): number {
    const n = a.length;
    const total = bins * bins * bins;
    const counts = new Array<number>(total).fill(0);

    const minA = Math.min(...a), maxA = Math.max(...a), rA = maxA - minA || 1;
    const minB = Math.min(...b), maxB = Math.max(...b), rB = maxB - minB || 1;
    const minC = Math.min(...c), maxC = Math.max(...c), rC = maxC - minC || 1;

    for (let i = 0; i < n; i++) {
      const ai = Math.min(Math.floor(((a[i] - minA) / rA) * bins), bins - 1);
      const bi = Math.min(Math.floor(((b[i] - minB) / rB) * bins), bins - 1);
      const ci = Math.min(Math.floor(((c[i] - minC) / rC) * bins), bins - 1);
      counts[ai * bins * bins + bi * bins + ci]++;
    }

    let h = 0;
    for (const cnt of counts) {
      const p = cnt / n;
      if (p > EPSILON) h -= p * Math.log2(p);
    }
    return h;
  }

  /** Standard deviation of a signal. */
  private standardDeviation(signal: number[]): number {
    const n = signal.length;
    if (n < 2) return 0;
    const mean = signal.reduce((a, b) => a + b, 0) / n;
    const variance = signal.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
    return Math.sqrt(variance);
  }
}

/** Round to 6 decimal places for clean output. */
function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

export const informationTheoryEngine = new InformationTheoryEngine();
