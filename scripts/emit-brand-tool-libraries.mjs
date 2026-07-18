#!/usr/bin/env node
/**
 * emit-brand-tool-libraries.mjs -- emit per-brand CAM tool libraries from the unified
 * brand-tool catalog, for Fusion 360 / hyperMILL / Mastercam.
 *
 * WHY (slot:romeo, 2026-06-19): work order = "finish generating tool libraries for ALL top
 * brands of holders + tooling + inserts for Fusion, hyperMILL and Mastercam". The verifiable
 * core (scripts/lib/brand-tool-catalog.mjs) normalizes the 60-file brand corpus to ONE canonical
 * mm record. This is the consumer: it groups those records by brand and renders importable
 * library files per CAM system.
 *
 * LANES:
 *   fusion    -> <out>/fusion/PRISM_<BRAND>.tools   (Fusion CAM .tools schema v2)
 *   hypermill -> <out>/hypermill/PRISM_<BRAND>.hmt.sql   (OPEN MIND v33 SQLite, mm)
 *   mastercam -> <out>/mastercam/PRISM_<BRAND>_tools.csv (Tool Manager CSV, mm)
 *
 * SCOPE (Fusion lane, honest -- R12): emits the cleanly-mappable ROTATING cutters
 * (solid_mill, indexable_mill, drill, reamer). thread (needs pitch the corpus lacks) and
 * turning/insert (Fusion models inserts inside indexable turning tools, a different schema)
 * are DEFERRED and reported, not silently dropped.
 *
 * UNITS-FIRST: the canonical catalog geometry is mm. The Fusion lane DEFAULTS TO INCHES for JM Die
 * (an inch shop -- operator directive 2026-06-21): every LENGTH geometry value is scaled 1/25.4 via
 * tool-unit-convert (angles/counts untouched) and the .tools `unit` is "inches". `--unit mm` keeps
 * millimetres. hyperMILL + Mastercam lanes stay mm. A record without a cutting diameter (DC) is
 * skipped + counted (a CAM tool with no DC is unusable).
 *
 * Usage:
 *   node scripts/emit-brand-tool-libraries.mjs [--format fusion] [--brand <name>]
 *        [--out <dir>] [--dry-run] [--self-test]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrandCatalog } from "./lib/brand-tool-catalog.mjs";
import { resolveHolder } from "./lib/holder-taper.mjs";
import { convertToolMmToInch } from "./lib/tool-unit-convert.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.resolve(HERE, "../state/shared/tool-libraries");

// Rotating-cutter categories the tool lanes render cleanly. "thread" = thread MILLS (rotating,
// diameter-defined like an end mill; the thread pitch is an operation parameter, not tool geometry).
// Records without a cutting diameter (e.g. taps lacking a diameter field) are skipped + counted.
export const FUSION_EMIT_CATEGORIES = new Set(["solid_mill", "indexable_mill", "drill", "reamer", "thread"]);
// hyperMILL + Mastercam additionally model standalone TURNING tools (boring bars etc.); Fusion's
// turning .tools schema is insert-based (different geometry block), so Fusion excludes turning.
export const MILL_TURN_CATEGORIES = new Set([...FUSION_EMIT_CATEGORIES, "turning"]);
const BALL_RE_TOLERANCE_MM = 0.01; // corner radius within this of dia/2 => ball end mill
const DEFAULT_HELIX_DEG = 30;       // Fusion HA default for square/bull mills (display only)

function round(v, dp = 4) {
  if (v == null || !Number.isFinite(v)) return null;
  return +v.toFixed(dp);
}

/** Physical corner radius: clamp to [0, dia/2] so an impossible source RE (> tool radius)
 *  can never emit an un-renderable geometry. Used by BOTH type + geometry so they agree. */
export function effectiveRE(rec) {
  const re = rec.corner_radius_mm;
  if (re == null || !(re > 0)) return 0;
  const dc = rec.diameter_mm;
  return dc != null && dc > 0 ? Math.min(re, dc / 2) : re;
}

/** Map a canonical record to a Fusion tool `type` string. */
export function fusionType(rec) {
  if (rec.category === "drill") return "drill";
  if (rec.category === "reamer") return "reamer";
  if (rec.category === "thread") return "thread mill";
  const dc = rec.diameter_mm;
  const re = effectiveRE(rec);
  if (re > 0 && dc != null) {
    if (Math.abs(re - dc / 2) <= BALL_RE_TOLERANCE_MM) return "ball end mill"; // RE == radius
    return "bull nose end mill";
  }
  return "flat end mill";
}

/** Build the Fusion geometry block (only fields with real source values; DC required). */
export function fusionGeometry(rec, type) {
  const g = {};
  g.DC = round(rec.diameter_mm);                 // cutting diameter (required upstream)
  const isMill = type.includes("mill");          // end mills + thread mills carry a shank + helix
  if (isMill) {
    g.SFDM = round(rec.shank_mm ?? rec.diameter_mm); // shaft/shank diameter
    g.HA = DEFAULT_HELIX_DEG;
  }
  if (rec.flute_len_mm != null) g.LCF = round(rec.flute_len_mm); // length of cut
  if (rec.oal_mm != null) g.OAL = round(rec.oal_mm);
  if (rec.num_flutes != null) g.NOF = rec.num_flutes;
  g.RE = round(effectiveRE(rec));                // corner radius, clamped to [0, dia/2]
  return g;
}

/** Map one canonical record -> Fusion tool object (or null if not DC-renderable). */
export function toFusionTool(rec, number) {
  if (rec.diameter_mm == null) return null; // no DC -> unusable CAM tool
  const type = fusionType(rec);
  return {
    BMC: rec.material === "hss" ? "hss" : "carbide",
    HAND: "R",
    type,
    unit: "millimeters",
    geometry: fusionGeometry(rec, type),
    "post-process": { number, "diameter-offset": number, "length-offset": number, live: true, comment: "" },
    description: rec.description ? String(rec.description).slice(0, 200) : `${rec.brand} ${rec.id}`,
    vendor: rec.brand,
    "product-id": rec.id,
    "unit-source": rec.unit_source, // provenance: was the source inch/mm/unknown
  };
}

/** Build a Fusion .tools library object for a list of records (pure).
 *  @param {{unit?: "millimeters"|"inches"}} opts -- unit:"inches" converts every emitted tool's LENGTH
 *    geometry to inches (tool-unit-convert; angles/counts untouched). Default "millimeters" keeps the
 *    raw mm geometry. The emitter (emitLibraries/CLI) defaults the Fusion lane to inches for JM. */
export function buildFusionLibrary(records, { unit = "millimeters" } = {}) {
  const data = [];
  let skippedNoDc = 0;
  let skippedCategory = 0;
  let skippedImplausible = 0;
  for (const rec of records) {
    if (!FUSION_EMIT_CATEGORIES.has(rec.category)) { skippedCategory += 1; continue; }
    if (rec.geometry_plausible === false) { skippedImplausible += 1; continue; } // bad source geometry (R12)
    const tool = toFusionTool(rec, data.length + 1);
    if (!tool) { skippedNoDc += 1; continue; }
    data.push(unit === "inches" ? convertToolMmToInch(tool) : tool); // brand tools have no feed presets
  }
  return { library: { version: 2, data }, emitted: data.length, skippedNoDc, skippedCategory, skippedImplausible };
}

// ## File-system-safe brand slug for filenames
export function brandSlug(brand) {
  return String(brand).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase() || "UNKNOWN";
}

// ===========================================================================================
// hyperMILL lane -- emit an importable .hmt.sql (SQLite) Tool Database.
// Schema mirrors mcp-server/src/data/hypermill-tool-schema-notes.ts (OPEN MIND v33 sqlite.sql):
//   Tools.tool_type_id -> GeometryClasses; dbl_param1=dia, 2=cutting_len, 3=shank, 4=corner_R;
//   int_param1=flutes; total_length=OAL; mm_system_id 1=metric (all geometry is mm here).
// Same rotating-cutter scope + plausibility/no-DC skip accounting as the Fusion lane.
// ===========================================================================================
const HM_GEOMETRY_CLASSES = [[1, "Ballmill"], [2, "Endmill"], [3, "Radiusmill"], [4, "Drilltool"], [15, "ThreadMill"], [16, "Reamer"], [1000, "GeneralTurningTool"]];
const HM_CUTTING_MATERIALS = [[1, "Carbide"], [2, "HSS"]];

/** Map a canonical record -> hyperMILL GeometryClass tool_type_id. */
export function hypermillToolTypeId(rec) {
  if (rec.category === "drill") return 4;     // Drilltool
  if (rec.category === "reamer") return 16;   // Reamer
  if (rec.category === "thread") return 15;   // ThreadMill
  if (rec.category === "turning") return 1000; // GeneralTurningTool
  const dc = rec.diameter_mm;
  const re = effectiveRE(rec);               // mills (solid + indexable)
  if (re > 0 && dc != null) {
    if (Math.abs(re - dc / 2) <= BALL_RE_TOLERANCE_MM) return 1; // Ballmill
    return 3; // Radiusmill (bull nose)
  }
  return 2; // Endmill (square)
}

function hmNum(v) { return Number.isFinite(v) ? v : 0; }
function sqlStr(s) { return `'${String(s ?? "").replace(/'/g, "''")}'`; }

/** Build hyperMILL Tool-DB rows for a record list (pure). */
export function buildHypermillLibrary(records) {
  const rows = [];
  const mfrs = new Map(); // brand -> id (1-based)
  const seenNames = new Set();
  let emitted = 0, skippedNoDc = 0, skippedCategory = 0, skippedImplausible = 0;
  const mfrId = (brand) => { if (!mfrs.has(brand)) mfrs.set(brand, mfrs.size + 1); return mfrs.get(brand); };
  for (const rec of records) {
    if (!MILL_TURN_CATEGORIES.has(rec.category)) { skippedCategory += 1; continue; }
    if (rec.geometry_plausible === false) { skippedImplausible += 1; continue; }
    if (rec.diameter_mm == null) { skippedNoDc += 1; continue; }
    const id = ++emitted;
    const typeId = hypermillToolTypeId(rec);
    // hyperMILL Tools.name is UNIQUE(128). De-dup within the brand -- LOOP until truly unique:
    // a vendor id can itself look like an earlier suffixed name (e.g. literal id "A#3" colliding
    // with the 3rd "A"), so a single suffix is not enough. k increments -> guaranteed termination.
    let name = String(rec.id).slice(0, 120);
    for (let k = 1; seenNames.has(name); k += 1) name = `${String(rec.id).slice(0, 110)}#${id}.${k}`;
    seenNames.add(name);
    rows.push({
      id, tool_type_id: typeId, name, ordering_code: String(rec.id).slice(0, 128),
      manufacturer_id: mfrId(rec.brand), cutting_material_id: rec.material === "hss" ? 2 : 1,
      total_length: hmNum(rec.oal_mm), dbl_param1: hmNum(rec.diameter_mm),
      // dbl_param2 is cutting length for mills/reamers but point_angle for a Drilltool (type 4);
      // we carry no point angle, so a drill's dbl_param2 stays 0 rather than mis-slotting flute len.
      dbl_param2: typeId === 4 ? 0 : hmNum(rec.flute_len_mm),
      dbl_param3: hmNum(rec.shank_mm), dbl_param4: hmNum(effectiveRE(rec)), int_param1: hmNum(rec.num_flutes),
    });
  }
  return { library: { rows, manufacturers: [...mfrs.entries()] }, emitted, skippedNoDc, skippedCategory, skippedImplausible };
}

/** Render a hyperMILL Tool-DB library object -> .hmt.sql script string. */
export function serializeHypermill(library) {
  const out = [
    "-- hyperMILL Tool Database (PRISM brand export). Import: sqlite3 db.hmt < db.hmt.sql",
    "-- Schema per hypermill-tool-schema-notes.ts (OPEN MIND v33). All geometry mm (mm_system_id=1).",
    "PRAGMA journal_mode=WAL;",
    "CREATE TABLE IF NOT EXISTS Manufacturers (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);",
    "CREATE TABLE IF NOT EXISTS GeometryClasses (id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
    "CREATE TABLE IF NOT EXISTS CuttingMaterials (id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
    "CREATE TABLE IF NOT EXISTS Tools (",
    "  id INTEGER PRIMARY KEY, tool_type_id INTEGER NOT NULL REFERENCES GeometryClasses(id),",
    "  name TEXT NOT NULL, ordering_code TEXT NOT NULL DEFAULT '',",
    "  manufacturer_id INTEGER NOT NULL REFERENCES Manufacturers(id),",
    "  cutting_material_id INTEGER NOT NULL DEFAULT 1 REFERENCES CuttingMaterials(id),",
    "  mm_system_id INTEGER NOT NULL DEFAULT 1, total_length REAL NOT NULL DEFAULT 0.0,",
    "  dbl_param1 REAL NOT NULL DEFAULT 0.0, dbl_param2 REAL NOT NULL DEFAULT 0.0,",
    "  dbl_param3 REAL NOT NULL DEFAULT 0.0, dbl_param4 REAL NOT NULL DEFAULT 0.0,",
    "  int_param1 INTEGER NOT NULL DEFAULT 0);",
  ];
  for (const [id, name] of HM_GEOMETRY_CLASSES) out.push(`INSERT OR IGNORE INTO GeometryClasses (id, name) VALUES (${id}, ${sqlStr(name)});`);
  for (const [id, name] of HM_CUTTING_MATERIALS) out.push(`INSERT OR IGNORE INTO CuttingMaterials (id, name) VALUES (${id}, ${sqlStr(name)});`);
  for (const [name, id] of library.manufacturers) out.push(`INSERT OR IGNORE INTO Manufacturers (id, name) VALUES (${id}, ${sqlStr(name)});`);
  for (const r of library.rows) {
    out.push(
      `INSERT INTO Tools (id, tool_type_id, name, ordering_code, manufacturer_id, cutting_material_id, mm_system_id, total_length, dbl_param1, dbl_param2, dbl_param3, dbl_param4, int_param1) VALUES (` +
      `${r.id}, ${r.tool_type_id}, ${sqlStr(r.name)}, ${sqlStr(r.ordering_code)}, ${r.manufacturer_id}, ${r.cutting_material_id}, 1, ` +
      `${r.total_length.toFixed(4)}, ${r.dbl_param1.toFixed(4)}, ${r.dbl_param2.toFixed(4)}, ${r.dbl_param3.toFixed(4)}, ${r.dbl_param4.toFixed(4)}, ${Math.round(r.int_param1)});`,
    );
  }
  return out.join("\n") + "\n";
}

// ===========================================================================================
// Mastercam lane -- emit a Tool Manager-importable CSV (the genuinely round-trippable surface;
// the binary .tooldb is SQLite written by Mastercam itself). One row per tool, mm geometry.
// ===========================================================================================
export const MASTERCAM_TOOL_COLUMNS = [
  "ToolNumber", "ToolName", "ToolType", "Manufacturer", "ProductID", "Units",
  "Diameter_mm", "CornerRadius_mm", "FluteLength_mm", "OverallLength_mm", "NumberOfFlutes", "ShankDiameter_mm",
];

/** Map a canonical record -> Mastercam tool-type string. */
export function mastercamToolType(rec) {
  if (rec.category === "drill") return "Drill";
  if (rec.category === "reamer") return "Reamer";
  if (rec.category === "thread") return "Thread Mill";
  if (rec.category === "turning") return "Turning";
  const dc = rec.diameter_mm;
  const re = effectiveRE(rec);
  if (re > 0 && dc != null) {
    if (Math.abs(re - dc / 2) <= BALL_RE_TOLERANCE_MM) return "Ball Mill";
    return "Bull Mill";
  }
  return "End Mill";
}

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function mcNum(v) { return v == null || !Number.isFinite(v) ? "" : +v.toFixed(4); }

/** Build Mastercam tool rows for a record list (pure). */
export function buildMastercamLibrary(records) {
  const rows = [];
  let emitted = 0, skippedNoDc = 0, skippedCategory = 0, skippedImplausible = 0;
  for (const rec of records) {
    if (!MILL_TURN_CATEGORIES.has(rec.category)) { skippedCategory += 1; continue; }
    if (rec.geometry_plausible === false) { skippedImplausible += 1; continue; }
    if (rec.diameter_mm == null) { skippedNoDc += 1; continue; }
    rows.push({
      tool_number: ++emitted, name: String(rec.id).slice(0, 128), type: mastercamToolType(rec),
      manufacturer: rec.brand, product_id: rec.id, units: "mm",
      diameter: mcNum(rec.diameter_mm), corner_radius: mcNum(effectiveRE(rec)),
      flute_length: mcNum(rec.flute_len_mm), overall_length: mcNum(rec.oal_mm),
      num_flutes: rec.num_flutes == null ? "" : Math.round(rec.num_flutes), shank: mcNum(rec.shank_mm),
    });
  }
  return { library: { rows }, emitted, skippedNoDc, skippedCategory, skippedImplausible };
}

/** Render a Mastercam tool library object -> CSV string (Tool Manager import). */
export function serializeMastercam(library) {
  const lines = [MASTERCAM_TOOL_COLUMNS.join(",")];
  for (const r of library.rows) {
    lines.push([
      r.tool_number, r.name, r.type, r.manufacturer, r.product_id, r.units,
      r.diameter, r.corner_radius, r.flute_length, r.overall_length, r.num_flutes, r.shank,
    ].map(csvCell).join(","));
  }
  return lines.join("\n") + "\n";
}

// ===========================================================================================
// INSERT lanes -- turning inserts are NOT cutting tools (no DC/flutes); they carry inscribed
// circle (IC), corner radius, ISO code, and shape. Mastercam + hyperMILL both keep a dedicated
// insert library. Source category = "insert" (normalizer maps ic_mm -> diameter_mm).
// ===========================================================================================
export const INSERT_EMIT_CATEGORIES = new Set(["insert"]);
export const MASTERCAM_INSERT_COLUMNS = [
  "InsertNumber", "Designation", "ISO", "Shape", "InscribedCircle_mm", "CornerRadius_mm", "Manufacturer",
];

// ISO 1832 turning-insert IC size-code -> inscribed circle (mm). The IC is encoded in the
// designation (e.g. SNMG[12]04 -> IC code "12"), not a numeric field, for most of the corpus.
// Inch-IC convention (the dominant turning-insert sizing). Only well-established codes are
// mapped; an unknown code yields null (R12: never fabricate an IC -- a wrong IC mis-sizes the
// insert + breaks holder pairing).
const ISO_IC_CODE_MM = { "06": 6.35, "09": 9.525, "11": 9.525, "12": 12.7, "15": 15.875, "16": 15.875, "19": 19.05, "22": 22.0, "25": 25.4 };
export function parseIsoInsertIC(designation) {
  const m = String(designation || "").toUpperCase().match(/^[A-Z]{4}(\d{2})/);
  return m ? (ISO_IC_CODE_MM[m[1]] ?? null) : null;
}

const MAX_INSERT_CORNER_R_MM = 6.4; // real turning-insert corner radii top out ~1/4in; above = mis-parse

/** Shared insert selector (CAM-agnostic). Requires a GENUINE ISO turning insert -- a parseable IC
 *  (explicit ic_mm field OR an ISO-1832 designation). Rejects mis-categorized product codes
 *  (e.g. "ISCAR-IC331.0") that have no IC and a garbage corner radius; corner radius is gated to a
 *  physical max (a >6.4mm "corner radius" is a source mis-parse, like the 8407mm one observed).
 *  @returns {{rows:Array<{designation,iso,shape,ic,corner_radius,brand}>, skippedNoGeom, skippedCategory, skippedImplausible}} */
export function selectInsertRows(records) {
  const rows = [];
  let skippedNoGeom = 0, skippedCategory = 0, skippedImplausible = 0;
  for (const rec of records) {
    if (!INSERT_EMIT_CATEGORIES.has(rec.category)) { skippedCategory += 1; continue; }
    if (rec.geometry_plausible === false) { skippedImplausible += 1; continue; }
    const ic = rec.diameter_mm ?? parseIsoInsertIC(rec.id);
    if (ic == null) { skippedNoGeom += 1; continue; } // not a recognizable ISO insert -> drop junk
    const crRaw = rec.corner_radius_mm;
    const cr = crRaw != null && crRaw > 0 && crRaw <= MAX_INSERT_CORNER_R_MM ? crRaw : null; // gate garbage
    rows.push({ designation: String(rec.id).slice(0, 128), iso: rec.iso_number || "", shape: rec.shape || "", ic, corner_radius: cr, brand: rec.brand });
  }
  return { rows, skippedNoGeom, skippedCategory, skippedImplausible };
}

/** Build Mastercam insert rows (pure) from the shared selector. */
export function buildMastercamInserts(records) {
  const sel = selectInsertRows(records);
  const rows = sel.rows.map((r, i) => ({
    insert_number: i + 1, designation: r.designation, iso: r.iso, shape: r.shape,
    ic: mcNum(r.ic), corner_radius: mcNum(r.corner_radius), manufacturer: r.brand,
  }));
  // skippedNoDc keeps the return-shape parity the reconciliation invariant relies on.
  return { library: { rows }, emitted: rows.length, skippedNoDc: sel.skippedNoGeom, skippedCategory: sel.skippedCategory, skippedImplausible: sel.skippedImplausible };
}

/** Build hyperMILL Inserts-table rows (pure) from the shared selector. */
export function buildHypermillInserts(records) {
  const sel = selectInsertRows(records);
  const mfrs = new Map();
  const seenNames = new Set();
  const mfrId = (brand) => { if (!mfrs.has(brand)) mfrs.set(brand, mfrs.size + 1); return mfrs.get(brand); };
  const rows = sel.rows.map((r, i) => {
    let name = r.designation.slice(0, 120);
    for (let k = 1; seenNames.has(name); k += 1) name = `${r.designation.slice(0, 110)}#${i + 1}.${k}`;
    seenNames.add(name);
    return { id: i + 1, name, iso_code: r.iso, shape: r.shape, ic: hmNum(r.ic), corner_radius: hmNum(r.corner_radius), manufacturer_id: mfrId(r.brand) };
  });
  return { library: { rows, manufacturers: [...mfrs.entries()] }, emitted: rows.length, skippedNoDc: sel.skippedNoGeom, skippedCategory: sel.skippedCategory, skippedImplausible: sel.skippedImplausible };
}

/** Render a hyperMILL Inserts library object -> .hmt.sql script string. */
export function serializeHypermillInserts(library) {
  const out = [
    "-- hyperMILL Insert Database (PRISM export). Import: sqlite3 db.hmt < db.hmt.sql",
    "PRAGMA journal_mode=WAL;",
    "CREATE TABLE IF NOT EXISTS Manufacturers (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);",
    "CREATE TABLE IF NOT EXISTS Inserts (",
    "  id INTEGER PRIMARY KEY, name TEXT NOT NULL, iso_code TEXT NOT NULL DEFAULT '',",
    "  shape TEXT NOT NULL DEFAULT '', inscribed_circle REAL NOT NULL DEFAULT 0.0,",
    "  corner_radius REAL NOT NULL DEFAULT 0.0,",
    "  manufacturer_id INTEGER NOT NULL REFERENCES Manufacturers(id), mm_system_id INTEGER NOT NULL DEFAULT 1);",
  ];
  for (const [name, id] of library.manufacturers) out.push(`INSERT OR IGNORE INTO Manufacturers (id, name) VALUES (${id}, ${sqlStr(name)});`);
  for (const r of library.rows) {
    out.push(
      `INSERT INTO Inserts (id, name, iso_code, shape, inscribed_circle, corner_radius, manufacturer_id, mm_system_id) VALUES (` +
      `${r.id}, ${sqlStr(r.name)}, ${sqlStr(r.iso_code)}, ${sqlStr(r.shape)}, ${r.ic.toFixed(4)}, ${r.corner_radius.toFixed(4)}, ${r.manufacturer_id}, 1);`,
    );
  }
  return out.join("\n") + "\n";
}

export function serializeMastercamInserts(library) {
  const lines = [MASTERCAM_INSERT_COLUMNS.join(",")];
  for (const r of library.rows) {
    lines.push([r.insert_number, r.designation, r.iso, r.shape, r.ic, r.corner_radius, r.manufacturer].map(csvCell).join(","));
  }
  return lines.join("\n") + "\n";
}

// ===========================================================================================
// HOLDER lanes -- the brand holder corpus is name-only; holder-taper.mjs resolves the spindle
// taper from the designation (BBT50 -> BT50, ER-32 -> ER32, KM40, HSK-A63) + attaches book-value
// body geometry. A designation with no recognizable taper (e.g. a MEGA collet-chuck HEAD) is
// dropped. Mastercam + hyperMILL both keep a standalone Holders library.
// ===========================================================================================
export const HOLDER_EMIT_CATEGORIES = new Set(["holder"]);
export const MASTERCAM_HOLDER_COLUMNS = [
  "HolderNumber", "Designation", "Taper", "BodyDiameter_mm", "GaugeLength_mm", "Projection_mm", "MaxRPM", "Manufacturer",
];

/** Shared holder selector: keep only holders whose designation resolves to a taper + geometry. */
export function selectHolderRows(records) {
  const rows = [];
  let skippedNoTaper = 0, skippedCategory = 0;
  for (const rec of records) {
    if (!HOLDER_EMIT_CATEGORIES.has(rec.category)) { skippedCategory += 1; continue; }
    const resolved = resolveHolder(rec.id);
    if (!resolved) { skippedNoTaper += 1; continue; } // no spindle taper (chuck head / unknown)
    rows.push({ designation: String(rec.id).slice(0, 128), taper: resolved.taper, ...resolved.geometry, brand: rec.brand });
  }
  return { rows, skippedNoTaper, skippedCategory };
}

export function buildMastercamHolders(records) {
  const sel = selectHolderRows(records);
  const rows = sel.rows.map((r, i) => ({
    holder_number: i + 1, designation: r.designation, taper: r.taper,
    body_diameter: mcNum(r.body_diameter_mm), gauge_length: mcNum(r.gauge_length_mm),
    projection: mcNum(r.projection_mm), max_rpm: r.max_rpm, manufacturer: r.brand,
  }));
  return { library: { rows }, emitted: rows.length, skippedNoDc: sel.skippedNoTaper, skippedCategory: sel.skippedCategory, skippedImplausible: 0 };
}

export function serializeMastercamHolders(library) {
  const lines = [MASTERCAM_HOLDER_COLUMNS.join(",")];
  for (const r of library.rows) {
    lines.push([r.holder_number, r.designation, r.taper, r.body_diameter, r.gauge_length, r.projection, r.max_rpm, r.manufacturer].map(csvCell).join(","));
  }
  return lines.join("\n") + "\n";
}

export function buildHypermillHolders(records) {
  const sel = selectHolderRows(records);
  const mfrs = new Map();
  const seenNames = new Set();
  const mfrId = (brand) => { if (!mfrs.has(brand)) mfrs.set(brand, mfrs.size + 1); return mfrs.get(brand); };
  const rows = sel.rows.map((r, i) => {
    let name = r.designation.slice(0, 120);
    for (let k = 1; seenNames.has(name); k += 1) name = `${r.designation.slice(0, 110)}#${i + 1}.${k}`;
    seenNames.add(name);
    return {
      id: i + 1, name, taper: r.taper, body_diameter: hmNum(r.body_diameter_mm), gauge_length: hmNum(r.gauge_length_mm),
      projection: hmNum(r.projection_mm), max_spindle_speed: hmNum(r.max_rpm), manufacturer_id: mfrId(r.brand),
    };
  });
  return { library: { rows, manufacturers: [...mfrs.entries()] }, emitted: rows.length, skippedNoDc: sel.skippedNoTaper, skippedCategory: sel.skippedCategory, skippedImplausible: 0 };
}

export function serializeHypermillHolders(library) {
  const out = [
    "-- hyperMILL Holder Database (PRISM export). Import: sqlite3 db.hmt < db.hmt.sql",
    "PRAGMA journal_mode=WAL;",
    "CREATE TABLE IF NOT EXISTS Manufacturers (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);",
    "CREATE TABLE IF NOT EXISTS Holders (",
    "  id INTEGER PRIMARY KEY, name TEXT NOT NULL, taper TEXT NOT NULL DEFAULT '',",
    "  body_diameter REAL NOT NULL DEFAULT 0.0, gauge_length REAL NOT NULL DEFAULT 0.0,",
    "  projection REAL NOT NULL DEFAULT 0.0, max_spindle_speed REAL NOT NULL DEFAULT 0.0,",
    "  manufacturer_id INTEGER NOT NULL REFERENCES Manufacturers(id), mm_system_id INTEGER NOT NULL DEFAULT 1);",
  ];
  for (const [name, id] of library.manufacturers) out.push(`INSERT OR IGNORE INTO Manufacturers (id, name) VALUES (${id}, ${sqlStr(name)});`);
  for (const r of library.rows) {
    out.push(
      `INSERT INTO Holders (id, name, taper, body_diameter, gauge_length, projection, max_spindle_speed, manufacturer_id, mm_system_id) VALUES (` +
      `${r.id}, ${sqlStr(r.name)}, ${sqlStr(r.taper)}, ${r.body_diameter.toFixed(4)}, ${r.gauge_length.toFixed(4)}, ${r.projection.toFixed(4)}, ${r.max_spindle_speed.toFixed(1)}, ${r.manufacturer_id}, 1);`,
    );
  }
  return out.join("\n") + "\n";
}

// ## CAM format builder registry -- add a lane = add a table entry (no surgery on emitLibraries).
// Each builder: build(records) -> {library, emitted, skippedNoDc, skippedCategory, skippedImplausible};
// serialize(library) -> string; fileName(slug) -> output filename; emitCategories for the manifest.
export const BUILDERS = {
  fusion: {
    label: "Fusion 360",
    build: buildFusionLibrary,
    serialize: (library) => JSON.stringify(library, null, 2),
    fileName: (slug) => `PRISM_${slug}.tools`,
    emitCategories: FUSION_EMIT_CATEGORIES,
  },
  hypermill: {
    label: "hyperMILL (OPEN MIND v33)",
    build: buildHypermillLibrary,
    serialize: serializeHypermill,
    fileName: (slug) => `PRISM_${slug}.hmt.sql`,
    emitCategories: MILL_TURN_CATEGORIES,
  },
  mastercam: {
    label: "Mastercam (Tool Manager CSV)",
    build: buildMastercamLibrary,
    serialize: serializeMastercam,
    fileName: (slug) => `PRISM_${slug}_tools.csv`,
    emitCategories: MILL_TURN_CATEGORIES,
  },
  "mastercam-inserts": {
    label: "Mastercam Inserts (CSV)",
    build: buildMastercamInserts,
    serialize: serializeMastercamInserts,
    fileName: (slug) => `PRISM_${slug}_inserts.csv`,
    emitCategories: INSERT_EMIT_CATEGORIES,
  },
  "hypermill-inserts": {
    label: "hyperMILL Inserts (.hmt.sql)",
    build: buildHypermillInserts,
    serialize: serializeHypermillInserts,
    fileName: (slug) => `PRISM_${slug}_inserts.hmt.sql`,
    emitCategories: INSERT_EMIT_CATEGORIES,
  },
  "mastercam-holders": {
    label: "Mastercam Holders (CSV)",
    build: buildMastercamHolders,
    serialize: serializeMastercamHolders,
    fileName: (slug) => `PRISM_${slug}_holders.csv`,
    emitCategories: HOLDER_EMIT_CATEGORIES,
  },
  "hypermill-holders": {
    label: "hyperMILL Holders (.hmt.sql)",
    build: buildHypermillHolders,
    serialize: serializeHypermillHolders,
    fileName: (slug) => `PRISM_${slug}_holders.hmt.sql`,
    emitCategories: HOLDER_EMIT_CATEGORIES,
  },
};

/**
 * Emit per-brand libraries for a format. Returns a manifest (no side effects when dryRun).
 * EVERY source record is accounted for (R12 no-silent-drop): the reconciliation invariant
 *   totalTools + skippedNoDc + skippedNonRotating + skippedImplausible == totalSourceRecords
 * holds across the FULL catalog -- including brands that emit zero tools (their skip tallies
 * are still summed before the empty-file short-circuit).
 * @param {{catalog:object, format:string, outDir:string, brandFilter?:string, dryRun?:boolean}} opts
 */
export function emitLibraries({ catalog, format = "fusion", outDir = DEFAULT_OUT, brandFilter, dryRun = false, unit }) {
  const builder = BUILDERS[format];
  if (!builder) {
    throw new Error(`emit-brand-tool-libraries: format "${format}" not yet implemented (have: ${Object.keys(BUILDERS).join(", ")})`);
  }
  // The Fusion lane defaults to INCHES for JM Die (an inch shop -- operator directive 2026-06-21); the
  // hyperMILL (.hmt.sql mm_system_id=1) + Mastercam (mm CSV) lanes keep their native mm schema. Only the
  // Fusion builder honors the unit option, so a non-fusion lib is always reported as millimetres (honest).
  const resolvedUnit = unit ?? (format === "fusion" ? "inches" : "millimeters");
  // honest manifest unit: only the Fusion lane converts, and only when the resolved unit is "inches"
  // (any other value -- "mm", "millimeters" -- leaves the native mm geometry untouched).
  const libUnit = format === "fusion" && resolvedUnit === "inches" ? "inches" : "millimeters";
  // group records by canonical brand
  const byBrand = new Map();
  for (const rec of catalog.records) {
    if (brandFilter && rec.brand.toLowerCase() !== brandFilter.toLowerCase()) continue;
    if (!byBrand.has(rec.brand)) byBrand.set(rec.brand, []);
    byBrand.get(rec.brand).push(rec);
  }

  const formatDir = path.join(outDir, format);
  if (!dryRun) {
    fs.mkdirSync(formatDir, { recursive: true });
    // Remove stale per-brand files from a prior emit: a brand whose tools all became
    // implausible/dropped must NOT linger as a stale library (observed: junk ISCAR inserts
    // surviving after the insert-quality filter tightened). MANIFEST.json + .gitignore are kept.
    try {
      for (const f of fs.readdirSync(formatDir)) {
        if (f.startsWith("PRISM_")) fs.rmSync(path.join(formatDir, f), { force: true });
      }
    } catch { /* dir freshly created */ }
  }

  const brands = [];
  let totalSource = 0, totalEmitted = 0, totalSkippedNoDc = 0, totalSkippedCategory = 0, totalSkippedImplausible = 0;
  for (const [brand, recs] of [...byBrand.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const built = format === "fusion" ? builder.build(recs, { unit: resolvedUnit }) : builder.build(recs);
    // accumulate FULL accounting for EVERY brand BEFORE the empty-file short-circuit, so a
    // brand with zero eligible cutters still contributes its skip tallies (no silent drop).
    totalSource += recs.length;
    totalEmitted += built.emitted;
    totalSkippedNoDc += built.skippedNoDc;
    totalSkippedCategory += built.skippedCategory;
    totalSkippedImplausible += built.skippedImplausible;
    if (built.emitted === 0) continue; // no library file for a brand with no eligible cutters
    const file = path.join(formatDir, builder.fileName(brandSlug(brand)));
    if (!dryRun) fs.writeFileSync(file, builder.serialize(built.library));
    brands.push({ brand, file: path.basename(file), tools: built.emitted, skippedNoDc: built.skippedNoDc, skippedCategory: built.skippedCategory, skippedImplausible: built.skippedImplausible, sourceRecords: recs.length });
  }

  const reconciles = totalEmitted + totalSkippedNoDc + totalSkippedCategory + totalSkippedImplausible === totalSource;
  const manifest = {
    schemaVersion: "1.2.0",
    format,
    unit: libUnit,
    label: builder.label,
    generatedBy: "scripts/emit-brand-tool-libraries.mjs",
    emitCategories: [...builder.emitCategories],
    brands: brands.length,
    totalSourceRecords: totalSource,
    totalTools: totalEmitted,
    skippedNoDc: totalSkippedNoDc,
    skippedNonRotating: totalSkippedCategory,
    skippedImplausible: totalSkippedImplausible,
    reconciles,
    perBrand: brands,
  };
  if (!dryRun) fs.writeFileSync(path.join(formatDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

// ## Self-test (pure render assertions)
function selfTest() {
  const checks = [];
  const ok = (n, c) => checks.push({ name: n, ok: !!c });

  const mill = { id: "X", brand: "Helical", category: "solid_mill", diameter_mm: 12.7, shank_mm: 12.7, flute_len_mm: 15.875, oal_mm: 101.6, corner_radius_mm: 0, num_flutes: 3, unit_source: "inches", description: "1/2 EM" };
  const ball = { ...mill, id: "B", corner_radius_mm: 6.35 };
  const bull = { ...mill, id: "U", corner_radius_mm: 1.0 };
  const drill = { id: "D", brand: "Guhring", category: "drill", diameter_mm: 6.35, oal_mm: 66, num_flutes: 2, unit_source: "inches" };
  const noDc = { id: "N", brand: "X", category: "solid_mill", diameter_mm: null, unit_source: "unknown" };
  const insert = { id: "I", brand: "ISCAR", category: "insert", diameter_mm: 12.7, corner_radius_mm: 0.4, unit_source: "mm" };

  ok("flat end mill type", fusionType(mill) === "flat end mill");
  ok("ball end mill when RE==dia/2", fusionType(ball) === "ball end mill");
  ok("bull nose when 0<RE<dia/2", fusionType(bull) === "bull nose end mill");
  ok("drill type", fusionType(drill) === "drill");
  ok("mill geometry DC=12.7 SFDM=12.7 RE=0", (() => { const g = fusionGeometry(mill, "flat end mill"); return g.DC === 12.7 && g.SFDM === 12.7 && g.RE === 0 && g.LCF === 15.875; })());
  ok("drill geometry has no SFDM/HA", (() => { const g = fusionGeometry(drill, "drill"); return g.DC === 6.35 && g.SFDM === undefined && g.HA === undefined; })());
  ok("tool unit millimeters", toFusionTool(mill, 1).unit === "millimeters");
  ok("tool carries vendor + product-id + provenance", (() => { const t = toFusionTool(mill, 1); return t.vendor === "Helical" && t["product-id"] === "X" && t["unit-source"] === "inches"; })());
  ok("no-DC record -> null tool", toFusionTool(noDc, 1) === null);

  const implausible = { id: "P", brand: "YG-1", category: "drill", diameter_mm: 380, unit_source: "mm", geometry_plausible: false };
  const lib = buildFusionLibrary([mill, ball, drill, insert, noDc, implausible]);
  ok("library emits 3 rotating (insert+noDc+implausible excluded)", lib.emitted === 3);
  ok("insert counted as skippedCategory", lib.skippedCategory === 1);
  ok("noDc counted as skippedNoDc", lib.skippedNoDc === 1);
  ok("implausible 380mm drill counted + excluded", lib.skippedImplausible === 1);
  ok("library schema version 2", lib.library.version === 2);
  ok("sequential tool numbers", lib.library.data[0]["post-process"].number === 1 && lib.library.data[2]["post-process"].number === 3);
  ok("brandSlug fs-safe", brandSlug("Big Daishowa") === "BIG_DAISHOWA" && brandSlug("YG-1") === "YG_1");
  ok("default (no opts) keeps mm geometry", buildFusionLibrary([mill]).library.data[0].unit === "millimeters" && buildFusionLibrary([mill]).library.data[0].geometry.DC === 12.7);
  ok("inch mode: DC 12.7mm->0.5in, HA angle untouched", (() => {
    const t = buildFusionLibrary([mill], { unit: "inches" }).library.data[0];
    return t.unit === "inches" && t.geometry.DC === 0.5 && t.geometry.HA === 30 && t.geometry.LCF === 0.625;
  })());

  // live emit (dry-run, no writes)
  let live = null;
  try { live = emitLibraries({ catalog: loadBrandCatalog(), format: "fusion", dryRun: true }); } catch { /* data absent */ }
  if (live) {
    // post-2026-06-20 plausibility cleanup (endmill-oversize 2038->0) the brand Fusion lane emits
    // ~41.3k rotating cutters; the >50000 floor predated that drop and is corrected here (R12).
    ok("live emit >40000 tools", live.totalTools > 40000);
    ok("live emit >=10 brands", live.brands >= 10);
  } else {
    ok("live emit (skipped -- data absent)", true);
  }

  const passed = checks.filter((c) => c.ok).length;
  console.log(`SELF-TEST: ${passed}/${checks.length} passed`);
  checks.forEach((c) => console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}`));
  if (live) console.log(`\nLIVE (dry-run): ${live.totalTools} tools across ${live.brands} brands | skippedNoDc=${live.skippedNoDc} skippedNonRotating=${live.skippedNonRotating}`);
  return passed === checks.length;
}

// ## CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) process.exit(selfTest() ? 0 : 1);
  const get = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : def; };
  const format = get("--format", "fusion");
  const outDir = get("--out", DEFAULT_OUT);
  const brandFilter = get("--brand", undefined);
  const unit = get("--unit", undefined); // fusion defaults to "inches" (JM inch shop); "mm" forces millimetres
  const dryRun = args.includes("--dry-run");

  const catalog = loadBrandCatalog();
  const manifest = emitLibraries({ catalog, format, outDir, brandFilter, dryRun, unit });
  console.log(`${dryRun ? "[dry-run] " : ""}Emitted ${format} libraries (unit: ${manifest.unit}): ${manifest.totalTools} tools across ${manifest.brands} brands`);
  console.log(`  out: ${path.join(outDir, format)}`);
  console.log(`  skippedNoDc=${manifest.skippedNoDc} skippedNonRotating=${manifest.skippedNonRotating} skippedImplausible=${manifest.skippedImplausible}`);
  for (const b of manifest.perBrand.slice(0, 12)) console.log(`    ${String(b.tools).padStart(6)}  PRISM_${brandSlug(b.brand)}.tools  (${b.brand})`);
  if (manifest.perBrand.length > 12) console.log(`    ... +${manifest.perBrand.length - 12} more brands`);
}
