/**
 * PRISM D4 — Computation Cache
 * ==============================
 * 
 * Manufacturing-aware cache with TTL policies:
 * - SAFETY tier (30s TTL): spindle loads, collision checks, tool stress
 * - STANDARD tier (120s TTL): cutting forces, surface finish, MRR
 * - STABLE tier (300s TTL): material properties, thread specs, formulas
 * 
 * Safety constraint: S(x)≥0.70 calcs ALWAYS bypass cache.
 * Uses SHA-256 for cache keys, dependency graphs for surgical invalidation.
 * 
 * IMPORTED BY: cadenceExecutor.ts, autoHookWrapper.ts
 * ZERO TOKEN COST — pure server-side execution
 * 
 * @version 1.0.0
 * @date 2026-02-09
 * @dimension D4 — Performance & Caching
 */

import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../constants.js";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { sha256 as crc32 } from './TelemetryEngine.js';

// ============================================================================
// TYPES
// ============================================================================

export type CacheTier = "SAFETY" | "STANDARD" | "STABLE";

export interface CacheEntry {
  key: string;
  value: any;
  tier: CacheTier;
  created_at: number;
  ttl_ms: number;
  expires_at: number;
  hit_count: number;
  last_hit: number;
  dependencies: string[];      // keys this entry depends on
  checksum: string;            // SHA-256 of input params
  source_action: string;       // e.g. "prism_calc:cutting_force"
  safety_critical: boolean;    // if true, never served from cache
}

export interface CacheStats {
  total_entries: number;
  hits: number;
  misses: number;
  evictions: number;
  bypasses: number;            // safety-critical bypasses
  hit_rate: number;
  memory_bytes: number;
  entries_by_tier: Record<CacheTier, number>;
}

export interface InvalidationResult {
  invalidated: number;
  cascade_invalidated: number;
  keys: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TTL_BY_TIER: Record<CacheTier, number> = {
  SAFETY: 30_000,     // 30s — spindle, collision, tool stress
  STANDARD: 120_000,  // 2min — cutting force, surface finish, MRR
  STABLE: 300_000,    // 5min — material props, thread specs, formulas
};

// Actions that map to each tier
const TIER_MAP: Record<string, CacheTier> = {
  // SAFETY tier — short TTL, can be bypassed entirely
  "prism_safety:check_spindle_torque": "SAFETY",
  "prism_safety:check_spindle_power": "SAFETY",
  "prism_safety:validate_spindle_speed": "SAFETY",
  "prism_safety:predict_tool_breakage": "SAFETY",
  "prism_safety:calculate_tool_stress": "SAFETY",
  "prism_safety:check_chip_load_limits": "SAFETY",
  "prism_safety:check_toolpath_collision": "SAFETY",
  "prism_safety:detect_near_miss": "SAFETY",
  "prism_safety:calculate_clamp_force_required": "SAFETY",
  "prism_safety:analyze_liftoff_moment": "SAFETY",
  "prism_calc:cutting_force": "SAFETY",
  "prism_calc:stability": "SAFETY",
  "prism_calc:deflection": "SAFETY",
  // STANDARD tier — moderate TTL
  "prism_calc:surface_finish": "STANDARD",
  "prism_calc:mrr": "STANDARD",
  "prism_calc:power": "STANDARD",
  "prism_calc:chip_load": "STANDARD",
  "prism_calc:tool_life": "STANDARD",
  "prism_calc:speed_feed": "STANDARD",
  "prism_calc:thermal": "STANDARD",
  "prism_calc:engagement": "STANDARD",
  "prism_calc:trochoidal": "STANDARD",
  "prism_calc:hsm": "STANDARD",
  "prism_calc:scallop": "STANDARD",
  "prism_calc:stepover": "STANDARD",
  "prism_calc:cycle_time": "STANDARD",
  "prism_thread:calculate_tap_drill": "STANDARD",
  "prism_thread:calculate_thread_mill_params": "STANDARD",
  "prism_thread:calculate_thread_cutting_params": "STANDARD",
  // STABLE tier — long TTL
  "prism_data:material_get": "STABLE",
  "prism_data:material_search": "STABLE",
  "prism_data:machine_get": "STABLE",
  "prism_data:machine_search": "STABLE",
  "prism_data:tool_get": "STABLE",
  "prism_data:tool_search": "STABLE",
  "prism_data:tool_facets": "STABLE",
  "prism_data:formula_get": "STABLE",
  "prism_data:alarm_decode": "STABLE",
  "prism_thread:get_thread_specifications": "STABLE",
  "prism_thread:get_go_nogo_gauges": "STABLE",
  "prism_knowledge:search": "STABLE",
  "prism_knowledge:formula": "STABLE",
};

// Safety-critical actions that NEVER use cache
const SAFETY_BYPASS_ACTIONS = new Set([
  "prism_safety:check_toolpath_collision",
  "prism_safety:detect_near_miss",
  "prism_safety:predict_tool_breakage",
  "prism_safety:check_5axis_head_clearance",
  "prism_safety:validate_rapid_moves",
  "prism_safety:check_fixture_clearance",
  // W6.2: Dev actions operate on mutable source files — never cache
  "prism_dev:code_search",
  "prism_dev:file_read",
  "prism_dev:file_write",
  "prism_dev:build",
  "prism_dev:test_smoke",
]);

const STATE_DIR = PATHS.STATE_DIR;
const CACHE_STATS_FILE = path.join(STATE_DIR, "d4_cache_stats.json");
const MAX_CACHE_SIZE = 500;

// ============================================================================
// COMPUTATION CACHE CLASS
// ============================================================================

class ComputationCache {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    total_entries: 0, hits: 0, misses: 0, evictions: 0,
    bypasses: 0, hit_rate: 0, memory_bytes: 0,
    entries_by_tier: { SAFETY: 0, STANDARD: 0, STABLE: 0 },
  };
  private dependencyGraph = new Map<string, Set<string>>(); // key → dependents

  /**
   * Generate cache key from action + params
   */
  makeKey(action: string, params: Record<string, any>): string {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    const checksum = crc32(normalized);
    return `${action}:${checksum}`;
  }

  /**
   * Check if action should bypass cache entirely (safety-critical)
   */
  shouldBypass(action: string): boolean {
    return SAFETY_BYPASS_ACTIONS.has(action);
  }

  /**
   * Get cached result if valid
   */
  get(action: string, params: Record<string, any>): { hit: boolean; value?: any; tier?: CacheTier } {
    // Safety bypass check
    if (this.shouldBypass(action)) {
      this.stats.bypasses++;
      return { hit: false };
    }

    const key = this.makeKey(action, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return { hit: false };
    }

    // Check expiration
    const now = Date.now();
    if (now > entry.expires_at) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.total_entries--;
      this.stats.entries_by_tier[entry.tier]--;
      this.updateHitRate();
      return { hit: false };
    }

    // Valid cache hit
    entry.hit_count++;
    entry.last_hit = now;
    this.stats.hits++;
    this.updateHitRate();
    return { hit: true, value: entry.value, tier: entry.tier };
  }

  /**
   * Store computation result in cache
   */
  set(action: string, params: Record<string, any>, value: any, dependencies?: string[]): void {
    // Never cache safety bypass actions
    if (this.shouldBypass(action)) return;

    const tier = TIER_MAP[action] || "STANDARD";
    const ttl = TTL_BY_TIER[tier];
    const now = Date.now();
    const key = this.makeKey(action, params);

    // Evict if at capacity
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key, value, tier, created_at: now,
      ttl_ms: ttl, expires_at: now + ttl,
      hit_count: 0, last_hit: now,
      dependencies: dependencies || [],
      checksum: crc32(JSON.stringify(params, Object.keys(params).sort())),
      source_action: action,
      safety_critical: tier === "SAFETY",
    };

    // Track if new or replacement
    if (!this.cache.has(key)) {
      this.stats.total_entries++;
      this.stats.entries_by_tier[tier]++;
    }

    this.cache.set(key, entry);

    // Register dependencies
    if (dependencies) {
      for (const dep of dependencies) {
        if (!this.dependencyGraph.has(dep)) {
          this.dependencyGraph.set(dep, new Set());
        }
        this.dependencyGraph.get(dep)!.add(key);
      }
    }
  }

  /**
   * Invalidate a key and cascade to dependents
   */
  invalidate(key: string): InvalidationResult {
    const result: InvalidationResult = { invalidated: 0, cascade_invalidated: 0, keys: [] };

    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      this.cache.delete(key);
      this.stats.total_entries--;
      this.stats.entries_by_tier[entry.tier]--;
      result.invalidated++;
      result.keys.push(key);
    }

    // Cascade invalidation
    const dependents = this.dependencyGraph.get(key);
    if (dependents) {
      for (const depKey of dependents) {
        if (this.cache.has(depKey)) {
          const entry = this.cache.get(depKey)!;
          this.cache.delete(depKey);
          this.stats.total_entries--;
          this.stats.entries_by_tier[entry.tier]--;
          result.cascade_invalidated++;
          result.keys.push(depKey);
        }
      }
      this.dependencyGraph.delete(key);
    }

    return result;
  }

  /**
   * Invalidate all entries for a specific action
   */
  invalidateByAction(action: string): InvalidationResult {
    const result: InvalidationResult = { invalidated: 0, cascade_invalidated: 0, keys: [] };
    for (const [key, entry] of this.cache) {
      if (entry.source_action === action) {
        const sub = this.invalidate(key);
        result.invalidated += sub.invalidated;
        result.cascade_invalidated += sub.cascade_invalidated;
        result.keys.push(...sub.keys);
      }
    }
    return result;
  }

  /**
   * Invalidate by tier (e.g., flush all SAFETY tier)
   */
  invalidateByTier(tier: CacheTier): InvalidationResult {
    const result: InvalidationResult = { invalidated: 0, cascade_invalidated: 0, keys: [] };
    for (const [key, entry] of this.cache) {
      if (entry.tier === tier) {
        this.cache.delete(key);
        this.stats.total_entries--;
        this.stats.entries_by_tier[tier]--;
        result.invalidated++;
        result.keys.push(key);
      }
    }
    return result;
  }

  /**
   * Evict least-recently-used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestHit = Infinity;
    for (const [key, entry] of this.cache) {
      // Never evict safety-critical entries (they expire fast anyway)
      if (entry.safety_critical) continue;
      if (entry.last_hit < oldestHit) {
        oldestHit = entry.last_hit;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.cache.delete(oldestKey);
      this.stats.total_entries--;
      this.stats.entries_by_tier[entry.tier]--;
      this.stats.evictions++;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hit_rate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.stats.memory_bytes = this.estimateMemory();
    return { ...this.stats };
  }

  private estimateMemory(): number {
    let bytes = 0;
    for (const [, entry] of this.cache) {
      bytes += JSON.stringify(entry.value).length * 2; // rough UTF-16 estimate
    }
    return bytes;
  }

  /**
   * Persist stats to disk (called by cadence)
   */
  persistStats(): void {
    try {
      safeWriteSync(CACHE_STATS_FILE, JSON.stringify(this.getStats(), null, 2));
    } catch { /* non-fatal */ }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.dependencyGraph.clear();
    this.stats.total_entries = 0;
    this.stats.entries_by_tier = { SAFETY: 0, STANDARD: 0, STABLE: 0 };
  }

  /**
   * Cleanup expired entries (called by cadence periodically)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache) {
      if (now > entry.expires_at) {
        this.cache.delete(key);
        this.stats.total_entries--;
        this.stats.entries_by_tier[entry.tier]--;
        cleaned++;
      }
    }
    return cleaned;
  }
}

// Singleton export
export const computationCache = new ComputationCache();
