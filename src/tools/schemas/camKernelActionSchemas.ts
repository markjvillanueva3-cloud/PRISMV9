/**
 * Zod schemas for all 13 CAM Kernel dispatcher actions.
 * Validates input before reaching engines — prevents garbage-in-garbage-out.
 */
import { z } from "zod";

// ── Shared sub-schemas ────────────────────────────────────────
const DimensionsSchema = z.object({
  length_mm: z.number().positive().optional(),
  width_mm: z.number().positive().optional(),
  depth_mm: z.number().positive().optional(),
  diameter_mm: z.number().positive().optional(),
}).optional();

const FeatureSchema = z.object({
  type: z.string().min(1),
  operation: z.enum(["roughing", "finishing", "drilling", "rest", "facing"]),
  dimensions: DimensionsSchema,
  tolerance_mm: z.number().positive().optional(),
  surface_finish_Ra: z.number().positive().optional(),
  wall_thickness_mm: z.number().positive().optional(),
  corner_radius_mm: z.number().nonnegative().optional(),
});

const ComplexFeatureSchema = FeatureSchema.extend({
  id: z.string().min(1),
  position: z.object({
    x: z.number(), y: z.number(), z: z.number(),
  }),
  access_direction: z.object({
    x: z.number(), y: z.number(), z: z.number(),
  }).optional(),
  priority: z.number().optional(),
  requires_feature_ids: z.array(z.string()).optional(),
});

const MaterialSchema = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  name: z.string().optional(),
  hardness_hrc: z.number().min(0).max(70).optional(),
});

const StockDimsSchema = z.object({
  length_mm: z.number().positive(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
});

const SegmentSchema = z.object({
  x: z.number(), y: z.number(), z: z.number(),
  feed_mmmin: z.number().positive(),
  rpm: z.number().positive(),
  type: z.enum(["rapid", "feed", "arc_cw", "arc_ccw", "plunge", "retract"]),
  ae_mm: z.number().positive().optional(),
  ap_mm: z.number().positive().optional(),
});

const ToolSchema = z.object({
  diameter_mm: z.number().positive(),
  flute_length_mm: z.number().positive(),
  overall_length_mm: z.number().positive(),
  flute_count: z.number().int().min(1).max(20),
  corner_radius_mm: z.number().nonnegative().optional(),
  type: z.string().optional(),
});

// ── Action schemas ────────────────────────────────────────────

export const cam_unified_generate = z.object({
  features: z.array(FeatureSchema).min(1),
  material: z.string().min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  material_hardness_hrc: z.number().optional(),
  machine_name: z.string().min(1),
  controller: z.string().optional(),
  stock_dims: StockDimsSchema.optional(),
  options: z.object({
    aggressiveness: z.number().min(1).max(10).optional(),
    coolant: z.string().optional(),
    optimize_for: z.enum(["tool_life", "speed", "cost", "surface_finish", "balanced"]).optional(),
    program_number: z.number().int().positive().optional(),
    programmer_name: z.string().optional(),
    machine_rate_per_hour: z.number().positive().optional(),
  }).optional(),
});

export const cam_complex_generate = z.object({
  features: z.array(ComplexFeatureSchema).min(1),
  material: z.string().min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  material_hardness_hrc: z.number().optional(),
  machine_name: z.string().min(1),
  controller: z.string().optional(),
  stock_dims: StockDimsSchema,
  options: z.object({
    optimize_for: z.enum(["tool_life", "speed", "cost", "surface_finish", "balanced"]).optional(),
    program_number: z.number().int().positive().optional(),
    programmer_name: z.string().optional(),
    machine_rate_per_hour: z.number().positive().optional(),
    max_tools_per_setup: z.number().int().positive().optional(),
  }).optional(),
});

export const cam_production_toolpath = z.object({
  boundary: z.object({
    points: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
    depth_mm: z.number().positive(),
    corner_radius_mm: z.number().nonnegative().optional(),
  }),
  config: z.object({
    material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    tool_diameter_mm: z.number().positive(),
    tool_flute_count: z.number().int().min(1),
    feed_per_tooth_mm: z.number().positive(),
    cutting_speed_mpm: z.number().positive(),
    rpm: z.number().positive(),
    stepover_mm: z.number().positive(),
    doc_mm: z.number().positive(),
    enable_chip_thinning: z.boolean().optional(),
    enable_corner_decel: z.boolean().optional(),
    enable_arc_corners: z.boolean().optional(),
  }),
  program_number: z.number().int().positive().optional(),
  controller: z.string().optional(),
});

export const cam_multi_process = z.object({
  features: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    process: z.enum(["milling", "turning", "drilling", "wire_edm", "sinker_edm", "grinding", "laser", "waterjet", "additive"]).optional(),
    turning: z.record(z.string(), z.any()).optional(),
    edm: z.record(z.string(), z.any()).optional(),
    grinding: z.record(z.string(), z.any()).optional(),
    cutting: z.record(z.string(), z.any()).optional(),
    dimensions: DimensionsSchema,
    tolerance_mm: z.number().positive().optional(),
    surface_finish_Ra: z.number().positive().optional(),
  })).min(1),
  material: MaterialSchema,
  machine: z.object({
    name: z.string().optional(),
    max_rpm: z.number().positive().optional(),
    max_power_kw: z.number().positive().optional(),
  }).optional(),
});

export const cam_mill_turn = z.object({
  operations: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    spindle: z.enum(["main", "sub"]),
    dimensions: DimensionsSchema,
    tool: z.object({
      type: z.string(), diameter_mm: z.number().positive().optional(),
      is_live: z.boolean().optional(), rpm: z.number().positive().optional(),
    }).optional(),
    requires_ops: z.array(z.string()).optional(),
  })).min(1),
  config: z.object({
    material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    machine_type: z.enum(["mill_turn", "swiss", "vtl"]),
    bar_diameter_mm: z.number().positive().optional(),
    bar_length_mm: z.number().positive().optional(),
    part_length_mm: z.number().positive().optional(),
    max_main_rpm: z.number().positive().optional(),
    max_sub_rpm: z.number().positive().optional(),
    max_live_rpm: z.number().positive().optional(),
    program_number: z.number().int().positive().optional(),
  }),
});

export const cam_5axis_convert = z.object({
  segments: z.array(z.object({
    x: z.number(), y: z.number(), z: z.number(),
    feed_mmmin: z.number(), rpm: z.number(), type: z.string(),
    nx: z.number().optional(), ny: z.number().optional(), nz: z.number().optional(),
  })).min(1),
  config: z.object({
    machine_type: z.enum(["table_table", "head_table", "head_head"]),
    a_range_deg: z.tuple([z.number(), z.number()]).optional(),
    b_range_deg: z.tuple([z.number(), z.number()]).optional(),
    enable_rtcp: z.boolean().optional(),
    lead_angle_deg: z.number().optional(),
    lean_angle_deg: z.number().optional(),
    max_tilt_deg: z.number().positive().optional(),
  }),
});

export const cam_advanced_strategy = z.object({
  strategy: z.enum(["flowline", "geodesic", "constant_scallop", "swarf", "thread_mill", "chamfer"]),
  config: z.record(z.string(), z.any()).optional(),
  surface_points: z.array(z.any()).optional(),
  start_curve: z.array(z.any()).optional(),
  end_curve: z.array(z.any()).optional(),
  top_curve: z.array(z.any()).optional(),
  bottom_curve: z.array(z.any()).optional(),
  center: z.object({ x: z.number(), y: z.number() }).optional(),
  edges: z.array(z.any()).optional(),
  num_passes: z.number().int().positive().optional(),
  target_scallop_mm: z.number().positive().optional(),
  direction: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const cam_smart_tool = z.object({
  operation_type: z.string().min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  material_name: z.string().optional(),
  material_hardness_hrc: z.number().optional(),
  machine_name: z.string().optional(),
  feature_diameter_mm: z.number().positive().optional(),
  feature_depth_mm: z.number().positive().optional(),
  feature_width_mm: z.number().positive().optional(),
  tolerance_mm: z.number().positive().optional(),
  surface_finish_Ra: z.number().positive().optional(),
  optimize_for: z.enum(["tool_life", "speed", "cost", "surface_finish", "balanced"]).optional(),
  max_results: z.number().int().positive().optional(),
});

export const cam_verify = z.object({
  toolpath_segments: z.array(SegmentSchema).min(1),
  tool: ToolSchema,
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  machine: z.object({
    max_rpm: z.number().positive().optional(),
    max_power_kw: z.number().positive().optional(),
    max_torque_nm: z.number().positive().optional(),
    x_travel_mm: z.number().positive().optional(),
    y_travel_mm: z.number().positive().optional(),
    z_travel_mm: z.number().positive().optional(),
  }).optional(),
  stock_dims: StockDimsSchema.optional(),
  tolerance_mm: z.number().positive().optional(),
  surface_finish_Ra_target: z.number().positive().optional(),
  gcode: z.string().optional(),
});

export const cam_chatter_rpm = z.object({
  tool_diameter_mm: z.number().positive(),
  tool_flute_count: z.number().int().min(1),
  tool_overhang_mm: z.number().positive(),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  doc_mm: z.number().positive(),
  target_rpm: z.number().positive(),
  machine_max_rpm: z.number().positive(),
});

export const cam_cost_feature = z.object({
  segments: z.array(SegmentSchema).min(1),
  config: z.object({
    material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    tool_diameter_mm: z.number().positive(),
    tool_flute_count: z.number().int().min(1),
    feed_per_tooth_mm: z.number().positive(),
    cutting_speed_mpm: z.number().positive(),
    rpm: z.number().positive(),
    stepover_mm: z.number().positive(),
    doc_mm: z.number().positive(),
    tool_price_usd: z.number().nonnegative().optional(),
    tool_life_min: z.number().positive().optional(),
    machine_rate_per_hour: z.number().positive().optional(),
  }),
});

export const cam_intelligent_sequence = z.object({
  operations: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    operation: z.string().min(1),
    phase: z.number().int().min(0).max(7).optional(),
    tool_diameter_mm: z.number().positive().optional(),
    tool_id: z.string().optional(),
    depth_mm: z.number().positive().optional(),
    is_datum: z.boolean().optional(),
    requires_ops: z.array(z.string()).optional(),
  })).min(1),
});

export const cam_list_actions = z.object({}).optional();

/** Map action names to their Zod schemas */
export const CAM_ACTION_SCHEMAS: Record<string, z.ZodType> = {
  cam_unified_generate,
  cam_complex_generate,
  cam_production_toolpath,
  cam_multi_process,
  cam_mill_turn,
  cam_5axis_convert,
  cam_advanced_strategy,
  cam_smart_tool,
  cam_verify,
  cam_chatter_rpm,
  cam_cost_feature,
  cam_intelligent_sequence,
  cam_list_actions: cam_list_actions as z.ZodType,
};
