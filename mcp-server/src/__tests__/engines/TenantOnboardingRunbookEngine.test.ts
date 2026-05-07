import { describe, it, expect, beforeEach } from "vitest";
import { tenantOnboardingRunbookEngine } from "../../engines/TenantOnboardingRunbookEngine.js";

function makeTenant(id: string) {
  return tenantOnboardingRunbookEngine.registerTenant({
    id,
    name: "Test Tenant " + id,
    tier: "mid-market",
    residency_region: "us-east",
    mou_reference: "MOU-" + id,
    primary_contact: "ops@test.example",
  });
}

async function completeThrough(id: string, upTo: number, actor = "runbook-op") {
  const runbook = tenantOnboardingRunbookEngine.getRunbook();
  for (let i = 0; i < upTo; i++) {
    const step = runbook[i];
    tenantOnboardingRunbookEngine.startStep(id, step.id, actor);
    tenantOnboardingRunbookEngine.completeStep(id, step.id, actor, "evidence-" + step.id + "-" + id, "ok");
  }
}

describe("TenantOnboardingRunbookEngine", () => {
  beforeEach(() => {
    tenantOnboardingRunbookEngine.clearAll();
  });

  describe("runbook definition", () => {
    it("has 6 default steps in correct MOU→mTLS order", () => {
      const runbook = tenantOnboardingRunbookEngine.getRunbook();
      expect(runbook.length).toBe(6);
      expect(runbook.map(s => s.id)).toEqual([
        "mou",
        "kms_key_provision",
        "acl_setup",
        "rbac_assignment",
        "residency_routing",
        "mtls_cert_issuance",
      ]);
      for (let i = 0; i < runbook.length; i++) {
        expect(runbook[i].order).toBe(i + 1);
      }
    });

    it("each step after MOU has exactly one prerequisite (linear dependency chain)", () => {
      const runbook = tenantOnboardingRunbookEngine.getRunbook();
      expect(runbook[0].prerequisite_ids.length).toBe(0);
      for (let i = 1; i < runbook.length; i++) {
        expect(runbook[i].prerequisite_ids).toEqual([runbook[i - 1].id]);
      }
    });
  });

  describe("tenant registration", () => {
    it("registers a tenant with pending status and full step states initialized", () => {
      const t = makeTenant("acme");
      expect(t.status).toBe("pending");
      const status = tenantOnboardingRunbookEngine.getTenantStatus("acme");
      expect(status.completed_step_ids.length).toBe(0);
      expect(status.percent_complete).toBe(0);
      expect(status.next_actionable).toBe("mou");
    });

    it("rejects duplicate registration", () => {
      makeTenant("dup");
      expect(() => makeTenant("dup")).toThrow(/already registered/);
    });

    it("requires id, residency_region, and mou_reference", () => {
      expect(() => tenantOnboardingRunbookEngine.registerTenant({
        id: "",
        name: "x",
        tier: "smb",
        residency_region: "us-east",
        mou_reference: "MOU-1",
        primary_contact: "x",
      })).toThrow(/tenant.id required/);

      expect(() => tenantOnboardingRunbookEngine.registerTenant({
        id: "x",
        name: "x",
        tier: "smb",
        residency_region: "",
        mou_reference: "MOU-1",
        primary_contact: "x",
      })).toThrow(/residency_region required/);
    });

    it("filters tenants by tier, status, and region", () => {
      tenantOnboardingRunbookEngine.registerTenant({
        id: "ent-1", name: "Ent", tier: "enterprise",
        residency_region: "eu-west", mou_reference: "M1", primary_contact: "x",
      });
      tenantOnboardingRunbookEngine.registerTenant({
        id: "smb-1", name: "SMB", tier: "smb",
        residency_region: "us-east", mou_reference: "M2", primary_contact: "x",
      });
      expect(tenantOnboardingRunbookEngine.listTenants({ tier: "enterprise" }).length).toBe(1);
      expect(tenantOnboardingRunbookEngine.listTenants({ region: "us-east" }).length).toBe(1);
    });
  });

  describe("dependency enforcement", () => {
    it("blocks starting a step when its prerequisite is not complete", () => {
      makeTenant("dep-test");
      expect(() => tenantOnboardingRunbookEngine.startStep("dep-test", "kms_key_provision", "op"))
        .toThrow(/Prerequisite not complete: mou/);
    });

    it("allows starting a step once all prerequisites complete", async () => {
      makeTenant("dep-ok");
      await completeThrough("dep-ok", 1); // only mou
      const s = tenantOnboardingRunbookEngine.startStep("dep-ok", "kms_key_provision", "op");
      expect(s.status).toBe("in_progress");
    });
  });

  describe("step lifecycle", () => {
    it("transitions not_started → in_progress → complete with evidence", () => {
      makeTenant("lifecycle");
      const started = tenantOnboardingRunbookEngine.startStep("lifecycle", "mou", "legal");
      expect(started.status).toBe("in_progress");
      expect(started.started_at).not.toBeNull();
      const completed = tenantOnboardingRunbookEngine.completeStep("lifecycle", "mou", "legal", "CONTRACT-42", "signed");
      expect(completed.status).toBe("complete");
      expect(completed.evidence_ref).toBe("CONTRACT-42");
      expect(completed.completed_at).not.toBeNull();
    });

    it("requires evidence_ref to complete", () => {
      makeTenant("evid");
      tenantOnboardingRunbookEngine.startStep("evid", "mou", "op");
      expect(() => tenantOnboardingRunbookEngine.completeStep("evid", "mou", "op", "", "x"))
        .toThrow(/evidence_ref required/);
    });

    it("refuses complete on a non-in_progress step", () => {
      makeTenant("wrong");
      expect(() => tenantOnboardingRunbookEngine.completeStep("wrong", "mou", "op", "evt", "x"))
        .toThrow(/must be in_progress/);
    });

    it("fails a step with reason and transitions to failed", () => {
      makeTenant("fail");
      tenantOnboardingRunbookEngine.startStep("fail", "mou", "op");
      const f = tenantOnboardingRunbookEngine.failStep("fail", "mou", "op", "legal blocked");
      expect(f.status).toBe("failed");
      expect(f.notes).toBe("legal blocked");
    });

    it("refuses to fail a completed step", async () => {
      makeTenant("nofail");
      await completeThrough("nofail", 1);
      expect(() => tenantOnboardingRunbookEngine.failStep("nofail", "mou", "op", "x"))
        .toThrow(/Cannot fail a completed step/);
    });

    it("resets a failed step back to not_started", () => {
      makeTenant("reset");
      tenantOnboardingRunbookEngine.startStep("reset", "mou", "op");
      tenantOnboardingRunbookEngine.failStep("reset", "mou", "op", "retry needed");
      const r = tenantOnboardingRunbookEngine.resetStep("reset", "mou", "admin", "remediated");
      expect(r.status).toBe("not_started");
      expect(r.started_at).toBeNull();
    });
  });

  describe("tenant status aggregation", () => {
    it("activates tenant when all 6 steps complete", async () => {
      makeTenant("full");
      await completeThrough("full", 6);
      const t = tenantOnboardingRunbookEngine.getTenant("full")!;
      expect(t.status).toBe("active");
      const s = tenantOnboardingRunbookEngine.getTenantStatus("full");
      expect(s.percent_complete).toBe(100);
      expect(s.next_actionable).toBeNull();
    });

    it("reports percent_complete correctly mid-pipeline", async () => {
      makeTenant("mid");
      await completeThrough("mid", 3);
      const s = tenantOnboardingRunbookEngine.getTenantStatus("mid");
      expect(s.completed_step_ids.length).toBe(3);
      expect(s.percent_complete).toBeCloseTo(50, 5);
      expect(s.next_actionable).toBe("rbac_assignment");
    });

    it("lists blocked_on steps waiting on incomplete prerequisites", () => {
      makeTenant("blocked");
      // no mou started — all downstream steps blocked
      const s = tenantOnboardingRunbookEngine.getTenantStatus("blocked");
      expect(s.blocked_on.length).toBe(5); // all but mou
    });
  });

  describe("audit log", () => {
    it("emits events for every transition", () => {
      makeTenant("audit");
      tenantOnboardingRunbookEngine.startStep("audit", "mou", "op");
      tenantOnboardingRunbookEngine.completeStep("audit", "mou", "op", "ev", "ok");
      const log = tenantOnboardingRunbookEngine.getAuditLog("audit");
      expect(log.length).toBe(2);
      expect(log[0].from_status).toBe("not_started");
      expect(log[0].to_status).toBe("in_progress");
      expect(log[1].to_status).toBe("complete");
    });

    it("filters audit log by tenant", () => {
      makeTenant("a1");
      makeTenant("a2");
      tenantOnboardingRunbookEngine.startStep("a1", "mou", "op");
      tenantOnboardingRunbookEngine.startStep("a2", "mou", "op");
      expect(tenantOnboardingRunbookEngine.getAuditLog("a1").length).toBe(1);
      expect(tenantOnboardingRunbookEngine.getAuditLog().length).toBe(2);
    });
  });

  describe("report and stats", () => {
    it("reports per-step completion rates across tenants", async () => {
      makeTenant("r1");
      makeTenant("r2");
      makeTenant("r3");
      await completeThrough("r1", 6);
      await completeThrough("r2", 3);
      // r3 untouched
      const report = tenantOnboardingRunbookEngine.generateReport();
      expect(report.total_tenants).toBe(3);
      expect(report.step_completion_rates.mou.complete).toBe(2);
      expect(report.step_completion_rates.mtls_cert_issuance.complete).toBe(1);
      expect(report.tenants_active.length).toBe(1);
    });

    it("flags stalled tenants (>7 days no activity)", async () => {
      makeTenant("stall");
      tenantOnboardingRunbookEngine.startStep("stall", "mou", "op");
      // Simulate 8-day-old activity by evaluating "now" 8 days after
      const eightDaysMs = 8 * 24 * 3600 * 1000;
      const now = Date.now() + eightDaysMs;
      const report = tenantOnboardingRunbookEngine.generateReport(now);
      expect(report.tenants_stalled).toContain("stall");
    });

    it("aggregates stats including avg_time_to_active for completed tenants", async () => {
      makeTenant("stats");
      await completeThrough("stats", 6);
      const stats = tenantOnboardingRunbookEngine.getStats();
      expect(stats.tenants_registered).toBe(1);
      expect(stats.tenants_active).toBe(1);
      expect(stats.steps_executed).toBe(6);
      expect(stats.steps_failed).toBe(0);
      expect(stats.avg_time_to_active_hours).not.toBeNull();
    });
  });
});
