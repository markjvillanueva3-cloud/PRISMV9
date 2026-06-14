#!/usr/bin/env node
/**
 * generate-memories-atomic.mjs — drill knowledge/memories/**\/*.md into
 * per-memory atomic L8 nodes parented to their kind rollup (memory_feedback,
 * memory_project, memory_reference, memory_user, memory_uncategorized).
 *
 * Output: state/shared/system-viz/memories-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const MEM_DIR = path.join(ROOT, "knowledge", "memories");

const KIND_HUE = {
  feedback: "#ec4899", project: "#06b6d4", reference: "#a855f7",
  user: "#22c55e", uncategorized: "#94a3b8", "_index": "#fbbf24",
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function extractTitle(text) {
  const h = text.match(/^#\s+(.+?)\s*$/m);
  if (h) return h[1].slice(0, 120);
  // Frontmatter `name:`
  const fm = text.match(/^---[\s\S]*?\n\s*name\s*:\s*(.+?)\s*$/m);
  if (fm) return fm[1].slice(0, 120);
  return null;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const files = walk(MEM_DIR);
  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    filesScanned: files.length,
    nodesEmitted: 0,
    parentSynth: 0,
    parentExisting: 0,
    perKind: {},
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }
  const kindNeeded = new Set();

  for (const abs of files) {
    const rel = path.relative(MEM_DIR, abs).replace(/\\/g, "/");
    const parts = rel.split("/");
    const kind = parts.length > 1 ? parts[0] : "uncategorized";
    const stem = (parts.length > 1 ? parts.slice(1).join("/") : parts[0]).replace(/\.md$/, "");
    const slug = slugify(stem.replace(/\//g, "_"));
    const parentId = `memory_${kind}`;
    const id = `${parentId}.${slug}`;
    if (existingIds.has(id) || seenId.has(id)) continue;
    seenId.add(id);
    kindNeeded.add(kind);

    let sizeBytes = 0;
    let text = "";
    try {
      sizeBytes = fs.statSync(abs).size;
      text = fs.readFileSync(abs, "utf8").slice(0, 5000);
    } catch { /* noop */ }
    const title = extractTitle(text) ?? stem.split("/").pop().replace(/-/g, " ");

    newNodes.push({
      id,
      layer: "L8",
      subgroup: "memory_entry",
      parent: parentId,
      label: title,
      status: sizeBytes < 300 ? "stub" : "built",
      color: KIND_HUE[kind] || "#94a3b8",
      size: 0.26 + Math.min(0.18, Math.log10(1 + sizeBytes / 1024) * 0.07),
      tier: 3,
      ext: "md",
      sizeBytes,
      file: `knowledge/memories/${rel}`,
      memoryKind: kind,
    });
    stats.nodesEmitted++;
    stats.perKind[kind] = (stats.perKind[kind] || 0) + 1;
    if (existingIds.has(parentId)) {
      stats.parentExisting++;
      pushEdge(parentId, id, "contains", "active", 0.18);
    } else {
      stats.parentSynth++;
      // Synth the parent rollup if missing — covers new memory kinds
      if (!seenId.has(parentId)) {
        seenId.add(parentId);
        newNodes.push({
          id: parentId,
          layer: "L8",
          subgroup: "memory_kind",
          label: `memories/${kind}`,
          color: KIND_HUE[kind] || "#94a3b8",
          status: "built",
          size: 0.55,
          tier: 3,
          synthetic: true,
        });
      }
      pushEdge(parentId, id, "contains", "active", 0.18);
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    memDir: "knowledge/memories",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "memories-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  files scanned:    ${result.stats.filesScanned}`);
  console.log(`  emitted:          ${result.stats.nodesEmitted}`);
  console.log(`  parent existing:  ${result.stats.parentExisting}`);
  console.log(`  parent synth:     ${result.stats.parentSynth}`);
  console.log(`  per kind:`);
  for (const [k, n] of Object.entries(result.stats.perKind).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(20)} ${n}`);
  }
}
