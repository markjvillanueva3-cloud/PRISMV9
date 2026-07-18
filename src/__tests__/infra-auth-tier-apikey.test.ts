/**
 * INFRA-3-2 U-AUTH2 + INFRA-3-3 U-AUTH3: Tier Gate Usage Counters + API Key Auth Tests
 *
 * Tests:
 * - InMemoryUsageCounter: increment, getUsage, getUserUsage, reset, stats
 * - checkTierAccess with actual usage counts
 * - trackUsage middleware behavior
 * - API key hashing + generation
 * - InMemoryApiKeyStore: register, validate, revoke, expire
 * - verifyApiKey middleware (header extraction)
 * - Migration 015 SQL structure
 */
import { describe, it, expect, beforeEach } from "vitest";

// ─── U-AUTH2: Usage Counter Tests ───────────────────────────────────────────

describe("UsageCounter — InMemoryUsageCounter", () => {
  let counter: any;

  beforeEach(async () => {
    const { createInMemoryUsageCounter } = await import("../middleware/usageCounter.js");
    counter = createInMemoryUsageCounter();
  });

  it("should start at 0 usage", async () => {
    expect(await counter.getUsage("user1", "speed_feed")).toBe(0);
  });

  it("should increment and return new count", async () => {
    const count1 = await counter.increment("user1", "speed_feed");
    expect(count1).toBe(1);
    const count2 = await counter.increment("user1", "speed_feed");
    expect(count2).toBe(2);
  });

  it("should track separate features independently", async () => {
    await counter.increment("user1", "speed_feed");
    await counter.increment("user1", "speed_feed");
    await counter.increment("user1", "program_generate");

    expect(await counter.getUsage("user1", "speed_feed")).toBe(2);
    expect(await counter.getUsage("user1", "program_generate")).toBe(1);
    expect(await counter.getUsage("user1", "simulation")).toBe(0);
  });

  it("should track separate users independently", async () => {
    await counter.increment("user1", "speed_feed");
    await counter.increment("user2", "speed_feed");
    await counter.increment("user2", "speed_feed");

    expect(await counter.getUsage("user1", "speed_feed")).toBe(1);
    expect(await counter.getUsage("user2", "speed_feed")).toBe(2);
  });

  it("should return all feature usage for a user", async () => {
    await counter.increment("user1", "speed_feed");
    await counter.increment("user1", "speed_feed");
    await counter.increment("user1", "dfm");
    await counter.increment("user2", "simulation"); // different user

    const usage = await counter.getUserUsage("user1");
    expect(usage.speed_feed).toBe(2);
    expect(usage.dfm).toBe(1);
    expect(usage.simulation).toBeUndefined();
  });

  it("should reset a specific counter", async () => {
    await counter.increment("user1", "speed_feed");
    await counter.increment("user1", "speed_feed");
    expect(await counter.getUsage("user1", "speed_feed")).toBe(2);

    await counter.reset("user1", "speed_feed");
    expect(await counter.getUsage("user1", "speed_feed")).toBe(0);
  });

  it("should report mode as memory", async () => {
    const stats = await counter.getStats();
    expect(stats.mode).toBe("memory");
    expect(stats.tracked_keys).toBe(0);
  });

  it("should report tracked keys count", async () => {
    await counter.increment("user1", "speed_feed");
    await counter.increment("user2", "dfm");
    const stats = await counter.getStats();
    expect(stats.tracked_keys).toBe(2);
  });
});

// ─── U-AUTH2: Tier Gate Integration ─────────────────────────────────────────

describe("TierGate — checkTierAccess with usage", () => {
  let checkTierAccess: any;

  beforeEach(async () => {
    const mod = await import("../middleware/tierGate.js");
    checkTierAccess = mod.checkTierAccess;
  });

  it("should allow free plan under speed_feed limit", () => {
    const result = checkTierAccess("free", "speed_feed", 5);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("5/10");
  });

  it("should block free plan at speed_feed limit", () => {
    const result = checkTierAccess("free", "speed_feed", 10);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("limit reached");
  });

  it("should allow unlimited speed_feed for starter", () => {
    const result = checkTierAccess("starter", "speed_feed", 999);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("Unlimited");
  });

  it("should block program_generate for free plan", () => {
    const result = checkTierAccess("free", "program_generate", 0);
    expect(result.allowed).toBe(false);
  });

  it("should allow pro plan 4/5 program_generate", () => {
    const result = checkTierAccess("pro", "program_generate", 4);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("4/5");
  });

  it("should block pro plan at program_generate limit", () => {
    const result = checkTierAccess("pro", "program_generate", 5);
    expect(result.allowed).toBe(false);
  });

  it("should allow simulation for pro plan", () => {
    expect(checkTierAccess("pro", "simulation").allowed).toBe(true);
  });

  it("should block simulation for starter plan", () => {
    expect(checkTierAccess("starter", "simulation").allowed).toBe(false);
  });

  it("should allow API access only for enterprise", () => {
    expect(checkTierAccess("enterprise", "api_access").allowed).toBe(true);
    expect(checkTierAccess("shop", "api_access").allowed).toBe(false);
    expect(checkTierAccess("free", "api_access").allowed).toBe(false);
  });

  it("should deny unknown features", () => {
    expect(checkTierAccess("enterprise", "unknown_feature").allowed).toBe(false);
  });

  it("should deny unknown plans", () => {
    expect(checkTierAccess("invalid" as any, "speed_feed").allowed).toBe(false);
  });
});

// ─── U-AUTH2: trackUsage middleware ─────────────────────────────────────────

describe("trackUsage — middleware factory", () => {
  it("should export trackUsage function", async () => {
    const { trackUsage } = await import("../middleware/usageCounter.js");
    expect(typeof trackUsage).toBe("function");
  });

  it("should return a middleware function", async () => {
    const { trackUsage } = await import("../middleware/usageCounter.js");
    const mw = trackUsage("speed_feed");
    expect(typeof mw).toBe("function");
    expect(mw.length).toBe(3); // req, res, next
  });
});

// ─── U-AUTH3: API Key Hashing ───────────────────────────────────────────────

describe("ApiKeyAuth — key hashing", () => {
  let hashApiKey: any;
  let generateApiKey: any;

  beforeEach(async () => {
    const mod = await import("../middleware/apiKeyAuth.js");
    hashApiKey = mod.hashApiKey;
    generateApiKey = mod.generateApiKey;
  });

  it("should produce consistent hashes", () => {
    const hash1 = hashApiKey("test_key_123");
    const hash2 = hashApiKey("test_key_123");
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different keys", () => {
    const hash1 = hashApiKey("key_a");
    const hash2 = hashApiKey("key_b");
    expect(hash1).not.toBe(hash2);
  });

  it("should produce hex string", () => {
    const hash = hashApiKey("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should generate secret keys with correct prefix", () => {
    const key = generateApiKey("secret");
    expect(key).toMatch(/^prism_sk_[0-9a-f]{64}$/);
  });

  it("should generate publishable keys with correct prefix", () => {
    const key = generateApiKey("publishable");
    expect(key).toMatch(/^prism_pk_[0-9a-f]{64}$/);
  });

  it("should generate unique keys", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});

// ─── U-AUTH3: InMemoryApiKeyStore ───────────────────────────────────────────

describe("ApiKeyAuth — InMemoryApiKeyStore", () => {
  let store: any;

  beforeEach(async () => {
    const { InMemoryApiKeyStore } = await import("../middleware/apiKeyAuth.js");
    store = new InMemoryApiKeyStore();
  });

  it("should validate registered key", () => {
    store.register("prism_sk_test123", {
      id: "key-1",
      user_id: "user-1",
      name: "Test Key",
      permissions: ["read", "write"],
      role: "engineer",
      plan: "pro",
      expires_at: null,
      revoked: false,
      last_used_at: null,
    });

    const result = store.validate("prism_sk_test123");
    expect(result.valid).toBe(true);
    expect(result.user_id).toBe("user-1");
    expect(result.role).toBe("engineer");
    expect(result.plan).toBe("pro");
    expect(result.permissions).toEqual(["read", "write"]);
  });

  it("should reject unregistered key", () => {
    const result = store.validate("prism_sk_unknown");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Invalid");
  });

  it("should reject revoked key", async () => {
    const { hashApiKey } = await import("../middleware/apiKeyAuth.js");
    store.register("prism_sk_revoke_me", {
      id: "key-2", user_id: "user-1", name: "Revokable",
      permissions: [], role: "viewer", plan: "free",
      expires_at: null, revoked: false, last_used_at: null,
    });

    const hash = hashApiKey("prism_sk_revoke_me");
    store.revoke(hash);

    const result = store.validate("prism_sk_revoke_me");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("revoked");
  });

  it("should reject expired key", () => {
    store.register("prism_sk_expired", {
      id: "key-3", user_id: "user-1", name: "Expired",
      permissions: [], role: "viewer", plan: "free",
      expires_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
      revoked: false, last_used_at: null,
    });

    const result = store.validate("prism_sk_expired");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("should accept key with future expiry", () => {
    store.register("prism_sk_future", {
      id: "key-4", user_id: "user-1", name: "Future",
      permissions: [], role: "operator", plan: "shop",
      expires_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      revoked: false, last_used_at: null,
    });

    const result = store.validate("prism_sk_future");
    expect(result.valid).toBe(true);
    expect(result.plan).toBe("shop");
  });

  it("should clear all keys", () => {
    store.register("prism_sk_temp", {
      id: "key-5", user_id: "user-1", name: "Temp",
      permissions: [], role: "viewer", plan: "free",
      expires_at: null, revoked: false, last_used_at: null,
    });
    store.clear();
    expect(store.validate("prism_sk_temp").valid).toBe(false);
  });
});

// ─── U-AUTH3: verifyApiKey middleware ────────────────────────────────────────

describe("ApiKeyAuth — verifyApiKey middleware", () => {
  it("should export verifyApiKey function", async () => {
    const { verifyApiKey } = await import("../middleware/apiKeyAuth.js");
    expect(typeof verifyApiKey).toBe("function");
  });

  it("should export verifyTokenOrApiKey function", async () => {
    const { verifyTokenOrApiKey } = await import("../middleware/apiKeyAuth.js");
    expect(typeof verifyTokenOrApiKey).toBe("function");
  });
});

// ─── U-AUTH2: requireTier middleware ─────────────────────────────────────────

describe("TierGate — requireTier middleware", () => {
  it("should export requireTier function", async () => {
    const { requireTier } = await import("../middleware/tierGate.js");
    expect(typeof requireTier).toBe("function");
    const mw = requireTier("speed_feed");
    expect(typeof mw).toBe("function");
  });

  it("should export TIER_LIMITS", async () => {
    const { TIER_LIMITS } = await import("../middleware/tierGate.js");
    expect(TIER_LIMITS).toBeDefined();
    expect(TIER_LIMITS.free).toBeDefined();
    expect(TIER_LIMITS.enterprise).toBeDefined();
    expect(TIER_LIMITS.free.speed_feed_per_day).toBe(10);
    expect(TIER_LIMITS.enterprise.api_access).toBe(true);
  });
});

// ─── Migration 015 SQL structure ────────────────────────────────────────────

describe("Migration 015 — API key enhancements", () => {
  it("should have correct SQL structure", async () => {
    const { readFile } = await import("fs/promises");
    const sql = await readFile("H:/prism/src/db/migrations/015-api-key-enhancements.sql", "utf8");

    // Plan column on users
    expect(sql).toContain("ALTER TABLE users");
    expect(sql).toContain("plan VARCHAR");
    expect(sql).toContain("DEFAULT 'free'");
    expect(sql).toContain("'starter'");
    expect(sql).toContain("'pro'");
    expect(sql).toContain("'shop'");
    expect(sql).toContain("'enterprise'");

    // Plan override on api_keys
    expect(sql).toContain("plan_override");

    // Hash index
    expect(sql).toContain("idx_api_keys_key_hash");
    expect(sql).toContain("USING hash");

    // Active keys index
    expect(sql).toContain("idx_api_keys_active");
    expect(sql).toContain("revoked = false");

    // Active keys view
    expect(sql).toContain("api_keys_active");
    expect(sql).toContain("effective_plan");

    // Scope column
    expect(sql).toContain("scope TEXT");
  });
});
