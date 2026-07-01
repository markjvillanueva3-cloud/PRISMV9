#!/usr/bin/env node
/**
 * h-drive-full-index.mjs — full H: drive walk + per-directory rollup.
 *
 * Walks EVERY directory under H:/ (skipping Windows system/recycle bins) and
 * emits two outputs:
 *
 *   state/shared/system-viz/h-drive-files.jsonl   — one line per file
 *   state/shared/system-viz/h-drive-dir-index.json — per-directory rollup
 *
 * The .jsonl format scales to millions of files without blowing memory.
 * The dir-index is what the 10 followup agents ingest — each directory
 * carries: file count, total bytes, ext breakdown, oldest/newest mtime,
 * 5 sample files, depth, parent. Agents add `category` + `utility`.
 *
 * Then slices the dir-index into 10 buckets by directory subtree so
 * agents get coherent slices.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const VIZ_DIR   = path.join(ROOT, "state", "shared", "system-viz");
const SLICES_DIR = path.join(VIZ_DIR, "agent-slices-v2");
const FILES_OUT  = path.join(VIZ_DIR, "h-drive-files.jsonl");
const DIR_OUT    = path.join(VIZ_DIR, "h-drive-dir-index.json");

if (!fs.existsSync(SLICES_DIR)) fs.mkdirSync(SLICES_DIR, { recursive: true });

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".cache", ".next", ".turbo", ".vercel",
  "dist", "build", ".vite", "coverage", ".nyc_output",
  "__pycache__", ".pytest_cache", ".venv", "venv", ".idea",
  "$Recycle.Bin", "$RECYCLE.BIN", "System Volume Information", "Recovery",
  "Windows", "WindowsApps", "Program Files", "Program Files (x86)",
  "ProgramData", "PerfLogs",
]);

const dirIndex = {};   // dirPath -> { fileCount, totalBytes, byExt, oldestMtime, newestMtime, samples, depth, parent }
let totalFiles = 0;
let totalBytes = 0;
let totalDirs = 0;
let skippedDirs = 0;
let permissionErrors = 0;

const filesStream = fs.createWriteStream(FILES_OUT, { encoding: "utf8" });

function processDir(absPath, depth, parentDir) {
  let entries;
  try {
    entries = fs.readdirSync(absPath, { withFileTypes: true });
  } catch (e) {
    if (e.code === "EPERM" || e.code === "EACCES") permissionErrors++;
    return;
  }
  totalDirs++;
  const relPath = absPath.replace(/\\/g, "/");
  const rec = {
    path: relPath,
    parent: parentDir,
    depth,
    fileCount: 0,
    totalBytes: 0,
    byExt: {},
    oldestMtime: Number.POSITIVE_INFINITY,
    newestMtime: 0,
    samples: [],
  };

  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) { skippedDirs++; continue; }
    if (e.name.startsWith(".") && !["claude", "claude-octopus", "github"].includes(e.name.replace(/^\./, ""))) {
      skippedDirs++;
      continue;
    }
    const full = path.join(absPath, e.name);
    if (e.isDirectory()) {
      processDir(full, depth + 1, relPath);
    } else if (e.isFile()) {
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      const ext = path.extname(e.name).toLowerCase() || "(none)";
      rec.fileCount++;
      rec.totalBytes += stat.size;
      rec.byExt[ext] = (rec.byExt[ext] || 0) + 1;
      if (stat.mtimeMs < rec.oldestMtime) rec.oldestMtime = stat.mtimeMs;
      if (stat.mtimeMs > rec.newestMtime) rec.newestMtime = stat.mtimeMs;
      if (rec.samples.length < 5) {
        rec.samples.push({ name: e.name, size: stat.size, ext });
      }
      // Stream every file
      filesStream.write(JSON.stringify({
        path: full.replace(/\\/g, "/"),
        size: stat.size,
        mtime: stat.mtimeMs,
        ext,
        depth,
      }) + "\n");
      totalFiles++;
      totalBytes += stat.size;
    }
  }
  if (!Number.isFinite(rec.oldestMtime)) rec.oldestMtime = 0;
  dirIndex[relPath] = rec;
}

console.log("Walking entire H: drive (skipping system + cache dirs)...");
const t0 = Date.now();
let entries = [];
try {
  entries = fs.readdirSync("H:/", { withFileTypes: true })
    .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith("."));
} catch (e) {
  console.error(`H:/ not readable: ${e.message}`);
  process.exit(2);
}
console.log(`  found ${entries.length} root subtrees on H:/`);

for (const e of entries) {
  console.log(`  walking H:/${e.name}/ ...`);
  const before = totalFiles;
  processDir(path.join("H:/", e.name), 1, "H:/");
  console.log(`    ${(totalFiles - before).toLocaleString()} files`);
}

filesStream.end();
const tWalk = Date.now() - t0;

const dirArray = Object.values(dirIndex).sort((a, b) => a.path.localeCompare(b.path));

const census = {
  generatedAt: new Date().toISOString(),
  schemaVersion: "2.0.0",
  scope: "H:/ entire drive (skipping Windows system + cache dirs)",
  totals: {
    files: totalFiles,
    dirs: totalDirs,
    skippedDirs,
    permissionErrors,
    totalBytes,
    walkMs: tWalk,
  },
  dirs: dirArray,
};

fs.writeFileSync(DIR_OUT, JSON.stringify(census));
console.log(`\nwrote files stream:  ${FILES_OUT}`);
console.log(`wrote dir index:     ${DIR_OUT}`);
console.log(`  files: ${totalFiles.toLocaleString()}  dirs: ${totalDirs.toLocaleString()}  size: ${(totalBytes/1024/1024/1024).toFixed(2)} GB`);
console.log(`  walk took: ${(tWalk/1000).toFixed(1)}s   permission errors: ${permissionErrors}   skipped dirs: ${skippedDirs}`);

// === SLICE THE DIR INDEX INTO 10 BUCKETS ===
// Each bucket grouped by top-level subtree where possible
const top = {};  // first-segment of path under H:/  -> array of dir records
for (const d of dirArray) {
  const m = d.path.match(/^H:\/([^/]+)/);
  const tk = m ? m[1] : "(root)";
  (top[tk] ??= []).push(d);
}
const subtreeOrder = Object.entries(top).sort((a, b) => b[1].length - a[1].length);

const slices = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1, subtrees: [], dirCount: 0, fileCount: 0, totalBytes: 0, dirs: [],
}));

// Bin-pack subtrees into slices (largest first, into smallest current slice)
for (const [name, list] of subtreeOrder) {
  const target = slices.reduce((min, s) => s.dirCount < min.dirCount ? s : min, slices[0]);
  target.subtrees.push(name);
  target.dirCount += list.length;
  target.fileCount += list.reduce((s, d) => s + d.fileCount, 0);
  target.totalBytes += list.reduce((s, d) => s + d.totalBytes, 0);
  target.dirs.push(...list);
}

for (const s of slices) {
  // Cap dirs per slice file at top 1000 (by fileCount desc) so agent ingestion stays sane
  s.dirs.sort((a, b) => b.fileCount - a.fileCount);
  const head = s.dirs.slice(0, 1000);
  fs.writeFileSync(path.join(SLICES_DIR, `${s.id}.json`), JSON.stringify({
    sliceId: s.id,
    subtrees: s.subtrees,
    totalDirs: s.dirCount,
    totalFiles: s.fileCount,
    totalBytes: s.totalBytes,
    dirsShown: head.length,
    dirsOmitted: Math.max(0, s.dirs.length - 1000),
    dirs: head,
  }, null, 2));
}

console.log(`\nSliced into 10 buckets at ${SLICES_DIR}/{1..10}.json:`);
for (const s of slices) {
  const sz = (s.totalBytes/1024/1024/1024).toFixed(1).padStart(6);
  console.log(`  slice ${s.id}: ${s.dirCount.toString().padStart(6)} dirs  ${s.fileCount.toString().padStart(8)} files  ${sz} GB  subtrees: ${s.subtrees.slice(0,4).join(", ")}${s.subtrees.length>4?", ...":""}`);
}
