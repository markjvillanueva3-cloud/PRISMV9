import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { adminApi } from "../api/admin";
import { ENFORCEABLE_FEATURES } from "../types/admin";

// The backend wraps entitlement endpoints in { result: ... }; the FE client must
// unwrap to .result so callers get the payload directly (Q6 / U-COMM-05).
const realFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function mockJson(body: unknown, ok = true, status = 200) {
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
  });
}

describe("adminApi entitlement methods unwrap the backend {result} envelope", () => {
  it("listEntitlements returns result.users + count", async () => {
    mockJson({ result: { users: [{ userId: "u1", plan: "pro", status: "active", effectivePlan: "pro", overrides: {} }], count: 1 } });
    const r = await adminApi.listEntitlements();
    expect(r.count).toBe(1);
    expect(r.users[0].userId).toBe("u1");
    expect(r.users[0].effectivePlan).toBe("pro");
  });

  it("setEntitlement returns result.{userId,overrides}", async () => {
    mockJson({ result: { userId: "u1", overrides: { simulation: false } } });
    const r = await adminApi.setEntitlement({ userId: "u1", feature: "simulation", granted: false });
    expect(r.userId).toBe("u1");
    expect(r.overrides.simulation).toBe(false);
  });

  it("setUserPlan returns the result record", async () => {
    mockJson({ result: { userId: "u1", plan: "shop", status: "active", effectivePlan: "shop", overrides: {} } });
    const r = await adminApi.setUserPlan({ userId: "u1", plan: "shop" });
    expect(r.plan).toBe("shop");
  });

  it("propagates a flat backend error body { message }", async () => {
    mockJson({ message: "feature \"quoting\" is not an enforceable entitlement key" }, false, 400);
    await expect(adminApi.setEntitlement({ userId: "u1", feature: "quoting", granted: false })).rejects.toThrow(/enforceable/);
  });

  it("propagates the NESTED backend error body { error: { message } } (real admin.ts shape)", async () => {
    // routes/admin.ts returns { error: { status, message, code }, timestamp } -- the
    // client must read error.message, not just top-level .message, or the admin sees
    // a generic "Error" instead of the real UNENFORCEABLE_FEATURE reason.
    mockJson({ error: { status: 400, message: "feature \"erp\" is not an enforceable entitlement key", code: "UNENFORCEABLE_FEATURE" }, timestamp: "2026-06-21T00:00:00Z" }, false, 400);
    await expect(adminApi.setEntitlement({ userId: "u1", feature: "erp", granted: false })).rejects.toThrow(/enforceable/);
  });
});

describe("ENFORCEABLE_FEATURES mirrors the backend GATED_FEATURES (10 keys, no FE-only product keys)", () => {
  it("contains exactly the 10 backend-enforced keys", () => {
    const keys = ENFORCEABLE_FEATURES.map((f) => f.key).sort();
    expect(keys).toEqual(
      ["api_access", "dfm", "edm_program", "laser_program", "print_to_program", "program_generate", "simulation", "speed_feed", "stochastic", "waterjet_program"],
    );
  });

  it("does NOT offer un-enforced product keys (would be a silent no-op revoke)", () => {
    const keys = ENFORCEABLE_FEATURES.map((f) => f.key);
    for (const productKey of ["quoting", "sfc.nine_axis", "cadcam", "wizard.mill", "erp", "post.generate"]) {
      expect(keys).not.toContain(productKey);
    }
  });

  it("every feature has a non-empty human label", () => {
    for (const f of ENFORCEABLE_FEATURES) {
      expect(typeof f.label).toBe("string");
      expect(f.label.length > 2).toBe(true);
    }
  });
});
