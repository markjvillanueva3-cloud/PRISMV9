/**
 * MillAISelfAwarenessIntegrationEngine Tests
 * ==========================================
 * Tests for the mill-specific AI self-awareness integration engine.
 */

import { describe, it, expect } from "vitest";
import {
  millAISelfAwarenessIntegrationEngine,
  MILL_ENGINE_REGISTRY,
  JM_DIE_HAAS_MILL_CUSTOMERS,
  MILL_RESOURCES,
  MILL_TRIBAL_KNOWLEDGE,
  MILL_PHYSICS_CAPABILITIES
} from "../engines/MillAISelfAwarenessIntegrationEngine.js";

describe("MillAISelfAwarenessIntegrationEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = millAISelfAwarenessIntegrationEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.engines).toBeGreaterThan(25);
      expect(stats.jmDiePrograms).toBe(533);
      expect(stats.jmDieCustomers).toBeGreaterThan(15);
      expect(stats.tribalTips).toBeGreaterThan(15);
      expect(stats.resourceCategories).toBeGreaterThan(5);
      expect(stats.physicsModels).toBeGreaterThan(10);
    });
  });

  describe("Mill Engine Registry", () => {
    it("should have comprehensive engine registry", () => {
      expect(MILL_ENGINE_REGISTRY.length).toBeGreaterThan(25);
    });

    it("should have AI master engines", () => {
      const aiMasters = MILL_ENGINE_REGISTRY.filter(e => e.category === "ai-master");
      expect(aiMasters.length).toBeGreaterThan(2);
      expect(aiMasters.some(e => e.name.includes("AGI"))).toBe(true);
    });

    it("should have deep learning engines", () => {
      const dlEngines = MILL_ENGINE_REGISTRY.filter(e => e.category === "deep-learning");
      expect(dlEngines.length).toBeGreaterThan(3);
      expect(dlEngines.some(e => e.name.includes("Neural"))).toBe(true);
    });

    it("should have reasoning engines", () => {
      const reasoningEngines = MILL_ENGINE_REGISTRY.filter(e => e.category === "reasoning");
      expect(reasoningEngines.length).toBeGreaterThan(2);
    });

    it("should have knowledge engines", () => {
      const knowledgeEngines = MILL_ENGINE_REGISTRY.filter(e => e.category === "knowledge");
      expect(knowledgeEngines.length).toBeGreaterThan(3);
      expect(knowledgeEngines.some(e => e.name.includes("Tribal"))).toBe(true);
    });

    it("should have science/physics engines", () => {
      const scienceEngines = MILL_ENGINE_REGISTRY.filter(e => e.category === "science");
      expect(scienceEngines.length).toBeGreaterThan(1);
    });

    it("should have line counts for all engines", () => {
      for (const engine of MILL_ENGINE_REGISTRY) {
        expect(engine.lines).toBeGreaterThan(0);
        expect(engine.capabilities.length).toBeGreaterThan(0);
      }
    });
  });

  describe("JM Die Haas Mill Customers", () => {
    it("should have customer database", () => {
      expect(JM_DIE_HAAS_MILL_CUSTOMERS.length).toBeGreaterThan(15);
    });

    it("should have ALCOA customer", () => {
      const alcoa = JM_DIE_HAAS_MILL_CUSTOMERS.find(c => c.name.includes("ALCOA"));
      expect(alcoa).toBeDefined();
      expect(alcoa?.programs).toBeGreaterThan(0);
    });

    it("should have primary operations for each customer", () => {
      for (const customer of JM_DIE_HAAS_MILL_CUSTOMERS) {
        expect(customer.folder).toBeDefined();
        expect(customer.programs).toBeGreaterThan(0);
        expect(customer.primaryOps.length).toBeGreaterThan(0);
      }
    });

    it("should get customer by name", () => {
      const customer = millAISelfAwarenessIntegrationEngine.getJMDieCustomer("ALCOA");
      expect(customer).toBeDefined();
      expect(customer?.name).toContain("ALCOA");
    });

    it("should get customer path", () => {
      const path = millAISelfAwarenessIntegrationEngine.getJMDieCustomerPath("ALCOA");
      expect(path).toContain("JM DIE");
      expect(path).toContain("MILL HAAS");
    });

    it("should return null for unknown customer", () => {
      const path = millAISelfAwarenessIntegrationEngine.getJMDieCustomerPath("NONEXISTENT");
      expect(path).toBeNull();
    });
  });

  describe("Mill Resources", () => {
    it("should have resource categories", () => {
      expect(MILL_RESOURCES.length).toBeGreaterThan(5);
    });

    it("should have post processors category", () => {
      const posts = MILL_RESOURCES.find(r => r.category.includes("Post"));
      expect(posts).toBeDefined();
      expect(posts?.count).toBeGreaterThan(50);
    });

    it("should have training materials", () => {
      const training = MILL_RESOURCES.find(r => r.category.includes("Training"));
      expect(training).toBeDefined();
    });

    it("should have tool libraries", () => {
      const tools = MILL_RESOURCES.find(r => r.category.includes("Tool"));
      expect(tools).toBeDefined();
      expect(tools?.count).toBeGreaterThan(100);
    });

    it("should have hyperMILL files", () => {
      const hypermill = MILL_RESOURCES.find(r => r.category.includes("hyperMILL"));
      expect(hypermill).toBeDefined();
      expect(hypermill?.count).toBeGreaterThan(70000);
    });

    it("should get resources by category", () => {
      const pdfs = millAISelfAwarenessIntegrationEngine.getResourcesByCategory("PDF");
      expect(pdfs).toBeDefined();
      expect(pdfs?.count).toBeGreaterThan(500);
    });
  });

  describe("Tribal Knowledge", () => {
    it("should have tribal tips", () => {
      expect(MILL_TRIBAL_KNOWLEDGE.length).toBeGreaterThan(15);
    });

    it("should have Haas-specific tips", () => {
      const haasTips = MILL_TRIBAL_KNOWLEDGE.filter(t => t.controller === "Haas");
      expect(haasTips.length).toBeGreaterThan(3);
      expect(haasTips.some(t => t.tip.includes("G187"))).toBe(true);
    });

    it("should have Hurco-specific tips", () => {
      const hurcoTips = MILL_TRIBAL_KNOWLEDGE.filter(t => t.controller === "Hurco");
      expect(hurcoTips.length).toBeGreaterThan(1);
    });

    it("should have Okuma-specific tips", () => {
      const okumaTips = MILL_TRIBAL_KNOWLEDGE.filter(t => t.controller === "Okuma");
      expect(okumaTips.length).toBeGreaterThan(1);
    });

    it("should have general mill tips", () => {
      const generalTips = MILL_TRIBAL_KNOWLEDGE.filter(t => t.controller === "all");
      expect(generalTips.length).toBeGreaterThan(5);
    });

    it("should have confidence scores", () => {
      for (const tip of MILL_TRIBAL_KNOWLEDGE) {
        expect(tip.confidence).toBeGreaterThan(0);
        expect(tip.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should search tribal knowledge", () => {
      const haasTips = millAISelfAwarenessIntegrationEngine.searchTribalKnowledge("haas");
      expect(haasTips.length).toBeGreaterThan(0);
      expect(haasTips.every(t =>
        t.tip.toLowerCase().includes("haas") ||
        t.controller.toLowerCase().includes("haas") ||
        t.id.toLowerCase().includes("haas")
      )).toBe(true);
    });

    it("should search by keyword", () => {
      const g187Tips = millAISelfAwarenessIntegrationEngine.searchTribalKnowledge("G187");
      expect(g187Tips.length).toBeGreaterThan(0);
    });
  });

  describe("Physics Capabilities", () => {
    it("should have force models", () => {
      expect(MILL_PHYSICS_CAPABILITIES.forceModels.length).toBeGreaterThan(2);
      expect(MILL_PHYSICS_CAPABILITIES.forceModels.some(m => m.name.includes("Kienzle"))).toBe(true);
    });

    it("should have thermal models", () => {
      expect(MILL_PHYSICS_CAPABILITIES.thermalModels.length).toBeGreaterThan(1);
    });

    it("should have stability models", () => {
      expect(MILL_PHYSICS_CAPABILITIES.stabilityModels.length).toBeGreaterThan(0);
      expect(MILL_PHYSICS_CAPABILITIES.stabilityModels.some(m =>
        m.name.toLowerCase().includes("tlusty") ||
        m.name.toLowerCase().includes("stability") ||
        m.name.toLowerCase().includes("chatter")
      )).toBe(true);
    });

    it("should have deflection models", () => {
      expect(MILL_PHYSICS_CAPABILITIES.deflectionModels.length).toBeGreaterThan(1);
    });

    it("should have surface models", () => {
      expect(MILL_PHYSICS_CAPABILITIES.surfaceModels.length).toBeGreaterThan(1);
    });

    it("should have tool life models", () => {
      expect(MILL_PHYSICS_CAPABILITIES.toolLifeModels.length).toBeGreaterThan(0);
      expect(MILL_PHYSICS_CAPABILITIES.toolLifeModels.some(m => m.name.toLowerCase().includes("taylor"))).toBe(true);
    });

    it("should get physics model by type", () => {
      const forceModels = millAISelfAwarenessIntegrationEngine.getPhysicsModel("force");
      expect(forceModels.length).toBeGreaterThan(2);
      expect(forceModels[0].formula).toBeDefined();
    });

    it("should have formulas for all models", () => {
      const allModels = [
        ...MILL_PHYSICS_CAPABILITIES.forceModels,
        ...MILL_PHYSICS_CAPABILITIES.thermalModels,
        ...MILL_PHYSICS_CAPABILITIES.stabilityModels,
        ...MILL_PHYSICS_CAPABILITIES.deflectionModels,
        ...MILL_PHYSICS_CAPABILITIES.surfaceModels,
        ...MILL_PHYSICS_CAPABILITIES.toolLifeModels
      ];

      for (const model of allModels) {
        expect(model.formula).toBeDefined();
        expect(model.engine).toBeDefined();
      }
    });
  });

  describe("Engine Search", () => {
    it("should search engines by name", () => {
      const results = millAISelfAwarenessIntegrationEngine.searchEngines("deep");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(e => e.name.includes("Deep"))).toBe(true);
    });

    it("should search engines by capability", () => {
      const results = millAISelfAwarenessIntegrationEngine.searchEngines("neural");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should search engines by category", () => {
      const results = millAISelfAwarenessIntegrationEngine.searchEngines("reasoning");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty for no match", () => {
      const results = millAISelfAwarenessIntegrationEngine.searchEngines("nonexistent_xyz_123");
      expect(results.length).toBe(0);
    });
  });

  describe("Engine Recommendations", () => {
    it("should recommend engines for deep learning task", () => {
      const recs = millAISelfAwarenessIntegrationEngine.recommendEngine("deep learning pattern recognition");
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].confidence).toBeGreaterThan(0.5);
      expect(recs[0].reasoning).toBeDefined();
    });

    it("should recommend engines for physics task", () => {
      const recs = millAISelfAwarenessIntegrationEngine.recommendEngine("force calculation thermal analysis");
      expect(recs.length).toBeGreaterThan(0);
    });

    it("should recommend engines for optimization task", () => {
      const recs = millAISelfAwarenessIntegrationEngine.recommendEngine("optimize cycle time speed feed");
      expect(recs.length).toBeGreaterThan(0);
    });

    it("should recommend engines for print-to-program task", () => {
      const recs = millAISelfAwarenessIntegrationEngine.recommendEngine("print to program feature recognition");
      expect(recs.length).toBeGreaterThan(0);
    });

    it("should recommend engines for mill-turn task", () => {
      const recs = millAISelfAwarenessIntegrationEngine.recommendEngine("mill turn live tooling swiss");
      expect(recs.length).toBeGreaterThan(0);
    });
  });

  describe("System Awareness", () => {
    it("should return full system awareness", () => {
      const awareness = millAISelfAwarenessIntegrationEngine.getMillSystemAwareness();

      expect(awareness.engineInventory.total).toBeGreaterThan(25);
      expect(awareness.jmDieIntegration.totalPrograms).toBe(533);
      expect(awareness.resourcesIntegration.totalFiles).toBeGreaterThan(70000);
      expect(awareness.tribalKnowledge.totalTips).toBeGreaterThan(15);
    });

    it("should have engine categories", () => {
      const awareness = millAISelfAwarenessIntegrationEngine.getMillSystemAwareness();
      expect(Object.keys(awareness.engineInventory.byCategory).length).toBeGreaterThan(5);
    });

    it("should have capabilities list", () => {
      const awareness = millAISelfAwarenessIntegrationEngine.getMillSystemAwareness();
      expect(awareness.engineInventory.capabilities.length).toBeGreaterThan(20);
    });

    it("should have primary operations", () => {
      const awareness = millAISelfAwarenessIntegrationEngine.getMillSystemAwareness();
      expect(awareness.jmDieIntegration.primaryOperations.length).toBeGreaterThan(5);
    });

    it("should have controller list", () => {
      const awareness = millAISelfAwarenessIntegrationEngine.getMillSystemAwareness();
      expect(awareness.resourcesIntegration.controllers.length).toBeGreaterThan(3);
    });

    it("should have PRISM integration info", () => {
      const awareness = millAISelfAwarenessIntegrationEngine.getMillSystemAwareness();
      expect(awareness.prismIntegration.dispatchers).toBe(17);
      expect(awareness.prismIntegration.selfAwarenessEngine).toBe("PRISMSelfAwarenessEngine");
    });
  });

  describe("AI Context Generation", () => {
    it("should generate context for AI", () => {
      const context = millAISelfAwarenessIntegrationEngine.getContextForAI();

      expect(context).toContain("MILL AI SYSTEM AWARENESS");
      expect(context).toContain("Engines:");
      expect(context).toContain("JM DIE HAAS MILL");
      expect(context).toContain("TRIBAL KNOWLEDGE");
      expect(context).toContain("PHYSICS MODELS");
    });

    it("should include API methods in context", () => {
      const context = millAISelfAwarenessIntegrationEngine.getContextForAI();

      expect(context).toContain("searchEngines");
      expect(context).toContain("getJMDieCustomerPath");
      expect(context).toContain("searchTribalKnowledge");
      expect(context).toContain("recommendEngine");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty search query", () => {
      const results = millAISelfAwarenessIntegrationEngine.searchEngines("");
      expect(results.length).toBe(MILL_ENGINE_REGISTRY.length);  // Returns all
    });

    it("should handle partial customer name", () => {
      const customer = millAISelfAwarenessIntegrationEngine.getJMDieCustomer("alco");
      expect(customer?.name).toContain("ALCOA");
    });

    it("should handle case-insensitive search", () => {
      const results1 = millAISelfAwarenessIntegrationEngine.searchTribalKnowledge("HAAS");
      const results2 = millAISelfAwarenessIntegrationEngine.searchTribalKnowledge("haas");
      expect(results1.length).toBe(results2.length);
    });
  });
});
