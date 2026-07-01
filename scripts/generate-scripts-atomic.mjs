#!/usr/bin/env node
/**
 * generate-scripts-atomic.mjs — drill scripts/*.{mjs,js,py,ts,sh,ps1} into
 * atomic L6 children of core.scripts. Excludes archived/completed/test buckets.
 *
 * Output: state/shared/system-viz/scripts-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const SCRIPTS_DIR = path.join(ROOT, "scripts");

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

const EXCLUDED_PREFIX = new Set(["_archive", "_completed_utilities", "node_modules"]);
const EXTS = new Set([".mjs", ".js", ".cjs", ".ts", ".py", ".sh", ".ps1", ".bat"]);
const EXT_COLORS = {
  ".mjs": "#fbbf24", ".js":  "#fbbf24", ".cjs": "#fbbf24",
  ".ts":  "#3b82f6", ".py":  "#0ea5e9",
  ".sh":  "#10b981", ".ps1": "#06b6d4", ".bat": "#94a3b8",
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function listScripts() {
  const out = [];
  if (!fs.existsSync(SCRIPTS_DIR)) return out;
  for (const e of fs.readdirSync(SCRIPTS_DIR, { withFileTypes: true })) {
    if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (!EXTS.has(ext)) continue;
      if (e.name.endsWith(".test.mjs") || e.name.endsWith(".test.ts") || e.name.endsWith(".test.js")) continue;
      out.push({ rel: e.name, abs: path.join(SCRIPTS_DIR, e.name), ext });
    }
    // Don't recurse — sub-dirs (audit/, batch/, automation/) are utilities, not first-class scripts.
  }
  return out;
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = loadGraph(GRAPH);
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const files = listScripts();
  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    scriptsScanned: files.length,
    nodesEmitted: 0,
    parentMissing: 0,
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
    return { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), newNodes, newEdges, stats, note: "core.scripts parent missing in graph" };
  }

  for (const f of files) {
    const stem = f.rel.replace(new RegExp(`\\${f.ext}$`), "");
    if (EXCLUDED_PREFIX.has(stem.split("_")[0])) continue;
    const slug = slugify(stem);
    const id = `script.${slug}`;
    if (existingIds.has(id) || seenId.has(id)) continue;
    seenId.add(id);

    let sizeBytes = 0;
    try { sizeBytes = fs.statSync(f.abs).size; } catch { /* noop */ }

    newNodes.push({
      id,
      layer: "L6",
      subgroup: "script",
      parent: "core.scripts",
      label: stem,
      status: sizeBytes < 300 ? "stub" : "built",
      color: EXT_COLORS[f.ext] || "#94a3b8",
      size: 0.28 + Math.min(0.20, Math.log10(1 + sizeBytes / 1024) * 0.07),
      tier: 0,
      ext: f.ext.slice(1),
      sizeBytes,
      file: `scripts/${f.rel}`,
    });
    stats.nodesEmitted++;
    stats.perExt[f.ext] = (stats.perExt[f.ext] || 0) + 1;
    pushEdge("core.scripts", id, "contains", "active", 0.15);
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    scriptsDir: "scripts",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "scripts-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  scripts scanned: ${result.stats.scriptsScanned}`);
  console.log(`  emitted:         ${result.stats.nodesEmitted}`);
  console.log(`  parent missing:  ${result.stats.parentMissing}`);
  console.log(`  per ext:`);
  for (const [e, n] of Object.entries(result.stats.perExt).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${e.padEnd(8)} ${n}`);
  }
}
