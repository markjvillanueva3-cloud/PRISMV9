/**
 * Zod schemas for legacy EDM dispatcher actions
 * @description Schema definitions for electrode design, wire settings,
 * surface integrity, micro EDM, laser, waterjet, and sinker EDM actions
 */
import { z } from 'zod';

// ─── ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH2: 6 unwired WEDM engines ─────

const point2D = z.object({ x: z.number(), y: z.number() }).describe("2D point.");
const boundingBox = z
  .object({
    min: point2D,
    max: point2D,
    width_mm: z.number().positive(),
    height_mm: z.number().positive(),
  })
  .describe("Axis-aligned bounding box.");

/** wedm_adaptive_pass_count — WEDMAdaptivePassEngine.calculatePassCount */
const wedm_adaptive_pass_count = z
  .object({
    target_tolerance_mm: z.number().positive().describe("Target dimensional tolerance (mm)."),
    thickness_mm: z.number().positive().describe("Workpiece thickness (mm)."),
    surface_finish_Ra_um: z.number().positive().optional(),
    material: z.string().optional(),
    wire_diameter_mm: z.number().positive().optional(),
    spark_gap_mm: z.number().positive().optional(),
    total_offset_mm: z.number().positive().optional(),
  })
  .passthrough()
  .describe("AdaptivePassInput for WEDM pass-count calculation.");

/** wedm_adaptive_offsets — WEDMAdaptivePassEngine.calculateOffsets */
const wedm_adaptive_offsets = z
  .object({
    totalPasses: z.number().int().positive().describe("Total number of passes (>= 1)."),
    totalOffset: z.number().positive().describe("Total radial offset to distribute (mm)."),
  })
  .passthrough()
  .describe("Pass-count + total-offset for offset distribution.");

/** wedm_accessibility_analyze — WEDMAccessibilityEngine.analyze */
const wedm_accessibility_analyze = z
  .object({
    profiles: z
      .array(
        z.object({
          name: z.string().min(1),
          path: z.array(point2D).min(2),
          is_through: z.boolean(),
        }),
      )
      .min(1)
      .describe("Wire-path profiles."),
    start_holes: z
      .array(
        z.object({
          id: z.string().min(1),
          x_mm: z.number(),
          y_mm: z.number(),
          diameter_mm: z.number().positive(),
          depth_mm: z.number().positive(),
          method: z.string().min(1),
          serves_profiles: z.array(z.string()),
          auto_thread_compatible: z.boolean(),
        }),
      )
      .describe("Start-hole plan."),
    clamps: z
      .array(
        z.object({
          id: z.string().min(1),
          type: z.string().min(1),
          footprint: boundingBox,
          height_mm: z.number().nonnegative(),
          over_top: z.boolean(),
        }),
      )
      .describe("Workholding clamps."),
    workpiece: z
      .object({
        bounds: boundingBox,
        thickness_mm: z.number().positive(),
        origin: point2D,
      })
      .describe("Workpiece footprint."),
    wire_envelope: z
      .object({
        upper_guide_z_mm: z.number(),
        lower_guide_z_mm: z.number(),
        max_taper_deg: z.number().nonnegative(),
      })
      .optional(),
    min_clamp_clearance_mm: z.number().nonnegative().optional(),
    min_edge_clearance_mm: z.number().nonnegative().optional(),
    min_wall_thickness_mm: z.number().nonnegative().optional(),
  })
  .passthrough()
  .describe("ProfileAccessInput for WEDM accessibility analysis.");

/** wedm_current_density_validate — WEDMCurrentDensityGuardEngine.validate */
const wedm_current_density_validate = z
  .object({
    current_A: z.number().positive().describe("Discharge current (Amps)."),
    wire_diameter_mm: z.number().positive().describe("Wire diameter (mm)."),
    wire_material: z.string().optional(),
    wire_spec_id: z.string().optional(),
    safety_margin: z.number().min(0).max(1).optional(),
  })
  .passthrough()
  .describe("CurrentDensityInput for current-density safety validation.");

/** wedm_benchmark_classify — WEDMBenchmarkToleranceEngine.classify */
const wedm_benchmark_classify = z
  .object({
    deviation_pct: z.number().describe("Deviation from benchmark (percent, signed)."),
    key: z
      .enum([
        "area_cutting_rate_pct",
        "kerf_width_pct",
        "surface_finish_ra_pct",
        "d2_rough_speed_pct",
        "offset_cascade_pct",
        "rough_speed_pct_default",
      ])
      .describe("Benchmark band key."),
  })
  .passthrough()
  .describe("Classify a deviation against a published WEDM benchmark band.");

/** wedm_archive_backfill_state — WEDMArchiveBackfillEngine.getState */
const wedm_archive_backfill_state = z
  .object({})
  .passthrough()
  .describe("No-arg backfill-state read.");

export const EDM_ACTION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  // Legacy EDM actions - validation delegated to individual engines.
  // BATCH2 schemas added for stricter validation.
  wedm_adaptive_pass_count,
  wedm_adaptive_offsets,
  wedm_accessibility_analyze,
  wedm_current_density_validate,
  wedm_benchmark_classify,
  wedm_archive_backfill_state,
};
