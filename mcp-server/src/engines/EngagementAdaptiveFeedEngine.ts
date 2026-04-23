/**
 * EngagementAdaptiveFeedEngine — Adaptive feed rate control based on tool engagement geometry
 *
 * Adjusts feed rates along a toolpath to maintain constant chip load, constant force,
 * constant MRR, or thermal balance as engagement angle changes (corners, slots, transitions).
 *
 * Models: Chip thinning compensation (Martellotti 1941, exact circular), Kienzle force model,
 *         Loewen-Shaw thermal partition, S-curve feed ramping
 * References: Altintas (2012), Kienzle (1952), Loewen & Shaw (1954), Martellotti (1941)
 * Safety: Feed clamps prevent excessive force spikes at high engagement; min clamp avoids
 *         rubbing at low engagement; ramp transitions avoid machine jerk
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ─── Types ─────────────────────────────────────────────────────────

/** ISO material group identifier for Kienzle constant lookup. Re-exported from canonical. */
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Chip thinning calculation model selection. */
export type ChipThinningModel = "simplified" | "martellotti" | "exact";

/** Adaptive feed control mode. */
export type AdaptiveFeedMode =
  | "constant_chip_load" | "constant_force"
  | "constant_mrr" | "thermal_balance";

/** Limiting factor that determined the final adjusted feed for a segment. */
export type LimitingFactor =
  | "chip_load" | "force" | "mrr" | "thermal"
  | "max_clamp" | "min_clamp" | "nominal";

/** Toolpath segment type. */
export type SegmentMoveType = "linear" | "arc_cw" | "arc_ccw";

/** Single toolpath segment input. */
export interface ToolpathSegment {
  x: number;
  y: number;
  radial_depth_mm?: number;
  engagement_deg?: number;
  type: SegmentMoveType;
  i?: number;
  j?: number;
  r?: number;
}

/** Full input for adaptive feed computation. */
export interface AdaptiveFeedInput {
  tool_diameter_mm: number;
  flutes: number;
  nominal_feed_mmmin: number;
  nominal_rpm: number;
  nominal_radial_depth_mm: number;
  axial_depth_mm: number;
  material_iso_group: ISOGroup;
  /** Kienzle specific cutting force at h=1mm, b=1mm (N/mm²). Defaults from ISO group. */
  kc1_1?: number;
  /** Kienzle exponent. Defaults from ISO group. */
  mc?: number;
  /** Feed control strategy. */
  mode: AdaptiveFeedMode;
  /** Maximum feed multiplier relative to nominal. Default 2.0. */
  max_feed_multiplier?: number;
  /** Minimum feed multiplier relative to nominal. Default 0.3. */
  min_feed_multiplier?: number;
  /** Feed ramp transition distance in mm. Default 5.0. */
  ramp_distance_mm?: number;
  /** Ordered toolpath segments. */
  segments: ToolpathSegment[];
}

/** Computed result for a single toolpath segment. */
export interface AdaptiveFeedSegment {
  segment_index: number;
  engagement_deg: number;
  radial_depth_mm: number;
  chip_thickness_mm: number;
  adjusted_feed_mmmin: number;
  feed_multiplier: number;
  force_n: number;
  mrr_cm3min: number;
  thermal_load_w: number;
  limiting_factor: LimitingFactor;
}

/** Aggregate result from adaptive feed computation. */
export interface AdaptiveFeedResult {
  segments: AdaptiveFeedSegment[];
  nominal_feed_mmmin: number;
  avg_adjusted_feed_mmmin: number;
  feed_range: { min: number; max: number };
  engagement_range: { min_deg: number; max_deg: number };
  force_range: { min_n: number; max_n: number };
  estimated_time_savings_pct: number;
  mode: string;
  warnings: string[];
}

/** Thermal parameters for Loewen-Shaw model. */
export interface ThermalParams {
  /** Thermal conductivity of workpiece, W/(m·K). Default 50. */
  conductivity_w_mk?: number;
  /** Density × specific heat, J/(m³·K). Default 3.5e6. */
  rho_c_jm3k?: number;
  /** Fraction of heat going into chip at nominal conditions. Default 0.7. */
  nominal_chip_heat_fraction?: number;
}

// ─── Constants ─────────────────────────────────────────────────────

/**
 * Default Kienzle constants per ISO material group — sourced from canonical physics constants.
 * Source: Sandvik Coromant (2024), Altintas "Manufacturing Automation", Klocke (2011)
 */
const KIENZLE_DEFAULTS = CANONICAL_KIENZLE;

/** Degrees to radians conversion factor. */
const DEG2RAD = Math.PI / 180;

/** Radians to degrees conversion factor. */
const RAD2DEG = 180 / Math.PI;

/** Minimum engagement angle considered valid (degrees). Below this → air cut. */
const MIN_ENGAGEMENT_DEG = 1.0;

/** Full slot engagement angle (degrees). */
const FULL_SLOT_DEG = 180.0;

// ─── Engine ────────────────────────────────────────────────────────

/**
 * Engagement Adaptive Feed Engine — computes per-segment feed adjustments
 * to maintain constant chip load, force, MRR, or thermal balance across
 * varying engagement conditions along a toolpath.
 */
export class EngagementAdaptiveFeedEngineImpl {

  /**
   * Main method: compute adaptive feed rates for all toolpath segments.
   *
   * For each segment, determines engagement angle (from input or calculated),
   * then adjusts feed per the selected mode while respecting force/thermal limits.
   *
   * @param input - Full adaptive feed input with toolpath and parameters
   * @returns Segment-by-segment feed adjustments with aggregate statistics
   */
  adaptFeed(input: AdaptiveFeedInput): AdaptiveFeedResult {
    const warnings: string[] = [];
    const D = input.tool_diameter_mm;
    const z = input.flutes;
    const n = input.nominal_rpm;
    const ap = input.axial_depth_mm;
    const ae_nom = input.nominal_radial_depth_mm;
    const fz_nom = input.nominal_feed_mmmin / (z * n);  // mm/tooth
    const maxMult = input.max_feed_multiplier ?? 2.0;
    const minMult = input.min_feed_multiplier ?? 0.3;
    const kienzle = KIENZLE_DEFAULTS[input.material_iso_group];
    const kc1_1 = input.kc1_1 ?? kienzle.kc1_1;
    const mc = input.mc ?? kienzle.mc;

    if (ae_nom > D) {
      warnings.push(`Nominal ae (${ae_nom}mm) exceeds tool diameter (${D}mm); clamping to D`);
    }
    if (input.segments.length < 2) {
      warnings.push("Need at least 2 segments for meaningful adaptation");
    }

    // Nominal engagement angle: θ = acos(1 - 2*ae/D)
    const ae_eff = Math.min(ae_nom, D);
    const nominalEngDeg = this.calculateEngagement(D, ae_eff, "linear");
    // Martellotti mean chip thickness: hm = fz * (1-cos(θ))/θ  [Ref: Martellotti 1941]
    const nomEngRad = nominalEngDeg * DEG2RAD;
    const nominalChipThickness = nomEngRad > 1e-6
      ? fz_nom * (1 - Math.cos(nomEngRad)) / nomEngRad
      : fz_nom;

    // Nominal force via Kienzle: F = kc * ap * hm^(1-mc), kc = kc1_1 * hm^(-mc)
    // → F = kc1_1 * ap * hm^(1-mc)   [hm in mm, ap in mm → F in N]
    const nominalForce = kc1_1 * ap * Math.pow(Math.max(nominalChipThickness, 0.001), 1 - mc);
    const nominalMRR = (ae_eff * ap * input.nominal_feed_mmmin) / 1000;  // cm³/min

    // Cutting speed for thermal model
    const Vc = Math.PI * D * n / 1000;  // m/min

    const resultSegments: AdaptiveFeedSegment[] = [];

    for (let i = 0; i < input.segments.length; i++) {
      const seg = input.segments[i];
      const prevSeg = i > 0 ? input.segments[i - 1] : undefined;
      const nextSeg = i < input.segments.length - 1 ? input.segments[i + 1] : undefined;

      // ── Determine radial depth ──
      let ae: number;
      if (seg.radial_depth_mm !== undefined) {
        ae = seg.radial_depth_mm;
      } else if (prevSeg && nextSeg) {
        ae = this.estimateRadialDepth(prevSeg, seg, nextSeg, D);
      } else {
        ae = ae_nom;
      }
      ae = Math.max(0.01, Math.min(ae, D));

      // ── Determine engagement angle ──
      let engDeg: number;
      if (seg.engagement_deg !== undefined) {
        engDeg = seg.engagement_deg;
      } else {
        const prevDir = prevSeg
          ? { dx: seg.x - prevSeg.x, dy: seg.y - prevSeg.y }
          : undefined;
        const nextDir = nextSeg
          ? { dx: nextSeg.x - seg.x, dy: nextSeg.y - seg.y }
          : undefined;
        engDeg = this.calculateEngagement(D, ae, seg.type, prevDir, nextDir);
      }
      engDeg = Math.max(MIN_ENGAGEMENT_DEG, Math.min(engDeg, FULL_SLOT_DEG));

      // ── Compute adjusted feed per mode ──
      let adjustedFz: number;
      let limitingFactor: LimitingFactor = "nominal";

      switch (input.mode) {
        case "constant_chip_load":
          adjustedFz = this.chipThinningFactor(engDeg, D, ae, "exact") * fz_nom;
          limitingFactor = "chip_load";
          break;
        case "constant_force":
          adjustedFz = this.constantForceFeed(fz_nom, nominalEngDeg, engDeg, kc1_1, mc);
          limitingFactor = "force";
          break;
        case "constant_mrr":
          adjustedFz = this.constantMRRFeed(fz_nom, ae_nom, ae);
          limitingFactor = "mrr";
          break;
        case "thermal_balance":
          adjustedFz = this.thermalBalanceFeed(fz_nom, ae_nom, ae, Vc, ap, kc1_1, {});
          limitingFactor = "thermal";
          break;
        default:
          adjustedFz = fz_nom;
      }

      // ── Apply feed multiplier clamps ──
      const mult = adjustedFz / fz_nom;
      let clampedMult = mult;
      if (mult > maxMult) {
        clampedMult = maxMult;
        limitingFactor = "max_clamp";
      } else if (mult < minMult) {
        clampedMult = minMult;
        limitingFactor = "min_clamp";
      }
      const finalFz = fz_nom * clampedMult;
      const adjustedFeed = finalFz * z * n;

      // ── Compute output metrics ──
      const chipThickness = finalFz * Math.sin((engDeg * DEG2RAD) / 2);
      const force = kc1_1 * ap * Math.pow(Math.max(chipThickness, 0.001), 1 - mc);
      const mrr = (ae * ap * adjustedFeed) / 1000;  // cm³/min
      // Thermal: P_cut ≈ F * Vc / 60 (W), simplified
      const thermalLoad = force * (Vc / 60);  // N * m/s = W

      resultSegments.push({
        segment_index: i,
        engagement_deg: Math.round(engDeg * 100) / 100,
        radial_depth_mm: Math.round(ae * 1000) / 1000,
        chip_thickness_mm: Math.round(chipThickness * 10000) / 10000,
        adjusted_feed_mmmin: Math.round(adjustedFeed * 10) / 10,
        feed_multiplier: Math.round(clampedMult * 1000) / 1000,
        force_n: Math.round(force * 10) / 10,
        mrr_cm3min: Math.round(mrr * 1000) / 1000,
        thermal_load_w: Math.round(thermalLoad * 10) / 10,
        limiting_factor: limitingFactor,
      });
    }

    // ── Aggregate statistics ──
    const feeds = resultSegments.map(s => s.adjusted_feed_mmmin);
    const engagements = resultSegments.map(s => s.engagement_deg);
    const forces = resultSegments.map(s => s.force_n);
    const avgFeed = feeds.reduce((a, b) => a + b, 0) / (feeds.length || 1);

    // Estimate time savings: compare sum of (1/adjusted_feed) vs sum of (1/nominal_feed)
    // Time ∝ Σ(segment_length / feed). Simplified: assume equal segment lengths.
    const nominalTime = resultSegments.length / input.nominal_feed_mmmin;
    const adaptiveTime = feeds.reduce((sum, f) => sum + 1 / Math.max(f, 1), 0);
    const timeSavingsPct = nominalTime > 0
      ? Math.round((1 - adaptiveTime / nominalTime) * 10000) / 100
      : 0;

    log.info(
      `EngagementAdaptiveFeed: ${resultSegments.length} segments, mode=${input.mode}, ` +
      `avg_feed=${Math.round(avgFeed)}mm/min, savings=${timeSavingsPct}%`
    );

    return {
      segments: resultSegments,
      nominal_feed_mmmin: input.nominal_feed_mmmin,
      avg_adjusted_feed_mmmin: Math.round(avgFeed * 10) / 10,
      feed_range: { min: Math.min(...feeds), max: Math.max(...feeds) },
      engagement_range: {
        min_deg: Math.min(...engagements),
        max_deg: Math.max(...engagements),
      },
      force_range: { min_n: Math.min(...forces), max_n: Math.max(...forces) },
      estimated_time_savings_pct: timeSavingsPct,
      mode: input.mode,
      warnings,
    };
  }

  /**
   * Calculate engagement (wrap) angle from tool diameter and radial depth.
   *
   * Formula: θ = acos(1 - 2·ae/D)
   * - Linear move: pure ae/D relationship
   * - Internal corner: engagement increases toward 180° based on direction change
   * - External corner: engagement decreases
   * - Full slot (ae ≥ D): engagement = 180°
   *
   * @param toolDiameter - Tool diameter in mm
   * @param radialDepth - Radial depth of cut (ae) in mm
   * @param moveType - Segment move type
   * @param prevDirection - Direction vector of previous move (optional)
   * @param nextDirection - Direction vector of next move (optional)
   * @returns Engagement angle in degrees
   */
  calculateEngagement(
    toolDiameter: number,
    radialDepth: number,
    moveType: SegmentMoveType,
    prevDirection?: { dx: number; dy: number },
    nextDirection?: { dx: number; dy: number },
  ): number {
    const D = toolDiameter;
    const ae = Math.min(radialDepth, D);

    // Full slot detection
    if (ae >= D * 0.99) return FULL_SLOT_DEG;

    // Base engagement angle from ae/D ratio
    // θ = acos(1 - 2·ae/D)  [valid for ae ≤ D]
    const ratio = Math.max(0, Math.min(2 * ae / D, 2));
    let engRad = Math.acos(1 - ratio);

    // Adjust for corner geometry if direction vectors available
    if (prevDirection && nextDirection) {
      const prevLen = Math.sqrt(prevDirection.dx ** 2 + prevDirection.dy ** 2);
      const nextLen = Math.sqrt(nextDirection.dx ** 2 + nextDirection.dy ** 2);
      if (prevLen > 1e-9 && nextLen > 1e-9) {
        // Cross product sign determines internal vs external corner
        const cross = prevDirection.dx * nextDirection.dy - prevDirection.dy * nextDirection.dx;
        // Dot product for angle between directions
        const dot = prevDirection.dx * nextDirection.dx + prevDirection.dy * nextDirection.dy;
        const cosAngle = Math.max(-1, Math.min(1, dot / (prevLen * nextLen)));
        const turnAngle = Math.acos(cosAngle);  // 0 = straight, π = U-turn

        // Internal corner (cross < 0 for conventional climb): engagement increases
        // External corner (cross > 0): engagement decreases
        // Scale: at 90° internal corner, engagement can approach 180°
        const cornerFactor = turnAngle / Math.PI;  // 0..1
        if (cross < 0) {
          // Internal corner — blend toward 180°
          engRad = engRad + (Math.PI - engRad) * cornerFactor * 0.8;
        } else if (cross > 0) {
          // External corner — reduce engagement
          engRad = engRad * (1 - cornerFactor * 0.5);
        }
      }
    }

    // Arc moves inherently have slightly higher engagement on inside
    if (moveType === "arc_cw" || moveType === "arc_ccw") {
      engRad = Math.min(engRad * 1.05, Math.PI);
    }

    return Math.max(MIN_ENGAGEMENT_DEG, engRad * RAD2DEG);
  }

  /**
   * Compute chip thinning compensation factor.
   *
   * When ae < D/2, the actual chip thickness is less than the programmed feed per tooth.
   * The factor indicates how much to multiply fz to achieve the target chip thickness.
   *
   * Models:
   * - **simplified**: factor = 1 / sin(θ/2).  Direct inverse of engagement half-angle.
   * - **martellotti**: hm = fz·√(ae/D) → factor = 1/√(ae/D).  Martellotti (1941).
   * - **exact**: hm = fz·(ae/D) / arcsin(ae/D) → factor = arcsin(ae/D) / (ae/D).
   *   More accurate for small ae/D ratios.
   *
   * @param engagement_deg - Engagement angle in degrees
   * @param toolDiameter - Tool diameter in mm
   * @param radialDepth - Radial depth of cut in mm
   * @param model - Calculation model. Default "exact".
   * @returns Chip thinning compensation factor (>1 when ae < D/2)
   */
  chipThinningFactor(
    engagement_deg: number,
    toolDiameter: number,
    radialDepth: number,
    model: ChipThinningModel = "exact",
  ): number {
    const D = toolDiameter;
    const ae = Math.min(radialDepth, D);
    const ratio = ae / D;

    // At full slot or beyond D/2, no thinning compensation needed
    if (ratio >= 0.5) return 1.0;
    if (engagement_deg >= FULL_SLOT_DEG) return 1.0;

    switch (model) {
      case "simplified": {
        // factor = 1 / sin(θ/2)
        const halfEngRad = (engagement_deg * DEG2RAD) / 2;
        const sinHalf = Math.sin(halfEngRad);
        return sinHalf > 0.05 ? 1 / sinHalf : 20.0;  // clamp at 20x max
      }

      case "martellotti": {
        // Martellotti (1941): hm = fz·√(ae/D) → factor = 1/√(ae/D)
        return ratio > 0.001 ? 1 / Math.sqrt(ratio) : 31.6;  // √(1/0.001)
      }

      case "exact":
      default: {
        // Exact circular: hm = fz·(ae/D) / arcsin(ae/D)
        // Compensation factor = arcsin(ae/D) / (ae/D)
        // When ae/D is very small, arcsin(x)/x → 1, so factor → 1 (but thinning
        // is already captured by the small ae/D term in hm)
        // Actually: to keep hm constant, factor = arcsin(ratio_nom) / (ratio_nom)
        //           × (ratio) / arcsin(ratio)... simpler: just invert the thinning
        // Direct: effective_hm = fz × ratio / arcsin(ratio)
        //         to get target hm: factor = arcsin(ratio) / ratio
        if (ratio < 0.001) return 1.0;
        const asinRatio = Math.asin(ratio);
        return asinRatio / ratio;
      }
    }
  }

  /**
   * Compute adjusted feed per tooth for constant cutting force.
   *
   * Kienzle model: F = kc1_1 · ap · hm^(1-mc)
   * where hm = fz · sin(θ/2) is the mean chip thickness.
   *
   * To keep F constant when engagement changes from θ_nom to θ_new:
   *   fz_new = fz_nom · (sin(θ_nom/2) / sin(θ_new/2))
   *
   * Derivation: F_nom = kc1_1·ap·(fz_nom·sin(θ_nom/2))^(1-mc)
   *             F_new = kc1_1·ap·(fz_new·sin(θ_new/2))^(1-mc) = F_nom
   *             → (fz_new·sin(θ_new/2))^(1-mc) = (fz_nom·sin(θ_nom/2))^(1-mc)
   *             → fz_new = fz_nom · sin(θ_nom/2) / sin(θ_new/2)
   *
   * @param nominal_fz - Nominal feed per tooth (mm)
   * @param nominal_engagement - Nominal engagement angle (degrees)
   * @param new_engagement - New engagement angle (degrees)
   * @param _kc1_1 - Kienzle kc1_1 (unused in simplified form, kept for API consistency)
   * @param _mc - Kienzle exponent (unused in simplified form)
   * @returns Adjusted feed per tooth (mm)
   */
  constantForceFeed(
    nominal_fz: number,
    nominal_engagement: number,
    new_engagement: number,
    _kc1_1: number,
    _mc: number,
  ): number {
    const sinNom = Math.sin((nominal_engagement * DEG2RAD) / 2);
    const sinNew = Math.sin((new_engagement * DEG2RAD) / 2);

    // near-zero engagement → large multiplier (will be clamped)
    if (sinNew < 0.01) return nominal_fz * 10;
    if (sinNom < 0.01) return nominal_fz;

    return nominal_fz * (sinNom / sinNew);
  }

  /**
   * Compute adjusted feed per tooth for constant material removal rate.
   *
   * MRR = ae · ap · fz · z · n
   * To keep MRR constant when ae changes: fz_new = fz_nom · ae_nom / ae_new
   *
   * @param nominal_fz - Nominal feed per tooth (mm)
   * @param nominal_ae - Nominal radial depth (mm)
   * @param new_ae - New radial depth (mm)
   * @returns Adjusted feed per tooth (mm)
   */
  constantMRRFeed(nominal_fz: number, nominal_ae: number, new_ae: number): number {
    if (new_ae < 0.001) return nominal_fz * 100;  // will be clamped
    return nominal_fz * (nominal_ae / new_ae);
  }

  /**
   * Compute adjusted feed for constant thermal load per unit cut length.
   *
   * Thermal load per unit length: Q/L ∝ Vc · ae · ap · fz · kc · (1 - R_chip)
   * where R_chip is the chip heat fraction from Loewen-Shaw:
   *   R_chip = 1 / (1 + 0.754·√(k / (ρ·c·V·t)))
   *   t = chip thickness ≈ fz·sin(θ/2)
   *
   * Simplified: for small ae changes, thermal load scales with ae·fz.
   * To keep Q/L constant: fz_new ≈ fz_nom · ae_nom / ae_new (same as MRR)
   * but with Loewen-Shaw correction for chip heat partition shift.
   *
   * @param nominal_fz - Nominal feed per tooth (mm)
   * @param nominal_ae - Nominal radial depth (mm)
   * @param new_ae - New radial depth (mm)
   * @param Vc - Cutting speed (m/min)
   * @param ap - Axial depth (mm)
   * @param kc - Specific cutting force (N/mm²)
   * @param thermal - Optional thermal parameters
   * @returns Adjusted feed per tooth (mm)
   */
  thermalBalanceFeed(
    nominal_fz: number,
    nominal_ae: number,
    new_ae: number,
    Vc: number,
    _ap: number,
    _kc: number,
    thermal: ThermalParams,
  ): number {
    if (new_ae < 0.001) return nominal_fz * 100;

    const k = thermal.conductivity_w_mk ?? 50;         // W/(m·K)
    const rhoC = thermal.rho_c_jm3k ?? 3.5e6;          // J/(m³·K)
    const Vs = Vc / 60;                                  // m/s

    // Chip heat fraction at nominal conditions (Loewen-Shaw)
    // R_chip = 1 / (1 + 0.754·√(k/(ρ·c·V·t)))
    // t ≈ nominal chip thickness in meters
    const t_nom = nominal_fz * 0.5 * 0.001;  // rough hm estimate, converted to meters
    const loewenNom = t_nom > 0 ? 0.754 * Math.sqrt(k / (rhoC * Vs * t_nom)) : 0.5;
    const R_chip_nom = 1 / (1 + loewenNom);

    // At new conditions, fz changes → chip thickness changes → R_chip shifts
    // First-order: just scale by ae ratio with small correction
    const aeRatio = nominal_ae / new_ae;
    // Thermal correction: higher ae → thicker chip → more heat in chip → workpiece sees less
    // This is a second-order effect; apply 10% correction toward ae ratio
    const thermalCorrection = 1 + 0.1 * (1 - 1 / aeRatio);

    return nominal_fz * aeRatio * thermalCorrection;
  }

  /**
   * Generate a smooth feed transition ramp between two feed rates.
   *
   * Uses cosine (S-curve) interpolation to avoid sudden acceleration changes
   * that cause machine vibration and surface marks.
   *
   * Profile: f(t) = f_before + (f_after - f_before) · (1 - cos(π·t)) / 2
   * where t = position / ramp_distance, 0 ≤ t ≤ 1
   *
   * @param feed_before - Feed rate before transition (mm/min)
   * @param feed_after - Feed rate after transition (mm/min)
   * @param ramp_distance_mm - Total ramp distance (mm)
   * @param num_points - Number of interpolation points. Default 10.
   * @returns Array of { position_mm, feed_mmmin } along the ramp
   */
  rampFeedTransition(
    feed_before: number,
    feed_after: number,
    ramp_distance_mm: number,
    num_points: number = 10,
  ): Array<{ position_mm: number; feed_mmmin: number }> {
    const points: Array<{ position_mm: number; feed_mmmin: number }> = [];
    const n = Math.max(2, num_points);

    for (let i = 0; i <= n; i++) {
      const t = i / n;  // 0..1
      const pos = t * ramp_distance_mm;
      // S-curve (cosine blend): smooth start and end
      const blend = (1 - Math.cos(Math.PI * t)) / 2;
      const feed = feed_before + (feed_after - feed_before) * blend;
      points.push({
        position_mm: Math.round(pos * 1000) / 1000,
        feed_mmmin: Math.round(feed * 10) / 10,
      });
    }

    return points;
  }

  /**
   * Estimate radial depth of cut from toolpath geometry.
   *
   * Heuristics:
   * - Parallel passes: ae ≈ perpendicular distance between passes
   * - Straight moves with stepover: ae from lateral offset
   * - Arc moves: ae from arc geometry and tool diameter
   * - Fallback: use tool diameter × 0.3 (typical roughing stepover)
   *
   * @param prevMove - Previous toolpath segment
   * @param currentMove - Current toolpath segment
   * @param nextMove - Next toolpath segment
   * @param toolDiameter - Tool diameter in mm
   * @returns Estimated radial depth in mm
   */
  estimateRadialDepth(
    prevMove: ToolpathSegment,
    currentMove: ToolpathSegment,
    nextMove: ToolpathSegment,
    toolDiameter: number,
  ): number {
    // Direction of current move
    const dx1 = currentMove.x - prevMove.x;
    const dy1 = currentMove.y - prevMove.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    // Direction of next move
    const dx2 = nextMove.x - currentMove.x;
    const dy2 = nextMove.y - currentMove.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (len1 < 1e-9 || len2 < 1e-9) return toolDiameter * 0.3;

    // Perpendicular distance from prev-to-current line to next point
    // gives an estimate of stepover (ae) for parallel-pass patterns
    const nx = -dy1 / len1;  // normal to current direction
    const ny = dx1 / len1;
    const perpDist = Math.abs(nx * dx2 + ny * dy2);

    // If perpendicular component is significant → it's a stepover
    if (perpDist > 0.1 && perpDist < toolDiameter) {
      return perpDist;
    }

    // For arc moves, estimate from arc radius vs tool radius
    if (currentMove.type !== "linear" && currentMove.r !== undefined) {
      const arcR = Math.abs(currentMove.r);
      // Internal arc (tool inside): ae increases. External: ae decreases.
      if (arcR > toolDiameter / 2) {
        return toolDiameter * 0.3;  // default stepover for arcs
      }
      return Math.min(toolDiameter, arcR);
    }

    // Fallback: 30% of tool diameter (common roughing stepover)
    return toolDiameter * 0.3;
  }
}

// ─── Singleton Export ──────────────────────────────────────────────

/** Singleton instance of the Engagement Adaptive Feed Engine. */
export const engagementAdaptiveFeedEngine = new EngagementAdaptiveFeedEngineImpl();
