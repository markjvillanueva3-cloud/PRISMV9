/**
 * Tests for the SFC orchestrator's `optimize_for` cutting-speed factor
 * (physics/optimize-for-factor.ts) AND its wiring into SpeedFeedOrchestratorEngine.compute()
 * (U-OSC-ORCH-OPTIMIZE-FOR-WIRE).
 *
 * The cost/balanced/productivity goal selector on the SFC web pages (SpeedFeedPage /speed-feed,
 * CalculatorPage /calculator, both via prism_calc:sf_orchestrate) was DEAD -- the engine declared
 * `optimize_for` but never consumed it, so every goal returned byte-identical Vc/tool_life
 * (verified live on :3100, 2026-06-25). These tests pin the goal->Vc factor, the DERATE-ONLY safety
 * invariant (never raises the conservative nominal Vc), and the end-to-end ordering through the real
 * engine. They would all FAIL if the `* optVcFactor` wiring were reverted (Vc/life identical again).
 */
import { describe, it, expect } from "vitest";
import { optimizeForVcFactor, OPTIMIZE_FOR_VC_FACTOR } from "../physics/optimize-for-factor.js";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

describe("optimizeForVcFactor (pure goal->Vc multiplier)", () => {
  it("keeps balanced/productivity/time at the conservative nominal 1.0 (default preserved)", () => {
    expect(optimizeForVcFactor("balanced")).toBe(1.0);
    expect(optimizeForVcFactor("productivity")).toBe(1.0);
    expect(optimizeForVcFactor("time")).toBe(1.0);
  });

  it("derates Vc for cost, and more steeply for tool_life (Taylor minimum-cost direction)", () => {
    expect(optimizeForVcFactor("cost")).toBe(0.85);
    expect(optimizeForVcFactor("tool_life")).toBe(0.8);
    // tool_life is the steepest derate: tool_life < cost < balanced.
    expect(optimizeForVcFactor("tool_life")).toBeLessThan(optimizeForVcFactor("cost"));
    expect(optimizeForVcFactor("cost")).toBeLessThan(optimizeForVcFactor("balanced"));
  });

  it("returns the neutral 1.0 for undefined, null, empty, surface_finish, and unknown goals", () => {
    expect(optimizeForVcFactor(undefined)).toBe(1.0);
    expect(optimizeForVcFactor(null)).toBe(1.0);
    expect(optimizeForVcFactor("")).toBe(1.0);
    expect(optimizeForVcFactor("surface_finish")).toBe(1.0); // scoped-out follow-up -> no change
    expect(optimizeForVcFactor("max_overdrive")).toBe(1.0);
  });

  it("ADVERSARIAL: inherited Object keys never resolve to a spurious factor (no NaN/pollution)", () => {
    // Regression: a plain-object lookup returned Object.prototype.toString (a function) for these,
    // yielding NaN. The null-prototype table + Object.hasOwn guard must return the neutral 1.0.
    expect(optimizeForVcFactor("toString")).toBe(1.0);
    expect(optimizeForVcFactor("constructor")).toBe(1.0);
    expect(optimizeForVcFactor("hasOwnProperty")).toBe(1.0);
    expect(optimizeForVcFactor("__proto__")).toBe(1.0);
  });

  it("SAFETY INVARIANT: every table entry derates only -- factor <= 1.0 (never raises Vc)", () => {
    for (const [goal, factor] of Object.entries(OPTIMIZE_FOR_VC_FACTOR)) {
      expect(factor, `${goal} must not raise Vc`).toBeLessThanOrEqual(1.0);
      expect(optimizeForVcFactor(goal), `${goal} resolver must not raise Vc`).toBeLessThanOrEqual(1.0);
    }
  });
});

describe("SpeedFeedOrchestratorEngine.compute() honors optimize_for (was a dead slider)", () => {
  // A real JM-Die-representative cut (VMC-03 Haas VF-2, 4140 prehard, carbide), conservative
  // geometry so deflection does not become the binding constraint and mask the optimize_for delta.
  const base = {
    material: "4140 prehard",
    iso_group: "P",
    hardness_hb: 300,
    machine_name: "Haas VF-2",
    machine_power_kw: 22.4,
    machine_max_rpm: 8100,
    machine_max_torque_nm: 122,
    tool_diameter_mm: 12,
    flutes: 4,
    tool_material: "carbide",
    tool_coating: "TiAlN",
    corner_radius_mm: 0.5,
    tool_stickout_mm: 20,
    operation: "milling",
    cut_type: "roughing",
    strategy: "adaptive",
    axial_depth_mm: 6,
    radial_depth_mm: 1.8,
    radial_depth_pct: 15,
    coolant_type: "flood",
    feature_tolerance_mm: 0.05,
  } as const;

  const run = (optimize_for: string) =>
    speedFeedOrchestratorEngine.compute({ ...base, optimize_for } as never).value;

  it("cost lowers Vc and lengthens tool life vs balanced (the slider now does something)", () => {
    const balanced = run("balanced");
    const cost = run("cost");
    expect(cost.cutting_speed_mpm).toBeLessThan(balanced.cutting_speed_mpm);
    // Taylor: lower Vc -> longer life (T = (C/Vc)^(1/n), n>0).
    expect(cost.tool_life_min).toBeGreaterThan(balanced.tool_life_min);
  });

  it("tool_life lowers Vc more than cost (steepest derate)", () => {
    expect(run("tool_life").cutting_speed_mpm).toBeLessThan(run("cost").cutting_speed_mpm);
  });

  it("productivity equals balanced (raising above nominal is operator-gated, not auto-applied)", () => {
    expect(run("productivity").cutting_speed_mpm).toBeCloseTo(run("balanced").cutting_speed_mpm, 5);
  });

  it("never RAISES Vc above the balanced nominal for ANY goal (safety: derate-only)", () => {
    const balancedVc = run("balanced").cutting_speed_mpm;
    for (const goal of ["cost", "tool_life", "surface_finish", "productivity", "time", "balanced"]) {
      expect(run(goal).cutting_speed_mpm, `${goal} must not exceed balanced Vc`).toBeLessThanOrEqual(balancedVc + 1e-6);
    }
  });
});
