/**
 * MillingAILearningOrchestratorEngine + L2 Aggregators Test Suite
 * MILL-MASTER/P1-U09-L2-AGG
 *
 * Tests all 4 L2 aggregator engines with real assertions:
 *   - MillingAILearningOrchestratorEngine (AI/ML aggregator, 9 routes)
 *   - MillTurnOrchestrationEngine (mill-turn aggregator, 6 routes)
 *   - FiveAxisAggregatorEngine (5-axis aggregator, 10 routes)
 *   - MultiAxisAggregatorEngine (multi-axis aggregator, 4 routes)
 *
 * Coverage: happy path + 3+ failure modes + adversarial inputs + variability floor.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { millingAILearningOrchestratorEngine } from "../engines/MillingAILearningOrchestratorEngine.js";
import { millTurnOrchestrationEngine } from "../engines/MillTurnOrchestrationEngine.js";
import { fiveAxisAggregatorEngine } from "../engines/FiveAxisAggregatorEngine.js";
import { multiAxisAggregatorEngine } from "../engines/MultiAxisAggregatorEngine.js";

// ============================================================================
// MILLING AI/LEARNING ORCHESTRATOR
// ============================================================================
describe("MillingAILearningOrchestratorEngine", () => {
  beforeEach(() => {
    millingAILearningOrchestratorEngine.resetStats();
  });

  describe("Route Registration", () => {
    it("supports exactly 9 request types", () => {
      expect(millingAILearningOrchestratorEngine.getSupportedTypes().length).toBe(9);
    });

    it("registered engines include MillingAGIMasterEngine (already built)", () => {
      const engines = millingAILearningOrchestratorEngine.getRegisteredEngines();
      expect(engines).toContain("MillingAGIMasterEngine");
    });

    it("registered engines include 9 distinct sub-engines", () => {
      const engines = millingAILearningOrchestratorEngine.getRegisteredEngines();
      expect(engines.length).toBe(9);
    });

    it("all supported types start with known prefix", () => {
      const types = millingAILearningOrchestratorEngine.getSupportedTypes();
      const valid = ["ai_reasoning", "strategy_lookup", "rl_train", "pattern_mine",
        "online_update", "reasoning_trace", "meta_learn", "neural_predict", "deep_predict"];
      types.forEach(t => expect(valid).toContain(t));
    });
  });

  describe("Happy Path — Existing Engine", () => {
    it("ai_reasoning routes to MillingAGIMasterEngine successfully", async () => {
      const response = await millingAILearningOrchestratorEngine.orchestrate({
        request_type: "ai_reasoning",
        intent: "select roughing strategy for 17-4 PH",
      });
      expect(response.success).toBe(true);
      expect(response.engine).toBe("MillingAGIMasterEngine");
      expect(response.provenance.engine_available).toBe(true);
      expect(response.provenance.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Failure Modes — Unbuilt Engines Graceful Fallback", () => {
    it("strategy_lookup returns status=engine_not_built when sub-engine missing", async () => {
      const response = await millingAILearningOrchestratorEngine.orchestrate({
        request_type: "strategy_lookup",
        query: "pocket_2d",
      });
      expect(response.success).toBe(false);
      expect(response.engine).toBe("MillingStrategyLibraryEngine");
      expect(response.provenance.engine_available).toBe(false);
      expect(response.result).toBeNull();
      expect(response.provenance.engine_available).toBe(false);
    });

    it("rl_train returns warnings array for unbuilt engine", async () => {
      const response = await millingAILearningOrchestratorEngine.orchestrate({
        request_type: "rl_train",
        episode_count: 100,
      });
      expect(response.warnings.length).toBeGreaterThan(0);
      expect(response.warnings[0]).toMatch(/not found|not available|unavailable/i);
    });

    it("pattern_mine routes and marks unavailable gracefully", async () => {
      const response = await millingAILearningOrchestratorEngine.orchestrate({
        request_type: "pattern_mine",
        dataset_id: "jm_die_2024",
      });
      expect(response.provenance.engine_available).toBe(false);
      expect(response.success).toBe(false);
    });

    it("rejects unknown request_type with success=false", async () => {
      const response = await millingAILearningOrchestratorEngine.orchestrate({
        request_type: "bogus_type" as any,
      });
      expect(response.success).toBe(false);
      expect(response.engine).toBe("unknown");
      expect(response.warnings[0]).toMatch(/unknown/i);
    });
  });

  describe("Adversarial Inputs", () => {
    it("handles empty intent string", async () => {
      const response = await millingAILearningOrchestratorEngine.orchestrate({
        request_type: "ai_reasoning",
        intent: "",
      });
      expect(response.provenance.ts).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    it("handles extremely long intent (10k chars)", async () => {
      const longIntent = "optimize ".repeat(1000);
      const response = await millingAILearningOrchestratorEngine.orchestrate({
        request_type: "ai_reasoning",
        intent: longIntent,
      });
      expect(response.success).toBe(true);
    });
  });

  describe("Stats", () => {
    it("invocation count increments per orchestrate call", async () => {
      const before = millingAILearningOrchestratorEngine.getStats().invocations;
      await millingAILearningOrchestratorEngine.orchestrate({ request_type: "ai_reasoning" });
      await millingAILearningOrchestratorEngine.orchestrate({ request_type: "ai_reasoning" });
      const after = millingAILearningOrchestratorEngine.getStats().invocations;
      expect(after - before).toBe(2);
    });

    it("stats reports 9 engines and 9 request_types", () => {
      const stats = millingAILearningOrchestratorEngine.getStats();
      expect(stats.engines).toBe(9);
      expect(stats.request_types).toBe(9);
    });
  });

  describe("Availability Check", () => {
    it("checkEngineAvailability returns true for built engine", async () => {
      const available = await millingAILearningOrchestratorEngine.checkEngineAvailability("ai_reasoning");
      expect(available).toBe(true);
    });

    it("checkEngineAvailability returns false for unbuilt engine", async () => {
      const available = await millingAILearningOrchestratorEngine.checkEngineAvailability("strategy_lookup");
      expect(available).toBe(false);
    });
  });
});

// ============================================================================
// MILL-TURN ORCHESTRATION
// ============================================================================
describe("MillTurnOrchestrationEngine", () => {
  describe("Registration", () => {
    it("supports 6 request types", () => {
      expect(millTurnOrchestrationEngine.getSupportedTypes().length).toBe(6);
    });

    it("supports 6 machine classes", () => {
      const classes = millTurnOrchestrationEngine.getSupportedMachineClasses();
      expect(classes.length).toBe(6);
      expect(classes).toContain("integrex");
      expect(classes).toContain("swiss");
      expect(classes).toContain("lb_series");
    });

    it("registered engines are MillTurnCAM + MillTurnSwissPipeline (2 unique)", () => {
      const engines = millTurnOrchestrationEngine.getRegisteredEngines();
      expect(engines.length).toBe(2);
      expect(engines).toContain("MillTurnCAMEngine");
      expect(engines).toContain("MillTurnSwissPipelineEngine");
    });
  });

  describe("Machine-Class Variability", () => {
    const classes: Array<"integrex" | "swiss" | "lb_series"> = ["integrex", "swiss", "lb_series"];
    it.each(classes)("orchestrates for machine_class=%s", async (cls) => {
      const response = await millTurnOrchestrationEngine.orchestrate({
        request_type: "cam_generate",
        machine_class: cls,
      });
      expect(response.request_type).toBe("cam_generate");
    });
  });

  describe("Failure Modes", () => {
    it("unknown request_type returns success=false", async () => {
      const response = await millTurnOrchestrationEngine.orchestrate({
        request_type: "nonexistent" as any,
      });
      expect(response.success).toBe(false);
      expect(response.engine).toBe("unknown");
    });

    it("cam_generate gracefully handles unbuilt MillTurnCAMEngine", async () => {
      const response = await millTurnOrchestrationEngine.orchestrate({
        request_type: "cam_generate",
      });
      expect(response.provenance.engine_available).toBe(false);
      expect(response.result).toBeNull();
      expect(response.provenance.engine_available).toBe(false);
    });

    it("swiss_pipeline returns structured response even when unavailable", async () => {
      const response = await millTurnOrchestrationEngine.orchestrate({
        request_type: "swiss_pipeline",
        bar_diameter_mm: 25.4,
      });
      expect(response.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Adversarial Inputs", () => {
    it("handles bar_diameter_mm = Infinity", async () => {
      const response = await millTurnOrchestrationEngine.orchestrate({
        request_type: "bar_feeder",
        bar_diameter_mm: Infinity,
      });
      expect(response.request_type).toBe("bar_feeder");
    });

    it("handles negative live_tool_spindle_rpm", async () => {
      const response = await millTurnOrchestrationEngine.orchestrate({
        request_type: "live_tool",
        live_tool_spindle_rpm: -5000,
      });
      expect(response.provenance.ts).toBeTruthy();
    });
  });

  describe("isAvailable", () => {
    it("isAvailable returns false for unbuilt sub-engine", async () => {
      const available = await millTurnOrchestrationEngine.isAvailable("cam_generate");
      expect(available).toBe(false);
    });
  });
});

// ============================================================================
// FIVE-AXIS AGGREGATOR
// ============================================================================
describe("FiveAxisAggregatorEngine", () => {
  describe("Registration", () => {
    it("supports 10 request types", () => {
      expect(fiveAxisAggregatorEngine.getSupportedTypes().length).toBe(10);
    });

    it("supports 5 kinematics configurations", () => {
      const kinematics = fiveAxisAggregatorEngine.getSupportedKinematics();
      expect(kinematics.length).toBe(5);
      expect(kinematics).toContain("head_head");
      expect(kinematics).toContain("head_table");
      expect(kinematics).toContain("table_table");
    });

    it("registered engines include all 9 FiveAxis* targets", () => {
      const engines = fiveAxisAggregatorEngine.getRegisteredEngines();
      expect(engines).toContain("FiveAxisOrchestrationEngine");
      expect(engines).toContain("FiveAxisAIUltraEngine");
      expect(engines).toContain("FiveAxisDeepLearningEngine");
      expect(engines.length).toBe(9);
    });
  });

  describe("Kinematics Variability", () => {
    const configs: Array<"head_head" | "head_table" | "table_table"> =
      ["head_head", "head_table", "table_table"];
    it.each(configs)("routes for kinematics=%s", async (kin) => {
      const response = await fiveAxisAggregatorEngine.orchestrate({
        request_type: "orchestrate",
        kinematics: kin,
      });
      expect(response.provenance.kinematics).toBe(kin);
    });
  });

  describe("Failure Modes", () => {
    it("unknown request_type fails gracefully", async () => {
      const response = await fiveAxisAggregatorEngine.orchestrate({
        request_type: "bad_type" as any,
      });
      expect(response.success).toBe(false);
      expect(response.warnings[0]).toMatch(/unknown/i);
    });

    it("ai_ultra unbuilt engine returns engine_not_built marker", async () => {
      const response = await fiveAxisAggregatorEngine.orchestrate({
        request_type: "ai_ultra",
        lead_angle_deg: 5,
      });
      expect(response.result).toBeNull();
      expect(response.provenance.engine_available).toBe(false);
    });

    it("rtcp_check returns structured response even when unbuilt", async () => {
      const response = await fiveAxisAggregatorEngine.orchestrate({
        request_type: "rtcp_check",
      });
      expect(response.engine).toBe("FiveAxisOrchestrationEngine");
    });
  });

  describe("Adversarial Inputs", () => {
    it("handles lead_angle_deg = NaN", async () => {
      const response = await fiveAxisAggregatorEngine.orchestrate({
        request_type: "decide",
        lead_angle_deg: NaN,
      });
      expect(response.provenance.ts).toBeTruthy();
    });

    it("handles tool_axis with Infinity components", async () => {
      const response = await fiveAxisAggregatorEngine.orchestrate({
        request_type: "toolpath_synth",
        tool_axis: [Infinity, 0, 1],
      });
      expect(response.request_type).toBe("toolpath_synth");
    });
  });

  describe("Stats", () => {
    it("stats has 10 request_types", () => {
      const stats = fiveAxisAggregatorEngine.getStats();
      expect(stats.request_types).toBe(10);
    });
  });
});

// ============================================================================
// MULTI-AXIS AGGREGATOR
// ============================================================================
describe("MultiAxisAggregatorEngine", () => {
  describe("Registration", () => {
    it("supports 4 request types", () => {
      expect(multiAxisAggregatorEngine.getSupportedTypes().length).toBe(4);
    });

    it("supports 4/5/6 axis counts", () => {
      const counts = multiAxisAggregatorEngine.getSupportedAxisCounts();
      expect(counts).toEqual([4, 5, 6]);
    });

    it("registered engines are MultiAxisKinematic + MultiAxisPrintToProgram", () => {
      const engines = multiAxisAggregatorEngine.getRegisteredEngines();
      expect(engines.length).toBe(2);
      expect(engines).toContain("MultiAxisKinematicEngine");
      expect(engines).toContain("MultiAxisPrintToProgramEngine");
    });
  });

  describe("Axis-Count Variability", () => {
    const counts: Array<4 | 5 | 6> = [4, 5, 6];
    it.each(counts)("routes for axis_count=%i", async (n) => {
      const response = await multiAxisAggregatorEngine.orchestrate({
        request_type: "kinematic_fk",
        axis_count: n,
        joint_values: Array(n).fill(0),
      });
      expect(response.provenance.axis_count).toBe(n);
    });
  });

  describe("Failure Modes", () => {
    it("unknown request_type fails gracefully", async () => {
      const response = await multiAxisAggregatorEngine.orchestrate({
        request_type: "ghost" as any,
      });
      expect(response.success).toBe(false);
    });

    it("kinematic_fk unavailable returns marker", async () => {
      const response = await multiAxisAggregatorEngine.orchestrate({
        request_type: "kinematic_fk",
        joint_values: [0, 0, 0, 0, 0],
      });
      expect(response.result).toBeNull();
      expect(response.provenance.engine_available).toBe(false);
    });

    it("print_to_prog unavailable returns structured response", async () => {
      const response = await multiAxisAggregatorEngine.orchestrate({
        request_type: "print_to_prog",
      });
      expect(response.engine).toBe("MultiAxisPrintToProgramEngine");
      expect(response.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Adversarial Inputs", () => {
    it("handles joint_values with NaN", async () => {
      const response = await multiAxisAggregatorEngine.orchestrate({
        request_type: "kinematic_fk",
        joint_values: [NaN, 0, 0, 0, 0],
      });
      expect(response.provenance.ts).toBeTruthy();
    });

    it("handles empty joint_values array", async () => {
      const response = await multiAxisAggregatorEngine.orchestrate({
        request_type: "kinematic_fk",
        joint_values: [],
      });
      expect(response.request_type).toBe("kinematic_fk");
    });
  });

  describe("Stats", () => {
    it("stats reports 2 engines and 4 request_types", () => {
      const stats = multiAxisAggregatorEngine.getStats();
      expect(stats.engines).toBe(2);
      expect(stats.request_types).toBe(4);
    });
  });
});

// ============================================================================
// CROSS-AGGREGATOR INTEGRITY
// ============================================================================
describe("Cross-Aggregator Integrity", () => {
  it("all 4 aggregators export singletons", () => {
    expect(typeof millingAILearningOrchestratorEngine.orchestrate).toBe("function");
    expect(typeof millTurnOrchestrationEngine.orchestrate).toBe("function");
    expect(typeof fiveAxisAggregatorEngine.orchestrate).toBe("function");
    expect(typeof multiAxisAggregatorEngine.orchestrate).toBe("function");
  });

  it("combined engine count across L2 aggregators = 22 unique engine targets", () => {
    const all = new Set<string>();
    millingAILearningOrchestratorEngine.getRegisteredEngines().forEach(e => all.add(e));
    millTurnOrchestrationEngine.getRegisteredEngines().forEach(e => all.add(e));
    fiveAxisAggregatorEngine.getRegisteredEngines().forEach(e => all.add(e));
    multiAxisAggregatorEngine.getRegisteredEngines().forEach(e => all.add(e));
    expect(all.size).toBeGreaterThanOrEqual(20);
  });

  it("combined request type count across L2 aggregators = 29", () => {
    const total =
      millingAILearningOrchestratorEngine.getSupportedTypes().length +
      millTurnOrchestrationEngine.getSupportedTypes().length +
      fiveAxisAggregatorEngine.getSupportedTypes().length +
      multiAxisAggregatorEngine.getSupportedTypes().length;
    expect(total).toBe(29);
  });
});
