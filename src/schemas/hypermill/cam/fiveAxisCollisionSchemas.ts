/**
 * 5-Axis Collision Avoidance Schemas — hyperMILL CAM
 *
 * U-HKC23: Zod schemas for 13 five-axis cycle types with collision
 * avoidance parameters. Each cycle defines auto-tilt, tilt limits,
 * collision distances, and holder/shank checking configuration.
 *
 * AC Python call pattern:
 *   hm.5x.collision.swarf(auto_tilt=true, collision_distance=2.0, ...)
 *
 * @domain CAM-5Axis-Collision
 * @milestone HM-KC-MS4/U-HKC23
 */

import { z } from "zod";

// ── Base collision schema factory ────────────────────────────────────────────

/**
 * Creates the base 8-param collision avoidance schema shared by all 13 cycle
 * types. Each cycle extends this with cycle-specific DFM descriptions.
 */
function createCollisionSchema(cycleLabel: string) {
  return z.object({
    auto_tilt: z
      .boolean()
      .default(true)
      .describe(`Enable automatic tool axis tilting to avoid collisions in ${cycleLabel}`),
    tilt_limit_min: z
      .number()
      .min(-90)
      .max(0)
      .default(-30)
      .describe(`Minimum tilt limit for collision avoidance in ${cycleLabel}, degrees (DFM-critical)`),
    tilt_limit_max: z
      .number()
      .min(0)
      .max(90)
      .default(30)
      .describe(`Maximum tilt limit for collision avoidance in ${cycleLabel}, degrees (DFM-critical)`),
    collision_distance: z
      .number()
      .min(0.1)
      .max(100)
      .default(2)
      .describe(`Minimum clearance distance between tool assembly and part/fixture in ${cycleLabel}, mm (DFM-critical)`),
    retraction_angle: z
      .number()
      .min(0)
      .max(90)
      .default(5)
      .describe(`Angular retraction from collision boundary for safe margin in ${cycleLabel}, degrees`),
    holder_check: z
      .boolean()
      .default(true)
      .describe(`Include tool holder geometry in collision detection for ${cycleLabel}`),
    shank_check: z
      .boolean()
      .default(true)
      .describe(`Include tool shank geometry in collision detection for ${cycleLabel}`),
    collision_model: z
      .enum(["tool_only", "tool_holder", "full_assembly"])
      .default("full_assembly")
      .describe(`Collision detection model complexity level for ${cycleLabel}`),
  });
}

// ── 1. Swarf Cutting Collision (8 params) ────────────────────────────────────

export const swarfCuttingCollisionSchema = createCollisionSchema("swarf cutting");
export type SwarfCuttingCollision = z.infer<typeof swarfCuttingCollisionSchema>;

// ── 2. Point Milling Collision (8 params) ────────────────────────────────────

export const pointMillingCollisionSchema = createCollisionSchema("point milling");
export type PointMillingCollision = z.infer<typeof pointMillingCollisionSchema>;

// ── 3. Contour 5X Collision (8 params) ───────────────────────────────────────

export const contour5xCollisionSchema = createCollisionSchema("contour 5X");
export type Contour5xCollision = z.infer<typeof contour5xCollisionSchema>;

// ── 4. Pocket 5X Collision (8 params) ────────────────────────────────────────

export const pocket5xCollisionSchema = createCollisionSchema("pocket 5X");
export type Pocket5xCollision = z.infer<typeof pocket5xCollisionSchema>;

// ── 5. Profile 5X Collision (8 params) ───────────────────────────────────────

export const profile5xCollisionSchema = createCollisionSchema("profile 5X");
export type Profile5xCollision = z.infer<typeof profile5xCollisionSchema>;

// ── 6. Blade Roughing Collision (8 params) ───────────────────────────────────

export const bladeRoughingCollisionSchema = createCollisionSchema("blade roughing");
export type BladeRoughingCollision = z.infer<typeof bladeRoughingCollisionSchema>;

// ── 7. Blade Finishing Collision (8 params) ──────────────────────────────────

export const bladeFinishingCollisionSchema = createCollisionSchema("blade finishing");
export type BladeFinishingCollision = z.infer<typeof bladeFinishingCollisionSchema>;

// ── 8. Impeller Roughing Collision (8 params) ────────────────────────────────

export const impellerRoughingCollisionSchema = createCollisionSchema("impeller roughing");
export type ImpellerRoughingCollision = z.infer<typeof impellerRoughingCollisionSchema>;

// ── 9. Impeller Finishing Collision (8 params) ───────────────────────────────

export const impellerFinishingCollisionSchema = createCollisionSchema("impeller finishing");
export type ImpellerFinishingCollision = z.infer<typeof impellerFinishingCollisionSchema>;

// ── 10. Tube Milling Collision (8 params) ────────────────────────────────────

export const tubeMillingCollisionSchema = createCollisionSchema("tube milling");
export type TubeMillingCollision = z.infer<typeof tubeMillingCollisionSchema>;

// ── 11. Dental Collision (8 params) ──────────────────────────────────────────

export const dentalCollisionSchema = createCollisionSchema("dental");
export type DentalCollision = z.infer<typeof dentalCollisionSchema>;

// ── 12. Cavity Collision (8 params) ──────────────────────────────────────────

export const cavityCollisionSchema = createCollisionSchema("cavity");
export type CavityCollision = z.infer<typeof cavityCollisionSchema>;

// ── 13. Multi-Surface Collision (8 params) ───────────────────────────────────

export const multiSurfaceCollisionSchema = createCollisionSchema("multi-surface");
export type MultiSurfaceCollision = z.infer<typeof multiSurfaceCollisionSchema>;

// ── Schema Map ───────────────────────────────────────────────────────────────

/** All 13 five-axis collision avoidance schemas keyed by cycle type */
export const FIVE_AXIS_COLLISION_SCHEMA_MAP = {
  swarf_cutting: swarfCuttingCollisionSchema,
  point_milling: pointMillingCollisionSchema,
  contour_5x: contour5xCollisionSchema,
  pocket_5x: pocket5xCollisionSchema,
  profile_5x: profile5xCollisionSchema,
  blade_roughing: bladeRoughingCollisionSchema,
  blade_finishing: bladeFinishingCollisionSchema,
  impeller_roughing: impellerRoughingCollisionSchema,
  impeller_finishing: impellerFinishingCollisionSchema,
  tube_milling: tubeMillingCollisionSchema,
  dental: dentalCollisionSchema,
  cavity: cavityCollisionSchema,
  multi_surface: multiSurfaceCollisionSchema,
} as const;

export type FiveAxisCollisionCycleType = keyof typeof FIVE_AXIS_COLLISION_SCHEMA_MAP;

// ── Metadata ─────────────────────────────────────────────────────────────────

/** Metadata record for every 5-axis collision avoidance cycle type */
export interface FiveAxisCollisionMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams: string[];
}

/** Metadata for each 5-axis collision avoidance cycle type */
export const FIVE_AXIS_COLLISION_METADATA: Record<FiveAxisCollisionCycleType, FiveAxisCollisionMeta> = {
  swarf_cutting: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.swarf",
    description: "Collision avoidance for swarf/flank cutting with holder and shank checks",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  point_milling: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.point_milling",
    description: "Collision avoidance for point milling with tilt limit enforcement",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  contour_5x: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.contour",
    description: "Collision avoidance for 5-axis contouring with full assembly check",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  pocket_5x: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.pocket",
    description: "Collision avoidance for 5-axis pocket milling in deep cavities",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  profile_5x: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.profile",
    description: "Collision avoidance for 5-axis profile milling with extended reach",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  blade_roughing: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.blade_rough",
    description: "Collision avoidance for blade roughing in turbine channels",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  blade_finishing: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.blade_finish",
    description: "Collision avoidance for blade finishing with tight clearances",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  impeller_roughing: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.impeller_rough",
    description: "Collision avoidance for impeller roughing in narrow channels",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  impeller_finishing: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.impeller_finish",
    description: "Collision avoidance for impeller finishing with shroud proximity",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  tube_milling: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.tube",
    description: "Collision avoidance for tube milling with wrap-around access",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  dental: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.dental",
    description: "Collision avoidance for dental prosthetic milling with block clearance",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  cavity: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.cavity",
    description: "Collision avoidance for cavity/mold milling with deep feature access",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
  multi_surface: {
    paramCount: 8,
    acPythonSetter: "hm.5x.collision.multi_surface",
    description: "Collision avoidance for multi-surface group milling with boundary transitions",
    dfmCriticalParams: ["tilt_limit_min", "tilt_limit_max", "collision_distance"],
  },
};

// ── Computed Totals ──────────────────────────────────────────────────────────

/** Total parameter count across all 13 five-axis collision avoidance schemas */
export const FIVE_AXIS_COLLISION_TOTAL_PARAM_COUNT = Object.values(FIVE_AXIS_COLLISION_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
