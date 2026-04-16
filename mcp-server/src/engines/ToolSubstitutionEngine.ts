/**
 * ToolSubstitutionEngine — Auto-adjust cutting parameters when tools change
 *
 * When the machinist substitutes a tool (different boring bar, drill, insert),
 * this engine recalculates all affected parameters to maintain safe, optimal cutting:
 *
 *   Boring bar change:
 *     - Feed scaled by L/D rigidity (Sandvik Coromant guidelines)
 *     - DOC reduced proportional to bar diameter ratio
 *     - RPM clamp adjusted for new stiffness
 *
 *   Drill size change:
 *     - Peck depth recalculated (1xD first, 0.5xD subsequent for steel)
 *     - Feed rate scaled by diameter ratio
 *     - Point depth recalculated from drill point angle
 *     - RPM recalculated from SFM and new diameter
 *
 *   Insert nose radius change:
 *     - Finish feed recalculated for target surface finish Ra
 *     - Brammertz model: f = sqrt(Ra * 32 * r_nose / 1000)
 *
 * @module ToolSubstitutionEngine
 *
 * Reference: Sandvik Coromant "Boring bar selection guide",
 *   Machinery's Handbook 31st ed., Brammertz kinematic roughness model
 */

import { rpmFromVc, predictedRa } from "../physics/constants.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Boring bar substitution input */
export interface BoringBarSubInput {
  /** Original bar diameter (inches or mm) */
  original_bar_dia: number;
  /** New bar diameter */
  new_bar_dia: number;
  /** Bar stickout / overhang (inches or mm) */
  bar_stickout: number;
  /** Original feed rate */
  original_feed: number;
  /** Original DOC */
  original_doc: number;
  /** Original max RPM (G50 clamp) */
  original_max_rpm: number;
  /** Unit system */
  unit_system: "imperial" | "metric";
}

export interface BoringBarSubResult {
  /** Adjusted feed rate */
  new_feed: number;
  /** Adjusted DOC */
  new_doc: number;
  /** Adjusted max RPM */
  new_max_rpm: number;
  /** Original L/D ratio */
  original_ld: number;
  /** New L/D ratio */
  new_ld: number;
  /** Feed scale factor applied */
  feed_scale: number;
  /** DOC scale factor applied */
  doc_scale: number;
  /** Whether substitution is safe */
  safe: boolean;
  /** Warnings */
  warnings: string[];
  /** Okuma variable update lines */
  okuma_updates: string[];
}

/** Drill substitution input */
export interface DrillSubInput {
  /** Original drill diameter */
  original_dia: number;
  /** New drill diameter */
  new_dia: number;
  /** Hole depth */
  hole_depth: number;
  /** Original feed rate */
  original_feed: number;
  /** Surface speed (SFM or m/min) */
  sfm: number;
  /** Drill point angle (degrees, default 118) */
  point_angle?: number;
  /** Material ISO group */
  material_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Unit system */
  unit_system: "imperial" | "metric";
}

export interface DrillSubResult {
  /** New feed rate (scaled by diameter ratio) */
  new_feed: number;
  /** New RPM from SFM and new diameter */
  new_rpm: number;
  /** New peck schedule */
  peck_schedule: number[];
  /** New drill point depth */
  point_depth: number;
  /** Total depth including point */
  total_depth_with_point: number;
  /** Feed scale factor */
  feed_scale: number;
  /** Warnings */
  warnings: string[];
  /** Okuma variable update lines */
  okuma_updates: string[];
}

/** Insert nose radius substitution input */
export interface InsertSubInput {
  /** Original nose radius */
  original_radius: number;
  /** New nose radius */
  new_radius: number;
  /** Original feed rate */
  original_feed: number;
  /** Target surface finish Ra (micrometers) */
  target_ra_um: number;
  /** Unit system */
  unit_system: "imperial" | "metric";
}

export interface InsertSubResult {
  /** New feed for target Ra with new radius */
  new_feed: number;
  /** Predicted Ra with original feed and new radius */
  predicted_ra_original_feed: number;
  /** Predicted Ra with new feed and new radius */
  predicted_ra_new_feed: number;
  /** Feed scale factor */
  feed_scale: number;
  /** Whether the new radius is larger (allows more feed) */
  radius_increased: boolean;
  /** Warnings */
  warnings: string[];
  /** Okuma variable update lines */
  okuma_updates: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Imperial SFM→RPM factor: 12/pi */
const IMPERIAL_RPM_FACTOR = 3.8197;

/** Minimum boring bar L/D before "not recommended" */
const MAX_SAFE_LD = 6.0;

// ============================================================================
// ENGINE
// ============================================================================

export class ToolSubstitutionEngine {
  /**
   * Recalculate parameters after boring bar substitution.
   *
   * Scaling rules (Sandvik Coromant boring bar guide):
   *   - DOC scales linearly with bar diameter ratio
   *   - Feed scales by rigidity (L/D bracket)
   *   - Max RPM adjusted: smaller bar → lower max RPM (vibration risk)
   */
  substituteBoringBar(input: BoringBarSubInput): BoringBarSubResult {
    const warnings: string[] = [];
    const updates: string[] = [];

    const origLD = input.bar_stickout / input.original_bar_dia;
    const newLD = input.bar_stickout / input.new_bar_dia;

    // DOC scales with bar diameter ratio
    const diaRatio = input.new_bar_dia / input.original_bar_dia;
    const docScale = Math.min(diaRatio, 1.0); // Never increase DOC on smaller bar
    const newDoc = Math.round(input.original_doc * docScale * 10000) / 10000;

    // Feed scales by L/D rigidity bracket
    const origFeedFactor = this._ldFeedFactor(origLD);
    const newFeedFactor = this._ldFeedFactor(newLD);
    const feedScale = newFeedFactor / origFeedFactor;
    const newFeed = Math.round(input.original_feed * feedScale * 10000) / 10000;

    // Max RPM: scale down for worse L/D (vibration risk)
    let newMaxRPM = input.original_max_rpm;
    if (newLD > origLD) {
      // Worse L/D → reduce max RPM proportionally
      const rpmScale = Math.max(0.5, origLD / newLD);
      newMaxRPM = Math.round(input.original_max_rpm * rpmScale / 100) * 100;
    }

    // Safety checks
    const safe = newLD <= MAX_SAFE_LD;
    if (!safe) {
      warnings.push(`L/D=${newLD.toFixed(1)} exceeds safe limit (${MAX_SAFE_LD}). Consider shorter stickout or larger bar.`);
    }
    if (diaRatio < 0.6) {
      warnings.push(`Bar diameter reduced by ${((1 - diaRatio) * 100).toFixed(0)}%. Significant rigidity loss — verify chatter stability.`);
    }
    if (feedScale < 0.5) {
      warnings.push(`Feed reduced to ${(feedScale * 100).toFixed(0)}% of original. Consider alternate tooling.`);
    }

    // Generate Okuma update lines
    updates.push(`( BORING BAR SUBSTITUTION: ${input.original_bar_dia}" -> ${input.new_bar_dia}" )`);
    updates.push(`( L/D RATIO: ${origLD.toFixed(1)} -> ${newLD.toFixed(1)} )`);
    if (newFeed !== input.original_feed) {
      updates.push(`( FEED ADJUSTED: ${input.original_feed} -> ${newFeed} [${(feedScale * 100).toFixed(0)}%] )`);
    }
    if (newDoc !== input.original_doc) {
      updates.push(`( DOC ADJUSTED: ${input.original_doc} -> ${newDoc} [${(docScale * 100).toFixed(0)}%] )`);
    }

    log.info(`[ToolSubstitution] Boring bar: ${input.original_bar_dia}->${input.new_bar_dia}, L/D: ${origLD.toFixed(1)}->${newLD.toFixed(1)}, feed scale: ${(feedScale * 100).toFixed(0)}%`);

    return {
      new_feed: newFeed,
      new_doc: newDoc,
      new_max_rpm: newMaxRPM,
      original_ld: Math.round(origLD * 10) / 10,
      new_ld: Math.round(newLD * 10) / 10,
      feed_scale: Math.round(feedScale * 1000) / 1000,
      doc_scale: Math.round(docScale * 1000) / 1000,
      safe,
      warnings,
      okuma_updates: updates,
    };
  }

  /**
   * Recalculate parameters after drill substitution.
   *
   * Rules:
   *   - Feed scales with sqrt(diameter ratio) — larger drill can take more feed
   *   - RPM recalculated from SFM and new diameter
   *   - Peck schedule: 1xD first peck, 0.5xD subsequent (steel)
   *   - Point depth: D/2 * tan((180 - point_angle)/2)
   */
  substituteDrill(input: DrillSubInput): DrillSubResult {
    const warnings: string[] = [];
    const updates: string[] = [];
    const pointAngle = input.point_angle ?? 118;

    // Feed scales with sqrt(diameter ratio) — Sandvik recommendation
    const diaRatio = input.new_dia / input.original_dia;
    const feedScale = Math.sqrt(diaRatio);
    const newFeed = Math.round(input.original_feed * feedScale * 10000) / 10000;

    // RPM from SFM and new diameter
    let newRPM: number;
    if (input.unit_system === "imperial") {
      newRPM = Math.round(input.sfm * IMPERIAL_RPM_FACTOR / input.new_dia);
    } else {
      newRPM = rpmFromVc(input.sfm, input.new_dia);
    }

    // Point depth: half of drill tip cone height
    // point_depth = (D/2) / tan(point_angle/2)
    const halfAngleRad = (pointAngle / 2) * Math.PI / 180;
    const pointDepth = Math.round((input.new_dia / 2) / Math.tan(halfAngleRad) * 10000) / 10000;

    const totalDepthWithPoint = Math.round((input.hole_depth + pointDepth) * 10000) / 10000;

    // Peck schedule
    const isNonFerrous = input.material_group === "N" || input.material_group === "K";
    const minPeck = input.unit_system === "imperial" ? 0.020 : 0.5;
    const firstMult = isNonFerrous ? 1.5 : 1.0;
    const subMult = isNonFerrous ? 1.0 : 0.5;

    const peckSchedule: number[] = [];
    let remaining = input.hole_depth;
    const firstPeck = Math.max(input.new_dia * firstMult, minPeck);
    const subPeck = Math.max(input.new_dia * subMult, minPeck);

    const p1 = Math.min(firstPeck, remaining);
    peckSchedule.push(Math.round(p1 * 10000) / 10000);
    remaining -= p1;
    while (remaining > minPeck) {
      const p = Math.min(subPeck, remaining);
      peckSchedule.push(Math.round(p * 10000) / 10000);
      remaining -= p;
    }
    if (remaining > 0.0001) {
      peckSchedule.push(Math.round(remaining * 10000) / 10000);
    }

    // Warnings
    if (input.new_dia > input.original_dia * 1.5) {
      warnings.push(`Drill size increased by ${((diaRatio - 1) * 100).toFixed(0)}%. Verify pilot hole is adequate.`);
    }
    if (input.hole_depth / input.new_dia > 5) {
      warnings.push(`Depth/Diameter ratio = ${(input.hole_depth / input.new_dia).toFixed(1)}. Consider gun drill or coolant-through.`);
    }

    updates.push(`( DRILL SUBSTITUTION: ${input.original_dia} -> ${input.new_dia} )`);
    updates.push(`( NEW RPM = ${newRPM}, FEED = ${newFeed} )`);
    updates.push(`( PECK: ${peckSchedule.map(p => p.toFixed(4)).join(", ")} )`);
    updates.push(`( POINT DEPTH = ${pointDepth}, TOTAL = ${totalDepthWithPoint} )`);

    log.info(`[ToolSubstitution] Drill: ${input.original_dia}->${input.new_dia}, RPM=${newRPM}, feed scale=${(feedScale * 100).toFixed(0)}%`);

    return {
      new_feed: newFeed,
      new_rpm: newRPM,
      peck_schedule: peckSchedule,
      point_depth: pointDepth,
      total_depth_with_point: totalDepthWithPoint,
      feed_scale: Math.round(feedScale * 1000) / 1000,
      warnings,
      okuma_updates: updates,
    };
  }

  /**
   * Recalculate finish feed after insert nose radius change.
   *
   * Brammertz kinematic roughness:
   *   Ra = f^2 / (32 * r_nose) * 1000  [um]
   *   f = sqrt(Ra * 32 * r_nose / 1000) [mm]
   */
  substituteInsert(input: InsertSubInput): InsertSubResult {
    const warnings: string[] = [];
    const updates: string[] = [];

    // Convert to mm for calculation
    const origR_mm = input.unit_system === "imperial" ? input.original_radius * 25.4 : input.original_radius;
    const newR_mm = input.unit_system === "imperial" ? input.new_radius * 25.4 : input.new_radius;
    const origFeed_mm = input.unit_system === "imperial" ? input.original_feed * 25.4 : input.original_feed;

    // Predict Ra with original feed + new radius
    const raOriginalFeed = predictedRa(origFeed_mm, newR_mm);

    // Calculate new feed for target Ra with new radius
    const newFeed_mm = Math.sqrt(input.target_ra_um * 32 * newR_mm / 1000);
    const newFeed = input.unit_system === "imperial"
      ? Math.round(newFeed_mm / 25.4 * 10000) / 10000
      : Math.round(newFeed_mm * 10000) / 10000;

    // Predict Ra with new feed + new radius
    const raNewFeed = predictedRa(newFeed_mm, newR_mm);

    const feedScale = input.original_feed > 0
      ? Math.round(newFeed / input.original_feed * 1000) / 1000
      : 1;

    const radiusIncreased = input.new_radius > input.original_radius;

    // Warnings
    if (raOriginalFeed > input.target_ra_um * 1.5) {
      warnings.push(`Original feed with new radius gives Ra=${raOriginalFeed.toFixed(2)}um — ${((raOriginalFeed / input.target_ra_um - 1) * 100).toFixed(0)}% above target. Feed MUST be reduced.`);
    }
    if (!radiusIncreased && input.new_radius < input.original_radius * 0.5) {
      warnings.push(`Nose radius reduced by more than 50%. Significant feed reduction required for same finish.`);
    }

    updates.push(`( INSERT SUBSTITUTION: R${input.original_radius} -> R${input.new_radius} )`);
    updates.push(`( TARGET Ra = ${input.target_ra_um} um )`);
    updates.push(`( FEED ADJUSTED: ${input.original_feed} -> ${newFeed} [${(feedScale * 100).toFixed(0)}%] )`);
    updates.push(`( PREDICTED Ra = ${raNewFeed.toFixed(2)} um )`);

    log.info(`[ToolSubstitution] Insert: R${input.original_radius}->R${input.new_radius}, feed: ${input.original_feed}->${newFeed}, Ra=${raNewFeed.toFixed(2)}um`);

    return {
      new_feed: newFeed,
      predicted_ra_original_feed: Math.round(raOriginalFeed * 100) / 100,
      predicted_ra_new_feed: Math.round(raNewFeed * 100) / 100,
      feed_scale: feedScale,
      radius_increased: radiusIncreased,
      warnings,
      okuma_updates: updates,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /** L/D-based feed factor (Sandvik Coromant boring bar guidelines) */
  private _ldFeedFactor(ld: number): number {
    if (ld <= 3) return 1.0;
    if (ld <= 4) return 0.75;
    if (ld <= 5) return 0.50;
    if (ld <= 6) return 0.25;
    return 0.15;
  }
}

export const toolSubstitutionEngine = new ToolSubstitutionEngine();
