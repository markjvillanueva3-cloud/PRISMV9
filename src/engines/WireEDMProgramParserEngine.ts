/**
 * WireEDMProgramParserEngine — Parse Wire EDM G-code Programs
 *
 * Parses wire EDM NC programs from multiple controller dialects into
 * structured AST. Auto-detects controller from program markers.
 *
 * Supported controllers:
 *   - Mitsubishi M800/MV series (E0100-E0500, C-codes, D-register offsets)
 *   - Fanuc ROBOcut alpha-C/CiB (E0001-E0005, H-register offsets)
 *   - Sodick AL/AQ series (C100-C500, ON/OFF time params)
 *   - AgieCharmilles CUT series (ISPG/IPG, ACO tech tables)
 *   - Makino U6/U3 (E-codes similar to Fanuc, HyperCut markers)
 *
 * Extracts:
 *   - Multi-pass structure (rough + skim passes with condition codes)
 *   - Wire offset values (G41/G42 D/H register)
 *   - Taper angles (G51 U/W)
 *   - Flushing settings (M80/M81/M82/M83)
 *   - Wire threading sequence (M06, M50/M51)
 *   - Cut contour geometry (G00/G01/G02/G03 moves)
 *   - Work origin (G92)
 *
 * References:
 *   - Mitsubishi Wire EDM Programming Manual (M800 series)
 *   - Fanuc ROBOcut Operator's Manual (FS31i-WA)
 *   - Sodick EDM Operating Instructions (SPW controller)
 *   - EDMPostProcessorExtension.ts dialect definitions
 *
 * @module engines/WireEDMProgramParserEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type WireEDMDialect =
  | "mitsubishi"
  | "fanuc"
  | "sodick"
  | "agiecharmilles"
  | "makino"
  | "unknown";

export interface WireEDMProgram {
  filename: string;
  program_number: string | null;
  program_comment: string | null;
  dialect: WireEDMDialect;
  dialect_confidence: number;
  passes: WireEDMPass[];
  contour_moves: WireEDMMove[];
  wire_settings: WireSettings;
  taper: TaperInfo;
  flushing: FlushingInfo;
  work_origin: { x: number | null; y: number | null };
  safety: WireEDMSafetyInfo;
  lineCount: number;
  hasMultiPass: boolean;
  hasTaper: boolean;
  hasSubmergedCut: boolean;
  rawLines: string[];
}

export interface WireEDMPass {
  pass_number: number;
  phase: "rough" | "skim1" | "skim2" | "skim3" | "skim4" | "unknown";
  condition_code: string | null;
  offset_register: number | null;
  offset_direction: "left" | "right" | null;
  start_line: number;
  end_line: number;
  move_count: number;
}

export interface WireEDMMove {
  type: "rapid" | "linear" | "cw_arc" | "ccw_arc";
  g_code: string;
  line_number: number;
  x: number | null;
  y: number | null;
  u: number | null;
  v: number | null;
  i: number | null;
  j: number | null;
  r: number | null;
  feed: number | null;
  pass_number: number;
}

export interface WireSettings {
  has_auto_thread: boolean;
  wire_run_on: boolean;
  thread_line: number | null;
  wire_start_line: number | null;
  wire_stop_line: number | null;
}

export interface TaperInfo {
  enabled: boolean;
  angle_deg: number | null;
  taper_on_line: number | null;
  taper_off_line: number | null;
}

export interface FlushingInfo {
  upper_on: boolean;
  lower_on: boolean;
  flush_on_line: number | null;
  flush_off_line: number | null;
}

export interface WireEDMSafetyInfo {
  has_program_end: boolean;
  has_wire_stop: boolean;
  has_offset_cancel: boolean;
  has_taper_cancel: boolean;
  has_flush_off: boolean;
  warnings: string[];
}

// ============================================================================
// DIALECT DETECTION
// ============================================================================

/** Markers that identify each wire EDM controller dialect */
const DIALECT_MARKERS: Record<WireEDMDialect, RegExp[]> = {
  mitsubishi: [
    /E0[1-5]00\b/,         // E0100-E0500 condition codes
    /C000[1-5]\b/,         // C0001-C0005 companion codes
    /\bD\d{2}\b/,          // D-register wire offset (D01, D02)
    /G51\s+W/,             // Taper with W-axis
    /MITSUBISHI/i,
  ],
  fanuc: [
    /E000[1-5]\b/,         // E0001-E0005 condition codes
    /\bH\d{2}\b/,          // H-register wire offset (H01, H02)
    /G51\s+U/,             // Taper with U-axis
    /ROBOCUT|FANUC/i,
    /G61\.1|G64/,          // Corner control
  ],
  sodick: [
    /\bC[1-5]00\b/,        // C100-C500 condition codes
    /\bIP\d+\b/,           // IP (peak current) parameter
    /\bON\d+\b/,           // ON time parameter
    /\bOFF\d+\b/,          // OFF time parameter
    /\bSV\d+\b/,           // Servo voltage parameter
    /SODICK/i,
    /SF-?LINER|K-?SMC/i,   // Sodick-specific features
  ],
  agiecharmilles: [
    /\bISPG\b|\bIPG\b/,    // ISPG/IPG power parameters
    /\bACO\b/,             // Automatic Contour Optimization
    /TAPER.?EXPERT/i,
    /AGIE|CHARMILLES/i,
    /\bCUT\s+\d/i,         // CUT series identifier
  ],
  makino: [
    /MAKINO|HYPER.?CUT|HYPER.?i/i,
    /E00[0-9]{2}\b/,       // E-codes similar to Fanuc
    /\bHS\b/,              // High-speed wire marker
  ],
  unknown: [],
};

// ============================================================================
// ENGINE
// ============================================================================

export class WireEDMProgramParserEngine {
  /**
   * Parse a wire EDM program into structured AST.
   * Auto-detects controller dialect from program content.
   */
  parse(content: string, filename = "unknown"): WireEDMProgram {
    const lines = content.split(/\r?\n/);
    const program: WireEDMProgram = {
      filename,
      program_number: null,
      program_comment: null,
      dialect: "unknown",
      dialect_confidence: 0,
      passes: [],
      contour_moves: [],
      wire_settings: {
        has_auto_thread: false,
        wire_run_on: false,
        thread_line: null,
        wire_start_line: null,
        wire_stop_line: null,
      },
      taper: {
        enabled: false,
        angle_deg: null,
        taper_on_line: null,
        taper_off_line: null,
      },
      flushing: {
        upper_on: false,
        lower_on: false,
        flush_on_line: null,
        flush_off_line: null,
      },
      work_origin: { x: null, y: null },
      safety: {
        has_program_end: false,
        has_wire_stop: false,
        has_offset_cancel: false,
        has_taper_cancel: false,
        has_flush_off: false,
        warnings: [],
      },
      lineCount: lines.length,
      hasMultiPass: false,
      hasTaper: false,
      hasSubmergedCut: false,
      rawLines: lines,
    };

    this._detectDialect(content, program);
    this._extractProgramHeader(lines, program);
    this._extractWorkOrigin(lines, program);
    this._extractWireSettings(lines, program);
    this._extractTaper(lines, program);
    this._extractFlushing(lines, program);
    this._extractMovesAndPasses(lines, program);
    this._validateSafety(lines, program);

    return program;
  }

  /**
   * Extract speed/feed and offset data from a parsed program for pattern mining.
   */
  extractCuttingData(program: WireEDMProgram): Array<{
    pass_phase: string;
    condition_code: string | null;
    offset_register: number | null;
    move_count: number;
    feed_values: number[];
  }> {
    return program.passes.map(pass => {
      const feeds = program.contour_moves
        .filter(m => m.pass_number === pass.pass_number && m.feed !== null)
        .map(m => m.feed!);
      return {
        pass_phase: pass.phase,
        condition_code: pass.condition_code,
        offset_register: pass.offset_register,
        move_count: pass.move_count,
        feed_values: feeds,
      };
    });
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────

  private _detectDialect(content: string, program: WireEDMProgram): void {
    const scores: Record<WireEDMDialect, number> = {
      mitsubishi: 0,
      fanuc: 0,
      sodick: 0,
      agiecharmilles: 0,
      makino: 0,
      unknown: 0,
    };

    for (const [dialect, markers] of Object.entries(DIALECT_MARKERS) as [WireEDMDialect, RegExp[]][]) {
      if (dialect === "unknown") continue;
      for (const marker of markers) {
        if (marker.test(content)) {
          scores[dialect] += 1;
        }
      }
    }

    let best: WireEDMDialect = "unknown";
    let bestScore = 0;
    let totalHits = 0;
    for (const [dialect, score] of Object.entries(scores) as [WireEDMDialect, number][]) {
      if (dialect === "unknown") continue;
      totalHits += score;
      if (score > bestScore) {
        bestScore = score;
        best = dialect;
      }
    }

    program.dialect = best;
    program.dialect_confidence = totalHits > 0
      ? Math.round((bestScore / DIALECT_MARKERS[best].length) * 100)
      : 0;
  }

  private _extractProgramHeader(lines: string[], program: WireEDMProgram): void {
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();

      // O-number: O0001, O1234
      const oMatch = line.match(/^O(\d{4,})/);
      if (oMatch && !program.program_number) {
        program.program_number = oMatch[1];
        const commentMatch = line.match(/\(([^)]+)\)/);
        if (commentMatch) {
          program.program_comment = commentMatch[1].trim();
        }
      }
    }
  }

  private _extractWorkOrigin(lines: string[], program: WireEDMProgram): void {
    for (const line of lines) {
      const trimmed = line.trim();
      const g92Match = trimmed.match(/G92\s*(.*)/i);
      if (g92Match) {
        const rest = g92Match[1];
        const xMatch = rest.match(/X([+-]?[\d.]+)/);
        const yMatch = rest.match(/Y([+-]?[\d.]+)/);
        if (xMatch) program.work_origin.x = parseFloat(xMatch[1]);
        if (yMatch) program.work_origin.y = parseFloat(yMatch[1]);
        break;
      }
    }
  }

  private _extractWireSettings(lines: string[], program: WireEDMProgram): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();

      // M06: wire auto-thread
      if (/\bM0?6\b/.test(line) && /WIRE|THREAD/i.test(line)) {
        program.wire_settings.has_auto_thread = true;
        program.wire_settings.thread_line = i + 1;
      }

      // M50: wire run/feed start
      if (/\bM50\b/.test(line)) {
        program.wire_settings.wire_run_on = true;
        if (program.wire_settings.wire_start_line === null) {
          program.wire_settings.wire_start_line = i + 1;
        }
      }

      // M51: wire stop
      if (/\bM51\b/.test(line)) {
        program.wire_settings.wire_stop_line = i + 1;
      }
    }
  }

  private _extractTaper(lines: string[], program: WireEDMProgram): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // G51 with U or W: taper on
      const taperMatch = line.match(/G51\s+[UW]([+-]?[\d.]+)/i);
      if (taperMatch) {
        program.taper.enabled = true;
        program.taper.angle_deg = parseFloat(taperMatch[1]);
        program.taper.taper_on_line = i + 1;
        program.hasTaper = true;
      }

      // G50 (without S — S is spindle clamp in lathe context): taper off
      if (/^G50\b/.test(line) && !/S\d/.test(line)) {
        program.taper.taper_off_line = i + 1;
      }
    }
  }

  private _extractFlushing(lines: string[], program: WireEDMProgram): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();

      // M80: upper flush on, M81: lower flush on
      if (/\bM80\b/.test(line)) {
        program.flushing.upper_on = true;
        if (program.flushing.flush_on_line === null) {
          program.flushing.flush_on_line = i + 1;
        }
      }
      if (/\bM81\b/.test(line)) {
        program.flushing.lower_on = true;
        if (program.flushing.flush_on_line === null) {
          program.flushing.flush_on_line = i + 1;
        }
      }

      // M82/M83: flush off
      if (/\bM82\b/.test(line) || /\bM83\b/.test(line)) {
        program.flushing.flush_off_line = i + 1;
      }

      // Submerged cutting detection
      if (/SUBMERGE|DIELECTRIC\s+FILL|TANK\s+FILL/i.test(line)) {
        program.hasSubmergedCut = true;
      }
    }
  }

  private _extractMovesAndPasses(lines: string[], program: WireEDMProgram): void {
    let currentPass = 0;
    let currentPhase: WireEDMPass["phase"] = "rough";
    let currentCondition: string | null = null;
    let currentOffset: number | null = null;
    let currentOffsetDir: "left" | "right" | null = null;
    let passStartLine = -1;
    let passMoveCount = 0;

    // Condition code patterns by dialect
    const conditionPatterns: RegExp[] = [
      /\b(E0[0-5]0[0-9])\b/,             // Mitsubishi/Fanuc E-codes
      /\b(E000[1-5])\b/,                   // Fanuc E-codes
      /\b(C[1-5]00)\b/,                    // Sodick C-codes
      /\b(C000[1-5])\b/,                   // Mitsubishi C-codes
    ];

    const phaseFromCondition = (code: string): WireEDMPass["phase"] => {
      // Fanuc: E0001=rough, E0002-5=skim
      if (/E0001/.test(code)) return "rough";
      if (/E0002/.test(code)) return "skim1";
      if (/E0003/.test(code)) return "skim2";
      if (/E0004/.test(code)) return "skim3";
      if (/E0005/.test(code)) return "skim4";
      // Mitsubishi: E0100=rough, E0200-500=skim
      if (/E0100/.test(code)) return "rough";
      if (/E0200/.test(code)) return "skim1";
      if (/E0300/.test(code)) return "skim2";
      if (/E0400/.test(code)) return "skim3";
      if (/E0500/.test(code)) return "skim4";
      // Sodick: C100=rough, C200-500=skim
      if (/C100/.test(code)) return "rough";
      if (/C200/.test(code)) return "skim1";
      if (/C300/.test(code)) return "skim2";
      if (/C400/.test(code)) return "skim3";
      if (/C500/.test(code)) return "skim4";
      return "unknown";
    };

    const finishPass = (endLine: number) => {
      if (passStartLine >= 0 && passMoveCount > 0) {
        program.passes.push({
          pass_number: currentPass,
          phase: currentPhase,
          condition_code: currentCondition,
          offset_register: currentOffset,
          offset_direction: currentOffsetDir,
          start_line: passStartLine,
          end_line: endLine,
          move_count: passMoveCount,
        });
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === "%" || line.startsWith("(") && !line.includes("G") && !line.includes("M")) continue;

      // Detect condition code → new pass
      for (const pat of conditionPatterns) {
        const condMatch = line.match(pat);
        if (condMatch) {
          finishPass(i);
          currentPass++;
          currentCondition = condMatch[1];
          currentPhase = phaseFromCondition(currentCondition);
          passStartLine = i + 1;
          passMoveCount = 0;
          break;
        }
      }

      // Wire offset: G41/G42 with D or H register
      const offsetMatch = line.match(/G4([12])\s+[DH](\d+)/);
      if (offsetMatch) {
        currentOffsetDir = offsetMatch[1] === "1" ? "left" : "right";
        currentOffset = parseInt(offsetMatch[2], 10);
        if (passStartLine < 0) {
          // First offset before any condition code → implicit rough pass
          currentPass = 1;
          currentPhase = "rough";
          passStartLine = i + 1;
        }
      }

      // G40: cancel offset
      if (/\bG40\b/.test(line)) {
        // This often marks end of a contour cut
      }

      // Motion commands
      const motionMatch = line.match(/\b(G0[0-3])\b/);
      if (motionMatch) {
        const gCode = motionMatch[1];
        const type: WireEDMMove["type"] =
          gCode === "G00" ? "rapid" :
          gCode === "G01" ? "linear" :
          gCode === "G02" ? "cw_arc" : "ccw_arc";

        const x = this._parseAxis(line, "X");
        const y = this._parseAxis(line, "Y");
        const u = this._parseAxis(line, "U");
        const v = this._parseAxis(line, "V");
        const iVal = this._parseAxis(line, "I");
        const j = this._parseAxis(line, "J");
        const r = this._parseAxis(line, "R");
        const feed = this._parseAxis(line, "F");

        if (passStartLine < 0) {
          // First move before any condition code → implicit single-pass
          currentPass = 1;
          currentPhase = "rough";
          passStartLine = i + 1;
        }

        program.contour_moves.push({
          type,
          g_code: gCode,
          line_number: i + 1,
          x, y, u, v,
          i: iVal, j, r,
          feed,
          pass_number: currentPass || 1,
        });
        passMoveCount++;
      }
    }

    // Finish last pass
    finishPass(lines.length);

    program.hasMultiPass = program.passes.length > 1;

    // If no passes were detected from condition codes but we have moves, create implicit pass
    if (program.passes.length === 0 && program.contour_moves.length > 0) {
      program.passes.push({
        pass_number: 1,
        phase: "rough",
        condition_code: null,
        offset_register: currentOffset,
        offset_direction: currentOffsetDir,
        start_line: 1,
        end_line: lines.length,
        move_count: program.contour_moves.length,
      });
    }
  }

  private _validateSafety(lines: string[], program: WireEDMProgram): void {
    const content = lines.join("\n").toUpperCase();

    program.safety.has_program_end = /\bM0?2\b|\bM30\b/.test(content);
    program.safety.has_wire_stop = /\bM51\b/.test(content);
    program.safety.has_offset_cancel = /\bG40\b/.test(content);
    program.safety.has_taper_cancel = program.hasTaper ? /\bG50\b/.test(content) : true;
    program.safety.has_flush_off = program.flushing.upper_on || program.flushing.lower_on
      ? /\bM82\b|\bM83\b/.test(content) : true;

    // Safety warnings
    if (program.wire_settings.wire_run_on && !program.safety.has_wire_stop) {
      program.safety.warnings.push("Wire started (M50) but never stopped (M51)");
    }
    if (!program.safety.has_program_end) {
      program.safety.warnings.push("Missing program end (M02/M30)");
    }
    if (!program.safety.has_offset_cancel && program.passes.some(p => p.offset_register !== null)) {
      program.safety.warnings.push("Wire offset active but G40 cancel not found");
    }
    if (program.hasTaper && !program.safety.has_taper_cancel) {
      program.safety.warnings.push("Taper enabled (G51) but never cancelled (G50)");
    }

    log.debug(`[WireEDMProgramParser] Parsed ${program.filename}: ${program.dialect} dialect, ` +
      `${program.passes.length} passes, ${program.contour_moves.length} moves, ` +
      `${program.safety.warnings.length} warnings`);
  }

  private _parseAxis(line: string, axis: string): number | null {
    // Match axis letter followed by optional sign and digits
    // Avoid matching axis letters inside parentheses (comments)
    const beforeComment = line.split("(")[0];
    const match = beforeComment.match(new RegExp(`${axis}([+-]?\\d*\\.?\\d+)`));
    return match ? parseFloat(match[1]) : null;
  }
}

// Singleton export
export const wireEDMProgramParserEngine = new WireEDMProgramParserEngine();
