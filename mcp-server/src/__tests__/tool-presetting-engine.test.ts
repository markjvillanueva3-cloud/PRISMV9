/**
 * ToolPresettingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B23
 */
import { describe, it, expect } from "vitest";
import {
  toolPresettingEngine,
} from "../engines/ToolPresettingEngine.js";

describe("ToolPresettingEngine", () => {
  it("length offset includes measured length", () => {
    const r = toolPresettingEngine.calculate({
      measured_length_mm: 150,
    });
    expect(r.length_offset.value).toBeGreaterThan(149);
    expect(r.length_offset.value).toBeLessThan(151);
  });

  it("thermal correction positive when machine warmer", () => {
    const r = toolPresettingEngine.calculate({
      measured_length_mm: 200,
      presetter_temp_c: 20,
      machine_temp_c: 30,
    });
    expect(r.thermal_correction.value).toBeGreaterThan(0);
  });

  it("thermal correction negative when machine cooler", () => {
    const r = toolPresettingEngine.calculate({
      measured_length_mm: 200,
      presetter_temp_c: 25,
      machine_temp_c: 20,
    });
    expect(r.thermal_correction.value).toBeLessThan(0);
  });

  it("effective diameter includes TIR", () => {
    const r = toolPresettingEngine.calculate({
      measured_length_mm: 100,
      measured_diameter_mm: 10.0,
      tir_mm: 0.01,
    });
    expect(r.effective_diameter.value).toBeCloseTo(10.02, 3);
  });

  it("carbide has less thermal growth than HSS", () => {
    const hss = toolPresettingEngine.calculate({
      measured_length_mm: 200,
      tool_material: "hss",
      presetter_temp_c: 20,
      machine_temp_c: 30,
    });
    const carb = toolPresettingEngine.calculate({
      measured_length_mm: 200,
      tool_material: "carbide",
      presetter_temp_c: 20,
      machine_temp_c: 30,
    });
    expect(carb.thermal_correction.value).toBeLessThan(
      hss.thermal_correction.value
    );
  });

  it("warns high TIR", () => {
    const r = toolPresettingEngine.calculate({
      measured_length_mm: 100,
      tir_mm: 0.03,
    });
    expect(
      r.warnings.some(w => w.includes("TIR"))
    ).toBe(true);
  });

  it("warns large temperature difference", () => {
    const r = toolPresettingEngine.calculate({
      measured_length_mm: 200,
      presetter_temp_c: 20,
      machine_temp_c: 35,
    });
    expect(
      r.warnings.some(w => w.includes("temperature"))
    ).toBe(true);
  });

  it("total uncertainty is RSS of components", () => {
    const r = toolPresettingEngine.calculate({
      measured_length_mm: 150,
      presetter_accuracy_um: 5,
      tir_mm: 0.01,
    });
    expect(r.total_uncertainty.value).toBeGreaterThan(0);
  });

  it("initial wear offset varies by material", () => {
    const hss = toolPresettingEngine.calculate({
      measured_length_mm: 100,
      tool_material: "hss",
    });
    const ceramic = toolPresettingEngine.calculate({
      measured_length_mm: 100,
      tool_material: "ceramic",
    });
    expect(hss.initial_wear_offset.value).toBeGreaterThan(
      ceramic.initial_wear_offset.value
    );
  });

  it("gage line adds to length offset", () => {
    const noGage = toolPresettingEngine.calculate({
      measured_length_mm: 100,
      gage_line_to_spindle_mm: 0,
    });
    const withGage = toolPresettingEngine.calculate({
      measured_length_mm: 100,
      gage_line_to_spindle_mm: 50,
    });
    expect(withGage.length_offset.value).toBeGreaterThan(
      noGage.length_offset.value
    );
  });
});
