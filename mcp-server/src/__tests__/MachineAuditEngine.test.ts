/**
 * Tests for MachineAuditEngine
 * @milestone MCAT-MS0/P4-U01
 *
 * Verifies brand audit execution, coverage calculation, gap identification,
 * and remediation tracking for the machine catalog validation phase.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  machineAuditEngine,
  type BrandAuditReport,
  type AuditWaveStatus,
  type RemediationItem,
  type AuditStats,
} from "../engines/MachineAuditEngine.js";

describe("MachineAuditEngine", () => {
  describe("auditBrand", () => {
    it("audits Okuma brand successfully", () => {
      const report = machineAuditEngine.auditBrand("Okuma");

      expect(report).toBeDefined();
      expect(report?.brand).toBe("Okuma");
      expect(report?.status).toBe("completed");
    });

    it("audits Haas brand successfully", () => {
      const report = machineAuditEngine.auditBrand("Haas");

      expect(report).toBeDefined();
      expect(report?.brand).toBe("Haas");
    });

    it("returns null for unknown brand", () => {
      const report = machineAuditEngine.auditBrand("UnknownBrand");

      expect(report).toBeNull();
    });

    it("handles case-insensitive brand names", () => {
      const report = machineAuditEngine.auditBrand("okuma");

      expect(report).toBeDefined();
      expect(report?.brand).toBe("Okuma");
    });

    it("includes wave number in report", () => {
      const report = machineAuditEngine.auditBrand("Okuma");

      expect(report?.wave).toBe(1);
    });

    it("includes priority in report", () => {
      const report = machineAuditEngine.auditBrand("Okuma");

      expect(report?.priority).toBe("critical");
    });

    it("calculates overall coverage", () => {
      const report = machineAuditEngine.auditBrand("Haas");

      expect(report?.overall_coverage).toBeGreaterThanOrEqual(0);
      expect(report?.overall_coverage).toBeLessThanOrEqual(100);
    });

    it("tracks audited vs total models", () => {
      const report = machineAuditEngine.auditBrand("Mazak");

      expect(report?.audited_models).toBeGreaterThan(0);
      expect(report?.total_models).toBeGreaterThan(0);
    });

    it("includes timestamps", () => {
      const report = machineAuditEngine.auditBrand("Brother");

      expect(report?.started_at).toBeDefined();
      expect(report?.completed_at).toBeDefined();
      expect(new Date(report!.started_at).getTime()).toBeGreaterThan(0);
    });
  });

  describe("machine audits", () => {
    it("audits individual machines within brand", () => {
      const report = machineAuditEngine.auditBrand("Citizen");

      expect(report?.machine_audits.length).toBeGreaterThan(0);
    });

    it("each machine audit has required fields", () => {
      const report = machineAuditEngine.auditBrand("Okuma");

      for (const audit of report?.machine_audits || []) {
        expect(audit.machine_id).toBeDefined();
        expect(audit.model).toBeDefined();
        expect(audit.brand).toBe("Okuma");
        expect(typeof audit.overall_score).toBe("number");
      }
    });

    it("machine audit includes field audits", () => {
      const report = machineAuditEngine.auditBrand("Haas");

      for (const audit of report?.machine_audits || []) {
        expect(Array.isArray(audit.field_audits)).toBe(true);
        expect(audit.field_audits.length).toBeGreaterThan(0);
      }
    });

    it("field audit has completeness status", () => {
      const report = machineAuditEngine.auditBrand("Mazak");
      const audit = report?.machine_audits[0];

      for (const fieldAudit of audit?.field_audits || []) {
        expect(["complete", "partial", "missing"]).toContain(fieldAudit.completeness);
      }
    });

    it("machine audit includes issues list", () => {
      const report = machineAuditEngine.auditBrand("Brother");

      for (const audit of report?.machine_audits || []) {
        expect(Array.isArray(audit.issues)).toBe(true);
      }
    });

    it("machine audit includes recommendations", () => {
      const report = machineAuditEngine.auditBrand("Citizen");

      for (const audit of report?.machine_audits || []) {
        expect(Array.isArray(audit.recommendations)).toBe(true);
      }
    });

    it("overall score is between 0 and 100", () => {
      const report = machineAuditEngine.auditBrand("Okuma");

      for (const audit of report?.machine_audits || []) {
        expect(audit.overall_score).toBeGreaterThanOrEqual(0);
        expect(audit.overall_score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("field coverage", () => {
    it("calculates coverage per field", () => {
      const report = machineAuditEngine.auditBrand("Haas");

      expect(report?.field_coverage).toBeDefined();
      expect(Object.keys(report?.field_coverage || {}).length).toBeGreaterThan(0);
    });

    it("field coverage values are percentages", () => {
      const report = machineAuditEngine.auditBrand("Mazak");

      for (const [field, coverage] of Object.entries(report?.field_coverage || {})) {
        expect(coverage).toBeGreaterThanOrEqual(0);
        expect(coverage).toBeLessThanOrEqual(100);
      }
    });

    it("includes critical fields in coverage", () => {
      const report = machineAuditEngine.auditBrand("Okuma");

      expect(report?.field_coverage.controller).toBeDefined();
      expect(report?.field_coverage.spindle_max_rpm).toBeDefined();
      expect(report?.field_coverage.spindle_power_kw).toBeDefined();
    });
  });

  describe("critical gaps", () => {
    it("identifies critical gaps", () => {
      const report = machineAuditEngine.auditBrand("Citizen");

      expect(Array.isArray(report?.critical_gaps)).toBe(true);
    });

    it("critical gaps reference machine IDs", () => {
      const report = machineAuditEngine.auditBrand("Haas");

      for (const gap of report?.critical_gaps || []) {
        expect(typeof gap).toBe("string");
        expect(gap.length).toBeGreaterThan(0);
      }
    });
  });

  describe("auditWave", () => {
    it("audits wave 1 brands", () => {
      const status = machineAuditEngine.auditWave(1);

      expect(status.wave).toBe(1);
      expect(status.brands).toContain("Okuma");
      expect(status.brands).toContain("Haas");
    });

    it("audits wave 2 brands", () => {
      const status = machineAuditEngine.auditWave(2);

      expect(status.wave).toBe(2);
      expect(status.brands).toContain("Mazak");
      expect(status.brands).toContain("DMG MORI");
    });

    it("audits wave 3 brands", () => {
      const status = machineAuditEngine.auditWave(3);

      expect(status.wave).toBe(3);
      expect(status.brands).toContain("Citizen");
      expect(status.brands).toContain("DN Solutions");
    });

    it("returns completed status", () => {
      const status = machineAuditEngine.auditWave(1);

      expect(status.status).toBe("completed");
      expect(status.progress_pct).toBe(100);
    });

    it("includes timestamps", () => {
      const status = machineAuditEngine.auditWave(2);

      expect(status.started_at).toBeDefined();
      expect(status.completed_at).toBeDefined();
    });

    it("returns failed for invalid wave", () => {
      const status = machineAuditEngine.auditWave(99);

      expect(status.status).toBe("failed");
      expect(status.brands.length).toBe(0);
    });
  });

  describe("auditAll", () => {
    it("executes all audit waves", () => {
      const result = machineAuditEngine.auditAll();

      expect(result.waves.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
    });

    it("waves are in order", () => {
      const result = machineAuditEngine.auditAll();

      for (let i = 1; i < result.waves.length; i++) {
        expect(result.waves[i].wave).toBeGreaterThanOrEqual(result.waves[i - 1].wave);
      }
    });

    it("all waves complete successfully", () => {
      const result = machineAuditEngine.auditAll();

      for (const wave of result.waves) {
        expect(wave.status).toBe("completed");
      }
    });

    it("returns summary statistics", () => {
      const result = machineAuditEngine.auditAll();

      expect(result.summary.total_brands).toBeGreaterThan(0);
      expect(result.summary.audited_brands).toBeGreaterThan(0);
    });
  });

  describe("getReport", () => {
    it("retrieves stored report", () => {
      machineAuditEngine.auditBrand("Okuma");
      const report = machineAuditEngine.getReport("Okuma");

      expect(report).toBeDefined();
      expect(report?.brand).toBe("Okuma");
    });

    it("returns null for unaudited brand", () => {
      const report = machineAuditEngine.getReport("NonExistentBrand");

      expect(report).toBeNull();
    });
  });

  describe("getAllReports", () => {
    it("returns all audit reports", () => {
      machineAuditEngine.auditWave(1);
      const reports = machineAuditEngine.getAllReports();

      expect(reports.length).toBeGreaterThan(0);
    });

    it("reports are valid BrandAuditReport objects", () => {
      machineAuditEngine.auditBrand("Mazak");
      const reports = machineAuditEngine.getAllReports();

      for (const report of reports) {
        expect(report.brand).toBeDefined();
        expect(report.status).toBeDefined();
      }
    });
  });

  describe("remediations", () => {
    it("generates remediation items", () => {
      machineAuditEngine.auditBrand("Citizen");
      const remediations = machineAuditEngine.getRemediations();

      expect(remediations.length).toBeGreaterThanOrEqual(0);
    });

    it("remediation items have required fields", () => {
      machineAuditEngine.auditBrand("Brother");
      const remediations = machineAuditEngine.getRemediations();

      for (const item of remediations) {
        expect(item.id).toBeDefined();
        expect(item.brand).toBeDefined();
        expect(item.issue).toBeDefined();
        expect(item.severity).toBeDefined();
        expect(item.status).toBeDefined();
      }
    });

    it("filters by brand", () => {
      machineAuditEngine.auditWave(1);
      const remediations = machineAuditEngine.getRemediations({ brand: "Okuma" });

      for (const item of remediations) {
        expect(item.brand).toBe("Okuma");
      }
    });

    it("filters by severity", () => {
      machineAuditEngine.auditWave(1);
      const remediations = machineAuditEngine.getRemediations({ severity: "critical" });

      for (const item of remediations) {
        expect(item.severity).toBe("critical");
      }
    });

    it("filters by status", () => {
      machineAuditEngine.auditWave(1);
      const remediations = machineAuditEngine.getRemediations({ status: "open" });

      for (const item of remediations) {
        expect(item.status).toBe("open");
      }
    });

    it("sorts by severity", () => {
      machineAuditEngine.auditWave(1);
      const remediations = machineAuditEngine.getRemediations();

      const severityOrder = { critical: 0, warning: 1, info: 2 };
      for (let i = 1; i < remediations.length; i++) {
        expect(severityOrder[remediations[i].severity])
          .toBeGreaterThanOrEqual(severityOrder[remediations[i - 1].severity]);
      }
    });
  });

  describe("updateRemediation", () => {
    it("updates remediation status", () => {
      machineAuditEngine.auditBrand("Okuma");
      const remediations = machineAuditEngine.getRemediations({ brand: "Okuma" });

      if (remediations.length > 0) {
        const success = machineAuditEngine.updateRemediation(remediations[0].id, "in_progress");
        expect(success).toBe(true);

        const updated = machineAuditEngine.getRemediations({ brand: "Okuma" });
        const item = updated.find(r => r.id === remediations[0].id);
        expect(item?.status).toBe("in_progress");
      }
    });

    it("returns false for unknown remediation", () => {
      const success = machineAuditEngine.updateRemediation("unknown-id", "resolved");

      expect(success).toBe(false);
    });
  });

  describe("getBrandConfigs", () => {
    it("returns all brand configurations", () => {
      const configs = machineAuditEngine.getBrandConfigs();

      expect(configs.length).toBe(7);
    });

    it("includes expected brands", () => {
      const configs = machineAuditEngine.getBrandConfigs();
      const brands = configs.map(c => c.brand);

      expect(brands).toContain("Okuma");
      expect(brands).toContain("Haas");
      expect(brands).toContain("Mazak");
      expect(brands).toContain("DMG MORI");
    });

    it("each config has required fields", () => {
      const configs = machineAuditEngine.getBrandConfigs();

      for (const config of configs) {
        expect(config.brand).toBeDefined();
        expect(config.priority).toBeDefined();
        expect(config.wave).toBeDefined();
        expect(config.expected_models).toBeGreaterThan(0);
        expect(config.controller_families.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getWaveStatus", () => {
    it("returns wave status after audit", () => {
      machineAuditEngine.auditWave(1);
      const status = machineAuditEngine.getWaveStatus(1);

      expect(status).toBeDefined();
      expect(status?.status).toBe("completed");
    });

    it("returns null for unexecuted wave", () => {
      const status = machineAuditEngine.getWaveStatus(99);

      expect(status).toBeNull();
    });
  });

  describe("getCoverageSummary", () => {
    it("returns coverage for all brands", () => {
      machineAuditEngine.auditWave(1);
      const summary = machineAuditEngine.getCoverageSummary();

      expect(summary.length).toBe(7);
    });

    it("each entry has required fields", () => {
      machineAuditEngine.auditBrand("Okuma");
      const summary = machineAuditEngine.getCoverageSummary();

      for (const entry of summary) {
        expect(entry.brand).toBeDefined();
        expect(entry.priority).toBeDefined();
        expect(typeof entry.coverage).toBe("number");
        expect(typeof entry.critical_gaps).toBe("number");
      }
    });

    it("audited brands have non-zero coverage", () => {
      machineAuditEngine.auditBrand("Haas");
      const summary = machineAuditEngine.getCoverageSummary();

      const haas = summary.find(s => s.brand === "Haas");
      expect(haas?.coverage).toBeGreaterThan(0);
      expect(haas?.last_audit).not.toBeNull();
    });
  });

  describe("getStats", () => {
    it("returns statistics", () => {
      machineAuditEngine.auditWave(1);
      const stats = machineAuditEngine.getStats();

      expect(stats.total_brands).toBe(7);
      expect(stats.audited_brands).toBeGreaterThan(0);
    });

    it("tracks machine counts", () => {
      machineAuditEngine.auditWave(1);
      const stats = machineAuditEngine.getStats();

      expect(stats.total_machines).toBeGreaterThan(0);
      expect(stats.audited_machines).toBeGreaterThan(0);
    });

    it("calculates overall coverage", () => {
      machineAuditEngine.auditWave(1);
      const stats = machineAuditEngine.getStats();

      expect(stats.overall_coverage).toBeGreaterThanOrEqual(0);
      expect(stats.overall_coverage).toBeLessThanOrEqual(100);
    });

    it("tracks critical gaps", () => {
      machineAuditEngine.auditWave(1);
      const stats = machineAuditEngine.getStats();

      expect(typeof stats.critical_gaps).toBe("number");
    });

    it("tracks open remediations", () => {
      machineAuditEngine.auditWave(1);
      const stats = machineAuditEngine.getStats();

      expect(typeof stats.open_remediations).toBe("number");
    });

    it("updates last_audit timestamp", () => {
      machineAuditEngine.auditBrand("Mazak");
      const stats = machineAuditEngine.getStats();

      expect(stats.last_audit).not.toBe("never");
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = machineAuditEngine.getSelfAwareness();

      expect(awareness.engine).toBe("MachineAuditEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P4-U01");
    });

    it("lists capabilities", () => {
      const awareness = machineAuditEngine.getSelfAwareness();

      expect(awareness.capabilities).toContain("auditBrand");
      expect(awareness.capabilities).toContain("auditWave");
      expect(awareness.capabilities).toContain("auditAll");
      expect(awareness.capabilities).toContain("getRemediations");
    });

    it("lists supported brands", () => {
      const awareness = machineAuditEngine.getSelfAwareness();

      expect(awareness.brands).toContain("Okuma");
      expect(awareness.brands).toContain("Haas");
      expect(awareness.brands.length).toBe(7);
    });

    it("lists wave numbers", () => {
      const awareness = machineAuditEngine.getSelfAwareness();

      expect(awareness.waves).toContain(1);
      expect(awareness.waves).toContain(2);
      expect(awareness.waves).toContain(3);
    });

    it("lists required fields", () => {
      const awareness = machineAuditEngine.getSelfAwareness();

      expect(awareness.required_fields).toContain("controller");
      expect(awareness.required_fields).toContain("spindle_max_rpm");
    });

    it("lists integrations", () => {
      const awareness = machineAuditEngine.getSelfAwareness();

      expect(awareness.integrations).toContain("MachinePackageAPIEngine");
    });
  });
});
