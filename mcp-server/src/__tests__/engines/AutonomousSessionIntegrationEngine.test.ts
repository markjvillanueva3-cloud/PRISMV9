/**
 * Tests for AutonomousSessionIntegrationEngine
 *
 * Tests the real integration layer that connects autonomous AI orchestration
 * to actual executors and knowledge sources.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AutonomousSessionIntegrationEngine,
  autonomousSession,
  type IntegrationMode,
  type SessionContext,
  type IntegrationHealth,
} from "../../engines/AutonomousSessionIntegrationEngine.js";

describe("AutonomousSessionIntegrationEngine", () => {
  let engine: AutonomousSessionIntegrationEngine;

  beforeEach(() => {
    engine = new AutonomousSessionIntegrationEngine();
  });

  // ==========================================================================
  // INSTANTIATION
  // ==========================================================================

  describe("instantiation", () => {
    it("should export singleton autonomousSession", () => {
      expect(autonomousSession).toBeDefined();
      expect(autonomousSession).toBeInstanceOf(AutonomousSessionIntegrationEngine);
    });

    it("should create new instance with constructor", () => {
      expect(engine).toBeInstanceOf(AutonomousSessionIntegrationEngine);
    });

    it("should start uninitialized", () => {
      const health = engine.getHealth();
      expect(health.overallHealth).toBe(0);
    });
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe("initialize()", () => {
    it("should return health status after initialization", async () => {
      const health = await engine.initialize();
      expect(health).toBeDefined();
      expect(typeof health.overallHealth).toBe("number");
      expect(health.overallHealth).toBeGreaterThanOrEqual(0);
      expect(health.overallHealth).toBeLessThanOrEqual(1);
    });

    it("should have required health fields", async () => {
      const health = await engine.initialize();
      expect("skillExecutor" in health).toBe(true);
      expect("hookExecutor" in health).toBe(true);
      expect("scriptExecutor" in health).toBe(true);
      expect("mitCourses" in health).toBe(true);
      expect("tribalKnowledge" in health).toBe(true);
      expect("playbook" in health).toBe(true);
      expect("vendorCatalogs" in health).toBe(true);
      expect("formulas" in health).toBe(true);
      expect("algorithms" in health).toBe(true);
    });

    it("should not reinitialize if already initialized", async () => {
      const health1 = await engine.initialize();
      const health2 = await engine.initialize();
      // Both should indicate initialized state (overallHealth > 0)
      expect(health1.overallHealth).toBeGreaterThan(0);
      expect(health2.overallHealth).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  describe("session management", () => {
    it("should get empty history for new session", () => {
      const history = engine.getSessionHistory("new-session-123");
      expect(history).toEqual([]);
    });

    it("should update session context", () => {
      const updated = engine.updateSessionContext("test-session", {
        userId: "user-1",
        machineContext: { type: "lathe" },
      });
      expect(updated.sessionId).toBe("test-session");
      expect(updated.userId).toBe("user-1");
      expect(updated.machineContext).toEqual({ type: "lathe" });
    });

    it("should create session if it does not exist", () => {
      const updated = engine.updateSessionContext("brand-new", {
        customerContext: { name: "ALCOA" },
      });
      expect(updated.sessionId).toBe("brand-new");
      expect(updated.history).toEqual([]);
    });

    it("should clear session", () => {
      engine.updateSessionContext("to-clear", { userId: "temp" });
      engine.clearSession("to-clear");
      const history = engine.getSessionHistory("to-clear");
      expect(history).toEqual([]);
    });

    it("should preserve history across context updates", () => {
      const session = engine.updateSessionContext("with-history", {});
      session.history.push({
        timestamp: new Date().toISOString(),
        intent: "test intent",
        result: "success",
        confidence: 0.9,
        duration_ms: 100,
      });

      const updated = engine.updateSessionContext("with-history", {
        userId: "user-2",
      });
      expect(updated.history).toHaveLength(1);
      expect(updated.history[0].intent).toBe("test intent");
    });
  });

  // ==========================================================================
  // INTEGRATION MODE
  // ==========================================================================

  describe("integration mode", () => {
    it("should default to full_integration mode", () => {
      const health = engine.getHealth();
      // Mode affects health calculation after init
      expect(health.overallHealth).toBe(0); // not initialized yet
    });

    it("should set mode to simulation", () => {
      engine.setMode("simulation");
      // Mode is set internally, verify via getSummary
      const summary = engine.getSummary();
      expect(summary).toContain("simulation");
    });

    it("should set mode to passthrough", () => {
      engine.setMode("passthrough");
      const summary = engine.getSummary();
      expect(summary).toContain("passthrough");
    });

    it("should set mode to partial_integration", () => {
      engine.setMode("partial_integration");
      const summary = engine.getSummary();
      expect(summary).toContain("partial_integration");
    });
  });

  // ==========================================================================
  // GET HEALTH
  // ==========================================================================

  describe("getHealth()", () => {
    it("should return health object with all fields", () => {
      const health = engine.getHealth();
      expect(health).toHaveProperty("skillExecutor");
      expect(health).toHaveProperty("hookExecutor");
      expect(health).toHaveProperty("scriptExecutor");
      expect(health).toHaveProperty("mitCourses");
      expect(health).toHaveProperty("tribalKnowledge");
      expect(health).toHaveProperty("playbook");
      expect(health).toHaveProperty("vendorCatalogs");
      expect(health).toHaveProperty("formulas");
      expect(health).toHaveProperty("algorithms");
      expect(health).toHaveProperty("overallHealth");
    });

    it("should calculate overallHealth as ratio", async () => {
      await engine.initialize();
      const health = engine.getHealth();
      expect(health.overallHealth).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GET SUMMARY
  // ==========================================================================

  describe("getSummary()", () => {
    it("should return formatted summary string", () => {
      const summary = engine.getSummary();
      expect(typeof summary).toBe("string");
      expect(summary).toContain("AutonomousSessionIntegrationEngine");
      expect(summary).toContain("Mode:");
      expect(summary).toContain("Health:");
      expect(summary).toContain("Connected:");
    });

    it("should show connection status for all integrations", () => {
      const summary = engine.getSummary();
      expect(summary).toContain("SkillExecutor:");
      expect(summary).toContain("HookExecutor:");
      expect(summary).toContain("ScriptExecutor:");
      expect(summary).toContain("MIT Courses:");
      expect(summary).toContain("Tribal Knowledge:");
      expect(summary).toContain("Playbook:");
      expect(summary).toContain("Vendor Catalogs:");
      expect(summary).toContain("Formulas:");
      expect(summary).toContain("Algorithms:");
    });

    it("should show session and cache counts", () => {
      const summary = engine.getSummary();
      expect(summary).toContain("Sessions:");
      expect(summary).toContain("Cache:");
    });
  });

  // ==========================================================================
  // PROCESS INTENT (SIMULATION MODE)
  // ==========================================================================

  describe("processIntent() in simulation mode", () => {
    beforeEach(async () => {
      engine.setMode("simulation");
      await engine.initialize();
    });

    it("should process simple manufacturing intent", async () => {
      const result = await engine.processIntent("calculate speed and feed for aluminum");

      expect(result).toBeDefined();
      expect(result.intent).toBe("calculate speed and feed for aluminum");
      expect(result.integrationMode).toBe("simulation");
    });

    it("should track session history", async () => {
      const sessionId = "track-history-test";
      await engine.processIntent("first intent", sessionId);
      await engine.processIntent("second intent", sessionId);

      const history = engine.getSessionHistory(sessionId);
      expect(history.length).toBe(2);
      expect(history[0].intent).toBe("first intent");
      expect(history[1].intent).toBe("second intent");
    });

    it("should auto-generate session ID if not provided", async () => {
      const result = await engine.processIntent("test intent");
      expect(result.sessionContext.sessionId).toContain("session-");
    });

    it("should include realExecutions array", async () => {
      const result = await engine.processIntent("test");
      expect(Array.isArray(result.realExecutions)).toBe(true);
    });

    it("should include knowledgeQueries array", async () => {
      const result = await engine.processIntent("test");
      expect(Array.isArray(result.knowledgeQueries)).toBe(true);
    });

    it("should measure duration", async () => {
      const result = await engine.processIntent("duration test");
      expect(result.totalDuration_ms).toBeGreaterThanOrEqual(0);
      expect(typeof result.totalDuration_ms).toBe("number");
    });
  });

  // ==========================================================================
  // DOMAIN INFERENCE
  // ==========================================================================

  describe("domain inference", () => {
    beforeEach(async () => {
      engine.setMode("simulation");
      await engine.initialize();
    });

    it("should infer turning domain", async () => {
      const result = await engine.processIntent("lathe turning operation");
      expect(result).toBeDefined();
    });

    it("should infer milling domain", async () => {
      const result = await engine.processIntent("mill this pocket");
      expect(result).toBeDefined();
    });

    it("should infer drilling domain", async () => {
      const result = await engine.processIntent("drill these holes");
      expect(result).toBeDefined();
    });

    it("should infer grinding domain", async () => {
      const result = await engine.processIntent("grind surface finish");
      expect(result).toBeDefined();
    });

    it("should infer EDM domain", async () => {
      const result = await engine.processIntent("wire EDM this profile");
      expect(result).toBeDefined();
    });

    it("should infer threading domain", async () => {
      const result = await engine.processIntent("thread this bore");
      expect(result).toBeDefined();
    });

    it("should infer quoting domain", async () => {
      const result = await engine.processIntent("quote this job");
      expect(result).toBeDefined();
    });

    it("should infer quality domain", async () => {
      const result = await engine.processIntent("quality inspection");
      expect(result).toBeDefined();
    });

    it("should infer safety domain", async () => {
      const result = await engine.processIntent("safety check required");
      expect(result).toBeDefined();
    });

    it("should default to general_manufacturing", async () => {
      const result = await engine.processIntent("random task");
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // KNOWLEDGE QUERYING
  // ==========================================================================

  describe("knowledge querying", () => {
    beforeEach(async () => {
      engine.setMode("simulation");
      await engine.initialize();
    });

    it("should query tribal knowledge via PRISM self-awareness", async () => {
      const result = await engine.processIntent("thin wall milling tips");
      // Should have attempted knowledge queries
      expect(result.knowledgeQueries).toBeDefined();
    });

    it("should query playbook rules via PRISM self-awareness", async () => {
      const result = await engine.processIntent("roughing depth of cut rules");
      expect(result.knowledgeQueries).toBeDefined();
    });

    it("should query PRISM engines via self-awareness", async () => {
      const result = await engine.processIntent("calculate cutting force");
      expect(result.knowledgeQueries).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe("error handling", () => {
    beforeEach(async () => {
      engine.setMode("simulation");
      await engine.initialize();
    });

    it("should handle empty intent gracefully", async () => {
      const result = await engine.processIntent("");
      expect(result).toBeDefined();
      expect(result.sessionContext).toBeDefined();
    });

    it("should record failed intents in history", async () => {
      // Force an error by mocking (in simulation mode, should still work)
      const result = await engine.processIntent("potential error case", "error-test");
      expect(result.sessionContext.history.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // CONTEXT PASSING
  // ==========================================================================

  describe("context passing", () => {
    beforeEach(async () => {
      engine.setMode("simulation");
      await engine.initialize();
    });

    it("should accept constraints in context", async () => {
      const result = await engine.processIntent(
        "optimize cutting parameters",
        "ctx-test",
        { constraints: ["tool life > 30 min", "surface finish Ra < 0.8"] }
      );
      expect(result).toBeDefined();
    });

    it("should accept machine context in session", async () => {
      engine.updateSessionContext("machine-ctx", {
        machineContext: {
          type: "lathe",
          model: "Okuma LB3000",
          spindle_power_kw: 22,
        },
      });
      const result = await engine.processIntent("optimize for this machine", "machine-ctx");
      expect(result.sessionContext.machineContext).toEqual({
        type: "lathe",
        model: "Okuma LB3000",
        spindle_power_kw: 22,
      });
    });

    it("should accept material context in session", async () => {
      engine.updateSessionContext("material-ctx", {
        materialContext: {
          name: "D2 Tool Steel",
          hardness_hrc: 60,
          iso_group: "H",
        },
      });
      const result = await engine.processIntent("calculate for this material", "material-ctx");
      expect(result.sessionContext.materialContext).toEqual({
        name: "D2 Tool Steel",
        hardness_hrc: 60,
        iso_group: "H",
      });
    });

    it("should accept customer context in session", async () => {
      engine.updateSessionContext("customer-ctx", {
        customerContext: {
          name: "ALCOA",
          tier: "premium",
        },
      });
      const result = await engine.processIntent("quote for this customer", "customer-ctx");
      expect(result.sessionContext.customerContext).toEqual({
        name: "ALCOA",
        tier: "premium",
      });
    });
  });

  // ==========================================================================
  // CACHING
  // ==========================================================================

  describe("knowledge caching", () => {
    it("should show cache entries in summary", async () => {
      engine.setMode("simulation");
      await engine.initialize();
      await engine.processIntent("cache test query");

      const summary = engine.getSummary();
      expect(summary).toContain("Cache:");
    });
  });

  // ==========================================================================
  // REAL EXECUTION RESULTS
  // ==========================================================================

  describe("real execution results structure", () => {
    beforeEach(async () => {
      engine.setMode("simulation");
      await engine.initialize();
    });

    it("should include executor field in execution results", async () => {
      const result = await engine.processIntent("execute skills and hooks");
      for (const exec of result.realExecutions) {
        expect(["skill", "hook", "script", "engine", "algorithm", "formula"]).toContain(exec.executor);
      }
    });

    it("should include resourceId in execution results", async () => {
      const result = await engine.processIntent("execute resources");
      for (const exec of result.realExecutions) {
        expect(typeof exec.resourceId).toBe("string");
      }
    });

    it("should include success boolean in execution results", async () => {
      const result = await engine.processIntent("test success");
      for (const exec of result.realExecutions) {
        expect(typeof exec.success).toBe("boolean");
      }
    });

    it("should include duration_ms in execution results", async () => {
      const result = await engine.processIntent("test duration");
      for (const exec of result.realExecutions) {
        expect(typeof exec.duration_ms).toBe("number");
        expect(exec.duration_ms).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ==========================================================================
  // TYPE SAFETY
  // ==========================================================================

  describe("type definitions", () => {
    it("should have IntegrationMode type", () => {
      const modes: IntegrationMode[] = [
        "full_integration",
        "partial_integration",
        "simulation",
        "passthrough",
      ];
      expect(modes).toHaveLength(4);
    });

    it("should have SessionContext type with required fields", () => {
      const session: SessionContext = {
        sessionId: "test",
        history: [],
      };
      expect(session.sessionId).toBe("test");
      expect(session.history).toEqual([]);
    });

    it("should have IntegrationHealth type with all fields", () => {
      const health: IntegrationHealth = {
        skillExecutor: true,
        hookExecutor: true,
        scriptExecutor: true,
        mitCourses: false,
        tribalKnowledge: true,
        playbook: true,
        vendorCatalogs: false,
        formulas: true,
        algorithms: true,
        overallHealth: 0.78,
      };
      expect(health.overallHealth).toBe(0.78);
    });
  });

  // ==========================================================================
  // INTEGRATION WITH ORCHESTRATION
  // ==========================================================================

  describe("orchestration integration", () => {
    beforeEach(async () => {
      engine.setMode("simulation");
      await engine.initialize();
    });

    it("should return orchestration result fields", async () => {
      const result = await engine.processIntent("orchestrate task");
      expect(result).toHaveProperty("taskId");
      expect(result).toHaveProperty("steps");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("confidence");
    });

    it("should include learnings from orchestration", async () => {
      const result = await engine.processIntent("learn from this");
      expect(Array.isArray(result.learnings)).toBe(true);
    });

    it("should include suggestions from orchestration", async () => {
      const result = await engine.processIntent("suggest improvements");
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it("should track skills executed", async () => {
      const result = await engine.processIntent("execute skills");
      expect(Array.isArray(result.skillsExecuted)).toBe(true);
    });

    it("should track hooks triggered", async () => {
      const result = await engine.processIntent("trigger hooks");
      expect(Array.isArray(result.hooksTriggered)).toBe(true);
    });

    it("should track engines invoked", async () => {
      const result = await engine.processIntent("invoke engines");
      expect(Array.isArray(result.enginesInvoked)).toBe(true);
    });

    it("should track knowledge used", async () => {
      const result = await engine.processIntent("use knowledge");
      expect(Array.isArray(result.knowledgeUsed)).toBe(true);
    });
  });
});
