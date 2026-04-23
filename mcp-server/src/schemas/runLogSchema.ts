/**
 * Machine run log schema — U-LEARN-03
 * =====================================
 *
 * Structured representation of CNC controller run logs that capture
 * actual machining metrics (vs programmed values):
 * - Spindle load %
 * - Feedrate override %
 * - Actual feedrate mm/min
 * - Cycle time
 * - Tool life consumed
 * - Alarms/faults
 *
 * Used to create labeled training examples by joining with parsed
 * program data: (programmed_feed, actual_feed, override%) tuples.
 *
 * @module schemas/runLogSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-03
 */

import { z } from "zod";

export const RunLogEntrySchema = z.object({
  timestamp: z.string().describe("ISO8601 or controller timestamp"),
  event_type: z.enum([
    "cycle_start",
    "cycle_end",
    "tool_change",
    "feed_override",
    "spindle_override",
    "spindle_load",
    "alarm",
    "warning",
    "probe_result",
    "part_count",
    "dwell",
    "custom",
  ]).describe("Event classification"),
  tool_number: z.number().int().nullable().describe("Active tool if known"),
  block_number: z.number().int().nullable().describe("N-block if present"),
  program_number: z.string().nullable().describe("O-number being executed"),
  values: z.record(z.string(), z.nullable(z.union([z.string(), z.number(), z.boolean()]))).describe("Event-specific values"),
}).describe("Single log entry");
export type RunLogEntry = z.infer<typeof RunLogEntrySchema>;

export const SpindleLoadSampleSchema = z.object({
  timestamp: z.string(),
  tool_number: z.number().int(),
  load_percent: z.number().min(0).max(200).describe("Spindle load 0-200%"),
  rpm_actual: z.number().nullable(),
  rpm_commanded: z.number().nullable(),
}).describe("Spindle load sample");
export type SpindleLoadSample = z.infer<typeof SpindleLoadSampleSchema>;

export const FeedOverrideSampleSchema = z.object({
  timestamp: z.string(),
  tool_number: z.number().int().nullable(),
  override_percent: z.number().min(0).max(200).describe("Feed override 0-200%"),
  feedrate_actual: z.number().nullable().describe("Actual feedrate mm/min or ipm"),
  feedrate_commanded: z.number().nullable().describe("Programmed feedrate"),
}).describe("Feed override sample");
export type FeedOverrideSample = z.infer<typeof FeedOverrideSampleSchema>;

export const AlarmEntrySchema = z.object({
  timestamp: z.string(),
  alarm_code: z.string().describe("Controller alarm code"),
  alarm_text: z.string().describe("Alarm description"),
  severity: z.enum(["info", "warning", "error", "critical"]),
  tool_number: z.number().int().nullable(),
  program_number: z.string().nullable(),
  block_number: z.number().int().nullable(),
}).describe("Alarm/fault entry");
export type AlarmEntry = z.infer<typeof AlarmEntrySchema>;

export const CycleTimeSummarySchema = z.object({
  program_number: z.string(),
  cycle_start: z.string().describe("ISO8601 start time"),
  cycle_end: z.string().describe("ISO8601 end time"),
  duration_sec: z.number().nonnegative().describe("Total cycle time seconds"),
  cutting_time_sec: z.number().nonnegative().nullable().describe("Time in cut"),
  rapid_time_sec: z.number().nonnegative().nullable().describe("Rapid traverse time"),
  dwell_time_sec: z.number().nonnegative().nullable().describe("Time in dwells"),
  tool_change_count: z.number().int().nonnegative(),
  part_count: z.number().int().nonnegative().default(1),
  operator_id: z.string().nullable(),
}).describe("Cycle time summary");
export type CycleTimeSummary = z.infer<typeof CycleTimeSummarySchema>;

export const RunLogSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source_path: z.string().describe("Log file path"),
  machine_id: z.string().describe("Machine identifier"),
  controller: z.enum(["okuma", "fanuc", "mazak", "haas", "hurco", "siemens", "unknown"]),
  date_range: z.object({
    start: z.string().describe("First entry timestamp"),
    end: z.string().describe("Last entry timestamp"),
  }),
  entries: z.array(RunLogEntrySchema).describe("All log entries"),
  spindle_samples: z.array(SpindleLoadSampleSchema).describe("Spindle load samples"),
  feed_samples: z.array(FeedOverrideSampleSchema).describe("Feed override samples"),
  alarms: z.array(AlarmEntrySchema).describe("Alarms and faults"),
  cycle_summaries: z.array(CycleTimeSummarySchema).describe("Per-program cycle times"),
  warnings: z.array(z.string()),
  parse_ok: z.boolean(),
}).describe("Parsed machine run log");
export type RunLog = z.infer<typeof RunLogSchema>;

export const ParseRunLogInputSchema = z.object({
  source_path: z.string().default("<inline>").describe("File path for provenance"),
  text: z.string().describe("Raw log text"),
  machine_id: z.string().default("unknown").describe("Machine identifier"),
  controller: z.enum(["okuma", "fanuc", "mazak", "haas", "hurco", "siemens", "unknown"]).default("unknown"),
  max_entries: z.number().int().positive().max(10_000_000).default(1_000_000),
}).describe("Input for run log parser");
export type ParseRunLogInput = z.infer<typeof ParseRunLogInputSchema>;
