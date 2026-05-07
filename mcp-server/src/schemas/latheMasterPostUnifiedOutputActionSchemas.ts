/**
 * Lathe Master Post Unified Output Action Schemas
 * ================================================
 * Zod schemas for lathe master post unified output actions (U-LTH26).
 *
 * Actions:
 *   lathe_unified_output_header     — Generate unified header block
 *   lathe_unified_output_footer     — Generate unified footer block
 *   lathe_unified_output_full       — Generate complete unified output
 *   lathe_unified_output_compare    — Compare two programs for dialect differences
 *
 * @module schemas/latheMasterPostUnifiedOutputActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ─── Shared Schemas ───────────────────────────────────────────────────────

const DialectSchema = z
  .enum(["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"])
  .describe("Controller dialect for output formatting.");

const ToolEntrySchema = z.object({
  toolNumber: z.number().int().positive().describe("Tool number (T-code)."),
  toolType: z.string().min(1).describe("Tool type (e.g., CNMG, VNMG)."),
  description: z.string().describe("Tool description."),
  compensation: z.number().int().optional().describe("Tool compensation number."),
});

const ProgramMetadataSchema = z.object({
  programNumber: z.string().min(1).describe("Program number (O-number)."),
  programName: z.string().min(1).describe("Program name for header comment."),
  machineName: z.string().min(1).describe("Machine name."),
  controller: z.string().min(1).describe("Controller identifier."),
  dialect: DialectSchema,
  partNumber: z.string().optional().describe("Part number."),
  revision: z.string().optional().describe("Part revision."),
  material: z.string().optional().describe("Material specification."),
  operation: z.string().optional().describe("Operation type."),
  setupNotes: z.array(z.string()).optional().describe("Setup notes for operator."),
  toolList: z.array(ToolEntrySchema).optional().describe("Tool list with descriptions."),
  estimatedCycleTime: z.number().optional().describe("Estimated cycle time in seconds."),
  checksumType: z.enum(["crc32", "md5", "none"]).optional().describe("Checksum algorithm."),
  checksum: z.string().optional().describe("Program checksum value."),
});

// ─── lathe_unified_output_header ──────────────────────────────────────────

const lathe_unified_output_header = z
  .object({
    dialect: DialectSchema,
    metadata: ProgramMetadataSchema.describe("Program metadata for header generation."),
    include_tool_list: z.boolean().optional().describe("Include tool list in header. Default: false."),
    include_setup_notes: z.boolean().optional().describe("Include setup notes. Default: false."),
    include_checksum: z.boolean().optional().describe("Include checksum. Default: false."),
    comment_style: z
      .enum(["parentheses", "semicolon"])
      .optional()
      .describe("Comment style. Default: dialect-specific."),
    line_number_start: z.number().int().optional().describe("Starting line number."),
    line_number_increment: z.number().int().optional().describe("Line number increment."),
  })
  .passthrough();

// ─── lathe_unified_output_footer ──────────────────────────────────────────

const lathe_unified_output_footer = z
  .object({
    dialect: DialectSchema,
    include_statistics: z.boolean().optional().describe("Include generation statistics. Default: false."),
    include_return_to_home: z.boolean().optional().describe("Include return to home. Default: true."),
    home_position: z
      .object({
        x: z.number().describe("X home position."),
        z: z.number().describe("Z home position."),
      })
      .optional()
      .describe("Custom home position."),
    program_end_code: z.enum(["M30", "M02", "M99"]).optional().describe("Program end code. Default: M30."),
    comment_style: z
      .enum(["parentheses", "semicolon"])
      .optional()
      .describe("Comment style. Default: dialect-specific."),
  })
  .passthrough();

// ─── lathe_unified_output_full ────────────────────────────────────────────

const lathe_unified_output_full = z
  .object({
    dialect: DialectSchema,
    metadata: ProgramMetadataSchema.describe("Program metadata."),
    include_tool_list: z.boolean().optional().describe("Include tool list."),
    include_setup_notes: z.boolean().optional().describe("Include setup notes."),
    include_statistics: z.boolean().optional().describe("Include generation statistics in footer."),
    include_return_to_home: z.boolean().optional().describe("Include return to home in footer."),
    program_end_code: z.enum(["M30", "M02", "M99"]).optional().describe("Program end code."),
  })
  .passthrough();

// ─── lathe_unified_output_compare ─────────────────────────────────────────

const ProgramBlockSchema = z.object({
  header: z.array(z.string()).describe("Header lines."),
  body: z.array(z.string()).describe("Body lines."),
  footer: z.array(z.string()).describe("Footer lines."),
  dialect: DialectSchema,
});

const lathe_unified_output_compare = z
  .object({
    program_a: ProgramBlockSchema.describe("First program for comparison."),
    program_b: ProgramBlockSchema.describe("Second program for comparison."),
  })
  .passthrough();

// ─── Export map ───────────────────────────────────────────────────────────

export const ACTION_LATHE_UNIFIED_OUTPUT_SCHEMAS: ActionSchemaMap = {
  lathe_unified_output_header,
  lathe_unified_output_footer,
  lathe_unified_output_full,
  lathe_unified_output_compare,
};
