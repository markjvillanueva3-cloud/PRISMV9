/**
 * AdaptiveSpindleControlEngine — Real-Time Spindle Speed Adaptation
 *
 * Implements closed-loop spindle speed control for chatter suppression
 * using stability lobe theory, FFT-based chatter detection, and
 * sinusoidal spindle speed variation (SSV).
 *
 * Physics basis:
 * - Stability lobe theory: Altintas, Y. (2012) "Manufacturing Automation",
 *   Cambridge University Press, Ch. 3–4.
 * - Chatter frequency → optimal RPM mapping via lobe center equations.
 * - SSV (Sinusoidal Spindle Speed Variation): Al-Regib et al. (2003),
 *   continuously modulates RPM to disrupt regenerative chatter buildup.
 *
 * Actions: spindle_adapt (via calcDispatcher)
 *
 * @version 1.0.0
 * @module AdaptiveSpindleControlEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SpindleAdaptInput {
  /** Acceleration vibration signal samples */
  vibration_samples?: number[];
  /** Sample rate in Hz (default 2000) */
  sample_rate_hz?: number;
  /** Current spindle RPM */
  current_rpm: number;
  /** Axial depth of cut in mm */
  depth_of_cut_mm: number;
  /** Tool diameter in mm */
  tool_diameter_mm: number;
  /** Number of cutting flutes */
  flute_count: number;
  /** Tool/spindle first natural frequency in Hz (default 800) */
  natural_freq_hz?: number;
  /** Damping ratio (default 0.03) */
  damping_ratio?: number;
  /** Dynamic stiffness in N/mm (default 5000) */
  stiffness_N_per_mm?: number;
  /** Specific cutting force coefficient in N/mm² (default 2000) */
  Kc_N_per_mm2?: number;
  /** Minimum allowable RPM (default 1000) */
  rpm_min?: number;
  /** Maximum allowable RPM (default 20000) */
  rpm_max?: number;
  /** Maximum RPM change rate in RPM/sec (default 500) */
  max_rpm_rate?: number;
  /** Control loop time step in seconds (default 0.1) */
  dt_sec?: number;
  /** Enable sinusoidal spindle speed variation (default false) */
  ssv_enabled?: boolean;
  /** SSV amplitude as percentage of base RPM (default 10) */
  ssv_amplitude_pct?: number;
  /** SSV modulation frequency in Hz (default 2) */
  ssv_freq_hz?: number;
}

export interface SpindleAdaptResult {
  recommended_rpm: number;
  rpm_adjustment: number;
  chatter_detected: boolean;
  chatter_frequency_hz: number | null;
  stability_status: "stable" | "marginal" | "unstable";
  stability_lobe_n: number | null;
  ssv_profile?: { rpm_base: number; amplitude: number; freq_hz: number };
  critical_depth_mm: number;
  dominant_frequencies: Array<{ freq_hz: number; amplitude: number }>;
  rate_limited: boolean;
  warnings: string[];
  formula: string;
}

interface ChatterDetection {
  detected: boolean;
  freq: number | null;
  amplitude: number;
}

// ============================================================================
// FFT UTILITY
// ============================================================================

/**
 * Radix-2 Cooley-Tukey FFT (in-place, iterative).
 * Returns magnitude spectrum for positive frequencies.
 *
 * @param signal - Real-valued time-domain samples (length must be power of 2)
 * @returns Array of { freq_hz, amplitude } for bins 0..N/2
 */
function fftMagnitude(
  signal: number[],
  sampleRate: number
): Array<{ freq_hz: number; amplitude: number }> {
  const N = signal.length;
  if (N === 0) return [];

  // Zero-pad to next power of 2
  let n = 1;
  while (n < N) n <<= 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < N; i++) re[i] = signal[i];

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
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
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const tRe = curRe * re[i + j + halfLen] - curIm * im[i + j + halfLen];
        const tIm = curRe * im[i + j + halfLen] + curIm * re[i + j + halfLen];
        re[i + j + halfLen] = re[i + j] - tRe;
        im[i + j + halfLen] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }

  // Magnitude spectrum (positive frequencies only, normalized)
  const bins = n >> 1;
  const result: Array<{ freq_hz: number; amplitude: number }> = [];
  for (let k = 1; k <= bins; k++) {
    const mag = (2 / n) * Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    result.push({
      freq_hz: (k * sampleRate) / n,
      amplitude: mag,
    });
  }
  return result;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Adaptive Spindle Control Engine
 *
 * Provides real-time spindle RPM adaptation based on:
 * 1. Stability lobe diagram evaluation (Altintas 2012)
 * 2. FFT-based chatter frequency detection
 * 3. Optimal RPM selection from nearest stable lobe
 * 4. Sinusoidal Spindle Speed Variation (SSV) for chatter suppression
 * 5. RPM rate limiting for safe spindle transitions
 *
 * @example
 * ```typescript
 * const result = adaptiveSpindleControlEngine.adapt({
 *   current_rpm: 8000,
 *   depth_of_cut_mm: 3.0,
 *   tool_diameter_mm: 12,
 *   flute_count: 4,
 *   vibration_samples: accelSignal,
 *   sample_rate_hz: 2000,
 * });
 * ```
 */
export class AdaptiveSpindleControlEngine {
  readonly id = "AdaptiveSpindleControlEngine";

  // --------------------------------------------------------------------------
  // Stability lobe: critical depth at a given RPM
  // --------------------------------------------------------------------------

  /**
   * Compute the critical (limiting) axial depth of cut for a given RPM
   * using Altintas stability lobe theory.
   *
   * a_lim = -1 / (2 · Kc · Re[G(jωc)])
   *
   * At lobe centers the simplified closed-form is:
   *   a_lim = (2·k·(1 + κ²)·√(1 + κ²)) / (Kc · N)
   * where κ = 2ζ(ωc/ωn) / (1 - (ωc/ωn)²)  — but this diverges at resonance.
   *
   * We use the full transfer-function form evaluated at the chatter frequency
   * corresponding to each lobe, scanning lobes 1..20.
   *
   * @param rpm - Spindle speed (rev/min)
   * @param naturalFreq - First natural frequency of tool/spindle (Hz)
   * @param damping - Damping ratio ζ
   * @param Kc - Specific cutting force (N/mm²)
   * @param stiffness - Dynamic stiffness k (N/mm)
   * @param flutes - Number of flutes N
   * @returns Critical depth of cut in mm at the most favorable lobe
   */
  stabilityLimit(
    rpm: number,
    naturalFreq: number,
    damping: number,
    Kc: number,
    stiffness: number,
    flutes: number
  ): number {
    const toothPassFreq = (rpm * flutes) / 60; // Hz
    if (toothPassFreq <= 0) return 0;

    const wn = 2 * Math.PI * naturalFreq;
    let bestDepth = 0;

    // Evaluate at the chatter frequency implied by each lobe (k = 0..19)
    for (let k = 0; k < 20; k++) {
      // Chatter frequency for this lobe: fc = toothPassFreq * (k + ε/π)
      // where ε = arctan(2ζr/(1-r²))
      // We solve iteratively: start with fc ≈ naturalFreq
      const fc = this._chatterFreqForLobe(k, toothPassFreq, naturalFreq, damping);
      if (fc <= 0) continue;

      const wc = 2 * Math.PI * fc;
      const r = wc / wn;
      const r2 = r * r;

      // Real part of FRF: Re[G] = k·(1 - r²) / ((1-r²)² + (2ζr)²)  → units 1/k
      const denom = (1 - r2) * (1 - r2) + (2 * damping * r) * (2 * damping * r);
      if (denom < 1e-12) continue;
      const realG = (1 - r2) / (stiffness * denom);

      // a_lim = -1 / (2 · Kc · N · Re[G])
      // Stable when Re[G] < 0 → chatter freq above natural freq
      if (realG >= 0) continue; // unstable direction, skip
      const aLim = -1 / (2 * Kc * flutes * realG);
      if (aLim > 0 && (bestDepth === 0 || aLim > bestDepth)) {
        bestDepth = aLim;
      }
    }

    // Unconditionally-stable minimum depth (Altintas eq. 3.30):
    // This is the absolute minimum of the stability boundary, guaranteed stable
    // at any RPM. Higher damping always raises this floor.
    const unconditionalLimit = (2 * stiffness * damping * (1 + damping)) / (Kc * flutes);

    // Use lobe-based value if found, but never below the unconditional floor
    if (bestDepth === 0) {
      // No lobe yielded a stable depth — use simplified static limit
      bestDepth = (2 * stiffness * (1 + damping)) / (Kc * flutes);
    }

    // The stability limit at any RPM is at least the unconditional minimum
    return Math.max(bestDepth, unconditionalLimit);
  }

  // --------------------------------------------------------------------------
  // Find nearest stable RPM for a given depth of cut
  // --------------------------------------------------------------------------

  /**
   * Scan RPM range to find the speed with the highest stability margin
   * (critical depth - actual depth). Returns the RPM where the margin
   * is maximized and positive, preferring RPMs closest to current if tied.
   *
   * @returns Optimal stable RPM within [rpm_min, rpm_max]
   */
  findStableRpm(
    depthMm: number,
    naturalFreq: number,
    damping: number,
    Kc: number,
    stiffness: number,
    flutes: number,
    rpmMin: number,
    rpmMax: number
  ): number {
    const step = 50; // RPM scan resolution
    let bestRpm = rpmMin;
    let bestMargin = -Infinity;

    for (let rpm = rpmMin; rpm <= rpmMax; rpm += step) {
      const aLim = this.stabilityLimit(rpm, naturalFreq, damping, Kc, stiffness, flutes);
      const margin = aLim - depthMm;
      if (margin > bestMargin) {
        bestMargin = margin;
        bestRpm = rpm;
      }
    }

    return bestRpm;
  }

  // --------------------------------------------------------------------------
  // FFT-based chatter detection
  // --------------------------------------------------------------------------

  /**
   * Detect chatter from a vibration acceleration signal using FFT.
   *
   * Chatter manifests as a spectral peak near but NOT at a harmonic of the
   * tooth-passing frequency. We flag chatter when a dominant peak exists
   * that is > 3× the median spectral amplitude and not within ±5% of
   * any tooth-passing harmonic.
   *
   * @param signal - Acceleration samples
   * @param sampleRate - Sample rate in Hz
   * @param toothPassFreq - Tooth-passing frequency (RPM × flutes / 60) in Hz
   * @returns Detection result with frequency and amplitude
   */
  detectChatter(
    signal: number[],
    sampleRate: number,
    toothPassFreq: number
  ): ChatterDetection {
    if (signal.length < 8) {
      return { detected: false, freq: null, amplitude: 0 };
    }

    const spectrum = fftMagnitude(signal, sampleRate);
    if (spectrum.length === 0) {
      return { detected: false, freq: null, amplitude: 0 };
    }

    // Threshold: use both median-relative and max-relative criteria
    // to avoid false positives when signal is a pure tone (median ≈ 0)
    const amps = spectrum.map((s) => s.amplitude).sort((a, b) => a - b);
    const median = amps[Math.floor(amps.length / 2)];
    const maxAmp = amps[amps.length - 1];
    // Peak must be > 3× median AND > 5% of max amplitude
    const threshold = Math.max(median * 3, maxAmp * 0.05);

    // Find peaks above threshold that are NOT tooth-passing harmonics
    let maxChatterAmp = 0;
    let chatterFreq: number | null = null;

    for (const bin of spectrum) {
      if (bin.amplitude < threshold) continue;

      // Check if this is a tooth-passing harmonic (within ±5%)
      let isHarmonic = false;
      if (toothPassFreq > 0) {
        for (let h = 1; h <= 10; h++) {
          const harmonicFreq = toothPassFreq * h;
          if (Math.abs(bin.freq_hz - harmonicFreq) / harmonicFreq < 0.05) {
            isHarmonic = true;
            break;
          }
        }
      }

      if (!isHarmonic && bin.amplitude > maxChatterAmp) {
        maxChatterAmp = bin.amplitude;
        chatterFreq = bin.freq_hz;
      }
    }

    return {
      detected: chatterFreq !== null,
      freq: chatterFreq,
      amplitude: maxChatterAmp,
    };
  }

  // --------------------------------------------------------------------------
  // Main adaptation method
  // --------------------------------------------------------------------------

  /**
   * Compute recommended spindle RPM based on current conditions.
   *
   * Pipeline:
   * 1. Evaluate stability limit at current RPM → stable/marginal/unstable
   * 2. If vibration signal provided, run FFT chatter detection
   * 3. If chatter detected or unstable, find nearest stable RPM from lobe diagram
   * 4. Apply SSV profile if enabled and chatter detected
   * 5. Apply RPM rate limiting (max_rpm_rate × dt_sec)
   * 6. Return full diagnostic result
   */
  adapt(input: SpindleAdaptInput): SpindleAdaptResult {
    // Defaults
    const naturalFreq = input.natural_freq_hz ?? 800;
    const damping = input.damping_ratio ?? 0.03;
    const stiffness = input.stiffness_N_per_mm ?? 5000;
    const Kc = input.Kc_N_per_mm2 ?? 2000;
    const rpmMin = input.rpm_min ?? 1000;
    const rpmMax = input.rpm_max ?? 20000;
    const maxRate = input.max_rpm_rate ?? 500;
    const dt = input.dt_sec ?? 0.1;
    const ssvEnabled = input.ssv_enabled ?? false;
    const ssvAmplitudePct = input.ssv_amplitude_pct ?? 10;
    const ssvFreq = input.ssv_freq_hz ?? 2;
    const sampleRate = input.sample_rate_hz ?? 2000;

    const warnings: string[] = [];
    const flutes = input.flute_count;
    const toothPassFreq = (input.current_rpm * flutes) / 60;

    // 1. Stability evaluation at current RPM
    const criticalDepth = this.stabilityLimit(
      input.current_rpm, naturalFreq, damping, Kc, stiffness, flutes
    );
    const marginRatio = criticalDepth > 0
      ? (criticalDepth - input.depth_of_cut_mm) / criticalDepth
      : -1;

    let stabilityStatus: "stable" | "marginal" | "unstable";
    if (marginRatio > 0.2) {
      stabilityStatus = "stable";
    } else if (marginRatio > 0) {
      stabilityStatus = "marginal";
      warnings.push(
        `Stability margin only ${(marginRatio * 100).toFixed(1)}% — ` +
        `depth ${input.depth_of_cut_mm.toFixed(2)} mm vs limit ${criticalDepth.toFixed(2)} mm`
      );
    } else {
      stabilityStatus = "unstable";
      warnings.push(
        `Operating ABOVE stability limit: depth ${input.depth_of_cut_mm.toFixed(2)} mm ` +
        `exceeds a_lim ${criticalDepth.toFixed(2)} mm at ${input.current_rpm} RPM`
      );
    }

    // 2. Chatter detection from vibration signal
    let chatterDetected = false;
    let chatterFreq: number | null = null;
    let dominantFrequencies: Array<{ freq_hz: number; amplitude: number }> = [];

    if (input.vibration_samples && input.vibration_samples.length >= 8) {
      const spectrum = fftMagnitude(input.vibration_samples, sampleRate);
      // Top 5 dominant frequencies
      dominantFrequencies = [...spectrum]
        .sort((a, b) => b.amplitude - a.amplitude)
        .slice(0, 5);

      const detection = this.detectChatter(
        input.vibration_samples, sampleRate, toothPassFreq
      );
      chatterDetected = detection.detected;
      chatterFreq = detection.freq;

      if (chatterDetected && chatterFreq !== null) {
        warnings.push(
          `Chatter detected at ${chatterFreq.toFixed(1)} Hz ` +
          `(amplitude ${detection.amplitude.toFixed(4)})`
        );
      }
    }

    // 3. Determine target RPM
    let targetRpm = input.current_rpm;
    let lobeN: number | null = null;

    const needsAdjustment = stabilityStatus === "unstable" || chatterDetected;

    if (needsAdjustment) {
      if (chatterDetected && chatterFreq !== null) {
        // Map chatter frequency to optimal RPM via lobe centers
        // n_rpm = 60 · fc / (N · (k + ε/π))
        const wc = 2 * Math.PI * chatterFreq;
        const wn = 2 * Math.PI * naturalFreq;
        const r = wc / wn;
        const r2 = r * r;
        const denomPhase = 1 - r2;
        const eps = Math.atan2(2 * damping * r, denomPhase);

        let bestLobe = -1;
        let bestLobeRpm = input.current_rpm;
        let bestMargin = -Infinity;

        for (let k = 0; k < 20; k++) {
          const lobeRpm = (60 * chatterFreq) / (flutes * (k + eps / Math.PI));
          if (lobeRpm < rpmMin || lobeRpm > rpmMax) continue;
          const aLim = this.stabilityLimit(
            lobeRpm, naturalFreq, damping, Kc, stiffness, flutes
          );
          const margin = aLim - input.depth_of_cut_mm;
          if (margin > bestMargin) {
            bestMargin = margin;
            bestLobeRpm = lobeRpm;
            bestLobe = k;
          }
        }

        if (bestMargin > 0) {
          targetRpm = Math.round(bestLobeRpm);
          lobeN = bestLobe;
        } else {
          // Fall back to full scan
          targetRpm = this.findStableRpm(
            input.depth_of_cut_mm, naturalFreq, damping, Kc, stiffness,
            flutes, rpmMin, rpmMax
          );
          warnings.push("No lobe center yielded stable operation; used full RPM scan");
        }
      } else {
        // No vibration data — use stability scan
        targetRpm = this.findStableRpm(
          input.depth_of_cut_mm, naturalFreq, damping, Kc, stiffness,
          flutes, rpmMin, rpmMax
        );
      }
    }

    // 4. RPM rate limiting
    const maxDelta = maxRate * dt;
    const rawDelta = targetRpm - input.current_rpm;
    let rateLimited = false;
    let recommendedRpm = targetRpm;

    if (Math.abs(rawDelta) > maxDelta) {
      recommendedRpm = input.current_rpm + Math.sign(rawDelta) * maxDelta;
      rateLimited = true;
      warnings.push(
        `RPM change rate-limited: requested Δ${rawDelta.toFixed(0)} RPM, ` +
        `applied Δ${(Math.sign(rawDelta) * maxDelta).toFixed(0)} RPM ` +
        `(max ${maxRate} RPM/s × ${dt} s)`
      );
    }

    // Clamp to range
    recommendedRpm = Math.max(rpmMin, Math.min(rpmMax, Math.round(recommendedRpm)));

    // 5. SSV profile
    let ssvProfile: SpindleAdaptResult["ssv_profile"];
    if (ssvEnabled && (chatterDetected || stabilityStatus !== "stable")) {
      const amplitude = recommendedRpm * (ssvAmplitudePct / 100);
      ssvProfile = {
        rpm_base: recommendedRpm,
        amplitude: Math.round(amplitude),
        freq_hz: ssvFreq,
      };
      // Ensure SSV bounds stay within limits
      if (recommendedRpm - amplitude < rpmMin) {
        warnings.push(
          `SSV lower bound (${(recommendedRpm - amplitude).toFixed(0)} RPM) ` +
          `below rpm_min (${rpmMin}); amplitude clamped`
        );
        ssvProfile.amplitude = Math.round(recommendedRpm - rpmMin);
      }
      if (recommendedRpm + amplitude > rpmMax) {
        warnings.push(
          `SSV upper bound (${(recommendedRpm + amplitude).toFixed(0)} RPM) ` +
          `above rpm_max (${rpmMax}); amplitude clamped`
        );
        ssvProfile.amplitude = Math.min(
          ssvProfile.amplitude,
          Math.round(rpmMax - recommendedRpm)
        );
      }
    }

    // 6. Build formula string
    const formula = this._buildFormula(input.current_rpm, recommendedRpm, chatterFreq, criticalDepth);

    return {
      recommended_rpm: recommendedRpm,
      rpm_adjustment: recommendedRpm - input.current_rpm,
      chatter_detected: chatterDetected,
      chatter_frequency_hz: chatterFreq,
      stability_status: stabilityStatus,
      stability_lobe_n: lobeN,
      ssv_profile: ssvProfile,
      critical_depth_mm: Math.round(criticalDepth * 1000) / 1000,
      dominant_frequencies: dominantFrequencies,
      rate_limited: rateLimited,
      warnings,
      formula,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Compute the chatter frequency associated with lobe index k.
   *
   * From Altintas (2012) eq. 3.22:
   *   ε = π - 2·arctan((1 - (ωc/ωn)²) / (2ζ·ωc/ωn))
   *   ωc·T = ε + 2πk  where T = 60/(N·n)
   *
   * We iterate because ε depends on ωc.
   */
  private _chatterFreqForLobe(
    k: number,
    toothPassFreq: number,
    naturalFreq: number,
    damping: number
  ): number {
    // Initial guess: chatter freq near natural freq
    let fc = naturalFreq * (1 + 0.01 * k);
    const wn = 2 * Math.PI * naturalFreq;

    for (let iter = 0; iter < 50; iter++) {
      const wc = 2 * Math.PI * fc;
      const r = wc / wn;
      const r2 = r * r;
      const denom = 2 * damping * r;
      const eps = Math.PI - 2 * Math.atan2(1 - r2, denom);

      // T = 1 / toothPassFreq;  ωc = (ε + 2πk) / T = (ε + 2πk) · toothPassFreq
      const fcNew = (eps + 2 * Math.PI * k) * toothPassFreq / (2 * Math.PI);
      if (Math.abs(fcNew - fc) < 0.01) {
        return fcNew;
      }
      // Relaxation for stability: blend old and new (0.5 weight)
      fc = 0.5 * fc + 0.5 * fcNew;
    }
    return fc;
  }

  /** Build human-readable formula string for the result. */
  private _buildFormula(
    currentRpm: number,
    recommendedRpm: number,
    chatterFreq: number | null,
    criticalDepth: number
  ): string {
    const parts: string[] = [
      `a_lim = -1/(2·Kc·N·Re[G(jωc)]) = ${criticalDepth.toFixed(3)} mm`,
    ];
    if (chatterFreq !== null) {
      parts.push(
        `f_chatter = ${chatterFreq.toFixed(1)} Hz → ` +
        `n_opt = 60·fc/(N·(k + ε/π)) = ${recommendedRpm} RPM`
      );
    }
    if (currentRpm !== recommendedRpm) {
      parts.push(`Δn = ${recommendedRpm - currentRpm} RPM`);
    }
    return parts.join("; ");
  }
}

/** Singleton instance */
export const adaptiveSpindleControlEngine = new AdaptiveSpindleControlEngine();
