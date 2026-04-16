/**
 * PRISM MCP Server — Chatter Prediction Engine
 *
 * Stability analysis for machine tool chatter:
 * - Stability lobe diagram generation (Altintas/Tlusty)
 * - Chatter detection from vibration signal (DFT spectral analysis)
 * - Critical speed analysis for rotating shafts
 *
 * Ported from PRISM_CHATTER_PREDICTION_ENGINE.js (monolith R2.3.1).
 *
 * @module ChatterPredictionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ToolDynamics {
  mass?: number;         // kg
  stiffness: number;     // N/m
  damping?: number;      // N·s/m
  naturalFreq?: number;  // Hz (if providing FRF data directly)
  dampingRatio?: number;
}

export interface CuttingParams {
  Kt: number;               // Tangential cutting force coeff (N/m²)
  radialImmersion?: number;  // 0–1
  numTeeth?: number;
}

export interface RPMRange {
  min: number;
  max: number;
  points?: number;
}

export interface LobePoint {
  rpm: number;
  depthLimit_mm: number;
  chatterFrequency_Hz: number;
  lobeNumber: number;
}

export interface StabilityLobeResult {
  lobes: Array<{ lobeNumber: number; points: LobePoint[] }>;
  stablePockets: {
    all: Array<{ rpm: number; maxStableDepth_mm: number }>;
    peaks: Array<{ rpm: number; maxStableDepth_mm: number }>;
  };
  toolDynamics: { naturalFreq_Hz: number; dampingRatio: number; stiffness: number };
}

export interface StabilityCheckResult {
  stable: boolean;
  axialDepth_mm: number;
  criticalDepth_mm: number;
  margin_mm: number;
  marginPercent: number;
  recommendation: string;
}

export interface SpectralPeak {
  frequency: number;
  magnitude: number;
  index: number;
}

export interface ChatterDetectionResult {
  chatterDetected: boolean;
  chatterFrequency_Hz: number | null;
  chatterSeverity: number;
  toothPassingFrequency_Hz: number;
  harmonicPeaks: SpectralPeak[];
  nonHarmonicPeaks: SpectralPeak[];
  recommendation: string;
}

export interface ShaftParams {
  length: number;    // mm
  diameter: number;  // mm
  E: number;         // Pa (Young's modulus)
  density: number;   // kg/m³
}

export interface CriticalSpeedResult {
  supportType: string;
  criticalSpeeds: Array<{
    mode: number;
    frequency_Hz: number;
    criticalRPM: number;
  }>;
  recommendedMaxRPM: number;
  safeOperatingRanges: Array<{ min: number; max: number; description: string }>;
}

// ============================================================================
// ENGINE
// ============================================================================

class ChatterPredictionEngineImpl {

  /**
   * Generate stability lobe diagram for milling.
   * Uses Altintas analytical method.
   */
  generateStabilityLobes(
    toolDynamics: ToolDynamics,
    cuttingParams: CuttingParams,
    rpmRange: RPMRange,
  ): StabilityLobeResult {
    const { Kt, radialImmersion = 1, numTeeth = 4 } = cuttingParams;
    const { min: rpmMin, max: rpmMax, points = 100 } = rpmRange;

    let omega_n: number, zeta: number, k: number;
    if (toolDynamics.mass) {
      const m = toolDynamics.mass;
      k = toolDynamics.stiffness;
      omega_n = Math.sqrt(k / m);
      zeta = (toolDynamics.damping ?? 0) / (2 * Math.sqrt(k * m));
    } else {
      omega_n = (toolDynamics.naturalFreq ?? 1000) * 2 * Math.PI;
      zeta = toolDynamics.dampingRatio ?? 0.02;
      k = toolDynamics.stiffness;
    }

    const alphaxx = this.directionalFactor(radialImmersion);
    const lobes: StabilityLobeResult["lobes"] = [];
    const numLobes = 5;

    for (let lobeNum = 0; lobeNum < numLobes; lobeNum++) {
      const lobePoints: LobePoint[] = [];

      for (let i = 1; i <= points; i++) {
        const epsilon = Math.PI * i / points;
        const tanEps = Math.tan(epsilon);
        const omega_c = omega_n * Math.sqrt(
          1 - zeta * zeta + Math.sqrt((1 - zeta * zeta) ** 2 + tanEps * tanEps),
        );

        const G_real = -1 / (2 * k * zeta * Math.sqrt(Math.max(1e-12, 1 - zeta * zeta)));
        const a_lim = -1 / (2 * Kt * alphaxx * G_real * Math.cos(epsilon));
        const f_c = omega_c / (2 * Math.PI);
        const T = (2 * lobeNum * Math.PI + epsilon) / omega_c;
        const N = 60 / (numTeeth * T);

        if (N >= rpmMin && N <= rpmMax && a_lim > 0) {
          lobePoints.push({
            rpm: r2(N),
            depthLimit_mm: r4(a_lim * 1000),
            chatterFrequency_Hz: r2(f_c),
            lobeNumber: lobeNum,
          });
        }
      }

      if (lobePoints.length > 0) {
        lobes.push({
          lobeNumber: lobeNum,
          points: lobePoints.sort((a, b) => a.rpm - b.rpm),
        });
      }
    }

    const stablePockets = this.findStablePockets(lobes, rpmMin, rpmMax);

    return {
      lobes,
      stablePockets,
      toolDynamics: {
        naturalFreq_Hz: r2(omega_n / (2 * Math.PI)),
        dampingRatio: r4(zeta),
        stiffness: k,
      },
    };
  }

  /**
   * Check stability for given RPM and depth.
   */
  checkStability(
    rpm: number, axialDepth: number, lobes: StabilityLobeResult,
  ): StabilityCheckResult {
    let minStableDepth = Infinity;

    for (const lobe of lobes.lobes) {
      for (let i = 0; i < lobe.points.length - 1; i++) {
        const p1 = lobe.points[i];
        const p2 = lobe.points[i + 1];
        if (rpm >= Math.min(p1.rpm, p2.rpm) && rpm <= Math.max(p1.rpm, p2.rpm)) {
          const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
          const depth = p1.depthLimit_mm + t * (p2.depthLimit_mm - p1.depthLimit_mm);
          minStableDepth = Math.min(minStableDepth, depth);
        }
      }
    }

    const stable = axialDepth < minStableDepth;
    const margin = minStableDepth - axialDepth;
    const marginPercent = minStableDepth < Infinity
      ? (margin / minStableDepth) * 100 : 100;

    return {
      stable,
      axialDepth_mm: axialDepth,
      criticalDepth_mm: r4(minStableDepth),
      margin_mm: r4(margin),
      marginPercent: r2(marginPercent),
      recommendation: stable
        ? (marginPercent > 20 ? "Good - adequate stability margin" : "Caution - near stability limit")
        : "Unstable - reduce depth of cut or change RPM",
    };
  }

  /**
   * Detect chatter from vibration signal using spectral analysis.
   */
  detectChatter(
    signal: number[],
    config: { sampleRate: number; teeth: number; rpm: number },
  ): ChatterDetectionResult {
    const { sampleRate, teeth, rpm } = config;

    const spectrum = this.dft(signal);
    const N = signal.length;
    const freqs = spectrum.map((_, i) => i * sampleRate / N);

    const toothFreq = rpm * teeth / 60;
    const harmonics = [1, 2, 3, 4, 5].map(n => n * toothFreq);

    const peaks = this.findPeaks(spectrum, freqs);

    const harmonicPeaks: SpectralPeak[] = [];
    const nonHarmonicPeaks: SpectralPeak[] = [];

    for (const peak of peaks) {
      const isHarmonic = harmonics.some(h => Math.abs(peak.frequency - h) < toothFreq * 0.1);
      (isHarmonic ? harmonicPeaks : nonHarmonicPeaks).push(peak);
    }

    let chatterDetected = false;
    let chatterFrequency: number | null = null;
    let chatterSeverity = 0;

    if (nonHarmonicPeaks.length > 0 && harmonicPeaks.length > 0) {
      const ratio = nonHarmonicPeaks[0].magnitude / harmonicPeaks[0].magnitude;
      if (ratio > 0.3) {
        chatterDetected = true;
        chatterFrequency = nonHarmonicPeaks[0].frequency;
        chatterSeverity = Math.min(1, ratio);
      }
    }

    return {
      chatterDetected,
      chatterFrequency_Hz: chatterFrequency,
      chatterSeverity: r4(chatterSeverity),
      toothPassingFrequency_Hz: r2(toothFreq),
      harmonicPeaks,
      nonHarmonicPeaks,
      recommendation: chatterDetected
        ? `Chatter detected at ${chatterFrequency?.toFixed(1)} Hz. Adjust RPM or reduce depth.`
        : "No chatter detected",
    };
  }

  /**
   * Critical speed analysis for a rotating shaft.
   */
  criticalSpeeds(
    shaft: ShaftParams,
    supportType: "simply-supported" | "fixed-fixed" | "cantilever" = "simply-supported",
  ): CriticalSpeedResult {
    const { length: L, diameter: d, E, density: rho } = shaft;

    const A = Math.PI * d * d / 4;
    const I = Math.PI * Math.pow(d, 4) / 64;
    const m_bar = rho * A;
    const EI = E * I;

    const lambdaMap: Record<string, number[]> = {
      "simply-supported": [Math.PI, 2 * Math.PI, 3 * Math.PI],
      "fixed-fixed": [4.730, 7.853, 10.996],
      "cantilever": [1.875, 4.694, 7.855],
    };
    const lambdas = lambdaMap[supportType] ?? lambdaMap["simply-supported"];

    const criticalSpeeds = lambdas.map((lambda, i) => {
      const omega_n = (lambda / L) ** 2 * Math.sqrt(EI / m_bar);
      const f_n = omega_n / (2 * Math.PI);
      return {
        mode: i + 1,
        frequency_Hz: r2(f_n),
        criticalRPM: r2(f_n * 60),
      };
    });

    const safeRanges = this.findSafeRanges(criticalSpeeds);

    return {
      supportType,
      criticalSpeeds,
      recommendedMaxRPM: r2(criticalSpeeds[0].criticalRPM * 0.8),
      safeOperatingRanges: safeRanges,
    };
  }

  // ── Internal helpers ──

  private directionalFactor(radialImmersion: number): number {
    const phi_st = Math.acos(1 - 2 * radialImmersion);
    const phi_ex = Math.PI;
    return (1 / (2 * Math.PI)) * (
      Math.cos(2 * phi_st) - Math.cos(2 * phi_ex) + 2 * (phi_ex - phi_st)
    );
  }

  private findStablePockets(
    lobes: StabilityLobeResult["lobes"], rpmMin: number, rpmMax: number,
  ) {
    const pockets: Array<{ rpm: number; maxStableDepth_mm: number }> = [];
    const step = 100;

    for (let rpm = rpmMin; rpm <= rpmMax; rpm += step) {
      let maxStableDepth = Infinity;
      for (const lobe of lobes) {
        for (let i = 0; i < lobe.points.length - 1; i++) {
          const p1 = lobe.points[i], p2 = lobe.points[i + 1];
          if (rpm >= Math.min(p1.rpm, p2.rpm) && rpm <= Math.max(p1.rpm, p2.rpm)) {
            const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
            maxStableDepth = Math.min(
              maxStableDepth, p1.depthLimit_mm + t * (p2.depthLimit_mm - p1.depthLimit_mm),
            );
          }
        }
      }
      if (maxStableDepth > 0 && maxStableDepth < Infinity) {
        pockets.push({ rpm, maxStableDepth_mm: r4(maxStableDepth) });
      }
    }

    const peaks: typeof pockets = [];
    for (let i = 1; i < pockets.length - 1; i++) {
      if (pockets[i].maxStableDepth_mm > pockets[i - 1].maxStableDepth_mm
        && pockets[i].maxStableDepth_mm > pockets[i + 1].maxStableDepth_mm) {
        peaks.push(pockets[i]);
      }
    }

    return {
      all: pockets,
      peaks: peaks.sort((a, b) => b.maxStableDepth_mm - a.maxStableDepth_mm),
    };
  }

  private dft(signal: number[]): number[] {
    const N = signal.length;
    const spectrum: number[] = [];
    for (let k = 0; k < N; k++) {
      let real = 0, imag = 0;
      for (let t = 0; t < N; t++) {
        const angle = -2 * Math.PI * k * t / N;
        real += signal[t] * Math.cos(angle);
        imag += signal[t] * Math.sin(angle);
      }
      spectrum.push(Math.sqrt(real * real + imag * imag) / N);
    }
    return spectrum;
  }

  private findPeaks(spectrum: number[], freqs: number[]): SpectralPeak[] {
    const peaks: SpectralPeak[] = [];
    const maxVal = Math.max(...spectrum);
    const minHeight = maxVal * 0.05;
    const halfN = Math.floor(spectrum.length / 2);

    for (let i = 2; i < halfN - 2; i++) {
      if (spectrum[i] > minHeight
        && spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i - 2]
        && spectrum[i] > spectrum[i + 1] && spectrum[i] > spectrum[i + 2]) {
        peaks.push({ frequency: freqs[i], magnitude: spectrum[i], index: i });
      }
    }

    return peaks.sort((a, b) => b.magnitude - a.magnitude);
  }

  private findSafeRanges(criticalSpeeds: Array<{ criticalRPM: number; mode: number }>) {
    const ranges: Array<{ min: number; max: number; description: string }> = [];
    const margin = 0.15;
    let prevUpper = 0;

    for (const cs of criticalSpeeds) {
      const lower = cs.criticalRPM * (1 - margin);
      if (lower > prevUpper) {
        ranges.push({
          min: r2(prevUpper),
          max: r2(lower),
          description: `Safe range below critical speed ${cs.mode}`,
        });
      }
      prevUpper = cs.criticalRPM * (1 + margin);
    }

    return ranges;
  }

  /**
   * Detect chatter using STFTChatter algorithm for time-frequency analysis.
   *
   * Advantages over the existing DFT-based detectChatter():
   * - Tracks chatter ONSET time (when it first appears)
   * - Provides severity classification (none/mild/moderate/severe)
   * - Reports chatter percentage (fraction of signal with chatter)
   * - Generates monitoring comment for G-code embedding
   *
   * Falls back to existing DFT-based detectChatter() if STFTChatter unavailable.
   */
  detectChatterSTFT(input: {
    signal: number[];
    sample_rate: number;
    spindle_speed: number;
    n_flutes: number;
    window_size?: number;
    overlap?: number;
    threshold?: number;
  }): ChatterDetectionResult & {
    stft_used: boolean;
    severity: "none" | "mild" | "moderate" | "severe";
    chatter_percentage: number;
    chatter_onset_time: number;
    chatter_signal_ratio: number;
    tooth_passing_frequency_Hz: number;
    monitoring_comment: string;
    recommended_rpm_change: number | null;
  } {
    const warnings: string[] = [];
    const { signal, sample_rate, spindle_speed, n_flutes } = input;
    const toothFreq = (spindle_speed * n_flutes) / 60;

    // Guard: empty signal
    if (signal.length === 0) {
      warnings.push("Empty signal — no chatter analysis possible");
      return {
        chatterDetected: false,
        chatterFrequency_Hz: null,
        chatterSeverity: 0,
        toothPassingFrequency_Hz: r2(toothFreq),
        harmonicPeaks: [],
        nonHarmonicPeaks: [],
        recommendation: "No signal data provided",
        stft_used: false,
        severity: "none" as const,
        chatter_percentage: 0,
        chatter_onset_time: -1,
        chatter_signal_ratio: 0,
        tooth_passing_frequency_Hz: r2(toothFreq),
        monitoring_comment: `(CHATTER: NONE, TPF: ${Math.round(toothFreq)}Hz)`,
        recommended_rpm_change: null,
      };
    }

    // Try STFTChatter algorithm
    let stftUsed = false;
    let severity: "none" | "mild" | "moderate" | "severe" = "none";
    let chatterPct = 0;
    let chatterOnset = -1;
    let chatterSignalRatio = 0;
    let stftChatterFreq: number | null = null;

    try {
      const { STFTChatterDetection } = require("../algorithms/STFTChatter.js");
      const stft = new STFTChatterDetection();
      const stftResult = stft.calculate({
        signal,
        sample_rate,
        spindle_speed,
        n_flutes,
        window_size: input.window_size ?? 512,
        overlap: input.overlap ?? 0.75,
        threshold: input.threshold ?? 3.0,
      });
      stftUsed = true;
      severity = stftResult.severity;
      chatterPct = stftResult.chatter_percentage;
      chatterOnset = stftResult.chatter_onset_time;
      chatterSignalRatio = stftResult.chatter_signal_ratio;
      if (stftResult.chatter_detected) {
        stftChatterFreq = stftResult.chatter_frequency;
      }
      if (stftResult.warnings) warnings.push(...stftResult.warnings);
    } catch {
      warnings.push("STFTChatter unavailable — falling back to DFT detection");
    }

    // Run base DFT detection for comparison and as fallback
    const baseResult = this.detectChatter(signal, {
      sampleRate: sample_rate,
      teeth: n_flutes,
      rpm: spindle_speed,
    });

    // Merge: prefer STFT results when available
    const chatterDetected = stftUsed
      ? severity !== "none"
      : baseResult.chatterDetected;
    const chatterFreqHz = stftUsed && stftChatterFreq
      ? stftChatterFreq
      : baseResult.chatterFrequency_Hz;

    // If not using STFT, derive severity from DFT severity score
    if (!stftUsed && baseResult.chatterDetected) {
      if (baseResult.chatterSeverity > 0.7) severity = "severe";
      else if (baseResult.chatterSeverity > 0.4) severity = "moderate";
      else severity = "mild";
      chatterPct = baseResult.chatterSeverity * 100;
    }

    // Recommend RPM change: shift to nearest stable pocket
    // Chatter frequency fc relates to lobe number: N_sweet = 60*fc / (n_flutes*(k+1))
    let recommendedRPM: number | null = null;
    if (chatterDetected && chatterFreqHz) {
      // Try k=0 lobe pocket (highest stable depth)
      const sweetRPM = (60 * chatterFreqHz) / (n_flutes * 1);
      // Only recommend if within ±30% of current RPM
      if (Math.abs(sweetRPM - spindle_speed) / spindle_speed < 0.3) {
        recommendedRPM = Math.round(sweetRPM);
      }
    }

    // Build monitoring comment
    let monitoringComment: string;
    if (!chatterDetected) {
      monitoringComment = `(CHATTER: NONE, TPF: ${Math.round(toothFreq)}Hz)`;
    } else {
      monitoringComment = `(CHATTER: ${severity.toUpperCase()} at ${Math.round(chatterFreqHz ?? 0)}Hz, ` +
        `ALARM: REDUCE ap 30%${recommendedRPM ? `, TRY RPM: ${recommendedRPM}` : ""})`;
    }

    return {
      ...baseResult,
      chatterDetected,
      chatterFrequency_Hz: chatterFreqHz,
      chatterSeverity: stftUsed ? chatterSignalRatio : baseResult.chatterSeverity,
      recommendation: severity === "none"
        ? "No chatter — stable cutting"
        : severity === "mild"
          ? "Mild chatter — monitor closely, consider reducing ap 10-20%"
          : severity === "moderate"
            ? "Moderate chatter — reduce ap 30% or adjust RPM to nearest sweet spot"
            : "SEVERE chatter — STOP. Reduce ap significantly or change spindle speed",
      stft_used: stftUsed,
      severity,
      chatter_percentage: r2(chatterPct),
      chatter_onset_time: r4(chatterOnset),
      chatter_signal_ratio: r4(chatterSignalRatio),
      tooth_passing_frequency_Hz: r2(toothFreq),
      monitoring_comment: monitoringComment,
      recommended_rpm_change: recommendedRPM,
    };
  }
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }

export const chatterPredictionEngine = new ChatterPredictionEngineImpl();
