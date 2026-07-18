#!/usr/bin/env node
/**
 * harvest-thomasnet-shops.test.mjs — real-value assertions for the Thomasnet machine-shop harvester.
 * Run: node --test scripts/harvest-thomasnet-shops.test.mjs < /dev/null   (closed stdin)
 *
 * No toBeDefined stubs — every test parses a KNOWN sample and asserts CONCRETE field values that
 * would FAIL if the classification / reach / contract logic regressed (R9 — tests verify intent).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseThomasnetResult,
  classifyShopProcesses,
  inferReach,
  stateFromLocation,
  buildThomasnetSeed,
  EMBEDDED_SEED,
  SOURCE_TAG,
  PROCESS_CATEGORY_RULES,
} from "./harvest-thomasnet-shops.mjs";

// ── classifyShopProcesses ──────────────────────────────────────────────────────
test("classifyShopProcesses: milling + turning + EDM blob → all categories, machine-shop first", () => {
  const { categories, processes } = classifyShopProcesses(
    "5-axis CNC milling, multi-axis Swiss turning, wire EDM, CMM inspection"
  );
  assert.equal(categories[0], "machine-shop", "machine-shop must be first");
  assert.ok(categories.includes("inspection-quality"), "CMM → inspection-quality");
  assert.ok(processes.includes("milling"), "milling process detected");
  assert.ok(processes.includes("turning"), "turning process detected");
  assert.ok(processes.includes("edm"), "wire EDM → edm process");
  assert.ok(processes.includes("inspection"), "CMM → inspection process");
});

test("classifyShopProcesses: sparse/empty text still yields machine-shop (a job shop is a machine shop)", () => {
  const a = classifyShopProcesses("");
  assert.deepEqual(a.categories, ["machine-shop"]);
  assert.deepEqual(a.processes, []);
  const b = classifyShopProcesses(null);
  assert.deepEqual(b.categories, ["machine-shop"]);
});

test("classifyShopProcesses: grinding + sheet metal + additive map to distinct categories", () => {
  const { categories, processes } = classifyShopProcesses(
    "OD ID centerless grinding, sheet metal fabrication laser cutting press brake, DMLS additive 3d print"
  );
  assert.ok(categories.includes("additive"), "additive category");
  assert.ok(processes.includes("grinding"), "grinding process");
  assert.ok(processes.includes("sheet-metal/fab"), "sheet-metal/fab process");
  assert.ok(processes.includes("additive"), "additive process");
});

test("classifyShopProcesses: de-dupes categories (two milling phrases → one machine-shop)", () => {
  const { categories } = classifyShopProcesses("CNC milling and also vertical machining center VMC 3-axis");
  assert.equal(categories.filter((c) => c === "machine-shop").length, 1);
});

// ── inferReach ─────────────────────────────────────────────────────────────────
test("inferReach: nationwide → national, multi-state → regional, single location → local", () => {
  assert.equal(inferReach("serves customers nationwide across the US"), "national");
  assert.equal(inferReach("North America Europe Asia"), "national");
  assert.equal(inferReach("New England regional, serves Massachusetts Connecticut Rhode Island"), "regional");
  assert.equal(inferReach("Auburn Hills, MI"), "local", "single city/state → local default");
  assert.equal(inferReach(""), "local", "empty → local default");
});

// ── stateFromLocation ──────────────────────────────────────────────────────────
test("stateFromLocation: 'City, ST' → ST; no-comma → null", () => {
  assert.equal(stateFromLocation("San Antonio, TX"), "TX");
  assert.equal(stateFromLocation("Madison Heights, MI"), "MI");
  assert.equal(stateFromLocation("Michigan"), null, "no two-letter abbrev → null");
  assert.equal(stateFromLocation(null), null);
});

// ── parseThomasnetResult: full contract shape on a known listing ─────────────────
test("parseThomasnetResult: maps a real listing to the directory contract with correct values", () => {
  const rec = parseThomasnetResult({
    company: "Cox Manufacturing Company",
    location: "San Antonio, TX",
    certifications: "ISO 9001",
    capabilities: "Swiss screw machining, CNC turning, CNC milling, in-house wire EDM tooling",
    website: "https://www.coxmanufacturing.com/",
  });
  assert.equal(rec.name, "Cox Manufacturing Company");
  assert.equal(rec.website, "https://www.coxmanufacturing.com/");
  assert.equal(rec.vendor_type, "machine-shop");
  assert.equal(rec.categories[0], "machine-shop");
  assert.equal(rec.reach, "local", "single TX location, no coverage signal → local");
  assert.deepEqual(rec.regions, ["US"]);
  assert.equal(rec.pricing_access, "quote");
  assert.equal(rec.has_api, false);
  assert.equal(rec.verified, true, "real https website → verified");
  assert.equal(rec.source_tag, SOURCE_TAG);
  assert.ok(/turning/.test(rec.notes) && /milling/.test(rec.notes), "process summary in notes");
  assert.ok(/San Antonio, TX/.test(rec.notes), "location captured in notes");
});

test("parseThomasnetResult: nationwide coverage → reach national", () => {
  const rec = parseThomasnetResult({
    company: "XACT Wire EDM Corporation",
    location: "Schaumburg, IL",
    capabilities: "wire EDM contract services",
    website: "https://www.xactedm.com/",
    coverage: "nationwide",
  });
  assert.equal(rec.reach, "national");
  assert.ok(rec.categories.includes("machine-shop"));
});

// ── R12: no website → website:null + verified:false + flagged, NEVER a guessed domain ──
test("parseThomasnetResult: R12 — missing website → null + verified:false + verify-flag note", () => {
  const rec = parseThomasnetResult({
    company: "Some Unconfirmed Job Shop",
    location: "Cleveland, OH",
    capabilities: "CNC milling turning",
    website: "", // no confirmed site
  });
  assert.equal(rec.website, null, "no guessed domain — website is null");
  assert.equal(rec.verified, false, "unverified without a real website");
  assert.ok(/NO CONFIRMED WEBSITE/.test(rec.notes), "flagged for verification");
});

test("parseThomasnetResult: rejects a non-http garbage 'website' (no fabricated URL leaks through)", () => {
  const rec = parseThomasnetResult({
    company: "Garbage URL Shop",
    location: "Detroit, MI",
    capabilities: "milling",
    website: "call us for a quote",
  });
  assert.equal(rec.website, null);
  assert.equal(rec.verified, false);
});

test("parseThomasnetResult: unnamed listing → null (never emit an anonymous shop)", () => {
  assert.equal(parseThomasnetResult({ company: "", website: "https://x.com" }), null);
  assert.equal(parseThomasnetResult(null), null);
});

// ── buildThomasnetSeed + the embedded real-shop seed ─────────────────────────────
test("buildThomasnetSeed: drops only unnamed rows, keeps the rest", () => {
  const recs = buildThomasnetSeed([
    { company: "Real Shop A", website: "https://a.com", capabilities: "milling" },
    { company: "", website: "https://b.com" }, // dropped
    { company: "Real Shop B", website: "https://c.com", capabilities: "turning" },
  ]);
  assert.equal(recs.length, 2);
  assert.deepEqual(recs.map((r) => r.name), ["Real Shop A", "Real Shop B"]);
});

test("buildThomasnetSeed([]) and non-array → []", () => {
  assert.deepEqual(buildThomasnetSeed([]), []);
  assert.deepEqual(buildThomasnetSeed(null), []);
  assert.deepEqual(buildThomasnetSeed("nope"), []);
});

test("EMBEDDED_SEED: every record is a verified machine-shop with a real https website + contract fields", () => {
  const recs = buildThomasnetSeed(EMBEDDED_SEED);
  assert.ok(recs.length >= 20, `expected >=20 seeded shops, got ${recs.length}`);
  for (const r of recs) {
    assert.equal(r.vendor_type, "machine-shop", `${r.name}: vendor_type`);
    assert.equal(r.source_tag, "thomasnet", `${r.name}: source_tag`);
    assert.deepEqual(r.regions, ["US"], `${r.name}: regions`);
    assert.equal(r.has_api, false, `${r.name}: has_api`);
    assert.equal(r.pricing_access, "quote", `${r.name}: pricing_access`);
    assert.ok(r.categories.includes("machine-shop"), `${r.name}: has machine-shop category`);
    assert.ok(["national", "regional", "local"].includes(r.reach), `${r.name}: valid reach`);
    // Seed shops were all web-confirmed → real https site + verified:true
    assert.ok(/^https:\/\//.test(r.website), `${r.name}: real https website`);
    assert.equal(r.verified, true, `${r.name}: verified`);
  }
});

test("EMBEDDED_SEED: at least one national, one regional, and one local tier represented", () => {
  const recs = buildThomasnetSeed(EMBEDDED_SEED);
  const tiers = new Set(recs.map((r) => r.reach));
  assert.ok(tiers.has("national"), "has a national-tier shop");
  assert.ok(tiers.has("regional"), "has a regional-tier shop");
  assert.ok(tiers.has("local"), "has a local-tier shop");
});

test("PROCESS_CATEGORY_RULES: every rule emits an allowed directory category", () => {
  const allowed = new Set([
    "machine-shop", "inspection-quality", "additive", "tooling-consumable",
    "material", "tool-holder", "fixturing", "coolant-lubricant", "controls",
    "cam-software", "automation", "misc",
  ]);
  for (const [, cat] of PROCESS_CATEGORY_RULES) {
    assert.ok(allowed.has(cat), `rule category '${cat}' must be in the directory vocabulary`);
  }
});
