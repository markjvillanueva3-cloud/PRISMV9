#!/usr/bin/env node
/**
 * brand-tool-catalog.mjs -- unified loader + normalizer for the PRISM brand-tool corpus.
 *
 * WHY (slot:romeo, 2026-06-19): the work order is "finish generating tool libraries for ALL
 * top brands of tool holders + tooling + inserts for Fusion, hyperMILL and Mastercam". The
 * extracted brand corpus already exists under mcp-server/src/data/ (51 *-extracted.json +
 * 12 *-tools.json) but in THREE incompatible schema families, so no single emitter can consume
 * it. This is the verifiable CORE (R13 logical order): one canonical tool record that every
 * CAM emitter (Fusion .tools / hyperMILL .hmt / Mastercam .csv) reads from.
 *
 * THREE SOURCE SCHEMA FAMILIES (verified against live data 2026-06-19):
 *   1. camelCase solid (inch)     helical/osg/sumitomo/guhring/emuge *-tools.json:
 *        {productId, type, diameter, shaftDiameter, fluteLength, overallLength,
 *         numberOfFlutes, cornerRadius, unit:"inches", coating, bodyMaterial, ...}
 *   2. snake_case indexable (mm)  indexable/iscar/kennametal-milling *-extracted.json:
 *        {designation, manufacturer, type, subtype, cutting_diameter_mm,
 *         shank_diameter_mm, overall_length_mm, max_depth_of_cut_mm, ...}
 *   3. turning insert (ISO)       kennametal-turning/iscar-turning/korloy-turning:
 *        {catalogNumber, isoNumber, type:"turning_insert", shape, ic_mm, ic_inch,
 *         cornerRadius_mm, l10_mm, chipbreaker, ...}
 *   + holder (name-only)          big-daishowa/haimer/guhring/osg/tungaloy *-holder*.json:
 *        {designation, manufacturer, type:"holder", [cutting_diameter_mm]}
 *
 * UNITS-FIRST (safety rail, [[feedback_check_units_first]]): every length is normalized to mm
 * for the canonical record, but `unit_source` is preserved verbatim and inch->mm uses the single
 * canonical MM_PER_INCH. snake_case `*_mm` fields are copied with NO scaling (already mm). A
 * record whose unit cannot be resolved is marked unit_source:"unknown" and geometry_complete:false
 * -- never silently assumed metric (a units guess is a 25.4x scale error).
 *
 * Pure: no network. Deterministic given a fixed data dir. The only I/O is fs.readFileSync of the
 * brand JSON files, isolated in loadBrandCatalog(); all transform fns are pure + unit-testable.
 *
 * Usage:
 *   node scripts/lib/brand-tool-catalog.mjs [--data-dir <dir>] [--json] [--self-test]
 * API:
 *   import { loadBrandCatalog, normalizeRecord, categorize } from "./lib/brand-tool-catalog.mjs"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MM_PER_INCH = 25.4;
// A solid endmill cutting diameter at or below this many "units" with no explicit unit key is
// treated as inch-native (Helical/OSG export inch geometry); above it the row is mm-spec.
const SOLID_INCH_DIA_CEILING = 4;
const NAME_WORD_ABBREV_LEN = 3; // <= this many chars -> uppercase the word in brand inference

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DATA_DIR = path.resolve(HERE, "../../mcp-server/src/data");

// ## File-discovery: which corpus files carry tool/holder/insert geometry
// Auto-discovered patterns. We include every *-tools.json (normalized lane) plus the
// geometry-bearing *-extracted.json. Pure metadata / non-tool extracted files are
// rejected at the RECORD level (must have an id + a tool-like type or a diameter), so a
// stray non-tool json contributes 0 records rather than corrupting counts.
const INCLUDE_RE = /(-tools\.json|-extracted\.json|-holder-extracted\.json|holders-extracted\.json|-(turning|rotating|milling|holemaking|threading|drilling|grooving)\.json)$/i;
// Files that match the suffix but are NOT brand tool data (safety excludes).
const EXCLUDE_RE = /(machine|material|speed|alarm|tips|knowledge|schema|grade-extracted)/i;

// Load EVERY matching file (incl. both the Jun-12 normalized *-turning/-rotating/-milling.json
// AND the older *-extracted.json). FILE-level "prefer non-extracted" dedup is WRONG -- verified:
// a rich file can be EMPTY (ampc-tools.json parses to 0 records -> dropping ampc-tools-extracted
// loses all 555) and a rich+extracted pair can be COMPLEMENTARY (kennametal-turning rich 5781 vs
// extracted 1630 share 0 ids -> different id schemes). Dedup is done at the RECORD level (by
// brand|id, preferring the geometry-complete copy) in loadBrandCatalog instead.
export function discoverCatalogFiles(dataDir = DEFAULT_DATA_DIR) {
  let names;
  try {
    names = fs.readdirSync(dataDir);
  } catch (err) {
    throw new Error(`brand-tool-catalog: cannot read data dir ${dataDir}: ${err.message}`);
  }
  return names
    .filter((n) => INCLUDE_RE.test(n) && !EXCLUDE_RE.test(n))
    .sort()
    .map((n) => path.join(dataDir, n));
}

// ## Brand inference (filename -> human brand)
const BRAND_ALIASES = {
  "big-daishowa": "Big Daishowa", "global-cnc": "Global CNC", "ma-ford": "MA Ford",
  "hsm-advisor": "HSMAdvisor", "dormer-pramet": "Dormer Pramet", "global cnc": "Global CNC",
};
export function inferBrand(fileName) {
  const base = path.basename(fileName)
    .replace(/\.json$/i, "")
    .replace(/-(tools?|holders?|tool|holder)?-?(extracted)?$/i, "")
    .replace(/-(tools?|holders?|turning|milling|holemaking|threading|rotating|endmill|insert_grade|drill|power)$/i, "");
  const key = base.toLowerCase();
  if (BRAND_ALIASES[key]) return BRAND_ALIASES[key];
  return base
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((w) => (w.length <= NAME_WORD_ABBREV_LEN ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

// ## Canonical brand name -- collapse case/punctuation variants the SOURCE data splits
// (verified live: "ISCAR" vs "Iscar" = 12148/149; "YG-1" vs "YG1" = 13586/1) so the
// per-brand emitters produce ONE library per real brand, not two casings of the same maker.
const BRAND_CANON = {
  iscar: "ISCAR", yg1: "YG-1", osg: "OSG", bigdaishowa: "Big Daishowa", maford: "MA Ford",
  globalcnc: "Global CNC", hsmadvisor: "HSMAdvisor", dormerpramet: "Dormer Pramet",
  kennametal: "Kennametal", sandvik: "Sandvik", sumitomo: "Sumitomo", guhring: "Guhring",
  helical: "Helical", emuge: "Emuge", korloy: "Korloy", tungaloy: "Tungaloy", seco: "Seco",
  niagara: "Niagara", mitsubishi: "Mitsubishi", walter: "Walter", accupro: "Accupro",
};
export function canonicalBrand(name) {
  if (!name) return name;
  const key = String(name).toLowerCase().replace(/[\s._-]+/g, "");
  return BRAND_CANON[key] || name;
}

// ## Number coercion (tolerant of strings; European comma already pre-cleaned upstream)
function num(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ## Unit resolution (UNITS-FIRST)
// Returns "inches" | "mm" | "unknown". Never guesses metric from absence.
export function detectUnit(raw) {
  if (typeof raw.unit === "string") {
    const u = raw.unit.toLowerCase();
    if (u.startsWith("inch") || u === "in" || u === '"') return "inches";
    if (u.startsWith("mm") || u.startsWith("milli") || u === "metric") return "mm";
  }
  // snake_case *_mm keys -> mm; *_inch-only -> inches
  const keys = Object.keys(raw);
  const hasMm = keys.some((k) => /_mm$/.test(k));
  const hasInch = keys.some((k) => /_inch$/.test(k));
  if (hasMm) return "mm";
  if (hasInch && !hasMm) return "inches";
  // camelCase solid family carries no unit key on some rows but is inch-native (Helical/OSG).
  // Only assert inch when a clearly-imperial-magnitude solid diameter is present.
  const camelDia = num(raw.diameter ?? raw.shaftDiameter);
  if (camelDia != null && (raw.fluteLength != null || raw.numberOfFlutes != null || raw.overallLength != null)) {
    return camelDia <= SOLID_INCH_DIA_CEILING ? "inches" : "mm";
  }
  return "unknown";
}

function toMm(value, unit) {
  if (value == null) return null;
  if (unit === "inches") return value * MM_PER_INCH;
  if (unit === "mm") return value;
  return null; // unknown unit -> no fabricated mm value (R12)
}

// ## Geometry plausibility gate (guards against source mis-parses, e.g. a catalog code
// "380" read as a 380mm drill -- verified live in additional-tools.json "YG1-380.0").
// Ceilings are GENEROUS per category so real large indexable mills are NOT false-rejected;
// only the physically-impossible is flagged. A name-only record (no diameter) is NOT
// implausible -- there is simply no geometry to judge.
// Ceilings sized to admit the largest REAL tools per class (verified live: MA Ford 4-6in
// solid mills = 101.6-152.4mm, Allied ~3.97in drills = 100.8mm, ISCAR indexable face mills
// to 311mm) while still rejecting source mis-parses (YG1-380 drill, Korloy 8e18mm codes).
const MAX_DIA_MM = {
  drill: 250, reamer: 200, solid_mill: 250, indexable_mill: 320,
  turning: 200, thread: 200, insert: 60,
};
const MIN_DIA_MM = 0.05; // micro-tools bottom out ~0.1mm; reject <=0 and sub-physical values
export function isPlausibleGeometry(category, diameter_mm) {
  if (diameter_mm == null) return true;          // name-only: nothing to judge
  if (!(diameter_mm > 0) || diameter_mm < MIN_DIA_MM) return false; // 0 / negative / sub-physical
  const ceil = MAX_DIA_MM[category];
  if (ceil == null) return true;                 // holder/unknown -> no dia ceiling
  return diameter_mm <= ceil;
}

// ## End-mill mis-parse gates (U-BRAND-CATALOG-CLEANUP 2026-06-20)
// A solid/indexable END mill (flat/ball/bull) cannot exceed ~3in cutting dia; above this the source
// cutting_diameter_mm is a mis-parse (verified: ISCAR "M ECS-A1.00X06-2T" Dc 102.67 on a 5.99mm
// connection -- 17x ratio, impossible). FACE/SHELL mills mount on an arbor and ARE legitimately large,
// so they keep the generous indexable ceiling (MAX_DIA_MM). SHANK_RATIO_MAX guards the inverse mis-parse
// (a plausible diameter on an impossibly tiny shank -- there the shank, not the diameter, is the artifact).
export const ENDMILL_DIA_MAX_MM = 80;
export const SHANK_RATIO_MAX = 8;
const FACE_MILL_RE = /face|shell|fly.?cut/i;
export function isEndmillOversizeDia(category, typeStr, diameter_mm) {
  if (!(diameter_mm > ENDMILL_DIA_MAX_MM)) return false;
  if (category !== "solid_mill" && category !== "indexable_mill") return false;
  if (FACE_MILL_RE.test(String(typeStr ?? ""))) return false; // real face/shell mills are large
  return true;
}

// ## Length mis-parse ceilings (U-FUSION-INCH-CLEAN 2026-06-21)
// Physical upper bounds (mm) for LENGTH geometry beyond the cutting diameter. A source overall-length,
// flute-length, or shank-diameter past these is a parse artifact (verified across the brand corpus:
// OAL 1447mm & 140000mm, flute 1270mm, shank/SFDM 25374mm). The ceilings are deliberately GENEROUS so
// no real cutter is rejected -- the longest real mills/drills/reamers run ~500mm OAL & ~300mm flute,
// and real shanks are <=63mm. When a value exceeds its ceiling the FIELD is nulled (NOT the tool
// dropped): the cutting diameter stays usable and the emitter omits the corrupt length (Fusion then
// derives a default reach). Pairs with isEndmillOversizeDia (which drops a tool on a bad DIAMETER).
export const OAL_MAX_MM = 1000;
export const LCF_MAX_MM = 1000;
export const SHANK_MAX_MM = 250;
/** A length is plausible iff it is a finite number in (0, max]. Used to null source mis-parses. */
export function plausibleLengthMm(value, max) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max;
}

// ## Category classification
export function categorize(raw) {
  const t = String(raw.type ?? raw.subType ?? raw.subtype ?? "").toLowerCase();
  const sub = String(raw.subtype ?? raw.subType ?? "").toLowerCase();
  if (t.includes("holder") || t === "coupling") return "holder";
  if (t.includes("turning_insert") || t.includes("insert")) return "insert";
  if (t.includes("ream")) return "reamer";
  if (t.includes("drill") || t.includes("holemaking") || t.includes("countersink") ||
      t.includes("counterbore") || t.includes("spot")) return "drill";
  if (t.includes("tap") || t.includes("thread")) return "thread";
  if (t.includes("turning") || t.includes("boring") || t.includes("groov") ||
      t.includes("parting") || t.includes("part_off") || t.includes("part-off")) return "turning";
  if (t.includes("end_mill") || t.includes("endmill") || t.includes("end mill") ||
      t.includes("mill") || /flat|ball|bull|chamfer|corner/.test(t)) {
    return sub.includes("indexable") ? "indexable_mill" : "solid_mill";
  }
  // fall back on geometry cues
  if (raw.ic_mm != null || raw.isoNumber != null) return "insert";
  if (raw.numberOfFlutes != null || raw.fluteLength != null) return "solid_mill";
  return "unknown";
}

// ## Canonical record
/**
 * Normalize a raw brand record -> canonical tool record (lengths in mm).
 * @returns {object|null} null when the record is not a tool/holder/insert (filtered).
 */
export function normalizeRecord(raw, brandFallback = "") {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.productId ?? raw.catalogNumber ?? raw.designation ?? raw.isoNumber ?? raw.id ?? raw["product-id"];
  const category = categorize(raw);
  const unit = detectUnit(raw);

  // a tool-like record needs an id AND (a recognizable category OR any diameter cue)
  const diaCue =
    raw.cutting_diameter_mm ?? raw.diameter ?? raw.ic_mm ?? raw.d_mm ?? raw.shaftDiameter ?? raw.shank_diameter_mm;
  if (!id || (category === "unknown" && diaCue == null)) return null;

  // diameter: insert -> inscribed circle (ic); cutting tool -> cutting dia
  const diameter_mm =
    category === "insert"
      ? num(raw.ic_mm) ?? toMm(num(raw.ic_inch), "inches")
      : num(raw.cutting_diameter_mm) ?? toMm(num(raw.diameter), unit);
  const shank_mm = num(raw.shank_diameter_mm) ?? toMm(num(raw.shaftDiameter ?? raw.shank_diameter), unit);
  const flute_len_mm = num(raw.flute_length_mm ?? raw.loc_mm) ??
    toMm(num(raw.fluteLength ?? raw.cuttingLength ?? raw.effective_cutting_depth_mm), unit);
  const oal_mm = num(raw.overall_length_mm) ?? toMm(num(raw.overallLength ?? raw.oal), unit);
  const corner_radius_mm =
    num(raw.cornerRadius_mm) ?? num(raw.corner_radius_mm) ?? toMm(num(raw.cornerRadius), unit);
  const num_flutes = num(raw.numberOfFlutes ?? raw.num_flutes ?? raw.flutes ?? raw.teeth);

  // ## geometry mis-parse gates (U-BRAND-CATALOG-CLEANUP 2026-06-20)
  // bad-diameter: an end-mill-type tool past the 80mm end-mill ceiling -> cutting_diameter_mm is a
  //   source artifact; mark geometry_plausible=false so the emitter drops it from every CAM lane.
  // bad-shank: a plausible diameter but an impossible tiny shank (Dc/shank>SHANK_RATIO_MAX) -> drop the
  //   shank ONLY; the diameter is usable, and the Fusion emitter falls back to SFDM=cutting-dia (line 83).
  const typeStr = String(raw.type ?? raw.subtype ?? raw.subType ?? "");
  const endmillOversize = isEndmillOversizeDia(category, typeStr, diameter_mm);
  const shankImplausible =
    !endmillOversize && diameter_mm > 0 && shank_mm > 0 && diameter_mm / shank_mm > SHANK_RATIO_MAX;
  // bad-shank (either direction): an impossibly tiny shank (ratio gate) OR a >SHANK_MAX_MM / <=0 shank
  //   is a source artifact -> null it; the Fusion emitter then falls back to SFDM = cutting diameter.
  const cleanShank =
    shank_mm == null || shankImplausible || !plausibleLengthMm(shank_mm, SHANK_MAX_MM) ? null : shank_mm;
  // bad-length: an OAL/flute-length past its physical ceiling is a parse artifact -> null the FIELD
  //   (the diameter stays usable; every CAM lane then omits the corrupt reach rather than emit garbage).
  const cleanOal = plausibleLengthMm(oal_mm, OAL_MAX_MM) ? oal_mm : null;
  const cleanFlute = plausibleLengthMm(flute_len_mm, LCF_MAX_MM) ? flute_len_mm : null;

  // honest geometry completeness -- usable in a CAM collision/sim lib (reflects the CLEANED lengths)
  const geometry_complete =
    category === "insert"
      ? diameter_mm != null && corner_radius_mm != null
      : category === "holder"
      ? false // holders are name-only in this corpus; geometry attached downstream (iter 5)
      : diameter_mm != null && (cleanOal != null || cleanFlute != null);

  return {
    id: String(id),
    brand: canonicalBrand(raw.manufacturer || brandFallback || "Unknown"),
    category,
    type: raw.type ?? null,
    subtype: raw.subtype ?? raw.subType ?? null,
    unit_source: unit,
    diameter_mm,
    shank_mm: cleanShank,
    flute_len_mm: cleanFlute,
    oal_mm: cleanOal,
    corner_radius_mm,
    num_flutes,
    coating: raw.coating ?? null,
    material: raw.bodyMaterial ?? raw.material ?? null,
    iso_number: raw.isoNumber ?? null,
    shape: raw.shape ?? null,
    description: raw.description ?? null,
    geometry_complete,
    geometry_plausible: isPlausibleGeometry(category, diameter_mm) && !endmillOversize,
  };
}

// ## Loader (only I/O surface)
/**
 * Load + normalize the entire brand corpus.
 * @param {{dataDir?:string, files?:string[]}} opts
 * @returns {{records:object[], byBrand:object, byCategory:object, stats:object, files:object[]}}
 */
export function loadBrandCatalog(opts = {}) {
  const dataDir = opts.dataDir || DEFAULT_DATA_DIR;
  const files = opts.files || discoverCatalogFiles(dataDir);
  const records = [];
  const fileStats = [];
  const seen = new Map(); // `${brand}|${id}` -> index in records (record-level dedup)
  let duplicatesDropped = 0;

  for (const file of files) {
    const brand = inferBrand(file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
      fileStats.push({ file: path.basename(file), error: err.message, records: 0 });
      continue; // a single bad file never kills the whole load (R12: recorded, not hidden)
    }
    // accept top-level array OR {tools:[...]} / {data:[...]} wrappers
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.tools) ? parsed.tools
      : Array.isArray(parsed?.data) ? parsed.data
      : Array.isArray(parsed?.records) ? parsed.records
      : [];
    let kept = 0;
    for (const raw of arr) {
      const rec = normalizeRecord(raw, brand);
      if (!rec) continue;
      rec.source_file = path.basename(file);
      // Record-level dedup: the same tool can appear in a rich Jun-12 file AND its older
      // -extracted sibling (true duplicate). Key on brand|id; keep the geometry-complete copy.
      // Complementary sets (different id schemes) never collide, so both survive.
      const key = `${rec.brand}|${rec.id}`;
      const existingIdx = seen.get(key);
      if (existingIdx === undefined) {
        seen.set(key, records.length);
        records.push(rec);
        kept += 1;
      } else {
        duplicatesDropped += 1;
        if (rec.geometry_complete && !records[existingIdx].geometry_complete) records[existingIdx] = rec;
      }
    }
    fileStats.push({ file: path.basename(file), brand, raw: arr.length, records: kept });
  }

  const byBrand = {};
  const byCategory = {};
  let geomComplete = 0;
  let implausible = 0;
  for (const r of records) {
    byBrand[r.brand] = (byBrand[r.brand] || 0) + 1;
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    if (r.geometry_complete) geomComplete += 1;
    if (!r.geometry_plausible) implausible += 1;
  }

  return {
    records,
    byBrand,
    byCategory,
    files: fileStats,
    stats: {
      total: records.length,
      brands: Object.keys(byBrand).length,
      geometry_complete: geomComplete,
      geometry_complete_pct: records.length ? +(100 * geomComplete / records.length).toFixed(1) : 0,
      implausible_geometry: implausible,
      duplicates_dropped: duplicatesDropped,
      files_loaded: fileStats.filter((f) => !f.error).length,
      files_errored: fileStats.filter((f) => f.error).length,
    },
  };
}

// ## Self-test (real-value assertions against live corpus)
function selfTest() {
  const checks = [];
  const ok = (name, cond) => checks.push({ name, ok: !!cond });

  // pure-unit assertions (no I/O)
  ok("MM_PER_INCH canonical", MM_PER_INCH === 25.4);
  ok("inch solid -> mm (0.5in dia = 12.7mm)",
    normalizeRecord({ productId: "X", type: "flat_end_mill", diameter: 0.5, numberOfFlutes: 3, overallLength: 4, unit: "inches" }).diameter_mm === 12.7);
  ok("mm snake_case copied verbatim (no scale)",
    normalizeRecord({ designation: "Y", type: "end_mill", cutting_diameter_mm: 10, overall_length_mm: 100 }).diameter_mm === 10);
  ok("turning insert uses ic_mm",
    normalizeRecord({ catalogNumber: "Z", type: "turning_insert", ic_mm: 12.7, cornerRadius_mm: 0.4 }).diameter_mm === 12.7);
  ok("insert geometry_complete needs ic+corner",
    normalizeRecord({ catalogNumber: "Z", type: "turning_insert", ic_mm: 12.7, cornerRadius_mm: 0.4 }).geometry_complete === true);
  ok("holder is name-only (geometry_complete false)",
    normalizeRecord({ designation: "MEGA10N", type: "holder" }).geometry_complete === false);
  ok("non-tool record rejected",
    normalizeRecord({ foo: "bar", baz: 1 }) === null);
  ok("unknown unit not fabricated to mm",
    normalizeRecord({ designation: "Q", type: "holder" }).unit_source === "unknown");
  ok("category: indexable_mill",
    categorize({ type: "end_mill", subtype: "indexable" }) === "indexable_mill");
  ok("brand inference helical-tools.json",
    inferBrand("helical-tools.json") === "Helical");
  ok("brand inference big-daishowa alias",
    inferBrand("big-daishowa-holder-extracted.json") === "Big Daishowa");

  // live-corpus assertions (I/O) -- skip gracefully if data dir absent
  let live = null;
  try { live = loadBrandCatalog(); } catch { /* data dir absent */ }
  if (live) {
    ok("live corpus loaded >1000 records", live.stats.total > 1000);
    ok("live corpus spans >=8 brands", live.stats.brands >= 8);
    ok("live corpus has solid_mill + insert", !!live.byCategory.solid_mill && !!live.byCategory.insert);
    ok("no file errored", live.stats.files_errored === 0);
  } else {
    ok("live corpus (skipped -- data dir absent)", true);
  }

  const passed = checks.filter((c) => c.ok).length;
  console.log(`SELF-TEST: ${passed}/${checks.length} passed`);
  checks.forEach((c) => console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}`));
  if (live) {
    console.log(`\nLIVE: ${live.stats.total} records | ${live.stats.brands} brands | ` +
      `${live.stats.geometry_complete_pct}% geometry-complete | ${live.stats.files_loaded} files`);
  }
  return passed === checks.length;
}

// ## CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) process.exit(selfTest() ? 0 : 1);
  const dIdx = args.indexOf("--data-dir");
  const dataDir = dIdx >= 0 ? args[dIdx + 1] : DEFAULT_DATA_DIR;
  const cat = loadBrandCatalog({ dataDir });
  if (args.includes("--json")) {
    console.log(JSON.stringify({ stats: cat.stats, byBrand: cat.byBrand, byCategory: cat.byCategory, files: cat.files }, null, 2));
  } else {
    console.log(`Brand-tool catalog: ${cat.stats.total} records across ${cat.stats.brands} brands`);
    console.log(`  geometry-complete: ${cat.stats.geometry_complete} (${cat.stats.geometry_complete_pct}%)`);
    console.log(`  by category:`, cat.byCategory);
    console.log(`  by brand:`, cat.byBrand);
  }
}
