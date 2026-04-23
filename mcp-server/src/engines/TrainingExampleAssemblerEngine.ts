// WIRE-EXEMPT: tests in __tests__/engines/mlCorpusU-LEARN-03.test.ts
/**
 * TrainingExampleAssemblerEngine — U-LEARN-03
 * =============================================
 *
 * Joins parsed program operations with run log metrics to create labeled
 * training examples for ML models. The join key is:
 * (customer, part_number, program_number, operation_index, date)
 *
 * Output schema produces rows with:
 * - Programmed values: spindle_rpm, feed_rate, tool, coolant
 * - Actual values: spindle_load_avg, feed_override_avg, cycle_time
 * - Labels: override_delta (actual - programmed), quality outcome
 *
 * @module engines/TrainingExampleAssemblerEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-03
 */

import { z } from "zod";
import type { MINProgram, MINOperation } from "../schemas/minFileSchema.js";
import type { NCProgram, NCOperation } from "../schemas/ncFileSchema.js";
import type { RunLog } from "../schemas/runLogSchema.js";

// ── Schemas ────────────────────────────────────────────────────────────────

export const TrainingExampleSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  example_id: z.string().describe("Unique identifier for this example"),
  source_program: z.string().describe("Source program file path"),
  source_log: z.string().nullable().describe("Source run log file path if available"),
  customer: z.string().describe("Customer name from path"),
  part_number: z.string().nullable().describe("Part number if extractable"),
  program_number: z.string().nullable().describe("O-number"),
  operation_index: z.number().int().nonnegative(),
  operation_kind: z.string().describe("Operation classification"),
  machine_type: z.enum(["lathe", "mill", "wire_edm", "sinker_edm", "grinder", "unknown"]),

  // Programmed values (from parsed program)
  programmed: z.object({
    tool_id: z.string(),
    tool_diameter_mm: z.number().nullable(),
    spindle_rpm: z.number().nullable(),
    surface_speed_sfm: z.number().nullable(),
    feed_rate: z.number().nullable(),
    feed_mode: z.string(),
    coolant: z.string(),
    z_span: z.number().nullable(),
    x_span: z.number().nullable(),
    line_count: z.number().int(),
    canned_cycles: z.array(z.string()),
  }),

  // Actual values (from run log, nullable if no log)
  actual: z.object({
    spindle_load_avg: z.number().nullable(),
    spindle_load_max: z.number().nullable(),
    feed_override_avg: z.number().nullable(),
    feed_override_min: z.number().nullable(),
    cycle_time_sec: z.number().nullable(),
    alarm_count: z.number().int().nullable(),
  }),

  // Derived labels for training
  labels: z.object({
    feed_delta_pct: z.number().nullable().describe("(actual - programmed) / programmed * 100"),
    was_overridden: z.boolean().describe("True if override != 100%"),
    high_spindle_load: z.boolean().describe("True if max load > 80%"),
    had_alarm: z.boolean().describe("True if alarm during operation"),
  }),

  // Metadata
  metadata: z.object({
    units: z.string(),
    controller: z.string(),
    cam_system: z.string().nullable(),
    date: z.string().nullable(),
  }),
}).describe("Single training example");
export type TrainingExample = z.infer<typeof TrainingExampleSchema>;

export const AssemblerInputSchema = z.object({
  programs: z.array(z.object({
    type: z.enum(["min", "nc"]),
    program: z.unknown().describe("MINProgram or NCProgram"),
  })),
  run_logs: z.array(z.unknown()).describe("Array of RunLog objects"),
  customer_name: z.string().default("unknown"),
  machine_type: z.enum(["lathe", "mill", "wire_edm", "sinker_edm", "grinder", "unknown"]).default("unknown"),
}).describe("Input for assembler");
export type AssemblerInput = z.infer<typeof AssemblerInputSchema>;

// ── Path parsing utilities ─────────────────────────────────────────────────

/**
 * Extract customer name from JM Die path structure.
 * Pattern: JM DIE/CNC LATHE/CUSTOMER_NAME/...
 */
function extractCustomer(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");

  // Find index after "JM DIE" and machine type
  const jmIdx = parts.findIndex(p => p.toUpperCase() === "JM DIE");
  if (jmIdx >= 0 && jmIdx + 2 < parts.length) {
    // Skip machine type folder (CNC LATHE, CNC MILL HAAS, WIRE EDM, etc.)
    const machineType = parts[jmIdx + 1]?.toUpperCase() ?? "";
    if (machineType.includes("LATHE") || machineType.includes("MILL") ||
        machineType.includes("EDM") || machineType.includes("ROKU")) {
      return parts[jmIdx + 2] ?? "unknown";
    }
  }

  // Fallback: use parent directory name
  const filename = parts[parts.length - 1] ?? "";
  const parent = parts[parts.length - 2] ?? "unknown";
  return parent !== filename ? parent : "unknown";
}

/**
 * Extract part number from filename or path.
 * Common patterns: T2978-008-4D.MIN, B-8372.mcx-8, O1234
 */
function extractPartNumber(path: string, programNumber: string | null): string | null {
  const filename = path.replace(/\\/g, "/").split("/").pop() ?? "";
  const base = filename.replace(/\.(MIN|NC|mcx-8|mcam|MCX)$/i, "");

  // Return base if it looks like a part number (has letters and numbers)
  if (/[A-Z].*\d|\d.*[A-Z]/i.test(base)) {
    return base;
  }

  // Fall back to program number without O prefix
  if (programNumber) {
    return programNumber.replace(/^O/i, "");
  }

  return null;
}

/**
 * Detect machine type from path.
 */
function detectMachineType(path: string): TrainingExample["machine_type"] {
  const upper = path.toUpperCase();
  if (upper.includes("LATHE")) return "lathe";
  if (upper.includes("MILL") || upper.includes("HAAS")) return "mill";
  if (upper.includes("WIRE EDM") || upper.includes("WEDM")) return "wire_edm";
  if (upper.includes("SINKER") || upper.includes("EDM")) return "sinker_edm";
  if (upper.includes("GRIND")) return "grinder";
  return "unknown";
}

// ── Main assembler ─────────────────────────────────────────────────────────

export interface AssemblerResult {
  examples: TrainingExample[];
  stats: {
    programs_processed: number;
    operations_extracted: number;
    examples_with_logs: number;
    examples_without_logs: number;
  };
  warnings: string[];
}

export class TrainingExampleAssemblerEngine {
  /**
   * Assemble training examples from parsed programs and run logs.
   * @param input - Programs and optional run logs
   * @returns Training examples with stats
   */
  assemble(input: AssemblerInput): AssemblerResult {
    const validated = AssemblerInputSchema.safeParse(input);
    if (!validated.success) {
      return {
        examples: [],
        stats: { programs_processed: 0, operations_extracted: 0, examples_with_logs: 0, examples_without_logs: 0 },
        warnings: [`schema validation: ${validated.error.message}`],
      };
    }

    const { programs, run_logs, customer_name, machine_type } = validated.data;
    const warnings: string[] = [];
    const examples: TrainingExample[] = [];

    // Index run logs by program number for join
    const logsByProgram = new Map<string, RunLog>();
    for (const rl of run_logs) {
      if (!rl) continue; // Skip null/undefined entries
      const log = rl as RunLog;
      if (!log.cycle_summaries) continue;
      for (const cycle of log.cycle_summaries) {
        if (cycle.program_number) {
          logsByProgram.set(cycle.program_number.toUpperCase(), log);
        }
      }
    }

    let examplesWithLogs = 0;
    let examplesWithoutLogs = 0;

    for (const { type, program } of programs) {
      try {
        if (type === "min") {
          const minProg = program as MINProgram;
          const ops = this.extractFromMIN(minProg, customer_name, logsByProgram);
          examples.push(...ops);
        } else {
          const ncProg = program as NCProgram;
          const ops = this.extractFromNC(ncProg, customer_name, logsByProgram);
          examples.push(...ops);
        }
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        warnings.push(`extract failed: ${m}`);
      }
    }

    // Count examples with/without logs
    for (const ex of examples) {
      if (ex.source_log) examplesWithLogs++;
      else examplesWithoutLogs++;
    }

    return {
      examples,
      stats: {
        programs_processed: programs.length,
        operations_extracted: examples.length,
        examples_with_logs: examplesWithLogs,
        examples_without_logs: examplesWithoutLogs,
      },
      warnings,
    };
  }

  /**
   * Extract training examples from a parsed MIN (Okuma lathe) program.
   */
  private extractFromMIN(
    prog: MINProgram,
    defaultCustomer: string,
    logsByProgram: Map<string, RunLog>
  ): TrainingExample[] {
    const customer = extractCustomer(prog.source_path) || defaultCustomer;
    const partNumber = extractPartNumber(prog.source_path, prog.header.program_number);
    const machineType = detectMachineType(prog.source_path);

    // Try to find matching run log
    const progNum = prog.header.program_number?.toUpperCase() ?? "";
    const runLog = logsByProgram.get(progNum) ?? null;

    return prog.operations
      .filter(op => op.kind !== "setup") // Skip setup blocks
      .map((op, idx) => {
        const exampleId = `${prog.source_path}:op${op.index}`.replace(/[\\/:]/g, "_");

        // Calculate spans
        const zSpan = (op.z_start !== null && op.z_end !== null)
          ? Math.abs(op.z_end - op.z_start) : null;
        const xSpan = (op.x_min !== null && op.x_max !== null)
          ? op.x_max - op.x_min : null;

        // Get actual metrics from run log if available
        const actual = this.getActualMetrics(runLog, op.tool_id);

        // Compute labels
        const feedDelta = (actual.feed_override_avg !== null && actual.feed_override_avg !== 100)
          ? actual.feed_override_avg - 100 : null;
        const wasOverridden = actual.feed_override_avg !== null && actual.feed_override_avg !== 100;
        const highLoad = actual.spindle_load_max !== null && actual.spindle_load_max > 80;
        const hadAlarm = (actual.alarm_count ?? 0) > 0;

        const example: TrainingExample = {
          schemaVersion: "1.0.0",
          example_id: exampleId,
          source_program: prog.source_path,
          source_log: runLog?.source_path ?? null,
          customer,
          part_number: partNumber,
          program_number: prog.header.program_number,
          operation_index: op.index,
          operation_kind: op.kind,
          machine_type: machineType,
          programmed: {
            tool_id: op.tool_id,
            tool_diameter_mm: null, // Not available in MIN format
            spindle_rpm: op.spindle_rpm,
            surface_speed_sfm: op.surface_speed_sfm,
            feed_rate: op.feed_rate,
            feed_mode: op.feed_mode,
            coolant: op.coolant,
            z_span: zSpan,
            x_span: xSpan,
            line_count: op.line_count,
            canned_cycles: op.canned_cycles,
          },
          actual,
          labels: {
            feed_delta_pct: feedDelta,
            was_overridden: wasOverridden,
            high_spindle_load: highLoad,
            had_alarm: hadAlarm,
          },
          metadata: {
            units: prog.header.units,
            controller: "okuma",
            cam_system: null,
            date: null,
          },
        };

        return example;
      });
  }

  /**
   * Extract training examples from a parsed NC (Haas/Fanuc) program.
   */
  private extractFromNC(
    prog: NCProgram,
    defaultCustomer: string,
    logsByProgram: Map<string, RunLog>
  ): TrainingExample[] {
    const customer = extractCustomer(prog.source_path) || defaultCustomer;
    const partNumber = extractPartNumber(prog.source_path, prog.header.program_number);
    const machineType = detectMachineType(prog.source_path);

    const progNum = prog.header.program_number?.toUpperCase() ?? "";
    const runLog = logsByProgram.get(progNum) ?? null;

    return prog.operations
      .filter(op => op.kind !== "setup")
      .map((op) => {
        const exampleId = `${prog.source_path}:op${op.index}`.replace(/[\\/:]/g, "_");

        const zSpan = (op.z_max !== null && op.z_min !== null)
          ? Math.abs(op.z_max - op.z_min) : null;

        const actual = this.getActualMetrics(runLog, `T${op.tool_number}`);

        const feedDelta = (actual.feed_override_avg !== null && actual.feed_override_avg !== 100)
          ? actual.feed_override_avg - 100 : null;
        const wasOverridden = actual.feed_override_avg !== null && actual.feed_override_avg !== 100;
        const highLoad = actual.spindle_load_max !== null && actual.spindle_load_max > 80;
        const hadAlarm = (actual.alarm_count ?? 0) > 0;

        const example: TrainingExample = {
          schemaVersion: "1.0.0",
          example_id: exampleId,
          source_program: prog.source_path,
          source_log: runLog?.source_path ?? null,
          customer,
          part_number: partNumber,
          program_number: prog.header.program_number,
          operation_index: op.index,
          operation_kind: op.kind,
          machine_type: machineType,
          programmed: {
            tool_id: `T${op.tool_number}`,
            tool_diameter_mm: op.tool_info?.diameter_mm ?? null,
            spindle_rpm: op.spindle_rpm,
            surface_speed_sfm: null, // Not directly available in NC
            feed_rate: op.feed_rate,
            feed_mode: op.feed_mode,
            coolant: op.coolant,
            z_span: zSpan,
            x_span: null, // Not tracked in NC parser
            line_count: op.line_count,
            canned_cycles: op.canned_cycles,
          },
          actual,
          labels: {
            feed_delta_pct: feedDelta,
            was_overridden: wasOverridden,
            high_spindle_load: highLoad,
            had_alarm: hadAlarm,
          },
          metadata: {
            units: prog.header.units,
            controller: prog.header.controller,
            cam_system: prog.header.cam_system,
            date: prog.header.date,
          },
        };

        return example;
      });
  }

  /**
   * Get actual metrics from run log for a specific tool.
   */
  private getActualMetrics(
    log: RunLog | null,
    toolId: string
  ): TrainingExample["actual"] {
    if (!log) {
      return {
        spindle_load_avg: null,
        spindle_load_max: null,
        feed_override_avg: null,
        feed_override_min: null,
        cycle_time_sec: null,
        alarm_count: null,
      };
    }

    // Extract tool number
    const toolNum = parseInt(toolId.replace(/\D/g, ""), 10);

    // Get spindle load for this tool
    const spindleSamples = log.spindle_samples.filter(s => s.tool_number === toolNum);
    let spindleAvg: number | null = null;
    let spindleMax: number | null = null;
    if (spindleSamples.length > 0) {
      spindleAvg = spindleSamples.reduce((a, s) => a + s.load_percent, 0) / spindleSamples.length;
      spindleMax = Math.max(...spindleSamples.map(s => s.load_percent));
    }

    // Get feed override
    const feedSamples = log.feed_samples.filter(s => s.tool_number === toolNum || s.tool_number === null);
    let feedAvg: number | null = null;
    let feedMin: number | null = null;
    if (feedSamples.length > 0) {
      feedAvg = feedSamples.reduce((a, s) => a + s.override_percent, 0) / feedSamples.length;
      feedMin = Math.min(...feedSamples.map(s => s.override_percent));
    }

    // Get cycle time (total for program)
    const cycleTime = log.cycle_summaries.length > 0
      ? log.cycle_summaries.reduce((a, c) => a + c.duration_sec, 0) : null;

    // Count alarms
    const alarmCount = log.alarms.filter(a => a.tool_number === toolNum || a.tool_number === null).length;

    return {
      spindle_load_avg: spindleAvg,
      spindle_load_max: spindleMax,
      feed_override_avg: feedAvg,
      feed_override_min: feedMin,
      cycle_time_sec: cycleTime,
      alarm_count: alarmCount,
    };
  }

  /**
   * Convert examples to flat feature rows for ML training.
   */
  toFeatureRows(examples: TrainingExample[]): Array<Record<string, unknown>> {
    return examples.map(ex => ({
      example_id: ex.example_id,
      customer: ex.customer,
      part_number: ex.part_number,
      program_number: ex.program_number,
      operation_index: ex.operation_index,
      operation_kind: ex.operation_kind,
      machine_type: ex.machine_type,
      // Programmed
      tool_id: ex.programmed.tool_id,
      tool_diameter_mm: ex.programmed.tool_diameter_mm,
      spindle_rpm: ex.programmed.spindle_rpm,
      surface_speed_sfm: ex.programmed.surface_speed_sfm,
      feed_rate: ex.programmed.feed_rate,
      feed_mode: ex.programmed.feed_mode,
      coolant: ex.programmed.coolant,
      z_span: ex.programmed.z_span,
      x_span: ex.programmed.x_span,
      line_count: ex.programmed.line_count,
      // Actual
      spindle_load_avg: ex.actual.spindle_load_avg,
      spindle_load_max: ex.actual.spindle_load_max,
      feed_override_avg: ex.actual.feed_override_avg,
      cycle_time_sec: ex.actual.cycle_time_sec,
      alarm_count: ex.actual.alarm_count,
      // Labels
      feed_delta_pct: ex.labels.feed_delta_pct,
      was_overridden: ex.labels.was_overridden,
      high_spindle_load: ex.labels.high_spindle_load,
      had_alarm: ex.labels.had_alarm,
      // Metadata
      units: ex.metadata.units,
      controller: ex.metadata.controller,
      cam_system: ex.metadata.cam_system,
      has_run_log: ex.source_log !== null,
    }));
  }

  static getSelfAwareness() {
    return {
      name: "TrainingExampleAssemblerEngine",
      purpose: "Join parsed programs with run logs to create labeled ML training examples",
      milestone: "PSAU P2.5-LEARN U-LEARN-03",
      capabilities: ["assemble", "toFeatureRows"],
      inputs: ["MINProgram", "NCProgram", "RunLog"],
      outputs: ["TrainingExample[] with programmed + actual + labels"],
      join_keys: ["customer", "part_number", "program_number", "operation_index"],
      consumers: ["JMDieTrainingCorpusEngine", "FeatureStoreEngine"],
    };
  }
}

export const trainingExampleAssemblerEngine = new TrainingExampleAssemblerEngine();
