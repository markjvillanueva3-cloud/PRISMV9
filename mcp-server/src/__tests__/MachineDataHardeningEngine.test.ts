/**
 * MachineDataHardeningEngine.test.ts — Tests for SQ3-0-MACH
 * Tests audit completeness, gap-fill harden, physics validation,
 * model ingestion, and summary generation.
 */

import { describe, it, expect } from "vitest";
import { machineDataHardeningEngine } from "../engines/MachineDataHardeningEngine.js";
import type { AuditReport, HardenResult, ValidationReport } from "../engines/MachineDataHardeningEngine.js";

describe("MachineDataHardeningEngine", () => {
  let auditResult: AuditReport;

  describe("audit()", () => {
    it("audits all machines", async () => {
      auditResult = await machineDataHardeningEngine.audit();
      expect(auditResult).toBeDefined();
      expect(auditResult.total_machines).toBeGreaterThan(0);
      expect(auditResult.timestamp).toBeTruthy();
      expect(auditResult.avg_completeness_pct).toBeGreaterThanOrEqual(0);
      expect(auditResult.avg_completeness_pct).toBeLessThanOrEqual(100);
    }, 30000);

    it("has field coverage for all required fields", () => {
      const fields = Object.keys(auditResult.field_coverage);
      expect(fields.length).toBeGreaterThanOrEqual(15);
      for (const field of fields) {
        const stats = auditResult.field_coverage[field];
        expect(stats.pct).toBeGreaterThanOrEqual(0);
        expect(stats.pct).toBeLessThanOrEqual(100);
      }
    });

    it("has entries array matching total_machines", () => {
      expect(auditResult.entries.length).toBe(auditResult.total_machines);
    });

    it("each entry has valid completeness", () => {
      for (const entry of auditResult.entries) {
        expect(entry.completeness_pct).toBeGreaterThanOrEqual(0);
        expect(entry.completeness_pct).toBeLessThanOrEqual(100);
        expect(entry.machine_id).toBeTruthy();
        expect(entry.fields.length).toBeGreaterThan(0);
      }
    });

    it("has worst and best machines sorted correctly", () => {
      if (auditResult.worst_machines.length >= 2) {
        expect(auditResult.worst_machines[0].completeness_pct)
          .toBeLessThanOrEqual(auditResult.worst_machines[1].completeness_pct);
      }
      if (auditResult.best_machines.length >= 2) {
        expect(auditResult.best_machines[0].completeness_pct)
          .toBeGreaterThanOrEqual(auditResult.best_machines[1].completeness_pct);
      }
    });

    it("includes warnings array", () => {
      expect(Array.isArray(auditResult.warnings)).toBe(true);
    });

    it("audits a specific machine", async () => {
      const single = await machineDataHardeningEngine.audit("haas_vf2");
      expect(single.total_machines).toBeLessThanOrEqual(1);
    });
  });

  describe("harden()", () => {
    it("dry-run identifies gaps without applying", async () => {
      const result: HardenResult = await machineDataHardeningEngine.harden(undefined, true);
      expect(result).toBeDefined();
      expect(result.dry_run).toBe(true);
      expect(result.gaps_filled).toBe(0);
      expect(result.total_machines).toBeGreaterThan(0);
      expect(Array.isArray(result.fills)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    }, 30000);

    it("fills have valid structure", async () => {
      const result = await machineDataHardeningEngine.harden(undefined, true);
      for (const fill of result.fills) {
        expect(fill.machine_id).toBeTruthy();
        expect(fill.field).toBeTruthy();
        expect(fill.source).toBeTruthy();
      }
    }, 30000);

    it("harden specific machine", async () => {
      const result = await machineDataHardeningEngine.harden("haas_vf2", true);
      expect(result.total_machines).toBe(1);
    });
  });

  describe("validate()", () => {
    it("validates all machines for physics consistency", async () => {
      const result: ValidationReport = await machineDataHardeningEngine.validate();
      expect(result).toBeDefined();
      expect(result.machines_checked).toBeGreaterThan(0);
      expect(result.pass_rate_pct).toBeGreaterThanOrEqual(0);
      expect(result.pass_rate_pct).toBeLessThanOrEqual(100);
      expect(typeof result.error_count).toBe("number");
      expect(typeof result.warning_count).toBe("number");
    }, 30000);

    it("issues have valid structure", async () => {
      const result = await machineDataHardeningEngine.validate();
      for (const issue of result.issues) {
        expect(issue.machine_id).toBeTruthy();
        expect(issue.field).toBeTruthy();
        expect(["error", "warning", "info"]).toContain(issue.severity);
        expect(issue.message).toBeTruthy();
      }
    }, 30000);

    it("validates specific machine", async () => {
      const result = await machineDataHardeningEngine.validate("haas_vf2");
      expect(result.machines_checked).toBeLessThanOrEqual(1);
    });
  });

  describe("ingestModels()", () => {
    it("returns result even for non-existent path", async () => {
      const result = await machineDataHardeningEngine.ingestModels("H:/prism/nonexistent");
      expect(result).toBeDefined();
      expect(result.files_found).toBe(0);
      expect(result.scan_path).toBe("H:/prism/nonexistent");
    });
  });

  describe("read()", () => {
    it("reads persisted hardening result after harden", async () => {
      await machineDataHardeningEngine.harden(undefined, true);
      const result = await machineDataHardeningEngine.read();
      expect(result).not.toBeNull();
      expect(result!.timestamp).toBeTruthy();
      expect(typeof result!.gaps_found).toBe("number");
    }, 30000);
  });

  describe("summary()", () => {
    it("generates markdown summary from audit", () => {
      const text = machineDataHardeningEngine.summary(auditResult);
      expect(text).toContain("# Machine Data Hardening Report");
      expect(text).toContain("Field Coverage");
      expect(text).toContain("Avg Completeness");
    });
  });
});
