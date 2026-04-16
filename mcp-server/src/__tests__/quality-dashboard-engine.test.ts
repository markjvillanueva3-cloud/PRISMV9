/**
 * Tests for QualityDashboardEngine (AUTO-7 U-CD1)
 *
 * Validates dashboard aggregation from multiple quality data sources,
 * per-domain breakdown, alert generation, trend tracking, and persistence.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  qualityDashboardEngine,
  QualityDashboardEngine,
} from "../engines/QualityDashboardEngine.js";
import type { DashboardSnapshot, DomainMetrics, AlertEntry } from "../engines/QualityDashboardEngine.js";

describe("QualityDashboardEngine", () => {
  let snapshot: DashboardSnapshot;

  beforeAll(() => {
    snapshot = qualityDashboardEngine.compute();
  });

  describe("compute()", () => {
    it("returns a valid snapshot structure", () => {
      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(snapshot.version).toBe("1.0.0");
      expect(typeof snapshot.system_Q).toBe("number");
      expect(typeof snapshot.mean_Q).toBe("number");
      expect(typeof snapshot.total_engines).toBe("number");
      expect(typeof snapshot.engines_above_90).toBe("number");
      expect(typeof snapshot.engines_below_70).toBe("number");
    });

    it("has valid dimension averages", () => {
      const d = snapshot.dimension_averages;
      expect(typeof d.W).toBe("number");
      expect(typeof d.T).toBe("number");
      expect(typeof d.P).toBe("number");
      expect(typeof d.S).toBe("number");
      expect(typeof d.D).toBe("number");
      expect(typeof d.A).toBe("number");
      for (const key of ["W", "T", "P", "S", "D", "A"] as const) {
        expect(d[key]).toBeGreaterThanOrEqual(0);
        expect(d[key]).toBeLessThanOrEqual(1);
      }
    });

    it("has SVI section", () => {
      expect(snapshot.svi).toBeDefined();
      expect(typeof snapshot.svi.value).toBe("string");
      expect(typeof snapshot.svi.psi_pct).toBe("number");
      expect(typeof snapshot.svi.trend).toBe("string");
      expect(typeof snapshot.svi.subsystem_count).toBe("number");
    });

    it("has formula accuracy section", () => {
      const fa = snapshot.formula_accuracy;
      expect(typeof fa.aggregate_accuracy).toBe("number");
      expect(typeof fa.formulas_validated).toBe("number");
      expect(typeof fa.formulas_passed).toBe("number");
      expect(typeof fa.formulas_failed).toBe("number");
      expect(fa.aggregate_accuracy).toBeGreaterThanOrEqual(0);
      expect(fa.aggregate_accuracy).toBeLessThanOrEqual(1);
    });

    it("has improvement section", () => {
      const imp = snapshot.improvement;
      expect(typeof imp.patterns_detected).toBe("number");
      expect(typeof imp.fixes_generated).toBe("number");
      expect(typeof imp.fixes_promoted).toBe("number");
      expect(typeof imp.improvement_rate).toBe("number");
      expect(imp.improvement_rate).toBeGreaterThanOrEqual(0);
      expect(imp.improvement_rate).toBeLessThanOrEqual(1);
    });

    it("has test health section", () => {
      expect(typeof snapshot.tests.test_files).toBe("number");
      expect(snapshot.tests.test_files).toBeGreaterThan(0);
      expect(typeof snapshot.tests.pass_rate).toBe("number");
    });

    it("has schema coverage section", () => {
      const sc = snapshot.schema_coverage;
      expect(typeof sc.actions_with_schema).toBe("number");
      expect(typeof sc.total_actions).toBe("number");
      expect(typeof sc.coverage_pct).toBe("number");
      expect(sc.coverage_pct).toBeGreaterThanOrEqual(0);
      expect(sc.coverage_pct).toBeLessThanOrEqual(100);
    });

    it("engines_above_90 + engines_below_70 <= total_engines", () => {
      expect(snapshot.engines_above_90 + snapshot.engines_below_70).toBeLessThanOrEqual(snapshot.total_engines);
    });
  });

  describe("domains", () => {
    it("returns domain breakdown array", () => {
      expect(Array.isArray(snapshot.domains)).toBe(true);
    });

    it("each domain has required fields", () => {
      for (const dm of snapshot.domains) {
        expect(typeof dm.domain).toBe("string");
        expect(typeof dm.engine_count).toBe("number");
        expect(typeof dm.mean_Q).toBe("number");
        expect(typeof dm.min_Q).toBe("number");
        expect(typeof dm.above_90_pct).toBe("number");
        expect(typeof dm.below_70_count).toBe("number");
        expect(dm.engine_count).toBeGreaterThan(0);
      }
    });

    it("domain engine counts sum to total (if quality scores exist)", () => {
      if (snapshot.total_engines > 0) {
        const domainTotal = snapshot.domains.reduce((sum, d) => sum + d.engine_count, 0);
        expect(domainTotal).toBe(snapshot.total_engines);
      }
    });

    it("domains are sorted by mean_Q ascending", () => {
      for (let i = 1; i < snapshot.domains.length; i++) {
        expect(snapshot.domains[i].mean_Q).toBeGreaterThanOrEqual(snapshot.domains[i - 1].mean_Q);
      }
    });
  });

  describe("alerts", () => {
    it("alerts array exists", () => {
      expect(Array.isArray(snapshot.alerts)).toBe(true);
    });

    it("each alert has required fields", () => {
      for (const a of snapshot.alerts) {
        expect(["critical", "high", "medium", "info"]).toContain(a.severity);
        expect(typeof a.category).toBe("string");
        expect(typeof a.message).toBe("string");
        expect(a.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it("alerts are sorted by severity (critical first)", () => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, info: 3 };
      for (let i = 1; i < snapshot.alerts.length; i++) {
        expect(order[snapshot.alerts[i].severity]).toBeGreaterThanOrEqual(order[snapshot.alerts[i - 1].severity]);
      }
    });
  });

  describe("trend", () => {
    it("trend array exists with at least 1 entry", () => {
      expect(Array.isArray(snapshot.trend)).toBe(true);
      expect(snapshot.trend.length).toBeGreaterThanOrEqual(1);
    });

    it("each trend entry has required fields", () => {
      for (const t of snapshot.trend) {
        expect(t.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(typeof t.system_Q).toBe("number");
        expect(typeof t.mean_Q).toBe("number");
        expect(typeof t.psi_pct).toBe("number");
        expect(typeof t.formula_accuracy).toBe("number");
      }
    });

    it("trend is capped at 10 entries", () => {
      expect(snapshot.trend.length).toBeLessThanOrEqual(10);
    });
  });

  describe("read()", () => {
    it("returns cached snapshot after compute", () => {
      const cached = qualityDashboardEngine.read();
      expect(cached).not.toBeNull();
      expect(cached!.timestamp).toBe(snapshot.timestamp);
      expect(cached!.system_Q).toBe(snapshot.system_Q);
    });
  });

  describe("summary()", () => {
    it("returns markdown string", () => {
      const md = qualityDashboardEngine.summary();
      expect(typeof md).toBe("string");
      expect(md).toContain("PRISM Quality Dashboard");
    });

    it("contains all section headers", () => {
      const md = qualityDashboardEngine.summary();
      expect(md).toContain("System Health");
      expect(md).toContain("Dimensions");
      expect(md).toContain("SVI");
      expect(md).toContain("Formula Accuracy");
      expect(md).toContain("Self-Improvement");
      expect(md).toContain("Tests & Schemas");
      expect(md).toContain("Domains");
    });

    it("includes alert section when alerts exist", () => {
      const md = qualityDashboardEngine.summary();
      if (snapshot.alerts.length > 0) {
        expect(md).toContain("Alerts");
      }
    });
  });

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(qualityDashboardEngine).toBeInstanceOf(QualityDashboardEngine);
    });
  });
});
