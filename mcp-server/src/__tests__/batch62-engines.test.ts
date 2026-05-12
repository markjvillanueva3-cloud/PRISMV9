/**
 * Batch 62 — EvaporatorDesign, CondenserDesign, DistillationColumn
 * @milestone FORGE-ENGINES-BATCH62
 */
import { describe, it, expect } from "vitest";
import { evaporatorDesignEngine } from "../engines/EvaporatorDesignEngine.js";
import { condenserDesignEngine } from "../engines/CondenserDesignEngine.js";
import { distillationColumnEngine } from "../engines/DistillationColumnEngine.js";

describe("EvaporatorDesignEngine", () => {
  const base = { feed_flow_kg_h: 5000 };
  it("heat transfer area > 0", () => {
    expect(evaporatorDesignEngine.calculate(base).heat_transfer_area_m2.value).toBeGreaterThan(0);
  });
  it("steam economy > 0", () => {
    expect(evaporatorDesignEngine.calculate(base).steam_economy.value).toBeGreaterThan(0);
  });
  it("more effects = better economy", () => {
    const s1 = evaporatorDesignEngine.calculate({ ...base, num_effects: 1 });
    const s3 = evaporatorDesignEngine.calculate({ ...base, num_effects: 3 });
    expect(s3.steam_economy.value).toBeGreaterThan(s1.steam_economy.value);
  });
  it("evaporation rate > 0", () => {
    expect(evaporatorDesignEngine.calculate(base).evaporation_rate_kg_h.value).toBeGreaterThan(0);
  });
  it("product flow < feed flow", () => {
    const r = evaporatorDesignEngine.calculate(base);
    expect(r.product_flow_kg_h.value).toBeLessThan(base.feed_flow_kg_h);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(evaporatorDesignEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("CondenserDesignEngine", () => {
  const base = { vapor_flow_kg_h: 2000 };
  it("heat duty > 0", () => {
    expect(condenserDesignEngine.calculate(base).heat_duty_kW.value).toBeGreaterThan(0);
  });
  it("cooling water flow > 0", () => {
    expect(condenserDesignEngine.calculate(base).cooling_water_flow_m3_h.value).toBeGreaterThan(0);
  });
  it("number of tubes > 0", () => {
    expect(condenserDesignEngine.calculate(base).number_of_tubes.value).toBeGreaterThan(0);
  });
  it("LMTD > 0", () => {
    expect(condenserDesignEngine.calculate(base).lmtd_C.value).toBeGreaterThan(0);
  });
  it("more vapor = more area", () => {
    const lo = condenserDesignEngine.calculate({ ...base, vapor_flow_kg_h: 500 });
    const hi = condenserDesignEngine.calculate({ ...base, vapor_flow_kg_h: 10000 });
    expect(hi.heat_transfer_area_m2.value).toBeGreaterThan(lo.heat_transfer_area_m2.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(condenserDesignEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("DistillationColumnEngine", () => {
  const base = { feed_flow_kmol_h: 100 };
  it("number of stages > 0", () => {
    expect(distillationColumnEngine.calculate(base).number_of_stages.value).toBeGreaterThan(0);
  });
  it("actual stages > minimum stages", () => {
    const r = distillationColumnEngine.calculate(base);
    expect(r.number_of_stages.value).toBeGreaterThan(r.minimum_stages.value);
  });
  it("reflux ratio > minimum reflux", () => {
    const r = distillationColumnEngine.calculate(base);
    expect(r.reflux_ratio.value).toBeGreaterThan(r.minimum_reflux.value);
  });
  it("column diameter > 0", () => {
    expect(distillationColumnEngine.calculate(base).column_diameter_mm.value).toBeGreaterThan(0);
  });
  it("condenser duty > 0", () => {
    expect(distillationColumnEngine.calculate(base).condenser_duty_kW.value).toBeGreaterThan(0);
  });
  it("reboiler duty > condenser duty", () => {
    const r = distillationColumnEngine.calculate(base);
    expect(r.reboiler_duty_kW.value).toBeGreaterThanOrEqual(r.condenser_duty_kW.value);
  });
  it("lower alpha = more stages", () => {
    const easy = distillationColumnEngine.calculate({ ...base, relative_volatility: 4 });
    const hard = distillationColumnEngine.calculate({ ...base, relative_volatility: 1.5 });
    expect(hard.number_of_stages.value).toBeGreaterThan(easy.number_of_stages.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(distillationColumnEngine.calculate(base).recommendations)).toBe(true);
  });
});
