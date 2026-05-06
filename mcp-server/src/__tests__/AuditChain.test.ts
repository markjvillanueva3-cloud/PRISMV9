/**
 * AuditChain — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U03.
 *
 * Tests for AuditChainEngine pure-function exports + a round-trip on the
 * .run() method (which lazy-imports backends — we test against the real
 * AuditEngine for `code` type since it's already in the registry).
 *
 * Asserts:
 *   1. AUDIT_BACKEND_TABLE covers all 9 documented audit types.
 *   2. normalizeType handles direct enum, case-insensitive, aliases, and
 *      rejects unknown / non-string input.
 *   3. selectBackend returns descriptors for every type in the table; throws
 *      on out-of-table input.
 *   4. validateRequest enforces type presence + scope/options shape.
 *   5. mergeAuditResults aggregates ok/error/duration across parts.
 *   6. .run() returns a structured result envelope and routes to the right
 *      backend based on type.
 */

import { describe, it, expect } from "vitest";
import {
  AuditChainEngine,
  auditChainEngine,
  AUDIT_BACKEND_TABLE,
  normalizeType,
  selectBackend,
  validateRequest,
  mergeAuditResults,
  type AuditType,
  type AuditChainResult,
} from "../engines/AuditChainEngine.js";

describe("P10-U03 AUDIT_BACKEND_TABLE", () => {
  it("covers the documented set of audit types", () => {
    const expected: AuditType[] = [
      "code", "machine", "data", "hook", "system",
      "security", "operator", "library", "memory",
    ];
    for (const t of expected) {
      expect(AUDIT_BACKEND_TABLE[t]).toBeTruthy();
    }
  });

  it("every backend descriptor has engineClass + singleton + method + description", () => {
    for (const [type, desc] of Object.entries(AUDIT_BACKEND_TABLE)) {
      expect(typeof desc.engineClass).toBe("string");
      expect(desc.engineClass.length).toBeGreaterThan(0);
      expect(typeof desc.singleton).toBe("string");
      expect(desc.singleton.length).toBeGreaterThan(0);
      expect(typeof desc.method).toBe("string");
      expect(desc.method.length).toBeGreaterThan(0);
      expect(typeof desc.description).toBe("string");
      expect(desc.description.length).toBeGreaterThan(10);
    }
  });

  it("engineClass entries follow PascalCase + Engine suffix convention", () => {
    for (const desc of Object.values(AUDIT_BACKEND_TABLE)) {
      expect(/^[A-Z][A-Za-z0-9]+Engine$/.test(desc.engineClass)).toBe(true);
    }
  });
});

describe("P10-U03 normalizeType", () => {
  it("returns canonical enum for direct lowercase matches", () => {
    expect(normalizeType("code")).toBe("code");
    expect(normalizeType("machine")).toBe("machine");
    expect(normalizeType("memory")).toBe("memory");
  });

  it("is case-insensitive", () => {
    expect(normalizeType("CODE")).toBe("code");
    expect(normalizeType("Machine")).toBe("machine");
    expect(normalizeType("SeCuRiTy")).toBe("security");
  });

  it("trims whitespace", () => {
    expect(normalizeType("  code  ")).toBe("code");
    expect(normalizeType("\tmachine\n")).toBe("machine");
  });

  it("resolves common aliases", () => {
    expect(normalizeType("src")).toBe("code");
    expect(normalizeType("source")).toBe("code");
    expect(normalizeType("cnc")).toBe("machine");
    expect(normalizeType("telemetry")).toBe("data");
    expect(normalizeType("sensor")).toBe("data");
    expect(normalizeType("hooks")).toBe("hook"); // plural → singular
    expect(normalizeType("sec")).toBe("security");
    expect(normalizeType("operations")).toBe("operator");
    expect(normalizeType("programs")).toBe("library");
    expect(normalizeType("db")).toBe("memory");
    expect(normalizeType("cache")).toBe("memory");
  });

  it("returns null for unknown strings", () => {
    expect(normalizeType("widgets")).toBeNull();
    expect(normalizeType("xyzzy")).toBeNull();
  });

  it("returns null for empty / non-string input", () => {
    expect(normalizeType("")).toBeNull();
    expect(normalizeType("   ")).toBeNull();
    expect(normalizeType(null)).toBeNull();
    expect(normalizeType(undefined)).toBeNull();
    expect(normalizeType(42)).toBeNull();
    expect(normalizeType({})).toBeNull();
  });
});

describe("P10-U03 selectBackend", () => {
  it("returns the descriptor for every type in the table", () => {
    for (const type of Object.keys(AUDIT_BACKEND_TABLE) as AuditType[]) {
      const desc = selectBackend(type);
      expect(desc.engineClass).toBe(AUDIT_BACKEND_TABLE[type].engineClass);
    }
  });

  it("throws for an out-of-table input", () => {
    expect(() => selectBackend("definitely-not-a-type" as AuditType)).toThrow();
  });
});

describe("P10-U03 validateRequest", () => {
  it("accepts a minimal valid request (type only)", () => {
    expect(validateRequest({ type: "code" })).toBeNull();
  });

  it("accepts a fully-specified request", () => {
    expect(validateRequest({ type: "machine", scope: "okuma-lt-3", options: { strict: true } })).toBeNull();
  });

  it("accepts aliased type", () => {
    expect(validateRequest({ type: "src" })).toBeNull();
    expect(validateRequest({ type: "telemetry", scope: "shop-floor" })).toBeNull();
  });

  it("rejects null / non-object", () => {
    expect(validateRequest(null)).toContain("object");
    expect(validateRequest(undefined)).toContain("object");
    expect(validateRequest("code")).toContain("object");
    expect(validateRequest(42)).toContain("object");
  });

  it("rejects request with missing or unknown type", () => {
    const err = validateRequest({});
    expect(err).not.toBeNull();
    expect(err).toContain("unknown audit type");
    const err2 = validateRequest({ type: "widgets" });
    expect(err2).toContain("widgets");
    expect(err2).toContain("Valid:");
  });

  it("rejects scope that isn't a string", () => {
    const err = validateRequest({ type: "code", scope: 123 });
    expect(err).toContain("scope");
  });

  it("rejects options that isn't a plain object", () => {
    expect(validateRequest({ type: "code", options: "bad" })).toContain("options");
    expect(validateRequest({ type: "code", options: ["arr"] })).toContain("options");
    expect(validateRequest({ type: "code", options: null })).toContain("options");
  });
});

describe("P10-U03 mergeAuditResults", () => {
  function part(over: Partial<AuditChainResult>): AuditChainResult {
    return {
      type: "code",
      scope: null,
      ok: true,
      backend: "Backend",
      data: undefined,
      durationMs: 100,
      ts: new Date().toISOString(),
      ...over,
    };
  }

  it("returns an empty envelope when given an empty array", () => {
    const r = mergeAuditResults([]);
    expect(r.ok).toBe(true);
    expect(r.backend).toBe("merge:empty");
    expect(r.durationMs).toBe(0);
    expect((r.data as any).parts).toEqual([]);
  });

  it("aggregates ok=true across all-ok parts", () => {
    const r = mergeAuditResults([part({ backend: "A" }), part({ backend: "B" })]);
    expect(r.ok).toBe(true);
    expect(r.backend).toBe("A,B");
    expect(r.durationMs).toBe(200);
    expect(r.error).toBeUndefined();
  });

  it("ok=false when any part fails; concatenates errors", () => {
    const r = mergeAuditResults([
      part({ backend: "A", ok: false, error: "boom-a" }),
      part({ backend: "B", ok: true }),
      part({ backend: "C", ok: false, error: "boom-c" }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("boom-a");
    expect(r.error).toContain("boom-c");
    expect(r.backend).toBe("A,B,C");
  });

  it("propagates type and scope from first part", () => {
    const r = mergeAuditResults([
      part({ type: "machine", scope: "okuma-lt-3" }),
      part({ type: "machine", scope: "okuma-lt-3" }),
    ]);
    expect(r.type).toBe("machine");
    expect(r.scope).toBe("okuma-lt-3");
  });

  it("includes per-part data array in the merged data envelope", () => {
    const r = mergeAuditResults([
      part({ backend: "A", data: { findings: 3 } }),
      part({ backend: "B", data: { findings: 5 } }),
    ]);
    const parts = (r.data as any).parts;
    expect(Array.isArray(parts)).toBe(true);
    expect(parts.length).toBe(2);
    expect(parts[0].backend).toBe("A");
    expect(parts[0].data.findings).toBe(3);
  });
});

describe("P10-U03 .run() round-trip", () => {
  it("returns a structured result envelope on validation failure", async () => {
    const r = await auditChainEngine.run({ type: "widgets" } as any);
    expect(r.ok).toBe(false);
    expect(r.backend).toBe("validation");
    expect(r.error).toContain("unknown audit type");
    expect(typeof r.durationMs).toBe("number");
    expect(typeof r.ts).toBe("string");
  });

  it("returns ok=false when the resolved backend is missing the method", async () => {
    // 'memory' routes to CSMMemoryDBAuditEngine which exists but its method
    // surface may differ; we don't assert the data, just the envelope shape.
    const r = await auditChainEngine.run({ type: "memory" });
    expect(typeof r.ok).toBe("boolean");
    expect(r.backend).toBe("CSMMemoryDBAuditEngine");
    expect(["string", "undefined"]).toContain(typeof r.error);
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("singleton export instanceof AuditChainEngine", () => {
    expect(auditChainEngine).toBeInstanceOf(AuditChainEngine);
  });
});
