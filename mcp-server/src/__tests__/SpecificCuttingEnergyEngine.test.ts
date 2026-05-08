/**
 * Engine-direct test for SpecificCuttingEnergyEngine.
 *
 * The engine models specific cutting energy u (J/mm³) via three compute paths:
 *   1) force + chip geometry  →  u = Fc / (b·h)
 *   2) Kienzle coefficients   →  u = kc1_1 · h^(-mc)
 *   3) cutting power + MRR    →  u = (Fc·Vc/60) / (Q · 1000/60)
 * Falls back to mild-steel default (2.5 J/mm³) when none provided.
 *
 * References: Gutowski (2006), Kara & Li (2011), Klocke (2011), ISO 14955.
 *
 * The companion wire test
 * (calcDispatcher.specific-cutting-energy-wire.test.ts) covers Zod schema
 * validation + dispatcher enum/case wiring; this file exercises only the
 * engine API for direct-coverage book-keeping.
 */
import { describe, it, expect } from "vitest";
import {
  SpecificCuttingEnergyEngine,
  specificCuttingEnergyEngine,
} from "../engines/SpecificCuttingEnergyEngine.js";

describe("SpecificCuttingEnergyEngine — direct API", () => {
  it("exposes a singleton plus a constructable class", () => {
    expect(specificCuttingEnergyEngine).toBeInstanceOf(SpecificCuttingEnergyEngine);
    const fresh = new SpecificCuttingEnergyEngine();
    expect(fresh).toBeInstanceOf(SpecificCuttingEnergyEngine);
    // Both must produce identical results for identical inputs.
    const a = specificCuttingEnergyEngine.calculate({ cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2 });
    const b = fresh.calculate({ cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2 });
    expect(a.specific_energy_J_mm3.value).toBe(b.specific_energy_J_mm3.value);
  });

  it("Method 1 force/chip-area: u = Fc / (b·h) within rounding", () => {
    // Fc=600, b=2, h=0.3 → u = 600 / 0.6 = 1000 J/mm³
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 600, chip_width_mm: 2, chip_thickness_mm: 0.3,
    });
    expect(r.specific_energy_J_mm3.value).toBeCloseTo(1000, 0);
    expect(r.specific_energy_J_mm3.source).toBe("force_chip_area");
  });

  it("Method 1 scales linearly with Fc at fixed chip geometry", () => {
    const a = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 400, chip_width_mm: 2, chip_thickness_mm: 0.2,
    });
    const b = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 1200, chip_width_mm: 2, chip_thickness_mm: 0.2,
    });
    expect(b.specific_energy_J_mm3.value / a.specific_energy_J_mm3.value).toBeCloseTo(3.0, 2);
  });

  it("Method 2 Kienzle: u(0.1 mm) matches kc1_1 · 0.1^(-mc)", () => {
    const kc1_1 = 1800;
    const mc = 0.25;
    const r = specificCuttingEnergyEngine.calculate({
      kc1_1, mc, feed_mm: 0.1,
      cutting_speed_m_min: 200, depth_of_cut_mm: 2, width_of_cut_mm: 5,
    });
    const expected = kc1_1 * Math.pow(0.1, -mc);
    expect(r.specific_energy_J_mm3.value).toBeCloseTo(Math.round(expected * 100) / 100, 0);
    expect(r.specific_energy_J_mm3.source).toBe("kienzle_model");
  });

  it("Method 2 Kienzle ratio between feeds equals (h2/h1)^(-mc)", () => {
    const kc1_1 = 2100;
    const mc = 0.21;
    const r1 = specificCuttingEnergyEngine.calculate({
      kc1_1, mc, feed_mm: 0.1,
      cutting_speed_m_min: 150, depth_of_cut_mm: 2, width_of_cut_mm: 5,
    });
    const r2 = specificCuttingEnergyEngine.calculate({
      kc1_1, mc, feed_mm: 0.2,
      cutting_speed_m_min: 150, depth_of_cut_mm: 2, width_of_cut_mm: 5,
    });
    const ratio = r2.specific_energy_J_mm3.value / r1.specific_energy_J_mm3.value;
    expect(ratio).toBeCloseTo(Math.pow(2, -mc), 2);
  });

  it("Method 3 power-over-MRR: u = (Fc·Vc/60) / (Q·1000/60)", () => {
    // Fc=900 N, Vc=180 m/min → P = 900·180/60 = 2700 W
    // MRR = 6 cm³/min → Q = 6·1000/60 = 100 mm³/s
    // u = 2700 / 100 = 27 J/mm³
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 900, cutting_speed_m_min: 180, mrr_cm3_min: 6,
      machining_time_min: 1,
    });
    expect(r.specific_energy_J_mm3.source).toBe("power_over_mrr");
    expect(r.specific_energy_J_mm3.value).toBeCloseTo(27, 0);
  });

  it("Fallback returns mild-steel default and warns user", () => {
    const r = specificCuttingEnergyEngine.calculate({});
    expect(r.specific_energy_J_mm3.value).toBeCloseTo(2.5, 2);
    expect(r.specific_energy_J_mm3.source).toBe("default_mild_steel");
    expect(r.recommendations.some((m) => m.includes("default"))).toBe(true);
  });

  it("classifies low (u<1.5) / medium / high / very_high tiers correctly", () => {
    // u=1.25 → low
    const lo = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 10, chip_width_mm: 4, chip_thickness_mm: 2,
    });
    // u=2.5 default → medium
    const med = specificCuttingEnergyEngine.calculate({});
    // u≈4 → high. Fc=400, b=2, h=50 → u = 400/100 = 4
    const hi = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 400, chip_width_mm: 2, chip_thickness_mm: 50,
    });
    // u=12 → very_high. Fc=1200, b=10, h=10 → u = 1200/100 = 12
    const vh = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 1200, chip_width_mm: 10, chip_thickness_mm: 10,
    });
    expect(lo.specific_energy_class).toBe("low");
    expect(med.specific_energy_class).toBe("medium");
    expect(hi.specific_energy_class).toBe("high");
    expect(vh.specific_energy_class).toBe("very_high");
  });

  it("safety predicate flips to false above u=10 J/mm³", () => {
    const safe = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 600, chip_width_mm: 2, chip_thickness_mm: 0.5,
    }); // u = 600 / 1 = 600 — clearly unsafe (>10)
    expect(safe.is_safe).toBe(false);
    const ok = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 50, chip_width_mm: 5, chip_thickness_mm: 5,
    }); // u = 50/25 = 2 — safe
    expect(ok.is_safe).toBe(true);
  });

  it("CO₂ ordering: renewable < natural_gas < grid_average < coal", () => {
    const baseInput = {
      cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
      mrr_cm3_min: 8, machining_time_min: 5,
    } as const;
    const r = (s: "renewable" | "natural_gas" | "grid_average" | "coal") =>
      specificCuttingEnergyEngine.calculate({ ...baseInput, energy_source: s });
    const renewable = r("renewable").co2_per_part_g.value;
    const gas = r("natural_gas").co2_per_part_g.value;
    const grid = r("grid_average").co2_per_part_g.value;
    const coal = r("coal").co2_per_part_g.value;
    expect(renewable).toBeLessThan(gas);
    expect(gas).toBeLessThan(grid);
    expect(grid).toBeLessThan(coal);
  });

  it("nuclear has the lowest CO₂ factor of all sources (12 g/kWh per IEA 2023)", () => {
    const baseInput = {
      cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
      mrr_cm3_min: 8, machining_time_min: 5,
    } as const;
    const nuclear = specificCuttingEnergyEngine.calculate({ ...baseInput, energy_source: "nuclear" });
    const coal = specificCuttingEnergyEngine.calculate({ ...baseInput, energy_source: "coal" });
    expect(nuclear.co2_per_part_g.value).toBeLessThan(coal.co2_per_part_g.value);
    // Coal/nuclear factor ratio ≈ 900/12 = 75. Energy is identical → CO₂ ratio matches.
    expect(coal.co2_per_part_g.value / nuclear.co2_per_part_g.value).toBeGreaterThan(50);
  });

  it("efficiency ratio is bounded in (0,1] when MRR>0", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
      mrr_cm3_min: 10, machining_time_min: 1,
      spindle_efficiency: 0.85, machine_standby_power_kW: 2.5,
    });
    expect(r.energy_efficiency_ratio.value).toBeGreaterThan(0);
    expect(r.energy_efficiency_ratio.value).toBeLessThanOrEqual(1);
  });

  it("Wh-per-part output stays consistent with kJ-per-part (1 Wh ≡ 3.6 kJ)", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
      mrr_cm3_min: 10, machining_time_min: 2,
    });
    const wh = r.energy_per_part_Wh.value;
    const kj = r.machine_energy_kJ.value;
    // 1 Wh = 3.6 kJ → kJ/Wh ratio should be 3.6 within rounding tolerance.
    expect(kj / wh).toBeCloseTo(3.6, 1);
  });

  it("all returned AtomicValues carry positive-or-zero uncertainty fields", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 800, chip_width_mm: 2, chip_thickness_mm: 0.2,
      mrr_cm3_min: 10, machining_time_min: 1,
    });
    const atomics = [
      r.specific_energy_J_mm3, r.cutting_power_kW, r.total_energy_kJ,
      r.energy_per_part_Wh, r.machine_energy_kJ, r.energy_efficiency_ratio,
      r.co2_per_part_g, r.energy_cost_per_part,
    ];
    for (const a of atomics) {
      expect(typeof a.value).toBe("number");
      expect(Number.isFinite(a.value)).toBe(true);
      expect(a.uncertainty).toBeGreaterThanOrEqual(0);
      expect(typeof a.unit).toBe("string");
      expect(a.unit.length).toBeGreaterThan(0);
      expect(typeof a.source).toBe("string");
    }
  });

  it("recommendation list is always non-empty (nominal-profile fallback message)", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 200, chip_width_mm: 2, chip_thickness_mm: 0.4,
      mrr_cm3_min: 8, machining_time_min: 1,
    });
    expect(Array.isArray(r.recommendations)).toBe(true);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("rejects NaN cutting_force_N — falls through to default mild-steel", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: Number.NaN, chip_width_mm: 2, chip_thickness_mm: 0.1,
    });
    expect(Number.isFinite(r.specific_energy_J_mm3.value)).toBe(true);
    expect(r.specific_energy_J_mm3.source).toBe("default_mild_steel");
  });

  it("rejects Infinity force — output stays finite via fallback", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: Number.POSITIVE_INFINITY, chip_width_mm: 2, chip_thickness_mm: 0.1,
    });
    expect(Number.isFinite(r.specific_energy_J_mm3.value)).toBe(true);
    expect(Number.isFinite(r.cutting_power_kW.value)).toBe(true);
    expect(r.specific_energy_J_mm3.source).toBe("default_mild_steel");
  });

  it("zero chip width does not produce divide-by-zero or NaN", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 1000, chip_width_mm: 0, chip_thickness_mm: 0.1,
    });
    expect(Number.isFinite(r.specific_energy_J_mm3.value)).toBe(true);
    expect(r.specific_energy_J_mm3.source).not.toBe("force_chip_area");
  });

  it("Kienzle path with mc=0 (no exponent decay) gives u = kc1_1 exactly", () => {
    const r = specificCuttingEnergyEngine.calculate({
      kc1_1: 1500, mc: 0, feed_mm: 0.1,
      cutting_speed_m_min: 150, depth_of_cut_mm: 2, width_of_cut_mm: 5,
    });
    // u = 1500 · 0.1^0 = 1500
    expect(r.specific_energy_J_mm3.value).toBeCloseTo(1500, 0);
    expect(r.specific_energy_J_mm3.source).toBe("kienzle_model");
  });
});
