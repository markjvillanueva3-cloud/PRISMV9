// scripts/lib/token-savings-misc.mjs
// ----------------------------------
// Covers gaps D2 (cross-session stable-lookup cache), D3 (wiki-entry response
// cache), E1 (per-tool token-cost dashboard), E2 (top-cost-tools report).
// Pure functions; IO wrappers are minimal.
//
// D2: stable lookups (ENGINE_DIGEST, dispatcher actions) — cache with TTL.
// D3: wiki entry response cache — session-scoped.
// E1: aggregate per-tool counts from existing sidecar telemetry.
// E2: format top-N report from E1 aggregate.

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";

// --- D2 — Cross-session stable cache ---

const STABLE_CACHE_FILE = "H:/prism/state/shared/cross-session-stable-cache.json";
const STABLE_TTL_HOURS = 24;

export function readStableCache(path = STABLE_CACHE_FILE) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { return { schemaVersion: "1.0.0", entries: {} }; }
}

export function isStableHit(cache, key, ttlHours = STABLE_TTL_HOURS, now = Date.now()) {
  if (!cache || !cache.entries) return false;
  const e = cache.entries[key];
  if (!e) return false;
  const ageMs = now - e.ts;
  return ageMs < ttlHours * 3600 * 1000;
}

export function writeStable(cache, key, value, now = Date.now()) {
  const base = cache && typeof cache === "object" ? cache : { schemaVersion: "1.0.0", entries: {} };
  const entries = { ...(base.entries || {}) };
  entries[key] = { ts: now, value };
  return { ...base, entries };
}

// --- D3 — Wiki-entry response cache (session-scoped) ---

const WIKI_CACHE_FILE = "H:/prism/state/shared/wiki-response-cache.json";
const WIKI_TTL_MIN = 30;

export function wikiCacheGet(cache, slug, sessionId, ttlMin = WIKI_TTL_MIN, now = Date.now()) {
  if (!cache || !cache.entries) return null;
  const e = cache.entries[`${sessionId}::${slug}`];
  if (!e) return null;
  if ((now - e.ts) >= ttlMin * 60 * 1000) return null;
  return e.value;
}

export function wikiCachePut(cache, slug, sessionId, value, now = Date.now()) {
  const base = cache && typeof cache === "object" ? cache : { schemaVersion: "1.0.0", entries: {} };
  const entries = { ...(base.entries || {}) };
  entries[`${sessionId}::${slug}`] = { ts: now, value };
  return { ...base, entries };
}

// --- E1 — Per-tool token-cost aggregator ---

/**
 * Pure: aggregate route-suggest sidecar's byToolName into a cost estimate.
 * cost = fires × CLAUDE_TOKEN_COST_PER_FIRE (approximate, configurable).
 */
export function aggregateToolCosts(sidecar, costPerFire = 8000) {
  if (!sidecar || !sidecar.byToolName) return [];
  return Object.entries(sidecar.byToolName)
    .map(([tool, fires]) => ({ tool, fires, estTokens: fires * costPerFire }))
    .sort((a, b) => b.estTokens - a.estTokens);
}

// --- E2 — Top-cost-tools report ---

export function formatTopCostReport(aggregate, topN = 5) {
  if (!Array.isArray(aggregate) || aggregate.length === 0) return "_No per-tool cost data yet._";
  const shown = aggregate.slice(0, topN);
  const lines = [
    `## 💸 Top ${shown.length} token-cost tools (est)`,
    "",
    "| Tool | Fires | Est. tokens |",
    "|---|---|---|",
  ];
  for (const r of shown) lines.push(`| ${r.tool} | ${r.fires} | ~${(r.estTokens/1000).toFixed(0)}K |`);
  lines.push("", "_Estimate: fires × ~8K tokens/fire (route-suggest sidecar). Adjust by measured per-tool average if available._");
  return lines.join("\n");
}

// --- shared IO helpers ---

export function ensureDir(path) {
  try { if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true }); }
  catch { /* tolerate */ }
}

export function safeWriteJson(path, obj) {
  try {
    ensureDir(path);
    writeFileSync(path, JSON.stringify(obj, null, 2), "utf8");
    return true;
  } catch { return false; }
}
