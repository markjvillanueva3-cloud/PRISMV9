/**
 * PostOutputGenerationEngine — POST-ULT-MS12 Pipeline Phase 6
 *
 * Final output stage: formats physics-optimized programs for target controllers
 * with full purchase-option awareness. Consolidates U01-U10:
 *
 *   U01  PostTemplateEngine          — controller-family base templates
 *   U02  PropertyInjector            — strip/add codes per machine options
 *   U03  GCodeDialectTranslator      — translate between controller dialects
 *   U04  CannedCycleGenerator        — per-controller cycles with physics params
 *   U05  ProbingModuleGenerator      — per-controller probe routines
 *   U06  AnalyticsReportGenerator    — per-program analytics as comments
 *   U07  SetupSheetGenerator         — complete job package
 *   U08  AutoProbeRoutineGenerator   — feature-based probe sequences
 *   U09  ProgramSizeOptimizer        — split/optimize for memory-constrained CNC
 *   U10  OperatorCommentInjector     — strategic comments + prove-out mode
 *
 * Actions: generate, format_only, setup_sheet, analytics, prove_out
 *
 * No external imports — pure computation.
 */

// ============================================================================
// TYPES — OutputGenerationInput / OutputGenerationResult
// ============================================================================

export type ControllerFamily =
  | "fanuc"
  | "haas"
  | "siemens"
  | "heidenhain"
  | "mazak"
  | "okuma";

export interface OperationInfo {
  name: string;
  tool_number: number;
  tool_description: string;
  tool_diameter_mm?: number;
  tool_projection_mm?: number;
  holder?: string;
  operation_type: string;
  physics_data?: {
    force_range_N?: [number, number];
    power_range_kW?: [number, number];
    thermal_range_C?: [number, number];
    tool_life_consumed_percent?: number;
    cycle_time_sec?: number;
    predicted_ra_um?: number;
    original_cycle_sec?: number;
    optimized_cycle_sec?: number;
  };
  wcs_offset?: string;
  critical_features?: Array<{
    feature: string;
    nominal: string;
    tolerance: string;
    method: string;
  }>;
}

export interface OutputGenerationInput {
  optimized_gcode: string;
  controller: string;
  controller_variant?: string;
  machine_options: Record<string, boolean>;
  program_number?: number;
  program_name?: string;

  // What to generate
  generate_setup_sheet?: boolean;
  generate_probe_routines?: boolean;
  generate_analytics?: boolean;
  generate_prove_out?: boolean;
  inject_operator_comments?: boolean;
  optimize_program_size?: boolean;

  // Context
  operations?: OperationInfo[];

  controller_memory_kb?: number;
  max_line_length?: number;
  machine_rate_per_hr?: number;
  tool_cost_per_part?: number;
}

export interface SetupSheet {
  program_info: { number: string; name: string; date: string; machine: string };
  tool_list: Array<{
    tool_number: number;
    description: string;
    diameter_mm: number;
    projection_mm: number;
    holder: string;
    offset_h: number;
    offset_d: number;
    notes: string;
  }>;
  wcs_setup: Array<{ offset: string; x: number; y: number; z: number; notes: string }>;
  operation_sequence: Array<{ op: number; description: string; tool: number; notes: string }>;
  inspection_checklist: Array<{ feature: string; nominal: string; tolerance: string; method: string }>;
  notes: string[];
}

export interface ProgramAnalytics {
  total_cycle_time_sec: number;
  cutting_time_sec: number;
  non_cutting_time_sec: number;
  per_operation: Array<{
    op: number;
    name: string;
    time_sec: number;
    force_range_N: [number, number];
    power_range_kW: [number, number];
    tool_life_consumed_percent: number;
    predicted_ra_um?: number;
  }>;
  optimization_delta: {
    original_cycle_sec: number;
    optimized_cycle_sec: number;
    time_saved_sec: number;
    time_saved_percent: number;
    tool_life_improvement_percent: number;
  };
  cost_estimate?: {
    machine_rate_per_hr: number;
    cost_per_part: number;
    tool_cost_per_part: number;
  };
}

export interface ProbeRoutine {
  type: "wcs_setup" | "in_process" | "first_article";
  description: string;
  gcode: string;
  features: string[];
}

export interface OutputGenerationResult {
  final_gcode: string;
  prove_out_gcode?: string;
  setup_sheet?: SetupSheet;
  probe_routines?: ProbeRoutine[];
  analytics?: ProgramAnalytics;
  file_size_bytes: number;
  line_count: number;
  was_split: boolean;
  subprograms?: string[];
}

// ============================================================================
// CONTROLLER TEMPLATE DATA — U01
// ============================================================================

interface ControllerTemplate {
  family: ControllerFamily;
  aliases: string[];
  header: (progNum: number, progName: string) => string[];
  footer: () => string[];
  safeStart: string[];
  commentPrefix: string;
  blockNumbering: { start: number; increment: number };
  decimalPlaces: { mm: number; inch: number };
  arcFormat: "IJK" | "R";
  workOffsetFormat: (n: number) => string;
  wrapperStart?: string;
  wrapperEnd?: string;
  cannedCycles: CannedCycleSet;
  probeFormat: ProbeFormatSet;
}

interface CannedCycleSet {
  drill: (depth: number, retract: number, feed: number) => string;
  peck: (depth: number, retract: number, peckDepth: number, feed: number) => string;
  tap: (depth: number, pitch: number, speed: number) => string;
  bore: (depth: number, retract: number, feed: number) => string;
  chipBreakDrill: (depth: number, retract: number, peckDepth: number, feed: number) => string;
}

interface ProbeFormatSet {
  singleSurface: (axis: string, target: number, feed: number) => string;
  bore: (diameter: number, depth: number, feed: number) => string;
  boss: (diameter: number, depth: number, feed: number) => string;
  webThickness: (nominal: number, feed: number) => string;
  corner: (x: number, y: number, feed: number) => string;
}

// Fanuc / Haas shared safe-start
const FANUC_SAFE_START = ["G90 G94 G17 G40 G49 G80"];

const CONTROLLER_TEMPLATES: Record<ControllerFamily, ControllerTemplate> = {
  fanuc: {
    family: "fanuc",
    aliases: ["fanuc", "fanuc-0i", "fanuc-31i", "fanuc-30i"],
    header: (n, name) => ["%", `O${String(n).padStart(4, "0")} (${name})`],
    footer: () => ["M30", "%"],
    safeStart: FANUC_SAFE_START,
    commentPrefix: "(",
    blockNumbering: { start: 10, increment: 5 },
    decimalPlaces: { mm: 3, inch: 4 },
    arcFormat: "IJK",
    workOffsetFormat: (n) => n <= 6 ? `G${53 + n}` : `G54.1 P${n}`,
    wrapperStart: "%",
    wrapperEnd: "%",
    cannedCycles: {
      drill: (d, r, f) => `G81 Z${d.toFixed(3)} R${r.toFixed(3)} F${f.toFixed(1)}`,
      peck: (d, r, p, f) => `G83 Z${d.toFixed(3)} R${r.toFixed(3)} Q${p.toFixed(3)} F${f.toFixed(1)}`,
      tap: (d, pitch, s) => `G84 Z${d.toFixed(3)} R2.0 F${(s * pitch).toFixed(1)} S${s}`,
      bore: (d, r, f) => `G85 Z${d.toFixed(3)} R${r.toFixed(3)} F${f.toFixed(1)}`,
      chipBreakDrill: (d, r, p, f) => `G73 Z${d.toFixed(3)} R${r.toFixed(3)} Q${p.toFixed(3)} F${f.toFixed(1)}`,
    },
    probeFormat: {
      singleSurface: (axis, target, feed) =>
        `G65 P9811 ${axis}${target.toFixed(3)} F${feed.toFixed(0)}`,
      bore: (dia, depth, feed) =>
        `G65 P9814 D${dia.toFixed(3)} Z${depth.toFixed(3)} F${feed.toFixed(0)}`,
      boss: (dia, depth, feed) =>
        `G65 P9814 D${dia.toFixed(3)} Z${depth.toFixed(3)} F${feed.toFixed(0)} B1.`,
      webThickness: (nom, feed) =>
        `G65 P9811 X${nom.toFixed(3)} F${feed.toFixed(0)}\nG65 P9811 X-${nom.toFixed(3)} F${feed.toFixed(0)}`,
      corner: (x, y, feed) =>
        `G65 P9811 X${x.toFixed(3)} F${feed.toFixed(0)}\nG65 P9811 Y${y.toFixed(3)} F${feed.toFixed(0)}`,
    },
  },
  haas: {
    family: "haas",
    aliases: ["haas", "haas-ngc", "haas-vf", "haas-um"],
    header: (n, name) => ["%", `O${String(n).padStart(4, "0")} (${name})`],
    footer: () => ["M30", "%"],
    safeStart: FANUC_SAFE_START,
    commentPrefix: "(",
    blockNumbering: { start: 10, increment: 5 },
    decimalPlaces: { mm: 3, inch: 4 },
    arcFormat: "IJK",
    workOffsetFormat: (n) => n <= 6 ? `G${53 + n}` : `G154 P${n}`,
    wrapperStart: "%",
    wrapperEnd: "%",
    cannedCycles: {
      drill: (d, r, f) => `G81 Z${d.toFixed(4)} R${r.toFixed(4)} F${f.toFixed(1)}`,
      peck: (d, r, p, f) => `G83 Z${d.toFixed(4)} R${r.toFixed(4)} Q${p.toFixed(4)} F${f.toFixed(1)}`,
      tap: (d, pitch, s) => `G84.2 Z${d.toFixed(4)} R2.0 F${(s * pitch).toFixed(1)} S${s} J2`,
      bore: (d, r, f) => `G76 Z${d.toFixed(4)} R${r.toFixed(4)} F${f.toFixed(1)} Q0`,
      chipBreakDrill: (d, r, p, f) => `G73 Z${d.toFixed(4)} R${r.toFixed(4)} Q${p.toFixed(4)} F${f.toFixed(1)}`,
    },
    probeFormat: {
      singleSurface: (axis, target, feed) =>
        `G65 P9811 ${axis}${target.toFixed(4)} F${feed.toFixed(0)}`,
      bore: (dia, depth, feed) =>
        `G65 P9814 D${dia.toFixed(4)} Z${depth.toFixed(4)} F${feed.toFixed(0)}`,
      boss: (dia, depth, feed) =>
        `G65 P9814 D${dia.toFixed(4)} Z${depth.toFixed(4)} F${feed.toFixed(0)} B1.`,
      webThickness: (nom, feed) =>
        `G65 P9811 X${nom.toFixed(4)} F${feed.toFixed(0)}\nG65 P9811 X-${nom.toFixed(4)} F${feed.toFixed(0)}`,
      corner: (x, y, feed) =>
        `G65 P9811 X${x.toFixed(4)} F${feed.toFixed(0)}\nG65 P9811 Y${y.toFixed(4)} F${feed.toFixed(0)}`,
    },
  },
  siemens: {
    family: "siemens",
    aliases: ["siemens", "sinumerik", "840d", "840dsl", "siemens-840d"],
    header: (n, name) => [
      `; Program: ${name}`,
      `; Number: ${n}`,
      `; Date: ${new Date().toISOString().slice(0, 10)}`,
    ],
    footer: () => ["M30"],
    safeStart: ["G90 G94 G17 G40 G49 G80 SUPA"],
    commentPrefix: ";",
    blockNumbering: { start: 1, increment: 1 },
    decimalPlaces: { mm: 3, inch: 4 },
    arcFormat: "IJK",
    workOffsetFormat: (n) => {
      if (n <= 4) return `G${53 + n}`;
      return `$P_UIFR[${n}]`;
    },
    cannedCycles: {
      drill: (d, r, f) => `CYCLE81(${r.toFixed(3)}, 0, 2, ${d.toFixed(3)})`,
      peck: (d, r, p, f) => `CYCLE83(${r.toFixed(3)}, 0, 2, ${d.toFixed(3)}, ${p.toFixed(3)},,,0, 0, 0, 0, 0, 0)`,
      tap: (d, pitch, s) => `CYCLE84(2.0, 0, 2, ${d.toFixed(3)}, ${pitch.toFixed(3)},,,, 3, 0, ${s}, ${s})`,
      bore: (d, r, f) => `CYCLE86(${r.toFixed(3)}, 0, 2, ${d.toFixed(3)}, ${f.toFixed(1)},,, 3)`,
      chipBreakDrill: (d, r, p, f) => `CYCLE83(${r.toFixed(3)}, 0, 2, ${d.toFixed(3)}, ${p.toFixed(3)},,,1, 0, 0, 0, 0, 0)`,
    },
    probeFormat: {
      singleSurface: (axis, target, feed) =>
        `CYCLE978(1, ${axis === "X" ? 1 : axis === "Y" ? 2 : 3}, 0, ${target.toFixed(3)}, 0, 0, 0, 0)`,
      bore: (dia, depth, feed) =>
        `CYCLE977(${dia.toFixed(3)}, 0, ${depth.toFixed(3)}, 0, 0, 4, 0, 0, 0)`,
      boss: (dia, depth, feed) =>
        `CYCLE977(${dia.toFixed(3)}, 0, ${depth.toFixed(3)}, 0, 0, 3, 0, 0, 0)`,
      webThickness: (nom, feed) =>
        `CYCLE977(0, ${nom.toFixed(3)}, 0, 0, 0, 7, 0, 0, 0)`,
      corner: (x, y, feed) =>
        `CYCLE961(${x.toFixed(3)}, ${y.toFixed(3)}, 0, 0, 0, 1, 0, 0)`,
    },
  },
  heidenhain: {
    family: "heidenhain",
    aliases: ["heidenhain", "tnc", "tnc640", "itnc530", "tnc7"],
    header: (n, name) => [
      `BEGIN PGM ${name} MM`,
    ],
    footer: () => ["END PGM"],
    safeStart: [
      "BLK FORM 0.1 Z X-100 Y-100 Z-50",
      "BLK FORM 0.2 X+100 Y+100 Z+0",
    ],
    commentPrefix: ";",
    blockNumbering: { start: 0, increment: 1 },
    decimalPlaces: { mm: 3, inch: 4 },
    arcFormat: "R",
    workOffsetFormat: (n) => `CYCL DEF 7.0 DATUM SHIFT\nCYCL DEF 7.1 #${n}`,
    cannedCycles: {
      drill: (d, r, f) =>
        `CYCL DEF 200 DRILLING ~\n  Q200=${Math.abs(r).toFixed(3)} ;SET-UP CLEARANCE ~\n  Q201=${Math.abs(d).toFixed(3)} ;DEPTH ~\n  Q206=${f.toFixed(0)} ;FEED RATE FOR PLUNGING`,
      peck: (d, r, p, f) =>
        `CYCL DEF 203 UNIVERSAL DRILLING ~\n  Q200=${Math.abs(r).toFixed(3)} ;SET-UP CLEARANCE ~\n  Q201=${Math.abs(d).toFixed(3)} ;DEPTH ~\n  Q202=${p.toFixed(3)} ;PLUNGING DEPTH ~\n  Q206=${f.toFixed(0)} ;FEED RATE FOR PLUNGING`,
      tap: (d, pitch, s) =>
        `CYCL DEF 207 RIGID TAPPING NEW ~\n  Q200=2.000 ;SET-UP CLEARANCE ~\n  Q201=${Math.abs(d).toFixed(3)} ;DEPTH ~\n  Q239=${pitch.toFixed(3)} ;PITCH`,
      bore: (d, r, f) =>
        `CYCL DEF 201 REAMING ~\n  Q200=${Math.abs(r).toFixed(3)} ;SET-UP CLEARANCE ~\n  Q201=${Math.abs(d).toFixed(3)} ;DEPTH ~\n  Q206=${f.toFixed(0)} ;FEED RATE FOR PLUNGING`,
      chipBreakDrill: (d, r, p, f) =>
        `CYCL DEF 205 UNIVERSAL PECKING ~\n  Q200=${Math.abs(r).toFixed(3)} ;SET-UP CLEARANCE ~\n  Q201=${Math.abs(d).toFixed(3)} ;DEPTH ~\n  Q202=${p.toFixed(3)} ;PLUNGING DEPTH ~\n  Q206=${f.toFixed(0)} ;FEED RATE FOR PLUNGING`,
    },
    probeFormat: {
      singleSurface: (axis, target, feed) =>
        `TCH PROBE 419 DATUM IN ONE AXIS ~\n  Q263=${axis === "X" ? 1 : axis === "Y" ? 2 : 3} ;MEASURING AXIS ~\n  Q272=${target.toFixed(3)} ;MEAS. POINT 1 IN 1ST AXIS ~\n  Q267=${feed.toFixed(0)} ;TRAVERSE SPEED`,
      bore: (dia, depth, feed) =>
        `TCH PROBE 412 DATUM INSIDE CIRCLE ~\n  Q325=${dia.toFixed(3)} ;STARTING HOLE DIAMETER ~\n  Q320=${depth.toFixed(3)} ;SET-UP CLEARANCE ~\n  Q260=${feed.toFixed(0)} ;TRAVERSE SPEED`,
      boss: (dia, depth, feed) =>
        `TCH PROBE 413 DATUM OUTSIDE CIRCLE ~\n  Q325=${dia.toFixed(3)} ;STARTING BOSS DIAMETER ~\n  Q320=${depth.toFixed(3)} ;SET-UP CLEARANCE ~\n  Q260=${feed.toFixed(0)} ;TRAVERSE SPEED`,
      webThickness: (nom, feed) =>
        `TCH PROBE 427 MEASURE COORDINATE ~\n  Q272=${nom.toFixed(3)} ;NOMINAL VALUE ~\n  Q267=${feed.toFixed(0)} ;TRAVERSE SPEED`,
      corner: (x, y, feed) =>
        `TCH PROBE 400 DATUM IN CORNER ~\n  Q321=${x.toFixed(3)} ;CENTER 1ST AXIS ~\n  Q322=${y.toFixed(3)} ;CENTER 2ND AXIS ~\n  Q260=${feed.toFixed(0)} ;TRAVERSE SPEED`,
    },
  },
  mazak: {
    family: "mazak",
    aliases: ["mazak", "mazatrol", "smooth", "matrix"],
    header: (n, name) => ["%", `O${String(n).padStart(4, "0")} (${name})`],
    footer: () => ["M30", "%"],
    safeStart: ["G90 G94 G17 G40 G49 G80"],
    commentPrefix: "(",
    blockNumbering: { start: 10, increment: 10 },
    decimalPlaces: { mm: 3, inch: 4 },
    arcFormat: "IJK",
    workOffsetFormat: (n) => n <= 6 ? `G${53 + n}` : `G54.1 P${n}`,
    wrapperStart: "%",
    wrapperEnd: "%",
    cannedCycles: {
      drill: (d, r, f) => `G81 Z${d.toFixed(3)} R${r.toFixed(3)} F${f.toFixed(1)}`,
      peck: (d, r, p, f) => `G83 Z${d.toFixed(3)} R${r.toFixed(3)} Q${p.toFixed(3)} F${f.toFixed(1)}`,
      tap: (d, pitch, s) => `G84 Z${d.toFixed(3)} R2.0 F${(s * pitch).toFixed(1)} S${s}`,
      bore: (d, r, f) => `G85 Z${d.toFixed(3)} R${r.toFixed(3)} F${f.toFixed(1)}`,
      chipBreakDrill: (d, r, p, f) => `G73 Z${d.toFixed(3)} R${r.toFixed(3)} Q${p.toFixed(3)} F${f.toFixed(1)}`,
    },
    probeFormat: {
      singleSurface: (axis, target, feed) =>
        `G65 P9811 ${axis}${target.toFixed(3)} F${feed.toFixed(0)}`,
      bore: (dia, depth, feed) =>
        `G65 P9814 D${dia.toFixed(3)} Z${depth.toFixed(3)} F${feed.toFixed(0)}`,
      boss: (dia, depth, feed) =>
        `G65 P9814 D${dia.toFixed(3)} Z${depth.toFixed(3)} F${feed.toFixed(0)} B1.`,
      webThickness: (nom, feed) =>
        `G65 P9811 X${nom.toFixed(3)} F${feed.toFixed(0)}\nG65 P9811 X-${nom.toFixed(3)} F${feed.toFixed(0)}`,
      corner: (x, y, feed) =>
        `G65 P9811 X${x.toFixed(3)} F${feed.toFixed(0)}\nG65 P9811 Y${y.toFixed(3)} F${feed.toFixed(0)}`,
    },
  },
  okuma: {
    family: "okuma",
    aliases: ["okuma", "osp", "osp-p300", "osp-p200"],
    header: (n, name) => [`O${String(n).padStart(4, "0")} (${name})`],
    footer: () => ["M02"],
    safeStart: ["G90 G94 G17 G40 G49 G80"],
    commentPrefix: "(",
    blockNumbering: { start: 1, increment: 1 },
    decimalPlaces: { mm: 3, inch: 4 },
    arcFormat: "IJK",
    workOffsetFormat: (n) => n <= 6 ? `G${53 + n}` : `G15 H${n}`,
    cannedCycles: {
      drill: (d, r, f) => `G81 Z${d.toFixed(3)} R${r.toFixed(3)} F${f.toFixed(1)}`,
      peck: (d, r, p, f) => `G83 Z${d.toFixed(3)} R${r.toFixed(3)} Q${p.toFixed(3)} F${f.toFixed(1)}`,
      tap: (d, pitch, s) => `G84 Z${d.toFixed(3)} R2.0 F${(s * pitch).toFixed(1)} S${s}`,
      bore: (d, r, f) => `G86 Z${d.toFixed(3)} R${r.toFixed(3)} F${f.toFixed(1)}`,
      chipBreakDrill: (d, r, p, f) => `G73 Z${d.toFixed(3)} R${r.toFixed(3)} Q${p.toFixed(3)} F${f.toFixed(1)}`,
    },
    probeFormat: {
      singleSurface: (axis, target, feed) =>
        `G65 P8811 ${axis}${target.toFixed(3)} F${feed.toFixed(0)}`,
      bore: (dia, depth, feed) =>
        `G65 P8814 D${dia.toFixed(3)} Z${depth.toFixed(3)} F${feed.toFixed(0)}`,
      boss: (dia, depth, feed) =>
        `G65 P8814 D${dia.toFixed(3)} Z${depth.toFixed(3)} F${feed.toFixed(0)} B1.`,
      webThickness: (nom, feed) =>
        `G65 P8811 X${nom.toFixed(3)} F${feed.toFixed(0)}\nG65 P8811 X-${nom.toFixed(3)} F${feed.toFixed(0)}`,
      corner: (x, y, feed) =>
        `G65 P8811 X${x.toFixed(3)} F${feed.toFixed(0)}\nG65 P8811 Y${y.toFixed(3)} F${feed.toFixed(0)}`,
    },
  },
};

// ============================================================================
// MACHINE OPTION CODES — U02 PropertyInjector
// ============================================================================

interface OptionCodeRule {
  /** Code(s) to strip when option is false */
  stripCodes: RegExp[];
  /** Replacement when option is false (if any) */
  replacement?: { from: RegExp; to: string }[];
  /** Code(s) to inject when option is true */
  injectCodes?: string[];
}

const MACHINE_OPTION_RULES: Record<string, OptionCodeRule> = {
  hasSSV: {
    stripCodes: [/M138/g, /M139/g],
    replacement: [],
  },
  hasTSC: {
    stripCodes: [/M88/g],
    replacement: [{ from: /M88/g, to: "M8" }],
  },
  hasRigidTap: {
    stripCodes: [/G84\.2/g, /G84\.3/g],
    replacement: [
      { from: /G84\.2/g, to: "G84" },
      { from: /G84\.3/g, to: "G84" },
    ],
  },
  hasHighSpeedMachining: {
    stripCodes: [/G05\.1\s*Q1/g, /G05\.1\s*Q0/g, /G05\s+P10000/g, /G05\s+P0/g],
  },
  hasChipConveyor: {
    stripCodes: [/M31/g, /M32/g],
  },
  hasProbing: {
    stripCodes: [/G65\s+P9\d+.*$/gm, /G65\s+P8\d+.*$/gm, /CYCLE97[789].*$/gm, /TCH\s+PROBE.*$/gm],
  },
  hasCoolantThrough: {
    stripCodes: [/M88/g],
    replacement: [{ from: /M88/g, to: "M8" }],
  },
  hasChipBreaker: {
    stripCodes: [],
  },
  hasAutoDoor: {
    stripCodes: [/M85/g, /M86/g],
  },
  hasPartsCatcher: {
    stripCodes: [/M36/g, /M37/g],
  },
  hasBarFeeder: {
    stripCodes: [/M98\s+P0100/g],
  },
};

// ============================================================================
// HELPER: Resolve controller family
// ============================================================================

function resolveController(controller: string): ControllerTemplate {
  const lower = controller.toLowerCase().trim();
  for (const tpl of Object.values(CONTROLLER_TEMPLATES)) {
    if (tpl.aliases.some((a) => lower.includes(a))) return tpl;
  }
  // Default to fanuc if unknown
  return CONTROLLER_TEMPLATES.fanuc;
}

function makeComment(tpl: ControllerTemplate, text: string): string {
  if (tpl.commentPrefix === "(") return `(${text})`;
  return `${tpl.commentPrefix} ${text}`;
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================================
// U01 — PostTemplateEngine: Wrap program in controller template
// ============================================================================

function applyTemplate(
  gcode: string,
  tpl: ControllerTemplate,
  progNum: number,
  progName: string,
): string {
  const lines: string[] = [];

  // Header
  const headerLines = tpl.header(progNum, progName);
  lines.push(...headerLines);

  // Safe start block
  lines.push(...tpl.safeStart);

  // Body — the optimized gcode
  const bodyLines = gcode.split("\n").map((l) => l.trimEnd());
  lines.push(...bodyLines);

  // Footer
  lines.push(...tpl.footer());

  return lines.join("\n");
}

// ============================================================================
// U02 — PropertyInjector: Strip/add codes based on machine options
// ============================================================================

function injectProperties(
  gcode: string,
  options: Record<string, boolean>,
): { gcode: string; modifications: string[] } {
  let result = gcode;
  const mods: string[] = [];

  for (const [optionKey, rule] of Object.entries(MACHINE_OPTION_RULES)) {
    const hasOption = options[optionKey];
    if (hasOption === false) {
      // Option NOT present — strip or replace codes
      if (rule.replacement && rule.replacement.length > 0) {
        for (const rep of rule.replacement) {
          if (rep.from.test(result)) {
            result = result.replace(rep.from, rep.to);
            mods.push(`${optionKey}=false: replaced ${rep.from.source} → ${rep.to}`);
          }
        }
      } else {
        for (const strip of rule.stripCodes) {
          if (strip.test(result)) {
            result = result.replace(strip, "");
            mods.push(`${optionKey}=false: stripped ${strip.source}`);
          }
        }
      }
    } else if (hasOption === true && rule.injectCodes) {
      for (const code of rule.injectCodes) {
        mods.push(`${optionKey}=true: injected ${code}`);
      }
    }
  }

  // Clean up empty lines left by stripping
  result = result.replace(/\n{3,}/g, "\n\n");

  return { gcode: result, modifications: mods };
}

// ============================================================================
// U03 — GCodeDialectTranslator: Convert between controller dialects
// ============================================================================

function translateDialect(
  gcode: string,
  tpl: ControllerTemplate,
): string {
  let result = gcode;

  // Convert work offset format — normalize G54.1 Pn / G154 Pn / FRAMES
  // Detect existing offsets and convert to target format
  const offsetPatterns = [
    /G54\.1\s*P(\d+)/g,
    /G154\s*P(\d+)/g,
    /G15\s*H(\d+)/g,
  ];
  for (const pat of offsetPatterns) {
    result = result.replace(pat, (_match, p1) => {
      const n = parseInt(p1);
      return tpl.workOffsetFormat(n > 6 ? n : 6 + n);
    });
  }

  // Convert decimal precision for coordinates
  const dp = tpl.decimalPlaces.mm; // default to mm
  result = result.replace(
    /([XYZIJKR])(-?\d+\.\d+)/g,
    (_match, letter, num) => {
      const val = parseFloat(num);
      return `${letter}${val.toFixed(dp)}`;
    },
  );

  // Block numbering — renumber if controller expects specific numbering
  if (tpl.family === "heidenhain") {
    // Heidenhain uses sequential line numbers starting at 0
    const lines = result.split("\n");
    let lineNum = tpl.blockNumbering.start;
    result = lines
      .map((line) => {
        if (line.trim() === "" || line.startsWith("BEGIN") || line.startsWith("END")) {
          return line;
        }
        const numbered = `${lineNum} ${line.replace(/^N\d+\s*/, "")}`;
        lineNum += tpl.blockNumbering.increment;
        return numbered;
      })
      .join("\n");
  }

  return result;
}

// ============================================================================
// U04 — CannedCycleGenerator: Physics-optimized canned cycles
// ============================================================================

interface CycleParams {
  type: "drill" | "peck" | "tap" | "bore" | "chipBreak";
  depth: number;
  retract: number;
  diameter_mm: number;
  material_hardness_hrc?: number;
  pitch?: number;
  speed?: number;
  feed?: number;
}

function calculatePeckDepth(diameter_mm: number, hardness_hrc?: number): number {
  // Physics-based peck depth: starts at 3x diameter, reduces with hardness
  const baseRatio = 3.0;
  const hardnessFactor = hardness_hrc
    ? Math.max(0.3, 1.0 - (hardness_hrc - 20) * 0.015)
    : 1.0;
  return Math.max(0.5, diameter_mm * baseRatio * hardnessFactor);
}

function generateCannedCycle(
  tpl: ControllerTemplate,
  params: CycleParams,
): string {
  const peckDepth = calculatePeckDepth(params.diameter_mm, params.material_hardness_hrc);
  const feed = params.feed ?? 100;

  switch (params.type) {
    case "drill":
      return tpl.cannedCycles.drill(params.depth, params.retract, feed);
    case "peck":
      return tpl.cannedCycles.peck(params.depth, params.retract, peckDepth, feed);
    case "tap":
      return tpl.cannedCycles.tap(params.depth, params.pitch ?? 1.0, params.speed ?? 500);
    case "bore":
      return tpl.cannedCycles.bore(params.depth, params.retract, feed);
    case "chipBreak":
      return tpl.cannedCycles.chipBreakDrill(params.depth, params.retract, peckDepth * 0.5, feed);
    default:
      return tpl.cannedCycles.drill(params.depth, params.retract, feed);
  }
}

// ============================================================================
// U05 — ProbingModuleGenerator: Per-controller probe routines
// ============================================================================

function generateProbeRoutine(
  tpl: ControllerTemplate,
  type: "wcs_setup" | "in_process" | "first_article",
  operations: OperationInfo[],
): ProbeRoutine {
  const lines: string[] = [];
  const features: string[] = [];
  const probeFeed = 500;

  lines.push(makeComment(tpl, `=== PROBE ROUTINE: ${type.toUpperCase()} ===`));

  if (type === "wcs_setup") {
    // WCS setup probe: touch off on stock faces
    lines.push(makeComment(tpl, "X-AXIS DATUM"));
    lines.push(tpl.probeFormat.singleSurface("X", 0, probeFeed));
    lines.push(makeComment(tpl, "Y-AXIS DATUM"));
    lines.push(tpl.probeFormat.singleSurface("Y", 0, probeFeed));
    lines.push(makeComment(tpl, "Z-AXIS DATUM - TOP OF PART"));
    lines.push(tpl.probeFormat.singleSurface("Z", 0, probeFeed));
    features.push("X datum", "Y datum", "Z datum");

    // If operations have specific WCS offsets, probe corner
    const wcsOffsets = new Set(operations.map((op) => op.wcs_offset).filter(Boolean));
    if (wcsOffsets.size > 1) {
      lines.push(makeComment(tpl, "CORNER PROBE FOR MULTI-WCS ALIGNMENT"));
      lines.push(tpl.probeFormat.corner(0, 0, probeFeed));
      features.push("Corner alignment");
    }
  } else if (type === "in_process") {
    // In-process measurement: probe critical features between operations
    let probeIdx = 0;
    for (const op of operations) {
      if (op.critical_features && op.critical_features.length > 0) {
        for (const feat of op.critical_features) {
          probeIdx++;
          lines.push(makeComment(tpl, `MEASURE: ${feat.feature} (NOM ${feat.nominal} ${feat.tolerance})`));
          if (feat.feature.toLowerCase().includes("bore") || feat.feature.toLowerCase().includes("hole")) {
            const dia = parseFloat(feat.nominal) || 25;
            lines.push(tpl.probeFormat.bore(dia, -5, probeFeed));
          } else if (feat.feature.toLowerCase().includes("boss")) {
            const dia = parseFloat(feat.nominal) || 25;
            lines.push(tpl.probeFormat.boss(dia, -5, probeFeed));
          } else if (feat.feature.toLowerCase().includes("web") || feat.feature.toLowerCase().includes("wall")) {
            const nom = parseFloat(feat.nominal) || 5;
            lines.push(tpl.probeFormat.webThickness(nom, probeFeed));
          } else {
            // Default single-surface probe
            lines.push(tpl.probeFormat.singleSurface("Z", parseFloat(feat.nominal) || 0, probeFeed));
          }
          features.push(`${feat.feature}: ${feat.nominal} ${feat.tolerance}`);
        }
      }
    }
    if (probeIdx === 0) {
      lines.push(makeComment(tpl, "NO CRITICAL FEATURES DEFINED FOR IN-PROCESS PROBING"));
    }
  } else if (type === "first_article") {
    // First-article inspection: probe all critical features after cutting
    lines.push(makeComment(tpl, "FIRST ARTICLE INSPECTION ROUTINE"));
    lines.push(makeComment(tpl, "RUN AFTER ALL CUTTING COMPLETE"));
    lines.push("");

    let inspIdx = 0;
    for (const op of operations) {
      if (op.critical_features) {
        for (const feat of op.critical_features) {
          inspIdx++;
          lines.push(makeComment(tpl, `FAI #${inspIdx}: ${feat.feature}`));
          lines.push(makeComment(tpl, `  NOM: ${feat.nominal}  TOL: ${feat.tolerance}  METHOD: ${feat.method}`));

          if (feat.feature.toLowerCase().includes("bore") || feat.feature.toLowerCase().includes("hole")) {
            lines.push(tpl.probeFormat.bore(parseFloat(feat.nominal) || 25, -10, probeFeed));
          } else if (feat.feature.toLowerCase().includes("boss")) {
            lines.push(tpl.probeFormat.boss(parseFloat(feat.nominal) || 25, -10, probeFeed));
          } else {
            lines.push(tpl.probeFormat.singleSurface("Z", parseFloat(feat.nominal) || 0, probeFeed));
          }
          features.push(`FAI: ${feat.feature}`);
        }
      }
    }
    if (inspIdx === 0) {
      lines.push(makeComment(tpl, "NO CRITICAL FEATURES - MANUAL INSPECTION REQUIRED"));
      features.push("Manual inspection required");
    }
  }

  lines.push(makeComment(tpl, `=== END PROBE ROUTINE: ${type.toUpperCase()} ===`));

  return {
    type,
    description: `${type.replace(/_/g, " ")} probe routine for ${tpl.family}`,
    gcode: lines.join("\n"),
    features,
  };
}

// ============================================================================
// U06 — AnalyticsReportGenerator: Per-program analytics as comments
// ============================================================================

function generateAnalytics(
  operations: OperationInfo[],
  input: OutputGenerationInput,
): ProgramAnalytics {
  let totalCycleTime = 0;
  let cuttingTime = 0;
  let originalTotal = 0;
  let optimizedTotal = 0;
  let totalToolLifeImprovement = 0;
  let opCount = 0;

  const perOp: ProgramAnalytics["per_operation"] = [];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const pd = op.physics_data;
    const opTime = pd?.cycle_time_sec ?? 60;
    const forceRange: [number, number] = pd?.force_range_N ?? [0, 0];
    const powerRange: [number, number] = pd?.power_range_kW ?? [0, 0];
    const toolLifePct = pd?.tool_life_consumed_percent ?? 0;

    totalCycleTime += opTime;
    cuttingTime += opTime * 0.75; // assume 75% cutting engagement
    originalTotal += pd?.original_cycle_sec ?? opTime;
    optimizedTotal += pd?.optimized_cycle_sec ?? opTime;

    if (pd?.tool_life_consumed_percent !== undefined) {
      totalToolLifeImprovement += Math.max(0, 100 - pd.tool_life_consumed_percent);
      opCount++;
    }

    perOp.push({
      op: i + 1,
      name: op.name,
      time_sec: opTime,
      force_range_N: forceRange,
      power_range_kW: powerRange,
      tool_life_consumed_percent: toolLifePct,
      predicted_ra_um: pd?.predicted_ra_um,
    });
  }

  // Add non-cutting time (tool changes, rapids, etc.)
  const toolChanges = new Set(operations.map((o) => o.tool_number)).size;
  const toolChangeTime = toolChanges * 8; // ~8 sec per tool change
  const rapidTime = totalCycleTime * 0.1; // ~10% of cycle for rapids
  const nonCuttingTime = toolChangeTime + rapidTime;
  totalCycleTime += nonCuttingTime;

  const timeSaved = originalTotal - optimizedTotal;
  const timeSavedPct = originalTotal > 0 ? (timeSaved / originalTotal) * 100 : 0;
  const avgToolLifeImprovement = opCount > 0 ? totalToolLifeImprovement / opCount : 0;

  const analytics: ProgramAnalytics = {
    total_cycle_time_sec: Math.round(totalCycleTime),
    cutting_time_sec: Math.round(cuttingTime),
    non_cutting_time_sec: Math.round(nonCuttingTime),
    per_operation: perOp,
    optimization_delta: {
      original_cycle_sec: Math.round(originalTotal),
      optimized_cycle_sec: Math.round(optimizedTotal),
      time_saved_sec: Math.round(timeSaved),
      time_saved_percent: Math.round(timeSavedPct * 10) / 10,
      tool_life_improvement_percent: Math.round(avgToolLifeImprovement * 10) / 10,
    },
  };

  // Cost estimate if machine rate provided
  if (input.machine_rate_per_hr) {
    const costPerPart = (totalCycleTime / 3600) * input.machine_rate_per_hr;
    analytics.cost_estimate = {
      machine_rate_per_hr: input.machine_rate_per_hr,
      cost_per_part: Math.round(costPerPart * 100) / 100,
      tool_cost_per_part: input.tool_cost_per_part ?? Math.round(costPerPart * 0.15 * 100) / 100,
    };
  }

  return analytics;
}

function formatAnalyticsAsComments(
  analytics: ProgramAnalytics,
  tpl: ControllerTemplate,
): string {
  const c = (text: string) => makeComment(tpl, text);
  const lines: string[] = [];

  lines.push(c("================================================================"));
  lines.push(c("  PRISM ANALYTICS REPORT"));
  lines.push(c("================================================================"));
  lines.push(c(`  TOTAL CYCLE TIME: ${formatTime(analytics.total_cycle_time_sec)}`));
  lines.push(c(`  CUTTING TIME:     ${formatTime(analytics.cutting_time_sec)}`));
  lines.push(c(`  NON-CUTTING TIME: ${formatTime(analytics.non_cutting_time_sec)}`));
  lines.push(c(""));

  for (const op of analytics.per_operation) {
    lines.push(c(`  OP${op.op} ${op.name}: ${formatTime(op.time_sec)}`));
    if (op.force_range_N[0] > 0 || op.force_range_N[1] > 0) {
      lines.push(c(`    Force: ${op.force_range_N[0].toFixed(0)}-${op.force_range_N[1].toFixed(0)} N`));
    }
    if (op.power_range_kW[0] > 0 || op.power_range_kW[1] > 0) {
      lines.push(c(`    Power: ${op.power_range_kW[0].toFixed(1)}-${op.power_range_kW[1].toFixed(1)} kW`));
    }
    if (op.tool_life_consumed_percent > 0) {
      lines.push(c(`    Tool Life Consumed: ${op.tool_life_consumed_percent.toFixed(1)}%`));
    }
    if (op.predicted_ra_um !== undefined) {
      lines.push(c(`    Predicted Ra: ${op.predicted_ra_um.toFixed(2)} um`));
    }
  }

  lines.push(c(""));
  lines.push(c("  OPTIMIZATION DELTA:"));
  lines.push(c(`    Original: ${formatTime(analytics.optimization_delta.original_cycle_sec)}`));
  lines.push(c(`    Optimized: ${formatTime(analytics.optimization_delta.optimized_cycle_sec)}`));
  lines.push(c(`    Time Saved: ${formatTime(analytics.optimization_delta.time_saved_sec)} (${analytics.optimization_delta.time_saved_percent}%)`));
  lines.push(c(`    Tool Life Improvement: ${analytics.optimization_delta.tool_life_improvement_percent}%`));

  if (analytics.cost_estimate) {
    lines.push(c(""));
    lines.push(c("  COST ESTIMATE:"));
    lines.push(c(`    Machine Rate: $${analytics.cost_estimate.machine_rate_per_hr}/hr`));
    lines.push(c(`    Cost/Part: $${analytics.cost_estimate.cost_per_part}`));
    lines.push(c(`    Tool Cost/Part: $${analytics.cost_estimate.tool_cost_per_part}`));
  }

  lines.push(c("================================================================"));

  return lines.join("\n");
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ============================================================================
// U07 — SetupSheetGenerator: Complete job package
// ============================================================================

function generateSetupSheet(
  input: OutputGenerationInput,
  tpl: ControllerTemplate,
  operations: OperationInfo[],
): SetupSheet {
  const progNum = String(input.program_number ?? 1).padStart(4, "0");
  const progName = input.program_name ?? "UNNAMED";

  const toolList: SetupSheet["tool_list"] = [];
  const seenTools = new Set<number>();
  for (const op of operations) {
    if (!seenTools.has(op.tool_number)) {
      seenTools.add(op.tool_number);
      toolList.push({
        tool_number: op.tool_number,
        description: op.tool_description,
        diameter_mm: op.tool_diameter_mm ?? 0,
        projection_mm: op.tool_projection_mm ?? 0,
        holder: op.holder ?? "STANDARD",
        offset_h: op.tool_number,
        offset_d: op.tool_number,
        notes: op.operation_type.includes("finish") ? "CHECK RUNOUT < 0.005mm" : "",
      });
    }
  }

  const wcsSetup: SetupSheet["wcs_setup"] = [];
  const seenWCS = new Set<string>();
  for (const op of operations) {
    const offset = op.wcs_offset ?? "G54";
    if (!seenWCS.has(offset)) {
      seenWCS.add(offset);
      wcsSetup.push({
        offset,
        x: 0,
        y: 0,
        z: 0,
        notes: `Probe ${offset} before running`,
      });
    }
  }
  if (wcsSetup.length === 0) {
    wcsSetup.push({ offset: "G54", x: 0, y: 0, z: 0, notes: "Probe G54 before running" });
  }

  const opSequence: SetupSheet["operation_sequence"] = operations.map((op, i) => ({
    op: i + 1,
    description: `${op.name} (${op.operation_type})`,
    tool: op.tool_number,
    notes: op.physics_data?.thermal_range_C
      ? `Thermal range: ${op.physics_data.thermal_range_C[0]}-${op.physics_data.thermal_range_C[1]}C`
      : "",
  }));

  const inspectionChecklist: SetupSheet["inspection_checklist"] = [];
  for (const op of operations) {
    if (op.critical_features) {
      inspectionChecklist.push(...op.critical_features);
    }
  }

  const notes: string[] = [
    `Controller: ${tpl.family.toUpperCase()} ${input.controller_variant ?? ""}`.trim(),
    `Generated: ${dateStamp()} by PRISM Pipeline Phase 6`,
  ];

  // Machine options notes
  const enabledOptions = Object.entries(input.machine_options)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  const disabledOptions = Object.entries(input.machine_options)
    .filter(([, v]) => v === false)
    .map(([k]) => k);

  if (enabledOptions.length > 0) {
    notes.push(`Machine options ENABLED: ${enabledOptions.join(", ")}`);
  }
  if (disabledOptions.length > 0) {
    notes.push(`Machine options DISABLED: ${disabledOptions.join(", ")}`);
  }

  return {
    program_info: {
      number: `O${progNum}`,
      name: progName,
      date: dateStamp(),
      machine: `${tpl.family.toUpperCase()} ${input.controller_variant ?? ""}`.trim(),
    },
    tool_list: toolList,
    wcs_setup: wcsSetup,
    operation_sequence: opSequence,
    inspection_checklist: inspectionChecklist,
    notes,
  };
}

// ============================================================================
// U08 — AutoProbeRoutineGenerator: Feature-based probe sequences
// ============================================================================

function generateAutoProbeRoutines(
  tpl: ControllerTemplate,
  operations: OperationInfo[],
  requestedTypes: Array<"wcs_setup" | "in_process" | "first_article">,
): ProbeRoutine[] {
  const routines: ProbeRoutine[] = [];

  for (const type of requestedTypes) {
    routines.push(generateProbeRoutine(tpl, type, operations));
  }

  return routines;
}

// ============================================================================
// U09 — ProgramSizeOptimizer: Split/optimize for memory-constrained CNC
// ============================================================================

interface SizeOptResult {
  mainProgram: string;
  subPrograms: string[];
  wasSplit: boolean;
  totalSize: number;
  warnings: string[];
}

function optimizeProgramSize(
  gcode: string,
  tpl: ControllerTemplate,
  memoryLimitKB: number | undefined,
  maxLineLength: number | undefined,
  progNum: number,
): SizeOptResult {
  const warnings: string[] = [];
  const fileSizeBytes = new TextEncoder().encode(gcode).length;
  const fileSizeKB = fileSizeBytes / 1024;
  const lines = gcode.split("\n");

  // Check max line length
  if (maxLineLength) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLineLength) {
        warnings.push(`Line ${i + 1} exceeds max length ${maxLineLength}: ${lines[i].length} chars`);
      }
    }
  }

  // If no memory limit or program fits, return as-is
  if (!memoryLimitKB || fileSizeKB <= memoryLimitKB) {
    return {
      mainProgram: gcode,
      subPrograms: [],
      wasSplit: false,
      totalSize: fileSizeBytes,
      warnings,
    };
  }

  // Split into subprograms at tool changes
  warnings.push(`Program size ${fileSizeKB.toFixed(1)}KB exceeds controller memory ${memoryLimitKB}KB — splitting`);

  const subPrograms: string[] = [];
  const mainLines: string[] = [];
  let currentSub: string[] = [];
  let subCount = 0;
  const subStartNum = progNum + 100;

  // Find tool-change boundaries to split on
  for (const line of lines) {
    const isToolChange =
      /\bT\d+\s*M0?6\b/.test(line) ||
      /\bM0?6\s*T\d+\b/.test(line) ||
      line.includes("TOOL CALL");

    if (isToolChange && currentSub.length > 10) {
      // Save current sub
      subCount++;
      const subNum = subStartNum + subCount;
      const subHeader = tpl.family === "heidenhain"
        ? [`BEGIN PGM SUB${subCount} MM`]
        : [`O${String(subNum).padStart(4, "0")} (SUB ${subCount})`];
      const subFooter = tpl.family === "heidenhain"
        ? ["END PGM"]
        : ["M99"];

      subPrograms.push([...subHeader, ...currentSub, ...subFooter].join("\n"));

      // Add subprogram call to main
      if (tpl.family === "heidenhain") {
        mainLines.push(`CALL PGM SUB${subCount}`);
      } else {
        mainLines.push(`M98 P${String(subNum).padStart(4, "0")}`);
      }

      currentSub = [line];
    } else {
      currentSub.push(line);
    }
  }

  // Remaining lines
  if (currentSub.length > 0) {
    if (subCount > 0) {
      subCount++;
      const subNum = subStartNum + subCount;
      const subHeader = tpl.family === "heidenhain"
        ? [`BEGIN PGM SUB${subCount} MM`]
        : [`O${String(subNum).padStart(4, "0")} (SUB ${subCount})`];
      const subFooter = tpl.family === "heidenhain"
        ? ["END PGM"]
        : ["M99"];

      subPrograms.push([...subHeader, ...currentSub, ...subFooter].join("\n"));

      if (tpl.family === "heidenhain") {
        mainLines.push(`CALL PGM SUB${subCount}`);
      } else {
        mainLines.push(`M98 P${String(subNum).padStart(4, "0")}`);
      }
    } else {
      mainLines.push(...currentSub);
    }
  }

  const mainGcode = mainLines.join("\n");
  const totalSize =
    new TextEncoder().encode(mainGcode).length +
    subPrograms.reduce((s, p) => s + new TextEncoder().encode(p).length, 0);

  return {
    mainProgram: mainGcode,
    subPrograms,
    wasSplit: subPrograms.length > 0,
    totalSize,
    warnings,
  };
}

// ============================================================================
// U10 — OperatorCommentInjector: Strategic comments + prove-out mode
// ============================================================================

function injectOperatorComments(
  gcode: string,
  tpl: ControllerTemplate,
  operations: OperationInfo[],
): string {
  const lines = gcode.split("\n");
  const result: string[] = [];
  let opIndex = 0;

  // Build a lookup of tool numbers to operation info
  const toolToOp = new Map<number, OperationInfo>();
  for (const op of operations) {
    toolToOp.set(op.tool_number, op);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect tool change lines
    const toolChangeMatch = trimmed.match(/\bT(\d+)\s*M0?6\b/) || trimmed.match(/\bM0?6\s*T(\d+)\b/);
    const heidenhainTool = trimmed.match(/TOOL\s+CALL\s+(\d+)/);
    const toolNum = toolChangeMatch
      ? parseInt(toolChangeMatch[1])
      : heidenhainTool
        ? parseInt(heidenhainTool[1])
        : null;

    if (toolNum !== null) {
      opIndex++;
      const op = toolToOp.get(toolNum);
      if (op) {
        result.push(makeComment(tpl, "========================================"));
        result.push(makeComment(tpl, `OP${opIndex}: ${op.name.toUpperCase()} - T${toolNum} ${op.tool_description}`));

        if (op.tool_projection_mm) {
          result.push(makeComment(tpl, `  PROJECTION: ${op.tool_projection_mm}mm - VERIFY BEFORE RUNNING`));
        }

        // Next tool preview
        const nextOps = operations.filter((o) => o.tool_number !== toolNum);
        if (opIndex < operations.length) {
          const nextOp = operations[opIndex]; // next operation
          if (nextOp) {
            result.push(makeComment(tpl, `  NEXT TOOL: T${nextOp.tool_number} - ${nextOp.tool_description}`));
          }
        }

        // Critical operation warnings
        if (op.operation_type.includes("thin_wall") || op.name.toLowerCase().includes("thin")) {
          result.push(makeComment(tpl, "  *** THIN WALL - LISTEN FOR CHATTER ***"));
        }
        if (op.operation_type.includes("finish")) {
          result.push(makeComment(tpl, "  *** FINISH PASS - CHECK SURFACE QUALITY ***"));
        }
        if (op.operation_type.includes("thread")) {
          result.push(makeComment(tpl, "  *** THREADING - VERIFY PITCH AND DEPTH ***"));
        }
        if (op.physics_data?.force_range_N && op.physics_data.force_range_N[1] > 2000) {
          result.push(makeComment(tpl, `  *** HIGH FORCE: ${op.physics_data.force_range_N[1].toFixed(0)}N - MONITOR CLOSELY ***`));
        }

        result.push(makeComment(tpl, "========================================"));
      }
    }

    result.push(line);
  }

  return result.join("\n");
}

function generateProveOut(
  gcode: string,
  tpl: ControllerTemplate,
  operations: OperationInfo[],
): string {
  const lines = gcode.split("\n");
  const result: string[] = [];

  result.push(makeComment(tpl, "*** PROVE-OUT MODE - 50% FEED OVERRIDE ***"));
  result.push(makeComment(tpl, "*** BLOCK DELETE SECTIONS FOR FIRST ARTICLE ***"));
  result.push("");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === "" || isComment(trimmed, tpl)) {
      result.push(line);
      continue;
    }

    // Reduce feed rates by 50% for prove-out
    const feedMatch = trimmed.match(/F(\d+\.?\d*)/);
    if (feedMatch) {
      const originalFeed = parseFloat(feedMatch[1]);
      const proveOutFeed = originalFeed * 0.5;
      const modifiedLine = line.replace(
        /F\d+\.?\d*/,
        `F${proveOutFeed.toFixed(1)}`,
      );
      result.push(modifiedLine);
      continue;
    }

    // Add block delete before rapid moves to Z positions (plunges)
    if (/G0?0\s/.test(trimmed) && /Z-/.test(trimmed)) {
      result.push(`/${line}`); // block delete prefix
      continue;
    }

    // Add optional stop after each tool change
    const isToolChange =
      /\bT\d+\s*M0?6\b/.test(trimmed) ||
      /\bM0?6\s*T\d+\b/.test(trimmed) ||
      trimmed.includes("TOOL CALL");

    if (isToolChange) {
      result.push(line);
      result.push(makeComment(tpl, "PROVE-OUT: OPTIONAL STOP AFTER TOOL CHANGE"));
      result.push("M01"); // optional stop
      continue;
    }

    result.push(line);
  }

  result.push("");
  result.push(makeComment(tpl, "*** END PROVE-OUT MODE ***"));

  return result.join("\n");
}

function isComment(line: string, tpl: ControllerTemplate): boolean {
  return (
    line.startsWith("(") ||
    line.startsWith(";") ||
    line.startsWith("%") ||
    line.startsWith("BEGIN") ||
    line.startsWith("END")
  );
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** PostOutputGenerationEngine — Pipeline Phase 6 final output formatter. */
export class PostOutputGenerationEngine {
  // --------------------------------------------------------------------------
  // ACTION: generate — Full pipeline: template + inject + translate + comments
  //   + analytics + probe + size optimize
  // --------------------------------------------------------------------------

  /**
   * Full output generation pipeline. Applies all enabled stages.
   *
   * @param input - Complete output generation input
   * @returns OutputGenerationResult with final gcode and all requested artifacts
   */
  generate(input: OutputGenerationInput): OutputGenerationResult {
    const tpl = resolveController(input.controller);
    const progNum = input.program_number ?? 1;
    const progName = input.program_name ?? "PRISM_PROGRAM";
    const operations = input.operations ?? [];

    // Stage 1: Property injection — strip/add codes per machine options
    const { gcode: injectedGcode } = injectProperties(
      input.optimized_gcode,
      input.machine_options,
    );

    // Stage 2: Dialect translation
    const translatedGcode = translateDialect(injectedGcode, tpl);

    // Stage 3: Operator comments
    let commentedGcode = translatedGcode;
    if (input.inject_operator_comments !== false && operations.length > 0) {
      commentedGcode = injectOperatorComments(commentedGcode, tpl, operations);
    }

    // Stage 4: Analytics (generate before embedding as comments)
    let analytics: ProgramAnalytics | undefined;
    if (input.generate_analytics !== false && operations.length > 0) {
      analytics = generateAnalytics(operations, input);
    }

    // Stage 5: Embed analytics as header comments
    let analyticsHeader = "";
    if (analytics) {
      analyticsHeader = formatAnalyticsAsComments(analytics, tpl);
    }

    // Stage 6: Apply controller template (header/footer wrapping)
    let wrappedGcode: string;
    if (analyticsHeader) {
      wrappedGcode = applyTemplate(
        analyticsHeader + "\n\n" + commentedGcode,
        tpl,
        progNum,
        progName,
      );
    } else {
      wrappedGcode = applyTemplate(commentedGcode, tpl, progNum, progName);
    }

    // Stage 7: Program size optimization
    let finalGcode = wrappedGcode;
    let wasSplit = false;
    let subprograms: string[] | undefined;

    if (input.optimize_program_size !== false) {
      const sizeResult = optimizeProgramSize(
        wrappedGcode,
        tpl,
        input.controller_memory_kb,
        input.max_line_length,
        progNum,
      );
      finalGcode = sizeResult.mainProgram;
      wasSplit = sizeResult.wasSplit;
      if (sizeResult.subPrograms.length > 0) {
        subprograms = sizeResult.subPrograms;
      }
    }

    // Stage 8: Prove-out generation
    let proveOutGcode: string | undefined;
    if (input.generate_prove_out) {
      proveOutGcode = generateProveOut(finalGcode, tpl, operations);
    }

    // Stage 9: Probe routines
    let probeRoutines: ProbeRoutine[] | undefined;
    if (input.generate_probe_routines && operations.length > 0) {
      const probeTypes: Array<"wcs_setup" | "in_process" | "first_article"> = [
        "wcs_setup",
        "in_process",
        "first_article",
      ];
      probeRoutines = generateAutoProbeRoutines(tpl, operations, probeTypes);
    }

    // Stage 10: Setup sheet
    let setupSheet: SetupSheet | undefined;
    if (input.generate_setup_sheet && operations.length > 0) {
      setupSheet = generateSetupSheet(input, tpl, operations);
    }

    // Compute final metrics
    const fileSizeBytes = new TextEncoder().encode(finalGcode).length;
    const lineCount = finalGcode.split("\n").length;

    return {
      final_gcode: finalGcode,
      prove_out_gcode: proveOutGcode,
      setup_sheet: setupSheet,
      probe_routines: probeRoutines,
      analytics,
      file_size_bytes: fileSizeBytes,
      line_count: lineCount,
      was_split: wasSplit,
      subprograms,
    };
  }

  // --------------------------------------------------------------------------
  // ACTION: format_only — Template + inject + translate only (no analytics/etc)
  // --------------------------------------------------------------------------

  /**
   * Format-only mode: applies template, property injection, and dialect
   * translation without analytics, setup sheets, or probe routines.
   *
   * @param input - Output generation input
   * @returns OutputGenerationResult with formatted gcode only
   */
  format_only(input: OutputGenerationInput): OutputGenerationResult {
    const tpl = resolveController(input.controller);
    const progNum = input.program_number ?? 1;
    const progName = input.program_name ?? "PRISM_PROGRAM";

    const { gcode: injectedGcode } = injectProperties(
      input.optimized_gcode,
      input.machine_options,
    );
    const translatedGcode = translateDialect(injectedGcode, tpl);
    const finalGcode = applyTemplate(translatedGcode, tpl, progNum, progName);

    const fileSizeBytes = new TextEncoder().encode(finalGcode).length;
    const lineCount = finalGcode.split("\n").length;

    return {
      final_gcode: finalGcode,
      file_size_bytes: fileSizeBytes,
      line_count: lineCount,
      was_split: false,
    };
  }

  // --------------------------------------------------------------------------
  // ACTION: setup_sheet — Generate setup sheet only
  // --------------------------------------------------------------------------

  /**
   * Generate a setup sheet for the program without modifying gcode.
   *
   * @param input - Output generation input with operations
   * @returns OutputGenerationResult containing only the setup_sheet
   */
  setup_sheet(input: OutputGenerationInput): OutputGenerationResult {
    const tpl = resolveController(input.controller);
    const operations = input.operations ?? [];

    const setupSheet = generateSetupSheet(input, tpl, operations);

    return {
      final_gcode: input.optimized_gcode,
      setup_sheet: setupSheet,
      file_size_bytes: new TextEncoder().encode(input.optimized_gcode).length,
      line_count: input.optimized_gcode.split("\n").length,
      was_split: false,
    };
  }

  // --------------------------------------------------------------------------
  // ACTION: analytics — Generate analytics only
  // --------------------------------------------------------------------------

  /**
   * Generate program analytics without modifying gcode.
   *
   * @param input - Output generation input with operations + physics data
   * @returns OutputGenerationResult containing only analytics
   */
  analytics(input: OutputGenerationInput): OutputGenerationResult {
    const operations = input.operations ?? [];
    const analytics = generateAnalytics(operations, input);

    return {
      final_gcode: input.optimized_gcode,
      analytics,
      file_size_bytes: new TextEncoder().encode(input.optimized_gcode).length,
      line_count: input.optimized_gcode.split("\n").length,
      was_split: false,
    };
  }

  // --------------------------------------------------------------------------
  // ACTION: prove_out — Generate prove-out version only
  // --------------------------------------------------------------------------

  /**
   * Generate prove-out version of program with 50% feeds and block deletes.
   *
   * @param input - Output generation input
   * @returns OutputGenerationResult with prove_out_gcode
   */
  prove_out(input: OutputGenerationInput): OutputGenerationResult {
    const tpl = resolveController(input.controller);
    const operations = input.operations ?? [];
    const proveOutGcode = generateProveOut(input.optimized_gcode, tpl, operations);

    return {
      final_gcode: input.optimized_gcode,
      prove_out_gcode: proveOutGcode,
      file_size_bytes: new TextEncoder().encode(input.optimized_gcode).length,
      line_count: input.optimized_gcode.split("\n").length,
      was_split: false,
    };
  }

  // --------------------------------------------------------------------------
  // UTILITY: resolveController — Expose controller resolution
  // --------------------------------------------------------------------------

  /**
   * Resolve a controller name string to its template configuration.
   *
   * @param controller - Controller name or alias
   * @returns ControllerTemplate for the resolved family
   */
  resolveController(controller: string): ControllerTemplate {
    return resolveController(controller);
  }

  /**
   * List all supported controller families and their aliases.
   *
   * @returns Array of controller family summaries
   */
  listControllers(): Array<{ family: ControllerFamily; aliases: string[] }> {
    return Object.values(CONTROLLER_TEMPLATES).map((t) => ({
      family: t.family,
      aliases: t.aliases,
    }));
  }

  /**
   * Generate a canned cycle for the given controller and parameters.
   *
   * @param controller - Controller name
   * @param params - Cycle parameters
   * @returns Formatted canned cycle gcode string
   */
  generateCannedCycle(controller: string, params: CycleParams): string {
    const tpl = resolveController(controller);
    return generateCannedCycle(tpl, params);
  }

  /**
   * Generate probe routines for the given controller and operations.
   *
   * @param controller - Controller name
   * @param operations - Operation list with critical features
   * @param types - Which probe routine types to generate
   * @returns Array of ProbeRoutine objects
   */
  generateProbeRoutines(
    controller: string,
    operations: OperationInfo[],
    types: Array<"wcs_setup" | "in_process" | "first_article">,
  ): ProbeRoutine[] {
    const tpl = resolveController(controller);
    return generateAutoProbeRoutines(tpl, operations, types);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** PostOutputGeneration Engine singleton.
 */
export const postOutputGenerationEngine = new PostOutputGenerationEngine();
