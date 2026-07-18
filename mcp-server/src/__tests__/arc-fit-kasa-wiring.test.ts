/**
 * arc_fit_kasa — calcDispatcher wiring test
 * ==========================================
 * U-WIRE-ARCFIT (kilo, 2026-05-17): wires the orphan `ArcFittingEngine`
 * into `prism_calc:arc_fit_kasa`.
 *
 * Background: ArcFittingEngine (Kasa least-squares point-cloud → G02/G03 arc
 * fitter, MIO-MS0/U-MIO20) shipped with a full test suite but ZERO dispatcher
 * reference. `prism_calc` already had an `arc_fit` action — but that wires to
 * `ToolpathCalculations.calculateArcFitting`, a scalar block-time calc with a
 * different signature. This unit adds a NEW action `arc_fit_kasa` to expose
 * the engine's point-cloud → arc converter as a real MCP capability.
 */

import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { arcFittingEngine, type Point3D } from "../engines/ArcFittingEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params: Record<string, unknown> }) => Promise<{ content?: Array<{ text: string }> } | unknown>;
}

function createMockServer(): { server: { tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void }; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await tool.handler({ action, params });
  const r = result as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return text ? (JSON.parse(text) as Record<string, unknown>) : (result as Record<string, unknown>);
}

const { server, tools } = createMockServer();
registerCalcDispatcher(server);
const calc = tools[0];

function quarterCircle(radius: number, n: number, cx = 0, cy = 0): Point3D[] {
  const pts: Point3D[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), z: 0 });
  }
  return pts;
}

function halfCircleCW(radius: number, n: number): Point3D[] {
  const pts: Point3D[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push({ x: radius * Math.cos(a), y: radius * Math.sin(a), z: 0 });
  }
  return pts;
}

describe("arc_fit_kasa — wiring", () => {
  it("conservation invariant: arc.original_points + remaining.length == original_count, every fit_error within tolerance", async () => {
    const points = quarterCircle(5, 6); // 7 points
    const res = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 0.05 });
    // slimResponse strips empty arrays — normalize back for the invariant check.
    const arcs = (res.arcs as Array<{ original_points: number; fit_error_mm: number }> | undefined) ?? [];
    const remaining = (res.remaining_points as unknown[] | undefined) ?? [];
    expect(res.original_count).toBe(7);
    const consumedByArcs = arcs.reduce((sum, a) => sum + a.original_points, 0);
    expect(consumedByArcs + remaining.length).toBe(7);
    for (const a of arcs) expect(a.fit_error_mm).toBeLessThanOrEqual(0.05);
    expect(res.arc_count).toBe(arcs.length);
  });

  it("perfect quarter-circle (r=10, 11 points): fits exactly 1 arc, radius==10, sweep==90°, fit_error<0.001", async () => {
    const points = quarterCircle(10, 10);
    const res = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 0.01 });
    const arcs = res.arcs as Array<{ radius_mm: number; fit_error_mm: number; angle_degrees: number }>;
    expect(arcs.length).toBe(1);
    expect(arcs[0].radius_mm).toBeCloseTo(10, 6);
    expect(arcs[0].angle_degrees).toBeCloseTo(90, 6);
    expect(arcs[0].fit_error_mm).toBeLessThan(0.001);
  });

  it("perfect half-circle (r=15, 31 points): fits exactly 1 arc, radius==15, sweep==180°", async () => {
    const radius = 15;
    const points: Point3D[] = [];
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * Math.PI;
      points.push({ x: radius * Math.cos(a), y: radius * Math.sin(a), z: 0 });
    }
    const res = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 0.05 });
    const arcs = res.arcs as Array<{ radius_mm: number; angle_degrees: number }>;
    expect(arcs.length).toBe(1);
    expect(arcs[0].radius_mm).toBeCloseTo(15, 6);
    expect(arcs[0].angle_degrees).toBeCloseTo(180, 6);
  });

  it("dispatcher result matches direct engine call exactly (lazy-import parity)", async () => {
    const points = quarterCircle(8, 12);
    const opts = { tolerance_mm: 0.02 };
    const direct = arcFittingEngine.fit(points, opts);
    const viaDispatcher = await callAction(calc, "arc_fit_kasa", { points, ...opts });
    expect(viaDispatcher.arc_count).toBe(direct.arc_count);
    expect(viaDispatcher.original_count).toBe(direct.original_count);
    expect(viaDispatcher.reduction_pct).toBe(direct.reduction_pct);
    const viaRadius = (viaDispatcher.arcs as Array<{ radius_mm: number }>)[0].radius_mm;
    expect(viaRadius).toBeCloseTo(direct.arcs[0].radius_mm, 6);
  });

  it("propagates `plane: XZ` — XZ fits exactly 1 arc at radius 6; XY (Y-collinear) fits exactly 0 arcs", async () => {
    const radius = 6;
    const points: Point3D[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * (Math.PI / 2);
      points.push({ x: radius * Math.cos(a), y: 99, z: radius * Math.sin(a) });
    }
    const xz = await callAction(calc, "arc_fit_kasa", { points, plane: "XZ", tolerance_mm: 0.01 });
    const xy = await callAction(calc, "arc_fit_kasa", { points, plane: "XY", tolerance_mm: 0.01 });
    const xzArcs = xz.arcs as Array<{ radius_mm: number }>;
    expect(xzArcs.length).toBe(1);
    expect(xzArcs[0].radius_mm).toBeCloseTo(6, 6);
    expect(xy.arc_count).toBe(0);
  });

  it("`emit_gcode: true` for CW half-circle (r=12, 15 points): exactly 1 G02, |i,j|==12, feedrate==1000", async () => {
    const points = halfCircleCW(12, 14);
    const res = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 0.05, emit_gcode: true, feedrate: 1000 });
    const gcode = res.gcode as Array<{ code: string; i: number; j: number; f?: number }>;
    expect(gcode.length).toBe(1);
    expect(gcode[0].code).toBe("G02");
    expect(gcode[0].f).toBe(1000);
    const ijMag = Math.sqrt(gcode[0].i * gcode[0].i + gcode[0].j * gcode[0].j);
    expect(ijMag).toBeCloseTo(12, 6);
  });

  it("`emit_gcode` omitted: no gcode field; engine's FittedArc[] still produces 1 fitted arc", async () => {
    const points = quarterCircle(7, 8);
    const res = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 0.02 });
    expect(res.gcode).toBe(undefined);
    expect((res.arcs as unknown[]).length).toBe(1);
  });

  it("insufficient points (2 < default min_points=5): exactly 0 arcs, both original points preserved", async () => {
    const res = await callAction(calc, "arc_fit_kasa", {
      points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
    });
    // arcs:[] is stripped by slimResponse → undefined; remaining is non-empty.
    expect(res.arc_count).toBe(0);
    expect(((res.arcs as unknown[] | undefined) ?? []).length).toBe(0);
    expect((res.remaining_points as unknown[]).length).toBe(2);
    expect(res.original_count).toBe(2);
  });

  it("linear sequence (outside [0.5, 100]mm radius band): exactly 0 arcs, all 12 points remain", async () => {
    const points: Point3D[] = [];
    for (let i = 0; i < 12; i++) points.push({ x: i, y: 2 * i, z: 0 });
    const res = await callAction(calc, "arc_fit_kasa", {
      points,
      tolerance_mm: 0.001,
      min_radius_mm: 0.5,
      max_radius_mm: 100,
    });
    expect(res.arc_count).toBe(0);
    expect((res.remaining_points as unknown[]).length).toBe(12);
  });

  it("`tolerance_mm` is honored — tight (0.01) yields 0 arcs on ±0.3mm noisy arc, loose (1.0) yields exactly 1", async () => {
    const radius = 20;
    const points: Point3D[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * (Math.PI / 2);
      const r = radius + (i % 2 === 0 ? 0.3 : -0.3);
      points.push({ x: r * Math.cos(a), y: r * Math.sin(a), z: 0 });
    }
    const tight = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 0.01 });
    const loose = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 1.0 });
    expect(tight.arc_count).toBe(0);
    expect(loose.arc_count).toBe(1);
  });

  it("CW half-circle (17 points): direction=='cw' on the fitted arc", async () => {
    const points = halfCircleCW(10, 16);
    const res = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 0.05 });
    const arcs = res.arcs as Array<{ direction: string }>;
    expect(arcs.length).toBe(1);
    expect(arcs[0].direction).toBe("cw");
  });

  it("CCW quarter-circle (11 points): direction=='ccw' (sanity vs the CW test)", async () => {
    const points = quarterCircle(10, 10);
    const res = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 0.01 });
    const arcs = res.arcs as Array<{ direction: string }>;
    expect(arcs.length).toBe(1);
    expect(arcs[0].direction).toBe("ccw");
  });

  it("ai_reasoning trace first line literally names the input point count (9) — proves engine output reached caller", async () => {
    const points = quarterCircle(5, 8); // 9 points
    const res = await callAction(calc, "arc_fit_kasa", { points, tolerance_mm: 0.02 });
    const reasoning = res.ai_reasoning as string[];
    expect(reasoning[0]).toMatch(/Processing 9 points/);
  });
});
