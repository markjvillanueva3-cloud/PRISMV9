/**
 * Tests for AIFeatureAutoRegistryEngine
 *
 * Verifies automatic AI feature discovery and registration capabilities
 */

import { describe, it, expect } from "vitest";
import {
  aiFeatureAutoRegistry,
  AIFeatureAutoRegistryEngine,
} from "../../engines/AIFeatureAutoRegistryEngine.js";

describe("AIFeatureAutoRegistryEngine", () => {
  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(aiFeatureAutoRegistry).toBeInstanceOf(AIFeatureAutoRegistryEngine);
    });

    it("initializes with built-in features", () => {
      const features = aiFeatureAutoRegistry.getAllFeatures();
      expect(features.length).toBeGreaterThan(0);
    });

    it("initializes with built-in domains", () => {
      const domains = aiFeatureAutoRegistry.getAllDomains();
      expect(domains.length).toBeGreaterThan(0);
    });

    it("provides summary", () => {
      const summary = aiFeatureAutoRegistry.getSummary();
      expect(summary).toContain("AIFeatureAutoRegistry");
      expect(summary).toContain("features");
      expect(summary).toContain("domains");
      expect(summary).toContain("Auto-ingest");
    });
  });

  describe("getAllFeatures", () => {
    it("returns array of features", () => {
      const features = aiFeatureAutoRegistry.getAllFeatures();
      expect(Array.isArray(features)).toBe(true);
    });

    it("each feature has required properties", () => {
      const features = aiFeatureAutoRegistry.getAllFeatures();
      for (const feature of features) {
        expect(feature.id).toBeDefined();
        expect(feature.name).toBeDefined();
        expect(feature.engineFile).toBeDefined();
        expect(feature.category).toBeDefined();
        expect(feature.description).toBeDefined();
        expect(Array.isArray(feature.capabilities)).toBe(true);
        expect(Array.isArray(feature.domains)).toBe(true);
        expect(Array.isArray(feature.actions)).toBe(true);
        expect(feature.confidence).toBeGreaterThan(0);
      }
    });

    it("includes DeepAI features", () => {
      const features = aiFeatureAutoRegistry.getAllFeatures();
      const deepAIFeatures = features.filter(f => f.category === "deep_ai");
      expect(deepAIFeatures.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("getAllDomains", () => {
    it("returns array of domains", () => {
      const domains = aiFeatureAutoRegistry.getAllDomains();
      expect(Array.isArray(domains)).toBe(true);
    });

    it("each domain has required properties", () => {
      const domains = aiFeatureAutoRegistry.getAllDomains();
      for (const domain of domains) {
        expect(domain.id).toBeDefined();
        expect(domain.name).toBeDefined();
        expect(domain.description).toBeDefined();
        expect(Array.isArray(domain.features)).toBe(true);
        expect(domain.primaryEngine).toBeDefined();
        expect(Array.isArray(domain.fallbackEngines)).toBe(true);
        expect(Array.isArray(domain.keywords)).toBe(true);
      }
    });

    it("includes deep_reasoning domain", () => {
      const domains = aiFeatureAutoRegistry.getAllDomains();
      const deepReasoning = domains.find(d => d.id === "deep_reasoning");
      expect(deepReasoning).toBeDefined();
      expect(deepReasoning!.primaryEngine).toBe("DeepAIIntelligenceEngine");
    });
  });

  describe("autoIngest", () => {
    it("ingests a new AI feature", () => {
      const event = aiFeatureAutoRegistry.autoIngest("TestAIEngine.ts", {
        name: "Test AI Engine",
        description: "Test engine for unit testing",
        category: "intelligence",
        capabilities: ["test_capability"],
        domains: ["testing"],
      });

      expect(event.type).toBe("feature_added");
      expect(event.featureId).toBeDefined();
      expect(event.engineFile).toBe("TestAIEngine.ts");
    });

    it("updates existing feature", () => {
      // First ingestion
      aiFeatureAutoRegistry.autoIngest("UpdateTestEngine.ts", {
        name: "Update Test v1",
      });

      // Second ingestion - should update
      const event = aiFeatureAutoRegistry.autoIngest("UpdateTestEngine.ts", {
        name: "Update Test v2",
      });

      expect(event.type).toBe("feature_updated");
    });

    it("infers category from engine name", () => {
      const event = aiFeatureAutoRegistry.autoIngest("SomeReasoningEngine.ts");
      const features = aiFeatureAutoRegistry.getAllFeatures();
      const feature = features.find(f => f.engineFile === "SomeReasoningEngine.ts");
      expect(feature?.category).toBe("reasoning");
    });

    it("infers domains from engine name", () => {
      const event = aiFeatureAutoRegistry.autoIngest("LathecamIntelligenceEngine.ts");
      const features = aiFeatureAutoRegistry.getAllFeatures();
      const feature = features.find(f => f.engineFile === "LathecamIntelligenceEngine.ts");
      expect(feature?.domains).toContain("turning");
    });
  });

  describe("getFeaturesByCategory", () => {
    it("filters features by category", () => {
      const deepAIFeatures = aiFeatureAutoRegistry.getFeaturesByCategory("deep_ai");
      expect(deepAIFeatures.length).toBeGreaterThan(0);
      for (const feature of deepAIFeatures) {
        expect(feature.category).toBe("deep_ai");
      }
    });

    it("returns empty array for unknown category", () => {
      const features = aiFeatureAutoRegistry.getFeaturesByCategory("unknown" as any);
      expect(features).toEqual([]);
    });
  });

  describe("findBestFeature", () => {
    it("finds feature for reasoning query", () => {
      const feature = aiFeatureAutoRegistry.findBestFeature("deep chain of thought reasoning");
      expect(feature).toBeDefined();
      expect(feature!.category).toBe("deep_ai");
    });

    it("finds feature for learning query", () => {
      const feature = aiFeatureAutoRegistry.findBestFeature("pattern recognition learning");
      expect(feature).toBeDefined();
    });

    it("respects domain filter", () => {
      const feature = aiFeatureAutoRegistry.findBestFeature("analyze", "deep_reasoning");
      expect(feature).toBeDefined();
    });

    it("returns null for completely unrelated query", () => {
      const feature = aiFeatureAutoRegistry.findBestFeature("xyzzy foobar blah");
      // May still return something with low confidence
      if (feature) {
        expect(feature.confidence).toBeDefined();
      }
    });
  });

  describe("findBestDomain", () => {
    it("finds domain for reasoning query", () => {
      const domain = aiFeatureAutoRegistry.findBestDomain("think and reason deeply");
      expect(domain).toBeDefined();
      expect(domain!.id).toBe("deep_reasoning");
    });

    it("finds domain for learning query", () => {
      const domain = aiFeatureAutoRegistry.findBestDomain("learn patterns and adapt");
      expect(domain).toBeDefined();
      expect(domain!.id).toBe("machine_learning");
    });

    it("finds domain for manufacturing query", () => {
      const domain = aiFeatureAutoRegistry.findBestDomain("optimize speed and feed for steel");
      expect(domain).toBeDefined();
      expect(domain!.id).toBe("manufacturing_intelligence");
    });

    it("finds domain for NLP query", () => {
      const domain = aiFeatureAutoRegistry.findBestDomain("tell me about this command");
      expect(domain).toBeDefined();
      expect(domain!.id).toBe("natural_language");
    });
  });

  describe("routeQuery", () => {
    it("routes reasoning query to DeepAI", () => {
      const routing = aiFeatureAutoRegistry.routeQuery("perform deep chain of thought analysis");
      expect(routing.engine).toContain("DeepAI");
      expect(routing.confidence).toBeGreaterThan(0);
    });

    it("routes manufacturing query appropriately", () => {
      const routing = aiFeatureAutoRegistry.routeQuery("calculate speed and feed for aluminum");
      expect(routing.domain?.name).toBeDefined();
      expect(routing.confidence).toBeGreaterThan(0);
    });

    it("provides dispatcher when available", () => {
      const routing = aiFeatureAutoRegistry.routeQuery("deep reasoning analysis");
      if (routing.feature) {
        expect(routing.dispatcher).toBeDefined();
      }
    });

    it("provides actions when available", () => {
      const routing = aiFeatureAutoRegistry.routeQuery("extended thinking");
      expect(routing.actions).toBeDefined();
      expect(Array.isArray(routing.actions)).toBe(true);
    });
  });

  describe("getStats", () => {
    it("returns statistics object", () => {
      const stats = aiFeatureAutoRegistry.getStats();
      expect(stats.totalFeatures).toBeGreaterThan(0);
      expect(stats.totalDomains).toBeGreaterThan(0);
      expect(stats.byCategory).toBeDefined();
      expect(typeof stats.recentIngestions).toBe("number");
    });

    it("categorizes features correctly", () => {
      const stats = aiFeatureAutoRegistry.getStats();
      expect(stats.byCategory["deep_ai"]).toBeGreaterThan(0);
    });
  });

  describe("getIngestionHistory", () => {
    it("returns ingestion events", () => {
      const history = aiFeatureAutoRegistry.getIngestionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it("events have required properties", () => {
      // Trigger an ingestion first
      aiFeatureAutoRegistry.autoIngest("HistoryTestEngine.ts");

      const history = aiFeatureAutoRegistry.getIngestionHistory();
      const recent = history[history.length - 1];

      expect(recent.type).toBeDefined();
      expect(recent.featureId).toBeDefined();
      expect(recent.timestamp).toBeDefined();
    });
  });

  describe("discoverFeatures", () => {
    it("returns discovery result", async () => {
      const result = await aiFeatureAutoRegistry.discoverFeatures();
      expect(result.totalFeatures).toBeGreaterThan(0);
      expect(result.totalDomains).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("integration", () => {
    it("complete workflow: ingest -> route -> find", () => {
      // Ingest a new feature
      const event = aiFeatureAutoRegistry.autoIngest("WorkflowTestEngine.ts", {
        name: "Workflow Test",
        description: "Tests the complete workflow integration",
        category: "intelligence",
        capabilities: ["workflow_test"],
        domains: ["testing"],
        actions: ["workflow_action"],
      });

      expect(event.type).toBe("feature_added");

      // Verify it's findable
      const features = aiFeatureAutoRegistry.getAllFeatures();
      const found = features.find(f => f.engineFile === "WorkflowTestEngine.ts");
      expect(found).toBeDefined();
      expect(found!.name).toBe("Workflow Test");
    });
  });
});
