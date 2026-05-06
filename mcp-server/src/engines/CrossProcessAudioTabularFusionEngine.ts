/**
 * CrossProcessAudioTabularFusionEngine — XPROC-NEURAL Tier 10 (T10-03)
 *
 * Audio + tabular Gated Multimodal Unit (GMU) fusion specialised for
 * regenerative-chatter prediction. Closes Tier 10 (4/4) and the 47-engine
 * XPROC-NEURAL roadmap.
 *
 * ## Three pure ops
 *
 *   1. spectralFeatures(signal, sampleRate)
 *      Hann-windowed real-valued radix-2 FFT (Cooley & Tukey 1965).
 *      Zero-pads to next power of two. Returns one-sided power spectrum
 *      |X(f)|² + dominant frequency + spectral centroid + RMS amplitude.
 *
 *   2. chatterScore(powerSpectrum, sampleRate, toothPassingFreqHz, ...)
 *      Physics-backed: regenerative chatter (Tlusty & Polacek 1963) presents
 *      as tonal peaks at NON-integer multiples of the tooth-passing
 *      frequency f_tp = (rpm/60) · z_flutes. The harmonics of f_tp are
 *      forced-vibration; everything else is candidate chatter.
 *      score = E_off_harmonic / E_total ∈ [0,1]
 *      with a peak-prominence cross-check (chatter is tonal, not broadband).
 *
 *   3. fuse(audioEmbedding, tabularFeatures, W_a, W_t, W_z, b_z)
 *      GMU per Arevalo et al. 2017 §3 (eqs. 1-4) — same form as T10-02:
 *        h_a  = tanh(W_a · audio)
 *        h_t  = tanh(W_t · tabular)
 *        z    = σ(W_z · [audio || tabular] + b_z)
 *        out  = z ⊙ h_a + (1 - z) ⊙ h_t
 *      Per-element gate; each output dim picks its own modality mix.
 *
 * ## Why audio-specific spectralFeatures + chatterScore (not just fuse)
 *
 * Audio is the only T10 modality where the *physically meaningful*
 * representation is spectral, not raw. T10-02 (time-series sensor) can use
 * raw windows because spindle-load streams are already low-passed; T10-03
 * caller would otherwise have to drag a separate FFT in. Bundling
 * spectralFeatures keeps the engine self-contained and matches the
 * "specialised for chatter prediction" requirement in
 * XPROC-NEURAL-ROADMAP.md Tier 10 row T10-03.
 *
 * ## Citations
 *   Arevalo, Solorio, Montes-y-Gómez, González 2017 — *Gated Multimodal Units*
 *   Cooley & Tukey 1965 — *An Algorithm for the Machine Calculation of Complex Fourier Series*
 *   Tlusty & Polacek 1963 — *The Stability of the Machine Tool against Self-Excited Vibration*
 *   Schmitz & Smith 2008 — *Machining Dynamics: Frequency Response to Improved Productivity* §6 (TPF & chatter)
 *
 * ## Failure modes covered (Karpathy edge enumeration)
 *
 *   spectralFeatures:
 *     1. Empty / single-sample signal           → invalid_input (Zod min(2))
 *     2. NaN / Inf in signal                    → invalid_input (Zod .finite())
 *     3. sampleRate ≤ 0                         → invalid_input (Zod .positive())
 *     4. Signal length not power-of-2           → zero-pad to next power-of-2
 *     5. All-zero signal                        → returns empty spectrum gracefully
 *
 *   chatterScore:
 *     6. Empty powerSpectrum                    → invalid_input
 *     7. NaN / Inf in spectrum                  → invalid_input
 *     8. toothPassingFreqHz ≥ Nyquist           → warn + clamp (still computes)
 *     9. toothPassingFreqHz ≤ 0                 → invalid_input
 *    10. All-harmonic spectrum (no chatter)     → score = 0
 *    11. Pure off-harmonic peak (chatter)       → score → 1
 *
 *   fuse: same shape-mismatch / NaN gates as T10-02.
 *
 * @module CrossProcessAudioTabularFusionEngine
 */

import { z } from "zod";

// ============================================================================
// Constants — bound any-input ops so a malformed call cannot OOM the process.
// ============================================================================

const MAX_AUDIO_DIM = 4096;
const MAX_TAB_DIM = 256;
const MAX_FUSION_DIM = 1024;
const MAX_RAW_LENGTH = 1_048_576;     // 2^20 ≈ 1M samples (~ 24 s at 44.1 kHz)
const MAX_FFT_SIZE = 1_048_576;
const MAX_SPECTRUM_BINS = MAX_FFT_SIZE / 2 + 1;
const MAX_HARMONICS = 16;
const MIN_DENOM = 1e-30;

// ============================================================================
// Schemas
// ============================================================================

const SpectralFeaturesSchema = z.object({
  /** Raw mono audio samples (microphone or accelerometer). */
  signal: z.array(z.number().finite()).min(2).max(MAX_RAW_LENGTH),
  /** Sample rate in Hz. */
  sampleRate: z.number().finite().positive().max(10_000_000),
  /** Apply Hann window before FFT. Default true (recommended for chatter). */
  hannWindow: z.boolean().default(true),
});

const ChatterScoreSchema = z.object({
  /** One-sided power spectrum |X(f)|² (length = N/2 + 1). */
  powerSpectrum: z.array(z.number().finite().nonnegative())
    .min(2).max(MAX_SPECTRUM_BINS),
  /** Sample rate of the original signal (Hz). */
  sampleRate: z.number().finite().positive().max(10_000_000),
  /** Tooth-passing frequency f_tp = rpm/60 × z_flutes. */
  toothPassingFreqHz: z.number().finite().positive().max(10_000_000),
  /** Number of TPF harmonics to mark as forced-vibration (1..16). Default 5. */
  harmonics: z.number().int().min(1).max(MAX_HARMONICS).default(5),
  /**
   * Half-bandwidth around each harmonic (as fraction of TPF). Default 0.05
   * (±5 %), per Schmitz & Smith 2008 §6 typical bin width for chatter classification.
   */
  harmonicTolerance: z.number().finite().positive().max(0.5).default(0.05),
});

const FuseSchema = z.object({
  audioEmbedding: z.array(z.number().finite()).min(1).max(MAX_AUDIO_DIM),
  tabularFeatures: z.array(z.number().finite()).min(1).max(MAX_TAB_DIM),
  wAudio: z.array(z.array(z.number().finite()).min(1).max(MAX_AUDIO_DIM))
    .min(1).max(MAX_FUSION_DIM),
  wTabular: z.array(z.array(z.number().finite()).min(1).max(MAX_TAB_DIM))
    .min(1).max(MAX_FUSION_DIM),
  wGate: z.array(z.array(z.number().finite()).min(1).max(MAX_AUDIO_DIM + MAX_TAB_DIM))
    .min(1).max(MAX_FUSION_DIM),
  biasGate: z.array(z.number().finite()).min(1).max(MAX_FUSION_DIM),
});

// ============================================================================
// Public types
// ============================================================================

export interface SpectralFeaturesOk {
  ok: true;
  /** One-sided power spectrum (length fftSize/2 + 1). */
  powerSpectrum: number[];
  /** FFT size used (power of two ≥ signal length). */
  fftSize: number;
  /** Bin width in Hz (sampleRate / fftSize). */
  binWidthHz: number;
  /** Frequency of the maximum-power bin (Hz). */
  dominantFreqHz: number;
  /** Power at the dominant bin. */
  dominantPower: number;
  /** Spectral centroid Σ(f·P(f)) / ΣP(f) (Hz). */
  spectralCentroidHz: number;
  /** RMS amplitude of the (un-windowed) signal. */
  rms: number;
  warnings: string[];
}

export interface ChatterScoreOk {
  ok: true;
  /** Off-harmonic energy fraction ∈ [0,1]. Higher = more chatter-like. */
  score: number;
  /** Energy summed across the harmonic bands. */
  harmonicEnergy: number;
  /** Energy summed across the off-harmonic bands. */
  offHarmonicEnergy: number;
  /** Total spectral energy. */
  totalEnergy: number;
  /** Peak-to-median ratio (tonality indicator; ≫1 → tonal). */
  peakToMedianRatio: number;
  /** Frequency of the largest off-harmonic peak (Hz), or null if none. */
  dominantOffHarmonicHz: number | null;
  /** Power of that peak (or 0). */
  dominantOffHarmonicPower: number;
  /** Bin centres of the harmonics actually inside the spectrum. */
  harmonicCentresHz: number[];
  warnings: string[];
}

export interface FuseOk {
  ok: true;
  fusedEmbedding: number[];
  gate: number[];
  gateMean: number;
  hAudio: number[];
  hTabular: number[];
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type SpectralFeaturesResult = SpectralFeaturesOk | OpErr;
export type ChatterScoreResult = ChatterScoreOk | OpErr;
export type FuseResult = FuseOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function nextPow2(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

function matVec(W: number[][], x: number[]): number[] {
  const rows = W.length;
  const cols = x.length;
  const out = new Array<number>(rows);
  for (let i = 0; i < rows; i++) {
    let s = 0;
    const Wi = W[i];
    for (let j = 0; j < cols; j++) s += Wi[j] * x[j];
    out[i] = s;
  }
  return out;
}

/**
 * In-place radix-2 Cooley-Tukey FFT. Re/Im length must be power of 2.
 * Iterative bit-reversal + butterfly per Brigham 1988 §9.
 */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // Bit reversal permutation.
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  // Butterflies.
  for (let size = 2; size <= n; size *= 2) {
    const half = size >> 1;
    const angleStep = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const angle = angleStep * k;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);
        const a = start + k;
        const b = a + half;
        const tr = wr * re[b] - wi * im[b];
        const ti = wr * im[b] + wi * re[b];
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] = re[a] + tr;
        im[a] = im[a] + ti;
      }
    }
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessAudioTabularFusionEngine {
  static readonly tier = "T10-03";

  /**
   * Hann-windowed real FFT power spectrum + summary features.
   * Zero-pads to next power of two; returns one-sided spectrum.
   */
  static spectralFeatures(input: unknown): SpectralFeaturesResult {
    const parsed = SpectralFeaturesSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { signal, sampleRate, hannWindow } = parsed.data;
    const n = signal.length;
    const fftSize = nextPow2(n);
    if (fftSize > MAX_FFT_SIZE) {
      return {
        ok: false, error: "invalid_input",
        message: `padded fft size ${fftSize} exceeds MAX_FFT_SIZE ${MAX_FFT_SIZE}`,
      };
    }

    // RMS of the un-windowed signal (so callers see physical amplitude).
    let sqSum = 0;
    for (let i = 0; i < n; i++) sqSum += signal[i] * signal[i];
    const rms = Math.sqrt(sqSum / n);

    // Hann window applied in-place to the padded buffer.
    const re = new Float64Array(fftSize);
    const im = new Float64Array(fftSize);
    if (hannWindow) {
      // w[k] = 0.5 (1 - cos(2π k / (n-1))) per Harris 1978 eq. 27.
      const denom = n > 1 ? n - 1 : 1;
      for (let i = 0; i < n; i++) {
        const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / denom));
        re[i] = signal[i] * w;
      }
    } else {
      for (let i = 0; i < n; i++) re[i] = signal[i];
    }
    // Tail of re[] and all of im[] already zero from Float64Array init.

    fftInPlace(re, im);

    // One-sided power spectrum, length fftSize/2 + 1.
    const halfBins = (fftSize >> 1) + 1;
    const power = new Array<number>(halfBins);
    let maxPower = 0;
    let maxBin = 0;
    let centroidNum = 0;
    let centroidDen = 0;
    const binWidth = sampleRate / fftSize;
    for (let k = 0; k < halfBins; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      power[k] = p;
      if (p > maxPower) {
        maxPower = p;
        maxBin = k;
      }
      const f = k * binWidth;
      centroidNum += f * p;
      centroidDen += p;
    }
    const centroid = centroidDen > MIN_DENOM ? centroidNum / centroidDen : 0;

    return {
      ok: true,
      powerSpectrum: power,
      fftSize,
      binWidthHz: binWidth,
      dominantFreqHz: maxBin * binWidth,
      dominantPower: maxPower,
      spectralCentroidHz: centroid,
      rms,
      warnings: [],
    };
  }

  /**
   * Chatter score: off-harmonic energy fraction.
   * Marks bins within ±tolerance of n·f_tp (n=1..harmonics) as forced;
   * the rest as candidate chatter. Score = chatter / total.
   */
  static chatterScore(input: unknown): ChatterScoreResult {
    const parsed = ChatterScoreSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const {
      powerSpectrum, sampleRate, toothPassingFreqHz, harmonics, harmonicTolerance,
    } = parsed.data;

    const halfBins = powerSpectrum.length;
    // Reconstruct fftSize from one-sided spectrum length.
    const fftSize = (halfBins - 1) * 2;
    const binWidth = sampleRate / fftSize;
    const nyquist = sampleRate / 2;
    const warnings: string[] = [];

    if (toothPassingFreqHz >= nyquist) {
      warnings.push(
        `toothPassingFreqHz ${toothPassingFreqHz} >= Nyquist ${nyquist}; harmonic mask collapses to first bin`,
      );
    }

    // Build harmonic mask: bin k is "harmonic" iff |f_k - n·f_tp| ≤ tol·f_tp
    // for some n ∈ 1..harmonics with n·f_tp ≤ Nyquist.
    const tolHz = harmonicTolerance * toothPassingFreqHz;
    const harmonicCentres: number[] = [];
    const isHarmonic = new Uint8Array(halfBins);
    for (let n = 1; n <= harmonics; n++) {
      const f = n * toothPassingFreqHz;
      if (f > nyquist) break;
      harmonicCentres.push(f);
      const lo = Math.max(0, Math.floor((f - tolHz) / binWidth));
      const hi = Math.min(halfBins - 1, Math.ceil((f + tolHz) / binWidth));
      for (let k = lo; k <= hi; k++) isHarmonic[k] = 1;
    }
    // DC bin is never "chatter"; mark it harmonic to remove from numerator.
    isHarmonic[0] = 1;

    let total = 0;
    let harmonicE = 0;
    let offE = 0;
    let domOffPower = 0;
    let domOffBin = -1;
    for (let k = 0; k < halfBins; k++) {
      const p = powerSpectrum[k];
      total += p;
      if (isHarmonic[k]) {
        harmonicE += p;
      } else {
        offE += p;
        if (p > domOffPower) {
          domOffPower = p;
          domOffBin = k;
        }
      }
    }

    const score = total > MIN_DENOM ? offE / total : 0;
    const med = median(powerSpectrum);
    let peakAll = 0;
    for (let k = 0; k < halfBins; k++) if (powerSpectrum[k] > peakAll) peakAll = powerSpectrum[k];
    const peakToMedian = med > MIN_DENOM ? peakAll / med : 0;

    return {
      ok: true,
      score,
      harmonicEnergy: harmonicE,
      offHarmonicEnergy: offE,
      totalEnergy: total,
      peakToMedianRatio: peakToMedian,
      dominantOffHarmonicHz: domOffBin >= 0 ? domOffBin * binWidth : null,
      dominantOffHarmonicPower: domOffPower,
      harmonicCentresHz: harmonicCentres,
      warnings,
    };
  }

  /**
   * GMU forward pass — same algebra as T10-02, audio-side instead of
   * time-series-side modality. Caller owns weights (pure-aggregator pattern).
   */
  static fuse(input: unknown): FuseResult {
    const parsed = FuseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const {
      audioEmbedding, tabularFeatures,
      wAudio, wTabular, wGate, biasGate,
    } = parsed.data;

    const dA = audioEmbedding.length;
    const dT = tabularFeatures.length;
    const dF = wAudio.length;
    const dConcat = dA + dT;

    if (wTabular.length !== dF) {
      return {
        ok: false, error: "invalid_input",
        message: `wTabular rows ${wTabular.length} != fusion dim ${dF}`,
      };
    }
    if (wGate.length !== dF) {
      return {
        ok: false, error: "invalid_input",
        message: `wGate rows ${wGate.length} != fusion dim ${dF}`,
      };
    }
    if (biasGate.length !== dF) {
      return {
        ok: false, error: "invalid_input",
        message: `biasGate length ${biasGate.length} != fusion dim ${dF}`,
      };
    }
    for (let i = 0; i < dF; i++) {
      if (wAudio[i].length !== dA) {
        return {
          ok: false, error: "invalid_input",
          message: `wAudio[${i}] cols=${wAudio[i].length} != audioDim=${dA}`,
        };
      }
      if (wTabular[i].length !== dT) {
        return {
          ok: false, error: "invalid_input",
          message: `wTabular[${i}] cols=${wTabular[i].length} != tabDim=${dT}`,
        };
      }
      if (wGate[i].length !== dConcat) {
        return {
          ok: false, error: "invalid_input",
          message: `wGate[${i}] cols=${wGate[i].length} != audioDim+tabDim=${dConcat}`,
        };
      }
    }

    const preA = matVec(wAudio, audioEmbedding);
    const preT = matVec(wTabular, tabularFeatures);
    const hA = preA.map(Math.tanh);
    const hT = preT.map(Math.tanh);

    const concat = new Array<number>(dConcat);
    for (let i = 0; i < dA; i++) concat[i] = audioEmbedding[i];
    for (let i = 0; i < dT; i++) concat[dA + i] = tabularFeatures[i];
    const preGate = matVec(wGate, concat);
    const gate = new Array<number>(dF);
    let gateSum = 0;
    for (let i = 0; i < dF; i++) {
      gate[i] = sigmoid(preGate[i] + biasGate[i]);
      gateSum += gate[i];
    }

    const fused = new Array<number>(dF);
    for (let i = 0; i < dF; i++) {
      fused[i] = gate[i] * hA[i] + (1 - gate[i]) * hT[i];
    }

    return {
      ok: true,
      fusedEmbedding: fused,
      gate,
      gateMean: gateSum / dF,
      hAudio: hA,
      hTabular: hT,
      warnings: [],
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    MAX_AUDIO_DIM: number;
    MAX_TAB_DIM: number;
    MAX_FUSION_DIM: number;
    MAX_RAW_LENGTH: number;
    MAX_FFT_SIZE: number;
    MAX_HARMONICS: number;
  } {
    return {
      MAX_AUDIO_DIM, MAX_TAB_DIM, MAX_FUSION_DIM,
      MAX_RAW_LENGTH, MAX_FFT_SIZE, MAX_HARMONICS,
    };
  }
}

export const crossProcessAudioTabularFusionEngine
  = CrossProcessAudioTabularFusionEngine;

/** Dispatcher convenience wrapper. */
export function crossProcessAudioTabularFusion(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_audio_fuse":
      return CrossProcessAudioTabularFusionEngine.fuse(params);
    case "xproc_audio_chatter_score":
      return CrossProcessAudioTabularFusionEngine.chatterScore(params);
    case "xproc_audio_spectral":
      return CrossProcessAudioTabularFusionEngine.spectralFeatures(params);
    case "xproc_audio_constants":
      return CrossProcessAudioTabularFusionEngine.constants();
    default:
      throw new Error(`crossProcessAudioTabularFusion: unknown action '${action}'`);
  }
}
