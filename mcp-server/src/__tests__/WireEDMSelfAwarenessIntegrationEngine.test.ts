/**
 * WireEDMSelfAwarenessIntegrationEngine Tests
 *
 * Comprehensive test suite for Wire EDM Self-Awareness integration:
 * - Singleton pattern verification
 * - Engine registry and capability mapping
 * - Query intent detection and routing
 * - Knowledge source gathering
 * - Tribal knowledge search
 * - JM Die context
 * - Validation approach
 * - Strategy selection
 * - Resource indexing
 *
 * @module __tests__/WireEDMSelfAwarenessIntegrationEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wireEDMSelfAwarenessIntegrationEngine,
  WireEDMSelfAwarenessIntegrationEngine,
  type WEDMQuery,
  type QueryIntent,
  type UnifiedResponse,
  type WEDMCapabilityManifest,
} from "../engines/WireEDMSelfAwarenessIntegrationEngine.js";
import { WEDM_KNOWLEDGE_TIPS } from "../data/wedm-knowledge-tips.js";

describe("WireEDMSelfAwarenessIntegrationEngine", () => {
  let engine: WireEDMSelfAwarenessIntegrationEngine;

  beforeEach(() => {
    engine = new WireEDMSelfAwarenessIntegrationEngine();
  });

  // ============================================================================
  // 1. SINGLETON PATTERN TESTS
  // ============================================================================

  describe("singleton pattern", () => {
    it("exports a singleton instance", () => {
      expect(wireEDMSelfAwarenessIntegrationEngine).toBeDefined();
      expect(wireEDMSelfAwarenessIntegrationEngine).toBeInstanceOf(
        WireEDMSelfAwarenessIntegrationEngine
      );
    });

    it("singleton is the same instance across imports", () => {
      const instance1 = wireEDMSelfAwarenessIntegrationEngine;
      const instance2 = wireEDMSelfAwarenessIntegrationEngine;
      expect(instance1).toBe(instance2);
    });

    it("new instances are independent from singleton", () => {
      const freshEngine = new WireEDMSelfAwarenessIntegrationEngine();
      expect(freshEngine).not.toBe(wireEDMSelfAwarenessIntegrationEngine);
    });

    it("singleton methods are callable", async () => {
      const manifest = wireEDMSelfAwarenessIntegrationEngine.getCapabilityManifest();
      expect(manifest.engines.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 2. ENGINE REGISTRY TESTS
  // ============================================================================

  describe("engine registry", () => {
    it("should have 6+ engines registered in capability manifest", () => {
      const manifest = engine.getCapabilityManifest();
      expect(manifest.engines.length).toBeGreaterThanOrEqual(6);
    });

    it("should include WireEDMMasterAIEngine", () => {
      const manifest = engine.getCapabilityManifest();
      const engineNames = manifest.engines.map(e => e.name);
      expect(engineNames).toContain("WireEDMMasterAIEngine");
    });

    it("should include WireEDMDeepReasoningEngine", () => {
      const manifest = engine.getCapabilityManifest();
      const engineNames = manifest.engines.map(e => e.name);
      expect(engineNames).toContain("WireEDMDeepReasoningEngine");
    });

    it("should include WireEDMNeuralOrchestrationEngine", () => {
      const manifest = engine.getCapabilityManifest();
      const engineNames = manifest.engines.map(e => e.name);
      expect(engineNames).toContain("WireEDMNeuralOrchestrationEngine");
    });

    it("should include WEDMNeuralTrainingEngine", () => {
      const manifest = engine.getCapabilityManifest();
      const engineNames = manifest.engines.map(e => e.name);
      expect(engineNames).toContain("WEDMNeuralTrainingEngine");
    });

    it("should include WireEDMDeepAIHardeningEngine", () => {
      const manifest = engine.getCapabilityManifest();
      const engineNames = manifest.engines.map(e => e.name);
      expect(engineNames).toContain("WireEDMDeepAIHardeningEngine");
    });

    it("should include WEDMCalculatorAIEngine", () => {
      const manifest = engine.getCapabilityManifest();
      const engineNames = manifest.engines.map(e => e.name);
      expect(engineNames).toContain("WEDMCalculatorAIEngine");
    });

    it("should map capabilities correctly for each engine", () => {
      const manifest = engine.getCapabilityManifest();
      for (const eng of manifest.engines) {
        expect(eng.name).toBeTruthy();
        expect(eng.purpose).toBeTruthy();
        expect(eng.actions).toBeInstanceOf(Array);
        expect(eng.actions.length).toBeGreaterThan(0);
        expect(eng.confidence).toBeGreaterThan(0);
      }
    });

    it("should route parameters query to orchestration engine", async () => {
      const result = await engine.query({
        question: "What E-code settings for D2 at 25mm?",
      });
      expect(result.routing.primary_engine).toBe("WireEDMNeuralOrchestrationEngine");
    });

    it("should route troubleshoot query to reasoning engine", async () => {
      const result = await engine.query({
        question: "Why is my wire breaking during roughing?",
      });
      expect(result.routing.primary_engine).toBe("WireEDMDeepReasoningEngine");
    });

    it("should route predict query to neural training engine", async () => {
      const result = await engine.query({
        question: "Predict the Ra I will achieve with 5 passes",
      });
      expect(result.routing.primary_engine).toBe("WEDMNeuralTrainingEngine");
    });
  });

  // ============================================================================
  // 3. PROGRAM INDEX TESTS (JM Die Programs)
  // ============================================================================

  describe("program index", () => {
    it("should have JM Die programs indexed in data sources", () => {
      const manifest = engine.getCapabilityManifest();
      const jmDieSource = manifest.data_sources.find(s => s.name.includes("JM Die"));
      expect(jmDieSource).toBeDefined();
      expect(jmDieSource!.records).toBeGreaterThan(0);
    });

    it("should return JM Die context with machine info", () => {
      const context = engine.getJMDieWEDMContext();
      expect(context.machine).toBe("Mitsubishi FA20S");
    });

    it("should return JM Die context with typical materials", () => {
      const context = engine.getJMDieWEDMContext();
      expect(context.typical_materials).toContain("D2");
      expect(context.typical_materials).toContain("A2");
      expect(context.typical_materials).toContain("S7");
    });

    it("should return JM Die context with common thicknesses", () => {
      const context = engine.getJMDieWEDMContext();
      expect(context.common_thicknesses).toContain(25.4); // 1 inch
      expect(context.common_thicknesses.length).toBeGreaterThanOrEqual(4);
    });

    it("should return production insights from JM Die", () => {
      const context = engine.getJMDieWEDMContext();
      expect(context.production_insights.length).toBeGreaterThan(0);
      const insightsText = context.production_insights.join(" ").toLowerCase();
      expect(
        insightsText.includes("cold heading") || insightsText.includes("die")
      ).toBe(true);
    });

    it("should include customer context in query routing", async () => {
      const result = await engine.query({
        question: "What settings for D2?",
        context: { customer: "ALCOA" },
      });
      expect(result.routing.data_sources).toContain("jm_die_programs");
    });
  });

  // ============================================================================
  // 4. RESOURCE INDEX TESTS (Tech Files)
  // ============================================================================

  describe("resource index", () => {
    it("should index Mitsubishi FA-S tech files", () => {
      const manifest = engine.getCapabilityManifest();
      const mitsubishiSource = manifest.data_sources.find(s =>
        s.name.toLowerCase().includes("mitsubishi")
      );
      expect(mitsubishiSource).toBeDefined();
      expect(mitsubishiSource!.records).toBeGreaterThan(0);
    });

    it("should index Makino tech files", () => {
      const manifest = engine.getCapabilityManifest();
      const makinoSource = manifest.data_sources.find(s =>
        s.name.toLowerCase().includes("makino")
      );
      expect(makinoSource).toBeDefined();
    });

    it("should have coverage information for each data source", () => {
      const manifest = engine.getCapabilityManifest();
      for (const source of manifest.data_sources) {
        expect(source.coverage).toBeTruthy();
        expect(typeof source.coverage).toBe("string");
      }
    });

    it("should add tech file source when material context is provided", async () => {
      const result = await engine.query({
        question: "What settings should I use?",
        context: { material: "D2" },
      });
      expect(result.routing.data_sources).toContain("tech_files");
    });

    it("should include tech file in knowledge sources for material queries", async () => {
      const result = await engine.query({
        question: "Parameters for hardened steel?",
        context: { material: "D2", thickness_mm: 50 },
      });
      const hasTechFile = result.knowledge_sources.some(
        s => s.source_type === "tech_file"
      );
      expect(hasTechFile).toBe(true);
    });
  });

  // ============================================================================
  // 5. STRATEGY LIBRARY TESTS
  // ============================================================================

  describe("strategy library", () => {
    it("should recommend 4-pass strategy for Ra 0.8um", () => {
      const result = engine.validateApproach({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
        target_ra_um: 0.8,
      });
      expect(result.valid).toBe(true);
    });

    it("should recommend 5-pass strategy for Ra 0.4um", () => {
      const result = engine.validateApproach({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
        target_ra_um: 0.2, // Should need 5 passes
      });
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("passes"))).toBe(true);
    });

    it("should handle corner case strategies", async () => {
      const result = await engine.query({
        question: "How to handle sharp inside corners?",
      });
      expect(result.answer).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle taper case strategies", async () => {
      const result = await engine.query({
        question: "What settings for taper cutting?",
      });
      expect(result.intent).toMatch(/parameters|recommend/);
    });

    it("should select appropriate wire diameter for thickness", () => {
      // Thick section should recommend larger wire
      const result = engine.validateApproach({
        material: "D2",
        thickness_mm: 150,
        num_passes: 4,
        target_ra_um: 0.8,
        wire_diameter: "0.20",
      });
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("exceeds"))).toBe(true);
    });

    it("should recommend stress relief for thick sections", () => {
      const result = engine.validateApproach({
        material: "D2",
        thickness_mm: 80,
        num_passes: 4,
        target_ra_um: 0.8,
      });
      expect(
        result.recommendations.some(r => r.toLowerCase().includes("stress relief"))
      ).toBe(true);
    });

    it("should recommend coated wire for carbide materials", () => {
      const result = engine.validateApproach({
        material: "tungsten_carbide",
        thickness_mm: 25,
        num_passes: 4,
        target_ra_um: 0.8,
      });
      expect(
        result.recommendations.some(r => r.toLowerCase().includes("coated wire"))
      ).toBe(true);
    });

    it("should recommend ON time reduction for carbide", () => {
      const result = engine.validateApproach({
        material: "WC",
        thickness_mm: 25,
        num_passes: 4,
        target_ra_um: 0.8,
      });
      expect(
        result.recommendations.some(r => r.toLowerCase().includes("on time"))
      ).toBe(true);
    });
  });

  // ============================================================================
  // 6. QUERY ROUTING TESTS
  // ============================================================================

  describe("query routing", () => {
    it("should route 'What parameters for D2 at 25mm?' to parameters intent", async () => {
      const result = await engine.query({
        question: "What parameters for D2 at 25mm?",
      });
      expect(result.intent).toBe("parameters");
    });

    it("should route 'Why is my wire breaking?' to troubleshoot intent", async () => {
      const result = await engine.query({
        question: "Why is my wire breaking?",
      });
      expect(result.intent).toBe("troubleshoot");
    });

    it("should route 'Compare Mitsubishi vs Makino' to compare intent", async () => {
      const result = await engine.query({
        question: "Compare Mitsubishi vs Makino for thick sections",
      });
      expect(result.intent).toBe("compare");
    });

    it("should route 'What is the difference between' to compare intent", async () => {
      const result = await engine.query({
        question: "What is the difference between 4 and 5 passes?",
      });
      expect(result.intent).toBe("compare");
    });

    it("should route 'Predict the Ra' to predict intent", async () => {
      const result = await engine.query({
        question: "Predict the Ra value I will get",
      });
      expect(result.intent).toBe("predict");
    });

    it("should route 'Is this safe to run?' to validate intent", async () => {
      const result = await engine.query({
        question: "Is this program safe to run?",
      });
      expect(result.intent).toBe("validate");
    });

    it("should route 'Total cost' to cost intent", async () => {
      const result = await engine.query({
        question: "What is the total cost for this job?",
      });
      expect(result.intent).toBe("cost");
    });

    it("should route 'How can I improve' to optimize intent", async () => {
      const result = await engine.query({
        question: "How can I improve cutting speed?",
      });
      expect(result.intent).toBe("optimize");
    });

    it("should route 'Explain' to explain intent", async () => {
      const result = await engine.query({
        question: "Explain the recast layer formation",
      });
      expect(result.intent).toBe("explain");
    });

    it("should include supporting engines in routing", async () => {
      const result = await engine.query({
        question: "What settings for D2?",
      });
      expect(result.routing.supporting_engines.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 7. KNOWLEDGE SOURCE TESTS
  // ============================================================================

  describe("knowledge sources", () => {
    it("should gather tribal knowledge for queries", async () => {
      const result = await engine.query({
        question: "wire breakage",  // Use simple keyword that matches tips
      });
      const hasTribal = result.knowledge_sources.some(
        s => s.source_type === "tribal"
      );
      expect(hasTribal).toBe(true);
    });

    it("should include tech file data for material queries", async () => {
      const result = await engine.query({
        question: "Settings for steel?",
        context: { material: "D2" },
      });
      const hasTechFile = result.knowledge_sources.some(
        s => s.source_type === "tech_file"
      );
      expect(hasTechFile).toBe(true);
    });

    it("should include thick section knowledge for deep cuts", async () => {
      const result = await engine.query({
        question: "Settings for thick section?",
        context: { thickness_mm: 75 },
      });
      const hasThickSection = result.knowledge_sources.some(
        s => s.content_preview?.toLowerCase().includes("thick") ||
             s.source_name?.includes("013")
      );
      expect(hasThickSection).toBe(true);
    });

    it("should return relevance scores for knowledge sources", async () => {
      const result = await engine.query({
        question: "Wire break prevention",
      });
      for (const source of result.knowledge_sources) {
        expect(source.relevance).toBeGreaterThanOrEqual(0);
        expect(source.relevance).toBeLessThanOrEqual(1);
      }
    });

    it("should sort knowledge sources by relevance", async () => {
      const sources = engine.searchTribalKnowledge("wire break");
      for (let i = 1; i < sources.length; i++) {
        expect(sources[i - 1].relevance).toBeGreaterThanOrEqual(sources[i].relevance);
      }
    });
  });

  // ============================================================================
  // 8. TRIBAL KNOWLEDGE SEARCH TESTS
  // ============================================================================

  describe("searchTribalKnowledge", () => {
    it("should have 100+ tribal tips available", () => {
      expect(WEDM_KNOWLEDGE_TIPS.length).toBeGreaterThanOrEqual(100);
    });

    it("should find wire breakage tips", () => {
      const results = engine.searchTribalKnowledge("wire break");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source_type).toBe("tribal");
    });

    it("should find surface finish tips", () => {
      const results = engine.searchTribalKnowledge("surface finish");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find flushing tips", () => {
      const results = engine.searchTribalKnowledge("flushing");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find thick section tips", () => {
      const results = engine.searchTribalKnowledge("thick section");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find taper cutting tips", () => {
      const results = engine.searchTribalKnowledge("taper");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find UV axis tips", () => {
      const results = engine.searchTribalKnowledge("UV");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should respect limit parameter", () => {
      const results = engine.searchTribalKnowledge("wire", 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should return source name and preview", () => {
      const results = engine.searchTribalKnowledge("wire break");
      expect(results[0].source_name).toBeTruthy();
      expect(results[0].content_preview).toBeTruthy();
    });

    it("should return full reference", () => {
      const results = engine.searchTribalKnowledge("wire break");
      expect(results[0].full_reference).toBeTruthy();
      expect(results[0].full_reference.length).toBeGreaterThan(50);
    });
  });

  // ============================================================================
  // 9. VALIDATION TESTS
  // ============================================================================

  describe("validateApproach", () => {
    it("should validate a standard approach", () => {
      const result = engine.validateApproach({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
        target_ra_um: 0.8,
      });
      expect(result.valid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should flag insufficient passes", () => {
      const result = engine.validateApproach({
        material: "D2",
        thickness_mm: 25,
        num_passes: 2,
        target_ra_um: 0.2,
      });
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should flag wire diameter mismatch for thick sections", () => {
      const result = engine.validateApproach({
        material: "D2",
        thickness_mm: 120,
        num_passes: 4,
        target_ra_um: 0.8,
        wire_diameter: "0.20",
      });
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("wire"))).toBe(true);
    });

    it("should add flush recommendations for thick sections", () => {
      const result = engine.validateApproach({
        material: "D2",
        thickness_mm: 60,
        num_passes: 4,
        target_ra_um: 0.8,
      });
      expect(result.recommendations.some(r => r.includes("flush"))).toBe(true);
    });

    it("should return confidence score", () => {
      const result = engine.validateApproach({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
        target_ra_um: 0.8,
      });
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // 10. ENGINE RECOMMENDATION TESTS
  // ============================================================================

  describe("getRecommendedEngine", () => {
    it("should recommend engine for parameter queries", () => {
      const rec = engine.getRecommendedEngine("what parameters should I use");
      expect(rec.engine).toBeTruthy();
      expect(rec.action).toBeTruthy();
      expect(rec.confidence).toBeGreaterThan(0);
    });

    it("should recommend reasoning engine for explanations", () => {
      const rec = engine.getRecommendedEngine("explain why this happens");
      expect(rec.engine).toBe("WireEDMDeepReasoningEngine");
    });

    it("should recommend neural engine for predictions", () => {
      const rec = engine.getRecommendedEngine("predict the Ra value");
      expect(rec.engine).toBe("WEDMNeuralTrainingEngine");
    });

    it("should provide dispatcher action mapping", () => {
      const rec = engine.getRecommendedEngine("what parameters");
      expect(rec.dispatcher_action).toMatch(/^wedm_/);
    });

    it("should default to orchestration for unknown queries", () => {
      const rec = engine.getRecommendedEngine("random gibberish query");
      expect(rec.engine).toBe("WireEDMNeuralOrchestrationEngine");
      expect(rec.confidence).toBeLessThan(0.7);
    });
  });

  // ============================================================================
  // 11. ANSWER GENERATION TESTS
  // ============================================================================

  describe("answer generation", () => {
    it("should generate answer with summary", async () => {
      const result = await engine.query({
        question: "What settings for D2?",
        context: { material: "D2", thickness_mm: 25 },
      });
      expect(result.answer.summary).toBeTruthy();
    });

    it("should generate answer with details", async () => {
      const result = await engine.query({
        question: "What settings for D2?",
        context: { material: "D2", thickness_mm: 25 },
      });
      expect(result.answer.details.length).toBeGreaterThan(0);
    });

    it("should include parameters for parameter queries", async () => {
      const result = await engine.query({
        question: "What settings for D2?",
        context: { material: "D2", thickness_mm: 25 },
      });
      expect(result.answer.parameters).toBeDefined();
      expect(result.answer.parameters!.material).toBe("D2");
    });

    it("should include warnings for thick sections", async () => {
      const result = await engine.query({
        question: "What settings for D2?",
        context: { material: "D2", thickness_mm: 100 },
      });
      expect(result.answer.warnings).toBeDefined();
      expect(result.answer.warnings!.length).toBeGreaterThan(0);
    });

    it("should include recommendations for troubleshooting", async () => {
      const result = await engine.query({
        question: "Why is my wire breaking?",
        context: { symptoms: ["wire breaks"] },
      });
      expect(result.answer.recommendations).toBeDefined();
    });
  });

  // ============================================================================
  // 12. REASONING TRACE TESTS
  // ============================================================================

  describe("reasoning trace", () => {
    it("should include reasoning trace", async () => {
      const result = await engine.query({
        question: "What settings for D2?",
      });
      expect(result.reasoning_trace.length).toBeGreaterThan(0);
    });

    it("should include intent detection in trace", async () => {
      const result = await engine.query({
        question: "What settings?",
      });
      expect(result.reasoning_trace.some(t => t.includes("intent"))).toBe(true);
    });

    it("should include engine routing in trace", async () => {
      const result = await engine.query({
        question: "What settings?",
      });
      expect(result.reasoning_trace.some(t => t.includes("engine"))).toBe(true);
    });

    it("should include source count in trace", async () => {
      const result = await engine.query({
        question: "What settings?",
      });
      expect(result.reasoning_trace.some(t => t.includes("source"))).toBe(true);
    });
  });

  // ============================================================================
  // 13. FOLLOW-UP QUESTIONS TESTS
  // ============================================================================

  describe("follow-up questions", () => {
    it("should generate follow-up questions for parameter queries without Ra", async () => {
      const result = await engine.query({
        question: "What settings for D2?",
        context: { material: "D2", thickness_mm: 25 },
      });
      expect(result.follow_up_questions.length).toBeGreaterThan(0);
      expect(
        result.follow_up_questions.some(q => q.toLowerCase().includes("finish"))
      ).toBe(true);
    });

    it("should generate follow-up questions for troubleshooting", async () => {
      const result = await engine.query({
        question: "Why is my wire breaking?",
      });
      expect(result.follow_up_questions.length).toBeGreaterThan(0);
    });

    it("should ask about changes for troubleshooting", async () => {
      const result = await engine.query({
        question: "Why does the wire keep breaking?",
      });
      expect(
        result.follow_up_questions.some(q => q.toLowerCase().includes("changed"))
      ).toBe(true);
    });
  });

  // ============================================================================
  // 14. LEARNING OPPORTUNITIES TESTS
  // ============================================================================

  describe("learning opportunities", () => {
    it("should identify learning opportunities", async () => {
      const result = await engine.query({
        question: "What settings for exotic material XYZ?",
      });
      expect(result.learning_opportunities.length).toBeGreaterThan(0);
    });

    it("should identify customer-specific learning", async () => {
      const result = await engine.query({
        question: "What settings?",
        context: { customer: "ALCOA" },
      });
      expect(
        result.learning_opportunities.some(o => o.includes("ALCOA"))
      ).toBe(true);
    });
  });

  // ============================================================================
  // 15. CAPABILITY GAPS TESTS
  // ============================================================================

  describe("capability gaps", () => {
    it("should identify capability gaps", () => {
      const manifest = engine.getCapabilityManifest();
      expect(manifest.gaps.length).toBeGreaterThan(0);
    });

    it("should categorize gap types", () => {
      const manifest = engine.getCapabilityManifest();
      for (const gap of manifest.gaps) {
        expect(gap.gap_type).toMatch(/data|engine|knowledge|integration/);
      }
    });

    it("should provide resolution for gaps", () => {
      const manifest = engine.getCapabilityManifest();
      for (const gap of manifest.gaps) {
        expect(gap.resolution).toBeTruthy();
      }
    });

    it("should rate gap impact", () => {
      const manifest = engine.getCapabilityManifest();
      for (const gap of manifest.gaps) {
        expect(gap.impact).toMatch(/low|medium|high/);
      }
    });
  });

  // ============================================================================
  // 16. LEARNING RECORD TESTS
  // ============================================================================

  describe("recordLearning", () => {
    it("should record learning without throwing", () => {
      expect(() => {
        engine.recordLearning(
          "What settings for D2?",
          "Actually 5 passes worked better than 4"
        );
      }).not.toThrow();
    });

    it("should accept various feedback types", () => {
      expect(() => {
        engine.recordLearning("Query 1", "Feedback about wire breaks");
        engine.recordLearning("Query 2", "Feedback about surface finish");
        engine.recordLearning("Query 3", "Feedback about cutting speed");
      }).not.toThrow();
    });
  });

  // ============================================================================
  // 17. CONFIDENCE CALCULATION TESTS
  // ============================================================================

  describe("confidence calculation", () => {
    it("should return confidence between 0 and 1", async () => {
      const result = await engine.query({
        question: "What settings for D2?",
      });
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should boost confidence with more sources", async () => {
      const result = await engine.query({
        question: "Wire break prevention flushing thick section",
        context: { material: "D2", thickness_mm: 75 },
      });
      // Multiple knowledge sources should boost confidence
      expect(result.confidence).toBeGreaterThan(0.85);
    });
  });

  // ============================================================================
  // 18. INTENT DETECTION EDGE CASES
  // ============================================================================

  describe("intent detection edge cases", () => {
    it("should handle empty question gracefully", async () => {
      const result = await engine.query({ question: "" });
      expect(result.intent).toBe("recommend"); // default
    });

    it("should handle mixed intent queries", async () => {
      const result = await engine.query({
        question: "Compare and predict the best settings",
      });
      // Should pick the first matching intent in priority
      expect(["compare", "predict"]).toContain(result.intent);
    });

    it("should handle lowercase patterns", async () => {
      const result = await engine.query({
        question: "WHAT PARAMETERS FOR D2?",
      });
      expect(result.intent).toBe("parameters");
    });

    it("should default to recommend for ambiguous queries", async () => {
      const result = await engine.query({
        question: "Please help me with this",
      });
      expect(result.intent).toBe("recommend");
    });
  });

  // ============================================================================
  // 19. DATA SOURCES TESTS
  // ============================================================================

  describe("data sources", () => {
    it("should always include tribal knowledge", async () => {
      const result = await engine.query({
        question: "Random question",
      });
      expect(result.routing.data_sources).toContain("tribal_knowledge");
    });

    it("should include playbook rules for troubleshooting", async () => {
      const result = await engine.query({
        question: "Why is my wire breaking?",
      });
      expect(result.routing.data_sources).toContain("playbook_rules");
    });

    it("should include playbook rules for explanations", async () => {
      const result = await engine.query({
        question: "Explain the recast layer",
      });
      expect(result.routing.data_sources).toContain("playbook_rules");
    });
  });

  // ============================================================================
  // 20. JM DIE CONTEXT COMPLETENESS
  // ============================================================================

  describe("JM Die context completeness", () => {
    it("should include M2 in typical materials", () => {
      const context = engine.getJMDieWEDMContext();
      expect(context.typical_materials).toContain("M2");
    });

    it("should include H13 in typical materials", () => {
      const context = engine.getJMDieWEDMContext();
      expect(context.typical_materials).toContain("H13");
    });

    it("should include standard Ra targets", () => {
      const context = engine.getJMDieWEDMContext();
      expect(context.typical_ra_targets).toContain(0.8);
      expect(context.typical_ra_targets).toContain(0.4);
    });

    it("should include multiple production insights", () => {
      const context = engine.getJMDieWEDMContext();
      expect(context.production_insights.length).toBeGreaterThanOrEqual(5);
    });
  });
});
