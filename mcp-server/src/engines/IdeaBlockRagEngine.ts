/**
 * IdeaBlockRagEngine
 * ==================
 *
 * OBSIDIAN-INTELLIGENCE-MS3/E3/U-IDEABLOCK-RAG-ENGINE
 *
 * IdeaBlock-level retrieval: rank a corpus of IdeaBlocks (the atomic
 * question/answer units E1 extracts and E2 deduplicates) against a free-
 * text query by cosine similarity over embeddings, returning the top-K
 * blocks each with its answer and a source back-link.
 *
 * Why IdeaBlock-level beats chunk-window retrieval (the unit's premise):
 * a legacy RAG splits a note into arbitrary fixed-size windows, so a
 * window routinely straddles two unrelated topics — a query that matches
 * topic A is diluted by topic B sharing the window, depressing its
 * score. An IdeaBlock is ONE atomic claim; the query matches it cleanly.
 * The companion `chunkWindowBaseline()` export implements the naive
 * window retriever so the advantage is an A/B measurement, not a claim
 * (see IdeaBlockRagEngine.test.ts — a 20-query eval set reports the
 * mean-reciprocal-rank lift).
 *
 * SPEC NOTE — the unit envelope frames E3 as a drop-in replacement for an
 * `ObsidianMemoryRagEngine` and an "A/B against the old engine". No such
 * engine exists anywhere in the tree (verified 2026-05-17) — the baseline
 * was never built. So E3 ships as a standalone IdeaBlock retriever with a
 * clean public API plus the `chunkWindowBaseline()` comparator (the A/B
 * is self-contained and real). The "drop-in" exit condition is recorded
 * as a spec deviation, not silently faked.
 *
 * Two-phase, mirroring the B3/B5/B6/D5/E2 family:
 *   1. rankVectors(queryVec, items, opts) — PURE deterministic core: rank
 *      pre-embedded {block,vector} pairs by cosine. No I/O, no embedder.
 *   2. retrieve(query, blocks, opts) — public path: schema-validate each
 *      untrusted block, embed the query + blocks via the injected
 *      embedder (DI; default deterministic fallback so it works with
 *      Qdrant/Ollama DOWN), delegate to rankVectors.
 *
 * Determinism: ranking sorts by score descending, ties broken by block
 * `id` ascending; `now` injectable for byte-stable timestamps.
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/E3/U-IDEABLOCK-RAG-ENGINE
 * @module engines/IdeaBlockRagEngine
 */

import { z } from "zod";
import { IdeaBlockSchema, type IdeaBlock } from "../schemas/ideaBlockSchema.js";

// ---------- Public types -----------------------------------------------------

export interface RagVectorItem {
  block: IdeaBlock;
  vector: number[];
}

export interface RagResult {
  block: IdeaBlock;
  /** Cosine similarity to the query (−1..1; typically 0..1). */
  score: number;
  /** 1-based rank in the returned list. */
  rank: number;
  /** Back-link `source_path:source_offset` for provenance display. */
  sourceLink: string;
}

export interface IdeaBlockRagResult {
  query: string;
  results: RagResult[];
  /** Count of valid candidate blocks actually ranked. */
  totalCandidates: number;
  topK: number;
  minScore: number;
  warnings: string[];
  /** ISO-8601 (pinned via opts.now for determinism). */
  generatedAt: string;
}

/** One result of the naive chunk-window baseline retriever. */
export interface ChunkResult {
  /** The window text. */
  chunk: string;
  sourceLink: string;
  score: number;
  rank: number;
}

export interface SourceDoc {
  source_path: string;
  text: string;
}

export interface IdeaBlockRagOptions {
  /** Max results to return (default 5). */
  topK?: number;
  /** Drop results scoring below this cosine (default 0 — no floor). */
  minScore?: number;
  /** Injected embedder: text → dense vector. Omitted → deterministic fallback. */
  embed?: (text: string) => number[];
  /** Override "now" (ms epoch) for deterministic timestamps in tests. */
  now?: number;
  /** chunkWindowBaseline only: lines per window (default 8). */
  windowLines?: number;
  /** chunkWindowBaseline only: line stride between windows (default = windowLines). */
  windowStride?: number;
}

// ---------- Defaults ---------------------------------------------------------

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0;
const DEFAULT_WINDOW_LINES = 8;
const FALLBACK_EMBED_DIM = 256;

const TOP_K_CEIL = 200;
const WINDOW_LINES_CEIL = 1000;
const MAX_DOC_BYTES = 2_000_000;

export const IdeaBlockRagOptionsSchema = z.object({
  topK: z.number().int().min(1).max(TOP_K_CEIL).optional(),
  minScore: z.number().min(-1).max(1).optional(),
  embed: z.function().optional(),
  now: z.number().finite().optional(),
  windowLines: z.number().int().min(1).max(WINDOW_LINES_CEIL).optional(),
  windowStride: z.number().int().min(1).max(WINDOW_LINES_CEIL).optional(),
}).passthrough();

function validateOptions(opts: IdeaBlockRagOptions): IdeaBlockRagOptions {
  IdeaBlockRagOptionsSchema.parse(opts);
  return opts;
}

// ---------- Helpers (pure) ---------------------------------------------------

/**
 * Dense cosine similarity. Returns 0 (no match) for dim mismatch, zero
 * vector, or any non-finite component — so embedding-poison can never
 * produce a spurious top-rank hit (R12 safe-degrade). Clamped to [−1,1].
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i];
    const vb = b[i];
    if (!Number.isFinite(va) || !Number.isFinite(vb)) return 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0 || !Number.isFinite(denom)) return 0;
  const sim = dot / denom;
  if (!Number.isFinite(sim)) return 0;
  if (sim > 1) return 1;
  if (sim < -1) return -1;
  return sim;
}

/**
 * Deterministic local fallback embedder — hashed bag-of-words (term
 * frequency). Each lowercased word (length ≥ 2, NFC-normalized) is FNV-1a
 * hashed into one of FALLBACK_EMBED_DIM buckets and its count incremented.
 * NOT semantically strong (production wires a real Qdrant/Ollama embedder
 * via opts.embed); its contract: identical text → identical vector, texts
 * sharing vocabulary → high cosine. WORD-level (not char-bigram) on
 * purpose — retrieval must separate distinct topic vocabularies, which a
 * char-bigram embedder smears together. Pure + dependency-free.
 */
function fallbackEmbed(text: string): number[] {
  const v = new Array<number>(FALLBACK_EMBED_DIM).fill(0);
  const words = text.toLowerCase().normalize("NFC").split(/[^a-z0-9]+/);
  for (const w of words) {
    if (w.length < 2) continue;
    let h = 2166136261; // FNV-1a 32-bit offset basis
    for (let i = 0; i < w.length; i++) {
      h ^= w.charCodeAt(i);
      h = Math.imul(h, 16777619); // FNV-1a prime
    }
    v[(h >>> 0) % FALLBACK_EMBED_DIM] += 1;
  }
  return v;
}

/** Canonical text of a block for embedding (question + answer). */
function blockText(b: IdeaBlock): string {
  return `${b.question}\n${b.answer}`;
}

/** Provenance back-link for a block. */
function sourceLinkOf(b: IdeaBlock): string {
  return `${b.source_path}:${b.source_offset}`;
}

// ---------- Engine -----------------------------------------------------------

export class IdeaBlockRagEngine {
  readonly name = "IdeaBlockRagEngine";

  /**
   * PURE core — rank pre-embedded {block,vector} items against a query
   * vector by cosine. No I/O. Deterministic: score-descending, ties
   * broken by block id ascending. Never throws.
   *
   * @param queryVec  Embedded query.
   * @param items     Candidate {block,vector} pairs.
   * @param opts      topK / minScore / now.
   */
  rankVectors(queryVec: number[], items: RagVectorItem[], opts: IdeaBlockRagOptions = {}): IdeaBlockRagResult {
    validateOptions(opts);
    const now = opts.now ?? Date.now();
    const generatedAt = new Date(now).toISOString();
    const topK = clampInt(opts.topK, DEFAULT_TOP_K, 1, TOP_K_CEIL);
    const minScore = clampUnitSigned(opts.minScore, DEFAULT_MIN_SCORE);
    const warnings: string[] = [];

    const scored = items.map((it) => ({
      block: it.block,
      score: cosineSimilarity(queryVec, it.vector),
    }));
    // Score desc; deterministic tie-break by id asc.
    scored.sort((a, b) => (b.score - a.score) || a.block.id.localeCompare(b.block.id));

    const results: RagResult[] = [];
    for (const s of scored) {
      if (s.score < minScore) continue;
      if (results.length >= topK) break;
      results.push({
        block: s.block,
        score: s.score,
        rank: results.length + 1,
        sourceLink: sourceLinkOf(s.block),
      });
    }

    return {
      query: "",
      results,
      totalCandidates: items.length,
      topK,
      minScore,
      warnings,
      generatedAt,
    };
  }

  /**
   * Public path — embed the query + each (schema-validated) block via the
   * injected embedder (or deterministic fallback), then rank. A block that
   * fails IdeaBlockSchema is dropped with a warning (fail-loud, never a
   * silent skip). Never throws.
   *
   * @param query   Free-text query.
   * @param blocks  Raw IdeaBlocks (untrusted — e.g. dispatcher input).
   * @param opts    topK / minScore / embed / now.
   */
  retrieve(query: string, blocks: unknown[], opts: IdeaBlockRagOptions = {}): IdeaBlockRagResult {
    validateOptions(opts);
    const embed = opts.embed ?? fallbackEmbed;
    const now = opts.now ?? Date.now();

    if (typeof query !== "string" || query.trim().length === 0) {
      return {
        query: typeof query === "string" ? query : "",
        results: [],
        totalCandidates: 0,
        topK: clampInt(opts.topK, DEFAULT_TOP_K, 1, TOP_K_CEIL),
        minScore: clampUnitSigned(opts.minScore, DEFAULT_MIN_SCORE),
        warnings: ["empty query — nothing to retrieve"],
        generatedAt: new Date(now).toISOString(),
      };
    }
    if (!Array.isArray(blocks)) {
      const r = this.rankVectors([], [], opts);
      r.query = query;
      r.warnings.push("blocks input is not an array — treated as empty");
      return r;
    }

    const preWarnings: string[] = [];
    let queryVec: number[];
    try {
      queryVec = embed(query);
    } catch (e) {
      const r = this.rankVectors([], [], opts);
      r.query = query;
      r.warnings.push(`query embed threw — empty result (${e instanceof Error ? e.message : String(e)})`);
      return r;
    }
    if (!Array.isArray(queryVec) || queryVec.length === 0) {
      const r = this.rankVectors([], [], opts);
      r.query = query;
      r.warnings.push("query embed returned empty — empty result");
      return r;
    }

    const items: RagVectorItem[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const parsed = IdeaBlockSchema.safeParse(blocks[i]);
      if (!parsed.success) {
        preWarnings.push(`block[${i}] failed IdeaBlockSchema (${parsed.error.issues.length} issue(s)) — dropped`);
        continue;
      }
      let vec: number[];
      try {
        vec = embed(blockText(parsed.data));
      } catch (e) {
        preWarnings.push(`embed for block[${i}] (${parsed.data.id}) threw — dropped (${e instanceof Error ? e.message : String(e)})`);
        continue;
      }
      if (!Array.isArray(vec) || vec.length === 0) {
        preWarnings.push(`embed for block[${i}] (${parsed.data.id}) returned empty — dropped`);
        continue;
      }
      items.push({ block: parsed.data, vector: vec });
    }

    const result = this.rankVectors(queryVec, items, opts);
    result.query = query;
    result.warnings = [...preWarnings, ...result.warnings];
    return result;
  }
}

// ---------- Chunk-window baseline (the A/B comparator) ----------------------

/**
 * Naive fixed-window retrieval — the legacy-RAG baseline E3's A/B measures
 * against. Splits each source doc into windows of `windowLines` lines
 * (stride `windowStride`, default = windowLines → non-overlapping),
 * embeds each window, cosine-ranks against the query. This is the
 * deliberately-weaker comparator: a window mixes whatever topics happen
 * to fall in its line range, diluting any single-topic match.
 *
 * Pure + deterministic; same injected-embedder DI + fallback as the
 * engine. Never throws.
 *
 * @param query  Free-text query.
 * @param docs   Source documents `{ source_path, text }`.
 * @param opts   topK / windowLines / windowStride / embed / now.
 */
export function chunkWindowBaseline(
  query: string,
  docs: SourceDoc[],
  opts: IdeaBlockRagOptions = {},
): ChunkResult[] {
  validateOptions(opts);
  const embed = opts.embed ?? fallbackEmbed;
  const topK = clampInt(opts.topK, DEFAULT_TOP_K, 1, TOP_K_CEIL);
  const windowLines = clampInt(opts.windowLines, DEFAULT_WINDOW_LINES, 1, WINDOW_LINES_CEIL);
  const windowStride = clampInt(opts.windowStride, windowLines, 1, WINDOW_LINES_CEIL);

  if (typeof query !== "string" || query.trim().length === 0) return [];
  if (!Array.isArray(docs)) return [];

  let queryVec: number[];
  try {
    queryVec = embed(query);
  } catch {
    return [];
  }
  if (!Array.isArray(queryVec) || queryVec.length === 0) return [];

  const scored: { chunk: string; sourceLink: string; score: number }[] = [];
  for (const doc of docs) {
    if (!doc || typeof doc.text !== "string" || typeof doc.source_path !== "string") continue;
    if (doc.text.length > MAX_DOC_BYTES) continue; // oversize: skip (bounded)
    const lines = doc.text.split("\n");
    for (let start = 0; start < lines.length; start += windowStride) {
      const window = lines.slice(start, start + windowLines).join("\n");
      if (window.trim().length === 0) continue;
      let vec: number[];
      try {
        vec = embed(window);
      } catch {
        continue;
      }
      if (!Array.isArray(vec) || vec.length === 0) continue;
      scored.push({
        chunk: window,
        sourceLink: `${doc.source_path}:${start}`,
        score: cosineSimilarity(queryVec, vec),
      });
    }
  }
  scored.sort((a, b) => (b.score - a.score) || a.sourceLink.localeCompare(b.sourceLink));
  return scored.slice(0, topK).map((s, i) => ({ ...s, rank: i + 1 }));
}

// ---------- Helpers (pure, shared) ------------------------------------------

function clampInt(v: number | undefined, dflt: number, lo: number, hi: number): number {
  if (v === undefined || v === null || !Number.isFinite(v)) return dflt;
  const n = Math.trunc(v);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/** Clamp to [−1, 1] with NaN/undefined → default (minScore can be negative). */
function clampUnitSigned(v: number | undefined, dflt: number): number {
  if (v === undefined || v === null || !Number.isFinite(v)) return dflt;
  if (v < -1) return -1;
  if (v > 1) return 1;
  return v;
}

// ---------- Helpers exported for tests --------------------------------------

/** @internal — exported for the test suite only; do NOT depend on from prod. */
export const _internals = {
  cosineSimilarity,
  fallbackEmbed,
  blockText,
  sourceLinkOf,
  clampInt,
  clampUnitSigned,
  DEFAULT_TOP_K,
  DEFAULT_WINDOW_LINES,
  FALLBACK_EMBED_DIM,
};

// ---------- Singleton --------------------------------------------------------

export const ideaBlockRagEngine = new IdeaBlockRagEngine();

export default IdeaBlockRagEngine;

export function runIdeaBlockRagRetrieve(
  query: string,
  blocks: unknown[],
  opts: IdeaBlockRagOptions = {},
): IdeaBlockRagResult {
  validateOptions(opts);
  return ideaBlockRagEngine.retrieve(query, blocks, opts);
}
