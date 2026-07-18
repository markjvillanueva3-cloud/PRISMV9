/**
 * QdrantMemoryVectorBridgeEngine — JULIETT-DB-BRIDGE-MS0/U-DB-BRIDGE-01
 * ====================================================================
 *
 * Unified vector-search router across the 14 PRISM `MemoryKind` collections.
 *
 * **Why this exists.** Before this engine, a caller wanting "any semantic
 * memory matching X" had to either (a) loop the 14 kinds itself, eating an
 * RTT per kind, or (b) drop down to the raw `QdrantSurfaceEngine` which
 * doesn't understand kind→collection naming. The bridge fans the query out
 * across the requested kinds in a single call, normalizes + dedups + merges
 * the hits, and reports per-backend health so the caller can decide whether
 * to fall back to pattern matching.
 *
 * **Scope (R7 — surface conflicts, don't average).** The
 * `JULIETT-DB-BRIDGE-PLAN-2026-05-25.md` plan listed this engine's targets as
 * "Qdrant + FeatureStore + .claude/memory.db". Reading the actual code shows:
 *   - `FeatureStoreEngine` is **NOT** vector-backed — it stores JSONL feature
 *     rows with AS-OF semantics, not embeddings. Cross-vector search against
 *     it would mean nothing.
 *   - `.claude/memory.db` is owned by the Claude harness; no in-process JS
 *     surface exists. (Memory imports happen via `memory_import_claude`,
 *     not via vector search.)
 * So this engine bridges **only across `QdrantMemoryEngine` kinds** — the
 * actually-vector-bearing backends. Future tiered/fabric vector backends
 * will be added as new `source` values on `UnifiedVectorHit`.
 *
 * **Failure-soft contract (R12 — fail loud).** Qdrant is sometimes offline
 * (NIM GPU contention or daemon stuck per the 2026-05-26 ops banner). The
 * bridge:
 *   - Returns `{ ok: true, hits: [], per_backend.qdrant.ok: false }` when
 *     Qdrant is unreachable, with the specific error string surfaced.
 *   - Never throws on backend failure — only on input-shape failure
 *     (caught at the `try/catch` shell and surfaced as `ok: false`).
 *   - Reports `kinds_with_hits` so the caller knows which collections
 *     actually returned data vs. which were empty/missing.
 *
 * **Design invariants.**
 *   1. PURE ROUTING — no embedder ownership; delegates to
 *      `QdrantMemoryEngineSingleton.getInstance()` (which carries the
 *      Ollama nomic-embed-text embedder).
 *   2. FAN-OUT WITH `Promise.allSettled` — one slow/dead kind never blocks
 *      the others.
 *   3. SCORE-PRESERVING — Qdrant cosine scores are already 0..1; we don't
 *      re-rank, only filter (`minScore`) and sort (`score` desc).
 *   4. DEDUP BY `kind:id` — same id can legitimately live across kinds
 *      (e.g. a tip and a wiki entry share a slug). We keep the higher
 *      score and surface both `kinds_with_hits` for transparency.
 *   5. CLAMPED PARALLELISM — `kinds.length` is bounded by `MEMORY_KINDS`
 *      (14), so unbounded fan-out is structurally impossible.
 *   6. `perKindLimit` AUTO — defaults to `ceil(topK * 2 / kinds.length)`
 *      clamped 1..50 so the merge has enough headroom for dedup but
 *      never asks Qdrant for more than necessary.
 *
 * @module engines/QdrantMemoryVectorBridgeEngine
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-BRIDGE-01
 */

import {
  MEMORY_KINDS,
  type MemoryKind,
  type MemoryItem,
  type MemoryResult,
} from "./QdrantMemoryEngine.js";
import { QdrantMemoryEngineSingleton } from "./QdrantMemoryEngineSingleton.js";

// ── Public input/output shapes ────────────────────────────────────────────

export interface UnifiedVectorSearchInput {
  /** Free-text query embedded by the QdrantMemoryEngine's embedder. */
  query: string;
  /** Subset of memory kinds to fan out across. Default: all 14 kinds. */
  kinds?: readonly MemoryKind[];
  /** Max hits returned after merge + dedup + sort. 1..100, default 10. */
  topK?: number;
  /** Lower bound (0..1) on cosine score. Hits below are dropped. Default 0. */
  minScore?: number;
  /** Include the `metadata` field on each hit. Default false (lighter wire). */
  includeMetadata?: boolean;
  /**
   * Per-kind Qdrant limit. Default = clamp(ceil(topK * 2 / kinds.length), 1, 50).
   * Larger values give dedup more headroom at the cost of larger fan-out.
   */
  perKindLimit?: number;
}

export interface UnifiedVectorHit {
  id: string | number;
  kind: MemoryKind;
  text: string;
  /** Cosine similarity 0..1 from Qdrant. Higher is better. */
  score: number;
  /** Backend that produced the hit. Currently always `"qdrant"`. */
  source: "qdrant";
  /** Present only when `includeMetadata: true`. */
  metadata?: Record<string, unknown>;
  /** ISO-8601 from the underlying MemoryItem when set. */
  createdAt?: string;
}

export interface PerBackendStatus {
  ok: boolean;
  /** Number of raw hits this backend contributed before dedup. */
  hitsCount: number;
  /** Number of kinds queried against this backend (0 if backend was skipped). */
  kindsQueried: number;
  /** Number of kinds that failed for this backend (e.g. ensureCollection error). */
  kindsFailed: number;
  /** First / representative error message when any kind failed. */
  error?: string;
}

export interface UnifiedVectorSearchStats {
  /** Hits returned by all backends summed, before dedup/topK trimming. */
  totalRawHits: number;
  /** Hits removed by `kind:id` dedup (kept the higher score). */
  dedupRemoved: number;
  /** Hits dropped because `score < minScore`. */
  belowMinScore: number;
  /** Kinds that actually produced ≥1 hit in the final result set. */
  kindsWithHits: MemoryKind[];
  /** Human-readable list of why kinds returned no hits (offline/empty/error). */
  missReasons: string[];
}

export interface UnifiedVectorSearchResult {
  /** `true` iff input was well-formed. Backend offline still returns ok:true. */
  ok: boolean;
  /** Set only when `ok: false` (input-shape failure). */
  error?: string;
  hits: UnifiedVectorHit[];
  perBackend: {
    qdrant: PerBackendStatus;
  };
  stats: UnifiedVectorSearchStats;
}

// ── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_TOP_K = 10;
const MAX_TOP_K = 100;
const MAX_PER_KIND_LIMIT = 50;
const DEFAULT_MIN_SCORE = 0;

// ── Engine ────────────────────────────────────────────────────────────────

/**
 * Recall surface compatible with `QdrantMemoryEngine.recall` — exposed as a
 * narrow interface so tests can inject mock backends without standing up a
 * live Qdrant instance.
 */
export interface RecallBackend {
  recall(input: {
    kind: MemoryKind;
    query: string;
    limit?: number;
    filter?: Record<string, unknown>;
  }): Promise<MemoryResult<MemoryItem[]>>;
}

export interface BridgeDeps {
  /** Defaults to `QdrantMemoryEngineSingleton.getInstance()`. */
  qdrant?: RecallBackend;
}

export class QdrantMemoryVectorBridgeEngine {
  private readonly qdrant: RecallBackend | null;

  constructor(deps: BridgeDeps = {}) {
    this.qdrant = deps.qdrant ?? null;
  }

  /**
   * Resolve the Qdrant backend lazily. Tests inject via constructor; prod
   * pulls the singleton on first call so module-load order isn't fragile.
   */
  private resolveQdrant(): RecallBackend {
    if (this.qdrant) return this.qdrant;
    return QdrantMemoryEngineSingleton.getInstance();
  }

  /**
   * Fan-out vector search across the requested kinds, merge + dedup + sort,
   * return the top-K. See module-level doc for failure-soft contract.
   *
   * @param input Search request.
   * @returns Always returns; `ok:false` only on input-shape failure.
   */
  async search(input: UnifiedVectorSearchInput): Promise<UnifiedVectorSearchResult> {
    const validated = this.validate(input);
    if (!validated.ok) {
      return {
        ok: false,
        error: validated.error,
        hits: [],
        perBackend: {
          qdrant: { ok: false, hitsCount: 0, kindsQueried: 0, kindsFailed: 0, error: validated.error },
        },
        stats: {
          totalRawHits: 0,
          dedupRemoved: 0,
          belowMinScore: 0,
          kindsWithHits: [],
          missReasons: [validated.error],
        },
      };
    }
    const { query, kinds, topK, minScore, includeMetadata, perKindLimit } = validated.value;

    // Per-kind fan-out. Promise.allSettled — one bad kind never poisons the rest.
    const backend = this.resolveQdrant();
    const recallTasks = kinds.map(async (kind): Promise<{ kind: MemoryKind; result: MemoryResult<MemoryItem[]> }> => {
      try {
        const result = await backend.recall({ kind, query, limit: perKindLimit });
        return { kind, result };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { kind, result: { ok: false, error: `recall threw: ${msg}` } };
      }
    });

    const settled = await Promise.allSettled(recallTasks);

    // Collect raw hits + per-kind status
    const rawHits: UnifiedVectorHit[] = [];
    const kindErrors: Map<MemoryKind, string> = new Map();
    const kindsWithRaw: Set<MemoryKind> = new Set();
    let kindsFailed = 0;

    for (const s of settled) {
      if (s.status !== "fulfilled") {
        // The outer task wrapper catches everything; this branch is defence-in-depth.
        kindsFailed += 1;
        continue;
      }
      const { kind, result } = s.value;
      if (!result.ok) {
        kindErrors.set(kind, result.error);
        kindsFailed += 1;
        continue;
      }
      const items = result.value;
      if (items.length === 0) {
        kindErrors.set(kind, "no hits");
        continue;
      }
      for (const item of items) {
        const score = typeof item.score === "number" ? item.score : 0;
        const hit: UnifiedVectorHit = {
          id: item.id,
          kind: item.kind,
          text: item.text,
          score,
          source: "qdrant",
          ...(item.createdAt !== undefined ? { createdAt: item.createdAt } : {}),
          ...(includeMetadata ? { metadata: item.metadata } : {}),
        };
        rawHits.push(hit);
        kindsWithRaw.add(kind);
      }
    }

    // Filter below minScore
    const aboveMin = rawHits.filter((h) => h.score >= minScore);
    const belowMinScore = rawHits.length - aboveMin.length;

    // Dedup by kind:id (keep higher score)
    const seen: Map<string, UnifiedVectorHit> = new Map();
    for (const h of aboveMin) {
      const key = `${h.kind}:${String(h.id)}`;
      const prev = seen.get(key);
      if (prev === undefined || h.score > prev.score) {
        seen.set(key, h);
      }
    }
    const dedupRemoved = aboveMin.length - seen.size;

    // Sort by score desc, trim to topK
    const sorted = Array.from(seen.values()).sort((a, b) => b.score - a.score);
    const trimmed = sorted.slice(0, topK);

    const kindsWithHits = Array.from(new Set(trimmed.map((h) => h.kind))).sort();
    const missReasons: string[] = [];
    for (const [k, reason] of kindErrors.entries()) {
      missReasons.push(`${k}: ${reason}`);
    }

    const qdrantOk = kindsFailed < kinds.length; // any success → backend "ok"
    const firstError = kindsFailed > 0 ? (kindErrors.values().next().value ?? "unknown") : undefined;

    return {
      ok: true,
      hits: trimmed,
      perBackend: {
        qdrant: {
          ok: qdrantOk,
          hitsCount: rawHits.length,
          kindsQueried: kinds.length,
          kindsFailed,
          ...(firstError !== undefined ? { error: firstError } : {}),
        },
      },
      stats: {
        totalRawHits: rawHits.length,
        dedupRemoved,
        belowMinScore,
        kindsWithHits,
        missReasons,
      },
    };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private validate(input: UnifiedVectorSearchInput):
    | { ok: true; value: {
        query: string;
        kinds: readonly MemoryKind[];
        topK: number;
        minScore: number;
        includeMetadata: boolean;
        perKindLimit: number;
      } }
    | { ok: false; error: string } {
    if (!input || typeof input !== "object") {
      return { ok: false, error: "input required" };
    }
    if (typeof input.query !== "string" || input.query.trim() === "") {
      return { ok: false, error: "query required" };
    }

    // Kinds: default to all, validate each
    let kinds: readonly MemoryKind[];
    if (input.kinds === undefined) {
      kinds = MEMORY_KINDS;
    } else if (!Array.isArray(input.kinds)) {
      return { ok: false, error: "kinds must be an array" };
    } else if (input.kinds.length === 0) {
      return { ok: false, error: "kinds must be non-empty when provided" };
    } else {
      for (const k of input.kinds) {
        if (!MEMORY_KINDS.includes(k as MemoryKind)) {
          return { ok: false, error: `unknown kind: ${String(k)}` };
        }
      }
      kinds = input.kinds as readonly MemoryKind[];
    }

    // topK: 1..100
    let topK = input.topK ?? DEFAULT_TOP_K;
    if (!Number.isInteger(topK) || topK <= 0) {
      return { ok: false, error: "topK must be a positive integer" };
    }
    if (topK > MAX_TOP_K) topK = MAX_TOP_K;

    // minScore: 0..1
    const minScore = input.minScore ?? DEFAULT_MIN_SCORE;
    if (typeof minScore !== "number" || !Number.isFinite(minScore) || minScore < 0 || minScore > 1) {
      return { ok: false, error: "minScore must be a finite number in [0, 1]" };
    }

    // perKindLimit: 1..50, auto if absent
    let perKindLimit: number;
    if (input.perKindLimit === undefined) {
      perKindLimit = Math.max(1, Math.min(MAX_PER_KIND_LIMIT, Math.ceil((topK * 2) / kinds.length)));
    } else {
      if (!Number.isInteger(input.perKindLimit) || input.perKindLimit <= 0) {
        return { ok: false, error: "perKindLimit must be a positive integer" };
      }
      perKindLimit = Math.min(MAX_PER_KIND_LIMIT, input.perKindLimit);
    }

    const includeMetadata = input.includeMetadata === true;

    return {
      ok: true,
      value: { query: input.query, kinds, topK, minScore, includeMetadata, perKindLimit },
    };
  }
}

export const qdrantMemoryVectorBridgeEngine = new QdrantMemoryVectorBridgeEngine();
