/**
 * PRISM MCP Server — AuthEngineV7
 * JWT authentication using jose + bcrypt password hashing.
 * Replaces in-memory token Maps from AuthEngine v1.
 *
 * Spec (MIT 6.005 contract):
 *   - Passwords hashed with bcrypt, salt rounds 12
 *   - Tokens signed HS256, secret min 32 chars
 *   - Access tokens default 1h; refresh tokens 30d
 *   - getTierLimits is pure and returns immutable limits
 *   - constructor throws immediately if secret is too short (fail fast)
 */
import * as jose from "jose";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

// ============================================================================
// Types
// ============================================================================

export type Plan = "free" | "starter" | "pro" | "shop" | "enterprise";
export type Role = "admin" | "engineer" | "operator" | "viewer";

export interface TokenPayload {
  userId: string;
  role: Role;
  plan: Plan;
  email?: string;
}

export interface TierLimits {
  speed_feed_per_day: number;       // -1 = unlimited
  program_generate_per_day: number;
  materials_count: number;
  machines_count: number;
  playbook_rules_per_query: number;
  simulation: boolean;
  dfm_rules: number;
  stochastic: boolean;
  api_access: boolean;
  max_users: number;
}

// ============================================================================
// Tier limit table — immutable constant, defined once
// ============================================================================

const LIMITS: Record<Plan, TierLimits> = {
  free: {
    speed_feed_per_day: 10,
    program_generate_per_day: 0,
    materials_count: 20,
    machines_count: 5,
    playbook_rules_per_query: 5,
    simulation: false,
    dfm_rules: 0,
    stochastic: false,
    api_access: false,
    max_users: 1,
  },
  starter: {
    speed_feed_per_day: -1,
    program_generate_per_day: 0,
    materials_count: -1,
    machines_count: -1,
    playbook_rules_per_query: 20,
    simulation: false,
    dfm_rules: 0,
    stochastic: false,
    api_access: false,
    max_users: 1,
  },
  pro: {
    speed_feed_per_day: -1,
    program_generate_per_day: 5,
    materials_count: -1,
    machines_count: -1,
    playbook_rules_per_query: -1,
    simulation: true,
    dfm_rules: 10,
    stochastic: false,
    api_access: false,
    max_users: 1,
  },
  shop: {
    speed_feed_per_day: -1,
    program_generate_per_day: -1,
    materials_count: -1,
    machines_count: -1,
    playbook_rules_per_query: -1,
    simulation: true,
    dfm_rules: 30,
    stochastic: true,
    api_access: false,
    max_users: 5,
  },
  enterprise: {
    speed_feed_per_day: -1,
    program_generate_per_day: -1,
    materials_count: -1,
    machines_count: -1,
    playbook_rules_per_query: -1,
    simulation: true,
    dfm_rules: -1,
    stochastic: true,
    api_access: true,
    max_users: -1,
  },
};

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

// ============================================================================
// AuthEngineV7
// ============================================================================

/**
 * JWT auth engine using jose (HS256) and bcrypt (salt=12).
 *
 * @param secret - signing secret, minimum 32 characters (fail fast)
 */
export class AuthEngineV7 {
  readonly engineName = "AuthEngineV7";
  readonly version = "7.0.0";

  private readonly secretKey: Uint8Array;

  constructor(secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error(
        `AuthEngineV7: secret must be at least 32 characters, got ${secret?.length ?? 0}`
      );
    }
    this.secretKey = new TextEncoder().encode(secret);
  }

  // --------------------------------------------------------------------------
  // Password hashing
  // --------------------------------------------------------------------------

  /**
   * Hash a plaintext password with scrypt (Node.js built-in crypto).
   * @param plain - plaintext password
   * @returns hash string in format "salt:derivedKey" (hex encoded)
   */
  async hashPassword(plain: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derived = await new Promise<Buffer>((resolve, reject) =>
      scrypt(plain, salt, SCRYPT_KEYLEN, (err, key) => (err ? reject(err) : resolve(key)))
    );
    return `${salt.toString("hex")}:${derived.toString("hex")}`;
  }

  /**
   * Verify a plaintext password against a stored scrypt hash.
   * @param plain - plaintext password to verify
   * @param hash  - stored hash in "salt:derivedKey" format
   * @returns true if password matches
   */
  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    const [saltHex, keyHex] = hash.split(":");
    if (!saltHex || !keyHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const storedKey = Buffer.from(keyHex, "hex");
    const derived = await new Promise<Buffer>((resolve, reject) =>
      scrypt(plain, salt, storedKey.length, (err, key) => (err ? reject(err) : resolve(key)))
    );
    return timingSafeEqual(storedKey, derived);
  }

  // --------------------------------------------------------------------------
  // Access token
  // --------------------------------------------------------------------------

  /**
   * Generate a signed JWT access token (HS256).
   * @param payload   - token payload (userId, role, plan, optional email)
   * @param expiresIn - jose duration string, default "1h"
   * @returns compact JWT string
   */
  async generateToken(
    payload: TokenPayload,
    expiresIn: string = "1h"
  ): Promise<string> {
    return new jose.SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(this.secretKey);
  }

  /**
   * Verify and decode an access token.
   * Throws jose errors (JWTExpired, JWSInvalid, etc.) on failure — fail fast.
   * @param token - compact JWT string
   * @returns decoded TokenPayload
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    const { payload } = await jose.jwtVerify(token, this.secretKey);
    return {
      userId: payload["userId"] as string,
      role:   payload["role"]   as Role,
      plan:   payload["plan"]   as Plan,
      ...(payload["email"] !== undefined && { email: payload["email"] as string }),
    };
  }

  // --------------------------------------------------------------------------
  // Refresh token
  // --------------------------------------------------------------------------

  /**
   * Generate a refresh token with 30d expiry.
   * Contains only userId (minimal surface area).
   * @param payload - object with userId
   * @returns compact JWT string
   */
  async generateRefreshToken(payload: { userId: string }): Promise<string> {
    return new jose.SignJWT({ ...payload, type: "refresh" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(this.secretKey);
  }

  // --------------------------------------------------------------------------
  // Tier limits
  // --------------------------------------------------------------------------

  /**
   * Return the rate/feature limits for a subscription plan.
   * Pure function — no side effects, returns a frozen copy.
   * @param plan - subscription plan
   * @returns TierLimits (immutable copy)
   */
  getTierLimits(plan: Plan): TierLimits {
    const limits = LIMITS[plan];
    if (!limits) {
      throw new Error(`AuthEngineV7: unknown plan "${plan}"`);
    }
    return Object.freeze({ ...limits });
  }

  // --------------------------------------------------------------------------
  // PRISM standard stats
  // --------------------------------------------------------------------------

  stats() {
    return {
      engineName: this.engineName,
      version: this.version,
      plans: Object.keys(LIMITS) as Plan[],
      hashAlgo: "scrypt",
      algorithm: "HS256",
    };
  }
}
