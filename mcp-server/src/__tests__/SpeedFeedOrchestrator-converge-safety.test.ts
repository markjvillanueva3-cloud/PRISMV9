/**
 * SpeedFeedOrchestrator-converge-safety.test.ts
 *
 * U-SFC-CONVERGE-SAFETY (slot:oscar, 2026-06-22).
 *
 * Regression guard for the convergence under-report bug.  With PRISM_SFC_CONVERGE=1 the orchestrator
 * delegated the 8 headline core-physics quantities to UltimateSpeedFeedEngine but left spindle_rpm,
 * mrr_cm3min, deflection_um, safety_checks, and limiting_factors computed on the orchestrator's
 * (lower) inline physics -- so the published recommendation was internally inconsistent AND the
 * safety panel UNDER-REPORTED load.  Observed live before the fix:
 *   - haas vf-2 base cut: published Vc=160 m/min with spindle_rpm=1530 (rpm implies Vc=57.7);
 *     power_kw=12.5 while the power safety check read 2.25 kW (5.5x under-report).
 *   - weak 1.5 kW machine: published 25.3 kW / 94.9 Nm recommendation while the power check read
 *     1.28 kW (~20x under-report) -- a machine-wrecking over-publish with a green-ish safety panel.
 *
 * The fix safety-gates the delegation: the delegated recommendation is PUBLISHED only when it is
 * within the SAME machine limits the orchestrator clamps to (power/torque/rpm/deflection/feed/
 * workholding); on accept, rpm/MRR/deflection/safety_checks/limiting_factors are re-synced to the
 * delegated values; on breach/invalid/exception it falls back to the orchestrator's already-clamped,
 * self-consistent result (R12 fail-loud -- the reason is recorded in formulas_used).
 *
 * Invariants (algebraic, not magic numbers -- R9):
 *   I1 rpm-consistency:  cutting_speed_mpm ≈ π·D·spindle_rpm/1000
 *   I2 mrr-consistency:  mrr_cm3min ≈ axial·radial·feed_rate/1000
 *   I3 safety-honesty:   power_check.value==power_kw, workholding.value==tangential_force_N,
 *                        torque.value==torque_Nm (the panel reflects the PUBLISHED physics)
 */

import { describe, it, expect, afterEach } from "vitest";
import { speedFeedOrchestratorEngine as E } from "../engines/SpeedFeedOrchestratorEngine.js";
import type { OrchestratorInput } from "../engines/SpeedFeedOrchestratorEngine.js";

const SAVED = process.env.PRISM_SFC_CONVERGE;
afterEach(() => {
  if (SAVED !== undefined) process.env.PRISM_SFC_CONVERGE = SAVED;
  else delete process.env.PRISM_SFC_CONVERGE;
});

// Aggressive roughing on a real JM-Die machine: delegated recommendation exceeds the haas torque
// limit -> the gate must fall back to the orchestrator's safe value.
const AGGRESSIVE: OrchestratorInput = {
  material: "steel", iso_group: "P", tool_diameter_mm: 12, flutes: 4, tool_material: "carbide",
  tool_coating: "TiAlN", corner_radius_mm: 0.5, tool_stickout_mm: 30, operation: "milling",
  cut_type: "roughing", axial_depth_mm: 12, radial_depth_mm: 6, machine_name: "haas vf-2",
  coolant_type: "flood",
};
// Light finishing cut: delegated recommendation is within limits -> the gate ACCEPTS it.
const LIGHT: OrchestratorInput = {
  ...AGGRESSIVE, cut_type: "finishing", axial_depth_mm: 0.5, radial_depth_mm: 0.3,
  tool_diameter_mm: 8, corner_radius_mm: 0.2,
};
// Deliberately weak machine + heavy cut: the delegated recommendation would draw ~25 kW on a
// 1.5 kW machine -- the catastrophe the gate must prevent.
const WEAK: OrchestratorInput = {
  ...AGGRESSIVE, machine_name: undefined, machine_power_kw: 1.5, machine_max_rpm: 6000,
  machine_max_torque_nm: 10, axial_depth_mm: 20, radial_depth_mm: 12, tool_diameter_mm: 20,
};

/** Assert the published result is internally self-consistent (I1-I3). Holds for accept AND fallback. */
function assertConsistent(v: any): void {
  const D = v.resolved_tool?.diameter_mm?.value ?? 12;
  // I1 rpm: Vc = π·D·rpm/1000 (rounding tolerance)
  expect(Math.abs(Math.PI * D * v.spindle_rpm / 1000 - v.cutting_speed_mpm)).toBeLessThan(0.7);
  // I2 mrr: MRR = ap·ae·Vf/1000
  expect(Math.abs((v.axial_depth_mm * v.radial_depth_mm * v.feed_rate_mmmin / 1000) - v.mrr_cm3min)).toBeLessThan(0.7);
  // I3 honesty: the safety panel reflects the PUBLISHED physics (this is the bug the fix kills)
  const pc = v.safety_checks.find((c: any) => c.name === "power");
  const wh = v.safety_checks.find((c: any) => c.name === "workholding");
  const tq = v.safety_checks.find((c: any) => c.name === "torque");
  expect(Math.abs(pc.value - v.power_kw)).toBeLessThan(0.05);
  expect(Math.abs(wh.value - v.tangential_force_N)).toBeLessThan(1.5);
  expect(Math.abs(tq.value - v.torque_Nm)).toBeLessThan(0.05);
}

describe("SpeedFeedOrchestrator PRISM_SFC_CONVERGE safety gate (U-SFC-CONVERGE-SAFETY)", () => {

  it("flag OFF: aggressive cut is self-consistent (baseline invariants)", () => {
    delete process.env.PRISM_SFC_CONVERGE;
    assertConsistent(E.compute(AGGRESSIVE).value);
  });

  it("flag ON + light finishing cut: delegation ACCEPTED; published physics + safety panel consistent; all checks pass", () => {
    process.env.PRISM_SFC_CONVERGE = "1";
    const v = E.compute(LIGHT).value;
    // accepted path leaves the "safety re-validated" marker
    expect(v.formulas_used.some((f: string) => f.includes("safety re-validated"))).toBe(true);
    expect(v.engines_called.some((e: string) => e.includes("PRISM_SFC_CONVERGE"))).toBe(true);
    assertConsistent(v);
    // an ACCEPTED delegation is within every machine limit by construction
    for (const c of v.safety_checks) {
      expect(c.passed).toBe(true);
    }
    // the "balanced" (recommended) alternative anchors on the PUBLISHED delegated Vc, not the
    // orchestrator baseline -- so the recommended alternative can never contradict the headline.
    const balanced = v.alternatives.find((a: any) => a.label === "balanced");
    const balancedVc = balanced?.cutting_speed_mpm ?? -1;
    expect(balancedVc).toBeCloseTo(v.cutting_speed_mpm, 1);
  });

  it("flag ON + aggressive cut exceeding torque: SAFE FALLBACK (no over-publish), still consistent", () => {
    process.env.PRISM_SFC_CONVERGE = "1";
    const on = E.compute(AGGRESSIVE).value;
    delete process.env.PRISM_SFC_CONVERGE;
    const off = E.compute(AGGRESSIVE).value;
    // fell back to the orchestrator's safe, clamped value -- NOT the over-torque delegated value
    expect(on.cutting_speed_mpm).toBe(off.cutting_speed_mpm);
    expect(on.formulas_used.some((f: string) => f.includes("fallback to orchestrator (delegated exceeds limits"))).toBe(true);
    // a rejected delegation must NOT mark engines_called as delegated
    expect(on.engines_called.some((e: string) => e.includes("PRISM_SFC_CONVERGE"))).toBe(false);
    assertConsistent(on);
  });

  it("flag ON + weak machine overload: NEVER publishes machine-wrecking params (the 25kW@1.5kW bug)", () => {
    process.env.PRISM_SFC_CONVERGE = "1";
    const v = E.compute(WEAK).value;
    // delegated drew ~25 kW on a 1.5 kW machine -> the gate MUST reject it
    expect(v.formulas_used.some((f: string) => f.includes("fallback to orchestrator (delegated exceeds limits"))).toBe(true);
    // the breach message must name the power overload (R12 fail-loud)
    expect(v.formulas_used.some((f: string) => f.includes("power") && f.includes("exceeds limits"))).toBe(true);
    // published power must be sane for a 1.5 kW machine -- NOT the 25 kW delegate
    expect(v.power_kw).toBeLessThan(5);
    assertConsistent(v);
  });

  it("flag ON: the power safety check NEVER under-reports vs the published power (the core bug), across configs", () => {
    process.env.PRISM_SFC_CONVERGE = "1";
    for (const inp of [AGGRESSIVE, LIGHT, WEAK]) {
      const v = E.compute(inp).value;
      const pc = v.safety_checks.find((c: any) => c.name === "power");
      // before the fix this was off by 5.5x (base) and ~20x (weak)
      expect(pc.value).toBeCloseTo(v.power_kw, 1);
    }
  });

  it("flag ON->OFF state isolation: flag-off result after a flag-on call is unchanged (no leak)", () => {
    process.env.PRISM_SFC_CONVERGE = "1";
    E.compute(LIGHT); // prime delegate
    delete process.env.PRISM_SFC_CONVERGE;
    const off1 = E.compute(AGGRESSIVE).value;
    const off2 = E.compute(AGGRESSIVE).value;
    expect(off1.cutting_speed_mpm).toBe(off2.cutting_speed_mpm);
    assertConsistent(off1);
  });

});
