/**
 * HeatTreatmentEngine — Unit Tests
 * @milestone FORGE-ENGINES-B31
 */
import { describe, it, expect } from "vitest";
import { heatTreatmentEngine } from "../engines/HeatTreatmentEngine.js";

describe("HeatTreatmentEngine", () => {
  it("austenitize temp varies with carbon content", () => {
    const low = heatTreatmentEngine.calculate({ carbon_pct: 0.20 });
    const high = heatTreatmentEngine.calculate({ carbon_pct: 0.60 });
    // Lower carbon → higher Ac3
    expect(low.austenitize_temp.value).toBeGreaterThan(
      high.austenitize_temp.value
    );
  });

  it("soak time increases with section thickness", () => {
    const thin = heatTreatmentEngine.calculate({ section_thickness_mm: 10 });
    const thick = heatTreatmentEngine.calculate({ section_thickness_mm: 80 });
    expect(thick.soak_time_min.value).toBeGreaterThan(
      thin.soak_time_min.value
    );
  });

  it("oil quench for high carbon steel", () => {
    const r = heatTreatmentEngine.calculate({
      carbon_pct: 0.80,
      alloy_class: "plain_carbon",
    });
    expect(r.quench_medium.unit).toBe("oil");
  });

  it("higher temper temp → lower hardness", () => {
    const low = heatTreatmentEngine.calculate({ tempering_temp_c: 200 });
    const high = heatTreatmentEngine.calculate({ tempering_temp_c: 500 });
    expect(high.predicted_hardness.value).toBeLessThan(
      low.predicted_hardness.value
    );
  });

  it("target hardness derives temper temp", () => {
    const r = heatTreatmentEngine.calculate({
      carbon_pct: 0.45,
      target_hardness_hrc: 35,
    });
    expect(r.predicted_hardness.value).toBeCloseTo(35, 0);
    expect(r.temper_temp.value).toBeGreaterThan(200);
  });

  it("carburizing calculates case depth and time", () => {
    const r = heatTreatmentEngine.calculate({
      process: "carburize",
      target_case_depth_mm: 1.0,
    });
    expect(r.case_depth.value).toBeCloseTo(1.0, 1);
    expect(r.carburize_time.value).toBeGreaterThan(0);
  });

  it("deeper case needs more time (√t law)", () => {
    const shallow = heatTreatmentEngine.calculate({
      process: "carburize",
      target_case_depth_mm: 0.5,
    });
    const deep = heatTreatmentEngine.calculate({
      process: "carburize",
      target_case_depth_mm: 1.5,
    });
    expect(deep.carburize_time.value).toBeGreaterThan(
      shallow.carburize_time.value * 4 // depth² relationship
    );
  });

  it("anneal gives lowest hardness", () => {
    const anneal = heatTreatmentEngine.calculate({
      process: "anneal",
      carbon_pct: 0.40,
    });
    const harden = heatTreatmentEngine.calculate({
      process: "harden_quench",
      carbon_pct: 0.40,
    });
    expect(anneal.predicted_hardness.value).toBeLessThan(
      harden.predicted_hardness.value
    );
  });

  it("warns water quench on high carbon", () => {
    const r = heatTreatmentEngine.calculate({
      carbon_pct: 0.80,
      alloy_class: "plain_carbon",
      section_thickness_mm: 80,
    });
    // Large section forces water quench, but high carbon warns
    expect(r.warnings.some(w => w.includes("crack"))).toBe(true);
  });

  it("process notes populated for harden_quench", () => {
    const r = heatTreatmentEngine.calculate({
      process: "harden_quench",
    });
    expect(r.process_notes.length).toBeGreaterThan(0);
    expect(r.process_notes.some(n => n.includes("quench"))).toBe(true);
  });
});
