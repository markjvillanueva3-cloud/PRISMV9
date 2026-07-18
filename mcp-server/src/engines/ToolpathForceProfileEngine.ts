/**
 * ToolpathForceProfileEngine.ts
 *
 * Force prediction along toolpath segments using Kienzle model with
 * engagement variation analysis. Generates force profiles for feedrate
 * modulation and identifies peak force locations.
 *
 * Physics Model:
 * - Kienzle: Fc = kc1.1 × ap × fz^(1-mc) × ae/D correction
 * - Engagement variation: ae(t) changes with geometry
 * - Chip thinning: fz_eff = fz × sqrt(D / (D - 2×ae))
 *
 * Outputs:
 * - Force profile along path (N vs position)
 * - Peak force locations with severity
 * - Feedrate modulation recommendations
 * - Chip load variance map
 *
 * @module engines/ToolpathForceProfileEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ==================== TYPE DEFINITIONS ====================

export interface ToolpathSegment {
  id: string;
  type: "linear" | "arc_cw" | "arc_ccw" | "helix";
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  length_mm: number;
  feedrate_mm_min: number;
  radial_engagement_mm: number;
  axial_engagement_mm: number;
}

export interface CuttingParameters {
  tool_diameter_mm: number;
  flutes: number;
  spindle_rpm: number;
  material_iso_group: "P" | "M" | "K" | "N" | "S" | "H";
}

export interface ForceProfileInput {
  segments: ToolpathSegment[];
  parameters: CuttingParameters;
  chip_thinning_compensation?: boolean;
}

export interface SegmentForce {
  segment_id: string;
  position_start_mm: number;
  position_end_mm: number;
  force_tangential_n: number;
  force_radial_n: number;
  force_axial_n: number;
  force_resultant_n: number;
  chip_load_mm: number;
  chip_load_effective_mm: number;
  engagement_ratio: number;
  power_kw: number;
}

export interface PeakForceLocation {
  position_mm: number;
  segment_id: string;
  force_n: number;
  severity: "low" | "moderate" | "high" | "critical";
  cause: string;
}

export interface FeedrateModulation {
  segment_id: string;
  original_feedrate: number;
  recommended_feedrate: number;
  modulation_factor: number;
  reason: string;
}

export interface ForceProfileResult {
  segment_forces: SegmentForce[];
  peak_locations: PeakForceLocation[];
  feedrate_modulations: FeedrateModulation[];
  statistics: ForceStatistics;
  kienzle_coefficients: { kc1_1: number; mc: number };
  ai_reasoning: string[];
}

export interface ForceStatistics {
  mean_force_n: number;
  max_force_n: number;
  min_force_n: number;
  std_dev_n: number;
  force_variance_pct: number;
  total_energy_j: number;
  average_power_kw: number;
}

// ==================== ENGINE IMPLEMENTATION ====================

class ToolpathForceProfileEngine {
  /**
   * Generate force profile along toolpath
   */
  analyze(input: ForceProfileInput): ForceProfileResult {
    const reasoning: string[] = [];
    reasoning.push(`[FORCE-PROFILE] Analyzing ${input.segments.length} toolpath segments`);

    // Get Kienzle coefficients for material
    const kienzle = CANONICAL_KIENZLE[input.parameters.material_iso_group] || CANONICAL_KIENZLE["P"];
    reasoning.push(`[FORCE-PROFILE] Material ${input.parameters.material_iso_group}: kc1.1=${kienzle.kc1_1}, mc=${kienzle.mc}`);

    // Calculate forces per segment
    const segmentForces: SegmentForce[] = [];
    let cumulativePosition = 0;

    for (const segment of input.segments) {
      const force = this.calculateSegmentForce(
        segment,
        input.parameters,
        kienzle,
        cumulativePosition,
        input.chip_thinning_compensation ?? true
      );
      segmentForces.push(force);
      cumulativePosition += segment.length_mm;
    }

    // Identify peak force locations
    const peakLocations = this.identifyPeaks(segmentForces, reasoning);

    // Generate feedrate modulation recommendations
    const modulations = this.generateModulations(segmentForces, peakLocations, reasoning, input.segments);

    // Calculate statistics
    const statistics = this.calculateStatistics(segmentForces, input.segments);

    reasoning.push(`[FORCE-PROFILE] Complete: Fmax=${statistics.max_force_n.toFixed(0)}N, ${peakLocations.length} peaks, ${modulations.length} modulations`);

    return {
      segment_forces: segmentForces,
      peak_locations: peakLocations,
      feedrate_modulations: modulations,
      statistics,
      kienzle_coefficients: { kc1_1: kienzle.kc1_1, mc: kienzle.mc },
      ai_reasoning: reasoning,
    };
  }

  /**
   * Calculate force for a single segment using Kienzle model
   */
  private calculateSegmentForce(
    segment: ToolpathSegment,
    params: CuttingParameters,
    kienzle: { kc1_1: number; mc: number },
    positionStart: number,
    chipThinningComp: boolean
  ): SegmentForce {
    const D = params.tool_diameter_mm;
    const ae = segment.radial_engagement_mm;
    const ap = segment.axial_engagement_mm;
    const n = params.spindle_rpm;
    const z = params.flutes;
    const vf = segment.feedrate_mm_min;

    // Calculate chip load
    const fz = vf / (n * z);

    // Effective chip load with chip thinning compensation
    // fz_eff = fz × sqrt(D / (D - 2×ae)) when ae < D/2
    let fzEff = fz;
    if (chipThinningComp && ae < D / 2) {
      const thinningFactor = Math.sqrt(D / Math.max(D - 2 * ae, 0.1));
      fzEff = fz * Math.min(thinningFactor, 2.0); // Cap at 2x
    }

    // Engagement ratio
    const engagementRatio = ae / D;

    // Kienzle force calculation
    // Fc = kc1.1 × ap × fz^(1-mc) × engagement_correction
    const engagementCorrection = Math.sqrt(engagementRatio);
    const Fc = kienzle.kc1_1 * ap * Math.pow(fzEff, 1 - kienzle.mc) * engagementCorrection;

    // Force components (approximate ratios)
    const Ft = Fc; // Tangential ≈ cutting force
    const Fr = Fc * 0.35; // Radial ≈ 35% of tangential
    const Fa = Fc * 0.15; // Axial ≈ 15% of tangential

    // Resultant force
    const Fresultant = Math.sqrt(Ft * Ft + Fr * Fr + Fa * Fa);

    // Cutting speed and power
    const Vc = (Math.PI * D * n) / 1000; // m/min
    const Power = (Fc * Vc) / (60 * 1000); // kW

    return {
      segment_id: segment.id,
      position_start_mm: positionStart,
      position_end_mm: positionStart + segment.length_mm,
      force_tangential_n: Ft,
      force_radial_n: Fr,
      force_axial_n: Fa,
      force_resultant_n: Fresultant,
      chip_load_mm: fz,
      chip_load_effective_mm: fzEff,
      engagement_ratio: engagementRatio,
      power_kw: Power,
    };
  }

  /**
   * Identify peak force locations
   */
  private identifyPeaks(forces: SegmentForce[], reasoning: string[]): PeakForceLocation[] {
    const peaks: PeakForceLocation[] = [];

    if (forces.length === 0) return peaks;

    // Calculate mean force for threshold
    const meanForce = forces.reduce((sum, f) => sum + f.force_resultant_n, 0) / forces.length;
    const maxForce = Math.max(...forces.map(f => f.force_resultant_n));

    reasoning.push(`[PEAKS] Mean force: ${meanForce.toFixed(1)}N, Max: ${maxForce.toFixed(1)}N`);

    for (const force of forces) {
      const ratio = force.force_resultant_n / meanForce;

      // Identify peaks above threshold
      if (ratio > 1.3) {
        const severity = this.classifySeverity(ratio);
        const cause = this.determinePeakCause(force);

        peaks.push({
          position_mm: (force.position_start_mm + force.position_end_mm) / 2,
          segment_id: force.segment_id,
          force_n: force.force_resultant_n,
          severity,
          cause,
        });

        reasoning.push(`[PEAKS] ${severity.toUpperCase()} at ${force.segment_id}: ${force.force_resultant_n.toFixed(0)}N (${(ratio * 100).toFixed(0)}% of mean)`);
      }
    }

    return peaks;
  }

  /**
   * Classify peak severity
   */
  private classifySeverity(ratio: number): "low" | "moderate" | "high" | "critical" {
    if (ratio > 2.0) return "critical";
    if (ratio > 1.7) return "high";
    if (ratio > 1.5) return "moderate";
    return "low";
  }

  /**
   * Determine cause of force peak
   */
  private determinePeakCause(force: SegmentForce): string {
    if (force.engagement_ratio > 0.8) {
      return "High radial engagement (full slotting)";
    }
    if (force.chip_load_effective_mm > force.chip_load_mm * 1.5) {
      return "Chip thinning compensation increasing effective load";
    }
    if (force.engagement_ratio > 0.5) {
      return "High engagement corner or step-down";
    }
    return "Geometry transition or material entry";
  }

  /**
   * Generate feedrate modulation recommendations
   */
  private generateModulations(
    forces: SegmentForce[],
    peaks: PeakForceLocation[],
    reasoning: string[],
    segments: ToolpathSegment[]
  ): FeedrateModulation[] {
    const modulations: FeedrateModulation[] = [];
    // Real per-segment programmed feedrate keyed by segment id (ENGINE-AUDIT 2026-06-19, slot:bravo:
    // replaces a hardcoded `originalFeedrate = 1000` placeholder that fabricated every recommendation).
    const feedrateBySegment = new Map(segments.map((s) => [s.id, s.feedrate_mm_min]));

    // Target: maintain constant force by adjusting feedrate
    const targetForce = forces.reduce((sum, f) => sum + f.force_resultant_n, 0) / forces.length;

    for (const peak of peaks) {
      const force = forces.find(f => f.segment_id === peak.segment_id);
      if (!force) continue;

      // Calculate modulation factor to achieve target force
      // F ∝ fz^(1-mc), so fz ∝ F^(1/(1-mc))
      // For mc ≈ 0.25, 1-mc ≈ 0.75, so fz ∝ F^(1.33)
      const forceRatio = force.force_resultant_n / targetForce;
      const modulationFactor = Math.pow(1 / forceRatio, 1.33);

      // Clamp modulation to reasonable range
      const clampedFactor = Math.max(0.5, Math.min(1.0, modulationFactor));

      if (clampedFactor < 0.95) {
        // Real programmed feedrate for this segment (was a hardcoded 1000 placeholder).
        const originalFeedrate = feedrateBySegment.get(force.segment_id);
        if (originalFeedrate === undefined) continue; // no baseline -> cannot recommend (fail-safe, never fabricate)
        const recommendedFeedrate = originalFeedrate * clampedFactor;

        modulations.push({
          segment_id: force.segment_id,
          original_feedrate: originalFeedrate,
          recommended_feedrate: recommendedFeedrate,
          modulation_factor: clampedFactor,
          reason: `Reduce to ${(clampedFactor * 100).toFixed(0)}% for ${peak.severity} force peak`,
        });

        reasoning.push(`[MODULATION] ${force.segment_id}: ${(clampedFactor * 100).toFixed(0)}% feedrate`);
      }
    }

    return modulations;
  }

  /**
   * Calculate force statistics
   */
  private calculateStatistics(forces: SegmentForce[], segments: ToolpathSegment[]): ForceStatistics {
    if (forces.length === 0) {
      return {
        mean_force_n: 0,
        max_force_n: 0,
        min_force_n: 0,
        std_dev_n: 0,
        force_variance_pct: 0,
        total_energy_j: 0,
        average_power_kw: 0,
      };
    }

    const forceValues = forces.map(f => f.force_resultant_n);
    const mean = forceValues.reduce((a, b) => a + b, 0) / forceValues.length;
    const max = Math.max(...forceValues);
    const min = Math.min(...forceValues);

    // Standard deviation
    const variance = forceValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / forceValues.length;
    const stdDev = Math.sqrt(variance);

    // Variance percentage
    const variancePct = (stdDev / mean) * 100;

    // Total energy (F × distance)
    const totalLength = segments.reduce((sum, s) => sum + s.length_mm, 0);
    const totalEnergy = mean * totalLength / 1000; // N·m = J

    // Average power
    const avgPower = forces.reduce((sum, f) => sum + f.power_kw, 0) / forces.length;

    return {
      mean_force_n: mean,
      max_force_n: max,
      min_force_n: min,
      std_dev_n: stdDev,
      force_variance_pct: variancePct,
      total_energy_j: totalEnergy,
      average_power_kw: avgPower,
    };
  }

  /**
   * Quick force estimate for a single cut (orchestrator helper)
   */
  estimateForce(
    materialIso: "P" | "M" | "K" | "N" | "S" | "H",
    ap_mm: number,
    ae_mm: number,
    fz_mm: number,
    D_mm: number
  ): { force_n: number; power_kw: number; chip_thinning_factor: number } {
    const kienzle = CANONICAL_KIENZLE[materialIso] || CANONICAL_KIENZLE["P"];

    // Chip thinning
    let thinningFactor = 1.0;
    let fzEff = fz_mm;
    if (ae_mm < D_mm / 2) {
      thinningFactor = Math.sqrt(D_mm / Math.max(D_mm - 2 * ae_mm, 0.1));
      fzEff = fz_mm * Math.min(thinningFactor, 2.0);
    }

    // Kienzle force
    const engagementCorrection = Math.sqrt(ae_mm / D_mm);
    const Fc = kienzle.kc1_1 * ap_mm * Math.pow(fzEff, 1 - kienzle.mc) * engagementCorrection;

    // Approximate power (assume 100 m/min cutting speed)
    const Power = (Fc * 100) / (60 * 1000);

    return {
      force_n: Fc,
      power_kw: Power,
      chip_thinning_factor: thinningFactor,
    };
  }
}

export const toolpathForceProfileEngine = new ToolpathForceProfileEngine();
