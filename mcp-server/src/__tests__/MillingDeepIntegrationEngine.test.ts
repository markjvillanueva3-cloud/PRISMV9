/**
 * Tests for MillingDeepIntegrationEngine
 * Validates integration of ALL milling knowledge sources.
 */
import { describe, it, expect } from "vitest";
import {
  MillingDeepIntegrationEngine,
  millingDeepIntegrationEngine,
  type MillingIntegrationContext,
  type IntegrationResult,
} from "../engines/MillingDeepIntegrationEngine.js";

describe("MillingDeepIntegrationEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingDeepIntegrationEngine).toBeDefined();
      expect(millingDeepIntegrationEngine).toBeInstanceOf(MillingDeepIntegrationEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingDeepIntegrationEngine();
      expect(engine).toBeInstanceOf(MillingDeepIntegrationEngine);
    });
  });

  // ============================================================================
  // INTEGRATE METHOD
  // ============================================================================

  describe("integrate()", () => {
    it("returns complete IntegrationResult", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      expect(result.request_id).toMatch(/^MILL-INTEGRATE-/);
      expect(result.timestamp).toBeDefined();
      expect(result.context).toEqual(context);
      expect(result.sources_consulted.length).toBeGreaterThan(10);
      expect(result.total_entries_searched).toBeGreaterThan(5000);
    });

    it("provides integrated parameter recommendations", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        tool_diameter_mm: 10,
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      // RPM recommendation
      expect(result.rpm.parameter).toBe("rpm");
      expect(result.rpm.value).toBeGreaterThan(0);
      expect(result.rpm.sources.length).toBeGreaterThan(0);
      expect(result.rpm.final_confidence).toBeGreaterThan(0);

      // Feed recommendation
      expect(result.feed_mm_min.parameter).toBe("feed_mm_min");
      expect(result.feed_mm_min.value).toBeGreaterThan(0);

      // DOC recommendation
      expect(result.doc_mm.parameter).toBe("doc_mm");
      expect(result.doc_mm.value).toBeGreaterThan(0);
    });

    it("includes multiple sources per recommendation", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      // Should have multiple sources for each recommendation
      expect(result.rpm.sources.length).toBeGreaterThanOrEqual(2);
      expect(result.feed_mm_min.sources.length).toBeGreaterThanOrEqual(2);

      // Each source should have required fields
      for (const source of result.rpm.sources) {
        expect(source.source_id).toBeDefined();
        expect(typeof source.source_value).toBe("number");
        expect(typeof source.weight).toBe("number");
        expect(source.reasoning).toBeDefined();
      }
    });

    it("selects appropriate strategy", async () => {
      const context: MillingIntegrationContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 55,
        operation: "finishing",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      expect(result.recommended_strategy).toBeDefined();
      expect(result.recommended_strategy.toLowerCase()).toContain("hard");
      expect(result.strategy_sources.length).toBeGreaterThan(0);
    });

    it("generates operation sequence", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        feature_type: "pocket",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      expect(result.operation_sequence.length).toBeGreaterThan(0);
      expect(result.operation_sequence).toContain("Face");
      expect(result.operation_sequence).toContain("Rough");
    });

    it("injects tribal knowledge", async () => {
      const context: MillingIntegrationContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        operation: "roughing",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      expect(result.tribal_tips.length).toBeGreaterThan(0);
      expect(result.tribal_tips.some(t => t.toLowerCase().includes("d2"))).toBe(true);
    });

    it("applies playbook rules", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      expect(result.playbook_rules.length).toBeGreaterThan(0);
      expect(result.playbook_rules.some(r => r.toLowerCase().includes("face"))).toBe(true);
    });

    it("validates physics", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        tool_diameter_mm: 10,
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      expect(typeof result.physics_validated).toBe("boolean");
      expect(Array.isArray(result.physics_warnings)).toBe(true);
    });

    it("finds similar PROVEN programs for FONTANA", async () => {
      const context: MillingIntegrationContext = {
        material: "Tool Steel",
        material_iso: "H",
        operation: "roughing",
        customer: "FONTANA",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      expect(result.similar_proven_programs.length).toBeGreaterThan(0);
      expect(result.similar_proven_programs.some(p => p.includes("FONTANA"))).toBe(true);
    });

    it("computes overall confidence", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      expect(result.overall_confidence).toBeGreaterThan(0.5);
      expect(result.overall_confidence).toBeLessThanOrEqual(1);
    });

    it("calculates knowledge coverage", async () => {
      const sparseContext: MillingIntegrationContext = {
        material: "steel",
        material_iso: "P",
        operation: "roughing",
      };

      const richContext: MillingIntegrationContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 58,
        operation: "finishing",
        tool_diameter_mm: 10,
        surface_finish_ra: 0.8,
        customer: "FONTANA",
      };

      const sparseResult = await millingDeepIntegrationEngine.integrate(sparseContext);
      const richResult = await millingDeepIntegrationEngine.integrate(richContext);

      expect(richResult.knowledge_coverage).toBeGreaterThan(sparseResult.knowledge_coverage);
    });
  });

  // ============================================================================
  // QUICK INTEGRATE METHOD
  // ============================================================================

  describe("quickIntegrate()", () => {
    it("returns quick result", () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = millingDeepIntegrationEngine.quickIntegrate(context);

      expect(result.rpm).toBeGreaterThan(0);
      expect(result.feed).toBeGreaterThan(0);
      expect(result.doc).toBeGreaterThan(0);
      expect(result.strategy).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.top_tip).toBeDefined();
    });

    it("adjusts parameters for material", () => {
      const steelContext: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const aluminumContext: MillingIntegrationContext = {
        material: "6061 Aluminum",
        material_iso: "N",
        operation: "roughing",
      };

      const steelResult = millingDeepIntegrationEngine.quickIntegrate(steelContext);
      const aluminumResult = millingDeepIntegrationEngine.quickIntegrate(aluminumContext);

      // Aluminum should have higher RPM
      expect(aluminumResult.rpm).toBeGreaterThan(steelResult.rpm);
    });

    it("includes tribal tip when available", () => {
      const context: MillingIntegrationContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        operation: "roughing",
      };

      const result = millingDeepIntegrationEngine.quickIntegrate(context);

      expect(result.top_tip.toLowerCase()).toContain("d2");
    });
  });

  // ============================================================================
  // GET RELEVANT SOURCES
  // ============================================================================

  describe("getRelevantSources()", () => {
    it("returns sources for FONTANA customer", () => {
      const context: MillingIntegrationContext = {
        material: "Tool Steel",
        material_iso: "H",
        operation: "roughing",
        customer: "FONTANA",
      };

      const sources = millingDeepIntegrationEngine.getRelevantSources(context);

      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.id === "jmdie_proven")).toBe(true);
    });

    it("returns tribal knowledge for hard materials", () => {
      const context: MillingIntegrationContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 55,
        operation: "finishing",
      };

      const sources = millingDeepIntegrationEngine.getRelevantSources(context);

      expect(sources.some(s => s.id === "tribal_knowledge")).toBe(true);
    });

    it("always includes core sources", () => {
      const context: MillingIntegrationContext = {
        material: "steel",
        material_iso: "P",
        operation: "roughing",
      };

      const sources = millingDeepIntegrationEngine.getRelevantSources(context);

      expect(sources.some(s => s.id === "prism_formulas")).toBe(true);
      expect(sources.some(s => s.id === "mill_ultimate_ai")).toBe(true);
    });
  });

  // ============================================================================
  // MATERIAL-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("material-specific behavior", () => {
    it("handles hardened steel (H group)", async () => {
      const context: MillingIntegrationContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 60,
        operation: "finishing",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      // Should recommend hard milling strategy
      expect(result.recommended_strategy.toLowerCase()).toContain("hard");
      // Should inject D2-specific tribal tips
      expect(result.tribal_tips.some(t => t.toLowerCase().includes("d2") || t.toLowerCase().includes("hard"))).toBe(true);
    });

    it("handles aluminum (N group)", async () => {
      const context: MillingIntegrationContext = {
        material: "6061 Aluminum",
        material_iso: "N",
        operation: "roughing",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      // Higher RPM for aluminum
      expect(result.rpm.value).toBeGreaterThan(5000);
      // Should recommend HSM strategy
      expect(result.recommended_strategy.toLowerCase()).toContain("high-speed") ||
        expect(result.recommended_strategy.toLowerCase()).toContain("aluminum");
    });

    it("handles titanium/superalloy (S group)", async () => {
      const context: MillingIntegrationContext = {
        material: "Titanium Ti-6Al-4V",
        material_iso: "S",
        operation: "roughing",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      // Lower speeds for titanium
      expect(result.rpm.value).toBeLessThan(3000);
      // Should have titanium tribal tips
      expect(result.tribal_tips.some(t => t.toLowerCase().includes("titanium"))).toBe(true);
    });
  });

  // ============================================================================
  // FEATURE-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("feature-specific behavior", () => {
    it("handles deep pockets", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        feature_type: "deep_pocket",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      // Should include rest machine in sequence
      expect(result.operation_sequence.some(op =>
        op.toLowerCase().includes("rest") || op.toLowerCase().includes("machine")
      )).toBe(true);
      // Should have deep pocket tips
      expect(result.tribal_tips.some(t => t.toLowerCase().includes("pocket") || t.toLowerCase().includes("deep"))).toBe(true);
    });

    it("handles tight tolerances", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "finishing",
        tolerance_mm: 0.01,
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      // Should include semi-finish in sequence
      expect(result.operation_sequence.some(op => op.toLowerCase().includes("semi"))).toBe(true);
      // Should have thermal stabilization rule
      expect(result.playbook_rules.some(r => r.toLowerCase().includes("thermal"))).toBe(true);
    });
  });

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  describe("conflict resolution", () => {
    it("resolves conflicts between sources", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        customer: "FONTANA",
      };

      const result = await millingDeepIntegrationEngine.integrate(context);

      // With FONTANA customer, there may be conflicts between PROVEN data and formulas
      // The result should still be valid
      expect(result.rpm.value).toBeGreaterThan(0);
      expect(typeof result.rpm.conflict_resolved).toBe("boolean");
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("integrate completes in reasonable time", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        feature_type: "pocket",
      };

      const start = Date.now();
      const result = await millingDeepIntegrationEngine.integrate(context);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500); // Should complete in <500ms
      expect(result).toBeDefined();
    });

    it("quickIntegrate is very fast", () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        millingDeepIntegrationEngine.quickIntegrate(context);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50); // 100 calls in <50ms
    });
  });

  // ============================================================================
  // CONSISTENCY
  // ============================================================================

  describe("consistency", () => {
    it("integrate returns consistent results", async () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result1 = await millingDeepIntegrationEngine.integrate(context);
      const result2 = await millingDeepIntegrationEngine.integrate(context);

      expect(result1.rpm.value).toBe(result2.rpm.value);
      expect(result1.feed_mm_min.value).toBe(result2.feed_mm_min.value);
      expect(result1.recommended_strategy).toBe(result2.recommended_strategy);
    });

    it("quickIntegrate is deterministic", () => {
      const context: MillingIntegrationContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result1 = millingDeepIntegrationEngine.quickIntegrate(context);
      const result2 = millingDeepIntegrationEngine.quickIntegrate(context);

      expect(result1.rpm).toBe(result2.rpm);
      expect(result1.feed).toBe(result2.feed);
      expect(result1.strategy).toBe(result2.strategy);
    });
  });
});
