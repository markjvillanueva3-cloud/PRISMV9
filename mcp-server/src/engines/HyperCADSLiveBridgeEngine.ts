/**
 * HyperCADSLiveBridgeEngine — CAD-DRAW-MAX-MS0/P0-U01
 *
 * Per-operation live-mutate facade over the hyperCAD-S AC Python bridge.
 * Mirrors `fusion360_live_*` (16 actions) so the autonomous CAD pipeline
 * can iteratively try → observe → adjust on a real hyperCAD-S seat the
 * same way it does on Fusion 360 today.
 *
 * **Design.** Each live op is one CADOperation that the existing
 * {@link HyperCADSCodeGeneratorEngine} renders into AC Python, then
 * `executeScript()` ships through the AC Python bridge (or the mock
 * layer in CI). The bridge keeps a per-session op log so `undo()` can
 * roll back the last op without re-running the entire script.
 *
 * **Session state.** Each `newDoc()` creates a session entry keyed by
 * project name. All subsequent ops append to that session's `opLog`
 * until a new doc is opened or `clearSession()` is called.
 *
 * **Why a facade.** The codegen + executor already exist (E1160 + E1164
 * mock + E1162 stock). The Fusion bridge proved the per-op surface is
 * the right abstraction: it lets the LP04 backprop loop attribute
 * outcomes (timing, regen success, collision) to *individual ops* —
 * not entire scripts — which is what a real learning loop needs.
 *
 * **No silent failure (R12).** Every method awaits `executeScript()`
 * and surfaces `ok=false` with `error` on any AC Python failure. The
 * caller (LP01 outcome publisher) must observe failure or success.
 *
 * Refs: Fusion360LiveBridgeEngine (E-FUS-LIVE pattern, U-CADC13);
 * HyperCADSAutomationEngine (E1160); HyperCADSCodeGeneratorEngine (E*).
 */

import {
  hyperCADSCodeGeneratorEngine,
  type HyperCADSCodeGeneratorEngine,
} from "./HyperCADSCodeGeneratorEngine.js";
import type {
  CADOperation,
  CADOperationKind,
} from "../interfaces/ICADCodeGenerator.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LiveBridgeContext {
  projectName?: string;
  units?: "mm" | "in";
  targetVersion?: string;
  outputDir?: string;
}

export interface LiveOpResult {
  ok: boolean;
  opId: string;
  scriptText: string;
  durationMs: number;
  outputFiles?: ReadonlyArray<string>;
  warnings: ReadonlyArray<string>;
  error?: string;
  sessionOpCount: number;
}

export interface LiveSession {
  projectName: string;
  units: "mm" | "in";
  targetVersion: string;
  outputDir?: string;
  opLog: CADOperation[];
  createdAt: number;
  lastOpAt: number;
}

export interface SessionListing {
  projectName: string;
  opCount: number;
  createdAt: number;
  lastOpAt: number;
}

export interface LiveBridgeStats {
  sessionCount: number;
  totalOps: number;
  totalExecutions: number;
  totalFailures: number;
  totalUndos: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT = "PRISMLive";
const DEFAULT_UNITS: "mm" | "in" = "mm";
const DEFAULT_VERSION = "2024";

function nextOpId(session: LiveSession): string {
  return `${session.projectName}::op-${session.opLog.length + 1}`;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class HyperCADSLiveBridgeEngine {
  /** Per-project session state (project name → session). */
  private sessions: Map<string, LiveSession> = new Map();
  /** Most recently touched project (used when methods omit projectName). */
  private activeProject: string | null = null;

  private totalExecutions = 0;
  private totalFailures = 0;
  private totalUndos = 0;

  constructor(private codegen: HyperCADSCodeGeneratorEngine = hyperCADSCodeGeneratorEngine) {}

  // ── Session lifecycle ─────────────────────────────────────────────────────

  /** Open a new hyperCAD-S session. Mirrors `f360_live_new_doc`. */
  newDoc(ctx: LiveBridgeContext = {}): { projectName: string; ok: true } {
    const projectName = ctx.projectName ?? DEFAULT_PROJECT;
    const session: LiveSession = {
      projectName,
      units: ctx.units ?? DEFAULT_UNITS,
      targetVersion: ctx.targetVersion ?? DEFAULT_VERSION,
      outputDir: ctx.outputDir,
      opLog: [],
      createdAt: Date.now(),
      lastOpAt: Date.now(),
    };
    this.sessions.set(projectName, session);
    this.activeProject = projectName;
    return { projectName, ok: true };
  }

  /** Resolve the session for a request. Creates one if none active. */
  private session(projectName?: string): LiveSession {
    const name = projectName ?? this.activeProject ?? DEFAULT_PROJECT;
    let s = this.sessions.get(name);
    if (!s) {
      this.newDoc({ projectName: name });
      s = this.sessions.get(name)!;
    }
    this.activeProject = name;
    return s;
  }

  /** List open sessions. */
  listSessions(): SessionListing[] {
    return [...this.sessions.values()].map(s => ({
      projectName: s.projectName,
      opCount: s.opLog.length,
      createdAt: s.createdAt,
      lastOpAt: s.lastOpAt,
    }));
  }

  /** Clear a session's op log (or all sessions if omitted). */
  clearSession(projectName?: string): { cleared: number } {
    if (projectName === undefined) {
      const n = this.sessions.size;
      this.sessions.clear();
      this.activeProject = null;
      return { cleared: n };
    }
    const had = this.sessions.delete(projectName);
    if (this.activeProject === projectName) this.activeProject = null;
    return { cleared: had ? 1 : 0 };
  }

  // ── Core executor — used by every live op ─────────────────────────────────

  private async runOp(op: CADOperation, ctx?: LiveBridgeContext): Promise<LiveOpResult> {
    const s = this.session(ctx?.projectName);
    const opId = nextOpId(s);
    const opWithId: CADOperation = { ...op, operationId: op.operationId ?? opId };
    const script = this.codegen.buildScript([opWithId], {
      projectName: s.projectName,
      units: ctx?.units ?? s.units,
      targetVersion: ctx?.targetVersion ?? s.targetVersion,
      outputDir: ctx?.outputDir ?? s.outputDir,
    });
    this.totalExecutions++;
    const exec = await this.codegen.executeScript(script);
    if (exec.ok) {
      s.opLog.push(opWithId);
      s.lastOpAt = Date.now();
    } else {
      this.totalFailures++;
    }
    return {
      ok: exec.ok,
      opId,
      scriptText: script.body,
      durationMs: exec.durationMs,
      outputFiles: exec.outputFiles,
      warnings: script.warnings,
      error: exec.error,
      sessionOpCount: s.opLog.length,
    };
  }

  // ── 14 per-op live methods ────────────────────────────────────────────────

  /** Create a sketch on a plane. Mirrors `f360_live_sketch`. */
  async createSketch(params: { plane?: string; shapes?: ReadonlyArray<unknown>; ctx?: LiveBridgeContext } = {}): Promise<LiveOpResult> {
    return this.runOp({ kind: "sketch_create", args: { plane: params.plane ?? "XY", shapes: (params.shapes as never) ?? [] } }, params.ctx);
  }

  /** Extrude a sketch. Mirrors `f360_live_extrude`. */
  async extrude(params: { profileId?: string; distance: number; operation?: "new_body" | "join" | "cut" | "intersect"; ctx?: LiveBridgeContext }): Promise<LiveOpResult> {
    return this.runOp({ kind: "feature_extrude", args: { profileId: params.profileId, distance: params.distance, operation: params.operation ?? "new_body" } }, params.ctx);
  }

  /** Fillet an edge. Mirrors `f360_live_fillet`. */
  async fillet(params: { edgeIds?: ReadonlyArray<string>; radius: number; ctx?: LiveBridgeContext }): Promise<LiveOpResult> {
    return this.runOp({ kind: "feature_fillet", args: { edgeIds: params.edgeIds ?? [], radius: params.radius } }, params.ctx);
  }

  /** Chamfer an edge. Mirrors `f360_live_chamfer`. */
  async chamfer(params: { edgeIds?: ReadonlyArray<string>; distance: number; ctx?: LiveBridgeContext }): Promise<LiveOpResult> {
    return this.runOp({ kind: "feature_chamfer", args: { edgeIds: params.edgeIds ?? [], distance: params.distance } }, params.ctx);
  }

  /** Revolve a profile. Mirrors `f360_live_revolve`. */
  async revolve(params: { profileId?: string; axisId?: string; angle: number; ctx?: LiveBridgeContext }): Promise<LiveOpResult> {
    return this.runOp({ kind: "feature_revolve", args: { profileId: params.profileId, axisId: params.axisId, angle: params.angle } }, params.ctx);
  }

  /** Place a hole. Mirrors `f360_live_hole`. */
  async hole(params: { x: number; y: number; diameter: number; depth: number; ctx?: LiveBridgeContext }): Promise<LiveOpResult> {
    return this.runOp({ kind: "feature_hole", args: { x: params.x, y: params.y, diameter: params.diameter, depth: params.depth } }, params.ctx);
  }

  /** Pattern a feature. Mirrors `f360_live_pattern`. */
  async pattern(params: { featureIds?: ReadonlyArray<string>; type: "linear" | "circular"; count: number; spacing?: number; ctx?: LiveBridgeContext }): Promise<LiveOpResult> {
    const kind: CADOperationKind = params.type === "circular" ? "feature_pattern_circular" : "feature_pattern_linear";
    return this.runOp({ kind, args: { featureIds: params.featureIds ?? [], count: params.count, spacing: params.spacing } }, params.ctx);
  }

  /** Boolean combine. Mirrors `f360_live_combine`. */
  async combine(params: { op: "union" | "subtract" | "intersect"; bodyIds?: ReadonlyArray<string>; ctx?: LiveBridgeContext }): Promise<LiveOpResult> {
    const kind: CADOperationKind = params.op === "union" ? "boolean_union" : params.op === "subtract" ? "boolean_subtract" : "boolean_intersect";
    return this.runOp({ kind, args: { bodyIds: params.bodyIds ?? [] } }, params.ctx);
  }

  /** Shell a body. Mirrors `f360_live_shell`. */
  async shell(params: { bodyId?: string; thickness: number; ctx?: LiveBridgeContext }): Promise<LiveOpResult> {
    return this.runOp({ kind: "feature_shell", args: { bodyId: params.bodyId, thickness: params.thickness } }, params.ctx);
  }

  /** Export the current model. Mirrors `f360_live_export`. */
  async exportFile(params: { format: "step" | "iges" | "stl" | "dxf" | "pdf"; path?: string; ctx?: LiveBridgeContext }): Promise<LiveOpResult> {
    const kind: CADOperationKind = params.format === "step" ? "export_step" : params.format === "iges" ? "export_iges" : params.format === "stl" ? "export_stl" : params.format === "dxf" ? "export_dxf" : "export_pdf";
    return this.runOp({ kind, args: { path: params.path } }, params.ctx);
  }

  /** Read geometry summary from session op log. Mirrors `f360_live_geometry`. */
  getGeometry(params: { projectName?: string } = {}): { ok: true; projectName: string; opCount: number; opLog: ReadonlyArray<CADOperation> } {
    const s = this.session(params.projectName);
    return { ok: true, projectName: s.projectName, opCount: s.opLog.length, opLog: [...s.opLog] };
  }

  /**
   * Undo the last op in the active session. Mirrors `f360_live_undo`.
   * Local-only — pops the op log so a subsequent `regenerate()` (or any
   * new op) ships an AC Python script without the popped op. The AC
   * Python session does NOT roll back automatically; callers that need
   * a true regen should call `regenerate()` after `undo()`.
   */
  undo(params: { projectName?: string } = {}): { ok: boolean; popped?: CADOperation; remaining: number } {
    const s = this.session(params.projectName);
    if (s.opLog.length === 0) return { ok: false, remaining: 0 };
    const popped = s.opLog.pop();
    s.lastOpAt = Date.now();
    this.totalUndos++;
    return { ok: true, popped, remaining: s.opLog.length };
  }

  /** Regenerate the active session from its current op log. */
  async regenerate(params: { projectName?: string; ctx?: LiveBridgeContext } = {}): Promise<LiveOpResult> {
    const s = this.session(params.projectName);
    const script = this.codegen.buildScript([...s.opLog], {
      projectName: s.projectName,
      units: params.ctx?.units ?? s.units,
      targetVersion: params.ctx?.targetVersion ?? s.targetVersion,
      outputDir: params.ctx?.outputDir ?? s.outputDir,
    });
    this.totalExecutions++;
    const exec = await this.codegen.executeScript(script);
    if (!exec.ok) this.totalFailures++;
    s.lastOpAt = Date.now();
    return {
      ok: exec.ok,
      opId: `${s.projectName}::regen-${Date.now()}`,
      scriptText: script.body,
      durationMs: exec.durationMs,
      outputFiles: exec.outputFiles,
      warnings: script.warnings,
      error: exec.error,
      sessionOpCount: s.opLog.length,
    };
  }

  /**
   * Execute a raw AC Python snippet. Mirrors `f360_live_execute_raw`.
   * Bypasses the op log — caller takes responsibility for whatever the
   * snippet does to the active hyperCAD-S session.
   */
  async executeRaw(code: string, params: { projectName?: string; filename?: string } = {}): Promise<LiveOpResult> {
    if (typeof code !== "string" || code.length === 0) {
      throw new TypeError("executeRaw: code must be a non-empty string");
    }
    const s = this.session(params.projectName);
    const script = {
      body: code,
      cadSystem: "hypercads" as const,
      filename: params.filename ?? `${s.projectName}-raw.py`,
      parameters: new Map<string, unknown>(),
      lineage: [] as Array<{ opIndex: number; opId?: string; opKind: string; lineRange: [number, number] }>,
      warnings: [] as string[],
      imports: [] as string[],
    };
    this.totalExecutions++;
    const exec = await this.codegen.executeScript(script);
    if (!exec.ok) this.totalFailures++;
    s.lastOpAt = Date.now();
    return {
      ok: exec.ok,
      opId: `${s.projectName}::raw-${Date.now()}`,
      scriptText: code,
      durationMs: exec.durationMs,
      outputFiles: exec.outputFiles,
      warnings: [],
      error: exec.error,
      sessionOpCount: s.opLog.length,
    };
  }

  // ── Telemetry ─────────────────────────────────────────────────────────────

  getStats(): LiveBridgeStats {
    let totalOps = 0;
    for (const s of this.sessions.values()) totalOps += s.opLog.length;
    return {
      sessionCount: this.sessions.size,
      totalOps,
      totalExecutions: this.totalExecutions,
      totalFailures: this.totalFailures,
      totalUndos: this.totalUndos,
    };
  }

  _resetForTests(): void {
    this.sessions.clear();
    this.activeProject = null;
    this.totalExecutions = 0;
    this.totalFailures = 0;
    this.totalUndos = 0;
  }
}

export const hyperCADSLiveBridgeEngine = new HyperCADSLiveBridgeEngine();
