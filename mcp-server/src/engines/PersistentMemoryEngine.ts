/**
 * PersistentMemoryEngine — MXU-MS3
 *
 * Cross-session learning fabric:
 *   1. Memory storage — typed entries with semantic tags
 *   2. Relevance retrieval — find memories by tag, domain, recency
 *   3. Freshness/decay scoring — old memories decay, recent ones prioritize
 *   4. Learning patterns — track what worked vs failed
 *   5. Operator preferences — persistent user-specific settings
 *   6. Calibration data — S/F corrections, cycle time adjustments
 *
 * Memories are lightweight JSON objects stored in a flat file,
 * indexed by tags for O(n) retrieval (good enough for <10K entries).
 * Future: vector indexing for semantic search.
 *
 * Sources:
 *   - MXU-MS3: Persistent Memory Fabric
 *   - Agentic Patterns gap: semantic memory with vector indexing
 */

import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type MemoryType =
  | "learning"         // what worked or failed
  | "preference"       // operator/user preferences
  | "calibration"      // physics calibration data
  | "pattern"          // discovered patterns
  | "decision"         // key decisions and rationale
  | "context";         // session context snapshots

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  domain: string;
  tags: string[];
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  last_accessed: string;
  access_count: number;
  relevance_score: number;
  source_session?: string;
}

export interface MemoryQuery {
  tags?: string[];
  domain?: string;
  type?: MemoryType;
  min_relevance?: number;
  max_age_hours?: number;
  limit?: number;
}

export interface MemorySearchResult {
  entries: MemoryEntry[];
  total_matches: number;
  query_time_ms: number;
}

export interface LearningRecord {
  action: string;
  outcome: "success" | "failure" | "partial";
  context: Record<string, unknown>;
  lesson: string;
  confidence: number;
}

export interface PreferenceRecord {
  key: string;
  value: unknown;
  domain: string;
  set_by: string;
  reason?: string;
}

export interface CalibrationRecord {
  parameter: string;
  predicted: number;
  actual: number;
  correction_factor: number;
  material?: string;
  machine?: string;
  sample_count: number;
}

export interface MemoryStats {
  total_entries: number;
  by_type: Record<MemoryType, number>;
  by_domain: Record<string, number>;
  avg_relevance: number;
  oldest_entry: string | null;
  newest_entry: string | null;
  stale_count: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MEMORY_FILE = path.join(PATHS.MCP_SERVER, "data", "state", "PERSISTENT_MEMORY.json");
const DECAY_RATE = 0.995;        // Per-hour decay multiplier
const MIN_RELEVANCE = 0.1;       // Below this, entry is stale
const STALE_HOURS = 720;         // 30 days
const MAX_ENTRIES = 5000;

// ============================================================================
// ENGINE
// ============================================================================

export class PersistentMemoryEngine {

  private entries: MemoryEntry[] = [];
  private loaded = false;

  // ── Storage ────────────────────────────────────────────────

  /**
   * Load memories from disk.
   */
  load(): void {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
        this.entries = Array.isArray(data) ? data : data.entries || [];
      }
    } catch {
      this.entries = [];
    }
    this.loaded = true;
  }

  /**
   * Save memories to disk.
   */
  save(): void {
    try {
      fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.entries, null, 2));
    } catch {
      // silent — disk write may fail in test context
    }
  }

  private ensureLoaded(): void {
    if (!this.loaded) this.load();
  }

  // ── CRUD ───────────────────────────────────────────────────

  /**
   * Store a new memory entry.
   */
  store(
    type: MemoryType,
    domain: string,
    tags: string[],
    content: string,
    metadata: Record<string, unknown> = {},
    sessionId?: string,
  ): MemoryEntry {
    this.ensureLoaded();

    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      domain,
      tags: tags.map(t => t.toLowerCase()),
      content,
      metadata,
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      access_count: 0,
      relevance_score: 1.0,
      source_session: sessionId,
    };

    this.entries.push(entry);

    // Enforce max entries — remove lowest relevance
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.sort((a, b) => b.relevance_score - a.relevance_score);
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }

    return entry;
  }

  /**
   * Retrieve a memory by ID.
   */
  get(id: string): MemoryEntry | undefined {
    this.ensureLoaded();
    const entry = this.entries.find(e => e.id === id);
    if (entry) {
      entry.last_accessed = new Date().toISOString();
      entry.access_count++;
    }
    return entry;
  }

  /**
   * Delete a memory by ID.
   */
  delete(id: string): boolean {
    this.ensureLoaded();
    const idx = this.entries.findIndex(e => e.id === id);
    if (idx >= 0) {
      this.entries.splice(idx, 1);
      return true;
    }
    return false;
  }

  // ── Search ─────────────────────────────────────────────────

  /**
   * Search memories by query criteria.
   */
  search(query: MemoryQuery): MemorySearchResult {
    this.ensureLoaded();
    const start = Date.now();

    let results = [...this.entries];

    // Filter by type
    if (query.type) {
      results = results.filter(e => e.type === query.type);
    }

    // Filter by domain
    if (query.domain) {
      results = results.filter(e => e.domain === query.domain);
    }

    // Filter by tags (any match)
    if (query.tags && query.tags.length > 0) {
      const queryTags = query.tags.map(t => t.toLowerCase());
      results = results.filter(e =>
        queryTags.some(qt => e.tags.includes(qt))
      );
    }

    // Filter by minimum relevance
    if (query.min_relevance !== undefined) {
      results = results.filter(e => e.relevance_score >= query.min_relevance!);
    }

    // Filter by max age
    if (query.max_age_hours) {
      const cutoff = Date.now() - query.max_age_hours * 3600 * 1000;
      results = results.filter(e => new Date(e.created_at).getTime() >= cutoff);
    }

    const totalMatches = results.length;

    // Sort by relevance × recency
    results.sort((a, b) => {
      const aScore = a.relevance_score * (1 + a.access_count * 0.1);
      const bScore = b.relevance_score * (1 + b.access_count * 0.1);
      return bScore - aScore;
    });

    // Limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    // Mark as accessed
    for (const r of results) {
      r.last_accessed = new Date().toISOString();
      r.access_count++;
    }

    return {
      entries: results,
      total_matches: totalMatches,
      query_time_ms: Date.now() - start,
    };
  }

  // ── Decay ──────────────────────────────────────────────────

  /**
   * Apply time-based decay to all memory relevance scores.
   * Called periodically (e.g., at session start).
   */
  applyDecay(): { decayed: number; pruned: number } {
    this.ensureLoaded();
    const now = Date.now();
    let decayed = 0;
    let pruned = 0;

    for (const entry of this.entries) {
      const lastAccess = new Date(entry.last_accessed).getTime();
      const hoursSince = (now - lastAccess) / (3600 * 1000);
      const decayFactor = Math.pow(DECAY_RATE, hoursSince);
      const newScore = entry.relevance_score * decayFactor;

      if (newScore !== entry.relevance_score) decayed++;
      entry.relevance_score = parseFloat(Math.max(newScore, 0).toFixed(4));
    }

    // Prune entries below minimum relevance
    const before = this.entries.length;
    this.entries = this.entries.filter(e => e.relevance_score >= MIN_RELEVANCE);
    pruned = before - this.entries.length;

    return { decayed, pruned };
  }

  // ── Specialized Storage ────────────────────────────────────

  /**
   * Record a learning (what worked or failed).
   */
  recordLearning(record: LearningRecord, sessionId?: string): MemoryEntry {
    return this.store(
      "learning",
      "general",
      [record.action, record.outcome, ...Object.keys(record.context).slice(0, 3)],
      record.lesson,
      { outcome: record.outcome, confidence: record.confidence, context: record.context },
      sessionId,
    );
  }

  /**
   * Set a user preference.
   */
  setPreference(pref: PreferenceRecord): MemoryEntry {
    // Remove existing preference with same key
    this.ensureLoaded();
    this.entries = this.entries.filter(e =>
      !(e.type === "preference" && e.metadata.key === pref.key)
    );

    return this.store(
      "preference",
      pref.domain,
      [pref.key, pref.domain],
      `${pref.key} = ${JSON.stringify(pref.value)}`,
      { key: pref.key, value: pref.value, set_by: pref.set_by, reason: pref.reason },
    );
  }

  /**
   * Get a user preference.
   */
  getPreference(key: string): unknown | undefined {
    this.ensureLoaded();
    const entry = this.entries.find(e =>
      e.type === "preference" && e.metadata.key === key
    );
    return entry?.metadata.value;
  }

  /**
   * Record a calibration data point.
   */
  recordCalibration(cal: CalibrationRecord): MemoryEntry {
    const tags = ["calibration", cal.parameter];
    if (cal.material) tags.push(cal.material);
    if (cal.machine) tags.push(cal.machine);

    return this.store(
      "calibration",
      "physics",
      tags,
      `${cal.parameter}: predicted=${cal.predicted}, actual=${cal.actual}, correction=${cal.correction_factor}`,
      cal as unknown as Record<string, unknown>,
    );
  }

  // ── Stats ──────────────────────────────────────────────────

  /**
   * Get memory statistics.
   */
  getStats(): MemoryStats {
    this.ensureLoaded();

    const byType: Record<MemoryType, number> = {
      learning: 0, preference: 0, calibration: 0,
      pattern: 0, decision: 0, context: 0,
    };
    const byDomain: Record<string, number> = {};
    let totalRelevance = 0;
    let stale = 0;
    const now = Date.now();

    for (const e of this.entries) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byDomain[e.domain] = (byDomain[e.domain] || 0) + 1;
      totalRelevance += e.relevance_score;
      const hours = (now - new Date(e.last_accessed).getTime()) / (3600 * 1000);
      if (hours > STALE_HOURS) stale++;
    }

    const sorted = [...this.entries].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return {
      total_entries: this.entries.length,
      by_type: byType,
      by_domain: byDomain,
      avg_relevance: this.entries.length > 0
        ? parseFloat((totalRelevance / this.entries.length).toFixed(3))
        : 0,
      oldest_entry: sorted[0]?.created_at || null,
      newest_entry: sorted.at(-1)?.created_at || null,
      stale_count: stale,
    };
  }

  // ── Utility ────────────────────────────────────────────────

  /**
   * Get all entries (for testing/export).
   */
  getAll(): MemoryEntry[] {
    this.ensureLoaded();
    return [...this.entries];
  }

  /**
   * Clear all entries (for testing).
   */
  clear(): void {
    this.entries = [];
    this.loaded = true;
  }

  /**
   * Get entry count.
   */
  count(): number {
    this.ensureLoaded();
    return this.entries.length;
  }
}

export const persistentMemoryEngine = new PersistentMemoryEngine();
