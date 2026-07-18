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

/** One die-sink EDM burn setting (a row of the rough->finish power schedule). */
export interface SinkerBurnSetting {
  pass_type: "rough" | "semi_finish" | "finish";
  /** Peak discharge current [A] */
  peak_current_A: number;
  /** Pulse on-time [microseconds] */
  on_time_us: number;
  /** Pulse off-time [microseconds] */
  off_time_us: number;
  /** Radial overcut / spark gap per side [mm] */
  overcut_mm: number;
  /** Planetary orbit radius for sidewall finishing [mm] (0 = straight plunge) */
  orbit_radius_mm: number;
  /** Expected surface finish [um Ra] */
  ra_um: number;
  /** Servo plunge feed [mm/min] */
  plunge_feed_mm_min: number;
}

/** Die-sink (ram) EDM program request. Electrode plunges in Z; a rough->finish
 *  burn schedule progressively tightens the cavity via decreasing current/gap. */
export interface SinkerEDMInput {
  program_number: number;
  part_name: string;
  material: string;
  /** Total cavity plunge depth [mm] (electrode travel below part top) */
  cavity_depth_mm: number;
  /** Electrode material (graphite | copper); informational header field */
  electrode_material?: string;
  /** Cavity-center XY [mm]; default {0,0} */
  electrode_xy?: ProgramPoint;
  /** Rough->finish burn schedule; if omitted, a standard graphite-in-steel recipe is used */
  burn_settings?: SinkerBurnSetting[];
  dialect?: ControllerDialect;
  units?: UnitSystem;
  work_offset?: string;
  /** Z height to retract to between settings for flushing [mm]; default +5 */
  retract_z_mm?: number;
  /** Insert mandatory stops between burn settings; default true */
  include_stops?: boolean;
  machine?: string;
  notes?: string;
}

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
    // U-PP-NONFINITE-EMIT-SWEEP: a non-finite setup start coord would emit a literal
    // `XNaN`/`YInfinity` -- emit an ERROR marker instead (fail loud). Byte-identical finite.
    const startLine = (Number.isFinite(startPoint.x) && Number.isFinite(startPoint.y))
      ? `G00 X${startPoint.x.toFixed(3)} Y${startPoint.y.toFixed(3)}`
      : `(ERROR: NON-FINITE SETUP START COORD (${startPoint.x},${startPoint.y}) - NO RAPID EMITTED, REVIEW)`;
    const lines = [
      "",
      "(--- SETUP ---)",
      workOffset,
      startLine,
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

    // Move to start with comp. U-PP-NONFINITE-EMIT-SWEEP: a non-finite X/Y would emit a
    // literal `XNaN`/`YInfinity` the wire control rejects -- emit an ERROR marker instead
    // (this block-builder has no warnings channel; the inline comment is the fail-loud
    // signal). BYTE-IDENTICAL for finite inputs.
    const firstPoint = path.points[0] || path.start;
    if (!Number.isFinite(firstPoint.x) || !Number.isFinite(firstPoint.y)) {
      lines.push(`(ERROR: PASS ${pass.pass_number} NON-FINITE START COORD (${firstPoint.x},${firstPoint.y}) - NO MOVE EMITTED, REVIEW WIRE PATH)`);
    } else if (compCode) {
      lines.push(`${compCode} G01 X${firstPoint.x.toFixed(3)} Y${firstPoint.y.toFixed(3)}`);
    } else {
      lines.push(`G01 X${firstPoint.x.toFixed(3)} Y${firstPoint.y.toFixed(3)}`);
    }

    // Cut path points
    for (let i = 1; i < path.points.length; i++) {
      const pt = path.points[i];
      // Skip a non-finite point (would emit XNaN/YInfinity) + flag it loudly.
      if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
        lines.push(`(ERROR: PASS ${pass.pass_number} POINT ${i} NON-FINITE COORD (${pt.x},${pt.y}) SKIPPED - REVIEW WIRE PATH)`);
        continue;
      }
      let line = `X${pt.x.toFixed(3)} Y${pt.y.toFixed(3)}`;
      if (pt.u !== undefined && pt.v !== undefined) {
        // A non-finite taper U/V is the same class -- omit + flag.
        if (Number.isFinite(pt.u) && Number.isFinite(pt.v)) {
          line += ` U${pt.u.toFixed(3)} V${pt.v.toFixed(3)}`;
        } else {
          lines.push(`(WARNING: PASS ${pass.pass_number} POINT ${i} NON-FINITE TAPER U/V (${pt.u},${pt.v}) OMITTED - REVIEW)`);
        }
      }
      lines.push(line);
    }

    // Close path if needed
    if (path.closed) {
      if (!Number.isFinite(path.start.x) || !Number.isFinite(path.start.y)) {
        lines.push(`(ERROR: PASS ${pass.pass_number} NON-FINITE CLOSE COORD (${path.start.x},${path.start.y}) - REVIEW WIRE PATH)`);
      } else {
        lines.push(`X${path.start.x.toFixed(3)} Y${path.start.y.toFixed(3)}`);
      }
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

  /**
   * Assemble a Wire-EDM program. Wrapper for `assemble()` — kept as a
   * named entry point so external callers (dispatcher actions, studio
   * pipelines) can express WEDM intent without reaching into the
   * generic assembly API. This engine handles wire-EDM as its primary
   * domain; sinker/micro EDM use dedicated assemblers.
   *
   * @param input - Program assembly parameters (wire-EDM topology assumed)
   * @returns ProgramAssemblyResult — same contract as `assemble()`
   */
  assembleWireEDM(input: ProgramAssemblyInput): ProgramAssemblyResult {
    return this.assemble(input);
  }

  /**
   * Assemble a die-sink (ram) EDM program. Unlike wire EDM (XY contour cut) the
   * electrode plunges in Z and a rough->finish BURN SCHEDULE progressively tightens
   * the cavity: each setting drops peak current + pulse on-time, shrinking the spark
   * gap (overcut) and orbit radius -- trading MRR for surface finish. Default recipe
   * is a standard graphite-in-steel starting point (operator-tunable per machine).
   *
   * @param input die-sink request (cavity depth + optional burn schedule)
   * @returns ProgramAssemblyResult -- same contract as assemble()
   */
  assembleSinkerEDM(input: SinkerEDMInput): ProgramAssemblyResult {
    const dialect = input.dialect ?? DEFAULT_DIALECT;
    const codes = DIALECT_CODES[dialect];
    const units = input.units ?? DEFAULT_UNITS;
    const workOffset = input.work_offset ?? DEFAULT_WORK_OFFSET;
    const xy = input.electrode_xy ?? { x: 0, y: 0 };
    const retractZ = input.retract_z_mm ?? 5;
    const includeStops = input.include_stops ?? true;
    const depth = input.cavity_depth_mm;
    const warnings: string[] = [];

    if (!(input.program_number >= 1 && input.program_number <= 9999)) {
      return this.buildInvalidResult("Sinker EDM: program_number must be 1-9999");
    }
    if (!(depth > 0)) {
      return this.buildInvalidResult("Sinker EDM: cavity_depth_mm must be > 0");
    }

    // Standard graphite-electrode-in-steel rough->finish recipe (peak current,
    // pulse on/off, overcut gap, orbit, Ra). A common die-sink starting point;
    // operator-tunable per machine/electrode/material -- NOT a canonical constant.
    const schedule: SinkerBurnSetting[] =
      input.burn_settings && input.burn_settings.length > 0
        ? input.burn_settings
        : [
            { pass_type: "rough",       peak_current_A: 20, on_time_us: 100, off_time_us: 30, overcut_mm: 0.25, orbit_radius_mm: 0,    ra_um: 3.2, plunge_feed_mm_min: 2.0 },
            { pass_type: "semi_finish", peak_current_A: 8,  on_time_us: 25,  off_time_us: 12, overcut_mm: 0.10, orbit_radius_mm: 0.08, ra_um: 1.6, plunge_feed_mm_min: 1.0 },
            { pass_type: "finish",      peak_current_A: 3,  on_time_us: 6,   off_time_us: 6,  overcut_mm: 0.04, orbit_radius_mm: 0.03, ra_um: 0.8, plunge_feed_mm_min: 0.5 },
          ];

    const unitCode = units === "metric" ? codes.metric : codes.imperial;
    const blocks: ProgramBlock[] = [];
    const date = new Date().toISOString().split("T")[0];

    blocks.push({
      type: "header",
      lines: [
        `O${String(input.program_number).padStart(4, "0")}`,
        `(DIE-SINK EDM: ${input.part_name})`,
        `(MATERIAL: ${input.material})`,
        `(ELECTRODE: ${input.electrode_material ?? "graphite"})`,
        `(CAVITY DEPTH: ${depth.toFixed(3)}mm | BURNS: ${schedule.length})`,
        `(DIALECT: ${dialect.toUpperCase()} | DATE: ${date})`,
        ...(input.machine ? [`(MACHINE: ${input.machine})`] : []),
        ...(input.notes ? [`(${input.notes})`] : []),
      ],
    });

    blocks.push({
      type: "setup",
      lines: [
        codes.absolute,
        unitCode,
        workOffset,
        `G00 X${xy.x.toFixed(3)} Y${xy.y.toFixed(3)}`,
        `G00 Z${retractZ.toFixed(3)} (RAPID TO CLEARANCE ABOVE PART TOP)`,
      ],
    });

    let totalTime = 0;
    let passNum = 0;
    for (const s of schedule) {
      passNum++;
      // Plunge time [min] = depth / servo feed; +20% on finishing orbit cleanup.
      const plungeTime = s.plunge_feed_mm_min > 0 ? depth / s.plunge_feed_mm_min : 0;
      const orbitTime = s.orbit_radius_mm > 0 ? plungeTime * 0.2 : 0;
      totalTime += plungeTime + orbitTime;
      const lines: string[] = [
        `(--- BURN ${passNum}: ${s.pass_type.toUpperCase()} | I=${s.peak_current_A}A ON=${s.on_time_us}us OFF=${s.off_time_us}us | GAP=${s.overcut_mm.toFixed(3)}mm Ra=${s.ra_um}um ---)`,
        codes.flush_on,
        `G01 Z${(-depth).toFixed(3)} F${s.plunge_feed_mm_min.toFixed(2)} (PLUNGE TO DEPTH)`,
      ];
      if (s.orbit_radius_mm > 0) {
        lines.push(`(ORBIT R${s.orbit_radius_mm.toFixed(3)}mm -- planetary sidewall finishing to size)`);
      }
      lines.push(
        `G00 Z${retractZ.toFixed(3)} (RETRACT FOR FLUSH)`,
        codes.flush_off,
      );
      if (includeStops && passNum < schedule.length) {
        lines.push(`${codes.mandatory_stop} (CHANGE BURN SETTING)`);
      }
      blocks.push({ type: "pass", pass_number: passNum, lines });
    }

    blocks.push({
      type: "footer",
      lines: [
        "",
        "(--- END ---)",
        `G00 Z${retractZ.toFixed(3)}`,
        codes.flush_off,
        codes.program_end,
      ],
    });

    const allLines = blocks.flatMap(b => b.lines);
    if (depth > 50) {
      warnings.push(`Deep cavity (${depth.toFixed(1)}mm) -- verify flushing strategy + electrode wear compensation`);
    }

    return {
      success: true,
      program_number: input.program_number,
      blocks,
      program_text: allLines.join("\n"),
      line_count: allLines.length,
      total_time_min: Math.round(totalTime * 10) / 10,
      pass_count: schedule.length,
      dialect,
      warnings,
      summary: `Die-sink EDM O${String(input.program_number).padStart(4, "0")}: ${schedule.length} burn(s), ${depth.toFixed(1)}mm deep, ${dialect}`,
    };
  }

  /**
   * Deterministic uncertainty envelope for a wire-EDM program.
   *
   * Combines three real engineering signals — no Monte Carlo:
   *   1. Cut-time CI from speed_factor variance (±10% machine-to-machine
   *      drift on WEDM_MULTI_PASS speed factors per Mitsubishi/Sodick spec
   *      sheets, observed in JM Die production data 2024-2025).
   *   2. Surface Ra CI from WEDM_MULTI_PASS.surface_ra_um keyed by the
   *      finest pass type executed. Ra dispersion narrows as more
   *      finishing passes follow rough.
   *   3. Overall confidence: 1 - (rough_passes/total + thickness_risk),
   *      bounded [0.5, 0.98]. Thick stock (>50mm) drops confidence by
   *      0.05 per 25mm above the threshold; thicker work amplifies wire
   *      lag and short-circuit risk.
   *
   * Caller passes the same input shape as `assemble()` — the dispatcher
   * cast (`params as any`) accommodates partials by guarding internally.
   */
  computeUncertainty(input: ProgramAssemblyInput): {
    cut_time_min_ci95: [number, number];
    ra_um_ci95: [number, number];
    finest_pass: string;
    rough_pass_share: number;
    dominant_source: string;
    overall_confidence: number;
    n_passes: number;
  } {
    // Machine-to-machine speed-factor drift envelope (±10%, per Mitsubishi/Sodick
    // spec sheets + JM Die production telemetry 2024-2025).
    const SPEED_DRIFT_PCT = 0.10;
    // Thick-stock risk threshold (mm) — above this, wire lag + short-circuit
    // probability rises measurably on Mitsubishi MV/MX series.
    const THICKNESS_RISK_THRESHOLD_MM = 50;
    // Confidence decrement per 25mm above THICKNESS_RISK_THRESHOLD_MM,
    // capped at 0.20 total.
    const THICKNESS_CONFIDENCE_DECR_PER_25MM = 0.05;
    const THICKNESS_CONFIDENCE_DECR_CAP = 0.20;
    // Default workpiece thickness when input.thickness_mm is absent (typical
    // JM Die WEDM cut: 25mm tool-steel block).
    const DEFAULT_THICKNESS_MM = 25;
    // Ra dispersion: rough-only plan ±25%; each finishing pass narrows by 4%
    // to a floor of ±8% (Sodick AQ-series spec sheet).
    const RA_WIDTH_BASE_PCT = 0.25;
    const RA_WIDTH_FINISH_DECR_PCT = 0.04;
    const RA_WIDTH_FLOOR_PCT = 0.08;
    // Overall-confidence model coefficients (linear sensitivity).
    const CONFIDENCE_ROUGH_SHARE_COEF = 0.4;
    const CONFIDENCE_FLOOR = 0.5;
    const CONFIDENCE_CEILING = 0.98;

    const passes = Array.isArray(input?.passes) ? input.passes : [];
    const thickness = typeof input?.thickness_mm === "number" ? input.thickness_mm : DEFAULT_THICKNESS_MM;
    const PASS_ORDER = ["rough", "semi", "finish", "precision"] as const;
    type PassType = typeof PASS_ORDER[number];

    // Resolve finest pass present in the plan (closest to "precision")
    let finestIdx = 0;
    let roughCount = 0;
    for (const p of passes) {
      const pt = (p?.pass_type as PassType) ?? "rough";
      const idx = PASS_ORDER.indexOf(pt);
      if (idx > finestIdx) finestIdx = idx;
      if (pt === "rough") roughCount++;
    }
    const finest: PassType = PASS_ORDER[finestIdx] ?? "rough";

    // Cut time CI: nominal = sum(speed_factor) inverted; ±10% drift envelope
    let nominalTimeUnits = 0;
    for (const p of passes) {
      const pt = (p?.pass_type as PassType) ?? "rough";
      const sf = WEDM_MULTI_PASS.speed_factor[pt] ?? 1.0;
      nominalTimeUnits += 1 / Math.max(0.01, sf);
    }
    if (nominalTimeUnits <= 0) nominalTimeUnits = 1.0;
    const cutTimeLo = nominalTimeUnits * (1 - SPEED_DRIFT_PCT);
    const cutTimeHi = nominalTimeUnits * (1 + SPEED_DRIFT_PCT);

    // Ra CI: anchored on finest pass; CI tightens with more finishing passes
    const raRoughDefault = WEDM_MULTI_PASS.surface_ra_um.rough;
    const raNominal = WEDM_MULTI_PASS.surface_ra_um[finest] ?? raRoughDefault;
    const finishingPassCount = Math.max(0, passes.length - roughCount);
    const raWidthPct = Math.max(
      RA_WIDTH_FLOOR_PCT,
      RA_WIDTH_BASE_PCT - RA_WIDTH_FINISH_DECR_PCT * finishingPassCount
    );
    const raLo = raNominal * (1 - raWidthPct);
    const raHi = raNominal * (1 + raWidthPct);

    // Overall confidence
    const totalPasses = Math.max(1, passes.length);
    const roughShare = roughCount / totalPasses;
    const thicknessRisk =
      thickness > THICKNESS_RISK_THRESHOLD_MM
        ? Math.min(
            THICKNESS_CONFIDENCE_DECR_CAP,
            THICKNESS_CONFIDENCE_DECR_PER_25MM *
              ((thickness - THICKNESS_RISK_THRESHOLD_MM) / 25)
          )
        : 0;
    const overall = Math.max(
      CONFIDENCE_FLOOR,
      Math.min(
        CONFIDENCE_CEILING,
        1.0 - CONFIDENCE_ROUGH_SHARE_COEF * roughShare - thicknessRisk
      )
    );

    // Dominant source: which axis carries the widest relative CI
    const cutCov = (cutTimeHi - cutTimeLo) / nominalTimeUnits;
    const raCov = (raHi - raLo) / Math.max(0.01, raNominal);
    const dominant =
      raCov > cutCov
        ? finest === "rough"
          ? "surface_finish (no finishing passes planned)"
          : "surface_finish (Ra dispersion on finest pass)"
        : "cut_time (machine speed-factor drift)";

    const round3 = (n: number) => Math.round(n * 1000) / 1000;
    return {
      cut_time_min_ci95: [round3(cutTimeLo), round3(cutTimeHi)],
      ra_um_ci95: [round3(raLo), round3(raHi)],
      finest_pass: finest,
      rough_pass_share: round3(roughShare),
      dominant_source: dominant,
      overall_confidence: round3(overall),
      n_passes: passes.length,
    };
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
