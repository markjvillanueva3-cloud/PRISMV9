#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-HYBRID-RETRIEVAL-WIRE — compose all 4 retrieval
// substrates (memory-index BM25 + master-index graph BM25 + episode-store
// predicate + Qdrant dense vector) into ONE query API. Fan out the same
// query string to every substrate the caller injects; merge ranked hit
// lists by Reciprocal Rank Fusion (Cormack et al. 2009, k=60) — robust to
// the score-scale drift across BM25 (raw tf-idf-ish weights) vs cosine
// (0..1) vs predicate-match (token-overlap count).
//
// Iter 17 closed `U-PSN-QDRANT-POPULATE` (1669 vectors live, 3866 total
// in `prism_engines`). This iter (18) makes that vector substrate +
// the 3 already-online substrates operator-facing as one query — the
// actual operator win the iter-13 Brij synergy mapping named.
//
// Pure-core via dependency injection so:
//   1. tests pass deterministic fixtures (no Qdrant/Ollama required)
//   2. callers can disable any leg (e.g. air-gapped → drop vector)
//   3. the same code path serves CLI + MCP dispatcher (future) + agent.
//
// Every leg is failure-tolerant: a throwing or missing retriever is
// recorded in `trace.skipped[]` and the remaining substrates still fuse.

const DEFAULT_RRF_K = 60;
const DEFAULT_TOP_K = 10;
const DEFAULT_PER_SOURCE_LIMIT = 20;
const DEFAULT_QDRANT_URL = "http://localhost:6333";
const DEFAULT_QDRANT_COLLECTION = "prism_engines";
// 127.0.0.1 NOT localhost (Windows IPv6 ::1 unreachable for node http; reference_ollama_localhost_systemic_2026_06_09). Env-overridable via OLLAMA_URL.
const DEFAULT_OLLAMA_URL = (process.env.OLLAMA_URL ? process.env.OLLAMA_URL.replace(/\/$/, "") + "/api/embeddings" : "http://127.0.0.1:11434/api/embeddings");
const DEFAULT_EMBED_MODEL = "nomic-embed-text";

// Equal weights across substrates by default; callers tune for their
// domain (e.g. vector-heavy for semantic queries, BM25-heavy for symbol
// lookups). All four legs always emit a list — RRF handles missing ones
// implicitly because they just contribute zero.
const DEFAULT_WEIGHTS = Object.freeze({
  memory: 1.0,
  master: 1.0,
  episode: 1.0,
  vector: 1.0,
  localvector: 1.0,
  qdrantdense: 1.0,
});

// Extract a stable doc id from heterogeneous hit shapes. Each retriever
// returns its own shape; we coalesce on the first plausible identifier
// so the same doc surfaced by multiple substrates fuses correctly.
//   memory-index: { name, file, score, ... }
//   master-index: { id, label, score, ... }
//   episode:      { id, episode: {id, source_id, ...}, score }
//   vector:       { id, payload: { node_id }, score }
export function hitDocId(hit) {
  if (!hit || typeof hit !== "object") return null;
  if (typeof hit.id === "string" && hit.id.length > 0) return hit.id;
  if (typeof hit.name === "string" && hit.name.length > 0) return hit.name;
  if (hit.payload && typeof hit.payload.node_id === "string") return hit.payload.node_id;
  if (hit.episode && typeof hit.episode.id === "string") return hit.episode.id;
  if (typeof hit.file === "string" && hit.file.length > 0) return hit.file;
  if (typeof hit.key === "string" && hit.key.length > 0) return hit.key;
  return null;
}

// Reciprocal Rank Fusion. For each ranked list, each doc at rank r
// contributes weight * 1/(k + r) to the fused score. k=60 is the
// canonical default from the original paper — empirically dampens the
// top-of-list dominance without throwing away the rank signal.
//
// lists: [{ source: string, hits: array }]
// returns: array sorted by fused score desc, each entry carries
//   { id, score, surfaces:{src:rank}, hits:{src:rawHit} } so the caller
//   can render provenance ("found in memory + vector").
export function rrfMerge(lists, opts = {}) {
  const k = opts.k ?? DEFAULT_RRF_K;
  const weights = opts.weights || DEFAULT_WEIGHTS;
  const fused = new Map();
  if (!Array.isArray(lists)) return [];
  for (const list of lists) {
    if (!list || typeof list !== "object") continue;
    const source = typeof list.source === "string" ? list.source : "unknown";
    const hits = Array.isArray(list.hits) ? list.hits : [];
    const w = typeof weights[source] === "number" ? weights[source] : 1.0;
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const docId = hitDocId(hit);
      if (docId === null) continue;
      const rank = i + 1;
      const contribution = w / (k + rank);
      let entry = fused.get(docId);
      if (!entry) {
        entry = { id: docId, score: 0, surfaces: {}, hits: {} };
        fused.set(docId, entry);
      }
      entry.score += contribution;
      entry.surfaces[source] = rank;
      entry.hits[source] = hit;
    }
  }
  return Array.from(fused.values()).sort((a, b) => b.score - a.score);
}

// Episode-store keyword search — token-overlap count over body + source
// fields + entity names. Skips superseded episodes (those with
// valid_until set). Stable ordering: score desc, then id asc as
// tiebreak so tests are deterministic.
export function episodeKeywordSearch(store, tokens, opts = {}) {
  const limit = Number.isFinite(opts.limit) ? opts.limit : DEFAULT_PER_SOURCE_LIMIT;
  if (!store || !Array.isArray(store.episodes)) return [];
  if (!Array.isArray(tokens) || tokens.length === 0) return [];
  const scored = [];
  for (const ep of store.episodes) {
    if (!ep || typeof ep !== "object") continue;
    if (ep.valid_until) continue;
    const entityNames = Array.isArray(ep.entities)
      ? ep.entities.map((e) => (e && typeof e.name === "string" ? e.name : "")).join(" ")
      : "";
    const haystack = [
      typeof ep.body === "string" ? ep.body : "",
      typeof ep.source === "string" ? ep.source : "",
      typeof ep.source_id === "string" ? ep.source_id : "",
      entityNames,
    ].join(" ").toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (typeof t !== "string" || t.length === 0) continue;
      if (haystack.includes(t)) score++;
    }
    if (score > 0) scored.push({ id: ep.id, score, episode: ep });
  }
  scored.sort((a, b) => (b.score - a.score) || ((a.id || "") < (b.id || "") ? -1 : 1));
  return scored.slice(0, limit);
}

// Embed query text via Ollama (default model: nomic-embed-text 768d, the
// same model the populated Qdrant prism_engines collection was built
// against, so cosine distances are meaningful). Returns null on any
// failure — caller decides whether to proceed without the vector leg.
//
// sendImpl is the curl subprocess wrapper from populate-qdrant.mjs
// signature: (method, url, body) -> { status, stdout, stderr }
export function defaultEmbed(query, opts = {}) {
  if (typeof query !== "string" || query.length === 0) return null;
  const sendImpl = opts.sendImpl;
  if (typeof sendImpl !== "function") return null;
  const url = opts.ollamaUrl || DEFAULT_OLLAMA_URL;
  const model = opts.model || DEFAULT_EMBED_MODEL;
  const body = JSON.stringify({ model, prompt: query });
  const r = sendImpl("POST", url, body);
  if (!r || r.status !== 0) return null;
  try {
    const parsed = JSON.parse(r.stdout || "");
    return Array.isArray(parsed.embedding) && parsed.embedding.length > 0
      ? parsed.embedding
      : null;
  } catch {
    return null;
  }
}

// Qdrant dense-vector search via curl. Uses points/search endpoint
// (not /points). Caller passes sendImpl (curlSend pattern). Returns
// normalized hits with stable doc-id at top level so RRF fuses cleanly.
export function defaultQdrantSearch({ vector, collection, url, limit, sendImpl }) {
  if (!Array.isArray(vector) || vector.length === 0) return [];
  if (typeof sendImpl !== "function") return [];
  const target = url || DEFAULT_QDRANT_URL;
  const col = collection || DEFAULT_QDRANT_COLLECTION;
  const k = Number.isFinite(limit) ? limit : DEFAULT_PER_SOURCE_LIMIT;
  const body = JSON.stringify({ vector, limit: k, with_payload: true });
  const r = sendImpl("POST", `${target}/collections/${col}/points/search`, body);
  if (!r || r.status !== 0) return [];
  let parsed;
  try { parsed = JSON.parse(r.stdout || ""); }
  catch { return []; }
  const result = parsed && Array.isArray(parsed.result) ? parsed.result : [];
  return result.map((p) => ({
    // Prefer externalId (canonical ref shape, e.g. "engine:Foo" — used by pre-iter-17
    // ingest of ~2197 engine vectors), then node_id (iter-17 populate-qdrant.mjs shape),
    // then name, then fall back to Qdrant's numeric point id.
    id: pickQdrantPayloadId(p),
    score: typeof p.score === "number" ? p.score : 0,
    payload: p && p.payload ? p.payload : null,
  }));
}

// Stable id-extraction for Qdrant search hits. Order matters: prefer the
// most-specific canonical ref the payload offers so the same engine
// surfaces under the same id no matter which populate pass wrote it.
export function pickQdrantPayloadId(point) {
  if (!point || typeof point !== "object") return "unknown";
  const pl = point.payload;
  if (pl && typeof pl === "object") {
    if (typeof pl.externalId === "string" && pl.externalId.length > 0) return pl.externalId;
    if (typeof pl.node_id === "string" && pl.node_id.length > 0) return pl.node_id;
    if (typeof pl.name === "string" && pl.name.length > 0) return pl.name;
    if (typeof pl.sourceFile === "string" && pl.sourceFile.length > 0) return pl.sourceFile;
  }
  return String(point.id);
}

// GRAPH-UTILIZATION rec #1 / LOCAL-VECTOR-LEG (2026-06-12, slot:alpha): pure
// offline dense-vector substrate. Cosine of the query embedding against the
// on-disk int8 vectors (caller streams+caches them and passes `records`), bounded
// top-K -- no fs/network here (the lib is import-free by design). Returns the same
// hit shape defaultQdrantSearch emits ({id, score, payload}) so rrfMerge fuses it.
// Kills the Qdrant SPOF: this leg works with Qdrant/Docker down.
const LOCAL_VECTOR_DEQUANT_SCALE = 127;
export function defaultLocalVectorSearch({ vector, records, limit } = {}) {
  if (!Array.isArray(vector) || vector.length === 0) return [];
  if (!records || typeof records[Symbol.iterator] !== "function") return [];
  const k = Number.isFinite(limit) ? limit : DEFAULT_PER_SOURCE_LIMIT;
  let qNorm = 0;
  for (let i = 0; i < vector.length; i++) qNorm += vector[i] * vector[i];
  qNorm = Math.sqrt(qNorm);
  if (qNorm === 0) return [];
  const top = []; // kept sorted desc, capped at k (k is small -> simpler than a heap)
  for (const rec of records) {
    if (!rec || typeof rec !== "object" || rec.__meta) continue;
    const q = rec.q;
    if (!Array.isArray(q) || q.length !== vector.length) continue;
    const id = typeof rec.n === "string" && rec.n.length > 0 ? rec.n : null;
    if (id === null) continue;
    // True dequant is q*s (per-vector float scale); fall back to 1/127 if s absent.
    // Cosine normalizes it out either way, so ranking is correct; using rec.s is correct-by-design.
    const scale = Number.isFinite(rec.s) && rec.s > 0 ? rec.s : (1 / LOCAL_VECTOR_DEQUANT_SCALE);
    let dot = 0, dNorm = 0;
    for (let i = 0; i < q.length; i++) {
      const dv = q[i] * scale;
      dot += vector[i] * dv;
      dNorm += dv * dv;
    }
    dNorm = Math.sqrt(dNorm);
    if (dNorm === 0) continue;
    const score = dot / (qNorm * dNorm);
    if (top.length < k) {
      top.push({ id, score, payload: { type: rec.t } });
      top.sort((a, b) => b.score - a.score);
    } else if (score > top[top.length - 1].score) {
      top[top.length - 1] = { id, score, payload: { type: rec.t } };
      top.sort((a, b) => b.score - a.score);
    }
  }
  return top;
}

// Naive tokenizer — caller can inject a stronger one (e.g. the shared
// tokenize() from master-index-search-lib for stopword + length filter
// parity). Kept here so the lib is import-free at runtime.
function fallbackTokenize(query) {
  if (typeof query !== "string") return [];
  return Array.from(new Set((query.toLowerCase().match(/[a-z0-9_-]+/g) || [])
    .filter((t) => t.length >= 3)));
}

// Main fan-out + fusion entry. Every retriever is optional + injected;
// missing or throwing legs land in trace.skipped[] without aborting the
// query. Returns top-K fused results plus the per-source trace for
// observability + debugging.
export function hybridSearch(query, opts = {}) {
  const topK = Number.isFinite(opts.topK) ? opts.topK : DEFAULT_TOP_K;
  const perSourceLimit = Number.isFinite(opts.perSourceLimit)
    ? opts.perSourceLimit
    : Math.max(DEFAULT_PER_SOURCE_LIMIT, topK * 2);
  const includeMemory = opts.includeMemory !== false;
  const includeMaster = opts.includeMaster !== false;
  const includeEpisode = opts.includeEpisode !== false;
  const includeVector = opts.includeVector !== false;
  const includeLocalVector = opts.includeLocalVector !== false; // LOCAL-VECTOR-LEG
  // QDRANT-DENSE-ARM (U-INDIA-HYBRID-QDRANT-ARM): async fetch-based Qdrant dense arm.
  // Default OFF until the prism_engines corpus is indexed. Gate: PRISM_RAG_DENSE_QDRANT=1
  // OR opts.includeQdrantDense=true (test/caller override). No skip is recorded when the
  // gate is off -- the arm is simply absent from this query, same as unset includeVector.
  const qdrantDenseEnvOn = (process.env.PRISM_RAG_DENSE_QDRANT || "").trim() === "1";
  const includeQdrantDense = opts.includeQdrantDense === true || qdrantDenseEnvOn;
  const tokenizeImpl = typeof opts.tokenize === "function" ? opts.tokenize : fallbackTokenize;
  const lists = [];
  const trace = { sources: [], skipped: [] };

  if (typeof query !== "string" || query.length === 0) {
    return { query: query ?? null, results: [], surfacesQueried: 0, trace: { sources: [], skipped: [{ source: "all", reason: "empty-query" }] } };
  }

  if (includeMemory && typeof opts.runMemoryIndexSearch === "function") {
    try {
      const { hits = [], tokens = [] } = opts.runMemoryIndexSearch(query, { topK: perSourceLimit, ...(opts.memoryOpts || {}) }) || {};
      lists.push({ source: "memory", hits });
      trace.sources.push({ source: "memory", count: hits.length, tokens });
    } catch (e) {
      trace.skipped.push({ source: "memory", error: e.message || String(e) });
    }
  } else if (includeMemory) {
    trace.skipped.push({ source: "memory", reason: "no-impl" });
  }

  if (includeMaster && typeof opts.runMasterIndexSearch === "function") {
    try {
      const { hits = [], tokens = [] } = opts.runMasterIndexSearch(query, { topK: perSourceLimit, ...(opts.masterOpts || {}) }) || {};
      lists.push({ source: "master", hits });
      trace.sources.push({ source: "master", count: hits.length, tokens });
    } catch (e) {
      trace.skipped.push({ source: "master", error: e.message || String(e) });
    }
  } else if (includeMaster) {
    trace.skipped.push({ source: "master", reason: "no-impl" });
  }

  if (includeEpisode && typeof opts.loadStore === "function") {
    try {
      const store = opts.loadStore();
      const tokens = tokenizeImpl(query);
      const hits = episodeKeywordSearch(store, tokens, { limit: perSourceLimit });
      lists.push({ source: "episode", hits });
      trace.sources.push({ source: "episode", count: hits.length, tokens });
    } catch (e) {
      trace.skipped.push({ source: "episode", error: e.message || String(e) });
    }
  } else if (includeEpisode) {
    trace.skipped.push({ source: "episode", reason: "no-impl" });
  }

  // EMBED-ONCE (LOCAL-VECTOR-WIRE): the vector(Qdrant) + localvector legs share
  // the SAME nomic query embedding. Memoize it so a both-legs-on query pays a
  // single Ollama round-trip, not two. embedImpl may be absent -> null (the legs'
  // own embed-failed/no-embed-impl branches still fire exactly as before).
  let _denseVec; let _denseEmbedded = false;
  const denseQueryVector = () => {
    if (_denseEmbedded) return _denseVec;
    _denseEmbedded = true;
    _denseVec = typeof opts.embedImpl === "function" ? opts.embedImpl(query) : null;
    return _denseVec;
  };
  if (includeVector && typeof opts.embedImpl === "function") {
    try {
      const vector = denseQueryVector(); // EMBED-ONCE
      if (Array.isArray(vector) && vector.length > 0 && typeof opts.qdrantSearch === "function") {
        const hits = opts.qdrantSearch({
          vector,
          collection: opts.qdrantCollection || DEFAULT_QDRANT_COLLECTION,
          url: opts.qdrantUrl || DEFAULT_QDRANT_URL,
          limit: perSourceLimit,
        });
        lists.push({ source: "vector", hits });
        trace.sources.push({ source: "vector", count: hits.length, vectorDim: vector.length });
      } else if (!Array.isArray(vector) || vector.length === 0) {
        trace.skipped.push({ source: "vector", reason: "embed-failed" });
      } else {
        trace.skipped.push({ source: "vector", reason: "no-qdrant-impl" });
      }
    } catch (e) {
      trace.skipped.push({ source: "vector", error: e.message || String(e) });
    }
  } else if (includeVector) {
    trace.skipped.push({ source: "vector", reason: "no-embed-impl" });
  }

  // LOCAL-VECTOR-LEG: offline dense substrate over on-disk int8 vectors. Reuses
  // the same nomic query embedding; independent of Qdrant (kills the SPOF). The
  // caller injects opts.localVectorSearch closing over the loaded+cached records.
  if (includeLocalVector && typeof opts.localVectorSearch === "function") {
    try {
      const lvVector = denseQueryVector(); // EMBED-ONCE
      if (Array.isArray(lvVector) && lvVector.length > 0) {
        const hits = opts.localVectorSearch({ vector: lvVector, limit: perSourceLimit });
        lists.push({ source: "localvector", hits: Array.isArray(hits) ? hits : [] });
        trace.sources.push({ source: "localvector", count: Array.isArray(hits) ? hits.length : 0, vectorDim: lvVector.length });
      } else {
        trace.skipped.push({ source: "localvector", reason: "embed-failed" });
      }
    } catch (e) {
      trace.skipped.push({ source: "localvector", error: e.message || String(e) });
    }
  } else if (includeLocalVector) {
    trace.skipped.push({ source: "localvector", reason: "no-impl" });
  }

  // QDRANT-DENSE-ARM (U-INDIA-HYBRID-QDRANT-ARM): async fetch-based 5th substrate.
  // Gated by PRISM_RAG_DENSE_QDRANT=1 or opts.includeQdrantDense=true. When the gate
  // is OFF, the arm is simply absent -- no skip entry, preserving backward-compat with
  // callers that never set the flag (the "no impls" test count stays unchanged).
  // When ON and the async qdrantDenseSearch fn is injected, the function returns a
  // Promise<result> (callers that enable this arm must await). The embed-once memoize
  // is shared with the vector + localvector legs so a 3-leg query pays one Ollama call.
  if (includeQdrantDense) {
    if (typeof opts.qdrantDenseSearch === "function") {
      const qdVector = denseQueryVector(); // EMBED-ONCE
      if (Array.isArray(qdVector) && qdVector.length > 0) {
        const resultPromise = opts.qdrantDenseSearch({
          vector: qdVector,
          collection: opts.qdrantCollection || DEFAULT_QDRANT_COLLECTION,
          url: opts.qdrantUrl || DEFAULT_QDRANT_URL,
          limit: perSourceLimit,
          timeoutMs: opts.qdrantDenseTimeoutMs,
        });
        return (async () => {
          let qdResult;
          try { qdResult = await resultPromise; }
          catch (e) { qdResult = { ok: false, hits: [], error: e.message || String(e) }; }
          if (qdResult && qdResult.ok && Array.isArray(qdResult.hits) && qdResult.hits.length > 0) {
            lists.push({ source: "qdrantdense", hits: qdResult.hits });
            trace.sources.push({ source: "qdrantdense", count: qdResult.hits.length, vectorDim: qdVector.length, durationMs: qdResult.durationMs });
          } else {
            const reason = (qdResult && qdResult.error) ? qdResult.error : "empty-result";
            trace.skipped.push({ source: "qdrantdense", reason });
          }
          const merged = rrfMerge(lists, { k: opts.rrfK ?? DEFAULT_RRF_K, weights: opts.weights });
          return { query, results: merged.slice(0, topK), surfacesQueried: lists.length, trace };
        })();
      } else {
        trace.skipped.push({ source: "qdrantdense", reason: "embed-failed" });
      }
    } else {
      trace.skipped.push({ source: "qdrantdense", reason: "no-impl" });
    }
  }

  const merged = rrfMerge(lists, { k: opts.rrfK ?? DEFAULT_RRF_K, weights: opts.weights });

  return {
    query,
    results: merged.slice(0, topK),
    surfacesQueried: lists.length,
    trace,
  };
}

export const __test_constants = {
  DEFAULT_RRF_K,
  DEFAULT_TOP_K,
  DEFAULT_PER_SOURCE_LIMIT,
  DEFAULT_WEIGHTS,
  DEFAULT_QDRANT_COLLECTION,
  DEFAULT_EMBED_MODEL,
  QDRANT_DENSE_ENV_VAR: "PRISM_RAG_DENSE_QDRANT",
};
