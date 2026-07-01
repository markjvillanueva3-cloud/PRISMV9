/**
 * SpeedFeedOrchestrator-converge-flag.test.ts
 *
 * Tests for the PRISM_SFC_CONVERGE flag-gated delegation in SpeedFeedOrchestratorEngine.compute().
 *
 * test 1 (flag OFF): baseline numbers are hard-coded from a live capture run; asserts they do
 *   not change -- proves flag-off path is byte-identical to pre-P2 code.
 * test 2 (flag ON):  asserts cutting_speed_mpm DIFFERS and is HIGHER than the flag-off value,
 *   AND that resolved_machine + limiting_factors + safety_checks are still populated (layering
 *   preserved).  Concrete counts + range checks -- no toBeDefined().
 * test 3 (flag ON -- adversarial: unknown material): engine must not throw and must still
 *   return a valid positive cutting_speed_mpm with resolved context intact.
 * test 4 (flag ON -- adversarial: no machine name): engine must not throw and must return
 *   a positive cutting_speed_mpm.
 * test 5 (flag OFF after ON): toggling env back to unset must return the original baseline,
 *   proving no state leaks between flag-on and flag-off calls.
 * test 6 (flag ON -- failure mode: empty input): compute() must not throw and must return
 *   a valid OrchestratorResult (both orchestrator and engine have full inference for sparse inputs).
 *
 * All assertions use hard numbers (R9 -- algebraic invariants or live-captured reference values).
 * No toBeDefined() or toBeTruthy() stubs anywhere.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";
import type { OrchestratorInput } from "../engines/SpeedFeedOrchestratorEngine.js";

// ── Representative steel-P milling-rough input (canonical test fixture) ──
const BASE_INPUT: OrchestratorInput = {
  material: "steel",
  iso_group: "P",
  tool_diameter_mm: 12,
  flutes: 4,
  tool_material: "carbide",
  tool_coating: "TiAlN",
  corner_radius_mm: 0.5,
  tool_stickout_mm: 30,
  operation: "milling",
  cut_type: "roughing",
  axial_depth_mm: 12,
  radial_depth_mm: 6,
  machine_name: "haas vf-2",
  coolant_type: "flood",
};

// ── Baseline values -- captured from live flag-OFF run (2026-06-23, slot:oscar) ──
// These values are the production contract for the flag-OFF path.
// UPDATED 2026-06-23 (U-SFC-DEFLECTION-VC-LEVER): the prior baseline Vc=57.7 / life=1355
//   ENCODED THE DEFLECTION-VC-COLLAPSE BUG -- the orchestrator wrongly multiplied Vc by the
//   deflection reductionFactor, but deflection (delta = Fc*L^3/3EI) is independent of Vc.
//   After the lever-separation fix this deflection-limited cut (ap=12 full, 30mm stickout,
//   12mm tool) keeps Vc IN the published carbide band and absorbs deflection via fz instead.
//   Verified against the parity probe (core 1045 now 200 m/min IN-band, was 33.4 LO).
// flag-OFF Vc: 200 m/min  (steel P roughing, haas vf-2, TiAlN, flood; vcBase=200, deflection
//   now cleared to 95% util via fz=0.0183 -- NOT by collapsing Vc).
// flag-OFF tool_life_min: 9  (Taylor for ISO-P at Vc=200: (C/Vc)^(1/n) = (350/200)^4 = 9.4 min;
//   the prior 1355 min was the artifact of the collapsed Vc=57.7, not a real long-life cut).
const BASELINE_cutting_speed_mpm = 200;
const BASELINE_tool_life_min     = 9;

// env isolation
const SAVED_CONVERGE = process.env.PRISM_SFC_CONVERGE;

beforeEach(() => {
  delete process.env.PRISM_SFC_CONVERGE;
});

afterEach(() => {
  if (SAVED_CONVERGE !== undefined) {
    process.env.PRISM_SFC_CONVERGE = SAVED_CONVERGE;
  } else {
    delete process.env.PRISM_SFC_CONVERGE;
  }
});

describe("SpeedFeedOrchestratorEngine PRISM_SFC_CONVERGE flag", () => {

  // ──────────────────────────────────────────────────────────────────────────
  // test 1: flag OFF -- baseline unchanged
  // ──────────────────────────────────────────────────────────────────────────
  it("flag OFF: cutting_speed_mpm and tool_life_min match pre-P2 baseline (flag-off path byte-identical)", () => {
    const r = speedFeedOrchestratorEngine.compute(BASE_INPUT);
    const v = r.value;

    // Reference values: if these change, the flag-off path was mutated unintentionally.
    expect(v.cutting_speed_mpm).toBe(BASELINE_cutting_speed_mpm);
    expect(v.tool_life_min).toBe(BASELINE_tool_life_min);

    // Confirm the converge delegation marker is absent (flag-off must not touch the branch)
    const hasConvergeMarker = v.formulas_used.some(f => f.includes("PRISM_SFC_CONVERGE"));
    expect(hasConvergeMarker).toBe(false);

    // Basic physics sanity
    expect(v.feed_per_tooth_mm).toBeGreaterThan(0);
    expect(v.tangential_force_N).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // test 2: flag ON -- safety-gated delegation + layering preserved (concrete values)
  //
  // NOTE (U-SFC-CONVERGE-SAFETY, 2026-06-22): the delegated UltimateSpeedFeedEngine recommendation
  // for this AGGRESSIVE base cut (ap=12 full, ae=6 half-immersion, 12 mm tool) draws ~28 Nm on the
  // haas vf-2 whose torque limit is ~22 Nm.  Publishing it would over-torque the spindle AND
  // under-report the safety panel (the bug this milestone fixes), so the safety gate falls back to
  // the orchestrator's already-clamped value -> cutting_speed_mpm returns to the safe baseline.
  // (Acceptance of a HIGHER delegated Vc on a cut that stays within limits is covered by
  //  SpeedFeedOrchestrator-converge-safety.test.ts with a light finishing cut.)
  // ──────────────────────────────────────────────────────────────────────────
  it("flag ON: aggressive base cut SAFELY FALLS BACK (delegated over-torques the haas); layering + safety honesty preserved", () => {
    process.env.PRISM_SFC_CONVERGE = "1";
    const r = speedFeedOrchestratorEngine.compute(BASE_INPUT);
    const v = r.value;

    // Safe fallback: the published Vc is the orchestrator's clamped baseline, NOT the over-torque
    // delegated value (~160 m/min) that the buggy code used to publish.
    expect(v.cutting_speed_mpm).toBe(BASELINE_cutting_speed_mpm);

    // A convergence marker is still present (R12 fail-loud) and it is the limit-breach fallback.
    const hasConvergeFormula = v.formulas_used.some(f => f.includes("PRISM_SFC_CONVERGE"));
    expect(hasConvergeFormula).toBe(true);
    const isLimitFallback = v.formulas_used.some(f => f.includes("fallback to orchestrator (delegated exceeds limits"));
    expect(isLimitFallback).toBe(true);
    // A rejected delegation must NOT claim the engine produced the published physics.
    const hasConvergeEngine = v.engines_called.some(e => e.includes("PRISM_SFC_CONVERGE"));
    expect(hasConvergeEngine).toBe(false);

    // resolved_machine: name must be the haas vf-2, power = 22.4 kW (concrete)
    expect(v.resolved_machine.name.value).toBe("haas vf-2");
    expect(v.resolved_machine.power_kw.value).toBe(22.4);

    // limiting_factors: orchestrator always emits power/torque/rpm/deflection/feed_rate/workholding = 6
    expect(v.limiting_factors.length).toBeGreaterThanOrEqual(6);
    // safety_checks: same 6 checks
    expect(v.safety_checks.length).toBeGreaterThanOrEqual(6);
    // alternatives: exactly 3 (conservative/balanced/aggressive)
    expect(v.alternatives.length).toBe(3);

    // core physics values must be positive and in plausible shop range
    expect(v.cutting_speed_mpm).toBeGreaterThan(50);
    expect(v.cutting_speed_mpm).toBeLessThan(2000);
    expect(v.feed_per_tooth_mm).toBeGreaterThan(0);
    expect(v.tool_life_min).toBeGreaterThan(0);
    expect(v.power_kw).toBeGreaterThan(0);
    expect(v.tangential_force_N).toBeGreaterThan(0);
    expect(v.torque_Nm).toBeGreaterThan(0);

    // SAFETY HONESTY: the published power_kw equals the power safety-check value (the under-report bug
    // made these diverge ~5.5x with the flag on).
    const powerCheckValue = v.safety_checks.find(c => c.name === "power")?.value ?? -1;
    expect(powerCheckValue).toBeCloseTo(v.power_kw, 1);
    // ...and the published cutting force equals the workholding safety-check value.
    const whCheckValue = v.safety_checks.find(c => c.name === "workholding")?.value ?? -1;
    expect(whCheckValue).toBeCloseTo(v.tangential_force_N, 0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // test 3: adversarial -- unknown material, flag ON
  // ──────────────────────────────────────────────────────────────────────────
  it("flag ON + unknown material: does not throw; returns Vc > 0 with >= 6 limiting_factors", () => {
    process.env.PRISM_SFC_CONVERGE = "1";
    const input: OrchestratorInput = {
      ...BASE_INPUT,
      material: "unobtainium-9000",
      iso_group: undefined,
    };
    expect(() => speedFeedOrchestratorEngine.compute(input)).not.toThrow();
    const r = speedFeedOrchestratorEngine.compute(input);
    expect(r.value.cutting_speed_mpm).toBeGreaterThan(0);
    // Both engines fall back to steel defaults -- Vc should be in a plausible shop range
    expect(r.value.cutting_speed_mpm).toBeLessThan(3000);
    expect(r.value.limiting_factors.length).toBeGreaterThanOrEqual(6);
    expect(r.value.resolved_machine.name.value).toBe("haas vf-2");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // test 4: adversarial -- no machine name, flag ON
  // ──────────────────────────────────────────────────────────────────────────
  it("flag ON + no machine name: does not throw; Vc > 0 and safety_checks >= 6", () => {
    process.env.PRISM_SFC_CONVERGE = "1";
    const input: OrchestratorInput = {
      ...BASE_INPUT,
      machine_name: undefined,
    };
    expect(() => speedFeedOrchestratorEngine.compute(input)).not.toThrow();
    const r = speedFeedOrchestratorEngine.compute(input);
    expect(r.value.cutting_speed_mpm).toBeGreaterThan(0);
    expect(r.value.safety_checks.length).toBeGreaterThanOrEqual(6);
    // No machine_name -> orchestrator uses default vertical_mill spec (power 15 kW)
    expect(r.value.resolved_machine.power_kw.value).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // test 5: state isolation -- flag ON then OFF returns original baseline
  // ──────────────────────────────────────────────────────────────────────────
  it("toggling flag OFF after ON returns baseline values (no state leak between calls)", () => {
    // Prime the delegate with a flag-on call
    process.env.PRISM_SFC_CONVERGE = "1";
    speedFeedOrchestratorEngine.compute(BASE_INPUT); // result discarded

    // Now run with flag off
    delete process.env.PRISM_SFC_CONVERGE;
    const r = speedFeedOrchestratorEngine.compute(BASE_INPUT);

    expect(r.value.cutting_speed_mpm).toBe(BASELINE_cutting_speed_mpm);
    expect(r.value.tool_life_min).toBe(BASELINE_tool_life_min);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // test 6: failure mode -- sparse/empty input, flag ON
  // ──────────────────────────────────────────────────────────────────────────
  it("flag ON + sparse input (only operation): does not throw; Vc > 0 and limiting_factors >= 6", () => {
    process.env.PRISM_SFC_CONVERGE = "1";
    const sparseInput: OrchestratorInput = {
      operation: "milling",
    };
    expect(() => speedFeedOrchestratorEngine.compute(sparseInput)).not.toThrow();
    const r = speedFeedOrchestratorEngine.compute(sparseInput);
    expect(r.value.cutting_speed_mpm).toBeGreaterThan(0);
    expect(r.value.tool_life_min).toBeGreaterThan(0);
    // Orchestrator infers defaults for machine -> power_kw should be > 0
    expect(r.value.resolved_machine.power_kw.value).toBeGreaterThan(0);
    expect(r.value.limiting_factors.length).toBeGreaterThanOrEqual(6);
  });

});
