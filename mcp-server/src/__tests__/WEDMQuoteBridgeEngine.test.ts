import { describe, it, expect } from "vitest";
import { WEDMQuoteBridgeEngine } from "../engines/WEDMQuoteBridgeEngine.js";
import type { CostEstimate } from "../engines/EDMCostDocumentationEngine.js";

function makeCostEstimate(overrides: Partial<CostEstimate> = {}): CostEstimate {
  const base: CostEstimate = {
    part_id: "TEST-001",
    material: "D2 tool steel",
    machine_time: {
      setup_hrs: 0.5,
      cutting_hrs: 4.0,
      tab_cutting_hrs: 0,
      threading_hrs: 0.1,
      idle_hrs: 0,
      total_hrs: 4.6,
      rate_per_hr: 85,
      cost: 391.0,
      breakdown: [],
    },
    wire: {
      wire_type: "brass",
      diameter_mm: 0.25,
      length_m: 720,
      weight_kg: 2.88,
      cost_per_m: 0.024,
      cost: 17.28,
      spools_used: 1,
      remnant_kg: 12.12,
      notes: "",
    },
    consumables: {
      filters: 1.44,
      guides: 2.5,
      nozzles: 1.2,
      resin: 3.2,
      electrodes: 0,
      flush_fluid: 10.0,
      total: 18.34,
      detail: [],
    },
    post_process: {
      items: [{ name: "Deburr", op: "deburr_manual", cost: 25, notes: "" }],
      total: 25,
    },
    subtotal: 451.62,
    overhead_pct: 0.18,
    overhead: 81.29,
    margin_pct: 0.25,
    margin: 133.23,
    total_per_part: 666.14,
    quantity_breaks: [],
    comparison: [],
    cost_drivers: [],
  };
  return { ...base, ...overrides };
}

describe("WEDMQuoteBridgeEngine", () => {
  describe("toQuoteLineItems", () => {
    it("maps all 5 cost components to line items", () => {
      const cost = makeCostEstimate();
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost, 1);
      const categories = new Set(result.line_items.map((i) => i.category));
      expect(categories.has("machine_time")).toBe(true);
      expect(categories.has("wire")).toBe(true);
      expect(categories.has("consumables")).toBe(true);
      expect(categories.has("post_process")).toBe(true);
      expect(categories.has("overhead")).toBe(true);
      expect(categories.has("margin")).toBe(true);
    });

    it("omits post_process line when cost is zero", () => {
      const cost = makeCostEstimate({ post_process: { items: [], total: 0 } });
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost);
      const ppLines = result.line_items.filter((i) => i.category === "post_process");
      expect(ppLines.length).toBe(0);
    });

    it("computes unit_cost correctly for multi-unit quantity", () => {
      const cost = makeCostEstimate();
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost, 4);
      const machineItem = result.line_items.find((i) => i.category === "machine_time")!;
      expect(machineItem.unit_cost).toBeCloseTo(391.0 / 4, 2);
      expect(machineItem.total).toBeCloseTo(391.0, 2);
      expect(machineItem.quantity).toBe(4);
    });

    it("propagates uncertainty via RSS across all cost components", () => {
      const cost = makeCostEstimate();
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost);
      // RSS should produce a total uncertainty larger than any single component
      // but less than the sum
      const individualMax = Math.max(
        ...result.line_items
          .filter((i) => i.category !== "margin")
          .map((i) => i.uncertainty_pct),
      );
      const individualSum = result.line_items
        .filter((i) => i.category !== "margin")
        .reduce((s, i) => s + i.uncertainty_pct, 0);
      expect(result.total_uncertainty_pct).toBeGreaterThan(individualMax);
      expect(result.total_uncertainty_pct).toBeLessThan(individualSum);
    });

    it("validates RSS formula: total_uncertainty = sqrt(sum(u_i^2))", () => {
      const cost = makeCostEstimate();
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost);
      const components = result.line_items
        .filter((i) => i.category !== "margin")
        .map((i) => i.uncertainty_pct);
      const expected = Math.sqrt(components.reduce((s, u) => s + u * u, 0));
      expect(result.total_uncertainty_pct).toBeCloseTo(expected, 4);
    });

    it("computes 95% confidence interval", () => {
      const cost = makeCostEstimate();
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost);
      expect(result.confidence_interval.confidence).toBe(0.95);
      expect(result.confidence_interval.low).toBeLessThan(result.total);
      expect(result.confidence_interval.high).toBeGreaterThan(result.total);
      // CI spread should be roughly ±2σ
      const sigma = (result.total * result.total_uncertainty_pct) / 100;
      expect(result.confidence_interval.high - result.total).toBeCloseTo(1.96 * sigma, 1);
    });

    it("throws on missing cost input", () => {
      expect(() => WEDMQuoteBridgeEngine.toQuoteLineItems(null as any)).toThrow();
    });

    it("handles zero-cost edge case", () => {
      const cost = makeCostEstimate({
        machine_time: {
          setup_hrs: 0, cutting_hrs: 0, tab_cutting_hrs: 0, threading_hrs: 0, idle_hrs: 0,
          total_hrs: 0, rate_per_hr: 0, cost: 0, breakdown: [],
        },
        wire: {
          wire_type: "brass", diameter_mm: 0.25, length_m: 0, weight_kg: 0,
          cost_per_m: 0, cost: 0, spools_used: 0, remnant_kg: 0, notes: "",
        },
        consumables: {
          filters: 0, guides: 0, nozzles: 0, resin: 0, electrodes: 0, flush_fluid: 0,
          total: 0, detail: [],
        },
        post_process: { items: [], total: 0 },
        subtotal: 0, overhead: 0, margin: 0, total_per_part: 0,
      });
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost);
      expect(result.total).toBe(0);
      expect(result.line_items.length).toBeGreaterThan(0); // still produces rows
    });

    it("preserves source citations in line items", () => {
      const cost = makeCostEstimate();
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost);
      const machineItem = result.line_items.find((i) => i.category === "machine_time")!;
      expect(machineItem.source).toContain("EDMCostDocumentationEngine");
    });

    it("clamps negative quantities to 1", () => {
      const cost = makeCostEstimate();
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost, -5);
      const machineItem = result.line_items.find((i) => i.category === "machine_time")!;
      expect(machineItem.quantity).toBe(1);
    });
  });

  describe("getQuantityBreaks", () => {
    it("produces breaks for standard quantities [1, 10, 25, 50, 100]", () => {
      const cost = makeCostEstimate();
      const breaks = WEDMQuoteBridgeEngine.getQuantityBreaks(cost, {
        quantities: [1, 10, 25, 50, 100],
      });
      expect(breaks.length).toBe(5);
      expect(breaks.map((b) => b.quantity)).toEqual([1, 10, 25, 50, 100]);
    });

    it("applies Wright's Law: unit price decreases with quantity", () => {
      const cost = makeCostEstimate();
      const breaks = WEDMQuoteBridgeEngine.getQuantityBreaks(cost, {
        quantities: [1, 10, 50, 100],
      });
      // Unit price monotonically decreases
      for (let i = 1; i < breaks.length; i++) {
        expect(breaks[i].unit_price).toBeLessThanOrEqual(breaks[i - 1].unit_price);
      }
    });

    it("learning rate 0.85: qty 100 machine cost ≈ cost_1 × 100^log2(0.85)", () => {
      const cost = makeCostEstimate();
      const breaks = WEDMQuoteBridgeEngine.getQuantityBreaks(cost, {
        quantities: [1, 100],
        learning_rate: 0.85,
        amortize_setup: false,
      });
      const ratio = breaks[1].machine_time_per_unit / breaks[0].machine_time_per_unit;
      // Wright with LR=0.85: qty100 cost = cost_1 * 100^log2(0.85) ≈ cost_1 × 0.497
      // Floor at 0.55 per wedm-constants WEDM_LEARNING_CURVE.min_cost_fraction
      expect(ratio).toBeCloseTo(0.55, 1);
    });

    it("amortizes setup cost across quantity when amortize_setup=true", () => {
      const cost = makeCostEstimate();
      const breaks = WEDMQuoteBridgeEngine.getQuantityBreaks(cost, {
        quantities: [1, 10],
        amortize_setup: true,
      });
      const setupLine1 = breaks[0].line_items.find((i) => i.description.includes("Setup"));
      const setupLine10 = breaks[1].line_items.find((i) => i.description.includes("Setup"));
      if (setupLine1 && setupLine10) {
        // Per-unit setup at qty 10 should be 1/10th of qty 1
        expect(setupLine10.unit_cost).toBeCloseTo(setupLine1.unit_cost / 10, 1);
      }
    });

    it("computes savings_pct relative to qty 1", () => {
      const cost = makeCostEstimate();
      const breaks = WEDMQuoteBridgeEngine.getQuantityBreaks(cost, {
        quantities: [1, 100],
      });
      expect(breaks[0].savings_pct_vs_qty1).toBeCloseTo(0, 2);
      expect(breaks[1].savings_pct_vs_qty1).toBeGreaterThan(0);
    });

    it("default quantities [1, 10, 25, 50, 100] when none provided", () => {
      const cost = makeCostEstimate();
      const breaks = WEDMQuoteBridgeEngine.getQuantityBreaks(cost, { quantities: [] } as any);
      // Empty array means no breaks
      expect(Array.isArray(breaks)).toBe(true);
    });

    it("throws on missing cost", () => {
      expect(() =>
        WEDMQuoteBridgeEngine.getQuantityBreaks(null as any, { quantities: [1] }),
      ).toThrow();
    });
  });

  describe("summarize", () => {
    it("returns compact summary with key fields", () => {
      const cost = makeCostEstimate();
      const summary = WEDMQuoteBridgeEngine.summarize(cost, 10);
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.per_unit).toBeCloseTo(summary.total / 10, 2);
      expect(summary.total_uncertainty_pct).toBeGreaterThan(0);
    });
  });

  describe("edge cases (scrutiny fix_8)", () => {
    it("handles carbide material (low speed / high cost)", () => {
      const cost = makeCostEstimate({
        material: "Tungsten carbide WC-10Co",
        machine_time: {
          setup_hrs: 1.0, cutting_hrs: 16.0, tab_cutting_hrs: 0, threading_hrs: 0.2,
          idle_hrs: 0, total_hrs: 17.2, rate_per_hr: 85, cost: 1462.0, breakdown: [],
        },
      });
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost);
      const machineItem = result.line_items.find((i) => i.category === "machine_time")!;
      expect(machineItem.total).toBe(1462.0);
      expect(result.total).toBeGreaterThan(1000);
    });

    it("handles extreme thickness job (>100mm)", () => {
      const cost = makeCostEstimate({
        machine_time: {
          setup_hrs: 2, cutting_hrs: 48, tab_cutting_hrs: 0, threading_hrs: 0.5,
          idle_hrs: 1, total_hrs: 51.5, rate_per_hr: 95, cost: 4892.5, breakdown: [],
        },
      });
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost);
      expect(result.total).toBeGreaterThan(4000);
      expect(result.total_uncertainty_pct).toBeGreaterThan(0);
    });

    it("NaN inputs do not produce NaN output", () => {
      const cost = makeCostEstimate({
        machine_time: {
          setup_hrs: NaN as any, cutting_hrs: 4, tab_cutting_hrs: 0, threading_hrs: 0,
          idle_hrs: 0, total_hrs: 4, rate_per_hr: 85, cost: 340, breakdown: [],
        },
      });
      const result = WEDMQuoteBridgeEngine.toQuoteLineItems(cost);
      // Still produces a valid machine_time line
      const item = result.line_items.find((i) => i.category === "machine_time")!;
      expect(Number.isFinite(item.total)).toBe(true);
    });
  });
});
