/**
 * INFRA Phase 7: API & Integration Tests
 *
 * U-API1: OpenAPI spec + Swagger UI
 * U-API2: API versioning + deprecation headers
 * U-PLG1: CAMPluginSDK canonical constants
 * U-PLG2: Plugin manifest schema + lifecycle
 */
import { describe, it, expect, beforeEach } from "vitest";

// ─── U-API1: OpenAPI Spec ───────────────────────────────────────────────────

describe("OpenAPI — spec generation (U-API1)", () => {
  it("should export createOpenApiRouter", async () => {
    const mod = await import("../routes/openapi.js");
    expect(typeof mod.createOpenApiRouter).toBe("function");
  });

  it("should export API_VERSION", async () => {
    const mod = await import("../routes/openapi.js");
    expect(mod.API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("should export apiVersioning middleware", async () => {
    const mod = await import("../routes/openapi.js");
    expect(typeof mod.apiVersioning).toBe("function");
  });
});

// ─── U-API2: API Versioning ─────────────────────────────────────────────────

describe("API Versioning — middleware (U-API2)", () => {
  it("should set X-API-Version header", async () => {
    const { apiVersioning, API_VERSION } = await import("../routes/openapi.js");
    const headers: Record<string, string> = {};
    const mockRes = {
      setHeader: (key: string, val: string) => { headers[key] = val; },
    };
    const mockReq = { path: "/api/v1/sfc/calculate" };
    let called = false;
    const next = () => { called = true; };

    apiVersioning(mockReq as any, mockRes as any, next);

    expect(headers["X-API-Version"]).toBe(API_VERSION);
    expect(called).toBe(true);
  });

  it("should export DEPRECATED_ENDPOINTS", async () => {
    const { DEPRECATED_ENDPOINTS } = await import("../routes/openapi.js");
    expect(DEPRECATED_ENDPOINTS).toBeDefined();
    expect(typeof DEPRECATED_ENDPOINTS).toBe("object");
  });
});

// ─── U-PLG1: CAMPluginSDK Canonical Constants ──────────────────────────────

describe("CAMPluginSDK — canonical constants (U-PLG1)", () => {
  it("should import from physics/constants.ts", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile("H:/prism/src/engines/CAMPluginSDKEngine.ts", "utf8");
    // Must import from canonical source
    expect(src).toContain('from "../physics/constants.js"');
    expect(src).toContain("CANONICAL_KIENZLE");
    expect(src).toContain("CANONICAL_TAYLOR");
  });

  it("should NOT have hardcoded kc1_1 values", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile("H:/prism/src/engines/CAMPluginSDKEngine.ts", "utf8");
    // Should not have inline constant definitions like { kc1_1: 1800, mc: 0.25 }
    // (the Object.fromEntries pattern is fine since it derives from CANONICAL_KIENZLE)
    expect(src).not.toMatch(/KIENZLE.*=\s*\{[\s\S]*?"P":\s*\{\s*kc1_1:\s*\d+/);
  });

  it("should NOT have hardcoded Taylor C values", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile("H:/prism/src/engines/CAMPluginSDKEngine.ts", "utf8");
    expect(src).not.toMatch(/TAYLOR.*=\s*\{[\s\S]*?"P":\s*\{\s*C:\s*\d+/);
  });

  it("should use correct canonical Kienzle values", async () => {
    const { CANONICAL_KIENZLE } = await import("../physics/constants.js");
    // Verify the canonical values match expected Sandvik references
    expect(CANONICAL_KIENZLE.P.kc1_1).toBe(1800);
    expect(CANONICAL_KIENZLE.P.mc).toBe(0.25);
    expect(CANONICAL_KIENZLE.N.kc1_1).toBe(700);
    expect(CANONICAL_KIENZLE.H.kc1_1).toBe(3200);
  });

  it("should use correct canonical Taylor values", async () => {
    const { CANONICAL_TAYLOR } = await import("../physics/constants.js");
    // The old hardcoded values were wrong (P.C=250 vs canonical P.C=350)
    expect(CANONICAL_TAYLOR.P.C).toBe(350);
    expect(CANONICAL_TAYLOR.P.n).toBe(0.25);
    expect(CANONICAL_TAYLOR.N.C).toBe(900);
    expect(CANONICAL_TAYLOR.H.C).toBe(200);
  });
});

// ─── U-PLG2: Plugin Manifest Schema ─────────────────────────────────────────

describe("PluginManifest — schema validation (U-PLG2)", () => {
  let PluginManifestEngine: any;

  beforeEach(async () => {
    const mod = await import("../engines/PluginManifestEngine.js");
    PluginManifestEngine = mod.PluginManifestEngine;
  });

  const validManifest = {
    id: "test-plugin",
    version: "1.0.0",
    name: "Test Plugin",
    description: "A test plugin for validation",
    author: { name: "Test Author", email: "test@example.com" },
    permissions: ["read:materials", "execute:calculations"],
    hooks: [{ point: "before_calculate", handler: "onBeforeCalc", priority: 500 }],
    actions: [{ name: "custom_action", description: "Does something", handler: "handleAction" }],
    tags: ["test", "demo"],
  };

  it("should accept valid manifest", () => {
    const result = PluginManifestEngine.validateManifest(validManifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject invalid plugin ID", () => {
    const result = PluginManifestEngine.validateManifest({ ...validManifest, id: "INVALID ID" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("id"))).toBe(true);
  });

  it("should reject invalid version", () => {
    const result = PluginManifestEngine.validateManifest({ ...validManifest, version: "not-semver" });
    expect(result.valid).toBe(false);
  });

  it("should reject missing required fields", () => {
    const result = PluginManifestEngine.validateManifest({ id: "test" });
    expect(result.valid).toBe(false);
  });

  it("should accept scoped plugin ID", () => {
    const result = PluginManifestEngine.validateManifest({ ...validManifest, id: "@prism/test-plugin" });
    expect(result.valid).toBe(true);
  });

  it("should accept manifest with defaults", () => {
    const minimal = {
      id: "minimal-plugin",
      version: "0.1.0",
      name: "Minimal Plugin",
      description: "Bare minimum",
      author: { name: "Author" },
    };
    const result = PluginManifestEngine.validateManifest(minimal);
    expect(result.valid).toBe(true);
  });
});

// ─── U-PLG2: Plugin Lifecycle ───────────────────────────────────────────────

describe("PluginManifest — lifecycle (U-PLG2)", () => {
  let engine: any;

  const manifest = {
    id: "lifecycle-test",
    version: "1.0.0",
    name: "Lifecycle Test",
    description: "Tests lifecycle transitions",
    author: { name: "Test" },
    permissions: ["read:materials"],
  };

  beforeEach(async () => {
    const mod = await import("../engines/PluginManifestEngine.js");
    engine = new mod.PluginManifestEngine();
  });

  it("should register a plugin", () => {
    const result = engine.register(manifest);
    expect(result.ok).toBe(true);
    expect(result.plugin_id).toBe("lifecycle-test");
  });

  it("should reject duplicate registration", () => {
    engine.register(manifest);
    const result = engine.register(manifest);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("already registered");
  });

  it("should validate a registered plugin", () => {
    engine.register(manifest);
    const result = engine.validate("lifecycle-test");
    expect(result.ok).toBe(true);
  });

  it("should activate after validation", () => {
    engine.register(manifest);
    engine.validate("lifecycle-test");
    const result = engine.activate("lifecycle-test");
    expect(result.ok).toBe(true);
  });

  it("should reject activation without validation", () => {
    engine.register(manifest);
    const result = engine.activate("lifecycle-test");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("validated");
  });

  it("should deactivate an active plugin", () => {
    engine.register(manifest);
    engine.validate("lifecycle-test");
    engine.activate("lifecycle-test");
    const result = engine.deactivate("lifecycle-test");
    expect(result.ok).toBe(true);
  });

  it("should reject deactivation of non-active plugin", () => {
    engine.register(manifest);
    const result = engine.deactivate("lifecycle-test");
    expect(result.ok).toBe(false);
  });

  it("should list all plugins", () => {
    engine.register(manifest);
    engine.register({ ...manifest, id: "second-plugin", name: "Second", description: "Two", author: { name: "T" } });
    const list = engine.list();
    expect(list).toHaveLength(2);
  });

  it("should filter plugins by status", () => {
    engine.register(manifest);
    engine.register({ ...manifest, id: "other-plugin", name: "Other", description: "O", author: { name: "T" } });
    engine.validate("lifecycle-test");
    engine.activate("lifecycle-test");

    const active = engine.list({ status: "active" });
    expect(active).toHaveLength(1);
    expect(active[0].manifest.id).toBe("lifecycle-test");
  });

  it("should get a specific plugin", () => {
    engine.register(manifest);
    const record = engine.get("lifecycle-test");
    expect(record).not.toBeNull();
    expect(record.manifest.id).toBe("lifecycle-test");
    expect(record.status).toBe("registered");
  });

  it("should return null for unknown plugin", () => {
    expect(engine.get("nonexistent")).toBeNull();
  });

  it("should remove an inactive plugin", () => {
    engine.register(manifest);
    engine.validate("lifecycle-test");
    engine.activate("lifecycle-test");
    engine.deactivate("lifecycle-test");
    const result = engine.remove("lifecycle-test");
    expect(result.ok).toBe(true);
    expect(engine.get("lifecycle-test")).toBeNull();
  });

  it("should reject removing active plugin", () => {
    engine.register(manifest);
    engine.validate("lifecycle-test");
    engine.activate("lifecycle-test");
    const result = engine.remove("lifecycle-test");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Deactivate");
  });

  it("should warn about high-priority hooks", () => {
    const highPriority = {
      ...manifest,
      id: "high-priority-plugin",
      hooks: [{ point: "before_calculate", handler: "fn", priority: 950 }],
    };
    engine.register(highPriority);
    const result = engine.validate("high-priority-plugin");
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w: string) => w.includes("high priority"))).toBe(true);
  });

  it("should warn about no permissions", () => {
    const noPerms = { ...manifest, id: "no-perms", permissions: [] };
    engine.register(noPerms);
    const result = engine.validate("no-perms");
    expect(result.warnings.some((w: string) => w.includes("no permissions"))).toBe(true);
  });
});
