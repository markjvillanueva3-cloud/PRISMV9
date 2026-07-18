#!/usr/bin/env node
/**
 * build-vendor-catalog-db.mjs — consolidate Charlie's VENDOR-NETWORK-MS0 vendor corpus
 * into a DURABLE, schema-versioned, committed database store.
 *
 * WHY (juliett role, per state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json):
 *   "Index + persist the durable vendor stores (433-vendor directory, catalog-vendors,
 *    SFC manifest, jm-tool-purchases) — JSONL/JSON stores to register in the store
 *    inventory (atomic-write + schema-version discipline)."
 * Charlie's sources are GITIGNORED + regenerable + live in the coordination dir
 * (state/shared/quoting/), so they are not durable. This script consolidates them into
 * a committed store — the same pattern as DocuStrata -> mcp-server/data/jm-die-database/.
 *
 * SCOPE BOUNDARY (no duplication):
 *   - oscar (speed-feed) owns the SFC cutting-data extraction into
 *     mcp-server/src/data/<vendor>-speed-feed-data.ts. This store persists the vendor /
 *     catalog / procurement METADATA + a POINTER projection of the SFC manifest (vendor,
 *     priority, on-disk, target file) — NEVER the extracted vc/fz cutting data.
 *   - The legacy mcp-server/data/vendor-catalog-manifest.json (tool-COUNT extraction of
 *     38 big PDFs) is a different concern — cross-referenced, never overwritten.
 *
 * Sources (FAIL-LOUD if any missing — R12):
 *   state/shared/quoting/vendor-directory.jsonl              (vendor directory)
 *   state/shared/quoting/vendor-sources/catalog-vendors.jsonl (catalog vendors)
 *   state/shared/quoting/jm-tool-purchases.json              (JM procurement)
 *   state/shared/quoting/catalog-sfc-extraction-manifest.json (SFC makers — pointer only)
 *   state/shared/quoting/vendor-directory-index.json         (directory stats)
 *
 * Output: mcp-server/data/vendor-catalog-db/{manifest.json, tables/*, README.md}
 *
 * Usage:
 *   node scripts/build-vendor-catalog-db.mjs            # apply
 *   node scripts/build-vendor-catalog-db.mjs --check    # verify sources + report, no writes
 *
 * Re-run after Charlie's pipeline regenerates the quoting artifacts (counts re-derived
 * from the live files per the corpus-index "re-derive from live files, not prose" rule).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRoutingRegistry } from "./lib/catalog-extraction-router.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const Q = path.join(REPO, "state/shared/quoting");
const OUT = path.join(REPO, "mcp-server/data/vendor-catalog-db");
const SCHEMA_VERSION = "1.0.0";

export const SOURCES = {
  vendors:  { rel: "vendor-directory.jsonl",                 kind: "jsonl" },
  catalogs: { rel: "vendor-sources/catalog-vendors.jsonl",   kind: "jsonl" },
  jmBuys:   { rel: "jm-tool-purchases.json",                 kind: "json" },
  sfc:      { rel: "catalog-sfc-extraction-manifest.json",   kind: "json" },
  dirIndex: { rel: "vendor-directory-index.json",            kind: "json" },
};

// ── pure helpers (exported for tests) ──────────────────────────────────────────

/** Parse a JSONL string into an array; throw with line number on a bad line (fail-loud). */
export function parseJsonl(text, label = "jsonl") {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((l, i) => {
    try { return JSON.parse(l); }
    catch (e) { throw new Error(`bad JSONL at ${label}:${i + 1}: ${e.message}`); }
  });
}

/** SFC manifest record -> pointer projection (NO cutting data; oscar owns the extraction). */
export function projectSfcMaker(r) {
  return {
    vendor: r.vendor,
    vendor_id: r.vendor_id,
    extraction_priority: r.extraction_priority,
    catalog_on_disk: r.catalog_on_disk,
    already_ingested: r.already_ingested,
    jm_buys: r.jm_buys,
    iso_groups_expected: r.iso_groups_expected,
    target_data_file: r.existing_or_target_data_file,
    reach: r.reach,
    website: r.website,
  };
}

/** Counts re-derived from the live consolidated arrays (never trust prose tallies). */
export function deriveCounts({ vendors, catalogs, sfcMakers, jmBuys }) {
  const isHigh = (m) => /high/i.test(String(m.extraction_priority || ""));
  const jmVendors = Array.isArray(jmBuys?.jm_tool_vendors)
    ? jmBuys.jm_tool_vendors.length
    : (jmBuys?.distinctToolVendors ?? 0);
  return {
    vendors: vendors.length,
    vendors_with_website: vendors.filter((v) => v && v.website).length,
    catalogs: catalogs.length,
    sfc_makers: sfcMakers.length,
    sfc_high_priority: sfcMakers.filter(isHigh).length,
    sfc_already_ingested: sfcMakers.filter((m) => m.already_ingested === true).length,
    jm_tool_vendors: jmVendors,
    jm_total_tool_spend: jmBuys?.totalToolSpend ?? null,
  };
}

/** Build the manifest object (pure — generatedAt injected by caller for testability). */
export function buildManifest({ counts, sourceRegistry, generatedAt, directoryStats }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    store: "vendor-catalog-db",
    owner: "juliett",
    generatedBy: "scripts/build-vendor-catalog-db.mjs",
    generatedAt,
    directoryStats: directoryStats || null,
    description:
      "Durable, schema-versioned persistence of Charlie's VENDOR-NETWORK-MS0 vendor corpus " +
      "(supplier directory + catalog vendors + JM procurement + SFC-maker pointers). " +
      "Consolidated from the gitignored/regenerable state/shared/quoting/ coordination files. " +
      "Re-run scripts/build-vendor-catalog-db.mjs after Charlie's pipeline regenerates them.",
    advisoryOnly: false,
    counts,
    tables: {
      "tables/vendors.jsonl": "supplier/distributor directory (vendor_id, name, vendor_type, categories, website, reach, regions, pricing_access, has_api, jm)",
      "tables/catalog-vendors.jsonl": "harvested catalog-vendor records (the makers behind the pulled cutting-tool catalog PDFs)",
      "tables/sfc-makers.jsonl": "POINTER projection of the SFC extraction manifest (vendor, priority, on-disk, already-ingested, target .ts file) — NOT cutting data; oscar owns that",
      "tables/jm-tool-purchases.json": "JM Die real tool-procurement rollup (which makers JM buys; spend by vendor)",
    },
    sourceRegistry,
    crossRef: {
      charlie_corpus_index: "state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json",
      sfc_extraction_manifest: "state/shared/quoting/catalog-sfc-extraction-manifest.json (oscar — cutting-data .ts targets)",
      sfc_data_targets: "mcp-server/src/data/<vendor>-speed-feed-data.ts (oscar's extraction output)",
      legacy_tool_count_manifest: "mcp-server/data/vendor-catalog-manifest.json (distinct: 38-PDF tool-COUNT extraction, not this directory)",
      pulled_pdfs_dir: "H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29 (164 PDFs, not in repo)",
      jm_die_database: "mcp-server/data/jm-die-database/ (JM corpus — procurement cross-ref)",
    },
    consumers: ["business (hotel — supplier master/procurement)", "speed-feed (oscar — SFC source)", "mill (foxtrot)", "post-processor (echo)", "cam (kilo)", "quoting (charlie — owner of acquisition)"],
  };
}

// ── side-effectful runner ──────────────────────────────────────────────────────

function statSource(absPath, kind) {
  const st = fs.statSync(absPath);
  const out = { path: absPath.replace(REPO + path.sep, "").replace(/\\/g, "/"), bytes: st.size, mtime: st.mtime.toISOString() };
  if (kind === "jsonl") out.records = fs.readFileSync(absPath, "utf8").split(/\r?\n/).filter((l) => l.trim()).length;
  return out;
}

function loadSources() {
  const missing = [];
  const abs = {};
  for (const [k, s] of Object.entries(SOURCES)) {
    const p = path.join(Q, s.rel);
    if (!fs.existsSync(p)) missing.push(s.rel);
    abs[k] = p;
  }
  if (missing.length) {
    throw new Error(`[vendor-catalog-db] FAIL-LOUD: missing source(s): ${missing.join(", ")} — run Charlie's pipeline first (build-vendor-directory.mjs / build-catalog-sfc-manifest.mjs).`);
  }
  const vendors = parseJsonl(fs.readFileSync(abs.vendors, "utf8"), "vendor-directory.jsonl");
  const catalogs = parseJsonl(fs.readFileSync(abs.catalogs, "utf8"), "catalog-vendors.jsonl");
  const jmBuys = JSON.parse(fs.readFileSync(abs.jmBuys, "utf8"));
  const sfcRaw = JSON.parse(fs.readFileSync(abs.sfc, "utf8"));
  // Fail-loud on schema drift: the manifest file exists, so an empty/missing `records`
  // array means the key was renamed — refuse to silently persist a store with 0 makers.
  if (!Array.isArray(sfcRaw.records) || sfcRaw.records.length === 0) {
    throw new Error("[vendor-catalog-db] FAIL-LOUD: catalog-sfc-extraction-manifest.json has no non-empty 'records' array (schema drift? key renamed?) — refusing to persist a store with 0 SFC makers.");
  }
  const sfcRecords = sfcRaw.records;
  const dirIndex = JSON.parse(fs.readFileSync(abs.dirIndex, "utf8"));
  return { abs, vendors, catalogs, jmBuys, sfcRecords, dirIndex };
}

function main() {
  const check = process.argv.includes("--check");
  const { vendors, catalogs, jmBuys, sfcRecords, dirIndex } = loadSources();
  const sfcMakers = sfcRecords.map(projectSfcMaker);
  const counts = deriveCounts({ vendors, catalogs, sfcMakers, jmBuys });

  const sourceRegistry = Object.fromEntries(
    Object.entries(SOURCES).map(([k, s]) => [k, statSource(path.join(Q, s.rel), s.kind)]),
  );
  const manifest = buildManifest({
    counts, sourceRegistry,
    generatedAt: new Date().toISOString(),
    directoryStats: dirIndex?.stats || null,
  });

  console.log("[vendor-catalog-db] " + (check ? "CHECK (no writes)" : "APPLY"));
  console.log("  counts:", JSON.stringify(counts));
  if (check) { console.log("  sources OK; would write -> " + OUT.replace(/\\/g, "/")); return; }

  fs.mkdirSync(path.join(OUT, "tables"), { recursive: true });
  const writeAtomic = (rel, str) => {
    const dest = path.join(OUT, rel);
    const tmp = dest + ".tmp." + process.pid;
    fs.writeFileSync(tmp, str);
    fs.renameSync(tmp, dest);
  };
  writeAtomic("tables/vendors.jsonl", vendors.map((v) => JSON.stringify(v)).join("\n") + "\n");
  writeAtomic("tables/catalog-vendors.jsonl", catalogs.map((v) => JSON.stringify(v)).join("\n") + "\n");
  writeAtomic("tables/sfc-makers.jsonl", sfcMakers.map((v) => JSON.stringify(v)).join("\n") + "\n");
  writeAtomic("tables/jm-tool-purchases.json", JSON.stringify(jmBuys, null, 2) + "\n");
  writeAtomic("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  writeAtomic("README.md", renderReadme(manifest));
  // Extraction governance: the canonical extractor inventory + full math/science schema
  // (operator: "use the extracter scripts/batch books we built; capture ALL math/science").
  writeAtomic("EXTRACTION-ROUTING.json", JSON.stringify(buildRoutingRegistry(new Date().toISOString()), null, 2) + "\n");

  console.log("  wrote " + OUT.replace(/\\/g, "/") + "/{manifest.json, tables/*, README.md}");
}

function renderReadme(m) {
  return [
    "# vendor-catalog-db",
    "",
    "> Durable persistence of Charlie's VENDOR-NETWORK-MS0 vendor corpus. Owner: juliett.",
    "> Schema " + m.schemaVersion + ". Regenerate: `node scripts/build-vendor-catalog-db.mjs`.",
    "",
    "Consolidated from the gitignored/regenerable `state/shared/quoting/` coordination files into",
    "this committed store (same pattern as DocuStrata -> jm-die-database).",
    "",
    "## Counts (re-derived from live source files)",
    "```json",
    JSON.stringify(m.counts, null, 2),
    "```",
    "",
    "## Tables",
    ...Object.entries(m.tables).map(([k, v]) => `- \`${k}\` — ${v}`),
    "",
    "## Scope boundary",
    "- **oscar (speed-feed)** owns the SFC cutting-data extraction into `mcp-server/src/data/<vendor>-speed-feed-data.ts`.",
    "  This store holds METADATA + a POINTER projection of the SFC manifest — never extracted vc/fz cutting data.",
    "- Legacy `mcp-server/data/vendor-catalog-manifest.json` (38-PDF tool-COUNT extraction) is a distinct concern — cross-referenced, not overwritten.",
    "",
    "## Cross-references",
    ...Object.entries(m.crossRef).map(([k, v]) => `- **${k}**: ${v}`),
    "",
  ].join("\n");
}

// Run only when invoked directly (not when imported by the test).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
