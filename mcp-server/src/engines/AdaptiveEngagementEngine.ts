/**
 * AdaptiveEngagementEngine — Corner engagement control and feed adaptation.
 *
 * In pocket corners, radial engagement spikes from ae to full-slot (D).
 * This engine computes the engagement profile through corners and calculates
 * the feed reduction needed to maintain constant chip load and force.
 *
 * Uses: Geometric engagement model, Kienzle force, constant-force feed adaptation.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface CornerGeometry {
  type: "inside_90" | "inside_acute" | "inside_obtuse" | "slot_entry" | "pocket_entry";
  corner_radius_mm: number;
  approach_ae_mm: number;   // radial engagement before corner
  wall_angle_deg?: number;  // for non-90° corners
}

export interface EngagementInput {
  corners: CornerGeometry[];
  tool: {
    diameter_mm: number;
    flute_count: number;
    corner_radius_mm?: number;
  };
  cutting: {
    nominal_feed_mmmin: number;
    spindle_rpm: number;
    axial_depth_mm: number;
    nominal_chipload_mm: number;
  };
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    kc11_mpa?: number;
  };
  machine: {
    max_power_kw: number;
  };
  strategy: "constant_force" | "constant_chipload" | "constant_mrr";
}

export interface CornerProfile {
  corner_type: string;
  corner_radius_mm: number;
  peak_engagement_mm: number;
  peak_engagement_pct: number;
  engagement_ratio: number; // peak / nominal
  nominal_force_n: number;
  peak_force_n: number;
  force_spike_pct: number;
  recommended_feed_mmmin: number;
  feed_reduction_pct: number;
  deceleration_distance_mm: number;
  acceleration_distance_mm: number;
  corner_cycle_time_impact_pct: number;
}

export interface EngagementResult {
  corners: CornerProfile[];
  global_stats: {
    worst_force_spike_pct: number;
    avg_feed_reduction_pct: number;
    total_cycle_time_impact_pct: number;
    peak_force_n: number;
    peak_power_kw: number;
  };
  recommended_strategy: string;
  toolpath_modifications: string[];
}

// Import canonical Kienzle constants — never hardcode kc1.1 values
import { CANONICAL_KIENZLE } from "../physics/constants.js";
const KC11: Record<string, number> = Object.fromEntries(
  Object.entries(CANONICAL_KIENZLE).map(([k, v]) => [k, v.kc1_1])
);

export class AdaptiveEngagementEngine {
  compute(input: EngagementInput): AtomicValue<EngagementResult> {
    const { corners, tool, cutting, material, machine, strategy } = input;
    const kc11 = material.kc11_mpa || KC11[material.iso_group] || CANONICAL_KIENZLE.P.kc1_1;
    const mc = CANONICAL_KIENZLE[material.iso_group as keyof typeof CANONICAL_KIENZLE]?.mc ?? 0.25;
    const D = tool.diameter_mm;
    const R = D / 2;

    // Nominal force at approach engagement
    const nomHm = cutting.nominal_chipload_mm * Math.sqrt(cutting.nominal_feed_mmmin > 0
      ? corners[0]?.approach_ae_mm / D : 0.25);
    const nomForce = kc11 * cutting.axial_depth_mm * nomHm * Math.pow(Math.max(0.001, nomHm), -mc);

    const profiles: CornerProfile[] = [];

    for (const corner of corners) {
      // Calculate peak engagement in corner
      const peakAe = this.peakEngagement(corner, D);
      const peakPct = (peakAe / D) * 100;
      const engagementRatio = peakAe / corner.approach_ae_mm;

      // Peak force at corner
      const peakHm = cutting.nominal_chipload_mm * Math.sqrt(peakAe / D);
      const peakForce = kc11 * cutting.axial_depth_mm * peakHm * Math.pow(Math.max(0.001, peakHm), -mc);
      const forceSpike = ((peakForce - nomForce) / nomForce) * 100;

      // Calculate recommended feed based on strategy
      let recFeed: number;
      switch (strategy) {
        case "constant_force":
          // Reduce feed to keep force constant: F ∝ fz^(1-mc) * ae^((1-mc)/2)
          recFeed = cutting.nominal_feed_mmmin * Math.pow(corner.approach_ae_mm / peakAe, (1 - mc) / 2);
          break;
        case "constant_chipload":
          // Reduce feed to keep chipload constant (chip thinning inverse)
          recFeed = cutting.nominal_feed_mmmin * Math.sqrt(corner.approach_ae_mm / peakAe);
          break;
        case "constant_mrr":
          // Reduce feed proportionally to ae increase: MRR = ap * ae * f
          recFeed = cutting.nominal_feed_mmmin * (corner.approach_ae_mm / peakAe);
          break;
        default:
          recFeed = cutting.nominal_feed_mmmin * Math.pow(corner.approach_ae_mm / peakAe, 0.5);
      }

      const feedReduction = ((cutting.nominal_feed_mmmin - recFeed) / cutting.nominal_feed_mmmin) * 100;

      // Deceleration/acceleration distances (trapezoidal motion profile)
      const decelDist = this.transitionDistance(cutting.nominal_feed_mmmin, recFeed);
      const accelDist = decelDist; // symmetric

      // Corner arc length
      const cornerArcLen = corner.corner_radius_mm > 0
        ? Math.PI * corner.corner_radius_mm * 0.5 // 90° corner
        : D * 0.5; // sharp corner estimate
      const cornerTime = cornerArcLen / recFeed;
      const nominalTime = cornerArcLen / cutting.nominal_feed_mmmin;
      const timeImpact = nominalTime > 0 ? ((cornerTime - nominalTime) / nominalTime) * 100 : 0;

      profiles.push({
        corner_type: corner.type,
        corner_radius_mm: corner.corner_radius_mm,
        peak_engagement_mm: Math.round(peakAe * 100) / 100,
        peak_engagement_pct: Math.round(peakPct * 10) / 10,
        engagement_ratio: Math.round(engagementRatio * 100) / 100,
        nominal_force_n: Math.round(nomForce),
        peak_force_n: Math.round(peakForce),
        force_spike_pct: Math.round(forceSpike * 10) / 10,
        recommended_feed_mmmin: Math.round(recFeed),
        feed_reduction_pct: Math.round(feedReduction * 10) / 10,
        deceleration_distance_mm: Math.round(decelDist * 10) / 10,
        acceleration_distance_mm: Math.round(accelDist * 10) / 10,
        corner_cycle_time_impact_pct: Math.round(timeImpact * 10) / 10,
      });
    }

    // Global stats
    const worstSpike = Math.max(...profiles.map(p => p.force_spike_pct));
    const avgReduction = profiles.reduce((s, p) => s + p.feed_reduction_pct, 0) / Math.max(1, profiles.length);
    const totalTimeImpact = profiles.reduce((s, p) => s + p.corner_cycle_time_impact_pct, 0) / Math.max(1, profiles.length);
    const peakForce = Math.max(...profiles.map(p => p.peak_force_n));
    const vc = Math.PI * D * cutting.spindle_rpm / 1000;
    const peakPower = (peakForce * vc) / 60000;

    // Toolpath modification recommendations
    const mods: string[] = [];
    if (worstSpike > 100) {
      mods.push("Consider trochoidal milling or adaptive clearing to avoid full-slot engagement");
    }
    if (profiles.some(p => p.corner_radius_mm < D * 0.3)) {
      mods.push(`Corner radius < ${Math.round(D * 0.3)}mm — use smaller tool or roll-in arc entry`);
    }
    if (peakPower > machine.max_power_kw * 0.9) {
      mods.push("Peak power near machine limit — reduce axial depth or use constant-force strategy");
    }
    if (avgReduction > 40) {
      mods.push("High average feed reduction — consider morphed spiral or adaptive toolpath");
    }

    const recStrategy = worstSpike > 150 ? "constant_force (aggressive corners)"
      : worstSpike > 80 ? "constant_chipload (moderate corners)"
      : "constant_mrr (mild corners)";

    const result: EngagementResult = {
      corners: profiles,
      global_stats: {
        worst_force_spike_pct: Math.round(worstSpike * 10) / 10,
        avg_feed_reduction_pct: Math.round(avgReduction * 10) / 10,
        total_cycle_time_impact_pct: Math.round(totalTimeImpact * 10) / 10,
        peak_force_n: Math.round(peakForce),
        peak_power_kw: Math.round(peakPower * 100) / 100,
      },
      recommended_strategy: recStrategy,
      toolpath_modifications: mods,
    };

    return {
      value: result,
      unit: "engagement_profile",
      formula: "geometric_engagement+Kienzle_force+constant_force_feed",
      confidence: 0.82,
    };
  }

  private peakEngagement(corner: CornerGeometry, toolDia: number): number {
    const R = toolDia / 2;
    switch (corner.type) {
      case "inside_90": {
        if (corner.corner_radius_mm <= 0) return toolDia; // full slot
        // Peak ae = R + R - sqrt(2) * (corner_radius - R) when CR < R
        if (corner.corner_radius_mm < R) {
          return Math.min(toolDia, toolDia - (corner.corner_radius_mm * 0.29));
        }
        // For CR >= R, peak ae is less severe
        const overlap = R / corner.corner_radius_mm;
        return corner.approach_ae_mm * (1 + overlap);
      }
      case "inside_acute": {
        const angle = corner.wall_angle_deg || 60;
        const factor = 1 + (1 - angle / 90);
        return Math.min(toolDia, corner.approach_ae_mm * factor);
      }
      case "inside_obtuse": {
        const angle = corner.wall_angle_deg || 120;
        const factor = 1 + (1 - angle / 180) * 0.5;
        return corner.approach_ae_mm * factor;
      }
      case "slot_entry":
        return toolDia; // full slot
      case "pocket_entry":
        return toolDia * 0.8; // helical ramp typically ~80%
      default:
        return corner.approach_ae_mm * 1.5;
    }
  }

  private transitionDistance(fromFeed: number, toFeed: number): number {
    // Assume 0.5g deceleration capability
    const accel = 0.5 * 9810; // mm/s²
    const v1 = fromFeed / 60; // mm/s
    const v2 = toFeed / 60;
    return Math.abs(v1 * v1 - v2 * v2) / (2 * accel);
  }
}

export const adaptiveEngagementEngine = new AdaptiveEngagementEngine();
