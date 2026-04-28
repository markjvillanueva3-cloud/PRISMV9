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
};
