/**
 * Data Dispatcher Action Schemas
 * ===============================
 * Per-action Zod schemas for prism_data actions.
 * Minimal required-field validation for lower-traffic registry lookups.
 *
 * Design: Only enforce fields the dispatcher explicitly checks or the registry
 * method requires. Search/filter params are optional (registries handle defaults).
 *
 * @module schemas/dataActionSchemas
 * @version 1.0.0
 * @milestone SYS-MS6-U03
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELDS
// ============================================================================

const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();
const optPosInt = z.number().int().positive().optional();
const optBool = z.boolean().optional();
const optNum = z.number().optional();

// ID field — at least one identifier form required for *_get actions
const identifierRequired = z.union([
  z.object({ identifier: z.string().min(1) }).passthrough(),
  z.object({ material_id: z.string().min(1) }).passthrough(),
  z.object({ machine_id: z.string().min(1) }).passthrough(),
  z.object({ tool_id: z.string().min(1) }).passthrough(),
  z.object({ id: z.string().min(1) }).passthrough(),
  z.object({ name: z.string().min(1) }).passthrough(),
  z.object({ model: z.string().min(1) }).passthrough(),
  z.object({ catalog: z.string().min(1) }).passthrough(),
]);

// Pagination
const pagination = {
  limit: optPosInt,
  offset: z.number().int().min(0).optional(),
};

// ============================================================================
// MATERIAL ACTIONS (3)
// ============================================================================

const material_get = identifierRequired;

const material_search = z.object({
  query: optStr,
  iso_group: optStr,
  category: optStr,
  hardness_min: optPosNum,
  hardness_max: optPosNum,
  machinability_min: optNum,
  has_kienzle: optBool,
  has_taylor: optBool,
  ...pagination,
}).passthrough();

const material_compare = z.object({
  material_ids: z.array(z.string().min(1)).min(2),
}).passthrough();

// ============================================================================
// MACHINE ACTIONS (3)
// ============================================================================

const machine_get = identifierRequired;

const machine_search = z.object({
  query: optStr,
  manufacturer: optStr,
  type: optStr,
  controller: optStr,
  min_x_travel: optPosNum,
  min_y_travel: optPosNum,
  min_z_travel: optPosNum,
  min_spindle_rpm: optPosNum,
  min_spindle_power: optPosNum,
  min_tool_capacity: optPosInt,
  simultaneous_axes: optPosInt,
  high_speed: optBool,
  ...pagination,
}).passthrough();

const machine_capabilities = identifierRequired;

// ============================================================================
// TOOL ACTIONS (4)
// ============================================================================

const tool_get = identifierRequired;

const tool_search = z.object({
  query: optStr,
  type: optStr,
  manufacturer: optStr,
  ...pagination,
}).passthrough();

const tool_recommend = z.object({
  operation: optStr,
  material_id: optStr,
  material: optStr,
}).passthrough();

const tool_facets = z.object({}).passthrough();

// ============================================================================
// ALARM ACTIONS (3)
// ============================================================================

const alarm_decode = z.object({
  code: z.string().min(1),
  controller: optStr,
}).passthrough();

const alarm_search = z.object({
  query: z.string().min(1),
  controller: optStr,
  ...pagination,
}).passthrough();

const alarm_fix = z.object({
  code: z.string().min(1),
  controller: optStr,
}).passthrough();

// ============================================================================
// FORMULA ACTIONS (2)
// ============================================================================

const formula_get = z.object({
  formula_id: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  category: optStr,
}).passthrough();

const formula_calculate = z.object({
  formula_id: z.string().min(1),
  inputs: z.record(z.string(), z.unknown()),
}).passthrough();

// ============================================================================
// CROSS QUERY / SPECIAL (6)
// ============================================================================

const cross_query = z.object({
  query: z.string().min(1),
}).passthrough();

const machine_toolholder_match = z.object({}).passthrough();
const alarm_diagnose = z.object({}).passthrough();

const speed_feed_calc = z.object({
  material_id: optStr,
  material: optStr,
  operation: optStr,
  tool_diameter: optPosNum,
}).passthrough();

const tool_compare = z.object({
  tool_ids: z.array(z.string().min(1)).min(2),
}).passthrough();

const material_substitute = z.object({
  material_id: z.string().min(1).optional(),
  material: z.string().min(1).optional(),
}).passthrough();

// ============================================================================
// COOLANT ACTIONS (3)
// ============================================================================

const coolant_get = identifierRequired;
const coolant_search = z.object({ query: optStr, ...pagination }).passthrough();
const coolant_recommend = z.object({
  operation: optStr,
  material: optStr,
  material_id: optStr,
}).passthrough();

// ============================================================================
// COATING ACTIONS (3)
// ============================================================================

const coating_get = identifierRequired;
const coating_search = z.object({ query: optStr, ...pagination }).passthrough();
const coating_recommend = z.object({
  operation: optStr,
  material: optStr,
  material_id: optStr,
}).passthrough();

// ============================================================================
// DATABASE / DSL (4)
// ============================================================================

const cross_lookup = z.object({ query: z.string().min(1) }).passthrough();
const dsl_lookup = z.object({ term: z.string().min(1).optional(), query: z.string().min(1).optional() }).passthrough();
const database_list = z.object({}).passthrough();
const database_search = z.object({ query: z.string().min(1), ...pagination }).passthrough();

// ============================================================================
// WORKHOLDING / INSERT (4)
// ============================================================================

const workholding_get = identifierRequired;
const workholding_search = z.object({ query: optStr, type: optStr, ...pagination }).passthrough();
const insert_get = identifierRequired;
const insert_search = z.object({ query: optStr, type: optStr, ...pagination }).passthrough();

// ============================================================================
// EXPORT: ACTION_DATA_SCHEMAS
// ============================================================================

// --- ENGINE-WIRE-MS0/U-WIRE06: 5 tool data plane engines ---

const tool_holder_catalog_search = z.object({
  query: optStr.describe("Free-text query"),
  type: optStr.describe("Holder type"),
  taper: optStr.describe("Taper interface (BT40/CAT40/HSK63A/etc.)"),
  brand: optStr.describe("Manufacturer brand"),
  machine_id: optStr.describe("Restrict to holders for this machine"),
  bore_min_mm: optPosNum.describe("Minimum bore diameter mm"),
  bore_max_mm: optPosNum.describe("Maximum bore diameter mm"),
  coolant_through: optBool.describe("Through-spindle coolant required"),
  in_stock_only: optBool.describe("Restrict to in-stock items"),
  status: optStr.describe("Holder lifecycle status"),
  limit: z.number().int().positive().optional().describe("Max records"),
}).passthrough();

const tool_holder_registry_query = z.object({
  taper: optStr.describe("Taper interface"),
  holder_type: optStr.describe("Holder type"),
  shank_diameter_mm: optPosNum.describe("Shank/bore diameter mm"),
  min_rpm: optPosNum.describe("Minimum balanced RPM"),
  max_runout_um: optPosNum.describe("Maximum runout TIR um"),
  coolant_through: optBool.describe("Through-spindle coolant required"),
}).passthrough();

const tool_geometry_select = z.object({
  workpiece_material: z.string().min(1).describe("Material class"),
  operation: z.string().min(1).describe("Milling operation"),
  tool_diameter_mm: z.number().positive().describe("Tool diameter mm"),
  axial_depth_mm: optPosNum.describe("Axial depth ap mm"),
  radial_depth_mm: optPosNum.describe("Radial depth ae mm"),
  machine_rigidity: z.enum(["low","medium","high"]).optional().describe("Machine rigidity"),
  is_long_reach: optBool.describe("L/D > 4"),
  requires_chip_breaking: optBool.describe("Chip breaking geometry required"),
}).passthrough();

const tool_coating_select = z.object({
  material_class: z.string().min(1).describe("Material class"),
  operation_type: z.string().min(1).describe("Operation type"),
  cutting_speed_m_min: optPosNum.describe("Cutting speed Vc m/min"),
  coolant_strategy: optStr.describe("Coolant strategy"),
  workpiece_hardness_hrc: optNum.describe("Workpiece hardness HRC"),
  tool_substrate: z.enum(["carbide","hss","cermet","cbn","pcd"]).optional().describe("Tool substrate"),
  is_interrupted_cut: optBool.describe("Interrupted cut"),
  requires_re_grind: optBool.describe("Re-grind support required"),
}).passthrough();

const tool_assembly_build = z.object({
  tool: z.object({
    cutting_diameter_mm: z.number().positive(),
    cutting_length_mm: z.number().positive(),
    shank_diameter_mm: z.number().positive(),
    overall_length_mm: z.number().positive(),
  }).passthrough(),
  holder: z.object({}).passthrough().optional(),
  spindle: z.object({}).passthrough().optional(),
}).passthrough();

// ENGINE-WIRE-MS0/U-WIRE07: inline schemas for 5 material+tool engines
const MATERIAL_STANDARDS = ["AISI", "DIN", "EN", "JIS", "BS", "UNS", "GOST", "ISO"] as const;
const ADAPTIVE_MATERIALS = ["steel", "stainless", "cast_iron", "aluminum", "titanium", "superalloy"] as const;

const material_equivalent_lookup = z.object({
  designation: z.string().min(1).describe("Material designation to look up (e.g. '4140', 'X5CrNi18-10')"),
  standard: z.enum(MATERIAL_STANDARDS).describe("Source standard of the designation"),
  target_standards: z.array(z.enum(MATERIAL_STANDARDS)).optional().describe("Standards to return equivalents in"),
}).passthrough();

const material_selection_recommend = z.object({
  application: z.string().optional().describe("Application context (e.g. 'aerospace', 'medical', 'automotive')"),
  iso_group_preference: z.string().optional().describe("Preferred ISO material group (P, M, K, N, S, H)"),
  min_tensile_MPa: z.number().optional().describe("Minimum tensile strength in MPa"),
  max_cost_relative: z.number().optional().describe("Maximum relative cost factor"),
}).passthrough();

const material_interpolation_find = z.object({
  material_name: z.string().min(1).describe("Name or description of material to interpolate"),
  known_tensile_MPa: z.number().optional().describe("Known tensile strength in MPa"),
  known_hardness_HRC: z.number().optional().describe("Known hardness in HRC"),
  safety_factor: z.number().min(0.5).max(1.0).optional().describe("Safety factor 0.5–1.0 (default 0.85)"),
  top_n: z.number().int().min(1).max(20).optional().describe("Number of similar materials to return"),
}).passthrough();

const tool_db_bridge_query = z.object({
  type: optStr.describe("Tool type filter (endmill, drill, insert, tap, reamer, boring-bar)"),
  manufacturer: optStr.describe("Manufacturer name filter (Sandvik, Kennametal, Iscar, Seco, Walter…)"),
  min_diameter: optPosNum.describe("Minimum diameter in mm"),
  max_diameter: optPosNum.describe("Maximum diameter in mm"),
  limit: z.number().int().min(1).max(500).optional().describe("Max results (default 50)"),
}).passthrough();

const tool_catalog_adaptive_recommend = z.object({
  material: z.enum(ADAPTIVE_MATERIALS).describe("Workpiece material"),
  operation: z.enum(["roughing", "finishing"]).describe("Machining operation type"),
  target_capability_score: z.number().min(0).max(100).describe("Target adaptive capability score 0–100"),
  current_tool_diameter_mm: z.number().positive().optional().describe("Current tool diameter in mm"),
  current_tool_flutes: z.number().int().min(1).max(12).optional().describe("Current tool flute count"),
  current_tool_coating: optStr.describe("Current tool coating (e.g. TiAlN, AlTiN)"),
  max_diameter_mm: optPosNum.describe("Maximum allowed diameter constraint"),
  min_diameter_mm: optPosNum.describe("Minimum allowed diameter constraint"),
  required_coating: optStr.describe("Required coating constraint"),
}).passthrough();

// ── U-PPL-D1 / MS-PRINT-PROGRAM-LOOP Track D: prism_data mirror ──
// Two read-only surfaces (mirrors of prism_dev): the print↔program link index
// composes BlueprintProgramJoinEngine (v6 join) + enhanced JM-Die PN normalizer
// (T8047D3 ITW / C2500-2497 SCREWS / 9082526 AGRATI / BU-1365-0000-002 TFI) +
// program-side seed augmentation. Mirrored into prism_data because the actions
// are pure registry-style lookups against the JM-Die archive (no compute, no
// physics) — they belong alongside cross_lookup, dsl_lookup, database_search.
const program_print_link_lookup = z.object({
  direction: z.enum(["print_for_program", "program_for_print"]).describe(
    "Lookup direction. print_for_program = given a program path, return its print(s). program_for_print = given a part number, return its programs.",
  ),
  query: z.string().min(1).describe(
    "Query value — a program file path when direction=print_for_program, or a part number when direction=program_for_print.",
  ),
  input_program_paths: z.array(z.string()).optional().describe(
    "Optional list of program file paths to feed the program-side seed augmentation BEFORE the lookup. When omitted, only the v6 join + training triples are consulted (no enhanced-normalizer rescue).",
  ),
  join_jsonl_path: z.string().optional().describe(
    "Override the v6 join JSONL path. Default: <repo>/Docustrata/.index/blueprint-program-join-full-v6.jsonl.",
  ),
}).passthrough();

const program_print_link_coverage = z.object({
  archive_program_paths: z.array(z.string()).optional().describe(
    "Optional list of archive program paths to compute the disk-side gap against. When supplied, the report includes in_v6_join / rescued_by_seed / still_orphan counts + orphan_rate_pct.",
  ),
  input_program_paths: z.array(z.string()).optional().describe(
    "Optional list of program paths to feed the seed augmentation before computing coverage. When omitted, the seed augmentation is skipped + rescued_by_seed = 0.",
  ),
  join_jsonl_path: z.string().optional().describe(
    "Override the v6 join JSONL path. Default: <repo>/Docustrata/.index/blueprint-program-join-full-v6.jsonl.",
  ),
}).passthrough();

// ============================================================================
// MS-PRINT-PROGRAM-LOOP/U-PPL-C2 — CustomerMaterialMapEngine (2 actions)
// ============================================================================
//
// `CustomerMaterialMapEngine` produces a LEARNED customer→material distribution
// from program samples + filename heuristics (4140 / 6061 / 303 / HRC52 / …) +
// optional back-annotated blueprint material. Pure-transform — the dispatcher
// passes pre-collected sample programs in; persistence is a separate CLI script.
//
// Closes the data gap MaterialResolverForProgramsEngine._resolveFromCustomer()
// flags in code ("would ideally come from a persistent database"). Feeds Track B
// U-PPL-B3 ArchiveReoptimizationBatchEngine for material inference over the
// 16,558-program lathe archive.

const programSampleEntryShape = z.object({
  customer: z.string().min(2).describe(
    "Customer name (folder name from JM-Die archive: ALCOA, TOPURA, etc.). " +
      "Trimmed at engine entry; sub-2-char names are dropped as invalid.",
  ),
  filename: z.string().min(1).describe(
    "Program filename — drives the filename material-token heuristic.",
  ),
  filepath: z.string().optional().describe(
    "Optional full path — preserved for downstream traceability only.",
  ),
  back_annotated_material: z.string().optional().describe(
    "Optional explicit material name from a back-annotated print (highest priority).",
  ),
  back_annotated_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe(
    "Optional explicit ISO 513 group from a back-annotated print.",
  ),
});

const customer_material_map_build = z.object({
  programs: z.array(programSampleEntryShape).describe(
    "Required list of program samples to aggregate into a customer→material map.",
  ),
}).passthrough();

const customer_material_lookup = z.object({
  customer: z.string().min(1).describe(
    "Customer name to look up. Lookup is case-insensitive over trim+upper.",
  ),
  programs: z.array(programSampleEntryShape).describe(
    "Required list of program samples to aggregate before looking up the target customer. " +
      "The map is built in-memory per-call; persistence is a separate CLI script.",
  ),
}).passthrough();

/** A C T I O N_ D A T A_ S C H E M A S constant.
 */
export const ACTION_DATA_SCHEMAS: ActionSchemaMap = {
  // Material (3)
  material_get,
  material_search,
  material_compare,
  // Machine (3)
  machine_get,
  machine_search,
  machine_capabilities,
  // Tool (4)
  tool_get,
  tool_search,
  tool_recommend,
  tool_facets,
  // Alarm (3)
  alarm_decode,
  alarm_search,
  alarm_fix,
  // Formula (2)
  formula_get,
  formula_calculate,
  // Cross-query / Special (6)
  cross_query,
  machine_toolholder_match,
  alarm_diagnose,
  speed_feed_calc,
  tool_compare,
  material_substitute,
  // Coolant (3)
  coolant_get,
  coolant_search,
  coolant_recommend,
  // Coating (3)
  coating_get,
  coating_search,
  coating_recommend,
  // Database / DSL (4)
  cross_lookup,
  dsl_lookup,
  database_list,
  database_search,
  // Workholding / Insert (4)
  workholding_get,
  workholding_search,
  insert_get,
  insert_search,
  // ENGINE-WIRE-MS0/U-WIRE06: 5 tool data plane engines
  tool_holder_catalog_search,
  tool_holder_registry_query,
  tool_geometry_select,
  tool_coating_select,
  tool_assembly_build,
  // ENGINE-WIRE-MS0/U-WIRE07: 5 material+tool engines
  material_equivalent_lookup,
  material_selection_recommend,
  material_interpolation_find,
  tool_db_bridge_query,
  tool_catalog_adaptive_recommend,
  // U-PPL-D1 / MS-PRINT-PROGRAM-LOOP Track D: ProgramPrintLinkIndexEngine (2 actions, mirror of prism_dev)
  program_print_link_lookup,
  program_print_link_coverage,
  // MS-PRINT-PROGRAM-LOOP/U-PPL-C2: CustomerMaterialMapEngine (2 actions)
  customer_material_map_build,
  customer_material_lookup,
};
