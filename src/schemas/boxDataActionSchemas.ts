/**
 * BOX Data Action Schemas — Zod v4
 *
 * 15 dispatcher actions across 3 engines from H:\prism\BOX analysis:
 *
 * FusionCPSParserEngine (5 actions):
 *   cps_parse_file            — Parse a single CPS post processor file
 *   cps_parse_directory       — Parse all CPS files in a directory
 *   cps_search                — Search parsed CPS data by vendor/capability
 *   cps_property_catalog      — Build cross-controller property catalog
 *   cps_compare_controllers   — Compare two controllers side-by-side
 *
 * OkumaParametricProgramEngine (5 actions):
 *   okuma_generate_casing     — Generate Okuma OSP casing turning program
 *   okuma_generate_cbore      — Generate counter-bore turning program
 *   okuma_validate_macro      — Validate Okuma macro syntax
 *   okuma_parse_macro         — Reverse-parse macro into config
 *   okuma_defaults            — Get smart defaults for material
 *
 * PostProcessorCapabilityMatrixEngine (5 actions):
 *   pp_capability_matrix      — Get full capability matrix
 *   pp_capability_query       — Query controllers by capability
 *   pp_capability_compare     — Compare 2+ controllers
 *   pp_select_post            — Recommend best post for requirements
 *   pp_capability_summary     — Quick stats summary
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── FusionCPSParser Schemas ─────────────────────────────────────────────

const cpsParseFileZ = z.object({
  file_path: z.string().describe("Path to a .cps file to parse"),
});

const cpsParseDirectoryZ = z.object({
  directory: z.string().optional().default("H:/prism/BOX/FUSION BASIC POSTS").describe(
    "Directory containing .cps files"
  ),
});

const cpsSearchZ = z.object({
  vendor: z.string().optional().describe("Filter by vendor name (e.g. 'Fanuc', 'Haas')"),
  capability: z.string().optional().describe("Filter by capability (e.g. 'MILLING', 'TURNING')"),
  property: z.string().optional().describe("Find controllers that have this property key"),
});

const cpsPropertyCatalogZ = z.object({
  directory: z.string().optional().default("H:/prism/BOX/FUSION BASIC POSTS").describe(
    "Directory of CPS files to analyze"
  ),
});

const cpsCompareControllersZ = z.object({
  controller_a: z.string().describe("First controller name/description"),
  controller_b: z.string().describe("Second controller name/description"),
});

// ── OkumaParametricProgram Schemas ──────────────────────────────────────

const okumaGenerateCasingZ = z.object({
  stock_diameter: z.number().positive().describe("Stock bar diameter, inches"),
  finish_od: z.number().positive().describe("Finished OD, inches"),
  finish_id: z.number().positive().optional().describe("Bore/ID diameter, inches"),
  part_length: z.number().positive().describe("Part length, inches"),
  drill_diameter: z.number().positive().optional().describe("Drill size, inches"),
  od_rough_sfm: z.number().positive().optional().default(755).describe("OD rough SFM"),
  od_finish_sfm: z.number().positive().optional().default(825).describe("OD finish SFM"),
  material: z.string().optional().describe("Material name for smart defaults"),
});

const okumaGenerateCboreZ = z.object({
  stock_diameter: z.number().positive().describe("Stock bar diameter, inches"),
  finish_od: z.number().positive().describe("Finished OD, inches"),
  counter_bore_dia: z.number().positive().describe("Counter bore diameter, inches"),
  counter_bore_depth: z.number().positive().describe("Counter bore depth, inches"),
  part_length: z.number().positive().describe("Part length, inches"),
  material: z.string().optional().describe("Material name for smart defaults"),
});

const okumaValidateMacroZ = z.object({
  gcode: z.string().describe("Okuma macro program text to validate"),
});

const okumaParseMacroZ = z.object({
  gcode: z.string().describe("Okuma macro program text to reverse-parse"),
});

const okumaDefaultsZ = z.object({
  material: z.string().optional().default("4140").describe("Material name or grade"),
  operation: z.string().optional().default("turning").describe("Operation type"),
});

// ── PostProcessorCapabilityMatrix Schemas ───────────────────────────────

const ppCapabilityMatrixZ = z.object({
  family: z.string().optional().describe("Filter to specific controller family"),
});

const ppCapabilityQueryZ = z.object({
  capability: z.string().optional().describe("e.g. 'MILLING', 'TURNING', 'MILL_TURN'"),
  smoothing: z.string().optional().describe("e.g. 'G05.1', 'G187', 'CYCLE832'"),
  retract: z.string().optional().describe("e.g. 'G28', 'G53', 'SUPA'"),
  multi_axis: z.string().optional().describe("e.g. 'DWO', 'TCPM', 'TRAORI'"),
  min_axes: z.number().int().optional().describe("Minimum simultaneous axes"),
  probing: z.boolean().optional().describe("Requires probing support"),
  vendor: z.string().optional().describe("Filter by vendor name"),
});

const ppCapabilityCompareZ = z.object({
  controllers: z.array(z.string()).min(2).describe("Controller family names to compare"),
});

const ppSelectPostZ = z.object({
  capabilities: z.array(z.string()).optional().describe("Required capabilities"),
  smoothing: z.string().optional(),
  multi_axis: z.string().optional(),
  min_axes: z.number().int().optional(),
  probing: z.boolean().optional(),
});

const ppCapabilitySummaryZ = z.object({}).optional();

// ── Export ───────────────────────────────────────────────────────────────

export const ACTION_BOX_DATA_SCHEMAS: ActionSchemaMap = {
  cps_parse_file: cpsParseFileZ,
  cps_parse_directory: cpsParseDirectoryZ,
  cps_search: cpsSearchZ,
  cps_property_catalog: cpsPropertyCatalogZ,
  cps_compare_controllers: cpsCompareControllersZ,
  okuma_generate_casing: okumaGenerateCasingZ,
  okuma_generate_cbore: okumaGenerateCboreZ,
  okuma_validate_macro: okumaValidateMacroZ,
  okuma_parse_macro: okumaParseMacroZ,
  okuma_defaults: okumaDefaultsZ,
  pp_capability_matrix: ppCapabilityMatrixZ,
  pp_capability_query: ppCapabilityQueryZ,
  pp_capability_compare: ppCapabilityCompareZ,
  pp_select_post: ppSelectPostZ,
  pp_capability_summary: ppCapabilitySummaryZ ?? z.object({}),
};
