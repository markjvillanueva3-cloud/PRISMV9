/**
 * CADOperationTaxonomyEngine — Comprehensive CAD Operation Catalog
 * Maps CAD operations to CadQuery Python templates, prerequisites,
 * and visual signatures for action-to-code translation.
 */
import { log } from "../utils/Logger.js";
import type { CADActionType, ExtractedAction } from "./VideoActionExtractorEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export interface CADOperationParam {
  name: string;
  type: "number" | "string" | "boolean";
  unit?: string;
  default?: number | string | boolean;
}

export interface CADOperation {
  name: string;
  action_type: CADActionType;
  category: "sketch_2d" | "solid_3d" | "modify" | "assembly" | "cam" | "utility";
  required_params: CADOperationParam[];
  optional_params: CADOperationParam[];
  cadquery_template: string;
  prerequisites: CADActionType[];
  visual_signatures: string[];
  description: string;
}

// ── Operation Catalog (40+ entries) ────────────────────────────────

const OPERATIONS: CADOperation[] = [
  // ── Sketch 2D (10) ──
  {
    name: "Create Sketch",
    action_type: "sketch_create",
    category: "sketch_2d",
    required_params: [],
    optional_params: [
      { name: "plane", type: "string", default: "XY" },
    ],
    cadquery_template: "result = cq.Workplane('{plane}')",
    prerequisites: [],
    visual_signatures: [
      "grid appears", "sketch mode activated", "workplane visible",
    ],
    description: "Create a new 2D sketch on a workplane",
  },
  {
    name: "Sketch Line",
    action_type: "sketch_line",
    category: "sketch_2d",
    required_params: [
      { name: "x", type: "number", unit: "mm", default: 10 },
      { name: "y", type: "number", unit: "mm", default: 0 },
    ],
    optional_params: [],
    cadquery_template: "result = result.lineTo({x}, {y})",
    prerequisites: ["sketch_create"],
    visual_signatures: ["line drawn on sketch", "endpoint marker"],
    description: "Draw a straight line in the sketch",
  },
  {
    name: "Sketch Arc",
    action_type: "sketch_arc",
    category: "sketch_2d",
    required_params: [
      { name: "radius_mm", type: "number", unit: "mm", default: 10 },
    ],
    optional_params: [
      { name: "angle_deg", type: "number", unit: "deg", default: 90 },
    ],
    cadquery_template:
      "result = result.radiusArc(({radius_mm}, 0), {radius_mm})",
    prerequisites: ["sketch_create"],
    visual_signatures: ["curved line", "arc on sketch"],
    description: "Draw an arc in the sketch",
  },
  {
    name: "Sketch Circle",
    action_type: "sketch_circle",
    category: "sketch_2d",
    required_params: [
      { name: "radius_mm", type: "number", unit: "mm", default: 10 },
    ],
    optional_params: [],
    cadquery_template: "result = result.circle({radius_mm})",
    prerequisites: ["sketch_create"],
    visual_signatures: ["circle on sketch plane"],
    description: "Draw a circle in the sketch",
  },
  {
    name: "Sketch Rectangle",
    action_type: "sketch_rectangle",
    category: "sketch_2d",
    required_params: [
      { name: "width_mm", type: "number", unit: "mm", default: 50 },
      { name: "height_mm", type: "number", unit: "mm", default: 30 },
    ],
    optional_params: [
      { name: "centered", type: "boolean", default: true },
    ],
    cadquery_template: "result = result.rect({width_mm}, {height_mm})",
    prerequisites: ["sketch_create"],
    visual_signatures: ["rectangle on sketch plane", "four-sided shape"],
    description: "Draw a rectangle in the sketch",
  },
  {
    name: "Sketch Spline",
    action_type: "sketch_spline",
    category: "sketch_2d",
    required_params: [],
    optional_params: [],
    cadquery_template:
      "result = result.spline([(0,0), (10,5), (20,0)])",
    prerequisites: ["sketch_create"],
    visual_signatures: ["smooth curve", "spline control points"],
    description: "Draw a spline curve through control points",
  },
  {
    name: "Sketch Dimension",
    action_type: "sketch_dimension",
    category: "sketch_2d",
    required_params: [
      { name: "value_mm", type: "number", unit: "mm", default: 10 },
    ],
    optional_params: [],
    cadquery_template: "# dimension constraint: {value_mm}mm",
    prerequisites: ["sketch_create"],
    visual_signatures: [
      "dimension annotation", "measurement arrows",
    ],
    description: "Apply a dimensional constraint to sketch geometry",
  },
  {
    name: "Sketch Constraint",
    action_type: "sketch_constraint",
    category: "sketch_2d",
    required_params: [],
    optional_params: [
      { name: "constraint_type", type: "string", default: "fixed" },
    ],
    cadquery_template: "# constraint: {constraint_type}",
    prerequisites: ["sketch_create"],
    visual_signatures: [
      "constraint icon", "green constraint markers",
    ],
    description: "Apply a geometric constraint (parallel, tangent, etc.)",
  },
  {
    name: "Sketch Trim",
    action_type: "sketch_trim",
    category: "sketch_2d",
    required_params: [],
    optional_params: [],
    cadquery_template: "# trim operation (manual in CadQuery)",
    prerequisites: ["sketch_create"],
    visual_signatures: ["line segment removed", "geometry trimmed"],
    description: "Trim sketch geometry at intersection",
  },
  {
    name: "Sketch Offset",
    action_type: "sketch_offset",
    category: "sketch_2d",
    required_params: [
      { name: "distance_mm", type: "number", unit: "mm", default: 2 },
    ],
    optional_params: [],
    cadquery_template: "result = result.offset2D({distance_mm})",
    prerequisites: ["sketch_create"],
    visual_signatures: [
      "parallel contour", "offset profile visible",
    ],
    description: "Offset sketch contour by a distance",
  },

  // ── Solid 3D (8) ──
  {
    name: "Extrude",
    action_type: "extrude",
    category: "solid_3d",
    required_params: [
      { name: "depth_mm", type: "number", unit: "mm", default: 10 },
    ],
    optional_params: [
      { name: "symmetric", type: "boolean", default: false },
    ],
    cadquery_template: "result = result.extrude({depth_mm})",
    prerequisites: ["sketch_create"],
    visual_signatures: [
      "2D profile becomes 3D", "solid body appears",
    ],
    description: "Extrude a 2D sketch into a 3D solid",
  },
  {
    name: "Extrude Cut",
    action_type: "extrude_cut",
    category: "solid_3d",
    required_params: [
      { name: "depth_mm", type: "number", unit: "mm", default: 5 },
    ],
    optional_params: [
      { name: "through_all", type: "boolean", default: false },
    ],
    cadquery_template: "result = result.cutBlind(-{depth_mm})",
    prerequisites: ["sketch_create"],
    visual_signatures: [
      "material removed", "pocket created", "cut feature",
    ],
    description: "Cut material by extruding a profile inward",
  },
  {
    name: "Revolve",
    action_type: "revolve",
    category: "solid_3d",
    required_params: [],
    optional_params: [
      { name: "angle_deg", type: "number", unit: "deg", default: 360 },
    ],
    cadquery_template: "result = result.revolve({angle_deg})",
    prerequisites: ["sketch_create"],
    visual_signatures: [
      "rotational solid", "axisymmetric body",
    ],
    description: "Revolve a sketch profile around an axis",
  },
  {
    name: "Sweep",
    action_type: "sweep",
    category: "solid_3d",
    required_params: [],
    optional_params: [],
    cadquery_template: "result = result.sweep(path)",
    prerequisites: ["sketch_create"],
    visual_signatures: [
      "profile follows path", "swept solid",
    ],
    description: "Sweep a profile along a path curve",
  },
  {
    name: "Loft",
    action_type: "loft",
    category: "solid_3d",
    required_params: [],
    optional_params: [],
    cadquery_template: "result = cq.Workplane('XY').loft()",
    prerequisites: ["sketch_create"],
    visual_signatures: [
      "blended profiles", "transitional solid",
    ],
    description: "Loft between two or more sketch profiles",
  },
  {
    name: "Hole",
    action_type: "hole",
    category: "solid_3d",
    required_params: [
      { name: "diameter_mm", type: "number", unit: "mm", default: 6 },
    ],
    optional_params: [
      { name: "depth_mm", type: "number", unit: "mm", default: 10 },
    ],
    cadquery_template: "result = result.hole({diameter_mm})",
    prerequisites: ["sketch_create"],
    visual_signatures: [
      "circular hole", "drill feature",
    ],
    description: "Create a hole feature",
  },
  {
    name: "Shell",
    action_type: "shell",
    category: "solid_3d",
    required_params: [
      { name: "thickness_mm", type: "number", unit: "mm", default: 2 },
    ],
    optional_params: [],
    cadquery_template: "result = result.shell({thickness_mm})",
    prerequisites: ["extrude"],
    visual_signatures: [
      "hollow body", "thin walls visible",
    ],
    description: "Shell a solid to create thin walls",
  },
  {
    name: "Draft",
    action_type: "draft",
    category: "solid_3d",
    required_params: [
      { name: "angle_deg", type: "number", unit: "deg", default: 3 },
    ],
    optional_params: [],
    cadquery_template:
      "# draft: taper faces by {angle_deg} degrees",
    prerequisites: ["extrude"],
    visual_signatures: [
      "tapered faces", "angled walls",
    ],
    description: "Apply a draft angle to faces for moldability",
  },

  // ── Modify (6) ──
  {
    name: "Fillet",
    action_type: "fillet",
    category: "modify",
    required_params: [
      { name: "radius_mm", type: "number", unit: "mm", default: 2 },
    ],
    optional_params: [],
    cadquery_template: "result = result.fillet({radius_mm})",
    prerequisites: ["extrude"],
    visual_signatures: [
      "rounded edges", "fillet radius visible",
    ],
    description: "Round edges with a fillet radius",
  },
  {
    name: "Chamfer",
    action_type: "chamfer",
    category: "modify",
    required_params: [
      { name: "size_mm", type: "number", unit: "mm", default: 1 },
    ],
    optional_params: [],
    cadquery_template: "result = result.chamfer({size_mm})",
    prerequisites: ["extrude"],
    visual_signatures: [
      "beveled edges", "angled edge cut",
    ],
    description: "Add a chamfer (angled cut) to edges",
  },
  {
    name: "Boolean Union",
    action_type: "boolean_union",
    category: "modify",
    required_params: [],
    optional_params: [],
    cadquery_template: "result = result.union(other)",
    prerequisites: ["extrude"],
    visual_signatures: [
      "bodies merged", "union of solids",
    ],
    description: "Merge two solid bodies together",
  },
  {
    name: "Boolean Subtract",
    action_type: "boolean_subtract",
    category: "modify",
    required_params: [],
    optional_params: [],
    cadquery_template: "result = result.cut(other)",
    prerequisites: ["extrude"],
    visual_signatures: [
      "material subtracted", "boolean cut",
    ],
    description: "Subtract one solid from another",
  },
  {
    name: "Boolean Intersect",
    action_type: "boolean_intersect",
    category: "modify",
    required_params: [],
    optional_params: [],
    cadquery_template: "result = result.intersect(other)",
    prerequisites: ["extrude"],
    visual_signatures: [
      "intersection of solids", "common volume",
    ],
    description: "Keep only the intersection of two solids",
  },
  {
    name: "Mirror Body",
    action_type: "mirror_body",
    category: "modify",
    required_params: [],
    optional_params: [
      { name: "plane", type: "string", default: "YZ" },
    ],
    cadquery_template: "result = result.mirror('{plane}')",
    prerequisites: ["extrude"],
    visual_signatures: [
      "mirrored solid", "symmetrical copy",
    ],
    description: "Mirror a solid body about a plane",
  },

  // ── Pattern (2) ──
  {
    name: "Linear Pattern",
    action_type: "pattern_linear",
    category: "modify",
    required_params: [
      { name: "count", type: "number", default: 3 },
      { name: "spacing_mm", type: "number", unit: "mm", default: 20 },
    ],
    optional_params: [],
    cadquery_template:
      "# linear pattern: {count} copies at {spacing_mm}mm spacing",
    prerequisites: ["extrude"],
    visual_signatures: [
      "repeated features in line", "array pattern",
    ],
    description: "Create a linear pattern of features",
  },
  {
    name: "Circular Pattern",
    action_type: "pattern_circular",
    category: "modify",
    required_params: [
      { name: "count", type: "number", default: 6 },
    ],
    optional_params: [
      { name: "angle_deg", type: "number", unit: "deg", default: 360 },
    ],
    cadquery_template:
      "# circular pattern: {count} copies over {angle_deg} degrees",
    prerequisites: ["extrude"],
    visual_signatures: [
      "features around axis", "radial array",
    ],
    description: "Create a circular pattern of features",
  },

  // ── Assembly (3) ──
  {
    name: "Assembly Insert",
    action_type: "assembly_insert",
    category: "assembly",
    required_params: [],
    optional_params: [
      { name: "component_name", type: "string", default: "part" },
    ],
    cadquery_template:
      "assy = cq.Assembly()\nasst.add(result, name='{component_name}')",
    prerequisites: [],
    visual_signatures: [
      "component added to assembly", "new part in tree",
    ],
    description: "Insert a component into an assembly",
  },
  {
    name: "Assembly Mate",
    action_type: "assembly_mate",
    category: "assembly",
    required_params: [],
    optional_params: [],
    cadquery_template:
      "assy.constrain('a', 'b', 'Plane')",
    prerequisites: ["assembly_insert"],
    visual_signatures: [
      "parts aligned", "mate connector visible",
    ],
    description: "Create a mate between assembly components",
  },
  {
    name: "Assembly Constrain",
    action_type: "assembly_constrain",
    category: "assembly",
    required_params: [],
    optional_params: [
      { name: "constraint_type", type: "string", default: "Plane" },
    ],
    cadquery_template:
      "assy.constrain('a', 'b', '{constraint_type}')",
    prerequisites: ["assembly_insert"],
    visual_signatures: [
      "constraint arrows", "DOF reduced",
    ],
    description: "Apply a constraint between assembly components",
  },

  // ── CAM (4) ──
  {
    name: "Toolpath Create",
    action_type: "toolpath_create",
    category: "cam",
    required_params: [],
    optional_params: [],
    cadquery_template: "# CAM: create toolpath setup",
    prerequisites: ["extrude"],
    visual_signatures: [
      "CAM workspace", "stock material shown",
    ],
    description: "Initialize a CAM toolpath operation",
  },
  {
    name: "Toolpath 2D",
    action_type: "toolpath_2d",
    category: "cam",
    required_params: [],
    optional_params: [
      { name: "depth_mm", type: "number", unit: "mm", default: 5 },
    ],
    cadquery_template: "# CAM: 2D contour/profile at {depth_mm}mm",
    prerequisites: ["toolpath_create"],
    visual_signatures: [
      "2D toolpath lines", "contour path",
    ],
    description: "Create a 2D profile/contour toolpath",
  },
  {
    name: "Toolpath 3D",
    action_type: "toolpath_3d",
    category: "cam",
    required_params: [],
    optional_params: [],
    cadquery_template: "# CAM: 3D surface finishing toolpath",
    prerequisites: ["toolpath_create"],
    visual_signatures: [
      "3D toolpath lines", "surface scan pattern",
    ],
    description: "Create a 3D surface machining toolpath",
  },
  {
    name: "Toolpath Drill",
    action_type: "toolpath_drill",
    category: "cam",
    required_params: [],
    optional_params: [
      { name: "depth_mm", type: "number", unit: "mm", default: 10 },
    ],
    cadquery_template: "# CAM: drill cycle at {depth_mm}mm depth",
    prerequisites: ["toolpath_create"],
    visual_signatures: [
      "drill points marked", "peck cycle arrows",
    ],
    description: "Create a drilling toolpath operation",
  },

  // ── Utility (3) ──
  {
    name: "Set Parameter",
    action_type: "parameter_set",
    category: "utility",
    required_params: [
      { name: "param_name", type: "string" },
      { name: "param_value", type: "string" },
    ],
    optional_params: [],
    cadquery_template: "{param_name} = {param_value}",
    prerequisites: [],
    visual_signatures: [
      "parameter dialog", "value changed",
    ],
    description: "Set a design parameter value",
  },
  {
    name: "Assign Material",
    action_type: "material_assign",
    category: "utility",
    required_params: [],
    optional_params: [
      { name: "material", type: "string", default: "Aluminum" },
    ],
    cadquery_template: "# material: {material}",
    prerequisites: [],
    visual_signatures: [
      "material browser", "appearance changed",
    ],
    description: "Assign a material to a body",
  },
  {
    name: "Selection",
    action_type: "selection",
    category: "utility",
    required_params: [],
    optional_params: [],
    cadquery_template: "# select geometry",
    prerequisites: [],
    visual_signatures: [
      "highlighted face/edge", "selection glow",
    ],
    description: "Select geometry for the next operation",
  },
];

// ── Engine ─────────────────────────────────────────────────────────

export class CADOperationTaxonomyEngine {
  private readonly ops: CADOperation[] = OPERATIONS;

  /** Look up full operation details by action type. */
  getOperation(actionType: CADActionType): CADOperation | null {
    return this.ops.find(op => op.action_type === actionType) ?? null;
  }

  /** Return all cataloged operations. */
  getAllOperations(): CADOperation[] {
    return [...this.ops];
  }

  /** Filter operations by category. */
  getOperationsByCategory(
    category: CADOperation["category"],
  ): CADOperation[] {
    return this.ops.filter(op => op.category === category);
  }

  /**
   * Generate CadQuery code from an extracted action with parameters.
   * Fills in the template with actual parameter values.
   */
  generateCadQueryCode(action: ExtractedAction): string {
    const op = this.getOperation(action.action_type);
    if (!op) return `# unknown action: ${action.action_type}`;

    let code = op.cadquery_template;
    // Fill params from action, falling back to op defaults
    const allParams = [...op.required_params, ...op.optional_params];
    for (const p of allParams) {
      const val = action.parameters[p.name] ?? p.default ?? "";
      code = code.replace(new RegExp(`\\{${p.name}\\}`, "g"), String(val));
    }
    return code;
  }

  /**
   * Generate a complete CadQuery Python script from an action sequence.
   */
  generateFullScript(actions: ExtractedAction[]): string {
    const lines: string[] = [
      "import cadquery as cq",
      "",
      "# Generated from video action sequence",
      `# ${actions.length} operations`,
      "",
    ];

    let needsWorkplane = true;

    for (const action of actions) {
      const ts = action.timestamp_s;
      const mm = Math.floor(ts / 60);
      const ss = Math.floor(ts % 60);
      const timeStr = `${mm}:${String(ss).padStart(2, "0")}`;
      lines.push(`# Step ${action.step_number} @${timeStr}: ${action.description}`);

      const code = this.generateCadQueryCode(action);
      // Auto-prepend workplane if first real operation
      if (needsWorkplane && action.action_type === "sketch_create") {
        needsWorkplane = false;
      } else if (needsWorkplane && code.startsWith("result = result.")) {
        lines.push("result = cq.Workplane('XY')");
        needsWorkplane = false;
      }
      lines.push(code);
      lines.push("");
    }

    lines.push("# Export to STEP");
    lines.push("cq.exporters.export(result, 'output.step')");
    return lines.join("\n");
  }

  /**
   * Check whether all prerequisites for an operation have been met.
   */
  checkPrerequisites(
    action: CADActionType,
    previousActions: CADActionType[],
  ): { satisfied: boolean; missing: CADActionType[] } {
    const op = this.getOperation(action);
    if (!op) return { satisfied: true, missing: [] };

    const missing = op.prerequisites.filter(
      pre => !previousActions.includes(pre),
    );
    return { satisfied: missing.length === 0, missing };
  }
}

export const cadOperationTaxonomyEngine = new CADOperationTaxonomyEngine();
