/**
 * PRISM MCP Server - G-Code Template Engine (R3-P3)
 *
 * Parametric G-code generation for CNC manufacturing.
 * Replaces 3,000–8,000 tokens per G-code generation with ~50-token invocations.
 *
 * Supported controllers (6):
 *   Fanuc, Haas, Mazak, Okuma  — Group A (Fanuc-like G-code)
 *   Siemens 840D               — Group B (CYCLE81/83/84/86 canned cycles)
 *   Heidenhain TNC             — Group C (CYCL DEF / TOOL CALL dialect)
 *
 * Supported operations (11):
 *   facing, drilling, peck_drilling, chip_break_drilling,
 *   tapping, boring, thread_milling, circular_pocket, profile,
 *   tool_change, program_header, program_footer, subprogram_call
 *
 * Exported API:
 *   generateGCode(controller, operation, params) → GCodeResult
 *   generateProgram(controller, operations[])   → GCodeResult (multi-op)
 *   resolveController(name)                     → ControllerConfig
 *   listControllers()                           → summary array
 *   listOperations()                            → GCodeOperation[]
 *
 * No external imports — pure computation.
 */

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type ControllerFamily =
  | "fanuc"
  | "haas"
  | "siemens"
  | "heidenhain"
  | "mazak"
  | "okuma";

export type GCodeOperation =
  | "facing"
  | "drilling"
  | "peck_drilling"
  | "chip_break_drilling"
  | "tapping"
  | "boring"
  | "thread_milling"
  | "circular_pocket"
  | "profile"
  | "tool_change"
  | "program_header"
  | "program_footer"
  | "subprogram_call";

export interface GCodeParams {
  // ---- Common ----
  tool_number?: number;
  rpm: number;
  feed_rate: number;           // mm/min
  coolant?: "flood" | "mist" | "tsc" | "off";
  z_safe?: number;             // default 5
  z_depth?: number;            // target Z (negative)
  work_offset?: string;        // default "G54"

  // ---- Drilling ----
  peck_depth?: number;         // mm per peck (G83/G73)
  dwell?: number;              // seconds at bottom

  // ---- Tapping ----
  pitch?: number;              // mm/rev

  // ---- Boring ----
  orient_angle?: number;       // spindle orient before retract (G76)
  shift_amount?: number;       // tool shift before retract (G76)

  // ---- Thread milling ----
  thread_diameter?: number;    // major diameter mm
  thread_pitch?: number;       // mm/rev
  thread_depth?: number;       // total Z depth mm
  thread_direction?: "right" | "left";

  // ---- Circular pocket ----
  pocket_diameter?: number;    // final pocket diameter mm
  pocket_depth?: number;       // total depth mm
  tool_diameter?: number;      // cutter diameter mm
  stepover_percent?: number;   // default 70

  // ---- Profile ----
  profile_points?: Array<{ x: number; y: number }>;
  comp_side?: "left" | "right";
  approach_type?: "arc" | "line";

  // ---- Positioning ----
  x_start?: number;
  y_start?: number;
  x_end?: number;
  y_end?: number;

  // ---- Program structure ----
  program_number?: number;
  program_name?: string;
  sub_program_number?: number;
  sub_repeats?: number;
}

export interface GCodeResult {
  controller: string;
  controller_family: ControllerFamily;
  operation: string;
  gcode: string;
  line_count: number;
  parameters_used: Record<string, unknown>;
  notes: string[];
  warnings: string[];
  estimated_cycle_time_sec?: number;
}

// ============================================================================
// INTERNAL CONTROLLER CONFIG INTERFACE
// ============================================================================

interface ControllerConfig {
  name: string;
  family: ControllerFamily;
  aliases: string[];
  comment: (text: string) => string;
  programStart: (num?: number, name?: string) => string[];
  programEnd: () => string[];
  toolChange: (tool: number, rpm: number, coolant?: string) => string[];
  spindleCW: (rpm: number) => string;
  spindleCCW: (rpm: number) => string;
  spindleStop: string;
  coolantOn: (type: string) => string;
  coolantOff: string;
  safetyLine: string;
  lengthComp: (tool: number) => string;
  cancelLengthComp: string;
  rapidXY: (x: number, y: number) => string;
  rapidZ: (z: number) => string;
  linearXY: (x: number, y: number, f: number) => string;
  linearZ: (z: number, f: number) => string;
  cutterCompLeft: (offset: number) => string;
  cutterCompRight: (offset: number) => string;
  cutterCompCancel: string;
  subCall: (num: number, repeats: number) => string;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/** Format a number to at most 3 decimal places, stripping trailing zeros. */
function fmt(n: number): string {
  return parseFloat(n.toFixed(3)).toString();
}

/** Build a GCodeResult from parts. */
function buildResult(
  ctrl: ControllerConfig,
  operation: string,
  lines: string[],
  params: GCodeParams,
  notes: string[],
  warnings: string[],
  cycle_time_sec?: number
): GCodeResult {
  const gcode = lines.join("\n");
  return {
    controller: ctrl.name,
    controller_family: ctrl.family,
    operation,
    gcode,
    line_count: lines.filter((l) => l.trim() !== "").length,
    parameters_used: params as Record<string, unknown>,
    notes,
    warnings,
    estimated_cycle_time_sec: cycle_time_sec,
  };
}

/** Resolve defaults for common params. */
function defaults(p: GCodeParams): Required<
  Pick<GCodeParams, "tool_number" | "coolant" | "z_safe" | "work_offset" | "x_start" | "y_start">
> {
  return {
    tool_number: p.tool_number ?? 1,
    coolant: p.coolant ?? "flood",
    z_safe: p.z_safe ?? 5,
    work_offset: p.work_offset ?? "G54",
    x_start: p.x_start ?? 0,
    y_start: p.y_start ?? 0,
  };
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validate machining parameters for safety.
 * Throws on unsafe values. Adds warnings for suspicious values.
 */
function validateParams(operation: string, p: GCodeParams, warnings: string[]): void {
  // Skip validation for structural operations
  if (["program_header", "program_footer", "subprogram_call"].includes(operation)) return;

  // RPM validation (except tool_change which may have 0)
  if (operation !== "tool_change") {
    if (p.rpm <= 0) throw new Error(`[GCodeTemplateEngine] Invalid RPM (${p.rpm}): must be > 0`);
    if (p.rpm > 60000) warnings.push(`RPM ${p.rpm} exceeds typical CNC range (>60,000)`);
  }

  // Feed rate validation
  if (operation !== "tool_change") {
    if (p.feed_rate <= 0) throw new Error(`[GCodeTemplateEngine] Invalid feed rate (${p.feed_rate}): must be > 0`);
    if (p.feed_rate > 50000) warnings.push(`Feed rate ${p.feed_rate} mm/min exceeds typical range`);
  }

  // Z_depth validation: must be negative for cutting operations
  if (p.z_depth !== undefined && p.z_depth > 0 && !["program_header", "program_footer", "subprogram_call", "tool_change"].includes(operation)) {
    warnings.push(`z_depth is positive (${p.z_depth}) — typically negative for cutting. Verify sign convention.`);
  }

  // Tool number bounds
  if (p.tool_number !== undefined && (p.tool_number < 1 || p.tool_number > 200)) {
    throw new Error(`[GCodeTemplateEngine] Invalid tool number (${p.tool_number}): must be 1-200`);
  }

  // Peck depth validation
  if (p.peck_depth !== undefined && p.peck_depth <= 0) {
    throw new Error(`[GCodeTemplateEngine] Invalid peck depth (${p.peck_depth}): must be > 0`);
  }

  // Pitch validation (tapping, thread milling)
  if (p.pitch !== undefined && p.pitch <= 0) {
    throw new Error(`[GCodeTemplateEngine] Invalid pitch (${p.pitch}): must be > 0`);
  }
  if (p.thread_pitch !== undefined && p.thread_pitch <= 0) {
    throw new Error(`[GCodeTemplateEngine] Invalid thread pitch (${p.thread_pitch}): must be > 0`);
  }

  // Thread milling: tool must be smaller than thread
  if (operation === "thread_milling" && p.tool_diameter && p.thread_diameter) {
    if (p.tool_diameter >= p.thread_diameter) {
      throw new Error(
        `[GCodeTemplateEngine] Tool diameter (${p.tool_diameter}) must be < thread diameter (${p.thread_diameter})`
      );
    }
  }

  // Circular pocket: tool must fit inside pocket
  if (operation === "circular_pocket" && p.tool_diameter && p.pocket_diameter) {
    if (p.tool_diameter >= p.pocket_diameter) {
      throw new Error(
        `[GCodeTemplateEngine] Tool diameter (${p.tool_diameter}) must be < pocket diameter (${p.pocket_diameter})`
      );
    }
  }

  // Z_safe must be non-negative — negative z_safe is a crash hazard on rapid approach
  if (p.z_safe !== undefined && p.z_safe < 0) {
    throw new Error(
      `[GCodeTemplateEngine] z_safe (${p.z_safe}) must be >= 0. ` +
      `Negative z_safe causes collision on rapid approach move.`
    );
  }
}

// ============================================================================
// CANNED CYCLE VALIDATION (Siemens / Heidenhain)
// ============================================================================

/**
 * Validate Siemens canned cycle parameters.
 * Checks: RTP > DP (return plane above depth), SDIS >= 0, peck > 0.
 */
function validateSiemensCycle(
  cycleName: string,
  rtp: number, rfp: number, sdis: number, dp: number,
  warnings: string[],
  peckDepth?: number
): void {
  if (rtp <= dp) {
    warnings.push(`${cycleName}: RTP (${fmt(rtp)}) must be above DP (${fmt(dp)}) — tool cannot retract`);
  }
  if (sdis < 0) {
    warnings.push(`${cycleName}: SDIS (${fmt(sdis)}) must be >= 0`);
  }
  if (rtp <= rfp) {
    warnings.push(`${cycleName}: RTP (${fmt(rtp)}) should be above RFP (${fmt(rfp)})`);
  }
  if (peckDepth !== undefined && peckDepth <= 0) {
    warnings.push(`${cycleName}: peck depth (${fmt(peckDepth)}) must be > 0`);
  }
}

/**
 * Validate Heidenhain CYCL DEF parameters.
 * Checks: SET UP > 0, DEPTH > 0, PECKG > 0, F > 0.
 */
function validateHeidenhainCycle(
  cycleName: string,
  setup: number, depth: number, feed: number,
  warnings: string[],
  peckDepth?: number
): void {
  if (setup <= 0) {
    warnings.push(`${cycleName}: SET UP (${fmt(setup)}) must be > 0`);
  }
  if (depth <= 0) {
    warnings.push(`${cycleName}: DEPTH (${fmt(depth)}) must be > 0`);
  }
  if (feed <= 0) {
    warnings.push(`${cycleName}: Feed (${fmt(feed)}) must be > 0`);
  }
  if (peckDepth !== undefined && peckDepth <= 0) {
    warnings.push(`${cycleName}: PECKG (${fmt(peckDepth)}) must be > 0`);
  }
}

// ============================================================================
// CONTROLLER CONFIGURATIONS — GROUP A (FANUC-LIKE)
// ============================================================================

/** Base Fanuc config — shared by Fanuc, Haas, Mazak, Okuma with small overrides. */
function buildFanucBase(
  name: string,
  family: ControllerFamily,
  aliases: string[],
  opts: {
    toolChangeSafety?: boolean; // Haas: G28 G91 Z0 before M6
    programStartPrefix?: string; // Mazak/Okuma prefix chars
  } = {}
): ControllerConfig {
  return {
    name,
    family,
    aliases,
    comment: (text) => `( ${text} )`,
    programStart: (num, name_) => {
      const lines: string[] = [];
      if (opts.programStartPrefix) lines.push(opts.programStartPrefix);
      const oNum = num ?? 1;
      lines.push(`O${String(oNum).padStart(4, "0")}`);
      if (name_) lines.push(`( ${name_} )`);
      return lines;
    },
    programEnd: () => ["M30", "%"],
    toolChange: (tool, rpm, coolant) => {
      const lines: string[] = [];
      // Always retract Z to machine zero before tool change (safety-critical)
      lines.push("G91 G28 Z0.");
      lines.push("G90");
      lines.push(`T${tool} M6`);
      lines.push(`G43 H${tool}`);
      lines.push(`S${rpm} M3`);
      if (coolant && coolant !== "off") {
        const m = coolant === "tsc" ? "M88" : coolant === "mist" ? "M7" : "M8";
        lines.push(m);
      }
      return lines;
    },
    spindleCW: (rpm) => `S${rpm} M3`,
    spindleCCW: (rpm) => `S${rpm} M4`,
    spindleStop: "M5",
    coolantOn: (type) =>
      type === "tsc" ? "M88" : type === "mist" ? "M7" : "M8",
    coolantOff: "M9",
    safetyLine: "G90 G94 G17 G21",
    lengthComp: (tool) => `G43 H${tool}`,
    cancelLengthComp: "G49",
    rapidXY: (x, y) => `G0 X${fmt(x)} Y${fmt(y)}`,
    rapidZ: (z) => `G0 Z${fmt(z)}`,
    linearXY: (x, y, f) => `G1 X${fmt(x)} Y${fmt(y)} F${fmt(f)}`,
    linearZ: (z, f) => `G1 Z${fmt(z)} F${fmt(f)}`,
    cutterCompLeft: (offset) => `G41 D${offset}`,
    cutterCompRight: (offset) => `G42 D${offset}`,
    cutterCompCancel: "G40",
    subCall: (num, repeats) =>
      `M98 P${String(num).padStart(4, "0")} L${repeats}`,
  };
}

const FANUC_CONFIG: ControllerConfig = buildFanucBase(
  "Fanuc",
  "fanuc",
  ["fanuc", "fanuc 0i", "fanuc 30i", "fanuc 31i", "fanuc 32i"]
);

const HAAS_CONFIG: ControllerConfig = {
  ...buildFanucBase("Haas", "haas", ["haas", "haas vf", "haas st"]),
  // All Fanuc-family controllers now retract Z before tool change
  safetyLine: "G90 G94 G17 G21",
};

const MAZAK_CONFIG: ControllerConfig = buildFanucBase(
  "Mazak",
  "mazak",
  ["mazak", "mazatrol", "mazak integrex", "mazak variaxis"],
  { programStartPrefix: "%" }
);

const OKUMA_CONFIG: ControllerConfig = buildFanucBase(
  "Okuma",
  "okuma",
  ["okuma", "osp", "okuma multus"]
);

// ============================================================================
// CONTROLLER CONFIGURATIONS — GROUP B (SIEMENS 840D)
// ============================================================================

const SIEMENS_CONFIG: ControllerConfig = {
  name: "Siemens",
  family: "siemens",
  aliases: ["siemens", "sinumerik", "840d", "840d sl", "828d"],
  comment: (text) => `; ${text}`,
  programStart: (num, name_) => {
    const lines: string[] = ["%"];
    const tag = name_ ?? (num ? `PROG_${num}` : "MAIN");
    lines.push(`; ${tag}`);
    return lines;
  },
  programEnd: () => ["M30", "%"],
  toolChange: (tool, rpm, coolant) => {
    const lines: string[] = [
      "SUPA G0 Z0",     // Retract to machine Z0 before tool change (safety-critical)
      `T${tool} D1`,
      "M6",
      `S${rpm} M3`,
    ];
    if (coolant && coolant !== "off") {
      const m = coolant === "tsc" ? "M88" : coolant === "mist" ? "M7" : "M8";
      lines.push(m);
    }
    return lines;
  },
  spindleCW: (rpm) => `S${rpm} M3`,
  spindleCCW: (rpm) => `S${rpm} M4`,
  spindleStop: "M5",
  coolantOn: (type) =>
    type === "tsc" ? "M88" : type === "mist" ? "M7" : "M8",
  coolantOff: "M9",
  safetyLine: "G90 G94 G17 G71",
  lengthComp: (_tool) => "; TL comp via D word",
  cancelLengthComp: "; cancel TL comp (D0 or tool retract)",
  rapidXY: (x, y) => `G0 X${fmt(x)} Y${fmt(y)}`,
  rapidZ: (z) => `G0 Z${fmt(z)}`,
  linearXY: (x, y, f) => `G1 X${fmt(x)} Y${fmt(y)} F${fmt(f)}`,
  linearZ: (z, f) => `G1 Z${fmt(z)} F${fmt(f)}`,
  cutterCompLeft: (offset) => `G41 D${offset}`,
  cutterCompRight: (offset) => `G42 D${offset}`,
  cutterCompCancel: "G40",
  subCall: (num, repeats) => `${String(num).padStart(4, "0")} P${repeats}`,
};

// ============================================================================
// CONTROLLER CONFIGURATIONS — GROUP C (HEIDENHAIN TNC)
// ============================================================================

const HEIDENHAIN_CONFIG: ControllerConfig = {
  name: "Heidenhain",
  family: "heidenhain",
  aliases: ["heidenhain", "tnc", "tnc 640", "tnc 620", "tnc 530", "itnc 530"],
  comment: (text) => `; ${text}`,
  programStart: (num, name_) => {
    const tag = name_ ?? (num ? `PGM_${num}` : "MAIN");
    return [`BEGIN PGM ${tag} MM`];
  },
  programEnd: () => ["END PGM MAIN MM"],
  toolChange: (tool, rpm, coolant) => {
    const lines: string[] = [
      "L Z+100 R0 FMAX M5",  // Retract Z + stop spindle before tool change (safety-critical)
      `TOOL CALL ${tool} Z S${rpm}`,
      "L Z+100 R0 FMAX",     // Position at safe Z after tool change
    ];
    if (coolant && coolant !== "off") {
      const m = coolant === "tsc" ? "M88" : coolant === "mist" ? "M7" : "M8";
      lines.push(m);
    }
    return lines;
  },
  spindleCW: (rpm) => `; Spindle CW S${rpm} (set in TOOL CALL)`,
  spindleCCW: (rpm) => `; Spindle CCW S${rpm} M4`,
  spindleStop: "M5",
  coolantOn: (type) =>
    type === "tsc" ? "M88" : type === "mist" ? "M7" : "M8",
  coolantOff: "M9",
  safetyLine: "; G90 abs, metric — set via BEGIN PGM",
  lengthComp: (_tool) => "; Length comp set via TOOL CALL",
  cancelLengthComp: "; Length comp canceled at END PGM",
  rapidXY: (x, y) => `L X${fmt(x)} Y${fmt(y)} R0 FMAX`,
  rapidZ: (z) => `L Z${fmt(z)} R0 FMAX`,
  linearXY: (x, y, f) => `L X${fmt(x)} Y${fmt(y)} R0 F${fmt(f)}`,
  linearZ: (z, f) => `L Z${fmt(z)} R0 F${fmt(f)}`,
  cutterCompLeft: (_offset) => "RL",
  cutterCompRight: (_offset) => "RR",
  cutterCompCancel: "R0",
  subCall: (num, repeats) => `CALL LBL ${num} REP ${repeats}`,
};

// ============================================================================
// CONTROLLER REGISTRY
// ============================================================================

const CONTROLLER_REGISTRY: ControllerConfig[] = [
  FANUC_CONFIG,
  HAAS_CONFIG,
  MAZAK_CONFIG,
  OKUMA_CONFIG,
  SIEMENS_CONFIG,
  HEIDENHAIN_CONFIG,
];

/** All supported controller aliases (lowercase). */
export const SUPPORTED_CONTROLLERS: string[] = CONTROLLER_REGISTRY.flatMap(
  (c) => c.aliases
);

/** All supported operations. */
export const SUPPORTED_OPERATIONS: GCodeOperation[] = [
  "facing",
  "drilling",
  "peck_drilling",
  "chip_break_drilling",
  "tapping",
  "boring",
  "thread_milling",
  "circular_pocket",
  "profile",
  "tool_change",
  "program_header",
  "program_footer",
  "subprogram_call",
];

// ============================================================================
// POST-PROCESSOR SOURCE FILE CATALOG (SAFETY-CRITICAL)
// ============================================================================
//
// CROSS-REFERENCE: PostProcessorRegistry.ts (src/registries/PostProcessorRegistry.ts)
// maintains a basic SOURCE_FILE_CATALOG array (lines 305-318) listing the same 12
// extracted JS files with { file, lines, description }.
//
// This enriched catalog adds safety classification, G-code role, category, and
// consumer traceability required by the G-Code Template Engine for safe post-
// processor wiring. Both catalogs MUST stay in sync when files are added or
// removed.
//
// WARNING -- SAFETY CRITICAL: Incorrect G-code generation can cause machine
// crashes, tool breakage, operator injury, or death. Every file listed below
// produces or validates CNC machine instructions. Changes require review.
// ============================================================================

export const POST_PROCESSOR_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  category: string;
  lines: number;
  safety_class: "CRITICAL";
  description: string;
  gcode_role: string;
  consumers: string[];
}> = {
  POST_PROCESSOR_100_PERCENT: {
    filename: "POST_PROCESSOR_100_PERCENT.js",
    category: "post_processing",
    lines: 1204,
    safety_class: "CRITICAL",
    description: "Complete post processor with G-code validator, multi-controller support, modal state tracking, and arc validation",
    gcode_role: "Full G-code validation pipeline -- validates modal state, arc geometry, feed/speed limits, and block structure across all controller families",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry", "SafetyValidationPipeline"],
  },
  POST_PROCESSOR_ENGINE_V2: {
    filename: "POST_PROCESSOR_ENGINE_V2.js",
    category: "post_processing",
    lines: 295,
    safety_class: "CRITICAL",
    description: "V2 post engine with controller-specific NC code generation for Fanuc, Siemens, Heidenhain, Mazak, Okuma",
    gcode_role: "Controller-specific NC block generation -- program format, decimal precision, modal groups, 5-axis TCP handling",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry"],
  },
  PRISM_GCODE_BACKPLOT_ENGINE: {
    filename: "PRISM_GCODE_BACKPLOT_ENGINE.js",
    category: "backplotting",
    lines: 862,
    safety_class: "CRITICAL",
    description: "G-code visualization/backplot engine for toolpath verification with material removal simulation",
    gcode_role: "Toolpath backplot and visual verification -- parses G-code into move segments, simulates material removal, detects collisions before machine execution",
    consumers: ["GCodeTemplateEngine", "ToolpathVerifier", "BackplotViewer"],
  },
  PRISM_GCODE_PROGRAMMING_ENGINE: {
    filename: "PRISM_GCODE_PROGRAMMING_ENGINE.js",
    category: "gcode_generation",
    lines: 127,
    safety_class: "CRITICAL",
    description: "RS-274D G-code programming reference and generator with full address code definitions",
    gcode_role: "G-code address code reference (A-Z) and RS-274D standard compliance -- defines precision, units, and semantics for every address letter",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry", "GCodeParser"],
  },
  PRISM_GUARANTEED_POST_PROCESSOR: {
    filename: "PRISM_GUARANTEED_POST_PROCESSOR.js",
    category: "post_processing",
    lines: 307,
    safety_class: "CRITICAL",
    description: "Guaranteed-safe post processor with 47 controller configurations at 100% confidence",
    gcode_role: "Conservative G-code generation with verified controller configs -- headers, footers, G/M-code mappings, and format strings for 47 controllers (12 Fanuc, 6 Haas, 8 Siemens, etc.)",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry", "SafetyValidationPipeline"],
  },
  PRISM_INTERNAL_POST_ENGINE: {
    filename: "PRISM_INTERNAL_POST_ENGINE.js",
    category: "post_processing",
    lines: 930,
    safety_class: "CRITICAL",
    description: "Internal post engine with Siemens/Heidenhain support and user selection collection",
    gcode_role: "End-to-end post processing pipeline -- collects machine/spindle/material selections, generates controller-specific NC programs with safety checks",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry", "MachineConfigUI"],
  },
  PRISM_POST_INTEGRATION_MODULE: {
    filename: "PRISM_POST_INTEGRATION_MODULE.js",
    category: "integration",
    lines: 676,
    safety_class: "CRITICAL",
    description: "Post processor integration module for CAM system bridging with real-time cutting parameter engine",
    gcode_role: "Real-time cutting parameter adjustment -- tracks radial/axial engagement, feed/speed history, and adapts G-code output to actual cutting conditions",
    consumers: ["GCodeTemplateEngine", "CuttingParameterEngine", "CAMBridge"],
  },
  PRISM_POST_OPTIMIZER: {
    filename: "PRISM_POST_OPTIMIZER.js",
    category: "optimization",
    lines: 121,
    safety_class: "CRITICAL",
    description: "G-code optimization engine for redundant move removal, rapid optimization, and arc fitting",
    gcode_role: "Post-generation G-code optimization -- removes redundant moves, optimizes rapid positioning, compresses output while preserving machining intent",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry"],
  },
  PRISM_POST_PROCESSOR_DATABASE_V2: {
    filename: "PRISM_POST_PROCESSOR_DATABASE_V2.js",
    category: "database",
    lines: 2717,
    safety_class: "CRITICAL",
    description: "Post processor database with 50+ controller configurations and G-Force physics engine for machine dynamics",
    gcode_role: "Master controller database and physics engine -- machine acceleration specs, cutting force calculations, feed/speed limits, and controller-specific G-code dialect definitions",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry", "PhysicsEngine", "FeedSpeedCalculator"],
  },
  PRISM_POST_PROCESSOR_ENGINE: {
    filename: "PRISM_POST_PROCESSOR_ENGINE.js",
    category: "post_processing",
    lines: 138,
    safety_class: "CRITICAL",
    description: "Core post processor engine base with CAM system database integration (HSMWorks, Mastercam, Fusion 360, SolidWorks)",
    gcode_role: "Post processor system orchestration -- manages CAM-specific post databases and controller dialect routing for multi-CAM workflows",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry", "CAMIntegration"],
  },
  PRISM_POST_PROCESSOR_GENERATOR: {
    filename: "PRISM_POST_PROCESSOR_GENERATOR.js",
    category: "gcode_generation",
    lines: 336,
    safety_class: "CRITICAL",
    description: "Post processor configuration generator with complete machine database (HAAS, DMG MORI, etc.)",
    gcode_role: "Machine-specific post processor generation -- builds post configs from machine specs including travels, spindle limits, rapid rates, and controller quirks",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry", "MachineDatabase"],
  },
  PRISM_RL_POST_PROCESSOR: {
    filename: "PRISM_RL_POST_PROCESSOR.js",
    category: "ai_enhanced",
    lines: 172,
    safety_class: "CRITICAL",
    description: "Reinforcement learning-based post optimization using Q-learning for adaptive G-code generation",
    gcode_role: "AI-adaptive G-code optimization -- learns optimal code patterns per controller through Q-table reinforcement, adapts output based on historical machine performance",
    consumers: ["GCodeTemplateEngine", "PostProcessorRegistry", "RLOptimizer"],
  },
};

// ============================================================================
// OPERATION GENERATORS
// ============================================================================

// ---- Facing ----------------------------------------------------------------

function genFacing(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const d = defaults(p);
  const warnings: string[] = [];
  const notes: string[] = [];

  const xStart = d.x_start;
  const yStart = d.y_start;
  const xEnd = p.x_end ?? xStart + 100;
  const yEnd = p.y_end ?? yStart + 100;
  const zDepth = p.z_depth ?? -0.5;
  const zSafe = d.z_safe;
  const stepover = p.tool_diameter ? p.tool_diameter * 0.75 : 10;

  if (!p.z_depth) warnings.push("z_depth not specified; defaulting to -0.5 mm");
  if (!p.tool_diameter) notes.push("tool_diameter not given; stepover estimated at 10 mm");

  const lines: string[] = [
    ctrl.comment("FACING OPERATION"),
    ...ctrl.toolChange(d.tool_number, p.rpm, d.coolant),
    ctrl.safetyLine,
    d.work_offset,
    ctrl.rapidXY(xStart, yStart),
    ctrl.lengthComp(d.tool_number),
    ctrl.rapidZ(zSafe),
    ctrl.comment("Begin facing passes"),
  ];

  const yPasses: number[] = [];
  let y = yStart;
  while (y <= yEnd + stepover) {
    yPasses.push(y);
    y += stepover;
  }

  for (let i = 0; i < yPasses.length; i++) {
    const yPos = yPasses[i];
    lines.push(ctrl.rapidXY(xStart, yPos));
    lines.push(ctrl.linearZ(zDepth, p.feed_rate * 0.5)); // plunge at half feed
    // Alternate direction for bi-directional facing
    if (i % 2 === 0) {
      lines.push(ctrl.linearXY(xEnd, yPos, p.feed_rate));
    } else {
      lines.push(ctrl.linearXY(xStart, yPos, p.feed_rate));
    }
    lines.push(ctrl.rapidZ(zSafe));
  }

  lines.push(ctrl.coolantOff);
  lines.push(ctrl.spindleStop);
  notes.push(`${yPasses.length} passes at ${fmt(stepover)} mm stepover`);

  const cycleTime = (yPasses.length * Math.abs(xEnd - xStart)) / p.feed_rate * 60;

  return buildResult(ctrl, "facing", lines, p, notes, warnings, cycleTime);
}

// ---- Drilling helpers -------------------------------------------------------

type DrillCycleType = "G81" | "G83" | "G73";

function genDrilling(
  ctrl: ControllerConfig,
  p: GCodeParams,
  cycleType: DrillCycleType = "G81"
): GCodeResult {
  const d = defaults(p);
  const warnings: string[] = [];
  const notes: string[] = [];

  const xPos = d.x_start;
  const yPos = d.y_start;
  const zDepth = p.z_depth ?? -20;
  const zSafe = d.z_safe;
  const rPlane = 2; // clearance above part

  if (!p.z_depth) warnings.push("z_depth not specified; defaulting to -20 mm");

  const opLabel: Record<DrillCycleType, string> = {
    G81: "STANDARD DRILLING",
    G83: "PECK DRILLING",
    G73: "CHIP-BREAK DRILLING",
  };

  const lines: string[] = [
    ctrl.comment(opLabel[cycleType]),
    ...ctrl.toolChange(d.tool_number, p.rpm, d.coolant),
    ctrl.safetyLine,
    d.work_offset,
    ctrl.lengthComp(d.tool_number),
    ctrl.rapidZ(zSafe),
    ctrl.rapidXY(xPos, yPos),
  ];

  if (ctrl.family === "siemens") {
    lines.push(...genSiemensDrillCycle(cycleType, zSafe, zDepth, p, notes, warnings));
  } else if (ctrl.family === "heidenhain") {
    lines.push(...genHeidenhainDrillCycle(cycleType, zSafe, zDepth, p, notes, warnings));
  } else {
    // Fanuc-family
    lines.push(...genFanucDrillCycle(cycleType, xPos, yPos, zDepth, rPlane, p, warnings));
    lines.push("G80");
    lines.push(ctrl.comment("Cancel canned cycle"));
  }

  lines.push(ctrl.rapidZ(zSafe));
  lines.push(ctrl.coolantOff);
  lines.push(ctrl.spindleStop);

  const depthMm = Math.abs(zDepth);
  const cycleTime = cycleType === "G83"
    ? (depthMm / (p.feed_rate / 60)) * 1.5  // peck overhead
    : depthMm / (p.feed_rate / 60);

  return buildResult(ctrl, cycleType === "G81" ? "drilling" : cycleType === "G83" ? "peck_drilling" : "chip_break_drilling",
    lines, p, notes, warnings, cycleTime);
}

function genFanucDrillCycle(
  type: DrillCycleType,
  x: number, y: number,
  zDepth: number, rPlane: number,
  p: GCodeParams, warnings: string[]
): string[] {
  const q = p.peck_depth ?? Math.abs(zDepth) * 0.25;
  if ((type === "G83" || type === "G73") && !p.peck_depth) {
    warnings.push(`peck_depth not specified; defaulting to ${fmt(q)} mm (25% of depth)`);
  }
  const dwellStr = p.dwell ? ` P${Math.round(p.dwell * 1000)}` : "";

  switch (type) {
    case "G81":
      return [`G81 X${fmt(x)} Y${fmt(y)} Z${fmt(zDepth)} R${fmt(rPlane)} F${fmt(p.feed_rate)}${dwellStr}`];
    case "G83":
      return [`G83 X${fmt(x)} Y${fmt(y)} Z${fmt(zDepth)} R${fmt(rPlane)} Q${fmt(q)} F${fmt(p.feed_rate)}${dwellStr}`];
    case "G73":
      return [`G73 X${fmt(x)} Y${fmt(y)} Z${fmt(zDepth)} R${fmt(rPlane)} Q${fmt(q)} F${fmt(p.feed_rate)}${dwellStr}`];
  }
}

function genSiemensDrillCycle(
  type: DrillCycleType,
  zSafe: number, zDepth: number,
  p: GCodeParams, notes: string[], warnings?: string[]
): string[] {
  // CYCLE81(RTP, RFP, SDIS, DP, [DPR], [DTB])
  // CYCLE83(RTP, RFP, SDIS, DP, DPR, DTB, FRF, VARI)
  const sdis = 0.5;  // safety distance above reference plane
  const rfp = 0;     // reference plane (Z0 at part surface)
  const dwell = p.dwell ?? 0;
  const w = warnings ?? [];

  switch (type) {
    case "G81":
      validateSiemensCycle("CYCLE81", zSafe, rfp, sdis, zDepth, w);
      notes.push("Siemens CYCLE81: standard drill");
      return [`CYCLE81(${fmt(zSafe)}, ${fmt(rfp)}, ${fmt(sdis)}, ${fmt(zDepth)})`];
    case "G83": {
      const q = p.peck_depth ?? Math.abs(zDepth) * 0.25;
      validateSiemensCycle("CYCLE83", zSafe, rfp, sdis, zDepth, w, q);
      notes.push("Siemens CYCLE83: peck drill (VARI=0, full retract)");
      return [`CYCLE83(${fmt(zSafe)}, ${fmt(rfp)}, ${fmt(sdis)}, ${fmt(zDepth)}, , ${fmt(dwell)}, 1, 0, , ${fmt(q)})`];
    }
    case "G73": {
      const q = p.peck_depth ?? Math.abs(zDepth) * 0.25;
      validateSiemensCycle("CYCLE83", zSafe, rfp, sdis, zDepth, w, q);
      notes.push("Siemens CYCLE83: chip-break (VARI=1, partial retract)");
      return [`CYCLE83(${fmt(zSafe)}, ${fmt(rfp)}, ${fmt(sdis)}, ${fmt(zDepth)}, , ${fmt(dwell)}, 1, 1, , ${fmt(q)})`];
    }
  }
}

function genHeidenhainDrillCycle(
  type: DrillCycleType,
  zSafe: number, zDepth: number,
  p: GCodeParams, notes: string[], warnings?: string[]
): string[] {
  const peckDepth = p.peck_depth ?? Math.abs(zDepth) * 0.25;
  const dwell = p.dwell ?? 0;
  const absDepth = Math.abs(zDepth);
  const w = warnings ?? [];

  const cycleLabel: Record<DrillCycleType, string> = {
    G81: "DRILLING",
    G83: "PECKING",
    G73: "CHIP BREAKING",
  };

  validateHeidenhainCycle(`CYCL DEF 1.0 ${cycleLabel[type]}`, zSafe, absDepth, p.feed_rate, w, peckDepth);
  notes.push(`Heidenhain CYCL DEF 1.0: ${cycleLabel[type]}`);

  return [
    `CYCL DEF 1.0 ${cycleLabel[type]}`,
    `CYCL DEF 1.1 SET UP ${fmt(zSafe)}`,
    `CYCL DEF 1.2 DEPTH ${fmt(absDepth)}`,
    `CYCL DEF 1.3 PECKG ${fmt(peckDepth)}`,
    `CYCL DEF 1.4 DWELL ${fmt(dwell)}`,
    `CYCL DEF 1.5 F${fmt(p.feed_rate)}`,
    "CYCL CALL",
  ];
}

// ---- Tapping ---------------------------------------------------------------

function genTapping(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const d = defaults(p);
  const warnings: string[] = [];
  const notes: string[] = [];

  const xPos = d.x_start;
  const yPos = d.y_start;
  const zDepth = p.z_depth ?? -20;
  const zSafe = d.z_safe;
  const pitch = p.pitch ?? 1.5;
  const rPlane = 2;

  if (!p.pitch) warnings.push("pitch not specified; defaulting to 1.5 mm (M10 coarse)");
  if (!p.z_depth) warnings.push("z_depth not specified; defaulting to -20 mm");

  // For rigid tapping: F = S × pitch
  const tapFeed = p.rpm * pitch;

  const lines: string[] = [
    ctrl.comment("RIGID TAPPING"),
    ...ctrl.toolChange(d.tool_number, p.rpm, d.coolant),
    ctrl.safetyLine,
    d.work_offset,
    ctrl.lengthComp(d.tool_number),
    ctrl.rapidZ(zSafe),
    ctrl.rapidXY(xPos, yPos),
  ];

  if (ctrl.family === "siemens") {
    validateSiemensCycle("CYCLE84", zSafe, 0, 0.5, zDepth, warnings);
    notes.push("Siemens CYCLE84: rigid tap");
    lines.push(
      `CYCLE84(${fmt(zSafe)}, 0, 0.5, ${fmt(zDepth)}, , 0, 3, , ${fmt(pitch)})`
    );
  } else if (ctrl.family === "heidenhain") {
    validateHeidenhainCycle("CYCL DEF 2.0 TAPPING", zSafe, Math.abs(zDepth), tapFeed, warnings);
    notes.push("Heidenhain CYCL DEF 2.0: tapping");
    lines.push(
      "CYCL DEF 2.0 TAPPING",
      `CYCL DEF 2.1 SET UP ${fmt(zSafe)}`,
      `CYCL DEF 2.2 DEPTH ${fmt(Math.abs(zDepth))}`,
      `CYCL DEF 2.3 DWELL ${fmt(p.dwell ?? 0)}`,
      `CYCL DEF 2.4 F${fmt(tapFeed)}`,
      "CYCL CALL"
    );
  } else {
    // Fanuc-family rigid tap — M29 enables rigid mode
    lines.push(
      `M29 S${p.rpm}`,
      ctrl.comment("M29 = Rigid tap mode"),
      `G84 X${fmt(xPos)} Y${fmt(yPos)} Z${fmt(zDepth)} R${fmt(rPlane)} F${fmt(tapFeed)}`,
      "G80",
      ctrl.comment("Cancel canned cycle")
    );
    notes.push(`Tap feed = ${fmt(tapFeed)} mm/min (S${p.rpm} × pitch ${fmt(pitch)})`);
  }

  lines.push(ctrl.rapidZ(zSafe));
  lines.push(ctrl.coolantOff);
  lines.push(ctrl.spindleStop);

  const cycleTime = Math.abs(zDepth) / (tapFeed / 60) * 2; // down + retract
  return buildResult(ctrl, "tapping", lines, p, notes, warnings, cycleTime);
}

// ---- Boring ----------------------------------------------------------------

function genBoring(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const d = defaults(p);
  const warnings: string[] = [];
  const notes: string[] = [];

  const xPos = d.x_start;
  const yPos = d.y_start;
  const zDepth = p.z_depth ?? -20;
  const zSafe = d.z_safe;
  const rPlane = 2;
  const orientAngle = p.orient_angle ?? 0;
  const shiftAmt = p.shift_amount ?? 0.1;

  if (!p.z_depth) warnings.push("z_depth not specified; defaulting to -20 mm");

  const lines: string[] = [
    ctrl.comment("FINE BORING (G76 type — orient + shift retract)"),
    ...ctrl.toolChange(d.tool_number, p.rpm, d.coolant),
    ctrl.safetyLine,
    d.work_offset,
    ctrl.lengthComp(d.tool_number),
    ctrl.rapidZ(zSafe),
    ctrl.rapidXY(xPos, yPos),
  ];

  if (ctrl.family === "siemens") {
    validateSiemensCycle("CYCLE86", zSafe, 0, 0.5, zDepth, warnings);
    if (orientAngle < 0 || orientAngle > 360) {
      warnings.push(`CYCLE86: orient_angle (${fmt(orientAngle)}) should be 0-360°`);
    }
    notes.push("Siemens CYCLE86: boring with oriented spindle stop");
    lines.push(
      `CYCLE86(${fmt(zSafe)}, 0, 0.5, ${fmt(zDepth)}, 0, 3, ${fmt(orientAngle)}, 1, ${fmt(shiftAmt)}, 0)`
    );
  } else if (ctrl.family === "heidenhain") {
    validateHeidenhainCycle("CYCL DEF 4.0 BORING", zSafe, Math.abs(zDepth), p.feed_rate, warnings);
    notes.push("Heidenhain CYCL DEF 4.0: boring");
    lines.push(
      "CYCL DEF 4.0 BORING",
      `CYCL DEF 4.1 SET UP ${fmt(zSafe)}`,
      `CYCL DEF 4.2 DEPTH ${fmt(Math.abs(zDepth))}`,
      `CYCL DEF 4.3 DWELL ${fmt(p.dwell ?? 0)}`,
      `CYCL DEF 4.4 F${fmt(p.feed_rate)}`,
      `CYCL DEF 4.5 DR +${fmt(shiftAmt)}`,
      "CYCL CALL"
    );
  } else {
    // Fanuc G76 fine bore
    lines.push(
      `G76 X${fmt(xPos)} Y${fmt(yPos)} Z${fmt(zDepth)} R${fmt(rPlane)} Q${fmt(shiftAmt)} F${fmt(p.feed_rate)}`,
      ctrl.comment(`Q = shift amount ${fmt(shiftAmt)} mm before retract`),
      "G80",
      ctrl.comment("Cancel canned cycle")
    );
    notes.push(`Spindle orients to ${fmt(orientAngle)}° before retract shift of ${fmt(shiftAmt)} mm`);
  }

  lines.push(ctrl.rapidZ(zSafe));
  lines.push(ctrl.coolantOff);
  lines.push(ctrl.spindleStop);

  const cycleTime = Math.abs(zDepth) / (p.feed_rate / 60) * 2;
  return buildResult(ctrl, "boring", lines, p, notes, warnings, cycleTime);
}

// ---- Thread Milling --------------------------------------------------------

function genThreadMilling(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const d = defaults(p);
  const warnings: string[] = [];
  const notes: string[] = [];

  const xCenter = d.x_start;
  const yCenter = d.y_start;
  const threadDia = p.thread_diameter ?? 20;
  const threadPitch = p.thread_pitch ?? p.pitch ?? 1.5;
  const threadDepth = p.thread_depth ?? (p.z_depth ? Math.abs(p.z_depth) : 15);
  const toolDia = p.tool_diameter ?? 6;
  const zSafe = d.z_safe;
  const direction = p.thread_direction ?? "right";

  if (!p.thread_diameter) warnings.push("thread_diameter not specified; defaulting to 20 mm");
  if (!p.thread_pitch && !p.pitch) warnings.push("thread_pitch not specified; defaulting to 1.5 mm");

  // Thread milling radius = (thread major dia - tool dia) / 2
  const millingRadius = (threadDia - toolDia) / 2;
  if (millingRadius <= 0) {
    warnings.push("Tool diameter >= thread diameter — impossible cut, check parameters");
  }

  // Thread milling helix direction (standard CNC convention):
  //   Right-hand thread descending: G02 (CW spiral viewed from +Z)
  //   Left-hand thread descending:  G03 (CCW spiral viewed from +Z)
  const helixCode = direction === "right" ? "G02" : "G03";
  const approachCode = direction === "right" ? "G03" : "G02";

  // Z start: one pitch above bottom of thread
  const zThreadStart = -(threadDepth) + threadPitch;
  const zThreadEnd = -threadDepth;

  // Number of helix revolutions needed
  const numRevs = Math.ceil(threadDepth / threadPitch);
  const zPerRev = threadPitch;

  notes.push(`Thread milling: ${threadDia} mm dia × ${threadPitch} mm pitch × ${threadDepth} mm deep`);
  notes.push(`Milling radius: ${fmt(millingRadius)} mm, ${numRevs} revolutions`);
  notes.push(`Helix direction: ${helixCode} (${direction}-hand thread)`);

  const lines: string[] = [
    ctrl.comment("THREAD MILLING — HELICAL INTERPOLATION"),
    ...ctrl.toolChange(d.tool_number, p.rpm, d.coolant),
    ctrl.safetyLine,
    d.work_offset,
    ctrl.lengthComp(d.tool_number),
    ctrl.rapidXY(xCenter, yCenter),
    ctrl.rapidZ(zSafe),
    ctrl.comment("Plunge to thread start Z"),
    ctrl.linearZ(zThreadStart, p.feed_rate * 0.3),
    ctrl.comment("Arc approach to thread diameter"),
    // Approach: move to start position on X offset then arc in
    ctrl.rapidXY(xCenter + millingRadius, yCenter),
  ];

  if (ctrl.family === "heidenhain") {
    // Heidenhain helical interpolation uses CC and C blocks
    lines.push(
      `CC X${fmt(xCenter)} Y${fmt(yCenter)}`,
      ctrl.comment(`Helical thread cut — ${numRevs} revolutions`),
      `C X${fmt(xCenter + millingRadius)} Y${fmt(yCenter)} DR${direction === "right" ? "-" : "+"} F${fmt(p.feed_rate)} Z${fmt(zThreadEnd)}`
    );
  } else {
    // Fanuc/Siemens: helical G02/G03 with I/J/K or R + Z progression
    lines.push(ctrl.comment(`Helical cut: ${numRevs} revolutions @ ${fmt(zPerRev)} mm/rev`));

    // Full helical move — specify center offsets I J and Z end
    const i = -millingRadius; // I = center X relative to arc start
    const j = 0;
    lines.push(
      `${helixCode} I${fmt(i)} J${fmt(j)} Z${fmt(zThreadEnd)} F${fmt(p.feed_rate)}`
    );
  }

  // Retract to center
  lines.push(ctrl.comment("Retract to center"));
  lines.push(ctrl.rapidXY(xCenter, yCenter));
  lines.push(ctrl.rapidZ(zSafe));
  lines.push(ctrl.coolantOff);
  lines.push(ctrl.spindleStop);

  const cycleTime = (numRevs * Math.PI * threadDia) / (p.feed_rate / 60);
  return buildResult(ctrl, "thread_milling", lines, p, notes, warnings, cycleTime);
}

// ---- Circular Pocket -------------------------------------------------------

function genCircularPocket(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const d = defaults(p);
  const warnings: string[] = [];
  const notes: string[] = [];

  const xCenter = d.x_start;
  const yCenter = d.y_start;
  const pocketDia = p.pocket_diameter ?? 50;
  const pocketDepth = p.pocket_depth ?? p.z_depth ? Math.abs(p.z_depth ?? 10) : 10;
  const toolDia = p.tool_diameter ?? 10;
  const zSafe = d.z_safe;
  const stepoverPct = p.stepover_percent ?? 70;
  const stepover = toolDia * (stepoverPct / 100);

  if (!p.pocket_diameter) warnings.push("pocket_diameter not specified; defaulting to 50 mm");
  if (!p.tool_diameter) warnings.push("tool_diameter not specified; defaulting to 10 mm");

  const maxRadius = (pocketDia - toolDia) / 2;
  if (maxRadius <= 0) {
    warnings.push("Tool diameter >= pocket diameter — use a smaller tool");
  }

  // Axial depth per pass (max = tool_dia * 0.5 for roughing)
  const axialPerPass = toolDia * 0.5;
  const numZPasses = Math.ceil(pocketDepth / axialPerPass);
  const zStep = pocketDepth / numZPasses;

  notes.push(`Circular pocket: ${fmt(pocketDia)} mm dia × ${fmt(pocketDepth)} mm deep`);
  notes.push(`${numZPasses} axial passes × ${fmt(zStep)} mm`);

  if (ctrl.family === "heidenhain") {
    // Heidenhain CYCL DEF 5.0
    notes.push("Heidenhain CYCL DEF 5.0: circular pocket");
    const lines: string[] = [
      ctrl.comment("CIRCULAR POCKET — HEIDENHAIN CYCLE 5"),
      ...ctrl.toolChange(d.tool_number, p.rpm, d.coolant),
      ctrl.safetyLine,
      ctrl.rapidXY(xCenter, yCenter),
      ctrl.rapidZ(zSafe),
      "CYCL DEF 5.0 CIRCULAR POCKET",
      `CYCL DEF 5.1 SET UP ${fmt(zSafe)}`,
      `CYCL DEF 5.2 DEPTH ${fmt(pocketDepth)}`,
      `CYCL DEF 5.3 PECKG ${fmt(axialPerPass)} F${fmt(p.feed_rate * 0.3)}`,
      `CYCL DEF 5.4 RADIUS ${fmt(pocketDia / 2)}`,
      `CYCL DEF 5.5 F${fmt(p.feed_rate)} DR+`,
      "CYCL CALL",
      ctrl.rapidZ(zSafe),
      ctrl.coolantOff,
      ctrl.spindleStop,
    ];
    return buildResult(ctrl, "circular_pocket", lines, p, notes, warnings);
  }

  // Fanuc/Siemens: programmed spiral-out
  const lines: string[] = [
    ctrl.comment("CIRCULAR POCKET — PROGRAMMED SPIRAL"),
    ...ctrl.toolChange(d.tool_number, p.rpm, d.coolant),
    ctrl.safetyLine,
    d.work_offset,
    ctrl.lengthComp(d.tool_number),
    ctrl.rapidXY(xCenter, yCenter),
    ctrl.rapidZ(zSafe),
  ];

  for (let pass = 1; pass <= numZPasses; pass++) {
    const zCurrent = -(pass * zStep);
    lines.push(ctrl.comment(`Z pass ${pass}/${numZPasses} — Z${fmt(zCurrent)}`));
    lines.push(ctrl.linearZ(zCurrent, p.feed_rate * 0.3)); // plunge feed

    // Spiral from center outward
    let radius = stepover;
    while (radius <= maxRadius) {
      // Move to radius start
      lines.push(ctrl.linearXY(xCenter + radius, yCenter, p.feed_rate));
      // Full circle G02 CW at this radius
      if (ctrl.family === "siemens") {
        lines.push(`G2 X${fmt(xCenter + radius)} Y${fmt(yCenter)} I${fmt(-radius)} J0 F${fmt(p.feed_rate)}`);
      } else {
        lines.push(`G2 X${fmt(xCenter + radius)} Y${fmt(yCenter)} I${fmt(-radius)} J0 F${fmt(p.feed_rate)}`);
      }
      radius += stepover;
    }

    // Finish pass at full radius
    if (maxRadius > 0) {
      lines.push(ctrl.linearXY(xCenter + maxRadius, yCenter, p.feed_rate));
      lines.push(
        ctrl.family === "siemens"
          ? `G2 X${fmt(xCenter + maxRadius)} Y${fmt(yCenter)} I${fmt(-maxRadius)} J0 F${fmt(p.feed_rate)}`
          : `G2 X${fmt(xCenter + maxRadius)} Y${fmt(yCenter)} I${fmt(-maxRadius)} J0 F${fmt(p.feed_rate)}`
      );
    }

    // Return to center
    lines.push(ctrl.linearXY(xCenter, yCenter, p.feed_rate));
  }

  lines.push(ctrl.rapidZ(zSafe));
  lines.push(ctrl.coolantOff);
  lines.push(ctrl.spindleStop);

  const cycleTime = numZPasses * ((Math.PI * pocketDia) / (p.feed_rate / 60));
  return buildResult(ctrl, "circular_pocket", lines, p, notes, warnings, cycleTime);
}

// ---- Profile with Cutter Comp ----------------------------------------------

function genProfile(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const d = defaults(p);
  const warnings: string[] = [];
  const notes: string[] = [];

  const zDepth = p.z_depth ?? -5;
  const zSafe = d.z_safe;
  const compSide = p.comp_side ?? "left";
  const approachType = p.approach_type ?? "arc";
  const toolNum = d.tool_number;
  const toolDia = p.tool_diameter ?? 10;

  const points = p.profile_points ?? [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 },
    { x: 0, y: 50 },
    { x: 0, y: 0 },
  ];

  if (!p.profile_points) warnings.push("profile_points not specified; using default square 100×50 mm");
  if (!p.z_depth) warnings.push("z_depth not specified; defaulting to -5 mm");

  const compCode = compSide === "left"
    ? ctrl.cutterCompLeft(toolNum)
    : ctrl.cutterCompRight(toolNum);

  const firstPoint = points[0];
  const approachOffset = toolDia * 1.2;

  notes.push(`Cutter comp: ${compSide === "left" ? "G41" : "G42"} (D${toolNum})`);
  notes.push(`Approach: ${approachType}`);

  const lines: string[] = [
    ctrl.comment(`PROFILE — CUTTER COMP ${compSide.toUpperCase()}`),
    ...ctrl.toolChange(toolNum, p.rpm, d.coolant),
    ctrl.safetyLine,
    d.work_offset,
    ctrl.lengthComp(toolNum),
    ctrl.rapidZ(zSafe),
    ctrl.rapidXY(firstPoint.x - approachOffset, firstPoint.y),
    ctrl.linearZ(zDepth, p.feed_rate * 0.3),
    ctrl.comment("Activate cutter compensation"),
  ];

  if (ctrl.family === "heidenhain") {
    // Heidenhain: comp is part of L block
    const rlrr = compSide === "left" ? "RL" : "RR";
    lines.push(ctrl.comment(`Heidenhain: ${rlrr} on first profile move`));
    lines.push(
      `L X${fmt(firstPoint.x)} Y${fmt(firstPoint.y)} ${rlrr} F${fmt(p.feed_rate)}`
    );
    for (let i = 1; i < points.length; i++) {
      lines.push(`L X${fmt(points[i].x)} Y${fmt(points[i].y)} R0 F${fmt(p.feed_rate)}`);
    }
    lines.push(`L X${fmt(firstPoint.x - approachOffset)} Y${fmt(firstPoint.y)} R0 F${fmt(p.feed_rate)}`);
  } else {
    // Fanuc / Siemens
    if (approachType === "arc") {
      // Arc lead-in: activate comp during arc approach
      lines.push(`${compCode}`);
      lines.push(ctrl.comment("Arc lead-in to first profile point"));
      // G03 quarter-circle approach from left of first point
      const arcR = approachOffset;
      lines.push(
        `G3 X${fmt(firstPoint.x)} Y${fmt(firstPoint.y)} R${fmt(arcR)} F${fmt(p.feed_rate)}`
      );
    } else {
      // Linear lead-in
      lines.push(`${compCode}`);
      lines.push(ctrl.linearXY(firstPoint.x, firstPoint.y, p.feed_rate));
    }

    // Profile points
    for (let i = 1; i < points.length; i++) {
      lines.push(ctrl.linearXY(points[i].x, points[i].y, p.feed_rate));
    }

    // Cancel comp with lead-out
    lines.push(ctrl.comment("Cancel cutter compensation"));
    lines.push(ctrl.cutterCompCancel);
    lines.push(ctrl.linearXY(firstPoint.x - approachOffset, firstPoint.y, p.feed_rate));
  }

  lines.push(ctrl.rapidZ(zSafe));
  lines.push(ctrl.coolantOff);
  lines.push(ctrl.spindleStop);

  // Rough cycle time estimate from perimeter
  let perimeter = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  const cycleTime = perimeter / (p.feed_rate / 60);
  return buildResult(ctrl, "profile", lines, p, notes, warnings, cycleTime);
}

// ---- Tool Change -----------------------------------------------------------

function genToolChange(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const d = defaults(p);
  const notes: string[] = [];
  const warnings: string[] = [];

  const lines: string[] = [
    ctrl.comment(`TOOL CHANGE — T${d.tool_number}`),
    ...ctrl.toolChange(d.tool_number, p.rpm, d.coolant),
  ];

  notes.push(`Tool ${d.tool_number}, S${p.rpm} RPM, ${d.coolant} coolant`);
  return buildResult(ctrl, "tool_change", lines, p, notes, warnings);
}

// ---- Program Header / Footer -----------------------------------------------

function genProgramHeader(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const notes: string[] = [];
  const warnings: string[] = [];

  const lines: string[] = [
    ...ctrl.programStart(p.program_number, p.program_name),
    ctrl.comment(`Program: ${p.program_name ?? "Untitled"}`),
    ctrl.comment(`Date: ${new Date().toISOString().split("T")[0]}`),
    ctrl.safetyLine,
    p.work_offset ?? "G54",
  ];

  notes.push("Program header generated");
  return buildResult(ctrl, "program_header", lines, p, notes, warnings);
}

function genProgramFooter(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const notes: string[] = [];
  const warnings: string[] = [];

  const lines: string[] = [
    ctrl.coolantOff,
    ctrl.spindleStop,
    ctrl.cancelLengthComp,
    ctrl.comment("Return to home"),
    ctrl.family === "heidenhain"
      ? "L Z+100 R0 FMAX"
      : "G28 G91 Z0.",
    ...ctrl.programEnd(),
  ];

  notes.push("Program footer generated");
  return buildResult(ctrl, "program_footer", lines, p, notes, warnings);
}

// ---- Subprogram Call -------------------------------------------------------

function genSubprogramCall(ctrl: ControllerConfig, p: GCodeParams): GCodeResult {
  const warnings: string[] = [];
  const notes: string[] = [];
  const subNum = p.sub_program_number ?? 9001;
  const repeats = p.sub_repeats ?? 1;

  if (!p.sub_program_number) warnings.push("sub_program_number not specified; defaulting to 9001");

  const lines: string[] = [
    ctrl.comment(`SUBPROGRAM CALL — ${subNum} × ${repeats}`),
    ctrl.subCall(subNum, repeats),
  ];

  notes.push(`Calls subprogram ${subNum}, ${repeats} repeat(s)`);
  return buildResult(ctrl, "subprogram_call", lines, p, notes, warnings);
}

// ============================================================================
// OPERATION DISPATCHER
// ============================================================================

function dispatchOperation(
  ctrl: ControllerConfig,
  operation: string,
  params: GCodeParams
): GCodeResult {
  // Validate inputs before generating any G-code
  const validationWarnings: string[] = [];
  validateParams(operation, params, validationWarnings);

  const result = dispatchOperationInner(ctrl, operation, params);
  // Merge validation warnings into result
  if (validationWarnings.length > 0) {
    result.warnings = [...validationWarnings, ...result.warnings];
  }
  return result;
}

function dispatchOperationInner(
  ctrl: ControllerConfig,
  operation: string,
  params: GCodeParams
): GCodeResult {
  switch (operation) {
    case "facing":
      return genFacing(ctrl, params);
    case "drilling":
      return genDrilling(ctrl, params, "G81");
    case "peck_drilling":
      return genDrilling(ctrl, params, "G83");
    case "chip_break_drilling":
      return genDrilling(ctrl, params, "G73");
    case "tapping":
      return genTapping(ctrl, params);
    case "boring":
      return genBoring(ctrl, params);
    case "thread_milling":
      return genThreadMilling(ctrl, params);
    case "circular_pocket":
      return genCircularPocket(ctrl, params);
    case "profile":
      return genProfile(ctrl, params);
    case "tool_change":
      return genToolChange(ctrl, params);
    case "program_header":
      return genProgramHeader(ctrl, params);
    case "program_footer":
      return genProgramFooter(ctrl, params);
    case "subprogram_call":
      return genSubprogramCall(ctrl, params);
    default:
      throw new Error(
        `[GCodeTemplateEngine] Unknown operation: "${operation}". ` +
        `Supported: ${SUPPORTED_OPERATIONS.join(", ")}`
      );
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Resolve a controller name string to its ControllerConfig.
 * Accepts any alias (case-insensitive).
 *
 * @param name - Controller name or alias (e.g. "fanuc", "haas", "840d")
 * @returns Matching ControllerConfig
 * @throws Error if no matching controller found
 */
export function resolveController(name: string): ControllerConfig {
  const normalized = name.toLowerCase().trim();
  for (const cfg of CONTROLLER_REGISTRY) {
    if (cfg.aliases.some((a) => a === normalized || normalized.includes(a))) {
      return cfg;
    }
  }
  throw new Error(
    `[GCodeTemplateEngine] Unknown controller: "${name}". ` +
    `Supported aliases: ${SUPPORTED_CONTROLLERS.join(", ")}`
  );
}

/**
 * Generate G-code for a single operation on the specified controller.
 *
 * @param controller - Controller name or alias (e.g. "fanuc", "haas vf", "840d")
 * @param operation  - Operation type (e.g. "drilling", "facing", "thread_milling")
 * @param params     - Operation parameters (see GCodeParams)
 * @returns GCodeResult with generated G-code, metadata, notes, and warnings
 *
 * @example
 * const result = generateGCode("fanuc", "peck_drilling", {
 *   tool_number: 3,
 *   rpm: 1200,
 *   feed_rate: 80,
 *   z_depth: -25,
 *   peck_depth: 5,
 *   coolant: "flood",
 * });
 * console.log(result.gcode);
 */
export function generateGCode(
  controller: string,
  operation: string,
  params: GCodeParams
): GCodeResult {
  const ctrl = resolveController(controller);
  return dispatchOperation(ctrl, operation, params);
}

/**
 * Generate a complete multi-operation CNC program.
 * All operations are concatenated with blank lines between blocks.
 * Header and footer are injected automatically if not included.
 *
 * @param controller - Controller name or alias
 * @param operations - Ordered array of {operation, params} blocks
 * @returns Single GCodeResult with combined G-code
 *
 * @example
 * const result = generateProgram("haas", [
 *   { operation: "program_header", params: { rpm: 0, feed_rate: 0, program_name: "PART_001" } },
 *   { operation: "facing", params: { rpm: 800, feed_rate: 500, tool_number: 1, z_depth: -0.5 } },
 *   { operation: "drilling", params: { rpm: 1500, feed_rate: 100, tool_number: 2, z_depth: -20 } },
 *   { operation: "program_footer", params: { rpm: 0, feed_rate: 0 } },
 * ]);
 */
export function generateProgram(
  controller: string,
  operations: Array<{ operation: string; params: GCodeParams }>
): GCodeResult {
  const ctrl = resolveController(controller);
  const allNotes: string[] = [];
  const allWarnings: string[] = [];
  const allBlocks: string[] = [];
  let totalTime = 0;
  let totalLines = 0;

  for (const { operation, params } of operations) {
    const result = dispatchOperation(ctrl, operation, params);
    allBlocks.push(result.gcode);
    allNotes.push(...result.notes.map((n) => `[${operation}] ${n}`));
    allWarnings.push(...result.warnings.map((w) => `[${operation}] ${w}`));
    totalTime += result.estimated_cycle_time_sec ?? 0;
    totalLines += result.line_count;
  }

  return {
    controller: ctrl.name,
    controller_family: ctrl.family,
    operation: "program",
    gcode: allBlocks.join("\n\n"),
    line_count: totalLines,
    parameters_used: { operations: operations.map((o) => o.operation) },
    notes: allNotes,
    warnings: allWarnings,
    estimated_cycle_time_sec: totalTime > 0 ? totalTime : undefined,
  };
}

/**
 * List all supported controllers with metadata.
 *
 * @returns Array of controller summaries
 */
export function listControllers(): Array<{
  name: string;
  family: ControllerFamily;
  aliases: string[];
  operations: string[];
}> {
  return CONTROLLER_REGISTRY.map((c) => ({
    name: c.name,
    family: c.family,
    aliases: c.aliases,
    operations: [...SUPPORTED_OPERATIONS],
  }));
}

/**
 * List all supported G-code operations.
 *
 * @returns Array of operation names
 */
export function listOperations(): GCodeOperation[] {
  return [...SUPPORTED_OPERATIONS];
}

/**
 * Return the enriched post-processor source file catalog.
 *
 * Each entry describes one of the 12 safety-critical extracted JS files that
 * feed G-code generation, validation, optimization, and backplotting. The
 * catalog includes safety classification, G-code role, category, and consumer
 * traceability for audit and wiring verification.
 *
 * SAFETY NOTE: All entries carry safety_class "CRITICAL" because they produce
 * or validate CNC machine instructions. Incorrect output can cause machine
 * crashes, tool breakage, operator injury, or death.
 *
 * @returns The POST_PROCESSOR_SOURCE_FILE_CATALOG record keyed by module name
 *
 * @see PostProcessorRegistry.getSourceCatalog() for the basic file list
 */
export function getSourceFileCatalog(): typeof POST_PROCESSOR_SOURCE_FILE_CATALOG {
  return POST_PROCESSOR_SOURCE_FILE_CATALOG;
}
