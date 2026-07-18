/**
 * build-cad-geometric-index.mjs -- build a persisted GEOMETRIC vector index over a CAD STEP corpus
 * (slot:delta, U-CAD-GEOMEMBED-INDEX). The R13 verifiable-core of the embedding WIRING line: it turns the
 * proven featurizer (cad-geometric-embedding.mjs, a80f53bd21) into the actual artifact Qdrant / the
 * CADEmbeddingIndexOrchestrator will load -- {path, bytes, geometryClass, vector} rows -- WITHOUT touching
 * the live TS engine yet (that architectural swap is the final wiring step). Standalone + fail-soft.
 *
 * Corpus reality (verified 2026-07-04): CAD_CORPUS_ALLVENDOR.jsonl = 31,177 rows but only 58.4% LIVE
 * (12,976 dead paths in cleaned worktrees). So extraction MUST fail-soft per-file and REPORT the skip
 * reasons loud (R12), never silently drop. Large assemblies (e.g. a 44MB jet STEP) are size-capped so a
 * bounded run stays fast.
 *
 * Karpathy discipline:
 *   CLASSIFY: I/O batch (read STEP) + transform (featurize) + persist (jsonl) + eval (recall@k self-check).
 *   TECHNIQUE: injectable readers (readFileImpl/statImpl) so the pure batch loop is node:test-able without
 *     a real filesystem; atomic tmp+rename write so a concurrent reader never sees a torn index.
 *   EDGE CASES: missing / unreadable / too-big / no-parseable-geometry -> a distinct skip status each,
 *     NEVER a throw that aborts the batch; a part with an unknown unit still indexes on its (unit-free)
 *     surface histogram (unitResolved:false flag) rather than being dropped.
 *   FAILURE MODES: a single bad file cannot kill the run; every row is try/caught to its status.
 *
 * @module scripts/build-cad-geometric-index
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyStepGeometry } from "./lib/step-dimension-extract.mjs";
import { geometricFeaturesFromStep, geometricFeatureVector, GEOM_FEATURE_DIM, meanRecallAtK } from "./lib/cad-geometric-embedding.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const DEFAULT_DIR = path.resolve("H:/PRISM/resources/CAD FILES");
const DEFAULT_OUT = path.resolve(REPO_ROOT, "state/shared/cad-geometric-index.jsonl");
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB -- skip huge assemblies to keep a bounded run fast

/**
 * Index ONE STEP path -> a row. Injectable readers make it hermetically testable.
 * @returns {{path,bytes,status,geometryClass?,unitResolved?,dim?,vector?}} status in
 *   'indexed' | 'missing' | 'unreadable' | 'too-big' | 'no-geometry'.
 */
export function indexOne(p, { readFileImpl = fs.readFileSync, statImpl = fs.statSync, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  let bytes = 0;
  try { bytes = statImpl(p).size; } catch { return { path: p, bytes: 0, status: "missing" }; }
  if (bytes > maxBytes) return { path: p, bytes, status: "too-big" };
  let text;
  try { text = readFileImpl(p, "utf8"); } catch { return { path: p, bytes, status: "unreadable" }; }
  const geom = classifyStepGeometry(text);
  if (!geom.totalSurfaces) return { path: p, bytes, status: "no-geometry" }; // nothing to featurize meaningfully
  const feats = geometricFeaturesFromStep(text);
  const vector = Array.from(geometricFeatureVector(feats));
  return {
    path: p, bytes, status: "indexed",
    geometryClass: geom.geometryClass,
    unitResolved: feats.maxExtentMm > 0, // false -> bbox/size/radii dims are 0 (surface histogram still valid)
    dim: GEOM_FEATURE_DIM,
    vector,
  };
}

/**
 * Build the index over a list of STEP paths. `exclude` = Set of lowercased basenames to skip (e.g. the
 * topology-audit's broken refs). Returns { rows (indexed only), stats }.
 */
export function buildIndex(paths, { readFileImpl, statImpl, maxBytes, limit = Infinity, exclude } = {}) {
  const list = Array.isArray(paths) ? paths.slice(0, limit) : [];
  const rows = [];
  const stats = { total: list.length, indexed: 0, excluded: 0, missing: 0, unreadable: 0, tooBig: 0, noGeometry: 0, unresolvedUnit: 0, byClass: {} };
  for (const p of list) {
    if (exclude && exclude.has(path.basename(p).toLowerCase())) { stats.excluded++; continue; }
    let r;
    try { r = indexOne(p, { readFileImpl, statImpl, maxBytes }); }
    catch { r = { path: p, bytes: 0, status: "unreadable" }; } // a featurizer throw must not abort the batch
    switch (r.status) {
      case "indexed":
        rows.push(r); stats.indexed++;
        stats.byClass[r.geometryClass] = (stats.byClass[r.geometryClass] || 0) + 1;
        if (!r.unitResolved) stats.unresolvedUnit++;
        break;
      case "missing": stats.missing++; break;
      case "unreadable": stats.unreadable++; break;
      case "too-big": stats.tooBig++; break;
      case "no-geometry": stats.noGeometry++; break;
    }
  }
  return { rows, stats };
}

/** Read STEP paths from a CAD_CORPUS_ALLVENDOR-style manifest jsonl (sourcePath per row). */
export function readManifestPaths(manifestPath, { readFileImpl = fs.readFileSync } = {}) {
  let text;
  try { text = readFileImpl(manifestPath, "utf8"); } catch { return []; }
  const out = [];
  for (const line of String(text).split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try { const o = JSON.parse(t); if (o.sourcePath && /\.(step|stp)$/i.test(o.sourcePath)) out.push(o.sourcePath); } catch { /* skip torn line */ }
  }
  return out;
}

/** Load the topology-audit broken-ref exclusion set (lowercased basenames); fail-soft to empty. */
function loadExclusion(reportPath = path.resolve(REPO_ROOT, "state/shared/cad-corpus-topology-report.json")) {
  try {
    const rep = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    return new Set((rep.invalidPaths || []).map((p) => path.basename(String(p)).toLowerCase()));
  } catch { return new Set(); }
}

/** Atomic write of the index rows as jsonl. */
export function writeIndex(rows, outPath = DEFAULT_OUT) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
  fs.renameSync(tmp, outPath);
  return outPath;
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const val = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : def; };
  const manifest = val("manifest", null);
  const dir = val("dir", manifest ? null : DEFAULT_DIR);
  const limit = Number(val("limit", "Infinity"));
  const out = val("out", DEFAULT_OUT);

  let paths = [];
  if (manifest) paths = readManifestPaths(manifest);
  else if (dir) { try { paths = fs.readdirSync(dir).filter((f) => /\.(step|stp)$/i.test(f)).map((f) => path.join(dir, f)); } catch { paths = []; } }

  const t0 = Date.now();
  const { rows, stats } = buildIndex(paths, { limit: Number.isFinite(limit) ? limit : Infinity, exclude: loadExclusion() });
  if (args.includes("--write")) { const w = writeIndex(rows, out); stats.wrote = w; }
  if (args.includes("--eval") && rows.length) {
    const labeled = rows.map((r) => ({ label: r.geometryClass, vec: r.vector }));
    stats.evalRecallAt1 = +meanRecallAtK(labeled, 1).toFixed(3);
    stats.evalRecallAt3 = +meanRecallAtK(labeled, 3).toFixed(3);
  }
  stats.elapsedS = +((Date.now() - t0) / 1000).toFixed(1);
  console.log(`cad-geometric-index: indexed ${stats.indexed}/${stats.total} (excluded ${stats.excluded}, missing ${stats.missing}, unreadable ${stats.unreadable}, too-big ${stats.tooBig}, no-geometry ${stats.noGeometry}, unresolved-unit ${stats.unresolvedUnit})`);
  console.log(`  byClass: ${JSON.stringify(stats.byClass)}`);
  if (stats.evalRecallAt1 !== undefined) console.log(`  self-check recall@1=${stats.evalRecallAt1} recall@3=${stats.evalRecallAt3} (by geometryClass)`);
  if (stats.wrote) console.log(`  wrote -> ${stats.wrote}`);
  console.log(`  (${stats.elapsedS}s)`);
}
