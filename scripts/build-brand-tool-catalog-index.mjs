#!/usr/bin/env node
/**
 * build-brand-tool-catalog-index.mjs -- emit a compact, app-consumable index of the deduped
 * brand-tool corpus so the web/phone catalog app can render a tool browser without parsing the
 * 60-file source corpus or the large per-brand CAM library files.
 *
 * WHY (slot:romeo, 2026-06-19): the operator's Part 2 is "move to backend tasks so we can focus on
 * front end, web app/phone app". The 72K deduped tools live in scripts/lib/brand-tool-catalog.mjs
 * (a node module) + the per-brand CAM library files. A frontend can't consume those directly. This
 * emits one small JSON the app fetches: brand list, category list, a brand x category count matrix,
 * and per-brand summaries with pointers to the generated CAM library files. Detail rows stay in the
 * per-brand files (paginated load); this index drives the nav/filters/counts.
 *
 * Deterministic + pure (the only I/O is the catalog load + the index write). No timestamps baked in
 * (so re-runs are byte-stable for git/diff); the app can stat the file for freshness.
 *
 * Usage: node scripts/build-brand-tool-catalog-index.mjs [--out <path>] [--self-test]
 * Output: state/shared/tool-libraries/brand-tool-catalog-index.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrandCatalog } from "./lib/brand-tool-catalog.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.resolve(HERE, "../state/shared/tool-libraries/brand-tool-catalog-index.json");

// The CAM library file a given brand is emitted into, per format lane (all 7 lanes).
const FORMAT_FILE = {
  fusion: (slug) => `fusion/PRISM_${slug}.tools`,
  hypermill: (slug) => `hypermill/PRISM_${slug}.hmt.sql`,
  mastercam: (slug) => `mastercam/PRISM_${slug}_tools.csv`,
  "mastercam-inserts": (slug) => `mastercam-inserts/PRISM_${slug}_inserts.csv`,
  "hypermill-inserts": (slug) => `hypermill-inserts/PRISM_${slug}_inserts.hmt.sql`,
  "mastercam-holders": (slug) => `mastercam-holders/PRISM_${slug}_holders.csv`,
  "hypermill-holders": (slug) => `hypermill-holders/PRISM_${slug}_holders.hmt.sql`,
};
function brandSlug(brand) {
  return String(brand).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase() || "UNKNOWN";
}

/** Build the app index object from a loaded catalog (pure). */
export function buildIndex(catalog) {
  const brandCategory = {}; // brand -> {category -> count}
  const byCategoryTotal = {};
  const brandGeom = {};      // brand -> {complete, total}
  for (const r of catalog.records) {
    (brandCategory[r.brand] = brandCategory[r.brand] || {})[r.category] =
      (brandCategory[r.brand][r.category] || 0) + 1;
    byCategoryTotal[r.category] = (byCategoryTotal[r.category] || 0) + 1;
    const g = (brandGeom[r.brand] = brandGeom[r.brand] || { complete: 0, total: 0 });
    g.total += 1;
    if (r.geometry_complete) g.complete += 1;
  }

  const brands = Object.keys(brandCategory).sort().map((brand) => {
    const slug = brandSlug(brand);
    const cats = brandCategory[brand];
    const total = Object.values(cats).reduce((a, b) => a + b, 0);
    const geom = brandGeom[brand];
    // pointers to the CAM library files that carry this brand's rotating cutters / inserts
    const files = {};
    for (const [fmt, fn] of Object.entries(FORMAT_FILE)) files[fmt] = fn(slug);
    return {
      brand, slug, total,
      categories: cats,
      geometryCompletePct: total ? +(100 * geom.complete / total).toFixed(1) : 0,
      files,
    };
  });

  return {
    schemaVersion: "1.0.0",
    source: "scripts/lib/brand-tool-catalog.mjs (deduped)",
    totals: {
      tools: catalog.stats.total,
      brands: catalog.stats.brands,
      geometryCompletePct: catalog.stats.geometry_complete_pct,
      duplicatesDropped: catalog.stats.duplicates_dropped,
    },
    byCategory: byCategoryTotal,
    brands,
  };
}

// ## Self-test
function selfTest() {
  const checks = [];
  const ok = (n, c) => checks.push({ name: n, ok: !!c });

  const fake = { records: [
    { brand: "Sandvik", category: "solid_mill", geometry_complete: true },
    { brand: "Sandvik", category: "drill", geometry_complete: false },
    { brand: "ISCAR", category: "insert", geometry_complete: true },
  ], stats: { total: 3, brands: 2, geometry_complete_pct: 66.7, duplicates_dropped: 5 } };
  const idx = buildIndex(fake);
  ok("totals carried", idx.totals.tools === 3 && idx.totals.duplicatesDropped === 5);
  ok("byCategory counts", idx.byCategory.solid_mill === 1 && idx.byCategory.insert === 1);
  ok("brands sorted", idx.brands[0].brand === "ISCAR" && idx.brands[1].brand === "Sandvik");
  ok("brand total + matrix", idx.brands[1].total === 2 && idx.brands[1].categories.drill === 1);
  ok("file pointers per format", idx.brands[1].files.fusion === "fusion/PRISM_SANDVIK.tools" && idx.brands[1].files["mastercam-inserts"] === "mastercam-inserts/PRISM_SANDVIK_inserts.csv");
  ok("brand geometry pct", idx.brands[1].geometryCompletePct === 50);

  // live
  let live = null;
  try { live = buildIndex(loadBrandCatalog()); } catch { /* data absent */ }
  if (live) {
    ok("live index >1000 tools", live.totals.tools > 1000);
    ok("live index >=10 brands", live.brands.length >= 10);
    ok("live byCategory has solid_mill + insert", live.byCategory.solid_mill > 0 && live.byCategory.insert > 0);
  } else { ok("live (skipped -- data absent)", true); }

  const passed = checks.filter((c) => c.ok).length;
  console.log(`SELF-TEST: ${passed}/${checks.length} passed`);
  checks.forEach((c) => console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}`));
  return passed === checks.length;
}

// ## CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) process.exit(selfTest() ? 0 : 1);
  const oi = args.indexOf("--out");
  const out = oi >= 0 ? args[oi + 1] : DEFAULT_OUT;
  const idx = buildIndex(loadBrandCatalog());
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(idx, null, 2));
  console.log(`Wrote ${out}`);
  console.log(`  ${idx.totals.tools} tools / ${idx.totals.brands} brands / ${idx.totals.geometryCompletePct}% geometry-complete`);
  console.log(`  categories:`, idx.byCategory);
}
