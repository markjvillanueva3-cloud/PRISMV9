/**
 * HurcoParserEngine — Parse Hurco VM30i/VMX Programs
 *
 * Handles both Hurco WinMax conversational format AND standard G-code mode.
 * Hurco machines can run in two modes:
 *   1. WinMax Conversational — proprietary block-based format
 *   2. NC (G-code) mode — standard Fanuc-compatible G-code
 *
 * WinMax-specific features:
 *   - PART SETUP blocks with stock dimensions and material
 *   - Tool Library references with full geometry
 *   - Conversational operation blocks (DRILL, POCKET, CONTOUR, etc.)
 *   - Pattern operations (BOLT CIRCLE, FRAME, etc.)
 *   - Automatic approach/retract strategies
 *
 * G-code mode features:
 *   - Standard Fanuc G-codes (G00-G99)
 *   - Hurco-specific: G150/G151 scaling, G68/G69 coordinate rotation
 *   - Canned cycles with L repeat count
 *   - Optional stop M01 after each tool
 *   - G43 H TLC
 *
 * @module HurcoParserEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface HurcoProgram {
  filename: string;
  program_name: string | null;
  mode: "winmax" | "gcode" | "mixed";
  part_setup: HurcoPartSetup | null;
  toolSections: HurcoToolSection[];
  operations: HurcoOperation[];
  safety: HurcoSafetyInfo;
  lineCount: number;
  hasConversational: boolean;
  hasGCode: boolean;
  hasProbing: boolean;
  hasRotaryAxis: boolean;
  rawLines: string[];
}

export interface HurcoPartSetup {
  stock_x: number | null;
  stock_y: number | null;
  stock_z: number | null;
  material: string | null;
  fixture: string | null;
  datum: string | null;
}

export interface HurcoToolSection {
  tool_number: number;
  tool_description: string | null;
  diameter: number | null;
  flute_count: number | null;
  start_line: number;
  end_line: number;
  spindle_rpm: number | null;
  feed_rate: number | null;
  operations: HurcoOperation[];
}

export interface HurcoOperation {
  type: string;
  mode: "conversational" | "gcode";
  g_code: string | null;
  line_number: number;
  params: Record<string, number | string>;
  /**
   * U-HURCO-PARSER-GCODE-MODE (echo iter9 2026-05-24) — populated by the new
   * inline-G-code op extraction path. Optional + additive so legacy callers
   * + the 14 existing V11 test files stay untouched.
   */
  tool_number?: number;
  spindle_rpm?: number;
  feed_mm_min?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  end_line_number?: number;
  /**
   * Motion coordinates parsed from G1/G2/G3 blocks within this tool segment.
   * Empty for canned-cycle ops (G81/G83/etc.) which carry their position
   * in `params` instead.
   */
  coordinates?: Array<{ x: number; y: number; z: number; type: "rapid" | "linear" | "arc_cw" | "arc_ccw" }>;
}

export interface HurcoSafetyInfo {
  has_safe_start: boolean;
  has_tool_length_comp: boolean;
  has_program_end: boolean;
  has_coolant_control: boolean;
  has_spindle_stop: boolean;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class HurcoParserEngine {
  /**
   * Parse a Hurco program into structured AST.
   * Auto-detects WinMax vs G-code mode.
   */
  parse(content: string, filename = "unknown"): HurcoProgram {
    const lines = content.split(/\r?\n/);
    const program: HurcoProgram = {
      filename,
      program_name: null,
      mode: "gcode",
      part_setup: null,
      toolSections: [],
      operations: [],
      safety: {
        has_safe_start: false,
        has_tool_length_comp: false,
        has_program_end: false,
        has_coolant_control: false,
        has_spindle_stop: false,
        warnings: [],
      },
      lineCount: lines.length,
      hasConversational: false,
      hasGCode: false,
      hasProbing: false,
      hasRotaryAxis: false,
      rawLines: lines,
    };

    // Detect mode
    const contentUpper = content.toUpperCase();
    program.hasConversational = contentUpper.includes("PART SETUP") ||
      contentUpper.includes("CONVERSATIONAL") ||
      contentUpper.includes("DRILL PATTERN") ||
      contentUpper.includes("POCKET MILL");
    program.hasGCode = /G[0-9]{1,2}\b/.test(contentUpper);

    if (program.hasConversational && program.hasGCode) {
      program.mode = "mixed";
    } else if (program.hasConversational) {
      program.mode = "winmax";
    } else {
      program.mode = "gcode";
    }

    // Extract program name from first comment or header
    for (const line of lines.slice(0, 10)) {
      const nameMatch = line.match(/\(([^)]+)\)/);
      if (nameMatch) {
        program.program_name = nameMatch[1].trim();
        break;
      }
      const percentMatch = line.match(/^%\s*(.+)/);
      if (percentMatch) {
        program.program_name = percentMatch[1].trim();
        break;
      }
    }

    this._extractPartSetup(lines, program);
    this._extractToolSections(lines, program);
    this._extractOperations(lines, program);
    // U-HURCO-PARSER-GCODE-MODE (echo iter9): fallback for inline-G-code .hnc
    // files (Fanuc-style with linear motion, no canned cycles). Synthesizes
    // one HurcoOperation per T# M6 tool-change segment so downstream consumers
    // (roundtrip harness, JM Die programs) see a populated operations[] with
    // actual motion coordinates. Trigger: mode is gcode/mixed AND no existing
    // op already carries coordinates (the canned-cycle classifier never sets
    // them, so its conversational-comment matches don't block this fallback —
    // a real production .hnc with "(face mill)" in a tool comment was the
    // false-positive that hid this path until iter9 caught it).
    // U-HURCO-PARSER-MS1-INLINE-NEXT-TO-CANNED (echo iter12): files like
    // 0520396.hnc carry BOTH G81/G84 canned cycles AND inline G1 motion in
    // different tool segments. The canned-cycle classifier emits ops with
    // g_code !== null BUT NO coordinates, leaving the harness with nothing
    // re-emittable. Run the fallback whenever no op has coords, regardless
    // of g_code presence — the inline path picks up the surrounding G0/G1
    // setup motion AND tool-change boundaries, complementing (not replacing)
    // the canned-cycle classifier ops.
    if (
      (program.mode === "gcode" || program.mode === "mixed") &&
      !program.operations.some(o => (o.coordinates?.length ?? 0) > 0)
    ) {
      this._extractInlineGCodeOps(lines, program);
    }
    this._validateSafety(lines, program);

    // Rotary axis detection
    program.hasRotaryAxis = contentUpper.includes("A ") && /\bA-?\d/.test(contentUpper) ||
      contentUpper.includes("B ") && /\bB-?\d/.test(contentUpper);

    return program;
  }

  /**
   * Extract speed/feed data for pattern mining.
   */
  extractSpeedFeeds(program: HurcoProgram): Array<{
    tool: number;
    operation: string;
    speed_rpm: number | null;
    feed: number | null;
  }> {
    const results: Array<{
      tool: number;
      operation: string;
      speed_rpm: number | null;
      feed: number | null;
    }> = [];

    for (const section of program.toolSections) {
      for (const op of section.operations) {
        results.push({
          tool: section.tool_number,
          operation: op.type,
          speed_rpm: section.spindle_rpm,
          feed: section.feed_rate,
        });
      }
    }

    return results;
  }

  // ── Private Methods ────────────────────────────────────────────────────

  private _extractPartSetup(lines: string[], program: HurcoProgram): void {
    let inSetup = false;
    const setup: HurcoPartSetup = {
      stock_x: null, stock_y: null, stock_z: null,
      material: null, fixture: null, datum: null,
    };

    for (const line of lines) {
      const upper = line.trim().toUpperCase();

      if (upper.includes("PART SETUP") || upper.includes("STOCK")) {
        inSetup = true;
      }

      if (inSetup) {
        const xMatch = upper.match(/(?:STOCK\s*)?X\s*=?\s*(-?\d+\.?\d*)/);
        const yMatch = upper.match(/(?:STOCK\s*)?Y\s*=?\s*(-?\d+\.?\d*)/);
        const zMatch = upper.match(/(?:STOCK\s*)?Z\s*=?\s*(-?\d+\.?\d*)/);
        const matMatch = line.match(/MATERIAL\s*[:=]\s*(.+)/i);
        const fixMatch = line.match(/FIXTURE\s*[:=]\s*(.+)/i);

        if (xMatch) setup.stock_x = parseFloat(xMatch[1]);
        if (yMatch) setup.stock_y = parseFloat(yMatch[1]);
        if (zMatch) setup.stock_z = parseFloat(zMatch[1]);
        if (matMatch) setup.material = matMatch[1].trim();
        if (fixMatch) setup.fixture = fixMatch[1].trim();
      }

      // End of setup block
      if (inSetup && (upper.includes("END SETUP") || upper.match(/^T\d/))) {
        break;
      }
    }

    if (setup.stock_x !== null || setup.material !== null) {
      program.part_setup = setup;
    }
  }

  private _extractToolSections(lines: string[], program: HurcoProgram): void {
    let currentSection: HurcoToolSection | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();

      // Tool change in G-code: T## M06 or M06 T##
      const toolMatch = line.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      // WinMax tool reference
      const winToolMatch = line.match(/^TOOL\s+(\d+)/i);

      if (toolMatch || winToolMatch) {
        if (currentSection) {
          currentSection.end_line = i - 1;
          program.toolSections.push(currentSection);
        }

        const toolNum = toolMatch
          ? parseInt(toolMatch[1] ?? toolMatch[2], 10)
          : parseInt(winToolMatch![1], 10);

        const comment = lines[i].match(/\(([^)]*)\)/)?.[1] ?? null;

        currentSection = {
          tool_number: toolNum,
          tool_description: comment,
          diameter: null,
          flute_count: null,
          start_line: i,
          end_line: -1,
          spindle_rpm: null,
          feed_rate: null,
          operations: [],
        };

        // Extract diameter from comment
        if (comment) {
          const diaMatch = comment.match(/(\d+\.?\d*)\s*(?:MM|DIA|D)/i);
          if (diaMatch) currentSection.diameter = parseFloat(diaMatch[1]);
        }
      }

      if (!currentSection) continue;

      // Spindle speed
      const sMatch = line.match(/S(\d+)/);
      if (sMatch && (line.includes("M03") || line.includes("M04") || line.includes("M3") || line.includes("M4"))) {
        currentSection.spindle_rpm = parseInt(sMatch[1], 10);
      } else if (sMatch && !currentSection.spindle_rpm) {
        currentSection.spindle_rpm = parseInt(sMatch[1], 10);
      }

      // Feed rate
      const fMatch = line.match(/F(\d+\.?\d*)/);
      if (fMatch && line.includes("G01") || fMatch && line.includes("G1 ")) {
        currentSection.feed_rate = parseFloat(fMatch[1]);
      }

      // TLC
      if (line.includes("G43")) {
        program.safety.has_tool_length_comp = true;
      }
    }

    if (currentSection) {
      currentSection.end_line = lines.length - 1;
      program.toolSections.push(currentSection);
    }
  }

  private _extractOperations(lines: string[], program: HurcoProgram): void {
    let currentTool = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const upper = line.toUpperCase();

      // Track tool
      const toolMatch = upper.match(/T(\d+)\s*M0?6|M0?6\s*T(\d+)/);
      if (toolMatch) {
        currentTool = parseInt(toolMatch[1] ?? toolMatch[2], 10);
      }

      const op = this._classifyOperation(upper, i);
      if (op) {
        program.operations.push(op);
        const section = program.toolSections.find(s => s.tool_number === currentTool);
        if (section) section.operations.push(op);
      }
    }
  }

  /**
   * U-HURCO-PARSER-GCODE-MODE (echo iter9 2026-05-24) — segment an inline-G-code
   * .hnc file into one synthetic HurcoOperation per T# M6 boundary. Captures
   * each segment's tool number, first-seen spindle RPM + feed rate, and all
   * G1/G2/G3 motion coordinates (rapids included). Operation `type` is best-
   * effort classified from preceding annotation comments
   * (`(STRATEGY: ADAPTIVE2D)`, `(OPERATION: DRILL)`, `(FACE MILL)`, etc.)
   * with `gcode_segment` as the safe default. Pure / non-throwing / defensive
   * against malformed numerics.
   */
  private _extractInlineGCodeOps(lines: string[], program: HurcoProgram): void {
    // Find tool-change boundaries.
    const TOOL_CHANGE_RE = /T(\d+)\s*M0?6|M0?6\s*T(\d+)/;
    const boundaries: Array<{ lineIdx: number; toolNum: number }> = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].toUpperCase().match(TOOL_CHANGE_RE);
      if (m) {
        const tn = parseInt(m[1] ?? m[2], 10);
        if (Number.isFinite(tn)) boundaries.push({ lineIdx: i, toolNum: tn });
      }
    }
    if (boundaries.length === 0) return;

    const STRATEGY_RE = /\(\s*(?:STRATEGY|OPERATION)\s*:\s*([A-Z0-9_\- ]+)\)/i;
    const NAMED_OP_RE = /\((?:[^)]*?)(FACE\s*MILL|POCKET\s*MILL|CONTOUR\s*MILL|DRILL\s*PATTERN|BOLT\s*CIRCLE|FRAME\s*MILL|ADAPTIVE|HSM|TRACE|FINISH|ROUGH|CHAMFER|TAP|BORE|REAM)(?:[^)]*)\)/i;

    function classifyFromAnnotation(window: string): string {
      const strat = window.match(STRATEGY_RE);
      if (strat) {
        const s = strat[1].trim().toLowerCase().replace(/\s+/g, "_");
        if (s.includes("adapt")) return "adaptive";
        if (s.includes("face")) return "face";
        if (s.includes("pocket")) return "pocket";
        if (s.includes("contour")) return "contour";
        if (s.includes("drill")) return "drill";
        if (s.includes("tap")) return "tap";
        if (s.includes("chamfer")) return "chamfer";
        if (s.includes("bore")) return "bore";
        if (s.includes("finish")) return "finish";
        if (s.includes("rough")) return "rough";
        return s.slice(0, 32) || "gcode_segment";
      }
      const named = window.match(NAMED_OP_RE);
      if (named) {
        const n = named[1].toLowerCase().replace(/\s+/g, "_");
        if (n.includes("face")) return "face";
        if (n.includes("pocket")) return "pocket";
        if (n.includes("contour")) return "contour";
        if (n.includes("drill")) return "drill";
        if (n.includes("bolt")) return "bolt_circle";
        if (n.includes("frame")) return "frame";
        if (n.includes("adaptive") || n.includes("hsm")) return "adaptive";
        if (n.includes("chamfer")) return "chamfer";
        if (n.includes("tap")) return "tap";
        if (n.includes("bore")) return "bore";
        if (n.includes("ream")) return "ream";
        if (n.includes("finish")) return "finish";
        if (n.includes("rough")) return "rough";
      }
      return "gcode_segment";
    }

    // G-code is MODAL — motion mode persists until re-stated. JM Die / Hurco
    // programs frequently emit X/Y/Z-only blocks after the initial G1 (or
    // G2/G3). The parser must track the current mode AND emit a coordinate
    // any time X/Y/Z appears, using whatever motion mode is currently active.
    const MOTION_SET_RE = /(?:^|\s)(G0+|G0|G1|G01|G2|G02|G3|G03)(?=\b|\s|$)/i;
    const X_RE = /(?:^|\s)X\s*(-?\d+\.?\d*)/i;
    const Y_RE = /(?:^|\s)Y\s*(-?\d+\.?\d*)/i;
    const Z_RE = /(?:^|\s)Z\s*(-?\d+\.?\d*)/i;
    const S_RE = /(?:^|\s)S\s*(\d+)/i;
    const F_RE = /(?:^|\s)F\s*(\d+\.?\d*)/i;
    // Lines that explicitly DROP modal motion (canned cycles, dwell, etc.)
    // shouldn't emit a synthetic coord even if they have X/Y/Z fields.
    const NON_MOTION_PREFIX_RE = /(?:^|\s)(G4|G04|G28|G30|G43|G49|G53|G54|G55|G56|G57|G58|G59|G80|G81|G82|G83|G84|G85|G86|G87|G88|G89|G90|G91|G92|G98|G99|G5\.|G05\.|G64|G61|G68|G69|G17|G18|G19|G20|G21|G40|G41|G42)\b/i;

    function classifyMotion(g: string): NonNullable<HurcoOperation["coordinates"]>[number]["type"] {
      const gu = g.toUpperCase();
      if (gu === "G2" || gu === "G02") return "arc_cw";
      if (gu === "G3" || gu === "G03") return "arc_ccw";
      if (gu === "G0" || gu === "G00") return "rapid";
      return "linear"; // G1 / G01 / fallthrough
    }

    // Process each segment [boundaries[i].lineIdx .. boundaries[i+1].lineIdx - 1].
    for (let segIdx = 0; segIdx < boundaries.length; segIdx++) {
      const start = boundaries[segIdx].lineIdx;
      const end = segIdx + 1 < boundaries.length ? boundaries[segIdx + 1].lineIdx - 1 : lines.length - 1;
      const toolNum = boundaries[segIdx].toolNum;

      // Annotation window: 10 lines preceding the tool change + 5 after
      const annStart = Math.max(0, start - 10);
      const annEnd = Math.min(lines.length - 1, start + 5);
      const annotationWindow = lines.slice(annStart, annEnd + 1).join("\n");
      const opType = classifyFromAnnotation(annotationWindow);

      // Modal state — persists across lines within this segment
      let curX = 0, curY = 0, curZ = 0;
      let currentMotion: NonNullable<HurcoOperation["coordinates"]>[number]["type"] | null = null;
      let seenAnyCoord = false;
      let firstSpindle: number | undefined;
      let firstFeed: number | undefined;
      const coordinates: NonNullable<HurcoOperation["coordinates"]> = [];

      for (let li = start; li <= end; li++) {
        const raw = lines[li];
        const upper = raw.toUpperCase();

        // Capture first S/F seen in segment (defensive numeric)
        const sm = upper.match(S_RE);
        if (sm && firstSpindle === undefined) {
          const v = parseFloat(sm[1]);
          if (Number.isFinite(v) && v > 0) firstSpindle = v;
        }
        const fm = upper.match(F_RE);
        if (fm && firstFeed === undefined) {
          const v = parseFloat(fm[1]);
          if (Number.isFinite(v) && v > 0) firstFeed = v;
        }

        // Update modal motion if a G-motion-code appears on this line
        const gm = upper.match(MOTION_SET_RE);
        if (gm) currentMotion = classifyMotion(gm[1]);

        // Skip lines that prefix a non-motion canned cycle / setup / coolant
        // EVEN if they have X/Y/Z (e.g. `G43 Z1.59 H9` is a Z-comp set, not a feed move).
        // Exception: if a motion code is ALSO present on the line, treat as motion.
        if (!gm && NON_MOTION_PREFIX_RE.test(upper)) continue;

        // Parse X/Y/Z fields
        const xm = raw.match(X_RE);
        const ym = raw.match(Y_RE);
        const zm = raw.match(Z_RE);
        if (xm) { const v = parseFloat(xm[1]); if (Number.isFinite(v)) curX = v; }
        if (ym) { const v = parseFloat(ym[1]); if (Number.isFinite(v)) curY = v; }
        if (zm) { const v = parseFloat(zm[1]); if (Number.isFinite(v)) curZ = v; }

        // Emit a coordinate iff (a) at least one of X/Y/Z was specified AND
        // (b) we have a current motion mode (either set on this line or
        // inherited from prior). No motion mode + just numbers = not motion
        // (parameter line, sub-call, etc.) — skip.
        if ((xm || ym || zm) && currentMotion !== null) {
          coordinates.push({ x: curX, y: curY, z: curZ, type: currentMotion });
          seenAnyCoord = true;
        }
      }

      // Skip segments with zero coordinates — these are typically standalone
      // tool-prep blocks (G43 / G54 / coolant-on) with no motion. Including
      // them would emit empty ops that the harness adapter filters out anyway.
      if (!seenAnyCoord) continue;

      const op: HurcoOperation = {
        type: opType,
        mode: "gcode",
        g_code: null,
        line_number: start,
        end_line_number: end,
        params: {},
        tool_number: toolNum,
        coordinates,
      };
      if (firstSpindle !== undefined) op.spindle_rpm = firstSpindle;
      if (firstFeed !== undefined) op.feed_mm_min = firstFeed;
      program.operations.push(op);

      const section = program.toolSections.find(s => s.tool_number === toolNum);
      if (section) section.operations.push(op);
    }
  }

  private _classifyOperation(line: string, lineNum: number): HurcoOperation | null {
    const params: Record<string, number | string> = {};
    for (const m of line.matchAll(/([A-Z])(-?\d+\.?\d*)/g)) {
      params[m[1]] = parseFloat(m[2]);
    }

    // Conversational operations
    if (line.includes("DRILL PATTERN")) return { type: "drill_pattern", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("POCKET MILL")) return { type: "pocket", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("CONTOUR MILL")) return { type: "contour", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("FACE MILL")) return { type: "face", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("BOLT CIRCLE")) return { type: "bolt_circle", mode: "conversational", g_code: null, line_number: lineNum, params };
    if (line.includes("FRAME MILL")) return { type: "frame", mode: "conversational", g_code: null, line_number: lineNum, params };

    // G-code drilling
    if (line.includes("G81")) return { type: "drill", mode: "gcode", g_code: "G81", line_number: lineNum, params };
    if (line.includes("G83")) return { type: "peck_drill", mode: "gcode", g_code: "G83", line_number: lineNum, params };
    if (line.includes("G73")) return { type: "chip_break", mode: "gcode", g_code: "G73", line_number: lineNum, params };
    if (line.includes("G84")) return { type: "tap", mode: "gcode", g_code: "G84", line_number: lineNum, params };
    if (line.includes("G85")) return { type: "bore", mode: "gcode", g_code: "G85", line_number: lineNum, params };
    if (line.includes("G76")) return { type: "bore_fine", mode: "gcode", g_code: "G76", line_number: lineNum, params };

    // G-code milling
    if (line.includes("G12")) return { type: "cw_pocket", mode: "gcode", g_code: "G12", line_number: lineNum, params };
    if (line.includes("G13")) return { type: "ccw_pocket", mode: "gcode", g_code: "G13", line_number: lineNum, params };

    return null;
  }

  private _validateSafety(lines: string[], program: HurcoProgram): void {
    const content = lines.join("\n").toUpperCase();

    program.safety.has_safe_start = content.includes("G90") && content.includes("G80") && content.includes("G40");
    program.safety.has_program_end = content.includes("M30") || content.includes("M02") || content.includes("M2");
    program.safety.has_coolant_control = content.includes("M09") || content.includes("M9");
    program.safety.has_spindle_stop = content.includes("M05") || content.includes("M5");

    if (!program.safety.has_safe_start && program.mode !== "winmax") {
      program.safety.warnings.push("Missing safe start block (G90 G80 G40)");
    }
    if (!program.safety.has_program_end) {
      program.safety.warnings.push("No program end (M30) detected");
    }
  }
}

export const hurcoParserEngine = new HurcoParserEngine();
