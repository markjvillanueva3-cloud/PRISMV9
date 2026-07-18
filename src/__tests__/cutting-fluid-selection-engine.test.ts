/**
 * Tests for CuttingFluidSelectionEngine
 */
import { describe, it, expect } from "vitest";
import {
  CuttingFluidSelectionEngine,
} from "../engines/CuttingFluidSelectionEngine.js";

describe("CuttingFluidSelectionEngine", () => {
  const engine = new CuttingFluidSelectionEngine();

  it("recommends soluble oil for steel turning", () => {
    const r = engine.calculate({
      operation: "turning",
      material_iso_group: "P",
    });
    expect(r.recommended_type).toBe("soluble_oil");
    expect(r.concentration.value).toBeGreaterThan(0);
    expect(r.flow_rate.value).toBeGreaterThan(0);
    expect(r.tool_life_factor.value).toBeGreaterThan(1);
  });

  it("recommends neat oil for tapping", () => {
    const r = engine.calculate({
      operation: "tapping",
    });
    expect(r.recommended_type).toBe("neat_oil");
    expect(r.concentration.value).toBe(100);
  });

  it("recommends full synthetic for grinding", () => {
    const r = engine.calculate({
      operation: "grinding",
    });
    expect(r.recommended_type).toBe("full_synthetic");
    expect(r.cooling_effectiveness.value).toBeGreaterThan(50);
  });

  it("recommends MQL for aluminum milling", () => {
    const r = engine.calculate({
      operation: "milling",
      material_iso_group: "N",
    });
    expect(r.recommended_type).toBe("mql");
    expect(r.flow_rate.value).toBeLessThan(1);
  });

  it("recommends MQL for environmental priority", () => {
    const r = engine.calculate({
      operation: "turning",
      environmental_priority: true,
    });
    expect(r.recommended_type).toBe("mql");
  });

  it("provides alternatives", () => {
    const r = engine.calculate({
      operation: "milling",
    });
    expect(r.alternatives.length).toBeGreaterThan(0);
  });

  it("higher pressure for deep holes", () => {
    const normal = engine.calculate({
      operation: "drilling",
    });
    const deep = engine.calculate({
      operation: "drilling",
      is_deep_hole: true,
    });
    expect(deep.pressure.value).toBeGreaterThan(
      normal.pressure.value
    );
  });

  it("higher concentration for difficult materials", () => {
    const steel = engine.calculate({
      operation: "turning",
      material_iso_group: "P",
      cutting_speed_m_per_min: 50,
    });
    const super_alloy = engine.calculate({
      operation: "turning",
      material_iso_group: "S",
      cutting_speed_m_per_min: 50,
    });
    // Both get soluble_oil at low speed; S gets higher conc
    expect(super_alloy.concentration.value).toBeGreaterThan(
      steel.concentration.value
    );
  });

  it("cryogenic for high-speed superalloy", () => {
    const r = engine.calculate({
      operation: "turning",
      material_iso_group: "S",
      cutting_speed_m_per_min: 100,
    });
    expect(r.recommended_type).toBe("cryogenic");
  });

  it("recommends dry for cast iron milling", () => {
    const r = engine.calculate({
      operation: "milling",
      material_iso_group: "K",
    });
    expect(r.recommended_type).toBe("dry");
  });

  it("warns on deep hole with MQL", () => {
    const r = engine.calculate({
      operation: "drilling",
      material_iso_group: "N",
      is_deep_hole: true,
    });
    // Despite aluminum preference for MQL,
    // deep hole should warn or switch
    if (r.recommended_type === "mql") {
      expect(
        r.warnings.some(w => w.includes("deep hole"))
      ).toBe(true);
    }
  });

  it("reports fluid life", () => {
    const r = engine.calculate({
      operation: "turning",
    });
    expect(r.fluid_life_months.value).toBeGreaterThan(0);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      operation: "milling",
    });
    for (const key of [
      "concentration", "flow_rate", "pressure",
      "tool_life_factor", "cooling_effectiveness",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { cuttingFluidSelectionEngine } = await import(
      "../engines/CuttingFluidSelectionEngine.js"
    );
    expect(cuttingFluidSelectionEngine).toBeInstanceOf(
      CuttingFluidSelectionEngine
    );
  });
});
