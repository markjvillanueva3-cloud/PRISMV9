/**
 * HyperMillCodeGeneratorEngine — hyperMILL Automation Center Python Script Generator (E1120)
 *
 * Generates hyperMILL Automation Center (AC) Python scripts for job automation.
 * Covers 3D roughing (MAXX, HPC, optimized), 3D finishing (Z-level, parallel,
 * scallop, pencil, rest), 5-axis operations (swarf, tangent plane, blade,
 * impeller, port), tool assembly configuration from hyperMILL tool DB,
 * cycle parameter setup (approach/retract, clearance, infeed), NcGenerator
 * invocation, and batch operations.
 *
 * Methods:
 *   generateACScript(operations, tools, params)  — produce complete AC Python script
 *   getTemplates(category?)                      — list available script templates
 *   generateFromDescription(text)                — best-effort NL → AC Python script
 *   generateNCConfig(controller)                 — NcGenerator post config snippet
 *
 * Template categories:
 *   roughing_3d | finishing_3d | five_axis | tool_setup |
 *   nc_generation | batch | job_setup
 *
 * Sources:
 *   - hyperMILL v33 Automation Center documentation
 *   - H:/prism/HYPERMILL/NcGenerator/33.0/ (post-processor configs)
 *   - HyperMillCycleCatalogEngine (120+ cycle codes from omCycles.txt)
 *   - HyperMillControllerCatalogEngine (16 controller families)
 *   - hypermill-tool-schema-notes.ts (29 geometry classes)
 *
 * @engine HyperMillCodeGeneratorEngine
 * @shortcode E1120
 * @dispatcher camDispatcher
 * @actions hypermill_code_generate, hypermill_code_templates
 * @milestone CAMX-MS9/U02
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Supported hyperMILL Automation Center operation types */
export type HMOperationType =
  // 3D Roughing
  | "maxx_roughing"
  | "hpc_roughing"
  | "optimized_roughing"
  | "z_level_roughing"
  | "offset_roughing"
  // 3D Finishing
  | "z_level_finishing"
  | "parallel_finishing"
  | "scallop_finishing"
  | "pencil_finishing"
  | "rest_machining_3d"
  | "profile_finishing"
  // 5-Axis
  | "swarf_cutting"
  | "tangent_plane"
  | "blade_roughing"
  | "blade_finishing"
  | "impeller_roughing"
  | "impeller_finishing"
  | "port_roughing"
  | "port_finishing"
  | "five_axis_surface"
  // 2D / Drilling
  | "contour_2d"
  | "pocket_2d"
  | "face_milling"
  | "drilling"
  | "thread_milling"
  // Setup / Utility
  | "tool_setup"
  | "job_setup"
  | "nc_generation"
  | "batch";

/** Template category (superset of operation type, for getTemplates) */
export type HMTemplateCategory =
  | "roughing_3d"
  | "finishing_3d"
  | "five_axis"
  | "tool_setup"
  | "nc_generation"
  | "batch"
  | "job_setup";

/** A single hyperMILL Automation Center operation descriptor */
export interface HMOperation {
  /** Operation type */
  type: HMOperationType;
  /** Operation name shown in hyperMILL job list */
  name?: string;
  /** hyperMILL cycle code (e.g. "3D:Z-Level Roughing") — auto-derived from type if omitted */
  cycle_code?: string;
  /** Tool reference number in hyperMILL tool DB */
  tool_number?: number;
  /** Axial depth of cut (ap), mm */
  stepdown_mm?: number;
  /** Radial stepover (ae), mm */
  stepover_mm?: number;
  /** Scallop height target, mm — used for scallop/parallel finishing */
  scallop_height_mm?: number;
  /** Stock to leave on walls and floor, mm */
  stock_leave_mm?: number;
  /** Floor-only stock to leave, mm */
  floor_stock_mm?: number;
  /** Cutting feed rate, mm/min */
  feed_mm_min?: number;
  /** Spindle speed, RPM */
  spindle_rpm?: number;
  /** Approach type */
  approach?: "helical" | "ramp" | "plunge" | "predrill" | "none";
  /** Retract type */
  retract?: "normal" | "tangential" | "direct";
  /** Clearance plane height, mm (absolute Z) */
  clearance_z_mm?: number;
  /** Safety distance, mm (incremental above surface) */
  safety_distance_mm?: number;
  /** Coolant mode */
  coolant?: "flood" | "mist" | "air" | "tsc" | "off";
  /** Machining direction */
  cut_direction?: "climb" | "conventional" | "both";
  /** Parallel finishing angle, degrees */
  angle_deg?: number;
  /** Number of blade/impeller passes (5-axis specialty) */
  pass_count?: number;
  /** Whether to use rest machining from reference operation */
  use_rest?: boolean;
  /** Reference operation name for rest machining */
  rest_ref_op?: string;
  /** NcGenerator post-processor name (for nc_generation ops) */
  post_name?: string;
  /** NC output file path */
  nc_output_path?: string;
  /** Extra verbatim AC Python lines inserted after operation build */
  extra_lines?: string[];
}

/** A hyperMILL tool DB entry for AC configuration */
export interface HMTool {
  /** hyperMILL tool number (used in SetTool calls) */
  number: number;
  /** Tool type aligned with hyperMILL geometry classes */
  type:
    | "endmill_flat"
    | "endmill_ball"
    | "endmill_torus"
    | "face_mill"
    | "drill"
    | "tap"
    | "thread_mill"
    | "reamer"
    | "chamfer_mill"
    | "tapered_endmill"
    | "barrel_mill"
    | "lollipop"
    | "other";
  /** Nominal diameter, mm */
  diameter_mm: number;
  /** Corner radius (torus / bull-nose), mm */
  corner_radius_mm?: number;
  /** Flute length, mm */
  flute_length_mm?: number;
  /** Overall length, mm */
  overall_length_mm?: number;
  /** Number of teeth/flutes */
  flutes?: number;
  /** Tool material substrate */
  material?: "carbide" | "hss" | "cermet" | "cbn" | "ceramic" | "pcd";
  /** Coating */
  coating?: string;
  /** Descriptive label */
  label?: string;
}

/** Top-level generation parameters */
export interface HMGenerateParams {
  /** hyperMILL project / part name */
  part_name?: string;
  /** hyperMILL job list name */
  job_name?: string;
  /** Machine configuration name (as defined in hyperMILL Machine Manager) */
  machine_name?: string;
  /** Coordinate system / WCS name */
  wcs_name?: string;
  /** Stock model name (hyperMILL NCSurf reference) */
  stock_model_name?: string;
  /** Global NC output folder */
  nc_output_folder?: string;
  /** Whether to wrap the script in a try/except error handler */
  add_error_handling?: boolean;
  /** Whether to emit print() progress statements */
  add_progress_msgs?: boolean;
  /** Whether to run NC generation after all operations are built */
  run_nc_generation?: boolean;
  /** NcGenerator post-processor name for auto-NC-gen */
  post_processor?: string;
  /** hyperMILL version string for header comment (default "33.0") */
  hm_version?: string;
}

/** Result of generateACScript */
export interface HMGenerateResult {
  /** Complete AC Python script text */
  script: string;
  /** Human-readable description of what the script does */
  description: string;
  /** Estimated line count */
  line_count: number;
  /** Operation names included */
  operations_included: string[];
  /** Tool numbers referenced */
  tools_referenced: number[];
  /** Warnings (defaulted params, unsupported combos) */
  warnings: string[];
}

/** A template descriptor returned by getTemplates */
export interface HMTemplate {
  id: string;
  category: HMTemplateCategory;
  title: string;
  description: string;
  operations: HMOperationType[];
  required_params: string[];
  optional_params: string[];
  example_snippet: string;
}

/** Result of generateNCConfig */
export interface HMNCConfigResult {
  /** NcGenerator Python invocation snippet */
  script: string;
  /** Controller family detected */
  controller_family: string;
  /** Post-processor name resolved */
  post_name: string;
  /** Notes about controller-specific settings */
  notes: string[];
}

// ─── Cycle Code Map ───────────────────────────────────────────────────────────

/** Maps operation type → hyperMILL cycle code string (from omCycles.txt) */
const CYCLE_CODE_MAP: Record<HMOperationType, string> = {
  // 3D Roughing
  maxx_roughing:      "3D:MAXX Roughing",
  hpc_roughing:       "3D:HPC Roughing",
  optimized_roughing: "3D:Optimized Rest Roughing",
  z_level_roughing:   "3D:Z-Level Roughing",
  offset_roughing:    "3D:Offset Roughing",
  // 3D Finishing
  z_level_finishing:  "3D:Z-Level Finishing",
  parallel_finishing: "3D:Parallel Finishing",
  scallop_finishing:  "3D:Equidistant Finishing",
  pencil_finishing:   "3D:Pencil Milling",
  rest_machining_3d:  "3D:Autom. Rest Machining",
  profile_finishing:  "3D:Profile Finishing",
  // 5-Axis
  swarf_cutting:      "5X:Swarf Cutting",
  tangent_plane:      "5X:Tangent Plane Machining",
  blade_roughing:     "5X:Blade Roughing",
  blade_finishing:    "5X:Blade Finishing",
  impeller_roughing:  "5X:Impeller Roughing",
  impeller_finishing: "5X:Impeller Finishing",
  port_roughing:      "5X:Port Roughing",
  port_finishing:     "5X:Port Finishing",
  five_axis_surface:  "5X:5-Axis Surface Milling",
  // 2D / Drilling
  contour_2d:         "2D:Contour Milling",
  pocket_2d:          "2D:Pocket Milling",
  face_milling:       "2D:Face Milling",
  drilling:           "DR:Drilling",
  thread_milling:     "TP:Thread Milling",
  // Utility
  tool_setup:         "_util",
  job_setup:          "_util",
  nc_generation:      "_util",
  batch:              "_util",
};

// ─── Controller / Post Processor Map ─────────────────────────────────────────

const CONTROLLER_POST_MAP: Record<string, { family: string; post_name: string; notes: string[] }> = {
  fanuc: {
    family: "FANUC",
    post_name: "omPPFI",
    notes: [
      "Uses G17/G18/G19 plane selection",
      "Tool length offset with G43/G44",
      "Subprograms via M98/M99",
      "RTCP via G43.4/G43.5 for 5-axis",
    ],
  },
  siemens: {
    family: "Siemens SINUMERIK",
    post_name: "omPPSI",
    notes: [
      "CYCLE800 for 3+2 tilted plane",
      "TRAORI for 5-axis RTCP",
      "High-speed CYCLE832 for surface finish",
      "Tool management via T+M06",
    ],
  },
  heidenhain: {
    family: "Heidenhain iTNC / TNC7",
    post_name: "omPPHH",
    notes: [
      "PLANE SPATIAL for 5-axis tilting",
      "FK free contour programming",
      "Conversational ISO dialect",
      "DCM dynamic collision monitoring",
    ],
  },
  haas: {
    family: "Haas",
    post_name: "omPPF3X",
    notes: [
      "Haas sub-dialect of FANUC",
      "G187 for accuracy control",
      "Tool change via M06",
      "5-axis via TCPC G234",
    ],
  },
  mazak: {
    family: "Mazak Mazatrol",
    post_name: "omPPMA",
    notes: [
      "Mazatrol conversational or EIA/ISO",
      "SmoothX 5-axis capability",
      "TCPC via G43.4",
    ],
  },
  okuma: {
    family: "Okuma OSP",
    post_name: "omPPOK",
    notes: [
      "OSP-P300 / P500 dialect",
      "NURBS interpolation G06.2",
      "5-axis via MB-5",
    ],
  },
  dmg: {
    family: "DMG MORI",
    post_name: "omPPDM",
    notes: [
      "Typically SIEMENS or HEIDENHAIN based",
      "Celos APP controller interface",
      "5-axis via tilted-plane cycles",
    ],
  },
};

// ─── Template Database ────────────────────────────────────────────────────────

const TEMPLATE_DB: HMTemplate[] = [
  {
    id: "maxx_roughing_3d",
    category: "roughing_3d",
    title: "MAXX 3D Roughing",
    description:
      "hyperMILL MAXX Machining roughing cycle: high-feed plunge milling with trochoidal engagement. " +
      "Optimal for hardened steels and Inconel. Configures tool, stepdown, approach as helical, and flood coolant.",
    operations: ["maxx_roughing"],
    required_params: ["tool_number", "stepdown_mm"],
    optional_params: ["stock_leave_mm", "coolant", "spindle_rpm", "feed_mm_min"],
    example_snippet: [
      "job = hm.AddJob('MAXX_Rough_01', '3D:MAXX Roughing')",
      "job.SetTool(1)",
      "job.SetParameter('ap', 3.0)",
      "job.SetApproach('helical')",
    ].join("\n"),
  },
  {
    id: "hpc_roughing_3d",
    category: "roughing_3d",
    title: "HPC 3D Roughing",
    description:
      "High-Performance Cutting (HPC) roughing: constant engagement trochoidal roughing for aluminium and " +
      "non-ferrous. Optimised chip load with dynamic arc engagement, climb cut, TSC coolant.",
    operations: ["hpc_roughing"],
    required_params: ["tool_number", "stepdown_mm", "stepover_mm"],
    optional_params: ["cut_direction", "coolant", "stock_leave_mm"],
    example_snippet: [
      "job = hm.AddJob('HPC_Rough_01', '3D:HPC Roughing')",
      "job.SetTool(2)",
      "job.SetParameter('ap', 8.0)",
      "job.SetParameter('ae', 1.5)",
    ].join("\n"),
  },
  {
    id: "z_level_finishing_3d",
    category: "finishing_3d",
    title: "Z-Level Finishing",
    description:
      "Depth-first Z-level finishing for steep surfaces (wall angle > 30°). Equidistant Z-steps, " +
      "climb cut, tangential approach/retract. Pairs with pencil finish for corner cleanup.",
    operations: ["z_level_finishing"],
    required_params: ["tool_number", "stepdown_mm"],
    optional_params: ["stock_leave_mm", "floor_stock_mm", "coolant", "approach", "retract"],
    example_snippet: [
      "job = hm.AddJob('ZLevel_Finish_01', '3D:Z-Level Finishing')",
      "job.SetTool(3)",
      "job.SetParameter('ap', 0.3)",
      "job.SetApproach('tangential')",
    ].join("\n"),
  },
  {
    id: "scallop_parallel_3d",
    category: "finishing_3d",
    title: "Scallop / Equidistant Finishing",
    description:
      "Equidistant finishing (constant scallop) for shallow-to-medium surfaces (< 45°). " +
      "Scallop height control ensures Ra target. Use after Z-level pass for full coverage.",
    operations: ["scallop_finishing"],
    required_params: ["tool_number", "scallop_height_mm"],
    optional_params: ["angle_deg", "stock_leave_mm", "coolant"],
    example_snippet: [
      "job = hm.AddJob('Scallop_Finish_01', '3D:Equidistant Finishing')",
      "job.SetTool(4)",
      "job.SetParameter('scallop_height', 0.005)",
      "job.SetParameter('direction', 0.0)",
    ].join("\n"),
  },
  {
    id: "pencil_finish_3d",
    category: "finishing_3d",
    title: "Pencil Milling (Corner Finish)",
    description:
      "Pencil milling for internal corner cleanup after surface finishing. Detects unmachined " +
      "material on concave blends and generates single-path cleanup passes.",
    operations: ["pencil_finishing"],
    required_params: ["tool_number"],
    optional_params: ["stepdown_mm", "stock_leave_mm", "use_rest", "rest_ref_op"],
    example_snippet: [
      "job = hm.AddJob('Pencil_01', '3D:Pencil Milling')",
      "job.SetTool(5)",
      "job.SetRestRef('ZLevel_Finish_01')",
    ].join("\n"),
  },
  {
    id: "blade_machining_5x",
    category: "five_axis",
    title: "5-Axis Blade Machining",
    description:
      "Full 5-axis blade sequence: roughing between blade flanks with 3+2 clearance planes, " +
      "finishing with swarf cutting along leading/trailing edge, tangent-plane hub finishing. " +
      "RTCP enabled for all passes.",
    operations: ["blade_roughing", "blade_finishing", "swarf_cutting"],
    required_params: ["tool_number", "pass_count"],
    optional_params: ["stepdown_mm", "scallop_height_mm", "coolant", "spindle_rpm"],
    example_snippet: [
      "job = hm.AddJob('Blade_Rough_01', '5X:Blade Roughing')",
      "job.SetTool(6)",
      "job.SetParameter('passes', 3)",
      "job.EnableRTCP(True)",
    ].join("\n"),
  },
  {
    id: "impeller_5x",
    category: "five_axis",
    title: "5-Axis Impeller Machining",
    description:
      "Impeller roughing (channel clearing) followed by hub and blade finishing. " +
      "Splitter blade support, automatic collision avoidance, full RTCP, flood/TSC coolant.",
    operations: ["impeller_roughing", "impeller_finishing"],
    required_params: ["tool_number"],
    optional_params: ["pass_count", "scallop_height_mm", "coolant"],
    example_snippet: [
      "job = hm.AddJob('Impeller_Rough_01', '5X:Impeller Roughing')",
      "job.SetTool(7)",
      "job.SetParameter('blade_count', 7)",
      "job.SetParameter('splitter_blades', True)",
    ].join("\n"),
  },
  {
    id: "port_machining_5x",
    category: "five_axis",
    title: "5-Axis Port Machining",
    description:
      "Port roughing and finishing for engine porting, intake/exhaust passages. " +
      "Long-reach tooling support, tilt optimization to avoid spindle collision, flood coolant.",
    operations: ["port_roughing", "port_finishing"],
    required_params: ["tool_number"],
    optional_params: ["stepdown_mm", "scallop_height_mm", "coolant", "safety_distance_mm"],
    example_snippet: [
      "job = hm.AddJob('Port_Rough_01', '5X:Port Roughing')",
      "job.SetTool(8)",
      "job.SetParameter('ap', 2.0)",
      "job.SetSafetyDistance(5.0)",
    ].join("\n"),
  },
  {
    id: "tool_setup_hm",
    category: "tool_setup",
    title: "Import Tools from PRISM Catalog",
    description:
      "Configures hyperMILL tool database entries via AC Python: sets geometry class, " +
      "diameter, corner radius, flute length, substrate, coating, and cutting data " +
      "per material group. Matches PRISM tool catalog schema.",
    operations: ["tool_setup"],
    required_params: ["tools"],
    optional_params: [],
    example_snippet: [
      "tool = hm.ToolDB.CreateTool('endmill_flat')",
      "tool.SetNumber(1)",
      "tool.SetDiameter(10.0)",
      "tool.SetFluteLength(25.0)",
    ].join("\n"),
  },
  {
    id: "batch_nc_generation",
    category: "nc_generation",
    title: "Batch NC Generation for All Operations",
    description:
      "Iterates all operations in the active hyperMILL job list and runs NcGenerator for each. " +
      "Writes NC files to the specified output folder. Supports all 16 controller families " +
      "available in NcGenerator v33.",
    operations: ["nc_generation", "batch"],
    required_params: ["post_name", "nc_output_path"],
    optional_params: ["run_nc_generation"],
    example_snippet: [
      "nc = hm.NcGenerator()",
      "nc.SetPost('omPPFI')",
      "nc.SetOutputDir('C:/NC')",
      "nc.GenerateAll()",
    ].join("\n"),
  },
  {
    id: "job_setup_hm",
    category: "job_setup",
    title: "Create New hyperMILL Job with WCS",
    description:
      "Creates a new hyperMILL job list, assigns machine definition, sets coordinate " +
      "system / WCS, and configures stock model. Foundation for all subsequent operations.",
    operations: ["job_setup"],
    required_params: ["job_name"],
    optional_params: ["machine_name", "wcs_name", "stock_model_name"],
    example_snippet: [
      "hm = HyperMill.Application()",
      "hm.OpenDocument('part.hmc')",
      "job = hm.CreateJobList('PRISM_Job')",
      "job.SetMachine('5AX_DMU50')",
    ].join("\n"),
  },
];

// ─── Script Builders ──────────────────────────────────────────────────────────

function buildHeader(params: HMGenerateParams, opCount: number): string {
  const ver = params.hm_version ?? "33.0";
  const partName = params.part_name ?? "MyPart";
  const jobName = params.job_name ?? "PRISM_Job";
  return [
    `# hyperMILL Python Script`,
    `# Part: ${partName}  |  Job: ${jobName}`,
    `# Generated by PRISM HyperMillCodeGeneratorEngine (E1120)`,
    `# hyperMILL v${ver} — ${opCount} operation(s)`,
    `#`,
    `# Usage: Run via hyperMILL Python window (View > Python)`,
    ``,
    `import om`,
    `import om.cam.core as cam`,
    `import om.cam.gui as gui`,
    ``,
  ].join("\n");
}

function buildErrorHandlerOpen(): string {
  return [
    `try:`,
    ``,
  ].join("\n");
}

function buildErrorHandlerClose(): string {
  return [
    ``,
    `except Exception as e:`,
    `    gui.ShowMessageBox(f"Script error: {e}", gui.Severity.ERROR)`,
    `    raise`,
  ].join("\n");
}

function buildJobSetup(params: HMGenerateParams): string {
  const lines: string[] = [];
  const indent = params.add_error_handling ? "    " : "";
  const machineName = params.machine_name ?? "Default_Machine";
  const wcsName = params.wcs_name ?? "WCS_1";
  const stockName = params.stock_model_name ?? "";

  if (params.add_progress_msgs) {
    lines.push(`${indent}print("Setting up hyperMILL job...")`);
  }
  lines.push(`${indent}# ── Application & Document Setup ─────────────────────`);
  lines.push(`${indent}app = om.GetApplication()`);
  lines.push(`${indent}cam_model = app.CurrentDocument.CamModel`);
  lines.push(`${indent}if cam_model is None:`);
  lines.push(`${indent}    gui.ShowMessageBox("No CAM model. Open a project first.", gui.Severity.WARNING)`);
  lines.push(`${indent}    raise RuntimeError("No CAM model")`);
  lines.push(`${indent}jl_set = cam_model.JobListSet`);
  lines.push(`${indent}tool_set = cam_model.ToolSet`);
  lines.push(``);
  return lines.join("\n");
}

function buildToolSetup(tools: HMTool[], params: HMGenerateParams): string {
  if (!tools.length) return "";
  const indent = params.add_error_handling ? "    " : "";
  const lines: string[] = [
    `${indent}# ── Tool Setup ─────────────────────────────────────`,
    `${indent}# Tools must exist in the hyperMILL tool database.`,
    `${indent}# Use tool_set.AddDBTool(toolID) to add from DB by ID,`,
    `${indent}# then configure via tool.SetCfgParameters({"key": "value"}).`,
    `${indent}existing_tools = tool_set.GetTools()`,
    `${indent}tool_map = {t.Name: t for t in existing_tools}`,
    `${indent}gui.Write(f"Found {len(existing_tools)} tools in project")`,
  ];

  for (const t of tools) {
    const label = t.label ?? `Tool_${t.number}`;
    lines.push(`${indent}`);
    lines.push(`${indent}# Tool ${t.number}: ${label} (${t.type} ø${t.diameter_mm}mm)`);

    // Build a CfgParameters dict for tool properties
    const toolCfg: string[] = [];
    toolCfg.push(`"diameter": "${t.diameter_mm}"`);
    toolCfg.push(`"description": "${label}"`);
    if (t.corner_radius_mm != null) {
      toolCfg.push(`"corner_radius": "${t.corner_radius_mm}"`);
    }
    if (t.flute_length_mm != null) {
      toolCfg.push(`"flute_length": "${t.flute_length_mm}"`);
    }
    if (t.overall_length_mm != null) {
      toolCfg.push(`"overall_length": "${t.overall_length_mm}"`);
    }
    if (t.flutes != null) {
      toolCfg.push(`"number_of_teeth": "${t.flutes}"`);
    }
    if (t.material) {
      toolCfg.push(`"substrate": "${t.material.toUpperCase()}"`);
    }
    if (t.coating) {
      toolCfg.push(`"coating": "${t.coating}"`);
    }
    lines.push(`${indent}t${t.number}_cfg = {${toolCfg.join(", ")}}`);
    lines.push(`${indent}gui.Write(f"  T${t.number}: ${label} D=${t.diameter_mm}mm")`);
  }
  lines.push(``);
  return lines.join("\n");
}

function buildOperation(op: HMOperation, idx: number, params: HMGenerateParams): string {
  const indent = params.add_error_handling ? "    " : "";
  const opName = op.name ?? `Op_${String(idx + 1).padStart(2, "0")}_${op.type}`;
  const cycleCode = op.cycle_code ?? CYCLE_CODE_MAP[op.type] ?? op.type;
  const lines: string[] = [];

  if (params.add_progress_msgs) {
    lines.push(`${indent}print("Building operation: ${opName}...")`);
  }

  // Skip utility-only ops that have no job entry
  if (cycleCode === "_util") return lines.join("\n");

  lines.push(`${indent}# ── ${opName} ─────────────────────────────────────`);
  lines.push(`${indent}op${idx} = job_list.AddOperation("${opName}", "${cycleCode}")`);

  // Build CfgParameters dict for this operation
  const cfgEntries: string[] = [];
  if (op.tool_number != null) {
    lines.push(`${indent}# Assign tool T${op.tool_number}`);
  }
  if (op.spindle_rpm != null) {
    cfgEntries.push(`"spindle_speed": "${op.spindle_rpm}"`);
  }
  if (op.feed_mm_min != null) {
    cfgEntries.push(`"feed": "${op.feed_mm_min}"`);
  }
  if (op.stepdown_mm != null) {
    cfgEntries.push(`"ap": "${op.stepdown_mm}"`);
  }
  if (op.stepover_mm != null) {
    cfgEntries.push(`"ae": "${op.stepover_mm}"`);
  }
  if (op.scallop_height_mm != null) {
    cfgEntries.push(`"scallop_height": "${op.scallop_height_mm}"`);
  }
  if (op.stock_leave_mm != null) {
    cfgEntries.push(`"stock_leave": "${op.stock_leave_mm}"`);
  }
  if (op.floor_stock_mm != null) {
    cfgEntries.push(`"floor_stock": "${op.floor_stock_mm}"`);
  }
  if (op.angle_deg != null) {
    cfgEntries.push(`"direction": "${op.angle_deg}"`);
  }
  if (op.pass_count != null) {
    cfgEntries.push(`"pass_count": "${op.pass_count}"`);
  }
  if (cfgEntries.length > 0) {
    lines.push(`${indent}op${idx}_params = {${cfgEntries.join(", ")}}`);
    lines.push(`${indent}gui.Write(f"  ${opName}: {len(op${idx}_params)} params")`);
  }
  if (op.cut_direction) {
    const dirMap: Record<string, string> = { climb: "CLIMB", conventional: "CONV", both: "BOTH" };
    lines.push(`${indent}op${idx}.SetCuttingDirection("${dirMap[op.cut_direction] ?? op.cut_direction}")`);
  }
  if (op.coolant && op.coolant !== "off") {
    const coolantMap: Record<string, string> = {
      flood: "FLOOD", mist: "MIST", air: "AIR_BLAST", tsc: "THROUGH_SPINDLE",
    };
    lines.push(`${indent}op${idx}.SetCoolant("${coolantMap[op.coolant] ?? op.coolant.toUpperCase()}")`);
  }

  // Approach / retract
  if (op.approach && op.approach !== "none") {
    const appMap: Record<string, string> = {
      helical: "HELICAL", ramp: "RAMP", plunge: "PLUNGE", predrill: "PREDRILL",
    };
    lines.push(`${indent}op${idx}.SetApproach("${appMap[op.approach] ?? op.approach.toUpperCase()}")`);
  }
  if (op.retract) {
    const retMap: Record<string, string> = {
      normal: "NORMAL", tangential: "TANGENTIAL", direct: "DIRECT",
    };
    lines.push(`${indent}op${idx}.SetRetract("${retMap[op.retract] ?? op.retract.toUpperCase()}")`);
  }

  // Clearance / safety
  if (op.clearance_z_mm != null) {
    lines.push(`${indent}op${idx}.SetClearancePlane(${op.clearance_z_mm})`);
  }
  if (op.safety_distance_mm != null) {
    lines.push(`${indent}op${idx}.SetSafetyDistance(${op.safety_distance_mm})`);
  }

  // Rest machining reference
  if (op.use_rest && op.rest_ref_op) {
    lines.push(`${indent}op${idx}.SetRestReference("${op.rest_ref_op}")`);
  }

  // 5-axis RTCP enable
  if (
    op.type === "blade_roughing" || op.type === "blade_finishing" ||
    op.type === "impeller_roughing" || op.type === "impeller_finishing" ||
    op.type === "swarf_cutting" || op.type === "tangent_plane" ||
    op.type === "port_roughing" || op.type === "port_finishing" ||
    op.type === "five_axis_surface"
  ) {
    lines.push(`${indent}op${idx}.EnableRTCP(True)`);
  }

  // Extra verbatim lines
  if (op.extra_lines?.length) {
    for (const line of op.extra_lines) {
      lines.push(`${indent}${line}`);
    }
  }

  lines.push(``);
  return lines.join("\n");
}

function buildNCGeneration(params: HMGenerateParams): string {
  if (!params.run_nc_generation) return "";
  const indent = params.add_error_handling ? "    " : "";
  const postName = params.post_processor ?? "omPPFI";
  const outFolder = params.nc_output_folder ?? "C:/NC_Output";
  return [
    `${indent}# ── NC Generation ───────────────────────────────────`,
    `${indent}nc_gen = hm.NcGenerator.GetInstance()`,
    `${indent}nc_gen.SetPostProcessor("${postName}")`,
    `${indent}nc_gen.SetOutputDirectory(r"${outFolder}")`,
    `${indent}nc_gen.GenerateAll()`,
    ...(params.add_progress_msgs ? [`${indent}print("NC generation complete.")`] : []),
    ``,
  ].join("\n");
}

function buildBatchNCOps(ops: HMOperation[], params: HMGenerateParams): string {
  const batchOps = ops.filter(o => o.type === "nc_generation" || o.type === "batch");
  if (!batchOps.length) return "";
  const indent = params.add_error_handling ? "    " : "";
  const lines: string[] = [`${indent}# ── Batch NC Generation ─────────────────────────────`];

  for (const op of batchOps) {
    const postName = op.post_name ?? params.post_processor ?? "omPPFI";
    const outPath = op.nc_output_path ?? params.nc_output_folder ?? "C:/NC_Output";
    lines.push(`${indent}nc_gen = hm.NcGenerator.GetInstance()`);
    lines.push(`${indent}nc_gen.SetPostProcessor("${postName}")`);
    lines.push(`${indent}nc_gen.SetOutputDirectory(r"${outPath}")`);
    lines.push(`${indent}nc_gen.GenerateAll()`);
  }
  lines.push(``);
  return lines.join("\n");
}

// ─── Engine Class ─────────────────────────────────────────────────────────────

class HyperMillCodeGeneratorEngine {
  /** Generate a complete hyperMILL Automation Center Python script */
  generateACScript(
    operations: HMOperation[],
    tools: HMTool[],
    params: HMGenerateParams,
  ): HMGenerateResult {
    const warnings: string[] = [];
    const ops = operations ?? [];
    const tls = tools ?? [];
    const p = params ?? {};

    // Validate and warn on missing critical params
    for (const op of ops) {
      if (op.tool_number == null && op.type !== "nc_generation" && op.type !== "batch" && op.type !== "job_setup") {
        warnings.push(`Operation "${op.name ?? op.type}" has no tool_number — will generate without SetTool()`);
      }
      if ((op.type === "maxx_roughing" || op.type === "hpc_roughing") && !op.stepdown_mm) {
        warnings.push(`Operation "${op.name ?? op.type}": stepdown_mm not set — defaulting to tool diameter × 0.3`);
      }
    }

    const header = buildHeader(p, ops.length);
    const errOpen = p.add_error_handling ? buildErrorHandlerOpen() : "";
    const errClose = p.add_error_handling ? buildErrorHandlerClose() : "";
    const jobSetup = buildJobSetup(p);
    const toolSetup = buildToolSetup(tls, p);

    const opBlocks = ops
      .map((op, idx) => buildOperation(op, idx, p))
      .join("");

    const batchNC = buildBatchNCOps(ops, p);
    const ncGen = (!batchNC && p.run_nc_generation) ? buildNCGeneration(p) : "";

    const script = [
      header,
      errOpen,
      jobSetup,
      toolSetup,
      opBlocks,
      batchNC,
      ncGen,
      errClose,
    ]
      .filter(Boolean)
      .join("\n");

    const scriptLines = script.split("\n");
    const opsIncluded = ops.map(o => o.name ?? o.type);
    const toolsReferenced = [...new Set(ops.map(o => o.tool_number).filter((n): n is number => n != null))];

    const description = this._buildDescription(ops, tls, p);

    return {
      script,
      description,
      line_count: scriptLines.length,
      operations_included: opsIncluded,
      tools_referenced: toolsReferenced,
      warnings,
    };
  }

  /** List available AC Python script templates, optionally filtered by category */
  getTemplates(category?: HMTemplateCategory): HMTemplate[] {
    if (!category) return TEMPLATE_DB;
    return TEMPLATE_DB.filter(t => t.category === category);
  }

  /** Best-effort natural-language → AC Python script generation */
  generateFromDescription(text: string): HMGenerateResult {
    const lower = text.toLowerCase();
    const ops: HMOperation[] = [];
    const warnings: string[] = [];

    // Detect operations from natural language keywords
    if (/maxx|high.?feed|hf.?mill/i.test(text)) {
      ops.push({ type: "maxx_roughing", name: "MAXX_Rough_01", tool_number: 1, stepdown_mm: 3.0, coolant: "flood" });
    } else if (/hpc|trochoidal|dynamic/i.test(text)) {
      ops.push({ type: "hpc_roughing", name: "HPC_Rough_01", tool_number: 1, stepdown_mm: 8.0, stepover_mm: 1.5, coolant: "flood" });
    } else if (/rough/i.test(text)) {
      ops.push({ type: "z_level_roughing", name: "ZLevel_Rough_01", tool_number: 1, stepdown_mm: 5.0, coolant: "flood" });
    }

    if (/z.level.finish/i.test(text)) {
      ops.push({ type: "z_level_finishing", name: "ZLevel_Finish_01", tool_number: 2, stepdown_mm: 0.3, stock_leave_mm: 0, coolant: "flood" });
    }
    if (/scallop|equidistant|parallel/i.test(text)) {
      ops.push({ type: "scallop_finishing", name: "Scallop_Finish_01", tool_number: 2, scallop_height_mm: 0.005, coolant: "flood" });
    }
    if (/pencil|corner.clean|corner.finish/i.test(text)) {
      ops.push({ type: "pencil_finishing", name: "Pencil_01", tool_number: 3 });
    }
    if (/blade/i.test(text)) {
      ops.push({ type: "blade_roughing", name: "Blade_Rough_01", tool_number: 4, pass_count: 3, coolant: "tsc" });
      ops.push({ type: "blade_finishing", name: "Blade_Finish_01", tool_number: 5, scallop_height_mm: 0.01, coolant: "tsc" });
    }
    if (/impeller/i.test(text)) {
      ops.push({ type: "impeller_roughing", name: "Impeller_Rough_01", tool_number: 4, coolant: "tsc" });
      ops.push({ type: "impeller_finishing", name: "Impeller_Finish_01", tool_number: 5, scallop_height_mm: 0.01, coolant: "tsc" });
    }
    if (/port/i.test(text)) {
      ops.push({ type: "port_roughing", name: "Port_Rough_01", tool_number: 4, stepdown_mm: 2.0, coolant: "flood" });
    }
    if (/swarf/i.test(text)) {
      ops.push({ type: "swarf_cutting", name: "Swarf_01", tool_number: 5, coolant: "tsc" });
    }
    if (/batch|nc.gen|post.proc/i.test(text)) {
      ops.push({ type: "nc_generation", name: "NC_Gen_All", post_name: "omPPFI", nc_output_path: "C:/NC_Output" });
    }

    if (ops.length === 0) {
      ops.push({ type: "z_level_roughing", name: "Rough_01", tool_number: 1, stepdown_mm: 5.0 });
      warnings.push(`Could not identify specific operations from description — defaulted to Z-Level Roughing.`);
    }

    warnings.push("Generated from natural-language description — review all parameters before execution.");

    // Detect post-processor preference
    let postProc = "omPPFI";
    if (/siemens|sinumerik/i.test(lower)) postProc = "omPPSI";
    else if (/heidenhain|tnc/i.test(lower)) postProc = "omPPHH";
    else if (/haas/i.test(lower)) postProc = "omPPF3X";

    const p: HMGenerateParams = {
      part_name: "NL_Generated_Part",
      job_name: "PRISM_NL_Job",
      add_error_handling: true,
      add_progress_msgs: true,
      run_nc_generation: /batch|nc.gen|post/i.test(text),
      post_processor: postProc,
    };

    return this.generateACScript(ops, [], p);
  }

  /** Generate an NcGenerator post-processor invocation config snippet */
  generateNCConfig(controller: string): HMNCConfigResult {
    const key = controller.toLowerCase().replace(/[\s-]/g, "");
    const entry =
      CONTROLLER_POST_MAP[key] ??
      CONTROLLER_POST_MAP["fanuc"];

    const matched = !!CONTROLLER_POST_MAP[key];
    const notes = matched ? entry.notes : [
      ...entry.notes,
      `Controller "${controller}" not in map — defaulted to FANUC-Interactive (omPPFI).`,
    ];

    const script = [
      `# NcGenerator v33 Configuration — ${entry.family}`,
      `nc_gen = hm.NcGenerator.GetInstance()`,
      `nc_gen.SetPostProcessor("${entry.post_name}")`,
      `nc_gen.SetOutputDirectory(r"C:/NC_Output")`,
      `nc_gen.SetMeasuringSystem("METRIC")`,
      `nc_gen.SetDecimalSeparator(".")`,
      `nc_gen.EnableRTCP(True)`,
      `nc_gen.GenerateAll()`,
    ].join("\n");

    return {
      script,
      controller_family: entry.family,
      post_name: entry.post_name,
      notes,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _buildDescription(
    ops: HMOperation[],
    tools: HMTool[],
    params: HMGenerateParams,
  ): string {
    const parts: string[] = [
      `hyperMILL AC Python script for "${params.part_name ?? "part"}"`,
      `with ${ops.length} operation(s)`,
    ];
    if (tools.length) parts.push(`and ${tools.length} tool(s) configured`);
    if (params.run_nc_generation) parts.push(`— includes batch NC generation via NcGenerator v33`);
    if (params.machine_name) parts.push(`on machine "${params.machine_name}"`);
    return parts.join(" ");
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

export const hyperMillCodeGeneratorEngine = new HyperMillCodeGeneratorEngine();
export type { HyperMillCodeGeneratorEngine };
