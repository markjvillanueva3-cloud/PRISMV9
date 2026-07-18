#!/usr/bin/env node
/**
 * build-catalog-sfc-manifest.mjs — catalog → Speed-Feed-Calculator extraction bridge (VENDOR-NETWORK-MS0, slot:charlie).
 *
 * U-VDN-SFC-MANIFEST. The operator wants vendor catalogs pulled + their speeds/feeds data extracted
 * into the SFC databases. CROSS-DOMAIN: the SFC database (per-vendor `mcp-server/src/data/*.ts`
 * catalogs, aggregated by `ToolCatalogEngine` via `addTools()`, schema `ManufacturerSpeedFeed`
 * {series,isoGroup P/M/K/N/S/H,vc_min/max,fz_min/max,dc}) is OSCAR's domain. charlie's lane is the
 * vendor-catalog ACQUISITION + TRIAGE. This script is the BRIDGE: it maps every speed/feed-bearing
 * cutting-tool catalog we have (or can pull) to its SFC extraction target + priority, so oscar's
 * extractor gets a precise, prioritized work-list instead of guessing.
 *
 * Priority logic (per vendor):
 *   skip   — NOT a cutting-tool maker (tool-holders/fixturing/coolant/material/machine-builder carry
 *            no SFM/IPT tables). S/F lives only on the cutting edge (end mills/drills/taps/inserts).
 *   high   — S/F-bearing + catalog PDF ON DISK + NOT already in src/data → extract NOW from what we have.
 *   medium — S/F-bearing + NOT ingested + catalog downloadable (web) → pull, then extract.
 *   low    — S/F-bearing + ALREADY ingested (a src/data catalog .ts exists) → refresh/augment only.
 *
 * R12: `already_ingested` is asserted ONLY for vendors with a known src/data catalog (KNOWN_INGESTED,
 * sourced from the 2026-05-29 SFC recon). Vendors whose ingestion state is unconfirmed are flagged
 * `verify_ingestion:true` so oscar confirms before extracting — never claimed ingested-or-not on a guess.
 *
 * Output: state/shared/quoting/catalog-sfc-extraction-manifest.{json,md} — the oscar handoff work-list.
 * Usage: node scripts/build-catalog-sfc-manifest.mjs [--out-dir <dir>] [--directory <jsonl>] [--catalogs <jsonl>]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const OUT_DIR = join(PRISM_ROOT, "state/shared/quoting");
const DIRECTORY = join(PRISM_ROOT, "state/shared/quoting/vendor-directory.jsonl");
const CATALOGS = join(PRISM_ROOT, "state/shared/quoting/vendor-sources/catalog-vendors.jsonl");

/** Vendors with a known src/data SFC catalog .ts (from the 2026-05-29 SFC recon of ToolCatalogEngine imports).
 *  Lowercased name fragments; a vendor matches if its name contains one of these. KEEP-IN-SYNC with oscar. */
export const KNOWN_INGESTED = [
  "helical", "emuge", "sumitomo", "osg", "indexable", "ampc", "sandvik", "seco",
  "ingersoll", "mitsubishi", "tungaloy", "widia", "horn", "niagara", "dormer",
  "zenit", "global cnc", "guhring", "iscar", "kennametal", "hypermill", "additional",
];

/** A cutting-tool maker whose catalog carries SFM/IPT/IPR tables? Pure. */
export function isSpeedFeedBearing(rec) {
  if (!rec || typeof rec !== "object") return false;
  const cats = Array.isArray(rec.categories) ? rec.categories : [];
  // S/F data lives on cutting tools (consumables). Holders/fixturing/coolant/material/machine/etc. do not carry it.
  if (!cats.includes("tooling-consumable")) return false;
  // exclude pure-holder/abrasive lines mis-tagged tooling-consumable (no edge-geometry S/F tables)
  const NON_SF = /holder|collet|chuck|vise|fixtur|workhold|abrasive|grinding\s*wheel/i;
  if (NON_SF.test(rec.name || "") && cats.length === 1) return false;
  return true;
}

/** Already represented in the SFC src/data catalogs? Pure. Returns {ingested, verify}. */
export function ingestionState(name) {
  const n = String(name || "").toLowerCase();
  const hit = KNOWN_INGESTED.find((k) => n.includes(k));
  if (hit) return { ingested: true, verify: false, match: hit };
  return { ingested: false, verify: true, match: null }; // unconfirmed → oscar verifies before extract
}

/** Proposed src/data target file slug for a vendor's S/F data. Pure. */
export function targetDataFile(name) {
  const slug = String(name || "").toLowerCase()
    .replace(/\(.*?\)/g, " ").replace(/&/g, " and ")
    .replace(/\b(inc|llc|corp|co|company|cutting|tools?|carbide|precision|electric|industries|systems)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
  return `mcp-server/src/data/${slug || "vendor"}-speed-feed-data.ts`;
}

/** Build the extraction manifest. Pure. directory[] = vendor-directory records; catalogVendors[] = catalog-harvest records. */
export function buildSfcManifest(directory, catalogVendors = []) {
  const dir = Array.isArray(directory) ? directory : [];
  const haveCatalog = new Set(
    (Array.isArray(catalogVendors) ? catalogVendors : [])
      .map((c) => String(c && c.name || "").toLowerCase().trim())
      .filter(Boolean)
  );
  const nameOnDisk = (name) => {
    const n = String(name || "").toLowerCase();
    for (const c of haveCatalog) if (c && (n.includes(c) || c.includes(n))) return true;
    return false;
  };
  const records = [];
  for (const rec of dir) {
    if (!isSpeedFeedBearing(rec)) continue;
    const ing = ingestionState(rec.name);
    const onDisk = nameOnDisk(rec.name);
    let priority;
    if (ing.ingested) priority = "low";          // already in SFC DB → augment only
    else if (onDisk) priority = "high";           // have the PDF, not ingested → extract NOW
    else if (rec.website) priority = "medium";    // pull from vendor site, then extract
    else priority = "medium";
    records.push({
      vendor: rec.name,
      vendor_id: rec.vendor_id,
      reach: rec.reach || "unknown",
      website: rec.website || null,
      catalog_on_disk: onDisk,
      already_ingested: ing.ingested,
      verify_ingestion: ing.verify,
      existing_or_target_data_file: ing.ingested ? `mcp-server/src/data/* (matched "${ing.match}")` : targetDataFile(rec.name),
      ingestion: "ToolCatalogEngine.addTools()",
      schema: "ManufacturerSpeedFeed { series, isoGroup(P|M|K|N|S|H), vc_min/max (m/min), fz_min/max (mm/tooth|mm/rev), dc_min/max? }",
      iso_groups_expected: ["P", "M", "K", "N", "S", "H"],
      extraction_priority: priority,
      source_tag: rec.source_tag || null,
    });
  }
  // sort: high → medium → low, then by reach (global first)
  const PRANK = { high: 0, medium: 1, low: 2, skip: 3 };
  const RRANK = { global: 0, national: 1, regional: 2, local: 3, unknown: 4 };
  records.sort((a, b) => (PRANK[a.extraction_priority] - PRANK[b.extraction_priority]) || (RRANK[a.reach] - RRANK[b.reach]) || a.vendor.localeCompare(b.vendor));
  const byPriority = {};
  for (const r of records) byPriority[r.extraction_priority] = (byPriority[r.extraction_priority] || 0) + 1;
  return {
    schemaVersion: "1.0.0",
    owner: "charlie (acquisition/triage) → oscar (SFC extraction + src/data write)",
    ingestion_target: "ToolCatalogEngine.addTools() — mcp-server/src/engines/ToolCatalogEngine.ts:548 (in-memory; durable DB = hand-authored src/data/*.ts catalogs)",
    schema: "ManufacturerSpeedFeed (mcp-server/src/data/manufacturer-speed-feed-data.ts)",
    records,
    stats: { total: records.length, byPriority, onDisk: records.filter((r) => r.catalog_on_disk).length, needVerify: records.filter((r) => r.verify_ingestion).length },
  };
}

/** Render the manifest digest. Pure. */
export function renderSfcManifestMd(man, iso) {
  const L = [];
  L.push("# CATALOG → SPEED-FEED-CALCULATOR extraction manifest (charlie → oscar handoff)");
  L.push("");
  L.push(`> Generated ${iso} · ${man.owner}. The prioritized work-list for extracting vendor-catalog speeds/feeds into the SFC databases. Ingestion: \`${man.ingestion_target}\`. Schema: \`${man.schema}\`.`);
  L.push("");
  L.push(`**${man.stats.total} cutting-tool makers · ${man.stats.onDisk} with catalog on disk · priority: ${JSON.stringify(man.stats.byPriority)}**`);
  L.push("");
  L.push("## HIGH priority — catalog on disk, NOT yet in SFC DB (extract NOW)");
  L.push("| vendor | reach | catalog on disk | target src/data file |");
  L.push("|--------|-------|:---------------:|----------------------|");
  for (const r of man.records.filter((x) => x.extraction_priority === "high")) L.push(`| ${r.vendor} | ${r.reach} | ✓ | ${r.existing_or_target_data_file} |`);
  L.push("");
  L.push("## MEDIUM priority — pull catalog (web), then extract");
  L.push("| vendor | reach | website |");
  L.push("|--------|-------|---------|");
  for (const r of man.records.filter((x) => x.extraction_priority === "medium")) L.push(`| ${r.vendor} | ${r.reach} | ${r.website || "—"} |`);
  L.push("");
  L.push("## LOW priority — already ingested (augment/refresh only)");
  L.push(`${man.records.filter((x) => x.extraction_priority === "low").map((r) => r.vendor).join(", ") || "(none)"}`);
  L.push("");
  L.push("## R12 — verify before asserting");
  L.push(`${man.stats.needVerify} vendors have UNCONFIRMED ingestion state (\`verify_ingestion:true\`) — oscar confirms whether a src/data catalog already covers them before extracting (don't double-ingest, don't skip a real gap).`);
  L.push("");
  L.push("## Extraction approach (oscar)");
  L.push("1. For HIGH targets, the catalog PDFs are in `H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded` (+ whiskey-fetch). Use lima's pypdf page-by-page extractor (NOT whiskey pdf-parse) on the S/F-table pages.");
  L.push("2. Map extracted rows → `ManufacturerSpeedFeed` records (series, isoGroup, vc, fz, dc), one new `mcp-server/src/data/<vendor>-speed-feed-data.ts` per vendor, exported + imported into `ToolCatalogEngine`.");
  L.push("3. Cite source catalog + page per record; flag low-confidence parses. Never inline material physics constants (use src/physics/constants.ts).");
  return L.join("\n");
}

function loadJsonl(path) {
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const s = line.trim(); if (!s) continue;
    try { out.push(JSON.parse(s)); } catch { /* skip */ }
  }
  return out;
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out-dir") args.outDir = argv[++i];
    else if (argv[i] === "--directory") args.directory = argv[++i];
    else if (argv[i] === "--catalogs") args.catalogs = argv[++i];
  }
  const outDir = args.outDir || OUT_DIR;
  const directory = loadJsonl(args.directory || DIRECTORY);
  if (directory.length === 0) { console.error(`FAIL-LOUD: vendor-directory not readable at ${args.directory || DIRECTORY} — run build-vendor-directory.mjs first`); return 3; }
  const catalogVendors = loadJsonl(args.catalogs || CATALOGS);
  const man = buildSfcManifest(directory, catalogVendors);
  if (man.records.length === 0) { console.error("FAIL-LOUD: 0 cutting-tool makers found — check the directory categories"); return 3; }
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const iso = new Date().toISOString().slice(0, 10);
  writeFileSync(join(outDir, "catalog-sfc-extraction-manifest.json"), JSON.stringify({ ...man, generatedAt: iso }, null, 2));
  writeFileSync(join(outDir, "CATALOG-SFC-EXTRACTION-MANIFEST.md"), renderSfcManifestMd(man, iso));
  console.log(`[build-catalog-sfc-manifest] ${man.stats.total} cutting-tool makers · ${JSON.stringify(man.stats.byPriority)} · ${man.stats.onDisk} on-disk · ${man.stats.needVerify} need-verify`);
  console.log(`  → ${join(outDir, "catalog-sfc-extraction-manifest.json")}`);
  console.log(`  → ${join(outDir, "CATALOG-SFC-EXTRACTION-MANIFEST.md")}`);
  return 0;
}

const invokedDirectly = (() => {
  try { return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
})();
if (invokedDirectly) { process.exit(main(process.argv.slice(2))); }
