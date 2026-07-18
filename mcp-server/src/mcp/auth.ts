/**
 * PRISM MCP Server — OAuth 2.1 + PKCE Authorization
 *
 * Implements the full OAuth 2.1 authorization code flow with PKCE
 * for multi-user shop deployments. Provides role-based access control
 * with 4 roles mapping to 67 dispatchers via DISPATCHER_ANNOTATIONS.
 *
 * Roles:
 *   viewer     — read-only: query data, view calculations, browse catalogs
 *   operator   — viewer + read machine status, view alarms, see dashboards
 *   programmer — operator + run simulations, generate programs, modify tool libs
 *   admin      — full access: user management, system config, destructive ops
 *
 * Token lifecycle:
 *   Access tokens  — 1 hour (JWT, HS256)
 *   Refresh tokens — 7 days (opaque, stored in-memory)
 *   Auth codes     — 5 minutes (one-time use)
 *
 * @module mcp/auth
 */

import * as jose from "jose";
import { createHash, randomBytes } from "crypto";
import {
  getAuthConfig,
  roleAtLeast,
  ROLE_HIERARCHY,
  SCOPE_TO_ROLE,
  type OAuthRole,
  type OAuthScope,
  type OAuthClientConfig,
} from "./authConfig.js";
import { DISPATCHER_ANNOTATIONS, type ToolAnnotationConfig } from "./toolAnnotations.js";

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  sub: string;            // User ID
  role: OAuthRole;
  scope: string;          // Space-delimited scopes
  email?: string;
  tenant_id?: string;
  display_name?: string;
}

export interface JWTClaims {
  sub: string;
  role: OAuthRole;
  scope: string;
  iat: number;
  exp: number;
  tenant_id?: string;
  email?: string;
  iss: string;
  aud: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

export interface AuthorizationUrlParams {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod?: "S256";  // Only S256 per OAuth 2.1
  scope: string;
  state?: string;
}

export interface CodeExchangeParams {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}

export interface RefreshParams {
  refreshToken: string;
  clientId?: string;
}

export interface ValidateResult {
  valid: boolean;
  user?: AuthUser;
  claims?: JWTClaims;
  error?: string;
}

// Internal stored auth code
interface StoredAuthCode {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  scope: string;
  user: AuthUser;
  expiresAt: number;
  used: boolean;
}

// Internal stored refresh token
interface StoredRefreshToken {
  token: string;
  user: AuthUser;
  clientId: string;
  scope: string;
  expiresAt: number;
  revoked: boolean;
}

// ============================================================================
// Permission Matrix — maps dispatchers to minimum required role
// ============================================================================

/**
 * Auto-classify dispatchers based on DISPATCHER_ANNOTATIONS.
 *
 * Classification logic:
 *   readOnlyHint=true                        → viewer (read-only data/calculations)
 *   readOnlyHint=true + openWorldHint=true   → operator (live machine data)
 *   readOnlyHint=false + destructiveHint≠true→ programmer (mutating but safe)
 *   destructiveHint=true                     → admin (destructive operations)
 *   openWorldHint=true + readOnly=false       → admin (external + mutating)
 *
 * Manual overrides below for dispatchers needing finer classification.
 */
function buildPermissionMatrix(): Record<string, OAuthRole> {
  const matrix: Record<string, OAuthRole> = {};

  for (const [name, ann] of Object.entries(DISPATCHER_ANNOTATIONS)) {
    matrix[name] = classifyDispatcher(name, ann);
  }

  // ── Manual overrides ────────────────────────────────────────────────────
  // Operator-level: machine status, alarms, dashboards (read-only but operational)
  matrix["prism_machine_live"] = "operator";
  matrix["prism_realtime"] = "operator";
  matrix["prism_process_control"] = "operator";
  matrix["prism_diagnosis"] = "operator";
  matrix["prism_adaptive_control"] = "operator";
  matrix["prism_machine_setup"] = "operator";

  // Programmer-level: simulations, code gen, tool libraries, calibration
  matrix["prism_cam"] = "programmer";
  matrix["prism_cad"] = "programmer";
  matrix["prism_generator"] = "programmer";
  matrix["prism_toolpath"] = "programmer";
  matrix["prism_five_axis"] = "programmer";
  matrix["prism_turning"] = "programmer";
  matrix["prism_edm"] = "programmer";
  matrix["prism_grinding"] = "programmer";
  matrix["prism_cnc_ops"] = "programmer";
  matrix["prism_multi_op"] = "programmer";
  matrix["prism_skill_script"] = "programmer";
  matrix["prism_document_learning"] = "programmer";
  matrix["prism_session"] = "programmer";
  matrix["prism_memory"] = "programmer";
  matrix["prism_context"] = "programmer";
  matrix["prism_hook"] = "programmer";
  matrix["prism_nl_hook"] = "programmer";
  matrix["prism_compliance"] = "programmer";
  matrix["prism_pfp"] = "programmer";
  matrix["prism_telemetry"] = "programmer";

  // Admin-level: auth, tenant management, guard, destructive, automation
  matrix["prism_auth"] = "admin";
  matrix["prism_tenant"] = "admin";
  matrix["prism_guard"] = "admin";
  matrix["prism_automation"] = "admin";
  matrix["prism_bridge"] = "admin";
  matrix["prism_atcs"] = "admin";
  matrix["prism_autonomous"] = "admin";
  matrix["prism_autopilot"] = "admin";
  matrix["prism_dev"] = "admin";
  matrix["prism_sp"] = "admin";
  matrix["prism_gsd"] = "admin";
  matrix["prism_manus"] = "admin";

  return matrix;
}

function classifyDispatcher(name: string, ann: ToolAnnotationConfig): OAuthRole {
  // Destructive → admin
  if (ann.destructiveHint) return "admin";
  // External + mutating → admin
  if (ann.openWorldHint && !ann.readOnlyHint) return "admin";
  // Read-only + external → operator (live data)
  if (ann.readOnlyHint && ann.openWorldHint) return "operator";
  // Pure read-only → viewer
  if (ann.readOnlyHint) return "viewer";
  // Mutating but not destructive → programmer
  return "programmer";
}

/** Cached permission matrix */
let _permissionMatrix: Record<string, OAuthRole> | null = null;

/**
 * Get the permission matrix mapping dispatcher names to minimum roles.
 */
export function getPermissionMatrix(): Record<string, OAuthRole> {
  if (!_permissionMatrix) {
    _permissionMatrix = buildPermissionMatrix();
  }
  return _permissionMatrix;
}

/**
 * Check if a role has permission to use a specific dispatcher.
 */
export function hasPermission(userRole: OAuthRole, dispatcherName: string): boolean {
  const matrix = getPermissionMatrix();
  const requiredRole = matrix[dispatcherName];
  // Unknown dispatchers default to admin-only for safety
  if (!requiredRole) return userRole === "admin";
  return roleAtLeast(userRole, requiredRole);
}

/**
 * Get the minimum role required for a dispatcher.
 */
export function getRequiredRole(dispatcherName: string): OAuthRole {
  const matrix = getPermissionMatrix();
  return matrix[dispatcherName] ?? "admin";
}

// ============================================================================
// PKCE Utilities
// ============================================================================

/**
 * Generate a cryptographically random code verifier (43-128 chars, RFC 7636).
 */
export function generateCodeVerifier(length: number = 64): string {
  // Base64url characters: A-Z, a-z, 0-9, -, _, ~, .
  const bytes = randomBytes(Math.ceil((length * 3) / 4));
  return bytes.toString("base64url").slice(0, length);
}

/**
 * Compute S256 code challenge from a code verifier.
 * challenge = BASE64URL(SHA256(verifier))
 */
export function computeCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}

/**
 * Verify a code verifier against a stored S256 code challenge.
 */
export function verifyCodeChallenge(verifier: string, challenge: string): boolean {
  const computed = computeCodeChallenge(verifier);
  // Constant-time comparison to prevent timing attacks
  if (computed.length !== challenge.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ challenge.charCodeAt(i);
  }
  return mismatch === 0;
}

// ============================================================================
// OAuth 2.1 + PKCE Authorization Server
// ============================================================================

/**
 * PRISM OAuth 2.1 Authorization Server with PKCE support.
 *
 * Manages the full authorization code flow:
 *   1. generateAuthorizationUrl — start auth flow, return URL with code
 *   2. exchangeCode — exchange auth code + PKCE verifier for tokens
 *   3. refreshToken — refresh expired access token
 *   4. validateToken — validate JWT, return user context
 *   5. revokeToken — invalidate a refresh token
 *
 * In-memory stores for auth codes and refresh tokens.
 * Production deployments should replace with Redis/DB-backed stores.
 */
export class PrismOAuthServer {
  private secretKey: Uint8Array;
  private authCodes: Map<string, StoredAuthCode> = new Map();
  private refreshTokens: Map<string, StoredRefreshToken> = new Map();
  // tokenId (sha256 prefix) -> revokedAt (ms). A Map (was a Set) so cleanup can
  // evict by AGE: an entry is safe to drop only once its token is provably
  // expired, never by raw insertion order (which could re-honor a live token).
  private revokedAccessTokens: Map<string, number> = new Map();

  // User store: sub → AuthUser (in-memory; production: DB)
  private users: Map<string, AuthUser & { passwordHash?: string }> = new Map();

  constructor(secret?: string) {
    const config = getAuthConfig();
    const s = secret || config.jwtSecret;
    if (!s || s.length < 32) {
      throw new Error(
        `PrismOAuthServer: JWT secret must be at least 32 characters (got ${s?.length ?? 0}). ` +
        `Set PRISM_JWT_SECRET environment variable.`
      );
    }
    this.secretKey = new TextEncoder().encode(s);

    // Schedule periodic cleanup every 5 minutes
    this._cleanupInterval = setInterval(() => this.cleanup(), 300_000);
    // unref so it doesn't prevent process exit
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  private _cleanupInterval: ReturnType<typeof setInterval>;

  // --------------------------------------------------------------------------
  // Client validation
  // --------------------------------------------------------------------------

  /**
   * Validate that a client ID is registered and the redirect URI is allowed.
   */
  validateClient(clientId: string, redirectUri: string): OAuthClientConfig | null {
    const config = getAuthConfig();
    const client = config.clients.find((c) => c.clientId === clientId);
    if (!client) return null;
    if (!client.redirectUris.includes(redirectUri)) return null;
    return client;
  }

  /**
   * Validate that requested scopes are allowed for this client.
   */
  validateScopes(clientId: string, requestedScopes: string): string[] {
    const config = getAuthConfig();
    const client = config.clients.find((c) => c.clientId === clientId);
    if (!client) return [];

    const requested = requestedScopes.split(" ").filter(Boolean);
    return requested.filter((s) =>
      client.allowedScopes.includes(s as OAuthScope)
    );
  }

  // --------------------------------------------------------------------------
  // User management (in-memory store for shop deployments)
  // --------------------------------------------------------------------------

  /**
   * Register a user. In production, replace with DB-backed user store.
   */
  registerUser(user: AuthUser): void {
    this.users.set(user.sub, { ...user });
  }

  /**
   * Get a registered user by subject ID.
   */
  getUser(sub: string): AuthUser | undefined {
    const u = this.users.get(sub);
    if (!u) return undefined;
    const { passwordHash, ...user } = u;
    return user;
  }

  /**
   * List all registered users (admin only in practice).
   */
  listUsers(): AuthUser[] {
    return Array.from(this.users.values()).map(({ passwordHash, ...u }) => u);
  }

  /**
   * Remove a user and revoke all their refresh tokens.
   */
  removeUser(sub: string): boolean {
    if (!this.users.delete(sub)) return false;
    // Revoke all refresh tokens for this user
    for (const [key, rt] of this.refreshTokens) {
      if (rt.user.sub === sub) rt.revoked = true;
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // 1. Authorization URL generation
  // --------------------------------------------------------------------------

  /**
   * Generate an authorization URL and internally store the pending auth code.
   *
   * In a full OAuth server, this would render a login page. Here we simulate
   * the authorization decision and directly return the auth code (for the
   * MCP server use case where auth decisions are pre-approved by the shop admin).
   *
   * @returns Object with authorization_url and the code for direct use
   */
  generateAuthorizationUrl(
    params: AuthorizationUrlParams,
    user: AuthUser
  ): { authorization_url: string; code: string } {
    const config = getAuthConfig();

    // Validate client
    const client = this.validateClient(params.clientId, params.redirectUri);
    if (!client) {
      throw new Error(
        `Invalid client_id '${params.clientId}' or redirect_uri '${params.redirectUri}'`
      );
    }

    // Validate scopes
    const validScopes = this.validateScopes(params.clientId, params.scope);
    if (validScopes.length === 0) {
      throw new Error(`No valid scopes in request: '${params.scope}'`);
    }

    // OAuth 2.1 requires S256 — reject plain method
    if (params.codeChallengeMethod && params.codeChallengeMethod !== "S256") {
      throw new Error("Only S256 code_challenge_method is supported (OAuth 2.1)");
    }

    // Generate authorization code (32 bytes, base64url)
    const code = randomBytes(32).toString("base64url");

    // Store the auth code
    const stored: StoredAuthCode = {
      code,
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: "S256",
      scope: validScopes.join(" "),
      user,
      expiresAt: Date.now() + config.authCodeExpiry * 1000,
      used: false,
    };
    this.authCodes.set(code, stored);

    // Build authorization URL with code
    const url = new URL(params.redirectUri);
    url.searchParams.set("code", code);
    if (params.state) url.searchParams.set("state", params.state);

    return { authorization_url: url.toString(), code };
  }

  // --------------------------------------------------------------------------
  // 2. Authorization code exchange
  // --------------------------------------------------------------------------

  /**
   * Exchange an authorization code + PKCE code_verifier for tokens.
   *
   * Validates:
   *   - Code exists and is not expired/used
   *   - Client ID matches
   *   - Redirect URI matches
   *   - PKCE code_verifier matches stored code_challenge (S256)
   *
   * @returns Token pair (access_token + refresh_token)
   */
  async exchangeCode(params: CodeExchangeParams): Promise<TokenPair> {
    const stored = this.authCodes.get(params.code);

    if (!stored) {
      throw new Error("Invalid authorization code");
    }
    if (stored.used) {
      // Per OAuth 2.1: if code is reused, revoke all tokens issued with it
      this.authCodes.delete(params.code);
      throw new Error("Authorization code already used — possible replay attack");
    }
    if (Date.now() > stored.expiresAt) {
      this.authCodes.delete(params.code);
      throw new Error("Authorization code expired");
    }
    if (stored.clientId !== params.clientId) {
      throw new Error("Client ID mismatch");
    }
    if (stored.redirectUri !== params.redirectUri) {
      throw new Error("Redirect URI mismatch");
    }

    // PKCE verification — S256
    if (!verifyCodeChallenge(params.codeVerifier, stored.codeChallenge)) {
      this.authCodes.delete(params.code);
      throw new Error("PKCE code_verifier does not match code_challenge");
    }

    // Mark code as used (one-time use per OAuth 2.1)
    stored.used = true;

    // Generate tokens
    const tokenPair = await this.issueTokens(stored.user, stored.clientId, stored.scope);

    // Delete the used code after successful exchange
    this.authCodes.delete(params.code);

    return tokenPair;
  }

  // --------------------------------------------------------------------------
  // 3. Token refresh
  // --------------------------------------------------------------------------

  /**
   * Refresh an expired access token using a valid refresh token.
   *
   * Per OAuth 2.1, implements refresh token rotation: the old refresh
   * token is invalidated and a new one is issued.
   *
   * @returns New token pair
   */
  async refreshToken(params: RefreshParams): Promise<TokenPair> {
    const stored = this.refreshTokens.get(params.refreshToken);

    if (!stored) {
      throw new Error("Invalid refresh token");
    }
    if (stored.revoked) {
      // Possible token theft — revoke all tokens for this user
      for (const [, rt] of this.refreshTokens) {
        if (rt.user.sub === stored.user.sub) rt.revoked = true;
      }
      throw new Error("Refresh token revoked — all sessions invalidated for security");
    }
    if (Date.now() > stored.expiresAt) {
      this.refreshTokens.delete(params.refreshToken);
      throw new Error("Refresh token expired");
    }
    if (params.clientId && stored.clientId !== params.clientId) {
      throw new Error("Client ID mismatch on refresh");
    }

    // Rotate: revoke old refresh token
    stored.revoked = true;

    // Issue new token pair with same scope
    return this.issueTokens(stored.user, stored.clientId, stored.scope);
  }

  // --------------------------------------------------------------------------
  // 4. Token validation
  // --------------------------------------------------------------------------

  /**
   * Validate and decode a JWT access token.
   *
   * @returns ValidateResult with user info and claims if valid
   */
  async validateToken(token: string): Promise<ValidateResult> {
    const config = getAuthConfig();

    // Check revocation list
    const tokenId = createHash("sha256").update(token).digest("hex").slice(0, 16);
    if (this.revokedAccessTokens.has(tokenId)) {
      return { valid: false, error: "Token has been revoked" };
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.secretKey, {
        issuer: config.issuer,
        audience: config.audience,
      });

      const claims = payload as unknown as JWTClaims;

      // Validate required fields
      if (!claims.sub || !claims.role || !claims.scope) {
        return { valid: false, error: "Token missing required claims (sub, role, scope)" };
      }

      // Validate role is valid
      if (!ROLE_HIERARCHY.includes(claims.role)) {
        return { valid: false, error: `Invalid role in token: ${claims.role}` };
      }

      const user: AuthUser = {
        sub: claims.sub,
        role: claims.role,
        scope: claims.scope,
        email: claims.email,
        tenant_id: claims.tenant_id,
      };

      return { valid: true, user, claims };
    } catch (err: unknown) {
      const joseErr = err as { code?: string; message?: string };
      if (joseErr.code === "ERR_JWT_EXPIRED") {
        return { valid: false, error: "Token expired" };
      }
      if (joseErr.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
        return { valid: false, error: "Invalid token signature" };
      }
      return { valid: false, error: `Token validation failed: ${joseErr.message ?? String(err)}` };
    }
  }

  // --------------------------------------------------------------------------
  // 5. Token revocation
  // --------------------------------------------------------------------------

  /**
   * Revoke a token (works for both access and refresh tokens).
   *
   * For access tokens: adds to revocation list (checked during validation).
   * For refresh tokens: marks as revoked in store.
   *
   * @returns true if a token was found and revoked
   */
  revokeToken(token: string): boolean {
    // Try refresh token first
    const stored = this.refreshTokens.get(token);
    if (stored) {
      stored.revoked = true;
      return true;
    }

    // Assume it's an access token -- add hash to revocation set, stamped with
    // the revocation time so cleanup() can age it out safely.
    const tokenId = createHash("sha256").update(token).digest("hex").slice(0, 16);
    this.revokedAccessTokens.set(tokenId, Date.now());
    return true;
  }

  /**
   * Revoke all tokens for a specific user (e.g., on password change).
   */
  revokeAllUserTokens(sub: string): number {
    let count = 0;
    for (const [, rt] of this.refreshTokens) {
      if (rt.user.sub === sub && !rt.revoked) {
        rt.revoked = true;
        count++;
      }
    }
    return count;
  }

  // --------------------------------------------------------------------------
  // Internal: Token issuance
  // --------------------------------------------------------------------------

  /**
   * Issue an access token + refresh token pair.
   */
  private async issueTokens(
    user: AuthUser,
    clientId: string,
    scope: string
  ): Promise<TokenPair> {
    const config = getAuthConfig();

    // Determine effective role from scopes
    const effectiveRole = this.resolveRoleFromScopes(scope, user.role);

    // Build JWT claims
    const accessToken = await new jose.SignJWT({
      sub: user.sub,
      role: effectiveRole,
      scope,
      tenant_id: user.tenant_id,
      email: user.email,
    } as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${config.accessTokenExpiry}s`)
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .sign(this.secretKey);

    // Generate opaque refresh token
    const refreshTokenValue = randomBytes(48).toString("base64url");

    // Store refresh token
    const storedRefresh: StoredRefreshToken = {
      token: refreshTokenValue,
      user: { ...user, role: effectiveRole },
      clientId,
      scope,
      expiresAt: Date.now() + config.refreshTokenExpiry * 1000,
      revoked: false,
    };
    this.refreshTokens.set(refreshTokenValue, storedRefresh);

    return {
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      token_type: "Bearer",
      expires_in: config.accessTokenExpiry,
      scope,
    };
  }

  /**
   * Resolve effective role from granted scopes, capped by user's assigned role.
   * The highest scope-implied role that doesn't exceed the user's role wins.
   */
  private resolveRoleFromScopes(scope: string, userRole: OAuthRole): OAuthRole {
    const scopes = scope.split(" ").filter(Boolean) as OAuthScope[];
    let maxScopeRole: OAuthRole = "viewer";

    for (const s of scopes) {
      const scopeRole = SCOPE_TO_ROLE[s];
      if (scopeRole && ROLE_HIERARCHY.indexOf(scopeRole) > ROLE_HIERARCHY.indexOf(maxScopeRole)) {
        maxScopeRole = scopeRole;
      }
    }

    // Cap at user's assigned role — scopes can't elevate beyond user's role
    const userIdx = ROLE_HIERARCHY.indexOf(userRole);
    const scopeIdx = ROLE_HIERARCHY.indexOf(maxScopeRole);
    return ROLE_HIERARCHY[Math.min(userIdx, scopeIdx)];
  }

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  /**
   * Remove expired auth codes and refresh tokens.
   * Called periodically (every 5 min) and on shutdown.
   */
  cleanup(): { codes_removed: number; tokens_removed: number } {
    const now = Date.now();
    let codesRemoved = 0;
    let tokensRemoved = 0;

    for (const [key, code] of this.authCodes) {
      if (now > code.expiresAt || code.used) {
        this.authCodes.delete(key);
        codesRemoved++;
      }
    }

    for (const [key, rt] of this.refreshTokens) {
      if (now > rt.expiresAt || rt.revoked) {
        this.refreshTokens.delete(key);
        tokensRemoved++;
      }
    }

    // Age out revocation entries whose underlying token is already EXPIRED, so
    // a revoked-then-evicted token can never be re-honored: an access token
    // lives at most accessTokenExpiry seconds, and revokedAt is always >= the
    // token's issuedAt, so once (now - revokedAt) exceeds that lifetime the
    // token is rejected by its own `exp` claim and the revocation entry is
    // redundant. A 60s buffer covers clock skew. PRISM_MCP_REVOCATION_TTL_MS
    // overrides the computed TTL (must stay >= the real token lifetime to keep
    // the re-honor-safety guarantee).
    const revocationTtlMs = (() => {
      const override = parseInt(process.env.PRISM_MCP_REVOCATION_TTL_MS || "", 10);
      if (Number.isFinite(override) && override > 0) return override;
      return getAuthConfig().accessTokenExpiry * 1000 + 60_000;
    })();
    for (const [tokenId, revokedAt] of this.revokedAccessTokens) {
      if (now - revokedAt > revocationTtlMs) {
        this.revokedAccessTokens.delete(tokenId);
      }
    }

    // Backstop only: if the map is still pathologically large (heavy revocation
    // churn within a single token lifetime), evict the OLDEST entries by
    // insertion order. This can in theory re-honor a still-live revoked token,
    // so it fires only far above the expected steady-state size -- the age
    // sweep above is the primary, re-honor-safe path.
    if (this.revokedAccessTokens.size > 10_000) {
      const ids = Array.from(this.revokedAccessTokens.keys());
      for (const id of ids.slice(0, ids.length - 5_000)) {
        this.revokedAccessTokens.delete(id);
      }
    }

    return { codes_removed: codesRemoved, tokens_removed: tokensRemoved };
  }

  /**
   * Shutdown — clear interval and stores.
   */
  shutdown(): void {
    clearInterval(this._cleanupInterval);
    this.authCodes.clear();
    this.refreshTokens.clear();
    this.revokedAccessTokens.clear();
  }

  // --------------------------------------------------------------------------
  // Introspection / discovery (for MCP clients)
  // --------------------------------------------------------------------------

  /**
   * Get OAuth 2.0 Authorization Server Metadata (RFC 8414).
   * Useful for MCP client auto-discovery.
   */
  getServerMetadata(): Record<string, unknown> {
    const config = getAuthConfig();
    return {
      issuer: config.issuer,
      authorization_endpoint: `${config.issuer}/oauth/authorize`,
      token_endpoint: `${config.issuer}/oauth/token`,
      revocation_endpoint: `${config.issuer}/oauth/revoke`,
      introspection_endpoint: `${config.issuer}/oauth/introspect`,
      scopes_supported: ["read", "operate", "program", "admin", "offline_access"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],  // Public clients, PKCE only
    };
  }

  /**
   * Get the permission matrix for display/documentation.
   */
  getPermissionSummary(): Array<{ dispatcher: string; required_role: OAuthRole; title?: string }> {
    const matrix = getPermissionMatrix();
    return Object.entries(matrix)
      .sort(([, a], [, b]) => ROLE_HIERARCHY.indexOf(a) - ROLE_HIERARCHY.indexOf(b))
      .map(([dispatcher, role]) => ({
        dispatcher,
        required_role: role,
        title: DISPATCHER_ANNOTATIONS[dispatcher]?.title,
      }));
  }

  /**
   * Get stats for monitoring.
   */
  getStats(): {
    active_auth_codes: number;
    active_refresh_tokens: number;
    revoked_access_tokens: number;
    registered_users: number;
  } {
    return {
      active_auth_codes: this.authCodes.size,
      active_refresh_tokens: Array.from(this.refreshTokens.values()).filter(
        (rt) => !rt.revoked && Date.now() < rt.expiresAt
      ).length,
      revoked_access_tokens: this.revokedAccessTokens.size,
      registered_users: this.users.size,
    };
  }
}

// ============================================================================
// Singleton instance (lazy init)
// ============================================================================

let _oauthServer: PrismOAuthServer | null = null;

/**
 * Get the singleton OAuth server instance.
 * Returns null if auth is not configured (no JWT secret).
 */
export function getOAuthServer(): PrismOAuthServer | null {
  if (_oauthServer) return _oauthServer;
  const config = getAuthConfig();
  if (!config.enabled || config.jwtSecret.length < 32) return null;
  _oauthServer = new PrismOAuthServer(config.jwtSecret);
  return _oauthServer;
}

/**
 * Create a fresh OAuth server (for testing).
 */
export function createOAuthServer(secret: string): PrismOAuthServer {
  return new PrismOAuthServer(secret);
}

/**
 * Reset the singleton (for testing).
 */
export function resetOAuthServer(): void {
  _oauthServer?.shutdown();
  _oauthServer = null;
}
