/**
 * catalog-storage-paths.test.mjs — node:test suite for the storage-path helpers.
 *
 * Run: node --test scripts/lib/catalog-storage-paths.test.mjs
 *
 * Per CLAUDE.md test-legitimacy rule: every assertion checks the SUT's real output
 * against an exact expected string or thrown-error class. No toBeTruthy stubs.
 *
 * @since TOOL-CATALOG-INGEST-MS0/U-TCI-A3 (2026-05-24, slot juliett)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REPO_ROOT,
  PATHS,
  slugify,
  stepPathFor,
  extractedJsonPathFor,
  pdfPathFor,
  datasheetPdfPathFor,
  parseStepPath,
} from "./catalog-storage-paths.mjs";

// ===========================================================================
// REPO_ROOT + PATHS (frozen-constant sanity)
// ===========================================================================

test("REPO_ROOT is the canonical H:/prism POSIX path", () => {
  assert.equal(REPO_ROOT, "H:/prism");
});

test("PATHS object is frozen (no accidental mutation by callers)", () => {
  assert.ok(Object.isFrozen(PATHS), "PATHS must be frozen");
});

test("PATHS.uploadedPdfsDir points at the existing MANUFACTURER_CATALOGS/uploaded folder", () => {
  assert.equal(PATHS.uploadedPdfsDir, "H:/prism/resources/MANUFACTURER_CATALOGS/uploaded");
});

test("PATHS.stepRootDir + datasheetsRootDir are siblings under MANUFACTURER_CATALOGS", () => {
  assert.equal(PATHS.stepRootDir, "H:/prism/resources/MANUFACTURER_CATALOGS/step");
  assert.equal(PATHS.datasheetsRootDir, "H:/prism/resources/MANUFACTURER_CATALOGS/datasheets");
});

test("PATHS.extractionsDir points at the existing empty catalog-extractions dir", () => {
  assert.equal(PATHS.extractionsDir, "H:/prism/mcp-server/data/catalog-extractions");
});

test("PATHS.manifestPath + inventoryPath point at existing files", () => {
  assert.equal(PATHS.manifestPath, "H:/prism/mcp-server/data/vendor-catalog-manifest.json");
  assert.equal(PATHS.inventoryPath, "H:/prism/mcp-server/data/tool-catalog-inventory.json");
});

// ===========================================================================
// slugify — must byte-match iter15 generate-vendor-catalog-features.mjs
// ===========================================================================

test("slugify: lowercases and dashifies non-alphanumeric runs", () => {
  assert.equal(slugify("Tungaloy GC_2023-2024"), "tungaloy-gc-2023-2024");
  assert.equal(slugify("Big Daishowa Co., Ltd."), "big-daishowa-co-ltd");
  assert.equal(slugify("MA Ford"), "ma-ford");
});

test("slugify: handles unicode by collapsing non-ASCII to single dash", () => {
  assert.equal(slugify("Sandvik® Coromant™"), "sandvik-coromant");
  assert.equal(slugify("Vögele"), "v-gele");
});

test("slugify: trims leading/trailing dashes from special-char-only segments", () => {
  assert.equal(slugify("---abc---"), "abc");
  assert.equal(slugify("...&...test...&..."), "test");
});

test("slugify: returns empty string for empty/whitespace/special-only input", () => {
  assert.equal(slugify(""), "");
  assert.equal(slugify("   "), "");
  assert.equal(slugify("---"), "");
  assert.equal(slugify("***"), "");
});

test("slugify: non-string inputs return empty (defensive)", () => {
  assert.equal(slugify(null), "");
  assert.equal(slugify(undefined), "");
  assert.equal(slugify(42), "");
  assert.equal(slugify({}), "");
});

test("slugify: caps output at 60 chars (matches iter15 generator)", () => {
  const long = "a".repeat(120);
  const out = slugify(long);
  assert.equal(out.length, 60);
  assert.equal(out, "a".repeat(60));
});

test("slugify: 60-char boundary is exact (61st char dropped)", () => {
  const sixtyOne = "a".repeat(61);
  assert.equal(slugify(sixtyOne).length, 60);
});

// ===========================================================================
// stepPathFor
// ===========================================================================

test("stepPathFor: builds POSIX path under stepRootDir with slugified vendor + part", () => {
  assert.equal(
    stepPathFor("Misumi", "MSCBR8-10-100"),
    "H:/prism/resources/MANUFACTURER_CATALOGS/step/misumi/mscbr8-10-100.step",
  );
});

test("stepPathFor: handles vendor with periods/commas", () => {
  assert.equal(
    stepPathFor("Big Daishowa Co., Ltd.", "BBT40-CTH13-90"),
    "H:/prism/resources/MANUFACTURER_CATALOGS/step/big-daishowa-co-ltd/bbt40-cth13-90.step",
  );
});

test("stepPathFor: throws TypeError on empty vendor (silent empty-path is an R12 violation)", () => {
  assert.throws(() => stepPathFor("", "PART-123"), TypeError);
  assert.throws(() => stepPathFor("---", "PART-123"), TypeError);
});

test("stepPathFor: throws TypeError on empty partNumber", () => {
  assert.throws(() => stepPathFor("Sandvik", ""), TypeError);
  assert.throws(() => stepPathFor("Sandvik", "***"), TypeError);
});

// ===========================================================================
// extractedJsonPathFor
// ===========================================================================

test("extractedJsonPathFor: matches vendor-catalog-manifest targetJson convention", () => {
  assert.equal(
    extractedJsonPathFor("Iscar", "rotating"),
    "H:/prism/mcp-server/data/catalog-extractions/iscar-rotating-extracted.json",
  );
  assert.equal(
    extractedJsonPathFor("Tungaloy", "general"),
    "H:/prism/mcp-server/data/catalog-extractions/tungaloy-general-extracted.json",
  );
});

test("extractedJsonPathFor: slugifies both arguments consistently", () => {
  assert.equal(
    extractedJsonPathFor("Big Daishowa", "Tool Holders"),
    "H:/prism/mcp-server/data/catalog-extractions/big-daishowa-tool-holders-extracted.json",
  );
});

test("extractedJsonPathFor: throws on empty vendor or type", () => {
  assert.throws(() => extractedJsonPathFor("", "rotating"), TypeError);
  assert.throws(() => extractedJsonPathFor("Iscar", ""), TypeError);
});

// ===========================================================================
// pdfPathFor (passthrough — no slugification)
// ===========================================================================

test("pdfPathFor: preserves verbatim filename (audit pattern table needs exact match)", () => {
  assert.equal(
    pdfPathFor("GC_2023-2024_US_Tooling.pdf"),
    "H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Tooling.pdf",
  );
  assert.equal(
    pdfPathFor("Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf"),
    "H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf",
  );
});

test("pdfPathFor: throws TypeError on empty or non-string filename", () => {
  assert.throws(() => pdfPathFor(""), TypeError);
  assert.throws(() => pdfPathFor(null), TypeError);
  assert.throws(() => pdfPathFor(undefined), TypeError);
  assert.throws(() => pdfPathFor(42), TypeError);
});

// ===========================================================================
// datasheetPdfPathFor
// ===========================================================================

test("datasheetPdfPathFor: builds POSIX path under datasheetsRootDir", () => {
  assert.equal(
    datasheetPdfPathFor("Sandvik", "R390-11T308M-PM-1130"),
    "H:/prism/resources/MANUFACTURER_CATALOGS/datasheets/sandvik/r390-11t308m-pm-1130.pdf",
  );
});

test("datasheetPdfPathFor: throws on empty inputs", () => {
  assert.throws(() => datasheetPdfPathFor("", "PART"), TypeError);
  assert.throws(() => datasheetPdfPathFor("Sandvik", ""), TypeError);
});

// ===========================================================================
// parseStepPath — round-trip with stepPathFor
// ===========================================================================

test("parseStepPath: recovers (vendorSlug, partSlug) from a stepPathFor output", () => {
  const path = stepPathFor("Misumi", "MSCBR8-10-100");
  const parsed = parseStepPath(path);
  assert.deepEqual(parsed, { vendorSlug: "misumi", partSlug: "mscbr8-10-100" });
});

test("parseStepPath: returns null for paths not under stepRootDir", () => {
  assert.equal(parseStepPath("H:/prism/some/other/path.step"), null);
  assert.equal(parseStepPath("/etc/passwd.step"), null);
});

test("parseStepPath: returns null when nesting depth is wrong", () => {
  // Missing vendor subdir
  assert.equal(parseStepPath(`${PATHS.stepRootDir}/orphan.step`), null);
  // Extra nesting
  assert.equal(parseStepPath(`${PATHS.stepRootDir}/sandvik/sub/part.step`), null);
});

test("parseStepPath: returns null for non-.step extensions", () => {
  assert.equal(parseStepPath(`${PATHS.stepRootDir}/sandvik/part.stp`), null);
  assert.equal(parseStepPath(`${PATHS.stepRootDir}/sandvik/part.pdf`), null);
  assert.equal(parseStepPath(`${PATHS.stepRootDir}/sandvik/part`), null);
});

test("parseStepPath: handles Windows backslash paths (normalizes to forward)", () => {
  const winPath = "H:\\prism\\resources\\MANUFACTURER_CATALOGS\\step\\misumi\\mscbr8-10-100.step";
  const parsed = parseStepPath(winPath);
  assert.deepEqual(parsed, { vendorSlug: "misumi", partSlug: "mscbr8-10-100" });
});

test("parseStepPath: returns null for null, undefined, empty input", () => {
  assert.equal(parseStepPath(null), null);
  assert.equal(parseStepPath(undefined), null);
  assert.equal(parseStepPath(""), null);
  assert.equal(parseStepPath(42), null);
});

// ===========================================================================
// Cross-function invariant — all path builders agree on slug rules
// ===========================================================================

test("invariant: stepPathFor + datasheetPdfPathFor + extractedJsonPathFor share slug rules", () => {
  const vendor = "Tungaloy GC_2023-2024";
  const partNo = "ETPN16T308PDPRE-LT-AH725";
  const expectedSlugV = "tungaloy-gc-2023-2024";
  const expectedSlugP = "etpn16t308pdpre-lt-ah725";

  assert.ok(stepPathFor(vendor, partNo).includes(`/${expectedSlugV}/`));
  assert.ok(stepPathFor(vendor, partNo).endsWith(`/${expectedSlugP}.step`));

  assert.ok(datasheetPdfPathFor(vendor, partNo).includes(`/${expectedSlugV}/`));
  assert.ok(datasheetPdfPathFor(vendor, partNo).endsWith(`/${expectedSlugP}.pdf`));

  assert.ok(extractedJsonPathFor(vendor, "general").endsWith(`/${expectedSlugV}-general-extracted.json`));
});
