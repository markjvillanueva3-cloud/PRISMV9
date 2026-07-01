/**
 * AcousticEmissionMonitoringEngine — AE signal analysis for tool condition monitoring
 *
 * Extracts time- and frequency-domain features from acoustic emission signals,
 * classifies tool condition (fresh → breakage), applies adaptive threshold
 * monitoring, and discriminates AE source mechanisms.
 *
 * References: Dornfeld (1994), Jemielniak (2000), Teti et al. (2010)
 * Safety: Tool breakage detection is safety-critical — false negatives risk
 *         spindle damage, workpiece scrap, and operator injury.
 *
 * @version 1.0.0
 * @module AcousticEmissionMonitoringEngine
 */

// ─── AtomicValue (local pattern) ────────────────────────────────────
interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

// ─── Input / Output Interfaces ──────────────────────────────────────

/** Single AE signal segment with time stamp, raw samples, and sample rate. */
export interface AESignalSegment {
  time_s: number;
  samples: number[];
  sample_rate_hz: number;
}

/** Baseline statistics captured from a fresh tool for adaptive thresholds. */
export interface AEBaseline {
  rms: number;
  kurtosis: number;
  dominant_freq_hz: number;
}

/** Cutting parameters for context-aware classification. */
export interface AECuttingParams {
  speed_m_min: number;
  feed_mm_tooth: number;
  depth_mm: number;
}

/** AE monitoring input configuration. */
export interface AEMonitoringInput {
  signal_segments: AESignalSegment[];
  baseline?: AEBaseline;
  cutting_params?: AECuttingParams;
  thresholds?: { warning_sigma?: number; alarm_sigma?: number };
  analysis_mode?: "features" | "classification" | "monitoring" | "full";
}

/** Per-segment feature vector. */
export interface AEFeatures {
  time_s: number;
  rms: number;
  peak: number;
  energy: number;
  kurtosis: number;
  dominant_freq_hz: number;
  spectral_centroid_hz: number;
  ring_down_count: number;
}

/** Tool condition classification result. */
export interface AEToolCondition {
  state: "fresh" | "normal_wear" | "severe_wear" | "chipping" | "breakage";
  confidence: number;
  evidence: string[];
}

/** AE source discrimination result. */
export interface AESource {
  type: "continuous" | "burst" | "mixed";
  primary_mechanism: "deformation" | "fracture" | "friction" | "chip_breaking";
}

/** RMS trend analysis result. */
export interface AETrend {
  rms_slope: number;
  rms_r_squared: number;
  trend_direction: "stable" | "increasing" | "decreasing" | "sudden_change";
  estimated_remaining_life_pct: number;
}

/** Alarm event. */
export interface AEAlarm {
  time_s: number;
  level: "warning" | "alarm" | "critical";
  reason: string;
}

/** Complete monitoring result. */
export interface AEMonitoringResult {
  features: AEFeatures[];
  tool_condition: AEToolCondition;
  ae_source: AESource;
  trend: AETrend;
  alarms: AEAlarm[];
  recommendations: string[];
}

// ─── FFT Implementation ─────────────────────────────────────────────

/** Cooley-Tukey radix-2 FFT (in-place, power-of-2 length). */
function fftRadix2(re: number[], im: number[]): void {
  const n = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  // Butterfly stages
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = -2 * Math.PI / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < half; j++) {
        const tRe = curRe * re[i + j + half] - curIm * im[i + j + half];
        const tIm = curRe * im[i + j + half] + curIm * re[i + j + half];
        re[i + j + half] = re[i + j] - tRe;
        im[i + j + half] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/** Compute power spectrum. Zero-pads to next power of 2. Returns [freqs, magnitudes]. */
function powerSpectrum(samples: number[], sampleRate: number): { freqs: number[]; mags: number[] } {
  let n = 1;
  while (n < samples.length) n <<= 1;
  const re = new Array(n).fill(0);
  const im = new Array(n).fill(0);
  for (let i = 0; i < samples.length; i++) re[i] = samples[i];
  fftRadix2(re, im);
  const half = n >> 1;
  const freqs: number[] = [];
  const mags: number[] = [];
  for (let i = 0; i < half; i++) {
    freqs.push((i * sampleRate) / n);
    mags.push(Math.sqrt(re[i] * re[i] + im[i] * im[i]) / n);
  }
  return { freqs, mags };
}

// ─── Feature Extraction ─────────────────────────────────────────────

function extractFeatures(seg: AESignalSegment): AEFeatures {
  const s = seg.samples;
  const n = s.length;
  if (n === 0) {
    return { time_s: seg.time_s, rms: 0, peak: 0, energy: 0, kurtosis: 0,
      dominant_freq_hz: 0, spectral_centroid_hz: 0, ring_down_count: 0 };
  }

  // Time-domain
  let sumSq = 0, peak = 0, sum = 0;
  for (let i = 0; i < n; i++) {
    const v = s[i];
    sum += v;
    sumSq += v * v;
    if (Math.abs(v) > peak) peak = Math.abs(v);
  }
  const mean = sum / n;
  const rms = Math.sqrt(sumSq / n);
  const energy = sumSq / seg.sample_rate_hz; // integral of V² over time

  // Kurtosis (excess kurtosis = kurt - 3)
  let m2 = 0, m4 = 0;
  for (let i = 0; i < n; i++) {
    const d = s[i] - mean;
    const d2 = d * d;
    m2 += d2;
    m4 += d2 * d2;
  }
  m2 /= n;
  m4 /= n;
  const kurtosis = m2 > 0 ? (m4 / (m2 * m2)) : 0; // not excess — raw kurtosis

  // Ring-down count: zero-crossings above a threshold (RMS * 0.5)
  const threshold = rms * 0.5;
  let ringDown = 0;
  for (let i = 1; i < n; i++) {
    if ((s[i - 1] < threshold && s[i] >= threshold) ||
        (s[i - 1] >= threshold && s[i] < threshold)) {
      ringDown++;
    }
  }

  // Frequency-domain
  const { freqs, mags } = powerSpectrum(s, seg.sample_rate_hz);
  let maxMag = 0, domFreq = 0, magSum = 0, weightedFreqSum = 0;
  for (let i = 1; i < freqs.length; i++) {
    if (mags[i] > maxMag) { maxMag = mags[i]; domFreq = freqs[i]; }
    magSum += mags[i];
    weightedFreqSum += freqs[i] * mags[i];
  }
  const spectralCentroid = magSum > 0 ? weightedFreqSum / magSum : 0;

  return {
    time_s: seg.time_s, rms, peak, energy, kurtosis,
    dominant_freq_hz: domFreq, spectral_centroid_hz: spectralCentroid,
    ring_down_count: ringDown
  };
}

// ─── Classification ─────────────────────────────────────────────────

function classifyCondition(features: AEFeatures[], baseline?: AEBaseline): AEToolCondition {
  if (features.length === 0) {
    return { state: "fresh", confidence: 0.5, evidence: ["No signal data"] };
  }
  const last = features[features.length - 1];
  const avgRms = features.reduce((a, f) => a + f.rms, 0) / features.length;
  const maxKurt = Math.max(...features.map(f => f.kurtosis));
  const evidence: string[] = [];

  const baseRms = baseline?.rms ?? avgRms * 0.5;
  const rmsRatio = last.rms / (baseRms || 1e-9);

  // Breakage: extreme amplitude, very high kurtosis (>10), rapid onset
  if (maxKurt > 10 && rmsRatio > 5) {
    evidence.push(`Kurtosis ${maxKurt.toFixed(1)} > 10 (burst-type AE)`);
    evidence.push(`RMS ratio ${rmsRatio.toFixed(1)}x baseline`);
    return { state: "breakage", confidence: Math.min(0.98, 0.7 + maxKurt / 100), evidence };
  }
  // Chipping: sudden RMS spike, high kurtosis (>5)
  if (maxKurt > 5 && rmsRatio > 3) {
    evidence.push(`Kurtosis ${maxKurt.toFixed(1)} > 5 (transient spike)`);
    evidence.push(`RMS ratio ${rmsRatio.toFixed(1)}x baseline`);
    return { state: "chipping", confidence: Math.min(0.95, 0.6 + maxKurt / 50), evidence };
  }
  // Severe wear: high RMS, broadband spectrum shift
  if (rmsRatio > 2) {
    evidence.push(`RMS ratio ${rmsRatio.toFixed(1)}x baseline — elevated`);
    evidence.push(`Spectral centroid ${last.spectral_centroid_hz.toFixed(0)} Hz`);
    return { state: "severe_wear", confidence: Math.min(0.9, 0.5 + rmsRatio / 10), evidence };
  }
  // Normal wear: gradual RMS increase, moderate kurtosis
  if (rmsRatio > 1.2) {
    evidence.push(`RMS ratio ${rmsRatio.toFixed(2)}x baseline — moderate increase`);
    return { state: "normal_wear", confidence: 0.7, evidence };
  }
  // Fresh tool
  evidence.push(`RMS ratio ${rmsRatio.toFixed(2)}x — within baseline range`);
  return { state: "fresh", confidence: 0.8, evidence };
}

// ─── Source Discrimination ──────────────────────────────────────────

function discriminateSource(features: AEFeatures[]): AESource {
  if (features.length === 0) {
    return { type: "continuous", primary_mechanism: "deformation" };
  }
  const avgKurt = features.reduce((a, f) => a + f.kurtosis, 0) / features.length;
  const maxKurt = Math.max(...features.map(f => f.kurtosis));
  const avgDomFreq = features.reduce((a, f) => a + f.dominant_freq_hz, 0) / features.length;

  // Burst type: high kurtosis indicates transient events (fracture AE)
  const isBurst = maxKurt > 8;
  const isContinuous = avgKurt < 4;

  const type = isBurst && isContinuous ? "mixed" : isBurst ? "burst" : "continuous";

  // Mechanism discrimination by frequency range
  let mechanism: AESource["primary_mechanism"];
  if (isBurst && avgDomFreq > 500_000) {
    mechanism = "fracture";         // broadband, >500 kHz → tool breakage
  } else if (avgDomFreq >= 100_000 && avgDomFreq <= 300_000) {
    mechanism = "chip_breaking";    // 100-300 kHz → chip formation
  } else if (avgDomFreq < 100_000) {
    mechanism = "friction";         // low-frequency → rubbing/friction
  } else {
    mechanism = "deformation";      // default continuous plastic deformation
  }

  return { type, primary_mechanism: mechanism };
}

// ─── Trend Analysis (linear regression on RMS) ──────────────────────

function analyzeTrend(features: AEFeatures[], baseline?: AEBaseline): AETrend {
  const n = features.length;
  if (n < 2) {
    return {
      rms_slope: 0, rms_r_squared: 0,
      trend_direction: "stable", estimated_remaining_life_pct: 100
    };
  }
  const xs = features.map(f => f.time_s);
  const ys = features.map(f => f.rms);
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i];
    sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; syy += ys[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  const yMean = sy / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssTot += (ys[i] - yMean) ** 2;
    ssRes += (ys[i] - (slope * xs[i] + intercept)) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Sudden change: check if last RMS deviates from prediction by >3σ
  const residuals = ys.map((y, i) => y - (slope * xs[i] + intercept));
  const residStd = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / n);
  const lastResid = Math.abs(residuals[n - 1]);
  const isSudden = lastResid > 3 * residStd && residStd > 0;

  let direction: AETrend["trend_direction"];
  if (isSudden) direction = "sudden_change";
  else if (slope > 0.01 && r2 > 0.5) direction = "increasing";
  else if (slope < -0.01 && r2 > 0.5) direction = "decreasing";
  else direction = "stable";

  // Estimated remaining life: extrapolate to alarm threshold (3σ above baseline)
  const baseRms = baseline?.rms ?? ys[0];
  const alarmLevel = baseRms * 3;
  let remainingPct = 100;
  if (slope > 0 && ys[n - 1] < alarmLevel) {
    const currentRms = ys[n - 1];
    remainingPct = Math.max(0, Math.min(100,
      ((alarmLevel - currentRms) / (alarmLevel - baseRms)) * 100));
  } else if (ys[n - 1] >= alarmLevel) {
    remainingPct = 0;
  }

  return {
    rms_slope: slope, rms_r_squared: r2,
    trend_direction: direction,
    estimated_remaining_life_pct: remainingPct
  };
}

// ─── Threshold Monitoring ───────────────────────────────────────────

function checkThresholds(
  features: AEFeatures[],
  baseline: AEBaseline | undefined,
  warnSigma: number,
  alarmSigma: number
): AEAlarm[] {
  if (features.length === 0) return [];
  const rmsValues = features.map(f => f.rms);
  const baseMean = baseline?.rms
    ?? (rmsValues.reduce((a, v) => a + v, 0) / rmsValues.length);
  const variance = rmsValues.reduce(
    (a, v) => a + (v - baseMean) ** 2, 0) / rmsValues.length;
  const std = Math.sqrt(variance);

  const alarms: AEAlarm[] = [];
  for (const f of features) {
    const deviation = (f.rms - baseMean) / (std || 1e-9);
    if (f.kurtosis > 10) {
      alarms.push({
        time_s: f.time_s, level: "critical",
        reason: `Kurtosis ${f.kurtosis.toFixed(1)} >> 10 — possible breakage`
      });
    } else if (deviation > alarmSigma) {
      const thresh = (baseMean + alarmSigma * std).toFixed(4);
      alarms.push({
        time_s: f.time_s, level: "alarm",
        reason: `RMS ${f.rms.toFixed(4)} exceeds μ+${alarmSigma}σ (${thresh})`
      });
    } else if (deviation > warnSigma) {
      const thresh = (baseMean + warnSigma * std).toFixed(4);
      alarms.push({
        time_s: f.time_s, level: "warning",
        reason: `RMS ${f.rms.toFixed(4)} exceeds μ+${warnSigma}σ (${thresh})`
      });
    }
  }
  return alarms;
}

// ─── Recommendations ────────────────────────────────────────────────

function generateRecommendations(
  cond: AEToolCondition, trend: AETrend, alarms: AEAlarm[]
): string[] {
  const recs: string[] = [];
  switch (cond.state) {
    case "breakage":
      recs.push("IMMEDIATE STOP: Tool breakage detected — retract spindle, inspect tool and workpiece");
      recs.push("Check collet/holder for debris before loading replacement tool");
      break;
    case "chipping":
      recs.push("Tool chipping detected — reduce feed rate 30-50% and inspect at next opportunity");
      recs.push("Consider switching to a tougher carbide grade or adding hone to cutting edge");
      break;
    case "severe_wear":
      recs.push("Severe wear indicated — schedule tool change within next 1-2 passes");
      recs.push("Monitor surface finish on workpiece for degradation");
      break;
    case "normal_wear":
      recs.push("Normal wear progression — continue monitoring, plan tool change per schedule");
      break;
    case "fresh":
      recs.push("Tool in good condition — no action required");
      break;
  }
  if (trend.trend_direction === "increasing" && trend.rms_r_squared > 0.7) {
    recs.push(`RMS trending up (slope ${trend.rms_slope.toFixed(4)}, R²=${trend.rms_r_squared.toFixed(2)}) — wear accelerating`);
  }
  if (trend.estimated_remaining_life_pct < 20 && trend.estimated_remaining_life_pct > 0) {
    recs.push(`Estimated remaining tool life ~${trend.estimated_remaining_life_pct.toFixed(0)}% — prepare replacement`);
  }
  if (alarms.some(a => a.level === "critical")) {
    recs.push("Critical alarm triggered — automatic feed hold recommended");
  }
  return recs;
}

// ─── Engine Class ───────────────────────────────────────────────────

/** AE-based tool condition monitoring engine. */
export class AcousticEmissionMonitoringEngine {
  /**
   * Analyze AE signal segments for tool condition monitoring.
   */
  analyze(input: AEMonitoringInput): AEMonitoringResult {
    const mode = input.analysis_mode ?? "full";
    const warnSigma = input.thresholds?.warning_sigma ?? 2;
    const alarmSigma = input.thresholds?.alarm_sigma ?? 3;

    // 1. Feature extraction (always needed)
    const features = input.signal_segments.map(seg => extractFeatures(seg));

    // 2. Classification
    const tool_condition = (mode === "features")
      ? { state: "fresh" as const, confidence: 0, evidence: ["Classification not requested"] }
      : classifyCondition(features, input.baseline);

    // 3. Source discrimination
    const ae_source = (mode === "features")
      ? { type: "continuous" as const, primary_mechanism: "deformation" as const }
      : discriminateSource(features);

    // 4. Trend analysis
    const trend = (mode === "features" || mode === "classification")
      ? { rms_slope: 0, rms_r_squared: 0, trend_direction: "stable" as const, estimated_remaining_life_pct: 100 }
      : analyzeTrend(features, input.baseline);

    // 5. Threshold alarms
    const alarms = (mode === "features" || mode === "classification")
      ? []
      : checkThresholds(features, input.baseline, warnSigma, alarmSigma);

    // 6. Recommendations
    const recommendations = (mode === "features")
      ? []
      : generateRecommendations(tool_condition, trend, alarms);

    return { features, tool_condition, ae_source, trend, alarms, recommendations };
  }
}

/** Singleton instance. */
export const acousticEmissionMonitoringEngine = new AcousticEmissionMonitoringEngine();
