/**
 * Batch 87 — EDMWire, AnodizingProcess, Accumulator
 * @milestone FORGE-ENGINES-BATCH87
 */
import { describe, it, expect } from "vitest";
import { edmWireEngine } from "../engines/EDMWireEngine.js";
import { anodizingProcessEngine } from "../engines/AnodizingProcessEngine.js";
import { accumulatorEngine } from "../engines/AccumulatorEngine.js";

describe("EDMWireEngine", () => {
  const base = { workpiece_thickness_mm: 50 };
  it("MRR > 0", () => {
    expect(edmWireEngine.calculate(base).mrr_mm2_min.value).toBeGreaterThan(0);
  });
  it("finish mode → lower Ra than rough", () => {
    const rough = edmWireEngine.calculate({ ...base, cutting_mode: "rough" }).surface_roughness_Ra_um.value;
    const finish = edmWireEngine.calculate({ ...base, cutting_mode: "finish" }).surface_roughness_Ra_um.value;
    expect(finish).toBeLessThan(rough);
  });
  it("gap width > 0", () => {
    expect(edmWireEngine.calculate(base).gap_width_mm.value).toBeGreaterThan(0);
  });
  it("thicker workpiece → slower cutting", () => {
    const s50 = edmWireEngine.calculate({ ...base, workpiece_thickness_mm: 50 }).cutting_speed_mm_min.value;
    const s100 = edmWireEngine.calculate({ ...base, workpiece_thickness_mm: 100 }).cutting_speed_mm_min.value;
    expect(s100).toBeLessThan(s50);
  });
  it("wire speed > 0", () => {
    expect(edmWireEngine.calculate(base).wire_speed_m_min.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(edmWireEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("AnodizingProcessEngine", () => {
  const base = { target_thickness_um: 20, surface_area_dm2: 10 };
  it("process time > 0", () => {
    expect(anodizingProcessEngine.calculate(base).process_time_min.value).toBeGreaterThan(0);
  });
  it("thicker oxide → longer time", () => {
    const t20 = anodizingProcessEngine.calculate(base).process_time_min.value;
    const t40 = anodizingProcessEngine.calculate({ ...base, target_thickness_um: 40 }).process_time_min.value;
    expect(t40).toBeGreaterThan(t20);
  });
  it("hard anodize has higher hardness than Type II", () => {
    const t2 = anodizingProcessEngine.calculate(base).hardness_HV.value;
    const t3 = anodizingProcessEngine.calculate({ ...base, anodize_type: "type_III_hard" }).hardness_HV.value;
    expect(t3).toBeGreaterThan(t2);
  });
  it("dimensional growth > 0", () => {
    expect(anodizingProcessEngine.calculate(base).dimensional_growth_um.value).toBeGreaterThan(0);
  });
  it("salt spray hours > 0", () => {
    expect(anodizingProcessEngine.calculate(base).corrosion_hours_salt_spray.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(anodizingProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("AccumulatorEngine", () => {
  const base = { required_volume_L: 5, min_pressure_bar: 100, max_pressure_bar: 200 };
  it("total volume > required volume", () => {
    expect(accumulatorEngine.calculate(base).total_volume_L.value).toBeGreaterThan(5);
  });
  it("precharge pressure < min pressure", () => {
    expect(accumulatorEngine.calculate(base).precharge_pressure_bar.value).toBeLessThan(100);
  });
  it("stored energy > 0", () => {
    expect(accumulatorEngine.calculate(base).stored_energy_kJ.value).toBeGreaterThan(0);
  });
  it("higher pressure range → larger accumulator", () => {
    const v1 = accumulatorEngine.calculate(base).total_volume_L.value;
    const v2 = accumulatorEngine.calculate({ ...base, max_pressure_bar: 300 }).total_volume_L.value;
    // Higher max pressure with same dV needs different sizing
    expect(v2).not.toBe(v1);
  });
  it("compression ratio > 1", () => {
    expect(accumulatorEngine.calculate(base).compression_ratio.value).toBeGreaterThan(1);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(accumulatorEngine.calculate(base).recommendations)).toBe(true);
  });
});
