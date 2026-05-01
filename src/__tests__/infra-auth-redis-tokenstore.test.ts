/**
 * INFRA-3-1 U-AUTH1: Redis Token Store Tests
 *
 * Tests the ITokenStore interface (InMemoryTokenStore) and verifies
 * PrismOAuthServer correctly delegates to the store.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  createInMemoryTokenStore,
  type ITokenStore,
  type StoredAuthCode,
  type StoredRefreshToken,
} from "../mcp/RedisTokenStore.js";
import { createOAuthServer, type PrismOAuthServer } from "../mcp/auth.js";

const TEST_SECRET = "infra-auth-redis-test-secret-must-be-at-least-32chars!!";

function makeAuthCode(code: string): StoredAuthCode {
  return {
    code,
    clientId: "test-client",
    redirectUri: "http://localhost/callback",
    codeChallenge: "challenge123",
    codeChallengeMethod: "S256",
    scope: "read",
    user: { sub: "user-1", role: "programmer", scope: "read" },
    expiresAt: Date.now() + 600_000,
    used: false,
  };
}

function makeRefreshToken(token: string, sub = "user-1"): StoredRefreshToken {
  return {
    token,
    user: { sub, role: "programmer", scope: "read" },
    clientId: "test-client",
    scope: "read",
    expiresAt: Date.now() + 86400_000 * 30,
    revoked: false,
  };
}

// ============================================================================
// InMemoryTokenStore Tests
// ============================================================================

describe("InMemoryTokenStore", () => {
  let store: ITokenStore;

  beforeEach(() => {
    store = createInMemoryTokenStore();
  });

  it("should report memory mode", () => {
    expect(store.mode).toBe("memory");
  });

  it("should init and return false (no Redis)", async () => {
    const ok = await store.init();
    expect(ok).toBe(false);
  });

  // Auth codes
  it("should set and get auth code", async () => {
    const code = makeAuthCode("code-1");
    await store.setAuthCode("code-1", code, 600_000);
    const got = await store.getAuthCode("code-1");
    expect(got).not.toBeNull();
    expect(got!.code).toBe("code-1");
    expect(got!.user.sub).toBe("user-1");
  });

  it("should return null for missing auth code", async () => {
    expect(await store.getAuthCode("nonexistent")).toBeNull();
  });

  it("should delete auth code", async () => {
    await store.setAuthCode("code-2", makeAuthCode("code-2"), 600_000);
    await store.deleteAuthCode("code-2");
    expect(await store.getAuthCode("code-2")).toBeNull();
  });

  // Refresh tokens
  it("should set and get refresh token", async () => {
    const rt = makeRefreshToken("rt-1");
    await store.setRefreshToken("rt-1", rt, 86400_000);
    const got = await store.getRefreshToken("rt-1");
    expect(got).not.toBeNull();
    expect(got!.token).toBe("rt-1");
  });

  it("should get refresh tokens by user", async () => {
    await store.setRefreshToken("rt-a", makeRefreshToken("rt-a", "alice"), 86400_000);
    await store.setRefreshToken("rt-b", makeRefreshToken("rt-b", "bob"), 86400_000);
    await store.setRefreshToken("rt-c", makeRefreshToken("rt-c", "alice"), 86400_000);
    const aliceTokens = await store.getRefreshTokensByUser("alice");
    expect(aliceTokens.length).toBe(2);
  });

  it("should update refresh token (mark revoked)", async () => {
    const rt = makeRefreshToken("rt-3");
    await store.setRefreshToken("rt-3", rt, 86400_000);
    rt.revoked = true;
    await store.updateRefreshToken("rt-3", rt);
    const got = await store.getRefreshToken("rt-3");
    expect(got!.revoked).toBe(true);
  });

  it("should delete refresh token", async () => {
    await store.setRefreshToken("rt-4", makeRefreshToken("rt-4"), 86400_000);
    await store.deleteRefreshToken("rt-4");
    expect(await store.getRefreshToken("rt-4")).toBeNull();
  });

  // Revoked tokens
  it("should add and check revoked access token", async () => {
    await store.addRevokedToken("hash-1", 3600_000);
    expect(await store.isRevoked("hash-1")).toBe(true);
    expect(await store.isRevoked("hash-2")).toBe(false);
  });

  it("should count revoked tokens", async () => {
    await store.addRevokedToken("h1", 3600_000);
    await store.addRevokedToken("h2", 3600_000);
    expect(await store.getRevokedCount()).toBe(2);
  });

  // Stats
  it("should return stats", async () => {
    await store.setAuthCode("c1", makeAuthCode("c1"), 600_000);
    await store.setRefreshToken("r1", makeRefreshToken("r1"), 86400_000);
    await store.addRevokedToken("rv1", 3600_000);
    const stats = await store.getStats();
    expect(stats.mode).toBe("memory");
    expect(stats.auth_codes).toBe(1);
    expect(stats.refresh_tokens).toBe(1);
    expect(stats.revoked_access_tokens).toBe(1);
  });

  // Cleanup
  it("should cleanup expired codes and revoked tokens", async () => {
    const expired = makeAuthCode("exp");
    expired.expiresAt = Date.now() - 1000;
    await store.setAuthCode("exp", expired, 600_000);

    const revokedRt = makeRefreshToken("rev");
    revokedRt.revoked = true;
    await store.setRefreshToken("rev", revokedRt, 86400_000);

    const result = await store.cleanup();
    expect(result.codes_removed).toBe(1);
    expect(result.tokens_removed).toBe(1);
  });

  // Clear
  it("should clear all entries", async () => {
    await store.setAuthCode("c1", makeAuthCode("c1"), 600_000);
    await store.setRefreshToken("r1", makeRefreshToken("r1"), 86400_000);
    await store.addRevokedToken("rv1", 3600_000);
    await store.clear();
    expect(await store.getAuthCode("c1")).toBeNull();
    expect(await store.getRefreshToken("r1")).toBeNull();
    expect(await store.isRevoked("rv1")).toBe(false);
  });
});

// ============================================================================
// PrismOAuthServer + Token Store Integration
// ============================================================================

describe("PrismOAuthServer with ITokenStore", () => {
  let server: PrismOAuthServer;
  let store: ITokenStore;

  beforeEach(() => {
    process.env.PRISM_AUTH_ENABLED = "true";
    process.env.PRISM_JWT_SECRET = TEST_SECRET;
    store = createInMemoryTokenStore();
    server = createOAuthServer(TEST_SECRET, store);
  });

  it("should report store mode", () => {
    expect(server.storeMode).toBe("memory");
  });

  it("should generate auth URL and store code in store", async () => {
    server.registerUser({ sub: "u1", role: "programmer", scope: "read program" });
    const result = await server.generateAuthorizationUrl(
      {
        clientId: "prism-web",
        redirectUri: "http://localhost:5173/callback",
        codeChallenge: "test-challenge",
        codeChallengeMethod: "S256",
        scope: "read",
      },
      { sub: "u1", role: "programmer", scope: "read" },
    );
    expect(result.code).toBeDefined();
    expect(result.authorization_url).toContain("code=");

    // Code should be in the store
    const stored = await store.getAuthCode(result.code);
    expect(stored).not.toBeNull();
    expect(stored!.user.sub).toBe("u1");
  });

  it("should revoke token and persist in store", async () => {
    await server.revokeToken("some-access-token");
    // The hash of the token should be in the revoked set
    const stats = await server.getStats();
    expect(stats.revoked_access_tokens).toBeGreaterThanOrEqual(1);
    expect(stats.store_mode).toBe("memory");
  });

  it("should revoke all user tokens via store", async () => {
    // Manually add refresh tokens for a user
    await store.setRefreshToken("rt-x", makeRefreshToken("rt-x", "alice"), 86400_000);
    await store.setRefreshToken("rt-y", makeRefreshToken("rt-y", "alice"), 86400_000);
    const count = await server.revokeAllUserTokens("alice");
    expect(count).toBe(2);
    // Both should now be revoked
    const rtX = await store.getRefreshToken("rt-x");
    const rtY = await store.getRefreshToken("rt-y");
    expect(rtX!.revoked).toBe(true);
    expect(rtY!.revoked).toBe(true);
  });

  it("should shutdown cleanly", async () => {
    await server.shutdown();
    // Store should be closed (no error thrown)
  });

  it("getStats should include store_mode", async () => {
    const stats = await server.getStats();
    expect(stats.store_mode).toBe("memory");
    expect(stats.registered_users).toBeGreaterThanOrEqual(0);
  });
});
