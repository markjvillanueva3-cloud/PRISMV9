import { describe, it, expect } from "vitest";
import { compute, CustomerLtvDcf, type LtvInput } from "./CustomerLtvDcf.js";

describe("CustomerLtvDcf", () => {
  it("perfect retention + zero discount → LTV = horizon × margin", () => {
    const r = compute({ annual_margin_usd: 1000, retention_rate: 1.0, discount_rate: 0, horizon_years: 5 });
    expect(r.ltv_usd.value).toBeCloseTo(5000, 0);
  });
  it("10% discount, perfect retention, 1 year → LTV = margin/1.1", () => {
    const r = compute({ annual_margin_usd: 1100, retention_rate: 1.0, discount_rate: 0.10, horizon_years: 1 });
    expect(r.ltv_usd.value).toBeCloseTo(1000, 0);
  });
  it("retention decay reduces LTV: 0.8 retention < 1.0 retention", () => {
    const high = compute({ annual_margin_usd: 1000, retention_rate: 1.0, discount_rate: 0.10, horizon_years: 10 });
    const low = compute({ annual_margin_usd: 1000, retention_rate: 0.8, discount_rate: 0.10, horizon_years: 10 });
    expect(low.ltv_usd.value).toBeLessThan(high.ltv_usd.value);
  });
  it("margin growth increases LTV", () => {
    const flat = compute({ annual_margin_usd: 1000, retention_rate: 0.9, discount_rate: 0.10, horizon_years: 10 });
    const grow = compute({ annual_margin_usd: 1000, retention_rate: 0.9, discount_rate: 0.10, horizon_years: 10, margin_growth_rate: 0.05 });
    expect(grow.ltv_usd.value).toBeGreaterThan(flat.ltv_usd.value);
  });
  it("CAC=0 → LTV/CAC ratio = 0 (infinite, returned as 0)", () => {
    const r = compute({ annual_margin_usd: 1000, retention_rate: 0.9, discount_rate: 0.10, horizon_years: 5 });
    expect(r.ltv_to_cac_ratio.value).toBe(0);
  });
  it("CAC < LTV/3 → healthy ratio + payback", () => {
    const r = compute({ annual_margin_usd: 5000, retention_rate: 0.9, discount_rate: 0.10, horizon_years: 10, acquisition_cost_usd: 5000 });
    expect(r.ltv_to_cac_ratio.value).toBeGreaterThan(3);
  });
  it("CAC > LTV → warning + ratio < 1", () => {
    const r = compute({ annual_margin_usd: 100, retention_rate: 0.5, discount_rate: 0.10, horizon_years: 5, acquisition_cost_usd: 5000 });
    expect(r.ltv_to_cac_ratio.value).toBeLessThan(1);
    expect(r.notes.join("|")).toContain("below healthy threshold");
  });
  it("max_acquisition_cost = LTV / 3 (healthy threshold)", () => {
    const r = compute({ annual_margin_usd: 1000, retention_rate: 1.0, discount_rate: 0, horizon_years: 3 });
    expect(r.max_acquisition_cost_usd.value).toBeCloseTo(3000 / 3, 1);
  });
  it("per_year_breakdown has horizon entries with decreasing retention", () => {
    const r = compute({ annual_margin_usd: 1000, retention_rate: 0.8, discount_rate: 0.10, horizon_years: 5 });
    expect(r.per_year_breakdown.length).toBe(5);
    expect(r.per_year_breakdown[0].retention).toBeCloseTo(1.0, 4);
    expect(r.per_year_breakdown[4].retention).toBeCloseTo(Math.pow(0.8, 4), 4);
  });
  it("retention 0 → only year-1 margin counts", () => {
    const r = compute({ annual_margin_usd: 1000, retention_rate: 0, discount_rate: 0, horizon_years: 5 });
    expect(r.ltv_usd.value).toBe(1000);
  });
  it("retention out of range diagnostic", () => {
    expect(compute({ annual_margin_usd: 1000, retention_rate: 1.5, discount_rate: 0.1, horizon_years: 5 }).notes.join("|")).toContain("outside");
  });
  it("discount > 0.5 diagnostic", () => {
    expect(compute({ annual_margin_usd: 1000, retention_rate: 0.9, discount_rate: 0.8, horizon_years: 5 }).notes.join("|")).toContain("outside");
  });
  it("horizon out of range diagnostic", () => {
    expect(compute({ annual_margin_usd: 1000, retention_rate: 0.9, discount_rate: 0.10, horizon_years: 50 }).notes.join("|")).toContain("outside");
  });
  it("negative margin diagnostic", () => {
    expect(compute({ annual_margin_usd: -100, retention_rate: 0.9, discount_rate: 0.10 }).notes.join("|")).toContain("outside");
  });
  it("missing input diagnostic", () => {
    expect(compute(null as unknown as LtvInput).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(CustomerLtvDcf.version).toBe("1.0.0");
  });
});
