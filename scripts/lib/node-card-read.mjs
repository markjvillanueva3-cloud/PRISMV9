/**
 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
 *
 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads the freshest
 * compact projection sidecar (no new heavy build):
 *   - system-graph-index.json (~193MB, regenerated each regen-viz): richest —
 *     id/label/layer/status/info + knowledge:{wikiEntries,memoryEntries} (the
 *     documenting docs an agent reads next), and
 *   - find-cache.json (~55MB) as the lighter fallback (id/label/layer/subgroup/
 *     info/noteCount) — the same sidecar the `system-viz-query find` hot path
 *     (~1060×/day) reads.
 *
 * Staleness is checked by STAT-ing the live graph (never READING it) and comparing
 * to the sidecar's recorded source stamps — a stale card is returned WITH a `stale`
 * flag rather than silently triggering the 644MB load (R12). If NO compact sidecar
 * exists the reader THROWS (it refuses to degrade to the expensive path on its own).
 *
 * NOTE: node-capability-index.json enrichment was REMOVED — its keys
 * (`engine.*`/`algorithm.*`/…) do not match the graph node namespaces
 * (`eng.*`/`alg.*`/…): 0 of 302,481 nodes resolved a pointer (scrutiny B,
 * 2026-06-04), so it was pure dead I/O. The doc pointers come from the index's
 * own `knowledge` field. Re-add only behind a verified id↔cap-key mapping.
 * SEEK PATH (U-NODECARD-OFFSET-INDEX): when the dedicated offset index pair
 * (node-card-offsets.json + node-cards.jsonl, emitted by build-graph-index /
 * build-card-offset-index) is present AND fresh, readCard SEEKS one record
 * (parse the ~24MB offsets table once, then fs.read exactly `length` bytes at
 * `byteOffset` from the jsonl) instead of parsing the 193MB sidecar — so a
 * short-lived per-prompt process pays ~24MB not ~193MB (301,185 cards live). The seek is transparent:
 * every existing caller (CLI / readCards / future dispatcher) inherits it. It
 * degrades to the full-sidecar path when the offset index is absent or stale.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeCard, assertCard, CARD_SCHEMA_VERSION } from "./node-card-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const VIZ = path.join(ROOT, "state", "shared", "system-viz");

export const DEFAULT_PATHS = Object.freeze({
  graphIndex: path.join(VIZ, "system-graph-index.json"),
  findCache: path.join(VIZ, "find-cache.json"),
  cardOffsets: path.join(VIZ, "node-card-offsets.json"),
  cardJsonl: path.join(VIZ, "node-cards.jsonl"),
  graph: path.join(VIZ, "system-graph.json"),
});

// Compact sources in PREFERENCE order (richest first). system-graph-index carries
// knowledge:{wikiEntries,memoryEntries} (the docs to read); find-cache is the
// lighter fallback. The reader picks the freshest EXISTING source — so it never
// serves stale data when a fresh one is available, and never the 644MB graph.
const SOURCES = Object.freeze([
  { key: "system-graph-index", pathKey: "graphIndex" },
  { key: "find-cache", pathKey: "findCache" },
]);

// module-scope index cache keyed by the CHOSEN source PATH, invalidated on
// mtime/size change. One process that reads many cards builds the id->node Map
// once. Keyed by path so test fixtures and the real indexes never collide.
const _cacheByPath = new Map();

// Separate cache for the parsed offset table (id->[off,len]) of the seek path,
// keyed by the offsets-file path + invalidated on mtime/size. Parsed once per
// process; the jsonl itself is never bulk-read — only seeked.
const _offsetsCacheByPath = new Map();

/**
 * Load + cache the offset table for the seek path. Returns
 *   { offsets, jsonlPath, stale, staleReason }  when present + parseable,
 *   null                                         when absent / unparseable.
 * Freshness is the SAME graph-stat comparison the full sidecars use.
 */
function loadOffsets(offsetsPath, jsonlFallback, graphPath) {
  if (!offsetsPath || !fs.existsSync(offsetsPath)) return null;
  const fresh = freshnessOf(offsetsPath, graphPath);
  const st = fs.statSync(offsetsPath);
  const cached = _offsetsCacheByPath.get(offsetsPath);
  if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
    return { offsets: cached.offsets, jsonlPath: cached.jsonlPath, stale: fresh.stale, staleReason: fresh.staleReason };
  }
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(offsetsPath, "utf8"));
  } catch {
    return null; // unparseable offsets -> fall back to the full-sidecar path
  }
  if (!doc || !doc.offsets || typeof doc.offsets !== "object") return null;
  // doc.jsonl is a basename co-located beside the offsets file.
  const jsonlPath = typeof doc.jsonl === "string" && doc.jsonl
    ? path.join(path.dirname(offsetsPath), doc.jsonl)
    : jsonlFallback;
  // Torn-pair guard: the offsets doc records the byte length of the jsonl it was
  // built against. If the on-disk jsonl is a different size (a stale/partial
  // jsonl from a death between the two atomic writes, or a mismatched pair),
  // refuse the seek and degrade to the full-sidecar path — never seek into wrong
  // bytes. Absent jsonlBytes (older index) -> skip the check (back-compat).
  if (Number.isFinite(doc.jsonlBytes) && doc.jsonlBytes > 0) {
    try {
      if (fs.statSync(jsonlPath).size !== doc.jsonlBytes) return null;
    } catch {
      return null; // jsonl missing/unstattable -> fall back
    }
  }
  _offsetsCacheByPath.set(offsetsPath, { mtimeMs: st.mtimeMs, size: st.size, offsets: doc.offsets, jsonlPath });
  return { offsets: doc.offsets, jsonlPath, stale: fresh.stale, staleReason: fresh.staleReason };
}

/**
 * Try the cheap seek path. Returns one of:
 *   { status: "hit",  card }       — id found, card seeked + validated,
 *   { status: "miss" }             — offset index is FRESH but the id is absent
 *                                    (coverage == full sidecar, so a real miss),
 *   { status: "unavailable" }      — no offset index / stale / corrupt / read
 *                                    failure -> caller uses the full-sidecar path.
 * Never reads the 644MB graph and never bulk-parses the 193MB sidecar.
 */
function _seekCard(id, paths) {
  const loaded = loadOffsets(paths.cardOffsets, paths.cardJsonl, paths.graph);
  if (!loaded) return { status: "unavailable" };
  // Stale offset index -> let buildIndex pick the freshest source and flag stale,
  // rather than serving a stale seek silently.
  if (loaded.stale) return { status: "unavailable" };
  const offsets = loaded.offsets;
  const rec = Object.prototype.hasOwnProperty.call(offsets, id) ? offsets[id] : undefined;
  if (!Array.isArray(rec)) return { status: "miss" };
  const off = Number(rec[0]);
  const len = Number(rec[1]);
  if (!Number.isFinite(off) || off < 0 || !Number.isFinite(len) || len <= 0) return { status: "unavailable" };
  if (!loaded.jsonlPath || !fs.existsSync(loaded.jsonlPath)) return { status: "unavailable" };
  let parsed;
  try {
    const fd = fs.openSync(loaded.jsonlPath, "r");
    try {
      const buf = Buffer.alloc(len);
      const n = fs.readSync(fd, buf, 0, len, off);
      parsed = JSON.parse(buf.toString("utf8", 0, n));
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return { status: "unavailable" }; // bad offset / truncated jsonl -> safe fallback
  }
  // Integrity: the seeked record's id MUST match the requested id (guards a
  // corrupt/misaligned offset table from returning the wrong node).
  if (!parsed || parsed.id !== id) return { status: "unavailable" };
  return { status: "hit", card: assertCard(parsed) };
}

/**
 * Read ONLY the head of a sidecar (top-level source stamps live in the first
 * ~200 bytes) so freshness can be checked without parsing a 193MB file. Compares
 * the recorded source stamps to a STAT of the live graph (never a READ).
 */
function freshnessOf(sidecarPath, graphPath) {
  if (!sidecarPath || !fs.existsSync(sidecarPath)) return { exists: false };
  let stamp = { sourceMtimeMs: null, sourceSize: null };
  try {
    const fd = fs.openSync(sidecarPath, "r");
    try {
      const buf = Buffer.alloc(2048);
      const n = fs.readSync(fd, buf, 0, 2048, 0);
      const head = buf.toString("utf8", 0, n);
      const mt = head.match(/"sourceMtimeMs"\s*:\s*([0-9.]+)/);
      const sz = head.match(/"sourceSize(?:Bytes)?"\s*:\s*([0-9]+)/);
      stamp = { sourceMtimeMs: mt ? Number(mt[1]) : null, sourceSize: sz ? Number(sz[1]) : null };
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    /* unreadable head -> treat as existing-but-unverifiable (not stale) */
  }
  let stale = false;
  let staleReason = null;
  try {
    const g = fs.statSync(graphPath);
    if (stamp.sourceSize != null && g.size !== stamp.sourceSize) {
      stale = true;
      staleReason = "graph-size-changed";
    } else if (stamp.sourceMtimeMs != null && Math.abs(g.mtimeMs - stamp.sourceMtimeMs) > 1000) {
      stale = true;
      staleReason = "graph-mtime-drift";
    }
  } catch {
    /* graph absent -> cannot verify; do NOT mark stale (no false alarm) */
  }
  return { exists: true, stale, staleReason };
}

function buildIndex(paths) {
  // Evaluate each compact source cheaply (head-stat only), pick the freshest
  // existing one (preference order breaks ties). Refuse the 644MB graph fallback.
  const cands = SOURCES
    .map((s) => ({ ...s, path: paths[s.pathKey], fresh: freshnessOf(paths[s.pathKey], paths.graph) }))
    .filter((c) => c.fresh.exists);
  if (cands.length === 0) {
    throw new Error(
      "node-card: no compact sidecar present (system-graph-index.json / find-cache.json). " +
        "Run `node scripts/system-viz-query.mjs cache-status` and regen via regen-viz. " +
        "Refusing the 644MB graph load in a token-cheap reader (R12).",
    );
  }
  const chosen = cands.find((c) => !c.fresh.stale) || cands[0]; // first fresh, else first existing

  const st = fs.statSync(chosen.path);
  const cached = _cacheByPath.get(chosen.path);
  if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) return cached;

  const json = JSON.parse(fs.readFileSync(chosen.path, "utf8"));
  const byId = new Map();
  for (const n of json.nodes || []) {
    if (n && typeof n.id === "string" && n.id && !byId.has(n.id)) byId.set(n.id, n);
  }

  const entry = {
    mtimeMs: st.mtimeMs,
    size: st.size,
    byId,
    stale: chosen.fresh.stale,
    staleReason: chosen.fresh.staleReason,
    source: chosen.key,
  };
  _cacheByPath.set(chosen.path, entry);
  return entry;
}

/**
 * Read one node's compact card by id. Returns
 *   { card, stale, staleReason, source }   on hit,
 *   null                                    if the id is not in the index.
 * Throws only on a missing sidecar (no graph fallback) or a malformed id.
 *
 * opts.paths is MERGED onto DEFAULT_PATHS — a PARTIAL override (e.g. just
 * {findCache}) leaves the OTHER paths (graphIndex/graph) pointing at the real
 * sidecars. Pass a COMPLETE path set when you need full isolation (tests do).
 */
export function readCard(id, opts = {}) {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("readCard: id must be a non-empty string");
  }
  const paths = { ...DEFAULT_PATHS, ...(opts.paths || {}) };

  // Cheap seek path first (U-NODECARD-OFFSET-INDEX): when the offset index is
  // present + fresh, read ONE record without parsing the 193MB sidecar.
  //   hit  -> return it (never stale: a fresh offset index is the freshest src)
  //   miss -> the index is fresh and the id is genuinely absent (coverage ==
  //           full sidecar) -> null, WITHOUT paying the full parse.
  //   unavailable -> no/stale/corrupt offset index -> full-sidecar path below.
  const seek = _seekCard(id, paths);
  if (seek.status === "hit") {
    return { card: seek.card, stale: false, staleReason: null, source: "node-card-offsets", schemaVersion: CARD_SCHEMA_VERSION };
  }
  if (seek.status === "miss") return null;

  const ix = buildIndex(paths);
  const raw = ix.byId.get(id);
  if (!raw) return null;
  const card = assertCard(makeCard(raw));
  return { card, stale: ix.stale, staleReason: ix.staleReason, source: ix.source, schemaVersion: CARD_SCHEMA_VERSION };
}

/**
 * Batch read. Returns one entry per input id, in order:
 *   { card, stale, ... } on hit, { id, notFound: true } on miss,
 *   { id, error } if the read threw (e.g. find-cache missing — surfaced per-id,
 *   not swallowed). The index is built once for the whole batch.
 */
export function readCards(ids, opts = {}) {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => {
    try {
      const r = readCard(id, opts);
      return r ?? { id, notFound: true };
    } catch (e) {
      return { id, error: e.message };
    }
  });
}

/**
 * HOOK-SAFE seek-only read. Returns { card, source:"node-card-offsets", stale:false }
 * on a fresh-offset-index hit, else null (a real miss, OR the offset index is
 * absent/stale/corrupt). It NEVER falls back to the 193MB full-sidecar parse and
 * NEVER throws — so it is safe to call from a per-prompt UserPromptSubmit hook
 * where the bulk parse would blow the latency budget. Bad id -> null (not throw).
 */
export function seekCard(id, opts = {}) {
  if (typeof id !== "string" || !id.trim()) return null;
  const paths = { ...DEFAULT_PATHS, ...(opts.paths || {}) };
  let seek;
  try {
    seek = _seekCard(id, paths);
  } catch {
    return null;
  }
  if (seek.status === "hit") {
    return { card: seek.card, source: "node-card-offsets", stale: false, schemaVersion: CARD_SCHEMA_VERSION };
  }
  return null;
}

/**
 * Offset-index availability + freshness WITHOUT seeking any card -- lets a per-prompt hook
 * tell a DEGRADED index (absent/stale, worth flagging) apart from a genuine non-node id (a
 * normal miss). Public seekCard collapses both to null; this surfaces the distinction
 * _seekCard already computes (miss vs unavailable). Reuses loadOffsets' STAT-only freshness
 * -- never reads the 644MB graph or bulk-parses the jsonl. Fail-soft: never throws.
 * @returns {{available:boolean, stale:boolean, staleReason:string|null}}
 */
export function offsetIndexStatus(opts = {}) {
  const paths = { ...DEFAULT_PATHS, ...(opts.paths || {}) };
  try {
    const loaded = loadOffsets(paths.cardOffsets, paths.cardJsonl, paths.graph);
    if (!loaded) return { available: false, stale: false, staleReason: "absent" };
    return { available: true, stale: !!loaded.stale, staleReason: loaded.staleReason || null };
  } catch {
    return { available: false, stale: false, staleReason: "error" };
  }
}

/** Total nodes covered by the card index (every graph node the find-cache holds). */
export function cardCount(opts = {}) {
  const paths = { ...DEFAULT_PATHS, ...(opts.paths || {}) };
  return buildIndex(paths).byId.size;
}

/** Test-only: drop the module index + offset caches so a fixture rebuild is observed. */
export function _resetCacheForTest() {
  _cacheByPath.clear();
  _offsetsCacheByPath.clear();
}
