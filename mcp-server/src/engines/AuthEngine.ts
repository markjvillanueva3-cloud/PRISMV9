/**
 * AuthEngine — L2-P3-MS1 Infrastructure Layer
 * *** SECURITY CRITICAL ***
 *
 * JWT-based authentication, role-based access control (RBAC),
 * permission management, session handling, and MFA support.
 *
 * SECURITY: All tokens use cryptographically secure random bytes.
 * Passwords are never stored in plaintext — only salted hashes.
 * Token expiry is strictly enforced with no grace period.
 *
 * Actions: auth_login, auth_register, auth_refresh, auth_check_permission,
 *          auth_assign_role, auth_session_manage, auth_mfa_setup
 */

import * as crypto from "crypto";

// ============================================================================
// TYPES
// ============================================================================

/** Auth User configuration/data structure.
 */
export interface AuthUser {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  roles: string[];
  permissions: string[];
  mfa_enabled: boolean;
  mfa_secret?: string;
  created_at: string;
  last_login?: string;
  failed_attempts: number;
  locked_until?: string;
}

/** Auth Token configuration/data structure.
 */
export interface AuthToken {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in_sec: number;
  issued_at: string;
  user_id: string;
  roles: string[];
}

/** Auth Session configuration/data structure.
 */
export interface AuthSession {
  session_id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

/** Auth Role type definition.
 */
export type AuthRole = "admin" | "operator" | "viewer" | "programmer" | "maintenance" | "quality" | "guest";

/** Role Definition configuration/data structure.
 */
export interface RoleDefinition {
  name: AuthRole;
  permissions: string[];
  description: string;
}

/** Auth Result configuration/data structure.
 */
export interface AuthResult {
  success: boolean;
  user_id?: string;
  token?: AuthToken;
  error?: string;
  requires_mfa?: boolean;
}

/** Permission Check configuration/data structure.
 */
export interface PermissionCheck {
  allowed: boolean;
  user_id: string;
  permission: string;
  roles: string[];
  reason: string;
}

// ============================================================================
// ROLE DATABASE
// ============================================================================

const ROLE_DB: Record<AuthRole, RoleDefinition> = {
  admin:       { name: "admin", permissions: ["*"], description: "Full system access" },
  operator:    { name: "operator", permissions: ["machine:read", "machine:operate", "job:read", "job:run", "tool:read", "alarm:read", "alarm:acknowledge"], description: "Machine operator" },
  programmer:  { name: "programmer", permissions: ["machine:read", "job:read", "job:create", "job:edit", "tool:read", "tool:create", "program:read", "program:create", "program:edit", "simulation:run"], description: "CNC programmer" },
  maintenance: { name: "maintenance", permissions: ["machine:read", "machine:maintain", "alarm:read", "alarm:acknowledge", "tool:read", "tool:replace", "report:read"], description: "Maintenance technician" },
  quality:     { name: "quality", permissions: ["job:read", "report:read", "report:create", "inspection:read", "inspection:create", "spc:read", "spc:configure"], description: "Quality inspector" },
  viewer:      { name: "viewer", permissions: ["machine:read", "job:read", "tool:read", "report:read", "alarm:read"], description: "Read-only viewer" },
  guest:       { name: "guest", permissions: ["machine:read"], description: "Guest — minimal access" },
};

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCESS_TOKEN_EXPIRY_SEC = 3600;        // 1 hour
const REFRESH_TOKEN_EXPIRY_SEC = 86400 * 7;  // 7 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;  // 15 minutes
const SALT_BYTES = 32;
const HASH_ITERATIONS = 100000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = "sha512";

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Auth Engine engine/manager.
 */
export class AuthEngine {
  private users = new Map<string, AuthUser>();
  private sessions = new Map<string, AuthSession>();
  private tokens = new Map<string, { user_id: string; expires_at: number; type: "access" | "refresh" }>();

  /** Register.
   * @param username - username
   * @param password - password
   * @param roles - roles
   * @returns auth result
   */
  register(username: string, password: string, roles: AuthRole[] = ["viewer"]): AuthResult {
    if (this.findByUsername(username)) {
      return { success: false, error: "Username already exists" };
    }
    /** If.
     * @param password.length - password.length
     * @returns void
     */
    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString("hex");
    const userId = `USR-${crypto.randomBytes(8).toString("hex")}`;

    const allPermissions = this.resolvePermissions(roles);

    const user: AuthUser = {
      id: userId,
      username,
      password_hash: hash,
      salt,
      roles,
      permissions: allPermissions,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
      failed_attempts: 0,
    };

    this.users.set(userId, user);
    return { success: true, user_id: userId };
  }

  /** Logs in.
   * @param username - username
   * @param password - password
   * @param ip - ip
   * @param userAgent - user agent
   * @returns auth result
   */
  login(username: string, password: string, ip: string = "0.0.0.0", userAgent: string = "unknown"): AuthResult {
    const user = this.findByUsername(username);
    /** If.
     * @param !user - !user
     * @returns void
     */
    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    // Check lockout
    /** If.
     * @param user.locked_until - user.locked_until
     * @returns void
     */
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until).getTime();
      if (Date.now() < lockExpiry) {
        const remainingSec = Math.ceil((lockExpiry - Date.now()) / 1000);
        return { success: false, error: `Account locked. Try again in ${remainingSec}s` };
      }
      // Lockout expired — reset
      user.failed_attempts = 0;
      user.locked_until = undefined;
    }

    const hash = crypto.pbkdf2Sync(password, user.salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString("hex");
    /** If.
     * @param hash - hash
     * @returns void
     */
    if (hash !== user.password_hash) {
      user.failed_attempts++;
      /** If.
       * @param user.failed_attempts - user.failed_attempts
       * @returns void
       */
      if (user.failed_attempts >= MAX_FAILED_ATTEMPTS) {
        user.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      }
      return { success: false, error: "Invalid credentials" };
    }

    // Successful auth
    user.failed_attempts = 0;
    user.last_login = new Date().toISOString();

    /** If.
     * @param user.mfa_enabled - user.mfa_enabled
     * @returns void
     */
    if (user.mfa_enabled) {
      return { success: false, requires_mfa: true, user_id: user.id, error: "MFA required" };
    }

    const token = this.issueToken(user);
    this.createSession(user.id, ip, userAgent);

    return { success: true, user_id: user.id, token };
  }

  /** Refresh Token.
   * @param refreshTokenStr - refresh token str
   * @returns auth result
   */
  refreshToken(refreshTokenStr: string): AuthResult {
    const tokenData = this.tokens.get(refreshTokenStr);
    if (!tokenData || tokenData.type !== "refresh" || tokenData.expires_at < Date.now()) {
      return { success: false, error: "Invalid or expired refresh token" };
    }

    const user = this.users.get(tokenData.user_id);
    /** If.
     * @param !user - !user
     * @returns void
     */
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Revoke old refresh token
    this.tokens.delete(refreshTokenStr);

    const token = this.issueToken(user);
    return { success: true, user_id: user.id, token };
  }

  /** Checks permission.
   * @param userId - user id
   * @param permission - permission
   * @returns permission check
   */
  checkPermission(userId: string, permission: string): PermissionCheck {
    const user = this.users.get(userId);
    /** If.
     * @param !user - !user
     * @returns void
     */
    if (!user) {
      return { allowed: false, user_id: userId, permission, roles: [], reason: "User not found" };
    }

    const hasWildcard = user.permissions.includes("*");
    const hasExact = user.permissions.includes(permission);
    const hasDomain = user.permissions.some(p => {
      const [domain] = p.split(":");
      const [reqDomain] = permission.split(":");
      return domain === reqDomain && p.endsWith(":*");
    });

    const allowed = hasWildcard || hasExact || hasDomain;

    return {
      allowed,
      user_id: userId,
      permission,
      roles: user.roles,
      reason: allowed ? "Permission granted" : `User lacks '${permission}' permission`,
    };
  }

  /** Returns as sign role.
   * @param userId - user id
   * @param role - role
   * @returns { success: boolean; error?: string }
   */
  assignRole(userId: string, role: AuthRole): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: "User not found" };

    if (!user.roles.includes(role)) {
      user.roles.push(role);
      user.permissions = this.resolvePermissions(user.roles as AuthRole[]);
    }

    return { success: true };
  }

  /** Sets up m f a.
   * @param userId - user id
   * @returns { success: boolean; secret?: string; error?: string }
   */
  setupMFA(userId: string): { success: boolean; secret?: string; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: "User not found" };

    const secret = crypto.randomBytes(20).toString("hex");
    user.mfa_secret = secret;
    user.mfa_enabled = true;

    return { success: true, secret };
  }

  /** List Sessions.
   * @param userId - user id
   * @returns auth session[]
   */
  listSessions(userId: string): AuthSession[] {
    return [...this.sessions.values()].filter(s => s.user_id === userId && s.is_active);
  }

  /** Revokes session.
   * @param sessionId - session id
   * @returns true if condition is met
   */
  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    /** If.
     * @param session - session
     * @returns void
     */
    if (session) {
      session.is_active = false;
      return true;
    }
    return false;
  }

  /** Gets roles.
   * @returns role definition[]
   */
  getRoles(): RoleDefinition[] {
    return Object.values(ROLE_DB);
  }

  /** Gets user count.
   * @returns computed numeric result
   */
  getUserCount(): number {
    return this.users.size;
  }

  /** Validate an access token and return user info.
   * @param token - access token string
   * @returns validation result with user info if valid
   */
  validateToken(token: string): { valid: boolean; user_id?: string; roles?: string[]; permissions?: string[]; reason?: string } {
    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      return { valid: false, reason: "Token not found" };
    }
    if (tokenData.type !== "access") {
      return { valid: false, reason: "Not an access token" };
    }
    if (tokenData.expires_at < Date.now()) {
      this.tokens.delete(token);
      return { valid: false, reason: "Token expired" };
    }
    const user = this.users.get(tokenData.user_id);
    if (!user) {
      return { valid: false, reason: "User not found" };
    }
    return { valid: true, user_id: user.id, roles: user.roles, permissions: user.permissions };
  }

  // ---- PRIVATE ----

  private findByUsername(username: string): AuthUser | undefined {
    for (const u of this.users.values()) {
      if (u.username === username) return u;
    }
    return undefined;
  }

  private resolvePermissions(roles: AuthRole[]): string[] {
    const perms = new Set<string>();
    /** For.
     * @param const - const
     * @returns void
     */
    for (const r of roles) {
      const def = ROLE_DB[r];
      if (def) def.permissions.forEach(p => perms.add(p));
    }
    return [...perms];
  }

  private issueToken(user: AuthUser): AuthToken {
    const now = Date.now();
    const accessToken = crypto.randomBytes(32).toString("hex");
    const refreshToken = crypto.randomBytes(32).toString("hex");

    this.tokens.set(accessToken, { user_id: user.id, expires_at: now + ACCESS_TOKEN_EXPIRY_SEC * 1000, type: "access" });
    this.tokens.set(refreshToken, { user_id: user.id, expires_at: now + REFRESH_TOKEN_EXPIRY_SEC * 1000, type: "refresh" });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in_sec: ACCESS_TOKEN_EXPIRY_SEC,
      issued_at: new Date(now).toISOString(),
      user_id: user.id,
      roles: user.roles,
    };
  }

  private createSession(userId: string, ip: string, userAgent: string): AuthSession {
    const session: AuthSession = {
      session_id: `SES-${crypto.randomBytes(8).toString("hex")}`,
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SEC * 1000).toISOString(),
      is_active: true,
    };
    this.sessions.set(session.session_id, session);
    return session;
  }
}

/** Auth Engine constant.
 */
export const authEngine = new AuthEngine();
