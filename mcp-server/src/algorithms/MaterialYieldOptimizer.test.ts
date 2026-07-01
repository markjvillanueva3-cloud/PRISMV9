import { describe, it, expect } from "vitest";
import { optimize, MaterialYieldOptimizer, type MaterialYieldInput } from "./MaterialYieldOptimizer.js";

describe("MaterialYieldOptimizer", () => {
  it("bar-round: 100mm parts in 1000mm bar with 5mm cutoff → 9 parts", () => {
    // bar: 1000 / (100 + 5) = 9 parts
    const r = optimize({ stock_form: "bar_round", part_x_mm: 25, part_y_mm: 25, part_z_mm: 100, stock_x_mm: 25, stock_y_mm: 25, stock_z_mm: 1000, cost_per_kg_usd: 5 });
    expect(r.parts_per_stock.value).toBe(9);
  });
  it("plate: 50×50 parts on 200×200 plate → 16 parts (4×4 grid)", () => {
    const r = optimize({ stock_form: "plate", part_x_mm: 50, part_y_mm: 50, part_z_mm: 10, stock_x_mm: 200, stock_y_mm: 200, stock_z_mm: 10, cost_per_kg_usd: 5, cutoff_loss_mm: 0 });
    expect(r.parts_per_stock.value).toBe(16);
  });
  it("plate: rotation tested — 50×100 parts on 200×200 → 8 parts (best fit)", () => {
    const r = optimize({ stock_form: "plate", part_x_mm: 50, part_y_mm: 100, part_z_mm: 10, stock_x_mm: 200, stock_y_mm: 200, stock_z_mm: 10, cost_per_kg_usd: 5, cutoff_loss_mm: 0 });
    expect(r.parts_per_stock.value).toBe(8);
  });
  it("sheet: same algorithm as plate", () => {
    const r = optimize({ stock_form: "sheet", part_x_mm: 50, part_y_mm: 50, part_z_mm: 3, stock_x_mm: 200, stock_y_mm: 200, stock_z_mm: 3, cost_per_kg_usd: 5, cutoff_loss_mm: 0 });
    expect(r.parts_per_stock.value).toBe(16);
  });
  it("stock too small for one part → 0 parts + warning", () => {
    const r = optimize({ stock_form: "plate", part_x_mm: 500, part_y_mm: 500, part_z_mm: 10, stock_x_mm: 200, stock_y_mm: 200, stock_z_mm: 10, cost_per_kg_usd: 5 });
    expect(r.parts_per_stock.value).toBe(0);
    expect(r.notes.join("|")).toContain("none fit");
  });
  it("high waste (>50%) emits batch-up note when part-to-stock ratio is awkward", () => {
    // 110×110 part barely fits one per 200×200 stock; (200/115)·(200/115) = 1·1 = 1 part
    // Used = 1·110·110·10 = 121k. Stock vol = 200·200·10 = 400k. Waste = (400-121)/400 = 70%.
    const r = optimize({ stock_form: "plate", part_x_mm: 110, part_y_mm: 110, part_z_mm: 10, stock_x_mm: 200, stock_y_mm: 200, stock_z_mm: 10, cost_per_kg_usd: 5 });
    expect(r.waste_pct.value).toBeGreaterThan(50);
    expect(r.notes.join("|")).toContain("waste");
  });
  it("stock_cost = volume × density × cost_per_kg", () => {
    // 100×100×10 mm³ × 7.85 g/cm³ × 1e-6 = 0.785 kg × $5/kg = $3.925
    const r = optimize({ stock_form: "plate", part_x_mm: 50, part_y_mm: 50, part_z_mm: 10, stock_x_mm: 100, stock_y_mm: 100, stock_z_mm: 10, cost_per_kg_usd: 5 });
    expect(r.stock_cost_usd.value).toBeCloseTo(0.785 * 5, 2);
  });
  it("cost_per_part = stock_cost / parts_per_stock", () => {
    const r = optimize({ stock_form: "plate", part_x_mm: 50, part_y_mm: 50, part_z_mm: 10, stock_x_mm: 200, stock_y_mm: 200, stock_z_mm: 10, cost_per_kg_usd: 5, cutoff_loss_mm: 0 });
    expect(r.cost_per_part_usd.value).toBeCloseTo(r.stock_cost_usd.value / 16, 2);
  });
  it("custom density (e.g. aluminum 2.70) reflected in cost", () => {
    const r = optimize({ stock_form: "plate", part_x_mm: 50, part_y_mm: 50, part_z_mm: 10, stock_x_mm: 100, stock_y_mm: 100, stock_z_mm: 10, cost_per_kg_usd: 5, density_g_cm3: 2.70 });
    expect(r.stock_cost_usd.value).toBeCloseTo(0.27 * 5, 2);
  });
  it("unknown stock_form diagnostic", () => {
    expect(optimize({ stock_form: "tube" as MaterialYieldInput["stock_form"], part_x_mm: 10, part_y_mm: 10, part_z_mm: 10, stock_x_mm: 100, stock_y_mm: 100, stock_z_mm: 100, cost_per_kg_usd: 5 }).notes.join("|")).toContain("unknown stock_form");
  });
  it("zero dimension diagnostic", () => {
    expect(optimize({ stock_form: "plate", part_x_mm: 0, part_y_mm: 10, part_z_mm: 10, stock_x_mm: 100, stock_y_mm: 100, stock_z_mm: 10, cost_per_kg_usd: 5 }).notes.join("|")).toContain("outside");
  });
  it("zero cost diagnostic", () => {
    expect(optimize({ stock_form: "plate", part_x_mm: 50, part_y_mm: 50, part_z_mm: 10, stock_x_mm: 200, stock_y_mm: 200, stock_z_mm: 10, cost_per_kg_usd: 0 }).notes.join("|")).toContain("outside");
  });
  it("missing input diagnostic", () => {
    expect(optimize(null as unknown as MaterialYieldInput).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(MaterialYieldOptimizer.version).toBe("1.0.0");
  });
});
