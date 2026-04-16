/**
 * PPAGISystemDashboardEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPAGISystemDashboardEngine,
  ppAGISystemDashboardEngine,
} from "../engines/PPAGISystemDashboardEngine.js";

describe("PPAGISystemDashboardEngine", () => {
  it("exports singleton", () => {
    expect(ppAGISystemDashboardEngine).toBeInstanceOf(PPAGISystemDashboardEngine);
  });

  describe("getDashboard", () => {
    it("returns timestamp", () => {
      const d = ppAGISystemDashboardEngine.getDashboard();
      expect(d.timestamp).toBeGreaterThan(0);
      expect(d.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it("returns health status", () => {
      const d = ppAGISystemDashboardEngine.getDashboard();
      expect(["healthy", "degraded", "offline"]).toContain(d.health);
    });

    it("reports all 7 embedding engines with correct dimensions", () => {
      const d = ppAGISystemDashboardEngine.getDashboard();
      expect(d.embeddings.controller.dimension).toBe(48);
      expect(d.embeddings.machine.dimension).toBe(40);
      expect(d.embeddings.material.dimension).toBe(32);
      expect(d.embeddings.tool.dimension).toBe(36);
      expect(d.embeddings.physics.dimension).toBe(24);
      expect(d.embeddings.safety.dimension).toBe(20);
      expect(d.embeddings.toolpath.dimension).toBe(28);
      expect(d.embeddings.fused_total).toBe(120);
    });

    it("reports known items for stateful engines", () => {
      const d = ppAGISystemDashboardEngine.getDashboard();
      expect(d.embeddings.controller.known_items).toBeGreaterThan(10);
      expect(d.embeddings.machine.known_items).toBeGreaterThan(0);
      expect(d.embeddings.material.known_items).toBeGreaterThan(0);
      expect(d.embeddings.tool.known_items).toBeGreaterThan(0);
      expect(d.embeddings.toolpath.known_items).toBeGreaterThan(0);
    });

    it("marks stateless engines with -1", () => {
      const d = ppAGISystemDashboardEngine.getDashboard();
      expect(d.embeddings.physics.known_items).toBe(-1);
      expect(d.embeddings.safety.known_items).toBe(-1);
    });

    it("returns learning section", () => {
      const d = ppAGISystemDashboardEngine.getDashboard();
      expect(d.learning.active_queue).toBeDefined();
      expect(d.learning.online_tracker).toBeDefined();
      expect(d.learning.training_pipeline).toBeDefined();
    });

    it("returns knowledge templates stats", () => {
      const d = ppAGISystemDashboardEngine.getDashboard();
      expect(d.knowledge.templates.total).toBeGreaterThan(0);
      expect(d.knowledge.templates.avg_success_rate).toBeGreaterThan(0);
    });

    it("returns capabilities flags", () => {
      const d = ppAGISystemDashboardEngine.getDashboard();
      expect(d.capabilities.total_embedding_engines).toBe(8);
      expect(d.capabilities.total_embedding_dimensions).toBe(48 + 40 + 32 + 36 + 24 + 20 + 28);
      expect(d.capabilities.can_analyze_gcode).toBe(true);
      expect(d.capabilities.can_score_uncertainty).toBe(true);
      expect(d.capabilities.can_explain_decisions).toBe(true);
      expect(d.capabilities.can_learn_from_feedback).toBe(true);
    });

    it("returns version string", () => {
      const d = ppAGISystemDashboardEngine.getDashboard();
      expect(d.version).toMatch(/^pp-agi-v/);
    });
  });

  describe("healthCheck", () => {
    it("returns results for all engines", () => {
      const checks = ppAGISystemDashboardEngine.healthCheck();
      expect(checks.length).toBeGreaterThan(5);
    });

    it("all checks have engine name", () => {
      const checks = ppAGISystemDashboardEngine.healthCheck();
      for (const c of checks) {
        expect(c.engine.length).toBeGreaterThan(0);
      }
    });

    it("status is one of allowed values", () => {
      const checks = ppAGISystemDashboardEngine.healthCheck();
      for (const c of checks) {
        expect(["ok", "degraded", "error"]).toContain(c.status);
      }
    });

    it("most embedding engines report ok with data", () => {
      const checks = ppAGISystemDashboardEngine.healthCheck();
      const embChecks = checks.filter(c =>
        c.engine.includes("embedding") || c.engine.includes("vector") || c.engine.includes("encoder"));
      const okCount = embChecks.filter(c => c.status === "ok").length;
      expect(okCount).toBeGreaterThan(0);
    });

    it("includes active-learning-queue check", () => {
      const checks = ppAGISystemDashboardEngine.healthCheck();
      expect(checks.some(c => c.engine === "active-learning-queue")).toBe(true);
    });

    it("includes online-learning-tracker check", () => {
      const checks = ppAGISystemDashboardEngine.healthCheck();
      expect(checks.some(c => c.engine === "online-learning-tracker")).toBe(true);
    });

    it("includes template-library check", () => {
      const checks = ppAGISystemDashboardEngine.healthCheck();
      expect(checks.some(c => c.engine === "template-library")).toBe(true);
    });
  });

  describe("summary", () => {
    it("returns non-empty string", () => {
      const s = ppAGISystemDashboardEngine.summary();
      expect(s.length).toBeGreaterThan(100);
    });

    it("includes dashboard title", () => {
      const s = ppAGISystemDashboardEngine.summary();
      expect(s).toContain("PP-AGI System Dashboard");
    });

    it("includes health status", () => {
      const s = ppAGISystemDashboardEngine.summary();
      expect(s).toMatch(/Health:\s+(HEALTHY|DEGRADED|OFFLINE)/);
    });

    it("includes version", () => {
      const s = ppAGISystemDashboardEngine.summary();
      expect(s).toContain("pp-agi-v");
    });

    it("lists all embedding engines", () => {
      const s = ppAGISystemDashboardEngine.summary();
      expect(s).toContain("Controller:");
      expect(s).toContain("Machine:");
      expect(s).toContain("Material:");
      expect(s).toContain("Tool:");
      expect(s).toContain("Toolpath:");
    });

    it("includes learning state", () => {
      const s = ppAGISystemDashboardEngine.summary();
      expect(s).toContain("Active queue");
      expect(s).toContain("Online tracker");
      expect(s).toContain("Training pipeline");
    });

    it("includes knowledge section", () => {
      const s = ppAGISystemDashboardEngine.summary();
      expect(s).toContain("Templates");
    });
  });
});
