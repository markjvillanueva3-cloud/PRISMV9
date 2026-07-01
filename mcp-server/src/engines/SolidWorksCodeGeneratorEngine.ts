/**
 * SolidWorksCodeGeneratorEngine — U-CADC10 (PHASE-3)
 *
 * SolidWorks VBA macro code generator extending UnifiedCADCodeGeneratorBase.
 * Emits VBA code that executes via SolidWorks' built-in macro runtime or
 * the SolidWorksBridge.exe COM automation host.
 *
 * Design:
 *   - Full ICADCodeGenerator contract with solidworks CADSystemId
 *   - Emits standard VBA using SldWorks API (swApp, Part, ModelDoc2, etc.)
 *   - Capability matrix includes sketch + feature + boolean operations
 *   - Injectable execution path (mock mode for CI, real COM in production)
 *
 * SolidWorks API references:
 *   - SOLIDWORKS 2024 API Help: https://help.solidworks.com/api/
 *   - swModel methods: InsertSketch, SketchLine, FeatureExtrusion, etc.
 *
 * @module engines/SolidWorksCodeGeneratorEngine
 * @milestone CAD-COMPLETE-MS0 PHASE-3
 */

import {
  UnifiedCADCodeGeneratorBase,
  type CADEmitter,
} from "./UnifiedCADCodeGeneratorBase.js";
import type {
  CADCapabilityMatrix,
  CADOperation,
  CADOperationKind,
  CADExecutionResult,
  CADScript,
  CADSystemId,
} from "../interfaces/ICADCodeGenerator.js";
import { log } from "../utils/Logger.js";

// ── SolidWorks-specific types ─────────────────────────────────────────────────

export interface SolidWorksGenerationContext {
  partName: string;
  units: "mm" | "in";
  templatePath?: string;
  outputDir?: string;
}

// ── Supported operations list ────────────────────────────────────────────────

const SOLIDWORKS_SUPPORTED_OPS: ReadonlyArray<CADOperationKind> = [
  // Sketch
  "sketch_create",
  "sketch_close",
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
  // Feature (solid)
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
  // Surface
  "surface_ruled",
  "surface_loft",
  "surface_sweep",
  "surface_fill",
  "surface_offset",
  "surface_trim",
  // Boolean
  "boolean_union",
  "boolean_intersect",
  "boolean_subtract",
  // Transform
  "transform_move",
  "transform_rotate",
  "transform_mirror",
  "transform_pattern_linear",
  "transform_pattern_circular",
  "transform_scale",
  // Assembly
  "assembly_insert_component",
  "assembly_mate",
  "assembly_pattern",
  // Drawing
  "drawing_view",
  "drawing_dimension",
  "drawing_annotation",
  // Export
  "export_step",
  "export_stl",
  "export_pdf",
  "export_dxf",
  // Import
  "import_step",
  "import_iges",
  "import_dxf",
];

// ── Capability matrix with operation details ─────────────────────────────────

const SOLIDWORKS_CAPABILITY_DETAILS: Record<string, { supported: boolean; notes: string }> = {
  sketch_create: { supported: true, notes: "InsertSketch2D on selected face" },
  sketch_close: { supported: true, notes: "InsertSketch(false)" },
  sketch_line: { supported: true, notes: "SketchLine via CreateLine2" },
  sketch_arc: { supported: true, notes: "CreateArc via sketch API" },
  sketch_circle: { supported: true, notes: "SketchCircle via CreateCircle" },
  sketch_rectangle: { supported: true, notes: "SketchRectangle corner-to-corner" },
  sketch_polygon: { supported: true, notes: "SketchPolygon n-sided" },
  sketch_spline: { supported: true, notes: "CreateSpline via points array" },
  sketch_ellipse: { supported: true, notes: "CreateEllipse2" },
  sketch_slot: { supported: true, notes: "Composite: lines + arcs" },
  sketch_point: { supported: true, notes: "SketchPoint" },
  sketch_constraint: { supported: true, notes: "AddConstraint2" },
  sketch_dimension: { supported: true, notes: "AddDimension2" },
  feature_extrude: { supported: true, notes: "FeatureExtrusion2 / Boss-Extrude" },
  feature_revolve: { supported: true, notes: "FeatureRevolve2" },
  feature_loft: { supported: true, notes: "InsertProtrusionBlend2" },
  feature_sweep: { supported: true, notes: "InsertProtrusionSwept2" },
  feature_hole: { supported: true, notes: "HoleWizard API" },
  feature_pocket: { supported: true, notes: "FeatureCut3" },
  feature_fillet: { supported: true, notes: "FeatureFillet3" },
  feature_chamfer: { supported: true, notes: "InsertFeatureChamfer" },
  feature_shell: { supported: true, notes: "InsertFeatureShell" },
  feature_draft: { supported: true, notes: "InsertFeatureDraft" },
  feature_rib: { supported: true, notes: "InsertRib" },
  feature_thread: { supported: true, notes: "InsertCosmeticThread or Hole wizard" },
  surface_ruled: { supported: true, notes: "InsertSurfaceRuled" },
  surface_loft: { supported: true, notes: "InsertLoftSurface" },
  surface_sweep: { supported: true, notes: "InsertSurfaceSwept" },
  surface_fill: { supported: true, notes: "InsertSurfaceFill" },
  surface_offset: { supported: true, notes: "InsertSurfaceOffset" },
  surface_trim: { supported: true, notes: "TrimSurface2" },
  boolean_union: { supported: true, notes: "Combine features with Add option" },
  boolean_intersect: { supported: true, notes: "Combine features with Common option" },
  boolean_subtract: { supported: true, notes: "Combine features with Subtract option" },
  transform_move: { supported: true, notes: "MoveBody" },
  transform_rotate: { supported: true, notes: "MoveBody with rotation" },
  transform_mirror: { supported: true, notes: "InsertMirrorFeature" },
  transform_pattern_linear: { supported: true, notes: "LinearPatternFeature" },
  transform_pattern_circular: { supported: true, notes: "CircularPatternFeature" },
  transform_scale: { supported: true, notes: "Scale feature" },
  assembly_insert_component: { supported: true, notes: "AddComponent5" },
  assembly_mate: { supported: true, notes: "AddMate3" },
  assembly_pattern: { supported: true, notes: "ComponentPattern" },
  drawing_view: { supported: true, notes: "CreateViewFromModel" },
  drawing_dimension: { supported: true, notes: "AddDimension2 in drawing" },
  drawing_annotation: { supported: true, notes: "InsertNote" },
  export_step: { supported: true, notes: "SaveAs STEP AP214" },
  export_stl: { supported: true, notes: "SaveAs STL" },
  export_pdf: { supported: true, notes: "SaveAs PDF (drawings)" },
  export_dxf: { supported: true, notes: "SaveAs DXF" },
  import_step: { supported: true, notes: "OpenDoc STEP file" },
  import_iges: { supported: true, notes: "OpenDoc IGES file" },
  import_dxf: { supported: true, notes: "OpenDoc DXF file" },
};

// ── VBA code templates ────────────────────────────────────────────────────────

const VBA_HEADER = `' ═══════════════════════════════════════════════════════════════════════════════
' PRISM SolidWorks VBA Script — Auto-generated
' Generated by: SolidWorksCodeGeneratorEngine (U-CADC10)
' ═══════════════════════════════════════════════════════════════════════════════
Option Explicit

Dim swApp As SldWorks.SldWorks
Dim swModel As SldWorks.ModelDoc2
Dim swPart As SldWorks.PartDoc
Dim swSketchMgr As SldWorks.SketchManager
Dim swFeatureMgr As SldWorks.FeatureManager
Dim swSelMgr As SldWorks.SelectionMgr
Dim boolStatus As Boolean
Dim longStatus As Long
Dim longWarnings As Long

`;

const VBA_MAIN_START = `
Sub main()
    Set swApp = Application.SldWorks

    ' Create new part document
    Set swModel = swApp.NewDocument("${process.env.SW_TEMPLATE || "C:\\ProgramData\\SolidWorks\\SOLIDWORKS 2024\\templates\\Part.prtdot"}", 0, 0, 0)
    Set swPart = swModel
    Set swSketchMgr = swModel.SketchManager
    Set swFeatureMgr = swModel.FeatureManager
    Set swSelMgr = swModel.SelectionManager

    ' Set units to millimeters
    swModel.Extension.SetUserPreferenceInteger swUserPreferenceIntegerValue_e.swUnitsLinear, 0, swLengthUnit_e.swMM

    ' ─── BEGIN OPERATIONS ───────────────────────────────────────────────────────
`;

const VBA_MAIN_END = `
    ' ─── END OPERATIONS ─────────────────────────────────────────────────────────

    ' Rebuild model
    swModel.ForceRebuild3 False

    ' Zoom to fit
    swModel.ViewZoomtofit2

    Debug.Print "PRISM script complete."
End Sub
`;

// ── Engine implementation ─────────────────────────────────────────────────────

export class SolidWorksCodeGeneratorEngine extends UnifiedCADCodeGeneratorBase<SolidWorksGenerationContext> {
  readonly cadSystem: CADSystemId = "solidworks";
  readonly capabilities: CADCapabilityMatrix = {
    cadSystem: "solidworks",
    ...SOLIDWORKS_CAPABILITY_DETAILS,
    supportedOps: new Set<CADOperationKind>(SOLIDWORKS_SUPPORTED_OPS),
    nativeLengthUnit: "m",
    nativeAngleUnit: "deg",
    requiresSubprocess: false,
    typicalLatencyMs: 500,
    limits: {
      maxLoftProfiles: 64,
      maxPatternCount: 1000,
      maxFilletRadiusMm: 50_000,
    },
  };

  constructor() {
    super();
  }

  protected preamble(
    ctx: SolidWorksGenerationContext | undefined,
    em: CADEmitter,
  ): void {
    const partName = ctx?.partName ?? "PRISM_Part";
    em.line("' ═══════════════════════════════════════════════════════════════════════════════");
    em.line("' PRISM SolidWorks VBA Script — Auto-generated");
    em.line(`' Part: ${partName}`);
    em.line("' Generated by: SolidWorksCodeGeneratorEngine (U-CADC10)");
    em.line("' ═══════════════════════════════════════════════════════════════════════════════");
    em.line("Option Explicit");
    em.line("");
    em.line("Dim swApp As SldWorks.SldWorks");
    em.line("Dim swModel As SldWorks.ModelDoc2");
    em.line("Dim swPart As SldWorks.PartDoc");
    em.line("Dim swSketchMgr As SldWorks.SketchManager");
    em.line("Dim swFeatureMgr As SldWorks.FeatureManager");
    em.line("Dim swSelMgr As SldWorks.SelectionMgr");
    em.line("Dim boolStatus As Boolean");
    em.line("Dim longStatus As Long");
    em.line("Dim longWarnings As Long");
    em.line("");
    em.line("Sub main()");
    em.line("    Set swApp = Application.SldWorks");
    em.line("");
    em.line("    ' Create new part document");
    const templatePath = ctx?.templatePath ?? "C:\\ProgramData\\SolidWorks\\SOLIDWORKS 2024\\templates\\Part.prtdot";
    em.line(`    Set swModel = swApp.NewDocument("${templatePath}", 0, 0, 0)`);
    em.line("    Set swPart = swModel");
    em.line("    Set swSketchMgr = swModel.SketchManager");
    em.line("    Set swFeatureMgr = swModel.FeatureManager");
    em.line("    Set swSelMgr = swModel.SelectionManager");
    em.line("");
    const unitLine = ctx?.units === "in"
      ? "    swModel.Extension.SetUserPreferenceInteger swUserPreferenceIntegerValue_e.swUnitsLinear, 0, swLengthUnit_e.swINCHES"
      : "    swModel.Extension.SetUserPreferenceInteger swUserPreferenceIntegerValue_e.swUnitsLinear, 0, swLengthUnit_e.swMM";
    em.line("    ' Set units");
    em.line(unitLine);
    em.line("");
    em.line("    ' ─── BEGIN OPERATIONS ───────────────────────────────────────────────────────");
  }

  protected epilogue(
    _ctx: SolidWorksGenerationContext | undefined,
    em: CADEmitter,
  ): void {
    em.line("    ' ─── END OPERATIONS ─────────────────────────────────────────────────────────");
    em.line("");
    em.line("    ' Rebuild model");
    em.line("    swModel.ForceRebuild3 False");
    em.line("");
    em.line("    ' Zoom to fit");
    em.line("    swModel.ViewZoomtofit2");
    em.line("");
    em.line("    Debug.Print \"PRISM script complete.\"");
    em.line("End Sub");
  }

  protected scriptFilename(ctx: SolidWorksGenerationContext | undefined): string {
    return `${ctx?.partName ?? "prism_part"}.bas`;
  }

  protected emitOp(
    op: CADOperation,
    _opIndex: number,
    _ctx: SolidWorksGenerationContext | undefined,
    em: CADEmitter,
  ): void {
    const kind = op.kind;

    switch (kind) {
      // ── Sketch operations ───────────────────────────────────────────────────
      case "sketch_create":
        this.emitSketchCreate(op, em);
        break;
      case "sketch_close":
        em.line("swSketchMgr.InsertSketch True");
        break;
      case "sketch_line":
        this.emitSketchLine(op, em);
        break;
      case "sketch_arc":
        this.emitSketchArc(op, em);
        break;
      case "sketch_circle":
        this.emitSketchCircle(op, em);
        break;
      case "sketch_rectangle":
        this.emitSketchRectangle(op, em);
        break;
      case "sketch_polygon":
        this.emitSketchPolygon(op, em);
        break;
      case "sketch_point":
        this.emitSketchPoint(op, em);
        break;
      case "sketch_spline":
        this.emitSketchSpline(op, em);
        break;
      case "sketch_ellipse":
        this.emitSketchEllipse(op, em);
        break;
      case "sketch_slot":
        this.emitSketchSlot(op, em);
        break;
      case "sketch_constraint":
        this.emitSketchConstraint(op, em);
        break;
      case "sketch_dimension":
        this.emitSketchDimension(op, em);
        break;

      // ── Feature operations ──────────────────────────────────────────────────
      case "feature_extrude":
        this.emitFeatureExtrude(op, em);
        break;
      case "feature_revolve":
        this.emitFeatureRevolve(op, em);
        break;
      case "feature_loft":
        this.emitFeatureLoft(op, em);
        break;
      case "feature_sweep":
        this.emitFeatureSweep(op, em);
        break;
      case "feature_hole":
        this.emitFeatureHole(op, em);
        break;
      case "feature_pocket":
        this.emitFeaturePocket(op, em);
        break;
      case "feature_fillet":
        this.emitFeatureFillet(op, em);
        break;
      case "feature_chamfer":
        this.emitFeatureChamfer(op, em);
        break;
      case "feature_shell":
        this.emitFeatureShell(op, em);
        break;
      case "feature_draft":
        this.emitFeatureDraft(op, em);
        break;
      case "feature_rib":
        this.emitFeatureRib(op, em);
        break;
      case "feature_thread":
        this.emitFeatureThread(op, em);
        break;

      // ── Surface operations ──────────────────────────────────────────────────
      case "surface_ruled":
        this.emitSurfaceRuled(op, em);
        break;
      case "surface_loft":
        this.emitSurfaceLoft(op, em);
        break;
      case "surface_sweep":
        this.emitSurfaceSweep(op, em);
        break;
      case "surface_fill":
        this.emitSurfaceFill(op, em);
        break;
      case "surface_offset":
        this.emitSurfaceOffset(op, em);
        break;
      case "surface_trim":
        this.emitSurfaceTrim(op, em);
        break;

      // ── Boolean operations ──────────────────────────────────────────────────
      case "boolean_union":
      case "boolean_intersect":
      case "boolean_subtract":
        this.emitBoolean(op, em, kind);
        break;

      // ── Transform operations ────────────────────────────────────────────────
      case "transform_move":
        this.emitTransformMove(op, em);
        break;
      case "transform_rotate":
        this.emitTransformRotate(op, em);
        break;
      case "transform_mirror":
        this.emitTransformMirror(op, em);
        break;
      case "transform_pattern_linear":
        this.emitPatternLinear(op, em);
        break;
      case "transform_pattern_circular":
        this.emitPatternCircular(op, em);
        break;
      case "transform_scale":
        this.emitTransformScale(op, em);
        break;

      // ── Assembly operations ─────────────────────────────────────────────────
      case "assembly_insert_component":
        this.emitAssemblyInsertComponent(op, em);
        break;
      case "assembly_mate":
        this.emitAssemblyMate(op, em);
        break;
      case "assembly_pattern":
        this.emitAssemblyPattern(op, em);
        break;

      // ── Drawing operations ──────────────────────────────────────────────────
      case "drawing_view":
        this.emitDrawingView(op, em);
        break;
      case "drawing_dimension":
        this.emitDrawingDimension(op, em);
        break;
      case "drawing_annotation":
        this.emitDrawingAnnotation(op, em);
        break;

      // ── Export operations ───────────────────────────────────────────────────
      case "export_step":
        this.emitExportStep(op, em);
        break;
      case "export_stl":
        this.emitExportStl(op, em);
        break;
      case "export_pdf":
        this.emitExportPdf(op, em);
        break;
      case "export_dxf":
        this.emitExportDxf(op, em);
        break;

      // ── Import operations ───────────────────────────────────────────────────
      case "import_step":
        this.emitImportStep(op, em);
        break;
      case "import_iges":
        this.emitImportIges(op, em);
        break;
      case "import_dxf":
        this.emitImportDxf(op, em);
        break;

      default:
        em.warn(`Operation '${kind}' not yet implemented for SolidWorks`);
        em.line(`' TODO: Implement ${kind}`);
    }
  }

  // ── Sketch emitters ─────────────────────────────────────────────────────────

  private emitSketchCreate(op: CADOperation, em: CADEmitter): void {
    const plane = (op.params as any).plane ?? "Front";
    const planeMap: Record<string, string> = {
      Front: "Front Plane",
      Top: "Top Plane",
      Right: "Right Plane",
      XY: "Front Plane",
      XZ: "Top Plane",
      YZ: "Right Plane",
    };
    const swPlane = planeMap[plane] ?? "Front Plane";
    em.line(`boolStatus = swModel.Extension.SelectByID2("${swPlane}", "PLANE", 0, 0, 0, False, 0, Nothing, 0)`);
    em.line("swSketchMgr.InsertSketch True");
    em.parameter("sketch_plane", swPlane, "", `Sketch plane for op #${op.opIndex ?? "?"}`);
  }

  private emitSketchLine(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const x1 = p.x1 ?? p.startX ?? 0;
    const y1 = p.y1 ?? p.startY ?? 0;
    const x2 = p.x2 ?? p.endX ?? 10;
    const y2 = p.y2 ?? p.endY ?? 0;
    em.line(`Set swSketchSeg = swSketchMgr.CreateLine(${x1 / 1000}, ${y1 / 1000}, 0, ${x2 / 1000}, ${y2 / 1000}, 0)`);
    em.parameter("line_start", `${x1},${y1}`, "mm", "Line start point");
    em.parameter("line_end", `${x2},${y2}`, "mm", "Line end point");
  }

  private emitSketchArc(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const cx = (p.centerX ?? 0) / 1000;
    const cy = (p.centerY ?? 0) / 1000;
    const r = (p.radius ?? 5) / 1000;
    const startAngle = (p.startAngle ?? 0) * (Math.PI / 180);
    const endAngle = (p.endAngle ?? 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    em.line(`Set swSketchSeg = swSketchMgr.CreateArc(${cx}, ${cy}, 0, ${x1}, ${y1}, 0, ${x2}, ${y2}, 0, 1)`);
    em.parameter("arc_center", `${cx * 1000},${cy * 1000}`, "mm", "Arc center");
  }

  private emitSketchCircle(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const cx = (p.centerX ?? p.x ?? 0) / 1000;
    const cy = (p.centerY ?? p.y ?? 0) / 1000;
    const r = (p.radius ?? (p.diameter != null ? p.diameter / 2 : 5)) / 1000;
    em.line(`Set swSketchSeg = swSketchMgr.CreateCircle(${cx}, ${cy}, 0, ${cx + r}, ${cy}, 0)`);
    em.parameter("circle_radius", r * 1000, "mm", "Circle radius");
  }

  private emitSketchRectangle(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const x1 = (p.x1 ?? p.x ?? 0) / 1000;
    const y1 = (p.y1 ?? p.y ?? 0) / 1000;
    const x2 = (p.x2 ?? (p.x ?? 0) + (p.width ?? 10)) / 1000;
    const y2 = (p.y2 ?? (p.y ?? 0) + (p.height ?? 10)) / 1000;
    em.line(`swSketchMgr.CreateCornerRectangle ${x1}, ${y1}, 0, ${x2}, ${y2}, 0`);
    em.parameter("rect_width", (x2 - x1) * 1000, "mm", "Rectangle width");
    em.parameter("rect_height", (y2 - y1) * 1000, "mm", "Rectangle height");
  }

  private emitSketchPolygon(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const cx = (p.centerX ?? 0) / 1000;
    const cy = (p.centerY ?? 0) / 1000;
    const r = (p.radius ?? p.circumradius ?? 5) / 1000;
    const sides = p.sides ?? 6;
    em.line(`swSketchMgr.CreatePolygon ${cx}, ${cy}, 0, ${cx + r}, ${cy}, 0, ${sides}, True`);
    em.parameter("polygon_sides", sides, "", "Number of sides");
  }

  private emitSketchPoint(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const x = (p.x ?? 0) / 1000;
    const y = (p.y ?? 0) / 1000;
    em.line(`Set swSketchPt = swSketchMgr.CreatePoint(${x}, ${y}, 0)`);
  }

  private emitSketchSpline(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const points = p.points ?? [[0, 0], [5, 5], [10, 0]];
    em.line("Dim splinePts() As Double");
    em.line(`ReDim splinePts(0 To ${points.length * 3 - 1})`);
    points.forEach((pt: number[], i: number) => {
      em.line(`splinePts(${i * 3}) = ${(pt[0] ?? 0) / 1000}`);
      em.line(`splinePts(${i * 3 + 1}) = ${(pt[1] ?? 0) / 1000}`);
      em.line(`splinePts(${i * 3 + 2}) = 0`);
    });
    em.line(`Set swSketchSeg = swSketchMgr.CreateSpline((splinePts))`);
  }

  private emitSketchConstraint(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const constraintType = p.type ?? "Coincident";
    em.line(`' Add constraint: ${constraintType}`);
    em.line(`swModel.SketchAddConstraints "${constraintType}"`);
  }

  private emitSketchDimension(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const value = (p.value ?? 10) / 1000;
    const x = (p.x ?? 5) / 1000;
    const y = (p.y ?? 5) / 1000;
    em.line(`Set swDisplayDim = swModel.AddDimension2(${x}, ${y}, 0)`);
    if (p.value !== undefined) {
      em.line(`swDisplayDim.SystemValue = ${value}`);
    }
    em.parameter("dimension_value", p.value ?? 10, "mm", "Sketch dimension");
  }

  // ── Feature emitters ────────────────────────────────────────────────────────

  private emitFeatureExtrude(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const depth = (p.depth ?? p.height ?? 10) / 1000;
    const direction = p.direction ?? "add";
    const draftAngle = p.draftAngle ?? 0;
    const flipDraft = p.flipDraft ? "True" : "False";

    em.line("' Close sketch before extrude");
    em.line("swSketchMgr.InsertSketch True");
    em.line();

    if (direction === "cut" || direction === "subtract") {
      em.line(`Set swFeat = swFeatureMgr.FeatureCut3(True, False, False, 0, 0, ${depth}, ${depth}, False, False, False, False, ${draftAngle * Math.PI / 180}, ${draftAngle * Math.PI / 180}, False, False, False, False, False, True, True, True, True, False, 0, 0, False)`);
    } else {
      em.line(`Set swFeat = swFeatureMgr.FeatureExtrusion2(True, False, False, 0, 0, ${depth}, ${depth}, False, False, False, False, ${draftAngle * Math.PI / 180}, ${draftAngle * Math.PI / 180}, False, False, False, False, True, True, True, 0, 0, False)`);
    }
    em.parameter("extrude_depth", p.depth ?? p.height ?? 10, "mm", "Extrusion depth");
  }

  private emitFeatureRevolve(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const angle = (p.angle ?? 360) * (Math.PI / 180);
    const direction = p.direction ?? "add";

    em.line("swSketchMgr.InsertSketch True");
    em.line("' Select axis for revolve");
    em.line(`boolStatus = swModel.Extension.SelectByID2("Line1", "SKETCHSEGMENT", 0, 0, 0, True, 4, Nothing, 0)`);

    if (direction === "cut") {
      em.line(`Set swFeat = swFeatureMgr.FeatureRevolve2(True, True, False, False, False, False, 0, 0, ${angle}, 0, False, False, 0, 0, 0, 0, 0, True, True, True)`);
    } else {
      em.line(`Set swFeat = swFeatureMgr.FeatureRevolve2(True, True, False, False, False, False, 0, 0, ${angle}, 0, False, False, 0, 0, 0, 0, 0, True, True, True)`);
    }
    em.parameter("revolve_angle", p.angle ?? 360, "deg", "Revolution angle");
  }

  private emitFeatureLoft(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    em.line("' Loft requires multiple sketch profiles selected");
    em.line("' Select profiles in order before calling");
    em.line(`Set swFeat = swFeatureMgr.InsertProtrusionBlend(False, True, False, 1, 0, 0, 1, 1, True, True, False, 0, 0, 0, True, True, True)`);
    em.parameter("loft_type", "blend", "", "Loft feature");
  }

  private emitFeatureSweep(op: CADOperation, em: CADEmitter): void {
    em.line("' Sweep requires profile sketch and path selected");
    em.line(`Set swFeat = swFeatureMgr.InsertProtrusionSwept3(False, False, 0, False, False, 0, 0, False, 0, 0, 0, 0, True, True, True, 0, True, True, 0, 0, False)`);
    em.parameter("sweep_type", "protrusion", "", "Sweep feature");
  }

  private emitFeatureHole(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const diameter = (p.diameter ?? 5) / 1000;
    const depth = (p.depth ?? 10) / 1000;
    const x = (p.x ?? 0) / 1000;
    const y = (p.y ?? 0) / 1000;

    em.line("' Position for hole");
    em.line(`boolStatus = swModel.Extension.SelectByID2("", "FACE", ${x}, ${y}, 0, False, 0, Nothing, 0)`);
    em.line(`Set swFeat = swFeatureMgr.HoleWizard(4, 0, 0, False, 0, ${depth}, ${depth}, ${diameter}, ${diameter}, ${diameter}, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, False, False, False, False, False, False)`);
    em.parameter("hole_diameter", p.diameter ?? 5, "mm", "Hole diameter");
  }

  private emitFeaturePocket(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const depth = (p.depth ?? 5) / 1000;

    em.line("swSketchMgr.InsertSketch True");
    em.line(`Set swFeat = swFeatureMgr.FeatureCut3(True, False, False, 0, 0, ${depth}, ${depth}, False, False, False, False, 0, 0, False, False, False, False, False, True, True, True, True, False, 0, 0, False)`);
    em.parameter("pocket_depth", p.depth ?? 5, "mm", "Pocket depth");
  }

  private emitFeatureFillet(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const radius = (p.radius ?? 1) / 1000;

    em.line("' Select edges before fillet");
    em.line(`Set swFeat = swFeatureMgr.FeatureFillet3(195, ${radius}, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`);
    em.parameter("fillet_radius", p.radius ?? 1, "mm", "Fillet radius");
  }

  private emitFeatureChamfer(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const distance = (p.distance ?? p.size ?? 1) / 1000;
    const angle = (p.angle ?? 45) * (Math.PI / 180);

    em.line("' Select edges before chamfer");
    em.line(`Set swFeat = swFeatureMgr.InsertFeatureChamfer(2, 0, ${distance}, ${angle}, 0, 0, 0, 0)`);
    em.parameter("chamfer_distance", p.distance ?? p.size ?? 1, "mm", "Chamfer distance");
  }

  private emitFeatureShell(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const thickness = (p.thickness ?? 1) / 1000;

    em.line("' Select face(s) to remove before shell");
    em.line(`Set swFeat = swFeatureMgr.InsertFeatureShell(${thickness}, False)`);
    em.parameter("shell_thickness", p.thickness ?? 1, "mm", "Shell thickness");
  }

  private emitFeatureDraft(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const angle = (p.angle ?? 3) * (Math.PI / 180);

    em.line("' Select faces and neutral plane before draft");
    em.line(`Set swFeat = swFeatureMgr.InsertFeatureDraft(0, ${angle}, 0, False, False, False, False, False, False)`);
    em.parameter("draft_angle", p.angle ?? 3, "deg", "Draft angle");
  }

  // ── Boolean emitters ────────────────────────────────────────────────────────

  private emitBoolean(op: CADOperation, em: CADEmitter, kind: CADOperationKind): void {
    const opTypeMap: Record<string, number> = {
      boolean_union: 1,       // Add
      boolean_subtract: 2,    // Subtract
      boolean_intersect: 3,   // Common
    };
    const opType = opTypeMap[kind] ?? 1;
    em.line("' Select bodies to combine");
    em.line(`Set swFeat = swFeatureMgr.InsertCombineFeature(${opType}, Nothing, Nothing)`);
    em.parameter("boolean_op", kind, "", "Boolean operation type");
  }

  // ── Transform emitters ──────────────────────────────────────────────────────

  private emitTransformMove(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const dx = (p.dx ?? p.x ?? 0) / 1000;
    const dy = (p.dy ?? p.y ?? 0) / 1000;
    const dz = (p.dz ?? p.z ?? 0) / 1000;
    em.line(`swModel.Extension.MoveBody ${dx}, ${dy}, ${dz}, False`);
    em.parameter("move_delta", `${dx * 1000},${dy * 1000},${dz * 1000}`, "mm", "Move vector");
  }

  private emitTransformRotate(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const angle = (p.angle ?? 0) * (Math.PI / 180);
    const axis = p.axis ?? "Z";
    em.line(`' Rotate about ${axis} axis`);
    em.line(`swModel.Extension.RotateBody ${angle}, 0, 0, 0, ${axis === "X" ? 1 : 0}, ${axis === "Y" ? 1 : 0}, ${axis === "Z" ? 1 : 0}, False`);
    em.parameter("rotate_angle", p.angle ?? 0, "deg", "Rotation angle");
  }

  private emitTransformMirror(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const plane = p.plane ?? "Right Plane";
    em.line(`boolStatus = swModel.Extension.SelectByID2("${plane}", "PLANE", 0, 0, 0, False, 0, Nothing, 0)`);
    em.line("Set swFeat = swFeatureMgr.InsertMirrorFeature2(True, False, False, False, 2)");
    em.parameter("mirror_plane", plane, "", "Mirror plane");
  }

  private emitPatternLinear(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const countX = p.countX ?? p.count ?? 2;
    const countY = p.countY ?? 1;
    const spacingX = (p.spacingX ?? p.spacing ?? 10) / 1000;
    const spacingY = (p.spacingY ?? 10) / 1000;
    em.line(`Set swFeat = swFeatureMgr.FeatureLinearPattern4(${countX}, ${spacingX}, ${countY}, ${spacingY}, True, True, "NULL", "NULL", False, False)`);
    em.parameter("pattern_count_x", countX, "", "Linear pattern X count");
  }

  private emitPatternCircular(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const count = p.count ?? 6;
    const angle = (p.angle ?? 360) * (Math.PI / 180);
    em.line("' Select axis for circular pattern");
    em.line(`Set swFeat = swFeatureMgr.FeatureCircularPattern4(${count}, ${angle}, False, "NULL", False, True, False)`);
    em.parameter("pattern_count", count, "", "Circular pattern count");
  }

  // ── Export emitters ─────────────────────────────────────────────────────────

  private emitExportStep(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const path = p.path ?? "C:\\Temp\\export.step";
    em.line(`longStatus = swModel.SaveAs3("${path.replace(/\\/g, "\\\\")}", 0, 0)`);
    em.parameter("export_path", path, "", "STEP export path");
  }

  private emitExportStl(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const path = p.path ?? "C:\\Temp\\export.stl";
    em.line(`longStatus = swModel.SaveAs3("${path.replace(/\\/g, "\\\\")}", 0, 0)`);
    em.parameter("export_path", path, "", "STL export path");
  }

  private emitExportPdf(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const path = p.path ?? "C:\\Temp\\export.pdf";
    em.line(`longStatus = swModel.Extension.SaveAs("${path.replace(/\\/g, "\\\\")}", 0, 0, Nothing, longStatus, longWarnings)`);
    em.parameter("export_path", path, "", "PDF export path");
  }

  private emitExportDxf(op: CADOperation, em: CADEmitter): void {
    // DXF export via SaveAs3 flags 0x80 = kSaveAsOption_DXF_Version_2018.
    const p = op.params as any;
    const path = String(p.path ?? "C:\\Temp\\export.dxf");
    em.line(`longStatus = swModel.SaveAs3("${path.replace(/\\/g, "\\\\")}", 0, 0)`);
    em.parameter("export_path", path, "", "DXF export path");
  }

  // ── Import emitters ─────────────────────────────────────────────────────────
  // All SolidWorks imports route through OpenDoc6 with format-specific
  // doctype enums (swDocumentTypes_e): STEP=1 (part), IGES=1, DXF=3 (drawing).

  private emitImportStep(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const path = String(p.path ?? "");
    if (!path) {
      em.warn("import_step requires path param");
      return;
    }
    em.line(`Set swModel = swApp.OpenDoc6("${path.replace(/\\/g, "\\\\")}", 1, 0, "", longStatus, longWarnings)`);
    em.parameter("import_path", path, "", "STEP import path");
  }

  private emitImportIges(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const path = String(p.path ?? "");
    if (!path) {
      em.warn("import_iges requires path param");
      return;
    }
    em.line(`Set swModel = swApp.OpenDoc6("${path.replace(/\\/g, "\\\\")}", 1, 0, "", longStatus, longWarnings)`);
    em.parameter("import_path", path, "", "IGES import path");
  }

  private emitImportDxf(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const path = String(p.path ?? "");
    if (!path) {
      em.warn("import_dxf requires path param");
      return;
    }
    // DXF imports as drawing document (swDocDRAWING = 3).
    em.line(`Set swModel = swApp.OpenDoc6("${path.replace(/\\/g, "\\\\")}", 3, 0, "", longStatus, longWarnings)`);
    em.parameter("import_path", path, "", "DXF import path");
  }

  // ── Additional sketch primitives ────────────────────────────────────────────

  private emitSketchEllipse(op: CADOperation, em: CADEmitter): void {
    // CreateEllipse(cx, cy, cz, mx, my, mz, nx, ny, nz) — center + major + minor.
    const p = op.params as any;
    const cx = Number(p.centerX ?? 0);
    const cy = Number(p.centerY ?? 0);
    const rx = Number(p.radiusX ?? p.majorRadius ?? 10);
    const ry = Number(p.radiusY ?? p.minorRadius ?? 5);
    em.line(
      `swSketchMgr.CreateEllipse ${cx} / 1000.0, ${cy} / 1000.0, 0, ${cx + rx} / 1000.0, ${cy} / 1000.0, 0, ${cx} / 1000.0, ${cy + ry} / 1000.0, 0`
    );
  }

  private emitSketchSlot(op: CADOperation, em: CADEmitter): void {
    // CreateSlot via SketchManager.CreateCenterRectangle then fillet ends —
    // simplified: emit straight slot with two lines + two arcs.
    const p = op.params as any;
    const cx = Number(p.centerX ?? 0);
    const cy = Number(p.centerY ?? 0);
    const length = Number(p.length ?? 20);
    const width = Number(p.width ?? 5);
    const r = width / 2;
    const halfL = length / 2 - r;
    em.line(`' Slot centered at (${cx}, ${cy}), length=${length}, width=${width}`);
    em.line(
      `swSketchMgr.CreateLine ${cx - halfL} / 1000.0, ${cy + r} / 1000.0, 0, ${cx + halfL} / 1000.0, ${cy + r} / 1000.0, 0`
    );
    em.line(
      `swSketchMgr.CreateLine ${cx - halfL} / 1000.0, ${cy - r} / 1000.0, 0, ${cx + halfL} / 1000.0, ${cy - r} / 1000.0, 0`
    );
    em.line(
      `swSketchMgr.CreateArc ${cx - halfL} / 1000.0, ${cy} / 1000.0, 0, ${cx - halfL} / 1000.0, ${cy - r} / 1000.0, 0, ${cx - halfL} / 1000.0, ${cy + r} / 1000.0, 0, -1`
    );
    em.line(
      `swSketchMgr.CreateArc ${cx + halfL} / 1000.0, ${cy} / 1000.0, 0, ${cx + halfL} / 1000.0, ${cy + r} / 1000.0, 0, ${cx + halfL} / 1000.0, ${cy - r} / 1000.0, 0, -1`
    );
  }

  // ── Additional feature emitters ─────────────────────────────────────────────

  private emitFeatureRib(op: CADOperation, em: CADEmitter): void {
    // Rib via FeatureManager.InsertRib(directionRef, thickness, isTwoSided,
    //   isFlipMaterial, extrudeType, draftAngle, draftOutward, isDraftOn).
    const p = op.params as any;
    const thickness = Number(p.thickness ?? 3) / 1000.0; // mm → m
    const twoSided = p.twoSided === true ? "True" : "False";
    em.line(
      `Set swFeature = swFeatureMgr.InsertRib(False, False, ${thickness}, 0, ${twoSided}, 0, False, False)`
    );
    em.parameter("rib_thickness_mm", Number(p.thickness ?? 3), "mm", "Rib thickness");
  }

  private emitFeatureThread(op: CADOperation, em: CADEmitter): void {
    // Thread via FeatureManager.InsertThreadFeature with ISO metric defaults.
    const p = op.params as any;
    const diameter = Number(p.majorDiameter ?? 10);
    const pitch = Number(p.pitch ?? 1.5);
    const length = Number(p.length ?? 20);
    em.line(`' Thread: M${diameter} × ${pitch} × ${length}mm`);
    em.line(
      `Set swFeature = swFeatureMgr.InsertThreadFeature("${diameter.toFixed(1)}", ${pitch} / 1000.0, ${length} / 1000.0, 0, 0, True)`
    );
    em.parameter("thread_major_mm", diameter, "mm", "Thread major diameter");
    em.parameter("thread_pitch_mm", pitch, "mm", "Thread pitch");
  }

  // ── Surface emitters ────────────────────────────────────────────────────────

  private emitSurfaceRuled(op: CADOperation, em: CADEmitter): void {
    // Ruled surface via FeatureManager.InsertRuledSurface(type, distance,
    //   draftAngle, flipDirection, connectSurface).
    const p = op.params as any;
    const distance = Number(p.distance ?? 10) / 1000.0;
    const draftAngle = Number(p.draftAngle ?? 0) * Math.PI / 180;
    em.line(
      `Set swFeature = swFeatureMgr.InsertRuledSurface(0, ${distance}, ${draftAngle}, False, False)`
    );
  }

  private emitSurfaceLoft(op: CADOperation, em: CADEmitter): void {
    // Surface loft uses ProfileRefs from selected sketches (pre-selected by caller).
    em.line("' Surface loft — profiles must be pre-selected via swModel.Extension.SelectByID2");
    em.line("Set swFeature = swFeatureMgr.InsertProtrusionBlend2(False, True, False, 1, 0, 0, 1, 1, True, True, False, 0, 0, 0, True, True, True)");
  }

  private emitSurfaceSweep(op: CADOperation, em: CADEmitter): void {
    em.line("' Surface sweep — profile + path pre-selected");
    em.line("Set swFeature = swFeatureMgr.InsertProtrusionSwept4(False, True, 0, False, False, 0, 0, False, 0, 0, 0, 0, True, True, True)");
  }

  private emitSurfaceFill(op: CADOperation, em: CADEmitter): void {
    // FilledSurface via FeatureManager.InsertFilledSurfaceBetweenTwoBoundaries —
    // simplified to the single-boundary variant.
    em.line("' Surface fill — closed boundary of edges pre-selected");
    em.line("Set swFeature = swFeatureMgr.InsertFillSurface(True, False, False, True)");
  }

  private emitSurfaceOffset(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const distance = Number(p.distance ?? 5) / 1000.0;
    em.line(`Set swFeature = swFeatureMgr.InsertOffsetSurface(${distance}, False)`);
    em.parameter("offset_distance_mm", Number(p.distance ?? 5), "mm", "Surface offset");
  }

  private emitSurfaceTrim(op: CADOperation, em: CADEmitter): void {
    // TrimSurface via FeatureManager.InsertMutualTrimSurface — standard trim.
    em.line("' Surface trim — surfaces + trim region pre-selected");
    em.line("Set swFeature = swFeatureMgr.InsertMutualTrimSurface(0)");
  }

  // ── Additional transform emitter ────────────────────────────────────────────

  private emitTransformScale(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const factor = Number(p.factor ?? p.scale ?? 1);
    em.line(`' Uniform scale by factor ${factor}`);
    em.line(
      `Set swFeature = swFeatureMgr.InsertScale(False, ${factor}, ${factor}, ${factor})`
    );
    em.parameter("scale_factor", factor, "unitless", "Uniform scale factor");
  }

  // ── Assembly emitters ───────────────────────────────────────────────────────

  private emitAssemblyInsertComponent(op: CADOperation, em: CADEmitter): void {
    const p = op.params as any;
    const path = String(p.path ?? p.file ?? "");
    if (!path) {
      em.warn("assembly_insert_component requires path param");
      return;
    }
    const x = Number(p.x ?? 0) / 1000.0;
    const y = Number(p.y ?? 0) / 1000.0;
    const z = Number(p.z ?? 0) / 1000.0;
    em.line(
      `Dim swAsmDoc As SldWorks.AssemblyDoc : Set swAsmDoc = swModel`
    );
    em.line(
      `Dim swComp As SldWorks.Component2 : Set swComp = swAsmDoc.AddComponent5("${path.replace(/\\/g, "\\\\")}", 0, "", False, "", ${x}, ${y}, ${z})`
    );
    em.parameter("component_path", path, "", "Inserted component file");
  }

  private emitAssemblyMate(op: CADOperation, em: CADEmitter): void {
    // Mate types: swMateCOINCIDENT=0, swMateCONCENTRIC=1, swMatePERPENDICULAR=2,
    //   swMatePARALLEL=3, swMateTANGENT=4, swMateDISTANCE=5, swMateANGLE=6.
    const p = op.params as any;
    const mateTypeMap: Record<string, number> = {
      coincident: 0,
      concentric: 1,
      perpendicular: 2,
      parallel: 3,
      tangent: 4,
      distance: 5,
      angle: 6,
    };
    const mateName = String(p.type ?? "coincident").toLowerCase();
    const mateType = mateTypeMap[mateName];
    if (mateType === undefined) {
      em.warn(`assembly_mate: unknown mate type '${mateName}' (valid: ${Object.keys(mateTypeMap).join(", ")})`);
      return;
    }
    const distance = Number(p.distance ?? 0) / 1000.0;
    const angle = Number(p.angle ?? 0) * Math.PI / 180;
    em.line(`' ${mateName} mate — entities pre-selected via SelectByID2`);
    em.line(
      `Dim swAsmMateDoc As SldWorks.AssemblyDoc : Set swAsmMateDoc = swModel`
    );
    em.line(
      `Dim swMate As SldWorks.Mate2 : Set swMate = swAsmMateDoc.AddMate5(${mateType}, 0, False, ${distance}, 0, 0, 0, 0, 0, 0, ${angle}, 0, False, False, 0, longStatus)`
    );
    em.parameter("mate_type", mateName, "", "Mate constraint type");
  }

  private emitAssemblyPattern(op: CADOperation, em: CADEmitter): void {
    // Local linear component pattern via AssemblyDoc.FeatureLinearPattern2.
    const p = op.params as any;
    const count = Math.max(2, Math.floor(Number(p.count ?? 2)));
    const spacing = Number(p.spacing ?? 25) / 1000.0;
    em.line(`' Assembly linear pattern: ${count} instances × ${Number(p.spacing ?? 25)}mm`);
    em.line(
      `Set swFeature = swFeatureMgr.FeatureLinearPattern3(${count}, ${spacing}, 1, 1 / 1000.0, False, False, "", "", False, False, False, False, False, False, True, True, False, False, 0, 0, True, True, True, False, False)`
    );
    em.parameter("pattern_count", count, "unitless", "Instances");
    em.parameter("pattern_spacing_mm", Number(p.spacing ?? 25), "mm", "Between instances");
  }

  // ── Drawing emitters ────────────────────────────────────────────────────────

  private emitDrawingView(op: CADOperation, em: CADEmitter): void {
    // Orientation map for DrawingDoc.CreateDrawViewFromModelView3.
    const p = op.params as any;
    const orientMap: Record<string, string> = {
      front: "*Front",
      back: "*Back",
      top: "*Top",
      bottom: "*Bottom",
      left: "*Left",
      right: "*Right",
      isometric: "*Isometric",
      trimetric: "*Trimetric",
    };
    const orientKey = String(p.orientation ?? "front").toLowerCase();
    const viewName = orientMap[orientKey] ?? "*Front";
    const x = Number(p.x ?? 0.1);
    const y = Number(p.y ?? 0.1);
    const refDoc = String(p.sourceDoc ?? "");
    em.line(
      `Dim swDrawDoc As SldWorks.DrawingDoc : Set swDrawDoc = swModel`
    );
    em.line(
      `Dim swDrawView As SldWorks.View : Set swDrawView = swDrawDoc.CreateDrawViewFromModelView3("${refDoc.replace(/\\/g, "\\\\")}", "${viewName}", ${x}, ${y}, 0)`
    );
    em.parameter("view_orientation", orientKey, "", "Drawing view orientation");
  }

  private emitDrawingDimension(op: CADOperation, em: CADEmitter): void {
    // Ordinate/linear dimension via DrawingDoc.AddDimension2.
    const p = op.params as any;
    const x = Number(p.x ?? 0.05);
    const y = Number(p.y ?? 0.05);
    em.line(
      `' Dimension anchor at (${x}, ${y}) — edge pre-selected via SelectByID2`
    );
    em.line(
      `Dim swDim As SldWorks.DisplayDimension : Set swDim = swModel.AddDimension2(${x}, ${y}, 0)`
    );
  }

  private emitDrawingAnnotation(op: CADOperation, em: CADEmitter): void {
    // Note annotation via DrawingDoc.InsertNote.
    const p = op.params as any;
    const text = String(p.text ?? "NOTE").replace(/"/g, '""');
    const x = Number(p.x ?? 0.05);
    const y = Number(p.y ?? 0.05);
    em.line(
      `Dim swNote As SldWorks.Note : Set swNote = swModel.InsertNote("${text}")`
    );
    em.line(
      `If Not swNote Is Nothing Then swNote.GetAnnotation.SetPosition2 ${x}, ${y}, 0`
    );
    em.parameter("annotation_text", text, "", "Drawing note text");
  }

  // ── Script assembly ─────────────────────────────────────────────────────────

  protected assembleScript(
    imports: Set<string>,
    parameters: Map<string, { value: any; unit: string; description?: string }>,
    bodyLines: string[],
    context: SolidWorksGenerationContext,
  ): string {
    const paramSection = this.generateParameterSection(parameters);
    const body = bodyLines.join("\n");

    return [
      VBA_HEADER,
      paramSection,
      VBA_MAIN_START.replace("${partName}", context.partName ?? "PRISMPart"),
      body,
      VBA_MAIN_END,
    ].join("\n");
  }

  private generateParameterSection(
    parameters: Map<string, { value: any; unit: string; description?: string }>,
  ): string {
    if (parameters.size === 0) return "";

    const lines = ["' ─── PARAMETERS ─────────────────────────────────────────────────────────────"];
    for (const [name, param] of parameters) {
      const desc = param.description ? ` ' ${param.description}` : "";
      const unit = param.unit ? ` [${param.unit}]` : "";
      lines.push(`Const PARAM_${name.toUpperCase()} = ${JSON.stringify(param.value)}${unit}${desc}`);
    }
    lines.push("");
    return lines.join("\n");
  }

  // ── Execution (mock or real) ────────────────────────────────────────────────

  protected async runScriptBody(script: CADScript<string>): Promise<CADExecutionResult> {
    const isMock = process.env.PRISM_CAD_MOCK === "1" || process.env.NODE_ENV === "test";

    if (isMock) {
      log.debug("[SolidWorksCodeGeneratorEngine] Mock execution mode");
      return {
        ok: true,
        durationMs: 500,
        outputs: [{ path: "C:\\Temp\\mock_output.SLDPRT", kind: "SLDPRT" }],
        log: "Mock execution completed successfully",
      };
    }

    // Real execution: SolidWorksAutomationBridge exposes file ops (open/export/
    // bbox/close) but NO VBA/macro executor, so the generated VBA script cannot
    // be run end-to-end yet. Fail loud (R12) rather than crash on a missing method
    // -- mirrors the EspritCodeGeneratorEngine "COM execution not yet wired" pattern.
    void script;
    return {
      ok: false,
      error:
        "SolidWorks VBA execution not yet wired -- SolidWorksAutomationBridge has no macro executor (only open/export/bbox/close)",
      durationMs: 0,
    };
  }
}

export const solidWorksCodeGeneratorEngine = new SolidWorksCodeGeneratorEngine();
