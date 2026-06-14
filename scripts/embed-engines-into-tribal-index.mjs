#!/usr/bin/env node
/**
 * embed-engines-into-tribal-index.mjs
 *
 * NN-GRAPH-MS2 / U-NN-PREDICTOR-EMBED-WIRE-BRIDGE-EXPAND follow-up (2026-05-24,
 * slot papa). Embeds every wiki engine page under
 * `knowledge/wiki/architecture/engines/**` into `tribal-embed-index.json` so
 * the graph-node-embedding bridge's Path-2 resolver (newly shipped) can
 * actually produce embedding rows for `ghost.unwired.<X>Engine` nodes —
 * closing the live data-side gap that kept the NN tier-5 AUROC stuck at 0.5
 * (hit=22/6000 → projected effectively ~0% useful signal).
 *
 * ## Why a dedicated script
 *
 * `embed-wiki-into-tribal-index.mjs` takes individual `.md` files as args
 * and is designed for ad-hoc per-file appends (the 2026-05-19 backend-dev
 * gap). Engines are ~3,000 files in a deep nested tree — feeding them one by
 * one is impractical and the script's all-or-nothing semantics would abort
 * the entire batch on any single Ollama hiccup over a 1+ hour run. This
 * wrapper:
 *
 *   1. Recursively scans the engines wiki tree (depth-bounded, hidden-skip).
 *   2. Resumable progress — writes to disk every N files so an interrupted
 *      run picks up where it left off.
 *   3. Per-file embedding failure is captured (does NOT abort the batch),
 *      and surfaced in the summary so the operator can re-run on the
 *      remaining set later. Strictly fail-soft within the BATCH; still
 *      fail-loud on infrastructure failures (Ollama dead, write failure).
 *   4. Uses the proper `wiki:<rel-path>` id format (NOT `external:<abs>`)
 *      so the bridge's `wikiPathToIndexKey` lookup hits cleanly.
 *
 * ## Run
 *
 *   node scripts/embed-engines-into-tribal-index.mjs                  # full sweep
 *   node scripts/embed-engines-into-tribal-index.mjs --limit 200      # bounded batch
 *   node scripts/embed-engines-into-tribal-index.mjs --dry-run        # plan only
 *   node scripts/embed-engines-into-tribal-index.mjs --force          # re-embed everything
 *
 * Env:
 *   OLLAMA_URL    default http://localhost:11434
 *   OLLAMA_MODEL  default nomic-embed-text:latest
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  stripFrontmatter,
  flattenBody,
  embedText,
} from "./embed-wiki-into-tribal-index.mjs";
// BLACKWELL-DB-GEN-MS0 (slot:juliett): bounded-concurrency embed pool so the
// per-file Ollama embeds run in flight on the GPU. Default conc=1 = byte-
// identical serial loop. This embedder is fail-SOFT per item, so it drives the
// pool in TOLERATE-ON-RETURN mode (embedOne returns a sentinel, never throws).
import { runEmbedPool, resolveEmbedConcurrency } from "./lib/embed-pool.mjs";
// Cross-process write lock for the shared ~500 MB index (BRAIN-UPGRADE rank 12).
// Its header names THIS script as one of the 5 unguarded RMW writers it exists to
// serialize. flushIndex below follows the documented short-critical-section
// pattern: slow embeds stay OUTSIDE the lock (the pool); re-read+merge+write is
// INSIDE it, so two concurrent embedders never lost-update the index.
import { withTribalIndexLock, EXIT_TRIBAL_INDEX_LOCK_SKIP } from "./lib/tribal-index-lock.mjs";
// Shard-safe, clobber-guarded index IO -- the ONE read/write pair every tribal
// writer routes through (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10). A
// monolith-only JSON.parse(readFileSync)/writeFileSync clobbers the brain once
// the index shards (>480 MiB the monolith .json is replaced by a manifest +
// shards); readTribalIndexGuarded is manifest-aware, writeTribalIndexGuarded
// shrink-guards + retires the superseded layout. [[reference_tribal_shard_read_clobber_2026_06_10]]
import { readTribalIndexGuarded, writeTribalIndexGuarded } from "./lib/tribal-index-guarded-io.mjs";

const __filename = fileURLToPath(import.meta.url);
const PRISM_ROOT = path.resolve(path.dirname(__filename), "..");
const ENGINE_WIKI_ROOT = path.join(PRISM_ROOT, "knowledge", "wiki", "architecture", "engines");
const INDEX_PATH = path.join(PRISM_ROOT, "state", "shared", "tribal-embed-index.json");

// flush every N successful embeds. Higher than the old 25 because each flush now
// re-reads + rewrites the whole ~500 MB index INSIDE the cross-process lock — 200
// keeps that to ~18 flushes over a full 3664-page sweep (bounded re-read I/O)
// while still checkpointing often enough to make a multi-hour run resumable.
const CHECKPOINT_EVERY = 200;
const MAX_RECURSION = 4;
// Lock stale-steal window. MUST exceed the worst-case full-index rewrite: the live
// index is ~500 MB and a synchronous JSON.stringify + writeFileSync of it measured
// ~250 s on this disk. The 30 s default would let a peer steal the lock mid-write,
// after which this holder's rename clobbers the peer's write — the exact lost-update
// the lock prevents. 10 min headroom (grows with the index). See tribal-index-lock.
const LOCK_STALE_MS = 600_000;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "nomic-embed-text:latest";

/** Recursive .md scan, lowercased basename → absolute POSIX path. Skips
 *  underscore-prefix + dot-prefix files. Depth-bounded to MAX_RECURSION. */
export function scanEngineWiki(root, depth = 0, out = []) {
  if (depth > MAX_RECURSION) return out;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) { scanEngineWiki(full, depth + 1, out); continue; }
    if (!e.name.toLowerCase().endsWith(".md")) continue;
    if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
    out.push(full.replace(/\\/g, "/"));
  }
  return out;
}

/** Convert an absolute path under PRISM_ROOT to a wiki:<rel-path> id. */
export function makeWikiId(absPath) {
  const rel = path.relative(PRISM_ROOT, absPath).replace(/\\/g, "/");
  return "wiki:" + rel;
}

/** Build one entry with the EXACT shape the tribal-embed-index already uses
 *  (id, source, domain, title, path, text, hash, embedding). */
export function buildEngineEntry(absPath, raw, embedding) {
  const flat = flattenBody(stripFrontmatter(raw));
  const basename = path.basename(absPath, ".md");
  return {
    id: makeWikiId(absPath),
    source: "wiki",
    domain: "engine-reference",
    title: basename,
    path: absPath.replace(/\\/g, "/"),
    text: flat.slice(0, 400),
    hash: crypto.createHash("sha256").update(flat).digest("hex").slice(0, 16),
    embedding,
  };
}

/**
 * Fold a chunk of pool results (in INPUT order) into the running added/failed
 * accumulators, applying the SAME circuit breaker the prior serial loop used:
 * after any INFRA failure, if the last 3 recorded failures share its reason,
 * abort. Stub/empty pages are recorded as failures but never trip the breaker
 * (their reason "stub-or-empty" breaks the identical-chain — faithful to the
 * prior loop, where the stub `continue` never reached the catch's breaker check).
 *
 * Pure: mutates the passed `added`/`failed` arrays, returns `true` if the breaker
 * tripped (caller then stops launching further chunks). Extracted so the order-
 * preserving fold + breaker is unit-testable without a live Ollama. The pool's
 * ORDER contract guarantees results[i] === worker(chunk[i]), so folding in array
 * order reproduces the exact serial accumulation/abort point at concurrency 1.
 *
 * @param {Array<{ok:boolean, entry?:object, path?:string, reason?:string, kind?:string}>} results
 * @param {Array<object>} added   successful entries (drained by flushIndex)
 * @param {Array<{path:string, reason:string}>} failed
 * @returns {boolean} aborted — true when the 3-consecutive-identical-infra breaker tripped
 */
export function foldEngineResults(results, added, failed) {
  for (const r of results) {
    if (r && r.ok) { added.push(r.entry); continue; }
    const reason = (r && r.reason) || "unknown";
    failed.push({ path: r && r.path, reason });
    // Only an INFRA failure arms the breaker (matches the prior loop: stub pages
    // `continue` before the catch). 3 identical-reason failures in a row ⇒ Ollama
    // is down/erroring → bail before burning the rest of the sweep.
    if (r && r.kind === "infra" && failed.length >= 3 &&
        failed.slice(-3).every((x) => x.reason === reason)) {
      console.error(`[embed-engines] ABORT — 3 consecutive identical failures (${reason})`);
      return true;
    }
  }
  return false;
}

function parseArgs(argv) {
  const opts = { limit: 0, dryRun: false, force: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--limit") opts.limit = parseInt(argv[++i] || "0", 10);
  }
  return opts;
}

async function main(argv) {
  const opts = parseArgs(argv.slice(2));
  const t0 = Date.now();

  if (!fs.existsSync(ENGINE_WIKI_ROOT)) {
    console.error(`engine wiki root missing: ${ENGINE_WIKI_ROOT}`);
    return 2;
  }
  // Manifest-aware: a SHARDED index has no monolith .json (the writer replaces
  // it with a .manifest.json + shards), so a monolith-only existsSync would
  // false-"missing" a perfectly good sharded brain.
  if (!fs.existsSync(INDEX_PATH) && !fs.existsSync(INDEX_PATH.replace(/\.json$/i, "") + ".manifest.json")) {
    console.error(`tribal-embed-index missing: ${INDEX_PATH}`);
    return 2;
  }

  console.log(`[embed-engines] scanning ${ENGINE_WIKI_ROOT}`);
  const allFiles = scanEngineWiki(ENGINE_WIKI_ROOT);
  console.log(`[embed-engines] found ${allFiles.length} engine wiki pages`);

  let idx = readTribalIndexGuarded(INDEX_PATH); // manifest-aware + V8-cap-safe
  if (!Array.isArray(idx.entries)) {
    console.error("tribal-embed-index has no entries[] array");
    return 2;
  }
  const existing = new Map();
  for (const e of idx.entries) existing.set(e.id, e);
  console.log(`[embed-engines] index has ${idx.entries.length} entries pre-batch`);

  // Plan: filter to files that need embedding.
  const toEmbed = [];
  let alreadyIndexed = 0;
  for (const f of allFiles) {
    const id = makeWikiId(f);
    if (existing.has(id) && !opts.force) { alreadyIndexed++; continue; }
    toEmbed.push(f);
  }
  console.log(`[embed-engines] already in index: ${alreadyIndexed} · to embed: ${toEmbed.length}`);

  if (opts.limit > 0 && toEmbed.length > opts.limit) {
    toEmbed.length = opts.limit;
    console.log(`[embed-engines] limited to ${toEmbed.length} files this run`);
  }

  if (opts.dryRun) {
    console.log(`[embed-engines] DRY RUN — would embed ${toEmbed.length} files`);
    console.log(`[embed-engines] first 5: ${toEmbed.slice(0, 5).join("\n  ")}`);
    return 0;
  }

  // Verify Ollama is reachable before kicking off (fail-loud on infra).
  try {
    const probe = await embedText("ping", fetch, 0);
    if (!Array.isArray(probe) || probe.length === 0) {
      console.error("[embed-engines] Ollama embeddings probe returned empty — aborting");
      return 3;
    }
    console.log(`[embed-engines] Ollama probe OK (dim=${probe.length})`);
  } catch (e) {
    console.error(`[embed-engines] Ollama embeddings probe FAILED — ${e.message}`);
    console.error(`[embed-engines] verify with: curl -X POST ${OLLAMA_URL}/api/embeddings -d '{"model":"${OLLAMA_MODEL}","prompt":"test"}'`);
    return 3;
  }

  // Embed loop with checkpointed flushes — BLACKWELL-DB-GEN-MS0 (slot:juliett).
  // The per-file embed body (read → flatten → stub-skip → embedText → buildEntry)
  // is a TOLERATE-ON-RETURN worker: it NEVER throws, returning an {ok} sentinel
  // so the pool drains the whole chunk and `foldEngineResults` decides added vs
  // failed + when the 3-consecutive-identical-infra-failure breaker trips. We
  // process in chunks of CONCURRENCY so the existing checkpoint-flush + breaker
  // semantics are preserved between chunks. Default conc=1 ⇒ chunk size 1 ⇒
  // byte-identical to the prior serial loop (one file in order, same flush trip
  // point, same first-abort point). nomic-embed-text (137M) leaves a 96 GB
  // Blackwell ~94% idle one-at-a-time; the wiki concept embedder measured ~15× at
  // concurrency 16 with byte-identical vectors. Set PRISM_EMBED_CONCURRENCY=16.
  const CONCURRENCY = resolveEmbedConcurrency();
  const added = [];
  const failed = [];
  // Schema-probe the index's own dimensionality rather than hardcoding 768, so a
  // wrong-model vector is rejected against the live `dim` (matches the sibling's
  // expectedDim pinning; falls back to nomic-embed-text's native 768 if absent).
  const expectedDim = Number(idx.dim) > 0 ? Number(idx.dim) : 768;

  const embedOne = async (f) => {
    try {
      const raw = fs.readFileSync(f, "utf8");
      const flat = flattenBody(stripFrontmatter(raw));
      if (flat.length < 20) { // empty/stub page — record, but never abort the batch
        return { ok: false, path: f, reason: "stub-or-empty", kind: "stub" };
      }
      const emb = await embedText(flat, fetch, expectedDim);
      return { ok: true, entry: buildEngineEntry(f, raw, emb) };
    } catch (e) {
      // Stringify defensively — a non-Error throw must not crash the worker (that
      // would propagate as an abort-on-throw and break the fail-soft contract).
      return { ok: false, path: f, reason: String((e && e.message) || e), kind: "infra" };
    }
  };

  let aborted = false;
  let lockHeldByPeer = false;
  for (let start = 0; start < toEmbed.length && !aborted && !lockHeldByPeer; start += CONCURRENCY) {
    const chunk = toEmbed.slice(start, start + CONCURRENCY);
    // embedOne never throws, so the pool runs to completion and preserves order
    // (results[i] === embedOne(chunk[i])). Fold in that order to reproduce the
    // serial accumulation + abort point exactly at concurrency 1.
    const results = await runEmbedPool(chunk, embedOne, { concurrency: CONCURRENCY });
    // NOTE: if the breaker trips mid-chunk at conc>1, results AFTER the trip index
    // are dropped (not folded into `added`/`failed`) — their ids were never written
    // so the resumable re-run re-embeds them. Only recomputed GPU work is lost, and
    // only on the abort path (which already means Ollama is down). At conc=1 the
    // chunk is one item so nothing is ever discarded — byte-identical to serial.
    aborted = foldEngineResults(results, added, failed);
    // Checkpoint flush: drain `added` into the index once it crosses the
    // threshold. `>=` not `===` — a chunk can append up to CONCURRENCY entries at
    // once, so an exact 25-multiple would be skipped on a wide pool. flushIndex
    // empties `added` (resets the running total), so this fires every ~25.
    if (added.length >= CHECKPOINT_EVERY) {
      if (!flushIndex(idx, added)) { lockHeldByPeer = true; break; } // peer holds the lock → stop
      console.log(`[embed-engines] checkpoint flush — index size: ${idx.entries.length}`);
    }
    if (opts.verbose) {
      const done = Math.min(start + chunk.length, toEmbed.length);
      const eta = ((Date.now() - t0) / done) * (toEmbed.length - done) / 1000;
      console.log(`  [${done}/${toEmbed.length}] pending=${added.length} failed=${failed.length} conc=${CONCURRENCY} ETA=${eta.toFixed(0)}s`);
    }
  }

  // Final flush — persist any successes accumulated since the last checkpoint
  // (including a partial final chunk, or successes seen before the breaker tripped).
  if (added.length > 0 && !lockHeldByPeer) {
    if (!flushIndex(idx, added)) lockHeldByPeer = true;
  }
  if (lockHeldByPeer) {
    console.error(`[embed-engines] tribal-index held by a peer writer — ${added.length} staged page(s) NOT written; index UNTOUCHED. Re-run after the peer finishes.`);
  }

  const elapsed = (Date.now() - t0) / 1000;
  console.log("");
  console.log(`[embed-engines] DONE in ${elapsed.toFixed(1)}s`);
  console.log(`  scanned: ${allFiles.length}`);
  console.log(`  already-indexed: ${alreadyIndexed}`);
  console.log(`  newly embedded: ${added.length}`);
  console.log(`  failed: ${failed.length}`);
  console.log(`  final index size: ${idx.entries.length}`);
  if (failed.length > 0 && failed.length <= 10) {
    console.log("  failure samples:");
    for (const f of failed.slice(0, 10)) console.log(`    ${f.path} :: ${f.reason}`);
  }
  // Exit 4 (EXIT_TRIBAL_INDEX_LOCK_SKIP) is the benign "peer held the lock" signal
  // — index untouched, re-run picks up the staged pages. 0 = clean.
  return lockHeldByPeer ? EXIT_TRIBAL_INDEX_LOCK_SKIP : 0;
}

/**
 * Persist the staged entries under the cross-process lock. SHORT critical section:
 * RE-READ the index fresh (a peer embedder may have written during our slow embed
 * — the in-memory `idx` is only the planning/logging view, NOT the write basis),
 * merge the staged entries by id (replace-or-append — dedups against a peer's
 * writes AND subsumes the old --force filter-then-push), atomic tmp+rename
 * (pid+timestamp → no torn write), then sync the caller's `idx.entries` to the
 * fresh array for accurate logging. Drains `addedEntries` ONLY on a successful
 * write. Returns false when a live peer holds the lock (index UNTOUCHED, batch
 * preserved) so the caller stops + exits SKIP and a re-run re-embeds the pages.
 */
function flushIndex(idx, addedEntries) {
  const r = withTribalIndexLock(INDEX_PATH, () => {
    const fresh = readTribalIndexGuarded(INDEX_PATH); // manifest-aware re-read inside the lock
    if (!Array.isArray(fresh.entries)) {
      throw new Error("tribal-embed-index entries not an array — refusing to write (R12 schema-probe)");
    }
    const prevCount = fresh.entries.length; // BEFORE our splice (we only add/replace, never shrink)
    const byId = new Map(fresh.entries.map((e, i) => [e && e.id, i]));
    for (const e of addedEntries) {
      const at = byId.get(e.id);
      if (at !== undefined) fresh.entries[at] = e;
      else { fresh.entries.push(e); byId.set(e.id, fresh.entries.length - 1); }
    }
    fresh.generatedAt = new Date().toISOString();
    // Shard-aware, clobber-guarded write (monolith below threshold, shards above,
    // retires the superseded layout). prevCount avoids a second full re-read.
    writeTribalIndexGuarded(fresh, INDEX_PATH, { prevCount });
    idx.entries = fresh.entries; // keep the caller's view consistent with disk
  }, { staleMs: LOCK_STALE_MS });
  if (r.ran) addedEntries.length = 0; // only drain on a successful write
  return r.ran;
}

// CLI guard
const argv1 = process.argv[1] || "";
if (argv1.endsWith("embed-engines-into-tribal-index.mjs")) {
  main(process.argv).then((code) => process.exit(code)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
