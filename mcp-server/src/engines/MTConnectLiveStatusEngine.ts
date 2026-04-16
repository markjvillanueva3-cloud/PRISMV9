/**
 * MTConnectLiveStatusEngine
 * ===========================
 *
 * MTConnect stream parser + live-status projector for CNC machines.
 *
 * MTConnect is the ASME MTC1.4 / ANSI-standard open protocol emitting XML
 * over HTTP. Agent endpoints expose /probe (device structure) and
 * /current or /sample (time-series data) at rates of 1-10 Hz.
 *
 * This engine:
 *   1. Accepts a parsed XML payload (caller feeds already-parsed objects)
 *      OR a raw string with path/value pairs already extracted.
 *   2. Extracts canonical machine state:
 *        - execution: active | interrupted | stopped | ready | feed_hold
 *        - controller mode: manual | automatic | mdi | edit
 *        - program: name + block
 *        - spindle: rpm + override + load
 *        - axis positions (XYZ + rotary)
 *        - alarms / faults
 *   3. Projects rolled-up status flags: is_running, is_alarm, is_starved.
 *   4. Estimates cycle progress from current block vs total-blocks if known.
 *
 * Distinct from existing:
 *   - OEECalculatorEngine: aggregates KPIs over a shift; doesn't parse
 *   - ShopFloorCheckInEngine: human login event, not machine telemetry
 *   - This engine: MTConnect-specific decoder for live state
 *
 * References:
 *   - ASME MTC1.4 (MTConnect Standard v1.5)
 *   - ANSI/MTC1.4-2018 Part 3 (data items, event streams)
 *
 * @module engines/MTConnectLiveStatusEngine
 * @milestone LATHE-PRO-MS11
 */

export type MTCExecution = "active" | "interrupted" | "stopped" | "ready" | "feed_hold" | "unknown";
export type MTCControllerMode = "manual" | "automatic" | "mdi" | "edit" | "unknown";

export interface MTConnectDataItem {
  /** Canonical item type (e.g., "execution", "controller_mode", "spindle_speed") */
  type: string;
  /** Data value as reported */
  value: string | number;
  /** Timestamp of reading (ISO 8601) */
  timestamp?: string;
  /** Optional sub-axis tag (X, Y, Z, S1 spindle) */
  axis?: string;
}

export interface MTConnectParseInput {
  items: MTConnectDataItem[];
  /** Known total program blocks (optional — enables progress estimate) */
  total_blocks?: number;
}

export interface MTConnectLiveStatus {
  execution: MTCExecution;
  controller_mode: MTCControllerMode;
  program_name?: string;
  current_block?: number;
  spindle_rpm?: number;
  spindle_load_pct?: number;
  feedrate_override_pct?: number;
  axis_positions: Record<string, number>;
  alarms: string[];
  is_running: boolean;
  is_alarm: boolean;
  is_starved: boolean;
  progress_pct?: number;
  reasoning: string[];
}

class MTConnectLiveStatusEngineImpl {
  parse(input: MTConnectParseInput): MTConnectLiveStatus {
    const reasoning: string[] = [];
    const out: MTConnectLiveStatus = {
      execution: "unknown",
      controller_mode: "unknown",
      axis_positions: {},
      alarms: [],
      is_running: false,
      is_alarm: false,
      is_starved: false,
      reasoning,
    };

    for (const item of input.items) {
      const t = item.type.toLowerCase();
      const v = typeof item.value === "string" ? item.value.toLowerCase() : item.value;

      if (t === "execution") out.execution = this.normalizeExecution(String(v));
      else if (t === "controller_mode" || t === "controllermode") out.controller_mode = this.normalizeControllerMode(String(v));
      else if (t === "program" || t === "program_name") out.program_name = String(item.value);
      else if (t === "block" || t === "current_block") out.current_block = Number(item.value);
      else if (t === "spindle_speed" || t === "rotary_velocity") out.spindle_rpm = Number(item.value);
      else if (t === "spindle_load" || t === "load") out.spindle_load_pct = Number(item.value);
      else if (t === "feed_override" || t === "path_feedrate_override") out.feedrate_override_pct = Number(item.value);
      else if (t === "position" && item.axis) out.axis_positions[item.axis] = Number(item.value);
      else if (t === "alarm" || t === "fault") {
        if (String(item.value).trim().length > 0 && String(item.value).toLowerCase() !== "normal") {
          out.alarms.push(String(item.value));
        }
      }
    }

    out.is_running = out.execution === "active";
    out.is_alarm = out.alarms.length > 0 || out.execution === "interrupted";
    out.is_starved = out.execution === "ready" && out.controller_mode === "automatic";

    if (input.total_blocks && out.current_block !== undefined && input.total_blocks > 0) {
      out.progress_pct = round1((out.current_block / input.total_blocks) * 100);
    }

    reasoning.push(`Execution=${out.execution}, mode=${out.controller_mode}`);
    if (out.is_alarm) reasoning.push(`${out.alarms.length} alarm(s) active`);
    if (out.is_starved) reasoning.push(`Machine idle in auto mode — likely starved for work`);
    if (out.progress_pct !== undefined) reasoning.push(`Progress ≈ ${out.progress_pct}%`);

    return out;
  }

  private normalizeExecution(v: string): MTCExecution {
    const s = v.toLowerCase();
    if (s === "active") return "active";
    if (s === "interrupted") return "interrupted";
    if (s === "stopped") return "stopped";
    if (s === "ready") return "ready";
    if (s === "feed_hold" || s === "feedhold") return "feed_hold";
    return "unknown";
  }

  private normalizeControllerMode(v: string): MTCControllerMode {
    const s = v.toLowerCase();
    if (s === "manual") return "manual";
    if (s === "automatic" || s === "auto") return "automatic";
    if (s === "mdi" || s === "manual_data_input") return "mdi";
    if (s === "edit") return "edit";
    return "unknown";
  }

  getStats(): { standard: string; supported_execution_states: string[] } {
    return {
      standard: "ASME MTC1.4 / ANSI MTConnect 1.5",
      supported_execution_states: ["active", "interrupted", "stopped", "ready", "feed_hold"],
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

export const mtConnectLiveStatusEngine = new MTConnectLiveStatusEngineImpl();
export type { MTConnectLiveStatusEngineImpl };
