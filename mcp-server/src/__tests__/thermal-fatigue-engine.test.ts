/**
 * ThermalFatigueEngine — Unit Tests
 * @milestone FORGE-ENGINES-B49
 */
import { describe, it, expect } from "vitest";
import { thermalFatigueEngine } from "../engines/ThermalFatigueEngine.js";

describe("ThermalFatigueEngine", () => {
  it("thermal strain range > 0", () => {
    const r = thermalFatigueEngine.calculate({});
    expect(r.thermal_strain_range.value).toBeGreaterThan(0);
  });

  it("fatigue life > 0", () => {
    const r = thermalFatigueEngine.calculate({});
    expect(r.fatigue_life_cycles.value).toBeGreaterThan(0);
  });

  it("larger ΔT reduces fatigue life", () => {
    const lo = thermalFatigueEngine.calculate({ delta_t_c: 50 });
    const hi = thermalFatigueEngine.calculate({ delta_t_c: 400 });
    expect(hi.fatigue_life_cycles.value).toBeLessThan(
      lo.fatigue_life_cycles.value
    );
  });

  it("hold time reduces creep-fatigue life", () => {
    const noHold = thermalFatigueEngine.calculate({
      hold_time_min: 0, max_temp_c: 550,
    });
    const hold = thermalFatigueEngine.calculate({
      hold_time_min: 120, max_temp_c: 550,
    });
    expect(hold.creep_fatigue_life.value).toBeLessThan(
      noHold.creep_fatigue_life.value
    );
  });

  it("max thermal stress > 0", () => {
    const r = thermalFatigueEngine.calculate({});
    expect(r.max_thermal_stress.value).toBeGreaterThan(0);
  });

  it("polished surface gives better life than as-cast", () => {
    const pol = thermalFatigueEngine.calculate({
      surface_finish: "polished", delta_t_c: 200,
    });
    const cast = thermalFatigueEngine.calculate({
      surface_finish: "as_cast", delta_t_c: 200,
    });
    expect(pol.fatigue_life_cycles.value).toBeGreaterThan(
      cast.fatigue_life_cycles.value
    );
  });

  it("safety factor > 0", () => {
    const r = thermalFatigueEngine.calculate({});
    expect(r.safety_factor.value).toBeGreaterThan(0);
  });

  it("elastic + plastic ≈ total strain", () => {
    const r = thermalFatigueEngine.calculate({});
    const total = r.elastic_strain.value + r.plastic_strain.value;
    expect(total).toBeCloseTo(r.thermal_strain_range.value, 4);
  });

  it("strain ratio between 0 and 2", () => {
    const r = thermalFatigueEngine.calculate({});
    expect(r.strain_ratio.value).toBeGreaterThan(0);
    expect(r.strain_ratio.value).toBeLessThan(2);
  });

  it("warns low safety factor", () => {
    const r = thermalFatigueEngine.calculate({
      delta_t_c: 500,
      cycles_required: 100000,
    });
    expect(r.warnings.some(w => w.includes("SF") || w.includes("FAIL"))).toBe(true);
  });
});
