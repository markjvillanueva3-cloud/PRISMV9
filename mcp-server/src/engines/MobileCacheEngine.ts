/**
 * MobileCacheEngine — Offline Data Caching for Mobile
 * ====================================================
 *
 * Manages offline data caching, synchronization, and conflict
 * resolution for mobile shop floor applications.
 *
 * L2-P4-MS1/P0-U01 — Batch 2: Mobile Field Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CacheEntrySchema = z.object({
  key: z.string(),
  category: z.enum(["job", "material", "tool", "alarm", "speedfeed", "gcode", "machine", "schedule"]),
  data: z.unknown(),
  version: z.number(),
  cachedAt: z.string(),
  expiresAt: z.string(),
  syncStatus: z.enum(["synced", "pending", "conflict", "expired"]),
  priority: z.enum(["critical", "high", "normal", "low"]),
  sizeBytes: z.number(),
});

export const SyncOperationSchema = z.object({
  id: z.string(),
  operation: z.enum(["create", "update", "delete"]),
  category: z.string(),
  key: z.string(),
  localData: z.unknown(),
  serverData: z.unknown().optional(),
  timestamp: z.string(),
  status: z.enum(["pending", "syncing", "success", "failed", "conflict"]),
  retryCount: z.number().default(0),
  errorMessage: z.string().optional(),
});

export const CacheConfigSchema = z.object({
  maxSizeMB: z.number().default(100),
  defaultTTLMinutes: z.number().default(60),
  criticalTTLMinutes: z.number().default(480),
  syncIntervalSeconds: z.number().default(30),
  maxRetries: z.number().default(3),
});

export const SyncResultSchema = z.object({
  success: z.boolean(),
  synced: z.number(),
  failed: z.number(),
  conflicts: z.number(),
  details: z.array(z.object({
    key: z.string(),
    status: z.string(),
    message: z.string().optional(),
  })),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CacheEntry = z.infer<typeof CacheEntrySchema>;
export type SyncOperation = z.infer<typeof SyncOperationSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type SyncResult = z.infer<typeof SyncResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const cache: Map<string, CacheEntry> = new Map();
const syncQueue: Map<string, SyncOperation> = new Map();
let config: CacheConfig = {
  maxSizeMB: 100,
  defaultTTLMinutes: 60,
  criticalTTLMinutes: 480,
  syncIntervalSeconds: 30,
  maxRetries: 3,
};
let syncCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class MobileCacheEngine {
  /**
   * Store data in cache
   * @param key - Cache key
   * @param category - Data category
   * @param data - Data to cache
   * @param priority - Cache priority
   * @returns Cache entry
   */
  static set(key: string, category: CacheEntry["category"], data: unknown, priority: CacheEntry["priority"] = "normal"): CacheEntry {
    const now = new Date();
    const ttlMinutes = priority === "critical" ? config.criticalTTLMinutes : config.defaultTTLMinutes;
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);

    const entry: CacheEntry = {
      key,
      category,
      data,
      version: (cache.get(key)?.version || 0) + 1,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      syncStatus: "pending",
      priority,
      sizeBytes: JSON.stringify(data).length,
    };

    // Check cache size limit
    this.enforceLimit();

    cache.set(key, entry);
    return entry;
  }

  /**
   * Get data from cache
   * @param key - Cache key
   * @param allowExpired - Return expired data if true
   * @returns Cache entry or undefined
   */
  static get(key: string, allowExpired: boolean = false): CacheEntry | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;

    const now = new Date();
    const expires = new Date(entry.expiresAt);

    if (now > expires) {
      entry.syncStatus = "expired";
      if (!allowExpired) return undefined;
    }

    return entry;
  }

  /**
   * Get all entries by category
   * @param category - Data category
   * @param includeExpired - Include expired entries
   * @returns Matching cache entries
   */
  static getByCategory(category: CacheEntry["category"], includeExpired: boolean = false): CacheEntry[] {
    const now = new Date();
    return Array.from(cache.values()).filter(e => {
      if (e.category !== category) return false;
      if (!includeExpired && new Date(e.expiresAt) < now) return false;
      return true;
    });
  }

  /**
   * Delete cache entry
   * @param key - Cache key
   * @returns True if deleted
   */
  static delete(key: string): boolean {
    return cache.delete(key);
  }

  /**
   * Clear expired entries
   * @returns Number of entries cleared
   */
  static clearExpired(): number {
    const now = new Date();
    let cleared = 0;

    for (const [key, entry] of cache.entries()) {
      if (new Date(entry.expiresAt) < now) {
        cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Queue a sync operation
   * @param operation - Sync operation type
   * @param category - Data category
   * @param key - Data key
   * @param localData - Local data to sync
   * @returns Sync operation
   */
  static queueSync(operation: SyncOperation["operation"], category: string, key: string, localData: unknown): SyncOperation {
    const sync: SyncOperation = {
      id: `SYNC-${++syncCounter}`,
      operation,
      category,
      key,
      localData,
      timestamp: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
    };

    syncQueue.set(sync.id, sync);
    return sync;
  }

  /**
   * Process sync queue (simulated)
   * @returns Sync results
   */
  static processSync(): SyncResult {
    const results: SyncResult["details"] = [];
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    for (const [id, op] of syncQueue.entries()) {
      if (op.status !== "pending") continue;

      op.status = "syncing";

      // Simulate sync - in real implementation, this would call server
      const success = Math.random() > 0.1; // 90% success rate

      if (success) {
        op.status = "success";
        synced++;
        syncQueue.delete(id);

        // Update cache entry status
        const entry = cache.get(op.key);
        if (entry) {
          entry.syncStatus = "synced";
          cache.set(op.key, entry);
        }

        results.push({ key: op.key, status: "synced" });
      } else {
        op.retryCount++;
        if (op.retryCount >= config.maxRetries) {
          op.status = "failed";
          op.errorMessage = "Max retries exceeded";
          failed++;
          results.push({ key: op.key, status: "failed", message: op.errorMessage });
        } else {
          op.status = "pending";
          results.push({ key: op.key, status: "retry", message: `Retry ${op.retryCount}/${config.maxRetries}` });
        }
      }

      syncQueue.set(id, op);
    }

    return {
      success: failed === 0 && conflicts === 0,
      synced,
      failed,
      conflicts,
      details: results,
    };
  }

  /**
   * Get pending sync operations
   * @returns Pending sync operations
   */
  static getPendingSync(): SyncOperation[] {
    return Array.from(syncQueue.values()).filter(op => op.status === "pending");
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  static getStats(): {
    entryCount: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    byCategory: Record<string, number>;
    pendingSyncs: number;
    expiredCount: number;
  } {
    const now = new Date();
    let totalSize = 0;
    const byCategory: Record<string, number> = {};
    let expiredCount = 0;

    for (const entry of cache.values()) {
      totalSize += entry.sizeBytes;
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      if (new Date(entry.expiresAt) < now) {
        expiredCount++;
      }
    }

    return {
      entryCount: cache.size,
      totalSizeBytes: totalSize,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      byCategory,
      pendingSyncs: this.getPendingSync().length,
      expiredCount,
    };
  }

  /**
   * Enforce cache size limit
   */
  private static enforceLimit(): void {
    const stats = this.getStats();
    if (stats.totalSizeMB >= config.maxSizeMB) {
      // Clear expired first
      this.clearExpired();

      // If still over limit, remove low priority items
      const entries = Array.from(cache.entries())
        .sort((a, b) => {
          const priorityOrder = { low: 0, normal: 1, high: 2, critical: 3 };
          return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
        });

      while (this.getStats().totalSizeMB >= config.maxSizeMB * 0.8 && entries.length > 0) {
        const [key] = entries.shift()!;
        cache.delete(key);
      }
    }
  }

  /**
   * Prefetch common data for offline use
   * @param categories - Categories to prefetch
   * @returns Prefetch results
   */
  static prefetch(categories: CacheEntry["category"][]): { category: string; count: number }[] {
    const results: { category: string; count: number }[] = [];

    // In real implementation, this would fetch from server
    // For now, simulate with sample data
    const sampleData: Record<string, unknown[]> = {
      material: [{ code: "4140" }, { code: "D2" }, { code: "6061" }],
      gcode: [{ code: "G00" }, { code: "G01" }, { code: "G02" }],
      alarm: [{ code: "401", controller: "fanuc" }],
    };

    for (const category of categories) {
      const data = sampleData[category] || [];
      data.forEach((item, i) => {
        this.set(`${category}-${i}`, category as CacheEntry["category"], item, "normal");
      });
      results.push({ category, count: data.length });
    }

    return results;
  }

  /**
   * Update cache configuration
   * @param newConfig - New configuration
   */
  static configure(newConfig: Partial<CacheConfig>): void {
    config = { ...config, ...newConfig };
  }

  /**
   * Get current configuration
   * @returns Current configuration
   */
  static getConfig(): CacheConfig {
    return { ...config };
  }

  static getSelfAwareness() {
    return {
      name: "MobileCacheEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["set", "get", "getByCategory", "delete", "clearExpired", "queueSync", "processSync", "getPendingSync", "getStats", "prefetch", "configure", "getConfig"],
      currentStats: MobileCacheEngine.getStats(),
      dependencies: [],
    };
  }
}

export const mobileCacheEngine = new MobileCacheEngine();
