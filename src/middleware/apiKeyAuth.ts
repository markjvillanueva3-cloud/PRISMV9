/**
 * API Key Authentication Middleware — INFRA-3-3 U-AUTH3
 *
 * Validates API keys from X-API-Key header or Authorization: ApiKey <key>.
 * Looks up key hash against api_keys Postgres table (schema.sql).
 * Falls back to in-memory store when DB unavailable.
 *
 * Key hashing: SHA-256 (fast lookup, keys are high-entropy random strings).
 * Keys are prefixed: "prism_sk_" (secret key) or "prism_pk_" (publishable key).
 *
 * After validation, sets req.userId, req.userRoles, req.userPermissions —
 * same contract as verifyToken middleware.
 */
import type { Request, Response, NextFunction } from "express";
import { createHash, randomBytes } from "node:crypto";
import { log } from "../utils/Logger.js";

// ============================================================================
// Types
// ============================================================================

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  permissions: string[];
  role: string;
  plan: string;
  expires_at: string | null;
  revoked: boolean;
  last_used_at: string | null;
}

export interface ApiKeyValidation {
  valid: boolean;
  user_id?: string;
  role?: string;
  plan?: string;
  permissions?: string[];
  key_name?: string;
  reason?: string;
}

// ============================================================================
// Key hashing
// ============================================================================

/** Hash an API key for storage/lookup. Uses SHA-256 (keys are random, not passwords). */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Generate a new API key with prefix. */
export function generateApiKey(type: "secret" | "publishable" = "secret"): string {
  const prefix = type === "secret" ? "prism_sk_" : "prism_pk_";
  return prefix + randomBytes(32).toString("hex");
}

// ============================================================================
// In-Memory API Key Store (for tests + fallback)
// ============================================================================

export class InMemoryApiKeyStore {
  private keys = new Map<string, ApiKeyRecord>();

  register(key: string, record: Omit<ApiKeyRecord, "key_hash">): void {
    const hash = hashApiKey(key);
    this.keys.set(hash, { ...record, key_hash: hash });
  }

  validate(key: string): ApiKeyValidation {
    const hash = hashApiKey(key);
    const record = this.keys.get(hash);

    if (!record) {
      return { valid: false, reason: "Invalid API key" };
    }
    if (record.revoked) {
      return { valid: false, reason: "API key has been revoked" };
    }
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return { valid: false, reason: "API key has expired" };
    }

    return {
      valid: true,
      user_id: record.user_id,
      role: record.role,
      plan: record.plan,
      permissions: record.permissions,
      key_name: record.name,
    };
  }

  revoke(keyHash: string): boolean {
    const record = this.keys.get(keyHash);
    if (record) { record.revoked = true; return true; }
    return false;
  }

  clear(): void {
    this.keys.clear();
  }
}

// ============================================================================
// Postgres-backed validation
// ============================================================================

/**
 * Validate an API key against the Postgres api_keys table.
 * Returns null if DB is unavailable (caller should fall through).
 */
interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  permissions: string[];
  expires_at: string | null;
  revoked: boolean;
  role: string;
  plan: string;
}

async function validateAgainstDb(keyHash: string): Promise<ApiKeyValidation | null> {
  try {
    // Dynamic import to avoid hard dependency on DB connection
    const { db } = await import("../db/connection.js");
    if (!db || typeof db.query !== "function") return null;

    const result = await db.query<ApiKeyRow>(
      `SELECT ak.id, ak.user_id, ak.name, ak.permissions, ak.expires_at, ak.revoked,
              u.role, COALESCE(u.plan, 'free') as plan
       FROM api_keys ak
       JOIN users u ON u.id = ak.user_id
       WHERE ak.key_hash = $1 AND u.active = true
       LIMIT 1`,
      [keyHash]
    );

    if (!result.rows || result.rows.length === 0) {
      return { valid: false, reason: "Invalid API key" };
    }

    const row = result.rows[0];
    if (row.revoked) {
      return { valid: false, reason: "API key has been revoked" };
    }
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return { valid: false, reason: "API key has expired" };
    }

    // Update last_used_at (fire and forget)
    db.query(
      "UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",
      [row.id]
    ).catch(() => { /* non-critical */ });

    return {
      valid: true,
      user_id: row.user_id,
      role: row.role,
      plan: row.plan,
      permissions: row.permissions ?? [],
      key_name: row.name,
    };
  } catch {
    // DB unavailable — return null so caller can fall through
    return null;
  }
}

// ============================================================================
// Singleton in-memory store (fallback + test seeding)
// ============================================================================

let memoryStore: InMemoryApiKeyStore | null = null;

export function getApiKeyMemoryStore(): InMemoryApiKeyStore {
  if (!memoryStore) memoryStore = new InMemoryApiKeyStore();
  return memoryStore;
}

export function resetApiKeyMemoryStore(): void {
  memoryStore = null;
}

// ============================================================================
// Express middleware
// ============================================================================

/**
 * Extract API key from request headers.
 * Supports: X-API-Key header or Authorization: ApiKey <key>
 */
function extractApiKey(req: Request): string | null {
  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey.length > 0) return xApiKey;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("ApiKey ")) return authHeader.slice(7);

  return null;
}

/**
 * Middleware: Verify API key from X-API-Key or Authorization: ApiKey header.
 * Sets req.userId, req.userRoles, req.userPermissions on success.
 * Returns 401 if key is missing/invalid/expired/revoked.
 *
 * Falls back to in-memory store when Postgres unavailable.
 *
 * @example
 *   router.get("/data", verifyApiKey, handler)
 */
export function verifyApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = extractApiKey(req);
  if (!key) {
    res.status(401).json({
      error: { status: 401, message: "Missing API key. Provide X-API-Key header or Authorization: ApiKey <key>", code: "API_KEY_REQUIRED" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const keyHash = hashApiKey(key);

  // Try DB first, fall back to memory
  validateAgainstDb(keyHash)
    .then(dbResult => {
      const result = dbResult ?? getApiKeyMemoryStore().validate(key);

      if (!result.valid) {
        log.warn(`[ApiKey] Rejected: ${result.reason}`);
        res.status(401).json({
          error: { status: 401, message: result.reason ?? "Invalid API key", code: "API_KEY_INVALID" },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Set same fields as verifyToken for downstream compatibility
      (req as any).userId = result.user_id;
      (req as any).userRoles = result.role ? [result.role] : [];
      (req as any).userPermissions = result.permissions ?? [];
      // Set user object for tierGate compatibility
      (req as any).user = {
        sub: result.user_id,
        plan: result.plan ?? "free",
        role: result.role,
      };

      next();
    })
    .catch(() => {
      res.status(500).json({
        error: { status: 500, message: "API key validation error", code: "API_KEY_ERROR" },
        timestamp: new Date().toISOString(),
      });
    });
}

/**
 * Middleware: Accept either Bearer token OR API key.
 * Tries Bearer first, falls back to API key.
 * Useful for endpoints that accept both auth methods.
 *
 * @example
 *   router.get("/data", verifyTokenOrApiKey, handler)
 */
export function verifyTokenOrApiKey(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // If Bearer token present, delegate to standard token auth
  if (authHeader?.startsWith("Bearer ")) {
    // Import lazily to avoid circular dependency
    import("./auth.js").then(({ verifyToken }) => {
      verifyToken(req, res, next);
    }).catch(() => {
      res.status(500).json({
        error: { status: 500, message: "Auth module error", code: "AUTH_ERROR" },
        timestamp: new Date().toISOString(),
      });
    });
    return;
  }

  // Otherwise try API key
  verifyApiKey(req, res, next);
}
