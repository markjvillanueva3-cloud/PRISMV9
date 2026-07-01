#!/usr/bin/env node
/**
 * embed-wiki-into-tribal-index.mjs
 *
 * BACKEND-DEV-LOOP/U-TRIBAL-EMBED-GAP (2026-05-19, slot foxtrot).
 *
 * Idempotent appender that embeds wiki markdown files into
 * `state/shared/tribal-embed-index.json` so they become reachable by the
 * automatic tribal-knowledge injection pipeline
 * (`tribal-by-domain-inject.mjs` → `tribal-rerank.mjs` → cosine over the
 * index). An entry that is NOT in this index can NEVER be surfaced by that
 * hook, regardless of any wiki/cron regen — the rerank's whole corpus IS
 * this file's `entries[]`.
 *
 * ## Why this exists (the gap it closes)
 *
 * The BACKEND-DEV-LOOP "U-TRIBAL-BACKEND-DEV-EXHAUST" loop's documented
 * pattern is: write tribal wiki → embed into tribal-embed-index → commit
 * (index + md together). Commit `d9f1b7960f` (iter3) followed it: its 6
 * wikis are all IN the index. Commit `d716d20a96` ("final 3 wikis …
 * exhaustion 20/20") shipped only the 3 .md files and **skipped the embed
 * step** — so `lora-fine-tuning-patterns`, `reinforcement-learning-patterns`
 * and `mcp-tool-design` are ABSENT from the index and have never
 * auto-injected through the Ollama-embedded pipeline. The loop declared
 * exhaustion without completing its own retag/embed step (Karpathy R12 —
 * "feature works" was a lie for the auto-injection it was building). This
 * script is the missing step, made reusable so future final-batch commits
 * can run it explicitly.
 *
 * ## Canonical entry shape (reverse-engineered from the iter3 entries)
 *
 *   {
 *     id:        "external:" + <absolute Windows path, backslashes>,
 *     source:    "external",
 *     title:     <basename without .md>,
 *     domain:    <--domain, default "backend-dev">,
 *     text:      <frontmatter-stripped, whitespace-flattened body>.slice(0,400),
 *     path:      <absolute Windows path, backslashes>,
 *     hash:      sha256(<full flattened body>).slice(0,16),
 *     embedding: <768-d nomic-embed-text:latest vector>
 *   }
 *
 * `source:"external"` (NOT "wiki") matches exactly how the iter3 backend-dev
 * wikis were ingested — that is also the class `retag-tribal-backend-dev.mjs`
 * promotes to `domain:"backend-dev"`, and what the rerank's per-source
 * formatting expects.
 *
 * ### Hash field — provenance only, not load-bearing
 *
 * `tribal-rerank.mjs` ranks purely by cosine over `embedding`; it never
 * reads `hash` (verified: rerank uses e.embedding/e.text/e.domain/e.source
 * only). The original ingest's 16-hex hash is an internal helper this
 * script does not attempt to reverse — a clean, stable, collision-resistant
 * `sha256(flattenedBody).slice(0,16)` content fingerprint is a correct and
 * defensible choice. Documented honestly rather than guessed.
 *
 * ### Embedding text — full flattened body, not the 400-char head
 *
 * The stored `text` is truncated to 400 chars to match the iter3 *display*
 * shape, but the embedding is computed over the FULL flattened body for
 * richer recall. Cosine validity depends on MODEL parity with the query
 * side (`tribal-rerank` embeds queries with the same
 * `nomic-embed-text:latest` at the same `/api/embeddings` endpoint), NOT on
 * text length — so this is strictly-better recall with zero cosine risk.
 *
 * ## Safety / discipline
 *
 * - **All-or-nothing**: every file is embedded BEFORE any write. A single
 *   Ollama failure aborts with exit 3 and writes nothing (R12 fail-loud —
 *   never a partial index).
 * - **Idempotent**: an entry whose `id` is already present is skipped
 *   unless `--force` (which re-embeds + replaces in place).
 * - **Atomic write**: temp + rename, mirroring `retag-tribal-backend-dev.mjs`.
 * - Pure helpers (`stripFrontmatter`, `flattenBody`, `makeWinPath`,
 *   `makeId`, `buildEntry`, `planAppend`) are exported for the hermetic
 *   test suite (`embed-wiki-into-tribal-index.test.mjs`).
 *
 * ## Run
 *
 *   node scripts/embed-wiki-into-tribal-index.mjs <wiki.md> [<wiki.md> …]
 *       [--domain backend-dev] [--apply] [--json] [--force]
 *
 *   # dry-run (default) — reports plan, embeds nothing, writes nothing
 *   node scripts/embed-wiki-into-tribal-index.mjs knowledge/wiki/code-tribal/lora-fine-tuning-patterns.md
 *
 *   # apply
 *   node scripts/embed-wiki-into-tribal-index.mjs \
 *     knowledge/wiki/code-tribal/lora-fine-tuning-patterns.md \
 *     knowledge/wiki/code-tribal/reinforcement-learning-patterns.md \
 *     knowledge/wiki/software-engineering/mcp-tool-design.md --apply
 *
 * Knobs:
 *   PRISM_TRIBAL_INDEX_PATH   override index path (default H:/prism/state/shared/tribal-embed-index.json)
 *   PRISM_OLLAMA_URL          override Ollama base (default http://127.0.0.1:11434)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
// RAG-UPGRADE-MS0/U-RAG-3 Contextual Retrieval — optional Ollama-generated
// 1-2 sentence blurb prepended to each chunk before embedding. Fail-soft:
// the lib never throws, falls back to raw-chunk embed on any failure.
import {
  generateBlurb, prependBlurb,
  loadBlurbCache, saveBlurbCache, readCacheHit, writeCacheHit,
  BLURB_VERSION,
} from "./lib/contextual-blurb.mjs";
// BLACKWELL-DB-GEN-MS0: bounded-concurrency embed pool so the per-file Ollama
// embeds run in flight on the GPU. Default conc=1 = byte-identical serial loop.
import { runEmbedPool, resolveEmbedConcurrency } from "./lib/embed-pool.mjs";
// Cap-safe index read: tribal-embed-index.json crossed V8's 512MiB max string
// length (2026-06-08), so JSON.parse(readFileSync(path,"utf8")) throws before
// parsing. loadTribalIndex reads the index as a Buffer (under-cap indices take
// the byte-identical fast path). NOTE: the WRITE side (atomicWriteJSON →
// JSON.stringify) ALSO exceeds the cap on a >512MiB object — appending new
// entries needs index sharding, tracked separately.
// [[reference_tribal_index_v8_string_cap_2026_06_08]]
import { loadTribalIndex } from "./lib/load-tribal-index.mjs";
// Shard-safe, clobber-guarded WRITE + the cross-process lock. The read above is
// already manifest-aware (loadTribalIndex); the WRITE was a monolith-only,
// lock-LESS atomicWriteJSON -- the highest-risk clobber vector (largest corpus,
// the writer that crossed 480 MiB in incident 8bf1873577). Now re-read-merge-
// write inside the lock through the shared guarded IO.
// U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10. [[reference_tribal_shard_read_clobber_2026_06_10]]
import { readTribalIndexGuarded, writeTribalIndexGuarded } from "./lib/tribal-index-guarded-io.mjs";
import { withTribalIndexLock, EXIT_TRIBAL_INDEX_LOCK_SKIP } from "./lib/tribal-index-lock.mjs";

export const INDEX_PATH = process.env.PRISM_TRIBAL_INDEX_PATH ||
  "H:/prism/state/shared/tribal-embed-index.json";
export const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
export const MODEL = "nomic-embed-text:latest";
// nomic-embed-text has a ~2048-token context window. A full wiki body can
// exceed it -> Ollama returns 500 "input length exceeds the context length"
// and the whole batch fails. Clamp the embed input to a safe char budget
// (~2048 tokens x ~4 chars) so a large page still embeds on its leading
// content instead of failing. The stored display `text` is separately 400 chars;
// retrieval cosine is unaffected by clamping the build-time input (2026-06-08).
export const MAX_EMBED_CHARS = 2000;
export const TEXT_MAX = 400;
export const DEFAULT_DOMAIN = "backend-dev";
// Mirrors tribal-rerank.mjs VALID_DOMAINS. A domain this script WRITES that
// the rerank cannot match is the exact non-retrievable-entry footgun this
// unit exists to fix, so the validation belongs here even more than there.
export const VALID_DOMAINS = new Set(["mill", "lathe", "wedm", "cad", "cam", "backend-dev", "general"]);

/**
 * Strip a leading YAML frontmatter block (`---\n … \n---`). Only strips
 * when the file actually starts with `---` on its own line; otherwise the
 * content is returned unchanged. Tolerates CRLF.
 */
export function stripFrontmatter(raw) {
  if (typeof raw !== "string") return "";
  // Must start at byte 0 with a `---` line.
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? raw.slice(m[0].length) : raw;
}

/**
 * Flatten markdown body to a single whitespace-collapsed line. Mirrors the
 * iter3 stored-text normalization: newlines + runs of whitespace → one
 * space, trimmed. Heading `#` markers are retained inline (iter3 entries
 * begin "# Embedding + RAG Patterns in PRISM PRISM has six…").
 */
export function flattenBody(raw) {
  return stripFrontmatter(raw).replace(/\s+/g, " ").trim();
}

/**
 * Is there any embeddable text after frontmatter-strip + whitespace-flatten?
 *
 * A wiki page that flattens to "" — a frontmatter-only stub, a `_`-generated
 * orphan placeholder, an all-whitespace file — makes Ollama's `/api/embeddings`
 * return no vector, so `embedText` throws "ollama returned no embedding". Under
 * the all-or-nothing batch contract a single such file aborts the WHOLE chunk:
 * for the 6,401-file backfill driver (`embed-missing-wiki-batch.mjs`) one empty
 * stub poisons up to 12 good files per chunk (the ~84% per-file failure rate
 * observed 2026-06-08, gap #5). Embedding an empty file can NEVER succeed, so
 * `main()` partitions these OUT before the pool and reports them as
 * `skippedEmpty` (R12 — surfaced, not silent) instead of failing the batch. Pure
 * + exported for the hermetic suite. (2026-06-08, gap #5 driver hardening.)
 */
export function isEmbeddable(raw) {
  return flattenBody(raw).length > 0;
}

/**
 * Absolute path in the iter3 Windows convention (`H:\prism\knowledge\…`).
 * `path.resolve` already yields backslashes on win32; on POSIX (CI / test)
 * we normalize forward slashes → backslashes so the id/path fields are
 * stable across platforms and match the existing index entries.
 */
export function makeWinPath(filePath) {
  const abs = path.resolve(filePath);
  return abs.replace(/\//g, "\\");
}

export function makeId(winPath) {
  return "external:" + winPath;
}

export function contentHash(flattened) {
  return crypto.createHash("sha256").update(flattened).digest("hex").slice(0, 16);
}

/**
 * Build a canonical index entry. `embedding` is injected (the caller owns
 * the Ollama call so this stays pure + unit-testable).
 */
export function buildEntry(filePath, raw, domain, embedding, context = null) {
  const flat = flattenBody(raw);
  const winPath = makeWinPath(filePath);
  const title = path.basename(filePath).replace(/\.md$/i, "");
  const entry = {
    id: makeId(winPath),
    source: "external",
    title,
    domain: domain || DEFAULT_DOMAIN,
    text: flat.slice(0, TEXT_MAX),
    path: winPath,
    hash: contentHash(flat),
    embedding,
  };
  // U-RAG-3 Contextual Retrieval — when a blurb was generated, tag the entry
  // so a future eval harness or audit can A/B blurb-prefixed embeddings vs
  // raw-chunk embeddings. The blurb itself is captured for traceability;
  // tribal-rerank.mjs does NOT read this field (it cosines on `embedding`),
  // so the tag is non-invasive to live retrieval.
  if (typeof context === "string" && context.trim()) {
    entry.context = context.trim();
    entry.context_version = BLURB_VERSION;
  }
  return entry;
}

/**
 * Pure planner. Given the parsed index object and the list of candidate
 * file paths, decide which are new vs already-present (by id). No I/O, no
 * embedding. `force` marks present ids for replacement instead of skip.
 */
export function planAppend(indexObj, filePaths, force = false) {
  const entries = (indexObj && Array.isArray(indexObj.entries)) ? indexObj.entries : [];
  const existing = new Set(entries.map((e) => e && e.id));
  const toAdd = [];
  const toReplace = [];
  const skipped = [];
  for (const fp of filePaths) {
    const id = makeId(makeWinPath(fp));
    if (existing.has(id)) {
      if (force) toReplace.push({ fp, id });
      else skipped.push({ fp, id, reason: "already-present" });
    } else {
      toAdd.push({ fp, id });
    }
  }
  return { toAdd, toReplace, skipped, total: entries.length };
}

/**
 * Pure splice: replace entries in place by id, append genuinely-new ones.
 * Order-stable (a replaced id keeps its slot). Mutates indexObj.entries +
 * provenance metadata; returns {added, replaced}. Extracted from main() so
 * the replace-in-place/append decision is directly unit-testable without a
 * live Ollama. Tolerates a malformed null entry (e && e.id).
 */
export function spliceEntries(indexObj, built, now = new Date().toISOString()) {
  const byId = new Map(indexObj.entries.map((e, i) => [e && e.id, i]));
  let added = 0, replaced = 0;
  for (const b of built) {
    const at = byId.get(b.id);
    if (at !== undefined) { indexObj.entries[at] = b.entry; replaced++; }
    else { indexObj.entries.push(b.entry); added++; }
  }
  indexObj.generatedAt = now;
  indexObj.wikiEmbeddedAt = now;
  indexObj.wikiEmbeddedCount = (indexObj.wikiEmbeddedCount || 0) + added + replaced;
  return { added, replaced };
}

/**
 * Ollama embedding — same endpoint/model as tribal-rerank.mjs (cosine parity).
 *
 * `expectedDim` (the index's own `dim`, 768) is asserted when provided: a
 * wrong endpoint/model returning a different-dimensionality vector would
 * otherwise be stored silently and `cosine()` in tribal-rerank would run
 * over mismatched lengths producing meaningless scores with no error —
 * "embedding stored" would be an R12 lie about retrievability. Fail loud.
 */
export async function embedText(text, fetchImpl = fetch, expectedDim = 0) {
  // Clamp to nomic's context window so a large body doesn't 500 the batch.
  const clamped = String(text || "").slice(0, MAX_EMBED_CHARS);
  const res = await fetchImpl(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: clamped }),
  });
  if (!res.ok) {
    const body = typeof res.text === "function" ? await res.text() : "";
    throw new Error(`ollama embed ${res.status}: ${body}`);
  }
  const j = await res.json();
  if (!Array.isArray(j.embedding) || j.embedding.length === 0) {
    throw new Error("ollama returned no embedding");
  }
  if (expectedDim > 0 && j.embedding.length !== expectedDim) {
    throw new Error(
      `ollama embedding dim ${j.embedding.length} != index dim ${expectedDim} ` +
      `(wrong model/endpoint? entry would be non-retrievable — R12 fail-loud)`,
    );
  }
  return j.embedding;
}

// Index writes now go through writeTribalIndexGuarded (shard-safe + clobber-
// guarded) under withTribalIndexLock in main() -- see the persist block. The
// old monolith-only, lock-less atomicWriteJSON was removed
// (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10): once the index sharded it
// left stale shards shadowing the write and JSON.stringify of a >512 MiB object
// would throw.

function parseArgs(argv) {
  const opts = { files: [], domain: DEFAULT_DOMAIN, apply: false, json: false, force: false, withContext: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") opts.apply = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--with-context") opts.withContext = true;
    else if (a === "--domain") {
      // Guard: only consume the next token as the value if it is NOT another
      // flag and NOT a file-looking arg (mirrors tribal-rerank.mjs:44). Without
      // this, `… a.md --domain b.md` silently swallows b.md as the domain.
      const next = argv[i + 1];
      if (next && !next.startsWith("--") && !/\.(md|markdown)$/i.test(next)) {
        opts.domain = next; i++;
      } else {
        opts.domain = DEFAULT_DOMAIN;
      }
    }
    else if (a.startsWith("--")) { /* ignore unknown flags */ }
    else opts.files.push(a);
  }
  if (!VALID_DOMAINS.has(opts.domain)) {
    opts.domainError = `invalid --domain "${opts.domain}" — must be one of ${[...VALID_DOMAINS].join(", ")} ` +
      `(an entry written with an unknown domain never matches tribal-rerank's in-domain boost)`;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const emit = (obj, code = 0) => {
    if (opts.json) process.stdout.write(JSON.stringify(obj));
    else {
      process.stdout.write(
        `embed-wiki-into-tribal-index → ${opts.domain}\n` +
        `  index:   ${INDEX_PATH}\n` +
        `  applied: ${opts.apply}\n` +
        `  added:   ${obj.added ?? 0}\n` +
        `  replaced:${obj.replaced ?? 0}\n` +
        `  skipped: ${(obj.skipped || []).length}\n` +
        `  total:   ${obj.total ?? "?"}\n` +
        (obj.error ? `  ERROR:   ${obj.error}\n` : "") +
        ((obj.plan || []).length ? `\nplan:\n` + obj.plan.map((p) => `  [+] ${p.id}`).join("\n") + "\n" : "") +
        (!opts.apply && (obj.plan || []).length ? `\nrerun with --apply to write.\n` : ""),
      );
    }
    process.exit(code);
  };

  if (opts.domainError) emit({ ok: false, error: opts.domainError }, 2);
  if (!opts.files.length) emit({ ok: false, error: "no input files — pass one or more wiki .md paths" }, 2);
  for (const f of opts.files) {
    if (!fs.existsSync(f)) emit({ ok: false, error: `file not found: ${f}` }, 2);
  }
  // Manifest-aware: a SHARDED index has no monolith .json, so a monolith-only
  // existsSync would false-"not found" a perfectly good sharded brain.
  if (!fs.existsSync(INDEX_PATH) && !fs.existsSync(INDEX_PATH.replace(/\.json$/i, "") + ".manifest.json")) {
    emit({ ok: false, error: `index not found: ${INDEX_PATH}` }, 2);
  }

  const idx = loadTribalIndex(INDEX_PATH, fs);
  // Pin the embedding dimensionality to the index's own `dim` so a wrong
  // model/endpoint is rejected loudly rather than writing a non-retrievable
  // entry (P1-c). Falls back to 768 (nomic-embed-text) if the index omits it.
  const expectedDim = Number(idx.dim) > 0 ? Number(idx.dim) : 768;
  const plan = planAppend(idx, opts.files, opts.force);
  let work = [...plan.toAdd, ...plan.toReplace];

  if (!opts.apply) {
    emit({
      ok: true, applied: false,
      added: plan.toAdd.length, replaced: plan.toReplace.length,
      skipped: plan.skipped, total: plan.total, expectedDim,
      plan: work.map((w) => ({ id: w.id, file: w.fp })),
    });
  }

  // Empty-extracted-text skip-guard (2026-06-08, gap #5 driver hardening — see
  // isEmbeddable). Deterministically partition known-unembeddable files OUT of
  // the work set BEFORE the all-or-nothing pool: a frontmatter-only / orphan /
  // all-whitespace page WILL yield no embedding, so skipping it proactively is
  // correct, not a weakened invariant — a genuine mid-batch Ollama death still
  // hard-aborts (R12). Raw is cached onto the work item so embedOne never
  // re-reads. Reported as skippedEmpty so the skip is surfaced, not silent.
  const skippedEmpty = [];
  {
    const embeddable = [];
    for (const w of work) {
      let raw;
      try { raw = fs.readFileSync(w.fp, "utf8"); }
      catch (e) {
        skippedEmpty.push({ id: w.id, file: w.fp, reason: "unreadable: " + String((e && e.message) || e).slice(0, 80) });
        continue;
      }
      if (isEmbeddable(raw)) { w.raw = raw; embeddable.push(w); }
      else skippedEmpty.push({ id: w.id, file: w.fp, reason: "empty-extracted-text" });
    }
    work = embeddable;
  }

  if (!work.length) {
    emit({
      ok: true, applied: true, added: 0, replaced: 0,
      skipped: plan.skipped, skippedEmpty, total: plan.total, expectedDim,
      note: skippedEmpty.length
        ? `nothing embeddable (${skippedEmpty.length} empty/unreadable skipped)`
        : "nothing to do (all present; use --force to re-embed)",
    });
  }

  // All-or-nothing: embed EVERYTHING first; any failure aborts before write.
  // Sequential by design — fail-fast on the first Ollama error, and a
  // parallel burst would hammer a memory-pressured single-GPU host.
  // P1-b: the no-partial-write invariant is structurally enforced here, not
  // left as an emergent property of emit()'s process.exit side effect — an
  // embed failure `return`s out of main() immediately after emit(), so the
  // splice/write block below is unreachable on any failure even if emit()
  // were ever refactored to not exit.
  // U-RAG-3 Contextual Retrieval — load the blurb cache (sidecar JSON keyed
  // on file winPath + mtime). The cache makes the embed pass resumable: a
  // re-run after Ollama or memory hiccups doesn't re-pay for already-generated
  // blurbs. Cache lives next to the index. Fail-soft per the lib.
  const BLURB_CACHE_PATH = INDEX_PATH.replace(/(\.json)?$/, ".blurbs-cache.json");
  const blurbCache = opts.withContext ? loadBlurbCache(BLURB_CACHE_PATH) : null;
  let blurbCacheDirty = false;
  let blurbHits = 0, blurbMisses = 0, blurbCacheHits = 0;

  // BLACKWELL-DB-GEN-MS0: the per-file embed body runs through a bounded worker
  // pool so up to PRISM_EMBED_CONCURRENCY files embed in flight on the GPU.
  // Default 1 = byte-identical to the prior serial loop (items processed in
  // order; the FIRST embed failure throws → the pool aborts and schedules
  // nothing after it → the catch below hard-aborts before any write, R12 all-or
  // -nothing, exit 3). --with-context adds a heavy LLM blurb-gen per item, so
  // prefer modest concurrency there; raw embed passes are safe at 16 on Blackwell.
  const embedOne = async (w) => {
    // Reuse the raw read by the empty-text partition above (w.raw); fall back to
    // a fresh read only if a caller bypassed that path.
    const raw = w.raw !== undefined ? w.raw : fs.readFileSync(w.fp, "utf8");
    const flat = flattenBody(raw);
    // U-RAG-3: optionally generate + prepend a context blurb. Cache hit short-
    // circuits the Ollama call. A blurb failure (Ollama down, timeout, malformed
    // response) returns null → we fall back to raw-chunk embed for that file,
    // never aborting the pass. The blurb is captured into the index entry's
    // `context` field and tagged `context_version` so a future audit can A/B.
    let context = null;
    if (opts.withContext) {
      let mtimeMs = 0;
      try { mtimeMs = fs.statSync(w.fp).mtimeMs || 0; } catch { /* mtime is best-effort */ }
      // Cache key includes BLURB_VERSION so bumping it (prompt change /
      // sanitizer change) self-invalidates every entry — prevents silent
      // reads of stale v1 blurbs after a v2 upgrade.
      const cacheKey = `${makeWinPath(w.fp)}:${BLURB_VERSION}`;
      const cached = readCacheHit(blurbCache, cacheKey, mtimeMs);
      if (cached) { context = cached; blurbCacheHits++; }
      else {
        const blurb = await generateBlurb(flat, { ollamaUrl: OLLAMA_URL });
        if (blurb) {
          context = blurb;
          writeCacheHit(blurbCache, cacheKey, blurb, mtimeMs);
          blurbCacheDirty = true;
          blurbHits++;
        } else { blurbMisses++; }
      }
    }
    const textForEmbed = context ? prependBlurb(context, flat) : flat;

    let embedding;
    try {
      embedding = await embedText(textForEmbed, fetch, expectedDim);
    } catch (e) {
      // Carry the offending file on the thrown error so the all-or-nothing catch
      // below reproduces the exact prior emit (phase:embed, file, exit 3).
      const err = new Error(String((e && e.message) || e));
      err.embedFailFile = w.fp;
      throw err;
    }
    return { id: w.id, entry: buildEntry(w.fp, raw, opts.domain, embedding, context) };
  };

  let built;
  try {
    built = await runEmbedPool(work, embedOne, { concurrency: resolveEmbedConcurrency() });
  } catch (e) {
    // Persist blurb cache progress even on a downstream embed failure — the
    // blurbs we DID generate are stable on disk and won't be re-paid for on
    // the resume run. The index itself is still all-or-nothing per R12.
    if (blurbCacheDirty) saveBlurbCache(BLURB_CACHE_PATH, blurbCache);
    emit({
      ok: false, phase: "embed", error: String((e && e.message) || e),
      file: e && e.embedFailFile ? e.embedFailFile : undefined,
      hint: `Ollama unreachable/erroring at ${OLLAMA_URL}. NOTHING written to the index (R12 fail-loud).`,
    }, 3);
    return; // structural hard-abort — see P1-b note above
  }

  // Persist under the cross-process lock (shard-safe + clobber-guarded). RE-READ
  // the index FRESH inside the lock (a peer embedder may have written during our
  // slow embed -- the planning `idx` is stale for the write), splice OUR built
  // entries into the fresh copy, then writeTribalIndexGuarded (monolith below
  // threshold, shards above, retires the superseded layout). prevCount = the
  // count BEFORE our splice (we only add/replace, never shrink). {ran:false} =>
  // a live peer holds the lock; index UNTOUCHED, re-run re-embeds (R12).
  let added = 0, replaced = 0, lockRan = false;
  try {
    const lock = withTribalIndexLock(INDEX_PATH, () => {
      const fresh = readTribalIndexGuarded(INDEX_PATH);
      if (!Array.isArray(fresh.entries)) {
        throw new Error("tribal-embed-index entries not an array -- refusing to write (R12 schema-probe)");
      }
      const prevCount = fresh.entries.length;
      const r = spliceEntries(fresh, built);
      added = r.added; replaced = r.replaced;
      writeTribalIndexGuarded(fresh, INDEX_PATH, { prevCount });
      idx.entries = fresh.entries; // sync the planning view for the emit total below
    });
    lockRan = lock.ran;
  } catch (e) {
    if (opts.withContext && blurbCacheDirty) saveBlurbCache(BLURB_CACHE_PATH, blurbCache);
    emit({ ok: false, phase: "write", error: String((e && e.message) || e), planned: work.length }, 3);
    return; // structural hard-abort (same invariant as the embed-failure path)
  }
  if (!lockRan) {
    if (opts.withContext && blurbCacheDirty) saveBlurbCache(BLURB_CACHE_PATH, blurbCache);
    emit({
      ok: false, phase: "write", planned: work.length,
      error: "tribal-index held by a peer writer; index UNTOUCHED -- re-run after the peer finishes",
    }, EXIT_TRIBAL_INDEX_LOCK_SKIP);
    return;
  }

  // U-RAG-3: persist blurb cache on successful index write.
  if (opts.withContext && blurbCacheDirty) saveBlurbCache(BLURB_CACHE_PATH, blurbCache);

  emit({
    ok: true, applied: true, added, replaced,
    skipped: plan.skipped, skippedEmpty, total: idx.entries.length, expectedDim,
    ids: built.map((b) => b.id),
    ...(opts.withContext ? {
      contextual: {
        version: BLURB_VERSION,
        blurbsGenerated: blurbHits,
        blurbsFromCache: blurbCacheHits,
        blurbFailures: blurbMisses,
        cachePath: BLURB_CACHE_PATH,
      },
    } : {}),
  });
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => {
    process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
    process.exit(1);
  });
}
