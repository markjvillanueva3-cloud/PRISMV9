/**
 * Feed Rate Optimization Engine
 *
 * Engagement-aware feed rate calculations for constant chip load machining.
 * Builds on AdvancedChipThicknessEngine and EngagementGeometryEngine.
 *
 * Features:
 * - Engagement-based feed adjustment (maintain target chip thickness)
 * - Corner feed reduction (arc interpolation correction)
 * - Constant chip load feed modulation
 * - Power/torque-limited feed capping
 * - Material-specific feed limits
 * - Acceleration-aware feed profiling
 *
 * Sources:
 * - SolidCAM iMachining patent (US8000834B2)
 * - Sandvik Coromant Technical Guide: Feed Rate Optimization
 * - Altintas, Y. "Manufacturing Automation" (2012)
 * - MDPI Mathematics 2021: "Trochoidal Milling Path with Variable Feed"
 *
 * @module engines/FeedRateOptimizationEngine
 */

import { log } from "../utils/Logger.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ── Material feed multipliers (relative to steel baseline) ──────────
const MATERIAL_FEED_FACTORS: Record<string, { roughing: number; finishing: number; max_fz_mm: number }> = {
  aluminum:       { roughing: 1.8, finishing: 1.5, max_fz_mm: 0.25 },
  brass:          { roughing: 1.5, finishing: 1.3, max_fz_mm: 0.20 },
  copper:         { roughing: 1.3, finishing: 1.1, max_fz_mm: 0.18 },
  cast_iron:      { roughing: 1.2, finishing: 1.0, max_fz_mm: 0.20 },
  mild_steel:     { roughing: 1.0, finishing: 1.0, max_fz_mm: 0.15 },
  alloy_steel:    { roughing: 0.9, finishing: 0.85, max_fz_mm: 0.12 },
  stainless:      { roughing: 0.7, finishing: 0.65, max_fz_mm: 0.10 },
  titanium:       { roughing: 0.5, finishing: 0.45, max_fz_mm: 0.08 },
  inconel:        { roughing: 0.35, finishing: 0.30, max_fz_mm: 0.06 },
  hardened_steel: { roughing: 0.4, finishing: 0.35, max_fz_mm: 0.05 },
};

// ── Types ─────────────────────────────────────────────────────────

export interface FeedOptimizationInput {
  base_feed_per_tooth: number;        // mm/tooth (fz)
  tool_diameter: number;              // mm (Dc)
  number_of_flutes: number;           // z
  spindle_rpm: number;                // n
  radial_depth: number;               // mm (ae)
  axial_depth: number;                // mm (ap)
  material?: string;                  // material key
  operation?: "roughing" | "finishing" | "semi_finishing";
  spindle_power_kw?: number;          // available power
  specific_cutting_force?: number;    // kc1.1 (N/mm²)
  max_acceleration_mm_s2?: number;    // machine accel limit (explicit override)
  rapid_traverse_mm_min?: number;     // machine rapid traverse limit (explicit override)
  target_chip_thickness?: number;     // mm (override)
  machine_id?: string;                // auto-resolve accel/rapid from MachineCapabilityIntelligenceEngine
}

export interface FeedOptimizationResult {
  nominal_feed_rate: number;          // mm/min (Vf)
  optimized_feed_rate: number;        // mm/min (adjusted)
  feed_per_tooth_adjusted: number;    // mm/tooth
  chip_thinning_factor: number;
  engagement_angle_deg: number;
  power_utilization_pct: number;
  is_power_limited: boolean;
  is_accel_limited: boolean;
  material_factor: number;
  warnings: string[];
}

export interface CornerFeedInput {
  straight_feed: number;              // mm/min
  arc_radius: number;                 // mm (workpiece arc radius)
  tool_diameter: number;              // mm
  is_internal: boolean;               // internal = concave pocket wall
}

export interface CornerFeedResult {
  adjusted_feed: number;              // mm/min
  feed_factor: number;                // multiplier
  effective_ae_factor: number;        // how ae changes in arc
  reason: string;
}

export interface FeedProfilePoint {
  position: number;                   // mm along path
  feed_rate: number;                  // mm/min
  engagement_deg: number;
  chip_thickness: number;             // mm
  reason: string;
}

export interface FeedProfileResult {
  points: FeedProfilePoint[];
  min_feed: number;
  max_feed: number;
  avg_feed: number;
  total_time_s: number;
}

export interface ConstantChipLoadInput {
  target_chip_mm: number;
  tool_diameter: number;
  number_of_flutes: number;
  spindle_rpm: number;
  engagement_profile: Array<{ position: number; engagement_deg: number }>;
}

export interface ConstantChipLoadResult {
  feed_profile: Array<{ position: number; feed_mm_min: number; fz_mm: number }>;
  min_feed: number;
  max_feed: number;
  chip_variation_pct: number;
}

// ── Engine ────────────────────────────────────────────────────────

export class FeedRateOptimizationEngine {

  /**
   * Optimize feed rate based on engagement, power, and material limits.
   */
  optimize(input: FeedOptimizationInput): FeedOptimizationResult {
    let {
      base_feed_per_tooth: fz,
      tool_diameter: Dc,
      number_of_flutes: z,
      spindle_rpm: n,
      radial_depth: ae,
      axial_depth: ap,
      material = "mild_steel",
      operation = "roughing",
      spindle_power_kw,
      specific_cutting_force: kc1_1,
      max_acceleration_mm_s2,
      rapid_traverse_mm_min,
      target_chip_thickness,
    } = input;

    // Auto-resolve axis limits from MachineCapabilityIntelligenceEngine if machine_id provided
    if (input.machine_id && (max_acceleration_mm_s2 == null || rapid_traverse_mm_min == null)) {
      try {
        const capMod = require("./MachineCapabilityIntelligenceEngine.js");
        const hbkMod = require("./MachineHandbookRegistryEngine.js");
        const tcMod = require("../data/machine-torque-curves.js");
        const scMod = require("../data/machine-spindle-corrections.js");
        let machReg: any = null;
        try { machReg = require("../registries/MachineRegistry.js").machineRegistry; } catch { /* ok */ }

        const machId = input.machine_id.toLowerCase().trim().replace(/[\s-]+/g, "_");
        const profile = capMod.machineCapabilityIntelligenceEngine.getProfile(
          { machine_id: machId, include_torque_curve: false },
          {
            handbookRegistry: hbkMod.machineHandbookRegistry,
            torqueCurves: tcMod.MACHINE_TORQUE_CURVES,
            spindleCorrections: scMod.SPINDLE_CORRECTIONS,
            machineRegistry: machReg?.loaded ? machReg : null,
          },
        );
        if (profile?.axes?.length > 0) {
          // Use minimum axis accel across X/Y/Z (the cutting axes) as the limiting factor
          const cuttingAxes = profile.axes.filter((a: any) => ["X", "Y", "Z"].includes(a.name));
          if (max_acceleration_mm_s2 == null) {
            const accels = cuttingAxes
              .map((a: any) => a.accel_m_s2?.value)
              .filter((v: any): v is number => v != null && v > 0);
            if (accels.length > 0) {
              max_acceleration_mm_s2 = Math.min(...accels) * 1000; // m/s² → mm/s²
            }
          }
          if (rapid_traverse_mm_min == null) {
            const rapids = cuttingAxes
              .map((a: any) => a.rapid_mm_min?.value)
              .filter((v: any): v is number => v != null && v > 0);
            if (rapids.length > 0) {
              rapid_traverse_mm_min = Math.min(...rapids);
            }
          }
        }
      } catch { /* capability engine not available — fall through */ }
    }

    const warnings: string[] = [];
    const R = Dc / 2;
    const engRatio = Math.min(ae / Dc, 1.0);

    // Engagement angle
    const engAngleRad = Math.acos(Math.max(-1, 1 - 2 * engRatio));
    const engAngleDeg = engAngleRad * 180 / Math.PI;

    // Chip thinning factor
    const chipThinFactor = engRatio < 0.5
      ? Math.min(1 / Math.sqrt(engRatio), 2.5)
      : 1.0;

    // Material factor
    const matData = MATERIAL_FEED_FACTORS[material] ?? MATERIAL_FEED_FACTORS.mild_steel;
    const matFactor = operation === "finishing" ? matData.finishing : matData.roughing;

    // Adjusted fz considering chip thinning + material
    let adjustedFz = fz * chipThinFactor * matFactor;

    // Cap at material max
    if (adjustedFz > matData.max_fz_mm) {
      warnings.push(`Feed ${adjustedFz.toFixed(3)} mm/tooth exceeds material max ${matData.max_fz_mm} mm — capped`);
      adjustedFz = matData.max_fz_mm;
    }

    // Target chip thickness override
    if (target_chip_thickness != null) {
      const sinEng = Math.sin(engAngleRad);
      if (sinEng > 0.001) {
        adjustedFz = target_chip_thickness / sinEng;
      }
    }

    // Nominal and optimized feed rates
    const nominalVf = n * z * fz;
    let optimizedVf = n * z * adjustedFz;

    // Power check
    let powerUtilPct = 0;
    let isPowerLimited = false;
    if (spindle_power_kw != null && kc1_1 != null) {
      const hm = adjustedFz * Math.sqrt(engRatio); // average chip thickness
      const kc = kc1_1 * Math.pow(Math.max(hm, 0.01), -0.25); // approximate mc=0.25
      const Fc = kc * ap * hm; // cutting force per tooth
      const totalForce = Fc * Math.max(1, z * engAngleRad / (2 * Math.PI));
      const Vc = Math.PI * Dc * n / 1000;
      const requiredPower = (totalForce * Vc) / (60 * 1000); // kW
      powerUtilPct = (requiredPower / spindle_power_kw) * 100;

      if (powerUtilPct > 95) {
        const reduction = 95 / powerUtilPct;
        optimizedVf *= reduction;
        adjustedFz *= reduction;
        isPowerLimited = true;
        warnings.push(`Power limited: ${powerUtilPct.toFixed(0)}% → reduced to 95%`);
        powerUtilPct = 95;
      }
    }

    // Acceleration check for very high feed rates
    let isAccelLimited = false;
    if (max_acceleration_mm_s2 != null) {
      const feedMmPerSec = optimizedVf / 60;
      // At small arc radii, centripetal accel = v²/r
      // For straight lines, check if feed ramp-up distance is reasonable
      const minArcRadius = Dc; // approximate minimum expected arc
      const centripetalAccel = (feedMmPerSec * feedMmPerSec) / minArcRadius;
      if (centripetalAccel > max_acceleration_mm_s2 * 0.8) {
        const maxFeedMmS = Math.sqrt(max_acceleration_mm_s2 * 0.8 * minArcRadius);
        const maxVf = maxFeedMmS * 60;
        if (optimizedVf > maxVf) {
          optimizedVf = maxVf;
          adjustedFz = optimizedVf / (n * z);
          isAccelLimited = true;
          warnings.push(`Accel limited at arc R=${minArcRadius.toFixed(0)}mm`);
        }
      }
    }

    // Rapid traverse limit: feed rate cannot exceed machine rapid traverse
    if (rapid_traverse_mm_min != null && optimizedVf > rapid_traverse_mm_min * 0.95) {
      const maxVf = rapid_traverse_mm_min * 0.95; // 5% safety margin below rapid
      optimizedVf = maxVf;
      adjustedFz = optimizedVf / (n * z);
      warnings.push(`Feed capped at 95% rapid traverse (${rapid_traverse_mm_min} mm/min)`);
    }

    log.debug(`[FeedOpt] Dc=${Dc}, ae=${ae}, fz=${fz}→${adjustedFz.toFixed(4)}, thin=${chipThinFactor.toFixed(2)}, Vf=${optimizedVf.toFixed(0)}`);

    const result: FeedOptimizationResult = {
      nominal_feed_rate: Math.round(nominalVf),
      optimized_feed_rate: Math.round(optimizedVf),
      feed_per_tooth_adjusted: Math.round(adjustedFz * 10000) / 10000,
      chip_thinning_factor: Math.round(chipThinFactor * 1000) / 1000,
      engagement_angle_deg: Math.round(engAngleDeg * 10) / 10,
      power_utilization_pct: Math.round(powerUtilPct * 10) / 10,
      is_power_limited: isPowerLimited,
      is_accel_limited: isAccelLimited,
      material_factor: Math.round(matFactor * 1000) / 1000,
      warnings,
    };

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["material_tip", "toolpath_strategy", "roughing"],
      spindle_rpm: n,
      operation_type: operation === "finishing" ? "finishing" : "roughing",
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        result.warnings.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return result;
  }

  /**
   * Corner/arc feed adjustment.
   * Internal arcs (pocket walls): ae increases → reduce feed.
   * External arcs (boss/island): ae decreases → can increase feed.
   * Formula: F_corner = F_straight × (2R_arc ∓ D_tool) / (2R_arc)
   */
  cornerFeed(input: CornerFeedInput): CornerFeedResult {
    const { straight_feed, arc_radius, tool_diameter, is_internal } = input;

    if (arc_radius <= 0) {
      return {
        adjusted_feed: straight_feed * 0.5,
        feed_factor: 0.5,
        effective_ae_factor: 2.0,
        reason: "Zero/negative arc radius — emergency feed reduction",
      };
    }

    let factor: number;
    let aeFactor: number;
    let reason: string;

    if (is_internal) {
      // Internal arc: tool wraps around concave wall, effective ae increases
      // F = F_straight × (2R - D) / (2R)
      const denom = 2 * arc_radius;
      factor = Math.max((denom - tool_diameter) / denom, 0.2);
      aeFactor = denom / Math.max(denom - tool_diameter, 0.1);
      reason = factor < 0.5
        ? `Tight internal arc (R=${arc_radius.toFixed(1)}mm) — significant feed reduction`
        : `Internal arc correction`;

      if (arc_radius < tool_diameter * 0.6) {
        reason = `CRITICAL: Arc radius ${arc_radius.toFixed(1)}mm < 60% tool diameter — consider trochoidal`;
      }
    } else {
      // External arc: tool follows convex wall, effective ae decreases
      // F = F_straight × (2R + D) / (2R)
      const denom = 2 * arc_radius;
      factor = Math.min((denom + tool_diameter) / denom, 1.5);
      aeFactor = denom / (denom + tool_diameter);
      reason = "External arc — feed can increase";
    }

    return {
      adjusted_feed: Math.round(straight_feed * factor),
      feed_factor: Math.round(factor * 1000) / 1000,
      effective_ae_factor: Math.round(aeFactor * 1000) / 1000,
      reason,
    };
  }

  /**
   * Generate feed profile for constant chip load along a path with varying engagement.
   */
  constantChipLoad(input: ConstantChipLoadInput): ConstantChipLoadResult {
    const { target_chip_mm, tool_diameter, number_of_flutes, spindle_rpm, engagement_profile } = input;

    const feedProfile: ConstantChipLoadResult["feed_profile"] = [];
    let minFeed = Infinity;
    let maxFeed = 0;

    for (const pt of engagement_profile) {
      const engRad = (pt.engagement_deg * Math.PI) / 180;
      const sinEng = Math.sin(engRad);

      // fz = target_chip / sin(engagement)
      const fz = sinEng > 0.01 ? target_chip_mm / sinEng : target_chip_mm * 2.5;
      const cappedFz = Math.min(fz, target_chip_mm * 2.5); // cap at 2.5x
      const feedMmMin = Math.round(cappedFz * number_of_flutes * spindle_rpm);

      feedProfile.push({
        position: pt.position,
        feed_mm_min: feedMmMin,
        fz_mm: Math.round(cappedFz * 10000) / 10000,
      });

      if (feedMmMin < minFeed) minFeed = feedMmMin;
      if (feedMmMin > maxFeed) maxFeed = feedMmMin;
    }

    // Chip variation: how much does actual chip differ from target?
    const chipVariation = maxFeed > 0 ? ((maxFeed - minFeed) / maxFeed) * 100 : 0;

    return {
      feed_profile: feedProfile,
      min_feed: minFeed === Infinity ? 0 : minFeed,
      max_feed: maxFeed,
      chip_variation_pct: Math.round(chipVariation * 10) / 10,
    };
  }

  /**
   * Generate a feed profile along a straight path with specific events.
   * Events: corner approach, corner exit, entry, exit, steady-state.
   */
  generateFeedProfile(
    pathLength: number,
    steadyFeed: number,
    events: Array<{ position: number; type: "corner" | "entry" | "exit"; engagement_deg: number }>,
    toolDiameter: number,
    rampDistance?: number,
    cuttingKinematics?: {
      spindle_rpm?: number;
      number_of_flutes?: number;
      base_chip_load_mm?: number;
    },
  ): FeedProfileResult {
    const ramp = rampDistance ?? toolDiameter * 2;
    const points: FeedProfilePoint[] = [];
    let totalTime = 0;
    const nominalChipLoad = cuttingKinematics?.base_chip_load_mm
      ?? (
        cuttingKinematics?.spindle_rpm && cuttingKinematics?.number_of_flutes
          ? steadyFeed / (cuttingKinematics.number_of_flutes * cuttingKinematics.spindle_rpm)
          : this.estimateNominalChipLoad(toolDiameter)
      );

    // Build sorted event list
    const sortedEvents = [...events].sort((a, b) => a.position - b.position);

    // Sample every 1mm or at events
    const step = Math.max(1, pathLength / 200);
    for (let pos = 0; pos <= pathLength; pos += step) {
      let feed = steadyFeed;
      let engDeg = 0;
      let reason = "steady";

      // Entry ramp
      if (pos < ramp) {
        const rampFactor = 0.3 + 0.7 * (pos / ramp);
        feed = steadyFeed * rampFactor;
        reason = "entry_ramp";
      }

      // Exit ramp
      if (pos > pathLength - ramp) {
        const rampFactor = 0.3 + 0.7 * ((pathLength - pos) / ramp);
        feed = Math.min(feed, steadyFeed * rampFactor);
        reason = "exit_ramp";
      }

      // Event proximity
      for (const evt of sortedEvents) {
        const dist = Math.abs(pos - evt.position);
        if (dist < ramp) {
          engDeg = evt.engagement_deg;
          const proximity = 1 - dist / ramp;

          if (evt.type === "corner") {
            // Reduce feed approaching corner
            const cornerFactor = 1 - proximity * 0.5;
            feed = Math.min(feed, steadyFeed * cornerFactor);
            reason = `corner_${dist < step ? "at" : "approach"}`;
          }
        }
      }

      const effectiveEngagementDeg = engDeg > 0 ? engDeg : 90;
      const chipThickness = this.estimateChipThickness(
        feed,
        steadyFeed,
        nominalChipLoad,
        effectiveEngagementDeg,
      );
      points.push({
        position: Math.round(pos * 10) / 10,
        feed_rate: Math.round(feed),
        engagement_deg: Math.round(engDeg * 10) / 10,
        chip_thickness: Math.round(chipThickness * 10000) / 10000,
        reason,
      });

      // Time accumulation
      if (pos > 0 && feed > 0) {
        totalTime += (step / feed) * 60; // seconds
      }
    }

    const feeds = points.map(p => p.feed_rate);

    return {
      points,
      min_feed: Math.min(...feeds),
      max_feed: Math.max(...feeds),
      avg_feed: Math.round(feeds.reduce((s, v) => s + v, 0) / feeds.length),
      total_time_s: Math.round(totalTime * 100) / 100,
    };
  }

  /**
   * Get material-specific feed limits.
   */
  getMaterialFeedLimits(material: string): { roughing: number; finishing: number; max_fz_mm: number } | null {
    return MATERIAL_FEED_FACTORS[material] ?? null;
  }

  private estimateNominalChipLoad(toolDiameter: number): number {
    const heuristicChipLoad = 0.012 * Math.sqrt(Math.max(toolDiameter, 1));
    return Math.max(0.02, Math.min(0.18, heuristicChipLoad));
  }

  private estimateChipThickness(
    feed: number,
    steadyFeed: number,
    nominalChipLoad: number,
    engagementDeg: number,
  ): number {
    const feedRatio = steadyFeed > 0 ? feed / steadyFeed : 1;
    const engagementRad = (Math.max(1, engagementDeg) * Math.PI) / 180;
    const engagementFactor = Math.max(0.15, Math.sin(engagementRad));
    return nominalChipLoad * feedRatio * engagementFactor;
  }

  /**
   * List all supported materials.
   */
  listMaterials(): string[] {
    return Object.keys(MATERIAL_FEED_FACTORS);
  }
}

export const feedRateOptimizationEngine = new FeedRateOptimizationEngine();
