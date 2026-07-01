/**
 * RedisTokenStore — Durable Token Storage for PrismOAuthServer
 * =============================================================
 *
 * Stores auth codes, refresh tokens, and revoked access token IDs in Redis
 * so they survive server restarts. Falls back to in-memory Maps when Redis
 * is unavailable.
 *
 * Key schema:
 *   prism:auth:code:{code}         → JSON(StoredAuthCode)     TTL = authCodeExpiry
 *   prism:auth:refresh:{token}     → JSON(StoredRefreshToken)  TTL = refreshTokenExpiry
 *   prism:auth:user_rt:{sub}       → Set<refresh token keys>  TTL = refreshTokenExpiry
 *   prism:auth:revoked:{tokenId}   → "1"                      TTL = accessTokenExpiry
 *
 * INFRA-3-1 U-AUTH1
 */

// ─── Types (mirrors auth.ts internal types) ──────────────────────────────────

/** User shape stored in token data — role is string to avoid importing OAuthRole */
export interface TokenStoreUser {
  sub: string;
  role: string;
  scope: string;
  email?: string;
  tenant_id?: string;
  display_name?: string;
}

export interface StoredAuthCode {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  scope: string;
  user: TokenStoreUser;
  expiresAt: number;
  used: boolean;
}

export interface StoredRefreshToken {
  token: string;
  user: TokenStoreUser;
  clientId: string;
  scope: string;
  expiresAt: number;
  revoked: boolean;
}

export interface TokenStoreStats {
  mode: "redis" | "memory";
  auth_codes: number;
  refresh_tokens: number;
  revoked_access_tokens: number;
}

// ─── Key prefixes ────────────────────────────────────────────────────────────

const PFX_CODE = "prism:auth:code:";
const PFX_REFRESH = "prism:auth:refresh:";
const PFX_USER_RT = "prism:auth:user_rt:";
const PFX_REVOKED = "prism:auth:revoked:";

// ─── Store interface ─────────────────────────────────────────────────────────

export interface ITokenStore {
  /** Attempt Redis connection. Returns true if Redis is active. */
  init(): Promise<boolean>;
  mode: "redis" | "memory";

  // Auth codes
  setAuthCode(code: string, data: StoredAuthCode, ttlMs: number): Promise<void>;
  getAuthCode(code: string): Promise<StoredAuthCode | null>;
  deleteAuthCode(code: string): Promise<void>;

  // Refresh tokens
  setRefreshToken(token: string, data: StoredRefreshToken, ttlMs: number): Promise<void>;
  getRefreshToken(token: string): Promise<StoredRefreshToken | null>;
  deleteRefreshToken(token: string): Promise<void>;
  /** Get all non-expired refresh tokens for a user (for revocation). */
  getRefreshTokensByUser(sub: string): Promise<StoredRefreshToken[]>;
  /** Update a stored refresh token (e.g., mark revoked). */
  updateRefreshToken(token: string, data: StoredRefreshToken): Promise<void>;

  // Revoked access tokens
  addRevokedToken(tokenId: string, ttlMs: number): Promise<void>;
  isRevoked(tokenId: string): Promise<boolean>;
  getRevokedCount(): Promise<number>;

  // Lifecycle
  getStats(): Promise<TokenStoreStats>;
  cleanup(): Promise<{ codes_removed: number; tokens_removed: number }>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

// ─── In-Memory implementation (fallback) ─────────────────────────────────────

class InMemoryTokenStore implements ITokenStore {
  mode = "memory" as const;
  private authCodes = new Map<string, StoredAuthCode>();
  private refreshTokens = new Map<string, StoredRefreshToken>();
  private revokedAccessTokens = new Set<string>();

  async init(): Promise<boolean> { return false; }

  async setAuthCode(code: string, data: StoredAuthCode, _ttlMs: number): Promise<void> {
    this.authCodes.set(code, data);
  }
  async getAuthCode(code: string): Promise<StoredAuthCode | null> {
    return this.authCodes.get(code) ?? null;
  }
  async deleteAuthCode(code: string): Promise<void> {
    this.authCodes.delete(code);
  }

  async setRefreshToken(token: string, data: StoredRefreshToken, _ttlMs: number): Promise<void> {
    this.refreshTokens.set(token, data);
  }
  async getRefreshToken(token: string): Promise<StoredRefreshToken | null> {
    return this.refreshTokens.get(token) ?? null;
  }
  async deleteRefreshToken(token: string): Promise<void> {
    this.refreshTokens.delete(token);
  }
  async getRefreshTokensByUser(sub: string): Promise<StoredRefreshToken[]> {
    return Array.from(this.refreshTokens.values()).filter(rt => rt.user.sub === sub);
  }
  async updateRefreshToken(token: string, data: StoredRefreshToken): Promise<void> {
    this.refreshTokens.set(token, data);
  }

  async addRevokedToken(tokenId: string, _ttlMs: number): Promise<void> {
    this.revokedAccessTokens.add(tokenId);
    // Cap at 10K
    if (this.revokedAccessTokens.size > 10_000) {
      const entries = Array.from(this.revokedAccessTokens);
      for (const e of entries.slice(0, entries.length - 5_000)) {
        this.revokedAccessTokens.delete(e);
      }
    }
  }
  async isRevoked(tokenId: string): Promise<boolean> {
    return this.revokedAccessTokens.has(tokenId);
  }
  async getRevokedCount(): Promise<number> {
    return this.revokedAccessTokens.size;
  }

  async getStats(): Promise<TokenStoreStats> {
    return {
      mode: "memory",
      auth_codes: this.authCodes.size,
      refresh_tokens: Array.from(this.refreshTokens.values())
        .filter(rt => !rt.revoked && Date.now() < rt.expiresAt).length,
      revoked_access_tokens: this.revokedAccessTokens.size,
    };
  }

  async cleanup(): Promise<{ codes_removed: number; tokens_removed: number }> {
    const now = Date.now();
    let codes = 0, tokens = 0;
    for (const [k, c] of this.authCodes) {
      if (now > c.expiresAt || c.used) { this.authCodes.delete(k); codes++; }
    }
    for (const [k, rt] of this.refreshTokens) {
      if (now > rt.expiresAt || rt.revoked) { this.refreshTokens.delete(k); tokens++; }
    }
    return { codes_removed: codes, tokens_removed: tokens };
  }

  async clear(): Promise<void> {
    this.authCodes.clear();
    this.refreshTokens.clear();
    this.revokedAccessTokens.clear();
  }

  async close(): Promise<void> {
    await this.clear();
  }
}

// ─── Redis implementation ────────────────────────────────────────────────────

class RedisTokenStoreImpl implements ITokenStore {
  mode = "redis" as const;
  private client: any = null;
  private connected = false;
  /** In-memory fallback for when Redis operations fail mid-session */
  private fallback = new InMemoryTokenStore();

  async init(): Promise<boolean> {
    let Redis: any;
    try {
      Redis = (await import("ioredis")).default;
    } catch {
      console.warn("[TokenStore] ioredis not available — using in-memory");
      return false;
    }

    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
        keyPrefix: "",
        tls: url.startsWith("rediss://") ? { rejectUnauthorized: true } : undefined,
        retryStrategy: (times: number) => (times > 5 ? null : Math.min(times * 200, 2000)),
      });

      await this.client.connect();
      // Quick ping to confirm
      await this.client.ping();
      this.connected = true;
      console.log("[TokenStore] Redis connected — auth tokens will survive restarts");
      return true;
    } catch (err: unknown) {
      console.warn(`[TokenStore] Redis unavailable (${err instanceof Error ? err.message : String(err)}) — using in-memory`);
      this.connected = false;
      this.client = null;
      return false;
    }
  }

  private ttlSeconds(ms: number): number {
    return Math.max(1, Math.ceil(ms / 1000));
  }

  // ── Auth codes ───────────────────────────────────────────────────────────

  async setAuthCode(code: string, data: StoredAuthCode, ttlMs: number): Promise<void> {
    if (!this.connected) { await this.fallback.setAuthCode(code, data, ttlMs); return; }
    try {
      await this.client.set(PFX_CODE + code, JSON.stringify(data), "EX", this.ttlSeconds(ttlMs));
    } catch {
      await this.fallback.setAuthCode(code, data, ttlMs);
    }
  }

  async getAuthCode(code: string): Promise<StoredAuthCode | null> {
    if (!this.connected) return this.fallback.getAuthCode(code);
    try {
      const raw = await this.client.get(PFX_CODE + code);
      return raw ? JSON.parse(raw) as StoredAuthCode : null;
    } catch {
      return this.fallback.getAuthCode(code);
    }
  }

  async deleteAuthCode(code: string): Promise<void> {
    if (!this.connected) { await this.fallback.deleteAuthCode(code); return; }
    try {
      await this.client.del(PFX_CODE + code);
    } catch {
      await this.fallback.deleteAuthCode(code);
    }
  }

  // ── Refresh tokens ───────────────────────────────────────────────────────

  async setRefreshToken(token: string, data: StoredRefreshToken, ttlMs: number): Promise<void> {
    if (!this.connected) { await this.fallback.setRefreshToken(token, data, ttlMs); return; }
    const ttl = this.ttlSeconds(ttlMs);
    try {
      const pipeline = this.client.pipeline();
      pipeline.set(PFX_REFRESH + token, JSON.stringify(data), "EX", ttl);
      // Secondary index: user → set of refresh tokens
      pipeline.sadd(PFX_USER_RT + data.user.sub, token);
      pipeline.expire(PFX_USER_RT + data.user.sub, ttl);
      await pipeline.exec();
    } catch {
      await this.fallback.setRefreshToken(token, data, ttlMs);
    }
  }

  async getRefreshToken(token: string): Promise<StoredRefreshToken | null> {
    if (!this.connected) return this.fallback.getRefreshToken(token);
    try {
      const raw = await this.client.get(PFX_REFRESH + token);
      return raw ? JSON.parse(raw) as StoredRefreshToken : null;
    } catch {
      return this.fallback.getRefreshToken(token);
    }
  }

  async deleteRefreshToken(token: string): Promise<void> {
    if (!this.connected) { await this.fallback.deleteRefreshToken(token); return; }
    try {
      // Get user sub before deleting so we can clean the index
      const raw = await this.client.get(PFX_REFRESH + token);
      if (raw) {
        const data = JSON.parse(raw) as StoredRefreshToken;
        await this.client.srem(PFX_USER_RT + data.user.sub, token);
      }
      await this.client.del(PFX_REFRESH + token);
    } catch {
      await this.fallback.deleteRefreshToken(token);
    }
  }

  async getRefreshTokensByUser(sub: string): Promise<StoredRefreshToken[]> {
    if (!this.connected) return this.fallback.getRefreshTokensByUser(sub);
    try {
      const tokenKeys = await this.client.smembers(PFX_USER_RT + sub) as string[];
      if (!tokenKeys.length) return [];
      const pipeline = this.client.pipeline();
      for (const tk of tokenKeys) pipeline.get(PFX_REFRESH + tk);
      const results = await pipeline.exec() as [Error | null, string | null][];
      const tokens: StoredRefreshToken[] = [];
      for (const [err, raw] of results) {
        if (!err && raw) tokens.push(JSON.parse(raw) as StoredRefreshToken);
      }
      return tokens;
    } catch {
      return this.fallback.getRefreshTokensByUser(sub);
    }
  }

  async updateRefreshToken(token: string, data: StoredRefreshToken): Promise<void> {
    if (!this.connected) { await this.fallback.updateRefreshToken(token, data); return; }
    try {
      // Preserve existing TTL
      const ttl = await this.client.ttl(PFX_REFRESH + token);
      if (ttl > 0) {
        await this.client.set(PFX_REFRESH + token, JSON.stringify(data), "EX", ttl);
      }
    } catch {
      await this.fallback.updateRefreshToken(token, data);
    }
  }

  // ── Revoked access tokens ────────────────────────────────────────────────

  async addRevokedToken(tokenId: string, ttlMs: number): Promise<void> {
    if (!this.connected) { await this.fallback.addRevokedToken(tokenId, ttlMs); return; }
    try {
      await this.client.set(PFX_REVOKED + tokenId, "1", "EX", this.ttlSeconds(ttlMs));
    } catch {
      await this.fallback.addRevokedToken(tokenId, ttlMs);
    }
  }

  async isRevoked(tokenId: string): Promise<boolean> {
    if (!this.connected) return this.fallback.isRevoked(tokenId);
    try {
      const exists = await this.client.exists(PFX_REVOKED + tokenId);
      return exists === 1;
    } catch {
      return this.fallback.isRevoked(tokenId);
    }
  }

  async getRevokedCount(): Promise<number> {
    if (!this.connected) return this.fallback.getRevokedCount();
    try {
      // SCAN for revoked keys — approximate count
      let cursor = "0";
      let count = 0;
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, "MATCH", PFX_REVOKED + "*", "COUNT", 1000);
        cursor = nextCursor;
        count += (keys as string[]).length;
      } while (cursor !== "0");
      return count;
    } catch {
      return this.fallback.getRevokedCount();
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async getStats(): Promise<TokenStoreStats> {
    if (!this.connected) return this.fallback.getStats();
    try {
      // Count auth codes via SCAN
      let cursor = "0", codeCount = 0;
      do {
        const [nc, keys] = await this.client.scan(cursor, "MATCH", PFX_CODE + "*", "COUNT", 500);
        cursor = nc; codeCount += (keys as string[]).length;
      } while (cursor !== "0");

      // Count refresh tokens
      cursor = "0"; let rtCount = 0;
      do {
        const [nc, keys] = await this.client.scan(cursor, "MATCH", PFX_REFRESH + "*", "COUNT", 500);
        cursor = nc; rtCount += (keys as string[]).length;
      } while (cursor !== "0");

      const revokedCount = await this.getRevokedCount();

      return { mode: "redis", auth_codes: codeCount, refresh_tokens: rtCount, revoked_access_tokens: revokedCount };
    } catch {
      return { mode: "redis", auth_codes: 0, refresh_tokens: 0, revoked_access_tokens: 0 };
    }
  }

  async cleanup(): Promise<{ codes_removed: number; tokens_removed: number }> {
    // Redis TTLs handle expiry automatically. Only need to clean revoked refresh tokens.
    if (!this.connected) return this.fallback.cleanup();
    // No-op for Redis — TTL auto-expires entries
    return { codes_removed: 0, tokens_removed: 0 };
  }

  async clear(): Promise<void> {
    if (!this.connected) { await this.fallback.clear(); return; }
    try {
      // Delete all auth-related keys
      for (const prefix of [PFX_CODE, PFX_REFRESH, PFX_USER_RT, PFX_REVOKED]) {
        let cursor = "0";
        do {
          const [nc, keys] = await this.client.scan(cursor, "MATCH", prefix + "*", "COUNT", 500);
          cursor = nc;
          if ((keys as string[]).length > 0) await this.client.del(...(keys as string[]));
        } while (cursor !== "0");
      }
    } catch {
      // Ignore — best effort
    }
    await this.fallback.clear();
  }

  async close(): Promise<void> {
    if (this.client) {
      try { await this.client.quit(); } catch { /* ignore */ }
      this.client = null;
      this.connected = false;
    }
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create the best available token store.
 * Tries Redis first, falls back to in-memory.
 */
export async function createTokenStore(): Promise<ITokenStore> {
  const redisStore = new RedisTokenStoreImpl();
  const ok = await redisStore.init();
  if (ok) return redisStore;
  // Redis unavailable — return in-memory store
  const memStore = new InMemoryTokenStore();
  await memStore.init();
  return memStore;
}

/**
 * Create an in-memory token store (for tests).
 */
export function createInMemoryTokenStore(): ITokenStore {
  return new InMemoryTokenStore();
}
