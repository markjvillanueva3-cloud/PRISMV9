#!/usr/bin/env node
/**
 * generate-scripts-lib-atomic.mjs — emit L6 nodes for every script library
 * file under scripts/lib/{,*.test.mjs}.
 *
 * Sister generator to generate-scripts-atomic.mjs which DELIBERATELY does
 * not recurse (see its line 40 — "sub-dirs are utilities"). The lib/
 * subdirectory is the exception: every file there is a load-bearing pure
 * library imported by hooks, dispatchers, and other scripts (e.g.
 * memory-index-search-lib, zebra-orchestrator-lib, system-viz-dead-pixel-
 * detector). They MUST appear as nodes so /system-viz blast-radius queries
 * resolve them and the master-index pre-search surfaces them.
 *
 * Parent: core.scripts (must exist; emitted as a no-op rollup otherwise).
 * Each lib emits two id classes:
 *   scriptlib.<slug>          — for *.mjs / *.js / *.cjs / *.ts impl files
 *   scriptlib.<slug>.test     — for *.test.{mjs,js,ts} sibling test files
 *
 * Edge model:
 *   core.scripts → scriptlib.<slug>           (contains, intensity 0.18)
 *   scriptlib.<slug> ↔ scriptlib.<slug>.test  (test-coverage, intensity 0.4)
 *
 * Output: state/shared/system-viz/scripts-lib-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const LIB_DIR = path.join(ROOT, "scripts", "lib");

function loadGraph(p) {
  try {
    const sz = fs.statSync(p).size;
    return sz > 256 * 1024 * 1024
      ? readGraphStreaming(p)
      : JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    if (e && e.code === "ERR_STRING_TOO_LONG") return readGraphStreaming(p);
    throw e;
  }
}

const EXTS = new Set([".mjs", ".js", ".cjs", ".ts"]);
const EXT_COLORS = {
  ".mjs": "#fbbf24", ".js": "#fbbf24", ".cjs": "#fbbf24", ".ts": "#3b82f6",
};

const TEST_RE = /\.test\.(mjs|js|ts|cjs)$/;

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function listLibFiles() {
  const out = [];
  if (!fs.existsSync(LIB_DIR)) return out;
  for (const e of fs.readdirSync(LIB_DIR, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    const ext = path.extname(e.name).toLowerCase();
    if (!EXTS.has(ext)) continue;
    out.push({
      rel: path.join("lib", e.name),
      name: e.name,
      abs: path.join(LIB_DIR, e.name),
      ext,
      isTest: TEST_RE.test(e.name),
    });
  }
  return out;
}

function deriveImplStem(testName) {
  return testName.replace(TEST_RE, "");
}

function generate() {
  if (!fs.existsSync(GRAPH)) {
    return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  }
  const graph = loadGraph(GRAPH);
  const existingIds = new Set(graph.nodes.map((n) => n.id));

  const files = listLibFiles();
  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    libFilesScanned: files.length,
    nodesEmitted: 0,
    parentMissing: 0,
    testEdges: 0,
    perExt: {},
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  if (!existingIds.has("core.scripts")) {
    stats.parentMissing = files.length;
    return {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      newNodes,
      newEdges,
      stats,
      note: "core.scripts parent missing in graph",
    };
  }

  for (const f of files) {
    const stem = f.name.replace(new RegExp(`\\${f.ext}$`), "");
    const isTest = f.isTest;
    const baseStem = isTest ? deriveImplStem(f.name).replace(new RegExp(`\\${f.ext}$`), "") : stem;
    const baseSlug = slugify(baseStem);
    const id = isTest ? `scriptlib.${baseSlug}.test` : `scriptlib.${baseSlug}`;
    // R12 fail-loud: intra-batch collision = real bug (two lib files that
    // slug to the same id). Existing-graph collision = legitimate (we've
    // already merged this lib in a prior regen) and just skips.
    if (seenId.has(id)) {
      throw new Error(`intra-batch slug collision: ${id} (file: ${f.rel}) — fix slugify or rename one of the colliding lib files`);
    }
    if (existingIds.has(id)) continue;
    seenId.add(id);

    let sizeBytes = 0;
    try { sizeBytes = fs.statSync(f.abs).size; } catch { /* noop */ }

    newNodes.push({
      id,
      layer: "L6",
      subgroup: isTest ? "scriptlib-test" : "scriptlib",
      parent: "core.scripts",
      label: stem,
      status: sizeBytes < 300 ? "stub" : "built",
      color: EXT_COLORS[f.ext] || "#94a3b8",
      size: 0.24 + Math.min(0.18, Math.log10(1 + sizeBytes / 1024) * 0.06),
      tier: 0,
      ext: f.ext.slice(1),
      sizeBytes,
      file: `scripts/${f.rel.replace(/\\/g, "/")}`,
      isTest,
    });
    stats.nodesEmitted++;
    stats.perExt[f.ext] = (stats.perExt[f.ext] || 0) + 1;
    pushEdge("core.scripts", id, "contains", "active", 0.18);
  }

  for (const f of files.filter((x) => x.isTest)) {
    const implStem = deriveImplStem(f.name).replace(new RegExp(`\\${f.ext}$`), "");
    const implSlug = slugify(implStem);
    const implId = `scriptlib.${implSlug}`;
    const testId = `scriptlib.${implSlug}.test`;
    if (seenId.has(implId) && seenId.has(testId)) {
      if (pushEdge(implId, testId, "test-coverage", "active", 0.4)) stats.testEdges++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    scriptsLibDir: "scripts/lib",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "scripts-lib-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  lib files scanned: ${result.stats.libFilesScanned}`);
  console.log(`  emitted:           ${result.stats.nodesEmitted}`);
  console.log(`  parent missing:    ${result.stats.parentMissing}`);
  console.log(`  test edges:        ${result.stats.testEdges}`);
  console.log(`  per ext:`);
  for (const [e, n] of Object.entries(result.stats.perExt).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${e.padEnd(8)} ${n}`);
  }
}
