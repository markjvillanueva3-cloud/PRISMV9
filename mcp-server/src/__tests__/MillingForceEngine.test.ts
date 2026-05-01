/**
 * MillingForceEngine tests — covers Kienzle force, cantilever deflection,
 * stability lobes, spindle-power verification.
 *
 * @milestone STUB-FIX-MS0 U-STUB01
 */
import { describe, it, expect } from "vitest";
import {
  MillingForceEngine,
  millingForceEngine,
  type ToolGeometry,
  type CuttingParams,
} from "../engines/MillingForceEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const STEEL_FACE_MILL: ToolGeometry = {
  diameter_mm: 16,
  flutes: 4,
  flute_length_mm: 35,
  overall_length_mm: 80,
  substrate: "carbide",
};

const ALUMINUM_END_MILL: ToolGeometry = {
  diameter_mm: 12,
  flutes: 3,
  flute_length_mm: 30,
  overall_length_mm: 75,
  substrate: "carbide",
};

const ROUGH_PARAMS: CuttingParams = {
  rpm: 3000,
  feed_per_tooth: 0.1,
  doc_mm: 5,
  woc_mm: 8,
};

const FINISH_PARAMS: CuttingParams = {
  rpm: 6000,
  feed_per_tooth: 0.05,
  doc_mm: 0.5,
  woc_mm: 1.5,
};

// Constants the engine uses internally — recomputed here so the test
// independently asserts real numerical equivalence.
const E_CARBIDE_GPA = 600;
const E_HSS_GPA = 210;
const GPA_TO_N_PER_MM2 = 1000;
const E_CARBIDE_N_MM2 = E_CARBIDE_GPA * GPA_TO_N_PER_MM2;
const E_HSS_N_MM2 = E_HSS_GPA * GPA_TO_N_PER_MM2;
const SHAFT_I_DIVISOR = 64;
const DEFAULT_DEFLECTION_TOLERANCE_MM = 0.05;
const DEFAULT_POWER_SAFETY_FACTOR = 1.25;
const STABILITY_LOBE_COUNT = 6;
const W_PER_KW = 1000;
const SEC_PER_MIN = 60;
const VC_DIVISOR = 1000;
const TORQUE_RADIUS_MM_TO_M = 1000;

// ── calculate() ───────────────────────────────────────────────────────────────

describe("MillingForceEngine.calculate", () => {
  it("computes Kienzle force for steel matching Fc = kc1.1 · ap · fz^(1-mc)", () => {
    const r = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    const k = CANONICAL_KIENZLE.P;
    const expectedPerTooth =
      k.kc1_1 * ROUGH_PARAMS.doc_mm! * Math.pow(ROUGH_PARAMS.feed_per_tooth!, 1 - k.mc);
    expect(r.fz_per_tooth_force_n).toBeCloseTo(expectedPerTooth, 5);
    expect(r.kc1_1_n_per_mm2).toBe(k.kc1_1);
    expect(r.mc).toBe(k.mc);
  });

  it("scales total force by engaged teeth (woc/d ratio rounded up)", () => {
    const r = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    const expectedTeeth = Math.max(1, Math.ceil(0.5 * STEEL_FACE_MILL.flutes));
    expect(r.engaged_teeth).toBe(expectedTeeth);
    expect(r.cutting_force_n).toBeCloseTo(r.fz_per_tooth_force_n * expectedTeeth, 5);
  });

  it("uses iso_group N for aluminum and matches CANONICAL_KIENZLE.N", () => {
    const r = millingForceEngine.calculate({
      material: "AL 6061 aluminum",
      tool: ALUMINUM_END_MILL,
      parameters: FINISH_PARAMS,
    });
    expect(r.iso_group).toBe("N");
    expect(r.kc1_1_n_per_mm2).toBe(CANONICAL_KIENZLE.N.kc1_1);
    expect(r.mc).toBe(CANONICAL_KIENZLE.N.mc);
  });

  it("respects explicit kc1.1 and mc overrides", () => {
    const overrideKc = 2500;
    const overrideMc = 0.30;
    const ap = 2;
    const fz = 0.1;
    const r = millingForceEngine.calculate({
      iso_group: "P",
      kc1_1: overrideKc,
      mc: overrideMc,
      tool: STEEL_FACE_MILL,
      parameters: { feed_per_tooth: fz, doc_mm: ap, woc_mm: 8 },
    });
    expect(r.kc1_1_n_per_mm2).toBe(overrideKc);
    expect(r.mc).toBe(overrideMc);
    const expected = overrideKc * ap * Math.pow(fz, 1 - overrideMc);
    expect(r.fz_per_tooth_force_n).toBeCloseTo(expected, 5);
  });

  it("derives feed_per_tooth from feed_mmpm + rpm + flutes", () => {
    const feedMmpm = 1200;
    const rpm = 3000;
    const r = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: { rpm, feed_mmpm: feedMmpm, doc_mm: 2, woc_mm: 4 },
    });
    const expectedFz = feedMmpm / (rpm * STEEL_FACE_MILL.flutes);
    expect(r.fz_mm).toBeCloseTo(expectedFz, 6);
  });

  it("throws when iso group cannot be resolved", () => {
    expect(() =>
      millingForceEngine.calculate({
        material: "unobtainium-9000",
        tool: STEEL_FACE_MILL,
        parameters: ROUGH_PARAMS,
      })
    ).toThrow(/cannot resolve ISO group/);
  });

  it("throws when neither feed_per_tooth nor (feed_mmpm + rpm) supplied", () => {
    expect(() =>
      millingForceEngine.calculate({
        iso_group: "P",
        tool: STEEL_FACE_MILL,
        parameters: { doc_mm: 2, woc_mm: 4 },
      })
    ).toThrow(/feed_per_tooth/);
  });

  it("throws when tool is missing", () => {
    expect(() =>
      millingForceEngine.calculate({ iso_group: "P", parameters: ROUGH_PARAMS })
    ).toThrow(/tool required/);
  });

  it("throws when parameters are missing", () => {
    expect(() =>
      millingForceEngine.calculate({ iso_group: "P", tool: STEEL_FACE_MILL })
    ).toThrow(/parameters required/);
  });

  it("uses radial_engagement when woc_mm not provided", () => {
    const r = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: { feed_per_tooth: 0.1, doc_mm: 2, radial_engagement: 0.25 },
    });
    expect(r.engaged_teeth).toBe(Math.ceil(0.25 * STEEL_FACE_MILL.flutes));
  });

  it("clamps engaged teeth to >= 1 with very small radial engagement", () => {
    const r = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: { feed_per_tooth: 0.1, doc_mm: 2, radial_engagement: 0.001 },
    });
    expect(r.engaged_teeth).toBe(1);
  });

  it("emits a formula trace and canonical source", () => {
    const r = millingForceEngine.calculate({
      iso_group: "K",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    expect(r.formula).toBe("Fc = kc1.1 · ap · fz^(1-mc) · engaged_teeth");
    expect(r.source).toMatch(/Sandvik|ISO 3685/);
  });

  it("higher kc1.1 group yields higher cutting force at identical params", () => {
    const steel = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    const superalloy = millingForceEngine.calculate({
      iso_group: "S",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    expect(superalloy.cutting_force_n).toBeGreaterThan(steel.cutting_force_n);
    const ratio = superalloy.fz_per_tooth_force_n / steel.fz_per_tooth_force_n;
    const expectedRatio =
      (CANONICAL_KIENZLE.S.kc1_1 * Math.pow(ROUGH_PARAMS.feed_per_tooth!, 1 - CANONICAL_KIENZLE.S.mc)) /
      (CANONICAL_KIENZLE.P.kc1_1 * Math.pow(ROUGH_PARAMS.feed_per_tooth!, 1 - CANONICAL_KIENZLE.P.mc));
    expect(ratio).toBeCloseTo(expectedRatio, 4);
  });
});

// ── checkDeflection() ─────────────────────────────────────────────────────────

describe("MillingForceEngine.checkDeflection", () => {
  it("computes deflection by F·L³/(3EI) for solid carbide cantilever", () => {
    const force = 500;
    const overhang = 50;
    const d = STEEL_FACE_MILL.diameter_mm;
    const r = millingForceEngine.checkDeflection({
      tool: STEEL_FACE_MILL,
      overhang_mm: overhang,
      cutting_force_n: force,
      tolerance_mm: 0.1,
    });
    const I = (Math.PI * d ** 4) / SHAFT_I_DIVISOR;
    const expected = (force * overhang ** 3) / (3 * E_CARBIDE_N_MM2 * I);
    expect(r.deflection_mm).toBeCloseTo(expected, 6);
    expect(r.E_n_per_mm2).toBe(E_CARBIDE_N_MM2);
    expect(r.I_mm4).toBeCloseTo(I, 6);
  });

  it("flags deflection > tolerance as fail", () => {
    const tol = 0.05;
    const r = millingForceEngine.checkDeflection({
      tool: { diameter_mm: 6, flutes: 2, substrate: "carbide" },
      overhang_mm: 80,
      cutting_force_n: 800,
      tolerance_mm: tol,
    });
    expect(r.deflection_mm).toBeGreaterThan(tol);
    expect(r.pass).toBe(false);
  });

  it("flags deflection <= tolerance as pass", () => {
    const tol = 0.1;
    const r = millingForceEngine.checkDeflection({
      tool: STEEL_FACE_MILL,
      overhang_mm: 25,
      cutting_force_n: 100,
      tolerance_mm: tol,
    });
    expect(r.pass).toBe(true);
    expect(r.deflection_mm).toBeLessThanOrEqual(tol);
  });

  it("HSS substrate has lower E than carbide -> larger deflection at same load", () => {
    const carbide = millingForceEngine.checkDeflection({
      tool: { diameter_mm: 12, flutes: 4, substrate: "carbide" },
      overhang_mm: 40,
      cutting_force_n: 300,
    });
    const hss = millingForceEngine.checkDeflection({
      tool: { diameter_mm: 12, flutes: 4, substrate: "hss" },
      overhang_mm: 40,
      cutting_force_n: 300,
    });
    expect(carbide.E_n_per_mm2).toBe(E_CARBIDE_N_MM2);
    expect(hss.E_n_per_mm2).toBe(E_HSS_N_MM2);
    expect(hss.deflection_mm / carbide.deflection_mm).toBeCloseTo(E_CARBIDE_N_MM2 / E_HSS_N_MM2, 2);
  });

  it("chains via force_input when cutting_force_n omitted", () => {
    const directForce = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    }).cutting_force_n;
    const r = millingForceEngine.checkDeflection({
      tool: STEEL_FACE_MILL,
      overhang_mm: 40,
      tolerance_mm: 0.5,
      force_input: {
        iso_group: "P",
        tool: STEEL_FACE_MILL,
        parameters: ROUGH_PARAMS,
      },
    });
    expect(r.cutting_force_n).toBeCloseTo(directForce, 5);
  });

  it("uses default tolerance when caller omits one", () => {
    const r = millingForceEngine.checkDeflection({
      tool: STEEL_FACE_MILL,
      overhang_mm: 30,
      cutting_force_n: 200,
    });
    expect(r.tolerance_mm).toBe(DEFAULT_DEFLECTION_TOLERANCE_MM);
  });

  it("throws when overhang_mm <= 0", () => {
    expect(() =>
      millingForceEngine.checkDeflection({
        tool: STEEL_FACE_MILL,
        overhang_mm: 0,
        cutting_force_n: 100,
      })
    ).toThrow(/overhang_mm/);
  });

  it("throws when neither cutting_force_n nor force_input is supplied", () => {
    expect(() =>
      millingForceEngine.checkDeflection({
        tool: STEEL_FACE_MILL,
        overhang_mm: 30,
      })
    ).toThrow(/cutting_force_n|force_input/);
  });

  it("emits cantilever formula trace", () => {
    const r = millingForceEngine.checkDeflection({
      tool: STEEL_FACE_MILL,
      overhang_mm: 25,
      cutting_force_n: 100,
    });
    expect(r.formula).toContain("F · L³");
    expect(r.formula).toContain("π · d⁴ / 64");
  });

  it("doubling overhang increases deflection 8x (cubic in L)", () => {
    const a = millingForceEngine.checkDeflection({
      tool: STEEL_FACE_MILL,
      overhang_mm: 25,
      cutting_force_n: 100,
    });
    const b = millingForceEngine.checkDeflection({
      tool: STEEL_FACE_MILL,
      overhang_mm: 50,
      cutting_force_n: 100,
    });
    expect(b.deflection_mm / a.deflection_mm).toBeCloseTo(8, 2);
  });
});

// ── predictChatter() ──────────────────────────────────────────────────────────

describe("MillingForceEngine.predictChatter", () => {
  it("emits N stability lobes with rpm_optimal at 60·fn/((k+1)·Z)", () => {
    const fn = 1000;
    const r = millingForceEngine.predictChatter({
      tool: STEEL_FACE_MILL,
      natural_frequency_hz: fn,
    });
    expect(r.stability_lobes).toHaveLength(STABILITY_LOBE_COUNT);
    for (let k = 0; k < STABILITY_LOBE_COUNT; k++) {
      const expected = (SEC_PER_MIN * fn) / ((k + 1) * STEEL_FACE_MILL.flutes);
      expect(r.stability_lobes[k].rpm_optimal).toBeCloseTo(expected, 2);
    }
  });

  it("rpm_min and rpm_max bracket optimal by ±damping ratio", () => {
    const r = millingForceEngine.predictChatter({
      tool: STEEL_FACE_MILL,
      natural_frequency_hz: 1000,
    });
    const lobe = r.stability_lobes[0];
    expect(lobe.rpm_min).toBeLessThan(lobe.rpm_optimal);
    expect(lobe.rpm_max).toBeGreaterThan(lobe.rpm_optimal);
    expect(lobe.rpm_max / lobe.rpm_optimal).toBeCloseTo(1 + r.damping_ratio, 4);
    expect(lobe.rpm_min / lobe.rpm_optimal).toBeCloseTo(1 - r.damping_ratio, 4);
  });

  it("derives natural frequency from overhang_mm when not supplied", () => {
    const r = millingForceEngine.predictChatter({
      tool: STEEL_FACE_MILL,
      overhang_mm: 50,
    });
    expect(r.natural_frequency_hz).toBeGreaterThan(500);
    expect(r.natural_frequency_hz).toBeLessThan(20_000);
  });

  it("flags in_band=true when rpm_range overlaps a stable lobe", () => {
    const fn = 1000;
    const Z = STEEL_FACE_MILL.flutes;
    const k0Optimal = (SEC_PER_MIN * fn) / ((0 + 1) * Z);
    const r = millingForceEngine.predictChatter({
      tool: STEEL_FACE_MILL,
      natural_frequency_hz: fn,
      rpm_range: [k0Optimal - 200, k0Optimal + 200],
    });
    expect(r.in_band).toBe(true);
    expect(typeof r.warning).toBe("undefined");
  });

  it("flags in_band=false and emits warning when rpm_range misses every lobe", () => {
    const r = millingForceEngine.predictChatter({
      tool: STEEL_FACE_MILL,
      natural_frequency_hz: 1000,
      rpm_range: [3000, 3200],
    });
    expect(r.in_band).toBe(false);
    expect(r.warning).toMatch(/chatter/i);
  });

  it("longer overhang lowers natural frequency (cantilever stiffness ∝ 1/L²)", () => {
    const short = millingForceEngine.predictChatter({
      tool: STEEL_FACE_MILL,
      overhang_mm: 30,
    });
    const long = millingForceEngine.predictChatter({
      tool: STEEL_FACE_MILL,
      overhang_mm: 60,
    });
    expect(long.natural_frequency_hz).toBeLessThan(short.natural_frequency_hz);
    expect(long.natural_frequency_hz / short.natural_frequency_hz).toBeCloseTo(0.25, 1);
  });

  it("throws when tool.flutes < 1", () => {
    expect(() =>
      millingForceEngine.predictChatter({
        tool: { diameter_mm: 10, flutes: 0, substrate: "carbide" },
        natural_frequency_hz: 1000,
      })
    ).toThrow(/flutes/);
  });

  it("throws when neither natural_frequency_hz nor overhang available", () => {
    expect(() =>
      millingForceEngine.predictChatter({
        tool: { diameter_mm: 10, flutes: 4, substrate: "carbide" },
      })
    ).toThrow(/natural_frequency_hz|overhang_mm/);
  });
});

// ── verifyPower() ─────────────────────────────────────────────────────────────

describe("MillingForceEngine.verifyPower", () => {
  it("computes Vc = π·d·rpm/1000 and P = Fc·Vc/60 in kW", () => {
    const r = millingForceEngine.verifyPower({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    const expectedVc = (Math.PI * STEEL_FACE_MILL.diameter_mm * ROUGH_PARAMS.rpm!) / VC_DIVISOR;
    expect(r.cutting_speed_m_per_min).toBeCloseTo(expectedVc, 4);
    const expectedPowerKw = (r.cutting_force_n * expectedVc) / SEC_PER_MIN / W_PER_KW;
    expect(r.cutting_power_kw).toBeCloseTo(expectedPowerKw, 4);
  });

  it("required_power_kw = cutting_power_kw · safety_factor (default)", () => {
    const r = millingForceEngine.verifyPower({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    expect(r.safety_factor).toBe(DEFAULT_POWER_SAFETY_FACTOR);
    expect(r.required_power_kw).toBeCloseTo(r.cutting_power_kw * DEFAULT_POWER_SAFETY_FACTOR, 5);
  });

  it("respects explicit safety_factor override", () => {
    const sf = 1.5;
    const r = millingForceEngine.verifyPower({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
      safety_factor: sf,
    });
    expect(r.safety_factor).toBe(sf);
    expect(r.required_power_kw).toBeCloseTo(r.cutting_power_kw * sf, 5);
  });

  it("pass=true and machine_max_power_kw=null when no machine config", () => {
    const r = millingForceEngine.verifyPower({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    expect(r.machine_max_power_kw).toBeNull();
    expect(r.pass).toBe(true);
    expect(r.margin_pct).toBeNull();
  });

  it("pass=true and margin_pct positive when machine has headroom", () => {
    const maxKw = 50;
    const r = millingForceEngine.verifyPower({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
      machine: { max_power_kw: maxKw },
    });
    expect(r.pass).toBe(true);
    const expectedMargin = ((maxKw - r.required_power_kw) / maxKw) * 100;
    expect(r.margin_pct!).toBeCloseTo(expectedMargin, 4);
    expect(r.margin_pct!).toBeGreaterThan(0);
  });

  it("pass=false when required_power_kw exceeds machine.max_power_kw", () => {
    const r = millingForceEngine.verifyPower({
      iso_group: "S",
      tool: STEEL_FACE_MILL,
      parameters: { rpm: 6000, feed_per_tooth: 0.15, doc_mm: 8, woc_mm: 16 },
      machine: { max_power_kw: 1.0 },
    });
    expect(r.pass).toBe(false);
    expect(r.margin_pct!).toBeLessThan(0);
  });

  it("torque computed as Fc · d/2 / 1000 (N·m, with d in mm)", () => {
    const r = millingForceEngine.verifyPower({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    const expectedTorque = (r.cutting_force_n * STEEL_FACE_MILL.diameter_mm) / 2 / TORQUE_RADIUS_MM_TO_M;
    expect(r.spindle_torque_nm).toBeCloseTo(expectedTorque, 5);
  });

  it("throws on rpm <= 0", () => {
    expect(() =>
      millingForceEngine.verifyPower({
        iso_group: "P",
        tool: STEEL_FACE_MILL,
        parameters: { ...ROUGH_PARAMS, rpm: 0 },
      })
    ).toThrow(/rpm/);
  });
});

// ── Engine class behaviour ────────────────────────────────────────────────────

describe("MillingForceEngine class", () => {
  it("freshly-instantiated engine produces same Fc as the singleton", () => {
    const eng = new MillingForceEngine();
    const fresh = eng.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    const singleton = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    expect(fresh.cutting_force_n).toBeCloseTo(singleton.cutting_force_n, 6);
    expect(fresh.engaged_teeth).toBe(singleton.engaged_teeth);
  });

  it("calculate() is pure — repeated calls return identical results", () => {
    const a = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    const b = millingForceEngine.calculate({
      iso_group: "P",
      tool: STEEL_FACE_MILL,
      parameters: ROUGH_PARAMS,
    });
    expect(a.cutting_force_n).toBe(b.cutting_force_n);
    expect(a.fz_per_tooth_force_n).toBe(b.fz_per_tooth_force_n);
    expect(a.engaged_teeth).toBe(b.engaged_teeth);
  });
});
