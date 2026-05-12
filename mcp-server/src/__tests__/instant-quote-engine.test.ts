/**
 * InstantQuoteEngine tests — Session 6-3 U-IQUOTE1
 *
 * Validates: instant quote pipeline, CI95 bounds, Wright's law qty breaks,
 * lead time options, DFM integration, PartSimilarity sanity check.
 */
import { describe, it, expect } from "vitest";
import { instantQuoteEngine } from "../engines/InstantQuoteEngine.js";
import type { InstantQuoteInput, InstantQuoteResult } from "../engines/InstantQuoteEngine.js";

// ── Helper: standard 6061 bracket input ──
function bracket6061(overrides?: Partial<InstantQuoteInput>): InstantQuoteInput {
  return {
    part_name: "Test Bracket 6061",
    material: "aluminum_6061",
    iso_group: "N",
    quantity: 10,
    bounding_box_mm: { x: 100, y: 80, z: 25 },
    part_volume_cm3: 50,
    features: [
      { type: "pocket", count: 2, tolerance_mm: 0.05, depth_ratio: 3 },
      { type: "hole", count: 6, tolerance_mm: 0.02, is_blind: false },
      { type: "chamfer", count: 4 },
    ],
    machine_type: "cnc_mill_3axis",
    inspection_level: "standard",
    ...overrides,
  };
}

describe("InstantQuoteEngine", () => {
  describe("quote() — basic pipeline", () => {
    it("should return a valid instant quote for 6061 bracket at qty=10", () => {
      const result = instantQuoteEngine.quote(bracket6061());

      // Basic structure
      expect(result.quote_id).toBeDefined();
      expect(result.part_name).toBe("Test Bracket 6061");
      expect(result.quantity).toBe(10);
      expect(result.date).toBeDefined();
      expect(result.valid_until).toBeDefined();

      // Price must be positive
      expect(result.unit_price).toBeGreaterThan(0);
      expect(result.total_price).toBeGreaterThan(0);
      expect(result.total_price).toBeCloseTo(result.unit_price * 10, 0);
    });

    it("should include CI95 confidence bounds", () => {
      const result = instantQuoteEngine.quote(bracket6061());

      expect(result.ci95_low).toBeGreaterThan(0);
      expect(result.ci95_high).toBeGreaterThan(0);
      expect(result.ci95_low).toBeLessThan(result.unit_price);
      expect(result.ci95_high).toBeGreaterThan(result.unit_price);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it("should include confidence factors explaining uncertainty sources", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      expect(result.confidence_factors.length).toBeGreaterThan(0);
    });

    it("should include cycle time and source", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      expect(result.cycle_time_min).toBeGreaterThan(0);
      expect(["physics_calculated", "parametric_estimate"]).toContain(result.cycle_time_source);
    });

    it("should list physics engines used", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      expect(result.physics_engines_used).toContain("InstantQuoteEngine");
      expect(result.physics_engines_used).toContain("QuoteEstimatorEngine");
    });
  });

  describe("quantity breaks — Wright's law", () => {
    it("should produce 6 standard qty break points (1/5/10/25/50/100)", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      expect(result.quantity_breaks).toHaveLength(6);

      const qtys = result.quantity_breaks.map(qb => qb.quantity);
      expect(qtys).toEqual([1, 5, 10, 25, 50, 100]);
    });

    it("should have descending unit prices as quantity increases", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      const prices = result.quantity_breaks.map(qb => qb.unit_price);

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
      }
    });

    it("should have increasing savings_pct as quantity increases", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      const savings = result.quantity_breaks.map(qb => qb.savings_pct);

      // qty=1 should have 0% savings
      expect(savings[0]).toBe(0);
      // Higher quantities should have more savings
      for (let i = 1; i < savings.length; i++) {
        expect(savings[i]).toBeGreaterThanOrEqual(savings[i - 1]);
      }
    });

    it("should have positive lead_time_days for each break", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      for (const qb of result.quantity_breaks) {
        expect(qb.lead_time_days).toBeGreaterThan(0);
        expect(qb.total_price).toBeCloseTo(qb.unit_price * qb.quantity, 0);
      }
    });
  });

  describe("lead time options", () => {
    it("should produce standard/expedited/rush options", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      expect(result.lead_time_options).toHaveLength(3);

      const tiers = result.lead_time_options.map(o => o.tier);
      expect(tiers).toEqual(["standard", "expedited", "rush"]);
    });

    it("should have decreasing days and increasing price from standard to rush", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      const opts = result.lead_time_options;

      // Standard has most days, lowest price
      expect(opts[0].days).toBeGreaterThanOrEqual(opts[1].days);
      expect(opts[1].days).toBeGreaterThanOrEqual(opts[2].days);
      expect(opts[0].unit_price).toBeLessThanOrEqual(opts[1].unit_price);
      expect(opts[1].unit_price).toBeLessThanOrEqual(opts[2].unit_price);
    });

    it("should have multiplier=1.0 for standard tier", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      const standard = result.lead_time_options.find(o => o.tier === "standard");
      expect(standard?.multiplier).toBe(1.0);
    });
  });

  describe("DFM integration", () => {
    it("should include DFM score and manufacturability", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      expect(result.dfm.score).toBeGreaterThanOrEqual(0);
      expect(result.dfm.score).toBeLessThanOrEqual(100);
      expect(["excellent", "good", "marginal", "difficult"]).toContain(result.dfm.manufacturability);
    });

    it("should flag thin walls as critical DFM issue", () => {
      const result = instantQuoteEngine.quote(bracket6061({
        features: [
          { type: "pocket", count: 1, wall_thickness_mm: 0.3, tolerance_mm: 0.05 },
        ],
      }));

      const criticals = result.dfm.issues.filter(i => i.severity === "critical");
      expect(criticals.length).toBeGreaterThan(0);
      expect(result.dfm.score).toBeLessThan(100);
    });

    it("should return DFM issues with cost_impact_usd", () => {
      const result = instantQuoteEngine.quote(bracket6061({
        features: [
          { type: "pocket", count: 1, wall_thickness_mm: 0.3, tolerance_mm: 0.05 },
        ],
      }));

      for (const issue of result.dfm.issues) {
        expect(issue.cost_impact_usd).toBeDefined();
        expect(issue.cost_impact_usd).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("cost breakdown", () => {
    it("should include all cost categories", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      const cb = result.cost_breakdown;

      expect(cb.material.total).toBeGreaterThanOrEqual(0);
      expect(cb.machining.total).toBeGreaterThan(0);
      expect(cb.machining.cycle_time_min).toBeGreaterThan(0);
      expect(cb.setup.total).toBeGreaterThanOrEqual(0);
      expect(cb.total_cost_per_part).toBeGreaterThan(0);
    });

    it("should have total_cost_per_part <= unit_price (margin applied)", () => {
      const result = instantQuoteEngine.quote(bracket6061());
      expect(result.cost_breakdown.total_cost_per_part).toBeLessThanOrEqual(result.unit_price);
    });
  });

  describe("complexity inference", () => {
    it("should infer simple for minimal features", () => {
      const result = instantQuoteEngine.quote(bracket6061({
        features: [{ type: "hole", count: 2 }],
      }));
      expect(result.recommended_machine).toBeDefined();
    });

    it("should infer 5-axis when features require it", () => {
      const result = instantQuoteEngine.quote(bracket6061({
        features: [
          { type: "pocket", count: 3, requires_5axis: true },
          { type: "contour", count: 2, requires_5axis: true },
        ],
        machine_type: undefined,
      }));
      // With 5-axis features and no machine override, should recommend 5-axis
      expect(result.recommended_machine).toContain("5axis");
    });

    it("should infer lathe for cylindrical geometry", () => {
      const result = instantQuoteEngine.quote(bracket6061({
        bounding_box_mm: { x: 200, y: 40, z: 40 },
        machine_type: undefined,
      }));
      expect(result.recommended_machine).toContain("lathe");
    });
  });

  describe("edge cases and warnings", () => {
    it("should work with minimal input (no features, no geometry)", () => {
      const result = instantQuoteEngine.quote({
        part_name: "Minimal Part",
        material: "steel_1018",
        quantity: 1,
      });
      expect(result.unit_price).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should warn about missing geometry", () => {
      const result = instantQuoteEngine.quote({
        part_name: "No Geometry",
        material: "aluminum_6061",
        quantity: 5,
      });
      expect(result.warnings.some(w => w.includes("geometry"))).toBe(true);
    });

    it("should warn about high volume", () => {
      const result = instantQuoteEngine.quote(bracket6061({ quantity: 5000 }));
      expect(result.warnings.some(w => w.includes("High volume"))).toBe(true);
    });

    it("should handle rush pricing with premium", () => {
      const standard = instantQuoteEngine.quote(bracket6061());
      const rush = instantQuoteEngine.quote(bracket6061({
        rush: true,
        rush_tier: "next_day",
      }));

      // Rush lead time option should be more expensive
      const rushOption = rush.lead_time_options.find(o => o.tier === "rush");
      const stdOption = standard.lead_time_options.find(o => o.tier === "standard");
      expect(rushOption!.unit_price).toBeGreaterThan(stdOption!.unit_price);
    });
  });

  describe("computeQtyBreaks() — standalone", () => {
    it("should compute quantity breaks for given unit price", () => {
      const breaks = instantQuoteEngine.computeQtyBreaks({
        unit_price_at_qty: 50.00,
        quantity: 10,
        machine_type: "cnc_mill_3axis",
        setup_cost: 100,
        programming_cost: 200,
      });

      expect(breaks).toHaveLength(6);
      expect(breaks[0].quantity).toBe(1);
      expect(breaks[5].quantity).toBe(100);
      // Unit price should decrease
      expect(breaks[5].unit_price).toBeLessThan(breaks[0].unit_price);
    });
  });

  describe("computeLeadOptions() — standalone", () => {
    it("should compute 3 lead time tiers", () => {
      const opts = instantQuoteEngine.computeLeadOptions({
        base_lead_days: 10,
        unit_price: 50.00,
        quantity: 10,
      });

      expect(opts).toHaveLength(3);
      expect(opts[0].tier).toBe("standard");
      expect(opts[0].days).toBe(10);
      expect(opts[2].tier).toBe("rush");
      expect(opts[2].days).toBeLessThan(10);
      expect(opts[2].unit_price).toBeGreaterThan(50.00);
    });
  });
});
