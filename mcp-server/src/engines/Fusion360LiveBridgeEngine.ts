/**
 * Fusion360LiveBridgeEngine — PRISM-side client for the Fusion 360 API Server Add-In.
 * Communicates with the add-in's HTTP server running inside Fusion 360 on localhost:18360.
 *
 * Provides typed methods for all CAD operations: sketch, extrude, fillet, chamfer,
 * revolve, hole, pattern, combine, shell, export, undo, parameters, and raw code execution.
 *
 * Also supports executing full ExtractedAction sequences from the VideoActionExtractorEngine
 * pipeline, enabling video-to-live-CAD replay.
 */
import { log } from "../utils/Logger.js";
import type { ExtractedAction, CADActionType } from "./VideoActionExtractorEngine.js";

// ── Configuration ───────────────────────────────────────────────────

// Default add-in port is :18360 (generic). delta's OPERATOR-DESIGNATED Fusion CAD window is :18362
// (kilo CAM = :18361) per reference_fusion_port_assignment_kilo_18361_2026_06_02. Override the whole
// URL via env F360_URL, or just the port via PRISM_FUSION_DELTA_PORT (e.g. 18362 for delta's live drive),
// or pass baseUrl to the constructor. Back-compat: env unset -> :18360 (unchanged).
const F360_PORT = process.env.PRISM_FUSION_DELTA_PORT || "18360";
const F360_URL = process.env.F360_URL || `http://127.0.0.1:${F360_PORT}`;
const CONNECT_TIMEOUT_MS = 2000;
const REQUEST_TIMEOUT_MS = 30000;

// ── Retry + Stage Timeout Configuration ─────────────────────────────

const RETRY_BACKOFF_MS = [100, 500, 2000];
const MAX_RETRIES = 3;
const MAX_CONCURRENT_REQUESTS = 5;

/** Per-stage timeouts — CAM operations that involve Fusion kernel work need longer. */
const STAGE_TIMEOUT_MS: Record<string, number> = {
  "/cam/geometry-detail": 30_000,
  "/cam/feature-candidates": 30_000,
  "/cam/setup": 30_000,
  "/cam/operation": 30_000,
  "/cam/assign-tool": 30_000,
  "/cam/toolpath": 180_000,  // Toolpath gen: 5-60+ seconds
  "/cam/toolpath/status": 10_000,
  "/cam/operations": 30_000,
  "/cam/toolpath/validity": 30_000,
  "/cam/cycle-time": 30_000,
  "/cam/materials": 15_000,
  "/cam/post": 60_000,       // Post-processing can be slow for large programs
  "/data/projects": 15_000,
  "/data/folder/list": 30_000,
  "/data/search": 30_000,
  "/data/file/open": 60_000,  // Cloud file download can be slow
  "/data/file/metadata": 30_000,
  "/data/file/versions": 15_000,
};

// ── Types ───────────────────────────────────────────────────────────

export interface SketchShape {
  type: "rectangle" | "circle" | "line" | "arc" | "polygon";
  width_mm?: number;
  height_mm?: number;
  radius_mm?: number;
  center_x_mm?: number;
  center_y_mm?: number;
  points?: [number, number][];
  sides?: number;
  start_angle_deg?: number;
  end_angle_deg?: number;
}

export interface SketchResult {
  success: boolean;
  sketch_name?: string;
  profile_count?: number;
  shapes_created?: number;
  error?: string;
}

export interface OperationResult {
  success: boolean;
  feature_name?: string;
  body_count?: number;
  error?: string;
  [key: string]: unknown;
}

export interface ExportResult {
  success: boolean;
  format?: string;
  path?: string;
  error?: string;
}

export interface GeometryBody {
  name: string;
  index: number;
  volume_mm3: number;
  area_mm2: number;
  bounding_box_mm: [number, number, number];
  bounding_box_min_mm: [number, number, number];
  bounding_box_max_mm: [number, number, number];
  face_count: number;
  edge_count: number;
  vertex_count: number;
  is_valid: boolean;
}

export interface GeometryResult {
  body_count: number;
  bodies: GeometryBody[];
}

export interface Fusion360Status {
  status: string;
  version: string;
  document: string | null;
  component_count: number;
  body_count: number;
  timeline_count: number;
}

export interface ParameterInfo {
  name: string;
  value_mm?: number;
  value?: number;
  expression?: string;
  unit?: string;
  comment?: string;
}

export interface ActionExecutionResult {
  success: boolean;
  results: OperationResult[];
  geometry: GeometryResult | null;
  errors: string[];
  actions_executed: number;
  actions_failed: number;
}

// ── CAM Types ──────────────────────────────────────────────────────

export interface CamSetupInput {
  name?: string;
  /** Setup type: milling, turning, mill_turn, or cutting (EDM). */
  type?: "milling" | "turning" | "mill_turn" | "cutting";
  model_body_indices?: number[];
  stock?: {
    mode?: "fixed_size" | "relative" | "from_body" | "cylindrical";
    width_mm?: number;
    height_mm?: number;
    depth_mm?: number;
    offset_top_mm?: number;
    offset_sides_mm?: number;
    offset_bottom_mm?: number;
    /** Cylindrical stock: bar diameter for turning/mill-turn. */
    bar_diameter_mm?: number;
    /** Cylindrical stock: bar length for turning/mill-turn. */
    bar_length_mm?: number;
    /** Fixed plate thickness for wire EDM. */
    thickness_mm?: number;
  };
  wcs_origin?: "stock_box_point" | "model_origin";
  /** Turning/mill-turn: workholding type (chuck/collet). */
  workholding?: string;
  /** Turning: spindle rotation direction. */
  spindle_direction?: "cw" | "ccw";
}

export interface CamSetupResult {
  success: boolean;
  setup_name: string;
  setup_index: number;
  model_count: number;
  stock_mode: string;
  error?: string;
}

export interface CamOperationInput {
  setup_name?: string;
  setup_index?: number;
  operation_type: string;
  name?: string;
  /** Machining parameters. Values may be numeric (RPM, feed) or string (spindle_mode, channel_id). */
  parameters?: Record<string, number | string | boolean | undefined>;
}

export interface CamOperationResult {
  success: boolean;
  operation_name: string;
  operation_type: string;
  parameters_set: number;
  error?: string;
}

export interface AssignToolInput {
  setup_name?: string;
  operation_name: string;
  tool_spec: {
    diameter_mm: number;
    type: string;
    flute_count?: number;
    flute_length_mm?: number;
    overall_length_mm?: number;
    corner_radius_mm?: number;
    coating?: string;
    manufacturer?: string;
    description?: string;
  };
  search_library_first?: boolean;
}

export interface AssignToolResult {
  success: boolean;
  tool_description: string;
  source: "library" | "created_inline";
  error?: string;
}

export interface ToolpathInput {
  setup_name?: string;
  operation_names?: string[];
  generate_all?: boolean;
}

export interface ToolpathJobResult {
  success: boolean;
  job_id: string;
  status: "generating" | "complete" | "error";
  operations_queued: number;
  error?: string;
}

export interface ToolpathStatusResult {
  job_id: string;
  status: "generating" | "complete" | "error" | "timeout" | "expired";
  elapsed_sec: number;
  error?: string;
}

export interface CamOperationListItem {
  setup_name: string;
  setup_index: number;
  operation_name: string;
  operation_index: number;
  /** Fusion's adsk.cam.OperationTypes enum value (numeric). null if unavailable. */
  operation_type: number | null;
  strategy: string;
  /** false = edits made after last toolpath generation; cached G-code is stale. */
  is_toolpath_valid: boolean | null;
  is_suppressed: boolean | null;
  tool: { description: string; type: string } | null;
  /** Subset of expressions: tool_spindleSpeed, tool_feedCutting, tool_feedEntry, tool_stepdown, tool_stepover. */
  speed_feed?: Record<string, string>;
}

export interface CamOperationListResult {
  operations: CamOperationListItem[];
  count: number;
  error?: string;
}

export interface CamToolpathValidityItem {
  setup_name: string;
  operation_name: string;
  operation_index: number;
  is_toolpath_valid: boolean;
}

export interface CamToolpathValidityResult {
  operations: CamToolpathValidityItem[];
  valid_count: number;
  invalid_count: number;
  /** True only when every queried operation is valid AND at least one exists. */
  all_valid: boolean;
  error?: string;
}

export interface CamCycleTimeOperation {
  operation_name: string;
  operation_index: number;
  cycle_time_sec: number;
  cycle_time_min: number;
}

export interface CamCycleTimeSetup {
  setup_name: string;
  setup_index: number;
  operations: CamCycleTimeOperation[];
  setup_cycle_time_sec: number;
  setup_cycle_time_min: number;
}

export interface CamCycleTimeResult {
  setups: CamCycleTimeSetup[];
  total_cycle_time_sec: number;
  total_cycle_time_min: number;
  error?: string;
}

export interface CamMaterialEntry {
  name: string;
  id: string;
  appearance: string;
}

export interface CamBodyAssignment {
  body_name: string;
  body_index: number;
  material_name: string;
  material_id: string;
}

export interface CamSetupMaterial {
  setup_name: string;
  setup_index: number;
  stock_material: string;
}

export interface CamMaterialsResult {
  body_materials: CamMaterialEntry[];
  body_assignments: CamBodyAssignment[];
  cam_setup_materials: CamSetupMaterial[];
  count: number;
  error?: string;
}

export interface PostProcessInput {
  setup_name?: string;
  post_processor_path: string;
  program_name: string;
  output_folder: string;
  output_units?: "mm" | "inch";
}

export interface PostProcessResult {
  success: boolean;
  output_file: string;
  program_name: string;
  line_count: number;
  error?: string;
}

export interface BRepFace {
  index: number;
  surface_type: "plane" | "cylinder" | "cone" | "sphere" | "torus" | "nurbs";
  area_mm2: number;
  normal?: [number, number, number];
  radius_mm?: number;
  axis?: [number, number, number];
  is_hole?: boolean;
  bounding_box_mm?: { min: [number, number, number]; max: [number, number, number] };
}

export interface GeometryDetailResult {
  body_count: number;
  faces: BRepFace[];
  grouped_by_type: { planar: number; cylindrical: number; other: number };
}

export interface FeatureCandidate {
  type: "hole" | "pocket" | "boss" | "planar_face";
  faces: number[];
  radius_mm?: number;
  depth_mm?: number;
  is_through?: boolean;
  normal?: [number, number, number];
  area_mm2?: number;
}

export interface FeatureCandidateResult {
  candidates: FeatureCandidate[];
  total_faces: number;
}

export interface DataProject {
  id: string;
  name: string;
  index: number;
}

export interface CloudFile {
  name: string;
  id: string;
  project: string;
  path: string;
  extension: string;
  size_bytes: number;
  modified?: string;
}

export interface FolderListResult {
  name: string;
  project_name: string;
  files: Array<{ name: string; id: string; extension: string; size_bytes: number; modified?: string; version_count: number }>;
  subfolders: FolderListResult[];
  truncated: boolean;
}

export interface FileMetadataResult {
  document_name: string;
  design: {
    body_count: number;
    occurrence_count: number;
    sketch_count: number;
    feature_count: number;
    parameter_count: number;
    bodies: Array<{ name: string; volume_mm3: number; area_mm2: number; face_count: number; edge_count: number }>;
  };
  cam: {
    has_cam: boolean;
    setup_count?: number;
    setups: Array<{
      name: string;
      type: string;
      operations: Array<{
        name: string;
        type: string;
        strategy: string;
        tool?: { description: string; type: string; diameter_mm: number; flute_count: number };
        speed_feed?: { rpm: number; feed_mm_min: number; stepdown_mm?: number; stepover_mm?: number };
      }>;
    }>;
  };
}

export interface FileVersionResult {
  file_name: string;
  file_id: string;
  version_count: number;
  is_mature: boolean;
  versions: Array<{ version_number: number; id: string; created?: string; creator: string; comment: string }>;
}

// ── Engine ──────────────────────────────────────────────────────────

export class Fusion360LiveBridgeEngine {
  private baseUrl: string;
  private _activeRequests = 0;
  private _requestQueue: Array<{ resolve: () => void }> = [];
  private _healthCache: { connected: boolean; checkedAt: number } = { connected: false, checkedAt: 0 };
  private static readonly HEALTH_CACHE_TTL_MS = 10_000;

  constructor(baseUrl: string = F360_URL) {
    this.baseUrl = baseUrl;
  }

  // ── Connection ──────────────────────────────────────────────────

  /**
   * Check if the Fusion 360 API server is reachable.
   * Results cached for 10 seconds to avoid hammering the add-in.
   */
  async isConnected(): Promise<boolean> {
    const now = Date.now();
    if (now - this._healthCache.checkedAt < Fusion360LiveBridgeEngine.HEALTH_CACHE_TTL_MS) {
      return this._healthCache.connected;
    }
    const connected = await this.healthCheck();
    this._healthCache = { connected, checkedAt: now };
    return connected;
  }

  /**
   * Perform a live health check against the Fusion 360 add-in.
   * Unlike isConnected(), this always makes a network call.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return false;
      const data = await res.json() as Record<string, unknown>;
      return data.status === "ok";
    } catch {
      return false;
    }
  }

  /**
   * Get Fusion 360 status including active document info.
   */
  async getStatus(): Promise<Fusion360Status> {
    return this._get<Fusion360Status>("/status");
  }

  // ── Sketch ──────────────────────────────────────────────────────

  /**
   * Create a sketch with shapes on a construction plane.
   * @param params.plane - "XY" | "XZ" | "YZ" (default: "XY")
   * @param params.shapes - Array of shapes to create
   * @param params.offset_mm - Optional offset (mm) of a construction plane from
   *   the named base plane. Enables stacked profiles for loft / multi-level
   *   features. Absent or 0 → sketch sits on the base plane (legacy behaviour).
   */
  async createSketch(params: {
    plane?: string;
    shapes: SketchShape[];
    offset_mm?: number;
  }): Promise<SketchResult> {
    return this._post<SketchResult>("/sketch", params);
  }

  // ── Features ────────────────────────────────────────────────────

  /**
   * Extrude a sketch profile.
   * @param params.depth_mm - Extrusion depth in mm
   * @param params.operation - "new" | "join" | "cut" | "intersect"
   * @param params.profile_index - Which profile to extrude (default: 0)
   */
  async extrude(params: {
    depth_mm: number;
    operation?: "new" | "join" | "cut" | "intersect";
    profile_index?: number;
    sketch_name?: string;
    symmetric?: boolean;
    direction?: "positive" | "negative";
  }): Promise<OperationResult> {
    return this._post<OperationResult>("/extrude", params);
  }

  /**
   * Fillet edges of a body.
   * @param params.radius_mm - Fillet radius in mm
   * @param params.edge_selection - "all" | "top" | "bottom" | "vertical" | "internal_horizontal" | number[]
   *   "internal_horizontal" matches circular edges perpendicular to the revolution
   *   axis at NON-extreme axial positions — i.e. OD step transitions on a stepped
   *   revolved part. Used for shoulder fillets that must not touch the tip/base.
   * @param params.revolution_axis - "X" | "Y" | "Z" — axis used to interpret
   *   top/bottom/vertical/internal_horizontal selectors. Defaults to "Z".
   */
  async fillet(params: {
    radius_mm: number;
    edge_selection?: string | number[];
    body_index?: number;
    revolution_axis?: "X" | "Y" | "Z";
  }): Promise<OperationResult> {
    return this._post<OperationResult>("/fillet", params);
  }

  /**
   * Chamfer edges of a body.
   * @param params.distance_mm - Chamfer distance in mm
   * @param params.edge_selection - "all" | "top" | "bottom" | "vertical" | "internal_horizontal" | number[]
   * @param params.revolution_axis - "X" | "Y" | "Z" — axis used to interpret
   *   top/bottom/vertical/internal_horizontal selectors. Defaults to "Z".
   */
  async chamfer(params: {
    distance_mm: number;
    edge_selection?: string | number[];
    body_index?: number;
    revolution_axis?: "X" | "Y" | "Z";
  }): Promise<OperationResult> {
    return this._post<OperationResult>("/chamfer", params);
  }

  /**
   * Revolve a profile around an axis.
   * @param params.angle_deg - Revolution angle in degrees (default: 360)
   * @param params.axis - "X" | "Y" | "Z" (default: "X")
   */
  async revolve(params: {
    angle_deg?: number;
    axis?: "X" | "Y" | "Z";
    profile_index?: number;
    sketch_name?: string;
    operation?: "new" | "join" | "cut" | "intersect";
  }): Promise<OperationResult> {
    return this._post<OperationResult>("/revolve", {
      angle_deg: params.angle_deg ?? 360,
      ...params,
    });
  }

  /**
   * Import a real CAD file (STEP/IGES/F3D/SMT) into the active design. After import, GET /geometry
   * returns Fusion's KERNEL bounding box of the imported solid -- the AUTHORITATIVE part envelope, with
   * the file's own units resolved natively by Fusion (no manual mm/inch 25.4x scaling). This is the
   * kernel-ground-truth path that resolves the ~9.5% of corpus STEP parts (concentrated in
   * casing/bushing/die) whose point-cloud (CARTESIAN_POINT) bbox is degenerate in the text extractor.
   * Requires the /import add-in route (resources/FUSION360/.../prism_api_server.py) -- loaded via an
   * operator add-in Stop+Run. NOTE: an assembly STEP imports as occurrences (sub-component bodies); the
   * root-only /geometry reports the root bRepBodies only (single-solid parts land directly in root).
   * @param params.path - absolute path to the CAD file on the Fusion host
   * @param params.format - optional format override ("step"|"stp"|"iges"|"igs"|"f3d"|"smt"); inferred from the extension when omitted
   */
  async importStep(params: { path: string; format?: string }): Promise<OperationResult> {
    return this._post<OperationResult>("/import", params);
  }

  /**
   * Create a hole feature.
   * @param params.diameter_mm - Hole diameter in mm
   * @param params.depth_mm - Hole depth in mm
   * @param params.position - [x_mm, y_mm] position on face
   * @param params.type - "simple" | "counterbore" | "countersink"
   */
  async createHole(params: {
    diameter_mm: number;
    depth_mm: number;
    position?: [number, number];
    type?: "simple" | "counterbore" | "countersink";
    counterbore_diameter_mm?: number;
    counterbore_depth_mm?: number;
    countersink_diameter_mm?: number;
    countersink_angle_deg?: number;
  }): Promise<OperationResult> {
    return this._post<OperationResult>("/hole", params);
  }

  /**
   * Create a linear or circular pattern.
   * @param params.type - "linear" | "circular"
   * @param params.count - Number of instances
   * @param params.spacing_mm - Spacing between instances (linear)
   * @param params.axis - "X" | "Y" | "Z"
   */
  async pattern(params: {
    type: "linear" | "circular";
    count: number;
    spacing_mm?: number;
    axis?: "X" | "Y" | "Z";
    count2?: number;
    axis2?: "X" | "Y" | "Z";
    spacing2_mm?: number;
    total_angle_deg?: number;
    symmetric?: boolean;
  }): Promise<OperationResult> {
    return this._post<OperationResult>("/pattern", params);
  }

  /**
   * Boolean combine two or more bodies.
   * @param params.operation - "join" | "cut" | "intersect"
   * @param params.target_body - Index of target body (default: 0)
   * @param params.tool_bodies - Indices of tool bodies (default: [1])
   */
  async combine(params: {
    operation: "join" | "cut" | "intersect";
    target_body?: number;
    tool_bodies?: number[];
  }): Promise<OperationResult> {
    return this._post<OperationResult>("/combine", params);
  }

  /**
   * Shell a body (hollow out with wall thickness).
   * @param params.thickness_mm - Wall thickness in mm
   * @param params.face_selection - "top" | "bottom" | number[] (faces to remove)
   */
  async shell(params: {
    thickness_mm: number;
    face_selection?: string | number[];
    body_index?: number;
  }): Promise<OperationResult> {
    return this._post<OperationResult>("/shell", params);
  }

  /**
   * Sweep a closed profile along a path curve (adsk.fusion sweepFeatures).
   * Unlocks tubes, organic extrusions along curves, twisted/tapered bodies —
   * geometry that plain extrude/revolve cannot express. The profile and path
   * live in SEPARATE sketches (e.g. profile on XY, path on XZ).
   * @param params.profile_sketch_name - sketch holding the closed profile (default: most-recent sketch)
   * @param params.path_sketch_name - sketch holding the open path curve (default: most-recent sketch ≠ profile)
   * @param params.profile_index - which profile in the profile sketch (default 0)
   * @param params.operation - "new_body" | "join" | "cut" | "intersect" (default "new_body")
   * @param params.twist_deg - total twist about the path tangent (optional)
   * @param params.taper_deg - profile draft along the path (optional)
   */
  async sweep(params: {
    profile_sketch_name?: string;
    path_sketch_name?: string;
    profile_index?: number;
    operation?: "new_body" | "join" | "cut" | "intersect";
    twist_deg?: number;
    taper_deg?: number;
  }): Promise<OperationResult> {
    if (params.twist_deg !== undefined && !Number.isFinite(params.twist_deg)) {
      return { success: false, error: "sweep: twist_deg must be a finite number" };
    }
    if (params.taper_deg !== undefined && !Number.isFinite(params.taper_deg)) {
      return { success: false, error: "sweep: taper_deg must be a finite number" };
    }
    if (params.profile_index !== undefined &&
        (!Number.isInteger(params.profile_index) || params.profile_index < 0)) {
      return { success: false, error: "sweep: profile_index must be a non-negative integer" };
    }
    return this._post<OperationResult>("/sweep", params);
  }

  /**
   * Loft a solid/surface through 2+ profile sections (adsk.fusion loftFeatures).
   * Unlocks transitions, organic blends, impeller/airfoil-style bodies. Sections
   * are typically sketched on stacked offset planes — see createSketch({offset_mm}).
   * @param params.sections - ordered list (len ≥ 2) of {sketch_name, profile_index}
   * @param params.operation - "new_body" | "join" | "cut" | "intersect" (default "new_body")
   * @param params.closed - connect last profile back to first (default false)
   * @param params.output_type - "solid" | "surface" (default "solid")
   */
  async loft(params: {
    sections: Array<{ sketch_name?: string; profile_index?: number }>;
    operation?: "new_body" | "join" | "cut" | "intersect";
    closed?: boolean;
    output_type?: "solid" | "surface";
  }): Promise<OperationResult> {
    if (!Array.isArray(params.sections) || params.sections.length < 2) {
      return { success: false, error: "loft: sections must be an array of at least 2 entries" };
    }
    for (let i = 0; i < params.sections.length; i++) {
      const pi = params.sections[i]?.profile_index;
      if (pi !== undefined && (!Number.isInteger(pi) || pi < 0)) {
        return { success: false, error: `loft: sections[${i}].profile_index must be a non-negative integer` };
      }
    }
    return this._post<OperationResult>("/loft", params);
  }

  // ── Export ──────────────────────────────────────────────────────

  /**
   * Export the current model to a file.
   * @param params.format - "step" | "stl" | "f3d" | "iges"
   * @param params.path - Output file path
   */
  async exportModel(params: {
    format: "step" | "stl" | "f3d" | "iges";
    path: string;
    refinement?: "low" | "medium" | "high";
  }): Promise<ExportResult> {
    return this._post<ExportResult>("/export", params);
  }

  // ── Geometry Query ─────────────────────────────────────────────

  /**
   * Get geometry metrics for all bodies in the active document.
   */
  async getGeometry(): Promise<GeometryResult> {
    return this._get<GeometryResult>("/geometry");
  }

  // ── Document Operations ────────────────────────────────────────

  /**
   * Undo the last operation.
   */
  async undo(): Promise<{ success: boolean }> {
    return this._post<{ success: boolean }>("/undo", {});
  }

  /**
   * Create a new Fusion 360 document.
   * @param name - Optional document name
   */
  async newDocument(name?: string): Promise<{
    success: boolean;
    document_name: string;
    design_type: string;
  }> {
    return this._post("/new", { name: name ?? "PRISM Part", parametric: true });
  }

  // ── Parameters ─────────────────────────────────────────────────

  /**
   * Set a user parameter in the active design.
   */
  async setParameter(
    name: string,
    value_mm: number,
    comment?: string,
  ): Promise<{ success: boolean; action?: string; name?: string }> {
    return this._post("/parameter", {
      action: "set",
      name,
      value_mm,
      comment,
    });
  }

  /**
   * Get a user parameter value.
   */
  async getParameter(name: string): Promise<ParameterInfo & { success: boolean }> {
    return this._post("/parameter", { action: "get", name });
  }

  /**
   * List all user parameters.
   */
  async listParameters(): Promise<{
    success: boolean;
    parameters: ParameterInfo[];
  }> {
    return this._post("/parameter", { action: "list" });
  }

  // ── Raw Execution ──────────────────────────────────────────────

  /**
   * Execute arbitrary Python code inside Fusion 360.
   * Use for advanced operations not covered by specific endpoints.
   * The code has access to `adsk` and `app` variables.
   *
   * WARNING: This method sends code directly to Fusion 360 for execution.
   * Only call with trusted/internally-generated code — never with raw user input.
   * All public-facing actions should use the typed methods (createSketch, extrude, etc.)
   * which validate parameters before building code strings.
   */
  async executeRaw(code: string): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }> {
    // Block obviously dangerous patterns that should never appear in F360 Python
    const blocked = /import\s+os|import\s+subprocess|import\s+sys|__import__|exec\s*\(|eval\s*\(|open\s*\(/;
    if (blocked.test(code)) {
      return { success: false, error: "Blocked: code contains disallowed import/exec pattern" };
    }
    return this._post("/execute", { code });
  }

  // ── Stepped revolve (typed half-profile builder) ─────────────────

  /**
   * Build a body of revolution from an ordered list of axial steps and revolve.
   *
   * Each step describes one axial segment of the half-profile. Between consecutive
   * steps where end_diameter ≠ next start_diameter, a perpendicular step face is
   * inserted automatically. Within a step, set end_diameter_mm to taper the segment
   * from start to end diameter; omit it for a pure cylindrical section.
   *
   * Profile is sketched on the construction plane orthogonal to `axis`:
   *   - axis="Y" → sketch on XY, X=radial, Y=axial
   *   - axis="Z" → sketch on XZ, X=radial, Z=axial
   *   - axis="X" → sketch on XY rotated; uses XY plane with Y=radial, X=axial
   * Then revolves 360° around the named construction axis.
   *
   * Eliminates raw Python from callers driving simple solids of revolution
   * (punches, shafts, pins, bushings, tapered fittings, etc.).
   */
  async revolveStepProfile(params: {
    steps: Array<{
      diameter_mm: number;
      length_mm: number;
      end_diameter_mm?: number;
    }>;
    axis?: "X" | "Y" | "Z";
    sketch_name?: string;
  }): Promise<OperationResult> {
    const steps = params.steps;
    if (!Array.isArray(steps) || steps.length === 0) {
      return { success: false, error: "revolveStepProfile: steps must be a non-empty array" };
    }
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i] as { diameter_mm: number; length_mm: number; end_diameter_mm?: number };
      if (!Number.isFinite(s.diameter_mm) || s.diameter_mm <= 0) {
        return { success: false, error: `step[${i}].diameter_mm must be > 0` };
      }
      if (!Number.isFinite(s.length_mm) || s.length_mm <= 0) {
        return { success: false, error: `step[${i}].length_mm must be > 0` };
      }
      if (s.end_diameter_mm !== undefined && (!Number.isFinite(s.end_diameter_mm) || s.end_diameter_mm <= 0)) {
        return { success: false, error: `step[${i}].end_diameter_mm must be > 0` };
      }
    }

    const axis = (params.axis ?? "Y").toUpperCase() as "X" | "Y" | "Z";
    if (axis !== "X" && axis !== "Y" && axis !== "Z") {
      return { success: false, error: `axis must be X|Y|Z, got "${params.axis}"` };
    }

    const MM_TO_CM = 0.1;
    const pts: Array<[number, number]> = [];
    let z = 0;
    pts.push([0, 0]);
    pts.push([(steps[0]?.diameter_mm ?? 0) / 2 * MM_TO_CM, 0]);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i] as { diameter_mm: number; length_mm: number; end_diameter_mm?: number };
      const r_start = (s.diameter_mm / 2) * MM_TO_CM;
      const r_end = ((s.end_diameter_mm ?? s.diameter_mm) / 2) * MM_TO_CM;
      const L = s.length_mm * MM_TO_CM;
      const z_start = z;
      const z_end = z + L;
      const prev = pts[pts.length - 1] as [number, number];
      if (Math.abs(prev[0] - r_start) > 1e-9) {
        pts.push([r_start, z_start]);
      }
      pts.push([r_end, z_end]);
      z = z_end;
    }
    pts.push([0, z]);

    const axisMap: Record<"X" | "Y" | "Z", { plane: string; pt: (r: number, a: number) => string; axisProp: string }> = {
      X: { plane: "xYConstructionPlane", pt: (r, a) => `adsk.core.Point3D.create(${a.toFixed(6)}, ${r.toFixed(6)}, 0)`, axisProp: "xConstructionAxis" },
      Y: { plane: "xYConstructionPlane", pt: (r, a) => `adsk.core.Point3D.create(${r.toFixed(6)}, ${a.toFixed(6)}, 0)`, axisProp: "yConstructionAxis" },
      Z: { plane: "xZConstructionPlane", pt: (r, a) => `adsk.core.Point3D.create(${r.toFixed(6)}, 0, ${a.toFixed(6)})`, axisProp: "zConstructionAxis" },
    };
    const cfg = axisMap[axis];
    const sketchName = (params.sketch_name ?? "RevolveProfile").replace(/[^A-Za-z0-9_]/g, "_");

    const ptDecl = pts.map((p, i) => `p${i} = ${cfg.pt(p[0], p[1])}`).join("\n");
    const lineDecl = pts.map((_, i) => `lines.addByTwoPoints(p${i}, p${(i + 1) % pts.length})`).join("\n");

    const code = `
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
sk = root.sketches.add(root.${cfg.plane})
sk.name = '${sketchName}'
lines = sk.sketchCurves.sketchLines
${ptDecl}
${lineDecl}
if sk.profiles.count != 1:
    result = {'success': False, 'error': f'expected 1 profile, got {sk.profiles.count} (check for self-intersection)'}
else:
    profile = sk.profiles.item(0)
    rev_in = root.features.revolveFeatures.createInput(
        profile,
        root.${cfg.axisProp},
        adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
    )
    rev_in.setAngleExtent(False, adsk.core.ValueInput.createByString('360 deg'))
    feat = root.features.revolveFeatures.add(rev_in)
    result = {'success': True, 'feature_name': feat.name, 'body_count': root.bRepBodies.count, 'profile_points': ${pts.length}}
`;

    const raw = await this.executeRaw(code);
    const r = raw.result as Partial<OperationResult> | undefined;
    return {
      success: raw.success && (r?.success !== false),
      feature_name: r?.feature_name,
      body_count: typeof r?.body_count === "number" ? r.body_count : undefined,
      error: raw.error ?? r?.error,
      profile_points: pts.length,
    } as OperationResult;
  }

  // ── Tapered extrude (typed wrapper around executeRaw) ───────────

  /**
   * Extrude an existing sketch profile with a draft (taper) angle.
   * Eliminates the executeRaw boilerplate from caller scripts; the live HTTP
   * bridge `/extrude` does not yet forward `taperAngle` to the F360 add-in.
   */
  async extrudeTapered(params: {
    sketch_name: string;
    depth_mm: number;
    taper_angle_deg: number;
    profile_index?: number;
    operation?: "new" | "join" | "cut" | "intersect";
    reversed?: boolean;
  }): Promise<OperationResult> {
    if (typeof params.sketch_name !== "string" || params.sketch_name.length === 0) {
      return { success: false, error: "extrudeTapered: sketch_name must be a non-empty string" };
    }
    if (!Number.isFinite(params.depth_mm) || params.depth_mm <= 0) {
      return { success: false, error: "extrudeTapered: depth_mm must be > 0" };
    }
    if (!Number.isFinite(params.taper_angle_deg) || Math.abs(params.taper_angle_deg) >= 89) {
      return { success: false, error: "extrudeTapered: taper_angle_deg must be in (-89, 89)" };
    }
    const opMap: Record<string, string> = {
      new: "NewBodyFeatureOperation",
      cut: "CutFeatureOperation",
      join: "JoinFeatureOperation",
      intersect: "IntersectFeatureOperation",
    };
    const fusionOp = opMap[params.operation ?? "new"] ?? "NewBodyFeatureOperation";
    const profileIdx = Number.isInteger(params.profile_index) ? (params.profile_index as number) : 0;
    const sketchName = params.sketch_name.replace(/[^A-Za-z0-9_]/g, "_");
    const depth_cm = (params.reversed ? -1 : 1) * params.depth_mm * 0.1;
    const taper_rad = (params.taper_angle_deg * Math.PI) / 180;

    const code = `
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
target_sk = None
for s in root.sketches:
    if s.name == '${sketchName}':
        target_sk = s
        break
if target_sk is None:
    result = {'success': False, 'error': f"sketch '${sketchName}' not found"}
elif target_sk.profiles.count <= ${profileIdx}:
    result = {'success': False, 'error': f"profile_index ${profileIdx} out of range (count={target_sk.profiles.count})"}
else:
    profile = target_sk.profiles.item(${profileIdx})
    ext_in = root.features.extrudeFeatures.createInput(profile, adsk.fusion.FeatureOperations.${fusionOp})
    ext_in.setDistanceExtent(False, adsk.core.ValueInput.createByReal(${depth_cm.toFixed(6)}))
    ext_in.taperAngle = adsk.core.ValueInput.createByReal(${taper_rad.toFixed(6)})
    feat = root.features.extrudeFeatures.add(ext_in)
    result = {'success': True, 'feature_name': feat.name, 'body_count': root.bRepBodies.count}
`;
    const raw = await this.executeRaw(code);
    const r = raw.result as Partial<OperationResult> | undefined;
    return {
      success: raw.success && (r?.success !== false),
      feature_name: r?.feature_name,
      body_count: typeof r?.body_count === "number" ? r.body_count : undefined,
      error: raw.error ?? r?.error,
    } as OperationResult;
  }

  // ── Cross-drilled relief holes (typed wrapper around executeRaw) ──

  /**
   * Cut N cross-drilled holes radially through a body of revolution.
   * Common feature on extrude punches/dies/shafts (Ø.05 / Ø.06 callouts).
   */
  async crossDrillHoles(params: {
    diameter_mm: number;
    axial_position_mm: number;
    part_radius_mm: number;
    count?: number;
    revolution_axis?: "X" | "Y" | "Z";
  }): Promise<OperationResult> {
    if (!Number.isFinite(params.diameter_mm) || params.diameter_mm <= 0) {
      return { success: false, error: "crossDrillHoles: diameter_mm must be > 0" };
    }
    if (!Number.isFinite(params.axial_position_mm)) {
      return { success: false, error: "crossDrillHoles: axial_position_mm must be finite" };
    }
    if (!Number.isFinite(params.part_radius_mm) || params.part_radius_mm <= 0) {
      return { success: false, error: "crossDrillHoles: part_radius_mm must be > 0" };
    }
    const count = params.count ?? 1;
    if (!Number.isInteger(count) || count < 1 || count > 64) {
      return { success: false, error: "crossDrillHoles: count must be an integer in [1, 64]" };
    }
    const revAxis = (params.revolution_axis ?? "Y").toUpperCase() as "X" | "Y" | "Z";
    if (revAxis !== "X" && revAxis !== "Y" && revAxis !== "Z") {
      return { success: false, error: `crossDrillHoles: revolution_axis must be X|Y|Z, got "${params.revolution_axis}"` };
    }

    const r_cm = (params.diameter_mm / 2) * 0.1;
    const axial_cm = params.axial_position_mm * 0.1;
    const partR_cm = params.part_radius_mm * 0.1;
    const cutDepth_cm = partR_cm * 2.2;

    const axisCfg: Record<"X" | "Y" | "Z", {
      sketchPlane: string;
      circleCenter: string;
      patternAxis: string;
      cutOffsetExpr: string;
    }> = {
      X: {
        sketchPlane: "xZConstructionPlane",
        circleCenter: `adsk.core.Point3D.create(${axial_cm.toFixed(6)}, 0, 0)`,
        patternAxis: "xConstructionAxis",
        cutOffsetExpr: `${cutDepth_cm.toFixed(6)}`,
      },
      Y: {
        sketchPlane: "xYConstructionPlane",
        circleCenter: `adsk.core.Point3D.create(0, ${axial_cm.toFixed(6)}, 0)`,
        patternAxis: "yConstructionAxis",
        cutOffsetExpr: `${cutDepth_cm.toFixed(6)}`,
      },
      Z: {
        sketchPlane: "yZConstructionPlane",
        circleCenter: `adsk.core.Point3D.create(0, 0, ${axial_cm.toFixed(6)})`,
        patternAxis: "zConstructionAxis",
        cutOffsetExpr: `${cutDepth_cm.toFixed(6)}`,
      },
    };
    const cfg = axisCfg[revAxis];

    const code = `
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
planes = root.constructionPlanes
plane_in = planes.createInput()
plane_in.setByOffset(root.${cfg.sketchPlane}, adsk.core.ValueInput.createByReal(-${partR_cm.toFixed(6)}))
offset_plane = planes.add(plane_in)
sk = root.sketches.add(offset_plane)
sk.name = 'CrossDrill_${revAxis}_${(params.axial_position_mm).toFixed(2).replace(/[^0-9]/g, "_")}'
sk.sketchCurves.sketchCircles.addByCenterRadius(${cfg.circleCenter}, ${r_cm.toFixed(6)})
profile = sk.profiles.item(0)
ext_in = root.features.extrudeFeatures.createInput(profile, adsk.fusion.FeatureOperations.CutFeatureOperation)
ext_in.setDistanceExtent(False, adsk.core.ValueInput.createByReal(${cfg.cutOffsetExpr}))
feat = root.features.extrudeFeatures.add(ext_in)
holes_made = 1
if ${count} > 1:
    pat_in = root.features.circularPatternFeatures.createInput(
        adsk.core.ObjectCollection.createWithArray([feat]),
        root.${cfg.patternAxis},
    )
    pat_in.quantity = adsk.core.ValueInput.createByReal(${count})
    pat_in.totalAngle = adsk.core.ValueInput.createByString('360 deg')
    pat_in.isSymmetric = False
    pat_feat = root.features.circularPatternFeatures.add(pat_in)
    holes_made = ${count}
result = {'success': True, 'feature_name': feat.name, 'body_count': root.bRepBodies.count, 'holes_made': holes_made}
`;
    const raw = await this.executeRaw(code);
    const r = raw.result as Partial<OperationResult> & { holes_made?: number } | undefined;
    return {
      success: raw.success && (r?.success !== false),
      feature_name: r?.feature_name,
      body_count: typeof r?.body_count === "number" ? r.body_count : undefined,
      error: raw.error ?? r?.error,
    } as OperationResult;
  }

  // ── Action Sequence Execution ──────────────────────────────────

  /**
   * Execute a sequence of ExtractedActions via the live bridge.
   * Maps each action type to the appropriate endpoint.
   * Returns per-step results and final geometry.
   */
  async executeActions(actions: ExtractedAction[]): Promise<ActionExecutionResult> {
    const results: OperationResult[] = [];
    const errors: string[] = [];
    let actionsExecuted = 0;
    let actionsFailed = 0;

    for (const action of actions) {
      try {
        const result = await this._dispatchAction(action);
        results.push(result);
        if (result.success) {
          actionsExecuted++;
        } else {
          actionsFailed++;
          errors.push(
            `Step ${action.step_number} (${action.action_type}): ${result.error ?? "unknown error"}`,
          );
        }
      } catch (err) {
        actionsFailed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Step ${action.step_number} (${action.action_type}): ${msg}`);
        results.push({ success: false, error: msg });
      }
    }

    let geometry: GeometryResult | null = null;
    try {
      geometry = await this.getGeometry();
    } catch {
      // Geometry query may fail if no document
    }

    return {
      success: actionsFailed === 0,
      results,
      geometry,
      errors,
      actions_executed: actionsExecuted,
      actions_failed: actionsFailed,
    };
  }

  /**
   * Full pipeline: process a video and execute the extracted actions live in Fusion 360.
   * Requires VideoActionExtractorEngine to be available.
   */
  async replayVideoLive(
    videoPath: string,
    extractorFn: (path: string) => Promise<{ actions: ExtractedAction[] }>,
  ): Promise<{
    success: boolean;
    actions: number;
    geometry: GeometryResult | null;
    errors: string[];
  }> {
    // Verify connection
    const connected = await this.isConnected();
    if (!connected) {
      return {
        success: false,
        actions: 0,
        geometry: null,
        errors: ["Fusion 360 API server not reachable on port 18360"],
      };
    }

    // Extract actions from video
    log.info("[F360Bridge] Extracting actions from video...");
    const extracted = await extractorFn(videoPath);
    log.info(`[F360Bridge] Extracted ${extracted.actions.length} actions`);

    // Create new document for replay
    await this.newDocument(`PRISM-Replay-${Date.now()}`);

    // Execute actions
    const result = await this.executeActions(extracted.actions);

    return {
      success: result.success,
      actions: extracted.actions.length,
      geometry: result.geometry,
      errors: result.errors,
    };
  }

  // ── Private: Action Dispatch ──────────────────────────────────

  private async _dispatchAction(
    action: ExtractedAction,
  ): Promise<OperationResult> {
    const p = action.parameters;
    const t = action.action_type;

    // Sketch creation types
    if (t === "sketch_create" || t === "sketch_rectangle" || t === "sketch_circle") {
      const shapes: SketchShape[] = [];
      if (t === "sketch_rectangle") {
        shapes.push({
          type: "rectangle",
          width_mm: (p.width_mm as number) ?? (p.width as number) ?? 50,
          height_mm: (p.height_mm as number) ?? (p.height as number) ?? 30,
        });
      } else if (t === "sketch_circle") {
        shapes.push({
          type: "circle",
          radius_mm: (p.radius_mm as number) ?? (p.radius as number) ?? 10,
        });
      }
      const sr = await this.createSketch({
        plane: (p.plane as string) ?? "XY",
        shapes,
      });
      return { success: sr.success, feature_name: sr.sketch_name, error: sr.error };
    }

    if (t === "sketch_line") {
      const rawPts = p.points;
      const pts: [number, number][] = Array.isArray(rawPts)
        ? (rawPts as [number, number][])
        : [[0, 0], [10, 10]];
      const sr = await this.createSketch({
        plane: (p.plane as string) ?? "XY",
        shapes: [{ type: "line", points: pts }],
      });
      return { success: sr.success, feature_name: sr.sketch_name, error: sr.error };
    }

    if (t === "extrude" || t === "extrude_cut") {
      return this.extrude({
        depth_mm: (p.depth_mm as number) ?? (p.depth as number) ?? 10,
        operation: t === "extrude_cut" ? "cut" : ((p.operation as string) ?? "new") as "new",
        profile_index: (p.profile_index as number) ?? 0,
      });
    }

    if (t === "fillet") {
      return this.fillet({
        radius_mm: (p.radius_mm as number) ?? (p.radius as number) ?? 2,
        edge_selection: (p.edge_selection as string) ?? "all",
      });
    }

    if (t === "chamfer") {
      return this.chamfer({
        distance_mm: (p.distance_mm as number) ?? (p.distance as number) ?? 1,
        edge_selection: (p.edge_selection as string) ?? "all",
      });
    }

    if (t === "revolve") {
      return this.revolve({
        angle_deg: (p.angle_deg as number) ?? (p.angle as number) ?? 360,
        axis: ((p.axis as string) ?? "X") as "X",
      });
    }

    if (t === "hole") {
      return this.createHole({
        diameter_mm: (p.diameter_mm as number) ?? (p.diameter as number) ?? 10,
        depth_mm: (p.depth_mm as number) ?? (p.depth as number) ?? 10,
        position: Array.isArray(p.position)
          ? (p.position as unknown as [number, number])
          : [0, 0],
      });
    }

    if (t === "shell") {
      return this.shell({
        thickness_mm: (p.thickness_mm as number) ?? (p.thickness as number) ?? 2,
      });
    }

    if (t === "pattern_linear") {
      return this.pattern({
        type: "linear",
        count: (p.count as number) ?? 3,
        spacing_mm: (p.spacing_mm as number) ?? (p.spacing as number) ?? 10,
        axis: ((p.axis as string) ?? "X") as "X",
      });
    }

    if (t === "pattern_circular") {
      return this.pattern({
        type: "circular",
        count: (p.count as number) ?? 4,
        axis: ((p.axis as string) ?? "Z") as "Z",
      });
    }

    if (t === "boolean_union" || t === "boolean_subtract" || t === "boolean_intersect") {
      const opMap: Record<string, "join" | "cut" | "intersect"> = {
        boolean_union: "join",
        boolean_subtract: "cut",
        boolean_intersect: "intersect",
      };
      return this.combine({
        operation: opMap[t],
        target_body: (p.target_body as number) ?? 0,
        tool_bodies: Array.isArray(p.tool_bodies)
          ? (p.tool_bodies as unknown as number[])
          : [1],
      });
    }

    if (t === "mirror_body") {
      // Validate plane to prevent code injection via string interpolation
      const VALID_PLANES: Record<string, string> = {
        XY: "xYConstructionPlane",
        XZ: "xZConstructionPlane",
        YZ: "yZConstructionPlane",
      };
      const rawPlane = ((p.plane as string) ?? "XY").toUpperCase();
      const planeProp = VALID_PLANES[rawPlane];
      if (!planeProp) {
        return { success: false, feature_name: undefined, error: `Invalid plane "${rawPlane}". Must be XY, XZ, or YZ.` };
      }
      return this.executeRaw(`
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
mirrors = root.features.mirrorFeatures
entities = adsk.core.ObjectCollection.create()
entities.add(root.bRepBodies.item(0))
plane = root.${planeProp}
mi = mirrors.createInput(entities, plane)
result = {"success": True, "feature_name": mirrors.add(mi).name}
`).then((r) => ({
        success: r.success,
        feature_name: undefined,
        error: r.error,
      }));
    }

    if (t === "parameter_set") {
      const name = (p.name as string) ?? "param1";
      const val = (p.value_mm as number) ?? (p.value as number) ?? 10;
      return this.setParameter(name, val).then((r) => ({
        success: r.success,
        error: undefined,
      }));
    }

    // Unknown action type — log and skip
    log.warn(`[F360Bridge] Unsupported action type for live execution: ${t}`);
    return {
      success: false,
      error: `Unsupported action type: ${t}`,
    };
  }

  // ── Private: HTTP helpers with retry + queuing ─────────────────

  /** Wait for a slot in the request queue (max MAX_CONCURRENT_REQUESTS). */
  private async _acquireSlot(): Promise<void> {
    if (this._activeRequests < MAX_CONCURRENT_REQUESTS) {
      this._activeRequests++;
      return;
    }
    return new Promise<void>((resolve) => {
      this._requestQueue.push({ resolve });
    });
  }

  /** Release a request queue slot and unblock the next waiter. */
  private _releaseSlot(): void {
    this._activeRequests--;
    const next = this._requestQueue.shift();
    if (next) {
      this._activeRequests++;
      next.resolve();
    }
  }

  /** Get the timeout for a given endpoint path. */
  private _getTimeout(path: string): number {
    // Strip query params for lookup
    const basePath = path.split("?")[0];
    return STAGE_TIMEOUT_MS[basePath] ?? REQUEST_TIMEOUT_MS;
  }

  /**
   * Single HTTP fetch with timeout — no retry.
   * @returns The parsed JSON response or throws.
   */
  private async _fetchOnce<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const timeoutMs = this._getTimeout(path);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const init: RequestInit = { method, signal: controller.signal };
      if (body !== undefined) {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify(body);
      }
      const res = await fetch(`${this.baseUrl}${path}`, init);
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Request to ${path} timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  /**
   * Retry-enabled fetch with exponential backoff and request queuing.
   * Retries on network errors and 5xx, NOT on 4xx (client errors).
   */
  private async _fetchWithRetry<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    await this._acquireSlot();
    try {
      let lastError: Error | undefined;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await this._fetchOnce<T>(method, path, body);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          // Don't retry on client errors (4xx)
          if (lastError.message.includes("HTTP 4")) {
            throw lastError;
          }
          // Don't retry on last attempt
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_BACKOFF_MS[attempt] ?? 2000;
            log.warn(`Fusion360 bridge retry ${attempt + 1}/${MAX_RETRIES} for ${path} after ${delay}ms: ${lastError.message}`);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
      throw lastError ?? new Error(`All ${MAX_RETRIES} retries failed for ${path}`);
    } finally {
      this._releaseSlot();
    }
  }

  private async _get<T>(path: string): Promise<T> {
    return this._fetchWithRetry<T>("GET", path);
  }

  private async _post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this._fetchWithRetry<T>("POST", path, body);
  }

  // ── CAM Operations (AutoProgram Pipeline) ─────────────────────────

  /**
   * Create a CAM setup in Fusion 360 with stock, WCS, and model bodies.
   * @param input - Setup configuration (name, type, stock, WCS origin, model body indices)
   */
  async createCamSetup(input: CamSetupInput): Promise<CamSetupResult> {
    return this._post<CamSetupResult>("/cam/setup", input as unknown as Record<string, unknown>);
  }

  /**
   * Create a CAM operation (face, pocket, adaptive, drill, etc.) in a setup.
   * @param input - Operation type, setup, name, and machining parameters
   */
  async createCamOperation(input: CamOperationInput): Promise<CamOperationResult> {
    return this._post<CamOperationResult>("/cam/operation", input as unknown as Record<string, unknown>);
  }

  /**
   * Assign a cutting tool to a CAM operation from library or inline creation.
   * @param input - Operation name, tool spec (diameter, type, flutes, etc.)
   */
  async assignTool(input: AssignToolInput): Promise<AssignToolResult> {
    return this._post<AssignToolResult>("/cam/assign-tool", input as unknown as Record<string, unknown>);
  }

  /**
   * Trigger async toolpath generation. Returns a job_id for polling.
   * Toolpath gen takes 5-60+ seconds — poll with getToolpathStatus().
   */
  async generateToolpaths(input: ToolpathInput): Promise<ToolpathJobResult> {
    return this._post<ToolpathJobResult>("/cam/toolpath", input as unknown as Record<string, unknown>);
  }

  /**
   * Poll toolpath generation status by job ID.
   * @param jobId - Job ID from generateToolpaths()
   */
  async getToolpathStatus(jobId: string): Promise<ToolpathStatusResult> {
    return this._get<ToolpathStatusResult>(`/cam/toolpath/status?job_id=${encodeURIComponent(jobId)}`);
  }

  /**
   * Enumerate every CAM operation across setups, optionally scoped to one setup.
   * Returns strategy + tool + key speed/feed expressions + per-op validity.
   * Used by orchestrators that need to know what already exists before posting.
   */
  async listCamOperations(setupName?: string): Promise<CamOperationListResult> {
    const path = setupName
      ? `/cam/operations?name=${encodeURIComponent(setupName)}`
      : "/cam/operations";
    return this._get<CamOperationListResult>(path);
  }

  /**
   * Per-operation toolpath up-to-date check. Cheap read — no kernel work, no
   * regeneration. Use this before posting to decide whether the cached G-code
   * is still authoritative.
   */
  async getToolpathValidity(setupName?: string): Promise<CamToolpathValidityResult> {
    const path = setupName
      ? `/cam/toolpath/validity?name=${encodeURIComponent(setupName)}`
      : "/cam/toolpath/validity";
    return this._get<CamToolpathValidityResult>(path);
  }

  /**
   * Cycle-time estimate per operation + setup totals + grand total.
   * Reads `operation.cycleTime` (seconds) — operations that have never been
   * generated return 0; pair with getToolpathValidity() if you need certainty.
   */
  async getCycleTime(setupName?: string): Promise<CamCycleTimeResult> {
    const path = setupName
      ? `/cam/cycle-time?name=${encodeURIComponent(setupName)}`
      : "/cam/cycle-time";
    return this._get<CamCycleTimeResult>(path);
  }

  /**
   * Materials available in the active document. Returns the design material
   * library, per-body assignments, and per-setup stock material expressions.
   * PRISM uses this to confirm Fusion's material matches the Kienzle material
   * loaded for force/feed calculation.
   */
  async getCamMaterials(): Promise<CamMaterialsResult> {
    return this._get<CamMaterialsResult>("/cam/materials");
  }

  /**
   * Post-process a setup or operation to G-code via a .cps post processor.
   * @param input - Post processor path, program name, output folder, units
   */
  async postProcess(input: PostProcessInput): Promise<PostProcessResult> {
    return this._post<PostProcessResult>("/cam/post", input as unknown as Record<string, unknown>);
  }

  /**
   * Get face-level B-Rep geometry detail for the active model.
   * Returns per-face surface type, normal, radius, area — feeds FeatureRecognitionEngine.
   */
  async getGeometryDetail(): Promise<GeometryDetailResult> {
    return this._get<GeometryDetailResult>("/cam/geometry-detail");
  }

  /**
   * Get topology-based feature candidates (holes, pockets, bosses, faces).
   * Groups B-Rep faces into machinable features for AutoProgram.
   */
  async getFeatureCandidates(): Promise<FeatureCandidateResult> {
    return this._get<FeatureCandidateResult>("/cam/feature-candidates");
  }

  // ── Cloud Data API ─────────────────────────────────────────────────

  /**
   * List all Fusion 360 cloud projects accessible to the user.
   */
  async listDataProjects(): Promise<{ projects: DataProject[]; count: number }> {
    return this._get<{ projects: DataProject[]; count: number }>("/data/projects");
  }

  /**
   * Browse a cloud project's folder tree.
   * @param projectIndex - Index from listDataProjects()
   * @param folderPath - Subfolder path (e.g., "Parts/Milling"). Empty = root.
   * @param maxDepth - Max recursion depth (default 3, max 10)
   */
  async listDataFolder(projectIndex: number, folderPath = "", maxDepth = 3): Promise<FolderListResult> {
    return this._post<FolderListResult>("/data/folder/list", {
      project_index: projectIndex,
      folder_path: folderPath,
      max_depth: maxDepth,
    });
  }

  /**
   * Search cloud files by name across all projects.
   * @param query - Name substring to search for
   * @param extension - File extension filter (e.g., "f3d")
   * @param maxResults - Max results (default 50, max 200)
   */
  async searchCloudFiles(query: string, extension?: string, maxResults = 50): Promise<{ results: CloudFile[]; count: number; query: string }> {
    const body: Record<string, unknown> = { query, max_results: maxResults };
    if (extension) body.extension = extension;
    return this._post<{ results: CloudFile[]; count: number; query: string }>("/data/search", body);
  }

  /**
   * Open a cloud file into the Fusion 360 workspace.
   * @param projectIndex - Project index
   * @param fileId - File ID (from search/folder listing)
   * @param filePath - Alternative: path like "Parts/bracket.f3d"
   */
  async openCloudFile(projectIndex: number, fileId?: string, filePath?: string): Promise<{ success: boolean; document_name: string; file_name: string; file_id: string; error?: string }> {
    const body: Record<string, unknown> = { project_index: projectIndex };
    if (fileId) body.file_id = fileId;
    if (filePath) body.file_path = filePath;
    return this._post("/data/file/open", body);
  }

  /**
   * Extract design + CAM metadata from the active document or specified file.
   * Returns feature tree, bodies, CAM setups with tools and S/F values.
   */
  async getFileMetadata(useActive = true): Promise<FileMetadataResult> {
    return this._post<FileMetadataResult>("/data/file/metadata", { use_active: useActive });
  }

  /**
   * Get version history for a cloud file.
   * Files with 8+ versions are flagged as "mature" (proven, stable designs).
   */
  async getFileVersions(useActive?: boolean, projectIndex?: number, fileId?: string): Promise<FileVersionResult> {
    const body: Record<string, unknown> = {};
    if (useActive !== undefined) body.use_active = useActive;
    if (projectIndex !== undefined) body.project_index = projectIndex;
    if (fileId) body.file_id = fileId;
    return this._post<FileVersionResult>("/data/file/versions", body);
  }

  // ── Tool Library Management ─────────────────────────────────────

  /**
   * Push tools to Fusion 360 tool library via live bridge.
   * Tools must be in Fusion 360 .tools format (from FusionToolExportEngine).
   */
  async pushToolLibrary(tools: unknown[], libraryName: string = "PRISM"): Promise<{ success: boolean; imported: number; library: string; path?: string }> {
    return this._post<{ success: boolean; imported: number; library: string; path?: string }>("/tool-import", {
      tools,
      library_name: libraryName,
    });
  }

  /**
   * List all tool libraries available in Fusion 360.
   */
  async getToolLibraries(): Promise<{ libraries: Array<{ name: string; tool_count: number; path: string }> }> {
    return this._get<{ libraries: Array<{ name: string; tool_count: number; path: string }> }>("/tool-library");
  }

  /**
   * Search tools across Fusion 360 libraries.
   */
  async searchTools(query: string, type?: string): Promise<{ results: unknown[] }> {
    const params = new URLSearchParams({ q: query });
    if (type) params.set("type", type);
    return this._get<{ results: unknown[] }>(`/tool-library/search?${params.toString()}`);
  }

  /**
   * Delete a tool library by name.
   */
  async deleteToolLibrary(name: string): Promise<{ success: boolean }> {
    return this._fetchWithRetry<{ success: boolean }>("DELETE", `/tool-library/${encodeURIComponent(name)}`);
  }
}

// ── Singleton Export ────────────────────────────────────────────────

export const fusion360LiveBridgeEngine = new Fusion360LiveBridgeEngine();
