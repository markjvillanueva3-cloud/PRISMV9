/**
 * hyperCAD-S / hyperMILL Python API Reference
 *
 * Complete Python scripting API for CAD/CAM automation via OPEN MIND's SDK.
 * Use this instead of building custom CAD — hyperCAD-S is fully programmable.
 *
 * Key modules:
 * - om.cad.core — Document management, selection, undo
 * - om.cad.commands — Sketch, properties, file operations
 * - om.cad.booleans — Solid boolean operations
 * - om.cad.modify — Geometry modification
 * - om.cam.core — CAM model, entities, operations
 *
 * Extracted from hyperMILL 33.0 Automation Center Python scripts (179 files)
 */

export interface PythonAPIModule {
  name: string;
  import_path: string;
  description: string;
  functions: PythonAPIFunction[];
}

export interface PythonAPIFunction {
  name: string;
  signature: string;
  description: string;
  returns?: string;
  example?: string;
}

// ============================================================================
// CORE CAD MODULES
// ============================================================================

export const CAD_CORE_MODULE: PythonAPIModule = {
  name: "Core CAD",
  import_path: "om.cad.core",
  description: "Core CAD operations: document, selection, undo management",
  functions: [
    {
      name: "CurrentDocument",
      signature: "CurrentDocument() -> Document",
      description: "Get the currently active CAD document",
      returns: "Document object or None",
      example: "doc = om.cad.core.CurrentDocument()",
    },
    {
      name: "Selector",
      signature: "Selector() -> Selector",
      description: "Create a selector for entity selection",
      returns: "Selector object for picking entities",
      example: "sel = om.cad.core.Selector()\nentities = sel.Select([entity_id])",
    },
    {
      name: "OpenUndo",
      signature: "OpenUndo(name: str) -> None",
      description: "Open an undo group for batch operations",
      example: 'om.cad.core.OpenUndo("Python Operation")',
    },
    {
      name: "CloseUndo",
      signature: "CloseUndo() -> None",
      description: "Close the current undo group",
    },
  ],
};

export const CAD_COMMANDS_MODULE: PythonAPIModule = {
  name: "CAD Commands",
  import_path: "om.cad.commands",
  description: "High-level CAD commands: sketch, file operations, properties",
  functions: [
    {
      name: "Sketch",
      signature: "Sketch() -> SketchCommand",
      description: "Create a sketch command for 2D geometry creation",
      returns: "SketchCommand with Construction, StartPoint, EndPoint properties",
      example: `cmd = om.cad.commands.Sketch()
cmd.Construction = 0  # 0=line
cmd.StartPoint = [0, 0, 0, 1]
cmd.EndPoint = [100, 0, 0, 1]
entities = cmd.Execute()`,
    },
    {
      name: "LoadDocument",
      signature: "LoadDocument(path: str) -> Document",
      description: "Load a CAD document from file",
      returns: "Loaded Document object",
      example: 'doc = om.cad.commands.LoadDocument("C:/models/part.hmc")',
    },
    {
      name: "Properties",
      signature: "Properties() -> PropertiesCommand",
      description: "Access document and view properties",
      returns: "PropertiesCommand for getting/setting properties",
    },
  ],
};

export const CAD_BOOLEANS_MODULE: PythonAPIModule = {
  name: "Boolean Operations",
  import_path: "om.cad.booleans",
  description: "Solid boolean operations: union, difference, intersection, split",
  functions: [
    {
      name: "union",
      signature: "union(solids: List[Entity], separateSolids: bool = False, keepOriginal: bool = False) -> Entity",
      description: "Unite multiple solids into one",
      example: `sel = om.cad.core.Selector()
om.cad.booleans.union(
    solids=sel.Select([solid1_id, solid2_id]),
    separateSolids=True,
    keepOriginal=False
)`,
    },
    {
      name: "difference",
      signature: "difference(solidsA: List, solidsB: List, keepOriginalA: bool = False, keepOriginalB: bool = False) -> Entity",
      description: "Subtract solids B from solids A",
      example: `om.cad.booleans.difference(
    solidsA=sel.Select([base_id]),
    solidsB=sel.Select([cutter_id]),
    keepOriginalA=True
)`,
    },
    {
      name: "intersection",
      signature: "intersection(solids: List, separateSolids: bool = False, keepOriginal: bool = False) -> Entity",
      description: "Create intersection of multiple solids",
    },
    {
      name: "split",
      signature: "split(solidsA: List, solidsB: List, keepOriginal: bool = False) -> List[Entity]",
      description: "Split solids A using solids B as cutting tools",
    },
  ],
};

export const CAD_DRAFTING_MODULE: PythonAPIModule = {
  name: "Drafting",
  import_path: "om.commands.drafting",
  description: "2D drafting and drawing commands",
  functions: [
    {
      name: "line",
      signature: "createLine(startPt: List[float], endPt: List[float]) -> Entity",
      description: "Create a line between two points",
      example: "createLine([0, 0, 0, 1], [100, 50, 0, 1])",
    },
    {
      name: "circle",
      signature: "createCircle(center: List[float], radius: float) -> Entity",
      description: "Create a circle at center with given radius",
    },
    {
      name: "arc",
      signature: "createArc(center: List[float], radius: float, startAngle: float, endAngle: float) -> Entity",
      description: "Create an arc segment",
    },
  ],
};

export const CAD_SHAPES_MODULE: PythonAPIModule = {
  name: "Shapes",
  import_path: "om.commands.shapes",
  description: "3D shape creation commands",
  functions: [
    {
      name: "extrude",
      signature: "extrude(profile: Entity, height: float, direction: List[float]) -> Entity",
      description: "Extrude a 2D profile into a 3D solid",
    },
    {
      name: "revolve",
      signature: "revolve(profile: Entity, axis: List[float], angle: float) -> Entity",
      description: "Revolve a profile around an axis",
    },
    {
      name: "chamfer",
      signature: "chamfer(edges: List[Entity], distance: float) -> None",
      description: "Apply chamfer to selected edges",
    },
    {
      name: "fillet",
      signature: "fillet(edges: List[Entity], radius: float) -> None",
      description: "Apply fillet to selected edges",
    },
  ],
};

// ============================================================================
// CAM MODULES
// ============================================================================

export const CAM_CORE_MODULE: PythonAPIModule = {
  name: "CAM Core",
  import_path: "om.cam.core",
  description: "CAM model access, job lists, operations",
  functions: [
    {
      name: "GetCamEntities",
      signature: "GetCamEntities(filter: CamEntityFilter) -> List[CamEntity]",
      description: "Get CAM entities by filter (joblists, operations, tools, etc.)",
      example: `import om.cam.core as cam
joblists = cam.GetCamEntities(cam.CamEntityFilter.ALL_JOBLISTS)
for joblist in joblists:
    joblist.UpdateClampingPosition()`,
    },
    {
      name: "CamEntityFilter",
      signature: "CamEntityFilter.ALL_JOBLISTS | ALL_OPERATIONS | ALL_TOOLS",
      description: "Filter constants for GetCamEntities",
    },
  ],
};

export const CAM_GUI_MODULE: PythonAPIModule = {
  name: "CAM GUI",
  import_path: "om.cam.gui",
  description: "CAM user interface operations",
  functions: [
    {
      name: "SelectOperation",
      signature: "SelectOperation(op_id: int) -> None",
      description: "Select an operation in the CAM tree",
    },
    {
      name: "CalculateToolpath",
      signature: "CalculateToolpath(op: Operation) -> Toolpath",
      description: "Calculate toolpath for an operation",
    },
  ],
};

// ============================================================================
// ALL MODULES EXPORT
// ============================================================================

export const HYPERCAD_PYTHON_API: PythonAPIModule[] = [
  CAD_CORE_MODULE,
  CAD_COMMANDS_MODULE,
  CAD_BOOLEANS_MODULE,
  CAD_DRAFTING_MODULE,
  CAD_SHAPES_MODULE,
  CAM_CORE_MODULE,
  CAM_GUI_MODULE,
];

// ============================================================================
// USAGE PATTERNS
// ============================================================================

export const PYTHON_API_USAGE_PATTERNS = {
  create_simple_geometry: `
# Create a simple part with Python
import om.cad.core
import om.cad.commands

doc = om.cad.core.CurrentDocument()
om.cad.core.OpenUndo("Create Part")

# Draw rectangle profile
cmd = om.cad.commands.Sketch()
cmd.Construction = 0  # line
cmd.StartPoint = [0, 0, 0, 1]
cmd.EndPoint = [100, 0, 0, 1]
cmd.Execute()
# ... continue for other edges

om.cad.core.CloseUndo()
`,

  boolean_operations: `
# Boolean subtract (pocket/hole)
import om.cad.core
import om.cad.booleans

sel = om.cad.core.Selector()
base = sel.Select([base_solid_id])
tool = sel.Select([cutting_solid_id])

om.cad.booleans.difference(
    solidsA=base,
    solidsB=tool,
    keepOriginalA=False,
    keepOriginalB=False
)
`,

  cam_automation: `
# Automate CAM operations
import om.cam.core as cam

# Get all job lists
joblists = cam.GetCamEntities(cam.CamEntityFilter.ALL_JOBLISTS)

# Update stock calculation for each
for joblist in joblists:
    joblist.UpdateClampingPosition()
    # Calculate all operations
    for op in joblist.Operations:
        op.Calculate()
`,

  electrode_design: `
# Create EDM electrode
import om.cad.booleans

# Offset cavity geometry for spark gap
om.cad.commands.Offset(
    entities=cavity_surfaces,
    distance=spark_gap_mm
)

# Create electrode solid
om.cad.booleans.difference(
    solidsA=blank,
    solidsB=offset_cavity
)
`,
};

// ============================================================================
// CAPABILITIES SUMMARY
// ============================================================================

export const HYPERCAD_CAPABILITIES = {
  cad_drawing: [
    "2D sketching (lines, arcs, circles, splines, polylines)",
    "3D solid modeling (extrude, revolve, sweep, loft)",
    "Surface modeling (NURBS, patches, trimming, blending)",
    "Boolean operations (union, difference, intersection, split)",
    "Feature-based modeling (chamfer, fillet, shell, draft)",
    "Assembly management and constraints",
    "Drawing/drafting automation",
    "Electrode design for EDM",
    "Mold/die parting surface creation",
  ],
  cam_automation: [
    "Job list management",
    "Operation creation and copying",
    "Stock/blank calculation",
    "Clamp/fixture position updates",
    "Toolpath calculation",
    "NC code generation",
    "Feature-based machining",
    "Template application",
  ],
  integration: [
    "Python scripting via hmPythonRunner",
    "Automation Center workflow integration",
    "External file I/O (temp file communication)",
    "Batch processing multiple parts",
    "Custom wizard creation",
    "Event-driven automation",
  ],
};

/**
 * Check if hyperMILL/hyperCAD-S Python scripting is available
 */
export function checkPythonScriptingAvailable(): boolean {
  // In real implementation, would check for hmPythonRunnerX64.dll
  return true;
}

/**
 * Generate Python script for a CAD operation
 */
export function generatePythonScript(
  operation: "line" | "circle" | "boolean_union" | "boolean_difference" | "extrude",
  params: Record<string, unknown>
): string {
  const templates: Record<string, (p: Record<string, unknown>) => string> = {
    line: (p) => `
import om.cad.core
import om.cad.commands

doc = om.cad.core.CurrentDocument()
om.cad.core.OpenUndo("Create Line")

cmd = om.cad.commands.Sketch()
cmd.Construction = 0
cmd.StartPoint = [${p.x1 || 0}, ${p.y1 || 0}, ${p.z1 || 0}, 1]
cmd.EndPoint = [${p.x2 || 100}, ${p.y2 || 0}, ${p.z2 || 0}, 1]
cmd.Execute()

om.cad.core.CloseUndo()
`,
    circle: (p) => `
import om.cad.core
import om.cad.commands

doc = om.cad.core.CurrentDocument()
om.cad.core.OpenUndo("Create Circle")

cmd = om.cad.commands.Circle()
cmd.Center = [${p.x || 0}, ${p.y || 0}, ${p.z || 0}, 1]
cmd.Radius = ${p.radius || 10}
cmd.Execute()

om.cad.core.CloseUndo()
`,
    boolean_union: (p) => `
import om.cad.core
import om.cad.booleans

sel = om.cad.core.Selector()
om.cad.booleans.union(
    solids=sel.Select([${p.solid_ids || "1, 2"}]),
    keepOriginal=${p.keep_original ? "True" : "False"}
)
`,
    boolean_difference: (p) => `
import om.cad.core
import om.cad.booleans

sel = om.cad.core.Selector()
om.cad.booleans.difference(
    solidsA=sel.Select([${p.base_id || 1}]),
    solidsB=sel.Select([${p.tool_id || 2}]),
    keepOriginalA=${p.keep_original ? "True" : "False"}
)
`,
    extrude: (p) => `
import om.cad.core
import om.cad.commands

doc = om.cad.core.CurrentDocument()
om.cad.core.OpenUndo("Extrude")

cmd = om.cad.commands.Extrude()
cmd.Profile = sel.Select([${p.profile_id || 1}])
cmd.Height = ${p.height || 50}
cmd.Direction = [${p.dir_x || 0}, ${p.dir_y || 0}, ${p.dir_z || 1}]
cmd.Execute()

om.cad.core.CloseUndo()
`,
  };

  return templates[operation]?.(params) || "# Unknown operation";
}
