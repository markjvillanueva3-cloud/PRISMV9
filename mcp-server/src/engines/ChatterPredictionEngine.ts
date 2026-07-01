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

/**
 * Inputs for trend-based predictive chatter analysis.
 * Composes already-shipped {@link ChatterPredictionEngineImpl.checkStability}
 * with a linear-regression vibration-trend slope to estimate time-to-chatter.
 *
 * Re-modularized from monolith asset `PRISM_FFT_PREDICTIVE_CHATTER`
 * (R2.3.3 algorithm gap extraction). Base FFT + lobes already shipped —
 * this adds the trend / time-to-chatter / tiered action layer the monolith
 * exposed via its `predictChatter()` + `_getRecommendation()` methods.
 *
 * Reference: Tobias (1965) "Machine Tool Vibration"; Altintas & Weck (2004)
 * CIRP "Chatter Stability of Metal Cutting and Grinding" §4 (predictive
 * envelopes from trend analysis).
 */
export interface PredictWithTrendInput {
  /** Current spindle RPM. */
  rpm: number;
  /** Current axial depth of cut, mm. */
  axialDepth_mm: number;
  /**
   * Vibration trend samples in chronological order (RMS, peak amplitude,
   * or other monotonic chatter proxy). Slope is taken via least-squares
   * regression over the index axis — units must be self-consistent.
   * Must have ≥2 samples for trend to be meaningful (1 or 0 → slope=0).
   */
  vibrationTrend: number[];
  /** Pre-computed lobe diagram (from {@link generateStabilityLobes}). */
  lobes: StabilityLobeResult;
  /** Margin% below this triggers WARNING (default 20). */
  warningMarginPercent?: number;
  /** Margin% below this + positive trend triggers IMMINENT (default 10). */
  imminentMarginPercent?: number;
  /** Trend slope above this is considered actively-rising (default 0.1). */
  imminentTrendSlope?: number;
  /**
   * Empirical scale factor mapping trend-slope-units to depth-encroachment-rate
   * (mm/s). Default 10 mirrors the monolith asset; callers should tune to
   * sensor-calibrated values when available.
   */
  trendScaleFactor?: number;
}

/** Tiered recommended action with explicit speed/DOC delta vectors. */
export interface ChatterAction {
  urgency: "NONE" | "SOON" | "IMMEDIATE";
  /** Suggested RPM change (signed; 0 = no change). */
  speedDelta: number;
  /** Suggested axial DOC change in mm (signed; 0 = no change). */
  docDelta_mm: number;
  description: string;
}

/**
 * Empirical tuning constants for {@link ChatterPredictionEngineImpl.predictWithTrend}.
 * These are calibrated confidence/recommendation values, NOT physics constants
 * — physics constants live in `src/physics/constants.ts`. Exposed for
 * deterministic tests + downstream tuning.
 */
export const PREDICT_WITH_TREND_CONFIG = {
  /** Confidence assigned when prediction is ACTIVE. */
  CONF_ACTIVE: 0.95,
  /** Confidence assigned when prediction is IMMINENT. */
  CONF_IMMINENT: 0.85,
  /** Confidence assigned when prediction is STABLE. */
  CONF_STABLE: 0.9,
  /** Confidence assigned when prediction is WARNING. */
  CONF_WARNING: 0.75,
  /** Emergency RPM reduction fraction when chatter is ACTIVE. */
  ACTION_ACTIVE_RPM_FRACTION: 0.15,
  /** Emergency depth reduction fraction when chatter is ACTIVE. */
  ACTION_ACTIVE_DEPTH_FRACTION: 0.5,
  /** Safe-setpoint fraction of critical depth when pulling back IMMINENT chatter. */
  ACTION_IMMINENT_SAFE_DEPTH_FRACTION: 0.8,
  /** Fallback depth fraction when critical depth is not finite (IMMINENT). */
  ACTION_IMMINENT_FALLBACK_FRACTION: 0.7,
  /** Mild RPM reduction fraction when WARNING. */
  ACTION_WARNING_RPM_FRACTION: 0.05,
} as const;

export interface PredictWithTrendResult {
  prediction: "STABLE" | "WARNING" | "IMMINENT" | "ACTIVE";
  /** 0..1, calibrated per prediction class. */
  confidence: number;
  /** Margin between critical depth and current depth, mm (can be negative). */
  marginToChatter_mm: number;
  /** Margin as percentage of critical depth. */
  marginPercent: number;
  /** Vibration trend slope (least-squares over index axis). */
  trendSlope: number;
  /** Seconds until margin is exhausted at current trend rate; null when not IMMINENT. */
  timeToChatterSec: number | null;
  action: ChatterAction;
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

  /**
   * Predict chatter onset using stability margin + vibration trend slope.
   *
   * Composes the already-shipped {@link checkStability} (which returns the
   * critical depth for the current RPM from a precomputed lobe diagram) with
   * a least-squares linear-regression slope over a recent vibration trend
   * window to estimate **time-to-chatter** when margin is shrinking under a
   * rising trend.
   *
   * Returns 4 prediction states with tiered action vectors:
   *   - ACTIVE   margin < 0                              (chatter happening)
   *   - IMMINENT marginPct < imminentPct AND slope > thr (rising into the wall)
   *   - WARNING  marginPct < warningPct                  (thin margin, no rise)
   *   - STABLE   otherwise
   *
   * Re-modularized from monolith `PRISM_FFT_PREDICTIVE_CHATTER` (R2.3.3) —
   * base FFT + lobes already shipped; this is the trend / time-to-chatter
   * / urgency-tiered action layer that the monolith's `predictChatter()` +
   * `_getRecommendation()` exposed.
   *
   * **JSON-roundtrip note:** the returned `marginToChatter_mm` may be
   * `Infinity` when no lobe covers the current RPM (no stability constraint).
   * Callers that serialize via `JSON.stringify` will see `null` and must
   * guard `Number.isFinite(margin)` themselves. Internal action-building
   * already handles this case via the `Number.isFinite(criticalDepth)`
   * guard in `buildChatterAction`. IMMINENT state is unreachable when
   * criticalDepth is Infinity (marginPct = 100), so the fallback path is
   * defensive-only in current usage but matters if callers compose
   * cross-process via the MCP dispatcher boundary.
   *
   * **Trend-window sizing:** typical chatter windows are 50-500 samples.
   * `vibrationTrend.length > 1e5` accumulates Σ(dx²) ≈ n³/12; for n=1e6,
   * den ≈ 8e16 (near double-precision limit). Keep windows ≤ 1e4 samples.
   *
   * @param input - rpm, depth, vibration trend window, precomputed lobes
   * @returns prediction state, margin, slope, timeToChatter, action vectors
   * @throws Error if rpm/axialDepth non-finite or non-positive, lobes missing,
   *               vibrationTrend non-array or contains non-finite elements,
   *               or imminentMarginPercent > warningMarginPercent (silent
   *               dead-WARNING-tier trap).
   */
  // WIRE-EXEMPT: input includes a StabilityLobeResult (closure of in-memory
  // lobe interpolators) that does not round-trip through a JSON dispatcher
  // boundary; consumers compose generateStabilityLobes() + predictWithTrend()
  // in-process. A future cross-process wiring would need a serializable
  // lobe-id reference cache, not naive JSON serialization.
  predictWithTrend(input: PredictWithTrendInput): PredictWithTrendResult {
    if (!Number.isFinite(input.rpm) || input.rpm <= 0) {
      throw new Error(`predictWithTrend: rpm must be a finite positive number (got ${input.rpm})`);
    }
    if (!Number.isFinite(input.axialDepth_mm) || input.axialDepth_mm < 0) {
      throw new Error(`predictWithTrend: axialDepth_mm must be a finite non-negative number (got ${input.axialDepth_mm})`);
    }
    if (!input.lobes || !Array.isArray(input.lobes.lobes)) {
      throw new Error("predictWithTrend: lobes (StabilityLobeResult) is required — call generateStabilityLobes() first");
    }
    if (!Array.isArray(input.vibrationTrend)) {
      throw new Error("predictWithTrend: vibrationTrend must be an array (use [] for no trend data)");
    }
    // R12 (fail loud) — silent NaN/Infinity poisoning of slope is exactly
    // the "30 records silently skipped" class of bug. Throw with the
    // offending index so sensor-data faults surface immediately.
    for (let i = 0; i < input.vibrationTrend.length; i++) {
      if (!Number.isFinite(input.vibrationTrend[i])) {
        throw new Error(
          `predictWithTrend: vibrationTrend[${i}] is not a finite number (got ${input.vibrationTrend[i]})`,
        );
      }
    }

    const warningPct = input.warningMarginPercent ?? 20;
    const imminentPct = input.imminentMarginPercent ?? 10;
    // Ordering invariant — without it, WARNING tier becomes dead-code when
    // imminentPct > warningPct (silent — caller sees no error, but margin
    // levels in (warningPct, imminentPct) misclassify per priority order).
    if (imminentPct > warningPct) {
      throw new Error(
        `predictWithTrend: imminentMarginPercent (${imminentPct}) must be <= warningMarginPercent (${warningPct}) — otherwise the WARNING tier is unreachable`,
      );
    }
    const imminentSlope = input.imminentTrendSlope ?? 0.1;
    const trendScale = input.trendScaleFactor ?? 10;

    // Margin from already-shipped checkStability — no formula duplication.
    // Use the UN-rounded margin for the time-to-chatter divide; round only
    // at the return boundary so safety-critical thin-margin precision is
    // preserved (P0 — double-r4 would erode 4-decimal precision in the
    // exact regime the IMMINENT branch serves).
    const stab = this.checkStability(input.rpm, input.axialDepth_mm, input.lobes);
    const marginRaw = stab.criticalDepth_mm - input.axialDepth_mm;
    const marginPct = stab.marginPercent;
    const slope = this.linearTrendSlope(input.vibrationTrend);

    let prediction: PredictWithTrendResult["prediction"];
    let confidence: number;
    let timeToChatterSec: number | null = null;

    if (marginRaw < 0) {
      prediction = "ACTIVE";
      confidence = PREDICT_WITH_TREND_CONFIG.CONF_ACTIVE;
    } else if (marginPct < imminentPct && slope > imminentSlope) {
      prediction = "IMMINENT";
      confidence = PREDICT_WITH_TREND_CONFIG.CONF_IMMINENT;
      // Encroachment rate: slope × empirical-mm-per-unit-trend → seconds-to-zero-margin.
      const rate = slope * trendScale;
      timeToChatterSec = rate > 0 && Number.isFinite(marginRaw) ? r4(marginRaw / rate) : null;
    } else if (marginPct < warningPct) {
      prediction = "WARNING";
      confidence = PREDICT_WITH_TREND_CONFIG.CONF_WARNING;
    } else {
      prediction = "STABLE";
      confidence = PREDICT_WITH_TREND_CONFIG.CONF_STABLE;
    }

    const action = this.buildChatterAction(prediction, input.rpm, input.axialDepth_mm, stab.criticalDepth_mm);

    return {
      prediction,
      confidence: r4(confidence),
      marginToChatter_mm: Number.isFinite(marginRaw) ? r4(marginRaw) : marginRaw,
      marginPercent: r2(marginPct),
      trendSlope: r4(slope),
      timeToChatterSec,
      action,
    };
  }

  /**
   * Least-squares slope of y[i] vs i. Returns 0 for <2 samples or zero variance.
   * Pure numerical primitive — no physics constants involved.
   */
  private linearTrendSlope(trend: number[]): number {
    const n = trend.length;
    if (n < 2) return 0;
    const xMean = (n - 1) / 2;
    let ySum = 0;
    for (let i = 0; i < n; i++) ySum += trend[i];
    const yMean = ySum / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      const dx = i - xMean;
      num += dx * (trend[i] - yMean);
      den += dx * dx;
    }
    return den > 0 ? num / den : 0;
  }

  /**
   * Build the tiered recommended-action vector for a prediction state.
   * Speed/DOC deltas mirror the monolith's `_getRecommendation` /
   * `_getChatterAction` tiers but anchor depth-deltas to the critical-depth
   * setpoint (safer than fixed-magnitude reductions when current depth is small).
   */
  private buildChatterAction(
    prediction: PredictWithTrendResult["prediction"],
    rpm: number,
    currentDepth: number,
    criticalDepth: number,
  ): ChatterAction {
    const C = PREDICT_WITH_TREND_CONFIG;
    if (prediction === "ACTIVE") {
      // Emergency: drop to (1-DEPTH_FRACTION) of current depth, shave RPM_FRACTION off RPM.
      // `|| 0` neutralizes negative-zero when currentDepth === 0 (cosmetic
      // hygiene for JSON serialization — `-0` survives JSON.stringify on some
      // platforms; reviewers consume the contract).
      const depthDrop = r4(currentDepth * C.ACTION_ACTIVE_DEPTH_FRACTION);
      return {
        urgency: "IMMEDIATE",
        speedDelta: -Math.round(rpm * C.ACTION_ACTIVE_RPM_FRACTION) || 0,
        docDelta_mm: depthDrop > 0 ? -depthDrop : 0,
        description: `EMERGENCY: chatter active — reduce RPM ${Math.round(C.ACTION_ACTIVE_RPM_FRACTION * 100)}% and depth ${Math.round(C.ACTION_ACTIVE_DEPTH_FRACTION * 100)}% immediately`,
      };
    }
    if (prediction === "IMMINENT") {
      // Pull depth to SAFE_FRACTION of critical (safe setpoint) — preserves productivity.
      const safeDepth = Number.isFinite(criticalDepth)
        ? criticalDepth * C.ACTION_IMMINENT_SAFE_DEPTH_FRACTION
        : currentDepth * C.ACTION_IMMINENT_FALLBACK_FRACTION;
      const docDelta = r4(safeDepth - currentDepth); // negative if current > safe
      return {
        urgency: "IMMEDIATE",
        speedDelta: 0,
        docDelta_mm: docDelta,
        description: `Chatter imminent — pull depth to ${r4(safeDepth)} mm (${Math.round(C.ACTION_IMMINENT_SAFE_DEPTH_FRACTION * 100)}% of critical) before margin collapses`,
      };
    }
    if (prediction === "WARNING") {
      return {
        urgency: "SOON",
        speedDelta: -Math.round(rpm * C.ACTION_WARNING_RPM_FRACTION),
        docDelta_mm: 0,
        description: `Margin thin — nudge RPM down ${Math.round(C.ACTION_WARNING_RPM_FRACTION * 100)}% and increase monitoring frequency`,
      };
    }
    // STABLE
    return {
      urgency: "NONE",
      speedDelta: 0,
      docDelta_mm: 0,
      description: "Stable — no action required",
    };
  }
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }

export const chatterPredictionEngine = new ChatterPredictionEngineImpl();
