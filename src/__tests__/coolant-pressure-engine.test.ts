/**
 * Tests for CoolantPressureEngine
 */
import { describe, it, expect } from "vitest";
import {
  CoolantPressureEngine,
} from "../engines/CoolantPressureEngine.js";

describe("CoolantPressureEngine", () => {
  const engine = new CoolantPressureEngine();

  it("calculates coolant for standard drilling", () => {
    const r = engine.calculate({
      operation: "drilling",
      hole_diameter_mm: 10,
      supply_pressure_bar: 30,
    });
    expect(r.recommended_pressure.value).toBeGreaterThan(0);
    expect(r.flow_rate.value).toBeGreaterThan(0);
    expect(r.jet_velocity.value).toBeGreaterThan(0);
    expect(r.pump_power.value).toBeGreaterThan(0);
  });

  it("higher pressure for deeper holes", () => {
    const shallow = engine.calculate({
      operation: "drilling",
      depth_to_dia_ratio: 2,
    });
    const deep = engine.calculate({
      operation: "drilling",
      depth_to_dia_ratio: 6,
    });
    expect(deep.recommended_pressure.value).toBeGreaterThan(
      shallow.recommended_pressure.value
    );
  });

  it("higher pressure for drilling than milling", () => {
    const drill = engine.calculate({
      operation: "drilling",
    });
    const mill = engine.calculate({
      operation: "milling",
    });
    expect(drill.recommended_pressure.value).toBeGreaterThan(
      mill.recommended_pressure.value
    );
  });

  it("flow rate increases with pressure", () => {
    const low = engine.calculate({
      supply_pressure_bar: 10,
    });
    const high = engine.calculate({
      supply_pressure_bar: 70,
    });
    expect(high.flow_rate.value).toBeGreaterThan(
      low.flow_rate.value
    );
  });

  it("recommends HPC for high pressure", () => {
    const r = engine.calculate({
      supply_pressure_bar: 80,
    });
    expect(r.coolant_type).toBe("hpc");
  });

  it("recommends MQL for aluminum milling", () => {
    const r = engine.calculate({
      operation: "milling",
      material_iso_group: "N",
    });
    expect(r.coolant_type).toBe("mql");
  });

  it("chip breaking improves with pressure", () => {
    const low = engine.calculate({
      supply_pressure_bar: 10,
    });
    const high = engine.calculate({
      supply_pressure_bar: 70,
    });
    expect(high.chip_breaking_effectiveness.value).toBeGreaterThan(
      low.chip_breaking_effectiveness.value
    );
  });

  it("warns on low pressure for deep hole", () => {
    const r = engine.calculate({
      operation: "drilling",
      depth_to_dia_ratio: 8,
      supply_pressure_bar: 15,
    });
    expect(
      r.warnings.some(w => w.includes("evacuation"))
    ).toBe(true);
  });

  it("warns on difficult materials", () => {
    const r = engine.calculate({
      material_iso_group: "S",
    });
    expect(
      r.warnings.some(w => w.includes("high-pressure"))
    ).toBe(true);
  });

  it("warns when supply < recommended", () => {
    const r = engine.calculate({
      operation: "drilling",
      depth_to_dia_ratio: 6,
      supply_pressure_bar: 10,
    });
    expect(
      r.warnings.some(w => w.includes("Supply pressure"))
    ).toBe(true);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      operation: "drilling",
    });
    for (const key of [
      "recommended_pressure", "flow_rate",
      "jet_velocity", "pump_power",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { coolantPressureEngine } = await import(
      "../engines/CoolantPressureEngine.js"
    );
    expect(coolantPressureEngine).toBeInstanceOf(
      CoolantPressureEngine
    );
  });
});
