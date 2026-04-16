/**
 * Multi-Agent Coordination & Scientific Reasoning Tests
 * ======================================================
 * Tests for:
 *   - MultiAgentCoordinatorEngine
 *   - ScientificReasoningEngine
 *   - AgentWorkflowEngine
 *
 * @module __tests__/multi-agent-scientific
 */

import { describe, it, expect, beforeEach } from "vitest";

// ============================================================================
// MULTI-AGENT COORDINATOR TESTS
// ============================================================================

describe("MultiAgentCoordinatorEngine", () => {
  let multiAgentCoordinatorEngine: typeof import("../engines/MultiAgentCoordinatorEngine.js")["multiAgentCoordinatorEngine"];

  beforeEach(async () => {
    const mod = await import("../engines/MultiAgentCoordinatorEngine.js");
    multiAgentCoordinatorEngine = mod.multiAgentCoordinatorEngine;
    multiAgentCoordinatorEngine.clearHistory();
  });

  describe("getAgents()", () => {
    it("should return all available agents", () => {
      const agents = multiAgentCoordinatorEngine.getAgents();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.length).toBe(10); // 10 defined agents
    });

    it("should include physics agent", () => {
      const agents = multiAgentCoordinatorEngine.getAgents();
      const physicsAgent = agents.find(a => a.type === "physics");
      expect(physicsAgent).toBeDefined();
      expect(physicsAgent?.capabilities).toContain("kienzle_force");
    });

    it("should include safety agent with highest priority", () => {
      const agents = multiAgentCoordinatorEngine.getAgents();
      const safetyAgent = agents.find(a => a.type === "safety");
      expect(safetyAgent).toBeDefined();
      expect(safetyAgent?.priority).toBe(10);
    });
  });

  describe("getAgentByType()", () => {
    it("should return agent by type", () => {
      const agent = multiAgentCoordinatorEngine.getAgentByType("optimization");
      expect(agent).toBeDefined();
      expect(agent?.type).toBe("optimization");
      expect(agent?.capabilities).toContain("speed_feed_optimization");
    });

    it("should return undefined for unknown type", () => {
      const agent = multiAgentCoordinatorEngine.getAgentByType("unknown" as any);
      expect(agent).toBeUndefined();
    });
  });

  describe("getAgentsWithCapability()", () => {
    it("should find agents with specific capability", () => {
      const agents = multiAgentCoordinatorEngine.getAgentsWithCapability("tool_life_prediction");
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].type).toBe("tooling");
    });

    it("should return empty array for unknown capability", () => {
      const agents = multiAgentCoordinatorEngine.getAgentsWithCapability("unknown_capability");
      expect(agents.length).toBe(0);
    });
  });

  describe("coordinate() - parallel pattern", () => {
    it("should coordinate multiple agents in parallel", async () => {
      const request = {
        request_id: "test-parallel-001",
        task: {
          task_id: "task-001",
          description: "Calculate cutting parameters",
          input: { material: "steel", operation: "milling" },
          required_capabilities: ["kienzle_force", "speed_feed_optimization"],
          priority: "high" as const,
        },
        pattern: "parallel" as const,
        context: { material: "steel" },
      };

      const result = await multiAgentCoordinatorEngine.coordinate(request);

      expect(result.request_id).toBe("test-parallel-001");
      expect(result.status).toBeDefined();
      expect(result.agents_involved.length).toBeGreaterThan(0);
      expect(result.agent_results.length).toBeGreaterThan(0);
      expect(result.total_duration_ms).toBeGreaterThan(0);
    });

    it("should synthesize outputs from multiple agents", async () => {
      const request = {
        request_id: "test-synthesis",
        task: {
          task_id: "task-synth",
          description: "Full machining analysis",
          input: {},
          required_capabilities: [],
          priority: "medium" as const,
        },
        pattern: "parallel" as const,
        required_agents: ["physics", "optimization", "safety"] as any,
      };

      const result = await multiAgentCoordinatorEngine.coordinate(request);

      expect(result.synthesized_output).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("coordinate() - sequential pattern", () => {
    it("should execute agents sequentially", async () => {
      const request = {
        request_id: "test-sequential",
        task: {
          task_id: "task-seq",
          description: "Sequential analysis",
          input: {},
          required_capabilities: [],
          priority: "medium" as const,
        },
        pattern: "sequential" as const,
        required_agents: ["materials", "physics"] as any,
      };

      const result = await multiAgentCoordinatorEngine.coordinate(request);

      expect(result.pattern_used).toBe("sequential");
      expect(result.agent_results.length).toBe(2);
    });
  });

  describe("coordinate() - consensus pattern", () => {
    it("should calculate consensus score", async () => {
      const request = {
        request_id: "test-consensus",
        task: {
          task_id: "task-cons",
          description: "Consensus decision",
          input: {},
          required_capabilities: [],
          priority: "medium" as const,
        },
        pattern: "consensus" as const,
        required_agents: ["physics", "optimization", "quality"] as any,
        consensus_threshold: 0.7,
      };

      const result = await multiAgentCoordinatorEngine.coordinate(request);

      expect(result.consensus_score).toBeDefined();
      expect(result.consensus_score).toBeGreaterThanOrEqual(0);
      expect(result.consensus_score).toBeLessThanOrEqual(1);
    });
  });

  describe("coordinate() - hierarchical pattern", () => {
    it("should use lead agent for guidance", async () => {
      const request = {
        request_id: "test-hierarchical",
        task: {
          task_id: "task-hier",
          description: "Hierarchical coordination",
          input: {},
          required_capabilities: [],
          priority: "high" as const,
        },
        pattern: "hierarchical" as const,
        required_agents: ["safety", "physics", "optimization"] as any,
      };

      const result = await multiAgentCoordinatorEngine.coordinate(request);

      expect(result.pattern_used).toBe("hierarchical");
      // Safety agent should be lead (highest priority)
      expect(result.agent_results[0].agent_type).toBe("safety");
    });
  });

  describe("conflict detection and resolution", () => {
    it("should detect conflicts between agents", async () => {
      const request = {
        request_id: "test-conflict",
        task: {
          task_id: "task-conflict",
          description: "Potential conflict scenario",
          input: {},
          required_capabilities: [],
          priority: "high" as const,
        },
        pattern: "parallel" as const,
        required_agents: ["physics", "optimization", "safety", "tribal"] as any,
      };

      const result = await multiAgentCoordinatorEngine.coordinate(request);

      expect(result.conflicts).toBeDefined();
      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it("should resolve conflicts with appropriate strategy", async () => {
      const request = {
        request_id: "test-resolution",
        task: {
          task_id: "task-resolve",
          description: "Conflict resolution test",
          input: {},
          required_capabilities: [],
          priority: "critical" as const,
        },
        pattern: "parallel" as const,
        required_agents: ["safety", "optimization"] as any,
      };

      const result = await multiAgentCoordinatorEngine.coordinate(request);

      // Resolution may or may not be present depending on whether conflicts occurred
      if (result.conflicts.length > 0) {
        expect(result.resolution).toBeDefined();
        expect(result.resolution?.strategy).toBeDefined();
      }
    });
  });

  describe("generateMultiAgentReasoning()", () => {
    it("should generate detailed reasoning explanation", async () => {
      const request = {
        request_id: "test-reasoning",
        task: {
          task_id: "task-reason",
          description: "Reasoning generation",
          input: {},
          required_capabilities: [],
          priority: "medium" as const,
        },
        pattern: "parallel" as const,
        required_agents: ["physics", "quality"] as any,
      };

      const result = await multiAgentCoordinatorEngine.coordinate(request);
      const reasoning = multiAgentCoordinatorEngine.generateMultiAgentReasoning(result);

      expect(reasoning.coordination_summary).toBeDefined();
      expect(reasoning.agent_contributions.length).toBeGreaterThan(0);
      expect(reasoning.synthesis_approach).toBeDefined();
      expect(reasoning.confidence_breakdown).toBeDefined();
    });
  });

  describe("history management", () => {
    it("should track coordination history", async () => {
      await multiAgentCoordinatorEngine.coordinate({
        request_id: "hist-1",
        task: { task_id: "t1", description: "Test", input: {}, required_capabilities: [], priority: "low" as const },
        pattern: "parallel" as const,
      });

      const history = multiAgentCoordinatorEngine.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it("should clear history", async () => {
      await multiAgentCoordinatorEngine.coordinate({
        request_id: "clear-test",
        task: { task_id: "t1", description: "Test", input: {}, required_capabilities: [], priority: "low" as const },
        pattern: "parallel" as const,
      });

      multiAgentCoordinatorEngine.clearHistory();
      const history = multiAgentCoordinatorEngine.getHistory();
      expect(history.length).toBe(0);
    });
  });
});

// ============================================================================
// SCIENTIFIC REASONING ENGINE TESTS
// ============================================================================

describe("ScientificReasoningEngine", () => {
  let scientificReasoningEngine: typeof import("../engines/ScientificReasoningEngine.js")["scientificReasoningEngine"];

  beforeEach(async () => {
    const mod = await import("../engines/ScientificReasoningEngine.js");
    scientificReasoningEngine = mod.scientificReasoningEngine;
  });

  describe("getDimension()", () => {
    it("should return correct dimension for force unit", () => {
      const dim = scientificReasoningEngine.getDimension("N");
      expect(dim.L).toBe(1);
      expect(dim.M).toBe(1);
      expect(dim.T).toBe(-2);
    });

    it("should return correct dimension for power unit", () => {
      const dim = scientificReasoningEngine.getDimension("W");
      expect(dim.L).toBe(2);
      expect(dim.M).toBe(1);
      expect(dim.T).toBe(-3);
    });

    it("should return dimensionless for unknown unit", () => {
      const dim = scientificReasoningEngine.getDimension("unknown");
      expect(dim.L).toBe(0);
      expect(dim.M).toBe(0);
      expect(dim.T).toBe(0);
    });
  });

  describe("checkDimensionalConsistency()", () => {
    it("should validate matching dimensions", () => {
      const forceDim = { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };
      const left = { value: 100, unit: "N", dimension: forceDim };
      const right = { value: 100, unit: "N", dimension: forceDim };

      const result = scientificReasoningEngine.checkDimensionalConsistency(left, right);
      expect(result.valid).toBe(true);
    });

    it("should detect mismatched dimensions", () => {
      const forceDim = { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };
      const lengthDim = { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };

      const left = { value: 100, unit: "N", dimension: forceDim };
      const right = { value: 10, unit: "mm", dimension: lengthDim };

      const result = scientificReasoningEngine.checkDimensionalConsistency(left, right);
      expect(result.valid).toBe(false);
      expect(result.mismatch).toBeDefined();
    });
  });

  describe("multiplyDimensions()", () => {
    it("should correctly multiply dimensions (F × v = P)", () => {
      const forceDim = { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };
      const velocityDim = { L: 1, M: 0, T: -1, I: 0, Θ: 0, N: 0, J: 0 };

      const result = scientificReasoningEngine.multiplyDimensions(forceDim, velocityDim);

      // F × v should give Power: M L² T⁻³
      expect(result.L).toBe(2);
      expect(result.M).toBe(1);
      expect(result.T).toBe(-3);
    });
  });

  describe("divideDimensions()", () => {
    it("should correctly divide dimensions (F / A = σ)", () => {
      const forceDim = { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };
      const areaDim = { L: 2, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };

      const result = scientificReasoningEngine.divideDimensions(forceDim, areaDim);

      // F / A should give Stress: M L⁻¹ T⁻²
      expect(result.L).toBe(-1);
      expect(result.M).toBe(1);
      expect(result.T).toBe(-2);
    });
  });

  describe("validateFormula()", () => {
    it("should validate Kienzle force formula", () => {
      const inputs = {
        kc: { value: 1800, unit: "N/mm²", dimension: { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 } },
        ap: { value: 2, unit: "mm", dimension: { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 } },
        fz: { value: 0.1, unit: "mm", dimension: { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 } },
      };
      const output = {
        value: 500,
        unit: "N",
        dimension: { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
      };

      const result = scientificReasoningEngine.validateFormula("kienzle_force", inputs, output);

      expect(result.formula_id).toBe("kienzle_force");
      expect(result.dimensional_check.valid).toBe(true);
    });

    it("should detect range violations", () => {
      const inputs = {
        Vc: { value: 2000, unit: "m/min", dimension: { L: 1, M: 0, T: -1, I: 0, Θ: 0, N: 0, J: 0 } }, // Way too high
      };
      const output = {
        value: 100,
        unit: "",
        dimension: { L: 0, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 },
      };

      const result = scientificReasoningEngine.validateFormula("kienzle_force", inputs, output);

      expect(result.range_check.out_of_range_params.length).toBeGreaterThan(0);
    });

    it("should return invalid for unknown formula", () => {
      const result = scientificReasoningEngine.validateFormula("unknown_formula", {}, {
        value: 0,
        unit: "",
        dimension: { L: 0, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 },
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("reason()", () => {
    it("should perform scientific reasoning for Kienzle force", () => {
      const inputs = {
        kc: { value: 1800, unit: "N/mm²", dimension: { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 } },
        ap: { value: 2, unit: "mm", dimension: { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 } },
        fz: { value: 0.1, unit: "mm", dimension: { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 } },
        mc: { value: 0.25, unit: "", dimension: { L: 0, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 } },
      };

      const result = scientificReasoningEngine.reason(
        "Calculate cutting force for steel roughing",
        inputs,
        "kienzle_force"
      );

      expect(result.problem_statement).toContain("cutting force");
      expect(result.principles_used.length).toBeGreaterThan(0);
      expect(result.intermediate_steps.length).toBeGreaterThan(0);
      expect(result.final_result.value).toBeGreaterThan(0);
      expect(result.final_result.unit).toBe("N");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should include uncertainty analysis", () => {
      const inputs = {
        F: { value: 100, unit: "N", uncertainty: 5, dimension: { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 } },
        L: { value: 50, unit: "mm", uncertainty: 0.5, dimension: { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 } },
        E: { value: 210000, unit: "MPa", dimension: { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 } },
        I: { value: 100, unit: "mm⁴", dimension: { L: 4, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 } },
      };

      const result = scientificReasoningEngine.reason(
        "Calculate tool deflection",
        inputs,
        "deflection_cantilever"
      );

      expect(result.uncertainty_analysis).toBeDefined();
      expect(result.uncertainty_analysis.method).toBe("RSS");
      expect(result.uncertainty_analysis.dominant_contributors.length).toBeGreaterThan(0);
    });

    it("should identify caveats", () => {
      const inputs = {
        kc: { value: 1800, unit: "N/mm²", dimension: { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 } },
        ap: { value: 2, unit: "mm", dimension: { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 } },
        fz: { value: 0.1, unit: "mm", dimension: { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 } },
      };

      const result = scientificReasoningEngine.reason(
        "Calculate force",
        inputs,
        "kienzle_force"
      );

      expect(result.caveats.length).toBeGreaterThan(0);
    });
  });

  describe("reasonMaterial()", () => {
    it("should analyze steel material", () => {
      const result = scientificReasoningEngine.reasonMaterial("4140 steel", {});

      expect(result.material).toBe("4140 steel");
      expect(result.iso_group).toBe("P");
      expect(result.properties_used.length).toBeGreaterThan(0);
      expect(result.machining_implications.length).toBeGreaterThan(0);
    });

    it("should analyze titanium with work hardening concerns", () => {
      const result = scientificReasoningEngine.reasonMaterial("Ti-6Al-4V titanium", {});

      expect(result.iso_group).toBe("S");
      expect(result.behavior_predictions.length).toBeGreaterThan(0);
      expect(result.thermal_considerations.length).toBeGreaterThan(0);
    });

    it("should analyze stainless steel with work hardening", () => {
      const result = scientificReasoningEngine.reasonMaterial("304 stainless", {});

      expect(result.iso_group).toBe("M");
      expect(result.work_hardening_analysis).toBeDefined();
    });

    it("should analyze hardened tool steel", () => {
      const result = scientificReasoningEngine.reasonMaterial("D2 tool steel", {});

      expect(result.iso_group).toBe("H");
      expect(result.properties_used.some(p => p.property === "Hardness")).toBe(true);
    });

    it("should analyze aluminum", () => {
      const result = scientificReasoningEngine.reasonMaterial("6061-T6 aluminum", {});

      expect(result.iso_group).toBe("N");
      expect(result.behavior_predictions.some(b => b.includes("machinability"))).toBe(true);
    });
  });

  describe("reasonThermal()", () => {
    it("should analyze thermal conditions for steel cutting", () => {
      const result = scientificReasoningEngine.reasonThermal(
        { Vc_mpm: 200, fz_mm: 0.15, ap_mm: 2, material: "steel" },
        "flood"
      );

      expect(result.heat_sources.length).toBeGreaterThan(0);
      expect(result.heat_sinks.length).toBeGreaterThan(0);
      expect(result.temperature_predictions.length).toBeGreaterThan(0);
      expect(["none", "low", "medium", "high"]).toContain(result.thermal_damage_risk);
    });

    it("should show higher thermal risk for titanium", () => {
      const steelResult = scientificReasoningEngine.reasonThermal(
        { Vc_mpm: 50, fz_mm: 0.1, ap_mm: 1, material: "steel" },
        "flood"
      );

      const titaniumResult = scientificReasoningEngine.reasonThermal(
        { Vc_mpm: 50, fz_mm: 0.1, ap_mm: 1, material: "titanium" },
        "flood"
      );

      // Titanium should have higher temperatures due to low thermal conductivity
      const steelMaxTemp = Math.max(...steelResult.temperature_predictions.map(p => p.temperature_C));
      const titaniumMaxTemp = Math.max(...titaniumResult.temperature_predictions.map(p => p.temperature_C));

      expect(titaniumMaxTemp).toBeGreaterThan(steelMaxTemp);
    });

    it("should recommend through-tool coolant for difficult materials", () => {
      const result = scientificReasoningEngine.reasonThermal(
        { Vc_mpm: 60, fz_mm: 0.1, ap_mm: 2, material: "inconel" },
        "none"
      );

      // High thermal damage risk should trigger recommendations
      if (result.thermal_damage_risk === "high") {
        expect(result.cooling_recommendations.length).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// AGENT WORKFLOW ENGINE TESTS
// ============================================================================

describe("AgentWorkflowEngine", () => {
  let agentWorkflowEngine: typeof import("../engines/AgentWorkflowEngine.js")["agentWorkflowEngine"];

  beforeEach(async () => {
    const mod = await import("../engines/AgentWorkflowEngine.js");
    agentWorkflowEngine = mod.agentWorkflowEngine;
    agentWorkflowEngine.clearCompleted();
  });

  describe("getWorkflows()", () => {
    it("should return available workflow templates", () => {
      const workflows = agentWorkflowEngine.getWorkflows();
      expect(workflows.length).toBeGreaterThan(0);
    });

    it("should include quote-to-ship workflow", () => {
      const workflows = agentWorkflowEngine.getWorkflows();
      const quoteWorkflow = workflows.find(w => w.workflow_id === "quote-to-ship");
      expect(quoteWorkflow).toBeDefined();
      expect(quoteWorkflow?.steps.length).toBeGreaterThan(5);
    });

    it("should include program-generation workflow", () => {
      const workflows = agentWorkflowEngine.getWorkflows();
      const programWorkflow = workflows.find(w => w.workflow_id === "program-generation");
      expect(programWorkflow).toBeDefined();
    });
  });

  describe("getWorkflow()", () => {
    it("should return specific workflow by ID", () => {
      const workflow = agentWorkflowEngine.getWorkflow("quote-to-ship");
      expect(workflow).toBeDefined();
      expect(workflow?.name).toBe("Quote to Ship");
    });

    it("should return undefined for unknown workflow", () => {
      const workflow = agentWorkflowEngine.getWorkflow("unknown-workflow");
      expect(workflow).toBeUndefined();
    });
  });

  describe("startWorkflow()", () => {
    it("should start a workflow instance", async () => {
      const instance = await agentWorkflowEngine.startWorkflow(
        "program-generation",
        { part_number: "TEST-001", material: "aluminum" },
        { dry_run: true }
      );

      expect(instance.instance_id).toBeDefined();
      expect(instance.workflow_id).toBe("program-generation");
      expect(instance.started_at).toBeDefined();
    });

    it("should create a long-horizon plan", async () => {
      const instance = await agentWorkflowEngine.startWorkflow(
        "quote-to-ship",
        { customer: "TEST" },
        { dry_run: true }
      );

      expect(instance.plan).toBeDefined();
      expect(instance.plan?.goal.type).toBe("quote");
    });

    it("should throw for unknown workflow", async () => {
      await expect(
        agentWorkflowEngine.startWorkflow("unknown", {})
      ).rejects.toThrow("Workflow not found");
    });

    it("should initialize metrics", async () => {
      const instance = await agentWorkflowEngine.startWorkflow(
        "program-generation",
        {},
        { dry_run: true }
      );

      expect(instance.metrics.total_steps).toBeGreaterThan(0);
      expect(instance.metrics.completed_steps).toBe(0);
    });
  });

  describe("getInstance()", () => {
    it("should retrieve running instance", async () => {
      const started = await agentWorkflowEngine.startWorkflow(
        "optimization-loop",
        {},
        { dry_run: true }
      );

      const retrieved = agentWorkflowEngine.getInstance(started.instance_id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.instance_id).toBe(started.instance_id);
    });
  });

  describe("cancelInstance()", () => {
    it("should cancel a running instance", async () => {
      const instance = await agentWorkflowEngine.startWorkflow(
        "program-generation",
        {},
        { dry_run: true }
      );

      const cancelled = agentWorkflowEngine.cancelInstance(instance.instance_id);
      expect(cancelled).toBe(true);

      const retrieved = agentWorkflowEngine.getInstance(instance.instance_id);
      expect(retrieved).toBeUndefined(); // Moved to completed
    });

    it("should return false for unknown instance", () => {
      const result = agentWorkflowEngine.cancelInstance("unknown-id");
      expect(result).toBe(false);
    });
  });

  describe("analyzePerformance()", () => {
    it("should return performance metrics", () => {
      const analysis = agentWorkflowEngine.analyzePerformance("quote-to-ship");

      expect(analysis.total_executions).toBeGreaterThanOrEqual(0);
      expect(analysis.success_rate).toBeGreaterThanOrEqual(0);
      expect(analysis.success_rate).toBeLessThanOrEqual(1);
    });
  });

  describe("registerWorkflow()", () => {
    it("should register custom workflow", () => {
      const custom = {
        workflow_id: "custom-test",
        name: "Custom Test Workflow",
        description: "Test workflow",
        type: "custom" as const,
        triggers: [],
        steps: [
          {
            step_id: "step-1",
            name: "Test Step",
            type: "action" as const,
            auto_approve: true,
            on_failure: "abort" as const,
            depends_on: [],
          },
        ],
        checkpoints: [],
        timeout_ms: 60000,
        auto_approval_threshold: 0.8,
        max_retries: 1,
      };

      agentWorkflowEngine.registerWorkflow(custom);

      const retrieved = agentWorkflowEngine.getWorkflow("custom-test");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Custom Test Workflow");
    });
  });
});
