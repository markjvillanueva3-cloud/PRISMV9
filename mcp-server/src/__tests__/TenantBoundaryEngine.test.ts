/**
 * TenantBoundaryEngine tests — U-HAGI10.
 */
import { describe, it, expect } from "vitest";
import { TenantBoundaryEngine, type CrossTenantPair } from "../engines/TenantBoundaryEngine.js";

const T = TenantBoundaryEngine;

describe("TenantBoundaryEngine.decide — happy paths", () => {
  it("allows same-tenant access", () => {
    const d = T.decide("acme", "acme");
    expect(d.allow).toBe(true);
    expect(d.via).toBe("same-tenant");
  });

  it("allows system tenant unconditionally", () => {
    const d = T.decide("_system_", "acme");
    expect(d.allow).toBe(true);
    expect(d.via).toBe("system");
  });

  it("allows cross-tenant access when in allowlist with stated reason", () => {
    const allowlist: CrossTenantPair[] = [
      { from: "acme", to: "globex", reason: "shared subsidiary" },
    ];
    const d = T.decide("acme", "globex", allowlist);
    expect(d.allow).toBe(true);
    expect(d.via).toBe("cross-allowed");
    expect(d.reason).toContain("shared subsidiary");
  });

  it("denies cross-tenant access by default", () => {
    const d = T.decide("acme", "globex");
    expect(d.allow).toBe(false);
    expect(d.via).toBe("cross-denied");
  });

  it("denies if the allowlist entry is reverse-direction (asymmetric)", () => {
    const allowlist: CrossTenantPair[] = [{ from: "acme", to: "globex", reason: "x" }];
    const d = T.decide("globex", "acme", allowlist); // reversed
    expect(d.allow).toBe(false);
  });
});

describe("TenantBoundaryEngine.decide — failure modes", () => {
  it("denies on empty request tenant id", () => {
    expect(T.decide("", "acme").allow).toBe(false);
  });

  it("denies on empty resource tenant id", () => {
    expect(T.decide("acme", "").allow).toBe(false);
  });

  it("throws on malformed tenant id (contains spaces)", () => {
    expect(() => T.decide("acme corp", "globex")).toThrow();
  });

  it("throws on oversize tenant id (boundary)", () => {
    expect(() => T.decide("a".repeat(65), "acme")).toThrow();
  });

  it("throws on special chars in tenant id (adversarial)", () => {
    expect(() => T.decide("acme/admin", "globex")).toThrow();
    expect(() => T.decide("acme;rm -rf /", "globex")).toThrow();
  });

  it("denies for unicode-confusable tenant id (adversarial — Cyrillic 'а' vs Latin 'a')", () => {
    // The cyrillic version has a non-Latin char, regex rejects it.
    expect(() => T.decide("аcme", "acme")).toThrow();
  });
});

describe("TenantBoundaryEngine.filterAccessible", () => {
  it("filters a resource list to same-tenant rows", () => {
    const rows = [
      { id: 1, tenantId: "acme" },
      { id: 2, tenantId: "globex" },
      { id: 3, tenantId: "acme" },
    ];
    const visible = T.filterAccessible("acme", rows, (r) => r.tenantId);
    expect(visible).toHaveLength(2);
    expect(visible.map((r) => r.id)).toEqual([1, 3]);
  });

  it("returns empty when no resources match", () => {
    const rows = [{ id: 1, tenantId: "globex" }];
    expect(T.filterAccessible("acme", rows, (r) => r.tenantId)).toEqual([]);
  });

  it("expands allowed set via cross-tenant allowlist", () => {
    const rows = [
      { id: 1, tenantId: "acme" },
      { id: 2, tenantId: "globex" },
    ];
    const allowlist: CrossTenantPair[] = [{ from: "acme", to: "globex", reason: "trial" }];
    const visible = T.filterAccessible("acme", rows, (r) => r.tenantId, allowlist);
    expect(visible).toHaveLength(2);
  });

  it("throws on missing accessor (failure mode)", () => {
    expect(() => T.filterAccessible("acme", [{}] as never, null as never)).toThrow();
  });
});

describe("TenantBoundaryEngine.renderDecision", () => {
  it("renders ALLOW for allowed decision", () => {
    const d = T.decide("acme", "acme");
    const md = T.renderDecision(d);
    expect(md).toContain("[ALLOW]");
    expect(md).toContain("same-tenant");
  });

  it("renders DENY for denied decision", () => {
    const d = T.decide("acme", "globex");
    const md = T.renderDecision(d);
    expect(md).toContain("[DENY]");
    expect(md).toContain("cross-denied");
  });
});

describe("TenantBoundaryEngine.validatePair", () => {
  it("rejects pair with empty reason", () => {
    expect(() => T.validatePair({ from: "a", to: "b", reason: "" })).toThrow();
  });

  it("rejects pair with oversize reason (boundary)", () => {
    expect(() => T.validatePair({ from: "a", to: "b", reason: "x".repeat(201) })).toThrow();
  });
});
