#!/usr/bin/env node
// local-vector-store.mjs
// ----------------------------------------------------------------------------
// GRAPH-UTILIZATION rec #1 / U-LOCAL-VECTOR-LEG-WIRE (2026-06-12, slot:alpha):
// the memory-SAFE cached reader that makes the `localvector` leg of
// scripts/lib/hybrid-retrieval.mjs LIVE. It loads the on-disk nomic-768d int8
// vectors (knowledge/wiki/architecture/_embeddings.jsonl, 54,489 vectors) ONCE
// into a flat Int8Array(count*dim) and exposes a cosine-search closure that the
// hybridSearch caller injects as `opts.localVectorSearch`. That leg is
// independent of Qdrant, so hybrid_search keeps returning ranked dense hits when
// Qdrant/Docker is down -- killing the single-point-of-failure.
//
// MEMORY CONTRACT (the whole reason this lib exists). The 54,489x768 vectors are
// ~41.8 MB as a single contiguous Int8Array. The naive load -- one boxed JS
// number[] per vector -- is ~54,489 arrays x 768 boxed doubles ~= multiple GB
// retained, which OOMs (the trap the build spec calls out). So we:
//   1. STREAM the 139 MB jsonl in byte-accurate chunks (never JSON.parse the
//      whole file, never hold a 139 MB string),
//   2. pack each row's int8 directly into the flat Int8Array (one alloc),
//   3. precompute each row's int8 L2 norm once (cosine is scale-invariant -- the
//      per-vector `s` scale cancels -- so we cosine the float query against the
//      RAW int8 row and divide by the precomputed int8 norm; same identity as
//      memory-index-search-lib.mjs::cosineSimInt8 / denseRankAll).
// The store is cached module-level keyed on {path, mtimeMs, size}; a changed
// file re-loads. Every failure path (missing/empty/corrupt file, malformed line,
// dim drift) DEGRADES to an empty result -- never throws -- so a missing store
// means "this leg contributes nothing", not "the query crashes".
//
// The pure cosine reference engine `defaultLocalVectorSearch` lives in
// hybrid-retrieval.mjs (import-free by design, takes a records ITERABLE). This
// lib's flat-array search MUST produce identical rankings to it -- guarded by a
// cross-check test (scripts/__tests__/local-vector-store.test.mjs).
import { openSync, readSync, closeSync, statSync, existsSync } from "node:fs";

export const DEFAULT_EMBEDDINGS_FILE = "H:/prism/knowledge/wiki/architecture/_embeddings.jsonl";
const DEFAULT_DIM = 768;
const DEFAULT_LIMIT = 20;
const READ_CHUNK_BYTES = 8 * 1024 * 1024;
const NL = 0x0a;
const INITIAL_ROW_CAP = 4096;
// Bounds the line-carry so a malformed file with no 0x0A for many MB degrades to
// null (the lib's "never OOM" promise) instead of growing `carry` unboundedly.
// Far above any real line (corpus max line ~2.7 KB; a 768-d int8 row JSON-encodes
// to a few KB), so a legitimate file never trips it.
const MAX_CARRY_BYTES = 64 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Byte-accurate line streamer. Splits on 0x0A bytes and only decodes COMPLETE
// lines, so a multi-byte UTF-8 codepoint straddling a chunk boundary is never
// torn (a plain `chunk.toString()` carry would corrupt that one record). The
// carry is a Buffer (byte-exact), not a string.
function streamJsonlLines(fd, onLine) {
  const chunk = Buffer.allocUnsafe(READ_CHUNK_BYTES);
  let carry = Buffer.alloc(0);
  let n;
  while ((n = readSync(fd, chunk, 0, READ_CHUNK_BYTES, null)) > 0) {
    const data = carry.length ? Buffer.concat([carry, chunk.subarray(0, n)]) : Buffer.from(chunk.subarray(0, n));
    let start = 0;
    let nl;
    while ((nl = data.indexOf(NL, start)) !== -1) {
      if (nl > start) onLine(data.toString("utf8", start, nl));
      start = nl + 1;
    }
    carry = start < data.length ? data.subarray(start) : Buffer.alloc(0);
    if (carry.length > MAX_CARRY_BYTES) throw new Error("line exceeds " + MAX_CARRY_BYTES + " bytes -- malformed embeddings file");
  }
  if (carry.length) {
    const tail = carry.toString("utf8").trim();
    if (tail) onLine(tail);
  }
}

// ---------------------------------------------------------------------------
// Load + pack the embeddings file into the flat store. Returns:
//   { flat:Int8Array(count*dim), ids:string[], types:string[],
//     norms:Float64Array(count), dim, count, mtimeMs, size }
// or null on any unrecoverable failure (absent/empty/zero-vector file).
// `readerDeps` lets tests inject fs (openImpl/closeImpl/statImpl/existsImpl).
export function loadStoreUncached(file, readerDeps = {}) {
  const openImpl = readerDeps.openImpl ?? openSync;
  const closeImpl = readerDeps.closeImpl ?? closeSync;
  const statImpl = readerDeps.statImpl ?? statSync;
  const existsImpl = readerDeps.existsImpl ?? existsSync;

  if (!file || !existsImpl(file)) return null;
  let st;
  try { st = statImpl(file); } catch { return null; }
  if (!st || !(st.size > 0)) return null;

  let fd;
  try { fd = openImpl(file, "r"); } catch { return null; }

  let dim = 0;
  let cap = 0;       // capacity in ROWS
  let flat = null;   // Int8Array(cap*dim)
  let ids = null;    // string[cap] (filled to m)
  let types = null;
  let norms = null;  // Float64Array(cap)
  let m = 0;         // rows actually written

  const ensureAllocated = (d, hint) => {
    dim = d;
    cap = hint > 0 ? hint : INITIAL_ROW_CAP;
    flat = new Int8Array(cap * dim);
    ids = new Array(cap);
    types = new Array(cap);
    norms = new Float64Array(cap);
  };
  const grow = () => {
    const ncap = cap * 2;
    const nflat = new Int8Array(ncap * dim); nflat.set(flat);
    const nnorms = new Float64Array(ncap); nnorms.set(norms);
    ids.length = ncap; types.length = ncap;
    flat = nflat; norms = nnorms; cap = ncap;
  };

  const onLine = (line) => {
    let rec;
    try { rec = JSON.parse(line); } catch { return; } // malformed line -> skip
    if (!rec || typeof rec !== "object") return;
    if (rec.__meta) {
      // header: {__meta:true, model, dim, count}. Pre-size from it when present.
      if (!flat) {
        const d = Number.isFinite(rec.dim) && rec.dim > 0 ? rec.dim : DEFAULT_DIM;
        const hint = Number.isFinite(rec.count) && rec.count > 0 ? rec.count : 0;
        ensureAllocated(d, hint);
      }
      return;
    }
    const q = rec.q;
    if (!Array.isArray(q) || q.length === 0) return;
    if (!flat) ensureAllocated(q.length, 0); // no __meta header -> infer dim from first row
    if (q.length !== dim) return;            // dim drift -> skip the row
    const id = typeof rec.n === "string" && rec.n.length > 0 ? rec.n : null;
    if (id === null) return;
    if (m >= cap) grow();
    const off = m * dim;
    let sumSq = 0;
    for (let i = 0; i < dim; i++) {
      // Store FIRST, then read the post-ToInt8 byte back for the norm, so the
      // precomputed norm ALWAYS matches the bytes the scan actually dots -- even
      // if a future producer ever emits an out-of-range value (Int8Array wraps
      // it). The live corpus is already in [-127,127], so this is identity today;
      // it just keeps cosine self-consistent under producer drift.
      flat[off + i] = q[i];
      const sv = flat[off + i];
      sumSq += sv * sv;
    }
    ids[m] = id;
    types[m] = typeof rec.t === "string" ? rec.t : "";
    norms[m] = Math.sqrt(sumSq);
    m++;
  };

  try {
    streamJsonlLines(fd, onLine);
  } catch {
    try { closeImpl(fd); } catch { /* fd already gone */ }
    return null;
  }
  try { closeImpl(fd); } catch { /* best effort */ }

  if (!flat || m === 0) return null;
  // Trim to exactly m rows so the search never scans uninitialised tail slots.
  return {
    flat: m * dim === flat.length ? flat : flat.subarray(0, m * dim),
    ids: ids.length === m ? ids : ids.slice(0, m),
    types: types.length === m ? types : types.slice(0, m),
    norms: norms.length === m ? norms : norms.subarray(0, m),
    dim,
    count: m,
    mtimeMs: st.mtimeMs,
    size: st.size,
  };
}

// ---------------------------------------------------------------------------
// Module-level cache keyed on file identity. One process loads the 42 MB store
// once; every hybrid query reuses it. A changed file (mtime or size) invalidates.
const _cache = new Map(); // file -> { mtimeMs, size, store }

export function loadLocalVectorStore(file = DEFAULT_EMBEDDINGS_FILE, readerDeps = {}) {
  const statImpl = readerDeps.statImpl ?? statSync;
  const existsImpl = readerDeps.existsImpl ?? existsSync;
  if (!file || !existsImpl(file)) { _cache.delete(file); return null; }
  let st;
  try { st = statImpl(file); } catch { return null; }
  const hit = _cache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.store;
  const store = loadStoreUncached(file, readerDeps);
  if (store) _cache.set(file, { mtimeMs: store.mtimeMs, size: store.size, store });
  else _cache.delete(file);
  return store;
}

export function clearLocalVectorStoreCache() { _cache.clear(); }

// ---------------------------------------------------------------------------
// Bounded top-K cosine over the flat store. queryVec is the float[768] nomic
// query embedding. cosine(query, int8row) = dot / (|query| * int8norm) -- the
// per-vector dequant scale cancels, so we never touch `s`. Returns the same hit
// shape defaultQdrantSearch / defaultLocalVectorSearch emit:
//   [{ id, score, payload:{ type } }]  (sorted desc, length <= limit)
export function localVectorSearchOverStore(store, queryVec, limit = DEFAULT_LIMIT) {
  if (!store || !store.flat || !(store.count > 0)) return [];
  if (!Array.isArray(queryVec) || queryVec.length !== store.dim) return [];
  const k = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  let qNorm = 0;
  for (let i = 0; i < queryVec.length; i++) qNorm += queryVec[i] * queryVec[i];
  qNorm = Math.sqrt(qNorm);
  if (qNorm === 0) return [];

  const { flat, ids, types, norms, dim, count } = store;
  const top = []; // kept sorted desc, capped at k (k is small)
  for (let r = 0; r < count; r++) {
    const dNorm = norms[r];
    if (!(dNorm > 0)) continue;
    const off = r * dim;
    let dot = 0;
    for (let i = 0; i < dim; i++) dot += queryVec[i] * flat[off + i];
    const score = dot / (qNorm * dNorm);
    if (top.length < k) {
      top.push({ id: ids[r], score, payload: { type: types[r] } });
      if (top.length === k) top.sort((a, b) => b.score - a.score);
    } else if (score > top[k - 1].score) {
      top[k - 1] = { id: ids[r], score, payload: { type: types[r] } };
      top.sort((a, b) => b.score - a.score);
    }
  }
  if (top.length < k) top.sort((a, b) => b.score - a.score);
  return top;
}

// ---------------------------------------------------------------------------
// The closure hybridSearch injects as opts.localVectorSearch. It loads+caches
// the store on first call and runs bounded cosine. NEVER throws -- a load/scan
// failure returns [] so the leg degrades to "no contribution", not a crash.
export function makeLocalVectorSearch(file = DEFAULT_EMBEDDINGS_FILE, readerDeps = {}) {
  return function localVectorSearch({ vector, limit } = {}) {
    try {
      const store = loadLocalVectorStore(file, readerDeps);
      if (!store) return [];
      return localVectorSearchOverStore(store, vector, limit);
    } catch {
      return [];
    }
  };
}

// CLI smoke: `node scripts/lib/local-vector-store.mjs [file]` prints store stats.
const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();
if (invokedDirect) {
  const file = process.argv[2] || DEFAULT_EMBEDDINGS_FILE;
  const t0 = Date.now();
  const store = loadLocalVectorStore(file);
  if (!store) { process.stderr.write(`local-vector-store: no store at ${file}\n`); process.exit(1); }
  process.stdout.write(JSON.stringify({
    file, dim: store.dim, count: store.count,
    flatBytes: store.flat.length, loadMs: Date.now() - t0,
    sample: store.ids.slice(0, 3),
  }, null, 2) + "\n");
}
