/**
 * Okuma .MIN program schema — U-LEARN-03
 * =========================================
 *
 * Structured representation of an Okuma OSP-P300/P200/U100/P100 lathe program
 * after parsing.  Operations are segmented at **tool-change boundaries**
 * (T_change → next T_change = one operation).  Feeds/speeds are carried
 * forward from the most recent modal state.
 *
 * The 22,721-program JM Die corpus is the load-bearing dataset for
 * PSAU-LEARN: these structured operations are joined with
 * OkumaRunLog run metrics to produce labeled training examples.
 *
 * @module schemas/minFileSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-03
 */

import { z } from "zod";

export const MINOperationKind = z.enum([
  "setup",            // pre-T1: G-code header, machine init, work-offset
  "turning",          // T-change with typical turning codes (G1/G2/G3)
  "drilling",         // G83/G74/G81 canned cycle dominant
  "threading",        // G76/G71.4 threading cycle dominant
  "grooving",         // G74/G75 grooving dominant
  "boring",           // turning with internal X range
  "parting",          // G75 parting / X crossover to 0
  "rigid_tap",        // G74/G84 tap cycle
  "probing",          // G31 / probe macro
  "transfer",         // G10/G11 sub-spindle transfer
  "unknown",          // tool change w/ insufficient evidence
]);
export type MINOperationKindT = z.infer<typeof MINOperationKind>;

export const MINOperationSchema = z.object({
  index: z.number().int().nonnegative(),
  kind: MINOperationKind,
  tool_id: z.string(),               // "T0101", "T303", "T1515" etc (raw)
  tool_offset: z.string().optional(),
  block_range: z.tuple([z.number().int(), z.number().int()]),
  line_count: z.number().int().nonnegative(),
  spindle_rpm: z.number().nullable(),        // last S before first cut
  surface_speed_sfm: z.number().nullable(),  // G96 constant-surface-speed if active
  feed_rate: z.number().nullable(),          // F value
  feed_mode: z.enum(["per_rev", "per_min", "unknown"]),
  z_start: z.number().nullable(),
  z_end: z.number().nullable(),
  x_min: z.number().nullable(),
  x_max: z.number().nullable(),
  coolant: z.enum(["flood", "air", "mist", "through", "off", "unknown"]),
  canned_cycles: z.array(z.string()),        // ["G71","G70"]
  subprograms_called: z.array(z.string()),   // ["M98 P1000"]
  comments: z.array(z.string()),             // inline ( ... ) comments
  warnings: z.array(z.string()),
});
export type MINOperation = z.infer<typeof MINOperationSchema>;

export const MINHeaderSchema = z.object({
  program_number: z.string().nullable(),     // O-number from first block, if present
  first_comment: z.string().nullable(),      // leading ( ... ) if any
  units: z.enum(["mm", "inch", "unknown"]),
  work_offset: z.string().nullable(),        // G54/G55/... first seen
  is_main_or_sub: z.enum(["main", "sub", "unknown"]),
});
export type MINHeader = z.infer<typeof MINHeaderSchema>;

export const MINProgramSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source_path: z.string(),
  total_lines: z.number().int().nonnegative(),
  blocks_parsed: z.number().int().nonnegative(),
  header: MINHeaderSchema,
  operations: z.array(MINOperationSchema),
  tools_used: z.array(z.string()),           // dedup'd tool ids
  macros_used: z.array(z.string()),          // VG, VC, VS, VD ... macros seen
  end_code: z.enum(["M30", "M02", "M99", "none"]),
  warnings: z.array(z.string()),
  parse_ok: z.boolean(),
});
export type MINProgram = z.infer<typeof MINProgramSchema>;

export const ParseMINInputSchema = z.object({
  source_path: z.string().default("<inline>"),
  text: z.string(),
  max_lines: z.number().int().positive().max(1_000_000).default(200_000),
});
export type ParseMINInput = z.input<typeof ParseMINInputSchema>;
