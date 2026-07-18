#!/usr/bin/env node
/**
 * wiki-promo-rerank.mjs — local-LLM (nomic) cosine rerank for the memory→wiki
 * promotion advisor (`.claude/hooks/stop-memory-to-wiki-suggest.mjs`, U-HRP06).
 *
 * THE GAP IT CLOSES. The advisor suggests which existing wiki entry a freshly
 * written memo should be promoted into / merged with. Its built-in fallback
 * scores the memo summary against wiki entry TITLES by token-set Jaccard — which
 * misses synonymy entirely: a memo summarised "out-of-memory crash bypasses the
 * fail-soft handler" shares ZERO title tokens with the lesson slug
 * `oom-bypasses-fail-soft-catch`, so the keyword path never suggests it. This
 * injects a nomic-embedding cosine rerank: embed the memo summary + each wiki
 * title (slug→words so nomic tokenises the meaning), rank by cosine.
 *
 * $0 Claude tokens — local Ollama `nomic-embed-text` on the resident Blackwell.
 *
 * SYNC-RERANK CONSTRAINT. The advisor calls `rerank(query, titles, topK)`
 * SYNCHRONOUSLY (it is not awaited), so embedding cannot happen inside it. The
 * queries (summaries) are embedded up-front in `prepareNomicRerank` (async); the
 * returned rerank is a pure synchronous cosine lookup. Title embeddings are
 * cached on disk (`ensureTitleEmbeddings`) so only the per-run summaries — a
 * handful — are embedded each fire after the one-time title build.
 *
 * FAIL-OPEN. Ollama down / batch null / both maps empty → `prepareNomicRerank`
 * returns `{ready:false, rerank:null}` and the caller keeps its keyword
 * fallback (the advisor's `ragMode` field records which path actually ran —
 * R12 honest mode surfacing). Disable entirely: PRISM_MEM_TO_WIKI_NOMIC=0.
 */

import { existsSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { embedTextBatch, cosine, loadEmbedCache } from "./memo-embed-lib.mjs";

export const TITLE_CACHE_PATH =
  process.env.PRISM_WIKI_PROMO_EMBED_CACHE ||
  path.join(process.env.PRISM_ROOT || "H:/prism", "state", "shared", "wiki-promo-title-embed-cache.jsonl");

// nomic-embed cosines run high (related text 0.5-0.8). F3 uses a 0.60 floor for
// the noisier filename→memo query; here both sides are clean prose/slug-words so
// 0.50 keeps genuine cross-synonym matches without flooding loose ones. Tune:
// PRISM_WIKI_PROMO_MIN_SCORE.
export const NOMIC_MIN_SCORE = Number(process.env.PRISM_WIKI_PROMO_MIN_SCORE) || 0.5;
// Cache entries are tagged with the embedding model so a model swap re-embeds
// (a stale-vector guard) — loadEmbedCache surfaces the tag as `hash`.
export const CACHE_MODEL_TAG = process.env.PRISM_EMBED_MODEL || "nomic-embed-text";
// Per-run embed ceiling: bound the one-time title build so a cold cache never
// stalls the Stop hook unbounded. 600 covers the full lessons+architecture
// candidate set (≤484); a smaller value warms over several runs.
const MAX_EMBED_PER_RUN = Number(process.env.PRISM_WIKI_PROMO_MAX_EMBED) || 600;
// Ollama /api/embed rejects an oversized input array (a ~500-string request
// returns a count-mismatch → null). Embed in chunks so each request stays small
// and a single chunk failure only loses that chunk (partial coverage > none).
const EMBED_CHUNK = Number(process.env.PRISM_WIKI_PROMO_EMBED_CHUNK) || 64;
// The title build runs ON the Stop hook, so the TOTAL wall-clock — not just the
// title COUNT — must stay under the hook budget (settings.json timeout 12000ms).
// A per-chunk AbortController ceiling alone is not enough: 8 chunks × a high
// ceiling could serially exceed the budget on a cold cache / model swap (the P1
// a reviewer caught). So the chunk loop also honours a cumulative deadline —
// once it passes, the loop stops issuing chunks and the remaining titles warm on
// the next run (count- AND time-bounded). A healthy Ollama embeds ≤484 titles in
// ~2-3s; the bounds only bite on a cold/slow path.
//   Worst-case wall-clock must fit the hook's 12000ms Stop budget. The deadline
//   is checked BEFORE a chunk, so one in-flight chunk can overshoot it: title
//   build ≤ deadline(4000) + one chunk(3500) = 7500ms, + the query embed
//   (QUERY_TIMEOUT_MS 3000) ≈ 10.5s < 12s, with headroom for import + cache I/O.
const CHUNK_TIMEOUT_MS = Number(process.env.PRISM_WIKI_PROMO_CHUNK_TIMEOUT_MS) || 3500;
const BUILD_DEADLINE_MS = Number(process.env.PRISM_WIKI_PROMO_BUILD_DEADLINE_MS) || 4000;
// Query (memo-summary) embed ceiling, kept tight so build + query stays < budget.
export const QUERY_TIMEOUT_MS = Number(process.env.PRISM_WIKI_PROMO_QUERY_TIMEOUT_MS) || 3000;

/**
 * kebab/underscore slug → space-separated words so nomic tokenises the meaning
 * rather than one opaque token. "oom-bypasses-fail-soft-catch" →
 * "oom bypasses fail soft catch". Pure.
 */
export function slugToWords(slug) {
  return String(slug || "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

// Atomic full rewrite of the JSONL cache (temp + rename — never a torn line if
// the process dies mid-write). The caller passes the COMPLETE set to persist,
// so a rewrite also PRUNES entries no longer present (renamed/deleted wiki
// titles) — the cache can't grow unbounded. Best-effort: a write failure leaves
// recall working this run via the in-memory map. Concurrent slots →
// last-writer-wins (the loser's fresh entries re-embed next run; never corrupt).
function writeCache(cachePath, entries) {
  try {
    const dir = path.dirname(cachePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const body = entries
      .map((e) => JSON.stringify({ name: e.name, vec: e.vec, hash: CACHE_MODEL_TAG }))
      .join("\n");
    const tmp = `${cachePath}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, body ? body + "\n" : "");
    renameSync(tmp, cachePath);
  } catch { /* best-effort cache write */ }
}

/**
 * Ensure every title has a cached nomic embedding; build the missing ones
 * (bounded by maxEmbed), persist, and return Map<title,{vec,hash}>.
 * Side effects: one Ollama batch call + one atomic cache write. A null batch
 * (Ollama down) leaves whatever was already cached — the caller fails open.
 */
export async function ensureTitleEmbeddings(titles, opts = {}) {
  const cachePath = opts.cachePath || TITLE_CACHE_PATH;
  const embedBatch = opts.embedBatch || embedTextBatch;
  const maxEmbed = Number.isFinite(opts.maxEmbed) ? opts.maxEmbed : MAX_EMBED_PER_RUN;
  const timeoutMs = opts.timeoutMs ?? CHUNK_TIMEOUT_MS;
  const deadlineMs = Number.isFinite(opts.deadlineMs) ? opts.deadlineMs : BUILD_DEADLINE_MS;
  const chunkSize = Number.isFinite(opts.chunkSize) ? opts.chunkSize : EMBED_CHUNK;
  const clock = typeof opts.now === "function" ? opts.now : () => Date.now();
  const map = loadEmbedCache(cachePath) || new Map();
  const uniq = [...new Set((titles || []).filter((t) => typeof t === "string" && t.length > 0))];
  const liveSet = new Set(uniq);
  // Re-embed titles that are uncached OR cached under a DIFFERENT model tag — the
  // stale-vector guard (a model swap must re-embed, not reuse vectors from a
  // different embedding space; cosine across spaces is meaningless).
  const missing = uniq
    .filter((t) => { const e = map.get(t); return !e || e.hash !== CACHE_MODEL_TAG; })
    .slice(0, Math.max(0, maxEmbed));
  let dirty = false;
  if (missing.length > 0) {
    const start = clock();
    for (let off = 0; off < missing.length; off += chunkSize) {
      // Time-bound the build so a cold cache / model swap can never serially
      // exceed the Stop-hook budget; remaining titles warm on the next run.
      if (clock() - start > deadlineMs) break;
      const slice = missing.slice(off, off + chunkSize);
      const vecs = await embedBatch(slice.map(slugToWords), { timeoutMs });
      if (!Array.isArray(vecs)) continue; // chunk failed → skip, keep the rest
      for (let i = 0; i < slice.length; i++) {
        const v = vecs[i];
        if (Array.isArray(v) && v.length > 0) { map.set(slice[i], { vec: v, hash: CACHE_MODEL_TAG }); dirty = true; }
      }
    }
  }
  // Persist the live candidate set's vectors only — this both records the fresh
  // embeddings AND prunes stale entries (titles no longer in the candidate set).
  // Skip the rewrite when nothing changed and no stale entry exists (no per-fire I/O).
  const hasStale = [...map.keys()].some((k) => !liveSet.has(k));
  if (dirty || hasStale) {
    const keep = uniq.filter((t) => map.has(t)).map((t) => ({ name: t, vec: map.get(t).vec }));
    writeCache(cachePath, keep);
  }
  // Return only the live subset (callers cosine against candidate titles only).
  const out = new Map();
  for (const t of uniq) if (map.has(t)) out.set(t, map.get(t));
  return out;
}

/**
 * Build the SYNCHRONOUS rerank the advisor needs. Pre-embeds the queries
 * (memo summaries) here (async) so the returned fn is a pure cosine lookup.
 *
 *   queries  : string[]  memo summaries — embedded up-front, keyed verbatim.
 *   titleMap : Map<title,{vec}>  from ensureTitleEmbeddings.
 *
 * Returns { rerank, ready, reason }:
 *   ready=false → caller passes rerank=null and keeps its keyword fallback.
 *   rerank(query, candidateTitles, topK) → [{candidate, score}] (sync), or null
 *     when that specific query was not embedded (advisor then skips that memo —
 *     never a wrong suggestion).
 */
export async function prepareNomicRerank({
  queries,
  titleMap,
  embedBatch = embedTextBatch,
  minScore = NOMIC_MIN_SCORE,
  timeoutMs = QUERY_TIMEOUT_MS,
} = {}) {
  if (!titleMap || titleMap.size === 0) return { rerank: null, ready: false, reason: "no-title-embeddings" };
  const qs = [...new Set((queries || []).filter((q) => typeof q === "string" && q.trim().length > 0))];
  if (qs.length === 0) return { rerank: null, ready: false, reason: "no-queries" };
  const qvecs = await embedBatch(qs, { timeoutMs });
  if (!Array.isArray(qvecs)) return { rerank: null, ready: false, reason: "embed-failed" };
  const qmap = new Map();
  for (let i = 0; i < qs.length; i++) {
    if (Array.isArray(qvecs[i]) && qvecs[i].length > 0) qmap.set(qs[i], qvecs[i]);
  }
  if (qmap.size === 0) return { rerank: null, ready: false, reason: "embed-empty" };
  const rerank = (query, candidateTitles, topK) => {
    const qv = qmap.get(query);
    if (!qv || !Array.isArray(candidateTitles)) return null;
    const scored = [];
    for (const t of candidateTitles) {
      const entry = titleMap.get(t);
      if (!entry || !Array.isArray(entry.vec)) continue;
      const s = cosine(qv, entry.vec);
      if (s >= minScore) scored.push({ candidate: t, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  };
  return { rerank, ready: true, reason: "ok", embeddedQueries: qmap.size };
}
