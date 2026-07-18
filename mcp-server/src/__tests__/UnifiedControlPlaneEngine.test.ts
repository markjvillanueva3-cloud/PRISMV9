/**
 * UnifiedControlPlaneEngine tests — U-HAGI02 unified governance composer.
 * Asserts real behavioral outcomes — exact verdict strings, gate priority,
 * boundary conditions on USD arithmetic.
 */
import { describe, it, expect } from "vitest";
import { UnifiedControlPlaneEngine, type ControlPlaneRequest, type BudgetState } from "../engines/UnifiedControlPlaneEngine.js";
import { KillSwitchEngine } from "../engines/KillSwitchEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const baseRequest = (over: Partial<ControlPlaneRequest> = {}): ControlPlaneRequest => ({
  request_id: "req_1", actor: "operator", request_tenant_id: "acme", resource_tenant_id: "acme",
  operation_class: "new_request", estimated_cost_usd: 0.10, requires_approval: false, ...over,
});
const fullBudget = (): BudgetState => ({ remaining_usd: 100.0, cap_usd: 100.0, reset_at: ISO });
const normal = () => KillSwitchEngine.initial(ISO);

describe("UnifiedControlPlaneEngine.decide — happy paths", () => {
  it("returns blocked_by='none' when all 4 gates pass", () => {
    const v = UnifiedControlPlaneEngine.decide(baseRequest(), normal(), fullBudget(), [], ISO);
    expect(v.allow).toBe(true);
    expect(v.blocked_by).toBe("none");
    expect(v.components.kill_switch?.level).toBe("normal");
    expect(v.components.tenant?.via).toBe("same-tenant");
    expect(v.components.budget?.remaining_usd).toBe(100);
    expect(v.components.budget?.cap_usd).toBe(100);
    expect(v.reason).toContain("4 gates passed");
  });

  it("allows cross-tenant via explicit allowlist with stated reason", () => {
    const req = baseRequest({ request_tenant_id: "acme", resource_tenant_id: "globex" });
    const v = UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(),
      [{ from: "acme", to: "globex", reason: "shared subsidiary" }], ISO);
    expect(v.allow).toBe(true);
    expect(v.components.tenant?.via).toBe("cross-allowed");
    expect(v.components.tenant?.request).toBe("acme");
    expect(v.components.tenant?.resource).toBe("globex");
  });

  it("allows when approval required AND approved_by present, records approver", () => {
    const req = baseRequest({ requires_approval: true, approved_by: "ops-bob" });
    const v = UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(), [], ISO);
    expect(v.allow).toBe(true);
    expect(v.components.approval?.required).toBe(true);
    expect(v.components.approval?.approved_by).toBe("ops-bob");
  });
});

describe("UnifiedControlPlaneEngine.decide — deny by gate priority", () => {
  it("Gate 1: blocks at kill-switch SOFT for new_request with blocked_by='kill-switch'", () => {
    const kill = KillSwitchEngine.promote(normal(), "soft", "elevated risk", "op", ISO);
    const v = UnifiedControlPlaneEngine.decide(baseRequest(), kill, fullBudget(), [], ISO);
    expect(v.allow).toBe(false);
    expect(v.blocked_by).toBe("kill-switch");
    expect(v.components.kill_switch?.level).toBe("soft");
  });

  it("Gate 1 short-circuits: tenant/budget components NOT populated when kill blocks", () => {
    const kill = KillSwitchEngine.promote(normal(), "hard", "r", "op", ISO);
    const v = UnifiedControlPlaneEngine.decide(baseRequest(), kill, fullBudget(), [], ISO);
    expect(v.allow).toBe(false);
    // verify the gate ordering by asserting only kill_switch made it into components
    expect(Object.keys(v.components)).toEqual(["kill_switch"]);
  });

  it("Gate 1: in_flight passes through SOFT but DENIES at HARD (level promotion test)", () => {
    const soft = KillSwitchEngine.promote(normal(), "soft", "r1", "op", ISO);
    const hard = KillSwitchEngine.promote(soft, "hard", "r2", "op", ISO);
    const req = baseRequest({ operation_class: "in_flight" });
    expect(UnifiedControlPlaneEngine.decide(req, soft, fullBudget(), [], ISO).allow).toBe(true);
    const hardV = UnifiedControlPlaneEngine.decide(req, hard, fullBudget(), [], ISO);
    expect(hardV.allow).toBe(false);
    expect(hardV.blocked_by).toBe("kill-switch");
  });

  it("Gate 2: cross-tenant without allowlist → blocked_by='tenant-boundary'", () => {
    const req = baseRequest({ request_tenant_id: "acme", resource_tenant_id: "globex" });
    const v = UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(), [], ISO);
    expect(v.allow).toBe(false);
    expect(v.blocked_by).toBe("tenant-boundary");
    expect(Object.keys(v.components)).toEqual(["kill_switch", "tenant"]);
  });

  it("Gate 3: cost $5 vs budget $1 → blocked_by='budget' with both values in reason", () => {
    const req = baseRequest({ estimated_cost_usd: 5.0 });
    const lowBudget: BudgetState = { remaining_usd: 1.0, cap_usd: 100.0, reset_at: ISO };
    const v = UnifiedControlPlaneEngine.decide(req, normal(), lowBudget, [], ISO);
    expect(v.allow).toBe(false);
    expect(v.blocked_by).toBe("budget");
    expect(v.reason).toContain("5.0000");
    expect(v.reason).toContain("1.0000");
    expect(Object.keys(v.components)).toEqual(["kill_switch", "tenant", "budget"]);
  });

  it("Gate 4: requires_approval=true and no approved_by → blocked_by='approval-required'", () => {
    const req = baseRequest({ requires_approval: true });
    const v = UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(), [], ISO);
    expect(v.allow).toBe(false);
    expect(v.blocked_by).toBe("approval-required");
    expect(v.components.approval?.required).toBe(true);
  });

  it("Gate 3 boundary: cost == remaining budget exactly → ALLOWED (≤ check)", () => {
    const req = baseRequest({ estimated_cost_usd: 1.0 });
    const budget: BudgetState = { remaining_usd: 1.0, cap_usd: 1.0, reset_at: ISO };
    const v = UnifiedControlPlaneEngine.decide(req, normal(), budget, [], ISO);
    expect(v.allow).toBe(true);
    expect(v.blocked_by).toBe("none");
  });

  it("Gate 3 boundary: cost 1.0001 vs budget 1.0 → DENIED (strict > check)", () => {
    const req = baseRequest({ estimated_cost_usd: 1.0001 });
    const budget: BudgetState = { remaining_usd: 1.0, cap_usd: 1.0, reset_at: ISO };
    const v = UnifiedControlPlaneEngine.decide(req, normal(), budget, [], ISO);
    expect(v.allow).toBe(false);
    expect(v.blocked_by).toBe("budget");
  });
});

describe("UnifiedControlPlaneEngine.decide — failure modes / adversarial", () => {
  it("throws on negative estimated_cost (adversarial)", () => {
    const req = { ...baseRequest(), estimated_cost_usd: -1 };
    expect(() => UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(), [], ISO)).toThrow();
  });

  it("throws on NaN estimated_cost (adversarial)", () => {
    const req = { ...baseRequest(), estimated_cost_usd: NaN };
    expect(() => UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(), [], ISO)).toThrow();
  });

  it("throws on Infinity estimated_cost (adversarial)", () => {
    const req = { ...baseRequest(), estimated_cost_usd: Infinity };
    expect(() => UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(), [], ISO)).toThrow();
  });

  it("throws on negative remaining_usd budget (adversarial)", () => {
    const bad: BudgetState = { remaining_usd: -10, cap_usd: 100, reset_at: ISO };
    expect(() => UnifiedControlPlaneEngine.decide(baseRequest(), normal(), bad, [], ISO)).toThrow();
  });

  it("throws on empty request_id (failure mode)", () => {
    const req = { ...baseRequest(), request_id: "" };
    expect(() => UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(), [], ISO)).toThrow();
  });

  it("throws on unknown operation_class", () => {
    const req = { ...baseRequest(), operation_class: "yolo" } as never;
    expect(() => UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(), [], ISO)).toThrow();
  });
});

describe("UnifiedControlPlaneEngine.renderVerdict", () => {
  it("renders [ALLOW] prefix for allowed verdict", () => {
    const v = UnifiedControlPlaneEngine.decide(baseRequest(), normal(), fullBudget(), [], ISO);
    const md = UnifiedControlPlaneEngine.renderVerdict(v);
    expect(md.startsWith("[ALLOW]")).toBe(true);
    expect(md).toContain("req_1");
    expect(md).toContain(ISO);
  });

  it("renders [DENY (tenant-boundary)] prefix when blocked at tenant gate", () => {
    const req = baseRequest({ request_tenant_id: "acme", resource_tenant_id: "globex" });
    const v = UnifiedControlPlaneEngine.decide(req, normal(), fullBudget(), [], ISO);
    expect(UnifiedControlPlaneEngine.renderVerdict(v)).toContain("[DENY (tenant-boundary)]");
  });
});
