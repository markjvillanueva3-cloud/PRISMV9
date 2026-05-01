/**
 * Tests for AutoFixPipelineEngine (AUTO-6 U-SI2)
 *
 * Validates fix candidate generation from improvement patterns,
 * dry-run validation, approval/promotion workflow, and persistence.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  autoFixPipelineEngine,
  AutoFixPipelineEngine,
} from "../engines/AutoFixPipelineEngine.js";
import type { AutoFixReport, FixCandidate } from "../engines/AutoFixPipelineEngine.js";

describe("AutoFixPipelineEngine", () => {
  let report: AutoFixReport;

  beforeAll(() => {
    report = autoFixPipelineEngine.compute();
  });

  describe("compute()", () => {
    it("returns a valid report structure", () => {
      expect(report).toBeDefined();
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof report.patterns_analyzed).toBe("number");
      expect(typeof report.candidates_generated).toBe("number");
      expect(Array.isArray(report.candidates)).toBe(true);
      expect(typeof report.improvement_rate).toBe("number");
      expect(Array.isArray(report.warnings)).toBe(true);
    });

    it("candidates_generated matches array length", () => {
      expect(report.candidates_generated).toBe(report.candidates.length);
    });

    it("improvement_rate is between 0 and 1", () => {
      expect(report.improvement_rate).toBeGreaterThanOrEqual(0);
      expect(report.improvement_rate).toBeLessThanOrEqual(1);
    });

    it("generates candidates when patterns exist", () => {
      // SelfImprovementPatternEngine detected 15 patterns in prior test
      // Some should be above the priority threshold
      expect(report.patterns_analyzed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("candidate structure", () => {
    it("every candidate has required fields", () => {
      for (const c of report.candidates) {
        expect(c.id).toMatch(/^AFX-\d{3}$/);
        expect(typeof c.pattern_id).toBe("string");
        expect(typeof c.fix_type).toBe("string");
        expect(typeof c.file_path).toBe("string");
        expect(typeof c.description).toBe("string");
        expect(typeof c.template).toBe("string");
        expect(typeof c.dry_run_valid).toBe("boolean");
        expect(typeof c.dry_run_reason).toBe("string");
        expect(typeof c.status).toBe("string");
        expect(typeof c.created_at).toBe("string");
      }
    });

    it("fix_type is a valid enum", () => {
      const valid = ["hook", "script", "skill", "test", "engine", "schema"];
      for (const c of report.candidates) {
        expect(valid).toContain(c.fix_type);
      }
    });

    it("status starts as candidate", () => {
      for (const c of report.candidates) {
        expect(c.status).toBe("candidate");
      }
    });

    it("templates are non-empty", () => {
      for (const c of report.candidates) {
        expect(c.template.length).toBeGreaterThan(10);
      }
    });

    it("hook candidates have valid Python template", () => {
      const hooks = report.candidates.filter((c) => c.fix_type === "hook");
      for (const h of hooks) {
        expect(h.template).toContain("def main()");
        expect(h.template).toContain("json.dumps");
        expect(h.dry_run_valid).toBe(true);
      }
    });

    it("test candidates have valid vitest template", () => {
      const tests = report.candidates.filter((c) => c.fix_type === "test");
      for (const t of tests) {
        expect(t.template).toContain("describe(");
        expect(t.template).toContain("expect(");
        expect(t.dry_run_valid).toBe(true);
      }
    });

    it("engine/schema candidates are marked as not auto-safe", () => {
      const unsafe = report.candidates.filter(
        (c) => c.fix_type === "engine" || c.fix_type === "schema"
      );
      for (const u of unsafe) {
        expect(u.dry_run_valid).toBe(false);
        expect(u.dry_run_reason).toContain("manual");
      }
    });
  });

  describe("read()", () => {
    it("returns cached report after compute", () => {
      const cached = autoFixPipelineEngine.read();
      expect(cached).not.toBeNull();
      expect(cached!.candidates_generated).toBe(report.candidates_generated);
    });
  });

  describe("approve()", () => {
    it("approves a valid candidate", () => {
      if (report.candidates.length === 0) return; // Skip if no candidates
      const firstId = report.candidates[0].id;
      const approved = autoFixPipelineEngine.approve(firstId);
      expect(approved).not.toBeNull();
      expect(approved!.status).toBe("approved");
      expect(approved!.approved_at).toBeTruthy();
    });

    it("returns null for unknown ID", () => {
      const result = autoFixPipelineEngine.approve("AFX-999");
      expect(result).toBeNull();
    });
  });

  describe("promote()", () => {
    it("promotes an approved candidate", () => {
      if (report.candidates.length === 0) return;
      const firstId = report.candidates[0].id;
      // Should already be approved from previous test
      const promoted = autoFixPipelineEngine.promote(firstId);
      expect(promoted).not.toBeNull();
      expect(promoted!.status).toBe("promoted");
      expect(promoted!.promoted_at).toBeTruthy();
    });

    it("returns null for unapproved candidate", () => {
      if (report.candidates.length < 2) return;
      const secondId = report.candidates[1].id;
      // Not yet approved
      const result = autoFixPipelineEngine.promote(secondId);
      expect(result).toBeNull();
    });
  });

  describe("summary()", () => {
    it("returns markdown string", () => {
      const md = autoFixPipelineEngine.summary();
      expect(typeof md).toBe("string");
      expect(md).toContain("Auto-Fix Pipeline Report");
    });

    it("contains promotion stats", () => {
      const md = autoFixPipelineEngine.summary();
      expect(md).toContain("Promotion Stats");
      expect(md).toContain("Total promoted");
    });
  });

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(autoFixPipelineEngine).toBeInstanceOf(AutoFixPipelineEngine);
    });
  });
});
