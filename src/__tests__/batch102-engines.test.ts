/**
 * Batch 102 — RotationalMolding, ScrewExtrusion, CompressionMolding
 * @milestone FORGE-ENGINES-BATCH102
 */
import { describe, it, expect } from "vitest";
import { rotationalMoldingEngine } from "../engines/RotationalMoldingEngine.js";
import { screwExtrusionEngine } from "../engines/ScrewExtrusionEngine.js";
import { compressionMoldingEngine } from "../engines/CompressionMoldingEngine.js";

describe("RotationalMoldingEngine", () => {
  const base = { part_volume_L: 50 };
  it("cycle time > 0", () => {
    expect(rotationalMoldingEngine.calculate(base).cycle_time_min.value).toBeGreaterThan(0);
  });
  it("heating + cooling ≈ cycle - handling", () => {
    const r = rotationalMoldingEngine.calculate(base);
    expect(r.heating_time_min.value + r.cooling_time_min.value).toBeLessThanOrEqual(r.cycle_time_min.value);
  });
  it("water spray faster cooling than air", () => {
    const air = rotationalMoldingEngine.calculate({ ...base, cooling_method: "air" }).cooling_time_min.value;
    const spray = rotationalMoldingEngine.calculate({ ...base, cooling_method: "water_spray" }).cooling_time_min.value;
    expect(spray).toBeLessThan(air);
  });
  it("PIAT > 0", () => {
    expect(rotationalMoldingEngine.calculate(base).PIAT_C.value).toBeGreaterThan(0);
  });
  it("charge weight > 0", () => {
    expect(rotationalMoldingEngine.calculate(base).charge_weight_kg.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(rotationalMoldingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ScrewExtrusionEngine", () => {
  const base = { screw_diameter_mm: 60 };
  it("throughput > 0", () => {
    expect(screwExtrusionEngine.calculate(base).throughput_kg_h.value).toBeGreaterThan(0);
  });
  it("higher RPM → higher throughput", () => {
    const t50 = screwExtrusionEngine.calculate({ ...base, screw_speed_rpm: 30 }).throughput_kg_h.value;
    const t200 = screwExtrusionEngine.calculate({ ...base, screw_speed_rpm: 300 }).throughput_kg_h.value;
    expect(t200).toBeGreaterThan(t50);
  });
  it("screw power > 0", () => {
    expect(screwExtrusionEngine.calculate(base).screw_power_kW.value).toBeGreaterThan(0);
  });
  it("die swell > 1", () => {
    expect(screwExtrusionEngine.calculate(base).die_swell_ratio.value).toBeGreaterThan(1);
  });
  it("shear rate > 0", () => {
    expect(screwExtrusionEngine.calculate(base).shear_rate_1_s.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(screwExtrusionEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CompressionMoldingEngine", () => {
  const base = { part_area_cm2: 200 };
  it("clamp force > 0", () => {
    expect(compressionMoldingEngine.calculate(base).clamp_force_kN.value).toBeGreaterThan(0);
  });
  it("cure time > 0", () => {
    expect(compressionMoldingEngine.calculate(base).cure_time_s.value).toBeGreaterThan(0);
  });
  it("positive mold less flash than flash mold", () => {
    const pos = compressionMoldingEngine.calculate({ ...base, mold_action: "positive" }).flash_thickness_mm.value;
    const fl = compressionMoldingEngine.calculate({ ...base, mold_action: "flash" }).flash_thickness_mm.value;
    expect(pos).toBeLessThan(fl);
  });
  it("charge weight > 0", () => {
    expect(compressionMoldingEngine.calculate(base).charge_weight_g.value).toBeGreaterThan(0);
  });
  it("shrinkage > 0", () => {
    expect(compressionMoldingEngine.calculate(base).shrinkage_pct.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(compressionMoldingEngine.calculate(base).recommendations)).toBe(true);
  });
});
