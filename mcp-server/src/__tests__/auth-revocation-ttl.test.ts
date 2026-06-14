// Tests the revocation-store TTL eviction in auth.ts. The store was a Set
// evicted by INSERTION ORDER once it passed 10k entries -- which could drop a
// still-live token's revocation entry and re-honor it. It is now a
// Map<tokenId, revokedAt> aged out only once the token is provably expired
// (now - revokedAt > accessTokenExpiry + buffer), so an evicted entry's token
// is already rejected by its own `exp` claim. Intent (R9): live entries are
// NEVER pruned (no re-honor); expired entries ARE pruned; the env override
// works; the size backstop never fires below the live count.
import { describe, it, expect, afterEach } from "vitest";
import { createOAuthServer } from "../mcp/auth.js";

const SECRET = "x".repeat(40); // >= 32 chars required by the constructor
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("auth revocation-store TTL eviction", () => {
  afterEach(() => {
    delete process.env.PRISM_MCP_REVOCATION_TTL_MS;
  });

  it("keeps a freshly-revoked (still-live) token in the revocation set after cleanup", () => {
    const srv = createOAuthServer(SECRET);
    srv.revokeToken("access-token-live");
    expect(srv.getStats().revoked_access_tokens).toBe(1);
    srv.cleanup(); // default TTL ~3660s -> entry nowhere near expired
    expect(srv.getStats().revoked_access_tokens).toBe(1); // STILL revoked, not re-honored
    srv.shutdown();
  });

  it("evicts a revocation entry only after its TTL elapses (token already expired)", async () => {
    process.env.PRISM_MCP_REVOCATION_TTL_MS = "5";
    const srv = createOAuthServer(SECRET);
    srv.revokeToken("access-token-old");
    expect(srv.getStats().revoked_access_tokens).toBe(1);
    await sleep(25); // exceed the 5ms TTL
    srv.cleanup();
    expect(srv.getStats().revoked_access_tokens).toBe(0); // aged out
    srv.shutdown();
  });

  it("adversarial: with a long TTL a high-churn set is NOT pruned below the live count", async () => {
    process.env.PRISM_MCP_REVOCATION_TTL_MS = String(60 * 60 * 1000); // 1h
    const srv = createOAuthServer(SECRET);
    for (let i = 0; i < 50; i++) srv.revokeToken(`tok-${i}`);
    await sleep(10);
    srv.cleanup();
    expect(srv.getStats().revoked_access_tokens).toBe(50); // none re-honored
    srv.shutdown();
  });

  it("default TTL (no env) is derived from accessTokenExpiry and outlives a fresh token", () => {
    // accessTokenExpiry defaults to 3600s; a just-revoked token must survive a
    // cleanup() under default config -- proves the safe-by-default TTL.
    const srv = createOAuthServer(SECRET);
    srv.revokeToken("tok-default-ttl");
    srv.cleanup();
    expect(srv.getStats().revoked_access_tokens).toBe(1);
    srv.shutdown();
  });

  it("revoking the same token twice keeps a single entry (Map de-dupes by tokenId)", () => {
    const srv = createOAuthServer(SECRET);
    srv.revokeToken("dup");
    srv.revokeToken("dup");
    expect(srv.getStats().revoked_access_tokens).toBe(1);
    srv.shutdown();
  });

  it("a malformed/short TTL override falls back to the safe default (entry survives)", () => {
    process.env.PRISM_MCP_REVOCATION_TTL_MS = "not-a-number";
    const srv = createOAuthServer(SECRET);
    srv.revokeToken("tok-bad-env");
    srv.cleanup();
    expect(srv.getStats().revoked_access_tokens).toBe(1); // bad env ignored, default kept
    srv.shutdown();
  });
});
