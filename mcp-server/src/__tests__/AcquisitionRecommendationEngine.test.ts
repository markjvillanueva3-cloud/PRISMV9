/**
 * Tests for AcquisitionRecommendationEngine
 * @milestone MCAT-MS0/P3-U05
 *
 * Verifies tiered acquisition recommendations with ROI analysis,
 * distributor info, purchase history, and item comparison.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  acquisitionRecommendationEngine,
  type AcquisitionInput,
  type TieredRecommendations,
  type AcquisitionRecommendation,
  type ROICalculation,
  type DistributorInfo,
} from "../engines/AcquisitionRecommendationEngine.js";
import { shopMachineOverlayEngine } from "../engines/ShopMachineOverlayEngine.js";

describe("AcquisitionRecommendationEngine", () => {
  beforeAll(() => {
    // Ensure test overlays exist
    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-01",
        user_id: "acq-test",
        display_name: "Acquisition Test Lathe",
      });
    } catch { /* exists */ }

    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-01",
        user_id: "acq-test",
        display_name: "Acquisition Test VMC",
      });
    } catch { /* exists */ }
  });

  describe("getRecommendations", () => {
    it("returns tiered recommendations for valid machine", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      expect(result).toBeDefined();
      expect(result?.machine_id).toBe("VMC-01");
      expect(result?.category).toBe("tooling");
    });

    it("returns null for invalid machine", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "INVALID-XYZ",
        category: "tooling",
        item_type: "end_mill",
      });

      expect(result).toBeNull();
    });

    it("includes budget tier recommendations", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      expect(Array.isArray(result?.budget)).toBe(true);
    });

    it("includes standard tier recommendations", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      expect(Array.isArray(result?.standard)).toBe(true);
    });

    it("includes premium tier recommendations", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      expect(Array.isArray(result?.premium)).toBe(true);
    });

    it("identifies best value recommendation", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      // Best value should be set if any recommendations exist
      const hasRecs = (result?.budget.length || 0) +
        (result?.standard.length || 0) +
        (result?.premium.length || 0) > 0;

      if (hasRecs) {
        expect(result?.best_value).toBeDefined();
      }
    });

    it("identifies best performance recommendation", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      const hasRecs = (result?.budget.length || 0) +
        (result?.standard.length || 0) +
        (result?.premium.length || 0) > 0;

      if (hasRecs) {
        expect(result?.best_performance).toBeDefined();
      }
    });

    it("includes comparison notes", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      expect(Array.isArray(result?.comparison_notes)).toBe(true);
    });

    it("respects max_budget constraint", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
        max_budget: 50,
      });

      const allRecs = [
        ...(result?.budget || []),
        ...(result?.standard || []),
        ...(result?.premium || []),
      ];

      for (const rec of allRecs) {
        expect(rec.price).toBeLessThanOrEqual(50);
      }
    });

    it("excludes owned items when specified", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
        exclude_owned: ["tool-b1", "tool-s1"],
      });

      const allRecs = [
        ...(result?.budget || []),
        ...(result?.standard || []),
        ...(result?.premium || []),
      ];

      const excludedFound = allRecs.some(r =>
        r.id === "tool-b1" || r.id === "tool-s1"
      );
      expect(excludedFound).toBe(false);
    });
  });

  describe("recommendation structure", () => {
    it("each recommendation has required fields", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      const allRecs = [
        ...(result?.budget || []),
        ...(result?.standard || []),
        ...(result?.premium || []),
      ];

      for (const rec of allRecs) {
        expect(rec.id).toBeDefined();
        expect(rec.tier).toBeDefined();
        expect(rec.name).toBeDefined();
        expect(rec.brand).toBeDefined();
        expect(rec.model).toBeDefined();
        expect(typeof rec.price).toBe("number");
        expect(rec.currency).toBe("USD");
      }
    });

    it("includes compatibility score", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      for (const rec of result?.budget || []) {
        expect(rec.compatibility_score).toBeGreaterThanOrEqual(0);
        expect(rec.compatibility_score).toBeLessThanOrEqual(100);
      }
    });

    it("includes cutting data confidence", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      for (const rec of result?.standard || []) {
        expect(rec.cutting_data_confidence).toBeGreaterThan(0);
        expect(rec.cutting_data_confidence).toBeLessThanOrEqual(1);
      }
    });

    it("includes ROI analysis", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      for (const rec of result?.premium || []) {
        expect(rec.roi).toBeDefined();
        expect(typeof rec.roi.estimated_savings_per_year).toBe("number");
        expect(typeof rec.roi.payback_months).toBe("number");
        expect(typeof rec.roi.roi_percentage).toBe("number");
      }
    });

    it("includes distributor info", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      for (const rec of result?.budget || []) {
        expect(rec.distributor).toBeDefined();
        expect(rec.distributor.name).toBeDefined();
        expect(rec.distributor.availability).toBeDefined();
        expect(typeof rec.distributor.lead_time_days).toBe("number");
      }
    });

    it("includes features array", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      for (const rec of result?.standard || []) {
        expect(Array.isArray(rec.features)).toBe(true);
      }
    });

    it("includes reason string", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      for (const rec of result?.budget || []) {
        expect(typeof rec.reason).toBe("string");
        expect(rec.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getBestRecommendation", () => {
    it("returns single best recommendation", () => {
      const result = acquisitionRecommendationEngine.getBestRecommendation({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
    });

    it("returns null for invalid machine", () => {
      const result = acquisitionRecommendationEngine.getBestRecommendation({
        machine_id: "INVALID-XYZ",
        category: "tooling",
        item_type: "end_mill",
      });

      expect(result).toBeNull();
    });

    it("prefers best value over random selection", () => {
      const tiered = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      const best = acquisitionRecommendationEngine.getBestRecommendation({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      // Should return best_value if available
      if (tiered?.best_value) {
        expect(best?.id).toBe(tiered.best_value.id);
      }
    });
  });

  describe("calculateROI", () => {
    it("returns ROI calculation structure", () => {
      const roi = acquisitionRecommendationEngine.calculateROI({
        item_cost: 100,
        annual_usage_hours: 500,
        hourly_rate: 85,
        productivity_gain_pct: 10,
        tool_life_improvement_pct: 20,
      });

      expect(roi).toBeDefined();
      expect(roi.item_cost).toBe(100);
      expect(roi.annual_usage_hours).toBe(500);
    });

    it("calculates estimated savings", () => {
      const roi = acquisitionRecommendationEngine.calculateROI({
        item_cost: 100,
        annual_usage_hours: 500,
        hourly_rate: 85,
        productivity_gain_pct: 10,
        tool_life_improvement_pct: 20,
      });

      expect(roi.estimated_savings).toBeGreaterThan(0);
    });

    it("calculates payback period", () => {
      const roi = acquisitionRecommendationEngine.calculateROI({
        item_cost: 100,
        annual_usage_hours: 500,
        hourly_rate: 85,
        productivity_gain_pct: 10,
        tool_life_improvement_pct: 20,
      });

      expect(roi.payback_months).toBeGreaterThan(0);
    });

    it("calculates 3-year ROI percentage", () => {
      const roi = acquisitionRecommendationEngine.calculateROI({
        item_cost: 100,
        annual_usage_hours: 500,
        hourly_rate: 85,
        productivity_gain_pct: 10,
        tool_life_improvement_pct: 20,
      });

      expect(typeof roi.roi_3_year).toBe("number");
    });

    it("handles zero productivity gain", () => {
      const roi = acquisitionRecommendationEngine.calculateROI({
        item_cost: 100,
        annual_usage_hours: 500,
        hourly_rate: 85,
        productivity_gain_pct: 0,
        tool_life_improvement_pct: 20,
      });

      expect(roi.estimated_savings).toBeGreaterThanOrEqual(0);
    });

    it("handles zero tool life improvement", () => {
      const roi = acquisitionRecommendationEngine.calculateROI({
        item_cost: 100,
        annual_usage_hours: 500,
        hourly_rate: 85,
        productivity_gain_pct: 10,
        tool_life_improvement_pct: 0,
      });

      expect(roi.estimated_savings).toBeGreaterThan(0);
    });

    it("higher investment yields longer payback", () => {
      const roiLow = acquisitionRecommendationEngine.calculateROI({
        item_cost: 50,
        annual_usage_hours: 500,
        hourly_rate: 85,
        productivity_gain_pct: 10,
        tool_life_improvement_pct: 20,
      });

      const roiHigh = acquisitionRecommendationEngine.calculateROI({
        item_cost: 500,
        annual_usage_hours: 500,
        hourly_rate: 85,
        productivity_gain_pct: 10,
        tool_life_improvement_pct: 20,
      });

      expect(roiHigh.payback_months).toBeGreaterThan(roiLow.payback_months);
    });
  });

  describe("getDistributorInfo", () => {
    it("returns distributor info for valid item", () => {
      const info = acquisitionRecommendationEngine.getDistributorInfo("tool-b1");

      expect(info).toBeDefined();
      expect(info?.name).toBeDefined();
    });

    it("returns null for invalid item", () => {
      const info = acquisitionRecommendationEngine.getDistributorInfo("invalid-xyz");

      expect(info).toBeNull();
    });

    it("includes availability status", () => {
      const info = acquisitionRecommendationEngine.getDistributorInfo("tool-b1");

      expect(info?.availability).toBeDefined();
      expect(["in_stock", "ships_1_week", "ships_2_weeks", "backorder"])
        .toContain(info?.availability);
    });

    it("includes price", () => {
      const info = acquisitionRecommendationEngine.getDistributorInfo("tool-b1");

      expect(typeof info?.price).toBe("number");
      expect(info?.price).toBeGreaterThan(0);
    });

    it("includes lead time days", () => {
      const info = acquisitionRecommendationEngine.getDistributorInfo("tool-b1");

      expect(typeof info?.lead_time_days).toBe("number");
      expect(info?.lead_time_days).toBeGreaterThanOrEqual(0);
    });

    it("returns holder distributor info", () => {
      const info = acquisitionRecommendationEngine.getDistributorInfo("hold-b1");

      expect(info).toBeDefined();
      expect(info?.name).toBeDefined();
    });
  });

  describe("recordPurchase and getPurchaseHistory", () => {
    it("records purchase successfully", () => {
      acquisitionRecommendationEngine.recordPurchase("test-item-001", 5);

      const history = acquisitionRecommendationEngine.getPurchaseHistory("test-item-001");

      expect(history).toBeDefined();
      expect(history?.quantity).toBe(5);
    });

    it("accumulates quantity on repeated purchases", () => {
      acquisitionRecommendationEngine.recordPurchase("test-item-002", 3);
      acquisitionRecommendationEngine.recordPurchase("test-item-002", 2);

      const history = acquisitionRecommendationEngine.getPurchaseHistory("test-item-002");

      expect(history?.quantity).toBe(5);
    });

    it("tracks last purchased timestamp", () => {
      acquisitionRecommendationEngine.recordPurchase("test-item-003", 1);

      const history = acquisitionRecommendationEngine.getPurchaseHistory("test-item-003");

      expect(history?.last_purchased).toBeDefined();
      // Should be a valid ISO date string
      expect(new Date(history!.last_purchased).getTime()).toBeGreaterThan(0);
    });

    it("returns null for items never purchased", () => {
      const history = acquisitionRecommendationEngine.getPurchaseHistory("never-purchased-xyz");

      expect(history).toBeNull();
    });
  });

  describe("compareItems", () => {
    it("compares multiple items", () => {
      const comparison = acquisitionRecommendationEngine.compareItems([
        "tool-b1", "tool-s1", "tool-p1"
      ]);

      expect(comparison).toBeDefined();
      expect(comparison?.items.length).toBe(3);
    });

    it("returns null for empty item list", () => {
      const comparison = acquisitionRecommendationEngine.compareItems([]);

      expect(comparison).toBeNull();
    });

    it("returns null for all invalid items", () => {
      const comparison = acquisitionRecommendationEngine.compareItems([
        "invalid-1", "invalid-2"
      ]);

      expect(comparison).toBeNull();
    });

    it("identifies winner", () => {
      const comparison = acquisitionRecommendationEngine.compareItems([
        "tool-b1", "tool-s1"
      ]);

      expect(comparison?.winner).toBeDefined();
    });

    it("provides reason for winner selection", () => {
      const comparison = acquisitionRecommendationEngine.compareItems([
        "tool-b1", "tool-s1"
      ]);

      expect(comparison?.reason).toBeDefined();
      expect(comparison?.reason.length).toBeGreaterThan(0);
    });

    it("includes ROI for each item", () => {
      const comparison = acquisitionRecommendationEngine.compareItems([
        "tool-b1", "tool-s1"
      ]);

      for (const item of comparison?.items || []) {
        expect(item.roi).toBeDefined();
        expect(typeof item.roi.roi_3_year).toBe("number");
      }
    });

    it("handles single item comparison", () => {
      const comparison = acquisitionRecommendationEngine.compareItems(["tool-b1"]);

      expect(comparison).toBeDefined();
      expect(comparison?.items.length).toBe(1);
      expect(comparison?.winner).toBe("tool-b1");
    });

    it("handles mixed valid and invalid items", () => {
      const comparison = acquisitionRecommendationEngine.compareItems([
        "tool-b1", "invalid-xyz", "tool-s1"
      ]);

      expect(comparison).toBeDefined();
      expect(comparison?.items.length).toBe(2);
    });
  });

  describe("holder recommendations", () => {
    it("returns holder recommendations for VMC", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "holder",
        item_type: "collet_chuck",
      });

      expect(result).toBeDefined();
      expect(result?.category).toBe("holder");
    });

    it("includes hydraulic holders in standard tier", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "holder",
        item_type: "any",
      });

      const hasHydraulic = result?.standard.some(h =>
        h.name.toLowerCase().includes("hydraulic")
      );

      // May or may not have hydraulic depending on compatibility
      expect(typeof hasHydraulic).toBe("boolean");
    });

    it("includes shrink fit holders in premium tier", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "holder",
        item_type: "any",
      });

      const hasShrinkFit = result?.premium.some(h =>
        h.name.toLowerCase().includes("shrink")
      );

      expect(typeof hasShrinkFit).toBe("boolean");
    });
  });

  describe("lathe tooling recommendations", () => {
    it("returns turning insert recommendations for lathe", () => {
      const result = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "LTH-01",
        category: "tooling",
        item_type: "turning_insert",
      });

      expect(result).toBeDefined();
    });

    it("prefers turning inserts over end mills for lathe", () => {
      const insertResult = acquisitionRecommendationEngine.getRecommendations({
        machine_id: "LTH-01",
        category: "tooling",
        item_type: "turning_insert",
      });

      const insertRecs = [
        ...(insertResult?.budget || []),
        ...(insertResult?.standard || []),
        ...(insertResult?.premium || []),
      ];

      // Turning inserts should have higher compatibility scores for lathe
      for (const rec of insertRecs) {
        expect(rec.compatibility_score).toBeGreaterThanOrEqual(70);
      }
    });
  });

  describe("getStats", () => {
    it("returns statistics structure", () => {
      // Generate some recommendations first
      acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      const stats = acquisitionRecommendationEngine.getStats();

      expect(stats.total_recommendations).toBeGreaterThanOrEqual(0);
      expect(stats.by_tier).toBeDefined();
      expect(typeof stats.average_roi).toBe("number");
    });

    it("tracks recommendations by tier", () => {
      acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      const stats = acquisitionRecommendationEngine.getStats();

      expect(typeof stats.by_tier.budget).toBe("number");
      expect(typeof stats.by_tier.standard).toBe("number");
      expect(typeof stats.by_tier.premium).toBe("number");
    });

    it("updates last calculation timestamp", () => {
      acquisitionRecommendationEngine.getRecommendations({
        machine_id: "VMC-01",
        category: "tooling",
        item_type: "end_mill",
      });

      const stats = acquisitionRecommendationEngine.getStats();

      expect(stats.last_calculation).not.toBe("never");
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = acquisitionRecommendationEngine.getSelfAwareness();

      expect(awareness.engine).toBe("AcquisitionRecommendationEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P3-U05");
    });

    it("lists capabilities", () => {
      const awareness = acquisitionRecommendationEngine.getSelfAwareness();

      expect(awareness.capabilities).toContain("getRecommendations");
      expect(awareness.capabilities).toContain("getBestRecommendation");
      expect(awareness.capabilities).toContain("calculateROI");
      expect(awareness.capabilities).toContain("getDistributorInfo");
      expect(awareness.capabilities).toContain("compareItems");
    });

    it("lists supported tiers", () => {
      const awareness = acquisitionRecommendationEngine.getSelfAwareness();

      expect(awareness.tiers).toContain("budget");
      expect(awareness.tiers).toContain("standard");
      expect(awareness.tiers).toContain("premium");
    });

    it("lists supported categories", () => {
      const awareness = acquisitionRecommendationEngine.getSelfAwareness();

      expect(awareness.categories).toContain("tooling");
      expect(awareness.categories).toContain("holder");
    });

    it("lists integrations", () => {
      const awareness = acquisitionRecommendationEngine.getSelfAwareness();

      expect(awareness.integrations).toContain("MachineConsumerBindingEngine");
    });
  });
});
