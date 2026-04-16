/**
 * Tests for AutonomousAIOrchestrationEngine
 *
 * Verifies autonomous AI orchestration, skill/hook/script automation,
 * algorithm selection, formula application, and knowledge utilization.
 */

import { describe, it, expect } from "vitest";
import {
  autonomousAIOrchestration,
  AutonomousAIOrchestrationEngine,
  type AutonomousTaskRequest,
  type GSDRequest,
} from "../../engines/AutonomousAIOrchestrationEngine.js";

describe("AutonomousAIOrchestrationEngine", () => {
  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(autonomousAIOrchestration).toBeInstanceOf(AutonomousAIOrchestrationEngine);
    });

    it("provides summary", () => {
      const summary = autonomousAIOrchestration.getSummary();
      expect(summary).toContain("AutonomousAIOrchestrationEngine");
      expect(summary).toContain("Self-reliant");
      expect(summary).toContain("skills");
      expect(summary).toContain("hooks");
      expect(summary).toContain("MIT courses");
    });
  });

  describe("executeAutonomously", () => {
    it("executes a simple task autonomously", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Calculate speed and feed for aluminum turning",
        mode: "advisory",
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.taskId).toBeDefined();
      expect(result.intent).toBe(request.intent);
      expect(result.mode).toBe("advisory");
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it("uses full_auto mode by default", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Optimize toolpath for milling operation",
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.mode).toBe("full_auto");
    });

    it("includes knowledge sources in result", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Analyze cutting forces for steel machining",
        knowledgeSources: ["tribal_knowledge", "formulas"],
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.knowledgeUsed.length).toBeGreaterThan(0);
    });

    it("tracks skills executed", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Calculate speed and feed for titanium",
        mode: "full_auto",
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.skillsExecuted.length).toBeGreaterThan(0);
    });

    it("tracks hooks triggered", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Machine a complex part with safety checks",
        mode: "full_auto",
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.hooksTriggered.length).toBeGreaterThan(0);
    });

    it("tracks engines invoked", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Perform deep analysis of cutting parameters",
        mode: "full_auto",
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.enginesInvoked.length).toBeGreaterThan(0);
    });

    it("provides suggestions in result", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Optimize machining process for D2 steel",
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("generates learnings in learning mode", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Learn optimal parameters for aluminum 7075",
        mode: "learning",
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.learnings.length).toBeGreaterThan(0);
    });

    it("handles execution with constraints", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Generate NC program for lathe operation",
        constraints: ["max spindle speed 5000 RPM", "coolant required"],
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.success).toBe(true);
    });

    it("handles execution with context", async () => {
      const request: AutonomousTaskRequest = {
        intent: "Quote this part for ALCOA",
        context: { customer: "ALCOA", quantity: 100 },
      };

      const result = await autonomousAIOrchestration.executeAutonomously(request);

      expect(result.success).toBe(true);
    });
  });

  describe("selectSkillChain", () => {
    it("selects speed-feed skill for speed/feed intent", async () => {
      const chain = await autonomousAIOrchestration.selectSkillChain(
        "Calculate speed and feed for aluminum",
        {}
      );

      expect(chain.some(s => s.skillId.includes("speed-feed"))).toBe(true);
    });

    it("selects tool selector skill for tool selection", async () => {
      const chain = await autonomousAIOrchestration.selectSkillChain(
        "Recommend a tool for roughing steel",
        {}
      );

      expect(chain.some(s => s.skillId.includes("tool"))).toBe(true);
    });

    it("selects quote skill for quoting intent", async () => {
      const chain = await autonomousAIOrchestration.selectSkillChain(
        "Quote this part for customer",
        {}
      );

      expect(chain.some(s => s.skillId.includes("quote"))).toBe(true);
    });

    it("selects program generator for NC programming", async () => {
      const chain = await autonomousAIOrchestration.selectSkillChain(
        "Generate g-code for this operation",
        {}
      );

      expect(chain.some(s => s.skillId.includes("program"))).toBe(true);
    });

    it("selects quality skill for quality tasks", async () => {
      const chain = await autonomousAIOrchestration.selectSkillChain(
        "Check tolerance capability for this part",
        {}
      );

      expect(chain.some(s => s.skillId.includes("quality"))).toBe(true);
    });

    it("selects AI skill for analysis tasks", async () => {
      const chain = await autonomousAIOrchestration.selectSkillChain(
        "Diagnose why this tool is wearing fast",
        {}
      );

      expect(chain.some(s => s.skillId.includes("ai"))).toBe(true);
    });

    it("defaults to cognitive core for unknown intents", async () => {
      const chain = await autonomousAIOrchestration.selectSkillChain(
        "something completely unrelated",
        {}
      );

      expect(chain.some(s => s.skillId.includes("cognitive"))).toBe(true);
    });
  });

  describe("selectHookChain", () => {
    it("always includes pre/post execution hooks", () => {
      const chain = autonomousAIOrchestration.selectHookChain("any intent", []);

      expect(chain.hooks).toContain("pre-execution-validation");
      expect(chain.hooks).toContain("post-execution-audit");
    });

    it("includes safety hooks for machining", () => {
      const chain = autonomousAIOrchestration.selectHookChain("machine this part", []);

      expect(chain.hooks.some(h => h.includes("safety"))).toBe(true);
    });

    it("includes physics validation for cutting", () => {
      const chain = autonomousAIOrchestration.selectHookChain("cut steel at high speed", []);

      expect(chain.hooks.some(h => h.includes("physics"))).toBe(true);
    });

    it("includes data persistence for save operations", () => {
      const chain = autonomousAIOrchestration.selectHookChain("save this configuration", []);

      expect(chain.hooks.some(h => h.includes("persistence"))).toBe(true);
    });

    it("always includes learning feedback hook", () => {
      const chain = autonomousAIOrchestration.selectHookChain("any intent", []);

      expect(chain.hooks.some(h => h.includes("learning"))).toBe(true);
    });

    it("uses sequential timing by default", () => {
      const chain = autonomousAIOrchestration.selectHookChain("any intent", []);

      expect(chain.timing).toBe("sequential");
    });

    it("uses continue failure mode by default", () => {
      const chain = autonomousAIOrchestration.selectHookChain("any intent", []);

      expect(chain.failureMode).toBe("continue");
    });
  });

  describe("selectAlgorithms", () => {
    it("selects Kienzle for force calculations", () => {
      const algorithms = autonomousAIOrchestration.selectAlgorithms("calculate cutting force");

      expect(algorithms.some(a => a.name === "Kienzle")).toBe(true);
    });

    it("selects Taylor for tool life", () => {
      const algorithms = autonomousAIOrchestration.selectAlgorithms("predict tool wear life");

      expect(algorithms.some(a => a.name === "Taylor")).toBe(true);
    });

    it("selects SLD for chatter analysis", () => {
      const algorithms = autonomousAIOrchestration.selectAlgorithms("detect chatter vibration");

      expect(algorithms.some(a => a.name === "StabilityLobeDiagram")).toBe(true);
    });

    it("selects GA for optimization", () => {
      const algorithms = autonomousAIOrchestration.selectAlgorithms("optimize parameters for best result");

      expect(algorithms.some(a => a.name === "GeneticAlgorithm")).toBe(true);
    });

    it("selects Bayesian for prediction", () => {
      const algorithms = autonomousAIOrchestration.selectAlgorithms("predict future outcomes");

      expect(algorithms.some(a => a.name === "BayesianInference")).toBe(true);
    });

    it("selects RandomForest for pattern learning", () => {
      const algorithms = autonomousAIOrchestration.selectAlgorithms("learn patterns from data");

      expect(algorithms.some(a => a.name === "RandomForest")).toBe(true);
    });
  });

  describe("selectFormulas", () => {
    it("selects cutting speed formula for speed", () => {
      const formulas = autonomousAIOrchestration.selectFormulas("calculate cutting speed rpm");

      expect(formulas.some(f => f.name === "CuttingSpeed")).toBe(true);
    });

    it("selects feed per tooth formula for feed", () => {
      const formulas = autonomousAIOrchestration.selectFormulas("calculate feed per tooth fz");

      expect(formulas.some(f => f.name === "FeedPerTooth")).toBe(true);
    });

    it("selects Kienzle force formula", () => {
      const formulas = autonomousAIOrchestration.selectFormulas("calculate cutting force power");

      expect(formulas.some(f => f.name === "KienzleForce")).toBe(true);
    });

    it("selects roughness formula for surface finish", () => {
      const formulas = autonomousAIOrchestration.selectFormulas("calculate surface finish roughness");

      expect(formulas.some(f => f.name === "TheoreticalRoughness")).toBe(true);
    });

    it("selects MRR formula for material removal", () => {
      const formulas = autonomousAIOrchestration.selectFormulas("calculate MRR removal rate");

      expect(formulas.some(f => f.name === "MaterialRemovalRate")).toBe(true);
    });

    it("selects cost formula for pricing", () => {
      const formulas = autonomousAIOrchestration.selectFormulas("calculate machining cost price");

      expect(formulas.some(f => f.name === "MachineCost")).toBe(true);
    });
  });

  describe("planKnowledgeUtilization", () => {
    it("always includes PRISM engines", () => {
      const plan = autonomousAIOrchestration.planKnowledgeUtilization({
        intent: "any task",
      });

      expect(plan.sources.some(s => s.source === "prism_engines")).toBe(true);
    });

    it("includes tribal knowledge for machining", () => {
      const plan = autonomousAIOrchestration.planKnowledgeUtilization({
        intent: "machine a complex part",
      });

      expect(plan.sources.some(s => s.source === "tribal_knowledge")).toBe(true);
    });

    it("includes playbook rules for cutting", () => {
      const plan = autonomousAIOrchestration.planKnowledgeUtilization({
        intent: "cut titanium with proper tool selection",
      });

      expect(plan.sources.some(s => s.source === "playbook_rules")).toBe(true);
    });

    it("includes MIT courses for learning", () => {
      const plan = autonomousAIOrchestration.planKnowledgeUtilization({
        intent: "learn about optimization algorithms",
      });

      expect(plan.sources.some(s => s.source === "mit_courses")).toBe(true);
    });

    it("includes vendor catalogs for tooling", () => {
      const plan = autonomousAIOrchestration.planKnowledgeUtilization({
        intent: "select carbide insert for steel",
      });

      expect(plan.sources.some(s => s.source === "vendor_catalogs")).toBe(true);
    });

    it("includes PDF library for specifications", () => {
      const plan = autonomousAIOrchestration.planKnowledgeUtilization({
        intent: "find ISO standard reference spec",
      });

      expect(plan.sources.some(s => s.source === "pdf_library")).toBe(true);
    });

    it("calculates confidence boost", () => {
      const plan = autonomousAIOrchestration.planKnowledgeUtilization({
        intent: "complex machining task",
      });

      expect(plan.confidenceBoost).toBeGreaterThan(0);
    });
  });

  describe("queryMITCourses", () => {
    it("finds mechanics courses for force topics", async () => {
      const courses = await autonomousAIOrchestration.queryMITCourses("mechanics force analysis");

      expect(courses.some(c => c.courseId === "2.001")).toBe(true);
    });

    it("finds algorithm courses for optimization", async () => {
      const courses = await autonomousAIOrchestration.queryMITCourses("optimization algorithm");

      expect(courses.some(c => c.courseId === "6.006")).toBe(true);
    });

    it("finds ML courses for AI topics", async () => {
      const courses = await autonomousAIOrchestration.queryMITCourses("machine learning ai");

      expect(courses.some(c => c.courseId === "6.036")).toBe(true);
    });

    it("finds manufacturing courses", async () => {
      const courses = await autonomousAIOrchestration.queryMITCourses("manufacturing production");

      expect(courses.some(c => c.courseId === "2.810")).toBe(true);
    });

    it("returns algorithms for each course", async () => {
      const courses = await autonomousAIOrchestration.queryMITCourses("manufacturing");

      expect(courses[0]?.algorithms.length).toBeGreaterThan(0);
    });
  });

  describe("queryVendorCatalogs", () => {
    it("finds Sandvik products for inserts", async () => {
      const results = await autonomousAIOrchestration.queryVendorCatalogs("carbide insert for steel");

      expect(results.some(r => r.vendor === "Sandvik Coromant")).toBe(true);
    });

    it("finds Kennametal products", async () => {
      const results = await autonomousAIOrchestration.queryVendorCatalogs("carbide insert");

      expect(results.some(r => r.vendor === "Kennametal")).toBe(true);
    });

    it("finds Guhring products for end mills", async () => {
      const results = await autonomousAIOrchestration.queryVendorCatalogs("end mill milling tool");

      expect(results.some(r => r.vendor === "Guhring")).toBe(true);
    });

    it("includes specifications in results", async () => {
      const results = await autonomousAIOrchestration.queryVendorCatalogs("insert");

      expect(results[0]?.specifications).toBeDefined();
      expect(Object.keys(results[0]?.specifications).length).toBeGreaterThan(0);
    });
  });

  describe("generateGSD", () => {
    it("generates engine code", async () => {
      const request: GSDRequest = {
        type: "full",
        entityType: "engine",
        name: "Test Calculation",
        description: "Test calculation engine",
        domain: "testing",
        capabilities: ["calculate", "validate"],
        inputs: [{ name: "value", type: "number", description: "Input value" }],
        outputs: [{ name: "result", type: "number", description: "Output result" }],
      };

      const gsd = await autonomousAIOrchestration.generateGSD(request);

      expect(gsd.engineCode).toContain("class TestCalculationEngine");
      expect(gsd.engineCode).toContain("calculate");
      expect(gsd.engineCode).toContain("validate");
    });

    it("generates schema code", async () => {
      const request: GSDRequest = {
        type: "full",
        entityType: "engine",
        name: "Schema Test",
        description: "Test schema generation",
        domain: "testing",
        capabilities: ["process"],
        inputs: [
          { name: "text", type: "string", description: "Text input" },
          { name: "count", type: "number", description: "Count" },
        ],
        outputs: [{ name: "success", type: "boolean", description: "Success flag" }],
      };

      const gsd = await autonomousAIOrchestration.generateGSD(request);

      expect(gsd.schemaCode).toContain("z.object");
      expect(gsd.schemaCode).toContain("text: z.string()");
      expect(gsd.schemaCode).toContain("count: z.number()");
    });

    it("generates dispatcher wiring", async () => {
      const request: GSDRequest = {
        type: "full",
        entityType: "engine",
        name: "Dispatcher Test",
        description: "Test dispatcher wiring",
        domain: "testing",
        capabilities: ["execute"],
        inputs: [],
        outputs: [],
      };

      const gsd = await autonomousAIOrchestration.generateGSD(request);

      expect(gsd.dispatcherWiring).toContain("case");
      expect(gsd.dispatcherWiring).toContain("dispatcher_test");
      expect(gsd.dispatcherWiring).toContain("import");
    });

    it("generates test code", async () => {
      const request: GSDRequest = {
        type: "full",
        entityType: "engine",
        name: "Test Generator",
        description: "Test code generation",
        domain: "testing",
        capabilities: ["generate", "verify"],
        inputs: [{ name: "input", type: "string", description: "Input" }],
        outputs: [{ name: "output", type: "string", description: "Output" }],
      };

      const gsd = await autonomousAIOrchestration.generateGSD(request);

      expect(gsd.testCode).toContain("describe");
      expect(gsd.testCode).toContain("it(");
      expect(gsd.testCode).toContain("expect");
      expect(gsd.testCode).toContain("generate");
      expect(gsd.testCode).toContain("verify");
    });
  });

  describe("getLearningStats", () => {
    it("returns pattern count", () => {
      const stats = autonomousAIOrchestration.getLearningStats();

      expect(typeof stats.patterns).toBe("number");
    });

    it("returns average score", () => {
      const stats = autonomousAIOrchestration.getLearningStats();

      expect(typeof stats.avgScore).toBe("number");
      expect(stats.avgScore).toBeGreaterThanOrEqual(0);
      expect(stats.avgScore).toBeLessThanOrEqual(1);
    });
  });

  describe("getExecutionHistory", () => {
    it("returns array of execution results", () => {
      const history = autonomousAIOrchestration.getExecutionHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    it("history grows after execution", async () => {
      const beforeCount = autonomousAIOrchestration.getExecutionHistory().length;

      await autonomousAIOrchestration.executeAutonomously({
        intent: "test task for history",
        mode: "advisory",
      });

      const afterCount = autonomousAIOrchestration.getExecutionHistory().length;

      expect(afterCount).toBe(beforeCount + 1);
    });
  });

  describe("integration scenarios", () => {
    it("complete manufacturing workflow", async () => {
      const result = await autonomousAIOrchestration.executeAutonomously({
        intent: "Machine a D2 steel part with 0.001 tolerance on the OD, generate quote for ALCOA",
        context: { customer: "ALCOA", material: "D2", quantity: 50 },
        constraints: ["surface finish Ra < 0.8", "delivery in 2 weeks"],
        mode: "learning",
        knowledgeSources: ["tribal_knowledge", "vendor_catalogs", "formulas"],
      });

      expect(result.success).toBe(true);
      expect(result.steps.length).toBeGreaterThan(3);
      expect(result.skillsExecuted.length).toBeGreaterThan(0);
      expect(result.knowledgeUsed.length).toBeGreaterThan(0);
      expect(result.learnings.length).toBeGreaterThan(0);
    });

    it("tool selection with vendor catalog lookup", async () => {
      const result = await autonomousAIOrchestration.executeAutonomously({
        intent: "Select best carbide insert for roughing stainless steel",
        knowledgeSources: ["vendor_catalogs", "tribal_knowledge"],
      });

      expect(result.success).toBe(true);
      expect(result.knowledgeUsed).toContain("vendor_catalogs");
    });

    it("physics analysis with formulas and algorithms", async () => {
      const result = await autonomousAIOrchestration.executeAutonomously({
        intent: "Analyze cutting forces and predict tool life for high-speed machining",
      });

      expect(result.success).toBe(true);
      expect(result.steps.some(s => s.type === "formula")).toBe(true);
      expect(result.steps.some(s => s.type === "algorithm")).toBe(true);
    });
  });
});
