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

// ── Engine ──────────────────────────────────────────────────────────

export class Fusion360LiveBridgeEngine {
  private baseUrl: string;

  constructor(baseUrl: string = F360_URL) {
    this.baseUrl = baseUrl;
  }

  // ── Connection ──────────────────────────────────────────────────

  /**
   * Check if the Fusion 360 API server is reachable.
   */
  async isConnected(): Promise<boolean> {
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
   */
  async executeRaw(code: string): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }> {
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
      return this.executeRaw(`
app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
mirrors = root.features.mirrorFeatures
entities = adsk.core.ObjectCollection.create()
entities.add(root.bRepBodies.item(0))
plane = root.${((p.plane as string) ?? "XY").toLowerCase().replace("xy", "xYConstructionPlane").replace("xz", "xZConstructionPlane").replace("yz", "yZConstructionPlane")}
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

  // ── Private: HTTP helpers ─────────────────────────────────────

  private async _get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Request to ${path} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw err;
    }
  }

  private async _post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Request to ${path} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw err;
    }
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}/tool-library/${encodeURIComponent(name)}`, {
        method: "DELETE",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return (await res.json()) as { success: boolean };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
}

// ── Singleton Export ────────────────────────────────────────────────

export const fusion360LiveBridgeEngine = new Fusion360LiveBridgeEngine();
