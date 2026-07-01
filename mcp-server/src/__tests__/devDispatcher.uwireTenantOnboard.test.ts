/**
 * devDispatcher U-WIRE-TENANT-ONBOARD round-trip tests — TenantOnboardingRunbookEngine.
 *
 * Validates the 4 new read actions (tenant_onboarding_stats / _runbook / _report /
 * _tenants) wire through prism_dev and that the engine's 6-step runbook,
 * prerequisite-ordering state machine, and aggregate reporting behave per its
 * NIST SP 800-53 / SOC 2 contract.
 *
 * Pattern: a LIVE dispatcher round-trip (registerDevDispatcher(shim) → capture
 * handler → invoke → assert JSON), NOT a source-grep — the singleton is cleared
 * in beforeEach so round-trip value assertions are deterministic. Reference
 * values are read from the engine body (DEFAULT_RUNBOOK: 6 steps mou→…→mtls).
 *
 * Wired slot:papa 2026-06-13 — continues the WIRE-UNWIRED-PAPA resilience/ops
 * family (DR / Backup / KillSwitch / FeedbackCollector / Chaos / Loki landed).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-TENANT-ONBOARD
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import {
  TenantOnboardingRunbookEngine,
  tenantOnboardingRunbookEngine,
  type Tenant,
} from "../engines/TenantOnboardingRunbookEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// A fully-formed tenant registration (engine fills registered_at + status).
function tenant(over: Partial<Tenant> = {}): Omit<Tenant, "registered_at" | "status"> {
  return {
    id: "T-1",
    name: "Acme",
    tier: "enterprise",
    residency_region: "us-east",
    mou_reference: "MOU-001",
    primary_contact: "ops@acme.test",
    ...over,
  };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  // Deterministic singleton state for round-trip value assertions.
  tenantOnboardingRunbookEngine.clearAll();
});

// ── Engine-direct reference values (happy path) ─────────────────────────────
describe("U-WIRE-TENANT-ONBOARD — runbook + fresh-state reference values", () => {
  it("the default runbook is the 6-step ordered chain mou→…→mtls", () => {
    const r = new TenantOnboardingRunbookEngine().getRunbook();
    expect(r.length).toBe(6);
    expect(r.map(s => s.id)).toEqual([
      "mou", "kms_key_provision", "acl_setup",
      "rbac_assignment", "residency_routing", "mtls_cert_issuance",
    ]);
    expect(r.map(s => s.order)).toEqual([1, 2, 3, 4, 5, 6]);
    // mou has no prerequisite; kms depends on mou.
    expect(r[0].prerequisite_ids).toEqual([]);
    expect(r[1].prerequisite_ids).toEqual(["mou"]);
  });

  it("a fresh engine has all-zero stats with null avg_time_to_active", () => {
    const s = new TenantOnboardingRunbookEngine().getStats();
    expect(s.tenants_registered).toBe(0);
    expect(s.tenants_active).toBe(0);
    expect(s.steps_executed).toBe(0);
    expect(s.avg_steps_per_tenant).toBe(0);
    expect(s.avg_time_to_active_hours).toBeNull();
  });

  it("a fresh report is healthy with no tenants", () => {
    const rep = new TenantOnboardingRunbookEngine().generateReport(1_700_000_000_000);
    expect(rep.total_tenants).toBe(0);
    expect(rep.tenants_by_status).toEqual({ pending: 0, in_progress: 0, active: 0, suspended: 0 });
    expect(rep.recommendations).toContain("Onboarding pipeline healthy. No action required.");
  });
});

// ── State-machine: prerequisite ordering + progress (spanning configs) ──────
describe("U-WIRE-TENANT-ONBOARD — prerequisite state machine", () => {
  it("a fresh tenant's only actionable step is mou (0% complete)", () => {
    const e = new TenantOnboardingRunbookEngine();
    e.registerTenant(tenant());
    const st = e.getTenantStatus("T-1");
    expect(st.next_actionable).toBe("mou");
    expect(st.percent_complete).toBe(0);
    expect(st.completed_step_ids).toEqual([]);
  });

  it("starting kms before mou completes is blocked (prerequisite gate)", () => {
    const e = new TenantOnboardingRunbookEngine();
    e.registerTenant(tenant());
    expect(() => e.startStep("T-1", "kms_key_provision", "alice"))
      .toThrow(/Prerequisite not complete: mou/);
  });

  it("completing mou advances next_actionable to kms and percent to ~16.7%", () => {
    const e = new TenantOnboardingRunbookEngine();
    e.registerTenant(tenant());
    e.startStep("T-1", "mou", "alice");
    e.completeStep("T-1", "mou", "alice", "TICKET-1", "signed");
    const st = e.getTenantStatus("T-1");
    expect(st.completed_step_ids).toEqual(["mou"]);
    expect(st.next_actionable).toBe("kms_key_provision");
    expect(Math.round(st.percent_complete)).toBe(17); // 1/6
    expect(st.overall_status).toBe("in_progress");
  });

  it("listTenants filters by tier, status, and region", () => {
    const e = new TenantOnboardingRunbookEngine();
    e.registerTenant(tenant({ id: "T-ent", tier: "enterprise", residency_region: "us-east" }));
    e.registerTenant(tenant({ id: "T-smb", tier: "smb", residency_region: "eu-west" }));
    expect(e.listTenants({ tier: "smb" }).map(t => t.id)).toEqual(["T-smb"]);
    expect(e.listTenants({ region: "us-east" }).map(t => t.id)).toEqual(["T-ent"]);
    expect(e.listTenants({ status: "pending" }).length).toBe(2);
  });
});

// ── Adversarial / fail-loud (R12) ───────────────────────────────────────────
describe("U-WIRE-TENANT-ONBOARD — fail-loud input validation", () => {
  it("registerTenant rejects a missing mou_reference", () => {
    const e = new TenantOnboardingRunbookEngine();
    expect(() => e.registerTenant(tenant({ mou_reference: "" }))).toThrow(/mou_reference required/);
  });

  it("registerTenant rejects a duplicate tenant id", () => {
    const e = new TenantOnboardingRunbookEngine();
    e.registerTenant(tenant());
    expect(() => e.registerTenant(tenant())).toThrow(/already registered/);
  });

  it("completeStep without an evidence_ref is rejected (audit invariant)", () => {
    const e = new TenantOnboardingRunbookEngine();
    e.registerTenant(tenant());
    e.startStep("T-1", "mou", "alice");
    expect(() => e.completeStep("T-1", "mou", "alice", "", "x")).toThrow(/evidence_ref required/);
  });

  it("getTenantStatus throws for an unknown tenant (never silently empty)", () => {
    expect(() => new TenantOnboardingRunbookEngine().getTenantStatus("nope")).toThrow(/Unknown tenant/);
  });
});

// ── LIVE round-trip through prism_dev (the wire proof) ──────────────────────
describe("U-WIRE-TENANT-ONBOARD — dispatcher round-trip (prism_dev)", () => {
  it("tenant_onboarding_runbook returns the 6-step default runbook", async () => {
    const r = await call(server, "tenant_onboarding_runbook");
    expect(r.ok).toBe(true);
    const runbook = r.data.runbook as Array<{ id: string }>;
    expect(runbook.length).toBe(6);
    expect(runbook[0].id).toBe("mou");
  });

  it("tenant_onboarding_stats reflects tenants registered on the (cleared) singleton", async () => {
    tenantOnboardingRunbookEngine.registerTenant(tenant({ id: "RT-1" }));
    tenantOnboardingRunbookEngine.registerTenant(tenant({ id: "RT-2", tier: "smb" }));
    const r = await call(server, "tenant_onboarding_stats");
    expect(r.ok).toBe(true);
    expect(r.data.tenants_registered).toBe(2);
  });

  it("tenant_onboarding_report reflects the registered total", async () => {
    tenantOnboardingRunbookEngine.registerTenant(tenant({ id: "RT-1" }));
    const r = await call(server, "tenant_onboarding_report");
    expect(r.ok).toBe(true);
    expect(r.data.total_tenants).toBe(1);
  });

  it("tenant_onboarding_tenants applies the tier filter end-to-end", async () => {
    tenantOnboardingRunbookEngine.registerTenant(tenant({ id: "RT-ent", tier: "enterprise" }));
    tenantOnboardingRunbookEngine.registerTenant(tenant({ id: "RT-smb", tier: "smb" }));
    const r = await call(server, "tenant_onboarding_tenants", { tier: "smb" });
    expect(r.ok).toBe(true);
    const tenants = r.data.tenants as Array<{ id: string }>;
    expect(tenants.map(t => t.id)).toEqual(["RT-smb"]);
  });

  it("all 4 tenant_onboarding_* read actions are accepted by the dispatcher", async () => {
    for (const action of [
      "tenant_onboarding_stats", "tenant_onboarding_runbook",
      "tenant_onboarding_report", "tenant_onboarding_tenants",
    ]) {
      const r = await call(server, action);
      expect(r.ok, `${action} should succeed`).toBe(true);
    }
  });
});

// ── Schema validation through the dispatcher (adversarial) ──────────────────
describe("U-WIRE-TENANT-ONBOARD — schema rejection (prism_dev)", () => {
  it("tenant_onboarding_tenants rejects an out-of-enum tier", async () => {
    const r = await call(server, "tenant_onboarding_tenants", { tier: "whale" });
    expect(r.ok).toBe(false);
  });

  it("tenant_onboarding_tenants rejects an out-of-enum status", async () => {
    const r = await call(server, "tenant_onboarding_tenants", { status: "frozen" });
    expect(r.ok).toBe(false);
  });
});
