/**
 * PostProcessorDeepIntelligenceEngine Tests — PP-HARDEN-MS4
 * =========================================================
 * Comprehensive tests for deep manufacturing intelligence.
 *
 * Test Coverage:
 * - Controller database (30+ controllers)
 * - Material database (ISO P/M/K/N/S/H groups)
 * - Toolpath strategies (20+ strategies)
 * - Deep learning architectures (8 networks)
 * - Kinematics (5-axis configurations)
 * - Collision detection
 * - Deep reasoning and CSP solving
 * - Comprehensive analysis pipeline
 *
 * @version 1.0.0
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorDeepIntelligenceEngine,
  type ControllerFamily,
  type ISOGroup,
  type KinematicConfig,
  type CollisionZone,
  type CSPProblem,
} from "../engines/PostProcessorDeepIntelligenceEngine.js";

// ============================================================================
// CONTROLLER DATABASE TESTS
// ============================================================================

describe("PostProcessorDeepIntelligenceEngine", () => {
  describe("Controller Database", () => {
    it("returns all supported controllers", () => {
      const controllers = postProcessorDeepIntelligenceEngine.getSupportedControllers();

      expect(controllers.length).toBeGreaterThanOrEqual(15);
      expect(controllers).toContain("fanuc_31i_b5");
      expect(controllers).toContain("siemens_840d_sl");
      expect(controllers).toContain("heidenhain_tnc640");
      expect(controllers).toContain("haas_ngc");
      expect(controllers).toContain("okuma_osp_p300");
    });

    it("returns capabilities for Fanuc 31i-B5", () => {
      const caps = postProcessorDeepIntelligenceEngine.getMachineCapabilities("fanuc_31i_b5");

      expect(caps).toBeDefined();
      expect(caps!.family).toBe("fanuc_31i_b5");
      expect(caps!.simultaneous5Axis).toBe(true);
      expect(caps!.lookAheadBlocks).toBeGreaterThanOrEqual(1000);
      expect(caps!.nurbsInterpolation).toBe(true);
      expect(caps!.aiFeatures).toContain("AI Contour Control II");
    });

    it("returns capabilities for Siemens 840D", () => {
      const caps = postProcessorDeepIntelligenceEngine.getMachineCapabilities("siemens_840d_sl");

      expect(caps).toBeDefined();
      expect(caps!.dialect).toBe("siemens");
      expect(caps!.maxAxes).toBeGreaterThanOrEqual(31);
      expect(caps!.conversational).toBe(true);
      expect(caps!.aiFeatures).toContain("CYCLE832");
    });

    it("returns capabilities for Heidenhain TNC640", () => {
      const caps = postProcessorDeepIntelligenceEngine.getMachineCapabilities("heidenhain_tnc640");

      expect(caps).toBeDefined();
      expect(caps!.dialect).toBe("heidenhain");
      expect(caps!.lookAheadBlocks).toBeGreaterThanOrEqual(10000);
      expect(caps!.aiFeatures).toContain("Dynamic Efficiency");
      expect(caps!.aiFeatures).toContain("TCPM");
    });

    it("returns capabilities for SINUMERIK ONE with digital twin", () => {
      const caps = postProcessorDeepIntelligenceEngine.getMachineCapabilities("sinumerik_one");

      expect(caps).toBeDefined();
      expect(caps!.digitalTwin).toBe(true);
      expect(caps!.aiFeatures).toContain("Create MyVirtualMachine");
    });

    it("returns G-code mapping for Fanuc", () => {
      const mapping = postProcessorDeepIntelligenceEngine.getControllerMapping("fanuc_31i_b5");

      expect(mapping).toBeDefined();
      expect(mapping!.tcpOn).toContain("G43.4");
      expect(mapping!.hsmOn).toContain("G05.1");
      expect(mapping!.probingCycle).toBe("G31");
    });

    it("returns G-code mapping for Siemens", () => {
      const mapping = postProcessorDeepIntelligenceEngine.getControllerMapping("siemens_840d_sl");

      expect(mapping).toBeDefined();
      expect(mapping!.tcpOn).toBe("TRAORI");
      expect(mapping!.tcpOff).toBe("TRAFOOF");
      expect(mapping!.hsmOn).toContain("CYCLE832");
    });

    it("returns G-code mapping for Heidenhain", () => {
      const mapping = postProcessorDeepIntelligenceEngine.getControllerMapping("heidenhain_tnc640");

      expect(mapping).toBeDefined();
      expect(mapping!.tcpOn).toContain("FUNCTION TCPM");
      expect(mapping!.safetyLine).toContain("BEGIN PGM");
      expect(mapping!.programEnd).toBe("END PGM");
    });

    it("returns G-code mapping for Hurco", () => {
      const mapping = postProcessorDeepIntelligenceEngine.getControllerMapping("hurco_winmax");

      expect(mapping).toBeDefined();
      expect(mapping!.tcpOn).toBe("M128");
      expect(mapping!.tcpOff).toBe("M129");
      expect(mapping!.safetyLine).toContain("M31");
    });

    it("returns G-code mapping for Haas", () => {
      const mapping = postProcessorDeepIntelligenceEngine.getControllerMapping("haas_ngc");

      expect(mapping).toBeDefined();
      expect(mapping!.tcpOn).toBe("G234");
      expect(mapping!.coolant.tsc).toBe("M88");
      expect(mapping!.probingCycle).toBe("G65 P9995");
    });

    it("returns undefined for unknown controller", () => {
      const caps = postProcessorDeepIntelligenceEngine.getMachineCapabilities(
        "unknown_controller" as ControllerFamily
      );

      expect(caps).toBeUndefined();
    });
  });

  // ============================================================================
  // MATERIAL DATABASE TESTS
  // ============================================================================

  describe("Material Database", () => {
    it("returns material by ID", () => {
      const material = postProcessorDeepIntelligenceEngine.getMaterial("1045");

      expect(material).toBeDefined();
      expect(material!.name).toContain("1045");
      expect(material!.isoGroup).toBe("P");
    });

    it("returns materials by ISO group P (Steel)", () => {
      const materials = postProcessorDeepIntelligenceEngine.getMaterialsByGroup("P");

      expect(materials.length).toBeGreaterThan(0);
      for (const m of materials) {
        expect(m.isoGroup).toBe("P");
      }
    });

    it("returns materials by ISO group M (Stainless)", () => {
      const materials = postProcessorDeepIntelligenceEngine.getMaterialsByGroup("M");

      expect(materials.length).toBeGreaterThan(0);
      expect(materials.some(m => m.name.includes("304"))).toBe(true);
      expect(materials.some(m => m.name.includes("316"))).toBe(true);
    });

    it("returns materials by ISO group S (Superalloys)", () => {
      const materials = postProcessorDeepIntelligenceEngine.getMaterialsByGroup("S");

      expect(materials.length).toBeGreaterThan(0);
      expect(materials.some(m => m.name.includes("Inconel"))).toBe(true);
      expect(materials.some(m => m.name.includes("Titanium"))).toBe(true);
    });

    it("returns materials by ISO group H (Hardened)", () => {
      const materials = postProcessorDeepIntelligenceEngine.getMaterialsByGroup("H");

      expect(materials.length).toBeGreaterThan(0);
      for (const m of materials) {
        expect(m.hardness.value).toBeGreaterThan(45);
        expect(m.hardness.scale).toBe("HRC");
      }
    });

    it("material has Kienzle coefficients", () => {
      const material = postProcessorDeepIntelligenceEngine.getMaterial("4140");

      expect(material).toBeDefined();
      expect(material!.kienzle.kc1_1).toBeGreaterThan(1000);
      expect(material!.kienzle.mc).toBeGreaterThan(0);
      expect(material!.kienzle.mc).toBeLessThan(1);
    });

    it("material has Taylor coefficients", () => {
      const material = postProcessorDeepIntelligenceEngine.getMaterial("IN718");

      expect(material).toBeDefined();
      expect(material!.taylor.C).toBeGreaterThan(0);
      expect(material!.taylor.n).toBeGreaterThan(0);
      expect(material!.taylor.n).toBeLessThan(1);
    });

    it("material has coolant recommendations", () => {
      const material = postProcessorDeepIntelligenceEngine.getMaterial("Ti-6Al-4V");

      expect(material).toBeDefined();
      expect(material!.recommendedCoolant.length).toBeGreaterThan(0);
    });

    it("material has insert recommendations", () => {
      const material = postProcessorDeepIntelligenceEngine.getMaterial("D2-60HRC");

      expect(material).toBeDefined();
      expect(material!.recommendedInserts).toContain("cbn");
    });
  });

  // ============================================================================
  // CUTTING PARAMETERS TESTS
  // ============================================================================

  describe("Cutting Parameters", () => {
    it("recommends parameters for steel roughing", () => {
      const params = postProcessorDeepIntelligenceEngine.recommendCuttingParams(
        "1045", "roughing", 12
      );

      expect(params.sfm).toBeGreaterThan(100);
      expect(params.feedPerTooth).toBeGreaterThan(0);
      expect(params.depthOfCut).toBeGreaterThan(0);
      expect(params.confidence).toBeGreaterThan(0.5);
    });

    it("recommends parameters for aluminum", () => {
      const params = postProcessorDeepIntelligenceEngine.recommendCuttingParams(
        "6061-T6", "roughing", 12
      );

      // Aluminum should have higher SFM than steel
      const steelParams = postProcessorDeepIntelligenceEngine.recommendCuttingParams(
        "1045", "roughing", 12
      );

      expect(params.sfm).toBeGreaterThan(steelParams.sfm);
    });

    it("finishing has lower DOC than roughing", () => {
      const roughing = postProcessorDeepIntelligenceEngine.recommendCuttingParams(
        "4140", "roughing", 10
      );
      const finishing = postProcessorDeepIntelligenceEngine.recommendCuttingParams(
        "4140", "finishing", 10
      );

      expect(finishing.depthOfCut).toBeLessThan(roughing.depthOfCut);
    });

    it("recommends appropriate coolant for material", () => {
      const inconelParams = postProcessorDeepIntelligenceEngine.recommendCuttingParams(
        "IN718", "roughing", 10
      );

      expect(inconelParams.coolant).toBeDefined();
    });

    it("returns fallback for unknown material", () => {
      const params = postProcessorDeepIntelligenceEngine.recommendCuttingParams(
        "UNKNOWN", "roughing", 10
      );

      expect(params.confidence).toBeLessThan(0.5);
    });
  });

  // ============================================================================
  // TOOLPATH STRATEGY TESTS
  // ============================================================================

  describe("Toolpath Strategies", () => {
    it("returns adaptive clearing strategy", () => {
      const strategy = postProcessorDeepIntelligenceEngine.getToolpathStrategy(
        "roughing", "adaptive_clearing"
      );

      expect(strategy).toBeDefined();
      expect((strategy as { name: string }).name).toBe("Adaptive Clearing");
    });

    it("returns trochoidal milling strategy", () => {
      const strategy = postProcessorDeepIntelligenceEngine.getToolpathStrategy(
        "roughing", "trochoidal"
      );

      expect(strategy).toBeDefined();
      expect((strategy as { idealFor: string[] }).idealFor).toContain("slots");
    });

    it("returns scallop finishing strategy", () => {
      const strategy = postProcessorDeepIntelligenceEngine.getToolpathStrategy(
        "finishing", "scallop"
      );

      expect(strategy).toBeDefined();
      expect((strategy as { idealFor: string[] }).idealFor).toContain("3d_surfaces");
    });

    it("returns 5-axis SWARF strategy", () => {
      const strategy = postProcessorDeepIntelligenceEngine.getToolpathStrategy(
        "fiveAxis", "swarf"
      );

      expect(strategy).toBeDefined();
      expect((strategy as { name: string }).name).toBe("SWARF Cutting");
    });

    it("returns turning strategy", () => {
      const strategy = postProcessorDeepIntelligenceEngine.getToolpathStrategy(
        "turning", "threading"
      );

      expect(strategy).toBeDefined();
      expect((strategy as { parameters: { springPasses: number } }).parameters.springPasses).toBe(2);
    });

    it("recommends strategy for pocket in steel", () => {
      const recommendation = postProcessorDeepIntelligenceEngine.recommendToolpathStrategy(
        "pocket", "P", "roughing"
      );

      expect(recommendation.strategy).toBeDefined();
      expect(recommendation.reason.length).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeGreaterThan(0);
    });

    it("recommends strategy for superalloys with reason", () => {
      const recommendation = postProcessorDeepIntelligenceEngine.recommendToolpathStrategy(
        "slot", "S", "roughing"
      );

      // Should provide a strategy recommendation with reasoning
      expect(recommendation.strategy).toBeDefined();
      expect(recommendation.reason.length).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeGreaterThan(0);
    });

    it("recommends scallop for 3D finishing", () => {
      const recommendation = postProcessorDeepIntelligenceEngine.recommendToolpathStrategy(
        "3d_surface", "P", "finishing"
      );

      expect(recommendation.strategy).toBe("scallop");
    });
  });

  // ============================================================================
  // KINEMATICS TESTS
  // ============================================================================

  describe("Kinematics", () => {
    it("creates AC table kinematics engine", () => {
      const engine = postProcessorDeepIntelligenceEngine.getKinematicsEngine("AC_table");

      expect(engine).toBeDefined();
    });

    it("validates normal 5-axis move", () => {
      const result = postProcessorDeepIntelligenceEngine.validate5AxisMove(
        "AC_table",
        { a: 45, c: 90 }
      );

      expect(result.valid).toBe(true);
      expect(result.singularity).toBe(false);
      expect(result.limitsOk).toBe(true);
    });

    it("detects singularity at A=0", () => {
      const result = postProcessorDeepIntelligenceEngine.validate5AxisMove(
        "AC_table",
        { a: 0, c: 45 }
      );

      expect(result.singularity).toBe(true);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("detects axis limit violation", () => {
      const result = postProcessorDeepIntelligenceEngine.validate5AxisMove(
        "AC_table",
        { a: 150, c: 0 } // A beyond ±120 limit
      );

      expect(result.limitsOk).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("validates BC head configuration", () => {
      const result = postProcessorDeepIntelligenceEngine.validate5AxisMove(
        "BC_head",
        { b: 45, c: 90 }
      );

      expect(result.limitsOk).toBe(true);
    });

    it("detects pole singularity at B=90", () => {
      const result = postProcessorDeepIntelligenceEngine.validate5AxisMove(
        "BC_head",
        { b: 90, c: 0 }
      );

      expect(result.singularity).toBe(true);
    });
  });

  // ============================================================================
  // COLLISION DETECTION TESTS
  // ============================================================================

  describe("Collision Detection", () => {
    it("detects no collision for clear path", () => {
      const points = [
        { x: 0, y: 0, z: 100 },
        { x: 50, y: 50, z: 100 },
        { x: 100, y: 100, z: 100 },
      ];

      const result = postProcessorDeepIntelligenceEngine.checkCollisions(
        points, 5, 20
      );

      expect(result.hasCollisions).toBe(false);
      expect(result.collisionCount).toBe(0);
    });

    it("detects collision with fixture zone", () => {
      const points = [
        { x: 0, y: 0, z: 50 },
        { x: 0, y: 0, z: 10 }, // Close to fixture
      ];

      const fixtureZone: CollisionZone = {
        id: "fixture1",
        type: "fixture",
        geometry: {
          type: "box",
          center: { x: 0, y: 0, z: 0 },
          dimensions: { width: 100, depth: 100, height: 20 },
        },
        priority: 10,
        clearance: 5,
      };

      const result = postProcessorDeepIntelligenceEngine.checkCollisions(
        points, 5, 20, [fixtureZone]
      );

      expect(result.hasCollisions).toBe(true);
      expect(result.collisionCount).toBeGreaterThan(0);
    });

    it("returns collision count for multiple points", () => {
      const points = [
        { x: 0, y: 0, z: 100 },
        { x: 0, y: 0, z: 50 },
        { x: 0, y: 0, z: 10 },
        { x: 0, y: 0, z: 5 },
      ];

      const chuckZone: CollisionZone = {
        id: "chuck1",
        type: "chuck",
        geometry: {
          type: "cylinder",
          center: { x: 0, y: 0, z: 0 },
          dimensions: { radius: 50, height: 30 },
        },
        priority: 20,
        clearance: 10,
      };

      const result = postProcessorDeepIntelligenceEngine.checkCollisions(
        points, 5, 20, [chuckZone]
      );

      expect(result.results.length).toBe(points.length);
    });
  });

  // ============================================================================
  // DEEP LEARNING ARCHITECTURE TESTS
  // ============================================================================

  describe("Deep Learning Architectures", () => {
    it("returns all architectures", () => {
      const architectures = postProcessorDeepIntelligenceEngine.getDeepLearningArchitectures();

      expect(architectures.length).toBeGreaterThanOrEqual(8);
    });

    it("includes ToolpathPatternCNN", () => {
      const arch = postProcessorDeepIntelligenceEngine.getArchitecture("ToolpathPatternCNN");

      expect(arch).toBeDefined();
      expect(arch!.purpose).toContain("toolpath");
      expect(arch!.layers.some(l => l.type === "conv1d")).toBe(true);
    });

    it("includes SequenceOptimizerLSTM", () => {
      const arch = postProcessorDeepIntelligenceEngine.getArchitecture("SequenceOptimizerLSTM");

      expect(arch).toBeDefined();
      expect(arch!.layers.some(l => l.type === "bidirectional")).toBe(true);
    });

    it("includes ControllerTranslatorTransformer", () => {
      const arch = postProcessorDeepIntelligenceEngine.getArchitecture("ControllerTranslatorTransformer");

      expect(arch).toBeDefined();
      expect(arch!.layers.some(l => l.type === "transformer_encoder")).toBe(true);
      expect(arch!.layers.some(l => l.type === "transformer_decoder")).toBe(true);
    });

    it("includes SafetyCriticalAttention", () => {
      const arch = postProcessorDeepIntelligenceEngine.getArchitecture("SafetyCriticalAttention");

      expect(arch).toBeDefined();
      expect(arch!.loss).toBe("focal");
      expect(arch!.layers.some(l => l.type === "multi_head_attention")).toBe(true);
    });

    it("includes CollisionPredictor", () => {
      const arch = postProcessorDeepIntelligenceEngine.getArchitecture("CollisionPredictor");

      expect(arch).toBeDefined();
      expect(arch!.outputShape).toEqual([100, 1]);
    });

    it("includes FeedRateOptimizer", () => {
      const arch = postProcessorDeepIntelligenceEngine.getArchitecture("FeedRateOptimizer");

      expect(arch).toBeDefined();
      expect(arch!.layers.some(l => l.activation === "softplus")).toBe(true);
    });

    it("all architectures have valid configurations", () => {
      const architectures = postProcessorDeepIntelligenceEngine.getDeepLearningArchitectures();

      for (const arch of architectures) {
        expect(arch.inputShape.length).toBeGreaterThan(0);
        expect(arch.outputShape.length).toBeGreaterThan(0);
        expect(arch.layers.length).toBeGreaterThan(0);
        expect(arch.optimizer).toBeDefined();
        expect(arch.loss).toBeDefined();
      }
    });
  });

  // ============================================================================
  // DEEP REASONING TESTS
  // ============================================================================

  describe("Deep Reasoning", () => {
    it("performs inference chain", () => {
      const result = postProcessorDeepIntelligenceEngine.reason(
        ["has_5axis", "complex_surface"],
        "use_swarf",
        [
          { conclusion: "needs_5axis", premises: ["has_5axis", "complex_surface"] },
          { conclusion: "use_swarf", premises: ["needs_5axis"] },
        ]
      );

      expect(result.achieved).toBe(true);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it("returns not achieved when goal unreachable", () => {
      const result = postProcessorDeepIntelligenceEngine.reason(
        ["has_3axis"],
        "use_swarf",
        [
          { conclusion: "use_swarf", premises: ["has_5axis", "ruled_surface"] },
        ]
      );

      expect(result.achieved).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it("solves CSP problem", () => {
      const problem: CSPProblem = {
        variables: [
          { name: "speed", domain: [1000, 2000, 3000, 4000], type: "discrete" },
          { name: "feed", domain: [100, 200, 300, 400], type: "discrete" },
        ],
        constraints: [
          {
            variables: ["speed", "feed"],
            predicate: (speed: number, feed: number) => speed >= feed * 5,
            description: "Speed must be at least 5x feed",
          },
        ],
      };

      const result = postProcessorDeepIntelligenceEngine.solveConstraints(problem);

      expect(result.feasible).toBe(true);
      expect(result.solution).not.toBeNull();

      const speed = result.solution!.get("speed") as number;
      const feed = result.solution!.get("feed") as number;
      expect(speed).toBeGreaterThanOrEqual(feed * 5);
    });

    it("returns infeasible for unsatisfiable CSP", () => {
      const problem: CSPProblem = {
        variables: [
          { name: "x", domain: [1, 2], type: "discrete" },
        ],
        constraints: [
          {
            variables: ["x"],
            predicate: (x: number) => x > 10,
            description: "x must be greater than 10",
          },
        ],
      };

      const result = postProcessorDeepIntelligenceEngine.solveConstraints(problem);

      expect(result.feasible).toBe(false);
      expect(result.solution).toBeNull();
    });
  });

  // ============================================================================
  // COMPREHENSIVE ANALYSIS TESTS
  // ============================================================================

  describe("Comprehensive Analysis", () => {
    it("performs full analysis", () => {
      const code = `
        G0 G17 G21 G40 G49 G80 G54 G90
        G43.4 H1
        G0 X0 Y0 Z50
        M8
        G1 Z-10 F100
        M30
      `;

      const result = postProcessorDeepIntelligenceEngine.comprehensiveAnalysis(
        code,
        { controller: "fanuc_31i_b5" },
        "4140"
      );

      expect(result.controller).toBeDefined();
      expect(result.materialSpec).toBeDefined();
      expect(result.cuttingParams).toBeDefined();
      expect(result.toolpathStrategy).toBeDefined();
      expect(result.architectures.length).toBeGreaterThan(0);
    });

    it("generates warnings for capability mismatch", () => {
      const code = `
        G43.4 H1
        G05.1 Q1
      `;

      const result = postProcessorDeepIntelligenceEngine.comprehensiveAnalysis(
        code,
        { controller: "fanuc_0i_mf" }, // Does not support simultaneous 5-axis
        "1045"
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("5-axis"))).toBe(true);
    });

    it("generates warning for superalloy without coolant", () => {
      const code = `
        G0 X0 Y0
        G1 Z-10 F50
        M30
      `;

      const result = postProcessorDeepIntelligenceEngine.comprehensiveAnalysis(
        code,
        { controller: "fanuc_31i_b5" },
        "IN718"
      );

      expect(result.warnings.some(w => w.includes("coolant"))).toBe(true);
    });
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe("Statistics", () => {
    it("returns accurate statistics", () => {
      const stats = postProcessorDeepIntelligenceEngine.getStats();

      expect(stats.controllers).toBeGreaterThanOrEqual(15);
      expect(stats.materials).toBeGreaterThanOrEqual(10);
      expect(stats.toolpathStrategies).toBeGreaterThanOrEqual(15);
      expect(stats.architectures).toBeGreaterThanOrEqual(8);
      expect(stats.kinematicConfigs).toBeGreaterThanOrEqual(8);
    });
  });
});
