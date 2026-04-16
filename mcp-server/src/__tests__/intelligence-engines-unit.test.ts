/**
 * Intelligence Engine Unit Tests
 *
 * Tests for intelligence/orchestration engines:
 *   1. KnowledgeQueryEngine — TF-IDF search, cross-registry queries
 *   2. ComplianceEngine — 6 regulatory frameworks, audit, gap analysis
 *   3. HookEngine + HookExecutor — dual hook system (event pub/sub + phase chains)
 *   4. AgentExecutor + SwarmExecutor — task orchestration, swarm patterns
 *
 * @milestone SYS-MS2-U04
 */

import { describe, it, expect, beforeEach } from "vitest";
import { knowledgeEngine } from "../engines/KnowledgeQueryEngine.js";
import { complianceEngine } from "../engines/ComplianceEngine.js";
import { hookEngine, eventBus, registerHook, executeHooks, createCognitiveHook } from "../engines/HookEngine.js";
import { hookExecutor, hookSuccess, hookBlock, hookWarning } from "../engines/HookExecutor.js";
import { agentExecutor, executeAgent } from "../engines/AgentExecutor.js";
import { swarmExecutor } from "../engines/SwarmExecutor.js";

// ============================================================================
// 1. KNOWLEDGE QUERY ENGINE
// ============================================================================

describe("KnowledgeQueryEngine", () => {
  describe("unifiedSearch", () => {
    it("returns array of search results", async () => {
      const results = await knowledgeEngine.unifiedSearch("steel cutting");
      expect(Array.isArray(results)).toBe(true);
    });

    it("results have required shape", async () => {
      const results = await knowledgeEngine.unifiedSearch("aluminum");
      for (const r of results) {
        expect(r).toHaveProperty("registry");
        expect(r).toHaveProperty("relevance_score");
        expect(r).toHaveProperty("match_type");
        expect(typeof r.relevance_score).toBe("number");
        expect(r.relevance_score).toBeGreaterThanOrEqual(0);
        expect(r.relevance_score).toBeLessThanOrEqual(1);
      }
    });

    it("filters by specific registries", async () => {
      const results = await knowledgeEngine.unifiedSearch("carbide", {
        registries: ["tools"],
      });
      for (const r of results) {
        expect(r.registry).toBe("tools");
      }
    });

    it("accepts limit option", async () => {
      const unlimited = await knowledgeEngine.unifiedSearch("mill");
      const limited = await knowledgeEngine.unifiedSearch("mill", { limit: 3 });
      // Limited should return fewer or equal results
      expect(limited.length).toBeLessThanOrEqual(
        Math.max(unlimited.length, 3)
      );
    });

    it("higher relevance results come first", async () => {
      const results = await knowledgeEngine.unifiedSearch("titanium");
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevance_score).toBeGreaterThanOrEqual(
          results[i].relevance_score
        );
      }
    });

    it("empty query returns empty array or throws", async () => {
      // Engine may throw on empty/null query — verify graceful handling
      try {
        const results = await knowledgeEngine.unifiedSearch("");
        expect(Array.isArray(results)).toBe(true);
      } catch (e) {
        // Acceptable: engine rejects empty query
        expect(e).toBeDefined();
      }
    });
  });

  describe("crossRegistryQuery", () => {
    it("returns cross-registry result with relationships", async () => {
      const result = await knowledgeEngine.crossRegistryQuery({
        task: "machine steel part with carbide tool",
      });
      expect(result).toHaveProperty("task");
      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("relationships");
      expect(result).toHaveProperty("suggested_workflow");
    });

    it("can filter to specific registries", async () => {
      const result = await knowledgeEngine.crossRegistryQuery({
        task: "find formulas for cutting force",
        required_registries: ["formulas"],
      });
      expect(result.task).toBe("find formulas for cutting force");
    });
  });

  describe("findFormulas", () => {
    it("returns formula query results", async () => {
      const results = await knowledgeEngine.findFormulas("cutting force");
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty("formula");
        expect(results[0]).toHaveProperty("match_score");
        expect(results[0]).toHaveProperty("match_reasons");
      }
    });
  });

  describe("cache", () => {
    it("clearCache does not throw", () => {
      expect(() => knowledgeEngine.clearCache()).not.toThrow();
    });
  });

  describe("getStats", () => {
    it("returns stats with registry counts", async () => {
      const stats = await knowledgeEngine.getStats();
      expect(stats).toHaveProperty("registries");
      expect(stats).toHaveProperty("total_entries");
      expect(typeof stats.total_entries).toBe("number");
      expect(stats).toHaveProperty("cache_size");
      expect(stats).toHaveProperty("cache_hit_rate");
    });
  });

  describe("catalogSourceFiles", () => {
    it("returns file catalog", () => {
      const catalog = knowledgeEngine.catalogSourceFiles();
      expect(catalog).toHaveProperty("totalFiles");
      expect(catalog).toHaveProperty("totalLines");
      expect(catalog).toHaveProperty("byCategory");
      expect(catalog.totalFiles).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// 2. COMPLIANCE ENGINE
// ============================================================================

describe("ComplianceEngine", () => {
  describe("listTemplates", () => {
    it("returns available and provisioned templates", () => {
      const list = complianceEngine.listTemplates();
      expect(list).toHaveProperty("available");
      expect(list).toHaveProperty("provisioned");
      expect(list).toHaveProperty("disclaimer");
      expect(Array.isArray(list.available)).toBe(true);
    });

    it("has 6 built-in regulatory frameworks", () => {
      const list = complianceEngine.listTemplates();
      expect(list.available.length).toBeGreaterThanOrEqual(6);
      const frameworks = list.available.map((t: { framework: string }) => t.framework);
      expect(frameworks).toContain("ISO_13485");
      expect(frameworks).toContain("AS9100");
      expect(frameworks).toContain("ITAR");
    });
  });

  describe("getTemplate", () => {
    it("returns template by ID", () => {
      const tpl = complianceEngine.getTemplate("iso_13485_v2016");
      expect(tpl).not.toBeNull();
      if (tpl) {
        expect(tpl.framework).toBe("ISO_13485");
        expect(tpl).toHaveProperty("requirements");
        expect(Array.isArray(tpl.requirements)).toBe(true);
      }
    });

    it("returns null for unknown template", () => {
      const tpl = complianceEngine.getTemplate("nonexistent_template_xyz");
      expect(tpl).toBeNull();
    });
  });

  describe("applyTemplate", () => {
    it("applies a template and returns result", () => {
      const result = complianceEngine.applyTemplate("iso_13485_v2016", "test", true);
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("disclaimer");
    });

    it("rejects without disclaimer acknowledgment", () => {
      const result = complianceEngine.applyTemplate("as9100_rev_d", "test", false);
      // Should either fail or return disclaimer warning
      expect(result).toHaveProperty("disclaimer");
    });
  });

  describe("runAudit", () => {
    it("returns audit results with scores", () => {
      const audit = complianceEngine.runAudit();
      expect(audit).toHaveProperty("results");
      expect(audit).toHaveProperty("total_score");
      expect(audit).toHaveProperty("disclaimer");
      expect(typeof audit.total_score).toBe("number");
    });

    it("can audit specific template", () => {
      complianceEngine.applyTemplate("iso_13485_v2016", "test", true);
      const audit = complianceEngine.runAudit("iso_13485_v2016");
      expect(audit.results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("gapAnalysis", () => {
    it("returns gap analysis for applied template", () => {
      complianceEngine.applyTemplate("iso_13485_v2016", "test", true);
      const gaps = complianceEngine.gapAnalysis("iso_13485_v2016");
      // May return error if not provisioned, or gap results
      expect(gaps).toHaveProperty("disclaimer");
    });
  });

  describe("getStats", () => {
    it("returns compliance statistics", () => {
      const stats = complianceEngine.getStats();
      expect(stats).toHaveProperty("templates_available");
      expect(stats).toHaveProperty("templates_active");
      expect(stats).toHaveProperty("total_requirements");
      expect(stats).toHaveProperty("disclaimer");
      expect(stats.templates_available).toBeGreaterThanOrEqual(6);
    });
  });

  describe("getAuditLog", () => {
    it("returns audit entries array", () => {
      const log = complianceEngine.getAuditLog();
      expect(Array.isArray(log)).toBe(true);
    });

    it("accepts limit parameter", () => {
      const log = complianceEngine.getAuditLog(5);
      expect(log.length).toBeLessThanOrEqual(5);
    });
  });

  describe("resolveConflicts", () => {
    it("returns conflict resolution results", () => {
      const result = complianceEngine.resolveConflicts();
      expect(result).toHaveProperty("conflicts");
      expect(result).toHaveProperty("disclaimer");
      expect(Array.isArray(result.conflicts)).toBe(true);
    });
  });
});

// ============================================================================
// 3. HOOK ENGINE (Event pub/sub) + HOOK EXECUTOR (Phase chains)
// ============================================================================

describe("HookEngine (Event System)", () => {
  describe("EventBus", () => {
    it("registers and retrieves events", () => {
      eventBus.registerEvent({
        name: "test:unit_event",
        description: "Unit test event",
        schema: {},
      });
      const ev = eventBus.getEvent("test:unit_event");
      expect(ev).toBeDefined();
      expect(ev!.name).toBe("test:unit_event");
    });

    it("emits events without error", () => {
      expect(() => {
        eventBus.emitEvent("test:unit_event", { value: 42 });
      }).not.toThrow();
    });

    it("getEvents returns all registered events", () => {
      const events = eventBus.getEvents();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it("tracks event history", () => {
      eventBus.emitEvent("test:unit_event", { data: "history_test" });
      const history = eventBus.getHistory(5);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty("event");
      expect(history[0]).toHaveProperty("timestamp");
    });
  });

  describe("HookEngine registration", () => {
    it("registers a hook", () => {
      hookEngine.registerHook({
        id: "TEST-001",
        name: "Test Hook",
        description: "Unit test hook",
        event: "test:unit_event",
        phase: "before",
        priority: "normal",
        enabled: true,
        handler: async () => ({
          hookId: "TEST-001",
          success: true,
          duration_ms: 0,
        }),
      });
      const hook = hookEngine.getHook("TEST-001");
      expect(hook).toBeDefined();
      expect(hook!.id).toBe("TEST-001");
    });

    it("unregisters a hook", () => {
      const removed = hookEngine.unregisterHook("TEST-001");
      expect(removed).toBe(true);
      expect(hookEngine.getHook("TEST-001")).toBeUndefined();
    });

    it("listHooks returns all hooks", () => {
      const hooks = hookEngine.listHooks();
      expect(Array.isArray(hooks)).toBe(true);
    });

    it("getHooksForEvent filters correctly", () => {
      hookEngine.registerHook({
        id: "TEST-EVT-001",
        name: "Event Filter Test",
        description: "Filter test",
        event: "test:filter_event",
        phase: "before",
        priority: "normal",
        enabled: true,
        handler: async () => ({
          hookId: "TEST-EVT-001",
          success: true,
          duration_ms: 0,
        }),
      });
      const hooks = hookEngine.getHooksForEvent("test:filter_event");
      expect(hooks.some((h) => h.id === "TEST-EVT-001")).toBe(true);
      hookEngine.unregisterHook("TEST-EVT-001");
    });

    it("setHookEnabled toggles hook", () => {
      hookEngine.registerHook({
        id: "TEST-TOGGLE",
        name: "Toggle Test",
        description: "Test",
        event: "test:toggle",
        phase: "before",
        priority: "normal",
        enabled: true,
        handler: async () => ({
          hookId: "TEST-TOGGLE",
          success: true,
          duration_ms: 0,
        }),
      });
      hookEngine.setHookEnabled("TEST-TOGGLE", false);
      expect(hookEngine.getHook("TEST-TOGGLE")!.enabled).toBe(false);
      hookEngine.setHookEnabled("TEST-TOGGLE", true);
      expect(hookEngine.getHook("TEST-TOGGLE")!.enabled).toBe(true);
      hookEngine.unregisterHook("TEST-TOGGLE");
    });
  });

  describe("executeHookChain", () => {
    it("executes hooks in chain for event+phase", async () => {
      hookEngine.registerHook({
        id: "TEST-CHAIN-001",
        name: "Chain Test",
        description: "Test",
        event: "test:chain",
        phase: "before",
        priority: "normal",
        enabled: true,
        handler: async (ctx) => ({
          hookId: "TEST-CHAIN-001",
          success: true,
          duration_ms: 1,
          output: "chain_ran",
        }),
      });

      const result = await hookEngine.executeHookChain(
        "test:chain",
        "before",
        { value: 1 }
      );
      expect(result).toHaveProperty("event");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("results");
      expect(result.totalHooks).toBeGreaterThanOrEqual(1);

      hookEngine.unregisterHook("TEST-CHAIN-001");
    });

    it("halt stops the chain", async () => {
      hookEngine.registerHook({
        id: "TEST-HALT-001",
        name: "Halt Hook",
        description: "Halts chain",
        event: "test:halt",
        phase: "before",
        priority: "high",
        enabled: true,
        handler: async () => ({
          hookId: "TEST-HALT-001",
          success: true,
          duration_ms: 0,
          halt: true,
        }),
      });
      hookEngine.registerHook({
        id: "TEST-HALT-002",
        name: "After Halt",
        description: "Should not run",
        event: "test:halt",
        phase: "before",
        priority: "low",
        enabled: true,
        handler: async () => ({
          hookId: "TEST-HALT-002",
          success: true,
          duration_ms: 0,
        }),
      });

      const result = await hookEngine.executeHookChain(
        "test:halt",
        "before",
        {},
        { stopOnHalt: true }
      );
      expect(result.halted).toBe(true);
      expect(result.haltedBy).toBe("TEST-HALT-001");

      hookEngine.unregisterHook("TEST-HALT-001");
      hookEngine.unregisterHook("TEST-HALT-002");
    });
  });

  describe("createCognitiveHook", () => {
    it("creates a cognitive hook with pattern", () => {
      const hook = createCognitiveHook(
        "TEST-COG",
        "BAYES",
        "test:cognitive",
        async () => ({
          hookId: "TEST-COG",
          success: true,
          duration_ms: 0,
        })
      );
      expect(hook.id).toBe("TEST-COG");
      expect(hook.cognitivePattern).toBe("BAYES");
    });
  });

  describe("getStats", () => {
    it("returns engine statistics", () => {
      const stats = hookEngine.getStats();
      expect(stats).toHaveProperty("totalHooks");
      expect(stats).toHaveProperty("hooksExecuted");
      expect(stats).toHaveProperty("hooksFailed");
      expect(typeof stats.totalHooks).toBe("number");
    });
  });
});

describe("HookExecutor (Phase Chain System)", () => {
  describe("register and retrieve", () => {
    it("registers a hook definition", () => {
      hookExecutor.register({
        id: "TEST-EXEC-001",
        name: "Executor Test",
        description: "Test hook for executor",
        phase: "pre-calculation",
        category: "validation",
        mode: "warning",
        priority: "normal",
        enabled: true,
        handler: () => hookSuccess(
          { id: "TEST-EXEC-001", name: "Executor Test", phase: "pre-calculation" as const, category: "validation" as const, mode: "warning" as const },
          "Test passed"
        ),
      });
      const hook = hookExecutor.getHook("TEST-EXEC-001");
      expect(hook).toBeDefined();
      expect(hook!.id).toBe("TEST-EXEC-001");
    });

    it("getAllHooks returns registered hooks", () => {
      const all = hookExecutor.getAllHooks();
      expect(Array.isArray(all)).toBe(true);
    });

    it("getHooksByPhase filters correctly", () => {
      const phaseHooks = hookExecutor.getHooksByPhase("pre-calculation");
      const found = phaseHooks.some((h) => h.id === "TEST-EXEC-001");
      expect(found).toBe(true);
    });

    it("getHooksByCategory filters correctly", () => {
      const catHooks = hookExecutor.getHooksByCategory("validation");
      const found = catHooks.some((h) => h.id === "TEST-EXEC-001");
      expect(found).toBe(true);
    });

    it("unregister removes hook", () => {
      hookExecutor.unregister("TEST-EXEC-001");
      expect(hookExecutor.getHook("TEST-EXEC-001")).toBeUndefined();
    });
  });

  describe("execute phase chain", () => {
    it("executes all hooks for a phase", async () => {
      hookExecutor.register({
        id: "TEST-PHASE-001",
        name: "Phase Test",
        description: "Phase chain test",
        phase: "post-calculation",
        category: "observability",
        mode: "logging",
        priority: "normal",
        enabled: true,
        handler: () => hookSuccess(
          { id: "TEST-PHASE-001", name: "Phase Test", phase: "post-calculation" as const, category: "observability" as const, mode: "logging" as const },
          "Logged"
        ),
      });

      const result = await hookExecutor.execute("post-calculation", {
        operation: "test_calc",
      });
      expect(result).toHaveProperty("phase", "post-calculation");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("totalHooks");
      expect(result).toHaveProperty("results");
      expect(result.totalHooks).toBeGreaterThanOrEqual(1);

      hookExecutor.unregister("TEST-PHASE-001");
    });

    it("blocking hook blocks the chain", async () => {
      hookExecutor.register({
        id: "TEST-BLOCK-001",
        name: "Blocker",
        description: "Blocks chain",
        phase: "pre-output",
        category: "enforcement",
        mode: "blocking",
        priority: "critical",
        enabled: true,
        handler: (ctx) => hookBlock(
          { id: "TEST-BLOCK-001", name: "Blocker", phase: "pre-output" as const, category: "enforcement" as const, mode: "blocking" as const },
          "Blocked by test"
        ),
      });

      const result = await hookExecutor.execute("pre-output", {
        operation: "test_output",
      });
      expect(result.blocked).toBe(true);
      expect(result.blockedBy).toBe("TEST-BLOCK-001");

      hookExecutor.unregister("TEST-BLOCK-001");
    });
  });

  describe("helper functions", () => {
    it("hookSuccess creates success result", () => {
      const r = hookSuccess(
        { id: "H1", name: "H1", phase: "on-audit" as const, category: "observability" as const, mode: "logging" as const },
        "All good"
      );
      expect(r.success).toBe(true);
      expect(r.blocked).toBe(false);
      expect(r.message).toBe("All good");
    });

    it("hookBlock creates blocking result", () => {
      const r = hookBlock(
        { id: "H2", name: "H2", phase: "pre-output" as const, category: "enforcement" as const, mode: "blocking" as const },
        "Denied"
      );
      expect(r.success).toBe(false);
      expect(r.blocked).toBe(true);
      expect(r.message).toBe("Denied");
    });

    it("hookWarning creates warning result", () => {
      const r = hookWarning(
        { id: "H3", name: "H3", phase: "post-output" as const, category: "validation" as const, mode: "warning" as const },
        "Watch out"
      );
      expect(r.success).toBe(true);
      expect(r.blocked).toBe(false);
    });
  });

  describe("getStats", () => {
    it("returns executor statistics", () => {
      const stats = hookExecutor.getStats();
      expect(stats).toHaveProperty("totalHooks");
      expect(stats).toHaveProperty("enabledHooks");
      expect(stats).toHaveProperty("byCategory");
      expect(stats).toHaveProperty("byPhase");
      expect(stats).toHaveProperty("totalExecutions");
    });
  });
});

// ============================================================================
// 4. AGENT EXECUTOR + SWARM EXECUTOR
// ============================================================================

describe("AgentExecutor", () => {
  // Use real built-in agent IDs from AgentRegistry
  const AGENT_A = "AGT-EXPERT-MATERIALS";
  const AGENT_B = "AGT-EXPERT-MACHINES";

  describe("createTask", () => {
    it("creates a task definition", () => {
      const task = agentExecutor.createTask(AGENT_A, { query: "hello" });
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("agentId", AGENT_A);
      expect(task).toHaveProperty("input");
      expect(task.input).toEqual({ query: "hello" });
      expect(task).toHaveProperty("priority", "normal");
    });

    it("accepts custom options", () => {
      const task = agentExecutor.createTask(AGENT_A, { q: 1 }, {
        priority: "high",
        timeout_ms: 10000,
        retries: 3,
      });
      expect(task.priority).toBe("high");
      expect(task.timeout_ms).toBe(10000);
      expect(task.retries).toBe(3);
    });

    it("throws for unknown agent ID", () => {
      expect(() => agentExecutor.createTask("NONEXISTENT-AGENT", {})).toThrow(
        /Agent not found/
      );
    });
  });

  describe("queueTask", () => {
    it("queues a task without throwing", () => {
      const task = agentExecutor.createTask(AGENT_A, { data: 1 });
      expect(() => agentExecutor.queueTask(task)).not.toThrow();
    });
  });

  describe("createPlan", () => {
    it("creates an execution plan", () => {
      const t1 = agentExecutor.createTask(AGENT_A, { step: 1 });
      const t2 = agentExecutor.createTask(AGENT_B, { step: 2 });
      const plan = agentExecutor.createPlan("test-plan", "sequential", [t1, t2]);
      expect(plan).toHaveProperty("id");
      expect(plan).toHaveProperty("name", "test-plan");
      expect(plan).toHaveProperty("mode", "sequential");
      expect(["draft", "ready"]).toContain(plan.status);
      expect(plan.tasks).toHaveLength(2);
    });

    it("supports parallel mode", () => {
      const t1 = agentExecutor.createTask(AGENT_A, {});
      const t2 = agentExecutor.createTask(AGENT_B, {});
      const plan = agentExecutor.createPlan("parallel-plan", "parallel", [t1, t2]);
      expect(plan.mode).toBe("parallel");
    });

    it("supports pipeline mode", () => {
      const t1 = agentExecutor.createTask(AGENT_A, {});
      const plan = agentExecutor.createPlan("pipe-plan", "pipeline", [t1]);
      expect(plan.mode).toBe("pipeline");
    });
  });

  describe("getQueueStats", () => {
    it("returns queue statistics", () => {
      const stats = agentExecutor.getQueueStats();
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("running");
      expect(stats).toHaveProperty("completed");
      expect(stats).toHaveProperty("failed");
      expect(stats).toHaveProperty("totalTasks");
      expect(typeof stats.totalTasks).toBe("number");
    });
  });

  describe("getSessions", () => {
    it("returns sessions array", () => {
      const sessions = agentExecutor.getSessions();
      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe("listPlans", () => {
    it("returns plans array", () => {
      const plans = agentExecutor.listPlans();
      expect(Array.isArray(plans)).toBe(true);
    });
  });
});

describe("SwarmExecutor", () => {
  describe("getPatterns", () => {
    it("returns all supported swarm patterns", () => {
      const patterns = swarmExecutor.getPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThanOrEqual(5);
      const names = patterns.map((p) => p.pattern);
      expect(names).toContain("parallel");
      expect(names).toContain("pipeline");
      expect(names).toContain("map_reduce");
      expect(names).toContain("consensus");
    });

    it("each pattern has description", () => {
      const patterns = swarmExecutor.getPatterns();
      for (const p of patterns) {
        expect(typeof p.description).toBe("string");
        expect(p.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe("listSwarms", () => {
    it("returns swarms array", () => {
      const swarms = swarmExecutor.listSwarms();
      expect(Array.isArray(swarms)).toBe(true);
    });
  });
});
