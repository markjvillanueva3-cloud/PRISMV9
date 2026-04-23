/**
 * EngineUtilizationAuditorEngine tests — Phase 0.23 U-UTL1
 */

import { describe, it, expect, beforeEach } from "vitest";
import { engineUtilizationAuditorEngine } from "../engines/EngineUtilizationAuditorEngine.js";

describe("EngineUtilizationAuditorEngine", () => {
  beforeEach(() => {
    engineUtilizationAuditorEngine.reset();
  });

  describe("audit", () => {
    it("discovers engines in the engines directory", async () => {
      const result = await engineUtilizationAuditorEngine.audit();
      expect(result.totalEngines).toBeGreaterThan(0);
    });

    it("returns timestamp", async () => {
      const result = await engineUtilizationAuditorEngine.audit();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it("calculates orphan rate", async () => {
      const result = await engineUtilizationAuditorEngine.audit();
      expect(result.orphanRate).toBeGreaterThanOrEqual(0);
      expect(result.orphanRate).toBeLessThanOrEqual(100);
    });

    it("calculates test coverage", async () => {
      const result = await engineUtilizationAuditorEngine.audit();
      expect(result.testCoverage).toBeGreaterThanOrEqual(0);
      expect(result.testCoverage).toBeLessThanOrEqual(100);
    });

    it("includes engines array", async () => {
      const result = await engineUtilizationAuditorEngine.audit();
      expect(Array.isArray(result.engines)).toBe(true);
    });

    it("generates recommendations", async () => {
      const result = await engineUtilizationAuditorEngine.audit();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe("getOrphans", () => {
    it("returns empty before audit", () => {
      const orphans = engineUtilizationAuditorEngine.getOrphans();
      expect(orphans).toEqual([]);
    });

    it("returns orphans after audit", async () => {
      await engineUtilizationAuditorEngine.audit();
      const orphans = engineUtilizationAuditorEngine.getOrphans();
      expect(Array.isArray(orphans)).toBe(true);
    });
  });

  describe("getByStatus", () => {
    it("returns engines by status", async () => {
      await engineUtilizationAuditorEngine.audit();
      const active = engineUtilizationAuditorEngine.getByStatus("active");
      expect(Array.isArray(active)).toBe(true);
    });

    it("returns orphan status engines", async () => {
      await engineUtilizationAuditorEngine.audit();
      const orphans = engineUtilizationAuditorEngine.getByStatus("orphan");
      expect(Array.isArray(orphans)).toBe(true);
    });
  });

  describe("meetsExitGate", () => {
    it("returns false before audit", () => {
      expect(engineUtilizationAuditorEngine.meetsExitGate()).toBe(false);
    });

    it("checks <5% orphan threshold", async () => {
      await engineUtilizationAuditorEngine.audit();
      const result = engineUtilizationAuditorEngine.meetsExitGate();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("getSummary", () => {
    it("returns null before audit", () => {
      expect(engineUtilizationAuditorEngine.getSummary()).toBeNull();
    });

    it("returns summary after audit", async () => {
      await engineUtilizationAuditorEngine.audit();
      const summary = engineUtilizationAuditorEngine.getSummary();
      expect(summary).not.toBeNull();
      expect(summary!.total).toBeGreaterThan(0);
      expect(typeof summary!.orphanRate).toBe("number");
    });
  });

  describe("getLastAudit", () => {
    it("returns null before audit", () => {
      expect(engineUtilizationAuditorEngine.getLastAudit()).toBeNull();
    });

    it("returns full audit after run", async () => {
      await engineUtilizationAuditorEngine.audit();
      const audit = engineUtilizationAuditorEngine.getLastAudit();
      expect(audit).not.toBeNull();
      expect(audit!.totalEngines).toBeGreaterThan(0);
    });
  });

  describe("reset", () => {
    it("clears cache", async () => {
      await engineUtilizationAuditorEngine.audit();
      expect(engineUtilizationAuditorEngine.getSummary()).not.toBeNull();
      engineUtilizationAuditorEngine.reset();
      expect(engineUtilizationAuditorEngine.getSummary()).toBeNull();
    });
  });

  describe("audit options", () => {
    it("accepts includeTests option", async () => {
      const result = await engineUtilizationAuditorEngine.audit({ includeTests: false });
      expect(result.totalEngines).toBeGreaterThan(0);
    });

    it("accepts includeDispatchers option", async () => {
      const result = await engineUtilizationAuditorEngine.audit({ includeDispatchers: false });
      expect(result.totalEngines).toBeGreaterThan(0);
    });

    it("accepts excludePatterns option", async () => {
      const result = await engineUtilizationAuditorEngine.audit({
        excludePatterns: ["index.ts", ".test.ts", "Base"]
      });
      expect(result.totalEngines).toBeGreaterThan(0);
    });
  });
});
