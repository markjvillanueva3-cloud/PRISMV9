/**
 * MotionControllerInjectionEngine — POST-ULT-MS10 Pipeline Phase 3
 *
 * Injects controller-specific motion control codes into G-code programs:
 * HSM smoothing, TCP/TCPM, look-ahead, coolant, SSV, machine dynamics,
 * geometric compensation, and spindle warm-up routines.
 *
 * Consolidates MS10 U01-U08:
 *   U01 HSMCodeInjector        — smoothing codes per controller
 *   U02 TCPModeInjector         — 5-axis TCP activation
 *   U03 LookAheadOptimizer      — contour/feed-forward tuning
 *   U04 CoolantStrategyInjector — coolant M-codes per controller
 *   U05 SSVInjector             — spindle speed variation for chatter
 *   U06 MachineDynamicsAdapter  — jerk/accel profiles
 *   U07 GeometricCompensationInjector — backlash/thermal for precision
 *   U08 SpindleWarmupInjector   — block-delete warm-up routine
 *
 * Actions: inject_all, inject_hsm, inject_tcp, inject_coolant,
 *          inject_ssv, inject_warmup, get_codes_for_controller
 *
 * @version 1.0.0
 * @module MotionControllerInjectionEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ControllerType = "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma";

export type MachineClass =
  | "economy_vmc"
  | "standard_vmc"
  | "performance_vmc"
  | "high_speed_vmc"
  | "ultra_high_speed"
  | "hmc"
  | "5axis_trunnion"
  | "5axis_swivel"
  | "lathe"
  | "mill_turn"
  | "swiss";

export type OperationType = "roughing" | "finishing" | "semi_finishing" | "hsm" | "5axis";
export type CoolantType = "flood" | "mist" | "tsc" | "air" | "mql" | "none";
export type ChatterRisk = "low" | "medium" | "high";

export interface MachineOptions {
  hasHSMPackage: boolean;
  has5AxisPackage: boolean;
  hasSSV: boolean;
  hasTSC: boolean;
  hasProgrammableCoolant: boolean;
}

export interface OperationSpec {
  operation_type: OperationType;
  coolant: CoolantType;
  tolerance_mm?: number;
  is_5axis?: boolean;
  ssv_recommended?: boolean;
  chatter_risk?: ChatterRisk;
}

export interface MotionInjectionInput {
  gcode: string;
  controller: ControllerType;
  controller_variant?: string;
  machine_options: MachineOptions;
  machine_class?: MachineClass;
  operations: OperationSpec[];
  enable_warmup?: boolean;
  precision_mode?: boolean;
}

export interface Injection {
  type: "hsm" | "tcp" | "look_ahead" | "coolant" | "ssv" | "dynamics" | "geometric_comp" | "warmup";
  line_number: number;
  code_inserted: string;
  explanation: string;
  tier_required: 2 | 3;
}

export interface MotionInjectionResult {
  injected_gcode: string;
  injections: Injection[];
  codes_added: string[];
  codes_explanation: Record<string, string>;
}

/** Input for inject_thermal_compensate: pre-computed compensation offsets to apply
 *  at program start as an additive work-offset shift. Caller is expected to have
 *  obtained `compensation` from a thermal-error model (e.g. MachineGeometricAccuracy
 *  Engine.thermalErrorModel). Sign convention: positive dx loads X work-offset by +dx,
 *  shifting subsequent X moves by that amount on the machine. */
export interface ThermalCompensationInput {
  controller: ControllerType;
  gcode: string;
  compensation: { dx: number; dy: number; dz: number }; // mm
  wcs_code?: "G54" | "G55" | "G56" | "G57" | "G58" | "G59";
  insertion_line?: number; // 0-based line index to insert before (default 1 = after program header)
}

export interface ControllerCodeMap {
  controller: ControllerType;
  hsm_codes: string[];
  tcp_codes: string[];
  coolant_codes: Record<string, string[]>;
  ssv_codes: string[];
  look_ahead_codes: string[];
}

// ============================================================================
// CONTROLLER CODE DATABASES
// ============================================================================

/** HSM smoothing code database keyed by controller. */
const HSM_CODES: Record<ControllerType, Record<OperationType, string[]>> = {
  haas: {
    roughing:      ["G187 P1 E0.01 (HSM ROUGH - MIN SMOOTHING)"],
    semi_finishing: ["G187 P2 E0.005 (HSM MEDIUM SMOOTHING)"],
    finishing:     ["G187 P3 E0.001 (HSM FINISH - MAX SMOOTHING)"],
    hsm:           ["G187 P3 E0.001 (HSM FINISH - MAX SMOOTHING)"],
    "5axis":       ["G187 P3 E0.002 (HSM 5-AXIS SMOOTHING)"],
  },
  siemens: {
    roughing:      ["CYCLE832(0.05,_ROUGH) ;ADVANCED SURFACE ROUGH"],
    semi_finishing: ["CYCLE832(0.02,_SEMI) ;ADVANCED SURFACE SEMI"],
    finishing:     ["CYCLE832(0.005,_FINISH) ;ADVANCED SURFACE FINISH"],
    hsm:           ["CYCLE832(0.005,_FINISH) ;ADVANCED SURFACE HSM"],
    "5axis":       ["CYCLE832(0.008,_FINISH) ;ADVANCED SURFACE 5AX"],
  },
  fanuc: {
    roughing:      ["G5.1 Q1 (AICC ON - ROUGH)", "G05.1 Q1 R10. (NANO SMOOTHING)"],
    semi_finishing: ["G5.1 Q1 (AICC ON - SEMI)", "G05.1 Q1 R5. (NANO SMOOTHING)"],
    finishing:     ["G5.1 Q1 (AICC ON - FINISH)", "G05.1 Q1 R1. (NANO SMOOTHING)"],
    hsm:           ["G5.1 Q1 (AICC ON - HSM)", "G05.1 Q1 R1. (NANO SMOOTHING)"],
    "5axis":       ["G5.1 Q1 (AICC ON - 5AX)", "G05.1 Q1 R2. (NANO SMOOTHING)"],
  },
  heidenhain: {
    roughing:      ["CYCLE32 0.05 ;TOLERANCE ROUGH", "M120 LA30 ;LOOK-AHEAD 30 BLOCKS"],
    semi_finishing: ["CYCLE32 0.02 ;TOLERANCE SEMI", "M120 LA50 ;LOOK-AHEAD 50 BLOCKS"],
    finishing:     ["CYCLE32 0.005 ;TOLERANCE FINISH", "M120 LA100 ;LOOK-AHEAD 100 BLOCKS"],
    hsm:           ["CYCLE32 0.005 ;TOLERANCE HSM", "M120 LA150 ;LOOK-AHEAD 150 BLOCKS"],
    "5axis":       ["CYCLE32 0.008 ;TOLERANCE 5AX", "M120 LA100 ;LOOK-AHEAD 100 BLOCKS"],
  },
  mazak: {
    roughing:      ["G5.1 Q1 (SMOOTH AI - ROUGH)"],
    semi_finishing: ["G5.1 Q1 (SMOOTH AI - SEMI)"],
    finishing:     ["G5.1 Q1 (SMOOTH AI - FINISH)"],
    hsm:           ["G5.1 Q1 (SMOOTH AI - HSM)"],
    "5axis":       ["G5.1 Q1 (SMOOTH AI - 5AX)"],
  },
  okuma: {
    roughing:      ["G08 P1 (HPCC ON - ROUGH)"],
    semi_finishing: ["G08 P1 (HPCC ON - SEMI)"],
    finishing:     ["G08 P1 (HPCC ON - FINISH)"],
    hsm:           ["G08 P1 (HPCC ON - HSM)"],
    "5axis":       ["G08 P1 (HPCC ON - 5AX)"],
  },
};

/** HSM deactivation codes. */
const HSM_OFF_CODES: Record<ControllerType, string[]> = {
  haas:       [],
  siemens:    ["CYCLE832() ;HSM OFF"],
  fanuc:      ["G5.1 Q0 (AICC OFF)"],
  heidenhain: ["M120 ;LOOK-AHEAD OFF"],
  mazak:      ["G5.1 Q0 (SMOOTH AI OFF)"],
  okuma:      ["G08 P0 (HPCC OFF)"],
};

/** TCP/TCPM activation codes for 5-axis. */
const TCP_ON_CODES: Record<ControllerType, string[]> = {
  haas:       ["G234 (TCP ON)", "G254 (DWO ON)"],
  siemens:    ["TRAORI (TCP ON)", "CYCLE800()"],
  fanuc:      ["G43.4 H0 (TCP ON)"],
  heidenhain: ["FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS"],
  mazak:      ["G43.4 P1 (TCP ON)"],
  okuma:      ["G169 R1 (TCP ON)"],
};

/** TCP/TCPM deactivation codes. */
const TCP_OFF_CODES: Record<ControllerType, string[]> = {
  haas:       ["G235 (TCP OFF)", "G255 (DWO OFF)"],
  siemens:    ["TRAFOOF (TCP OFF)"],
  fanuc:      ["G49 (TCP OFF)"],
  heidenhain: ["FUNCTION RESET TCPM"],
  mazak:      ["G49 (TCP OFF)"],
  okuma:      ["G169 R0 (TCP OFF)"],
};

/** Look-ahead / contour optimization codes. */
const LOOK_AHEAD_CODES: Record<ControllerType, { on: string[]; off: string[] }> = {
  haas: {
    on:  ["(HAAS: LOOK-AHEAD VIA G187 - SEE HSM CODES)"],
    off: [],
  },
  siemens: {
    on:  ["COMPON ;CONTOUR COMPRESSION ON", "FFWON ;FEED-FORWARD ON"],
    off: ["COMPOF ;CONTOUR COMPRESSION OFF", "FFWOF ;FEED-FORWARD OFF"],
  },
  fanuc: {
    on:  ["G05 P10000 (FINE CONTOUR ON)"],
    off: ["G05 P0 (FINE CONTOUR OFF)"],
  },
  heidenhain: {
    on:  ["M120 LA100 ;LOOK-AHEAD 100 BLOCKS"],
    off: ["M120 ;LOOK-AHEAD OFF"],
  },
  mazak: {
    on:  ["G05.1 Q1 (HIGH-SPEED MACHINING ON)"],
    off: ["G05.1 Q0 (HIGH-SPEED MACHINING OFF)"],
  },
  okuma: {
    on:  ["G08 P1 (HIGH-PRECISION CONTOUR CONTROL ON)"],
    off: ["G08 P0 (HIGH-PRECISION CONTOUR CONTROL OFF)"],
  },
};

/** Coolant codes per controller and coolant type. */
const COOLANT_CODES: Record<ControllerType, Record<CoolantType, { on: string[]; off: string[] }>> = {
  haas: {
    flood: { on: ["M8 (FLOOD ON)"],  off: ["M9 (COOLANT OFF)"] },
    mist:  { on: ["M7 (MIST ON)"],   off: ["M9 (COOLANT OFF)"] },
    tsc:   { on: ["M88 (TSC ON)"],   off: ["M89 (TSC OFF)"] },
    air:   { on: ["M83 (AIR BLAST ON)"], off: ["M9 (COOLANT OFF)"] },
    mql:   { on: ["M7 (MQL ON)"],    off: ["M9 (COOLANT OFF)"] },
    none:  { on: [],                   off: [] },
  },
  siemens: {
    flood: { on: ["M8 ;FLOOD ON"],   off: ["M9 ;COOLANT OFF"] },
    mist:  { on: ["M7 ;MIST ON"],    off: ["M9 ;COOLANT OFF"] },
    tsc:   { on: ["M8 ;TSC ON (CHECK OEM M-CODE)"], off: ["M9 ;COOLANT OFF"] },
    air:   { on: ["M7 ;AIR BLAST"],  off: ["M9 ;COOLANT OFF"] },
    mql:   { on: ["M7 ;MQL ON"],     off: ["M9 ;COOLANT OFF"] },
    none:  { on: [],                   off: [] },
  },
  fanuc: {
    flood: { on: ["M8 (FLOOD ON)"],  off: ["M9 (COOLANT OFF)"] },
    mist:  { on: ["M7 (MIST ON)"],   off: ["M9 (COOLANT OFF)"] },
    tsc:   { on: ["M8 (TSC ON)"],    off: ["M9 (COOLANT OFF)"] },
    air:   { on: ["M7 (AIR BLAST)"], off: ["M9 (COOLANT OFF)"] },
    mql:   { on: ["M7 (MQL ON)"],    off: ["M9 (COOLANT OFF)"] },
    none:  { on: [],                   off: [] },
  },
  heidenhain: {
    flood: { on: ["M8 ;FLOOD ON"],   off: ["M9 ;COOLANT OFF"] },
    mist:  { on: ["M7 ;MIST ON"],    off: ["M9 ;COOLANT OFF"] },
    tsc:   { on: ["M8 ;TSC ON"],     off: ["M9 ;COOLANT OFF"] },
    air:   { on: ["M7 ;AIR BLAST"],  off: ["M9 ;COOLANT OFF"] },
    mql:   { on: ["M7 ;MQL ON"],     off: ["M9 ;COOLANT OFF"] },
    none:  { on: [],                   off: [] },
  },
  mazak: {
    flood: { on: ["M8 (FLOOD ON)"],  off: ["M9 (COOLANT OFF)"] },
    mist:  { on: ["M7 (MIST ON)"],   off: ["M9 (COOLANT OFF)"] },
    tsc:   { on: ["M51 (TSC ON)"],   off: ["M09 (TSC OFF)"] },
    air:   { on: ["M7 (AIR BLAST)"], off: ["M9 (COOLANT OFF)"] },
    mql:   { on: ["M7 (MQL ON)"],    off: ["M9 (COOLANT OFF)"] },
    none:  { on: [],                   off: [] },
  },
  okuma: {
    flood: { on: ["M8 (FLOOD ON)"],  off: ["M9 (COOLANT OFF)"] },
    mist:  { on: ["M7 (MIST ON)"],   off: ["M9 (COOLANT OFF)"] },
    tsc:   { on: ["M50 (TSC ON)"],   off: ["M51 (TSC OFF)"] },
    air:   { on: ["M7 (AIR BLAST)"], off: ["M9 (COOLANT OFF)"] },
    mql:   { on: ["M7 (MQL ON)"],    off: ["M9 (COOLANT OFF)"] },
    none:  { on: [],                   off: [] },
  },
};

/** SSV (Spindle Speed Variation) codes. */
const SSV_CODES: Record<ControllerType, { on: string[]; off: string[] } | null> = {
  haas:       { on: ["M138 (SSV ON)"],  off: ["M139 (SSV OFF)"] },
  siemens:    null,
  fanuc:      null,
  heidenhain: null,
  mazak:      null,
  okuma:      { on: ["M695 (SSV ON)"],  off: ["M694 (SSV OFF)"] },
};

/** Machine dynamics profiles: accel in g, jerk in m/s^3. */
const DYNAMICS_PROFILES: Record<string, { accel_g: number; jerk_ms3: number; max_feed_mmmin: number; description: string }> = {
  economy_vmc:       { accel_g: 0.3, jerk_ms3: 5,   max_feed_mmmin: 12000,  description: "Economy VMC - conservative dynamics" },
  standard_vmc:      { accel_g: 0.5, jerk_ms3: 10,  max_feed_mmmin: 20000,  description: "Standard VMC - balanced dynamics" },
  performance_vmc:   { accel_g: 0.8, jerk_ms3: 20,  max_feed_mmmin: 36000,  description: "Performance VMC - aggressive dynamics" },
  high_speed_vmc:    { accel_g: 1.2, jerk_ms3: 40,  max_feed_mmmin: 50000,  description: "High-Speed VMC - HSM dynamics" },
  ultra_high_speed:  { accel_g: 2.0, jerk_ms3: 80,  max_feed_mmmin: 80000,  description: "Ultra High-Speed - maximum dynamics" },
  hmc:               { accel_g: 0.6, jerk_ms3: 15,  max_feed_mmmin: 30000,  description: "HMC - production dynamics" },
  "5axis_trunnion":  { accel_g: 0.5, jerk_ms3: 12,  max_feed_mmmin: 24000,  description: "5-Axis Trunnion - moderate dynamics" },
  "5axis_swivel":    { accel_g: 0.6, jerk_ms3: 15,  max_feed_mmmin: 30000,  description: "5-Axis Swivel - moderate dynamics" },
  lathe:             { accel_g: 0.4, jerk_ms3: 8,   max_feed_mmmin: 15000,  description: "Lathe - turning dynamics" },
  mill_turn:         { accel_g: 0.5, jerk_ms3: 10,  max_feed_mmmin: 20000,  description: "Mill-Turn - hybrid dynamics" },
  swiss:             { accel_g: 0.3, jerk_ms3: 5,   max_feed_mmmin: 10000,  description: "Swiss - precision dynamics" },
};

// ============================================================================
// CODE EXPLANATION DATABASE
// ============================================================================

const CODE_EXPLANATIONS: Record<string, string> = {
  // Haas HSM
  "G187": "Haas HSM smoothing control — P sets corner rounding (1=rough, 2=medium, 3=finish), E sets tolerance",
  "G187 P1": "Haas rough HSM — minimum smoothing, fastest cornering, 0.01mm tolerance",
  "G187 P2": "Haas medium HSM — balanced smoothing, 0.005mm tolerance",
  "G187 P3": "Haas finish HSM — maximum smoothing for best surface finish, 0.001mm tolerance",
  // Haas TCP
  "G234": "Haas TCP (Tool Center Point) ON — maintains tool tip position during 5-axis rotation",
  "G235": "Haas TCP OFF",
  "G254": "Haas DWO (Dynamic Work Offsets) ON — real-time work offset compensation for 5-axis",
  "G255": "Haas DWO OFF",
  // Haas SSV
  "M138": "Haas SSV (Spindle Speed Variation) ON — varies RPM to suppress chatter harmonics",
  "M139": "Haas SSV OFF",
  // Haas coolant
  "M88":  "Haas TSC (Through-Spindle Coolant) ON",
  "M89":  "Haas TSC OFF",
  "M83":  "Haas air blast ON",
  // Siemens HSM
  "CYCLE832": "Siemens Advanced Surface — sets tolerance and mode (_ROUGH/_SEMI/_FINISH) for surface quality",
  "COMPON":   "Siemens contour compression ON — reduces block processing time with polynomial interpolation",
  "COMPOF":   "Siemens contour compression OFF",
  "COMPCURV": "Siemens compressor with curvature — maintains C2 continuity at transitions",
  "FFWON":    "Siemens feed-forward ON — reduces contour error at high feed rates by pre-compensating servo lag",
  "FFWOF":    "Siemens feed-forward OFF",
  "TRAORI":   "Siemens 5-axis transformation ON (TCP/RTCP)",
  "TRAFOOF":  "Siemens 5-axis transformation OFF",
  "CYCLE800": "Siemens swivel data cycle — planes/frames in 5-axis indexing",
  // Fanuc
  "G5.1 Q1":  "Fanuc AICC (AI Contour Control) ON — smooths contour by predicting servo response",
  "G5.1 Q0":  "Fanuc AICC OFF",
  "G05.1 Q1": "Fanuc Nano Smoothing — spline interpolation for HSM surface quality; R=tolerance",
  "G43.4":    "Fanuc 5-axis TCP (Tool Center Point) ON",
  "G49":      "Fanuc tool length compensation / TCP cancel",
  "G05 P10000": "Fanuc fine contour control ON — high-speed high-precision machining",
  // Heidenhain
  "CYCLE32":  "Heidenhain tolerance cycle — sets path tolerance for HSM contour accuracy",
  "M120":     "Heidenhain look-ahead — LA parameter sets number of blocks to pre-read",
  "FUNCTION TCPM": "Heidenhain TCPM (Tool Center Point Management) — maintains tool tip in 5-axis",
  "M128":     "Heidenhain legacy TCPM ON",
  // Mazak
  "G5.1 Q1 (SMOOTH)": "Mazak SmoothAi — AI-based smoothing for surface quality optimization",
  "G43.4 P1": "Mazak TCP ON for 5-axis simultaneous machining",
  "M51":      "Mazak TSC ON (Through-Spindle Coolant)",
  // Okuma
  "G08 P1":  "Okuma HPCC (High-Precision Contour Control) ON — reduces servo lag for HSM",
  "G08 P0":  "Okuma HPCC OFF",
  "G169 R1": "Okuma TCP ON — tool center point control for 5-axis",
  "G169 R0": "Okuma TCP OFF",
  "M695":    "Okuma SSV (Spindle Speed Variation) ON",
  "M694":    "Okuma SSV OFF",
  "M50":     "Okuma TSC ON",
  // Common
  "M7":  "Mist coolant ON",
  "M8":  "Flood coolant ON",
  "M9":  "Coolant OFF (all types)",
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/** Find the line index of the first tool change (T or M6) in the gcode lines array. */
function findFirstToolChangeLine(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase().trim();
    if (/^T\d/.test(upper) || upper.includes("M6") || upper.includes("M06")) {
      return i;
    }
  }
  return -1;
}

/** Find the line index of the first motion block (G0/G1/G2/G3). */
function findFirstMotionLine(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase().trim();
    if (/G0[0-3]?\s/.test(upper) || /^G[0-3]\s/.test(upper) ||
        /G0[0-3]$/.test(upper)   || /^G[0-3]$/.test(upper)) {
      return i;
    }
  }
  return Math.min(10, lines.length - 1);
}

/** Find the program end line (M30, M2, %). */
function findProgramEndLine(lines: string[]): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const upper = lines[i].toUpperCase().trim();
    if (upper === "M30" || upper === "M2" || upper === "M02" || upper === "%") {
      return i;
    }
  }
  return lines.length - 1;
}

/** Find all spindle-start lines (M3/M4 with S-word). */
function findSpindleStartLines(lines: string[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase().trim();
    if ((upper.includes("M3") || upper.includes("M03") ||
         upper.includes("M4") || upper.includes("M04")) &&
        upper.includes("S")) {
      result.push(i);
    }
  }
  return result;
}

/** Insert lines into an array at a given index, returning new array. */
function insertLines(lines: string[], index: number, newLines: string[]): string[] {
  const result = [...lines];
  result.splice(index, 0, ...newLines);
  return result;
}

/** Determine the primary operation type from the operations list. */
function primaryOpType(ops: OperationSpec[]): OperationType {
  if (ops.length === 0) return "roughing";
  // Prefer the most demanding type
  const priority: OperationType[] = ["5axis", "hsm", "finishing", "semi_finishing", "roughing"];
  for (const p of priority) {
    if (ops.some(o => o.operation_type === p)) return p;
  }
  return ops[0].operation_type;
}

/** Check if any operation is 5-axis. */
function has5AxisOps(ops: OperationSpec[]): boolean {
  return ops.some(o => o.is_5axis || o.operation_type === "5axis");
}

/** Check if SSV is recommended for any operation. */
function needsSSV(ops: OperationSpec[]): boolean {
  return ops.some(o => o.ssv_recommended || o.chatter_risk === "high");
}

/** Get the tightest tolerance across all operations. */
function tightestTolerance(ops: OperationSpec[]): number | undefined {
  const tolerances = ops.filter(o => o.tolerance_mm !== undefined).map(o => o.tolerance_mm!);
  return tolerances.length > 0 ? Math.min(...tolerances) : undefined;
}

/** Get the primary coolant from the first operation. */
function primaryCoolant(ops: OperationSpec[]): CoolantType {
  if (ops.length === 0) return "flood";
  return ops[0].coolant;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Motion Controller Injection Engine.
 * Injects controller-specific HSM codes, smoothing, TCP, SSV, and machine dynamics
 * into raw G-code programs.
 */
// --- Thermal compensation per-controller formatters (U-DEA-november-P01) ---
// G10 L20 = ADD values to the current work offset on Fanuc 30i+/Haas/Mazak/Okuma
//   (vs G10 L2 which OVERWRITES). Source: Fanuc Series 30i Operator's Manual,
//   Sandvik post-processor reference, Haas G10 reference.
// Siemens uses additive $P_UIFR settable-frame translation; Heidenhain uses
// the TRANS datum-shift in conversational TNC.
function fmtComp(n: number): string { return Number.isFinite(n) ? n.toFixed(4) : "0.0000"; }
function wcsToP(wcs: string): number {
  const idx = ["G54", "G55", "G56", "G57", "G58", "G59"].indexOf(wcs);
  return idx >= 0 ? idx + 1 : 1;
}
function wcsIdxSiemens(wcs: string): number {
  const idx = ["G54", "G55", "G56", "G57", "G58", "G59"].indexOf(wcs);
  return idx >= 0 ? idx + 1 : 1;
}
const THERMAL_COMP_FORMAT: Record<ControllerType, (wcs: string, dx: number, dy: number, dz: number) => string[]> = {
  fanuc:      (wcs, dx, dy, dz) => [`G10 L20 P${wcsToP(wcs)} X${fmtComp(dx)} Y${fmtComp(dy)} Z${fmtComp(dz)} (THERMAL COMP ADD)`],
  haas:       (wcs, dx, dy, dz) => [`G10 L20 P${wcsToP(wcs)} X${fmtComp(dx)} Y${fmtComp(dy)} Z${fmtComp(dz)} (THERMAL COMP ADD)`],
  mazak:      (wcs, dx, dy, dz) => [`G10 L20 P${wcsToP(wcs)} X${fmtComp(dx)} Y${fmtComp(dy)} Z${fmtComp(dz)} (THERMAL COMP ADD)`],
  okuma:      (wcs, dx, dy, dz) => [`G10 L20 P${wcsToP(wcs)} X${fmtComp(dx)} Y${fmtComp(dy)} Z${fmtComp(dz)} (THERMAL COMP ADD)`],
  siemens:    (wcs, dx, dy, dz) => {
    const i = wcsIdxSiemens(wcs);
    return [
      `$P_UIFR[${i},X,TR]=$P_UIFR[${i},X,TR]+${fmtComp(dx)} ;THERMAL`,
      `$P_UIFR[${i},Y,TR]=$P_UIFR[${i},Y,TR]+${fmtComp(dy)}`,
      `$P_UIFR[${i},Z,TR]=$P_UIFR[${i},Z,TR]+${fmtComp(dz)}`,
    ];
  },
  heidenhain: (_w, dx, dy, dz) => [`TRANS X${fmtComp(dx)} Y${fmtComp(dy)} Z${fmtComp(dz)} ;THERMAL COMP`],
};

export class MotionControllerInjectionEngine {

  // --------------------------------------------------------------------------
  // U01: HSM Code Injector
  // --------------------------------------------------------------------------

  /** Inject HSM smoothing codes for the target controller.
   * @param input - motion injection input
   * @returns injection result with HSM codes added
   */
  inject_hsm(input: MotionInjectionInput): MotionInjectionResult {
    const { controller, machine_options, operations } = input;
    let lines = input.gcode.split("\n");
    const injections: Injection[] = [];
    const codesAdded: string[] = [];
    const explanations: Record<string, string> = {};

    if (!machine_options.hasHSMPackage) {
      log.info("[MotionControllerInjectionEngine] HSM package not available — skipping HSM injection");
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    const opType = primaryOpType(operations);
    const hsmOn = HSM_CODES[controller]?.[opType];
    const hsmOff = HSM_OFF_CODES[controller] ?? [];

    if (!hsmOn || hsmOn.length === 0) {
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    // Insert HSM-on after first tool change (or near program start)
    let insertIdx = findFirstToolChangeLine(lines);
    if (insertIdx < 0) insertIdx = findFirstMotionLine(lines);
    insertIdx = Math.max(0, insertIdx);

    const hsmHeader = [`(--- HSM SMOOTHING: ${controller.toUpperCase()} ${opType.toUpperCase()} ---)`];
    const hsmBlock = [...hsmHeader, ...hsmOn];
    lines = insertLines(lines, insertIdx + 1, hsmBlock);

    for (const code of hsmOn) {
      injections.push({
        type: "hsm",
        line_number: insertIdx + 1,
        code_inserted: code,
        explanation: `HSM smoothing for ${controller} ${opType}`,
        tier_required: 2,
      });
      codesAdded.push(code);
      this._addExplanations(code, explanations);
    }

    // Insert HSM-off before program end
    if (hsmOff.length > 0) {
      const endIdx = findProgramEndLine(lines);
      const offBlock = [`(--- HSM OFF ---)`, ...hsmOff];
      lines = insertLines(lines, endIdx, offBlock);
      for (const code of hsmOff) {
        injections.push({
          type: "hsm",
          line_number: endIdx,
          code_inserted: code,
          explanation: `HSM deactivation for ${controller}`,
          tier_required: 2,
        });
        codesAdded.push(code);
        this._addExplanations(code, explanations);
      }
    }

    return this._buildResult(lines, injections, codesAdded, explanations);
  }

  // --------------------------------------------------------------------------
  // U02: TCP Mode Injector
  // --------------------------------------------------------------------------

  /** Inject 5-axis TCP/TCPM codes.
   * @param input - motion injection input
   * @returns injection result with TCP codes added
   */
  inject_tcp(input: MotionInjectionInput): MotionInjectionResult {
    const { controller, machine_options, operations } = input;
    let lines = input.gcode.split("\n");
    const injections: Injection[] = [];
    const codesAdded: string[] = [];
    const explanations: Record<string, string> = {};

    if (!machine_options.has5AxisPackage || !has5AxisOps(operations)) {
      log.info("[MotionControllerInjectionEngine] No 5-axis package or no 5-axis ops — skipping TCP injection");
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    const tcpOn = TCP_ON_CODES[controller] ?? [];
    const tcpOff = TCP_OFF_CODES[controller] ?? [];

    if (tcpOn.length === 0) {
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    // Insert TCP-on before first motion block
    let insertIdx = findFirstToolChangeLine(lines);
    if (insertIdx < 0) insertIdx = findFirstMotionLine(lines);
    insertIdx = Math.max(0, insertIdx);

    const tcpHeader = [`(--- 5-AXIS TCP: ${controller.toUpperCase()} ---)`];
    const tcpBlock = [...tcpHeader, ...tcpOn];
    lines = insertLines(lines, insertIdx + 1, tcpBlock);

    for (const code of tcpOn) {
      injections.push({
        type: "tcp",
        line_number: insertIdx + 1,
        code_inserted: code,
        explanation: `5-axis TCP activation for ${controller}`,
        tier_required: 3,
      });
      codesAdded.push(code);
      this._addExplanations(code, explanations);
    }

    // Insert TCP-off before program end
    if (tcpOff.length > 0) {
      const endIdx = findProgramEndLine(lines);
      const offBlock = [`(--- TCP OFF ---)`, ...tcpOff];
      lines = insertLines(lines, endIdx, offBlock);
      for (const code of tcpOff) {
        injections.push({
          type: "tcp",
          line_number: endIdx,
          code_inserted: code,
          explanation: `TCP deactivation for ${controller}`,
          tier_required: 3,
        });
        codesAdded.push(code);
        this._addExplanations(code, explanations);
      }
    }

    return this._buildResult(lines, injections, codesAdded, explanations);
  }

  // --------------------------------------------------------------------------
  // U03: Look-Ahead Optimizer
  // --------------------------------------------------------------------------

  /** Inject look-ahead and contour optimization codes.
   * @param input - motion injection input
   * @returns injection result with look-ahead codes
   */
  private _injectLookAhead(input: MotionInjectionInput, lines: string[], injections: Injection[], codesAdded: string[], explanations: Record<string, string>): string[] {
    const { controller, machine_options } = input;

    if (!machine_options.hasHSMPackage) return lines;

    const la = LOOK_AHEAD_CODES[controller];
    if (!la || la.on.length === 0) return lines;

    // Skip if look-ahead is already covered by HSM codes (Haas)
    if (controller === "haas") return lines;

    let insertIdx = findFirstToolChangeLine(lines);
    if (insertIdx < 0) insertIdx = findFirstMotionLine(lines);
    insertIdx = Math.max(0, insertIdx);

    const laHeader = [`(--- LOOK-AHEAD / CONTOUR OPT: ${controller.toUpperCase()} ---)`];
    const laBlock = [...laHeader, ...la.on];
    lines = insertLines(lines, insertIdx + 1, laBlock);

    for (const code of la.on) {
      injections.push({
        type: "look_ahead",
        line_number: insertIdx + 1,
        code_inserted: code,
        explanation: `Look-ahead/contour optimization for ${controller}`,
        tier_required: 2,
      });
      codesAdded.push(code);
      this._addExplanations(code, explanations);
    }

    // Deactivation
    if (la.off.length > 0) {
      const endIdx = findProgramEndLine(lines);
      const offBlock = [`(--- LOOK-AHEAD OFF ---)`, ...la.off];
      lines = insertLines(lines, endIdx, offBlock);
      for (const code of la.off) {
        injections.push({
          type: "look_ahead",
          line_number: endIdx,
          code_inserted: code,
          explanation: `Look-ahead deactivation for ${controller}`,
          tier_required: 2,
        });
        codesAdded.push(code);
        this._addExplanations(code, explanations);
      }
    }

    return lines;
  }

  // --------------------------------------------------------------------------
  // U04: Coolant Strategy Injector
  // --------------------------------------------------------------------------

  /** Inject coolant M-codes per controller and coolant type.
   * @param input - motion injection input
   * @returns injection result with coolant codes
   */
  inject_coolant(input: MotionInjectionInput): MotionInjectionResult {
    const { controller, machine_options, operations } = input;
    let lines = input.gcode.split("\n");
    const injections: Injection[] = [];
    const codesAdded: string[] = [];
    const explanations: Record<string, string> = {};

    const coolant = primaryCoolant(operations);
    if (coolant === "none") {
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    // Validate TSC capability
    if (coolant === "tsc" && !machine_options.hasTSC) {
      log.warn("[MotionControllerInjectionEngine] TSC requested but machine does not have TSC — falling back to flood");
      return this._injectCoolantType(lines, controller, "flood", machine_options, injections, codesAdded, explanations);
    }

    return this._injectCoolantType(lines, controller, coolant, machine_options, injections, codesAdded, explanations);
  }

  /** Internal: inject a specific coolant type. */
  private _injectCoolantType(
    lines: string[], controller: ControllerType, coolant: CoolantType,
    machineOptions: MachineOptions,
    injections: Injection[], codesAdded: string[], explanations: Record<string, string>,
  ): MotionInjectionResult {
    const cc = COOLANT_CODES[controller]?.[coolant];
    if (!cc || cc.on.length === 0) {
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    // Insert coolant-on after spindle start, or before first motion
    const spindleLines = findSpindleStartLines(lines);
    let insertIdx: number;
    if (spindleLines.length > 0) {
      insertIdx = spindleLines[0] + 1;
    } else {
      insertIdx = findFirstMotionLine(lines);
    }

    const coolantHeader = [`(--- COOLANT: ${coolant.toUpperCase()} ---)`];
    const coolantBlock = [...coolantHeader, ...cc.on];

    // Add programmable coolant pressure if available
    if (machineOptions.hasProgrammableCoolant && (coolant === "tsc" || coolant === "flood")) {
      const pressureComment = coolant === "tsc"
        ? "(PROGRAMMABLE COOLANT: SET PRESSURE PER OEM MACRO)"
        : "(PROGRAMMABLE COOLANT: AVAILABLE - SET PRESSURE AS NEEDED)";
      coolantBlock.push(pressureComment);
    }

    lines = insertLines(lines, insertIdx, coolantBlock);

    for (const code of cc.on) {
      injections.push({
        type: "coolant",
        line_number: insertIdx,
        code_inserted: code,
        explanation: `${coolant} coolant activation for ${controller}`,
        tier_required: 2,
      });
      codesAdded.push(code);
      this._addExplanations(code, explanations);
    }

    // Insert coolant-off before program end
    if (cc.off.length > 0) {
      const endIdx = findProgramEndLine(lines);
      const offBlock = [`(--- COOLANT OFF ---)`, ...cc.off];
      lines = insertLines(lines, endIdx, offBlock);
      for (const code of cc.off) {
        injections.push({
          type: "coolant",
          line_number: endIdx,
          code_inserted: code,
          explanation: `Coolant deactivation for ${controller}`,
          tier_required: 2,
        });
        codesAdded.push(code);
        this._addExplanations(code, explanations);
      }
    }

    return this._buildResult(lines, injections, codesAdded, explanations);
  }

  // --------------------------------------------------------------------------
  // U05: SSV Injector
  // --------------------------------------------------------------------------

  /** Inject SSV (Spindle Speed Variation) codes for chatter suppression.
   * @param input - motion injection input
   * @returns injection result with SSV codes
   */
  inject_ssv(input: MotionInjectionInput): MotionInjectionResult {
    const { controller, machine_options, operations } = input;
    let lines = input.gcode.split("\n");
    const injections: Injection[] = [];
    const codesAdded: string[] = [];
    const explanations: Record<string, string> = {};

    if (!machine_options.hasSSV) {
      log.info("[MotionControllerInjectionEngine] SSV not available on this machine — skipping");
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    if (!needsSSV(operations)) {
      log.info("[MotionControllerInjectionEngine] No operations recommend SSV — skipping");
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    const ssv = SSV_CODES[controller];
    if (!ssv) {
      log.info(`[MotionControllerInjectionEngine] SSV not supported on ${controller} controller`);
      // Still emit a comment-based recommendation
      const motionIdx = findFirstMotionLine(lines);
      const comment = `(SSV RECOMMENDED FOR CHATTER SUPPRESSION - NOT NATIVELY SUPPORTED ON ${controller.toUpperCase()})`;
      lines = insertLines(lines, motionIdx, [comment]);
      injections.push({
        type: "ssv",
        line_number: motionIdx,
        code_inserted: comment,
        explanation: `SSV recommendation — ${controller} lacks native SSV M-code`,
        tier_required: 3,
      });
      codesAdded.push(comment);
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    // Insert SSV-on before the cutting section
    const spindleLines = findSpindleStartLines(lines);
    let insertIdx: number;
    if (spindleLines.length > 0) {
      insertIdx = spindleLines[0] + 1;
    } else {
      insertIdx = findFirstMotionLine(lines);
    }

    // Calculate SSV variation range based on chatter risk
    const maxChatter = operations.reduce((max, o) => {
      const rank: Record<ChatterRisk, number> = { low: 1, medium: 2, high: 3 };
      const r = o.chatter_risk ? rank[o.chatter_risk] : 0;
      return r > max ? r : max;
    }, 0);
    const variationPct = maxChatter >= 3 ? 10 : maxChatter >= 2 ? 5 : 3;

    const ssvHeader = [
      `(--- SSV: SPINDLE SPEED VARIATION ${variationPct}% ---)`,
      `(CHATTER RISK: ${maxChatter >= 3 ? "HIGH" : maxChatter >= 2 ? "MEDIUM" : "LOW"})`,
    ];
    const ssvBlock = [...ssvHeader, ...ssv.on];
    lines = insertLines(lines, insertIdx, ssvBlock);

    for (const code of ssv.on) {
      injections.push({
        type: "ssv",
        line_number: insertIdx,
        code_inserted: code,
        explanation: `SSV activation — ${variationPct}% speed variation for chatter suppression`,
        tier_required: 3,
      });
      codesAdded.push(code);
      this._addExplanations(code, explanations);
    }

    // SSV-off before program end
    if (ssv.off.length > 0) {
      const endIdx = findProgramEndLine(lines);
      const offBlock = [`(--- SSV OFF ---)`, ...ssv.off];
      lines = insertLines(lines, endIdx, offBlock);
      for (const code of ssv.off) {
        injections.push({
          type: "ssv",
          line_number: endIdx,
          code_inserted: code,
          explanation: `SSV deactivation for ${controller}`,
          tier_required: 3,
        });
        codesAdded.push(code);
        this._addExplanations(code, explanations);
      }
    }

    return this._buildResult(lines, injections, codesAdded, explanations);
  }

  // --------------------------------------------------------------------------
  // U06: Machine Dynamics Adapter
  // --------------------------------------------------------------------------

  /** Inject machine dynamics profile comments and feed limits.
   * @param machineClass - target machine class
   * @param lines - gcode lines
   * @param injections - injection accumulator
   * @param codesAdded - codes accumulator
   * @param explanations - explanations map
   * @returns modified lines
   */
  private _injectDynamics(
    machineClass: MachineClass | undefined,
    lines: string[],
    injections: Injection[],
    codesAdded: string[],
    explanations: Record<string, string>,
  ): string[] {
    const mc = machineClass ?? "standard_vmc";
    const profile = DYNAMICS_PROFILES[mc];
    if (!profile) return lines;

    const insertIdx = Math.min(3, lines.length);
    const dynamicsBlock = [
      `(--- MACHINE DYNAMICS: ${profile.description.toUpperCase()} ---)`,
      `(ACCEL: ${profile.accel_g}g | JERK: ${profile.jerk_ms3} m/s^3 | MAX FEED: ${profile.max_feed_mmmin} mm/min)`,
      `(FEED RATES IN THIS PROGRAM SHOULD NOT EXCEED ${profile.max_feed_mmmin} mm/min)`,
    ];

    lines = insertLines(lines, insertIdx, dynamicsBlock);

    injections.push({
      type: "dynamics",
      line_number: insertIdx,
      code_inserted: dynamicsBlock.join(" | "),
      explanation: `Machine dynamics profile: ${profile.description}`,
      tier_required: 2,
    });

    // Scan for feed rates that exceed machine capability and cap them
    const maxFeed = profile.max_feed_mmmin;
    let feedsCapped = 0;
    for (let i = 0; i < lines.length; i++) {
      const fMatch = lines[i].match(/F(\d+(?:\.\d+)?)/i);
      if (fMatch) {
        const feedVal = parseFloat(fMatch[1]);
        if (feedVal > maxFeed) {
          const original = lines[i];
          lines[i] = lines[i].replace(
            /F\d+(?:\.\d+)?/i,
            `F${maxFeed}`
          ) + ` (CAPPED FROM F${feedVal})`;
          feedsCapped++;
          injections.push({
            type: "dynamics",
            line_number: i,
            code_inserted: lines[i],
            explanation: `Feed rate capped from F${feedVal} to F${maxFeed} (machine limit)`,
            tier_required: 2,
          });
        }
      }
    }

    if (feedsCapped > 0) {
      codesAdded.push(`(${feedsCapped} feed rates capped to F${maxFeed})`);
      explanations["FEED_CAP"] = `${feedsCapped} feed rate(s) exceeded machine maximum of ${maxFeed} mm/min and were capped`;
    }

    return lines;
  }

  // --------------------------------------------------------------------------
  // U07: Geometric Compensation Injector
  // --------------------------------------------------------------------------

  /** Inject geometric compensation codes for precision operations.
   * @param input - motion injection input
   * @param lines - gcode lines
   * @param injections - injection accumulator
   * @param codesAdded - codes accumulator
   * @param explanations - explanations map
   * @returns modified lines
   */
  private _injectGeometricCompensation(
    input: MotionInjectionInput,
    lines: string[],
    injections: Injection[],
    codesAdded: string[],
    explanations: Record<string, string>,
  ): string[] {
    if (!input.precision_mode) return lines;

    const tol = tightestTolerance(input.operations);
    if (tol !== undefined && tol > 0.025) return lines;

    const insertIdx = findFirstMotionLine(lines);
    const precisionBlock = [
      `(--- PRECISION MODE: GEOMETRIC COMPENSATION ---)`,
      `(TOLERANCE TARGET: ${tol !== undefined ? tol.toFixed(4) : "<0.025"} mm)`,
      `(BACKLASH: APPROACH ALL CRITICAL DIMS FROM SAME DIRECTION)`,
      `(THERMAL: G04 P500 DWELL RECOMMENDED BEFORE FINISH PASSES)`,
      `(WARM-UP: RUN SPINDLE 10 MIN AT OPERATING RPM BEFORE FIRST CUT)`,
    ];

    // Add approach-direction comments for critical moves
    const approachComment = `(PRECISION: USE CLIMB MILLING ONLY - CONSISTENT APPROACH DIRECTION)`;
    precisionBlock.push(approachComment);

    // Dwell insertion for thermal settling before finish passes
    const dwellCode = `G04 P500 (THERMAL SETTLING DWELL - 0.5 SEC)`;
    precisionBlock.push(dwellCode);

    lines = insertLines(lines, insertIdx, precisionBlock);

    injections.push({
      type: "geometric_comp",
      line_number: insertIdx,
      code_inserted: precisionBlock.join("\n"),
      explanation: `Precision mode: backlash approach direction, thermal dwell, and warm-up recommendation for tolerance ${tol !== undefined ? tol.toFixed(4) : "<0.025"} mm`,
      tier_required: 3,
    });

    codesAdded.push("G04 P500 (THERMAL DWELL)");
    explanations["G04"] = "Dwell — pauses program execution for thermal settling; P=milliseconds";
    explanations["PRECISION_MODE"] = "Geometric compensation active: consistent approach direction, thermal dwell before finish passes, spindle warm-up recommended";

    return lines;
  }

  // --------------------------------------------------------------------------
  // U08: Spindle Warmup Injector
  // --------------------------------------------------------------------------

  /** Inject a block-delete spindle warm-up routine.
   * @param input - motion injection input
   * @returns injection result with warm-up routine
   */
  inject_warmup(input: MotionInjectionInput): MotionInjectionResult {
    const { controller } = input;
    let lines = input.gcode.split("\n");
    const injections: Injection[] = [];
    const codesAdded: string[] = [];
    const explanations: Record<string, string> = {};

    if (!input.enable_warmup) {
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    // Build warm-up routine — wrapped in block-delete (/) so operator can skip
    const warmupRoutine = [
      `(--- SPINDLE WARM-UP ROUTINE [BLOCK DELETE TO SKIP] ---)`,
      `/ M5 (SPINDLE STOP)`,
      `/ G04 P1000 (PAUSE 1 SEC)`,
      `/ (WARM-UP STAGE 1: LOW RPM)`,
      `/ M3 S1000 (WARM-UP AT 1000 RPM)`,
      `/ G04 P60000 (RUN 60 SEC)`,
      `/ (WARM-UP STAGE 2: MEDIUM RPM)`,
      `/ M3 S4000 (WARM-UP AT 4000 RPM)`,
      `/ G04 P60000 (RUN 60 SEC)`,
      `/ (WARM-UP STAGE 3: HIGH RPM)`,
      `/ M3 S8000 (WARM-UP AT 8000 RPM)`,
      `/ G04 P120000 (RUN 120 SEC)`,
      `/ (WARM-UP STAGE 4: OPERATING RPM)`,
      `/ M3 S12000 (WARM-UP AT 12000 RPM)`,
      `/ G04 P120000 (RUN 120 SEC)`,
      `/ M5 (SPINDLE STOP AFTER WARM-UP)`,
      `/ G04 P2000 (PAUSE BEFORE PROGRAM)`,
      `(--- END SPINDLE WARM-UP ---)`,
    ];

    // Insert at the very beginning, after program number / header
    let insertIdx = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const upper = lines[i].trim().toUpperCase();
      if (upper.startsWith("O") || upper.startsWith("%") || upper.startsWith("(")) {
        insertIdx = i + 1;
      }
    }

    lines = insertLines(lines, insertIdx, warmupRoutine);

    injections.push({
      type: "warmup",
      line_number: insertIdx,
      code_inserted: warmupRoutine.join("\n"),
      explanation: `Block-delete spindle warm-up routine: 4-stage RPM ramp (1000→4000→8000→12000) over ~6 minutes. Operator can skip with block-delete switch.`,
      tier_required: 2,
    });

    codesAdded.push("/ M3 (WARMUP STAGES)", "/ G04 (WARMUP DWELLS)");
    explanations["BLOCK_DELETE"] = "Lines starting with / are block-delete — skipped when the block-delete switch is ON";
    explanations["WARMUP_ROUTINE"] = "4-stage spindle warm-up: progressively increases RPM to reach thermal equilibrium before cutting";

    return this._buildResult(lines, injections, codesAdded, explanations);
  }

  // --------------------------------------------------------------------------
  // Thermal compensation (U-DEA-november-P01, DEA-MS0)
  // --------------------------------------------------------------------------

  /** Inject a controller-aware thermal-compensation work-offset shift at program start.
   *  Pre-computed `compensation` (mm) is loaded as an additive work-offset adjust via
   *  the controller's native mechanism (G10 L20 for Fanuc/Haas/Mazak/Okuma, $P_UIFR for
   *  Siemens, TRANS for Heidenhain). Zero / non-finite magnitude is a no-op. Unknown
   *  controllers fall back to Fanuc G10 L20 with a warning in codes_explanation.
   *  @param input - {controller, gcode, compensation:{dx,dy,dz}, wcs_code?, insertion_line?}
   *  @returns MotionInjectionResult with thermal-comp lines inserted at `insertion_line` (default 1)
   */
  inject_thermal_compensate(input: ThermalCompensationInput): MotionInjectionResult {
    const { controller, gcode, compensation, wcs_code = "G54", insertion_line = 1 } = input;
    let lines = gcode.split("\n");
    const injections: Injection[] = [];
    const codesAdded: string[] = [];
    const explanations: Record<string, string> = {};

    // Zero / non-finite compensation magnitude → no-op (structured, not throw).
    const mag = Math.hypot(compensation?.dx ?? 0, compensation?.dy ?? 0, compensation?.dz ?? 0);
    if (!Number.isFinite(mag) || mag === 0) {
      log.info(`[MotionControllerInjectionEngine] thermal comp: zero/non-finite magnitude — no injection`);
      return this._buildResult(lines, injections, codesAdded, explanations);
    }

    // Empty / whitespace gcode → return untouched empty result.
    if (!gcode || gcode.trim().length === 0) {
      return this._buildResult([], injections, codesAdded, explanations);
    }

    const isFallback = !(controller in THERMAL_COMP_FORMAT);
    const formatter = THERMAL_COMP_FORMAT[controller] ?? THERMAL_COMP_FORMAT.fanuc;
    const thermalLines = formatter(wcs_code, compensation.dx, compensation.dy, compensation.dz);

    const insertAt = Math.min(Math.max(0, Math.floor(insertion_line)), lines.length);
    lines = [...lines.slice(0, insertAt), ...thermalLines, ...lines.slice(insertAt)];

    for (const code of thermalLines) {
      injections.push({
        line_number: insertAt,
        code_inserted: code,
        explanation: `Thermal compensation dx=${fmtComp(compensation.dx)} dy=${fmtComp(compensation.dy)} dz=${fmtComp(compensation.dz)} mm (wcs=${wcs_code})`,
        tier_required: 3,
      });
      codesAdded.push(code);
      explanations[code] = isFallback
        ? `Thermal comp (fallback to fanuc G10 L20 — controller "${controller}" not in map; verify before running)`
        : `Thermal compensation for ${controller}: additive work-offset shift via ${controller === "siemens" ? "$P_UIFR" : controller === "heidenhain" ? "TRANS" : "G10 L20"}`;
    }

    log.info(`[MotionControllerInjectionEngine] thermal comp: ${thermalLines.length} line(s) inserted at line ${insertAt} (wcs=${wcs_code}, mag=${mag.toFixed(4)}mm)`);
    return this._buildResult(lines, injections, codesAdded, explanations);
  }

  // --------------------------------------------------------------------------
  // Combined: inject_all
  // --------------------------------------------------------------------------

  /** Run all injection units in sequence: warmup → HSM → TCP → look-ahead →
   *  coolant → SSV → dynamics → geometric compensation.
   * @param input - motion injection input
   * @returns combined injection result
   */
  inject_all(input: MotionInjectionInput): MotionInjectionResult {
    let lines = input.gcode.split("\n");
    const injections: Injection[] = [];
    const codesAdded: string[] = [];
    const explanations: Record<string, string> = {};

    // U08: Warmup (first so it goes at program start)
    if (input.enable_warmup) {
      const warmupResult = this.inject_warmup(input);
      lines = warmupResult.injected_gcode.split("\n");
      injections.push(...warmupResult.injections);
      codesAdded.push(...warmupResult.codes_added);
      Object.assign(explanations, warmupResult.codes_explanation);
    }

    // Rebuild input with updated gcode for subsequent passes
    const updatedInput = (gcode: string): MotionInjectionInput => ({ ...input, gcode });

    // U01: HSM
    if (input.machine_options.hasHSMPackage) {
      const hsmResult = this.inject_hsm(updatedInput(lines.join("\n")));
      lines = hsmResult.injected_gcode.split("\n");
      injections.push(...hsmResult.injections);
      codesAdded.push(...hsmResult.codes_added);
      Object.assign(explanations, hsmResult.codes_explanation);
    }

    // U02: TCP
    if (input.machine_options.has5AxisPackage && has5AxisOps(input.operations)) {
      const tcpResult = this.inject_tcp(updatedInput(lines.join("\n")));
      lines = tcpResult.injected_gcode.split("\n");
      injections.push(...tcpResult.injections);
      codesAdded.push(...tcpResult.codes_added);
      Object.assign(explanations, tcpResult.codes_explanation);
    }

    // U03: Look-ahead
    lines = this._injectLookAhead(updatedInput(lines.join("\n")), lines, injections, codesAdded, explanations);

    // U04: Coolant
    const coolantResult = this.inject_coolant(updatedInput(lines.join("\n")));
    lines = coolantResult.injected_gcode.split("\n");
    injections.push(...coolantResult.injections);
    codesAdded.push(...coolantResult.codes_added);
    Object.assign(explanations, coolantResult.codes_explanation);

    // U05: SSV
    if (input.machine_options.hasSSV && needsSSV(input.operations)) {
      const ssvResult = this.inject_ssv(updatedInput(lines.join("\n")));
      lines = ssvResult.injected_gcode.split("\n");
      injections.push(...ssvResult.injections);
      codesAdded.push(...ssvResult.codes_added);
      Object.assign(explanations, ssvResult.codes_explanation);
    }

    // U06: Dynamics
    lines = this._injectDynamics(input.machine_class, lines, injections, codesAdded, explanations);

    // U07: Geometric Compensation
    lines = this._injectGeometricCompensation(updatedInput(lines.join("\n")), lines, injections, codesAdded, explanations);

    log.info(`[MotionControllerInjectionEngine] inject_all complete: ${injections.length} injections, ${codesAdded.length} codes added for ${input.controller}`);

    return this._buildResult(lines, injections, codesAdded, explanations);
  }

  // --------------------------------------------------------------------------
  // Query: get_codes_for_controller
  // --------------------------------------------------------------------------

  /** Return the full code map for a given controller.
   * @param controller - target controller type
   * @returns controller code map with all available codes
   */
  get_codes_for_controller(controller: ControllerType): ControllerCodeMap {
    const allCoolant: Record<string, string[]> = {};
    const cc = COOLANT_CODES[controller];
    if (cc) {
      for (const [coolantType, codes] of Object.entries(cc)) {
        if (codes.on.length > 0) {
          allCoolant[coolantType] = [...codes.on, ...codes.off];
        }
      }
    }

    const hsmAll: string[] = [];
    const hsmForCtrl = HSM_CODES[controller];
    if (hsmForCtrl) {
      for (const codes of Object.values(hsmForCtrl)) {
        for (const c of codes) {
          if (!hsmAll.includes(c)) hsmAll.push(c);
        }
      }
    }
    const hsmOff = HSM_OFF_CODES[controller] ?? [];
    for (const c of hsmOff) {
      if (!hsmAll.includes(c)) hsmAll.push(c);
    }

    const tcpAll = [...(TCP_ON_CODES[controller] ?? []), ...(TCP_OFF_CODES[controller] ?? [])];

    const ssvEntry = SSV_CODES[controller];
    const ssvAll = ssvEntry ? [...ssvEntry.on, ...ssvEntry.off] : [];

    const laEntry = LOOK_AHEAD_CODES[controller];
    const laAll = laEntry ? [...laEntry.on, ...laEntry.off] : [];

    return {
      controller,
      hsm_codes: hsmAll,
      tcp_codes: tcpAll,
      coolant_codes: allCoolant,
      ssv_codes: ssvAll,
      look_ahead_codes: laAll,
    };
  }

  // --------------------------------------------------------------------------
  // Explanation lookup
  // --------------------------------------------------------------------------

  /** Get explanation for a specific G/M code.
   * @param code - the G/M code string
   * @returns human-readable explanation or undefined
   */
  explain_code(code: string): string | undefined {
    // Try exact match first
    if (CODE_EXPLANATIONS[code]) return CODE_EXPLANATIONS[code];

    // Try prefix match (strip parameters)
    const base = code.split(" ")[0].split("(")[0].trim();
    if (CODE_EXPLANATIONS[base]) return CODE_EXPLANATIONS[base];

    return undefined;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /** Build a MotionInjectionResult from accumulated data. */
  private _buildResult(
    lines: string[],
    injections: Injection[],
    codesAdded: string[],
    explanations: Record<string, string>,
  ): MotionInjectionResult {
    return {
      injected_gcode: lines.join("\n"),
      injections,
      codes_added: Array.from(new Set(codesAdded)),
      codes_explanation: explanations,
    };
  }

  /** Add known explanations for a code string into the explanations map. */
  private _addExplanations(codeStr: string, explanations: Record<string, string>): void {
    // Try the full code string
    const explanation = this.explain_code(codeStr);
    if (explanation) {
      const key = codeStr.split(" ")[0].split("(")[0].replace(/;.*/, "").trim();
      explanations[key] = explanation;
    }

    // Also match embedded G/M codes
    const gCodes = codeStr.match(/[GM]\d+(?:\.\d+)?/gi);
    if (gCodes) {
      for (const gc of gCodes) {
        const exp = CODE_EXPLANATIONS[gc.toUpperCase()] ?? CODE_EXPLANATIONS[gc];
        if (exp) explanations[gc.toUpperCase()] = exp;
      }
    }

    // Match Siemens-style keywords
    const keywords = ["CYCLE832", "COMPON", "COMPOF", "COMPCURV", "FFWON", "FFWOF",
                       "TRAORI", "TRAFOOF", "CYCLE800", "CYCLE32"];
    for (const kw of keywords) {
      if (codeStr.includes(kw) && CODE_EXPLANATIONS[kw]) {
        explanations[kw] = CODE_EXPLANATIONS[kw];
      }
    }

    // Match Heidenhain FUNCTION TCPM
    if (codeStr.includes("FUNCTION TCPM") && CODE_EXPLANATIONS["FUNCTION TCPM"]) {
      explanations["FUNCTION TCPM"] = CODE_EXPLANATIONS["FUNCTION TCPM"];
    }
  }
}

/** Singleton instance of MotionControllerInjectionEngine. */
export const motionControllerInjectionEngine = new MotionControllerInjectionEngine();
