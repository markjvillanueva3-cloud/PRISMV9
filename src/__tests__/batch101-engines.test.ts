/**
 * Batch 101 — EvaporatorProcess, SprayDrying, GranulationProcess
 * @milestone FORGE-ENGINES-BATCH101
 */
import { describe, it, expect } from "vitest";
import { evaporatorProcessEngine } from "../engines/EvaporatorProcessEngine.js";
import { sprayDryingEngine } from "../engines/SprayDryingEngine.js";
import { granulationProcessEngine } from "../engines/GranulationProcessEngine.js";

describe("EvaporatorProcessEngine", () => {
  const base = { feed_rate_kg_h: 1000 };
  it("evaporation rate > 0", () => {
    expect(evaporatorProcessEngine.calculate(base).evaporation_rate_kg_h.value).toBeGreaterThan(0);
  });
  it("steam economy > 0", () => {
    expect(evaporatorProcessEngine.calculate(base).steam_economy.value).toBeGreaterThan(0);
  });
  it("multi-effect better economy", () => {
    const s1 = evaporatorProcessEngine.calculate({ ...base, type: "single_effect" }).steam_economy.value;
    const s3 = evaporatorProcessEngine.calculate({ ...base, type: "triple_effect" }).steam_economy.value;
    expect(s3).toBeGreaterThan(s1);
  });
  it("product rate < feed rate", () => {
    const r = evaporatorProcessEngine.calculate(base);
    expect(r.product_rate_kg_h.value).toBeLessThan(1000);
  });
  it("heat transfer area > 0", () => {
    expect(evaporatorProcessEngine.calculate(base).heat_transfer_area_m2.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(evaporatorProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("SprayDryingEngine", () => {
  const base = { feed_rate_kg_h: 100 };
  it("evaporation rate > 0", () => {
    expect(sprayDryingEngine.calculate(base).evaporation_rate_kg_h.value).toBeGreaterThan(0);
  });
  it("particle size > 0", () => {
    expect(sprayDryingEngine.calculate(base).particle_size_um.value).toBeGreaterThan(0);
  });
  it("rotary produces larger than two-fluid", () => {
    const rot = sprayDryingEngine.calculate({ ...base, atomizer: "rotary" }).particle_size_um.value;
    const tf = sprayDryingEngine.calculate({ ...base, atomizer: "two_fluid" }).particle_size_um.value;
    expect(rot).toBeGreaterThan(tf);
  });
  it("thermal efficiency 30-80%", () => {
    const eff = sprayDryingEngine.calculate(base).thermal_efficiency_pct.value;
    expect(eff).toBeGreaterThan(30);
    expect(eff).toBeLessThan(80);
  });
  it("chamber volume > 0", () => {
    expect(sprayDryingEngine.calculate(base).chamber_volume_m3.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(sprayDryingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("GranulationProcessEngine", () => {
  const base = { batch_size_kg: 50 };
  it("granule size > 0", () => {
    expect(granulationProcessEngine.calculate(base).granule_size_mm.value).toBeGreaterThan(0);
  });
  it("tip speed > 0", () => {
    expect(granulationProcessEngine.calculate(base).impeller_tip_speed_m_s.value).toBeGreaterThan(0);
  });
  it("process time > 0", () => {
    expect(granulationProcessEngine.calculate(base).process_time_min.value).toBeGreaterThan(0);
  });
  it("porosity > 0", () => {
    expect(granulationProcessEngine.calculate(base).porosity_pct.value).toBeGreaterThan(0);
  });
  it("roller compaction has no binder", () => {
    expect(granulationProcessEngine.calculate({ ...base, type: "roller_compaction" }).binder_volume_L.value).toBe(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(granulationProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});
