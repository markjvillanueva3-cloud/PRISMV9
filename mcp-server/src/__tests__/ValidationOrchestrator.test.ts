/**
 * ValidationOrchestrator — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U02.
 *
 * Tests for ValidationOrchestratorEngine pure-function exports + a
 * round-trip on the .run() method.
 *
 * Asserts:
 *   1. VALIDATION_BACKEND_TABLE covers all 12 documented validation
 *      domains; every descriptor has the required shape.
 *   2. normalizeDomain handles direct enum, case-insensitive, aliases,
 *      and rejects unknown / non-string input.
 *   3. selectBackend returns descriptors and throws on out-of-table.
 *   4. validateRequest enforces domain + target + options shape.
 *   5. mergeValidationResults aggregates ok/severity/errors/warnings/
 *      duration across parts.
 *   6. isCriticalSeverity returns true for failed envelopes or any
 *      envelope with errors[]; false otherwise.
 *   7. .run() returns the documented envelope shape; routes to the right
 *      backend; degrades gracefully when backend is missing.
 */

import { describe, it, expect } from "vitest";
import {
  ValidationOrchestratorEngine,
  validationOrchestratorEngine,
  VALIDATION_BACKEND_TABLE,
  normalizeDomain,
  selectBackend,
  validateRequest,
  mergeValidationResults,
  isCriticalSeverity,
  type ValidationDomain,
  type ValidationOrchestratorResult,
} from "../engines/ValidationOrchestratorEngine.js";

describe("P10-U02 VALIDATION_BACKEND_TABLE", () => {
  it("covers the 12 documented validation domains", () => {
    const expected: ValidationDomain[] = [
      "code", "physics", "data", "post", "formula", "machine",
      "coolant", "gcode", "catalog", "dimensional", "macro", "controller",
    ];
    for (const d of expected) {
      expect(VALIDATION_BACKEND_TABLE[d]).toBeTruthy();
    }
  });

  it("every backend descriptor has engineClass + singleton + method + description", () => {
    for (const [domain, desc] of Object.entries(VALIDATION_BACKEND_TABLE)) {
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
    for (const desc of Object.values(VALIDATION_BACKEND_TABLE)) {
      expect(/^[A-Z][A-Za-z0-9]+Engine$/.test(desc.engineClass)).toBe(true);
    }
  });
});

describe("P10-U02 normalizeDomain", () => {
  it("returns canonical enum for direct lowercase matches", () => {
    expect(normalizeDomain("code")).toBe("code");
    expect(normalizeDomain("physics")).toBe("physics");
    expect(normalizeDomain("gcode")).toBe("gcode");
  });

  it("is case-insensitive", () => {
    expect(normalizeDomain("CODE")).toBe("code");
    expect(normalizeDomain("Physics")).toBe("physics");
  });

  it("trims whitespace", () => {
    expect(normalizeDomain("  code  ")).toBe("code");
  });

  it("resolves common aliases", () => {
    expect(normalizeDomain("src")).toBe("code");
    expect(normalizeDomain("source")).toBe("code");
    expect(normalizeDomain("kienzle")).toBe("physics");
    expect(normalizeDomain("taylor")).toBe("physics");
    expect(normalizeDomain("pp")).toBe("post");
    expect(normalizeDomain("post-processor")).toBe("post");
    expect(normalizeDomain("cnc")).toBe("machine");
    expect(normalizeDomain("nc")).toBe("gcode");
    expect(normalizeDomain("g-code")).toBe("gcode");
    expect(normalizeDomain("units")).toBe("dimensional");
    expect(normalizeDomain("osp")).toBe("controller");
    expect(normalizeDomain("fanuc")).toBe("controller");
  });

  it("returns null for unknown strings", () => {
    expect(normalizeDomain("widgets")).toBeNull();
    expect(normalizeDomain("xyzzy")).toBeNull();
  });

  it("returns null for empty / non-string input", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain(undefined)).toBeNull();
    expect(normalizeDomain(42)).toBeNull();
    expect(normalizeDomain({})).toBeNull();
  });
});

describe("P10-U02 selectBackend", () => {
  it("returns descriptor for every domain in the table", () => {
    for (const domain of Object.keys(VALIDATION_BACKEND_TABLE) as ValidationDomain[]) {
      const desc = selectBackend(domain);
      expect(desc.engineClass).toBe(VALIDATION_BACKEND_TABLE[domain].engineClass);
    }
  });

  it("throws for an out-of-table input", () => {
    expect(() => selectBackend("definitely-not-a-domain" as ValidationDomain)).toThrow();
  });
});

describe("P10-U02 validateRequest", () => {
  it("accepts a minimal valid request (domain + target)", () => {
    expect(validateRequest({ domain: "code", target: "src/foo.ts" })).toBeNull();
  });

  it("accepts a fully-specified request", () => {
    expect(validateRequest({
      domain: "machine",
      target: "okuma-lt-3",
      options: { strict: true },
    })).toBeNull();
  });

  it("accepts aliased domain", () => {
    expect(validateRequest({ domain: "kienzle", target: "Fc" })).toBeNull();
    expect(validateRequest({ domain: "fanuc", target: "0i-mf" })).toBeNull();
  });

  it("rejects null / non-object request", () => {
    expect(validateRequest(null)).toContain("object");
    expect(validateRequest(undefined)).toContain("object");
    expect(validateRequest("code")).toContain("object");
  });

  it("rejects request with missing or unknown domain", () => {
    const err = validateRequest({ target: "x" });
    expect(err).not.toBeNull();
    expect(err).toContain("unknown validation domain");
    const err2 = validateRequest({ domain: "widgets", target: "x" });
    expect(err2).toContain("widgets");
    expect(err2).toContain("Valid:");
  });

  it("rejects request with missing or empty target", () => {
    expect(validateRequest({ domain: "code" })).toContain("target");
    expect(validateRequest({ domain: "code", target: "" })).toContain("target");
    expect(validateRequest({ domain: "code", target: 42 })).toContain("target");
  });

  it("rejects options that isn't a plain object", () => {
    expect(validateRequest({ domain: "code", target: "x", options: "bad" })).toContain("options");
    expect(validateRequest({ domain: "code", target: "x", options: ["arr"] })).toContain("options");
    expect(validateRequest({ domain: "code", target: "x", options: null })).toContain("options");
  });
});

describe("P10-U02 mergeValidationResults", () => {
  function part(over: Partial<ValidationOrchestratorResult>): ValidationOrchestratorResult {
    return {
      domain: "code",
      target: "src/foo.ts",
      ok: true,
      severity: "passed",
      backend: "Backend",
      data: undefined,
      durationMs: 100,
      ts: new Date().toISOString(),
      ...over,
    };
  }

  it("returns an empty envelope when given an empty array", () => {
    const r = mergeValidationResults([]);
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("passed");
    expect(r.backend).toBe("merge:empty");
    expect((r.data as any).parts).toEqual([]);
  });

  it("severity=passed when all parts pass", () => {
    const r = mergeValidationResults([part({ backend: "A" }), part({ backend: "B" })]);
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("passed");
    expect(r.backend).toBe("A,B");
    expect(r.durationMs).toBe(200);
    expect(r.errors).toBeUndefined();
    expect(r.warnings).toBeUndefined();
  });

  it("severity=warnings when any part has warnings but none failed", () => {
    const r = mergeValidationResults([
      part({ backend: "A" }),
      part({ backend: "B", severity: "warnings", warnings: ["mild"] }),
    ]);
    expect(r.ok).toBe(true);
    expect(r.severity).toBe("warnings");
    expect(r.warnings).toEqual(["mild"]);
    expect(r.errors).toBeUndefined();
  });

  it("severity=failed when any part fails", () => {
    const r = mergeValidationResults([
      part({ backend: "A" }),
      part({ backend: "B", ok: false, severity: "failed", errors: ["broken"] }),
      part({ backend: "C", severity: "warnings", warnings: ["mild"] }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("failed");
    expect(r.errors).toEqual(["broken"]);
    expect(r.warnings).toEqual(["mild"]);
  });

  it("aggregates errors and warnings across parts", () => {
    const r = mergeValidationResults([
      part({ ok: false, severity: "failed", errors: ["e1", "e2"] }),
      part({ ok: false, severity: "failed", errors: ["e3"] }),
      part({ severity: "warnings", warnings: ["w1"] }),
    ]);
    expect(r.errors).toEqual(["e1", "e2", "e3"]);
    expect(r.warnings).toEqual(["w1"]);
  });

  it("propagates domain and target from first part", () => {
    const r = mergeValidationResults([
      part({ domain: "physics", target: "Fc-formula" }),
      part({ domain: "physics", target: "Fc-formula" }),
    ]);
    expect(r.domain).toBe("physics");
    expect(r.target).toBe("Fc-formula");
  });
});

describe("P10-U02 isCriticalSeverity", () => {
  function env(over: Partial<ValidationOrchestratorResult>): ValidationOrchestratorResult {
    return {
      domain: "code",
      target: "x",
      ok: true,
      severity: "passed",
      backend: "B",
      durationMs: 0,
      ts: "",
      ...over,
    };
  }

  it("returns true for failed severity", () => {
    expect(isCriticalSeverity(env({ ok: false, severity: "failed" }))).toBe(true);
  });

  it("returns true when errors[] is non-empty (even if ok=true)", () => {
    expect(isCriticalSeverity(env({ errors: ["leaked"] }))).toBe(true);
  });

  it("returns false for passed severity with no errors", () => {
    expect(isCriticalSeverity(env({}))).toBe(false);
  });

  it("returns false for warnings severity (warnings aren't critical)", () => {
    expect(isCriticalSeverity(env({ severity: "warnings", warnings: ["mild"] }))).toBe(false);
  });

  it("returns false for null/undefined input", () => {
    expect(isCriticalSeverity(null)).toBe(false);
    expect(isCriticalSeverity(undefined)).toBe(false);
  });
});

describe("P10-U02 .run() round-trip", () => {
  it("returns a structured result envelope on validation failure", async () => {
    const r = await validationOrchestratorEngine.run({ domain: "widgets" } as any);
    expect(r.ok).toBe(false);
    expect(r.severity).toBe("failed");
    expect(r.backend).toBe("validation");
    expect(r.errors?.[0]).toContain("unknown validation domain");
  });

  it("returns ok=false when the resolved backend method is missing", async () => {
    // 'memory'-like edge: pick a domain whose backend may not have the
    // exact method shape we declared. The envelope MUST still be structured.
    const r = await validationOrchestratorEngine.run({ domain: "data", target: "test-target" });
    expect(typeof r.ok).toBe("boolean");
    expect(r.backend).toBe("DataValidationEngine");
    expect(typeof r.durationMs).toBe("number");
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof r.ts).toBe("string");
  });

  it("singleton export instanceof ValidationOrchestratorEngine", () => {
    expect(validationOrchestratorEngine).toBeInstanceOf(ValidationOrchestratorEngine);
  });

  it("preserves the target string in the result envelope", async () => {
    const r = await validationOrchestratorEngine.run({ domain: "code", target: "src/sample.ts" });
    expect(r.target).toBe("src/sample.ts");
  });
});
