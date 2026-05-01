import { describe, it, expect } from "vitest";
import { CostEstimatorEngine } from "../engines/CostEstimatorEngine.js";

describe("CostEstimatorEngine", () => {
  const engine = new CostEstimatorEngine();

  describe("estimate", () => {
    it("calculates total job cost", () => {
      const est = engine.estimate(
        { material: "6061", weightLbs: 2 },
        { cycleTimeMin: 30, quantity: 10 }
      );
      expect(est.materialCost).toBe(70); // 2 lb × $3.50 × 10
      expect(est.machiningCost).toBeGreaterThan(0);
      expect(est.setupCost).toBeGreaterThan(0);
      expect(est.totalCost).toBe(est.materialCost + est.machiningCost + est.setupCost);
      expect(est.perPart).toBe(est.totalCost / 10);
      expect(est.currency).toBe("USD");
    });

    it("estimates from volume", () => {
      const est = engine.estimate(
        { material: "aluminum", volumeIn3: 10 },
        { cycleTimeMin: 15, quantity: 1 }
      );
      expect(est.materialCost).toBeGreaterThan(0);
    });

    it("includes breakdown string", () => {
      const est = engine.estimate(
        { material: "steel", weightLbs: 5 },
        { cycleTimeMin: 60, quantity: 1 }
      );
      expect(est.breakdown).toContain("Material:");
      expect(est.breakdown).toContain("Machining:");
      expect(est.breakdown).toContain("Setup:");
    });
  });

  describe("quickEstimate", () => {
    it("returns per-part and total", () => {
      const est = engine.quickEstimate("6061", 15, 100);
      expect(est.perPart).toBeGreaterThan(0);
      expect(est.total).toBeCloseTo(est.perPart * 100, 0);
    });

    it("setup amortizes with quantity", () => {
      const one = engine.quickEstimate("6061", 15, 1);
      const hundred = engine.quickEstimate("6061", 15, 100);
      expect(one.perPart).toBeGreaterThan(hundred.perPart);
    });
  });

  describe("getShopRate", () => {
    it("returns rate for known machine", () => {
      expect(engine.getShopRate("cnc_5axis")).toBe(135);
      expect(engine.getShopRate("turning")).toBe(85);
    });

    it("defaults to 3-axis for unknown", () => {
      expect(engine.getShopRate("unknown")).toBe(95);
    });
  });

  describe("getMaterialPrice", () => {
    it("returns price for known material", () => {
      expect(engine.getMaterialPrice("7075")).toBe(5.00);
      expect(engine.getMaterialPrice("titanium")).toBe(20.00);
    });

    it("defaults for unknown material", () => {
      expect(engine.getMaterialPrice("unobtanium")).toBe(3.50);
    });
  });

  describe("priceBreaks", () => {
    it("returns estimates for multiple quantities", () => {
      const breaks = engine.priceBreaks("6061", 15, [1, 10, 100, 1000]);
      expect(breaks.length).toBe(4);
      // Per-part should decrease with quantity (setup amortization)
      expect(breaks[0].perPart).toBeGreaterThan(breaks[3].perPart);
    });
  });

  describe("listShopRates", () => {
    it("returns all shop rates", () => {
      const rates = engine.listShopRates();
      expect(Object.keys(rates).length).toBeGreaterThan(5);
      expect(rates.cnc_3axis).toBe(95);
    });
  });
});
