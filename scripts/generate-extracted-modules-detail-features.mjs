#!/usr/bin/env node
/**
 * generate-extracted-modules-detail-features.mjs — file-level /system-viz
 * augmentation for the 1788-module extraction stockpile (slot:papa 2026-05-26).
 *
 * Builds on the existing roost from generate-extracted-modules-features.mjs
 * (golf 5/24 U-PSN-EXTRACTED-DIRS-NODE-MAP) by adding ONE NODE PER FILE for
 * the high-value modules (top WIRE_CANDIDATEs + all DATABASEs + all DUPS),
 * with BRIDGE EDGES from each DUP node to its matched existing PRISM engine.
 *
 * Operator directive (slot:papa /goal /loop 2026-05-26):
 *   "convert extracted data to individual nodes, bridge and wire to existing
 *    databases, nodes that can utilize them"
 *
 * Input:
 *   state/shared/extracted-modules-classified.json
 *     (1788 modules with dup_status / matched_engine / recommended_dispatcher)
 *
 * Output:
 *   state/shared/system-viz/extracted-modules-detail-augmentation.json
 *     { schemaVersion, generatedAt, newNodes, newEdges, stats }
 *
 * Node selection (caps node-count growth — full 1788 would bloat /system-viz):
 *   • top 200 WIRE_CANDIDATEs by line-count (the GIANT/ULTRA monolith chunks)
 *   • all 208 DATABASEs (every registry candidate)
 *   • all 111 DUP_KEEP_EXISTING (with edge to matched engine — proves tracking)
 *   • all 134 PARTIAL_OVERLAP (extract-novel-features candidates)
 *
 * Edge types:
 *   "bridge_to_existing" — DUP/PARTIAL module → matched PRISM engine
 *   "wire_target"        — WIRE_CANDIDATE → recommended dispatcher
 *
 * Parent chain:
 *   ghost.extracted_modules.<category> → file-node (extracted_modules stockpile)
 *   ghost.extracted.<category>         → file-node (extracted     stockpile)
 *
 * Karpathy:
 *   CLASSIFY  — fixed selection criteria (top-K + status filters), no LLM
 *   EDGE CASES — manifest missing → exit 2 · 0 modules selected → exit 0 + warn
 *   FAILURE   — atomic .tmp+rename write
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SCHEMA_VERSION = "1.0.0";
const CLASSIFIED_PATH = path.join(ROOT, "state/shared/extracted-modules-classified.json");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "extracted-modules-detail-augmentation.json");

const MODULE_LAYER = "L10";
const MAX_LABEL = 80;
const MAX_INFO = 200;

const TOP_WIRE_CANDIDATES = 200; // by line-count

const STATUS_COLOR = {
  WIRE_CANDIDATE: "amber",
  PARTIAL_OVERLAP: "yellow",
  DUP_KEEP_EXISTING: "green",
  DATABASE: "blue",
  STUB: "gray",
  META: "gray",
};

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

function parentRoostId(mod) {
  // Mirrors generate-extracted-modules-features.mjs: ghost.<stockpile>.<category>
  const stockpileRoost = mod.source_stockpile === "extracted_modules"
    ? "ghost.extracted_modules"
    : "ghost.extracted";
  const cat = safeId(mod.category);
  return `${stockpileRoost}.${cat}`;
}

function buildNodeForModule(mod) {
  const stockpile = mod.source_stockpile;
  const nid = `extracted.${stockpile}.${safeId(mod.path)}`;
  const sizeKb = Math.round(mod.size_bytes / 102.4) / 10;
  const matched = mod.matched_engine
    ? ` ↔ ${mod.matched_engine}@${mod.match_confidence}`
    : "";
  const info = `[${mod.dup_status}] ${mod.lines}L ${sizeKb}KB · ${mod.type} → ${mod.recommended_dispatcher}${matched}`;
  const label = `${mod.name}`.slice(0, MAX_LABEL);
  return {
    id: nid,
    label,
    layer: MODULE_LAYER,
    ghost: true,
    status: "ghost",
    kind: `extracted-module-${mod.dup_status.toLowerCase()}`,
    parent: parentRoostId(mod),
    color: STATUS_COLOR[mod.dup_status] || "gray",
    info: info.slice(0, MAX_INFO),
    meta: {
      path: mod.path,
      stockpile,
      type: mod.type,
      lines: mod.lines,
      dup_status: mod.dup_status,
      matched_engine: mod.matched_engine || null,
      match_confidence: mod.match_confidence,
      recommended_dispatcher: mod.recommended_dispatcher,
      recommended_action: mod.recommended_action,
    },
  };
}

function buildEdgeForDup(moduleNodeId, mod) {
  // Map matched PascalCase engine name → likely system-graph node id.
  // System-viz engine nodes use PascalCase ids — try direct + lowercase
  // variants; if neither matches the graph the splice silently drops the
  // edge (no orphan target).
  return {
    from: moduleNodeId,
    to: mod.matched_engine,
    type: "bridge_to_existing",
    label: `dup→${mod.matched_engine}`,
  };
}

function buildEdgeForWire(moduleNodeId, mod) {
  return {
    from: moduleNodeId,
    to: mod.recommended_dispatcher,
    type: "wire_target",
    label: `wire→${mod.recommended_dispatcher}`,
  };
}

export function selectModules(classified) {
  const wire = classified
    .filter(m => m.dup_status === "WIRE_CANDIDATE")
    .sort((a, b) => b.lines - a.lines)
    .slice(0, TOP_WIRE_CANDIDATES);
  const db = classified.filter(m => m.dup_status === "DATABASE");
  const dup = classified.filter(m => m.dup_status === "DUP_KEEP_EXISTING");
  const partial = classified.filter(m => m.dup_status === "PARTIAL_OVERLAP");
  return { wire, db, dup, partial };
}

export function build(classifiedDoc) {
  const modules = classifiedDoc.modules || [];
  const sel = selectModules(modules);

  const newNodes = [];
  const newEdges = [];
  const seenNodeIds = new Set();

  function addModuleNode(mod, withDupEdge, withWireEdge) {
    const n = buildNodeForModule(mod);
    if (seenNodeIds.has(n.id)) return;
    seenNodeIds.add(n.id);
    newNodes.push(n);
    if (withDupEdge && mod.matched_engine) {
      newEdges.push(buildEdgeForDup(n.id, mod));
    }
    if (withWireEdge && mod.recommended_dispatcher && mod.recommended_dispatcher !== "n/a") {
      newEdges.push(buildEdgeForWire(n.id, mod));
    }
  }

  sel.wire.forEach(m => addModuleNode(m, false, true));
  sel.db.forEach(m => addModuleNode(m, false, true));
  sel.dup.forEach(m => addModuleNode(m, true, false));
  sel.partial.forEach(m => addModuleNode(m, true, true));

  const stats = {
    selected_wire: sel.wire.length,
    selected_db: sel.db.length,
    selected_dup: sel.dup.length,
    selected_partial: sel.partial.length,
    total_new_nodes: newNodes.length,
    total_new_edges: newEdges.length,
    dup_edges: newEdges.filter(e => e.type === "bridge_to_existing").length,
    wire_edges: newEdges.filter(e => e.type === "wire_target").length,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: CLASSIFIED_PATH,
    newNodes,
    newEdges,
    stats,
  };
}

function writeAtomic(p, data) {
  const tmp = `${p}.tmp.${process.pid}`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

export function main() {
  if (!fs.existsSync(CLASSIFIED_PATH)) {
    console.error(`FATAL: classified manifest missing — ${CLASSIFIED_PATH}`);
    console.error("  Run: node scripts/build-extracted-modules-manifest.mjs");
    console.error("       node scripts/classify-extracted-modules.mjs");
    return 2;
  }
  const classifiedDoc = JSON.parse(fs.readFileSync(CLASSIFIED_PATH, "utf8"));
  const result = build(classifiedDoc);
  writeAtomic(OUT_PATH, result);
  console.log(JSON.stringify({
    ok: true,
    out: OUT_PATH,
    stats: result.stats,
  }, null, 2));
  return 0;
}

import { pathToFileURL } from "node:url";
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) process.exit(main());
