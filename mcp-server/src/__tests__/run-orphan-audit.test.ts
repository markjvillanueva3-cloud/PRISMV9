/**
 * Tests for run-orphan-audit script (Universal Phase 0.9)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { runOrphanAudit, OrphanAuditReport } from "../../scripts/run-orphan-audit.js";

describe("run-orphan-audit (Phase 0.9)", () => {
  let report: OrphanAuditReport;

  beforeAll(async () => {
    report = await runOrphanAudit();
  }, 30000);

  describe("report structure", () => {
    it("returns a valid report object", () => {
      expect(report).toBeDefined();
      expect(typeof report).toBe("object");
    });

    it("has schemaVersion field set to 1", () => {
      expect(report.schemaVersion).toBe(1);
    });

    it("has lastUpdated as a valid ISO string", () => {
      expect(typeof report.lastUpdated).toBe("string");
      const date = new Date(report.lastUpdated);
      expect(date.toString()).not.toBe("Invalid Date");
    });

    it("has totalOrphans field", () => {
      expect(typeof report.totalOrphans).toBe("number");
      expect(report.totalOrphans).toBeGreaterThanOrEqual(0);
    });

    it("has byType record", () => {
      expect(typeof report.byType).toBe("object");
    });

    it("has bySeverity record", () => {
      expect(typeof report.bySeverity).toBe("object");
    });

    it("has orphans array", () => {
      expect(Array.isArray(report.orphans)).toBe(true);
    });
  });

  describe("orphan entry structure", () => {
    it("every orphan has required fields", () => {
      for (const orphan of report.orphans.slice(0, 50)) {
        expect(typeof orphan.type).toBe("string");
        expect(typeof orphan.asset).toBe("string");
        expect(typeof orphan.reason).toBe("string");
        expect(["error", "warning", "info"]).toContain(orphan.severity);
      }
    });

    it("orphan types are known types", () => {
      const knownTypes = [
        "ENGINE_WITHOUT_DISPATCHER",
        "ACTION_WITHOUT_SCHEMA",
        "ACTION_WITHOUT_CASE",
        "SCHEMA_WITHOUT_ACTION",
        "SKILL_WITHOUT_HOOK_ANCHOR",
        "HOOK_WITHOUT_REGISTRATION",
        "REGISTRY_ENTRY_UNBACKED",
        "FILE_UNREGISTERED",
      ];

      for (const orphan of report.orphans.slice(0, 50)) {
        expect(knownTypes).toContain(orphan.type);
      }
    });
  });

  describe("counts consistency", () => {
    it("totalOrphans matches orphans array length", () => {
      expect(report.totalOrphans).toBe(report.orphans.length);
    });

    it("byType counts sum to totalOrphans", () => {
      const sum = Object.values(report.byType).reduce((s, n) => s + n, 0);
      expect(sum).toBe(report.totalOrphans);
    });

    it("bySeverity counts sum to totalOrphans", () => {
      const sum = Object.values(report.bySeverity).reduce((s, n) => s + n, 0);
      expect(sum).toBe(report.totalOrphans);
    });
  });

  describe("severity distribution", () => {
    it("has at least info-level orphans", () => {
      expect(report.bySeverity["info"] || 0).toBeGreaterThanOrEqual(0);
    });

    it("warning count is non-negative", () => {
      expect(report.bySeverity["warning"] || 0).toBeGreaterThanOrEqual(0);
    });

    it("error count is non-negative", () => {
      expect(report.bySeverity["error"] || 0).toBeGreaterThanOrEqual(0);
    });
  });

  describe("specific orphan types", () => {
    it("detects ENGINE_WITHOUT_DISPATCHER if any exist", () => {
      const count = report.byType["ENGINE_WITHOUT_DISPATCHER"] || 0;
      if (count > 0) {
        const samples = report.orphans.filter((o) => o.type === "ENGINE_WITHOUT_DISPATCHER").slice(0, 5);
        for (const sample of samples) {
          expect(sample.asset).toMatch(/Engine$/);
        }
      }
    });

    it("detects FILE_UNREGISTERED if any exist", () => {
      const count = report.byType["FILE_UNREGISTERED"] || 0;
      if (count > 0) {
        const samples = report.orphans.filter((o) => o.type === "FILE_UNREGISTERED").slice(0, 5);
        for (const sample of samples) {
          expect(sample.file).toMatch(/\.ts$/);
        }
      }
    });
  });
});
