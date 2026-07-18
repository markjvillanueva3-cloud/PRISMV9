/**
 * Fusion360CodeGeneratorEngine — Generates real Fusion 360 Python API scripts
 * from CAD action sequences. Scripts run inside Fusion 360's built-in script
 * editor (Utilities → Scripts and Add-Ins).
 *
 * Key: Fusion 360 uses CENTIMETERS internally (1cm = 10mm).
 * All mm values must be divided by 10 before passing to the API.
 */
import { log } from "../utils/Logger.js";
import type {
  ExtractedAction,
  CADActionType,
} from "./VideoActionExtractorEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export interface Fusion360Script {
  script: string;
  script_name: string;
  operations: string[];
  warnings: string[];
  estimated_complexity: "simple" | "moderate" | "complex";
  requires_active_document: boolean;
  parameter_count: number;
}

export interface Fusion360Operation {
  action_type: CADActionType;
  template: string;
  imports_needed: string[];
  description: string;
  parameter_mapping: Record<string, string>;
}

export interface GenerationContext {
  current_sketch_var: string | null;
  current_body_var: string | null;
  current_component_var: string;
  sketch_counter: number;
  body_counter: number;
  indent: string;
  parametric: boolean;
  parameters: Map<string, { value: number; unit: string; description: string }>;
  needs_edge_helpers: boolean;
  needs_math_import: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────

const MM_TO_CM = 0.1;

function mmToCm(mm: number): number {
  return Math.round(mm * MM_TO_CM * 10000) / 10000;
}

function num(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

function str(v: unknown, fallback: string): string {
  if (typeof v === "string") return v;
  return fallback;
}

function planeToPythonPlane(plane: string): string {
  const p = (plane || "XY").toUpperCase();
  if (p === "XZ") return "root.xZConstructionPlane";
  if (p === "YZ") return "root.yZConstructionPlane";
  return "root.xYConstructionPlane";
}

function safeVarName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[0-9]/, "_$&");
}

// ── Edge Selection Helpers (injected into scripts that need them) ──

const EDGE_HELPER_CODE = `
def select_edges_by_direction(body, direction='Z'):
    """Select edges parallel to given axis."""
    edges = adsk.core.ObjectCollection.create()
    for edge in body.edges:
        sv = edge.startVertex.geometry
        ev = edge.endVertex.geometry
        if direction == 'Z' and abs(sv.x - ev.x) < 0.001 and abs(sv.y - ev.y) < 0.001:
            edges.add(edge)
        elif direction == 'X' and abs(sv.y - ev.y) < 0.001 and abs(sv.z - ev.z) < 0.001:
            edges.add(edge)
        elif direction == 'Y' and abs(sv.x - ev.x) < 0.001 and abs(sv.z - ev.z) < 0.001:
            edges.add(edge)
    return edges

def select_edges_by_position(body, axis='Z', position='top'):
    """Select edges at top/bottom/left/right of body."""
    edges = adsk.core.ObjectCollection.create()
    bb = body.boundingBox
    for edge in body.edges:
        mp_val = (edge.startVertex.geometry.z + edge.endVertex.geometry.z) / 2.0
        if axis == 'Z':
            mp_val = (edge.startVertex.geometry.z + edge.endVertex.geometry.z) / 2.0
            ref = bb.maxPoint.z if position == 'top' else bb.minPoint.z
        elif axis == 'X':
            mp_val = (edge.startVertex.geometry.x + edge.endVertex.geometry.x) / 2.0
            ref = bb.maxPoint.x if position == 'top' else bb.minPoint.x
        else:
            mp_val = (edge.startVertex.geometry.y + edge.endVertex.geometry.y) / 2.0
            ref = bb.maxPoint.y if position == 'top' else bb.minPoint.y
        if abs(mp_val - ref) < 0.001:
            edges.add(edge)
    return edges

def select_all_edges(body):
    """Select all edges of a body."""
    edges = adsk.core.ObjectCollection.create()
    for edge in body.edges:
        edges.add(edge)
    return edges
`;

// ── Operation Templates ────────────────────────────────────────────

const OPERATION_CATALOG: Fusion360Operation[] = [
  // ── Sketch ──
  {
    action_type: "sketch_create",
    template: `{sketch_var} = root.sketches.add({plane})`,
    imports_needed: [],
    description: "Create a new sketch on a construction plane or face",
    parameter_mapping: { plane: "plane" },
  },
  {
    action_type: "sketch_rectangle",
    template: `{sketch_var}.sketchCurves.sketchLines.addTwoPointRectangle(adsk.core.Point3D.create({x1}, {y1}, 0), adsk.core.Point3D.create({x2}, {y2}, 0))`,
    imports_needed: [],
    description: "Draw a rectangle defined by two corner points (cm)",
    parameter_mapping: { width_mm: "width", height_mm: "height", x_mm: "x_offset", y_mm: "y_offset" },
  },
  {
    action_type: "sketch_circle",
    template: `{sketch_var}.sketchCurves.sketchCircles.addByCenterRadius(adsk.core.Point3D.create({cx}, {cy}, 0), {radius})`,
    imports_needed: [],
    description: "Draw a circle by center and radius (cm)",
    parameter_mapping: { radius_mm: "radius", center_x_mm: "cx", center_y_mm: "cy" },
  },
  {
    action_type: "sketch_line",
    template: `{sketch_var}.sketchCurves.sketchLines.addByTwoPoints(adsk.core.Point3D.create({x1}, {y1}, 0), adsk.core.Point3D.create({x2}, {y2}, 0))`,
    imports_needed: [],
    description: "Draw a line between two points (cm)",
    parameter_mapping: { x1_mm: "x1", y1_mm: "y1", x2_mm: "x2", y2_mm: "y2" },
  },
  {
    action_type: "sketch_arc",
    template: `{sketch_var}.sketchCurves.sketchArcs.addByThreePoints(adsk.core.Point3D.create({x1}, {y1}, 0), adsk.core.Point3D.create({x2}, {y2}, 0), adsk.core.Point3D.create({x3}, {y3}, 0))`,
    imports_needed: [],
    description: "Draw an arc through three points (cm)",
    parameter_mapping: { radius_mm: "radius" },
  },
  {
    action_type: "sketch_spline",
    template: `spline_pts = adsk.core.ObjectCollection.create()\n# Add points to spline_pts\n{sketch_var}.sketchCurves.sketchFittedSplines.add(spline_pts)`,
    imports_needed: [],
    description: "Draw a spline through a collection of points",
    parameter_mapping: {},
  },
  {
    action_type: "sketch_dimension",
    template: `{sketch_var}.sketchDimensions.addDistanceDimension({line}.startSketchPoint, {line}.endSketchPoint, adsk.fusion.DimensionOrientations.HorizontalDimensionOrientation, adsk.core.Point3D.create({tx}, {ty}, 0))`,
    imports_needed: [],
    description: "Add a dimension constraint to sketch entities",
    parameter_mapping: {},
  },
  {
    action_type: "sketch_constraint",
    template: `{sketch_var}.geometricConstraints.add{constraint_type}({entity1}, {entity2})`,
    imports_needed: [],
    description: "Add a geometric constraint (coincident, perpendicular, etc.)",
    parameter_mapping: {},
  },
  {
    action_type: "sketch_offset",
    template: `# Offset curves\n{sketch_var}.offset(curves, directionPoint, {offset})`,
    imports_needed: [],
    description: "Offset sketch curves by a distance (cm)",
    parameter_mapping: { offset_mm: "offset" },
  },
  {
    action_type: "sketch_mirror",
    template: `# Mirror sketch entities across a line\n{sketch_var}.mirror(curves, mirrorLine)`,
    imports_needed: [],
    description: "Mirror sketch entities across a line",
    parameter_mapping: {},
  },
  {
    action_type: "sketch_trim",
    template: `# NOTE: Sketch trim is complex in the Fusion 360 API.\n# Manually trim overlapping sketch curves in the Fusion 360 UI.`,
    imports_needed: [],
    description: "Trim sketch entities (requires manual UI interaction)",
    parameter_mapping: {},
  },
  // ── 3D Features ──
  {
    action_type: "extrude",
    template: `prof = {sketch_var}.profiles.item(0)\next_input = root.features.extrudeFeatures.createInput(prof, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)\next_input.setDistanceExtent(False, adsk.core.ValueInput.createByReal({distance}))\n{body_var} = root.features.extrudeFeatures.add(ext_input)`,
    imports_needed: [],
    description: "Extrude a sketch profile to create a new body",
    parameter_mapping: { distance_mm: "distance" },
  },
  {
    action_type: "extrude_cut",
    template: `prof = {sketch_var}.profiles.item(0)\ncut_input = root.features.extrudeFeatures.createInput(prof, adsk.fusion.FeatureOperations.CutFeatureOperation)\ncut_input.setDistanceExtent(False, adsk.core.ValueInput.createByReal({distance}))\nroot.features.extrudeFeatures.add(cut_input)`,
    imports_needed: [],
    description: "Extrude-cut a sketch profile to remove material",
    parameter_mapping: { distance_mm: "distance" },
  },
  {
    action_type: "revolve",
    template: `prof = {sketch_var}.profiles.item(0)\nrev_axis = {sketch_var}.sketchCurves.sketchLines.item(0)\nrev_input = root.features.revolveFeatures.createInput(prof, rev_axis, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)\nrev_angle = adsk.core.ValueInput.createByReal(math.radians({angle}))\nrev_input.setAngleExtent(False, rev_angle)\n{body_var} = root.features.revolveFeatures.add(rev_input)`,
    imports_needed: ["math"],
    description: "Revolve a sketch profile around an axis",
    parameter_mapping: { angle_deg: "angle" },
  },
  {
    action_type: "sweep",
    template: `prof = {sketch_var}.profiles.item(0)\npath_feat = root.features.createPath({path_sketch_var}.sketchCurves.sketchLines.item(0))\nsweep_input = root.features.sweepFeatures.createInput(prof, path_feat, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)\n{body_var} = root.features.sweepFeatures.add(sweep_input)`,
    imports_needed: [],
    description: "Sweep a profile along a path",
    parameter_mapping: {},
  },
  {
    action_type: "loft",
    template: `loft_input = root.features.loftFeatures.createInput(adsk.fusion.FeatureOperations.NewBodyFeatureOperation)\nloft_input.loftSections.add({sketch1_var}.profiles.item(0))\nloft_input.loftSections.add({sketch2_var}.profiles.item(0))\n{body_var} = root.features.loftFeatures.add(loft_input)`,
    imports_needed: [],
    description: "Create a loft between two or more profiles",
    parameter_mapping: {},
  },
  {
    action_type: "shell",
    template: `shell_input = root.features.shellFeatures.createInput()\nshell_faces = adsk.core.ObjectCollection.create()\nshell_faces.add({body_var}.bodies.item(0).faces.item(0))\nshell_input.inputEntities = shell_faces\nshell_input.insideThickness = adsk.core.ValueInput.createByReal({thickness})\nroot.features.shellFeatures.add(shell_input)`,
    imports_needed: [],
    description: "Shell a body by removing faces and adding wall thickness",
    parameter_mapping: { thickness_mm: "thickness" },
  },
  {
    action_type: "hole",
    template: `hole_input = root.features.holeFeatures.createSimpleInput(adsk.core.ValueInput.createByReal({diameter}))\nhole_input.setDistanceExtent(adsk.core.ValueInput.createByReal({depth}))\nhole_input.setPositionByPoint({sketch_var}.profiles.item(0))\nroot.features.holeFeatures.add(hole_input)`,
    imports_needed: [],
    description: "Create a hole feature with diameter and depth (cm)",
    parameter_mapping: { diameter_mm: "diameter", depth_mm: "depth" },
  },
  {
    action_type: "draft",
    template: `# NOTE: Draft features may not be directly available in all Fusion 360 versions.\n# Use Edit → Press Pull with a taper angle, or draftFeatures if available.\n# draft_input = root.features.draftFeatures.createInput(...)\n# Manual UI: Select face → Press Pull → enter taper angle {angle} degrees`,
    imports_needed: [],
    description: "Add draft angle to faces (limited API support)",
    parameter_mapping: { angle_deg: "angle" },
  },
  // ── Modify ──
  {
    action_type: "fillet",
    template: `fillet_input = root.features.filletFeatures.createInput()\nfillet_edges = select_edges_by_direction({body_var}.bodies.item(0), '{direction}')\nfillet_input.addConstantRadiusEdgeSet(fillet_edges, adsk.core.ValueInput.createByReal({radius}), True)\nroot.features.filletFeatures.add(fillet_input)`,
    imports_needed: [],
    description: "Add fillets to edges of a body",
    parameter_mapping: { radius_mm: "radius" },
  },
  {
    action_type: "chamfer",
    template: `chamfer_edges = select_edges_by_direction({body_var}.bodies.item(0), '{direction}')\nchamfer_input = root.features.chamferFeatures.createInput(chamfer_edges, True)\nchamfer_input.setToEqualDistance(adsk.core.ValueInput.createByReal({distance}))\nroot.features.chamferFeatures.add(chamfer_input)`,
    imports_needed: [],
    description: "Add chamfers to edges of a body",
    parameter_mapping: { distance_mm: "distance" },
  },
  {
    action_type: "boolean_union",
    template: `target_body = {body1_var}.bodies.item(0)\ntool_bodies = adsk.core.ObjectCollection.create()\ntool_bodies.add({body2_var}.bodies.item(0))\ncombine_input = root.features.combineFeatures.createInput(target_body, tool_bodies)\ncombine_input.operation = adsk.fusion.FeatureOperations.JoinFeatureOperation\nroot.features.combineFeatures.add(combine_input)`,
    imports_needed: [],
    description: "Boolean union (join) of two bodies",
    parameter_mapping: {},
  },
  {
    action_type: "boolean_subtract",
    template: `target_body = {body1_var}.bodies.item(0)\ntool_bodies = adsk.core.ObjectCollection.create()\ntool_bodies.add({body2_var}.bodies.item(0))\ncombine_input = root.features.combineFeatures.createInput(target_body, tool_bodies)\ncombine_input.operation = adsk.fusion.FeatureOperations.CutFeatureOperation\nroot.features.combineFeatures.add(combine_input)`,
    imports_needed: [],
    description: "Boolean subtraction (cut) of two bodies",
    parameter_mapping: {},
  },
  {
    action_type: "boolean_intersect",
    template: `target_body = {body1_var}.bodies.item(0)\ntool_bodies = adsk.core.ObjectCollection.create()\ntool_bodies.add({body2_var}.bodies.item(0))\ncombine_input = root.features.combineFeatures.createInput(target_body, tool_bodies)\ncombine_input.operation = adsk.fusion.FeatureOperations.IntersectFeatureOperation\nroot.features.combineFeatures.add(combine_input)`,
    imports_needed: [],
    description: "Boolean intersection of two bodies",
    parameter_mapping: {},
  },
  {
    action_type: "mirror_body",
    template: `mirror_entities = adsk.core.ObjectCollection.create()\nmirror_entities.add({body_var}.bodies.item(0))\nmirror_input = root.features.mirrorFeatures.createInput(mirror_entities, {mirror_plane})\nroot.features.mirrorFeatures.add(mirror_input)`,
    imports_needed: [],
    description: "Mirror a body across a plane",
    parameter_mapping: {},
  },
  // ── Pattern ──
  {
    action_type: "pattern_linear",
    template: `pattern_entities = adsk.core.ObjectCollection.create()\npattern_entities.add({body_var}.bodies.item(0))\npattern_input = root.features.rectangularPatternFeatures.createInput(pattern_entities, root.xConstructionAxis, adsk.core.ValueInput.createByString('{count_x}'), adsk.core.ValueInput.createByReal({spacing_x}), adsk.fusion.PatternDistanceType.SpacingPatternDistanceType)\nroot.features.rectangularPatternFeatures.add(pattern_input)`,
    imports_needed: [],
    description: "Create a linear (rectangular) pattern of bodies or features",
    parameter_mapping: { count_x: "count_x", spacing_x_mm: "spacing_x" },
  },
  {
    action_type: "pattern_circular",
    template: `pattern_entities = adsk.core.ObjectCollection.create()\npattern_entities.add({body_var}.bodies.item(0))\npattern_input = root.features.circularPatternFeatures.createInput(pattern_entities, root.zConstructionAxis)\npattern_input.quantity = adsk.core.ValueInput.createByString('{count}')\nroot.features.circularPatternFeatures.add(pattern_input)`,
    imports_needed: [],
    description: "Create a circular pattern of bodies or features",
    parameter_mapping: { count: "count" },
  },
  // ── Assembly ──
  {
    action_type: "assembly_insert",
    template: `transform = adsk.core.Matrix3D.create()\nnew_occ = root.occurrences.addNewComponent(transform)`,
    imports_needed: [],
    description: "Insert a new component into the assembly",
    parameter_mapping: {},
  },
  {
    action_type: "assembly_mate",
    template: `# Create a joint between two components\njoint_geo1 = adsk.fusion.JointGeometry.createByPlanarFace(face1, None, adsk.fusion.JointKeyPointTypes.CenterKeyPoint)\njoint_geo2 = adsk.fusion.JointGeometry.createByPlanarFace(face2, None, adsk.fusion.JointKeyPointTypes.CenterKeyPoint)\njoint_input = root.joints.createInput(joint_geo1, joint_geo2)\njoint_input.setAsRigidJointMotion()\nroot.joints.add(joint_input)`,
    imports_needed: [],
    description: "Create a joint (mate) between two components",
    parameter_mapping: {},
  },
  // ── CAM ──
  {
    action_type: "toolpath_create",
    template: `# CAM setup — requires switching to Manufacturing workspace\n# cam = adsk.cam.CAM.cast(app.activeProduct)\n# setup = cam.setups.add()\n# NOTE: Full CAM API scripting varies by operation type.\n# See Fusion 360 CAM API documentation for detailed setup.`,
    imports_needed: [],
    description: "Create a CAM toolpath setup (reference only)",
    parameter_mapping: {},
  },
  {
    action_type: "toolpath_2d",
    template: `# 2D Toolpath — CAM workspace operation\n# cam = adsk.cam.CAM.cast(app.activeProduct)\n# setup = cam.setups.item(0)\n# input = setup.operations.addByTemplateFile('2d_contour_template')\n# NOTE: 2D operations require selecting geometry and tool parameters.`,
    imports_needed: [],
    description: "Create a 2D CAM toolpath (reference only)",
    parameter_mapping: {},
  },
];

// ── Description Parser Patterns ────────────────────────────────────

interface DescriptionPattern {
  regex: RegExp;
  actions: (match: RegExpMatchArray) => ExtractedAction[];
}

/** Helper to build box-like actions from WxHxD dimensions */
function boxActions(w: number, h: number, d: number): ExtractedAction[] {
  const acts: ExtractedAction[] = [
    makeAction(1, "sketch_create", "Create Sketch", { plane: "XY" }),
    makeAction(2, "sketch_rectangle", "Draw Rectangle", { width_mm: w, height_mm: h }),
  ];
  if (d > 0) {
    acts.push(makeAction(3, "extrude", "Extrude", { distance_mm: d }));
  }
  return acts;
}

const DESCRIPTION_PATTERNS: DescriptionPattern[] = [
  // ── Box-like shapes with explicit keyword ──
  {
    regex: /(?:box|block|rect(?:angle)?|plate|bracket|bar|flange|spacer|cube)\s+(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:[x×]\s*(\d+(?:\.\d+)?))?/i,
    actions: (m) => boxActions(parseFloat(m[1]), parseFloat(m[2]), m[3] ? parseFloat(m[3]) : 0),
  },
  // ── Leading dimensions: "50x40x20mm aluminum bracket" ──
  {
    regex: /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:mm)?\s+(?:\w+\s+)?(?:box|block|rect(?:angle)?|plate|bracket|bar|flange|spacer|cube|part|piece|blank)/i,
    actions: (m) => boxActions(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])),
  },
  // ── Bare dimensions without shape keyword: "50x40x20mm" or "50x40x20" ──
  {
    regex: /^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:mm)?/i,
    actions: (m) => boxActions(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])),
  },
  // ── Cylinder ──
  {
    regex: /cylinder\s+(?:diameter|dia|d)\s*(\d+(?:\.\d+)?)\s*(?:,?\s*(?:height|h)\s*(\d+(?:\.\d+)?))?/i,
    actions: (m) => {
      const dia = parseFloat(m[1]);
      const h = m[2] ? parseFloat(m[2]) : 0;
      const acts: ExtractedAction[] = [
        makeAction(1, "sketch_create", "Create Sketch", { plane: "XY" }),
        makeAction(2, "sketch_circle", "Draw Circle", { radius_mm: dia / 2 }),
      ];
      if (h > 0) {
        acts.push(makeAction(3, "extrude", "Extrude", { distance_mm: h }));
      }
      return acts;
    },
  },
  // ── Disc / round plate: "disc diameter 80 height 10" ──
  {
    regex: /(?:disc|disk|round\s*plate)\s+(?:diameter|dia|d)\s*(\d+(?:\.\d+)?)\s*(?:,?\s*(?:height|h|thickness|t)\s*(\d+(?:\.\d+)?))?/i,
    actions: (m) => {
      const dia = parseFloat(m[1]);
      const h = m[2] ? parseFloat(m[2]) : 0;
      const acts: ExtractedAction[] = [
        makeAction(1, "sketch_create", "Create Sketch", { plane: "XY" }),
        makeAction(2, "sketch_circle", "Draw Circle", { radius_mm: dia / 2 }),
      ];
      if (h > 0) {
        acts.push(makeAction(3, "extrude", "Extrude", { distance_mm: h }));
      }
      return acts;
    },
  },
  // ── Hole: "with 6.35mm hole" or "hole diameter 10" ──
  {
    regex: /(?:with|add)\s+(\d+(?:\.\d+)?)\s*mm\s+hole/i,
    actions: (m) => {
      const dia = parseFloat(m[1]);
      return [makeAction(98, "hole", "Add Hole", { diameter_mm: dia, depth_mm: 0 })];
    },
  },
  {
    regex: /hole\s+(?:diameter|dia|d)\s*(\d+(?:\.\d+)?)\s*(?:,?\s*(?:depth)\s*(\d+(?:\.\d+)?))?/i,
    actions: (m) => {
      const dia = parseFloat(m[1]);
      const depth = m[2] ? parseFloat(m[2]) : 0;
      return [makeAction(98, "hole", "Add Hole", { diameter_mm: dia, depth_mm: depth })];
    },
  },
  // ── Chamfer: "with 1mm chamfer" or "chamfer 2mm" ──
  {
    regex: /(?:with|add|apply)\s+(\d+(?:\.\d+)?)\s*mm\s+chamfer/i,
    actions: (m) => {
      const d = parseFloat(m[1]);
      return [makeAction(97, "chamfer", "Add Chamfers", { distance_mm: d })];
    },
  },
  {
    regex: /chamfer\s+(?:.*?)(\d+(?:\.\d+)?)\s*mm/i,
    actions: (m) => {
      const d = parseFloat(m[1]);
      return [makeAction(97, "chamfer", "Add Chamfers", { distance_mm: d })];
    },
  },
  // ── Fillet ──
  {
    regex: /(?:with|add|apply)\s+(\d+(?:\.\d+)?)\s*mm\s+fillet/i,
    actions: (m) => {
      const r = parseFloat(m[1]);
      return [makeAction(99, "fillet", "Add Fillets", { radius_mm: r })];
    },
  },
  {
    regex: /fillet\s+(?:.*?)(\d+(?:\.\d+)?)\s*mm/i,
    actions: (m) => {
      const r = parseFloat(m[1]);
      return [makeAction(99, "fillet", "Add Fillets", { radius_mm: r })];
    },
  },
];

function makeAction(
  step: number,
  type: CADActionType,
  operation: string,
  params: Record<string, number | string>,
): ExtractedAction {
  return {
    step_number: step,
    timestamp_s: 0,
    action_type: type,
    operation,
    parameters: params,
    confidence: 1.0,
    description: operation,
    keyframe_index: 0,
  };
}

// ── Engine ─────────────────────────────────────────────────────────

export class Fusion360CodeGeneratorEngine {
  private readonly tag = "Fusion360CodeGen";

  // ── Public API ──

  /**
   * Generate a complete runnable Fusion 360 Python script from action sequence.
   */
  generateScript(
    actions: ExtractedAction[],
    options?: { parametric?: boolean; component_name?: string },
  ): Fusion360Script {
    const parametric = options?.parametric ?? false;
    const componentName = options?.component_name ?? "GeneratedPart";

    const ctx = this.createContext(parametric);
    const warnings: string[] = [];
    const operations: string[] = [];
    const codeLines: string[] = [];

    for (const action of actions) {
      const code = this.generateOperation(action, ctx);
      if (code) {
        codeLines.push(`${ctx.indent}# Step ${action.step_number}: ${action.description || action.operation}`);
        // indent each line of the generated code
        for (const line of code.split("\n")) {
          codeLines.push(`${ctx.indent}${line}`);
        }
        codeLines.push("");
        operations.push(action.action_type);
      } else {
        warnings.push(`Unsupported operation: ${action.action_type}`);
      }
    }

    // Build parameter block
    let paramBlock = "";
    if (parametric && ctx.parameters.size > 0) {
      const paramLines: string[] = [];
      paramLines.push(`${ctx.indent}# === Parameters (edit these to modify the part) ===`);
      for (const [name, info] of ctx.parameters) {
        paramLines.push(
          `${ctx.indent}${name} = ${info.value}  # ${info.description} (${info.unit})`,
        );
      }
      paramLines.push("");
      paramBlock = paramLines.join("\n");
    }

    // Build user parameter registration block (for parametric mode)
    let userParamBlock = "";
    if (parametric && ctx.parameters.size > 0) {
      const upLines: string[] = [];
      upLines.push(`${ctx.indent}# === Register User Parameters ===`);
      for (const [name, info] of ctx.parameters) {
        const unit = info.unit === "cm" ? "cm" : "cm";
        upLines.push(
          `${ctx.indent}design.userParameters.add("${name}", adsk.core.ValueInput.createByReal(${name}), "${unit}", "${info.description}")`,
        );
      }
      upLines.push("");
      userParamBlock = upLines.join("\n");
    }

    const mathImport = ctx.needs_math_import ? "import math\n" : "";
    const edgeHelpers = ctx.needs_edge_helpers ? EDGE_HELPER_CODE : "";

    const script = `import adsk.core, adsk.fusion, adsk.cam, traceback
${mathImport}${edgeHelpers}
def run(context):
    ui = None
    try:
        app = adsk.core.Application.get()
        ui = app.userInterface
        design = adsk.fusion.Design.cast(app.activeProduct)
        root = design.rootComponent

${paramBlock}${userParamBlock}${ctx.indent}# === Modeling Operations: ${componentName} ===
${codeLines.join("\n")}
${ctx.indent}ui.messageBox('${componentName} created successfully!')
    except:
        if ui:
            ui.messageBox('Failed:\\n{}'.format(traceback.format_exc()))
`;

    const complexity = this.estimateComplexity(actions);

    log.info(`[${this.tag}] Generated script: ${operations.length} ops, ${ctx.parameters.size} params`);

    return {
      script,
      script_name: `${safeVarName(componentName)}.py`,
      operations,
      warnings,
      estimated_complexity: complexity,
      requires_active_document: true,
      parameter_count: ctx.parameters.size,
    };
  }

  /**
   * Generate code for a single operation within a context.
   */
  generateOperation(action: ExtractedAction, context: GenerationContext): string {
    const p = action.parameters;

    switch (action.action_type) {
      case "sketch_create":
        return this.genSketchCreate(p, context);
      case "sketch_rectangle":
        return this.genSketchRectangle(p, context);
      case "sketch_circle":
        return this.genSketchCircle(p, context);
      case "sketch_line":
        return this.genSketchLine(p, context);
      case "sketch_arc":
        return this.genSketchArc(p, context);
      case "sketch_spline":
        return this.genSketchSpline(p, context);
      case "sketch_dimension":
        return "# Sketch dimension — set constraints via the Fusion 360 UI dimension tool";
      case "sketch_constraint":
        return `# Geometric constraint: ${str(p.type, "coincident")} — apply via sketch geometricConstraints`;
      case "sketch_offset":
        return this.genSketchOffset(p, context);
      case "sketch_mirror":
        return "# Mirror sketch entities — select curves and mirror line in Fusion 360 UI";
      case "sketch_trim":
        return "# NOTE: Sketch trim is complex in the Fusion 360 API.\n# Manually trim overlapping sketch curves in the Fusion 360 UI.";
      case "sketch_close":
        return "# Close sketch profile — ensure all sketch lines form a closed loop";
      case "extrude":
        return this.genExtrude(p, context, false);
      case "extrude_cut":
        return this.genExtrude(p, context, true);
      case "revolve":
        return this.genRevolve(p, context);
      case "sweep":
        return this.genSweep(p, context);
      case "loft":
        return this.genLoft(p, context);
      case "shell":
        return this.genShell(p, context);
      case "hole":
        return this.genHole(p, context);
      case "draft":
        return `# Draft feature — limited API support\n# Use Edit → Press Pull with taper angle ${num(p.angle_deg, 5)} degrees in UI`;
      case "fillet":
        return this.genFillet(p, context);
      case "chamfer":
        return this.genChamfer(p, context);
      case "boolean_union":
        return this.genBoolean("JoinFeatureOperation", context);
      case "boolean_subtract":
        return this.genBoolean("CutFeatureOperation", context);
      case "boolean_intersect":
        return this.genBoolean("IntersectFeatureOperation", context);
      case "mirror_body":
        return this.genMirrorBody(context);
      case "pattern_linear":
        return this.genPatternLinear(p, context);
      case "pattern_circular":
        return this.genPatternCircular(p, context);
      case "assembly_insert":
        return "transform = adsk.core.Matrix3D.create()\nnew_occ = root.occurrences.addNewComponent(transform)";
      case "assembly_mate":
        return "# Joint creation — select geometry interactively or by iteration\n# joint_input = root.joints.createInput(geo1, geo2)";
      case "toolpath_create":
      case "toolpath_2d":
      case "toolpath_3d":
      case "toolpath_drill":
        return "# CAM operations — switch to Manufacturing workspace\n# cam = adsk.cam.CAM.cast(app.activeProduct)";
      case "parameter_set":
        return `# Set parameter: ${str(p.name, "param")} = ${str(p.value, "0")}`;
      case "material_assign":
        return `# Material assignment — use Fusion 360 Material Library UI\n# body.material = design.materialLibraries.itemByName('...').materials.itemByName('${str(p.material, "Aluminum")}')`;
      default:
        return "";
    }
  }

  /**
   * Generate a script from a natural language description.
   */
  generateFromDescription(
    description: string,
    options?: { parametric?: boolean; component_name?: string },
  ): Fusion360Script {
    const actions = this.parseDescription(description);
    if (actions.length === 0) {
      return {
        script: "",
        script_name: "empty.py",
        operations: [],
        warnings: [`Could not parse description: "${description}"`],
        estimated_complexity: "simple",
        requires_active_document: true,
        parameter_count: 0,
      };
    }
    return this.generateScript(actions, options);
  }

  /**
   * Return the full catalog of supported Fusion 360 operations.
   */
  getOperationCatalog(): Fusion360Operation[] {
    return [...OPERATION_CATALOG];
  }

  /**
   * Validate a Fusion 360 Python script for common mistakes.
   */
  validateScript(script: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!script.includes("def run(context)")) {
      issues.push("Missing required 'def run(context):' entry point function");
    }
    if (!script.includes("import adsk.core")) {
      issues.push("Missing 'import adsk.core' — required for Fusion 360 scripts");
    }
    if (!script.includes("try:") || !script.includes("except")) {
      issues.push("Missing try/except error handling — scripts should catch exceptions");
    }
    // Check for raw mm values that weren't converted
    // Look for ValueInput.createByReal with suspiciously large values (> 100)
    const byRealMatches = script.matchAll(/createByReal\((\d+(?:\.\d+)?)\)/g);
    for (const m of byRealMatches) {
      const val = parseFloat(m[1]);
      if (val > 100) {
        issues.push(
          `Possible unconverted mm value: createByReal(${m[1]}) — Fusion 360 uses cm, value ${val} seems too large. Did you forget to divide by 10?`,
        );
      }
    }
    // Check for deprecated calls
    if (script.includes(".addSimpleExtent")) {
      issues.push("Deprecated API: use setDistanceExtent instead of addSimpleExtent");
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Generate a fully parametric script with user parameters.
   */
  generateParametricScript(actions: ExtractedAction[]): Fusion360Script {
    return this.generateScript(actions, { parametric: true });
  }

  /**
   * Convert a CadQuery Python script to Fusion 360 API equivalent.
   */
  convertCadQueryToFusion360(cadqueryScript: string): Fusion360Script {
    const actions: ExtractedAction[] = [];
    const warnings: string[] = [];
    let step = 1;

    // Parse .Workplane()
    const wpMatch = cadqueryScript.match(/\.Workplane\(['"](\w+)['"]\)/);
    const plane = wpMatch ? wpMatch[1] : "XY";
    actions.push(makeAction(step++, "sketch_create", "Create Sketch", { plane }));

    // Parse .box(x, y, z)
    const boxMatch = cadqueryScript.match(/\.box\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)/);
    if (boxMatch) {
      const w = parseFloat(boxMatch[1]);
      const h = parseFloat(boxMatch[2]);
      const d = parseFloat(boxMatch[3]);
      actions.push(makeAction(step++, "sketch_rectangle", "Draw Rectangle", { width_mm: w, height_mm: h }));
      actions.push(makeAction(step++, "extrude", "Extrude", { distance_mm: d }));
    }

    // Parse .circle(r) or .cylinder(r, h)
    const cylMatch = cadqueryScript.match(/\.cylinder\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)/);
    if (cylMatch) {
      actions.push(makeAction(step++, "sketch_circle", "Draw Circle", { radius_mm: parseFloat(cylMatch[2]) }));
      actions.push(makeAction(step++, "extrude", "Extrude", { distance_mm: parseFloat(cylMatch[1]) }));
    }

    // Parse .fillet(r)
    const filletMatch = cadqueryScript.match(/\.fillet\(\s*(\d+(?:\.\d+)?)\s*\)/);
    if (filletMatch) {
      actions.push(makeAction(step++, "fillet", "Add Fillets", { radius_mm: parseFloat(filletMatch[1]) }));
    }

    // Parse .chamfer(d)
    const chamferMatch = cadqueryScript.match(/\.chamfer\(\s*(\d+(?:\.\d+)?)\s*\)/);
    if (chamferMatch) {
      actions.push(makeAction(step++, "chamfer", "Add Chamfer", { distance_mm: parseFloat(chamferMatch[1]) }));
    }

    // Parse .shell(t) or .shell(-t)
    const shellMatch = cadqueryScript.match(/\.shell\(\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (shellMatch) {
      actions.push(makeAction(step++, "shell", "Shell", { thickness_mm: Math.abs(parseFloat(shellMatch[1])) }));
    }

    // Parse .cut() / .union() / .intersect()
    if (cadqueryScript.includes(".cut(")) {
      actions.push(makeAction(step++, "boolean_subtract", "Boolean Cut", {}));
      warnings.push("CadQuery .cut() detected — tool body must be defined separately in Fusion 360");
    }
    if (cadqueryScript.includes(".union(")) {
      actions.push(makeAction(step++, "boolean_union", "Boolean Union", {}));
    }

    if (actions.length <= 1) {
      warnings.push("Could not fully parse CadQuery script — only common patterns are supported");
    }

    const result = this.generateScript(actions, { component_name: "ConvertedFromCadQuery" });
    result.warnings.push(...warnings);
    return result;
  }

  // ── Private: Operation Code Generators ──

  private createContext(parametric: boolean): GenerationContext {
    return {
      current_sketch_var: null,
      current_body_var: null,
      current_component_var: "root",
      sketch_counter: 0,
      body_counter: 0,
      indent: "        ",
      parametric,
      parameters: new Map(),
      needs_edge_helpers: false,
      needs_math_import: false,
    };
  }

  private addParam(ctx: GenerationContext, name: string, valueMm: number, desc: string): string {
    if (!ctx.parametric) return String(mmToCm(valueMm));
    const varName = safeVarName(name);
    const valueCm = mmToCm(valueMm);
    ctx.parameters.set(varName, { value: valueCm, unit: "cm", description: `${desc} (${valueMm}mm → ${valueCm}cm)` });
    return varName;
  }

  private genSketchCreate(p: Record<string, number | string>, ctx: GenerationContext): string {
    ctx.sketch_counter++;
    const skVar = `sketch_${ctx.sketch_counter}`;
    ctx.current_sketch_var = skVar;
    const plane = str(p.plane, "XY");
    return `${skVar} = root.sketches.add(${planeToPythonPlane(plane)})`;
  }

  private genSketchRectangle(p: Record<string, number | string>, ctx: GenerationContext): string {
    if (!ctx.current_sketch_var) {
      ctx.sketch_counter++;
      ctx.current_sketch_var = `sketch_${ctx.sketch_counter}`;
    }
    const w = num(p.width_mm, 50);
    const h = num(p.height_mm, 30);
    const ox = num(p.x_mm, 0);
    const oy = num(p.y_mm, 0);

    const wCm = this.addParam(ctx, `width`, w, "Rectangle width");
    const hCm = this.addParam(ctx, `height`, h, "Rectangle height");

    if (ctx.parametric) {
      return `# Rectangle: ${w}mm × ${h}mm → ${mmToCm(w)}cm × ${mmToCm(h)}cm\n${ctx.current_sketch_var}.sketchCurves.sketchLines.addTwoPointRectangle(adsk.core.Point3D.create(${mmToCm(ox)}, ${mmToCm(oy)}, 0), adsk.core.Point3D.create(${wCm}, ${hCm}, 0))`;
    }
    return `# Rectangle: ${w}mm × ${h}mm → ${mmToCm(w)}cm × ${mmToCm(h)}cm\n${ctx.current_sketch_var}.sketchCurves.sketchLines.addTwoPointRectangle(adsk.core.Point3D.create(${mmToCm(ox)}, ${mmToCm(oy)}, 0), adsk.core.Point3D.create(${mmToCm(w)}, ${mmToCm(h)}, 0))`;
  }

  private genSketchCircle(p: Record<string, number | string>, ctx: GenerationContext): string {
    if (!ctx.current_sketch_var) {
      ctx.sketch_counter++;
      ctx.current_sketch_var = `sketch_${ctx.sketch_counter}`;
    }
    const r = num(p.radius_mm, 10);
    const cx = num(p.center_x_mm, 0);
    const cy = num(p.center_y_mm, 0);

    const rCm = this.addParam(ctx, `radius`, r, "Circle radius");

    return `# Circle: radius ${r}mm → ${mmToCm(r)}cm\n${ctx.current_sketch_var}.sketchCurves.sketchCircles.addByCenterRadius(adsk.core.Point3D.create(${mmToCm(cx)}, ${mmToCm(cy)}, 0), ${rCm})`;
  }

  private genSketchLine(p: Record<string, number | string>, ctx: GenerationContext): string {
    if (!ctx.current_sketch_var) {
      ctx.sketch_counter++;
      ctx.current_sketch_var = `sketch_${ctx.sketch_counter}`;
    }
    const x1 = mmToCm(num(p.x1_mm, 0));
    const y1 = mmToCm(num(p.y1_mm, 0));
    const x2 = mmToCm(num(p.x2_mm, 10));
    const y2 = mmToCm(num(p.y2_mm, 0));
    return `${ctx.current_sketch_var}.sketchCurves.sketchLines.addByTwoPoints(adsk.core.Point3D.create(${x1}, ${y1}, 0), adsk.core.Point3D.create(${x2}, ${y2}, 0))`;
  }

  private genSketchArc(p: Record<string, number | string>, ctx: GenerationContext): string {
    if (!ctx.current_sketch_var) {
      ctx.sketch_counter++;
      ctx.current_sketch_var = `sketch_${ctx.sketch_counter}`;
    }
    const r = mmToCm(num(p.radius_mm, 10));
    return `# Arc: radius ${num(p.radius_mm, 10)}mm → ${r}cm\n${ctx.current_sketch_var}.sketchCurves.sketchArcs.addByThreePoints(adsk.core.Point3D.create(0, 0, 0), adsk.core.Point3D.create(${r}, ${r}, 0), adsk.core.Point3D.create(${r * 2}, 0, 0))`;
  }

  private genSketchSpline(p: Record<string, number | string>, ctx: GenerationContext): string {
    if (!ctx.current_sketch_var) {
      ctx.sketch_counter++;
      ctx.current_sketch_var = `sketch_${ctx.sketch_counter}`;
    }
    return `spline_points = adsk.core.ObjectCollection.create()\n# Add points: spline_points.add(adsk.core.Point3D.create(x_cm, y_cm, 0))\n${ctx.current_sketch_var}.sketchCurves.sketchFittedSplines.add(spline_points)`;
  }

  private genSketchOffset(p: Record<string, number | string>, ctx: GenerationContext): string {
    if (!ctx.current_sketch_var) return "# Sketch offset — no active sketch";
    const offset = mmToCm(num(p.offset_mm, 5));
    return `# Offset: ${num(p.offset_mm, 5)}mm → ${offset}cm\n# ${ctx.current_sketch_var}.offset(curves, directionPoint, ${offset})`;
  }

  private genExtrude(p: Record<string, number | string>, ctx: GenerationContext, isCut: boolean): string {
    if (!ctx.current_sketch_var) return "# Extrude — no active sketch";
    const dist = num(p.distance_mm, 25);
    const distCm = this.addParam(ctx, isCut ? "cut_depth" : "extrude_depth", dist, isCut ? "Cut depth" : "Extrude depth");
    const op = isCut ? "CutFeatureOperation" : "NewBodyFeatureOperation";
    const opLabel = isCut ? "Extrude-Cut" : "Extrude";

    if (!isCut) {
      ctx.body_counter++;
      ctx.current_body_var = `ext_${ctx.body_counter}`;
    }
    const bodyAssign = isCut ? "root.features.extrudeFeatures.add(ext_input)" : `${ctx.current_body_var} = root.features.extrudeFeatures.add(ext_input)`;

    return `# ${opLabel}: ${dist}mm → ${mmToCm(dist)}cm\nprof = ${ctx.current_sketch_var}.profiles.item(0)\next_input = root.features.extrudeFeatures.createInput(prof, adsk.fusion.FeatureOperations.${op})\next_input.setDistanceExtent(False, adsk.core.ValueInput.createByReal(${distCm}))\n${bodyAssign}`;
  }

  private genRevolve(p: Record<string, number | string>, ctx: GenerationContext): string {
    if (!ctx.current_sketch_var) return "# Revolve — no active sketch";
    const angle = num(p.angle_deg, 360);
    ctx.needs_math_import = true;
    ctx.body_counter++;
    ctx.current_body_var = `rev_${ctx.body_counter}`;
    return `# Revolve: ${angle} degrees\nprof = ${ctx.current_sketch_var}.profiles.item(0)\nrev_axis = ${ctx.current_sketch_var}.sketchCurves.sketchLines.item(0)\nrev_input = root.features.revolveFeatures.createInput(prof, rev_axis, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)\nrev_input.setAngleExtent(False, adsk.core.ValueInput.createByReal(math.radians(${angle})))\n${ctx.current_body_var} = root.features.revolveFeatures.add(rev_input)`;
  }

  private genSweep(p: Record<string, number | string>, ctx: GenerationContext): string {
    if (!ctx.current_sketch_var) return "# Sweep — no active sketch";
    ctx.body_counter++;
    ctx.current_body_var = `sweep_${ctx.body_counter}`;
    return `# Sweep along path\nprof = ${ctx.current_sketch_var}.profiles.item(0)\n# Define path sketch and curve\npath = root.features.createPath(path_sketch.sketchCurves.sketchLines.item(0))\nsweep_input = root.features.sweepFeatures.createInput(prof, path, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)\n${ctx.current_body_var} = root.features.sweepFeatures.add(sweep_input)`;
  }

  private genLoft(p: Record<string, number | string>, ctx: GenerationContext): string {
    ctx.body_counter++;
    ctx.current_body_var = `loft_${ctx.body_counter}`;
    return `# Loft between profiles\nloft_input = root.features.loftFeatures.createInput(adsk.fusion.FeatureOperations.NewBodyFeatureOperation)\n# Add sections: loft_input.loftSections.add(sketch.profiles.item(0))\n${ctx.current_body_var} = root.features.loftFeatures.add(loft_input)`;
  }

  private genShell(p: Record<string, number | string>, ctx: GenerationContext): string {
    const bodyRef = ctx.current_body_var || "ext_1";
    const t = num(p.thickness_mm, 2);
    const tCm = this.addParam(ctx, "shell_thickness", t, "Shell wall thickness");
    return `# Shell: ${t}mm wall → ${mmToCm(t)}cm\nshell_input = root.features.shellFeatures.createInput()\nshell_faces = adsk.core.ObjectCollection.create()\nshell_faces.add(${bodyRef}.bodies.item(0).faces.item(0))\nshell_input.inputEntities = shell_faces\nshell_input.insideThickness = adsk.core.ValueInput.createByReal(${tCm})\nroot.features.shellFeatures.add(shell_input)`;
  }

  private genHole(p: Record<string, number | string>, ctx: GenerationContext): string {
    const dia = num(p.diameter_mm, 10);
    const depth = num(p.depth_mm, 20);
    return `# Hole: ø${dia}mm × ${depth}mm deep\nhole_input = root.features.holeFeatures.createSimpleInput(adsk.core.ValueInput.createByReal(${mmToCm(dia)}))\nhole_input.setDistanceExtent(adsk.core.ValueInput.createByReal(${mmToCm(depth)}))\nroot.features.holeFeatures.add(hole_input)`;
  }

  private genFillet(p: Record<string, number | string>, ctx: GenerationContext): string {
    const bodyRef = ctx.current_body_var || "ext_1";
    const r = num(p.radius_mm, 3);
    const rCm = this.addParam(ctx, "fillet_radius", r, "Fillet radius");
    const dir = str(p.direction, "Z");
    ctx.needs_edge_helpers = true;
    return `# Fillet: ${r}mm radius → ${mmToCm(r)}cm\nfillet_input = root.features.filletFeatures.createInput()\nfillet_edges = select_edges_by_direction(${bodyRef}.bodies.item(0), '${dir}')\nfillet_input.addConstantRadiusEdgeSet(fillet_edges, adsk.core.ValueInput.createByReal(${rCm}), True)\nroot.features.filletFeatures.add(fillet_input)`;
  }

  private genChamfer(p: Record<string, number | string>, ctx: GenerationContext): string {
    const bodyRef = ctx.current_body_var || "ext_1";
    const d = num(p.distance_mm, 2);
    const dCm = this.addParam(ctx, "chamfer_distance", d, "Chamfer distance");
    const dir = str(p.direction, "Z");
    ctx.needs_edge_helpers = true;
    return `# Chamfer: ${d}mm → ${mmToCm(d)}cm\nchamfer_edges = select_edges_by_direction(${bodyRef}.bodies.item(0), '${dir}')\nchamfer_input = root.features.chamferFeatures.createInput(chamfer_edges, True)\nchamfer_input.setToEqualDistance(adsk.core.ValueInput.createByReal(${dCm}))\nroot.features.chamferFeatures.add(chamfer_input)`;
  }

  private genBoolean(operation: string, ctx: GenerationContext): string {
    return `# Boolean: ${operation}\ntarget_body = root.bRepBodies.item(0)\ntool_bodies = adsk.core.ObjectCollection.create()\ntool_bodies.add(root.bRepBodies.item(1))\ncombine_input = root.features.combineFeatures.createInput(target_body, tool_bodies)\ncombine_input.operation = adsk.fusion.FeatureOperations.${operation}\nroot.features.combineFeatures.add(combine_input)`;
  }

  private genMirrorBody(ctx: GenerationContext): string {
    const bodyRef = ctx.current_body_var || "ext_1";
    return `# Mirror body\nmirror_entities = adsk.core.ObjectCollection.create()\nmirror_entities.add(${bodyRef}.bodies.item(0))\nmirror_input = root.features.mirrorFeatures.createInput(mirror_entities, root.xYConstructionPlane)\nroot.features.mirrorFeatures.add(mirror_input)`;
  }

  private genPatternLinear(p: Record<string, number | string>, ctx: GenerationContext): string {
    const bodyRef = ctx.current_body_var || "ext_1";
    const countX = num(p.count_x, 3);
    const spacingMm = num(p.spacing_x_mm, 20);
    return `# Linear pattern: ${countX} copies, ${spacingMm}mm spacing\npattern_entities = adsk.core.ObjectCollection.create()\npattern_entities.add(${bodyRef}.bodies.item(0))\npattern_input = root.features.rectangularPatternFeatures.createInput(pattern_entities, root.xConstructionAxis, adsk.core.ValueInput.createByString('${countX}'), adsk.core.ValueInput.createByReal(${mmToCm(spacingMm)}), adsk.fusion.PatternDistanceType.SpacingPatternDistanceType)\nroot.features.rectangularPatternFeatures.add(pattern_input)`;
  }

  private genPatternCircular(p: Record<string, number | string>, ctx: GenerationContext): string {
    const bodyRef = ctx.current_body_var || "ext_1";
    const count = num(p.count, 6);
    return `# Circular pattern: ${count} copies\npattern_entities = adsk.core.ObjectCollection.create()\npattern_entities.add(${bodyRef}.bodies.item(0))\npattern_input = root.features.circularPatternFeatures.createInput(pattern_entities, root.zConstructionAxis)\npattern_input.quantity = adsk.core.ValueInput.createByString('${count}')\nroot.features.circularPatternFeatures.add(pattern_input)`;
  }

  // ── Private: Utilities ──

  private estimateComplexity(actions: ExtractedAction[]): "simple" | "moderate" | "complex" {
    const count = actions.length;
    const hasBoolean = actions.some((a) => a.action_type.startsWith("boolean_"));
    const hasPattern = actions.some((a) => a.action_type.startsWith("pattern_"));
    const hasLoft = actions.some((a) => a.action_type === "loft" || a.action_type === "sweep");

    if (count <= 3 && !hasBoolean && !hasPattern && !hasLoft) return "simple";
    if (count > 8 || (hasBoolean && hasPattern) || hasLoft) return "complex";
    return "moderate";
  }

  private parseDescription(description: string): ExtractedAction[] {
    const allActions: ExtractedAction[] = [];

    for (const pattern of DESCRIPTION_PATTERNS) {
      const match = description.match(pattern.regex);
      if (match) {
        const parsed = pattern.actions(match);
        for (const a of parsed) {
          // Avoid duplicate feature operations if already added via another pattern
          if (a.step_number >= 97 && allActions.some((e) => e.action_type === a.action_type)) continue;
          // Avoid duplicate box geometry if leading-dim or bare-dim pattern already matched
          if (a.step_number <= 3 && a.action_type === "sketch_create" && allActions.some((e) => e.action_type === "sketch_create")) continue;
          if (a.step_number <= 3 && a.action_type === "sketch_rectangle" && allActions.some((e) => e.action_type === "sketch_rectangle")) continue;
          if (a.step_number <= 3 && a.action_type === "extrude" && allActions.some((e) => e.action_type === "extrude")) continue;
          allActions.push(a);
        }
      }
    }

    // Renumber steps sequentially
    allActions.sort((a, b) => a.step_number - b.step_number);
    allActions.forEach((a, i) => (a.step_number = i + 1));
    return allActions;
  }
}

export const fusion360CodeGeneratorEngine = new Fusion360CodeGeneratorEngine();
