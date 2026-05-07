// WIRE-EXEMPT: tests in __tests__/engines/mlCorpusU-LEARN-03.test.ts
/**
 * OkumaRunLogParserEngine — U-LEARN-03
 * =====================================
 *
 * Parses Okuma OSP controller run logs into structured {@link RunLog} objects.
 * Extracts actual machining metrics for training data:
 * - Spindle load samples
 * - Feed override events
 * - Cycle times
 * - Alarms/faults
 *
 * Okuma OSP log formats supported:
 * - OSP-P300 operation history CSV
 * - OSP-P200/P100 legacy text logs
 * - MTConnect XML streams (partial)
 *
 * Design: Never throws — returns parse_ok=false with warnings.
 *
 * @module engines/OkumaRunLogParserEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-03
 */

import {
  RunLogSchema,
  ParseRunLogInputSchema,
  type RunLog,
  type RunLogEntry,
  type SpindleLoadSample,
  type FeedOverrideSample,
  type AlarmEntry,
  type CycleTimeSummary,
  type ParseRunLogInput,
} from "../schemas/runLogSchema.js";

// ── Line parsers ───────────────────────────────────────────────────────────

interface ParsedLine {
  timestamp: string | null;
  eventType: RunLogEntry["event_type"] | null;
  values: Record<string, string | number | boolean | null>;
  raw: string;
}

/**
 * Parse OSP-P300 CSV format:
 * DateTime,EventType,Program,Tool,Block,Value1,Value2,...
 */
function parseOspCsvLine(line: string, lineNum: number): ParsedLine | null {
  const parts = line.split(",").map(p => p.trim());
  if (parts.length < 3) return null;

  // Skip header rows (first column is a header name, not a timestamp)
  const first = (parts[0] ?? "").toLowerCase();
  if (first === "datetime" || first === "timestamp" || first === "date" || first === "time") {
    return null;
  }

  const timestamp = parts[0] ?? null;
  const eventRaw = (parts[1] ?? "").toLowerCase();
  const program = parts[2] ?? null;
  const tool = parts[3] ? parseInt(parts[3], 10) : null;
  const block = parts[4] ? parseInt(parts[4], 10) : null;

  let eventType: RunLogEntry["event_type"] = "custom";
  if (eventRaw.includes("cycle") && eventRaw.includes("start")) eventType = "cycle_start";
  else if (eventRaw.includes("cycle") && eventRaw.includes("end")) eventType = "cycle_end";
  else if (eventRaw.includes("tool") && eventRaw.includes("change")) eventType = "tool_change";
  else if (eventRaw.includes("feed") && eventRaw.includes("override")) eventType = "feed_override";
  else if (eventRaw.includes("spindle") && eventRaw.includes("override")) eventType = "spindle_override";
  else if (eventRaw.includes("spindle") && eventRaw.includes("load")) eventType = "spindle_load";
  else if (eventRaw.includes("alarm")) eventType = "alarm";
  else if (eventRaw.includes("warn")) eventType = "warning";
  else if (eventRaw.includes("probe")) eventType = "probe_result";
  else if (eventRaw.includes("part") && eventRaw.includes("count")) eventType = "part_count";

  const values: Record<string, string | number | boolean | null> = {
    program_number: program,
    tool_number: tool,
    block_number: block,
    event_raw: eventRaw,
  };

  // Parse additional value columns
  for (let i = 5; i < parts.length; i++) {
    const val = parts[i]!;
    const numVal = parseFloat(val);
    values[`value_${i - 5}`] = Number.isFinite(numVal) ? numVal : val;
  }

  return { timestamp, eventType, values, raw: line };
}

/**
 * Parse legacy OSP text log format:
 * [TIMESTAMP] EVENT: details
 */
function parseOspTextLine(line: string, lineNum: number): ParsedLine | null {
  // Pattern: [2026-01-15 08:30:45] CYCLE_START: O1234 T01
  const tsMatch = line.match(/^\[([^\]]+)\]\s*(.+)/);
  if (!tsMatch) return null;

  const timestamp = tsMatch[1]!;
  const rest = tsMatch[2]!;

  const colonIdx = rest.indexOf(":");
  const eventRaw = colonIdx >= 0 ? rest.slice(0, colonIdx).trim().toLowerCase() : rest.toLowerCase();
  const details = colonIdx >= 0 ? rest.slice(colonIdx + 1).trim() : "";

  let eventType: RunLogEntry["event_type"] = "custom";
  if (eventRaw.includes("cycle_start")) eventType = "cycle_start";
  else if (eventRaw.includes("cycle_end")) eventType = "cycle_end";
  else if (eventRaw.includes("tool_change")) eventType = "tool_change";
  else if (eventRaw.includes("feed_override")) eventType = "feed_override";
  else if (eventRaw.includes("spindle_load")) eventType = "spindle_load";
  else if (eventRaw.includes("alarm")) eventType = "alarm";
  else if (eventRaw.includes("warn")) eventType = "warning";

  const values: Record<string, string | number | boolean | null> = {
    event_raw: eventRaw,
    details,
  };

  // Extract program number O####
  const oMatch = details.match(/O(\d+)/);
  if (oMatch) values.program_number = `O${oMatch[1]}`;

  // Extract tool number T##
  const tMatch = details.match(/T(\d+)/);
  if (tMatch) values.tool_number = parseInt(tMatch[1]!, 10);

  // Extract percentage values
  const pctMatch = details.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) values.percent = parseFloat(pctMatch[1]!);

  // Extract load/feed values
  const loadMatch = details.match(/load[:\s]+(\d+(?:\.\d+)?)/i);
  if (loadMatch) values.load_percent = parseFloat(loadMatch[1]!);

  const feedMatch = details.match(/feed[:\s]+(\d+(?:\.\d+)?)/i);
  if (feedMatch) values.feedrate = parseFloat(feedMatch[1]!);

  return { timestamp, eventType, values, raw: line };
}

// ── Main parser ────────────────────────────────────────────────────────────

export interface RunLogParseResult {
  ok: boolean;
  log: RunLog;
  warnings: string[];
}

export class OkumaRunLogParserEngine {
  /**
   * Parse an Okuma controller run log.
   * @param input - Log text and metadata
   * @returns Parsed run log with metrics
   */
  parse(input: ParseRunLogInput): RunLogParseResult {
    const validated = ParseRunLogInputSchema.safeParse(input);
    if (!validated.success) {
      return {
        ok: false,
        warnings: [`schema validation: ${validated.error.message}`],
        log: this.emptyLog("<invalid>", "unknown", [`schema validation: ${validated.error.message}`]),
      };
    }
    const { text, source_path, machine_id, controller, max_entries } = validated.data;

    const warnings: string[] = [];
    const lines = text.replace(/\r\n?/g, "\n").split("\n").slice(0, max_entries);

    // Detect format
    const isCsv = lines.some(l => l.includes(",") && l.split(",").length >= 4);
    const parser = isCsv ? parseOspCsvLine : parseOspTextLine;

    const entries: RunLogEntry[] = [];
    const spindleSamples: SpindleLoadSample[] = [];
    const feedSamples: FeedOverrideSample[] = [];
    const alarms: AlarmEntry[] = [];
    const cycleSummaries: CycleTimeSummary[] = [];

    let firstTs: string | null = null;
    let lastTs: string | null = null;
    let currentCycleStart: string | null = null;
    let currentProgram: string | null = null;
    let toolChangeCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line || line.startsWith("#") || line.startsWith("//")) continue;

      try {
        const parsed = parser(line, i + 1);
        if (!parsed || !parsed.eventType) continue;

        if (parsed.timestamp) {
          if (!firstTs) firstTs = parsed.timestamp;
          lastTs = parsed.timestamp;
        }

        const entry: RunLogEntry = {
          timestamp: parsed.timestamp ?? "",
          event_type: parsed.eventType,
          tool_number: typeof parsed.values.tool_number === "number" ? parsed.values.tool_number : null,
          block_number: typeof parsed.values.block_number === "number" ? parsed.values.block_number : null,
          program_number: typeof parsed.values.program_number === "string" ? parsed.values.program_number : null,
          values: parsed.values,
        };
        entries.push(entry);

        // Extract spindle load samples
        if (parsed.eventType === "spindle_load" && parsed.timestamp) {
          const load = typeof parsed.values.load_percent === "number" ? parsed.values.load_percent :
                       typeof parsed.values.percent === "number" ? parsed.values.percent :
                       typeof parsed.values.value_0 === "number" ? parsed.values.value_0 : null;
          if (load !== null) {
            spindleSamples.push({
              timestamp: parsed.timestamp,
              tool_number: entry.tool_number ?? 0,
              load_percent: load,
              rpm_actual: typeof parsed.values.rpm_actual === "number" ? parsed.values.rpm_actual : null,
              rpm_commanded: typeof parsed.values.rpm_commanded === "number" ? parsed.values.rpm_commanded : null,
            });
          }
        }

        // Extract feed override samples
        if (parsed.eventType === "feed_override" && parsed.timestamp) {
          const override = typeof parsed.values.percent === "number" ? parsed.values.percent :
                          typeof parsed.values.value_0 === "number" ? parsed.values.value_0 : null;
          if (override !== null) {
            feedSamples.push({
              timestamp: parsed.timestamp,
              tool_number: entry.tool_number,
              override_percent: override,
              feedrate_actual: typeof parsed.values.feedrate === "number" ? parsed.values.feedrate : null,
              feedrate_commanded: typeof parsed.values.feedrate_commanded === "number" ? parsed.values.feedrate_commanded : null,
            });
          }
        }

        // Extract alarms
        if ((parsed.eventType === "alarm" || parsed.eventType === "warning") && parsed.timestamp) {
          alarms.push({
            timestamp: parsed.timestamp,
            alarm_code: typeof parsed.values.alarm_code === "string" ? parsed.values.alarm_code :
                       typeof parsed.values.value_0 === "string" ? parsed.values.value_0 : "UNKNOWN",
            alarm_text: typeof parsed.values.details === "string" ? parsed.values.details : parsed.raw,
            severity: parsed.eventType === "alarm" ? "error" : "warning",
            tool_number: entry.tool_number,
            program_number: entry.program_number,
            block_number: entry.block_number,
          });
        }

        // Track cycle times
        if (parsed.eventType === "cycle_start" && parsed.timestamp) {
          currentCycleStart = parsed.timestamp;
          currentProgram = entry.program_number;
          toolChangeCount = 0;
        }
        if (parsed.eventType === "tool_change") {
          toolChangeCount++;
        }
        if (parsed.eventType === "cycle_end" && parsed.timestamp && currentCycleStart && currentProgram) {
          const startDate = new Date(currentCycleStart);
          const endDate = new Date(parsed.timestamp);
          const duration = (endDate.getTime() - startDate.getTime()) / 1000;

          if (Number.isFinite(duration) && duration >= 0) {
            cycleSummaries.push({
              program_number: currentProgram,
              cycle_start: currentCycleStart,
              cycle_end: parsed.timestamp,
              duration_sec: duration,
              cutting_time_sec: null,
              rapid_time_sec: null,
              dwell_time_sec: null,
              tool_change_count: toolChangeCount,
              part_count: 1,
              operator_id: null,
            });
          }
          currentCycleStart = null;
          currentProgram = null;
        }

      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        warnings.push(`parse L${i + 1}: ${m}`);
      }
    }

    const log: RunLog = {
      schemaVersion: "1.0.0",
      source_path,
      machine_id,
      controller,
      date_range: {
        start: firstTs ?? "",
        end: lastTs ?? "",
      },
      entries,
      spindle_samples: spindleSamples,
      feed_samples: feedSamples,
      alarms,
      cycle_summaries: cycleSummaries,
      warnings,
      parse_ok: true,
    };

    const check = RunLogSchema.safeParse(log);
    if (!check.success) {
      warnings.push(`post-parse schema: ${check.error.message}`);
      log.parse_ok = false;
    }

    return { ok: log.parse_ok, log, warnings };
  }

  /**
   * Extract training-relevant metrics from a run log.
   * Returns records suitable for joining with program operations.
   */
  summarizeAsMetrics(log: RunLog): Array<Record<string, unknown>> {
    const rows: Array<Record<string, unknown>> = [];

    // Per-cycle summary rows
    for (const cycle of log.cycle_summaries) {
      rows.push({
        source_path: log.source_path,
        machine_id: log.machine_id,
        controller: log.controller,
        metric_type: "cycle_time",
        program_number: cycle.program_number,
        timestamp: cycle.cycle_start,
        duration_sec: cycle.duration_sec,
        cutting_time_sec: cycle.cutting_time_sec,
        tool_change_count: cycle.tool_change_count,
        part_count: cycle.part_count,
      });
    }

    // Spindle load aggregates per tool
    const spindleByTool = new Map<number, number[]>();
    for (const s of log.spindle_samples) {
      const arr = spindleByTool.get(s.tool_number) ?? [];
      arr.push(s.load_percent);
      spindleByTool.set(s.tool_number, arr);
    }
    for (const [tool, loads] of spindleByTool) {
      const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
      const max = Math.max(...loads);
      rows.push({
        source_path: log.source_path,
        machine_id: log.machine_id,
        controller: log.controller,
        metric_type: "spindle_load",
        tool_number: tool,
        spindle_load_mean: mean,
        spindle_load_max: max,
        sample_count: loads.length,
      });
    }

    // Feed override aggregates
    const overrides = log.feed_samples.map(f => f.override_percent);
    if (overrides.length > 0) {
      const mean = overrides.reduce((a, b) => a + b, 0) / overrides.length;
      const min = Math.min(...overrides);
      const max = Math.max(...overrides);
      rows.push({
        source_path: log.source_path,
        machine_id: log.machine_id,
        controller: log.controller,
        metric_type: "feed_override",
        override_mean: mean,
        override_min: min,
        override_max: max,
        sample_count: overrides.length,
      });
    }

    return rows;
  }

  private emptyLog(source_path: string, machine_id: string, warnings: string[]): RunLog {
    return {
      schemaVersion: "1.0.0",
      source_path,
      machine_id,
      controller: "unknown",
      date_range: { start: "", end: "" },
      entries: [],
      spindle_samples: [],
      feed_samples: [],
      alarms: [],
      cycle_summaries: [],
      warnings,
      parse_ok: false,
    };
  }

  static getSelfAwareness() {
    return {
      name: "OkumaRunLogParserEngine",
      purpose: "Parse Okuma OSP controller run logs into structured metrics",
      milestone: "PSAU P2.5-LEARN U-LEARN-03",
      capabilities: ["parse", "summarizeAsMetrics"],
      inputs: ["OSP-P300 CSV logs", "OSP-P200/P100 text logs"],
      outputs: ["RunLog with spindle load, feed override, cycle times, alarms"],
      never_throws: true,
      consumers: ["TrainingExampleAssemblerEngine", "JMDieTrainingCorpusEngine"],
    };
  }
}

export const okumaRunLogParserEngine = new OkumaRunLogParserEngine();
