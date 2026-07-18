// tribal-graph-embedding.mjs
// Pure-ish Ollama nomic-embed-text 768d embedding helper for the tribal-graph
// system. Lateral wires across the L0-L8 hierarchy are computed by cosine
// similarity over these embeddings. Companion to tribal-graph-clusters.mjs.
//
// Karpathy R12 (fail-loud): every failure mode is surfaced. Partial-batch
// failures return { ok: false, error, partial: [...] } — we do NOT silently
// drop items, and we do NOT throw mid-batch when the next item could still
// succeed.

import { writeFileSync, readFileSync, existsSync, mkdirSync, renameSync, unlinkSync, readdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { resolveEmbedUrl, withLaneOptions } from "./embed-endpoint.mjs";

// ──────────────────────────────────────────────────────────────────────────
// Constants (frozen, named — never inlined)
// ──────────────────────────────────────────────────────────────────────────

export const DEFAULT_MODEL = "nomic-embed-text";
export const EMBEDDING_DIM = 768;
export const DEFAULT_BATCH_SIZE = 32;
// Default = 1 → exact legacy sequential behavior (deterministic call order, all
// pre-existing tests unchanged). Consumers opt into GPU saturation by passing
// concurrency>1 (e.g. from PRISM_EMBED_CONCURRENCY). Empirically on an RTX PRO
// 6000 Blackwell the 137M nomic-embed model is GPU-bound at ~3.3 embeds/s when
// issued one-at-a-time but ~51 embeds/s at concurrency 16 (15.3× — vectors
// byte-identical, min cosine 1.0). Concurrency is the right lever: the backend
// is idle, not saturated. See [[reference_blackwell_embed_concurrency_2026_06_03]].
export const DEFAULT_CONCURRENCY = 1;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_BASE_MS = 500;
export const DEFAULT_RETRY_MAX_MS = 8000;
export const DEFAULT_TIMEOUT_MS = 30000;
export const OLLAMA_URL_DEFAULT = "http://127.0.0.1:11434";
export const CHECKPOINT_SCHEMA_VERSION = "1.0.0";
export const LATERAL_WIRE_THRESHOLD_DEFAULT = 0.75;
export const ERROR_BODY_SLICE_LEN = 200;
export const JITTER_MIN_FRACTION = 0.5;
export const TMP_STALE_AGE_MS = 5 * 60 * 1000;
// Reserved id substrings that would pollute prototype/Map iteration if used
// as object keys. We reject these BEFORE they reach any Map.set / object.
const RESERVED_ID_NAMES = new Set(["__proto__", "constructor", "prototype"]);

// Field-boundary separator for deterministic IDs (matches clusters lib)
const ID_HASH_SEP = "\x1f";
// Human-friendly separator for embedding text (Ollama tokenizers handle this
// cleanly, unlike U+001F which becomes a stray token contaminating cosine).
const TEXT_JOIN_SEP = " | ";

// ──────────────────────────────────────────────────────────────────────────
// Pure math helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Validate a vector — returns the vector unchanged or throws.
 * Used at trust boundaries (after fetch, before checkpoint write).
 */
export function validateVector(vec, expectedDim = EMBEDDING_DIM, label = "vector") {
  if (!Array.isArray(vec) && !(vec instanceof Float32Array) && !(vec instanceof Float64Array)) {
    throw new TypeError(`${label}: must be an array, got ${typeof vec}`);
  }
  if (vec.length !== expectedDim) {
    throw new RangeError(`${label}: expected dim ${expectedDim}, got ${vec.length}`);
  }
  for (let i = 0; i < vec.length; i++) {
    const v = vec[i];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new RangeError(`${label}: index ${i} is ${v} (must be finite number)`);
    }
  }
  return vec;
}

/**
 * Cosine similarity ∈ [-1, 1].
 * Clamps result to handle float imprecision (e.g. 1.0000000002 → 1).
 * Returns 0 for either vector being all-zero (semantically: no signal).
 */
export function cosineSimilarity(a, b) {
  if (!a || !b) throw new TypeError("cosineSimilarity: both vectors required");
  if (a.length !== b.length) {
    throw new RangeError(`cosineSimilarity: length mismatch ${a.length} vs ${b.length}`);
  }
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i], bi = b[i];
    if (!Number.isFinite(ai) || !Number.isFinite(bi)) {
      throw new RangeError(`cosineSimilarity: non-finite at index ${i}`);
    }
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  const cos = dot / (Math.sqrt(na) * Math.sqrt(nb));
  if (cos > 1) return 1;
  if (cos < -1) return -1;
  return cos;
}

/**
 * Top-K most similar items to queryVec.
 * corpus: array of { id, vector } objects.
 * Returns: array of { id, score } sorted DESC by score, length ≤ k.
 * Filters out the query item itself if its id appears in corpus.
 */
export function topKSimilar(queryVec, corpus, k = 5, excludeIds = []) {
  if (!Array.isArray(corpus)) throw new TypeError("topKSimilar: corpus must be array");
  if (!Number.isInteger(k) || k < 1) throw new RangeError("topKSimilar: k must be positive integer");
  // Strict excludeIds shape — `new Set("abc")` would silently iterate a string
  // into {"a","b","c"} and let items leak past the filter. Also materialize
  // into a FRESH Set so a caller can't override `.has` on the Set we use.
  let exclude;
  if (excludeIds instanceof Set) {
    exclude = new Set([...excludeIds]); // defeats overridden .has on input Set
  } else if (Array.isArray(excludeIds)) {
    exclude = new Set(excludeIds);
  } else {
    throw new TypeError(`topKSimilar: excludeIds must be Set or Array, got ${typeof excludeIds}`);
  }
  const scored = [];
  for (const item of corpus) {
    if (!item || typeof item.id !== "string" || !item.vector) continue;
    if (exclude.has(item.id)) continue;
    const score = cosineSimilarity(queryVec, item.vector);
    scored.push({ id: item.id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/**
 * Build lateral wires between cluster nodes by cosine threshold.
 * clusters: array of { id, ... } (output of clusterByJaccard or aggregateLevel)
 * vectors: Map<id, Float64Array> or array of { id, vector }
 * Returns: array of { fromId, toId, weight, type: "semantic-similarity" } sorted by id-pair.
 * Each unordered pair appears once — fromId < toId lexicographically.
 */
export function buildLateralWires(clusters, vectors, threshold = LATERAL_WIRE_THRESHOLD_DEFAULT, opts = {}) {
  const { maxWiresPerNode = 10, type = "semantic-similarity" } = opts;
  if (!Number.isFinite(threshold) || threshold < -1 || threshold > 1) {
    throw new RangeError(`buildLateralWires: threshold must be in [-1,1], got ${threshold}`);
  }
  // Normalize vectors input to Map<id, vector>
  const vecMap = vectors instanceof Map ? vectors : new Map(
    (Array.isArray(vectors) ? vectors : []).map(v => [v.id, v.vector])
  );
  const nodes = clusters.filter(c => c && c.id && vecMap.has(c.id));
  const wires = [];
  // Track per-node wire count to honor maxWiresPerNode
  const perNode = new Map();
  const incr = (id) => perNode.set(id, (perNode.get(id) || 0) + 1);
  // Collect ALL above-threshold pairs first, then sort by score DESC,
  // then assign greedily respecting maxWiresPerNode.
  const candidates = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const score = cosineSimilarity(vecMap.get(a.id), vecMap.get(b.id));
      if (score >= threshold) {
        const [fromId, toId] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
        candidates.push({ fromId, toId, weight: score, type });
      }
    }
  }
  // Tie-break by (fromId, toId) so equal-weight candidates assign in a
  // deterministic order across runs and Node versions (Array.sort stability
  // is guaranteed since ES2019 but tie-break makes the run-to-run output
  // bit-identical regardless of input ordering).
  candidates.sort((x, y) => y.weight - x.weight
    || (x.fromId < y.fromId ? -1 : x.fromId > y.fromId ? 1
        : x.toId < y.toId ? -1 : x.toId > y.toId ? 1 : 0));
  for (const c of candidates) {
    if ((perNode.get(c.fromId) || 0) >= maxWiresPerNode) continue;
    if ((perNode.get(c.toId) || 0) >= maxWiresPerNode) continue;
    wires.push(c);
    incr(c.fromId);
    incr(c.toId);
  }
  // Deterministic output: sort by (fromId, toId) ASC for diff-friendliness
  wires.sort((x, y) => x.fromId < y.fromId ? -1 : x.fromId > y.fromId ? 1 : x.toId < y.toId ? -1 : x.toId > y.toId ? 1 : 0);
  return wires;
}

// ──────────────────────────────────────────────────────────────────────────
// Ollama HTTP transport (impure; injectable for testing)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Low-level call to Ollama embed endpoint for ONE input string.
 * Uses the current `/api/embed` + `input` field by default and falls back to
 * the legacy `/api/embeddings` + `prompt` form on a 404. Caller is responsible
 * for retry/batch. Returns a validated vector or throws.
 *
 * `endpoint` option pins a specific endpoint to skip the fallback probe.
 */
export async function ollamaEmbedOne(text, opts = {}) {
  const {
    model = DEFAULT_MODEL,
    url,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    endpoint = "auto",
  } = opts;
  if (typeof text !== "string") {
    throw new TypeError(`ollamaEmbedOne: text must be string, got ${typeof text}`);
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("ollamaEmbedOne: fetchImpl must be a function (globalThis.fetch missing?)");
  }
  // U-INDIA-EMBED-LANE: no explicit opts.url + the REAL globalThis.fetch in use ->
  // prefer the dedicated CPU embed lane (:11435) so this GraphSAGE-corpus embed
  // survives fleet inference load on :11434. An injected fetchImpl (tests) keeps
  // legacy single-URL behavior untouched. A FAILED lane attempt (both endpoints
  // exhausted against the lane) retries MAIN once undecorated -- a broken lane
  // degrades to today's exact behavior, never blackholes the caller.
  const autoResolve = !url && fetchImpl === globalThis.fetch;
  if (autoResolve) {
    const lane = await resolveEmbedUrl();
    if (lane.lane) {
      try {
        return await ollamaEmbedOneAttempt(text, { model, url: lane.url, timeoutMs, fetchImpl, endpoint, lane: true });
      } catch { /* broken lane -> one MAIN retry below; MAIN's error is the one thrown */ }
    }
    // Lane down OR broken-lane retry: the file's own legacy default URL --
    // never lane.url here (when lane.lane was true, lane.url IS the broken lane).
    return ollamaEmbedOneAttempt(text, { model, url: OLLAMA_URL_DEFAULT, timeoutMs, fetchImpl, endpoint, lane: false });
  }
  return ollamaEmbedOneAttempt(text, { model, url: url || OLLAMA_URL_DEFAULT, timeoutMs, fetchImpl, endpoint, lane: false });
}

async function ollamaEmbedOneAttempt(text, { model, url, timeoutMs, fetchImpl, endpoint, lane }) {
  // Endpoint selection -- modern first, legacy fallback on 404 only
  const tryModern = endpoint === "auto" || endpoint === "modern";
  const tryLegacy = endpoint === "auto" || endpoint === "legacy";
  const modernBody = { model, input: text };
  const legacyBody = { model, prompt: text };
  const attempts = [];
  if (tryModern) attempts.push({ path: "/api/embed", body: lane ? withLaneOptions(modernBody) : modernBody, modern: true });
  if (tryLegacy) attempts.push({ path: "/api/embeddings", body: lane ? withLaneOptions(legacyBody) : legacyBody, modern: false });

  let lastErr = null;
  for (const a of attempts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let resp;
    try {
      resp = await fetchImpl(`${url}${a.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a.body),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      continue; // try next endpoint
    }
    clearTimeout(timer);
    if (!resp) {
      lastErr = new Error("ollamaEmbedOne: no response");
      continue;
    }
    if (resp.status === 404 && endpoint === "auto") {
      // Endpoint not supported -- try the next one
      lastErr = new Error(`ollamaEmbedOne: HTTP 404 at ${a.path}`);
      continue;
    }
    if (!resp.ok) {
      const body = resp.text ? await resp.text().catch(() => "") : "";
      throw new Error(`ollamaEmbedOne: HTTP ${resp.status} ${body.slice(0, ERROR_BODY_SLICE_LEN)} @ ${url}`);
    }
    const data = await resp.json();
    // Modern endpoint returns { embeddings: [[...]] }; legacy returns { embedding: [...] }
    const vec = a.modern
      ? (Array.isArray(data?.embeddings) && data.embeddings[0])
      : data?.embedding;
    if (!Array.isArray(vec)) {
      throw new Error(`ollamaEmbedOne: response missing embedding field (got ${JSON.stringify(data).slice(0, ERROR_BODY_SLICE_LEN)}) @ ${url}`);
    }
    return validateVector(vec, EMBEDDING_DIM, "ollama-response");
  }
  // Exhausted all endpoints
  throw new Error(`ollamaEmbedOne: all endpoints failed @ ${url} (last: ${lastErr ? lastErr.message : "unknown"})`);
}

/**
 * Retry wrapper around ollamaEmbedOne with exponential backoff.
 * Returns { ok: true, vector } or { ok: false, error: string, attempts }.
 * Never throws — fail-soft for batch caller.
 */
export async function embedWithRetry(text, opts = {}) {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    retryBaseMs = DEFAULT_RETRY_BASE_MS,
    retryMaxMs = DEFAULT_RETRY_MAX_MS,
    ...rest
  } = opts;
  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const vec = await ollamaEmbedOne(text, rest);
      return { ok: true, vector: vec, attempts: attempt + 1 };
    } catch (e) {
      lastErr = e;
      if (attempt < maxRetries) {
        // Exponential backoff + jitter (50-100% of base) to avoid thundering
        // herd when retrying concurrent items against a single-GPU backend.
        const base = Math.min(retryMaxMs, retryBaseMs * Math.pow(2, attempt));
        const delay = base * (JITTER_MIN_FRACTION + Math.random() * (1 - JITTER_MIN_FRACTION));
        await sleep(delay);
      }
    }
  }
  const errMsg = lastErr ? (lastErr?.message ?? String(lastErr)) : "unknown";
  return { ok: false, error: String(errMsg), attempts: maxRetries + 1 };
}

// ──────────────────────────────────────────────────────────────────────────
// Batch + checkpoint orchestration
// ──────────────────────────────────────────────────────────────────────────

/**
 * Embed a batch of { id, text } items.
 * Returns { ok, vectors: [{id, vector}], failures: [{id, error}], stats }.
 * ok=false ONLY when every item failed. Partial success returns ok=true with
 * non-empty failures array — caller decides whether to retry later.
 * Duplicate ids in input: keeps first occurrence, records duplicate as failure
 * with reason="duplicate-id".
 *
 * opts.concurrency (default 1): number of embed requests in flight at once. 1 =
 * legacy sequential, deterministic request order. >1 = bounded worker pool that
 * saturates an idle GPU backend (~15× on an RTX PRO 6000 Blackwell) while
 * preserving input-order vectors[]/failures[]. Vectors are identical either way.
 */
export async function embedBatch(items, opts = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError(`embedBatch: items must be array, got ${typeof items}`);
  }
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    onProgress = null,
    skipIds: skipIdsRaw = null,
    concurrency = DEFAULT_CONCURRENCY,
    ...rest
  } = opts;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError(`embedBatch: batchSize must be positive integer, got ${batchSize}`);
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(`embedBatch: concurrency must be positive integer, got ${concurrency}`);
  }
  // Strict skipIds shape — accept Set or Array only, reject anything else
  // (a caller passing `{ has: () => true }` would silently skip every item).
  // Materialize a FRESH Set so an overridden `.has` on an input Set is also
  // defeated (defensive — equiv to copy-then-trust).
  let skipIds;
  if (skipIdsRaw === null || skipIdsRaw === undefined) {
    skipIds = new Set();
  } else if (skipIdsRaw instanceof Set) {
    skipIds = new Set([...skipIdsRaw]);
  } else if (Array.isArray(skipIdsRaw)) {
    skipIds = new Set(skipIdsRaw);
  } else {
    throw new TypeError(`embedBatch: skipIds must be Set or Array, got ${typeof skipIdsRaw}`);
  }
  const seen = new Set();
  const vectors = [];
  const failures = [];
  // Two-bucket failure tracking so the caller can distinguish input-validation
  // problems (their bug to fix) from fetch failures (Ollama down).
  let preLoopFailureCount = 0;
  let totalProcessed = 0;
  let totalSkipped = 0;
  const startedAt = Date.now();

  // Normalize + dedupe input (preserve order)
  const normalized = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || typeof it.id !== "string" || typeof it.text !== "string") {
      failures.push({ id: it?.id ?? `idx-${i}`, error: "malformed-item: id+text required as strings" });
      preLoopFailureCount++;
      continue;
    }
    if (RESERVED_ID_NAMES.has(it.id)) {
      failures.push({ id: it.id, error: "malformed-item: reserved-id" });
      preLoopFailureCount++;
      continue;
    }
    if (seen.has(it.id)) {
      failures.push({ id: it.id, error: "duplicate-id" });
      preLoopFailureCount++;
      continue;
    }
    seen.add(it.id);
    if (skipIds.has(it.id)) {
      totalSkipped++;
      continue;
    }
    normalized.push(it);
  }

  // Cumulative progress emitter — identical payload shape across the sequential
  // and concurrent paths so consumers/tests see one contract. Reads the live
  // counters at call time (closure over the mutated let/array bindings).
  const emitProgress = () => {
    if (typeof onProgress !== "function") return;
    try {
      onProgress({
        processed: totalProcessed,
        total: normalized.length,
        succeeded: vectors.length,
        embedFailed: failures.length - preLoopFailureCount,
        malformedOrDuplicate: preLoopFailureCount,
      });
    } catch { /* progress callback errors are non-fatal */ }
  };

  if (concurrency <= 1) {
    // Sequential path (legacy default) — one embed request in flight at a time,
    // deterministic request order. Process in batches of batchSize.
    for (let i = 0; i < normalized.length; i += batchSize) {
      const slice = normalized.slice(i, i + batchSize);
      for (const item of slice) {
        const r = await embedWithRetry(item.text, rest);
        if (r.ok) {
          vectors.push({ id: item.id, vector: r.vector });
        } else {
          failures.push({ id: item.id, error: r.error, attempts: r.attempts });
        }
        totalProcessed++;
      }
      emitProgress();
    }
  } else {
    // Concurrent path — up to `concurrency` embed requests in flight via a
    // bounded worker pool. The embed backend is GPU-idle when fed one request at
    // a time; a small pool saturates it for a large throughput gain with
    // byte-identical vectors. Results land in order-preserving slots so
    // vectors[]/failures[] ordering matches the sequential path (input order).
    // NOTE: request *issue* order is non-deterministic under concurrency>1 —
    // callers that depend on issue order keep the default (concurrency=1).
    const slots = new Array(normalized.length);
    let nextIndex = 0;
    const worker = async () => {
      for (;;) {
        const i = nextIndex++;
        if (i >= normalized.length) return;
        slots[i] = await embedWithRetry(normalized[i].text, rest);
      }
    };
    const poolSize = Math.min(concurrency, normalized.length);
    await Promise.all(Array.from({ length: poolSize }, () => worker()));
    // Reduce in input order; fire progress on the same batchSize cadence as the
    // sequential path so onProgress consumers see equivalent tick spacing.
    for (let i = 0; i < normalized.length; i++) {
      const item = normalized[i];
      const r = slots[i];
      if (r && r.ok) {
        vectors.push({ id: item.id, vector: r.vector });
      } else {
        failures.push({ id: item.id, error: r ? r.error : "no-result", attempts: r ? r.attempts : 0 });
      }
      totalProcessed++;
      if (totalProcessed % batchSize === 0) emitProgress();
    }
    if (totalProcessed % batchSize !== 0) emitProgress();
  }

  const elapsed = Date.now() - startedAt;
  const embedFailed = failures.length - preLoopFailureCount;
  return {
    // ok=true when:
    //   (a) input was empty (vacuous), OR
    //   (b) at least one vector produced, OR
    //   (c) every item was skipIds-skipped with zero failures (pure-resume run).
    // ok=false ONLY when input had items but NONE produced a vector AND there
    // was at least one failure to surface (fail-loud per R12).
    ok: items.length === 0
        || vectors.length > 0
        || (totalSkipped > 0 && failures.length === 0),
    vectors,
    failures,
    stats: {
      total: items.length,
      processed: totalProcessed,
      succeeded: vectors.length,
      failed: failures.length,
      embedFailed,
      malformedOrDuplicate: preLoopFailureCount,
      skipped: totalSkipped,
      elapsedMs: elapsed,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Checkpoint persistence (atomic write via temp+rename)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Build a checkpoint structure from embedBatch results.
 * Vectors are stored as plain arrays (JSON serializable).
 */
export function buildCheckpoint(model, dim, vectors, opts = {}) {
  const { failures = [], extra = {} } = opts;
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    model: String(model),
    dim: Number(dim),
    count: vectors.length,
    failureCount: failures.length,
    generatedAt: new Date().toISOString(),
    vectors: vectors.map(v => ({ id: v.id, embedding: Array.from(v.vector) })),
    failures,
    extra,
  };
}

/**
 * Atomic checkpoint write — temp file + rename so partial writes can't corrupt
 * the canonical file mid-crash.
 */
export function saveCheckpoint(path, checkpoint) {
  if (typeof path !== "string" || path.length === 0) {
    throw new TypeError("saveCheckpoint: path required");
  }
  if (!checkpoint || typeof checkpoint !== "object") {
    throw new TypeError("saveCheckpoint: checkpoint must be object");
  }
  // Validate before writing
  if (checkpoint.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    throw new Error(`saveCheckpoint: schemaVersion mismatch — expected ${CHECKPOINT_SCHEMA_VERSION}, got ${checkpoint.schemaVersion}`);
  }
  const dir = dirname(path);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  // Sweep orphan .tmp-* siblings from prior crashes (older than TMP_STALE_AGE_MS).
  cleanupStaleTmpFiles(path);
  const tmp = path + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(checkpoint, null, 2));
  try {
    renameSync(tmp, path);
  } catch (e) {
    // Rename failed — unlink the tmp to avoid orphan accumulation, then rethrow.
    try { unlinkSync(tmp); } catch { /* best-effort cleanup */ }
    throw e;
  }
  return { ok: true, path, count: checkpoint.count };
}

/**
 * Remove `.tmp-*` siblings of `path` that are older than TMP_STALE_AGE_MS.
 * Idempotent + best-effort — any per-file error is swallowed.
 */
function cleanupStaleTmpFiles(path) {
  const dir = dirname(path);
  if (!dir || !existsSync(dir)) return;
  const base = path.slice(dir.length + 1);
  const prefix = base + ".tmp-";
  const now = Date.now();
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (!name.startsWith(prefix)) continue;
    const full = `${dir}/${name}`;
    try {
      const s = statSync(full);
      if (now - s.mtimeMs > TMP_STALE_AGE_MS) unlinkSync(full);
    } catch { /* best-effort */ }
  }
}

/**
 * Load checkpoint with model/dim guards.
 * Returns { ok, checkpoint, processedIds: Set<string> } or { ok: false, error }.
 * Missing file is ok:false reason="not-found" — caller treats as "start fresh".
 * Schema/model/dim mismatch is ok:false — caller MUST NOT silently merge.
 */
export function loadCheckpoint(path, opts = {}) {
  if (typeof path !== "string" || path.length === 0) {
    throw new TypeError("loadCheckpoint: path required");
  }
  const { expectedModel = null, expectedDim = null } = opts;
  if (!existsSync(path)) {
    return { ok: false, error: "not-found", processedIds: new Set() };
  }
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    return { ok: false, error: `read-failed: ${e.message}`, processedIds: new Set() };
  }
  let cp;
  try {
    cp = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `parse-failed: ${e.message}`, processedIds: new Set() };
  }
  if (!cp || typeof cp !== "object") {
    return { ok: false, error: "malformed: not an object", processedIds: new Set() };
  }
  if (cp.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `schema-mismatch: expected ${CHECKPOINT_SCHEMA_VERSION}, got ${cp.schemaVersion}`,
      processedIds: new Set(),
    };
  }
  if (expectedModel !== null && cp.model !== expectedModel) {
    return {
      ok: false,
      error: `model-mismatch: expected ${expectedModel}, got ${cp.model}`,
      processedIds: new Set(),
    };
  }
  if (expectedDim !== null && cp.dim !== expectedDim) {
    return {
      ok: false,
      error: `dim-mismatch: expected ${expectedDim}, got ${cp.dim}`,
      processedIds: new Set(),
    };
  }
  // Only ids whose embedding ALSO has the right shape go into processedIds.
  // A partially-written / corrupted vector entry must NOT cause its id to be
  // skipped on next run — that's exactly how silent corruption surfaces in
  // the wrong layer (downstream cosineSimilarity throws after thousands of
  // valid embeddings have already been spent).
  const ids = new Set();
  const corruptIds = [];
  if (Array.isArray(cp.vectors)) {
    for (const v of cp.vectors) {
      if (!v || typeof v.id !== "string") continue;
      if (Array.isArray(v.embedding) && v.embedding.length === cp.dim) {
        ids.add(v.id);
      } else {
        corruptIds.push(v.id);
      }
    }
  }
  return { ok: true, checkpoint: cp, processedIds: ids, corruptIds };
}

/**
 * Merge a fresh batch result into an existing checkpoint.
 * Returns a NEW checkpoint object — does not mutate the input.
 * Duplicate ids: the NEW vector wins (fresh embeddings supersede stale).
 */
export function mergeIntoCheckpoint(existingCheckpoint, freshVectors, opts = {}) {
  if (!existingCheckpoint || typeof existingCheckpoint !== "object") {
    throw new TypeError("mergeIntoCheckpoint: existingCheckpoint must be object");
  }
  if (!Array.isArray(freshVectors)) {
    throw new TypeError("mergeIntoCheckpoint: freshVectors must be array");
  }
  const { freshFailures = [] } = opts;
  const expectedDim = Number(existingCheckpoint.dim);
  // Hard fail on (a) missing/non-array vector field, (b) wrong dimension,
  // (c) reserved id. Round-2 originally gated dim-check on `v.vector` truthy,
  // which let vector-less entries through to `Array.from(undefined)` in the
  // merge loop — a confusing TypeError with no id context. R12 fail-loud
  // requires the bad item's id surface AT the validation site.
  for (const v of freshVectors) {
    if (!v || typeof v.id !== "string") continue; // dropped by id-typeof guard below
    if (RESERVED_ID_NAMES.has(v.id)) {
      throw new RangeError(`mergeIntoCheckpoint: vector id "${v.id}" is reserved`);
    }
    if (!Array.isArray(v.vector)) {
      throw new TypeError(`mergeIntoCheckpoint: vector "${v.id}" missing valid .vector array (got ${typeof v.vector})`);
    }
    if (Number.isFinite(expectedDim) && v.vector.length !== expectedDim) {
      throw new RangeError(`mergeIntoCheckpoint: vector ${v.id} dim ${v.vector.length} != checkpoint dim ${expectedDim}`);
    }
  }
  const byId = new Map();
  for (const v of (existingCheckpoint.vectors || [])) {
    if (v && typeof v.id === "string" && !RESERVED_ID_NAMES.has(v.id)) byId.set(v.id, v);
  }
  for (const v of freshVectors) {
    if (v && typeof v.id === "string") {
      byId.set(v.id, { id: v.id, embedding: Array.from(v.vector) });
    }
  }
  const merged = [...byId.values()];
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    model: existingCheckpoint.model,
    dim: existingCheckpoint.dim,
    count: merged.length,
    failureCount: freshFailures.length,
    generatedAt: new Date().toISOString(),
    vectors: merged,
    failures: freshFailures,
    extra: existingCheckpoint.extra || {},
  };
}

// ──────────────────────────────────────────────────────────────────────────
// High-level convenience: embed a cluster set with checkpoint resume
// ──────────────────────────────────────────────────────────────────────────

/**
 * Embed cluster nodes (output of aggregateLevel / clusterByJaccard).
 * Each cluster MUST have id + textFor (function or precomputed string).
 * Returns combined { ok, vectors, failures, stats, checkpoint }.
 * If checkpointPath is given, loads existing → resumes → merges → saves.
 */
export async function embedClusters(clusters, opts = {}) {
  if (!Array.isArray(clusters)) {
    throw new TypeError("embedClusters: clusters must be array");
  }
  const {
    checkpointPath = null,
    textFor = null,
    model = DEFAULT_MODEL,
    dim = EMBEDDING_DIM,
    ...rest
  } = opts;
  if (typeof textFor !== "function") {
    throw new TypeError("embedClusters: textFor(cluster) → string is required");
  }
  // Step 1: load existing checkpoint (if any). corruptIds surface to caller
  // so an operator can see which prior-run vectors are being silently re-done;
  // they're auto-healed (re-embedded + merged win) but the data is load-bearing
  // emergent behavior, not magic — making it observable matters for diagnostics.
  let existing = null;
  let skipIds = new Set();
  let resumeCorruptIds = [];
  if (checkpointPath) {
    const loaded = loadCheckpoint(checkpointPath, { expectedModel: model, expectedDim: dim });
    if (loaded.ok) {
      existing = loaded.checkpoint;
      skipIds = loaded.processedIds;
      resumeCorruptIds = loaded.corruptIds || [];
    }
    // Note: ok=false (not-found / mismatch) → start fresh; partial-load is
    // intentionally not supported — model/dim mismatch on resume is a bug.
  }
  // Step 2: build items. Surface duplicate cluster ids as a HARD ERROR (R12
  // fail-loud) — they signal an upstream aggregation bug; routing them through
  // embedBatch's generic "duplicate-id" failure bucket would hide the cause.
  const items = [];
  const seenIds = new Set();
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    if (!c || typeof c.id !== "string") continue;
    if (RESERVED_ID_NAMES.has(c.id)) {
      throw new RangeError(`embedClusters: cluster[${i}] id "${c.id}" is reserved`);
    }
    if (seenIds.has(c.id)) {
      throw new Error(`embedClusters: duplicate cluster id "${c.id}" at index ${i} (upstream aggregation bug)`);
    }
    seenIds.add(c.id);
    let text;
    try { text = textFor(c); }
    catch (e) {
      // Re-throw with cluster context so the caller can pinpoint the bad item.
      throw new Error(`embedClusters: textFor threw on cluster ${c.id}: ${e.message}`);
    }
    if (typeof text !== "string") {
      throw new TypeError(`embedClusters: textFor must return string for ${c.id}, got ${typeof text}`);
    }
    items.push({ id: c.id, text });
  }
  // Step 3: batch-embed (skipIds prevents re-embedding)
  const batchResult = await embedBatch(items, { ...rest, skipIds });
  // Step 4: merge with existing + save
  let checkpoint;
  if (existing) {
    checkpoint = mergeIntoCheckpoint(existing, batchResult.vectors, { freshFailures: batchResult.failures });
  } else {
    checkpoint = buildCheckpoint(model, dim, batchResult.vectors, { failures: batchResult.failures });
  }
  if (checkpointPath) {
    saveCheckpoint(checkpointPath, checkpoint);
  }
  return {
    ok: batchResult.ok,
    vectors: batchResult.vectors,
    failures: batchResult.failures,
    stats: batchResult.stats,
    checkpoint,
    // Ids whose prior-run vectors were corrupt and got re-embedded this run.
    // Empty unless resuming from a previously-malformed checkpoint.
    corruptIdsResumed: resumeCorruptIds,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Cluster → text helper (compose with tribal-graph-clusters output shape)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Default text-for-cluster: join the repBag tokens + title (if any) into a
 * single string suitable for embedding. Stable across runs (same repBag → same text).
 * Caller may pass their own textFor if they want richer signal.
 */
export function defaultClusterText(cluster) {
  if (!cluster) return "";
  const parts = [];
  if (cluster.title) parts.push(String(cluster.title));
  if (cluster.repBag instanceof Set) {
    // Sort tokens for determinism — Set iteration order is insertion-order
    // which depends on the cluster build order. Sorted ensures the SAME
    // repBag produces the SAME embedding text every run.
    parts.push([...cluster.repBag].sort().join(" "));
  } else if (Array.isArray(cluster.tokens)) {
    // Dedup before sort — array tokens with duplicates would otherwise produce
    // a different embedding text than a Set-equivalent ("a a b" vs "a b").
    parts.push([...new Set(cluster.tokens)].sort().join(" "));
  }
  // Use a human-readable separator — embedding models tokenize " | " cleanly,
  // whereas U+001F contaminates cosine similarity with a stray-token signal.
  // ID_HASH_SEP stays reserved for byte-level id boundaries only.
  return parts.join(TEXT_JOIN_SEP);
}
