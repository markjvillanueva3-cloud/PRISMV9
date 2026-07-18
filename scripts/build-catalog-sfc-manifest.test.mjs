/**
 * Tests for build-catalog-sfc-manifest.mjs — VENDOR-NETWORK-MS0/U-VDN-SFC-MANIFEST.
 * Real-value assertions on S/F-bearing classification, ingestion state, priority logic.
 * Run: node --test scripts/build-catalog-sfc-manifest.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSpeedFeedBearing, ingestionState, targetDataFile, buildSfcManifest, renderSfcManifestMd, KNOWN_INGESTED,
} from "./build-catalog-sfc-manifest.mjs";

test("isSpeedFeedBearing: only cutting-tool makers carry SFM/IPT tables", () => {
  assert.equal(isSpeedFeedBearing({ name: "OSG", categories: ["tooling-consumable"] }), true);
  assert.equal(isSpeedFeedBearing({ name: "Sandvik Coromant", categories: ["tooling-consumable"] }), true);
  assert.equal(isSpeedFeedBearing({ name: "BIG Daishowa", categories: ["tool-holder"] }), false, "holders have no S/F edge");
  assert.equal(isSpeedFeedBearing({ name: "Kurt Workholding", categories: ["fixturing"] }), false);
  assert.equal(isSpeedFeedBearing({ name: "Blaser Swisslube", categories: ["coolant-lubricant"] }), false);
  assert.equal(isSpeedFeedBearing({ name: "Alro Steel", categories: ["material"] }), false);
  assert.equal(isSpeedFeedBearing({ name: "Haas Automation", categories: ["machine-builder"] }), false);
  // a holder-named line mis-tagged tooling-consumable (single cat) is excluded
  assert.equal(isSpeedFeedBearing({ name: "Some Collet Holder", categories: ["tooling-consumable"] }), false);
  assert.equal(isSpeedFeedBearing(null), false);
  assert.equal(isSpeedFeedBearing({ categories: [] }), false);
});

test("ingestionState: known src/data vendors flagged ingested; others verify (R12)", () => {
  assert.deepEqual(ingestionState("OSG"), { ingested: true, verify: false, match: "osg" });
  assert.equal(ingestionState("Kennametal").ingested, true);
  assert.equal(ingestionState("Sandvik Coromant").ingested, true, "sandvik tool catalog ingested");
  const acc = ingestionState("Accupro");
  assert.equal(acc.ingested, false);
  assert.equal(acc.verify, true, "unconfirmed → oscar verifies before extracting");
  assert.equal(ingestionState("Allied Machine & Engineering").ingested, false);
});

test("targetDataFile: vendor → src/data slug", () => {
  assert.equal(targetDataFile("M.A. Ford"), "mcp-server/src/data/m-a-ford-speed-feed-data.ts");
  assert.equal(targetDataFile("Walter"), "mcp-server/src/data/walter-speed-feed-data.ts");
  assert.ok(targetDataFile("Korloy").endsWith("korloy-speed-feed-data.ts"));
});

test("buildSfcManifest: priority — high(on-disk+gap) / low(ingested) / medium(pull) / skip(non-tool)", () => {
  const directory = [
    { name: "Walter", vendor_id: "walter", categories: ["tooling-consumable"], reach: "global", website: "https://walter-tools.com" },        // on-disk + not ingested → high
    { name: "OSG", vendor_id: "osg", categories: ["tooling-consumable"], reach: "global", website: "https://osgtool.com" },                    // ingested → low
    { name: "Korloy", vendor_id: "korloy", categories: ["tooling-consumable"], reach: "global", website: "https://korloy.com" },               // not on-disk, not ingested → medium (or high if catalog present)
    { name: "Kurt Workholding", vendor_id: "kurt", categories: ["fixturing"], reach: "national", website: "https://kurt.com" },                // skip (filtered out)
  ];
  const catalogVendors = [{ name: "Walter" }, { name: "Korloy" }]; // both have catalogs on disk
  const man = buildSfcManifest(directory, catalogVendors);
  assert.equal(man.stats.total, 3, "Kurt (fixturing) excluded — not S/F-bearing");
  const walter = man.records.find((r) => r.vendor_id === "walter");
  assert.equal(walter.extraction_priority, "high", "on-disk + not ingested");
  assert.equal(walter.catalog_on_disk, true);
  const osg = man.records.find((r) => r.vendor_id === "osg");
  assert.equal(osg.extraction_priority, "low", "already ingested → augment only");
  assert.equal(osg.already_ingested, true);
  const korloy = man.records.find((r) => r.vendor_id === "korloy");
  assert.equal(korloy.extraction_priority, "high", "Korloy catalog present on disk + not ingested");
  // sorted high-first
  assert.equal(man.records[man.records.length - 1].extraction_priority, "low", "low sorts last");
  // every record names the canonical ingestion + schema
  assert.ok(man.records.every((r) => r.ingestion.includes("addTools")));
  assert.ok(man.records.every((r) => Array.isArray(r.iso_groups_expected) && r.iso_groups_expected.length === 6));
});

test("buildSfcManifest: medium when not-on-disk + not-ingested (pull from web)", () => {
  const man = buildSfcManifest(
    [{ name: "Some New Cutter Co", vendor_id: "some-new-cutter", categories: ["tooling-consumable"], website: "https://x.com" }],
    [] // no catalogs on disk
  );
  assert.equal(man.records[0].extraction_priority, "medium", "not on disk → pull then extract");
  assert.equal(man.records[0].verify_ingestion, true);
});

test("buildSfcManifest: defensive on null/empty", () => {
  assert.equal(buildSfcManifest(null).stats.total, 0);
  assert.equal(buildSfcManifest([]).records.length, 0);
});

test("KNOWN_INGESTED + renderSfcManifestMd: real list + stable digest", () => {
  assert.ok(KNOWN_INGESTED.includes("sandvik") && KNOWN_INGESTED.includes("kennametal"));
  const man = buildSfcManifest([{ name: "Walter", vendor_id: "walter", categories: ["tooling-consumable"], reach: "global" }], [{ name: "Walter" }]);
  const md = renderSfcManifestMd(man, "2026-05-29");
  assert.ok(md.includes("CATALOG → SPEED-FEED-CALCULATOR"));
  assert.ok(md.includes("HIGH priority"));
  assert.ok(md.includes("ToolCatalogEngine.addTools"));
  assert.ok(md.includes("ManufacturerSpeedFeed"));
});
