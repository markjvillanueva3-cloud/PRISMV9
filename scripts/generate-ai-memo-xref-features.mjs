#!/usr/bin/env node
/**
 * generate-ai-memo-xref-features.mjs — system-viz augmentation: prism-ai
 * engine ⇄ memo coverage roost.
 *
 * Iter 16 of the /goal synergize loop (echo, 2026-05-21). Completes the
 * producer (iter-13) → consumer (iter-14) → viz (iter-16) triplet for the
 * prism-ai-memo substrate. (Iter 15 was displaced by the user "fold it"
 * directive that shipped SWARM-LAUNCHER-MS0; this iter is the deferred
 * viz-roost.)
 *
 * Reads `state/shared/.prism-ai-memo-cross-ref-audit.json` (iter-13 producer)
 * and emits a system-viz augmentation that adds:
 *   - one parent ghost roost `ghost.ai_memo_xref` under `ghost.planned_features`
 *   - one `missing-coverage` child per PRISM-AI engine with zero strict memo
 *     references (the audit's `missingFromMemos` array)
 *
 * Identity simplification vs iter-9 (wiki-tribal): the iter-9 generator
 * needed FNV-1a hashing + a topN cap because wiki paths can be unicode and
 * number ~24,000. Here the corpus is at most 7 PRISM*Engine.ts class names —
 * all ASCII PascalCase, unique, id-safe — so a plain lowercase slug is a
 * sufficient and collision-free node id, and every missing engine becomes a
 * child (no cap). The iter-6/9 "link-only identity" lesson still holds: the
 * node id is the ENGINE NAME only, so a re-covered engine cleanly drops from
 * the next augmentation rather than orphaning.
 *
 * Output: state/shared/system-viz/ai-memo-xref-augmentation.json
 * Folded into system-graph.json by scripts/merge-augmentations.mjs.
 * Idempotent: byte-stable output (producer emits a deterministically-sorted
 * missingFromMemos array; no random ids, no time-dependent paths).
 *
 * Knobs: none. The PRISM-AI corpus is tiny (7 engines) — every blind-spot
 * engine is always surfaced as a child; no topN knob is meaningful.
 *
 * Usage:  node scripts/generate-ai-memo-xref-features.mjs
 * Exit:   0 ok · 1 audit missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
/** Parent roost id for the prism-ai-memo coverage subtree. Registered into
 * iter-12's SUBSTRATE_TO_ROOST in a later iter so the meta-roost compounds it. */
export const ROOST_ID = "ghost.ai_memo_xref";
/** Grandparent — the existing planned-features ghost roost. */
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const ENGINE_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 200;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const AUDIT_PATH = path.join(ROOT, "state/shared/.prism-ai-memo-cross-ref-audit.json");
const OUT_PATH = path.join(VIZ_DIR, "ai-memo-xref-augmentation.json");

/**
 * Pure: derive a deterministic, graph-safe node id from a PRISM-AI engine
 * class name. Encoding: `ghost.ai_memo_missing.<lowercased-classname>`.
 *
 * No FNV hash (unlike iter-6/9): PRISM*Engine.ts class names are ASCII
 * PascalCase and globally unique by construction (one file per class), so
 * the lowercased name is already a collision-free id-safe token. The regex
 * strips any non-id char defensively in case a future engine name carries
 * a digit-prefix or symbol.
 */
export function engineMissingNodeId(engineName) {
  const slug = String(engineName || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "") || "x";
  return `ghost.ai_memo_missing.${slug}`;
}

/**
 * Pure: build {newNodes, newEdges, stats} from a parsed audit object.
 *
 * @param audit            parsed .prism-ai-memo-cross-ref-audit.json
 * @param existingNodeIds  Set/array of ids already in the graph (skip-list)
 */
export function generate(audit, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];

  const stats_in = audit && audit.stats && typeof audit.stats === "object" ? audit.stats : {};
  const missing = audit && Array.isArray(audit.missingFromMemos) ? audit.missingFromMemos : [];

  const engineCount = Number.isFinite(Number(stats_in.engineCount)) ? Number(stats_in.engineCount) : 0;
  const memoCount = Number.isFinite(Number(stats_in.memoCount)) ? Number(stats_in.memoCount) : 0;
  const missingCount = Number.isFinite(Number(stats_in.missing)) ? Number(stats_in.missing) : 0;
  const coverageRaw = Number(stats_in.coverage);
  const coverage = Number.isFinite(coverageRaw) ? Math.max(0, Math.min(1, coverageRaw)) : 0;
  const coveragePct = (coverage * 100).toFixed(1);

  // ── parent roost ──
  let roostEmitted = 0;
  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `PRISM-AI Memo Coverage (${missingCount}/${engineCount} blind)`.slice(0, MAX_LABEL),
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${missingCount} of ${engineCount} PRISM-AI engines lack memo coverage across ${memoCount.toLocaleString()} memos (${coveragePct}% coverage). Full report at state/shared/.prism-ai-memo-cross-ref-audit.json.`.slice(0, MAX_INFO + 80),
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  // ── one child per blind-spot engine ──
  let childrenEmitted = 0, childrenSkipped = 0;
  for (const engineName of missing) {
    const name = typeof engineName === "string" ? engineName : "";
    if (!name) { childrenSkipped++; continue; }
    const nodeId = engineMissingNodeId(name);
    if (ids.has(nodeId)) { childrenSkipped++; continue; }
    newNodes.push({
      id: nodeId,
      // Plain text — no `[[name]]` literal (iter-6 P2-4 lesson absorbed).
      label: `MISSING: ${name}`.slice(0, MAX_LABEL),
      layer: ENGINE_LAYER,
      ghost: true,
      status: "ghost",
      kind: "missing-coverage",
      parent: ROOST_ID,
      info: `PRISM-AI engine with no explicit (strict class-name) memo reference: ${name}`.slice(0, MAX_INFO),
    });
    ids.add(nodeId);
    childrenEmitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      engineCount,
      memoCount,
      missingCount,
      coverage: Number(coverage.toFixed(4)),
      childrenEmitted,
      childrenSkipped,
    },
  };
}

export function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error(`FATAL: ${AUDIT_PATH} missing — run scripts/prism-ai-memo-cross-ref-audit.mjs first`);
    return 1;
  }
  let audit;
  try { audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: audit parse failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(audit, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/.prism-ai-memo-cross-ref-audit.json",
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
  console.log(`  roost emitted:    ${result.stats.roostEmitted}`);
  console.log(`  missing:          ${result.stats.missingCount} / ${result.stats.engineCount} (${(result.stats.coverage * 100).toFixed(1)}% coverage)`);
  console.log(`  children emitted: ${result.stats.childrenEmitted} (${result.stats.childrenSkipped} skipped)`);
  console.log(`  total new nodes:  ${result.newNodes.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
