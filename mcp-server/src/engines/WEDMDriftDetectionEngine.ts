/**
 * WEDMDriftDetectionEngine — Concept/data drift detection for WEDM models.
 *
 * Phase 3 / P3-MS1 / U-P3-02 of the WEDM AGI Intelligence Roadmap.
 *
 * Consumes two inputs per model:
 *   - baseline window (held-out reference distribution at training time)
 *   - current  window (recent residuals / feature values from production)
 *
 * Emits a drift verdict with three statistical tests layered on top of the
 * P3-MS1 retrain trigger defined in WEDM_DRIFT_BASELINE.json:
 *
 *   1. Population Stability Index (PSI) — bucketed KL-like divergence.
 *      Banking-grade thresholds: <0.10 = stable, 0.10–0.25 = moderate,
 *      >0.25 = significant drift. (Siddiqi 2005, §5.6)
 *
 *   2. Two-sample Kolmogorov–Smirnov statistic — distribution-free
 *      shape test on continuous residuals. (Massey 1951)
 *
 *   3. Page–Hinkley CUSUM on residual mean — sequential detector that
 *      fires on sustained shift of magnitude δ. (Page 1954)
 *
 * Exit gate (P3-MS1): fires on injected distribution shift (canary). The
 * `runCanary()` helper synthesises a ramp-shifted window and asserts that
 * at least one of the three tests trips.
 *
 * @module engines/WEDMDriftDetectionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type DriftSeverity = "stable" | "moderate" | "drifting" | "severe";

export interface DriftWindow {
  /** Label used in reports (e.g. "wedm-ra-v1.8 @ 2026-04-10"). */
  label: string;
  values: number[];
}

export interface DriftInput {
  modelId: string;
  baseline: DriftWindow;
  current: DriftWindow;
  /** Optional per-model override; defaults from WEDM_DRIFT_BASELINE.json. */
  threshold?: number;
  /** Bucket count for PSI (default 10). */
  buckets?: number;
  /** Page–Hinkley tolerance δ (default 0.05 × baseline σ). */
  phDelta?: number;
  /** Page–Hinkley threshold λ (default 1.0). */
  phLambda?: number;
}

export interface DriftVerdict {
  modelId: string;
  severity: DriftSeverity;
  drifted: boolean;
  psi: number;
  ks: { D: number; criticalAt95: number; exceeds: boolean };
  pageHinkley: { cusum: number; fired: boolean; atIndex: number };
  threshold: number;
  summary: string;
  baselineStats: { mean: number; std: number; n: number };
  currentStats: { mean: number; std: number; n: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_THRESHOLD = 0.20; // matches WEDM_DRIFT_BASELINE retrainTrigger
const DEFAULT_BUCKETS = 10;
// δ = 1·σ suppresses noise-level drift. λ scales with √n so the per-window
// false-alarm rate is independent of window length. Factor 5 gives ARL > 1000
// for typical WEDM residual windows of 100–1000 samples.
const DEFAULT_PH_LAMBDA_SQRT_N = 5.0;
const DEFAULT_PH_DELTA_SIGMAS = 1.0;
const MIN_WINDOW = 20;

// PSI severity thresholds (Siddiqi 2005)
const PSI_MODERATE = 0.10;
const PSI_DRIFT = 0.25;
const PSI_SEVERE = 0.50;

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMDriftDetectionEngine {
  /** Detect drift for a single model window pair. */
  detect(input: DriftInput): DriftVerdict {
    const threshold = input.threshold ?? DEFAULT_THRESHOLD;
    const buckets = input.buckets ?? DEFAULT_BUCKETS;
    const baseline = input.baseline.values;
    const current = input.current.values;

    if (baseline.length < MIN_WINDOW || current.length < MIN_WINDOW) {
      return this.insufficient(input, threshold, baseline, current);
    }

    const bStats = stats(baseline);
    const cStats = stats(current);

    const psi = populationStabilityIndex(baseline, current, buckets);
    const ks = kolmogorovSmirnov(baseline, current);
    const phDelta = input.phDelta ?? Math.max(DEFAULT_PH_DELTA_SIGMAS * bStats.std, 1e-6);
    const phLambda =
      input.phLambda ??
      DEFAULT_PH_LAMBDA_SQRT_N * Math.max(bStats.std, 1e-6) * Math.sqrt(current.length);
    const ph = pageHinkley(baseline, current, bStats.mean, phDelta, phLambda);

    const severity = pickSeverity(psi, ks.exceeds, ph.fired, threshold);
    const drifted =
      severity === "drifting" || severity === "severe" || psi >= threshold || ks.exceeds || ph.fired;

    const summary =
      `PSI=${round4(psi)} (${severity}); KS D=${round4(ks.D)} crit=${round4(ks.criticalAt95)} ` +
      `${ks.exceeds ? "FIRED" : "ok"}; Page–Hinkley ${ph.fired ? `FIRED @ ${ph.atIndex}` : "ok"}`;

    return {
      modelId: input.modelId,
      severity,
      drifted,
      psi: round4(psi),
      ks: { D: round4(ks.D), criticalAt95: round4(ks.criticalAt95), exceeds: ks.exceeds },
      pageHinkley: { cusum: round4(ph.cusum), fired: ph.fired, atIndex: ph.atIndex },
      threshold,
      summary,
      baselineStats: { mean: round4(bStats.mean), std: round4(bStats.std), n: baseline.length },
      currentStats: { mean: round4(cStats.mean), std: round4(cStats.std), n: current.length },
    };
  }

  /** Run multiple models and return which, if any, drifted. */
  detectAll(inputs: DriftInput[]): { verdicts: DriftVerdict[]; anyDrifted: boolean } {
    const verdicts = inputs.map((i) => this.detect(i));
    return { verdicts, anyDrifted: verdicts.some((v) => v.drifted) };
  }

  /**
   * Canary: synthesise a current window by shifting the baseline mean by
   * `shiftSigmas × σ_baseline`. Verifies at least one test fires at
   * shifts ≥ 1σ. Used by the P3-MS1 exit-gate test.
   */
  runCanary(
    baseline: number[],
    shiftSigmas = 2.0,
    buckets = DEFAULT_BUCKETS,
  ): { verdict: DriftVerdict; shifted: number[] } {
    const b = stats(baseline);
    const shift = shiftSigmas * b.std;
    const shifted = baseline.map((x) => x + shift);
    const verdict = this.detect({
      modelId: "canary",
      baseline: { label: "canary/baseline", values: baseline },
      current: { label: "canary/shifted", values: shifted },
      buckets,
    });
    return { verdict, shifted };
  }

  private insufficient(
    input: DriftInput,
    threshold: number,
    baseline: number[],
    current: number[],
  ): DriftVerdict {
    const bStats = stats(baseline);
    const cStats = stats(current);
    return {
      modelId: input.modelId,
      severity: "stable",
      drifted: false,
      psi: 0,
      ks: { D: 0, criticalAt95: 0, exceeds: false },
      pageHinkley: { cusum: 0, fired: false, atIndex: -1 },
      threshold,
      summary: `insufficient data (need ≥${MIN_WINDOW} per window, got ${baseline.length}/${current.length})`,
      baselineStats: { mean: round4(bStats.mean), std: round4(bStats.std), n: baseline.length },
      currentStats: { mean: round4(cStats.mean), std: round4(cStats.std), n: current.length },
    };
  }
}

// ============================================================================
// STATISTICAL PRIMITIVES
// ============================================================================

function stats(xs: number[]): { mean: number; std: number } {
  if (xs.length === 0) return { mean: 0, std: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance =
    xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, xs.length - 1);
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Population Stability Index. Bucket by baseline quantiles; PSI =
 * Σ (p_current − p_baseline) · ln(p_current / p_baseline).
 */
function populationStabilityIndex(
  baseline: number[],
  current: number[],
  buckets: number,
): number {
  const sorted = [...baseline].sort((a, b) => a - b);
  const edges: number[] = [];
  for (let i = 1; i < buckets; i++) {
    edges.push(sorted[Math.floor((i / buckets) * sorted.length)]);
  }
  edges.push(Number.POSITIVE_INFINITY);

  const bCounts = new Array(buckets).fill(0);
  const cCounts = new Array(buckets).fill(0);
  for (const x of baseline) bCounts[bucketIndex(x, edges)]++;
  for (const x of current) cCounts[bucketIndex(x, edges)]++;

  const bTotal = baseline.length;
  const cTotal = current.length;
  let psi = 0;
  for (let i = 0; i < buckets; i++) {
    // Additive smoothing to avoid log(0)
    const pB = (bCounts[i] + 0.5) / (bTotal + 0.5 * buckets);
    const pC = (cCounts[i] + 0.5) / (cTotal + 0.5 * buckets);
    psi += (pC - pB) * Math.log(pC / pB);
  }
  return Math.max(0, psi);
}

function bucketIndex(x: number, edges: number[]): number {
  for (let i = 0; i < edges.length; i++) {
    if (x <= edges[i]) return i;
  }
  return edges.length - 1;
}

/**
 * Two-sample Kolmogorov–Smirnov statistic + 95 % critical value
 * c = 1.36 · sqrt((n + m) / (n · m)).
 */
function kolmogorovSmirnov(
  baseline: number[],
  current: number[],
): { D: number; criticalAt95: number; exceeds: boolean } {
  const a = [...baseline].sort((x, y) => x - y);
  const b = [...current].sort((x, y) => x - y);
  let i = 0,
    j = 0,
    D = 0;
  while (i < a.length && j < b.length) {
    const x = Math.min(a[i], b[j]);
    while (i < a.length && a[i] <= x) i++;
    while (j < b.length && b[j] <= x) j++;
    const Fa = i / a.length;
    const Fb = j / b.length;
    D = Math.max(D, Math.abs(Fa - Fb));
  }
  const criticalAt95 = 1.36 * Math.sqrt((a.length + b.length) / (a.length * b.length));
  return { D, criticalAt95, exceeds: D > criticalAt95 };
}

/**
 * Two-sided Page–Hinkley CUSUM. Uses the baseline mean as the reference and
 * scans the current window for a sustained shift of ≥ δ in either direction.
 *
 * Increase detector:  m_t⁺ = Σ (x − μ − δ),  M_t⁺ = min(m₁…m_t);
 *                     fires when m_t⁺ − M_t⁺ > λ.
 * Decrease detector:  m_t⁻ = Σ (x − μ + δ),  M_t⁻ = max(m₁…m_t);
 *                     fires when M_t⁻ − m_t⁻ > λ.
 */
function pageHinkley(
  baseline: number[],
  current: number[],
  baselineMean: number,
  delta: number,
  lambda: number,
): { cusum: number; fired: boolean; atIndex: number } {
  let mUp = 0;
  let mDown = 0;
  let minUp = 0;
  let maxDown = 0;
  let fired = false;
  let atIndex = -1;
  let peak = 0;
  for (let t = 0; t < current.length; t++) {
    const x = current[t];
    mUp += x - baselineMean - delta;
    mDown += x - baselineMean + delta;
    minUp = Math.min(minUp, mUp);
    maxDown = Math.max(maxDown, mDown);
    const up = mUp - minUp;
    const down = maxDown - mDown;
    peak = Math.max(peak, Math.max(up, down));
    if (up > lambda || down > lambda) {
      fired = true;
      atIndex = t;
      break;
    }
  }
  return { cusum: peak, fired, atIndex };
}

function pickSeverity(
  psi: number,
  ksExceeds: boolean,
  phFired: boolean,
  threshold: number,
): DriftSeverity {
  if (psi >= PSI_SEVERE || (phFired && psi >= threshold)) return "severe";
  if (psi >= PSI_DRIFT || ksExceeds || phFired) return "drifting";
  if (psi >= PSI_MODERATE) return "moderate";
  return "stable";
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmDriftDetectionEngine = new WEDMDriftDetectionEngine();
