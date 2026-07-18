/**
 * LathePrintSetupSelectionEngine — U-LTH38 (LATHE-MASTER P4)
 *
 * Selects chuck jaws, tailstock engagement, steady rest placement based on
 * part geometry + cutting forces + tolerance targets.
 *
 * Physics:
 *   - Required grip force: F_grip = (Fc · L) / (μ · N_jaws · R_chuck) · SF
 *   - L/D ratio thresholds: <3 chuck only, 3-8 tailstock, >8 steady rest
 *   - Chip accumulation → sub-spindle pickup at ~80% bar length consumed
 *
 * Citations:
 *   - Machinery's Handbook 31st ed. (workholding forces)
 *   - Sandvik Coromant: Turning Application Guide (jaw friction coefficients)
 *   - Mitsubishi Hitachi: Long-parts turning practice (steady rest rules)
 *
 * @milestone LATHE-MASTER U-LTH38
 * @version 1.0.0
 */

import { z } from "zod";
import type { FeatureInput, MaterialInput } from "./LathePrintFeatureStrategySelectorEngine.js";
import type { SequencePlan } from "./LathePrintSequencePlannerEngine.js";

// ============================================================================
// PHYSICS CONSTANTS (workholding)
// ============================================================================

/** Friction coefficients for chuck jaws (Machinery's Handbook 31st) */
const JAW_FRICTION_COEFFICIENT = {
  serrated_hard: 0.25,
  serrated_soft: 0.20,
  smooth_hard: 0.15,
  smooth_soft: 0.12,
  diamond_soft: 0.30,
} as const;

/** Grip safety factors */
const GRIP_SAFETY_FACTOR = {
  roughing: 2.5,
  finishing: 2.0,
  drilling: 2.0,
  parting: 3.0,
  threading: 2.5,
  default: 2.0,
} as const;

/** L/D ratio thresholds */
const LD_CHUCK_ONLY_MAX = 3.0;      // below → chuck only
const LD_TAILSTOCK_MAX = 8.0;        // 3-8 → add tailstock
// above 8 → requires steady rest

/** Tailstock engagement force (N) — typical for 200-400mm lathes */
const TAILSTOCK_FORCE_MIN_N = 500;
const TAILSTOCK_FORCE_MAX_N = 12000;

/** Steady rest placement ratio: position at 60-70% of length from chuck */
const STEADY_REST_POSITION_RATIO = 0.65;

// ============================================================================
// SCHEMAS
// ============================================================================

export const PartGeometrySchema = z.object({
  max_od_mm: z.number().min(0.1).max(500),
  min_od_mm: z.number().min(0).max(500),
  overall_length_mm: z.number().min(1).max(3000),
  grip_length_mm: z.number().min(1).max(500).optional(),
  has_through_hole: z.boolean().optional(),
  through_hole_id_mm: z.number().min(0).max(500).optional(),
  mass_kg: z.number().min(0).optional(),
  has_back_features: z.boolean().optional(),
});
export type PartGeometry = z.infer<typeof PartGeometrySchema>;

export const ChuckSpecSchema = z.object({
  type: z.enum(["3_jaw_scroll", "4_jaw_independent", "6_jaw", "collet", "magnetic", "vacuum", "step_jaw"]),
  max_grip_diameter_mm: z.number().min(1).max(600),
  max_grip_force_kn: z.number().min(1).max(200),
  jaw_style: z.enum(["serrated_hard", "serrated_soft", "smooth_hard", "smooth_soft", "diamond_soft"]),
  num_jaws: z.number().int().min(2).max(8),
  through_hole_mm: z.number().min(0).max(500).optional(),
});
export type ChuckSpec = z.infer<typeof ChuckSpecSchema>;

export const SetupRecommendationSchema = z.object({
  setup_id: z.string(),
  chuck: ChuckSpecSchema,
  needs_tailstock: z.boolean(),
  tailstock_force_n: z.number().min(0),
  needs_steady_rest: z.boolean(),
  steady_rest_position_mm: z.number().min(0).optional(),
  needs_sub_spindle_pickup: z.boolean(),
  soft_jaw_required: z.boolean(),
  estimated_grip_force_required_kn: z.number().min(0),
  grip_force_margin_percent: z.number(),
  grip_force_adequate: z.boolean(),
  ld_ratio: z.number().min(0),
  reasoning: z.array(z.string()),
  warnings: z.array(z.object({
    code: z.string(),
    severity: z.enum(["error", "warning", "info"]),
    message: z.string(),
  })),
});
export type SetupRecommendation = z.infer<typeof SetupRecommendationSchema>;

export const CuttingLoadInputSchema = z.object({
  max_cutting_force_n: z.number().min(0).max(100000),
  max_axial_force_n: z.number().min(0).max(100000),
  max_radial_force_n: z.number().min(0).max(100000),
  dominant_operation: z.enum(["roughing", "finishing", "parting", "threading", "drilling", "default"]),
});
export type CuttingLoadInput = z.infer<typeof CuttingLoadInputSchema>;

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintSetupSelectionEngine {
  /**
   * Select workholding setup for a part
   * @param geometry Part dimensions
   * @param material ISO material group for jaw selection
   * @param loads Cutting force estimates
   * @param availableChucks Candidate chucks (if empty, uses defaults)
   * @returns Ranked setup recommendation with physics validation
   */
  selectSetup(
    geometry: PartGeometry,
    material: MaterialInput,
    loads: CuttingLoadInput,
    availableChucks?: ChuckSpec[]
  ): SetupRecommendation {
    const geo = PartGeometrySchema.parse(geometry);
    const load = CuttingLoadInputSchema.parse(loads);

    const chucks = availableChucks && availableChucks.length > 0
      ? availableChucks
      : this.getDefaultChucks();

    // Step 1: L/D ratio analysis
    const effectiveDia = geo.max_od_mm;
    const ldRatio = geo.overall_length_mm / effectiveDia;

    const reasoning: string[] = [];
    const warnings: Array<{ code: string; severity: "error" | "warning" | "info"; message: string }> = [];

    reasoning.push(`L/D ratio: ${ldRatio.toFixed(2)} (length ${geo.overall_length_mm}mm / OD ${effectiveDia}mm)`);

    // Step 2: Support requirements
    const needsTailstock = ldRatio >= LD_CHUCK_ONLY_MAX;
    const needsSteadyRest = ldRatio >= LD_TAILSTOCK_MAX;

    if (needsSteadyRest) {
      reasoning.push(`L/D ≥ ${LD_TAILSTOCK_MAX} → steady rest REQUIRED`);
    } else if (needsTailstock) {
      reasoning.push(`L/D ≥ ${LD_CHUCK_ONLY_MAX} → tailstock engagement required`);
    } else {
      reasoning.push(`L/D < ${LD_CHUCK_ONLY_MAX} → chuck-only setup feasible`);
    }

    // Step 3: Sub-spindle pickup decision
    const needsSubSpindlePickup = Boolean(geo.has_back_features);
    if (needsSubSpindlePickup) {
      reasoning.push(`Back-side features present → sub-spindle pickup required`);
    }

    // Step 4: Select chuck (prefer one that fits OD, meets force)
    const candidates = chucks.filter(c => effectiveDia <= c.max_grip_diameter_mm);
    if (candidates.length === 0) {
      throw new Error(`No chuck can grip OD ${effectiveDia}mm`);
    }

    // Step 5: Grip force calculation
    const safetyFactor = GRIP_SAFETY_FACTOR[load.dominant_operation] ?? GRIP_SAFETY_FACTOR.default;
    const gripLength = geo.grip_length_mm ?? Math.min(effectiveDia * 0.8, geo.overall_length_mm * 0.15);

    // Required grip force: F_grip = (F_cut · L_moment) / (μ · N_jaws · R_grip) · SF
    // Simplified for overhang turning: F_grip = F_radial · SF / μ (per jaw) × N_jaws
    const radial = Math.max(load.max_radial_force_n, load.max_cutting_force_n * 0.3);
    const axial = load.max_axial_force_n;

    // Pick the best chuck (lowest force capacity that meets need)
    let bestChuck = candidates[0];
    let bestScore = -Infinity;

    for (const chuck of candidates) {
      const mu = JAW_FRICTION_COEFFICIENT[chuck.jaw_style];
      const requiredForceN = (radial * safetyFactor) / (mu * chuck.num_jaws);
      const availableForceN = chuck.max_grip_force_kn * 1000;
      const margin = ((availableForceN - requiredForceN) / requiredForceN) * 100;

      // Score: prefer meets-requirement with smallest margin (efficient sizing)
      const score = availableForceN >= requiredForceN
        ? 100 - Math.abs(margin - 50)  // prefer ~50% margin
        : -1000 - requiredForceN / availableForceN;

      if (score > bestScore) {
        bestScore = score;
        bestChuck = chuck;
      }
    }

    const mu = JAW_FRICTION_COEFFICIENT[bestChuck.jaw_style];
    const requiredGripForceN = (radial * safetyFactor) / (mu * bestChuck.num_jaws);
    const requiredGripForceKN = requiredGripForceN / 1000;
    const availableKN = bestChuck.max_grip_force_kn;
    const marginPct = ((availableKN - requiredGripForceKN) / requiredGripForceKN) * 100;
    const adequate = availableKN >= requiredGripForceKN;

    reasoning.push(
      `Selected chuck: ${bestChuck.type} (${bestChuck.num_jaws} jaws, μ=${mu.toFixed(2)})`
    );
    reasoning.push(
      `Required grip: ${requiredGripForceKN.toFixed(1)} kN (radial ${radial.toFixed(0)}N × SF ${safetyFactor})`
    );
    reasoning.push(
      `Available: ${availableKN.toFixed(1)} kN → ${adequate ? "OK" : "INADEQUATE"} (${marginPct.toFixed(0)}% margin)`
    );

    if (!adequate) {
      warnings.push({
        code: "GRIP_FORCE_INADEQUATE",
        severity: "error",
        message: `Chuck ${bestChuck.type} provides ${availableKN.toFixed(1)}kN, needs ${requiredGripForceKN.toFixed(1)}kN`,
      });
    } else if (marginPct < 20) {
      warnings.push({
        code: "GRIP_FORCE_MARGINAL",
        severity: "warning",
        message: `Grip force margin only ${marginPct.toFixed(0)}% — consider heavier chuck or higher jaw friction`,
      });
    }

    // Step 6: Tailstock force calculation
    let tailstockForceN = 0;
    if (needsTailstock) {
      // Axial support = portion of axial force not resisted by chuck
      tailstockForceN = Math.min(
        TAILSTOCK_FORCE_MAX_N,
        Math.max(TAILSTOCK_FORCE_MIN_N, axial * 0.5 * safetyFactor)
      );
      reasoning.push(`Tailstock force: ${tailstockForceN.toFixed(0)}N`);
    }

    // Step 7: Steady rest placement
    let steadyRestPos: number | undefined;
    if (needsSteadyRest) {
      steadyRestPos = geo.overall_length_mm * STEADY_REST_POSITION_RATIO;
      reasoning.push(
        `Steady rest position: ${steadyRestPos.toFixed(0)}mm from chuck (${(STEADY_REST_POSITION_RATIO * 100).toFixed(0)}% of length)`
      );
    }

    // Step 8: Soft jaw requirement
    const softJawRequired = this.requiresSoftJaws(geo, material);
    if (softJawRequired) {
      reasoning.push(`Soft jaws required: ${this.softJawReason(geo, material)}`);
    }

    // Step 9: Final warnings
    if (ldRatio > 15) {
      warnings.push({
        code: "EXTREME_LD_RATIO",
        severity: "warning",
        message: `L/D ${ldRatio.toFixed(1)} — consider multiple steady rests or alternative setup`,
      });
    }

    if (geo.max_od_mm > bestChuck.max_grip_diameter_mm * 0.95) {
      warnings.push({
        code: "NEAR_CHUCK_LIMIT",
        severity: "info",
        message: `Part OD ${geo.max_od_mm}mm near chuck limit ${bestChuck.max_grip_diameter_mm}mm`,
      });
    }

    return {
      setup_id: `setup_${Date.now()}`,
      chuck: bestChuck,
      needs_tailstock: needsTailstock,
      tailstock_force_n: tailstockForceN,
      needs_steady_rest: needsSteadyRest,
      steady_rest_position_mm: steadyRestPos,
      needs_sub_spindle_pickup: needsSubSpindlePickup,
      soft_jaw_required: softJawRequired,
      estimated_grip_force_required_kn: requiredGripForceKN,
      grip_force_margin_percent: marginPct,
      grip_force_adequate: adequate,
      ld_ratio: ldRatio,
      reasoning,
      warnings,
    };
  }

  /**
   * Determine if soft jaws required
   */
  private requiresSoftJaws(geo: PartGeometry, material: MaterialInput): boolean {
    // Soft jaws required for:
    // - Thin wall parts (OD/ID ratio < 1.2 indicates thin wall)
    // - Pre-finished surfaces (would mar hard jaws)
    // - Non-circular geometry
    if (geo.has_through_hole && geo.through_hole_id_mm && geo.through_hole_id_mm > 0) {
      const wallThickness = (geo.max_od_mm - geo.through_hole_id_mm) / 2;
      if (wallThickness < geo.max_od_mm * 0.08) return true; // thin wall
    }
    // Soft materials easier to damage
    if (material.iso_group === "N" && (material.tensile_strength_mpa ?? 300) < 400) {
      return true;
    }
    return false;
  }

  private softJawReason(geo: PartGeometry, material: MaterialInput): string {
    if (geo.has_through_hole && geo.through_hole_id_mm && geo.through_hole_id_mm > 0) {
      const wall = (geo.max_od_mm - geo.through_hole_id_mm) / 2;
      if (wall < geo.max_od_mm * 0.08) {
        return `thin wall (${wall.toFixed(1)}mm, ${(wall / geo.max_od_mm * 100).toFixed(0)}% of OD)`;
      }
    }
    if (material.iso_group === "N") return `soft material (${material.name})`;
    return "part geometry";
  }

  /**
   * Infer part geometry from features
   * @param features Feature list
   * @returns Estimated PartGeometry
   */
  inferGeometry(features: FeatureInput[]): PartGeometry {
    if (features.length === 0) {
      throw new Error("Cannot infer geometry from empty feature list");
    }

    // Max OD from od_turn / face features
    const odFeatures = features.filter(f =>
      ["od_turn", "face", "chamfer_od", "groove_od", "thread_external", "taper_od", "knurl"].includes(f.type)
    );
    const maxOd = Math.max(...odFeatures.map(f => f.diameter_mm ?? 0), 0);

    // Total length = sum of lengths for OD features + face depths
    const totalLength = features.reduce((sum, f) => {
      if (["od_turn", "taper_od", "thread_external", "knurl"].includes(f.type)) {
        return sum + (f.length_mm ?? 0);
      }
      return sum;
    }, 0);

    // Through-hole detection
    const bore = features.find(f => f.type === "id_bore" || f.type === "drill");
    const hasThroughHole = bore !== undefined && (bore.depth_mm ?? 0) > 0;
    const throughHoleId = hasThroughHole ? (bore?.diameter_mm ?? 0) : 0;

    // Back features (groove_face beyond visible face)
    const hasBackFeatures = features.some(f => ["groove_face", "undercut"].includes(f.type));

    return {
      max_od_mm: Math.max(maxOd, 1),
      min_od_mm: Math.max(maxOd * 0.8, 1),  // estimate
      overall_length_mm: Math.max(totalLength, 10),
      has_through_hole: hasThroughHole,
      through_hole_id_mm: throughHoleId,
      has_back_features: hasBackFeatures,
    };
  }

  /**
   * Estimate cutting loads from strategy plan
   */
  estimateLoads(sequencePlan: SequencePlan, material: MaterialInput): CuttingLoadInput {
    if (!sequencePlan || !sequencePlan.operations) {
      throw new Error("Invalid sequence plan");
    }

    // Simple estimate using material Kienzle-like proxy
    // kc_proxy by ISO group (N/mm²): P=1800, M=2100, K=1100, N=700, S=2800, H=3200
    const kcProxy: Record<string, number> = {
      P: 1800, M: 2100, K: 1100, N: 700, S: 2800, H: 3200,
    };
    const kc = kcProxy[material.iso_group] ?? 2000;

    // Assume typical rough: ap=2mm, fz=0.3mm, so Fc = kc · 2 · 0.3 = 0.6·kc per mm of engagement
    const maxRoughForceN = kc * 2.0 * 0.3; // N per mm of engagement width
    const typicalEngagementWidth = 1.5; // mm average
    const maxCuttingForceN = maxRoughForceN * typicalEngagementWidth;

    // Determine dominant op from longest-duration op
    let dominantOp: CuttingLoadInput["dominant_operation"] = "default";
    const opTypes = new Map<string, number>();
    sequencePlan.operations.forEach(op => {
      const type = op.featureType.includes("thread") ? "threading"
                 : op.featureType.includes("drill") ? "drilling"
                 : op.strategy_id.includes("rough") ? "roughing"
                 : op.strategy_id.includes("finish") ? "finishing"
                 : op.featureType === "parting" ? "parting"
                 : "default";
      opTypes.set(type, (opTypes.get(type) ?? 0) + op.estimated_time_sec);
    });
    let maxTime = -1;
    opTypes.forEach((t, op) => {
      if (t > maxTime) {
        maxTime = t;
        dominantOp = op as CuttingLoadInput["dominant_operation"];
      }
    });

    return {
      max_cutting_force_n: maxCuttingForceN,
      max_axial_force_n: maxCuttingForceN * 0.4,   // rule of thumb
      max_radial_force_n: maxCuttingForceN * 0.35,
      dominant_operation: dominantOp,
    };
  }

  /**
   * Full pipeline: features → geometry → loads → setup
   */
  planFromFeatures(
    features: FeatureInput[],
    material: MaterialInput,
    sequencePlan: SequencePlan,
    availableChucks?: ChuckSpec[]
  ): SetupRecommendation {
    const geometry = this.inferGeometry(features);
    const loads = this.estimateLoads(sequencePlan, material);
    return this.selectSetup(geometry, material, loads, availableChucks);
  }

  /**
   * Default chuck catalog (JM Die standard)
   */
  private getDefaultChucks(): ChuckSpec[] {
    return [
      {
        type: "3_jaw_scroll",
        max_grip_diameter_mm: 165,
        max_grip_force_kn: 45,
        jaw_style: "serrated_hard",
        num_jaws: 3,
        through_hole_mm: 51,
      },
      {
        type: "3_jaw_scroll",
        max_grip_diameter_mm: 250,
        max_grip_force_kn: 85,
        jaw_style: "serrated_hard",
        num_jaws: 3,
        through_hole_mm: 76,
      },
      {
        type: "4_jaw_independent",
        max_grip_diameter_mm: 300,
        max_grip_force_kn: 120,
        jaw_style: "smooth_hard",
        num_jaws: 4,
        through_hole_mm: 91,
      },
      {
        type: "collet",
        max_grip_diameter_mm: 65,
        max_grip_force_kn: 55,
        jaw_style: "smooth_hard",
        num_jaws: 6,
      },
      {
        type: "6_jaw",
        max_grip_diameter_mm: 200,
        max_grip_force_kn: 60,
        jaw_style: "smooth_soft",
        num_jaws: 6,
        through_hole_mm: 52,
      },
    ];
  }

  /**
   * Validate a setup recommendation
   */
  validate(setup: SetupRecommendation): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!setup.grip_force_adequate) {
      errors.push(`Grip force inadequate: ${setup.estimated_grip_force_required_kn.toFixed(1)}kN required, chuck provides ${setup.chuck.max_grip_force_kn}kN`);
    }

    if (setup.ld_ratio > LD_TAILSTOCK_MAX && !setup.needs_steady_rest) {
      errors.push(`L/D ${setup.ld_ratio.toFixed(1)} exceeds threshold but no steady rest planned`);
    }

    if (setup.chuck.max_grip_diameter_mm < 0.1) {
      errors.push("Invalid chuck: max_grip_diameter_mm must be positive");
    }

    setup.warnings.forEach(w => {
      if (w.severity === "warning" || w.severity === "info") warnings.push(w.message);
    });

    return { valid: errors.length === 0, errors, warnings };
  }
}

export const lathePrintSetupSelectionEngine = new LathePrintSetupSelectionEngine();
