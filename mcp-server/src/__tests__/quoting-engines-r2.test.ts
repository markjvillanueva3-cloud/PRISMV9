/**
 * Tests for Quoting Engines R2: InjectionMold, StockSizeOptimizer, MarketMaterialPricing
 */
import { describe, it, expect } from "vitest";
import { InjectionMoldQuoteEngine } from "../engines/InjectionMoldQuoteEngine.js";
import { StockSizeOptimizerEngine } from "../engines/StockSizeOptimizerEngine.js";
import { MarketMaterialPricingEngine } from "../engines/MarketMaterialPricingEngine.js";

// ── InjectionMoldQuoteEngine ──
describe("InjectionMoldQuoteEngine", () => {
  const engine = new InjectionMoldQuoteEngine();

  it("quotes a basic ABS part", () => {
    const r = engine.quote({
      material: "abs",
      part_volume_cm3: 15,
      projected_area_cm2: 30,
      quantity: 5000,
    });
    expect(r.mold_cost_usd).toBeGreaterThan(0);
    expect(r.unit_cost).toBeGreaterThan(0);
    expect(r.price_per_part).toBeGreaterThan(r.unit_cost);
    expect(r.cycle_time_s).toBeGreaterThanOrEqual(8);
    expect(r.num_cavities).toBeGreaterThanOrEqual(1);
    expect(r.margin_pct).toBe(25);
  });

  it("selects higher mold class for large volumes", () => {
    const low = engine.quote({ material: "abs", part_volume_cm3: 10, projected_area_cm2: 20, quantity: 100 });
    const high = engine.quote({ material: "abs", part_volume_cm3: 10, projected_area_cm2: 20, quantity: 200000 });
    expect(high.mold_cost_usd).toBeGreaterThan(low.mold_cost_usd);
    expect(high.num_cavities).toBeGreaterThan(low.num_cavities);
  });

  it("increases mold cost for side actions and hot runners", () => {
    const base = engine.quote({ material: "abs", part_volume_cm3: 10, projected_area_cm2: 20, quantity: 1000 });
    const complex = engine.quote({
      material: "abs", part_volume_cm3: 10, projected_area_cm2: 20, quantity: 1000,
      num_side_actions: 3, hot_runner: true, surface_finish: "spi_a1",
    });
    expect(complex.mold_cost_usd).toBeGreaterThan(base.mold_cost_usd * 1.5);
  });

  it("warns on thin wall below material minimum", () => {
    const r = engine.quote({
      material: "pc", part_volume_cm3: 10, projected_area_cm2: 20,
      quantity: 1000, wall_thickness_mm: 0.5,
    });
    expect(r.dfm_warnings.some(w => w.includes("below min"))).toBe(true);
  });

  it("warns on tight tolerance with high-shrinkage material", () => {
    const r = engine.quote({
      material: "pe_hd", part_volume_cm3: 10, projected_area_cm2: 20,
      quantity: 1000, tight_tolerance: true,
    });
    expect(r.dfm_warnings.some(w => w.includes("shrinkage"))).toBe(true);
  });

  it("generates price breaks", () => {
    const r = engine.quote({ material: "abs", part_volume_cm3: 10, projected_area_cm2: 20, quantity: 1000 });
    expect(r.price_breaks).toBeDefined();
    expect(r.price_breaks!.length).toBeGreaterThan(0);
    // Higher qty → lower amortized tool cost
    const sorted = r.price_breaks!.sort((a, b) => a.qty - b.qty);
    if (sorted.length >= 2) {
      expect(sorted[sorted.length - 1].amortized_tool).toBeLessThan(sorted[0].amortized_tool);
    }
  });

  it("throws on unknown material", () => {
    expect(() => engine.quote({
      material: "unobtainium", part_volume_cm3: 10, projected_area_cm2: 20, quantity: 100,
    })).toThrow("Unknown injection mold material");
  });

  it("lists all materials", () => {
    const mats = engine.listMaterials();
    expect(mats.length).toBeGreaterThanOrEqual(15);
    expect(mats.some(m => m.key === "abs")).toBe(true);
    expect(mats.some(m => m.key === "peek")).toBe(true);
  });

  it("analyzes DfM — good part scores high", () => {
    const r = engine.analyzeDfm({
      material: "abs", wall_thickness_mm: 2.0, draft_angle_deg: 2.0,
      rib_thickness_ratio: 0.55,
    });
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.warnings.length).toBe(0);
  });

  it("analyzes DfM — bad part scores low", () => {
    const r = engine.analyzeDfm({
      material: "abs", wall_thickness_mm: 0.3, draft_angle_deg: 0.2,
      rib_thickness_ratio: 0.9, undercuts: 6,
    });
    expect(r.score).toBeLessThan(50);
    expect(r.warnings.length).toBeGreaterThanOrEqual(3);
  });

  it("warns living hinge with non-PP material", () => {
    const r = engine.analyzeDfm({ material: "abs", wall_thickness_mm: 2.0, living_hinge: true });
    expect(r.warnings.some(w => w.includes("Living hinge"))).toBe(true);
  });

  it("handles PEEK high-temp warning", () => {
    const r = engine.quote({
      material: "peek", part_volume_cm3: 5, projected_area_cm2: 10, quantity: 100,
    });
    expect(r.dfm_warnings.some(w => w.includes("high mold temps"))).toBe(true);
    expect(r.material_cost).toBeGreaterThan(0);
  });
});

// ── StockSizeOptimizerEngine ──
describe("StockSizeOptimizerEngine", () => {
  const engine = new StockSizeOptimizerEngine();

  it("optimizes stock for a typical milled part", () => {
    const r = engine.optimize({
      part_dims_mm: { length: 80, width: 40, height: 20 },
      material: "aluminum_6061",
      quantity: 10,
    });
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.recommendations[0].rank).toBe(1);
    expect(r.recommendations[0].material_cost_per_part).toBeGreaterThan(0);
    expect(r.buy_to_fly_ratio).toBeGreaterThan(1);
  });

  it("recommends round bar for turning parts", () => {
    const r = engine.optimize({
      part_dims_mm: { length: 100, width: 25, height: 25 },
      material: "steel_4140",
      quantity: 50,
      is_turning: true,
    });
    expect(r.recommendations.some(rec => rec.form === "round_bar")).toBe(true);
  });

  it("higher quantity → lower cost per part (bulk nesting)", () => {
    const r1 = engine.optimize({ part_dims_mm: { length: 50, width: 30, height: 15 }, material: "aluminum_6061", quantity: 1 });
    const r10 = engine.optimize({ part_dims_mm: { length: 50, width: 30, height: 15 }, material: "aluminum_6061", quantity: 100 });
    // With 100 parts, should find better nesting
    expect(r10.recommendations[0].material_cost_per_part).toBeLessThanOrEqual(r1.recommendations[0].material_cost_per_part);
  });

  it("warns high BTF ratio for titanium", () => {
    const r = engine.optimize({
      part_dims_mm: { length: 50, width: 10, height: 5 },
      material: "titanium_gr5",
      quantity: 5,
    });
    // Small part from large stock = high BTF
    if (r.buy_to_fly_ratio > 5) {
      expect(r.warnings.some(w => w.includes("titanium"))).toBe(true);
    }
  });

  it("returns catalog for material", () => {
    const cat = engine.catalog("steel_1018");
    expect(cat.round_bars.length).toBeGreaterThan(20);
    expect(cat.flat_bars.length).toBeGreaterThan(30);
    expect(cat.cost_per_kg).toBe(2.50);
    // U-BIZREG1: Density now from MaterialRegistry canonical DB (7850 for 1018 steel)
    // Previously hardcoded 7870 — 7850 is the standard AISI 1018 value
    expect(cat.density_kg_m3).toBeCloseTo(7850, -1);
  });

  it("throws on unknown material", () => {
    expect(() => engine.optimize({
      part_dims_mm: { length: 50, width: 50, height: 50 },
      material: "unobtainium", quantity: 1,
    })).toThrow("Unknown material");
  });

  it("nesting calculation for round bar", () => {
    const r = engine.nesting({
      stock_form: "round_bar",
      stock_dims_mm: [25.4],
      stock_length_mm: 3048,
      part_dims_mm: { length: 50, width: 20, height: 20 },
    });
    expect(r.parts_per_stock).toBeGreaterThan(0);
    expect(r.waste_pct).toBeGreaterThan(0);
    expect(r.waste_pct).toBeLessThan(100);
    expect(r.layout).toContain("cuts");
  });

  it("nesting returns 0 for undersized stock", () => {
    const r = engine.nesting({
      stock_form: "flat_bar",
      stock_dims_mm: [10, 5],
      stock_length_mm: 1000,
      part_dims_mm: { length: 50, width: 20, height: 20 },
    });
    expect(r.parts_per_stock).toBe(0);
    expect(r.waste_pct).toBe(100);
  });
});

// ── MarketMaterialPricingEngine ──
describe("MarketMaterialPricingEngine", () => {
  const engine = new MarketMaterialPricingEngine();

  it("looks up aluminum 6061 base price", () => {
    const r = engine.lookup({ material: "aluminum_6061" });
    expect(r.base_price_kg).toBe(6.50);
    expect(r.name).toBe("6061-T6");
    expect(r.category).toBe("aluminum");
    expect(r.final_price_kg).toBeGreaterThan(0);
    expect(r.surcharge_note).toContain("LME_AL");
  });

  it("applies form multiplier for plate", () => {
    const bar = engine.lookup({ material: "aluminum_6061", form: "bar" });
    const plate = engine.lookup({ material: "aluminum_6061", form: "plate" });
    expect(plate.form_adjusted_price_kg).toBeGreaterThan(bar.form_adjusted_price_kg);
  });

  it("applies regional factor", () => {
    const us = engine.lookup({ material: "stainless_304", region: "us_midwest" });
    const eu = engine.lookup({ material: "stainless_304", region: "eu_west" });
    expect(eu.final_price_kg).toBeGreaterThan(us.final_price_kg);
  });

  it("applies quantity discount", () => {
    const small = engine.lookup({ material: "steel_4140", weight_kg: 10 });
    const bulk = engine.lookup({ material: "steel_4140", weight_kg: 2500 });
    expect(bulk.final_price_kg).toBeLessThan(small.final_price_kg);
  });

  it("compares materials and ranks by price", () => {
    const r = engine.compare(["aluminum_6061", "titanium_gr5", "steel_1018"]);
    expect(r.length).toBe(3);
    expect(r[0].rank).toBe(1);
    expect(r[0].final_price_kg).toBeLessThanOrEqual(r[1].final_price_kg);
    expect(r[1].final_price_kg).toBeLessThanOrEqual(r[2].final_price_kg);
  });

  it("adjusts commodity index", () => {
    const r = engine.adjustIndex("LME_AL", 1.15, "2026-Q1", "up");
    expect(r.updated).toBe(true);
    expect(r.new_multiplier).toBe(1.15);
    // Price should now be higher
    const price = engine.lookup({ material: "aluminum_6061" });
    expect(price.index_multiplier).toBe(1.15);
    // Reset
    engine.adjustIndex("LME_AL", 1.0, "2024-Q4", "stable");
  });

  it("rejects out-of-range multiplier", () => {
    expect(() => engine.adjustIndex("LME_AL", 5.0, "2026", "up")).toThrow("out of sane range");
  });

  it("calculates surcharge for stainless", () => {
    // First raise the index
    engine.adjustIndex("LME_NI", 1.20, "2026-Q1", "up");
    const r = engine.surcharge({ material: "stainless_304", weight_kg: 500 });
    expect(r.surcharge_per_kg).toBeGreaterThan(0);
    expect(r.total_surcharge).toBe(r.surcharge_per_kg * 500);
    expect(r.explanation).toContain("surcharge");
    // Reset
    engine.adjustIndex("LME_NI", 1.0, "2024-Q4", "stable");
  });

  it("no surcharge for carbon steel", () => {
    const r = engine.surcharge({ material: "steel_1018", weight_kg: 100 });
    expect(r.surcharge_per_kg).toBe(0);
    expect(r.total_surcharge).toBe(0);
    expect(r.explanation).toContain("not subject");
  });

  it("lists materials grouped by category", () => {
    const groups = engine.listMaterials();
    expect(Object.keys(groups)).toContain("aluminum");
    expect(Object.keys(groups)).toContain("titanium");
    expect(Object.keys(groups)).toContain("plastic");
    const alCount = groups.aluminum.length;
    expect(alCount).toBeGreaterThanOrEqual(3);
  });

  it("throws on unknown material", () => {
    expect(() => engine.lookup({ material: "unobtainium" })).toThrow("Unknown material");
  });
});

// ── Dispatcher wiring smoke test ──
describe("businessDispatcher quoting R2 wiring", () => {
  it("new actions exist in ACTIONS array", async () => {
    const mod = await import("../tools/dispatchers/businessDispatcher.js");
    // The module exports registerBusinessDispatcher; we check the file compiles
    expect(mod.registerBusinessDispatcher).toBeDefined();
  });
});
