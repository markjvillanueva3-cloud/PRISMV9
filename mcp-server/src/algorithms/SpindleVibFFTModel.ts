/**
 * Spindle Vibration FFT Analysis Model
 *
 * Performs DFT-based frequency analysis on vibration signals to detect
 * chatter and identify dominant frequencies:
 *   X(k) = sum_{n=0}^{N-1} x(n) * w(n) * exp(-j*2*pi*k*n/N)
 *
 * With extensions:
 * - Hann/Hamming/Blackman windowing
 * - Chatter detection via non-harmonic peak analysis
 * - Stable RPM recommendation via stability lobe pockets
 * - Tooth-passing frequency identification
 *
 * SAFETY-CRITICAL: Chatter causes tool breakage, workpiece damage,
 * excessive noise (hearing risk), and poor surface finish.
 *
 * References:
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.3-4
 * - Tlusty, J. (1985). "Machine Tool Chatter" lectures
 * - Schmitz, T. & Smith, K.S. (2019). "Machining Dynamics", Ch.4
 *
 * @module algorithms/SpindleVibFFTModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface SpindleVibFFTInput {
  /** Time-domain vibration signal (acceleration or velocity). */
  signal: number[];
  /** Sampling rate [Hz]. */
  sample_rate_hz: number;
  /** Current spindle RPM. */
  spindle_rpm: number;
  /** Number of flutes/teeth. */
  flutes: number;
  /** Window function. Default "hann". */
  window?: "hann" | "hamming" | "blackman" | "rectangular";
  /** Chatter detection threshold multiplier (peak/mean). Default 3.0. */
  chatter_threshold?: number;
  /** Minimum chatter frequency [Hz]. Default 50. */
  min_chatter_freq?: number;
  /** Maximum chatter frequency [Hz]. Default 5000. */
  max_chatter_freq?: number;
}

export interface SpectralPeak {
  frequency_hz: number;
  magnitude: number;
  is_harmonic: boolean;
  harmonic_order: number | null;
}

export interface StableRPMOption {
  rpm: number;
  lobe_number: number;
  method: string;
}

export interface SpindleVibFFTOutput extends WithWarnings {
  /** Dominant frequency [Hz]. */
  dominant_frequency_hz: number;
  /** Dominant peak magnitude. */
  dominant_magnitude: number;
  /** Mean spectral magnitude. */
  mean_magnitude: number;
  /** Whether chatter is detected. */
  chatter_detected: boolean;
  /** Chatter frequency [Hz] (if detected). */
  chatter_frequency_hz: number | null;
  /** Chatter severity (if detected). */
  chatter_severity: "none" | "low" | "medium" | "high";
  /** Tooth-passing frequency [Hz]. */
  tooth_passing_freq_hz: number;
  /** Top spectral peaks. */
  peaks: SpectralPeak[];
  /** Recommended stable RPM options (if chatter detected). */
  stable_rpm_options: StableRPMOption[];
  /** Recommended spindle override [%]. */
  spindle_override_pct: number;
  /** Number of samples analyzed. */
  num_samples: number;
  /** Frequency resolution [Hz]. */
  freq_resolution: number;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Constants ───────────────────────────────────────────────────────

const LIMITS = {
  MIN_SAMPLES: 16,
  MAX_SAMPLES: 65536,
  MIN_SAMPLE_RATE: 100,
  MAX_SAMPLE_RATE: 100000,
  MAX_PEAKS: 10,
  HARMONIC_TOLERANCE: 0.05, // 5% frequency tolerance for harmonic detection
};

// ── Algorithm Implementation ────────────────────────────────────────

export class SpindleVibFFTModel implements Algorithm<SpindleVibFFTInput, SpindleVibFFTOutput> {

  validate(input: SpindleVibFFTInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.signal || !Array.isArray(input.signal)) {
      issues.push({ field: "signal", message: "Signal must be a non-empty array", severity: "error" });
    } else if (input.signal.length < LIMITS.MIN_SAMPLES) {
      issues.push({ field: "signal", message: `Signal must have >= ${LIMITS.MIN_SAMPLES} samples, got ${input.signal.length}`, severity: "error" });
    } else if (input.signal.length > LIMITS.MAX_SAMPLES) {
      issues.push({ field: "signal", message: `Signal exceeds ${LIMITS.MAX_SAMPLES} samples. Truncate or decimate.`, severity: "warning" });
    }
    if (!input.sample_rate_hz || input.sample_rate_hz < LIMITS.MIN_SAMPLE_RATE || input.sample_rate_hz > LIMITS.MAX_SAMPLE_RATE) {
      issues.push({ field: "sample_rate_hz", message: `Sample rate must be ${LIMITS.MIN_SAMPLE_RATE}-${LIMITS.MAX_SAMPLE_RATE} Hz, got ${input.sample_rate_hz}`, severity: "error" });
    }
    if (!input.spindle_rpm || input.spindle_rpm <= 0) {
      issues.push({ field: "spindle_rpm", message: `Spindle RPM must be > 0, got ${input.spindle_rpm}`, severity: "error" });
    }
    if (!input.flutes || input.flutes < 1) {
      issues.push({ field: "flutes", message: `Flutes must be >= 1, got ${input.flutes}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: SpindleVibFFTInput): SpindleVibFFTOutput {
    const warnings: string[] = [];
    const {
      signal, sample_rate_hz, spindle_rpm, flutes,
      window = "hann",
      chatter_threshold = 3.0,
      min_chatter_freq = 50,
      max_chatter_freq = 5000,
    } = input;

    const N = Math.min(signal.length, LIMITS.MAX_SAMPLES);
    const freq_resolution = sample_rate_hz / N;

    // Apply window function
    const windowed = new Array(N);
    for (let i = 0; i < N; i++) {
      windowed[i] = signal[i] * this.windowFunc(window, i, N);
    }

    // DFT (O(N^2) — sufficient for manufacturing signals up to ~4096)
    const halfN = Math.floor(N / 2);
    const spectrum: { freq: number; mag: number }[] = [];

    for (let k = 1; k <= halfN; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        re += windowed[n] * Math.cos(angle);
        im += windowed[n] * Math.sin(angle);
      }
      const mag = Math.sqrt(re * re + im * im) / N;
      const freq = k * sample_rate_hz / N;
      spectrum.push({ freq, mag });
    }

    // Sort by magnitude for peak detection
    const sorted = [...spectrum].sort((a, b) => b.mag - a.mag);
    const dominant_frequency_hz = sorted.length > 0 ? sorted[0].freq : 0;
    const dominant_magnitude = sorted.length > 0 ? sorted[0].mag : 0;

    // Mean magnitude (excluding DC)
    const mean_magnitude = spectrum.reduce((sum, s) => sum + s.mag, 0) / Math.max(spectrum.length, 1);

    // Tooth-passing frequency
    const tooth_passing_freq_hz = (spindle_rpm / 60) * flutes;

    // Identify peaks and classify as harmonic vs non-harmonic
    const peaks: SpectralPeak[] = sorted.slice(0, LIMITS.MAX_PEAKS).map(p => {
      const harmResult = this.isNearHarmonic(p.freq, tooth_passing_freq_hz);
      return {
        frequency_hz: p.freq,
        magnitude: p.mag,
        is_harmonic: harmResult.is_harmonic,
        harmonic_order: harmResult.harmonic_order,
      };
    });

    // Chatter detection: non-harmonic peak in chatter range with amplitude > threshold x mean
    let chatter_detected = false;
    let chatter_frequency_hz: number | null = null;
    let chatter_severity: SpindleVibFFTOutput["chatter_severity"] = "none";

    for (const peak of peaks) {
      if (!peak.is_harmonic
        && peak.frequency_hz >= min_chatter_freq
        && peak.frequency_hz <= max_chatter_freq
        && peak.magnitude > mean_magnitude * chatter_threshold) {
        chatter_detected = true;
        chatter_frequency_hz = peak.frequency_hz;

        const ratio = peak.magnitude / mean_magnitude;
        if (ratio > 10) chatter_severity = "high";
        else if (ratio > 5) chatter_severity = "medium";
        else chatter_severity = "low";
        break;
      }
    }

    // Stable RPM recommendations via stability lobe pockets
    const stable_rpm_options: StableRPMOption[] = [];
    let spindle_override_pct = 100;

    if (chatter_detected && chatter_frequency_hz) {
      for (let k = 1; k <= 5; k++) {
        // Between lobes: RPM = 60 x f_chatter / (z x (k + 0.5))
        const rpm1 = Math.round((60 * chatter_frequency_hz) / (flutes * (k + 0.5)));
        // On lobe crests: RPM = 60 x f_chatter / (z x k)
        const rpm2 = Math.round((60 * chatter_frequency_hz) / (flutes * k));

        if (rpm1 > 100 && rpm1 < 50000) {
          stable_rpm_options.push({ rpm: rpm1, lobe_number: k, method: "between_lobes" });
        }
        if (rpm2 > 100 && rpm2 < 50000) {
          stable_rpm_options.push({ rpm: rpm2, lobe_number: k, method: "on_lobe" });
        }
      }

      // Sort by proximity to current RPM
      stable_rpm_options.sort((a, b) =>
        Math.abs(a.rpm - spindle_rpm) - Math.abs(b.rpm - spindle_rpm)
      );

      // Calculate override for best option
      if (stable_rpm_options.length > 0) {
        spindle_override_pct = Math.round((stable_rpm_options[0].rpm / spindle_rpm) * 100);
      }

      warnings.push(`CHATTER_DETECTED: ${chatter_severity.toUpperCase()} at ${chatter_frequency_hz.toFixed(0)} Hz. ` +
        `Recommend RPM change to ${stable_rpm_options[0]?.rpm || "N/A"}.`);
    }

    if (N < 256) {
      warnings.push(`LOW_RESOLUTION: ${N} samples gives ${freq_resolution.toFixed(1)} Hz resolution. 1024+ recommended.`);
    }

    return {
      dominant_frequency_hz,
      dominant_magnitude,
      mean_magnitude,
      chatter_detected,
      chatter_frequency_hz,
      chatter_severity,
      tooth_passing_freq_hz,
      peaks,
      stable_rpm_options: stable_rpm_options.slice(0, 5),
      spindle_override_pct,
      num_samples: N,
      freq_resolution,
      warnings,
      calculation_method: "DFT with Hann window + stability lobe chatter detection",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "spindle-vib-fft",
      name: "Spindle Vibration FFT Analysis",
      description: "DFT-based vibration analysis with chatter detection and stable RPM recommendation",
      formula: "X(k) = SUM x(n)*w(n)*exp(-j2pi*k*n/N); chatter = non-harmonic peak > threshold",
      reference: "Altintas (2012) Ch.3-4; Schmitz & Smith (2019) Ch.4",
      safety_class: "critical",
      domain: "stability",
      inputs: {
        signal: "Time-domain vibration signal",
        sample_rate_hz: "Sampling rate [Hz]",
        spindle_rpm: "Current spindle RPM",
        flutes: "Number of teeth/flutes",
      },
      outputs: {
        chatter_detected: "Chatter detection flag",
        chatter_frequency_hz: "Chatter frequency [Hz]",
        stable_rpm_options: "Recommended stable RPMs",
        dominant_frequency_hz: "Dominant frequency [Hz]",
      },
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────

  private windowFunc(type: string, n: number, N: number): number {
    const x = (2 * Math.PI * n) / (N - 1);
    switch (type) {
      case "hamming": return 0.54 - 0.46 * Math.cos(x);
      case "blackman": return 0.42 - 0.50 * Math.cos(x) + 0.08 * Math.cos(2 * x);
      case "rectangular": return 1.0;
      default: return 0.5 - 0.5 * Math.cos(x); // hann
    }
  }

  private isNearHarmonic(freq: number, fundamental: number): { is_harmonic: boolean; harmonic_order: number | null } {
    if (fundamental <= 0) return { is_harmonic: false, harmonic_order: null };
    for (let h = 1; h <= 10; h++) {
      const harmFreq = fundamental * h;
      if (Math.abs(freq - harmFreq) / harmFreq < LIMITS.HARMONIC_TOLERANCE) {
        return { is_harmonic: true, harmonic_order: h };
      }
    }
    return { is_harmonic: false, harmonic_order: null };
  }
}
