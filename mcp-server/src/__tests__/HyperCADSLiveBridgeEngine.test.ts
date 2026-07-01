/**
 * HyperCADSLiveBridgeEngine — vitest suite (CAD-DRAW-MAX-MS0/P0-U01).
 *
 * Closed-form assertions on session lifecycle, per-op live execution,
 * op-log accumulation, undo semantics, regen, raw exec, fail-loud, and
 * stats. Uses a stub HyperCADSCodeGenerator that records build+exec
 * calls so we can verify the bridge invokes the codegen with the
 * correct CADOperation kinds, args, and context (no real AC Python).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HyperCADSLiveBridgeEngine } from "../engines/HyperCADSLiveBridgeEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

type ExecResult = { ok: boolean; outputFiles?: string[]; durationMs: number; metrics?: Record<string, number>; error?: string };
type Script = { body: string; cadSystem: "hypercads"; filename: string; parameters: Map<string, unknown>; lineage: unknown[]; warnings: string[]; imports: string[] };

function stubCodegen(opts: { failExec?: boolean; warnings?: string[] } = {}) {
  const callLog: Array<{ kind: "build" | "exec"; ops?: CADOperation[]; ctx?: unknown; script?: Script }> = [];
  return {
    callLog,
    cadSystem: "hypercads" as const,
    buildScript(ops: CADOperation[], ctx: unknown): Script {
      callLog.push({ kind: "build", ops: [...ops], ctx });
      return {
        body: `# hypercads stub script with ${ops.length} op(s)\n`,
        cadSystem: "hypercads",
        filename: "stub.py",
        parameters: new Map(),
        lineage: [],
        warnings: opts.warnings ?? [],
        imports: [],
      };
    },
    async executeScript(script: Script): Promise<ExecResult> {
      callLog.push({ kind: "exec", script });
      if (opts.failExec) return { ok: false, durationMs: 1, error: "stub failure" };
      return { ok: true, outputFiles: ["stub.f3d"], durationMs: 1 };
    },
    getCapabilities() {
      return { supportedOps: new Set<string>() };
    },
  };
}

describe("HyperCADSLiveBridgeEngine — P0-U01", () => {
  let engine: HyperCADSLiveBridgeEngine;
  let codegen: ReturnType<typeof stubCodegen>;
  beforeEach(() => {
    codegen = stubCodegen();
    engine = new HyperCADSLiveBridgeEngine(codegen as never);
  });

  it("newDoc creates a session and marks it active", () => {
    const r = engine.newDoc({ projectName: "MyPart", units: "mm" });
    expect(r.ok).toBe(true);
    expect(r.projectName).toBe("MyPart");
    expect(engine.listSessions()).toHaveLength(1);
    expect(engine.listSessions()[0].projectName).toBe("MyPart");
  });

  it("listSessions starts empty and grows on newDoc", () => {
    expect(engine.listSessions()).toEqual([]);
    engine.newDoc({ projectName: "A" });
    engine.newDoc({ projectName: "B" });
    expect(engine.listSessions().map(s => s.projectName).sort()).toEqual(["A", "B"]);
  });

  it("createSketch dispatches a sketch_create CADOperation through codegen", async () => {
    const r = await engine.createSketch({ plane: "XY", shapes: [{ kind: "rect", w: 10, h: 5 }] });
    expect(r.ok).toBe(true);
    expect(r.sessionOpCount).toBe(1);
    const build = codegen.callLog.find(c => c.kind === "build")!;
    expect(build.ops![0].kind).toBe("sketch_create");
    expect(build.ops![0].args.plane).toBe("XY");
  });

  it("extrude dispatches feature_extrude with the operation arg", async () => {
    const r = await engine.extrude({ distance: 12, operation: "cut" });
    expect(r.ok).toBe(true);
    const build = codegen.callLog.find(c => c.kind === "build")!;
    expect(build.ops![0].kind).toBe("feature_extrude");
    expect(build.ops![0].args.distance).toBe(12);
    expect(build.ops![0].args.operation).toBe("cut");
  });

  it("fillet/chamfer/revolve/hole/shell each emit the correct kind", async () => {
    await engine.fillet({ edgeIds: ["e1"], radius: 1 });
    await engine.chamfer({ edgeIds: ["e2"], distance: 0.5 });
    await engine.revolve({ profileId: "p1", angle: 360 });
    await engine.hole({ x: 0, y: 0, diameter: 5, depth: 10 });
    await engine.shell({ thickness: 1.5 });
    const builds = codegen.callLog.filter(c => c.kind === "build");
    expect(builds.map(b => b.ops![0].kind)).toEqual([
      "feature_fillet", "feature_chamfer", "feature_revolve", "feature_hole", "feature_shell",
    ]);
  });

  it("pattern routes type=linear → feature_pattern_linear, type=circular → feature_pattern_circular", async () => {
    await engine.pattern({ type: "linear", count: 4, spacing: 10 });
    await engine.pattern({ type: "circular", count: 6 });
    const kinds = codegen.callLog.filter(c => c.kind === "build").map(b => b.ops![0].kind);
    expect(kinds).toEqual(["feature_pattern_linear", "feature_pattern_circular"]);
  });

  it("combine routes union/subtract/intersect to the correct boolean_* kind", async () => {
    await engine.combine({ op: "union" });
    await engine.combine({ op: "subtract" });
    await engine.combine({ op: "intersect" });
    const kinds = codegen.callLog.filter(c => c.kind === "build").map(b => b.ops![0].kind);
    expect(kinds).toEqual(["boolean_union", "boolean_subtract", "boolean_intersect"]);
  });

  it("exportFile routes the 5 supported formats to the correct export_* kind", async () => {
    for (const fmt of ["step", "iges", "stl", "dxf", "pdf"] as const) {
      await engine.exportFile({ format: fmt });
    }
    const kinds = codegen.callLog.filter(c => c.kind === "build").map(b => b.ops![0].kind);
    expect(kinds).toEqual(["export_step", "export_iges", "export_stl", "export_dxf", "export_pdf"]);
  });

  it("session op log accumulates across ops in order", async () => {
    await engine.createSketch({ plane: "XY" });
    await engine.extrude({ distance: 5 });
    await engine.fillet({ radius: 1 });
    const g = engine.getGeometry();
    expect(g.opCount).toBe(3);
    expect(g.opLog.map(o => o.kind)).toEqual(["sketch_create", "feature_extrude", "feature_fillet"]);
  });

  it("failed execScript does NOT append to op log and increments totalFailures", async () => {
    const failGen = stubCodegen({ failExec: true });
    const eng = new HyperCADSLiveBridgeEngine(failGen as never);
    const r = await eng.extrude({ distance: 5 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("stub failure");
    expect(eng.getGeometry().opCount).toBe(0);
    expect(eng.getStats().totalFailures).toBe(1);
  });

  it("undo pops the last op + increments totalUndos; empty session undo returns ok=false", () => {
    expect(engine.undo()).toEqual({ ok: false, remaining: 0 });
    expect(engine.getStats().totalUndos).toBe(0);
  });

  it("undo after a successful op pops it from the log", async () => {
    await engine.createSketch({ plane: "XY" });
    await engine.extrude({ distance: 5 });
    const u = engine.undo();
    expect(u.ok).toBe(true);
    expect(u.popped?.kind).toBe("feature_extrude");
    expect(u.remaining).toBe(1);
    expect(engine.getStats().totalUndos).toBe(1);
  });

  it("regenerate ships all current ops in one script", async () => {
    await engine.createSketch({ plane: "XY" });
    await engine.extrude({ distance: 5 });
    const r = await engine.regenerate();
    expect(r.ok).toBe(true);
    const regenBuild = codegen.callLog.filter(c => c.kind === "build").pop()!;
    expect(regenBuild.ops).toHaveLength(2);
  });

  it("executeRaw bypasses the op log and runs the raw script", async () => {
    const r = await engine.executeRaw("print('hello')");
    expect(r.ok).toBe(true);
    expect(r.scriptText).toBe("print('hello')");
    expect(engine.getGeometry().opCount).toBe(0);
    expect(engine.getStats().totalExecutions).toBe(1);
  });

  it("executeRaw on empty string throws TypeError (R12 fail-loud)", async () => {
    await expect(engine.executeRaw("")).rejects.toThrow(TypeError);
    await expect(engine.executeRaw(null as never)).rejects.toThrow(TypeError);
  });

  it("clearSession removes a single session; clearSession() removes all", async () => {
    engine.newDoc({ projectName: "A" });
    engine.newDoc({ projectName: "B" });
    expect(engine.clearSession("A")).toEqual({ cleared: 1 });
    expect(engine.listSessions().map(s => s.projectName)).toEqual(["B"]);
    expect(engine.clearSession()).toEqual({ cleared: 1 });
    expect(engine.listSessions()).toEqual([]);
  });

  it("getStats reflects executions, ops, failures, undos", async () => {
    await engine.createSketch({ plane: "XY" });
    await engine.extrude({ distance: 5 });
    engine.undo();
    const s = engine.getStats();
    expect(s.sessionCount).toBe(1);
    expect(s.totalOps).toBe(1);
    expect(s.totalExecutions).toBe(2);
    expect(s.totalFailures).toBe(0);
    expect(s.totalUndos).toBe(1);
  });

  it("opId is unique-per-call and stable within session counter sequence", async () => {
    const r1 = await engine.createSketch({ plane: "XY" });
    const r2 = await engine.extrude({ distance: 5 });
    expect(r1.opId).toMatch(/op-1$/);
    expect(r2.opId).toMatch(/op-2$/);
    expect(r1.opId).not.toBe(r2.opId);
  });
});
