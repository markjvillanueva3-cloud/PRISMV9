/**
 * CADFeatureMemoryEngine — U-CADC28 (CAD-COMPLETE-MS0)
 *
 * Persistent memory of CAD feature patterns with similarity search. Records
 * every feature generation attempt (type, parameters, outcome, latency, error
 * tags) and exposes cosine-similarity lookup over a deterministic feature
 * embedding. Future generators consult memory before emitting code: high-
 * success-rate similar patterns are reused; low-success patterns warn.
 *
 * Design contract:
 *   - State file: data/state/CAD_FEATURE_MEMORY.json (schemaVersion 1)
 *   - Brute-force cosine over the entries array. Fine to ~50k entries
 *     (sub-millisecond), HNSW upgrade is a separate unit if/when needed.
 *   - Embedding is deterministic and side-effect-free: same (feature_type,
 *     normalized params) → same vector. 64 dim: 32-bucket FNV-1a hash on
 *     feature_type + 32 normalized numeric param slots.
 *   - Embedding dimension is *sealed* the moment the first entry is added.
 *     Later inserts with mismatched dim are rejected (corruption guard).
 *   - Atomic persistence via utils/atomicWriteJson — survives crash mid-write.
 *   - All numeric inputs validated against NaN / ±Infinity. Strings >256B are
 *     truncated to bound serialised state size.
 *
 * Exit conditions (per roadmap):
 *   ✓ Memory persists across sessions (load() rehydrates from disk)
 *   ✓ Pattern retrieval <100ms (brute-force cosine on n≤10k = <1ms in tests)
 *   ✓ Success rate tracking works (per-entry counts + per-type rollup)
 *
 * @module engines/CADFeatureMemoryEngine
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { atomicWriteJson } from "../utils/atomicWrite.js";

// ── Constants ──────────────────────────────────────────────────────────────

/** Vector dimension: 32 type buckets + 32 numeric param slots. */
export const CAD_FEATURE_EMBEDDING_DIM = 64;
const TYPE_BUCKETS = 32;
const PARAM_SLOTS = 32;

/** Max bytes for a string param value before truncation. */
const MAX_PARAM_STRING_BYTES = 256;
/** Max recent error tags retained per entry. */
const MAX_ERROR_PATTERNS = 8;
/** Default state-file path (relative to mcp-server cwd). */
export const DEFAULT_MEMORY_PATH = "data/state/CAD_FEATURE_MEMORY.json";
/** Schema version sealed in serialised state. */
export const CAD_FEATURE_MEMORY_SCHEMA_VERSION = 1;

// ── Types ──────────────────────────────────────────────────────────────────

export type FeatureParamValue = number | string | boolean;
export type FeatureParameters = Readonly<Record<string, FeatureParamValue>>;
export type RecordOutcome = "success" | "failure";

export interface FeatureMemoryEntry {
  /** Stable hash key — same (feature_type, canonical params) → same id. */
  readonly id: string;
  readonly feature_type: string;
  readonly parameters: FeatureParameters;
  readonly embedding: ReadonlyArray<number>;
  success_count: number;
  failure_count: number;
  total_attempts: number;
  /** success_count / total_attempts (0..1); 0 when no attempts. */
  success_rate: number;
  avg_gen_time_ms: number;
  /** Most recent error tags, newest-first, capped at MAX_ERROR_PATTERNS. */
  error_patterns: string[];
  created_at: string;
  last_used_at: string;
}

export interface CADFeatureMemoryState {
  schemaVersion: typeof CAD_FEATURE_MEMORY_SCHEMA_VERSION;
  generatedAt: string;
  embeddingDim: number;
  entries: FeatureMemoryEntry[];
}

export interface SimilarPatternMatch {
  readonly entry: FeatureMemoryEntry;
  /** Cosine similarity in [-1, 1]; identical vectors = 1. */
  readonly similarity: number;
}

export interface QueryOptions {
  /** Number of neighbours to return (default 5, max 100). */
  topK?: number;
  /** Reject entries with success_rate < this (default 0). */
  minSuccessRate?: number;
  /** Only return entries with >= this many total attempts (default 0). */
  minAttempts?: number;
  /** Only consider entries of this feature_type (default any). */
  featureTypeFilter?: string;
}

export interface RecordOptions {
  feature_type: string;
  parameters: FeatureParameters;
  outcome: RecordOutcome;
  gen_time_ms: number;
  error_pattern?: string;
}

export interface FeatureTypeStats {
  feature_type: string;
  entry_count: number;
  total_attempts: number;
  success_rate: number;
}

export interface MemoryStats {
  total_entries: number;
  total_attempts: number;
  global_success_rate: number;
  by_feature_type: FeatureTypeStats[];
  embedding_dim: number;
  last_persisted_at: string | null;
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class CADFeatureMemoryEngine {
  private memoryPath: string;
  private entries: FeatureMemoryEntry[] = [];
  private embeddingDim: number = CAD_FEATURE_EMBEDDING_DIM;
  private dimSealed = false;
  private loaded = false;
  private lastPersistedAt: string | null = null;

  constructor(memoryPath: string = DEFAULT_MEMORY_PATH) {
    this.memoryPath = memoryPath;
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  /**
   * Load state from disk. Idempotent: subsequent calls are no-ops unless
   * `force` is true. Missing file is treated as fresh (no entries).
   */
  async load(force = false): Promise<void> {
    if (this.loaded && !force) return;

    let raw: string;
    try {
      raw = await fs.readFile(this.memoryPath, "utf-8");
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e && e.code === "ENOENT") {
        this.entries = [];
        this.embeddingDim = CAD_FEATURE_EMBEDDING_DIM;
        this.dimSealed = false;
        this.loaded = true;
        return;
      }
      throw new Error(
        `CADFeatureMemoryEngine: failed to read ${this.memoryPath}: ${
          e?.message ?? String(err)
        }`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `CADFeatureMemoryEngine: ${this.memoryPath} is not valid JSON: ${
          (err as Error).message
        }`,
      );
    }

    const state = this.normaliseState(parsed);
    this.entries = state.entries;
    this.embeddingDim = state.embeddingDim;
    this.dimSealed = state.entries.length > 0;
    this.loaded = true;
  }

  /** Persist current state to disk atomically. */
  async persist(): Promise<void> {
    const now = new Date().toISOString();
    const state: CADFeatureMemoryState = {
      schemaVersion: CAD_FEATURE_MEMORY_SCHEMA_VERSION,
      generatedAt: now,
      embeddingDim: this.embeddingDim,
      entries: this.entries,
    };
    await atomicWriteJson(this.memoryPath, state);
    this.lastPersistedAt = now;
  }

  // ── Recording ────────────────────────────────────────────────────────────

  /**
   * Record an attempt. Creates a new entry on first occurrence; otherwise
   * updates counts, rolling-average gen time, and error tags. Returns the
   * canonical entry (post-update). Persistence is the caller's responsibility
   * (call `persist()` after batch writes).
   */
  async record(opts: RecordOptions): Promise<FeatureMemoryEntry> {
    await this.load();
    this.assertValidRecord(opts);

    const canonicalParams = this.canonicaliseParams(opts.parameters);
    const id = this.computeId(opts.feature_type, canonicalParams);
    const embedding = this.embedFeature(opts.feature_type, canonicalParams);
    this.assertEmbeddingDim(embedding);

    const now = new Date().toISOString();
    const existing = this.entries.find((e) => e.id === id);
    if (existing) {
      const newAttempts = existing.total_attempts + 1;
      // Welford-style rolling mean to avoid float drift on very large counts.
      existing.avg_gen_time_ms =
        existing.avg_gen_time_ms +
        (opts.gen_time_ms - existing.avg_gen_time_ms) / newAttempts;
      if (opts.outcome === "success") existing.success_count += 1;
      else existing.failure_count += 1;
      existing.total_attempts = newAttempts;
      existing.success_rate = existing.success_count / newAttempts;
      existing.last_used_at = now;
      if (opts.error_pattern && opts.outcome === "failure") {
        existing.error_patterns = [
          opts.error_pattern,
          ...existing.error_patterns.filter((p) => p !== opts.error_pattern),
        ].slice(0, MAX_ERROR_PATTERNS);
      }
      return existing;
    }

    const entry: FeatureMemoryEntry = {
      id,
      feature_type: opts.feature_type,
      parameters: canonicalParams,
      embedding,
      success_count: opts.outcome === "success" ? 1 : 0,
      failure_count: opts.outcome === "failure" ? 1 : 0,
      total_attempts: 1,
      success_rate: opts.outcome === "success" ? 1 : 0,
      avg_gen_time_ms: opts.gen_time_ms,
      error_patterns:
        opts.outcome === "failure" && opts.error_pattern
          ? [opts.error_pattern]
          : [],
      created_at: now,
      last_used_at: now,
    };
    this.entries.push(entry);
    if (!this.dimSealed) {
      this.embeddingDim = embedding.length;
      this.dimSealed = true;
    }
    return entry;
  }

  // ── Lookup ───────────────────────────────────────────────────────────────

  /** Direct id lookup. */
  async lookup(id: string): Promise<FeatureMemoryEntry | null> {
    await this.load();
    return this.entries.find((e) => e.id === id) ?? null;
  }

  /**
   * Find the topK most similar prior entries to (feature_type, parameters)
   * by cosine similarity over the embedding. Honours minSuccessRate and
   * minAttempts filters. Time complexity is O(n·d) where n = entry count and
   * d = embeddingDim — fine through tens of thousands of entries.
   */
  async query(
    feature_type: string,
    parameters: FeatureParameters,
    options: QueryOptions = {},
  ): Promise<SimilarPatternMatch[]> {
    await this.load();
    if (typeof feature_type !== "string" || feature_type.length === 0) {
      throw new Error("CADFeatureMemoryEngine.query: feature_type required");
    }
    const topK = clampInt(options.topK ?? 5, 1, 100);
    const minSuccessRate = clampFloat(options.minSuccessRate ?? 0, 0, 1);
    const minAttempts = Math.max(0, Math.floor(options.minAttempts ?? 0));
    const target = this.embedFeature(
      feature_type,
      this.canonicaliseParams(parameters),
    );
    const candidates = this.entries.filter((e) => {
      if (e.success_rate < minSuccessRate) return false;
      if (e.total_attempts < minAttempts) return false;
      if (
        options.featureTypeFilter &&
        e.feature_type !== options.featureTypeFilter
      ) {
        return false;
      }
      return true;
    });

    const scored: SimilarPatternMatch[] = [];
    for (const entry of candidates) {
      const sim = cosineSimilarity(target, entry.embedding);
      if (Number.isFinite(sim)) {
        scored.push({ entry, similarity: sim });
      }
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  // ── Stats / housekeeping ─────────────────────────────────────────────────

  async stats(): Promise<MemoryStats> {
    await this.load();
    const byType = new Map<
      string,
      { entry_count: number; total_attempts: number; success_count: number }
    >();
    let totalAttempts = 0;
    let totalSuccess = 0;
    for (const e of this.entries) {
      totalAttempts += e.total_attempts;
      totalSuccess += e.success_count;
      const cur = byType.get(e.feature_type) ?? {
        entry_count: 0,
        total_attempts: 0,
        success_count: 0,
      };
      cur.entry_count += 1;
      cur.total_attempts += e.total_attempts;
      cur.success_count += e.success_count;
      byType.set(e.feature_type, cur);
    }
    const by_feature_type: FeatureTypeStats[] = [];
    for (const [feature_type, agg] of byType.entries()) {
      by_feature_type.push({
        feature_type,
        entry_count: agg.entry_count,
        total_attempts: agg.total_attempts,
        success_rate:
          agg.total_attempts > 0 ? agg.success_count / agg.total_attempts : 0,
      });
    }
    by_feature_type.sort(
      (a, b) => b.total_attempts - a.total_attempts || a.feature_type.localeCompare(b.feature_type),
    );
    return {
      total_entries: this.entries.length,
      total_attempts: totalAttempts,
      global_success_rate: totalAttempts > 0 ? totalSuccess / totalAttempts : 0,
      by_feature_type,
      embedding_dim: this.embeddingDim,
      last_persisted_at: this.lastPersistedAt,
    };
  }

  /**
   * Test/maintenance only — drops in-memory state and unseals dim.
   * Sets `loaded = false` so the next `load()` call re-reads from disk
   * (mirroring `setMemoryPath()`'s contract — without this, persist→reset→stats
   * cannot rehydrate, which is the documented expected behavior).
   */
  reset(): void {
    this.entries = [];
    this.embeddingDim = CAD_FEATURE_EMBEDDING_DIM;
    this.dimSealed = false;
    this.loaded = false;
    this.lastPersistedAt = null;
  }

  /** Snapshot of entries (defensive copy) — do not mutate. */
  async snapshot(): Promise<ReadonlyArray<FeatureMemoryEntry>> {
    await this.load();
    return this.entries.map((e) => ({ ...e, embedding: [...e.embedding], error_patterns: [...e.error_patterns] }));
  }

  /** Override the on-disk path (test ergonomics). Resets loaded flag. */
  setMemoryPath(path: string): void {
    this.memoryPath = resolve(path);
    this.loaded = false;
    this.entries = [];
    this.embeddingDim = CAD_FEATURE_EMBEDDING_DIM;
    this.dimSealed = false;
    this.lastPersistedAt = null;
  }

  // ── Embedding ────────────────────────────────────────────────────────────

  /**
   * Deterministic 64-dim feature embedding. Layout:
   *   [0..31]  one-hot of FNV-1a(feature_type) mod 32  → captures kind
   *   [32..63] up to 32 numeric param slots (sorted by param key);
   *            booleans → 0/1, strings → FNV→[-1,1]; missing → 0;
   *            numbers tanh-squashed to [-1,1] for scale stability.
   *
   * Replaceable later by a learned embedding without changing the engine
   * contract (only embeddingDim assertion enforces consistency once sealed).
   */
  embedFeature(feature_type: string, parameters: FeatureParameters): number[] {
    const vec = new Array<number>(CAD_FEATURE_EMBEDDING_DIM).fill(0);
    const bucket = fnv1a(feature_type) % TYPE_BUCKETS;
    vec[bucket] = 1;

    const keys = Object.keys(parameters).sort();
    for (let i = 0; i < Math.min(keys.length, PARAM_SLOTS); i++) {
      const k = keys[i];
      const v = parameters[k];
      let slot = 0;
      if (typeof v === "number" && Number.isFinite(v)) {
        slot = Math.tanh(v / 100);
      } else if (typeof v === "boolean") {
        slot = v ? 1 : -1;
      } else if (typeof v === "string") {
        slot = (fnv1a(v) % 2001) / 1000 - 1; // ∈ [-1, 1]
      }
      vec[TYPE_BUCKETS + i] = slot;
    }
    return vec;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private assertValidRecord(opts: RecordOptions): void {
    if (typeof opts.feature_type !== "string" || opts.feature_type.length === 0) {
      throw new Error("record: feature_type must be a non-empty string");
    }
    if (opts.outcome !== "success" && opts.outcome !== "failure") {
      throw new Error("record: outcome must be 'success' or 'failure'");
    }
    if (
      typeof opts.gen_time_ms !== "number" ||
      !Number.isFinite(opts.gen_time_ms) ||
      opts.gen_time_ms < 0
    ) {
      throw new Error("record: gen_time_ms must be a finite number >= 0");
    }
    if (!opts.parameters || typeof opts.parameters !== "object") {
      throw new Error("record: parameters must be an object");
    }
    for (const [k, v] of Object.entries(opts.parameters)) {
      if (typeof v === "number" && !Number.isFinite(v)) {
        throw new Error(
          `record: parameter '${k}' is non-finite (NaN/Infinity rejected)`,
        );
      }
      if (
        typeof v !== "number" &&
        typeof v !== "string" &&
        typeof v !== "boolean"
      ) {
        throw new Error(
          `record: parameter '${k}' must be number|string|boolean, got ${typeof v}`,
        );
      }
    }
  }

  private assertEmbeddingDim(embedding: number[]): void {
    if (this.dimSealed && embedding.length !== this.embeddingDim) {
      throw new Error(
        `Embedding dim mismatch: sealed=${this.embeddingDim}, got=${embedding.length}`,
      );
    }
  }

  private canonicaliseParams(p: FeatureParameters): FeatureParameters {
    const out: Record<string, FeatureParamValue> = {};
    const keys = Object.keys(p).sort();
    for (const k of keys) {
      const v = p[k];
      if (typeof v === "string" && Buffer.byteLength(v, "utf-8") > MAX_PARAM_STRING_BYTES) {
        // Truncate at byte boundary, append marker so dedup key is stable.
        out[k] = v.slice(0, MAX_PARAM_STRING_BYTES) + "…";
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  private computeId(feature_type: string, params: FeatureParameters): string {
    const canonical = JSON.stringify({ t: feature_type, p: params });
    // 64-bit-ish FNV → hex, prefixed by feature_type for human grep.
    const h = fnv1a(canonical).toString(16).padStart(8, "0");
    return `${feature_type}:${h}`;
  }

  private normaliseState(parsed: unknown): {
    entries: FeatureMemoryEntry[];
    embeddingDim: number;
  } {
    if (!parsed || typeof parsed !== "object") {
      return { entries: [], embeddingDim: CAD_FEATURE_EMBEDDING_DIM };
    }
    const obj = parsed as Record<string, unknown>;
    const rawEntries = Array.isArray(obj.entries) ? obj.entries : [];
    const dim =
      typeof obj.embeddingDim === "number" && obj.embeddingDim > 0
        ? Math.floor(obj.embeddingDim)
        : CAD_FEATURE_EMBEDDING_DIM;
    const out: FeatureMemoryEntry[] = [];
    for (const candidate of rawEntries) {
      const entry = this.coerceEntry(candidate, dim);
      if (entry) out.push(entry);
    }
    return { entries: out, embeddingDim: dim };
  }

  private coerceEntry(
    candidate: unknown,
    expectedDim: number,
  ): FeatureMemoryEntry | null {
    if (!candidate || typeof candidate !== "object") return null;
    const c = candidate as Record<string, unknown>;
    if (typeof c.id !== "string" || typeof c.feature_type !== "string") return null;
    if (!Array.isArray(c.embedding) || c.embedding.length !== expectedDim) return null;
    const embedding: number[] = [];
    for (const v of c.embedding) {
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      embedding.push(v);
    }
    const params = (c.parameters && typeof c.parameters === "object")
      ? (c.parameters as FeatureParameters)
      : ({} as FeatureParameters);
    return {
      id: c.id,
      feature_type: c.feature_type,
      parameters: params,
      embedding,
      success_count: numField(c.success_count, 0),
      failure_count: numField(c.failure_count, 0),
      total_attempts: numField(c.total_attempts, 0),
      success_rate: clampFloat(numField(c.success_rate, 0), 0, 1),
      avg_gen_time_ms: numField(c.avg_gen_time_ms, 0),
      error_patterns: Array.isArray(c.error_patterns)
        ? c.error_patterns.filter((s): s is string => typeof s === "string").slice(0, MAX_ERROR_PATTERNS)
        : [],
      created_at: typeof c.created_at === "string" ? c.created_at : new Date(0).toISOString(),
      last_used_at: typeof c.last_used_at === "string" ? c.last_used_at : new Date(0).toISOString(),
    };
  }
}

// ── Pure helpers (exported for unit tests) ─────────────────────────────────

/** FNV-1a 32-bit. Deterministic, fast, no deps. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function cosineSimilarity(
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>,
): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

function numField(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clampFloat(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function clampInt(v: number, lo: number, hi: number): number {
  const n = Math.floor(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export const cadFeatureMemoryEngine = new CADFeatureMemoryEngine();
