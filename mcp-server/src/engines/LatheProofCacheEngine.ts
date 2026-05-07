/**
 * LatheProofCacheEngine — Proof Result Caching
 *
 * U-LTH67: Per-block hash cache for formal verification results.
 * Caches (modal_state_hash, constraint_block_hash) → {sat|unsat|unknown, time_ms, timestamp}
 * Invalidates on machine-envelope / tool-library / stock-spec changes.
 *
 * @module engines/LatheProofCacheEngine
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export type CacheStatus = "sat" | "unsat" | "unknown" | "timeout";

export interface CacheEntry {
  key: string;
  modal_state_hash: string;
  constraint_hash: string;
  property_type: string;
  status: CacheStatus;
  time_ms: number;
  timestamp: string;
  block_index?: number;
  machine_profile_hash?: string;
}

export interface CacheStats {
  total_entries: number;
  hits: number;
  misses: number;
  hit_rate: number;
  by_status: Record<CacheStatus, number>;
  by_property: Record<string, number>;
  oldest_entry: string | null;
  newest_entry: string | null;
  size_bytes: number;
}

export interface CacheConfig {
  max_entries: number;
  ttl_hours: number;
  persist_path: string | null;
  auto_persist: boolean;
}

export interface MachineProfileHash {
  profile_id: string;
  hash: string;
  envelope_hash: string;
  tool_library_hash: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CacheConfig = {
  max_entries: 10000,
  ttl_hours: 168, // 7 days
  persist_path: null,
  auto_persist: true,
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheProofCacheEngine {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig = { ...DEFAULT_CONFIG };
  private stats = { hits: 0, misses: 0 };
  private machineProfileHash: string | null = null;
  private invalidationVersion = 0;

  constructor() {
    // Initialize empty cache
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  setConfig(config: Partial<CacheConfig>): CacheConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Cache Operations
  // --------------------------------------------------------------------------

  get(
    modalStateHash: string,
    constraintHash: string,
    propertyType: string
  ): CacheEntry | null {
    const key = this.computeKey(modalStateHash, constraintHash, propertyType);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    const entryTime = new Date(entry.timestamp).getTime();
    const now = Date.now();
    const ttlMs = this.config.ttl_hours * 60 * 60 * 1000;

    if (now - entryTime > ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Check machine profile hash
    if (this.machineProfileHash && entry.machine_profile_hash !== this.machineProfileHash) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry;
  }

  set(
    modalStateHash: string,
    constraintHash: string,
    propertyType: string,
    status: CacheStatus,
    timeMs: number,
    blockIndex?: number
  ): CacheEntry {
    const key = this.computeKey(modalStateHash, constraintHash, propertyType);

    // Enforce max entries (LRU eviction)
    if (this.cache.size >= this.config.max_entries) {
      this.evictOldest();
    }

    const entry: CacheEntry = {
      key,
      modal_state_hash: modalStateHash,
      constraint_hash: constraintHash,
      property_type: propertyType,
      status,
      time_ms: timeMs,
      timestamp: new Date().toISOString(),
      block_index: blockIndex,
      machine_profile_hash: this.machineProfileHash || undefined,
    };

    this.cache.set(key, entry);

    if (this.config.auto_persist && this.config.persist_path) {
      this.persistAsync();
    }

    return entry;
  }

  has(
    modalStateHash: string,
    constraintHash: string,
    propertyType: string
  ): boolean {
    return this.get(modalStateHash, constraintHash, propertyType) !== null;
  }

  delete(
    modalStateHash: string,
    constraintHash: string,
    propertyType: string
  ): boolean {
    const key = this.computeKey(modalStateHash, constraintHash, propertyType);
    return this.cache.delete(key);
  }

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  getMultiple(
    queries: Array<{ modalStateHash: string; constraintHash: string; propertyType: string }>
  ): Map<string, CacheEntry | null> {
    const results = new Map<string, CacheEntry | null>();

    for (const query of queries) {
      const key = this.computeKey(query.modalStateHash, query.constraintHash, query.propertyType);
      results.set(key, this.get(query.modalStateHash, query.constraintHash, query.propertyType));
    }

    return results;
  }

  setMultiple(entries: CacheEntry[]): void {
    for (const entry of entries) {
      this.set(
        entry.modal_state_hash,
        entry.constraint_hash,
        entry.property_type,
        entry.status,
        entry.time_ms,
        entry.block_index
      );
    }
  }

  // --------------------------------------------------------------------------
  // Invalidation
  // --------------------------------------------------------------------------

  setMachineProfile(profileHash: string): void {
    if (this.machineProfileHash !== profileHash) {
      this.machineProfileHash = profileHash;
      this.invalidationVersion++;
      // Entries with different profile hash will be invalidated on access
    }
  }

  invalidateByProperty(propertyType: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.property_type === propertyType) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateByMachineProfile(): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.machine_profile_hash !== this.machineProfileHash) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateOlderThan(hours: number): number {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (new Date(entry.timestamp).getTime() < cutoff) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  invalidateAll(): void {
    this.cache.clear();
    this.invalidationVersion++;
    this.stats = { hits: 0, misses: 0 };
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const byStatus: Record<CacheStatus, number> = { sat: 0, unsat: 0, unknown: 0, timeout: 0 };
    const byProperty: Record<string, number> = {};

    let oldest: string | null = null;
    let newest: string | null = null;

    for (const entry of entries) {
      byStatus[entry.status]++;
      byProperty[entry.property_type] = (byProperty[entry.property_type] || 0) + 1;

      if (!oldest || entry.timestamp < oldest) oldest = entry.timestamp;
      if (!newest || entry.timestamp > newest) newest = entry.timestamp;
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    // Estimate size (rough approximation)
    const sizeBytes = entries.length * 200; // ~200 bytes per entry

    return {
      total_entries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hit_rate: Math.round(hitRate * 1000) / 10, // One decimal place percentage
      by_status: byStatus,
      by_property: byProperty,
      oldest_entry: oldest,
      newest_entry: newest,
      size_bytes: sizeBytes,
    };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  persist(filepath?: string): boolean {
    const targetPath = filepath || this.config.persist_path;
    if (!targetPath) return false;

    try {
      const data = {
        version: 1,
        invalidation_version: this.invalidationVersion,
        machine_profile_hash: this.machineProfileHash,
        entries: Array.from(this.cache.values()),
        stats: this.stats,
        saved_at: new Date().toISOString(),
      };

      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  private persistAsync(): void {
    setTimeout(() => this.persist(), 100);
  }

  load(filepath?: string): boolean {
    const targetPath = filepath || this.config.persist_path;
    if (!targetPath) return false;

    try {
      if (!fs.existsSync(targetPath)) return false;

      const content = fs.readFileSync(targetPath, "utf-8");
      const data = JSON.parse(content);

      if (data.version !== 1) return false;

      this.cache.clear();
      for (const entry of data.entries) {
        this.cache.set(entry.key, entry);
      }

      this.invalidationVersion = data.invalidation_version || 0;
      this.machineProfileHash = data.machine_profile_hash || null;
      this.stats = data.stats || { hits: 0, misses: 0 };

      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private computeKey(
    modalStateHash: string,
    constraintHash: string,
    propertyType: string
  ): string {
    return `${modalStateHash}:${constraintHash}:${propertyType}`;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const time = new Date(entry.timestamp).getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // --------------------------------------------------------------------------
  // Hash Utilities
  // --------------------------------------------------------------------------

  computeModalStateHash(state: {
    motion_mode: string | null;
    positioning_mode: string;
    units: string;
    feed_mode: string;
    spindle_mode: string;
    tool_number: number;
  }): string {
    const data = `${state.motion_mode}:${state.positioning_mode}:${state.units}:${state.feed_mode}:${state.spindle_mode}:${state.tool_number}`;
    return this.simpleHash(data);
  }

  computeConstraintHash(constraint: {
    type: string;
    variables: string[];
    operator: string;
    constant: number;
  }): string {
    const data = `${constraint.type}:${constraint.variables.join(",")}:${constraint.operator}:${constraint.constant}`;
    return this.simpleHash(data);
  }

  computeMachineProfileHash(profile: {
    machine_id: string;
    x_min: number;
    x_max: number;
    z_min: number;
    z_max: number;
    f_max: number;
    s_max: number;
  }): string {
    const data = `${profile.machine_id}:${profile.x_min}:${profile.x_max}:${profile.z_min}:${profile.z_max}:${profile.f_max}:${profile.s_max}`;
    return this.simpleHash(data);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  // --------------------------------------------------------------------------
  // Query Helpers
  // --------------------------------------------------------------------------

  getEntriesByProperty(propertyType: string): CacheEntry[] {
    return Array.from(this.cache.values()).filter((e) => e.property_type === propertyType);
  }

  getEntriesByStatus(status: CacheStatus): CacheEntry[] {
    return Array.from(this.cache.values()).filter((e) => e.status === status);
  }

  getRecentEntries(limit: number): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // --------------------------------------------------------------------------
  // Export/Import
  // --------------------------------------------------------------------------

  exportToJSONL(): string {
    const lines: string[] = [];
    for (const entry of this.cache.values()) {
      lines.push(JSON.stringify(entry));
    }
    return lines.join("\n");
  }

  importFromJSONL(content: string): number {
    const lines = content.split("\n").filter((l) => l.trim());
    let imported = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as CacheEntry;
        this.cache.set(entry.key, entry);
        imported++;
      } catch {
        // Skip invalid lines
      }
    }

    return imported;
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.invalidateAll();
  }
}

export const latheProofCacheEngine = new LatheProofCacheEngine();
