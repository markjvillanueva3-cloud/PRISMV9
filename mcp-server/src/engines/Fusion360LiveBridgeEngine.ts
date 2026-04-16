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

const F360_URL = "http://127.0.0.1:18360";
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
   */
  async createSketch(params: {
    plane?: string;
    shapes: SketchShape[];
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
   * @param params.edge_selection - "all" | "top" | "bottom" | "vertical" | number[]
   */
  async fillet(params: {
    radius_mm: number;
    edge_selection?: string | number[];
    body_index?: number;
  }): Promise<OperationResult> {
    return this._post<OperationResult>("/fillet", params);
  }

  /**
   * Chamfer edges of a body.
   * @param params.distance_mm - Chamfer distance in mm
   * @param params.edge_selection - "all" | "top" | "bottom" | "vertical" | number[]
   */
  async chamfer(params: {
    distance_mm: number;
    edge_selection?: string | number[];
    body_index?: number;
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
