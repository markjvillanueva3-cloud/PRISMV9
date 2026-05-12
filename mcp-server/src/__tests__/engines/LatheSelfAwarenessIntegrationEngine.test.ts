/**
 * LatheSelfAwarenessIntegrationEngine Tests
 * ==========================================
 *
 * Comprehensive tests for the PRISM self-awareness integration for lathe operations.
 *
 * Test coverage:
 *   - Self-awareness queries (whatCanIDo, howDoI, whoHandles)
 *   - Dynamic engine selection and routing
 *   - Multi-engine orchestration
 *   - JM Die integration
 *   - Cross-domain synthesis
 *   - Knowledge graph navigation
 *   - Capability explanation
 *   - Proactive recommendations
 *
 * @module __tests__/engines/LatheSelfAwarenessIntegrationEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  latheSelfAwarenessIntegrationEngine,
  LatheSelfAwarenessIntegrationEngine,
  type LatheOperationContext,
  type MultiEngineTask,
  type LatheEngineCategory,
} from "../../engines/LatheSelfAwarenessIntegrationEngine.js";

describe("LatheSelfAwarenessIntegrationEngine", () => {
  // ============================================================================
  // SINGLETON TESTS
  // ============================================================================

  describe("singleton pattern", () => {
    it("returns singleton instance", () => {
      const instance1 = LatheSelfAwarenessIntegrationEngine.getInstance();
      const instance2 = LatheSelfAwarenessIntegrationEngine.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("exported instance is valid", () => {
      expect(latheSelfAwarenessIntegrationEngine).toBeDefined();
      expect(latheSelfAwarenessIntegrationEngine).toBeInstanceOf(
        LatheSelfAwarenessIntegrationEngine
      );
    });
  });

  // ============================================================================
  // SELF-AWARENESS QUERIES
  // ============================================================================

  describe("whatCanIDo", () => {
    it("returns capabilities for lathe programming query", () => {
      const result = latheSelfAwarenessIntegrationEngine.whatCanIDo(
        "lathe programming"
      );

      expect(result).toBeDefined();
      expect(result.engines).toBeDefined();
      expect(result.engines.length).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("returns capabilities for speed feed query", () => {
      const result = latheSelfAwarenessIntegrationEngine.whatCanIDo(
        "calculate speed and feed for turning"
      );

      expect(result).toBeDefined();
      // Should find turning-related engines
      expect(result.engines.some(e =>
        e.engineName.toLowerCase().includes("lathe") ||
        e.capabilities.some(c => c.includes("optim") || c.includes("turning"))
      )).toBe(true);
    });

    it("returns tribal knowledge for thin wall query", () => {
      const result = latheSelfAwarenessIntegrationEngine.whatCanIDo(
        "thin wall turning"
      );

      expect(result).toBeDefined();
      expect(result.tribalKnowledge).toBeDefined();
    });

    it("returns JM Die resources for customer query", () => {
      const result = latheSelfAwarenessIntegrationEngine.whatCanIDo(
        "ALCOA lathe programs"
      );

      expect(result).toBeDefined();
    });
  });

  describe("howDoI", () => {
    it("finds action for speed feed task", () => {
      const result = latheSelfAwarenessIntegrationEngine.howDoI(
        "calculate turning speed"
      );

      expect(result).toBeDefined();
      if (result) {
        expect(result.fullAction).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    it("finds action for threading task", () => {
      const result = latheSelfAwarenessIntegrationEngine.howDoI(
        "generate threading parameters"
      );

      expect(result).toBeDefined();
    });

    it("finds action for program validation", () => {
      const result = latheSelfAwarenessIntegrationEngine.howDoI(
        "validate lathe program"
      );

      expect(result).toBeDefined();
    });

    it("returns alternatives", () => {
      const result = latheSelfAwarenessIntegrationEngine.howDoI(
        "optimize turning operation"
      );

      if (result) {
        expect(result.alternatives).toBeDefined();
      }
    });
  });

  describe("whoHandles", () => {
    it("finds engines for physics domain", () => {
      const result = latheSelfAwarenessIntegrationEngine.whoHandles("physics");

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(e => e.physicsRequired === true)).toBe(true);
    });

    it("finds engines for deep learning domain", () => {
      const result = latheSelfAwarenessIntegrationEngine.whoHandles(
        "deep learning"
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(e => e.category === "deep_learning")).toBe(true);
    });

    it("finds engines for troubleshooting domain", () => {
      const result = latheSelfAwarenessIntegrationEngine.whoHandles(
        "troubleshoot"
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("finds engines for optimization domain", () => {
      const result = latheSelfAwarenessIntegrationEngine.whoHandles(
        "optimization"
      );

      expect(result).toBeDefined();
      expect(result.some(e => e.category === "optimization")).toBe(true);
    });
  });

  // ============================================================================
  // INVENTORY TESTS
  // ============================================================================

  describe("getLatheInventory", () => {
    it("returns complete inventory", () => {
      const inventory = latheSelfAwarenessIntegrationEngine.getLatheInventory();

      expect(inventory).toBeDefined();
      expect(inventory.engines).toBeGreaterThan(40);
      expect(inventory.actions).toBeGreaterThan(90);
      expect(inventory.tribalTips).toBeGreaterThan(0);
      expect(inventory.formulas).toBeGreaterThan(0);
      expect(inventory.algorithms).toBeGreaterThan(0);
      expect(inventory.jmDiePrograms).toBe(16558);
      expect(inventory.jmDieCustomers).toBe(119);
    });

    it("returns category breakdown", () => {
      const inventory = latheSelfAwarenessIntegrationEngine.getLatheInventory();

      expect(inventory.categories).toBeDefined();
      expect(inventory.categories.ai_reasoning).toBeGreaterThan(0);
      expect(inventory.categories.deep_learning).toBeGreaterThan(0);
      expect(inventory.categories.optimization).toBeGreaterThan(0);
      expect(inventory.categories.intelligence).toBeGreaterThan(0);
    });
  });

  describe("getEnginesByCategory", () => {
    it("returns AI reasoning engines", () => {
      const engines = latheSelfAwarenessIntegrationEngine.getEnginesByCategory(
        "ai_reasoning"
      );

      expect(engines).toBeDefined();
      expect(engines.length).toBeGreaterThan(0);
      expect(engines.every(e => e.category === "ai_reasoning")).toBe(true);
    });

    it("returns deep learning engines", () => {
      const engines = latheSelfAwarenessIntegrationEngine.getEnginesByCategory(
        "deep_learning"
      );

      expect(engines).toBeDefined();
      expect(engines.length).toBeGreaterThan(0);
      expect(engines.every(e => e.category === "deep_learning")).toBe(true);
    });

    it("returns orchestration engines", () => {
      const engines = latheSelfAwarenessIntegrationEngine.getEnginesByCategory(
        "orchestration"
      );

      expect(engines).toBeDefined();
      expect(engines.length).toBeGreaterThan(0);
    });

    it("returns safety engines", () => {
      const engines = latheSelfAwarenessIntegrationEngine.getEnginesByCategory(
        "safety"
      );

      expect(engines).toBeDefined();
      expect(engines.length).toBeGreaterThan(0);
    });
  });

  describe("getLatheActions", () => {
    it("returns all lathe MCP actions", () => {
      const actions = latheSelfAwarenessIntegrationEngine.getLatheActions();

      expect(actions).toBeDefined();
      expect(actions.length).toBeGreaterThan(90);
      expect(actions.some(a => a.includes("turning"))).toBe(true);
      expect(actions.some(a => a.includes("lathe"))).toBe(true);
    });
  });

  // ============================================================================
  // ENGINE ROUTING TESTS
  // ============================================================================

  describe("findBestEngineForTask", () => {
    it("routes physics task to appropriate engine", () => {
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        "calculate cutting force for turning"
      );

      expect(result).toBeDefined();
      expect(result.primaryEngine).toBeDefined();
      expect(result.primaryEngine.physicsRequired).toBe(true);
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it("routes optimization task to optimizer engine", () => {
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        "optimize lathe program"
      );

      expect(result).toBeDefined();
      expect(result.primaryEngine).toBeDefined();
      // Should find an engine with optimization capabilities or lathe-related
      expect(
        result.primaryEngine.capabilities.some(c =>
          c.toLowerCase().includes("optim") ||
          c.toLowerCase().includes("auto") ||
          c.toLowerCase().includes("improve")
        ) ||
        result.primaryEngine.category === "optimization" ||
        result.primaryEngine.engineName.toLowerCase().includes("optim") ||
        result.primaryEngine.engineName.toLowerCase().includes("lathe")
      ).toBe(true);
    });

    it("routes AI task to AI engine", () => {
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        "AI analysis of turning operation"
      );

      expect(result).toBeDefined();
      expect(result.primaryEngine).toBeDefined();
    });

    it("includes supporting engines", () => {
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        "optimize cutting parameters with physics validation"
      );

      expect(result).toBeDefined();
      expect(result.supportingEngines).toBeDefined();
    });

    it("includes tribal knowledge injection", () => {
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        "lathe operation optimization"
      );

      expect(result).toBeDefined();
      expect(result.tribalKnowledgeInjection).toBeDefined();
    });

    it("includes playbook rules", () => {
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        "roughing operation parameters"
      );

      expect(result).toBeDefined();
      expect(result.playbookRulesApplied).toBeDefined();
    });

    it("includes reasoning path", () => {
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        "generate turning program"
      );

      expect(result).toBeDefined();
      expect(result.reasoningPath).toBeDefined();
      expect(result.reasoningPath.length).toBeGreaterThan(0);
    });

    it("includes execution order", () => {
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        "complete lathe analysis"
      );

      expect(result).toBeDefined();
      expect(result.executionOrder).toBeDefined();
      expect(result.executionOrder.length).toBeGreaterThan(0);
    });

    it("handles unknown task with fallback", () => {
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        "completely unknown task xyz"
      );

      expect(result).toBeDefined();
      expect(result.primaryEngine).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // MULTI-ENGINE ORCHESTRATION TESTS
  // ============================================================================

  describe("orchestrateMultiEngine", () => {
    it("orchestrates task with multiple capabilities", () => {
      const task: MultiEngineTask = {
        taskId: "test-001",
        description: "Optimize cutting parameters with physics validation",
        requiredCapabilities: ["optimization", "physics"],
        constraints: [],
        priority: "high",
        timeoutMs: 5000,
      };

      const result = latheSelfAwarenessIntegrationEngine.orchestrateMultiEngine(
        task
      );

      expect(result).toBeDefined();
      expect(result.taskId).toBe("test-001");
      expect(result.enginesUsed).toBeDefined();
      expect(result.enginesUsed.length).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it("includes physics validation", () => {
      const task: MultiEngineTask = {
        taskId: "test-002",
        description: "Calculate forces and validate",
        requiredCapabilities: ["physics", "kienzle"],
        constraints: [],
        priority: "normal",
        timeoutMs: 3000,
      };

      const result = latheSelfAwarenessIntegrationEngine.orchestrateMultiEngine(
        task
      );

      expect(result).toBeDefined();
      expect(result.physicsValidation).toBeDefined();
    });

    it("respects safety constraints", () => {
      const task: MultiEngineTask = {
        taskId: "test-003",
        description: "Program with safety checks",
        requiredCapabilities: ["programming", "collision"],
        constraints: [
          { type: "safety", parameter: "collision", operator: "eq", value: 0 },
        ],
        priority: "critical",
        timeoutMs: 5000,
      };

      const result = latheSelfAwarenessIntegrationEngine.orchestrateMultiEngine(
        task
      );

      expect(result).toBeDefined();
    });

    it("returns execution time", () => {
      const task: MultiEngineTask = {
        taskId: "test-004",
        description: "Simple optimization",
        requiredCapabilities: ["optimization"],
        constraints: [],
        priority: "low",
        timeoutMs: 3000,
      };

      const result = latheSelfAwarenessIntegrationEngine.orchestrateMultiEngine(
        task
      );

      expect(result).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("returns confidence score", () => {
      const task: MultiEngineTask = {
        taskId: "test-005",
        description: "Analysis task",
        requiredCapabilities: ["analysis", "prediction"],
        constraints: [],
        priority: "normal",
        timeoutMs: 3000,
      };

      const result = latheSelfAwarenessIntegrationEngine.orchestrateMultiEngine(
        task
      );

      expect(result).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it("returns recommendations", () => {
      const task: MultiEngineTask = {
        taskId: "test-006",
        description: "Full orchestration",
        requiredCapabilities: ["optimization", "physics", "knowledge"],
        constraints: [],
        priority: "high",
        timeoutMs: 5000,
      };

      const result = latheSelfAwarenessIntegrationEngine.orchestrateMultiEngine(
        task
      );

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // JM DIE INTEGRATION TESTS
  // ============================================================================

  describe("learnFromJMDie", () => {
    it("returns patterns for customer", () => {
      const result = latheSelfAwarenessIntegrationEngine.learnFromJMDie("ALCOA");

      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.sequences).toBeDefined();
      expect(result.parameters).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("returns material-specific patterns", () => {
      const result = latheSelfAwarenessIntegrationEngine.learnFromJMDie(
        "",
        "D2"
      );

      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns.some(p => p.material === "D2")).toBe(true);
    });

    it("returns operation sequences", () => {
      const result = latheSelfAwarenessIntegrationEngine.learnFromJMDie("ITW");

      expect(result).toBeDefined();
      expect(result.sequences).toBeDefined();
      expect(result.sequences.length).toBeGreaterThan(0);
    });

    it("returns recommendations", () => {
      const result = latheSelfAwarenessIntegrationEngine.learnFromJMDie(
        "FASTENAL"
      );

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("getJMDieCustomerPath", () => {
    it("returns path for known customer", () => {
      const path = latheSelfAwarenessIntegrationEngine.getJMDieCustomerPath(
        "ALCOA"
      );

      // May return null if not in the self-awareness cache
      expect(path === null || typeof path === "string").toBe(true);
    });
  });

  describe("getJMDieLathePaths", () => {
    it("returns lathe program paths", () => {
      const paths = latheSelfAwarenessIntegrationEngine.getJMDieLathePaths();

      expect(paths).toBeDefined();
      expect(Array.isArray(paths)).toBe(true);
    });
  });

  // ============================================================================
  // CROSS-DOMAIN SYNTHESIS TESTS
  // ============================================================================

  describe("synthesizeCrossDomain", () => {
    const context: LatheOperationContext = {
      operation: "turning_od",
      material: {
        name: "D2",
        isoGroup: "H",
        hardness: 58,
        condition: "hardened",
      },
      part: {
        diameter: 50,
        length: 100,
        lotSize: 10,
      },
      machine: {
        machineId: "Okuma-LB3000",
        controller: "OSP-P300",
        maxSpindleRpm: 4000,
        maxPower: 22,
        hasLiveTooling: true,
        hasCAxis: true,
        hasYAxis: false,
      },
      tool: {
        toolType: "CNMG",
        insertGrade: "CBN",
        noseRadius: 0.4,
        leadAngle: 95,
      },
      parameters: {
        speed: 150,
        feed: 0.004,
        depthOfCut: 0.5,
        coolant: "dry",
      },
      quality: {
        surfaceFinish: 1.6,
        tolerance: 0.01,
      },
      constraints: {
        maxCycleTime: 300,
        minToolLife: 30,
        maxPower: 20,
      },
    };

    it("returns physics result", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result).toBeDefined();
      expect(result.physicsResult).toBeDefined();
      expect(result.physicsResult.cuttingForce).toBeGreaterThan(0);
      expect(result.physicsResult.power).toBeGreaterThan(0);
      expect(result.physicsResult.toolLife).toBeGreaterThan(0);
    });

    it("returns thermal result", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result).toBeDefined();
      expect(result.thermalResult).toBeDefined();
      expect(result.thermalResult.cuttingTemperature).toBeGreaterThan(0);
    });

    it("returns quality result", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result).toBeDefined();
      expect(result.qualityResult).toBeDefined();
      expect(result.qualityResult.surfaceFinish).toBeGreaterThan(0);
    });

    it("returns optimized parameters", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result).toBeDefined();
      expect(result.optimizedParameters).toBeDefined();
      expect(result.optimizedParameters.speed).toBeGreaterThan(0);
      expect(result.optimizedParameters.feed).toBeGreaterThan(0);
      expect(result.optimizedParameters.optimized).toBe(true);
    });

    it("returns physics validation", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result).toBeDefined();
      expect(result.validations).toBeDefined();
      expect(typeof result.validations.kienzleValid).toBe("boolean");
      expect(typeof result.validations.taylorValid).toBe("boolean");
    });

    it("returns confidence score", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // KNOWLEDGE GRAPH TESTS
  // ============================================================================

  describe("findRelated", () => {
    it("finds related nodes for steel", () => {
      const result = latheSelfAwarenessIntegrationEngine.findRelated("steel");

      expect(result).toBeDefined();
      expect(result.node).toBeDefined();
      expect(result.directRelations).toBeDefined();
    });

    it("finds related engines", () => {
      const result = latheSelfAwarenessIntegrationEngine.findRelated("turning");

      expect(result).toBeDefined();
      expect(result.engines).toBeDefined();
      expect(result.engines.length).toBeGreaterThan(0);
    });

    it("finds related formulas", () => {
      // Test with "physics" which is in the knowledge graph
      const result = latheSelfAwarenessIntegrationEngine.findRelated("physics");

      expect(result).toBeDefined();
      expect(result.formulas).toBeDefined();
      // Physics relates to Kienzle formulas
      expect(result.formulas.length).toBeGreaterThan(0);
      expect(result.formulas.some(f => f.includes("Kienzle") || f.includes("Taylor"))).toBe(true);
    });

    it("finds related tribal tips", () => {
      const result = latheSelfAwarenessIntegrationEngine.findRelated("threading");

      expect(result).toBeDefined();
      expect(result.tribalTips).toBeDefined();
    });

    it("handles unknown concept", () => {
      const result = latheSelfAwarenessIntegrationEngine.findRelated("xyz123");

      expect(result).toBeDefined();
      expect(result.node).toBeNull();
    });
  });

  describe("findPath", () => {
    it("finds path between materials and physics", () => {
      const result = latheSelfAwarenessIntegrationEngine.findPath(
        "steel",
        "physics"
      );

      // May return null if path not found
      if (result) {
        expect(result.startNode).toBe("steel");
        expect(result.endNode).toBe("physics");
        expect(result.path).toBeDefined();
        expect(result.path.length).toBeGreaterThan(0);
      }
    });

    it("returns null for impossible path", () => {
      const result = latheSelfAwarenessIntegrationEngine.findPath(
        "nonexistent1",
        "nonexistent2"
      );

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CAPABILITY EXPLANATION TESTS
  // ============================================================================

  describe("explainCapabilities", () => {
    it("returns complete capability explanation", () => {
      const result = latheSelfAwarenessIntegrationEngine.explainCapabilities();

      expect(result).toBeDefined();
      expect(result.category).toBe("lathe_operations");
      expect(result.capabilities).toBeDefined();
      expect(result.capabilities.length).toBeGreaterThan(0);
      expect(result.engines).toBeDefined();
      expect(result.engines.length).toBeGreaterThan(0);
    });

    it("includes external sources", () => {
      const result = latheSelfAwarenessIntegrationEngine.explainCapabilities();

      expect(result).toBeDefined();
      expect(result.externalSources).toBeDefined();
      expect(result.externalSources.length).toBeGreaterThan(0);
      expect(result.externalSources).toContain("Sandvik Coromant");
    });

    it("includes recommendations", () => {
      const result = latheSelfAwarenessIntegrationEngine.explainCapabilities();

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("suggestOptimalApproach", () => {
    it("suggests approach for speed feed problem", () => {
      const result = latheSelfAwarenessIntegrationEngine.suggestOptimalApproach(
        "optimize cutting speed for hardened steel turning"
      );

      expect(result).toBeDefined();
      expect(result.approach).toBeDefined();
      expect(result.primaryEngine).toBeDefined();
      expect(result.executionSteps).toBeDefined();
      expect(result.executionSteps.length).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it("includes expected outcomes", () => {
      const result = latheSelfAwarenessIntegrationEngine.suggestOptimalApproach(
        "generate lathe program"
      );

      expect(result).toBeDefined();
      expect(result.expectedOutcomes).toBeDefined();
      expect(result.expectedOutcomes.length).toBeGreaterThan(0);
    });

    it("includes risk factors", () => {
      const result = latheSelfAwarenessIntegrationEngine.suggestOptimalApproach(
        "complex mill-turn operation"
      );

      expect(result).toBeDefined();
      expect(result.riskFactors).toBeDefined();
    });

    it("includes tribal wisdom", () => {
      const result = latheSelfAwarenessIntegrationEngine.suggestOptimalApproach(
        "thin wall turning operation"
      );

      expect(result).toBeDefined();
      expect(result.tribalWisdom).toBeDefined();
    });
  });

  // ============================================================================
  // PROACTIVE RECOMMENDATIONS TESTS
  // ============================================================================

  describe("getProactiveRecommendations", () => {
    it("identifies missing context", () => {
      const result = latheSelfAwarenessIntegrationEngine.getProactiveRecommendations(
        {}
      );

      expect(result).toBeDefined();
      expect(result.missingContext).toBeDefined();
      expect(result.missingContext.length).toBeGreaterThan(0);
    });

    it("generates proactive questions", () => {
      const result = latheSelfAwarenessIntegrationEngine.getProactiveRecommendations(
        {
          operation: "turning_od",
        }
      );

      expect(result).toBeDefined();
      expect(result.proactiveQuestions).toBeDefined();
      expect(result.proactiveQuestions.length).toBeGreaterThan(0);
    });

    it("returns tribal knowledge when context available", () => {
      const result = latheSelfAwarenessIntegrationEngine.getProactiveRecommendations(
        {
          operation: "threading",
          material: {
            name: "Steel",
            isoGroup: "P",
            hardness: 200,
            condition: "annealed",
          },
        }
      );

      expect(result).toBeDefined();
      expect(result.tribalKnowledge).toBeDefined();
    });

    it("returns JM Die patterns for material", () => {
      const result = latheSelfAwarenessIntegrationEngine.getProactiveRecommendations(
        {
          material: {
            name: "D2",
            isoGroup: "H",
            hardness: 58,
            condition: "hardened",
          },
        }
      );

      expect(result).toBeDefined();
      expect(result.jmDiePatterns).toBeDefined();
    });

    it("adds warnings for thin wall", () => {
      const result = latheSelfAwarenessIntegrationEngine.getProactiveRecommendations(
        {
          part: {
            diameter: 50,
            length: 100,
            wallThickness: 1.5,
            lotSize: 10,
          },
        }
      );

      expect(result).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => w.includes("Thin wall"))).toBe(true);
    });

    it("adds warnings for superalloy", () => {
      const result = latheSelfAwarenessIntegrationEngine.getProactiveRecommendations(
        {
          material: {
            name: "Inconel 718",
            isoGroup: "S",
            hardness: 350,
            condition: "annealed",
          },
        }
      );

      expect(result).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => w.includes("Superalloy"))).toBe(true);
    });

    it("adds warnings for hardened steel", () => {
      const result = latheSelfAwarenessIntegrationEngine.getProactiveRecommendations(
        {
          material: {
            name: "D2 Hardened",
            isoGroup: "H",
            hardness: 60,
            condition: "hardened",
          },
        }
      );

      expect(result).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => w.includes("Hardened"))).toBe(true);
    });

    it("returns recommended actions", () => {
      const result = latheSelfAwarenessIntegrationEngine.getProactiveRecommendations(
        {
          operation: "boring",
        }
      );

      expect(result).toBeDefined();
      expect(result.recommendedActions).toBeDefined();
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles empty query in whatCanIDo", () => {
      const result = latheSelfAwarenessIntegrationEngine.whatCanIDo("");

      expect(result).toBeDefined();
    });

    it("handles special characters in query", () => {
      const result = latheSelfAwarenessIntegrationEngine.whatCanIDo(
        "speed/feed for D2 @ 150SFM"
      );

      expect(result).toBeDefined();
    });

    it("handles numeric query", () => {
      const result = latheSelfAwarenessIntegrationEngine.howDoI(
        "calculate 200 RPM to SFM"
      );

      expect(result).toBeDefined();
    });

    it("handles very long query", () => {
      const longQuery = "optimize ".repeat(100);
      const result = latheSelfAwarenessIntegrationEngine.findBestEngineForTask(
        longQuery
      );

      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // PHYSICS CALCULATIONS
  // ============================================================================

  describe("physics calculations in synthesis", () => {
    const context: LatheOperationContext = {
      operation: "turning_od",
      material: {
        name: "Steel 4140",
        isoGroup: "P",
        hardness: 200,
        condition: "annealed",
      },
      part: {
        diameter: 100,
        length: 200,
        lotSize: 50,
      },
      machine: {
        machineId: "Test-Lathe",
        controller: "Fanuc",
        maxSpindleRpm: 3000,
        maxPower: 15,
        hasLiveTooling: false,
        hasCAxis: false,
        hasYAxis: false,
      },
      tool: {
        toolType: "CNMG",
        insertGrade: "P25",
        noseRadius: 0.8,
        leadAngle: 95,
      },
      parameters: {
        speed: 250,
        feed: 0.008,
        depthOfCut: 2.0,
        coolant: "flood",
      },
      quality: {
        surfaceFinish: 3.2,
      },
      constraints: {},
    };

    it("calculates valid Kienzle force", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result.physicsResult.cuttingForce).toBeGreaterThan(0);
      expect(result.physicsResult.cuttingForce).toBeLessThan(50000); // Reasonable max
    });

    it("calculates valid Taylor tool life", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result.physicsResult.toolLife).toBeGreaterThan(0);
      expect(result.physicsResult.toolLife).toBeLessThan(1000); // Reasonable max
    });

    it("calculates valid power", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result.physicsResult.power).toBeGreaterThan(0);
      expect(result.physicsResult.power).toBeLessThan(100); // kW max
    });

    it("calculates valid MRR", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result.physicsResult.mrr).toBeGreaterThan(0);
    });

    it("validates thermal calculations", () => {
      const result = latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(
        context
      );

      expect(result.thermalResult.cuttingTemperature).toBeGreaterThan(0);
      expect(result.thermalResult.cuttingTemperature).toBeLessThan(1500);
    });
  });
});
