#!/usr/bin/env node
/**
 * generate-bridge-priority-features.mjs — system-viz augmentation:
 * unwired-engine bridge-priority layer.
 *
 * COMBO-EFFICIENCY-MS0 / P1-U03 follow-up (slot:alpha 2026-05-25).
 *
 * Reads `state/shared/UNWIRED-BRIDGES-TOP10.json` (produced by
 * scripts/unwired-bridge-rank.mjs) and emits a system-viz augmentation:
 *   - parent roost `ghost.bridge_priority` (kind ghost-roost, under
 *     `ghost.planned_features`).
 *   - one `unwired-bridge` child per ranked engine, tier-coloured.
 *
 * Closes the COMBO-EFFICIENCY synergy loop:
 *   P1-U03 ranks unwired engines by fan-in → THIS GENERATOR surfaces them
 *   in /system-viz so the operator can see WHICH engines to wire FIRST.
 *
 * Modeled on scripts/generate-bridge-synergy-features.mjs.
 *
 * Register in:
 *   scripts/regen-viz.mjs FAST[]                (entry: "generate-bridge-priority-features.mjs")
 *   scripts/merge-augmentations.mjs splice list (filename auto-detect)
 *
 * Usage:  node scripts/generate-bridge-priority-features.mjs
 * Exit:   0 ok · 1 source missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.bridge_priority";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const UNIT_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 180;

// Tier-to-color mapping (consumed by system-viz renderer hint).
// Aligned with unwired-bridge-rank.mjs tier classifier.
export const TIER_COLOR = {
  platinum: "#FFCC00",   // strongest leverage — wire FIRST
  gold:     "#FF9933",   // solid bridge candidate
  silver:   "#CC6633",   // ≥2 referrers
  fringe:   "#666666",   // likely orphan / import-only
};

export const TIER_ICON = {
  platinum: "💎",
  gold:     "🌟",
  silver:   "🥈",
  fringe:   "⚪",
};

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const SOURCE_PATH = path.join(ROOT, "state/shared/UNWIRED-BRIDGES-TOP10.json");
const OUT_PATH = path.join(VIZ_DIR, "bridge-priority-augmentation.json");

/** Filesystem-safe node id fragment. */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 80);
  if (!s || s.includes("..")) return "x";
  return s;
}

/**
 * Pure: build {newNodes, newEdges, stats} from an unwired-bridges ranking.
 * @param {object} ranking - parsed UNWIRED-BRIDGES-TOP10.json
 * @param {Set<string>|Array<string>} existingNodeIds - graph ids to skip
 * @param {object} opts - {topK?: limit emitted bridge nodes}
 */
export function generate(ranking, existingNodeIds = [], opts = {}) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const rankings = ranking && Array.isArray(ranking.rankings) ? ranking.rankings : [];
  const topK = typeof opts.topK === "number" && opts.topK > 0 ? Math.floor(opts.topK) : rankings.length;
  const sliced = rankings.slice(0, topK);

  const newNodes = [];
  let roostEmitted = 0;

  if (!ids.has(ROOST_ID)) {
    const tierCounts = ranking && ranking.tierCounts ? ranking.tierCounts : {};
    const unwiredCount = typeof ranking?.unwiredCount === "number" ? ranking.unwiredCount : sliced.length;
    const tierSummary = Object.entries(tierCounts)
      .filter(([_, n]) => typeof n === "number" && n > 0)
      .map(([tier, n]) => `${TIER_ICON[tier] || ""}${n} ${tier}`)
      .join(" · ");
    newNodes.push({
      id: ROOST_ID,
      label: "Unwired Bridge Priority (wire these FIRST)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${unwiredCount} unwired engines ranked by reference fan-in (P1-U03). ${tierSummary || "no tier data"}. Source: state/shared/UNWIRED-BRIDGES-TOP10.json. Wiring a platinum-tier engine unblocks the most downstream consumers.`.slice(0, MAX_INFO * 2),
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  let unitsEmitted = 0;
  let skipped = 0;
  let platinumCount = 0;
  let goldCount = 0;
  let silverCount = 0;
  let fringeCount = 0;

  for (let i = 0; i < sliced.length; i++) {
    const r = sliced[i];
    if (!r || typeof r.name !== "string") { skipped++; continue; }
    const nid = "ghost.unwired-bridge." + safeId(r.name);
    if (ids.has(nid)) { skipped++; continue; }
    const tier = typeof r.tier === "string" ? r.tier : "fringe";
    const icon = TIER_ICON[tier] || "⚪";
    const color = TIER_COLOR[tier] || TIER_COLOR.fringe;
    const fanIn = typeof r.fanIn === "number" ? r.fanIn : 0;
    const sampleFilesStr = Array.isArray(r.sampleFiles) && r.sampleFiles.length > 0
      ? r.sampleFiles.slice(0, 3).map((f) => path.basename(f)).join(", ")
      : "n/a";
    newNodes.push({
      id: nid,
      label: `${icon} #${i + 1} ${r.name} (${fanIn} refs)`.slice(0, MAX_LABEL),
      layer: UNIT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "unwired-bridge",
      parent: ROOST_ID,
      color,
      info: `[${tier}-tier · rank ${i + 1}] ${r.name} — ${fanIn} reference(s) in mcp-server/src/. Sample referrers: ${sampleFilesStr}. Wiring this engine unblocks downstream consumers that name it but cannot dispatch.`.slice(0, MAX_INFO * 2),
    });
    ids.add(nid);
    unitsEmitted++;
    if (tier === "platinum") platinumCount++;
    else if (tier === "gold") goldCount++;
    else if (tier === "silver") silverCount++;
    else fringeCount++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      rankingsAvailable: rankings.length,
      topK,
      unitsEmitted,
      skipped,
      tierCounts: { platinum: platinumCount, gold: goldCount, silver: silverCount, fringe: fringeCount },
    },
  };
}

export function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`FATAL: ${SOURCE_PATH} missing — run scripts/unwired-bridge-rank.mjs first`);
    return 1;
  }
  let ranking;
  try { ranking = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: ranking parse failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(ranking, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/UNWIRED-BRIDGES-TOP10.json",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(JSON.stringify({
    ok: true,
    written: OUT_PATH,
    roostEmitted: result.stats.roostEmitted,
    unitsEmitted: result.stats.unitsEmitted,
    tierCounts: result.stats.tierCounts,
  }));
  return 0;
}

const isMain = (() => {
  try {
    const invokedAs = process.argv[1] && path.resolve(process.argv[1]);
    const selfPath = fileURLToPath(import.meta.url);
    return invokedAs && path.resolve(selfPath) === invokedAs;
  } catch { return false; }
})();
if (isMain) {
  process.exit(main());
}
