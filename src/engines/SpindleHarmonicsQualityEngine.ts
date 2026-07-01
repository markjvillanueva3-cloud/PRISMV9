/**
 * SpindleHarmonicsQualityEngine — Spindle Speed → Harmonic → Cut Quality
 *
 * Models how spindle speed selection affects harmonic excitation of the
 * machine-tool-workpiece system, and the resulting impact on surface quality.
 *
 * Physics:
 *   - Tooth Passing Frequency: TPF = RPM × Z / 60  [Hz]
 *   - TPF harmonics: 1×TPF, 2×TPF, ... excite structural modes
 *   - When TPF (or harmonics) coincide with machine natural frequencies,
 *     forced vibration amplitude spikes → surface quality degrades
 *   - Optimal RPM places TPF between resonances (or at anti-nodes of SLD)
 *
 * References:
 *   - Altintas "Manufacturing Automation" (2012), Ch.3-4
 *   - Schmitz & Smith "Machining Dynamics" (2009), Ch.5
 *   - Quintana & Ciurana "Chatter in machining processes" (2011)
 *
 * Actions: spindle_harmonic_analysis, spindle_optimal_rpm, spindle_quality_map
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MachineModalData {
  natural_frequencies_Hz: number[];       // dominant modes (from tap test or FRF)
  damping_ratios?: number[];              // per mode (default 0.03)
  mode_descriptions?: string[];           // e.g., "tool bending", "spindle axial"
}

export interface HarmonicAnalysisInput {
  spindle_rpm: number;
  num_flutes: number;
  machine_modes: MachineModalData;
  max_harmonic_order?: number;            // default 5
  bandwidth_pct?: number;                 // resonance bandwidth (default 10%)
}

export interface HarmonicExcitation {
  harmonic_order: number;
  frequency_Hz: number;
  nearest_mode_Hz: number;
  mode_index: number;
  frequency_ratio: number;               // excitation_freq / mode_freq
  amplification_factor: number;           // dynamic magnification
  severity: "negligible" | "minor" | "moderate" | "severe" | "critical";
}

export interface HarmonicAnalysisResult {
  spindle_rpm: number;
  tooth_passing_freq_Hz: number;
  excitations: HarmonicExcitation[];
  worst_excitation: HarmonicExcitation;
  quality_score: number;                  // 0-100 (100 = no resonance)
  surface_penalty_factor: number;         // multiply Ra by this (1.0 = no penalty)
  recommendations: string[];
}

export interface OptimalRpmResult {
  optimal_rpm: number;
  quality_score: number;
  surface_penalty_factor: number;
  rpm_range_tested: [number, number];
  rpm_step: number;
  top_5_rpms: { rpm: number; score: number; penalty: number }[];
  avoid_rpms: { rpm: number; score: number; reason: string }[];
  recommendations: string[];
}

export interface QualityMapPoint {
  rpm: number;
  quality_score: number;
  surface_penalty_factor: number;
  worst_harmonic: number;
  worst_mode_Hz: number;
}

export interface QualityMapResult {
  rpm_min: number;
  rpm_max: number;
  rpm_step: number;
  points: QualityMapPoint[];
  sweet_spots: { rpm_start: number; rpm_end: number; avg_score: number }[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class SpindleHarmonicsQualityEngine {

  /**
   * Analyze harmonic excitation at a specific spindle RPM.
   * Calculates how TPF harmonics interact with machine natural frequencies.
   */
  analyze(input: HarmonicAnalysisInput): HarmonicAnalysisResult {
    const { spindle_rpm, num_flutes, machine_modes } = input;
    const maxOrder = input.max_harmonic_order ?? 5;
    const bwPct = input.bandwidth_pct ?? 10;

    const tpf = spindle_rpm * num_flutes / 60;
    const excitations: HarmonicExcitation[] = [];

    for (let order = 1; order <= maxOrder; order++) {
      const freq = tpf * order;

      // Find nearest machine mode
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < machine_modes.natural_frequencies_Hz.length; i++) {
        const dist = Math.abs(freq - machine_modes.natural_frequencies_Hz[i]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const modeFreq = machine_modes.natural_frequencies_Hz[nearestIdx];
      const zeta = machine_modes.damping_ratios?.[nearestIdx] ?? 0.03;
      const ratio = freq / modeFreq;

      // Dynamic magnification factor (SDOF forced vibration)
      // M = 1 / sqrt((1-r²)² + (2ζr)²)
      const denom = Math.sqrt(
        Math.pow(1 - ratio * ratio, 2) + Math.pow(2 * zeta * ratio, 2)
      );
      const amplification = 1 / Math.max(denom, 0.01);

      // Severity classification
      const severity = amplification > 10 ? "critical"
        : amplification > 5 ? "severe"
        : amplification > 3 ? "moderate"
        : amplification > 1.5 ? "minor"
        : "negligible";

      excitations.push({
        harmonic_order: order,
        frequency_Hz: Math.round(freq * 10) / 10,
        nearest_mode_Hz: modeFreq,
        mode_index: nearestIdx,
        frequency_ratio: Math.round(ratio * 1000) / 1000,
        amplification_factor: Math.round(amplification * 100) / 100,
        severity,
      });
    }

    // Worst excitation
    const worst = excitations.reduce((a, b) =>
      a.amplification_factor > b.amplification_factor ? a : b
    );

    // Quality score: 100 = no resonance effects, 0 = critical resonance
    // Based on worst amplification factor
    const worstAmp = worst.amplification_factor;
    const qualityScore = Math.max(0, Math.min(100,
      100 - (worstAmp - 1) * 15
    ));

    // Surface penalty factor: how much Ra increases due to vibration
    // At resonance (amp=10+), Ra can increase 2-3×
    // Linear model: penalty = 1 + 0.15 × (amp - 1) for amp > 1.5
    const surfacePenalty = worstAmp <= 1.5 ? 1.0
      : Math.min(3.0, 1.0 + 0.15 * (worstAmp - 1.5));

    // Recommendations
    const recs: string[] = [];
    if (worst.severity === "critical") {
      recs.push(`CRITICAL: ${worst.harmonic_order}×TPF (${worst.frequency_Hz}Hz) excites mode at ${worst.nearest_mode_Hz}Hz — expect chatter marks on surface`);
      recs.push("Change spindle speed immediately or reduce depth of cut");
    } else if (worst.severity === "severe") {
      recs.push(`WARNING: ${worst.harmonic_order}×TPF near structural resonance at ${worst.nearest_mode_Hz}Hz (amplification ${worst.amplification_factor}×)`);
      recs.push("Consider adjusting RPM by ±10-15% to move away from resonance");
    } else if (worst.severity === "moderate") {
      recs.push(`Moderate harmonic interaction at ${worst.frequency_Hz}Hz — monitor surface quality`);
    }
    if (recs.length === 0) {
      recs.push("Spindle speed is well-placed between structural resonances — good harmonic behavior");
    }

    return {
      spindle_rpm,
      tooth_passing_freq_Hz: Math.round(tpf * 10) / 10,
      excitations,
      worst_excitation: worst,
      quality_score: Math.round(qualityScore * 10) / 10,
      surface_penalty_factor: Math.round(surfacePenalty * 1000) / 1000,
      recommendations: recs,
    };
  }

  /**
   * Find optimal spindle RPM within a range that minimizes harmonic excitation.
   * Sweeps RPM range and finds the speed with best quality score.
   */
  findOptimalRpm(
    num_flutes: number,
    machine_modes: MachineModalData,
    rpm_min: number,
    rpm_max: number,
    rpm_step?: number,
  ): OptimalRpmResult {
    const step = rpm_step ?? Math.max(10, Math.round((rpm_max - rpm_min) / 200));
    const results: { rpm: number; score: number; penalty: number }[] = [];
    const avoidList: { rpm: number; score: number; reason: string }[] = [];

    for (let rpm = rpm_min; rpm <= rpm_max; rpm += step) {
      const analysis = this.analyze({
        spindle_rpm: rpm,
        num_flutes,
        machine_modes,
      });
      results.push({
        rpm,
        score: analysis.quality_score,
        penalty: analysis.surface_penalty_factor,
      });
      if (analysis.quality_score < 30) {
        const worst = analysis.worst_excitation;
        avoidList.push({
          rpm,
          score: analysis.quality_score,
          reason: `${worst.harmonic_order}×TPF at ${worst.frequency_Hz}Hz excites ${worst.nearest_mode_Hz}Hz mode`,
        });
      }
    }

    // Sort by quality score descending
    const sorted = [...results].sort((a, b) => b.score - a.score);
    const best = sorted[0];

    const recs: string[] = [];
    recs.push(`Optimal RPM: ${best.rpm} (quality score: ${best.score.toFixed(1)}/100)`);
    if (avoidList.length > 0) {
      recs.push(`Avoid RPMs: ${avoidList.slice(0, 3).map(a => `${a.rpm}`).join(", ")} (harmonic resonance)`);
    }

    return {
      optimal_rpm: best.rpm,
      quality_score: best.score,
      surface_penalty_factor: best.penalty,
      rpm_range_tested: [rpm_min, rpm_max],
      rpm_step: step,
      top_5_rpms: sorted.slice(0, 5),
      avoid_rpms: avoidList.slice(0, 10),
      recommendations: recs,
    };
  }

  /**
   * Generate a quality map across RPM range.
   * Returns quality score at each RPM step — useful for visualization.
   */
  qualityMap(
    num_flutes: number,
    machine_modes: MachineModalData,
    rpm_min: number,
    rpm_max: number,
    rpm_step?: number,
  ): QualityMapResult {
    const step = rpm_step ?? Math.max(10, Math.round((rpm_max - rpm_min) / 100));
    const points: QualityMapPoint[] = [];

    for (let rpm = rpm_min; rpm <= rpm_max; rpm += step) {
      const analysis = this.analyze({
        spindle_rpm: rpm,
        num_flutes,
        machine_modes,
      });
      const worst = analysis.worst_excitation;
      points.push({
        rpm,
        quality_score: analysis.quality_score,
        surface_penalty_factor: analysis.surface_penalty_factor,
        worst_harmonic: worst.harmonic_order,
        worst_mode_Hz: worst.nearest_mode_Hz,
      });
    }

    // Find sweet spots (contiguous regions with score > 70)
    const sweetSpots: { rpm_start: number; rpm_end: number; avg_score: number }[] = [];
    let spotStart = -1;
    let spotSum = 0;
    let spotCount = 0;

    for (let i = 0; i < points.length; i++) {
      if (points[i].quality_score >= 70) {
        if (spotStart < 0) spotStart = i;
        spotSum += points[i].quality_score;
        spotCount++;
      } else if (spotStart >= 0) {
        sweetSpots.push({
          rpm_start: points[spotStart].rpm,
          rpm_end: points[i - 1].rpm,
          avg_score: Math.round(spotSum / spotCount * 10) / 10,
        });
        spotStart = -1;
        spotSum = 0;
        spotCount = 0;
      }
    }
    if (spotStart >= 0) {
      sweetSpots.push({
        rpm_start: points[spotStart].rpm,
        rpm_end: points[points.length - 1].rpm,
        avg_score: Math.round(spotSum / spotCount * 10) / 10,
      });
    }

    return {
      rpm_min,
      rpm_max,
      rpm_step: step,
      points,
      sweet_spots: sweetSpots,
    };
  }
}

export const spindleHarmonicsQualityEngine = new SpindleHarmonicsQualityEngine();
