/**
 * PROD-MS0: Auth Middleware, Rate Limiting, Audit Logging, Security Headers Tests
 * Tests the Express middleware stack for production deployment.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { AuthEngine } from "../engines/AuthEngine.js";
import { RateLimitEngine } from "../engines/RateLimitEngine.js";

// ── AuthEngine.validateToken ─────────────────────────────────────────
describe("AuthEngine.validateToken", () => {
  let engine: AuthEngine;

  beforeEach(() => {
    engine = new AuthEngine();
  });

  it("returns invalid for unknown token", () => {
    const result = engine.validateToken("fake-token-123");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Token not found");
  });

  it("returns valid with user info for active access token", () => {
    engine.register("alice", "password123", ["operator"]);
    const loginResult = engine.login("alice", "password123");
    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();

    const validation = engine.validateToken(loginResult.token!.access_token);
    expect(validation.valid).toBe(true);
    expect(validation.user_id).toBe(loginResult.user_id);
    expect(validation.roles).toContain("operator");
    expect(validation.permissions).toContain("machine:read");
  });

  it("rejects refresh token used as access token", () => {
    engine.register("bob", "password123", ["viewer"]);
    const loginResult = engine.login("bob", "password123");
    expect(loginResult.token).toBeDefined();

    const validation = engine.validateToken(loginResult.token!.refresh_token);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe("Not an access token");
  });

  it("returns permissions for admin (wildcard)", () => {
    engine.register("admin", "admin12345", ["admin"]);
    const loginResult = engine.login("admin", "admin12345");
    expect(loginResult.token).toBeDefined();

    const validation = engine.validateToken(loginResult.token!.access_token);
    expect(validation.valid).toBe(true);
    expect(validation.permissions).toContain("*");
  });

  it("returns correct multi-role permissions", () => {
    engine.register("multi", "password123", ["operator", "programmer"]);
    const loginResult = engine.login("multi", "password123");
    const validation = engine.validateToken(loginResult.token!.access_token);
    expect(validation.valid).toBe(true);
    // Should have both operator + programmer permissions merged
    expect(validation.permissions).toContain("machine:operate");
    expect(validation.permissions).toContain("program:create");
  });
});

// ── AuthEngine full flow ─────────────────────────────────────────────
describe("AuthEngine full auth flow", () => {
  let engine: AuthEngine;

  beforeEach(() => {
    engine = new AuthEngine();
  });

  it("register → login → validate → refresh → validate", () => {
    // Register
    const reg = engine.register("carol", "secure_pass_1", ["quality"]);
    expect(reg.success).toBe(true);

    // Login
    const login = engine.login("carol", "secure_pass_1");
    expect(login.success).toBe(true);
    const token = login.token!;

    // Validate access token
    const v1 = engine.validateToken(token.access_token);
    expect(v1.valid).toBe(true);

    // Refresh
    const refresh = engine.refreshToken(token.refresh_token);
    expect(refresh.success).toBe(true);
    const newToken = refresh.token!;

    // Old refresh token should be revoked
    const v2 = engine.refreshToken(token.refresh_token);
    expect(v2.success).toBe(false);

    // New access token should work
    const v3 = engine.validateToken(newToken.access_token);
    expect(v3.valid).toBe(true);
  });

  it("account lockout after failed attempts", () => {
    engine.register("dave", "correct_pass1", ["viewer"]);

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const r = engine.login("dave", "wrong_password");
      expect(r.success).toBe(false);
    }

    // Account should be locked
    const locked = engine.login("dave", "correct_pass1");
    expect(locked.success).toBe(false);
    expect(locked.error).toContain("locked");
  });

  it("MFA flow blocks login until MFA complete", () => {
    engine.register("eve", "password123", ["admin"]);
    const login1 = engine.login("eve", "password123");
    expect(login1.success).toBe(true);

    // Enable MFA
    const mfa = engine.setupMFA(login1.user_id!);
    expect(mfa.success).toBe(true);
    expect(mfa.secret).toBeTruthy();

    // Next login should require MFA
    const login2 = engine.login("eve", "password123");
    expect(login2.success).toBe(false);
    expect(login2.requires_mfa).toBe(true);
  });

  it("permission check with wildcard", () => {
    engine.register("admin1", "password123", ["admin"]);
    const login = engine.login("admin1", "password123");
    const check = engine.checkPermission(login.user_id!, "any:permission:at:all");
    expect(check.allowed).toBe(true);
  });

  it("permission check denies unauthorized action", () => {
    engine.register("viewer1", "password123", ["viewer"]);
    const login = engine.login("viewer1", "password123");
    const check = engine.checkPermission(login.user_id!, "machine:operate");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("lacks");
  });

  it("session management", () => {
    engine.register("frank", "password123", ["operator"]);
    const login = engine.login("frank", "password123", "192.168.1.1", "Chrome/120");
    const sessions = engine.listSessions(login.user_id!);
    expect(sessions.length).toBe(1);
    expect(sessions[0].ip_address).toBe("192.168.1.1");

    // Revoke session
    const revoked = engine.revokeSession(sessions[0].session_id);
    expect(revoked).toBe(true);

    // No active sessions
    const after = engine.listSessions(login.user_id!);
    expect(after.length).toBe(0);
  });

  it("role assignment", () => {
    engine.register("grace", "password123", ["viewer"]);
    const login = engine.login("grace", "password123");

    // Initially can't operate
    const check1 = engine.checkPermission(login.user_id!, "machine:operate");
    expect(check1.allowed).toBe(false);

    // Assign operator role
    engine.assignRole(login.user_id!, "operator");

    // Now can operate
    const check2 = engine.checkPermission(login.user_id!, "machine:operate");
    expect(check2.allowed).toBe(true);
  });

  it("duplicate registration fails", () => {
    engine.register("hank", "password123", ["viewer"]);
    const dup = engine.register("hank", "different_pass", ["admin"]);
    expect(dup.success).toBe(false);
    expect(dup.error).toContain("already exists");
  });

  it("short password rejected", () => {
    const r = engine.register("short", "abc", ["viewer"]);
    expect(r.success).toBe(false);
    expect(r.error).toContain("8 characters");
  });

  it("getRoles returns all defined roles", () => {
    const roles = engine.getRoles();
    expect(roles.length).toBe(7);
    const names = roles.map(r => r.name);
    expect(names).toContain("admin");
    expect(names).toContain("operator");
    expect(names).toContain("viewer");
    expect(names).toContain("programmer");
    expect(names).toContain("maintenance");
    expect(names).toContain("quality");
    expect(names).toContain("guest");
  });
});

// ── RateLimitEngine ──────────────────────────────────────────────────
describe("RateLimitEngine", () => {
  let engine: RateLimitEngine;

  beforeEach(() => {
    engine = new RateLimitEngine();
  });

  it("allows requests within limit", () => {
    const result = engine.consume("RL-API-USER", "user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("exhaustion triggers rate limit", () => {
    // Auth rule: 10 requests per 300s, no burst
    for (let i = 0; i < 10; i++) {
      const r = engine.consume("RL-AUTH", "ip-attacker");
      expect(r.allowed).toBe(true);
    }
    // 11th should be blocked
    const blocked = engine.consume("RL-AUTH", "ip-attacker");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retry_after_sec).toBeGreaterThan(0);
  });

  it("check without consume doesn't decrement", () => {
    const check1 = engine.check("RL-API-USER", "user-2");
    const check2 = engine.check("RL-API-USER", "user-2");
    expect(check1.remaining).toBe(check2.remaining);
  });

  it("reset clears bucket", () => {
    engine.consume("RL-API-USER", "user-3");
    const reset = engine.reset("RL-API-USER", "user-3");
    expect(reset).toBe(true);
    // After reset, should have full quota
    const status = engine.status("RL-API-USER", "user-3");
    expect(status.remaining).toBeGreaterThan(0);
    expect(status.is_limited).toBe(false);
  });

  it("unknown rule allows request", () => {
    const result = engine.check("NONEXISTENT", "any-key");
    expect(result.allowed).toBe(true);
  });

  it("status reports rate limit state", () => {
    const status = engine.status("RL-API-GLOBAL", "global");
    expect(status.rule_id).toBe("RL-API-GLOBAL");
    expect(status.remaining).toBeGreaterThan(0);
    expect(status.is_limited).toBe(false);
  });

  it("custom rule can be added", () => {
    engine.addRule({
      id: "CUSTOM-1",
      name: "Custom Test",
      algorithm: "fixed_window",
      scope: "per_user",
      max_requests: 3,
      window_sec: 60,
      burst_allowance: 0,
      cooldown_sec: 5,
    });

    for (let i = 0; i < 3; i++) {
      expect(engine.consume("CUSTOM-1", "u1").allowed).toBe(true);
    }
    expect(engine.consume("CUSTOM-1", "u1").allowed).toBe(false);
  });

  it("listRules returns default rules", () => {
    const rules = engine.listRules();
    expect(rules.length).toBeGreaterThanOrEqual(5);
    const ids = rules.map(r => r.id);
    expect(ids).toContain("RL-API-GLOBAL");
    expect(ids).toContain("RL-AUTH");
  });

  it("different keys have independent buckets", () => {
    // Exhaust for user-a
    for (let i = 0; i < 10; i++) {
      engine.consume("RL-AUTH", "user-a");
    }
    expect(engine.consume("RL-AUTH", "user-a").allowed).toBe(false);
    // user-b should still be fine
    expect(engine.consume("RL-AUTH", "user-b").allowed).toBe(true);
  });

  it("clear resets all buckets", () => {
    engine.consume("RL-AUTH", "user-clear-test");
    engine.clear();
    const status = engine.status("RL-AUTH", "user-clear-test");
    expect(status.is_limited).toBe(false);
  });
});

// ── Security Headers (unit-level) ────────────────────────────────────
describe("Security Headers middleware", () => {
  it("module exports securityHeaders function", async () => {
    const mod = await import("../middleware/securityHeaders.js");
    expect(typeof mod.securityHeaders).toBe("function");
  });
});

// ── Audit Log (unit-level) ───────────────────────────────────────────
describe("Audit Log middleware", () => {
  it("module exports auditLog function", async () => {
    const mod = await import("../middleware/auditLog.js");
    expect(typeof mod.auditLog).toBe("function");
  });
});

// ── Auth Middleware (unit-level) ─────────────────────────────────────
describe("Auth middleware exports", () => {
  it("exports verifyToken, optionalToken, requireRole, requirePermission", async () => {
    const mod = await import("../middleware/auth.js");
    expect(typeof mod.verifyToken).toBe("function");
    expect(typeof mod.optionalToken).toBe("function");
    expect(typeof mod.requireRole).toBe("function");
    expect(typeof mod.requirePermission).toBe("function");
  });
});

// ── Rate Limit Middleware (unit-level) ───────────────────────────────
describe("Rate Limit middleware exports", () => {
  it("exports rateLimitMiddleware function", async () => {
    const mod = await import("../middleware/rateLimit.js");
    expect(typeof mod.rateLimitMiddleware).toBe("function");
  });
});
