/**
 * Tests for build-vendor-directory.mjs — VENDOR-NETWORK-MS0/U-VDN-SEED.
 * Real-value assertions: normalize/join, JM↔curated merge, hotel-registry enrichment, defensiveness.
 * Run: node --test scripts/build-vendor-directory.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  normalizeVendorId, topCategory, vendorRecordFromJm, vendorRecordFromCurated,
  mergeRecords, buildDirectory, renderDirectoryMd, loadVendorSources, CURATED_SUPPLIERS,
} from "./build-vendor-directory.mjs";

test("normalizeVendorId: stable JOIN key strips suffixes/punctuation/case", () => {
  assert.equal(normalizeVendorId("MICHIGAN CARBIDE"), "michigan-carbide");
  // suffix + punctuation variants collapse to the same key (the whole point — JOIN across sources)
  assert.equal(normalizeVendorId("ROCKFORM CARBIDE MANUFACTURING, INC."), normalizeVendorId("Rockform Carbide"));
  assert.equal(normalizeVendorId("A&G MECHANICAL"), "a-and-g-mechanical");
  assert.equal(normalizeVendorId("Kennametal"), "kennametal");
  assert.equal(normalizeVendorId(""), "");
  assert.equal(normalizeVendorId(null), "");
});

test("topCategory: dominant category from histogram", () => {
  assert.equal(topCategory({ material: 5, "tooling-consumable": 2 }), "material");
  assert.equal(topCategory({ "outside-process": 1 }), "outside-process");
  assert.equal(topCategory({}), "misc");
  assert.equal(topCategory(null), "misc");
});

test("vendorRecordFromJm: spend tagged charlie-extraction + advisory (R12 provenance)", () => {
  const r = vendorRecordFromJm("MICHIGAN CARBIDE", { count: 2892, spend: 2573178.12, categories: { "tooling-consumable": 2892 }, firstDate: "2019-01-03", lastDate: "2020-12-30" });
  assert.equal(r.vendor_id, "michigan-carbide");
  assert.equal(r.source, "jm-ap");
  assert.equal(r.primary_category, "tooling-consumable");
  assert.equal(r.jm.bill_lines, 2892);
  assert.equal(r.jm.spend, 2573178.12);
  assert.equal(r.jm.spend_source, "charlie-ap-extraction");
  assert.equal(r.jm.advisory, true, "JM spend is advisory until QuickBooks reconciliation");
  assert.equal(r.website, null, "JM-only vendor has no website until curated/enriched");
});

test("vendorRecordFromCurated: website + pricing-access + api flag + vendor_type + verified", () => {
  const r = vendorRecordFromCurated({ name: "MSC Industrial Supply", website: "https://www.mscdirect.com", categories: ["tooling-consumable", "material"], regions: ["US"], pricing_access: "api", has_api: true });
  assert.equal(r.source, "curated");
  assert.equal(r.website, "https://www.mscdirect.com");
  assert.equal(r.has_api, true);
  assert.equal(r.pricing_access, "api");
  assert.equal(r.vendor_type, "supplier", "default vendor_type");
  assert.equal(r.verified, true, "real website => verified");
  assert.equal(r.jm, null);
  // explicit vendor_type (machine-builder) + a flagged-unverified entry (no website)
  assert.equal(vendorRecordFromCurated({ name: "Haas Automation", website: "https://www.haascnc.com", vendor_type: "machine-builder", categories: ["machine-builder"] }).vendor_type, "machine-builder");
  const tritech = vendorRecordFromCurated({ name: "Tri-Tech", website: null, vendor_type: "service", categories: ["service-company"], verified: false });
  assert.equal(tritech.verified, false, "no website / flagged => NOT verified (R12, don't fabricate)");
  assert.equal(tritech.website, null);
});

test("mergeRecords: JM spend reality + curated website unite on one record", () => {
  const jm = vendorRecordFromJm("KENNAMETAL", { count: 123, spend: 131800.74, categories: { "tooling-consumable": 123 }, firstDate: "2015-01-08", lastDate: "2015-12-21" });
  const cur = vendorRecordFromCurated({ name: "Kennametal", website: "https://www.kennametal.com", categories: ["tooling-consumable"], regions: ["US", "EU"], pricing_access: "quote", has_api: false });
  const m = mergeRecords(jm, cur);
  assert.equal(m.source, "both");
  assert.equal(m.name, "Kennametal", "curated proper-case name wins");
  assert.equal(m.website, "https://www.kennametal.com", "curated website");
  assert.equal(m.jm.spend, 131800.74, "JM spend preserved");
  assert.deepEqual(m.regions, ["US", "EU"], "curated regions");
});

test("buildDirectory: JM seed ⊕ curated, JOIN-merges shared vendors (no dup ids)", () => {
  const costIndex = {
    vendors: {
      "MICHIGAN CARBIDE": { count: 2892, spend: 2573178, categories: { "tooling-consumable": 2892 }, firstDate: "2019-01-03", lastDate: "2020-12-30" },
      "KENNAMETAL": { count: 123, spend: 131800, categories: { "tooling-consumable": 123 }, firstDate: "2015-01-08", lastDate: "2015-12-21" },
      "SCIENTIFIC METAL TREATING": { count: 1238, spend: 83392, categories: { "outside-process": 1238 }, firstDate: "2025-01-02", lastDate: "2025-12-29" },
    },
  };
  // curated includes Kennametal (overlaps JM) + MSC (new)
  const curated = [
    { name: "Kennametal", website: "https://www.kennametal.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "quote", has_api: false },
    { name: "MSC Industrial Supply", website: "https://www.mscdirect.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "api", has_api: true },
  ];
  const dir = buildDirectory({ costIndex, curated });
  // 3 JM + 1 net-new curated (MSC); Kennametal merged → 4 unique vendors
  assert.equal(dir.stats.total, 4);
  const ids = dir.records.map((r) => r.vendor_id);
  assert.equal(new Set(ids).size, ids.length, "no duplicate vendor_ids");
  const ken = dir.records.find((r) => r.vendor_id === "kennametal");
  assert.equal(ken.source, "both", "Kennametal JM∩curated merged");
  assert.equal(ken.website, "https://www.kennametal.com");
  assert.equal(ken.jm.spend, 131800);
  const msc = dir.records.find((r) => r.vendor_id === normalizeVendorId("MSC Industrial Supply"));
  assert.equal(msc.source, "curated");
  assert.equal(msc.has_api, true);
  assert.equal(dir.stats.withApi, 1, "only MSC is API-capable here");
});

test("buildDirectory: same-id JM vendors (name-variant dup) MERGE, never silently dropped (R12)", () => {
  // "STAR ENGINEERING" + "STAR ENGINEERING LLC" → same vendor_id; a bare Map.set would lose one's spend.
  const costIndex = {
    vendors: {
      "STAR ENGINEERING": { count: 10, spend: 1000, categories: { "outside-process": 10 }, firstDate: "2018-03-01", lastDate: "2019-06-01" },
      "STAR ENGINEERING LLC": { count: 5, spend: 500, categories: { material: 5 }, firstDate: "2020-01-01", lastDate: "2021-09-01" },
    },
  };
  const dir = buildDirectory({ costIndex, curated: [] });
  assert.equal(dir.stats.total, 1, "both variants collapse to ONE vendor");
  const star = dir.records[0];
  assert.equal(star.jm.bill_lines, 15, "bill-lines summed (10+5), not overwritten");
  assert.equal(star.jm.spend, 1500, "spend summed (1000+500) — neither dropped");
  assert.deepEqual(star.categories.sort(), ["material", "outside-process"], "categories unioned");
  assert.equal(star.jm.first_seen, "2018-03-01", "earliest first_seen");
  assert.equal(star.jm.last_seen, "2021-09-01", "latest last_seen");
  assert.ok(star.jm.name_variants.includes("STAR ENGINEERING LLC"), "name variants preserved");
});

test("buildDirectory: hotel ERP registry enriches matching vendors (business master)", () => {
  const costIndex = { vendors: { "ALRO STEEL": { count: 1474, spend: 519368, categories: { material: 1474 }, firstDate: "2018-01-02", lastDate: "2016-12-29" } } };
  const hotelRegistry = { vendors: [{ vendor: "ALRO STEEL", billLineCount: 1464, qtyTotalReported: 99999, itemCategories: { steel: 1464 }, firstBillDate: "2014", lastBillDate: "2026" }] };
  const dir = buildDirectory({ costIndex, curated: [], hotelRegistry });
  assert.equal(dir.stats.hotelMerged, 1);
  const alro = dir.records.find((r) => r.vendor_id === "alro-steel");
  assert.equal(alro.erp_master.bill_line_count, 1464, "hotel ERP master merged");
  assert.equal(alro.erp_master.source, "hotel-erp-registry");
  assert.equal(alro.jm.spend, 519368, "charlie spend prior coexists with hotel master");
});

test("buildDirectory: extraSources (harvested) merge by id, tag source + source_tag", () => {
  const costIndex = { vendors: { "GRIGGS STEEL": { count: 5, spend: 100, categories: { material: 5 }, firstDate: "2020", lastDate: "2021" } } };
  const extraSources = [
    { name: "Griggs Steel", website: "https://www.griggssteel.com", vendor_type: "supplier", categories: ["material"], reach: "national", source_tag: "imts", verified: true },
    { name: "Brand New IMTS Co", website: "https://newco.example.com", vendor_type: "supplier", categories: ["tooling-consumable"], reach: "national", source_tag: "imts", verified: true },
    { name: "Unverified Shop", website: null, vendor_type: "machine-shop", categories: ["machine-shop"], reach: "local", source_tag: "thomasnet", verified: false },
  ];
  const dir = buildDirectory({ costIndex, curated: [], extraSources });
  assert.equal(dir.stats.total, 3, "Griggs merged with JM; 2 net-new harvested");
  const newco = dir.records.find((r) => r.vendor_id === normalizeVendorId("Brand New IMTS Co"));
  assert.equal(newco.source, "harvested");
  assert.equal(newco.source_tag, "imts");
  const unv = dir.records.find((r) => r.vendor_id === normalizeVendorId("Unverified Shop"));
  assert.equal(unv.verified, false, "null-website harvested record stays unverified (R12)");
  assert.equal(unv.website, null);
  assert.ok(dir.stats.bySourceTag.imts >= 1 && dir.stats.bySourceTag.thomasnet === 1, "source tags counted");
  // a harvested record with no name is skipped, not crashed
  assert.equal(buildDirectory({ costIndex: { vendors: {} }, curated: [], extraSources: [{ website: "https://x.com" }, null] }).stats.total, 0);
});

test("loadVendorSources: reads *.jsonl, skips malformed + non-jsonl (fail-soft)", () => {
  const dir = mkdtempSync(join(tmpdir(), "vsrc-"));
  writeFileSync(join(dir, "a.jsonl"), '{"name":"Real Co","website":"https://r.com"}\nnot json\n{"name":"Two"}\n');
  writeFileSync(join(dir, "ignore.txt"), '{"name":"Nope"}');
  const recs = loadVendorSources(dir);
  assert.equal(recs.length, 2, "2 valid lines from the .jsonl; malformed + .txt ignored");
  assert.equal(recs[0].name, "Real Co");
  assert.deepEqual(loadVendorSources("H:/nonexistent-vsrc-xyz"), [], "missing dir → []");
});

test("buildDirectory: defensive on missing/empty cost-index", () => {
  assert.equal(buildDirectory({ costIndex: null, curated: [] }).stats.total, 0);
  assert.equal(buildDirectory({ costIndex: {}, curated: [] }).stats.total, 0);
  assert.equal(buildDirectory({}).records.length, CURATED_SUPPLIERS.length, "no cost-index → curated only");
});

test("CURATED_SUPPLIERS: real catalog spanning all named vendor types, every entry well-formed", () => {
  assert.ok(CURATED_SUPPLIERS.length >= 120, `expanded supplier universe (got ${CURATED_SUPPLIERS.length})`);
  for (const c of CURATED_SUPPLIERS) {
    assert.ok(c.name && typeof c.name === "string", `name: ${JSON.stringify(c)}`);
    // website is https OR explicitly null (a flagged needs-verification entry like Tri-Tech)
    assert.ok(c.website === null || /^https:\/\//.test(c.website), `https-or-null website: ${c.name}`);
    if (c.website === null) assert.equal(c.verified, false, `null-website entry must be flagged unverified: ${c.name}`);
    assert.ok(Array.isArray(c.categories) && c.categories.length, `categories: ${c.name}`);
    assert.ok(["api", "catalog", "quote", "unknown"].includes(c.pricing_access), `pricing_access: ${c.name}`);
    if (c.reach) assert.ok(["global", "national", "regional", "local", "unknown"].includes(c.reach), `reach: ${c.name}`);
  }
  // every vendor type the operator named is represented (individual machine shops live in the
  // machine-shop-network registry; the curated directory carries the marketplace access-points)
  const types = new Set(CURATED_SUPPLIERS.map((c) => c.vendor_type || "supplier"));
  for (const t of ["machine-builder", "service", "marketplace", "reseller", "supplier"]) assert.ok(types.has(t), `type present: ${t}`);
  // category coverage for the operator's named axes (+ IMTS-tier axes added from the resources catalogs)
  const cats = new Set(CURATED_SUPPLIERS.flatMap((c) => c.categories));
  for (const cat of ["tool-holder", "fixturing", "coolant-lubricant", "machine-builder", "machine-shop", "material", "cam-software", "controls", "automation", "additive"]) assert.ok(cats.has(cat), `category present: ${cat}`);
  // reach tiers represented (national/global curated; regional dealers seeded)
  const reaches = new Set(CURATED_SUPPLIERS.map((c) => c.reach).filter(Boolean));
  for (const r of ["global", "national", "regional"]) assert.ok(reaches.has(r), `reach tier present: ${r}`);
  // resources-catalog-derived vendors are present (the ones we "missed")
  const names = new Set(CURATED_SUPPLIERS.map((c) => c.name));
  for (const n of ["M.A. Ford", "Ingersoll Cutting Tools", "Sumitomo Electric Carbide", "Tungaloy", "Orange Vise"]) assert.ok(names.has(n), `resources-catalog vendor present: ${n}`);
  // no duplicate vendor_ids in the curated set
  const ids = CURATED_SUPPLIERS.map((c) => normalizeVendorId(c.name));
  assert.equal(new Set(ids).size, ids.length, `no dup curated vendor_ids (dups: ${ids.filter((x, i) => ids.indexOf(x) !== i)})`);
});

test("renderDirectoryMd: stable digest shape", () => {
  const dir = buildDirectory({ costIndex: { vendors: {} }, curated: [{ name: "MSC Industrial Supply", website: "https://www.mscdirect.com", categories: ["tooling-consumable"], regions: ["US"], pricing_access: "api", has_api: true }] });
  const md = renderDirectoryMd(dir, "2026-05-29");
  assert.ok(md.includes("VENDOR-DIRECTORY"));
  assert.ok(md.includes("Pricing access"));
  assert.ok(md.includes("mscdirect.com"));
  assert.ok(md.includes("mustHumanVerify"));
});
