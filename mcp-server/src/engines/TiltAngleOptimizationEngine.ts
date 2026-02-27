/**
 * TiltAngleOptimizationEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Optimizes tool tilt/lead/lag angles for 5-axis surface machining.
 * Proper tilt angle prevents tool center cutting (zero-speed condition),
 * improves surface finish, and maximizes effective cutting speed.
 *
 * Models: effective cutter radius, scallop height vs tilt angle,
 * and interference-free angle ranges.
 *
 * Actions: tilt_optimize, tilt_analyze, tilt_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type TiltStrategy = "lead_only" | "tilt_only" | "lead_and_tilt" | "auto_optimal";

export interface TiltAngleInput {
  tool_type: "ball_nose" | "bull_nose" | "flat_end" | "barrel" | "lens";
  tool_diameter_mm: number;
  corner_radius_mm?: number;          // for bull nose
  barrel_radius_mm?: number;          // for barrel/lens cutters
  surface_normal: { i: number; j: number; k: number }; // surface normal at cut point
  surface_curvature_1_per_mm?: number; // max principal curvature
  step_over_mm: number;
  scallop_target_um: number;          // target scallop height
  strategy: TiltStrategy;
  max_tilt_deg?: number;              // machine limit
}

export interface TiltAngleResult {
  lead_angle_deg: number;             // tilt in feed direction
  tilt_angle_deg: number;             // tilt perpendicular to feed
  effective_radius_mm: number;
  scallop_height_um: number;
  effective_cutting_speed_pct: number; // % of nominal (100% = at equator)
  cusp_free: boolean;                 // no zero-speed zone in contact
  interference_free: boolean;
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TiltAngleOptimizationEngine {
  optimize(input: TiltAngleInput): TiltAngleResult {
    const R = input.tool_diameter_mm / 2;
    const rc = input.corner_radius_mm || 0;
    const maxTilt = input.max_tilt_deg || 30;

    // For ball nose: effective radius depends on tilt angle
    // At zero tilt: effective radius = 0 at tip (zero speed!)
    // At tilt angle θ: effective radius = R * sin(θ)

    let optimalLead = 0;
    let optimalTilt = 0;
    let bestEffectiveR = 0;
    let bestScallop = Infinity;

    if (input.strategy === "auto_optimal" || input.strategy === "lead_and_tilt") {
      // Search for optimal combination
      for (let lead = 1; lead <= maxTilt; lead += 0.5) {
        for (let tilt = 0; tilt <= maxTilt; tilt += 0.5) {
          const totalTilt = Math.sqrt(lead * lead + tilt * tilt);
          if (totalTilt > maxTilt) continue;

          const effR = this._effectiveRadius(input, totalTilt);
          const scallop = this._scallopHeight(effR, input.step_over_mm, input.surface_curvature_1_per_mm);

          if (scallop < bestScallop) {
            bestScallop = scallop;
            bestEffectiveR = effR;
            optimalLead = lead;
            optimalTilt = tilt;
          }
        }
      }
    } else if (input.strategy === "lead_only") {
      for (let lead = 1; lead <= maxTilt; lead += 0.5) {
        const effR = this._effectiveRadius(input, lead);
        const scallop = this._scallopHeight(effR, input.step_over_mm, input.surface_curvature_1_per_mm);
        if (scallop < bestScallop) {
          bestScallop = scallop;
          bestEffectiveR = effR;
          optimalLead = lead;
        }
      }
    } else {
      for (let tilt = 1; tilt <= maxTilt; tilt += 0.5) {
        const effR = this._effectiveRadius(input, tilt);
        const scallop = this._scallopHeight(effR, input.step_over_mm, input.surface_curvature_1_per_mm);
        if (scallop < bestScallop) {
          bestScallop = scallop;
          bestEffectiveR = effR;
          optimalTilt = tilt;
        }
      }
    }

    // Effective cutting speed: ratio of effective radius to tool radius
    const speedPct = R > 0 ? (bestEffectiveR / R) * 100 : 0;

    // Zero-speed check
    const totalAngle = Math.sqrt(optimalLead ** 2 + optimalTilt ** 2);
    const cuspFree = totalAngle >= 1.0; // at least 1° tilt avoids zero-speed

    // Interference check (simplified: tool body doesn't gouge surface)
    const interferenceFree = totalAngle <= maxTilt;

    // Recommendations
    const recs: string[] = [];
    if (input.tool_type === "ball_nose" && totalAngle < 1) {
      recs.push("Ball nose at zero tilt has zero-speed zone — add minimum 3° lead angle");
    }
    if (bestScallop > input.scallop_target_um) {
      recs.push(`Scallop ${bestScallop.toFixed(1)}µm exceeds target ${input.scallop_target_um}µm — reduce step-over to ${(input.step_over_mm * input.scallop_target_um / bestScallop).toFixed(2)}mm`);
    }
    if (input.tool_type === "barrel" && totalAngle < 5) {
      recs.push("Barrel cutter needs minimum 5° tilt to engage tangent radius effectively");
    }
    if (speedPct < 30) {
      recs.push("Effective cutting speed < 30% — poor surface finish expected, increase tilt");
    }
    if (recs.length === 0) {
      recs.push("Tilt angles optimized — proceed with toolpath generation");
    }

    return {
      lead_angle_deg: Math.round(optimalLead * 10) / 10,
      tilt_angle_deg: Math.round(optimalTilt * 10) / 10,
      effective_radius_mm: Math.round(bestEffectiveR * 100) / 100,
      scallop_height_um: Math.round(bestScallop * 10) / 10,
      effective_cutting_speed_pct: Math.round(speedPct * 10) / 10,
      cusp_free: cuspFree,
      interference_free: interferenceFree,
      recommendations: recs,
    };
  }

  private _effectiveRadius(input: TiltAngleInput, tiltDeg: number): number {
    const tiltRad = tiltDeg * Math.PI / 180;
    const R = input.tool_diameter_mm / 2;

    switch (input.tool_type) {
      case "ball_nose":
        // Effective radius = R * sin(tilt)
        return R * Math.sin(tiltRad);
      case "bull_nose": {
        const rc = input.corner_radius_mm || 0;
        // Effective radius at tilt = (R - rc) + rc * sin(tilt)
        return (R - rc) + rc * Math.sin(tiltRad);
      }
      case "barrel": {
        const Rb = input.barrel_radius_mm || R * 10;
        // Barrel cutter: tangent contact at tilt angle
        return Rb * Math.sin(tiltRad);
      }
      case "lens":
        return (input.barrel_radius_mm || R * 5) * Math.sin(tiltRad);
      case "flat_end":
        // Flat end: effective radius is constant but tilt creates elliptical contact
        return R / Math.cos(tiltRad);
      default:
        return R * Math.sin(tiltRad);
    }
  }

  private _scallopHeight(effectiveR: number, stepOver: number, curvature?: number): number {
    if (effectiveR <= 0) return 99999; // infinite scallop at zero radius
    // Scallop height h = R_eff - sqrt(R_eff² - (ae/2)²)
    const halfStep = stepOver / 2;
    if (halfStep >= effectiveR) return effectiveR * 1000; // step-over too large
    const h = effectiveR - Math.sqrt(effectiveR ** 2 - halfStep ** 2);
    // Surface curvature correction
    const curvCorr = curvature ? 1 + curvature * effectiveR * 0.5 : 1.0;
    return h * curvCorr * 1000; // convert mm to µm
  }
}

export const tiltAngleOptimizationEngine = new TiltAngleOptimizationEngine();
