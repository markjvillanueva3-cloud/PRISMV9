/**
 * TappingTorqueEngine — REAL reference-value physics coverage (slot:oscar, SFC-COVERAGE)
 *
 * Prior coverage was a pure FORMAT stub (forge-engines-3.test.ts asserts only
 * `toHaveProperty("value")` / `toHaveProperty("unit")` — proves nothing per R9).
 * This suite hand-computes every expected value from the documented Kienzle-tapping
 * physics (Emuge Tapping Handbook / Sandvik Threading Guide / Altintas 2012) and
 * imports the CANONICAL_KIENZLE table — no inlined physics constant.
 *
 * Reference derivation (M10x1.5, cut spiral-point, through, 75% engagement, ISO P,
 * coolant on, 500 rpm, no machine-torque limit):
 *   kc1.1_tap = round(CANONICAL_KIENZLE.P.kc1_1 * 1.11) = round(1800*1.11) = 1998 N/mm^2
 *   mc        = CANONICAL_KIENZLE.P.mc = 0.25  (P is not S/H)
 *   D_minor   = 10 - 1.0825*1.5      = 8.37625 mm
 *   H_thread  = 0.5413*1.5           = 0.81195 mm
 *   H_engaged = 0.81195*0.75         = 0.6089625 mm
 *   D_pitch   = (10 + 8.37625)/2     = 9.188125 mm
 *   teeth     = floor(threadDepth/p) = floor(15/1.5) = 10 -> z_eff = min(10,6) = 6
 *   As/tooth  = (1.5/2)*0.6089625    = 0.456721875 mm^2
 *   h_tap     = p/flutes = 1.5/4     = 0.375 mm   (spiral-point => 4 flutes)
 *   kc        = 1998 * 0.375^(-0.25) = 2553.22 N/mm^2
 *   Md0       = kc*As*z_eff*D_pitch / (4*pi*1000) = 5.11574 Nm
 *   Md        = Md0 * 0.85 (wet)     = 4.34838 Nm   -> rounded 4.348 Nm
 *   Fa        = Md*2*pi*1000 / p     = 18214 N
 *   P         = Md*2*pi*500 / 60000  = 0.228 kW
 *   maxRPM    = 25*1000/(pi*10)      = 795.77 -> 796 rpm  (MAX_TAP_SPEED[P]=25 m/min)
 */
import { describe, it, expect } from "vitest";
import { CANONICAL_KIENZLE } from "../physics/constants.js";
import { TappingTorqueEngine, tappingTorqueEngine } from "../engines/TappingTorqueEngine.js";

const engine = new TappingTorqueEngine();
const TWO_PI = 2 * Math.PI;

describe("TappingTorqueEngine — reference-value physics", () => {
  // ── Happy path: M10x1.5 spiral-point cut tap, ISO P, wet, 500 rpm ──
  const base = {
    thread_major_diameter_mm: 10,
    pitch_mm: 1.5,
    tap_type: "cut_spiral_point" as const,
    hole_type: "through" as const,
    thread_engagement_pct: 75,
    workpiece_iso_group: "P" as const,
    spindle_rpm: 500,
    coolant_active: true,
  };

  it("canonical tap kc is derived from CANONICAL_KIENZLE, not inlined", () => {
    // Guards the constants-provenance contract this test depends on.
    expect(CANONICAL_KIENZLE.P.kc1_1).toBe(1800);
    expect(CANONICAL_KIENZLE.P.mc).toBe(0.25);
    expect(Math.round(CANONICAL_KIENZLE.P.kc1_1 * 1.11)).toBe(1998); // TAP_KC_MULTIPLIER.P
  });

  it("cutting torque = 4.348 Nm (hand-computed Kienzle-tapping chain)", () => {
    const r = engine.calculate(base);
    expect(r.cutting_torque_Nm.value).toBeCloseTo(4.348, 3);
    expect(r.cutting_torque_Nm.unit).toBe("Nm");
    expect(r.cutting_torque_Nm.source).toBe("kienzle_tapping");
  });

  it("axial thrust = 18214 N (lead mechanics Fa = Md*2pi*1000/p)", () => {
    const r = engine.calculate(base);
    expect(r.axial_thrust_N.value).toBe(18214);
    expect(r.axial_thrust_N.unit).toBe("N");
    // independent invariant from the reported torque
    const expectedFa = (r.cutting_torque_Nm.value * TWO_PI * 1000) / base.pitch_mm;
    expect(Math.abs(r.axial_thrust_N.value - expectedFa)).toBeLessThan(5);
  });

  it("tapping power = 0.228 kW (P = Md*2pi*n/60000)", () => {
    const r = engine.calculate(base);
    expect(r.tapping_power_kW.value).toBeCloseTo(0.228, 3);
    const expectedP = (r.cutting_torque_Nm.value * TWO_PI * base.spindle_rpm) / 60000;
    expect(Math.abs(r.tapping_power_kW.value - expectedP)).toBeLessThan(0.005);
  });

  it("no machine torque given => 100% margin, max safe rpm = 796, zero breakage, safe", () => {
    const r = engine.calculate(base);
    expect(r.torque_margin_pct.value).toBe(100);
    expect(r.torque_margin_pct.source).toBe("no_machine_data");
    expect(r.max_safe_rpm.value).toBe(796); // 25 m/min / (pi*10mm)
    expect(r.breakage_risk).toBe(0);
    expect(r.is_safe).toBe(true);
  });

  // ── Physics-invariant (ratio) checks — fail if a multiplier changes (R9) ──
  it("dry tapping torque / wet = 1.15/0.85 (COOLANT_TORQUE_FACTOR)", () => {
    const wet = engine.calculate(base).cutting_torque_Nm.value;
    const dry = engine.calculate({ ...base, coolant_active: false }).cutting_torque_Nm.value;
    expect(dry / wet).toBeCloseTo(1.15 / 0.85, 2); // 1.3529
    expect(dry).toBeGreaterThan(wet);
  });

  it("hardened workpiece (HRC 50) multiplies torque by 1.3", () => {
    const soft = engine.calculate(base).cutting_torque_Nm.value;
    const hard = engine.calculate({ ...base, workpiece_hardness_hrc: 50 }).cutting_torque_Nm.value;
    expect(hard / soft).toBeCloseTo(1.3, 2);
  });

  it("blind hole packs chips => higher torque than through hole", () => {
    const through = engine.calculate(base).cutting_torque_Nm.value;
    const blind = engine.calculate({ ...base, hole_type: "blind", tap_type: "cut_spiral_flute" })
      .cutting_torque_Nm.value;
    // blind adds BLIND_HOLE_K*(L/D) torque; L/D = 15/10 => +0.15*1.5 = +22.5%
    expect(blind).toBeGreaterThan(through * 0.9); // spiral-flute has fewer flutes, but blind factor dominates upward
    const blindSame = engine.calculate({ ...base, hole_type: "blind" }).cutting_torque_Nm.value;
    expect(blindSame / through).toBeCloseTo(1 + 0.15 * (15 / 10), 2); // 1.225
  });

  it("higher-kc material (ISO S) yields higher tapping torque than ISO P", () => {
    const p = engine.calculate(base).cutting_torque_Nm.value;
    const s = engine.calculate({ ...base, workpiece_iso_group: "S" }).cutting_torque_Nm.value;
    expect(CANONICAL_KIENZLE.S.kc1_1).toBeGreaterThan(CANONICAL_KIENZLE.P.kc1_1);
    expect(s).toBeGreaterThan(p);
  });

  // ── Failure modes ──
  it("FAILURE: low torque margin (machine limit near tap torque) => unsafe + SAFETY rec", () => {
    const r = engine.calculate({ ...base, spindle_max_torque_Nm: 5 });
    // margin = (5 - 4.34838)/5*100 = 13% -> <20 and !(>15) => unsafe
    expect(r.torque_margin_pct.value).toBe(13);
    expect(r.torque_margin_pct.source).toBe("machine_spec");
    expect(r.is_safe).toBe(false);
    expect(r.breakage_risk).toBeGreaterThanOrEqual(0.4);
    expect(r.recommendations.some(m => m.includes("SAFETY"))).toBe(true);
  });

  it("FAILURE: over-speed tapping => breakage bump + over-speed recommendation", () => {
    const r = engine.calculate({ ...base, spindle_rpm: 2000 }); // maxRPM ~796
    expect(r.breakage_risk).toBeGreaterThanOrEqual(0.3);
    expect(r.recommendations.some(m => m.includes("exceeds recommended max"))).toBe(true);
  });

  it("FAILURE: spiral-point (gun) tap in blind hole => chip-packing warning", () => {
    const r = engine.calculate({ ...base, hole_type: "blind" });
    expect(r.recommendations.some(m => m.includes("chips pushed forward"))).toBe(true);
  });

  // ── Adversarial inputs ──
  it("ADVERSARIAL: unknown ISO group (no kc override) throws (undefined tap-kc lookup)", () => {
    expect(() =>
      engine.calculate({ ...base, workpiece_iso_group: "Z" as unknown as "P" }),
    ).toThrow();
  });

  it("ADVERSARIAL: NaN diameter => torque NaN, rpm fallback 1000 (D>0 guard)", () => {
    const r = engine.calculate({ ...base, thread_major_diameter_mm: NaN });
    expect(Number.isNaN(r.cutting_torque_Nm.value)).toBe(true);
    expect(r.max_safe_rpm.value).toBe(1000); // D>0 is false for NaN => fallback branch
  });

  it("ADVERSARIAL: zero pitch => zero shear area torque, NaN thrust (Fa=.../p)", () => {
    const r = engine.calculate({ ...base, pitch_mm: 0 });
    expect(r.cutting_torque_Nm.value).toBe(0); // As_per_tooth = 0 => Md = 0
    expect(Number.isNaN(r.axial_thrust_N.value)).toBe(true); // divide-by-zero pitch
  });

  it("exports a shared singleton with identical behaviour", () => {
    const a = engine.calculate(base).cutting_torque_Nm.value;
    const b = tappingTorqueEngine.calculate(base).cutting_torque_Nm.value;
    expect(a).toBe(b);
  });
});
