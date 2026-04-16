/**
 * SolidCAMCodeGeneratorEngine — SolidCAM VBA/VSTA Automation Script Generator (E1118)
 *
 * Generates SolidWorks + SolidCAM automation macros (VBA / VSTA) for all major
 * SolidCAM operation types. Covers iMachining 2D/3D with Technology Wizard,
 * HSR/HSS high-speed operations, 2.5D cycles (pocket, profile, face, slot),
 * tool-library data binding, coordinate-system configuration, GPP post-processor
 * invocation, and batch-operation loops.
 *
 * Methods:
 *   generateVBA(operations, tools, params)   — produce complete VBA macro script
 *   getTemplates(category?)                  — list available script templates
 *   generateFromDescription(text)            — best-effort NLP → VBA script
 *   generateGPPConfig(controller)            — GPP post-processor config script
 *
 * Template categories:
 *   imachining_2d | imachining_3d | hsr | hss | pocket_2d | profile_2d |
 *   face_2d | slot_2d | coordinate_system | tool_setup | post_process | batch
 *
 * Sources:
 *   - SolidCAM 2024 API Reference (SolidCAMApiRef.chm)
 *   - SolidWorks VBA Macro Programming Guide
 *   - SolidCAM iMachining Technology Wizard documentation
 *   - GPP Post-Processor Configuration Manual
 *
 * @engine SolidCAMCodeGeneratorEngine
 * @shortcode E1118
 * @dispatcher camDispatcher
 * @actions solidcam_code_generate, solidcam_code_templates
 * @milestone CAMX-MS4/U09
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Supported SolidCAM operation types for VBA generation */
export type SCOperationType =
  | "imachining_2d"
  | "imachining_3d"
  | "hsr"
  | "hss"
  | "pocket_2d"
  | "profile_2d"
  | "face_2d"
  | "slot_2d"
  | "coordinate_system"
  | "tool_setup"
  | "post_process"
  | "batch";

/** Template category (same as operation type, exposed for getTemplates) */
export type SCTemplateCategory = SCOperationType;

/** A single SolidCAM operation descriptor for code generation */
export interface SCOperation {
  /** Operation type */
  type: SCOperationType;
  /** Human-readable operation name (used as VBA comment and part-name) */
  name?: string;
  /** iMachining Technology Wizard level 1–8 */
  technology_wizard_level?: number;
  /** Tool level slider 0.0–1.0 */
  tool_level_slider?: number;
  /** Step-down per level, mm */
  stepdown_mm?: number;
  /** Step-over, mm (HSS / 2.5D) */
  stepover_mm?: number;
  /** HSS finishing angle, degrees */
  angle_deg?: number;
  /** Pocket / profile depth, mm */
  depth_mm?: number;
  /** Pocket / slot width, mm */
  width_mm?: number;
  /** Cutting feed rate, mm/min */
  feed_mm_min?: number;
  /** Spindle speed, RPM */
  spindle_rpm?: number;
  /** Coolant mode */
  coolant?: "flood" | "mist" | "air" | "off" | "tsc";
  /** Reference to a tool by SolidCAM library slot number */
  tool_slot?: number;
  /** Coordinate system index (1-based) */
  cs_index?: number;
  /** GPP post-processor name */
  gpp_post_name?: string;
  /** Whether to verify after post-processing */
  verify_after_post?: boolean;
  /** Additional free-form parameters passed verbatim into VBA comments */
  extra?: Record<string, unknown>;
}

/** A SolidCAM tool entry (from SolidCAM tool library) */
export interface SCTool {
  /** SolidCAM tool library slot number */
  slot: number;
  /** Tool type */
  type: "endmill" | "ballnose" | "bullnose" | "drill" | "face_mill" | "thread_mill" | "other";
  /** Tool diameter, mm */
  diameter_mm: number;
  /** Number of flutes */
  flutes?: number;
  /** Flute length, mm */
  flute_length_mm?: number;
  /** Overall length, mm */
  overall_length_mm?: number;
  /** Tool material */
  material?: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  /** Coating */
  coating?: string;
  /** Descriptive label */
  label?: string;
}

/** Top-level generation parameters */
export interface SCGenerateParams {
  /** Part name or file path in SolidWorks */
  part_name?: string;
  /** SolidCAM job name */
  job_name?: string;
  /** Machine configuration name */
  machine_name?: string;
  /** Whether to add error-handling wrapper (On Error GoTo) */
  add_error_handling?: boolean;
  /** Whether to add progress MsgBox calls */
  add_progress_msgs?: boolean;
  /** NC output folder path (for post-processing) */
  nc_output_folder?: string;
  /** Whether to run simulation after generation */
  run_simulation?: boolean;
}

/** Result of generateVBA */
export interface SCGenerateResult {
  /** Complete VBA macro text */
  script: string;
  /** Human-readable description of what the script does */
  description: string;
  /** Estimated line count */
  line_count: number;
  /** Operations included in the script */
  operations_included: string[];
  /** Tools referenced */
  tools_referenced: number[];
  /** Warnings (e.g. missing parameters, defaulted values) */
  warnings: string[];
}

/** A template descriptor returned by getTemplates */
export interface SCTemplate {
  /** Template identifier */
  id: string;
  /** Display category */
  category: SCTemplateCategory;
  /** Short title */
  title: string;
  /** Description of what the template does */
  description: string;
  /** Required parameters */
  required_params: string[];
  /** Optional parameters */
  optional_params: string[];
  /** Example snippet (first 4 lines of VBA) */
  example_snippet: string;
}

/** Result of generateGPPConfig */
export interface SCGPPConfigResult {
  /** GPP configuration script content */
  script: string;
  /** Controller family detected */
  controller_family: string;
  /** Notes about controller-specific settings */
  notes: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Technology Wizard level descriptions */
const WIZARD_LEVEL_DESC: Record<number, string> = {
  1: "Ultra-conservative — thin-wall / first-time setup",
  2: "Conservative — soft material, light machine",
  3: "Moderate-light — standard aluminum",
  4: "Balanced — general purpose (default)",
  5: "Moderate-aggressive — rigid setup, good machine",
  6: "Aggressive — hard material, heavy machine",
  7: "Very aggressive — production environment",
  8: "Maximum — peak performance, full iMachining",
};

/** Known GPP controller families and their SolidCAM post names */
const GPP_CONTROLLER_MAP: Record<string, { family: string; post_prefix: string; notes: string[] }> = {
  fanuc: {
    family: "FANUC",
    post_prefix: "Fanuc",
    notes: ["Uses G17/G18/G19 plane selection", "Subprogram with M98/M99", "Tool length with G43/G44"],
  },
  haas: {
    family: "Haas",
    post_prefix: "Haas",
    notes: ["HAAS sub-dialect of FANUC", "Uses M06 for tool change", "G187 for accuracy mode"],
  },
  heidenhain: {
    family: "Heidenhain",
    post_prefix: "Heidenhain_iTNC",
    notes: ["Conversational format (TNC 530/640)", "CYCL DEF for canned cycles", "FN functions for math"],
  },
  siemens: {
    family: "Siemens SINUMERIK",
    post_prefix: "Siemens_840D",
    notes: ["840D/828D dialect", "CYCLE800 for tilted workplane", "TRAORI for 5-axis"],
  },
  mazak: {
    family: "Mazak Mazatrol",
    post_prefix: "Mazak",
    notes: ["EIA/ISO mode or Mazatrol conversational", "M290/M291 for SMOOTH controls"],
  },
  okuma: {
    family: "Okuma OSP",
    post_prefix: "Okuma_OSP",
    notes: ["OSP P300/P500 dialect", "VC variables for parametric", "CALL OPM for subroutines"],
  },
  dmg: {
    family: "DMG Mori",
    post_prefix: "DMG_Mori",
    notes: ["Celos/Heidenhain iTNC base", "DMU series 5-axis support", "PLANE SPATIAL for tilting"],
  },
  generic: {
    family: "Generic ISO 6983",
    post_prefix: "ISO_Milling",
    notes: ["Standard G/M-code output", "No controller-specific cycles", "Safe for unknown machines"],
  },
};

/** Template library — 12 templates covering all operation categories */
const TEMPLATE_LIBRARY: SCTemplate[] = [
  {
    id: "imachining_2d_pocket",
    category: "imachining_2d",
    title: "iMachining 2D Pocket",
    description: "Creates an iMachining 2D operation on a selected pocket feature with Technology Wizard level, tool slot, and stepdown.",
    required_params: ["tool_slot", "technology_wizard_level", "stepdown_mm"],
    optional_params: ["tool_level_slider", "coolant", "cs_index"],
    example_snippet: `Dim oJob As SldCamJob\nDim oOp As SldCamOperation\nSet oJob = SldCamGetCurrentJob()\noOp = oJob.AddOperation("iMachining2D")`,
  },
  {
    id: "imachining_3d_contour",
    category: "imachining_3d",
    title: "iMachining 3D Contour",
    description: "Creates an iMachining 3D operation for sculptured surfaces with Technology Wizard and constant-engagement control.",
    required_params: ["tool_slot", "technology_wizard_level"],
    optional_params: ["stepdown_mm", "tool_level_slider", "coolant", "cs_index"],
    example_snippet: `Dim oJob As SldCamJob\nDim oOp As SldCamOperation\nSet oJob = SldCamGetCurrentJob()\noOp = oJob.AddOperation("iMachining3D")`,
  },
  {
    id: "hsr_morphed_roughing",
    category: "hsr",
    title: "HSR Morphed Roughing",
    description: "Sets up an HSR (High Speed Roughing) morphed spiral operation with stepdown and feed parameters.",
    required_params: ["tool_slot", "stepdown_mm", "stepover_mm"],
    optional_params: ["feed_mm_min", "spindle_rpm", "coolant", "cs_index"],
    example_snippet: `Dim oJob As SldCamJob\nDim oOp As SldCamOperation\nSet oJob = SldCamGetCurrentJob()\noOp = oJob.AddOperation("HSR")`,
  },
  {
    id: "hss_morphed_finishing",
    category: "hss",
    title: "HSS Morphed Finishing",
    description: "Sets up an HSS (High Speed Semi-finishing/Finishing) morphed operation with stepover and scallop-height angle parameters.",
    required_params: ["tool_slot", "stepover_mm"],
    optional_params: ["angle_deg", "feed_mm_min", "spindle_rpm", "coolant", "cs_index"],
    example_snippet: `Dim oJob As SldCamJob\nDim oOp As SldCamOperation\nSet oJob = SldCamGetCurrentJob()\noOp = oJob.AddOperation("HSS")`,
  },
  {
    id: "pocket_2d",
    category: "pocket_2d",
    title: "2.5D Pocket Operation",
    description: "Creates a 2.5D pocket milling operation with depth, stepover, and roughing/finishing passes.",
    required_params: ["tool_slot", "depth_mm", "stepover_mm"],
    optional_params: ["feed_mm_min", "spindle_rpm", "coolant", "cs_index"],
    example_snippet: `Dim oJob As SldCamJob\nDim oOp As SldCamOperation\nSet oJob = SldCamGetCurrentJob()\noOp = oJob.AddOperation("Pocket")`,
  },
  {
    id: "profile_2d",
    category: "profile_2d",
    title: "2.5D Profile / Contour",
    description: "Creates a 2.5D profile (contour) operation along selected edges or curves.",
    required_params: ["tool_slot", "depth_mm"],
    optional_params: ["stepdown_mm", "feed_mm_min", "spindle_rpm", "coolant", "cs_index"],
    example_snippet: `Dim oJob As SldCamJob\nDim oOp As SldCamOperation\nSet oJob = SldCamGetCurrentJob()\noOp = oJob.AddOperation("Profile")`,
  },
  {
    id: "face_2d",
    category: "face_2d",
    title: "2.5D Face Milling",
    description: "Creates a 2.5D face milling operation for stock-facing or planar surface finishing.",
    required_params: ["tool_slot", "stepover_mm"],
    optional_params: ["depth_mm", "feed_mm_min", "spindle_rpm", "coolant", "cs_index"],
    example_snippet: `Dim oJob As SldCamJob\nDim oOp As SldCamOperation\nSet oJob = SldCamGetCurrentJob()\noOp = oJob.AddOperation("Facing")`,
  },
  {
    id: "slot_2d",
    category: "slot_2d",
    title: "2.5D Slot Milling",
    description: "Creates a 2.5D slot milling operation with width and depth parameters.",
    required_params: ["tool_slot", "depth_mm", "width_mm"],
    optional_params: ["stepdown_mm", "feed_mm_min", "spindle_rpm", "coolant", "cs_index"],
    example_snippet: `Dim oJob As SldCamJob\nDim oOp As SldCamOperation\nSet oJob = SldCamGetCurrentJob()\noOp = oJob.AddOperation("Slot")`,
  },
  {
    id: "coordinate_system",
    category: "coordinate_system",
    title: "Coordinate System Setup",
    description: "Defines or selects a SolidCAM coordinate system (CS) tied to a SolidWorks reference geometry.",
    required_params: ["cs_index"],
    optional_params: [],
    example_snippet: `Dim oJob As SldCamJob\nDim oCS As SldCamCS\nSet oJob = SldCamGetCurrentJob()\nSet oCS = oJob.GetCoordSystem(1)`,
  },
  {
    id: "tool_setup",
    category: "tool_setup",
    title: "Tool Library Setup",
    description: "Loads and configures tool data from the SolidCAM tool library for a given slot.",
    required_params: ["tool_slot"],
    optional_params: [],
    example_snippet: `Dim oJob As SldCamJob\nDim oTool As SldCamTool\nSet oJob = SldCamGetCurrentJob()\nSet oTool = oJob.GetTool(1)`,
  },
  {
    id: "post_process_gpp",
    category: "post_process",
    title: "GPP Post-Process",
    description: "Runs the GPP post-processor for selected or all operations and saves NC output to a specified folder.",
    required_params: ["gpp_post_name"],
    optional_params: ["nc_output_folder", "verify_after_post"],
    example_snippet: `Dim oJob As SldCamJob\nSet oJob = SldCamGetCurrentJob()\nCall oJob.PostProcess("Fanuc", "C:\\NC\\")`,
  },
  {
    id: "batch_post_process",
    category: "batch",
    title: "Batch Post-Process Loop",
    description: "Loops over all SolidCAM operations and post-processes each one with GPP, with progress reporting.",
    required_params: ["gpp_post_name"],
    optional_params: ["nc_output_folder", "add_progress_msgs"],
    example_snippet: `Dim oJob As SldCamJob\nDim i As Integer\nSet oJob = SldCamGetCurrentJob()\nFor i = 1 To oJob.OperationCount`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns VBA header boilerplate for a SolidWorks macro */
function vbaHeader(partName: string, jobName: string, addErrorHandling: boolean): string {
  const lines: string[] = [
    `' ════════════════════════════════════════════════════════`,
    `' SolidCAM Automation Macro — generated by PRISM E1118`,
    `' Part:    ${partName}`,
    `' Job:     ${jobName}`,
    `' Generated: ${new Date().toISOString().slice(0, 10)}`,
    `' ════════════════════════════════════════════════════════`,
    `Option Explicit`,
    ``,
    `Sub Main()`,
  ];
  if (addErrorHandling) {
    lines.push(`    On Error GoTo ErrHandler`);
  }
  lines.push(`    Dim swApp    As Object`);
  lines.push(`    Dim swDoc    As Object`);
  lines.push(`    Dim oJob     As Object  ' SldCamJob`);
  lines.push(`    `);
  lines.push(`    ' ── Connect to SolidWorks ─────────────────────────────────`);
  lines.push(`    Set swApp = Application.SldWorks`);
  lines.push(`    Set swDoc = swApp.ActiveDoc`);
  lines.push(`    If swDoc Is Nothing Then`);
  lines.push(`        MsgBox "No active SolidWorks document found.", vbCritical`);
  lines.push(`        Exit Sub`);
  lines.push(`    End If`);
  lines.push(`    `);
  lines.push(`    ' ── Connect to SolidCAM Job ───────────────────────────────`);
  lines.push(`    Set oJob = SldCamGetCurrentJob(swDoc)`);
  lines.push(`    If oJob Is Nothing Then`);
  lines.push(`        MsgBox "No SolidCAM job found. Open a SolidCAM part first.", vbCritical`);
  lines.push(`        Exit Sub`);
  lines.push(`    End If`);
  lines.push(`    `);
  return lines.join("\n");
}

/** Returns VBA footer */
function vbaFooter(addErrorHandling: boolean, addProgressMsgs: boolean): string {
  const lines: string[] = [`    `];
  if (addProgressMsgs) {
    lines.push(`    MsgBox "SolidCAM macro complete.", vbInformation`);
  }
  lines.push(`    Exit Sub`);
  if (addErrorHandling) {
    lines.push(`ErrHandler:`);
    lines.push(`    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical`);
  }
  lines.push(`End Sub`);
  return lines.join("\n");
}

/** Generates VBA block for setting common operation parameters */
function opCommonParams(op: SCOperation, varName: string): string[] {
  const lines: string[] = [];
  if (op.spindle_rpm !== undefined) {
    lines.push(`    ${varName}.SetSpindleSpeed ${op.spindle_rpm}`);
  }
  if (op.feed_mm_min !== undefined) {
    lines.push(`    ${varName}.SetFeedRate ${op.feed_mm_min}`);
  }
  if (op.coolant !== undefined) {
    const coolantMap: Record<string, string> = {
      flood: "SldCamCoolant_Flood",
      mist: "SldCamCoolant_Mist",
      air: "SldCamCoolant_Air",
      off: "SldCamCoolant_Off",
      tsc: "SldCamCoolant_ThroughSpindle",
    };
    lines.push(`    ${varName}.SetCoolant ${coolantMap[op.coolant] ?? "SldCamCoolant_Flood"}`);
  }
  if (op.cs_index !== undefined) {
    lines.push(`    ${varName}.SetCoordSystem ${op.cs_index}`);
  }
  return lines;
}

/** Generates VBA block for a tool-load call */
function toolLoadBlock(slot: number, varName: string = "oTool"): string[] {
  return [
    `    Dim ${varName} As Object  ' SldCamTool`,
    `    Set ${varName} = oJob.GetTool(${slot})`,
    `    If ${varName} Is Nothing Then`,
    `        MsgBox "Tool slot ${slot} not found in SolidCAM library.", vbCritical`,
    `        Exit Sub`,
    `    End If`,
  ];
}

// ─── Operation Code Generators ────────────────────────────────────────────────

function genIMachining2D(op: SCOperation, opIdx: number): string[] {
  const v = `oOp${opIdx}`;
  const tSlot = op.tool_slot ?? 1;
  const wiz = op.technology_wizard_level ?? 4;
  const stepdown = op.stepdown_mm ?? 5.0;
  const slider = op.tool_level_slider ?? 0.5;
  const name = op.name ?? `iMachining2D_${opIdx}`;

  const lines: string[] = [
    `    ' ── iMachining 2D: ${name} ────────────────────────────────`,
    `    ' Technology Wizard Level ${wiz}: ${WIZARD_LEVEL_DESC[wiz] ?? "custom"}`,
    ...toolLoadBlock(tSlot, `oTool${opIdx}`),
    `    Dim ${v} As Object  ' SldCamOperation`,
    `    Set ${v} = oJob.AddOperation("iMachining2D", "${name}")`,
    `    ${v}.SetTool oTool${opIdx}`,
    `    ${v}.SetTechWizardLevel ${wiz}`,
    `    ${v}.SetToolLevelSlider ${slider}`,
    `    ${v}.SetStepDown ${stepdown}`,
    ...opCommonParams(op, v),
    `    ${v}.Calculate()`,
    `    `,
  ];
  return lines;
}

function genIMachining3D(op: SCOperation, opIdx: number): string[] {
  const v = `oOp${opIdx}`;
  const tSlot = op.tool_slot ?? 1;
  const wiz = op.technology_wizard_level ?? 4;
  const stepdown = op.stepdown_mm ?? 3.0;
  const slider = op.tool_level_slider ?? 0.5;
  const name = op.name ?? `iMachining3D_${opIdx}`;

  return [
    `    ' ── iMachining 3D: ${name} ────────────────────────────────`,
    `    ' Technology Wizard Level ${wiz}: ${WIZARD_LEVEL_DESC[wiz] ?? "custom"}`,
    ...toolLoadBlock(tSlot, `oTool${opIdx}`),
    `    Dim ${v} As Object  ' SldCamOperation`,
    `    Set ${v} = oJob.AddOperation("iMachining3D", "${name}")`,
    `    ${v}.SetTool oTool${opIdx}`,
    `    ${v}.SetTechWizardLevel ${wiz}`,
    `    ${v}.SetToolLevelSlider ${slider}`,
    `    ${v}.SetStepDown ${stepdown}`,
    ...opCommonParams(op, v),
    `    ${v}.Calculate()`,
    `    `,
  ];
}

function genHSR(op: SCOperation, opIdx: number): string[] {
  const v = `oOp${opIdx}`;
  const tSlot = op.tool_slot ?? 1;
  const stepdown = op.stepdown_mm ?? 5.0;
  const stepover = op.stepover_mm ?? 3.0;
  const name = op.name ?? `HSR_Roughing_${opIdx}`;

  return [
    `    ' ── HSR Morphed Roughing: ${name} ─────────────────────────`,
    ...toolLoadBlock(tSlot, `oTool${opIdx}`),
    `    Dim ${v} As Object  ' SldCamOperation`,
    `    Set ${v} = oJob.AddOperation("HSR", "${name}")`,
    `    ${v}.SetTool oTool${opIdx}`,
    `    ${v}.SetStepDown ${stepdown}`,
    `    ${v}.SetStepOver ${stepover}`,
    `    ${v}.SetHSRPattern "MorphedSpiral"`,
    ...opCommonParams(op, v),
    `    ${v}.Calculate()`,
    `    `,
  ];
}

function genHSS(op: SCOperation, opIdx: number): string[] {
  const v = `oOp${opIdx}`;
  const tSlot = op.tool_slot ?? 1;
  const stepover = op.stepover_mm ?? 0.3;
  const angle = op.angle_deg ?? 45.0;
  const name = op.name ?? `HSS_Finishing_${opIdx}`;

  return [
    `    ' ── HSS Morphed Finishing: ${name} ────────────────────────`,
    ...toolLoadBlock(tSlot, `oTool${opIdx}`),
    `    Dim ${v} As Object  ' SldCamOperation`,
    `    Set ${v} = oJob.AddOperation("HSS", "${name}")`,
    `    ${v}.SetTool oTool${opIdx}`,
    `    ${v}.SetStepOver ${stepover}`,
    `    ${v}.SetMorphingAngle ${angle}`,
    `    ${v}.SetHSSPattern "MorphedSpiral"`,
    ...opCommonParams(op, v),
    `    ${v}.Calculate()`,
    `    `,
  ];
}

function genPocket2D(op: SCOperation, opIdx: number): string[] {
  const v = `oOp${opIdx}`;
  const tSlot = op.tool_slot ?? 1;
  const depth = op.depth_mm ?? 10.0;
  const stepover = op.stepover_mm ?? 3.0;
  const name = op.name ?? `Pocket2D_${opIdx}`;

  return [
    `    ' ── 2.5D Pocket: ${name} ──────────────────────────────────`,
    ...toolLoadBlock(tSlot, `oTool${opIdx}`),
    `    Dim ${v} As Object  ' SldCamOperation`,
    `    Set ${v} = oJob.AddOperation("Pocket", "${name}")`,
    `    ${v}.SetTool oTool${opIdx}`,
    `    ${v}.SetDepth ${depth}`,
    `    ${v}.SetStepOver ${stepover}`,
    ...opCommonParams(op, v),
    `    ${v}.Calculate()`,
    `    `,
  ];
}

function genProfile2D(op: SCOperation, opIdx: number): string[] {
  const v = `oOp${opIdx}`;
  const tSlot = op.tool_slot ?? 1;
  const depth = op.depth_mm ?? 10.0;
  const stepdown = op.stepdown_mm ?? 5.0;
  const name = op.name ?? `Profile2D_${opIdx}`;

  return [
    `    ' ── 2.5D Profile: ${name} ─────────────────────────────────`,
    ...toolLoadBlock(tSlot, `oTool${opIdx}`),
    `    Dim ${v} As Object  ' SldCamOperation`,
    `    Set ${v} = oJob.AddOperation("Profile", "${name}")`,
    `    ${v}.SetTool oTool${opIdx}`,
    `    ${v}.SetDepth ${depth}`,
    `    ${v}.SetStepDown ${stepdown}`,
    ...opCommonParams(op, v),
    `    ${v}.Calculate()`,
    `    `,
  ];
}

function genFace2D(op: SCOperation, opIdx: number): string[] {
  const v = `oOp${opIdx}`;
  const tSlot = op.tool_slot ?? 1;
  const stepover = op.stepover_mm ?? 5.0;
  const depth = op.depth_mm ?? 0.5;
  const name = op.name ?? `FaceMilling_${opIdx}`;

  return [
    `    ' ── 2.5D Face Milling: ${name} ────────────────────────────`,
    ...toolLoadBlock(tSlot, `oTool${opIdx}`),
    `    Dim ${v} As Object  ' SldCamOperation`,
    `    Set ${v} = oJob.AddOperation("Facing", "${name}")`,
    `    ${v}.SetTool oTool${opIdx}`,
    `    ${v}.SetStepOver ${stepover}`,
    `    ${v}.SetDepth ${depth}`,
    ...opCommonParams(op, v),
    `    ${v}.Calculate()`,
    `    `,
  ];
}

function genSlot2D(op: SCOperation, opIdx: number): string[] {
  const v = `oOp${opIdx}`;
  const tSlot = op.tool_slot ?? 1;
  const depth = op.depth_mm ?? 8.0;
  const width = op.width_mm ?? 6.0;
  const stepdown = op.stepdown_mm ?? 4.0;
  const name = op.name ?? `Slot2D_${opIdx}`;

  return [
    `    ' ── 2.5D Slot: ${name} ────────────────────────────────────`,
    ...toolLoadBlock(tSlot, `oTool${opIdx}`),
    `    Dim ${v} As Object  ' SldCamOperation`,
    `    Set ${v} = oJob.AddOperation("Slot", "${name}")`,
    `    ${v}.SetTool oTool${opIdx}`,
    `    ${v}.SetDepth ${depth}`,
    `    ${v}.SetWidth ${width}`,
    `    ${v}.SetStepDown ${stepdown}`,
    ...opCommonParams(op, v),
    `    ${v}.Calculate()`,
    `    `,
  ];
}

function genCoordinateSystem(op: SCOperation, opIdx: number): string[] {
  const csIdx = op.cs_index ?? 1;
  const name = op.name ?? `CS_${csIdx}`;
  return [
    `    ' ── Coordinate System: ${name} (index ${csIdx}) ──────────`,
    `    Dim oCS${opIdx} As Object  ' SldCamCS`,
    `    Set oCS${opIdx} = oJob.GetCoordSystem(${csIdx})`,
    `    If oCS${opIdx} Is Nothing Then`,
    `        ' CS ${csIdx} not yet defined — create from origin`,
    `        Set oCS${opIdx} = oJob.AddCoordSystem("${name}")`,
    `        oCS${opIdx}.SetOriginFromSelection()`,
    `    End If`,
    `    oJob.SetActiveCoordSystem oCS${opIdx}`,
    `    `,
  ];
}

function genToolSetup(op: SCOperation, tools: SCTool[], opIdx: number): string[] {
  const tSlot = op.tool_slot ?? 1;
  const toolDef = tools.find(t => t.slot === tSlot);
  const lines: string[] = [
    `    ' ── Tool Setup: Slot ${tSlot} ──────────────────────────────`,
    ...toolLoadBlock(tSlot, `oToolSetup${opIdx}`),
  ];
  if (toolDef) {
    lines.push(`    ' Tool: ${toolDef.label ?? toolDef.type} Ø${toolDef.diameter_mm}mm`);
    lines.push(`    oToolSetup${opIdx}.SetDiameter ${toolDef.diameter_mm}`);
    if (toolDef.flutes !== undefined) {
      lines.push(`    oToolSetup${opIdx}.SetFlutes ${toolDef.flutes}`);
    }
    if (toolDef.flute_length_mm !== undefined) {
      lines.push(`    oToolSetup${opIdx}.SetFluteLength ${toolDef.flute_length_mm}`);
    }
    if (toolDef.overall_length_mm !== undefined) {
      lines.push(`    oToolSetup${opIdx}.SetOverallLength ${toolDef.overall_length_mm}`);
    }
  }
  lines.push(`    `);
  return lines;
}

function genPostProcess(op: SCOperation, params: SCGenerateParams, opIdx: number): string[] {
  const postName = op.gpp_post_name ?? "Generic_Milling";
  const outFolder = params.nc_output_folder ?? "C:\\NC\\";
  const verify = op.verify_after_post ?? false;
  const name = op.name ?? `PostProcess_${opIdx}`;

  const lines: string[] = [
    `    ' ── GPP Post-Process: ${name} ─────────────────────────────`,
    `    ' Post: ${postName} → ${outFolder}`,
    `    oJob.PostProcess "${postName}", "${outFolder}"`,
  ];
  if (verify) {
    lines.push(`    oJob.Simulate swDoc`);
  }
  lines.push(`    `);
  return lines;
}

function genBatchPostProcess(op: SCOperation, params: SCGenerateParams, addProgressMsgs: boolean): string[] {
  const postName = op.gpp_post_name ?? "Generic_Milling";
  const outFolder = params.nc_output_folder ?? "C:\\NC\\";

  return [
    `    ' ── Batch GPP Post-Process Loop ────────────────────────────`,
    `    ' Post: ${postName} → ${outFolder}`,
    `    Dim iBatch As Integer`,
    `    Dim nOps As Integer`,
    `    nOps = oJob.OperationCount`,
    addProgressMsgs ? `    MsgBox "Starting batch post: " & nOps & " operations.", vbInformation` : ``,
    `    For iBatch = 1 To nOps`,
    `        Dim oBatchOp As Object`,
    `        Set oBatchOp = oJob.GetOperation(iBatch)`,
    `        If Not (oBatchOp Is Nothing) Then`,
    `            oBatchOp.PostProcess "${postName}", "${outFolder}"`,
    addProgressMsgs ? `            ' Progress: MsgBox "Posted operation " & iBatch & " of " & nOps` : ``,
    `        End If`,
    `    Next iBatch`,
    `    `,
  ].filter(l => l !== ``);
}

// ─── NLP keyword → operation type mapper ─────────────────────────────────────

const NLP_KEYWORDS: Array<{ keywords: string[]; type: SCOperationType }> = [
  { keywords: ["imachining 2d", "imachining2d", "imachining pocket", "i-machining 2d"], type: "imachining_2d" },
  { keywords: ["imachining 3d", "imachining3d", "i-machining 3d", "imachining contour", "imachining surface"], type: "imachining_3d" },
  { keywords: ["hsr", "high speed rough", "high-speed rough", "morphed rough"], type: "hsr" },
  { keywords: ["hss", "high speed finish", "high-speed finish", "morphed finish", "morphed semi"], type: "hss" },
  { keywords: ["pocket", "pocket mill", "2.5d pocket", "25d pocket"], type: "pocket_2d" },
  { keywords: ["profile", "contour", "2.5d profile", "contour milling", "outside contour"], type: "profile_2d" },
  { keywords: ["face", "facing", "face mill", "face milling", "flat face"], type: "face_2d" },
  { keywords: ["slot", "slotting", "2.5d slot", "slot mill"], type: "slot_2d" },
  { keywords: ["coordinate system", "cs setup", "work zero", "datum", "wcs"], type: "coordinate_system" },
  { keywords: ["tool setup", "tool library", "tool data", "configure tool"], type: "tool_setup" },
  { keywords: ["post process", "gpp", "post-process", "nc output", "post processor"], type: "post_process" },
  { keywords: ["batch", "all operations", "loop", "batch post"], type: "batch" },
];

function detectOperationFromText(text: string): SCOperation {
  const lower = text.toLowerCase();
  for (const entry of NLP_KEYWORDS) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { type: entry.type, name: `Auto_${entry.type}` };
    }
  }
  // default fallback
  return { type: "pocket_2d", name: "Auto_Pocket2D" };
}

function extractNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return parseFloat(m[1]);
  }
  return undefined;
}

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class SolidCAMCodeGeneratorEngine {

  // ── generateVBA ─────────────────────────────────────────────────────────────

  /**
   * Generates a complete SolidWorks VBA macro that programs the specified
   * SolidCAM operations using the supplied tool data and generation parameters.
   *
   * @param operations - Array of operation descriptors (type + parameters)
   * @param tools      - Tool library entries referenced by operation.tool_slot
   * @param params     - Global generation parameters (part name, job name, etc.)
   * @returns SCGenerateResult with full script and metadata
   */
  generateVBA(
    operations: SCOperation[],
    tools: SCTool[] = [],
    params: SCGenerateParams = {},
  ): SCGenerateResult {
    const partName  = params.part_name  ?? "MyPart";
    const jobName   = params.job_name   ?? "SolidCAM_Job";
    const addEH     = params.add_error_handling ?? true;
    const addProg   = params.add_progress_msgs  ?? false;

    const warnings: string[] = [];
    const opsIncluded: string[] = [];
    const toolsReferenced = new Set<number>();

    const bodyLines: string[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const idx = i + 1;
      opsIncluded.push(op.name ?? `${op.type}_${idx}`);

      if (op.tool_slot !== undefined) toolsReferenced.add(op.tool_slot);

      switch (op.type) {
        case "imachining_2d":
          bodyLines.push(...genIMachining2D(op, idx));
          break;
        case "imachining_3d":
          bodyLines.push(...genIMachining3D(op, idx));
          break;
        case "hsr":
          bodyLines.push(...genHSR(op, idx));
          break;
        case "hss":
          bodyLines.push(...genHSS(op, idx));
          break;
        case "pocket_2d":
          bodyLines.push(...genPocket2D(op, idx));
          break;
        case "profile_2d":
          bodyLines.push(...genProfile2D(op, idx));
          break;
        case "face_2d":
          bodyLines.push(...genFace2D(op, idx));
          break;
        case "slot_2d":
          bodyLines.push(...genSlot2D(op, idx));
          break;
        case "coordinate_system":
          bodyLines.push(...genCoordinateSystem(op, idx));
          break;
        case "tool_setup":
          bodyLines.push(...genToolSetup(op, tools, idx));
          break;
        case "post_process":
          bodyLines.push(...genPostProcess(op, params, idx));
          break;
        case "batch":
          bodyLines.push(...genBatchPostProcess(op, params, addProg));
          break;
        default:
          warnings.push(`Unknown operation type "${(op as any).type}" at index ${i} — skipped.`);
      }
    }

    // Validate tool slots referenced
    for (const slot of toolsReferenced) {
      if (!tools.find(t => t.slot === slot)) {
        warnings.push(`Tool slot ${slot} referenced but not defined in tools array — using library defaults.`);
      }
    }

    if (params.run_simulation) {
      bodyLines.push(`    ' ── Run simulation ─────────────────────────────────────────`);
      bodyLines.push(`    oJob.Simulate swDoc`);
      bodyLines.push(`    `);
    }

    const header = vbaHeader(partName, jobName, addEH);
    const footer = vbaFooter(addEH, addProg);
    const script = [header, bodyLines.join("\n"), footer].join("\n");

    return {
      script,
      description: `SolidCAM VBA macro for "${jobName}" on part "${partName}". ` +
        `Includes ${operations.length} operation(s): ${opsIncluded.join(", ")}.`,
      line_count: script.split("\n").length,
      operations_included: opsIncluded,
      tools_referenced: [...toolsReferenced].sort((a, b) => a - b),
      warnings,
    };
  }

  // ── getTemplates ────────────────────────────────────────────────────────────

  /**
   * Returns available VBA script templates, optionally filtered by category.
   *
   * @param category - Optional category filter (e.g. "imachining_2d", "hss")
   * @returns Array of SCTemplate descriptors
   */
  getTemplates(category?: SCTemplateCategory): SCTemplate[] {
    if (!category) return TEMPLATE_LIBRARY;
    return TEMPLATE_LIBRARY.filter(t => t.category === category);
  }

  // ── generateFromDescription ─────────────────────────────────────────────────

  /**
   * Best-effort natural language → VBA script generator.
   * Parses the description text for operation keywords and numeric parameters,
   * then delegates to generateVBA for a single inferred operation.
   *
   * @param text - Plain-English description of desired operation
   * @returns SCGenerateResult with best-effort script and description
   */
  generateFromDescription(text: string): SCGenerateResult {
    const op = detectOperationFromText(text);

    // Extract numbers from text
    op.technology_wizard_level = extractNumber(text, [
      /(?:wizard|level)\s+(\d)/i,
      /tw[-\s]?(\d)/i,
    ]) ?? op.technology_wizard_level;

    op.stepdown_mm = extractNumber(text, [
      /(\d+(?:\.\d+)?)\s*mm\s+(?:step.?down|ap)/i,
      /step.?down[:\s]+(\d+(?:\.\d+)?)/i,
    ]) ?? op.stepdown_mm;

    op.stepover_mm = extractNumber(text, [
      /(\d+(?:\.\d+)?)\s*mm\s+(?:step.?over|ae)/i,
      /step.?over[:\s]+(\d+(?:\.\d+)?)/i,
    ]) ?? op.stepover_mm;

    op.tool_slot = extractNumber(text, [
      /tool\s+(?:slot|#|no\.?)\s*(\d+)/i,
      /slot\s+(\d+)/i,
    ]) ?? op.tool_slot ?? 1;

    op.spindle_rpm = extractNumber(text, [
      /(\d+)\s*rpm/i,
      /spindle[:\s]+(\d+)/i,
    ]) ?? op.spindle_rpm;

    op.feed_mm_min = extractNumber(text, [
      /(\d+(?:\.\d+)?)\s*mm\/min/i,
      /feed[:\s]+(\d+(?:\.\d+)?)/i,
    ]) ?? op.feed_mm_min;

    op.depth_mm = extractNumber(text, [
      /(\d+(?:\.\d+)?)\s*mm\s+(?:deep|depth)/i,
      /depth[:\s]+(\d+(?:\.\d+)?)/i,
    ]) ?? op.depth_mm;

    op.angle_deg = extractNumber(text, [
      /(\d+(?:\.\d+)?)\s*(?:deg|°)\s+angle/i,
      /angle[:\s]+(\d+(?:\.\d+)?)/i,
    ]) ?? op.angle_deg;

    op.name = `Auto_${op.type}`;
    return this.generateVBA([op], [], { part_name: "MyPart", job_name: "Auto_Job" });
  }

  // ── generateGPPConfig ───────────────────────────────────────────────────────

  /**
   * Generates a GPP post-processor configuration script / documentation for
   * the specified target CNC controller. Returns a VBA snippet plus controller-
   * specific notes and the detected controller family.
   *
   * @param controller - Controller keyword (e.g. "fanuc", "haas", "heidenhain")
   * @returns SCGPPConfigResult with script, family, and notes
   */
  generateGPPConfig(controller: string): SCGPPConfigResult {
    const key = controller.toLowerCase().trim();
    const cfg = GPP_CONTROLLER_MAP[key] ?? GPP_CONTROLLER_MAP["generic"]!;

    const script = [
      `' ════════════════════════════════════════════════════════`,
      `' GPP Post-Processor Configuration — generated by PRISM E1118`,
      `' Controller family: ${cfg.family}`,
      `' Recommended GPP post prefix: ${cfg.post_prefix}`,
      `' ════════════════════════════════════════════════════════`,
      `Option Explicit`,
      ``,
      `Sub ConfigureGPPPost()`,
      `    On Error GoTo ErrHandler`,
      `    Dim swApp  As Object`,
      `    Dim swDoc  As Object`,
      `    Dim oJob   As Object`,
      `    Set swApp = Application.SldWorks`,
      `    Set swDoc = swApp.ActiveDoc`,
      `    Set oJob  = SldCamGetCurrentJob(swDoc)`,
      `    If oJob Is Nothing Then`,
      `        MsgBox "No SolidCAM job found.", vbCritical`,
      `        Exit Sub`,
      `    End If`,
      `    `,
      `    ' ── Set GPP Post-Processor ───────────────────────────────`,
      `    ' Select the ${cfg.post_prefix} post from the SolidCAM GPP library.`,
      `    ' In Job Manager: Machine → Post Processor → "${cfg.post_prefix}"`,
      `    oJob.SetPostProcessor "${cfg.post_prefix}"`,
      `    `,
      `    ' ── Controller-Specific Settings ────────────────────────`,
      ...cfg.notes.map(n => `    ' ${n}`),
      `    `,
      `    MsgBox "GPP post configured: ${cfg.family}", vbInformation`,
      `    Exit Sub`,
      `ErrHandler:`,
      `    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical`,
      `End Sub`,
    ].join("\n");

    return {
      script,
      controller_family: cfg.family,
      notes: cfg.notes,
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/** Singleton instance — used by camDispatcher */
export const solidCAMCodeGeneratorEngine = new SolidCAMCodeGeneratorEngine();
