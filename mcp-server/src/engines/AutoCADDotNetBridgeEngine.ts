/**
 * AutoCADDotNetBridgeEngine — U-CAD-APP-11 (PHASE-48)
 *
 * Bridge for AutoCAD via .NET API (AcMgd/AcDbMgd) and AutoLISP.
 * Provides:
 *
 *   - Document/drawing management (DWG open, save, close)
 *   - Entity CRUD (lines, arcs, circles, polylines, text, dimensions)
 *   - Layer management (create, modify, visibility)
 *   - Block definitions and insertions
 *   - Dimension and annotation operations
 *   - Selection sets with filtering
 *   - AutoLISP expression evaluation
 *   - Plot/print and PDF export
 *   - External reference (xref) management
 *   - System variable access
 *
 * Transport is injected — typically backed by a .NET host process
 * communicating via COM/pipes in production, or an in-memory stub for tests.
 *
 * @module engines/AutoCADDotNetBridgeEngine
 */

import {
  AcadDrawingSchema,
  AcadLayerSchema,
  AcadEntitySchema,
  AcadBlockDefSchema,
  AcadLispResultSchema,
  AcadResponseSchema,
  ACAD_COMMANDS,
  type AcadDrawing,
  type AcadLayer,
  type AcadEntity,
  type AcadBlockDef,
  type AcadBlockRef,
  type AcadLispResult,
  type AcadCommand,
  type AcadResponse,
  type AcadCallLogEntry,
  type AcadSelectionFilter,
  type AcadPlotConfig,
  type AcadExportOptions,
  type AcadPoint3d,
  type AcadEntityType,
  type AcadDimensionType,
} from "../schemas/cadAutoCADSchema.js";

export interface AcadClock {
  now(): string;
  monotonicMs(): number;
}

export interface AcadTransport {
  send(cmd: AcadCommand, args: Record<string, unknown>): AcadResponse;
}

function defaultClock(): AcadClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

export class AutoCADDotNetBridgeEngine {
  private transport: AcadTransport;
  private clock: AcadClock;
  private log: AcadCallLogEntry[] = [];

  constructor(opts: { transport: AcadTransport; clock?: AcadClock }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
  }

  // ── Document Operations ───────────────────────────────────────────────────

  openDrawing(path: string, opts: { readOnly?: boolean } = {}): AcadDrawing {
    const res = this.run("open_drawing", { path, ...opts });
    this.throwIfFailed(res);
    return AcadDrawingSchema.parse(res.result);
  }

  saveDrawing(path?: string): boolean {
    const res = this.run("save_drawing", { path });
    this.throwIfFailed(res);
    return true;
  }

  closeDrawing(opts: { save?: boolean } = {}): boolean {
    const res = this.run("close_drawing", opts);
    this.throwIfFailed(res);
    return true;
  }

  newDrawing(opts: { template?: string } = {}): AcadDrawing {
    const res = this.run("new_drawing", opts);
    this.throwIfFailed(res);
    return AcadDrawingSchema.parse(res.result);
  }

  getDrawingInfo(): AcadDrawing {
    const res = this.run("get_drawing_info", {});
    this.throwIfFailed(res);
    return AcadDrawingSchema.parse(res.result);
  }

  // ── Entity Operations ─────────────────────────────────────────────────────

  createEntity(
    entityType: AcadEntityType,
    properties: Record<string, unknown>,
    opts: { layer?: string } = {},
  ): AcadEntity {
    const res = this.run("create_entity", { entityType, properties, ...opts });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result);
  }

  getEntity(handle: string): AcadEntity {
    const res = this.run("get_entity", { handle });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result);
  }

  updateEntity(handle: string, properties: Record<string, unknown>): AcadEntity {
    const res = this.run("update_entity", { handle, properties });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result);
  }

  deleteEntity(handle: string): boolean {
    const res = this.run("delete_entity", { handle });
    this.throwIfFailed(res);
    return true;
  }

  listEntities(filter?: AcadSelectionFilter): AcadEntity[] {
    const res = this.run("list_entities", { filter });
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((e) => AcadEntitySchema.parse(e));
  }

  selectEntities(filter: AcadSelectionFilter): string[] {
    const res = this.run("select_entities", { filter });
    this.throwIfFailed(res);
    return res.result as string[];
  }

  // ── Layer Operations ──────────────────────────────────────────────────────

  createLayer(name: string, opts: Partial<Omit<AcadLayer, "name">> = {}): AcadLayer {
    const res = this.run("create_layer", { name, ...opts });
    this.throwIfFailed(res);
    return AcadLayerSchema.parse(res.result);
  }

  getLayer(name: string): AcadLayer {
    const res = this.run("get_layer", { name });
    this.throwIfFailed(res);
    return AcadLayerSchema.parse(res.result);
  }

  updateLayer(name: string, properties: Partial<Omit<AcadLayer, "name">>): AcadLayer {
    const res = this.run("update_layer", { name, properties });
    this.throwIfFailed(res);
    return AcadLayerSchema.parse(res.result);
  }

  deleteLayer(name: string): boolean {
    const res = this.run("delete_layer", { name });
    this.throwIfFailed(res);
    return true;
  }

  listLayers(): AcadLayer[] {
    const res = this.run("list_layers", {});
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((l) => AcadLayerSchema.parse(l));
  }

  // ── Block Operations ──────────────────────────────────────────────────────

  createBlock(
    name: string,
    entityHandles: string[],
    opts: { basePoint?: AcadPoint3d; description?: string } = {},
  ): AcadBlockDef {
    const res = this.run("create_block", { name, entityHandles, ...opts });
    this.throwIfFailed(res);
    return AcadBlockDefSchema.parse(res.result);
  }

  insertBlock(
    blockName: string,
    insertionPoint: AcadPoint3d,
    opts: { scale?: AcadPoint3d; rotation?: number; attributes?: Record<string, string>; layer?: string } = {},
  ): AcadBlockRef {
    const res = this.run("insert_block", { blockName, insertionPoint, ...opts });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result) as AcadBlockRef;
  }

  explodeBlock(handle: string): string[] {
    const res = this.run("explode_block", { handle });
    this.throwIfFailed(res);
    return res.result as string[];
  }

  getBlock(name: string): AcadBlockDef {
    const res = this.run("get_block", { name });
    this.throwIfFailed(res);
    return AcadBlockDefSchema.parse(res.result);
  }

  listBlocks(): AcadBlockDef[] {
    const res = this.run("list_blocks", {});
    this.throwIfFailed(res);
    const arr = res.result as unknown[];
    return arr.map((b) => AcadBlockDefSchema.parse(b));
  }

  // ── Dimension Operations ──────────────────────────────────────────────────

  createDimension(
    dimensionType: AcadDimensionType,
    defPoint1: AcadPoint3d,
    defPoint2: AcadPoint3d,
    dimLinePoint: AcadPoint3d,
    opts: { textOverride?: string; styleName?: string; layer?: string } = {},
  ): AcadEntity {
    const res = this.run("create_dimension", {
      dimensionType,
      defPoint1,
      defPoint2,
      dimLinePoint,
      ...opts,
    });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result);
  }

  getDimension(handle: string): AcadEntity {
    const res = this.run("get_dimension", { handle });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result);
  }

  updateDimension(handle: string, properties: Record<string, unknown>): AcadEntity {
    const res = this.run("update_dimension", { handle, properties });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result);
  }

  // ── Text Operations ───────────────────────────────────────────────────────

  createText(
    textString: string,
    insertionPoint: AcadPoint3d,
    height: number,
    opts: { rotation?: number; styleName?: string; layer?: string; isMText?: boolean; width?: number } = {},
  ): AcadEntity {
    const res = this.run("create_text", { textString, insertionPoint, height, ...opts });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result);
  }

  // ── Hatch Operations ──────────────────────────────────────────────────────

  createHatch(
    patternName: string,
    boundaryHandles: string[],
    opts: { patternScale?: number; patternAngle?: number; isSolid?: boolean; layer?: string } = {},
  ): AcadEntity {
    const res = this.run("create_hatch", { patternName, boundaryHandles, ...opts });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result);
  }

  // ── Xref Operations ───────────────────────────────────────────────────────

  createXref(path: string, insertionPoint: AcadPoint3d, opts: { blockName?: string; overlay?: boolean } = {}): AcadBlockRef {
    const res = this.run("create_xref", { path, insertionPoint, ...opts });
    this.throwIfFailed(res);
    return AcadEntitySchema.parse(res.result) as AcadBlockRef;
  }

  reloadXref(blockName: string): boolean {
    const res = this.run("reload_xref", { blockName });
    this.throwIfFailed(res);
    return true;
  }

  detachXref(blockName: string): boolean {
    const res = this.run("detach_xref", { blockName });
    this.throwIfFailed(res);
    return true;
  }

  // ── AutoLISP Operations ───────────────────────────────────────────────────

  evalLisp(expression: string): AcadLispResult {
    const res = this.run("eval_lisp", { expression });
    this.throwIfFailed(res);
    return AcadLispResultSchema.parse(res.result);
  }

  runCommand(command: string): boolean {
    const res = this.run("run_command", { command });
    this.throwIfFailed(res);
    return true;
  }

  // ── Plot / Export Operations ──────────────────────────────────────────────

  plotDrawing(config: AcadPlotConfig): boolean {
    const res = this.run("plot_drawing", { config });
    this.throwIfFailed(res);
    return true;
  }

  exportPdf(outputPath: string, opts: Partial<AcadExportOptions> = {}): boolean {
    const res = this.run("export_pdf", { outputPath, ...opts });
    this.throwIfFailed(res);
    return true;
  }

  exportDwf(outputPath: string, opts: Partial<AcadExportOptions> = {}): boolean {
    const res = this.run("export_dwf", { outputPath, ...opts });
    this.throwIfFailed(res);
    return true;
  }

  // ── Utility Operations ────────────────────────────────────────────────────

  purge(): { purgedCount: number; types: string[] } {
    const res = this.run("purge", {});
    this.throwIfFailed(res);
    return res.result as { purgedCount: number; types: string[] };
  }

  audit(opts: { fixErrors?: boolean } = {}): { errorCount: number; fixedCount: number } {
    const res = this.run("audit", opts);
    this.throwIfFailed(res);
    return res.result as { errorCount: number; fixedCount: number };
  }

  zoomExtents(): boolean {
    const res = this.run("zoom_extents", {});
    this.throwIfFailed(res);
    return true;
  }

  setUcs(origin: AcadPoint3d, xAxis: AcadPoint3d, yAxis: AcadPoint3d): boolean {
    const res = this.run("set_ucs", { origin, xAxis, yAxis });
    this.throwIfFailed(res);
    return true;
  }

  getSystemVariable(name: string): unknown {
    const res = this.run("get_system_variable", { name });
    this.throwIfFailed(res);
    return res.result;
  }

  setSystemVariable(name: string, value: unknown): boolean {
    const res = this.run("set_system_variable", { name, value });
    this.throwIfFailed(res);
    return true;
  }

  // ── Logging ───────────────────────────────────────────────────────────────

  getCallLog(): AcadCallLogEntry[] {
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

  private run(command: AcadCommand, args: Record<string, unknown>): AcadResponse {
    const t0 = this.clock.monotonicMs();
    let res: AcadResponse;
    try {
      res = this.transport.send(command, args);
    } catch (err) {
      res = AcadResponseSchema.parse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        errorCode: -1,
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

  private throwIfFailed(res: AcadResponse): void {
    if (!res.ok) {
      const code = res.errorCode ? ` (code ${res.errorCode})` : "";
      throw new Error((res.error ?? "AutoCAD API call failed") + code);
    }
  }
}
