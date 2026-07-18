/**
 * AuthEngineV7 — unit tests
 * MIT 6.005: tests as specs — each test documents a contract.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { AuthEngineV7 } from "../engines/AuthEngineV7.js";

const SECRET = "this-is-a-test-secret-that-is-32chars!!";
let engine: AuthEngineV7;

beforeAll(() => {
  engine = new AuthEngineV7(SECRET);
});

// ============================================================================
// Constructor / fail-fast
// ============================================================================
describe("AuthEngineV7 constructor", () => {
  it("throws when secret is too short", () => {
    expect(() => new AuthEngineV7("short")).toThrow();
  });

  it("constructs successfully with 32+ char secret", () => {
    expect(engine).toBeDefined();
    expect(engine.engineName).toBe("AuthEngineV7");
  });
});

// ============================================================================
// Password hashing
// ============================================================================
describe("hashPassword / verifyPassword", () => {
  it("hashPassword produces a different string than the input", async () => {
    const hash = await engine.hashPassword("mypassword123");
    expect(hash).not.toBe("mypassword123");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifyPassword round-trips correctly — correct password returns true", async () => {
    const plain = "correct-horse-battery";
    const hash = await engine.hashPassword(plain);
    const ok = await engine.verifyPassword(plain, hash);
    expect(ok).toBe(true);
  });

  it("verifyPassword rejects wrong password", async () => {
    const hash = await engine.hashPassword("rightpassword");
    const ok = await engine.verifyPassword("wrongpassword", hash);
    expect(ok).toBe(false);
  });

  it("hashPassword produces different hashes for same input (scrypt salting)", async () => {
    const h1 = await engine.hashPassword("samepassword");
    const h2 = await engine.hashPassword("samepassword");
    expect(h1).not.toBe(h2);
  });
});

// ============================================================================
// Access tokens
// ============================================================================
describe("generateToken / verifyToken", () => {
  const payload = { userId: "user-abc", role: "engineer" as const, plan: "pro" as const };

  it("generateToken returns a string", async () => {
    const token = await engine.generateToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWT header.payload.sig
  });

  it("verifyToken round-trips payload — userId, role, plan", async () => {
    const token = await engine.generateToken(payload);
    const decoded = await engine.verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.plan).toBe(payload.plan);
  });

  it("verifyToken round-trips optional email field", async () => {
    const withEmail = { ...payload, email: "test@prism.ai" };
    const token = await engine.generateToken(withEmail);
    const decoded = await engine.verifyToken(token);
    expect(decoded.email).toBe("test@prism.ai");
  });

  it("expired token fails verification after expiry", async () => {
    // jose requires integer seconds; 1s token verified after 1100ms delay
    const token = await engine.generateToken(payload, "1s");
    await new Promise(r => setTimeout(r, 1100));
    await expect(engine.verifyToken(token)).rejects.toThrow();
  });

  it("token signed with a different secret is rejected", async () => {
    const otherEngine = new AuthEngineV7("another-secret-that-is-32-chars-xx");
    const token = await otherEngine.generateToken(payload);
    await expect(engine.verifyToken(token)).rejects.toThrow();
  });
});

// ============================================================================
// Refresh tokens
// ============================================================================
describe("generateRefreshToken", () => {
  it("generateRefreshToken returns a string", async () => {
    const rt = await engine.generateRefreshToken({ userId: "user-xyz" });
    expect(typeof rt).toBe("string");
    expect(rt.split(".").length).toBe(3);
  });

  it("refresh token is different from access token for same userId", async () => {
    const userId = "user-compare";
    const access  = await engine.generateToken({ userId, role: "operator", plan: "starter" });
    const refresh = await engine.generateRefreshToken({ userId });
    expect(access).not.toBe(refresh);
  });

  it("refresh token still valid after 1 second (30d expiry)", async () => {
    const rt = await engine.generateRefreshToken({ userId: "long-lived-user" });
    await new Promise(r => setTimeout(r, 1000));
    // Should NOT throw — 30d token is still valid after 1s
    const { payload } = await import("jose").then(j =>
      j.jwtVerify(rt, new TextEncoder().encode(SECRET))
    );
    expect(payload["userId"]).toBe("long-lived-user");
  });
});

// ============================================================================
// Tier limits
// ============================================================================
describe("getTierLimits", () => {
  it("returns correct limits for free plan — 10 sf/day", () => {
    const limits = engine.getTierLimits("free");
    expect(limits.speed_feed_per_day).toBe(10);
  });

  it("free plan has 0 program_generate_per_day", () => {
    const limits = engine.getTierLimits("free");
    expect(limits.program_generate_per_day).toBe(0);
  });

  it("free plan has no simulation, stochastic, api_access", () => {
    const limits = engine.getTierLimits("free");
    expect(limits.simulation).toBe(false);
    expect(limits.stochastic).toBe(false);
    expect(limits.api_access).toBe(false);
  });

  it("enterprise has unlimited (-1) speed_feed_per_day", () => {
    const limits = engine.getTierLimits("enterprise");
    expect(limits.speed_feed_per_day).toBe(-1);
  });

  it("enterprise has api_access = true", () => {
    const limits = engine.getTierLimits("enterprise");
    expect(limits.api_access).toBe(true);
  });

  it("enterprise has max_users = -1 (unlimited)", () => {
    const limits = engine.getTierLimits("enterprise");
    expect(limits.max_users).toBe(-1);
  });

  it("pro plan allows simulation", () => {
    const limits = engine.getTierLimits("pro");
    expect(limits.simulation).toBe(true);
  });

  it("starter plan has unlimited sf but no programs", () => {
    const limits = engine.getTierLimits("starter");
    expect(limits.speed_feed_per_day).toBe(-1);
    expect(limits.program_generate_per_day).toBe(0);
  });

  it("getTierLimits returns frozen object (immutable)", () => {
    const limits = engine.getTierLimits("free");
    expect(Object.isFrozen(limits)).toBe(true);
  });

  it("throws on unknown plan", () => {
    expect(() => engine.getTierLimits("unknown" as any)).toThrow();
  });
});

// ============================================================================
// stats
// ============================================================================
describe("stats", () => {
  it("returns engineName and algorithm", () => {
    const s = engine.stats();
    expect(s.engineName).toBe("AuthEngineV7");
    expect(s.algorithm).toBe("HS256");
    expect(s.hashAlgo).toBe("scrypt");
  });
});
