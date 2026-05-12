/**
 * DistributedLockEngine — Cross-Session File-Based Locking
 *
 * Phase 0.4 from AGI proximity plan. Provides distributed locking
 * for cross-session safety using file-based locks with heartbeat.
 *
 * Features:
 * - Advisory locks using lock files
 * - Heartbeat to detect stale locks
 * - Automatic cleanup of abandoned locks
 * - withLock() helper for automatic acquire/release
 *
 * @module engines/DistributedLockEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ============================================================================
// TYPES
// ============================================================================

export interface LockInfo {
  resource: string;
  holder: string;
  sessionId: string;
  acquiredAt: string;
  expiresAt: string;
  heartbeatAt: string;
  metadata?: Record<string, unknown>;
}

export interface LockResult {
  acquired: boolean;
  lockId?: string;
  existingHolder?: string;
  expiresIn?: number;
}

export interface LockOptions {
  timeoutMs?: number; // How long to wait for lock (default: 30s)
  ttlMs?: number; // How long lock is valid (default: 60s)
  retryIntervalMs?: number; // Retry interval (default: 100ms)
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_TTL_MS = 60000;
const DEFAULT_RETRY_MS = 100;
const HEARTBEAT_INTERVAL_MS = 10000;
const STALE_THRESHOLD_MS = 30000;

// ============================================================================
// ENGINE
// ============================================================================

export class DistributedLockEngine {
  private baseDir: string;
  private locksDir: string;
  private sessionId: string;
  private heldLocks: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    this.locksDir = path.join(this.baseDir, "data", "locks");
    this.sessionId = process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`;

    // Ensure locks directory exists
    if (!fs.existsSync(this.locksDir)) {
      fs.mkdirSync(this.locksDir, { recursive: true });
    }

    log.info("[DistributedLock] Initialized — cross-session file-based locking");
  }

  // ============================================================================
  // MAIN API
  // ============================================================================

  /**
   * Acquire a lock on a resource
   */
  async acquire(resource: string, options: LockOptions = {}): Promise<LockResult> {
    const {
      timeoutMs = DEFAULT_TIMEOUT_MS,
      ttlMs = DEFAULT_TTL_MS,
      retryIntervalMs = DEFAULT_RETRY_MS,
      metadata,
    } = options;

    const startTime = Date.now();
    const lockPath = this.getLockPath(resource);

    while (Date.now() - startTime < timeoutMs) {
      // Check for existing lock
      const existingLock = this.readLock(lockPath);

      if (existingLock) {
        // Check if lock is stale
        const heartbeatAge = Date.now() - new Date(existingLock.heartbeatAt).getTime();
        const isExpired = Date.now() > new Date(existingLock.expiresAt).getTime();

        if (heartbeatAge > STALE_THRESHOLD_MS || isExpired) {
          // Stale lock — clean it up
          this.removeLock(lockPath);
          log.info(`[DistributedLock] Cleaned up stale lock on ${resource} (holder: ${existingLock.holder})`);
        } else if (existingLock.sessionId === this.sessionId) {
          // We already hold this lock — refresh it
          return this.refreshLock(resource, ttlMs);
        } else {
          // Lock held by another session — wait and retry
          await this.sleep(retryIntervalMs);
          continue;
        }
      }

      // Try to acquire lock
      const lockId = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const lockInfo: LockInfo = {
        resource,
        holder: lockId,
        sessionId: this.sessionId,
        acquiredAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
        heartbeatAt: now.toISOString(),
        metadata,
      };

      // Atomic lock creation attempt
      if (this.tryCreateLock(lockPath, lockInfo)) {
        // Start heartbeat
        this.startHeartbeat(resource, lockPath, ttlMs);

        log.info(`[DistributedLock] Acquired lock on ${resource} (id: ${lockId})`);
        return {
          acquired: true,
          lockId,
          expiresIn: ttlMs,
        };
      }

      // Another process grabbed the lock — retry
      await this.sleep(retryIntervalMs);
    }

    // Timeout
    const existingLock = this.readLock(lockPath);
    return {
      acquired: false,
      existingHolder: existingLock?.holder,
    };
  }

  /**
   * Release a lock on a resource
   */
  async release(resource: string): Promise<boolean> {
    const lockPath = this.getLockPath(resource);
    const existingLock = this.readLock(lockPath);

    if (!existingLock) {
      log.warn(`[DistributedLock] No lock found on ${resource}`);
      return false;
    }

    if (existingLock.sessionId !== this.sessionId) {
      log.warn(`[DistributedLock] Cannot release lock on ${resource} — held by different session`);
      return false;
    }

    // Stop heartbeat
    this.stopHeartbeat(resource);

    // Remove lock file
    this.removeLock(lockPath);

    log.info(`[DistributedLock] Released lock on ${resource}`);
    return true;
  }

  /**
   * Execute a function while holding a lock
   */
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const result = await this.acquire(resource, options);

    if (!result.acquired) {
      throw new Error(
        `Could not acquire lock on ${resource} — held by ${result.existingHolder}`
      );
    }

    try {
      return await fn();
    } finally {
      await this.release(resource);
    }
  }

  /**
   * Check if a resource is locked
   */
  isLocked(resource: string): boolean {
    const lockPath = this.getLockPath(resource);
    const lock = this.readLock(lockPath);

    if (!lock) return false;

    // Check if lock is stale
    const heartbeatAge = Date.now() - new Date(lock.heartbeatAt).getTime();
    const isExpired = Date.now() > new Date(lock.expiresAt).getTime();

    return !(heartbeatAge > STALE_THRESHOLD_MS || isExpired);
  }

  /**
   * Get info about a lock
   */
  getLockInfo(resource: string): LockInfo | null {
    const lockPath = this.getLockPath(resource);
    return this.readLock(lockPath);
  }

  /**
   * Check if current session holds a lock
   */
  holdsLock(resource: string): boolean {
    const lock = this.getLockInfo(resource);
    return lock?.sessionId === this.sessionId;
  }

  /**
   * Clean up all stale locks
   */
  async cleanupStaleLocks(): Promise<number> {
    let cleaned = 0;

    try {
      const files = fs.readdirSync(this.locksDir);

      for (const file of files) {
        if (!file.endsWith(".lock")) continue;

        const lockPath = path.join(this.locksDir, file);
        const lock = this.readLock(lockPath);

        if (!lock) continue;

        const heartbeatAge = Date.now() - new Date(lock.heartbeatAt).getTime();
        const isExpired = Date.now() > new Date(lock.expiresAt).getTime();

        if (heartbeatAge > STALE_THRESHOLD_MS || isExpired) {
          this.removeLock(lockPath);
          cleaned++;
        }
      }
    } catch (err) {
      log.warn(`[DistributedLock] Error cleaning up locks: ${err}`);
    }

    if (cleaned > 0) {
      log.info(`[DistributedLock] Cleaned up ${cleaned} stale locks`);
    }

    return cleaned;
  }

  /**
   * Release all locks held by this session (cleanup on exit)
   */
  async releaseAll(): Promise<number> {
    let released = 0;

    for (const resource of this.heldLocks.keys()) {
      if (await this.release(resource)) {
        released++;
      }
    }

    return released;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getLockPath(resource: string): string {
    // Sanitize resource name for filename
    const safeName = resource.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.locksDir, `${safeName}.lock`);
  }

  private readLock(lockPath: string): LockInfo | null {
    try {
      if (!fs.existsSync(lockPath)) return null;
      const content = fs.readFileSync(lockPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private tryCreateLock(lockPath: string, lockInfo: LockInfo): boolean {
    try {
      // Use wx flag for exclusive creation (fails if file exists)
      fs.writeFileSync(lockPath, JSON.stringify(lockInfo), { flag: "wx" });
      return true;
    } catch (err: any) {
      if (err.code === "EEXIST") {
        return false; // Lock file already exists
      }
      throw err;
    }
  }

  private removeLock(lockPath: string): void {
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch (err) {
      log.warn(`[DistributedLock] Failed to remove lock file: ${err}`);
    }
  }

  private refreshLock(resource: string, ttlMs: number): LockResult {
    const lockPath = this.getLockPath(resource);
    const lock = this.readLock(lockPath);

    if (!lock || lock.sessionId !== this.sessionId) {
      return { acquired: false };
    }

    // Update expiry and heartbeat
    lock.expiresAt = new Date(Date.now() + ttlMs).toISOString();
    lock.heartbeatAt = new Date().toISOString();

    try {
      fs.writeFileSync(lockPath, JSON.stringify(lock));
      return {
        acquired: true,
        lockId: lock.holder,
        expiresIn: ttlMs,
      };
    } catch {
      return { acquired: false };
    }
  }

  private startHeartbeat(resource: string, lockPath: string, ttlMs: number): void {
    // Stop any existing heartbeat
    this.stopHeartbeat(resource);

    // Start new heartbeat
    const interval = setInterval(() => {
      const lock = this.readLock(lockPath);
      if (lock && lock.sessionId === this.sessionId) {
        lock.heartbeatAt = new Date().toISOString();
        lock.expiresAt = new Date(Date.now() + ttlMs).toISOString();
        try {
          fs.writeFileSync(lockPath, JSON.stringify(lock));
        } catch {
          // Lock may have been removed
          this.stopHeartbeat(resource);
        }
      } else {
        // Lock no longer ours
        this.stopHeartbeat(resource);
      }
    }, HEARTBEAT_INTERVAL_MS);

    this.heldLocks.set(resource, interval);
  }

  private stopHeartbeat(resource: string): void {
    const interval = this.heldLocks.get(resource);
    if (interval) {
      clearInterval(interval);
      this.heldLocks.delete(resource);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const distributedLockEngine = new DistributedLockEngine();
