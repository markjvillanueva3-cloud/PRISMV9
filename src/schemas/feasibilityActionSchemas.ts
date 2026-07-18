/**
 * Feasibility Action Schemas — MF Track (MS0 + MS1)
 * 16 actions for workpiece state, accessibility, workholding, rigidity.
 */
import { z } from "zod";

const StockSchema = z.object({
  length_mm: z.number(),
  width_mm: z.number(),
  height_mm: z.number(),
  material: z.string().optional(),
});

const OperationSchema = z.object({
  id: z.string(),
  type: z.string(),
  tool_diameter_mm: z.number(),
  depth_mm: z.number(),
  width_mm: z.number().optional(),
  length_mm: z.number().optional(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  approach_direction: z.string().optional(),
});

const ToolSchema = z.object({
  tool_id: z.string(),
  tool_diameter_mm: z.number(),
  tool_length_mm: z.number(),
  flute_length_mm: z.number().optional(),
  tool_type: z.string().optional(),
  corner_radius_mm: z.number().optional(),
  holder_diameter_mm: z.number().optional(),
  holder_length_mm: z.number().optional(),
});

const FixtureSchema = z.object({
  fixture_type: z.string(),
  friction_coeff: z.number().optional(),
  clamping_pressure_MPa: z.number().optional(),
  clamped_faces: z.array(z.string()).optional(),
  clamp_count: z.number().optional(),
  max_clamp_force_N: z.number().optional(),
});

const ConfigSchema = z.object({
  approach_clearance_mm: z.number().optional(),
  holder_clearance_margin_mm: z.number().optional(),
  max_aspect_ratio: z.number().optional(),
  five_axis_available: z.boolean().optional(),
}).optional();

const WallSchema = z.object({
  id: z.string(),
  thickness_mm: z.number(),
  height_mm: z.number(),
  length_mm: z.number(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  direction: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  adjacent_features: z.array(z.string()),
  rigidity_score: z.number(),
});

export const ACTION_FEASIBILITY_SCHEMAS: Record<string, z.ZodType> = {
  // MF-MS0
  feasibility_init: z.object({
    action: z.literal("feasibility_init"),
    stock: StockSchema,
  }),
  feasibility_apply_op: z.object({
    action: z.literal("feasibility_apply_op"),
    state_json: z.string(),
    operation: OperationSchema,
  }),
  feasibility_simulate: z.object({
    action: z.literal("feasibility_simulate"),
    stock: StockSchema,
    operations: z.array(OperationSchema),
  }),
  feasibility_walls: z.object({
    action: z.literal("feasibility_walls"),
    state_json: z.string(),
  }),
  feasibility_surfaces: z.object({
    action: z.literal("feasibility_surfaces"),
    state_json: z.string(),
  }),
  feasibility_datums: z.object({
    action: z.literal("feasibility_datums"),
    state_json: z.string(),
  }),

  // MF-MS1: Accessibility
  accessibility_check: z.object({
    action: z.literal("accessibility_check"),
    state_json: z.string(),
    operation: OperationSchema,
    tool: ToolSchema,
    config: ConfigSchema,
  }),
  accessibility_find_tools: z.object({
    action: z.literal("accessibility_find_tools"),
    state_json: z.string(),
    operation: OperationSchema,
    tool_catalog: z.array(ToolSchema),
    config: ConfigSchema,
  }),
  accessibility_report: z.object({
    action: z.literal("accessibility_report"),
    state_json: z.string(),
    assignments: z.array(z.object({ op: OperationSchema, tool: ToolSchema })),
    config: ConfigSchema,
  }),

  // MF-MS1: Workholding
  workholding_check: z.object({
    action: z.literal("workholding_check"),
    state_json: z.string(),
    operation: OperationSchema,
    fixture: FixtureSchema,
    cutting_force_N: z.number().optional(),
  }),
  workholding_track: z.object({
    action: z.literal("workholding_track"),
    state_json: z.string(),
  }),
  workholding_suggest: z.object({
    action: z.literal("workholding_suggest"),
    state_json: z.string(),
    remaining_ops: z.array(OperationSchema).optional(),
  }),

  // MF-MS1: Rigidity
  rigidity_check: z.object({
    action: z.literal("rigidity_check"),
    state_json: z.string(),
    operation: OperationSchema,
    material: z.string().optional(),
    cutting_force_N: z.number().optional(),
    spindle_rpm: z.number().optional(),
    flutes: z.number().optional(),
  }),
  rigidity_critical: z.object({
    action: z.literal("rigidity_critical"),
    state_json: z.string(),
    material: z.string().optional(),
    cutting_force_N: z.number().optional(),
  }),
  rigidity_support: z.object({
    action: z.literal("rigidity_support"),
    wall: WallSchema,
    material: z.string().optional(),
  }),

  // Utility
  material_stiffness_lookup: z.object({
    action: z.literal("material_stiffness_lookup"),
    material: z.string().optional(),
  }),
};
