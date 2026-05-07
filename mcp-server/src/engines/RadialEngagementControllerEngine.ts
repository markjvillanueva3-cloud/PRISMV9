/**
 * RadialEngagementControllerEngine — MIO-MS0/U-MIO17
 *
 * Controls radial engagement to maintain constant chip load through variable
 * feedrate adjustment. Implements iMachining/VoluMill-style constant engagement
 * milling where feedrate is modulated inversely with engagement.
 *
 * Physics:
 * - Chip thinning: hex = fz × sin(engagement_angle/2)
 * - Compensation: F_adjusted = F_base × sqrt(D/ae) for ae < D/2
 * - Force model: Fc ∝ ap × ae × fz → constant Fc requires F ∝ 1/ae
 *
 * Control loop:
 * 1. Calculate current radial engagement from geometry
 * 2. Compare to target engagement
 * 3. Compute feedrate adjustment to maintain constant chip load
 * 4. Apply tool/machine limits
 * 5. Output segment with adjusted feedrate
 *
 * @module engines/RadialEngagementControllerEngine
 * @milestone MIO-MS0
 */

import { log } from "../utils/Logger.js";

export interface ToolpathSegment {
  id: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  type: "linear" | "arc" | "rapid";
  base_feedrate_mm_min: number;
  radial_engagement_mm?: number;
  arc_center?: { x: number; y: number };
  arc_direction?: "cw" | "ccw";
}

export interface EngagementControlParams {
  tool_diameter_mm: number;
  target_engagement_pct: number;
  base_feedrate_mm_min: number;
  max_feedrate_mm_min: number;
  min_feedrate_mm_min: number;
  axial_depth_mm: number;
  num_flutes: number;
  max_chip_load_mm: number;
  min_chip_load_mm: number;
}

export interface ControlledSegment extends ToolpathSegment {
  adjusted_feedrate_mm_min: number;
  actual_engagement_pct: number;
  chip_load_mm: number;
  force_ratio: number;
  adjustment_reason: string;
  warnings: string[];
}

export interface EngagementControlResult {
  segments: ControlledSegment[];
  summary: {
    total_segments: number;
    adjusted_segments: number;
    avg_engagement_pct: number;
    engagement_variance: number;
    avg_chip_load_mm: number;
    peak_force_ratio: number;
    force_variance_reduction_pct: number;
  };
  ai_reasoning: string[];
}

export interface QuickControlResult {
  adjusted_feedrate_mm_min: number;
  chip_load_mm: number;
  force_ratio: number;
}

class RadialEngagementControllerEngine {
  /**
   * Control engagement across multiple toolpath segments
   */
  control(
    segments: ToolpathSegment[],
    params: EngagementControlParams
  ): EngagementControlResult {
    const reasoning: string[] = [];
    const controlled: ControlledSegment[] = [];

    const D = params.tool_diameter_mm;
    const targetAe = (params.target_engagement_pct / 100) * D;
    const baseRpm = (params.base_feedrate_mm_min / params.num_flutes) / params.max_chip_load_mm;

    reasoning.push(`[ENGAGE-CTRL] Target engagement: ${params.target_engagement_pct}% (${targetAe.toFixed(2)}mm)`);
    reasoning.push(`[ENGAGE-CTRL] Tool: Ø${D}mm, ${params.num_flutes} flutes`);

    let totalEngagement = 0;
    let adjustedCount = 0;
    let peakForceRatio = 0;
    const engagementValues: number[] = [];

    for (const seg of segments) {
      if (seg.type === "rapid") {
        controlled.push({
          ...seg,
          adjusted_feedrate_mm_min: seg.base_feedrate_mm_min,
          actual_engagement_pct: 0,
          chip_load_mm: 0,
          force_ratio: 0,
          adjustment_reason: "rapid_move",
          warnings: [],
        });
        continue;
      }

      const warnings: string[] = [];
      const ae = seg.radial_engagement_mm ?? targetAe;
      const engagementPct = (ae / D) * 100;
      engagementValues.push(engagementPct);
      totalEngagement += engagementPct;

      // Calculate feedrate adjustment for constant chip load
      const { feedrate, chipLoad, forceRatio, reason } = this.calculateAdjustment(
        ae,
        D,
        params
      );

      // Apply limits
      let adjustedFeedrate = feedrate;
      let adjustmentReason = reason;

      if (feedrate > params.max_feedrate_mm_min) {
        adjustedFeedrate = params.max_feedrate_mm_min;
        adjustmentReason = "max_feedrate_limit";
        warnings.push(`Feedrate capped at ${params.max_feedrate_mm_min} mm/min`);
      } else if (feedrate < params.min_feedrate_mm_min) {
        adjustedFeedrate = params.min_feedrate_mm_min;
        adjustmentReason = "min_feedrate_limit";
        warnings.push(`Feedrate floor at ${params.min_feedrate_mm_min} mm/min`);
      }

      // Recalculate chip load with actual feedrate
      const actualChipLoad = adjustedFeedrate / (baseRpm * params.num_flutes);
      if (actualChipLoad > params.max_chip_load_mm) {
        warnings.push(`Chip load ${actualChipLoad.toFixed(3)}mm exceeds max ${params.max_chip_load_mm}mm`);
      }

      if (Math.abs(adjustedFeedrate - seg.base_feedrate_mm_min) > 1) {
        adjustedCount++;
      }

      if (forceRatio > peakForceRatio) {
        peakForceRatio = forceRatio;
      }

      controlled.push({
        ...seg,
        adjusted_feedrate_mm_min: Math.round(adjustedFeedrate),
        actual_engagement_pct: engagementPct,
        chip_load_mm: actualChipLoad,
        force_ratio: forceRatio,
        adjustment_reason: adjustmentReason,
        warnings,
      });
    }

    // Calculate statistics
    const cuttingSegments = controlled.filter(s => s.type !== "rapid");
    const avgEngagement = cuttingSegments.length > 0
      ? totalEngagement / cuttingSegments.length
      : 0;

    const engagementVariance = engagementValues.length > 1
      ? engagementValues.reduce((sum, e) => sum + Math.pow(e - avgEngagement, 2), 0) / engagementValues.length
      : 0;

    const avgChipLoad = cuttingSegments.length > 0
      ? cuttingSegments.reduce((sum, s) => sum + s.chip_load_mm, 0) / cuttingSegments.length
      : 0;

    // Force variance reduction estimation
    const forceValues = cuttingSegments.map(s => s.force_ratio);
    const forceVarianceAfter = forceValues.length > 1
      ? forceValues.reduce((sum, f) => sum + Math.pow(f - 1, 2), 0) / forceValues.length
      : 0;
    const forceVarianceBefore = engagementVariance / 100; // Rough estimate
    const forceVarianceReduction = forceVarianceBefore > 0
      ? ((forceVarianceBefore - forceVarianceAfter) / forceVarianceBefore) * 100
      : 0;

    reasoning.push(`[ENGAGE-CTRL] Processed ${segments.length} segments, adjusted ${adjustedCount}`);
    reasoning.push(`[ENGAGE-CTRL] Avg engagement: ${avgEngagement.toFixed(1)}%, variance: ${engagementVariance.toFixed(2)}`);
    reasoning.push(`[ENGAGE-CTRL] Force variance reduction: ${Math.max(0, forceVarianceReduction).toFixed(0)}%`);

    return {
      segments: controlled,
      summary: {
        total_segments: segments.length,
        adjusted_segments: adjustedCount,
        avg_engagement_pct: avgEngagement,
        engagement_variance: engagementVariance,
        avg_chip_load_mm: avgChipLoad,
        peak_force_ratio: peakForceRatio,
        force_variance_reduction_pct: Math.max(0, forceVarianceReduction),
      },
      ai_reasoning: reasoning,
    };
  }

  /**
   * Calculate feedrate adjustment for a single engagement value
   */
  private calculateAdjustment(
    ae: number,
    D: number,
    params: EngagementControlParams
  ): { feedrate: number; chipLoad: number; forceRatio: number; reason: string } {
    const targetAe = (params.target_engagement_pct / 100) * D;
    const engagementRatio = ae / targetAe;

    // Chip thinning compensation
    // When ae < D/2, effective chip thickness is reduced
    // Compensate by increasing feedrate: F_comp = F_base × sqrt(D/ae) for ae < D/2
    let feedrateMultiplier = 1.0;
    let reason = "nominal";

    if (ae < D * 0.5) {
      // Chip thinning region - increase feed to maintain chip load
      feedrateMultiplier = Math.sqrt(D / (2 * ae));
      reason = "chip_thinning_compensation";
    } else if (ae > targetAe * 1.1) {
      // High engagement - reduce feed to maintain force
      feedrateMultiplier = targetAe / ae;
      reason = "high_engagement_reduction";
    } else if (ae < targetAe * 0.9) {
      // Low engagement - increase feed (within chip thinning limits)
      feedrateMultiplier = Math.min(1.5, targetAe / ae);
      reason = "low_engagement_increase";
    }

    const adjustedFeedrate = params.base_feedrate_mm_min * feedrateMultiplier;
    const chipLoad = adjustedFeedrate / (params.num_flutes * 1000); // Simplified

    // Force ratio: Fc ∝ ae × fz, so F_ratio = (ae × fz) / (ae_target × fz_target)
    const forceRatio = (ae * chipLoad) / (targetAe * params.max_chip_load_mm);

    return { feedrate: adjustedFeedrate, chipLoad, forceRatio, reason };
  }

  /**
   * Quick single-point engagement control
   */
  quickControl(
    radial_engagement_mm: number,
    tool_diameter_mm: number,
    base_feedrate_mm_min: number,
    target_engagement_pct: number = 40
  ): QuickControlResult {
    const D = tool_diameter_mm;
    const ae = radial_engagement_mm;
    const targetAe = (target_engagement_pct / 100) * D;

    // Chip thinning compensation
    let multiplier = 1.0;
    if (ae < D * 0.5) {
      multiplier = Math.sqrt(D / (2 * ae));
    } else if (ae > targetAe) {
      multiplier = targetAe / ae;
    }

    const adjustedFeedrate = base_feedrate_mm_min * multiplier;
    const chipLoad = adjustedFeedrate / 4000; // Simplified 4-flute @ 1000 RPM
    const forceRatio = (ae / targetAe) * multiplier;

    return {
      adjusted_feedrate_mm_min: Math.round(adjustedFeedrate),
      chip_load_mm: chipLoad,
      force_ratio: forceRatio,
    };
  }

  /**
   * Generate feedrate modulation table for G-code
   */
  generateFeedrateTable(
    engagements: number[],
    params: EngagementControlParams
  ): { position: number; feedrate: number; engagement: number }[] {
    const table: { position: number; feedrate: number; engagement: number }[] = [];
    const D = params.tool_diameter_mm;

    for (let i = 0; i < engagements.length; i++) {
      const ae = engagements[i];
      const result = this.quickControl(ae, D, params.base_feedrate_mm_min, params.target_engagement_pct);

      table.push({
        position: i,
        feedrate: Math.min(params.max_feedrate_mm_min, Math.max(params.min_feedrate_mm_min, result.adjusted_feedrate_mm_min)),
        engagement: (ae / D) * 100,
      });
    }

    return table;
  }

  /**
   * Analyze corner handling for engagement spikes
   */
  analyzeCorners(
    segments: ToolpathSegment[],
    tool_diameter_mm: number
  ): { corner_indices: number[]; peak_engagements: number[]; recommendations: string[] } {
    const corners: number[] = [];
    const peaks: number[] = [];
    const recommendations: string[] = [];
    const D = tool_diameter_mm;

    for (let i = 1; i < segments.length - 1; i++) {
      const prev = segments[i - 1];
      const curr = segments[i];
      const next = segments[i + 1];

      if (prev.type === "rapid" || curr.type === "rapid" || next.type === "rapid") continue;

      // Calculate direction change
      const dir1 = {
        x: curr.start.x - prev.start.x,
        y: curr.start.y - prev.start.y,
      };
      const dir2 = {
        x: next.end.x - curr.end.x,
        y: next.end.y - curr.end.y,
      };

      const len1 = Math.sqrt(dir1.x ** 2 + dir1.y ** 2);
      const len2 = Math.sqrt(dir2.x ** 2 + dir2.y ** 2);

      if (len1 < 0.001 || len2 < 0.001) continue;

      const dot = (dir1.x * dir2.x + dir1.y * dir2.y) / (len1 * len2);
      const angle = Math.acos(Math.min(1, Math.max(-1, dot))) * (180 / Math.PI);

      // Sharp corners (< 90°) cause engagement spikes
      if (angle < 90) {
        corners.push(i);
        const peakEngagement = Math.min(100, (1 - dot) * 50 + 50);
        peaks.push(peakEngagement);

        if (peakEngagement > 80) {
          recommendations.push(`Corner at segment ${i}: ${angle.toFixed(0)}° - consider arc-fit or reduced feed`);
        }
      }
    }

    return {
      corner_indices: corners,
      peak_engagements: peaks,
      recommendations,
    };
  }
}

export const radialEngagementControllerEngine = new RadialEngagementControllerEngine();
