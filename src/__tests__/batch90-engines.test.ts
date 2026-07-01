/**
 * Batch 90 — Calendering, FilamentWinding, ResinTransfer
 * @milestone FORGE-ENGINES-BATCH90
 */
import { describe, it, expect } from "vitest";
import { calenderingEngine } from "../engines/CalenderingEngine.js";
import { filamentWindingEngine } from "../engines/FilamentWindingEngine.js";
import { resinTransferEngine } from "../engines/ResinTransferEngine.js";

describe("CalenderingEngine", () => {
  const base = { roll_diameter_mm: 500, roll_width_mm: 1500, target_thickness_mm: 0.5 };
  it("output rate > 0", () => {
    expect(calenderingEngine.calculate(base).output_rate_kg_h.value).toBeGreaterThan(0);
  });
  it("nip force > 0", () => {
    expect(calenderingEngine.calculate(base).nip_force_kN_m.value).toBeGreaterThan(0);
  });
  it("thinner sheet → higher nip force", () => {
    const f05 = calenderingEngine.calculate(base).nip_force_kN_m.value;
    const f02 = calenderingEngine.calculate({ ...base, target_thickness_mm: 0.2 }).nip_force_kN_m.value;
    expect(f02).toBeGreaterThan(f05);
  });
  it("power > 0", () => {
    expect(calenderingEngine.calculate(base).power_kW.value).toBeGreaterThan(0);
  });
  it("sheet width = roll width", () => {
    expect(calenderingEngine.calculate(base).sheet_width_mm.value).toBe(1500);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(calenderingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FilamentWindingEngine", () => {
  const base = { mandrel_diameter_mm: 200, part_length_mm: 500, internal_pressure_MPa: 20 };
  it("wall thickness > 0", () => {
    expect(filamentWindingEngine.calculate(base).wall_thickness_mm.value).toBeGreaterThan(0);
  });
  it("burst pressure > design pressure", () => {
    expect(filamentWindingEngine.calculate(base).burst_pressure_MPa.value).toBeGreaterThan(20);
  });
  it("safety factor > 1", () => {
    expect(filamentWindingEngine.calculate(base).safety_factor.value).toBeGreaterThan(1);
  });
  it("carbon fiber has higher burst than glass", () => {
    const carbon = filamentWindingEngine.calculate({ ...base, fiber: "carbon_T700" }).burst_pressure_MPa.value;
    const glass = filamentWindingEngine.calculate({ ...base, fiber: "e_glass" }).burst_pressure_MPa.value;
    expect(carbon).toBeGreaterThan(glass);
  });
  it("num layers > 0", () => {
    expect(filamentWindingEngine.calculate(base).num_layers.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(filamentWindingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ResinTransferEngine", () => {
  const base = { part_length_mm: 500, part_width_mm: 300, part_thickness_mm: 5 };
  it("fill time > 0", () => {
    expect(resinTransferEngine.calculate(base).fill_time_min.value).toBeGreaterThan(0);
  });
  it("resin volume > 0", () => {
    expect(resinTransferEngine.calculate(base).resin_volume_L.value).toBeGreaterThan(0);
  });
  it("more injection ports → shorter fill", () => {
    const t1 = resinTransferEngine.calculate(base).fill_time_min.value;
    const t3 = resinTransferEngine.calculate({ ...base, num_injection_ports: 3 }).fill_time_min.value;
    expect(t3).toBeLessThan(t1);
  });
  it("total cycle > fill + cure", () => {
    const r = resinTransferEngine.calculate(base);
    expect(r.total_cycle_time_min.value).toBeGreaterThan(r.fill_time_min.value);
  });
  it("permeability > 0", () => {
    expect(resinTransferEngine.calculate(base).permeability_m2.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(resinTransferEngine.calculate(base).recommendations)).toBe(true);
  });
});
