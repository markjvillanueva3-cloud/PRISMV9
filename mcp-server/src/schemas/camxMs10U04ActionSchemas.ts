/**
 * CAMX-MS10 U04 Action Schemas — Zod v4
 *
 * 1 dispatcher action (UniversalToolExportEngine E1124):
 *   universal_tool_export — export PRISM tools in ISO 13399, STEP-NC, MTConnect, or CSV
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

/** A single PRISM tool record. Fields cover all naming conventions used across engines. */
const PRISMToolSchema = z.object({
  id:                   z.string().optional().describe("Tool identifier / catalogue number"),
  designation:          z.string().optional().describe("Full tool designation string"),
  manufacturer:         z.string().optional().describe("Tool manufacturer name"),
  tool_type:            z.string().optional().describe("Tool type (endmill, drill, tap, reamer, ballnose, etc.)"),
  type:                 z.string().optional().describe("Alias for tool_type"),

  // Dimensional
  diameter_mm:          z.number().positive().optional().describe("Cutting / nominal diameter, mm"),
  cutting_diameter_mm:  z.number().positive().optional().describe("Alias for diameter_mm"),
  shank_diameter_mm:    z.number().positive().optional().describe("Shank diameter, mm"),
  cutting_length_mm:    z.number().positive().optional().describe("Cutting edge / flute length, mm"),
  flute_length_mm:      z.number().positive().optional().describe("Alias for cutting_length_mm"),
  overall_length_mm:    z.number().positive().optional().describe("Overall tool length, mm"),
  length_mm:            z.number().positive().optional().describe("Alias for overall_length_mm"),
  corner_radius_mm:     z.number().min(0).optional().describe("Corner / nose radius, mm (0 = sharp)"),
  helix_angle_deg:      z.number().min(0).max(90).optional().describe("Helix angle, degrees"),
  point_angle_deg:      z.number().min(0).max(180).optional().describe("Drill point angle, degrees (default 118)"),

  // Flutes
  flutes:               z.number().int().positive().optional().describe("Number of cutting flutes"),
  flute_count:          z.number().int().positive().optional().describe("Alias for flutes"),

  // Holder / assembly
  taper:                z.string().optional().describe("Spindle taper interface (CAT40, BT40, HSK-A63, etc.)"),
  gauge_length_mm:      z.number().positive().optional().describe("Gauge / projection length from spindle face, mm"),
  holder_type:          z.string().optional().describe("Holder style (ER_collet, shrink_fit, hydraulic, etc.)"),

  // Material / coating
  material:             z.string().optional().describe("Substrate material (carbide, hss, cermet, cbn, pcd, ceramic)"),
  coating:              z.string().optional().describe("Coating designation (TiAlN, AlCrN, TiN, DLC, uncoated)"),
  grade:                z.string().optional().describe("Insert / substrate grade code"),

  // Cutting data
  spindle_rpm:          z.number().positive().optional().describe("Recommended spindle speed, RPM"),
  feed_mm_min:          z.number().positive().optional().describe("Recommended feed rate, mm/min"),
  cutting_speed_m_min:  z.number().positive().optional().describe("Cutting surface speed, m/min"),
  feed_per_tooth_mm:    z.number().positive().optional().describe("Feed per tooth, mm"),
  depth_of_cut_mm:      z.number().positive().optional().describe("Axial depth of cut, mm"),
  width_of_cut_mm:      z.number().positive().optional().describe("Radial width of cut, mm"),

  // Lifecycle
  tool_life_min:        z.number().min(0).optional().describe("Expected tool life, minutes (0 = unknown)"),
  serial_number:        z.string().optional().describe("Tool serial number for MTConnect assets"),
  status:               z.string().optional().describe("Tool status: active | available | worn | expired | broken | new"),
}).passthrough();

const ExportFormatZ = z.enum([
  "csv",
  "iso13399",
  "mtconnect",
  "stepnc",
]).describe("Target export format");

const ISO13399OptionsSchema = z.object({
  include_assembly: z.boolean().optional().describe(
    "Include ToolAssembly records that combine CuttingItem + AdaptiveItem (default true)"
  ),
  schema_version: z.string().optional().describe(
    "ISO 13399 schema version string (default '2.2')"
  ),
  units: z.enum(["inch", "mm"]).optional().describe(
    "Unit system for dimensional values (default 'mm')"
  ),
}).optional().describe("ISO 13399 export options (only used when format is 'iso13399')");

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS10_U04_SCHEMAS: ActionSchemaMap = {

  /**
   * Export an array of PRISM tools in one of four universal interchange formats:
   *   iso13399 — ISO 13399 GTC XML (CuttingItem, AdaptiveItem, ToolAssembly)
   *   stepnc   — STEP-NC AP238 P21 text (Milling_tool, Cutting_component, Tool_dimension)
   *   mtconnect — MTConnect 1.7 CuttingTool asset XML
   *   csv      — Generic tabular CSV with all dimensional + cutting data columns
   */
  universal_tool_export: z.object({
    tools: z.array(PRISMToolSchema).min(1).max(500).describe(
      "Array of PRISM tool records to export (1–500 tools). Each tool should provide at least id/designation and diameter_mm."
    ),
    format: ExportFormatZ,
    iso13399_options: ISO13399OptionsSchema,
    list_formats: z.boolean().optional().describe(
      "When true, return the list of supported formats and their descriptions instead of exporting tools"
    ),
  }),
};
