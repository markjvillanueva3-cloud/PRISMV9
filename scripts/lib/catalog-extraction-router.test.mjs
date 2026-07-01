// node --test scripts/lib/catalog-extraction-router.test.mjs
// Real-value assertions on the catalog extraction router + math/science schema.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXTRACTORS, MATH_SCIENCE_SCHEMA, routeCatalog, coverageGaps, buildRoutingRegistry } from "./catalog-extraction-router.mjs";

test("EXTRACTORS — every entry names a real script + captures + when (no stubs)", () => {
  assert.ok(EXTRACTORS.length >= 6);
  for (const e of EXTRACTORS) {
    assert.ok(e.id && e.script && e.lang, `extractor missing id/script/lang: ${JSON.stringify(e)}`);
    assert.ok(Array.isArray(e.captures) && e.captures.length > 0, `${e.id} has no captures`);
    assert.ok(e.when && e.when.length > 10, `${e.id} has no when-clause`);
  }
  // the load-bearing existing tools must be present (use-what-we-built)
  const ids = EXTRACTORS.map((e) => e.id);
  for (const must of ["camelot-tables", "per-vendor-pymupdf", "ollama-vision-ocr", "lima-pypdf-page", "python-batch-harness", "cutting-data-enricher"]) {
    assert.ok(ids.includes(must), `missing extractor ${must}`);
  }
});

test("routeCatalog — known vendor routes to the hand-tuned pymupdf parser first", () => {
  const r = routeCatalog({ vendorKnown: true, hasCleanTables: true });
  assert.equal(r[0].id, "per-vendor-pymupdf");
});

test("routeCatalog — unknown + clean tables routes to camelot", () => {
  const r = routeCatalog({ hasCleanTables: true });
  assert.equal(r[0].id, "camelot-tables");
});

test("routeCatalog — scanned routes to ollama vision OCR", () => {
  const r = routeCatalog({ isScanned: true });
  assert.ok(r.some((s) => s.id === "ollama-vision-ocr"));
});

test("routeCatalog — triageOnly returns ONLY the fast pdftotext pass (early return)", () => {
  const r = routeCatalog({ triageOnly: true });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "batch-pdf-pdftotext");
});

test("routeCatalog — bulk + enrich chains the batch harness + enricher", () => {
  const r = routeCatalog({ bulk: true, hasCleanTables: true, postExtractEnrich: true });
  const ids = r.map((s) => s.id);
  assert.ok(ids.includes("python-batch-harness"));
  assert.ok(ids.includes("cutting-data-enricher"));
  assert.ok(ids.includes("camelot-tables"));
});

test("routeCatalog — empty signal falls back to vision OCR (never empty plan)", () => {
  const r = routeCatalog({});
  assert.ok(r.length >= 1);
  assert.equal(r[r.length - 1].id, "ollama-vision-ocr");
});

test("MATH_SCIENCE_SCHEMA — covers the full physics superset (not just vc/fz)", () => {
  for (const g of ["cutting_params", "tool_material", "coating", "geometry", "material_physics", "conditions", "limits"]) {
    assert.ok(MATH_SCIENCE_SCHEMA[g], `missing schema group ${g}`);
  }
  // each non-identity group names the equations it feeds + the domains it compounds across
  for (const [g, spec] of Object.entries(MATH_SCIENCE_SCHEMA)) {
    if (g === "identity") continue;
    assert.ok(Array.isArray(spec.equations) && spec.equations.length > 0, `${g} names no equations`);
    assert.ok(Array.isArray(spec.domains) && spec.domains.length > 0, `${g} names no consuming domains`);
  }
  // cross-domain compounding: cutting_params must be consumed by >=3 domains
  assert.ok(MATH_SCIENCE_SCHEMA.cutting_params.domains.length >= 3);
});

test("coverageGaps — a vc-only record is flagged missing tool_material/coating/geometry/etc", () => {
  const gaps = coverageGaps({ vc_min_mpm: 120 });
  assert.ok(gaps.includes("tool_material"));
  assert.ok(gaps.includes("coating"));
  assert.ok(gaps.includes("geometry"));
  assert.ok(!gaps.includes("cutting_params"), "vc_min_mpm satisfies cutting_params group");
});

test("coverageGaps — a fuller record has fewer gaps", () => {
  const full = { vc_min_mpm: 120, substrate: "carbide", coating: "TiAlN", diameter_mm: 12, material_name: "4140", coolant: "flood", max_rpm: 12000 };
  const gaps = coverageGaps(full);
  assert.equal(gaps.length, 0, `expected full coverage, got gaps: ${gaps.join(",")}`);
});

test("buildRoutingRegistry — schema-versioned, names extractors + schema + consumers", () => {
  const reg = buildRoutingRegistry("2026-05-31T00:00:00.000Z");
  assert.equal(reg.schemaVersion, "1.0.0");
  assert.equal(reg.owner, "juliett");
  assert.ok(reg.extractors.length >= 6);
  assert.ok(reg.mathScienceSchema.cutting_params);
  assert.ok(reg.consumers.some((c) => /speed-feed/.test(c)));
  assert.match(reg.note, /never inlines a constant/);
});
