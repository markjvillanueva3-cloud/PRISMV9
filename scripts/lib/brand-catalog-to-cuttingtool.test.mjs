/**
 * Tests for brand-catalog-to-cuttingtool.mjs (slot:romeo, BRAND-CATALOG-APP-WIRING 2026-06-19).
 * Run: node scripts/lib/brand-catalog-to-cuttingtool.test.mjs
 *
 * R9 intent: every assertion encodes WHY the mapped record must look as it does -- the fields
 * ToolRegistry.buildIndexes() + search() actually read. A test fails iff the wire would break.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toCuttingTool,
  mapRecords,
  brandSlug,
  BRAND_CATALOG_SOURCE,
  BRAND_CATALOG_ID_PREFIX,
} from "./brand-catalog-to-cuttingtool.mjs";

// Real canonical record shape from loadBrandCatalog() (the actual ACCU-0.0469 row).
const ACCUPRO_DRILL = {
  id: "ACCU-0.0469",
  brand: "Accupro",
  category: "drill",
  type: "drill",
  subtype: null,
  unit_source: "mm",
  diameter_mm: 1.191,
  shank_mm: null,
  flute_len_mm: 7.14,
  oal_mm: 6.75,
  corner_radius_mm: null,
  num_flutes: null,
  coating: null,
  material: null,
  iso_number: null,
  shape: null,
  description: null,
  geometry_complete: true,
  geometry_plausible: true,
  source_file: "accupro-tools-extracted.json",
};

// ── happy path: faithful mapping of the search/index contract ──
test("maps a real Accupro drill onto the ToolRegistry search/index contract", () => {
  const t = toCuttingTool(ACCUPRO_DRILL);
  assert.equal(t.id, "BC::ACCUPRO::ACCU-0.0469", "id must be brand-namespaced (collision-safe)");
  assert.equal(t.catalog_number, "ACCU-0.0469", "original id preserved for getByIdOrCatalog + query");
  assert.equal(t.manufacturer, "Accupro", "indexByManufacturer source");
  assert.equal(t.vendor, "Accupro", "vendor alias (data uses vendor, interface uses manufacturer)");
  assert.equal(t.type, "drill", "indexByType source");
  assert.equal(t.category, "drill", "indexByCategory source");
  assert.equal(t.cutting_diameter_mm, 1.191, "indexByDiameter + diameter_min/max filter source");
  assert.equal(t.geometry.diameter, 1.191, "geometry.diameter fallback path");
  assert.equal(t.geometry.flute_length, 7.14);
  assert.equal(t.geometry.overall_length, 6.75);
  assert.equal(t.source, BRAND_CATALOG_SOURCE);
  assert.equal(t.confidence, 0.9, "geometry_complete row -> high confidence");
  assert.match(t.name, /Accupro/, "name carries brand for multi-term query");
  assert.match(t.name, /drill/, "name carries type for multi-term query");
  assert.ok(Array.isArray(t.material_groups) && t.material_groups.length === 0, "no fabricated ISO groups");
});

// ── happy path: timestamp stamping is opt-in (mapper stays pure) ──
test("stampedAt is the only source of last_updated (mapper otherwise deterministic)", () => {
  const a = toCuttingTool(ACCUPRO_DRILL);
  assert.equal(a.last_updated, undefined, "no stamp -> no last_updated (pure)");
  const b = toCuttingTool(ACCUPRO_DRILL, { stampedAt: "2026-06-19T00:00:00.000Z" });
  assert.equal(b.last_updated, "2026-06-19T00:00:00.000Z");
  // determinism: same input twice -> identical output
  assert.deepEqual(toCuttingTool(ACCUPRO_DRILL), toCuttingTool(ACCUPRO_DRILL));
});

// ── variability: an insert (different category, ic-derived diameter) ──
test("maps an indexable insert (spanning config #2)", () => {
  const insert = { id: "ISC-CNMG432", brand: "Iscar", category: "insert", type: "insert", diameter_mm: 12.7, num_flutes: null, coating: "TiAlN", geometry_complete: true };
  const t = toCuttingTool(insert);
  assert.equal(t.id, "BC::ISCAR::ISC-CNMG432");
  assert.equal(t.category, "insert");
  assert.equal(t.coating, "TiAlN", "indexByCoating + coating filter source");
  assert.equal(t.cutting_diameter_mm, 12.7);
});

// ── variability: a holder (spanning config #3) ──
test("maps a holder (spanning config #3) with brand fallback when brand missing", () => {
  const holder = { id: "HLD-BT40-ER32", brand: "", category: "holder", type: "holder", diameter_mm: 32 };
  const t = toCuttingTool(holder);
  assert.equal(t.id, "BC::UNKNOWN::HLD-BT40-ER32", "empty brand -> UNKNOWN slug, still collision-namespaced");
  assert.equal(t.manufacturer, "Unknown");
  assert.equal(t.category, "holder");
});

// ── failure mode 1: name-only row (no diameter) still loads ──
test("name-only row (no diameter) maps without a diameter (not dropped)", () => {
  const nameOnly = { id: "GEN-FACEMILL-X", brand: "Generic", category: "indexable_mill", type: "face_mill", diameter_mm: null, geometry_complete: false };
  const t = toCuttingTool(nameOnly);
  assert.ok(t, "name-only catalog tool must still load");
  assert.equal(t.cutting_diameter_mm, undefined, "no diameter -> field omitted (not 0, not null)");
  assert.equal(t.geometry, undefined, "no geometry source -> no geometry object");
  assert.equal(t.confidence, 0.6, "not geometry_complete -> lower confidence");
});

// ── failure mode 2: missing id -> null (ToolRegistry keys by id) ──
test("record without an id maps to null (unloadable)", () => {
  assert.equal(toCuttingTool({ brand: "X", category: "drill", diameter_mm: 5 }), null);
  assert.equal(toCuttingTool({ id: "   ", brand: "X" }), null, "whitespace-only id is no id");
});

// ── failure mode 3: null / non-object input -> null (no throw) ──
test("null / non-object input returns null without throwing", () => {
  assert.equal(toCuttingTool(null), null);
  assert.equal(toCuttingTool(undefined), null);
  assert.equal(toCuttingTool(42), null);
  assert.equal(toCuttingTool("nope"), null);
});

// ── adversarial 1: non-finite / negative diameters never reach JSON ──
test("Infinity / NaN / negative diameters are sanitized out (JSON-safe)", () => {
  for (const bad of [Infinity, -Infinity, NaN, -5, 0]) {
    const t = toCuttingTool({ id: "BAD", brand: "Z", category: "drill", type: "drill", diameter_mm: bad });
    assert.equal(t.cutting_diameter_mm, undefined, `diameter ${bad} must be dropped`);
    // round-trips through JSON with no null-diameter corruption
    const round = JSON.parse(JSON.stringify(t));
    assert.ok(!("cutting_diameter_mm" in round) || typeof round.cutting_diameter_mm === "number");
  }
});

// ── adversarial 2: cross-brand id collision is impossible (namespace) ──
test("same original id under two brands yields distinct registry ids", () => {
  const a = toCuttingTool({ id: "100", brand: "Sandvik", category: "drill", diameter_mm: 6 });
  const b = toCuttingTool({ id: "100", brand: "Kennametal", category: "drill", diameter_mm: 6 });
  assert.notEqual(a.id, b.id, "namespace must separate same-id tools across brands");
  assert.equal(a.id, "BC::SANDVIK::100");
  assert.equal(b.id, "BC::KENNAMETAL::100");
});

// ── adversarial 3: float flute count is rejected (only positive ints index) ──
test("non-integer / non-positive flute counts are dropped", () => {
  assert.equal(toCuttingTool({ id: "F", brand: "Y", diameter_mm: 5, num_flutes: 2.5 }).flute_count, undefined);
  assert.equal(toCuttingTool({ id: "F", brand: "Y", diameter_mm: 5, num_flutes: 0 }).flute_count, undefined);
  assert.equal(toCuttingTool({ id: "F", brand: "Y", diameter_mm: 5, num_flutes: 4 }).flute_count, 4);
});

// ── failure mode 4: implausible geometry -> diameter dropped, record KEPT ──
test("geometry_plausible:false drops the bogus diameter but keeps the catalog entry", () => {
  // real shape of the YG1-380 thread-code mis-parse: a 380mm "drill" the loader flags implausible
  const bogus = { id: "YG1-380.0", brand: "YG-1", category: "drill", type: "drill", diameter_mm: 380, geometry_plausible: false, geometry_complete: true };
  const t = toCuttingTool(bogus);
  assert.ok(t, "record is kept (searchable by name/brand/type)");
  assert.equal(t.id, "BC::YG_1::YG1-380.0");
  assert.equal(t.cutting_diameter_mm, undefined, "implausible diameter must NOT reach the diameter index");
  assert.ok(!t.geometry || t.geometry.diameter === undefined, "no bogus diameter in geometry either");
  // plausible records are unaffected
  const good = toCuttingTool({ id: "OK", brand: "YG-1", category: "drill", type: "drill", diameter_mm: 6, geometry_plausible: true });
  assert.equal(good.cutting_diameter_mm, 6);
});

// ── brandSlug contract (shard naming must agree with id namespace) ──
test("brandSlug is filesystem-safe + matches id namespace", () => {
  assert.equal(brandSlug("MA Ford"), "MA_FORD");
  assert.equal(brandSlug("YG-1"), "YG_1");
  assert.equal(brandSlug(""), "UNKNOWN");
  assert.equal(brandSlug(null), "UNKNOWN");
  assert.equal(brandSlug("  !!!  "), "UNKNOWN");
});

// ── mapRecords aggregate (emitter contract) ──
test("mapRecords drops nulls and counts skips", () => {
  const { tools, skipped } = mapRecords([ACCUPRO_DRILL, { brand: "noid" }, null, { id: "OK", brand: "B" }]);
  assert.equal(tools.length, 2);
  assert.equal(skipped, 2);
});

test("BRAND_CATALOG_ID_PREFIX is the documented namespace token", () => {
  assert.equal(BRAND_CATALOG_ID_PREFIX, "BC");
});
