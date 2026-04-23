/**
 * EDMProgramAssemblerEngine — WEDM Program Structure Assembly
 *
 * Assembles complete WEDM program structures for progressive die applications:
 *   1. Combines corner analysis and multi-pass strategy into program blocks
 *   2. Generates proper pass sequencing with wire offsets
 *   3. Includes wire threading, break detection, and recovery
 *   4. Adds M-codes for automation (M00/M01 stops, slug retention)
 *   5. Applies G41/G42 cutter compensation per pass
 *
 * Program Structure (Mitsubishi/Sodick dialect):
 * ─────────────────────────────────────────────
 *   Header: O-number, date, part info, units (G20/G21)
 *   Setup: Wire thread, work offset, taper setup
 *   Pass Loop:
 *     - Wire offset (D-value) per pass
 *     - Cutter comp (G41/G42)
 *     - Cut path with corner strategy
 *     - Comp cancel, retract
 *   Footer: Wire break, M30
 *
 * MS-P3-TIER6A/U-P3-T6A-03
 *
 * @see EDMWireSlugCornerTaperEngine — corner strategies
 * @see EDMMultiPassStrategyEngine — pass planning
 * @see WEDMControllerDialectVerifierEngine — controller dialect
 *
 * Source: Mitsubishi MV1200R Programming Manual; Sodick LN2W §5
 */

import { WEDM_MULTI_PASS, WEDMFinishClass } from "../physics/wedm-constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ControllerDialect = "mitsubishi" | "sodick" | "makino" | "agie" | "fanuc";
export type CompensationSide = "left" | "right" | "none";
export type UnitSystem = "metric" | "imperial";

export interface ProgramPoint {
  x: number;
  y: number;
  /** Optional U offset for taper [mm] */
  u?: number;
  /** Optional V offset for taper [mm] */
  v?: number;
}

export interface CutPath {
  /** Start point */
  start: ProgramPoint;
  /** Path points in sequence */
  points: ProgramPoint[];
  /** Whether path is closed (returns to start) */
  closed: boolean;
  /** Internal corner indices that need dwell/strategy */
  corner_indices?: number[];
}

export interface PassBlock {
  pass_number: number;
  pass_type: string;
  offset_mm: number;
  compensation: CompensationSide;
  /** D-number for offset register (D01-D99) */
  d_register: number;
  /** E-code condition for this pass (machine-specific) */
  e_code?: string;
  /** Estimated cut time [min] */
  cut_time_min: number;
}

export interface ProgramAssemblyInput {
  /** Program O-number (1-9999) */
  program_number: number;
  /** Part name/description */
  part_name: string;
  /** Material type */
  material: string;
  /** Part thickness [mm] */
  thickness_mm: number;
  /** Cut path geometry */
  path: CutPath;
  /** Multi-pass strategy passes */
  passes: PassBlock[];
  /** Controller dialect. Default "mitsubishi". */
  dialect?: ControllerDialect;
  /** Unit system. Default "metric". */
  units?: UnitSystem;
  /** Work offset (G54-G59). Default "G54". */
  work_offset?: string;
  /** Wire type description */
  wire_type?: string;
  /** Wire diameter [mm]. Default 0.25. */
  wire_diameter_mm?: number;
  /** Include M00 stops between passes. Default true. */
  include_stops?: boolean;
  /** Include slug retention tabs info. Default false. */
  include_tabs?: boolean;
  /** Tab positions if include_tabs is true */
  tab_positions?: ProgramPoint[];
  /** Machine name for header */
  machine?: string;
  /** Operator notes */
  notes?: string;
}

export interface ProgramBlock {
  type: "header" | "setup" | "pass" | "footer" | "comment";
  pass_number?: number;
  lines: string[];
}

export interface ProgramAssemblyResult {
  success: boolean;
  program_number: number;
  blocks: ProgramBlock[];
  /** Full program as single string */
  program_text: string;
  /** Line count */
  line_count: number;
  /** Estimated total cycle time [min] */
  total_time_min: number;
  /** Pass count */
  pass_count: number;
  /** Dialect used */
  dialect: ControllerDialect;
  warnings: string[];
  summary: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_DIALECT: ControllerDialect = "mitsubishi";
const DEFAULT_UNITS: UnitSystem = "metric";
const DEFAULT_WIRE_DIA = 0.25;
const DEFAULT_WORK_OFFSET = "G54";

const DIALECT_CODES = {
  mitsubishi: {
    wire_thread: "M50",
    wire_cut: "M51",
    flush_on: "M08",
    flush_off: "M09",
    program_end: "M30",
    optional_stop: "M01",
    mandatory_stop: "M00",
    comp_left: "G41",
    comp_right: "G42",
    comp_cancel: "G40",
    absolute: "G90",
    incremental: "G91",
    metric: "G21",
    imperial: "G20",
  },
  sodick: {
    wire_thread: "M06",
    wire_cut: "M07",
    flush_on: "M08",
    flush_off: "M09",
    program_end: "M30",
    optional_stop: "M01",
    mandatory_stop: "M00",
    comp_left: "G41",
    comp_right: "G42",
    comp_cancel: "G40",
    absolute: "G90",
    incremental: "G91",
    metric: "G21",
    imperial: "G20",
  },
  makino: {
    wire_thread: "M60",
    wire_cut: "M61",
    flush_on: "M08",
    flush_off: "M09",
    program_end: "M30",
    optional_stop: "M01",
    mandatory_stop: "M00",
    comp_left: "G41",
    comp_right: "G42",
    comp_cancel: "G40",
    absolute: "G90",
    incremental: "G91",
    metric: "G21",
    imperial: "G20",
  },
  agie: {
    wire_thread: "M20",
    wire_cut: "M21",
    flush_on: "M08",
    flush_off: "M09",
    program_end: "M30",
    optional_stop: "M01",
    mandatory_stop: "M00",
    comp_left: "G41",
    comp_right: "G42",
    comp_cancel: "G40",
    absolute: "G90",
    incremental: "G91",
    metric: "G21",
    imperial: "G20",
  },
  fanuc: {
    wire_thread: "M50",
    wire_cut: "M51",
    flush_on: "M08",
    flush_off: "M09",
    program_end: "M30",
    optional_stop: "M01",
    mandatory_stop: "M00",
    comp_left: "G41",
    comp_right: "G42",
    comp_cancel: "G40",
    absolute: "G90",
    incremental: "G91",
    metric: "G21",
    imperial: "G20",
  },
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class EDMProgramAssemblerEngine {
  readonly name = "EDMProgramAssemblerEngine";
  readonly version = "1.0.0";

  /**
   * Assemble complete WEDM program from inputs.
   *
   * @param input - Program assembly parameters
   * @returns ProgramAssemblyResult with blocks and full text
   */
  assemble(input: ProgramAssemblyInput): ProgramAssemblyResult {
    if (!this.validateInput(input)) {
      return this.buildInvalidResult("Invalid input parameters");
    }

    const {
      program_number,
      part_name,
      material,
      thickness_mm,
      path,
      passes,
      dialect = DEFAULT_DIALECT,
      units = DEFAULT_UNITS,
      work_offset = DEFAULT_WORK_OFFSET,
      wire_type = "brass 0.25mm",
      wire_diameter_mm = DEFAULT_WIRE_DIA,
      include_stops = true,
      include_tabs = false,
      tab_positions = [],
      machine,
      notes,
    } = input;

    const codes = DIALECT_CODES[dialect];
    const blocks: ProgramBlock[] = [];
    const warnings: string[] = [];

    // Header block
    blocks.push(this.buildHeader(
      program_number,
      part_name,
      material,
      thickness_mm,
      wire_type,
      machine,
      notes,
      codes,
      units
    ));

    // Setup block
    blocks.push(this.buildSetup(
      path.start,
      work_offset,
      codes,
      dialect
    ));

    // Pass blocks
    let totalTime = 0;
    for (const pass of passes) {
      blocks.push(this.buildPassBlock(
        pass,
        path,
        codes,
        include_stops,
        dialect
      ));
      totalTime += pass.cut_time_min;
    }

    // Tab info if included
    if (include_tabs && tab_positions.length > 0) {
      blocks.push({
        type: "comment",
        lines: [
          "(--- RETENTION TABS ---)",
          `(TAB COUNT: ${tab_positions.length})`,
          ...tab_positions.map((t, i) => `(TAB ${i + 1}: X${t.x.toFixed(3)} Y${t.y.toFixed(3)})`),
        ],
      });
    }

    // Footer block
    blocks.push(this.buildFooter(codes));

    // Assemble full text
    const allLines = blocks.flatMap(b => b.lines);
    const programText = allLines.join("\n");

    // Validate
    if (passes.length === 0) {
      warnings.push("No passes defined — program will be incomplete");
    }
    if (!path.closed) {
      warnings.push("Open path detected — verify start/end points");
    }

    return {
      success: true,
      program_number,
      blocks,
      program_text: programText,
      line_count: allLines.length,
      total_time_min: Math.round(totalTime * 10) / 10,
      pass_count: passes.length,
      dialect,
      warnings,
      summary: this.buildSummary(program_number, passes.length, totalTime, dialect),
    };
  }

  /**
   * Build header block with program info.
   */
  buildHeader(
    programNum: number,
    partName: string,
    material: string,
    thickness: number,
    wireType: string,
    machine: string | undefined,
    notes: string | undefined,
    codes: typeof DIALECT_CODES[ControllerDialect],
    units: UnitSystem
  ): ProgramBlock {
    const date = new Date().toISOString().split("T")[0];
    const unitCode = units === "metric" ? codes.metric : codes.imperial;

    const lines = [
      `O${String(programNum).padStart(4, "0")}`,
      `(${partName})`,
      `(MATERIAL: ${material})`,
      `(THICKNESS: ${thickness}MM)`,
      `(WIRE: ${wireType})`,
      `(DATE: ${date})`,
    ];

    if (machine) {
      lines.push(`(MACHINE: ${machine})`);
    }
    if (notes) {
      lines.push(`(NOTES: ${notes})`);
    }

    lines.push("");
    lines.push(`${unitCode} ${codes.absolute}`);

    return { type: "header", lines };
  }

  /**
   * Build setup block with work offset and wire thread.
   */
  buildSetup(
    startPoint: ProgramPoint,
    workOffset: string,
    codes: typeof DIALECT_CODES[ControllerDialect],
    dialect: ControllerDialect
  ): ProgramBlock {
    const lines = [
      "",
      "(--- SETUP ---)",
      workOffset,
      `G00 X${startPoint.x.toFixed(3)} Y${startPoint.y.toFixed(3)}`,
      codes.wire_thread,
      codes.flush_on,
    ];

    return { type: "setup", lines };
  }

  /**
   * Build a single pass block.
   */
  buildPassBlock(
    pass: PassBlock,
    path: CutPath,
    codes: typeof DIALECT_CODES[ControllerDialect],
    includeStops: boolean,
    dialect: ControllerDialect
  ): ProgramBlock {
    const lines: string[] = [];

    lines.push("");
    lines.push(`(--- PASS ${pass.pass_number}: ${pass.pass_type.toUpperCase()} ---)`);
    lines.push(`(OFFSET: ${pass.offset_mm.toFixed(3)}MM)`);

    if (pass.e_code) {
      lines.push(pass.e_code);
    }

    // Set offset register
    lines.push(`D${String(pass.d_register).padStart(2, "0")}`);

    // Apply compensation
    const compCode = pass.compensation === "left" ? codes.comp_left :
                     pass.compensation === "right" ? codes.comp_right :
                     null;

    // Move to start with comp
    const firstPoint = path.points[0] || path.start;
    if (compCode) {
      lines.push(`${compCode} G01 X${firstPoint.x.toFixed(3)} Y${firstPoint.y.toFixed(3)}`);
    } else {
      lines.push(`G01 X${firstPoint.x.toFixed(3)} Y${firstPoint.y.toFixed(3)}`);
    }

    // Cut path points
    for (let i = 1; i < path.points.length; i++) {
      const pt = path.points[i];
      let line = `X${pt.x.toFixed(3)} Y${pt.y.toFixed(3)}`;
      if (pt.u !== undefined && pt.v !== undefined) {
        line += ` U${pt.u.toFixed(3)} V${pt.v.toFixed(3)}`;
      }
      lines.push(line);
    }

    // Close path if needed
    if (path.closed) {
      lines.push(`X${path.start.x.toFixed(3)} Y${path.start.y.toFixed(3)}`);
    }

    // Cancel comp
    if (compCode) {
      lines.push(codes.comp_cancel);
    }

    // Optional stop between passes
    if (includeStops && pass.pass_number < path.points.length) {
      lines.push(codes.optional_stop);
    }

    return { type: "pass", pass_number: pass.pass_number, lines };
  }

  /**
   * Build footer block with program end.
   */
  buildFooter(codes: typeof DIALECT_CODES[ControllerDialect]): ProgramBlock {
    return {
      type: "footer",
      lines: [
        "",
        "(--- END ---)",
        codes.flush_off,
        codes.wire_cut,
        codes.program_end,
      ],
    };
  }

  /**
   * Get dialect-specific M-codes.
   */
  getDialectCodes(dialect: ControllerDialect): typeof DIALECT_CODES[ControllerDialect] {
    return DIALECT_CODES[dialect] || DIALECT_CODES.mitsubishi;
  }

  /**
   * Get supported dialects.
   */
  getSupportedDialects(): ControllerDialect[] {
    return Object.keys(DIALECT_CODES) as ControllerDialect[];
  }

  /**
   * Create pass blocks from multi-pass strategy result.
   */
  createPassBlocksFromStrategy(
    passes: Array<{ pass_number: number; pass_type: string; offset_mm: number; }>,
    compensation: CompensationSide = "left",
    baseTime: number = 10
  ): PassBlock[] {
    return passes.map((p, idx) => ({
      pass_number: p.pass_number,
      pass_type: p.pass_type,
      offset_mm: p.offset_mm,
      compensation,
      d_register: idx + 1,
      cut_time_min: baseTime * (WEDM_MULTI_PASS.speed_factor[p.pass_type as keyof typeof WEDM_MULTI_PASS.speed_factor] || 1),
    }));
  }

  private buildSummary(
    programNum: number,
    passCount: number,
    totalTime: number,
    dialect: ControllerDialect
  ): string {
    return (
      `O${String(programNum).padStart(4, "0")}: ` +
      `${passCount} passes, ${totalTime.toFixed(1)} min, ${dialect} dialect`
    );
  }

  private validateInput(input: ProgramAssemblyInput): boolean {
    if (typeof input.program_number !== "number" || input.program_number < 1 || input.program_number > 9999) {
      return false;
    }
    if (!input.part_name || typeof input.part_name !== "string") return false;
    if (!input.path || !input.path.start) return false;
    if (!Array.isArray(input.passes)) return false;
    if (typeof input.thickness_mm !== "number" || input.thickness_mm <= 0) return false;
    return true;
  }

  private buildInvalidResult(reason: string): ProgramAssemblyResult {
    return {
      success: false,
      program_number: 0,
      blocks: [],
      program_text: "",
      line_count: 0,
      total_time_min: 0,
      pass_count: 0,
      dialect: DEFAULT_DIALECT,
      warnings: [reason],
      summary: `INVALID: ${reason}`,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const edmProgramAssemblerEngine = new EDMProgramAssemblerEngine();
export default edmProgramAssemblerEngine;
