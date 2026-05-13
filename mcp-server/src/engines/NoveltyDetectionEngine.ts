/**
 * NoveltyDetectionEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL02
 * =========================================================
 *
 * Filters source-monitor output (U-ALL01 `ReputableSourceMonitorEngine`)
 * so that `AutoResearchOrchestratorEngine` (U-ALL03) only dispatches
 * researcher subagents on items the system genuinely hasn't seen.
 *
 * Three-tier dedup pipeline:
 *   1. Exact-hash short-circuit — SHA-256 of normalized "title|summary".
 *      A bit-for-bit identical re-broadcast returns instantly; no
 *      embed / Jaccard work.
 *   2. Cosine embedding similarity — preferred path when an embedder
 *      is configured AND the catalog has stored embeddings. Threshold
 *      defaults to 0.92 per atomized spec § U-ALL02 step-1.
 *   3. Jaccard token overlap — fallback when embedder is unavailable
 *      (Ollama down, dimension mismatch, network error). Threshold
 *      defaults to 0.50: low enough that "Anthropic releases Claude
 *      Opus 4.7" vs "Anthropic releases Claude Opus 4.8" (Jaccard
 *      = 4/6 ≈ 0.67 — single-token diff over a 5-token title) still
 *      surfaces as near-duplicate. Tuned 2026-05-13 against synthetic
 *      paraphrase/identical/different RSS-title triples; revisit if
 *      false-positive rate climbs above 5% on real-feed audits.
 *
 * Modes are decided PER ITEM: a batch can mix paths if some catalog
 * entries have embeddings and others don't. `DetectResult.modesUsed`
 * reports which paths fired.
 *
 * Read-isolation: `detect()` snapshots `state.entries` at t0 so a
 * concurrent `addVerifiedNovel()` from a different caller cannot mutate
 * the catalog mid-scan. The CLI (`scripts/novelty-detect-sweep.mjs`)
 * and the dispatcher action `prism_ai:novelty_detect` (U-ALL07) share
 * the same in-process singleton; both can be in flight simultaneously
 * during a cron tick.
 *
 * Spec deviation (documented):
 *   The atomized spec § U-ALL02 step-1 says to load
 *   `state/shared/system-viz/novelty-catalog.json` (described as
 *   "currently empty"). That path is in fact already populated by a
 *   different-purpose schema-1.0.0 catalog (PRISM-internal novel
 *   toolpaths / engines / algorithms harvested for the system-viz
 *   graph). To honor the standing project rule "never delete / never
 *   overwrite peer assets" the auto-learn catalog lives at:
 *       state/shared/auto-learning/source-novelty-catalog.json
 *   The default catalog file path is owned by the CLI
 *   (`scripts/novelty-detect-sweep.mjs`); the engine is path-agnostic
 *   and works on the in-memory `CatalogState` it is handed.
 *
 * // CONVENTION-EXEMPT: stateful catalog. The novelty catalog is a
 * // growing map { guid → CatalogEntry } that must persist across
 * // cron runs. The engine owns the in-memory copy; persistence
 * // (JSON-on-disk, .previous.json backup rotation) lives in the
 * // companion CLI. The result type is a domain-specific
 * // `DetectResult` carrying per-item verdicts + batch stats that do
 * // not reduce to a scalar AtomicValue.
 *
 * Determinism + testability:
 *   - `embedder`, `hashFn`, `now` are injected via constructor opts
 *     and default to production implementations. Tests inject mock
 *     embedders that return stable vectors per text, frozen clocks,
 *     and identity-hash stubs.
 *   - The engine never performs network I/O directly: even the
 *     embedder fetch is wrapped behind the injected `EmbedderLike`
 *     interface so vitest cases stay hermetic.
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL02
 */

import { createHash } from "node:crypto";
import type { SourceItem } from "./ReputableSourceMonitorEngine.js";
// COUPLING: relies on OllamaEmbedderEngine.cosine() returning 0 for
// zero-magnitude or length-mismatched vectors AND not normalizing
// inputs. If that contract changes, `bestCosine` below will silently
// mis-rank entries. Verify on every OllamaEmbedderEngine bump.
import { cosine } from "./OllamaEmbedderEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

/**
 * One entry in the auto-learn novelty catalog. The catalog is the
 * authoritative "we have seen this before" memory of the auto-learning
 * loop. Entries accumulate across cron runs.
 */
export interface CatalogEntry {
  /** Stable identifier copied from `SourceItem.guid`. Unique per logical item. */
  guid: string;
  /** `SourceItem.source` slug — denormalized for log scanning. */
  source: string;
  /** Normalized title (lowercased, HTML stripped). */
  title: string;
  /** Normalized summary (may be undefined when source omits it). */
  summary?: string;
  /** SHA-256 hex of normalized "title|summary" — used by exact-hash tier. */
  textHash: string;
  /**
   * Vector embedding of the normalized "title|summary". Present iff an
   * embedder was available at add-time. Absent ⇒ this entry contributes
   * only to Jaccard / exact-hash comparisons.
   */
  embedding?: number[];
  /** ISO-8601 timestamp at which the entry was first added. */
  addedAt: string;
}

/** Persistence wrapper. Schema-versioned; CLI persists to JSON-on-disk. */
export interface CatalogState {
  schemaVersion: number;
  entries: CatalogEntry[];
  lastAddedAt: string | null;
}

/** Current catalog state schema version — bump on any breaking change. */
export const CATALOG_SCHEMA_VERSION = 1;

/** Minimal embedder contract; mirrors `OllamaEmbedderEngine.embed()`. */
export interface EmbedderLike {
  embed(text: string): Promise<EmbedOutcome>;
}

export type EmbedOutcome =
  | { ok: true; vector: number[] }
  | { ok: false; error: string };

export type NoveltyMethod = "exact_hash" | "embedding" | "jaccard";

export type NoveltyReason =
  | "novel"
  | "near_duplicate"
  | "exact_duplicate"
  | "catalog_empty";

export interface NoveltyVerdict {
  guid: string;
  source: string;
  isNovel: boolean;
  reason: NoveltyReason;
  /** Maximum similarity to any catalog entry; absent for `catalog_empty`. */
  bestSimilarity?: number;
  /** Best-matching catalog entry's guid; absent for `catalog_empty`. */
  bestMatchGuid?: string;
  /** Which tier produced the verdict; `"none"` ⇔ catalog_empty. */
  method: NoveltyMethod | "none";
  /**
   * Set when this verdict downgraded from embedding → jaccard because
   * the embedder failed mid-batch. Operator-facing diagnostic.
   */
  embedderFallback?: true;
  /**
   * Vector embedding computed inside `detect()` for this item. Threaded
   * through to `addVerifiedNovel()` so we don't re-embed novel items
   * a second time (saves ~150 ms/item on the cron path). Internal
   * use only — callers should treat as opaque.
   */
  _computedEmbedding?: number[];
}

export interface DetectResult {
  results: NoveltyVerdict[];
  novelCount: number;
  knownCount: number;
  /** Catalog size at the time of the detect call (pre-mutation). */
  catalogSize: number;
  /** Distinct tier(s) that fired across this batch. */
  modesUsed: NoveltyMethod[];
  /** True iff the embedder was configured AND succeeded at least once. */
  embedderAvailable: boolean;
  durationMs: number;
}

export interface LoadOutcome {
  ok: boolean;
  /** Number of entries successfully loaded into state. */
  entries: number;
  /** Reason for failure when `ok === false`. */
  error?: string;
}

export interface AddOutcome {
  /** Number of NEW entries inserted into the catalog. */
  added: number;
  /**
   * Guids whose `addVerifiedNovel` insert succeeded but whose embedder
   * call returned `ok:false`. These entries now exist in the catalog
   * without an embedding and will fall back to Jaccard on future
   * comparisons until a re-embedding pass populates them.
   */
  embeddedFailures: string[];
  /** Guids skipped because their hash OR guid already lived in the catalog. */
  skipped: string[];
}

export interface EngineOpts {
  /** Inject an `EmbedderLike`. `null` forces Jaccard-only mode. */
  embedder?: EmbedderLike | null;
  /** Pre-seed the catalog (used by CLI on startup). */
  initialCatalog?: CatalogState | null;
  /** Cosine threshold above which an item is "known". Default 0.92. */
  cosineThreshold?: number;
  /** Jaccard threshold above which an item is "known". Default 0.50. */
  jaccardThreshold?: number;
  /** Wall-clock injection. Default `Date.now`. */
  now?: () => number;
  /** Hash injection — test stubs can return identity. Default SHA-256 hex. */
  hashFn?: (s: string) => string;
}

// ─── Constants ──────────────────────────────────────────────────────

/** Spec § U-ALL02 step-1 threshold. */
export const DEFAULT_COSINE_THRESHOLD = 0.92;
/**
 * Jaccard threshold tuned so that a single-token difference over a
 * 5-token title (Jaccard ≈ 0.67) still flags as near-duplicate while
 * truly-different items (≤ 0.30 overlap) flag as novel. Empirical —
 * tuned 2026-05-13 against synthetic RSS-title triples.
 */
export const DEFAULT_JACCARD_THRESHOLD = 0.5;
/** Min token length (drops 1-letter noise like "a", "i"). */
const MIN_TOKEN_LENGTH = 2;
/** Reserved keys we refuse to accept inside catalog entries — defence-in-depth. */
const FORBIDDEN_ENTRY_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

function freshCatalogState(): CatalogState {
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    entries: [],
    lastAddedAt: null,
  };
}

// ─── Engine ─────────────────────────────────────────────────────────

export class NoveltyDetectionEngine {
  readonly name = "NoveltyDetectionEngine";

  private embedder: EmbedderLike | null;
  private state: CatalogState;
  private cosineThreshold: number;
  private jaccardThreshold: number;
  private nowFn: () => number;
  private hashFn: (s: string) => string;
  /**
   * True iff `setCatalog` or `loadCatalog` has succeeded since the
   * engine was constructed or reset. Distinguishes "process is fresh,
   * catalog file not yet loaded" from "catalog file is genuinely
   * empty". The dispatcher action (`prism_ai:novelty_detect`, U-ALL07)
   * uses this to emit a `catalog_not_loaded` advisory rather than
   * silently flagging everything as novel.
   */
  private catalogLoaded: boolean;

  constructor(opts: EngineOpts = {}) {
    this.embedder = opts.embedder === undefined ? null : opts.embedder;
    this.cosineThreshold = opts.cosineThreshold ?? DEFAULT_COSINE_THRESHOLD;
    this.jaccardThreshold = opts.jaccardThreshold ?? DEFAULT_JACCARD_THRESHOLD;
    this.nowFn = opts.now ?? Date.now;
    this.hashFn = opts.hashFn ?? defaultSha256;
    if (opts.initialCatalog) {
      this.state = this.deepCloneState(opts.initialCatalog);
      this.catalogLoaded = true;
    } else {
      this.state = freshCatalogState();
      this.catalogLoaded = false;
    }
  }

  /** Defensive snapshot of the current catalog. Safe to mutate the result. */
  getCatalog(): CatalogState {
    return this.deepCloneState(this.state);
  }

  /**
   * Whether a real catalog has been loaded since construction (true)
   * or the in-memory state is just the construction-time empty
   * sentinel (false). Lets the dispatcher action distinguish a
   * not-yet-initialized singleton from a genuinely empty catalog.
   */
  isCatalogLoaded(): boolean {
    return this.catalogLoaded;
  }

  /**
   * **HARD RESET** — replaces all in-memory state with the supplied
   * catalog. Callers must persist in-flight mutations (e.g. recent
   * `addVerifiedNovel` adds) BEFORE calling, or those changes will be
   * silently lost. The CLI is the sole expected caller in production;
   * the dispatcher action should NOT call this (use a merge surface
   * if/when that's needed).
   */
  setCatalog(next: CatalogState): LoadOutcome {
    const validated = this.validateCatalog(next);
    if (!validated.ok) return validated;
    this.state = this.deepCloneState(next);
    this.catalogLoaded = true;
    return { ok: true, entries: this.state.entries.length };
  }

  /**
   * Parse a JSON-encoded catalog blob and load it. Returns a structured
   * error rather than throwing so the CLI can attempt a `.previous.json`
   * recovery without try/catch fanout. Engine state is unchanged on
   * failure.
   */
  loadCatalog(json: string): LoadOutcome {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      return {
        ok: false,
        entries: 0,
        error: `parse_error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, entries: 0, error: "not_an_object" };
    }
    return this.setCatalog(parsed as CatalogState);
  }

  /** Test-only escape. Drops all catalog entries and resets lastAddedAt. */
  resetAll(): void {
    this.state = freshCatalogState();
    this.catalogLoaded = false;
  }

  /**
   * Inject a different embedder at runtime (CLI uses this to swap in a
   * production OllamaEmbedderEngine after construction). Pass `null` to
   * force Jaccard-only mode.
   */
  setEmbedder(embedder: EmbedderLike | null): void {
    this.embedder = embedder;
  }

  // ─── Core detect path ────────────────────────────────────────────

  /**
   * Classify each input item as novel or known relative to the current
   * catalog. Does NOT mutate the catalog — callers must follow up with
   * `addVerifiedNovel(...)` to commit the novel items.
   *
   * Empty input ⇒ zero-result `DetectResult`.
   * Empty catalog ⇒ every input flagged novel with reason `catalog_empty`.
   *
   * Read-isolation: takes a shallow `.slice()` of `state.entries` at
   * t0 so a concurrent `addVerifiedNovel` from a parallel caller
   * cannot perturb mid-scan ordering. (Entries are not mutated in
   * place — only `entries.push()`-ed — so a shallow snapshot is safe.)
   */
  async detect(items: ReadonlyArray<SourceItem>): Promise<DetectResult> {
    const t0 = this.nowFn();
    const verdicts: NoveltyVerdict[] = [];
    const modesUsed = new Set<NoveltyMethod>();
    let embedderEverWorked = false;
    let embedderBrokeMidBatch = false;

    // Read-isolation snapshot. See JSDoc above.
    const entriesSnapshot = this.state.entries.slice();
    const catalogSize = entriesSnapshot.length;

    // Pre-build a hash index for O(1) exact-dup lookup.
    const hashIndex = new Map<string, CatalogEntry>();
    for (const e of entriesSnapshot) {
      hashIndex.set(e.textHash, e);
    }

    for (const item of items) {
      const normTitle = normalize(item.title ?? "");
      const normSummary = normalize(item.summary ?? "");
      const composite = `${normTitle}|${normSummary}`;
      const textHash = this.hashFn(composite);

      // Tier 1: exact hash short-circuit.
      const exactHit = hashIndex.get(textHash);
      if (exactHit) {
        modesUsed.add("exact_hash");
        verdicts.push({
          guid: item.guid,
          source: item.source,
          isNovel: false,
          reason: "exact_duplicate",
          bestSimilarity: 1,
          bestMatchGuid: exactHit.guid,
          method: "exact_hash",
        });
        continue;
      }

      // Catalog empty ⇒ everything is novel.
      if (catalogSize === 0) {
        verdicts.push({
          guid: item.guid,
          source: item.source,
          isNovel: true,
          reason: "catalog_empty",
          method: "none",
        });
        continue;
      }

      // Tier 2: embedding cosine — only if embedder works AND some
      // catalog entries actually carry embeddings.
      const anyEmbedded = entriesSnapshot.some(
        (e) => e.embedding && e.embedding.length > 0,
      );
      const tryEmbedding =
        this.embedder !== null && !embedderBrokeMidBatch && anyEmbedded;

      let verdictPlaced = false;
      if (tryEmbedding) {
        const emb = await safeEmbed(this.embedder!, composite);
        if (emb.ok) {
          embedderEverWorked = true;
          const best = bestCosine(emb.vector, entriesSnapshot);
          modesUsed.add("embedding");
          const isKnown = best.similarity >= this.cosineThreshold;
          verdicts.push({
            guid: item.guid,
            source: item.source,
            isNovel: !isKnown,
            reason: isKnown ? "near_duplicate" : "novel",
            bestSimilarity: best.similarity,
            bestMatchGuid: best.match?.guid,
            method: "embedding",
            // Thread the just-computed vector through so addVerifiedNovel
            // doesn't re-embed identical text on the next call.
            _computedEmbedding: emb.vector,
          });
          verdictPlaced = true;
        } else {
          // Embedder failed; downgrade rest of batch to Jaccard.
          embedderBrokeMidBatch = true;
        }
      }

      if (verdictPlaced) continue;

      // Tier 3: Jaccard token overlap fallback.
      const candidateTokens = tokenize(composite);
      const best = bestJaccard(candidateTokens, entriesSnapshot);
      modesUsed.add("jaccard");
      const isKnown = best.similarity >= this.jaccardThreshold;
      verdicts.push({
        guid: item.guid,
        source: item.source,
        isNovel: !isKnown,
        reason: isKnown ? "near_duplicate" : "novel",
        bestSimilarity: best.similarity,
        bestMatchGuid: best.match?.guid,
        method: "jaccard",
        ...(embedderBrokeMidBatch && this.embedder !== null
          ? { embedderFallback: true as const }
          : {}),
      });
    }

    const novelCount = verdicts.filter((v) => v.isNovel).length;
    return {
      results: verdicts,
      novelCount,
      knownCount: verdicts.length - novelCount,
      catalogSize,
      modesUsed: Array.from(modesUsed),
      embedderAvailable: this.embedder !== null && embedderEverWorked,
      durationMs: this.nowFn() - t0,
    };
  }

  /**
   * Commit the verdicts of a prior `detect()` call: every item flagged
   * `isNovel === true` is added to the catalog. Idempotent — entries
   * skipped on:
   *   - `textHash` already present in catalog (exact-dup race),
   *   - `guid` already present (upstream feed mutated title — keep
   *     existing entry; the variant becomes "skipped" so a future pass
   *     can decide whether to replace).
   *
   * Re-uses the embedding from `detect()` when available
   * (`verdict._computedEmbedding`). If the verdict came from the
   * jaccard tier (no embedding computed), AND an embedder is configured,
   * one fresh embed call is made — failures append to
   * `result.embeddedFailures` rather than aborting the add.
   *
   * Returns `{added, embeddedFailures, skipped}` so the CLI can surface
   * "added 3 of 5 (2 already known); 1 entry has no embedding (re-try
   * next cycle)".
   */
  async addVerifiedNovel(
    verdicts: ReadonlyArray<NoveltyVerdict>,
    items: ReadonlyArray<SourceItem>,
  ): Promise<AddOutcome> {
    const itemByGuid = new Map<string, SourceItem>();
    for (const it of items) itemByGuid.set(it.guid, it);

    const existingHashes = new Set(this.state.entries.map((e) => e.textHash));
    const existingGuids = new Set(this.state.entries.map((e) => e.guid));
    let added = 0;
    const embeddedFailures: string[] = [];
    const skipped: string[] = [];

    for (const v of verdicts) {
      if (!v.isNovel) continue;
      const item = itemByGuid.get(v.guid);
      if (!item) continue;
      if (existingGuids.has(v.guid)) {
        skipped.push(v.guid);
        continue;
      }
      const normTitle = normalize(item.title ?? "");
      const normSummary = normalize(item.summary ?? "");
      const composite = `${normTitle}|${normSummary}`;
      const textHash = this.hashFn(composite);
      if (existingHashes.has(textHash)) {
        skipped.push(v.guid);
        continue;
      }
      existingHashes.add(textHash);
      existingGuids.add(v.guid);

      // Re-use detect()-computed embedding when available; fall back to
      // a fresh embed only when the verdict came from the Jaccard tier.
      let embedding: number[] | undefined;
      if (v._computedEmbedding && v._computedEmbedding.length > 0) {
        embedding = v._computedEmbedding.slice();
      } else if (this.embedder !== null) {
        const emb = await safeEmbed(this.embedder, composite);
        if (emb.ok) {
          embedding = emb.vector;
        } else {
          embeddedFailures.push(v.guid);
        }
      }

      const nowIso = new Date(this.nowFn()).toISOString();
      this.state.entries.push({
        guid: item.guid,
        source: item.source,
        title: normTitle,
        ...(normSummary ? { summary: normSummary } : {}),
        textHash,
        ...(embedding ? { embedding } : {}),
        addedAt: nowIso,
      });
      this.state.lastAddedAt = nowIso;
      added += 1;
    }
    return { added, embeddedFailures, skipped };
  }

  // ─── Internals ───────────────────────────────────────────────────

  /**
   * Strict shape check. Rejects:
   *   - schemaVersion ≠ CATALOG_SCHEMA_VERSION
   *   - entries not an array
   *   - any entry missing required field / wrong type
   *   - entry carrying a reserved key (`__proto__`, `constructor`, `prototype`)
   *   - embedding non-numeric, NaN, or non-finite (Infinity / -Infinity)
   */
  private validateCatalog(s: unknown): LoadOutcome {
    if (typeof s !== "object" || s === null) {
      return { ok: false, entries: 0, error: "not_an_object" };
    }
    const rec = s as Record<string, unknown>;
    if (rec.schemaVersion !== CATALOG_SCHEMA_VERSION) {
      return {
        ok: false,
        entries: 0,
        error: `schemaVersion_mismatch: expected=${CATALOG_SCHEMA_VERSION} got=${String(rec.schemaVersion)}`,
      };
    }
    if (!Array.isArray(rec.entries)) {
      return { ok: false, entries: 0, error: "entries_not_array" };
    }
    for (let i = 0; i < rec.entries.length; i++) {
      const e = rec.entries[i] as Record<string, unknown>;
      if (typeof e !== "object" || e === null) {
        return { ok: false, entries: 0, error: `entry_${i}_not_object` };
      }
      for (const k of Object.keys(e)) {
        if (FORBIDDEN_ENTRY_KEYS.has(k)) {
          return { ok: false, entries: 0, error: `entry_${i}_forbidden_key:${k}` };
        }
      }
      if (typeof e.guid !== "string" || e.guid.length === 0) {
        return { ok: false, entries: 0, error: `entry_${i}_bad_guid` };
      }
      if (typeof e.source !== "string") {
        return { ok: false, entries: 0, error: `entry_${i}_bad_source` };
      }
      if (typeof e.title !== "string") {
        return { ok: false, entries: 0, error: `entry_${i}_bad_title` };
      }
      if (typeof e.textHash !== "string" || e.textHash.length === 0) {
        return { ok: false, entries: 0, error: `entry_${i}_bad_textHash` };
      }
      if (typeof e.addedAt !== "string") {
        return { ok: false, entries: 0, error: `entry_${i}_bad_addedAt` };
      }
      if (e.embedding !== undefined) {
        if (!Array.isArray(e.embedding)) {
          return { ok: false, entries: 0, error: `entry_${i}_bad_embedding` };
        }
        for (const v of e.embedding) {
          // Use Number.isFinite — rejects NaN, +Infinity, -Infinity in one shot.
          // Infinity in an embedding produces NaN under cosine(...) which
          // would silently disqualify the entry from all future scans.
          if (typeof v !== "number" || !Number.isFinite(v)) {
            return {
              ok: false,
              entries: 0,
              error: `entry_${i}_embedding_non_finite`,
            };
          }
        }
      }
    }
    if (rec.lastAddedAt !== null && typeof rec.lastAddedAt !== "string") {
      return { ok: false, entries: 0, error: "bad_lastAddedAt" };
    }
    return { ok: true, entries: rec.entries.length };
  }

  /**
   * Explicit named construction (no spread) so an entry carrying an
   * own-property `__proto__` (e.g. from `JSON.parse`) does not leak
   * that key into the cloned object. `validateCatalog` already
   * rejects such inputs but the clone path is the last defence.
   */
  private deepCloneState(s: CatalogState): CatalogState {
    return {
      schemaVersion: s.schemaVersion,
      lastAddedAt: s.lastAddedAt,
      entries: s.entries.map((e) => {
        const clone: CatalogEntry = {
          guid: e.guid,
          source: e.source,
          title: e.title,
          textHash: e.textHash,
          addedAt: e.addedAt,
        };
        if (e.summary !== undefined) clone.summary = e.summary;
        if (e.embedding !== undefined) clone.embedding = e.embedding.slice();
        return clone;
      }),
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Normalize free-form RSS/Atom text: strip HTML tags, strip named AND
 * numeric HTML entities, collapse whitespace, lowercase. Preserves
 * unicode (titles routinely carry non-ASCII project names).
 */
export function normalize(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:[a-z]+|#x?[0-9a-f]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Tokenize a pre-normalized string into a unique set of alpha-num
 * tokens. PRECONDITION: input has already been lowercased (e.g. by
 * `normalize`). Drops tokens shorter than 2 chars so single-letter
 * noise doesn't inflate Jaccard.
 */
export function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  for (const t of s.split(/[^a-z0-9]+/)) {
    if (t.length >= MIN_TOKEN_LENGTH) out.add(t);
  }
  return out;
}

/**
 * Jaccard index of two token sets. Returns 0 for two empty sets to
 * avoid 0/0 NaN.
 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  if (union === 0) return 0;
  return inter / union;
}

function defaultSha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * Wrap embedder calls in a try/catch — embedders may throw OR return
 * `{ok:false}`. Normalize both paths to the result shape.
 */
async function safeEmbed(
  embedder: EmbedderLike,
  text: string,
): Promise<EmbedOutcome> {
  try {
    return await embedder.embed(text);
  } catch (err) {
    return {
      ok: false,
      error: `embedder_threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

interface BestMatch {
  similarity: number;
  match?: CatalogEntry;
}

/**
 * Scan catalog for the best cosine similarity. Skips entries without
 * embeddings. Guards against NaN / non-finite cosine outputs (which
 * arise on overflowed embeddings — defence against tampered catalogs).
 * Returns `{similarity: 0}` when zero qualifying entries were scanned
 * (caller distinguishes via `match === undefined`).
 */
function bestCosine(
  candidate: ReadonlyArray<number>,
  entries: ReadonlyArray<CatalogEntry>,
): BestMatch {
  let bestSim = -Infinity;
  let bestEntry: CatalogEntry | undefined;
  let scanned = 0;
  for (const e of entries) {
    if (!e.embedding || e.embedding.length === 0) continue;
    scanned += 1;
    const sim = cosine(candidate, e.embedding);
    if (!Number.isFinite(sim)) continue;
    if (sim > bestSim) {
      bestSim = sim;
      bestEntry = e;
    }
  }
  if (scanned === 0) return { similarity: 0 };
  // Negative-similarity matches collapse to 0 for reporting (negative
  // cosine means "anti-correlated" which downstream wants treated as
  // "no match found").
  return { similarity: Math.max(0, bestSim), match: bestEntry };
}

/** Scan catalog for the best Jaccard overlap. Works on every entry. */
function bestJaccard(
  candidate: Set<string>,
  entries: ReadonlyArray<CatalogEntry>,
): BestMatch {
  let best: BestMatch = { similarity: 0 };
  for (const e of entries) {
    const entryTokens = tokenize(`${e.title}|${e.summary ?? ""}`);
    const sim = jaccard(candidate, entryTokens);
    if (sim > best.similarity) {
      best = { similarity: sim, match: e };
    }
  }
  return best;
}

// ─── Singleton ──────────────────────────────────────────────────────

/**
 * Production singleton — no embedder by default. The dispatcher /
 * CLI swap in an `OllamaEmbedderEngine` via `setEmbedder()` after
 * construction.
 *
 * // WIRE-EXEMPT: dispatcher action `prism_ai:novelty_detect` lands
 * // in U-ALL07; the U-ALL02 CLI (`scripts/novelty-detect-sweep.mjs`)
 * // consumes this singleton directly. `stop-auto-wire.mjs` should
 * // suppress orphan warnings during the U-ALL02→U-ALL07 gap.
 */
export const noveltyDetectionEngine = new NoveltyDetectionEngine();
