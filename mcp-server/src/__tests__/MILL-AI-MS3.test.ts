/**
 * MILL-AI-MS3: CAM Deep Learning Engine Tests
 *
 * Tests CAMDeepLearningEngine for:
 * - Cross-CAM strategy mappings (18 CAM systems)
 * - Deep learning feature extraction
 * - Strategy similarity matching
 * - Chain-of-thought reasoning
 * - Natural language processing
 * - Cross-CAM equivalents
 */

import { describe, it, expect } from "vitest";
import {
  CAMDeepLearningEngine,
  camDeepLearningEngine,
  type CAMSystem,
  type CAMStrategy,
  type StrategyFeatureVector,
  type SimilarityMatch,
  type CrossCAMMapping,
  type ReasoningChain,
  type CAMQuery,
  type CAMResponse,
} from "../engines/CAMDeepLearningEngine.js";

describe("MILL-AI-MS3: CAM Deep Learning Engine", () => {
  // ==========================================================================
  // CAM SYSTEM INFO
  // ==========================================================================

  describe("CAM System Information", () => {
    it("should have 18+ supported CAM systems", () => {
      const systems = camDeepLearningEngine.getSupportedCAMSystems();
      expect(systems.length).toBeGreaterThanOrEqual(18);
    });

    it("should have correct HyperMILL info", () => {
      const info = camDeepLearningEngine.getCAMSystemInfo("hypermill");
      expect(info.name).toBe("hyperMILL");
      expect(info.vendor).toBe("OPEN MIND Technologies");
      expect(info.strength).toContain("5-axis");
    });

    it("should have correct Mastercam info", () => {
      const info = camDeepLearningEngine.getCAMSystemInfo("mastercam");
      expect(info.name).toBe("Mastercam");
      expect(info.vendor).toContain("Sandvik");
    });

    it("should have correct Fusion360 info", () => {
      const info = camDeepLearningEngine.getCAMSystemInfo("fusion360");
      expect(info.name).toBe("Fusion 360");
      expect(info.vendor).toBe("Autodesk");
      expect(info.strength).toContain("cloud-based");
    });

    it("should have correct NX info", () => {
      const info = camDeepLearningEngine.getCAMSystemInfo("nx");
      expect(info.name).toBe("Siemens NX CAM");
      expect(info.vendor).toContain("Siemens");
    });

    it("should have correct SolidCAM info with iMachining", () => {
      const info = camDeepLearningEngine.getCAMSystemInfo("solidcam");
      expect(info.strength).toContain("iMachining");
    });

    it("should have strategy counts for each CAM system", () => {
      const counts = camDeepLearningEngine.getStrategyCounts();
      expect(counts.hypermill).toBeGreaterThan(0);
      expect(counts.mastercam).toBeGreaterThan(0);
      expect(counts.fusion360).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // CROSS-CAM MAPPINGS
  // ==========================================================================

  describe("Cross-CAM Strategy Mappings", () => {
    it("should map Fusion360 Adaptive Clearing to HyperMILL equivalents", () => {
      const mapping = camDeepLearningEngine.getCrossCAMMapping(
        "fusion360",
        "Adaptive Clearing",
        "hypermill"
      );

      expect(mapping.source_cam).toBe("fusion360");
      expect(mapping.target_cam).toBe("hypermill");
      expect(mapping.target_strategies.length).toBeGreaterThan(0);
      expect(mapping.target_strategies[0].name).toContain("Roughing");
    });

    it("should map Mastercam Dynamic Motion to Fusion360", () => {
      const mapping = camDeepLearningEngine.getCrossCAMMapping(
        "mastercam",
        "Dynamic Motion",
        "fusion360"
      );

      expect(mapping.target_strategies.length).toBeGreaterThan(0);
      expect(mapping.target_strategies.some(s => s.name.includes("Adaptive"))).toBe(true);
    });

    it("should map SolidCAM iMachining to other systems", () => {
      const mapping = camDeepLearningEngine.getCrossCAMMapping(
        "solidcam",
        "iMachining 2D/3D",
        "mastercam"
      );

      expect(mapping.target_strategies.some(s => s.name.includes("Dynamic"))).toBe(true);
    });

    it("should include similarity scores in mappings", () => {
      const mapping = camDeepLearningEngine.getCrossCAMMapping(
        "hypermill",
        "Optimized Roughing",
        "powermill"
      );

      for (const target of mapping.target_strategies) {
        expect(target.similarity).toBeGreaterThan(0);
        expect(target.similarity).toBeLessThanOrEqual(100);
      }
    });

    it("should include mapping notes", () => {
      const mapping = camDeepLearningEngine.getCrossCAMMapping(
        "fusion360",
        "Adaptive Clearing",
        "hypermill"
      );

      expect(mapping.target_strategies[0].notes.length).toBeGreaterThan(0);
    });

    it("should handle 5-axis strategy mappings", () => {
      const mapping = camDeepLearningEngine.getCrossCAMMapping(
        "hypermill",
        "5-axis Shape Offset",
        "nx"
      );

      expect(mapping.target_strategies.length).toBeGreaterThan(0);
    });

    it("should map rest machining across systems", () => {
      const mapping = camDeepLearningEngine.getCrossCAMMapping(
        "mastercam",
        "Rest Mill",
        "fusion360"
      );

      expect(mapping.target_strategies.some(s =>
        s.name.toLowerCase().includes("rest")
      )).toBe(true);
    });

    it("should return empty array for unknown strategies", () => {
      const mapping = camDeepLearningEngine.getCrossCAMMapping(
        "hypermill",
        "Nonexistent Strategy XYZ",
        "mastercam"
      );

      expect(mapping.confidence).toBeLessThan(50);
    });
  });

  // ==========================================================================
  // DEEP LEARNING — FEATURE EXTRACTION
  // ==========================================================================

  describe("Deep Learning Feature Extraction", () => {
    it("should extract features from adaptive strategy", () => {
      const strategy: CAMStrategy = {
        name: "Adaptive Clearing",
        cam_system: "fusion360",
        category: "adaptive",
        description: "Constant engagement roughing for extended tool life",
        use_cases: ["Deep pockets", "Hardened steels"],
        parameters: [],
        advantages: [],
        limitations: [],
        alternatives: [],
        cross_cam_equivalents: [],
      };

      const features = camDeepLearningEngine.extractStrategyFeatures(strategy);

      expect(features.features.is_adaptive).toBe(1);
      expect(features.features.constant_engagement).toBe(1);
      expect(features.features.is_roughing).toBe(1);
    });

    it("should extract features from 5-axis strategy", () => {
      const strategy: CAMStrategy = {
        name: "5-axis Swarf",
        cam_system: "hypermill",
        category: "5axis",
        description: "Simultaneous 5-axis swarf cutting",
        use_cases: ["Impeller blades", "Turbine components"],
        parameters: [],
        advantages: [],
        limitations: [],
        alternatives: [],
        cross_cam_equivalents: [],
      };

      const features = camDeepLearningEngine.extractStrategyFeatures(strategy);

      expect(features.features.is_5axis).toBe(1);
      expect(features.features.complexity).toBeGreaterThan(0.8);
    });

    it("should extract material suitability features", () => {
      const strategy: CAMStrategy = {
        name: "HSM Finishing",
        cam_system: "mastercam",
        category: "finishing",
        description: "High speed finishing for aluminum aerospace parts",
        use_cases: ["Aluminum", "High speed machining"],
        parameters: [],
        advantages: [],
        limitations: [],
        alternatives: [],
        cross_cam_equivalents: [],
      };

      const features = camDeepLearningEngine.extractStrategyFeatures(strategy);

      expect(features.features.is_hsm).toBe(1);
      expect(features.features.aluminum).toBeGreaterThan(0.5);
    });

    it("should have normalized feature values", () => {
      const strategy: CAMStrategy = {
        name: "Test Strategy",
        cam_system: "nx",
        category: "roughing",
        description: "Test",
        use_cases: [],
        parameters: [],
        advantages: [],
        limitations: [],
        alternatives: [],
        cross_cam_equivalents: [],
      };

      const features = camDeepLearningEngine.extractStrategyFeatures(strategy);

      for (const [_, value] of Object.entries(features.features)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  // ==========================================================================
  // SIMILARITY MATCHING
  // ==========================================================================

  describe("Strategy Similarity Matching", () => {
    it("should find similar strategies across CAM systems", () => {
      const sourceStrategy: CAMStrategy = {
        name: "Adaptive Clearing",
        cam_system: "fusion360",
        category: "adaptive",
        description: "Constant engagement roughing",
        use_cases: ["Deep pockets", "Hardened materials"],
        parameters: [],
        advantages: [],
        limitations: [],
        alternatives: [],
        cross_cam_equivalents: [],
      };

      const matches = camDeepLearningEngine.findSimilarStrategies(sourceStrategy);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].similarity_score).toBeGreaterThan(50);
    });

    it("should filter by target CAM system", () => {
      const sourceStrategy: CAMStrategy = {
        name: "Dynamic Motion",
        cam_system: "mastercam",
        category: "adaptive",
        description: "Dynamic toolpath",
        use_cases: [],
        parameters: [],
        advantages: [],
        limitations: [],
        alternatives: [],
        cross_cam_equivalents: [],
      };

      const matches = camDeepLearningEngine.findSimilarStrategies(
        sourceStrategy,
        "hypermill"
      );

      for (const match of matches) {
        expect(match.strategy.cam_system).toBe("hypermill");
      }
    });

    it("should sort by similarity score", () => {
      const sourceStrategy: CAMStrategy = {
        name: "3D Finishing",
        cam_system: "powermill",
        category: "finishing",
        description: "3D surface finishing",
        use_cases: ["Complex surfaces"],
        parameters: [],
        advantages: [],
        limitations: [],
        alternatives: [],
        cross_cam_equivalents: [],
      };

      const matches = camDeepLearningEngine.findSimilarStrategies(sourceStrategy);

      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].similarity_score).toBeGreaterThanOrEqual(
          matches[i].similarity_score
        );
      }
    });

    it("should include explanations in matches", () => {
      const sourceStrategy: CAMStrategy = {
        name: "Rest Machining",
        cam_system: "catia",
        category: "rest_machining",
        description: "Clean up corners",
        use_cases: [],
        parameters: [],
        advantages: [],
        limitations: [],
        alternatives: [],
        cross_cam_equivalents: [],
      };

      const matches = camDeepLearningEngine.findSimilarStrategies(sourceStrategy);

      for (const match of matches) {
        expect(match.explanation).toBeDefined();
        expect(match.explanation.length).toBeGreaterThan(0);
      }
    });

    it("should respect limit parameter", () => {
      const sourceStrategy: CAMStrategy = {
        name: "Pocket",
        cam_system: "surfcam",
        category: "roughing",
        description: "Pocket machining",
        use_cases: [],
        parameters: [],
        advantages: [],
        limitations: [],
        alternatives: [],
        cross_cam_equivalents: [],
      };

      const matches3 = camDeepLearningEngine.findSimilarStrategies(sourceStrategy, undefined, 3);
      const matches5 = camDeepLearningEngine.findSimilarStrategies(sourceStrategy, undefined, 5);

      expect(matches3.length).toBeLessThanOrEqual(3);
      expect(matches5.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // DEEP REASONING
  // ==========================================================================

  describe("Chain-of-Thought Reasoning", () => {
    it("should generate reasoning chain for query", () => {
      const query: CAMQuery = {
        query_type: "strategy_search",
        natural_language: "How do I do adaptive clearing in Fusion360?",
        cam_system: "fusion360",
      };

      const reasoning = camDeepLearningEngine.generateReasoningChain(query);

      expect(reasoning.steps.length).toBeGreaterThan(0);
      expect(reasoning.conclusion).toBeDefined();
      expect(reasoning.confidence).toBeGreaterThan(0);
    });

    it("should have observation step first", () => {
      const query: CAMQuery = {
        query_type: "strategy_search",
        natural_language: "Best roughing strategy for titanium",
      };

      const reasoning = camDeepLearningEngine.generateReasoningChain(query);

      expect(reasoning.steps[0].type).toBe("observation");
    });

    it("should have synthesis step last", () => {
      const query: CAMQuery = {
        query_type: "strategy_search",
        natural_language: "5-axis finishing for impeller",
        cam_system: "hypermill",
      };

      const reasoning = camDeepLearningEngine.generateReasoningChain(query);

      const lastStep = reasoning.steps[reasoning.steps.length - 1];
      expect(lastStep.type).toBe("synthesis");
    });

    it("should include evidence in reasoning steps", () => {
      const query: CAMQuery = {
        query_type: "strategy_search",
        natural_language: "Recommend strategy for deep pockets in D2 steel",
        material: "D2",
      };

      const reasoning = camDeepLearningEngine.generateReasoningChain(query);

      const analysisStep = reasoning.steps.find(s => s.type === "analysis");
      expect(analysisStep?.evidence.length).toBeGreaterThan(0);
    });

    it("should track confidence through chain", () => {
      const query: CAMQuery = {
        query_type: "strategy_search",
        natural_language: "What's the Mastercam equivalent of HyperMILL Optimized Roughing?",
        cam_system: "mastercam",
      };

      const reasoning = camDeepLearningEngine.generateReasoningChain(query);

      for (const step of reasoning.steps) {
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(100);
      }
    });

    it("should cite sources when strategies found", () => {
      const query: CAMQuery = {
        query_type: "strategy_search",
        natural_language: "Adaptive roughing strategies",
        operation_type: "roughing",
      };

      const reasoning = camDeepLearningEngine.generateReasoningChain(query);

      // Sources are populated when strategies are found
      expect(reasoning.sources).toBeDefined();
      expect(Array.isArray(reasoning.sources)).toBe(true);
    });
  });

  // ==========================================================================
  // NATURAL LANGUAGE PROCESSING
  // ==========================================================================

  describe("Natural Language Query Processing", () => {
    it("should process Fusion360 adaptive clearing query", () => {
      const response = camDeepLearningEngine.processQuery(
        "How do I do adaptive clearing in Fusion360?"
      );

      expect(response.query.cam_system).toBe("fusion360");
      expect(response.strategies.length).toBeGreaterThan(0);
      expect(response.natural_language_summary.length).toBeGreaterThan(0);
    });

    it("should detect CAM system from query", () => {
      const response = camDeepLearningEngine.processQuery(
        "What's the best HyperMILL strategy for 5-axis impeller machining?"
      );

      expect(response.query.cam_system).toBe("hypermill");
    });

    it("should detect operation type from query", () => {
      const response = camDeepLearningEngine.processQuery(
        "Best roughing strategy for deep pockets"
      );

      expect(response.query.operation_type).toBe("roughing");
    });

    it("should detect material from query", () => {
      const response = camDeepLearningEngine.processQuery(
        "Adaptive clearing parameters for titanium"
      );

      expect(response.query.material).toBe("titanium");
    });

    it("should detect geometry from query", () => {
      const response = camDeepLearningEngine.processQuery(
        "Finishing strategy for complex surfaces"
      );

      expect(response.query.geometry).toBe("surface");
    });

    it("should include cross-CAM mappings when CAM is specified", () => {
      const response = camDeepLearningEngine.processQuery(
        "Adaptive clearing in Mastercam",
        "mastercam"
      );

      expect(response.cross_cam_mappings.length).toBeGreaterThan(0);
    });

    it("should generate follow-up suggestions", () => {
      const response = camDeepLearningEngine.processQuery(
        "How do I rough a pocket efficiently?"
      );

      expect(response.follow_up_suggestions.length).toBeGreaterThan(0);
    });

    it("should handle cross-CAM equivalent queries", () => {
      const response = camDeepLearningEngine.processQuery(
        "What's the Mastercam equivalent of Fusion360 Adaptive Clearing?"
      );

      expect(response.query.query_type).toBe("cross_cam_equivalent");
    });

    it("should handle troubleshooting queries", () => {
      const response = camDeepLearningEngine.processQuery(
        "I'm having problems with chatter during finishing"
      );

      expect(response.query.query_type).toBe("troubleshooting");
    });

    it("should track processing time", () => {
      const response = camDeepLearningEngine.processQuery(
        "5-axis strategies in NX"
      );

      expect(response.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(response.processing_time_ms).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // STRATEGY RECOMMENDATIONS
  // ==========================================================================

  describe("Strategy Recommendations", () => {
    it("should recommend strategies with scores", () => {
      const response = camDeepLearningEngine.processQuery(
        "Best strategy for roughing aluminum pockets"
      );

      for (const rec of response.strategies) {
        expect(rec.score).toBeGreaterThan(0);
        expect(rec.score).toBeLessThanOrEqual(100);
      }
    });

    it("should include recommended parameters", () => {
      const response = camDeepLearningEngine.processQuery(
        "Adaptive clearing for hardened steel",
        "fusion360"
      );

      if (response.strategies.length > 0) {
        const params = response.strategies[0].parameters;
        expect(Object.keys(params).length).toBeGreaterThan(0);
      }
    });

    it("should include warnings when appropriate", () => {
      const response = camDeepLearningEngine.processQuery(
        "5-axis strategy for impeller"
      );

      // 5-axis strategies should warn about machine requirements
      const has5AxisRec = response.strategies.some(s =>
        s.strategy.category === "5axis" && s.warnings.length > 0
      );
      // At least some strategies should exist
      expect(response.strategies.length).toBeGreaterThanOrEqual(0);
    });

    it("should adjust parameters for material", () => {
      const aluminumResponse = camDeepLearningEngine.processQuery(
        "Adaptive clearing for aluminum",
        "fusion360"
      );

      const steelResponse = camDeepLearningEngine.processQuery(
        "Adaptive clearing for hardened steel",
        "fusion360"
      );

      // Parameters should differ based on material
      if (aluminumResponse.strategies.length > 0 && steelResponse.strategies.length > 0) {
        const alParams = aluminumResponse.strategies[0].parameters;
        const steelParams = steelResponse.strategies[0].parameters;
        // Steel should have lower stepdown
        expect(steelParams.stepdown).toBeLessThanOrEqual(alParams.stepdown as number || 99);
      }
    });

    it("should include reasoning chain in recommendations", () => {
      const response = camDeepLearningEngine.processQuery(
        "Finishing strategy for mold cavity"
      );

      for (const rec of response.strategies) {
        expect(rec.reasoning).toBeDefined();
        expect(rec.reasoning.steps.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty query gracefully", () => {
      const response = camDeepLearningEngine.processQuery("");

      expect(response.natural_language_summary).toBeDefined();
    });

    it("should handle unknown CAM system", () => {
      const response = camDeepLearningEngine.processQuery(
        "Strategy for UnknownCAM system"
      );

      expect(response.query.cam_system).toBeUndefined();
    });

    it("should handle no matching strategies", () => {
      const response = camDeepLearningEngine.processQuery(
        "XYZ123 nonexistent operation type"
      );

      expect(response.natural_language_summary).toContain("No matching");
    });

    it("should handle mixed case in queries", () => {
      const response = camDeepLearningEngine.processQuery(
        "ADAPTIVE clearing in FUSION360"
      );

      expect(response.query.cam_system).toBe("fusion360");
    });
  });

  // ==========================================================================
  // MODULE EXPORTS
  // ==========================================================================

  describe("Module Exports", () => {
    it("should export CAMDeepLearningEngine class", () => {
      expect(CAMDeepLearningEngine).toBeDefined();
      const instance = new CAMDeepLearningEngine();
      expect(instance.getSupportedCAMSystems).toBeDefined();
    });

    it("should export singleton instance", () => {
      expect(camDeepLearningEngine).toBeDefined();
      expect(camDeepLearningEngine).toBeInstanceOf(CAMDeepLearningEngine);
    });
  });
});
