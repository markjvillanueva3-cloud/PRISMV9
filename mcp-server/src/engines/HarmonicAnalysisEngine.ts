/**
 * HarmonicAnalysisEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Analyzes harmonic content of machining vibration signals to identify
 * forced vibration sources, resonance conditions, and bearing defects.
 *
 * Decomposes vibration spectrum into tooth-passing frequency, spindle
 * harmonics, bearing defect frequencies (BPFO, BPFI, BSF, FTF),
 * and structural resonances.
 *
 * Actions: harmonic_analyze, harmonic_identify, harmonic_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HarmonicInput {
  spindle_rpm: number;
  num_flutes: number;
  vibration_spectrum: { freq_Hz: number; amplitude_um: number }[];
  bearing_params?: {
    num_balls: number;
    ball_diameter_mm: number;
    pitch_diameter_mm: number;
    contact_angle_deg: number;
  };
  machine_natural_freqs_Hz?: number[];   // known structural resonances
  threshold_um?: number;                  // amplitude threshold for flagging
}

export type HarmonicSource =
  | "tooth_passing" | "spindle_imbalance" | "2x_spindle"
  | "bearing_outer" | "bearing_inner" | "bearing_ball" | "bearing_cage"
  | "structural_resonance" | "electrical" | "unknown";

export interface HarmonicPeak {
  frequency_Hz: number;
  amplitude_um: number;
  source: HarmonicSource;
  harmonic_order: number;       // 1x, 2x, 3x etc.
  confidence_pct: number;
  description: string;
}

export interface HarmonicResult {
  dominant_frequency_Hz: number;
  dominant_source: HarmonicSource;
  peaks: HarmonicPeak[];
  tooth_passing_freq_Hz: number;
  spindle_freq_Hz: number;
  bearing_defect_freqs?: {
    BPFO_Hz: number;   // ball pass frequency outer
    BPFI_Hz: number;   // ball pass frequency inner
    BSF_Hz: number;    // ball spin frequency
    FTF_Hz: number;    // fundamental train frequency
  };
  severity: "normal" | "watch" | "alert" | "critical";
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HarmonicAnalysisEngine {
  analyze(input: HarmonicInput): HarmonicResult {
    const spindleFreq = input.spindle_rpm / 60;
    const toothPassFreq = spindleFreq * input.num_flutes;
    const threshold = input.threshold_um || 5.0;

    // Calculate bearing defect frequencies if params provided
    let bearingFreqs: HarmonicResult["bearing_defect_freqs"];
    if (input.bearing_params) {
      const bp = input.bearing_params;
      const cosA = Math.cos(bp.contact_angle_deg * Math.PI / 180);
      const ratio = bp.ball_diameter_mm / bp.pitch_diameter_mm;

      bearingFreqs = {
        BPFO_Hz: (bp.num_balls / 2) * spindleFreq * (1 - ratio * cosA),
        BPFI_Hz: (bp.num_balls / 2) * spindleFreq * (1 + ratio * cosA),
        BSF_Hz: (bp.pitch_diameter_mm / (2 * bp.ball_diameter_mm)) * spindleFreq * (1 - (ratio * cosA) ** 2),
        FTF_Hz: (spindleFreq / 2) * (1 - ratio * cosA),
      };
    }

    // Identify peaks in spectrum
    const peaks: HarmonicPeak[] = [];
    const significantPeaks = input.vibration_spectrum
      .filter(p => p.amplitude_um >= threshold * 0.5)
      .sort((a, b) => b.amplitude_um - a.amplitude_um);

    for (const peak of significantPeaks) {
      const identified = this._identifyPeak(peak.freq_Hz, spindleFreq, toothPassFreq, bearingFreqs, input.machine_natural_freqs_Hz);
      peaks.push({
        frequency_Hz: peak.freq_Hz,
        amplitude_um: peak.amplitude_um,
        ...identified,
      });
    }

    // Dominant
    const dominant = peaks.length > 0 ? peaks[0] : null;

    // Severity based on max amplitude relative to threshold
    const maxAmp = peaks.length > 0 ? peaks[0].amplitude_um : 0;
    const severity: HarmonicResult["severity"] =
      maxAmp >= threshold * 3 ? "critical"
      : maxAmp >= threshold * 1.5 ? "alert"
      : maxAmp >= threshold ? "watch"
      : "normal";

    // Recommendations
    const recs: string[] = [];
    const hasBearing = peaks.some(p => p.source.startsWith("bearing_"));
    const hasImbalance = peaks.some(p => p.source === "spindle_imbalance" && p.amplitude_um > threshold);
    const hasResonance = peaks.some(p => p.source === "structural_resonance" && p.amplitude_um > threshold);

    if (hasBearing) recs.push("Bearing defect frequency detected — schedule bearing inspection");
    if (hasImbalance) recs.push("Spindle imbalance (1x) detected — balance spindle or check toolholder runout");
    if (hasResonance) recs.push("Structural resonance excited — change RPM to avoid resonant frequency");
    if (severity === "critical") recs.push("CRITICAL vibration levels — reduce parameters or stop machine for inspection");
    if (recs.length === 0) recs.push("Vibration levels within normal operating range");

    return {
      dominant_frequency_Hz: dominant ? dominant.frequency_Hz : 0,
      dominant_source: dominant ? dominant.source : "unknown",
      peaks,
      tooth_passing_freq_Hz: Math.round(toothPassFreq * 10) / 10,
      spindle_freq_Hz: Math.round(spindleFreq * 100) / 100,
      bearing_defect_freqs: bearingFreqs ? {
        BPFO_Hz: Math.round(bearingFreqs.BPFO_Hz * 10) / 10,
        BPFI_Hz: Math.round(bearingFreqs.BPFI_Hz * 10) / 10,
        BSF_Hz: Math.round(bearingFreqs.BSF_Hz * 10) / 10,
        FTF_Hz: Math.round(bearingFreqs.FTF_Hz * 10) / 10,
      } : undefined,
      severity,
      recommendations: recs,
    };
  }

  private _identifyPeak(
    freq: number,
    spindleFreq: number,
    toothPassFreq: number,
    bearingFreqs?: HarmonicResult["bearing_defect_freqs"],
    naturalFreqs?: number[],
  ): { source: HarmonicSource; harmonic_order: number; confidence_pct: number; description: string } {
    const tol = 0.03; // 3% frequency tolerance

    // Check spindle harmonics
    for (let n = 1; n <= 5; n++) {
      if (Math.abs(freq - spindleFreq * n) / (spindleFreq * n) < tol) {
        return {
          source: n === 1 ? "spindle_imbalance" : "2x_spindle",
          harmonic_order: n,
          confidence_pct: 90 - n * 5,
          description: `${n}x spindle frequency (${(spindleFreq * n).toFixed(1)} Hz)`,
        };
      }
    }

    // Check tooth passing harmonics
    for (let n = 1; n <= 4; n++) {
      if (Math.abs(freq - toothPassFreq * n) / (toothPassFreq * n) < tol) {
        return {
          source: "tooth_passing",
          harmonic_order: n,
          confidence_pct: 95 - n * 5,
          description: `${n}x tooth passing frequency (${(toothPassFreq * n).toFixed(1)} Hz)`,
        };
      }
    }

    // Check bearing defect frequencies
    if (bearingFreqs) {
      const checks: [string, number, HarmonicSource][] = [
        ["BPFO", bearingFreqs.BPFO_Hz, "bearing_outer"],
        ["BPFI", bearingFreqs.BPFI_Hz, "bearing_inner"],
        ["BSF", bearingFreqs.BSF_Hz, "bearing_ball"],
        ["FTF", bearingFreqs.FTF_Hz, "bearing_cage"],
      ];
      for (const [label, bf, source] of checks) {
        for (let n = 1; n <= 3; n++) {
          if (Math.abs(freq - bf * n) / (bf * n) < tol) {
            return {
              source,
              harmonic_order: n,
              confidence_pct: 80,
              description: `${n}x ${label} (${(bf * n).toFixed(1)} Hz) — ${source.replace("bearing_", "")} race defect`,
            };
          }
        }
      }
    }

    // Check electrical (50/60 Hz and harmonics)
    for (const base of [50, 60]) {
      for (let n = 1; n <= 3; n++) {
        if (Math.abs(freq - base * n) < 2) {
          return {
            source: "electrical",
            harmonic_order: n,
            confidence_pct: 70,
            description: `${n}x mains frequency (${base * n} Hz)`,
          };
        }
      }
    }

    // Check structural resonances
    if (naturalFreqs) {
      for (const nf of naturalFreqs) {
        if (Math.abs(freq - nf) / nf < tol) {
          return {
            source: "structural_resonance",
            harmonic_order: 1,
            confidence_pct: 75,
            description: `Structural natural frequency (${nf.toFixed(1)} Hz)`,
          };
        }
      }
    }

    return {
      source: "unknown",
      harmonic_order: 0,
      confidence_pct: 0,
      description: `Unidentified peak at ${freq.toFixed(1)} Hz`,
    };
  }
}

export const harmonicAnalysisEngine = new HarmonicAnalysisEngine();
