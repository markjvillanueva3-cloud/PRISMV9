#!/usr/bin/env node
/**
 * generate-priority-queue-features.mjs — system-viz augmentation: priority queue.
 *
 * Spec: PRIORITY-QUEUE-MS0 (slot juliett, forge7, 2026-05-16).
 *
 * Reads ROADMAP-CONSOLIDATED.json and emits a single master priority-queue
 * node tree: `ghost.priority_queue` roost + one color-coded `priority-unit`
 * child per remaining unit. Backend-dev units sort to the TOP (priority 0,
 * blue), bridge units in the middle (priority 1, amber), app-functionality
 * everything else (priority 2, green). The visualization makes the pickup
 * order legible and the `priority-queue.mjs` helper consumes the same classify
 * function for runtime pickup decisions.
 *
 * Registered in scripts/regen-viz.mjs FAST[] + spliced by merge-augmentations.mjs.
 * Modeled on generate-bridge-synergy-features.mjs (same augmentation pattern).
 *
 * Usage:  node scripts/generate-priority-queue-features.mjs
 * Exit:   0 ok · 1 inventory missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const PRIORITY_ROOST_ID = "ghost.priority_queue";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const UNIT_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 180;

// Color palette — surfaced as `color` field on each child node so the viz
// renders them distinctly. Standard tailwind 500-tone hexes.
export const COLOR_BACKEND_DEV = "#3b82f6";  // blue
export const COLOR_BRIDGE = "#f59e0b";        // amber
export const COLOR_APP = "#10b981";           // green

export const PRIORITY_BACKEND_DEV = 0;
export const PRIORITY_BRIDGE = 1;
export const PRIORITY_APP = 2;

/** Backend-dev milestone keyword pattern. */
const BACKEND_DEV_MS = /^(BACKEND-DEVTOOLS|RGS|INFRA|HOOK|DEV-VELOCITY|COMMAND-KERNEL|SYSTEM-VIZ|FLEET-REAPER|CLEANUP|TRIBAL-GRAPH|MEMORY|CHECKIN|OLLAMA|AUTOCOMPACT|SLOT-WORKTREE|MISC-TASKS|ROADMAP-CONSOL|PRIORITY-QUEUE|NN-GRAPH|OBSIDIAN-INTELLIGENCE)/i;
const BACKEND_DEV_DOMAINS = new Set(["hooks", "infra", "docs"]);

/**
 * Pure classifier: given a unit shape, return category + priority + color.
 * Bridge units are detected by `source === "bridge"` (set by the emitter).
 */
export function classifyUnit(unit) {
  if (unit && unit.source === "bridge") {
    return { category: "bridge", priority: PRIORITY_BRIDGE, color: COLOR_BRIDGE };
  }
  const ms = String(unit && unit.milestone || "").toUpperCase();
  const dom = String(unit && unit.suggested_domain || "").toLowerCase();
  if (BACKEND_DEV_MS.test(ms) || BACKEND_DEV_DOMAINS.has(dom)) {
    return { category: "backend-dev", priority: PRIORITY_BACKEND_DEV, color: COLOR_BACKEND_DEV };
  }
  return { category: "app-functionality", priority: PRIORITY_APP, color: COLOR_APP };
}

/** Filesystem-safe node id fragment. */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "").slice(0, 80);
  return (!s || s.includes("..")) ? "x" : s;
}

/**
 * Pure: collect every remaining unit from the consolidated inventory, classify,
 * sort by (priority, milestone, unit_id), and emit ghost-roost + children.
 */
export function generate(inventory, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  let roostEmitted = 0;

  // Collect every remaining unit from all sub-inventories, tagging source.
  const all = [];
  for (const u of (Array.isArray(inventory?.pending_units) ? inventory.pending_units : [])) {
    all.push({ ...u, _source: "pending" });
  }
  for (const u of (Array.isArray(inventory?.unconsolidated_prose) ? inventory.unconsolidated_prose : [])) {
    all.push({ ...u, _source: "unconsolidated-prose" });
  }
  const bridge = inventory && inventory.bridge_units ? inventory.bridge_units : {};
  for (const u of (Array.isArray(bridge.wiring) ? bridge.wiring : [])) {
    all.push({ unit_id: u.id, milestone: "BRIDGE-WIRING", title: u.title, source: "bridge", suggested_domain: u.domain, _source: "bridge-wiring", _info: `[${u.engine_count} engines] ${u.intent || ""}` });
  }
  for (const u of (Array.isArray(bridge.deep_integration) ? bridge.deep_integration : [])) {
    all.push({ unit_id: u.id, milestone: "BRIDGE-DEEP", title: u.title, source: "bridge", _source: "bridge-deep", _info: `[${u.from} → ${u.to}] ${u.intent || ""}` });
  }

  // Roost.
  if (!ids.has(PRIORITY_ROOST_ID)) {
    const counts = { backendDev: 0, bridge: 0, app: 0 };
    for (const u of all) {
      const c = classifyUnit(u).category;
      if (c === "backend-dev") counts.backendDev++;
      else if (c === "bridge") counts.bridge++;
      else counts.app++;
    }
    newNodes.push({
      id: PRIORITY_ROOST_ID,
      label: "Priority Queue (pickup order: backend-dev → bridge → app)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${all.length} remaining items · backend-dev ${counts.backendDev} (blue) · bridge ${counts.bridge} (amber) · app ${counts.app} (green). Source: ROADMAP-CONSOLIDATED.json.`,
    });
    ids.add(PRIORITY_ROOST_ID);
    roostEmitted = 1;
  }

  // Stable sort: priority asc → milestone asc → unit_id asc → title asc.
  const decorated = all.map((u, i) => ({ u, c: classifyUnit(u), i }));
  decorated.sort((a, b) =>
    (a.c.priority - b.c.priority) ||
    String(a.u.milestone || "").localeCompare(String(b.u.milestone || "")) ||
    String(a.u.unit_id || "").localeCompare(String(b.u.unit_id || "")) ||
    String(a.u.title || "").localeCompare(String(b.u.title || "")) ||
    (a.i - b.i));

  let emitted = 0, skipped = 0;
  for (const { u, c } of decorated) {
    const key = u.unit_id || u.title || "(no-id)";
    const nid = "ghost.priority." + safeId(key);
    if (ids.has(nid)) { skipped++; continue; }
    const title = String(u.title || u.unit_id || "(untitled)").trim();
    const infoExtras = u._info || String(u.intent || u.evidence || "").slice(0, MAX_INFO);
    newNodes.push({
      id: nid,
      label: `${u.unit_id ? u.unit_id + " · " : ""}${title}`.slice(0, MAX_LABEL),
      layer: UNIT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "priority-unit",
      parent: PRIORITY_ROOST_ID,
      color: c.color,
      priority: c.priority,
      category: c.category,
      milestone: u.milestone || null,
      info: `[${c.category} · p${c.priority} · ${u._source}${u.milestone ? " · " + u.milestone : ""}] ${infoExtras}`.slice(0, 400),
    });
    ids.add(nid);
    emitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      totalUnits: all.length,
      emitted,
      skipped,
      byCategory: decorated.reduce((o, d) => { o[d.c.category] = (o[d.c.category] || 0) + 1; return o; }, {}),
    },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const INVENTORY_PATH = path.join(ROOT, "state/shared/specs/ROADMAP-CONSOLIDATED.json");
const OUT_PATH = path.join(VIZ_DIR, "priority-queue-augmentation.json");

export function main() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error(`FATAL: ${INVENTORY_PATH} missing — run scripts/consolidate-roadmaps.mjs first`);
    return 1;
  }
  let inventory;
  try { inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: inventory parse failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(inventory, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/specs/ROADMAP-CONSOLIDATED.json",
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try { fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost:            ${result.stats.roostEmitted}`);
  console.log(`  total units:      ${result.stats.totalUnits}`);
  console.log(`  emitted:          ${result.stats.emitted}`);
  console.log(`  by category:      ${JSON.stringify(result.stats.byCategory)}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
