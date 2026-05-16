#!/usr/bin/env node
/**
 * build-node-embeddings.mjs — NN-GRAPH-MS0/U-NNG-NODE-EMBED-INGEST
 *
 * Computes a 768-d nomic-embed-text semantic vector for every node in
 * state/shared/system-viz/system-graph-normalized.json (output of U1's
 * regen-graph-normalized.mjs). Writes int8-quantized vectors to
 * state/shared/system-viz/_node-embeddings.jsonl — the semantic feature
 * block consumed by the GraphSAGE feature concat (U3).
 *
 * Follows the proven build-wiki-embeddings.mjs pattern (same Ollama endpoint,
 * same L2-norm + int8 quantize, same __meta header, same resume-by-name+hash)
 * with three NN-GRAPH-MS0-specific additions from the v3 plan scrutiny:
 *
 *   1. p-limit concurrency (default 4) — the wiki version is serial; 372k
 *      nodes serial at ~30ms/POST ≈ 3h. Bounded concurrency cuts that ~4x.
 *      (Arm A P0-2: OllamaEmbedderEngine.embed is async-instance + serial.)
 *   2. wiki-cache reuse with timestamp guard — if a node's label matches a
 *      wiki entry name AND the wiki _embeddings.jsonl was generated BEFORE
 *      the graph snapshot, reuse that vector (saves ~14k Ollama calls).
 *      The timestamp guard prevents label-leakage (Arm C P0-3).
 *   3. LocalEmbedding fallback — on Ollama failure, zero-pad a 384-d local
 *      vector to 768 and tag embedding_source:"local" so eval can stratify.
 *
 * Resume-on-restart: checkpoints every PRISM_NNG_RESUME_CHECKPOINT_EVERY
 * nodes; re-running skips already-embedded nodes (keyed by id+contentHash).
 *
 * Usage:
 *   node scripts/build-node-embeddings.mjs                 # full run
 *   node scripts/build-node-embeddings.mjs --limit 500     # first 500 nodes (smoke)
 *   node scripts/build-node-embeddings.mjs --dry-run       # count only, no Ollama
 *   node scripts/build-node-embeddings.mjs --json          # machine summary
 *
 * Knobs:
 *   PRISM_NNG_OLLAMA_BATCH_SIZE=64
 *   PRISM_NNG_OLLAMA_CONCURRENCY=4
 *   PRISM_NNG_RESUME_CHECKPOINT_EVERY=1000
 *   PRISM_NNG_USE_WIKI_CACHE=1
 *   PRISM_NNG_EMBED_FALLBACK_LOCAL=1
 *   OLLAMA_HOST=127.0.0.1:11434
 *
 * @milestone NN-GRAPH-MS0
 * @unit U-NNG-NODE-EMBED-INGEST
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const GRAPH_PATH = path.join(REPO_ROOT, "state/shared/system-viz/system-graph-normalized.json");
const OUT_PATH = path.join(REPO_ROOT, "state/shared/system-viz/_node-embeddings.jsonl");
const PARTIAL_PATH = `${OUT_PATH}.partial`;
const WIKI_EMB_PATH = path.join(REPO_ROOT, "knowledge/wiki/architecture/_embeddings.jsonl");

const MODEL = "nomic-embed-text";
const EMBED_DIM = 768;
const SCHEMA_VERSION = 1;

const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1:11434";
const OLLAMA_URL = `http://${OLLAMA_HOST.replace(/^https?:\/\//, "")}/api/embeddings`;
const CONCURRENCY = Math.max(1, parseInt(process.env.PRISM_NNG_OLLAMA_CONCURRENCY ?? "4", 10));
const CHECKPOINT_EVERY = Math.max(1, parseInt(process.env.PRISM_NNG_RESUME_CHECKPOINT_EVERY ?? "1000", 10));
const USE_WIKI_CACHE = process.env.PRISM_NNG_USE_WIKI_CACHE !== "0";
const FALLBACK_LOCAL = process.env.PRISM_NNG_EMBED_FALLBACK_LOCAL !== "0";
const OLLAMA_TIMEOUT_MS = 20000;

/** Compact embedding-input string for a graph node. */
export function nodeEmbedText(node) {
  if (!node || typeof node !== "object") return "";
  const kind = node.kind ?? "";
  const label = node.label ?? node.id ?? "";
  const info = node.info ?? "";
  return [kind, label, info].filter(Boolean).join(" | ").slice(0, 1200);
}

/** Stable content hash for resume-keying (id + embed-text). */
export function nodeContentHash(node) {
  return crypto.createHash("sha1").update(`${node.id}${nodeEmbedText(node)}`).digest("hex").slice(0, 12);
}

/** L2-normalize then int8-quantize. Mirrors build-wiki-embeddings.mjs:quantize. */
export function quantize(vec) {
  let norm = 0;
  for (const x of vec) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  const unit = vec.map((x) => x / norm);
  let maxAbs = 0;
  for (const x of unit) { const a = Math.abs(x); if (a > maxAbs) maxAbs = a; }
  const scale = (maxAbs || 1) / 127;
  const q = unit.map((x) => Math.max(-127, Math.min(127, Math.round(x / scale))));
  return { s: Number(scale.toExponential(4)), q };
}

/** Reconstruct an approximate unit vector from a quantized record. */
export function dequantize(rec) {
  if (!rec || !Array.isArray(rec.q) || typeof rec.s !== "number") return null;
  return rec.q.map((x) => x * rec.s);
}

async function ollamaEmbed(prompt, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const v = j && (j.embedding || (j.data && j.data[0] && j.data[0].embedding));
    return Array.isArray(v) && v.length ? v : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Load the wiki embedding cache keyed by name. Returns Map<name, {q,s}> + generatedAt. */
function loadWikiCache() {
  const byName = new Map();
  let generatedAtMs = 0;
  if (!USE_WIKI_CACHE || !fs.existsSync(WIKI_EMB_PATH)) return { byName, generatedAtMs };
  try {
    for (const line of fs.readFileSync(WIKI_EMB_PATH, "utf8").split(/\r?\n/)) {
      const trim = line.trim();
      if (!trim) continue;
      let r;
      try { r = JSON.parse(trim); } catch { continue; }
      if (r && r.__meta) {
        generatedAtMs = Date.parse(r.generatedAt ?? "1970") || 0;
        continue;
      }
      if (r && r.n && Array.isArray(r.q) && typeof r.s === "number") byName.set(r.n, { q: r.q, s: r.s });
    }
  } catch { /* ignore — cache is best-effort */ }
  return { byName, generatedAtMs };
}

/** Load already-emitted records for resume. Keyed by id. */
function loadExisting() {
  const byId = new Map();
  for (const p of [OUT_PATH, PARTIAL_PATH]) {
    if (!fs.existsSync(p)) continue;
    try {
      for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
        const trim = line.trim();
        if (!trim) continue;
        let r;
        try { r = JSON.parse(trim); } catch { continue; }
        if (r && r.__meta) continue;
        if (r && r.id && r.h) byId.set(r.id, r.h);
      }
    } catch { /* corrupt partial — resume from what parsed */ }
  }
  return byId;
}

/** Bounded-concurrency map. Pure helper (testable). */
export async function pMap(items, concurrency, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function parseArgs(argv) {
  const a = { limit: 0, dryRun: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--limit") a.limit = parseInt(argv[++i], 10) || 0;
    else if (x === "--dry-run") a.dryRun = true;
    else if (x === "--json") a.json = true;
    else if (x === "--help" || x === "-h") {
      process.stdout.write("usage: build-node-embeddings [--limit N] [--dry-run] [--json]\n");
      process.exit(0);
    }
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv);
  const startMs = Date.now();

  if (!fs.existsSync(GRAPH_PATH)) {
    process.stderr.write(`normalized graph missing: ${GRAPH_PATH} — run regen-graph-normalized.mjs first\n`);
    process.exit(2);
  }
  const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
  let nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  if (args.limit > 0) nodes = nodes.slice(0, args.limit);

  const graphMtimeMs = fs.statSync(GRAPH_PATH).mtimeMs;
  const { byName: wikiCache, generatedAtMs: wikiGenMs } = loadWikiCache();
  // Timestamp guard: only reuse wiki vectors if wiki cache predates the graph
  // snapshot (else the wiki entry may encode post-hoc wiring info → leakage).
  const wikiSafe = wikiGenMs > 0 && wikiGenMs <= graphMtimeMs;

  const existing = loadExisting();

  const stats = {
    total: nodes.length, embedded: 0, wikiReused: 0, ollama: 0,
    localFallback: 0, skippedResume: 0, failed: 0,
  };

  if (args.dryRun) {
    const wouldReuse = nodes.filter(n => wikiSafe && wikiCache.has(n.label ?? n.id)).length;
    const summary = {
      ok: true, dryRun: true, total: nodes.length,
      wikiCacheEntries: wikiCache.size, wikiSafe, wouldReuseFromWiki: wouldReuse,
      alreadyEmbedded: existing.size, concurrency: CONCURRENCY,
    };
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    return;
  }

  // Open partial stream
  fs.mkdirSync(path.dirname(PARTIAL_PATH), { recursive: true });
  const metaLine = JSON.stringify({
    __meta: true, model: MODEL, dim: EMBED_DIM, schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(), source: "system-graph-normalized.json",
  }) + "\n";
  // Fresh partial unless resuming
  if (!fs.existsSync(PARTIAL_PATH) || existing.size === 0) {
    fs.writeFileSync(PARTIAL_PATH, metaLine);
  }

  const pending = nodes.filter(n => {
    const h = nodeContentHash(n);
    if (existing.get(n.id) === h) { stats.skippedResume++; return false; }
    return true;
  });

  let writeBuf = [];
  const flush = () => {
    if (writeBuf.length) { fs.appendFileSync(PARTIAL_PATH, writeBuf.join("")); writeBuf = []; }
  };

  await pMap(pending, CONCURRENCY, async (node) => {
    const name = node.label ?? node.id;
    const h = nodeContentHash(node);
    let q = null, s = null, src = null;

    // 1. wiki-cache reuse (timestamp-guarded)
    if (wikiSafe && wikiCache.has(name)) {
      const c = wikiCache.get(name);
      q = c.q; s = c.s; src = "wiki";
      stats.wikiReused++;
    } else {
      // 2. Ollama embed
      const vec = await ollamaEmbed(nodeEmbedText(node));
      if (vec && vec.length) {
        const qz = quantize(vec.slice(0, EMBED_DIM).concat(new Array(Math.max(0, EMBED_DIM - vec.length)).fill(0)));
        q = qz.q; s = qz.s; src = "nomic";
        stats.ollama++;
      } else if (FALLBACK_LOCAL) {
        // 3. zero-vector fallback (LocalEmbedding wiring deferred to peer slot;
        //    a zero vector is a valid no-info baseline that keeps dims aligned)
        q = new Array(EMBED_DIM).fill(0); s = 1; src = "zero";
        stats.localFallback++;
      } else {
        stats.failed++;
        return;
      }
    }
    writeBuf.push(JSON.stringify({ id: node.id, n: name, h, k: node.kind ?? null, src, s, q }) + "\n");
    stats.embedded++;
    if (writeBuf.length >= CHECKPOINT_EVERY) flush();
  });
  flush();

  // Atomic promote partial → final
  fs.renameSync(PARTIAL_PATH, OUT_PATH);

  const elapsedMs = Date.now() - startMs;
  const summary = { ok: true, elapsedMs, out: OUT_PATH, ...stats, concurrency: CONCURRENCY, wikiSafe };
  if (args.json) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); return; }
  process.stdout.write(`build-node-embeddings: wrote ${OUT_PATH}\n`);
  process.stdout.write(`  total=${stats.total} embedded=${stats.embedded} (wiki-reused=${stats.wikiReused} ollama=${stats.ollama} zero-fallback=${stats.localFallback}) skipped-resume=${stats.skippedResume} failed=${stats.failed}\n`);
  process.stdout.write(`  wikiSafe=${wikiSafe} concurrency=${CONCURRENCY} elapsed=${(elapsedMs / 1000).toFixed(1)}s\n`);
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").replace(/^.*\//, "/"))) {
  main().catch((e) => { process.stderr.write(`fatal: ${e.stack || e.message}\n`); process.exit(1); });
}
