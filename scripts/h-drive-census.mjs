#!/usr/bin/env node
/**
 * h-drive-census.mjs — full file accounting of H:/prism + non-prism H: roots.
 *
 * Walks the entire prism tree (skipping noise dirs like node_modules, .git,
 * dist, .cache) and emits a per-file manifest. Also lists non-prism H: root
 * subtrees at directory granularity.
 *
 * Output:
 *   state/shared/system-viz/h-drive-census.json
 *
 * { generatedAt, totals: {files, dirs, totalBytes, byExt, bySubtree},
 *   files: [{ path, size, mtime, ext, dir, depth }] }
 *
 * Then slices the census into 10 roughly equal-by-file-count buckets and
 * writes each to state/shared/system-viz/agent-slices/{N}.json so the
 * parallel agents can each handle one slice.
 *
 * Run before spawning the file-coverage agents.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const SLICES_DIR = path.join(VIZ_DIR, "agent-slices");
const OUT = path.join(VIZ_DIR, "h-drive-census.json");

if (!fs.existsSync(SLICES_DIR)) fs.mkdirSync(SLICES_DIR, { recursive: true });

// Skip these dirs everywhere — they're cache/build noise, not source of truth
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".cache", ".next", ".turbo", ".vercel",
  "dist", "build", "out", ".vite", "coverage", ".nyc_output",
  "__pycache__", ".pytest_cache", ".venv", "venv", ".idea", ".vscode",
  ".claude-octopus", ".claude-profiles",   // chat noise
]);

const files = [];
const byExt = {};
const bySubtree = {};
let totalBytes = 0;
let dirCount = 0;
let skippedDirCount = 0;

function walk(absPath, subtreeKey, depth = 0) {
  let entries;
  try {
    entries = fs.readdirSync(absPath, { withFileTypes: true });
  } catch (e) {
    return;
  }
  dirCount++;
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) { skippedDirCount++; continue; }
    if (e.name.startsWith(".")) {
      // Allow .claude/ and a handful of useful dotdirs through, skip the rest
      if (!["claude", "claude-octopus", "github"].includes(e.name.replace(/^\./, ""))) {
        skippedDirCount++;
        continue;
      }
    }
    const full = path.join(absPath, e.name);
    if (e.isDirectory()) {
      walk(full, subtreeKey, depth + 1);
    } else if (e.isFile()) {
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      const ext = path.extname(e.name).toLowerCase() || "(none)";
      const rel = path.relative(ROOT, full).replace(/\\/g, "/");
      files.push({
        path: rel,
        size: stat.size,
        mtime: stat.mtimeMs,
        ext,
        dir: path.dirname(rel),
        depth,
        subtree: subtreeKey,
      });
      totalBytes += stat.size;
      byExt[ext] = (byExt[ext] || 0) + 1;
      bySubtree[subtreeKey] = (bySubtree[subtreeKey] || 0) + 1;
    }
  }
}

console.log(`Walking H:/prism subtree (skipping ${SKIP_DIRS.size} cache/build dir patterns)...`);
const startWalk = Date.now();
const topDirs = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name) && (!e.name.startsWith(".") || e.name === ".claude" || e.name === ".github"));

for (const d of topDirs) {
  walk(path.join(ROOT, d.name), d.name, 1);
}

// Also include files at ROOT itself (CLAUDE.md, package.json, README, etc.)
for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (e.isFile()) {
    const stat = fs.statSync(path.join(ROOT, e.name));
    const ext = path.extname(e.name).toLowerCase() || "(none)";
    files.push({
      path: e.name, size: stat.size, mtime: stat.mtimeMs, ext, dir: ".", depth: 0, subtree: "(root)",
    });
    totalBytes += stat.size;
    byExt[ext] = (byExt[ext] || 0) + 1;
    bySubtree["(root)"] = (bySubtree["(root)"] || 0) + 1;
  }
}

const walkMs = Date.now() - startWalk;

// Inventory non-prism H: roots at the directory level only
const hRootDirs = [];
try {
  for (const e of fs.readdirSync("H:/", { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (e.name.toLowerCase() === "prism") continue;
    if (e.name.startsWith(".")) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    let kidCount = 0;
    try {
      kidCount = fs.readdirSync(`H:/${e.name}`).length;
    } catch { /* perm denied */ }
    hRootDirs.push({ name: e.name, immediateChildren: kidCount });
  }
} catch { /* H:/ not readable */ }

// Sort files by path for deterministic slicing
files.sort((a, b) => a.path.localeCompare(b.path));

// Compute totals
const totals = {
  files: files.length,
  dirs: dirCount,
  skippedDirs: skippedDirCount,
  totalBytes,
  walkMs,
  byExt,
  bySubtree,
  hRootSubtreeCount: hRootDirs.length,
};

const census = {
  generatedAt: new Date().toISOString(),
  schemaVersion: "1.0.0",
  scope: "H:/prism + H: root non-prism dirs (dir-level)",
  totals,
  hRootDirs,
  files,
};

fs.writeFileSync(OUT, JSON.stringify(census));
console.log(`wrote ${OUT}`);
console.log(`  files: ${totals.files.toLocaleString()}  dirs: ${totals.dirs.toLocaleString()}  size: ${(totalBytes/1024/1024).toFixed(1)} MB`);
console.log(`  walk took: ${walkMs}ms`);
console.log(`  top extensions:`, Object.entries(byExt).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([e,n])=>`${e}=${n}`).join(" "));
console.log(`  top subtrees:`, Object.entries(bySubtree).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([e,n])=>`${e}=${n}`).join(" "));
console.log(`  H: root non-prism dirs: ${hRootDirs.length}`);

// Slice into 10 buckets — group by subtree to keep agent contexts coherent.
// Largest subtrees get their own slice; smaller ones are merged.
const bySubtreeCount = Object.entries(bySubtree).sort((a,b)=>b[1]-a[1]);
const slices = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  subtrees: [],
  files: [],
  fileCount: 0,
  totalBytes: 0,
}));

// Bin-pack: assign each subtree to the slice with the lowest current byte total.
// We emit SUMMARIES, not full file lists — 586K files won't fit in 10 agent contexts.
// Each slice gets per-extension counts, sample files (largest, oldest, deepest paths),
// dir-level rollup, and orphan candidates (files outside any well-known root).
function summarizeSubtree(subtree, subtreeFiles) {
  const byExt = {};
  const byDir = {};
  let oldest = null, largest = null;
  for (const f of subtreeFiles) {
    byExt[f.ext] = (byExt[f.ext] || 0) + 1;
    const topDir = f.dir.split("/").slice(0, 2).join("/");
    byDir[topDir] = (byDir[topDir] || 0) + 1;
    if (!oldest || f.mtime < oldest.mtime) oldest = f;
    if (!largest || f.size > largest.size) largest = f;
  }
  // Pick representative samples: 30 largest, 30 oldest, 30 random
  const byBytes = subtreeFiles.slice().sort((a,b) => b.size - a.size).slice(0, 30);
  const byAge   = subtreeFiles.slice().sort((a,b) => a.mtime - b.mtime).slice(0, 30);
  const random  = [];
  if (subtreeFiles.length > 0) {
    const step = Math.max(1, Math.floor(subtreeFiles.length / 30));
    for (let i = 0; i < subtreeFiles.length && random.length < 30; i += step) {
      random.push(subtreeFiles[i]);
    }
  }
  return {
    subtree,
    fileCount: subtreeFiles.length,
    totalBytes: subtreeFiles.reduce((s, f) => s + f.size, 0),
    byExt,
    topDirs: Object.entries(byDir).sort((a,b) => b[1] - a[1]).slice(0, 25)
      .map(([d, n]) => ({ dir: d, fileCount: n })),
    samples: {
      largest: byBytes.map(f => ({ path: f.path, size: f.size, mtime: f.mtime })),
      oldest:  byAge.map(f => ({ path: f.path, size: f.size, mtime: f.mtime })),
      sampled: random.map(f => ({ path: f.path, size: f.size, mtime: f.mtime, ext: f.ext })),
    },
  };
}

// Group files by subtree once, then bin-pack subtrees into slices
const filesBySubtree = {};
for (const f of files) {
  (filesBySubtree[f.subtree] ??= []).push(f);
}
for (const [subtree, _count] of bySubtreeCount) {
  const target = slices.reduce((min, s) => s.totalBytes < min.totalBytes ? s : min, slices[0]);
  const subtreeFiles = filesBySubtree[subtree] || [];
  target.subtrees.push(subtree);
  target.fileCount += subtreeFiles.length;
  target.totalBytes += subtreeFiles.reduce((s, f) => s + f.size, 0);
  (target._summaries ??= []).push(summarizeSubtree(subtree, subtreeFiles));
}

for (const s of slices) {
  const slicePath = path.join(SLICES_DIR, `${s.id}.json`);
  fs.writeFileSync(slicePath, JSON.stringify({
    sliceId: s.id,
    subtrees: s.subtrees,
    fileCount: s.fileCount,
    totalBytes: s.totalBytes,
    summaries: s._summaries || [],
  }, null, 2));
}

console.log(`\nSliced into 10 buckets — each saved to ${SLICES_DIR}/{1..10}.json`);
for (const s of slices) {
  console.log(`  slice ${s.id}: ${s.fileCount.toString().padStart(6)} files  (subtrees: ${s.subtrees.slice(0,4).join(", ")}${s.subtrees.length>4?", ...":""})`);
}
