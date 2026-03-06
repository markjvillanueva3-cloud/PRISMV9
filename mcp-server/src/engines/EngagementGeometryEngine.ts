/**
 * Engagement Geometry Engine
 *
 * Advanced engagement calculations for complex CAM geometries:
 * - Corner classification (sharp/filleted, internal/external, severity)
 * - Internal corner engagement spike prediction
 * - External corner engagement drop calculation
 * - Corner feed adjustment for constant chip load
 * - Curved boundary engagement correction (FCEOM principle)
 * - Constant engagement stepover (curvature-adaptive)
 * - Trochoidal engagement profile analysis
 * - Island approach / moating logic
 * - iMachining-style engagement validation (10-80 deg bounds)
 * - Optimal stepover finder (MRR vs tool life priority)
 *
 * Sources:
 * - US Patent 8000834B2: Engagement milling
 * - "Fast Constant Engagement Offsetting Method" (Int J Adv Manuf Tech 2019)
 * - "Constant Engagement Tool Path Generation" (Stori & Wright)
 * - Altintas, Y. "Manufacturing Automation" (2012)
 *
 * @module engines/EngagementGeometryEngine
 */

import { log } from "../utils/Logger.js";

// ── Constants ─────────────────────────────────────────────────────

const ENGAGEMENT_LIMITS = {
  MIN_DEG: 10,
  MAX_DEG: 80,
  OPTIMAL_DEG: 40,
  MAX_SPIKE_FACTOR: 2.0,
  CORNER_FEED_REDUCTION_THRESHOLD: 1.3,
  SHARP_CORNER_DEG: 15,
};

// ── Types ─────────────────────────────────────────────────────────

export interface CornerClassification {
  turn_angle_deg: number;
  is_internal: boolean;
  is_sharp: boolean;
  type: "GENTLE" | "MODERATE_SHARP" | "MODERATE_FILLETED" | "SHARP" | "FILLETED" | "VERY_SHARP" | "LARGE_FILLETED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requires_trochoidal: boolean;
  requires_feed_reduction: boolean;
}

export interface EngagementSpikeResult {
  spike_type: "NONE" | "MILD" | "MODERATE" | "SEVERE";
  spike_factor: number;
  peak_ae: number;
  peak_engagement_deg: number;
  feed_reduction_required: boolean;
  trochoidal_required: boolean;
  recommended_feed_factor: number;
}

export interface CornerFeedResult {
  nominal_feed: number;
  safe_feed: number;
  feed_factor: number;
  corner_type: "INTERNAL" | "EXTERNAL";
  was_limited: boolean;
}

export interface CurvedBoundaryResult {
  curvature_type: "STRAIGHT" | "CONVEX" | "CONCAVE" | "CONCAVE_IMPOSSIBLE";
  effective_ae: number;
  effective_engagement_deg: number;
  adjustment_factor: number;
  recommended_ae: number;
  error?: string;
}

export interface TrochoidalProfileResult {
  min_engagement_deg: number;
  max_engagement_deg: number;
  avg_engagement_deg: number;
  engagement_range_deg: number;
  point_count: number;
}

export interface IslandApproachResult {
  phase: "NORMAL" | "TRANSITION" | "ISLAND_CONTACT";
  effective_ae: number;
  effective_engagement_deg: number;
  moating_required: boolean;
  recommendation: string;
}

export interface EngagementValidation {
  engagement_deg: number;
  status: "TOO_LOW" | "ACCEPTABLE_LOW" | "OPTIMAL" | "ACCEPTABLE_HIGH" | "TOO_HIGH";
  is_valid: boolean;
}

export interface OptimalStepoverResult {
  optimal_stepover: number;
  stepover_percent: number;
  engagement_deg: number;
  is_valid: boolean;
}

export interface MoatSpec {
  minimum_width: number;
  optimal_width: number;
  thin_wall_threshold: number;
  moat_center_radius: number;
}

// ── Engine ────────────────────────────────────────────────────────

export class EngagementGeometryEngine {

  /** Engagement angle from stepover: alpha = arccos(1 - 2*ae/Dc) */
  engagementFromStepover(ae: number, Dc: number): number {
    const ratio = Math.min(ae / Dc, 1.0);
    if (ratio >= 1.0) return Math.PI;
    return Math.acos(1 - 2 * ratio);
  }

  /** Stepover from engagement angle: ae = (Dc/2) * (1 - cos(alpha)) */
  stepoverFromEngagement(engagementRad: number, Dc: number): number {
    if (engagementRad <= 0) return 0;
    if (engagementRad >= Math.PI) return Dc;
    return (Dc / 2) * (1 - Math.cos(engagementRad));
  }

  /** Classify a corner by turn angle and radius */
  classifyCorner(incomingAngleRad: number, outgoingAngleRad: number, cornerRadius: number = 0): CornerClassification {
    let turnAngle = outgoingAngleRad - incomingAngleRad;
    while (turnAngle > Math.PI) turnAngle -= 2 * Math.PI;
    while (turnAngle < -Math.PI) turnAngle += 2 * Math.PI;

    const absTurnDeg = Math.abs(turnAngle) * 180 / Math.PI;
    const isInternal = turnAngle > 0;
    const isSharp = cornerRadius < 0.001;

    let type: CornerClassification["type"];
    let severity: CornerClassification["severity"];

    if (absTurnDeg < ENGAGEMENT_LIMITS.SHARP_CORNER_DEG) {
      type = "GENTLE";
      severity = "LOW";
    } else if (absTurnDeg < 45) {
      type = isSharp ? "MODERATE_SHARP" : "MODERATE_FILLETED";
      severity = "MEDIUM";
    } else if (absTurnDeg < 90) {
      type = isSharp ? "SHARP" : "FILLETED";
      severity = "HIGH";
    } else {
      type = isSharp ? "VERY_SHARP" : "LARGE_FILLETED";
      severity = "CRITICAL";
    }

    return {
      turn_angle_deg: Math.round(turnAngle * 180 / Math.PI * 10) / 10,
      is_internal: isInternal,
      is_sharp: isSharp,
      type,
      severity,
      requires_trochoidal: isInternal && isSharp && absTurnDeg > 45,
      requires_feed_reduction: severity === "HIGH" || severity === "CRITICAL",
    };
  }

  /** Calculate engagement spike at internal corner */
  internalCornerSpike(nominalAe: number, Dc: number, turnAngleRad: number, cornerRadius: number = 0): EngagementSpikeResult {
    const R = Dc / 2;

    if (turnAngleRad <= 0) {
      return {
        spike_type: "NONE", spike_factor: 1.0, peak_ae: nominalAe,
        peak_engagement_deg: this.engagementFromStepover(nominalAe, Dc) * 180 / Math.PI,
        feed_reduction_required: false, trochoidal_required: false, recommended_feed_factor: 1.0,
      };
    }

    let peakAe: number;
    if (cornerRadius < R) {
      if (cornerRadius === 0) {
        peakAe = nominalAe + R * (1 - Math.cos(turnAngleRad));
      } else {
        const radiusRatio = cornerRadius / R;
        peakAe = nominalAe + R * (1 - Math.cos(turnAngleRad)) * (1 - radiusRatio);
      }
      peakAe = Math.min(peakAe, Dc);
    } else {
      const factor = 1.0 + 0.1 * (Math.abs(turnAngleRad) / (Math.PI / 2));
      peakAe = nominalAe * factor;
    }

    const spikeFactor = peakAe / nominalAe;
    const peakEng = this.engagementFromStepover(Math.min(peakAe, Dc), Dc);

    return {
      spike_type: spikeFactor > 1.5 ? "SEVERE" : spikeFactor > 1.2 ? "MODERATE" : "MILD",
      spike_factor: Math.round(spikeFactor * 1000) / 1000,
      peak_ae: Math.round(peakAe * 1000) / 1000,
      peak_engagement_deg: Math.round(peakEng * 180 / Math.PI * 10) / 10,
      feed_reduction_required: spikeFactor > ENGAGEMENT_LIMITS.CORNER_FEED_REDUCTION_THRESHOLD,
      trochoidal_required: spikeFactor > ENGAGEMENT_LIMITS.MAX_SPIKE_FACTOR,
      recommended_feed_factor: spikeFactor > 1 ? Math.round(1 / Math.sqrt(spikeFactor) * 1000) / 1000 : 1.0,
    };
  }

  /** Calculate engagement drop at external corner */
  externalCornerDrop(nominalAe: number, Dc: number, turnAngleRad: number): EngagementSpikeResult {
    if (turnAngleRad >= 0) return this.internalCornerSpike(nominalAe, Dc, turnAngleRad);

    const dropFactor = Math.cos(Math.abs(turnAngleRad) / 2);
    const minAe = nominalAe * dropFactor;
    const minEng = this.engagementFromStepover(minAe, Dc);

    return {
      spike_type: "NONE",
      spike_factor: Math.round(dropFactor * 1000) / 1000,
      peak_ae: Math.round(minAe * 1000) / 1000,
      peak_engagement_deg: Math.round(minEng * 180 / Math.PI * 10) / 10,
      feed_reduction_required: false,
      trochoidal_required: false,
      recommended_feed_factor: Math.round((1 / dropFactor) * 1000) / 1000,
    };
  }

  /** Corner feed adjustment for constant chip load */
  cornerFeedAdjustment(nominalFeed: number, nominalAe: number, Dc: number, turnAngleRad: number, cornerRadius: number = 0): CornerFeedResult {
    const analysis = turnAngleRad > 0
      ? this.internalCornerSpike(nominalAe, Dc, turnAngleRad, cornerRadius)
      : this.externalCornerDrop(nominalAe, Dc, turnAngleRad);

    const adjustedFeed = nominalFeed * analysis.recommended_feed_factor;
    const minFeed = nominalFeed * 0.3;
    const maxFeed = nominalFeed * 2.0;
    const safeFeed = Math.max(minFeed, Math.min(maxFeed, adjustedFeed));

    return {
      nominal_feed: nominalFeed,
      safe_feed: Math.round(safeFeed * 10) / 10,
      feed_factor: analysis.recommended_feed_factor,
      corner_type: turnAngleRad > 0 ? "INTERNAL" : "EXTERNAL",
      was_limited: safeFeed !== adjustedFeed,
    };
  }

  /** Curved boundary engagement correction (FCEOM principle) */
  curvedBoundaryEngagement(nominalAe: number, Dc: number, workpieceRadius: number): CurvedBoundaryResult {
    const R = Dc / 2;
    const nominalEng = this.engagementFromStepover(nominalAe, Dc) * 180 / Math.PI;

    if (Math.abs(workpieceRadius) < 0.001) {
      return {
        curvature_type: "STRAIGHT", effective_ae: nominalAe,
        effective_engagement_deg: nominalEng, adjustment_factor: 1.0, recommended_ae: nominalAe,
      };
    }

    const isConvex = workpieceRadius > 0;
    const absRadius = Math.abs(workpieceRadius);

    if (!isConvex && absRadius < R) {
      return {
        curvature_type: "CONCAVE_IMPOSSIBLE", effective_ae: 0,
        effective_engagement_deg: 0, adjustment_factor: 0, recommended_ae: 0,
        error: `Tool radius ${R} mm > concave radius ${absRadius} mm`,
      };
    }

    const radiusRatio = R / absRadius;
    let effectiveAe: number;

    if (isConvex) {
      effectiveAe = Math.min(nominalAe * (1 + radiusRatio), Dc);
    } else {
      effectiveAe = Math.max(nominalAe * (1 - radiusRatio), 0.001);
    }

    const effectiveEng = this.engagementFromStepover(Math.min(effectiveAe, Dc), Dc) * 180 / Math.PI;
    const adjFactor = effectiveAe / nominalAe;

    return {
      curvature_type: isConvex ? "CONVEX" : "CONCAVE",
      effective_ae: Math.round(effectiveAe * 1000) / 1000,
      effective_engagement_deg: Math.round(effectiveEng * 10) / 10,
      adjustment_factor: Math.round(adjFactor * 1000) / 1000,
      recommended_ae: Math.round((nominalAe / adjFactor) * 1000) / 1000,
    };
  }

  /** Constant engagement stepover adjusted for local curvature */
  constantEngagementStepover(targetEngagementRad: number, Dc: number, localCurvature: number): number {
    const baseStepover = this.stepoverFromEngagement(targetEngagementRad, Dc);
    if (Math.abs(localCurvature) < 0.0001) return baseStepover;

    const R = Dc / 2;
    const localRadius = 1 / Math.abs(localCurvature);
    const radiusRatio = R / localRadius;

    if (localCurvature > 0) {
      return baseStepover / (1 + radiusRatio);
    } else {
      return baseStepover * Math.min(1 / (1 - radiusRatio), 1.5);
    }
  }

  /** Analyze trochoidal loop engagement profile */
  trochoidalEngagementProfile(trochoidRadius: number, stepover: number, toolRadius: number, resolution: number = 36): TrochoidalProfileResult {
    const Dc = toolRadius * 2;
    let minEng = Infinity;
    let maxEng = 0;
    let sumEng = 0;
    const step = 2 * Math.PI / resolution;

    for (let i = 0; i < resolution; i++) {
      const angle = i * step;
      const baseWidth = stepover;
      const variationAmp = trochoidRadius * 0.3;
      const effectiveWidth = baseWidth + variationAmp * (1 + Math.cos(angle));
      const effectiveAe = Math.min(effectiveWidth, Dc);
      const eng = this.engagementFromStepover(effectiveAe, Dc) * 180 / Math.PI;

      if (eng < minEng) minEng = eng;
      if (eng > maxEng) maxEng = eng;
      sumEng += eng;
    }

    return {
      min_engagement_deg: Math.round(minEng * 10) / 10,
      max_engagement_deg: Math.round(maxEng * 10) / 10,
      avg_engagement_deg: Math.round((sumEng / resolution) * 10) / 10,
      engagement_range_deg: Math.round((maxEng - minEng) * 10) / 10,
      point_count: resolution,
    };
  }

  /** Analyze engagement when approaching an island */
  islandApproach(nominalAe: number, Dc: number, distanceToIsland: number, islandRadius: number): IslandApproachResult {
    const R = Dc / 2;

    if (distanceToIsland > Dc) {
      return {
        phase: "NORMAL", effective_ae: nominalAe,
        effective_engagement_deg: this.engagementFromStepover(nominalAe, Dc) * 180 / Math.PI,
        moating_required: false, recommendation: "Normal cutting",
      };
    }

    if (distanceToIsland > R) {
      const narrowFactor = distanceToIsland / Dc;
      const effectiveAe = Math.min(nominalAe / narrowFactor, Dc);
      return {
        phase: "TRANSITION", effective_ae: Math.round(effectiveAe * 1000) / 1000,
        effective_engagement_deg: Math.round(this.engagementFromStepover(effectiveAe, Dc) * 180 / Math.PI * 10) / 10,
        moating_required: false, recommendation: "Reduce stepover or feed rate",
      };
    }

    return {
      phase: "ISLAND_CONTACT", effective_ae: Math.round(distanceToIsland * 1000) / 1000,
      effective_engagement_deg: Math.round(this.engagementFromStepover(Math.min(distanceToIsland, Dc), Dc) * 180 / Math.PI * 10) / 10,
      moating_required: islandRadius > R * 2,
      recommendation: "Switch to island-following or moating strategy",
    };
  }

  /** Calculate moat specifications around an island */
  calculateMoat(Dc: number, targetEngagementRad: number, islandRadius: number): MoatSpec {
    const stepover = this.stepoverFromEngagement(targetEngagementRad, Dc);
    return {
      minimum_width: Dc,
      optimal_width: Math.round((Dc + stepover) * 1000) / 1000,
      thin_wall_threshold: Math.round(stepover * 2 * 1000) / 1000,
      moat_center_radius: Math.round((islandRadius + (Dc + stepover) / 2) * 1000) / 1000,
    };
  }

  /** Validate engagement against iMachining-style bounds (10-80 deg) */
  validateEngagement(engagementDeg: number): EngagementValidation {
    let status: EngagementValidation["status"];

    if (engagementDeg < ENGAGEMENT_LIMITS.MIN_DEG) {
      status = "TOO_LOW";
    } else if (engagementDeg > ENGAGEMENT_LIMITS.MAX_DEG) {
      status = "TOO_HIGH";
    } else if (Math.abs(engagementDeg - ENGAGEMENT_LIMITS.OPTIMAL_DEG) < 3) {
      status = "OPTIMAL";
    } else if (engagementDeg < ENGAGEMENT_LIMITS.OPTIMAL_DEG) {
      status = "ACCEPTABLE_LOW";
    } else {
      status = "ACCEPTABLE_HIGH";
    }

    return {
      engagement_deg: engagementDeg,
      status,
      is_valid: status !== "TOO_LOW" && status !== "TOO_HIGH",
    };
  }

  /** Find optimal stepover for given constraints */
  findOptimalStepover(Dc: number, opts: { prioritize_mrr?: boolean; prioritize_tool_life?: boolean; target_engagement_deg?: number } = {}): OptimalStepoverResult {
    const targetDeg = opts.target_engagement_deg ?? ENGAGEMENT_LIMITS.OPTIMAL_DEG;
    let engDeg = targetDeg;

    if (opts.prioritize_mrr) {
      engDeg = ENGAGEMENT_LIMITS.MAX_DEG * 0.85;
    } else if (opts.prioritize_tool_life) {
      engDeg = targetDeg * 0.7;
    }

    const engRad = engDeg * Math.PI / 180;
    const stepover = this.stepoverFromEngagement(engRad, Dc);
    const actualEngDeg = this.engagementFromStepover(stepover, Dc) * 180 / Math.PI;
    const validation = this.validateEngagement(actualEngDeg);

    return {
      optimal_stepover: Math.round(stepover * 1000) / 1000,
      stepover_percent: Math.round((stepover / Dc) * 1000) / 10,
      engagement_deg: Math.round(actualEngDeg * 10) / 10,
      is_valid: validation.is_valid,
    };
  }

  /** Curvature from 3 points (Menger curvature formula) */
  curvatureFromPoints(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): number {
    const a = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const b = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2);
    const c = Math.sqrt((p3.x - p1.x) ** 2 + (p3.y - p1.y) ** 2);
    const area = 0.5 * ((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y));
    const denom = a * b * c;
    if (denom < 1e-10) return 0;
    return 4 * area / denom;
  }
}

export const engagementGeometryEngine = new EngagementGeometryEngine();
