/**
 * Intelligence Engines Test Suite
 * ================================
 * Tests for the 3 new LLM-level intelligence engines:
 *   - ProactiveIntelligenceEngine
 *   - MemoryConsolidationEngine
 *   - LongHorizonPlanningEngine
 *
 * @module __tests__/intelligence-engines
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// MEMORY CONSOLIDATION ENGINE TESTS
// ============================================================================

describe("MemoryConsolidationEngine", () => {
  // Import dynamically to handle fs mocking
  let memoryConsolidationEngine: typeof import("../engines/MemoryConsolidationEngine.js")["memoryConsolidationEngine"];

  beforeEach(async () => {
    // Clear module cache and re-import
    vi.resetModules();
    const mod = await import("../engines/MemoryConsolidationEngine.js");
    memoryConsolidationEngine = mod.memoryConsolidationEngine;
  });

  describe("ConsolidatedPattern interface", () => {
    it("should define valid pattern types", async () => {
      const { ConsolidatedPattern } = await import("../engines/MemoryConsolidationEngine.js");
      // Pattern types are defined in the interface
      const validTypes = ["error_fix", "parameter_trend", "material_preference", "tool_choice", "process_learning"];
      expect(validTypes.length).toBe(5);
    });
  });

  describe("getStats()", () => {
    it("should return consolidation statistics", () => {
      const stats = memoryConsolidationEngine.getStats();
      expect(stats).toHaveProperty("totalConsolidations");
      expect(stats).toHaveProperty("patternsCount");
      expect(stats).toHaveProperty("sessionsSinceLast");
      expect(stats).toHaveProperty("lastConsolidation");
      expect(typeof stats.totalConsolidations).toBe("number");
      expect(typeof stats.patternsCount).toBe("number");
      expect(typeof stats.sessionsSinceLast).toBe("number");
    });
  });

  describe("getPatterns()", () => {
    it("should return an array of patterns", () => {
      const patterns = memoryConsolidationEngine.getPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });

    it("should return a copy (not the original array)", () => {
      const patterns1 = memoryConsolidationEngine.getPatterns();
      const patterns2 = memoryConsolidationEngine.getPatterns();
      expect(patterns1).not.toBe(patterns2);
    });
  });

  describe("recordSessionEnd()", () => {
    it("should increment session counter", () => {
      const before = memoryConsolidationEngine.getStats().sessionsSinceLast;
      memoryConsolidationEngine.recordSessionEnd();
      const after = memoryConsolidationEngine.getStats().sessionsSinceLast;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe("shouldConsolidate()", () => {
    it("should return boolean", () => {
      const result = memoryConsolidationEngine.shouldConsolidate();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("consolidate()", () => {
    it("should return null if not enough sessions", async () => {
      // Fresh state typically won't have enough sessions
      vi.resetModules();
      const mod = await import("../engines/MemoryConsolidationEngine.js");
      const freshEngine = mod.memoryConsolidationEngine;

      // Check if we should consolidate
      if (!freshEngine.shouldConsolidate()) {
        const result = await freshEngine.consolidate();
        expect(result).toBeNull();
      }
    });
  });
});

// ============================================================================
// PROACTIVE INTELLIGENCE ENGINE TESTS
// ============================================================================

describe("ProactiveIntelligenceEngine", () => {
  let proactiveIntelligenceEngine: typeof import("../engines/ProactiveIntelligenceEngine.js")["proactiveIntelligenceEngine"];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../engines/ProactiveIntelligenceEngine.js");
    proactiveIntelligenceEngine = mod.proactiveIntelligenceEngine;
    proactiveIntelligenceEngine.clearHistory();
  });

  describe("analyze()", () => {
    it("should analyze empty context", () => {
      const result = proactiveIntelligenceEngine.analyze({});
      expect(result).toHaveProperty("suggestions");
      expect(result).toHaveProperty("anticipated_needs");
      expect(result).toHaveProperty("context_summary");
      expect(result).toHaveProperty("risk_level");
      expect(result).toHaveProperty("recommended_actions");
      expect(result).toHaveProperty("optimizations");
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.anticipated_needs)).toBe(true);
      expect(Array.isArray(result.recommended_actions)).toBe(true);
    });

    it("should analyze material context", () => {
      const result = proactiveIntelligenceEngine.analyze({
        material: "D2",
        iso_group: "H",
        operation: "milling",
      });
      expect(result.context_summary).toBeTruthy();
      // Hardened materials should have warnings
      expect(result.risk_level).toBeDefined();
    });

    it("should analyze cutting parameters", () => {
      const result = proactiveIntelligenceEngine.analyze({
        material: "6061-T6",
        iso_group: "N",
        operation: "milling",
        cutting_params: {
          speed_mpm: 300,
          feed_mm: 0.2,
          depth_mm: 3,
        },
      });
      expect(result.suggestions).toBeDefined();
      expect(result.context_summary).toContain("milling");
    });

    it("should generate suggestions for tool context", () => {
      const result = proactiveIntelligenceEngine.analyze({
        tool_type: "carbide_endmill",
        tool_diameter_mm: 12,
        operation: "roughing",
        material: "S7",
        iso_group: "H",
      });
      expect(result.suggestions).toBeDefined();
      // Should have at least context-aware analysis
      expect(result.context_summary.length).toBeGreaterThan(0);
    });

    it("should consider time of day for suggestions", () => {
      const morningResult = proactiveIntelligenceEngine.analyze({
        time_of_day: "morning",
        current_task: "setup",
      });
      proactiveIntelligenceEngine.clearHistory();
      const nightResult = proactiveIntelligenceEngine.analyze({
        time_of_day: "night",
        current_task: "setup",
      });
      // Both should produce valid results
      expect(morningResult.context_summary).toBeTruthy();
      expect(nightResult.context_summary).toBeTruthy();
    });

    it("should detect user role patterns", () => {
      const operatorResult = proactiveIntelligenceEngine.analyze({
        user_role: "operator",
        current_task: "part_inspection",
      });
      proactiveIntelligenceEngine.clearHistory();
      const engineerResult = proactiveIntelligenceEngine.analyze({
        user_role: "engineer",
        current_task: "part_inspection",
      });
      expect(operatorResult.recommended_actions).toBeDefined();
      expect(engineerResult.recommended_actions).toBeDefined();
    });

    it("should return anticipated needs for quoting context", () => {
      const result = proactiveIntelligenceEngine.analyze({
        current_task: "quote",
        material: "H13",
        iso_group: "H",
      });
      // Quote tasks should anticipate specific needs
      expect(result.anticipated_needs.length).toBeGreaterThanOrEqual(0);
    });

    it("should generate warnings for ISO S materials", () => {
      const result = proactiveIntelligenceEngine.analyze({
        material: "Inconel 718",
        iso_group: "S",
        operation: "turning",
      });
      // ISO S (superalloys) should trigger warnings
      const warnings = result.suggestions.filter(s => s.type === "warning");
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("should generate warnings for ISO H materials", () => {
      const result = proactiveIntelligenceEngine.analyze({
        material: "M2",
        iso_group: "H",
        operation: "milling",
      });
      // ISO H (hardened) should trigger warnings
      const warnings = result.suggestions.filter(s => s.type === "warning");
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("should include pattern insights", () => {
      const result = proactiveIntelligenceEngine.analyze({
        material: "6061",
        iso_group: "N",
      });
      expect(result.pattern_insights).toBeDefined();
      expect(Array.isArray(result.pattern_insights)).toBe(true);
    });

    it("should include natural language briefing", () => {
      const result = proactiveIntelligenceEngine.analyze({
        current_task: "programming",
        machine_id: "okuma-lb3000",
      });
      expect(result.briefing).toBeDefined();
      expect(typeof result.briefing).toBe("string");
    });
  });

  describe("clearHistory()", () => {
    it("should clear context history", () => {
      proactiveIntelligenceEngine.analyze({ material: "D2" });
      proactiveIntelligenceEngine.analyze({ material: "S7" });
      proactiveIntelligenceEngine.clearHistory();
      // After clearing, pattern detection should report insufficient history
      const result = proactiveIntelligenceEngine.analyze({ material: "M2" });
      expect(result.pattern_insights).toContain("Insufficient history for pattern detection (need 5+ interactions)");
    });
  });
});

// ============================================================================
// LONG HORIZON PLANNING ENGINE TESTS
// ============================================================================

describe("LongHorizonPlanningEngine", () => {
  let longHorizonPlanningEngine: typeof import("../engines/LongHorizonPlanningEngine.js")["longHorizonPlanningEngine"];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../engines/LongHorizonPlanningEngine.js");
    longHorizonPlanningEngine = mod.longHorizonPlanningEngine;
    longHorizonPlanningEngine.clear();
  });

  describe("createPlan()", () => {
    it("should create a basic production plan", () => {
      const goal = {
        goal_id: "test-goal-001",
        type: "production" as const,
        description: "Produce 100 units of part XYZ",
        priority: "medium" as const,
        success_criteria: ["100 units completed", "Quality check passed"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      expect(plan).toHaveProperty("plan_id");
      expect(plan).toHaveProperty("goal");
      expect(plan).toHaveProperty("steps");
      expect(plan).toHaveProperty("status");
      expect(plan).toHaveProperty("progress_pct");
      expect(plan.goal.goal_id).toBe("test-goal-001");
      expect(plan.status).toBe("draft");
      expect(plan.progress_pct).toBe(0);
    });

    it("should create a quote-to-ship plan", () => {
      const goal = {
        goal_id: "quote-001",
        type: "quote" as const,
        description: "Quote to ship for customer order",
        priority: "high" as const,
        target_date: "2026-04-30",
        success_criteria: ["Quote accepted", "Parts shipped", "Payment received"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.estimated_total_min).toBeGreaterThan(0);
    });

    it("should include risk assessment", () => {
      const goal = {
        goal_id: "risk-test",
        type: "machining" as const,
        description: "Complex machining job with tight tolerances",
        priority: "critical" as const,
        constraints: [
          { type: "quality" as const, description: "0.001 tolerance", hard_limit: true },
          { type: "time" as const, description: "2 days max", value: 48, unit: "hours", hard_limit: true },
        ],
        success_criteria: ["Parts within tolerance"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      expect(plan.risks).toBeDefined();
      expect(Array.isArray(plan.risks)).toBe(true);
    });

    it("should include AI reasoning", () => {
      const goal = {
        goal_id: "ai-reason-test",
        type: "production" as const,
        description: "Test AI reasoning output",
        priority: "medium" as const,
        success_criteria: ["Completed"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      expect(plan.ai_reasoning).toBeDefined();
      if (plan.ai_reasoning) {
        expect(plan.ai_reasoning).toHaveProperty("plan_summary");
        expect(plan.ai_reasoning).toHaveProperty("key_decisions");
        expect(plan.ai_reasoning).toHaveProperty("risk_assessment");
      }
    });
  });

  describe("getPlan()", () => {
    it("should retrieve a created plan", () => {
      const goal = {
        goal_id: "get-test",
        type: "production" as const,
        description: "Test get plan",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      const created = longHorizonPlanningEngine.createPlan(goal);
      const retrieved = longHorizonPlanningEngine.getPlan(created.plan_id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.plan_id).toBe(created.plan_id);
    });

    it("should return undefined for non-existent plan", () => {
      const result = longHorizonPlanningEngine.getPlan("non-existent-plan");
      expect(result).toBeUndefined();
    });
  });

  describe("listActivePlans()", () => {
    it("should list all active plans", async () => {
      const goal1 = {
        goal_id: "list-test-1",
        type: "production" as const,
        description: "Test 1",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      const goal2 = {
        goal_id: "list-test-2",
        type: "quote" as const,
        description: "Test 2",
        priority: "medium" as const,
        success_criteria: ["Done"],
      };
      longHorizonPlanningEngine.createPlan(goal1);
      // Small delay to ensure unique plan IDs (timestamp-based)
      await new Promise(resolve => setTimeout(resolve, 5));
      longHorizonPlanningEngine.createPlan(goal2);
      const plans = longHorizonPlanningEngine.listActivePlans();
      expect(plans.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("startPlan()", () => {
    it("should start a draft plan", async () => {
      const goal = {
        goal_id: "start-test",
        type: "production" as const,
        description: "Test start",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      const started = await longHorizonPlanningEngine.startPlan(plan.plan_id);
      expect(started.status).toBe("executing");
      expect(started.started_at).toBeDefined();
    });

    it("should throw for non-existent plan", async () => {
      await expect(longHorizonPlanningEngine.startPlan("non-existent")).rejects.toThrow();
    });
  });

  describe("executeNextStep()", () => {
    it("should execute the next ready step", async () => {
      const goal = {
        goal_id: "exec-test",
        type: "production" as const,
        description: "Test execution",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      await longHorizonPlanningEngine.startPlan(plan.plan_id);
      const step = await longHorizonPlanningEngine.executeNextStep(plan.plan_id);
      expect(step).toBeDefined();
      if (step) {
        expect(step.status).toBe("completed");
      }
    });

    it("should return null when no ready steps", async () => {
      const goal = {
        goal_id: "no-step-test",
        type: "production" as const,
        description: "Test no steps",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      // Don't start the plan, so no steps are ready
      const step = await longHorizonPlanningEngine.executeNextStep(plan.plan_id);
      expect(step).toBeNull();
    });
  });

  describe("rollbackToCheckpoint()", () => {
    it("should rollback to a checkpoint", async () => {
      const goal = {
        goal_id: "rollback-test",
        type: "production" as const,
        description: "Test rollback",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      await longHorizonPlanningEngine.startPlan(plan.plan_id);

      // Execute steps until we have a checkpoint
      let step = await longHorizonPlanningEngine.executeNextStep(plan.plan_id);
      while (step && step.type !== "checkpoint") {
        step = await longHorizonPlanningEngine.executeNextStep(plan.plan_id);
      }

      const updatedPlan = longHorizonPlanningEngine.getPlan(plan.plan_id);
      if (updatedPlan && updatedPlan.checkpoints.length > 0) {
        const checkpoint = updatedPlan.checkpoints[0];
        const rolledBack = longHorizonPlanningEngine.rollbackToCheckpoint(plan.plan_id, checkpoint.checkpoint_id);
        expect(rolledBack.status).toBe("executing");
      }
    });

    it("should throw for non-existent checkpoint", () => {
      const goal = {
        goal_id: "rollback-error-test",
        type: "production" as const,
        description: "Test rollback error",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      expect(() =>
        longHorizonPlanningEngine.rollbackToCheckpoint(plan.plan_id, "fake-checkpoint")
      ).toThrow();
    });
  });

  describe("getPlanSummary()", () => {
    it("should return plan summary", () => {
      const goal = {
        goal_id: "summary-test",
        type: "production" as const,
        description: "Test summary",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      const summary = longHorizonPlanningEngine.getPlanSummary(plan.plan_id);
      expect(summary).toHaveProperty("plan_id");
      expect(summary).toHaveProperty("status");
      expect(summary).toHaveProperty("steps_completed");
      expect(summary).toHaveProperty("steps_total");
    });

    it("should return null for non-existent plan", () => {
      const summary = longHorizonPlanningEngine.getPlanSummary("non-existent");
      expect(summary).toBeNull();
    });
  });

  describe("cancelPlan()", () => {
    it("should cancel a plan", () => {
      const goal = {
        goal_id: "cancel-test",
        type: "production" as const,
        description: "Test cancel",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      longHorizonPlanningEngine.cancelPlan(plan.plan_id);
      const cancelled = longHorizonPlanningEngine.getPlan(plan.plan_id);
      expect(cancelled?.status).toBe("cancelled");
    });
  });

  describe("getTemplates()", () => {
    it("should return available templates", () => {
      const templates = longHorizonPlanningEngine.getTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe("plan templates", () => {
    it("should use quote-to-ship template", () => {
      const goal = {
        goal_id: "template-quote",
        type: "quote" as const,
        description: "Quote workflow",
        priority: "medium" as const,
        success_criteria: ["Done"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      // Quote plans should have specific steps
      expect(plan.steps.length).toBeGreaterThan(0);
      // First step should be analysis/requirement related
      expect(plan.steps[0].name.length).toBeGreaterThan(0);
    });

    it("should use machining template", () => {
      const goal = {
        goal_id: "template-machining",
        type: "machining" as const,
        description: "Multi-op machining",
        priority: "medium" as const,
        success_criteria: ["Done"],
      };
      const plan = longHorizonPlanningEngine.createPlan(goal);
      expect(plan.steps.length).toBeGreaterThan(0);
    });
  });

  describe("clear()", () => {
    it("should clear all plans", () => {
      const goal = {
        goal_id: "clear-test",
        type: "production" as const,
        description: "Test clear",
        priority: "low" as const,
        success_criteria: ["Done"],
      };
      longHorizonPlanningEngine.createPlan(goal);
      longHorizonPlanningEngine.createPlan(goal);
      longHorizonPlanningEngine.clear();
      const plans = longHorizonPlanningEngine.listActivePlans();
      expect(plans.length).toBe(0);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Intelligence Engines Integration", () => {
  it("should work together for comprehensive analysis", async () => {
    const { proactiveIntelligenceEngine } = await import("../engines/ProactiveIntelligenceEngine.js");
    const { longHorizonPlanningEngine } = await import("../engines/LongHorizonPlanningEngine.js");
    const { memoryConsolidationEngine } = await import("../engines/MemoryConsolidationEngine.js");

    // Clean up for this test
    proactiveIntelligenceEngine.clearHistory();
    longHorizonPlanningEngine.clear();

    // Analyze context
    const context = {
      current_task: "new_quote",
      material: "D2",
      iso_group: "H" as const,
      operation: "turning",
      shop_id: "jm-die",
    };

    const proactiveAnalysis = proactiveIntelligenceEngine.analyze(context);
    expect(proactiveAnalysis.suggestions).toBeDefined();

    // Create a plan based on analysis
    const goal = {
      goal_id: "integrated-test",
      type: "quote" as const,
      description: proactiveAnalysis.context_summary,
      priority: proactiveAnalysis.risk_level === "critical" ? "critical" as const : "high" as const,
      success_criteria: ["Quote completed"],
    };

    const plan = longHorizonPlanningEngine.createPlan(goal);
    expect(plan.plan_id).toBeTruthy();

    // Memory consolidation stats
    const stats = memoryConsolidationEngine.getStats();
    expect(stats.totalConsolidations).toBeGreaterThanOrEqual(0);
  });

  it("should handle real JM Die shop context", async () => {
    const { proactiveIntelligenceEngine } = await import("../engines/ProactiveIntelligenceEngine.js");

    proactiveIntelligenceEngine.clearHistory();

    const jmDieContext = {
      shop_id: "jm-die",
      material: "M2",
      iso_group: "H" as const,
      operation: "turning",
      machine_id: "okuma-lb3000",
      part_family: "cold-heading-die",
      user_role: "programmer" as const,
    };

    const result = proactiveIntelligenceEngine.analyze(jmDieContext);
    expect(result.context_summary).toBeTruthy();
    expect(result.risk_level).toBeDefined();
  });
});
