/**
 * Lathe Speed/Feed Calculator Action Schemas
 * LATHE-MASTER U-LTH10 — Phase P1 dispatcher wiring
 * LATHE-MASTER U-LTH14 — Added lathe_sf_full meta-action
 *
 * Actions: lathe_sf_calculate, lathe_sf_advise, lathe_sf_whatif,
 *          lathe_sf_cite_sources, lathe_sf_explain, lathe_sf_full
 */
import { z } from "zod";

// ── Input Schemas ───────────────────────────────────────────────────────────

const ToolInputSchema = z.object({
  type: z.enum([
    "turning_insert",
    "boring_bar",
    "grooving",
    "threading",
    "parting",
    "drilling",
    "facing",
  ]).default("turning_insert"),
  diameter_mm: z.number().positive().optional(),
  nose_radius_mm: z.number().positive().optional(),
  grade: z.string().optional(),
  coating: z.string().optional(),
  insert_style: z.string().optional(),
});

const OperationInputSchema = z.object({
  type: z.enum([
    "roughing",
    "semi_finishing",
    "finishing",
    "threading",
    "grooving",
    "parting",
    "drilling",
    "boring",
  ]).default("roughing"),
  depth_of_cut_mm: z.number().positive().optional(),
  width_of_cut_mm: z.number().positive().optional(),
  target_ra_um: z.number().positive().optional(),
  coolant: z.enum(["flood", "mist", "dry", "high_pressure", "cryogenic"]).optional(),
});

const MachineInputSchema = z.object({
  max_rpm: z.number().positive().optional(),
  max_power_kw: z.number().positive().optional(),
  has_live_tooling: z.boolean().optional(),
  has_sub_spindle: z.boolean().optional(),
  rigidity_factor: z.number().min(0.5).max(1.5).optional(),
}).optional();

const WorkpieceInputSchema = z.object({
  diameter_mm: z.number().positive().optional(),
  length_mm: z.number().positive().optional(),
  hardness_hrc: z.number().min(0).max(70).optional(),
  hardness_hb: z.number().min(50).max(700).optional(),
}).optional();

// ── Action Schemas ──────────────────────────────────────────────────────────

export const ACTION_LATHE_SF_SCHEMAS = {
  /** Calculate optimal lathe speed/feed parameters */
  lathe_sf_calculate: z.object({
    material: z.string().describe("Material identifier (AISI code or canonical key)"),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
    tool: ToolInputSchema,
    operation: OperationInputSchema,
    machine: MachineInputSchema,
    workpiece: WorkpieceInputSchema,
    strategy: z.enum(["conservative", "balanced", "aggressive", "maximum_mrr"]).optional(),
  }),

  /** Get DL-advised speed/feed with feature importance */
  lathe_sf_advise: z.object({
    material: z.string(),
    tool: z.object({
      type: z.string(),
      diameter_mm: z.number().positive().optional(),
      nose_radius_mm: z.number().positive().optional(),
      grade: z.string().optional(),
      coating: z.string().optional(),
    }),
    operation: z.object({
      type: z.string(),
      depth_of_cut_mm: z.number().positive().optional(),
      target_ra_um: z.number().positive().optional(),
    }),
    machine: z.object({
      max_rpm: z.number().positive().optional(),
      max_power_kw: z.number().positive().optional(),
      rigidity_factor: z.number().optional(),
    }).optional(),
    workpiece: z.object({
      diameter_mm: z.number().positive().optional(),
      hardness_hrc: z.number().optional(),
    }).optional(),
    seed: z.number().int().optional(),
    top_features: z.number().int().min(1).max(10).optional(),
  }),

  /** Analyze what-if scenarios for speed/feed changes */
  lathe_sf_whatif: z.object({
    base_input: z.object({
      material: z.string(),
      tool: z.object({
        type: z.string(),
        diameter_mm: z.number().positive().optional(),
        nose_radius_mm: z.number().positive().optional(),
      }),
      operation: z.object({
        type: z.string(),
        coolant: z.string().optional(),
        target_ra_um: z.number().positive().optional(),
      }),
      strategy: z.string().optional(),
      machine: z.object({
        max_rpm: z.number().positive().optional(),
        max_power_kw: z.number().positive().optional(),
        rigidity_factor: z.number().optional(),
      }).optional(),
      workpiece: z.object({
        diameter_mm: z.number().positive().optional(),
      }).optional(),
    }),
    scenarios: z.array(z.object({
      type: z.enum([
        "change_material",
        "change_tool",
        "change_operation",
        "change_machine",
        "change_strategy",
        "change_coolant",
        "increase_speed",
        "decrease_speed",
        "increase_feed",
        "decrease_feed",
        "increase_depth",
        "decrease_depth",
      ]),
      params: z.object({
        material: z.string().optional(),
        strategy: z.string().optional(),
        type: z.string().optional(),
        coolant: z.string().optional(),
        nose_radius_mm: z.number().optional(),
        coating: z.string().optional(),
        max_rpm: z.number().optional(),
        max_power_kw: z.number().optional(),
        rigidity_factor: z.number().optional(),
      }).optional(),
      delta_percent: z.number().optional(),
    })),
    include_sensitivity: z.boolean().optional(),
    include_causal_chain: z.boolean().optional(),
  }),

  /** Cite sources used in speed/feed calculation */
  lathe_sf_cite_sources: z.object({
    material: z.string(),
    include_formulas: z.boolean().optional(),
    include_standards: z.boolean().optional(),
  }),

  /** Explain speed/feed reasoning in plain language */
  lathe_sf_explain: z.object({
    material: z.string(),
    tool: ToolInputSchema.optional(),
    operation: OperationInputSchema.optional(),
    strategy: z.enum(["conservative", "balanced", "aggressive", "maximum_mrr"]).optional(),
    target_audience: z.enum(["machinist", "engineer", "beginner"]).optional(),
  }),

  /** Full speed/feed calculation with DL advisor, what-if, citations, and explanation */
  lathe_sf_full: z.object({
    material: z.string().describe("Material identifier (AISI code or canonical key)"),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group override"),
    tool: ToolInputSchema.describe("Tool configuration"),
    operation: OperationInputSchema.describe("Operation parameters"),
    machine: MachineInputSchema.describe("Machine constraints"),
    workpiece: WorkpieceInputSchema.describe("Workpiece dimensions"),
    strategy: z.enum(["conservative", "balanced", "aggressive", "maximum_mrr"]).optional().describe("Optimization strategy"),
    shop_profile_id: z.string().optional().describe("Shop profile for tuning (e.g., 'jm-die')"),
    include_whatif: z.boolean().optional().default(true).describe("Include what-if analysis"),
    include_dl_advice: z.boolean().optional().default(true).describe("Include DL advisor output"),
    include_explanation: z.boolean().optional().default(true).describe("Include plain-language explanation"),
    include_citations: z.boolean().optional().default(true).describe("Include source citations"),
    target_audience: z.enum(["machinist", "engineer", "beginner"]).optional().default("machinist"),
  }),
};

export type LatheSpeedFeedAction = keyof typeof ACTION_LATHE_SF_SCHEMAS;
