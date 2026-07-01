#!/usr/bin/env node
/**
 * analyze-corpus-redundancy.mjs -- find corpus *-extracted.json files that are REDUNDANT with the
 * .ts-getter cache files already loaded into ToolCatalogEngine as "standard" tools (U-DBCON-DEDUP
 * completion, slot:romeo 2026-06-12).
 *
 * WHY: U-DBCON-DEDUP removed osg/guhring/sandvik-tools-extracted.json (100% twins of their
 * osg-tools.json etc. caches, 17,389 dups). But additional-tools.json (a multi-vendor cache) ALSO
 * duplicates corpus vendors (Accupro/Flash/YG-1 confirmed). This detector compares EVERY corpus
 * file's part-number keys against the union of all cache-file keys, so we extend REDUNDANT_EXTRACTED
 * for true twins ONLY (>= REDUNDANT_THRESHOLD overlap) and leave partial-overlap files alone (they
 * carry unique tools -- excluding them would lose data).
 *
 * Pure raw-JSON analysis (no engine/tsx) -- fast + reliable. Read-only, writes nothing.
 * Usage: node scripts/analyze-corpus-redundancy.mjs [--threshold 0.99]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dir, "..", "..");
const SRC_DATA = resolve(REPO, "mcp-server", "src", "data");
const INDEX_PATH = resolve(REPO, "mcp-server", "data", "CATALOG_INDEX.json");

const thresholdArg = process.argv.find(a => a.startsWith("--threshold"));
const THRESHOLD = thresholdArg ? Number(thresholdArg.split("=")[1] ?? process.argv[process.argv.indexOf(thresholdArg) + 1]) : 0.99;

// The .ts-getter cache files loaded as "standard" tools (ToolCatalogEngine getters, lines 51-66).
const CACHE_FILES = [
  "osg-tools.json", "guhring-tools.json", "sandvik-tools.json", "additional-tools.json",
  "indexable-tools.json", "emuge-tools.json", "ampc-tools.json", "global-cnc-tools.json",
  "sandvik-2018-rotating.json", "kennametal-turning.json", "helical-tools.json",
  "sumitomo-tools.json", "tungaloy-turning.json",
];
// Already excluded by REDUNDANT_EXTRACTED -- skip (they're the proven case).
const ALREADY_EXCLUDED = new Set([
  "osg-tools-extracted.json", "guhring-tools-extracted.json", "sandvik-tools-extracted.json",
]);

const norm = (v) => (v == null ? "" : String(v).trim().toUpperCase());
/** Stable part-number key for a record (edp / part_number / designation / name / order_no). */
const keyOf = (r) => norm(r.edp ?? r.part_number ?? r.designation ?? r.name ?? r.order_no);
/** Cutting diameter for geometry cross-check (raw record, both pipelines share the raw value). */
const diaOf = (r) => {
  const d = r.cutting_diameter_mm ?? r.diameter_mm;
  return Number.isFinite(Number(d)) ? Number(d) : null;
};

/** Every array of record-like objects in a parsed JSON file, flattened. */
function records(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    return Object.values(data).filter(Array.isArray).flat();
  }
  return [];
}
function read(file) {
  const p = resolve(SRC_DATA, file);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

// 1. Build the cache union: key -> Set<diameter*1000> (so we can verify GEOMETRY, not just key,
//    to reject part-number-string collisions across vendors in the mixed cache union).
const cacheByKey = new Map();
let cacheRead = 0;
for (const f of CACHE_FILES) {
  const data = read(f);
  if (!data) { console.log(`  (cache file absent/unreadable: ${f})`); continue; }
  const recs = records(data);
  cacheRead += recs.length;
  for (const r of recs) {
    const k = keyOf(r); if (!k) continue;
    let s = cacheByKey.get(k); if (!s) { s = new Set(); cacheByKey.set(k, s); }
    const d = diaOf(r); if (d != null) s.add(Math.round(d * 1000));
  }
}
console.log(`Cache union: ${cacheByKey.size} distinct part-number keys (from ${cacheRead} records across ${CACHE_FILES.length} cache files)\n`);

// 2. For each corpus *-extracted.json, compute overlap with the cache union.
const idx = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
const rows = [];
for (const c of idx.catalogs) {
  if (ALREADY_EXCLUDED.has(c.file)) continue;
  if (!/-extracted\.json$/i.test(c.file)) continue;
  const data = read(c.file);
  if (!data) continue;
  const recs = records(data);
  // Per record: key-match (key in cache) and geom-match (key in cache AND a cache twin shares the
  // cutting diameter -- or neither side carries a diameter, so it can't be disconfirmed).
  let total = 0, keyMatch = 0, geomMatch = 0;
  for (const r of recs) {
    const k = keyOf(r); if (!k) continue;
    total++;
    const cacheDias = cacheByKey.get(k);
    if (!cacheDias) continue;
    keyMatch++;
    const d = diaOf(r);
    if (d == null || cacheDias.size === 0 || cacheDias.has(Math.round(d * 1000))) geomMatch++;
  }
  if (total === 0) continue;
  rows.push({
    file: c.file, mfr: c.manufacturer, records: recs.length, total,
    pctKey: keyMatch / total, pctGeom: geomMatch / total,
  });
}
rows.sort((a, b) => b.pctGeom - a.pctGeom || b.records - a.records);

console.log(`Per-corpus-file overlap vs cache union (REDUNDANT = key>=${(THRESHOLD * 100).toFixed(0)}% AND geom>=${(THRESHOLD * 100).toFixed(0)}%):\n`);
console.log("  keyPct  geomPct  records  verdict    file (manufacturer)");
let redundantTotal = 0;
const redundantFiles = [];
for (const r of rows) {
  const isRedundant = r.pctKey >= THRESHOLD && r.pctGeom >= THRESHOLD;
  // key-high but geom-low = part-number-string COLLISION, not a true twin -> KEEP (data loss risk).
  const collision = r.pctKey >= THRESHOLD && r.pctGeom < THRESHOLD;
  const verdict = isRedundant ? "REDUNDANT" : collision ? "COLLISION" : (r.pctKey >= 0.5 ? "partial  " : "         ");
  console.log(`  ${(r.pctKey * 100).toFixed(1).padStart(5)}%  ${(r.pctGeom * 100).toFixed(1).padStart(6)}%  ${String(r.records).padStart(7)}  ${verdict}  ${r.file} (${r.mfr})`);
  if (isRedundant) { redundantTotal += r.records; redundantFiles.push(r.file); }
}
console.log(`\nTRUE-TWIN REDUNDANT (key+geom >= ${(THRESHOLD * 100).toFixed(0)}%): ${redundantFiles.length} files, ${redundantTotal} records`);
if (redundantFiles.length) console.log("  files: " + redundantFiles.join(", "));
console.log("\nNOTE: COLLISION rows share a part-number string but NOT geometry -> NOT twins, keep them.");
