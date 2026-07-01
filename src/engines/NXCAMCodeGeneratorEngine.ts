/**
 * NXCAMCodeGeneratorEngine — Siemens NX CAM Automation Script Generator (E1119)
 *
 * Generates NXOpen API automation scripts (Python, C#, Java, VB.NET) for
 * Siemens NX CAM. Covers milling operations, tool assembly, IPW management,
 * Feature-Based Machining (FBM), NC output, and Machine Knowledge Editor (MKE).
 *
 * Methods:
 *   generatePython(operations, tools, params)   — NXOpen Python script
 *   generateCSharp(operations, tools, params)   — NXOpen C# code
 *   getTemplates(category?)                     — available script templates
 *   generateFromDescription(text)               — best-effort script from natural language
 *   generateMKERecipe(proven_params)            — Machine Knowledge Editor recipe
 *
 * @engine NXCAMCodeGeneratorEngine
 * @shortcode E1119
 * @dispatcher camDispatcher
 * @actions nx_code_generate, nx_code_templates
 * @milestone CAMX-MS5/U06
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type NXOpenLanguage = "python" | "csharp" | "java" | "vbnet";

export type NXOperationType =
  | "cavity_mill"
  | "adaptive_milling"
  | "zlevel_profile"
  | "fixed_contour"
  | "face_milling"
  | "planar_mill"
  | "contour_area"
  | "flowcut"
  | "surface_contouring"
  | "drill"
  | "spot_drill"
  | "tapping"
  | "boring"
  | "thread_milling"
  | "plunge_milling"
  | "turn_od"
  | "turn_id"
  | "turn_groove";

export type NXTemplateCategory =
  | "roughing"
  | "finishing"
  | "ipw"
  | "fbm"
  | "post_processing"
  | "tool_assembly"
  | "mke"
  | "utility";

export interface NXOperation {
  type: NXOperationType;
  name?: string;
  tool_ref?: string;
  geometry_group?: string;
  depth_mm?: number;
  stepdown_mm?: number;
  stepover_pct?: number;
  feed_mmpm?: number;
  speed_rpm?: number;
  coolant?: "flood" | "mist" | "air" | "through_tool" | "dry";
  use_ipw?: boolean;
  tolerance_mm?: number;
  stock_to_leave_mm?: number;
  cut_pattern?: "follow_part" | "follow_periphery" | "zig" | "zigzag" | "trochoidal" | "spiral";
  depth_per_cut_mm?: number;
  max_cut_depth_mm?: number;
}

export interface NXTool {
  ref: string;
  type: "end_mill" | "ball_mill" | "bull_nose" | "drill" | "tap" | "boring_bar" | "face_mill" | "thread_mill";
  diameter_mm: number;
  flutes?: number;
  corner_radius_mm?: number;
  length_mm?: number;
  holder?: string;
  material?: "carbide" | "hss" | "cermet" | "cbn" | "ceramic";
  coating?: "TiAlN" | "AlTiN" | "TiN" | "TiCN" | "uncoated";
}

export interface NXCodeGenParams {
  part_name?: string;
  setup_name?: string;
  post_processor?: string;
  output_file?: string;
  machine_name?: string;
  workpiece_ref?: string;
  coordinate_system?: string;
  journal_mode?: boolean;
  ipw_enabled?: boolean;
  fbm_enabled?: boolean;
  verify_before_post?: boolean;
  comment_level?: "none" | "minimal" | "full";
}

export interface NXGeneratedScript {
  language: NXOpenLanguage;
  script: string;
  description: string;
  operations_count: number;
  tools_count: number;
  has_ipw: boolean;
  estimated_lines: number;
  notes: string[];
}

export interface NXTemplate {
  id: string;
  name: string;
  category: NXTemplateCategory;
  language: NXOpenLanguage;
  description: string;
  operations: NXOperationType[];
  supports_ipw: boolean;
  supports_fbm: boolean;
  example_use_case: string;
}

export interface NXMKERecipe {
  recipe_name: string;
  operation_type: NXOperationType;
  xml_content: string;
  description: string;
  proven_conditions: {
    material?: string;
    machine?: string;
    tool_diameter_mm?: number;
  };
  notes: string[];
}

// ─── Template Database ────────────────────────────────────────────────────────

const TEMPLATE_DB: NXTemplate[] = [
  {
    id: "cavity_mill_roughing",
    name: "Cavity Mill Roughing",
    category: "roughing",
    language: "python",
    description: "Standard Cavity Mill roughing with follow-part pattern, IPW stock tracking",
    operations: ["cavity_mill"],
    supports_ipw: true,
    supports_fbm: false,
    example_use_case: "Rough out a complex pocket to 0.5 mm stock, tracking IPW for rest milling",
  },
  {
    id: "adaptive_ipw",
    name: "Adaptive Milling with IPW",
    category: "ipw",
    language: "python",
    description: "Adaptive (trochoidal) roughing with full In-Process Workpiece chain — blank → rough → semi",
    operations: ["adaptive_milling"],
    supports_ipw: true,
    supports_fbm: false,
    example_use_case: "High-speed adaptive roughing on hardened steel with auto stock-awareness",
  },
  {
    id: "fbm_auto_sequence",
    name: "FBM Auto-Recognize and Machine",
    category: "fbm",
    language: "python",
    description: "Feature-Based Machining: auto-recognise part features, auto-assign strategies, run full sequence",
    operations: ["drill", "cavity_mill", "contour_area"],
    supports_ipw: false,
    supports_fbm: true,
    example_use_case: "Prismatic part with holes, pockets and contours — zero manual programming",
  },
  {
    id: "batch_post",
    name: "Batch Post-Process Setup",
    category: "post_processing",
    language: "python",
    description: "Iterate all operations in a program group and post-process to NC files in one pass",
    operations: [],
    supports_ipw: false,
    supports_fbm: false,
    example_use_case: "Automate nightly batch post-processing for 50+ NC programs",
  },
  {
    id: "zlevel_finishing",
    name: "Z-Level Profile Finishing",
    category: "finishing",
    language: "python",
    description: "Z-Level (depth-first) finishing for steep walls and near-vertical surfaces",
    operations: ["zlevel_profile"],
    supports_ipw: true,
    supports_fbm: false,
    example_use_case: "Finish steep cavity walls to Ra 0.8 µm with 6 mm ball mill",
  },
  {
    id: "fixed_contour_blend",
    name: "Fixed Contour Blend Finishing",
    category: "finishing",
    language: "python",
    description: "Fixed Contour with Area Mill drive method for freeform surface finishing",
    operations: ["fixed_contour"],
    supports_ipw: true,
    supports_fbm: false,
    example_use_case: "Freeform blended surface finishing on mould core",
  },
  {
    id: "tool_assembly_setup",
    name: "Tool Assembly Configuration",
    category: "tool_assembly",
    language: "python",
    description: "Build tool assemblies (holder + shank + cutter) via NXOpen, verify reach and clearance",
    operations: [],
    supports_ipw: false,
    supports_fbm: false,
    example_use_case: "Programmatically set up 20 tool assemblies from a tool list CSV",
  },
  {
    id: "mke_recipe_gen",
    name: "MKE Recipe Generator",
    category: "mke",
    language: "python",
    description: "Create Machine Knowledge Editor template/recipe XML from proven cutting parameters",
    operations: [],
    supports_ipw: false,
    supports_fbm: false,
    example_use_case: "Capture optimised Cavity Mill parameters into reusable MKE template",
  },
  {
    id: "csharp_automation",
    name: "C# CAM Automation",
    category: "utility",
    language: "csharp",
    description: "NXOpen C# class wrapping full CAM session: open part, create ops, post, close",
    operations: ["cavity_mill", "zlevel_profile"],
    supports_ipw: false,
    supports_fbm: false,
    example_use_case: "Enterprise .NET application automating NX CAM via COM/NXOpen assembly",
  },
];

// ─── Python Script Builders ───────────────────────────────────────────────────

function buildPythonHeader(params: NXCodeGenParams): string {
  const partName = params.part_name ?? "MyPart";
  const commentFull = (params.comment_level ?? "full") === "full";
  const lines: string[] = [
    "import NXOpen",
    "import NXOpen.CAM",
    "import NXOpen.UF",
    "import sys",
    "",
    "def main():",
    `    session = NXOpen.Session.GetSession()`,
    `    workPart = session.Parts.Work`,
    "",
  ];
  if (commentFull) {
    lines.splice(0, 0,
      `# NXOpen Python Script — ${partName}`,
      `# Generated by PRISM NXCAMCodeGeneratorEngine (E1119)`,
      `# NX CAM 2306+ / NXOpen Python API`,
      "",
    );
  }
  return lines.join("\n");
}

function buildPythonCamSetup(params: NXCodeGenParams): string {
  const setup = params.setup_name ?? "PRISM_SETUP";
  return [
    `    # ── CAM Setup ──`,
    `    camSetup = workPart.CAMSetup`,
    `    if camSetup is None:`,
    `        camSetup = workPart.CAMSetups.CreateCAMSetup("cam_general")`,
    `    programGroup = camSetup.CAMOperationCollection.FindObject("${setup}")`,
    `    if programGroup is None:`,
    `        builder = camSetup.CAMOperationCollection.CreateProgramGroupBuilder(None)`,
    `        builder.Name = "${setup}"`,
    `        programGroup = builder.Commit()`,
    `        builder.Destroy()`,
    "",
  ].join("\n");
}

function buildPythonOperation(op: NXOperation, idx: number, commentFull: boolean): string {
  const opName = op.name ?? `${op.type.toUpperCase()}_${idx + 1}`;
  const nxType = NX_OPERATION_TYPE_MAP[op.type] ?? "mill_planar.CAVITY_MILL";
  const lines: string[] = [];

  if (commentFull) {
    lines.push(`    # ── Operation ${idx + 1}: ${opName} (${op.type}) ──`);
  }
  lines.push(
    `    opBuilder_${idx} = camSetup.CAMOperationCollection.CreateCavityMillingBuilder(None)`,
    `    opBuilder_${idx}.Name = "${opName}"`,
  );

  if (op.depth_mm !== undefined) {
    lines.push(`    opBuilder_${idx}.CuttingParameters.MaximumCut.Value = ${op.depth_mm}`);
  }
  if (op.stepdown_mm !== undefined) {
    lines.push(`    opBuilder_${idx}.CuttingDepths.DepthPerCut.Value = ${op.stepdown_mm}`);
  }
  if (op.feed_mmpm !== undefined) {
    lines.push(`    opBuilder_${idx}.Feeds.CutFeed.FeedRate.Value = ${op.feed_mmpm}`);
  }
  if (op.speed_rpm !== undefined) {
    lines.push(`    opBuilder_${idx}.Speeds.SpindleSpeed.Value = ${op.speed_rpm}`);
  }
  if (op.stock_to_leave_mm !== undefined) {
    lines.push(`    opBuilder_${idx}.StockToLeave.PartStock.Value = ${op.stock_to_leave_mm}`);
  }
  if (op.tolerance_mm !== undefined) {
    lines.push(`    opBuilder_${idx}.Tolerances.IntolValue = ${op.tolerance_mm}`);
  }
  if (op.use_ipw) {
    lines.push(`    opBuilder_${idx}.IPW.StockType = NXOpen.CAM.IPWStockType.From3dIPW`);
  }
  const coolantMap: Record<string, string> = {
    flood: "Flood", mist: "Mist", air: "AirBlast", through_tool: "ThroughTool", dry: "None",
  };
  if (op.coolant) {
    const cx = coolantMap[op.coolant] ?? "Flood";
    lines.push(`    opBuilder_${idx}.NonCuttingMoves.Engage.CoolantOption = NXOpen.CAM.CoolantOption.${cx}`);
  }
  if (op.cut_pattern) {
    const patMap: Record<string, string> = {
      follow_part: "FollowPart", follow_periphery: "FollowPeriphery",
      zig: "Zig", zigzag: "ZigZag", trochoidal: "Trochoidal", spiral: "Spiral",
    };
    lines.push(`    opBuilder_${idx}.CuttingParameters.CutPattern = NXOpen.CAM.CutPattern.${patMap[op.cut_pattern] ?? "FollowPart"}`);
  }
  lines.push(
    `    op_${idx} = opBuilder_${idx}.Commit()`,
    `    opBuilder_${idx}.Destroy()`,
    "",
  );
  return lines.join("\n");
}

const NX_OPERATION_TYPE_MAP: Record<NXOperationType, string> = {
  cavity_mill:        "mill_planar.CAVITY_MILL",
  adaptive_milling:   "mill_contour.ADAPTIVE_MILLING",
  zlevel_profile:     "mill_contour.ZLEVEL_PROFILE",
  fixed_contour:      "mill_contour.FIXED_CONTOUR",
  face_milling:       "mill_planar.FACE_MILLING",
  planar_mill:        "mill_planar.PLANAR_MILL",
  contour_area:       "mill_contour.CONTOUR_AREA",
  flowcut:            "mill_contour.FLOWCUT_SINGLE",
  surface_contouring: "mill_multi_axis.SURFACE_CONTOURING",
  drill:              "drill.DRILLING",
  spot_drill:         "drill.SPOT_DRILLING",
  tapping:            "drill.TAPPING",
  boring:             "drill.BORING",
  thread_milling:     "drill.THREAD_MILLING",
  plunge_milling:     "mill_planar.PLUNGE_MILLING",
  turn_od:            "turning.OD_ROUGH_TURN",
  turn_id:            "turning.ID_ROUGH_BORE",
  turn_groove:        "turning.OD_GROOVE",
};

function buildPythonIPW(params: NXCodeGenParams): string {
  if (!params.ipw_enabled) return "";
  return [
    "    # ── IPW (In-Process Workpiece) setup ──",
    "    ipwCollection = camSetup.IPWCollection",
    "    ipwBuilder = ipwCollection.Create3dIPWBuilder()",
    "    ipwBuilder.IPWType = NXOpen.CAM.IPW3dBuilder.IPWTypes.Facets",
    "    ipwBuilder.FacetTolerance = 0.05",
    "    ipw = ipwBuilder.Commit()",
    "    ipwBuilder.Destroy()",
    "",
  ].join("\n");
}

function buildPythonFBM(params: NXCodeGenParams): string {
  if (!params.fbm_enabled) return "";
  return [
    "    # ── Feature-Based Machining ──",
    "    fbmRecognition = camSetup.FBMCollection.CreateFBMBuilder()",
    "    fbmRecognition.RecognitionMode = NXOpen.CAM.FBMRecognitionMode.AutoRecognize",
    "    fbmRecognition.MachiningStrategy = NXOpen.CAM.FBMStrategy.Optimal",
    "    fbmRecognition.Commit()",
    "    fbmRecognition.Destroy()",
    "",
  ].join("\n");
}

function buildPythonPost(params: NXCodeGenParams): string {
  const postName = params.post_processor ?? "FANUC_30i";
  const outFile = params.output_file ?? "C:\\\\NC_OUTPUT\\\\output.nc";
  return [
    "    # ── Post-process all operations ──",
    "    postBuilder = session.CAMSession.CreatePostprocessingBuilder()",
    `    postBuilder.PostprocessorName = "${postName}"`,
    `    postBuilder.OutputFilePath = "${outFile}"`,
    "    postBuilder.OutputUnits = NXOpen.CAM.PostprocessingBuilder.OutputUnitsEnum.Metric",
    "    postBuilder.ListingOutput = NXOpen.CAM.PostprocessingBuilder.ListingOutputEnum.Full",
    "    postBuilder.Execute()",
    "    postBuilder.Destroy()",
    "",
  ].join("\n");
}

function buildPythonFooter(): string {
  return [
    "    session.ApplicationSwitchImmediate(\"UG_APP_MANUFACTURING\")",
    "    print(\"PRISM NXOpen script complete.\")",
    "",
    "if __name__ == '__main__':",
    "    main()",
  ].join("\n");
}

// ─── C# Script Builder ────────────────────────────────────────────────────────

function buildCSharpScript(
  operations: NXOperation[],
  tools: NXTool[],
  params: NXCodeGenParams,
): string {
  const partName = params.part_name ?? "MyPart";
  const postName = params.post_processor ?? "FANUC_30i";
  const outFile = params.output_file ?? "C:\\\\NC_OUTPUT\\\\output.nc";
  const commentFull = (params.comment_level ?? "full") === "full";

  const opBlocks = operations.map((op, i) => {
    const opName = op.name ?? `${op.type.toUpperCase()}_${i + 1}`;
    return [
      commentFull ? `            // Operation ${i + 1}: ${opName}` : "",
      `            var builder${i} = camSetup.CAMOperationCollection.CreateCavityMillingBuilder(null);`,
      `            builder${i}.Name = "${opName}";`,
      op.feed_mmpm !== undefined ? `            builder${i}.Feeds.CutFeed.FeedRate.Value = ${op.feed_mmpm};` : "",
      op.speed_rpm !== undefined ? `            builder${i}.Speeds.SpindleSpeed.Value = ${op.speed_rpm};` : "",
      op.stock_to_leave_mm !== undefined ? `            builder${i}.StockToLeave.PartStock.Value = ${op.stock_to_leave_mm};` : "",
      `            var op${i} = builder${i}.Commit();`,
      `            builder${i}.Destroy();`,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const toolBlocks = tools.map((t, i) => [
    commentFull ? `            // Tool ${i + 1}: ${t.ref} (${t.type} Ø${t.diameter_mm})` : "",
    `            var toolBuilder${i} = workPart.CAMSetup.CAMOperationCollection.CreateMillingToolBuilder(null);`,
    `            toolBuilder${i}.TlDiameter.Value = ${t.diameter_mm};`,
    t.flutes !== undefined ? `            toolBuilder${i}.TlNumberOfFlutes.Value = ${t.flutes};` : "",
    `            var tool${i} = toolBuilder${i}.Commit();`,
    `            toolBuilder${i}.Destroy();`,
  ].filter(Boolean).join("\n")).join("\n\n");

  return [
    commentFull ? `// NXOpen C# Script — ${partName}` : "",
    commentFull ? "// Generated by PRISM NXCAMCodeGeneratorEngine (E1119)" : "",
    commentFull ? "" : "",
    "using System;",
    "using NXOpen;",
    "using NXOpen.CAM;",
    "",
    `public class NXCAMAutomation`,
    "{",
    "    [STAThread]",
    "    static void Main(string[] args)",
    "    {",
    "        Session session = Session.GetSession();",
    "        Part workPart = session.Parts.Work;",
    "        CAMSetup camSetup = workPart.CAMSetup;",
    "",
    "        // ── Tool assemblies ──",
    toolBlocks,
    "",
    "        // ── Operations ──",
    opBlocks,
    "",
    "        // ── Post-process ──",
    `        PostprocessingBuilder postBuilder = session.CAMSession.CreatePostprocessingBuilder();`,
    `        postBuilder.PostprocessorName = "${postName}";`,
    `        postBuilder.OutputFilePath = "${outFile}";`,
    `        postBuilder.Execute();`,
    `        postBuilder.Destroy();`,
    "",
    `        Console.WriteLine("PRISM NXOpen C# script complete.");`,
    "    }",
    "}",
  ].filter(s => s !== undefined).join("\n");
}

// ─── MKE Recipe Builder ───────────────────────────────────────────────────────

function buildMKEXML(
  operationType: NXOperationType,
  recipeName: string,
  provenParams: Record<string, any>,
): string {
  const nxOpType = NX_OPERATION_TYPE_MAP[operationType] ?? "mill_planar.CAVITY_MILL";
  const paramEntries = Object.entries(provenParams)
    .map(([k, v]) => `    <param name="${k}" value="${v}" />`)
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- PRISM MKE Recipe — ${recipeName} -->`,
    `<!-- NX Machining Knowledge Editor template -->`,
    `<MKETemplate version="2306">`,
    `  <TemplateInfo>`,
    `    <Name>${recipeName}</Name>`,
    `    <OperationType>${nxOpType}</OperationType>`,
    `    <Description>Generated by PRISM E1119 — NXCAMCodeGeneratorEngine</Description>`,
    `  </TemplateInfo>`,
    `  <CuttingParameters>`,
    paramEntries,
    `  </CuttingParameters>`,
    `  <Applicability>`,
    `    <Material>${provenParams.material ?? "P-steel"}</Material>`,
    `    <Machine>${provenParams.machine ?? "generic_3axis"}</Machine>`,
    `  </Applicability>`,
    `</MKETemplate>`,
  ].join("\n");
}

// ─── NL Description Parser ────────────────────────────────────────────────────

function parseDescriptionToOps(text: string): NXOperation[] {
  const lower = text.toLowerCase();
  const ops: NXOperation[] = [];

  // Roughing signals
  if (/rough|cavity\s*mill|cavity mill/i.test(lower)) {
    ops.push({
      type: "cavity_mill",
      name: "ROUGH_CAVITY",
      cut_pattern: "follow_part",
      stock_to_leave_mm: 0.5,
      use_ipw: /ipw|in.process/i.test(lower),
    });
  }
  // Adaptive
  if (/adaptive|trochoidal|hss/i.test(lower)) {
    ops.push({
      type: "adaptive_milling",
      name: "ADAPTIVE_ROUGH",
      cut_pattern: "trochoidal",
      use_ipw: true,
    });
  }
  // Z-level
  if (/z.?level|zlevel|steep/i.test(lower)) {
    ops.push({
      type: "zlevel_profile",
      name: "ZLEVEL_FINISH",
      stock_to_leave_mm: 0,
    });
  }
  // Fixed contour / freeform
  if (/fixed.?contour|freeform|blend/i.test(lower)) {
    ops.push({
      type: "fixed_contour",
      name: "FIXED_CONTOUR_FINISH",
      stock_to_leave_mm: 0,
    });
  }
  // FBM
  if (/fbm|feature.?based|auto.?recogni/i.test(lower)) {
    ops.push({ type: "drill", name: "FBM_DRILL" });
    ops.push({ type: "cavity_mill", name: "FBM_MILL" });
  }
  // Drilling
  if (/drill|spot|hole/i.test(lower) && !/cavity/i.test(lower)) {
    ops.push({ type: "drill", name: "DRILL_HOLES" });
  }
  // Tapping
  if (/tap|thread/i.test(lower)) {
    ops.push({ type: "tapping", name: "TAP_THREADS" });
  }
  // Face milling
  if (/face.?mill|face mill|facing/i.test(lower)) {
    ops.push({ type: "face_milling", name: "FACE_MILL" });
  }

  // Default fallback
  if (ops.length === 0) {
    ops.push({ type: "cavity_mill", name: "ROUGH_CAVITY", cut_pattern: "follow_part" });
    ops.push({ type: "zlevel_profile", name: "ZLEVEL_FINISH" });
  }
  return ops;
}

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class NXCAMCodeGeneratorEngine {

  /**
   * Generate an NXOpen Python script from a list of operations, tools, and params.
   */
  generatePython(
    operations: NXOperation[],
    tools: NXTool[],
    params: NXCodeGenParams = {},
  ): NXGeneratedScript {
    const commentFull = (params.comment_level ?? "full") === "full";
    const sections: string[] = [];

    sections.push(buildPythonHeader(params));
    sections.push(buildPythonCamSetup(params));

    // Tool assembly section
    if (tools.length > 0) {
      if (commentFull) sections.push("    # ── Tool assemblies ──");
      tools.forEach((t, i) => {
        sections.push([
          `    toolBuilder_${i} = workPart.CAMSetup.CAMOperationCollection.CreateMillingToolBuilder(None)`,
          `    toolBuilder_${i}.TlDiameter.Value = ${t.diameter_mm}`,
          t.flutes !== undefined ? `    toolBuilder_${i}.TlNumberOfFlutes.Value = ${t.flutes}` : "",
          t.corner_radius_mm !== undefined ? `    toolBuilder_${i}.TlCornerRadius.Value = ${t.corner_radius_mm}` : "",
          `    tool_${i} = toolBuilder_${i}.Commit()  # ${t.ref} (${t.type})`,
          `    toolBuilder_${i}.Destroy()`,
        ].filter(Boolean).join("\n"));
      });
      sections.push("");
    }

    // IPW
    sections.push(buildPythonIPW(params));

    // FBM
    sections.push(buildPythonFBM(params));

    // Operations
    operations.forEach((op, i) => {
      sections.push(buildPythonOperation(op, i, commentFull));
    });

    // Post-processing
    if (params.post_processor || params.output_file) {
      sections.push(buildPythonPost(params));
    }

    sections.push(buildPythonFooter());

    const script = sections.filter(Boolean).join("\n");
    const lineCount = script.split("\n").length;
    const hasIPW = params.ipw_enabled === true || operations.some(o => o.use_ipw);

    const notes: string[] = [];
    if (params.journal_mode) {
      notes.push("Journal mode enabled — equivalent to NX Journal recording output");
    }
    if (hasIPW) {
      notes.push("IPW tracking enabled — ensure blank geometry is defined before running");
    }
    if (params.fbm_enabled) {
      notes.push("FBM enabled — part must have recognised feature types (NX 2306+)");
    }
    if (!params.post_processor) {
      notes.push("No post-processor specified — post-processing section omitted; add params.post_processor");
    }

    return {
      language: "python",
      script,
      description: `NXOpen Python: ${operations.map(o => o.type).join(", ")} — ${tools.length} tool(s)`,
      operations_count: operations.length,
      tools_count: tools.length,
      has_ipw: hasIPW,
      estimated_lines: lineCount,
      notes,
    };
  }

  /**
   * Generate NXOpen C# code.
   */
  generateCSharp(
    operations: NXOperation[],
    tools: NXTool[],
    params: NXCodeGenParams = {},
  ): NXGeneratedScript {
    const code = buildCSharpScript(operations, tools, params);
    const hasIPW = params.ipw_enabled === true || operations.some(o => o.use_ipw);

    return {
      language: "csharp",
      script: code,
      description: `NXOpen C#: ${operations.map(o => o.type).join(", ")} — ${tools.length} tool(s)`,
      operations_count: operations.length,
      tools_count: tools.length,
      has_ipw: hasIPW,
      estimated_lines: code.split("\n").length,
      notes: [
        "Requires NXOpen .NET assembly references: NXOpen.dll, NXOpenUI.dll",
        "Compile with: csc /reference:NXOpen.dll NXCAMAutomation.cs",
        "Run via NX external application or journal runner",
      ],
    };
  }

  /**
   * Return available script templates, optionally filtered by category.
   */
  getTemplates(category?: NXTemplateCategory): NXTemplate[] {
    if (!category) return TEMPLATE_DB;
    return TEMPLATE_DB.filter(t => t.category === category);
  }

  /**
   * Best-effort script generation from a natural language description.
   */
  generateFromDescription(text: string): NXGeneratedScript & { matched_intent: string } {
    const ops = parseDescriptionToOps(text);
    const hasIPW = /ipw|in.process/i.test(text);
    const hasFBM = /fbm|feature.?based/i.test(text);
    const params: NXCodeGenParams = {
      ipw_enabled: hasIPW,
      fbm_enabled: hasFBM,
      part_name: "AutoGenerated",
      comment_level: "full",
    };

    const result = this.generatePython(ops, [], params);
    const intentParts: string[] = ops.map(o => o.type);
    if (hasIPW) intentParts.push("IPW");
    if (hasFBM) intentParts.push("FBM");

    return {
      ...result,
      matched_intent: intentParts.join(" + "),
    };
  }

  /**
   * Generate a Machine Knowledge Editor (MKE) recipe XML from proven parameters.
   */
  generateMKERecipe(
    proven_params: {
      recipe_name: string;
      operation_type: NXOperationType;
      cutting_params: Record<string, any>;
      material?: string;
      machine?: string;
      tool_diameter_mm?: number;
    },
  ): NXMKERecipe {
    const allParams = {
      ...proven_params.cutting_params,
      material: proven_params.material,
      machine: proven_params.machine,
      tool_diameter_mm: proven_params.tool_diameter_mm,
    };

    const xml = buildMKEXML(
      proven_params.operation_type,
      proven_params.recipe_name,
      allParams,
    );

    const notes: string[] = [
      "Import via: NX → Manufacturing → Machining Knowledge Editor → Import Template",
      "Template applies to: " + (proven_params.material ?? "any material"),
      "MKE templates require NX CAM license (Manufacturing module)",
    ];

    return {
      recipe_name: proven_params.recipe_name,
      operation_type: proven_params.operation_type,
      xml_content: xml,
      description: `MKE recipe for ${proven_params.operation_type} on ${proven_params.material ?? "generic material"}`,
      proven_conditions: {
        material: proven_params.material,
        machine: proven_params.machine,
        tool_diameter_mm: proven_params.tool_diameter_mm,
      },
      notes,
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const nxCAMCodeGeneratorEngine = new NXCAMCodeGeneratorEngine();
