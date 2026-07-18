import { describe, it, expect } from "vitest";
import {
  checkTurningRpm, checkTurningPower, checkTurningForce, checkTurningToolLife, blockedTurningIdentities,
  turningPerCellOracle, TURNING_SPINDLE_EFFICIENCY,
} from "./turning-sweep-oracle.ts";

/**
 * Reference-value + invariant tests for the TURNING silent-wrong oracle (clone-don't-fork of the
 * milling sfc-sweep-oracle). Every check must FAIL on a real defect (a test that can't fail is worthless).
 */

describe("checkTurningRpm -- n = 1000*Vc/(pi*D), clamp-aware", () => {
  it("consistent rpm (Vc=200 m/min, D=50mm -> 1273.24 rpm) passes", () => {
    const v = { recommendation: { cutting_speed_m_min: 200, rpm: 1273.24 } };
    expect(checkTurningRpm({ diameter_mm: 50 }, v)).toBeNull();
  });
  it("radius-vs-diameter error (rpm from D/2) flags turning_rpm_inconsistent", () => {
    const v = { recommendation: { cutting_speed_m_min: 200, rpm: 2546.48 } }; // used D=25 not 50
    expect(checkTurningRpm({ diameter_mm: 50 }, v)?.kind).toBe("turning_rpm_inconsistent");
  });
  it("G50/CSS cap: rpm clamped to machine_max_rpm with Vc/D-ideal beyond it is FORGIVEN", () => {
    // Vc=300, D=50 -> ideal 1909 rpm, capped to 1500. Legit clamp, not a bug.
    const v = { recommendation: { cutting_speed_m_min: 300, rpm: 1500 } };
    expect(checkTurningRpm({ diameter_mm: 50, machine_max_rpm: 1500 }, v)).toBeNull();
  });
  it("rpm below the Vc/D-ideal with NO cap match still flags (not a blanket forgive)", () => {
    const v = { recommendation: { cutting_speed_m_min: 200, rpm: 1000 } }; // ideal 1273, no cap at 1000
    expect(checkTurningRpm({ diameter_mm: 50, machine_max_rpm: 4000 }, v)?.kind).toBe("turning_rpm_inconsistent");
  });
  it("missing diameter -> not checkable (null, never throws)", () => {
    expect(checkTurningRpm({}, { recommendation: { cutting_speed_m_min: 200, rpm: 1273 } })).toBeNull();
  });
});

describe("checkTurningPower -- Pc = Fc*Vc/(60000*eta), eta=0.85 (the turning-specific term)", () => {
  const v = (P: number) => ({ predicted_force_N: 800, predicted_power_kw: P, recommendation: { cutting_speed_m_min: 200 } });
  it("consistent power with the eta divisor (3.137 kW) passes", () => {
    // 800*200/(60000*0.85) = 3.1373
    expect(checkTurningPower({}, v(3.1373))).toBeNull();
  });
  it("OMITTING the eta divisor (raw Fc*Vc/60000 = 2.667) FLAGS -- proves eta is load-bearing", () => {
    const r = checkTurningPower({}, v(2.6667));
    expect(r?.kind).toBe("turning_power_inconsistent");
    expect(r?.note).toMatch(/eta=0.85/);
  });
  it("2x-inflated power flags", () => {
    expect(checkTurningPower({}, v(6.27))?.kind).toBe("turning_power_inconsistent");
  });
  it("eta constant is 0.85", () => { expect(TURNING_SPINDLE_EFFICIENCY).toBe(0.85); });
});

describe("checkTurningForce -- Fc = kc1_1*ap*f^(1-mc) (IPR feed, single-point)", () => {
  const mp = { kc1_1: 2100, mc: 0.25 }; // ISO M
  const rec = { depth_of_cut_mm: 2, feed_mm_rev: 0.2 };
  it("consistent force (kc=2100, ap=2, f=0.2, mc=0.25 -> ~1256 N) passes", () => {
    const expected = 2100 * 2 * Math.pow(0.2, 0.75); // ~1255.8
    const v = { predicted_force_N: expected, recommendation: rec, material_properties: mp };
    expect(checkTurningForce({}, v)).toBeNull();
  });
  it("dropped (1-mc) exponent (f^1 instead of f^0.75) flags turning_force_inconsistent", () => {
    const v = { predicted_force_N: 2100 * 2 * 0.2, recommendation: rec, material_properties: mp }; // 840 N
    expect(checkTurningForce({}, v)?.kind).toBe("turning_force_inconsistent");
  });
  it("material coefficients not exposed -> not checkable (null)", () => {
    const v = { predicted_force_N: 1256, recommendation: rec, material_properties: {} };
    expect(checkTurningForce({}, v)).toBeNull();
  });
});

describe("checkTurningToolLife -- Taylor T = (C/Vc)^(1/n), rounding-forgiving", () => {
  const mp = { taylor_C: 400, taylor_n: 0.25 };
  it("consistent life (C=400, n=0.25, Vc=200 -> (2)^4 = 16 min) passes", () => {
    const v = { recommendation: { cutting_speed_m_min: 200 }, predicted_tool_life_min: 16, material_properties: mp };
    expect(checkTurningToolLife({}, v)).toBeNull();
  });
  it("dropped (1/n) exponent (life=C/Vc=2 not 16) flags turning_tool_life_inconsistent", () => {
    const v = { recommendation: { cutting_speed_m_min: 200 }, predicted_tool_life_min: 2, material_properties: mp };
    expect(checkTurningToolLife({}, v)?.kind).toBe("turning_tool_life_inconsistent");
  });
  it("integer rounding of a real life (16.4 -> 16) is forgiven (floor 0.5)", () => {
    // C=402.5,n=0.25,Vc=200 -> (2.0125)^4 = 16.40; facade rounds to 16
    const v = { recommendation: { cutting_speed_m_min: 200 }, predicted_tool_life_min: 16, material_properties: { taylor_C: 402.5, taylor_n: 0.25 } };
    expect(checkTurningToolLife({}, v)).toBeNull();
  });
  it("sub-1-min life keeps 3 sig figs and passes (0.240 min)", () => {
    // (140/200)^4 = 0.2401 -> toPrecision(3) = 0.240
    const v = { recommendation: { cutting_speed_m_min: 200 }, predicted_tool_life_min: 0.24, material_properties: { taylor_C: 140, taylor_n: 0.25 } };
    expect(checkTurningToolLife({}, v)).toBeNull();
  });
  it("a 2x-wrong sub-1-min life flags", () => {
    const v = { recommendation: { cutting_speed_m_min: 200 }, predicted_tool_life_min: 0.48, material_properties: { taylor_C: 140, taylor_n: 0.25 } };
    expect(checkTurningToolLife({}, v)?.kind).toBe("turning_tool_life_inconsistent");
  });
  it("Taylor C/n not exposed -> not checkable (null)", () => {
    const v = { recommendation: { cutting_speed_m_min: 200 }, predicted_tool_life_min: 16, material_properties: {} };
    expect(checkTurningToolLife({}, v)).toBeNull();
  });
});

describe("blockedTurningIdentities -- R12 field-absent advisories (never silent-skip)", () => {
  it("torque + MRR fields absent -> 2 advisories naming the missing fields", () => {
    const out = blockedTurningIdentities({ recommendation: { cutting_speed_m_min: 200 } });
    expect(out.map((x) => x.kind).sort()).toEqual(["turning_mrr_field_absent", "turning_torque_field_absent"]);
    expect(out.every((x) => /NOT VERIFIED/.test(x.note ?? ""))).toBe(true);
  });
  it("when the fields ARE emitted, no advisory", () => {
    const out = blockedTurningIdentities({ predicted_torque_Nm: 30, predicted_mrr_cm3_min: 12 });
    expect(out).toHaveLength(0);
  });
});

describe("turningPerCellOracle -- integration", () => {
  it("surfaces turning_power_inconsistent (eta omitted) while rpm/force are consistent", () => {
    const v = {
      recommendation: { cutting_speed_m_min: 200, rpm: 1273.24, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
      predicted_force_N: 800,
      predicted_power_kw: 2.6667, // raw, no eta -> wrong
      material_properties: { kc1_1: 2100, mc: 0.25 },
    };
    const out = turningPerCellOracle({ diameter_mm: 50 }, v);
    expect(out.some((x) => x.kind === "turning_power_inconsistent")).toBe(true);
    expect(out.some((x) => x.kind === "turning_rpm_inconsistent")).toBe(false);
  });
  it("a fully-consistent cell is clean (empty)", () => {
    const expectedF = 2100 * 2 * Math.pow(0.2, 0.75);
    const v = {
      recommendation: { cutting_speed_m_min: 200, rpm: 1273.24, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
      predicted_force_N: expectedF,
      predicted_power_kw: (expectedF * 200) / (60000 * 0.85),
      material_properties: { kc1_1: 2100, mc: 0.25 },
    };
    expect(turningPerCellOracle({ diameter_mm: 50 }, v)).toHaveLength(0);
  });
});
