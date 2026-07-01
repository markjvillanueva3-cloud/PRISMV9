#!/usr/bin/env node
/**
 * embed-all-wiki.mjs — RAG-UPGRADE-MS0 / U-RAG-1 (2026-05-22, slot golf).
 *
 * Batch driver over embed-wiki-into-tribal-index.mjs: recursively enumerates
 * every `knowledge/wiki/**\/*.md` and embeds it into `tribal-embed-index.json`
 * so the tribal-by-domain injection pipeline (tribal-by-domain-inject →
 * tribal-rerank → cosine) can actually reach the wiki corpus. The SessionStart
 * audit measured 0.8% coverage (23,802 / 23,992 unembedded) — not a no-op bug,
 * just: the per-file script was only ever run on a 3-file final batch.
 *
 * ## Embedder parity (deliberate — do NOT "optimize" to the GPU NIM)
 *
 * Embeds with `nomic-embed-text:latest` (768-d) via Ollama — the SAME model
 * `tribal-rerank.mjs` embeds QUERIES with. Cosine similarity is only valid
 * when corpus and query share a vector space. The GPU `nv-embedqa-e5-v5` NIM
 * is 1024-d / a different space — using it for the corpus while queries stay
 * nomic produces meaningless scores AND trips embed-wiki's index-`dim`
 * assertion. A GPU-embedder swap is a joint corpus+query migration, tracked
 * separately as U-RAG-6.
 *
 * ## Resumable
 *
 * The index is keyed by entry `id`; `planAppend()` skips already-present ids,
 * so re-running continues where a prior run / crash / Ollama outage stopped.
 * Disk is checkpointed every `--batch` entries (default 500) — an outage loses
 * at most one batch. A `state/shared/embed-all-wiki-progress.json` sidecar
 * records live progress for post-/compact resume.
 *
 * ## Concurrency + shard-safety (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10)
 *
 * Each flush() is a SHORT critical section under withTribalIndexLock: it
 * re-reads the index FRESH inside the lock, splices this batch's pending entries,
 * and writes via writeTribalIndexGuarded (manifest-aware + shard-aware + the
 * >50%-shrink clobber-guard). A peer-held lock leaves the index UNTOUCHED and
 * aborts the run (EXIT_TRIBAL_INDEX_LOCK_SKIP) so a re-run resumes via
 * planAppend's id-skip. The slow embed happens OUTSIDE the lock (in the loop).
 * atomicWriteJSON is retained only for the small PROGRESS_PATH sidecar.
 *
 * ## Run
 *   node scripts/embed-all-wiki.mjs                              # dry-run: count + plan
 *   node scripts/embed-all-wiki.mjs --apply                      # full corpus embed
 *   node scripts/embed-all-wiki.mjs --apply --limit 25           # smoke test
 *   node scripts/embed-all-wiki.mjs --apply --with-context       # full corpus + U-RAG-3 blurbs
 *
 * ## --with-context (U-RAG-3-BATCH-CONTEXT-PLUMBING, 2026-05-22)
 *
 * Mirrors the per-file embedder's `--with-context` flag: for each file, a
 * 1-2 sentence context blurb is generated via Ollama (qwen2.5-coder:7b) and
 * prepended to the body before embedding. A torn-write-safe `.blurbs-cache.
 * json` sidecar checkpoints alongside the index so an Ollama outage doesn't
 * re-pay for blurbs already generated. A single blurb failure (timeout,
 * malformed response) returns null and falls back to raw-chunk embed for that
 * file — never aborts the pass. Cache keys include `BLURB_VERSION`, so a
 * future v1→v2 prompt bump self-invalidates every entry.
 *
 * Knobs: PRISM_WIKI_ROOT · --batch N · --limit N · --json · --with-context
 */

import fs from "node:fs";
import path from "node:path";
import {
  INDEX_PATH, flattenBody, buildEntry, embedText, planAppend, spliceEntries,
  makeWinPath, OLLAMA_URL,
} from "./embed-wiki-into-tribal-index.mjs";
import {
  generateBlurb, prependBlurb, BLURB_VERSION,
  loadBlurbCache, saveBlurbCache, readCacheHit, writeCacheHit,
} from "./lib/contextual-blurb.mjs";
// Shard-safe, clobber-guarded INDEX IO + the cross-process lock. This batch
// driver (the production brain-refresh wiki-tribal stage) is the HIGHEST-throughput
// tribal-index writer -- the one whose full-corpus flush() crosses 480 MiB and
// shards. It was monolith-only JSON.parse(readFileSync) + a lock-LESS local
// atomicWriteJSON -> the clobber vector. atomicWriteJSON is RETAINED below only
// for the small PROGRESS_PATH sidecar (NOT the index). U-TRIBAL-SIBLING-WRITER-
// SHARD-SAFE 2026-06-10. [[reference_tribal_shard_read_clobber_2026_06_10]]
import { readTribalIndexGuarded, writeTribalIndexGuarded } from "./lib/tribal-index-guarded-io.mjs";
import { withTribalIndexLock, EXIT_TRIBAL_INDEX_LOCK_SKIP } from "./lib/tribal-index-lock.mjs";

export const WIKI_ROOT = process.env.PRISM_WIKI_ROOT || "H:/prism/knowledge/wiki";
export const PROGRESS_PATH = "H:/prism/state/shared/embed-all-wiki-progress.json";

/**
 * Max chars of flattened body sent to the embedder. Ollama runs
 * nomic-embed-text with a modest default context — empirically even a
 * 16000-char input still 500s ("input length exceeds the context length").
 * 6000 chars (~1500-2000 tokens) clears it with margin; it is a rich,
 * in-limit prefix and cosine parity with short queries is unaffected. The
 * embed loop additionally SKIPS (does not abort on) any file that still
 * overflows — see main() — so one pathological file can't kill the backfill.
 */
export const MAX_EMBED_CHARS = 6000;

/**
 * U-RAG-3-BATCH-CONTEXT-PLUMBING — R12 fail-loud threshold.
 * If `--with-context` is requested AND more than this fraction of blurb
 * generations fail (Ollama down, qwen unloaded, model name typo), the success
 * summary is reported as `degraded:true` with exit code 2. Without this, the
 * batch can run to "completion" while having silently fallen back to raw-chunk
 * embed for the entire corpus — the operator would see `ok:true` for a pass
 * that did NOT actually deliver contextual retrieval. 0.5 = "majority failed".
 */
export const DEGRADED_BLURB_FAILURE_THRESHOLD = 0.5;

/**
 * Pure decision: given counters from a `--with-context` run, return whether
 * the pass should be flagged `degraded` (R12 fail-loud). `degraded:false` is
 * returned when no blurbs were attempted (`--with-context` not active) so the
 * caller can spread this result unconditionally.
 *
 * @param {{blurbHits:number, blurbCacheHits:number, blurbMisses:number, threshold?:number}} c
 * @returns {{degraded:boolean, reason:string|null, attempted:number, failureRate:number}}
 */
export function evaluateContextualDegradation(c) {
  const hits = Number(c?.blurbHits) || 0;
  const cacheHits = Number(c?.blurbCacheHits) || 0;
  const misses = Number(c?.blurbMisses) || 0;
  const threshold = typeof c?.threshold === "number" ? c.threshold : DEGRADED_BLURB_FAILURE_THRESHOLD;
  const attempted = hits + cacheHits + misses;
  if (attempted === 0) return { degraded: false, reason: null, attempted: 0, failureRate: 0 };
  const failureRate = misses / attempted;
  if (failureRate <= threshold) return { degraded: false, reason: null, attempted, failureRate };
  return {
    degraded: true,
    reason:
      `blurb-failure rate ${(failureRate * 100).toFixed(1)}% exceeds ` +
      `${(threshold * 100).toFixed(0)}% threshold — ` +
      `${misses} of ${attempted} files fell back to raw-chunk embed. ` +
      `Check Ollama health (qwen2.5-coder loaded? daemon responding?) and rerun.`,
    attempted,
    failureRate,
  };
}

/** Clamp a body to MAX_EMBED_CHARS for embedding (leading prefix kept). */
export function clampForEmbedding(text) {
  if (typeof text !== "string") return "";
  return text.length > MAX_EMBED_CHARS ? text.slice(0, MAX_EMBED_CHARS) : text;
}

/**
 * Recursively collect every `*.md` path under `dir`. Unreadable directories
 * are skipped (returns what it has) rather than throwing — a permission blip
 * on one subtree must not abort a 24K-file backfill. Pure given `fs`.
 */
export function collectMarkdown(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectMarkdown(full, out);
    else if (e.isFile() && /\.md$/i.test(e.name)) out.push(full);
  }
  return out;
}

/**
 * Infer a tribal domain from the wiki path. Must return a member of
 * embed-wiki's VALID_DOMAINS (mill|lathe|wedm|cad|cam|backend-dev|general) —
 * a domain the rerank cannot match silently loses the in-domain boost. Most
 * of the wiki is architecture/concepts, so the safe default is "general";
 * only an explicit domain path segment overrides it.
 */
export function inferDomain(filePath) {
  const p = filePath.replace(/\\/g, "/").toLowerCase();
  if (/\/(wedm|wire-edm)\b/.test(p)) return "wedm";
  if (/\/lathe\b/.test(p)) return "lathe";
  if (/\/mill(ing)?\b/.test(p)) return "mill";
  if (/\/cam\b/.test(p)) return "cam";
  if (/\/cad\b/.test(p)) return "cad";
  if (/\/(code-tribal|software-engineering)\//.test(p)) return "backend-dev";
  return "general";
}

/** Torn-write-safe write (temp + rename). Not concurrent-writer safe — see header. */
export function atomicWriteJSON(outPath, obj) {
  const tmp = `${outPath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, outPath);
}

export function parseArgs(argv) {
  const opts = { apply: false, json: false, batch: 500, limit: 0, withContext: false, status: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") opts.apply = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--with-context") opts.withContext = true;
    else if (a === "--status") opts.status = true;
    else if (a === "--batch") { const n = Number(argv[++i]); opts.batch = n > 0 ? Math.floor(n) : 500; }
    else if (a === "--limit") { const n = Number(argv[++i]); opts.limit = n > 0 ? Math.floor(n) : 0; }
  }
  return opts;
}

/**
 * Pure: classify the embed-progress marker's HONEST state. A "running" marker is a
 * LIE once its writer has died -- a fleet-reaper SIGKILL leaves state:"running" forever
 * (the catch-based "aborted" flip at the Ollama-error path never fires on SIGKILL).
 * Returns "stale" when a "running" marker's pid is dead OR its heartbeat is older than
 * stalenessMs, so no inspector is fooled. Terminal states (done/aborted) are verbatim.
 * pid is the SIGKILL-robust signal; time-staleness is the fallback for old (pid-less) markers.
 * @param {object|null} marker  parsed PROGRESS_PATH json
 * @param {{nowMs?:number, isPidAlive?:(p:number)=>boolean, stalenessMs?:number}} [o]
 * @returns {{state:string, stale:boolean, reason:(string|null), ageMs:(number|null)}}
 */
export function classifyEmbedProgress(marker, o = {}) {
  if (!marker || typeof marker !== "object" || typeof marker.state !== "string") {
    return { state: "unknown", stale: false, reason: "no/invalid marker", ageMs: null };
  }
  if (marker.state !== "running") {
    return { state: marker.state, stale: false, reason: null, ageMs: null };
  }
  const nowMs = Number.isFinite(o.nowMs) ? o.nowMs : Date.now();
  const stalenessMs = Number.isFinite(o.stalenessMs) ? o.stalenessMs : 15 * 60 * 1000;
  const parsed = Date.parse(marker.updatedAt);
  const ageMs = Number.isFinite(parsed) ? nowMs - parsed : null;
  let pidDead = false;
  if (Number.isInteger(marker.pid) && typeof o.isPidAlive === "function") {
    pidDead = !o.isPidAlive(marker.pid);
  }
  const timeStale = ageMs != null && ageMs > stalenessMs;
  if (pidDead || timeStale) {
    return {
      state: "stale", stale: true,
      reason: pidDead ? "writer pid is dead" : "heartbeat older than stalenessMs",
      ageMs,
    };
  }
  return { state: "running", stale: false, reason: null, ageMs };
}

/** Best-effort liveness probe for a pid (SIGKILL-robust). EPERM => exists but not ours. */
export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return !!(e && e.code === "EPERM"); }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const out = (obj, code = 0) => {
    process.stdout.write(JSON.stringify(obj));
    process.exit(code);
  };

  // --status: report the HONEST progress state (a dead "running" marker reads as
  // "stale", not a lie). Reads only the sidecar; never touches the index/embedder.
  if (opts.status) {
    let marker = null;
    try { marker = JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8")); }
    catch { /* no/unreadable sidecar => unknown */ }
    const honest = classifyEmbedProgress(marker, { isPidAlive });
    out({ ok: true, progressPath: PROGRESS_PATH, marker, honest });
  }

  // Manifest-aware: a SHARDED index has no monolith .json, so a monolith-only
  // existsSync would false-"not found" a perfectly good sharded brain.
  if (!fs.existsSync(INDEX_PATH) && !fs.existsSync(INDEX_PATH.replace(/\.json$/i, "") + ".manifest.json")) {
    out({ ok: false, error: `index not found: ${INDEX_PATH}` }, 2);
  }
  if (!fs.existsSync(WIKI_ROOT)) out({ ok: false, error: `wiki root not found: ${WIKI_ROOT}` }, 2);

  let all = collectMarkdown(WIKI_ROOT);
  if (opts.limit > 0) all = all.slice(0, opts.limit);

  const idx = readTribalIndexGuarded(INDEX_PATH); // manifest-aware + V8-cap-safe (planning view)
  const expectedDim = Number(idx.dim) > 0 ? Number(idx.dim) : 768;
  const plan = planAppend(idx, all, false);
  const todo = plan.toAdd;

  const summary = {
    ok: true, apply: opts.apply, wikiRoot: WIKI_ROOT,
    totalMd: all.length, alreadyEmbedded: plan.skipped.length,
    toEmbed: todo.length, indexEntriesBefore: plan.total, batch: opts.batch,
  };
  if (!opts.apply) out({ ...summary, note: "dry-run — rerun with --apply" });
  if (!todo.length) out({ ...summary, done: 0, failed: 0, note: "nothing to embed — corpus fully covered" });

  // U-RAG-3-BATCH-CONTEXT-PLUMBING: the per-file embedder supports
  // `--with-context` (Contextual Retrieval blurb prepended before embed); this
  // batch driver mirrors that pipeline so the full-corpus pass is actually
  // operator-runnable. When opts.withContext is false, the entire block is a
  // no-op — existing pass-without-context callers are unaffected.
  const BLURB_CACHE_PATH = INDEX_PATH.replace(/(\.json)?$/, ".blurbs-cache.json");
  const blurbCache = opts.withContext ? loadBlurbCache(BLURB_CACHE_PATH) : null;
  let blurbCacheDirty = false;
  let blurbHits = 0, blurbMisses = 0, blurbCacheHits = 0;

  let done = 0, failed = 0, pending = [];
  const t0 = Date.now();
  const flush = () => {
    if (!pending.length) return true;
    // Persist under the cross-process lock (shard-safe + clobber-guarded). RE-READ
    // FRESH inside the lock (a peer embedder may have written during our slow embed
    // pass), splice OUR pending entries into the fresh copy, guarded write. This is
    // the SHORT critical section; the slow embed happens in the loop OUTSIDE it.
    // prevCount = count BEFORE our splice (we only add/replace, never shrink).
    // {ran:false} => a peer holds the lock; pending is NOT drained (index UNTOUCHED)
    // and the caller aborts gracefully so a re-run resumes via planAppend's skip.
    const r = withTribalIndexLock(INDEX_PATH, () => {
      const fresh = readTribalIndexGuarded(INDEX_PATH);
      if (!Array.isArray(fresh.entries)) {
        throw new Error("tribal-embed-index entries not an array -- refusing to write (R12 schema-probe)");
      }
      const prevCount = fresh.entries.length;
      spliceEntries(fresh, pending);
      writeTribalIndexGuarded(fresh, INDEX_PATH, { prevCount });
      idx.entries = fresh.entries; // keep the running view consistent for the final summary
    });
    if (!r.ran) return false; // peer holds the lock -- pending preserved, caller aborts
    pending = [];
    // Persist blurb-cache alongside index checkpoints so an Ollama outage mid-
    // corpus doesn't lose the qwen2.5-coder generations we already paid for.
    if (opts.withContext && blurbCacheDirty) {
      saveBlurbCache(BLURB_CACHE_PATH, blurbCache);
      blurbCacheDirty = false;
    }
    return true;
  };
  const progress = (state) => {
    try {
      atomicWriteJSON(PROGRESS_PATH, {
        schemaVersion: 2, unit: "RAG-UPGRADE-MS0/U-RAG-1", state,
        pid: process.pid,
        totalMd: all.length, toEmbed: todo.length, done, failed,
        elapsedSec: Math.round((Date.now() - t0) / 1000),
        updatedAt: new Date().toISOString(),
      });
    } catch { /* progress sidecar is best-effort */ }
  };
  progress("running");

  for (const w of todo) {
    let raw;
    try { raw = fs.readFileSync(w.fp, "utf8"); }
    catch { failed++; continue; }
    const body = flattenBody(raw);
    if (!body) { failed++; continue; }   // empty wiki file — don't embed noise

    // U-RAG-3: optionally generate or read-from-cache a 1-2 sentence context
    // blurb to prepend before embed. Mirror the per-file embedder semantics
    // exactly: cache key includes BLURB_VERSION (bumping the version self-
    // invalidates every entry, preventing silent reads of stale v1 blurbs);
    // a blurb failure (Ollama timeout, malformed response) returns null and we
    // fall back to raw-chunk embed for that file rather than aborting.
    let context = null;
    if (opts.withContext) {
      let mtimeMs = 0;
      try { mtimeMs = fs.statSync(w.fp).mtimeMs || 0; } catch { /* mtime best-effort */ }
      const cacheKey = `${makeWinPath(w.fp)}:${BLURB_VERSION}`;
      const cached = readCacheHit(blurbCache, cacheKey, mtimeMs);
      if (cached) { context = cached; blurbCacheHits++; }
      else {
        const blurb = await generateBlurb(body, { ollamaUrl: OLLAMA_URL });
        if (blurb) {
          context = blurb;
          writeCacheHit(blurbCache, cacheKey, blurb, mtimeMs);
          blurbCacheDirty = true;
          blurbHits++;
        } else {
          blurbMisses++;
        }
      }
    }
    const textForEmbed = context ? prependBlurb(context, body) : body;

    let embedding;
    try {
      embedding = await embedText(clampForEmbedding(textForEmbed), fetch, expectedDim);
    } catch (e) {
      const msg = String((e && e.message) || e);
      // A single file whose flattened body still overflows the embedder
      // context must not kill a 24K-file backfill — skip it and continue.
      if (/input length exceeds|context length/i.test(msg)) {
        failed++;
        continue;
      }
      // Any other error (Ollama down, network) — checkpoint + fail loud.
      flush();                            // checkpoint everything embedded so far + blurb cache
      // P1-a (arm A): flush() early-returns when pending.length===0, so blurbs
      // generated this iteration without a matching successful embed would be
      // lost on abort. Unconditional persist here banks the qwen2.5-coder
      // generations we already paid for so a restart short-circuits via cache.
      if (opts.withContext && blurbCacheDirty) {
        try { saveBlurbCache(BLURB_CACHE_PATH, blurbCache); blurbCacheDirty = false; }
        catch { /* best-effort — never throw inside an error path */ }
      }
      progress("aborted");
      out({
        ...summary, ok: false, phase: "embed", done, failed,
        error: msg,
        hint: `Ollama embed failed. ${done} embedded + checkpointed — rerun to resume.`,
      }, 3);
      return; // structural hard-abort — unreachable past out()'s process.exit, but
              // explicit so a future refactor of out() cannot let work continue
    }
    pending.push({
      id: w.id,
      entry: buildEntry(w.fp, raw, inferDomain(w.fp), embedding, context),
    });
    done++;
    if (pending.length >= opts.batch) {
      if (!flush()) {
        progress("aborted");
        out({ ...summary, ok: false, phase: "write", done, failed,
          error: "tribal-index held by a peer writer; index UNTOUCHED -- re-run to resume" }, EXIT_TRIBAL_INDEX_LOCK_SKIP);
        return;
      }
      progress("running");
    }
  }
  if (!flush()) {
    progress("aborted");
    out({ ...summary, ok: false, phase: "write", done, failed,
      error: "tribal-index held by a peer writer; index UNTOUCHED -- re-run to resume" }, EXIT_TRIBAL_INDEX_LOCK_SKIP);
    return;
  }
  progress("done");

  // P0-2 (arm B): R12 fail-loud on silent degradation. Delegated to the pure
  // `evaluateContextualDegradation` helper for testability.
  const degradationVerdict = opts.withContext
    ? evaluateContextualDegradation({ blurbHits, blurbCacheHits, blurbMisses })
    : { degraded: false, reason: null };
  const degraded = degradationVerdict.degraded;
  const degradedReason = degradationVerdict.reason;

  out({
    ...summary, ok: !degraded, done, failed,
    indexEntriesAfter: idx.entries.length,
    elapsedSec: Math.round((Date.now() - t0) / 1000),
    ...(opts.withContext ? {
      contextual: {
        version: BLURB_VERSION,
        blurbsGenerated: blurbHits,
        blurbsFromCache: blurbCacheHits,
        blurbFailures: blurbMisses,
        cachePath: BLURB_CACHE_PATH,
        degraded,
        ...(degradedReason ? { degradedReason } : {}),
      },
    } : {}),
  }, degraded ? 2 : 0);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => {
    process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
    process.exit(1);
  });
}
