/**
 * STFT Chatter Detection — Short-Time Fourier Transform for Real-Time Chatter
 *
 * Implements Short-Time Fourier Transform for real-time detection of chatter
 * onset in machining vibration signals. Monitors frequency content evolution
 * over time to detect emerging chatter frequencies before they become severe.
 *
 * Uses sliding window FFT with overlap to track spectral changes. Chatter is
 * identified by detecting new frequency peaks near but not at tooth-passing
 * frequency harmonics.
 *
 * Manufacturing uses: real-time chatter detection, adaptive feed control,
 * spindle speed adjustment, process monitoring, surface quality assurance.
 *
 * References:
 * - Schmitz, T.L. & Smith, K.S. (2019). "Machining Dynamics" Ch. 4
 * - Kuljanic, E. et al. (2009). "Multisensor Chatter Detection in Milling"
 * - Yao, Z. et al. (2010). "Online Chatter Detection Using Wavelet and STFT"
 *
 * @module algorithms/STFTChatter
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface STFTChatterInput {
  /** Vibration signal samples (acceleration or displacement). */
  signal: number[];
  /** Sampling rate [Hz]. */
  sample_rate: number;
  /** Spindle speed [RPM]. */
  spindle_speed: number;
  /** Number of flutes. */
  n_flutes: number;
  /** STFT window size [samples]. Default 512. */
  window_size?: number;
  /** Window overlap ratio. Default 0.75. */
  overlap?: number;
  /** Chatter detection threshold (ratio above background). Default 3.0. */
  threshold?: number;
  /** Frequency band around tooth-passing to exclude [Hz]. Default 20. */
  exclusion_band?: number;
  /** Window function. Default "hann". */
  window_type?: "rectangular" | "hann" | "hamming";
}

export interface SpectrogramFrame {
  time: number;
  frequencies: number[];
  magnitudes: number[];
  is_chatter: boolean;
  chatter_frequency?: number;
  chatter_magnitude?: number;
}

export interface STFTChatterOutput extends WithWarnings {
  /** Whether chatter was detected at any point. */
  chatter_detected: boolean;
  /** Chatter onset time [s] (first detection). */
  chatter_onset_time: number;
  /** Dominant chatter frequency [Hz]. */
  chatter_frequency: number;
  /** Chatter-to-signal ratio (CSR) at detection. */
  chatter_signal_ratio: number;
  /** Tooth-passing frequency [Hz]. */
  tooth_passing_frequency: number;
  /** Spectrogram frames for visualization. */
  spectrogram: SpectrogramFrame[];
  /** Chatter severity: none, mild, moderate, severe. */
  severity: "none" | "mild" | "moderate" | "severe";
  /** Percentage of frames with chatter. */
  chatter_percentage: number;
  /** Recommended action. */
  recommendation: string;
  /** Signal RMS level. */
  signal_rms: number;
  calculation_method: string;
}

export class STFTChatterDetection implements Algorithm<STFTChatterInput, STFTChatterOutput> {

  validate(input: STFTChatterInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.signal?.length || input.signal.length < 64) {
      issues.push({ field: "signal", message: "At least 64 samples required", severity: "error" });
    }
    if (!input.sample_rate || input.sample_rate <= 0) {
      issues.push({ field: "sample_rate", message: "Must be > 0", severity: "error" });
    }
    if (!input.spindle_speed || input.spindle_speed <= 0) {
      issues.push({ field: "spindle_speed", message: "Must be > 0", severity: "error" });
    }
    if (!input.n_flutes || input.n_flutes < 1) {
      issues.push({ field: "n_flutes", message: "Must be >= 1", severity: "error" });
    }
    if (input.sample_rate < input.spindle_speed / 60 * input.n_flutes * 4) {
      issues.push({ field: "sample_rate", message: "Sample rate too low for tooth-passing frequency", severity: "warning" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: STFTChatterInput): STFTChatterOutput {
    const warnings: string[] = [];
    const { signal, sample_rate, spindle_speed, n_flutes } = input;
    const windowSize = input.window_size ?? 512;
    const overlap = input.overlap ?? 0.75;
    const threshold = input.threshold ?? 3.0;
    const exclusionBand = input.exclusion_band ?? 20;
    const windowType = input.window_type ?? "hann";

    // Tooth-passing frequency
    const tpf = spindle_speed * n_flutes / 60; // Hz
    const tpfHarmonics = Array.from({ length: 10 }, (_, i) => tpf * (i + 1));

    // Compute window
    const win = this.makeWindow(windowSize, windowType);

    // STFT parameters
    const hopSize = Math.round(windowSize * (1 - overlap));
    const nFrames = Math.floor((signal.length - windowSize) / hopSize) + 1;

    // Pad to power of 2
    let nFFT = 1;
    while (nFFT < windowSize) nFFT *= 2;
    const halfFFT = nFFT / 2 + 1;
    const freqRes = sample_rate / nFFT;

    const spectrogram: SpectrogramFrame[] = [];
    let chatterDetected = false;
    let chatterOnset = -1;
    let chatterFreq = 0;
    let maxCSR = 0;
    let chatterFrames = 0;

    // Signal RMS
    const rms = Math.sqrt(signal.reduce((s, v) => s + v * v, 0) / signal.length);

    // Background noise estimation (first few frames)
    const backgroundFrames = Math.min(3, nFrames);
    const backgroundSpectrum = new Array(halfFFT).fill(0);

    for (let frame = 0; frame < nFrames; frame++) {
      const start = frame * hopSize;
      const time = start / sample_rate;

      // Apply window
      const windowed = new Array(nFFT).fill(0);
      for (let i = 0; i < windowSize; i++) {
        windowed[i] = signal[start + i] * win[i];
      }

      // FFT
      const { real, imag } = this.fft(windowed);

      // Magnitude spectrum
      const magnitudes = new Array(halfFFT);
      const frequencies = new Array(halfFFT);
      for (let k = 0; k < halfFFT; k++) {
        frequencies[k] = k * freqRes;
        magnitudes[k] = 2 * Math.sqrt(real[k] ** 2 + imag[k] ** 2) / nFFT;
      }

      // Update background estimate
      if (frame < backgroundFrames) {
        for (let k = 0; k < halfFFT; k++) {
          backgroundSpectrum[k] += magnitudes[k] / backgroundFrames;
        }
      }

      // Detect chatter: find peaks NOT at TPF harmonics
      let frameChatter = false;
      let frameChatterFreq = 0;
      let frameChatterMag = 0;

      if (frame >= backgroundFrames) {
        for (let k = 2; k < halfFFT - 1; k++) {
          const freq = frequencies[k];
          const mag = magnitudes[k];

          // Skip if near TPF harmonic
          const nearTPF = tpfHarmonics.some(h => Math.abs(freq - h) < exclusionBand);
          if (nearTPF) continue;

          // Skip if below Nyquist meaningful range
          if (freq < tpf * 0.3 || freq > sample_rate * 0.4) continue;

          // Is it a peak?
          if (mag <= magnitudes[k - 1] || mag <= magnitudes[k + 1]) continue;

          // Compare to background
          const bgLevel = backgroundSpectrum[k] || 1e-10;
          const ratio = mag / bgLevel;

          if (ratio > threshold) {
            frameChatter = true;
            if (mag > frameChatterMag) {
              frameChatterMag = mag;
              frameChatterFreq = freq;
            }
          }
        }
      }

      if (frameChatter) {
        chatterFrames++;
        if (!chatterDetected) {
          chatterDetected = true;
          chatterOnset = time;
        }
        const csr = frameChatterMag / (rms || 1e-10);
        if (csr > maxCSR) {
          maxCSR = csr;
          chatterFreq = frameChatterFreq;
        }
      }

      // Store frame (subsample frequencies for output size)
      const step = Math.max(1, Math.floor(halfFFT / 50));
      spectrogram.push({
        time,
        frequencies: frequencies.filter((_, i) => i % step === 0),
        magnitudes: magnitudes.filter((_, i) => i % step === 0),
        is_chatter: frameChatter,
        chatter_frequency: frameChatter ? frameChatterFreq : undefined,
        chatter_magnitude: frameChatter ? frameChatterMag : undefined,
      });
    }

    // Severity classification
    const chatterPct = nFrames > 0 ? (chatterFrames / nFrames) * 100 : 0;
    let severity: "none" | "mild" | "moderate" | "severe";
    if (!chatterDetected) severity = "none";
    else if (chatterPct < 10) severity = "mild";
    else if (chatterPct < 40) severity = "moderate";
    else severity = "severe";

    // Recommendation
    let recommendation: string;
    switch (severity) {
      case "none": recommendation = "No action needed — stable cutting"; break;
      case "mild": recommendation = "Monitor closely — consider reducing depth of cut by 10-20%"; break;
      case "moderate": recommendation = "Reduce depth of cut by 30% or adjust spindle speed to nearest sweet spot"; break;
      case "severe": recommendation = "STOP — severe chatter. Reduce ap significantly or change spindle speed"; break;
    }

    if (chatterDetected) {
      warnings.push(`CHATTER at ${chatterFreq.toFixed(0)}Hz (severity: ${severity})`);
    }

    return {
      chatter_detected: chatterDetected,
      chatter_onset_time: chatterOnset,
      chatter_frequency: chatterFreq,
      chatter_signal_ratio: maxCSR,
      tooth_passing_frequency: tpf,
      spectrogram,
      severity,
      chatter_percentage: chatterPct,
      recommendation,
      signal_rms: rms,
      warnings,
      calculation_method: `STFT chatter detection (win=${windowSize}, overlap=${(overlap * 100).toFixed(0)}%, threshold=${threshold}×)`,
    };
  }

  private makeWindow(n: number, type: string): number[] {
    return Array.from({ length: n }, (_, i) => {
      const x = (2 * Math.PI * i) / (n - 1);
      switch (type) {
        case "hann": return 0.5 * (1 - Math.cos(x));
        case "hamming": return 0.54 - 0.46 * Math.cos(x);
        default: return 1;
      }
    });
  }

  private fft(signal: number[]): { real: number[]; imag: number[] } {
    const N = signal.length;
    const real = new Array(N).fill(0);
    const imag = new Array(N).fill(0);

    const bits = Math.log2(N);
    const bitReverse = (x: number) => {
      let r = 0;
      for (let i = 0; i < bits; i++) { r = (r << 1) | (x & 1); x >>= 1; }
      return r;
    };

    for (let i = 0; i < N; i++) real[bitReverse(i)] = signal[i];

    for (let size = 2; size <= N; size *= 2) {
      const half = size / 2;
      const angle = -2 * Math.PI / size;
      for (let i = 0; i < N; i += size) {
        for (let j = 0; j < half; j++) {
          const wr = Math.cos(angle * j);
          const wi = Math.sin(angle * j);
          const tr = wr * real[i + j + half] - wi * imag[i + j + half];
          const ti = wr * imag[i + j + half] + wi * real[i + j + half];
          real[i + j + half] = real[i + j] - tr;
          imag[i + j + half] = imag[i + j] - ti;
          real[i + j] += tr;
          imag[i + j] += ti;
        }
      }
    }

    return { real, imag };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "stft-chatter",
      name: "STFT Chatter Detection",
      description: "Real-time chatter detection via Short-Time Fourier Transform spectral monitoring",
      formula: "STFT(t,f) = Σ x(n)w(n-t)e^(-j2πfn); CSR = chatter_peak / background",
      reference: "Schmitz & Smith (2019); Kuljanic et al. (2009)",
      safety_class: "critical",
      domain: "signal",
      inputs: { signal: "Vibration samples", sample_rate: "Sampling frequency [Hz]", spindle_speed: "RPM" },
      outputs: { chatter_detected: "Detection flag", chatter_frequency: "Chatter freq [Hz]", severity: "none/mild/moderate/severe" },
    };
  }
}
