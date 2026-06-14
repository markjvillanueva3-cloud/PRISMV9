#!/usr/bin/env node
/**
 * build-graph-index.mjs — offline inverted-index sidecar generator for
 * PRISM master-index search.
 *
 * UNIT: U-MASTER-INDEX-SIDECAR (DEV-TOOL-CONFLICT-AUDIT-2026-05-17)
 *
 * WHY: `master-index-search-lib.mjs` `loadGraph()` caps graph loads at 200 MB.
 * The merged `system-graph.json` is 372 MB / 243,687 nodes, so every
 * master-index search silently degrades to the 28 MB architecture-graph
 * fallback (the JULIETT F1 path — degraded, not blind). Parsing + tokenizing
 * the full graph was MEASURED at ~138 s / 1.6 GB RSS — fatal in the
 * UserPromptSubmit hook (2-5 s timeout) but fine OFFLINE, once, at regen time.
 *
 * This generator pays the ~138 s cost offline and emits a compact
 * inverted-index sidecar that `loadGraph` rebuilds in seconds with FULL
 * 243K-node coverage.
 *
 * Sidecar → `state/shared/system-viz/system-graph-index.json`:
 *   { schemaVersion, generatedAt, sourceGraph, sourceMtimeMs,
 *     sourceSizeBytes, nodeCount, nodes:[compact], inverted:{token:[idx]} }
 *
 * Each compact node is stored in the EXACT shape `searchGraphHits` consumes
 * — `{ id, label?, layer?, status?, info?, knowledge?:{wikiEntries?,
 * memoryEntries?} }` — so File 3's loader rebuilds `{nodes,inverted}` with
 * NO node reshaping (the `knowledge.*` nesting is deliberate, not `wiki`/
 * `mem` flat keys — searchGraphHits reads `node.knowledge?.wikiEntries`).
 *
 * Postings are INTEGER INDICES into `nodes[]` (not string ids) — a large size
 * saving; `loadGraph` rebuilds `Map<token,Set<id>>` from `nodes[idx].id`.
 *
 * PARITY: imports `tokenize` from `master-index-search-lib.mjs` and
 * replicates `loadGraph`'s blob construction EXACTLY. If the blob or
 * tokenize diverges, hit-scoring drifts — `build-graph-index.test.mjs` pins
 * the parity with a regression-guard test.
 *
 * MEMORY: parsing the 372 MB graph needs ~1.5-2 GB heap. `main()` re-execs
 * itself once with `--max-old-space-size=8192` when invoked without a heap
 * flag, so a bare `node scripts/build-graph-index.mjs` is safe. Disable the
 * re-exec with `PRISM_BUILD_GRAPH_INDEX_NO_REEXEC=1`.
 *
 * CLI:  node scripts/build-graph-index.mjs [--graph <path>] [--out <path>]
 * Exit: 0 ok · 1 fail (graph missing / parse fail / no-nodes / mass-skip).
 */

import {
  writeFileSync, statSync, existsSync, renameSync, unlinkSync,
} from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tokenize } from "./lib/master-index-search-lib.mjs";
import { readGraphStreaming } from "./lib/graph-io.mjs";
import {
  buildCardOffsetIndex, writeCardOffsetIndex, offsetIndexPathsFor,
} from "./lib/node-card-offset-lib.mjs";

export const SIDECAR_SCHEMA_VERSION = "1.0.0";
export const EXIT_OK = 0;
export const EXIT_FAIL = 1;

const DEFAULT_GRAPH_PATH = "H:/prism/state/shared/system-viz/system-graph.json";
const DEFAULT_OUT_PATH = "H:/prism/state/shared/system-viz/system-graph-index.json";

// Re-exec heap target (MB) when main() is run without an explicit V8 heap flag.
const HEAP_TARGET_MB = 8192;

// Tokenize options that EXACTLY match loadGraph's per-node call — no token
// cap, no length cap (a graph node's blob must be indexed in full).
const FULL_TOKENIZE_OPTS = {
  maxTokens: Number.MAX_SAFE_INTEGER,
  maxLen: Number.MAX_SAFE_INTEGER,
};

/**
 * MIRRORS `entryName` in master-index-search-lib.mjs (module-private there).
 * Trivial + stable; `build-graph-index.test.mjs`'s tokenize-parity test
 * regression-guards any drift between this copy and the lib's blob output.
 *
 * @param {*} entry
 * @returns {string}
 */
function entryName(entry) {
  try {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") {
      if (typeof entry.name === "string") return entry.name;
      if (typeof entry.path === "string") return entry.path;
    }
  } catch { /* fall through */ }
  return "";
}

/** Return v only when it is a string, else undefined (drops the key on write). */
function pickStr(v) {
  return typeof v === "string" ? v : undefined;
}

/**
 * Build the sidecar object from an already-parsed graph object. Pure — no I/O.
 *
 * Per-node posture mirrors `loadGraph`: null nodes + non-string ids are
 * skipped (they never participate in the inverted index); a single
 * malformed node is skipped, never aborts the whole build.
 *
 * @param {object} graphObj  — parsed system-graph.json
 * @param {object} [meta]    — { sourceGraph, sourceMtimeMs, sourceSizeBytes }
 * @returns {object} sidecar  (nodeCount === nodes.length, i.e. INDEXED nodes
 *                             post-skip — NOT the raw graph node count)
 */
export function buildGraphIndex(graphObj, meta = {}) {
  if (!graphObj || !Array.isArray(graphObj.nodes)) {
    throw new Error("buildGraphIndex: graph has no nodes[] array");
  }
  const nodes = [];
  // Null-proto map so a token literally named "__proto__" / "constructor"
  // becomes a normal own property (no prototype pollution). The loader MUST
  // read this back with Object.entries/keys, never `inverted[tok]`.
  const inverted = Object.create(null);

  for (const n of graphObj.nodes) {
    if (!n || typeof n.id !== "string") continue;
    try {
      const wikiArr = Array.isArray(n.knowledge?.wikiEntries) ? n.knowledge.wikiEntries : [];
      const memArr = Array.isArray(n.knowledge?.memoryEntries) ? n.knowledge.memoryEntries : [];
      const wikiNames = wikiArr.map(entryName);
      const memNames = memArr.map(entryName);
      // EXACT loadGraph blob: id + label + info + wiki names + mem names.
      const blob = `${n.id} ${n.label ?? ""} ${n.info ?? ""} `
        + `${wikiNames.join(" ")} ${memNames.join(" ")}`;

      // Compact node — only the fields searchGraphHits scores on / emits,
      // stored in searchGraphHits' OWN shape (`knowledge.wikiEntries` /
      // `knowledge.memoryEntries`) so File 3 needs no reshape.
      // `info` is string-only: a non-string `info` is still tokenized into
      // the blob above (parity preserved in `inverted`), it is only dropped
      // from per-node W_INFO re-scoring — and the legacy searchGraphHits
      // would itself throw on a non-string `info.toLowerCase()`, so the
      // sidecar path is no worse (and the case does not occur in practice).
      const compact = { id: n.id };
      const label = pickStr(n.label); if (label) compact.label = label;
      const layer = pickStr(n.layer); if (layer) compact.layer = layer;
      const status = pickStr(n.status); if (status) compact.status = status;
      const info = pickStr(n.info); if (info) compact.info = info;
      const wiki = wikiNames.filter(Boolean);
      const mem = memNames.filter(Boolean);
      if (wiki.length || mem.length) {
        compact.knowledge = {};
        if (wiki.length) compact.knowledge.wikiEntries = wiki;
        if (mem.length) compact.knowledge.memoryEntries = mem;
      }

      // Tokenize FIRST (fully completes) — only then commit the node + its
      // postings. A throw mid-tokenize leaves nodes[]/inverted untouched for
      // this node: no posting can ever point at a missing index.
      const tokens = tokenize(blob, FULL_TOKENIZE_OPTS);
      const idx = nodes.length;
      nodes.push(compact);
      for (const tok of tokens) {
        let bucket = inverted[tok];
        if (!bucket) { bucket = []; inverted[tok] = bucket; }
        bucket.push(idx);
      }
    } catch {
      // Per-node failure — skip and continue (same total-load semantics as
      // loadGraph: a few skipped nodes is acceptable; aborting is not).
      continue;
    }
  }

  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceGraph: meta.sourceGraph ?? "system-graph.json",
    sourceMtimeMs: Number(meta.sourceMtimeMs) || 0,
    sourceSizeBytes: Number(meta.sourceSizeBytes) || 0,
    nodeCount: nodes.length,
    nodes,
    inverted,
  };
}

/**
 * Atomically write the sidecar (temp file + rename on the same volume).
 * Compact JSON — pretty-print blows V8's ~512 MB max-string cap on a graph
 * this large (the documented seed-ghost-from-unwired regression class).
 *
 * @param {object} sidecar
 * @param {string} outPath
 * @returns {number} bytes written
 */
export function writeSidecar(sidecar, outPath) {
  const json = JSON.stringify(sidecar);
  const tmp = `${outPath}.tmp.${process.pid}`;
  try {
    writeFileSync(tmp, json);
    renameSync(tmp, outPath);
  } catch (e) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* best effort */ }
    throw e;
  }
  return Buffer.byteLength(json);
}

/**
 * Fail-soft breadcrumb of the LAST index-build outcome, co-located with the
 * sidecar (`.last-index-build.json`). Lets the viz dashboard
 * (buildMasterIndexHealth in _server.cjs) surface a FAILED rebuild distinctly
 * from an old-graph staleness — the cause changes the remedy (OOM vs schema
 * drift vs disk). Previously a non-fatal rebuild failure inside regen-viz
 * vanished with only a console.error; this makes it observable (R12). Never
 * throws: a breadcrumb write must not mask the real build result.
 * Basename-swap keeps it in the sidecar's own dir for any --out override.
 */
function writeBuildBreadcrumb(outPath, payload) {
  try {
    const bcPath = String(outPath).replace(/[^/\\]+$/, ".last-index-build.json");
    const tmp = `${bcPath}.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify(payload));
    renameSync(tmp, bcPath);
  } catch { /* best-effort observability */ }
}

/** Resolve the mass-skip floor ratio (knob: PRISM_BUILD_GRAPH_INDEX_MIN_RATIO). */
function minIndexedRatio() {
  const raw = process.env.PRISM_BUILD_GRAPH_INDEX_MIN_RATIO;
  if (raw != null && raw !== "" && Number.isFinite(Number(raw))) return Number(raw);
  return 0.5;
}

/**
 * Read the graph, build the sidecar, write it. Returns a summary object.
 * Throws (fail-loud) on graph-missing / parse-fail / no-nodes / 0-indexed /
 * mass-skip (indexed node count collapsed below the floor — schema drift).
 *
 * @param {object} [opts]  — { graphPath, outPath }
 * @returns {object} summary
 */
export function generate({ graphPath = DEFAULT_GRAPH_PATH, outPath = DEFAULT_OUT_PATH } = {}) {
  if (!existsSync(graphPath)) throw new Error(`graph not found: ${graphPath}`);
  // ORDERING IS LOAD-BEARING: stat (mtime) is captured BEFORE the read. If the
  // graph is rewritten between stat and read, the sidecar carries an mtime
  // OLDER than its content — File 3's staleness gate then treats it as stale
  // and falls back to legacy (safe). Moving the stat AFTER the read would
  // record an mtime NEWER than the content and invert this into a real bug.
  const stat = statSync(graphPath);
  const t0 = Date.now();

  let graphObj;
  try {
    // Streaming read — bypasses V8 ~512MB string-length ceiling. See scripts/lib/graph-io.mjs.
    graphObj = readGraphStreaming(graphPath);
  } catch (e) {
    throw new Error(`graph parse failed: ${e.message}`);
  }
  if (!graphObj || !Array.isArray(graphObj.nodes)) {
    throw new Error("graph has no nodes[] array");
  }
  const rawCount = graphObj.nodes.length;

  const sidecar = buildGraphIndex(graphObj, {
    sourceGraph: graphPath.replace(/\\/g, "/").split("/").pop() || "system-graph.json",
    sourceMtimeMs: stat.mtimeMs,
    sourceSizeBytes: stat.size,
  });
  const indexed = sidecar.nodeCount;
  if (indexed === 0) {
    throw new Error("0 nodes indexed — refusing to write an empty sidecar");
  }
  // Mass-skip guard: a healthy graph skips <1% of nodes (null / non-string
  // id / per-node parse failure). A collapse below the floor means schema
  // drift upstream — refuse to publish a near-empty sidecar that would
  // silently gut master-index recall. Knob: PRISM_BUILD_GRAPH_INDEX_MIN_RATIO.
  const minRatio = minIndexedRatio();
  if (rawCount > 0 && indexed < rawCount * minRatio) {
    throw new Error(
      `only ${indexed}/${rawCount} nodes indexed (< ${(minRatio * 100).toFixed(0)}% floor) `
      + "— likely graph schema drift; refusing to write a degraded sidecar",
    );
  }

  const bytes = writeSidecar(sidecar, outPath);

  // Also emit the seekable node-card offset index (CHEAP-NODE-ACCESS-MS0 ·
  // U-NODECARD-OFFSET-INDEX) from the SAME in-memory compact nodes — zero extra
  // graph read. FAIL-SOFT: a card-index failure must NOT fail the master-index
  // build (the offset pair is a token-cheap READ optimization, not load-bearing
  // for search). It inherits the GRAPH stamps so its freshness tracks the graph
  // exactly like the main sidecar.
  let offsetIndex = null;
  try {
    const built = buildCardOffsetIndex(sidecar.nodes);
    const { jsonlPath, offsetsPath } = offsetIndexPathsFor(outPath);
    const oi = writeCardOffsetIndex(built, {
      jsonlPath, offsetsPath,
      meta: {
        sourceGraph: sidecar.sourceGraph,
        sourceMtimeMs: sidecar.sourceMtimeMs,
        sourceSizeBytes: sidecar.sourceSizeBytes,
      },
    });
    offsetIndex = { count: oi.count, jsonlBytes: oi.jsonlBytes, offsetsBytes: oi.offsetsBytes };
  } catch (e) {
    process.stderr.write(`[build-graph-index] ⚠ card offset index skipped: ${String(e && e.message || e)}\n`);
  }

  return {
    graphPath,
    outPath,
    rawNodeCount: rawCount,
    nodeCount: indexed,
    skipped: rawCount - indexed,
    tokenCount: Object.keys(sidecar.inverted).length,
    sidecarBytes: bytes,
    offsetIndex,
    elapsedMs: Date.now() - t0,
  };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--graph") out.graphPath = argv[++i];
    else if (argv[i] === "--out") out.outPath = argv[++i];
  }
  return out;
}

/**
 * Re-exec self with a raised V8 heap when main() was invoked without a heap
 * flag — parsing the 372 MB graph needs ~1.5-2 GB and the default old-space
 * can fall short. When a re-exec is needed this never returns (it calls
 * process.exit with the child's status); otherwise it is a no-op.
 */
function reExecWithHeapIfNeeded() {
  if (process.env.PRISM_BUILD_GRAPH_INDEX_NO_REEXEC === "1") return;
  const hasHeapFlag = process.execArgv.some((a) => /^--max[-_]old[-_]space[-_]size=/.test(a));
  if (hasHeapFlag) return;
  const self = fileURLToPath(import.meta.url);
  const r = spawnSync(
    process.execPath,
    [`--max-old-space-size=${HEAP_TARGET_MB}`, self, ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, PRISM_BUILD_GRAPH_INDEX_NO_REEXEC: "1" } },
  );
  if (r.error) {
    process.stderr.write(`[build-graph-index] ✗ heap re-exec failed: ${r.error.message}\n`);
    process.exit(EXIT_FAIL);
  }
  process.exit(r.status == null ? EXIT_FAIL : r.status);
}

function main() {
  reExecWithHeapIfNeeded();
  const args = parseArgs(process.argv.slice(2));
  try {
    const r = generate(args);
    writeBuildBreadcrumb(args.outPath || DEFAULT_OUT_PATH, {
      ts: new Date().toISOString(), ok: true,
      nodeCount: r.nodeCount, rawNodeCount: r.rawNodeCount, skipped: r.skipped,
      sidecarBytes: r.sidecarBytes, elapsedMs: r.elapsedMs,
    });
    process.stdout.write(
      `[build-graph-index] ✓ ${r.nodeCount}/${r.rawNodeCount} nodes indexed `
      + `(${r.skipped} skipped) · ${r.tokenCount} tokens · `
      + `${(r.sidecarBytes / 1048576).toFixed(1)} MB · `
      + `${(r.elapsedMs / 1000).toFixed(1)}s → ${r.outPath}\n`,
    );
    if (r.offsetIndex) {
      process.stdout.write(
        `[build-graph-index] ✓ card offset index: ${r.offsetIndex.count} cards · `
        + `jsonl ${(r.offsetIndex.jsonlBytes / 1048576).toFixed(1)} MB · `
        + `offsets ${(r.offsetIndex.offsetsBytes / 1048576).toFixed(1)} MB\n`,
      );
    }
    process.exit(EXIT_OK);
  } catch (e) {
    writeBuildBreadcrumb(args.outPath || DEFAULT_OUT_PATH, {
      ts: new Date().toISOString(), ok: false, error: String(e && e.message || e).slice(0, 500),
    });
    process.stderr.write(`[build-graph-index] ✗ ${e.message}\n`);
    process.exit(EXIT_FAIL);
  }
}

// Run as a script only when invoked directly (not on import for tests).
const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath && import.meta.url === invokedPath) {
  main();
}
