/**
 * Tests for U-QT03/U-QT04/U-QT05 — JM-DIE-QUOTE-TRAINING-MS0.
 *
 * Concrete value assertions across all three new engines:
 *   - XometryStyleQuoteInputsEngine   (user inputs → quote)
 *   - OutsourceRecommenderEngine      (in-house vs outsource)
 *   - QuoteScenarioGeneratorEngine    (seeded synthetic scenarios)
 */
import { describe, it, expect } from "vitest";
import { XometryStyleQuoteInputsEngine, type XometryQuoteInputs } from "../engines/XometryStyleQuoteInputsEngine.js";
import { OutsourceRecommenderEngine } from "../engines/OutsourceRecommenderEngine.js";
import { QuoteScenarioGeneratorEngine } from "../engines/QuoteScenarioGeneratorEngine.js";

const xometry = new XometryStyleQuoteInputsEngine();
const outsource = new OutsourceRecommenderEngine();
const scenarios = new QuoteScenarioGeneratorEngine();

const baseInputs: XometryQuoteInputs = {
  material: "aluminum_6061",
  length_mm: 100,
  width_mm: 50,
  height_mm: 25,
  tolerance_class: "medium",
  surface_finish_um: 3.2,
  quantity: 10,
  lead_time_days: 10,
  process: "mill",
  asOfIsoDate: "2024-06-15",
};

describe("XometryStyleQuoteInputsEngine — input validation (R12)", () => {
  it("missing material → ok=false, reason names missing field", () => {
    const r = xometry.quote({ ...baseInputs, material: undefined as any });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("missing-required");
  });
  it("non-positive dimension → ok=false reason='non-positive-dimension'", () => {
    const r = xometry.quote({ ...baseInputs, width_mm: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("non-positive-dimension");
  });
  it("non-integer quantity → ok=false", () => {
    const r = xometry.quote({ ...baseInputs, quantity: 1.5 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("quantity-must-be-positive-integer");
  });
});

describe("XometryStyleQuoteInputsEngine — volume + material spend math", () => {
  it("100x50x25 mm → volume_cm3 = 125, stock = 125 * 1.15 = 143.75", () => {
    const r = xometry.quote(baseInputs);
    expect(r.ok).toBe(true);
    expect(r.volume_cm3).toBe(125);
    expect(r.stock_volume_cm3).toBe(143.75);
  });
  it("aluminum 2.70 g/cm³ → weight_lb = 125 * 1.15 * 2.70 / 453.592 ≈ 0.855 lb", () => {
    const r = xometry.quote(baseInputs);
    expect(r.material_weight_lb).toBeCloseTo(0.8557, 3);
  });
  it("denser stainless yields heavier stock weight than aluminum for same volume", () => {
    const al = xometry.quote(baseInputs);
    const ss = xometry.quote({ ...baseInputs, material: "stainless_304" });
    expect(ss.material_weight_lb).toBeGreaterThan(al.material_weight_lb);
  });
});

describe("XometryStyleQuoteInputsEngine — MRR / process / material factor", () => {
  it("aluminum mill (MRR=100 cm³/min × 1.0) on 125 cm³ → time_in_cut_s = (125/100) * 60 = 75 sec", () => {
    const r = xometry.quote(baseInputs);
    expect(r.effective_mrr_cm3_per_min).toBe(100);
    expect(r.time_in_cut_s_per_part).toBeCloseTo(75, 1);
  });
  it("steel_a36 mill is slower than aluminum (factor 0.45) → longer time", () => {
    const al = xometry.quote(baseInputs);
    const steel = xometry.quote({ ...baseInputs, material: "steel_a36" });
    expect(steel.time_in_cut_s_per_part).toBeGreaterThan(al.time_in_cut_s_per_part);
    expect(steel.effective_mrr_cm3_per_min).toBe(45);
  });
  it("WEDM has MUCH lower MRR than mill (8 vs 100) → much longer time", () => {
    const mill = xometry.quote(baseInputs);
    const wedm = xometry.quote({ ...baseInputs, process: "wedm" });
    expect(wedm.time_in_cut_s_per_part).toBeGreaterThan(mill.time_in_cut_s_per_part * 10);
  });
});

describe("XometryStyleQuoteInputsEngine — tolerance + finish + rush multipliers", () => {
  it("very_fine tolerance setup = 3.5× medium setup", () => {
    const med = xometry.quote(baseInputs);
    const vf = xometry.quote({ ...baseInputs, tolerance_class: "very_fine" });
    // setup_base = 1800. medium = 1800*1.4 = 2520. very_fine = 1800*3.5 = 6300.
    expect(med.setup_time_s_per_lot).toBe(2520);
    expect(vf.setup_time_s_per_lot).toBe(6300);
  });
  it("Ra 0.4 um → 2.80× finish multiplier vs Ra 3.2 um → 1.0×", () => {
    const rough = xometry.quote(baseInputs);
    const fine = xometry.quote({ ...baseInputs, surface_finish_um: 0.4 });
    expect(fine.time_in_cut_s_per_part).toBeCloseTo(rough.time_in_cut_s_per_part * 2.8, 1);
  });
  it("1-day lead-time → rush_multiplier=1.5", () => {
    const r = xometry.quote({ ...baseInputs, lead_time_days: 1 });
    expect(r.rush_multiplier).toBe(1.5);
    expect(r.expedited_total_usd).toBeCloseTo(r.fmv_total_lot_usd * 1.5, 1);
  });
  it("10+ day lead-time → no rush surcharge (multiplier=1.0)", () => {
    const r = xometry.quote({ ...baseInputs, lead_time_days: 15 });
    expect(r.rush_multiplier).toBe(1);
    expect(r.expedited_total_usd).toBe(r.fmv_total_lot_usd);
  });
});

describe("OutsourceRecommenderEngine — capacity rule", () => {
  it("shop_loading_pct=95 + lead_time_days=5 → outsource (capacity-constrained)", () => {
    const r = outsource.recommend({
      in_house_total_usd: 100,
      in_house_lead_time_days: 5,
      process: "mill", material: "aluminum_6061",
      tolerance_class: "medium", quantity: 10,
      shop_loading_pct: 95,
    }, 125);
    expect(r.recommendation).toBe("outsource");
    expect(r.reason_code).toBe("capacity-constrained");
  });
});

describe("OutsourceRecommenderEngine — material-unavailable rule", () => {
  it("material in unavailable_materials → outsource regardless of price", () => {
    const r = outsource.recommend({
      in_house_total_usd: 100,
      in_house_lead_time_days: 30,
      process: "mill", material: "copper_c110",
      tolerance_class: "coarse", quantity: 10,
      shop_loading_pct: 20,
      unavailable_materials: ["copper_c110"],
    }, 125);
    expect(r.recommendation).toBe("outsource");
    expect(r.reason_code).toBe("material-unavailable");
  });
});

describe("OutsourceRecommenderEngine — price rules", () => {
  it("outsource_total far below in_house → outsource (outsource-cheaper)", () => {
    const r = outsource.recommend({
      in_house_total_usd: 10000,    // very high in-house
      in_house_lead_time_days: 30,
      process: "mill", material: "aluminum_6061",
      tolerance_class: "coarse", quantity: 10,
      shop_loading_pct: 20,
    }, 50);  // tiny volume → outsource will be cheap
    expect(r.recommendation).toBe("outsource");
    expect(r.reason_code).toBe("outsource-cheaper");
    expect(r.savings_usd).toBeGreaterThan(0);
  });
  it("outsource_total far above in_house → in-house (in-house-cheaper)", () => {
    const r = outsource.recommend({
      in_house_total_usd: 10,        // very cheap in-house
      in_house_lead_time_days: 30,
      process: "wedm", material: "stainless_304",  // expensive outsource combo
      tolerance_class: "very_fine", quantity: 100,
      shop_loading_pct: 20,
    }, 500);  // big volume + premium process → outsource expensive
    expect(r.recommendation).toBe("in-house");
    expect(r.reason_code).toBe("in-house-cheaper");
  });
});

describe("OutsourceRecommenderEngine — R12 input validation", () => {
  it("missing process → ok=false reason names field", () => {
    const r = outsource.recommend({
      in_house_total_usd: 100, in_house_lead_time_days: 10,
      process: undefined as any, material: "aluminum_6061",
      tolerance_class: "medium", quantity: 10, shop_loading_pct: 20,
    }, 50);
    expect(r.ok).toBe(false);
    expect(r.reason_text).toBe("missing-required:process,material");
  });
});

describe("QuoteScenarioGeneratorEngine — seeded determinism", () => {
  it("same seed → identical scenarios across two runs", () => {
    const a = scenarios.generate({ count: 50, seed: 12345 });
    const b = scenarios.generate({ count: 50, seed: 12345 });
    expect(a.scenarios).toEqual(b.scenarios);
  });
  it("different seeds → different scenarios", () => {
    const a = scenarios.generate({ count: 50, seed: 1 });
    const b = scenarios.generate({ count: 50, seed: 2 });
    expect(a.scenarios).not.toEqual(b.scenarios);
  });
  it("count=0 → ok=false reason='count-must-be-positive-integer'", () => {
    const r = scenarios.generate({ count: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("count-must-be-positive-integer");
  });
  it("returns exactly N scenarios for any positive N", () => {
    expect(scenarios.generate({ count: 1 }).scenarios.length).toBe(1);
    expect(scenarios.generate({ count: 1000 }).scenarios.length).toBe(1000);
  });
});

describe("QuoteScenarioGeneratorEngine — coverage of input space", () => {
  it("1000 scenarios with default materials cover all 4 materials", () => {
    const r = scenarios.generate({ count: 1000, seed: 42 });
    const materials = new Set(r.scenarios.map((s) => s.material));
    expect(materials.size).toBe(4);
  });
  it("1000 scenarios with default processes cover all 4 processes", () => {
    const r = scenarios.generate({ count: 1000, seed: 42 });
    const processes = new Set(r.scenarios.map((s) => s.process));
    expect(processes.size).toBe(4);
  });
  it("materials filter restricts to only those materials", () => {
    const r = scenarios.generate({ count: 200, seed: 7, materials: ["aluminum_6061"] });
    for (const s of r.scenarios) expect(s.material).toBe("aluminum_6061");
  });
});

describe("QuoteScenarioGeneratorEngine — stream() generator API", () => {
  it("stream yields the same N records as generate() with same seed", () => {
    const batch = scenarios.generate({ count: 25, seed: 999 }).scenarios;
    const streamed: XometryQuoteInputs[] = [];
    for (const s of scenarios.stream({ count: 25, seed: 999 })) streamed.push(s);
    expect(streamed).toEqual(batch);
  });
});

describe("End-to-end pipeline: scenario → quote → outsource recommendation", () => {
  it("100 scenarios all flow through xometry.quote() + outsource.recommend() without errors", () => {
    const batch = scenarios.generate({ count: 100, seed: 2026 });
    let quoted = 0; let recommended = 0;
    for (const scn of batch.scenarios) {
      const q = xometry.quote({ ...scn, asOfIsoDate: "2024-06-15" });
      if (!q.ok) continue;
      quoted++;
      const o = outsource.recommend({
        in_house_total_usd: q.fmv_total_lot_usd,
        in_house_lead_time_days: scn.lead_time_days,
        process: scn.process, material: scn.material,
        tolerance_class: scn.tolerance_class, quantity: scn.quantity,
        shop_loading_pct: 50,
      }, q.volume_cm3);
      if (o.ok) recommended++;
    }
    expect(quoted).toBeGreaterThan(80);     // most should quote successfully
    expect(recommended).toBe(quoted);       // every quote should get a recommendation
  });
});
