/**
 * InventorCAMCodeGeneratorEngine - Generate G-code from InventorCAM/HSMWorks (E2401)
 *
 * Generates automation scripts and G-code post-processor configurations for
 * InventorCAM (Autodesk Inventor HSM) and HSMWorks (SolidWorks HSM). Both use
 * the same underlying HSM kernel from Autodesk (formerly HSMWorks ApS).
 *
 * Capabilities:
 *   - iLogic automation scripts for Inventor
 *   - HSM post-processor customization (.cps files)
 *   - Operation creation templates
 *   - Tool library export/import
 *   - NC program generation with custom post
 *   - Batch processing scripts
 *
 * HSM Post-Processor Architecture:
 *   - JavaScript-based .cps files
 *   - onOpen, onSection, onClose event handlers
 *   - Customizable G-code output formatting
 *   - Machine-specific kinematic support
 *
 * Methods:
 *   generateILogicScript(ops, tools, params)    - iLogic VB.NET automation
 *   generatePostCustomization(machine, opts)   - Custom .cps post edits
 *   generateFromDescription(text)              - Natural language to script
 *   getTemplates(category?)                    - Available templates
 *
 * @engine InventorCAMCodeGeneratorEngine
 * @shortcode E2401
 * @dispatcher camDispatcher
 * @actions inventorcam_code_generate, inventorcam_post_customize, inventorcam_templates
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP10
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ScriptType = "ilogic_vb" | "cps_post" | "json_template";

export type OperationType =
  | "adaptive_2d"
  | "adaptive_3d"
  | "pocket_2d"
  | "contour_2d"
  | "face"
  | "slot"
  | "drill"
  | "bore"
  | "thread"
  | "parallel"
  | "scallop"
  | "pencil"
  | "steep_shallow"
  | "horizontal"
  | "contour_3d"
  | "radial"
  | "spiral"
  | "morphed_spiral"
  | "flow";

export type TemplateCategory =
  | "roughing"
  | "finishing"
  | "drilling"
  | "post_processing"
  | "setup"
  | "batch"
  | "tool_management";

export interface ToolSpec {
  /** Tool diameter in mm */
  diameter_mm: number;
  /** Number of cutting flutes */
  flutes?: number;
  /** Flute length / cutting length in mm */
  flute_length_mm?: number;
  /** Overall tool length in mm */
  overall_length_mm?: number;
  /** Shoulder length in mm */
  shoulder_length_mm?: number;
  /** Tool type */
  type?: "flat_end" | "ball_end" | "bull_nose" | "drill" | "tap" | "face_mill" | "thread_mill";
  /** Tool number */
  tool_number?: number;
  /** Corner radius for bull nose tools */
  corner_radius_mm?: number;
}

export interface CuttingParams {
  /** Spindle speed, RPM */
  spindle_rpm?: number;
  /** Surface speed, m/min */
  surface_speed_mpm?: number;
  /** Feed rate, mm/min */
  feed_mmpm?: number;
  /** Feed per tooth, mm */
  feed_per_tooth_mm?: number;
  /** Optimal load (radial engagement) as fraction */
  optimal_load?: number;
  /** Maximum stepdown, mm */
  max_stepdown_mm?: number;
  /** Fine stepdown, mm */
  fine_stepdown_mm?: number;
  /** Multiple depths enabled */
  multiple_depths?: boolean;
  /** Stock to leave, mm */
  stock_to_leave_mm?: number;
  /** Coolant mode */
  coolant?: "flood" | "mist" | "through_tool" | "air" | "disabled";
}

export interface StrategyParams {
  /** Machining strategy */
  strategy?: "adaptive" | "pocket" | "contour" | "parallel" | "scallop" | "steep_shallow";
  /** Spiral in/out direction */
  direction?: "climb" | "conventional" | "both";
  /** Tolerance for finishing, mm */
  tolerance_mm?: number;
  /** Smoothing tolerance, mm */
  smoothing_mm?: number;
  /** Lead-in radius factor */
  lead_in_radius_factor?: number;
  /** Ramp type */
  ramp_type?: "helix" | "profile" | "plunge" | "predrill";
  /** Ramp angle, degrees */
  ramp_angle_deg?: number;
  /** Linking strategy */
  linking?: "minimize_rapids" | "keep_tool_down" | "safe_retracts";
}

export interface OperationSpec {
  /** Operation type */
  type: OperationType;
  /** Operation name/comment */
  name?: string;
  /** Tool specification */
  tool?: ToolSpec;
  /** Cutting parameters */
  cutting?: CuttingParams;
  /** Strategy parameters */
  strategy?: StrategyParams;
  /** WCS offset number */
  wcs_offset?: number;
}

export interface GenerateParams {
  /** Script output type */
  script_type: ScriptType;
  /** Operations to generate */
  operations?: OperationSpec[];
  /** Tool library */
  tools?: ToolSpec[];
  /** Default parameters */
  defaults?: CuttingParams & StrategyParams;
  /** Post processor name */
  post_processor?: string;
  /** Output NC file path */
  nc_output_path?: string;
  /** Machine name */
  machine_name?: string;
  /** Include error handling */
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

// ─── HSM Operation Type Mapping ───────────────────────────────────────────────

const OPERATION_HSM_TYPE: Record<OperationType, string> = {
  adaptive_2d: "cam.Adaptive2d",
  adaptive_3d: "cam.Adaptive3d",
  pocket_2d: "cam.Pocket2d",
  contour_2d: "cam.Contour2d",
  face: "cam.Face",
  slot: "cam.Slot",
  drill: "cam.Drill",
  bore: "cam.Bore",
  thread: "cam.Thread",
  parallel: "cam.Parallel",
  scallop: "cam.Scallop",
  pencil: "cam.Pencil",
  steep_shallow: "cam.SteepAndShallow",
  horizontal: "cam.Horizontal",
  contour_3d: "cam.Contour3d",
  radial: "cam.Radial",
  spiral: "cam.Spiral",
  morphed_spiral: "cam.MorphedSpiral",
  flow: "cam.Flow",
};

// ─── iLogic Script Helpers ────────────────────────────────────────────────────

function iLogicHeader(machineName?: string): string {
  return `' =============================================================
' InventorCAM iLogic Automation Script
' Generated by PRISM InventorCAMCodeGeneratorEngine (E2401)
' Compatible with: Inventor HSM 2024+, HSMWorks 2024+
' =============================================================
Imports Autodesk.Inventor
Imports Autodesk.Inventor.CAM

Public Class CAMAutomation

    Private camDoc As CAMDocument
    Private setup As Setup

    Public Sub Main()
        ' Get active CAM document
        Dim invApp As Application = ThisApplication
        camDoc = invApp.ActiveDocument.ComponentDefinition.CAM

        ' Create or get setup
        setup = GetOrCreateSetup("${machineName ?? "3-Axis Mill"}")

        ' Begin operation creation
`;
}

function iLogicFooter(generateNC: boolean, postProcessor?: string, ncPath?: string): string {
  let footer = `
        ' Generate toolpaths
        camDoc.Generate()

`;
  if (generateNC) {
    footer += `        ' Post process to NC
        Dim postConfig As PostConfiguration = camDoc.PostConfigurations.Item("${postProcessor ?? "fanuc"}")
        Dim ncFolder As String = "${ncPath ?? "C:\\NC"}"
        camDoc.PostProcess(postConfig, ncFolder, True)

`;
  }
  footer += `    End Sub

    Private Function GetOrCreateSetup(machineName As String) As Setup
        If camDoc.Setups.Count > 0 Then
            Return camDoc.Setups.Item(1)
        Else
            Dim setupInput As SetupInput = camDoc.Setups.CreateInput(SetupType.Milling)
            setupInput.Name = "Setup1"
            Return camDoc.Setups.Add(setupInput)
        End If
    End Function

End Class
`;
  return footer;
}

function iLogicToolDef(tool: ToolSpec, idx: number): string {
  const toolType = tool.type ?? "flat_end";
  const hsmToolType = {
    flat_end: "MillToolType.FlatEndMill",
    ball_end: "MillToolType.BallEndMill",
    bull_nose: "MillToolType.BullNoseMill",
    drill: "MillToolType.Drill",
    tap: "MillToolType.Tap",
    face_mill: "MillToolType.FaceMill",
    thread_mill: "MillToolType.ThreadMill",
  }[toolType] ?? "MillToolType.FlatEndMill";

  return `
        ' Tool ${idx + 1}: ${toolType} D${tool.diameter_mm}mm
        Dim tool${idx} As MillTool = camDoc.ToolLibrary.CreateTool(${hsmToolType})
        tool${idx}.Diameter = ${tool.diameter_mm}
        tool${idx}.NumberOfFlutes = ${tool.flutes ?? 4}
        tool${idx}.FluteLength = ${tool.flute_length_mm ?? tool.diameter_mm * 3}
        tool${idx}.OverallLength = ${tool.overall_length_mm ?? tool.diameter_mm * 6}
        tool${idx}.ToolNumber = ${tool.tool_number ?? idx + 1}
${tool.corner_radius_mm ? `        tool${idx}.CornerRadius = ${tool.corner_radius_mm}` : ""}
`;
}

function iLogicOperation(op: OperationSpec, idx: number, defaults: Partial<CuttingParams & StrategyParams>): string {
  const hsmType = OPERATION_HSM_TYPE[op.type] ?? "cam.Adaptive2d";
  const label = op.name ?? `${op.type}_${idx + 1}`;
  const cut: CuttingParams = { ...defaults, ...(op.cutting ?? {}) };
  const strat: StrategyParams = { ...defaults, ...(op.strategy ?? {}) };

  let code = `
        ' Operation ${idx + 1}: ${label}
        Dim op${idx}Input As OperationInput = setup.Operations.CreateInput(OperationType.${hsmType.split(".")[1]})
        op${idx}Input.Name = "${label}"
`;

  // Tool assignment
  if (op.tool) {
    code += `        op${idx}Input.Tool = tool${idx}\n`;
  }

  // Cutting parameters
  if (cut.spindle_rpm) {
    code += `        op${idx}Input.SpindleSpeed = ${cut.spindle_rpm}\n`;
  }
  if (cut.feed_mmpm) {
    code += `        op${idx}Input.FeedRate = ${cut.feed_mmpm}\n`;
  }
  if (cut.optimal_load !== undefined) {
    code += `        op${idx}Input.OptimalLoad = ${cut.optimal_load}\n`;
  }
  if (cut.max_stepdown_mm) {
    code += `        op${idx}Input.MaximumStepdown = ${cut.max_stepdown_mm}\n`;
  }
  if (cut.stock_to_leave_mm !== undefined) {
    code += `        op${idx}Input.StockToLeave = ${cut.stock_to_leave_mm}\n`;
  }

  // Strategy parameters
  if (strat.direction) {
    const dirEnum = strat.direction === "climb" ? "CuttingDirection.Climb" :
                    strat.direction === "conventional" ? "CuttingDirection.Conventional" : "CuttingDirection.Both";
    code += `        op${idx}Input.CuttingDirection = ${dirEnum}\n`;
  }
  if (strat.ramp_type) {
    const rampEnum = {
      helix: "RampType.Helix",
      profile: "RampType.Profile",
      plunge: "RampType.Plunge",
      predrill: "RampType.Predrill",
    }[strat.ramp_type] ?? "RampType.Helix";
    code += `        op${idx}Input.RampType = ${rampEnum}\n`;
  }
  if (strat.ramp_angle_deg) {
    code += `        op${idx}Input.RampAngle = ${strat.ramp_angle_deg}\n`;
  }

  code += `        Dim op${idx} As Operation = setup.Operations.Add(op${idx}Input)\n`;
  return code;
}

// ─── CPS Post Customization Helpers ───────────────────────────────────────────

function generateCPSCustomization(machine: string, options: Record<string, any>): string {
  return `/**
 * Custom Post Processor Modifications for ${machine}
 * Generated by PRISM InventorCAMCodeGeneratorEngine (E2401)
 *
 * Instructions:
 * 1. Open the base .cps file for your controller
 * 2. Apply these modifications to the relevant sections
 * 3. Test with Machine Simulation before production use
 */

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY DEFINITIONS - Add to top of .cps file
// ═══════════════════════════════════════════════════════════════════════════

properties.customWorkOffset = {
  title: "Custom Work Offset",
  description: "Use custom G-code for work offset (e.g., G54.1 P1)",
  type: "boolean",
  value: ${options.customWorkOffset ?? false}
};

properties.safeRetractHeight = {
  title: "Safe Retract Height",
  description: "Safe Z height for retracts (machine coordinates)",
  type: "number",
  value: ${options.safeRetractHeight ?? 100}
};

properties.useToolPreload = {
  title: "Tool Preload",
  description: "Output T command for next tool during current operation",
  type: "boolean",
  value: ${options.toolPreload ?? true}
};

properties.coolantDelay = {
  title: "Coolant Delay",
  description: "Dwell time (seconds) after coolant on before cutting",
  type: "number",
  value: ${options.coolantDelay ?? 2.0}
};

// ═══════════════════════════════════════════════════════════════════════════
// MODIFIED onSection FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function onSection() {
  var insertToolCall = isFirstSection() ||
    currentSection.getForceToolChange() ||
    (tool.number != getPreviousSection().getTool().number);

  if (insertToolCall) {
    // Safe retract before tool change
    writeBlock(gAbsIncModal.format(90), gFormat.format(0),
      "Z" + xyzFormat.format(properties.safeRetractHeight));

    // Tool change with optional preload
    if (properties.useToolPreload && !isLastSection()) {
      var nextTool = getNextSection().getTool();
      writeBlock("T" + toolFormat.format(tool.number), mFormat.format(6));
      writeBlock("T" + toolFormat.format(nextTool.number)); // Preload
    } else {
      writeBlock("T" + toolFormat.format(tool.number), mFormat.format(6));
    }

    // Spindle start
    writeBlock(sOutput.format(spindleSpeed),
      mFormat.format(tool.clockwise ? 3 : 4));

    // Coolant with delay
    if (tool.coolant != COOLANT_OFF) {
      writeBlock(mFormat.format(getCoolantMCode(tool.coolant)));
      if (properties.coolantDelay > 0) {
        writeBlock(gFormat.format(4), "P" + secFormat.format(properties.coolantDelay));
      }
    }
  }

  // Work coordinate system
  if (properties.customWorkOffset) {
    writeBlock(gFormat.format(54.1), "P" + currentSection.workOffset);
  } else {
    writeBlock(gFormat.format(53 + currentSection.workOffset));
  }

  // ... rest of onSection
}

// ═══════════════════════════════════════════════════════════════════════════
// MODIFIED onClose FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function onClose() {
  // Retract to safe Z
  writeBlock(gAbsIncModal.format(90), gFormat.format(0),
    "Z" + xyzFormat.format(properties.safeRetractHeight));

  // Home X/Y
  writeBlock(gFormat.format(28), "X0", "Y0");

  // Spindle and coolant off
  writeBlock(mFormat.format(5)); // Spindle stop
  writeBlock(mFormat.format(9)); // Coolant off

  // Program end
  writeBlock(mFormat.format(30));
}
`;
}

// ─── Template Library ─────────────────────────────────────────────────────────

const TEMPLATES: ScriptTemplate[] = [
  {
    id: "adaptive_roughing_ilogic",
    name: "Adaptive Clearing (iLogic)",
    category: "roughing",
    script_type: "ilogic_vb",
    description: "Creates an Adaptive 2D clearing operation with optimal load control, helix ramp entry, and automatic rest machining",
    tags: ["adaptive", "roughing", "hsm", "2d"],
  },
  {
    id: "adaptive_3d_ilogic",
    name: "Adaptive 3D Roughing (iLogic)",
    category: "roughing",
    script_type: "ilogic_vb",
    description: "3D adaptive roughing with stock-aware toolpath, constant engagement angle, and smooth Z-transitions",
    tags: ["adaptive", "3d", "roughing", "hsm"],
  },
  {
    id: "parallel_finishing_ilogic",
    name: "Parallel Finishing (iLogic)",
    category: "finishing",
    script_type: "ilogic_vb",
    description: "Parallel finishing passes with constant stepover, smoothing enabled, and optimized linking",
    tags: ["parallel", "finishing", "3d"],
  },
  {
    id: "scallop_finishing_ilogic",
    name: "Constant Scallop Finishing (iLogic)",
    category: "finishing",
    script_type: "ilogic_vb",
    description: "Adaptive scallop height finishing for uniform surface quality on complex geometry",
    tags: ["scallop", "finishing", "3d", "surface"],
  },
  {
    id: "drill_cycle_ilogic",
    name: "Drilling Cycles (iLogic)",
    category: "drilling",
    script_type: "ilogic_vb",
    description: "Peck drilling, spot drilling, and tapping operations with automatic cycle selection",
    tags: ["drilling", "peck", "tap", "spot"],
  },
  {
    id: "fanuc_post_custom",
    name: "Fanuc Post Customization",
    category: "post_processing",
    script_type: "cps_post",
    description: "Custom Fanuc post-processor with tool preload, safe retracts, and coolant delay",
    tags: ["fanuc", "post", "customization"],
  },
  {
    id: "haas_post_custom",
    name: "Haas Post Customization",
    category: "post_processing",
    script_type: "cps_post",
    description: "Haas-optimized post with setting 32, macro B compatibility, and probing support",
    tags: ["haas", "post", "macro"],
  },
  {
    id: "batch_process_ilogic",
    name: "Batch NC Generation (iLogic)",
    category: "batch",
    script_type: "ilogic_vb",
    description: "Process multiple setups/parts to NC files with automatic naming and organization",
    tags: ["batch", "nc", "automation"],
  },
  {
    id: "tool_import_ilogic",
    name: "Tool Library Import (iLogic)",
    category: "tool_management",
    script_type: "ilogic_vb",
    description: "Import tool definitions from CSV/JSON into InventorCAM tool library",
    tags: ["tools", "import", "library"],
  },
];

const TEMPLATE_CODE: Record<string, string> = {
  adaptive_roughing_ilogic: `' =============================================================
' Adaptive 2D Clearing Operation (iLogic)
' Generated by PRISM InventorCAMCodeGeneratorEngine (E2401)
' =============================================================
Imports Autodesk.Inventor
Imports Autodesk.Inventor.CAM

Public Class AdaptiveRoughing

    Public Sub Main()
        Dim invApp As Application = ThisApplication
        Dim camDoc As CAMDocument = invApp.ActiveDocument.ComponentDefinition.CAM
        Dim setup As Setup = camDoc.Setups.Item(1)

        ' Create Adaptive 2D operation
        Dim opInput As OperationInput = setup.Operations.CreateInput(OperationType.Adaptive2d)
        opInput.Name = "Adaptive_Roughing"

        ' Tool: 16mm 4-flute carbide endmill
        Dim tool As MillTool = camDoc.ToolLibrary.CreateTool(MillToolType.FlatEndMill)
        tool.Diameter = 16.0
        tool.NumberOfFlutes = 4
        tool.FluteLength = 52.0
        tool.OverallLength = 100.0
        tool.ToolNumber = 1
        opInput.Tool = tool

        ' Cutting parameters - HSM style
        opInput.SpindleSpeed = 8000
        opInput.FeedRate = 3200
        opInput.OptimalLoad = 0.10  ' 10% radial engagement
        opInput.MaximumStepdown = 16.0  ' Full diameter axial depth
        opInput.StockToLeave = 0.5

        ' Strategy
        opInput.CuttingDirection = CuttingDirection.Climb
        opInput.RampType = RampType.Helix
        opInput.RampAngle = 3.0
        opInput.UseRestMachining = True

        Dim op As Operation = setup.Operations.Add(opInput)
        camDoc.Generate()
    End Sub

End Class
`,

  adaptive_3d_ilogic: `' =============================================================
' Adaptive 3D Roughing Operation (iLogic)
' Generated by PRISM InventorCAMCodeGeneratorEngine (E2401)
' =============================================================
Imports Autodesk.Inventor
Imports Autodesk.Inventor.CAM

Public Class Adaptive3DRoughing

    Public Sub Main()
        Dim invApp As Application = ThisApplication
        Dim camDoc As CAMDocument = invApp.ActiveDocument.ComponentDefinition.CAM
        Dim setup As Setup = camDoc.Setups.Item(1)

        ' Create Adaptive 3D operation
        Dim opInput As OperationInput = setup.Operations.CreateInput(OperationType.Adaptive3d)
        opInput.Name = "Adaptive_3D_Rough"

        ' Tool: 12mm 4-flute carbide endmill
        Dim tool As MillTool = camDoc.ToolLibrary.CreateTool(MillToolType.FlatEndMill)
        tool.Diameter = 12.0
        tool.NumberOfFlutes = 4
        tool.FluteLength = 40.0
        tool.OverallLength = 85.0
        tool.ToolNumber = 2
        opInput.Tool = tool

        ' Adaptive 3D specific parameters
        opInput.SpindleSpeed = 10000
        opInput.FeedRate = 4000
        opInput.OptimalLoad = 0.08  ' 8% for 3D
        opInput.MaximumStepdown = 10.0
        opInput.FineStepdown = 2.0
        opInput.StockToLeave = 0.3

        ' 3D roughing strategy
        opInput.Direction = CuttingDirection.Climb
        opInput.UseStockModel = True
        opInput.StockModelSource = StockModelSource.FromPreviousOperation

        Dim op As Operation = setup.Operations.Add(opInput)
        camDoc.Generate()
    End Sub

End Class
`,

  parallel_finishing_ilogic: `' =============================================================
' Parallel Finishing Operation (iLogic)
' Generated by PRISM InventorCAMCodeGeneratorEngine (E2401)
' =============================================================
Imports Autodesk.Inventor
Imports Autodesk.Inventor.CAM

Public Class ParallelFinishing

    Public Sub Main()
        Dim invApp As Application = ThisApplication
        Dim camDoc As CAMDocument = invApp.ActiveDocument.ComponentDefinition.CAM
        Dim setup As Setup = camDoc.Setups.Item(1)

        ' Create Parallel finishing operation
        Dim opInput As OperationInput = setup.Operations.CreateInput(OperationType.Parallel)
        opInput.Name = "Parallel_Finish"

        ' Tool: 8mm ball nose
        Dim tool As MillTool = camDoc.ToolLibrary.CreateTool(MillToolType.BallEndMill)
        tool.Diameter = 8.0
        tool.NumberOfFlutes = 2
        tool.FluteLength = 25.0
        tool.OverallLength = 70.0
        tool.ToolNumber = 10
        opInput.Tool = tool

        ' Finishing parameters
        opInput.SpindleSpeed = 12000
        opInput.FeedRate = 2400
        opInput.Stepover = 0.25  ' 0.25mm stepover
        opInput.Tolerance = 0.01  ' 10 micron tolerance
        opInput.Smoothing = 0.005  ' 5 micron smoothing
        opInput.StockToLeave = 0.0

        ' Direction at 45 degrees
        opInput.PassAngle = 45.0
        opInput.Direction = CuttingDirection.Climb

        Dim op As Operation = setup.Operations.Add(opInput)
        camDoc.Generate()
    End Sub

End Class
`,

  scallop_finishing_ilogic: `' =============================================================
' Constant Scallop Finishing (iLogic)
' Generated by PRISM InventorCAMCodeGeneratorEngine (E2401)
' =============================================================
Imports Autodesk.Inventor
Imports Autodesk.Inventor.CAM

Public Class ScallopFinishing

    Public Sub Main()
        Dim invApp As Application = ThisApplication
        Dim camDoc As CAMDocument = invApp.ActiveDocument.ComponentDefinition.CAM
        Dim setup As Setup = camDoc.Setups.Item(1)

        ' Create Scallop operation
        Dim opInput As OperationInput = setup.Operations.CreateInput(OperationType.Scallop)
        opInput.Name = "Scallop_Finish"

        ' Tool: 6mm ball nose
        Dim tool As MillTool = camDoc.ToolLibrary.CreateTool(MillToolType.BallEndMill)
        tool.Diameter = 6.0
        tool.NumberOfFlutes = 2
        tool.FluteLength = 20.0
        tool.OverallLength = 60.0
        tool.ToolNumber = 12
        opInput.Tool = tool

        ' Scallop parameters
        opInput.SpindleSpeed = 15000
        opInput.FeedRate = 2000
        opInput.ScallopHeight = 0.005  ' 5 micron scallop height
        opInput.Tolerance = 0.005
        opInput.Smoothing = 0.002

        ' Steep area handling
        opInput.MaximumSlopeAngle = 85.0
        opInput.StepoverOnSteepAreas = True

        Dim op As Operation = setup.Operations.Add(opInput)
        camDoc.Generate()
    End Sub

End Class
`,

  drill_cycle_ilogic: `' =============================================================
' Drilling Cycles (iLogic)
' Generated by PRISM InventorCAMCodeGeneratorEngine (E2401)
' =============================================================
Imports Autodesk.Inventor
Imports Autodesk.Inventor.CAM

Public Class DrillingCycles

    Public Sub Main()
        Dim invApp As Application = ThisApplication
        Dim camDoc As CAMDocument = invApp.ActiveDocument.ComponentDefinition.CAM
        Dim setup As Setup = camDoc.Setups.Item(1)

        ' Spot drill first
        Dim spotInput As OperationInput = setup.Operations.CreateInput(OperationType.Drill)
        spotInput.Name = "Spot_Drill"

        Dim spotTool As MillTool = camDoc.ToolLibrary.CreateTool(MillToolType.SpotDrill)
        spotTool.Diameter = 12.0
        spotTool.PointAngle = 90.0
        spotTool.ToolNumber = 20
        spotInput.Tool = spotTool

        spotInput.SpindleSpeed = 2500
        spotInput.FeedRate = 250
        spotInput.CycleType = DrillCycleType.Standard
        spotInput.Depth = 3.0

        setup.Operations.Add(spotInput)

        ' Peck drill
        Dim peckInput As OperationInput = setup.Operations.CreateInput(OperationType.Drill)
        peckInput.Name = "Peck_Drill_8mm"

        Dim drillTool As MillTool = camDoc.ToolLibrary.CreateTool(MillToolType.Drill)
        drillTool.Diameter = 8.0
        drillTool.PointAngle = 140.0
        drillTool.OverallLength = 120.0
        drillTool.ToolNumber = 21
        peckInput.Tool = drillTool

        peckInput.SpindleSpeed = 3000
        peckInput.FeedRate = 300
        peckInput.CycleType = DrillCycleType.DeepDrill ' G83
        peckInput.PeckDepth = 4.0
        peckInput.Depth = 40.0
        peckInput.Coolant = CoolantMode.ThroughTool

        setup.Operations.Add(peckInput)

        camDoc.Generate()
    End Sub

End Class
`,

  batch_process_ilogic: `' =============================================================
' Batch NC Generation (iLogic)
' Generated by PRISM InventorCAMCodeGeneratorEngine (E2401)
' =============================================================
Imports Autodesk.Inventor
Imports Autodesk.Inventor.CAM
Imports System.IO

Public Class BatchNCGeneration

    Public Sub Main()
        Dim invApp As Application = ThisApplication
        Dim outputFolder As String = "C:\\NC_Output"

        ' Create output folder if needed
        If Not Directory.Exists(outputFolder) Then
            Directory.CreateDirectory(outputFolder)
        End If

        ' Get post processor
        Dim camDoc As CAMDocument = invApp.ActiveDocument.ComponentDefinition.CAM
        Dim postConfig As PostConfiguration = camDoc.PostConfigurations.Item("fanuc")

        ' Process each setup
        For Each setup As Setup In camDoc.Setups
            ' Generate toolpaths
            setup.Generate()

            ' Build NC filename
            Dim ncFileName As String = Path.Combine(outputFolder,
                setup.Name & "_" & DateTime.Now.ToString("yyyyMMdd") & ".nc")

            ' Post process
            setup.PostProcess(postConfig, ncFileName, True)

            Logger.Log("Generated: " & ncFileName)
        Next

        MsgBox("Batch complete. Files in: " & outputFolder)
    End Sub

End Class
`,
};

// ─── Pure CAD (U-CADC08) — iLogic VB.NET Fragment Emitters ───────────────────
//
// Inventor iLogic is a VB.NET superset; document parameters accept quoted
// "<value> <unit>" strings which survive document unit switches (mm ↔ in ↔ cm).
// All emitters below return an array of code lines (no leading indent — caller
// adds indentation) so they compose cleanly into buildScript().

export type InvLen = number | string;     // number (mm assumed) | preformatted "25 mm" | expr
export type InvAng = number | string;     // number (deg assumed) | preformatted "30 deg" | expr
export type InvPlane = "xy" | "xz" | "yz";
export type InvBooleanOp = "join" | "cut" | "intersect" | "new_body";
export type InvPattern = "rectangular" | "circular" | "mirror";
export type InvAssemblyMateKind =
  | "mate"
  | "flush"
  | "angle"
  | "tangent"
  | "insert"
  | "parallel"
  | "perpendicular"
  | "symmetry";
export type InvHoleCycle =
  | "simple"
  | "counterbore"
  | "countersink"
  | "drilled"
  | "tapped"
  | "through";

export interface InvFragment {
  /** iLogic VB.NET code lines (no leading indent, no trailing newline). */
  lines: string[];
  /** Parameters the fragment declared via `Parameter("name") = "value unit"`. */
  parameters?: Array<{ name: string; value: number | string | boolean; unit: string; description?: string }>;
  /** Non-fatal warnings raised while emitting. */
  warnings?: string[];
}

function fmtLen(v: InvLen, unit: "mm" | "in" | "cm" = "mm"): string {
  if (typeof v === "string") return `"${v}"`;
  return `"${v} ${unit}"`;
}

function fmtAng(v: InvAng): string {
  if (typeof v === "string") return `"${v}"`;
  return `"${v} deg"`;
}

function fmtNum(v: number): string {
  return Number.isFinite(v) ? String(v) : "0";
}

function planeVar(plane: InvPlane): string {
  // Inventor WorkPlanes: 1=YZ, 2=XZ, 3=XY (world origin planes)
  const map: Record<InvPlane, string> = { yz: "1", xz: "2", xy: "3" };
  return `compDef.WorkPlanes.Item(${map[plane]})`;
}

/** Create a planar sketch on a principal plane or named face. */
export function ilCreateSketch(
  varName: string,
  plane: InvPlane | "face",
  name: string,
  faceRef?: string,
): InvFragment {
  if (plane === "face") {
    if (!faceRef) {
      return {
        lines: [`' ERROR: sketch_create on "face" requires faceRef`],
        warnings: ["sketch_create faceRef missing"],
      };
    }
    return {
      lines: [
        `' Sketch on face ${faceRef}`,
        `Dim ${varName} As PlanarSketch = compDef.Sketches.Add(${faceRef})`,
        `${varName}.Name = "${name}"`,
      ],
    };
  }
  return {
    lines: [
      `' Sketch on ${plane.toUpperCase()} plane`,
      `Dim ${varName} As PlanarSketch = compDef.Sketches.Add(${planeVar(plane)}, False)`,
      `${varName}.Name = "${name}"`,
    ],
  };
}

export function ilSketchLine(sketch: string, x1: number, y1: number, x2: number, y2: number): InvFragment {
  return {
    lines: [
      `${sketch}.SketchLines.AddByTwoPoints(tg.CreatePoint2d(${fmtNum(x1)}, ${fmtNum(y1)}), tg.CreatePoint2d(${fmtNum(x2)}, ${fmtNum(y2)}))`,
    ],
  };
}

export function ilSketchArc(
  sketch: string,
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
): InvFragment {
  const warn: string[] = [];
  if (radius <= 0) warn.push("sketch_arc radius ≤ 0 rejected by Inventor");
  return {
    lines: [
      `${sketch}.SketchArcs.AddByCenterStartEndPoint( _`,
      `    tg.CreatePoint2d(${fmtNum(cx)}, ${fmtNum(cy)}), _`,
      `    tg.CreatePoint2d(${fmtNum(cx + radius * Math.cos((startDeg * Math.PI) / 180))}, ${fmtNum(cy + radius * Math.sin((startDeg * Math.PI) / 180))}), _`,
      `    tg.CreatePoint2d(${fmtNum(cx + radius * Math.cos((endDeg * Math.PI) / 180))}, ${fmtNum(cy + radius * Math.sin((endDeg * Math.PI) / 180))}), _`,
      `    True)`,
    ],
    warnings: warn.length ? warn : undefined,
  };
}

export function ilSketchCircle(sketch: string, cx: number, cy: number, radius: number): InvFragment {
  const warn: string[] = [];
  if (radius <= 0) warn.push("sketch_circle radius ≤ 0");
  return {
    lines: [
      `${sketch}.SketchCircles.AddByCenterRadius(tg.CreatePoint2d(${fmtNum(cx)}, ${fmtNum(cy)}), ${fmtNum(radius)})`,
    ],
    warnings: warn.length ? warn : undefined,
  };
}

export function ilSketchRectangle(
  sketch: string,
  x: number,
  y: number,
  width: number,
  height: number,
): InvFragment {
  return {
    lines: [
      `${sketch}.SketchLines.AddAsTwoPointRectangle( _`,
      `    tg.CreatePoint2d(${fmtNum(x)}, ${fmtNum(y)}), _`,
      `    tg.CreatePoint2d(${fmtNum(x + width)}, ${fmtNum(y + height)}))`,
    ],
  };
}

export function ilSketchPolygon(
  sketch: string,
  cx: number,
  cy: number,
  sides: number,
  radius: number,
  inscribed: boolean = true,
): InvFragment {
  const warn: string[] = [];
  if (sides < 3) warn.push(`sketch_polygon sides=${sides} < 3 rejected`);
  if (radius <= 0) warn.push("sketch_polygon radius ≤ 0");
  const n = Math.max(3, Math.floor(sides));
  const r = inscribed ? radius : radius / Math.cos(Math.PI / n);
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push(`tg.CreatePoint2d(${fmtNum(cx + r * Math.cos(a))}, ${fmtNum(cy + r * Math.sin(a))})`);
  }
  const lines: string[] = [
    `' ${inscribed ? "inscribed" : "circumscribed"} ${n}-gon, r=${radius}`,
  ];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    lines.push(`${sketch}.SketchLines.AddByTwoPoints(${pts[i]}, ${pts[j]})`);
  }
  return { lines, warnings: warn.length ? warn : undefined };
}

export function ilSketchSpline(sketch: string, pts: ReadonlyArray<readonly [number, number]>): InvFragment {
  const warn: string[] = [];
  if (pts.length < 2) warn.push(`sketch_spline needs ≥2 points, got ${pts.length}`);
  const coll = `coll_${Math.abs(Math.floor(Math.random() * 1e6))}`;
  const lines = [
    `Dim ${coll} As ObjectCollection = invApp.TransientObjects.CreateObjectCollection()`,
    ...pts.map(([x, y]) => `${coll}.Add(tg.CreatePoint2d(${fmtNum(x)}, ${fmtNum(y)}))`),
    `${sketch}.SketchSplines.Add(${coll})`,
  ];
  return { lines, warnings: warn.length ? warn : undefined };
}

export function ilSketchEllipse(
  sketch: string,
  cx: number,
  cy: number,
  majorAxisX: number,
  majorAxisY: number,
  minorRadius: number,
): InvFragment {
  const warn: string[] = [];
  if (minorRadius <= 0) warn.push("sketch_ellipse minor radius ≤ 0");
  return {
    lines: [
      `${sketch}.SketchEllipticalArcs.AddFull( _`,
      `    tg.CreatePoint2d(${fmtNum(cx)}, ${fmtNum(cy)}), _`,
      `    tg.CreateVector2d(${fmtNum(majorAxisX)}, ${fmtNum(majorAxisY)}), _`,
      `    ${fmtNum(Math.hypot(majorAxisX, majorAxisY))}, ${fmtNum(minorRadius)})`,
    ],
    warnings: warn.length ? warn : undefined,
  };
}

export function ilSketchSlot(
  sketch: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
): InvFragment {
  const warn: string[] = [];
  if (width <= 0) warn.push("sketch_slot width ≤ 0");
  // Two parallel lines + two semicircles
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const w = width / 2;
  const lines = [
    `' Slot: (${x1},${y1}) → (${x2},${y2}), width=${width}`,
    `${sketch}.SketchLines.AddByTwoPoints(tg.CreatePoint2d(${fmtNum(x1 + nx * w)}, ${fmtNum(y1 + ny * w)}), tg.CreatePoint2d(${fmtNum(x2 + nx * w)}, ${fmtNum(y2 + ny * w)}))`,
    `${sketch}.SketchLines.AddByTwoPoints(tg.CreatePoint2d(${fmtNum(x1 - nx * w)}, ${fmtNum(y1 - ny * w)}), tg.CreatePoint2d(${fmtNum(x2 - nx * w)}, ${fmtNum(y2 - ny * w)}))`,
    `${sketch}.SketchArcs.AddByCenterStartEndPoint(tg.CreatePoint2d(${fmtNum(x1)}, ${fmtNum(y1)}), tg.CreatePoint2d(${fmtNum(x1 - nx * w)}, ${fmtNum(y1 - ny * w)}), tg.CreatePoint2d(${fmtNum(x1 + nx * w)}, ${fmtNum(y1 + ny * w)}), True)`,
    `${sketch}.SketchArcs.AddByCenterStartEndPoint(tg.CreatePoint2d(${fmtNum(x2)}, ${fmtNum(y2)}), tg.CreatePoint2d(${fmtNum(x2 + nx * w)}, ${fmtNum(y2 + ny * w)}), tg.CreatePoint2d(${fmtNum(x2 - nx * w)}, ${fmtNum(y2 - ny * w)}), True)`,
  ];
  return { lines, warnings: warn.length ? warn : undefined };
}

export function ilSketchPoint(sketch: string, x: number, y: number): InvFragment {
  return {
    lines: [`${sketch}.SketchPoints.Add(tg.CreatePoint2d(${fmtNum(x)}, ${fmtNum(y)}), False)`],
  };
}

export interface IlExtrudeOptions {
  endCondition?: "blind" | "through_all" | "up_to_next" | "up_to_surface" | "up_to_body" | "up_to_vertex" | "mid_plane" | "offset_from_surface";
  direction?: "positive" | "negative" | "symmetric";
  distance2?: InvLen;
  taperAngle?: InvAng;
  taperAngle2?: InvAng;
  targetSurface?: string;
  offsetFromSurface?: InvLen;
  thinFeature?: boolean;
  thinThickness?: InvLen;
  thinType?: "one_side" | "two_side" | "symmetric";
  matchShape?: boolean;
}

export function ilExtrude(
  varName: string,
  profileRef: string,
  distance: InvLen,
  operation: InvBooleanOp = "join",
  directionOrOptions: "positive" | "negative" | "symmetric" | IlExtrudeOptions = "positive",
): InvFragment {
  // Backward-compat: 5th arg was `direction: "positive"|"negative"|"symmetric"`
  const options: IlExtrudeOptions =
    typeof directionOrOptions === "string" ? { direction: directionOrOptions } : { ...directionOrOptions };
  const direction = options.direction ?? "positive";
  const endCondition = options.endCondition ?? "blind";

  const opMap: Record<InvBooleanOp, string> = {
    join: "PartFeatureOperationEnum.kJoinOperation",
    cut: "PartFeatureOperationEnum.kCutOperation",
    intersect: "PartFeatureOperationEnum.kIntersectOperation",
    new_body: "PartFeatureOperationEnum.kNewBodyOperation",
  };
  const dirMap = {
    positive: "PartFeatureExtentDirectionEnum.kPositiveExtentDirection",
    negative: "PartFeatureExtentDirectionEnum.kNegativeExtentDirection",
    symmetric: "PartFeatureExtentDirectionEnum.kSymmetricExtentDirection",
  };
  const warn: string[] = [];
  if (typeof distance === "number" && distance <= 0 && endCondition === "blind")
    warn.push("feature_extrude distance ≤ 0");
  if (endCondition === "up_to_surface" && !options.targetSurface)
    warn.push("feature_extrude up_to_surface requires targetSurface; falling back to through_all");
  if (endCondition === "offset_from_surface" && !options.targetSurface)
    warn.push("feature_extrude offset_from_surface requires targetSurface; falling back to blind");

  const lines: string[] = [
    `Dim ${varName}_def As ExtrudeDefinition = compDef.Features.ExtrudeFeatures.CreateExtrudeDefinition( _`,
    `    ${profileRef}.Profiles.AddForSolid(), _`,
    `    ${opMap[operation]})`,
  ];

  // Extent configuration — map canonical endCondition to Inventor ExtrudeDefinition API
  switch (endCondition) {
    case "blind":
      lines.push(`${varName}_def.SetDistanceExtent(${fmtLen(distance)}, ${dirMap[direction]})`);
      break;
    case "mid_plane":
      lines.push(`${varName}_def.SetDistanceExtent(${fmtLen(distance)}, ${dirMap.symmetric})`);
      break;
    case "through_all":
      lines.push(`${varName}_def.SetThroughAllExtent(${dirMap[direction]})`);
      break;
    case "up_to_next":
      lines.push(`${varName}_def.SetToNextExtent(${dirMap[direction]})`);
      break;
    case "up_to_surface":
    case "up_to_body":
    case "up_to_vertex":
      if (options.targetSurface) {
        const match = options.matchShape === false ? "False" : "True";
        lines.push(
          `${varName}_def.SetToExtent(${options.targetSurface}, 0, ${match}, ${dirMap[direction]})`,
        );
      } else {
        lines.push(`${varName}_def.SetThroughAllExtent(${dirMap[direction]})`);
      }
      break;
    case "offset_from_surface":
      if (options.targetSurface) {
        const offset = options.offsetFromSurface ?? 0;
        const match = options.matchShape === false ? "False" : "True";
        lines.push(
          `${varName}_def.SetToExtent(${options.targetSurface}, ${fmtLen(offset)}, ${match}, ${dirMap[direction]})`,
        );
      } else {
        lines.push(`${varName}_def.SetDistanceExtent(${fmtLen(distance)}, ${dirMap[direction]})`);
      }
      break;
  }

  // Two-direction (second extent) when direction is explicit two-side or caller provided distance2
  if (options.distance2 !== undefined && direction !== "symmetric") {
    lines.push(`${varName}_def.SetDistanceExtentTwo(${fmtLen(options.distance2)})`);
  }

  // Taper angle (positive extent) — Inventor expects a string like "3 deg"
  if (options.taperAngle !== undefined) {
    lines.push(`${varName}_def.TaperAngle = ${fmtAng(options.taperAngle)}`);
  }
  if (options.taperAngle2 !== undefined) {
    lines.push(`${varName}_def.TaperAngleTwo = ${fmtAng(options.taperAngle2)}`);
  }

  // Thin feature — Inventor emulates via ExtrudeDefinition.SetShellDirection & wall thickness
  if (options.thinFeature) {
    const thinMap: Record<NonNullable<IlExtrudeOptions["thinType"]>, string> = {
      one_side: "PartFeatureThinWallDirectionEnum.kPositiveThinWallDirection",
      two_side: "PartFeatureThinWallDirectionEnum.kNegativeThinWallDirection",
      symmetric: "PartFeatureThinWallDirectionEnum.kSymmetricThinWallDirection",
    };
    const thinDir = thinMap[options.thinType ?? "one_side"];
    const thick = options.thinThickness ?? 1;
    lines.push(`${varName}_def.SetThinWallExtrude(${fmtLen(thick)}, ${thinDir})`);
  }

  lines.push(`Dim ${varName} As ExtrudeFeature = compDef.Features.ExtrudeFeatures.Add(${varName}_def)`);

  return { lines, warnings: warn.length ? warn : undefined };
}

export interface IlRevolveOptions {
  endCondition?: "angle" | "full" | "two_direction" | "up_to_surface" | "mid_plane";
  direction?: "positive" | "negative" | "symmetric";
  angle2?: InvAng;
  targetSurface?: string;
  thinFeature?: boolean;
  thinThickness?: InvLen;
  thinType?: "one_side" | "two_side" | "symmetric";
}

export function ilRevolve(
  varName: string,
  profileRef: string,
  axisRef: string,
  angle: InvAng = 360,
  operation: InvBooleanOp = "join",
  options: IlRevolveOptions = {},
): InvFragment {
  const opMap: Record<InvBooleanOp, string> = {
    join: "PartFeatureOperationEnum.kJoinOperation",
    cut: "PartFeatureOperationEnum.kCutOperation",
    intersect: "PartFeatureOperationEnum.kIntersectOperation",
    new_body: "PartFeatureOperationEnum.kNewBodyOperation",
  };
  const dirMap = {
    positive: "PartFeatureExtentDirectionEnum.kPositiveExtentDirection",
    negative: "PartFeatureExtentDirectionEnum.kNegativeExtentDirection",
    symmetric: "PartFeatureExtentDirectionEnum.kSymmetricExtentDirection",
  };
  const direction = options.direction ?? "positive";
  const warn: string[] = [];
  const angNum = typeof angle === "number" ? angle : NaN;
  if (!Number.isNaN(angNum) && (angNum <= 0 || angNum > 360)) warn.push(`feature_revolve angle ${angNum} out of (0,360]`);

  const endCondition: NonNullable<IlRevolveOptions["endCondition"]> =
    options.endCondition ??
    (typeof angle === "number" && Math.abs(angle - 360) < 1e-6 ? "full" : "angle");

  const lines: string[] = [];

  switch (endCondition) {
    case "full":
      lines.push(
        `Dim ${varName} As RevolveFeature = compDef.Features.RevolveFeatures.AddFull( _`,
        `    ${profileRef}.Profiles.AddForSolid(), ${axisRef}, ${opMap[operation]})`,
      );
      break;
    case "mid_plane":
      lines.push(
        `Dim ${varName} As RevolveFeature = compDef.Features.RevolveFeatures.AddByAngle( _`,
        `    ${profileRef}.Profiles.AddForSolid(), ${axisRef}, ${fmtAng(angle)}, _`,
        `    ${dirMap.symmetric}, ${opMap[operation]})`,
      );
      break;
    case "two_direction": {
      const ang2 = options.angle2 ?? angle;
      lines.push(
        `Dim ${varName}_def As RevolveDefinition = compDef.Features.RevolveFeatures.CreateRevolveDefinition( _`,
        `    ${profileRef}.Profiles.AddForSolid(), ${axisRef}, ${opMap[operation]})`,
        `${varName}_def.SetAngleExtent(${fmtAng(angle)}, ${dirMap.positive})`,
        `${varName}_def.SetAngleExtentTwo(${fmtAng(ang2)})`,
        `Dim ${varName} As RevolveFeature = compDef.Features.RevolveFeatures.Add(${varName}_def)`,
      );
      break;
    }
    case "up_to_surface":
      if (options.targetSurface) {
        lines.push(
          `Dim ${varName}_def As RevolveDefinition = compDef.Features.RevolveFeatures.CreateRevolveDefinition( _`,
          `    ${profileRef}.Profiles.AddForSolid(), ${axisRef}, ${opMap[operation]})`,
          `${varName}_def.SetToExtent(${options.targetSurface}, ${dirMap[direction]})`,
          `Dim ${varName} As RevolveFeature = compDef.Features.RevolveFeatures.Add(${varName}_def)`,
        );
      } else {
        warn.push("feature_revolve up_to_surface requires targetSurface; falling back to angle");
        lines.push(
          `Dim ${varName} As RevolveFeature = compDef.Features.RevolveFeatures.AddByAngle( _`,
          `    ${profileRef}.Profiles.AddForSolid(), ${axisRef}, ${fmtAng(angle)}, _`,
          `    ${dirMap[direction]}, ${opMap[operation]})`,
        );
      }
      break;
    case "angle":
    default:
      lines.push(
        `Dim ${varName} As RevolveFeature = compDef.Features.RevolveFeatures.AddByAngle( _`,
        `    ${profileRef}.Profiles.AddForSolid(), ${axisRef}, ${fmtAng(angle)}, _`,
        `    ${dirMap[direction]}, ${opMap[operation]})`,
      );
      break;
  }

  // Thin feature annotation (Inventor revolve thin is applied post-hoc via feature property)
  if (options.thinFeature) {
    const thick = options.thinThickness ?? 1;
    lines.push(`' thin revolve: thickness=${fmtLen(thick)} type=${options.thinType ?? "one_side"}`);
  }

  return { lines, warnings: warn.length ? warn : undefined };
}

export function ilLoft(
  varName: string,
  profileRefs: ReadonlyArray<string>,
  operation: InvBooleanOp = "join",
): InvFragment {
  const opMap: Record<InvBooleanOp, string> = {
    join: "PartFeatureOperationEnum.kJoinOperation",
    cut: "PartFeatureOperationEnum.kCutOperation",
    intersect: "PartFeatureOperationEnum.kIntersectOperation",
    new_body: "PartFeatureOperationEnum.kNewBodyOperation",
  };
  const warn: string[] = [];
  if (profileRefs.length < 2) warn.push(`feature_loft requires ≥2 profiles, got ${profileRefs.length}`);
  const sects = `sects_${Math.abs(Math.floor(Math.random() * 1e6))}`;
  return {
    lines: [
      `Dim ${sects} As ObjectCollection = invApp.TransientObjects.CreateObjectCollection()`,
      ...profileRefs.map((p) => `${sects}.Add(${p}.Profiles.AddForSolid())`),
      `Dim ${varName}_def As LoftDefinition = compDef.Features.LoftFeatures.CreateLoftDefinition(${sects}, ${opMap[operation]})`,
      `Dim ${varName} As LoftFeature = compDef.Features.LoftFeatures.Add(${varName}_def)`,
    ],
    warnings: warn.length ? warn : undefined,
  };
}

export function ilSweep(
  varName: string,
  profileRef: string,
  pathRef: string,
  operation: InvBooleanOp = "join",
): InvFragment {
  const opMap: Record<InvBooleanOp, string> = {
    join: "PartFeatureOperationEnum.kJoinOperation",
    cut: "PartFeatureOperationEnum.kCutOperation",
    intersect: "PartFeatureOperationEnum.kIntersectOperation",
    new_body: "PartFeatureOperationEnum.kNewBodyOperation",
  };
  return {
    lines: [
      `Dim ${varName}_path As Path = compDef.Features.CreatePath(${pathRef})`,
      `Dim ${varName}_def As SweepDefinition = compDef.Features.SweepFeatures.CreateSweepDefinition( _`,
      `    SweepTypeEnum.kPathSweepType, ${profileRef}.Profiles.AddForSolid(), ${varName}_path, ${opMap[operation]})`,
      `Dim ${varName} As SweepFeature = compDef.Features.SweepFeatures.Add(${varName}_def)`,
    ],
  };
}

export function ilHole(
  varName: string,
  faceRef: string,
  centerX: number,
  centerY: number,
  cycle: InvHoleCycle,
  diameter: InvLen,
  depth: InvLen | "through",
  options: { peck?: boolean; tapSize?: string; counterboreDiameter?: InvLen; counterboreDepth?: InvLen } = {},
): InvFragment {
  const warn: string[] = [];
  if (typeof diameter === "number" && diameter <= 0) warn.push("feature_hole diameter ≤ 0");
  const sketchVar = `${varName}_sk`;
  const pts = `${varName}_pts`;
  const lines = [
    `Dim ${sketchVar} As PlanarSketch = compDef.Sketches.Add(${faceRef})`,
    `Dim ${pts} As ObjectCollection = invApp.TransientObjects.CreateObjectCollection()`,
    `${pts}.Add(${sketchVar}.SketchPoints.Add(tg.CreatePoint2d(${fmtNum(centerX)}, ${fmtNum(centerY)}), False))`,
    `Dim ${varName}_hp As HolePlacementDefinition = compDef.Features.HoleFeatures.CreateSketchPlacementDefinition(${pts})`,
  ];
  switch (cycle) {
    case "simple":
    case "drilled":
      if (depth === "through") {
        lines.push(
          `Dim ${varName} As HoleFeature = compDef.Features.HoleFeatures.AddDrilledByThroughAllExtent( _`,
          `    ${varName}_hp, ${fmtLen(diameter)}, PartFeatureExtentDirectionEnum.kNegativeExtentDirection)`,
        );
      } else {
        lines.push(
          `Dim ${varName} As HoleFeature = compDef.Features.HoleFeatures.AddDrilledByDistanceExtent( _`,
          `    ${varName}_hp, ${fmtLen(diameter)}, ${fmtLen(depth)}, PartFeatureExtentDirectionEnum.kNegativeExtentDirection, "118 deg")`,
        );
      }
      break;
    case "through":
      lines.push(
        `Dim ${varName} As HoleFeature = compDef.Features.HoleFeatures.AddDrilledByThroughAllExtent( _`,
        `    ${varName}_hp, ${fmtLen(diameter)}, PartFeatureExtentDirectionEnum.kNegativeExtentDirection)`,
      );
      break;
    case "counterbore": {
      const cbDia = options.counterboreDiameter ?? (typeof diameter === "number" ? diameter * 1.8 : "18 mm");
      const cbDepth = options.counterboreDepth ?? (typeof diameter === "number" ? diameter * 0.5 : "5 mm");
      const holeDepth = depth === "through" ? `"25 mm"` : fmtLen(depth);
      lines.push(
        `Dim ${varName} As HoleFeature = compDef.Features.HoleFeatures.AddCounterboreByDistanceExtent( _`,
        `    ${varName}_hp, ${fmtLen(diameter)}, ${holeDepth}, _`,
        `    PartFeatureExtentDirectionEnum.kNegativeExtentDirection, "118 deg", _`,
        `    ${fmtLen(cbDia)}, ${fmtLen(cbDepth)})`,
      );
      break;
    }
    case "countersink": {
      const csDia = options.counterboreDiameter ?? (typeof diameter === "number" ? diameter * 2.0 : "20 mm");
      const holeDepth = depth === "through" ? `"25 mm"` : fmtLen(depth);
      lines.push(
        `Dim ${varName} As HoleFeature = compDef.Features.HoleFeatures.AddCountersinkByDistanceExtent( _`,
        `    ${varName}_hp, ${fmtLen(diameter)}, ${holeDepth}, _`,
        `    PartFeatureExtentDirectionEnum.kNegativeExtentDirection, "118 deg", _`,
        `    ${fmtLen(csDia)}, "82 deg")`,
      );
      break;
    }
    case "tapped": {
      const tap = options.tapSize ?? "M8x1.25";
      lines.push(
        `' Tapped hole ${tap} — requires ThreadsCollection lookup in full iLogic`,
        `Dim ${varName} As HoleFeature = compDef.Features.HoleFeatures.AddDrilledByDistanceExtent( _`,
        `    ${varName}_hp, ${fmtLen(diameter)}, ${depth === "through" ? `"25 mm"` : fmtLen(depth)}, _`,
        `    PartFeatureExtentDirectionEnum.kNegativeExtentDirection, "118 deg")`,
        `' NOTE: attach ThreadFeature for ${tap} after hole placement`,
      );
      break;
    }
  }
  if (options.peck) lines.push(`' peck-drilling hint (post-process): enable G83 canned cycle`);
  return { lines, warnings: warn.length ? warn : undefined };
}

export function ilPocket(
  varName: string,
  profileRef: string,
  depth: InvLen,
): InvFragment {
  // Pocket in Inventor = Extrude with Cut operation.
  return ilExtrude(varName, profileRef, depth, "cut", "negative");
}

export function ilFillet(varName: string, edgeRefs: ReadonlyArray<string>, radius: InvLen): InvFragment {
  const warn: string[] = [];
  if (edgeRefs.length === 0) warn.push("feature_fillet requires ≥1 edge");
  if (typeof radius === "number" && radius <= 0) warn.push("feature_fillet radius ≤ 0");
  const edges = `${varName}_edges`;
  return {
    lines: [
      `Dim ${edges} As EdgeCollection = invApp.TransientObjects.CreateEdgeCollection()`,
      ...edgeRefs.map((e) => `${edges}.Add(${e})`),
      `Dim ${varName}_def As FilletDefinition = compDef.Features.FilletFeatures.CreateFilletDefinition()`,
      `${varName}_def.AddConstantRadiusEdgeSet(${edges}, ${fmtLen(radius)})`,
      `Dim ${varName} As FilletFeature = compDef.Features.FilletFeatures.Add(${varName}_def)`,
    ],
    warnings: warn.length ? warn : undefined,
  };
}

export function ilChamfer(varName: string, edgeRefs: ReadonlyArray<string>, distance: InvLen): InvFragment {
  const warn: string[] = [];
  if (edgeRefs.length === 0) warn.push("feature_chamfer requires ≥1 edge");
  if (typeof distance === "number" && distance <= 0) warn.push("feature_chamfer distance ≤ 0");
  const edges = `${varName}_edges`;
  return {
    lines: [
      `Dim ${edges} As EdgeCollection = invApp.TransientObjects.CreateEdgeCollection()`,
      ...edgeRefs.map((e) => `${edges}.Add(${e})`),
      `Dim ${varName} As ChamferFeature = compDef.Features.ChamferFeatures.AddEqualDistanceChamfer(${edges}, ${fmtLen(distance)})`,
    ],
    warnings: warn.length ? warn : undefined,
  };
}

export function ilShell(varName: string, faceRefs: ReadonlyArray<string>, thickness: InvLen): InvFragment {
  const warn: string[] = [];
  if (typeof thickness === "number" && thickness <= 0) warn.push("feature_shell thickness ≤ 0");
  const faces = `${varName}_faces`;
  return {
    lines: [
      `Dim ${faces} As FaceCollection = invApp.TransientObjects.CreateFaceCollection()`,
      ...faceRefs.map((f) => `${faces}.Add(${f})`),
      `Dim ${varName} As ShellFeature = compDef.Features.ShellFeatures.AddUsingThickness( _`,
      `    ${faces}, ${fmtLen(thickness)}, ShellDirectionEnum.kInsideShellDirection)`,
    ],
    warnings: warn.length ? warn : undefined,
  };
}

export function ilDraft(
  varName: string,
  faceRefs: ReadonlyArray<string>,
  pullDirectionRef: string,
  angleDeg: InvAng,
): InvFragment {
  const faces = `${varName}_faces`;
  return {
    lines: [
      `Dim ${faces} As FaceCollection = invApp.TransientObjects.CreateFaceCollection()`,
      ...faceRefs.map((f) => `${faces}.Add(${f})`),
      `Dim ${varName}_def As FaceDraftDefinition = compDef.Features.FaceDraftFeatures.CreateFaceDraftDefinition( _`,
      `    FaceDraftTypeEnum.kFixedEdgeFaceDraftType, ${pullDirectionRef}, ${fmtAng(angleDeg)})`,
      `${varName}_def.AddFaceSet(${faces})`,
      `Dim ${varName} As FaceDraftFeature = compDef.Features.FaceDraftFeatures.Add(${varName}_def)`,
    ],
  };
}

export function ilBoolean(varName: string, toolBodyRef: string, op: "union" | "subtract" | "intersect"): InvFragment {
  const opMap = {
    union: "PartFeatureOperationEnum.kJoinOperation",
    subtract: "PartFeatureOperationEnum.kCutOperation",
    intersect: "PartFeatureOperationEnum.kIntersectOperation",
  };
  return {
    lines: [
      `Dim ${varName} As CombineFeature = compDef.Features.CombineFeatures.Add( _`,
      `    compDef.SurfaceBodies.Item(1), ${toolBodyRef}, ${opMap[op]}, True)`,
    ],
  };
}

export function ilPatternRectangular(
  varName: string,
  featureRefs: ReadonlyArray<string>,
  dir1Ref: string,
  count1: number,
  spacing1: InvLen,
  dir2Ref?: string,
  count2?: number,
  spacing2?: InvLen,
): InvFragment {
  const warn: string[] = [];
  if (count1 < 1) warn.push(`pattern_linear count1=${count1} < 1`);
  const feats = `${varName}_feats`;
  const lines = [
    `Dim ${feats} As ObjectCollection = invApp.TransientObjects.CreateObjectCollection()`,
    ...featureRefs.map((f) => `${feats}.Add(${f})`),
  ];
  if (dir2Ref && count2 !== undefined && spacing2 !== undefined) {
    lines.push(
      `Dim ${varName} As RectangularPatternFeature = compDef.Features.RectangularPatternFeatures.Add( _`,
      `    ${feats}, ${dir1Ref}, ${count1}, ${fmtLen(spacing1)}, True, True, _`,
      `    ${dir2Ref}, ${count2}, ${fmtLen(spacing2)}, True, True)`,
    );
  } else {
    lines.push(
      `Dim ${varName} As RectangularPatternFeature = compDef.Features.RectangularPatternFeatures.Add( _`,
      `    ${feats}, ${dir1Ref}, ${count1}, ${fmtLen(spacing1)}, True, True)`,
    );
  }
  return { lines, warnings: warn.length ? warn : undefined };
}

export function ilPatternCircular(
  varName: string,
  featureRefs: ReadonlyArray<string>,
  axisRef: string,
  count: number,
  angle: InvAng = 360,
): InvFragment {
  const warn: string[] = [];
  if (count < 1) warn.push(`pattern_circular count=${count} < 1`);
  const feats = `${varName}_feats`;
  return {
    lines: [
      `Dim ${feats} As ObjectCollection = invApp.TransientObjects.CreateObjectCollection()`,
      ...featureRefs.map((f) => `${feats}.Add(${f})`),
      `Dim ${varName} As CircularPatternFeature = compDef.Features.CircularPatternFeatures.Add( _`,
      `    ${feats}, ${axisRef}, True, ${count}, ${fmtAng(angle)}, True, _`,
      `    PatternComputeTypeEnum.kOptimizedCompute)`,
    ],
    warnings: warn.length ? warn : undefined,
  };
}

export function ilMirror(
  varName: string,
  featureRefs: ReadonlyArray<string>,
  mirrorPlaneRef: string,
): InvFragment {
  const feats = `${varName}_feats`;
  return {
    lines: [
      `Dim ${feats} As ObjectCollection = invApp.TransientObjects.CreateObjectCollection()`,
      ...featureRefs.map((f) => `${feats}.Add(${f})`),
      `Dim ${varName} As MirrorFeature = compDef.Features.MirrorFeatures.Add( _`,
      `    ${feats}, ${mirrorPlaneRef}, True, PatternComputeTypeEnum.kOptimizedCompute)`,
    ],
  };
}

export function ilMove(varName: string, bodyRef: string, dx: InvLen, dy: InvLen, dz: InvLen): InvFragment {
  return {
    lines: [
      `Dim ${varName}_def As MoveDefinition = compDef.Features.MoveFeatures.CreateMoveDefinition(${bodyRef})`,
      `${varName}_def.AddFreeDrag(${fmtLen(dx)}, ${fmtLen(dy)}, ${fmtLen(dz)})`,
      `Dim ${varName} As MoveFeature = compDef.Features.MoveFeatures.Add(${varName}_def)`,
    ],
  };
}

export function ilRotate(varName: string, bodyRef: string, axisRef: string, angle: InvAng): InvFragment {
  return {
    lines: [
      `Dim ${varName}_def As MoveDefinition = compDef.Features.MoveFeatures.CreateMoveDefinition(${bodyRef})`,
      `${varName}_def.AddFreeRotate(${axisRef}, ${fmtAng(angle)})`,
      `Dim ${varName} As MoveFeature = compDef.Features.MoveFeatures.Add(${varName}_def)`,
    ],
  };
}

export function ilWorkPlane(varName: string, type: "offset" | "origin_xy" | "origin_xz" | "origin_yz" | "face_offset", params: { offset?: InvLen; faceRef?: string; basePlane?: InvPlane } = {}): InvFragment {
  switch (type) {
    case "offset": {
      const base = params.basePlane ?? "xy";
      return {
        lines: [
          `Dim ${varName} As WorkPlane = compDef.WorkPlanes.AddByPlaneAndOffset(${planeVar(base)}, ${fmtLen(params.offset ?? 10)})`,
        ],
      };
    }
    case "origin_xy":
      return { lines: [`Dim ${varName} As WorkPlane = compDef.WorkPlanes.Item(3)`] };
    case "origin_xz":
      return { lines: [`Dim ${varName} As WorkPlane = compDef.WorkPlanes.Item(2)`] };
    case "origin_yz":
      return { lines: [`Dim ${varName} As WorkPlane = compDef.WorkPlanes.Item(1)`] };
    case "face_offset":
      return {
        lines: [
          `Dim ${varName} As WorkPlane = compDef.WorkPlanes.AddByPlaneAndOffset(${params.faceRef ?? "face"}, ${fmtLen(params.offset ?? 10)})`,
        ],
      };
  }
}

export function ilWorkAxis(varName: string, kind: "x" | "y" | "z" | "line", lineRef?: string): InvFragment {
  if (kind === "line" && lineRef) {
    return { lines: [`Dim ${varName} As WorkAxis = compDef.WorkAxes.AddByLine(${lineRef})`] };
  }
  const idx = { x: 1, y: 2, z: 3 }[kind as "x" | "y" | "z"] ?? 3;
  return { lines: [`Dim ${varName} As WorkAxis = compDef.WorkAxes.Item(${idx})`] };
}

export function ilWorkPoint(varName: string, x: InvLen, y: InvLen, z: InvLen): InvFragment {
  return {
    lines: [
      `Dim ${varName} As WorkPoint = compDef.WorkPoints.AddFixed(tg.CreatePoint(${fmtLen(x)}, ${fmtLen(y)}, ${fmtLen(z)}))`,
    ],
  };
}

export function ilAssemblyMate(
  varName: string,
  kind: InvAssemblyMateKind,
  entity1: string,
  entity2: string,
  options: { offset?: InvLen; angle?: InvAng; solution?: "flush" | "mate" } = {},
): InvFragment {
  const warn: string[] = [];
  const lines: string[] = [];
  switch (kind) {
    case "mate":
    case "flush":
      lines.push(
        `Dim ${varName} As MateConstraint = assyCompDef.Constraints.AddMateConstraint( _`,
        `    ${entity1}, ${entity2}, ${fmtLen(options.offset ?? 0)})`,
      );
      break;
    case "angle":
      lines.push(
        `Dim ${varName} As AngleConstraint = assyCompDef.Constraints.AddAngleConstraint( _`,
        `    ${entity1}, ${entity2}, ${fmtAng(options.angle ?? 0)})`,
      );
      break;
    case "tangent":
      lines.push(
        `Dim ${varName} As TangentConstraint = assyCompDef.Constraints.AddTangentConstraint( _`,
        `    ${entity1}, ${entity2}, TangentConstraintSolutionTypeEnum.kOutsideTangent)`,
      );
      break;
    case "insert":
      lines.push(
        `Dim ${varName} As InsertConstraint = assyCompDef.Constraints.AddInsertConstraint( _`,
        `    ${entity1}, ${entity2}, False, ${fmtLen(options.offset ?? 0)})`,
      );
      break;
    case "parallel":
      lines.push(
        `Dim ${varName} As MateConstraint = assyCompDef.Constraints.AddMateConstraint( _`,
        `    ${entity1}, ${entity2}, ${fmtLen(options.offset ?? 0)}, _`,
        `    InferredTypeEnum.kInferredParallel)`,
      );
      break;
    case "perpendicular":
      lines.push(
        `Dim ${varName} As AngleConstraint = assyCompDef.Constraints.AddAngleConstraint( _`,
        `    ${entity1}, ${entity2}, "90 deg")`,
      );
      break;
    case "symmetry":
      lines.push(
        `Dim ${varName} As SymmetryConstraint = assyCompDef.Constraints.AddSymmetryConstraint( _`,
        `    ${entity1}, ${entity2}, compDef.WorkPlanes.Item(3))`,
      );
      break;
    default:
      warn.push(`assembly mate kind ${kind} not supported, emitting generic mate`);
      lines.push(
        `Dim ${varName} As MateConstraint = assyCompDef.Constraints.AddMateConstraint( _`,
        `    ${entity1}, ${entity2}, ${fmtLen(options.offset ?? 0)})`,
      );
  }
  return { lines, warnings: warn.length ? warn : undefined };
}

export function ilImport(path: string, format: "step" | "iges" | "stl"): InvFragment {
  return {
    lines: [
      `' Import ${format.toUpperCase()} from ${path}`,
      `Dim importDef As TranslatorAddIn = invApp.ApplicationAddIns.ItemById("{${format === "step" ? "90AF7F40-0C01-11D5-8E83-0010B541CD80" : format === "iges" ? "8F7D80D6-DFCB-4BF5-9EFF-3ACBA3F17B9E" : "533E0DE0-0000-0000-0000-000000000000"}}")`,
      `' Call importDef.Import("${path}")`,
    ],
  };
}

export function ilExport(path: string, format: "step" | "iges" | "stl" | "dxf"): InvFragment {
  return {
    lines: [
      `' Export to ${format.toUpperCase()}: ${path}`,
      `Dim xlator As TranslatorAddIn = invApp.ApplicationAddIns.ItemById("{${format === "step" ? "90AF7F40-0C01-11D5-8E83-0010B541CD80" : format === "iges" ? "8F7D80D6-DFCB-4BF5-9EFF-3ACBA3F17B9E" : format === "stl" ? "533E0DE0-0000-0000-0000-000000000000" : "C24E3AC4-122E-11D5-8E91-0010B541CD80"}}")`,
      `' Call xlator.SaveCopyAs(doc, "${path}")`,
    ],
  };
}

export function ilParameter(name: string, value: number | string, unit: string = "mm"): InvFragment {
  const exprValue = typeof value === "number" ? `${value} ${unit}` : String(value);
  return {
    lines: [
      `' Declare user parameter ${name} = ${exprValue}`,
      `If Not doc.ComponentDefinition.Parameters.UserParameters.Item("${name}") Is Nothing Then`,
      `    doc.ComponentDefinition.Parameters.UserParameters.Item("${name}").Expression = "${exprValue}"`,
      `Else`,
      `    doc.ComponentDefinition.Parameters.UserParameters.AddByExpression("${name}", "${exprValue}", UnitsTypeEnum.kDatabaseLengthUnits)`,
      `End If`,
    ],
    parameters: [{ name, value, unit, description: "user parameter" }],
  };
}

export function ilEquation(name: string, expression: string): InvFragment {
  return {
    lines: [
      `' Equation ${name} = ${expression}`,
      `doc.ComponentDefinition.Parameters.UserParameters.Item("${name}").Expression = "${expression}"`,
    ],
  };
}

// ─── Adapter: ICADCodeGenerator for Inventor iLogic ───────────────────────────

import {
  UnifiedCADCodeGeneratorBase,
  type CADEmitter,
} from "./UnifiedCADCodeGeneratorBase.js";
import type {
  CADCapabilityMatrix,
  CADExecutionResult,
  CADOperation,
  CADOperationKind,
  CADScript,
  CADSystemId,
} from "../interfaces/ICADCodeGenerator.js";

const INVENTOR_SUPPORTED_OPS: CADOperationKind[] = [
  "sketch_create",
  "sketch_line",
  "sketch_arc",
  "sketch_circle",
  "sketch_rectangle",
  "sketch_polygon",
  "sketch_spline",
  "sketch_ellipse",
  "sketch_slot",
  "sketch_point",
  "sketch_constraint",
  "sketch_dimension",
  "feature_extrude",
  "feature_revolve",
  "feature_loft",
  "feature_sweep",
  "feature_hole",
  "feature_pocket",
  "feature_fillet",
  "feature_chamfer",
  "feature_shell",
  "feature_draft",
  "feature_rib",
  "feature_thread",
  "boolean_union",
  "boolean_intersect",
  "boolean_subtract",
  "pattern_linear",
  "pattern_circular",
  "pattern_mirror",
  "transform_move",
  "transform_rotate",
  "datum_plane",
  "datum_axis",
  "datum_point",
  "datum_coord_system",
  "assembly_insert",
  "assembly_mate_concentric",
  "assembly_mate_coincident",
  "assembly_mate_distance",
  "assembly_mate_angle",
  "assembly_mate_parallel",
  "import_step",
  "import_iges",
  "import_stl",
  "export_step",
  "export_iges",
  "export_stl",
  "export_dxf",
  "parameter_declare",
  "parameter_equation",
  "custom",
];

export interface InventorCADContext {
  /** "part" | "assembly" — drives which ComponentDefinition alias the preamble emits. */
  docKind?: "part" | "assembly";
  /** Document name for comments. */
  documentName?: string;
  /** Unit system override (Inventor document unit). */
  units?: "mm" | "in" | "cm";
}

export class InventorCADGeneratorAdapter extends UnifiedCADCodeGeneratorBase<InventorCADContext> {
  readonly cadSystem: CADSystemId = "inventor";
  readonly capabilities: CADCapabilityMatrix = {
    cadSystem: "inventor",
    supportedOps: new Set<CADOperationKind>(INVENTOR_SUPPORTED_OPS),
    nativeLengthUnit: "mm",
    nativeAngleUnit: "deg",
    requiresSubprocess: true,
    typicalLatencyMs: 800,
    limits: {
      maxLoftSections: 32,
      maxPatternCount: 1000,
      maxFilletRadiusMm: 5000,
      maxSketchEntities: 10000,
    },
  };

  /** Counter used to generate unique VB variable names across emitOp calls. */
  private counter = 0;

  protected preamble(ctx: InventorCADContext | undefined, em: CADEmitter): void {
    this.counter = 0;
    const docKind = ctx?.docKind ?? "part";
    em.require("Autodesk.Inventor");
    em.line("' =============================================================");
    em.line("' PRISM Inventor CAD iLogic script (U-CADC08)");
    em.line(`' Document kind : ${docKind}`);
    if (ctx?.documentName) em.line(`' Document name : ${ctx.documentName}`);
    if (ctx?.units) em.line(`' Units         : ${ctx.units}`);
    em.line("' =============================================================");
    em.line("Imports Autodesk.Inventor");
    em.line("");
    em.line("Public Class PRISMInventorCAD");
    em.line("    Public Sub Main()");
    em.line("        Dim invApp As Application = ThisApplication");
    em.line("        Dim tg As TransientGeometry = invApp.TransientGeometry");
    if (docKind === "assembly") {
      em.line("        Dim doc As AssemblyDocument = CType(invApp.ActiveDocument, AssemblyDocument)");
      em.line("        Dim assyCompDef As AssemblyComponentDefinition = doc.ComponentDefinition");
      em.line("        Dim compDef As ComponentDefinition = doc.ComponentDefinition");
    } else {
      em.line("        Dim doc As PartDocument = CType(invApp.ActiveDocument, PartDocument)");
      em.line("        Dim compDef As PartComponentDefinition = doc.ComponentDefinition");
    }
    em.line("");
    em.indent = "        ";
  }

  protected emitOp(
    op: CADOperation,
    _opIndex: number,
    _ctx: InventorCADContext | undefined,
    em: CADEmitter,
  ): void {
    const v = `p${this.counter++}`;
    const args = op.args;

    const writeFrag = (frag: InvFragment): void => {
      for (const ln of frag.lines) em.line(ln);
      for (const p of frag.parameters ?? []) em.parameter(p.name, p.value, p.unit, p.description);
      for (const w of frag.warnings ?? []) em.warn(w, "warn");
    };

    switch (op.kind) {
      case "sketch_create": {
        const plane = (args.plane as InvPlane | "face") ?? "xy";
        const name = (args.name as string) ?? `sk_${v}`;
        writeFrag(ilCreateSketch(v, plane, name, args.faceRef as string | undefined));
        break;
      }
      case "sketch_line":
        writeFrag(ilSketchLine(this.requireStr(op, "sketch"), this.num(args.x1), this.num(args.y1), this.num(args.x2), this.num(args.y2)));
        break;
      case "sketch_arc":
        writeFrag(
          ilSketchArc(
            this.requireStr(op, "sketch"),
            this.num(args.cx),
            this.num(args.cy),
            this.num(args.radius),
            this.num(args.startDeg ?? 0),
            this.num(args.endDeg ?? 90),
          ),
        );
        break;
      case "sketch_circle":
        writeFrag(ilSketchCircle(this.requireStr(op, "sketch"), this.num(args.cx), this.num(args.cy), this.num(args.radius)));
        break;
      case "sketch_rectangle":
        writeFrag(ilSketchRectangle(this.requireStr(op, "sketch"), this.num(args.x), this.num(args.y), this.num(args.width), this.num(args.height)));
        break;
      case "sketch_polygon":
        writeFrag(
          ilSketchPolygon(
            this.requireStr(op, "sketch"),
            this.num(args.cx),
            this.num(args.cy),
            this.num(args.sides ?? 6),
            this.num(args.radius),
            (args.inscribed as boolean | undefined) ?? true,
          ),
        );
        break;
      case "sketch_spline": {
        const pts = (args.points as ReadonlyArray<number> | undefined) ?? [];
        const coords: Array<[number, number]> = [];
        for (let i = 0; i + 1 < pts.length; i += 2) coords.push([pts[i]!, pts[i + 1]!]);
        writeFrag(ilSketchSpline(this.requireStr(op, "sketch"), coords));
        break;
      }
      case "sketch_ellipse":
        writeFrag(
          ilSketchEllipse(
            this.requireStr(op, "sketch"),
            this.num(args.cx),
            this.num(args.cy),
            this.num(args.majorX ?? 1),
            this.num(args.majorY ?? 0),
            this.num(args.minorRadius),
          ),
        );
        break;
      case "sketch_slot":
        writeFrag(
          ilSketchSlot(
            this.requireStr(op, "sketch"),
            this.num(args.x1),
            this.num(args.y1),
            this.num(args.x2),
            this.num(args.y2),
            this.num(args.width),
          ),
        );
        break;
      case "sketch_point":
        writeFrag(ilSketchPoint(this.requireStr(op, "sketch"), this.num(args.x), this.num(args.y)));
        break;
      case "sketch_constraint":
      case "sketch_dimension":
        em.line(`' ${op.kind}: ${JSON.stringify(args)} (declarative — Inventor resolves on Update)`);
        break;
      case "feature_extrude":
        writeFrag(
          ilExtrude(
            v,
            this.requireStr(op, "sketch"),
            (args.distance as InvLen) ?? 10,
            (args.operation as InvBooleanOp | undefined) ?? "join",
            {
              endCondition: args.endCondition as IlExtrudeOptions["endCondition"],
              direction: (args.direction as IlExtrudeOptions["direction"]) ?? "positive",
              distance2: args.distance2 as InvLen | undefined,
              taperAngle: args.taperAngle as InvAng | undefined,
              taperAngle2: args.taperAngle2 as InvAng | undefined,
              targetSurface: args.targetSurface as string | undefined,
              offsetFromSurface: args.offsetFromSurface as InvLen | undefined,
              thinFeature: args.thinFeature === true,
              thinThickness: args.thinThickness as InvLen | undefined,
              thinType: args.thinType as IlExtrudeOptions["thinType"],
              matchShape: args.matchShape === undefined ? undefined : args.matchShape === true,
            },
          ),
        );
        break;
      case "feature_revolve":
        writeFrag(
          ilRevolve(
            v,
            this.requireStr(op, "sketch"),
            this.requireStr(op, "axis"),
            (args.angle as InvAng | undefined) ?? 360,
            (args.operation as InvBooleanOp | undefined) ?? "join",
            {
              endCondition: args.endCondition as IlRevolveOptions["endCondition"],
              direction: args.direction as IlRevolveOptions["direction"],
              angle2: args.angle2 as InvAng | undefined,
              targetSurface: args.targetSurface as string | undefined,
              thinFeature: args.thinFeature === true,
              thinThickness: args.thinThickness as InvLen | undefined,
              thinType: args.thinType as IlRevolveOptions["thinType"],
            },
          ),
        );
        break;
      case "feature_loft":
        writeFrag(
          ilLoft(
            v,
            (args.profiles as ReadonlyArray<string> | undefined) ?? [],
            (args.operation as InvBooleanOp | undefined) ?? "join",
          ),
        );
        break;
      case "feature_sweep":
        writeFrag(
          ilSweep(
            v,
            this.requireStr(op, "profile"),
            this.requireStr(op, "path"),
            (args.operation as InvBooleanOp | undefined) ?? "join",
          ),
        );
        break;
      case "feature_hole":
        writeFrag(
          ilHole(
            v,
            this.requireStr(op, "face"),
            this.num(args.x),
            this.num(args.y),
            (args.cycle as InvHoleCycle | undefined) ?? "drilled",
            (args.diameter as InvLen) ?? 5,
            (args.depth as InvLen | "through") ?? "through",
            {
              peck: args.peck as boolean | undefined,
              tapSize: args.tapSize as string | undefined,
              counterboreDiameter: args.cbDiameter as InvLen | undefined,
              counterboreDepth: args.cbDepth as InvLen | undefined,
            },
          ),
        );
        break;
      case "feature_pocket":
        writeFrag(ilPocket(v, this.requireStr(op, "sketch"), (args.depth as InvLen) ?? 5));
        break;
      case "feature_fillet":
        writeFrag(
          ilFillet(
            v,
            (args.edges as ReadonlyArray<string> | undefined) ?? [],
            (args.radius as InvLen) ?? 1,
          ),
        );
        break;
      case "feature_chamfer":
        writeFrag(
          ilChamfer(
            v,
            (args.edges as ReadonlyArray<string> | undefined) ?? [],
            (args.distance as InvLen) ?? 1,
          ),
        );
        break;
      case "feature_shell":
        writeFrag(
          ilShell(
            v,
            (args.faces as ReadonlyArray<string> | undefined) ?? [],
            (args.thickness as InvLen) ?? 2,
          ),
        );
        break;
      case "feature_draft":
        writeFrag(
          ilDraft(
            v,
            (args.faces as ReadonlyArray<string> | undefined) ?? [],
            this.requireStr(op, "pullDirection"),
            (args.angle as InvAng) ?? 3,
          ),
        );
        break;
      case "feature_rib":
      case "feature_thread":
        em.line(`' ${op.kind}: ${JSON.stringify(args)} (Inventor has dedicated feature — stub emitted)`);
        em.warn(`${op.kind} emitted as stub; full template pending`, "info");
        break;
      case "boolean_union":
        writeFrag(ilBoolean(v, this.requireStr(op, "tool"), "union"));
        break;
      case "boolean_subtract":
        writeFrag(ilBoolean(v, this.requireStr(op, "tool"), "subtract"));
        break;
      case "boolean_intersect":
        writeFrag(ilBoolean(v, this.requireStr(op, "tool"), "intersect"));
        break;
      case "pattern_linear":
        writeFrag(
          ilPatternRectangular(
            v,
            (args.features as ReadonlyArray<string> | undefined) ?? [],
            this.requireStr(op, "dir1"),
            this.num(args.count1 ?? 2),
            (args.spacing1 as InvLen) ?? 10,
            args.dir2 as string | undefined,
            args.count2 !== undefined ? this.num(args.count2) : undefined,
            args.spacing2 as InvLen | undefined,
          ),
        );
        break;
      case "pattern_circular":
        writeFrag(
          ilPatternCircular(
            v,
            (args.features as ReadonlyArray<string> | undefined) ?? [],
            this.requireStr(op, "axis"),
            this.num(args.count ?? 4),
            (args.angle as InvAng | undefined) ?? 360,
          ),
        );
        break;
      case "pattern_mirror":
        writeFrag(
          ilMirror(
            v,
            (args.features as ReadonlyArray<string> | undefined) ?? [],
            this.requireStr(op, "mirrorPlane"),
          ),
        );
        break;
      case "transform_move":
        writeFrag(
          ilMove(
            v,
            this.requireStr(op, "body"),
            (args.dx as InvLen) ?? 0,
            (args.dy as InvLen) ?? 0,
            (args.dz as InvLen) ?? 0,
          ),
        );
        break;
      case "transform_rotate":
        writeFrag(
          ilRotate(
            v,
            this.requireStr(op, "body"),
            this.requireStr(op, "axis"),
            (args.angle as InvAng) ?? 90,
          ),
        );
        break;
      case "datum_plane":
        writeFrag(
          ilWorkPlane(v, (args.type as "offset" | "origin_xy" | "origin_xz" | "origin_yz" | "face_offset" | undefined) ?? "origin_xy", {
            offset: args.offset as InvLen | undefined,
            faceRef: args.faceRef as string | undefined,
            basePlane: args.basePlane as InvPlane | undefined,
          }),
        );
        break;
      case "datum_axis":
        writeFrag(ilWorkAxis(v, (args.axis as "x" | "y" | "z" | "line" | undefined) ?? "z", args.lineRef as string | undefined));
        break;
      case "datum_point":
        writeFrag(ilWorkPoint(v, (args.x as InvLen) ?? 0, (args.y as InvLen) ?? 0, (args.z as InvLen) ?? 0));
        break;
      case "datum_coord_system":
        em.line(`Dim ${v} As UserCoordinateSystem = compDef.UserCoordinateSystems.AddFixed( _`);
        em.line(`    tg.CreatePoint(${fmtLen((args.x as InvLen) ?? 0)}, ${fmtLen((args.y as InvLen) ?? 0)}, ${fmtLen((args.z as InvLen) ?? 0)}), _`);
        em.line(`    tg.CreateUnitVector(1, 0, 0), tg.CreateUnitVector(0, 1, 0), tg.CreateUnitVector(0, 0, 1))`);
        break;
      case "assembly_insert":
        em.line(`' Assembly insert: ${args.componentPath ?? "<path>"}`);
        em.line(`Dim ${v} As ComponentOccurrence = assyCompDef.Occurrences.Add("${args.componentPath ?? ""}", tg.CreateMatrix())`);
        break;
      case "assembly_mate_concentric":
        writeFrag(ilAssemblyMate(v, "mate", this.requireStr(op, "entity1"), this.requireStr(op, "entity2"), { offset: args.offset as InvLen | undefined }));
        break;
      case "assembly_mate_coincident":
        writeFrag(ilAssemblyMate(v, "flush", this.requireStr(op, "entity1"), this.requireStr(op, "entity2"), { offset: args.offset as InvLen | undefined }));
        break;
      case "assembly_mate_distance":
        writeFrag(ilAssemblyMate(v, "mate", this.requireStr(op, "entity1"), this.requireStr(op, "entity2"), { offset: (args.distance as InvLen) ?? 0 }));
        break;
      case "assembly_mate_angle":
        writeFrag(ilAssemblyMate(v, "angle", this.requireStr(op, "entity1"), this.requireStr(op, "entity2"), { angle: (args.angle as InvAng) ?? 0 }));
        break;
      case "assembly_mate_parallel":
        writeFrag(ilAssemblyMate(v, "parallel", this.requireStr(op, "entity1"), this.requireStr(op, "entity2")));
        break;
      case "import_step":
        writeFrag(ilImport(this.requireStr(op, "path"), "step"));
        break;
      case "import_iges":
        writeFrag(ilImport(this.requireStr(op, "path"), "iges"));
        break;
      case "import_stl":
        writeFrag(ilImport(this.requireStr(op, "path"), "stl"));
        break;
      case "export_step":
        writeFrag(ilExport(this.requireStr(op, "path"), "step"));
        break;
      case "export_iges":
        writeFrag(ilExport(this.requireStr(op, "path"), "iges"));
        break;
      case "export_stl":
        writeFrag(ilExport(this.requireStr(op, "path"), "stl"));
        break;
      case "export_dxf":
        writeFrag(ilExport(this.requireStr(op, "path"), "dxf"));
        break;
      case "parameter_declare":
        writeFrag(
          ilParameter(
            this.requireStr(op, "name"),
            (args.value as number | string) ?? 0,
            (args.unit as string | undefined) ?? "mm",
          ),
        );
        break;
      case "parameter_equation":
        writeFrag(ilEquation(this.requireStr(op, "name"), this.requireStr(op, "expression")));
        break;
      case "custom":
        em.block(String(args.body ?? "' no custom body"));
        break;
      default:
        em.line(`' Unhandled op ${op.kind}`);
        em.warn(`emitter missing for ${op.kind}`, "warn");
    }
  }

  protected epilogue(_ctx: InventorCADContext | undefined, em: CADEmitter): void {
    em.indent = "";
    em.line("        doc.Update()");
    em.line("    End Sub");
    em.line("End Class");
  }

  protected scriptFilename(ctx: InventorCADContext | undefined): string {
    const base = (ctx?.documentName ?? "prism_inventor_cad").replace(/\W+/g, "_");
    return `${base}.iLogicVb`;
  }

  protected async runScriptBody(_script: CADScript<string>): Promise<CADExecutionResult> {
    if (process.env.PRISM_CAD_MOCK === "1") {
      return {
        ok: true,
        durationMs: 1,
        metrics: {
          volumeMm3: 1000,
          boundingBoxMm: [10, 10, 10],
          faceCount: 6,
          edgeCount: 12,
          vertexCount: 8,
        },
      };
    }
    return {
      ok: false,
      error: "Inventor iLogic cannot run from Node.js; open script inside Autodesk Inventor",
      durationMs: 0,
    };
  }

  // ── helpers ──

  private num(v: unknown): number {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  private requireStr(op: CADOperation, key: string): string {
    const v = op.args[key];
    if (typeof v !== "string" || !v) {
      throw new Error(`op '${op.kind}' missing required string arg '${key}'`);
    }
    return v;
  }
}

export const inventorCADGeneratorAdapter = new InventorCADGeneratorAdapter();

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class InventorCAMCodeGeneratorEngineClass {
  /**
   * Generate iLogic automation script for InventorCAM/HSMWorks.
   *
   * @param operations  Array of operations to create
   * @param tools       Shared tool definitions
   * @param params      Generation parameters
   * @returns           Generated iLogic VB.NET script
   */
  generateILogicScript(
    operations: OperationSpec[],
    tools: ToolSpec[],
    params: Omit<GenerateParams, "script_type" | "operations" | "tools">,
  ): { script: string; description: string } {
    const defaults = params.defaults ?? {};
    const lines: string[] = [iLogicHeader(params.machine_name)];

    // Tool definitions
    tools.forEach((t, i) => lines.push(iLogicToolDef(t, i)));

    // Operations
    operations.forEach((op, i) => {
      lines.push(iLogicOperation(op, i, defaults));
    });

    // Footer with optional NC generation
    lines.push(iLogicFooter(
      Boolean(params.nc_output_path),
      params.post_processor,
      params.nc_output_path,
    ));

    return {
      script: lines.join("\n"),
      description: `iLogic script for ${operations.length} InventorCAM operation(s): ${operations.map(o => o.type).join(", ")}`,
    };
  }

  /**
   * Generate post-processor customization code (.cps modifications).
   *
   * @param machine   Target machine/controller name
   * @param options   Customization options
   * @returns         CPS modification code
   */
  generatePostCustomization(
    machine: string,
    options: {
      customWorkOffset?: boolean;
      safeRetractHeight?: number;
      toolPreload?: boolean;
      coolantDelay?: number;
    } = {},
  ): { code: string; description: string } {
    const code = generateCPSCustomization(machine, options);
    return {
      code,
      description: `Post-processor customization for ${machine} with ${Object.keys(options).length} options`,
    };
  }

  /**
   * Generate script from natural language description.
   *
   * @param description  Natural language request
   * @returns            Best-match template or generated scaffold
   */
  generateFromDescription(description: string): CodeGenerationResult {
    const lower = description.toLowerCase();
    const warnings: string[] = [];

    // Keyword matching
    const templateMatches: Array<[string[], string]> = [
      [["adaptive", "clearing", "rough", "hsm"], "adaptive_roughing_ilogic"],
      [["adaptive 3d", "3d rough", "stock aware"], "adaptive_3d_ilogic"],
      [["parallel", "finish", "3d finish"], "parallel_finishing_ilogic"],
      [["scallop", "constant scallop", "curvature"], "scallop_finishing_ilogic"],
      [["drill", "peck", "tap", "spot"], "drill_cycle_ilogic"],
      [["batch", "multiple", "all setups"], "batch_process_ilogic"],
      [["fanuc", "post", "customize"], "fanuc_post_custom"],
      [["haas", "post"], "haas_post_custom"],
    ];

    let matchedId: string | undefined;
    for (const [keywords, id] of templateMatches) {
      if (keywords.some(k => lower.includes(k))) {
        matchedId = id;
        break;
      }
    }

    if (matchedId && TEMPLATE_CODE[matchedId]) {
      const tmpl = TEMPLATES.find(t => t.id === matchedId)!;
      return {
        script_type: tmpl.script_type,
        code: TEMPLATE_CODE[matchedId],
        operations_count: 1,
        warnings,
        description: tmpl.description,
      };
    }

    // Fallback scaffold
    warnings.push("Could not match to specific template - returning generic iLogic scaffold");
    const scaffold = `' =============================================================
' InventorCAM iLogic Automation Scaffold
' Request: "${description}"
' Generated by PRISM InventorCAMCodeGeneratorEngine (E2401)
' =============================================================
Imports Autodesk.Inventor
Imports Autodesk.Inventor.CAM

Public Class CustomAutomation

    Public Sub Main()
        Dim invApp As Application = ThisApplication
        Dim camDoc As CAMDocument = invApp.ActiveDocument.ComponentDefinition.CAM

        ' TODO: Add your custom operations here
        ' Available operation types:
        '   Adaptive2d, Adaptive3d, Pocket2d, Contour2d
        '   Face, Slot, Drill, Bore, Thread
        '   Parallel, Scallop, Pencil, SteepAndShallow
        '   Horizontal, Contour3d, Radial, Spiral, Flow

        camDoc.Generate()
    End Sub

End Class
`;

    return {
      script_type: "ilogic_vb",
      code: scaffold,
      operations_count: 0,
      warnings,
      description: `Generic scaffold for: "${description}"`,
    };
  }

  /**
   * Get available templates, optionally filtered by category.
   *
   * @param category  Optional category filter
   * @returns         Array of template descriptors
   */
  getTemplates(category?: TemplateCategory): ScriptTemplate[] {
    if (!category) return TEMPLATES;
    return TEMPLATES.filter(t => t.category === category);
  }

  // ── U-CADC08: Pure CAD iLogic fragment API ───────────────────────────────
  //
  // These methods produce standalone iLogic VB.NET fragments that can be
  // pasted into generateILogicScript's TODO slot, emitted as quick-drop
  // snippets in tribal-knowledge overlays, or composed through the adapter.

  createSketch(plane: InvPlane | "face", name: string = "Sketch1", faceRef?: string): InvFragment {
    return ilCreateSketch("sk", plane, name, faceRef);
  }

  createSketchLine(sketchVar: string, x1: number, y1: number, x2: number, y2: number): InvFragment {
    return ilSketchLine(sketchVar, x1, y1, x2, y2);
  }

  createSketchArc(sketchVar: string, cx: number, cy: number, radius: number, startDeg: number, endDeg: number): InvFragment {
    return ilSketchArc(sketchVar, cx, cy, radius, startDeg, endDeg);
  }

  createSketchCircle(sketchVar: string, cx: number, cy: number, radius: number): InvFragment {
    return ilSketchCircle(sketchVar, cx, cy, radius);
  }

  createSketchRectangle(sketchVar: string, x: number, y: number, width: number, height: number): InvFragment {
    return ilSketchRectangle(sketchVar, x, y, width, height);
  }

  createSketchPolygon(sketchVar: string, cx: number, cy: number, sides: number, radius: number, inscribed: boolean = true): InvFragment {
    return ilSketchPolygon(sketchVar, cx, cy, sides, radius, inscribed);
  }

  createSketchSpline(sketchVar: string, pts: ReadonlyArray<readonly [number, number]>): InvFragment {
    return ilSketchSpline(sketchVar, pts);
  }

  createSketchEllipse(sketchVar: string, cx: number, cy: number, majorX: number, majorY: number, minorRadius: number): InvFragment {
    return ilSketchEllipse(sketchVar, cx, cy, majorX, majorY, minorRadius);
  }

  createSketchSlot(sketchVar: string, x1: number, y1: number, x2: number, y2: number, width: number): InvFragment {
    return ilSketchSlot(sketchVar, x1, y1, x2, y2, width);
  }

  createSketchPoint(sketchVar: string, x: number, y: number): InvFragment {
    return ilSketchPoint(sketchVar, x, y);
  }

  createExtrude(
    profileRef: string,
    distance: InvLen,
    options: { operation?: InvBooleanOp; direction?: "positive" | "negative" | "symmetric" } = {},
  ): InvFragment {
    return ilExtrude("feat", profileRef, distance, options.operation ?? "join", options.direction ?? "positive");
  }

  createRevolve(
    profileRef: string,
    axisRef: string,
    options: { angle?: InvAng; operation?: InvBooleanOp } = {},
  ): InvFragment {
    return ilRevolve("feat", profileRef, axisRef, options.angle ?? 360, options.operation ?? "join");
  }

  createLoft(profileRefs: ReadonlyArray<string>, operation: InvBooleanOp = "join"): InvFragment {
    return ilLoft("feat", profileRefs, operation);
  }

  createSweep(profileRef: string, pathRef: string, operation: InvBooleanOp = "join"): InvFragment {
    return ilSweep("feat", profileRef, pathRef, operation);
  }

  createHole(
    faceRef: string,
    centerX: number,
    centerY: number,
    options: {
      cycle?: InvHoleCycle;
      diameter?: InvLen;
      depth?: InvLen | "through";
      peck?: boolean;
      tapSize?: string;
      counterboreDiameter?: InvLen;
      counterboreDepth?: InvLen;
    } = {},
  ): InvFragment {
    return ilHole(
      "feat",
      faceRef,
      centerX,
      centerY,
      options.cycle ?? "drilled",
      options.diameter ?? 5,
      options.depth ?? "through",
      {
        peck: options.peck,
        tapSize: options.tapSize,
        counterboreDiameter: options.counterboreDiameter,
        counterboreDepth: options.counterboreDepth,
      },
    );
  }

  createPocket(profileRef: string, depth: InvLen): InvFragment {
    return ilPocket("feat", profileRef, depth);
  }

  createFillet(edgeRefs: ReadonlyArray<string>, radius: InvLen): InvFragment {
    return ilFillet("feat", edgeRefs, radius);
  }

  createChamfer(edgeRefs: ReadonlyArray<string>, distance: InvLen): InvFragment {
    return ilChamfer("feat", edgeRefs, distance);
  }

  createShell(faceRefs: ReadonlyArray<string>, thickness: InvLen): InvFragment {
    return ilShell("feat", faceRefs, thickness);
  }

  createDraft(faceRefs: ReadonlyArray<string>, pullDirectionRef: string, angleDeg: InvAng): InvFragment {
    return ilDraft("feat", faceRefs, pullDirectionRef, angleDeg);
  }

  createBoolean(toolBodyRef: string, op: "union" | "subtract" | "intersect"): InvFragment {
    return ilBoolean("feat", toolBodyRef, op);
  }

  createRectangularPattern(
    featureRefs: ReadonlyArray<string>,
    dir1Ref: string,
    count1: number,
    spacing1: InvLen,
    opts: { dir2?: string; count2?: number; spacing2?: InvLen } = {},
  ): InvFragment {
    return ilPatternRectangular("feat", featureRefs, dir1Ref, count1, spacing1, opts.dir2, opts.count2, opts.spacing2);
  }

  createCircularPattern(
    featureRefs: ReadonlyArray<string>,
    axisRef: string,
    count: number,
    angle: InvAng = 360,
  ): InvFragment {
    return ilPatternCircular("feat", featureRefs, axisRef, count, angle);
  }

  createMirror(featureRefs: ReadonlyArray<string>, mirrorPlaneRef: string): InvFragment {
    return ilMirror("feat", featureRefs, mirrorPlaneRef);
  }

  createMove(bodyRef: string, dx: InvLen, dy: InvLen, dz: InvLen): InvFragment {
    return ilMove("feat", bodyRef, dx, dy, dz);
  }

  createRotate(bodyRef: string, axisRef: string, angle: InvAng): InvFragment {
    return ilRotate("feat", bodyRef, axisRef, angle);
  }

  createWorkPlane(
    type: "offset" | "origin_xy" | "origin_xz" | "origin_yz" | "face_offset",
    opts: { offset?: InvLen; faceRef?: string; basePlane?: InvPlane } = {},
  ): InvFragment {
    return ilWorkPlane("wp", type, opts);
  }

  createWorkAxis(kind: "x" | "y" | "z" | "line", lineRef?: string): InvFragment {
    return ilWorkAxis("wa", kind, lineRef);
  }

  createWorkPoint(x: InvLen, y: InvLen, z: InvLen): InvFragment {
    return ilWorkPoint("wp", x, y, z);
  }

  createAssemblyMate(
    kind: InvAssemblyMateKind,
    entity1: string,
    entity2: string,
    options: { offset?: InvLen; angle?: InvAng; solution?: "flush" | "mate" } = {},
  ): InvFragment {
    return ilAssemblyMate("mc", kind, entity1, entity2, options);
  }

  createParameter(name: string, value: number | string, unit: string = "mm"): InvFragment {
    return ilParameter(name, value, unit);
  }

  createEquation(name: string, expression: string): InvFragment {
    return ilEquation(name, expression);
  }

  createImport(path: string, format: "step" | "iges" | "stl"): InvFragment {
    return ilImport(path, format);
  }

  createExport(path: string, format: "step" | "iges" | "stl" | "dxf"): InvFragment {
    return ilExport(path, format);
  }

  /** Access the ICADCodeGenerator adapter that plugs Inventor into the unified CAD layer. */
  get cadAdapter(): InventorCADGeneratorAdapter {
    return inventorCADGeneratorAdapter;
  }

  /**
   * High-level generation entry point.
   *
   * @param params  Full generation parameters
   * @returns       Generated code result
   */
  generate(params: GenerateParams): CodeGenerationResult {
    const ops = params.operations ?? [];
    const tools = params.tools ?? [];

    if (params.script_type === "cps_post") {
      const { code, description } = this.generatePostCustomization(
        params.machine_name ?? "Generic",
        {},
      );
      return {
        script_type: "cps_post",
        code,
        operations_count: 0,
        warnings: [],
        description,
      };
    }

    const { script, description } = this.generateILogicScript(ops, tools, {
      defaults: params.defaults,
      post_processor: params.post_processor,
      nc_output_path: params.nc_output_path,
      machine_name: params.machine_name,
      error_handling: params.error_handling,
    });

    return {
      script_type: "ilogic_vb",
      code: script,
      operations_count: ops.length,
      warnings: [],
      description,
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const inventorCAMCodeGeneratorEngine = new InventorCAMCodeGeneratorEngineClass();
