#!/usr/bin/env node
/**
 * Tests for harvest-imts-exhibitors.mjs — real-value assertions (no toBeDefined stubs).
 * Run: node --test scripts/harvest-imts-exhibitors.test.mjs < /dev/null
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyImtsCategory,
  parseExhibitorRow,
  buildImtsSeed,
  SEED,
  CATEGORY_VOCAB,
  FULL_HARVEST_PATH,
} from "./harvest-imts-exhibitors.mjs";

// ---------------------------------------------------------------------------------------------------
test("classifyImtsCategory maps IMTS product labels to our vocabulary", () => {
  assert.equal(classifyImtsCategory("Cutting Tools"), "tooling-consumable");
  assert.equal(classifyImtsCategory("End Mills"), "tooling-consumable");
  assert.equal(classifyImtsCategory("Workholding"), "fixturing");
  assert.equal(classifyImtsCategory("Vises"), "fixturing");
  assert.equal(classifyImtsCategory("Chucks, Rotary Tables"), "fixturing");
  assert.equal(classifyImtsCategory("Metalworking Fluids"), "coolant-lubricant");
  assert.equal(classifyImtsCategory("Coolant Filtration"), "coolant-lubricant");
  assert.equal(classifyImtsCategory("CNC Controls"), "controls");
  assert.equal(classifyImtsCategory("CAD/CAM Software"), "cam-software");
  assert.equal(classifyImtsCategory("CMM"), "inspection-quality");
  assert.equal(classifyImtsCategory("Metrology"), "inspection-quality");
  assert.equal(classifyImtsCategory("Machine Tools"), "machine-builder");
  assert.equal(classifyImtsCategory("Automation"), "automation");
  assert.equal(classifyImtsCategory("Robots"), "automation");
  assert.equal(classifyImtsCategory("Additive"), "additive");
  assert.equal(classifyImtsCategory("3D Printing"), "additive");
});

test("classifyImtsCategory orders specific phrases before broad ones", () => {
  // "Tool Holders" must NOT fall through to tooling-consumable
  assert.equal(classifyImtsCategory("Tool Holders"), "tool-holder");
  assert.equal(classifyImtsCategory("Shrink Fit"), "tool-holder");
  assert.equal(classifyImtsCategory("Collets"), "tool-holder");
  // "Metalworking Fluids" must NOT fall through to material
  assert.equal(classifyImtsCategory("Metalworking Fluids"), "coolant-lubricant");
  // raw material still resolves to material
  assert.equal(classifyImtsCategory("Tool Steel"), "material");
  assert.equal(classifyImtsCategory("Bar Stock"), "material");
});

test("classifyImtsCategory edge cases: null/empty/unknown -> misc", () => {
  assert.equal(classifyImtsCategory(null), "misc");
  assert.equal(classifyImtsCategory(undefined), "misc");
  assert.equal(classifyImtsCategory(""), "misc");
  assert.equal(classifyImtsCategory("   "), "misc");
  assert.equal(classifyImtsCategory("Catering Services"), "misc");
});

// ---------------------------------------------------------------------------------------------------
test("parseExhibitorRow maps a known row to the full output record", () => {
  const rec = parseExhibitorRow({
    company: "Haimer USA",
    website: "https://www.haimer-usa.com",
    categories: "Tool Holders, Shrink Fit",
    booth: "431510",
    reach: "global",
    regions: ["US", "EU"],
    pricing_access: "quote",
    verified: false,
    notes: "IMTS 2024 booth #431510",
  });
  assert.equal(rec.name, "Haimer USA");
  assert.equal(rec.website, "https://www.haimer-usa.com");
  assert.equal(rec.vendor_type, "supplier");
  assert.deepEqual(rec.categories, ["tool-holder"]);
  assert.equal(rec.reach, "global");
  assert.deepEqual(rec.regions, ["US", "EU"]);
  assert.equal(rec.pricing_access, "quote");
  assert.equal(rec.has_api, false);
  assert.equal(rec.verified, false); // verified:false explicit + has a website
  assert.equal(rec.source_tag, "imts");
  assert.equal(rec.notes, "IMTS 2024 booth #431510");
});

test("parseExhibitorRow: verified:true requires a real https website", () => {
  // asserted verified:true WITH a website -> stays true
  const ok = parseExhibitorRow({ company: "Mazak", website: "https://www.mazakusa.com", categories: "Machine Tools", vendor_type: "machine-builder", verified: true });
  assert.equal(ok.verified, true);
  assert.equal(ok.website, "https://www.mazakusa.com");

  // asserted verified:true but NO valid website -> downgraded to false + auto-note
  const downgraded = parseExhibitorRow({ company: "Mystery Co", website: "not-a-url", categories: "Cutting Tools", verified: true });
  assert.equal(downgraded.verified, false);
  assert.equal(downgraded.website, null);
  assert.equal(downgraded.notes, "exhibitor confirmed; website needs human verification");
});

test("parseExhibitorRow: non-https website becomes null", () => {
  const rec = parseExhibitorRow({ company: "Foo Tool", website: "http://insecure.example.com", categories: "Cutting Tools" });
  assert.equal(rec.website, null);
});

test("parseExhibitorRow: machine-builder vendor_type inferred from category", () => {
  const rec = parseExhibitorRow({ company: "Some Builder", website: "https://example.com", categories: "Machine Tools", verified: true });
  assert.equal(rec.vendor_type, "machine-builder");
  assert.deepEqual(rec.categories, ["machine-builder"]);
});

test("parseExhibitorRow: array categories de-duped, misc dropped when a real cat exists", () => {
  const rec = parseExhibitorRow({
    company: "Multi Cat Co",
    website: "https://example.com",
    categories: ["Cutting Tools", "Catering Services", "End Mills"],
    verified: true,
  });
  // "Cutting Tools" + "End Mills" both -> tooling-consumable (deduped to one); "Catering" -> misc dropped
  assert.deepEqual(rec.categories, ["tooling-consumable"]);
});

test("parseExhibitorRow: defaults applied when fields omitted", () => {
  const rec = parseExhibitorRow({ company: "Bare Co", categories: "Cutting Tools" });
  assert.equal(rec.website, null);
  assert.equal(rec.reach, "national");
  assert.deepEqual(rec.regions, ["US"]);
  assert.equal(rec.pricing_access, "quote");
  assert.equal(rec.has_api, false);
  assert.equal(rec.verified, false);
  assert.equal(rec.notes, "exhibitor confirmed; website needs human verification");
});

test("parseExhibitorRow: returns null for nameless/garbage rows", () => {
  assert.equal(parseExhibitorRow(null), null);
  assert.equal(parseExhibitorRow({}), null);
  assert.equal(parseExhibitorRow({ company: "   " }), null);
  assert.equal(parseExhibitorRow("just a string"), null);
});

// ---------------------------------------------------------------------------------------------------
test("buildImtsSeed produces a clean record set from the embedded SEED", () => {
  const recs = buildImtsSeed();
  assert.ok(recs.length >= 50, `expected >=50 seed records, got ${recs.length}`);

  // every record conforms to the contract
  for (const r of recs) {
    assert.equal(typeof r.name, "string");
    assert.ok(r.name.length > 0);
    assert.ok(r.website === null || /^https:\/\//.test(r.website), `bad website on ${r.name}: ${r.website}`);
    assert.ok(["supplier", "machine-builder", "service", "reseller", "marketplace", "machine-shop"].includes(r.vendor_type), `bad vendor_type on ${r.name}`);
    assert.ok(Array.isArray(r.categories) && r.categories.length > 0);
    for (const c of r.categories) assert.ok(CATEGORY_VOCAB.includes(c), `bad category ${c} on ${r.name}`);
    assert.ok(["global", "national", "regional", "local"].includes(r.reach), `bad reach on ${r.name}`);
    assert.ok(Array.isArray(r.regions) && r.regions.length > 0);
    assert.ok(["api", "catalog", "quote", "unknown"].includes(r.pricing_access));
    assert.equal(typeof r.has_api, "boolean");
    assert.equal(typeof r.verified, "boolean");
    assert.equal(r.source_tag, "imts");
    // R12: verified records MUST have a real website
    if (r.verified) assert.ok(r.website !== null, `verified record ${r.name} has null website`);
  }
});

test("buildImtsSeed: known anchor vendors present with correct shape", () => {
  const recs = buildImtsSeed();
  const byName = Object.fromEntries(recs.map((r) => [r.name, r]));

  const mazak = byName["Mazak"];
  assert.ok(mazak, "Mazak missing");
  assert.equal(mazak.vendor_type, "machine-builder");
  assert.equal(mazak.website, "https://www.mazakusa.com");
  assert.equal(mazak.verified, true);

  const blaser = byName["Blaser Swisslube"];
  assert.ok(blaser, "Blaser Swisslube missing");
  assert.deepEqual(blaser.categories, ["coolant-lubricant"]);

  const renishaw = byName["Renishaw"];
  assert.ok(renishaw, "Renishaw missing");
  assert.deepEqual(renishaw.categories, ["inspection-quality"]); // "Probing, Metrology" -> inspection-quality
});

test("buildImtsSeed spans the full category spectrum", () => {
  const recs = buildImtsSeed();
  const cats = new Set(recs.flatMap((r) => r.categories));
  for (const need of ["tooling-consumable", "tool-holder", "fixturing", "coolant-lubricant", "controls", "cam-software", "inspection-quality", "automation", "additive", "machine-builder"]) {
    assert.ok(cats.has(need), `seed missing category coverage: ${need}`);
  }
});

test("SEED has no fabricated-looking websites (https or absent) and FULL_HARVEST_PATH documented", () => {
  for (const row of SEED) {
    if (row.website != null) assert.ok(/^https:\/\//.test(row.website), `seed row ${row.company} has non-https website ${row.website}`);
  }
  assert.match(FULL_HARVEST_PATH.directoryUrl, /directory\.imts\.com/);
  assert.equal(FULL_HARVEST_PATH.approxExhibitors, 1737);
});
