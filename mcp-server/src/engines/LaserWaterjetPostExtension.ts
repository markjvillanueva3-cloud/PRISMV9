/**
 * LaserWaterjetPostExtension — Post-Processor for Laser & Waterjet Processes
 *
 * Converts intermediate/generic laser and waterjet programs to controller-native
 * G-code. DISTINCT from LaserProgramAssemblerEngine and WaterjetProgramAssemblerEngine
 * (which generate complete programs from part descriptions with full physics).
 * This extension handles the POST-PROCESSING step: adapting existing laser/waterjet
 * toolpath data to specific controller dialects.
 *
 * Laser Post-Processing:
 *   - Pierce sequence generation (stationary / ramp / pulse / pre-pierce)
 *   - Power ramping and modulation per controller
 *   - Assist gas selection codes (N2, O2, air, Ar)
 *   - Nesting lead-in/lead-out patterns
 *   - Cut condition mapping per material/thickness
 *   - Focus position compensation
 *
 * Waterjet Post-Processing:
 *   - Quality level → speed mapping (Q1 rough → Q5 fine)
 *   - Taper compensation (Dynamic XD / dynamic head)
 *   - Abrasive flow rate control codes
 *   - Pierce strategy (stationary / moving / pre-drill)
 *   - Pump pressure mapping
 *   - Nesting lead-in patterns
 *
 * Controller Dialects:
 *   bystronic   — Bystronic ByStar/ByAutonom (BySoft 7 format)
 *   trumpf      — TRUMPF TruLaser (TruTops format)
 *   omax        — OMAX IntelliMAX (OMAX Make/Layout format)
 *   flow        — Flow International Mach series (FlowMaster format)
 *
 * References:
 *   - Bystronic: ByStar Fiber Operating Manual
 *   - TRUMPF: TruLaser Programming Guide (TruTops Boost)
 *   - OMAX: IntelliMAX Software Reference Manual
 *   - Flow International: FlowMaster Programming Guide
 *   - Schulz (1999): Laser cutting speed model V = K×P/(t^n × ρ×c×ΔT)
 *   - Momber & Kovacevic (1998): Principles of Abrasive Water Jet Machining
 *
 * @module engines/LaserWaterjetPostExtension
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Supported laser/waterjet post-processor controller dialects. */
export type SheetPostController =
  | "bystronic"
  | "trumpf"
  | "omax"
  | "flow";

/** Sheet cutting process type. */
export type SheetProcessType = "laser_cut" | "laser_mark" | "waterjet";

/** Laser gas type. */
export type AssistGas = "nitrogen" | "oxygen" | "air" | "argon";

/** Waterjet quality level (Q1=rough/fast → Q5=fine/slow). */
export type QualityLevel = 1 | 2 | 3 | 4 | 5;

/** Laser pierce strategy. */
export type PierceStrategy = "stationary" | "ramp" | "pulse" | "pre_pierce";

/** Waterjet pierce strategy. */
export type WaterjetPierceStrategy = "stationary" | "moving" | "low_pressure" | "pre_drill";

/** A parsed sheet cutting operation. */
export interface SheetOperation {
  type: "rapid" | "cut" | "pierce" | "lead_in" | "lead_out" | "dwell" | "power_change" | "gas_change";
  line_number?: number;
  x?: number;
  y?: number;
  z?: number;
  i?: number;
  j?: number;
  r?: number;
  feed?: number;
  power_pct?: number;
  raw_line?: string;
}

/** Laser dialect configuration. */
interface LaserDialect {
  program_start: (num: number) => string;
  program_end: string;
  /** Pierce sequence for given strategy */
  pierce: (strategy: PierceStrategy, power_pct: number, dwell_s: number) => string;
  /** Set laser power */
  power_on: (pct: number) => string;
  power_off: string;
  /** Assist gas selection */
  gas_select: (gas: AssistGas, pressure_bar: number) => string;
  /** Focus position */
  focus_set: (z_mm: number) => string;
  /** Shutter control */
  shutter_open: string;
  shutter_close: string;
  /** Lead-in arc */
  lead_in: (radius_mm: number) => string;
  /** Lead-out arc */
  lead_out: (radius_mm: number) => string;
  /** Move codes */
  rapid: string;
  linear: string;
  cw_arc: string;
  ccw_arc: string;
  /** Coordinate format */
  coord: (x?: number, y?: number) => string;
}

/** Waterjet dialect configuration. */
interface WaterjetDialect {
  program_start: (num: number) => string;
  program_end: string;
  /** Quality level → feed rate % mapping */
  quality_speed_pct: Record<QualityLevel, number>;
  /** Pierce sequence */
  pierce: (strategy: WaterjetPierceStrategy, dwell_s: number) => string;
  /** Abrasive on/off */
  abrasive_on: (flow_g_min: number) => string;
  abrasive_off: string;
  /** Pump pressure setting */
  pressure_set: (bar: number) => string;
  /** Taper compensation */
  taper_comp_on: (angle_deg: number) => string;
  taper_comp_off: string;
  /** Move codes */
  rapid: string;
  linear: string;
  cw_arc: string;
  ccw_arc: string;
  coord: (x?: number, y?: number) => string;
}

/** Input for laser/waterjet post-processing. */
export interface SheetPostInput {
  /** Input G-code or intermediate program */
  gcode: string;
  /** Target controller dialect */
  controller: SheetPostController;
  /** Process type — auto-detected if omitted */
  process_type?: SheetProcessType;
  /** Material name for condition selection */
  material?: string;
  /** Sheet thickness in mm */
  thickness_mm?: number;
  /** Laser power percentage (0-100, default 100) */
  power_pct?: number;
  /** Assist gas type */
  gas?: AssistGas;
  /** Gas pressure in bar */
  gas_pressure_bar?: number;
  /** Pierce strategy */
  pierce_strategy?: PierceStrategy;
  /** Pierce dwell time in seconds */
  pierce_dwell_s?: number;
  /** Waterjet quality level (1-5) */
  quality_level?: QualityLevel;
  /** Waterjet abrasive flow rate g/min */
  abrasive_flow_g_min?: number;
  /** Pump pressure in bar */
  pump_pressure_bar?: number;
  /** Taper compensation angle (degrees) */
  taper_angle_deg?: number;
  /** Lead-in radius in mm */
  lead_in_radius_mm?: number;
  /** Program number */
  program_number?: number;
  /** Focus position offset in mm */
  focus_offset_mm?: number;
}

/** Output from laser/waterjet post-processing. */
export interface SheetPostOutput {
  /** Controller-native G-code */
  gcode: string;
  /** Target controller */
  controller: SheetPostController;
  /** Detected or specified process type */
  process_type: SheetProcessType;
  /** Number of cutting moves */
  operation_count: number;
  /** Warnings */
  warnings: string[];
  /** Statistics */
  stats: {
    total_lines: number;
    cutting_moves: number;
    pierce_count: number;
    estimated_cut_length_m?: number;
  };
}

// ============================================================================
// HELPER
// ============================================================================

const fmtCoord = (x?: number, y?: number): string => {
  const parts: string[] = [];
  if (x !== undefined) parts.push(`X${x.toFixed(3)}`);
  if (y !== undefined) parts.push(`Y${y.toFixed(3)}`);
  return parts.join(" ");
};

// ============================================================================
// LASER DIALECT DATABASE
// ============================================================================

const LASER_DIALECTS: Record<"bystronic" | "trumpf", LaserDialect> = {
  bystronic: {
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (LASER CUT - BYSTRONIC BYSTAR)`,
      "G90 G21 (ABSOLUTE, METRIC)",
      "G54 (WORK OFFSET)",
      "M17 (LASER READY)",
    ].join("\n"),
    program_end: [
      "M11 (SHUTTER CLOSE)",
      "M18 (LASER OFF)",
      "G00 X0 Y0 (PARK)",
      "M30",
      "%",
    ].join("\n"),
    pierce: (strategy, power, dwell) => {
      const lines: string[] = [];
      switch (strategy) {
        case "stationary":
          lines.push(`M10 (SHUTTER OPEN)`);
          lines.push(`G04 P${(dwell * 1000).toFixed(0)} (PIERCE DWELL ${dwell}s)`);
          break;
        case "ramp":
          lines.push(`M10 P30 (SHUTTER OPEN - RAMP START 30%)`);
          lines.push(`G04 P${(dwell * 500).toFixed(0)}`);
          lines.push(`M10 P${power.toFixed(0)} (RAMP TO ${power}%)`);
          lines.push(`G04 P${(dwell * 500).toFixed(0)}`);
          break;
        case "pulse":
          lines.push(`M10 (SHUTTER OPEN)`);
          lines.push(`M48 (PULSE MODE ON)`);
          lines.push(`G04 P${(dwell * 1000).toFixed(0)} (PULSE PIERCE)`);
          lines.push(`M49 (PULSE MODE OFF)`);
          break;
        case "pre_pierce":
          lines.push(`M10 P${Math.round(power * 1.2)} (PRE-PIERCE HIGH POWER)`);
          lines.push(`G04 P${(dwell * 1000).toFixed(0)}`);
          lines.push(`M10 P${power.toFixed(0)} (CUT POWER)`);
          break;
      }
      return lines.join("\n");
    },
    power_on: (pct) => `S${Math.round(pct * 10)} (LASER POWER ${pct}%)`,
    power_off: "S0 (LASER POWER OFF)",
    gas_select: (gas, pressure) => {
      const gasMap: Record<AssistGas, number> = { nitrogen: 40, oxygen: 41, air: 42, argon: 43 };
      return `M${gasMap[gas]} P${pressure.toFixed(1)} (${gas.toUpperCase()} ${pressure} BAR)`;
    },
    focus_set: (z) => `G00 Z${z.toFixed(2)} (FOCUS POSITION)`,
    shutter_open: "M10 (SHUTTER OPEN)",
    shutter_close: "M11 (SHUTTER CLOSE)",
    lead_in: (r) => `G02 I${r.toFixed(3)} J0. (LEAD-IN ARC R=${r}mm)`,
    lead_out: (r) => `G02 I${r.toFixed(3)} J0. (LEAD-OUT ARC)`,
    rapid: "G00",
    linear: "G01",
    cw_arc: "G02",
    ccw_arc: "G03",
    coord: fmtCoord,
  },

  trumpf: {
    program_start: (num) => [
      "%",
      `O${String(num).padStart(4, "0")} (LASER CUT - TRUMPF TRULASER)`,
      "G90 G21",
      "G71 (METRIC INPUT)",
      "G54",
      "M20 (LASER ENABLE)",
    ].join("\n"),
    program_end: [
      "M21 (BEAM OFF)",
      "M22 (LASER DISABLE)",
      "G00 X0 Y0 (HOME)",
      "M30",
      "%",
    ].join("\n"),
    pierce: (strategy, power, dwell) => {
      const lines: string[] = [];
      switch (strategy) {
        case "stationary":
          lines.push(`M21 (BEAM ON)`);
          lines.push(`LO=${power.toFixed(0)} (LASER OUTPUT ${power}%)`);
          lines.push(`G04 X${dwell.toFixed(2)} (PIERCE ${dwell}s)`);
          break;
        case "ramp":
          lines.push(`M21`);
          lines.push(`LO=30`);
          lines.push(`G04 X${(dwell * 0.3).toFixed(2)}`);
          lines.push(`LO=60`);
          lines.push(`G04 X${(dwell * 0.3).toFixed(2)}`);
          lines.push(`LO=${power.toFixed(0)}`);
          lines.push(`G04 X${(dwell * 0.4).toFixed(2)}`);
          break;
        case "pulse":
          lines.push(`M21`);
          lines.push(`LS=2 (PULSE MODE)`);
          lines.push(`LO=${power.toFixed(0)}`);
          lines.push(`G04 X${dwell.toFixed(2)}`);
          lines.push(`LS=1 (CW MODE)`);
          break;
        case "pre_pierce":
          lines.push(`M21`);
          lines.push(`LO=${Math.round(power * 1.3)} (PRE-PIERCE)`);
          lines.push(`G04 X${(dwell * 0.5).toFixed(2)}`);
          lines.push(`LO=${power.toFixed(0)} (CUT POWER)`);
          lines.push(`G04 X${(dwell * 0.5).toFixed(2)}`);
          break;
      }
      return lines.join("\n");
    },
    power_on: (pct) => `LO=${Math.round(pct)} (LASER OUTPUT ${pct}%)`,
    power_off: "LO=0",
    gas_select: (gas, pressure) => {
      const gasMap: Record<AssistGas, string> = {
        nitrogen: "GS=2", oxygen: "GS=1", air: "GS=3", argon: "GS=4",
      };
      return `${gasMap[gas]} GP=${pressure.toFixed(1)} (${gas.toUpperCase()} ${pressure}BAR)`;
    },
    focus_set: (z) => `FP=${z.toFixed(2)} (FOCUS POSITION ${z}mm)`,
    shutter_open: "M21 (BEAM ON)",
    shutter_close: "M22 (BEAM OFF)",
    lead_in: (r) => `G02 I${r.toFixed(3)} J0. (LEAD-IN R=${r})`,
    lead_out: (r) => `G02 I${r.toFixed(3)} J0. (LEAD-OUT)`,
    rapid: "G00",
    linear: "G01",
    cw_arc: "G02",
    ccw_arc: "G03",
    coord: fmtCoord,
  },
};

// ============================================================================
// WATERJET DIALECT DATABASE
// ============================================================================

const WATERJET_DIALECTS: Record<"omax" | "flow", WaterjetDialect> = {
  omax: {
    program_start: (num) => [
      `; OMAX INTELLI-MAX PROGRAM ${num}`,
      "; GENERATED BY PRISM POST-PROCESSOR",
      "G90 G21",
      "G00 X0 Y0",
    ].join("\n"),
    program_end: [
      "M05 (PUMP OFF)",
      "M09 (ABRASIVE OFF)",
      "G00 X0 Y0 (PARK)",
      "M30",
    ].join("\n"),
    // OMAX quality levels → speed as % of max traverse
    // Q1=100% (rough/fast) → Q5=20% (fine/slow)
    quality_speed_pct: { 1: 100, 2: 75, 3: 50, 4: 35, 5: 20 },
    pierce: (strategy, dwell) => {
      const lines: string[] = [];
      switch (strategy) {
        case "stationary":
          lines.push(`M03 (PUMP ON)`);
          lines.push(`M08 (ABRASIVE ON)`);
          lines.push(`G04 P${(dwell * 1000).toFixed(0)} (STATIONARY PIERCE ${dwell}s)`);
          break;
        case "moving":
          lines.push(`M03`);
          lines.push(`M08`);
          lines.push(`; MOVING PIERCE - LOW SPEED START`);
          break;
        case "low_pressure":
          lines.push(`M03 P2000 (LOW PRESSURE PIERCE 2000 BAR)`);
          lines.push(`M08`);
          lines.push(`G04 P${(dwell * 1000).toFixed(0)}`);
          lines.push(`M03 P4000 (FULL PRESSURE)`);
          break;
        case "pre_drill":
          lines.push(`; PRE-DRILLED START HOLE`);
          lines.push(`M03 (PUMP ON)`);
          lines.push(`M08 (ABRASIVE ON)`);
          break;
      }
      return lines.join("\n");
    },
    abrasive_on: (flow) => `M08 F${flow.toFixed(0)} (ABRASIVE ON ${flow} G/MIN)`,
    abrasive_off: "M09 (ABRASIVE OFF)",
    pressure_set: (bar) => `M03 P${bar.toFixed(0)} (PUMP ${bar} BAR)`,
    taper_comp_on: (angle) => `G68 A${angle.toFixed(3)} (TAPER COMPENSATION ON)`,
    taper_comp_off: "G69 (TAPER COMP OFF)",
    rapid: "G00",
    linear: "G01",
    cw_arc: "G02",
    ccw_arc: "G03",
    coord: fmtCoord,
  },

  flow: {
    program_start: (num) => [
      `; FLOW MACH PROGRAM ${num}`,
      "; GENERATED BY PRISM POST-PROCESSOR",
      "G90 G21",
      "G00 X0 Y0",
    ].join("\n"),
    program_end: [
      "M05 (HIGH PRESSURE OFF)",
      "M09 (ABRASIVE OFF)",
      "G00 X0 Y0 (HOME)",
      "M30",
    ].join("\n"),
    // Flow quality levels → speed % (Dynamic XD model)
    quality_speed_pct: { 1: 100, 2: 80, 3: 55, 4: 38, 5: 22 },
    pierce: (strategy, dwell) => {
      const lines: string[] = [];
      switch (strategy) {
        case "stationary":
          lines.push(`M03 (HIGH PRESSURE ON)`);
          lines.push(`M08 (ABRASIVE FEED ON)`);
          lines.push(`G04 P${(dwell * 1000).toFixed(0)} (PIERCE DWELL)`);
          break;
        case "moving":
          lines.push(`M03`);
          lines.push(`M08`);
          lines.push(`; DYNAMIC PIERCE - MOVING START`);
          break;
        case "low_pressure":
          lines.push(`M03 S50 (LOW PRESSURE START 50%)`);
          lines.push(`M08`);
          lines.push(`G04 P${(dwell * 1000).toFixed(0)}`);
          lines.push(`M03 S100 (FULL PRESSURE)`);
          break;
        case "pre_drill":
          lines.push(`; PRE-DRILLED START POINT`);
          lines.push(`M03 (HIGH PRESSURE ON)`);
          lines.push(`M08`);
          break;
      }
      return lines.join("\n");
    },
    abrasive_on: (flow) => `M08 Q${flow.toFixed(0)} (GARNET FEED ${flow} G/MIN)`,
    abrasive_off: "M09 (GARNET OFF)",
    pressure_set: (bar) => `M03 S${Math.round(bar / 40)} (PUMP ${bar} BAR)`,
    taper_comp_on: (angle) => `G68.1 R${angle.toFixed(3)} (DYNAMIC XD TAPER COMP)`,
    taper_comp_off: "G69 (TAPER COMP CANCEL)",
    rapid: "G00",
    linear: "G01",
    cw_arc: "G02",
    ccw_arc: "G03",
    coord: fmtCoord,
  },
};

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

const LASER_MARKERS = [
  /LASER/i,
  /\bM1[01]\b/,      // M10/M11 shutter
  /\bM2[012]\b/,     // M20/M21/M22 beam on/off
  /\bLO\s*=/,         // TRUMPF laser output
  /\bLS\s*=/,         // TRUMPF laser mode
  /SHUTTER/i,
  /BEAM\s*(ON|OFF)/i,
  /PIERCE/i,
  /\bGS\s*=/,         // TRUMPF gas select
  /\bM4[0-9]\b/,     // Bystronic gas codes
  /FOCUS/i,
];

const WATERJET_MARKERS = [
  /WATERJET|WATER\s*JET/i,
  /\bABRASIVE/i,
  /\bGARNET/i,
  /\bM0?8\b.*(?:ABRASIVE|GARNET)/i,
  /PUMP/i,
  /OMAX|INTELLIMAX/i,
  /FLOW\s*MACH/i,
  /\bQ[1-5]\b.*(?:QUALITY|LEVEL)/i,
  /TAPER\s*COMP/i,
  /DYNAMIC\s*XD/i,
];

// ============================================================================
// MATERIAL CONDITION LOOKUP (Laser)
// ============================================================================

interface LaserCondition {
  power_pct: number;
  pierce_dwell_s: number;
  pierce_strategy: PierceStrategy;
  gas: AssistGas;
  gas_pressure_bar: number;
  focus_mm: number;
}

/**
 * Default laser conditions by material and thickness range.
 * Based on Bystronic/TRUMPF application guides for fiber lasers.
 */
const LASER_CONDITIONS: Record<string, Record<string, LaserCondition>> = {
  mild_steel: {
    thin:   { power_pct: 60,  pierce_dwell_s: 0.3, pierce_strategy: "stationary", gas: "oxygen",   gas_pressure_bar: 0.8, focus_mm: -1.0 },
    medium: { power_pct: 80,  pierce_dwell_s: 0.8, pierce_strategy: "ramp",       gas: "oxygen",   gas_pressure_bar: 0.6, focus_mm: -2.0 },
    thick:  { power_pct: 100, pierce_dwell_s: 2.0, pierce_strategy: "pulse",      gas: "oxygen",   gas_pressure_bar: 0.5, focus_mm: -3.0 },
  },
  stainless_steel: {
    thin:   { power_pct: 70,  pierce_dwell_s: 0.3, pierce_strategy: "stationary", gas: "nitrogen",  gas_pressure_bar: 12, focus_mm: -0.5 },
    medium: { power_pct: 90,  pierce_dwell_s: 1.0, pierce_strategy: "ramp",       gas: "nitrogen",  gas_pressure_bar: 14, focus_mm: -1.5 },
    thick:  { power_pct: 100, pierce_dwell_s: 2.5, pierce_strategy: "pulse",      gas: "nitrogen",  gas_pressure_bar: 16, focus_mm: -2.5 },
  },
  aluminum: {
    thin:   { power_pct: 80,  pierce_dwell_s: 0.2, pierce_strategy: "stationary", gas: "nitrogen",  gas_pressure_bar: 14, focus_mm: -0.5 },
    medium: { power_pct: 100, pierce_dwell_s: 0.8, pierce_strategy: "ramp",       gas: "nitrogen",  gas_pressure_bar: 16, focus_mm: -1.0 },
    thick:  { power_pct: 100, pierce_dwell_s: 2.0, pierce_strategy: "pulse",      gas: "nitrogen",  gas_pressure_bar: 18, focus_mm: -2.0 },
  },
};

function getThicknessRange(thickness_mm?: number): string {
  if (!thickness_mm || thickness_mm <= 3) return "thin";
  if (thickness_mm <= 10) return "medium";
  return "thick";
}

function getLaserCondition(material?: string, thickness_mm?: number): LaserCondition {
  const thRange = getThicknessRange(thickness_mm);
  if (material) {
    const normalized = material.toLowerCase().replace(/[\s-]+/g, "_");
    for (const [key, ranges] of Object.entries(LASER_CONDITIONS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return ranges[thRange];
      }
    }
  }
  // Default to mild steel conditions
  return LASER_CONDITIONS.mild_steel[thRange];
}

// ============================================================================
// MATERIAL CONDITION LOOKUP (Waterjet)
// ============================================================================

/**
 * Base cutting speed (mm/min) for waterjet at Q3 quality, 25mm thickness, 3800 bar.
 * Scales with quality level, thickness, and pressure.
 * Based on OMAX/Flow machinability data.
 */
const WATERJET_BASE_SPEED: Record<string, number> = {
  mild_steel:      120,
  stainless_steel: 90,
  aluminum:        200,
  titanium:        60,
  glass:           150,
  ceramic:         80,
  stone:           100,
  copper:          110,
  brass:           130,
  carbon_fiber:    180,
};

function getWaterjetBaseSpeed(material?: string): number {
  if (material) {
    const normalized = material.toLowerCase().replace(/[\s-]+/g, "_");
    for (const [key, speed] of Object.entries(WATERJET_BASE_SPEED)) {
      if (normalized.includes(key) || key.includes(normalized)) return speed;
    }
  }
  return 100; // default
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class LaserWaterjetPostExtensionImpl {

  /**
   * Detect process type from G-code content.
   */
  detectProcessType(gcode: string): SheetProcessType {
    let laserScore = 0;
    let waterjetScore = 0;

    for (const pattern of LASER_MARKERS) {
      if (pattern.test(gcode)) laserScore++;
    }
    for (const pattern of WATERJET_MARKERS) {
      if (pattern.test(gcode)) waterjetScore++;
    }

    if (waterjetScore > laserScore) return "waterjet";
    if (/MARK|ENGRAV|ETCH|ANNEAL/i.test(gcode)) return "laser_mark";
    return "laser_cut";
  }

  /**
   * Parse sheet cutting operations from generic G-code.
   */
  parseOperations(gcode: string): SheetOperation[] {
    const ops: SheetOperation[] = [];
    const lines = gcode.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith(";") || line === "%" || (line.startsWith("(") && line.endsWith(")"))) continue;

      const op: SheetOperation = { type: "cut", line_number: i + 1, raw_line: line };

      if (/\bG0?0\b/.test(line)) op.type = "rapid";
      else if (/\bG0?1\b/.test(line)) op.type = "cut";
      else if (/PIERCE/i.test(line) || /\bG0?4\b/.test(line)) op.type = "pierce";
      else if (/M1[01]\b|M2[12]\b|SHUTTER|BEAM/i.test(line)) op.type = "power_change";
      else if (/M4[0-9]|GS\s*=/i.test(line)) op.type = "gas_change";

      const xm = line.match(/X\s*(-?\d+\.?\d*)/i);
      const ym = line.match(/Y\s*(-?\d+\.?\d*)/i);
      const zm = line.match(/Z\s*(-?\d+\.?\d*)/i);
      const im = line.match(/I\s*(-?\d+\.?\d*)/i);
      const jm = line.match(/J\s*(-?\d+\.?\d*)/i);
      const fm = line.match(/F\s*(-?\d+\.?\d*)/i);

      if (xm) op.x = parseFloat(xm[1]);
      if (ym) op.y = parseFloat(ym[1]);
      if (zm) op.z = parseFloat(zm[1]);
      if (im) op.i = parseFloat(im[1]);
      if (jm) op.j = parseFloat(jm[1]);
      if (fm) op.feed = parseFloat(fm[1]);

      ops.push(op);
    }

    return ops;
  }

  /**
   * Post-process laser cutting program.
   */
  postProcessLaser(input: SheetPostInput): SheetPostOutput {
    const controller = input.controller as "bystronic" | "trumpf";
    if (controller !== "bystronic" && controller !== "trumpf") {
      throw new Error(`LaserWaterjetPostExtension: controller '${input.controller}' is not a laser controller. Use 'bystronic' or 'trumpf'.`);
    }

    const dialect = LASER_DIALECTS[controller];
    const progNum = input.program_number ?? 1;
    const warnings: string[] = [];
    const ops = this.parseOperations(input.gcode);

    // Get laser conditions from material/thickness or use input overrides
    const condition = getLaserCondition(input.material, input.thickness_mm);
    const power = input.power_pct ?? condition.power_pct;
    const pierceStrategy = input.pierce_strategy ?? condition.pierce_strategy;
    const pierceDwell = input.pierce_dwell_s ?? condition.pierce_dwell_s;
    const gas = input.gas ?? condition.gas;
    const gasPressure = input.gas_pressure_bar ?? condition.gas_pressure_bar;
    const focusZ = input.focus_offset_mm ?? condition.focus_mm;
    const leadInR = input.lead_in_radius_mm ?? 2.0;

    const cuttingOps = ops.filter(o => o.type === "cut" && (o.x !== undefined || o.y !== undefined));
    const rapidOps = ops.filter(o => o.type === "rapid");

    if (cuttingOps.length === 0) {
      warnings.push("No cutting moves found in input G-code");
    }

    if (input.thickness_mm && input.thickness_mm > 25) {
      warnings.push(`Thickness ${input.thickness_mm}mm is near laser cutting limit — verify feasibility`);
    }

    const lines: string[] = [];

    // Program start
    lines.push(dialect.program_start(progNum));
    lines.push("");

    // Set gas and focus
    lines.push(dialect.gas_select(gas, gasPressure));
    lines.push(dialect.focus_set(focusZ));
    lines.push(dialect.power_on(power));
    lines.push("");

    // Count contours (a contour starts with a rapid + pierce)
    let pierceCount = 0;
    let cutMoves = 0;
    let estimatedLength = 0;
    let prevX: number | undefined;
    let prevY: number | undefined;

    // Process operations
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];

      if (op.type === "rapid" && (op.x !== undefined || op.y !== undefined)) {
        // Rapid to start of new contour
        lines.push(dialect.shutter_close);
        lines.push(`${dialect.rapid} ${dialect.coord(op.x, op.y)}`);

        // Check if next op is a cut — if so, pierce here
        const next = ops[i + 1];
        if (next && (next.type === "cut" || next.type === "pierce")) {
          lines.push(dialect.pierce(pierceStrategy, power, pierceDwell));
          lines.push(dialect.lead_in(leadInR));
          pierceCount++;
        }

        prevX = op.x;
        prevY = op.y;
      } else if (op.type === "cut") {
        const coordStr = dialect.coord(op.x, op.y);
        if (coordStr) {
          const feedStr = op.feed ? ` F${op.feed.toFixed(0)}` : "";
          lines.push(`${dialect.linear} ${coordStr}${feedStr}`);
          cutMoves++;

          if (prevX !== undefined && prevY !== undefined && op.x !== undefined && op.y !== undefined) {
            estimatedLength += Math.sqrt((op.x - prevX) ** 2 + (op.y - prevY) ** 2) / 1000;
          }
          prevX = op.x;
          prevY = op.y;
        }
      }
    }

    // Lead-out on last contour
    if (cutMoves > 0) {
      lines.push(dialect.lead_out(leadInR));
    }

    lines.push("");
    lines.push(dialect.program_end);

    const gcode = lines.join("\n");

    return {
      gcode,
      controller: input.controller,
      process_type: input.process_type ?? "laser_cut",
      operation_count: cuttingOps.length,
      warnings,
      stats: {
        total_lines: gcode.split("\n").length,
        cutting_moves: cutMoves,
        pierce_count: pierceCount,
        estimated_cut_length_m: estimatedLength > 0 ? estimatedLength : undefined,
      },
    };
  }

  /**
   * Post-process waterjet cutting program.
   */
  postProcessWaterjet(input: SheetPostInput): SheetPostOutput {
    const controller = input.controller as "omax" | "flow";
    if (controller !== "omax" && controller !== "flow") {
      throw new Error(`LaserWaterjetPostExtension: controller '${input.controller}' is not a waterjet controller. Use 'omax' or 'flow'.`);
    }

    const dialect = WATERJET_DIALECTS[controller];
    const progNum = input.program_number ?? 1;
    const quality = input.quality_level ?? 3;
    const abrasiveFlow = input.abrasive_flow_g_min ?? 340; // 340 g/min is typical for 80 mesh garnet
    const pumpPressure = input.pump_pressure_bar ?? 3800;
    const pierceStrategy: WaterjetPierceStrategy = (input.pierce_strategy as WaterjetPierceStrategy) ?? "stationary";
    const pierceDwell = input.pierce_dwell_s ?? 1.5;
    const warnings: string[] = [];
    const ops = this.parseOperations(input.gcode);

    const cuttingOps = ops.filter(o => o.type === "cut" && (o.x !== undefined || o.y !== undefined));

    if (cuttingOps.length === 0) {
      warnings.push("No cutting moves found in input G-code");
    }

    // Compute feed rate from quality level and material
    const baseSpeed = getWaterjetBaseSpeed(input.material);
    const speedPct = dialect.quality_speed_pct[quality];
    const thicknessScale = input.thickness_mm ? 25 / Math.max(input.thickness_mm, 1) : 1;
    const feedRate = Math.round(baseSpeed * (speedPct / 100) * Math.min(thicknessScale, 3));

    if (input.thickness_mm && input.thickness_mm > 150) {
      warnings.push(`Thickness ${input.thickness_mm}mm exceeds typical AWJ range — verify capability`);
    }

    const lines: string[] = [];

    // Program start
    lines.push(dialect.program_start(progNum));
    lines.push("");
    lines.push(`(QUALITY: Q${quality} | FEED: ${feedRate} MM/MIN | MATERIAL: ${input.material ?? "UNKNOWN"})`);
    lines.push(dialect.pressure_set(pumpPressure));
    lines.push("");

    let pierceCount = 0;
    let cutMoves = 0;
    let estimatedLength = 0;
    let prevX: number | undefined;
    let prevY: number | undefined;

    // Taper compensation if requested
    if (input.taper_angle_deg && input.taper_angle_deg > 0) {
      lines.push(dialect.taper_comp_on(input.taper_angle_deg));
    }

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];

      if (op.type === "rapid" && (op.x !== undefined || op.y !== undefined)) {
        // Rapid to new contour start
        if (cutMoves > 0) {
          // End previous contour
          lines.push(dialect.abrasive_off);
        }
        lines.push(`${dialect.rapid} ${dialect.coord(op.x, op.y)}`);

        // Pierce at start of new contour
        const next = ops[i + 1];
        if (next && next.type === "cut") {
          lines.push(dialect.pierce(pierceStrategy, pierceDwell));
          lines.push(dialect.abrasive_on(abrasiveFlow));
          pierceCount++;
        }

        prevX = op.x;
        prevY = op.y;
      } else if (op.type === "cut") {
        const coordStr = dialect.coord(op.x, op.y);
        if (coordStr) {
          lines.push(`${dialect.linear} ${coordStr} F${feedRate}`);
          cutMoves++;

          if (prevX !== undefined && prevY !== undefined && op.x !== undefined && op.y !== undefined) {
            estimatedLength += Math.sqrt((op.x - prevX) ** 2 + (op.y - prevY) ** 2) / 1000;
          }
          prevX = op.x;
          prevY = op.y;
        }
      }
    }

    // End last contour
    if (cutMoves > 0) {
      lines.push(dialect.abrasive_off);
    }

    if (input.taper_angle_deg && input.taper_angle_deg > 0) {
      lines.push(dialect.taper_comp_off);
    }

    lines.push("");
    lines.push(dialect.program_end);

    const gcode = lines.join("\n");

    return {
      gcode,
      controller: input.controller,
      process_type: "waterjet",
      operation_count: cuttingOps.length,
      warnings,
      stats: {
        total_lines: gcode.split("\n").length,
        cutting_moves: cutMoves,
        pierce_count: pierceCount,
        estimated_cut_length_m: estimatedLength > 0 ? estimatedLength : undefined,
      },
    };
  }

  /**
   * Full post-processing entry point.
   * Auto-detects process type and routes to appropriate handler.
   */
  postProcess(input: SheetPostInput): SheetPostOutput {
    if (!input.gcode || input.gcode.trim().length === 0) {
      throw new Error("LaserWaterjetPostExtension: gcode input is required");
    }
    if (!input.controller) {
      throw new Error("LaserWaterjetPostExtension: controller is required");
    }

    const processType = input.process_type ?? this.detectProcessType(input.gcode);

    if (processType === "waterjet") {
      return this.postProcessWaterjet(input);
    } else {
      return this.postProcessLaser(input);
    }
  }

  /**
   * List supported controllers with their capabilities.
   */
  listControllers(): { controller: SheetPostController; laser: boolean; waterjet: boolean }[] {
    return [
      { controller: "bystronic", laser: true, waterjet: false },
      { controller: "trumpf", laser: true, waterjet: false },
      { controller: "omax", laser: false, waterjet: true },
      { controller: "flow", laser: false, waterjet: true },
    ];
  }

  /**
   * Dispatcher execute method.
   */
  execute(action: string, input: Record<string, unknown>): SheetPostOutput | ReturnType<typeof this.listControllers> {
    switch (action) {
      case "ppg_laser_generate":
        return this.postProcess({ ...(input as unknown as SheetPostInput), process_type: "laser_cut" });
      case "ppg_waterjet_generate":
        return this.postProcess({ ...(input as unknown as SheetPostInput), process_type: "waterjet" });
      case "ppg_sheet_controllers":
        return this.listControllers();
      default:
        throw new Error(`LaserWaterjetPostExtension: unknown action '${action}'`);
    }
  }
}

export const laserWaterjetPostExtension = new LaserWaterjetPostExtensionImpl();
