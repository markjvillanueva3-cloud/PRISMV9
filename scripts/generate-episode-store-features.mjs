#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-GRAPHITI-WIRE — system-viz augmentation: episode store.
//
// Reads state/shared/episodes.jsonl (graphiti-lite episode store from iter 11)
// and emits `ghost.episode_store` roost + one `episode` child per episode +
// one `entity` child per unique entity name. Operators query the viz to see
// what episodes have touched a given entity.
//
// Pattern modeled on scripts/generate-priority-queue-features.mjs (slot
// juliett 2026-05-16) — same augmentation shape, same roost/leaf hierarchy.
// Registered in scripts/regen-viz.mjs FAST[] + scripts/merge-augmentations.mjs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadStore, summarize } from "./lib/episode-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.episode_store";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CHILD_LAYER = "L9";
export const MAX_EPISODE_LABEL = 80;
export const MAX_ENTITY_CHILDREN = 200;
export const MAX_EPISODE_CHILDREN = 500;

export const COLOR_VALID = "#10b981";
export const COLOR_SUPERSEDED = "#6b7280";
export const COLOR_ENTITY = "#a78bfa";

export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "").slice(0, 80);
  return (!s || s.includes("..")) ? "x" : s;
}

export function generate(store, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];
  let roostEmitted = 0;

  const sum = summarize(store) || { totalEpisodes: 0, validNow: 0, superseded: 0, bySource: {}, tombstoneCount: 0 };

  // Roost.
  if (!ids.has(ROOST_ID)) {
    const sources = Object.keys(sum.bySource).join(", ") || "(none)";
    newNodes.push({
      id: ROOST_ID,
      label: "Episode Store (graphiti-lite)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${sum.totalEpisodes} episodes (${sum.validNow} valid · ${sum.superseded} superseded · ${sum.tombstoneCount} tombstones) · sources: ${sources}. Source: state/shared/episodes.jsonl.`,
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  // Entity-grouped children (one node per unique entity name, info = episode count).
  const entityCounts = new Map();
  for (const ep of store.episodes) {
    if (!Array.isArray(ep.entities)) continue;
    for (const ent of ep.entities) {
      if (!ent || typeof ent.name !== "string") continue;
      const key = ent.name;
      entityCounts.set(key, (entityCounts.get(key) || 0) + 1);
    }
  }
  const sortedEntities = [...entityCounts.entries()].sort((a, b) => b[1] - a[1]);
  let entityEmitted = 0;
  for (const [name, count] of sortedEntities) {
    if (entityEmitted >= MAX_ENTITY_CHILDREN) break;
    const nid = "ghost.episode_entity." + safeId(name);
    if (ids.has(nid)) continue;
    newNodes.push({
      id: nid,
      label: name.slice(0, MAX_EPISODE_LABEL),
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "episode-entity",
      parent: ROOST_ID,
      color: COLOR_ENTITY,
      info: `[entity · ${count} episode${count === 1 ? "" : "s"}] referenced by ${count} graphiti-lite episode${count === 1 ? "" : "s"} — query via tracebackByEntity()`,
    });
    ids.add(nid);
    entityEmitted++;
  }

  // Episode-grouped children (one node per episode, info = body excerpt).
  let episodeEmitted = 0;
  const sortedEpisodes = [...store.episodes].sort((a, b) => String(b.valid_from || "").localeCompare(String(a.valid_from || "")));
  for (const ep of sortedEpisodes) {
    if (episodeEmitted >= MAX_EPISODE_CHILDREN) break;
    const nid = "ghost.episode." + safeId(ep.id);
    if (ids.has(nid)) continue;
    const isValid = !ep.valid_until;
    const body = String(ep.body || "(no body)").split("\n")[0].slice(0, 120);
    newNodes.push({
      id: nid,
      label: `${ep.source}: ${body}`.slice(0, MAX_EPISODE_LABEL),
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "episode",
      parent: ROOST_ID,
      color: isValid ? COLOR_VALID : COLOR_SUPERSEDED,
      info: `[${ep.source}${ep.source_id ? " · " + ep.source_id.slice(0, 10) : ""} · ${ep.valid_from || "?"} → ${ep.valid_until || "current"}] ${body}`,
    });
    ids.add(nid);
    episodeEmitted++;
  }

  return {
    newNodes,
    newEdges,
    stats: {
      roostEmitted,
      totalEpisodes: sum.totalEpisodes,
      validNow: sum.validNow,
      superseded: sum.superseded,
      entitiesUnique: entityCounts.size,
      entityChildrenEmitted: entityEmitted,
      episodeChildrenEmitted: episodeEmitted,
      bySource: sum.bySource,
    },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "episode-store-augmentation.json");

export function main() {
  let store;
  try { store = loadStore(); }
  catch (e) { console.error(`FATAL: loadStore failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(store, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/episodes.jsonl",
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try {
    if (!fs.existsSync(VIZ_DIR)) fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost:            ${result.stats.roostEmitted}`);
  console.log(`  episodes:         ${result.stats.totalEpisodes}`);
  console.log(`  entities-unique:  ${result.stats.entitiesUnique}`);
  console.log(`  entity-children:  ${result.stats.entityChildrenEmitted}`);
  console.log(`  episode-children: ${result.stats.episodeChildrenEmitted}`);
  return 0;
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) process.exit(main());
