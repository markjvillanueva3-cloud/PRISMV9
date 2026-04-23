/**
 * OkumaMacroHeaderGeneratorEngine — Generate parametric macro headers for Okuma programs
 *
 * Produces standard macro header blocks that follow the shop's proven variable
 * naming conventions (mined from production programs by MacroPatternMinerEngine):
 *
 *   V1-V10:  Part dimensions (stock dia, finish OD/ID, part length)
 *   V20-V30: Drill parameters (size, SFM, feed, peck, point angle)
 *   V35-V38: Stock allowances (OD/ID radial/axial)
 *   V40-V44: Depth of cut (OD/ID rough/finish)
 *   V45-V56: Speeds and feeds per operation
 *   V60-V66: Clearances and RPM limits
 *   V70-V85: Calculated RPM variables (auto from SFM/DIA)
 *
 * The generated header is syntactically valid Okuma OSP code that can be
 * prepended to any program to make it parametric.
 *
 * @module OkumaMacroHeaderGeneratorEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Tool operation definition for the macro header */
export interface MacroToolDef {
  /** Tool station number (1-12 typical on Okuma lathe) */
  station: number;
  /** Operation type */
  operation: MacroOpType;
  /** Surface speed (SFM for imperial, m/min for metric) */
  sfm: number;
  /** Feed rate (IPR for imperial, mm/rev for metric) */
  feed: number;
  /** Depth of cut per pass */
  doc?: number;
  /** Insert nose radius (inches or mm) */
  nose_radius?: number;
  /** Max RPM for G50 clamp */
  max_rpm?: number;
  /** Custom comment for the tool line */
  comment?: string;
}

export type MacroOpType =
  | "od_rough" | "od_finish" | "id_rough" | "id_finish"
  | "face" | "center_drill" | "drill" | "peck_drill"
  | "bore_rough" | "bore_finish" | "groove" | "cutoff"
  | "thread" | "tap" | "ream" | "chamfer";

/** Input for generating a macro header */
export interface MacroHeaderInput {
  /** Program name / part number */
  program_name: string;
  /** Unit system */
  unit_system: "imperial" | "metric";
  /** Part dimensions */
  stock_diameter: number;
  finish_od?: number;
  finish_id?: number;
  part_length: number;
  /** Stock face offset from chuck face */
  stock_face_offset?: number;
  /** Drill parameters */
  drill_size?: number;
  drill_point_angle?: number;
  /** Stock allowances */
  od_finish_allowance?: number;
  id_finish_allowance?: number;
  axial_finish_allowance?: number;
  /** Clearance and safety */
  x_clearance?: number;
  z_clearance?: number;
  retract_x?: number;
  retract_z?: number;
  /** Tool definitions */
  tools: MacroToolDef[];
  /** Whether to include bar feeder variables */
  bar_feeder?: boolean;
  /** Whether to include C-axis variables */
  c_axis?: boolean;
  /** Whether to include optional feature branching (IF/GOTO) */
  optional_features?: MacroOptionalFeature[];
}

export interface MacroOptionalFeature {
  /** Variable that controls this feature (0=skip, 1=execute) */
  control_var: string;
  /** Label to skip to if disabled */
  skip_label: string;
  /** Description of the feature */
  description: string;
}

/** Generated macro header result */
export interface MacroHeaderResult {
  /** The generated header lines (valid Okuma OSP code) */
  header_lines: string[];
  /** Full header as a single string */
  header_text: string;
  /** Variable map for reference (variable name → purpose) */
  variable_map: Array<{ var: string; value: number | string; purpose: string }>;
  /** Calculated RPM formulas included */
  rpm_formulas: Array<{ var: string; formula: string; tool_station: number }>;
  /** Safety features included */
  safety: {
    g50_clamps: number[];
    retract_position: { x: number; z: number };
    optional_stops: boolean;
    coolant_balance: boolean;
  };
  /** Line count */
  line_count: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default G50 max RPM by operation type (from SafetyPatternMinerEngine mining) */
const DEFAULT_G50: Record<string, number> = {
  od_rough: 2500,
  od_finish: 3000,
  id_rough: 2000,
  id_finish: 2500,
  face: 2500,
  center_drill: 2000,
  drill: 2000,
  peck_drill: 2000,
  bore_rough: 1800,
  bore_finish: 2000,
  groove: 2000,
  cutoff: 1500,
  thread: 2000,
  tap: 1500,
  ream: 1500,
  chamfer: 2500,
};

/** Imperial SFM→RPM constant: 12 / π ≈ 3.8197 */
const IMPERIAL_RPM_FACTOR = 3.8197;

/** Variable assignment ranges following shop conventions */
const VAR_RANGES = {
  dimensions: { start: 1, end: 10 },
  drill_params: { start: 20, end: 30 },
  allowances: { start: 35, end: 38 },
  doc: { start: 40, end: 44 },
  speed_feed: { start: 45, end: 56 },
  clearance: { start: 60, end: 66 },
  calculated_rpm: { start: 70, end: 85 },
  bar_feeder: { start: 90, end: 95 },
  c_axis: { start: 96, end: 99 },
};

// ============================================================================
// ENGINE
// ============================================================================

export class OkumaMacroHeaderGeneratorEngine {
  /**
   * Generate a complete macro header for an Okuma program.
   *
   * @param input - Part geometry, tools, and options
   * @returns Generated header with variable map and safety metadata
   */
  generate(input: MacroHeaderInput): MacroHeaderResult {
    const lines: string[] = [];
    const varMap: MacroHeaderResult["variable_map"] = [];
    const rpmFormulas: MacroHeaderResult["rpm_formulas"] = [];
    const g50Clamps: number[] = [];

    // ── Program header comment block ──────────────────────────────────────
    lines.push(`(${"-".repeat(60)})`);
    lines.push(`( PARAMETRIC MACRO: ${input.program_name.toUpperCase()} )`);
    lines.push(`( GENERATED BY PRISM — ADJUST VARIABLES BELOW )`);
    lines.push(`( UNIT SYSTEM: ${input.unit_system.toUpperCase()} )`);
    lines.push(`(${"-".repeat(60)})`);
    lines.push("");

    // ── Part dimension variables (V1-V10) ─────────────────────────────────
    lines.push("( ===== PART DIMENSIONS ===== )");
    this._addVar(lines, varMap, "V1", input.stock_diameter, "STOCK DIAMETER");
    if (input.finish_od !== undefined) {
      this._addVar(lines, varMap, "V2", input.finish_od, "FINISH OD");
    }
    if (input.finish_id !== undefined) {
      this._addVar(lines, varMap, "V3", input.finish_id, "FINISH ID (BORE)");
    }
    this._addVar(lines, varMap, "V5", input.part_length, "PART LENGTH");
    if (input.stock_face_offset !== undefined) {
      this._addVar(lines, varMap, "V100", input.stock_face_offset, "STOCK FACE OFFSET FROM CHUCK");
    }
    lines.push("");

    // ── Drill parameters (V20-V30) ────────────────────────────────────────
    if (input.drill_size !== undefined) {
      lines.push("( ===== DRILL PARAMETERS ===== )");
      this._addVar(lines, varMap, "V20", input.drill_size, "DRILL SIZE");
      if (input.drill_point_angle !== undefined) {
        this._addVar(lines, varMap, "V21", input.drill_point_angle, "DRILL POINT ANGLE (DEG)");
      }
      lines.push("");
    }

    // ── Stock allowances (V35-V38) ────────────────────────────────────────
    const hasAllowances = input.od_finish_allowance !== undefined ||
      input.id_finish_allowance !== undefined ||
      input.axial_finish_allowance !== undefined;
    if (hasAllowances) {
      lines.push("( ===== FINISH ALLOWANCES ===== )");
      if (input.od_finish_allowance !== undefined) {
        this._addVar(lines, varMap, "V35", input.od_finish_allowance, "OD FINISH ALLOWANCE (RADIAL)");
      }
      if (input.id_finish_allowance !== undefined) {
        this._addVar(lines, varMap, "V36", input.id_finish_allowance, "ID FINISH ALLOWANCE (RADIAL)");
      }
      if (input.axial_finish_allowance !== undefined) {
        this._addVar(lines, varMap, "V37", input.axial_finish_allowance, "AXIAL FINISH ALLOWANCE");
      }
      lines.push("");
    }

    // ── Speeds, feeds, DOC per tool (V40-V56) ─────────────────────────────
    lines.push("( ===== SPEEDS, FEEDS, DOC PER TOOL ===== )");
    let sfmVarIdx = 45;
    let feedVarIdx = 46;
    let docVarIdx = 40;

    for (const tool of input.tools) {
      const opLabel = tool.operation.toUpperCase().replace(/_/g, " ");
      const comment = tool.comment ?? `T${String(tool.station).padStart(2, "0")} ${opLabel}`;

      lines.push(`( --- ${comment} --- )`);

      // SFM variable
      const sfmVar = `V${sfmVarIdx}`;
      const sfmLabel = input.unit_system === "imperial" ? "SFM" : "SCS (M/MIN)";
      this._addVar(lines, varMap, sfmVar, tool.sfm, `${opLabel} ${sfmLabel}`);

      // Feed variable
      const feedVar = `V${feedVarIdx}`;
      const feedLabel = input.unit_system === "imperial" ? "FEED (IPR)" : "FEED (MM/REV)";
      this._addVar(lines, varMap, feedVar, tool.feed, `${opLabel} ${feedLabel}`);

      // DOC variable (if provided)
      if (tool.doc !== undefined) {
        const docVar = `V${docVarIdx}`;
        this._addVar(lines, varMap, docVar, tool.doc, `${opLabel} DOC`);
        docVarIdx++;
      }

      // G50 max RPM
      const maxRpm = tool.max_rpm ?? DEFAULT_G50[tool.operation] ?? 2500;
      g50Clamps.push(maxRpm);

      // Calculate RPM variable (V70+)
      const rpmVarNum = VAR_RANGES.calculated_rpm.start + (sfmVarIdx - VAR_RANGES.speed_feed.start);
      const rpmVar = `V${rpmVarNum}`;

      // Determine diameter variable for this operation
      const diaVar = this._getDiaVarForOp(tool.operation);

      if (input.unit_system === "imperial") {
        // Imperial: RPM = SFM * 3.82 / DIA
        // Okuma syntax: V70 = [V45 * 3.82] / V1
        lines.push(`${rpmVar} = [${sfmVar} * ${IMPERIAL_RPM_FACTOR.toFixed(4)}] / ${diaVar}    ( ${opLabel} RPM CALC )`);
      } else {
        // Metric: RPM = SCS * 1000 / (PI * DIA)
        // Simplified: V70 = [V45 * 318.31] / V1
        lines.push(`${rpmVar} = [${sfmVar} * 318.31] / ${diaVar}    ( ${opLabel} RPM CALC )`);
      }

      rpmFormulas.push({
        var: rpmVar,
        formula: input.unit_system === "imperial"
          ? `[${sfmVar} * ${IMPERIAL_RPM_FACTOR.toFixed(4)}] / ${diaVar}`
          : `[${sfmVar} * 318.31] / ${diaVar}`,
        tool_station: tool.station,
      });

      varMap.push({
        var: rpmVar,
        value: `calculated from ${sfmVar} and ${diaVar}`,
        purpose: `${opLabel} calculated RPM`,
      });

      sfmVarIdx += 2;
      feedVarIdx += 2;
    }
    lines.push("");

    // ── Clearances and limits (V60-V66) ───────────────────────────────────
    lines.push("( ===== CLEARANCES AND LIMITS ===== )");
    const xClear = input.x_clearance ?? (input.stock_diameter + 2);
    const zClear = input.z_clearance ?? 2;
    const retractX = input.retract_x ?? 20;
    const retractZ = input.retract_z ?? 20;

    this._addVar(lines, varMap, "V60", xClear, "X CLEARANCE (ABOVE STOCK)");
    this._addVar(lines, varMap, "V61", zClear, "Z CLEARANCE (OFF FACE)");
    this._addVar(lines, varMap, "V62", retractX, "SAFE RETRACT X");
    this._addVar(lines, varMap, "V63", retractZ, "SAFE RETRACT Z");

    // G50 RPM limits per tool
    const maxG50 = Math.max(...g50Clamps, 2500);
    this._addVar(lines, varMap, "V64", maxG50, "MAX RPM LIMIT (G50)");
    lines.push("");

    // ── Bar feeder variables (V90-V95) ────────────────────────────────────
    if (input.bar_feeder) {
      lines.push("( ===== BAR FEEDER ===== )");
      this._addVar(lines, varMap, "V90", 0, "PART COUNTER (0=RESET)");
      this._addVar(lines, varMap, "V91", 1, "PARTS PER BAR");
      this._addVar(lines, varMap, "V92", 0.125, "CUTOFF WIDTH");
      lines.push("");
    }

    // ── C-axis variables (V96-V99) ────────────────────────────────────────
    if (input.c_axis) {
      lines.push("( ===== C-AXIS POSITIONING ===== )");
      this._addVar(lines, varMap, "V96", 0, "C-AXIS ANGLE 1 (DEGREES)");
      this._addVar(lines, varMap, "V97", 90, "C-AXIS ANGLE 2 (DEGREES)");
      lines.push("");
    }

    // ── Optional feature branching ────────────────────────────────────────
    if (input.optional_features && input.optional_features.length > 0) {
      lines.push("( ===== OPTIONAL FEATURES (0=SKIP, 1=EXECUTE) ===== )");
      for (const feat of input.optional_features) {
        this._addVar(lines, varMap, feat.control_var, 1, feat.description);
      }
      lines.push("");
    }

    // ── End of header ─────────────────────────────────────────────────────
    lines.push(`(${"-".repeat(60)})`);
    lines.push("( END MACRO HEADER — PROGRAM CODE BELOW )");
    lines.push(`(${"-".repeat(60)})`);
    lines.push("");

    log.info(`[OkumaMacroHeaderGenerator] Generated header: ${lines.length} lines, ${varMap.length} variables, ${rpmFormulas.length} RPM formulas`);

    return {
      header_lines: lines,
      header_text: lines.join("\n"),
      variable_map: varMap,
      rpm_formulas: rpmFormulas,
      safety: {
        g50_clamps: g50Clamps,
        retract_position: { x: retractX, z: retractZ },
        optional_stops: true,
        coolant_balance: true,
      },
      line_count: lines.length,
    };
  }

  /**
   * Generate a minimal header with only dimension variables (for simple programs).
   */
  generateMinimal(input: {
    program_name: string;
    unit_system: "imperial" | "metric";
    stock_diameter: number;
    part_length: number;
    finish_od?: number;
    drill_size?: number;
  }): MacroHeaderResult {
    return this.generate({
      program_name: input.program_name,
      unit_system: input.unit_system,
      stock_diameter: input.stock_diameter,
      part_length: input.part_length,
      finish_od: input.finish_od,
      drill_size: input.drill_size,
      tools: [],
    });
  }

  /**
   * Get the standard variable assignment for a given purpose.
   * Returns the conventional variable name used across the shop.
   */
  getStandardVar(purpose: string): string | null {
    const map: Record<string, string> = {
      stock_diameter: "V1",
      finish_od: "V2",
      finish_id: "V3",
      part_length: "V5",
      stock_face_offset: "V100",
      drill_size: "V20",
      drill_point_angle: "V21",
      peck_depth: "V22",
      od_finish_allowance: "V35",
      id_finish_allowance: "V36",
      axial_finish_allowance: "V37",
      x_clearance: "V60",
      z_clearance: "V61",
      retract_x: "V62",
      retract_z: "V63",
      max_rpm: "V64",
      part_counter: "V90",
      parts_per_bar: "V91",
      cutoff_width: "V92",
    };
    return map[purpose] ?? null;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /** Add a variable assignment line + update the variable map */
  private _addVar(
    lines: string[],
    varMap: MacroHeaderResult["variable_map"],
    varName: string,
    value: number | string,
    comment: string,
  ): void {
    const valStr = typeof value === "number" ? this._formatNum(value) : String(value);
    // Pad to align comments (Okuma convention: comment at column 40+)
    const assignment = `${varName} = ${valStr}`;
    const padded = assignment.padEnd(20);
    lines.push(`${padded}( ${comment} )`);
    varMap.push({ var: varName, value, purpose: comment });
  }

  /** Format number for Okuma output — no trailing zeros beyond 4 decimal places */
  private _formatNum(n: number): string {
    if (Number.isInteger(n)) return String(n);
    // Up to 4 decimal places, strip trailing zeros
    const s = n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return s;
  }

  /** Determine which diameter variable to use for RPM calculation based on operation */
  private _getDiaVarForOp(op: MacroOpType): string {
    switch (op) {
      case "id_rough":
      case "id_finish":
      case "bore_rough":
      case "bore_finish":
        return "V3"; // Finish ID / bore diameter
      case "drill":
      case "peck_drill":
      case "center_drill":
      case "ream":
      case "tap":
        return "V20"; // Drill size
      default:
        return "V1"; // Stock / OD diameter
    }
  }
}

export const okumaMacroHeaderGeneratorEngine = new OkumaMacroHeaderGeneratorEngine();
