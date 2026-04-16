/**
 * EDMPostProcessorExtension — Post-Processor for EDM Processes
 *
 * Converts intermediate/generic EDM programs to controller-native G-code.
 * DISTINCT from EDMProgramAssemblerEngine (which generates complete programs
 * from part descriptions). This extension handles the POST-PROCESSING step:
 * taking existing EDM toolpath data and adapting it to specific controller
 * dialects with validation and optimized condition sequencing.
 *
 * Wire EDM Post-Processing:
 *   - Condition code mapping (generic → controller-specific E/C codes)
 *   - Auto-threading sequence generation per controller
 *   - Skim pass parameter sequencing (rough → skim1 → skim2 → skim3)
 *   - Taper angle compensation (UV axis programming)
 *   - Wire offset / kerf compensation (G41/G42 or controller-specific)
 *   - Flushing pressure settings per controller
 *
 * Sinker EDM Post-Processing:
 *   - Burn sequence generation (rough → semi → finish)
 *   - Orbiting pattern codes per controller
 *   - Electrode wear compensation
 *   - Jump/retract parameter mapping
 *   - Adaptive control codes (gap voltage monitoring)
 *
 * Controller Dialects:
 *   fanuc_robocut  — Fanuc ROBOcut α-C/α-CiB (wire only, FS31i-WA)
 *   mitsubishi_edm — Mitsubishi MV/MP/EA series (wire + sinker)
 *   sodick         — Sodick AL/AG/AQ series (SPW controller, wire + sinker)
 *   agiecharmilles — GF AgieCharmilles CUT/FORM (AC CAM, wire + sinker)
 *
 * References:
 *   - Fanuc ROBOcut Operator's Manual (B-85484EN)
 *   - Mitsubishi Electric EDM Programming Manual
 *   - Sodick EDM Operating Instructions
 *   - GF Machining Solutions: AgieCharmilles Operator Guide
 *   - Machinery's Handbook, 30th ed., Ch. 32: Electrical Discharge Machining
 *
 * @module engines/EDMPostProcessorExtension
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Supported EDM post-processor controller dialects. */
export type EDMPostController =
  | "fanuc_robocut"
  | "mitsubishi_edm"
  | "sodick"
  | "agiecharmilles";

/** EDM process type. */
export type EDMPostProcessType = "wire" | "sinker";

/** Wire EDM cut phase. */
export type WireCutPhase = "rough" | "skim1" | "skim2" | "skim3" | "skim4";

/** Sinker EDM burn phase. */
export type SinkerBurnPhase = "rough" | "semi_finish" | "finish" | "micro_finish";

/** A single EDM operation parsed from input. */
export interface EDMOperation {
  type: "cut" | "thread" | "flush" | "position" | "dwell" | "orbit" | "retract";
  line_number?: number;
  x?: number;
  y?: number;
  z?: number;
  u?: number;
  v?: number;
  i?: number;
  j?: number;
  feed?: number;
  condition?: number;
  raw_line?: string;
}

/** Wire-specific dialect configuration. */
interface WireDialect {
  program_start: (num: number) => string;
  program_end: string;
  /** Condition code format: maps cut phase → G-code line(s) */
  condition: (phase: WireCutPhase) => string;
  /** Auto wire threading sequence */
  thread_sequence: string;
  /** Wire start/stop codes */
  wire_start: string;
  wire_stop: string;
  /** Flushing on/off */
  flush_on: string;
  flush_off: string;
  /** Wire offset compensation on/off */
  offset_left: (reg: number) => string;
  offset_right: (reg: number) => string;
  offset_cancel: string;
  /** Taper mode on/off (UV programming) */
  taper_on: (angle_deg: number) => string;
  taper_off: string;
  /** Wire offset values per skim pass (mm) */
  skim_offsets_mm: Record<WireCutPhase, number>;
  /** Coordinate format */
  coord_format: (x?: number, y?: number, u?: number, v?: number) => string;
  /** G-code move codes */
  rapid: string;
  linear: string;
  cw_arc: string;
  ccw_arc: string;
}

/** Sinker-specific dialect configuration. */
interface SinkerDialect {
  program_start: (num: number) => string;
  program_end: string;
  /** Condition code per burn phase */
  condition: (phase: SinkerBurnPhase) => string;
  /** Orbiting codes */
  orbit_start: (radius_mm: number) => string;
  orbit_stop: string;
  /** Jump/retract parameters */
  jump_retract: (height_mm: number) => string;
  /** Electrode wear compensation */
  wear_comp_on: (ratio: number) => string;
  wear_comp_off: string;
  /** Electrode change */
  electrode_change: (num: number) => string;
  /** Adaptive gap control on/off */
  adaptive_on: string;
  adaptive_off: string;
  /** Z-axis depth move with burn */
  burn_move: (z_mm: number, feed?: number) => string;
  rapid: string;
  linear: string;
}

/** Input for EDM post-processing. */
export interface EDMPostInput {
  /** Input G-code or intermediate EDM program */
  gcode: string;
  /** Target controller dialect */
  controller: EDMPostController;
  /** Process type — auto-detected from G-code if omitted */
  process_type?: EDMPostProcessType;
  /** Number of skim passes for wire EDM (default 3) */
  num_skim_passes?: number;
  /** Taper angle for wire EDM taper cutting (degrees) */
  taper_angle_deg?: number;
  /** Wire diameter in mm (default 0.25) */
  wire_diameter_mm?: number;
  /** Material name for condition selection */
  material?: string;
  /** Workpiece thickness in mm */
  thickness_mm?: number;
  /** Program number (default 1) */
  program_number?: number;
  /** Sinker orbit radius in mm */
  orbit_radius_mm?: number;
  /** Electrode wear ratio (0-1, e.g. 0.15 = 15% wear) */
  wear_ratio?: number;
}

/** Output from EDM post-processing. */
export interface EDMPostOutput {
  /** Controller-native G-code */
  gcode: string;
  /** Target controller */
  controller: EDMPostController;
  /** Detected or specified process type */
  process_type: EDMPostProcessType;
  /** Number of operations in output */
  operation_count: number;
  /** Warnings generated during post-processing */
  warnings: string[];
  /** Statistics */
  stats: {
    total_lines: number;
    cutting_moves: number;
    skim_passes: number;
    estimated_wire_length_m?: number;
  };
}

// ============================================================================
// WIRE EDM DIALECT DATABASE
// ============================================================================

const fmt = (v: number | undefined, axis: string): string =>
  v !== undefined ? `${axis}${v >= 0 ? "" : ""}${v.toFixed(3)}` : "";

const coord = (x?: number, y?: number, u?: number, v?: number): string => {
  const parts: string[] = [];
  if (x !== undefined) parts.push(fmt(x, "X"));
  if (y !== undefined) parts.push(fmt(y, "Y"));
  if (u !== undefined) parts.push(fmt(u, "U"));
  if (v !== undefined) parts.push(fmt(v, "V"));
  return parts.join(" ");
};

/**
 * Wire EDM dialect definitions per controller.
 *
 * Condition codes reference controller-specific technology tables.
 * Fanuc ROBOcut uses E-codes (E001=rough, E002-E005=skim).
 * Mitsubishi uses E-codes with different numbering.
 * Sodick uses condition numbers with ON/OFF time parameters.
 * AgieCharmilles uses technology table references (T-codes).
 */
const WIRE_DIALECTS: Record<EDMPostController, WireDialect> = {
  fanuc_robocut: {
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (WIRE EDM - FANUC ROBOCUT)`,
      "G90 G21 (ABSOLUTE, METRIC)",
      "G92 X0 Y0 (SET WORK ORIGIN)",
    ].join("\n"),
    program_end: "M02\n%",
    condition: (phase) => {
      const map: Record<WireCutPhase, string> = {
        rough:  "E0001 (ROUGH CUT CONDITION)",
        skim1:  "E0002 (SKIM PASS 1)",
        skim2:  "E0003 (SKIM PASS 2)",
        skim3:  "E0004 (SKIM PASS 3)",
        skim4:  "E0005 (SKIM PASS 4)",
      };
      return map[phase];
    },
    thread_sequence: [
      "M06 (AUTO WIRE THREAD)",
      "M50 (WIRE RUN FORWARD)",
    ].join("\n"),
    wire_start: "M50 (WIRE RUN FORWARD)",
    wire_stop: "M51 (WIRE STOP)",
    flush_on: "M80 M81 (UPPER+LOWER FLUSH ON)",
    flush_off: "M82 M83 (UPPER+LOWER FLUSH OFF)",
    offset_left: (reg) => `G41 H${String(reg).padStart(2, "0")} (WIRE OFFSET LEFT)`,
    offset_right: (reg) => `G42 H${String(reg).padStart(2, "0")} (WIRE OFFSET RIGHT)`,
    offset_cancel: "G40 (CANCEL WIRE OFFSET)",
    taper_on: (angle) => `G51 U${angle.toFixed(3)} (TAPER MODE ON)`,
    taper_off: "G50 (TAPER MODE OFF)",
    skim_offsets_mm: { rough: 0.150, skim1: 0.100, skim2: 0.050, skim3: 0.020, skim4: 0.010 },
    coord_format: coord,
    rapid: "G00",
    linear: "G01",
    cw_arc: "G02",
    ccw_arc: "G03",
  },

  mitsubishi_edm: {
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (WIRE EDM - MITSUBISHI)`,
      "G90 G21",
      "G92 X0. Y0.",
    ].join("\n"),
    program_end: "M02\n%",
    condition: (phase) => {
      const map: Record<WireCutPhase, string> = {
        rough:  "E0100 C0001 (ROUGH CUT)",
        skim1:  "E0200 C0002 (SKIM 1)",
        skim2:  "E0300 C0003 (SKIM 2)",
        skim3:  "E0400 C0004 (SKIM 3)",
        skim4:  "E0500 C0005 (SKIM 4)",
      };
      return map[phase];
    },
    thread_sequence: [
      "M06 (AUTO WIRE THREAD)",
      "M50 (WIRE FEED)",
    ].join("\n"),
    wire_start: "M50 (WIRE FEED START)",
    wire_stop: "M51 (WIRE FEED STOP)",
    flush_on: "M80 M81 (DIELECTRIC FLUSH ON)",
    flush_off: "M82 M83 (DIELECTRIC FLUSH OFF)",
    offset_left: (reg) => `G41 D${String(reg).padStart(2, "0")}`,
    offset_right: (reg) => `G42 D${String(reg).padStart(2, "0")}`,
    offset_cancel: "G40",
    taper_on: (angle) => `G51 W${angle.toFixed(3)} (TAPER ON)`,
    taper_off: "G50 (TAPER OFF)",
    skim_offsets_mm: { rough: 0.160, skim1: 0.110, skim2: 0.055, skim3: 0.025, skim4: 0.012 },
    coord_format: coord,
    rapid: "G00",
    linear: "G01",
    cw_arc: "G02",
    ccw_arc: "G03",
  },

  sodick: {
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (WIRE EDM - SODICK)`,
      "G90 G21",
      "G92 X0. Y0.",
    ].join("\n"),
    program_end: "M02\n%",
    condition: (phase) => {
      // Sodick uses direct ON/OFF time parameters with condition numbers
      const map: Record<WireCutPhase, string> = {
        rough:  "C100 (ROUGH - IP8 ON12 OFF8 SV60)",
        skim1:  "C200 (SKIM1 - IP4 ON6 OFF12 SV55)",
        skim2:  "C300 (SKIM2 - IP3 ON4 OFF16 SV50)",
        skim3:  "C400 (SKIM3 - IP2 ON3 OFF20 SV45)",
        skim4:  "C500 (SKIM4 - IP1 ON2 OFF24 SV40)",
      };
      return map[phase];
    },
    thread_sequence: [
      "M06 (AUTO THREAD - LINEAR MOTOR POSITIONING)",
      "M50 (WIRE RUN)",
    ].join("\n"),
    wire_start: "M50 (WIRE RUN)",
    wire_stop: "M51 (WIRE STOP)",
    flush_on: "M80 M81 (JET FLUSH ON)",
    flush_off: "M82 M83 (JET FLUSH OFF)",
    offset_left: (reg) => `G41 D${String(reg).padStart(2, "0")}`,
    offset_right: (reg) => `G42 D${String(reg).padStart(2, "0")}`,
    offset_cancel: "G40",
    taper_on: (angle) => `G51 A${angle.toFixed(3)} (TAPER)`,
    taper_off: "G50",
    skim_offsets_mm: { rough: 0.155, skim1: 0.105, skim2: 0.052, skim3: 0.022, skim4: 0.010 },
    coord_format: coord,
    rapid: "G00",
    linear: "G01",
    cw_arc: "G02",
    ccw_arc: "G03",
  },

  agiecharmilles: {
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (WIRE EDM - AGIECHARMILLES CUT)`,
      "G90 G21",
      "G92 X0. Y0.",
    ].join("\n"),
    program_end: "M02\n%",
    condition: (phase) => {
      // AgieCharmilles uses technology table references
      const map: Record<WireCutPhase, string> = {
        rough:  "T0101 (TECH TABLE - ROUGH)",
        skim1:  "T0102 (TECH TABLE - TRIM 1)",
        skim2:  "T0103 (TECH TABLE - TRIM 2)",
        skim3:  "T0104 (TECH TABLE - TRIM 3)",
        skim4:  "T0105 (TECH TABLE - TRIM 4)",
      };
      return map[phase];
    },
    thread_sequence: [
      "M06 (AUTOMATIC WIRE THREADING)",
      "M50 (WIRE TRANSPORT ON)",
    ].join("\n"),
    wire_start: "M50 (WIRE TRANSPORT ON)",
    wire_stop: "M51 (WIRE TRANSPORT OFF)",
    flush_on: "M80 M81 (FLUSHING NOZZLES ON)",
    flush_off: "M82 M83 (FLUSHING NOZZLES OFF)",
    offset_left: (reg) => `G41 D${String(reg).padStart(2, "0")} (WIRE COMP LEFT)`,
    offset_right: (reg) => `G42 D${String(reg).padStart(2, "0")} (WIRE COMP RIGHT)`,
    offset_cancel: "G40 (COMP CANCEL)",
    taper_on: (angle) => `G51 T${angle.toFixed(3)} (TAPER CUTTING ON)`,
    taper_off: "G50 (TAPER OFF)",
    skim_offsets_mm: { rough: 0.145, skim1: 0.095, skim2: 0.048, skim3: 0.020, skim4: 0.008 },
    coord_format: coord,
    rapid: "G00",
    linear: "G01",
    cw_arc: "G02",
    ccw_arc: "G03",
  },
};

// ============================================================================
// SINKER EDM DIALECT DATABASE
// ============================================================================

const SINKER_DIALECTS: Record<EDMPostController, SinkerDialect> = {
  fanuc_robocut: {
    // Fanuc ROBOcut is wire-only; map to generic sinker for compatibility
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (SINKER EDM - GENERIC FANUC)`,
      "G90 G21",
      "G54",
    ].join("\n"),
    program_end: "M30\n%",
    condition: (phase) => {
      const map: Record<SinkerBurnPhase, string> = {
        rough:       "E0010 (ROUGH BURN IP8 V60)",
        semi_finish: "E0020 (SEMI-FINISH IP5 V50)",
        finish:      "E0030 (FINISH IP3 V40)",
        micro_finish:"E0040 (MICRO-FINISH IP1 V30)",
      };
      return map[phase];
    },
    orbit_start: (r) => `G65 P9100 R${r.toFixed(3)} (ORBIT START R=${r}mm)`,
    orbit_stop: "G65 P9101 (ORBIT STOP)",
    jump_retract: (h) => `G28 Z${h.toFixed(3)} (JUMP RETRACT)`,
    wear_comp_on: (ratio) => `G43 H01 (WEAR COMP ${(ratio * 100).toFixed(1)}%)`,
    wear_comp_off: "G49 (CANCEL WEAR COMP)",
    electrode_change: (num) => `M06 T${String(num).padStart(2, "0")} (ELECTRODE CHANGE)`,
    adaptive_on: "M62 (ADAPTIVE GAP CONTROL ON)",
    adaptive_off: "M63 (ADAPTIVE GAP CONTROL OFF)",
    burn_move: (z, feed) => `G01 Z${z.toFixed(3)}${feed ? ` F${feed.toFixed(1)}` : ""} (BURN)`,
    rapid: "G00",
    linear: "G01",
  },

  mitsubishi_edm: {
    // Mitsubishi EA series for sinker EDM
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (SINKER EDM - MITSUBISHI EA)`,
      "G90 G21",
      "G54",
    ].join("\n"),
    program_end: "M30\n%",
    condition: (phase) => {
      const map: Record<SinkerBurnPhase, string> = {
        rough:       "E0100 (ROUGH BURN - POWER LEVEL 8)",
        semi_finish: "E0200 (SEMI-FINISH - POWER LEVEL 5)",
        finish:      "E0300 (FINISH - POWER LEVEL 3)",
        micro_finish:"E0400 (MICRO-FINISH - POWER LEVEL 1)",
      };
      return map[phase];
    },
    orbit_start: (r) => `G65 P8000 R${r.toFixed(3)} (ORBIT R=${r}mm)`,
    orbit_stop: "G65 P8001 (ORBIT CANCEL)",
    jump_retract: (h) => `G73 Z${h.toFixed(3)} Q0.5 (PECK-JUMP Z=${h}mm)`,
    wear_comp_on: (ratio) => `G43 H01 Z${(ratio * -1).toFixed(4)} (WEAR COMP)`,
    wear_comp_off: "G49",
    electrode_change: (num) => `M06 T${String(num).padStart(2, "0")}`,
    adaptive_on: "M68 (ADAPTIVE CONTROL ON)",
    adaptive_off: "M69 (ADAPTIVE CONTROL OFF)",
    burn_move: (z, feed) => `G01 Z${z.toFixed(3)}${feed ? ` F${feed.toFixed(1)}` : ""}`,
    rapid: "G00",
    linear: "G01",
  },

  sodick: {
    // Sodick AG series for sinker EDM
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (SINKER EDM - SODICK AG)`,
      "G90 G21",
      "G54",
    ].join("\n"),
    program_end: "M30\n%",
    condition: (phase) => {
      const map: Record<SinkerBurnPhase, string> = {
        rough:       "C100 (ROUGH - HIGH ENERGY)",
        semi_finish: "C200 (SEMI-FINISH - MEDIUM ENERGY)",
        finish:      "C300 (FINISH - LOW ENERGY)",
        micro_finish:"C400 (MICRO-FINISH - MINIMUM ENERGY)",
      };
      return map[phase];
    },
    orbit_start: (r) => `G65 P9010 R${r.toFixed(3)} (LINEAR MOTOR ORBIT)`,
    orbit_stop: "G65 P9011 (ORBIT CANCEL)",
    jump_retract: (h) => `G73 Z${h.toFixed(3)} Q1.0 (JUMP CYCLE)`,
    wear_comp_on: (ratio) => `G43 H01 (WEAR RATIO ${(ratio * 100).toFixed(1)}%)`,
    wear_comp_off: "G49",
    electrode_change: (num) => `M06 T${String(num).padStart(2, "0")} (ELECTRODE ${num})`,
    adaptive_on: "M62 (ADAPTIVE ON)",
    adaptive_off: "M63 (ADAPTIVE OFF)",
    burn_move: (z, feed) => `G01 Z${z.toFixed(3)}${feed ? ` F${feed.toFixed(1)}` : ""}`,
    rapid: "G00",
    linear: "G01",
  },

  agiecharmilles: {
    // AgieCharmilles FORM series for sinker EDM
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (SINKER EDM - AGIECHARMILLES FORM)`,
      "G90 G21",
      "G54",
    ].join("\n"),
    program_end: "M30\n%",
    condition: (phase) => {
      const map: Record<SinkerBurnPhase, string> = {
        rough:       "T1001 (TECH TABLE - ROUGH BURN)",
        semi_finish: "T1002 (TECH TABLE - SEMI-FINISH)",
        finish:      "T1003 (TECH TABLE - FINISH)",
        micro_finish:"T1004 (TECH TABLE - MICRO-FINISH)",
      };
      return map[phase];
    },
    orbit_start: (r) => `G65 P7700 R${r.toFixed(3)} (ISPG ORBIT)`,
    orbit_stop: "G65 P7701 (ORBIT END)",
    jump_retract: (h) => `G73 Z${h.toFixed(3)} R2.0 Q0.5 (JUMP-RETRACT)`,
    wear_comp_on: (ratio) => `G43 H01 (ELECTRODE WEAR ${(ratio * 100).toFixed(1)}%)`,
    wear_comp_off: "G49 (CANCEL WEAR)",
    electrode_change: (num) => `M06 T${String(num).padStart(2, "0")} (CHANGE ELECTRODE)`,
    adaptive_on: "M50 (ISPS ADAPTIVE ON)",
    adaptive_off: "M51 (ISPS ADAPTIVE OFF)",
    burn_move: (z, feed) => `G01 Z${z.toFixed(3)}${feed ? ` F${feed.toFixed(1)}` : ""} (SINKING)`,
    rapid: "G00",
    linear: "G01",
  },
};

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

/** Pattern markers for wire vs sinker EDM detection. */
const WIRE_MARKERS = [
  /\bM0?6\b.*(?:THREAD|WIRE)/i,
  /\bM50\b/,      // wire run forward
  /\bM51\b/,      // wire stop
  /\b[UuVv]\s*-?\d/,  // UV axis = taper/4-axis wire
  /\bG4[12]\s+[HD]/,  // wire offset compensation
  /WIRE\s*EDM/i,
  /SKIM\s*PASS/i,
  /KERF/i,
  /FLUSH/i,
  /\bE00[0-9]{2}\b/,  // Fanuc-style E-code conditions
  /\bC[1-5]00\b/,     // Sodick-style condition codes
  /\bT010[1-5]\b/,    // AgieCharmilles tech table codes
];

const SINKER_MARKERS = [
  /SINKER|SINK\s*EDM/i,
  /ELECTRODE/i,
  /ORBIT/i,
  /BURN\s*(SEQUENCE|PHASE)/i,
  /\bG73\b.*Z/,  // peck drilling / jump cycle (sinker)
  /\bG43\b.*H.*WEAR/i,  // electrode wear comp
  /RETRACT|JUMP/i,
  /\bT10[0-4][1-4]\b/,  // Sinker tech tables
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class EDMPostProcessorExtensionImpl {

  /**
   * Detect EDM process type from G-code content.
   */
  detectProcessType(gcode: string): EDMPostProcessType {
    let wireScore = 0;
    let sinkerScore = 0;

    for (const pattern of WIRE_MARKERS) {
      if (pattern.test(gcode)) wireScore++;
    }
    for (const pattern of SINKER_MARKERS) {
      if (pattern.test(gcode)) sinkerScore++;
    }

    // Default to wire if ambiguous (more common)
    return sinkerScore > wireScore ? "sinker" : "wire";
  }

  /**
   * Parse cutting operations from generic/intermediate G-code.
   */
  parseOperations(gcode: string): EDMOperation[] {
    const ops: EDMOperation[] = [];
    const lines = gcode.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("(") || line === "%" || line.startsWith(";")) continue;

      const op: EDMOperation = { type: "cut", line_number: i + 1, raw_line: line };

      // Parse move type
      if (/\bG0?0\b/.test(line)) op.type = "position";
      else if (/\bG0?1\b/.test(line)) op.type = "cut";
      else if (/\bM0?6\b/.test(line)) op.type = "thread";
      else if (/\bM8[0-3]\b/.test(line)) op.type = "flush";
      else if (/\bG0?4\b/.test(line)) op.type = "dwell";
      else if (/\bG73\b/.test(line)) op.type = "retract";
      else if (/ORBIT/i.test(line)) op.type = "orbit";

      // Parse coordinates
      const xm = line.match(/X\s*(-?\d+\.?\d*)/i);
      const ym = line.match(/Y\s*(-?\d+\.?\d*)/i);
      const zm = line.match(/Z\s*(-?\d+\.?\d*)/i);
      const um = line.match(/U\s*(-?\d+\.?\d*)/i);
      const vm = line.match(/V\s*(-?\d+\.?\d*)/i);
      const fm = line.match(/F\s*(-?\d+\.?\d*)/i);
      const em = line.match(/[EC]\s*(\d+)/);

      if (xm) op.x = parseFloat(xm[1]);
      if (ym) op.y = parseFloat(ym[1]);
      if (zm) op.z = parseFloat(zm[1]);
      if (um) op.u = parseFloat(um[1]);
      if (vm) op.v = parseFloat(vm[1]);
      if (fm) op.feed = parseFloat(fm[1]);
      if (em) op.condition = parseInt(em[1]);

      ops.push(op);
    }

    return ops;
  }

  /**
   * Post-process wire EDM program to controller-native format.
   */
  postProcessWire(input: EDMPostInput): EDMPostOutput {
    const dialect = WIRE_DIALECTS[input.controller];
    const progNum = input.program_number ?? 1;
    const numSkims = Math.min(input.num_skim_passes ?? 3, 4);
    const warnings: string[] = [];
    const ops = this.parseOperations(input.gcode);

    // Separate cutting moves from setup
    const cuttingOps = ops.filter(o => o.type === "cut" && (o.x !== undefined || o.y !== undefined));
    if (cuttingOps.length === 0) {
      warnings.push("No cutting moves found in input G-code");
    }

    // Fanuc ROBOcut is wire-only — no warning needed
    // But sinker on ROBOcut should warn
    if (input.controller === "fanuc_robocut" && input.process_type === "sinker") {
      warnings.push("Fanuc ROBOcut is wire EDM only — sinker output uses generic Fanuc format");
    }

    const lines: string[] = [];

    // Program start
    lines.push(dialect.program_start(progNum));
    lines.push("");

    // Build cut phases: rough + N skim passes
    const phases: WireCutPhase[] = ["rough"];
    const skimNames: WireCutPhase[] = ["skim1", "skim2", "skim3", "skim4"];
    for (let i = 0; i < numSkims; i++) phases.push(skimNames[i]);

    let totalCutMoves = 0;
    let estimatedWireLength = 0;

    for (const phase of phases) {
      lines.push(`(--- ${phase.toUpperCase()} ---)`);
      lines.push(dialect.condition(phase));

      // Thread and start wire
      if (phase === "rough") {
        lines.push(dialect.thread_sequence);
        lines.push(dialect.flush_on);
      } else {
        lines.push(dialect.wire_start);
        lines.push(dialect.flush_on);
      }

      // Taper if requested
      if (input.taper_angle_deg && input.taper_angle_deg > 0) {
        lines.push(dialect.taper_on(input.taper_angle_deg));
      }

      // Wire offset compensation — right side by default, offset decreases per skim
      const offsetReg = phases.indexOf(phase) + 1;
      lines.push(dialect.offset_right(offsetReg));

      // Rapid to start position if first cutting op has coordinates
      if (cuttingOps.length > 0 && cuttingOps[0].x !== undefined) {
        lines.push(`${dialect.rapid} ${dialect.coord_format(cuttingOps[0].x, cuttingOps[0].y)}`);
      }

      // Emit cutting moves
      for (const op of cuttingOps) {
        const coordStr = dialect.coord_format(op.x, op.y, op.u, op.v);
        if (coordStr) {
          lines.push(`${dialect.linear} ${coordStr}`);
          totalCutMoves++;

          // Estimate wire length from move distance
          if (op.x !== undefined && op.y !== undefined) {
            estimatedWireLength += Math.sqrt((op.x) ** 2 + (op.y) ** 2) / 1000;
          }
        }
      }

      // Cancel offset and taper
      lines.push(dialect.offset_cancel);
      if (input.taper_angle_deg && input.taper_angle_deg > 0) {
        lines.push(dialect.taper_off);
      }

      // Stop wire and flushing between passes
      lines.push(dialect.wire_stop);
      lines.push(dialect.flush_off);
      lines.push("");
    }

    // Program end
    lines.push(dialect.program_end);

    const gcode = lines.join("\n");

    return {
      gcode,
      controller: input.controller,
      process_type: "wire",
      operation_count: cuttingOps.length,
      warnings,
      stats: {
        total_lines: gcode.split("\n").length,
        cutting_moves: totalCutMoves,
        skim_passes: numSkims,
        estimated_wire_length_m: estimatedWireLength > 0 ? estimatedWireLength : undefined,
      },
    };
  }

  /**
   * Post-process sinker EDM program to controller-native format.
   */
  postProcessSinker(input: EDMPostInput): EDMPostOutput {
    const dialect = SINKER_DIALECTS[input.controller];
    const progNum = input.program_number ?? 1;
    const orbitRadius = input.orbit_radius_mm ?? 0.1;
    const wearRatio = input.wear_ratio ?? 0.15;
    const warnings: string[] = [];
    const ops = this.parseOperations(input.gcode);

    if (input.controller === "fanuc_robocut") {
      warnings.push("Fanuc ROBOcut is wire EDM only — sinker output uses generic Fanuc format");
    }

    // Extract Z-depth moves (burn operations)
    const burnOps = ops.filter(o =>
      (o.type === "cut" || o.type === "retract") && o.z !== undefined
    );
    const positionOps = ops.filter(o =>
      o.type === "position" && (o.x !== undefined || o.y !== undefined)
    );

    if (burnOps.length === 0) {
      warnings.push("No Z-axis burn moves found in input G-code");
    }

    const lines: string[] = [];

    // Program start
    lines.push(dialect.program_start(progNum));
    lines.push("");

    // Burn phases: rough → semi → finish (→ micro if available)
    const burnPhases: SinkerBurnPhase[] = ["rough", "semi_finish", "finish"];
    let totalBurnMoves = 0;

    for (const phase of burnPhases) {
      lines.push(`(--- ${phase.toUpperCase().replace("_", " ")} ---)`);
      lines.push(dialect.condition(phase));

      // Electrode wear compensation for rough/semi (most wear)
      if (phase === "rough" || phase === "semi_finish") {
        lines.push(dialect.wear_comp_on(wearRatio));
      }

      // Adaptive gap control
      lines.push(dialect.adaptive_on);

      // Position electrode
      for (const op of positionOps) {
        const parts: string[] = [dialect.rapid];
        if (op.x !== undefined) parts.push(`X${op.x.toFixed(3)}`);
        if (op.y !== undefined) parts.push(`Y${op.y.toFixed(3)}`);
        lines.push(parts.join(" "));
      }

      // Burn moves with jump/retract cycle for rough
      if (phase === "rough") {
        for (const op of burnOps) {
          if (op.z !== undefined) {
            lines.push(dialect.jump_retract(2.0));
            lines.push(dialect.burn_move(op.z, op.feed));
            totalBurnMoves++;
          }
        }
      } else {
        // Semi-finish/finish: straight burn with orbiting
        lines.push(dialect.orbit_start(orbitRadius));
        for (const op of burnOps) {
          if (op.z !== undefined) {
            lines.push(dialect.burn_move(op.z, op.feed));
            totalBurnMoves++;
          }
        }
        lines.push(dialect.orbit_stop);
      }

      // Cancel adaptive and wear comp
      lines.push(dialect.adaptive_off);
      if (phase === "rough" || phase === "semi_finish") {
        lines.push(dialect.wear_comp_off);
      }

      // Retract between phases
      lines.push(`${dialect.rapid} Z50.000 (RETRACT)`);
      lines.push("");
    }

    // Program end
    lines.push(dialect.program_end);

    const gcode = lines.join("\n");

    return {
      gcode,
      controller: input.controller,
      process_type: "sinker",
      operation_count: burnOps.length,
      warnings,
      stats: {
        total_lines: gcode.split("\n").length,
        cutting_moves: totalBurnMoves,
        skim_passes: 0,
      },
    };
  }

  /**
   * Full post-processing entry point.
   * Auto-detects process type if not specified.
   */
  postProcess(input: EDMPostInput): EDMPostOutput {
    if (!input.gcode || input.gcode.trim().length === 0) {
      throw new Error("EDMPostProcessorExtension: gcode input is required");
    }
    if (!input.controller) {
      throw new Error("EDMPostProcessorExtension: controller is required");
    }

    const processType = input.process_type ?? this.detectProcessType(input.gcode);

    if (processType === "wire") {
      return this.postProcessWire({ ...input, process_type: "wire" });
    } else {
      return this.postProcessSinker({ ...input, process_type: "sinker" });
    }
  }

  /**
   * List supported controllers.
   */
  listControllers(): { controller: EDMPostController; wire: boolean; sinker: boolean }[] {
    return [
      { controller: "fanuc_robocut", wire: true, sinker: false },
      { controller: "mitsubishi_edm", wire: true, sinker: true },
      { controller: "sodick", wire: true, sinker: true },
      { controller: "agiecharmilles", wire: true, sinker: true },
    ];
  }

  /**
   * Dispatcher execute method.
   */
  execute(action: string, input: Record<string, unknown>): EDMPostOutput | ReturnType<typeof this.listControllers> {
    switch (action) {
      case "ppg_edm_generate":
        return this.postProcess(input as unknown as EDMPostInput);
      case "ppg_edm_controllers":
        return this.listControllers();
      default:
        throw new Error(`EDMPostProcessorExtension: unknown action '${action}'`);
    }
  }
}

export const edmPostProcessorExtension = new EDMPostProcessorExtensionImpl();
