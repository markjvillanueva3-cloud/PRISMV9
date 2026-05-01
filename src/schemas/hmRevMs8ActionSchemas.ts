/**
 * HM-REV-MS8 Action Schemas — Data Extraction Pipeline (5 databases)
 *
 * Zod schemas for:
 *   hypermill_extract_tools          — demo.db SQLite extraction (U-HMR41)
 *   hypermill_extraction_schema      — schema info (geometry classes)
 *   hypermill_extraction_stats       — extraction statistics
 *   hypermill_extract_macros         — IM_Macro_DB extraction (U-HMR42)
 *   hypermill_extract_im_tools       — IM_Tool_DB v1 extraction (U-HMR42)
 *   hypermill_macro_schema           — macro DB schema info
 *   hypermill_extract_ac_tools       — AC_Standard_ToolDB extraction (U-HMR43)
 *   hypermill_ac_tool_schema         — AC schema info
 *   hypermill_extract_metric_cfg     — Metric.cfg full extraction (U-HMR44)
 *   hypermill_cfg_stats              — Metric.cfg extraction stats
 *   hypermill_cfg_diff               — diff two controller profiles
 *   hypermill_data_extract_all       — run all 5 pipelines (U-HMR48)
 *   hypermill_data_status            — freshness + extraction status
 *   hypermill_data_freshness_check   — standalone freshness check
 *
 * HM-REV-MS8 / U-HMR41 + U-HMR42 + U-HMR43 + U-HMR44 + U-HMR48
 */

import { z } from "zod";

// ── Shared sub-schemas ─────────────────────────────────────────────────────────

const hmPathsZ = z.object({
  demo_db: z.string().optional().describe("Path to demo.db SQLite file"),
  im_macro_db: z.string().optional().describe("Path to IM_Macro_DB directory or file"),
  ac_standard_tool_db: z.string().optional().describe("Path to AC_Standard_ToolDB directory"),
  im_tool_db: z.string().optional().describe("Path to IM_Tool_DB v1 directory or file"),
  metric_cfg_dir: z.string().optional().describe("Path to Metric.cfg directory (138 files)"),
  output_dir: z.string().optional().describe("Output directory for extracted JSON files"),
}).describe("hyperMILL installation path overrides (use defaults if omitted)");

// ── Action Schemas ─────────────────────────────────────────────────────────────

export const ACTION_HM_REV_MS8_SCHEMAS: Record<string, z.ZodTypeAny> = {

  /**
   * Extract tool definitions from demo.db SQLite database (U-HMR41).
   * Extracts 547 tools across 29 geometry classes + 2,706 cutting technology entries.
   * Returns empty result gracefully when demo.db is not present.
   */
  hypermill_extract_tools: z.object({
    db_path: z.string().optional().describe(
      "Path to demo.db SQLite file. Defaults to C:/Program Files/OPEN MIND/hyperMILL/33.0/Tool Database/demo.db"
    ),
    output_dir: z.string().optional().describe(
      "Directory to write hypermill-demo-db-tools.json and hypermill-demo-db-cutting-tech.json"
    ),
    include_cutting_techs: z.boolean().optional().default(true).describe(
      "Whether to extract cutting technology entries (speed/feed/depth per material)"
    ),
  }),

  /**
   * Return the full schema info for the demo.db extraction format.
   * Describes all 29 geometry classes and their parameter mappings.
   * Works without a demo.db installation.
   */
  hypermill_extraction_schema: z.object({
    geometry_class: z.number().int().optional().describe(
      "Filter schema info for a specific geometry class ID (1=Ballmill, 2=Endmill, etc.) — omit for all 29 classes"
    ),
  }),

  /**
   * Return extraction statistics for a previous demo.db extraction result.
   * Includes tool count, cutting tech count, geometry classes found.
   */
  hypermill_extraction_stats: z.object({
    output_dir: z.string().optional().describe(
      "Directory containing previously extracted JSON files — reads extraction-metadata.json for stats"
    ),
  }),

  /**
   * Extract macro definitions from IM_Macro_DB (U-HMR42).
   * Returns built-in drilling macro catalog when path is absent.
   * Extracts: peck depth formulas, pilot hole sizing, countersink angles, tapping.
   */
  hypermill_extract_macros: z.object({
    db_path: z.string().optional().describe(
      "Path to IM_Macro_DB directory. Returns built-in catalog if omitted or path missing."
    ),
    include_formulas: z.boolean().optional().default(true).describe(
      "Include extracted FormulaRegistry entries (F-HM-EXT-NNN series)"
    ),
    macro_type: z.enum([
      "peck_drilling", "deep_hole_drilling", "spot_facing", "countersink",
      "counterbore", "reaming", "tapping", "boring", "feature_to_job", "generic",
    ]).optional().describe("Filter to a specific macro type — omit for all types"),
  }),

  /**
   * Extract tool definitions from IM_Tool_DB v1 (U-HMR42).
   * Returns legacy tool catalog with Taylor wear coefficients.
   */
  hypermill_extract_im_tools: z.object({
    db_path: z.string().optional().describe(
      "Path to IM_Tool_DB directory. Returns built-in legacy catalog if omitted."
    ),
    geometry_class: z.string().optional().describe(
      "Filter by geometry class name (e.g. 'Endmill', 'Ballmill', 'Drilltool')"
    ),
  }),

  /**
   * Return schema info for the IM_Macro_DB and IM_Tool_DB extraction format.
   */
  hypermill_macro_schema: z.object({}),

  /**
   * Extract tool definitions from AC_Standard_ToolDB (U-HMR43).
   * Maps all 29 geometry classes to PRISM tool types.
   * Includes holder assembly data + material compatibility entries.
   */
  hypermill_extract_ac_tools: z.object({
    db_path: z.string().optional().describe(
      "Path to AC_Standard_ToolDB directory or XML file. Returns built-in catalog if omitted."
    ),
    geometry_class: z.string().optional().describe(
      "Filter by geometry class name (e.g. 'Endmill', 'Ballmill', 'Radiusmill')"
    ),
    include_holders: z.boolean().optional().default(true).describe(
      "Include holder assembly data (gauge length, projection, max RPM)"
    ),
    include_material_compat: z.boolean().optional().default(true).describe(
      "Include material compatibility entries (Vc/fz correction factors per ISO group)"
    ),
  }),

  /**
   * Return schema info for the AC_Standard_ToolDB extraction format.
   */
  hypermill_ac_tool_schema: z.object({}),

  /**
   * Extract all Metric.cfg files from the hyperMILL installation (U-HMR44).
   * Reads 138+ controller-specific configuration files.
   * Returns built-in 5-controller catalog when directory is absent.
   * All parameter types preserved: int, float, formula, enum, boolean, string.
   */
  hypermill_extract_metric_cfg: z.object({
    cfg_dir: z.string().optional().describe(
      "Path to Metric.cfg directory. Defaults to C:/Program Files/OPEN MIND/hyperMILL/33.0/Metric.cfg"
    ),
    controller_family: z.enum([
      "fanuc", "siemens", "haas", "mazak", "heidenhain", "mitsubishi", "okuma", "generic",
    ]).optional().describe("Filter profiles by controller family — omit for all controllers"),
    cycle_code: z.string().optional().describe(
      "Filter to a specific cycle code (e.g. 'hmSlf3', 'hmCrt', 'hmDrilling') — omit for all cycles"
    ),
    include_raw: z.boolean().optional().default(false).describe(
      "Include raw INI section data in the output (large — use for debugging)"
    ),
  }),

  /**
   * Return extraction statistics for a previous Metric.cfg extraction.
   */
  hypermill_cfg_stats: z.object({
    cfg_dir: z.string().optional().describe("Metric.cfg directory used for extraction"),
  }),

  /**
   * Compute a parameter diff between two controller profiles for a given cycle.
   * Shows which parameters differ, which are identical, and which are unique to each profile.
   */
  hypermill_cfg_diff: z.object({
    profile_a: z.string().describe(
      "First controller profile name (e.g. 'FANUC0M', 'SINUMERIK840D', 'HAAS_VF')"
    ),
    profile_b: z.string().describe("Second controller profile name to compare against"),
    cycle_code: z.string().describe(
      "Cycle code to diff (e.g. 'hmSlf3' for 3D Z-Level Finishing, 'hmCrt' for 2D Contour Roughing)"
    ),
    cfg_dir: z.string().optional().describe("Metric.cfg directory — omit to use built-in profiles"),
  }),

  /**
   * Run all 5 extraction pipelines in sequence (U-HMR48).
   * Handles missing DBs gracefully — returns partial results.
   * Writes extracted JSON files to output_dir if provided.
   * Saves extraction-metadata.json for freshness tracking.
   */
  hypermill_data_extract_all: z.object({
    paths: hmPathsZ.optional().describe(
      "Override default hyperMILL installation paths. All fields optional — use defaults for standard installation."
    ),
    output_dir: z.string().optional().describe(
      "Directory to write all extracted JSON files. Defaults to data/hypermill-extracted/"
    ),
  }),

  /**
   * Return per-database extraction status without re-running extraction.
   * Reads saved extraction-metadata.json for freshness information.
   */
  hypermill_data_status: z.object({
    paths: hmPathsZ.optional().describe("Override default installation paths for existence checks"),
    output_dir: z.string().optional().describe(
      "Directory containing extraction-metadata.json. Defaults to data/hypermill-extracted/"
    ),
  }),

  /**
   * Standalone freshness check — returns warning if data is > 30 days old.
   */
  hypermill_data_freshness_check: z.object({
    output_dir: z.string().optional().describe(
      "Directory containing extraction-metadata.json. Defaults to data/hypermill-extracted/"
    ),
  }),
};
