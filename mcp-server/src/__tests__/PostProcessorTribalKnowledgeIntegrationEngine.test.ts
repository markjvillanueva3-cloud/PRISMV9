/**
 * PostProcessorTribalKnowledgeIntegrationEngine Tests
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorTribalKnowledgeIntegrationEngine,
  CURATED_TRIBAL_TIPS,
  EXTERNAL_KNOWLEDGE_SOURCES
} from "../engines/PostProcessorTribalKnowledgeIntegrationEngine.js";

describe("PostProcessorTribalKnowledgeIntegrationEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorTribalKnowledgeIntegrationEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.curatedTips).toBeGreaterThanOrEqual(30);
      expect(stats.externalSources).toBeGreaterThanOrEqual(8);
      expect(stats.estimatedExternalTips).toBeGreaterThanOrEqual(200);
      expect(stats.criticalTips).toBeGreaterThan(3);
      expect(stats.categoriesCovered).toBeGreaterThan(10);
    });
  });

  describe("Curated Tribal Tips", () => {
    it("should have safety tips", () => {
      const safety = postProcessorTribalKnowledgeIntegrationEngine.getTipsByCategory("safety");
      expect(safety.length).toBeGreaterThan(3);
    });

    it("should have Haas-specific tips", () => {
      const haas = postProcessorTribalKnowledgeIntegrationEngine.getTipsForController("Haas");
      expect(haas.length).toBeGreaterThan(2);
    });

    it("should have Okuma-specific tips", () => {
      const okuma = postProcessorTribalKnowledgeIntegrationEngine.getTipsForController("Okuma");
      expect(okuma.length).toBeGreaterThan(4);
    });

    it("should have Hurco-specific tips", () => {
      const hurco = postProcessorTribalKnowledgeIntegrationEngine.getTipsForController("Hurco");
      expect(hurco.length).toBeGreaterThan(1);
    });

    it("should have Fanuc-specific tips", () => {
      const fanuc = postProcessorTribalKnowledgeIntegrationEngine.getTipsForController("Fanuc");
      expect(fanuc.length).toBeGreaterThan(1);
    });

    it("should have material-specific tips", () => {
      const d2 = postProcessorTribalKnowledgeIntegrationEngine.getTipsForMaterial("D2");
      expect(d2.length).toBeGreaterThan(0);

      const graphite = postProcessorTribalKnowledgeIntegrationEngine.getTipsForMaterial("graphite");
      expect(graphite.length).toBeGreaterThan(0);

      const ti = postProcessorTribalKnowledgeIntegrationEngine.getTipsForMaterial("titanium");
      expect(ti.length).toBeGreaterThan(0);
    });

    it("should have operation-specific tips", () => {
      const drilling = postProcessorTribalKnowledgeIntegrationEngine.getTipsForOperation("drilling");
      expect(drilling.length).toBeGreaterThan(0);

      const threading = postProcessorTribalKnowledgeIntegrationEngine.getTipsForOperation("threading");
      expect(threading.length).toBeGreaterThan(0);

      const milling = postProcessorTribalKnowledgeIntegrationEngine.getTipsForOperation("milling");
      expect(milling.length).toBeGreaterThan(0);
    });

    it("should have physics-aware tips", () => {
      const physics = postProcessorTribalKnowledgeIntegrationEngine.searchTips("Kienzle");
      // At least one should mention physics
      expect(CURATED_TRIBAL_TIPS.some(t => t.physicsBasis?.includes("Kienzle"))).toBe(true);

      const chatter = postProcessorTribalKnowledgeIntegrationEngine.searchTips("chatter");
      expect(chatter.length).toBeGreaterThan(0);
    });

    it("should have complete data for all tips", () => {
      for (const tip of CURATED_TRIBAL_TIPS) {
        expect(tip.id).toBeDefined();
        expect(tip.tip).toBeDefined();
        expect(tip.reasoning).toBeDefined();
        expect(tip.source).toBeDefined();
        expect(tip.applicableTo).toBeDefined();
      }
    });
  });

  describe("Priority Filtering", () => {
    it("should get critical tips", () => {
      const critical = postProcessorTribalKnowledgeIntegrationEngine.getTipsByPriority("critical");
      expect(critical.length).toBeGreaterThan(3);
    });

    it("should get high priority tips", () => {
      const high = postProcessorTribalKnowledgeIntegrationEngine.getTipsByPriority("high");
      expect(high.length).toBeGreaterThan(10);
    });

    it("should get critical safety tips", () => {
      const critSafety = postProcessorTribalKnowledgeIntegrationEngine.getCriticalSafetyTips();
      expect(critSafety.length).toBeGreaterThan(2);
      expect(critSafety.every(t => t.priority === "critical" && t.category === "safety")).toBe(true);
    });
  });

  describe("Context-Based Retrieval", () => {
    it("should get tips for full context", () => {
      const tips = postProcessorTribalKnowledgeIntegrationEngine.getTipsForContext({
        controller: "Haas",
        operation: "milling",
        material: "D2"
      });

      expect(tips.length).toBeGreaterThan(0);
    });

    it("should sort tips by priority", () => {
      const tips = postProcessorTribalKnowledgeIntegrationEngine.getTipsForContext({
        controller: "Haas"
      });

      if (tips.length > 1) {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        for (let i = 0; i < tips.length - 1; i++) {
          expect(order[tips[i].priority]).toBeLessThanOrEqual(order[tips[i + 1].priority]);
        }
      }
    });

    it("should handle partial context", () => {
      const tips = postProcessorTribalKnowledgeIntegrationEngine.getTipsForContext({
        material: "titanium"
      });

      expect(tips.length).toBeGreaterThan(0);
    });
  });

  describe("External Knowledge Sources", () => {
    it("should track 8+ external sources", () => {
      expect(EXTERNAL_KNOWLEDGE_SOURCES.length).toBeGreaterThanOrEqual(8);
    });

    it("should include controller-knowledge-tips", () => {
      const ckt = postProcessorTribalKnowledgeIntegrationEngine.getSource("controller-knowledge-tips");
      expect(ckt).toBeDefined();
      expect(ckt?.estimatedTips).toBeGreaterThan(40);
    });

    it("should include WEDM knowledge", () => {
      const wedm = postProcessorTribalKnowledgeIntegrationEngine.getSource("wedm-knowledge-tips");
      expect(wedm).toBeDefined();
      expect(wedm?.estimatedTips).toBeGreaterThan(50);
    });

    it("should estimate total external tips", () => {
      const total = postProcessorTribalKnowledgeIntegrationEngine.getTotalTips();
      expect(total.external).toBeGreaterThan(200);
    });
  });

  describe("Search", () => {
    it("should search by keyword", () => {
      const results = postProcessorTribalKnowledgeIntegrationEngine.searchTips("HSM");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should search in physics basis", () => {
      const results = postProcessorTribalKnowledgeIntegrationEngine.searchTips("Kienzle");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should search by category", () => {
      const results = postProcessorTribalKnowledgeIntegrationEngine.searchTips("safety");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("AGI Context Injection", () => {
    it("should inject relevant tips for context", () => {
      const result = postProcessorTribalKnowledgeIntegrationEngine.injectForAGIContext({
        controller: "Haas",
        operation: "milling",
        material: "D2"
      });

      expect(result.tipsApplied.length).toBeGreaterThan(0);
      expect(Array.isArray(result.criticalWarnings)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should include physics basis", () => {
      const result = postProcessorTribalKnowledgeIntegrationEngine.injectForAGIContext({
        controller: "all",
        operation: "milling"
      });

      expect(result.physicsBasis.length).toBeGreaterThan(0);
    });

    it("should filter by priority", () => {
      const result = postProcessorTribalKnowledgeIntegrationEngine.injectForAGIContext({
        controller: "Haas",
        priorityFilter: "critical"
      });

      expect(result.tipsApplied.every(t => t.priority === "critical")).toBe(true);
    });
  });

  describe("Category Distribution", () => {
    it("should have diverse categories", () => {
      const dist = postProcessorTribalKnowledgeIntegrationEngine.getCategoryDistribution();

      expect(Object.keys(dist).length).toBeGreaterThan(10);
      expect(dist.safety).toBeGreaterThan(2);
    });
  });

  describe("AI Context", () => {
    it("should generate AI context", () => {
      const context = postProcessorTribalKnowledgeIntegrationEngine.getContextForAI();

      expect(context).toContain("TRIBAL KNOWLEDGE");
      expect(context).toContain("CURATED TIPS");
      expect(context).toContain("EXTERNAL KNOWLEDGE");
      expect(context).toContain("API METHODS");
    });
  });

  describe("Critical Safety Tips", () => {
    it("should include cutter comp cancel warning", () => {
      const critical = postProcessorTribalKnowledgeIntegrationEngine.getCriticalSafetyTips();
      expect(critical.some(t => t.tip.includes("cutter comp") || t.tip.includes("G40"))).toBe(true);
    });

    it("should include graphite dust collection warning", () => {
      const critical = postProcessorTribalKnowledgeIntegrationEngine.getCriticalSafetyTips();
      expect(critical.some(t => t.tip.toLowerCase().includes("graphite"))).toBe(true);
    });
  });

  describe("Specific Tip Coverage", () => {
    it("should include G187 Haas tip", () => {
      expect(CURATED_TRIBAL_TIPS.some(t => t.tip.includes("G187"))).toBe(true);
    });

    it("should include Super-NURBS Okuma tip", () => {
      expect(CURATED_TRIBAL_TIPS.some(t => t.tip.includes("NURBS"))).toBe(true);
    });

    it("should include UltiMotion Hurco tip", () => {
      expect(CURATED_TRIBAL_TIPS.some(t => t.tip.includes("UltiMotion"))).toBe(true);
    });

    it("should include climb milling tip", () => {
      expect(CURATED_TRIBAL_TIPS.some(t => t.tip.toLowerCase().includes("climb"))).toBe(true);
    });

    it("should include Taylor economic speed tip", () => {
      expect(CURATED_TRIBAL_TIPS.some(t => t.tip.includes("Taylor"))).toBe(true);
    });

    it("should include wire EDM skim pass tip", () => {
      expect(CURATED_TRIBAL_TIPS.some(t => t.tip.includes("Skim"))).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty context", () => {
      const tips = postProcessorTribalKnowledgeIntegrationEngine.getTipsForContext({});
      expect(tips.length).toBeGreaterThan(0);
    });

    it("should handle unknown controller", () => {
      const tips = postProcessorTribalKnowledgeIntegrationEngine.getTipsForController("UnknownXYZ");
      // "all"-applicable tips should still match
      expect(Array.isArray(tips)).toBe(true);
    });

    it("should handle unknown source ID", () => {
      expect(postProcessorTribalKnowledgeIntegrationEngine.getSource("fake")).toBeUndefined();
    });
  });
});
