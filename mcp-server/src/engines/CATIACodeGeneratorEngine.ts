/**
 * CATIACodeGeneratorEngine — CATIA V5 VBA/CATVBA Macro & 3DEXPERIENCE EKL Script Generator (E1122)
 *
 * Generates CATIA V5 VBA/CATVBA macros or 3DEXPERIENCE EKL scripts for
 * manufacturing automation. Covers Prismatic Machining, Surface Machining, and
 * Advanced Machining workbenches; Manufacturing Program structure (PPR tree);
 * tool-data binding via PP Table; tool-path computation; NC data export; and
 * Knowledge-Based Machining (KBM) template application via EKL.
 *
 * Methods:
 *   generateVBA(operations, tools, params)    — produce a complete CATVBA macro
 *   generateEKL(rules, templates)             — produce a 3DEXPERIENCE EKL script
 *   getTemplates(category?)                   — list available script templates
 *   generateFromDescription(text)             — NL → best-effort VBA or EKL script
 *
 * Template categories:
 *   pocket_prismatic | profile_contouring | facing | drilling |
 *   roughing | surface_finishing | multi_axis | nc_export |
 *   tool_setup | batch | ekl
 *
 * Sources:
 *   - CATIA V5 Automation Reference (CATIA_V5_Automation.chm)
 *   - CATIA V5 Prismatic Machining User Guide
 *   - CATIA V5 Surface Machining User Guide
 *   - CATIA V5 Advanced Machining User Guide
 *   - 3DEXPERIENCE DELMIA Machining EKL/KBM Reference
 *   - Dassault Systèmes PP Table configuration documentation
 *
 * @engine CATIACodeGeneratorEngine
 * @shortcode E1122
 * @dispatcher camDispatcher
 * @actions catia_code_generate, catia_code_templates
 * @milestone CAMX-MS6/U07
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Script output language */
export type CATIAScriptType = "vba" | "ekl";

/** CATIA manufacturing operation type */
export type CATIAOpType =
  | "pocket_prismatic"
  | "profile_contouring"
  | "facing"
  | "drilling"
  | "zlevel_roughing"
  | "sweeping_finishing"
  | "multi_axis_sweep"
  | "plunge_roughing"
  | "tool_path_compute"
  | "nc_export"
  | "batch_compute";

/** A single CATIA operation descriptor */
export interface CATIAOperation {
  type: CATIAOpType;
  name?: string;
  tool_number?: number;
  depth_mm?: number;
  stepover_mm?: number;
  stepdown_mm?: number;
  feed_mm_min?: number;
  spindle_rpm?: number;
  coolant?: "flood" | "mist" | "air" | "off" | "tsc";
  axial_feed_mm_min?: number;
  retract_feed_mm_min?: number;
  scallop_height_mm?: number;
  tolerance_mm?: number;
  machining_mode?: "climb" | "conventional";
  [key: string]: unknown;
}

/** A CATIA tool entry (from PP Table) */
export interface CATIATool {
  number: number;
  type:
    | "endmill"
    | "ballnose"
    | "bullnose"
    | "face_mill"
    | "drill"
    | "boring_bar"
    | "reamer"
    | "tap"
    | "thread_mill";
  diameter_mm: number;
  flutes?: number;
  corner_radius_mm?: number;
  length_mm?: number;
  material?: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  coating?: string;
  label?: string;
}

/** Global VBA generation parameters */
export interface CATIAVBAParams {
  part_name?: string;
  mfg_program_name?: string;
  pp_table_name?: string;
  nc_output_folder?: string;
  add_error_handling?: boolean;
  add_progress_msgs?: boolean;
  run_compute_all?: boolean;
  machine_name?: string;
}

/** A Knowledge Advisor rule for EKL */
export interface CATIAEKLRule {
  name: string;
  condition?: string;
  action?: string;
  description?: string;
}

/** A KBM template reference for EKL */
export interface CATIAEKLTemplateRef {
  template_id: string;
  parameters?: Record<string, unknown>;
}

/** Result returned by generateVBA / generateEKL */
export interface CATIACodeResult {
  script: string;
  description: string;
  script_type: CATIAScriptType;
  line_count: number;
  operations_included: string[];
  warnings: string[];
}

/** Template descriptor returned by getTemplates */
export interface CATIATemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  script_type: CATIAScriptType;
  required_params: string[];
  optional_params: string[];
  example_snippet: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** CATIA VBA automation object names per operation type */
const CATIA_OP_CLASS: Record<CATIAOpType, string> = {
  pocket_prismatic:   "PrismaticMachiningPocketingOperation",
  profile_contouring: "PrismaticMachiningProfileContouring",
  facing:             "PrismaticMachiningFacing",
  drilling:           "ManufacturingDrilling",
  zlevel_roughing:    "SurfaceMachiningZLevelRoughing",
  sweeping_finishing: "SurfaceMachiningSweptSurfacing",
  multi_axis_sweep:   "AdvancedMachiningMultiAxisSweepRoughing",
  plunge_roughing:    "AdvancedMachiningPlungeRoughing",
  tool_path_compute:  "ManufacturingActivity",   // generic compute call
  nc_export:          "ManufacturingProgram",
  batch_compute:      "ManufacturingProgram",
};

/** VBA coolant constant map */
const COOLANT_VBA: Record<string, string> = {
  flood: "catManufacturingCoolantOn",
  mist:  "catManufacturingCoolantMist",
  air:   "catManufacturingCoolantAir",
  off:   "catManufacturingCoolantOff",
  tsc:   "catManufacturingCoolantThroughSpindle",
};

/** EKL KBM template IDs */
const EKL_TEMPLATE_MAP: Record<string, { title: string; ekl_call: string }> = {
  prismatic_pocket:   { title: "Prismatic Pocket KBM",       ekl_call: "KBM_ApplyTemplate(\"PrismaticPocket\")"    },
  sweep_finishing:    { title: "Multi-Axis Sweep Finishing",  ekl_call: "KBM_ApplyTemplate(\"SweepFinishing\")"     },
  kbm_apply:          { title: "Generic KBM Template Apply",  ekl_call: "KBM_ApplyTemplate(\"Generic\")"            },
  nc_program_output:  { title: "NC Program Output",           ekl_call: "KBM_ApplyTemplate(\"NCProgramOutput\")"    },
  tool_change_rule:   { title: "Automatic Tool Change Rule",  ekl_call: "KBM_ApplyTemplate(\"AutoToolChange\")"     },
};

/** Template library — 15 templates */
const TEMPLATE_LIBRARY: CATIATemplate[] = [
  {
    id: "prismatic_pocket_vba",
    category: "pocket_prismatic",
    title: "Prismatic Pocket Operation (VBA)",
    description:
      "Creates a CATIA V5 Prismatic Machining pocket operation, sets tool via PP Table, configures depth, step-over, feeds, and computes the tool path.",
    script_type: "vba",
    required_params: ["tool_number", "depth_mm"],
    optional_params: ["stepover_mm", "feed_mm_min", "spindle_rpm", "coolant"],
    example_snippet:
      "Dim oMfgPgm As ManufacturingProgram\n" +
      "Dim oOp As PrismaticMachiningPocketingOperation\n" +
      "Set oMfgPgm = CATIA.ActiveDocument.Product.GetItem(\"PPRDocument\").Activities.Item(1)\n" +
      "Set oOp = oMfgPgm.Activities.AddActivity(\"PrismaticMachiningPocketingOperation\")",
  },
  {
    id: "profile_contouring_vba",
    category: "profile_contouring",
    title: "Profile Contouring Operation (VBA)",
    description:
      "Creates a Prismatic Machining profile contouring operation along selected edges or curves.",
    script_type: "vba",
    required_params: ["tool_number", "depth_mm"],
    optional_params: ["stepdown_mm", "feed_mm_min", "spindle_rpm", "machining_mode"],
    example_snippet:
      "Dim oOp As PrismaticMachiningProfileContouring\n" +
      "Set oOp = oMfgPgm.Activities.AddActivity(\"PrismaticMachiningProfileContouring\")\n" +
      "oOp.GetTechnologyTable().SetParameterValue \"MachiningFeedRate\", 800\n" +
      "oOp.ComputeToolPath",
  },
  {
    id: "facing_vba",
    category: "facing",
    title: "Face Milling Operation (VBA)",
    description:
      "Creates a Prismatic Machining facing operation for stock-facing or planar surface finishing.",
    script_type: "vba",
    required_params: ["tool_number", "stepover_mm"],
    optional_params: ["depth_mm", "feed_mm_min", "spindle_rpm", "coolant"],
    example_snippet:
      "Dim oOp As PrismaticMachiningFacing\n" +
      "Set oOp = oMfgPgm.Activities.AddActivity(\"PrismaticMachiningFacing\")\n" +
      "oOp.GetTechnologyTable().SetParameterValue \"StepOver\", 8.0\n" +
      "oOp.ComputeToolPath",
  },
  {
    id: "drilling_vba",
    category: "drilling",
    title: "Drilling Cycle Operation (VBA)",
    description:
      "Creates a standard drilling cycle operation with depth and feed parameters.",
    script_type: "vba",
    required_params: ["tool_number", "depth_mm"],
    optional_params: ["axial_feed_mm_min", "spindle_rpm", "coolant"],
    example_snippet:
      "Dim oOp As ManufacturingDrilling\n" +
      "Set oOp = oMfgPgm.Activities.AddActivity(\"ManufacturingDrilling\")\n" +
      "oOp.GetTechnologyTable().SetParameterValue \"Depth\", 25.0\n" +
      "oOp.ComputeToolPath",
  },
  {
    id: "zlevel_roughing_vba",
    category: "roughing",
    title: "Z-Level Roughing Operation (VBA)",
    description:
      "Creates a Surface Machining Z-level roughing operation with step-down per level.",
    script_type: "vba",
    required_params: ["tool_number", "stepdown_mm"],
    optional_params: ["stepover_mm", "feed_mm_min", "tolerance_mm", "coolant"],
    example_snippet:
      "Dim oOp As SurfaceMachiningZLevelRoughing\n" +
      "Set oOp = oMfgPgm.Activities.AddActivity(\"SurfaceMachiningZLevelRoughing\")\n" +
      "oOp.GetTechnologyTable().SetParameterValue \"StepDown\", 2.0\n" +
      "oOp.ComputeToolPath",
  },
  {
    id: "sweeping_finishing_vba",
    category: "surface_finishing",
    title: "Swept Surfacing Finishing (VBA)",
    description:
      "Creates a Surface Machining swept-surface finishing pass with scallop-height control.",
    script_type: "vba",
    required_params: ["tool_number", "scallop_height_mm"],
    optional_params: ["stepover_mm", "feed_mm_min", "tolerance_mm", "coolant"],
    example_snippet:
      "Dim oOp As SurfaceMachiningSweptSurfacing\n" +
      "Set oOp = oMfgPgm.Activities.AddActivity(\"SurfaceMachiningSweptSurfacing\")\n" +
      "oOp.GetTechnologyTable().SetParameterValue \"ScallopHeight\", 0.01\n" +
      "oOp.ComputeToolPath",
  },
  {
    id: "multi_axis_sweep_vba",
    category: "multi_axis",
    title: "Multi-Axis Sweep Roughing (VBA)",
    description:
      "Creates an Advanced Machining multi-axis sweep roughing operation for complex geometries.",
    script_type: "vba",
    required_params: ["tool_number", "stepdown_mm"],
    optional_params: ["scallop_height_mm", "feed_mm_min", "tolerance_mm"],
    example_snippet:
      "Dim oOp As AdvancedMachiningMultiAxisSweepRoughing\n" +
      "Set oOp = oMfgPgm.Activities.AddActivity(\"AdvancedMachiningMultiAxisSweepRoughing\")\n" +
      "oOp.GetTechnologyTable().SetParameterValue \"StepDown\", 3.0\n" +
      "oOp.ComputeToolPath",
  },
  {
    id: "plunge_roughing_vba",
    category: "roughing",
    title: "Plunge Roughing Operation (VBA)",
    description:
      "Creates an Advanced Machining plunge roughing operation for deep-cavity stock removal.",
    script_type: "vba",
    required_params: ["tool_number", "depth_mm", "stepover_mm"],
    optional_params: ["axial_feed_mm_min", "retract_feed_mm_min", "coolant"],
    example_snippet:
      "Dim oOp As AdvancedMachiningPlungeRoughing\n" +
      "Set oOp = oMfgPgm.Activities.AddActivity(\"AdvancedMachiningPlungeRoughing\")\n" +
      "oOp.GetTechnologyTable().SetParameterValue \"PlungeDepth\", 40.0\n" +
      "oOp.ComputeToolPath",
  },
  {
    id: "nc_export_vba",
    category: "nc_export",
    title: "NC Data Export via PP Table (VBA)",
    description:
      "Invokes the CATIA V5 NC code generation using a named PP Table and saves NC output to a folder.",
    script_type: "vba",
    required_params: ["pp_table_name"],
    optional_params: ["nc_output_folder", "mfg_program_name"],
    example_snippet:
      "Dim oNCDoc As NCCodeDocument\n" +
      "Set oNCDoc = CATIA.Documents.Add(\"NCCodeDocument\")\n" +
      "oNCDoc.NCGenerationManager.GenerateNC oMfgPgm, \"Fanuc_Mill\", \"C:\\NC\\\"\n" +
      "oNCDoc.SaveAs \"C:\\NC\\Output.nc\"",
  },
  {
    id: "batch_compute_vba",
    category: "batch",
    title: "Batch Compute All Tool Paths (VBA)",
    description:
      "Loops over all activities in the Manufacturing Program and calls ComputeToolPath on each one.",
    script_type: "vba",
    required_params: [],
    optional_params: ["add_progress_msgs", "pp_table_name", "nc_output_folder"],
    example_snippet:
      "Dim i As Integer\n" +
      "For i = 1 To oMfgPgm.Activities.Count\n" +
      "    oMfgPgm.Activities.Item(i).ComputeToolPath\n" +
      "Next i",
  },
  {
    id: "tool_setup_vba",
    category: "tool_setup",
    title: "Tool Definition in PP Table (VBA)",
    description:
      "Retrieves or creates a tool entry in the CATIA V5 PP Table and sets diameter, type, and material.",
    script_type: "vba",
    required_params: ["tool_number", "diameter_mm"],
    optional_params: ["flutes", "corner_radius_mm", "length_mm", "coating"],
    example_snippet:
      "Dim oTool As ManufacturingTool\n" +
      "Set oTool = oMfgPgm.GetToolTable().Item(1)\n" +
      "oTool.SetParameterValue \"ToolDiameter\", 12.0\n" +
      "oTool.SetParameterValue \"ToolType\", \"EndMill\"",
  },
  {
    id: "kbm_template_ekl",
    category: "ekl",
    title: "KBM Template Application (EKL)",
    description:
      "3DEXPERIENCE EKL script that applies a Knowledge-Based Machining template to automate manufacturing intent definition.",
    script_type: "ekl",
    required_params: ["template_id"],
    optional_params: ["parameters"],
    example_snippet:
      "/* PRISM E1122 — KBM Template Application */\n" +
      "let oProduct(Product)\n" +
      "oProduct = ThisObject\n" +
      "KBM_ApplyTemplate(\"PrismaticPocket\")",
  },
  {
    id: "manufacturing_rules_ekl",
    category: "ekl",
    title: "Manufacturing Rules (EKL Knowledge Advisor)",
    description:
      "3DEXPERIENCE EKL script defining Knowledge Advisor rules for manufacturing intent validation (e.g. min wall thickness, tool diameter checks).",
    script_type: "ekl",
    required_params: [],
    optional_params: ["ekl_rules"],
    example_snippet:
      "/* Rule: EnforceMinWallThickness */\n" +
      "if WallThickness < 1.5mm {\n" +
      "    Warning(\"Wall thickness below 1.5 mm — risk of chatter\")\n" +
      "}",
  },
  {
    id: "mfg_intent_ekl",
    category: "ekl",
    title: "Manufacturing Intent Definition (EKL)",
    description:
      "Defines manufacturing intent parameters (material, batch, tolerances) in 3DEXPERIENCE using EKL.",
    script_type: "ekl",
    required_params: [],
    optional_params: ["part_name", "tolerance_mm"],
    example_snippet:
      "/* PRISM E1122 — Manufacturing Intent */\n" +
      "let oMfgItem(ManufacturingItem)\n" +
      "oMfgItem = ThisObject\n" +
      "oMfgItem.Material = \"Steel_AISI_4140\"",
  },
  {
    id: "batch_nc_export_ekl",
    category: "nc_export",
    title: "Batch NC Export (EKL)",
    description:
      "3DEXPERIENCE EKL script that iterates over all Manufacturing Items and triggers NC output generation.",
    script_type: "ekl",
    required_params: ["pp_table_name"],
    optional_params: ["nc_output_folder"],
    example_snippet:
      "/* PRISM E1122 — Batch NC Export EKL */\n" +
      "let i(Integer)\n" +
      "for i = 1 to oMfgPgm.Activities.Size() {\n" +
      "    GenerateNC(oMfgPgm.Activities[i], \"Fanuc_Mill\", \"/NC/\")\n" +
      "}",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** VBA macro header boilerplate */
function vbaHeader(
  partName: string,
  mfgProgName: string,
  machineName: string,
  addErrorHandling: boolean,
): string {
  const lines: string[] = [
    `' ════════════════════════════════════════════════════════════`,
    `' CATIA V5 Manufacturing Macro — generated by PRISM E1122`,
    `' Part:            ${partName}`,
    `' Mfg Program:     ${mfgProgName}`,
    `' Machine:         ${machineName}`,
    `' Generated:       ${new Date().toISOString().slice(0, 10)}`,
    `' ════════════════════════════════════════════════════════════`,
    `Language="VBSCRIPT"`,
    ``,
    `Sub CATMain()`,
  ];
  if (addErrorHandling) {
    lines.push(`    On Error GoTo ErrHandler`);
  }
  lines.push(`    Dim oCATIA As Application`);
  lines.push(`    Dim oDoc   As Document`);
  lines.push(`    Dim oProd  As Product`);
  lines.push(`    Dim oPPR   As PPRDocument`);
  lines.push(`    Dim oMfgPgm As ManufacturingProgram`);
  lines.push(`    `);
  lines.push(`    ' ── Bind to active CATIA session ────────────────────────────`);
  lines.push(`    Set oCATIA = CATIA`);
  lines.push(`    Set oDoc   = oCATIA.ActiveDocument`);
  lines.push(`    If oDoc Is Nothing Then`);
  lines.push(`        MsgBox "No active CATIA document.", vbCritical, "PRISM"`);
  lines.push(`        Exit Sub`);
  lines.push(`    End If`);
  lines.push(`    `);
  lines.push(`    ' ── Get Manufacturing Program from PPR tree ─────────────────`);
  lines.push(`    Set oPPR   = oDoc`);
  lines.push(`    Set oMfgPgm = oPPR.Activities.Item("${mfgProgName}")`);
  lines.push(`    If oMfgPgm Is Nothing Then`);
  lines.push(`        MsgBox "Manufacturing Program '${mfgProgName}' not found.", vbCritical, "PRISM"`);
  lines.push(`        Exit Sub`);
  lines.push(`    End If`);
  lines.push(`    `);
  return lines.join("\n");
}

/** VBA macro footer */
function vbaFooter(addErrorHandling: boolean, addProgressMsgs: boolean): string {
  const lines: string[] = [`    `];
  if (addProgressMsgs) {
    lines.push(`    MsgBox "CATIA macro complete.", vbInformation, "PRISM"`);
  }
  lines.push(`    Exit Sub`);
  if (addErrorHandling) {
    lines.push(`ErrHandler:`);
    lines.push(`    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical, "PRISM"`);
  }
  lines.push(`End Sub`);
  return lines.join("\n");
}

/** VBA block that loads a tool from the PP Table */
function toolDefBlock(tool: CATIATool, idx: number): string[] {
  const v = `oTool${idx}`;
  const lines: string[] = [
    `    ' ── Tool T${tool.number}: ${tool.label ?? tool.type} ø${tool.diameter_mm}mm ──────────────────────`,
    `    Dim ${v} As ManufacturingTool`,
    `    Set ${v} = oMfgPgm.GetToolTable().Item(${tool.number})`,
    `    ${v}.SetParameterValue "ToolDiameter", ${tool.diameter_mm}`,
    `    ${v}.SetParameterValue "ToolType", "${toolTypeVBA(tool.type)}"`,
  ];
  if (tool.flutes !== undefined)
    lines.push(`    ${v}.SetParameterValue "NumberOfFlutes", ${tool.flutes}`);
  if (tool.corner_radius_mm !== undefined && tool.corner_radius_mm > 0)
    lines.push(`    ${v}.SetParameterValue "CornerRadius", ${tool.corner_radius_mm}`);
  if (tool.length_mm !== undefined)
    lines.push(`    ${v}.SetParameterValue "ToolLength", ${tool.length_mm}`);
  if (tool.coating)
    lines.push(`    ${v}.SetParameterValue "Coating", "${tool.coating}"`);
  if (tool.material)
    lines.push(`    ${v}.SetParameterValue "ToolMaterial", "${tool.material.toUpperCase()}"`);
  lines.push(`    `);
  return lines;
}

/** Maps tool type to CATIA PP Table constant string */
function toolTypeVBA(type: string): string {
  const map: Record<string, string> = {
    endmill:     "EndMill",
    ballnose:    "BallNoseMill",
    bullnose:    "BullNoseMill",
    face_mill:   "FaceMill",
    drill:       "Drill",
    boring_bar:  "BoringBar",
    reamer:      "Reamer",
    tap:         "Tap",
    thread_mill: "ThreadMill",
  };
  return map[type] ?? "EndMill";
}

/** Generate VBA block for a single operation */
function operationBlock(op: CATIAOperation, idx: number, warnings: string[]): string[] {
  const label = op.name ?? `${op.type}_${idx + 1}`;
  const varName = `oOp${idx + 1}`;
  const opClass = CATIA_OP_CLASS[op.type as CATIAOpType] ?? "ManufacturingActivity";
  const lines: string[] = [
    `    ' ── Operation ${idx + 1}: ${label} ─────────────────────────────────────`,
    `    Dim ${varName} As ${opClass}`,
    `    Set ${varName} = oMfgPgm.Activities.AddActivity("${opClass}")`,
    `    ${varName}.SetParameterValue "Name", "${label}"`,
  ];

  // Tool assignment
  if (op.tool_number !== undefined) {
    lines.push(`    ${varName}.SetParameterValue "ToolNumber", ${op.tool_number}`);
  } else {
    warnings.push(`Operation '${label}': no tool_number specified — using current job tool.`);
  }

  // Technology table parameters
  const tech = `${varName}.GetTechnologyTable()`;
  if (op.feed_mm_min !== undefined)
    lines.push(`    ${tech}.SetParameterValue "MachiningFeedRate", ${op.feed_mm_min}`);
  if (op.spindle_rpm !== undefined)
    lines.push(`    ${tech}.SetParameterValue "SpindleSpeed", ${op.spindle_rpm}`);
  if (op.axial_feed_mm_min !== undefined)
    lines.push(`    ${tech}.SetParameterValue "ApproachFeedRate", ${op.axial_feed_mm_min}`);
  if (op.retract_feed_mm_min !== undefined)
    lines.push(`    ${tech}.SetParameterValue "RetractFeedRate", ${op.retract_feed_mm_min}`);

  // Operation-specific geometry
  if (op.depth_mm !== undefined)
    lines.push(`    ${tech}.SetParameterValue "Depth", ${op.depth_mm}`);
  if (op.stepdown_mm !== undefined)
    lines.push(`    ${tech}.SetParameterValue "StepDown", ${op.stepdown_mm}`);
  if (op.stepover_mm !== undefined)
    lines.push(`    ${tech}.SetParameterValue "StepOver", ${op.stepover_mm}`);
  if (op.scallop_height_mm !== undefined)
    lines.push(`    ${tech}.SetParameterValue "ScallopHeight", ${op.scallop_height_mm}`);
  if (op.tolerance_mm !== undefined)
    lines.push(`    ${tech}.SetParameterValue "Tolerance", ${op.tolerance_mm}`);
  if (op.machining_mode !== undefined) {
    const modeConst = op.machining_mode === "climb" ? "catClimb" : "catConventional";
    lines.push(`    ${tech}.SetParameterValue "MachiningMode", ${modeConst}`);
  }

  // Coolant
  if (op.coolant !== undefined) {
    const c = COOLANT_VBA[op.coolant] ?? "catManufacturingCoolantOn";
    lines.push(`    ${varName}.SetParameterValue "CoolantMode", ${c}`);
  }

  // Handle special op types
  if (op.type === "tool_path_compute") {
    lines.push(`    ${varName}.ComputeToolPath`);
  } else if (op.type !== "nc_export" && op.type !== "batch_compute") {
    lines.push(`    ${varName}.ComputeToolPath`);
  }

  lines.push(`    `);
  return lines;
}

/** Generate batch compute block */
function batchComputeBlock(addProgressMsgs: boolean): string[] {
  const lines: string[] = [
    `    ' ── Batch: compute all tool paths ────────────────────────────────────`,
    `    Dim iBatch As Integer`,
    `    For iBatch = 1 To oMfgPgm.Activities.Count`,
    `        Dim oBatchOp As ManufacturingActivity`,
    `        Set oBatchOp = oMfgPgm.Activities.Item(iBatch)`,
    `        oBatchOp.ComputeToolPath`,
  ];
  if (addProgressMsgs) {
    lines.push(`        MsgBox "Computed: " & oBatchOp.GetParameterValue("Name"), vbInformation, "PRISM"`);
  }
  lines.push(`    Next iBatch`);
  lines.push(`    `);
  return lines;
}

/** Generate NC export block */
function ncExportBlock(ppTable: string, ncFolder: string): string[] {
  return [
    `    ' ── NC Data Export via PP Table ──────────────────────────────────────`,
    `    Dim oNCMgr As NCGenerationManager`,
    `    Dim oNCDoc As Document`,
    `    Set oNCDoc = CATIA.Documents.Add("NCCodeDocument")`,
    `    Set oNCMgr = oNCDoc.NCGenerationManager`,
    `    oNCMgr.GenerateNC oMfgPgm, "${ppTable}", "${ncFolder}"`,
    `    oNCDoc.Save`,
    `    MsgBox "NC output saved to ${ncFolder}", vbInformation, "PRISM"`,
    `    `,
  ];
}

/** Build a complete EKL script */
function buildEKLScript(
  rules: CATIAEKLRule[],
  templates: CATIAEKLTemplateRef[],
  warnings: string[],
): string {
  const lines: string[] = [
    `/* ══════════════════════════════════════════════════════════════ */`,
    `/* 3DEXPERIENCE EKL Script — generated by PRISM E1122           */`,
    `/* Date: ${new Date().toISOString().slice(0, 10)}                                          */`,
    `/* ══════════════════════════════════════════════════════════════ */`,
    ``,
    `let oProduct(Product)`,
    `oProduct = ThisObject`,
    ``,
  ];

  // KBM template applications
  if (templates.length > 0) {
    lines.push(`/* ── KBM Template Applications ─────────────────────────── */`);
    for (const tref of templates) {
      const tEntry = EKL_TEMPLATE_MAP[tref.template_id];
      if (!tEntry) {
        warnings.push(`EKL template '${tref.template_id}' not found — emitting generic call.`);
        lines.push(`KBM_ApplyTemplate("${tref.template_id}")`);
      } else {
        lines.push(`/* ${tEntry.title} */`);
        lines.push(tEntry.ekl_call);
      }
      // Emit parameter overrides
      if (tref.parameters && Object.keys(tref.parameters).length > 0) {
        for (const [k, v] of Object.entries(tref.parameters)) {
          const valStr = typeof v === "string" ? `"${v}"` : String(v);
          lines.push(`oProduct.${k} = ${valStr}`);
        }
      }
      lines.push(``);
    }
  }

  // Knowledge Advisor rules
  if (rules.length > 0) {
    lines.push(`/* ── Knowledge Advisor Rules ────────────────────────────── */`);
    for (const rule of rules) {
      if (rule.description) {
        lines.push(`/* Rule: ${rule.name} — ${rule.description} */`);
      } else {
        lines.push(`/* Rule: ${rule.name} */`);
      }
      if (rule.condition && rule.action) {
        lines.push(`if ${rule.condition} {`);
        lines.push(`    ${rule.action}`);
        lines.push(`}`);
      } else if (rule.condition) {
        lines.push(`if ${rule.condition} {`);
        lines.push(`    /* TODO: define action */`);
        lines.push(`}`);
      } else {
        warnings.push(`Rule '${rule.name}' has no condition — skipped.`);
      }
      lines.push(``);
    }
  }

  if (templates.length === 0 && rules.length === 0) {
    lines.push(`/* No templates or rules specified — scaffold only. */`);
    lines.push(`/* Add ekl_rules or ekl_templates to populate this script. */`);
    warnings.push("EKL script generated with no rules or templates — scaffold only.");
  }

  return lines.join("\n");
}

// ─── NL → Script mapping ──────────────────────────────────────────────────────

/** Maps common NL keywords to operation types */
const NL_KEYWORD_OPS: Array<{ keywords: string[]; type: CATIAOpType }> = [
  { keywords: ["pocket", "pocketing", "prismatic pocket"], type: "pocket_prismatic" },
  { keywords: ["profile", "contour", "contouring"],        type: "profile_contouring" },
  { keywords: ["facing", "face mill", "face milling"],     type: "facing" },
  { keywords: ["drill", "drilling", "hole"],               type: "drilling" },
  { keywords: ["zlevel", "z-level", "level rough"],        type: "zlevel_roughing" },
  { keywords: ["sweep", "swep", "finishing sweep"],        type: "sweeping_finishing" },
  { keywords: ["multi-axis", "multiaxis", "5-axis"],       type: "multi_axis_sweep" },
  { keywords: ["plunge", "plunge rough"],                  type: "plunge_roughing" },
  { keywords: ["batch", "compute all", "all operations"],  type: "batch_compute" },
  { keywords: ["export", "nc export", "post process", "pp table"], type: "nc_export" },
];

function opsFromDescription(text: string): CATIAOperation[] {
  const lower = text.toLowerCase();
  const found: CATIAOperation[] = [];
  for (const mapping of NL_KEYWORD_OPS) {
    if (mapping.keywords.some(k => lower.includes(k))) {
      found.push({ type: mapping.type, name: mapping.type });
    }
  }
  if (found.length === 0) {
    found.push({ type: "pocket_prismatic", name: "default_pocket" });
  }
  return found;
}

function eklFromDescription(text: string): { rules: CATIAEKLRule[]; templates: CATIAEKLTemplateRef[] } {
  const lower = text.toLowerCase();
  const rules: CATIAEKLRule[] = [];
  const templates: CATIAEKLTemplateRef[] = [];
  if (lower.includes("kbm") || lower.includes("template")) {
    const tid = lower.includes("sweep") ? "sweep_finishing" : "prismatic_pocket";
    templates.push({ template_id: tid });
  }
  if (lower.includes("rule") || lower.includes("check") || lower.includes("validate")) {
    rules.push({
      name: "auto_rule",
      condition: "/* TODO: set condition */",
      action: "/* TODO: set action */",
      description: "Auto-generated from description — fill in condition and action.",
    });
  }
  return { rules, templates };
}

// ─── Engine class ─────────────────────────────────────────────────────────────

class CATIACodeGeneratorEngineClass {
  /**
   * Generate a complete CATIA V5 VBA/CATVBA macro.
   *
   * @param operations  Ordered list of manufacturing operations
   * @param tools       Tool definitions to emit PP Table calls for
   * @param params      Global macro options
   * @returns           Script text, description, metadata, warnings
   */
  generateVBA(
    operations: CATIAOperation[],
    tools: CATIATool[] = [],
    params: CATIAVBAParams = {},
  ): CATIACodeResult {
    const warnings: string[] = [];
    const partName       = params.part_name        ?? "MyPart";
    const mfgProgName    = params.mfg_program_name ?? "MfgProgram.1";
    const machineName    = params.machine_name     ?? "DefaultMachine";
    const ppTable        = params.pp_table_name    ?? "Fanuc_Mill";
    const ncFolder       = params.nc_output_folder ?? "C:\\NC\\";
    const addErrH        = params.add_error_handling ?? true;
    const addProg        = params.add_progress_msgs  ?? false;
    const runComputeAll  = params.run_compute_all    ?? false;

    const sections: string[] = [];

    // Header
    sections.push(vbaHeader(partName, mfgProgName, machineName, addErrH));

    // Tool definitions
    if (tools.length > 0) {
      sections.push(`    ' ══ Tool Definitions ═══════════════════════════════════════\n`);
      tools.forEach((t, i) => {
        sections.push(toolDefBlock(t, i).join("\n"));
      });
    }

    // Operations
    const opsIncluded: string[] = [];
    let hasBatch = false;
    let hasNCExport = false;

    sections.push(`    ' ══ Machining Operations ══════════════════════════════════════\n`);

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const label = op.name ?? `${op.type}_${i + 1}`;
      opsIncluded.push(label);

      if (op.type === "batch_compute") {
        hasBatch = true;
        continue;
      }
      if (op.type === "nc_export") {
        hasNCExport = true;
        continue;
      }
      sections.push(operationBlock(op, i, warnings).join("\n"));
    }

    // Batch compute (after regular ops)
    if (hasBatch || runComputeAll) {
      sections.push(batchComputeBlock(addProg).join("\n"));
    }

    // NC export
    if (hasNCExport) {
      sections.push(ncExportBlock(ppTable, ncFolder).join("\n"));
    }

    // Footer
    sections.push(vbaFooter(addErrH, addProg));

    const script = sections.join("\n");
    const lineCount = script.split("\n").length;

    return {
      script,
      description:
        `CATIA V5 VBA macro for ${partName} — ${operations.length} operation(s): ` +
        opsIncluded.join(", ") +
        (tools.length > 0 ? ` | ${tools.length} tool(s)` : "") +
        (hasNCExport ? ` | NC export via '${ppTable}'` : ""),
      script_type: "vba",
      line_count: lineCount,
      operations_included: opsIncluded,
      warnings,
    };
  }

  /**
   * Generate a 3DEXPERIENCE EKL script (Knowledge Advisor rules and/or KBM templates).
   *
   * @param rules      Knowledge Advisor rule definitions
   * @param templates  KBM template application references
   * @returns          EKL script text, description, metadata, warnings
   */
  generateEKL(
    rules: CATIAEKLRule[] = [],
    templates: CATIAEKLTemplateRef[] = [],
  ): CATIACodeResult {
    const warnings: string[] = [];
    const script = buildEKLScript(rules, templates, warnings);
    const lineCount = script.split("\n").length;
    const templateNames = templates.map(t => t.template_id);
    const ruleNames = rules.map(r => r.name);
    const included = [...templateNames, ...ruleNames];

    return {
      script,
      description:
        `3DEXPERIENCE EKL script — ${templates.length} KBM template(s), ${rules.length} Knowledge Advisor rule(s).` +
        (included.length > 0 ? ` Items: ${included.join(", ")}` : ""),
      script_type: "ekl",
      line_count: lineCount,
      operations_included: included,
      warnings,
    };
  }

  /**
   * List available code generation templates, optionally filtered by category.
   *
   * @param category  Optional category filter
   * @returns         Matching template descriptors
   */
  getTemplates(category?: string): CATIATemplate[] {
    if (!category) return TEMPLATE_LIBRARY;
    return TEMPLATE_LIBRARY.filter(t => t.category === category);
  }

  /**
   * Generate a best-effort VBA or EKL script from a natural-language description.
   *
   * @param text  Natural-language description of what the script should do
   * @returns     Generated script result
   */
  generateFromDescription(text: string): CATIACodeResult {
    const lower = text.toLowerCase();
    const wantsEKL = lower.includes("ekl") || lower.includes("kbm") || lower.includes("3dexperience") || lower.includes("knowledge");

    if (wantsEKL) {
      const { rules, templates } = eklFromDescription(text);
      return this.generateEKL(rules, templates);
    }

    const ops = opsFromDescription(text);
    const warnings: string[] = [
      "Script generated from natural-language description — review all parameters before running.",
    ];
    const result = this.generateVBA(ops, [], {});
    result.warnings.push(...warnings);
    return result;
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const catiaCodeGeneratorEngine = new CATIACodeGeneratorEngineClass();
export { CATIACodeGeneratorEngineClass as CATIACodeGeneratorEngine };
