/**
 * SpecificCuttingEnergyEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { specificCuttingEnergyEngine } from "../engines/SpecificCuttingEnergyEngine.js";

describe("SpecificCuttingEnergyEngine", () => {
  it("specific energy > 0 with force method", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 500,
      chip_width_mm: 2,
      chip_thickness_mm: 0.1,
    });
    expect(r.specific_energy_J_mm3.value).toBeGreaterThan(0);
  });

  it("total energy ≥ 0", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 500,
      chip_width_mm: 2,
      chip_thickness_mm: 0.1,
    });
    expect(r.total_energy_kJ.value).toBeGreaterThanOrEqual(0);
  });

  it("is_safe is boolean", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 500,
      chip_width_mm: 2,
      chip_thickness_mm: 0.1,
    });
    expect(typeof r.is_safe).toBe("boolean");
  });

  it("recommendations is array", () => {
    const r = specificCuttingEnergyEngine.calculate({
      cutting_force_N: 500,
      chip_width_mm: 2,
      chip_thickness_mm: 0.1,
    });
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
