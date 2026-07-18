#!/usr/bin/env node
/**
 * Tests for lathe-tribal-corpus-discover.mjs -- slot:whiskey [U-W6-VISION]
 * Run: node scripts/lib/lathe-tribal-corpus-discover.test.mjs
 * R9: real-value asserts on the actual JM/resource filenames the corpus scan found.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isLathePdf, discoverLathePdfs, LATHE_PDF_ROOTS, LATHE_KEYWORDS, VENDOR_TURNING_BRANDS } from "./lathe-tribal-corpus-discover.mjs";

test("isLathePdf: accepts real lathe/turning PDFs found in the corpus", () => {
  const yes = [
    "korloy turning.pdf",
    "Siemens_Turning_CYCLE95_Stock Removal.pdf",
    "haas-lathe-ngc-operators-manual-2025.pdf",
    "G76 Threading Cycle for CNC Lathes (Fanuc).pdf",
    "schwanog-id-grooving-turning.pdf",
    "OSP-P200L-Macturn-Multus-Series-Operation-Manual-LE32-114-R4.pdf",
    "Okuma-OSP-P200L-Programming.pdf",
    "CNC Lathe Programming for Turning.pdf",
  ];
  for (const f of yes) assert.equal(isLathePdf(f), true, `expected lathe: ${f}`);
});

test("isLathePdf: rejects non-lathe / non-pdf (no dilution of lathe tribal)", () => {
  const no = [
    "milling-catalog.pdf",        // pure mill -> excluded
    "haas-mill-ngc-operators.pdf",// mill manual -> excluded
    "general-safety.pdf",         // generic -> excluded
    "korloy turning.txt",         // not a pdf
    "readme.md",
    "",
  ];
  for (const f of no) assert.equal(isLathePdf(f), false, `expected NOT lathe: ${JSON.stringify(f)}`);
});

test("isLathePdf: mill-specific docs excluded even when they match a lathe keyword (P1 fix)", () => {
  // 'Thread Milling' is a MILL op -- 'thread' would include it; 'milling' must veto it.
  assert.equal(isLathePdf("Helical Interpolation for Thread Milling, Holes, and Spiral Ramps.pdf"), false);
  assert.equal(isLathePdf("thread-milling-guide.pdf"), false);
  assert.equal(isLathePdf("face mill turning comparison.pdf"), false); // 'face mill' veto wins over 'turning'
});

test("isLathePdf: keeps GENUINE turning thread/boring catalogs (P1 fix -- no over-exclusion)", () => {
  assert.equal(isLathePdf("carmex-cmt-threading-inch.pdf"), true);      // threading (turning) -- substring 'thread'
  assert.equal(isLathePdf("criterion-boring-cutting-data.pdf"), true);  // boring bar (turning ID) -- word 'boring'
  assert.equal(isLathePdf("Threading 2018.1.pdf"), true);
  assert.equal(isLathePdf("InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf"), true); // mill-turn IS lathe
});

test("isLathePdf: word-boundary kills the 'boring' substring false-positive (P1 fix)", () => {
  assert.equal(isLathePdf("neighboring-parts.pdf"), false);  // 'boring' inside 'neighboring' -> not matched
});

test("isLathePdf: guards bad input", () => {
  assert.equal(isLathePdf(null), false);
  assert.equal(isLathePdf(undefined), false);
  assert.equal(isLathePdf(42), false);
});

test("discoverLathePdfs: filters mixed dir to lathe PDFs only, deduped + sorted", () => {
  const listFn = (root) => {
    if (root === "rootA") return [
      "rootA/korloy turning.pdf",
      "rootA/milling-catalog.pdf",        // dropped (mill)
      "rootA/haas-lathe-ngc-operators-manual-2025.pdf",
      "rootA/notes.txt",                  // dropped (not pdf)
    ];
    if (root === "rootB") return [
      "rootB/Siemens_Turning_CYCLE95_Stock Removal.pdf",
    ];
    return [];
  };
  const got = discoverLathePdfs(["rootA", "rootB"], listFn);
  assert.deepEqual(got, [
    "rootA/haas-lathe-ngc-operators-manual-2025.pdf",
    "rootA/korloy turning.pdf",
    "rootB/Siemens_Turning_CYCLE95_Stock Removal.pdf",
  ]);
});

test("discoverLathePdfs: a throwing root is skipped, other roots still contribute (fail-soft)", () => {
  const listFn = (root) => {
    if (root === "bad") throw new Error("permission denied");
    return ["ok/lathe-thread.pdf"];
  };
  const got = discoverLathePdfs(["bad", "good"], listFn);
  assert.deepEqual(got, ["ok/lathe-thread.pdf"]);
});

test("discoverLathePdfs: duplicate paths across roots are deduped (adversarial)", () => {
  const dup = "shared/turning.pdf";
  const listFn = () => [dup];
  const got = discoverLathePdfs(["a", "b", "c"], listFn);
  assert.deepEqual(got, [dup]);
});

test("discoverLathePdfs: empty/undefined roots -> [] (adversarial)", () => {
  assert.deepEqual(discoverLathePdfs([], () => ["x/turning.pdf"]), []);
  assert.deepEqual(discoverLathePdfs(undefined, () => ["x/turning.pdf"]), []);
});

test("isLathePdf: VENDOR arm includes turning-insert vendor general catalogs with no keyword (op 2026-06-28)", () => {
  // Real filenames from resources/MANUFACTURER_CATALOGS -- generic names, NO turning
  // keyword, but turning-insert/boring/grooving vendors whose catalogs carry the tips.
  const yes = [
    "korloy solid.pdf",                                  // Korloy -- 'solid' is not a turning keyword
    "Accupro 2013.pdf",                                  // Accupro -- general MRO incl turning inserts
    "cobra-carbide.pdf",                                 // Cobra Carbide -- turning + grooving inserts
    "BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf", // boring/toolholders
    "carmex-inch-catalog-2022.pdf",                      // Carmex -- threading/grooving turning
    "applitec-pro-line.pdf",                             // Applitec -- Swiss turning (no keyword)
    "Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf", // keyword path still works
  ];
  for (const f of yes) assert.equal(isLathePdf(f), true, `expected lathe (vendor/keyword): ${f}`);
});

test("isLathePdf: VENDOR arm does NOT dilute -- pure mill/drill/tap vendors stay excluded (adversarial)", () => {
  const no = [
    "guhring full catalog.pdf",   // drills/reamers -- NOT in brand list
    "OSG.pdf",                    // taps/drills -- NOT in brand list
    "MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf", // end mills/drills
    "Flash_Solid_catalog_INCH.pdf",  // solid end mills
    "2018 Rapidkut Catalog.pdf",  // end mills
    "data-flute.pdf",             // end mills
    "balax-tap-catalog-2016.pdf", // taps
  ];
  for (const f of no) assert.equal(isLathePdf(f), false, `expected NOT lathe (non-turning vendor): ${f}`);
});

test("isLathePdf: brand arm is WORD-BOUNDARY -- short brand tokens do NOT substring-match unrelated files (P2 hardening, scrutiny 3-of-3)", () => {
  // A short/dictionary-word brand ('seco','horn','kaiser','walter','dorian','criterion') must NOT
  // pull in an unrelated PDF where the token is only a substring of a larger word.
  const no = [
    "second-operation-drill-guide.pdf",   // 'seco' inside 'second' -> excluded
    "horner-plc-automation.pdf",          // 'horn' inside 'horner' -> excluded
    "kaiserslautern-shop-tour.pdf",       // 'kaiser' inside 'kaiserslautern' -> excluded
    "walterboro-facility-notes.pdf",      // 'walter' inside 'walterboro' -> excluded
    "criterion-channel-films.pdf",        // 'criterion' as unrelated word -> still word matches; see note
  ];
  // 'criterion-channel-films' DOES contain the delimited word 'criterion' -> it WOULD match by design
  // (criterion is a real turning/boring-bar brand); a delimited true-word match is intended, only the
  // SUBSTRING-of-a-larger-word false-positives are killed. So assert the substring cases only:
  for (const f of no.slice(0, 4)) assert.equal(isLathePdf(f), false, `word-boundary should exclude: ${f}`);
  // And the legit delimited brand catalogs STILL match after the word-boundary change (no over-exclusion):
  for (const f of ["korloy solid.pdf", "cobra-carbide.pdf", "BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf", "carmex-inch-catalog-2022.pdf", "Accupro 2013.pdf"]) {
    assert.equal(isLathePdf(f), true, `delimited brand must still match: ${f}`);
  }
});

test("isLathePdf: MILL_EXCLUDE veto beats a turning-vendor brand match (adversarial)", () => {
  // A turning vendor's explicitly-MILLING catalog must still be excluded.
  assert.equal(isLathePdf("sandvik-coromant-milling-catalog.pdf"), false);
  assert.equal(isLathePdf("kennametal end mill guide.pdf"), false);
});

test("constants: roots + keywords + vendor brands are frozen and non-empty", () => {
  assert.ok(LATHE_PDF_ROOTS.length >= 6);
  assert.ok(Object.isFrozen(LATHE_PDF_ROOTS));
  assert.ok(LATHE_KEYWORDS.includes("turning"));
  assert.ok(Object.isFrozen(LATHE_KEYWORDS));
  assert.ok(VENDOR_TURNING_BRANDS.includes("korloy"));
  assert.ok(VENDOR_TURNING_BRANDS.length >= 20);
  assert.ok(Object.isFrozen(VENDOR_TURNING_BRANDS));
  // Guard against dilution regressions: pure mill/drill vendors must never be added.
  for (const banned of ["guhring", "osg", "ma_ford", "rapidkut", "data-flute", "balax"]) {
    assert.ok(!VENDOR_TURNING_BRANDS.includes(banned), `mill/drill vendor leaked into brands: ${banned}`);
  }
});
