/**
 * Tests for HistoricalMaterialPriceEngine — JM-DIE-FINANCIAL-BASELINE-MS0 / U-JM02.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { HistoricalMaterialPriceEngine, type PriceRecord } from "../engines/HistoricalMaterialPriceEngine.js";

const SAMPLE: PriceRecord[] = [
  { month_year: "2020-01", material: "steel_a36", price_per_lb_usd: 0.42, source: "test" },
  { month_year: "2020-04", material: "steel_a36", price_per_lb_usd: 0.38, source: "test" },
  { month_year: "2020-07", material: "steel_a36", price_per_lb_usd: 0.41, source: "test" },
  { month_year: "2021-01", material: "steel_a36", price_per_lb_usd: 0.68, source: "test" },
  { month_year: "2020-01", material: "aluminum_6061", price_per_lb_usd: 0.78, source: "test" },
  { month_year: "2021-01", material: "copper_c110", price_per_lb_usd: 3.62, source: "test" },
  { month_year: "2022-01", material: "stainless_304", price_per_lb_usd: 2.74, source: "test" },
];

let eng: HistoricalMaterialPriceEngine;
beforeEach(() => {
  eng = new HistoricalMaterialPriceEngine();
  eng.loadFromInline(SAMPLE);
});

describe("HistoricalMaterialPriceEngine.lookup — exact match", () => {
  it("steel_a36 on 2020-01-15 → exact match $0.42 (Jan 2020 entry)", () => {
    const r = eng.lookup("steel_a36", "2020-01-15");
    expect(r.found).toBe(true);
    expect(r.match_type).toBe("exact");
    expect(r.price_per_lb_usd).toBe(0.42);
    expect(r.match_month_year).toBe("2020-01");
  });

  it("aluminum_6061 on 2020-01-01 → $0.78", () => {
    const r = eng.lookup("aluminum_6061", "2020-01-01");
    expect(r.found).toBe(true);
    expect(r.price_per_lb_usd).toBe(0.78);
  });
});

describe("HistoricalMaterialPriceEngine.lookup — nearest-prior fallback", () => {
  it("steel_a36 on 2020-05-15 → nearest-prior Apr 2020 $0.38", () => {
    const r = eng.lookup("steel_a36", "2020-05-15");
    expect(r.found).toBe(true);
    expect(r.match_type).toBe("nearest-prior");
    expect(r.match_month_year).toBe("2020-04");
    expect(r.price_per_lb_usd).toBe(0.38);
  });

  it("steel_a36 on 2020-12-31 → nearest-prior Jul 2020 $0.41 (closest prior, not Jan 2021)", () => {
    const r = eng.lookup("steel_a36", "2020-12-31");
    expect(r.found).toBe(true);
    expect(r.match_month_year).toBe("2020-07");
  });
});

describe("HistoricalMaterialPriceEngine.lookup — failure modes (R12 fail-loud)", () => {
  it("steel_a36 on a date BEFORE any data → found=false reason=no-prior-month-data-available", () => {
    const r = eng.lookup("steel_a36", "2019-01-01");
    expect(r.found).toBe(false);
    expect(r.reason).toBe("no-prior-month-data-available");
  });

  it("steel_a36 on a date 24 months past last → found=false reason=nearest-prior-too-far", () => {
    const r = eng.lookup("steel_a36", "2023-06-01");
    expect(r.found).toBe(false);
    expect(r.reason).toMatch(/nearest-prior-too-far/);
  });

  it("material with no data → found=false with explicit reason", () => {
    // @ts-expect-error testing runtime: pass unknown material
    const r = eng.lookup("unknown_metal", "2022-01-01");
    expect(r.found).toBe(false);
    expect(r.reason).toMatch(/no-price-data-for-material/);
  });

  it("invalid date format → found=false reason=invalid-date-format", () => {
    const r = eng.lookup("steel_a36", "not-a-date");
    expect(r.found).toBe(false);
    expect(r.reason).toMatch(/invalid-date-format/);
  });
});

describe("HistoricalMaterialPriceEngine — spanning materials (R12 variability floor)", () => {
  it("aluminum_6061 exact match works", () => {
    expect(eng.lookup("aluminum_6061", "2020-01-15").found).toBe(true);
  });
  it("copper_c110 exact match works", () => {
    expect(eng.lookup("copper_c110", "2021-01-15").found).toBe(true);
  });
  it("stainless_304 exact match works", () => {
    expect(eng.lookup("stainless_304", "2022-01-15").found).toBe(true);
  });
});

describe("HistoricalMaterialPriceEngine.supportedMaterials", () => {
  it("enumerates all 4 materials in the sample", () => {
    const mats = eng.supportedMaterials();
    expect(mats.length).toBe(4);
    expect(mats).toContain("steel_a36");
    expect(mats).toContain("aluminum_6061");
    expect(mats).toContain("copper_c110");
    expect(mats).toContain("stainless_304");
  });
});
