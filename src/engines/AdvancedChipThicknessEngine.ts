/**
 * Advanced Chip Thickness Engine
 *
 * Extends PRISM's basic chip thinning algorithm with:
 * - Empirical chip thinning lookup table (industry-validated)
 * - Ball nose position-dependent chip thickness
 * - Round insert effective entering angle
 * - Helix angle lag effect on chip thickness
 * - Trochoidal variable feed for constant chip load
 * - Spiral path correction factor
 * - Min/max chip thickness validation with rubbing detection
 *
 * Sources:
 * - Machining Data Handbook (Metcut Research Associates)
 * - Altintas, Y. "Manufacturing Automation" (2012)
 * - Sandvik Coromant Technical Guide
 * - SolidCAM iMachining patent research (US8000834B2)
 * - MDPI Mathematics 2021: "Trochoidal Milling Path with Variable Feed"
 *
 * @module engines/AdvancedChipThicknessEngine
 */

import { log } from "../utils/Logger.js";

// ── Empirical chip thinning lookup table ──────────────────────────
// WOC ratio (ae/Dc) → feed compensation multiplier
// Industry-validated values from Machining Data Handbook + Sandvik
const CHIP_THINNING_TABLE: Record<number, number> = {
  0.05: 2.30,  // 5% WOC
  0.10: 1.70,  // 10% WOC
  0.15: 1.45,
  0.20: 1.30,
  0.25: 1.20,
  0.30: 1.12,
  0.35: 1.05,
  0.40: 1.02,
  0.50: 1.00,  // Baseline
  0.60: 0.98,
  0.70: 0.95,
  0.80: 0.92,
  0.90: 0.88,
  1.00: 0.85,  // Full slotting — heat buildup
};

// Entering angle factors for non-90-degree inserts
const ENTERING_ANGLE_FACTORS: Record<number, number> = {
  45: 1.41,
  60: 1.15,
  75: 1.04,
  90: 1.00,
};

// ── Types ─────────────────────────────────────────────────────────

export interface ChipAnalysisInput {
  feed_per_tooth: number;       // mm/tooth
  radial_depth: number;         // mm (ae)
  axial_depth: number;          // mm (ap)
  tool_diameter: number;        // mm (Dc)
  number_of_flutes?: number;
  entering_angle_deg?: number;  // lead angle, default 90
  helix_angle_deg?: number;     // default 30
  edge_radius_mm?: number;      // tool edge radius, default 0.02
  max_allowed_chip?: number;    // from tool catalog, default 0.15
}

export interface ChipAnalysisResult {
  max_chip_thickness: number;
  avg_chip_thickness: number;
  engagement_angle_deg: number;
  engagement_ratio: number;
  thinning_factor_theoretical: number;
  thinning_factor_empirical: number;
  feed_can_be_increased: boolean;
  min_chip_status: "OPTIMAL" | "MARGINAL" | "TOO_THIN";
  max_chip_status: "OPTIMAL" | "CONSERVATIVE" | "AGGRESSIVE" | "TOO_THICK";
  adjusted_feed_per_tooth: number;
  teeth_in_cut: number;
  warnings: string[];
}

export interface BallNoseChipResult {
  position_data: Array<{
    axial_position: number;
    local_diameter: number;
    engagement_ratio: number;
    avg_chip_thickness: number;
  }>;
  max_chip: number;
  min_chip: number;
  effective_average: number;
}

export interface RoundInsertChipResult {
  max_chip_thickness: number;
  effective_entering_angle_deg: number;
  recommended_max_depth: number;
  warning: string | null;
}

export interface TrochoidalFeedResult {
  adjusted_feed: number;
  feed_factor: number;
  was_limited: boolean;
}

// ── Engine ────────────────────────────────────────────────────────

export class AdvancedChipThicknessEngine {

  /**
   * Empirical chip thinning factor from industry lookup table.
   * More practical than pure Martellotti for real-world use.
   */
  chipThinningFactorLookup(ae: number, Dc: number): number {
    const ratio = ae / Dc;
    const ratios = Object.keys(CHIP_THINNING_TABLE).map(Number).sort((a, b) => a - b);

    if (ratio <= ratios[0]) return CHIP_THINNING_TABLE[ratios[0]];
    if (ratio >= ratios[ratios.length - 1]) return CHIP_THINNING_TABLE[ratios[ratios.length - 1]];

    for (let i = 0; i < ratios.length - 1; i++) {
      if (ratio >= ratios[i] && ratio <= ratios[i + 1]) {
        const t = (ratio - ratios[i]) / (ratios[i + 1] - ratios[i]);
        return CHIP_THINNING_TABLE[ratios[i]] + t * (CHIP_THINNING_TABLE[ratios[i + 1]] - CHIP_THINNING_TABLE[ratios[i]]);
      }
    }
    return 1.0;
  }

  /**
   * Theoretical chip thinning factor.
   * factor = 1 / sqrt(ae/Dc) for ae < 0.5*Dc, capped at 2.5x
   */
  chipThinningFactorTheoretical(ae: number, Dc: number): number {
    if (ae <= 0 || Dc <= 0) return 1.0;
    const ratio = Math.min(ae / Dc, 1.0);
    // Sandvik: factor = 1/sqrt(ae/D), smoothly approaches 1.0 as ae→D
    // No discontinuity at ae/D=0.5 — the formula is continuous
    return Math.min(1 / Math.sqrt(ratio), 2.5);
  }

  /**
   * Max chip thickness: h_ex = fz * sin(engagement_angle)
   */
  maxChipThickness(fz: number, engagementAngleRad: number): number {
    return fz * Math.sin(engagementAngleRad);
  }

  /**
   * Average chip thickness with entering angle.
   * h_m = fz * sin(kappa_r) * sqrt(ae/Dc)
   */
  avgChipThickness(fz: number, ae: number, Dc: number, kappaRad: number = Math.PI / 2): number {
    return fz * Math.sin(kappaRad) * Math.sqrt(ae / Dc);
  }

  /**
   * Instantaneous chip thickness at angular position phi.
   * h(phi) = fz * sin(phi) * sin(kappa_r)
   */
  instantaneousChipThickness(fz: number, phi: number, kappaRad: number = Math.PI / 2): number {
    return fz * Math.sin(phi) * Math.sin(kappaRad);
  }

  /**
   * Chip thickness along helix at axial position z.
   * Helix angle causes a lag: h(z) = fz * sin(phi - z*tan(beta)/R)
   */
  chipThicknessAlongHelix(fz: number, phi: number, helixAngleDeg: number, cutterRadius: number, axialPosition: number): number {
    const helixRad = helixAngleDeg * Math.PI / 180;
    const lag = axialPosition * Math.tan(helixRad) / cutterRadius;
    const effectivePhi = phi - lag;
    if (effectivePhi <= 0 || effectivePhi >= Math.PI) return 0;
    return fz * Math.sin(effectivePhi);
  }

  /**
   * Ball nose position-dependent chip thickness.
   * Local radius varies along the ball, affecting engagement and chip at each height.
   */
  ballNoseChipThickness(fz: number, ae: number, ap: number, ballRadius: number): BallNoseChipResult {
    const results: BallNoseChipResult["position_data"] = [];
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
      const z = (ap * i) / steps;
      const localRadius = Math.sqrt(Math.max(0, ballRadius * ballRadius - (ballRadius - z) * (ballRadius - z)));
      if (localRadius < 0.001) continue;

      const localDc = localRadius * 2;
      const engRatio = Math.min(ae / localDc, 1.0);
      const localHm = fz * Math.sqrt(engRatio);

      results.push({
        axial_position: Math.round(z * 1000) / 1000,
        local_diameter: Math.round(localDc * 1000) / 1000,
        engagement_ratio: Math.round(engRatio * 1000) / 1000,
        avg_chip_thickness: Math.round(localHm * 10000) / 10000,
      });
    }

    const chips = results.map(r => r.avg_chip_thickness);
    return {
      position_data: results,
      max_chip: Math.max(...chips),
      min_chip: Math.min(...chips),
      effective_average: Math.round((chips.reduce((s, v) => s + v, 0) / chips.length) * 10000) / 10000,
    };
  }

  /**
   * Round insert effective entering angle and chip thickness.
   * kappa_r_eff = arccos(1 - 2*ap/iC), best below 60 deg (ap <= 0.25*iC).
   */
  roundInsertChipThickness(fz: number, ap: number, insertDiameter: number): RoundInsertChipResult {
    const kappaEff = ap > insertDiameter / 2
      ? Math.PI / 2
      : Math.acos(1 - 2 * ap / insertDiameter);
    const kappaEffDeg = kappaEff * 180 / Math.PI;
    const hMax = fz * Math.sin(kappaEff);
    const warning = kappaEffDeg > 60
      ? `Entering angle ${kappaEffDeg.toFixed(0)} deg > 60 deg. Reduce depth to <= ${(insertDiameter * 0.25).toFixed(1)} mm for chip thinning benefit.`
      : null;

    return {
      max_chip_thickness: Math.round(hMax * 10000) / 10000,
      effective_entering_angle_deg: Math.round(kappaEffDeg * 10) / 10,
      recommended_max_depth: Math.round(insertDiameter * 0.25 * 100) / 100,
      warning,
    };
  }

  /**
   * Variable feed for trochoidal path to maintain constant chip load.
   * F_adj = F_base * sqrt(maxWidth / currentWidth), capped at 2x.
   */
  trochoidalVariableFeed(baseFeed: number, instantaneousWidth: number, maxWidth: number): TrochoidalFeedResult {
    const safeWidth = Math.max(instantaneousWidth, 0.01);
    const feedFactor = Math.sqrt(maxWidth / safeWidth);
    const limited = feedFactor > 2.0;
    return {
      adjusted_feed: Math.round(baseFeed * Math.min(feedFactor, 2.0) * 10) / 10,
      feed_factor: Math.round(Math.min(feedFactor, 2.0) * 1000) / 1000,
      was_limited: limited,
    };
  }

  /**
   * Spiral path correction factor.
   * Fx = (D_toolpath - D_cutter) / D_toolpath
   * At center of spiral (radius <= tool radius), full slotting occurs.
   */
  spiralCorrectionFactor(spiralRadius: number, toolRadius: number): { factor: number; is_slotting: boolean } {
    if (spiralRadius <= toolRadius) {
      return { factor: 0, is_slotting: true };
    }
    const Fx = (spiralRadius * 2 - toolRadius * 2) / (spiralRadius * 2);
    return { factor: Math.round(Fx * 1000) / 1000, is_slotting: false };
  }

  /**
   * Validate chip thickness against minimum (rubbing) and maximum (breakage) limits.
   */
  validateChipThickness(
    chipThickness: number,
    edgeRadius: number,
    maxAllowed: number
  ): { min_status: "OPTIMAL" | "MARGINAL" | "TOO_THIN"; max_status: "OPTIMAL" | "CONSERVATIVE" | "AGGRESSIVE" | "TOO_THICK"; warnings: string[] } {
    const warnings: string[] = [];
    const minChip = edgeRadius * 0.25;
    const optChip = edgeRadius * 0.5;

    let min_status: "OPTIMAL" | "MARGINAL" | "TOO_THIN" = "OPTIMAL";
    if (chipThickness < minChip) {
      min_status = "TOO_THIN";
      warnings.push(`Chip ${chipThickness.toFixed(4)} mm below minimum ${minChip.toFixed(4)} mm (rubbing risk)`);
    } else if (chipThickness < optChip) {
      min_status = "MARGINAL";
    }

    let max_status: "OPTIMAL" | "CONSERVATIVE" | "AGGRESSIVE" | "TOO_THICK" = "OPTIMAL";
    const utilization = (chipThickness / maxAllowed) * 100;
    if (chipThickness > maxAllowed) {
      max_status = "TOO_THICK";
      warnings.push(`Chip ${chipThickness.toFixed(4)} mm exceeds max ${maxAllowed.toFixed(4)} mm (breakage risk)`);
    } else if (utilization < 50) {
      max_status = "CONSERVATIVE";
    } else if (utilization >= 90) {
      max_status = "AGGRESSIVE";
      warnings.push(`Using ${utilization.toFixed(0)}% of chip capacity — ensure rigid setup`);
    }

    return { min_status, max_status, warnings };
  }

  /**
   * Comprehensive chip thickness analysis for a cutting operation.
   */
  analyze(input: ChipAnalysisInput): ChipAnalysisResult {
    const {
      feed_per_tooth: fz,
      radial_depth: ae,
      axial_depth: ap,
      tool_diameter: Dc,
      number_of_flutes: z = 4,
      entering_angle_deg = 90,
      helix_angle_deg = 30,
      edge_radius_mm = 0.02,
      max_allowed_chip = 0.15,
    } = input;

    const kappaRad = entering_angle_deg * Math.PI / 180;
    const engRatio = Math.min(ae / Dc, 1.0);
    const engAngleRad = Math.acos(Math.max(-1, 1 - 2 * engRatio));
    const engAngleDeg = engAngleRad * 180 / Math.PI;

    const hMax = this.maxChipThickness(fz, engAngleRad);
    const hAvg = this.avgChipThickness(fz, ae, Dc, kappaRad);

    const thinTheory = this.chipThinningFactorTheoretical(ae, Dc);
    const thinEmpirical = this.chipThinningFactorLookup(ae, Dc);

    const validation = this.validateChipThickness(hAvg, edge_radius_mm, max_allowed_chip);

    // Adjusted feed targeting 75% of max for safety margin
    const targetChip = max_allowed_chip * 0.75;
    const adjustedFz = targetChip / (Math.sin(kappaRad) * Math.sqrt(engRatio));

    const arcEng = engAngleRad;  // For partial engagement
    const teethInCut = z * arcEng / (2 * Math.PI);

    log.debug(`[ChipAnalysis] D=${Dc}, ae=${ae}, fz=${fz}, hAvg=${hAvg.toFixed(4)}, thin=${thinEmpirical.toFixed(2)}x`);

    return {
      max_chip_thickness: Math.round(hMax * 10000) / 10000,
      avg_chip_thickness: Math.round(hAvg * 10000) / 10000,
      engagement_angle_deg: Math.round(engAngleDeg * 10) / 10,
      engagement_ratio: Math.round(engRatio * 10000) / 10000,
      thinning_factor_theoretical: Math.round(thinTheory * 1000) / 1000,
      thinning_factor_empirical: Math.round(thinEmpirical * 1000) / 1000,
      feed_can_be_increased: thinTheory > 1,
      min_chip_status: validation.min_status,
      max_chip_status: validation.max_status,
      adjusted_feed_per_tooth: Math.round(adjustedFz * 10000) / 10000,
      teeth_in_cut: Math.round(teethInCut * 100) / 100,
      warnings: validation.warnings,
    };
  }
}

export const advancedChipThicknessEngine = new AdvancedChipThicknessEngine();
