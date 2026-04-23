/**
 * ToolCatalogAdaptiveEngine Tests
 * RX-P5-U01: Connects tool catalogs to Phase 0.26 adaptive system
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { toolCatalogAdaptiveEngine } from "../engines/ToolCatalogAdaptiveEngine.js";

// Mock the dependent engines
vi.mock("../engines/ToolCatalogEngine.js", () => ({
  toolCatalogEngine: {
    searchTools: vi.fn().mockReturnValue({
      tools: [
        {
          id: "SANDVIK-123",
          part_number: "R390-11T308M-PM",
          manufacturer: "Sandvik",
          tool_type: "endmill",
          cutting_diameter_mm: 12,
          flute_count: 4,
          coating: "TiAlN",
          helix_angle_deg: 38,
          source_catalog: "sandvik-milling",
        },
        {
          id: "KENNAMETAL-456",
          part_number: "KCPM15",
          manufacturer: "Kennametal",
          tool_type: "endmill",
          cutting_diameter_mm: 12.5,
          flute_count: 5,
          coating: "AlTiN",
          helix_angle_deg: 42,
          source_catalog: "kennametal-solid",
        },
      ],
      total_count: 247,
    }),
    recommendTool: vi.fn().mockReturnValue({
      tool_id: "SANDVIK-123",
      tool_type: "endmill",
      diameter_mm: 12,
      speed_sfm: 450,
      feed_per_tooth: 0.12,
      depth_of_cut_mm: 2,
      width_of_cut_mm: 6,
      coolant: "flood",
      confidence: 0.85,
      source: "sandvik-milling",
    }),
  },
  UnifiedTool: {},
  ToolRecommendation: {},
}));

vi.mock("../engines/AdaptivePhysicsBridgeEngine.js", () => ({
  adaptivePhysicsBridgeEngine: {
    performIntegratedAnalysis: vi.fn().mockReturnValue({
      feedOverride: 0.92,
      speedOverride: 0.95,
      processCapabilityScore: 0.78,
      overallStatus: "optimal",
      chip: {
        chipState: { chipBreaking: true, chipType: "c-type" },
      },
      wear: {
        wearStage: "steady",
        remainingLifePercent: 65,
      },
      force: {
        cuttingForce_N: 245,
        thrustForce_N: 123,
      },
      thermal: {
        temperature_C: 380,
        coolingEfficiency: 0.85,
      },
    }),
  },
  IntegratedAdaptiveAnalysis: {},
  AdaptiveCuttingConditions: {},
}));

vi.mock("../engines/AdaptiveSystemIntegrationEngine.js", () => ({
  adaptiveSystemIntegrationEngine: {},
}));

describe("ToolCatalogAdaptiveEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("selectToolsAdaptive", () => {
    it("returns tools with adaptive adjustments for steel roughing", () => {
      const result = toolCatalogAdaptiveEngine.selectToolsAdaptive({
        diameter_mm: 12,
        operation: "roughing",
        material: "steel",
        depth_of_cut_mm: 3,
      });

      expect(result.query.diameter_mm).toBe(12);
      expect(result.query.material).toBe("steel");
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.best_match).toBeDefined();
      expect(result.catalog_coverage.total_tools_searched).toBe(247);
    });

    it("applies feed/speed overrides from adaptive analysis", () => {
      const result = toolCatalogAdaptiveEngine.selectToolsAdaptive({
        diameter_mm: 12,
        material: "stainless",
        operation: "finishing",
      });

      const rec = result.recommendations[0];
      expect(rec.adaptive_adjustments.feed_override).toBe(0.92);
      expect(rec.adaptive_adjustments.speed_override).toBe(0.95);
      expect(rec.adaptive_adjustments.adjusted_speed_mpm).toBeGreaterThan(0);
    });

    it("generates rationale for tool selection", () => {
      const result = toolCatalogAdaptiveEngine.selectToolsAdaptive({
        diameter_mm: 12,
        material: "titanium",
        operation: "roughing",
      });

      const rec = result.recommendations[0];
      expect(rec.rationale.length).toBeGreaterThan(0);
    });

    it("generates warnings when feed is reduced", () => {
      const result = toolCatalogAdaptiveEngine.selectToolsAdaptive({
        diameter_mm: 12,
        material: "superalloy",
        operation: "roughing",
      });

      const rec = result.recommendations[0];
      expect(rec.warnings.some(w => w.includes("reduced"))).toBe(true);
    });

    it("sorts recommendations by capability boost", () => {
      const result = toolCatalogAdaptiveEngine.selectToolsAdaptive({
        diameter_mm: 12,
        material: "aluminum",
        operation: "finishing",
        max_results: 3,
      });

      const boosts = result.recommendations.map(r => r.process_capability_boost);
      for (let i = 1; i < boosts.length; i++) {
        expect(boosts[i]).toBeLessThanOrEqual(boosts[i - 1]);
      }
    });

    it("handles diameter tolerance parameter", () => {
      const result = toolCatalogAdaptiveEngine.selectToolsAdaptive({
        diameter_mm: 12,
        diameter_tolerance_mm: 1.0,
        material: "cast_iron",
        operation: "general",
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("returns catalogs consulted in coverage stats", () => {
      const result = toolCatalogAdaptiveEngine.selectToolsAdaptive({
        diameter_mm: 12,
        material: "steel",
        operation: "roughing",
      });

      expect(result.catalog_coverage.catalogs_consulted).toContain("sandvik-milling");
    });
  });

  describe("getAdaptiveSpeedFeed", () => {
    it("returns catalog-based speed/feed with adaptive corrections", () => {
      const result = toolCatalogAdaptiveEngine.getAdaptiveSpeedFeed({
        tool_diameter_mm: 12,
        material: "steel",
        operation: "roughing",
        flute_count: 4,
      });

      expect(result.catalog_lookup).toBeDefined();
      expect(result.adaptive_speed_mpm).toBeGreaterThan(0);
      expect(result.adaptive_feed_mm_rev).toBeGreaterThan(0);
      expect(result.process_capability_score).toBe(0.78);
    });

    it("includes override reasons in result", () => {
      const result = toolCatalogAdaptiveEngine.getAdaptiveSpeedFeed({
        tool_diameter_mm: 10,
        material: "titanium",
        operation: "finishing",
      });

      expect(result.overrides_applied.feed_override).toBe(0.92);
      expect(result.overrides_applied.speed_override).toBe(0.95);
      expect(result.overrides_applied.reasons.length).toBeGreaterThan(0);
    });

    it("calculates feed per tooth correctly", () => {
      const result = toolCatalogAdaptiveEngine.getAdaptiveSpeedFeed({
        tool_diameter_mm: 16,
        material: "aluminum",
        operation: "roughing",
        flute_count: 3,
      });

      const fpt = result.adaptive_feed_per_tooth_mm;
      const fpr = result.adaptive_feed_mm_rev;
      expect(fpr).toBeCloseTo(fpt * 3, 5);
    });

    it("uses default speed/feed when catalog has no match", () => {
      const result = toolCatalogAdaptiveEngine.getAdaptiveSpeedFeed({
        tool_diameter_mm: 50,
        material: "superalloy",
        operation: "general",
      });

      expect(result.adaptive_speed_mpm).toBeGreaterThan(0);
      expect(result.adaptive_feed_mm_rev).toBeGreaterThan(0);
    });

    it("applies custom cutting conditions when provided", () => {
      const result = toolCatalogAdaptiveEngine.getAdaptiveSpeedFeed({
        tool_diameter_mm: 12,
        material: "stainless",
        operation: "finishing",
        cutting_conditions: {
          cutting_speed_mpm: 80,
          depth_of_cut_mm: 0.5,
        },
      });

      expect(result.process_capability_score).toBeDefined();
    });
  });

  describe("recommendForAdaptive", () => {
    it("provides improvement suggestions for uncoated tool", () => {
      const result = toolCatalogAdaptiveEngine.recommendForAdaptive({
        current_tool: { diameter_mm: 12, flutes: 4 },
        target_capability_score: 0.9,
        material: "titanium",
        operation: "roughing",
      });

      expect(result.current_capability).toBe(0.78);
      expect(result.improvements.some(i => i.suggestion.includes("coating"))).toBe(true);
    });

    it("suggests flute count increase for finishing", () => {
      const result = toolCatalogAdaptiveEngine.recommendForAdaptive({
        current_tool: { diameter_mm: 10, flutes: 2 },
        target_capability_score: 0.85,
        material: "steel",
        operation: "finishing",
      });

      expect(result.improvements.some(i => i.suggestion.includes("flutes"))).toBe(true);
    });

    it("returns best tool match from catalog search", () => {
      const result = toolCatalogAdaptiveEngine.recommendForAdaptive({
        target_capability_score: 0.9,
        material: "stainless",
        operation: "roughing",
      });

      expect(result.best_tool_match).toBeDefined();
    });

    it("sorts improvements by expected capability boost", () => {
      const result = toolCatalogAdaptiveEngine.recommendForAdaptive({
        current_tool: { diameter_mm: 12, flutes: 2 },
        target_capability_score: 0.95,
        material: "aluminum",
        operation: "finishing",
      });

      const boosts = result.improvements.map(i => i.expected_capability_boost);
      for (let i = 1; i < boosts.length; i++) {
        expect(boosts[i]).toBeLessThanOrEqual(boosts[i - 1]);
      }
    });

    it("handles coated tool without suggesting more coating", () => {
      const result = toolCatalogAdaptiveEngine.recommendForAdaptive({
        current_tool: { diameter_mm: 12, flutes: 4, coating: "TiAlN" },
        target_capability_score: 0.9,
        material: "steel",
        operation: "roughing",
      });

      expect(result.improvements.every(i => !i.suggestion.includes("Add") || !i.suggestion.includes("coating"))).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles missing optional parameters gracefully", () => {
      const result = toolCatalogAdaptiveEngine.selectToolsAdaptive({
        material: "steel",
      });

      expect(result.recommendations).toBeDefined();
      expect(result.conditions.tool_diameter_mm).toBeDefined();
    });

    it("handles empty search results", async () => {
      const { toolCatalogEngine } = await import("../engines/ToolCatalogEngine.js");
      vi.mocked(toolCatalogEngine.searchTools).mockReturnValueOnce({
        tools: [],
        total_count: 0,
      });

      const result = toolCatalogAdaptiveEngine.selectToolsAdaptive({
        diameter_mm: 100,
        material: "superalloy",
        operation: "roughing",
      });

      expect(result.recommendations.length).toBe(0);
      expect(result.best_match).toBeNull();
    });
  });
});
