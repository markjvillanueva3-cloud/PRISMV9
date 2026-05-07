/**
 * JMDieRecipeRetrieverEngine Tests (U-MIO42)
 * ===========================================
 * Tests proven recipe retrieval from JM DIE program archive:
 * material/operation queries, statistical aggregation, confidence intervals.
 */

import { describe, it, expect } from "vitest";
import {
  jmDieRecipeRetrieverEngine,
  JMDieRecipeRetrieverEngine,
  type RecipeQuery,
  type AggregatedRecipe,
} from "../engines/JMDieRecipeRetrieverEngine.js";

describe("JMDieRecipeRetrieverEngine", () => {
  // ══════════════════════════════════════════════════════════════════════════
  // Basic retrieval
  // ══════════════════════════════════════════════════════════════════════════
  describe("retrieve() basic", () => {
    it("returns recipes matching material", () => {
      const result = jmDieRecipeRetrieverEngine.retrieve({ material: "D2" });

      expect(result.found_recipes.length).toBeGreaterThan(0);
      expect(result.found_recipes.every(r => r.material === "D2")).toBe(true);
    });

    it("returns recipes matching operation", () => {
      const result = jmDieRecipeRetrieverEngine.retrieve({ operation: "roughing" });

      expect(result.found_recipes.length).toBeGreaterThan(0);
      expect(result.found_recipes.every(r => r.operation === "roughing")).toBe(true);
    });

    it("returns recipes matching machine type", () => {
      const result = jmDieRecipeRetrieverEngine.retrieve({ machine_type: "lathe" });

      expect(result.found_recipes.length).toBeGreaterThan(0);
      expect(result.found_recipes.every(r => r.machine_type === "lathe")).toBe(true);
    });

    it("returns recipes matching customer", () => {
      const result = jmDieRecipeRetrieverEngine.retrieve({ customer: "ALCOA" });

      expect(result.found_recipes.length).toBeGreaterThan(0);
      expect(result.found_recipes.every(r => r.source_customer === "ALCOA")).toBe(true);
    });

    it("returns empty for non-existent material", () => {
      const result = jmDieRecipeRetrieverEngine.retrieve({ material: "unobtanium" });

      expect(result.found_recipes.length).toBe(0);
      expect(result.aggregated).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // retrieveByMaterialOperation
  // ══════════════════════════════════════════════════════════════════════════
  describe("retrieveByMaterialOperation()", () => {
    it("retrieves D2 roughing recipes", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing");

      expect(result.found_recipes.length).toBeGreaterThanOrEqual(5);
      expect(result.aggregated).not.toBeNull();
    });

    it("returns aggregated statistics for sufficient samples", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing", "lathe");

      expect(result.aggregated).not.toBeNull();
      expect(result.aggregated!.sample_size).toBeGreaterThanOrEqual(2);
      expect(result.aggregated!.cutting_speed_m_min.mean).toBeGreaterThan(0);
      expect(result.aggregated!.cutting_speed_m_min.stddev).toBeGreaterThanOrEqual(0);
    });

    it("filters by machine type", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing", "lathe");

      expect(result.found_recipes.every(r => r.machine_type === "lathe")).toBe(true);
    });

    it("resolves ISO group from material name", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("1018", "roughing");

      expect(result.found_recipes.every(r => r.iso_group === "P")).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Statistical aggregation
  // ══════════════════════════════════════════════════════════════════════════
  describe("statistical aggregation", () => {
    it("computes mean cutting speed", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing", "lathe");
      const agg = result.aggregated!;

      expect(agg.cutting_speed_m_min.mean).toBeCloseTo(45.7, 0);
      expect(agg.cutting_speed_m_min.count).toBe(5);
    });

    it("computes standard deviation", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing", "lathe");
      const agg = result.aggregated!;

      expect(agg.cutting_speed_m_min.stddev).toBeGreaterThan(0);
      expect(agg.cutting_speed_m_min.stddev).toBeLessThan(5); // reasonable variance
    });

    it("computes 95% confidence interval", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing", "lathe");
      const agg = result.aggregated!;
      const ci = agg.cutting_speed_m_min.confidence_interval_95;

      expect(ci.lower).toBeLessThan(agg.cutting_speed_m_min.mean);
      expect(ci.upper).toBeGreaterThan(agg.cutting_speed_m_min.mean);
      expect(ci.lower).toBeGreaterThan(40);
      expect(ci.upper).toBeLessThan(50);
    });

    it("computes min and max", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing", "lathe");
      const agg = result.aggregated!;

      expect(agg.cutting_speed_m_min.min).toBeLessThanOrEqual(agg.cutting_speed_m_min.mean);
      expect(agg.cutting_speed_m_min.max).toBeGreaterThanOrEqual(agg.cutting_speed_m_min.mean);
    });

    it("sets confidence score based on sample size", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing", "lathe");
      const agg = result.aggregated!;

      // 5+ samples = high confidence
      expect(agg.cutting_speed_m_min.confidence_score).toBeGreaterThan(0.7);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Recommended parameters
  // ══════════════════════════════════════════════════════════════════════════
  describe("getRecommendedParameters()", () => {
    it("returns recommended values for known material/operation", () => {
      const rec = jmDieRecipeRetrieverEngine.getRecommendedParameters("D2", "roughing", "lathe");

      expect(rec).not.toBeNull();
      expect(rec!.cutting_speed_m_min).toBeGreaterThan(40);
      expect(rec!.cutting_speed_m_min).toBeLessThan(50);
      expect(rec!.feed_mm_rev).toBeGreaterThan(0);
      expect(rec!.depth_of_cut_mm).toBeGreaterThan(0);
    });

    it("returns null for unknown material", () => {
      const rec = jmDieRecipeRetrieverEngine.getRecommendedParameters("unobtanium", "roughing");

      expect(rec).toBeNull();
    });

    it("returns mean values as recommendations", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing", "lathe");
      const rec = jmDieRecipeRetrieverEngine.getRecommendedParameters("D2", "roughing", "lathe");

      expect(rec!.cutting_speed_m_min).toBeCloseTo(result.aggregated!.cutting_speed_m_min.mean, 1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Customer filtering
  // ══════════════════════════════════════════════════════════════════════════
  describe("retrieveByCustomer()", () => {
    it("retrieves recipes for specific customer", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByCustomer("ITW");

      expect(result.found_recipes.length).toBeGreaterThan(0);
      expect(result.found_recipes.every(r => r.source_customer === "ITW")).toBe(true);
    });

    it("filters by operation within customer", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByCustomer("ITW", "roughing");

      expect(result.found_recipes.every(r =>
        r.source_customer === "ITW" && r.operation === "roughing"
      )).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Search
  // ══════════════════════════════════════════════════════════════════════════
  describe("searchRecipes()", () => {
    it("finds recipes by material substring", () => {
      const results = jmDieRecipeRetrieverEngine.searchRecipes("D2");

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.material.includes("D2"))).toBe(true);
    });

    it("finds recipes by customer name", () => {
      const results = jmDieRecipeRetrieverEngine.searchRecipes("ALCOA");

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.source_customer === "ALCOA")).toBe(true);
    });

    it("case insensitive search", () => {
      const results = jmDieRecipeRetrieverEngine.searchRecipes("alcoa");

      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Metadata
  // ══════════════════════════════════════════════════════════════════════════
  describe("metadata methods", () => {
    it("getAvailableMaterials() returns all materials", () => {
      const materials = jmDieRecipeRetrieverEngine.getAvailableMaterials();

      expect(materials.length).toBeGreaterThan(0);
      expect(materials).toContain("D2");
      expect(materials).toContain("M2");
    });

    it("getAvailableCustomers() returns all customers", () => {
      const customers = jmDieRecipeRetrieverEngine.getAvailableCustomers();

      expect(customers.length).toBeGreaterThan(0);
      expect(customers).toContain("ALCOA");
      expect(customers).toContain("ITW");
    });

    it("getStatistics() returns coverage stats", () => {
      const stats = jmDieRecipeRetrieverEngine.getStatistics();

      expect(stats.total_recipes).toBeGreaterThan(0);
      expect(stats.by_machine_type.lathe).toBeGreaterThan(0);
      expect(stats.by_iso_group.H).toBeGreaterThan(0);
      expect(stats.by_operation.roughing).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Edge cases
  // ══════════════════════════════════════════════════════════════════════════
  describe("edge cases", () => {
    it("handles empty query", () => {
      const result = jmDieRecipeRetrieverEngine.retrieve({});

      expect(result.found_recipes.length).toBeGreaterThan(0); // returns all
    });

    it("handles multiple filters", () => {
      const result = jmDieRecipeRetrieverEngine.retrieve({
        material: "D2",
        operation: "roughing",
        machine_type: "lathe",
        customer: "ALCOA",
      });

      expect(result.found_recipes.length).toBeGreaterThanOrEqual(1);
      expect(result.found_recipes.every(r =>
        r.material === "D2" &&
        r.operation === "roughing" &&
        r.machine_type === "lathe" &&
        r.source_customer === "ALCOA"
      )).toBe(true);
    });

    it("tracks retrieval time", () => {
      const result = jmDieRecipeRetrieverEngine.retrieve({ material: "D2" });

      expect(result.retrieval_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.retrieval_time_ms).toBeLessThan(100); // should be fast
    });

    it("sorts by confidence descending", () => {
      const result = jmDieRecipeRetrieverEngine.retrieve({ operation: "roughing" });

      for (let i = 1; i < result.found_recipes.length; i++) {
        expect(result.found_recipes[i - 1].confidence).toBeGreaterThanOrEqual(
          result.found_recipes[i].confidence
        );
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ISO group resolution
  // ══════════════════════════════════════════════════════════════════════════
  describe("ISO group resolution", () => {
    it("resolves carbon steel to P", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("1018", "roughing");
      expect(result.query.iso_group).toBe("P");
    });

    it("resolves stainless to M", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("304 stainless", "finishing");
      expect(result.query.iso_group).toBe("M");
    });

    it("resolves aluminum to N", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("6061", "roughing");
      expect(result.query.iso_group).toBe("N");
    });

    it("resolves tool steel to H", () => {
      const result = jmDieRecipeRetrieverEngine.retrieveByMaterialOperation("D2", "roughing");
      expect(result.query.iso_group).toBe("H");
    });
  });
});
