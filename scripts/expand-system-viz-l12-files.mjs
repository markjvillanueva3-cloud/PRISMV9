#!/usr/bin/env node
/**
 * expand-system-viz-l12-files.mjs — SYSTEM-VIZ-FS-COVERAGE-MS0/U-LAYER-EXPAND
 *
 * Augments state/shared/system-viz/system-graph.json with raw-filesystem
 * coverage of the H: drive. Adds two new layers:
 *
 *   L11 (file bundles)  — one node per "bundled" directory (>= bundle-threshold
 *                         files OR mostly-binary content). Carries kids + ext
 *                         breakdown so the dir is *represented* without
 *                         exploding three.js with N-thousand individual dots.
 *
 *   L12 (canonical fs)  — one node per *canonical* (worktree-deduplicated) file
 *                         path. H:/prism + H:/prism-* (15+ worktrees) share
 *                         most src files; this collapses them to one node with
 *                         multi-source edges showing each worktree that
 *                         contains a copy.
 *
 * Coverage metric:
 *   filesRepresented = filesAsL12Nodes + filesInL11Bundles
 *   coverageRatio    = filesRepresented / filesWalked
 *   /loop exit when ratio >= 1.0 for every H: top-level domain.
 *
 * Invariants:
 *   - Idempotent: re-running with the same --root overwrites prior L11/L12 nodes
 *     scoped to that root, never duplicates them. Other roots' nodes preserved.
 *   - Atomic: writes to system-graph.json.tmp then renames. Never leaves the
 *     graph in a half-written state.
 *   - Existing L0-L10 nodes/edges/layers are PRESERVED VERBATIM. We only add
 *     to the nodes[] and edges[] arrays and append L11+L12 layer declarations
 *     when missing.
 *   - Skip dirs: .git/objects, node_modules, __pycache__, .serena, _BUILD,
 *     dotgit-pre-rewrite-*, .cache/temp (transient task output).
 *
 * Usage:
 *   node scripts/expand-system-viz-l12-files.mjs --root H:/prism --dry-run
 *   node scripts/expand-system-viz-l12-files.mjs --root H:/prism --apply
 *   node scripts/expand-system-viz-l12-files.mjs --root H:/.claude --apply
 *
 * Pure-export contract (for tests):
 *   walkDir(root, opts)           → { files: [{relpath, size, ext, dir}], dirs }
 *   classifyDir(files, opts)      → "bundle" | "individual"
 *   canonicalRel(absPath, root)   → relpath with worktree prefix stripped
 *   makeFileNodeId(canonicalRel)  → "fs.file.<hash>"
 *   makeBundleNodeId(dirRel)      → "fs.bundle.<hash>"
 *   buildAugment(walked, opts)    → { nodes: [], edges: [] }   (pure)
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PRISM = path.resolve(__dirname, "..");
const GRAPH_FILE = path.join(ROOT_PRISM, "state", "shared", "system-viz", "system-graph.json");

// -- knobs (CLI-overridable) ------------------------------------------------
const DEFAULT_BUNDLE_THRESHOLD = 500;     // dir with >= N files → bundle
const DEFAULT_MAX_FILES = 500_000;        // safety cap per invocation (was 200k; H:/prism alone exceeds 200k)
// Binary-heavy bundle heuristic: a dir is bundled when binary-by-count ratio
// crosses BINARY_HEAVY_RATIO AND the dir has at least BINARY_HEAVY_MIN_FILES
// total. The minimum guards against bundling a 3-file dir that happens to be
// all-binary (too small to matter; just emit them individually).
const BINARY_HEAVY_RATIO = 0.80;
const BINARY_HEAVY_MIN_FILES = 20;
// Data-heavy bundle heuristic: dirs dominated by produced/cached data files
// (logs, state, vectors, blueprints) should bundle aggressively. These exts
// are individually low-signal in a navigation graph — the dir's existence is
// what matters. DATA_HEAVY_RATIO + min-count mirror the binary-heavy rule.
const DATA_HEAVY_EXTS = new Set([".json", ".jsonl", ".log", ".pdf", ".min", ".txt", ".csv", ".md", ".html"]);
const DATA_HEAVY_RATIO = 0.70;
const DATA_HEAVY_MIN_FILES = 30;
const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".ico", ".webp",
  ".pdf", ".zip", ".7z", ".tar", ".gz", ".bz2", ".xz", ".rar",
  ".exe", ".dll", ".so", ".dylib", ".a", ".lib", ".o", ".obj",
  ".pyc", ".pyo", ".pyd",
  ".bin", ".blob", ".dat", ".db", ".sqlite", ".sqlite3",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".webm", ".ogg",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".whl",
]);
const SKIP_DIRS = new Set([
  ".git", "node_modules", "__pycache__", ".serena", "_BUILD",
  "venv", ".venv", "env", ".env", "dist", "build", ".next",
  "coverage", ".pytest_cache", ".mypy_cache", ".vitest-cache",
]);
const SKIP_PATH_SUBSTRINGS = [
  "/.git/objects/",
  "/node_modules/",
  "/__pycache__/",
  "/.cache/temp/",
  "/dotgit-pre-rewrite-",
];

// -- pure helpers (exported for tests) --------------------------------------

/** Stable short hash of a string. 12 hex chars = 48 bits. Birthday-collision
 *  probability is ~50% at 2^24≈16M strings — i.e. the COMMENT below is the
 *  collision-point, NOT the safe point. At our target ≤500k nodes the actual
 *  per-run collision probability is ~4.4e-4 (1 in ~2,300 runs). The viz layer
 *  tolerates this (worst case: two unrelated files share one node), but if
 *  you raise the cap, bump the hash width here first. */
export function shortHash(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 12);
}

/** Path made relative to the walkRoot (forward-slashed). Returns `null` if
 *  the absPath is NOT inside walkRoot — callers must treat null as an error
 *  rather than blindly forwarding the absolute path into a node id (which
 *  the old fallthrough did). The actual worktree-canonicalization happens
 *  in `namespaceForRoot()` — it collapses every `prism-*` walkRoot into the
 *  shared namespace "prism" so files at the same in-tree path produce the
 *  same node id across all worktrees. This function exists so tests can
 *  pin the relpath behavior without spinning up an actual walk. */
export function canonicalRel(absPath, walkRoot) {
  const norm = String(absPath).replace(/\\/g, "/");
  const rootNorm = String(walkRoot).replace(/\\/g, "/").replace(/\/+$/, "");
  if (norm === rootNorm) return "";
  if (!norm.startsWith(rootNorm + "/")) return null;
  return norm.slice(rootNorm.length + 1);
}

/** Worktree-canonical namespace key for the walkRoot.
 *  - H:/prism      → "prism"
 *  - H:/prism-foo  → "prism" (worktree of main; canonical)
 *  - H:/.claude    → ".claude"
 *  - H:/Tools      → "Tools"
 *  Multiple worktrees of the prism repo all return "prism" — so their canonical
 *  files share a single L12 node, with per-worktree edges to L9 dir nodes.
 *  Non-prism roots keep their own namespace so identical filenames don't merge.
 */
export function namespaceForRoot(walkRoot) {
  const norm = String(walkRoot).replace(/\\/g, "/").replace(/\/+$/, "");
  const base = path.basename(norm);
  if (base === "prism" || /^prism-/.test(base)) return "prism";
  return base;
}

export function makeFileNodeId(namespace, canonicalRel) {
  const key = `${namespace}::${canonicalRel}`;
  return `fs.file.${shortHash(key)}`;
}

export function makeBundleNodeId(namespace, dirRel) {
  const key = `${namespace}::${dirRel}`;
  return `fs.bundle.${shortHash(key)}`;
}

export function makeSourceNodeId(walkRoot) {
  // Per-walkRoot "source" node (a worktree or a non-prism root). Edges from
  // L11/L12 nodes back to this node express "lives in this physical location".
  const norm = String(walkRoot).replace(/\\/g, "/").replace(/\/+$/, "");
  const base = path.basename(norm);
  return `fs.source.${shortHash(norm)}.${base.replace(/[^a-z0-9._-]/gi, "_").toLowerCase()}`;
}

/** Decide whether a directory should be emitted as one L11 bundle node
 *  (collapsed) or as N L12 file nodes (one per file). Heuristics:
 *    - >= bundleThreshold files in this dir alone → BUNDLE
 *    - >= 80% binary by file count → BUNDLE
 *    - dir name in BUNDLE_BY_NAME → BUNDLE (e.g. node_modules, but we already
 *      skip those above; keep this list for opt-in coarse views)
 *  Otherwise INDIVIDUAL. Pure: takes the dir's files[], returns a verdict. */
export function classifyDir(files, opts = {}) {
  const threshold = opts.bundleThreshold ?? DEFAULT_BUNDLE_THRESHOLD;
  if (!Array.isArray(files) || files.length === 0) return { mode: "individual", reason: "empty" };
  if (files.length >= threshold) return { mode: "bundle", reason: `count>=${threshold}` };
  const binCount = files.filter((f) => BINARY_EXTS.has(f.ext)).length;
  const binRatio = binCount / files.length;
  if (binRatio >= BINARY_HEAVY_RATIO && files.length >= BINARY_HEAVY_MIN_FILES) {
    return { mode: "bundle", reason: `binary-heavy ${Math.round(binRatio * 100)}%` };
  }
  // Data-heavy: caches, logs, state files, blueprints dominate the dir.
  // These are low-signal individually — the dir's existence is what matters.
  const dataCount = files.filter((f) => DATA_HEAVY_EXTS.has(f.ext)).length;
  const dataRatio = dataCount / files.length;
  if (dataRatio >= DATA_HEAVY_RATIO && files.length >= DATA_HEAVY_MIN_FILES) {
    return { mode: "bundle", reason: `data-heavy ${Math.round(dataRatio * 100)}%` };
  }
  return { mode: "individual", reason: "normal" };
}

/** Walk a directory tree. Returns:
 *    { files: [{abs, rel, dir, name, ext, size, isBinary}, ...],
 *      dirs:  Map<dirRel, files[]>,
 *      stats: { filesWalked, dirsWalked, skipped, truncated } }
 *  Synchronous (fs.readdirSync). Safety cap at maxFiles. */
export function walkDir(root, opts = {}) {
  const max = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const skipDirs = opts.skipDirs ?? SKIP_DIRS;
  const skipSubstrings = opts.skipPathSubstrings ?? SKIP_PATH_SUBSTRINGS;
  const files = [];
  const dirs = new Map();
  const stats = { filesWalked: 0, dirsWalked: 0, skipped: 0, truncated: false };
  const rootNorm = String(root).replace(/\\/g, "/").replace(/\/+$/, "");

  // Symlink-loop protection: track visited *real* paths. fs.realpathSync
  // resolves symlinks to their target; revisiting a target = loop.
  const visitedReal = new Set();

  function visit(dirAbs) {
    if (stats.truncated) return;
    // Symlink-loop guard: skip if real path already visited.
    let realPath = dirAbs;
    try { realPath = fs.realpathSync(dirAbs); } catch { /* tolerate */ }
    if (visitedReal.has(realPath)) { stats.skipped++; return; }
    visitedReal.add(realPath);

    let entries;
    try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); }
    catch { stats.skipped++; return; }
    stats.dirsWalked++;
    const dirNorm = dirAbs.replace(/\\/g, "/");
    const dirRel = dirNorm === rootNorm ? "" : dirNorm.slice(rootNorm.length + 1);
    const localFiles = [];
    let dirTruncated = false;
    for (const e of entries) {
      if (stats.truncated) { dirTruncated = true; break; }
      const abs = path.join(dirAbs, e.name);
      const absNorm = abs.replace(/\\/g, "/");
      if (skipSubstrings.some((s) => absNorm.includes(s))) { stats.skipped++; continue; }
      // Skip symlinks-to-files explicitly (avoid stat'ing targets that may
      // live on slow network drives or be broken).
      if (e.isSymbolicLink()) { stats.skipped++; continue; }
      if (e.isDirectory()) {
        // Skip any name in SKIP_DIRS (covers dot-dirs like .git, .serena,
        // .venv etc. AND non-dot caches like node_modules, __pycache__).
        // The prior code had a no-op outer guard on dot-dirs that fell
        // through to processing — fixed by relying solely on SKIP_DIRS.
        if (skipDirs.has(e.name)) { stats.skipped++; continue; }
        visit(abs);
      } else if (e.isFile()) {
        if (stats.filesWalked >= max) { stats.truncated = true; dirTruncated = true; break; }
        const ext = path.extname(e.name).toLowerCase();
        let size = 0;
        try { size = fs.statSync(abs).size; } catch { /* tolerate */ }
        const fileRec = {
          abs: absNorm, rel: absNorm.slice(rootNorm.length + 1),
          dir: dirRel, name: e.name, ext, size,
          isBinary: BINARY_EXTS.has(ext),
        };
        files.push(fileRec);
        localFiles.push(fileRec);
        stats.filesWalked++;
      }
    }
    // Truncation-point partial-dir fix: if we hit the file cap mid-directory,
    // we have a partial view of localFiles. Recording it would let
    // classifyDir make a wrong bundle/individual decision (a 600-file dir
    // we saw 200 of could mis-classify as individual). Skip recording
    // partial directories — they're effectively dropped from this walk.
    if (localFiles.length > 0 && !dirTruncated) dirs.set(dirRel, localFiles);
    else if (dirTruncated) stats.skipped++;
  }

  visit(rootNorm);
  return { files, dirs, stats };
}

/** Pure: take a walkDir() result + the walk root, return { nodes, edges,
 *  summary } ready to merge into system-graph.json. */
export function buildAugment(walked, walkRoot, opts = {}) {
  const ns = namespaceForRoot(walkRoot);
  const sourceId = makeSourceNodeId(walkRoot);
  const sourceLabel = path.basename(String(walkRoot).replace(/\\/g, "/").replace(/\/+$/, ""));
  const nodes = [];
  const edges = [];
  let filesAsNodes = 0;
  let filesInBundles = 0;
  let bundleCount = 0;
  const extTally = new Map();

  // Source node — one per walkRoot. Layer L9 (Filesystem) — matches the
  // existing semantic where L9 holds top-level filesystem roots. L11 is
  // reserved for bundle nodes (the "Filesystem Bundles" semantic).
  // MasterIndexEngine excludes L11 from utilization scans, so a source node
  // on L11 would be invisible to /utilization-dashboard — placing it on L9
  // keeps the navigation handle queryable.
  nodes.push({
    id: sourceId,
    layer: "L9",
    subgroup: "fs-source",
    label: sourceLabel,
    color: "#64748b",
    status: "built",
    size: 0.7,
    info: `walk root: ${walkRoot} · namespace: ${ns} · files: ${walked.stats.filesWalked} · dirs: ${walked.stats.dirsWalked}${walked.stats.truncated ? " · TRUNCATED" : ""}`,
    kind: "fs.source",
    namespace: ns,
    walkRoot: String(walkRoot),
    filesWalked: walked.stats.filesWalked,
    dirsWalked: walked.stats.dirsWalked,
    truncated: walked.stats.truncated,
  });

  // Iterate dirs in walked.dirs. Each dir classified bundle-or-individual.
  for (const [dirRel, dirFiles] of walked.dirs.entries()) {
    const verdict = classifyDir(dirFiles, opts);
    if (verdict.mode === "bundle") {
      // Emit one bundle node + one edge to the source.
      const bundleId = makeBundleNodeId(ns, dirRel || "_root");
      const extByCount = {};
      for (const f of dirFiles) {
        extByCount[f.ext || "(noext)"] = (extByCount[f.ext || "(noext)"] || 0) + 1;
        extTally.set(f.ext || "(noext)", (extTally.get(f.ext || "(noext)") || 0) + 1);
      }
      const topExts = Object.entries(extByCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const label = (dirRel || "_root").split("/").pop() + ` [${dirFiles.length}]`;
      nodes.push({
        id: bundleId,
        layer: "L11",
        subgroup: "fs-bundle",
        label,
        color: "#475569",
        status: "built",
        size: Math.min(1.2, 0.4 + Math.log10(dirFiles.length + 1) * 0.18),
        info: `bundled (${verdict.reason}): ${dirFiles.length} files in ${ns}/${dirRel || "(root)"} · exts: ${topExts.map(([e, c]) => `${e}:${c}`).join(" ")}`,
        kind: "fs.bundle",
        namespace: ns,
        walkRoot: String(walkRoot),
        dirRel,
        fileCount: dirFiles.length,
        bundleReason: verdict.reason,
        extByCount,
      });
      edges.push({ from: bundleId, to: sourceId, type: "fs-contains", status: "active", intensity: 0.25 });
      filesInBundles += dirFiles.length;
      bundleCount++;
    } else {
      // Emit one L12 node per file. Edge each → source.
      for (const f of dirFiles) {
        const fileId = makeFileNodeId(ns, f.rel);
        extTally.set(f.ext || "(noext)", (extTally.get(f.ext || "(noext)") || 0) + 1);
        nodes.push({
          id: fileId,
          layer: "L12",
          subgroup: "fs-file",
          label: f.name.length > 28 ? f.name.slice(0, 25) + "..." : f.name,
          color: f.isBinary ? "#71717a" : "#cbd5e1",
          status: "built",
          size: f.size > 1_000_000 ? 0.45 : 0.3,
          info: `${ns}/${f.rel} · ${f.size} bytes${f.isBinary ? " · binary" : ""}`,
          kind: "fs.file",
          namespace: ns,
          walkRoot: String(walkRoot),
          canonicalRel: f.rel,
          size_bytes: f.size,
          isBinary: f.isBinary,
        });
        edges.push({ from: fileId, to: sourceId, type: "fs-contains", status: "active", intensity: 0.15 });
        filesAsNodes++;
      }
    }
  }

  const filesRepresented = filesAsNodes + filesInBundles;
  const coverageRatio = walked.stats.filesWalked > 0
    ? filesRepresented / walked.stats.filesWalked
    : 0;

  return {
    nodes, edges,
    summary: {
      walkRoot: String(walkRoot),
      namespace: ns,
      sourceNodeId: sourceId,
      filesWalked: walked.stats.filesWalked,
      dirsWalked: walked.stats.dirsWalked,
      skipped: walked.stats.skipped,
      truncated: walked.stats.truncated,
      filesAsNodes,
      filesInBundles,
      bundleCount,
      filesRepresented,
      coverageRatio,
      nodesAdded: nodes.length,
      edgesAdded: edges.length,
      extTally: Object.fromEntries(Array.from(extTally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)),
    },
  };
}

/** Pure: idempotent merge. Two correctness properties:
 *
 *   1. **Same-root re-walk** — removes prior nodes scoped to THIS walkRoot
 *      (matched by `walkRoot` field on the node OR by edge-reachability to
 *      our `sourceId`), then appends fresh. Other walk roots' nodes survive.
 *
 *   2. **Cross-root canonical dedup** — when walking H:/prism then
 *      H:/prism-foo, both produce the same `namespace="prism"` so the same
 *      file `mcp-server/src/X.ts` produces the IDENTICAL fileId from each
 *      walk. We append-with-dedup-by-id: the first walk's node survives
 *      verbatim, and the second walk's edges (to ITS source node) are added
 *      alongside the first walk's edges. Result: ONE canonical L12 node with
 *      multi-source edges — the stated contract.
 *
 * Edge semantics (the subtle part — read carefully):
 *   - Step 2 of the merge REMOVES prior edges connected to any node in our
 *     `ourNodeIds` set (our prior source-id + every L11/L12 node tagged
 *     `walkRoot === ourSource` + every node reachable to our source via an
 *     `fs-contains` edge). On a SAME-ROOT re-walk this evicts every edge the
 *     prior run wrote — so the subsequent append produces NO duplicates.
 *     (Test: "mergeIntoGraph idempotent on same-root re-walk" locks edge
 *     count equality at m2.edges.length === m1.edges.length.)
 *   - Step 3 then `g.edges.push(...augment.edges)` for the fresh walk.
 *   - On a CROSS-ROOT walk (H:/prism then H:/prism-foo) step 2 evicts NONE
 *     of the prior walk's edges (their endpoints aren't in OUR ourNodeIds),
 *     and step 3 appends the second walk's edges. Result: each canonical
 *     L12 file ends up with one `fs-contains` edge per physical worktree.
 *
 * Schema version bumped to 2.2.0 on first L11/L12 add (idempotent: only
 * bumped if currently 2.1.0 or absent).
 */
export function mergeIntoGraph(graph, augment) {
  const g = { ...graph };
  const sourceId = augment.summary.sourceNodeId;
  const ns = augment.summary.namespace;
  const ourSource = String(augment.summary.walkRoot);

  // Step 1: identify "our prior nodes" — nodes added by a PRIOR run of this
  // same walkRoot. The walkRoot field on bundle/file/source nodes is the
  // primary key; edge-reachability to our sourceId is the backup signal
  // (covers nodes from before the walkRoot-field-on-children fix landed).
  const ourNodeIds = new Set();
  for (const n of g.nodes || []) {
    if (!n) continue;
    if (n.id === sourceId) { ourNodeIds.add(n.id); continue; }
    if (n.walkRoot === ourSource && (n.layer === "L11" || n.layer === "L12" || n.kind === "fs.source")) {
      ourNodeIds.add(n.id);
    }
  }
  if (Array.isArray(g.edges)) {
    for (const e of g.edges) {
      if (e && e.to === sourceId && e.type === "fs-contains") ourNodeIds.add(e.from);
    }
  }

  // Step 2: filter prior nodes + their edges.
  g.nodes = (g.nodes || []).filter((n) => !ourNodeIds.has(n.id));
  g.edges = (g.edges || []).filter((e) => !(ourNodeIds.has(e.from) || ourNodeIds.has(e.to)));

  // Step 3: append new nodes with dedup-by-id (cross-root canonical merge).
  // First walk's canonical node wins; subsequent walks of OTHER roots only
  // add their unique nodes (not duplicates of already-present canonicals).
  const existingIds = new Set(g.nodes.map((n) => n.id));
  let dedupedCount = 0;
  for (const n of augment.nodes) {
    if (existingIds.has(n.id)) { dedupedCount++; continue; }
    g.nodes.push(n);
    existingIds.add(n.id);
  }
  // Edges: always append. A canonical file is supposed to carry one edge per
  // physical-worktree-copy — that's the cross-root-edge contract.
  // Iterate instead of `push(...augment.edges)` — the spread operator pushes
  // each edge as a separate Function.apply argument, and on big walks (JM DIE
  // = 130 k+ edges) that blows the call stack. Iteration sidesteps it entirely.
  for (let i = 0; i < augment.edges.length; i++) g.edges.push(augment.edges[i]);

  // Ensure L11 + L12 layers declared exactly once. y-axis: more-negative =
  // lower in viz (matches existing L10 at y=-11.0).
  g.layers = g.layers || [];
  const hasL = (id) => g.layers.some((l) => l && l.id === id);
  if (!hasL("L11")) g.layers.push({ id: "L11", name: "Filesystem Bundles", y: -13.0, color: "#475569" });
  if (!hasL("L12")) g.layers.push({ id: "L12", name: "Filesystem (canonical)", y: -15.0, color: "#cbd5e1" });

  // Schema-version bump on first L11/L12 add. Downstream consumers
  // (system-viz-query, viz server, MasterIndexEngine, regen-wiki-from-viz)
  // can key off this to gate L11/L12 handling. Idempotent.
  g.meta = g.meta || {};
  if (!g.meta.schemaVersion || g.meta.schemaVersion === "2.1.0") {
    g.meta.schemaVersion = "2.2.0";
  }
  g.meta.totals = g.meta.totals || {};
  g.meta.totals.nodes = g.nodes.length;
  g.meta.totals.edges = g.edges.length;
  g.meta.totals.layers = g.layers.length;
  g.meta.fsCoverage = g.meta.fsCoverage || {};
  g.meta.fsCoverage[`${ns}::${ourSource}`] = {
    walkRoot: ourSource,
    namespace: ns,
    sourceNodeId: sourceId,
    ...augment.summary,
    dedupedAgainstCanonical: dedupedCount,
    lastWalkedAt: new Date().toISOString(),
  };
  return g;
}

/** Atomic write: temp + fsync + rename, with Windows-safe retry on
 *  EBUSY/EPERM/EEXIST (target held open by viz server on :8765, watcher,
 *  antivirus scan, etc.). Falls back to copy+unlink if rename keeps
 *  failing — slower but recovers when rename is structurally refused.
 *
 *  fsync gap closed: a power loss between writeFileSync and renameSync
 *  could previously leave the tmp on disk without its content actually
 *  flushed. fsync-on-fd before rename closes the durability window. */
function writeGraphAtomic(filePath, graphObj) {
  const tmp = filePath + ".tmp";
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeSync(fd, JSON.stringify(graphObj, null, 2));
    try { fs.fsyncSync(fd); } catch { /* not all FS support fsync; tolerate */ }
  } finally {
    try { fs.closeSync(fd); } catch { /* tolerate */ }
  }
  // Rename with retry — Windows can throw EBUSY/EPERM if the target is open
  // for read by the viz server, an editor, or AV scan. 6 retries x 100ms
  // covers a ~600ms window which empirically catches the common cases.
  const RETRY_DELAYS_MS = [50, 100, 200, 400, 800, 1600];
  let lastErr = null;
  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    try {
      fs.renameSync(tmp, filePath);
      return;
    } catch (err) {
      lastErr = err;
      const code = err && err.code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "EEXIST" && code !== "EACCES") {
        throw err; // unexpected — surface immediately
      }
      // Spin-wait without sleep import; coarse but adequate.
      const until = Date.now() + RETRY_DELAYS_MS[i];
      while (Date.now() < until) { /* busy-wait */ }
    }
  }
  // Fallback: copy + unlink. Loses the "atomic-replace" guarantee but
  // recovers from structurally-refused renames (e.g. cross-volume).
  try {
    fs.copyFileSync(tmp, filePath);
    try { fs.unlinkSync(tmp); } catch { /* leak the tmp; not fatal */ }
    return;
  } catch (copyErr) {
    const err = new Error(`writeGraphAtomic failed: rename retries exhausted (${lastErr && lastErr.code}); copy fallback also failed: ${copyErr.message}`);
    err.cause = copyErr;
    throw err;
  }
}

// -- CLI --------------------------------------------------------------------

function parseArgs(argv) {
  const out = { root: null, dryRun: false, apply: false, bundleThreshold: DEFAULT_BUNDLE_THRESHOLD, maxFiles: DEFAULT_MAX_FILES };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") out.root = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--apply") out.apply = true;
    else if (a === "--bundle-threshold") out.bundleThreshold = Number(argv[++i]);
    else if (a === "--max-files") out.maxFiles = Number(argv[++i]);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.root) {
    console.error("usage: expand-system-viz-l12-files.mjs --root <H:/dir> [--dry-run|--apply] [--bundle-threshold N] [--max-files N]");
    process.exit(2);
  }
  if (!args.dryRun && !args.apply) {
    console.error("must pass --dry-run or --apply");
    process.exit(2);
  }
  if (!fs.existsSync(args.root)) {
    console.error(`root does not exist: ${args.root}`);
    process.exit(2);
  }
  const t0 = Date.now();
  console.error(`[walk] ${args.root} (bundle-threshold=${args.bundleThreshold}, max-files=${args.maxFiles})`);
  const walked = walkDir(args.root, {
    bundleThreshold: args.bundleThreshold,
    maxFiles: args.maxFiles,
  });
  const augment = buildAugment(walked, args.root, { bundleThreshold: args.bundleThreshold });
  const t1 = Date.now();
  console.error(`[walk] done in ${t1 - t0}ms — ${walked.stats.filesWalked} files / ${walked.stats.dirsWalked} dirs / ${walked.stats.skipped} skipped${walked.stats.truncated ? " · TRUNCATED" : ""}`);
  console.error(`[augment] ${augment.nodes.length} nodes, ${augment.edges.length} edges, ${augment.summary.bundleCount} bundles, coverage ${(augment.summary.coverageRatio * 100).toFixed(1)}%`);

  if (args.dryRun) {
    console.log(JSON.stringify(augment.summary, null, 2));
    return;
  }
  // Apply
  if (!fs.existsSync(GRAPH_FILE)) {
    console.error(`graph file missing: ${GRAPH_FILE}`);
    process.exit(2);
  }
  const graph = JSON.parse(fs.readFileSync(GRAPH_FILE, "utf8"));
  const merged = mergeIntoGraph(graph, augment);
  writeGraphAtomic(GRAPH_FILE, merged);
  const t2 = Date.now();
  console.error(`[merge] wrote ${GRAPH_FILE} in ${t2 - t1}ms — total ${merged.nodes.length} nodes, ${merged.edges.length} edges`);
  console.log(JSON.stringify(augment.summary, null, 2));
}

const isMain = (() => {
  try {
    if (!process.argv[1]) return false;
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch { return false; }
})();

if (isMain) {
  try { main(); } catch (err) {
    console.error("FATAL:", err && err.stack || err);
    process.exit(1);
  }
}
