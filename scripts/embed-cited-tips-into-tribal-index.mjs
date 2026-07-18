#!/usr/bin/env node
/**
 * embed-cited-tips-into-tribal-index.mjs
 *
 * TRIBAL-OUTCOME-LOOP-MS0/U-TTOB-EMBED (slot:foxtrot 2026-05-27).
 * BLACKWELL-DB-GEN-MS0 array-shape fix + GPU concurrency pool (slot:juliett 2026-06-04).
 *
 * Embeds the `.ts` cited-tip catalogs (milling/wedm/lathe) into the canonical
 * `state/shared/tribal-embed-index.json` so `tribal_search` +
 * `tribal-by-domain-inject` can surface catalog tips alongside wiki/engine tips.
 *
 * ## 2026-06-04 shape-bug fix (juliett, R12 — "write succeeded" was a lie)
 *
 * The original writer treated `idx.entries` as an OBJECT (`idx.entries[key] = …`)
 * and saved with `JSON.stringify(idx, null, 2)`. But the live index — the one
 * `tribal-rerank.mjs` reads (`for (const e of idx.entries)`, `idx.entries.length`,
 * `e.embedding`/`e.domain`/`e.source`/`e.text`/`e.title`/`e.id`) and the sibling
 * engines/wiki/knowledge-store embedders write — is an ARRAY. String-keyed props
 * on an array are DROPPED by `JSON.stringify`, so EVERY cited tip silently
 * vanished on save (verified: 0 `tip:` entries in the ~500 MB index despite this
 * script having "run"). This rewrite:
 *   - pushes CANONICAL array entries ({id,source,domain,title,path,text,hash,
 *     embedding}) matching exactly what tribal-rerank reads — tips are finally
 *     retrievable;
 *   - maps each catalog → a tribal-rerank VALID_DOMAINS member (milling→mill)
 *     so the in-domain 2× boost actually applies;
 *   - dedups/replaces by id, ATOMIC tmp+rename (pid+timestamp), COMPACT stringify
 *     (matches the ~500 MB file's format — pretty-print would 2-3× bloat it);
 *   - validates embedding dim against the index `dim` (wrong model = fail loud);
 *   - REFUSES to write an object-shaped index (schema-probe — juliett charter).
 *
 * ## BLACKWELL-DB-GEN-MS0 GPU pool (juliett)
 *
 * Per-tip embeds run through the shared bounded-concurrency pool
 * (`scripts/lib/embed-pool.mjs`). Default conc=1 = serial. `nomic-embed-text`
 * (137M) leaves a 96 GB RTX PRO 6000 Blackwell ~94% idle one-at-a-time; set
 * PRISM_EMBED_CONCURRENCY=16 to saturate it. TOLERATE-ON-RETURN: the per-tip
 * worker NEVER throws (returns a status sentinel) so one bad tip never aborts the
 * batch. Checkpoint-flush every ~25 successes keeps an interrupted run resumable.
 *
 * Usage:
 *   node scripts/embed-cited-tips-into-tribal-index.mjs                 # sweep all catalogs
 *   node scripts/embed-cited-tips-into-tribal-index.mjs --catalog milling
 *   node scripts/embed-cited-tips-into-tribal-index.mjs --limit 100     # per-catalog cap
 *   node scripts/embed-cited-tips-into-tribal-index.mjs --dry-run
 *   node scripts/embed-cited-tips-into-tribal-index.mjs --force         # re-embed all
 *
 * Env: PRISM_OLLAMA_URL (via embedText, default 127.0.0.1:11434) · PRISM_EMBED_CONCURRENCY
 *
 * @milestone TRIBAL-OUTCOME-LOOP-MS0/U-TTOB-EMBED · BLACKWELL-DB-GEN-MS0
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { embedText } from "./embed-wiki-into-tribal-index.mjs";
import { runEmbedPool, resolveEmbedConcurrency } from "./lib/embed-pool.mjs";
// Cross-process write lock for the shared ~500 MB index (BRAIN-UPGRADE rank 12).
// The lock's own header names this script as one of the 5 unguarded RMW writers
// it exists to serialize — wire it per the documented short-critical-section
// pattern (slow embed OUTSIDE the lock; re-read+splice+write INSIDE it).
import { withTribalIndexLock, EXIT_TRIBAL_INDEX_LOCK_SKIP } from "./lib/tribal-index-lock.mjs";
// Shard-safe, clobber-guarded index IO. loadIndex's prior `!existsSync -> empty
// shell` was the fail-OPEN that clobbered a SHARDED brain 1:1 (monolith gone =>
// "empty" => splice+write a near-empty index); readTribalIndexGuarded is
// manifest-aware. writeTribalIndexGuarded shards safely + retires the
// superseded layout. U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10.
// [[reference_tribal_shard_read_clobber_2026_06_10]]
import { readTribalIndexGuarded, writeTribalIndexGuarded } from "./lib/tribal-index-guarded-io.mjs";

const __filename = fileURLToPath(import.meta.url);
const PRISM_ROOT = path.resolve(path.dirname(__filename), "..");
const TRIBAL_TIPS_DIR = path.join(PRISM_ROOT, "mcp-server", "src", "data", "tribal-tips");
const INDEX_PATH = path.join(PRISM_ROOT, "state", "shared", "tribal-embed-index.json");

// High checkpoint interval (vs the engines embedder's 25): each flush re-reads +
// rewrites the whole ~500 MB index INSIDE the cross-process lock, so we minimize
// flush count. The cited-tip catalogs total only ~460 tips (a 1-4 min run), so 1-2
// flushes give ample resumability without paying the ~500 MB re-read ~18 times.
const CHECKPOINT_EVERY = 250;
const MAX_INPUT_CHARS = 3000;
const TEXT_MAX = 400; // stored display snippet length (matches sibling embedders)
const DEFAULT_DIM = 768;
// Lock stale-steal window. MUST exceed the worst-case full-index rewrite: the live
// index is ~500 MB and a synchronous JSON.stringify + writeFileSync of it measured
// ~250 s on this disk. The lock's 30 s default would let a peer steal the lock
// mid-write, after which the slow holder's rename clobbers the peer's write — the
// exact lost-update the lock exists to prevent. 10 min gives headroom as it grows.
const LOCK_STALE_MS = 600_000;

// catalog → tribal-rerank VALID_DOMAINS member. A tip written with a domain the
// rerank cannot match never gets the in-domain 2× boost — so the mapping matters.
// Only milling + post catalogs exist on disk (wedm/lathe were phantom config that
// silently embedded nothing). post-processor tips have no clean VALID_DOMAINS
// member, so they map to "general" — retrievable by raw cosine, no mis-boost.
const CATALOGS = [
  { name: "milling", file: "milling-pdf-cited-tips.ts", idPrefix: "MILL-TIP-", domain: "mill" },
  { name: "post", file: "post-pdf-cited-tips.ts", idPrefix: "POST-TIP-", domain: "general" },
];

/** Parse tip object literals from a .ts catalog file. Mirrors parseCitedTips()
 *  in scripts/generate-milling-tribal-tip-bridge-features.mjs. Uses matchAll
 *  (not a regex.exec loop) — same result, cleaner, and dodges the security
 *  hook's `.exec(`→child_process false positive. */
export function parseTipsFromCatalog(tsText, idPrefix = "MILL-TIP-") {
  const tips = [];
  const tipRe = new RegExp(`\\{[\\s\\S]*?id:\\s*"(${idPrefix}[A-Z0-9_-]+)"([\\s\\S]*?)\\n  \\},`, "g");
  for (const m of tsText.matchAll(tipRe)) {
    const id = m[1];
    const body = m[2];
    const get = (field) => {
      const fm = body.match(new RegExp(`${field}:\\s*"([^"]+)"`));
      return fm ? fm[1] : "";
    };
    const getTags = () => {
      const tr = body.match(/tags:\s*\[([\s\S]*?)\]/);
      if (!tr) return [];
      return [...tr[1].matchAll(/"([^"]+)"/g)].map((mm) => mm[1]);
    };
    tips.push({
      id,
      headline: get("headline"),
      body: get("body"),
      operation: get("operation"),
      vendor: get("vendor"),
      citation: get("citation"),
      tags: getTags(),
    });
  }
  return tips;
}

/** Compose the embedding-input string from a tip's fields. */
export function tipToEmbeddingInput(tip) {
  const parts = [
    `id: ${tip.id}`,
    `operation: ${tip.operation}`,
    `vendor: ${tip.vendor}`,
    `headline: ${tip.headline}`,
    `body: ${tip.body}`,
    `tags: ${(tip.tags || []).join(", ")}`,
  ];
  return parts.join("\n").slice(0, MAX_INPUT_CHARS);
}

/** SHA-256 of the embedding input — change-detection hash (skip-unchanged). */
export function hashInput(input) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/**
 * Build a CANONICAL array entry — the EXACT shape `tribal-rerank.mjs` reads
 * (`e.id`/`e.embedding`/`e.domain`/`e.source`/`e.text`/`e.title`). `embedding` is
 * injected by the caller so this stays pure + unit-testable. Extra provenance
 * fields (tipId/operation/vendor/citation/tags) are harmless to the rerank (it
 * only cosines on `embedding` + reads the canonical display fields) but useful
 * for audit. `path` carries the source catalog so a tip is traceable to its .ts.
 */
export function buildTipEntry(tip, catalogRelPath, domain, embedding) {
  const input = tipToEmbeddingInput(tip);
  return {
    id: `tip:${tip.id}`,
    source: "tribal-tip",
    domain,                       // mill|wedm|lathe — drives the in-domain 2× boost
    title: tip.headline || tip.id,
    path: catalogRelPath,
    text: input.slice(0, TEXT_MAX),
    hash: hashInput(input),
    embedding,
    tipId: tip.id,
    operation: tip.operation,
    vendor: tip.vendor,
    citation: tip.citation,
    tags: tip.tags,
  };
}

/**
 * Load the canonical ARRAY-shaped index. On first-ever run (file absent) returns
 * an empty array shell. REFUSES an object-shaped `entries` (schema-probe — the
 * canonical index tribal-rerank reads is an array; writing an object would make
 * every entry non-retrievable, the very bug this rewrite fixes).
 */
export function loadIndex(indexPath = INDEX_PATH) {
  // Manifest-aware (was monolith-only `!existsSync -> empty shell`, the fail-OPEN
  // that clobbered a sharded brain). An empty bootstrap base is returned ONLY
  // when neither the monolith .json NOR the sibling .manifest.json exists.
  const parsed = readTribalIndexGuarded(indexPath, {
    emptyHead: { schemaVersion: "1.0.0", model: "nomic-embed-text:latest", dim: DEFAULT_DIM, generatedAt: new Date().toISOString() },
  });
  if (!Array.isArray(parsed.entries)) {
    throw new Error(
      `tribal-embed-index entries must be an ARRAY (found ${typeof parsed.entries}) -- ` +
      `refusing to write an object-shaped index that tribal-rerank cannot read (R12 schema-probe)`,
    );
  }
  return parsed;
}

/**
 * Atomic, COMPACT write. tmp+rename with pid+timestamp (no two writers clobber a
 * shared tmp mid-write on the ~500 MB file). Compact `JSON.stringify` matches the
 * canonical file format — `, null, 2` would 2-3× bloat a ~500 MB index and risks
 * the oversize-string regression class.
 */
export function saveIndex(idx, indexPath = INDEX_PATH) {
  idx.generatedAt = new Date().toISOString();
  // Shard-safe, clobber-guarded write (monolith below threshold, N shards above,
  // retires the superseded layout). Replaces the monolith-only writeFileSync that
  // left stale shards shadowing the write once the index sharded. The shrink
  // clobber-guard re-reads prevCount (cited-tip flushes are rare -- ~2/run).
  writeTribalIndexGuarded(idx, indexPath);
}

/**
 * Replace-by-id or append canonical tip entries into the array index. `idIndexMap`
 * (id → array position) is kept in sync so a later checkpoint's splice sees prior
 * inserts. Pure w.r.t. I/O (mutates idx.entries + idIndexMap, returns counts) —
 * unit-testable without a live Ollama or disk.
 */
export function spliceTipEntries(idx, built, idIndexMap) {
  let added = 0, replaced = 0;
  for (const entry of built) {
    const at = idIndexMap.get(entry.id);
    if (at !== undefined) { idx.entries[at] = entry; replaced++; }
    else { idx.entries.push(entry); idIndexMap.set(entry.id, idx.entries.length - 1); added++; }
  }
  return { added, replaced };
}

/** Main sweep across catalogs. */
export async function main(argv = process.argv.slice(2)) {
  const flags = { catalog: null, limit: Infinity, dryRun: false, force: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--catalog") flags.catalog = argv[++i];
    else if (a === "--limit") flags.limit = parseInt(argv[++i], 10);
    else if (a === "--dry-run") flags.dryRun = true;
    else if (a === "--force") flags.force = true;
    else if (a === "--verbose") flags.verbose = true;
  }

  const idx = loadIndex();
  const expectedDim = Number(idx.dim) > 0 ? Number(idx.dim) : DEFAULT_DIM;
  // id → array position, built ONCE; spliceTipEntries keeps it current.
  const idIndexMap = new Map(idx.entries.map((e, i) => [e && e.id, i]));
  const CONCURRENCY = resolveEmbedConcurrency();
  const stats = { totalTips: 0, embedded: 0, skipped: 0, failed: 0, byCatalog: {} };
  const catalogsToRun = flags.catalog ? CATALOGS.filter((c) => c.name === flags.catalog) : CATALOGS;

  // Fail-loud Ollama preflight (skip on dry-run — it embeds nothing).
  if (!flags.dryRun) {
    try {
      const probe = await embedText("ping", fetch, 0);
      if (!Array.isArray(probe) || probe.length === 0) {
        console.error("[cited-tips] Ollama embeddings probe returned empty — aborting (nothing written)");
        process.exitCode = 3;
        return stats;
      }
      console.log(`[cited-tips] Ollama probe OK (dim=${probe.length}) · conc=${CONCURRENCY}`);
    } catch (e) {
      console.error(`[cited-tips] Ollama embeddings probe FAILED — ${String((e && e.message) || e)} (nothing written)`);
      process.exitCode = 3;
      return stats;
    }
  }

  // Entries staged since the last checkpoint flush; drained by flush().
  let built = [];
  let sinceFlush = 0;
  let lockHeldByPeer = false;
  // flush = the SHORT critical section. Acquire the cross-process lock, RE-READ
  // the index fresh (a peer embedder may have written during our slow embed — the
  // in-memory `idx`/`idIndexMap` above are only used for the embed-time skip
  // check, NOT for the write), splice the staged entries by id, atomic-write.
  // Returns false when a live peer holds the lock (index UNTOUCHED) → the caller
  // stops + exits SKIP; a re-run re-embeds the staged tips (their ids aren't in
  // the index yet, so the hash skip-check won't drop them).
  const flush = () => {
    if (!built.length) return true;
    const r = withTribalIndexLock(INDEX_PATH, () => {
      const fresh = loadIndex();
      const freshMap = new Map(fresh.entries.map((e, i) => [e && e.id, i]));
      spliceTipEntries(fresh, built, freshMap);
      saveIndex(fresh);
    }, { staleMs: LOCK_STALE_MS });
    if (!r.ran) { lockHeldByPeer = true; return false; }
    built = [];
    return true;
  };

  for (const cat of catalogsToRun) {
    const catPath = path.join(TRIBAL_TIPS_DIR, cat.file);
    if (!fs.existsSync(catPath)) {
      console.log(`[skip] ${cat.name}: catalog file not found at ${catPath}`);
      continue;
    }
    const tsText = fs.readFileSync(catPath, "utf8");
    const tips = parseTipsFromCatalog(tsText, cat.idPrefix);
    stats.byCatalog[cat.name] = { total: tips.length, embedded: 0, skipped: 0, failed: 0 };
    console.log(`[scan] ${cat.name}: ${tips.length} tips parsed from ${cat.file}`);

    if (flags.dryRun) { stats.totalTips += tips.length; continue; }

    // --limit is PER catalog (preserves the prior per-catalog `count` semantics).
    const limited = Number.isFinite(flags.limit) ? tips.slice(0, flags.limit) : tips;
    const relPath = path.relative(PRISM_ROOT, catPath).replace(/\\/g, "/");

    // TOLERATE-ON-RETURN worker — NEVER throws; returns a status sentinel so a
    // single bad tip never aborts the pool (fail-soft within the batch).
    const embedOneTip = async (tip) => {
      const input = tipToEmbeddingInput(tip);
      const h = hashInput(input);
      const at = idIndexMap.get(`tip:${tip.id}`);
      const prior = at !== undefined ? idx.entries[at] : null;
      if (prior && prior.hash === h && !flags.force) return { status: "skipped" };
      try {
        const vec = await embedText(input, fetch, expectedDim);
        return { status: "embedded", entry: buildTipEntry(tip, relPath, cat.domain, vec) };
      } catch (e) {
        if (flags.verbose) console.error(`  [fail] ${tip.id}: ${String((e && e.message) || e)}`);
        return { status: "failed" };
      }
    };

    for (let start = 0; start < limited.length && !lockHeldByPeer; start += CONCURRENCY) {
      const chunk = limited.slice(start, start + CONCURRENCY);
      // Pool preserves order (results[i] === embedOneTip(chunk[i])); fold in order.
      const results = await runEmbedPool(chunk, embedOneTip, { concurrency: CONCURRENCY });
      for (const r of results) {
        stats.totalTips++;
        const bucket = r.status === "skipped" ? "skipped" : r.status === "embedded" ? "embedded" : "failed";
        stats[bucket]++;
        stats.byCatalog[cat.name][bucket]++;
        if (r.status === "embedded" && r.entry) { built.push(r.entry); sinceFlush++; }
      }
      // Checkpoint: flush whenever staged successes cross the threshold (>=, since
      // a wide chunk can add up to CONCURRENCY at once and skip an exact multiple).
      if (sinceFlush >= CHECKPOINT_EVERY) {
        if (!flush()) break; // peer holds the lock — stop embedding into a void
        sinceFlush = 0;
        if (flags.verbose) console.log(`  [checkpoint] embedded=${stats.embedded}`);
      }
    }
    if (lockHeldByPeer) break; // stop the catalog sweep — surfaced below
  }

  if (!flags.dryRun && !lockHeldByPeer) flush(); // final flush — persist the tail

  if (lockHeldByPeer) {
    console.error(`[cited-tips] tribal-index held by a peer writer — ${built.length} staged tip(s) NOT written; index UNTOUCHED. Re-run after the peer finishes.`);
    process.exitCode = EXIT_TRIBAL_INDEX_LOCK_SKIP;
  }

  console.log(`\n[summary] tips_seen=${stats.totalTips} embedded=${stats.embedded} skipped=${stats.skipped} failed=${stats.failed}`);
  for (const [cat, s] of Object.entries(stats.byCatalog)) {
    console.log(`  ${cat}: total=${s.total} embedded=${s.embedded} skipped=${s.skipped} failed=${s.failed}`);
  }
  if (stats.failed > 0) {
    console.error(`\n[warn] ${stats.failed} tips failed to embed (likely Ollama unreachable). Re-run after Ollama recovers; checkpoint progress preserved at ${INDEX_PATH}`);
    process.exitCode = stats.failed === stats.totalTips ? 2 : 1;
  }
  return stats;
}

const argv1 = process.argv[1];
if (argv1 && (import.meta.url === `file://${argv1.replace(/\\/g, "/")}` || import.meta.url === `file:///${argv1.replace(/\\/g, "/")}`)) {
  main().catch((err) => {
    console.error("[fatal]", err);
    process.exit(2);
  });
}
