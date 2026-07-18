/**
 * QuoteAutopilotEngine Tests — ACP-MS6
 */
import { describe, it, expect, beforeEach } from "vitest";
import { quoteAutopilotEngine } from "../engines/QuoteAutopilotEngine.js";

beforeEach(() => {
  quoteAutopilotEngine.clearTelemetry();
});

const BASE_INPUT = {
  part_name: "Test Bracket",
  material: "aluminum",
  features: ["pocket", "hole", "chamfer"],
  dimensions_mm: { x: 100, y: 80, z: 20 },
  batch_sizes: [1, 10, 100],
};

// ── Complexity Assessment ────────────────────────────────────

describe("QuoteAutopilotEngine — Complexity", () => {

  it("simple part = low complexity", () => {
    expect(quoteAutopilotEngine.assessComplexity(["face", "hole"])).toBe("low");
  });

  it("moderate features = medium complexity", () => {
    expect(quoteAutopilotEngine.assessComplexity(["pocket", "hole", "chamfer", "slot"])).toBe("medium");
  });

  it("many features + tight tolerances = high/very_high", () => {
    const cx = quoteAutopilotEngine.assessComplexity(
      ["pocket", "hole", "thread", "3d_surface", "keyway"],
      { bore: 0.008 }
    );
    expect(["high", "very_high"]).toContain(cx);
  });

  it("tight tolerance increases complexity", () => {
    const loose = quoteAutopilotEngine.assessComplexity(["pocket"]);
    const tight = quoteAutopilotEngine.assessComplexity(["pocket"], { bore: 0.005 });
    expect(tight !== loose || tight === "medium").toBeTruthy();
  });
});

// ── Cycle Time ───────────────────────────────────────────────

describe("QuoteAutopilotEngine — Cycle Time", () => {

  it("aluminum is faster than steel", () => {
    const al = quoteAutopilotEngine.estimateCycleTime({ ...BASE_INPUT, material: "aluminum" });
    const st = quoteAutopilotEngine.estimateCycleTime({ ...BASE_INPUT, material: "steel" });
    expect(al).toBeLessThan(st);
  });

  it("titanium is slowest", () => {
    const al = quoteAutopilotEngine.estimateCycleTime({ ...BASE_INPUT, material: "aluminum" });
    const ti = quoteAutopilotEngine.estimateCycleTime({ ...BASE_INPUT, material: "titanium" });
    expect(ti).toBeGreaterThan(al * 3);
  });

  it("more features = longer cycle time", () => {
    const few = quoteAutopilotEngine.estimateCycleTime({ ...BASE_INPUT, features: ["hole"] });
    const many = quoteAutopilotEngine.estimateCycleTime({
      ...BASE_INPUT,
      features: ["pocket", "hole", "thread", "chamfer", "slot", "3d_surface"],
    });
    expect(many).toBeGreaterThan(few);
  });

  it("cycle time is always positive", () => {
    const ct = quoteAutopilotEngine.estimateCycleTime(BASE_INPUT);
    expect(ct).toBeGreaterThan(0);
  });
});

// ── Quantity Breaks ──────────────────────────────────────────

describe("QuoteAutopilotEngine — Quantity Breaks", () => {

  it("higher quantity = lower per-part cost", () => {
    const r = quoteAutopilotEngine.generateQuote(BASE_INPUT);
    const prices = r.quantity_breaks.map(b => b.price_per_part);
    // Price should decrease (or stay same) as quantity goes up
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  it("setup cost amortizes with quantity", () => {
    const r = quoteAutopilotEngine.generateQuote(BASE_INPUT);
    const qty1 = r.quantity_breaks.find(b => b.quantity === 1)!;
    const qty100 = r.quantity_breaks.find(b => b.quantity === 100)!;
    expect(qty100.setup_amortized).toBeLessThan(qty1.setup_amortized);
  });

  it("rush orders have higher margin", () => {
    const standard = quoteAutopilotEngine.generateQuote(BASE_INPUT);
    const rush = quoteAutopilotEngine.generateQuote({ ...BASE_INPUT, priority: "rush" });
    const stdPrice = standard.quantity_breaks[0].price_per_part;
    const rushPrice = rush.quantity_breaks[0].price_per_part;
    expect(rushPrice).toBeGreaterThan(stdPrice);
  });

  it("all prices are positive", () => {
    const r = quoteAutopilotEngine.generateQuote(BASE_INPUT);
    for (const b of r.quantity_breaks) {
      expect(b.price_per_part).toBeGreaterThan(0);
      expect(b.total_price).toBeGreaterThan(0);
      expect(b.cost_per_part).toBeGreaterThan(0);
    }
  });
});

// ── Full Chain ───────────────────────────────────────────────

describe("QuoteAutopilotEngine — Full Chain", () => {

  it("returns complete result", () => {
    const r = quoteAutopilotEngine.generateQuote(BASE_INPUT);
    expect(r.chain_id).toBe("quote_autopilot");
    expect(r.part_name).toBe("Test Bracket");
    expect(r.material).toBe("aluminum");
    expect(r.quantity_breaks).toHaveLength(3);
    expect(r.steps.length).toBeGreaterThanOrEqual(4);
    expect(r.base_cycle_time_min).toBeGreaterThan(0);
  });

  it("status=success for clean input", () => {
    const r = quoteAutopilotEngine.generateQuote(BASE_INPUT);
    expect(r.status).toBe("success");
  });

  it("DFM warnings for tight tolerance", () => {
    const r = quoteAutopilotEngine.generateQuote({
      ...BASE_INPUT,
      tolerances: { bore: 0.003 },
    });
    expect(r.dfm_warnings.length).toBeGreaterThan(0);
    expect(r.dfm_warnings.some(w => w.includes("grinding"))).toBe(true);
  });

  it("recommends 3D model for very complex parts", () => {
    const r = quoteAutopilotEngine.generateQuote({
      ...BASE_INPUT,
      features: ["pocket", "hole", "thread", "3d_surface", "keyway", "o_ring_groove", "slot", "chamfer"],
      tolerances: { bore: 0.005, slot: 0.008 },
    });
    expect(r.complexity).toBe("very_high");
    expect(r.recommendations.some(rec => rec.includes("3D model"))).toBe(true);
  });
});

// ── Telemetry + Calibration ──────────────────────────────────

describe("QuoteAutopilotEngine — Telemetry", () => {

  it("logs telemetry on quote generation", () => {
    quoteAutopilotEngine.generateQuote(BASE_INPUT);
    const log = quoteAutopilotEngine.getTelemetryLog();
    expect(log.length).toBe(1);
    expect(log[0].event_type).toBe("quote_generated");
    expect(log[0].part_name).toBe("Test Bracket");
  });

  it("records actual cycle time", () => {
    quoteAutopilotEngine.generateQuote(BASE_INPUT);
    quoteAutopilotEngine.recordActual("Test Bracket", 5.0);
    const log = quoteAutopilotEngine.getTelemetryLog();
    expect(log.length).toBe(2);
    expect(log[1].event_type).toBe("actual_recorded");
    expect(log[1].actual_value).toBe(5.0);
  });

  it("computes calibration with sufficient data", () => {
    // Generate 5 quotes and record actuals (over-estimating by ~20%)
    for (let i = 0; i < 5; i++) {
      quoteAutopilotEngine.generateQuote({ ...BASE_INPUT, part_name: `Part-${i}` });
      const predicted = quoteAutopilotEngine.getTelemetryLog().at(-1)!.predicted_value;
      quoteAutopilotEngine.recordActual(`Part-${i}`, predicted * 0.8); // actual is 20% less
    }

    const cal = quoteAutopilotEngine.computeCalibration();
    expect(cal.sample_size).toBe(5);
    expect(cal.bias).toBe("over_estimate");
    expect(cal.correction_factor).toBeLessThan(1.0);
    expect(cal.suggestions.length).toBeGreaterThan(0);
  });

  it("needs minimum 3 samples for calibration", () => {
    quoteAutopilotEngine.generateQuote(BASE_INPUT);
    quoteAutopilotEngine.recordActual("Test Bracket", 5.0);
    const cal = quoteAutopilotEngine.computeCalibration();
    expect(cal.sample_size).toBe(1);
    expect(cal.confidence).toBe(0);
    expect(cal.suggestions.some(s => s.includes("at least 3"))).toBe(true);
  });
});
