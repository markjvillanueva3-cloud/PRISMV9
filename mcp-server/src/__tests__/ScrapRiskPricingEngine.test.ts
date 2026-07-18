import { describe, it, expect } from "vitest";
import {
  scrapRiskPricingEngine as eng,
  ScrapRiskPricingEngine,
  type ScrapRiskPricingInput,
} from "../engines/ScrapRiskPricingEngine.js";

function nominal(o: Partial<ScrapRiskPricingInput> = {}): ScrapRiskPricingInput {
  return {
    ordered_qty: 100,
    material_cost_usd: 20,
    machining_cost_usd: 80,
    process_maturity: "proven_out",
    complexity: "moderate",
    ...o,
  };
}

describe("ScrapRiskPricingEngine", () => {
  it("exports singleton with estimate()", () => {
    expect(eng).toBeInstanceOf(ScrapRiskPricingEngine);
    expect(typeof eng.estimate).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.estimate({} as ScrapRiskPricingInput)).toThrow(/ordered_qty \+ material_cost_usd \+ machining_cost_usd required/);
  });

  it("throws on non-positive ordered_qty", () => {
    expect(() => eng.estimate(nominal({ ordered_qty: 0 }))).toThrow(/positive ordered_qty/);
    expect(() => eng.estimate(nominal({ ordered_qty: -1 }))).toThrow(/positive ordered_qty/);
  });

  it("throws on negative cost components", () => {
    expect(() => eng.estimate(nominal({ material_cost_usd: -1 }))).toThrow(/non-negative material \+ machining/);
    expect(() => eng.estimate(nominal({ machining_cost_usd: -1 }))).toThrow(/non-negative material \+ machining/);
  });

  it("throws on scrap rate >= 1.0 (invalid)", () => {
    expect(() => eng.estimate(nominal({ expected_scrap_rate: 1.0 }))).toThrow(/scrap rate.*>= 1\.0/);
    expect(() => eng.estimate(nominal({ expected_scrap_rate: 1.5 }))).toThrow(/scrap rate.*>= 1\.0/);
  });

  it("proven_out + moderate baseline: rate ≈ 0.015, verdict=acceptable", () => {
    const r = eng.estimate(nominal());
    expect(r.expected_scrap_rate.value).toBeCloseTo(0.015, 4);
    expect(r.verdict).toBe("acceptable");
  });

  it("first_article + high_complexity raises rate above baseline", () => {
    const r = eng.estimate(nominal({ process_maturity: "first_article", complexity: "high_complexity" }));
    // 0.03 + 0.025 = 0.055
    expect(r.expected_scrap_rate.value).toBeCloseTo(0.055, 4);
    expect(r.verdict).toBe("elevated");
  });

  it("explicit override beats auto-rating", () => {
    const r = eng.estimate(nominal({ expected_scrap_rate: 0.20 }));
    expect(r.expected_scrap_rate.value).toBe(0.20);
    expect(r.expected_scrap_rate.source).toMatch(/override/);
  });

  it("rate > 0.10 → verdict=high", () => {
    const r = eng.estimate(nominal({ expected_scrap_rate: 0.15 }));
    expect(r.verdict).toBe("high");
    expect(r.warnings.some(w => /verify capability/.test(w))).toBe(true);
  });

  it("rate > max_scrap_rate → verdict=reject", () => {
    const r = eng.estimate(nominal({ expected_scrap_rate: 0.30 }));
    expect(r.verdict).toBe("reject");
    expect(r.warnings.some(w => /REJECT quote/.test(w))).toBe(true);
  });

  it("scrap_factor = 1 / (1 - rate)", () => {
    const r = eng.estimate(nominal({ expected_scrap_rate: 0.10 }));
    expect(r.scrap_factor.value).toBeCloseTo(1.1111, 3);
  });

  it("parts_required = ⌈ordered × factor⌉", () => {
    // 100 ordered × 1.1111 = 111.11 → 112
    const r = eng.estimate(nominal({ ordered_qty: 100, expected_scrap_rate: 0.10 }));
    expect(r.parts_required.value).toBe(112);
  });

  it("markup formula: scrap_loss / good_part_cost × 100", () => {
    // rate=0.10, scrap_factor=1.1111, good_part=$100, scrap_loss=$11.11, markup=11.11%
    const r = eng.estimate(nominal({ expected_scrap_rate: 0.10 }));
    expect(r.scrap_loss_per_good_part.value).toBeCloseTo(11.111, 2);
    expect(r.markup_pct.value).toBeCloseTo(11.11, 1);
  });

  it("recommended_sell_price = good_part × scrap_factor", () => {
    const r = eng.estimate(nominal({ expected_scrap_rate: 0.10 }));
    // 100 × 1.1111 = 111.11
    expect(r.recommended_sell_price_usd.value).toBeCloseTo(111.11, 1);
  });

  it("Cpk < 1.0 adds 3% to rate", () => {
    const r = eng.estimate(nominal({ cpk: 0.8 }));
    // baseline 0.015 + cpk-shortfall 0.03 = 0.045
    expect(r.expected_scrap_rate.value).toBeCloseTo(0.045, 4);
    expect(r.risk_contributions.some(c => /cpk:0.80/.test(c.driver))).toBe(true);
  });

  it("Cpk 1.0-1.33 adds 1.5%", () => {
    const r = eng.estimate(nominal({ cpk: 1.1 }));
    expect(r.expected_scrap_rate.value).toBeCloseTo(0.030, 4);  // 0.015 + 0.015
  });

  it("Cpk ≥ 1.33 adds 0% (in-spec process)", () => {
    const r = eng.estimate(nominal({ cpk: 1.5 }));
    expect(r.expected_scrap_rate.value).toBeCloseTo(0.015, 4);
  });

  it("exotic material adds 1.5%", () => {
    const r = eng.estimate(nominal({ is_exotic_material: true }));
    expect(r.expected_scrap_rate.value).toBeCloseTo(0.030, 4);
    expect(r.risk_contributions.some(c => /exotic_material/.test(c.driver))).toBe(true);
  });

  it("inexperienced operator (<1yr) adds 1.5%", () => {
    const r = eng.estimate(nominal({ operator_experience_years: 0.5 }));
    expect(r.expected_scrap_rate.value).toBeCloseTo(0.030, 4);
    expect(r.risk_contributions.some(c => /operator/.test(c.driver))).toBe(true);
  });

  it("compound risk drivers stack additively (worst case)", () => {
    // first_article(.03) + high_complexity(.025) + cpk<1(.03) + exotic(.015) + new_op(.015) = 0.115
    const r = eng.estimate(nominal({
      process_maturity: "first_article",
      complexity: "high_complexity",
      cpk: 0.8,
      is_exotic_material: true,
      operator_experience_years: 0.3,
    }));
    expect(r.expected_scrap_rate.value).toBeCloseTo(0.115, 3);
    expect(r.verdict).toBe("high");
    expect(r.risk_contributions.length).toBe(5);
  });

  it("first_article + qty < 5 → recommend NCR-allowance warning", () => {
    const r = eng.estimate(nominal({ ordered_qty: 3, process_maturity: "first_article" }));
    expect(r.warnings.some(w => /NCR-allowance/.test(w))).toBe(true);
  });

  it("zero-cost path: markup=0 even with non-zero scrap rate", () => {
    const r = eng.estimate(nominal({ material_cost_usd: 0, machining_cost_usd: 0, expected_scrap_rate: 0.10 }));
    expect(r.markup_pct.value).toBe(0);
    expect(r.scrap_loss_per_good_part.value).toBe(0);
  });

  it("source cites AIAG SPC + ASME B89.7.5 + Boothroyd-Dewhurst", () => {
    const r = eng.estimate(nominal());
    expect(r.source).toMatch(/AIAG|ASME B89.7.5|Boothroyd-Dewhurst/);
  });
});
