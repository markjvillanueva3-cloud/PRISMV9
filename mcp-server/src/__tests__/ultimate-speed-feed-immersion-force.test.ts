/**
 * UltimateSpeedFeedEngine: max chip thickness (hex) vs radial immersion -- force does NOT collapse
 * ==============================================================================================
 * Regression target (U-OSC-RADIAL-ENGAGEMENT, engine half). STEP 9 computed
 *   hex = fz * sin(acos(1 - 2*ae/Dc))
 * which is correct ONLY for ae < Dc/2 (radial chip-thinning: the chip peaks at the maximum
 * engagement angle phi_max = acos(1 - 2*ae/Dc) < 90deg). For ae >= Dc/2 the engagement arc spans
 * the centerline, so the peak chip thickness occurs AT phi = 90deg and equals fz -- it must NOT
 * fall off. The old inline form kept decreasing past ae/Dc = 0.5 (sin of an angle > 90deg),
 * collapsing hex -> ~0 at a full slot and thus Fc -> ~0 exactly where engagement (and the load on
 * the spindle + workholding) is GREATEST -- a silent under-report of the worst-case force.
 *
 * The fix clamps the engagement at the centerline: hex = fz for ae >= Dc/2, unchanged below.
 *
 * Pins (fz is ae-independent here -- material/tool/operation/optimize_for fixed -- so chip_thickness
 * isolates the immersion term):
 *  - PLATEAU      hex is flat (= fz) across 50% / 75% / 100% immersion (was decaying to 0).
 *  - NO COLLAPSE  hex and Fc at a FULL SLOT strictly exceed a light 10% cut (pre-fix: ~0 << light).
 *  - HALF == fz   at ae = Dc/2 the max chip thickness equals fz (continuity + physical anchor).
 *  - UNCHANGED    below Dc/2 the value still equals fz*sin(acos(1-2*ae/Dc)) (the branch is untouched).
 *  - SAFE DIR     Fc is monotone non-decreasing in ae and never NaN/zero for a positive cut.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const D = 12; // mm

function calc(aeMm: number) {
  return ultimateSpeedFeedEngine.calculate({
    material: "AISI 1045",
    iso_group: "P",
    tool_diameter_mm: D,
    flutes: 4,
    tool_material: "carbide",
    operation: "milling",
    cut_type: "roughing",
    axial_depth_mm: 5,
    radial_depth_mm: aeMm,
    optimize_for: "balanced",
  });
}

const hex = (r: ReturnType<typeof calc>) => r.chip_thickness_max.value;
const fc = (r: ReturnType<typeof calc>) => r.forces.tangential_force_N.value;

// Memoise (calculate() is ~2.5s/call): sweep 0.8% -> full slot once.
let aeTiny: ReturnType<typeof calc>; // 0.1mm  (~0.8%)
let ae10: ReturnType<typeof calc>; // 1.2mm  (10%)
let ae25: ReturnType<typeof calc>; // 3.0mm  (25%)
let ae50: ReturnType<typeof calc>; // 6.0mm  (50% = Dc/2)
let ae75: ReturnType<typeof calc>; // 9.0mm  (75%)
let ae100: ReturnType<typeof calc>; // 12.0mm (100% = full slot)

beforeAll(() => {
  aeTiny = calc(0.1);
  ae10 = calc(1.2);
  ae25 = calc(3.0);
  ae50 = calc(6.0);
  ae75 = calc(9.0);
  ae100 = calc(12.0);
}, 120_000);

describe("UltimateSpeedFeedEngine hex vs immersion (U-OSC-RADIAL-ENGAGEMENT engine half)", () => {
  it("HALF == fz: at ae = Dc/2 the max chip thickness equals the feed per tooth", () => {
    // At exactly half immersion CTF = 1 (no thinning), so feed_per_tooth is the raw fz, and hex = fz.
    expect(hex(ae50)).toBeCloseTo(ae50.feed_per_tooth.value, 2);
  });

  it("PLATEAU: hex is flat (= fz) across 50% / 75% / 100% immersion -- it does NOT decay toward a full slot", () => {
    const fz = hex(ae50);
    expect(hex(ae75)).toBeCloseTo(fz, 3);
    expect(hex(ae100)).toBeCloseTo(fz, 3);
    // The pre-fix bug drove hex(100%) -> ~0; assert it is firmly at fz, not collapsed.
    expect(hex(ae100)).toBeGreaterThan(fz * 0.98);
  });

  it("NO COLLAPSE: hex and Fc at a FULL SLOT strictly exceed a light 10% cut", () => {
    // Pre-fix: hex(full)~0 << hex(10%); Fc(full)~0 << Fc(10%). Post-fix the worst-case load is honored.
    expect(hex(ae100)).toBeGreaterThan(hex(ae10));
    expect(fc(ae100)).toBeGreaterThan(fc(ae10));
  });

  it("UNCHANGED below Dc/2: hex(25%) still equals fz*sin(acos(1 - 2*ae/Dc)) (branch untouched)", () => {
    // fz reference = hex at half immersion (= raw fz). The 25% value must match the chip-thinning form
    // fz*sin(acos(0.5)) = fz*sin(60deg) -- proving the ae<Dc/2 physics was preserved by the fix.
    const fz = hex(ae50);
    const expected25 = fz * Math.sin(Math.acos(1 - 2 * 0.25));
    expect(hex(ae25)).toBeCloseTo(expected25, 3);
  });

  it("MONOTONE + SAFE: hex and Fc are non-decreasing in ae and stay finite/positive (no NaN, no zero)", () => {
    for (const r of [aeTiny, ae10, ae25, ae50, ae75, ae100]) {
      expect(Number.isFinite(hex(r))).toBe(true);
      expect(hex(r)).toBeGreaterThan(0);
      expect(Number.isFinite(fc(r))).toBe(true);
      expect(fc(r)).toBeGreaterThan(0);
    }
    // Below the centerline hex rises with ae (chip thinning relaxes); at/above it plateaus.
    expect(hex(ae10)).toBeGreaterThan(hex(aeTiny));
    expect(hex(ae25)).toBeGreaterThan(hex(ae10));
    expect(hex(ae50)).toBeGreaterThan(hex(ae25));
    expect(hex(ae75)).toBeGreaterThanOrEqual(hex(ae50) - 1e-6);
    expect(hex(ae100)).toBeGreaterThanOrEqual(hex(ae75) - 1e-6);
    // Fc tracks hex (Kienzle Fc = kc1.1*ap*hex^(1-mc), mc<1): non-decreasing through the sweep.
    expect(fc(ae25)).toBeGreaterThan(fc(ae10));
    expect(fc(ae50)).toBeGreaterThan(fc(ae25));
    expect(fc(ae100)).toBeGreaterThanOrEqual(fc(ae50) - 1);
  });
});

/**
 * U-OSC-NEG-RADIAL-GUARD: a non-physical radial input (negative / NaN) must NOT poison the force
 * chain. Pre-fix the engine used a bare `if (input.radial_depth_mm)` -> a NEGATIVE value is truthy
 * -> ae_mm < 0 -> hex acos(1-2*ae/Dc) arg > 1 -> NaN Fc; a consumer's Number.isFinite force guard
 * then silently skips its safety clamp. The guard treats NaN / <= 0 as "not provided" and falls back
 * to the strategy/table default (matching the orchestrator's > 0 gate). Asserted on the robust
 * observables (finite positive forces + a positive fallback ae), independent of the warnings field.
 */
describe("UltimateSpeedFeedEngine negative/NaN radial guard (U-OSC-NEG-RADIAL-GUARD)", () => {
  function calcRadial(radial: { mm?: number; pct?: number }) {
    return ultimateSpeedFeedEngine.calculate({
      material: "AISI 1045", iso_group: "P",
      tool_diameter_mm: D, flutes: 4, tool_material: "carbide",
      operation: "milling", cut_type: "roughing", axial_depth_mm: 5,
      optimize_for: "balanced",
      ...(radial.mm !== undefined ? { radial_depth_mm: radial.mm } : {}),
      ...(radial.pct !== undefined ? { radial_depth_pct: radial.pct } : {}),
    });
  }

  it("negative radial_depth_mm -> finite positive forces + positive fallback ae (NOT the negative input)", () => {
    const r = calcRadial({ mm: -5 });
    expect(Number.isFinite(r.forces.tangential_force_N.value)).toBe(true);
    expect(r.forces.tangential_force_N.value).toBeGreaterThan(0);
    expect(Number.isFinite(r.chip_thickness_max.value)).toBe(true);
    expect(r.chip_thickness_max.value).toBeGreaterThan(0);
    expect(r.radial_depth.value).toBeGreaterThan(0); // fell back to the table default, not -5
  });

  it("NaN radial_depth_mm -> finite positive forces + positive fallback ae", () => {
    const r = calcRadial({ mm: Number.NaN });
    expect(Number.isFinite(r.forces.tangential_force_N.value)).toBe(true);
    expect(r.forces.tangential_force_N.value).toBeGreaterThan(0);
    expect(r.radial_depth.value).toBeGreaterThan(0);
  });

  it("negative radial_depth_pct -> finite positive forces + positive fallback ae", () => {
    const r = calcRadial({ pct: -30 });
    expect(Number.isFinite(r.forces.tangential_force_N.value)).toBe(true);
    expect(r.forces.tangential_force_N.value).toBeGreaterThan(0);
    expect(r.radial_depth.value).toBeGreaterThan(0);
  });

  it("BACK-COMPAT: a valid positive radial_depth_mm is still honored exactly", () => {
    const r = calcRadial({ mm: 4.0 });
    expect(r.radial_depth.value).toBeCloseTo(4.0, 1); // honored, not overridden by the guard
    expect(Number.isFinite(r.forces.tangential_force_N.value)).toBe(true);
    expect(r.forces.tangential_force_N.value).toBeGreaterThan(0);
  });
});
