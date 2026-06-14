#!/usr/bin/env node
/**
 * generate-rag-upgrade-features.mjs — system-viz augmentation: RAG-UPGRADE-MS0.
 *
 * Spec: RAG-UPGRADE-MS0 (state/shared/specs/RAG-UPGRADE-MS0.md). The "wired"
 * half of the operator /goal — surfaces the retrieval-upgrade milestone + its
 * 6 units (U-RAG-1..6) in /system-viz as a ghost roost so milestone progress
 * is legible alongside every other tracked roadmap surface.
 *
 * Source of truth for per-unit STATUS is the spec's `## Status` markdown
 * table. The 6-unit SET is static (U-RAG-1..6 never changes) — the table only
 * overlays state, so a table-format drift degrades to "unknown" (gray) per
 * unit rather than dropping the milestone from the viz.
 *
 * Registered in scripts/regen-viz.mjs FAST[] + spliced by merge-augmentations.mjs.
 * Modeled on generate-priority-queue-features.mjs (same augmentation pattern).
 *
 * Usage:  node scripts/generate-rag-upgrade-features.mjs
 * Exit:   0 ok · 1 spec missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const RAG_ROOST_ID = "ghost.rag_upgrade_ms0";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const UNIT_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 400;

// State → color (tailwind 500-tone hexes) + a stable sort weight. Children are
// rendered in unit-id order (canonical reading order); color carries state.
export const STATE_STYLE = {
  done:     { color: "#10b981", label: "DONE" },      // green
  partial:  { color: "#f59e0b", label: "PARTIAL" },   // amber
  pending:  { color: "#3b82f6", label: "PENDING" },   // blue
  deferred: { color: "#6b7280", label: "DEFERRED" },  // gray
  unknown:  { color: "#9ca3af", label: "UNKNOWN" },   // light gray (table drift)
};

// The fixed unit set. Titles are descriptive — they do not change; only the
// per-unit `## Status` row in the spec changes as work ships.
export const RAG_UNITS = [
  { id: "U-RAG-1", title: "Embed the full wiki corpus (audit blind-spot fix)" },
  { id: "U-RAG-2", title: "Two-stage lexical rerank in the 4 inject hooks" },
  { id: "U-RAG-3", title: "Contextual Retrieval — context-blurb prefix during embed" },
  { id: "U-RAG-4", title: "Edge-ordering + milestone synergy wiring" },
  { id: "U-RAG-5", title: "Retrieval eval harness (precision@k / recall@k / MRR)" },
  { id: "U-RAG-6", title: "GPU embedder migration (deferred — out of goal scope)" },
];

/** Filesystem-safe node id fragment. */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "").slice(0, 80);
  return (!s || s.includes("..")) ? "x" : s;
}

/**
 * Pure: parse the spec's `## Status` markdown table into a
 * Map<unitId, {state, evidence}>. A row is `| U-RAG-N | <state cell> |
 * <evidence cell> |`; state is matched on the bare keyword
 * (DONE/PARTIAL/PENDING/DEFERRED) so an emoji change doesn't break the parse.
 * Non-string input or a missing table → empty Map (callers default to
 * "unknown").
 */
export function parseStatusTable(specText) {
  const out = new Map();
  if (typeof specText !== "string") return out;
  let inStatus = false;
  for (const ln of specText.split(/\r?\n/)) {
    if (/^##\s+Status\b/i.test(ln)) { inStatus = true; continue; }
    if (!inStatus) continue;
    if (/^##\s/.test(ln)) break;          // next section ends the Status block
    if (!ln.includes("|")) continue;
    // Split a markdown table row — leading/trailing `|` yield empty edge cells.
    const cells = ln.split("|").map((c) => c.trim());
    const idCell = cells.find((c) => /^U-RAG-\d+\b/i.test(c));
    if (!idCell) continue;               // header / separator / non-unit row
    const idx = cells.indexOf(idCell);
    const stateCell = cells[idx + 1] || "";
    const evidenceCell = cells[idx + 2] || "";
    const m = stateCell.match(/\b(DONE|PARTIAL|PENDING|DEFERRED)\b/i);
    const unitId = idCell.match(/U-RAG-\d+/i)[0].toUpperCase();
    out.set(unitId, {
      state: m ? m[1].toLowerCase() : "unknown",
      evidence: evidenceCell,
    });
  }
  return out;
}

/**
 * Pure: emit the RAG-UPGRADE-MS0 ghost roost + one `rag-upgrade-unit` child
 * per unit (U-RAG-1..6), color-coded by parsed status. Children are emitted
 * in unit-id order. `existingNodeIds` lets the caller skip ids already in the
 * graph (idempotent re-runs).
 */
export function generate(specText, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const status = parseStatusTable(specText);
  const newNodes = [];
  let roostEmitted = 0;

  const byState = { done: 0, partial: 0, pending: 0, deferred: 0, unknown: 0 };
  for (const u of RAG_UNITS) {
    const st = (status.get(u.id) || {}).state || "unknown";
    byState[st] = (byState[st] || 0) + 1;
  }

  // Roost.
  if (!ids.has(RAG_ROOST_ID)) {
    newNodes.push({
      id: RAG_ROOST_ID,
      label: "RAG-UPGRADE-MS0 — PRISM retrieval upgrade",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${RAG_UNITS.length} units · done ${byState.done} (green) · partial ${byState.partial} (amber) · pending ${byState.pending} (blue) · deferred ${byState.deferred} (gray). Source: state/shared/specs/RAG-UPGRADE-MS0.md.`,
    });
    ids.add(RAG_ROOST_ID);
    roostEmitted = 1;
  }

  let emitted = 0, skipped = 0;
  for (const u of RAG_UNITS) {
    const nid = "ghost.rag_upgrade." + safeId(u.id);
    if (ids.has(nid)) { skipped++; continue; }
    const row = status.get(u.id) || {};
    const state = STATE_STYLE[row.state] ? row.state : "unknown";
    const style = STATE_STYLE[state];
    const evidence = String(row.evidence || "").trim();
    newNodes.push({
      id: nid,
      label: `${u.id} · ${u.title}`.slice(0, MAX_LABEL),
      layer: UNIT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "rag-upgrade-unit",
      parent: RAG_ROOST_ID,
      color: style.color,
      state,
      milestone: "RAG-UPGRADE-MS0",
      info: `[${style.label}] ${evidence || u.title}`.slice(0, MAX_INFO),
    });
    ids.add(nid);
    emitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: { roostEmitted, totalUnits: RAG_UNITS.length, emitted, skipped, byState },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const SPEC_PATH = path.join(ROOT, "state/shared/specs/RAG-UPGRADE-MS0.md");
const OUT_PATH = path.join(VIZ_DIR, "rag-upgrade-augmentation.json");

export function main() {
  if (!fs.existsSync(SPEC_PATH)) {
    console.error(`FATAL: ${SPEC_PATH} missing — RAG-UPGRADE-MS0 spec not found`);
    return 1;
  }
  let specText;
  try { specText = fs.readFileSync(SPEC_PATH, "utf8"); }
  catch (e) { console.error(`FATAL: spec read failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(specText, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/specs/RAG-UPGRADE-MS0.md",
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost:       ${result.stats.roostEmitted}`);
  console.log(`  total units: ${result.stats.totalUnits}`);
  console.log(`  emitted:     ${result.stats.emitted}`);
  console.log(`  by state:    ${JSON.stringify(result.stats.byState)}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
