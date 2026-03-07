/**
 * Tests for StockAllowanceEngine
 */
import { describe, it, expect } from "vitest";
import {
  StockAllowanceEngine,
} from "../engines/StockAllowanceEngine.js";

describe("StockAllowanceEngine", () => {
  const engine = new StockAllowanceEngine();

  it("calculates stock for 50mm steel part", () => {
    const r = engine.calculate({
      finished_dimension_mm: 50,
      material_type: "steel",
    });
    expect(r.raw_stock_size.value).toBeGreaterThan(50);
    expect(r.total_allowance.value).toBeGreaterThan(0);
    expect(r.roughing_allowance.value).toBeGreaterThan(0);
    expect(r.semi_finish_allowance.value).toBeGreaterThan(0);
    expect(r.finishing_allowance.value).toBeGreaterThan(0);
    expect(r.allowance_breakdown.length).toBeGreaterThan(0);
  });

  it("raw stock = finished + 2× total allowance", () => {
    const r = engine.calculate({
      finished_dimension_mm: 50,
    });
    expect(r.raw_stock_size.value).toBeCloseTo(
      50 + r.total_allowance.value * 2, 1
    );
  });

  it("larger part needs more allowance", () => {
    const small = engine.calculate({
      finished_dimension_mm: 20,
    });
    const large = engine.calculate({
      finished_dimension_mm: 200,
    });
    expect(large.roughing_allowance.value).toBeGreaterThan(
      small.roughing_allowance.value
    );
  });

  it("adds grinding allowance for tight tolerance", () => {
    const r = engine.calculate({
      finished_dimension_mm: 50,
      tolerance_mm: 0.01,
    });
    expect(r.grinding_allowance.value).toBeGreaterThan(0);
  });

  it("no grinding for loose tolerance without HT", () => {
    const r = engine.calculate({
      finished_dimension_mm: 50,
      tolerance_mm: 0.1,
      heat_treatment: "none",
    });
    expect(r.grinding_allowance.value).toBe(0);
  });

  it("adds heat treat distortion allowance", () => {
    const noHt = engine.calculate({
      finished_dimension_mm: 50,
      heat_treatment: "none",
    });
    const withHt = engine.calculate({
      finished_dimension_mm: 50,
      heat_treatment: "through_harden",
    });
    expect(withHt.heat_treat_distortion.value).toBeGreaterThan(
      noHt.heat_treat_distortion.value
    );
  });

  it("adds coating allowance", () => {
    const r = engine.calculate({
      finished_dimension_mm: 50,
      surface_treatment: "chrome_plate",
    });
    expect(r.coating_allowance.value).toBeGreaterThan(0);
  });

  it("no coating allowance when none", () => {
    const r = engine.calculate({
      finished_dimension_mm: 50,
      surface_treatment: "none",
    });
    expect(r.coating_allowance.value).toBe(0);
  });

  it("aluminum has higher distortion factor", () => {
    const steel = engine.calculate({
      finished_dimension_mm: 100,
      material_type: "steel",
      heat_treatment: "through_harden",
    });
    const alu = engine.calculate({
      finished_dimension_mm: 100,
      material_type: "aluminum",
      heat_treatment: "through_harden",
    });
    expect(alu.heat_treat_distortion.value).toBeGreaterThan(
      steel.heat_treat_distortion.value
    );
  });

  it("breakdown includes all active stages", () => {
    const r = engine.calculate({
      finished_dimension_mm: 50,
      heat_treatment: "case_harden",
      surface_treatment: "chrome_plate",
      tolerance_mm: 0.01,
    });
    const stages = r.allowance_breakdown.map(b => b.stage);
    expect(stages).toContain("Roughing");
    expect(stages).toContain("Semi-finish");
    expect(stages).toContain("Finishing");
    expect(stages).toContain("Grinding");
    expect(stages).toContain("Heat treat distortion");
    expect(stages).toContain("Coating compensation");
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      finished_dimension_mm: 50,
    });
    for (const key of [
      "raw_stock_size", "total_allowance",
      "roughing_allowance", "finishing_allowance",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { stockAllowanceEngine } = await import(
      "../engines/StockAllowanceEngine.js"
    );
    expect(stockAllowanceEngine).toBeInstanceOf(
      StockAllowanceEngine
    );
  });
});
