// node --test scripts/build-vendor-catalog-db.test.mjs
// Real-value assertions on the vendor-catalog-db consolidator's pure functions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJsonl, projectSfcMaker, deriveCounts, buildManifest, SOURCES } from "./build-vendor-catalog-db.mjs";

test("parseJsonl — parses valid lines, skips blank lines", () => {
  const rows = parseJsonl('{"a":1}\n\n{"a":2}\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].a, 1);
  assert.equal(rows[1].a, 2);
});

test("parseJsonl — throws with line number on a bad line (fail-loud)", () => {
  assert.throws(() => parseJsonl('{"a":1}\n{bad}\n', "x.jsonl"), /bad JSONL at x\.jsonl:2/);
});

test("projectSfcMaker — keeps pointer fields, DROPS any cutting data (oscar owns it)", () => {
  const rec = {
    vendor: "Fraisa", vendor_id: "fraisa", extraction_priority: "HIGH",
    catalog_on_disk: true, already_ingested: false, jm_buys: false,
    iso_groups_expected: ["P", "M"], existing_or_target_data_file: "mcp-server/src/data/fraisa-speed-feed-data.ts",
    reach: "global", website: "https://fraisa.com",
    // fields that MUST NOT be carried into the persistence store:
    vc_table: [{ iso: "P", vc: 200 }], cutting_data: { fz: 0.1 }, raw_pdf_text: "....",
  };
  const p = projectSfcMaker(rec);
  assert.equal(p.vendor, "Fraisa");
  assert.equal(p.extraction_priority, "HIGH");
  assert.equal(p.target_data_file, "mcp-server/src/data/fraisa-speed-feed-data.ts");
  assert.equal(p.vc_table, undefined, "must not carry vc_table (oscar's domain)");
  assert.equal(p.cutting_data, undefined, "must not carry cutting_data");
  assert.equal(p.raw_pdf_text, undefined);
});

test("deriveCounts — counts re-derived from live arrays, high-priority + ingested filters", () => {
  const vendors = [
    { vendor_id: "a", website: "https://a.com" },
    { vendor_id: "b", website: null },
    { vendor_id: "c", website: "https://c.com" },
  ];
  const catalogs = [{ name: "x" }, { name: "y" }];
  const sfcMakers = [
    { vendor: "A", extraction_priority: "HIGH", already_ingested: false },
    { vendor: "B", extraction_priority: "high", already_ingested: true },
    { vendor: "C", extraction_priority: "LOW", already_ingested: true },
  ];
  const jmBuys = { jm_tool_vendors: ["v1", "v2", "v3"], totalToolSpend: 211000 };
  const c = deriveCounts({ vendors, catalogs, sfcMakers, jmBuys });
  assert.equal(c.vendors, 3);
  assert.equal(c.vendors_with_website, 2);
  assert.equal(c.catalogs, 2);
  assert.equal(c.sfc_makers, 3);
  assert.equal(c.sfc_high_priority, 2, "HIGH + high both count (case-insensitive)");
  assert.equal(c.sfc_already_ingested, 2);
  assert.equal(c.jm_tool_vendors, 3);
  assert.equal(c.jm_total_tool_spend, 211000);
});

test("deriveCounts — jm vendors falls back to distinctToolVendors when array absent", () => {
  const c = deriveCounts({ vendors: [], catalogs: [], sfcMakers: [], jmBuys: { distinctToolVendors: 18 } });
  assert.equal(c.jm_tool_vendors, 18);
  assert.equal(c.jm_total_tool_spend, null);
});

test("buildManifest — schema-versioned shape with crossRef + tables + source registry", () => {
  const counts = { vendors: 433 };
  const sourceRegistry = { vendors: { path: "state/shared/quoting/vendor-directory.jsonl", bytes: 189154, records: 425 } };
  const m = buildManifest({ counts, sourceRegistry, generatedAt: "2026-05-31T00:00:00.000Z" });
  assert.equal(m.schemaVersion, "1.0.0");
  assert.equal(m.owner, "juliett");
  assert.equal(m.store, "vendor-catalog-db");
  assert.equal(m.counts.vendors, 433);
  assert.equal(m.sourceRegistry.vendors.records, 425);
  // cross-refs must name oscar's SFC targets + the legacy manifest (no-overwrite contract)
  assert.match(m.crossRef.sfc_data_targets, /speed-feed-data\.ts/);
  assert.match(m.crossRef.legacy_tool_count_manifest, /vendor-catalog-manifest\.json/);
  assert.ok(m.tables["tables/vendors.jsonl"]);
  assert.ok(m.tables["tables/sfc-makers.jsonl"].includes("NOT cutting data") || /NOT cutting data/.test(m.tables["tables/sfc-makers.jsonl"]));
});

test("SOURCES — names the five Charlie quoting sources", () => {
  assert.deepEqual(Object.keys(SOURCES).sort(), ["catalogs", "dirIndex", "jmBuys", "sfc", "vendors"]);
  assert.equal(SOURCES.vendors.rel, "vendor-directory.jsonl");
  assert.equal(SOURCES.catalogs.rel, "vendor-sources/catalog-vendors.jsonl");
});
