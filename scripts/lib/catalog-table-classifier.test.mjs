// node --test scripts/lib/catalog-table-classifier.test.mjs
// Real-value assertions on the camelot table-type classifier.
// Coverage: happy path (cutting/geometry/index) · NEGATIVE path (the never-poison bar:
// non-cutting tables must NOT classify cutting-data) · ≥3 failure modes (empty/null/
// malformed/non-array rows/non-string cells) · ≥2 adversarial (NaN/Infinity/unicode/
// oversize/substring-trap) · variability (SFM grid, IPT grid, ISO geometry, index, mixed,
// banner-offset header) · minConfidence survival.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyTable, classifyDocument, CATEGORY, SIGNAL_KEYWORDS, CLASSIFIER_SCHEMA_VERSION } from "./catalog-table-classifier.mjs";

// ── Fixtures mirroring real camelot-extract.py output shapes ──
const SFM_GRID = { page: 4, table_index_on_page: 0, rows: [
  ["Material", "ISO", "SFM", "IPT", "RPM"],
  ["1018 Steel", "P", "350", "0.004", "2800"],
  ["304 Stainless", "M", "200", "0.003", "1600"],
  ["6061 Aluminum", "N", "1000", "0.006", "9000"],
] };
const IPT_CHIPLOAD_GRID = { page: 7, table_index_on_page: 1, rows: [
  ["Tool Dia", "Chip Load (IPT)", "Feed Rate (IPM)", "Spindle Speed (RPM)"],
  ["0.125", "0.002", "22.4", "11200"],
  ["0.250", "0.004", "18.0", "4500"],
] };
const ISO_GEOMETRY = { page: 22, table_index_on_page: 0, rows: [
  ["Series", "Cutting Diameter", "Flute Length", "Shank Dia", "OAL", "Corner Radius"],
  ["EM-250", "0.250", "0.750", "0.250", "2.50", "0.010"],
  ["EM-375", "0.375", "1.000", "0.375", "3.00", "0.015"],
] };
// real garr shape: title banner + index header + DESCRIPTION prose that mentions "flute"
const CATALOG_INDEX = { page: 1, table_index_on_page: 0, rows: [
  ["END MILLS", "", "", "", ""],
  ["", "SERIES", "PAGE", "COATING", "DESCRIPTION"],
  ["X3", "", "121", "ALCRONOS", "High performance, 3 flute, Variable flute grind"],
  ["G3", "", "121", "TISINOS PRO", "High performance, 3 flute, Variable flute grind"],
] };

const STRONG_HIT = 3; // STRONG_W — one strong-keyword hit

test("happy path — SFM speeds-feeds grid classifies as cutting-data with high confidence", () => {
  const r = classifyTable(SFM_GRID);
  assert.equal(r.kind, CATEGORY.CUTTING_DATA);
  assert.ok(r.confidence >= 0.5, `confidence ${r.confidence} should be >=0.5`);
  assert.ok(r.strongScores[CATEGORY.CUTTING_DATA] >= 1, "must have a strong cutting hit");
});

test("happy path — IPT/chipload grid classifies as cutting-data via strong hit", () => {
  const r = classifyTable(IPT_CHIPLOAD_GRID);
  assert.equal(r.kind, CATEGORY.CUTTING_DATA);
  assert.ok(r.scores[CATEGORY.CUTTING_DATA] >= STRONG_HIT);
});

test("happy path — ISO-13399 geometry table classifies as geometry, not cutting-data", () => {
  const r = classifyTable(ISO_GEOMETRY);
  assert.equal(r.kind, CATEGORY.GEOMETRY);
  assert.ok(r.scores[CATEGORY.GEOMETRY] > r.scores[CATEGORY.CUTTING_DATA]);
});

test("happy path — catalog index w/ DESCRIPTION prose ('3 flute') classifies as index, NOT geometry", () => {
  const r = classifyTable(CATALOG_INDEX);
  assert.equal(r.kind, CATEGORY.INDEX, "long DESCRIPTION prose must not pull it to geometry");
});

test("variability — six spanning configs each land in the right bucket", () => {
  assert.equal(classifyTable(SFM_GRID).kind, CATEGORY.CUTTING_DATA);
  assert.equal(classifyTable(IPT_CHIPLOAD_GRID).kind, CATEGORY.CUTTING_DATA);
  assert.equal(classifyTable(ISO_GEOMETRY).kind, CATEGORY.GEOMETRY);
  assert.equal(classifyTable(CATALOG_INDEX).kind, CATEGORY.INDEX);
  // mixed: a tool table carrying BOTH geometry AND recommended SFM → cutting-data wins (higher value)
  const mixed = { rows: [["Series", "Dia", "Flute Length", "SFM", "IPT"], ["A1", "0.25", "0.75", "400", "0.004"]] };
  assert.equal(classifyTable(mixed).kind, CATEGORY.CUTTING_DATA);
  // banner-offset: real header sits at row 4 under a title banner → still found (header window=6)
  const banner = { rows: [
    ["TABLE 4.2"], ["Recommended Cutting Parameters"], ["Carbide End Mills"],
    ["Material", "SFM", "IPT", "RPM"], ["1018", "350", "0.004", "2800"],
  ] };
  assert.equal(classifyTable(banner).kind, CATEGORY.CUTTING_DATA, "header under a title banner must still classify cutting-data");
});

// ── NEGATIVE PATH — the operator's hard bar: a non-cutting table must NEVER be cutting-data ──
test("never-poison — metallurgy/setup reference (Material/Hardness/Coolant) is NOT cutting-data", () => {
  const t = { rows: [["Material", "Hardness (HRC)", "Coolant"], ["4140", "28-32", "Flood"], ["A2", "58-60", "Air"]] };
  const r = classifyTable(t);
  assert.notEqual(r.kind, CATEGORY.CUTTING_DATA, "weak-only context words must not elect cutting-data");
});

test("never-poison — substring trap (Cape Diameter / Taper / Shape) does NOT hit short cutting tokens", () => {
  // "ap" must not match inside "cape"/"taper"/"shape"; classifier must not call this cutting-data
  const t = { rows: [["Shape", "Cape Diameter", "Taper Angle"], ["round", "0.5", "2"]] };
  const r = classifyTable(t);
  assert.notEqual(r.kind, CATEGORY.CUTTING_DATA);
});

test("never-poison — numeric INDEX table (Series/Page + page numbers + 'feed' prose) is NOT cutting-data", () => {
  const t = { rows: [
    ["Series", "Page no.", "Description"],
    ["1520", "71", "see feed chapter"],
    ["1800", "94", "high speed line"],
    ["2200", "120", "general purpose"],
  ] };
  const r = classifyTable(t);
  assert.notEqual(r.kind, CATEGORY.CUTTING_DATA, "a numeric index table must not be promoted to cutting-data");
  assert.equal(r.kind, CATEGORY.INDEX);
});

test("never-poison — weak-only cutting words alone cannot win (strong-hit required)", () => {
  const t = { rows: [["feed", "speed", "rpm note"], ["x", "y", "z"]] };
  const r = classifyTable(t);
  // no strong cutting keyword → cutting-data must NOT be the verdict
  assert.notEqual(r.kind, CATEGORY.CUTTING_DATA);
});

test("never-poison — geometry-only table is geometry, never cutting-data", () => {
  const r = classifyTable(ISO_GEOMETRY);
  assert.notEqual(r.kind, CATEGORY.CUTTING_DATA);
});

// ── Failure modes ──
test("failure mode — empty rows → other, confidence 0", () => {
  const r = classifyTable({ rows: [] });
  assert.equal(r.kind, CATEGORY.OTHER);
  assert.equal(r.confidence, 0);
  assert.equal(r.scanned, 0);
});

test("failure mode — null/undefined/empty table → other (no throw)", () => {
  assert.equal(classifyTable(null).kind, CATEGORY.OTHER);
  assert.equal(classifyTable(undefined).kind, CATEGORY.OTHER);
  assert.equal(classifyTable({}).kind, CATEGORY.OTHER);
});

test("failure mode — rows is not an array (malformed) → other", () => {
  assert.equal(classifyTable({ rows: "not-an-array" }).kind, CATEGORY.OTHER);
  assert.equal(classifyTable({ rows: 42 }).kind, CATEGORY.OTHER);
});

test("failure mode — non-array row + non-string cells do not throw", () => {
  const t = { rows: [["SFM", "IPT"], "bad-row", [null, undefined, 123, { x: 1 }], [NaN, Infinity]] };
  const r = classifyTable(t);
  assert.ok(Number.isFinite(r.confidence));
  assert.ok(Number.isFinite(r.numericDensity));
});

test("failure mode — all-empty cells → other, numericDensity 0", () => {
  const r = classifyTable({ rows: [["", "  ", null], ["", ""]] });
  assert.equal(r.kind, CATEGORY.OTHER);
  assert.equal(r.numericDensity, 0);
});

// ── Adversarial ──
test("adversarial — NaN/Infinity/huge-number cells stay finite, no poisoning", () => {
  const t = { rows: [["SFM", "IPT"], ["NaN", "Infinity"], ["1e308", "-0"], ["350", "0.004"]] };
  const r = classifyTable(t);
  assert.ok(Number.isFinite(r.confidence) && r.confidence >= 0 && r.confidence <= 1);
  assert.ok(Number.isFinite(r.numericDensity) && r.numericDensity >= 0 && r.numericDensity <= 1);
});

test("adversarial — unicode geometry headers (ø, °) still detected via word boundary", () => {
  const t = { rows: [["ø Diameter", "Helix Angle °", "Flutes"], ["0.250", "30", "4"]] };
  const r = classifyTable(t);
  assert.equal(r.kind, CATEGORY.GEOMETRY);
});

test("adversarial — oversize table respects scanLimit (no unbounded scan)", () => {
  const rows = [["Material", "SFM", "IPT"]];
  for (let i = 0; i < 5000; i++) rows.push([`Steel-${i}`, "350", "0.004"]);
  const r = classifyTable({ rows }, { scanLimit: 100 });
  assert.equal(r.scanned, 100, "scanned must be capped at scanLimit");
  assert.equal(r.rowCount, 5001, "rowCount reports full size even when scan is capped");
  assert.equal(r.kind, CATEGORY.CUTTING_DATA);
});

test("minConfidence — a CLEAN high-margin SFM grid SURVIVES a high minConfidence", () => {
  const r = classifyTable(SFM_GRID, { minConfidence: 0.5 });
  assert.equal(r.kind, CATEGORY.CUTTING_DATA, "high-confidence cutting grid must not be demoted");
});

test("minConfidence — a low-margin classification is demoted to other", () => {
  // geometry vs index near-tie: "Series" (index strong) + "Dia" weak geom — give them a real tie
  const t = { rows: [["Series", "Diameter"], ["A", "0.25"]] };
  const high = classifyTable(t, { minConfidence: 0.99 });
  assert.equal(high.kind, CATEGORY.OTHER, "below minConfidence → other");
});

// ── classifyDocument ──
test("classifyDocument — aggregates byKind + filters cuttingDataTables + stamps schemaVersion", () => {
  const doc = { tables: [SFM_GRID, ISO_GEOMETRY, CATALOG_INDEX, IPT_CHIPLOAD_GRID] };
  const r = classifyDocument(doc);
  assert.equal(r.ok, true);
  assert.equal(r.schemaVersion, CLASSIFIER_SCHEMA_VERSION);
  assert.equal(r.tableCount, 4);
  assert.equal(r.byKind[CATEGORY.CUTTING_DATA], 2);
  assert.equal(r.byKind[CATEGORY.GEOMETRY], 1);
  assert.equal(r.byKind[CATEGORY.INDEX], 1);
  assert.equal(r.cuttingDataTables.length, 2);
  assert.ok(r.tables.every((t) => "page" in t && "kind" in t && "confidence" in t && "strongScores" in t));
});

test("classifyDocument — cuttingDataTables filter excludes below-confidence guesses", () => {
  // a zero-margin cutting label must not appear in cuttingDataTables
  const doc = { tables: [{ rows: [["Series", "SFM"], ["1", "350"]] }] }; // index-strong + cutting-strong near tie
  const r = classifyDocument(doc, { minCuttingConfidence: 0.5 });
  assert.ok(r.cuttingDataTables.every((t) => t.confidence >= 0.5));
});

test("classifyDocument — accepts a bare tables[] array", () => {
  const r = classifyDocument([SFM_GRID, ISO_GEOMETRY]);
  assert.equal(r.ok, true);
  assert.equal(r.tableCount, 2);
});

test("classifyDocument — malformed input (no tables[]) → ok:false, not a throw", () => {
  assert.equal(classifyDocument({}).ok, false);
  assert.equal(classifyDocument(null).ok, false);
  assert.equal(classifyDocument(42).ok, false);
});

// ── invariants ──
test("invariant — category constants + keyword lists consistent; cutting weak excludes context words", () => {
  assert.deepEqual(Object.values(CATEGORY).sort(), ["cutting-data", "geometry", "index", "other"]);
  for (const cat of [CATEGORY.CUTTING_DATA, CATEGORY.GEOMETRY, CATEGORY.INDEX]) {
    assert.ok(SIGNAL_KEYWORDS[cat].strong.length > 0, `${cat} has strong keywords`);
  }
  // regression guard: context columns must NOT be cutting strong/weak (P0-1)
  const cd = SIGNAL_KEYWORDS[CATEGORY.CUTTING_DATA];
  for (const ctx of ["material", "hardness", "coolant"]) {
    assert.ok(!cd.strong.includes(ctx) && !cd.weak.includes(ctx), `"${ctx}" must not be a cutting signal`);
  }
});
