/**
 * controller-features wiring (U-OSC-CONTROLLER-FEATURES) — calcDispatcher + engine
 * ================================================================================
 * FIX-2 from the SFC dead-axis triage: `controller_smoothing_factor` (built from
 * high_speed_machining / ai_contour_control / smoothing / end_point_control / look_ahead,
 * capped 1.8) reached the headline recommendation ONLY in aggressive_rush mode; the default
 * prism_optimized (Pareto-knee) path silently dropped it, so the four named controller axes
 * produced ZERO change on the most-used path.
 *
 * FIX: apply the factor to FEED (and dependent MRR) in prism_optimized too, leaving fz/vc/rpm
 * canonical -> Kienzle Fc (fz unchanged) and Taylor T (vc unchanged) are untouched (no force
 * re-check needed). These tests pin: (1) controller features now move feed/mrr in prism_optimized,
 * (2) fz/vc/rpm stay canonical (physics-safety invariant), (3) feed and mrr scale by the SAME
 * factor (applied once, no double-count), (4) backward-compatible when no features are set,
 * (5) cost_batch deliberately excludes it, (6) aggressive_rush still applies it (no regression),
 * (7) the 1.8 cap holds, (8) reachable through the dispatcher (R15 round-trip).
 */

import { describe, it, expect } from "vitest";
import { speedFeedNineAxisOrchestratorEngine, type NineAxisInput } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

const BASE = {
  material: { iso_group: "P" as const, name: "AISI 1018" },
  tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" as const },
  toolpath: { operation: "milling" as const, cut_type: "roughing" as const, axial_depth_mm: 6, radial_depth_mm: 4.8 },
};
const NO_CTRL = { controller: {} };
const FULL_CTRL = { controller: { high_speed_machining: true, ai_contour_control: true, smoothing: true, end_point_control: true } };

function rec(opts: Record<string, unknown>) {
  return speedFeedNineAxisOrchestratorEngine.run({ ...BASE, ...opts } as NineAxisInput).recommendation;
}

describe("controller-features wiring — prism_optimized (U-OSC-CONTROLLER-FEATURES)", () => {
  const basic = rec({ ...NO_CTRL, mode: "prism_optimized" });
  const full = rec({ ...FULL_CTRL, mode: "prism_optimized" });

  it("controller features RAISE feed + MRR in prism_optimized (the gap FIX)", () => {
    // Was the bug: identical feed regardless of controller in the default path.
    expect(full.feed_rate_mmmin).toBeGreaterThan(basic.feed_rate_mmmin * 1.2);
    expect(full.mrr_cm3min).toBeGreaterThan(basic.mrr_cm3min * 1.2);
  });

  it("fz / vc / rpm stay CANONICAL (physics-safety: Kienzle Fc + Taylor T untouched)", () => {
    expect(full.feed_per_tooth_mm).toBeCloseTo(basic.feed_per_tooth_mm, 6);
    expect(full.cutting_speed_mpm).toBeCloseTo(basic.cutting_speed_mpm, 6);
    expect(full.spindle_rpm).toBeCloseTo(basic.spindle_rpm, 6);
  });

  it("feed and MRR scale by the SAME factor (applied once — no double-count)", () => {
    const feedRatio = full.feed_rate_mmmin / basic.feed_rate_mmmin;
    const mrrRatio = full.mrr_cm3min / basic.mrr_cm3min;
    // Same factor => ratios equal to within output rounding (feed/mrr are rounded in the
    // recommendation). A DOUBLE-count would make mrrRatio ~= feedRatio^2 (~3.15), failing this hard.
    expect(feedRatio).toBeCloseTo(mrrRatio, 2);
    // The shared factor must respect the 1.8 cap; *1.005 absorbs integer-feed rounding only
    // (an UNCAPPED full-feature+lookahead product is ~1.86, which still fails this bound).
    expect(feedRatio).toBeLessThanOrEqual(1.8 * 1.005);
    expect(feedRatio).toBeGreaterThan(1.2);
  });

  it("backward-compatible: omitting controller entirely == controller:{} (factor 1.0)", () => {
    const omitted = rec({ mode: "prism_optimized" });
    expect(omitted.feed_rate_mmmin).toBeCloseTo(basic.feed_rate_mmmin, 6);
    expect(omitted.mrr_cm3min).toBeCloseTo(basic.mrr_cm3min, 6);
  });

  it("cost_batch deliberately EXCLUDES controller smoothing (V_min_cost not inflated)", () => {
    const cb0 = rec({ ...NO_CTRL, mode: "cost_batch" });
    const cb1 = rec({ ...FULL_CTRL, mode: "cost_batch" });
    expect(cb1.feed_rate_mmmin).toBeCloseTo(cb0.feed_rate_mmmin, 6);
    expect(cb1.mrr_cm3min).toBeCloseTo(cb0.mrr_cm3min, 6);
  });

  it("aggressive_rush STILL applies controller smoothing (no regression)", () => {
    const ar0 = rec({ ...NO_CTRL, mode: "aggressive_rush" });
    const ar1 = rec({ ...FULL_CTRL, mode: "aggressive_rush" });
    expect(ar1.feed_rate_mmmin).toBeGreaterThan(ar0.feed_rate_mmmin * 1.2);
  });

  it("the 1.8 cap holds even with every feature + heavy look-ahead", () => {
    const capped = rec({ controller: { high_speed_machining: true, ai_contour_control: true, smoothing: true, end_point_control: true, look_ahead_blocks: 1000 }, mode: "prism_optimized" });
    const ratio = capped.feed_rate_mmmin / basic.feed_rate_mmmin;
    // Capped factor is exactly 1.8; *1.005 absorbs integer-feed rounding (uncapped product ~1.86 fails).
    expect(ratio).toBeLessThanOrEqual(1.8 * 1.005);
    expect(ratio).toBeGreaterThan(1.2);
  });
});

describe("controller-features wiring — dispatcher round-trip (R15)", () => {
  interface CapturedTool {
    name: string;
    handler: (args: { action: string; params: Record<string, unknown> }) => Promise<unknown>;
  }
  function createMockServer() {
    const tools: CapturedTool[] = [];
    const server = { tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) { tools.push({ name, handler }); } };
    return { server, tools };
  }
  async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown>) {
    const result = await tool.handler({ action, params });
    const r = result as { content?: Array<{ text: string }> };
    const text = r?.content?.[0]?.text;
    return (text ? JSON.parse(text) : result) as Record<string, any>;
  }

  const { server, tools } = createMockServer();
  registerCalcDispatcher(server);
  const calc = tools[0];

  function recFromDispatcher(res: Record<string, any>) {
    return res.data?.recommendation ?? res.recommendation;
  }

  it("sfc_nine_axis_run reflects the controller factor end-to-end (feed higher with features ON)", async () => {
    const off = await callAction(calc, "sfc_nine_axis_run", { ...BASE, ...NO_CTRL, mode: "prism_optimized" });
    const on = await callAction(calc, "sfc_nine_axis_run", { ...BASE, ...FULL_CTRL, mode: "prism_optimized" });
    const recOff = recFromDispatcher(off);
    const recOn = recFromDispatcher(on);
    // Concrete proof the round-trip returned a valid recommendation (mode echoed), not undefined.
    expect(recOff.mode).toBe("prism_optimized");
    expect(recOn.mode).toBe("prism_optimized");
    expect(recOn.feed_rate_mmmin).toBeGreaterThan(recOff.feed_rate_mmmin * 1.2);
    // fz canonical through the dispatcher too.
    expect(recOn.feed_per_tooth_mm).toBeCloseTo(recOff.feed_per_tooth_mm, 6);
  });
});
