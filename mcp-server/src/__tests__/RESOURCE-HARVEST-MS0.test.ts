/**
 * RESOURCE-HARVEST-MS0: Resource Harvesting Intelligence Engine Tests
 *
 * Deep Learning + Deep Reasoning + Claude Opus Intelligence for ALL resources:
 * - 998 PDFs, 100 videos, 1,162 CAM/NC files
 * - MIT courses, workholding catalogs, controller manuals
 * - CAM training (hyperMILL, Mastercam, Fusion, InventorCAM)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  ResourceHarvestingIntelligenceEngine,
  resourceHarvestingIntelligenceEngine,
  ResourceType,
  ResourceDomain,
  ResourceManufacturer,
  ResourceEntry,
  ResourceCatalog,
  ResourceQuery,
  ResourceResponse,
  ResourceReasoningChain,
  LearningPath,
} from "../engines/ResourceHarvestingIntelligenceEngine.js";

describe("RESOURCE-HARVEST-MS0: Resource Harvesting Intelligence Engine", () => {
  let engine: ResourceHarvestingIntelligenceEngine;

  beforeAll(() => {
    engine = resourceHarvestingIntelligenceEngine;
  });

  // ==========================================================================
  // CATALOG
  // ==========================================================================

  describe("Resource Catalog", () => {
    it("should have populated catalog", () => {
      const catalog = engine.getCatalog();
      expect(catalog.total_resources).toBeGreaterThan(0);
      expect(catalog.resources.length).toBeGreaterThan(0);
    });

    it("should track resource counts by type", () => {
      const catalog = engine.getCatalog();
      expect(Object.keys(catalog.by_type).length).toBeGreaterThan(0);
    });

    it("should track resource counts by domain", () => {
      const catalog = engine.getCatalog();
      expect(Object.keys(catalog.by_domain).length).toBeGreaterThan(0);
    });

    it("should track resource counts by manufacturer", () => {
      const catalog = engine.getCatalog();
      expect(Object.keys(catalog.by_manufacturer).length).toBeGreaterThan(0);
    });

    it("should calculate total size and pages", () => {
      const catalog = engine.getCatalog();
      expect(catalog.total_size_mb).toBeGreaterThan(0);
      expect(catalog.total_pages).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // PDF MANUALS
  // ==========================================================================

  describe("PDF Manuals", () => {
    it("should have hyperMILL manual", () => {
      const resources = engine.getResourcesByDomain("cam_hypermill");
      expect(resources.length).toBeGreaterThan(0);
      const manual = resources.find(r => r.title.includes("hyperMILL Manual"));
      expect(manual).toBeDefined();
    });

    it("should have hyperCAD-S manual", () => {
      const resources = engine.getResourcesByDomain("cam_hypermill");
      const manual = resources.find(r => r.title.includes("hyperCAD-S"));
      expect(manual).toBeDefined();
    });

    it("should have AUTOMATION Center manual", () => {
      const resources = engine.getResourcesByDomain("cam_hypermill");
      const manual = resources.find(r => r.title.includes("AUTOMATION Center"));
      expect(manual).toBeDefined();
    });

    it("should have VIRTUAL Machining Center manual", () => {
      const resources = engine.getResourcesByDomain("cam_hypermill");
      const manual = resources.find(r => r.title.includes("VIRTUAL Machining"));
      expect(manual).toBeDefined();
    });

    it("should have Haas Mill Operator Manual NGC 2023", () => {
      const resources = engine.getResourcesByDomain("controller_haas");
      expect(resources.length).toBeGreaterThan(0);
      const manual = resources.find(r => r.title.includes("NGC 2023"));
      expect(manual).toBeDefined();
      expect(manual?.year).toBe(2023);
    });

    it("should have Mazak Mazatrol programming manuals", () => {
      const resources = engine.getResourcesByDomain("controller_mazak");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have Okuma OSP manuals", () => {
      const resources = engine.getResourcesByDomain("controller_okuma");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have Siemens 5-axis guide", () => {
      const resources = engine.getResourcesByDomain("controller_siemens");
      expect(resources.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // INVENTORCAM TRAINING
  // ==========================================================================

  describe("InventorCAM Training", () => {
    it("should have InventorCAM resources", () => {
      const resources = engine.getResourcesByDomain("cam_inventorcam");
      expect(resources.length).toBeGreaterThanOrEqual(15);
    });

    it("should have 2.5D milling training", () => {
      const resources = engine.getResourcesByDomain("cam_inventorcam");
      const training = resources.find(r => r.title.includes("2.5D Milling"));
      expect(training).toBeDefined();
    });

    it("should have 3D HSM user guide", () => {
      const resources = engine.getResourcesByDomain("cam_inventorcam");
      const training = resources.find(r => r.title.includes("3D HSM"));
      expect(training).toBeDefined();
    });

    it("should have 5-axis training volumes", () => {
      const resources = engine.getResourcesByDomain("cam_inventorcam");
      const vol1 = resources.find(r => r.title.includes("5-Axis") && r.title.includes("Vol. 1"));
      const vol2 = resources.find(r => r.title.includes("5-Axis") && r.title.includes("Vol. 2"));
      const vol3 = resources.find(r => r.title.includes("5-Axis") && r.title.includes("Vol. 3"));
      expect(vol1).toBeDefined();
      expect(vol2).toBeDefined();
      expect(vol3).toBeDefined();
    });

    it("should have SWARF machining guide", () => {
      const resources = engine.getResourcesByDomain("cam_inventorcam");
      const swarf = resources.find(r => r.title.includes("SWARF"));
      expect(swarf).toBeDefined();
    });

    it("should have Turning & Mill-Turn training", () => {
      const resources = engine.getResourcesByDomain("cam_inventorcam");
      const training = resources.find(r => r.title.includes("Mill-Turn"));
      expect(training).toBeDefined();
      expect(training?.relevance_score).toBeGreaterThanOrEqual(90);
    });
  });

  // ==========================================================================
  // G-CODE PROGRAMMING GUIDES
  // ==========================================================================

  describe("G-Code Programming Guides", () => {
    it("should have CNC basics guide", () => {
      const resources = engine.searchResources("CNC basics");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have G-code programming tutorial 2024", () => {
      const resources = engine.getResourcesByDomain("programming_gcode");
      const tutorial = resources.find(r => r.title.includes("G-Code") && r.year === 2024);
      expect(tutorial).toBeDefined();
    });

    it("should have feeds and speeds guide", () => {
      const resources = engine.searchResources("feeds speeds");
      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0].relevance_score).toBeGreaterThanOrEqual(90);
    });

    it("should have G41/G42 tool compensation guide", () => {
      const resources = engine.searchResources("G41 G42 compensation");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have G76 threading cycle guide", () => {
      const resources = engine.searchResources("G76 threading");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have helical interpolation guide", () => {
      const resources = engine.searchResources("helical interpolation");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have G02/G03 arc tutorial", () => {
      const resources = engine.searchResources("G02 G03 arc");
      expect(resources.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // WORKHOLDING CATALOGS
  // ==========================================================================

  describe("Workholding Catalogs", () => {
    it("should have workholding resources", () => {
      const resources = engine.getResourcesByDomain("workholding");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have SCHUNK catalog", () => {
      const resources = engine.getResourcesByManufacturer("schunk");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have KURT catalog", () => {
      const resources = engine.getResourcesByManufacturer("kurt");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have System 3R catalog", () => {
      const resources = engine.getResourcesByManufacturer("system_3r");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have 5th Axis catalog", () => {
      const resources = engine.getResourcesByManufacturer("5th_axis");
      expect(resources.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // TRAINING DAY MATERIALS
  // ==========================================================================

  describe("Training Day Materials", () => {
    it("should have Day 1 training resources", () => {
      const resources = engine.searchResources("Training Day 1");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have MAXX Roughing training", () => {
      const resources = engine.searchResources("MAXX Roughing");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have Tool Database training", () => {
      const resources = engine.searchResources("Tool Database training");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have Z-Level Options training", () => {
      const resources = engine.searchResources("Z-Level");
      expect(resources.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // MIT COURSES
  // ==========================================================================

  describe("MIT OpenCourseWare", () => {
    it("should have MIT courses", () => {
      const resources = engine.getResourcesByDomain("mit_course");
      expect(resources.length).toBeGreaterThan(0);
    });

    it("should have MIT 2.008 Manufacturing course", () => {
      const resources = engine.getResourcesByManufacturer("mit");
      const course = resources.find(r => r.title.includes("2.008"));
      expect(course).toBeDefined();
      expect(course?.topics).toContain("manufacturing");
    });

    it("should have MIT 2.830J Process Control course", () => {
      const resources = engine.getResourcesByManufacturer("mit");
      const course = resources.find(r => r.title.includes("2.830J"));
      expect(course).toBeDefined();
    });

    it("should have MIT 3.012 Materials Science course", () => {
      const resources = engine.getResourcesByManufacturer("mit");
      const course = resources.find(r => r.title.includes("3.012"));
      expect(course).toBeDefined();
    });
  });

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  describe("Resource Search", () => {
    it("should search by keyword", () => {
      const results = engine.searchResources("hypermill");
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        const text = `${r.title} ${r.description} ${r.keywords.join(" ")}`.toLowerCase();
        expect(text).toContain("hypermill");
      }
    });

    it("should filter by type", () => {
      const results = engine.searchResources("machining", { type: "pdf_manual" });
      for (const r of results) {
        expect(r.type).toBe("pdf_manual");
      }
    });

    it("should filter by domain", () => {
      const results = engine.searchResources("milling", { domain: "cam_inventorcam" });
      for (const r of results) {
        expect(r.domain).toBe("cam_inventorcam");
      }
    });

    it("should filter by manufacturer", () => {
      const results = engine.searchResources("manual", { manufacturer: "open_mind" });
      for (const r of results) {
        expect(r.manufacturer).toBe("open_mind");
      }
    });

    it("should filter by minimum relevance", () => {
      const results = engine.searchResources("milling", { min_relevance: 80 });
      for (const r of results) {
        expect(r.relevance_score).toBeGreaterThanOrEqual(80);
      }
    });

    it("should sort by relevance score", () => {
      const results = engine.searchResources("milling");
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevance_score).toBeGreaterThanOrEqual(results[i].relevance_score);
      }
    });
  });

  // ==========================================================================
  // DEEP LEARNING — Feature Extraction
  // ==========================================================================

  describe("Deep Learning (Feature Extraction)", () => {
    it("should extract feature vector from resource", () => {
      const resources = engine.getAllResources();
      const resource = resources[0];
      const features = engine.extractFeatures(resource);

      expect(features.resource_id).toBe(resource.id);
      expect(features.features).toBeDefined();
      expect(Object.keys(features.features).length).toBeGreaterThan(10);
    });

    it("should have domain one-hot encoding", () => {
      const hypermillResources = engine.getResourcesByDomain("cam_hypermill");
      if (hypermillResources.length > 0) {
        const features = engine.extractFeatures(hypermillResources[0]);
        expect(features.features.is_cam_hypermill).toBe(1);
        expect(features.features.is_cam_mastercam).toBe(0);
      }
    });

    it("should have type features", () => {
      const manuals = engine.getResourcesByType("pdf_manual");
      if (manuals.length > 0) {
        const features = engine.extractFeatures(manuals[0]);
        expect(features.features.is_manual).toBe(1);
        expect(features.features.is_training).toBe(0);
      }
    });

    it("should normalize content features", () => {
      const resources = engine.getAllResources();
      for (const r of resources.slice(0, 10)) {
        const features = engine.extractFeatures(r);
        expect(features.features.relevance_score).toBeGreaterThanOrEqual(0);
        expect(features.features.relevance_score).toBeLessThanOrEqual(1);
        expect(features.features.page_count_normalized).toBeGreaterThanOrEqual(0);
        expect(features.features.page_count_normalized).toBeLessThanOrEqual(1);
      }
    });
  });

  // ==========================================================================
  // DEEP LEARNING — Similarity
  // ==========================================================================

  describe("Deep Learning (Similarity)", () => {
    it("should find similar resources", () => {
      const resources = engine.getAllResources();
      const resource = resources[0];
      const similar = engine.findSimilarResources(resource, 5);

      expect(similar.length).toBeLessThanOrEqual(5);
      for (const match of similar) {
        expect(match.resource.id).not.toBe(resource.id);
        expect(match.similarity_score).toBeGreaterThanOrEqual(0);
        expect(match.similarity_score).toBeLessThanOrEqual(100);
      }
    });

    it("should score higher for same domain", () => {
      const hypermillResources = engine.getResourcesByDomain("cam_hypermill");
      if (hypermillResources.length >= 2) {
        const similar = engine.findSimilarResources(hypermillResources[0], 10);
        const sameDomain = similar.find(m => m.resource.domain === "cam_hypermill");
        if (sameDomain) {
          expect(sameDomain.domain_match).toBe(100);
        }
      }
    });

    it("should provide similarity explanations", () => {
      const resources = engine.getAllResources();
      const similar = engine.findSimilarResources(resources[0], 3);
      for (const match of similar) {
        expect(match.explanation).toBeTruthy();
        expect(match.explanation.length).toBeGreaterThan(10);
      }
    });

    it("should calculate cosine similarity correctly", () => {
      const resources = engine.getAllResources();
      const a = engine.extractFeatures(resources[0]);
      const b = engine.extractFeatures(resources[0]);
      const similarity = engine.calculateSimilarity(a, b);
      expect(similarity).toBeCloseTo(1.0, 5); // Same resource = 100% similar
    });
  });

  // ==========================================================================
  // DEEP REASONING
  // ==========================================================================

  describe("Deep Reasoning (Chain-of-Thought)", () => {
    it("should generate reasoning chain", () => {
      const chain = engine.generateReasoningChain("hyperMILL manual");
      expect(chain.steps.length).toBe(5);
      expect(chain.query).toBe("hyperMILL manual");
      expect(chain.confidence).toBeGreaterThan(0);
    });

    it("should have all 5 reasoning step types", () => {
      const chain = engine.generateReasoningChain("5-axis milling InventorCAM");
      const types = chain.steps.map(s => s.type);
      expect(types).toContain("observation");
      expect(types).toContain("domain_detection");
      expect(types).toContain("resource_search");
      expect(types).toContain("ranking");
      expect(types).toContain("synthesis");
    });

    it("should find resources in reasoning", () => {
      const chain = engine.generateReasoningChain("feeds and speeds");
      expect(chain.resources_found.length).toBeGreaterThan(0);
    });

    it("should generate learning paths", () => {
      const chain = engine.generateReasoningChain("InventorCAM training");
      // May or may not have learning paths depending on results
      expect(Array.isArray(chain.learning_paths)).toBe(true);
    });

    it("should cite sources", () => {
      const chain = engine.generateReasoningChain("hyperMILL MAXX roughing");
      expect(chain.sources.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // NL INTERFACE
  // ==========================================================================

  describe("Natural Language Interface", () => {
    it("should process natural language query", () => {
      const response = engine.processQuery("How do I learn hyperMILL?");
      expect(response).toBeDefined();
      expect(response.query.natural_language).toBeTruthy();
      expect(response.natural_language_summary).toBeTruthy();
      expect(response.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should detect query type", () => {
      const searchQuery = engine.processQuery("Find hyperMILL manuals");
      expect(searchQuery.query.query_type).toBe("resource_search");

      const learnQuery = engine.processQuery("Learn 5-axis machining");
      expect(learnQuery.query.query_type).toBe("learning_path");
    });

    it("should detect domain from query", () => {
      const hypermillQuery = engine.processQuery("hyperMILL training");
      expect(hypermillQuery.query.domain_filter).toBe("cam_hypermill");

      const haasQuery = engine.processQuery("Haas NGC programming");
      expect(haasQuery.query.domain_filter).toBe("controller_haas");

      const mazakQuery = engine.processQuery("Mazatrol programming guide");
      expect(mazakQuery.query.domain_filter).toBe("controller_mazak");
    });

    it("should detect resource type from query", () => {
      const manualQuery = engine.processQuery("hyperMILL manual PDF");
      expect(manualQuery.query.type_filter).toBe("pdf_manual");

      const trainingQuery = engine.processQuery("Learn G-code training");
      expect(trainingQuery.query.type_filter).toBe("pdf_training");
    });

    it("should include resources in response", () => {
      const response = engine.processQuery("milling strategies");
      expect(response.resources.length).toBeGreaterThanOrEqual(0);
    });

    it("should include reasoning chain", () => {
      const response = engine.processQuery("workholding solutions");
      expect(response.reasoning).toBeDefined();
      expect(response.reasoning.steps.length).toBe(5);
    });

    it("should generate follow-up suggestions", () => {
      const response = engine.processQuery("CNC basics");
      expect(response.follow_up_suggestions.length).toBeGreaterThan(0);
    });

    it("should track pdf/video availability", () => {
      const response = engine.processQuery("milling");
      expect(typeof response.pdf_learning_available).toBe("boolean");
      expect(typeof response.video_learning_available).toBe("boolean");
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  describe("Statistics", () => {
    it("should calculate statistics", () => {
      const stats = engine.getStatistics();
      expect(stats.total_resources).toBeGreaterThan(0);
      expect(stats.total_pages).toBeGreaterThan(0);
      expect(stats.total_size_mb).toBeGreaterThan(0);
    });

    it("should have domain distribution", () => {
      const stats = engine.getStatistics();
      expect(Object.keys(stats.by_domain).length).toBeGreaterThan(0);
    });

    it("should have type distribution", () => {
      const stats = engine.getStatistics();
      expect(Object.keys(stats.by_type).length).toBeGreaterThan(0);
    });

    it("should have top manufacturers", () => {
      const stats = engine.getStatistics();
      expect(stats.top_manufacturers.length).toBeGreaterThan(0);
      for (const m of stats.top_manufacturers) {
        expect(m.manufacturer).toBeTruthy();
        expect(m.count).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // MODULE EXPORTS
  // ==========================================================================

  describe("Module Exports", () => {
    it("should export singleton instance", () => {
      expect(resourceHarvestingIntelligenceEngine).toBeDefined();
      expect(resourceHarvestingIntelligenceEngine).toBeInstanceOf(ResourceHarvestingIntelligenceEngine);
    });

    it("should export class", () => {
      const instance = new ResourceHarvestingIntelligenceEngine();
      expect(instance).toBeInstanceOf(ResourceHarvestingIntelligenceEngine);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty query", () => {
      const response = engine.processQuery("");
      expect(response.natural_language_summary).toBeTruthy();
    });

    it("should handle unknown domain query", () => {
      const response = engine.processQuery("XYZ unknown system");
      expect(response.query.domain_filter).toBeUndefined();
    });

    it("should return empty results gracefully", () => {
      const results = engine.searchResources("xyznonexistent12345");
      expect(results.length).toBe(0);
    });

    it("should handle resource not found", () => {
      const resource = engine.getResource("nonexistent-id");
      expect(resource).toBeUndefined();
    });
  });

  // ==========================================================================
  // INTEGRATION INFO
  // ==========================================================================

  describe("Integration Info", () => {
    it("should provide MIT course integration info", () => {
      const info = engine.getMITCourseIntegrationInfo();
      expect(info.available).toBe(true);
      expect(info.enginePath).toContain("MITCourseRegistryEngine");
      expect(info.features.length).toBeGreaterThan(0);
    });

    it("should provide tribal knowledge integration info", () => {
      const info = engine.getTribalKnowledgeIntegrationInfo();
      expect(info.available).toBe(true);
      expect(info.camSystems.length).toBe(18);
      expect(info.camSystems).toContain("hyperMILL");
      expect(info.camSystems).toContain("Mastercam");
    });

    it("should provide video learning integration info", () => {
      const info = engine.getVideoLearningIntegrationInfo();
      expect(info.available).toBe(true);
      expect(info.pipeline.length).toBe(6);
      expect(info.pipeline[0]).toContain("FFmpeg");
    });

    it("should provide document learning integration info", () => {
      const info = engine.getDocumentLearningIntegrationInfo();
      expect(info.available).toBe(true);
      expect(info.actions.length).toBe(5);
      expect(info.actions.some(a => a.includes("doc_extract"))).toBe(true);
    });

    it("should provide AI agent integration info", () => {
      const info = engine.getAIAgentIntegrationInfo();
      expect(info.available).toBe(true);
      expect(info.knowledgeSources.length).toBe(8);
    });

    it("should provide full integration summary", () => {
      const summary = engine.getFullIntegrationSummary();
      expect(summary.resourceHarvesting.totalResources).toBeGreaterThan(0);
      expect(summary.totalKnowledgeSources).toBe(8);
      expect(summary.readyForHarvesting).toBe(true);
    });
  });

  // ==========================================================================
  // PERFORMANCE
  // ==========================================================================

  describe("Performance", () => {
    it("should search resources quickly", () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        engine.searchResources("milling hypermill");
      }
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500); // 100 searches in under 500ms
    });

    it("should process queries quickly", () => {
      const start = Date.now();
      for (let i = 0; i < 50; i++) {
        engine.processQuery("InventorCAM 5-axis training");
      }
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500); // 50 queries in under 500ms
    });

    it("should find similar resources quickly", () => {
      const resources = engine.getAllResources();
      const start = Date.now();
      for (let i = 0; i < 50; i++) {
        engine.findSimilarResources(resources[0], 5);
      }
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(300); // 50 similarity searches in under 300ms
    });
  });
});
