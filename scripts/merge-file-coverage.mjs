#!/usr/bin/env node
/**
 * merge-file-coverage.mjs — aggregate 10 agent-findings into one coverage augmentation.
 *
 * Reads:  state/shared/system-viz/agent-findings/{1..10}.json
 * Writes: state/shared/system-viz/file-coverage-augmentation.json
 *
 * Output schema (consumed by merge-augmentations.mjs):
 *   {
 *     generatedAt, schemaVersion: "1.0.0",
 *     totals: { subtreesAnalyzed, byCategory, byUtilization, totalOrphans, totalBreakdowns, totalGaps },
 *     bySubtree: { "<subtree>": { purpose, category, utilization, evidence, totalFiles, totalBytes,
 *                                  orphanCandidates, breakdownSuggestions, utilizationGaps,
 *                                  fromSlice } },
 *     bySlice:   { "1": {...}, ... },     // raw findings per slice for drilldown
 *     topOrphans:        [...],            // top 30 across all slices
 *     topBreakdowns:     [...],            // top 20 across all slices
 *     topUtilizationGaps:[...],            // top 25 across all slices
 *     // Per-L9 graph node mapping:
 *     byNodeId: { "fs.<subtree>": {...subtree-summary...} }
 *   }
 *
 * Run AFTER all 10 agent-findings are written. The merge-augmentations step
 * folds bySubtree+byNodeId into graph nodes so the viewer can surface coverage
 * per filesystem node.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const VIZ_DIR   = path.join(ROOT, "state", "shared", "system-viz");
const FIND_DIR  = path.join(VIZ_DIR, "agent-findings");
const OUT       = path.join(VIZ_DIR, "file-coverage-augmentation.json");

if (!fs.existsSync(FIND_DIR)) {
  console.error(`agent findings dir missing: ${FIND_DIR}`);
  process.exit(2);
}

const findings = [];
const missing = [];
for (let i = 1; i <= 10; i++) {
  const p = path.join(FIND_DIR, `${i}.json`);
  if (!fs.existsSync(p)) { missing.push(i); continue; }
  try {
    findings.push(JSON.parse(fs.readFileSync(p, "utf8")));
  } catch (e) {
    console.error(`  bad JSON in ${p}: ${e.message}`);
    missing.push(i);
  }
}

if (missing.length > 0) {
  console.warn(`⚠ missing/invalid findings: ${missing.join(", ")} — proceeding with ${findings.length}/10 slices`);
}
if (findings.length === 0) {
  console.error(`no findings to merge`);
  process.exit(2);
}

// === Aggregate ===
const bySubtree = {};
const bySlice = {};
const allOrphans = [];
const allBreakdowns = [];
const allGaps = [];
let totalSubtreesAnalyzed = 0;
const byCategory = {};
const byUtilization = {};

for (const f of findings) {
  bySlice[String(f.sliceId)] = {
    sliceId: f.sliceId,
    analyzedAt: f.analyzedAt,
    subtreeCount: (f.subtrees || []).length,
    summary: f.summary || {},
  };
  for (const st of (f.subtrees || [])) {
    // Some agents emit `subtree`, others emit `name` — accept both
    const key = st.subtree || st.name;
    if (!key) continue;
    bySubtree[key] = {
      ...st,
      subtree: key,
      fromSlice: f.sliceId,
    };
    totalSubtreesAnalyzed++;
    if (st.category) byCategory[st.category] = (byCategory[st.category] || 0) + 1;
    // Normalize utilization to one of the four canonical buckets — some agents
    // emitted full paragraphs here. Match by leading keyword.
    let util = (st.utilization || "").toString().toLowerCase();
    if (util.startsWith("active") || util.includes("hot")) util = "active";
    else if (util.startsWith("partial") || util.startsWith("mixed")) util = "partial";
    else if (util.startsWith("inactive") || util.startsWith("cold") || util.startsWith("stale")) util = "inactive";
    else if (util.startsWith("orphan")) util = "orphaned";
    else util = "unknown";
    bySubtree[key].utilization = util;
    byUtilization[util] = (byUtilization[util] || 0) + 1;
    for (const o of (st.orphanCandidates || [])) allOrphans.push({ ...o, subtree: key, sliceId: f.sliceId });
    for (const b of (st.breakdownSuggestions || [])) allBreakdowns.push({ ...b, subtree: key, sliceId: f.sliceId });
    for (const g of (st.utilizationGaps || [])) {
      const text = typeof g === "string" ? g : (g.gap || g.text || JSON.stringify(g));
      allGaps.push({ gap: text, subtree: key, sliceId: f.sliceId });
    }
  }
  // Slice-level top lists (slice 6 + 9 + 10 emit these)
  for (const o of (f.summary?.topOrphans || [])) allOrphans.push({ ...o, sliceId: f.sliceId });
  for (const b of (f.summary?.topBreakdowns || [])) allBreakdowns.push({ ...b, sliceId: f.sliceId });
  for (const g of (f.summary?.crossCuttingGaps || [])) {
    const text = typeof g === "string" ? g : (g.gap || g.text || JSON.stringify(g));
    allGaps.push({ gap: text, sliceId: f.sliceId });
  }
}

// Rank top items by simple heuristics:
//   orphans — by size desc (largest stale first)
//   breakdowns — by reason length / sprawl markers
//   gaps — preserve order, dedup
allOrphans.sort((a, b) => (b.size || 0) - (a.size || 0));
const topOrphans = allOrphans.slice(0, 30);
const topBreakdowns = allBreakdowns.slice(0, 20);
const seenGap = new Set();
const topUtilizationGaps = [];
for (const g of allGaps) {
  const key = (g.gap || "").toLowerCase().slice(0, 80);
  if (seenGap.has(key)) continue;
  seenGap.add(key);
  topUtilizationGaps.push(g);
  if (topUtilizationGaps.length >= 25) break;
}

// === Map subtree -> L9 graph node ID ===
// L9 nodes are emitted as `fs.<subtree-lowercased-with-spaces-as-underscores>` for prism subtrees,
// and `fs.h.<...>` for non-prism H: roots. Subtree keys in census use the raw dir name.
function subtreeToNodeId(subtree) {
  if (!subtree || subtree === "(root)") return "fs._root";
  return `fs.${subtree.replace(/\s+/g, "_").toLowerCase()}`;
}
const byNodeId = {};
for (const [subtree, info] of Object.entries(bySubtree)) {
  byNodeId[subtreeToNodeId(subtree)] = info;
}

const out = {
  generatedAt: new Date().toISOString(),
  schemaVersion: "1.0.0",
  totals: {
    slicesProcessed: findings.length,
    slicesMissing: missing,
    subtreesAnalyzed: totalSubtreesAnalyzed,
    byCategory,
    byUtilization,
    totalOrphans: allOrphans.length,
    totalBreakdowns: allBreakdowns.length,
    totalGaps: allGaps.length,
  },
  bySlice,
  bySubtree,
  byNodeId,
  topOrphans,
  topBreakdowns,
  topUtilizationGaps,
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${OUT}`);
console.log(`  slices processed: ${findings.length}/10  (missing: ${missing.length ? missing.join(",") : "none"})`);
console.log(`  subtrees analyzed: ${totalSubtreesAnalyzed}`);
console.log(`  by category:`, byCategory);
console.log(`  by utilization:`, byUtilization);
console.log(`  orphan candidates: ${allOrphans.length} (top 30 saved)`);
console.log(`  breakdown suggestions: ${allBreakdowns.length} (top 20 saved)`);
console.log(`  utilization gaps: ${allGaps.length} (top 25 deduped saved)`);
console.log(`  L9 node mappings: ${Object.keys(byNodeId).length}`);
