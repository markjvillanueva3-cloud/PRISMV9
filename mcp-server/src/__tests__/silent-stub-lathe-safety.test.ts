/**
 * Silent-stub fixes: stock-boundary SAFETY gate + trilobe + stock-feed
 * ====================================================================
 * U-LW-STUB-SAFETY (whiskey, 2026-07-03). From the silent-stub-audit inventory,
 * 3 more genuinely-broken auto-stubs (engine lacks all guessed methods):
 *   • stock_boundary_gate_check (safetyDispatcher) -> StockBoundaryGateEngine.gate()
 *     P0 SAFETY: guessed run/evaluate/check -> the collision/stock-boundary gate
 *     ALWAYS returned {note:"method not callable"} success:true = a SILENT FALSE-PASS.
 *   • trilobe_deformation_calc (calcDispatcher) -> TrilobeDeformationEngine.analyze()
 *   • stock_feed_cycle_track (calcDispatcher) -> StockFeedCycleEngine.advanceCycle()
 */

import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";
import { trilobeDeformationEngine } from "../engines/TrilobeDeformationEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params: Record<string, unknown> }) => Promise<{ content?: Array<{ text: string }> } | unknown>;
}
function mockServer() {
  const tools: CapturedTool[] = [];
  return { server: { tool: (name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) => tools.push({ name, handler }) }, tools };
}
async function call(tool: CapturedTool, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const r = (await tool.handler({ action, params })) as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return text ? (JSON.parse(text) as Record<string, unknown>) : (r as Record<string, unknown>);
}
function payload(res: Record<string, unknown>): Record<string, unknown> {
  let d: Record<string, unknown> = res;
  if (d.data && typeof d.data === "object") d = d.data as Record<string, unknown>;
  return d;
}
const STUB = "method not callable";

const calcMock = mockServer(); registerCalcDispatcher(calcMock.server);
const calc = calcMock.tools[0];
const safetyMock = mockServer(); registerSafetyDispatcher(safetyMock.server);
const safety = safetyMock.tools[0];

describe("silent-stub lathe/safety fixes", () => {
  it("P0 SAFETY: stock_boundary_gate_check now FIRES (validates) instead of silently passing", async () => {
    // Malformed input: pre-fix -> {success:true, note:"method not callable"} (silent pass).
    // post-fix -> gate() runs Schema.parse() and either returns a real {status,violations}
    // verdict or a fail-loud validation error. Either way NOT a silent success stub.
    const res = await call(safety, "stock_boundary_gate_check", { program: {} });
    expect(JSON.stringify(res)).not.toContain(STUB);
    const d = payload(res);
    const realVerdict = typeof d.status === "string" && ["SAFE", "WARNING", "BLOCKED"].includes(d.status as string);
    const failLoud = res.success === false || "error" in res || /stock|workholding|required|invalid|expected/i.test(JSON.stringify(res));
    // The gate must NOT silently succeed with no verdict (the pre-fix failure mode).
    expect(realVerdict || failLoud).toBe(true);
    const silentPass = res.success === true && !realVerdict && !("violations" in d);
    expect(silentPass).toBe(false);
  });

  it("trilobe_deformation_calc routes to analyze() — real deformation physics + engine parity", async () => {
    const input = { bore_radius_mm: 20, wall_thickness_mm: 3, grip_length_mm: 15, total_clamp_force_n: 5000, jaw_count: 3 };
    const res = await call(calc, "trilobe_deformation_calc", input);
    expect(JSON.stringify(res)).not.toContain(STUB);
    const d = payload(res);
    expect(Number.isFinite(d.lobe_amplitude_um as number)).toBe(true);
    expect(typeof d.is_trilobe_critical).toBe("boolean");
    const direct = trilobeDeformationEngine.analyze(input as never);
    expect(d.lobe_amplitude_um as number).toBeCloseTo(direct.lobe_amplitude_um, 6);
    expect(d.per_jaw_force_n as number).toBeCloseTo(direct.per_jaw_force_n, 6);
  });

  it("stock_feed_cycle_track routes to advanceCycle() — no 'method not callable' stub", async () => {
    const state = {
      bar: { length_mm: 3600, diameter_mm: 25, cost_per_mm: 0.02 },
      part: { cut_length_mm: 40, facing_stock_mm: 1, parting_width_mm: 3, min_remnant_mm: 100 },
      parts_produced: 0, remaining_bar_mm: 3600, total_scrap_mm: 0, cycle_count: 0,
    };
    const res = await call(calc, "stock_feed_cycle_track", state);
    expect(JSON.stringify(res)).not.toContain(STUB);
    // reached the real engine: not the {engine,note} stub shape.
    const silentStub = payload(res).engine === "StockFeedCycleEngine" && "note" in payload(res);
    expect(silentStub).toBe(false);
  });

  it("REGRESSION: none of the 3 returns the {note:'method not callable'} stub", async () => {
    const rows: Array<[CapturedTool, string, Record<string, unknown>]> = [
      [safety, "stock_boundary_gate_check", { program: {} }],
      [calc, "trilobe_deformation_calc", { bore_radius_mm: 18, wall_thickness_mm: 4, grip_length_mm: 12, total_clamp_force_n: 4000, jaw_count: 3 }],
      [calc, "stock_feed_cycle_track", { bar: { length_mm: 3000, diameter_mm: 20, cost_per_mm: 0.02 }, part: { cut_length_mm: 30, facing_stock_mm: 1, parting_width_mm: 3, min_remnant_mm: 80 }, parts_produced: 0, remaining_bar_mm: 3000, total_scrap_mm: 0, cycle_count: 0 }],
    ];
    for (const [tool, action, params] of rows) {
      const res = await call(tool, action, params);
      expect(JSON.stringify(res), `${action} still stubbed`).not.toContain(STUB);
    }
  });
});
