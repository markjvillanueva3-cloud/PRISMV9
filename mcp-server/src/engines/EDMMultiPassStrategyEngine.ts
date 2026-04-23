/**
 * EDMMultiPassStrategyEngine — Multi-Pass (Skim Cut) Strategy Planning
 *
 * Plans WEDM multi-pass strategies for progressive die applications:
 *   1. Determines optimal pass count based on finish requirements
 *   2. Computes wire offsets for each pass
 *   3. Estimates cycle time per pass
 *   4. Predicts final surface finish and recast depth
 *
 * Physics Model — Multi-Pass Strategy
 * ------------------------------------
 * WEDM achieves final dimension through successive passes:
 *   - Rough: Maximum MRR, largest offset, highest energy
 *   - Semi: Intermediate passes reducing stock and recast
 *   - Finish: Final passes for surface quality
 *
 * Each pass removes material and recast layer:
 *   d_recast(n) ≈ d_recast(n-1) × (1 - η_skim)
 *
 * where η_skim ≈ 0.30 (30% recast reduction per skim pass)
 *
 * Wire offset per pass must maintain:
 *   offset(n) > offset(n+1) + min_step
 *   offset(final) = 0 (on-size)
 *
 * MS-P3-TIER6A/U-P3-T6A-02
 *
 * @see EDMWireSlugCornerTaperEngine — corner strategies
 * @see WEDMThermalReleaseGateEngine — thermal constraints
 *
 * Source: Mitsubishi MV1200R E-tables; Sodick LN2W §4.3; Ho & Newman CIRP 2003
 */

import {
  WEDM_MULTI_PASS,
  WEDM_WIRE_SPEEDS,
  WEDM_RECAST_MODEL,
  lookupWireSpeed,
  WEDMPassType,
  WEDMFinishClass,
} from "../physics/wedm-constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PassDefinition {
  pass_number: number;
  pass_type: WEDMPassType;
  offset_mm: number;
  speed_factor: number;
  power_factor: number;
  expected_ra_um: number;
  expected_recast_um: number;
}

export interface MultiPassInput {
  /** Target surface finish Ra [µm]. Default uses finish_class. */
  target_ra_um?: number;
  /** Target recast depth [µm]. Default uses finish_class. */
  target_recast_um?: number;
  /** Finish class: rough_only, standard, precision, ultra */
  finish_class?: WEDMFinishClass;
  /** Part thickness [mm]. Required for time estimation. */
  thickness_mm: number;
  /** Total cut length [mm]. Required for time estimation. */
  cut_length_mm: number;
  /** Material type for speed lookup. Default "tool_steel". */
  material?: string;
  /** Wire diameter [mm]. Default 0.25. */
  wire_diameter_mm?: number;
  /** Custom pass count override (1-7). */
  pass_count?: number;
  /** Whether to use corner dwell strategy. */
  corner_dwell?: boolean;
  /** Number of internal corners requiring dwell. */
  corner_count?: number;
}

export interface PassTimeEstimate {
  pass_number: number;
  pass_type: WEDMPassType;
  cut_time_min: number;
  dwell_time_min: number;
  total_time_min: number;
}

export interface MultiPassResult {
  success: boolean;
  pass_count: number;
  finish_class: WEDMFinishClass;
  passes: PassDefinition[];
  time_estimates: PassTimeEstimate[];
  total_time_min: number;
  final_ra_um: number;
  final_recast_um: number;
  total_offset_mm: number;
  recommendations: string[];
  summary: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_WIRE_DIA_MM = 0.25;
const DEFAULT_MATERIAL = "tool_steel";
const CORNER_DWELL_SEC = 0.5;

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class EDMMultiPassStrategyEngine {
  readonly name = "EDMMultiPassStrategyEngine";
  readonly version = "1.0.0";

  /**
   * Plan multi-pass strategy based on finish requirements.
   *
   * @param input - Strategy planning parameters
   * @returns MultiPassResult with pass definitions and time estimates
   */
  plan(input: MultiPassInput): MultiPassResult {
    if (!this.validateInput(input)) {
      return this.buildInvalidResult("Invalid input parameters");
    }

    const {
      thickness_mm,
      cut_length_mm,
      material = DEFAULT_MATERIAL,
      wire_diameter_mm = DEFAULT_WIRE_DIA_MM,
      corner_dwell = false,
      corner_count = 0,
    } = input;

    const finishClass = this.determineFinishClass(input);
    const passCount = this.determinePassCount(input, finishClass);
    const passes = this.buildPassSequence(passCount, finishClass);
    const timeEstimates = this.estimatePassTimes(
      passes,
      thickness_mm,
      cut_length_mm,
      material,
      corner_dwell,
      corner_count
    );

    const totalTime = timeEstimates.reduce((sum, t) => sum + t.total_time_min, 0);
    const finalPass = passes[passes.length - 1];
    const totalOffset = passes[0].offset_mm;

    const recommendations = this.generateRecommendations(
      passes,
      finishClass,
      thickness_mm,
      totalTime
    );

    return {
      success: true,
      pass_count: passCount,
      finish_class: finishClass,
      passes,
      time_estimates: timeEstimates,
      total_time_min: Math.round(totalTime * 10) / 10,
      final_ra_um: finalPass.expected_ra_um,
      final_recast_um: finalPass.expected_recast_um,
      total_offset_mm: totalOffset,
      recommendations,
      summary: this.buildSummary(passCount, finishClass, totalTime, finalPass),
    };
  }

  /**
   * Determine optimal finish class from targets or explicit setting.
   */
  determineFinishClass(input: MultiPassInput): WEDMFinishClass {
    if (input.finish_class) {
      return input.finish_class;
    }

    const targetRa = input.target_ra_um;
    const targetRecast = input.target_recast_um;

    if (targetRa !== undefined) {
      if (targetRa <= 0.4) return "ultra";
      if (targetRa <= 0.8) return "precision";
      if (targetRa <= 1.6) return "standard";
      return "rough_only";
    }

    if (targetRecast !== undefined) {
      if (targetRecast <= 2) return "ultra";
      if (targetRecast <= 5) return "precision";
      if (targetRecast <= 12) return "standard";
      return "rough_only";
    }

    return "standard";
  }

  /**
   * Determine pass count from explicit setting or finish class.
   */
  determinePassCount(input: MultiPassInput, finishClass: WEDMFinishClass): number {
    if (input.pass_count !== undefined) {
      return Math.min(WEDM_MULTI_PASS.max_passes, Math.max(1, input.pass_count));
    }
    return WEDM_MULTI_PASS.pass_count[finishClass];
  }

  /**
   * Build pass sequence with interpolated offsets.
   */
  buildPassSequence(passCount: number, finishClass: WEDMFinishClass): PassDefinition[] {
    const passes: PassDefinition[] = [];
    const passTypes = WEDM_MULTI_PASS.pass_types;

    for (let i = 0; i < passCount; i++) {
      const passNumber = i + 1;
      const passType = this.getPassType(passNumber, passCount);
      const offsetMm = this.interpolateOffset(passNumber, passCount);

      passes.push({
        pass_number: passNumber,
        pass_type: passType,
        offset_mm: Math.round(offsetMm * 1000) / 1000,
        speed_factor: WEDM_MULTI_PASS.speed_factor[passType],
        power_factor: WEDM_MULTI_PASS.power_factor[passType],
        expected_ra_um: WEDM_MULTI_PASS.surface_ra_um[passType],
        expected_recast_um: WEDM_MULTI_PASS.recast_um[passType],
      });
    }

    return passes;
  }

  /**
   * Get pass type for a given pass number in sequence.
   */
  getPassType(passNumber: number, totalPasses: number): WEDMPassType {
    if (totalPasses === 1) return "rough";
    if (passNumber === 1) return "rough";
    if (passNumber === totalPasses) {
      return totalPasses >= 4 ? "precision" : "finish";
    }
    if (passNumber === totalPasses - 1 && totalPasses >= 3) {
      return totalPasses >= 4 ? "finish" : "semi";
    }
    return "semi";
  }

  /**
   * Interpolate wire offset for a given pass in sequence.
   * Offset decreases linearly from rough to final (0).
   */
  interpolateOffset(passNumber: number, totalPasses: number): number {
    if (totalPasses === 1) return 0;
    if (passNumber === totalPasses) return 0;

    const roughOffset = WEDM_MULTI_PASS.offset_mm.rough;
    const fraction = (passNumber - 1) / (totalPasses - 1);
    return roughOffset * (1 - fraction);
  }

  /**
   * Estimate cutting time per pass.
   */
  estimatePassTimes(
    passes: PassDefinition[],
    thickness_mm: number,
    cut_length_mm: number,
    material: string,
    corner_dwell: boolean,
    corner_count: number
  ): PassTimeEstimate[] {
    const baseSpeed = lookupWireSpeed(material, thickness_mm);

    return passes.map((pass) => {
      const effectiveSpeed = baseSpeed * pass.speed_factor;
      const cutTime = cut_length_mm / effectiveSpeed;
      const dwellTime = corner_dwell ? (corner_count * CORNER_DWELL_SEC) / 60 : 0;

      return {
        pass_number: pass.pass_number,
        pass_type: pass.pass_type,
        cut_time_min: Math.round(cutTime * 10) / 10,
        dwell_time_min: Math.round(dwellTime * 10) / 10,
        total_time_min: Math.round((cutTime + dwellTime) * 10) / 10,
      };
    });
  }

  /**
   * Get pass definitions for a specific finish class.
   */
  getPassesForClass(finishClass: WEDMFinishClass): PassDefinition[] {
    const passCount = WEDM_MULTI_PASS.pass_count[finishClass];
    return this.buildPassSequence(passCount, finishClass);
  }

  /**
   * Estimate total cycle time for a finish class.
   */
  estimateCycleTime(
    finishClass: WEDMFinishClass,
    thickness_mm: number,
    cut_length_mm: number,
    material: string = DEFAULT_MATERIAL
  ): number {
    const passes = this.getPassesForClass(finishClass);
    const times = this.estimatePassTimes(passes, thickness_mm, cut_length_mm, material, false, 0);
    return times.reduce((sum, t) => sum + t.total_time_min, 0);
  }

  /**
   * Calculate recast depth after N passes using skim reduction model.
   *
   * d_recast(n) = d_rough × (1 - η_skim)^(n-1)
   */
  calculateRecastAfterPasses(passCount: number): number {
    const roughRecast = WEDM_MULTI_PASS.recast_um.rough;
    const skimReduction = WEDM_RECAST_MODEL.skim_reduction_per_pass;
    const minResidual = WEDM_RECAST_MODEL.min_residual_um;

    if (passCount <= 1) return roughRecast;

    const recast = roughRecast * Math.pow(1 - skimReduction, passCount - 1);
    return Math.max(minResidual, Math.round(recast * 10) / 10);
  }

  /**
   * Determine minimum passes needed to achieve target recast depth.
   */
  passesForTargetRecast(target_recast_um: number): number {
    const roughRecast = WEDM_MULTI_PASS.recast_um.rough;
    const skimReduction = WEDM_RECAST_MODEL.skim_reduction_per_pass;
    const minResidual = WEDM_RECAST_MODEL.min_residual_um;

    if (target_recast_um >= roughRecast) return 1;
    if (target_recast_um <= minResidual) return WEDM_MULTI_PASS.max_passes;

    // Solve: target = rough × (1 - η)^(n-1)
    // n = 1 + ln(target/rough) / ln(1 - η)
    const n = 1 + Math.log(target_recast_um / roughRecast) / Math.log(1 - skimReduction);
    return Math.min(WEDM_MULTI_PASS.max_passes, Math.ceil(n));
  }

  private generateRecommendations(
    passes: PassDefinition[],
    finishClass: WEDMFinishClass,
    thickness_mm: number,
    totalTime: number
  ): string[] {
    const recs: string[] = [];

    if (passes.length >= 4) {
      recs.push("Consider wire change between rough and finish passes for optimal surface");
    }

    if (thickness_mm > 60 && finishClass !== "rough_only") {
      recs.push("Thick section: verify flush pressure adequate for finish passes");
    }

    if (totalTime > 120) {
      recs.push("Long cycle time: consider automatic wire rethreading for unattended operation");
    }

    if (finishClass === "ultra") {
      recs.push("Ultra finish: clean wire guides before final pass");
      recs.push("Ultra finish: verify dielectric filtration < 3µm");
    }

    return recs;
  }

  private buildSummary(
    passCount: number,
    finishClass: WEDMFinishClass,
    totalTime: number,
    finalPass: PassDefinition
  ): string {
    return (
      `${passCount}-pass ${finishClass} strategy. ` +
      `Total time: ${totalTime.toFixed(1)} min. ` +
      `Final: Ra ${finalPass.expected_ra_um}µm, recast ${finalPass.expected_recast_um}µm.`
    );
  }

  private validateInput(input: MultiPassInput): boolean {
    if (typeof input.thickness_mm !== "number" || input.thickness_mm <= 0) return false;
    if (typeof input.cut_length_mm !== "number" || input.cut_length_mm <= 0) return false;
    if (!Number.isFinite(input.thickness_mm) || !Number.isFinite(input.cut_length_mm)) return false;
    return true;
  }

  private buildInvalidResult(reason: string): MultiPassResult {
    return {
      success: false,
      pass_count: 0,
      finish_class: "standard",
      passes: [],
      time_estimates: [],
      total_time_min: 0,
      final_ra_um: 0,
      final_recast_um: 0,
      total_offset_mm: 0,
      recommendations: [reason],
      summary: `INVALID: ${reason}`,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const edmMultiPassStrategyEngine = new EDMMultiPassStrategyEngine();
export default edmMultiPassStrategyEngine;
