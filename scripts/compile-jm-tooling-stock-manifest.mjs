#!/usr/bin/env node
/**
 * compile-jm-tooling-stock-manifest.mjs — the CROSS-REFERENCE MANIFEST that unifies ALL of JM Die's
 * tooling + stock/material data sources (slot:juliett, database-expansion → hotel ERP).
 *
 * Operator directive (2026-05-29): keep the sources SEPARATE + cross-referenced (not merged), and
 * include EVERYTHING — not just the vendor purchase report. The sources are semantically distinct:
 *   1. PURCHASED      — what JM Die actually bought (vendor report; jm-die-tooling/stock-catalog.json)
 *   2. MFR_CATALOGS   — manufacturer tool/insert/holder spec catalogs extracted to mcp-server/src/data/
 *                       (the bulk: tens of thousands of records across ~40 files) + tool-catalog-inventory.json
 *   3. HOLDERS        — tool-holder spec data (big-daishowa, haimer, guhring, fusion-tool-holders)
 *   4. MONOLITH       — the original PRISM monolith build: H:/PRISM/PRISM_v8_89_002_TRUE_100_PERCENT.html
 *                       (PRISM_BIG_DAISHOWA_HOLDER_DATABASE, PRISM_CUTTING_TOOL_DATABASE_V2,
 *                        PRISM_TOOL_HOLDER_INTERFACES_COMPLETE) — ported to ToolHolder/ToolDatabaseBridge engines.
 *
 * This manifest INDEXES the sources (path + record count + manufacturer + schema + cross-refs); it does
 * NOT copy the records (they remain authoritative in src/data). Hotel consumes the manifest for the ERP.
 *
 * HONESTY: record counts for .json are exact (array length); for .ts they are an APPROXIMATION (record-
 * marker regex), flagged `approx:true`. The monolith counts are grep-based estimates over the .html,
 * flagged `approx:true`. No dollar figures (hotel financial-invariant doctrine).
 *
 * Usage: node scripts/compile-jm-tooling-stock-manifest.mjs [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = "H:/prism";
const SRC_DATA = path.join(ROOT, "mcp-server/src/data");
const JMDB = path.join(ROOT, "mcp-server/data/jm-die-database");
const MONOLITH = "H:/PRISM/PRISM_v8_89_002_TRUE_100_PERCENT.html";
const OUT = path.join(JMDB, "jm-die-tooling-stock-master-manifest.json");
const SCHEMA_VERSION = "1.0.0";

// classify a src/data tool-data filename → kind + manufacturer
function manuf(f) {
  const m = f.match(/^([a-z0-9]+(?:-[a-z0-9]+)?)[-_]/i);
  return m ? m[1].toLowerCase().replace(/-/g, "_") : "unknown";
}
function kindOf(f) {
  if (/holder/i.test(f)) return "holders";
  if (/workhold/i.test(f)) return "workholding";
  if (/insert|grade/i.test(f)) return "inserts";
  if (/turning/i.test(f)) return "turning";
  if (/milling|endmill/i.test(f)) return "milling";
  if (/drill|holemaking/i.test(f)) return "drilling";
  if (/thread/i.test(f)) return "threading";
  return "tooling";
}

/** Count records in a tool-data file. .json → array length (exact). .ts → record-marker regex (approx). */
function countRecords(full, f) {
  try {
    if (f.endsWith(".json")) {
      const j = JSON.parse(fs.readFileSync(full, "utf8"));
      const arr = Array.isArray(j) ? j : (Object.values(j).find((v) => Array.isArray(v)) || null);
      return arr ? { count: arr.length, approx: false, sampleKeys: Object.keys(arr[0] || {}).slice(0, 8) } : { count: 0, approx: false, sampleKeys: [] };
    }
    const txt = fs.readFileSync(full, "utf8");
    const n = (txt.match(/\b(designation|part_?[nN]umber|catalog[nN]umber|edpNo|orderNumber)\s*:/g) || []).length;
    return { count: n, approx: true, sampleKeys: [] };
  } catch { return { count: 0, approx: false, sampleKeys: [], error: true }; }
}

function fileMeta(p) { try { const s = fs.statSync(p); return { exists: true, bytes: s.size }; } catch { return { exists: false, bytes: 0 }; } }

function scanSrcData() {
  let files;
  try { files = fs.readdirSync(SRC_DATA); } catch { return []; }
  const RE = /(-tools?(-extracted)?|-tool-catalog|-holder|holders|-extracted|workholding|cutting-tool|tool-database|tool-library|insert|grade|turning|milling|drill|thread|endmill)\b/i;
  const out = [];
  for (const f of files) {
    if (!/\.(json|ts)$/.test(f)) continue;
    if (!RE.test(f)) continue;
    if (/\.test\.|\.d\.ts$/.test(f)) continue;
    const full = path.join(SRC_DATA, f);
    const { count, approx, sampleKeys, error } = countRecords(full, f);
    if (count <= 3 && !error) continue; // skip tiny/non-data files
    out.push({ file: `mcp-server/src/data/${f}`, manufacturer: manuf(f), kind: kindOf(f), records: count, approx, format: f.endsWith(".json") ? "json" : "ts", sampleKeys });
  }
  return out.sort((a, b) => b.records - a.records);
}

function monolithSection() {
  const meta = fileMeta(MONOLITH);
  const dbs = ["PRISM_BIG_DAISHOWA_HOLDER_DATABASE", "PRISM_CUTTING_TOOL_DATABASE_V2", "PRISM_TOOL_HOLDER_INTERFACES_COMPLETE", "PRISM_CUTTING_TOOL_DATABASE"];
  const found = [];
  if (meta.exists) {
    for (const db of dbs) {
      try { const n = parseInt(execFileSync("grep", ["-c", db, MONOLITH], { encoding: "utf8", maxBuffer: 1 << 20 }).trim(), 10); if (n > 0) found.push({ database: db, lineHits: n }); } catch {}
    }
  }
  return {
    kind: "monolith", path: MONOLITH, exists: meta.exists, bytes: meta.bytes,
    note: "Original PRISM monolith build (v8.89.002, ~944,903 lines). Tool DBs below were ported to mcp-server/src/engines/{ToolHolderDatabaseEngine,ToolDatabaseBridgeEngine}.ts (bridge/loader code) and re-extracted into the MFR_CATALOGS src/data files. Source-of-record for provenance; not a live query surface.",
    embeddedDatabases: found, approx: true,
    portedEngines: ["mcp-server/src/engines/ToolHolderDatabaseEngine.ts", "mcp-server/src/engines/ToolDatabaseBridgeEngine.ts"],
  };
}

function jsonRecords(p, arrKey) {
  try { const j = JSON.parse(fs.readFileSync(p, "utf8")); const arr = arrKey ? j[arrKey] : (Array.isArray(j) ? j : Object.values(j).find((v) => Array.isArray(v))); return Array.isArray(arr) ? arr.length : 0; } catch { return 0; }
}

function main() {
  const mfr = scanSrcData();
  const holders = mfr.filter((m) => m.kind === "holders");
  const tools = mfr.filter((m) => m.kind !== "holders" && m.kind !== "workholding");
  const workholding = mfr.filter((m) => m.kind === "workholding");

  // purchased (vendor report) — my catalogs
  const purchasedTooling = jsonRecords(path.join(JMDB, "jm-die-tooling-catalog.json"), "vendors");
  const purchasedStockLines = (() => { try { return JSON.parse(fs.readFileSync(path.join(JMDB, "jm-die-tooling-stock-handoff.json"), "utf8")).summary?.stock_totalLines || 0; } catch { return 0; } })();
  const fusionHolders = jsonRecords(path.join(ROOT, "mcp-server/data/fusion-programs/fusion-tool-holders.json"));
  const catalogIndex = jsonRecords(path.join(ROOT, "mcp-server/data/tool-catalog-inventory.json"), "catalogs");

  const sumRecords = (a) => a.reduce((s, x) => s + x.records, 0);
  const byManufacturer = {};
  for (const m of mfr) byManufacturer[m.manufacturer] = (byManufacturer[m.manufacturer] || 0) + m.records;

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    kind: "jm-die-tooling-stock-master-manifest",
    generated: process.env.PRISM_INGEST_STAMP || "2026-05-29",
    shop: "J.M. Tool & Die, LLC",
    builtBy: "scripts/compile-jm-tooling-stock-manifest.mjs (slot:juliett, database-expansion)",
    design: "Sources kept SEPARATE + cross-referenced (operator directive 2026-05-29). This manifest INDEXES every source with path + record count + classification; it does NOT copy records (they stay authoritative in src/data / the vendor-report catalogs / the monolith).",
    honesty: ".ts and monolith record counts are APPROXIMATE (regex/grep marker counts), flagged approx:true. .json counts are exact array lengths. No dollar figures (hotel financial-invariant).",
    grandTotals: {
      mfr_catalog_files: mfr.length,
      mfr_catalog_records_approx: sumRecords(mfr),
      tool_spec_records: sumRecords(tools),
      holder_records: sumRecords(holders) + fusionHolders,
      workholding_records: sumRecords(workholding),
      purchased_tooling_vendors: purchasedTooling,
      purchased_stock_lines: purchasedStockLines,
      manufacturer_catalog_index_entries: catalogIndex,
    },
    sources: {
      PURCHASED: {
        description: "What JM Die actually bought (DocuStrata QuickBooks vendor report, 2014-2026).",
        artifacts: [
          { path: "mcp-server/data/jm-die-database/jm-die-tooling-catalog.json", kind: "purchased_tooling_by_vendor", records: purchasedTooling },
          { path: "mcp-server/data/jm-die-database/jm-die-stock-material-catalog.json", kind: "purchased_stock_material", lines: purchasedStockLines },
        ],
        crossRef: "vendor names reconcile with hotel's mcp-server/data/state/jm-die-vendor-registry.json (174 vendors).",
      },
      MFR_CATALOGS: {
        description: "Manufacturer tool/insert/holder spec catalogs extracted to mcp-server/src/data/ (the bulk of the tooling universe).",
        catalogIndex: { path: "mcp-server/data/tool-catalog-inventory.json", catalogs: catalogIndex, note: "TOOL-CATALOG-INGEST-MS0 index of 45 source PDFs by manufacturer/type." },
        byManufacturer: Object.fromEntries(Object.entries(byManufacturer).sort((a, b) => b[1] - a[1])),
        files: mfr,
      },
      HOLDERS: {
        description: "Tool-holder spec data (taper, gauge length, bore, body dia).",
        files: holders,
        fusionToolHolders: { path: "mcp-server/data/fusion-programs/fusion-tool-holders.json", records: fusionHolders },
      },
      MONOLITH: monolithSection(),
    },
    crossReferences: [
      "PURCHASED.jm-die-tooling-catalog vendors ↔ MFR_CATALOGS.byManufacturer (a purchased carbide vendor maps to its mfr spec catalog).",
      "PURCHASED.jm-die-stock-material grades ↔ (material domain; no mfr tool catalog — reconcile with ALRO/CINCINNATI steel suppliers).",
      "MONOLITH.embeddedDatabases ↔ MFR_CATALOGS (big-daishowa holders) + HOLDERS (the monolith DBs were re-extracted into these src/data files).",
      "ALL ↔ hotel mcp-server/data/state/jm-die-vendor-registry.json (174 vendors) for AP/vendor-master linkage.",
    ],
    forHotelERP: {
      purpose: "Material-master + tooling/consumable catalog + vendor-preference seed, kept as separate cross-referenced tables.",
      recommendations: [
        "Material-master: seed from PURCHASED.jm-die-stock-material (grades JM Die actually stocks: H13, M2, S7, D2, A2...).",
        "Tooling-master / spec lookup: seed from MFR_CATALOGS (manufacturer spec catalogs) — what tooling EXISTS, with specs.",
        "Vendor-preference / sourcing: cross MFR_CATALOGS manufacturers with PURCHASED tooling vendors (who JM Die actually buys carbide/inserts/etc. from).",
        "Holder library: HOLDERS (big-daishowa 1208, fusion 795, haimer, guhring) for setup-sheet + tool-assembly.",
        "Reorder cadence: PURCHASED occurrences + date-range (NOT $; reconcile cost from QuickBooks).",
      ],
    },
  };

  if (process.argv.includes("--json")) { console.log(JSON.stringify(manifest.grandTotals, null, 2)); }
  const tmp = `${OUT}.${process.pid}.tmp`;
  try { fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2)); fs.renameSync(tmp, OUT); }
  catch (e) { try { fs.unlinkSync(tmp); } catch {} throw e; }
  // read-back smoke test
  const back = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const ok = back.schemaVersion === SCHEMA_VERSION && back.grandTotals.mfr_catalog_files === mfr.length;
  console.log(`[manifest] mfr-files=${mfr.length} mfr-records≈${sumRecords(mfr)} | holders=${sumRecords(holders) + fusionHolders} | purchased-tooling-vendors=${purchasedTooling} purchased-stock-lines=${purchasedStockLines} | monolith=${monolithSection().exists ? "found" : "ABSENT"} | smoke=${ok ? "PASS" : "FAIL"}`);
  console.log(`[manifest] → ${path.relative(ROOT, OUT)}`);
  if (!ok) process.exit(3);
}

main();
