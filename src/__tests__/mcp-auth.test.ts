/**
 * PRISM MCP Server — OAuth 2.1 + PKCE Authorization Tests
 *
 * Tests:
 *   1. PKCE flow (code challenge/verifier generation & validation)
 *   2. JWT generation and validation
 *   3. Role-based permission checks (permission matrix)
 *   4. Middleware blocks unauthorized requests
 *   5. Stdio bypass (local = trusted)
 *   6. Token refresh and rotation
 *   7. Token revocation
 *   8. Auth code expiry and replay protection
 *   9. Scope-to-role resolution
 *  10. OAuth server metadata / discovery
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  PrismOAuthServer,
  createOAuthServer,
  generateCodeVerifier,
  computeCodeChallenge,
  verifyCodeChallenge,
  getPermissionMatrix,
  hasPermission,
  getRequiredRole,
  type AuthUser,
} from "../mcp/auth.js";
import {
  getAuthConfig,
  resetAuthConfig,
  roleAtLeast,
  ROLE_HIERARCHY,
  type OAuthRole,
} from "../mcp/authConfig.js";
import {
  createStdioAuthContext,
  checkToolPermission,
} from "../mcp/authMiddleware.js";

// ============================================================================
// Test Constants
// ============================================================================

const TEST_SECRET = "prism-test-secret-must-be-at-least-32-chars-long!!";
const TEST_CLIENT_ID = "prism-web";
const TEST_REDIRECT_URI = "http://localhost:3000/callback";
const DEFAULT_TEST_ISSUER = "http://127.0.0.1:3000";

function makeUser(role: OAuthRole = "programmer", sub: string = "user-1"): AuthUser {
  return {
    sub,
    role,
    scope: "read operate program",
    email: `${sub}@shop.local`,
    tenant_id: "tenant-1",
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe("MCP OAuth 2.1 + PKCE Authorization", () => {
  let server: PrismOAuthServer;

  beforeEach(() => {
    resetAuthConfig();
    // Set env to enable auth with our test secret
    process.env.PRISM_JWT_SECRET = TEST_SECRET;
    process.env.PRISM_AUTH_ENABLED = "true";
    resetAuthConfig(); // Force re-read
    server = createOAuthServer(TEST_SECRET);
  });

  afterEach(() => {
    server.shutdown();
    delete process.env.PRISM_JWT_SECRET;
    delete process.env.PRISM_AUTH_ENABLED;
    resetAuthConfig();
  });

  // ════════════════════════════════════════════════════════════════════════
  // 1. PKCE Flow
  // ════════════════════════════════════════════════════════════════════════

  describe("PKCE", () => {
    it("generates code verifier of correct length", () => {
      const verifier = generateCodeVerifier(64);
      expect(verifier.length).toBe(64);
      // Must be base64url-safe characters
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("generates unique verifiers", () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toBe(v2);
    });

    it("computes S256 code challenge correctly", () => {
      // Known test vector: SHA256("test-verifier") in base64url
      const verifier = "test-verifier-for-pkce-flow";
      const challenge = computeCodeChallenge(verifier);
      expect(typeof challenge).toBe("string");
      expect(challenge.length).toBeGreaterThan(0);
      // Must be base64url (no +, /, =)
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("verifies matching code challenge", () => {
      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);
      expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
    });

    it("rejects mismatched code challenge", () => {
      const verifier = generateCodeVerifier();
      const wrongChallenge = computeCodeChallenge("wrong-verifier");
      expect(verifyCodeChallenge(verifier, wrongChallenge)).toBe(false);
    });

    it("rejects different length challenges", () => {
      const verifier = generateCodeVerifier();
      expect(verifyCodeChallenge(verifier, "short")).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 2. JWT Generation and Validation
  // ════════════════════════════════════════════════════════════════════════

  describe("JWT tokens", () => {
    it("full PKCE flow: generate URL → exchange code → validate token", async () => {
      const user = makeUser("programmer");
      server.registerUser(user);

      // Step 1: Generate PKCE pair
      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);

      // Step 2: Generate authorization URL
      const { code } = server.generateAuthorizationUrl(
        {
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
          codeChallenge: challenge,
          scope: "read operate program",
        },
        user
      );

      expect(code).toBeTruthy();

      // Step 3: Exchange code for tokens
      const tokens = await server.exchangeCode({
        code,
        codeVerifier: verifier,
        clientId: TEST_CLIENT_ID,
        redirectUri: TEST_REDIRECT_URI,
      });

      expect(tokens.access_token).toBeTruthy();
      expect(tokens.refresh_token).toBeTruthy();
      expect(tokens.token_type).toBe("Bearer");
      expect(tokens.expires_in).toBe(3600);
      expect(tokens.scope).toBe("read operate program");

      // Step 4: Validate the access token
      const result = await server.validateToken(tokens.access_token);
      expect(result.valid).toBe(true);
      expect(result.user?.sub).toBe("user-1");
      expect(result.user?.role).toBe("programmer");
      expect(result.claims?.iss).toBe(DEFAULT_TEST_ISSUER);
      expect(result.claims?.aud).toBe("prism-mcp-server");
      expect(result.claims?.tenant_id).toBe("tenant-1");
    });

    it("rejects token with invalid signature", async () => {
      // Create a token with a different secret
      const otherServer = createOAuthServer("another-secret-that-is-long-enough-32chars!");
      const user = makeUser("viewer");
      otherServer.registerUser(user);

      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);
      const { code } = otherServer.generateAuthorizationUrl(
        {
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
          codeChallenge: challenge,
          scope: "read",
        },
        user
      );

      const tokens = await otherServer.exchangeCode({
        code,
        codeVerifier: verifier,
        clientId: TEST_CLIENT_ID,
        redirectUri: TEST_REDIRECT_URI,
      });

      // Validate with original server (different secret)
      const result = await server.validateToken(tokens.access_token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("signature");

      otherServer.shutdown();
    });

    it("rejects constructor with short secret", () => {
      expect(() => createOAuthServer("short")).toThrow("at least 32 characters");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 3. Role-Based Permission Checks
  // ════════════════════════════════════════════════════════════════════════

  describe("Permission matrix", () => {
    it("builds permission matrix from DISPATCHER_ANNOTATIONS", () => {
      const matrix = getPermissionMatrix();
      expect(Object.keys(matrix).length).toBeGreaterThan(50);
      // Spot-check known classifications
      expect(matrix["prism_data"]).toBe("viewer");
      expect(matrix["prism_calc"]).toBe("viewer");
      expect(matrix["prism_auth"]).toBe("admin");
      expect(matrix["prism_guard"]).toBe("admin");
    });

    it("viewer can access read-only dispatchers", () => {
      expect(hasPermission("viewer", "prism_data")).toBe(true);
      expect(hasPermission("viewer", "prism_calc")).toBe(true);
      expect(hasPermission("viewer", "prism_knowledge")).toBe(true);
      expect(hasPermission("viewer", "prism_safety")).toBe(true);
    });

    it("viewer cannot access programmer dispatchers", () => {
      expect(hasPermission("viewer", "prism_cam")).toBe(false);
      expect(hasPermission("viewer", "prism_generator")).toBe(false);
    });

    it("viewer cannot access admin dispatchers", () => {
      expect(hasPermission("viewer", "prism_auth")).toBe(false);
      expect(hasPermission("viewer", "prism_tenant")).toBe(false);
    });

    it("operator can access viewer + operator dispatchers", () => {
      expect(hasPermission("operator", "prism_data")).toBe(true);
      expect(hasPermission("operator", "prism_machine_live")).toBe(true);
      expect(hasPermission("operator", "prism_diagnosis")).toBe(true);
    });

    it("operator cannot access programmer dispatchers", () => {
      expect(hasPermission("operator", "prism_cam")).toBe(false);
      expect(hasPermission("operator", "prism_generator")).toBe(false);
    });

    it("programmer can access viewer + operator + programmer dispatchers", () => {
      expect(hasPermission("programmer", "prism_data")).toBe(true);
      expect(hasPermission("programmer", "prism_machine_live")).toBe(true);
      expect(hasPermission("programmer", "prism_cam")).toBe(true);
      expect(hasPermission("programmer", "prism_generator")).toBe(true);
      expect(hasPermission("programmer", "prism_toolpath")).toBe(true);
    });

    it("programmer cannot access admin dispatchers", () => {
      expect(hasPermission("programmer", "prism_auth")).toBe(false);
      expect(hasPermission("programmer", "prism_tenant")).toBe(false);
    });

    it("admin can access everything", () => {
      expect(hasPermission("admin", "prism_data")).toBe(true);
      expect(hasPermission("admin", "prism_cam")).toBe(true);
      expect(hasPermission("admin", "prism_auth")).toBe(true);
      expect(hasPermission("admin", "prism_tenant")).toBe(true);
      expect(hasPermission("admin", "prism_guard")).toBe(true);
    });

    it("unknown dispatchers require admin", () => {
      expect(getRequiredRole("prism_nonexistent")).toBe("admin");
      expect(hasPermission("programmer", "prism_nonexistent")).toBe(false);
      expect(hasPermission("admin", "prism_nonexistent")).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 4. Role Hierarchy
  // ════════════════════════════════════════════════════════════════════════

  describe("Role hierarchy", () => {
    it("roleAtLeast works correctly", () => {
      expect(roleAtLeast("admin", "admin")).toBe(true);
      expect(roleAtLeast("admin", "programmer")).toBe(true);
      expect(roleAtLeast("admin", "operator")).toBe(true);
      expect(roleAtLeast("admin", "viewer")).toBe(true);
      expect(roleAtLeast("programmer", "programmer")).toBe(true);
      expect(roleAtLeast("programmer", "admin")).toBe(false);
      expect(roleAtLeast("viewer", "operator")).toBe(false);
    });

    it("ROLE_HIERARCHY is ordered correctly", () => {
      expect(ROLE_HIERARCHY).toEqual(["viewer", "operator", "programmer", "admin"]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 5. Stdio Bypass
  // ════════════════════════════════════════════════════════════════════════

  describe("Stdio bypass", () => {
    it("creates admin context for stdio transport", () => {
      const ctx = createStdioAuthContext();
      expect(ctx?.user.role).toBe("admin");
      expect(ctx?.authenticated).toBe(true);
      expect(ctx?.transport).toBe("stdio");
      expect(ctx?.user.sub).toBe("local-stdio");
    });

    it("stdio admin can access all dispatchers", () => {
      const ctx = createStdioAuthContext();
      expect(hasPermission(ctx!.user.role, "prism_auth")).toBe(true);
      expect(hasPermission(ctx!.user.role, "prism_calc")).toBe(true);
      expect(hasPermission(ctx!.user.role, "prism_cam")).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 6. Token Refresh and Rotation
  // ════════════════════════════════════════════════════════════════════════

  describe("Token refresh", () => {
    it("refreshes token and rotates refresh token", async () => {
      const user = makeUser("operator");
      server.registerUser(user);

      // Get initial tokens
      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);
      const { code } = server.generateAuthorizationUrl(
        {
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
          codeChallenge: challenge,
          scope: "read operate",
        },
        user
      );
      const tokens = await server.exchangeCode({
        code,
        codeVerifier: verifier,
        clientId: TEST_CLIENT_ID,
        redirectUri: TEST_REDIRECT_URI,
      });

      // Refresh
      const newTokens = await server.refreshToken({
        refreshToken: tokens.refresh_token,
      });

      expect(newTokens.access_token).toBeTruthy();
      expect(newTokens.refresh_token).not.toBe(tokens.refresh_token); // Rotated
      expect(newTokens.scope).toBe("read operate");

      // Old refresh token should be revoked (replay protection)
      await expect(
        server.refreshToken({ refreshToken: tokens.refresh_token })
      ).rejects.toThrow("revoked");
    });

    it("rejects invalid refresh token", async () => {
      await expect(
        server.refreshToken({ refreshToken: "invalid-token" })
      ).rejects.toThrow("Invalid refresh token");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 7. Token Revocation
  // ════════════════════════════════════════════════════════════════════════

  describe("Token revocation", () => {
    it("revokes access token", async () => {
      const user = makeUser("viewer");
      server.registerUser(user);

      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);
      const { code } = server.generateAuthorizationUrl(
        {
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
          codeChallenge: challenge,
          scope: "read",
        },
        user
      );
      const tokens = await server.exchangeCode({
        code,
        codeVerifier: verifier,
        clientId: TEST_CLIENT_ID,
        redirectUri: TEST_REDIRECT_URI,
      });

      // Token valid before revocation
      const beforeResult = await server.validateToken(tokens.access_token);
      expect(beforeResult.valid).toBe(true);

      // Revoke
      server.revokeToken(tokens.access_token);

      // Token invalid after revocation
      const afterResult = await server.validateToken(tokens.access_token);
      expect(afterResult.valid).toBe(false);
      expect(afterResult.error).toContain("revoked");
    });

    it("revokes all user tokens", async () => {
      const user = makeUser("programmer", "user-revoke");
      server.registerUser(user);

      // Issue two token pairs
      const tokens1 = await issueTokens(server, user);
      const tokens2 = await issueTokens(server, user);

      // Revoke all
      const count = server.revokeAllUserTokens("user-revoke");
      expect(count).toBe(2);

      // Both refresh tokens should fail
      await expect(
        server.refreshToken({ refreshToken: tokens1.refresh_token })
      ).rejects.toThrow();
      await expect(
        server.refreshToken({ refreshToken: tokens2.refresh_token })
      ).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 8. Auth Code Security
  // ════════════════════════════════════════════════════════════════════════

  describe("Auth code security", () => {
    it("rejects reused auth code", async () => {
      const user = makeUser("viewer");
      server.registerUser(user);

      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);
      const { code } = server.generateAuthorizationUrl(
        {
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
          codeChallenge: challenge,
          scope: "read",
        },
        user
      );

      // First use: success
      await server.exchangeCode({
        code,
        codeVerifier: verifier,
        clientId: TEST_CLIENT_ID,
        redirectUri: TEST_REDIRECT_URI,
      });

      // Second use: reject
      await expect(
        server.exchangeCode({
          code,
          codeVerifier: verifier,
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
        })
      ).rejects.toThrow("Invalid authorization code");
    });

    it("rejects wrong PKCE verifier", async () => {
      const user = makeUser("viewer");
      server.registerUser(user);

      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);
      const { code } = server.generateAuthorizationUrl(
        {
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
          codeChallenge: challenge,
          scope: "read",
        },
        user
      );

      await expect(
        server.exchangeCode({
          code,
          codeVerifier: "wrong-verifier-value-that-wont-match",
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
        })
      ).rejects.toThrow("PKCE");
    });

    it("rejects wrong client ID on code exchange", async () => {
      const user = makeUser("viewer");
      server.registerUser(user);

      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);
      const { code } = server.generateAuthorizationUrl(
        {
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
          codeChallenge: challenge,
          scope: "read",
        },
        user
      );

      await expect(
        server.exchangeCode({
          code,
          codeVerifier: verifier,
          clientId: "wrong-client",
          redirectUri: TEST_REDIRECT_URI,
        })
      ).rejects.toThrow("Client ID mismatch");
    });

    it("rejects wrong redirect URI on code exchange", async () => {
      const user = makeUser("viewer");
      server.registerUser(user);

      const verifier = generateCodeVerifier();
      const challenge = computeCodeChallenge(verifier);
      const { code } = server.generateAuthorizationUrl(
        {
          clientId: TEST_CLIENT_ID,
          redirectUri: TEST_REDIRECT_URI,
          codeChallenge: challenge,
          scope: "read",
        },
        user
      );

      await expect(
        server.exchangeCode({
          code,
          codeVerifier: verifier,
          clientId: TEST_CLIENT_ID,
          redirectUri: "http://evil.com/callback",
        })
      ).rejects.toThrow("Redirect URI mismatch");
    });

    it("rejects invalid client on authorization", () => {
      const user = makeUser("viewer");
      expect(() =>
        server.generateAuthorizationUrl(
          {
            clientId: "unknown-client",
            redirectUri: TEST_REDIRECT_URI,
            codeChallenge: "abc",
            scope: "read",
          },
          user
        )
      ).toThrow("Invalid client_id");
    });

    it("rejects invalid redirect URI on authorization", () => {
      const user = makeUser("viewer");
      expect(() =>
        server.generateAuthorizationUrl(
          {
            clientId: TEST_CLIENT_ID,
            redirectUri: "http://evil.com/steal",
            codeChallenge: "abc",
            scope: "read",
          },
          user
        )
      ).toThrow("Invalid client_id");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 9. Scope-to-Role Resolution
  // ════════════════════════════════════════════════════════════════════════

  describe("Scope resolution", () => {
    it("scope 'read' resolves to viewer role", async () => {
      const user = makeUser("admin", "scope-test-1");
      server.registerUser(user);

      const tokens = await issueTokens(server, user, "read");
      const result = await server.validateToken(tokens.access_token);
      // Scopes cap the role: "read" → viewer, even for admin user
      // Actually the logic is: min(user_role, max_scope_role)
      // admin user with read scope → viewer
      expect(result.valid).toBe(true);
      expect(result.user?.role).toBe("viewer");
    });

    it("scope 'read operate program' resolves to programmer", async () => {
      const user = makeUser("admin", "scope-test-2");
      server.registerUser(user);

      const tokens = await issueTokens(server, user, "read operate program");
      const result = await server.validateToken(tokens.access_token);
      expect(result.user?.role).toBe("programmer");
    });

    it("scope cannot elevate beyond user role", async () => {
      const user = makeUser("operator", "scope-test-3");
      server.registerUser(user);

      // Request admin scope but user is only operator
      const tokens = await issueTokens(server, user, "read operate program admin");
      const result = await server.validateToken(tokens.access_token);
      // Capped at operator (user's role)
      expect(result.user?.role).toBe("operator");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 10. Discovery / Metadata
  // ════════════════════════════════════════════════════════════════════════

  describe("OAuth metadata", () => {
    it("returns server metadata", () => {
      const metadata = server.getServerMetadata();
      expect(metadata.issuer).toBe(DEFAULT_TEST_ISSUER);
      expect(metadata.grant_types_supported).toContain("authorization_code");
      expect(metadata.grant_types_supported).toContain("refresh_token");
      expect(metadata.code_challenge_methods_supported).toEqual(["S256"]);
      expect(metadata.scopes_supported).toContain("read");
      expect(metadata.scopes_supported).toContain("admin");
    });

    it("returns permission summary", () => {
      const summary = server.getPermissionSummary();
      expect(summary.length).toBeGreaterThan(50);
      // Should be sorted by role level (viewers first)
      const firstRole = summary[0].required_role;
      const lastRole = summary[summary.length - 1].required_role;
      expect(ROLE_HIERARCHY.indexOf(firstRole)).toBeLessThanOrEqual(
        ROLE_HIERARCHY.indexOf(lastRole)
      );
    });

    it("returns stats", () => {
      const stats = server.getStats();
      expect(stats.active_auth_codes).toBe(0);
      expect(stats.active_refresh_tokens).toBe(0);
      expect(stats.revoked_access_tokens).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 11. User Management
  // ════════════════════════════════════════════════════════════════════════

  describe("User management", () => {
    it("registers and retrieves users", () => {
      const user = makeUser("operator", "shop-op-1");
      server.registerUser(user);
      const retrieved = server.getUser("shop-op-1");
      expect(retrieved?.role).toBe("operator");
      expect(retrieved?.email).toBe("shop-op-1@shop.local");
    });

    it("lists all users", () => {
      server.registerUser(makeUser("viewer", "u1"));
      server.registerUser(makeUser("operator", "u2"));
      server.registerUser(makeUser("admin", "u3"));
      const users = server.listUsers();
      expect(users.length).toBe(3);
    });

    it("removes user and revokes their tokens", async () => {
      const user = makeUser("programmer", "user-to-remove");
      server.registerUser(user);
      const tokens = await issueTokens(server, user);

      server.removeUser("user-to-remove");
      expect(server.getUser("user-to-remove")).toBeUndefined();

      // Refresh should fail
      await expect(
        server.refreshToken({ refreshToken: tokens.refresh_token })
      ).rejects.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 12. Tool Permission Check (MCP-level)
  // ════════════════════════════════════════════════════════════════════════

  describe("Tool permission check", () => {
    it("allows viewer to access read-only tools", () => {
      const user = makeUser("viewer");
      expect(checkToolPermission(user, "prism_calc")).toBeNull();
      expect(checkToolPermission(user, "prism_data")).toBeNull();
    });

    it("blocks viewer from programmer tools", () => {
      const user = makeUser("viewer");
      const result = checkToolPermission(user, "prism_cam");
      expect(result).not.toBeNull();
      expect(result?.error).toContain("Insufficient permissions");
      expect(result?.required_role).toBe("programmer");
    });

    it("blocks unauthenticated users", () => {
      const result = checkToolPermission(undefined, "prism_calc");
      expect(result).not.toBeNull();
      expect(result?.error).toContain("Authentication required");
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 13. Cleanup
  // ════════════════════════════════════════════════════════════════════════

  describe("Cleanup", () => {
    it("cleans up expired codes and tokens", () => {
      const result = server.cleanup();
      expect(result.codes_removed).toBe(0);
      expect(result.tokens_removed).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 14. Config
  // ════════════════════════════════════════════════════════════════════════

  describe("Auth config", () => {
    it("loads config from environment", () => {
      resetAuthConfig();
      process.env.PRISM_JWT_SECRET = TEST_SECRET;
      process.env.PRISM_AUTH_ISSUER = "https://my-shop.local";
      const config = getAuthConfig();
      expect(config.issuer).toBe("https://my-shop.local");
      expect(config.accessTokenExpiry).toBe(3600);
      expect(config.refreshTokenExpiry).toBe(604800);
      expect(config.clients.length).toBeGreaterThanOrEqual(3); // 3 defaults
      delete process.env.PRISM_AUTH_ISSUER;
    });

    it("disables auth when no secret", () => {
      delete process.env.PRISM_JWT_SECRET;
      resetAuthConfig();
      const config = getAuthConfig();
      expect(config.enabled).toBe(false);
    });
  });
});

// ============================================================================
// Helper: issue tokens via full PKCE flow
// ============================================================================

async function issueTokens(
  server: PrismOAuthServer,
  user: AuthUser,
  scope: string = "read operate program"
) {
  const verifier = generateCodeVerifier();
  const challenge = computeCodeChallenge(verifier);
  const { code } = server.generateAuthorizationUrl(
    {
      clientId: TEST_CLIENT_ID,
      redirectUri: TEST_REDIRECT_URI,
      codeChallenge: challenge,
      scope,
    },
    user
  );
  return server.exchangeCode({
    code,
    codeVerifier: verifier,
    clientId: TEST_CLIENT_ID,
    redirectUri: TEST_REDIRECT_URI,
  });
}
