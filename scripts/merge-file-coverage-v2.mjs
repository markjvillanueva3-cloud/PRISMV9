#!/usr/bin/env node
/**
 * merge-file-coverage-v2.mjs — aggregate v2 per-directory findings into one augmentation.
 *
 * Reads:  state/shared/system-viz/agent-findings-v2/{1..10}.json
 * Writes: state/shared/system-viz/file-coverage-v2-augmentation.json
 *
 * Each agent emitted per-directory classifications (some on-schema, some not).
 * This merger:
 *   - normalizes off-schema category/utilization labels into the 8/5 canonical bucket set
 *   - collects ghost-node markers (dirs that should exist per roadmap but don't, or
 *     features referenced with no implementation behind them)
 *   - rolls up per-subtree-root counts
 *   - emits a top-list of orphans, breakdowns, ghosts, and utilization gaps
 *   - maps subtree roots onto L9 graph nodes (fs.<subtree>) for per-node fold
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const FIND_DIR = path.join(VIZ_DIR, "agent-findings-v2");
const OUT = path.join(VIZ_DIR, "file-coverage-v2-augmentation.json");

if (!fs.existsSync(FIND_DIR)) {
  console.error(`agent findings dir missing: ${FIND_DIR}`);
  process.exit(2);
}

// === NORMALIZATION MAPS ===
// Agents drifted off the canonical 8-bucket category enum — normalize back.
const CATEGORY_MAP = {
  // canonical pass-through
  source: "source", data: "data", generated: "generated", archive: "archive",
  config: "config", cache: "cache", docs: "docs", unknown: "unknown",
  // off-schema → canonical
  worktree: "source", "milestone-worktree": "source", "pp-worktree": "source",
  "skills-worktree": "source", "wiki-worktree": "docs", "worktree-active": "source",
  "worktree-stale": "archive", "dup-source": "archive", "dup-tests": "archive",
  recovery: "archive", recovered: "archive", "config-dup": "archive",
  experiment: "source", launcher: "config", "external-plugin": "config",
  "external/plugin": "config", "docker-vol": "cache", scratch: "cache",
  log: "cache", state: "data", heavy: "data", other: "unknown",
};
// Utilization drifted similarly — normalize to 5 buckets.
const UTIL_MAP = {
  active: "active", partial: "partial", inactive: "inactive",
  orphaned: "orphaned", unknown: "unknown",
  // off-schema
  hot: "active", fresh: "active", reference: "active",
  mixed: "partial", "merge-candidate": "partial",
  cold: "inactive", stale: "inactive", low: "inactive",
  orphan: "orphaned", dead: "orphaned", unused: "orphaned",
  duplicate: "orphaned", ghost: "orphaned",
};
function normCat(c) {
  if (!c) return "unknown";
  const k = String(c).toLowerCase().trim();
  return CATEGORY_MAP[k] || "unknown";
}
function normUtil(u) {
  if (!u) return "unknown";
  const k = String(u).toLowerCase().trim();
  return UTIL_MAP[k] || "unknown";
}

// Subtree root extractor — first segment of an H:/ path.
function subtreeRoot(absPath) {
  if (!absPath) return null;
  // Match H:/<root> or H:\<root> or just <root>
  const m = String(absPath).match(/^(?:[Hh]:[\\\/])?([^\\\/]+)/);
  return m ? m[1] : null;
}

// Map subtree root → L9 graph node id. The L9 nodes use lowercase + underscore.
// E.g. "PRISM" → "fs.prism", "JM DIE" → "fs.jm_die" (already in main prism root),
//      "prism-forge-archive" → "fs.h.prism-forge-archive" (non-prism H: root).
function subtreeToNodeId(subtree, isHRootSubtree) {
  if (!subtree) return null;
  const slug = subtree.toLowerCase().replace(/\s+/g, "_");
  return isHRootSubtree ? `fs.h.${slug}` : `fs.${slug}`;
}

// === LOAD ALL 10 FINDINGS ===
const findings = [];
const missing = [];
for (let i = 1; i <= 10; i++) {
  const p = path.join(FIND_DIR, `${i}.json`);
  if (!fs.existsSync(p)) { missing.push(i); continue; }
  try { findings.push(JSON.parse(fs.readFileSync(p, "utf8"))); }
  catch (e) { console.error(`bad JSON in ${p}: ${e.message}`); missing.push(i); }
}
if (findings.length === 0) { console.error("no findings"); process.exit(2); }

// === AGGREGATE ===
const allDirs = [];
const bySubtree = {};      // subtreeRoot → { dirCount, byCategory, byUtilization, totalBytes, ghostCount, isHRoot }
const allOrphans = [];
const allBreakdowns = [];
const allGhostNodes = [];
const allGaps = [];
const totalsByCategory = {};
const totalsByUtilization = {};

// Subtree → "is non-prism H: root" flag. Anything in slice 2-10 (except slice 1's PRISM
// or its inner subdirs) is generally non-prism. Use heuristic: subtree root != "PRISM"/"prism".
function isHRootSubtree(subtree) {
  if (!subtree) return false;
  const lo = subtree.toLowerCase();
  return lo !== "prism" && lo !== "(root)";
}

for (const f of findings) {
  const dirs = f.directories || [];
  for (const d of dirs) {
    const cat = normCat(d.category);
    const util = normUtil(d.utilization);
    const root = subtreeRoot(d.path);
    const isHRoot = isHRootSubtree(root);
    const isGhost = !!d.ghostMarker || util === "orphaned";
    const rec = {
      path: d.path,
      category: cat,
      utilization: util,
      origCategory: d.category,   // preserve raw for debugging
      origUtilization: d.utilization,
      evidence: d.evidence,
      fileCount: d.fileCount || 0,
      totalBytes: d.totalBytes || 0,
      ghostMarker: !!d.ghostMarker,
      action: d.action,
      sliceId: f.sliceId,
      subtreeRoot: root,
    };
    allDirs.push(rec);
    totalsByCategory[cat] = (totalsByCategory[cat] || 0) + 1;
    totalsByUtilization[util] = (totalsByUtilization[util] || 0) + 1;
    if (root) {
      const st = bySubtree[root] ??= {
        subtree: root, isHRoot, dirCount: 0, totalBytes: 0,
        byCategory: {}, byUtilization: {}, ghostCount: 0, samples: [],
      };
      st.dirCount++;
      st.totalBytes += rec.totalBytes;
      st.byCategory[cat] = (st.byCategory[cat] || 0) + 1;
      st.byUtilization[util] = (st.byUtilization[util] || 0) + 1;
      if (isGhost) st.ghostCount++;
      if (st.samples.length < 5) st.samples.push({ path: d.path, category: cat, utilization: util });
    }
  }

  // Slice-level summary lists
  const sum = f.summary || {};
  for (const o of (sum.topOrphans || [])) {
    allOrphans.push({ ...o, sliceId: f.sliceId });
  }
  for (const b of (sum.topBreakdowns || [])) {
    allBreakdowns.push({ ...b, sliceId: f.sliceId });
  }
  for (const g of (sum.ghostNodes || [])) {
    allGhostNodes.push({ ...g, sliceId: f.sliceId });
  }
  for (const g of (sum.utilizationGaps || [])) {
    const text = typeof g === "string" ? g : (g.gap || g.text || JSON.stringify(g));
    allGaps.push({ gap: text, sliceId: f.sliceId });
  }
}

// === RANK + CAP TOP LISTS ===
allOrphans.sort((a, b) => (b.totalBytes || b.size || 0) - (a.totalBytes || a.size || 0));
const topOrphans = allOrphans.slice(0, 50);
const topBreakdowns = allBreakdowns.slice(0, 30);
const topGhostNodes = allGhostNodes.slice(0, 30);
const seenGap = new Set();
const topGaps = [];
for (const g of allGaps) {
  const key = (g.gap || "").toLowerCase().slice(0, 80);
  if (seenGap.has(key)) continue;
  seenGap.add(key);
  topGaps.push(g);
  if (topGaps.length >= 30) break;
}

// === MAP SUBTREES → L9 NODE IDS ===
const byNodeId = {};
for (const [name, st] of Object.entries(bySubtree)) {
  const nodeId = subtreeToNodeId(name, st.isHRoot);
  if (!nodeId) continue;
  // Pick a dominant category + utilization for this subtree
  const dominantCat = Object.entries(st.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
  const dominantUtil = Object.entries(st.byUtilization).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
  byNodeId[nodeId] = {
    subtree: name,
    isHRoot: st.isHRoot,
    dirCount: st.dirCount,
    totalBytes: st.totalBytes,
    dominantCategory: dominantCat,
    dominantUtilization: dominantUtil,
    byCategory: st.byCategory,
    byUtilization: st.byUtilization,
    ghostCount: st.ghostCount,
    sampleDirs: st.samples,
  };
}

// === GHOST-DIR DERIVATION (built from per-dir ghostMarker flags) ===
const ghostDirs = allDirs.filter(d => d.ghostMarker || d.utilization === "orphaned").length;

// === WRITE OUTPUT ===
const out = {
  generatedAt: new Date().toISOString(),
  schemaVersion: "2.0.0",
  totals: {
    slicesProcessed: findings.length,
    slicesMissing: missing,
    directoriesAnalyzed: allDirs.length,
    subtreesRolledUp: Object.keys(bySubtree).length,
    byCategory: totalsByCategory,
    byUtilization: totalsByUtilization,
    ghostDirCount: ghostDirs,
    totalOrphans: allOrphans.length,
    totalBreakdowns: allBreakdowns.length,
    totalGhostNodes: allGhostNodes.length,
    totalGaps: allGaps.length,
  },
  bySubtree,
  byNodeId,
  topOrphans,
  topBreakdowns,
  topGhostNodes,
  topGaps,
  // Keep raw per-dir records for downstream drill-in (capped to keep JSON sane)
  directories: allDirs.slice(0, 1500),
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${OUT}`);
console.log(`  slices: ${findings.length}/10  (missing: ${missing.length ? missing.join(",") : "none"})`);
console.log(`  directories analyzed: ${allDirs.length}`);
console.log(`  subtrees rolled up: ${Object.keys(bySubtree).length}`);
console.log(`  ghost dirs: ${ghostDirs}`);
console.log(`  by category:`, totalsByCategory);
console.log(`  by utilization:`, totalsByUtilization);
console.log(`  top orphans: ${topOrphans.length} · breakdowns: ${topBreakdowns.length} · ghost nodes: ${topGhostNodes.length} · gaps: ${topGaps.length}`);
console.log(`  L9 node mappings: ${Object.keys(byNodeId).length}`);
