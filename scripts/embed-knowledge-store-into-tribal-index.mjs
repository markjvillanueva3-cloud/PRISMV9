#!/usr/bin/env node
/**
 * embed-knowledge-store-into-tribal-index.mjs
 *
 * HM-TRAINING-WIRING-PLAN-2026-05-20/U-HMT-EMBED-INDEX-WIRE (2026-05-20, slot foxtrot).
 *
 * Sister to `embed-wiki-into-tribal-index.mjs` — same pattern, different source.
 * Walks `cad-engine/knowledge_store/doc-*.json` and embeds each `.tips[]` entry
 * into `state/shared/tribal-embed-index.json` so vector recall via
 * `tribal-by-domain-inject` → `tribal-rerank` can surface harvested PDF tips.
 *
 * ## Why this exists (closes F4 of HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20)
 *
 * The audit found that 3 544 hyperMILL/hyperCAD-S tribal tips exist in
 * `cad-engine/knowledge_store/doc-hypermill-*.json` (+ doc-cad-manual,
 * doc-automation-center, doc-virtual-*, doc-tool-builder, doc-synchronization)
 * but ZERO of them appear in `tribal-embed-index.json`. The
 * `tribal-by-domain-inject` UserPromptSubmit hook is therefore structurally
 * blind to the entire HM corpus — every chat asking a hyperMILL question gets
 * BM25-fallback recall over a zero HM-sized index.
 *
 * Same class as `reference_tribal_embed_gap_2026_05_18` (wiki side): embed
 * index updated for one surface but not its sister surface.
 *
 * ## Canonical entry shape (compatible with tribal-rerank)
 *
 *   {
 *     id:        "tribal:" + <filename> + "#" + <tip._chunk or index>,
 *     source:    "tribal-knowledge-store",
 *     title:     <tip.title>,
 *     domain:    <inferred: cad | cam | mill | lathe | wedm | general>,
 *     text:      "<title> — <body>".slice(0,400),
 *     path:      "<knowledge_store>/<filename>#tip<chunk>",
 *     hash:      sha256(<title + body>).slice(0,16),
 *     embedding: <768-d nomic-embed-text:latest vector>,
 *     meta:      { category, tags, confidence, operation_types, page_ref, source_file }
 *   }
 *
 * `source:"tribal-knowledge-store"` is a NEW source bucket distinct from
 * "wiki"/"external"; tribal-rerank does a substring/case-insensitive source
 * match for the per-source formatter so any unknown source falls through to
 * the default text-only formatter (verified by reading rerank logic).
 *
 * ## Domain inference (mirrors tribal-rerank's VALID_DOMAINS)
 *
 *   filename contains "cad-manual"|"hyper.cad"|"fusion-cad"     → "cad"
 *   filename contains "hypermill"|"automation"|"virtual"|"tool-builder"|"sync"|"sql"|"mastercam"|"inventorcam"|"solidcam"|"fusion360-cam"|"py-cadcam" → "cam"
 *   tags include "wedm"|"edm"|"wire"|"wire-edm"                  → "wedm"
 *   tags include "lathe"|"turning"|"swiss"                       → "lathe"
 *   tags include "mill"|"milling"|"3-axis"|"5-axis"              → "mill"
 *   else                                                          → "general"
 *
 * Tags win over filename (a hyperMILL-Manual tip tagged "wedm" gets domain
 * "wedm" — that's the recall behavior we want from `tribal-by-domain-inject`).
 *
 * ## Safety / discipline (same as wiki sibling)
 *
 * - **All-or-nothing** embed BEFORE any write (R12 fail-loud — never partial)
 * - **Idempotent**: an entry whose `id` is already present is skipped unless --force
 * - **Atomic write**: temp + rename (compact JSON, no pretty-print — matches sibling)
 * - **Pure helpers** exported for hermetic tests
 * - **Sequential Ollama calls** — memory-pressured single-GPU host
 *
 * ## Run
 *
 *   # dry-run (default): list what would be embedded
 *   node scripts/embed-knowledge-store-into-tribal-index.mjs
 *
 *   # dry-run filtered to HM only
 *   node scripts/embed-knowledge-store-into-tribal-index.mjs --hm-only
 *
 *   # apply HM only
 *   node scripts/embed-knowledge-store-into-tribal-index.mjs --hm-only --apply
 *
 *   # apply all (HM + CAM siblings — bigger batch)
 *   node scripts/embed-knowledge-store-into-tribal-index.mjs --apply
 *
 *   # limit batch for memory-pressured runs
 *   node scripts/embed-knowledge-store-into-tribal-index.mjs --hm-only --apply --limit 500
 *
 * Knobs:
 *   PRISM_TRIBAL_INDEX_PATH   default H:/prism/state/shared/tribal-embed-index.json
 *   PRISM_OLLAMA_URL          default http://127.0.0.1:11434
 *   PRISM_KNOWLEDGE_STORE     default H:/prism/cad-engine/knowledge_store
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
// BLACKWELL-DB-GEN-MS0: bounded-concurrency embed pool. Default conc=1 = byte-identical serial.
import { runEmbedPool, resolveEmbedConcurrency } from "./lib/embed-pool.mjs";
// Shard-safe, clobber-guarded index IO + the cross-process write lock. This
// embedder previously did a monolith-only JSON.parse(readFileSync) +
// atomicWriteJSON with NO lock -- a clobber vector once the index shards (>480
// MiB the monolith .json is replaced by a manifest + shards) and a lost-update
// vector against a concurrent embedder. U-TRIBAL-SIBLING-WRITER-SHARD-SAFE
// 2026-06-10. [[reference_tribal_shard_read_clobber_2026_06_10]]
import { readTribalIndexGuarded, writeTribalIndexGuarded } from "./lib/tribal-index-guarded-io.mjs";
import { withTribalIndexLock, EXIT_TRIBAL_INDEX_LOCK_SKIP } from "./lib/tribal-index-lock.mjs";

export const INDEX_PATH = process.env.PRISM_TRIBAL_INDEX_PATH ||
  "H:/prism/state/shared/tribal-embed-index.json";
export const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
export const STORE_DIR = process.env.PRISM_KNOWLEDGE_STORE ||
  "H:/prism/cad-engine/knowledge_store";
export const MODEL = "nomic-embed-text:latest";
export const TEXT_MAX = 400;
export const VALID_DOMAINS = new Set(["mill", "lathe", "wedm", "cad", "cam", "backend-dev", "general"]);

const HM_FILE_RE = /^doc-(hypermill|hmautocolor|cad-manual|fusion-cad|automation-center|virtual-tool|virtual-mc|virtual-machining|tool-builder|synchronization-tool|sql-tool-db|sql-macro|hypermill-sql)/i;

/**
 * Domain inference — tags first, then filename keywords. Tags are the
 * extractor's own classification of the tip's *content*; filename is only the
 * *source* (a hyperCAD-S manual tip tagged "wedm" is still a wedm tip).
 */
export function inferDomain(filename, tip) {
  const tags = Array.isArray(tip && tip.tags) ? tip.tags.map((t) => String(t).toLowerCase()) : [];
  const ops = Array.isArray(tip && tip.operation_types) ? tip.operation_types.map((t) => String(t).toLowerCase()) : [];
  const bag = new Set([...tags, ...ops]);
  if (bag.has("wedm") || bag.has("edm") || bag.has("wire") || bag.has("wire-edm")) return "wedm";
  if (bag.has("lathe") || bag.has("turning") || bag.has("swiss") || bag.has("thread_cutting") || bag.has("grooving") || bag.has("parting")) return "lathe";
  if (bag.has("mill") || bag.has("milling") || bag.has("3-axis") || bag.has("5-axis") || bag.has("3+2")) return "mill";

  const lower = String(filename).toLowerCase();
  if (/cad-manual|hyper.?cad|fusion-cad/.test(lower)) return "cad";
  if (/hypermill|automation|virtual|tool-builder|synchronization|sql|mastercam|inventorcam|solidcam|fusion360-cam|py-cadcam|getting-started-with-mastercam/.test(lower)) return "cam";
  return "general";
}

/**
 * Flatten a tip into the embed-ready text. Title + body separated by " — " is
 * the recall-optimal shape (title is the high-signal query target, body is the
 * detail; cosine over both gives correct in-domain ranking).
 */
export function flattenTip(tip) {
  const title = String((tip && tip.title) || "").trim();
  const body = String((tip && tip.body) || "").trim();
  if (title && body) return `${title} — ${body}`;
  return title || body || "";
}

export function contentHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function makeId(filename, chunkOrIndex) {
  const stem = filename.replace(/\.json$/i, "");
  return `tribal:${stem}#${chunkOrIndex}`;
}

/**
 * Build a canonical index entry. `embedding` is injected (caller owns Ollama).
 * Returns null when the tip text is empty (defensive — extractor occasionally
 * emits placeholder tips with neither title nor body).
 */
export function buildEntry(filename, tip, idx, domain, embedding) {
  const flat = flattenTip(tip);
  if (!flat) return null;
  const chunk = (tip && typeof tip._chunk === "number") ? tip._chunk : idx;
  const id = makeId(filename, chunk);
  const title = String((tip && tip.title) || "untitled-tip").slice(0, 200);
  return {
    id,
    source: "tribal-knowledge-store",
    title,
    domain,
    text: flat.slice(0, TEXT_MAX),
    path: `${STORE_DIR}/${filename}#tip${chunk}`,
    hash: contentHash(flat),
    embedding,
    meta: {
      category: (tip && tip.category) || null,
      tags: Array.isArray(tip && tip.tags) ? tip.tags : [],
      confidence: (tip && typeof tip.confidence === "number") ? tip.confidence : null,
      operation_types: Array.isArray(tip && tip.operation_types) ? tip.operation_types : [],
      page_ref: (tip && tip.page_ref) || null,
      source_file: filename,
    },
  };
}

/**
 * Pure planner. Returns the full list of (filename, tip, index, domain) entries
 * that would be created, after de-dup against indexObj.entries by id.
 */
export function planEmbed(indexObj, storeFiles, opts = {}) {
  const { hmOnly = false, force = false, limit = 0 } = opts;
  const entries = (indexObj && Array.isArray(indexObj.entries)) ? indexObj.entries : [];
  const existing = new Set(entries.map((e) => e && e.id));
  const filtered = hmOnly ? storeFiles.filter((f) => HM_FILE_RE.test(f)) : storeFiles;
  const toAdd = [];
  const toReplace = [];
  const skipped = [];
  for (const filename of filtered) {
    const filePath = path.join(STORE_DIR, filename);
    let j;
    try { j = JSON.parse(fs.readFileSync(filePath, "utf8")); }
    catch (e) { skipped.push({ filename, reason: "parse-failed", error: String(e && e.message || e) }); continue; }
    if (!j || !Array.isArray(j.tips)) { skipped.push({ filename, reason: "no-tips-array" }); continue; }
    if (j.tips.length === 0) { skipped.push({ filename, reason: "zero-tips" }); continue; }
    for (let i = 0; i < j.tips.length; i++) {
      if (limit > 0 && (toAdd.length + toReplace.length) >= limit) break;
      const tip = j.tips[i];
      const flat = flattenTip(tip);
      if (!flat) { skipped.push({ filename, idx: i, reason: "empty-text" }); continue; }
      const chunk = (tip && typeof tip._chunk === "number") ? tip._chunk : i;
      const id = makeId(filename, chunk);
      const domain = inferDomain(filename, tip);
      if (existing.has(id)) {
        if (force) toReplace.push({ filename, tip, idx: i, domain, id });
        else skipped.push({ filename, idx: i, reason: "already-present", id });
      } else {
        toAdd.push({ filename, tip, idx: i, domain, id });
      }
    }
    if (limit > 0 && (toAdd.length + toReplace.length) >= limit) break;
  }
  return { toAdd, toReplace, skipped, total: entries.length };
}

/**
 * Pure splice — same shape as wiki sibling. Replaces existing ids in place,
 * appends new ones, updates provenance.
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
  indexObj.knowledgeStoreEmbeddedAt = now;
  indexObj.knowledgeStoreEmbeddedCount = (indexObj.knowledgeStoreEmbeddedCount || 0) + added + replaced;
  return { added, replaced };
}

export async function embedText(text, fetchImpl = fetch, expectedDim = 0) {
  const res = await fetchImpl(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: text }),
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
    throw new Error(`ollama embedding dim ${j.embedding.length} != index dim ${expectedDim} (R12 fail-loud)`);
  }
  return j.embedding;
}

// Index writes now go through writeTribalIndexGuarded (shard-safe + clobber-
// guarded) under withTribalIndexLock in main() -- see the persist block. The
// old monolith-only, lock-less atomicWriteJSON was removed
// (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10).

function parseArgs(argv) {
  const opts = { apply: false, json: false, force: false, hmOnly: false, limit: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") opts.apply = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--hm-only") opts.hmOnly = true;
    else if (a === "--limit") {
      const v = parseInt(argv[i + 1], 10);
      if (Number.isFinite(v) && v > 0) { opts.limit = v; i++; }
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const emit = (obj, code = 0) => {
    if (opts.json) process.stdout.write(JSON.stringify(obj));
    else {
      process.stdout.write(
        `embed-knowledge-store-into-tribal-index\n` +
        `  index:     ${INDEX_PATH}\n` +
        `  store:     ${STORE_DIR}\n` +
        `  hmOnly:    ${opts.hmOnly}\n` +
        `  applied:   ${opts.apply}\n` +
        `  limit:     ${opts.limit || "none"}\n` +
        `  toAdd:     ${obj.toAdd ?? obj.added ?? 0}\n` +
        `  toReplace: ${obj.toReplace ?? obj.replaced ?? 0}\n` +
        `  skipped:   ${(obj.skipped || []).length}\n` +
        `  total:     ${obj.total ?? "?"}\n` +
        (obj.error ? `  ERROR:     ${obj.error}\n` : "") +
        (!opts.apply && (obj.toAdd || 0) > 0 ? `\nrerun with --apply to write.\n` : ""),
      );
    }
    process.exit(code);
  };

  // Manifest-aware: a SHARDED index has no monolith .json, so a monolith-only
  // existsSync would false-"not found" a perfectly good sharded brain.
  if (!fs.existsSync(INDEX_PATH) && !fs.existsSync(INDEX_PATH.replace(/\.json$/i, "") + ".manifest.json")) {
    emit({ ok: false, error: `index not found: ${INDEX_PATH}` }, 2);
  }
  if (!fs.existsSync(STORE_DIR)) emit({ ok: false, error: `store not found: ${STORE_DIR}` }, 2);

  const idx = readTribalIndexGuarded(INDEX_PATH); // manifest-aware + V8-cap-safe (planning view)
  const expectedDim = Number(idx.dim) > 0 ? Number(idx.dim) : 768;
  const storeFiles = fs.readdirSync(STORE_DIR).filter((f) => f.startsWith("doc-") && f.endsWith(".json"));
  const plan = planEmbed(idx, storeFiles, { hmOnly: opts.hmOnly, force: opts.force, limit: opts.limit });
  const work = [...plan.toAdd, ...plan.toReplace];

  if (!opts.apply) {
    emit({
      ok: true, applied: false,
      toAdd: plan.toAdd.length, toReplace: plan.toReplace.length,
      skipped: plan.skipped, total: plan.total, expectedDim,
      domain_breakdown: countDomains(plan.toAdd),
      file_breakdown: countFiles(plan.toAdd),
    });
  }

  if (!work.length) {
    emit({ ok: true, applied: true, added: 0, replaced: 0, skipped: plan.skipped, total: plan.total, expectedDim, note: "nothing to do" });
  }

  // All-or-nothing structural invariant (P1-b from wiki sibling):
  // embed EVERYTHING before any write; any failure aborts.
  // Note: with 3 544 HM tips this can take minutes — use --limit for incremental runs.
  // BLACKWELL-DB-GEN-MS0: embed the batch through a bounded worker pool so up to
  // PRISM_EMBED_CONCURRENCY tips embed in flight on the GPU. Default 1 = the
  // prior serial loop, byte-identical. A worker THROWS on an embed failure → the
  // pool aborts and the catch below hard-aborts before any write (all-or-nothing,
  // exit 3). A worker RETURNS null when buildEntry yields nothing (empty tip) →
  // the pool tolerates it and the null is filtered out, matching the old
  // `if (entry) built.push(...)` skip.
  const embedOne = async (w) => {
    const flat = flattenTip(w.tip);
    let embedding;
    try {
      embedding = await embedText(flat, fetch, expectedDim);
    } catch (e) {
      const err = new Error(String((e && e.message) || e));
      err.embedFail = { file: w.filename, idx: w.idx };
      throw err;
    }
    const entry = buildEntry(w.filename, w.tip, w.idx, w.domain, embedding);
    return entry ? { id: w.id, entry } : null;
  };

  let built;
  try {
    const results = await runEmbedPool(work, embedOne, { concurrency: resolveEmbedConcurrency() });
    built = results.filter(Boolean);
  } catch (e) {
    emit({
      ok: false, phase: "embed", error: String((e && e.message) || e),
      file: e && e.embedFail ? e.embedFail.file : undefined,
      idx: e && e.embedFail ? e.embedFail.idx : undefined,
      planned: work.length,
      hint: `Ollama unreachable/erroring at ${OLLAMA_URL}. NOTHING written (R12 fail-loud).`,
    }, 3);
    return;
  }

  // Persist under the cross-process lock (SHORT critical section): RE-READ the
  // index fresh (a peer embedder may have written during our slow embed -- the
  // planning `idx` is stale for the write), splice OUR built entries by id into
  // the fresh copy, shard-safe guarded write. prevCount = the count BEFORE our
  // splice (we only add/replace, never shrink). {ran:false} => a live peer holds
  // the lock; the index is UNTOUCHED, re-run re-embeds (ids absent => not skipped).
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
    emit({ ok: false, phase: "write", error: String((e && e.message) || e), planned: work.length }, 3);
    return;
  }
  if (!lockRan) {
    emit({
      ok: false, phase: "write", planned: work.length,
      error: "tribal-index held by a peer writer; index UNTOUCHED -- re-run after the peer finishes",
    }, EXIT_TRIBAL_INDEX_LOCK_SKIP);
    return;
  }

  emit({
    ok: true, applied: true, added, replaced,
    skipped: plan.skipped, total: idx.entries.length, expectedDim,
    domain_breakdown: countDomains(plan.toAdd),
  });
}

function countDomains(items) {
  const c = {};
  for (const it of items) c[it.domain] = (c[it.domain] || 0) + 1;
  return c;
}
function countFiles(items) {
  const c = {};
  for (const it of items) c[it.filename] = (c[it.filename] || 0) + 1;
  return c;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((e) => {
    process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
    process.exit(1);
  });
}
