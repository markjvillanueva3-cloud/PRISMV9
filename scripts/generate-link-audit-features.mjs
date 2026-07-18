#!/usr/bin/env node
/**
 * generate-link-audit-features.mjs — system-viz augmentation: the link-audit
 * integrity roost.
 *
 * Spec: /goal synergy iter 6 (echo, 2026-05-21). Closes the visual surface
 * for the iter-4 producer / iter-5 consumer pair:
 *   - iter-4 [[reference_u_knowledge_link_audit_wire_2026_05_20]] writes
 *     `state/shared/.knowledge-link-audit.json` weekly.
 *   - iter-5 [[reference_u_knowledge_link_audit_consumer_2026_05_21]] emits
 *     a SessionStart digest of broken-link drift.
 *   - iter-6 (this) adds the `/system-viz` roost so the integrity gap is
 *     visible on the graph (4136 broken `[[name]]` links is a silent-drift
 *     surface that deserves a node, not just a text digest).
 *
 * Emits one parent ghost roost `ghost.link_audit_integrity` under
 * `ghost.planned_features`, plus one `broken-link` child per top-N broken
 * sample (default N=50 — 4136 children would overwhelm the graph; the
 * digest already carries the full count). Modeled on misc-tasks-features
 * (the canonical augmentation pattern, regen-viz FAST[] registered).
 *
 * Output `state/shared/system-viz/link-audit-augmentation.json` is folded
 * into system-graph.json by scripts/merge-augmentations.mjs. Idempotent:
 * re-running produces a byte-stable file (deterministic from the audit's
 * already-sorted broken[] array).
 *
 * Knobs:
 *   PRISM_LINK_AUDIT_VIZ_TOPN=N  — cap child nodes (default 50, max 200)
 *
 * Usage:  node scripts/generate-link-audit-features.mjs
 * Exit:   0 ok · 1 audit missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
/** Parent roost id for the link-audit integrity subtree. */
export const ROOST_ID = "ghost.link_audit_integrity";
/** Grandparent — the existing planned-features ghost roost. */
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const LINK_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO_FROM = 120;
export const DEFAULT_TOPN = 50;
export const HARD_TOPN_CAP = 200;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const AUDIT_PATH = path.join(ROOT, "state/shared/.knowledge-link-audit.json");
const OUT_PATH = path.join(VIZ_DIR, "link-audit-augmentation.json");

/**
 * Pure: derive a deterministic, graph-safe node id from a broken `[[link]]`.
 * Encoding: `ghost.broken_link.<normalized_link>.<link_fnv>` where `link_fnv`
 * (FNV-1a of the ORIGINAL link string) disambiguates two distinct links that
 * normalize to the same `linkPart` (e.g., unicode-only links both collapsing
 * to `"x"` after the ASCII-only regex).
 *
 * Design choice (iter-6 2-of-2 scrutiny revision): the broken-link identity
 * is the LINK, not the (link, source-file) pair. A wiki rename that changes
 * the `from` field of an existing broken entry must NOT spawn a new ghost
 * node — that's the stale-accumulation footgun Reviewer-B flagged. Multiple
 * source files referencing the same broken link aggregate into ONE node
 * whose `info` lists the sources (see `generate`).
 *
 * Non-crypto hash chosen for stability across Node versions (no `crypto`
 * import); 8 hex chars over a 32-bit space gives birthday-collision odds
 * ~1.5e-9 at N=200 samples per roost — safe.
 */
export function brokenLinkNodeId(link) {
  const orig = String(link || "");
  const linkPart = orig
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "x";
  // FNV-1a 32-bit over the ORIGINAL string (NOT linkPart) — preserves
  // disambiguation when two distinct unicode/symbol links normalize to the
  // same linkPart.
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < orig.length; i++) {
    h ^= orig.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const tag = h.toString(16).padStart(8, "0");
  return `ghost.broken_link.${linkPart}.${tag}`;
}

/**
 * Pure: build {newNodes, newEdges, stats} from a parsed audit object.
 *
 * @param audit            parsed .knowledge-link-audit.json (schemaVersion 1.0.0)
 * @param existingNodeIds  Set/array of ids already in the graph (skip-list)
 * @param topN             cap on child nodes; clamped to [0, HARD_TOPN_CAP]
 */
export function generate(audit, existingNodeIds = [], topN = DEFAULT_TOPN) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const stats_in = audit && audit.stats && typeof audit.stats === "object" ? audit.stats : {};
  const broken = audit && Array.isArray(audit.broken) ? audit.broken : [];

  const total = Number.isFinite(Number(stats_in.linksTotal)) ? Number(stats_in.linksTotal) : 0;
  const brokenCount = Number.isFinite(Number(stats_in.linksBroken)) ? Number(stats_in.linksBroken) : 0;
  const files = Number.isFinite(Number(stats_in.filesScanned)) ? Number(stats_in.filesScanned) : 0;
  const ratioPct = total > 0 ? ((brokenCount / total) * 100).toFixed(1) : "0.0";

  // Clamp topN to [0, HARD_TOPN_CAP]; non-finite or negative → 0.
  const cap = Number.isFinite(topN) && topN >= 0 ? Math.min(Math.floor(topN), HARD_TOPN_CAP) : 0;

  // Group broken[] by link FIRST (iter-6 2-of-2 revision): the broken-link
  // identity is the link, not the (link, from) pair. Multiple source files
  // referencing the same broken `[[link]]` aggregate into ONE node whose
  // `info` lists up to MAX_SOURCES_PER_NODE of them. Preserves producer sort.
  const MAX_SOURCES_PER_NODE = 5;
  const linkMap = new Map(); // link -> { firstSeenIdx, sources: string[] }
  for (let i = 0; i < broken.length; i++) {
    const b = broken[i];
    if (!b || typeof b.link !== "string" || !b.link) continue;
    const link = b.link;
    const from = typeof b.from === "string" ? b.from : "";
    const existing = linkMap.get(link);
    if (existing) {
      if (existing.sources.length < MAX_SOURCES_PER_NODE) existing.sources.push(from);
    } else {
      linkMap.set(link, { firstSeenIdx: i, sources: [from] });
    }
  }
  // Preserve producer's deterministic order by sorting on firstSeenIdx.
  const grouped = Array.from(linkMap.entries())
    .sort((a, b) => a[1].firstSeenIdx - b[1].firstSeenIdx);
  const sampleCount = Math.min(grouped.length, cap);

  // ── parent roost ──
  let roostEmitted = 0;
  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `Wiki<>Memory Link Integrity (${brokenCount}/${total} broken)`.slice(0, MAX_LABEL),
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      // Plain text — no `[[name]]` literal in label/info (iter-6 P2-4 fix):
      // the audit producer scans markdown for `[[name]]` tokens, so a graph
      // rendered back to markdown with literal wikilinks would re-pollute.
      info: `${brokenCount.toLocaleString()} broken of ${total.toLocaleString()} wiki-style tokens across ${files.toLocaleString()} md files (${ratioPct}%). Top ${sampleCount} unique links surfaced as children; full report at state/shared/.knowledge-link-audit.json.`,
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  // ── one child per top-N UNIQUE broken link (aggregated across sources) ──
  let childrenEmitted = 0, childrenSkipped = 0;
  for (let i = 0; i < sampleCount; i++) {
    const [link, meta] = grouped[i];
    const nodeId = brokenLinkNodeId(link);
    if (ids.has(nodeId)) { childrenSkipped++; continue; }
    const srcCount = meta.sources.length;
    const srcList = meta.sources.slice(0, MAX_SOURCES_PER_NODE).join(", ");
    newNodes.push({
      id: nodeId,
      // Prefix-marker breaks re-parse — see roost.info note above.
      label: `BROKEN: ${link}`.slice(0, MAX_LABEL),
      layer: LINK_LAYER,
      ghost: true,
      status: "ghost",
      kind: "broken-link",
      parent: ROOST_ID,
      info: `Broken link target: ${link} - referenced from ${srcCount} source${srcCount === 1 ? "" : "s"}: ${srcList.slice(0, MAX_INFO_FROM)}`,
    });
    ids.add(nodeId);
    childrenEmitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      brokenTotal: brokenCount,
      linksTotal: total,
      ratioPct: Number(ratioPct),
      topN: cap,
      childrenEmitted,
      childrenSkipped,
    },
  };
}

export function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error(`FATAL: ${AUDIT_PATH} missing — run scripts/knowledge-link-audit.mjs first`);
    return 1;
  }
  let audit;
  try { audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: audit parse failed — ${e.message}`); return 2; }

  // Iter-6 P2-5 fix: empty env var `PRISM_LINK_AUDIT_VIZ_TOPN=` (no value)
  // would coerce to Number("")=0 and pass Number.isFinite, silently yielding
  // zero children. Explicit undefined-check honors the operator's intent.
  const envStr = process.env.PRISM_LINK_AUDIT_VIZ_TOPN;
  const envTopN = envStr !== undefined && envStr !== "" ? Number(envStr) : NaN;
  const topN = Number.isFinite(envTopN) ? envTopN : DEFAULT_TOPN;

  let result;
  try {
    // Idempotency at merge time (merge-augmentations.mjs is authoritative dedupe).
    const { newNodes, newEdges, stats } = generate(audit, [], topN);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/.knowledge-link-audit.json",
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
  console.log(`  roost emitted:        ${result.stats.roostEmitted}`);
  console.log(`  broken total:         ${result.stats.brokenTotal} / ${result.stats.linksTotal} (${result.stats.ratioPct}%)`);
  console.log(`  topN cap:             ${result.stats.topN}`);
  console.log(`  children emitted:     ${result.stats.childrenEmitted}`);
  console.log(`  children skipped:     ${result.stats.childrenSkipped}`);
  console.log(`  total new nodes:      ${result.newNodes.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
