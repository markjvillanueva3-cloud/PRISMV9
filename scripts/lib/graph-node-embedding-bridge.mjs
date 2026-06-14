#!/usr/bin/env node
/**
 * graph-node-embedding-bridge.mjs — RAG-UPGRADE-MS0 / U-GNN-NODE-EMBED-BRIDGE
 *                                   (2026-05-23, slot golf).
 *
 * Closes the missing mapping layer that the empirical NN-GRAPH retrain
 * (commit-cluster 2026-05-22, `graphsage-checkpoint-768d-rag-upgrade.json`)
 * exposed: `embeddingHitCount=0`. The trainer's `loadEmbeddingFeatures` loader
 * expects an embedding-source JSONL keyed by `n: <node.id>`, but the wiki
 * tribal-embed-index is keyed by `wiki:<rel-path>` (or `external:<abs>`). Until
 * something joins them, the trainer falls back to the 8-d projected hand
 * features and AUROC sticks at 0.297, below the 0.78 promotion gate.
 *
 * The bridge: each system-viz node already carries `knowledge.wikiEntries[]`
 * with absolute `path` fields. For every node we (a) translate each abs path
 * back to the tribal index key, (b) look up the 768-d embedding, (c) aggregate
 * multiple hits into an L2-normalized centroid, (d) int8-quantize for the
 * loader's `q[i]/127` dequant convention. Nodes whose wiki entries are NOT in
 * the index are omitted — the trainer treats them as miss + zero-vector
 * (already proven in PARTIAL-HIT loader test, `graphsage-train-pipeline.test.mjs:981`).
 *
 * Output JSONL shape (matches the loader fixture exactly):
 *
 *   {"__meta":true,"model":"nomic-embed-text:latest","dim":768,"count":N,
 *    "generatedAt":"...","schemaVersion":1,"source":"graph-node-bridge"}
 *   {"n":"p.operator","q":[127,0,-127,...]}
 *   {"n":"engine.WireEDMOptimizationEngine","q":[...]}
 *   ...
 *
 * Pure functions are exported + reference-tested (R9). The imperative shell
 * `buildEmbeddingSource()` is fail-loud (R12) — every error returns a result
 * object with `ok:false` + a typed `errors:[]` array, never throws silently.
 *
 * Wired from:
 *   - scripts/build-graph-node-embeddings.mjs (CLI builder)
 *   - scripts/nn-graph-retrain-lifecycle.mjs (--embedding-source forwarding)
 *   - prism_dev:gnn_node_embeddings_build (dispatcher action)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./graph-io.mjs";
import { loadTribalIndex } from "./load-tribal-index.mjs";

// scripts/lib/<this>.mjs → scripts/lib → scripts → repo root
const __filename = fileURLToPath(import.meta.url);
const PRISM_ROOT = path.resolve(path.dirname(__filename), "..", "..");

/* ------------------------------------------------------------------ *
 * Pure decision functions — exported, reference-tested, no I/O.
 * ------------------------------------------------------------------ */

/**
 * Convert a graph-node `knowledge.wikiEntries[].path` (absolute Windows or
 * POSIX path) into the canonical tribal-embed-index id (`wiki:<rel-path>`).
 *
 * Rules:
 *   - Normalize backslashes to forward slashes.
 *   - The path MUST contain `/knowledge/wiki/` — that anchor is what separates
 *     the repo prefix (`H:/prism`) from the wiki-relative tail.
 *   - Returns `null` when the path is outside the wiki tree (no anchor), is
 *     empty, or is non-string. The bridge counts those as misses; it does NOT
 *     throw — wikiEntries[] is graph-generator output and a stray non-wiki
 *     path (e.g. a memory or spec) must not crash the bridge.
 *
 * Examples:
 *   "H:/prism/knowledge/wiki/architecture/foo.md" → "wiki:knowledge/wiki/architecture/foo.md"
 *   "H:\\prism\\knowledge\\wiki\\architecture\\bar.md" → "wiki:knowledge/wiki/architecture/bar.md"
 *   "/repo/prism/knowledge/wiki/x.md" → "wiki:knowledge/wiki/x.md"
 *   "H:/prism/state/shared/foo.json" → null  (no wiki anchor)
 *   ""                                → null
 *   null                              → null
 */
export function wikiPathToIndexKey(absPath) {
  if (typeof absPath !== "string" || absPath.length === 0) return null;
  const norm = absPath.replace(/\\/g, "/");
  const anchor = "/knowledge/wiki/";
  const idx = norm.indexOf(anchor);
  if (idx < 0) return null;
  return "wiki:" + norm.substring(idx + 1); // drop the leading slash
}

/**
 * L2-normalize a vector in place semantics, but returns a fresh Float64Array
 * (caller may want the input intact). Zero vectors return null — quantizing a
 * zero vector is meaningless (every q[i] = 0 is indistinguishable from miss).
 *
 * Throws RangeError on:
 *   - non-array / empty input (boundary)
 *   - NaN or Infinity component (adversarial — fail loud per R12 instead of
 *     silently propagating into the trainer)
 */
export function l2Normalize(vec) {
  if (!Array.isArray(vec) && !ArrayBuffer.isView(vec)) {
    throw new RangeError("l2Normalize: input must be array-like");
  }
  if (vec.length === 0) throw new RangeError("l2Normalize: empty vector");
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    const v = vec[i];
    if (!Number.isFinite(v)) {
      throw new RangeError(`l2Normalize: non-finite component at index ${i}: ${v}`);
    }
    sumSq += v * v;
  }
  if (sumSq === 0) return null;
  const norm = Math.sqrt(sumSq);
  const out = new Float64Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

/**
 * Aggregate N embedding vectors into one node-representative embedding via
 * L2-normalized centroid. The "L2 → mean → L2" pattern keeps the result on the
 * unit sphere so cosine similarity downstream matches single-entry nodes.
 *
 * Why centroid and not max-pool or weighted: every wiki entry the graph
 * attaches to a node represents A facet of that node's role. Treating them
 * equally is the most defensible default; weighting by length/relevance is
 * orthogonal future work (would need a wiki-entry quality signal).
 *
 * Mismatched dims throw RangeError — a node cannot be represented by vectors
 * from incompatible vector spaces (would mean the index has corrupt data).
 *
 * Returns:
 *   { vector: Float64Array, hits: N, dim: K }   on success
 *   null                                         when every input was
 *                                                   degenerate (zero vector)
 */
export function aggregateEmbeddings(vectors) {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    throw new RangeError("aggregateEmbeddings: vectors must be a non-empty array");
  }
  const normalized = [];
  let dim = -1;
  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i];
    if (!Array.isArray(v) && !ArrayBuffer.isView(v)) {
      throw new RangeError(`aggregateEmbeddings: input ${i} not array-like`);
    }
    if (dim < 0) dim = v.length;
    else if (v.length !== dim) {
      throw new RangeError(
        `aggregateEmbeddings: dim mismatch at input ${i}: ${v.length} vs ${dim}`,
      );
    }
    const n = l2Normalize(v);
    if (n) normalized.push(n);
  }
  if (normalized.length === 0) return null;
  const sum = new Float64Array(dim);
  for (const n of normalized) {
    for (let i = 0; i < dim; i++) sum[i] += n[i];
  }
  for (let i = 0; i < dim; i++) sum[i] /= normalized.length;
  // Re-normalize the centroid — mean-of-unit-vectors is generally NOT unit.
  const final = l2Normalize(sum);
  if (!final) return null;
  return { vector: final, hits: normalized.length, dim };
}

/**
 * Quantize a Float64Array (assumed unit-L2) to int8 via `q[i] = round(v[i]*127)`
 * with clamp to [-127, 127]. Matches the loader's `q[i]/127` dequant convention
 * (graphsage-train-pipeline.test.mjs:776 fixture: `q:[127,0,-127]` ↔ [1,0,-1]).
 *
 * Why int8 not float32: file-size — 768 dims × ~24K nodes × 4 bytes (float32) =
 * ~74 MB vs ~18 MB at int8. The loader already does the cheap divide on read.
 * Quantization error on a unit vector is ≤ 1/127 ≈ 0.004 per component, well
 * below the noise floor of cosine similarity at 768-d.
 *
 * Throws if any input is non-finite (defensive — l2Normalize should have
 * caught this upstream, but the bridge is the LAST guard before bytes hit
 * disk).
 */
export function quantizeInt8(vec) {
  if (!Array.isArray(vec) && !ArrayBuffer.isView(vec)) {
    throw new RangeError("quantizeInt8: input must be array-like");
  }
  const out = new Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    const v = vec[i];
    if (!Number.isFinite(v)) {
      throw new RangeError(`quantizeInt8: non-finite at index ${i}: ${v}`);
    }
    const q = Math.round(v * 127);
    out[i] = q > 127 ? 127 : q < -127 ? -127 : q;
  }
  return out;
}

/**
 * Build the index-key → embedding-vector lookup map from a tribal-embed-index
 * entries array. Skips entries with non-array `embedding` (defensive against
 * stale index entries written before the embedding step completed). The lookup
 * Map is the only structure the per-node walk touches, so making it
 * pre-validated keeps the hot path branch-free.
 *
 * Returns: { lookup: Map<id, number[]>, dim: K|null, skipped: N }
 *   - dim is set from the first valid entry; subsequent dim-mismatch entries
 *     are skipped (counted) — heterogeneous-dim indexes can exist transiently
 *     during a model swap, and the bridge tolerates that without corrupting
 *     the output dim.
 */
export function buildIndexLookup(entries) {
  if (!Array.isArray(entries)) {
    throw new RangeError("buildIndexLookup: entries must be an array");
  }
  const lookup = new Map();
  let dim = null;
  let skipped = 0;
  for (const e of entries) {
    if (!e || typeof e.id !== "string" || !Array.isArray(e.embedding)) {
      skipped++;
      continue;
    }
    if (dim === null) {
      dim = e.embedding.length;
    } else if (e.embedding.length !== dim) {
      skipped++;
      continue;
    }
    lookup.set(e.id, e.embedding);
  }
  return { lookup, dim, skipped };
}

/**
 * Resolve a single graph node to a quantized embedding row, or null when the
 * node has no recoverable wiki coverage. The shape returned is exactly what
 * `writeJsonlRow` consumes; this keeps `buildEmbeddingSource` a flat loop.
 *
 * Returns:
 *   { n: nodeId, q: int8[], hits: K, dim: D }   on success
 *   null                                         when 0 wiki entries OR 0 hits
 *                                                   AGAINST the lookup
 *
 * Notes:
 *   - A node with `knowledge.wikiEntries` undefined / non-array is a 0-hit
 *     node (omitted), NOT an error.
 *   - Duplicate index keys within a single node (same wiki entry listed
 *     twice) are de-duplicated so they don't double-weight the centroid.
 */
export function nodeToEmbeddingRow(node, lookup, opts = {}) {
  if (!node || typeof node.id !== "string") return null;

  const seenKeys = new Set();
  const vectors = [];

  // Path 1 (canonical): node.knowledge.wikiEntries[].path → wiki:<rel-path>
  const wikiEntries = node.knowledge && Array.isArray(node.knowledge.wikiEntries)
    ? node.knowledge.wikiEntries
    : [];
  for (const we of wikiEntries) {
    const key = wikiPathToIndexKey(we && we.path);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    const vec = lookup.get(key);
    if (vec) vectors.push(vec);
  }

  // Path 2 (U-NN-PREDICTOR-EMBED-WIRE-BRIDGE-EXPAND, 2026-05-24): basename
  // resolver. Pre-2026-05-24 the bridge only joined nodes whose graph entry
  // carried explicit wiki paths; ghost.unwired.<X>Engine nodes have no
  // wikiEntries (they're "ghost" — undocumented), so the join sparsity
  // killed NN tier-5 (embedding hit=22/6000). When opts.basenameIndex is
  // provided, the resolver matches `node.label` (or the last segment of
  // node.id) to a wiki page by lowercased basename — the same identity the
  // engine wiki pages already encode. Strictly additive: a hit here only
  // matters when Path 1 produced nothing.
  if (vectors.length === 0 && opts.basenameIndex instanceof Map) {
    const candidates = candidateBasenames(node);
    for (const bn of candidates) {
      const fullPath = opts.basenameIndex.get(bn);
      if (!fullPath) continue;
      const key = wikiPathToIndexKey(fullPath);
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);
      const vec = lookup.get(key);
      if (vec) {
        vectors.push(vec);
        break; // one match per node — sufficient for tier-5 voting signal
      }
    }
  }

  if (vectors.length === 0) return null;
  const agg = aggregateEmbeddings(vectors);
  if (!agg) return null;
  return {
    n: node.id,
    q: quantizeInt8(agg.vector),
    hits: agg.hits,
    dim: agg.dim,
  };
}

/**
 * Derive candidate wiki-page basenames from a node's identity. Ordered
 * highest→lowest fidelity — the resolver tries them in this order and
 * stops at the first hit:
 *
 *   1. node.label lowercased (e.g. "AbstractionHierarchyEngine" → "abstractionhierarchyengine")
 *   2. Last segment of node.id lowercased (e.g. "ghost.unwired.AbstractionHierarchyEngine"
 *      → "abstractionhierarchyengine")
 *   3. Same as (1) and (2) with the "engine" suffix dropped — for wiki pages
 *      filed without the suffix.
 *
 * Returns an ordered array of unique candidates (no duplicates, lowercase).
 */
export function candidateBasenames(node) {
  if (!node) return [];
  const seen = new Set();
  const out = [];
  const push = (s) => {
    if (typeof s !== "string") return;
    const k = s.toLowerCase().trim();
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(k);
  };
  if (typeof node.label === "string") {
    push(node.label);
    push(node.label.replace(/Engine$/i, ""));
  }
  if (typeof node.id === "string") {
    const last = node.id.includes(".") ? node.id.slice(node.id.lastIndexOf(".") + 1) : node.id;
    push(last);
    push(last.replace(/Engine$/i, ""));
  }
  return out;
}

/**
 * Scan the wiki engines tree once + return a Map<basename, full-path>. A
 * graph node whose label/id collapses to one of these basenames can be
 * joined to the wiki via the lowercased basename. Cached by callers — the
 * scan touches ~3000 files on every wiki bucket so a per-build rescan is
 * fine but a per-node rescan is not.
 *
 * Returns Map<string, string> — never throws on individual file errors;
 * unreadable / non-md / hidden files are silently skipped (R12: errors are
 * surfaced via the empty map, not the throw path — the bridge's existing
 * fail-soft semantics depend on this).
 *
 * @param {string} engineWikiRoot — absolute path to `knowledge/wiki/architecture/engines/`
 * @param {{readdirSyncImpl?: Function}} [opts] — DI seam for hermetic tests
 * @returns {Map<string, string>} basename → full wiki path (POSIX-separated)
 */
export function buildEngineWikiBasenameIndex(engineWikiRoot, opts = {}) {
  const out = new Map();
  if (typeof engineWikiRoot !== "string" || engineWikiRoot.length === 0) return out;
  const readdir = typeof opts.readdirSyncImpl === "function"
    ? opts.readdirSyncImpl
    : (p) => fs.readdirSync(p, { withFileTypes: true });

  const walk = (dir, depth = 0) => {
    if (depth > 4) return; // bounded — wiki engines tree is shallow
    let entries;
    try { entries = readdir(dir); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory && e.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!e.name.toLowerCase().endsWith(".md")) continue;
      if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
      const basename = e.name.slice(0, -3).toLowerCase();
      // First write wins — keeps the bridge stable across re-scans even when
      // duplicate basenames exist under different buckets.
      if (!out.has(basename)) {
        out.set(basename, full.replace(/\\/g, "/"));
      }
    }
  };
  walk(engineWikiRoot, 0);
  return out;
}

/* ------------------------------------------------------------------ *
 * Imperative shell — fail-soft, fail-loud on actual errors (R12).
 * ------------------------------------------------------------------ */

const SCHEMA_VERSION = 1;

/**
 * The one-shot end-to-end builder. Reads the system-graph + tribal-embed-index
 * once, walks every node, writes one JSONL file. Atomic write via tmp+rename.
 *
 * Options (all paths absolute):
 *   graphPath  — system-graph.json (513MB OK; we only enumerate nodes)
 *   indexPath  — tribal-embed-index.json
 *   outPath    — node-embeddings JSONL destination
 *   readFileImpl, writeFileImpl, renameImpl — DI hooks for tests
 *
 * Returns (never throws — operational errors land in `errors:[]`):
 *   {
 *     ok: boolean,
 *     written: 0|1,             // 1 = JSONL written, 0 = aborted
 *     outPath: string,
 *     nodeCount: N,             // total nodes in graph
 *     matched: N,               // nodes with ≥1 hit (rows emitted)
 *     unmatched: N,             // nodes with 0 hits OR 0 wikiEntries
 *     dim: K|null,              // embedding dim of emitted rows
 *     indexSkipped: N,          // bad entries skipped from the index
 *     errors: string[],
 *     schemaVersion: 1,
 *   }
 */
export function buildEmbeddingSource(opts) {
  const result = {
    ok: false,
    written: 0,
    outPath: opts && opts.outPath ? opts.outPath : null,
    nodeCount: 0,
    matched: 0,
    unmatched: 0,
    dim: null,
    indexSkipped: 0,
    errors: [],
    schemaVersion: SCHEMA_VERSION,
  };
  if (!opts || !opts.graphPath || !opts.indexPath || !opts.outPath) {
    result.errors.push("buildEmbeddingSource: graphPath, indexPath, outPath required");
    return result;
  }
  const readFile = opts.readFileImpl || ((p) => fs.readFileSync(p, "utf8"));
  const writeFile = opts.writeFileImpl || ((p, s) => fs.writeFileSync(p, s));
  const renameFile = opts.renameImpl || ((a, b) => fs.renameSync(a, b));

  // U-NN-PREDICTOR-EMBED-WIRE follow-up (2026-05-24, slot papa): the live
  // system-viz graph crossed V8's ~512MB max-string-length so readFileImpl()
  // + the downstream JSON.parse both throw ERR_STRING_TOO_LONG on real-world
  // hosts. Read via the streaming JSON reader for any graph >256MB; preserve
  // the legacy text path for small graphs + the test seam (opts.readFileImpl).
  let graph, index, indexText;
  let usedStreaming = false;
  if (!opts.readFileImpl) {
    try {
      const st = fs.statSync(opts.graphPath);
      if (st && Number.isFinite(st.size) && st.size > 256 * 1024 * 1024) {
        graph = readGraphStreaming(opts.graphPath);
        usedStreaming = true;
      }
    } catch (e) {
      // statSync failure is non-fatal — fall through to the legacy text path.
    }
  }

  if (!usedStreaming) {
    let graphText;
    try { graphText = readFile(opts.graphPath); }
    catch (e) {
      // ERR_STRING_TOO_LONG: try streaming as a last-ditch even when the seam
      // is user-injected (the seam returns text — if text-mode literally cannot
      // fit, the streaming reader is the only path).
      if (e && e.code === "ERR_STRING_TOO_LONG") {
        try {
          graph = readGraphStreaming(opts.graphPath);
          usedStreaming = true;
        } catch (sErr) {
          result.errors.push("graph read failed (streaming fallback): " + sErr.message);
          return result;
        }
      } else {
        result.errors.push("graph read failed: " + e.message);
        return result;
      }
    }
    if (!usedStreaming) {
      try { graph = JSON.parse(graphText); }
      catch (e) { result.errors.push("graph parse failed: " + e.message); return result; }
    }
  }

  // Shard-aware, cap-safe index load (manifest-first). The tribal index sharded
  // 2026-06-08 (V8 512MiB cap) and the monolith indexPath is now an absent/stale
  // orphan -- a plain readFile here ENOENTs (or ERR_STRING_TOO_LONGs) so the GNN
  // embedding source came up EMPTY, stalling the closed-loop ref-pool growth this
  // bridge exists to feed (the embeddingHitCount=0 class). loadTribalIndex reads
  // the canonical shards (or the monolith when no manifest exists). The injected
  // test seam (opts.readFileImpl) keeps the legacy text+parse path so hermetic
  // fixtures are unaffected. Same shard-migration fix as wiki-tribal-cross-ref-audit.
  if (!opts.readFileImpl) {
    try { index = loadTribalIndex(opts.indexPath); }
    catch (e) { result.errors.push("index read failed: " + e.message); return result; }
  } else {
    try { indexText = readFile(opts.indexPath); }
    catch (e) { result.errors.push("index read failed: " + e.message); return result; }
    try { index = JSON.parse(indexText); }
    catch (e) { result.errors.push("index parse failed: " + e.message); return result; }
  }

  if (!Array.isArray(index && index.entries)) {
    result.errors.push("index.entries[] missing or not an array");
    return result;
  }
  let lookup;
  try {
    const built = buildIndexLookup(index.entries);
    lookup = built.lookup;
    result.dim = built.dim;
    result.indexSkipped = built.skipped;
  } catch (e) {
    result.errors.push("buildIndexLookup failed: " + e.message);
    return result;
  }

  const nodes = Array.isArray(graph && graph.nodes) ? graph.nodes : [];
  result.nodeCount = nodes.length;

  // U-NN-PREDICTOR-EMBED-WIRE-BRIDGE-EXPAND (2026-05-24, slot papa): scan the
  // wiki engines tree ONCE so the per-node basename resolver runs O(1) per
  // node. Caller can override (e.g. tests inject a hermetic index) via
  // opts.basenameIndex; absent that, we derive the default path from the
  // bridge's PRISM root. When the engine wiki root doesn't exist (clean repo /
  // bare CI), the index is empty + the bridge silently falls back to Path 1
  // only — preserving the pre-2026-05-24 invariant for setups without wiki.
  let basenameIndex = opts.basenameIndex;
  if (!(basenameIndex instanceof Map)) {
    const wikiRoot = typeof opts.engineWikiRoot === "string" && opts.engineWikiRoot.length > 0
      ? opts.engineWikiRoot
      : path.join(PRISM_ROOT, "knowledge", "wiki", "architecture", "engines");
    try {
      basenameIndex = buildEngineWikiBasenameIndex(wikiRoot);
    } catch (e) {
      // R12 fail-soft: surface the issue in errors[] without aborting. The
      // bridge still runs Path 1 — just won't recover ghost.unwired.* nodes.
      result.errors.push(`basename-index build failed (Path 2 disabled): ${e.message}`);
      basenameIndex = new Map();
    }
  }
  result.basenameIndexSize = basenameIndex.size;

  const rows = [];
  let basenameMatched = 0;
  for (const node of nodes) {
    let row;
    try {
      row = nodeToEmbeddingRow(node, lookup, { basenameIndex });
    } catch (e) {
      // a single node failing must NOT abort the whole build — count as
      // unmatched + record once per error class
      result.errors.push(`node ${node && node.id} failed: ${e.message}`);
      row = null;
    }
    if (row) {
      rows.push(row);
      result.matched++;
      if (result.dim == null) result.dim = row.dim;
      // Path-2 attribution: a node WITHOUT wikiEntries that still produced a
      // row got it via the basename fallback. Surface so the lifecycle ledger
      // can quantify the bridge expansion's contribution.
      const hadWiki = node.knowledge && Array.isArray(node.knowledge.wikiEntries) && node.knowledge.wikiEntries.length > 0;
      if (!hadWiki) basenameMatched++;
    } else {
      result.unmatched++;
    }
  }
  result.basenameMatched = basenameMatched;

  // Emit JSONL: META line then one row per matched node.
  const model = (index && index.model) || "nomic-embed-text:latest";
  const lines = [];
  lines.push(JSON.stringify({
    __meta: true,
    model,
    dim: result.dim,
    count: rows.length,
    generatedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    source: "graph-node-bridge",
  }));
  for (const r of rows) {
    lines.push(JSON.stringify({ n: r.n, q: r.q }));
  }
  const body = lines.join("\n") + "\n";

  const tmp = opts.outPath + ".tmp." + process.pid;
  try { writeFile(tmp, body); }
  catch (e) { result.errors.push("write tmp failed: " + e.message); return result; }
  try { renameFile(tmp, opts.outPath); }
  catch (e) {
    result.errors.push("rename failed: " + e.message);
    try { fs.unlinkSync(tmp); } catch {}
    return result;
  }
  result.written = 1;
  result.ok = result.errors.length === 0;
  return result;
}

/* ------------------------------------------------------------------ *
 * CLI shim — only fires when invoked directly (not on import for tests).
 * ------------------------------------------------------------------ */

export function parseArgs(argv) {
  const opts = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--graph") opts.graphPath = path.resolve(argv[++i]);
    else if (a === "--index") opts.indexPath = path.resolve(argv[++i]);
    else if (a === "--out") opts.outPath = path.resolve(argv[++i]);
    else if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
  }
  return opts;
}

const HELP = `graph-node-embedding-bridge.mjs — build the GNN node-embedding source.

Usage:
  node scripts/lib/graph-node-embedding-bridge.mjs \\
    --graph state/shared/system-viz/system-graph.json \\
    --index state/shared/tribal-embed-index.json \\
    --out   state/shared/nn-graph/node-embeddings-768d.jsonl

Flags: --json (emit summary as JSON) · --help.`;

if (import.meta.url.startsWith("file:") && process.argv[1]
    && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.graphPath || !opts.indexPath || !opts.outPath) {
    console.log(HELP);
    process.exit(opts.help ? 0 : 1);
  }
  const r = buildEmbeddingSource(opts);
  if (opts.json) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(
      `node-embedding bridge: matched=${r.matched}/${r.nodeCount} ` +
      `(unmatched=${r.unmatched}) dim=${r.dim} indexSkipped=${r.indexSkipped} ` +
      `ok=${r.ok}` + (r.errors.length ? ` errors=${r.errors.length}` : ""),
    );
    if (r.errors.length) {
      for (const e of r.errors.slice(0, 5)) console.log("  ! " + e);
      if (r.errors.length > 5) console.log("  ... " + (r.errors.length - 5) + " more");
    }
  }
  process.exit(r.ok ? 0 : 2);
}
