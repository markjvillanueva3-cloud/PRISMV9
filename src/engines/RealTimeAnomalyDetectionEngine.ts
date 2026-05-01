/**
 * RealTimeAnomalyDetectionEngine — Real-time cutting anomaly detection
 * using 5 statistical methods: CUSUM, EWMA, Mahalanobis, FFT, Wavelet.
 *
 * Self-contained with inline Cooley-Tukey radix-2 FFT and Haar wavelet.
 * @module RealTimeAnomalyDetectionEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DetectionMethod = 'cusum' | 'ewma' | 'mahalanobis' | 'fft' | 'wavelet';

export type AnomalyType = 'drift' | 'chatter' | 'breakage' | 'overload' | 'outlier';

export interface AnomalyDetectionInput {
  /** Time-series samples from a single sensor channel */
  samples: number[];
  /** Sampling rate in Hz */
  sample_rate_hz: number;
  /** Expected mean from stable cutting (auto-estimated if omitted) */
  baseline_mean?: number;
  /** Expected standard deviation (auto-estimated if omitted) */
  baseline_std?: number;
  /** Which methods to run (default: all 5) */
  methods?: DetectionMethod[];
  /** Sensitivity 0-1, higher = more sensitive (default 0.5) */
  sensitivity?: number;
}

export interface AnomalyEvent {
  method: DetectionMethod;
  sample_index: number;
  severity: number; // 0-1
  type: AnomalyType;
  message: string;
}

export interface MethodSummary {
  method: string;
  triggered: boolean;
  score: number;
  details: string;
}

export interface AnomalyDetectionResult {
  anomalies: AnomalyEvent[];
  method_summaries: MethodSummary[];
  overall_status: 'normal' | 'warning' | 'alarm';
  recommended_action: string;
  false_positive_estimate: number;
}

export interface AtomicValue {
  value: number | string | boolean | object;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Math utilities
// ---------------------------------------------------------------------------

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function std(arr: number[], mu?: number): number {
  if (arr.length < 2) return 0;
  const m = mu ?? mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += (arr[i] - m) ** 2;
  return Math.sqrt(s / (arr.length - 1));
}

/** Cooley-Tukey radix-2 FFT (in-place, iterative). Returns magnitude spectrum. */
function fftMagnitude(signal: number[]): number[] {
  // Zero-pad to next power of 2
  let n = 1;
  while (n < signal.length) n <<= 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < signal.length; i++) re[i] = signal[i];

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
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const tRe = curRe * re[i + j + halfLen] - curIm * im[i + j + halfLen];
        const tIm = curRe * im[i + j + halfLen] + curIm * re[i + j + halfLen];
        re[i + j + halfLen] = re[i + j] - tRe;
        im[i + j + halfLen] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const tmpRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = tmpRe;
      }
    }
  }

  const mag = new Array<number>(n >> 1);
  for (let i = 0; i < mag.length; i++) {
    mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / signal.length;
  }
  return mag;
}

/** Haar wavelet decomposition — returns detail coefficients for `levels` levels. */
function haarWavelet(signal: number[], levels: number): number[][] {
  const details: number[][] = [];
  let approx = signal.slice();
  for (let lv = 0; lv < levels; lv++) {
    const len = approx.length >> 1;
    if (len < 1) break;
    const newApprox: number[] = [];
    const detail: number[] = [];
    for (let i = 0; i < len; i++) {
      const a = approx[2 * i];
      const b = approx[2 * i + 1];
      newApprox.push((a + b) / Math.SQRT2);
      detail.push((a - b) / Math.SQRT2);
    }
    details.push(detail);
    approx = newApprox;
  }
  return details;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ---------------------------------------------------------------------------
// Detection methods
// ---------------------------------------------------------------------------

function detectCusum(
  samples: number[], bMean: number, bStd: number, sensitivity: number
): { events: AnomalyEvent[]; summary: MethodSummary } {
  const events: AnomalyEvent[] = [];
  const h = 5 * bStd * (1 - sensitivity);
  const k = bStd * 0.5; // slack parameter
  let sPlus = 0, sMinus = 0;
  let maxS = 0;

  for (let i = 0; i < samples.length; i++) {
    const z = samples[i] - bMean;
    sPlus = Math.max(0, sPlus + z - k);
    sMinus = Math.max(0, sMinus - z - k);
    const s = Math.max(sPlus, sMinus);
    if (s > maxS) maxS = s;

    if (s > h && h > 0) {
      const severity = clamp01(s / (h * 3));
      events.push({
        method: 'cusum',
        sample_index: i,
        severity,
        type: 'drift',
        message: `CUSUM alarm at sample ${i}: cumulative deviation ${s.toFixed(2)} exceeds threshold ${h.toFixed(2)}`
      });
      sPlus = 0;
      sMinus = 0;
    }
  }

  const score = h > 0 ? clamp01(maxS / h) : 0;
  return {
    events,
    summary: {
      method: 'cusum',
      triggered: events.length > 0,
      score,
      details: `Peak S=${maxS.toFixed(3)}, threshold h=${h.toFixed(3)}, ${events.length} alarm(s)`
    }
  };
}

function detectEwma(
  samples: number[], bMean: number, bStd: number, sensitivity: number
): { events: AnomalyEvent[]; summary: MethodSummary } {
  const events: AnomalyEvent[] = [];
  const lambda = 0.1 + 0.3 * sensitivity;
  const L = 3 * (1 - sensitivity * 0.3);
  const controlLimit = L * bStd * Math.sqrt(lambda / (2 - lambda));

  let ewma = bMean;
  let maxDev = 0;

  for (let i = 0; i < samples.length; i++) {
    ewma = lambda * samples[i] + (1 - lambda) * ewma;
    const dev = Math.abs(ewma - bMean);
    if (dev > maxDev) maxDev = dev;

    if (controlLimit > 0 && dev > controlLimit) {
      const severity = clamp01(dev / (controlLimit * 2));
      events.push({
        method: 'ewma',
        sample_index: i,
        severity,
        type: 'overload',
        message: `EWMA deviation ${dev.toFixed(3)} exceeds control limit ${controlLimit.toFixed(3)} at sample ${i}`
      });
    }
  }

  const score = controlLimit > 0 ? clamp01(maxDev / controlLimit) : 0;
  return {
    events,
    summary: {
      method: 'ewma',
      triggered: events.length > 0,
      score,
      details: `λ=${lambda.toFixed(2)}, L=${L.toFixed(2)}, UCL=${controlLimit.toFixed(3)}, peak deviation=${maxDev.toFixed(3)}`
    }
  };
}

function detectMahalanobis(
  samples: number[], bMean: number, bStd: number, sensitivity: number
): { events: AnomalyEvent[]; summary: MethodSummary } {
  const events: AnomalyEvent[] = [];
  const threshold = 3 - sensitivity;
  const windowSize = Math.max(20, Math.floor(samples.length * 0.05));
  let maxDist = 0;

  for (let i = 0; i < samples.length; i++) {
    // Use rolling window stats if enough samples, else baseline
    let mu = bMean, sigma = bStd;
    if (i >= windowSize) {
      const win = samples.slice(i - windowSize, i);
      mu = mean(win);
      sigma = std(win, mu);
    }
    if (sigma < 1e-12) sigma = bStd > 0 ? bStd : 1e-6;

    const dist = Math.abs(samples[i] - mu) / sigma;
    if (dist > maxDist) maxDist = dist;

    if (dist > threshold) {
      const severity = clamp01((dist - threshold) / threshold);
      events.push({
        method: 'mahalanobis',
        sample_index: i,
        severity,
        type: 'outlier',
        message: `Mahalanobis distance ${dist.toFixed(2)} > threshold ${threshold.toFixed(2)} at sample ${i}`
      });
    }
  }

  const score = clamp01(maxDist / (threshold * 1.5));
  return {
    events,
    summary: {
      method: 'mahalanobis',
      triggered: events.length > 0,
      score,
      details: `Threshold=${threshold.toFixed(2)}, max distance=${maxDist.toFixed(3)}, window=${windowSize}`
    }
  };
}

function detectFft(
  samples: number[], sampleRate: number, _bMean: number, bStd: number, sensitivity: number
): { events: AnomalyEvent[]; summary: MethodSummary } {
  const events: AnomalyEvent[] = [];

  if (samples.length < 8) {
    return {
      events,
      summary: { method: 'fft', triggered: false, score: 0, details: 'Insufficient samples for FFT' }
    };
  }

  // Remove DC offset
  const mu = mean(samples);
  const centered = samples.map(s => s - mu);
  const mag = fftMagnitude(centered);
  const n = mag.length;
  const freqResolution = sampleRate / (n * 2);

  // Find dominant frequency (skip DC bin 0)
  let peakIdx = 1, peakMag = 0;
  let totalEnergy = 0;
  for (let i = 1; i < n; i++) {
    totalEnergy += mag[i] * mag[i];
    if (mag[i] > peakMag) {
      peakMag = mag[i];
      peakIdx = i;
    }
  }

  const peakFreq = peakIdx * freqResolution;
  const peakEnergy = peakMag * peakMag;
  const energyRatio = totalEnergy > 0 ? peakEnergy / totalEnergy : 0;

  // Check for harmonic concentration (chatter signature)
  // Chatter produces strong peaks at discrete frequencies
  const harmonicThreshold = 0.15 + 0.35 * sensitivity; // energy ratio threshold
  const amplitudeThreshold = bStd * (3 - 2 * sensitivity);

  let chatterScore = 0;
  if (peakMag > amplitudeThreshold && energyRatio > harmonicThreshold) {
    chatterScore = clamp01(energyRatio * 2);

    // Check for harmonics of peak frequency
    let harmonicCount = 0;
    for (let h = 2; h <= 4; h++) {
      const hIdx = Math.round(peakIdx * h);
      if (hIdx < n && mag[hIdx] > peakMag * 0.2) {
        harmonicCount++;
      }
    }

    const severity = clamp01(chatterScore + harmonicCount * 0.1);
    events.push({
      method: 'fft',
      sample_index: 0,
      severity,
      type: 'chatter',
      message: `Spectral anomaly: dominant peak at ${peakFreq.toFixed(1)} Hz (${(energyRatio * 100).toFixed(1)}% energy), ${harmonicCount} harmonics detected`
    });
  }

  const score = clamp01(Math.max(chatterScore, energyRatio));
  return {
    events,
    summary: {
      method: 'fft',
      triggered: events.length > 0,
      score,
      details: `Peak freq=${peakFreq.toFixed(1)} Hz, magnitude=${peakMag.toFixed(3)}, energy ratio=${(energyRatio * 100).toFixed(1)}%`
    }
  };
}

function detectWavelet(
  samples: number[], bStd: number, sensitivity: number
): { events: AnomalyEvent[]; summary: MethodSummary } {
  const events: AnomalyEvent[] = [];
  const levels = 3;

  if (samples.length < 8) {
    return {
      events,
      summary: { method: 'wavelet', triggered: false, score: 0, details: 'Insufficient samples for wavelet' }
    };
  }

  const details = haarWavelet(samples, levels);
  const threshold = bStd * (4 - 3 * sensitivity);
  let globalMax = 0;
  let maxLevel = 0;

  for (let lv = 0; lv < details.length; lv++) {
    const coeffs = details[lv];
    for (let j = 0; j < coeffs.length; j++) {
      const absC = Math.abs(coeffs[j]);
      if (absC > globalMax) {
        globalMax = absC;
        maxLevel = lv;
      }

      if (threshold > 0 && absC > threshold) {
        // Map wavelet index back to approximate sample index
        const sampleIdx = Math.min(j * (1 << (lv + 1)), samples.length - 1);
        const severity = clamp01(absC / (threshold * 3));
        const aType: AnomalyType = lv === 0 ? 'breakage' : 'outlier';
        events.push({
          method: 'wavelet',
          sample_index: sampleIdx,
          severity,
          type: aType,
          message: `Wavelet transient at level ${lv + 1}, coeff=${absC.toFixed(3)} > threshold ${threshold.toFixed(3)} (sample ~${sampleIdx})`
        });
      }
    }
  }

  // Deduplicate: keep only highest severity per 10-sample window
  const deduped: AnomalyEvent[] = [];
  const seen = new Set<number>();
  const sorted = events.sort((a, b) => b.severity - a.severity);
  for (const ev of sorted) {
    const bucket = Math.floor(ev.sample_index / 10);
    if (!seen.has(bucket)) {
      seen.add(bucket);
      deduped.push(ev);
    }
  }

  const score = threshold > 0 ? clamp01(globalMax / threshold) : 0;
  return {
    events: deduped,
    summary: {
      method: 'wavelet',
      triggered: deduped.length > 0,
      score,
      details: `${levels}-level Haar, max detail coeff=${globalMax.toFixed(3)} at level ${maxLevel + 1}, threshold=${threshold.toFixed(3)}`
    }
  };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const ALL_METHODS: DetectionMethod[] = ['cusum', 'ewma', 'mahalanobis', 'fft', 'wavelet'];

class RealTimeAnomalyDetectionEngine {
  /**
   * Run anomaly detection on a sensor time-series using the specified methods.
   * Returns an AtomicValue wrapping AnomalyDetectionResult.
   */
  detect(input: AnomalyDetectionInput): AtomicValue {
    const {
      samples,
      sample_rate_hz,
      sensitivity: rawSens = 0.5,
      methods = ALL_METHODS
    } = input;

    const sensitivity = clamp01(rawSens);

    // Auto-estimate baseline from first 20% of samples if not provided
    const baselineSlice = samples.slice(0, Math.max(20, Math.floor(samples.length * 0.2)));
    const bMean = input.baseline_mean ?? mean(baselineSlice);
    const bStd = input.baseline_std ?? Math.max(std(baselineSlice, bMean), 1e-9);

    const allEvents: AnomalyEvent[] = [];
    const summaries: MethodSummary[] = [];

    for (const m of methods) {
      let result: { events: AnomalyEvent[]; summary: MethodSummary };
      switch (m) {
        case 'cusum':
          result = detectCusum(samples, bMean, bStd, sensitivity);
          break;
        case 'ewma':
          result = detectEwma(samples, bMean, bStd, sensitivity);
          break;
        case 'mahalanobis':
          result = detectMahalanobis(samples, bMean, bStd, sensitivity);
          break;
        case 'fft':
          result = detectFft(samples, sample_rate_hz, bMean, bStd, sensitivity);
          break;
        case 'wavelet':
          result = detectWavelet(samples, bStd, sensitivity);
          break;
        default:
          continue;
      }
      allEvents.push(...result.events);
      summaries.push(result.summary);
    }

    // Sort events by sample index
    allEvents.sort((a, b) => a.sample_index - b.sample_index);

    // Determine overall status
    const triggeredCount = summaries.filter(s => s.triggered).length;
    const maxScore = Math.max(...summaries.map(s => s.score), 0);
    const maxSeverity = allEvents.length > 0 ? Math.max(...allEvents.map(e => e.severity)) : 0;

    let overall_status: 'normal' | 'warning' | 'alarm';
    if (triggeredCount >= 2 || maxSeverity > 0.7) {
      overall_status = 'alarm';
    } else if (triggeredCount >= 1 || maxScore > 0.6) {
      overall_status = 'warning';
    } else {
      overall_status = 'normal';
    }

    // Recommended action based on anomaly types
    const types = new Set(allEvents.map(e => e.type));
    let recommended_action: string;
    if (types.has('breakage')) {
      recommended_action = 'STOP IMMEDIATELY — possible tool breakage detected. Inspect tool and workpiece.';
    } else if (types.has('chatter')) {
      recommended_action = 'Reduce spindle speed by 10-15% or adjust depth of cut to exit chatter lobe.';
    } else if (types.has('drift')) {
      recommended_action = 'Monitor tool wear — gradual drift detected. Schedule tool change within next 5 parts.';
    } else if (types.has('overload')) {
      recommended_action = 'Reduce feed rate or depth of cut — sustained overload on sensor channel.';
    } else if (types.has('outlier')) {
      recommended_action = 'Investigate intermittent anomalies — check material inclusions or fixture stability.';
    } else {
      recommended_action = 'No action required — process is within normal parameters.';
    }

    // Estimate false positive rate using sensitivity and number of methods agreeing
    const methodAgreement = triggeredCount / methods.length;
    const false_positive_estimate = clamp01(
      (1 - methodAgreement) * (1 - sensitivity) * 0.5 +
      (triggeredCount === 1 ? 0.15 : 0) +
      (samples.length < 100 ? 0.1 : 0)
    );

    const result: AnomalyDetectionResult = {
      anomalies: allEvents,
      method_summaries: summaries,
      overall_status,
      recommended_action,
      false_positive_estimate
    };

    return {
      value: result,
      unit: 'anomaly_detection_result',
      uncertainty: false_positive_estimate,
      source: `RealTimeAnomalyDetectionEngine (${methods.length} methods, ${samples.length} samples, sensitivity=${sensitivity})`
    };
  }
}

/** Singleton instance */
export const realTimeAnomalyDetectionEngine = new RealTimeAnomalyDetectionEngine();
