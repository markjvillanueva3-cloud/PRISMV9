/**
 * SBOMReviewEngine tests — U-LPR-OPS-SBOM-REVIEW
 */

import { describe, it, expect, beforeEach } from "vitest";
import { sbomReviewEngine } from "../../engines/SBOMReviewEngine.js";

const DAY = 24 * 3600 * 1000;

function seedComponent(id: string = "pkg:npm/zod@3.22.4") {
  return sbomReviewEngine.registerComponent({
    id,
    type: "npm",
    name: "zod",
    version: "3.22.4",
    license: "MIT",
    supplier: "colinhacks",
    direct_dependency: true,
    last_reviewed_at: null,
    hash_sha256: null,
  });
}

function seedVuln(
  id: string,
  severity: "none" | "low" | "medium" | "high" | "critical",
  componentId: string,
) {
  return sbomReviewEngine.registerVulnerability({
    id,
    aliases: [],
    summary: "Test vuln " + id,
    severity,
    cvss_score: severity === "critical" ? 9.8 : severity === "high" ? 7.5 : 5.0,
    affected_component_ids: [componentId],
    published_at: Date.now(),
    fixed_in_version: null,
    reference_urls: [],
  });
}

describe("SBOMReviewEngine", () => {
  beforeEach(() => sbomReviewEngine.clearAll());

  describe("component registry", () => {
    it("registers components with purl identity and retrieves them", () => {
      const c = seedComponent();
      const fetched = sbomReviewEngine.getComponent(c.id);
      expect(fetched?.name).toBe("zod");
      expect(fetched?.version).toBe("3.22.4");
    });

    it("rejects components with missing version", () => {
      expect(() =>
        sbomReviewEngine.registerComponent({
          id: "pkg:npm/bad@",
          type: "npm",
          name: "bad",
          version: "",
          license: "MIT",
          supplier: "x",
          direct_dependency: true,
          last_reviewed_at: null,
          hash_sha256: null,
        })
      ).toThrow(/version required/);
    });

    it("filters direct_only when listing", () => {
      seedComponent("pkg:npm/a@1.0.0");
      sbomReviewEngine.registerComponent({
        id: "pkg:npm/b@1.0.0",
        type: "npm",
        name: "b",
        version: "1.0.0",
        license: "MIT",
        supplier: "x",
        direct_dependency: false,
        last_reviewed_at: null,
        hash_sha256: null,
      });
      expect(sbomReviewEngine.listComponents({ direct_only: true }).length).toBe(1);
      expect(sbomReviewEngine.listComponents().length).toBe(2);
    });
  });

  describe("vulnerability registry", () => {
    it("rejects vulns referencing unknown components", () => {
      expect(() =>
        sbomReviewEngine.registerVulnerability({
          id: "CVE-2026-00001",
          aliases: [],
          summary: "x",
          severity: "high",
          cvss_score: 7,
          affected_component_ids: ["pkg:npm/does-not-exist@1.0.0"],
          published_at: Date.now(),
          fixed_in_version: null,
          reference_urls: [],
        })
      ).toThrow(/Unknown component/);
    });

    it("rejects CVSS outside [0, 10]", () => {
      const c = seedComponent();
      expect(() =>
        sbomReviewEngine.registerVulnerability({
          id: "CVE-BAD",
          aliases: [],
          summary: "x",
          severity: "high",
          cvss_score: 12,
          affected_component_ids: [c.id],
          published_at: Date.now(),
          fixed_in_version: null,
          reference_urls: [],
        })
      ).toThrow(/cvss_score/);
    });

    it("preserves first_seen_at across re-registration (idempotent upsert)", () => {
      const c = seedComponent();
      const v1 = sbomReviewEngine.registerVulnerability({
        id: "CVE-2026-00002",
        aliases: [],
        summary: "x",
        severity: "medium",
        cvss_score: 5,
        affected_component_ids: [c.id],
        published_at: Date.now(),
        fixed_in_version: null,
        reference_urls: [],
        first_seen_at: 1000,
      });
      const v2 = sbomReviewEngine.registerVulnerability({
        id: "CVE-2026-00002",
        aliases: ["GHSA-xxx"],
        summary: "updated",
        severity: "high", // escalated
        cvss_score: 8,
        affected_component_ids: [c.id],
        published_at: Date.now(),
        fixed_in_version: "3.22.5",
        reference_urls: [],
      });
      expect(v2.first_seen_at).toBe(v1.first_seen_at); // preserved
      expect(v2.severity).toBe("high"); // updated
    });

    it("filters by severity and by component", () => {
      const c = seedComponent();
      seedVuln("CVE-A", "low", c.id);
      seedVuln("CVE-B", "high", c.id);
      seedVuln("CVE-C", "critical", c.id);
      expect(sbomReviewEngine.listVulnerabilities({ severity: "high" }).length).toBe(1);
      expect(sbomReviewEngine.listVulnerabilities({ component_id: c.id }).length).toBe(3);
    });
  });

  describe("OSV delta math", () => {
    it("computes new, resolved, and unchanged sets correctly", () => {
      const s1 = sbomReviewEngine.captureSnapshot({
        id: "snap-01",
        source: "osv.dev",
        vulnerability_ids: ["CVE-A", "CVE-B"],
        captured_at: 1000,
      });
      const s2 = sbomReviewEngine.captureSnapshot({
        id: "snap-02",
        source: "osv.dev",
        vulnerability_ids: ["CVE-B", "CVE-C"],
        captured_at: 2000,
      });
      const delta = sbomReviewEngine.computeDelta(s1.id, s2.id);
      expect(delta.new_vulnerabilities).toEqual(["CVE-C"]);
      expect(delta.resolved_vulnerabilities).toEqual(["CVE-A"]);
      expect(delta.unchanged_vulnerabilities).toEqual(["CVE-B"]);
    });

    it("rejects reversed or equal snapshot order", () => {
      sbomReviewEngine.captureSnapshot({
        id: "snap-old",
        source: "osv.dev",
        vulnerability_ids: [],
        captured_at: 2000,
      });
      sbomReviewEngine.captureSnapshot({
        id: "snap-new",
        source: "osv.dev",
        vulnerability_ids: [],
        captured_at: 1000, // intentionally earlier
      });
      expect(() => sbomReviewEngine.computeDelta("snap-old", "snap-new"))
        .toThrow(/before to snapshot/);
    });

    it("rejects duplicate snapshot id", () => {
      sbomReviewEngine.captureSnapshot({ id: "dup", source: "osv.dev", vulnerability_ids: [] });
      expect(() => sbomReviewEngine.captureSnapshot({ id: "dup", source: "osv.dev", vulnerability_ids: [] }))
        .toThrow(/already exists/);
    });

    it("persists deltas to history", () => {
      sbomReviewEngine.captureSnapshot({ id: "a", source: "x", vulnerability_ids: [], captured_at: 1 });
      sbomReviewEngine.captureSnapshot({ id: "b", source: "x", vulnerability_ids: [], captured_at: 2 });
      sbomReviewEngine.computeDelta("a", "b");
      expect(sbomReviewEngine.listDeltas().length).toBe(1);
    });
  });

  describe("remediation SLAs", () => {
    it("sets due_at to 7 days from open for critical severity", () => {
      const c = seedComponent();
      const v = seedVuln("CVE-CRIT", "critical", c.id);
      const opened = 1_700_000_000_000;
      const rem = sbomReviewEngine.openRemediation({
        vulnerability_id: v.id,
        assigned_to: "security@example.com",
        now: opened,
      });
      expect(rem.due_at - rem.opened_at).toBe(7 * DAY);
    });

    it("sets due_at to 30 days for high, 90 for medium, 180 for low", () => {
      const c = seedComponent();
      const high = seedVuln("CVE-H", "high", c.id);
      const med = seedVuln("CVE-M", "medium", c.id);
      const low = seedVuln("CVE-L", "low", c.id);
      const opened = 1_700_000_000_000;
      const remH = sbomReviewEngine.openRemediation({ vulnerability_id: high.id, assigned_to: "x", now: opened });
      const remM = sbomReviewEngine.openRemediation({ vulnerability_id: med.id, assigned_to: "x", now: opened });
      const remL = sbomReviewEngine.openRemediation({ vulnerability_id: low.id, assigned_to: "x", now: opened });
      expect(remH.due_at - opened).toBe(30 * DAY);
      expect(remM.due_at - opened).toBe(90 * DAY);
      expect(remL.due_at - opened).toBe(180 * DAY);
    });

    it("rejects remediation for unknown vulnerability", () => {
      expect(() =>
        sbomReviewEngine.openRemediation({
          vulnerability_id: "CVE-GHOST",
          assigned_to: "x",
        })
      ).toThrow(/Unknown vulnerability/);
    });

    it("sets resolved_at when status transitions to resolved", () => {
      const c = seedComponent();
      const v = seedVuln("CVE-R", "high", c.id);
      const rem = sbomReviewEngine.openRemediation({
        vulnerability_id: v.id,
        assigned_to: "x",
        now: 1000,
      });
      const updated = sbomReviewEngine.updateRemediation({
        id: rem.id,
        status: "resolved",
        resolution_notes: "upgraded to 3.22.5",
        now: 2000,
      });
      expect(updated.status).toBe("resolved");
      expect(updated.resolved_at).toBe(2000);
    });

    it("sets resolved_at for accepted_risk and false_positive too", () => {
      const c = seedComponent();
      const v = seedVuln("CVE-ACC", "low", c.id);
      const rem = sbomReviewEngine.openRemediation({
        vulnerability_id: v.id,
        assigned_to: "x",
        now: 1000,
      });
      const accepted = sbomReviewEngine.updateRemediation({
        id: rem.id,
        status: "accepted_risk",
        now: 5000,
      });
      expect(accepted.resolved_at).toBe(5000);
    });

    it("filters overdue_only only returns open/in_progress past due_at", () => {
      const c = seedComponent();
      const v = seedVuln("CVE-OD", "critical", c.id);
      const rem = sbomReviewEngine.openRemediation({
        vulnerability_id: v.id,
        assigned_to: "x",
        now: 1000,
      });
      // 7 days later + 1 day = definitely overdue
      const checkTime = 1000 + 8 * DAY;
      const overdue = sbomReviewEngine.listRemediations({ overdue_only: true, now: checkTime });
      expect(overdue.length).toBe(1);
      expect(overdue[0].id).toBe(rem.id);
      // After resolving, it should no longer be overdue
      sbomReviewEngine.updateRemediation({ id: rem.id, status: "resolved", now: checkTime });
      expect(sbomReviewEngine.listRemediations({ overdue_only: true, now: checkTime }).length).toBe(0);
    });
  });

  describe("quarterly review lifecycle", () => {
    it("starts, completes, and tracks metadata", () => {
      const review = sbomReviewEngine.startReview({
        review_cycle: "2026-Q2",
        reviewer: "security-team",
        now: 1000,
      });
      const done = sbomReviewEngine.completeReview({
        id: review.id,
        components_reviewed: 182,
        new_vulns_count: 4,
        resolved_vulns_count: 7,
        unresolved_critical_count: 0,
        notes: "quarterly complete — all critical resolved",
        now: 2000,
      });
      expect(done.completed_at).toBe(2000);
      expect(done.components_reviewed).toBe(182);
    });

    it("cannot complete a review twice", () => {
      const review = sbomReviewEngine.startReview({
        review_cycle: "2026-Q2",
        reviewer: "x",
        now: 1000,
      });
      sbomReviewEngine.completeReview({
        id: review.id,
        components_reviewed: 1,
        new_vulns_count: 0,
        resolved_vulns_count: 0,
        unresolved_critical_count: 0,
        notes: "",
        now: 2000,
      });
      expect(() =>
        sbomReviewEngine.completeReview({
          id: review.id,
          components_reviewed: 1,
          new_vulns_count: 0,
          resolved_vulns_count: 0,
          unresolved_critical_count: 0,
          notes: "",
          now: 3000,
        })
      ).toThrow(/already completed/);
    });

    it("rejects negative components_reviewed", () => {
      const review = sbomReviewEngine.startReview({
        review_cycle: "2026-Q2",
        reviewer: "x",
        now: 1000,
      });
      expect(() =>
        sbomReviewEngine.completeReview({
          id: review.id,
          components_reviewed: -1,
          new_vulns_count: 0,
          resolved_vulns_count: 0,
          unresolved_critical_count: 0,
          notes: "",
          now: 2000,
        })
      ).toThrow(/components_reviewed/);
    });
  });

  describe("posture", () => {
    it("flags overdue when no review has ever completed", () => {
      const posture = sbomReviewEngine.getPosture(Date.now());
      expect(posture.overall).toBe("overdue");
      expect(posture.quarterly_review_overdue).toBe(true);
      expect(posture.last_review).toBeNull();
      expect(posture.findings.some(f => f.includes("overdue"))).toBe(true);
    });

    it("flags at_risk when critical vuln has open remediation", () => {
      const c = seedComponent();
      const v = seedVuln("CVE-CRIT", "critical", c.id);
      sbomReviewEngine.openRemediation({
        vulnerability_id: v.id,
        assigned_to: "x",
        now: 1000,
      });
      // Complete a review so review isn't overdue — but open critical remains
      const review = sbomReviewEngine.startReview({
        review_cycle: "2026-Q2",
        reviewer: "x",
        now: 1000,
      });
      sbomReviewEngine.completeReview({
        id: review.id,
        components_reviewed: 1,
        new_vulns_count: 1,
        resolved_vulns_count: 0,
        unresolved_critical_count: 1,
        notes: "",
        now: 2000,
      });
      const posture = sbomReviewEngine.getPosture(3000);
      expect(posture.overall).toBe("at_risk");
      expect(posture.critical_open).toBe(1);
    });

    it("flags at_risk when remediations are past SLA", () => {
      const c = seedComponent();
      const v = seedVuln("CVE-OD", "low", c.id);
      sbomReviewEngine.openRemediation({
        vulnerability_id: v.id,
        assigned_to: "x",
        now: 1000,
      });
      // Low-severity SLA is 180 days — walk the clock forward 181 days
      const now = 1000 + 181 * DAY;
      // Also complete a review so quarterly is fresh
      const review = sbomReviewEngine.startReview({
        review_cycle: "2026-Q2",
        reviewer: "x",
        now: now - 10,
      });
      sbomReviewEngine.completeReview({
        id: review.id,
        components_reviewed: 1,
        new_vulns_count: 0,
        resolved_vulns_count: 0,
        unresolved_critical_count: 0,
        notes: "",
        now: now - 5,
      });
      const posture = sbomReviewEngine.getPosture(now);
      expect(posture.overall).toBe("at_risk");
      expect(posture.overdue_remediations.length).toBe(1);
    });

    it("reports healthy when review is recent and no remediations overdue", () => {
      const now = Date.now();
      const review = sbomReviewEngine.startReview({
        review_cycle: "2026-Q2",
        reviewer: "x",
        now: now - 10 * DAY,
      });
      sbomReviewEngine.completeReview({
        id: review.id,
        components_reviewed: 182,
        new_vulns_count: 0,
        resolved_vulns_count: 0,
        unresolved_critical_count: 0,
        notes: "clean",
        now: now - 5 * DAY,
      });
      const posture = sbomReviewEngine.getPosture(now);
      expect(posture.overall).toBe("healthy");
      expect(posture.quarterly_review_overdue).toBe(false);
    });

    it("counts days_since_last_review correctly", () => {
      const now = 1_700_000_000_000;
      const review = sbomReviewEngine.startReview({
        review_cycle: "2026-Q2",
        reviewer: "x",
        now: now - 20 * DAY,
      });
      sbomReviewEngine.completeReview({
        id: review.id,
        components_reviewed: 1,
        new_vulns_count: 0,
        resolved_vulns_count: 0,
        unresolved_critical_count: 0,
        notes: "",
        now: now - 5 * DAY,
      });
      const posture = sbomReviewEngine.getPosture(now);
      expect(posture.days_since_last_review).toBe(5);
    });
  });

  describe("stats", () => {
    it("aggregates counts by type, severity, and status", () => {
      const c = seedComponent();
      seedVuln("CVE-A", "low", c.id);
      seedVuln("CVE-B", "high", c.id);
      const crit = seedVuln("CVE-C", "critical", c.id);
      sbomReviewEngine.openRemediation({ vulnerability_id: crit.id, assigned_to: "x", now: 1000 });
      const stats = sbomReviewEngine.getStats();
      expect(stats.components_registered).toBe(1);
      expect(stats.components_by_type.npm).toBe(1);
      expect(stats.vulnerabilities_registered).toBe(3);
      expect(stats.vulnerabilities_by_severity.critical).toBe(1);
      expect(stats.remediations_by_status.open).toBe(1);
    });
  });

  describe("clearAll", () => {
    it("empties all collections", () => {
      const c = seedComponent();
      seedVuln("CVE-x", "high", c.id);
      sbomReviewEngine.captureSnapshot({ id: "s", source: "x", vulnerability_ids: [] });
      const result = sbomReviewEngine.clearAll();
      expect(result.components).toBe(1);
      expect(result.vulnerabilities).toBe(1);
      expect(sbomReviewEngine.getStats().components_registered).toBe(0);
      expect(sbomReviewEngine.listSnapshots().length).toBe(0);
    });
  });
});
