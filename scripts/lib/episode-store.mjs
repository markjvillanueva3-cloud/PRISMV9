#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-GRAPHITI-LITE - pure-Node episode store mirroring
// the getzep/graphiti data model (episode + entity + relationship + temporal
// validity window + provenance traceback) WITHOUT requiring Kuzu / Neo4j /
// FalkorDB. Backing store: JSONL append-only at state/shared/episodes.jsonl.
// Matches the existing ledger pattern (scrutiny-ledger, error-pattern-promote,
// golf-envelope-mutations).
//
// Data model:
//   Episode  = { id, source, source_id, body, valid_from, valid_until?,
//                entities[], relationships[], superseded_reason? }
//   Entity   = { name, type? }
//   Relation = { from, to, kind, valid_from }
//
// Temporal semantics:
//   - Episodes are IMMUTABLE once written (append-only).
//   - A new episode that contradicts an older one appends a tombstone-line:
//     { tombstone: true, target_id, valid_until }. Readers fold tombstones at
//     load time (sets valid_until on the target episode).
//   - "What was true at T?" = filter where valid_from <= T < valid_until.

import { existsSync, mkdirSync, readFileSync, appendFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

const DEFAULT_STORE_PATH = "H:/prism/state/shared/episodes.jsonl";
const MAX_BODY_BYTES = 4000;

export function generateEpisodeId() {
  return `ep-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

export function buildEpisode({
  source,
  source_id,
  body,
  valid_from = null,
  entities = [],
  relationships = [],
  metadata = null,
}) {
  if (typeof source !== "string" || source.length === 0) {
    throw new Error("buildEpisode: source required (e.g. git-commit, scrutiny-ledger, memory-write)");
  }
  if (typeof body !== "string") {
    throw new Error("buildEpisode: body must be a string");
  }
  return {
    id: generateEpisodeId(),
    source,
    source_id: source_id ?? null,
    body: body.length > MAX_BODY_BYTES ? body.slice(0, MAX_BODY_BYTES) + "\n...(truncated)" : body,
    valid_from: valid_from || new Date().toISOString(),
    entities: Array.isArray(entities) ? entities.filter((e) => e && typeof e === "object" && typeof e.name === "string") : [],
    relationships: Array.isArray(relationships) ? relationships.filter((r) => r && typeof r === "object" && typeof r.from === "string" && typeof r.to === "string") : [],
    metadata: metadata && typeof metadata === "object" ? metadata : null,
  };
}

export function appendEpisode(ep, opts = {}) {
  const path = opts.storePath || DEFAULT_STORE_PATH;
  const writeImpl = opts.writeImpl || appendFileSync;
  const mkdirImpl = opts.mkdirImpl || mkdirSync;
  const existsImpl = opts.existsImpl || existsSync;
  const dir = dirname(path);
  if (!existsImpl(dir)) mkdirImpl(dir, { recursive: true });
  writeImpl(path, JSON.stringify(ep) + "\n", "utf8");
  return ep.id;
}

export function appendTombstone({ target_id, valid_until, reason = null }, opts = {}) {
  if (typeof target_id !== "string" || target_id.length === 0) {
    throw new Error("appendTombstone: target_id required");
  }
  const path = opts.storePath || DEFAULT_STORE_PATH;
  const writeImpl = opts.writeImpl || appendFileSync;
  const mkdirImpl = opts.mkdirImpl || mkdirSync;
  const existsImpl = opts.existsImpl || existsSync;
  const dir = dirname(path);
  if (!existsImpl(dir)) mkdirImpl(dir, { recursive: true });
  const tombstone = {
    tombstone: true,
    target_id,
    valid_until: valid_until || new Date().toISOString(),
    reason: typeof reason === "string" ? reason : null,
  };
  writeImpl(path, JSON.stringify(tombstone) + "\n", "utf8");
}

export function loadStore(opts = {}) {
  const path = opts.storePath || DEFAULT_STORE_PATH;
  const readImpl = opts.readImpl || readFileSync;
  const existsImpl = opts.existsImpl || existsSync;
  if (!existsImpl(path)) return { episodes: [], byId: new Map(), tombstoneCount: 0, skippedLines: 0 };
  let raw;
  try { raw = readImpl(path, "utf8"); } catch { return { episodes: [], byId: new Map(), tombstoneCount: 0, skippedLines: 0 }; }
  const episodes = [];
  const byId = new Map();
  const tombstones = [];
  let skippedLines = 0;
  for (const line of raw.split("\n")) {
    if (line.length === 0) continue;
    let obj;
    try { obj = JSON.parse(line); }
    catch { skippedLines++; continue; }
    if (!obj || typeof obj !== "object") { skippedLines++; continue; }
    if (obj.tombstone === true && typeof obj.target_id === "string") {
      tombstones.push(obj);
      continue;
    }
    if (typeof obj.id !== "string") { skippedLines++; continue; }
    episodes.push(obj);
    byId.set(obj.id, obj);
  }
  for (const t of tombstones) {
    const ep = byId.get(t.target_id);
    if (ep) {
      ep.valid_until = t.valid_until;
      if (t.reason) ep.superseded_reason = t.reason;
    }
  }
  return { episodes, byId, tombstoneCount: tombstones.length, skippedLines };
}

export function queryEpisodes(store, predicate, opts = {}) {
  if (!store || !Array.isArray(store.episodes)) return [];
  const limit = Number.isFinite(opts.limit) ? opts.limit : Infinity;
  const out = [];
  for (const ep of store.episodes) {
    if (typeof predicate === "function" && !predicate(ep)) continue;
    out.push(ep);
    if (out.length >= limit) break;
  }
  return out;
}

export function episodesAt(store, isoTimestamp, opts = {}) {
  return queryEpisodes(store, (ep) => {
    if (ep.valid_from && ep.valid_from > isoTimestamp) return false;
    if (ep.valid_until && ep.valid_until <= isoTimestamp) return false;
    return true;
  }, opts);
}

export function tracebackByEntity(store, entityName, opts = {}) {
  if (typeof entityName !== "string" || entityName.length === 0) return [];
  const norm = entityName.toLowerCase();
  return queryEpisodes(store, (ep) => {
    if (!Array.isArray(ep.entities)) return false;
    return ep.entities.some((e) => e && typeof e.name === "string" && e.name.toLowerCase() === norm);
  }, opts);
}

export function summarize(store) {
  if (!store) return null;
  const valid = store.episodes.filter((ep) => !ep.valid_until).length;
  const superseded = store.episodes.length - valid;
  const bySource = new Map();
  for (const ep of store.episodes) {
    bySource.set(ep.source, (bySource.get(ep.source) || 0) + 1);
  }
  return {
    totalEpisodes: store.episodes.length,
    validNow: valid,
    superseded,
    tombstoneCount: store.tombstoneCount || 0,
    skippedLines: store.skippedLines || 0,
    bySource: Object.fromEntries(bySource),
  };
}

export function statsFromPath(opts = {}) {
  const path = opts.storePath || DEFAULT_STORE_PATH;
  const existsImpl = opts.existsImpl || existsSync;
  const statImpl = opts.statImpl || statSync;
  if (!existsImpl(path)) return { exists: false };
  let size = 0;
  try { size = statImpl(path).size; } catch { /* ignore */ }
  const store = loadStore(opts);
  return { exists: true, sizeBytes: size, ...summarize(store) };
}

export const __test_constants = {
  DEFAULT_STORE_PATH,
  MAX_BODY_BYTES,
};
