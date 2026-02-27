/**
 * FFT Analyzer — Fast Fourier Transform for Vibration Analysis
 *
 * Cooley-Tukey radix-2 FFT for frequency domain analysis of manufacturing
 * vibration signals. Supports windowing, power spectral density, and
 * dominant frequency extraction.
 *
 * Manufacturing uses: chatter frequency identification, bearing fault detection,
 * spindle health monitoring, resonance identification, modal analysis.
 *
 * References:
 * - Cooley, J.W. & Tukey, J.W. (1965). "An Algorithm for Machine Calculation of Complex Fourier Series"
 * - Harris, F.J. (1978). "On the Use of Windows for Harmonic Analysis"
 *
 * @module algorithms/FFTAnalyzer
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export type WindowFunction = "rectangular" | "hann" | "hamming" | "blackman" | "flattop";

export interface FFTAnalyzerInput {
  /** Time-domain signal samples. */
  signal: number[];
  /** Sampling rate [Hz]. */
  sample_rate: number;
  /** Window function. Default "hann". */
  window?: WindowFunction;
  /** Number of dominant peaks to extract. Default 5. */
  n_peaks?: number;
  /** Minimum frequency of interest [Hz]. Default 0. */
  min_frequency?: number;
  /** Maximum frequency of interest [Hz]. Default Nyquist. */
  max_frequency?: number;
  /** Compute power spectral density. Default true. */
  compute_psd?: boolean;
}

export interface FFTPeak {
  frequency: number;
  magnitude: number;
  phase_deg: number;
  is_harmonic: boolean;
  harmonic_of?: number;
}

export interface FFTAnalyzerOutput extends WithWarnings {
  frequencies: number[];
  magnitudes: number[];
  phases_deg: number[];
  psd: number[];
  dominant_peaks: FFTPeak[];
  dc_component: number;
  total_power: number;
  nyquist_frequency: number;
  frequency_resolution: number;
  n_fft: number;
  calculation_method: string;
}

export class FFTAnalyzer implements Algorithm<FFTAnalyzerInput, FFTAnalyzerOutput> {

  validate(input: FFTAnalyzerInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.signal?.length || input.signal.length < 4) {
      issues.push({ field: "signal", message: "At least 4 samples required", severity: "error" });
    }
    if (!input.sample_rate || input.sample_rate <= 0) {
      issues.push({ field: "sample_rate", message: "Must be > 0", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: FFTAnalyzerInput): FFTAnalyzerOutput {
    const warnings: string[] = [];
    const { sample_rate } = input;
    const windowType = input.window ?? "hann";
    const nPeaks = input.n_peaks ?? 5;
    const minFreq = input.min_frequency ?? 0;
    const maxFreq = input.max_frequency ?? sample_rate / 2;
    const computePsd = input.compute_psd ?? true;

    // Zero-pad to next power of 2
    let n = 1;
    while (n < input.signal.length) n *= 2;
    const signal = [...input.signal, ...new Array(n - input.signal.length).fill(0)];

    // Apply window
    const windowed = signal.map((v, i) => v * this.window(i, signal.length, windowType));

    // Cooley-Tukey FFT
    const { real, imag } = this.fft(windowed);
    const half = n / 2 + 1;

    // Frequency axis
    const freqRes = sample_rate / n;
    const frequencies = Array.from({ length: half }, (_, i) => i * freqRes);

    // Magnitude and phase
    const magnitudes = Array.from({ length: half }, (_, i) => {
      const mag = 2 * Math.sqrt(real[i] ** 2 + imag[i] ** 2) / n;
      return i === 0 ? mag / 2 : mag; // DC component not doubled
    });
    const phases = Array.from({ length: half }, (_, i) => Math.atan2(imag[i], real[i]) * 180 / Math.PI);

    // PSD
    const psd = computePsd
      ? magnitudes.map(m => m * m / (2 * freqRes))
      : [];

    // DC component
    const dc = magnitudes[0];

    // Total power
    const totalPower = magnitudes.reduce((s, m) => s + m * m, 0);

    // Find peaks within frequency range
    const minIdx = Math.max(1, Math.floor(minFreq / freqRes));
    const maxIdx = Math.min(half - 1, Math.ceil(maxFreq / freqRes));

    const peakIndices: number[] = [];
    for (let i = minIdx + 1; i < maxIdx; i++) {
      if (magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1]) {
        peakIndices.push(i);
      }
    }
    peakIndices.sort((a, b) => magnitudes[b] - magnitudes[a]);

    // Extract top peaks
    const dominantPeaks: FFTPeak[] = [];
    const topPeaks = peakIndices.slice(0, nPeaks);
    const fundamentalFreq = topPeaks.length > 0 ? frequencies[topPeaks[0]] : 0;

    for (const idx of topPeaks) {
      const freq = frequencies[idx];
      let isHarmonic = false;
      let harmonicOf: number | undefined;

      // Check if harmonic of fundamental
      if (fundamentalFreq > 0 && freq !== fundamentalFreq) {
        const ratio = freq / fundamentalFreq;
        if (Math.abs(ratio - Math.round(ratio)) < 0.05) {
          isHarmonic = true;
          harmonicOf = fundamentalFreq;
        }
      }

      dominantPeaks.push({
        frequency: freq,
        magnitude: magnitudes[idx],
        phase_deg: phases[idx],
        is_harmonic: isHarmonic,
        harmonic_of: harmonicOf,
      });
    }

    return {
      frequencies,
      magnitudes,
      phases_deg: phases,
      psd,
      dominant_peaks: dominantPeaks,
      dc_component: dc,
      total_power: totalPower,
      nyquist_frequency: sample_rate / 2,
      frequency_resolution: freqRes,
      n_fft: n,
      warnings,
      calculation_method: `Radix-2 FFT (N=${n}, ${windowType} window, fs=${sample_rate} Hz)`,
    };
  }

  private window(i: number, N: number, type: WindowFunction): number {
    const x = (2 * Math.PI * i) / (N - 1);
    switch (type) {
      case "hann": return 0.5 * (1 - Math.cos(x));
      case "hamming": return 0.54 - 0.46 * Math.cos(x);
      case "blackman": return 0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x);
      case "flattop": return 0.21557895 - 0.41663158 * Math.cos(x) + 0.277263158 * Math.cos(2 * x)
        - 0.083578947 * Math.cos(3 * x) + 0.006947368 * Math.cos(4 * x);
      case "rectangular": default: return 1;
    }
  }

  private fft(signal: number[]): { real: number[]; imag: number[] } {
    const N = signal.length;
    if (N <= 1) return { real: [...signal], imag: [0] };

    const real = new Array(N).fill(0);
    const imag = new Array(N).fill(0);

    // Bit-reversal permutation
    const bits = Math.log2(N);
    const bitReverse = (x: number) => {
      let result = 0;
      for (let i = 0; i < bits; i++) { result = (result << 1) | (x & 1); x >>= 1; }
      return result;
    };

    for (let i = 0; i < N; i++) {
      const j = bitReverse(i);
      real[j] = signal[i];
    }

    // Butterfly operations
    for (let size = 2; size <= N; size *= 2) {
      const halfSize = size / 2;
      const angle = -2 * Math.PI / size;
      for (let i = 0; i < N; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const wr = Math.cos(angle * j);
          const wi = Math.sin(angle * j);
          const tr = wr * real[i + j + halfSize] - wi * imag[i + j + halfSize];
          const ti = wr * imag[i + j + halfSize] + wi * real[i + j + halfSize];
          real[i + j + halfSize] = real[i + j] - tr;
          imag[i + j + halfSize] = imag[i + j] - ti;
          real[i + j] += tr;
          imag[i + j] += ti;
        }
      }
    }

    return { real, imag };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "fft-analyzer",
      name: "FFT Analyzer",
      description: "Cooley-Tukey radix-2 FFT for vibration frequency analysis",
      formula: "X(k) = Σ x(n)×e^(-j2πkn/N); PSD = |X(k)|² / (2×Δf)",
      reference: "Cooley & Tukey (1965); Harris (1978)",
      safety_class: "standard",
      domain: "signal",
      inputs: { signal: "Time-domain samples", sample_rate: "Sampling frequency [Hz]" },
      outputs: { dominant_peaks: "Top frequency peaks", magnitudes: "Spectrum", psd: "Power spectral density" },
    };
  }
}
