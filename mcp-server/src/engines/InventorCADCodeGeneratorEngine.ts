/**
 * InventorCADCodeGeneratorEngine — U-CADC08 (PHASE-2)
 *
 * Generates iLogic VB.NET scripts for Autodesk Inventor CAD geometry creation.
 * Extends UnifiedCADCodeGeneratorBase for consistent API across CAD systems.
 *
 * Output: iLogic VB.NET automation scripts (.iLogicVb) that create:
 *   - Sketches (lines, arcs, circles, rectangles, splines, slots)
 *   - Features (extrude, revolve, loft, sweep, hole, pocket)
 *   - Modifiers (fillet, chamfer, shell, draft, mirror)
 *   - Patterns (rectangular, circular, feature mirror)
 *   - Boolean operations (union, intersect, subtract)
 *   - Assembly operations (place, constrain, ground)
 *
 * Inventor API Hierarchy:
 *   ThisApplication.Documents.Add(kPartDocumentObject)
 *   PartDocument.ComponentDefinition.Sketches.Add(workPlane)
 *   Sketch.SketchLines / SketchCircles / SketchArcs
 *   ComponentDefinition.Features.ExtrudeFeatures.AddByDistanceExtent()
 *   ComponentDefinition.Features.RevolveFeatures.AddFull()
 *
 * @engine InventorCADCodeGeneratorEngine
 * @shortcode E2481
 * @dispatcher cadDispatcher
 * @actions inventor_cad_generate, inventor_cad_execute, inventor_cad_validate
 * @milestone CAD-COMPLETE-MS0/U-CADC08
 */

import {
  UnifiedCADCodeGeneratorBase,
  CADEmitter,
  CADBuildError,
} from "./UnifiedCADCodeGeneratorBase.js";
import type {
  CADCapabilityMatrix,
  CADOperation,
  CADScript,
  CADExecutionResult,
  CADSystemId,
} from "../interfaces/ICADCodeGenerator.js";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Supported Operations ──────────────────────────────────────────────────────

const INVENTOR_SUPPORTED_OPS = new Set([
  // Sketch primitives
  "sketch_create",
  "sketch_line",
  "sketch_arc",
  "sketch_circle",
  "sketch_rectangle",
  "sketch_polygon",
  "sketch_spline",
  "sketch_slot",
  "sketch_ellipse",
  "sketch_point",
  "sketch_offset",
  "sketch_mirror",
  "sketch_trim",
  "sketch_extend",
  "sketch_fillet",
  "sketch_chamfer",
  "sketch_dimension",
  "sketch_constraint",
  // Features
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
  "feature_emboss",
  "feature_decal",
  "feature_thread",
  "feature_coil",
  "feature_split",
  "feature_move_face",
  // Patterns
  "pattern_rectangular",
  "pattern_circular",
  "pattern_linear",
  "pattern_mirror",
  "pattern_sketch",
  // Boolean operations
  "boolean_union",
  "boolean_intersect",
  "boolean_subtract",
  // Work features
  "work_plane",
  "work_axis",
  "work_point",
  // Surface
  "surface_extrude",
  "surface_stitch",
  // Body
  "mirror_body",
  // Sheet metal (Inventor kSheetMetalPartDocumentObject)
  "sheet_metal_init",
  "sheet_metal_face",
  "sheet_metal_flange",
  "sheet_metal_contour_flange",
  "sheet_metal_hem",
  "sheet_metal_bend",
  "sheet_metal_corner_seam",
  "sheet_metal_punch",
  "sheet_metal_unfold",
  "sheet_metal_refold",
  // Assembly
  "assembly_place",
  "assembly_constrain",
  "assembly_ground",
  "assembly_joint",
  // Parameters
  "parameter_declare",
  "parameter_link",
  // Import/Export
  "import_step",
  "import_iges",
  "export_step",
  "export_stl",
  "export_dxf",
] as const);

type InventorOpKind = (typeof INVENTOR_SUPPORTED_OPS) extends Set<infer T>
  ? T
  : never;

// ── Capability Matrix ─────────────────────────────────────────────────────────

/**
 * Inventor advertises a vendor-divergent capability vocabulary that the canonical
 * {@link CADCapabilityMatrix} does not yet name -- a per-script op budget
 * (`maxOpsPerScript`) plus boolean flags for parametric/direct/assembly/sheet-
 * metal/surface/mesh modeling and batch execution. We type the literal against
 * this precise local shape so field typos stay compile-checked, then surface it
 * as CADCapabilityMatrix at the generator boundary (the `capabilities` override
 * below). This local interface deliberately does NOT extend CADCapabilityMatrix:
 * doing so would demand Inventor's canonical fields (nativeLengthUnit /
 * nativeAngleUnit / requiresSubprocess / typicalLatencyMs), whose correct values
 * are CAD-galaxy (delta) domain knowledge -- reconciling this vocabulary into the
 * canonical matrix is a cross-generator interface migration owned by delta,
 * tracked separately (see the `supportedOps` note).
 */
interface InventorCapabilityMatrix {
  supportedOps: CADCapabilityMatrix["supportedOps"];
  maxOpsPerScript: number;
  supportsParameters: boolean;
  supportsUndo: boolean;
  supportsBatchExecution: boolean;
  parametricModeling: boolean;
  directModeling: boolean;
  assemblyModeling: boolean;
  sheetMetal: boolean;
  surfaceModeling: boolean;
  meshModeling: boolean;
}

const INVENTOR_CAPABILITIES: InventorCapabilityMatrix = {
  // Inventor advertises a SUPERSET of the canonical CADOperationKind union: it
  // adds vendor-native ops (sheet_metal_*, work_*, feature_coil/emboss/decal/
  // split/move_face, pattern_rectangular/sketch, assembly_ground/joint,
  // mirror_body, surface_stitch) the canonical interface cannot yet name. Cast
  // to the field's declared element type -- a CADOperation.kind can only ever be
  // a canonical kind, so the extra members are inert for buildScript's op check.
  // First-classing these vendor ops into CAD_OPERATION_KINDS is a cross-generator
  // interface migration owned by the CAD galaxy (delta), tracked separately.
  supportedOps: INVENTOR_SUPPORTED_OPS as unknown as CADCapabilityMatrix["supportedOps"],
  maxOpsPerScript: 500,
  supportsParameters: true,
  supportsUndo: true,
  supportsBatchExecution: true,
  parametricModeling: true,
  directModeling: false,
  assemblyModeling: true,
  sheetMetal: true,
  surfaceModeling: true,
  meshModeling: false,
};

// ── Engine Implementation ─────────────────────────────────────────────────────

export interface InventorCADContext {
  documentType?: "part" | "assembly" | "drawing";
  units?: "mm" | "in" | "cm";
  templatePath?: string;
  outputPath?: string;
}

export class InventorCADCodeGeneratorEngine extends UnifiedCADCodeGeneratorBase<InventorCADContext> {
  readonly cadSystem: CADSystemId = "inventor";
  // Vendor-divergent matrix surfaced through the canonical contract -- see the
  // InventorCapabilityMatrix note above. The cast is the single boundary where
  // Inventor's superset vocabulary meets CADCapabilityMatrix; the runtime object
  // is unchanged (the Inventor capability tests read its vendor fields directly).
  readonly capabilities = INVENTOR_CAPABILITIES as unknown as CADCapabilityMatrix;

  private sketchCounter = 0;
  private featureCounter = 0;

  // ── Preamble ────────────────────────────────────────────────────────────────

  protected preamble(
    ctx: InventorCADContext | undefined,
    em: CADEmitter
  ): void {
    const docType = ctx?.documentType ?? "part";
    const units = ctx?.units ?? "mm";

    em.line("' ═══════════════════════════════════════════════════════════════");
    em.line("' PRISM CAD Generator — Autodesk Inventor iLogic Script");
    em.line(`' Document Type: ${docType}`);
    em.line(`' Units: ${units}`);
    em.line("' Generated by InventorCADCodeGeneratorEngine (E2481)");
    em.line("' ═══════════════════════════════════════════════════════════════");
    em.line("");

    // Imports
    em.line("Imports Inventor");
    em.line("Imports System.Math");
    em.line("");

    // Get application reference
    em.line("' Initialize Inventor application");
    em.line("Dim oApp As Inventor.Application = ThisApplication");
    em.line("");

    // Create or get document
    if (docType === "part") {
      em.line("' Create new part document");
      em.line(
        'Dim oDoc As PartDocument = oApp.Documents.Add(DocumentTypeEnum.kPartDocumentObject, "", True)'
      );
      em.line("Dim oDef As PartComponentDefinition = oDoc.ComponentDefinition");
    } else if (docType === "assembly") {
      em.line("' Create new assembly document");
      em.line(
        'Dim oDoc As AssemblyDocument = oApp.Documents.Add(DocumentTypeEnum.kAssemblyDocumentObject, "", True)'
      );
      em.line(
        "Dim oDef As AssemblyComponentDefinition = oDoc.ComponentDefinition"
      );
    }
    em.line("");

    // Set units
    em.line("' Set document units");
    if (units === "mm") {
      em.line(
        "oDoc.UnitsOfMeasure.LengthUnits = UnitsTypeEnum.kMillimeterLengthUnits"
      );
    } else if (units === "in") {
      em.line(
        "oDoc.UnitsOfMeasure.LengthUnits = UnitsTypeEnum.kInchLengthUnits"
      );
    } else if (units === "cm") {
      em.line(
        "oDoc.UnitsOfMeasure.LengthUnits = UnitsTypeEnum.kCentimeterLengthUnits"
      );
    }
    em.line("");

    // Helper variables
    em.line("' Working variables");
    em.line("Dim oSketch As PlanarSketch");
    em.line("Dim oProfile As Profile");
    em.line("Dim oFeature As Object");
    em.line("Dim oWorkPlane As WorkPlane");
    em.line("Dim _sketch_idx As Integer = 0");
    em.line("Dim _feature_idx As Integer = 0");
    em.line("");

    // Reset counters
    this.sketchCounter = 0;
    this.featureCounter = 0;
  }

  // ── Epilogue ────────────────────────────────────────────────────────────────

  protected epilogue(
    ctx: InventorCADContext | undefined,
    em: CADEmitter
  ): void {
    em.line("");
    em.line("' ═══════════════════════════════════════════════════════════════");
    em.line("' Finalize document");
    em.line("' ═══════════════════════════════════════════════════════════════");
    em.line("");
    em.line("' Update document");
    em.line("oDoc.Update2(True)");
    em.line("");

    if (ctx?.outputPath) {
      em.line("' Save document");
      em.line(`oDoc.SaveAs("${ctx.outputPath.replace(/\\/g, "\\\\")}", False)`);
    }

    em.line("");
    em.line("' Script complete");
    em.line("MessageBox.Show(\"Part created successfully\", \"PRISM\")");
  }

  // ── Script Filename ─────────────────────────────────────────────────────────

  protected scriptFilename(ctx: InventorCADContext | undefined): string {
    return `prism_inventor_${Date.now()}.iLogicVb`;
  }

  // ── Operation Emission ──────────────────────────────────────────────────────

  protected emitOp(
    op: CADOperation,
    opIndex: number,
    ctx: InventorCADContext | undefined,
    em: CADEmitter
  ): void {
    switch (op.kind as InventorOpKind) {
      // Sketch operations
      case "sketch_create":
        this.emitSketchCreate(op, em);
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
      case "sketch_spline":
        this.emitSketchSpline(op, em);
        break;
      case "sketch_slot":
        this.emitSketchSlot(op, em);
        break;
      case "sketch_ellipse":
        this.emitSketchEllipse(op, em);
        break;
      case "sketch_point":
        this.emitSketchPoint(op, em);
        break;
      case "sketch_offset":
        this.emitSketchOffset(op, em);
        break;
      case "sketch_mirror":
        this.emitSketchMirror(op, em);
        break;
      case "sketch_trim":
        this.emitSketchTrim(op, em);
        break;
      case "sketch_extend":
        this.emitSketchExtend(op, em);
        break;
      case "sketch_fillet":
        this.emitSketchFillet(op, em);
        break;
      case "sketch_chamfer":
        this.emitSketchChamfer(op, em);
        break;
      case "sketch_dimension":
        this.emitSketchDimension(op, em);
        break;
      case "sketch_constraint":
        this.emitSketchConstraint(op, em);
        break;

      // Feature operations
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
      case "feature_emboss":
        this.emitFeatureEmboss(op, em);
        break;
      case "feature_decal":
        this.emitFeatureDecal(op, em);
        break;
      case "feature_thread":
        this.emitFeatureThread(op, em);
        break;
      case "feature_coil":
        this.emitFeatureCoil(op, em);
        break;
      case "feature_split":
        this.emitFeatureSplit(op, em);
        break;
      case "feature_move_face":
        this.emitFeatureMoveFace(op, em);
        break;

      // Pattern operations
      case "pattern_rectangular":
        this.emitPatternRectangular(op, em);
        break;
      case "pattern_circular":
        this.emitPatternCircular(op, em);
        break;
      case "pattern_linear":
        this.emitPatternLinear(op, em);
        break;
      case "pattern_mirror":
        this.emitPatternMirror(op, em);
        break;
      case "pattern_sketch":
        this.emitPatternSketch(op, em);
        break;

      // Boolean operations
      case "boolean_union":
        this.emitBooleanUnion(op, em);
        break;
      case "boolean_intersect":
        this.emitBooleanIntersect(op, em);
        break;
      case "boolean_subtract":
        this.emitBooleanSubtract(op, em);
        break;

      // Work features
      case "work_plane":
        this.emitWorkPlane(op, em);
        break;
      case "work_axis":
        this.emitWorkAxis(op, em);
        break;
      case "work_point":
        this.emitWorkPoint(op, em);
        break;

      // Surface operations
      case "surface_extrude":
        this.emitSurfaceExtrude(op, em);
        break;
      case "surface_stitch":
        this.emitSurfaceStitch(op, em);
        break;

      // Body operations
      case "mirror_body":
        this.emitMirrorBody(op, em);
        break;

      // Sheet metal operations
      case "sheet_metal_init":
        this.emitSheetMetalInit(op, em);
        break;
      case "sheet_metal_face":
        this.emitSheetMetalFace(op, em);
        break;
      case "sheet_metal_flange":
        this.emitSheetMetalFlange(op, em);
        break;
      case "sheet_metal_contour_flange":
        this.emitSheetMetalContourFlange(op, em);
        break;
      case "sheet_metal_hem":
        this.emitSheetMetalHem(op, em);
        break;
      case "sheet_metal_bend":
        this.emitSheetMetalBend(op, em);
        break;
      case "sheet_metal_corner_seam":
        this.emitSheetMetalCornerSeam(op, em);
        break;
      case "sheet_metal_punch":
        this.emitSheetMetalPunch(op, em);
        break;
      case "sheet_metal_unfold":
        this.emitSheetMetalUnfold(op, em);
        break;
      case "sheet_metal_refold":
        this.emitSheetMetalRefold(op, em);
        break;

      // Assembly operations
      case "assembly_place":
        this.emitAssemblyPlace(op, em);
        break;
      case "assembly_constrain":
        this.emitAssemblyConstrain(op, em);
        break;
      case "assembly_ground":
        this.emitAssemblyGround(op, em);
        break;
      case "assembly_joint":
        this.emitAssemblyJoint(op, em);
        break;

      // Parameters
      case "parameter_declare":
        this.emitParameterDeclare(op, em);
        break;
      case "parameter_link":
        this.emitParameterLink(op, em);
        break;

      // Import/Export
      case "import_step":
        this.emitImportStep(op, em);
        break;
      case "import_iges":
        this.emitImportIges(op, em);
        break;
      case "export_step":
        this.emitExportStep(op, em);
        break;
      case "export_stl":
        this.emitExportStl(op, em);
        break;
      case "export_dxf":
        this.emitExportDxf(op, em);
        break;

      default:
        throw new CADBuildError(
          `Unsupported operation kind: ${op.kind}`,
          opIndex,
          op.kind
        );
    }
  }

  // requireArg() is inherited from UnifiedCADCodeGeneratorBase (protected, typed
  // CADBuildError, Array.isArray-aware via the "array" kind) -- the prior private
  // override here was a redundant re-impl whose "object" kind + private visibility
  // were incompatible with the base signature (TS2416). Removed; use the base.

  private optionalArg<T>(
    op: CADOperation,
    key: string,
    defaultValue: T
  ): T {
    const val = op.args[key];
    return val !== undefined && val !== null ? (val as T) : defaultValue;
  }

  // ── Sketch Emission ─────────────────────────────────────────────────────────

  private emitSketchCreate(op: CADOperation, em: CADEmitter): void {
    const plane = this.optionalArg<string>(op, "plane", "XY");
    const name = this.optionalArg<string>(op, "name", "");
    const offset = this.optionalArg<number>(op, "offset", 0);

    this.sketchCounter++;
    const sketchName = name || `Sketch${this.sketchCounter}`;

    em.line(`' Create sketch: ${sketchName}`);
    em.line("_sketch_idx += 1");

    // Get work plane
    if (plane === "XY" || plane === "XZ" || plane === "YZ") {
      const planeMap: Record<string, string> = {
        XY: "oDef.WorkPlanes.Item(3)", // XY plane
        XZ: "oDef.WorkPlanes.Item(2)", // XZ plane
        YZ: "oDef.WorkPlanes.Item(1)", // YZ plane
      };
      if (offset !== 0) {
        em.line(
          `oWorkPlane = oDef.WorkPlanes.AddByPlaneAndOffset(${planeMap[plane]}, ${offset})`
        );
        em.line("oSketch = oDef.Sketches.Add(oWorkPlane)");
      } else {
        em.line(`oSketch = oDef.Sketches.Add(${planeMap[plane]})`);
      }
    } else {
      // Custom plane reference
      em.line(`oSketch = oDef.Sketches.Add(${plane})`);
    }
    em.line(`oSketch.Name = "${sketchName}"`);
  }

  private emitSketchLine(op: CADOperation, em: CADEmitter): void {
    const x1 = this.requireArg<number>(op, "x1", "number");
    const y1 = this.requireArg<number>(op, "y1", "number");
    const x2 = this.requireArg<number>(op, "x2", "number");
    const y2 = this.requireArg<number>(op, "y2", "number");

    em.line(
      `oSketch.SketchLines.AddByTwoPoints(oApp.TransientGeometry.CreatePoint2d(${x1}, ${y1}), oApp.TransientGeometry.CreatePoint2d(${x2}, ${y2}))`
    );
  }

  private emitSketchArc(op: CADOperation, em: CADEmitter): void {
    const cx = this.requireArg<number>(op, "cx", "number");
    const cy = this.requireArg<number>(op, "cy", "number");
    const radius = this.requireArg<number>(op, "radius", "number");
    const startAngle = this.optionalArg<number>(op, "start_angle", 0);
    const endAngle = this.optionalArg<number>(op, "end_angle", 180);

    // Convert degrees to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    em.line(
      `oSketch.SketchArcs.AddByCenterStartEndPoint(oApp.TransientGeometry.CreatePoint2d(${cx}, ${cy}), oApp.TransientGeometry.CreatePoint2d(${cx + radius * Math.cos(startRad)}, ${cy + radius * Math.sin(startRad)}), oApp.TransientGeometry.CreatePoint2d(${cx + radius * Math.cos(endRad)}, ${cy + radius * Math.sin(endRad)}))`
    );
  }

  private emitSketchCircle(op: CADOperation, em: CADEmitter): void {
    const cx = this.requireArg<number>(op, "cx", "number");
    const cy = this.requireArg<number>(op, "cy", "number");
    const radius = this.requireArg<number>(op, "radius", "number");

    em.line(
      `oSketch.SketchCircles.AddByCenterRadius(oApp.TransientGeometry.CreatePoint2d(${cx}, ${cy}), ${radius})`
    );
  }

  private emitSketchRectangle(op: CADOperation, em: CADEmitter): void {
    const x = this.optionalArg<number>(op, "x", 0);
    const y = this.optionalArg<number>(op, "y", 0);
    const width = this.requireArg<number>(op, "width", "number");
    const height = this.requireArg<number>(op, "height", "number");

    em.line(
      `oSketch.SketchLines.AddAsTwoPointRectangle(oApp.TransientGeometry.CreatePoint2d(${x}, ${y}), oApp.TransientGeometry.CreatePoint2d(${x + width}, ${y + height}))`
    );
  }

  private emitSketchPolygon(op: CADOperation, em: CADEmitter): void {
    const cx = this.requireArg<number>(op, "cx", "number");
    const cy = this.requireArg<number>(op, "cy", "number");
    const radius = this.requireArg<number>(op, "radius", "number");
    const sides = this.optionalArg<number>(op, "sides", 6);

    em.line(
      `oSketch.SketchLines.AddAsPolygon(${sides}, oApp.TransientGeometry.CreatePoint2d(${cx}, ${cy}), oApp.TransientGeometry.CreatePoint2d(${cx + radius}, ${cy}), False)`
    );
  }

  private emitSketchSpline(op: CADOperation, em: CADEmitter): void {
    const points = this.requireArg<number[]>(op, "points", "array");

    if (points.length < 4 || points.length % 2 !== 0) {
      throw new Error("sketch_spline requires at least 2 points (4 coordinates)");
    }

    em.line("Dim splinePoints As ObjectCollection");
    em.line("splinePoints = oApp.TransientObjects.CreateObjectCollection()");

    for (let i = 0; i < points.length; i += 2) {
      em.line(
        `splinePoints.Add(oApp.TransientGeometry.CreatePoint2d(${points[i]}, ${points[i + 1]}))`
      );
    }
    em.line("oSketch.SketchSplines.Add(splinePoints)");
  }

  private emitSketchSlot(op: CADOperation, em: CADEmitter): void {
    const cx = this.requireArg<number>(op, "cx", "number");
    const cy = this.requireArg<number>(op, "cy", "number");
    const length = this.requireArg<number>(op, "length", "number");
    const width = this.requireArg<number>(op, "width", "number");

    const halfLen = length / 2;
    const halfWidth = width / 2;

    em.line("' Create slot geometry");
    // Left arc
    em.line(
      `oSketch.SketchArcs.AddByCenterStartEndPoint(oApp.TransientGeometry.CreatePoint2d(${cx - halfLen}, ${cy}), oApp.TransientGeometry.CreatePoint2d(${cx - halfLen}, ${cy + halfWidth}), oApp.TransientGeometry.CreatePoint2d(${cx - halfLen}, ${cy - halfWidth}))`
    );
    // Right arc
    em.line(
      `oSketch.SketchArcs.AddByCenterStartEndPoint(oApp.TransientGeometry.CreatePoint2d(${cx + halfLen}, ${cy}), oApp.TransientGeometry.CreatePoint2d(${cx + halfLen}, ${cy - halfWidth}), oApp.TransientGeometry.CreatePoint2d(${cx + halfLen}, ${cy + halfWidth}))`
    );
    // Top line
    em.line(
      `oSketch.SketchLines.AddByTwoPoints(oApp.TransientGeometry.CreatePoint2d(${cx - halfLen}, ${cy + halfWidth}), oApp.TransientGeometry.CreatePoint2d(${cx + halfLen}, ${cy + halfWidth}))`
    );
    // Bottom line
    em.line(
      `oSketch.SketchLines.AddByTwoPoints(oApp.TransientGeometry.CreatePoint2d(${cx - halfLen}, ${cy - halfWidth}), oApp.TransientGeometry.CreatePoint2d(${cx + halfLen}, ${cy - halfWidth}))`
    );
  }

  private emitSketchEllipse(op: CADOperation, em: CADEmitter): void {
    const cx = this.requireArg<number>(op, "cx", "number");
    const cy = this.requireArg<number>(op, "cy", "number");
    const majorRadius = this.requireArg<number>(op, "major_radius", "number");
    const minorRadius = this.requireArg<number>(op, "minor_radius", "number");

    em.line(
      `oSketch.SketchEllipses.Add(oApp.TransientGeometry.CreatePoint2d(${cx}, ${cy}), oApp.TransientGeometry.CreatePoint2d(${cx + majorRadius}, ${cy}), ${minorRadius / majorRadius})`
    );
  }

  private emitSketchPoint(op: CADOperation, em: CADEmitter): void {
    const x = this.requireArg<number>(op, "x", "number");
    const y = this.requireArg<number>(op, "y", "number");

    em.line(
      `oSketch.SketchPoints.Add(oApp.TransientGeometry.CreatePoint2d(${x}, ${y}))`
    );
  }

  private emitSketchOffset(op: CADOperation, em: CADEmitter): void {
    const distance = this.requireArg<number>(op, "distance", "number");
    em.line(`' Offset sketch entities by ${distance}mm`);
    em.line(
      `oSketch.OffsetSketchEntitiesUsingDistance(oSketch.SketchEntities, ${distance}, False, False)`
    );
  }

  private emitSketchMirror(op: CADOperation, em: CADEmitter): void {
    // Inventor has no single-call mirror; the canonical iLogic idiom is:
    //   1. Create mirror axis (construction line)
    //   2. For each paired entity, add GeometricConstraint.AddSymmetry across the axis.
    // Caller supplies mirror_line (two-point form) and entity_pairs (1-based indices).
    const mirrorLine = op.args["mirror_line"] as
      | { x1: number; y1: number; x2: number; y2: number }
      | undefined;
    const pairs = (op.args["entity_pairs"] as unknown as Array<[number, number]>) || [];
    const x1 = mirrorLine?.x1 ?? 0;
    const y1 = mirrorLine?.y1 ?? 0;
    const x2 = mirrorLine?.x2 ?? 100;
    const y2 = mirrorLine?.y2 ?? 0;

    em.line("' Mirror sketch entities across construction axis");
    em.line(
      `Dim mirrorAxis As SketchLine = oSketch.SketchLines.AddByTwoPoints(oApp.TransientGeometry.CreatePoint2d(${x1}, ${y1}), oApp.TransientGeometry.CreatePoint2d(${x2}, ${y2}))`
    );
    em.line("mirrorAxis.Construction = True");
    for (const [a, b] of pairs) {
      em.line(
        `oSketch.GeometricConstraints.AddSymmetry(oSketch.SketchEntities.Item(${a}), oSketch.SketchEntities.Item(${b}), mirrorAxis)`
      );
    }
    if (pairs.length === 0) {
      em.warn(
        "sketch_mirror called without entity_pairs — axis created but no symmetry constraints emitted",
        "info"
      );
    }
  }

  private emitSketchTrim(op: CADOperation, em: CADEmitter): void {
    // Inventor has no public trim-at-intersection API. Closest equivalent is
    // deleting the unwanted segment after intersection split. Caller supplies
    // entity_index (1-based) of the segment to remove.
    const index = this.requireArg<number>(op, "entity_index", "number");
    em.line(`' Trim: delete sketch entity at index ${index}`);
    em.line(
      `If oSketch.SketchEntities.Count >= ${index} Then oSketch.SketchEntities.Item(${index}).Delete`
    );
  }

  private emitSketchExtend(op: CADOperation, em: CADEmitter): void {
    // Functional extend = move endpoint of target line to the target point.
    const index = this.requireArg<number>(op, "entity_index", "number");
    const endpoint = this.optionalArg<string>(op, "endpoint", "end"); // "start" | "end"
    const tx = this.requireArg<number>(op, "target_x", "number");
    const ty = this.requireArg<number>(op, "target_y", "number");

    const endpointRef =
      endpoint === "start" ? "StartSketchPoint" : "EndSketchPoint";
    em.line(`' Extend line ${index} endpoint ${endpoint} to (${tx}, ${ty})`);
    em.line(
      `oSketch.SketchLines.Item(${index}).${endpointRef}.MoveTo(oApp.TransientGeometry.CreatePoint2d(${tx}, ${ty}))`
    );
  }

  private emitSketchDimension(op: CADOperation, em: CADEmitter): void {
    const value = this.requireArg<number>(op, "value", "number");
    const name = this.optionalArg<string>(op, "name", "");

    em.line(
      `Dim oDim As DimensionConstraint = oSketch.DimensionConstraints.AddTwoPointDistance(oSketch.SketchEntities.Item(1).StartSketchPoint, oSketch.SketchEntities.Item(1).EndSketchPoint, DimensionOrientationEnum.kAlignedDim, oApp.TransientGeometry.CreatePoint2d(0, 0))`
    );
    em.line(`oDim.Parameter.Value = ${value}`);
    if (name) {
      em.line(`oDim.Parameter.Name = "${name}"`);
    }
  }

  private emitSketchConstraint(op: CADOperation, em: CADEmitter): void {
    // Inventor GeometricConstraints API maps each type to a distinct Add* call.
    // Reference: Autodesk Inventor API Help / GeometricConstraints object.
    const type = this.requireArg<string>(op, "type", "string");
    const idxA = this.requireArg<number>(op, "entity_a", "number");
    const idxB = this.optionalArg<number>(op, "entity_b", 0);
    const normalized = type.toLowerCase();

    const singleEntity = new Set([
      "horizontal",
      "vertical",
      "fix",
      "ground",
    ]);
    const pairEntity = new Set([
      "parallel",
      "perpendicular",
      "coincident",
      "concentric",
      "tangent",
      "equal",
      "collinear",
      "smooth",
    ]);

    em.line(`' Add ${normalized} constraint`);
    if (singleEntity.has(normalized)) {
      const callMap: Record<string, string> = {
        horizontal: "AddHorizontal",
        vertical: "AddVertical",
        fix: "AddGround",
        ground: "AddGround",
      };
      em.line(
        `oSketch.GeometricConstraints.${callMap[normalized]}(oSketch.SketchEntities.Item(${idxA}))`
      );
    } else if (pairEntity.has(normalized)) {
      if (idxB <= 0) {
        throw new Error(
          `sketch_constraint '${normalized}' requires entity_b (1-based index)`
        );
      }
      const callMap: Record<string, string> = {
        parallel: "AddParallel",
        perpendicular: "AddPerpendicular",
        coincident: "AddCoincident",
        concentric: "AddConcentric",
        tangent: "AddTangent",
        equal: "AddEqualLength",
        collinear: "AddCollinear",
        smooth: "AddSmooth",
      };
      em.line(
        `oSketch.GeometricConstraints.${callMap[normalized]}(oSketch.SketchEntities.Item(${idxA}), oSketch.SketchEntities.Item(${idxB}))`
      );
    } else {
      throw new Error(
        `sketch_constraint: unknown type '${type}' (valid: horizontal, vertical, fix, parallel, perpendicular, coincident, concentric, tangent, equal, collinear, smooth)`
      );
    }
  }

  // ── Feature Emission ────────────────────────────────────────────────────────

  private emitFeatureExtrude(op: CADOperation, em: CADEmitter): void {
    const length = this.requireArg<number>(op, "length", "number");
    const symmetric = this.optionalArg<boolean>(op, "symmetric", false);
    const direction = this.optionalArg<string>(op, "direction", "positive");

    this.featureCounter++;
    em.line(`' Extrude feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("oProfile = oSketch.Profiles.AddForSolid()");

    if (symmetric) {
      em.line(
        `oFeature = oDef.Features.ExtrudeFeatures.AddByDistanceExtent(oProfile, ${length / 2}, PartFeatureExtentDirectionEnum.kSymmetricExtentDirection, PartFeatureOperationEnum.kJoinOperation)`
      );
    } else {
      const dir =
        direction === "negative"
          ? "PartFeatureExtentDirectionEnum.kNegativeExtentDirection"
          : "PartFeatureExtentDirectionEnum.kPositiveExtentDirection";
      em.line(
        `oFeature = oDef.Features.ExtrudeFeatures.AddByDistanceExtent(oProfile, ${length}, ${dir}, PartFeatureOperationEnum.kJoinOperation)`
      );
    }
  }

  private emitFeatureRevolve(op: CADOperation, em: CADEmitter): void {
    const angle = this.optionalArg<number>(op, "angle", 360);

    this.featureCounter++;
    em.line(`' Revolve feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("oProfile = oSketch.Profiles.AddForSolid()");

    if (angle === 360) {
      em.line(
        "oFeature = oDef.Features.RevolveFeatures.AddFull(oProfile, oSketch.SketchLines.Item(1), PartFeatureOperationEnum.kJoinOperation)"
      );
    } else {
      em.line(
        `oFeature = oDef.Features.RevolveFeatures.AddByAngle(oProfile, oSketch.SketchLines.Item(1), ${angle} * PI / 180, PartFeatureExtentDirectionEnum.kPositiveExtentDirection, PartFeatureOperationEnum.kJoinOperation)`
      );
    }
  }

  private emitFeatureLoft(op: CADOperation, em: CADEmitter): void {
    // Loft needs ≥2 cross-sections (sketch indices, 1-based) plus optional
    // rail sketches. Reference: LoftFeatures.CreateLoftDefinition.
    const sectionSketches = op.args["sections"] as number[] | undefined;
    const railSketches = (op.args["rails"] as number[]) || [];
    const operation = this.optionalArg<string>(op, "operation", "join");

    if (!Array.isArray(sectionSketches) || sectionSketches.length < 2) {
      throw new Error(
        `feature_loft requires 'sections' array of ≥2 sketch indices (got ${sectionSketches?.length ?? 0})`
      );
    }

    const opMap: Record<string, string> = {
      join: "kJoinOperation",
      cut: "kCutOperation",
      intersect: "kIntersectOperation",
      new_body: "kNewBodyOperation",
    };
    const opEnum = opMap[operation] ?? "kJoinOperation";

    this.featureCounter++;
    em.line(`' Loft feature ${this.featureCounter} over ${sectionSketches.length} sections`);
    em.line("_feature_idx += 1");
    em.line("Dim loftSections As ObjectCollection = oApp.TransientObjects.CreateObjectCollection()");
    for (const s of sectionSketches) {
      em.line(
        `loftSections.Add(oDef.Sketches.Item(${s}).Profiles.AddForSolid())`
      );
    }
    if (railSketches.length > 0) {
      em.line("Dim loftRails As ObjectCollection = oApp.TransientObjects.CreateObjectCollection()");
      for (const r of railSketches) {
        em.line(
          `loftRails.Add(oDef.Sketches.Item(${r}).SketchEntities.Item(1))`
        );
      }
      em.line(
        `Dim loftDef As LoftDefinition = oDef.Features.LoftFeatures.CreateLoftDefinition(loftSections, PartFeatureOperationEnum.${opEnum})`
      );
      em.line("loftDef.LoftRails = loftRails");
      em.line("oFeature = oDef.Features.LoftFeatures.Add(loftDef)");
    } else {
      em.line(
        `Dim loftDef As LoftDefinition = oDef.Features.LoftFeatures.CreateLoftDefinition(loftSections, PartFeatureOperationEnum.${opEnum})`
      );
      em.line("oFeature = oDef.Features.LoftFeatures.Add(loftDef)");
    }
  }

  private emitFeatureSweep(op: CADOperation, em: CADEmitter): void {
    // Sweep requires a profile sketch and a path sketch (distinct).
    // Reference: SweepFeatures.AddUsingPath.
    const profileSketch = this.requireArg<number>(op, "profile_sketch", "number");
    const pathSketch = this.requireArg<number>(op, "path_sketch", "number");
    const operation = this.optionalArg<string>(op, "operation", "join");
    const taper = this.optionalArg<number>(op, "taper_angle", 0);

    if (profileSketch === pathSketch) {
      throw new Error(
        `feature_sweep: profile_sketch and path_sketch must be distinct (got ${profileSketch} for both)`
      );
    }

    const opMap: Record<string, string> = {
      join: "kJoinOperation",
      cut: "kCutOperation",
      intersect: "kIntersectOperation",
      new_body: "kNewBodyOperation",
    };
    const opEnum = opMap[operation] ?? "kJoinOperation";

    this.featureCounter++;
    em.line(`' Sweep feature ${this.featureCounter} (profile sketch ${profileSketch}, path sketch ${pathSketch})`);
    em.line("_feature_idx += 1");
    em.line(
      `Dim sweepProfile As Profile = oDef.Sketches.Item(${profileSketch}).Profiles.AddForSolid()`
    );
    em.line(
      `Dim sweepPath As SketchEntity = oDef.Sketches.Item(${pathSketch}).SketchEntities.Item(1)`
    );
    em.line(
      `oFeature = oDef.Features.SweepFeatures.AddUsingPath(sweepProfile, sweepPath, PartFeatureOperationEnum.${opEnum})`
    );
    if (taper !== 0) {
      em.line(`oFeature.TaperAngle.Value = ${taper} * PI / 180`);
    }
  }

  private emitFeatureHole(op: CADOperation, em: CADEmitter): void {
    const diameter = this.requireArg<number>(op, "diameter", "number");
    const depth = this.requireArg<number>(op, "depth", "number");
    const x = this.optionalArg<number>(op, "x", 0);
    const y = this.optionalArg<number>(op, "y", 0);

    this.featureCounter++;
    em.line(`' Hole feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line(
      `Dim holeCenter As Point = oApp.TransientGeometry.CreatePoint(${x}, ${y}, 0)`
    );
    em.line(
      `oFeature = oDef.Features.HoleFeatures.AddDrilledByThroughAllExtent(oDef.Features.Item(oDef.Features.Count).Faces.Item(1), holeCenter, ${diameter})`
    );
    em.line(
      `oFeature.ExtentType = PartFeatureExtentEnum.kDistanceExtent`
    );
    em.line(`oFeature.ExtentDistance.Value = ${depth}`);
  }

  private emitFeaturePocket(op: CADOperation, em: CADEmitter): void {
    const length = this.requireArg<number>(op, "length", "number");

    this.featureCounter++;
    em.line(`' Pocket (cut extrude) feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("oProfile = oSketch.Profiles.AddForSolid()");
    em.line(
      `oFeature = oDef.Features.ExtrudeFeatures.AddByDistanceExtent(oProfile, ${length}, PartFeatureExtentDirectionEnum.kNegativeExtentDirection, PartFeatureOperationEnum.kCutOperation)`
    );
  }

  private emitFeatureFillet(op: CADOperation, em: CADEmitter): void {
    const radius = this.requireArg<number>(op, "radius", "number");

    this.featureCounter++;
    em.line(`' Fillet feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("Dim filletEdges As EdgeCollection");
    em.line("filletEdges = oApp.TransientObjects.CreateEdgeCollection()");
    em.line(
      "For Each oEdge As Edge In oDef.Features.Item(oDef.Features.Count).Edges"
    );
    em.line("    filletEdges.Add(oEdge)");
    em.line("Next");
    em.line(
      `oFeature = oDef.Features.FilletFeatures.AddSimple(filletEdges, ${radius})`
    );
  }

  private emitFeatureChamfer(op: CADOperation, em: CADEmitter): void {
    const distance = this.requireArg<number>(op, "distance", "number");

    this.featureCounter++;
    em.line(`' Chamfer feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("Dim chamferEdges As EdgeCollection");
    em.line("chamferEdges = oApp.TransientObjects.CreateEdgeCollection()");
    em.line(
      "For Each oEdge As Edge In oDef.Features.Item(oDef.Features.Count).Edges"
    );
    em.line("    chamferEdges.Add(oEdge)");
    em.line("Next");
    em.line(
      `oFeature = oDef.Features.ChamferFeatures.AddUsingDistance(chamferEdges, ${distance})`
    );
  }

  private emitFeatureShell(op: CADOperation, em: CADEmitter): void {
    const thickness = this.requireArg<number>(op, "thickness", "number");

    this.featureCounter++;
    em.line(`' Shell feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("Dim shellFaces As FaceCollection");
    em.line("shellFaces = oApp.TransientObjects.CreateFaceCollection()");
    em.line(
      `oFeature = oDef.Features.ShellFeatures.Add(shellFaces, ${thickness}, ShellDirectionEnum.kInsideShellDirection)`
    );
  }

  private emitFeatureDraft(op: CADOperation, em: CADEmitter): void {
    const angle = this.requireArg<number>(op, "angle", "number");

    this.featureCounter++;
    em.line(`' Draft feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("Dim draftFaces As FaceCollection");
    em.line("draftFaces = oApp.TransientObjects.CreateFaceCollection()");
    em.line(
      `oFeature = oDef.Features.FaceFeatures.AddDraftFeature(draftFaces, ${angle} * PI / 180, oDef.WorkPlanes.Item(3))`
    );
  }

  private emitFeatureRib(op: CADOperation, em: CADEmitter): void {
    const thickness = this.requireArg<number>(op, "thickness", "number");

    this.featureCounter++;
    em.line(`' Rib feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("oProfile = oSketch.Profiles.AddForSolid()");
    em.line(
      `oFeature = oDef.Features.RibFeatures.Add(oProfile, ${thickness}, PartFeatureExtentDirectionEnum.kSymmetricExtentDirection)`
    );
  }

  private emitFeatureEmboss(op: CADOperation, em: CADEmitter): void {
    const depth = this.requireArg<number>(op, "depth", "number");

    this.featureCounter++;
    em.line(`' Emboss feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("oProfile = oSketch.Profiles.AddForSolid()");
    em.line(
      `oFeature = oDef.Features.EmbossFeatures.Add(oProfile, ${depth}, EmbossFeatureTypeEnum.kEmbossFromFaceFeatureType)`
    );
  }

  private emitFeatureDecal(op: CADOperation, em: CADEmitter): void {
    // Decal = SketchImage applied to a face. Reference: DecalFeatures.Add.
    const imageFile = this.requireArg<string>(op, "image_file", "string");
    const faceIndex = this.optionalArg<number>(op, "face_index", 1);
    const wrapToFace = this.optionalArg<boolean>(op, "wrap_to_face", false);
    const escaped = imageFile.replace(/\\/g, "\\\\");

    this.featureCounter++;
    em.line(`' Decal feature ${this.featureCounter} from ${imageFile}`);
    em.line("_feature_idx += 1");
    em.line(
      `Dim decalImg As SketchImage = oSketch.SketchImages.Add("${escaped}", oApp.TransientGeometry.CreatePoint2d(0, 0), False, False)`
    );
    em.line(
      `Dim decalFace As Face = oDef.Features.Item(oDef.Features.Count).Faces.Item(${faceIndex})`
    );
    em.line(
      `oFeature = oDef.Features.DecalFeatures.Add(decalImg, decalFace, ${wrapToFace ? "True" : "False"})`
    );
  }

  private emitFeatureThread(op: CADOperation, em: CADEmitter): void {
    const pitch = this.requireArg<number>(op, "pitch", "number");

    this.featureCounter++;
    em.line(`' Thread feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("Dim threadFace As Face");
    em.line(
      "threadFace = oDef.Features.Item(oDef.Features.Count).Faces.Item(1)"
    );
    em.line(
      `oFeature = oDef.Features.ThreadFeatures.Add(threadFace, True, True, ${pitch}, oApp.AssetLibraries.Item(1).ThreadAssets.Item(1))`
    );
  }

  private emitFeatureCoil(op: CADOperation, em: CADEmitter): void {
    const pitch = this.requireArg<number>(op, "pitch", "number");
    const revolutions = this.optionalArg<number>(op, "revolutions", 10);

    this.featureCounter++;
    em.line(`' Coil feature ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line("oProfile = oSketch.Profiles.AddForSolid()");
    em.line(
      `oFeature = oDef.Features.CoilFeatures.AddByPitchAndRevolution(oProfile, oSketch.SketchLines.Item(1), ${pitch}, ${revolutions}, PartFeatureOperationEnum.kJoinOperation)`
    );
  }

  // ── Pattern Emission ────────────────────────────────────────────────────────

  private emitPatternRectangular(op: CADOperation, em: CADEmitter): void {
    const countX = this.optionalArg<number>(op, "count_x", 2);
    const countY = this.optionalArg<number>(op, "count_y", 2);
    const spacingX = this.optionalArg<number>(op, "spacing_x", 10);
    const spacingY = this.optionalArg<number>(op, "spacing_y", 10);

    em.line("' Rectangular pattern");
    em.line("Dim patternFeatures As ObjectCollection");
    em.line("patternFeatures = oApp.TransientObjects.CreateObjectCollection()");
    em.line(
      "patternFeatures.Add(oDef.Features.Item(oDef.Features.Count))"
    );
    em.line(
      `oFeature = oDef.Features.RectangularPatternFeatures.Add(patternFeatures, oDef.WorkAxes.Item(1), ${countX}, ${spacingX}, oDef.WorkAxes.Item(2), ${countY}, ${spacingY})`
    );
  }

  private emitPatternCircular(op: CADOperation, em: CADEmitter): void {
    const count = this.requireArg<number>(op, "count", "number");
    const angle = this.optionalArg<number>(op, "angle", 360);

    em.line("' Circular pattern");
    em.line("Dim patternFeatures As ObjectCollection");
    em.line("patternFeatures = oApp.TransientObjects.CreateObjectCollection()");
    em.line(
      "patternFeatures.Add(oDef.Features.Item(oDef.Features.Count))"
    );
    em.line(
      `oFeature = oDef.Features.CircularPatternFeatures.Add(patternFeatures, oDef.WorkAxes.Item(3), ${count}, ${angle} * PI / 180)`
    );
  }

  private emitPatternLinear(op: CADOperation, em: CADEmitter): void {
    const count = this.requireArg<number>(op, "count", "number");
    const spacing = this.requireArg<number>(op, "spacing", "number");

    em.line("' Linear pattern (1D rectangular)");
    em.line("Dim patternFeatures As ObjectCollection");
    em.line("patternFeatures = oApp.TransientObjects.CreateObjectCollection()");
    em.line(
      "patternFeatures.Add(oDef.Features.Item(oDef.Features.Count))"
    );
    em.line(
      `oFeature = oDef.Features.RectangularPatternFeatures.Add(patternFeatures, oDef.WorkAxes.Item(1), ${count}, ${spacing})`
    );
  }

  private emitPatternMirror(op: CADOperation, em: CADEmitter): void {
    em.line("' Mirror pattern");
    em.line("Dim patternFeatures As ObjectCollection");
    em.line("patternFeatures = oApp.TransientObjects.CreateObjectCollection()");
    em.line(
      "patternFeatures.Add(oDef.Features.Item(oDef.Features.Count))"
    );
    em.line(
      "oFeature = oDef.Features.MirrorFeatures.Add(patternFeatures, oDef.WorkPlanes.Item(1))"
    );
  }

  private emitPatternSketch(op: CADOperation, em: CADEmitter): void {
    em.line("' Sketch-driven pattern");
    em.line("Dim patternFeatures As ObjectCollection");
    em.line("patternFeatures = oApp.TransientObjects.CreateObjectCollection()");
    em.line(
      "patternFeatures.Add(oDef.Features.Item(oDef.Features.Count))"
    );
    em.line(
      "oFeature = oDef.Features.SketchDrivenPatternFeatures.Add(patternFeatures, oSketch)"
    );
  }

  // ── Boolean Emission ────────────────────────────────────────────────────────

  private emitBooleanUnion(op: CADOperation, em: CADEmitter): void {
    em.line("' Boolean union (combine surfaces)");
    em.line(
      "oDef.Features.CombineFeatures.Add(oDef.SurfaceBodies, BooleanTypeEnum.kBooleanTypeUnion)"
    );
  }

  private emitBooleanIntersect(op: CADOperation, em: CADEmitter): void {
    em.line("' Boolean intersect");
    em.line(
      "oDef.Features.CombineFeatures.Add(oDef.SurfaceBodies, BooleanTypeEnum.kBooleanTypeIntersect)"
    );
  }

  private emitBooleanSubtract(op: CADOperation, em: CADEmitter): void {
    em.line("' Boolean subtract");
    em.line(
      "oDef.Features.CombineFeatures.Add(oDef.SurfaceBodies, BooleanTypeEnum.kBooleanTypeDifference)"
    );
  }

  // ── Work Feature Emission ───────────────────────────────────────────────────

  private emitWorkPlane(op: CADOperation, em: CADEmitter): void {
    const offset = this.optionalArg<number>(op, "offset", 0);
    const plane = this.optionalArg<string>(op, "base", "XY");

    const planeMap: Record<string, string> = {
      XY: "oDef.WorkPlanes.Item(3)",
      XZ: "oDef.WorkPlanes.Item(2)",
      YZ: "oDef.WorkPlanes.Item(1)",
    };

    em.line(
      `oWorkPlane = oDef.WorkPlanes.AddByPlaneAndOffset(${planeMap[plane] ?? plane}, ${offset})`
    );
  }

  private emitWorkAxis(op: CADOperation, em: CADEmitter): void {
    em.line("' Create work axis");
    em.line(
      "Dim oAxis As WorkAxis = oDef.WorkAxes.AddByTwoPoints(oApp.TransientGeometry.CreatePoint(0, 0, 0), oApp.TransientGeometry.CreatePoint(0, 0, 100))"
    );
  }

  private emitWorkPoint(op: CADOperation, em: CADEmitter): void {
    const x = this.optionalArg<number>(op, "x", 0);
    const y = this.optionalArg<number>(op, "y", 0);
    const z = this.optionalArg<number>(op, "z", 0);

    em.line(
      `Dim oPoint As WorkPoint = oDef.WorkPoints.AddFixed(oApp.TransientGeometry.CreatePoint(${x}, ${y}, ${z}))`
    );
  }

  // ── Assembly Emission ───────────────────────────────────────────────────────

  private emitAssemblyPlace(op: CADOperation, em: CADEmitter): void {
    const filePath = this.requireArg<string>(op, "file", "string");

    em.line(`' Place component: ${filePath}`);
    em.line(
      `Dim oOcc As ComponentOccurrence = oDef.Occurrences.Add("${filePath.replace(/\\/g, "\\\\")}", oApp.TransientGeometry.CreateMatrix())`
    );
  }

  private emitAssemblyConstrain(op: CADOperation, em: CADEmitter): void {
    // Inventor AssemblyConstraints API: AddMateConstraint / AddAngleConstraint /
    // AddTangentConstraint / AddInsertConstraint / AddFlushConstraint.
    const type = this.optionalArg<string>(op, "type", "mate").toLowerCase();
    const occA = this.requireArg<number>(op, "occurrence_a", "number");
    const occB = this.requireArg<number>(op, "occurrence_b", "number");
    const faceA = this.optionalArg<number>(op, "face_a", 1);
    const faceB = this.optionalArg<number>(op, "face_b", 1);
    const offset = this.optionalArg<number>(op, "offset", 0);
    const angle = this.optionalArg<number>(op, "angle", 0);

    const valid = new Set(["mate", "flush", "angle", "tangent", "insert"]);
    if (!valid.has(type)) {
      throw new Error(
        `assembly_constrain: unknown type '${type}' (valid: mate, flush, angle, tangent, insert)`
      );
    }

    em.line(
      `' ${type} constraint between occurrence ${occA} face ${faceA} and occurrence ${occB} face ${faceB}`
    );
    em.line(
      `Dim faceA${this.featureCounter} As Face = oDef.Occurrences.Item(${occA}).Definition.SurfaceBodies.Item(1).Faces.Item(${faceA})`
    );
    em.line(
      `Dim faceB${this.featureCounter} As Face = oDef.Occurrences.Item(${occB}).Definition.SurfaceBodies.Item(1).Faces.Item(${faceB})`
    );

    switch (type) {
      case "mate":
        em.line(
          `oDef.Constraints.AddMateConstraint(faceA${this.featureCounter}, faceB${this.featureCounter}, ${offset})`
        );
        break;
      case "flush":
        em.line(
          `oDef.Constraints.AddFlushConstraint(faceA${this.featureCounter}, faceB${this.featureCounter}, ${offset})`
        );
        break;
      case "angle":
        em.line(
          `oDef.Constraints.AddAngleConstraint(faceA${this.featureCounter}, faceB${this.featureCounter}, ${angle} * PI / 180)`
        );
        break;
      case "tangent":
        em.line(
          `oDef.Constraints.AddTangentConstraint(faceA${this.featureCounter}, faceB${this.featureCounter}, TangentConstraintSolutionTypeEnum.kTangentInsideSolutionType, ${offset})`
        );
        break;
      case "insert":
        em.line(
          `oDef.Constraints.AddInsertConstraint(oDef.Occurrences.Item(${occA}).Definition.SurfaceBodies.Item(1).Edges.Item(${faceA}), oDef.Occurrences.Item(${occB}).Definition.SurfaceBodies.Item(1).Edges.Item(${faceB}), InsertConstraintAxesOppositionEnum.kOppositeAxesOpposition, ${offset})`
        );
        break;
    }
    this.featureCounter++;
  }

  private emitAssemblyGround(op: CADOperation, em: CADEmitter): void {
    em.line("' Ground component (first occurrence)");
    em.line("oDef.Occurrences.Item(1).Grounded = True");
  }

  private emitAssemblyJoint(op: CADOperation, em: CADEmitter): void {
    // Inventor Joints API (2014+): Joints.CreateRigidJointDefinition /
    // CreateRotationalJointDefinition / CreateSliderJointDefinition /
    // CreateCylindricalJointDefinition / CreatePlanarJointDefinition /
    // CreateBallJointDefinition.
    const type = this.optionalArg<string>(op, "type", "rigid").toLowerCase();
    const occA = this.requireArg<number>(op, "occurrence_a", "number");
    const occB = this.requireArg<number>(op, "occurrence_b", "number");
    const originA = this.optionalArg<number>(op, "origin_a", 1);
    const originB = this.optionalArg<number>(op, "origin_b", 1);

    const factoryMap: Record<string, string> = {
      rigid: "CreateRigidJointDefinition",
      rotational: "CreateRotationalJointDefinition",
      slider: "CreateSliderJointDefinition",
      cylindrical: "CreateCylindricalJointDefinition",
      planar: "CreatePlanarJointDefinition",
      ball: "CreateBallJointDefinition",
    };
    const factory = factoryMap[type];
    if (!factory) {
      throw new Error(
        `assembly_joint: unknown type '${type}' (valid: rigid, rotational, slider, cylindrical, planar, ball)`
      );
    }

    em.line(
      `' ${type} joint between occurrence ${occA} origin ${originA} and occurrence ${occB} origin ${originB}`
    );
    em.line(
      `Dim origA As JointOrigin = oDef.Occurrences.Item(${occA}).JointOrigins.Item(${originA})`
    );
    em.line(
      `Dim origB As JointOrigin = oDef.Occurrences.Item(${occB}).JointOrigins.Item(${originB})`
    );
    em.line(
      `Dim jointDef As JointDefinition = oDef.Joints.${factory}(origA.GeometryProxy, origB.GeometryProxy)`
    );
    em.line("oDef.Joints.Add(jointDef)");
  }

  // ── Parameter Emission ──────────────────────────────────────────────────────

  private emitParameterDeclare(op: CADOperation, em: CADEmitter): void {
    const name = this.requireArg<string>(op, "name", "string");
    const value = this.requireArg<number>(op, "value", "number");
    const unit = this.optionalArg<string>(op, "unit", "mm");

    em.parameter(name, value, unit);
    em.line(`' Parameter: ${name} = ${value} ${unit}`);
    em.line(`Dim ${name} As Double = ${value}`);
    em.line(
      `oDef.Parameters.UserParameters.AddByValue("${name}", ${value}, UnitsTypeEnum.kMillimeterLengthUnits)`
    );
  }

  private emitParameterLink(op: CADOperation, em: CADEmitter): void {
    const source = this.requireArg<string>(op, "source", "string");
    const target = this.requireArg<string>(op, "target", "string");

    em.line(`' Link parameter ${source} to ${target}`);
    em.line(`oDef.Parameters.Item("${target}").Expression = "${source}"`);
  }

  // ── Import/Export Emission ──────────────────────────────────────────────────

  // Inventor TranslatorAddIn class IDs. These are stable across Inventor 2014+.
  // Reference: Autodesk Inventor API Help → ApplicationAddIns.ItemById.
  private static readonly TRANSLATOR_CLASS_IDS = {
    step: "{90AF7F40-0C01-11D5-8E83-0010B541CD80}",
    iges: "{90AF7F44-0C01-11D5-8E83-0010B541CD80}",
    stl: "{533E9A98-FC3B-11D4-8E7E-0010B541CD80}",
    dxf: "{C24E3AC4-122E-11D5-8E91-0010B541CD80}",
  } as const;

  private emitImportStep(op: CADOperation, em: CADEmitter): void {
    const filePath = this.requireArg<string>(op, "file", "string");
    const escaped = filePath.replace(/\\/g, "\\\\");

    em.line(`' Import STEP: ${filePath}`);
    em.line(
      `Dim stepTrans As TranslatorAddIn = CType(oApp.ApplicationAddIns.ItemById("${InventorCADCodeGeneratorEngine.TRANSLATOR_CLASS_IDS.step}"), TranslatorAddIn)`
    );
    em.line(
      "Dim stepCtx As TranslationContext = oApp.TransientObjects.CreateTranslationContext"
    );
    em.line(
      "stepCtx.Type = IOMechanismEnum.kFileBrowseIOMechanism"
    );
    em.line(
      "Dim stepOptions As NameValueMap = oApp.TransientObjects.CreateNameValueMap"
    );
    em.line(
      `Dim stepData As DataMedium = oApp.TransientObjects.CreateDataMedium`
    );
    em.line(`stepData.FileName = "${escaped}"`);
    em.line("Call stepTrans.Open(stepData, stepCtx, stepOptions, oDoc)");
  }

  private emitImportIges(op: CADOperation, em: CADEmitter): void {
    const filePath = this.requireArg<string>(op, "file", "string");
    const escaped = filePath.replace(/\\/g, "\\\\");

    em.line(`' Import IGES: ${filePath}`);
    em.line(
      `Dim igesTrans As TranslatorAddIn = CType(oApp.ApplicationAddIns.ItemById("${InventorCADCodeGeneratorEngine.TRANSLATOR_CLASS_IDS.iges}"), TranslatorAddIn)`
    );
    em.line(
      "Dim igesCtx As TranslationContext = oApp.TransientObjects.CreateTranslationContext"
    );
    em.line("igesCtx.Type = IOMechanismEnum.kFileBrowseIOMechanism");
    em.line(
      "Dim igesOptions As NameValueMap = oApp.TransientObjects.CreateNameValueMap"
    );
    em.line(
      "Dim igesData As DataMedium = oApp.TransientObjects.CreateDataMedium"
    );
    em.line(`igesData.FileName = "${escaped}"`);
    em.line("Call igesTrans.Open(igesData, igesCtx, igesOptions, oDoc)");
  }

  private emitExportStep(op: CADOperation, em: CADEmitter): void {
    const filePath = this.requireArg<string>(op, "file", "string");
    const protocol = this.optionalArg<number>(op, "protocol", 214); // AP214
    const appProtocol = this.optionalArg<number>(op, "application_protocol", 3); // 3 = CD + PMI
    const escaped = filePath.replace(/\\/g, "\\\\");

    em.line(`' Export STEP (AP${protocol}): ${filePath}`);
    em.line(
      `Dim stepExp As TranslatorAddIn = CType(oApp.ApplicationAddIns.ItemById("${InventorCADCodeGeneratorEngine.TRANSLATOR_CLASS_IDS.step}"), TranslatorAddIn)`
    );
    em.line(
      "Dim stepExpCtx As TranslationContext = oApp.TransientObjects.CreateTranslationContext"
    );
    em.line(
      "stepExpCtx.Type = IOMechanismEnum.kFileBrowseIOMechanism"
    );
    em.line(
      "Dim stepExpOpts As NameValueMap = oApp.TransientObjects.CreateNameValueMap"
    );
    em.line(
      `Call stepExpOpts.Add("ApplicationProtocolType", ${appProtocol})`
    );
    em.line(
      `Call stepExpOpts.Add("Author", "PRISM")`
    );
    em.line(
      "Dim stepExpData As DataMedium = oApp.TransientObjects.CreateDataMedium"
    );
    em.line(`stepExpData.FileName = "${escaped}"`);
    em.line(
      "Call stepExp.SaveCopyAs(oDoc, stepExpCtx, stepExpOpts, stepExpData)"
    );
  }

  private emitExportStl(op: CADOperation, em: CADEmitter): void {
    const filePath = this.requireArg<string>(op, "file", "string");
    const binary = this.optionalArg<boolean>(op, "binary", true);
    const units = this.optionalArg<string>(op, "units", "millimeter");
    const resolution = this.optionalArg<string>(op, "resolution", "high"); // high | medium | low | custom
    const escaped = filePath.replace(/\\/g, "\\\\");

    const unitEnum: Record<string, number> = {
      millimeter: 2,
      centimeter: 3,
      meter: 4,
      inch: 5,
      foot: 6,
    };
    const resEnum: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
      custom: 3,
    };

    em.line(`' Export STL (${binary ? "binary" : "ASCII"}): ${filePath}`);
    em.line(
      `Dim stlExp As TranslatorAddIn = CType(oApp.ApplicationAddIns.ItemById("${InventorCADCodeGeneratorEngine.TRANSLATOR_CLASS_IDS.stl}"), TranslatorAddIn)`
    );
    em.line(
      "Dim stlCtx As TranslationContext = oApp.TransientObjects.CreateTranslationContext"
    );
    em.line("stlCtx.Type = IOMechanismEnum.kFileBrowseIOMechanism");
    em.line(
      "Dim stlOpts As NameValueMap = oApp.TransientObjects.CreateNameValueMap"
    );
    em.line(`Call stlOpts.Add("OutputFileType", ${binary ? 0 : 1})`);
    em.line(
      `Call stlOpts.Add("ExportUnits", ${unitEnum[units] ?? 2})`
    );
    em.line(
      `Call stlOpts.Add("Resolution", ${resEnum[resolution] ?? 0})`
    );
    em.line(
      "Dim stlData As DataMedium = oApp.TransientObjects.CreateDataMedium"
    );
    em.line(`stlData.FileName = "${escaped}"`);
    em.line("Call stlExp.SaveCopyAs(oDoc, stlCtx, stlOpts, stlData)");
  }

  private emitExportDxf(op: CADOperation, em: CADEmitter): void {
    const filePath = this.requireArg<string>(op, "file", "string");
    const dxfVersion = this.optionalArg<number>(op, "dxf_version", 2013);
    const explodeText = this.optionalArg<boolean>(op, "explode_text", false);
    const escaped = filePath.replace(/\\/g, "\\\\");

    em.line(`' Export DXF (${dxfVersion}): ${filePath}`);
    em.line(
      `Dim dxfExp As TranslatorAddIn = CType(oApp.ApplicationAddIns.ItemById("${InventorCADCodeGeneratorEngine.TRANSLATOR_CLASS_IDS.dxf}"), TranslatorAddIn)`
    );
    em.line(
      "Dim dxfCtx As TranslationContext = oApp.TransientObjects.CreateTranslationContext"
    );
    em.line("dxfCtx.Type = IOMechanismEnum.kFileBrowseIOMechanism");
    em.line(
      "Dim dxfOpts As NameValueMap = oApp.TransientObjects.CreateNameValueMap"
    );
    em.line(
      `Call dxfOpts.Add("FileVersion", ${dxfVersion})`
    );
    em.line(
      `Call dxfOpts.Add("ExplodeTextIntoPolylines", ${explodeText ? "True" : "False"})`
    );
    em.line(
      "Dim dxfData As DataMedium = oApp.TransientObjects.CreateDataMedium"
    );
    em.line(`dxfData.FileName = "${escaped}"`);
    em.line("Call dxfExp.SaveCopyAs(oDoc, dxfCtx, dxfOpts, dxfData)");
  }

  // ── Sheet Metal Emission ────────────────────────────────────────────────────
  // Inventor sheet metal uses PartDocument with kSheetMetalPartDocumentObject
  // and a ComponentDefinition exposed as SheetMetalComponentDefinition.
  // Reference: Autodesk Inventor API — SheetMetalFeatures object.

  private emitSheetMetalInit(op: CADOperation, em: CADEmitter): void {
    const thickness = this.optionalArg<number>(op, "thickness", 1.5);
    const materialName = this.optionalArg<string>(
      op,
      "material",
      "Default_MM.ipm"
    );
    const kFactor = this.optionalArg<number>(op, "k_factor", 0.44);

    em.line("' Sheet metal part initialization");
    em.line(
      `Dim smDoc As PartDocument = ThisApplication.Documents.Add(kPartDocumentObject, ThisApplication.FileManager.GetTemplateFile(kPartDocumentObject, kDefaultDraftingStandard, kDefault_MeasureUnitsSpecifier, "Sheet Metal.ipt"))`
    );
    em.line(
      "Dim oSmDef As SheetMetalComponentDefinition = CType(smDoc.ComponentDefinition, SheetMetalComponentDefinition)"
    );
    em.line(
      `Dim oStyle As SheetMetalStyle = oSmDef.SheetMetalStyles.Item("${materialName}")`
    );
    em.line("oSmDef.ActiveSheetMetalStyle = oStyle");
    em.line(
      `oSmDef.Thickness.Value = ${thickness}`
    );
    em.line(
      `oSmDef.FlatPatternDef.KFactor.Value = ${kFactor}`
    );
  }

  private emitSheetMetalFace(op: CADOperation, em: CADEmitter): void {
    // Base face = first face feature on a sheet profile.
    const profileSketch = this.optionalArg<number>(op, "profile_sketch", 1);
    const doubleSided = this.optionalArg<boolean>(op, "double_sided", false);

    this.featureCounter++;
    em.line(`' Sheet metal base face ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    em.line(
      `Dim smFaceProfile As Profile = oDef.Sketches.Item(${profileSketch}).Profiles.AddForSolid()`
    );
    em.line(
      `Dim faceDef As FaceFeatureDefinition = oSmDef.FaceFeatures.CreateFaceFeatureDefinition(smFaceProfile)`
    );
    if (doubleSided) {
      em.line("faceDef.BendFromCenterline = True");
    }
    em.line("oFeature = oSmDef.FaceFeatures.Add(faceDef)");
  }

  private emitSheetMetalFlange(op: CADOperation, em: CADEmitter): void {
    // Edge flange — adds flange off one or more edges at angle/length.
    const edgeIndex = this.requireArg<number>(op, "edge_index", "number");
    const length = this.requireArg<number>(op, "length", "number");
    const angle = this.optionalArg<number>(op, "angle", 90);
    const flangeExtent = this.optionalArg<string>(op, "extent", "edge"); // "edge" | "width"

    this.featureCounter++;
    em.line(
      `' Sheet metal flange ${this.featureCounter} on edge ${edgeIndex} (angle ${angle}°, length ${length})`
    );
    em.line("_feature_idx += 1");
    em.line(
      "Dim flangeEdges As EdgeCollection = ThisApplication.TransientObjects.CreateEdgeCollection()"
    );
    em.line(
      `flangeEdges.Add(oSmDef.Features.Item(oSmDef.Features.Count).Edges.Item(${edgeIndex}))`
    );
    em.line(
      `Dim flangeDef As FlangeDefinition = oSmDef.FlangeFeatures.CreateFlangeDefinition(flangeEdges, ${length}, ${angle} * PI / 180)`
    );
    if (flangeExtent === "width") {
      em.line(
        "flangeDef.WidthExtent = oSmDef.FlangeFeatures.CreateWidthExtent(WidthExtentTypeEnum.kTypeWidthWidthExtent)"
      );
    }
    em.line("oFeature = oSmDef.FlangeFeatures.Add(flangeDef)");
  }

  private emitSheetMetalContourFlange(
    op: CADOperation,
    em: CADEmitter
  ): void {
    // Contour flange = flange driven by open sketch profile + edge direction.
    const profileSketch = this.requireArg<number>(op, "profile_sketch", "number");
    const edgeIndex = this.requireArg<number>(op, "edge_index", "number");
    const width = this.optionalArg<number>(op, "width", 25);

    this.featureCounter++;
    em.line(
      `' Sheet metal contour flange ${this.featureCounter} (sketch ${profileSketch}, edge ${edgeIndex})`
    );
    em.line("_feature_idx += 1");
    em.line(
      `Dim cfPath As SketchEntity = oDef.Sketches.Item(${profileSketch}).SketchEntities.Item(1)`
    );
    em.line(
      `Dim cfEdge As Edge = oSmDef.Features.Item(oSmDef.Features.Count).Edges.Item(${edgeIndex})`
    );
    em.line(
      `Dim cfDef As ContourFlangeDefinition = oSmDef.ContourFlangeFeatures.CreateContourFlangeDefinition(cfPath, cfEdge, ${width})`
    );
    em.line("oFeature = oSmDef.ContourFlangeFeatures.Add(cfDef)");
  }

  private emitSheetMetalHem(op: CADOperation, em: CADEmitter): void {
    // Hem types: single, teardrop, rolled, double.
    const edgeIndex = this.requireArg<number>(op, "edge_index", "number");
    const hemType = this.optionalArg<string>(op, "hem_type", "single");
    const gap = this.optionalArg<number>(op, "gap", 0.1);
    const length = this.optionalArg<number>(op, "length", 5);

    const typeMap: Record<string, string> = {
      single: "HemTypeEnum.kSingleHem",
      teardrop: "HemTypeEnum.kTeardropHem",
      rolled: "HemTypeEnum.kRolledHem",
      double: "HemTypeEnum.kDoubleHem",
    };
    const typeEnum = typeMap[hemType];
    if (!typeEnum) {
      throw new Error(
        `sheet_metal_hem: unknown hem_type '${hemType}' (valid: single, teardrop, rolled, double)`
      );
    }

    this.featureCounter++;
    em.line(
      `' Sheet metal hem ${this.featureCounter} (${hemType}) on edge ${edgeIndex}`
    );
    em.line("_feature_idx += 1");
    em.line(
      "Dim hemEdges As EdgeCollection = ThisApplication.TransientObjects.CreateEdgeCollection()"
    );
    em.line(
      `hemEdges.Add(oSmDef.Features.Item(oSmDef.Features.Count).Edges.Item(${edgeIndex}))`
    );
    em.line(
      `Dim hemDef As HemDefinition = oSmDef.HemFeatures.CreateHemDefinition(${typeEnum}, hemEdges)`
    );
    em.line(`hemDef.Gap = ${gap}`);
    em.line(`hemDef.Length = ${length}`);
    em.line("oFeature = oSmDef.HemFeatures.Add(hemDef)");
  }

  private emitSheetMetalBend(op: CADOperation, em: CADEmitter): void {
    // Bend two faces together by edge index + bend angle.
    const edgeIndex = this.requireArg<number>(op, "edge_index", "number");
    const radius = this.optionalArg<number>(op, "radius", 0);

    this.featureCounter++;
    em.line(
      `' Sheet metal bend ${this.featureCounter} on edge ${edgeIndex} (radius ${radius || "default"})`
    );
    em.line("_feature_idx += 1");
    em.line(
      "Dim bendEdges As EdgeCollection = ThisApplication.TransientObjects.CreateEdgeCollection()"
    );
    em.line(
      `bendEdges.Add(oSmDef.Features.Item(oSmDef.Features.Count).Edges.Item(${edgeIndex}))`
    );
    em.line(
      "Dim bendDef As BendDefinition = oSmDef.BendFeatures.CreateBendDefinition(bendEdges)"
    );
    if (radius > 0) {
      em.line(`bendDef.BendRadius.Value = ${radius}`);
    }
    em.line("oFeature = oSmDef.BendFeatures.Add(bendDef)");
  }

  private emitSheetMetalCornerSeam(op: CADOperation, em: CADEmitter): void {
    const edgeA = this.requireArg<number>(op, "edge_a", "number");
    const edgeB = this.requireArg<number>(op, "edge_b", "number");
    const seamType = this.optionalArg<string>(op, "seam_type", "no_overlap");
    const gap = this.optionalArg<number>(op, "gap", 0.1);

    const typeMap: Record<string, string> = {
      no_overlap: "CornerSeamTypeEnum.kCornerSeamNoOverlap",
      overlap: "CornerSeamTypeEnum.kCornerSeamOverlap",
      reverse_overlap: "CornerSeamTypeEnum.kCornerSeamReverseOverlap",
    };
    const typeEnum = typeMap[seamType];
    if (!typeEnum) {
      throw new Error(
        `sheet_metal_corner_seam: unknown seam_type '${seamType}' (valid: no_overlap, overlap, reverse_overlap)`
      );
    }

    this.featureCounter++;
    em.line(
      `' Sheet metal corner seam ${this.featureCounter} (${seamType}) between edges ${edgeA}, ${edgeB}`
    );
    em.line("_feature_idx += 1");
    em.line(
      "Dim csEdges As EdgeCollection = ThisApplication.TransientObjects.CreateEdgeCollection()"
    );
    em.line(
      `csEdges.Add(oSmDef.Features.Item(oSmDef.Features.Count).Edges.Item(${edgeA}))`
    );
    em.line(
      `csEdges.Add(oSmDef.Features.Item(oSmDef.Features.Count).Edges.Item(${edgeB}))`
    );
    em.line(
      `Dim csDef As CornerSeamDefinition = oSmDef.CornerSeamFeatures.CreateCornerSeamDefinition(csEdges, ${typeEnum})`
    );
    em.line(`csDef.Gap.Value = ${gap}`);
    em.line("oFeature = oSmDef.CornerSeamFeatures.Add(csDef)");
  }

  private emitSheetMetalPunch(op: CADOperation, em: CADEmitter): void {
    // Punch inserts an iFeature (.ide file) on a sheet metal face at sketch point.
    const ideFile = this.requireArg<string>(op, "ide_file", "string");
    const sketchPoint = this.optionalArg<number>(op, "sketch_point_index", 1);
    const escaped = ideFile.replace(/\\/g, "\\\\");

    this.featureCounter++;
    em.line(
      `' Sheet metal punch ${this.featureCounter} from iFeature ${ideFile}`
    );
    em.line("_feature_idx += 1");
    em.line(
      `Dim punchDef As PunchToolDefinition = oSmDef.PunchToolFeatures.CreatePunchToolDefinition("${escaped}")`
    );
    em.line(
      `punchDef.InputSketch = oSketch.SketchPoints.Item(${sketchPoint}).Parent`
    );
    em.line("oFeature = oSmDef.PunchToolFeatures.Add(punchDef)");
  }

  private emitSheetMetalUnfold(op: CADOperation, em: CADEmitter): void {
    // Unfold temporarily flattens one or more bends.
    const bendIndices = (op.args["bend_indices"] as number[]) || [];
    if (bendIndices.length === 0) {
      throw new Error(
        "sheet_metal_unfold requires bend_indices (array of 1+ feature indices)"
      );
    }

    this.featureCounter++;
    em.line(
      `' Sheet metal unfold ${this.featureCounter} (${bendIndices.length} bends)`
    );
    em.line("_feature_idx += 1");
    em.line(
      "Dim unfoldObjects As ObjectCollection = ThisApplication.TransientObjects.CreateObjectCollection()"
    );
    for (const idx of bendIndices) {
      em.line(`unfoldObjects.Add(oSmDef.Features.Item(${idx}))`);
    }
    em.line(
      "Dim unfoldStationary As Face = oSmDef.SurfaceBodies.Item(1).Faces.Item(1)"
    );
    em.line(
      "oFeature = oSmDef.UnfoldFeatures.Add(unfoldStationary, unfoldObjects)"
    );
  }

  private emitSheetMetalRefold(op: CADOperation, em: CADEmitter): void {
    const unfoldIndex = this.optionalArg<number>(op, "unfold_index", 0);

    this.featureCounter++;
    em.line(`' Sheet metal refold ${this.featureCounter}`);
    em.line("_feature_idx += 1");
    if (unfoldIndex > 0) {
      em.line(
        `Dim refoldTarget As UnfoldFeature = CType(oSmDef.Features.Item(${unfoldIndex}), UnfoldFeature)`
      );
      em.line(
        "oFeature = oSmDef.RefoldFeatures.Add(refoldTarget.UnfoldedFaces, refoldTarget)"
      );
    } else {
      em.line(
        "' Refold most recent unfold feature"
      );
      em.line(
        "For Each smFeat As PartFeature In oSmDef.Features"
      );
      em.line(
        "    If TypeOf smFeat Is UnfoldFeature Then"
      );
      em.line(
        "        oFeature = oSmDef.RefoldFeatures.Add(CType(smFeat, UnfoldFeature).UnfoldedFaces, CType(smFeat, UnfoldFeature))"
      );
      em.line(
        "    End If"
      );
      em.line("Next");
    }
  }

  // ── Sketch Fillet / Chamfer ─────────────────────────────────────────────────

  private emitSketchFillet(op: CADOperation, em: CADEmitter): void {
    // Reference: SketchArcs.AddByFillet (Inventor API).
    const radius = this.requireArg<number>(op, "radius", "number");
    const lineA = this.requireArg<number>(op, "line_a", "number");
    const lineB = this.requireArg<number>(op, "line_b", "number");

    em.line(`' Sketch fillet radius ${radius} between lines ${lineA} and ${lineB}`);
    em.line(
      `oSketch.SketchArcs.AddByFillet(oSketch.SketchLines.Item(${lineA}), oSketch.SketchLines.Item(${lineB}), ${radius})`
    );
  }

  private emitSketchChamfer(op: CADOperation, em: CADEmitter): void {
    // Reference: SketchLines.AddByChamfer (Inventor API).
    const distance = this.requireArg<number>(op, "distance", "number");
    const lineA = this.requireArg<number>(op, "line_a", "number");
    const lineB = this.requireArg<number>(op, "line_b", "number");

    em.line(`' Sketch chamfer ${distance}mm between lines ${lineA} and ${lineB}`);
    em.line(
      `oSketch.SketchLines.AddByChamfer(oSketch.SketchLines.Item(${lineA}), oSketch.SketchLines.Item(${lineB}), ${distance}, ${distance})`
    );
  }

  // ── Feature Split / Move Face ───────────────────────────────────────────────

  private emitFeatureSplit(op: CADOperation, em: CADEmitter): void {
    // Reference: SplitFeatures.Add (splits body by face or work surface).
    const splitTool = this.requireArg<string>(op, "tool", "string"); // "work_plane" | "surface"
    const toolIndex = this.optionalArg<number>(op, "tool_index", 1);
    const direction = this.optionalArg<string>(op, "direction", "positive");

    const dirMap: Record<string, string> = {
      positive: "PartFeatureExtentDirectionEnum.kPositiveExtentDirection",
      negative: "PartFeatureExtentDirectionEnum.kNegativeExtentDirection",
      both: "PartFeatureExtentDirectionEnum.kSymmetricExtentDirection",
    };
    const dirEnum = dirMap[direction] ?? dirMap.positive;

    this.featureCounter++;
    em.line(`' Split feature ${this.featureCounter} using ${splitTool} ${toolIndex}`);
    em.line("_feature_idx += 1");
    const toolRef =
      splitTool === "work_plane"
        ? `oDef.WorkPlanes.Item(${toolIndex})`
        : `oDef.WorkSurfaces.Item(${toolIndex})`;
    em.line(
      `oFeature = oDef.Features.SplitFeatures.AddSplitPart(${toolRef}, True, ${dirEnum})`
    );
  }

  private emitFeatureMoveFace(op: CADOperation, em: CADEmitter): void {
    // Reference: MoveFaceFeatures.Add (translate or rotate face set).
    const mode = this.optionalArg<string>(op, "mode", "translate"); // "translate" | "rotate"
    const faceIndex = this.requireArg<number>(op, "face_index", "number");
    const dx = this.optionalArg<number>(op, "dx", 0);
    const dy = this.optionalArg<number>(op, "dy", 0);
    const dz = this.optionalArg<number>(op, "dz", 0);
    const angle = this.optionalArg<number>(op, "angle", 0);

    if (mode !== "translate" && mode !== "rotate") {
      throw new Error(
        `feature_move_face: mode must be 'translate' or 'rotate' (got '${mode}')`
      );
    }

    this.featureCounter++;
    em.line(`' Move face ${faceIndex} via ${mode}`);
    em.line("_feature_idx += 1");
    em.line(
      "Dim moveFaces As FaceCollection = oApp.TransientObjects.CreateFaceCollection()"
    );
    em.line(
      `moveFaces.Add(oDef.Features.Item(oDef.Features.Count).Faces.Item(${faceIndex}))`
    );
    if (mode === "translate") {
      em.line(
        `Dim dirVec As UnitVector = oApp.TransientGeometry.CreateUnitVector(${dx}, ${dy}, ${dz})`
      );
      const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
      em.line(
        `oFeature = oDef.Features.MoveFaceFeatures.AddFreeFormTranslate(moveFaces, dirVec, ${mag})`
      );
    } else {
      em.line(
        `Dim rotAxis As WorkAxis = oDef.WorkAxes.Item(1)`
      );
      em.line(
        `oFeature = oDef.Features.MoveFaceFeatures.AddFreeFormRotate(moveFaces, rotAxis, ${angle} * PI / 180)`
      );
    }
  }

  // ── Surface Emission ────────────────────────────────────────────────────────

  private emitSurfaceExtrude(op: CADOperation, em: CADEmitter): void {
    // Reference: ExtrudeFeatures + PartFeatureOperationEnum.kSurfaceOperation.
    const length = this.requireArg<number>(op, "length", "number");
    const direction = this.optionalArg<string>(op, "direction", "positive");
    const dir =
      direction === "negative"
        ? "PartFeatureExtentDirectionEnum.kNegativeExtentDirection"
        : direction === "symmetric"
          ? "PartFeatureExtentDirectionEnum.kSymmetricExtentDirection"
          : "PartFeatureExtentDirectionEnum.kPositiveExtentDirection";

    this.featureCounter++;
    em.line(`' Surface extrude ${this.featureCounter} (length ${length})`);
    em.line("_feature_idx += 1");
    em.line("oProfile = oSketch.Profiles.AddForSurface(oSketch.SketchEntities.Item(1))");
    em.line(
      `oFeature = oDef.Features.ExtrudeFeatures.AddByDistanceExtent(oProfile, ${length}, ${dir}, PartFeatureOperationEnum.kSurfaceOperation)`
    );
  }

  private emitSurfaceStitch(op: CADOperation, em: CADEmitter): void {
    // Reference: StitchFeatures.Add — joins surface bodies into a quilt.
    const surfaceIds = (op.args["surface_indices"] as number[]) || [];
    const tolerance = this.optionalArg<number>(op, "tolerance", 0.001);

    if (surfaceIds.length < 2) {
      throw new Error(
        `surface_stitch requires 'surface_indices' array of ≥2 (got ${surfaceIds.length})`
      );
    }

    this.featureCounter++;
    em.line(`' Stitch ${surfaceIds.length} surface bodies (tol ${tolerance})`);
    em.line("_feature_idx += 1");
    em.line(
      "Dim stitchSurfaces As ObjectCollection = oApp.TransientObjects.CreateObjectCollection()"
    );
    for (const id of surfaceIds) {
      em.line(`stitchSurfaces.Add(oDef.SurfaceBodies.Item(${id}))`);
    }
    em.line(
      `oFeature = oDef.Features.StitchFeatures.Add(stitchSurfaces, ${tolerance}, True)`
    );
  }

  // ── Body Mirror ─────────────────────────────────────────────────────────────

  private emitMirrorBody(op: CADOperation, em: CADEmitter): void {
    // Reference: MirrorFeatures.Add with body selection.
    const bodyIndex = this.optionalArg<number>(op, "body_index", 1);
    const mirrorPlane = this.optionalArg<string>(op, "mirror_plane", "XY");

    const planeMap: Record<string, string> = {
      XY: "oDef.WorkPlanes.Item(3)",
      XZ: "oDef.WorkPlanes.Item(2)",
      YZ: "oDef.WorkPlanes.Item(1)",
    };
    const planeRef = planeMap[mirrorPlane];
    if (!planeRef) {
      throw new Error(
        `mirror_body: mirror_plane must be XY, XZ, or YZ (got '${mirrorPlane}')`
      );
    }

    this.featureCounter++;
    em.line(`' Mirror body ${bodyIndex} across ${mirrorPlane}`);
    em.line("_feature_idx += 1");
    em.line(
      "Dim mirrorBodies As ObjectCollection = oApp.TransientObjects.CreateObjectCollection()"
    );
    em.line(`mirrorBodies.Add(oDef.SurfaceBodies.Item(${bodyIndex}))`);
    em.line(
      `oFeature = oDef.Features.MirrorFeatures.AddByDefinition(oDef.Features.MirrorFeatures.CreateDefinition(mirrorBodies, ${planeRef}))`
    );
  }

  // ── Script Execution ────────────────────────────────────────────────────────

  protected async runScriptBody(
    script: CADScript<string>
  ): Promise<CADExecutionResult> {
    // Write script to temp file
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, script.filename);
    fs.writeFileSync(scriptPath, script.body, "utf-8");

    // In real implementation, this would use InventorAutomationBridge
    // For now, return mock result indicating script was generated
    return {
      ok: true,
      durationMs: 0,
      outputFiles: [scriptPath],
      metrics: {
        // metrics is geometry-only (ICADCodeGenerator geometry metrics).
        operationCount: script.lineage.length,
      },
      // Build warnings (non-fatal) fold into the debug log -- CADExecutionResult has no warnings[].
      log: script.warnings.length ? script.warnings.map((w) => w.message).join("\n") : undefined,
    };
  }
}

// ── Singleton Export ──────────────────────────────────────────────────────────

export const inventorCADCodeGeneratorEngine =
  new InventorCADCodeGeneratorEngine();
