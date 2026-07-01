#!/usr/bin/env node
/**
 * regenerate-catalog-index.mjs — recompute CATALOG_INDEX.json entry counts from the
 * REAL vendor JSON files on disk.
 *
 * WHY (CATALOG-APP-WIRING-MS0, slot:romeo, 2026-06-08):
 *   CATALOG_INDEX.json (generated 2026-04-16) declares totalEntries=51,336, but the
 *   actual *-extracted.json files in src/data/ now hold ~62,727 rows — the manifest is
 *   STALE. The divergent file: osg-tools-extracted.json declares entries=42 but has
 *   11,550 rows (OSG was re-extracted ~275x larger, manifest never refreshed).
 *   VendorCatalogManifestEngine (the only reader of this index) therefore undercounts.
 *
 * There was no existing generator that recomputes CATALOG_INDEX.json from the files —
 * save-catalog-manifest.mjs READS this index to build a DIFFERENT file. This script
 * fills that gap: it preserves each catalog entry's file/manufacturer/type (those are
 * correct) and ONLY recomputes the counts from the real row data.
 *
 * Usage:
 *   node scripts/regenerate-catalog-index.mjs           # dry-run: report drift, write nothing
 *   node scripts/regenerate-catalog-index.mjs --apply   # rewrite CATALOG_INDEX.json
 *
 * Fail-loud: a catalog file that can't be read/parsed is reported as an ERROR and
 * (without --force) aborts the write so we never emit a half-counted manifest.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", ".."); // scripts/ -> mcp-server/ -> repo root
const INDEX_PATH = resolve(REPO, "mcp-server", "data", "CATALOG_INDEX.json");
const SRC_DATA = resolve(REPO, "mcp-server", "src", "data");

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");

/** Count tool-record rows in one vendor file. A multi-section catalog (turning_inserts +
 *  threading_inserts + grooving_inserts, or a holders section) MERGES every array of RECORDS
 *  (elements carrying a `designation` or `part_number`); non-record arrays (speed_feed_data,
 *  cutting_conditions, summary rows) are EXCLUDED. Mirrors CatalogCorpusLoaderEngine.readVendorFile
 *  exactly so the manifest count equals what the corpus actually loads. Back-compat: if no array
 *  qualifies as records, fall back to the first non-empty array (legacy behavior). */
export function countRecords(data) {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const arrays = Object.values(data).filter((v) => Array.isArray(v));
    const recs = arrays.filter(
      (a) => a.length > 0 && a.every(
        (r) => r != null && typeof r === "object" && ("designation" in r || "part_number" in r),
      ),
    );
    return recs.length > 0 ? recs.flat().length : (arrays.find((a) => a.length > 0)?.length ?? 0);
  }
  return 0;
}
function countRows(file) {
  const path = resolve(SRC_DATA, file);
  if (!existsSync(path)) throw new Error(`file not found: ${file}`);
  return countRecords(JSON.parse(readFileSync(path, "utf8")));
}

/** Infer {file, manufacturer, type, entries} for a newly-discovered extracted file. Manufacturer
 *  = capitalized first filename segment; type = holders/inserts/tools by the file's array keys. */
function inferEntry(file) {
  const data = JSON.parse(readFileSync(resolve(SRC_DATA, file), "utf8"));
  const seg = file.replace(/-extracted\.json$/i, "").split("-")[0];
  const manufacturer = seg.charAt(0).toUpperCase() + seg.slice(1);
  let type = "tools";
  if (!Array.isArray(data) && data && typeof data === "object") {
    const keys = Object.keys(data).filter((k) => Array.isArray(data[k]));
    if (keys.some((k) => /holder/i.test(k))) type = "holders";
    else if (keys.some((k) => /insert/i.test(k))) type = "inserts";
  }
  return { file, manufacturer, type, entries: 0 };
}

/** Discover *-extracted.json files present on disk but absent from the manifest. */
function discoverUnindexed(indexedFiles) {
  return readdirSync(SRC_DATA)
    .filter((f) => /-extracted\.json$/i.test(f) && !indexedFiles.has(f))
    .map(inferEntry);
}

function main() {
  const idx = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  if (!Array.isArray(idx.catalogs)) throw new Error("CATALOG_INDEX.json has no catalogs[] array");

  // Auto-discover *-extracted.json files on disk that the manifest never indexed (orphans). They
  // are routed in here so the canonical index reflects the FULL on-disk corpus, not just whatever
  // was hand-listed. New entries get inferred manufacturer/type; counts come from countRows below.
  const indexedFiles = new Set(idx.catalogs.map((c) => c.file));
  const discovered = discoverUnindexed(indexedFiles);
  if (discovered.length) {
    console.log(`  + discovered ${discovered.length} unindexed extracted file(s): ${discovered.map((d) => d.file).join(", ")}`);
  }
  const sourceCatalogs = [...idx.catalogs, ...discovered];

  const errors = [];
  const drift = [];
  let totalEntries = 0;
  const byManufacturer = {};

  const catalogs = sourceCatalogs.map((c) => {
    let real;
    try {
      real = countRows(c.file);
    } catch (e) {
      errors.push(`${c.file}: ${e.message}`);
      // keep the old count on read failure so we don't zero out a vendor silently
      real = c.entries ?? 0;
    }
    if (real !== (c.entries ?? 0)) {
      drift.push({ file: c.file, manufacturer: c.manufacturer, was: c.entries ?? 0, now: real });
    }
    totalEntries += real;
    const m = byManufacturer[c.manufacturer] ?? { files: 0, entries: 0 };
    m.files += 1;
    m.entries += real;
    byManufacturer[c.manufacturer] = m;
    return { file: c.file, manufacturer: c.manufacturer, type: c.type, entries: real };
  });

  const next = {
    generated: idx.generated, // preserved; --apply stamps a fresh one below
    totalFiles: catalogs.length,
    totalEntries,
    byManufacturer,
    catalogs,
  };

  // ── Report ──
  console.log(`CATALOG_INDEX regen — ${catalogs.length} files`);
  console.log(`  declared totalEntries: ${idx.totalEntries}`);
  console.log(`  REAL    totalEntries: ${totalEntries}  (delta ${totalEntries - idx.totalEntries})`);
  if (drift.length) {
    console.log(`  drifted files (${drift.length}):`);
    for (const d of drift.sort((a, b) => Math.abs(b.now - b.was) - Math.abs(a.now - a.was)).slice(0, 20)) {
      console.log(`    ${d.file.padEnd(40)} ${d.manufacturer.padEnd(14)} was ${String(d.was).padStart(6)} -> now ${String(d.now).padStart(6)}`);
    }
  } else {
    console.log("  no drift — manifest already matches the files.");
  }
  if (errors.length) {
    console.log(`  ERRORS (${errors.length}):`);
    for (const e of errors) console.log(`    ${e}`);
  }

  if (!apply) {
    console.log("\n(dry-run) re-run with --apply to rewrite CATALOG_INDEX.json");
    return;
  }
  if (errors.length && !force) {
    console.error("\nABORT: refusing to write with unread files (use --force to write anyway). No half-counted manifest.");
    process.exit(1);
  }

  // Stamp a fresh generated timestamp ONLY on apply (deterministic dry-run otherwise).
  next.generated = new Date().toISOString();
  writeFileSync(INDEX_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log(`\nWROTE ${INDEX_PATH} — totalEntries ${idx.totalEntries} -> ${totalEntries}`);
}

export { inferEntry, discoverUnindexed };

// Run only when invoked directly (not when imported by the test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
