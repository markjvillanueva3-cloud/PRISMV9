#!/usr/bin/env node
/**
 * generate-feature-gap-features.mjs — system-viz augmentation: feature-gap audit.
 *
 * Spec: FEATURE-GAP-AUDIT-MS0 (slot juliett, 2026-05-17).
 *
 * Reads state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json (or the newest
 * FEATURE-GAP-UNITS-*.json) and emits a `ghost.feature_gap_audit` roost (L8)
 * plus one `gap-unit` child per audit-discovered feature (L9), color-coded by
 * the unit's owning domain. The visualization shows every feature found by
 * /forge-audit-v2 that was absent from the task queue — now tracked as
 * roadmap units under FEATURE-GAP-AUDIT-MS0.
 *
 * Registered in scripts/regen-viz.mjs FAST[] + spliced by merge-augmentations.mjs.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.feature_gap_audit";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const UNIT_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 400;

// Domain → color. Manufacturing domains use warm hues; infra/devtools cool.
export const DOMAIN_COLOR = {
  mill:        "#ef4444", // red
  lathe:       "#f97316", // orange
  wire:        "#eab308", // yellow
  cad:         "#84cc16", // lime
  cam:         "#06b6d4", // cyan
  tribal:      "#a855f7", // purple
  erp:         "#ec4899", // pink
  post:        "#f59e0b", // amber
  speedfeed:   "#22c55e", // green
  print2prog:  "#14b8a6", // teal
  academy:     "#8b5cf6", // violet
  database:    "#64748b", // slate
  misc:        "#94a3b8", // gray
};
const DOMAIN_DEFAULT_COLOR = "#94a3b8";

function safeId(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

// Newest FEATURE-GAP-UNITS-*.json by date-suffixed filename.
function findGapUnitsFile() {
  const dir = path.join(ROOT, "state/shared/specs");
  let files;
  try {
    files = fs.readdirSync(dir).filter(
      (f) => /^FEATURE-GAP-UNITS-\d{4}-\d{2}-\d{2}\.json$/.test(f)
    );
  } catch { return null; }
  if (files.length === 0) return null;
  files.sort(); // lexical sort over date-suffixed names is chronological
  return path.join(dir, files[files.length - 1]);
}

export function generate(gapData, existingNodeIds = new Set()) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];
  const units = Array.isArray(gapData?.units) ? gapData.units : [];
  let roostEmitted = 0;

  // Per-domain counts for the roost info string.
  const byDomain = {};
  for (const u of units) {
    const d = u.domain || "misc";
    byDomain[d] = (byDomain[d] || 0) + 1;
  }
  const domainSummary = Object.entries(byDomain)
    .sort((a, b) => b[1] - a[1])
    .map(([d, n]) => `${d}:${n}`)
    .join(" ");

  // Roost.
  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: "Feature-Gap Audit (forge-audit-v2 discoveries — now tracked as roadmap units)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${units.length} audit-discovered features absent from the task queue when /forge-audit-v2 ran (2026-05-17). Canonicalized as FEATURE-GAP-AUDIT-MS0. By domain: ${domainSummary}. Source: ${gapData.source || "FEATURE-GAP-UNITS"}.`.slice(0, MAX_INFO),
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  // Stable sort: domain asc → unit_id asc.
  const sorted = units.slice().sort((a, b) =>
    String(a.domain || "").localeCompare(String(b.domain || "")) ||
    String(a.unit_id || "").localeCompare(String(b.unit_id || ""))
  );

  let emitted = 0, skipped = 0;
  for (const u of sorted) {
    const uid = u.unit_id;
    if (!uid) { skipped++; continue; }
    const nid = "ghost.gap." + safeId(uid);
    if (ids.has(nid)) { skipped++; continue; }
    const domain = u.domain || "misc";
    const color = DOMAIN_COLOR[domain] || DOMAIN_DEFAULT_COLOR;
    const title = String(u.title || uid).trim();
    newNodes.push({
      id: nid,
      label: `${uid} · ${title}`.slice(0, MAX_LABEL),
      layer: UNIT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "gap-unit",
      parent: ROOST_ID,
      color,
      domain,
      milestone: u.milestone || "FEATURE-GAP-AUDIT-MS0",
      info: `[${domain}] ${title}`.slice(0, MAX_INFO),
    });
    ids.add(nid);
    // Explicit ghost wire: gap-unit -> its roost (the parent field renders as a
    // hierarchy edge; this explicit edge tags the audit relationship for queries).
    newEdges.push({
      from: nid,
      to: ROOST_ID,
      type: "audit-discovered",
    });
    emitted++;
  }

  return {
    newNodes,
    newEdges,
    stats: {
      roostEmitted,
      totalUnits: units.length,
      emitted,
      skipped,
      byDomain,
    },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "feature-gap-augmentation.json");

export function main() {
  const inputPath = findGapUnitsFile();
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error(`FATAL: no FEATURE-GAP-UNITS-*.json found in state/shared/specs/`);
    return 1;
  }
  let gapData;
  try { gapData = JSON.parse(fs.readFileSync(inputPath, "utf8")); }
  catch (e) { console.error(`FATAL: parse failed for ${inputPath} — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(gapData, new Set());
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: path.relative(ROOT, inputPath).replace(/\\/g, "/"),
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH + ".tmp", JSON.stringify(result, null, 2));
    fs.renameSync(OUT_PATH + ".tmp", OUT_PATH);
  } catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost:        ${result.stats.roostEmitted}`);
  console.log(`  total units:  ${result.stats.totalUnits}`);
  console.log(`  emitted:      ${result.stats.emitted}`);
  console.log(`  edges:        ${result.newEdges.length}`);
  console.log(`  by domain:    ${JSON.stringify(result.stats.byDomain)}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
