/**
 * Tool Database Parameter Schemas — hyperMILL Settings
 *
 * U-HKC37: Zod schemas for tool database path, coupling, and filter settings.
 *
 * AC Python call pattern:
 *   hm.settings.tool_db.set_path(default_tdb_path="...", ...)
 *
 * @domain Settings / Tool Database
 * @milestone HM-KC-MS7/U-HKC37
 */

import { z } from "zod";

// ============================================================================
// 1. TOOL DATABASE PATH SETTINGS (4 params)
// ============================================================================

export const toolDatabasePathSettingsSchema = z.object({
  default_tdb_path: z
    .string()
    .min(1)
    .default("C:/hyperMILL/ToolDB/default.hmt")
    .describe("Absolute file path to the primary tool database file"),
  fallback_tdb_path: z
    .string()
    .default("")
    .describe("Absolute file path to the fallback tool database used when default is unavailable"),
  auto_load_on_open: z
    .boolean()
    .default(true)
    .describe("Automatically load the tool database when opening a hyperMILL project"),
  tdb_format: z
    .enum(["hmt", "xml"])
    .default("hmt")
    .describe("File format of the tool database: hmt (native binary) or xml (portable text)"),
  validate_on_load: z
    .boolean()
    .default(true)
    .describe("Run schema validation on the tool database when it is loaded to catch corrupt entries early"),
});

export type ToolDatabasePathSettings = z.infer<typeof toolDatabasePathSettingsSchema>;

// ============================================================================
// 2. TOOL COUPLING SETTINGS (4 params)
// ============================================================================

export const toolCouplingSettingsSchema = z.object({
  coupling_type: z
    .enum(["rigid", "floating"])
    .default("rigid")
    .describe("Tool coupling interface type: rigid (fixed) or floating (compliant)"),
  material_table_path: z
    .string()
    .default("")
    .describe("Absolute file path to the cutting material/grade reference table"),
  grade_mapping_mode: z
    .enum(["auto", "manual"])
    .default("auto")
    .describe("Mode for mapping tool grades: auto (by material group) or manual (explicit override)"),
  auto_update_on_change: z
    .boolean()
    .default(true)
    .describe("Automatically refresh coupling data when the tool database is modified"),
});

export type ToolCouplingSettings = z.infer<typeof toolCouplingSettingsSchema>;

// ============================================================================
// 3. TOOL FILTER SETTINGS (5 params)
// ============================================================================

export const toolFilterSettingsSchema = z.object({
  default_filter_type: z
    .enum(["all", "milling", "drilling", "turning"])
    .default("all")
    .describe("Default tool type filter applied when opening the tool database browser"),
  show_assemblies: z
    .boolean()
    .default(true)
    .describe("Include tool assemblies (holder + insert combinations) in the tool list"),
  show_retired: z
    .boolean()
    .default(false)
    .describe("Show retired/obsolete tools in the browser (hidden by default)"),
  max_results: z
    .number()
    .int()
    .min(10)
    .max(1000)
    .default(200)
    .describe("Maximum number of tools returned in a single browser query (10–1000)"),
  sort_by_recent: z
    .boolean()
    .default(false)
    .describe("Sort tool list by most recently used tools first"),
});

export type ToolFilterSettings = z.infer<typeof toolFilterSettingsSchema>;

// ============================================================================
// Schema Map (3 types)
// ============================================================================

/** All tool database settings schemas keyed by type */
export const TOOL_DB_SCHEMA_MAP: Record<string, z.ZodObject<z.ZodRawShape>> = {
  tool_database_path: toolDatabasePathSettingsSchema,
  tool_coupling: toolCouplingSettingsSchema,
  tool_filter: toolFilterSettingsSchema,
};

export type ToolDbSchemaType = keyof typeof TOOL_DB_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

export interface ToolDbMeta {
  paramCount: number;
  acPythonSetter: string;
  description: string;
}

export const TOOL_DB_METADATA: Record<string, ToolDbMeta> = {
  tool_database_path: {
    paramCount: 5,
    acPythonSetter: "hm.settings.tool_db.set_path",
    description: "Configure default and fallback tool database file paths, load behavior, and load-time validation",
  },
  tool_coupling: {
    paramCount: 4,
    acPythonSetter: "hm.settings.tool_db.set_coupling",
    description: "Configure tool coupling interface type, material table path, and grade mapping mode",
  },
  tool_filter: {
    paramCount: 5,
    acPythonSetter: "hm.settings.tool_db.set_filter",
    description: "Configure default tool type filter, assembly visibility, and max result count",
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all tool database settings schemas */
export const TOOL_DB_TOTAL_PARAM_COUNT = Object.values(TOOL_DB_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
