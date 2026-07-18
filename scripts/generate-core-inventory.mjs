#!/usr/bin/env node
/**
 * generate-core-inventory.mjs — expand L6 placeholder nodes into real children.
 *
 * The 10 L6 placeholders in system-graph.json (core.algos, core.schemas, …)
 * each represent a category of files. This script walks each category's
 * source directory and emits per-file (or per-bucket for large categories)
 * child nodes, plus parent->child edges.
 *
 * Output: state/shared/system-viz/core-inventory-augmentation.json
 *
 * The merge step in scripts/merge-augmentations.mjs picks this up and
 * folds it into system-graph.json. We deliberately do NOT touch
 * generate-system-viz.mjs (a peer chat owns it).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");

// Per-category configuration. mode='per-file' yields one node per file (capped).
// mode='bucket' groups files by a prefix function.
const CATEGORIES = [
  { id: "core.algos",       dir: "mcp-server/src/algorithms", exts: [".ts"],          mode: "per-file", color: "#fbbf24" },
  { id: "core.schemas",     dir: "mcp-server/src/schemas",    exts: [".ts"],          mode: "bucket",   color: "#fbbf24" },
  { id: "core.physics",     dir: "mcp-server/src/physics",    exts: [".ts"],          mode: "per-file", color: "#fbbf24" },
  { id: "core.migrations",  dir: "mcp-server/src/migrations", exts: [".ts"],          mode: "per-file", color: "#fbbf24" },
  { id: "core.tests",       dir: "mcp-server/src/__tests__",  exts: [".test.ts"],     mode: "bucket",   color: "#fbbf24" },
  { id: "core.hooks_src",   dir: "mcp-server/src/hooks",      exts: [".ts"],          mode: "per-file", color: "#fbbf24" },
  { id: "core.hooks_cl",    dir: ".claude/hooks",             exts: [".mjs", ".js"],  mode: "bucket",   color: "#fbbf24" },
  { id: "core.scripts",     dir: "scripts",                   exts: [".mjs", ".js", ".ts"], mode: "bucket", color: "#fbbf24" },
  { id: "core.skills",      dir: ".claude/commands",          exts: [".md"],          mode: "bucket",   color: "#fbbf24" },
];

const PER_FILE_CAP = 200;
const BUCKET_MIN = 4;   // collapse buckets smaller than this into "Misc"

function walkFiles(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let ents;
    try { ents = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", ".next"].includes(e.name)) continue;
        stack.push(p);
      } else if (e.isFile() && exts.some(x => e.name.endsWith(x))) {
        let size = 0;
        try { size = fs.statSync(p).size; } catch {}
        out.push({ rel: path.relative(ROOT, p).replace(/\\/g, "/"), name: e.name, size });
      }
    }
  }
  return out;
}

function bucketKey(name) {
  const stem = name.replace(/\.(ts|tsx|js|mjs|cjs|md)$/i, "").replace(/\.test$/, "");
  // strategy 1: dash/underscore-delimited prefix (e.g. "kebab-case-name" → "kebab")
  const dashTok = stem.split(/[-_]/)[0];
  if (dashTok !== stem && dashTok.length >= 3) return dashTok.toLowerCase();
  // strategy 2: leading uppercase acronym (PascalCase with caps run), e.g. "WEDMFoo" → "WEDM"
  const capRun = stem.match(/^[A-Z]{2,}(?=[A-Z][a-z]|$)/);
  if (capRun && capRun[0].length >= 2) return capRun[0];
  // strategy 3: leading PascalCase word, e.g. "LatheTool" → "Lathe"
  const cam = stem.match(/^[A-Z][a-z]+/);
  if (cam) return cam[0];
  // strategy 4: leading lowercase camelCase token, e.g. "cadActionSchemas" → "cad"
  const lower = stem.match(/^[a-z]+/);
  if (lower && lower[0].length >= 2) return lower[0];
  return "Misc";
}

function nodeIdFromBucket(parentId, key) {
  return `${parentId}.${key.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}
function nodeIdFromFile(parentId, name) {
  const stem = name.replace(/\.(ts|tsx|js|mjs|cjs|md)$/i, "").replace(/\.test$/, "");
  return `${parentId}.${stem.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

function logSize(bytes) {
  // map raw bytes → log-scale size for viz (0.2 → 1.0)
  if (!bytes) return 0.25;
  const kb = bytes / 1024;
  const v = 0.25 + Math.log10(1 + kb) * 0.18;
  return Math.min(1.0, Math.max(0.2, v));
}

function generate() {
  const byParent = {};
  const newNodes = [];
  const newEdges = [];
  const stats = { categories: 0, perFile: 0, bucket: 0, totalChildren: 0 };

  for (const cat of CATEGORIES) {
    const files = walkFiles(cat.dir, cat.exts);
    stats.categories++;
    if (files.length === 0) continue;

    if (cat.mode === "per-file" && files.length <= PER_FILE_CAP) {
      const children = [];
      for (const f of files) {
        const id = nodeIdFromFile(cat.id, f.name);
        if (children.find(c => c.id === id)) continue; // dedupe
        const label = f.name.replace(/\.test\.ts$/, "").replace(/\.(ts|js|mjs|md)$/i, "");
        const node = {
          id, layer: "L6", subgroup: cat.id.replace("core.", "core_"),
          label, color: cat.color,
          status: "built", size: logSize(f.size), tier: -1,
          parent: cat.id, file: f.rel,
          info: `${f.rel} (${(f.size / 1024).toFixed(1)} KB)`,
        };
        children.push({ id, label, file: f.rel, size: f.size });
        newNodes.push(node);
        newEdges.push({ from: cat.id, to: id, type: "contains", status: "active", intensity: 0.4 });
      }
      byParent[cat.id] = { mode: "per-file", count: children.length, children };
      stats.perFile += children.length;
      stats.totalChildren += children.length;
    } else {
      // bucketed
      const buckets = new Map();
      for (const f of files) {
        const k = bucketKey(f.name);
        if (!buckets.has(k)) buckets.set(k, { key: k, files: [], totalBytes: 0 });
        const b = buckets.get(k);
        b.files.push(f);
        b.totalBytes += f.size;
      }
      // collapse small buckets into "Misc"
      const miscFiles = [];
      let miscBytes = 0;
      for (const [k, b] of [...buckets.entries()]) {
        if (k === "Misc") continue;
        if (b.files.length < BUCKET_MIN) {
          miscFiles.push(...b.files);
          miscBytes += b.totalBytes;
          buckets.delete(k);
        }
      }
      if (miscFiles.length) {
        const cur = buckets.get("Misc") ?? { key: "Misc", files: [], totalBytes: 0 };
        cur.files.push(...miscFiles);
        cur.totalBytes += miscBytes;
        buckets.set("Misc", cur);
      }
      const children = [];
      for (const b of [...buckets.values()].sort((a, c) => c.files.length - a.files.length)) {
        const id = nodeIdFromBucket(cat.id, b.key);
        const label = `${b.key} (${b.files.length})`;
        const node = {
          id, layer: "L6", subgroup: cat.id.replace("core.", "core_"),
          label, color: cat.color,
          status: "built", size: logSize(b.totalBytes / Math.max(1, b.files.length)), tier: -1,
          parent: cat.id,
          fileCount: b.files.length,
          totalBytes: b.totalBytes,
          info: `Bucket '${b.key}' — ${b.files.length} files in ${cat.dir}`,
          sampleFiles: b.files.slice(0, 5).map(f => f.rel),
        };
        children.push({ id, label, fileCount: b.files.length, totalBytes: b.totalBytes });
        newNodes.push(node);
        newEdges.push({ from: cat.id, to: id, type: "contains", status: "active", intensity: 0.4 });
      }
      byParent[cat.id] = { mode: "bucket", count: children.length, totalFiles: files.length, children };
      stats.bucket += children.length;
      stats.totalChildren += children.length;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    byParent,
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "core-inventory-augmentation.json");
fs.mkdirSync(VIZ_DIR, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  categories=${result.stats.categories}  per-file=${result.stats.perFile}  bucket=${result.stats.bucket}  total=${result.stats.totalChildren}`);
for (const [pid, p] of Object.entries(result.byParent)) {
  console.log(`  ${pid.padEnd(20)} ${p.mode.padEnd(10)} ${String(p.count).padStart(4)} children${p.totalFiles ? ` (from ${p.totalFiles} files)` : ""}`);
}
