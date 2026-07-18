// WIRE-EXEMPT: U-CAD-APP add-in bridge -- injected RhinoTransport, no singleton; awaits its Rhino/Grasshopper add-in host (delta/CAD), not a standalone prism_* dispatcher action.
/**
 * RhinoCommonBridgeEngine — U-CAD-APP-07 (PHASE-48)
 *
 * Live bridge between PRISM and McNeel Rhino via the RhinoCommon .NET SDK.
 * Supports both Rhino document operations and Grasshopper visual programming.
 *
 * All transport is injected — `RhinoTransport` is typically backed by a
 * Rhino.Compute HTTP endpoint in production or an in-memory stub for tests.
 *
 * Capabilities:
 *   - Open / save / create Rhino 3DM documents
 *   - List / get / create / delete / transform geometry objects
 *   - Layer management
 *   - Boolean operations (union, difference, intersection)
 *   - Surface operations (loft, sweep, revolve, pipe)
 *   - Edge operations (fillet, chamfer)
 *   - Grasshopper definition execution + slider control + geometry baking
 *   - Export to STEP / IGES / STL
 *
 * @module engines/RhinoCommonBridgeEngine
 */

import {
  RhinoDocumentSchema,
  RhinoObjectSchema,
  RhinoLayerSchema,
  RhinoBrepSchema,
  RhinoMeshSchema,
  RhinoCurveSchema,
  RhinoResponseSchema,
  GHDefinitionSchema,
  GHSliderSchema,
  RHINO_COMMANDS,
  type RhinoDocument,
  type RhinoObject,
  type RhinoLayer,
  type RhinoBrep,
  type RhinoMesh,
  type RhinoCurve,
  type RhinoCommand,
  type RhinoResponse,
  type RhinoExportOptions,
  type GHDefinition,
  type GHSlider,
  type Point3d,
  type Transform,
  type BoundingBox,
  type RhinoCallLogEntry,
} from "../schemas/cadRhinoSchema.js";

export interface RhinoClock {
  now(): string;
  monotonicMs(): number;
}

export interface RhinoTransport {
  /**
   * Send a command to the Rhino/Rhino.Compute backend and return its reply.
   */
  send(cmd: RhinoCommand, args: Record<string, unknown>): RhinoResponse;
}

function defaultClock(): RhinoClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

export class RhinoCommonBridgeEngine {
  private transport: RhinoTransport;
  private clock: RhinoClock;
  private log: RhinoCallLogEntry[] = [];
  private activeDocument: RhinoDocument | null = null;

  constructor(opts: { transport: RhinoTransport; clock?: RhinoClock }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
  }

  // ── Document operations ───────────────────────────────────────────────────

  openDocument(path: string): RhinoDocument {
    const res = this.run("open_document", { path });
    this.throwIfFailed(res);
    const doc = RhinoDocumentSchema.parse(res.result);
    this.activeDocument = doc;
    return doc;
  }

  saveDocument(path?: string): RhinoDocument {
    const res = this.run("save_document", { path });
    this.throwIfFailed(res);
    const doc = RhinoDocumentSchema.parse(res.result);
    this.activeDocument = doc;
    return doc;
  }

  newDocument(opts: { units?: RhinoDocument["units"]; template?: string } = {}): RhinoDocument {
    const res = this.run("new_document", opts);
    this.throwIfFailed(res);
    const doc = RhinoDocumentSchema.parse(res.result);
    this.activeDocument = doc;
    return doc;
  }

  getActiveDocument(): RhinoDocument | null {
    return this.activeDocument;
  }

  // ── Object operations ─────────────────────────────────────────────────────

  listObjects(opts: { layerIndex?: number; kinds?: string[] } = {}): RhinoObject[] {
    const res = this.run("list_objects", opts);
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((o) => RhinoObjectSchema.parse(o));
  }

  getObject(objectId: string, opts: { includeGeometry?: boolean } = {}): RhinoObject {
    const res = this.run("get_object", { objectId, ...opts });
    this.throwIfFailed(res);
    return RhinoObjectSchema.parse(res.result);
  }

  createObject(
    kind: RhinoObject["kind"],
    geometry: Record<string, unknown>,
    attributes?: Partial<RhinoObject["attributes"]>,
  ): RhinoObject {
    const res = this.run("create_object", { kind, geometry, attributes });
    this.throwIfFailed(res);
    return RhinoObjectSchema.parse(res.result);
  }

  deleteObject(objectId: string): boolean {
    const res = this.run("delete_object", { objectId });
    this.throwIfFailed(res);
    return true;
  }

  transformObject(objectId: string, transform: Transform): RhinoObject {
    const res = this.run("transform_object", { objectId, transform });
    this.throwIfFailed(res);
    return RhinoObjectSchema.parse(res.result);
  }

  duplicateObject(objectId: string): RhinoObject {
    const res = this.run("duplicate_object", { objectId });
    this.throwIfFailed(res);
    return RhinoObjectSchema.parse(res.result);
  }

  getBoundingBox(objectIds: string[]): BoundingBox {
    const res = this.run("get_bounding_box", { objectIds });
    this.throwIfFailed(res);
    return res.result as BoundingBox;
  }

  // ── Layer operations ──────────────────────────────────────────────────────

  listLayers(): RhinoLayer[] {
    const res = this.run("list_layers", {});
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((l) => RhinoLayerSchema.parse(l));
  }

  createLayer(name: string, opts: { color?: string; parentIndex?: number } = {}): RhinoLayer {
    const res = this.run("create_layer", { name, ...opts });
    this.throwIfFailed(res);
    return RhinoLayerSchema.parse(res.result);
  }

  setLayer(objectId: string, layerIndex: number): RhinoObject {
    const res = this.run("set_layer", { objectId, layerIndex });
    this.throwIfFailed(res);
    return RhinoObjectSchema.parse(res.result);
  }

  // ── Boolean operations ────────────────────────────────────────────────────

  booleanUnion(objectIds: string[]): RhinoBrep {
    if (objectIds.length < 2) {
      throw new Error("Boolean union requires at least 2 objects");
    }
    const res = this.run("boolean_union", { objectIds });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  booleanDifference(objectIdA: string, objectIdB: string): RhinoBrep {
    const res = this.run("boolean_difference", { objectIdA, objectIdB });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  booleanIntersection(objectIdA: string, objectIdB: string): RhinoBrep {
    const res = this.run("boolean_intersection", { objectIdA, objectIdB });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  // ── Curve operations ──────────────────────────────────────────────────────

  offsetCurve(
    curveId: string,
    distance: number,
    direction: Point3d,
  ): RhinoCurve {
    const res = this.run("offset_curve", { curveId, distance, direction });
    this.throwIfFailed(res);
    return RhinoCurveSchema.parse(res.result);
  }

  // ── Surface operations ────────────────────────────────────────────────────

  offsetSurface(surfaceId: string, distance: number): RhinoBrep {
    const res = this.run("offset_surface", { surfaceId, distance });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  extrudeCurve(curveId: string, direction: Point3d, cap: boolean = true): RhinoBrep {
    const res = this.run("extrude_curve", { curveId, direction, cap });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  loftCurves(curveIds: string[], opts: { loftType?: "normal" | "loose" | "tight" | "straight" } = {}): RhinoBrep {
    if (curveIds.length < 2) {
      throw new Error("Loft requires at least 2 curves");
    }
    const res = this.run("loft_curves", { curveIds, ...opts });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  sweepOneRail(railId: string, shapeIds: string[]): RhinoBrep {
    const res = this.run("sweep_one_rail", { railId, shapeIds });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  sweepTwoRail(railId1: string, railId2: string, shapeIds: string[]): RhinoBrep {
    const res = this.run("sweep_two_rail", { railId1, railId2, shapeIds });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  revolve(curveId: string, axis: { start: Point3d; end: Point3d }, angle: number): RhinoBrep {
    const res = this.run("revolve", { curveId, axis, angle });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  pipe(curveId: string, radii: number[], caps: boolean = true): RhinoBrep {
    const res = this.run("pipe", { curveId, radii, caps });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  // ── Edge operations ───────────────────────────────────────────────────────

  filletEdges(brepId: string, edgeIndices: number[], radius: number): RhinoBrep {
    const res = this.run("fillet_edges", { brepId, edgeIndices, radius });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  chamferEdges(brepId: string, edgeIndices: number[], distance: number): RhinoBrep {
    const res = this.run("chamfer_edges", { brepId, edgeIndices, distance });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  // ── Brep operations ───────────────────────────────────────────────────────

  meshBrep(brepId: string, opts: { minEdgeLength?: number; maxEdgeLength?: number; maxAngle?: number } = {}): RhinoMesh {
    const res = this.run("mesh_brep", { brepId, ...opts });
    this.throwIfFailed(res);
    return RhinoMeshSchema.parse(res.result);
  }

  joinBreps(brepIds: string[], tolerance?: number): RhinoBrep {
    if (brepIds.length < 2) {
      throw new Error("Join requires at least 2 breps");
    }
    const res = this.run("join_breps", { brepIds, tolerance });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  splitBrep(brepId: string, cutterIds: string[]): RhinoBrep[] {
    const res = this.run("split_brep", { brepId, cutterIds });
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((b) => RhinoBrepSchema.parse(b));
  }

  capPlanarHoles(brepId: string): RhinoBrep {
    const res = this.run("cap_planar_holes", { brepId });
    this.throwIfFailed(res);
    return RhinoBrepSchema.parse(res.result);
  }

  // ── Grasshopper operations ────────────────────────────────────────────────

  runGrasshopper(definitionPath: string): GHDefinition {
    const res = this.run("run_grasshopper", { definitionPath });
    this.throwIfFailed(res);
    return GHDefinitionSchema.parse(res.result);
  }

  ghGetDefinition(definitionId: string): GHDefinition {
    const res = this.run("gh_get_definition", { definitionId });
    this.throwIfFailed(res);
    return GHDefinitionSchema.parse(res.result);
  }

  ghSetSlider(instanceGuid: string, value: number): GHSlider {
    const res = this.run("gh_set_slider", { instanceGuid, value });
    this.throwIfFailed(res);
    return GHSliderSchema.parse(res.result);
  }

  ghBakeGeometry(componentGuid: string, layerIndex?: number): RhinoObject[] {
    const res = this.run("gh_bake_geometry", { componentGuid, layerIndex });
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((o) => RhinoObjectSchema.parse(o));
  }

  // ── Export / Import ───────────────────────────────────────────────────────

  exportStep(outputPath: string, opts: Partial<RhinoExportOptions> = {}): string {
    const res = this.run("export_step", { outputPath, ...opts });
    this.throwIfFailed(res);
    return String(res.result);
  }

  exportIges(outputPath: string): string {
    const res = this.run("export_iges", { outputPath });
    this.throwIfFailed(res);
    return String(res.result);
  }

  exportStl(outputPath: string, opts: { binary?: boolean; tolerance?: number } = {}): string {
    const res = this.run("export_stl", { outputPath, ...opts });
    this.throwIfFailed(res);
    return String(res.result);
  }

  importGeometry(inputPath: string): RhinoObject[] {
    const res = this.run("import_geometry", { inputPath });
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((o) => RhinoObjectSchema.parse(o));
  }

  // ── Logging ───────────────────────────────────────────────────────────────

  getCallLog(): RhinoCallLogEntry[] {
    return [...this.log];
  }

  clearCallLog(): void {
    this.log = [];
  }

  p50LatencyMs(): number | undefined {
    if (this.log.length === 0) return undefined;
    const sorted = [...this.log].map((e) => e.durationMs).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.5)];
  }

  p95LatencyMs(): number | undefined {
    if (this.log.length === 0) return undefined;
    const sorted = [...this.log].map((e) => e.durationMs).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private run(command: RhinoCommand, args: Record<string, unknown>): RhinoResponse {
    const t0 = this.clock.monotonicMs();
    let res: RhinoResponse;
    try {
      res = this.transport.send(command, args);
    } catch (err) {
      res = RhinoResponseSchema.parse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    const durationMs = this.clock.monotonicMs() - t0;
    this.log.push({
      command,
      args,
      ok: res.ok,
      error: res.error,
      durationMs,
      at: this.clock.now(),
    });
    return res;
  }

  private throwIfFailed(res: RhinoResponse): void {
    if (!res.ok) {
      throw new Error(res.error ?? "Rhino command failed");
    }
  }
}
