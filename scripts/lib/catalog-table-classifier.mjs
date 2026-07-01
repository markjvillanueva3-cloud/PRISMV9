// catalog-table-classifier.mjs — classify camelot-extracted tables by TYPE.
import { pathToFileURL } from "node:url";
//
// The verifiable CORE of the catalog→cutting_data pipeline (juliett, 2026-05-31).
// `scripts/camelot-extract.py` cleanly pulls a vendor catalog's tables as
//   { tables: [ { page, table_index_on_page, row_count, col_count, rows: [[cell,...],...] } ] }
// but those raw tables are heterogeneous: some are speeds-feeds GRIDS (the cutting
// parameters we want — SFM/IPT/Vc/fz), some are ISO-13399 GEOMETRY tables (diameter/
// flute-length/shank), some are INDEX/catalog tables (page/series/coating/description).
// Before any per-vendor column normalizer can run, each table must be classified so the
// normalizer only persists real cutting-data grids and NEVER fabricates cutting
// parameters from a catalog index. The dangerous failure mode is a FALSE POSITIVE —
// a non-cutting table labeled `cutting-data` — so the design is biased AGAINST that:
//
//   1. A category can WIN only if it has a STRONG-keyword hit (weak-only words like
//      "feed"/"material" can never alone elect a verdict).
//   2. Keywords match on WORD BOUNDARIES, not substrings ("ap" never matches "taper").
//   3. Only SHORT, label-like header cells vote; long prose (a DESCRIPTION column
//      reading "3 flute, variable grind") is skipped so it can't pollute the type.
//   4. The header window is scanned wide enough to find a real header sitting under a
//      title banner, but body data never votes on type.
//
// Pure, dependency-free, deterministic. No I/O. Consumed by the (next-unit) normalizer
// + surfaced via `db-toolbelt.mjs --run classify-tables`.

export const CLASSIFIER_SCHEMA_VERSION = "1.0.0";

export const CATEGORY = Object.freeze({
  CUTTING_DATA: "cutting-data",
  GEOMETRY: "geometry",
  INDEX: "index",
  OTHER: "other",
});

// strong = near-unambiguous COLUMN HEADER for the category (weight 3) AND required for
// that category to win. weak = suggestive but cross-category (weight 1, cannot win alone).
// All matched case-insensitively on WORD BOUNDARIES against short header cells.
export const SIGNAL_KEYWORDS = Object.freeze({
  [CATEGORY.CUTTING_DATA]: {
    strong: [
      "sfm", "smm", "ipt", "ipr", "ipm", "chipload", "chip load", "vc", "fz", "fn",
      "m/min", "mm/min", "mm/rev", "surface speed", "cutting speed", "feed per tooth",
      "feed per rev", "feed rate", "spindle speed", "in/min", "in/tooth", "in/rev",
      "depth of cut", "stepover", "step-over", "stepdown", "step-down", "metal removal",
    ],
    // NOTE: "material"/"hardness"/"coolant" deliberately NOT here — they are cutting
    // CONTEXT columns that appear on geometry/reference tables and would false-positive.
    // Bare "ap"/"ae"/"doc" removed — too short/ambiguous; "depth of cut"/"stepover" cover them.
    weak: ["feed", "speed", "rpm"],
  },
  [CATEGORY.GEOMETRY]: {
    strong: [
      "diameter", "cutting diameter", "shank", "flute length", "oal", "overall length",
      "length of cut", "corner radius", "inscribed circle", "cutting edge", "apmx",
      "dcon", "dcx", "lcf", "reach length", "neck diameter", "point angle", "helix angle",
    ],
    // bare "flute" is WEAK (pollutes from DESCRIPTION prose); "flute length" stays strong.
    weak: ["length", "dia", "reach", "neck", "radius", "angle", "flute", "flutes", "edges", "loc"],
  },
  [CATEGORY.INDEX]: {
    // Catalog-index COLUMN HEADERS are definitional → strong. They name a reference/
    // selection table (page refs, coatings, descriptions), never a data grid.
    strong: [
      "part no", "part number", "order no", "order number", "edp", "page no", "see page",
      "catalog no", "series", "item no", "stock no", "page", "coating", "description",
    ],
    weak: ["grade", "catalog"],
  },
});

const STRONG_W = 3;
const WEAK_W = 1;
const MAX_HEADER_ROWS = 6;        // header window — wide enough to clear a title banner above the real header
const MAX_HEADER_CELL_LEN = 28;   // only SHORT label-like cells vote; long prose (DESCRIPTION) skipped
const DEFAULT_SCAN_LIMIT = 250;   // oversize guard — cap rows scanned for numeric density
const CUTTING_DATA_MIN_CONF = 0.15; // cuttingDataTables floor — never surface a zero-margin guess as persistable

const DECIDABLE = [CATEGORY.CUTTING_DATA, CATEGORY.GEOMETRY, CATEGORY.INDEX];

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"); }
// Word-boundary matcher tolerant of keywords that start/end with non-word chars (e.g. "m/min").
function kwRegex(kw) { return new RegExp(`(?:^|[^a-z0-9])${escapeRe(kw)}(?:[^a-z0-9]|$)`, "i"); }

// Precompile once at module load (keyword lists are static).
const PATTERNS = Object.fromEntries(
  DECIDABLE.map((cat) => [cat, {
    strong: SIGNAL_KEYWORDS[cat].strong.map(kwRegex),
    weak: SIGNAL_KEYWORDS[cat].weak.map(kwRegex),
  }]),
);

function normCell(c) {
  if (c === null || c === undefined) return "";
  return String(c).toLowerCase().trim();
}

function isNumericCell(c) {
  const s = normCell(c).replace(/[,%×x*~]/g, " ").trim();
  if (!s) return false;
  const tok = s.split(/[\s/\-–]+/).filter(Boolean);
  if (tok.length === 0) return false;
  return tok.some((t) => /^[+-]?\d*\.?\d+$/.test(t));
}

// presence-based: +1 per distinct keyword pattern that appears (not per occurrence —
// repetition must not over-weight).
function countMatches(text, regexList) {
  let n = 0;
  for (const re of regexList) if (re.test(text)) n++;
  return n;
}

/**
 * Classify a single camelot table object.
 * NOTE: `kind` is ADVISORY — on an exact strong-score tie it favors the earlier
 * DECIDABLE entry (cutting-data) at confidence 0. The persistable surface is
 * `classifyDocument(...).cuttingDataTables`, which applies the CUTTING_DATA_MIN_CONF
 * floor; a persistence consumer must read THAT, never a raw `kind`, to honor the
 * never-poison bar.
 * @param {object} table - { rows: string[][], page?, table_index_on_page? }
 * @param {object} [opts] - { scanLimit?: number, minConfidence?: number }
 * @returns {{kind:string, confidence:number, scores:object, strongScores:object, numericDensity:number, scanned:number, rowCount:number}}
 */
export function classifyTable(table, opts = {}) {
  const scanLimit = Number.isFinite(opts.scanLimit) ? opts.scanLimit : DEFAULT_SCAN_LIMIT;
  const rows = table && Array.isArray(table.rows) ? table.rows : [];
  const scores = { [CATEGORY.CUTTING_DATA]: 0, [CATEGORY.GEOMETRY]: 0, [CATEGORY.INDEX]: 0 };
  const strongScores = { [CATEGORY.CUTTING_DATA]: 0, [CATEGORY.GEOMETRY]: 0, [CATEGORY.INDEX]: 0 };

  let numericCells = 0;
  let nonEmptyCells = 0;
  let scanned = 0;

  for (let r = 0; r < rows.length && r < scanLimit; r++) {
    const row = Array.isArray(rows[r]) ? rows[r] : [];
    scanned++;

    // numeric density over ALL scanned cells (informational; does NOT drive the verdict).
    for (const cell of row) {
      const nc = normCell(cell);
      if (!nc) continue;
      nonEmptyCells++;
      if (isNumericCell(cell)) numericCells++;
    }

    // keyword scoring: header window only, SHORT label-like cells only (long prose skipped).
    if (r < MAX_HEADER_ROWS) {
      const headerText = row.map(normCell).filter((c) => c && c.length <= MAX_HEADER_CELL_LEN).join(" | ");
      if (headerText.replace(/[\s|]/g, "")) {
        for (const cat of DECIDABLE) {
          const sHits = countMatches(headerText, PATTERNS[cat].strong);
          const wHits = countMatches(headerText, PATTERNS[cat].weak);
          scores[cat] += STRONG_W * sHits + WEAK_W * wHits;
          strongScores[cat] += sHits;
        }
      }
    }
  }

  const numericDensity = nonEmptyCells > 0 ? numericCells / nonEmptyCells : 0;

  // argmax — but a category is ELIGIBLE TO WIN only if it has a strong-keyword hit.
  // Weak-only signal can never elect a verdict (kills the false-positive class).
  let kind = CATEGORY.OTHER;
  let top = 0;
  let second = 0;
  for (const cat of DECIDABLE) {
    const eligible = strongScores[cat] > 0;
    const sc = eligible ? scores[cat] : 0;
    if (sc > top) { second = top; top = sc; kind = cat; }
    else if (sc > second) { second = sc; }
  }

  let confidence = top > 0 ? (top - second) / top : 0;
  if (top === 0) { kind = CATEGORY.OTHER; confidence = 0; }
  const minConfidence = Number.isFinite(opts.minConfidence) ? opts.minConfidence : 0;
  if (kind !== CATEGORY.OTHER && confidence < minConfidence) kind = CATEGORY.OTHER;

  return {
    kind,
    confidence: Math.round(confidence * 1000) / 1000,
    scores,
    strongScores,
    numericDensity: Math.round(numericDensity * 1000) / 1000,
    scanned,
    rowCount: rows.length,
  };
}

/**
 * Classify an entire camelot-extract.py document.
 * @param {object} doc - parsed camelot JSON: { tables: [...] } OR a bare tables[] array
 * @param {object} [opts] - { minCuttingConfidence?: number } (default CUTTING_DATA_MIN_CONF)
 * @returns {{ok:boolean, schemaVersion:string, tableCount:number, byKind:object, tables:Array, cuttingDataTables:Array, error?:string}}
 */
export function classifyDocument(doc, opts = {}) {
  const tables = Array.isArray(doc) ? doc : (doc && Array.isArray(doc.tables) ? doc.tables : null);
  if (!tables) {
    return { ok: false, schemaVersion: CLASSIFIER_SCHEMA_VERSION, error: "no tables[] in document", tableCount: 0, byKind: {}, tables: [], cuttingDataTables: [] };
  }
  const floor = Number.isFinite(opts.minCuttingConfidence) ? opts.minCuttingConfidence : CUTTING_DATA_MIN_CONF;
  const byKind = { [CATEGORY.CUTTING_DATA]: 0, [CATEGORY.GEOMETRY]: 0, [CATEGORY.INDEX]: 0, [CATEGORY.OTHER]: 0 };
  const out = [];
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i] || {};
    const c = classifyTable(t, opts);
    byKind[c.kind] = (byKind[c.kind] || 0) + 1;
    out.push({
      page: t.page ?? null,
      table_index_on_page: t.table_index_on_page ?? null,
      docIndex: i,
      kind: c.kind,
      confidence: c.confidence,
      numericDensity: c.numericDensity,
      rowCount: c.rowCount,
      scores: c.scores,
      strongScores: c.strongScores,
    });
  }
  return {
    ok: true,
    schemaVersion: CLASSIFIER_SCHEMA_VERSION,
    tableCount: tables.length,
    byKind,
    tables: out,
    // Only surface cutting-data we are reasonably sure of — a zero-margin guess must
    // never auto-flow into a persistence step (the operator's never-poison bar).
    cuttingDataTables: out.filter((t) => t.kind === CATEGORY.CUTTING_DATA && t.confidence >= floor),
  };
}

// CLI: node scripts/lib/catalog-table-classifier.mjs <camelot-json> [--min N]
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const fs = await import("node:fs");
  const file = process.argv[2];
  if (!file) { console.error("usage: catalog-table-classifier.mjs <camelot-json> [--min N]"); process.exit(2); }
  const minIdx = process.argv.indexOf("--min");
  const minCuttingConfidence = minIdx !== -1 ? Number(process.argv[minIdx + 1]) : CUTTING_DATA_MIN_CONF;
  let doc;
  try { doc = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { console.error(`cannot read/parse ${file}: ${e.message}`); process.exit(1); }
  const res = classifyDocument(doc, { minCuttingConfidence });
  console.log(JSON.stringify({ file, ok: res.ok, schemaVersion: res.schemaVersion, tableCount: res.tableCount, byKind: res.byKind, cuttingDataTables: res.cuttingDataTables.length, tables: res.tables }, null, 2));
}
