/**
 * Fusion360CADGeneratorAdapter — U-CADC75 (PHASE-6 Fusion 360 Integration)
 *
 * Typed-CADOperation adapter for Autodesk Fusion 360. Extends
 * UnifiedCADCodeGeneratorBase so we get free buildScript pipeline (lineage,
 * warnings, parameter tracking) and validateOutput acceptance rules.
 *
 * Native units: cm + rad. mm/in inputs are converted at emit-time via the
 * caller's unitIn hint (default "mm"). Angles are deg→rad rounded to 6 d.p.
 *
 * This file is a pure parallel implementation to Fusion360CodeGeneratorEngine
 * which keeps the legacy ExtractedAction → Python pipeline. The two surfaces
 * coexist by design:
 *   - Engine: ExtractedAction[] → Python (used by f360_generate_script + replay)
 *   - Adapter: CADOperation[] → Python (used by typed CAD pipeline + UI builders)
 *
 * @module engines/Fusion360CADGeneratorAdapter
 * @milestone CAD-FUSION-FIX
 */

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
import { log } from "../utils/Logger.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Fusion360AdapterContext {
  documentName?: string;
  unitIn?: "mm" | "in" | "cm";
}

// ── Supported operation set ──────────────────────────────────────────────────

const FUSION360_ADAPTER_SUPPORTED_OPS: ReadonlyArray<CADOperationKind> = [
  // Sketch
  "sketch_create", "sketch_close", "sketch_line", "sketch_arc", "sketch_circle",
  "sketch_rectangle", "sketch_polygon", "sketch_spline", "sketch_ellipse",
  "sketch_slot", "sketch_point", "sketch_constraint", "sketch_dimension",
  // Feature (solid)
  "feature_extrude", "feature_revolve", "feature_loft", "feature_sweep",
  "feature_hole", "feature_pocket", "feature_fillet", "feature_chamfer",
  "feature_shell", "feature_draft", "feature_rib", "feature_thread",
  // Boolean
  "boolean_union", "boolean_intersect", "boolean_subtract",
  // Pattern / transform
  "pattern_linear", "pattern_circular", "pattern_mirror",
  "transform_move", "transform_rotate",
  // Datum
  "datum_plane", "datum_axis", "datum_point",
  // Assembly
  "assembly_insert",
  "assembly_mate_concentric",
  "assembly_mate_coincident",
  "assembly_mate_distance",
  "assembly_mate_angle",
  "assembly_mate_parallel",
  // Parameters
  "parameter_declare", "parameter_equation",
  // Import / export
  "import_step", "export_step", "export_stl", "export_iges", "export_dxf",
  // Custom
  "custom",
];

// ── Math + unit helpers ──────────────────────────────────────────────────────

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

function toRad(deg: number): number {
  return round6((deg * Math.PI) / 180);
}

function fmtNum(v: number): string {
  // Cheap "no trailing zeros" formatter. Integer → "5", float → "5.08", etc.
  return Number.isFinite(v) ? v.toString() : "0";
}

function lengthToCm(value: number, unit: "mm" | "in" | "cm"): number {
  switch (unit) {
    case "in": return round6(value * 2.54);
    case "cm": return value;
    case "mm":
    default:   return round6(value / 10);
  }
}

// ── Argument coercion (no Zod — tests want bare TypeError-like throws) ───────

function requireString(op: CADOperation, name: string): string {
  const v = op.args[name];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`op '${op.kind}' missing required string arg '${name}'`);
  }
  return v;
}

function numArg(op: CADOperation, name: string, def = 0): number {
  const v = op.args[name];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

function strArg(op: CADOperation, name: string, def = ""): string {
  const v = op.args[name];
  return typeof v === "string" ? v : def;
}

function boolArg(op: CADOperation, name: string): boolean {
  return op.args[name] === true;
}

function arrArg(op: CADOperation, name: string): ReadonlyArray<number | string> {
  const v = op.args[name];
  return Array.isArray(v) ? (v as ReadonlyArray<number | string>) : [];
}

// ── Adapter class ────────────────────────────────────────────────────────────

export class Fusion360CADGeneratorAdapter extends UnifiedCADCodeGeneratorBase<Fusion360AdapterContext> {
  readonly cadSystem: CADSystemId = "fusion360";

  readonly capabilities: CADCapabilityMatrix = {
    cadSystem: "fusion360",
    supportedOps: new Set(FUSION360_ADAPTER_SUPPORTED_OPS),
    nativeLengthUnit: "cm",
    nativeAngleUnit: "rad",
    requiresSubprocess: true,
    typicalLatencyMs: 1500,
    limits: {
      maxLoftSections: 32,
      maxPatternCount: 1000,
    },
    version: "Fusion 360 (any)",
  };

  protected scriptFilename(ctx: Fusion360AdapterContext | undefined): string {
    if (ctx?.documentName && ctx.documentName.length > 0) {
      const slug = ctx.documentName.replace(/[^A-Za-z0-9_]+/g, "_");
      return `${slug}.py`;
    }
    return "prism_fusion_cad.py";
  }

  protected preamble(
    ctx: Fusion360AdapterContext | undefined,
    emitter: CADEmitter,
  ): void {
    const unit = ctx?.unitIn ?? "mm";
    const docName = ctx?.documentName ?? "";
    emitter.line("# AUTO-GENERATED by PRISM Fusion360CADGeneratorAdapter");
    if (docName) emitter.line(`# Document: ${docName}`);
    emitter.line(`# Input unit: ${unit} (Fusion native: cm + rad)`);
    emitter.line("");
    emitter.line("import adsk.core, adsk.fusion, adsk.cam, traceback");
    emitter.line("import math");
    emitter.line("");
    emitter.line("def run(context):");
    emitter.line("    ui = None");
    emitter.line("    try:");
    emitter.line("        app = adsk.core.Application.get()");
    emitter.line("        ui = app.userInterface");
    emitter.line("        design = adsk.fusion.Design.cast(app.activeProduct)");
    emitter.line("        root = design.rootComponent");
    emitter.line("");
    emitter.indent = "        ";
  }

  protected epilogue(
    _ctx: Fusion360AdapterContext | undefined,
    emitter: CADEmitter,
  ): void {
    emitter.indent = "";
    emitter.line("    except:");
    emitter.line("        if ui:");
    emitter.line("            ui.messageBox('Failed:\\n{}'.format(traceback.format_exc()))");
  }

  // Sketch counter for stable variable names (sk0, sk1, ...)
  private sketchCounter = 0;

  protected emitOp(
    op: CADOperation,
    _idx: number,
    ctx: Fusion360AdapterContext | undefined,
    emitter: CADEmitter,
  ): void {
    const unit = ctx?.unitIn ?? "mm";
    const len = (v: number): string => fmtNum(lengthToCm(v, unit));
    const lenN = (v: number): number => lengthToCm(v, unit);

    switch (op.kind) {
      case "sketch_create": {
        const planeArg = strArg(op, "plane", "xy").toLowerCase();
        const planeProp =
          planeArg === "xz" ? "xZConstructionPlane" :
          planeArg === "yz" ? "yZConstructionPlane" :
          "xYConstructionPlane";
        const sk = `sk${this.sketchCounter++}`;
        emitter.line(`${sk} = root.sketches.add(root.${planeProp})`);
        const name = strArg(op, "name");
        if (name) emitter.line(`${sk}.name = "${name}"`);
        emitter.line(`_active_sketch = ${sk}`);
        return;
      }
      case "sketch_close":
        emitter.line("# sketch_close — finalize active sketch");
        return;
      case "sketch_line": {
        requireString(op, "sketch");
        const x1 = numArg(op, "x1"), y1 = numArg(op, "y1");
        const x2 = numArg(op, "x2"), y2 = numArg(op, "y2");
        emitter.line(
          `_active_sketch.sketchCurves.sketchLines.addByTwoPoints(adsk.core.Point3D.create(${len(x1)}, ${len(y1)}, 0), adsk.core.Point3D.create(${len(x2)}, ${len(y2)}, 0))`,
        );
        return;
      }
      case "sketch_arc": {
        requireString(op, "sketch");
        const cx = numArg(op, "cx"), cy = numArg(op, "cy");
        const r = numArg(op, "radius", 10);
        const sweep = numArg(op, "sweep", 90);
        if (r <= 0) emitter.warn("sketch_arc: radius ≤ 0");
        emitter.line(
          `_active_sketch.sketchCurves.sketchArcs.addByCenterStartSweep(adsk.core.Point3D.create(${len(cx)}, ${len(cy)}, 0), adsk.core.Point3D.create(${len(cx + r)}, ${len(cy)}, 0), ${fmtNum(toRad(sweep))})`,
        );
        return;
      }
      case "sketch_circle": {
        requireString(op, "sketch");
        const cx = numArg(op, "cx"), cy = numArg(op, "cy");
        const r = numArg(op, "radius");
        if (r <= 0) {
          emitter.warn("sketch_circle: radius ≤ 0");
          emitter.line(`# sketch_circle skipped — radius ≤ 0`);
          return;
        }
        emitter.line(
          `_active_sketch.sketchCurves.sketchCircles.addByCenterRadius(adsk.core.Point3D.create(${len(cx)}, ${len(cy)}, 0), ${len(r)})`,
        );
        return;
      }
      case "sketch_rectangle": {
        requireString(op, "sketch");
        // Two argument forms: (x,y,width,height) OR (x1,y1,x2,y2).
        let p1x: number, p1y: number, p2x: number, p2y: number;
        if ("width" in op.args && "height" in op.args) {
          p1x = numArg(op, "x");
          p1y = numArg(op, "y");
          p2x = p1x + numArg(op, "width");
          p2y = p1y + numArg(op, "height");
        } else {
          p1x = numArg(op, "x1");
          p1y = numArg(op, "y1");
          p2x = numArg(op, "x2");
          p2y = numArg(op, "y2");
        }
        emitter.line(
          `_active_sketch.sketchCurves.sketchLines.addTwoPointRectangle(adsk.core.Point3D.create(${len(p1x)}, ${len(p1y)}, 0), adsk.core.Point3D.create(${len(p2x)}, ${len(p2y)}, 0))`,
        );
        return;
      }
      case "sketch_polygon": {
        requireString(op, "sketch");
        const cx = numArg(op, "cx"), cy = numArg(op, "cy");
        const sides = Math.floor(numArg(op, "sides", 6));
        const r = numArg(op, "radius", 10);
        if (sides < 3) {
          emitter.warn("sketch_polygon: sides < 3");
        }
        emitter.line(`_pts = []`);
        emitter.line(`for _i in range(${sides}):`);
        emitter.line(`    _ang = 2 * math.pi * _i / ${sides}`);
        emitter.line(
          `    _pts.append(adsk.core.Point3D.create(${len(cx)} + ${len(r)} * math.cos(_ang), ${len(cy)} + ${len(r)} * math.sin(_ang), 0))`,
        );
        emitter.line(`for _i in range(${sides}):`);
        emitter.line(
          `    _active_sketch.sketchCurves.sketchLines.addByTwoPoints(_pts[_i], _pts[(_i + 1) % ${sides}])`,
        );
        return;
      }
      case "sketch_spline": {
        requireString(op, "sketch");
        const flat = arrArg(op, "points");
        // Convention: points arrive as a flat [x0,y0,x1,y1,...] xy-pair stream.
        // Sketches are 2D in Fusion; z is implicit 0.
        const nums = flat.map((v) => (typeof v === "number" ? v : Number(v)));
        const points: Array<[number, number, number]> = [];
        for (let i = 0; i + 1 < nums.length; i += 2) {
          points.push([nums[i] ?? 0, nums[i + 1] ?? 0, 0]);
        }
        if (points.length < 2) {
          emitter.warn("sketch_spline: need ≥2 points");
        }
        emitter.line(`_spl = adsk.core.ObjectCollection.create()`);
        for (const [x, y, z] of points) {
          emitter.line(
            `_spl.add(adsk.core.Point3D.create(${len(x)}, ${len(y)}, ${len(z)}))`,
          );
        }
        emitter.line(`_active_sketch.sketchCurves.sketchFittedSplines.add(_spl)`);
        return;
      }
      case "sketch_ellipse": {
        requireString(op, "sketch");
        const cx = numArg(op, "cx"), cy = numArg(op, "cy");
        const mx = numArg(op, "majorX", 10), my = numArg(op, "majorY");
        const minor = numArg(op, "minorRadius", 5);
        emitter.line(
          `_active_sketch.sketchCurves.sketchEllipses.add(adsk.core.Point3D.create(${len(cx)}, ${len(cy)}, 0), adsk.core.Point3D.create(${len(cx + mx)}, ${len(cy + my)}, 0), adsk.core.Point3D.create(${len(cx)}, ${len(cy + minor)}, 0))`,
        );
        return;
      }
      case "sketch_slot": {
        requireString(op, "sketch");
        const x1 = numArg(op, "x1"), y1 = numArg(op, "y1");
        const x2 = numArg(op, "x2"), y2 = numArg(op, "y2");
        const w = numArg(op, "width", 5);
        emitter.line(
          `_active_sketch.sketchCurves.sketchLines.addCenterPointSlot(adsk.core.Point3D.create(${len(x1)}, ${len(y1)}, 0), adsk.core.Point3D.create(${len(x2)}, ${len(y2)}, 0), ${len(w)})`,
        );
        return;
      }
      case "sketch_point": {
        requireString(op, "sketch");
        const x = numArg(op, "x"), y = numArg(op, "y");
        emitter.line(
          `_active_sketch.sketchPoints.add(adsk.core.Point3D.create(${len(x)}, ${len(y)}, 0))`,
        );
        return;
      }
      case "sketch_constraint": {
        const t = strArg(op, "type", "coincident");
        emitter.line(`# sketch_constraint: ${t}`);
        return;
      }
      case "sketch_dimension": {
        const v = numArg(op, "value", 0);
        emitter.line(`# sketch_dimension: value=${v}`);
        return;
      }

      case "feature_extrude": {
        requireString(op, "sketch");
        const distance = lenN(numArg(op, "distance"));
        const distance2 = lenN(numArg(op, "distance2"));
        const operation = strArg(op, "operation", "new");
        const endCondition = strArg(op, "endCondition", "blind");
        const direction = strArg(op, "direction", "one_side");
        const reversed = boolArg(op, "reversed");
        const taperAngle = numArg(op, "taperAngle", NaN);
        const taperAngle2 = numArg(op, "taperAngle2", NaN);
        const thinFeature = boolArg(op, "thinFeature");
        const thinThickness = lenN(numArg(op, "thinThickness"));
        const targetSurface = strArg(op, "targetSurface");
        const offsetFromSurface = lenN(numArg(op, "offsetFromSurface"));
        if (numArg(op, "distance") === 0 && endCondition === "blind") {
          emitter.warn("feature_extrude: distance = 0");
        }
        const opMap: Record<string, string> = {
          new: "NewBodyFeatureOperation",
          cut: "CutFeatureOperation",
          join: "JoinFeatureOperation",
          intersect: "IntersectFeatureOperation",
        };
        const fusionOp = opMap[operation] ?? "NewBodyFeatureOperation";
        emitter.line(
          `# Extrude sketch=${strArg(op, "sketch")} distance=${distance}cm operation=${operation} endCondition=${endCondition} direction=${direction}`,
        );
        emitter.line(
          `_ext_in = root.features.extrudeFeatures.createInput(_active_sketch.profiles.item(0), adsk.fusion.FeatureOperations.${fusionOp})`,
        );
        // Direction-first dispatch — symmetric/two_side override endCondition.
        if (direction === "two_side") {
          emitter.line(
            `_ext_in.setTwoSidesDistanceExtent(adsk.core.ValueInput.createByReal(${fmtNum(distance)}), adsk.core.ValueInput.createByReal(${fmtNum(distance2)}))`,
          );
        } else if (direction === "symmetric") {
          emitter.line(
            `_ext_in.setSymmetricExtent(adsk.core.ValueInput.createByReal(${fmtNum(distance)}), True)`,
          );
        } else if (endCondition === "through_all") {
          const ext = reversed ? "NegativeExtentDirection" : "PositiveExtentDirection";
          emitter.line(`_ext_in.setAllExtent(adsk.fusion.ExtentDirections.${ext})`);
        } else if (endCondition === "mid_plane") {
          emitter.line(
            `_ext_in.setSymmetricExtent(adsk.core.ValueInput.createByReal(${fmtNum(distance)}), True)`,
          );
        } else if (endCondition === "up_to_surface") {
          if (targetSurface) {
            emitter.line(
              `_ext_in.setOneSideToExtent(${targetSurface}, False, adsk.core.ValueInput.createByReal(0))`,
            );
          } else {
            emitter.warn("feature_extrude: up_to_surface requires targetSurface — falling back to setAllExtent");
            emitter.line(
              `_ext_in.setAllExtent(adsk.fusion.ExtentDirections.PositiveExtentDirection)`,
            );
          }
        } else if (endCondition === "offset_from_surface") {
          if (targetSurface) {
            emitter.line(
              `_ext_in.setOneSideToExtent(${targetSurface}, False, adsk.core.ValueInput.createByReal(${fmtNum(offsetFromSurface)}))`,
            );
          } else {
            emitter.warn("feature_extrude: offset_from_surface requires targetSurface — falling back to setAllExtent");
            emitter.line(
              `_ext_in.setAllExtent(adsk.fusion.ExtentDirections.PositiveExtentDirection)`,
            );
          }
        } else {
          // blind (default)
          const signed = reversed ? -distance : distance;
          emitter.line(
            `_ext_in.setDistanceExtent(False, adsk.core.ValueInput.createByReal(${fmtNum(signed)}))`,
          );
        }
        if (Number.isFinite(taperAngle)) {
          emitter.line(
            `_ext_in.taperAngle = adsk.core.ValueInput.createByReal(${fmtNum(toRad(taperAngle))})`,
          );
        }
        if (Number.isFinite(taperAngle2) && direction === "two_side") {
          emitter.line(
            `_ext_in.taperAngleTwo = adsk.core.ValueInput.createByReal(${fmtNum(toRad(taperAngle2))})`,
          );
        }
        if (thinFeature) {
          emitter.line(`_ext_in.isSolid = False  # thinThickness=${fmtNum(thinThickness)}cm`);
        }
        emitter.line(`root.features.extrudeFeatures.add(_ext_in)`);
        return;
      }

      case "feature_revolve": {
        requireString(op, "sketch");
        const axis = strArg(op, "axis", "root.zConstructionAxis");
        const angle = numArg(op, "angle", 360);
        const angle2 = numArg(op, "angle2", 0);
        const operation = strArg(op, "operation", "new");
        const endCondition = strArg(op, "endCondition", "blind");
        const direction = strArg(op, "direction", "one_side");
        const thinFeature = boolArg(op, "thinFeature");
        const targetSurface = strArg(op, "targetSurface");
        if (angle <= 0 || angle > 360) {
          emitter.warn(`feature_revolve: angle ${angle} out of (0,360]`);
        }
        const opMap: Record<string, string> = {
          new: "NewBodyFeatureOperation",
          cut: "CutFeatureOperation",
          join: "JoinFeatureOperation",
          intersect: "IntersectFeatureOperation",
        };
        const fusionOp = opMap[operation] ?? "NewBodyFeatureOperation";
        emitter.line(
          `# Revolve sketch=${strArg(op, "sketch")} angle=${angle}° operation=${operation} endCondition=${endCondition} direction=${direction}`,
        );
        emitter.line(
          `_rev_in = root.features.revolveFeatures.createInput(_active_sketch.profiles.item(0), ${axis}, adsk.fusion.FeatureOperations.${fusionOp})`,
        );
        if (direction === "symmetric") {
          emitter.line(
            `_rev_in.setAngleExtent(True, adsk.core.ValueInput.createByReal(${fmtNum(toRad(angle))}))`,
          );
        } else if (endCondition === "mid_plane") {
          emitter.line(
            `_rev_in.setAngleExtent(True, adsk.core.ValueInput.createByReal(${fmtNum(toRad(angle))}))`,
          );
        } else if (endCondition === "two_direction") {
          emitter.line(
            `_rev_in.setTwoSideAngleExtent(adsk.core.ValueInput.createByReal(${fmtNum(toRad(angle))}), adsk.core.ValueInput.createByReal(${fmtNum(toRad(angle2))}))`,
          );
        } else if (endCondition === "up_to_surface") {
          if (targetSurface) {
            emitter.line(`_rev_in.setOneSideToExtent(${targetSurface}, False)`);
          } else {
            emitter.warn("feature_revolve: up_to_surface requires targetSurface — falling back to setAngleExtent");
            emitter.line(
              `_rev_in.setAngleExtent(False, adsk.core.ValueInput.createByReal(${fmtNum(toRad(angle))}))`,
            );
          }
        } else {
          emitter.line(
            `_rev_in.setAngleExtent(False, adsk.core.ValueInput.createByReal(${fmtNum(toRad(angle))}))`,
          );
        }
        if (thinFeature) emitter.line(`_rev_in.isSolid = False`);
        emitter.line(`root.features.revolveFeatures.add(_rev_in)`);
        return;
      }

      case "feature_loft": {
        const profiles = arrArg(op, "profiles");
        if (profiles.length < 2) {
          emitter.warn("feature_loft: need ≥2 profiles");
        }
        emitter.line(`_loft_in = root.features.loftFeatures.createInput(adsk.fusion.FeatureOperations.NewBodyFeatureOperation)`);
        for (const p of profiles) {
          emitter.line(`_loft_in.loftSections.add(${typeof p === "string" ? p : `"${String(p)}"`})`);
        }
        emitter.line(`root.features.loftFeatures.add(_loft_in)`);
        return;
      }

      case "feature_sweep": {
        const profile = strArg(op, "profile", "prof");
        const path = strArg(op, "path", "path");
        emitter.line(`_path = root.features.createPath(${path})`);
        emitter.line(
          `_sw_in = root.features.sweepFeatures.createInput(${profile}, _path, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)`,
        );
        emitter.line(`root.features.sweepFeatures.add(_sw_in)`);
        return;
      }

      case "feature_hole": {
        const dia = numArg(op, "diameter", 6);
        const depth = op.args.depth;
        if (dia <= 0) emitter.warn("feature_hole: diameter ≤ 0");
        emitter.line(
          `_hole_in = root.features.holeFeatures.createSimpleInput(adsk.core.ValueInput.createByReal(${fmtNum(lenN(dia))}))`,
        );
        if (depth === "through") {
          emitter.line(`_hole_in.setAllExtent(adsk.fusion.ExtentDirections.PositiveExtentDirection)`);
        } else {
          const d = typeof depth === "number" ? depth : 10;
          emitter.line(
            `_hole_in.setDistanceExtent(adsk.core.ValueInput.createByReal(${fmtNum(lenN(d))}))`,
          );
        }
        emitter.line(`root.features.holeFeatures.add(_hole_in)`);
        return;
      }

      case "feature_pocket": {
        requireString(op, "sketch");
        const depth = lenN(numArg(op, "depth", 5));
        emitter.line(
          `_pkt_in = root.features.extrudeFeatures.createInput(_active_sketch.profiles.item(0), adsk.fusion.FeatureOperations.CutFeatureOperation)`,
        );
        emitter.line(
          `_pkt_in.setDistanceExtent(False, adsk.core.ValueInput.createByReal(${fmtNum(-depth)}))`,
        );
        emitter.line(`root.features.extrudeFeatures.add(_pkt_in)`);
        return;
      }

      case "feature_fillet": {
        const edges = arrArg(op, "edges");
        const r = numArg(op, "radius");
        if (edges.length < 1) emitter.warn("feature_fillet: need ≥1 edge");
        emitter.line(`_fill_edges = adsk.core.ObjectCollection.create()`);
        for (const e of edges) emitter.line(`_fill_edges.add(${e})`);
        emitter.line(`_fill_in = root.features.filletFeatures.createInput()`);
        emitter.line(
          `_fill_in.addConstantRadiusEdgeSet(_fill_edges, adsk.core.ValueInput.createByReal(${fmtNum(lenN(r))}), True)`,
        );
        emitter.line(`root.features.filletFeatures.add(_fill_in)`);
        return;
      }

      case "feature_chamfer": {
        const edges = arrArg(op, "edges");
        const dist = numArg(op, "distance", 1);
        emitter.line(`_cf_edges = adsk.core.ObjectCollection.create()`);
        for (const e of edges) emitter.line(`_cf_edges.add(${e})`);
        emitter.line(`_cf_in = root.features.chamferFeatures.createInput(_cf_edges, True)`);
        emitter.line(
          `_cf_in.setToEqualDistance(adsk.core.ValueInput.createByReal(${fmtNum(lenN(dist))}))`,
        );
        emitter.line(`root.features.chamferFeatures.add(_cf_in)`);
        return;
      }

      case "feature_shell": {
        const faces = arrArg(op, "faces");
        const t = numArg(op, "thickness");
        if (t <= 0) emitter.warn("feature_shell: thickness ≤ 0");
        emitter.line(`_sh_faces = adsk.core.ObjectCollection.create()`);
        for (const f of faces) emitter.line(`_sh_faces.add(${f})`);
        emitter.line(`_sh_in = root.features.shellFeatures.createInput(_sh_faces, False)`);
        emitter.line(
          `_sh_in.insideThickness = adsk.core.ValueInput.createByReal(${fmtNum(lenN(t))})`,
        );
        emitter.line(`root.features.shellFeatures.add(_sh_in)`);
        return;
      }

      case "feature_draft": {
        const faces = arrArg(op, "faces");
        const angle = numArg(op, "angle", 3);
        emitter.line(`_dr_faces = adsk.core.ObjectCollection.create()`);
        for (const f of faces) emitter.line(`_dr_faces.add(${f})`);
        emitter.line(
          `# pressPullFeatures draft: angle=${angle}° → ${fmtNum(toRad(angle))} rad`,
        );
        emitter.line(`_dr_in = root.features.pressPullFeatures.createInput(_dr_faces)`);
        emitter.line(
          `_dr_in.angle = adsk.core.ValueInput.createByReal(${fmtNum(toRad(angle))})`,
        );
        emitter.line(`root.features.pressPullFeatures.add(_dr_in)`);
        return;
      }

      case "feature_rib":
        emitter.line(`# feature_rib stub — Fusion ribFeatures is sketch-driven; manual emit required`);
        emitter.warn("feature_rib stub — manual implementation required");
        return;
      case "feature_thread":
        emitter.line(`# feature_thread stub — Fusion threadFeatures requires face selection`);
        emitter.warn("feature_thread stub — manual implementation required");
        return;

      case "boolean_union":
      case "boolean_subtract":
      case "boolean_intersect": {
        const target = requireString(op, "target");
        const tool = requireString(op, "tool");
        const fusionOp =
          op.kind === "boolean_subtract" ? "CutFeatureOperation" :
          op.kind === "boolean_intersect" ? "IntersectFeatureOperation" :
          "JoinFeatureOperation";
        emitter.line(`_bool_tools = adsk.core.ObjectCollection.create()`);
        emitter.line(`_bool_tools.add(${tool})`);
        emitter.line(
          `_bool_in = root.features.combineFeatures.createInput(${target}, _bool_tools)`,
        );
        emitter.line(`_bool_in.operation = adsk.fusion.FeatureOperations.${fusionOp}`);
        emitter.line(`root.features.combineFeatures.add(_bool_in)`);
        return;
      }

      case "pattern_linear": {
        const features = arrArg(op, "features");
        const axis1 = strArg(op, "axis1", "root.xConstructionAxis");
        const count1 = numArg(op, "count1", 2);
        const spacing1 = numArg(op, "spacing1", 10);
        const axis2 = strArg(op, "axis2");
        const count2 = numArg(op, "count2", 0);
        const spacing2 = numArg(op, "spacing2", 0);
        if (count1 < 1) emitter.warn(`pattern_linear: count1=${count1} < 1`);
        emitter.line(`_pl_feats = adsk.core.ObjectCollection.create()`);
        for (const f of features) emitter.line(`_pl_feats.add(${f})`);
        emitter.line(
          `_pl_in = root.features.rectangularPatternFeatures.createInput(_pl_feats, ${axis1}, adsk.core.ValueInput.createByString('${count1}'), adsk.core.ValueInput.createByReal(${fmtNum(lenN(spacing1))}), adsk.fusion.PatternDistanceType.SpacingPatternDistanceType)`,
        );
        if (axis2 && count2 > 0) {
          emitter.line(
            `_pl_in.setDirectionTwo(${axis2}, adsk.core.ValueInput.createByString('${count2}'), adsk.core.ValueInput.createByReal(${fmtNum(lenN(spacing2))}))`,
          );
        }
        emitter.line(`root.features.rectangularPatternFeatures.add(_pl_in)`);
        return;
      }

      case "pattern_circular": {
        const features = arrArg(op, "features");
        const axis = strArg(op, "axis", "root.zConstructionAxis");
        const count = numArg(op, "count", 6);
        const angle = numArg(op, "angle", 360);
        emitter.line(`_pc_feats = adsk.core.ObjectCollection.create()`);
        for (const f of features) emitter.line(`_pc_feats.add(${f})`);
        emitter.line(
          `_pc_in = root.features.circularPatternFeatures.createInput(_pc_feats, ${axis})`,
        );
        emitter.line(
          `_pc_in.quantity = adsk.core.ValueInput.createByString('${count}')`,
        );
        emitter.line(
          `_pc_in.totalAngle = adsk.core.ValueInput.createByReal(${fmtNum(toRad(angle))})`,
        );
        emitter.line(`root.features.circularPatternFeatures.add(_pc_in)`);
        return;
      }

      case "pattern_mirror": {
        const features = arrArg(op, "features");
        const plane = strArg(op, "mirrorPlane", "root.xYConstructionPlane");
        emitter.line(`_pm_feats = adsk.core.ObjectCollection.create()`);
        for (const f of features) emitter.line(`_pm_feats.add(${f})`);
        emitter.line(
          `_pm_in = root.features.mirrorFeatures.createInput(_pm_feats, ${plane})`,
        );
        emitter.line(`root.features.mirrorFeatures.add(_pm_in)`);
        return;
      }

      case "transform_move": {
        const body = strArg(op, "body", "body");
        const dx = numArg(op, "dx"), dy = numArg(op, "dy"), dz = numArg(op, "dz");
        emitter.line(`_tm_bodies = adsk.core.ObjectCollection.create()`);
        emitter.line(`_tm_bodies.add(${body})`);
        emitter.line(
          `_tm_in = root.features.moveFeatures.createInput(_tm_bodies, adsk.fusion.TransformTypes.MoveType)`,
        );
        emitter.line(
          `_tm_in.setToMove(adsk.core.Vector3D.create(${fmtNum(lenN(dx))}, ${fmtNum(lenN(dy))}, ${fmtNum(lenN(dz))}))`,
        );
        emitter.line(`root.features.moveFeatures.add(_tm_in)`);
        return;
      }

      case "transform_rotate": {
        const body = strArg(op, "body", "body");
        const axis = strArg(op, "axis", "root.zConstructionAxis");
        const angle = numArg(op, "angle", 90);
        emitter.line(`_tr_bodies = adsk.core.ObjectCollection.create()`);
        emitter.line(`_tr_bodies.add(${body})`);
        emitter.line(
          `_tr_in = root.features.moveFeatures.createInput(_tr_bodies, adsk.fusion.TransformTypes.RotateType)`,
        );
        emitter.line(
          `_tr_in.setToRotate(${axis}, adsk.core.ValueInput.createByReal(${fmtNum(toRad(angle))}))`,
        );
        emitter.line(`root.features.moveFeatures.add(_tr_in)`);
        return;
      }

      case "datum_plane": {
        const dpType = strArg(op, "type", "offset");
        if (dpType === "origin_xy") {
          emitter.line(`_dp = root.xYConstructionPlane`);
          return;
        }
        if (dpType === "origin_xz") {
          emitter.line(`_dp = root.xZConstructionPlane`);
          return;
        }
        if (dpType === "origin_yz") {
          emitter.line(`_dp = root.yZConstructionPlane`);
          return;
        }
        const basePlane = strArg(op, "basePlane", "xy").toLowerCase();
        const baseProp =
          basePlane === "xz" ? "xZConstructionPlane" :
          basePlane === "yz" ? "yZConstructionPlane" :
          "xYConstructionPlane";
        const offset = numArg(op, "offset", 10);
        emitter.line(`_dp_in = root.constructionPlanes.createInput()`);
        emitter.line(
          `_dp_in.setByOffset(root.${baseProp}, adsk.core.ValueInput.createByReal(${fmtNum(lenN(offset))}))`,
        );
        emitter.line(`_dp = root.constructionPlanes.add(_dp_in)`);
        return;
      }

      case "datum_axis": {
        const ax = strArg(op, "axis", "z").toLowerCase();
        const prop =
          ax === "x" ? "xConstructionAxis" :
          ax === "y" ? "yConstructionAxis" :
          "zConstructionAxis";
        emitter.line(`_da = root.${prop}`);
        return;
      }

      case "datum_point": {
        const x = numArg(op, "x"), y = numArg(op, "y"), z = numArg(op, "z");
        emitter.line(`_dpt_in = root.constructionPoints.createInput()`);
        emitter.line(
          `_dpt_in.setByPoint(adsk.core.Point3D.create(${fmtNum(lenN(x))}, ${fmtNum(lenN(y))}, ${fmtNum(lenN(z))}))`,
        );
        emitter.line(`root.constructionPoints.add(_dpt_in)`);
        return;
      }

      case "assembly_insert": {
        emitter.line(
          `_occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())`,
        );
        return;
      }

      case "assembly_mate_concentric":
      case "assembly_mate_coincident":
      case "assembly_mate_parallel": {
        const e1 = requireString(op, "entity1");
        const e2 = requireString(op, "entity2");
        emitter.line(
          `_jg1 = adsk.fusion.JointGeometry.createByPoint(${e1})`,
        );
        emitter.line(
          `_jg2 = adsk.fusion.JointGeometry.createByPoint(${e2})`,
        );
        emitter.line(`_jt_in = root.joints.createInput(_jg1, _jg2)`);
        emitter.line(`_jt_in.setAsRigidJointMotion()`);
        emitter.line(`root.joints.add(_jt_in)`);
        return;
      }

      case "assembly_mate_distance": {
        const e1 = requireString(op, "entity1");
        const e2 = requireString(op, "entity2");
        const d = numArg(op, "distance", 0);
        emitter.line(
          `_jg1 = adsk.fusion.JointGeometry.createByPoint(${e1})`,
        );
        emitter.line(
          `_jg2 = adsk.fusion.JointGeometry.createByPoint(${e2})`,
        );
        emitter.line(`_jt_in = root.joints.createInput(_jg1, _jg2)`);
        emitter.line(
          `_jt_in.setAsSliderJointMotion(adsk.fusion.JointDirections.XAxisJointDirection)`,
        );
        emitter.line(`# slider distance ${fmtNum(lenN(d))}cm`);
        emitter.line(`root.joints.add(_jt_in)`);
        return;
      }

      case "assembly_mate_angle": {
        const e1 = requireString(op, "entity1");
        const e2 = requireString(op, "entity2");
        const ang = numArg(op, "angle", 0);
        emitter.line(
          `_jg1 = adsk.fusion.JointGeometry.createByPoint(${e1})`,
        );
        emitter.line(
          `_jg2 = adsk.fusion.JointGeometry.createByPoint(${e2})`,
        );
        emitter.line(`_jt_in = root.joints.createInput(_jg1, _jg2)`);
        emitter.line(
          `_jt_in.setAsRevoluteJointMotion(adsk.fusion.JointDirections.ZAxisJointDirection)`,
        );
        emitter.line(`# revolute angle ${fmtNum(toRad(ang))} rad`);
        emitter.line(`root.joints.add(_jt_in)`);
        return;
      }

      case "parameter_declare": {
        const name = strArg(op, "name", "param");
        const value = numArg(op, "value", 0);
        const unitS = strArg(op, "unit", unit);
        emitter.line(
          `design.userParameters.add("${name}", adsk.core.ValueInput.createByString("${value} ${unitS}"), "${unitS}", "")`,
        );
        emitter.parameter(name, value, unitS);
        return;
      }

      case "parameter_equation": {
        const name = strArg(op, "name", "param");
        const expr = strArg(op, "expression", "0");
        emitter.line(
          `design.userParameters.itemByName("${name}").expression = "${expr}"`,
        );
        return;
      }

      case "import_step": {
        const path = strArg(op, "path", "");
        emitter.line(`_imp = app.importManager.createSTEPImportOptions("${path}")`);
        emitter.line(`app.importManager.importToTarget(_imp, root)`);
        return;
      }

      case "export_step": {
        const path = strArg(op, "path", "");
        emitter.line(
          `_exp = design.exportManager.createSTEPExportOptions("${path}")`,
        );
        emitter.line(`design.exportManager.execute(_exp)`);
        return;
      }
      case "export_stl": {
        const path = strArg(op, "path", "");
        emitter.line(
          `_exp = design.exportManager.createSTLExportOptions(root, "${path}")`,
        );
        emitter.line(`design.exportManager.execute(_exp)`);
        return;
      }
      case "export_iges": {
        const path = strArg(op, "path", "");
        emitter.line(
          `_exp = design.exportManager.createIGESExportOptions("${path}")`,
        );
        emitter.line(`design.exportManager.execute(_exp)`);
        return;
      }
      case "export_dxf": {
        const path = strArg(op, "path", "");
        emitter.line(
          `_exp = design.exportManager.createDXFExportOptions("${path}")`,
        );
        emitter.line(`design.exportManager.execute(_exp)`);
        return;
      }

      case "custom": {
        const body = strArg(op, "body", "");
        emitter.block(body);
        return;
      }

      default:
        emitter.warn(`unhandled op kind: ${op.kind}`);
    }
  }

  protected async runScriptBody(
    _script: CADScript<string>,
  ): Promise<CADExecutionResult> {
    const isMock =
      process.env.PRISM_CAD_MOCK === "1" ||
      process.env.PRISM_CAD_MOCK === "true";
    if (isMock) {
      log.debug("Fusion360CADGeneratorAdapter: mock execution");
      return {
        ok: true,
        durationMs: 25,
        metrics: {
          volumeMm3: 1000,
          faceCount: 6,
          edgeCount: 12,
          vertexCount: 8,
          boundingBoxMm: [10, 10, 10],
        },
      };
    }
    return {
      ok: false,
      error: "Fusion 360 Python add-in bridge not available — set PRISM_CAD_MOCK=1 for CI",
      durationMs: 0,
    };
  }
}

// ── Singleton export ─────────────────────────────────────────────────────────

export const fusion360CADGeneratorAdapter = new Fusion360CADGeneratorAdapter();
