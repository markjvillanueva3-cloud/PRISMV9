/**
 * PPModalStateTrackerEngine — Track G-code modal state through a program
 *
 * Modal codes in G-code persist until changed by another code in the same
 * modal group. Many safety and analysis passes need to answer the question
 * "what modal state is active at line N?" — this engine gives you a full
 * timeline plus query helpers.
 *
 * Modal groups tracked:
 *   - Motion group     : G0, G1, G2, G3 (rapid, linear, CW/CCW arcs)
 *   - Plane            : G17 (XY), G18 (XZ), G19 (YZ)
 *   - Distance         : G90 (absolute), G91 (incremental)
 *   - Units            : G20 (inch), G21 (mm)
 *   - Cutter comp      : G40 (off), G41 (left), G42 (right)
 *   - Work offset      : G54..G59 (+ G54.1 Pn extended offsets flagged)
 *   - Feed mode        : G93 (inverse time), G94 (feed/min), G95 (feed/rev)
 *   - Spindle mode     : G96 (CSS), G97 (constant RPM)
 *   - Canned cycle     : G80..G89 (drill, tap, bore, etc.)
 *   - Return mode      : G98 (initial Z), G99 (R-plane)
 *   - Spindle on/off   : M3 (CW), M4 (CCW), M5 (off)
 *   - Coolant          : M7 (mist), M8 (flood), M9 (off)
 *   - Tool             : current T-word
 *
 * Scope — distinct from:
 *   - PPProgramChunkerEngine — chunks program, emits restore blocks for modal
 *     state at chunk boundaries. This engine is a pure tracker, not a splitter.
 *   - BackplotEngine — parses G-code into 3D moves for visualization.
 *     Modal state is internal there; not queryable.
 *   - PPGCodeLintEngine — flags unsafe patterns. Uses modal state implicitly.
 *
 * This engine is a pure read-only timeline extractor with query API.
 *
 * @module PPModalStateTrackerEngine
 */

// ── Modal group IDs ─────────────────────────────────────────────────────

export type MotionCode = "G0" | "G1" | "G2" | "G3" | null;
export type PlaneCode = "G17" | "G18" | "G19" | null;
export type DistanceCode = "G90" | "G91" | null;
export type UnitsCode = "G20" | "G21" | null;
export type CutterCompCode = "G40" | "G41" | "G42" | null;
export type WorkOffsetCode = "G54" | "G55" | "G56" | "G57" | "G58" | "G59" | null;
export type FeedModeCode = "G93" | "G94" | "G95" | null;
export type SpindleModeCode = "G96" | "G97" | null;
export type CannedCycleCode =
  | "G80" | "G81" | "G82" | "G83" | "G84" | "G85" | "G86" | "G87" | "G88" | "G89"
  | null;
export type ReturnModeCode = "G98" | "G99" | null;
export type SpindleCode = "M3" | "M4" | "M5" | null;
export type CoolantCode = "M7" | "M8" | "M9" | null;

export interface ModalState {
  motion: MotionCode;
  plane: PlaneCode;
  distance: DistanceCode;
  units: UnitsCode;
  cutter_comp: CutterCompCode;
  work_offset: WorkOffsetCode;
  feed_mode: FeedModeCode;
  spindle_mode: SpindleModeCode;
  canned_cycle: CannedCycleCode;
  return_mode: ReturnModeCode;
  spindle: SpindleCode;
  coolant: CoolantCode;
  tool: number | null;          // current T-word (nullable)
  feed_rate: number | null;     // last F-word
  spindle_rpm: number | null;   // last S-word
}

export interface LineState {
  line_number: number;
  raw_line: string;
  state: ModalState;            // state AFTER executing this line
  changes: ModalChange[];       // modal group transitions on this line
}

export interface ModalChange {
  group: keyof ModalState;
  from: ModalState[keyof ModalState];
  to: ModalState[keyof ModalState];
}

export interface TrackerResult {
  timeline: LineState[];
  final_state: ModalState;
  total_lines: number;
  transitions_by_group: Partial<Record<keyof ModalState, number>>;
  warnings: string[];
}

// ── Engine ──────────────────────────────────────────────────────────────

export class PPModalStateTrackerEngine {
  /**
   * Walk a G-code program and build a per-line modal state timeline.
   */
  track(gcode: string, initial?: Partial<ModalState>): TrackerResult {
    const lines = gcode.split(/\r?\n/);
    const timeline: LineState[] = [];
    const warnings: string[] = [];
    const transitions: Partial<Record<keyof ModalState, number>> = {};

    let state: ModalState = this.initialState(initial);

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const lineNum = idx + 1;
      const code = this.stripComments(raw).toUpperCase().trim();

      if (code.length === 0) {
        // Blank or comment-only — propagate state as-is, no changes
        timeline.push({
          line_number: lineNum,
          raw_line: raw,
          state: { ...state },
          changes: [],
        });
        continue;
      }

      const before = { ...state };
      state = this.applyLine(code, state, warnings, lineNum);

      const changes: ModalChange[] = [];
      for (const key of Object.keys(state) as (keyof ModalState)[]) {
        if (before[key] !== state[key]) {
          changes.push({
            group: key,
            from: before[key],
            to: state[key],
          });
          transitions[key] = (transitions[key] ?? 0) + 1;
        }
      }

      timeline.push({
        line_number: lineNum,
        raw_line: raw,
        state: { ...state },
        changes,
      });
    }

    return {
      timeline,
      final_state: { ...state },
      total_lines: lines.length,
      transitions_by_group: transitions,
      warnings,
    };
  }

  /**
   * Query the modal state at a specific line number.
   */
  getStateAtLine(result: TrackerResult, lineNumber: number): ModalState | null {
    const entry = result.timeline.find(t => t.line_number === lineNumber);
    return entry ? entry.state : null;
  }

  /**
   * Get all transitions in a specific modal group.
   */
  getTransitions(result: TrackerResult, group: keyof ModalState): Array<{
    line_number: number;
    from: ModalState[keyof ModalState];
    to: ModalState[keyof ModalState];
  }> {
    const out: Array<{
      line_number: number;
      from: ModalState[keyof ModalState];
      to: ModalState[keyof ModalState];
    }> = [];
    for (const entry of result.timeline) {
      for (const c of entry.changes) {
        if (c.group === group) {
          out.push({
            line_number: entry.line_number,
            from: c.from,
            to: c.to,
          });
        }
      }
    }
    return out;
  }

  /**
   * Quick helper — return the active value of a single modal group at a line.
   */
  getActiveModal<K extends keyof ModalState>(
    result: TrackerResult,
    group: K,
    lineNumber: number,
  ): ModalState[K] | null {
    const s = this.getStateAtLine(result, lineNumber);
    return s ? (s[group] as ModalState[K]) : null;
  }

  /**
   * Return a default initial state — nothing set until program specifies it.
   */
  defaultInitialState(): ModalState {
    return this.initialState();
  }

  // ── Private ─────────────────────────────────────────────────────────

  private initialState(override?: Partial<ModalState>): ModalState {
    const base: ModalState = {
      motion: null,
      plane: null,
      distance: null,
      units: null,
      cutter_comp: null,
      work_offset: null,
      feed_mode: null,
      spindle_mode: null,
      canned_cycle: null,
      return_mode: null,
      spindle: null,
      coolant: null,
      tool: null,
      feed_rate: null,
      spindle_rpm: null,
    };
    return { ...base, ...(override ?? {}) };
  }

  private applyLine(
    code: string,
    prev: ModalState,
    warnings: string[],
    lineNum: number,
  ): ModalState {
    const next = { ...prev };

    // G-codes — scan all occurrences
    const gMatches = [...code.matchAll(/\bG(\d+(?:\.\d+)?)\b/g)];
    for (const m of gMatches) {
      const value = m[1];
      const num = parseFloat(value);
      const canonical = "G" + (Number.isInteger(num) ? num.toString() : value);

      // Motion group
      if (["G0", "G1", "G2", "G3"].includes(canonical)) {
        next.motion = canonical as MotionCode;
        continue;
      }
      // Plane
      if (canonical === "G17" || canonical === "G18" || canonical === "G19") {
        next.plane = canonical as PlaneCode;
        continue;
      }
      // Units
      if (canonical === "G20" || canonical === "G21") {
        next.units = canonical as UnitsCode;
        continue;
      }
      // Cutter comp
      if (canonical === "G40" || canonical === "G41" || canonical === "G42") {
        next.cutter_comp = canonical as CutterCompCode;
        continue;
      }
      // Work offset
      if (["G54", "G55", "G56", "G57", "G58", "G59"].includes(canonical)) {
        next.work_offset = canonical as WorkOffsetCode;
        continue;
      }
      // Extended work offsets (G54.1 Pn) — flag but don't break
      if (canonical === "G54.1") {
        next.work_offset = "G54" as WorkOffsetCode; // closest standard
        warnings.push(`Line ${lineNum}: G54.1 extended offset — stored as G54`);
        continue;
      }
      // Distance mode
      if (canonical === "G90" || canonical === "G91") {
        next.distance = canonical as DistanceCode;
        continue;
      }
      // Feed mode
      if (canonical === "G93" || canonical === "G94" || canonical === "G95") {
        next.feed_mode = canonical as FeedModeCode;
        continue;
      }
      // Spindle mode
      if (canonical === "G96" || canonical === "G97") {
        next.spindle_mode = canonical as SpindleModeCode;
        continue;
      }
      // Return mode
      if (canonical === "G98" || canonical === "G99") {
        next.return_mode = canonical as ReturnModeCode;
        continue;
      }
      // Canned cycles G80..G89
      if (/^G8[0-9]$/.test(canonical)) {
        next.canned_cycle = canonical as CannedCycleCode;
        continue;
      }
    }

    // M-codes for spindle & coolant
    const mMatches = [...code.matchAll(/\bM(\d+)\b/g)];
    for (const m of mMatches) {
      const num = parseInt(m[1], 10);
      if (num === 3) next.spindle = "M3";
      else if (num === 4) next.spindle = "M4";
      else if (num === 5) next.spindle = "M5";
      else if (num === 7) next.coolant = "M7";
      else if (num === 8) next.coolant = "M8";
      else if (num === 9) next.coolant = "M9";
    }

    // T-word (tool)
    const tMatch = code.match(/\bT(\d+)\b/);
    if (tMatch) {
      next.tool = parseInt(tMatch[1], 10);
    }

    // F-word (feed rate) — must not be inside a canned cycle Z-level (it is
    // still a valid F-word for the active modal group)
    const fMatch = code.match(/\bF(-?\d+\.?\d*)\b/);
    if (fMatch) {
      const f = parseFloat(fMatch[1]);
      if (!Number.isNaN(f)) next.feed_rate = f;
    }

    // S-word (spindle RPM)
    const sMatch = code.match(/\bS(-?\d+\.?\d*)\b/);
    if (sMatch) {
      const s = parseFloat(sMatch[1]);
      if (!Number.isNaN(s)) next.spindle_rpm = s;
    }

    return next;
  }

  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r;
  }
}

export const ppModalStateTrackerEngine = new PPModalStateTrackerEngine();
