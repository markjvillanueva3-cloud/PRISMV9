#!/usr/bin/env node
/**
 * generate-wiki-tribal-features.mjs — system-viz augmentation: wiki↔tribal
 * coverage roost.
 *
 * Iter 9 of the /goal synergize loop (echo, 2026-05-21). Mirror of iter-6's
 * generate-link-audit-features.mjs for the wiki-tribal substrate. Completes
 * the producer (iter-7) → consumer (iter-8) → viz (iter-9) triplet.
 *
 * Reads `state/shared/.wiki-tribal-cross-ref-audit.json` and emits a
 * system-viz augmentation that adds:
 *   - one parent ghost roost `ghost.wiki_tribal_coverage` under
 *     `ghost.planned_features`
 *   - one `missing-coverage` child per top-N missing-from-tribal wiki path
 *
 * 23,802 missing entries would explode the graph; default topN=50, hard
 * cap=200. Same identity rule as iter-6 link-audit: node id is the wiki
 * path only (no source-file hash), so wiki rename never spawns a stale
 * orphan AND a re-embed simply drops the node from the next augmentation.
 *
 * Output: state/shared/system-viz/wiki-tribal-augmentation.json
 *
 * Knobs:
 *   PRISM_WIKI_TRIBAL_VIZ_TOPN=N  — cap child nodes (default 50, max 200)
 *
 * Usage:  node scripts/generate-wiki-tribal-features.mjs
 * Exit:   0 ok · 1 audit missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.wiki_tribal_coverage";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const PATH_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 120;
export const DEFAULT_TOPN = 50;
export const HARD_TOPN_CAP = 200;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const AUDIT_PATH = path.join(ROOT, "state/shared/.wiki-tribal-cross-ref-audit.json");
const OUT_PATH = path.join(VIZ_DIR, "wiki-tribal-augmentation.json");

/**
 * Pure: derive a deterministic, graph-safe node id from a wiki path.
 * Encoding: `ghost.wiki_tribal_missing.<linkPart>.<path_fnv>` — same identity
 * rule as iter-6 link-audit roost (Reviewer-B P1-1 lessons absorbed: the
 * IDENTITY is the wiki path, no source-file hash, so a re-embed cleanly
 * drops the node from the next regen rather than orphaning it).
 *
 * FNV-1a 32-bit over the ORIGINAL path string — disambiguates two paths
 * that normalize to the same `linkPart` (e.g., unicode-only) and prevents
 * the "drop linkPart, lose disambiguation" trap.
 */
export function wikiMissingNodeId(wikiPath) {
  const orig = String(wikiPath || "");
  const linkPart = orig
    .toLowerCase("en-US")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "x";
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < orig.length; i++) {
    h ^= orig.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const tag = h.toString(16).padStart(8, "0");
  return `ghost.wiki_tribal_missing.${linkPart}.${tag}`;
}

/**
 * Pure: build {newNodes, newEdges, stats} from a parsed audit object.
 */
export function generate(audit, existingNodeIds = [], topN = DEFAULT_TOPN) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const stats_in = audit && audit.stats && typeof audit.stats === "object" ? audit.stats : {};
  const missing = audit && Array.isArray(audit.missingFromTribal) ? audit.missingFromTribal : [];

  const wikiFiles = Number.isFinite(Number(stats_in.wikiFiles)) ? Number(stats_in.wikiFiles) : 0;
  const missingCount = Number.isFinite(Number(stats_in.missing)) ? Number(stats_in.missing) : 0;
  const staleCount = Number.isFinite(Number(stats_in.stale)) ? Number(stats_in.stale) : 0;
  const coverageRaw = Number(stats_in.coverage);
  const coverage = Number.isFinite(coverageRaw) ? Math.max(0, Math.min(1, coverageRaw)) : 0;
  const coveragePct = (coverage * 100).toFixed(1);

  const cap = Number.isFinite(topN) && topN >= 0 ? Math.min(Math.floor(topN), HARD_TOPN_CAP) : 0;
  const sampleCount = Math.min(missing.length, cap);

  let roostEmitted = 0;
  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `Wiki<>Tribal Coverage (${missingCount}/${wikiFiles} missing)`.slice(0, MAX_LABEL),
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${missingCount.toLocaleString()} of ${wikiFiles.toLocaleString()} wiki files lack tribal embedding (${coveragePct}% coverage)${staleCount > 0 ? `; ${staleCount} stale tribal entries` : ""}. Top ${sampleCount} surfaced as children; full report at state/shared/.wiki-tribal-cross-ref-audit.json.`,
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  let childrenEmitted = 0, childrenSkipped = 0;
  for (let i = 0; i < sampleCount; i++) {
    const wikiPath = typeof missing[i] === "string" ? missing[i] : "";
    if (!wikiPath) { childrenSkipped++; continue; }
    const nodeId = wikiMissingNodeId(wikiPath);
    if (ids.has(nodeId)) { childrenSkipped++; continue; }
    newNodes.push({
      id: nodeId,
      label: `MISSING: ${wikiPath}`.slice(0, MAX_LABEL),
      layer: PATH_LAYER,
      ghost: true,
      status: "ghost",
      kind: "missing-coverage",
      parent: ROOST_ID,
      info: `Wiki path with no tribal embedding: ${wikiPath.slice(0, MAX_INFO)}`,
    });
    ids.add(nodeId);
    childrenEmitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      wikiFiles,
      missingCount,
      staleCount,
      coverage: Number(coverage.toFixed(4)),
      topN: cap,
      childrenEmitted,
      childrenSkipped,
    },
  };
}

export function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error(`FATAL: ${AUDIT_PATH} missing — run scripts/wiki-tribal-cross-ref-audit.mjs first`);
    return 1;
  }
  let audit;
  try { audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: audit parse failed — ${e.message}`); return 2; }

  // Iter-6 P2-5 / iter-5 P1-1 absorbed: empty-env=0 footgun guard.
  const envStr = process.env.PRISM_WIKI_TRIBAL_VIZ_TOPN;
  const envTopN = envStr !== undefined && envStr !== "" ? Number(envStr) : NaN;
  const topN = Number.isFinite(envTopN) ? envTopN : DEFAULT_TOPN;

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(audit, [], topN);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/.wiki-tribal-cross-ref-audit.json",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) {
    console.error(`FATAL: generate failed — ${e.message}`);
    return 2;
  }

  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost:           ${result.stats.roostEmitted}`);
  console.log(`  missing:         ${result.stats.missingCount} / ${result.stats.wikiFiles} (${(result.stats.coverage * 100).toFixed(1)}% coverage)`);
  console.log(`  topN cap:        ${result.stats.topN}`);
  console.log(`  children:        ${result.stats.childrenEmitted} (${result.stats.childrenSkipped} skipped)`);
  console.log(`  total new nodes: ${result.newNodes.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
