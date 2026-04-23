/**
 * ChipThinningCompensationEngine — MIO-MS0/U-MIO09
 *
 * Automatic feedrate compensation for chip thinning in radial engagement < 50%.
 * When radial depth of cut is less than half the tool diameter, the actual chip
 * thickness becomes thinner than the programmed feed per tooth, requiring
 * feedrate increase to maintain effective chip load.
 *
 * Physics Model:
 *   hex = fz × sqrt(ae/D)           — effective chip thickness
 *   fz_comp = fz × sqrt(D/ae)       — compensated feed per tooth
 *   Compensation factor: sqrt(D/ae) — typically 1.0 to 2.0
 *
 * Limits:
 *   - Max compensation: 2.0× (prevents excessive tool load)
 *   - Min engagement: 5% (below this, other factors dominate)
 *   - Full slot (ae >= D/2): no compensation needed
 *
 * Reference: Sandvik Coromant, "Metal Cutting Technology Training Handbook"
 *
 * @module engines/ChipThinningCompensationEngine
 * @milestone MIO-MS0
 */

import { log } from "../utils/Logger.js";

export interface ChipThinningInput {
  feed_per_tooth_mm: number;
  radial_engagement_mm: number;
  tool_diameter_mm: number;
  axial_depth_mm?: number;
  max_compensation_factor?: number;
  min_engagement_pct?: number;
}

export interface SegmentChipThinning {
  segment_id: string;
  position_mm: number;
  original_fz_mm: number;
  compensated_fz_mm: number;
  compensation_factor: number;
  effective_chip_thickness_mm: number;
  engagement_ratio: number;
  compensation_applied: boolean;
  reason: string;
}

export interface ChipThinningResult {
  original_feed_per_tooth_mm: number;
  compensated_feed_per_tooth_mm: number;
  compensation_factor: number;
  effective_chip_thickness_mm: number;
  engagement_ratio: number;
  compensation_applied: boolean;
  reason: string;
  feedrate_multiplier: number;
  ai_reasoning: string[];
}

export interface SegmentCompensationResult {
  segments: SegmentChipThinning[];
  average_compensation: number;
  max_compensation: number;
  segments_compensated: number;
  total_segments: number;
  ai_reasoning: string[];
}

const DEFAULT_MAX_COMPENSATION = 2.0;
const DEFAULT_MIN_ENGAGEMENT_PCT = 5;
const FULL_SLOT_THRESHOLD = 0.5;

class ChipThinningCompensationEngine {
  /**
   * Calculate chip thinning compensation for a single cut
   */
  calculate(input: ChipThinningInput): ChipThinningResult {
    const reasoning: string[] = [];
    const fz = input.feed_per_tooth_mm;
    const ae = input.radial_engagement_mm;
    const D = input.tool_diameter_mm;
    const maxComp = input.max_compensation_factor ?? DEFAULT_MAX_COMPENSATION;
    const minEngPct = input.min_engagement_pct ?? DEFAULT_MIN_ENGAGEMENT_PCT;

    const engagementRatio = ae / D;
    reasoning.push(`[CHIP-THIN] Engagement: ${ae.toFixed(2)}mm / ${D.toFixed(2)}mm = ${(engagementRatio * 100).toFixed(1)}%`);

    // Check if compensation needed
    if (engagementRatio >= FULL_SLOT_THRESHOLD) {
      reasoning.push(`[CHIP-THIN] Full engagement (>= 50%) — no compensation needed`);
      return {
        original_feed_per_tooth_mm: fz,
        compensated_feed_per_tooth_mm: fz,
        compensation_factor: 1.0,
        effective_chip_thickness_mm: fz,
        engagement_ratio: engagementRatio,
        compensation_applied: false,
        reason: "Full engagement >= 50%, no chip thinning compensation needed",
        feedrate_multiplier: 1.0,
        ai_reasoning: reasoning,
      };
    }

    // Check minimum engagement threshold
    if (engagementRatio * 100 < minEngPct) {
      reasoning.push(`[CHIP-THIN] Engagement ${(engagementRatio * 100).toFixed(1)}% below ${minEngPct}% threshold — limited compensation`);
    }

    // Calculate effective chip thickness: hex = fz × sqrt(ae/D)
    const hex = fz * Math.sqrt(engagementRatio);
    reasoning.push(`[CHIP-THIN] Effective chip thickness: hex = ${fz.toFixed(3)} × sqrt(${engagementRatio.toFixed(3)}) = ${hex.toFixed(4)}mm`);

    // Calculate compensation factor: sqrt(D/ae)
    let compensationFactor = Math.sqrt(D / ae);
    reasoning.push(`[CHIP-THIN] Raw compensation factor: sqrt(${D.toFixed(2)} / ${ae.toFixed(2)}) = ${compensationFactor.toFixed(3)}`);

    // Apply limits
    if (compensationFactor > maxComp) {
      reasoning.push(`[CHIP-THIN] Capping compensation at ${maxComp}× (was ${compensationFactor.toFixed(2)}×)`);
      compensationFactor = maxComp;
    }

    // Calculate compensated feed per tooth
    const fzComp = fz * compensationFactor;
    reasoning.push(`[CHIP-THIN] Compensated fz: ${fz.toFixed(3)} × ${compensationFactor.toFixed(3)} = ${fzComp.toFixed(3)}mm`);

    return {
      original_feed_per_tooth_mm: fz,
      compensated_feed_per_tooth_mm: fzComp,
      compensation_factor: compensationFactor,
      effective_chip_thickness_mm: hex,
      engagement_ratio: engagementRatio,
      compensation_applied: true,
      reason: `Radial engagement ${(engagementRatio * 100).toFixed(1)}% requires ${(compensationFactor * 100).toFixed(0)}% feedrate increase`,
      feedrate_multiplier: compensationFactor,
      ai_reasoning: reasoning,
    };
  }

  /**
   * Calculate compensation for multiple toolpath segments
   */
  calculateForSegments(
    segments: Array<{
      id: string;
      position_mm: number;
      feed_per_tooth_mm: number;
      radial_engagement_mm: number;
    }>,
    toolDiameter: number,
    options?: { max_compensation?: number; min_engagement_pct?: number }
  ): SegmentCompensationResult {
    const reasoning: string[] = [];
    reasoning.push(`[CHIP-THIN] Processing ${segments.length} toolpath segments`);

    const results: SegmentChipThinning[] = [];
    let totalCompensation = 0;
    let maxCompensation = 0;
    let compensatedCount = 0;

    for (const segment of segments) {
      const result = this.calculate({
        feed_per_tooth_mm: segment.feed_per_tooth_mm,
        radial_engagement_mm: segment.radial_engagement_mm,
        tool_diameter_mm: toolDiameter,
        max_compensation_factor: options?.max_compensation,
        min_engagement_pct: options?.min_engagement_pct,
      });

      results.push({
        segment_id: segment.id,
        position_mm: segment.position_mm,
        original_fz_mm: result.original_feed_per_tooth_mm,
        compensated_fz_mm: result.compensated_feed_per_tooth_mm,
        compensation_factor: result.compensation_factor,
        effective_chip_thickness_mm: result.effective_chip_thickness_mm,
        engagement_ratio: result.engagement_ratio,
        compensation_applied: result.compensation_applied,
        reason: result.reason,
      });

      if (result.compensation_applied) {
        compensatedCount++;
        totalCompensation += result.compensation_factor;
        maxCompensation = Math.max(maxCompensation, result.compensation_factor);
      } else {
        totalCompensation += 1.0;
      }
    }

    const avgCompensation = segments.length > 0 ? totalCompensation / segments.length : 1.0;

    reasoning.push(`[CHIP-THIN] ${compensatedCount}/${segments.length} segments compensated`);
    reasoning.push(`[CHIP-THIN] Avg compensation: ${(avgCompensation * 100).toFixed(1)}%, Max: ${(maxCompensation * 100).toFixed(1)}%`);

    return {
      segments: results,
      average_compensation: avgCompensation,
      max_compensation: maxCompensation,
      segments_compensated: compensatedCount,
      total_segments: segments.length,
      ai_reasoning: reasoning,
    };
  }

  /**
   * Generate feedrate modulation commands for G-code
   */
  generateFeedrateModulation(
    originalFeedrate: number,
    compensationFactor: number
  ): { feedrate_mm_min: number; f_code: string } {
    const newFeedrate = originalFeedrate * compensationFactor;
    return {
      feedrate_mm_min: Math.round(newFeedrate),
      f_code: `F${Math.round(newFeedrate)}`,
    };
  }

  /**
   * Quick compensation lookup for orchestrator integration
   */
  quickCompensate(
    fz_mm: number,
    ae_mm: number,
    D_mm: number
  ): { factor: number; compensated_fz: number; applies: boolean } {
    const engagementRatio = ae_mm / D_mm;

    if (engagementRatio >= FULL_SLOT_THRESHOLD) {
      return { factor: 1.0, compensated_fz: fz_mm, applies: false };
    }

    const factor = Math.min(Math.sqrt(D_mm / ae_mm), DEFAULT_MAX_COMPENSATION);
    return {
      factor,
      compensated_fz: fz_mm * factor,
      applies: true,
    };
  }
}

export const chipThinningCompensationEngine = new ChipThinningCompensationEngine();
