/**
 * CAM-X MS22 U02 Action Schemas — U-WIRE14
 * Zod validation schemas for 5 newly-wired Mastercam engines:
 *   mastercamAIOrchestrationEngine, mastercamCycleCatalogEngine,
 *   mastercamDeepLearningEngine, MastercamFunctionIndexEngine (static),
 *   mastercamMultiAxisEngine
 */
import { z } from "zod";

// ─── mastercamAIOrchestrationEngine ────────────────────────────────────
const REASONING_MODES = [
  "chain_of_thought", "tree_of_thought", "multi_path", "backtracking",
  "abductive", "deductive", "inductive", "analogical",
] as const;

const REQUEST_TYPES = ["strategy", "physics", "toolpath", "optimize", "diagnose", "tribal"] as const;
const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"] as const;
const OPERATIONS = ["roughing", "semi_finishing", "finishing", "drilling", "threading"] as const;
const MACHINE_TYPES_AI = ["3axis", "4axis", "5axis", "mill_turn", "lathe"] as const;
const PRIORITIES = ["cycle_time", "tool_life", "surface_finish", "balanced"] as const;

const mastercam_ai_orchestrate = z.object({
  request_type: z.enum(REQUEST_TYPES).describe("Type of AI request"),
  reasoning_mode: z.enum(REASONING_MODES).optional().describe("Reasoning approach (default: chain_of_thought)"),
  feature_type: z.string().optional().describe("Feature being machined"),
  material_id: z.string().optional().describe("Material identifier"),
  material_iso: z.enum(ISO_GROUPS).optional().describe("ISO material group"),
  tool_diameter_mm: z.number().positive().optional().describe("Tool diameter (mm)"),
  tool_flutes: z.number().int().positive().optional().describe("Tool flute count"),
  helix_angle_deg: z.number().optional().describe("Tool helix angle (deg)"),
  operation: z.enum(OPERATIONS).optional().describe("Operation type"),
  machine_type: z.enum(MACHINE_TYPES_AI).optional().describe("Machine kinematics class"),
  spindle_rpm: z.number().positive().optional().describe("Spindle RPM"),
  feed_mm_min: z.number().positive().optional().describe("Feed rate (mm/min)"),
  axial_depth_mm: z.number().positive().optional().describe("Axial depth ap (mm)"),
  radial_depth_mm: z.number().positive().optional().describe("Radial depth ae (mm)"),
  priority: z.enum(PRIORITIES).optional().describe("Optimization priority"),
  tolerance_mm: z.number().positive().optional().describe("Tolerance (mm)"),
  surface_ra_um: z.number().positive().optional().describe("Surface roughness target (µm)"),
  include_physics: z.boolean().optional().describe("Include physics analysis"),
  include_tribal: z.boolean().optional().describe("Include tribal knowledge"),
  include_chain: z.boolean().optional().describe("Include reasoning chain"),
}).passthrough();

// ─── mastercamCycleCatalogEngine ───────────────────────────────────────
const mastercam_cycle_search = z.object({
  query: z.string().min(1).describe("Free-text query against name/category/code"),
}).passthrough();

const mastercam_cycle_lookup_code = z.object({
  code: z.string().min(1).describe("Mastercam cycle code (e.g. 'DYN-MILL-2D')"),
}).passthrough();

const mastercam_cycle_stats = z.object({}).passthrough();

// ─── mastercamDeepLearningEngine ───────────────────────────────────────
const FEATURE_TYPES = [
  "closed_pocket", "open_pocket", "slot_through", "slot_blind",
  "hole_through", "hole_blind", "threaded_hole",
  "counterbore", "countersink", "boss", "fillet", "chamfer",
  "freeform_surface", "flat_face", "thin_wall", "deep_cavity",
  "bore", "thread_mill", "undercut",
] as const;

const DEEP_MACHINE_TYPES = [
  "3axis_mill", "4axis_rotary", "5axis_table_table", "5axis_head_head",
  "5axis_table_head", "lathe_2axis", "lathe_live_tooling", "mill_turn", "wire_edm",
] as const;

const mastercam_deep_select_strategy = z.object({
  feature_type: z.enum(FEATURE_TYPES).describe("Feature being machined"),
  material_group: z.enum(ISO_GROUPS).describe("ISO material group"),
  machine_type: z.enum(DEEP_MACHINE_TYPES).describe("Machine configuration"),
  tool_diameter_mm: z.number().positive().describe("Tool diameter (mm)"),
  depth_mm: z.number().positive().describe("Feature depth (mm)"),
  width_mm: z.number().positive().describe("Feature width (mm)"),
  tolerance_mm: z.number().positive().describe("Tolerance (mm)"),
  surface_finish_Ra_um: z.number().positive().optional().describe("Target Ra (µm)"),
  prefer_high_speed: z.boolean().optional().describe("Prefer HSM strategy"),
  previous_operation: z.string().optional().describe("Previous operation tag"),
}).passthrough();

// ─── MastercamFunctionIndexEngine (static) ─────────────────────────────
const mastercam_function_index_summary = z.object({}).passthrough();

// ─── mastercamMultiAxisEngine ──────────────────────────────────────────
const MULTIAXIS_GEOMETRIES = [
  "blade", "impeller", "blisk", "tube",
  "dental_crown", "dental_bridge", "dental_abutment",
  "cavity_5x", "surface_5x", "freeform_5x",
  "port", "manifold", "turbo_housing", "tire_mold", "medical_implant",
] as const;

const MULTIAXIS_GOALS = [
  "roughing", "finishing", "semi_finishing", "rest_machining",
  "fillet_machining", "edge_machining", "probing",
  "swarf_milling", "point_milling",
] as const;

const TOOL_TYPES_MA = ["ballnose", "bullnose", "endmill", "barrel", "circle_segment", "tapered"] as const;

const mastercam_multiaxis_recommend = z.object({
  geometry: z.enum(MULTIAXIS_GEOMETRIES).describe("Multi-axis geometry class"),
  goal: z.enum(MULTIAXIS_GOALS).describe("Machining goal"),
  materialGroup: z.enum(ISO_GROUPS).optional().describe("ISO material group"),
  toolDiameterMm: z.number().positive().optional().describe("Tool diameter (mm)"),
  toolType: z.enum(TOOL_TYPES_MA).optional().describe("Tool type"),
  bladeCount: z.number().int().positive().optional().describe("Blade count (impellers/blisks)"),
  hasSplitterBlades: z.boolean().optional().describe("Splitter blades present"),
  hubShroudRatio: z.number().min(0).max(1).optional().describe("Hub-to-shroud ratio (0-1)"),
  wallAngleDeg: z.number().min(0).max(90).optional().describe("Max wall angle (deg)"),
  partToleranceMm: z.number().positive().optional().describe("Part tolerance (mm)"),
  requiredSurfaces: z.array(z.string()).optional().describe("Required surface tags"),
}).passthrough();

const mastercam_multiaxis_list_strategies = z.object({}).passthrough();

export const ACTION_CAMX_MS22_U02_SCHEMAS: Record<string, z.ZodType> = {
  mastercam_ai_orchestrate,
  mastercam_cycle_search,
  mastercam_cycle_lookup_code,
  mastercam_cycle_stats,
  mastercam_deep_select_strategy,
  mastercam_function_index_summary,
  mastercam_multiaxis_recommend,
  mastercam_multiaxis_list_strategies,
};
