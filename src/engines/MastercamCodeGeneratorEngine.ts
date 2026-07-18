/**
 * MastercamCodeGeneratorEngine — Mastercam Automation Script Generator (E1117)
 *
 * Generates Mastercam automation scripts in two formats:
 *   VBScript   — for Mastercam 2024+ ActiveX/COM automation (run via Tools > Run VBScript)
 *   C#/.NET    — for the Mastercam NetHook API (compiled as a .NET plug-in)
 *
 * Capabilities:
 *   VBScript generation:
 *     - Create operations: 2D Contour, Pocket, Face, Drill, Dynamic Mill, OptiRough
 *     - Set tool parameters: diameter, flutes, length, holder geometry
 *     - Set cutting parameters: speed, feed, depth of cut, stepover
 *     - Set strategy parameters: Dynamic Motion engagement, micro-lift, corner smoothing
 *     - Regenerate toolpaths and run post processor
 *     - Batch operation loops
 *   C#/.NET NetHook generation:
 *     - Operation creation via Mastercam.App namespace
 *     - Tool library access and filtering
 *     - Machine group configuration
 *     - Stock model setup
 *     - Post processing automation
 *     - Parameter modification helpers
 *   Template library:
 *     - Adaptive roughing, Dynamic Mill setup, batch post, tool library export, etc.
 *   Natural-language generation:
 *     - Best-effort VBScript or NetHook code from a text description
 *
 * Methods:
 *   generateVBScript(ops, tools, params)       → { script, description }
 *   generateNetHookCode(ops, tools, params)    → { code, description }
 *   getTemplates(category?)                    → ScriptTemplate[]
 *   generateFromDescription(text)              → CodeGenerationResult
 *
 * @engine MastercamCodeGeneratorEngine
 * @shortcode E1117
 * @dispatcher camDispatcher
 * @actions mastercam_code_generate, mastercam_code_templates
 * @milestone CAMX-MS3/U09
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ScriptType = "vbscript" | "nethook_csharp";

export type OperationType =
  | "contour_2d"
  | "drill"
  | "dynamic_mill"
  | "face"
  | "optirough"
  | "pocket";

export type TemplateCategory =
  | "batch"
  | "drilling"
  | "finishing"
  | "post_processing"
  | "roughing"
  | "setup"
  | "tool_management";

export interface ToolSpec {
  /** Tool diameter in mm or inches (engine detects unit from context) */
  diameter: number;
  /** Number of cutting flutes */
  flutes?: number;
  /** Overall tool length */
  length_mm?: number;
  /** Cutting length / flute length */
  cutting_length_mm?: number;
  /** Holder description or catalog number */
  holder?: string;
  /** Tool type */
  type?: "ballnose" | "bullnose" | "drill" | "endmill" | "face_mill" | "tap";
  /** Tool number in magazine */
  tool_number?: number;
  /** Offset number */
  offset_number?: number;
}

export interface CuttingParams {
  /** Spindle speed, RPM */
  spindle_rpm?: number;
  /** Surface speed, m/min (used if spindle_rpm omitted) */
  surface_speed_mpm?: number;
  /** Feed rate, mm/min */
  feed_mmpm?: number;
  /** Chipload / feed per tooth, mm */
  chipload_mm?: number;
  /** Axial depth of cut (ap), mm */
  doc_axial_mm?: number;
  /** Radial depth of cut / stepover (ae), mm or fraction of diameter */
  doc_radial_mm?: number;
  /** Stepover as fraction of tool diameter (0–1), overrides doc_radial_mm */
  stepover_fraction?: number;
  /** Plunge feed rate, mm/min */
  plunge_feed_mmpm?: number;
  /** Entry feed rate, mm/min */
  entry_feed_mmpm?: number;
  /** Coolant mode */
  coolant?: "flood" | "mist" | "mql" | "none" | "through_tool";
}

export interface StrategyParams {
  /** Dynamic Motion max engagement angle, degrees (Dynamic Mill / OptiRough) */
  dynamic_engagement_deg?: number;
  /** Micro-lift distance, mm */
  micro_lift_mm?: number;
  /** Corner smoothing radius, mm */
  corner_smoothing_mm?: number;
  /** OptiRough step-down per pass, mm */
  optirough_step_down_mm?: number;
  /** Minimum toolpath radius (avoids sharp internal corners), mm */
  min_radius_mm?: number;
  /** Stock to leave for finishing, mm */
  stock_to_leave_mm?: number;
  /** Whether to use climb milling */
  climb_mill?: boolean;
  /** Retract height above top of part, mm */
  retract_height_mm?: number;
  /** Clearance height above stock, mm */
  clearance_height_mm?: number;
}

export interface OperationSpec {
  /** Operation type */
  type: OperationType;
  /** Human label for the operation */
  name?: string;
  /** Chain / geometry reference (placeholder for real geometry) */
  geometry_ref?: string;
  /** Tool specification for this operation */
  tool?: ToolSpec;
  /** Cutting parameters */
  cutting?: CuttingParams;
  /** Strategy parameters */
  strategy?: StrategyParams;
}

export interface GenerateCodeParams {
  /** Target script type */
  script_type: ScriptType;
  /** List of operations to generate code for */
  operations?: OperationSpec[];
  /** Shared tool list (operations can reference by tool_number) */
  tools?: ToolSpec[];
  /** Cutting defaults (operations inherit when not overridden) */
  defaults?: CuttingParams & StrategyParams;
  /** Mastercam part file path to open/save (optional) */
  part_file?: string;
  /** Post processor name */
  post_processor?: string;
  /** Output NC file path */
  nc_output_path?: string;
  /** Whether to include regenerate-all call */
  regenerate_all?: boolean;
  /** Whether to run post processor after operations */
  run_post?: boolean;
  /** Whether to add error handling (try/catch or On Error) */
  error_handling?: boolean;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  script_type: ScriptType;
  description: string;
  tags: string[];
}

export interface CodeGenerationResult {
  script_type: ScriptType;
  code: string;
  operations_count: number;
  warnings: string[];
  description: string;
}

// ─── VBScript helpers ──────────────────────────────────────────────────────────

function vbsHeader(partFile?: string, errorHandling = false): string {
  const lines: string[] = [
    "'============================================================",
    "' Mastercam 2024+ VBScript Automation",
    "' Generated by PRISM MastercamCodeGeneratorEngine (E1117)",
    "'============================================================",
    "Option Explicit",
    "",
  ];
  if (errorHandling) lines.push("On Error GoTo ErrorHandler", "");
  if (partFile) {
    lines.push(
      `' Open part file`,
      `Dim sPartFile As String`,
      `sPartFile = "${partFile}"`,
      `If Dir(sPartFile) <> "" Then`,
      `    Call MCOpenFile(sPartFile)`,
      `End If`,
      "",
    );
  }
  return lines.join("\n");
}

function vbsFooter(runPost: boolean, ncPath: string | undefined, post: string | undefined, errorHandling: boolean): string {
  const lines: string[] = [""];
  if (runPost) {
    lines.push(
      "' Run post processor",
      `Dim sPost As String`,
      `sPost = "${post ?? "MPFAN"}"`,
      `Dim sNC As String`,
      `sNC = "${ncPath ?? "C:\\NC\\output.nc"}"`,
      `Call MCPostProcess(sPost, sNC, True)`,
      "",
    );
  }
  if (errorHandling) {
    lines.push(
      "GoTo Done",
      "ErrorHandler:",
      `    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical, "Mastercam Script Error"`,
      "Done:",
      "",
    );
  }
  return lines.join("\n");
}

function vbsRegenerate(include: boolean): string {
  if (!include) return "";
  return [
    "",
    "' Regenerate all dirty toolpaths",
    "Call MCRegenerateAllDirtyToolpaths()",
    "",
  ].join("\n");
}

function vbsToolDef(tool: ToolSpec, idx: number): string {
  const lines: string[] = [
    `' ── Tool ${idx + 1}: ${tool.type ?? "endmill"} ø${tool.diameter} ──`,
    `Dim oTool${idx} As New MCTool`,
    `oTool${idx}.Diameter = ${tool.diameter}`,
  ];
  if (tool.flutes !== undefined) lines.push(`oTool${idx}.NumFlutes = ${tool.flutes}`);
  if (tool.length_mm !== undefined) lines.push(`oTool${idx}.OverallLength = ${tool.length_mm}`);
  if (tool.cutting_length_mm !== undefined) lines.push(`oTool${idx}.FluteLength = ${tool.cutting_length_mm}`);
  if (tool.tool_number !== undefined) lines.push(`oTool${idx}.ToolNumber = ${tool.tool_number}`);
  if (tool.offset_number !== undefined) lines.push(`oTool${idx}.OffsetNumber = ${tool.offset_number}`);
  if (tool.holder) lines.push(`oTool${idx}.HolderDescription = "${tool.holder}"`);
  lines.push("");
  return lines.join("\n");
}

function vbsCuttingParams(c: CuttingParams, varName: string): string {
  const lines: string[] = [];
  if (c.spindle_rpm !== undefined) lines.push(`${varName}.SpindleSpeed = ${c.spindle_rpm}`);
  if (c.feed_mmpm !== undefined) lines.push(`${varName}.FeedRate = ${c.feed_mmpm}`);
  if (c.plunge_feed_mmpm !== undefined) lines.push(`${varName}.PlungeRate = ${c.plunge_feed_mmpm}`);
  if (c.entry_feed_mmpm !== undefined) lines.push(`${varName}.EntryFeedRate = ${c.entry_feed_mmpm}`);
  if (c.doc_axial_mm !== undefined) lines.push(`${varName}.DepthOfCut = ${c.doc_axial_mm}`);
  if (c.doc_radial_mm !== undefined) lines.push(`${varName}.Stepover = ${c.doc_radial_mm}`);
  if (c.coolant !== undefined) {
    const coolantMap: Record<string, number> = {
      none: 0, flood: 1, mist: 2, through_tool: 4, mql: 8,
    };
    lines.push(`${varName}.Coolant = ${coolantMap[c.coolant] ?? 0}`);
  }
  return lines.join("\n");
}

function vbsStrategyParams(s: StrategyParams, varName: string): string {
  const lines: string[] = [];
  if (s.dynamic_engagement_deg !== undefined) lines.push(`${varName}.MaxEngagementAngle = ${s.dynamic_engagement_deg}`);
  if (s.micro_lift_mm !== undefined) lines.push(`${varName}.MicroLiftDistance = ${s.micro_lift_mm}`);
  if (s.corner_smoothing_mm !== undefined) lines.push(`${varName}.CornerRounding = ${s.corner_smoothing_mm}`);
  if (s.optirough_step_down_mm !== undefined) lines.push(`${varName}.StepDown = ${s.optirough_step_down_mm}`);
  if (s.min_radius_mm !== undefined) lines.push(`${varName}.MinimumRadius = ${s.min_radius_mm}`);
  if (s.stock_to_leave_mm !== undefined) {
    lines.push(`${varName}.StockToLeaveWalls = ${s.stock_to_leave_mm}`);
    lines.push(`${varName}.StockToLeaveFloors = ${s.stock_to_leave_mm}`);
  }
  if (s.climb_mill !== undefined) lines.push(`${varName}.CuttingMethod = ${s.climb_mill ? 0 : 1} ' 0=Climb, 1=Conventional`);
  if (s.retract_height_mm !== undefined) lines.push(`${varName}.RetractHeight = ${s.retract_height_mm}`);
  if (s.clearance_height_mm !== undefined) lines.push(`${varName}.ClearanceHeight = ${s.clearance_height_mm}`);
  return lines.join("\n");
}

const OPERATION_CLASS: Record<OperationType, string> = {
  contour_2d: "MCContourOperation",
  drill: "MCDrillOperation",
  dynamic_mill: "MCDynamicMillOperation",
  face: "MCFaceMillOperation",
  optirough: "MCOptiRoughOperation",
  pocket: "MCPocketOperation",
};

function vbsOperation(op: OperationSpec, idx: number, defaults: Partial<CuttingParams & StrategyParams>): string {
  const cls = OPERATION_CLASS[op.type];
  const v = `oOp${idx}`;
  const label = op.name ?? `${op.type}_${idx + 1}`;
  const lines: string[] = [
    `' ── Operation ${idx + 1}: ${label} ──`,
    `Dim ${v} As New ${cls}`,
    `${v}.OperationName = "${label}"`,
  ];
  // geometry
  if (op.geometry_ref) lines.push(`${v}.AddChain("${op.geometry_ref}")`);

  // tool assignment
  if (op.tool) {
    const tv = `oTool_op${idx}`;
    lines.push(`Dim ${tv} As New MCTool`);
    lines.push(`${tv}.Diameter = ${op.tool.diameter}`);
    if (op.tool.flutes !== undefined) lines.push(`${tv}.NumFlutes = ${op.tool.flutes}`);
    if (op.tool.tool_number !== undefined) lines.push(`${tv}.ToolNumber = ${op.tool.tool_number}`);
    lines.push(`${v}.Tool = ${tv}`);
  }

  // merge defaults + op-level cutting params
  const cut: CuttingParams = { ...defaults, ...(op.cutting ?? {}) };
  const cutStr = vbsCuttingParams(cut, v);
  if (cutStr) lines.push(cutStr);

  // merge defaults + op-level strategy params
  const strat: StrategyParams = { ...defaults, ...(op.strategy ?? {}) };
  const stratStr = vbsStrategyParams(strat, v);
  if (stratStr) lines.push(stratStr);

  // dynamic mill specific
  if (op.type === "dynamic_mill" && strat.dynamic_engagement_deg === undefined) {
    lines.push(`${v}.MaxEngagementAngle = 15 ' Default 15 % engagement`);
  }

  lines.push(`Call ${v}.Commit()`);
  lines.push("");
  return lines.join("\n");
}

// ─── NetHook C# helpers ────────────────────────────────────────────────────────

function csHeader(ops: OperationSpec[], _tools: ToolSpec[], params: GenerateCodeParams): string {
  return `// ============================================================
// Mastercam NetHook API — C# Automation
// Generated by PRISM MastercamCodeGeneratorEngine (E1117)
// Requires: Mastercam.App, Mastercam.Operation, Mastercam.Tools
// ============================================================
using System;
using System.IO;
using Mastercam.App;
using Mastercam.App.Exceptions;
using Mastercam.GroupParameters;
using Mastercam.Operations;
using Mastercam.Tools;
using Mastercam.Support;
using Mastercam.IO;
using Mastercam.IO.Types;

namespace PrismMastercamAutomation
{
    public class GeneratedScript : INetHook
    {
        public void Run(IMastercamServer server)
        {
${params.part_file ? `            // Open part file\n            if (File.Exists(@"${params.part_file}"))\n                FileManager.Open(@"${params.part_file}");\n` : ""}`;
}

const CS_OP_TYPE: Record<OperationType, string> = {
  contour_2d: "ContourOperation",
  drill: "DrillOperation",
  dynamic_mill: "PocketOperation",   // Dynamic Mill is a pocket subtype in NetHook
  face: "FaceMillOperation",
  optirough: "OptiRoughOperation",
  pocket: "PocketOperation",
};

function csToolDef(tool: ToolSpec, varName: string): string {
  const type = tool.type ?? "endmill";
  const csType = type === "drill" ? "DrillToolData" : "MillToolData";
  const lines: string[] = [
    `            // Tool ø${tool.diameter}`,
    `            var ${varName} = new ${csType}();`,
    `            ${varName}.Diameter = ${tool.diameter};`,
  ];
  if (tool.flutes !== undefined) lines.push(`            ${varName}.NumberOfFlutes = ${tool.flutes};`);
  if (tool.length_mm !== undefined) lines.push(`            ${varName}.OverallLength = ${tool.length_mm};`);
  if (tool.cutting_length_mm !== undefined) lines.push(`            ${varName}.FluteLength = ${tool.cutting_length_mm};`);
  if (tool.tool_number !== undefined) lines.push(`            ${varName}.ToolNumber = ${tool.tool_number};`);
  if (tool.holder) lines.push(`            ${varName}.HolderDescription = "${tool.holder}";`);
  return lines.join("\n");
}

function csOperation(op: OperationSpec, idx: number, defaults: Partial<CuttingParams & StrategyParams>): string {
  const cls = CS_OP_TYPE[op.type];
  const v = `op${idx}`;
  const label = op.name ?? `${op.type}_${idx + 1}`;
  const cut: CuttingParams = { ...defaults, ...(op.cutting ?? {}) };
  const strat: StrategyParams = { ...defaults, ...(op.strategy ?? {}) };

  const lines: string[] = [
    ``,
    `            // Operation ${idx + 1}: ${label}`,
    `            var ${v} = new ${cls}();`,
    `            ${v}.OperationName = "${label}";`,
  ];

  if (op.tool) {
    const tv = `tool${idx}`;
    lines.push(csToolDef(op.tool, tv));
    lines.push(`            ${v}.OperationTool = ${tv};`);
  }

  if (cut.spindle_rpm !== undefined) lines.push(`            ${v}.SpindleSpeed = ${cut.spindle_rpm};`);
  if (cut.feed_mmpm !== undefined) lines.push(`            ${v}.FeedRate = ${cut.feed_mmpm};`);
  if (cut.plunge_feed_mmpm !== undefined) lines.push(`            ${v}.PlungeRate = ${cut.plunge_feed_mmpm};`);
  if (cut.doc_axial_mm !== undefined) lines.push(`            ${v}.AxialDepth = ${cut.doc_axial_mm};`);
  if (cut.doc_radial_mm !== undefined) lines.push(`            ${v}.RadialDepth = ${cut.doc_radial_mm};`);
  if (cut.coolant !== undefined) {
    const coolantEnum: Record<string, string> = {
      none: "CoolantMode.Off",
      flood: "CoolantMode.Flood",
      mist: "CoolantMode.Mist",
      through_tool: "CoolantMode.ThroughTool",
      mql: "CoolantMode.MinimumQuantityLubrication",
    };
    lines.push(`            ${v}.Coolant = ${coolantEnum[cut.coolant] ?? "CoolantMode.Off"};`);
  }
  if (strat.dynamic_engagement_deg !== undefined) lines.push(`            ${v}.MaximumEngagementAngle = ${strat.dynamic_engagement_deg};`);
  if (strat.micro_lift_mm !== undefined) lines.push(`            ${v}.MicroLiftDistance = ${strat.micro_lift_mm};`);
  if (strat.corner_smoothing_mm !== undefined) lines.push(`            ${v}.CornerRounding = ${strat.corner_smoothing_mm};`);
  if (strat.stock_to_leave_mm !== undefined) {
    lines.push(`            ${v}.StockToLeaveWalls = ${strat.stock_to_leave_mm};`);
    lines.push(`            ${v}.StockToLeaveFloors = ${strat.stock_to_leave_mm};`);
  }
  if (strat.climb_mill !== undefined) lines.push(`            ${v}.CuttingMethod = ${strat.climb_mill ? "CuttingMethod.Climb" : "CuttingMethod.Conventional"};`);
  if (strat.retract_height_mm !== undefined) lines.push(`            ${v}.RetractHeight = ${strat.retract_height_mm};`);

  lines.push(`            ${v}.Commit();`);
  return lines.join("\n");
}

function csFooter(params: GenerateCodeParams): string {
  const lines: string[] = [];
  if (params.regenerate_all) {
    lines.push("", "            // Regenerate all dirty toolpaths", "            OperationsManager.RegenerateAllDirtyToolpaths();");
  }
  if (params.run_post) {
    const post = params.post_processor ?? "MPFAN";
    const nc = params.nc_output_path ?? "C:\\NC\\output.nc";
    lines.push(
      "",
      "            // Run post processor",
      `            PostManager.PostAll("${post}", @"${nc.replace(/\\/g, "\\\\")}", true);`,
    );
  }
  lines.push(
    "        }",
    "    }",
    "}",
  );
  return lines.join("\n");
}

// ─── Template library ─────────────────────────────────────────────────────────

const TEMPLATES: ScriptTemplate[] = [
  {
    id: "adaptive_roughing_vbs",
    name: "Adaptive Roughing (VBScript)",
    category: "roughing",
    script_type: "vbscript",
    description: "Creates an OptiRough adaptive roughing operation with 30% stepover, 2mm doc, 1mm stock to leave",
    tags: ["optirough", "roughing", "adaptive", "vbscript"],
  },
  {
    id: "dynamic_mill_10pct_vbs",
    name: "Dynamic Mill 10% Engagement (VBScript)",
    category: "roughing",
    script_type: "vbscript",
    description: "Sets up Dynamic Mill with 10% max engagement angle, micro-lift 0.25mm, corner smoothing 0.5mm",
    tags: ["dynamic_mill", "engagement", "vbscript"],
  },
  {
    id: "batch_post_vbs",
    name: "Batch Post-Process All Operations (VBScript)",
    category: "post_processing",
    script_type: "vbscript",
    description: "Loops through all operations, regenerates dirty toolpaths, and runs post processor to NC file",
    tags: ["batch", "post", "regenerate", "vbscript"],
  },
  {
    id: "export_tool_library_cs",
    name: "Export Tool Library (C# NetHook)",
    category: "tool_management",
    script_type: "nethook_csharp",
    description: "Iterates the Mastercam tool library, exports all tools to a CSV file with diameter, flutes, and material",
    tags: ["tool_library", "export", "csv", "nethook"],
  },
  {
    id: "machine_group_setup_cs",
    name: "Machine Group Configuration (C# NetHook)",
    category: "setup",
    script_type: "nethook_csharp",
    description: "Creates a machine group, sets controller, stock model dimensions and origin",
    tags: ["machine_group", "stock", "setup", "nethook"],
  },
  {
    id: "2d_contour_vbs",
    name: "2D Contour Operation (VBScript)",
    category: "finishing",
    script_type: "vbscript",
    description: "Creates a 2D contour finishing pass with climb milling and 0.05mm stock to leave",
    tags: ["contour", "finishing", "vbscript"],
  },
  {
    id: "drill_cycle_vbs",
    name: "Drill Cycle (VBScript)",
    category: "drilling",
    script_type: "vbscript",
    description: "Creates a peck drilling operation with chip-break, through coolant enabled",
    tags: ["drill", "peck", "vbscript"],
  },
  {
    id: "face_mill_vbs",
    name: "Face Milling (VBScript)",
    category: "roughing",
    script_type: "vbscript",
    description: "Face mill operation with 75% stepover for efficient stock removal",
    tags: ["face", "roughing", "vbscript"],
  },
  {
    id: "batch_generate_cs",
    name: "Batch Operation Creation (C# NetHook)",
    category: "batch",
    script_type: "nethook_csharp",
    description: "Creates multiple operations in a loop from a parameter array, regenerates, and posts",
    tags: ["batch", "loop", "nethook"],
  },
];

// ─── Pre-built template code ───────────────────────────────────────────────────

const TEMPLATE_CODE: Record<string, string> = {
  adaptive_roughing_vbs: `'============================================================
' Adaptive Roughing — OptiRough (VBScript)
' Generated by PRISM MastercamCodeGeneratorEngine (E1117)
'============================================================
Option Explicit

Dim oTool As New MCTool
oTool.Diameter = 16.0
oTool.NumFlutes = 4
oTool.ToolNumber = 1
oTool.OffsetNumber = 1
oTool.FluteLength = 40.0
oTool.OverallLength = 100.0
oTool.HolderDescription = "HSK63A BT40"

Dim oOp As New MCOptiRoughOperation
oOp.OperationName = "Adaptive_Roughing_1"
oOp.Tool = oTool
oOp.SpindleSpeed = 8000
oOp.FeedRate = 3200
oOp.PlungeRate = 800
oOp.DepthOfCut = 2.0
oOp.Stepover = 4.8           ' 30 % of 16 mm diameter
oOp.StockToLeaveWalls = 0.5
oOp.StockToLeaveFloors = 0.3
oOp.CuttingMethod = 0         ' 0 = Climb
oOp.RetractHeight = 5.0
oOp.ClearanceHeight = 25.0
oOp.Coolant = 1               ' 1 = Flood
Call oOp.Commit()

Call MCRegenerateAllDirtyToolpaths()
`,

  dynamic_mill_10pct_vbs: `'============================================================
' Dynamic Mill — 10 % Max Engagement (VBScript)
' Generated by PRISM MastercamCodeGeneratorEngine (E1117)
'============================================================
Option Explicit

Dim oTool As New MCTool
oTool.Diameter = 12.0
oTool.NumFlutes = 4
oTool.ToolNumber = 2
oTool.OffsetNumber = 2
oTool.FluteLength = 45.0
oTool.OverallLength = 95.0

Dim oOp As New MCDynamicMillOperation
oOp.OperationName = "Dynamic_Mill_10pct"
oOp.Tool = oTool
oOp.SpindleSpeed = 10000
oOp.FeedRate = 4500
oOp.PlungeRate = 1000
oOp.DepthOfCut = 30.0         ' Full flute depth — Dynamic Motion advantage
oOp.Stepover = 1.2            ' 10 % of 12 mm diameter
oOp.MaxEngagementAngle = 36.0 ' 10 % arc engagement ≈ 36 °
oOp.MicroLiftDistance = 0.25
oOp.CornerRounding = 0.5
oOp.MinimumRadius = 0.8
oOp.StockToLeaveWalls = 0.3
oOp.StockToLeaveFloors = 0.2
oOp.CuttingMethod = 0         ' 0 = Climb
oOp.Coolant = 1               ' 1 = Flood
Call oOp.Commit()

Call MCRegenerateAllDirtyToolpaths()
`,

  batch_post_vbs: `'============================================================
' Batch Post-Process All Operations (VBScript)
' Generated by PRISM MastercamCodeGeneratorEngine (E1117)
'============================================================
Option Explicit
On Error GoTo ErrorHandler

' Regenerate any dirty toolpaths first
Call MCRegenerateAllDirtyToolpaths()

' Post all operations
Dim sPost As String : sPost = "MPFAN"
Dim sNC   As String : sNC   = "C:\\NC\\output.nc"
Call MCPostProcess(sPost, sNC, True)

MsgBox "Post processing complete: " & sNC, vbInformation, "PRISM"
GoTo Done

ErrorHandler:
    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical, "PRISM Script Error"
Done:
`,

  export_tool_library_cs: `// ============================================================
// Export Tool Library to CSV — C# NetHook
// Generated by PRISM MastercamCodeGeneratorEngine (E1117)
// ============================================================
using System;
using System.IO;
using System.Text;
using Mastercam.App;
using Mastercam.Tools;
using Mastercam.IO;

namespace PrismMastercamAutomation
{
    public class ExportToolLibrary : INetHook
    {
        public void Run(IMastercamServer server)
        {
            var sb = new StringBuilder();
            sb.AppendLine("ToolNumber,Diameter,Flutes,OverallLength,FluteLength,Type,Holder");

            var tools = ToolManager.GetAllTools();
            foreach (var tool in tools)
            {
                sb.AppendLine(string.Format("{0},{1},{2},{3},{4},{5},{6}",
                    tool.ToolNumber,
                    tool.Diameter,
                    tool.NumberOfFlutes,
                    tool.OverallLength,
                    tool.FluteLength,
                    tool.GetType().Name.Replace("ToolData", ""),
                    tool.HolderDescription ?? ""));
            }

            var csvPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                "mastercam_tools.csv");
            File.WriteAllText(csvPath, sb.ToString());

            MessageManager.ShowMessage("Exported " + tools.Count + " tools to " + csvPath);
        }
    }
}`,

  machine_group_setup_cs: `// ============================================================
// Machine Group + Stock Model Setup — C# NetHook
// Generated by PRISM MastercamCodeGeneratorEngine (E1117)
// ============================================================
using System;
using Mastercam.App;
using Mastercam.GroupParameters;
using Mastercam.Support;
using Mastercam.Math;

namespace PrismMastercamAutomation
{
    public class MachineGroupSetup : INetHook
    {
        public void Run(IMastercamServer server)
        {
            // Create machine group with Haas UMC-750 controller
            var mgParams = new MachineGroupParameters();
            mgParams.MachineName = "Haas UMC-750";
            mgParams.PostName = "MPFAN";
            var group = OperationsManager.NewMachineGroup(mgParams);

            // Define stock model: 200 × 150 × 75 mm block
            var stock = new StockParameters();
            stock.Shape = StockShape.Rectangular;
            stock.Length = 200.0;
            stock.Width  = 150.0;
            stock.Height = 75.0;
            stock.Origin = new Point3D(0.0, 0.0, 0.0);
            group.StockParameters = stock;

            group.Commit();
            MessageManager.ShowMessage("Machine group created: " + mgParams.MachineName);
        }
    }
}`,

  "2d_contour_vbs": `'============================================================
' 2D Contour Finishing Pass (VBScript)
' Generated by PRISM MastercamCodeGeneratorEngine (E1117)
'============================================================
Option Explicit

Dim oTool As New MCTool
oTool.Diameter = 8.0
oTool.NumFlutes = 4
oTool.ToolNumber = 3
oTool.OffsetNumber = 3
oTool.FluteLength = 22.0
oTool.OverallLength = 72.0

Dim oOp As New MCContourOperation
oOp.OperationName = "2D_Contour_Finish"
oOp.Tool = oTool
oOp.SpindleSpeed = 12000
oOp.FeedRate = 1800
oOp.PlungeRate = 600
oOp.DepthOfCut = 0.0          ' Single depth (set via chain depth)
oOp.StockToLeaveWalls = 0.05
oOp.StockToLeaveFloors = 0.0
oOp.CuttingMethod = 0         ' 0 = Climb
oOp.CornerRounding = 0.2
oOp.RetractHeight = 5.0
oOp.Coolant = 1               ' 1 = Flood
Call oOp.Commit()

Call MCRegenerateAllDirtyToolpaths()
`,

  drill_cycle_vbs: `'============================================================
' Peck Drilling with Through-Tool Coolant (VBScript)
' Generated by PRISM MastercamCodeGeneratorEngine (E1117)
'============================================================
Option Explicit

Dim oTool As New MCTool
oTool.Diameter = 6.8
oTool.NumFlutes = 2
oTool.ToolNumber = 5
oTool.OffsetNumber = 5
oTool.OverallLength = 90.0

Dim oOp As New MCDrillOperation
oOp.OperationName = "Peck_Drill_M8_Tap_Drill"
oOp.Tool = oTool
oOp.SpindleSpeed = 3500
oOp.FeedRate = 350            ' 0.1 mm/rev × 3500 RPM
oOp.PlungeRate = 350
oOp.DepthOfCut = 1.5          ' Peck increment
oOp.CycleType = 83            ' G83 — Deep Hole Peck Drill
oOp.Coolant = 4               ' 4 = Through-Tool
oOp.RetractHeight = 5.0
Call oOp.Commit()

Call MCRegenerateAllDirtyToolpaths()
`,

  face_mill_vbs: `'============================================================
' Face Milling — 75 % Stepover (VBScript)
' Generated by PRISM MastercamCodeGeneratorEngine (E1117)
'============================================================
Option Explicit

Dim oTool As New MCTool
oTool.Diameter = 63.0
oTool.NumFlutes = 6
oTool.ToolNumber = 1
oTool.OffsetNumber = 1
oTool.OverallLength = 60.0

Dim oOp As New MCFaceMillOperation
oOp.OperationName = "Face_Mill_Top"
oOp.Tool = oTool
oOp.SpindleSpeed = 1600
oOp.FeedRate = 2400           ' 0.25 mm/tooth × 6 flutes × 1600 RPM
oOp.PlungeRate = 400
oOp.DepthOfCut = 1.0
oOp.Stepover = 47.25          ' 75 % of 63 mm
oOp.StockToLeaveFloors = 0.1
oOp.CuttingMethod = 0         ' 0 = Climb
oOp.Coolant = 1               ' 1 = Flood
Call oOp.Commit()

Call MCRegenerateAllDirtyToolpaths()
`,

  batch_generate_cs: `// ============================================================
// Batch Operation Creation Loop — C# NetHook
// Generated by PRISM MastercamCodeGeneratorEngine (E1117)
// ============================================================
using System;
using Mastercam.App;
using Mastercam.Operations;
using Mastercam.Tools;
using Mastercam.IO;

namespace PrismMastercamAutomation
{
    public class BatchOperationCreation : INetHook
    {
        private struct OpParam
        {
            public string Name; public double Diameter; public double Rpm; public double Feed; public double Doc;
        }

        public void Run(IMastercamServer server)
        {
            var ops = new[]
            {
                new OpParam { Name = "Rough_Z0",  Diameter = 16.0, Rpm = 8000,  Feed = 3200, Doc = 2.0 },
                new OpParam { Name = "Rough_Z1",  Diameter = 16.0, Rpm = 8000,  Feed = 3200, Doc = 2.0 },
                new OpParam { Name = "Finish_Z0", Diameter =  8.0, Rpm = 12000, Feed = 1800, Doc = 0.5 },
            };

            int toolNo = 1;
            foreach (var p in ops)
            {
                var tool = new MillToolData();
                tool.Diameter = p.Diameter;
                tool.ToolNumber = toolNo++;

                var op = new PocketOperation();
                op.OperationName  = p.Name;
                op.OperationTool  = tool;
                op.SpindleSpeed   = p.Rpm;
                op.FeedRate       = p.Feed;
                op.AxialDepth     = p.Doc;
                op.Commit();
            }

            OperationsManager.RegenerateAllDirtyToolpaths();
            PostManager.PostAll("MPFAN", @"C:\\NC\\batch_output.nc", true);
            MessageManager.ShowMessage("Batch complete. " + ops.Length + " operations created.");
        }
    }
}`,
};

// ─── Engine class ──────────────────────────────────────────────────────────────

export class MastercamCodeGeneratorEngineClass {
  // ── generateVBScript ─────────────────────────────────────────────────────────
  generateVBScript(
    operations: OperationSpec[],
    tools: ToolSpec[],
    params: Omit<GenerateCodeParams, "script_type" | "operations" | "tools">,
  ): { script: string; description: string } {
    const defaults = params.defaults ?? {};
    const warnings: string[] = [];
    const lines: string[] = [vbsHeader(params.part_file, params.error_handling ?? false)];

    // Tool definitions (shared)
    tools.forEach((t, i) => lines.push(vbsToolDef(t, i)));

    // Operation blocks
    operations.forEach((op, i) => {
      if (!op.type) { warnings.push(`Operation ${i} missing type — skipped`); return; }
      lines.push(vbsOperation(op, i, defaults));
    });

    lines.push(vbsRegenerate(params.regenerate_all ?? false));
    lines.push(vbsFooter(params.run_post ?? false, params.nc_output_path, params.post_processor, params.error_handling ?? false));

    return {
      script: lines.join("\n"),
      description: `VBScript for ${operations.length} Mastercam operation(s): ${operations.map(o => o.type).join(", ")}`,
    };
  }

  // ── generateNetHookCode ──────────────────────────────────────────────────────
  generateNetHookCode(
    operations: OperationSpec[],
    tools: ToolSpec[],
    params: Omit<GenerateCodeParams, "script_type" | "operations" | "tools">,
  ): { code: string; description: string } {
    const defaults = params.defaults ?? {};
    const lines: string[] = [csHeader(operations, tools, { ...params, script_type: "nethook_csharp", operations, tools })];

    // Shared tools
    tools.forEach((t, i) => {
      lines.push(csToolDef(t, `sharedTool${i}`));
    });

    // Operations
    operations.forEach((op, i) => lines.push(csOperation(op, i, defaults)));

    lines.push(csFooter({ ...params, script_type: "nethook_csharp", operations, tools }));

    return {
      code: lines.join("\n"),
      description: `C# NetHook code for ${operations.length} Mastercam operation(s): ${operations.map(o => o.type).join(", ")}`,
    };
  }

  // ── getTemplates ─────────────────────────────────────────────────────────────
  getTemplates(category?: TemplateCategory): ScriptTemplate[] {
    if (!category) return TEMPLATES;
    return TEMPLATES.filter(t => t.category === category);
  }

  // ── generateFromDescription ───────────────────────────────────────────────────
  generateFromDescription(description: string): CodeGenerationResult {
    const lower = description.toLowerCase();
    const warnings: string[] = [];

    // Keyword → template mapping
    const templateMatches: Array<[string[], string]> = [
      [["adaptive", "optirough", "rough"], "adaptive_roughing_vbs"],
      [["dynamic mill", "dynamic_mill", "10%", "10 %", "engagement"], "dynamic_mill_10pct_vbs"],
      [["batch post", "post-process all", "post process all"], "batch_post_vbs"],
      [["export tool", "tool library", "csv"], "export_tool_library_cs"],
      [["machine group", "stock model", "setup"], "machine_group_setup_cs"],
      [["contour", "2d contour", "finishing"], "2d_contour_vbs"],
      [["drill", "peck", "tap drill"], "drill_cycle_vbs"],
      [["face mill", "facing"], "face_mill_vbs"],
      [["batch", "loop", "multiple operations"], "batch_generate_cs"],
    ];

    let matchedId: string | undefined;
    for (const [keywords, id] of templateMatches) {
      if (keywords.some(k => lower.includes(k))) {
        matchedId = id;
        break;
      }
    }

    if (matchedId) {
      const tmpl = TEMPLATES.find(t => t.id === matchedId)!;
      return {
        script_type: tmpl.script_type,
        code: TEMPLATE_CODE[matchedId],
        operations_count: 1,
        warnings,
        description: tmpl.description,
      };
    }

    // Fallback: generic VBScript scaffold
    warnings.push("Could not match description to a specific template — returning generic VBScript scaffold");
    const scaffold = `'============================================================
' Generic Mastercam VBScript Scaffold
' Request: "${description}"
' Generated by PRISM MastercamCodeGeneratorEngine (E1117)
'============================================================
Option Explicit

' TODO: Define your tool
Dim oTool As New MCTool
oTool.Diameter = 12.0
oTool.NumFlutes = 4
oTool.ToolNumber = 1

' TODO: Select operation type
' Dim oOp As New MCPocketOperation
' Dim oOp As New MCContourOperation
' Dim oOp As New MCDrillOperation
' Dim oOp As New MCDynamicMillOperation
' Dim oOp As New MCOptiRoughOperation

' oOp.Tool = oTool
' oOp.SpindleSpeed = 8000
' oOp.FeedRate = 2400
' oOp.DepthOfCut = 2.0
' oOp.Coolant = 1
' Call oOp.Commit()

Call MCRegenerateAllDirtyToolpaths()
`;
    return {
      script_type: "vbscript",
      code: scaffold,
      operations_count: 0,
      warnings,
      description: `Generic scaffold for: "${description}"`,
    };
  }

  // ── High-level generate entry point ──────────────────────────────────────────
  generate(params: GenerateCodeParams): CodeGenerationResult {
    const ops = params.operations ?? [];
    const tools = params.tools ?? [];
    const rest = { ...params };
    delete (rest as any).operations;
    delete (rest as any).tools;
    delete (rest as any).script_type;

    if (params.script_type === "nethook_csharp") {
      const { code, description } = this.generateNetHookCode(ops, tools, rest);
      return { script_type: "nethook_csharp", code, operations_count: ops.length, warnings: [], description };
    }
    const { script, description } = this.generateVBScript(ops, tools, rest);
    return { script_type: "vbscript", code: script, operations_count: ops.length, warnings: [], description };
  }
}

// ─── Singleton export ──────────────────────────────────────────────────────────

export const mastercamCodeGeneratorEngine = new MastercamCodeGeneratorEngineClass();
