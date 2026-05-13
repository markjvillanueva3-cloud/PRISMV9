#!/usr/bin/env node
/**
 * duplication-guard.mjs — HOOK-SYNERGY-MS0 / U-HOOK-COMPRESS (H9)
 *
 * Shared duplication-search engine for hooks. Replaces inline regex-and-JSON
 * lookups previously copy-pasted into multiple `.claude/hooks/*.mjs` files.
 *
 * SOURCES (queried in this order — first match wins per asset name):
 *   1. cross-session-asset-registry.json (canonical cross-chat asset registry)
 *   2. src/engines/index.ts                (export-statement / class-name scan)
 *
 * EXPORTS
 *   findSimilarAssets(name, opts?) → string[]   — top-K canonical names that
 *     fuzzy-match `name` after stripping the standard suffixes (Engine/Algorithm
 *     /Hook) and lowering. Returns at most `opts.max` (default 5) distinct hits.
 *   normalizeForSearch(name)        → string     — exposed so callers can build
 *     their own match sets without duplicating the suffix-strip rules.
 *
 * NEVER THROWS — every fs read is wrapped; missing/corrupt sources return [].
 * Pure read; no I/O on the search path beyond the two source files.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

const REGISTRY_PATH = "H:/prism/mcp-server/data/state/cross-session-asset-registry.json";
const ENGINES_INDEX = "H:/prism/mcp-server/src/engines/index.ts";
const DEFAULT_MAX = 5;
const ABSOLUTE_MAX = 20;
const SUFFIXES = /(Engine|Algorithm|Hook|Dispatcher)$/;

/**
 * Strip type-suffix + non-alphanumerics + case. The result is what we compare
 * substring-against to decide whether two asset names refer to the same idea.
 */
export function normalizeForSearch(name) {
  return String(name || "")
    .replace(SUFFIXES, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * @param {string} assetName    Proposed asset name (with or without suffix).
 * @param {{max?:number, type?:"engine"|"algorithm"|"hook"|"dispatcher"}} [opts]
 * @returns {string[]} Distinct canonical names matching the proposed asset.
 */
export function findSimilarAssets(assetName, opts = {}) {
  const target = normalizeForSearch(assetName);
  if (!target) return [];
  const cap = Math.max(1, Math.min(ABSOLUTE_MAX, Math.floor(opts.max || DEFAULT_MAX)));
  const hits = new Set();

  // 1) cross-session asset registry
  // Shape is {assets: {engines: {Name: {...}}, hooks: {...}, actions: {...}, skills: {...}}}
  // (per cross-session-asset-registry.json v1+). We walk every bucket and match by key name.
  try {
    const reg = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
    const buckets = reg && typeof reg.assets === "object" && reg.assets ? reg.assets : {};
    // If a `type` filter was given, restrict to that bucket; else walk all.
    const wantedBuckets = opts.type ? [opts.type + "s"] : Object.keys(buckets);
    for (const bucket of wantedBuckets) {
      const entries = buckets[bucket];
      if (!entries || typeof entries !== "object") continue;
      for (const assetName of Object.keys(entries)) {
        const norm = normalizeForSearch(assetName);
        if (!norm) continue;
        if (norm === target || norm.includes(target) || target.includes(norm)) {
          hits.add(assetName);
          if (hits.size >= cap) break;
        }
      }
      if (hits.size >= cap) break;
    }
  } catch { /* missing or malformed → skip silently */ }

  // 2) src/engines/index.ts — both `export { Foo }` style + bare `FooEngine` class names
  if (hits.size < cap) {
    try {
      const src = readFileSync(ENGINES_INDEX, "utf8");
      // a) explicit `export { Name }` (or `export { Name as Alias }`) — we take Alias
      for (const m of src.matchAll(/export\s*\{\s*([\w]+)(?:\s+as\s+([\w]+))?\s*\}/g)) {
        const exported = m[2] || m[1];
        if (normalizeForSearch(exported).includes(target)) hits.add(exported);
        if (hits.size >= cap) break;
      }
      // b) bare `FooEngine` mentions (catches `export class FooEngine` etc.)
      if (hits.size < cap) {
        for (const m of src.matchAll(/\b(\w+(?:Engine|Algorithm))\b/g)) {
          const cls = m[1];
          if (normalizeForSearch(cls).includes(target)) hits.add(cls);
          if (hits.size >= cap) break;
        }
      }
    } catch { /* skip silently */ }
  }

  return Array.from(hits).slice(0, cap);
}

/**
 * @param {string} filePath Absolute or repo-relative path being created.
 * @returns {{name:string, type:"engine"|"algorithm"|"hook"|"dispatcher"|"unknown"}}
 */
export function classifyAsset(filePath) {
  const norm = String(filePath || "").replace(/\\/g, "/");
  const name = basename(norm).replace(/\.(ts|js|mjs)$/, "");
  let type = "unknown";
  if (norm.includes("/engines/")) type = "engine";
  else if (norm.includes("/algorithms/")) type = "algorithm";
  else if (norm.includes("/hooks/")) type = "hook";
  else if (norm.includes("/dispatchers/")) type = "dispatcher";
  return { name, type };
}
