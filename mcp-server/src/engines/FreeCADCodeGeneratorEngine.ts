/**
 * FreeCADCodeGeneratorEngine — U-CADC05 (PHASE-1)
 *
 * First concrete subclass of UnifiedCADCodeGeneratorBase (U-CADC00). Emits
 * FreeCAD 0.21+ Python scripts covering the Part, PartDesign, Sketcher, and
 * Draft workbenches. Scripts are executable under `FreeCADCmd` (headless)
 * or inside the FreeCAD UI via Macros.
 *
 * Native units: mm + deg (no conversion). FreeCAD's internal geometry kernel
 * is OpenCascade, same as CadQuery, so every sketch coordinate is already
 * a Base.Vector(mm). Unlike Fusion 360 (cm) we do not scale here.
 *
 * Supported operations (declared in capability matrix):
 *   - sketch_create / close / line / arc / circle / rectangle / polygon /
 *     spline / ellipse / slot / point / constraint / dimension
 *   - feature_extrude (Pad), revolve (Revolution), loft (AdditiveLoft),
 *     sweep (AdditivePipe), hole, pocket (Pocket), fillet, chamfer, shell,
 *     draft
 *   - boolean_union / intersect / subtract (Fusion / Common / Cut)
 *   - pattern_linear / circular / mirror (LinearPattern / PolarPattern /
 *     Mirrored)
 *   - transform_move / rotate
 *   - datum_plane / axis / point / coord_system
 *   - import_step / iges / stl ; export_step / iges / stl / dxf
 *   - parameter_declare, parameter_equation (Spreadsheet)
 *   - custom (raw Python block)
 *
 * Execution (runScriptBody): spawns FreeCADCmd in a child process with the
 * emitted .py file. When `PRISM_CAD_MOCK=1` is set in env, returns a
 * deterministic fixture instead — tests and CI run in this mode. Real
 * subprocess integration is exercised by U-CADC06 (FreeCAD Executor Script).
 *
 * @module engines/FreeCADCodeGeneratorEngine
 */

import { spawn } from "node:child_process";
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

// ── Capability set ─────────────────────────────────────────────────────────

const FREECAD_SUPPORTED_OPS: ReadonlyArray<CADOperationKind> = [
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
  // Boolean
  "boolean_union",
  "boolean_intersect",
  "boolean_subtract",
  // Pattern / transform
  "pattern_linear",
  "pattern_circular",
  "pattern_mirror",
  "transform_move",
  "transform_rotate",
  // Datum
  "datum_plane",
  "datum_axis",
  "datum_point",
  "datum_coord_system",
  // Import / export
  "import_step",
  "import_iges",
  "import_stl",
  "export_step",
  "export_iges",
  "export_stl",
  "export_dxf",
  // Parametric
  "parameter_declare",
  "parameter_equation",
  // Utility
  "custom",
];

// ── Context shape ──────────────────────────────────────────────────────────

export interface FreeCADGenerationContext {
  /** Document name. Used in `FreeCAD.newDocument(name)`. */
  documentName?: string;
  /** Absolute path to the FreeCADCmd binary or a python w/ FreeCAD on path. */
  freecadBin?: string;
  /** Optional export path for STEP output in the epilogue. */
  exportPath?: string;
  /** When true, the script assumes a `body` is active (PartDesign mode). */
  partDesignMode?: boolean;
}

// ── The generator ──────────────────────────────────────────────────────────

export class FreeCADCodeGeneratorEngine extends UnifiedCADCodeGeneratorBase<FreeCADGenerationContext> {
  readonly cadSystem: CADSystemId = "freecad";
  readonly capabilities: CADCapabilityMatrix = {
    cadSystem: "freecad",
    supportedOps: new Set(FREECAD_SUPPORTED_OPS),
    nativeLengthUnit: "mm",
    nativeAngleUnit: "deg",
    requiresSubprocess: true,
    typicalLatencyMs: 2_500,
    limits: {
      maxLoftProfiles: 32,
      maxPatternCount: 500,
      maxFilletRadiusMm: 10_000,
    },
  };

  // Subclasses of PRISM's CAD code gens expose a singleton friendly
  // constructor. Allow override of spawner for tests.
  private readonly spawnFn: typeof spawn;

  constructor(opts: { spawnFn?: typeof spawn } = {}) {
    super();
    this.spawnFn = opts.spawnFn ?? spawn;
  }

  // ── Template methods ───────────────────────────────────────────────────

  protected preamble(
    ctx: FreeCADGenerationContext | undefined,
    em: CADEmitter,
  ): void {
    const docName = ctx?.documentName ?? "PRISM_MODEL";
    em.require("FreeCAD");
    em.require("Part");
    em.require("Sketcher");
    em.require("Draft");
    em.require("from FreeCAD import Base");
    em.line("# -*- coding: utf-8 -*-");
    em.line("# PRISM-generated FreeCAD script");
    em.line("import FreeCAD");
    em.line("import Part");
    em.line("import Sketcher");
    em.line("import Draft");
    em.line("from FreeCAD import Base");
    em.line("");
    em.line(`doc = FreeCAD.newDocument(${JSON.stringify(docName)})`);
    if (ctx?.partDesignMode !== false) {
      em.line('body = doc.addObject("PartDesign::Body", "Body")');
    }
    em.line("_sketch_idx = 0");
    em.line("_feature_idx = 0");
    em.line("");
  }

  protected epilogue(
    ctx: FreeCADGenerationContext | undefined,
    em: CADEmitter,
  ): void {
    em.line("");
    em.line("doc.recompute()");
    if (ctx?.exportPath) {
      em.line("");
      em.line(`# Export STEP`);
      em.line(`_targets = [obj for obj in doc.Objects if obj.TypeId != "App::Origin"]`);
      em.line(`Part.export(_targets, ${JSON.stringify(ctx.exportPath)})`);
    }
  }

  protected scriptFilename(ctx: FreeCADGenerationContext | undefined): string {
    return `${ctx?.documentName ?? "prism_model"}.py`;
  }

  protected emitOp(
    op: CADOperation,
    _opIndex: number,
    _ctx: FreeCADGenerationContext | undefined,
    em: CADEmitter,
  ): void {
    switch (op.kind) {
      case "sketch_create":
        this.emitSketchCreate(op, em);
        break;
      case "sketch_close":
        em.line("# sketch closed");
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
      case "sketch_ellipse":
        this.emitSketchEllipse(op, em);
        break;
      case "sketch_slot":
        this.emitSketchSlot(op, em);
        break;
      case "sketch_point":
        this.emitSketchPoint(op, em);
        break;
      case "sketch_constraint":
        this.emitSketchConstraint(op, em);
        break;
      case "sketch_dimension":
        this.emitSketchDimension(op, em);
        break;
      case "feature_extrude":
        this.emitExtrude(op, em);
        break;
      case "feature_revolve":
        this.emitRevolve(op, em);
        break;
      case "feature_loft":
        this.emitLoft(op, em);
        break;
      case "feature_sweep":
        this.emitSweep(op, em);
        break;
      case "feature_hole":
        this.emitHole(op, em);
        break;
      case "feature_pocket":
        this.emitPocket(op, em);
        break;
      case "feature_fillet":
        this.emitFillet(op, em);
        break;
      case "feature_chamfer":
        this.emitChamfer(op, em);
        break;
      case "feature_shell":
        this.emitShell(op, em);
        break;
      case "feature_draft":
        this.emitDraft(op, em);
        break;
      case "boolean_union":
      case "boolean_intersect":
      case "boolean_subtract":
        this.emitBoolean(op, em);
        break;
      case "pattern_linear":
        this.emitPatternLinear(op, em);
        break;
      case "pattern_circular":
        this.emitPatternCircular(op, em);
        break;
      case "pattern_mirror":
        this.emitPatternMirror(op, em);
        break;
      case "transform_move":
        this.emitTransformMove(op, em);
        break;
      case "transform_rotate":
        this.emitTransformRotate(op, em);
        break;
      case "datum_plane":
      case "datum_axis":
      case "datum_point":
      case "datum_coord_system":
        this.emitDatum(op, em);
        break;
      case "import_step":
      case "import_iges":
      case "import_stl":
        this.emitImport(op, em);
        break;
      case "export_step":
      case "export_iges":
      case "export_stl":
      case "export_dxf":
        this.emitExport(op, em);
        break;
      case "parameter_declare":
        this.emitParameterDeclare(op, em);
        break;
      case "parameter_equation":
        this.emitParameterEquation(op, em);
        break;
      case "custom":
        em.block(String(op.args.body ?? "# custom (empty)"));
        break;
      default:
        em.line(`# unhandled op: ${op.kind}`);
        em.warn(`FreeCAD generator has no emitter for ${op.kind}`, "warn");
    }
  }

  // ── Sketch emitters ────────────────────────────────────────────────────

  private emitSketchCreate(op: CADOperation, em: CADEmitter): void {
    const plane = (op.args.plane as string) ?? "XY";
    const name = (op.args.name as string) ?? "";
    em.line(`_sketch_idx += 1`);
    const id = name ? JSON.stringify(name) : `"Sketch_{}".format(_sketch_idx)`;
    em.line(`sketch = body.newObject("Sketcher::SketchObject", ${id})`);
    const planeMap: Record<string, string> = {
      XY: "doc.getObject('XY_Plane') or body.Origin.OutList[3]",
      XZ: "doc.getObject('XZ_Plane') or body.Origin.OutList[4]",
      YZ: "doc.getObject('YZ_Plane') or body.Origin.OutList[5]",
    };
    const planeExpr = planeMap[plane] ?? planeMap.XY!;
    em.line(`sketch.Support = (${planeExpr}, [""])`);
    em.line(`sketch.MapMode = "FlatFace"`);
  }

  private emitSketchLine(op: CADOperation, em: CADEmitter): void {
    const x1 = num(op.args.x1, 0);
    const y1 = num(op.args.y1, 0);
    const x2 = num(op.args.x2, 0);
    const y2 = num(op.args.y2, 0);
    em.line(
      `sketch.addGeometry(Part.LineSegment(Base.Vector(${x1},${y1},0), Base.Vector(${x2},${y2},0)), False)`,
    );
  }

  private emitSketchArc(op: CADOperation, em: CADEmitter): void {
    const cx = num(op.args.cx, 0);
    const cy = num(op.args.cy, 0);
    const r = num(op.args.radius, 1);
    const a1 = num(op.args.startAngleDeg, 0);
    const a2 = num(op.args.endAngleDeg, 90);
    em.line(
      `sketch.addGeometry(Part.ArcOfCircle(Part.Circle(Base.Vector(${cx},${cy},0), Base.Vector(0,0,1), ${r}), ${deg2rad(a1)}, ${deg2rad(a2)}), False)`,
    );
  }

  private emitSketchCircle(op: CADOperation, em: CADEmitter): void {
    const cx = num(op.args.cx, 0);
    const cy = num(op.args.cy, 0);
    const r = num(op.args.radius, 1);
    em.line(
      `sketch.addGeometry(Part.Circle(Base.Vector(${cx},${cy},0), Base.Vector(0,0,1), ${r}), False)`,
    );
  }

  private emitSketchRectangle(op: CADOperation, em: CADEmitter): void {
    const x = num(op.args.x, 0);
    const y = num(op.args.y, 0);
    const w = num(op.args.width, 10);
    const h = num(op.args.height, 10);
    em.line(`# rectangle ${w}×${h} @ (${x},${y})`);
    em.line(
      `sketch.addGeometry(Part.LineSegment(Base.Vector(${x},${y},0), Base.Vector(${x + w},${y},0)), False)`,
    );
    em.line(
      `sketch.addGeometry(Part.LineSegment(Base.Vector(${x + w},${y},0), Base.Vector(${x + w},${y + h},0)), False)`,
    );
    em.line(
      `sketch.addGeometry(Part.LineSegment(Base.Vector(${x + w},${y + h},0), Base.Vector(${x},${y + h},0)), False)`,
    );
    em.line(
      `sketch.addGeometry(Part.LineSegment(Base.Vector(${x},${y + h},0), Base.Vector(${x},${y},0)), False)`,
    );
  }

  private emitSketchPolygon(op: CADOperation, em: CADEmitter): void {
    const cx = num(op.args.cx, 0);
    const cy = num(op.args.cy, 0);
    const r = num(op.args.radius, 10);
    const sides = Math.max(3, num(op.args.sides, 6));
    em.line(
      `# regular polygon sides=${sides} r=${r} @ (${cx},${cy})`,
    );
    em.line(
      `_poly_pts = [Base.Vector(${cx}+${r}*__import__('math').cos(2*__import__('math').pi*i/${sides}), ${cy}+${r}*__import__('math').sin(2*__import__('math').pi*i/${sides}), 0) for i in range(${sides})]`,
    );
    em.line(
      `for _i in range(${sides}): sketch.addGeometry(Part.LineSegment(_poly_pts[_i], _poly_pts[(_i+1)%${sides}]), False)`,
    );
  }

  private emitSketchSpline(op: CADOperation, em: CADEmitter): void {
    const pts = Array.isArray(op.args.points) ? op.args.points : [];
    const tuples: string[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      tuples.push(`Base.Vector(${num(pts[i], 0)},${num(pts[i + 1], 0)},0)`);
    }
    em.line(`sketch.addGeometry(Part.BSplineCurve([${tuples.join(",")}]), False)`);
  }

  private emitSketchEllipse(op: CADOperation, em: CADEmitter): void {
    const cx = num(op.args.cx, 0);
    const cy = num(op.args.cy, 0);
    const major = num(op.args.major, 10);
    const minor = num(op.args.minor, 5);
    em.line(
      `sketch.addGeometry(Part.Ellipse(Base.Vector(${cx + major},${cy},0), Base.Vector(${cx},${cy + minor},0), Base.Vector(${cx},${cy},0)), False)`,
    );
  }

  private emitSketchSlot(op: CADOperation, em: CADEmitter): void {
    const cx = num(op.args.cx, 0);
    const cy = num(op.args.cy, 0);
    const length = num(op.args.length, 20);
    const width = num(op.args.width, 5);
    em.line(`# slot length=${length} width=${width} @ (${cx},${cy})`);
    const x1 = cx - length / 2;
    const x2 = cx + length / 2;
    const r = width / 2;
    em.line(
      `sketch.addGeometry(Part.LineSegment(Base.Vector(${x1},${cy - r},0), Base.Vector(${x2},${cy - r},0)), False)`,
    );
    em.line(
      `sketch.addGeometry(Part.LineSegment(Base.Vector(${x1},${cy + r},0), Base.Vector(${x2},${cy + r},0)), False)`,
    );
    em.line(
      `sketch.addGeometry(Part.ArcOfCircle(Part.Circle(Base.Vector(${x1},${cy},0), Base.Vector(0,0,1), ${r}), ${Math.PI / 2}, ${(3 * Math.PI) / 2}), False)`,
    );
    em.line(
      `sketch.addGeometry(Part.ArcOfCircle(Part.Circle(Base.Vector(${x2},${cy},0), Base.Vector(0,0,1), ${r}), ${-Math.PI / 2}, ${Math.PI / 2}), False)`,
    );
  }

  private emitSketchPoint(op: CADOperation, em: CADEmitter): void {
    const x = num(op.args.x, 0);
    const y = num(op.args.y, 0);
    em.line(`sketch.addGeometry(Part.Point(Base.Vector(${x},${y},0)), True)`);
  }

  private emitSketchConstraint(op: CADOperation, em: CADEmitter): void {
    const kind = String(op.args.kind ?? "Horizontal");
    const geomIdx = num(op.args.geomIdx, 0);
    em.line(`sketch.addConstraint(Sketcher.Constraint(${JSON.stringify(kind)}, ${geomIdx}))`);
  }

  private emitSketchDimension(op: CADOperation, em: CADEmitter): void {
    const kind = String(op.args.kind ?? "Distance");
    const geomIdx = num(op.args.geomIdx, 0);
    const value = num(op.args.value, 10);
    em.line(
      `sketch.addConstraint(Sketcher.Constraint(${JSON.stringify(kind)}, ${geomIdx}, ${value}))`,
    );
  }

  // ── Feature emitters ───────────────────────────────────────────────────

  private emitExtrude(op: CADOperation, em: CADEmitter): void {
    // Backward-compat: old arg was `length`; new arg is `distance`. Both accepted.
    const distance =
      typeof op.args.distance === "number"
        ? op.args.distance
        : this.requireArg<number>(op, "length", "number");
    const a = op.args;
    const endCondition = (a.endCondition as string) ?? "blind";
    const direction = (a.direction as string) ?? (a.midplane === true ? "symmetric" : "one_side");
    const reversed = a.reversed === true;
    const taper = typeof a.taperAngle === "number" ? a.taperAngle : 0;
    const taper2 = typeof a.taperAngle2 === "number" ? a.taperAngle2 : 0;
    const distance2 = typeof a.distance2 === "number" ? a.distance2 : distance;
    const targetSurface = typeof a.targetSurface === "string" ? a.targetSurface : null;
    const thinFeature = a.thinFeature === true;
    const thinThickness = typeof a.thinThickness === "number" ? a.thinThickness : 1;

    // Warnings for contradictory / missing args
    if (distance === 0 && endCondition === "blind") em.warn("feature_extrude distance = 0", "warn");
    if (endCondition === "up_to_surface" && !targetSurface) {
      em.warn("up_to_surface requires targetSurface ref; falling back to through_all", "warn");
    }

    em.parameter(`pad_length_${em.nextLine}`, distance, "mm", op.description);
    em.line(`_feature_idx += 1`);
    em.line(
      `pad = body.newObject("PartDesign::Pad", "Pad_{}".format(_feature_idx))`,
    );
    em.line(`pad.Profile = sketch`);
    em.line(`pad.Length = ${distance}`);

    // PartDesign::Pad.Type enum:
    //   0=Length  1=UpToLast  2=UpToFirst  3=UpToFace  4=TwoLengths  (ThroughAll uses UpToLast)
    const typeMap: Record<string, string> = {
      blind: "Length",
      through_all: "UpToLast",
      up_to_next: "UpToFirst",
      up_to_surface: targetSurface ? "UpToFace" : "UpToLast",
      up_to_body: "UpToLast",
      up_to_vertex: "UpToLast",
      mid_plane: "Length", // handled via Midplane property
      offset_from_surface: targetSurface ? "UpToFace" : "Length",
    };
    const padType = typeMap[endCondition] ?? "Length";
    em.line(`pad.Type = ${JSON.stringify(padType)}`);

    if (direction === "two_side" || endCondition === "two_direction") {
      em.line(`pad.Type = ${JSON.stringify("TwoLengths")}`);
      em.line(`pad.Length2 = ${distance2}`);
    }

    const midplaneFlag = direction === "symmetric" || a.midplane === true;
    em.line(`pad.Midplane = ${py(midplaneFlag)}`);
    em.line(`pad.Reversed = ${py(reversed)}`);

    if (taper !== 0) em.line(`pad.TaperAngle = ${taper}`);
    if (taper2 !== 0) em.line(`pad.TaperAngleRev = ${taper2}`);

    if (targetSurface && (endCondition === "up_to_surface" || endCondition === "offset_from_surface")) {
      em.line(`pad.UpToFace = (doc.getObject(${JSON.stringify(targetSurface)}), [""])`);
      if (endCondition === "offset_from_surface") {
        const offset = typeof a.offsetFromSurface === "number" ? a.offsetFromSurface : 0;
        em.line(`pad.Offset = ${offset}`);
      }
    }

    if (thinFeature) {
      em.line(`# Thin feature — FreeCAD emulates via Offset2D + Pad`);
      em.line(`pad.UseCustomVector = False`);
      em.line(`# thinThickness=${thinThickness}mm (apply via PartDesign::Thickness post-hoc)`);
    }
  }

  private emitRevolve(op: CADOperation, em: CADEmitter): void {
    // Backward-compat: old `angleDeg`, new `angle`. Both accepted.
    const angle =
      typeof op.args.angle === "number"
        ? op.args.angle
        : num(op.args.angleDeg, 360);
    const a = op.args;
    const axis = String(a.axis ?? "Vertical");
    const endCondition = (a.endCondition as string) ?? "angle";
    const direction = (a.direction as string) ?? "ccw";
    const angle2 = typeof a.angle2 === "number" ? a.angle2 : 0;
    const reversed = a.reversed === true || direction === "cw";
    const midplane = direction === "symmetric" || endCondition === "mid_plane" || endCondition === "two_direction";
    const thinFeature = a.thinFeature === true;

    if (angle <= 0 || angle > 360) {
      em.warn(`feature_revolve angle ${angle} out of (0,360]`, "warn");
    }

    em.line(`_feature_idx += 1`);
    em.line(
      `rev = body.newObject("PartDesign::Revolution", "Revolution_{}".format(_feature_idx))`,
    );
    em.line(`rev.Profile = sketch`);

    // Handle endCondition
    switch (endCondition) {
      case "full":
        em.line(`rev.Angle = 360`);
        break;
      case "two_direction":
        em.line(`rev.Angle = ${angle}`);
        em.line(`rev.Angle2 = ${angle2}`);
        em.line(`rev.Type = ${JSON.stringify("TwoAngles")}`);
        break;
      case "up_to_surface": {
        const target = typeof a.targetSurface === "string" ? a.targetSurface : null;
        if (target) {
          em.line(`rev.Type = ${JSON.stringify("UpToFace")}`);
          em.line(`rev.UpToFace = (doc.getObject(${JSON.stringify(target)}), [""])`);
        } else {
          em.warn("up_to_surface without targetSurface; falling back to Angle", "warn");
          em.line(`rev.Angle = ${angle}`);
        }
        break;
      }
      case "mid_plane":
      case "angle":
      default:
        em.line(`rev.Angle = ${angle}`);
    }

    em.line(`rev.Midplane = ${py(midplane)}`);
    em.line(`rev.Reversed = ${py(reversed)}`);
    em.line(`rev.ReferenceAxis = (sketch, [${JSON.stringify(axis)}])`);

    if (thinFeature) {
      const thickness = typeof a.thinThickness === "number" ? a.thinThickness : 1;
      em.line(`# Thin revolve — apply PartDesign::Thickness post-hoc with ${thickness}mm`);
    }
  }

  private emitLoft(op: CADOperation, em: CADEmitter): void {
    const profiles = Array.isArray(op.args.profiles) ? op.args.profiles : [];
    if (profiles.length > (this.capabilities.limits?.maxLoftProfiles ?? 32)) {
      em.warn(
        `Loft profile count ${profiles.length} exceeds limit; truncating`,
        "warn",
      );
    }
    em.line(`_feature_idx += 1`);
    em.line(
      `loft = body.newObject("PartDesign::AdditiveLoft", "Loft_{}".format(_feature_idx))`,
    );
    em.line(`loft.Sections = [${profiles.slice(0, 32).map((p) => `doc.getObject(${JSON.stringify(String(p))})`).join(",")}]`);
  }

  private emitSweep(op: CADOperation, em: CADEmitter): void {
    const path = String(op.args.path ?? "SweepPath");
    em.line(`_feature_idx += 1`);
    em.line(
      `pipe = body.newObject("PartDesign::AdditivePipe", "Sweep_{}".format(_feature_idx))`,
    );
    em.line(`pipe.Profile = sketch`);
    em.line(`pipe.Spine = doc.getObject(${JSON.stringify(path)})`);
  }

  private emitHole(op: CADOperation, em: CADEmitter): void {
    const diameter = num(op.args.diameter, 6);
    const depth = num(op.args.depth, 20);
    em.parameter(`hole_d_${em.nextLine}`, diameter, "mm");
    em.parameter(`hole_depth_${em.nextLine}`, depth, "mm");
    em.line(`_feature_idx += 1`);
    em.line(
      `hole = body.newObject("PartDesign::Hole", "Hole_{}".format(_feature_idx))`,
    );
    em.line(`hole.Profile = sketch`);
    em.line(`hole.Diameter = ${diameter}`);
    em.line(`hole.Depth = ${depth}`);
  }

  private emitPocket(op: CADOperation, em: CADEmitter): void {
    const length = this.requireArg<number>(op, "length", "number");
    em.line(`_feature_idx += 1`);
    em.line(
      `pocket = body.newObject("PartDesign::Pocket", "Pocket_{}".format(_feature_idx))`,
    );
    em.line(`pocket.Profile = sketch`);
    em.line(`pocket.Length = ${length}`);
  }

  private emitFillet(op: CADOperation, em: CADEmitter): void {
    const radius = this.requireArg<number>(op, "radius", "number");
    const maxR = this.capabilities.limits?.maxFilletRadiusMm ?? 10_000;
    if (radius > maxR) {
      em.warn(`Fillet radius ${radius} mm exceeds limit ${maxR} mm`, "warn");
    }
    em.line(`_feature_idx += 1`);
    em.line(
      `fill = body.newObject("PartDesign::Fillet", "Fillet_{}".format(_feature_idx))`,
    );
    em.line(`fill.Radius = ${radius}`);
  }

  private emitChamfer(op: CADOperation, em: CADEmitter): void {
    const size = num(op.args.size, 1);
    em.line(`_feature_idx += 1`);
    em.line(
      `cham = body.newObject("PartDesign::Chamfer", "Chamfer_{}".format(_feature_idx))`,
    );
    em.line(`cham.Size = ${size}`);
  }

  private emitShell(op: CADOperation, em: CADEmitter): void {
    const thickness = num(op.args.thickness, 2);
    em.line(`_feature_idx += 1`);
    em.line(
      `shell = body.newObject("PartDesign::Thickness", "Shell_{}".format(_feature_idx))`,
    );
    em.line(`shell.Value = ${thickness}`);
  }

  private emitDraft(op: CADOperation, em: CADEmitter): void {
    const angle = num(op.args.angleDeg, 5);
    em.line(`_feature_idx += 1`);
    em.line(
      `draft = body.newObject("PartDesign::Draft", "Draft_{}".format(_feature_idx))`,
    );
    em.line(`draft.Angle = ${angle}`);
  }

  private emitBoolean(op: CADOperation, em: CADEmitter): void {
    const kindMap: Record<string, string> = {
      boolean_union: "Part::Fuse",
      boolean_intersect: "Part::Common",
      boolean_subtract: "Part::Cut",
    };
    const type = kindMap[op.kind];
    if (!type) {
      em.warn(`unknown boolean kind ${op.kind}`, "warn");
      return;
    }
    const a = String(op.args.a ?? "Body");
    const b = String(op.args.b ?? "Body001");
    em.line(`_feature_idx += 1`);
    em.line(
      `bool_op = doc.addObject(${JSON.stringify(type)}, "Bool_{}".format(_feature_idx))`,
    );
    em.line(`bool_op.Base = doc.getObject(${JSON.stringify(a)})`);
    em.line(`bool_op.Tool = doc.getObject(${JSON.stringify(b)})`);
  }

  private emitPatternLinear(op: CADOperation, em: CADEmitter): void {
    const count = num(op.args.count, 2);
    const spacing = num(op.args.spacing, 10);
    if (count > (this.capabilities.limits?.maxPatternCount ?? 500)) {
      em.warn(`Pattern count ${count} exceeds limit`, "warn");
    }
    em.line(`_feature_idx += 1`);
    em.line(
      `lpat = body.newObject("PartDesign::LinearPattern", "LinearPattern_{}".format(_feature_idx))`,
    );
    em.line(`lpat.Length = ${count * spacing}`);
    em.line(`lpat.Occurrences = ${count}`);
  }

  private emitPatternCircular(op: CADOperation, em: CADEmitter): void {
    const count = num(op.args.count, 6);
    const angle = num(op.args.angleDeg, 360);
    em.line(`_feature_idx += 1`);
    em.line(
      `cpat = body.newObject("PartDesign::PolarPattern", "PolarPattern_{}".format(_feature_idx))`,
    );
    em.line(`cpat.Angle = ${angle}`);
    em.line(`cpat.Occurrences = ${count}`);
  }

  private emitPatternMirror(_op: CADOperation, em: CADEmitter): void {
    em.line(`_feature_idx += 1`);
    em.line(
      `mpat = body.newObject("PartDesign::Mirrored", "Mirror_{}".format(_feature_idx))`,
    );
  }

  private emitTransformMove(op: CADOperation, em: CADEmitter): void {
    const target = String(op.args.target ?? "Body");
    const dx = num(op.args.dx, 0);
    const dy = num(op.args.dy, 0);
    const dz = num(op.args.dz, 0);
    em.line(
      `doc.getObject(${JSON.stringify(target)}).Placement.Base = Base.Vector(${dx},${dy},${dz})`,
    );
  }

  private emitTransformRotate(op: CADOperation, em: CADEmitter): void {
    const target = String(op.args.target ?? "Body");
    const angle = num(op.args.angleDeg, 0);
    em.line(
      `doc.getObject(${JSON.stringify(target)}).Placement.Rotation = FreeCAD.Rotation(Base.Vector(0,0,1), ${angle})`,
    );
  }

  private emitDatum(op: CADOperation, em: CADEmitter): void {
    const typeMap: Record<string, string> = {
      datum_plane: "PartDesign::Plane",
      datum_axis: "PartDesign::Line",
      datum_point: "PartDesign::Point",
      datum_coord_system: "PartDesign::CoordinateSystem",
    };
    const type = typeMap[op.kind];
    if (!type) return;
    const name = String(op.args.name ?? op.kind.replace("datum_", "Datum_"));
    em.line(`body.newObject(${JSON.stringify(type)}, ${JSON.stringify(name)})`);
  }

  private emitImport(op: CADOperation, em: CADEmitter): void {
    const path = this.requireArg<string>(op, "path", "string");
    em.line(`Part.insert(${JSON.stringify(path)}, doc.Name)`);
  }

  private emitExport(op: CADOperation, em: CADEmitter): void {
    const path = this.requireArg<string>(op, "path", "string");
    const target = String(op.args.target ?? "Body");
    if (op.kind === "export_dxf") {
      em.line(`Draft.exportDXF([doc.getObject(${JSON.stringify(target)})], ${JSON.stringify(path)})`);
    } else {
      em.line(`Part.export([doc.getObject(${JSON.stringify(target)})], ${JSON.stringify(path)})`);
    }
  }

  private emitParameterDeclare(op: CADOperation, em: CADEmitter): void {
    const name = this.requireArg<string>(op, "name", "string");
    const value = op.args.value;
    const unit = String(op.args.unit ?? "mm");
    if (value === undefined || value === null) {
      em.warn(`parameter ${name} missing value`, "warn");
      return;
    }
    em.parameter(name, value as number | string | boolean, unit);
    const pyVal = typeof value === "string" ? JSON.stringify(value) : String(value);
    em.line(`${name} = ${pyVal}  # ${unit}`);
  }

  private emitParameterEquation(op: CADOperation, em: CADEmitter): void {
    const name = this.requireArg<string>(op, "name", "string");
    const expr = this.requireArg<string>(op, "expression", "string");
    em.line(`${name} = ${expr}  # equation`);
  }

  // ── Execute ────────────────────────────────────────────────────────────

  protected async runScriptBody(
    script: CADScript<string>,
  ): Promise<CADExecutionResult> {
    if (process.env.PRISM_CAD_MOCK === "1") {
      return {
        ok: true,
        durationMs: 1,
        metrics: {
          volumeMm3: 1_000,
          boundingBoxMm: [10, 10, 10],
          faceCount: 6,
          edgeCount: 12,
          vertexCount: 8,
        },
      };
    }
    // Real execution: pipe the script to FreeCADCmd.
    // Actual execution harness lives in U-CADC06 (freecad-executor.py); this
    // method exists to satisfy the ICADCodeGenerator contract.
    const started = Date.now();
    const freecad = process.env.FREECAD_BIN ?? "FreeCADCmd";
    return await new Promise<CADExecutionResult>((resolve) => {
      try {
        const proc = this.spawnFn(freecad, ["-c", script.body], {
          stdio: ["pipe", "pipe", "pipe"],
        });
        let out = "";
        let err = "";
        proc.stdout?.on("data", (c: Buffer) => {
          out += c.toString();
        });
        proc.stderr?.on("data", (c: Buffer) => {
          err += c.toString();
        });
        proc.on("error", (e) => {
          resolve({
            ok: false,
            error: `spawn failed: ${e.message}`,
            durationMs: Date.now() - started,
            log: err || out,
          });
        });
        proc.on("close", (code) => {
          resolve({
            ok: code === 0,
            error: code === 0 ? undefined : `FreeCADCmd exited with ${code}`,
            durationMs: Date.now() - started,
            log: (out + err).slice(0, 65536),
          });
        });
      } catch (e) {
        resolve({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          durationMs: Date.now() - started,
        });
      }
    });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const p = parseFloat(v);
    if (!Number.isNaN(p)) return p;
  }
  return fallback;
}

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function py(b: boolean): string {
  return b ? "True" : "False";
}

export const freeCADCodeGeneratorEngine = new FreeCADCodeGeneratorEngine();
