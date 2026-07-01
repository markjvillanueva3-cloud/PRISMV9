/**
 * PowerMillCodeGeneratorEngine — Autodesk PowerMill PMILL Macro Script Generator (E1121)
 *
 * Generates Autodesk PowerMill macro scripts in the PMILL macro language for
 * automating toolpath creation, editing, boundary definition, workplane setup,
 * tool creation, ViewMill verification, post-processing, and batch operations.
 *
 * PowerMill-specific features modelled:
 *   - Vortex roughing with constant tool engagement angle
 *   - Model Area Clearance (MAC) adaptive roughing
 *   - Steep & Shallow automatic surface-region splitting
 *   - Swarf finishing for ruled/developable surfaces
 *   - Race Line Finishing for complex freeform topology
 *   - ViewMill integrated stock simulation
 *   - Multi-axis collision avoidance with tool-axis tilting
 *   - Workplane creation for multi-setup parts
 *   - FOREACH loop batch operations
 *   - FORM DISPLAY for interactive parameter dialogs
 *
 * Methods:
 *   generateMacro(operations, tools, params)  — produce complete PMILL macro script
 *   getTemplates(category?)                   — list available PMILL macro templates
 *   generateFromDescription(text)             — best-effort NL → PMILL macro
 *   generatePostConfig(controller)            — post-processor configuration macro
 *
 * Template categories:
 *   roughing | finishing | multi_axis | boundary | workplane |
 *   tool_create | post_processing | viewmill | batch
 *
 * Sources:
 *   - Autodesk PowerMill 2024 Macro Reference (Delcam/Autodesk PMILL Language Guide)
 *   - PowerMill 2024 Automation Programming Guide
 *   - PowerMill Developer API Documentation
 *
 * @engine PowerMillCodeGeneratorEngine
 * @shortcode E1121
 * @dispatcher camDispatcher
 * @actions powermill_code_generate, powermill_code_templates
 * @milestone CAMX-MS6/U03
 */

import { log } from "../utils/Logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Supported PowerMill PMILL operation types */
export type PMOperationType =
  | "batch_foreach"
  | "boundary_create"
  | "constant_z"
  | "corner_finishing"
  | "drill"
  | "face_milling"
  | "model_area_clearance"
  | "offset_finishing"
  | "pattern_finishing"
  | "post_process"
  | "raster_finishing"
  | "steep_shallow"
  | "swarf_finishing"
  | "tool_create"
  | "viewmill_verify"
  | "vortex_roughing"
  | "workplane_create";

/** Template categories */
export type PMTemplateCategory =
  | "batch"
  | "boundary"
  | "finishing"
  | "multi_axis"
  | "post_processing"
  | "roughing"
  | "tool_create"
  | "viewmill"
  | "workplane";

/** A single PowerMill operation descriptor for macro generation */
export interface PMOperation {
  /** Operation type */
  type: PMOperationType;
  /** Toolpath name in PowerMill — used in CREATE TOOLPATH and ACTIVATE commands */
  name?: string;
  /** Reference to a tool entry by name or number */
  tool_ref?: string;
  /** Boundary name to apply as containment */
  boundary_name?: string;
  /** Workplane name to machine in */
  workplane_name?: string;
  /** Stepdown (axial depth of cut), mm */
  stepdown_mm?: number;
  /** Stepover (radial width of cut), mm — or scallop height for finishing */
  stepover_mm?: number;
  /** Vortex engagement angle, degrees (default 90) */
  vortex_angle_deg?: number;
  /** Machining tolerance, mm */
  tolerance_mm?: number;
  /** Stock to leave on walls/floors, mm */
  stock_to_leave_mm?: number;
  /** Rapid/safe Z height above part, mm */
  safe_z_mm?: number;
  /** Steep threshold angle for Steep & Shallow split, degrees */
  steep_angle_deg?: number;
  /** Spindle speed, RPM */
  spindle_rpm?: number;
  /** Cutting feed rate, mm/min */
  feed_mm_min?: number;
  /** Plunge feed rate, mm/min */
  plunge_feed_mm_min?: number;
  /** Coolant mode */
  coolant?: "flood" | "mist" | "air" | "off" | "through_tool";
  /** Post-processor name (for post_process operations) */
  post_name?: string;
  /** NC output file path */
  nc_output_path?: string;
  /** Whether to calculate toolpath after creation */
  calculate?: boolean;
  /** Whether to activate before calculating */
  activate?: boolean;
  /** FOREACH loop target: "toolpath" | "tool" | "boundary" */
  foreach_target?: "toolpath" | "tool" | "boundary";
  /** Free-form PMILL commands to include verbatim */
  raw_commands?: string[];
}

/** A PowerMill tool entry for CREATE TOOL commands */
export interface PMTool {
  /** Tool name/identifier in PowerMill */
  name: string;
  /** PowerMill tool type */
  type:
    | "ball_nosed"
    | "bull_nosed"
    | "drill"
    | "end_mill"
    | "face_mill"
    | "slot_mill"
    | "tap"
    | "thread_mill"
    | "tipped_disc";
  /** Cutting diameter, mm */
  diameter_mm: number;
  /** Number of flutes */
  flutes?: number;
  /** Corner radius for bull-nosed tools, mm */
  corner_radius_mm?: number;
  /** Overall tool length, mm */
  length_mm?: number;
  /** Flute (cutting) length, mm */
  flute_length_mm?: number;
  /** Tool material */
  material?: "carbide" | "cbn" | "ceramic" | "cermet" | "hss" | "pcd";
  /** Tool coating */
  coating?: string;
  /** Tool number in magazine */
  tool_number?: number;
}

/** Top-level macro generation parameters */
export interface PMGenerateParams {
  /** Project name written into macro comments */
  project_name?: string;
  /** Part name (model reference) */
  part_name?: string;
  /** Machine configuration name in PowerMill */
  machine_name?: string;
  /** Whether to add error checking with IF statements */
  add_error_checks?: boolean;
  /** Whether to add PRINT statements for progress reporting */
  add_progress_print?: boolean;
  /** Whether to add FORM DISPLAY dialogs for key parameters */
  add_form_display?: boolean;
  /** Global safe Z height, mm */
  safe_z_mm?: number;
  /** Global stock to leave, mm */
  stock_to_leave_mm?: number;
  /** Coordinate system / workplane to activate globally */
  active_workplane?: string;
}

/** Result of generateMacro */
export interface PMGenerateResult {
  /** Complete PMILL macro script */
  script: string;
  /** Human-readable description of what the macro does */
  description: string;
  /** Estimated line count */
  line_count: number;
  /** Operations included */
  operations_included: string[];
  /** Tools defined */
  tools_defined: string[];
  /** Warnings for missing/defaulted parameters */
  warnings: string[];
}

/** A template descriptor returned by getTemplates */
export interface PMTemplate {
  /** Template identifier */
  id: string;
  /** Display category */
  category: PMTemplateCategory;
  /** Short title */
  title: string;
  /** Description of what the template does */
  description: string;
  /** Required parameters */
  required_params: string[];
  /** Optional parameters */
  optional_params: string[];
  /** Example PMILL snippet (first 4 lines) */
  example_snippet: string;
}

/** Result of generatePostConfig */
export interface PMPostConfigResult {
  /** PMILL post-processor activation macro */
  script: string;
  /** Controller family detected */
  controller_family: string;
  /** Notes about controller-specific settings */
  notes: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** PowerMill tool type → PMILL keyword map */
const PM_TOOL_TYPE_MAP: Record<PMTool["type"], string> = {
  ball_nosed:  "BALLNOSED",
  bull_nosed:  "BULLNOSED",
  drill:       "DRILL",
  end_mill:    "END_MILL",
  face_mill:   "FACEMILL",
  slot_mill:   "SLOTMILL",
  tap:         "TAP",
  thread_mill: "THREADMILL",
  tipped_disc: "TIPPED_DISC",
};

/** PowerMill coolant mode → PMILL keyword */
const PM_COOLANT_MAP: Record<string, string> = {
  flood:        "FLOOD",
  mist:         "MIST",
  air:          "AIR",
  off:          "OFF",
  through_tool: "THROUGH_TOOL",
};

/** Known post-processor families */
const PM_POST_CONTROLLER_MAP: Record<string, { family: string; post_name: string; notes: string[] }> = {
  fanuc: {
    family: "FANUC",
    post_name: "ductpost_fanuc",
    notes: [
      "Standard G/M-code output with G43 tool length compensation",
      "Sub-programs via M98/M99",
      "5-axis with RTCP (G43.4) when configured",
    ],
  },
  haas: {
    family: "Haas",
    post_name: "ductpost_haas",
    notes: [
      "FANUC-compatible dialect for Haas controls",
      "M06 tool change with G43 H offset",
      "G187 accuracy mode for 5-axis",
    ],
  },
  heidenhain: {
    family: "Heidenhain iTNC/TNC",
    post_name: "ductpost_heidenhain",
    notes: [
      "Conversational iTNC 530 / TNC 640 format",
      "CYCL DEF for canned cycles",
      "PLANE SPATIAL / PLANE EULER for 5-axis tilting",
    ],
  },
  siemens: {
    family: "Siemens SINUMERIK",
    post_name: "ductpost_sinumerik",
    notes: [
      "SINUMERIK 840D/828D dialect",
      "CYCLE800 for tilted workplane",
      "TRAORI for 5-axis RTCP",
    ],
  },
  okuma: {
    family: "Okuma OSP",
    post_name: "ductpost_okuma",
    notes: [
      "OSP P300/P500 dialect",
      "VC variables for parametric machining",
      "CALL OPM for sub-routines",
    ],
  },
  mazak: {
    family: "Mazak EIA/ISO",
    post_name: "ductpost_mazak",
    notes: [
      "EIA/ISO G-code format for Mazak controls",
      "M290/M291 for SMOOTH controls",
      "G68/G69 for coordinate rotation",
    ],
  },
  generic: {
    family: "Generic ISO 6983",
    post_name: "ductpost_generic",
    notes: [
      "Standard ISO G/M-code — safe for unknown controllers",
      "No controller-specific cycles or RTCP",
      "Linear interpolation 5-axis only",
    ],
  },
};

/** Template library — 9 categories × ~1-2 templates */
const PM_TEMPLATE_LIBRARY: PMTemplate[] = [
  // ── Roughing ──────────────────────────────────────────────────────────────
  {
    id: "vortex_roughing_with_boundary",
    category: "roughing",
    title: "Vortex Roughing with Containment Boundary",
    description:
      "Creates a Vortex toolpath using constant tool engagement angle inside a user-defined containment boundary. Ideal for HSM roughing of complex pockets.",
    required_params: ["name", "tool_ref", "stepdown_mm", "vortex_angle_deg"],
    optional_params: ["boundary_name", "tolerance_mm", "stock_to_leave_mm", "safe_z_mm", "feed_mm_min"],
    example_snippet:
      "CREATE TOOLPATH ; 'vortex_rough_1'\n  EDIT TOOLPATH ; STRATEGY ; VORTEX\n  EDIT TOOLPATH ; TOOL ; 'EM16'\n  EDIT TOOLPATH ; STEPDOWN ; 3.0",
  },
  {
    id: "model_area_clearance",
    category: "roughing",
    title: "Model Area Clearance (Adaptive Roughing)",
    description:
      "Generates a Model Area Clearance toolpath for efficient adaptive roughing of complex 3D part geometries with automatic rest material handling.",
    required_params: ["name", "tool_ref", "stepdown_mm", "stepover_mm"],
    optional_params: ["tolerance_mm", "stock_to_leave_mm", "boundary_name", "calculate"],
    example_snippet:
      "CREATE TOOLPATH ; 'mac_rough_1'\n  EDIT TOOLPATH ; STRATEGY ; MODEL_AREA_CLEARANCE\n  EDIT TOOLPATH ; STEPDOWN ; 2.0\n  EDIT TOOLPATH ; STEPOVER ; 8.0",
  },

  // ── Finishing ─────────────────────────────────────────────────────────────
  {
    id: "steep_shallow_finishing",
    category: "finishing",
    title: "Steep & Shallow Finishing",
    description:
      "Creates a Steep & Shallow finishing toolpath that automatically splits the model into steep (Z-level) and shallow (raster/offset) regions based on a threshold angle.",
    required_params: ["name", "tool_ref", "stepover_mm", "steep_angle_deg"],
    optional_params: ["tolerance_mm", "stock_to_leave_mm", "boundary_name", "calculate"],
    example_snippet:
      "CREATE TOOLPATH ; 'steep_shallow_1'\n  EDIT TOOLPATH ; STRATEGY ; STEEP_SHALLOW\n  EDIT TOOLPATH ; STEEP_ANGLE ; 30.0\n  EDIT TOOLPATH ; STEPOVER ; 0.3",
  },
  {
    id: "raster_finishing",
    category: "finishing",
    title: "Raster Finishing",
    description:
      "Generates a flat-angle raster finishing toolpath for planar or gently sloped surfaces with uniform stepover in X or Y direction.",
    required_params: ["name", "tool_ref", "stepover_mm"],
    optional_params: ["tolerance_mm", "stock_to_leave_mm", "boundary_name", "spindle_rpm", "feed_mm_min"],
    example_snippet:
      "CREATE TOOLPATH ; 'raster_finish_1'\n  EDIT TOOLPATH ; STRATEGY ; RASTER_FINISHING\n  EDIT TOOLPATH ; STEPOVER ; 0.5\n  EDIT TOOLPATH ; TOLERANCE ; 0.01",
  },
  {
    id: "offset_finishing",
    category: "finishing",
    title: "Offset Area Finishing",
    description:
      "Creates a constant-Z offset area finishing toolpath following part surface contours for smooth surface quality on complex geometries.",
    required_params: ["name", "tool_ref", "stepover_mm"],
    optional_params: ["tolerance_mm", "stock_to_leave_mm", "boundary_name", "calculate"],
    example_snippet:
      "CREATE TOOLPATH ; 'offset_finish_1'\n  EDIT TOOLPATH ; STRATEGY ; OFFSET_AREA_FINISH\n  EDIT TOOLPATH ; STEPOVER ; 0.4\n  EDIT TOOLPATH ; TOLERANCE ; 0.01",
  },

  // ── Multi-axis ────────────────────────────────────────────────────────────
  {
    id: "swarf_finishing_multiaxis",
    category: "multi_axis",
    title: "Swarf Finishing (Multi-axis)",
    description:
      "Creates a 5-axis Swarf finishing toolpath using the side of the tool for ruled/developable surfaces such as turbine blades and impeller blades.",
    required_params: ["name", "tool_ref", "stepdown_mm"],
    optional_params: ["tolerance_mm", "boundary_name", "workplane_name", "stock_to_leave_mm"],
    example_snippet:
      "CREATE TOOLPATH ; 'swarf_finish_1'\n  EDIT TOOLPATH ; STRATEGY ; SWARF\n  EDIT TOOLPATH ; TOOL_AXIS ; LEAD_LAG\n  EDIT TOOLPATH ; COLLISION_AVOIDANCE ; ON",
  },
  {
    id: "collision_free_multiaxis",
    category: "multi_axis",
    title: "Multi-axis Collision-free Finishing",
    description:
      "Creates a 5-axis finishing toolpath with automatic collision avoidance and tool-axis tilting to avoid holder and shank collisions on deep cavities.",
    required_params: ["name", "tool_ref", "stepover_mm"],
    optional_params: ["tolerance_mm", "boundary_name", "workplane_name", "feed_mm_min"],
    example_snippet:
      "CREATE TOOLPATH ; 'multiaxis_finish_1'\n  EDIT TOOLPATH ; STRATEGY ; RASTER_FINISHING\n  EDIT TOOLPATH ; TOOL_AXIS ; INTERPOLATED\n  EDIT TOOLPATH ; COLLISION_AVOIDANCE ; ON",
  },

  // ── Boundary ──────────────────────────────────────────────────────────────
  {
    id: "boundary_from_model",
    category: "boundary",
    title: "Boundary from Model Silhouette",
    description:
      "Creates a containment boundary from the silhouette of the model geometry for use as toolpath containment.",
    required_params: ["boundary_name"],
    optional_params: [],
    example_snippet:
      "CREATE BOUNDARY ; 'boundary_1'\n  EDIT BOUNDARY ; 'boundary_1' ; TYPE ; SILHOUETTE\n  EDIT BOUNDARY ; 'boundary_1' ; CALCULATE\n  ACTIVATE BOUNDARY ; 'boundary_1'",
  },

  // ── Workplane ─────────────────────────────────────────────────────────────
  {
    id: "workplane_from_datum",
    category: "workplane",
    title: "Workplane from Part Datum",
    description:
      "Creates and activates a named workplane at a specified orientation relative to the global datum for multi-setup machining.",
    required_params: ["workplane_name"],
    optional_params: [],
    example_snippet:
      "CREATE WORKPLANE ; 'WP_OP2'\n  EDIT WORKPLANE ; 'WP_OP2' ; ORIGIN ; 0.0 ; 0.0 ; 0.0\n  EDIT WORKPLANE ; 'WP_OP2' ; AZIMUTH ; 0.0\n  ACTIVATE WORKPLANE ; 'WP_OP2'",
  },

  // ── Tool create ───────────────────────────────────────────────────────────
  {
    id: "tool_create_endmill",
    category: "tool_create",
    title: "Create End Mill Tool",
    description:
      "Creates an end mill tool definition in the PowerMill tool database with diameter, flute count, lengths, and holder data.",
    required_params: ["name", "diameter_mm"],
    optional_params: ["flutes", "flute_length_mm", "length_mm", "corner_radius_mm", "tool_number"],
    example_snippet:
      "CREATE TOOL ; 'EM16'\n  EDIT TOOL ; 'EM16' ; TYPE ; END_MILL\n  EDIT TOOL ; 'EM16' ; DIAMETER ; 16.0\n  EDIT TOOL ; 'EM16' ; NFLUTES ; 4",
  },

  // ── ViewMill ──────────────────────────────────────────────────────────────
  {
    id: "viewmill_batch_verify",
    category: "viewmill",
    title: "Batch ViewMill Verify All Toolpaths",
    description:
      "Loops over all toolpaths in the project and runs ViewMill stock simulation on each one, reporting gouges and remaining stock.",
    required_params: [],
    optional_params: ["add_progress_print"],
    example_snippet:
      "FOREACH TOOLPATH IN PROJECT\n  ACTIVATE TOOLPATH ; CURRENT\n  VIEWMILL ; SIMULATE ; TOOLPATH ; CURRENT\n  PRINT ; 'Verified: ' & TOOLPATH_NAME",
  },

  // ── Post-processing ───────────────────────────────────────────────────────
  {
    id: "post_process_all",
    category: "post_processing",
    title: "Post-Process All Toolpaths",
    description:
      "Post-processes all toolpaths in the project using a named post-processor and saves NC files to a specified output path.",
    required_params: ["post_name", "nc_output_path"],
    optional_params: ["add_progress_print"],
    example_snippet:
      "FOREACH TOOLPATH IN PROJECT\n  ACTIVATE TOOLPATH ; CURRENT\n  POST ; NAME ; 'ductpost_fanuc' ; OUTPUT ; 'C:\\NC\\' & TOOLPATH_NAME & '.nc'\nENDFOREACH",
  },

  // ── Batch ─────────────────────────────────────────────────────────────────
  {
    id: "batch_calculate_all",
    category: "batch",
    title: "Batch Calculate All Toolpaths",
    description:
      "Iterates over all toolpaths in the project and calculates each one, with optional progress printing.",
    required_params: [],
    optional_params: ["add_progress_print"],
    example_snippet:
      "FOREACH TOOLPATH IN PROJECT\n  ACTIVATE TOOLPATH ; CURRENT\n  CALCULATE TOOLPATH\n  PRINT ; 'Calculated: ' & TOOLPATH_NAME",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns PMILL macro file header block */
function pmHeader(projectName: string, partName: string, addProgressPrint: boolean): string {
  const lines: string[] = [
    `// ═══════════════════════════════════════════════════════════════`,
    `// PowerMill PMILL Macro — generated by PRISM E1121`,
    `// Project:   ${projectName}`,
    `// Part:      ${partName}`,
    `// Generated: ${new Date().toISOString().slice(0, 10)}`,
    `// ═══════════════════════════════════════════════════════════════`,
    ``,
  ];
  if (addProgressPrint) {
    lines.push(`PRINT ; "── PRISM PowerMill Macro Starting ──"`);
    lines.push(``);
  }
  return lines.join("\n");
}

/** Returns PMILL macro footer */
function pmFooter(addProgressPrint: boolean): string {
  const lines: string[] = [``, `// ─── End of Macro ────────────────────────────────────────────────`];
  if (addProgressPrint) {
    lines.push(`PRINT ; "── PRISM PowerMill Macro Complete ──"`);
  }
  return lines.join("\n");
}

/** Generates PMILL CREATE TOOL block for one tool */
function genToolCreate(tool: PMTool): string[] {
  const name = tool.name;
  const pmType = PM_TOOL_TYPE_MAP[tool.type] ?? "END_MILL";
  const lines: string[] = [
    `// ── Tool: ${name} ──────────────────────────────────────────────────`,
    `CREATE TOOL ; '${name}'`,
    `EDIT TOOL ; '${name}' ; TYPE ; ${pmType}`,
    `EDIT TOOL ; '${name}' ; DIAMETER ; ${tool.diameter_mm.toFixed(4)}`,
  ];
  if (tool.flutes !== undefined) {
    lines.push(`EDIT TOOL ; '${name}' ; NFLUTES ; ${tool.flutes}`);
  }
  if (tool.corner_radius_mm !== undefined && tool.type === "bull_nosed") {
    lines.push(`EDIT TOOL ; '${name}' ; TIP_RADIUS ; ${tool.corner_radius_mm.toFixed(4)}`);
  }
  if (tool.flute_length_mm !== undefined) {
    lines.push(`EDIT TOOL ; '${name}' ; CUTTING_LENGTH ; ${tool.flute_length_mm.toFixed(4)}`);
  }
  if (tool.length_mm !== undefined) {
    lines.push(`EDIT TOOL ; '${name}' ; OVERALL_LENGTH ; ${tool.length_mm.toFixed(4)}`);
  }
  if (tool.tool_number !== undefined) {
    lines.push(`EDIT TOOL ; '${name}' ; TOOL_NUMBER ; ${tool.tool_number}`);
  }
  if (tool.coating) {
    lines.push(`// Coating: ${tool.coating}`);
  }
  if (tool.material) {
    lines.push(`// Material: ${tool.material}`);
  }
  lines.push(`ACTIVATE TOOL ; '${name}'`);
  lines.push(``);
  return lines;
}

/** Generates PMILL block for common toolpath parameters */
function genToolpathCommon(op: PMOperation, tpName: string): string[] {
  const lines: string[] = [];
  if (op.tool_ref) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; TOOL ; '${op.tool_ref}'`);
  }
  if (op.tolerance_mm !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; TOLERANCE ; ${op.tolerance_mm.toFixed(4)}`);
  }
  if (op.stepover_mm !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; STEPOVER ; ${op.stepover_mm.toFixed(4)}`);
  }
  if (op.stepdown_mm !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; STEPDOWN ; ${op.stepdown_mm.toFixed(4)}`);
  }
  if (op.stock_to_leave_mm !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; STOCK_TO_LEAVE ; ${op.stock_to_leave_mm.toFixed(4)}`);
  }
  if (op.safe_z_mm !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; SAFE_Z ; ${op.safe_z_mm.toFixed(4)}`);
  }
  if (op.spindle_rpm !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; SPINDLE_SPEED ; ${op.spindle_rpm}`);
  }
  if (op.feed_mm_min !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; FEED_RATE ; ${op.feed_mm_min.toFixed(1)}`);
  }
  if (op.plunge_feed_mm_min !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; PLUNGE_RATE ; ${op.plunge_feed_mm_min.toFixed(1)}`);
  }
  if (op.coolant) {
    const pm = PM_COOLANT_MAP[op.coolant] ?? "FLOOD";
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; COOLANT ; ${pm}`);
  }
  if (op.boundary_name) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; BOUNDARY ; '${op.boundary_name}'`);
  }
  if (op.workplane_name) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; WORKPLANE ; '${op.workplane_name}'`);
  }
  return lines;
}

/** Generates PMILL block for Vortex roughing */
function genVortexRoughing(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `vortex_rough_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Vortex Roughing: ${tpName} ─────────────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; VORTEX`,
  ];
  if (op.vortex_angle_deg !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; VORTEX_ENGAGEMENT_ANGLE ; ${op.vortex_angle_deg.toFixed(1)}`);
  } else {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; VORTEX_ENGAGEMENT_ANGLE ; 90.0`);
  }
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for Model Area Clearance (adaptive roughing) */
function genModelAreaClearance(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `mac_rough_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Model Area Clearance: ${tpName} ────────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; MODEL_AREA_CLEARANCE`,
    `EDIT TOOLPATH ; '${tpName}' ; PATTERN ; RACETRACK`,
  ];
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for Steep & Shallow finishing */
function genSteepShallow(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `steep_shallow_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Steep & Shallow Finishing: ${tpName} ────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; STEEP_SHALLOW`,
  ];
  if (op.steep_angle_deg !== undefined) {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; STEEP_ANGLE ; ${op.steep_angle_deg.toFixed(1)}`);
  } else {
    lines.push(`EDIT TOOLPATH ; '${tpName}' ; STEEP_ANGLE ; 30.0`);
  }
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for Raster finishing */
function genRasterFinishing(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `raster_finish_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Raster Finishing: ${tpName} ─────────────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; RASTER_FINISHING`,
  ];
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for Offset Area finishing */
function genOffsetFinishing(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `offset_finish_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Offset Area Finishing: ${tpName} ────────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; OFFSET_AREA_FINISH`,
  ];
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for Constant-Z finishing */
function genConstantZ(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `const_z_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Constant-Z Finishing: ${tpName} ─────────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; CONSTANT_Z`,
  ];
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for Corner finishing */
function genCornerFinishing(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `corner_finish_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Corner Finishing: ${tpName} ─────────────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; CORNER_FINISHING`,
  ];
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for Pattern finishing */
function genPatternFinishing(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `pattern_finish_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Pattern Finishing: ${tpName} ────────────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; PATTERN_FINISHING`,
  ];
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for Swarf finishing (multi-axis) */
function genSwarfFinishing(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `swarf_finish_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Swarf Finishing (5-axis): ${tpName} ─────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; SWARF`,
    `EDIT TOOLPATH ; '${tpName}' ; TOOL_AXIS ; LEAD_LAG`,
    `EDIT TOOLPATH ; '${tpName}' ; COLLISION_AVOIDANCE ; ON`,
  ];
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for face milling */
function genFaceMilling(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `face_mill_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Face Milling: ${tpName} ─────────────────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; FACE_MILLING`,
  ];
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for drilling */
function genDrill(op: PMOperation, opIdx: number): string[] {
  const tpName = op.name ?? `drill_${opIdx + 1}`;
  const lines: string[] = [
    `// ── Drilling: ${tpName} ──────────────────────────────────────────────────`,
    `CREATE TOOLPATH ; '${tpName}'`,
    `EDIT TOOLPATH ; '${tpName}' ; STRATEGY ; DRILLING`,
  ];
  lines.push(...genToolpathCommon(op, tpName));
  if (op.activate !== false) {
    lines.push(`ACTIVATE TOOLPATH ; '${tpName}'`);
  }
  if (op.calculate !== false) {
    lines.push(`CALCULATE TOOLPATH`);
  }
  lines.push(``);
  return lines;
}

/** Generates PMILL block for boundary creation */
function genBoundaryCreate(op: PMOperation, opIdx: number): string[] {
  const bName = op.boundary_name ?? op.name ?? `boundary_${opIdx + 1}`;
  return [
    `// ── Boundary: ${bName} ───────────────────────────────────────────────────`,
    `CREATE BOUNDARY ; '${bName}'`,
    `EDIT BOUNDARY ; '${bName}' ; TYPE ; SILHOUETTE`,
    `EDIT BOUNDARY ; '${bName}' ; CALCULATE`,
    `ACTIVATE BOUNDARY ; '${bName}'`,
    ``,
  ];
}

/** Generates PMILL block for workplane creation */
function genWorkplaneCreate(op: PMOperation, opIdx: number): string[] {
  const wpName = op.workplane_name ?? op.name ?? `workplane_${opIdx + 1}`;
  return [
    `// ── Workplane: ${wpName} ─────────────────────────────────────────────────`,
    `CREATE WORKPLANE ; '${wpName}'`,
    `EDIT WORKPLANE ; '${wpName}' ; ORIGIN ; 0.0 ; 0.0 ; 0.0`,
    `EDIT WORKPLANE ; '${wpName}' ; AZIMUTH ; 0.0`,
    `EDIT WORKPLANE ; '${wpName}' ; ELEVATION ; 0.0`,
    `ACTIVATE WORKPLANE ; '${wpName}'`,
    ``,
  ];
}

/** Generates PMILL block for post-processing */
function genPostProcess(op: PMOperation, opIdx: number): string[] {
  const postName = op.post_name ?? "ductpost_fanuc";
  const outPath = op.nc_output_path ?? `C:\\NC\\toolpath_${opIdx + 1}.nc`;
  return [
    `// ── Post-Processing ──────────────────────────────────────────────────────`,
    `FOREACH TOOLPATH IN PROJECT`,
    `  ACTIVATE TOOLPATH ; CURRENT`,
    `  POST ; NAME ; '${postName}' ; OUTPUT ; '${outPath}'`,
    `ENDFOREACH`,
    ``,
  ];
}

/** Generates PMILL ViewMill verify block */
function genViewMillVerify(op: PMOperation): string[] {
  return [
    `// ── ViewMill Verification ────────────────────────────────────────────────`,
    `FOREACH TOOLPATH IN PROJECT`,
    `  ACTIVATE TOOLPATH ; CURRENT`,
    `  VIEWMILL ; SIMULATE ; TOOLPATH ; CURRENT`,
    `  PRINT ; "Verified: " & TOOLPATH_NAME`,
    `ENDFOREACH`,
    ``,
  ];
}

/** Generates PMILL FOREACH batch loop block */
function genBatchForeach(op: PMOperation): string[] {
  const target = op.foreach_target ?? "toolpath";
  const keyword = target.toUpperCase();
  const rawCmds = op.raw_commands ?? [`  // Add operations here`];
  return [
    `// ── Batch FOREACH Loop ───────────────────────────────────────────────────`,
    `FOREACH ${keyword} IN PROJECT`,
    ...rawCmds.map((c) => `  ${c}`),
    `ENDFOREACH`,
    ``,
  ];
}

/** Dispatches operation to the correct code generator */
function genOperation(op: PMOperation, opIdx: number): string[] {
  switch (op.type) {
    case "vortex_roughing":      return genVortexRoughing(op, opIdx);
    case "model_area_clearance": return genModelAreaClearance(op, opIdx);
    case "steep_shallow":        return genSteepShallow(op, opIdx);
    case "raster_finishing":     return genRasterFinishing(op, opIdx);
    case "offset_finishing":     return genOffsetFinishing(op, opIdx);
    case "constant_z":           return genConstantZ(op, opIdx);
    case "corner_finishing":     return genCornerFinishing(op, opIdx);
    case "pattern_finishing":    return genPatternFinishing(op, opIdx);
    case "swarf_finishing":      return genSwarfFinishing(op, opIdx);
    case "face_milling":         return genFaceMilling(op, opIdx);
    case "drill":                return genDrill(op, opIdx);
    case "boundary_create":      return genBoundaryCreate(op, opIdx);
    case "workplane_create":     return genWorkplaneCreate(op, opIdx);
    case "post_process":         return genPostProcess(op, opIdx);
    case "viewmill_verify":      return genViewMillVerify(op);
    case "batch_foreach":        return genBatchForeach(op);
    case "tool_create":          return [
      `// ── Tool create via tool_create operation ─────────────────────────────`,
      `// Note: Provide tool definitions in the 'tools' array for full CREATE TOOL blocks`,
      ``,
    ];
    default:
      return [`// Unknown operation type: ${(op as PMOperation).type}`, ``];
  }
}

// ─── Natural Language → Macro Heuristics ─────────────────────────────────────

/** Maps description keywords → PMOperation[] for generateFromDescription */
function nlToOperations(text: string): PMOperation[] {
  const lower = text.toLowerCase();
  const ops: PMOperation[] = [];

  // Workplane
  if (lower.includes("workplane") || lower.includes("multi-setup") || lower.includes("multi setup")) {
    ops.push({ type: "workplane_create", name: "WP_OP1", workplane_name: "WP_OP1" });
  }
  // Boundary
  if (lower.includes("boundary") || lower.includes("containment")) {
    ops.push({ type: "boundary_create", boundary_name: "containment_boundary" });
  }
  // Tool creation
  if (lower.includes("create tool") || lower.includes("define tool") || lower.includes("add tool")) {
    ops.push({ type: "tool_create", name: "new_tool" });
  }
  // Roughing — prefer Vortex if mentioned, else MAC
  if (lower.includes("vortex")) {
    ops.push({ type: "vortex_roughing", name: "vortex_rough_1", stepdown_mm: 3.0, vortex_angle_deg: 90 });
  } else if (lower.includes("rough") || lower.includes("clearance")) {
    ops.push({ type: "model_area_clearance", name: "mac_rough_1", stepdown_mm: 2.0, stepover_mm: 8.0 });
  }
  // Finishing — Steep & Shallow preferred for complex parts
  if (lower.includes("steep") || lower.includes("shallow")) {
    ops.push({ type: "steep_shallow", name: "steep_shallow_1", stepover_mm: 0.3, steep_angle_deg: 30 });
  } else if (lower.includes("swarf") || lower.includes("blade") || lower.includes("impeller")) {
    ops.push({ type: "swarf_finishing", name: "swarf_finish_1", stepdown_mm: 1.0 });
  } else if (lower.includes("raster")) {
    ops.push({ type: "raster_finishing", name: "raster_finish_1", stepover_mm: 0.5 });
  } else if (lower.includes("finish") || lower.includes("semi-finish")) {
    ops.push({ type: "offset_finishing", name: "offset_finish_1", stepover_mm: 0.4 });
  }
  // Multi-axis collision-free
  if (lower.includes("collision") || lower.includes("5-axis") || lower.includes("multi-axis") || lower.includes("multiaxis")) {
    ops.push({ type: "swarf_finishing", name: "multiaxis_finish_1", stepdown_mm: 0.5 });
  }
  // ViewMill verify
  if (lower.includes("viewmill") || lower.includes("verify") || lower.includes("simulate")) {
    ops.push({ type: "viewmill_verify" });
  }
  // Post-process
  if (lower.includes("post") || lower.includes("nc output") || lower.includes("output")) {
    const postName = lower.includes("heidenhain") ? "ductpost_heidenhain"
      : lower.includes("siemens")    ? "ductpost_sinumerik"
      : lower.includes("haas")       ? "ductpost_haas"
      : lower.includes("okuma")      ? "ductpost_okuma"
      : "ductpost_fanuc";
    ops.push({ type: "post_process", post_name: postName, nc_output_path: "C:\\NC\\" });
  }

  // Default if nothing matched
  if (ops.length === 0) {
    ops.push({ type: "vortex_roughing", name: "vortex_rough_1", stepdown_mm: 3.0, vortex_angle_deg: 90 });
    ops.push({ type: "steep_shallow", name: "steep_shallow_1", stepover_mm: 0.3, steep_angle_deg: 30 });
  }

  return ops;
}

// ─── Engine Class ─────────────────────────────────────────────────────────────

/**
 * PowerMillCodeGeneratorEngine — PMILL macro script generator for Autodesk PowerMill.
 *
 * Covers Vortex/MAC roughing, Steep & Shallow / Swarf / Raster finishing,
 * boundary/workplane/tool creation, ViewMill verification, post-processing,
 * and FOREACH batch operations.
 */
export class PowerMillCodeGeneratorEngine {
  /** Engine identifier */
  readonly id = "PowerMillCodeGeneratorEngine";
  readonly shortcode = "E1121";

  /**
   * Generate a complete PMILL macro script from operations, tools, and parameters.
   *
   * @param operations - Ordered list of operations to include
   * @param tools      - Tool definitions (emitted as CREATE TOOL blocks before operations)
   * @param params     - Global macro generation options
   * @returns { script, description, line_count, operations_included, tools_defined, warnings }
   */
  generateMacro(
    operations: PMOperation[],
    tools: PMTool[] = [],
    params: PMGenerateParams = {},
  ): PMGenerateResult {
    log.info(`[${this.id}] generateMacro — ${operations.length} ops, ${tools.length} tools`);

    const projectName = params.project_name ?? "PRISM_Project";
    const partName = params.part_name ?? "part";
    const addProgress = params.add_progress_print ?? false;
    const addErrChecks = params.add_error_checks ?? false;
    const warnings: string[] = [];
    const opsIncluded: string[] = [];
    const toolsDefined: string[] = [];

    const allLines: string[] = [];

    // Header
    allLines.push(pmHeader(projectName, partName, addProgress));

    // Global workplane activation
    if (params.active_workplane) {
      allLines.push(`ACTIVATE WORKPLANE ; '${params.active_workplane}'`);
      allLines.push(``);
    }

    // Global safe Z
    if (params.safe_z_mm !== undefined) {
      allLines.push(`EDIT PARAMETER ; GLOBAL_SAFE_Z ; ${params.safe_z_mm.toFixed(4)}`);
      allLines.push(``);
    }

    // FORM DISPLAY for interactive parameter override
    if (params.add_form_display) {
      allLines.push(`// ─── Interactive Parameter Form ───────────────────────────────────────────`);
      allLines.push(`FORM DISPLAY ; PARAMETERS`);
      allLines.push(``);
    }

    // Tool definitions first
    for (const tool of tools) {
      const toolBlock = genToolCreate(tool);
      allLines.push(...toolBlock);
      toolsDefined.push(tool.name);
    }

    // Operations
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (addProgress) {
        allLines.push(`PRINT ; "── Starting: ${op.name ?? op.type} ──"`);
      }
      if (addErrChecks && op.name) {
        allLines.push(`// Error check: verify toolpath '${op.name}' does not already exist`);
        allLines.push(`IF EXISTS TOOLPATH ; '${op.name}'`);
        allLines.push(`  DELETE TOOLPATH ; '${op.name}'`);
        allLines.push(`ENDIF`);
      }
      const block = genOperation(op, i);
      allLines.push(...block);
      opsIncluded.push(op.name ?? op.type);
    }

    // Footer
    allLines.push(pmFooter(addProgress));

    const script = allLines.join("\n");
    const lineCount = script.split("\n").length;

    // Warnings for missing tool refs
    for (const op of operations) {
      if (
        [
          "vortex_roughing", "model_area_clearance", "steep_shallow",
          "raster_finishing", "offset_finishing", "constant_z",
          "corner_finishing", "pattern_finishing", "swarf_finishing",
          "face_milling", "drill",
        ].includes(op.type) &&
        !op.tool_ref
      ) {
        warnings.push(
          `Operation '${op.name ?? op.type}': no tool_ref specified — TOOL edit omitted from macro.`,
        );
      }
    }

    const description =
      `PMILL macro for project '${projectName}': ` +
      `${operations.length} operation(s) — ${opsIncluded.join(", ")}.` +
      (tools.length > 0 ? ` Defines ${tools.length} tool(s): ${toolsDefined.join(", ")}.` : "");

    return { script, description, line_count: lineCount, operations_included: opsIncluded, tools_defined: toolsDefined, warnings };
  }

  /**
   * List available PMILL macro templates, optionally filtered by category.
   *
   * @param category - Optional filter; omit to return all templates
   * @returns Array of PMTemplate descriptors
   */
  getTemplates(category?: PMTemplateCategory): PMTemplate[] {
    if (!category) return PM_TEMPLATE_LIBRARY;
    return PM_TEMPLATE_LIBRARY.filter((t) => t.category === category);
  }

  /**
   * Best-effort natural language → PMILL macro generation.
   *
   * Parses text for keywords (vortex, rough, steep, shallow, swarf, verify, post, etc.)
   * and assembles a corresponding PMILL macro.
   *
   * @param text - Free-form description of the desired macro
   * @returns PMGenerateResult
   */
  generateFromDescription(text: string): PMGenerateResult {
    log.info(`[${this.id}] generateFromDescription — "${text.slice(0, 80)}"`);
    const operations = nlToOperations(text);
    return this.generateMacro(operations, [], {
      project_name: "PRISM_NL_Project",
      add_progress_print: true,
    });
  }

  /**
   * Generate a post-processor activation/configuration macro for a named controller.
   *
   * @param controller - Controller family key: fanuc | haas | heidenhain | siemens | okuma | mazak | generic
   * @returns PMPostConfigResult
   */
  generatePostConfig(controller: string): PMPostConfigResult {
    log.info(`[${this.id}] generatePostConfig — controller: ${controller}`);
    const key = controller.toLowerCase().trim();
    const entry = PM_POST_CONTROLLER_MAP[key] ?? PM_POST_CONTROLLER_MAP["generic"]!;

    const lines: string[] = [
      `// ═══════════════════════════════════════════════════════════════`,
      `// PowerMill Post-Processor Configuration — generated by PRISM E1121`,
      `// Controller: ${entry.family}`,
      `// Post:       ${entry.post_name}`,
      `// ═══════════════════════════════════════════════════════════════`,
      ``,
      `// ─── Activate post-processor ──────────────────────────────────────────────`,
      `EDIT POST ; NAME ; '${entry.post_name}'`,
      ``,
      `// ─── Post-process all toolpaths ───────────────────────────────────────────`,
      `FOREACH TOOLPATH IN PROJECT`,
      `  ACTIVATE TOOLPATH ; CURRENT`,
      `  POST ; NAME ; '${entry.post_name}' ; OUTPUT ; 'C:\\NC\\' & TOOLPATH_NAME & '.nc'`,
      `ENDFOREACH`,
      ``,
      `PRINT ; "Post-processing complete — ${entry.family}"`,
    ];

    const notesLines = entry.notes.map((n) => `// ${n}`);
    const script = [...lines, ``, `// ─── Controller Notes ────────────────────────────────────────────────────────`, ...notesLines].join("\n");

    return {
      script,
      controller_family: entry.family,
      notes: entry.notes,
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/** Singleton instance — imported by camDispatcher via lazy getEngine() */
export const powerMillCodeGeneratorEngine = new PowerMillCodeGeneratorEngine();
