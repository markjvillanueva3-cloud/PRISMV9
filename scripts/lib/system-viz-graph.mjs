/**
 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
 *
 * Extracted from scripts/system-viz-query.mjs so a single process can load
 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
 *
 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
 * module-scope cache keyed on the graph file's mtime + size. A second
 * same-process call with an unchanged file returns the cached object
 * (no 24 MB re-parse). Invalidation is conservative — stat is taken
 * BEFORE the read so a concurrent rewrite can only ever cause a *false
 * miss* (an extra re-parse), never a *false hit* (serving stale bytes).
 *
 * CONTRACT AMENDMENT -- loadFindCache serve-stale-then-async-heal (2026-06-09,
 * sierra, find-cache OOM durable fix): loadGraph()'s "never serve stale bytes"
 * invariant above STILL HOLDS for loadGraph itself. But loadFindCache()'s
 * stale/absent FALLBACK no longer falls through to loadGraph() (which
 * materializes the ~643MB graph into V8 heap -> OOM inside a ~1500ms hook
 * budget). For SEARCH, an OOM-dead hook is strictly worse than a slightly-stale
 * find projection (a stale sidecar is ~99% accurate for `find`). So the
 * fallback now: (a) serves the STALE sidecar's nodes with `stale:true` when one
 * exists, or returns a fail-soft `{nodes:[], stale:true, cold:true}` when none
 * does, and (b) triggers a DETACHED, lockfile-DEBOUNCED `regen-find-cache.mjs`
 * subprocess (the only OOM-safe rebuild path -- it self-re-execs with a 24GB
 * heap) so the NEXT call self-heals to fresh. The fresh-hit fast path is
 * unchanged: a fresh sidecar is still a plain cache hit, no stale flag, no
 * regen spawn. This change is scoped to the loadFindCache fallback ONLY.
 *
 * SCOPE — who actually benefits (be honest, per /forge-audit-v2 reviewer):
 * the cache is IN-PROCESS only. PRISM hooks and the system-viz-query.mjs
 * CLI are spawned as fresh `node` processes per invocation — they call
 * loadGraph() exactly once then exit, so they get NO cache benefit (the
 * cold-parse path is unchanged for them). The real beneficiary is any
 * single long-lived process that calls loadGraph() >= 2x: batch/pipeline
 * scripts that issue multiple graph queries in one run, or a future
 * long-lived server importing this lib. Cross-process caching is out of
 * scope (would need a daemon or memory-mapped store).
 *
 * Exports:
 *   loadGraph(opts?)          — parse graph from disk (cached). opts.fresh
 *                               forces a re-parse and does NOT poison the
 *                               shared cache. Zero-arg call is unchanged
 *                               (backward compatible with all callers).
 *   findInGraph(G, q, opts)   — case-insensitive node search.
 *   __test                    — white-box seam for the test suite only.
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/lib/ → scripts/ → project root
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
// Read at CALL time (not module-eval) so tests + future tooling can point the
// lib at a temp fixture without touching the live ~370 MB production graph.
// REGRESSION DEFENSE: a prior test that hard-coded the production path
// accidentally deleted it via fs.unlinkSync; this env override eliminates that
// class of footgun for hermetic tests. Recovered from .previous.json backup.
// See CLAUDE.md ## Recent regressions 2026-05-18 U-VIZ-FIND-CACHE.
function graphPath() {
  return process.env.PRISM_VIZ_GRAPH_PATH || DEFAULT_GRAPH;
}
// Module-scope const retained for back-compat — every existing consumer using
// GRAPH directly still works against the default path. New consumers (and the
// internal loadGraph / readSidecarIfFresh / writeSidecarAtomic in this file)
// should call graphPath() to honor the env override.
const GRAPH = DEFAULT_GRAPH;

// TTL belt: even when mtime+size are unchanged, re-read after this window so
// a same-mtime same-size rewrite (rare: regen writing within the same second
// to an identically-sized file) cannot be served stale indefinitely. mtime+size
// is the primary invalidation; this is defense-in-depth, not the main signal.
const DEFAULT_TTL_MS = 60_000;

// Returns the reuse TTL in ms, or 0 to mean "do not cache at all".
// TTL=0 is treated as a full disable (route through bypass) rather than the
// worst-of-both "populate 24 MB but never serve" footgun. Non-numeric or
// negative env → 60s default.
function ttlMs() {
  const raw = process.env.PRISM_VIZ_GRAPH_CACHE_TTL_MS;
  if (raw === undefined || raw === "") return DEFAULT_TTL_MS;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) return DEFAULT_TTL_MS;
  return v; // may be 0 → caller treats as disable
}

// Env knob is read at CALL time (not module load) so tests / callers can
// toggle it per-invocation. PRISM_VIZ_GRAPH_NO_CACHE=1 → always re-parse.
function cacheDisabled() {
  return process.env.PRISM_VIZ_GRAPH_NO_CACHE === "1";
}

/** Module-scope cache: { mtimeMs, size, loadedAt, graph } | null */
let _cache = null;

function descriptiveError(absPath, e, verb) {
  return new Error(
    `Cannot ${verb} graph at ${absPath}.\n  ${e.message}\n  Run: node scripts/generate-system-viz.mjs`
  );
}

/**
 * Read + JSON.parse an arbitrary graph path. No caching. Throws a descriptive
 * Error (read failure vs parse failure are distinguished) on any failure.
 * Exposed via __test for hermetic throw-path coverage.
 */
function readAndParse(absPath) {
  // U-NN-PREDICTOR-EMBED-WIRE follow-up (2026-05-24, slot papa): the system-viz
  // graph crossed V8's ~512MB max-string-length ceiling so JSON.parse + the
  // upstream fs.readFileSync(..., "utf8") both throw ERR_STRING_TOO_LONG on
  // hosts where the graph is large. Route through the streaming reader so a
  // 541MB+ graph parses without materializing one big UTF-16 string. Falls back
  // to the legacy synchronous path on small graphs (or readGraphStreaming
  // failure modes that aren't size-related) — preserves the error-shape that
  // callers + tests assert on.
  try {
    const st = fs.statSync(absPath);
    // Anything close to V8's ~512MB ceiling MUST use the streaming reader.
    // 256 MB threshold leaves headroom for the JSON-string overhead a UTF-16
    // re-encode would multiply.
    if (st && Number.isFinite(st.size) && st.size > 256 * 1024 * 1024) {
      return readGraphStreaming(absPath);
    }
  } catch {
    // statSync failure (missing file / permission) — let the legacy path emit
    // the descriptive read-failure error.
  }
  let raw;
  try {
    raw = fs.readFileSync(absPath, "utf8");
  } catch (e) {
    // ERR_STRING_TOO_LONG falls here too — retry through the streaming path.
    if (e && e.code === "ERR_STRING_TOO_LONG") {
      try { return readGraphStreaming(absPath); }
      catch (sErr) { throw descriptiveError(absPath, sErr, "read-streaming"); }
    }
    throw descriptiveError(absPath, e, "read");
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw descriptiveError(absPath, e, "parse");
  }
}

/**
 * Load the system-viz graph from disk and return the parsed object.
 *
 * Cached across calls in the same process keyed on the file's mtime + size.
 * Callers should treat the returned object as READ-ONLY — the cached instance
 * is shared across all non-fresh callers in the process. A caller that needs
 * to mutate the graph must pass { fresh: true } to get an isolated parse.
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.fresh=false] - bypass + do not populate the cache.
 * @returns {object} parsed graph
 * @throws {Error} descriptive message if the file cannot be read or parsed.
 */
export function loadGraph({ fresh = false } = {}) {
  // TTL=0 → full disable (no populate, no stat-compare): avoids retaining
  // 24 MB that can never be served. Same effect as PRISM_VIZ_GRAPH_NO_CACHE=1.
  const bypass = fresh || cacheDisabled() || ttlMs() === 0;

  if (!bypass && _cache) {
    let st = null;
    try {
      st = fs.statSync(graphPath());
    } catch {
      st = null; // file vanished — fall through to readAndParse (canonical throw)
    }
    if (
      st &&
      st.mtimeMs === _cache.mtimeMs &&
      st.size === _cache.size &&
      Date.now() - _cache.loadedAt < ttlMs()
    ) {
      return _cache.graph;
    }
  }

  // stat BEFORE read so the cached (mtime,size) can never be NEWER than the
  // bytes actually parsed → a racing rewrite yields a false miss, not a
  // false hit. If stat fails here, readAndParse() throws the canonical error.
  let st = null;
  try {
    st = fs.statSync(graphPath());
  } catch {
    st = null;
  }

  const graph = readAndParse(graphPath());

  if (!bypass && st) {
    _cache = { mtimeMs: st.mtimeMs, size: st.size, loadedAt: Date.now(), graph };
  }
  return graph;
}

/**
 * extractTopLevelObject -- pull the substring of a JSON object value keyed by
 * `key` out of a (possibly truncated) JSON text via string-aware brace
 * balancing. Returns the object substring (incl. its braces) or null if the key
 * / opening brace isn't present or the object never closes within `text`.
 *
 * Scoped for the system-graph HEAD where `meta` is the first object value (after
 * the schemaVersion + generatedAt string scalars) -- it matches the FIRST
 * `"key"` occurrence, unambiguous for the unique top-level `meta` key. Only
 * `{`/`}` are balanced (array `[`/`]` and string-interior braces are skipped via
 * the in-string guard), so any valid JSON object closes at depth 0.
 */
function extractTopLevelObject(text, key) {
  const needle = `"${key}"`;
  const k = text.indexOf(needle);
  if (k === -1) return null;
  let i = k + needle.length;
  while (i < text.length && text[i] !== ":") i++;
  if (i >= text.length) return null;
  i++; // past ':'
  while (i < text.length && (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r")) i++;
  if (text[i] !== "{") return null;
  const start = i;
  let depth = 0, inStr = false, esc = false;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") { if (--depth === 0) return text.slice(start, i + 1); }
  }
  return null; // not closed within text
}

/**
 * extractTopLevelScalar -- pull a top-level JSON string scalar value for `key`
 * (e.g. schemaVersion / generatedAt) out of `text`. Returns the un-escaped
 * string or undefined. Matches the FIRST quoted value for the key (the
 * top-level scalars precede `meta` in byte order, so this is unambiguous).
 */
function extractTopLevelScalar(text, key) {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  if (!m) return undefined;
  try { return JSON.parse(`"${m[1]}"`); } catch { return m[1]; }
}

/**
 * readGraphMeta -- cheap, bounded extraction of ONLY the top-level `meta` object
 * (plus `schemaVersion` + `generatedAt`) from a graph file, WITHOUT
 * materializing the full multi-hundred-MB graph.
 *
 * WHY: `meta` (counts / headline / coverage / totals / vault / roadmap) lives in
 * the first few KB of system-graph.json -- byte ~67, before the huge `nodes` /
 * `edges` arrays. Commands that need ONLY meta (e.g. the `headline` query) would
 * otherwise fall through to loadGraph() / readGraphStreaming() and pay the full
 * multi-second ~870 MB read (and are transiently OOM-prone under fleet load).
 * This reads a bounded HEAD slice and brace-balances the `meta` object out of
 * it: ~instant, fixed memory, no OOM surface -- the same cheap-read discipline
 * as the find-cache / node-card / octopus short-circuits in system-viz-query.mjs.
 *
 * @param {string} [absPath=graphPath()] - graph path.
 * @param {object} [opts]
 * @param {number} [opts.maxBytes=2*1024*1024] - head bytes to scan. The live
 *   `meta` closes well under 64 KB; 2 MB is generous headroom for roadmap.phases
 *   growth and still ~0.2% of an 870 MB graph.
 * @returns {{schemaVersion?:string, generatedAt?:string, meta:object}}
 * @throws descriptiveError on read failure, or if `meta` is absent / not closed
 *   within maxBytes (fail-loud -- the caller may fall back to loadGraph()).
 */
export function readGraphMeta(absPath = graphPath(), { maxBytes = 2 * 1024 * 1024 } = {}) {
  let fd;
  let head;
  try {
    fd = fs.openSync(absPath, "r");
    const size = fs.fstatSync(fd).size;
    const len = Math.min(maxBytes, size);
    const buf = Buffer.alloc(len);
    const got = fs.readSync(fd, buf, 0, len, 0);
    head = buf.subarray(0, got).toString("utf8");
  } catch (e) {
    throw descriptiveError(absPath, e, "read-meta");
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* best-effort fd close */ } }
  }

  const metaStr = extractTopLevelObject(head, "meta");
  if (metaStr === null) {
    throw descriptiveError(
      absPath,
      new Error(`top-level "meta" not found or not closed within first ${maxBytes} bytes`),
      "parse-meta"
    );
  }
  let meta;
  try { meta = JSON.parse(metaStr); }
  catch (e) { throw descriptiveError(absPath, e, "parse-meta"); }

  return {
    schemaVersion: extractTopLevelScalar(head, "schemaVersion"),
    generatedAt: extractTopLevelScalar(head, "generatedAt"),
    meta,
  };
}

/**
 * Search graph nodes for a query string.
 *
 * Matches against: label + id + info + subgroup (case-insensitive).
 * Verbatim from the `find` command in system-viz-query.mjs.
 *
 * @param {object} G      - Parsed graph object (from loadGraph()).
 * @param {string} terms  - Query string (space-separated terms joined if array).
 * @param {object} opts
 * @param {number} opts.limit - Maximum hits to return (default 30).
 * @returns {Array} Matching node objects.
 */
export function findInGraph(G, terms, { limit = 30 } = {}) {
  const q = (Array.isArray(terms) ? terms.join(" ") : terms).toLowerCase();
  return G.nodes
    .filter(n =>
      (n.label + " " + n.id + " " + (n.info ?? "") + " " + (n.subgroup ?? ""))
        .toLowerCase()
        .includes(q)
    )
    .slice(0, limit);
}

/**
 * loadFindCache — cross-process sidecar optimized for findInGraph().
 *
 * PROBLEM SOLVED: hooks like viz-first-redirect fire 1000+ times/day and each
 * spawns a fresh `node` subprocess that calls loadGraph() once and exits.
 * The in-process _cache above is useless for them — each subprocess pays the
 * full 370MB parse cost (≈2s post-cable-swap, ≈9s on a slow USB-2.0 port).
 *
 * STRATEGY: emit a tiny sidecar JSON at findCachePath() containing only the
 * fields findInGraph() actually reads — label, id, info, subgroup, layer,
 * kind (kept for downstream UI). The sidecar is ~2MB instead of ~370MB
 * (≈170× smaller, ≈170× faster cold parse).
 *
 * STALE/ABSENT FALLBACK (2026-06-09 durable OOM fix -- see CONTRACT AMENDMENT in
 * the file header): the stale/absent path NO LONGER falls through to loadGraph()
 * in the hook hot path (that materializes the ~643MB graph -> OOM in a ~1500ms
 * budget). Instead it serves the STALE sidecar's nodes (`stale:true`) or a
 * fail-soft empty result (`stale:true, cold:true`), and fires a DETACHED +
 * lockfile-DEBOUNCED `regen-find-cache.mjs` subprocess so the NEXT call
 * self-heals. The explicit-opt-in `fresh:true` / `PRISM_VIZ_FIND_CACHE_DISABLE`
 * path (used by the OFFLINE regenerator, NOT the hooks) still does the full
 * loadGraph() parse + sidecar write -- that is where the graph is meant to load.
 *
 * RETURN SHAPE: `{nodes: Array<slim-node>}` on a fresh hit and on the explicit
 * full-parse path; `{nodes: Array, stale:true}` when serving a stale sidecar;
 * `{nodes: [], stale:true, cold:true}` on a cold start (no usable sidecar). The
 * `nodes` key is ALWAYS present (callers that do `findInGraph(result, ...)` over
 * `result.nodes` never crash; an empty array yields 0 hits). `stale`/`cold` are
 * advisory flags -- existing callers that ignore them are unaffected. The
 * function is for `findInGraph` ONLY. DO NOT USE if you need `graph.edges`,
 * `graph.meta`, `graph.schemaVersion`, `graph.fsCoverage`, or any field beyond
 * the projected six (label/id/info/subgroup/layer/kind on nodes). For those,
 * call `loadGraph()` directly. Sibling consumers in scripts/generate-*.mjs
 * that read .edges/.meta MUST keep using loadGraph().
 *
 * FRESHNESS: sidecar carries `sourceMtimeMs` + `sourceSize` of the graph at
 * generation time. We invalidate when the graph file's current stat differs
 * (mtime OR size) — same invariant loadGraph uses. This is conservative —
 * a non-content rewrite that preserves mtime+size cannot be detected; we
 * accept that exact failure mode for the 170× win on the common path.
 *
 * ATOMIC WRITE: temp file + rename so a concurrent reader never sees a
 * partial JSON. Failure to write is non-fatal — the cache is a perf
 * optimization, not a correctness requirement.
 *
 * TOCTOU HARDENING: stat is captured BEFORE the full parse (mirrors loadGraph
 * line 132-137 pattern). On write we re-stat and abort the rename if the
 * graph file changed between read-start and write-start — prevents recording
 * a newer mtime against the older parsed nodes. Concurrent writer races on
 * rename are accepted as a small staleness window; next hook fire self-heals.
 *
 * Knobs:
 *   PRISM_VIZ_FIND_CACHE_DISABLE=1  → bypass + do not populate
 *   PRISM_VIZ_FIND_CACHE_PATH=<p>   → override sidecar path (read at call time)
 *
 * @param {object} [opts]
 * @param {boolean} [opts.fresh=false] - bypass sidecar entirely; do not write.
 * @returns {{nodes: Array, stale?:boolean, cold?:boolean}} `nodes` is always
 *          present; `stale`/`cold` flag the serve-stale fallback. See RETURN
 *          SHAPE above.
 */

// Read at CALL time, not module-eval, so tests/callers can toggle per-invocation
// (mirrors `cacheDisabled()` / `ttlMs()` pattern on lines 53-64). Module-scope
// caching of the path would freeze whatever value process.env had when the
// module was first imported — a real footgun for sequential test cases.
function findCachePath() {
  return process.env.PRISM_VIZ_FIND_CACHE_PATH
    || path.join(ROOT, "state", "shared", "system-viz", "find-cache.json");
}

function findCacheDisabled() {
  return process.env.PRISM_VIZ_FIND_CACHE_DISABLE === "1";
}

// Fields findInGraph() actually inspects (see line 162-165). Keep this in
// lockstep with that filter — adding a search field there without adding it
// here would silently degrade find quality on cache-hit paths.
const FIND_FIELDS = ["label", "id", "info", "subgroup", "layer", "kind"];

function projectForFind(graph) {
  if (!graph || !Array.isArray(graph.nodes)) {
    throw new Error(`projectForFind: graph.nodes missing or not an array`);
  }
  const nodes = new Array(graph.nodes.length);
  for (let i = 0; i < graph.nodes.length; i++) {
    const n = graph.nodes[i];
    const slim = {};
    for (const f of FIND_FIELDS) if (n[f] !== undefined) slim[f] = n[f];
    // Brain-coverage: a STRUCTURAL count of wiki+memory docs backing this node
    // (NOT the doc content — content injection is alpha's lane; a count is
    // sierra-substrate per the seam). Set only when >0 so the ~99% undocumented
    // nodes add zero bytes. Lets `find` surface which hits are documented
    // (context-retention routing) without a graph load. NOT in FIND_FIELDS:
    // it's returned metadata, not a searched field, so findInGraph is unchanged.
    const k = n.knowledge;
    if (k) {
      const nc = (Array.isArray(k.wikiEntries) ? k.wikiEntries.length : 0)
               + (Array.isArray(k.memoryEntries) ? k.memoryEntries.length : 0);
      if (nc > 0) slim.noteCount = nc;
    }
    nodes[i] = slim;
  }
  return nodes;
}

function readSidecarIfFresh() {
  const cachePath = findCachePath();
  let sidecarRaw;
  try { sidecarRaw = fs.readFileSync(cachePath, "utf8"); }
  catch { return null; }
  let sidecar;
  try { sidecar = JSON.parse(sidecarRaw); }
  catch { return null; } // corrupt sidecar — fall through silently
  if (!sidecar || !Array.isArray(sidecar.nodes)
      || typeof sidecar.sourceMtimeMs !== "number"
      || typeof sidecar.sourceSize !== "number") {
    return null; // schema mismatch — fall through
  }
  let st;
  try { st = fs.statSync(graphPath()); }
  catch { return null; } // graph missing — let loadGraph throw the canonical error
  if (st.mtimeMs !== sidecar.sourceMtimeMs || st.size !== sidecar.sourceSize) {
    return null; // stale — graph regenerated since sidecar was written
  }
  return sidecar;
}

function writeSidecarAtomic(graph, sourceStat) {
  const cachePath = findCachePath();
  // TOCTOU re-check: if graph mtime/size moved between read-start and write,
  // the parsed nodes are stale-relative-to-current-disk. Abort to avoid
  // recording a fresh stat against stale nodes (would make readSidecarIfFresh
  // serve a false-hit on next call). Lower-cost than full re-parse.
  try {
    const nowStat = fs.statSync(graphPath());
    if (nowStat.mtimeMs !== sourceStat.mtimeMs || nowStat.size !== sourceStat.size) {
      return; // graph changed during our parse window — next call self-heals
    }
  } catch { return; /* graph vanished — don't write a stale sidecar */ }

  let tmpPath;
  try {
    // mkdir is idempotent with recursive — required for fresh checkouts where
    // state/shared/system-viz/ may not exist yet. WITHOUT this, the first
    // write ENOENT-throws, the catch swallows it, and EVERY subsequent
    // subprocess pays the full cold-parse forever — the exact failure mode
    // this whole feature exists to prevent (P0 from per-file scrutiny).
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const sidecar = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sourceMtimeMs: sourceStat.mtimeMs,
      sourceSize: sourceStat.size,
      nodes: projectForFind(graph),
    };
    tmpPath = cachePath + ".tmp-" + process.pid + "-" + Date.now();
    fs.writeFileSync(tmpPath, JSON.stringify(sidecar), "utf8");
    fs.renameSync(tmpPath, cachePath);
  } catch {
    // Best-effort temp-file cleanup so the sidecar dir doesn't accumulate
    // litter over thousands of failed writes (P2 from per-file scrutiny).
    if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch { /* ignore */ } }
  }
}

// ---------------------------------------------------------------------------
// SERVE-STALE-THEN-ASYNC-HEAL fallback support (2026-06-09 durable OOM fix).
// See the CONTRACT AMENDMENT in the file header. These three helpers exist so
// loadFindCache's stale/absent fallback NEVER calls loadGraph() in the hook hot
// path (which OOMs on the ~643MB graph). They are exposed via __test for
// hermetic DI/coverage but are NOT part of the public contract.
// ---------------------------------------------------------------------------

// Lockfile path for the detached-regen debounce. Lives beside the sidecar so a
// custom PRISM_VIZ_FIND_CACHE_PATH keeps lock + sidecar co-located (tests point
// both at a temp dir via the env override).
function regenLockPath() {
  return path.join(path.dirname(findCachePath()), ".find-cache-regen.lock");
}

// Debounce window: 26 concurrent fleet chats hitting a stale/absent sidecar must
// not all spawn a 24GB-heap regen at once. If a lock file's mtime is younger
// than this window, a regen is presumed in-flight (or just finished) and we skip.
const REGEN_DEBOUNCE_MS = 60_000;

/**
 * Read + JSON.parse the sidecar WITHOUT any freshness gate. Returns the parsed
 * nodes array when the file exists and carries a valid `nodes` array, else null
 * (absent / corrupt / schema-mismatch). Used ONLY by the serve-stale fallback to
 * disambiguate "stale sidecar present" (serve its nodes) from "cold, no sidecar"
 * (return empty). NEVER touches the graph. Fail-soft: any error -> null.
 */
function readSidecarNodesUnchecked() {
  let raw;
  try { raw = fs.readFileSync(findCachePath(), "utf8"); }
  catch { return null; } // absent / unreadable -> cold
  let sidecar;
  try { sidecar = JSON.parse(raw); }
  catch { return null; } // corrupt -> treat as cold (cannot serve garbage)
  if (!sidecar || !Array.isArray(sidecar.nodes)) return null;
  return sidecar.nodes;
}

/**
 * Spawn `node scripts/regen-find-cache.mjs` DETACHED + DEBOUNCED so the next
 * loadFindCache call self-heals to a fresh sidecar. The regenerator self-re-execs
 * with a 24GB heap (the ONLY OOM-safe rebuild path), so it can NEVER run in the
 * hook hot path -- this fire-and-forget spawn is the bridge.
 *
 * DEBOUNCE: a lockfile whose mtime is < REGEN_DEBOUNCE_MS old means a regen is
 * presumed in-flight; we skip spawning. The lock mtime is refreshed (touched)
 * immediately before each real spawn so the window slides forward.
 *
 * FAIL-SAFE: every step is wrapped -- a spawn/lock failure must NEVER throw into
 * loadFindCache (a perf-heal failure must not break SEARCH). Returns true when a
 * spawn was issued, false when debounced or it fail-soft no-op'd.
 *
 * DI: `now` + `spawnFn` are injectable for hermetic tests. Defaults are the real
 * Date.now and node:child_process.spawn. We do NOT import regen-find-cache (that
 * would self-re-exec/heap-bump IN-PROCESS); we SPAWN it as a subprocess.
 */
function spawnDebouncedRegen({ now = Date.now, spawnFn = spawn } = {}) {
  const lockPath = regenLockPath();
  // Debounce: skip if a recent lock exists. The lock STORES its creation
  // timestamp as its file CONTENT (the `now()` value at write time) and we
  // compare against that stored stamp -- NOT the filesystem mtime. This keeps
  // the debounce clock-consistent with whatever `now` is in use (DI-injectable
  // clock in tests; Date.now in production), and is immune to mtime granularity
  // / NTFS sub-ms quirks. Fall back to the fs mtime only if the stored stamp is
  // missing/unparseable (e.g. a lock from an older build).
  try {
    let stamp = NaN;
    try { stamp = Number(fs.readFileSync(lockPath, "utf8").trim()); } catch { stamp = NaN; }
    if (!Number.isFinite(stamp)) {
      try { stamp = fs.statSync(lockPath).mtimeMs; } catch { stamp = NaN; }
    }
    if (Number.isFinite(stamp) && now() - stamp < REGEN_DEBOUNCE_MS) {
      return false; // regen presumed in-flight
    }
  } catch { /* no lock yet -> proceed to spawn */ }

  // Refresh / create the lock BEFORE spawning so concurrent callers in this same
  // window debounce off it even if the child is slow to start. The content is the
  // authoritative debounce timestamp (see above). Best-effort.
  try {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.writeFileSync(lockPath, String(now()), "utf8");
  } catch { /* lock write failed -> still attempt the spawn below */ }

  try {
    const regenScript = path.join(ROOT, "scripts", "regen-find-cache.mjs");
    const child = spawnFn(process.execPath, [regenScript], {
      detached: true, windowsHide: true,
      stdio: "ignore",
      // Preserve env so the child honors the same PRISM_VIZ_FIND_CACHE_PATH /
      // PRISM_VIZ_GRAPH_PATH the parent is using (critical for tests + custom paths).
      env: process.env,
    });
    if (child && typeof child.unref === "function") child.unref();
    return true;
  } catch {
    return false; // spawn failed -> fail-soft; SEARCH still returns its (stale/empty) result
  }
}

export function loadFindCache(
  { fresh = false } = {},
  // DI seams (hermetic tests only; default to real impls -- existing call sites
  // pass no second arg and get production behavior). _readSidecarFresh +
  // _readSidecarNodes let a test inject fresh/stale/cold sidecar states without
  // real disk; _spawn + _now drive the detached-regen debounce; _loadGraph is
  // injected ONLY to PROVE the fallback never calls it (a throwing loadGraph
  // in the test fails loud if the hot path ever reaches it).
  {
    _readSidecarFresh = readSidecarIfFresh,
    _readSidecarNodes = readSidecarNodesUnchecked,
    _spawn = spawn,
    _now = Date.now,
    _loadGraph = loadGraph,
  } = {}
) {
  if (!fresh && !findCacheDisabled()) {
    const sidecar = _readSidecarFresh();
    if (sidecar) return { nodes: sidecar.nodes }; // FRESH HIT -- byte-for-byte unchanged
  }

  // -------------------------------------------------------------------------
  // STALE / ABSENT FALLBACK (the durable OOM fix -- NEVER loadGraph() here).
  // The legacy fallthrough materialized the ~643MB graph -> OOM in the hook
  // budget. Serve-stale-then-async-heal instead. This branch is taken on the
  // normal hook path (NOT fresh, NOT disabled) when the sidecar is stale/absent.
  // -------------------------------------------------------------------------
  if (!fresh && !findCacheDisabled()) {
    const staleNodes = _readSidecarNodes();
    // Trigger a detached, debounced regen so the NEXT call self-heals. Fail-safe.
    spawnDebouncedRegen({ now: _now, spawnFn: _spawn });
    if (Array.isArray(staleNodes)) {
      // STALE: a sidecar file exists -- serve its (slightly-stale) nodes. ~99%
      // accurate for SEARCH, and infinitely better than an OOM-dead hook.
      return { nodes: staleNodes, stale: true };
    }
    // COLD: no usable sidecar at all. Return fail-soft empty THIS call; the
    // regen we just kicked off makes the next call fresh. findInGraph over an
    // empty nodes array returns [] -- the caller (system-viz-query find) renders
    // "Found 0 node(s)" rather than crashing.
    return { nodes: [], stale: true, cold: true };
  }

  // -------------------------------------------------------------------------
  // EXPLICIT-OPT-IN PATH: fresh:true or PRISM_VIZ_FIND_CACHE_DISABLE=1. This is
  // NOT the hook hot path -- it's the offline regenerator (regenFindCache calls
  // loadGraph({fresh:true})) and the disable knob. Preserve the original full
  // parse + repopulate exactly. Stat BEFORE the (slow) parse so
  // writeSidecarAtomic's TOCTOU re-check has a stable baseline (mirrors
  // loadGraph's own pattern).
  // -------------------------------------------------------------------------
  let st;
  try { st = fs.statSync(graphPath()); }
  catch { st = null; }
  const graph = _loadGraph({ fresh });
  if (!findCacheDisabled() && !fresh && st) {
    writeSidecarAtomic(graph, st);
  }
  // SYMMETRIC RETURN: project to the same shape as the fresh-hit ({nodes:[...]}).
  return { nodes: projectForFind(graph) };
}

/**
 * regenFindCache — OFFLINE (proactive) generator for the find-cache sidecar.
 *
 * PROBLEM SOLVED: the lazy path (loadFindCache cache-miss) only rebuilds
 * find-cache.json when a hook subprocess happens to call `find` against a
 * stale/absent sidecar — and that rebuild pays the FULL graph cold-parse
 * INSIDE the hook's ~1500ms budget (viz-first-redirect.mjs), so it times out
 * and silently fails the node-context inject. Nothing rebuilt the sidecar
 * offline, so the first `find` after every graph regen ate that cold parse.
 *
 * STRATEGY: do the same stat → parse → project → atomic-write EAGERLY (wired
 * as a regen-viz post-merge step), so the sidecar is always fresh after a
 * regen and no hook subprocess ever pays the cold parse.
 *
 * REUSE: calls the SAME writeSidecarAtomic primitive as the lazy path, so the
 * emitted sidecar is byte-format-identical (schemaVersion 1) — a pure drop-in
 * producer, no contract change, no second writer schema to keep in lockstep.
 * The graph read is via loadGraph() (OOM-safe streaming fallback), never a raw
 * JSON.parse of the >512MB graph string.
 *
 * FAIL-LOUD: returns {ok:false, reason} rather than throwing on the expected
 * non-fatal cases (graph missing, cache disabled, TOCTOU write-abort) so the
 * regen-viz caller can log a one-liner and continue; loadGraph's own canonical
 * "Cannot read/parse graph" error still propagates for a genuinely broken graph.
 *
 * @returns {{ok:boolean, path:string, nodeCount:number, bytes:number,
 *            sourceMtimeMs:(number|null), reason?:string}}
 */
export function regenFindCache({ force = false } = {}) {
  const cachePath = findCachePath();
  if (findCacheDisabled()) {
    return { ok: false, path: cachePath, nodeCount: 0, bytes: 0, sourceMtimeMs: null, reason: "cache-disabled" };
  }
  let st;
  try { st = fs.statSync(graphPath()); }
  catch { return { ok: false, path: cachePath, nodeCount: 0, bytes: 0, sourceMtimeMs: null, reason: "graph-missing" }; }
  // FAST PATH (idempotence): if the sidecar is ALREADY fresh vs the current
  // graph, skip the expensive ~685MB parse entirely. Makes regenFindCache cheap
  // to call defensively/redundantly — e.g. a hook self-healing on a `cache-status`
  // STALE verdict, or a double-invocation — a no-op when fresh, a full regen when
  // stale. Reuses the lazy path's exact freshness gate (readSidecarIfFresh), so
  // "fresh" means the same thing here as it does to loadFindCache's hit path.
  // `force` bypasses the fast-path to REDEPLOY a changed projection (e.g. the
  // new noteCount field): the existing cache is mtime-fresh, so without --force
  // the fast-path would skip the rebuild and the new field would never appear.
  // No cold-parse window — writeSidecarAtomic's tmp+rename keeps the old cache
  // readable until the new one atomically swaps in.
  if (!force) {
    const existing = readSidecarIfFresh();
    if (existing) {
      let bytes = 0;
      try { bytes = fs.statSync(cachePath).size; } catch { /* size is advisory */ }
      return { ok: true, path: cachePath, nodeCount: existing.nodes.length, bytes, sourceMtimeMs: st.mtimeMs, reason: "already-fresh" };
    }
  }
  // fresh:true forces a real parse (ignore any in-process _cache); OOM-safe.
  const graph = loadGraph({ fresh: true });
  // Same atomic+TOCTOU+mkdir writer the lazy path uses — do NOT re-implement.
  writeSidecarAtomic(graph, st);
  // writeSidecarAtomic is best-effort/void; confirm the write actually landed
  // AND is fresh (TOCTOU could have aborted it if the graph moved mid-parse).
  const fresh = readSidecarIfFresh();
  if (!fresh) {
    return { ok: false, path: cachePath, nodeCount: graph.nodes.length, bytes: 0, sourceMtimeMs: st.mtimeMs, reason: "write-aborted-or-stale" };
  }
  let bytes = 0;
  try { bytes = fs.statSync(cachePath).size; } catch { /* size is advisory */ }
  return { ok: true, path: cachePath, nodeCount: fresh.nodes.length, bytes, sourceMtimeMs: st.mtimeMs };
}

// fd-read the first 512 bytes of a sidecar and judge its freshness vs the graph
// stat. The freshness fields (sourceMtimeMs + sourceSize/sourceSizeBytes) live
// in the first ~150 bytes — BEFORE the huge `nodes` array — so we never parse
// the 56MB find-cache or 194MB index. The mtime regex is FRACTION-AWARE: NTFS
// mtimeMs carries a sub-ms fraction and a floored capture mis-reports a fresh
// sidecar as stale (the false-STALE bug caught 2026-06-01). `mode` selects the
// invariant to MIRROR the sidecar's actual consumer:
//   "exact" → find-cache readSidecarIfFresh (mtimeMs === && size ===)
//   "gte"   → graph-index master-index loadGraph gate (sourceMtimeMs >= graph)
function sidecarHead(p, g, mode) {
  // SIBLING: the same fd-head + fraction-aware-regex technique lives in
  // state/shared/system-viz/_server.cjs buildMasterIndexHealth (index only) —
  // keep the two in lockstep if the sidecar freshness field names ever change.
  let buf, n = 0;
  try {
    const fd = fs.openSync(p, "r");
    try { buf = Buffer.alloc(512); n = fs.readSync(fd, buf, 0, 512, 0); }
    finally { fs.closeSync(fd); }
  } catch { return { path: p, exists: false, fresh: false, reason: "missing" }; }
  const head = buf.toString("utf8", 0, n); // bound to bytes actually read (matches _server.cjs sibling)
  const mM = head.match(/"sourceMtimeMs"\s*:\s*(\d+(?:\.\d+)?)/);
  const sM = head.match(/"sourceSize(?:Bytes)?"\s*:\s*(\d+)/);
  if (!mM) return { path: p, exists: true, fresh: false, reason: "no-sourceMtimeMs-in-head" };
  const sourceMtimeMs = Number(mM[1]);
  const sourceSize = sM ? Number(sM[1]) : null;
  if (!g.exists) return { path: p, exists: true, sourceMtimeMs, sourceSize, fresh: false, reason: "graph-missing" };
  let fresh, reason;
  if (mode === "exact") {
    fresh = sourceMtimeMs === g.mtimeMs && sourceSize === g.size;
    reason = fresh ? "fresh" : "stale (mtime/size != live graph)";
  } else { // "gte"
    fresh = sourceMtimeMs >= g.mtimeMs;
    reason = fresh ? "fresh" : "stale (sidecar older than live graph)";
  }
  return { path: p, exists: true, sourceMtimeMs, sourceSize, fresh, reason };
}

/**
 * sidecarStatus — freshness report for the two search sidecars vs the live graph.
 *
 * STAT-ONLY: fd-reads 512 bytes of each sidecar (see sidecarHead) — NEVER parses
 * the 56MB find-cache or 194MB index, and NEVER loads the 695MB graph. Safe in a
 * 2-5s hook / CLI context. Each sidecar is judged by ITS OWN consumer's gate so
 * the report cannot lie (find-cache: exact; graph-index: >= graph mtime).
 * Fail-soft: a missing file → {exists:false, fresh:false}.
 *
 * @returns {{graph:object, findCache:object, index:object}}
 */
export function sidecarStatus() {
  const gp = graphPath();
  let g = { path: gp, exists: false };
  try {
    const st = fs.statSync(gp);
    g = { path: gp, exists: true, mtimeMs: st.mtimeMs, size: st.size };
  } catch { /* graph missing — no sidecar can be fresh */ }
  const fcPath = findCachePath();
  const idxPath = path.join(path.dirname(fcPath), "system-graph-index.json");
  return {
    graph: g,
    findCache: sidecarHead(fcPath, g, "exact"),
    index: sidecarHead(idxPath, g, "gte"),
  };
}

/** Test-only white-box seam. NOT part of the public contract. */
export const __test = {
  readAndParse,
  readGraphMeta,
  extractTopLevelObject,
  extractTopLevelScalar,
  graphPath,
  defaultGraphPath: () => DEFAULT_GRAPH,
  findCachePath,
  resetCache: () => { _cache = null; },
  peekCache: () => (_cache ? { ..._cache, graph: undefined } : null),
  projectForFind,
  findFields: () => [...FIND_FIELDS],
  readSidecarIfFresh,
  writeSidecarAtomic,
  // SERVE-STALE fallback seams (2026-06-09 durable OOM fix).
  readSidecarNodesUnchecked,
  spawnDebouncedRegen,
  regenLockPath,
  regenDebounceMs: () => REGEN_DEBOUNCE_MS,
};
