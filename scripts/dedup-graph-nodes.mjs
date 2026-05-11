#!/usr/bin/env node
/**
 * dedup-graph-nodes.mjs — merge duplicate-id nodes in system-graph.json
 * by keeping the most-informative copy (more fields, prefer one with
 * reclassifyReason) and dropping the rest.
 *
 * After: every node id is unique. Edges remain intact.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");

function richness(n) {
  let score = 0;
  for (const k of Object.keys(n)) {
    if (n[k] != null && n[k] !== "") score++;
  }
  // Strongly prefer reclassified nodes (they have current parent info)
  if (n.reclassifyReason || n.reclassifiedFrom) score += 100;
  // Prefer atomic_engine over rollup duplicates
  if (n.subgroup === "atomic_engine") score += 20;
  return score;
}

const t0 = Date.now();
const G = JSON.parse(fs.readFileSync(GRAPH, "utf8"));

const byId = new Map();
const dupGroups = new Map();
for (const n of G.nodes) {
  if (!byId.has(n.id)) {
    byId.set(n.id, n);
    continue;
  }
  if (!dupGroups.has(n.id)) dupGroups.set(n.id, [byId.get(n.id)]);
  dupGroups.get(n.id).push(n);
}

let kept = 0, merged = 0;
for (const group of dupGroups.values()) {
  // Pick winner by richness; merge non-conflicting fields from losers
  group.sort((a, b) => richness(b) - richness(a));
  const winner = group[0];
  for (let i = 1; i < group.length; i++) {
    const loser = group[i];
    for (const [k, v] of Object.entries(loser)) {
      if (winner[k] == null || winner[k] === "") winner[k] = v;
    }
  }
  kept++;
  merged += group.length - 1;
}

// Rebuild nodes array: keep only one instance per id
const seen = new Set();
const out = [];
for (const n of G.nodes) {
  if (seen.has(n.id)) continue;
  seen.add(n.id);
  out.push(byId.get(n.id));
}
const before = G.nodes.length;
G.nodes = out;

G.dedupedAt = new Date().toISOString();
G.dedupStats = { duplicateGroups: dupGroups.size, nodesRemoved: merged, before, after: G.nodes.length };

fs.writeFileSync(GRAPH, JSON.stringify(G));
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`deduped in ${elapsed}s`);
console.log(`  duplicate id groups: ${dupGroups.size}`);
console.log(`  nodes removed:       ${merged}`);
console.log(`  nodes before:        ${before}`);
console.log(`  nodes after:         ${G.nodes.length}`);
