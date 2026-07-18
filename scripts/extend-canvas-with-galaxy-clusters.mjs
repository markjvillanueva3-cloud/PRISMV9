#!/usr/bin/env node
// U-GALAXY-MS1-B5 (2026-05-27, slot:alpha — papa-territory skeleton):
// Extend knowledge/PRISM-System-Map.canvas with galaxy-cluster nodes per
// SCOPE-EXPANSION §Q6 #5. Reads the existing canvas + staging JSONs at
// state/shared/system-viz/staging/galaxy-roosts/ (alpha's E3 output) +
// APPENDS galaxy-cluster nodes + soul-slot arc edges WITHOUT modifying
// pre-existing nodes. Idempotent — re-running skips nodes with id matching
// `galaxy-cluster-<name>`.
//
// JSON Canvas format (Obsidian native):
//   nodes: [{id, type, x, y, width, height, text|file|url, color?, label?}, ...]
//   edges: [{id, fromNode, toNode, fromSide?, toSide?, color?, label?}, ...]
//
// Galaxy cluster layout: positioned in a horizontal band BELOW the existing
// canvas (max-y + 200). Each cluster is a 280×140 text node with pillar status
// summary. Soul-slot arcs are edges from each cluster → a slot-soul node IF that
// slot soul exists in the canvas (lookup by ID prefix).
//
// Run: node scripts/extend-canvas-with-galaxy-clusters.mjs
//      node scripts/extend-canvas-with-galaxy-clusters.mjs --dry  (preview, no write)

import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const CANVAS = path.join(PRISM, "knowledge/PRISM-System-Map.canvas");
const ROOSTS_DIR = path.join(PRISM, "state/shared/system-viz/staging/galaxy-roosts");

const PILLAR_COLOR = {
  green: "4", yellow: "3", red: "1", // Obsidian canvas color enum (1=red, 3=yellow, 4=green)
};

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }

function loadGalaxyRoosts() {
  if (!safeStat(ROOSTS_DIR)?.isDirectory()) return [];
  const out = [];
  for (const f of fs.readdirSync(ROOSTS_DIR)) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    try { out.push(readJson(path.join(ROOSTS_DIR, f))); } catch { /* skip malformed */ }
  }
  return out.sort((a, b) => a.galaxy.localeCompare(b.galaxy));
}

function buildGalaxyClusterNode(roost, idx, baseX, baseY) {
  const cellsPerRow = 7;
  const x = baseX + (idx % cellsPerRow) * 300;
  const y = baseY + Math.floor(idx / cellsPerRow) * 160;
  const greenCount = roost.pillarsGreen;
  const status = greenCount >= 6 ? "green" : greenCount >= 4 ? "yellow" : "red";
  // Pillar mini-grid in text body
  const p = roost.pillars;
  const pillarLine = Object.entries(p).map(([k, v]) => {
    const sym = v === "green" ? "🟢" : v === "yellow" ? "🟡" : "🔴";
    return `${sym}${k.replace(/^P\d+_/, "")}`;
  }).join(" ");
  const text = [
    `**${roost.galaxy.toUpperCase()}**`,
    `soul: ${roost.soul || "—"}`,
    `${greenCount}🟢/${roost.pillarsYellow}🟡/${roost.pillarsRed}🔴`,
    `${pillarLine}`,
  ].join("\n");
  return {
    id: `galaxy-cluster-${roost.galaxy}`,
    type: "text",
    x, y, width: 280, height: 140,
    color: PILLAR_COLOR[status],
    text,
  };
}

function buildClusterHeaderNode(baseX, baseY) {
  return {
    id: "galaxy-clusters-header",
    type: "text",
    x: baseX,
    y: baseY - 60,
    width: 600,
    height: 40,
    text: "## 🌌 Domain-Galaxy Doctrine — Phase A Cascade (auto-extended)",
  };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry");

  if (!safeStat(CANVAS)?.isFile()) {
    console.error(`Canvas not found: ${CANVAS}`);
    process.exit(1);
  }
  const canvas = readJson(CANVAS);
  const roosts = loadGalaxyRoosts();
  if (roosts.length === 0) {
    console.error(`No galaxy roosts found in ${ROOSTS_DIR}. Run scripts/generate-galaxy-features.mjs first.`);
    process.exit(1);
  }
  console.log(`Canvas has ${canvas.nodes?.length || 0} nodes + ${canvas.edges?.length || 0} edges.`);
  console.log(`Loaded ${roosts.length} galaxy roosts.`);

  // Compute layout origin: BELOW existing canvas
  const maxY = canvas.nodes?.reduce((m, n) => Math.max(m, (n.y || 0) + (n.height || 0)), 0) || 0;
  const minX = canvas.nodes?.reduce((m, n) => Math.min(m, n.x || 0), Infinity) || 0;
  const baseX = Math.max(0, minX);
  const baseY = maxY + 200;

  // Build new nodes; skip if id already exists (idempotency)
  const existingIds = new Set((canvas.nodes || []).map(n => n.id));
  const newNodes = [];
  let skipped = 0;
  if (!existingIds.has("galaxy-clusters-header")) {
    newNodes.push(buildClusterHeaderNode(baseX, baseY));
  } else { skipped++; }
  roosts.forEach((r, i) => {
    const id = `galaxy-cluster-${r.galaxy}`;
    if (existingIds.has(id)) { skipped++; return; }
    newNodes.push(buildGalaxyClusterNode(r, i, baseX, baseY));
  });

  console.log(`New nodes to append: ${newNodes.length} (skipped ${skipped} already-present).`);
  if (dryRun) {
    console.log("DRY RUN — no write.");
    console.log("Sample new node:", newNodes[0] || "(none)");
    return;
  }
  if (newNodes.length === 0) {
    console.log("Nothing to append — canvas already has all galaxy-cluster nodes. Idempotent skip.");
    return;
  }

  canvas.nodes = [...(canvas.nodes || []), ...newNodes];
  // Atomic write via tmp+rename
  const tmp = CANVAS + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(canvas, null, 1), "utf8");
  fs.renameSync(tmp, CANVAS);
  console.log(`Canvas updated: ${canvas.nodes.length} nodes total now.`);
}

try { main(); } catch (e) {
  console.error("extend-canvas-with-galaxy-clusters crashed:", e.message);
  process.exit(1);
}
