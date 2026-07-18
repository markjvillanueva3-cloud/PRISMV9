#!/usr/bin/env node
/**
 * generate-extracted-modules-features.mjs — system-viz augmentation that
 * brings the H:/PRISM/extracted_modules + H:/PRISM/extracted directories
 * (50 top-level categories, thousands of inner files) into the PSN substrate.
 *
 * U-PSN-EXTRACTED-DIRS-NODE-MAP (slot:golf 2026-05-24, iter11 of the
 * 'improve the system further, extract all high roi features' /goal /loop).
 * The operator surfaced this gap: 'H:\PRISM\extracted_modules H:\PRISM\extracted
 * check both those sources, ensure they're all noded and mapped in system-viz
 * and PSN. synergize them to the full PSN system if there's data in there still
 * not in our system'.
 *
 * Pre-discovery: `grep -c 'extracted' state/shared/system-viz/system-graph.json`
 * returned 0 hits — both directories were ENTIRELY missing from the graph.
 *
 * Emits two ghost-roost parents:
 *   - `ghost.extracted_modules` — children = top-level categories of
 *     H:/PRISM/extracted_modules (COMPLETE/, ULTRA/, ai_ml_engines/, etc.)
 *   - `ghost.extracted` — children = top-level categories of H:/PRISM/extracted
 *     (algorithms/, business/, catalogs/, engines/, formulas/, ...)
 *
 * Each category emits one node with file count + most-recent mtime in info.
 * Files referenced through the category are NOT individually emitted
 * (would blow up node count past 100K); operators drill via OS file browser.
 *
 * Modeled on generate-bridge-synergy-features.mjs. Registered in
 * scripts/regen-viz.mjs FAST[] and spliced by scripts/merge-augmentations.mjs.
 *
 * Usage:  node scripts/generate-extracted-modules-features.mjs
 * Exit:   0 ok · 1 source dir missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CATEGORY_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 200;

// Both directories live INSIDE the H:/prism repo root (Windows case-insensitive
// filesystem: H:\PRISM\extracted_modules and H:/prism/extracted_modules are
// the same directory).
const EXTRACTED_MODULES_PATH = path.join(ROOT, "extracted_modules");
const EXTRACTED_PATH = path.join(ROOT, "extracted");

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "extracted-modules-augmentation.json");

/** Filesystem-safe node id fragment. */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 60);
  if (!s || s.includes("..")) return "x";
  return s;
}

/**
 * Probe a directory: return {categories[], totalFiles, mostRecent} where
 * categories = [{name, kind, fileCount, latestMtime}] (one row per top-level
 * entry, subdir or file). Failing-safe — returns {categories:[]} on any IO error.
 */
export function probeDirectory(absPath, fsImpl = fs) {
  if (typeof absPath !== "string" || absPath.length === 0) {
    return { categories: [], totalFiles: 0, mostRecent: 0 };
  }
  let entries;
  try { entries = fsImpl.readdirSync(absPath, { withFileTypes: true }); }
  catch { return { categories: [], totalFiles: 0, mostRecent: 0 }; }

  const categories = [];
  let totalFiles = 0;
  let mostRecent = 0;
  for (const ent of entries) {
    const childPath = path.join(absPath, ent.name);
    if (ent.isDirectory()) {
      // Count files recursively (1 level deep) so we don't traverse huge trees.
      let fileCount = 0;
      let latestMtime = 0;
      try {
        const inner = fsImpl.readdirSync(childPath, { withFileTypes: true });
        for (const i of inner) {
          if (i.isFile()) {
            fileCount++;
            try {
              const st = fsImpl.statSync(path.join(childPath, i.name));
              if (st.mtimeMs > latestMtime) latestMtime = st.mtimeMs;
            } catch { /* skip */ }
          } else if (i.isDirectory()) {
            // Count subdirs as 1 "category" each but don't recurse deeper.
            fileCount++;
          }
        }
      } catch { /* read failed — keep counts at 0 */ }
      categories.push({ name: ent.name, kind: "dir", fileCount, latestMtime });
      totalFiles += fileCount;
      if (latestMtime > mostRecent) mostRecent = latestMtime;
    } else if (ent.isFile()) {
      let latestMtime = 0;
      try {
        const st = fsImpl.statSync(childPath);
        latestMtime = st.mtimeMs;
        if (latestMtime > mostRecent) mostRecent = latestMtime;
      } catch { /* skip */ }
      categories.push({ name: ent.name, kind: "file", fileCount: 1, latestMtime });
      totalFiles++;
    }
  }
  return { categories, totalFiles, mostRecent };
}

/**
 * Pure: build {newNodes, stats} for a single source dir. existingIds optional
 * Set for dedup. opts.roostId + opts.label + opts.parent customize the roost
 * parent node. Yields one parent + one node per category.
 */
export function generateForSource(roostId, probe, opts = {}) {
  const label = String(opts.label || roostId);
  const parent = String(opts.parent || PLANNED_PARENT);
  const sourcePath = String(opts.sourcePath || "");
  const existing = opts.existingIds instanceof Set ? opts.existingIds : new Set();

  const newNodes = [];
  let roostEmitted = 0;

  if (!existing.has(roostId)) {
    const recent = probe.mostRecent ? new Date(probe.mostRecent).toISOString().slice(0, 10) : "n/a";
    newNodes.push({
      id: roostId,
      label,
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent,
      info: `${probe.categories.length} top-level categories · ${probe.totalFiles} files (1 level deep) · most-recent ${recent} · source: ${sourcePath}`.slice(0, MAX_INFO * 2),
    });
    existing.add(roostId);
    roostEmitted = 1;
  }

  let emitted = 0;
  for (const c of probe.categories) {
    const nid = `${roostId}.${safeId(c.name)}`;
    if (existing.has(nid)) continue;
    const ageDays = c.latestMtime
      ? Math.round((Date.now() - c.latestMtime) / (24 * 60 * 60 * 1000))
      : null;
    const info = c.kind === "dir"
      ? `[dir · ${c.fileCount} entries · ${ageDays != null ? ageDays + "d old" : "no mtime"}] ${c.name}`
      : `[file · ${ageDays != null ? ageDays + "d old" : "no mtime"}] ${c.name}`;
    newNodes.push({
      id: nid,
      label: `${c.name} (${c.fileCount})`.slice(0, MAX_LABEL),
      layer: CATEGORY_LAYER,
      ghost: true,
      status: "ghost",
      kind: c.kind === "dir" ? "extracted-category" : "extracted-file",
      parent: roostId,
      info: info.slice(0, MAX_INFO),
    });
    existing.add(nid);
    emitted++;
  }

  return { newNodes, stats: { roostEmitted, categoryCount: probe.categories.length, emitted, totalFiles: probe.totalFiles } };
}

export function main() {
  const existing = new Set();

  // Source 1: extracted_modules
  const probeM = probeDirectory(EXTRACTED_MODULES_PATH);
  if (probeM.categories.length === 0) {
    console.warn(`WARN: ${EXTRACTED_MODULES_PATH} empty or missing`);
  }
  const { newNodes: nodesM, stats: statsM } = generateForSource(
    "ghost.extracted_modules", probeM,
    { label: "PRISM/extracted_modules (legacy monolith extraction)",
      sourcePath: "H:/PRISM/extracted_modules", existingIds: existing });

  // Source 2: extracted
  const probeE = probeDirectory(EXTRACTED_PATH);
  if (probeE.categories.length === 0) {
    console.warn(`WARN: ${EXTRACTED_PATH} empty or missing`);
  }
  const { newNodes: nodesE, stats: statsE } = generateForSource(
    "ghost.extracted", probeE,
    { label: "PRISM/extracted (categorized engine/algorithm/formula extraction)",
      sourcePath: "H:/PRISM/extracted", existingIds: existing });

  const newNodes = [...nodesM, ...nodesE];
  const result = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "H:/PRISM/extracted_modules + H:/PRISM/extracted (live fs probe)",
    newNodes,
    newEdges: [],
    stats: {
      extracted_modules: statsM,
      extracted: statsE,
      totalNewNodes: newNodes.length,
    },
  };

  try { fs.mkdirSync(VIZ_DIR, { recursive: true }); } catch { /* exists */ }
  try { fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  extracted_modules: roost=${statsM.roostEmitted} categories=${statsM.emitted}/${statsM.categoryCount} files=${statsM.totalFiles}`);
  console.log(`  extracted:         roost=${statsE.roostEmitted} categories=${statsE.emitted}/${statsE.categoryCount} files=${statsE.totalFiles}`);
  console.log(`  total new nodes:   ${result.newNodes.length}`);
  return 0;
}

// CLI entry
import { pathToFileURL } from "node:url";
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) process.exit(main());
