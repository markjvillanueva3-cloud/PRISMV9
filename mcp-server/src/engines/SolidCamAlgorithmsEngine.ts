/**
 * SolidCamAlgorithmsEngine -- Chip Thickness & Engagement Geometry
 *
 * Ports the SolidCAM SESSION_1_1 (Chip Thickness Math) and SESSION_1_2
 * (Engagement Geometry) JavaScript algorithms into a typed, static-method
 * TypeScript engine.
 *
 * Formulas faithfully mirror the JS reference implementations in
 * resources/SOLIDCAM/SESSION_1_1_CHIP_THICKNESS_MATH.js and
 * resources/SOLIDCAM/SESSION_1_2_ENGAGEMENT_GEOMETRY.js.
 *
 * References:
 *   - Machining Data Handbook (Metcut Research Associates)
 *   - Altintas, Y. "Manufacturing Automation" (2012)
 *   - Sandvik Coromant Technical Guide
 *   - US Patent 8000834B2: Engagement Milling
 *   - MDPI Mathematics 2021: "Trochoidal Milling Path with Variable Feed"
 *   - "Fast Constant Engagement Offsetting Method" (Int J Adv Manuf Tech 2019)
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Input parameters for chip thickness calculation. */
export interface ChipThicknessParams {
  /** Cutter diameter in mm */
  toolDiameter: number;
  /** Radial depth of cut (ae / stepover) in mm */
  stepover: number;
  /** Programmed feed per tooth (fz) in mm/tooth */
  feedPerTooth: number;
}

/** Output of chip thickness calculation. */
export interface ChipThicknessResult {
  /** Average chip thickness considering radial engagement (mm) */
  actualChipThickness: number;
  /**
   * Chip thinning compensation factor.
   * When ae < D/2 the actual chip is thinner than fz; this factor
   * (>= 1.0 when thinning occurs) indicates how much feed may be
   * increased to restore the target chip load.
   * Formula: 1 / sqrt(ae / Dc)  for ae < 0.5*Dc, else 1.0
   * Capped at 2.5 for safety.
   */
  thinningFactor: number;
  /**
   * Feed per tooth adjusted upward to compensate for chip thinning
   * (fz * thinningFactor).  When ae >= D/2, equals the input fz.
   */
  adjustedFeedPerTooth: number;
}

/** Input parameters for engagement geometry calculation. */
export interface EngagementGeometryParams {
  /** Cutter diameter in mm */
  toolDiameter: number;
  /** Radial depth of cut (ae / stepover) in mm */
  stepover: number;
  /** Axial depth of cut (ap) in mm -- optional, informational */
  depthOfCut?: number;
}

/** Output of engagement geometry calculation. */
export interface EngagementGeometryResult {
  /**
   * Engagement angle in degrees.
   * Formula: alpha = arccos(1 - 2*ae/Dc)  (result converted to degrees)
   */
  engagementAngle: number;
  /**
   * Contact arc length along the cutter periphery (mm).
   * arcLength = R * alpha_rad  where R = Dc/2
   */
  contactArcLength: number;
  /**
   * Engagement as a percentage of full (180-degree) engagement.
   * engagementPercent = (alpha_deg / 180) * 100
   */
  engagementPercent: number;
}

/** Input parameters for adjustFeedForEngagement. */
export interface AdjustFeedParams {
  /** Cutter diameter in mm */
  toolDiameter: number;
  /** Radial depth of cut (ae / stepover) in mm */
  stepover: number;
  /**
   * Desired average chip thickness (mm).
   * The routine back-calculates the fz required to produce this
   * chip thickness at the given engagement.
   */
  targetChipThickness: number;
}

/** Output of adjustFeedForEngagement. */
export interface AdjustFeedResult {
  /**
   * Feed per tooth needed to achieve the target chip thickness
   * at the specified engagement.
   * Derived from: h_m = fz * sqrt(ae/Dc)  =>  fz = h_m / sqrt(ae/Dc)
   */
  adjustedFz: number;
  /** Chip thinning factor at this engagement (same formula as chipThickness). */
  thinningFactor: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class SolidCamAlgorithmsEngine {

  // =========================================================================
  // Chip Thickness
  // =========================================================================

  /**
   * Compute actual (average) chip thickness considering radial engagement,
   * chip thinning factor, and the adjusted feed per tooth that compensates
   * for thinning.
   *
   * Core formula (90-degree entering angle):
   *   h_m = fz * sqrt(ae / Dc)           -- Altintas (2012), Sandvik
   *
   * Thinning factor (ae < 0.5*Dc):
   *   factor = 1 / sqrt(ae / Dc)         -- capped at 2.5 for safety
   *   factor = 1.0                        -- when ae >= 0.5*Dc
   *
   * @param params - tool diameter, stepover, feed per tooth (all in mm)
   * @returns actualChipThickness, thinningFactor, adjustedFeedPerTooth
   */
  static chipThickness(params: ChipThicknessParams): ChipThicknessResult {
    const { toolDiameter: Dc, stepover: ae, feedPerTooth: fz } = params;

    // Edge case: zero stepover produces zero chip
    if (ae <= 0 || Dc <= 0 || fz <= 0) {
      return {
        actualChipThickness: 0,
        thinningFactor: 1,
        adjustedFeedPerTooth: fz,
      };
    }

    // Clamp ae to Dc (cannot exceed full slotting)
    const effectiveAe = Math.min(ae, Dc);
    const ratio = effectiveAe / Dc;

    // Average chip thickness: h_m = fz * sqrt(ae / Dc)
    const actualChipThickness = fz * Math.sqrt(ratio);

    // Thinning factor
    const thinningFactor = SolidCamAlgorithmsEngine._chipThinningFactor(ratio);

    // Adjusted feed: fz_adj = fz * thinningFactor
    const adjustedFeedPerTooth = fz * thinningFactor;

    return {
      actualChipThickness,
      thinningFactor,
      adjustedFeedPerTooth,
    };
  }

  // =========================================================================
  // Engagement Geometry
  // =========================================================================

  /**
   * Compute engagement angle, contact arc length, and engagement percentage
   * for a peripheral milling operation.
   *
   * Engagement angle formula:
   *   alpha = arccos(1 - 2 * ae / Dc)    -- Altintas (2012)
   *
   * Contact arc length:
   *   arc = R * alpha_rad                 -- basic geometry, R = Dc/2
   *
   * @param params - tool diameter, stepover, optional depth of cut (all mm)
   * @returns engagementAngle (deg), contactArcLength (mm), engagementPercent
   */
  static engagementGeometry(params: EngagementGeometryParams): EngagementGeometryResult {
    const { toolDiameter: Dc, stepover: ae } = params;

    // Edge case: zero stepover
    if (ae <= 0 || Dc <= 0) {
      return {
        engagementAngle: 0,
        contactArcLength: 0,
        engagementPercent: 0,
      };
    }

    const effectiveAe = Math.min(ae, Dc);
    const ratio = effectiveAe / Dc;

    // Engagement angle in radians: alpha = arccos(1 - 2*ae/Dc)
    let alphaRad: number;
    if (ratio >= 1.0) {
      alphaRad = Math.PI; // full slotting = 180 degrees
    } else {
      alphaRad = Math.acos(1 - 2 * ratio);
    }

    const alphaDeg = alphaRad * (180 / Math.PI);
    const R = Dc / 2;
    const contactArcLength = R * alphaRad;
    const engagementPercent = (alphaDeg / 180) * 100;

    return {
      engagementAngle: alphaDeg,
      contactArcLength,
      engagementPercent,
    };
  }

  // =========================================================================
  // Combined: Adjust Feed for Engagement
  // =========================================================================

  /**
   * Given a target average chip thickness, compute the feed per tooth (fz)
   * required to achieve it at the specified radial engagement.
   *
   * From  h_m = fz * sqrt(ae / Dc)  we solve:
   *   fz = h_m / sqrt(ae / Dc)
   *
   * Also returns the chip thinning factor at this engagement.
   *
   * @param params - tool diameter, stepover, target chip thickness (all mm)
   * @returns adjustedFz (mm/tooth), thinningFactor
   */
  static adjustFeedForEngagement(params: AdjustFeedParams): AdjustFeedResult {
    const { toolDiameter: Dc, stepover: ae, targetChipThickness } = params;

    // Edge case
    if (ae <= 0 || Dc <= 0 || targetChipThickness <= 0) {
      return { adjustedFz: 0, thinningFactor: 1 };
    }

    const effectiveAe = Math.min(ae, Dc);
    const ratio = effectiveAe / Dc;

    // fz = h_target / sqrt(ae / Dc)
    const adjustedFz = targetChipThickness / Math.sqrt(ratio);

    const thinningFactor = SolidCamAlgorithmsEngine._chipThinningFactor(ratio);

    return { adjustedFz, thinningFactor };
  }

  // =========================================================================
  // Internal helpers
  // =========================================================================

  /**
   * Chip thinning compensation factor.
   *
   * Formula (from SESSION_1_1 chipThinningFactor):
   *   ratio = ae / Dc
   *   if ratio >= 0.5:  factor = 1.0
   *   else:             factor = 1 / sqrt(ratio),  capped at 2.5
   *
   * @param ratio - ae / Dc (0..1)
   * @returns thinning factor (>= 1.0)
   */
  private static _chipThinningFactor(ratio: number): number {
    if (ratio >= 0.5) {
      return 1.0;
    }
    if (ratio <= 0) {
      return 1.0;
    }
    const theoretical = 1 / Math.sqrt(ratio);
    return Math.min(theoretical, 2.5);
  }
}
