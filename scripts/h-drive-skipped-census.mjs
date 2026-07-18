#!/usr/bin/env node
/**
 * h-drive-skipped-census.mjs — record the existence + size of the trees we
 * deliberately skipped during the main walk (node_modules, .git, dist, caches,
 * Recycle.Bin, System Volume Information, Windows, etc).
 *
 * The main walker excludes those because their contents are either regenerable
 * or system-managed. But the user wants every byte accounted for at SOME level.
 * This pass walks them at directory granularity only — records dir size + name +
 * file count via fast aggregation, no per-file detail. Permission denials are
 * silently captured as `permissionDenied: true`.
 *
 * Output:
 *   state/shared/system-viz/h-drive-skipped-census.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const OUT = path.join(VIZ_DIR, "h-drive-skipped-census.json");

// The patterns we deliberately skipped in the main walk
const SKIP_PATTERNS = [
  { name: "node_modules", category: "regenerable", reason: "npm install reproduces" },
  { name: ".git", category: "regenerable", reason: "git fetch reproduces" },
  { name: "dist", category: "regenerable", reason: "build step reproduces" },
  { name: "build", category: "regenerable", reason: "build step reproduces" },
  { name: "out", category: "regenerable", reason: "build step reproduces" },
  { name: ".cache", category: "regenerable", reason: "transient cache" },
  { name: ".next", category: "regenerable", reason: "Next.js build cache" },
  { name: ".turbo", category: "regenerable", reason: "Turbo cache" },
  { name: ".vercel", category: "regenerable", reason: "Vercel cache" },
  { name: ".vite", category: "regenerable", reason: "Vite cache" },
  { name: "coverage", category: "regenerable", reason: "test coverage output" },
  { name: ".nyc_output", category: "regenerable", reason: "nyc coverage" },
  { name: "__pycache__", category: "regenerable", reason: "Python bytecode cache" },
  { name: ".pytest_cache", category: "regenerable", reason: "pytest cache" },
  { name: ".venv", category: "regenerable", reason: "Python virtual env" },
  { name: "venv", category: "regenerable", reason: "Python virtual env" },
  { name: ".idea", category: "ide-state", reason: "IntelliJ project state" },
  { name: ".vscode", category: "ide-state", reason: "VS Code project state" },
  { name: ".claude-octopus", category: "experimental", reason: "experimental harness state" },
  { name: ".claude-profiles", category: "experimental", reason: "experimental harness state" },
];

const ROOT_SKIP = [
  { name: "$Recycle.Bin", category: "system", reason: "Windows Recycle Bin" },
  { name: "$RECYCLE.BIN", category: "system", reason: "Windows Recycle Bin" },
  { name: "System Volume Information", category: "system", reason: "Windows VSS shadow copies" },
  { name: "Recovery", category: "system", reason: "Windows Recovery partition contents" },
];

// Fast directory-tree aggregation — counts files + bytes recursively without
// emitting per-file records. Tolerates permission errors.
function aggregateTree(absPath) {
  let fileCount = 0;
  let totalBytes = 0;
  let dirCount = 0;
  let permErrors = 0;
  let oldestMtime = Number.POSITIVE_INFINITY;
  let newestMtime = 0;

  function walk(p) {
    let entries;
    try {
      entries = fs.readdirSync(p, { withFileTypes: true });
    } catch (e) {
      if (e.code === "EPERM" || e.code === "EACCES" || e.code === "EBUSY") permErrors++;
      return;
    }
    dirCount++;
    for (const e of entries) {
      const full = path.join(p, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.isFile()) {
        try {
          const stat = fs.statSync(full);
          fileCount++;
          totalBytes += stat.size;
          if (stat.mtimeMs < oldestMtime) oldestMtime = stat.mtimeMs;
          if (stat.mtimeMs > newestMtime) newestMtime = stat.mtimeMs;
        } catch { /* file gone or perm */ }
      }
    }
  }
  walk(absPath);

  return {
    fileCount, totalBytes, dirCount, permErrors,
    oldestMtime: Number.isFinite(oldestMtime) ? oldestMtime : 0,
    newestMtime,
  };
}

const skipped = [];
const startTime = Date.now();

// 1) Walk H:/ root for top-level system dirs
console.log("Phase 1: H:/ root system dirs...");
let rootEntries = [];
try {
  rootEntries = fs.readdirSync("H:/", { withFileTypes: true });
} catch (e) {
  console.error(`H:/ not readable: ${e.message}`);
}

for (const r of ROOT_SKIP) {
  for (const e of rootEntries) {
    if (e.isDirectory() && e.name === r.name) {
      const p = path.join("H:/", r.name);
      console.log(`  walking ${p}...`);
      const t0 = Date.now();
      const agg = aggregateTree(p);
      skipped.push({
        path: p.replace(/\\/g, "/"),
        name: r.name,
        category: r.category,
        reason: r.reason,
        ...agg,
        walkMs: Date.now() - t0,
      });
      console.log(`    ${agg.fileCount.toLocaleString()} files · ${(agg.totalBytes/1024/1024/1024).toFixed(2)} GB · ${agg.permErrors} perm-errors`);
    }
  }
}

// 2) Walk every prism-* worktree + main /prism for the per-pattern skipped dirs
// This is the bulk of the gap (node_modules, .git, dist).
console.log("Phase 2: Per-worktree skipped trees...");
const worktreeRoots = [];
try {
  for (const e of rootEntries) {
    if (!e.isDirectory()) continue;
    if (e.name === "prism" || e.name.toLowerCase().startsWith("prism-")) {
      worktreeRoots.push(path.join("H:/", e.name));
    }
  }
} catch { /* ignore */ }

console.log(`  found ${worktreeRoots.length} worktrees to scan`);

let dirsEnumerated = 0;
function findSkipDirs(absPath, maxDepth = 6, depth = 0) {
  if (depth > maxDepth) return [];
  let entries;
  try { entries = fs.readdirSync(absPath, { withFileTypes: true }); }
  catch { return []; }
  dirsEnumerated++;
  const found = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const matched = SKIP_PATTERNS.find(s => s.name === e.name);
    if (matched) {
      found.push({ path: path.join(absPath, e.name), pattern: matched });
      // don't recurse into a skip pattern — count it as a unit
      continue;
    }
    // Recurse into normal dirs (bounded depth)
    found.push(...findSkipDirs(path.join(absPath, e.name), maxDepth, depth + 1));
  }
  return found;
}

const allSkipDirs = [];
for (const wt of worktreeRoots) {
  allSkipDirs.push(...findSkipDirs(wt));
}
console.log(`  found ${allSkipDirs.length} skip-pattern dirs across worktrees (enumerated ${dirsEnumerated} parent dirs)`);

let walked = 0;
for (const { path: p, pattern } of allSkipDirs) {
  walked++;
  if (walked % 50 === 0) console.log(`  ... ${walked}/${allSkipDirs.length}`);
  const t0 = Date.now();
  const agg = aggregateTree(p);
  skipped.push({
    path: p.replace(/\\/g, "/"),
    name: pattern.name,
    category: pattern.category,
    reason: pattern.reason,
    ...agg,
    walkMs: Date.now() - t0,
  });
}

// === ROLL UP ===
const totals = {
  trees: skipped.length,
  files: skipped.reduce((s, t) => s + t.fileCount, 0),
  bytes: skipped.reduce((s, t) => s + t.totalBytes, 0),
  permErrors: skipped.reduce((s, t) => s + t.permErrors, 0),
};
const byCategory = {};
const byPattern = {};
for (const t of skipped) {
  byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  const p = byPattern[t.name] ??= { count: 0, bytes: 0, files: 0 };
  p.count++;
  p.bytes += t.totalBytes;
  p.files += t.fileCount;
}

const out = {
  generatedAt: new Date().toISOString(),
  schemaVersion: "1.0.0",
  totals,
  byCategory,
  byPattern: Object.fromEntries(
    Object.entries(byPattern).sort((a, b) => b[1].bytes - a[1].bytes)
  ),
  trees: skipped.sort((a, b) => b.totalBytes - a.totalBytes),
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nwrote ${OUT}`);
console.log(`  trees walked: ${skipped.length}`);
console.log(`  files counted: ${totals.files.toLocaleString()}`);
console.log(`  bytes counted: ${(totals.bytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`  permission errors: ${totals.permErrors}`);
console.log(`  by category:`, byCategory);
console.log(`  by pattern (top 5 by bytes):`, Object.entries(out.byPattern).slice(0, 5).map(([k, v]) => `${k}=${(v.bytes/1024/1024/1024).toFixed(1)}GB`));
console.log(`  total time: ${elapsed}s`);
