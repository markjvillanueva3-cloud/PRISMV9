/**
 * SurfaceTreatmentEngine — Unit Tests
 * @milestone FORGE-ENGINES-B32
 */
import { describe, it, expect } from "vitest";
import { surfaceTreatmentEngine } from "../engines/SurfaceTreatmentEngine.js";

describe("SurfaceTreatmentEngine", () => {
  it("anodize compatible with aluminum", () => {
    const r = surfaceTreatmentEngine.calculate({
      process: "anodize_ii",
      base_material: "aluminum",
    });
    expect(r.treatment_feasible.unit).toBe("PASS");
  });

  it("anodize incompatible with steel", () => {
    const r = surfaceTreatmentEngine.calculate({
      process: "anodize_ii",
      base_material: "steel",
    });
    expect(r.treatment_feasible.unit).toBe("FAIL");
    expect(r.warnings.some(w => w.includes("not compatible"))).toBe(true);
  });

  it("hard anodize harder than type II", () => {
    const ii = surfaceTreatmentEngine.calculate({ process: "anodize_ii" });
    const iii = surfaceTreatmentEngine.calculate({ process: "anodize_iii" });
    expect(iii.surface_hardness.value).toBeGreaterThan(
      ii.surface_hardness.value
    );
  });

  it("chrome plate has highest wear improvement", () => {
    const chrome = surfaceTreatmentEngine.calculate({
      process: "chrome_plate",
      base_material: "steel",
    });
    const zinc = surfaceTreatmentEngine.calculate({
      process: "zinc_plate",
      base_material: "steel",
    });
    expect(chrome.wear_improvement.value).toBeGreaterThan(
      zinc.wear_improvement.value
    );
  });

  it("thicker coating → more salt spray hours", () => {
    const thin = surfaceTreatmentEngine.calculate({
      process: "anodize_ii",
      target_thickness_um: 5,
    });
    const thick = surfaceTreatmentEngine.calculate({
      process: "anodize_ii",
      target_thickness_um: 25,
    });
    expect(thick.corrosion_hours_salt_spray.value).toBeGreaterThan(
      thin.corrosion_hours_salt_spray.value
    );
  });

  it("dimensional change increases with thickness", () => {
    const thin = surfaceTreatmentEngine.calculate({
      process: "chrome_plate",
      target_thickness_um: 10,
    });
    const thick = surfaceTreatmentEngine.calculate({
      process: "chrome_plate",
      target_thickness_um: 100,
    });
    expect(thick.dimensional_change.value).toBeGreaterThan(
      thin.dimensional_change.value
    );
  });

  it("batch discount reduces cost", () => {
    const single = surfaceTreatmentEngine.calculate({ quantity: 1 });
    const batch = surfaceTreatmentEngine.calculate({ quantity: 100 });
    expect(batch.cost_per_part.value).toBeLessThan(
      single.cost_per_part.value
    );
  });

  it("nitriding has high hardness", () => {
    const r = surfaceTreatmentEngine.calculate({
      process: "nitriding",
      base_material: "steel",
    });
    expect(r.surface_hardness.value).toBeGreaterThanOrEqual(1000);
  });

  it("complex parts cost more", () => {
    const simple = surfaceTreatmentEngine.calculate({
      part_complexity: "simple",
    });
    const complex = surfaceTreatmentEngine.calculate({
      part_complexity: "complex",
    });
    expect(complex.cost_per_part.value).toBeGreaterThan(
      simple.cost_per_part.value
    );
  });

  it("warns chrome plate environmental compliance", () => {
    const r = surfaceTreatmentEngine.calculate({
      process: "chrome_plate",
      base_material: "steel",
    });
    expect(r.warnings.some(w => w.includes("REACH"))).toBe(true);
  });
});
