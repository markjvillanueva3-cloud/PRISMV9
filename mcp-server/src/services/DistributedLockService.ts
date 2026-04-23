/**
 * PRISM Distributed Lock Service
 *
 * Provides distributed locking for multi-instance orchestration.
 * Auto-selects backend based on available connections:
 *   1. PostgreSQL advisory locks (preferred)
 *   2. Redis SET NX with TTL
 *   3. File-based locks (local dev fallback)
 *
 * @module services/DistributedLockService
 */

import * as fs from "fs/promises";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { PATHS } from "../constants.js";

// ── Types ───────────────────────────────────────────────────────

export interface LockHandle {
  resource: string;
  token: string;
  backend: "postgres" | "redis" | "file";
  acquiredAt: number;
  ttlMs: number;
  renewalTimer?: ReturnType<typeof setInterval>;
}

export interface LockResult {
  acquired: boolean;
  handle?: LockHandle;
  error?: string;
}

export interface IDistributedLockBackend {
  name: "postgres" | "redis" | "file";
  isAvailable(): Promise<boolean>;
  acquire(resource: string, ttlMs: number, token: string): Promise<boolean>;
  release(resource: string, token: string): Promise<boolean>;
  renew(resource: string, token: string, ttlMs: number): Promise<boolean>;
  forceRelease(resource: string): Promise<boolean>;
}

// ── PostgreSQL Advisory Lock Backend ────────────────────────────

class PostgresLockBackend implements IDistributedLockBackend {
  readonly name = "postgres" as const;
  private pool: any = null;
  private connected = false;
  private tokenMap = new Map<string, string>(); // resource -> token

  async isAvailable(): Promise<boolean> {
    if (this.connected && this.pool) return true;

    if (!process.env.DATABASE_URL) return false;

    try {
      const pgModule = "pg";
      const pg = await import(/* @vite-ignore */ pgModule).catch(() => null);
      if (!pg) return false;

      const Pool = pg.Pool ?? pg.default?.Pool;
      if (!Pool) return false;

      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      const client = await this.pool.connect();
      client.release();
      this.connected = true;
      log.info("[DistLock] PostgreSQL backend available");
      return true;
    } catch (err: any) {
      log.info(`[DistLock] PostgreSQL not available: ${err.message}`);
      return false;
    }
  }

  /**
   * Hash resource string to 64-bit integer for pg_advisory_lock.
   * Uses FNV-1a hash for good distribution.
   */
  private resourceToLockId(resource: string): bigint {
    let hash = BigInt(0xcbf29ce484222325n); // FNV offset basis
    const prime = BigInt(0x100000001b3n);   // FNV prime
    for (let i = 0; i < resource.length; i++) {
      hash ^= BigInt(resource.charCodeAt(i));
      hash = (hash * prime) & BigInt("0xffffffffffffffff");
    }
    // Keep as signed 64-bit for PostgreSQL bigint
    if (hash >= BigInt("0x8000000000000000")) {
      hash = hash - BigInt("0x10000000000000000");
    }
    return hash;
  }

  async acquire(resource: string, ttlMs: number, token: string): Promise<boolean> {
    if (!this.connected || !this.pool) return false;

    const lockId = this.resourceToLockId(resource);
    const client = await this.pool.connect();

    try {
      // pg_try_advisory_lock returns true if lock acquired, false if not
      // Note: TTL is simulated via heartbeat - PG advisory locks don't expire
      const result = await client.query(
        "SELECT pg_try_advisory_lock($1::bigint) as acquired",
        [lockId.toString()]
      );
      const acquired = result.rows[0]?.acquired === true;

      if (acquired) {
        this.tokenMap.set(resource, token);
        log.debug(`[DistLock/PG] Acquired lock: ${resource} (id=${lockId})`);
      }

      return acquired;
    } catch (err: any) {
      log.warn(`[DistLock/PG] Acquire failed: ${err.message}`);
      return false;
    } finally {
      client.release();
    }
  }

  async release(resource: string, token: string): Promise<boolean> {
    if (!this.connected || !this.pool) return false;

    // Verify token ownership
    const storedToken = this.tokenMap.get(resource);
    if (storedToken !== token) {
      log.warn(`[DistLock/PG] Release denied: token mismatch for ${resource}`);
      return false;
    }

    const lockId = this.resourceToLockId(resource);
    const client = await this.pool.connect();

    try {
      await client.query(
        "SELECT pg_advisory_unlock($1::bigint)",
        [lockId.toString()]
      );
      this.tokenMap.delete(resource);
      log.debug(`[DistLock/PG] Released lock: ${resource}`);
      return true;
    } catch (err: any) {
      log.warn(`[DistLock/PG] Release failed: ${err.message}`);
      return false;
    } finally {
      client.release();
    }
  }

  async renew(resource: string, token: string, _ttlMs: number): Promise<boolean> {
    // PG advisory locks don't expire - just verify ownership
    const storedToken = this.tokenMap.get(resource);
    return storedToken === token;
  }

  async forceRelease(resource: string): Promise<boolean> {
    if (!this.connected || !this.pool) return false;

    const lockId = this.resourceToLockId(resource);
    const client = await this.pool.connect();

    try {
      await client.query(
        "SELECT pg_advisory_unlock_all()"
      );
      this.tokenMap.delete(resource);
      log.info(`[DistLock/PG] Force released lock: ${resource}`);
      return true;
    } catch (err: any) {
      log.warn(`[DistLock/PG] Force release failed: ${err.message}`);
      return false;
    } finally {
      client.release();
    }
  }
}

// ── Redis Lock Backend ──────────────────────────────────────────

class RedisLockBackend implements IDistributedLockBackend {
  readonly name = "redis" as const;
  private client: any = null;
  private connected = false;

  async isAvailable(): Promise<boolean> {
    if (this.connected && this.client) return true;

    try {
      const Redis = (await import("ioredis")).default;
      const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: (times: number) => {
          if (times > 3) return null;
          return Math.min(times * 200, 1000);
        },
      });

      await this.client.connect();
      await this.client.ping();
      this.connected = true;
      log.info("[DistLock] Redis backend available");
      return true;
    } catch (err: any) {
      log.info(`[DistLock] Redis not available: ${err.message}`);
      this.client = null;
      return false;
    }
  }

  private lockKey(resource: string): string {
    return `prism:lock:${resource}`;
  }

  async acquire(resource: string, ttlMs: number, token: string): Promise<boolean> {
    if (!this.connected || !this.client) return false;

    try {
      // SET NX with PX (millisecond expiry) - atomic acquire with TTL
      const result = await this.client.set(
        this.lockKey(resource),
        token,
        "PX",
        ttlMs,
        "NX"
      );
      const acquired = result === "OK";

      if (acquired) {
        log.debug(`[DistLock/Redis] Acquired lock: ${resource} (ttl=${ttlMs}ms)`);
      }

      return acquired;
    } catch (err: any) {
      log.warn(`[DistLock/Redis] Acquire failed: ${err.message}`);
      return false;
    }
  }

  async release(resource: string, token: string): Promise<boolean> {
    if (!this.connected || !this.client) return false;

    try {
      // Lua script for atomic check-and-delete (prevents releasing other's lock)
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.client.eval(luaScript, 1, this.lockKey(resource), token);
      const released = result === 1;

      if (released) {
        log.debug(`[DistLock/Redis] Released lock: ${resource}`);
      } else {
        log.warn(`[DistLock/Redis] Release denied: token mismatch for ${resource}`);
      }

      return released;
    } catch (err: any) {
      log.warn(`[DistLock/Redis] Release failed: ${err.message}`);
      return false;
    }
  }

  async renew(resource: string, token: string, ttlMs: number): Promise<boolean> {
    if (!this.connected || !this.client) return false;

    try {
      // Lua script for atomic check-and-extend
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
      const result = await this.client.eval(
        luaScript,
        1,
        this.lockKey(resource),
        token,
        ttlMs.toString()
      );
      return result === 1;
    } catch (err: any) {
      log.warn(`[DistLock/Redis] Renew failed: ${err.message}`);
      return false;
    }
  }

  async forceRelease(resource: string): Promise<boolean> {
    if (!this.connected || !this.client) return false;

    try {
      await this.client.del(this.lockKey(resource));
      log.info(`[DistLock/Redis] Force released lock: ${resource}`);
      return true;
    } catch (err: any) {
      log.warn(`[DistLock/Redis] Force release failed: ${err.message}`);
      return false;
    }
  }
}

// ── File Lock Backend (Local Dev Fallback) ──────────────────────

class FileLockBackend implements IDistributedLockBackend {
  readonly name = "file" as const;
  private lockDir: string;
  private expiryCheckers = new Map<string, ReturnType<typeof setInterval>>();

  constructor() {
    this.lockDir = path.join(PATHS.MCP_SERVER, "data", "locks");
  }

  async isAvailable(): Promise<boolean> {
    try {
      await fs.mkdir(this.lockDir, { recursive: true });
      log.info("[DistLock] File backend available (local dev mode)");
      return true;
    } catch {
      return false;
    }
  }

  private lockPath(resource: string): string {
    // Sanitize resource name for filesystem
    const safeName = resource.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.lockDir, `${safeName}.lock`);
  }

  async acquire(resource: string, ttlMs: number, token: string): Promise<boolean> {
    const lockFile = this.lockPath(resource);

    try {
      // Check if existing lock is expired
      try {
        const existing = await fs.readFile(lockFile, "utf-8");
        const data = JSON.parse(existing);
        const age = Date.now() - data.acquiredAt;
        if (age < data.ttlMs) {
          // Lock still valid
          return false;
        }
        // Lock expired - remove it
        await fs.unlink(lockFile).catch(() => {});
      } catch {
        // No existing lock file
      }

      // Try to create lock atomically
      const lockData = {
        token,
        resource,
        acquiredAt: Date.now(),
        ttlMs,
        pid: process.pid,
      };

      // Use O_EXCL via flag 'wx' for atomic creation
      await fs.writeFile(lockFile, JSON.stringify(lockData, null, 2), { flag: "wx" });
      log.debug(`[DistLock/File] Acquired lock: ${resource}`);
      return true;
    } catch (err: any) {
      if (err.code === "EEXIST") {
        // Lock file already exists - someone else has it
        return false;
      }
      log.warn(`[DistLock/File] Acquire failed: ${err.message}`);
      return false;
    }
  }

  async release(resource: string, token: string): Promise<boolean> {
    const lockFile = this.lockPath(resource);

    try {
      const existing = await fs.readFile(lockFile, "utf-8");
      const data = JSON.parse(existing);

      if (data.token !== token) {
        log.warn(`[DistLock/File] Release denied: token mismatch for ${resource}`);
        return false;
      }

      await fs.unlink(lockFile);
      log.debug(`[DistLock/File] Released lock: ${resource}`);
      return true;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        // Lock already released
        return true;
      }
      log.warn(`[DistLock/File] Release failed: ${err.message}`);
      return false;
    }
  }

  async renew(resource: string, token: string, ttlMs: number): Promise<boolean> {
    const lockFile = this.lockPath(resource);

    try {
      const existing = await fs.readFile(lockFile, "utf-8");
      const data = JSON.parse(existing);

      if (data.token !== token) {
        return false;
      }

      // Update lock with new timestamp and TTL
      data.acquiredAt = Date.now();
      data.ttlMs = ttlMs;
      await fs.writeFile(lockFile, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  async forceRelease(resource: string): Promise<boolean> {
    const lockFile = this.lockPath(resource);

    try {
      await fs.unlink(lockFile);
      log.info(`[DistLock/File] Force released lock: ${resource}`);
      return true;
    } catch (err: any) {
      if (err.code === "ENOENT") return true;
      log.warn(`[DistLock/File] Force release failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Clean up expired lock files (for stale lock detection).
   */
  async cleanupExpired(): Promise<string[]> {
    const cleaned: string[] = [];

    try {
      const files = await fs.readdir(this.lockDir);
      for (const file of files) {
        if (!file.endsWith(".lock")) continue;

        const lockPath = path.join(this.lockDir, file);
        try {
          const data = JSON.parse(await fs.readFile(lockPath, "utf-8"));
          const age = Date.now() - data.acquiredAt;
          if (age > data.ttlMs) {
            await fs.unlink(lockPath);
            cleaned.push(data.resource);
            log.info(`[DistLock/File] Cleaned expired lock: ${data.resource}`);
          }
        } catch {
          // Invalid lock file - remove it
          await fs.unlink(lockPath).catch(() => {});
          cleaned.push(file);
        }
      }
    } catch {
      // Lock directory might not exist
    }

    return cleaned;
  }
}

// ── Main Distributed Lock Service ───────────────────────────────

class DistributedLockServiceImpl {
  private backend: IDistributedLockBackend | null = null;
  private activeLocks = new Map<string, LockHandle>();
  private initPromise: Promise<void> | null = null;
  private initialized = false;

  // Default TTLs per task type (can be overridden)
  private defaultTtls: Record<string, number> = {
    task_claim: 5 * 60 * 1000,      // 5 min for task claims
    milestone: 30 * 60 * 1000,      // 30 min for milestones
    pipeline: 60 * 60 * 1000,       // 1 hour for pipelines
    default: 5 * 60 * 1000,         // 5 min default
  };

  async init(): Promise<string> {
    if (this.initialized && this.backend) {
      return this.backend.name;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.backend?.name ?? "none";
    }

    this.initPromise = this._doInit();
    await this.initPromise;
    this.initPromise = null;
    return this.backend?.name ?? "none";
  }

  private async _doInit(): Promise<void> {
    const backends: IDistributedLockBackend[] = [
      new PostgresLockBackend(),
      new RedisLockBackend(),
      new FileLockBackend(),
    ];

    for (const backend of backends) {
      if (await backend.isAvailable()) {
        this.backend = backend;
        this.initialized = true;
        log.info(`[DistLock] Initialized with ${backend.name} backend`);
        return;
      }
    }

    // Should always have file backend as fallback
    log.warn("[DistLock] No backend available - locking disabled");
  }

  getBackendName(): string {
    return this.backend?.name ?? "none";
  }

  isInitialized(): boolean {
    return this.initialized && this.backend !== null;
  }

  /**
   * Generate a unique lock token.
   */
  private generateToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    const pid = process.pid.toString(36);
    return `${timestamp}-${random}-${pid}`;
  }

  /**
   * Acquire a distributed lock on a resource.
   *
   * @param resource - Unique resource identifier (e.g., "task:MS1/U1", "pipeline:job-123")
   * @param ttlMs - Lock TTL in milliseconds (optional, uses type-based default)
   * @param taskType - Task type for default TTL lookup
   * @param autoRenew - Whether to auto-renew the lock before expiry
   * @returns Lock result with handle if acquired
   */
  async acquireLock(
    resource: string,
    ttlMs?: number,
    taskType: string = "default",
    autoRenew: boolean = true
  ): Promise<LockResult> {
    if (!this.backend) {
      await this.init();
    }

    if (!this.backend) {
      return { acquired: false, error: "No lock backend available" };
    }

    const effectiveTtl = ttlMs ?? this.defaultTtls[taskType] ?? this.defaultTtls.default;
    const token = this.generateToken();

    const acquired = await this.backend.acquire(resource, effectiveTtl, token);

    if (!acquired) {
      return { acquired: false, error: "Lock already held by another process" };
    }

    const handle: LockHandle = {
      resource,
      token,
      backend: this.backend.name,
      acquiredAt: Date.now(),
      ttlMs: effectiveTtl,
    };

    // Set up auto-renewal if enabled and backend supports TTL
    if (autoRenew && (this.backend.name === "redis" || this.backend.name === "file")) {
      const renewInterval = Math.floor(effectiveTtl * 0.5); // Renew at 50% of TTL
      handle.renewalTimer = setInterval(async () => {
        const renewed = await this.renewLock(resource);
        if (!renewed) {
          log.warn(`[DistLock] Auto-renewal failed for ${resource}`);
          clearInterval(handle.renewalTimer);
        }
      }, renewInterval);
    }

    this.activeLocks.set(resource, handle);
    return { acquired: true, handle };
  }

  /**
   * Release a distributed lock.
   *
   * @param resource - Resource identifier
   * @param token - Optional token for verification (uses stored token if not provided)
   * @returns true if released successfully
   */
  async releaseLock(resource: string, token?: string): Promise<boolean> {
    if (!this.backend) {
      return false;
    }

    const handle = this.activeLocks.get(resource);
    if (!handle) {
      log.debug(`[DistLock] No local handle for ${resource}`);
      // Try force release if we don't have a handle
      return token ? this.backend.release(resource, token) : false;
    }

    // Clear auto-renewal timer
    if (handle.renewalTimer) {
      clearInterval(handle.renewalTimer);
    }

    const effectiveToken = token ?? handle.token;
    const released = await this.backend.release(resource, effectiveToken);

    if (released) {
      this.activeLocks.delete(resource);
    }

    return released;
  }

  /**
   * Renew a lock's TTL.
   *
   * @param resource - Resource identifier
   * @param newTtlMs - New TTL (optional, uses original TTL)
   * @returns true if renewed successfully
   */
  async renewLock(resource: string, newTtlMs?: number): Promise<boolean> {
    if (!this.backend) {
      return false;
    }

    const handle = this.activeLocks.get(resource);
    if (!handle) {
      return false;
    }

    const ttl = newTtlMs ?? handle.ttlMs;
    const renewed = await this.backend.renew(resource, handle.token, ttl);

    if (renewed) {
      handle.ttlMs = ttl;
      handle.acquiredAt = Date.now(); // Update for local tracking
    }

    return renewed;
  }

  /**
   * Force release a lock (admin operation).
   * Use with caution - bypasses token verification.
   */
  async forceRelease(resource: string): Promise<boolean> {
    if (!this.backend) {
      return false;
    }

    const handle = this.activeLocks.get(resource);
    if (handle?.renewalTimer) {
      clearInterval(handle.renewalTimer);
    }

    this.activeLocks.delete(resource);
    return this.backend.forceRelease(resource);
  }

  /**
   * Check if a lock is currently held locally.
   */
  isLockHeld(resource: string): boolean {
    return this.activeLocks.has(resource);
  }

  /**
   * Get info about a locally held lock.
   */
  getLockInfo(resource: string): LockHandle | undefined {
    return this.activeLocks.get(resource);
  }

  /**
   * Release all locks held by this process (cleanup on exit).
   */
  async releaseAll(): Promise<number> {
    let released = 0;

    for (const [resource, handle] of this.activeLocks) {
      if (handle.renewalTimer) {
        clearInterval(handle.renewalTimer);
      }

      if (this.backend) {
        try {
          await this.backend.release(resource, handle.token);
          released++;
        } catch {
          // Best effort
        }
      }
    }

    this.activeLocks.clear();
    log.info(`[DistLock] Released ${released} locks on shutdown`);
    return released;
  }

  /**
   * Get stats about current lock state.
   */
  getStats(): {
    backend: string;
    activeLocks: number;
    locks: Array<{ resource: string; age_ms: number; ttl_ms: number }>;
  } {
    const now = Date.now();
    return {
      backend: this.backend?.name ?? "none",
      activeLocks: this.activeLocks.size,
      locks: Array.from(this.activeLocks.entries()).map(([resource, handle]) => ({
        resource,
        age_ms: now - handle.acquiredAt,
        ttl_ms: handle.ttlMs,
      })),
    };
  }

  /**
   * Configure default TTL for a task type.
   */
  setDefaultTtl(taskType: string, ttlMs: number): void {
    this.defaultTtls[taskType] = ttlMs;
  }

  /**
   * Get configured TTL for a task type.
   */
  getDefaultTtl(taskType: string): number {
    return this.defaultTtls[taskType] ?? this.defaultTtls.default;
  }
}

// Singleton export
export const distributedLockService = new DistributedLockServiceImpl();

// Also export types and class for testing
export { DistributedLockServiceImpl, PostgresLockBackend, RedisLockBackend, FileLockBackend };
