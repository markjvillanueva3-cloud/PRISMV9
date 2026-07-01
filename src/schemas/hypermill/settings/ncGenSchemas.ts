/**
 * NC Generation Settings Parameter Schemas — hyperMILL System Settings
 *
 * U-HKC36: Zod schemas for ~20 NC generation system settings covering
 * output folder configuration, naming conventions, sub-programs,
 * line numbering, and output format controls.
 *
 * AC Python call pattern:
 *   hm.settings.output_folder(output_path="/nc/output", create_subfolders=true, ...)
 *
 * @domain Settings / NC Generation
 * @milestone HM-KC-MS7/U-HKC36
 */

import { z } from "zod";

// ============================================================================
// 1. OUTPUT FOLDER SETTINGS (4 params)
// ============================================================================

export const outputFolderSettingsSchema = z.object({
  output_path: z
    .string()
    .min(1)
    .default("C:/NC_Output")
    .describe("Root output directory path for generated NC files"),
  create_subfolders: z
    .boolean()
    .default(true)
    .describe("Automatically create output subdirectories if they do not exist"),
  subfolder_template: z
    .string()
    .default("{date}/{machine}")
    .describe("Template string for automatic subfolder naming (e.g. '{date}/{machine}', '{part}')"),
  overwrite_policy: z
    .enum(["ask", "overwrite", "rename"])
    .default("ask")
    .describe("Behavior when an output file with the same name already exists"),
});

export type OutputFolderSettings = z.infer<typeof outputFolderSettingsSchema>;

// ============================================================================
// 2. NAMING CONVENTION SETTINGS (5 params)
// ============================================================================

export const namingConventionSettingsSchema = z.object({
  file_template: z
    .string()
    .default("{part}_{op}_{rev}")
    .describe("Template string for NC filename generation (e.g. '{part}_{op}_{rev}')"),
  use_sequence_numbers: z
    .boolean()
    .default(false)
    .describe("Append a zero-padded sequence number suffix to output filenames"),
  sequence_start: z
    .number()
    .int()
    .min(0)
    .max(99999)
    .default(1)
    .describe("Starting value for filename sequence numbering"),
  sequence_increment: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(1)
    .describe("Increment between consecutive filename sequence numbers"),
  max_filename_length: z
    .number()
    .int()
    .min(8)
    .max(256)
    .default(64)
    .describe("Maximum allowed filename length in characters (including extension)"),
});

export type NamingConventionSettings = z.infer<typeof namingConventionSettingsSchema>;

// ============================================================================
// 3. SUB-PROGRAM SETTINGS (4 params)
// ============================================================================

export const subProgramSettingsSchema = z.object({
  use_sub_programs: z
    .boolean()
    .default(false)
    .describe("Generate sub-programs for repeated toolpath patterns"),
  sub_program_numbering: z
    .enum(["o_number", "label"])
    .default("o_number")
    .describe("Sub-program reference style: O-number (e.g. O1001) or named label"),
  sub_program_start: z
    .number()
    .int()
    .min(1)
    .max(99999)
    .default(9000)
    .describe("Starting O-number or label index for generated sub-programs"),
  inline_vs_external: z
    .enum(["inline", "external"])
    .default("external")
    .describe("Sub-program output mode: inline within main program or separate file"),
});

export type SubProgramSettings = z.infer<typeof subProgramSettingsSchema>;

// ============================================================================
// 4. LINE NUMBER SETTINGS (5 params)
// ============================================================================

export const lineNumberSettingsSchema = z.object({
  use_line_numbers: z
    .boolean()
    .default(true)
    .describe("Output N-word line numbers in generated NC code"),
  line_number_start: z
    .number()
    .int()
    .min(0)
    .max(999999)
    .default(10)
    .describe("First N-word value in the output NC program"),
  line_number_increment: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(10)
    .describe("Increment between consecutive N-word line numbers"),
  max_line_number: z
    .number()
    .int()
    .min(1)
    .max(99999999)
    .default(99999)
    .describe("Maximum N-word value before sequence wraps or restarts"),
  restart_per_tool: z
    .boolean()
    .default(false)
    .describe("Reset line numbering to line_number_start at each tool change"),
});

export type LineNumberSettings = z.infer<typeof lineNumberSettingsSchema>;

// ============================================================================
// 5. OUTPUT FORMAT SETTINGS (5 params)
// ============================================================================

export const outputFormatSettingsSchema = z.object({
  decimal_places_position: z
    .number()
    .int()
    .min(0)
    .max(6)
    .default(3)
    .describe("Number of decimal places for coordinate (position) output values (0–6)"),
  decimal_places_feed: z
    .number()
    .int()
    .min(0)
    .max(4)
    .default(1)
    .describe("Number of decimal places for feed rate output values (0–4)"),
  use_leading_zeros: z
    .boolean()
    .default(false)
    .describe("Pad numeric values with leading zeros to fill field width"),
  use_trailing_zeros: z
    .boolean()
    .default(true)
    .describe("Retain trailing zeros after decimal point for fixed-format controllers"),
  block_skip_character: z
    .string()
    .max(2)
    .default("/")
    .describe("Block skip character prefix for optional NC blocks (typically '/')"),
});

export type OutputFormatSettings = z.infer<typeof outputFormatSettingsSchema>;

// ============================================================================
// Schema Map (5 types, 23 params total)
// ============================================================================

/** All 5 NC generation settings schemas keyed by type */
export const NC_GEN_SETTINGS_SCHEMA_MAP: Record<string, z.ZodObject<z.ZodRawShape>> = {
  output_folder: outputFolderSettingsSchema,
  naming_convention: namingConventionSettingsSchema,
  sub_program: subProgramSettingsSchema,
  line_numbers: lineNumberSettingsSchema,
  output_format: outputFormatSettingsSchema,
};

export type NcGenSettingsType = keyof typeof NC_GEN_SETTINGS_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

export interface NcGenSettingsMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
}

export const NC_GEN_SETTINGS_METADATA: Record<NcGenSettingsType, NcGenSettingsMeta> = {
  output_folder: {
    paramCount: 4,
    acPythonSetter: "hm.settings.output_folder",
    description: "NC output directory path, subfolder creation, template, and overwrite policy",
  },
  naming_convention: {
    paramCount: 5,
    acPythonSetter: "hm.settings.naming_convention",
    description: "Filename template, sequence numbering, and max filename length",
  },
  sub_program: {
    paramCount: 4,
    acPythonSetter: "hm.settings.sub_program",
    description: "Sub-program generation: numbering style, start index, inline vs external",
  },
  line_numbers: {
    paramCount: 5,
    acPythonSetter: "hm.settings.line_numbers",
    description: "N-word line numbering: start, increment, maximum, and per-tool restart",
  },
  output_format: {
    paramCount: 5,
    acPythonSetter: "hm.settings.output_format",
    description: "Decimal places, leading/trailing zeros, and block skip character",
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all 5 NC generation settings schemas */
export const NC_GEN_SETTINGS_TOTAL_PARAM_COUNT = Object.values(NC_GEN_SETTINGS_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
