/**
 * Standard G-code NC file schema — U-LEARN-03
 * =============================================
 *
 * Structured representation of standard G-code programs (Haas, Fanuc, etc.)
 * These are the .NC files output by CAM systems like Mastercam.
 *
 * The parser extracts:
 * - Program number and title from comments
 * - Tool changes with tool info from comments
 * - Speeds and feeds per operation
 * - Toolpath type from Mastercam comments
 * - Motion counts and coordinate extrema
 *
 * @module schemas/ncFileSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-03
 */

import { z } from "zod";

export const NCOperationKind = z.enum([
  "setup",
  "roughing",
  "finishing",
  "drilling",
  "tapping",
  "boring",
  "facing",
  "contouring",
  "pocketing",
  "slotting",
  "threading",
  "engraving",
  "probing",
  "unknown",
]).describe("Operation classification based on toolpath comments");
export type NCOperationKindT = z.infer<typeof NCOperationKind>;

export const NCToolInfo = z.object({
  tool_number: z.number().int().positive().describe("Tool station number"),
  diameter_in: z.number().nullable().describe("Tool diameter in inches"),
  diameter_mm: z.number().nullable().describe("Tool diameter in mm"),
  corner_radius: z.number().nullable().describe("Corner radius"),
  description: z.string().describe("Tool description from comment"),
  holder_offset: z.string().nullable().describe("H offset number"),
  diameter_offset: z.string().nullable().describe("D offset number"),
}).describe("Tool information extracted from comments");
export type NCToolInfo = z.infer<typeof NCToolInfo>;

export const NCOperationSchema = z.object({
  index: z.number().int().nonnegative().describe("0-based operation index"),
  kind: NCOperationKind,
  tool_number: z.number().int().nonnegative().describe("Tool used (0 if unknown)"),
  tool_info: NCToolInfo.optional().describe("Tool details if available"),
  toolpath_name: z.string().nullable().describe("Mastercam toolpath name from comment"),
  block_range: z.tuple([z.number().int(), z.number().int()]).describe("[start_line, end_line]"),
  line_count: z.number().int().nonnegative(),
  spindle_rpm: z.number().nullable(),
  feed_rate: z.number().nullable().describe("Primary feed rate"),
  feed_mode: z.enum(["per_min", "per_rev", "unknown"]),
  z_max: z.number().nullable(),
  z_min: z.number().nullable(),
  work_offset: z.string().nullable().describe("G54, G55, etc."),
  coolant: z.enum(["flood", "mist", "air", "through", "off", "unknown"]),
  motion_count: z.object({
    rapid: z.number().int().nonnegative().describe("G00 count"),
    linear: z.number().int().nonnegative().describe("G01 count"),
    arc_cw: z.number().int().nonnegative().describe("G02 count"),
    arc_ccw: z.number().int().nonnegative().describe("G03 count"),
  }),
  canned_cycles: z.array(z.string()).describe("G81, G83, G84, etc."),
  comments: z.array(z.string()).describe("Inline comments"),
  warnings: z.array(z.string()),
}).describe("Single tool operation");
export type NCOperation = z.infer<typeof NCOperationSchema>;

export const NCHeaderSchema = z.object({
  program_number: z.string().nullable().describe("O-number"),
  title: z.string().nullable().describe("Title from first comment"),
  date: z.string().nullable().describe("DATE comment"),
  time: z.string().nullable().describe("TIME comment"),
  units: z.enum(["inch", "mm", "unknown"]),
  controller: z.enum(["haas", "fanuc", "okuma", "mazak", "hurco", "siemens", "unknown"]),
  cam_system: z.enum(["mastercam", "hypermill", "fusion360", "nx", "catia", "unknown"]),
  stock_left: z.number().nullable().describe("Stock left on surfaces from comment"),
  compensation_type: z.enum(["computer", "control", "unknown"]),
}).describe("Program header metadata");
export type NCHeader = z.infer<typeof NCHeaderSchema>;

export const NCProgramSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source_path: z.string(),
  total_lines: z.number().int().nonnegative(),
  blocks_parsed: z.number().int().nonnegative(),
  header: NCHeaderSchema,
  tools: z.array(NCToolInfo).describe("All tools used"),
  operations: z.array(NCOperationSchema),
  z_overall_max: z.number().nullable(),
  z_overall_min: z.number().nullable(),
  end_code: z.enum(["M30", "M02", "M99", "M00", "none"]),
  warnings: z.array(z.string()),
  parse_ok: z.boolean(),
}).describe("Parsed NC program");
export type NCProgram = z.infer<typeof NCProgramSchema>;

export const ParseNCInputSchema = z.object({
  source_path: z.string().default("<inline>").describe("File path for provenance"),
  text: z.string().describe("Raw G-code text"),
  max_lines: z.number().int().positive().max(1_000_000).default(500_000),
}).describe("Input for NC parser");
export type ParseNCInput = z.infer<typeof ParseNCInputSchema>;
