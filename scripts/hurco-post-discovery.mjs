#!/usr/bin/env node
/**
 * hurco-post-discovery.mjs — inventory the JM Die archive for Hurco programs
 * and dump engine signature so we can plan the verification harness without
 * fighting PowerShell quoting.
 *
 * Iterative BFS to avoid recursion blow-up on the 24k-file archive.
 * One-shot read-only.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism/JM DIE";
const OUT_FILE = "H:/prism/state/shared/hurco-post-discovery.json";

const SCAN_EXTS = new Set([".hcm", ".nc", ".h", ".iso", ".cnc", ".eia", ".min"]);
const HURCO_TOKENS = [
  "hurco", "winmax", "vmx", "vm-1", "vm1", "bmc",
  "vm30", "vm10", "vm20", "vm24", "vm42",
];
const MAX_DEPTH = 8;
const MAX_FILES = 200000;
const MAX_SAMPLES = 40;
const MAX_TOP_DIRS = 8;

function looksHurco(p) {
  const low = p.toLowerCase();
  return HURCO_TOKENS.some((t) => low.includes(t));
}

let totalFiles = 0;
const counts = {};
const hurcoSamples = [];
const dirCounts = new Map();
const queue = [{ dir: ROOT, depth: 0 }];

while (queue.length > 0) {
  if (totalFiles > MAX_FILES) break;
  const { dir, depth } = queue.shift();
  if (depth > MAX_DEPTH) continue;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    continue;
  }
  for (const e of entries) {
    if (totalFiles > MAX_FILES) break;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      queue.push({ dir: p, depth: depth + 1 });
    } else if (e.isFile()) {
      totalFiles++;
      const ext = path.extname(e.name).toLowerCase();
      if (!SCAN_EXTS.has(ext)) continue;
      counts[ext] = (counts[ext] || 0) + 1;
      if (looksHurco(p)) {
        const key = path.dirname(p);
        dirCounts.set(key, (dirCounts.get(key) || 0) + 1);
        if (hurcoSamples.length < MAX_SAMPLES) hurcoSamples.push(p);
      }
    }
  }
}

const topDirs = [...dirCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, MAX_TOP_DIRS)
  .map(([dir, n]) => ({ dir, programs: n }));

const payload = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  root: ROOT,
  totals: { filesScanned: totalFiles, queueRemaining: queue.length },
  byExtension: counts,
  hurcoCorpus: {
    sampleCount: hurcoSamples.length,
    samples: hurcoSamples,
    topDirectories: topDirs,
  },
};

fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
console.log(`wrote ${OUT_FILE} — files=${totalFiles}, hurcoSamples=${hurcoSamples.length}`);
