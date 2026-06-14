#!/usr/bin/env node
/**
 * build-global-cnc-tools-index.mjs — DB-COVERAGE-GAPFILL-MS0/U-GCNC01
 *
 * Syncs `mcp-server/src/data/global-cnc-tools.json` to the canonical catalog source
 * `mcp-server/src/data/global-cnc-tool-catalog.ts` (`GLOBAL_CNC_TOOLS`).
 *
 * WHY THIS EXISTS — the dev/prod split-brain it fixes:
 *  - PRODUCTION: `scripts/build-catalog-json.mjs` (postbuild) emits
 *    `dist/data/global-cnc-tools.json` from `GLOBAL_CNC_TOOLS` (the .ts export), and
 *    `catalogLoader.loadCatalog()` reads it from `dist/data/` at runtime.
 *  - DEV / VITEST: there is no `dist/`, so `loadCatalog()` reads the TRACKED
 *    `src/data/global-cnc-tools.json` directly.
 *  Before U-GCNC01 the tracked `src/data/global-cnc-tools.json` was an empty `[]` while
 *  `GLOBAL_CNC_TOOLS` already held 3,681 records — so the catalog had ZERO Global CNC
 *  tools in dev but 3,681 in production. This script makes the tracked dev file mirror
 *  the canonical source EXACTLY, so dev == prod.
 *
 * The bushing / bad-geometry FILTERING is intentionally NOT done here — it lives in
 * `ToolCatalogEngine._loadGlobalCNCTools()`, the single chokepoint BOTH the dev file and
 * the prod dist file flow through. Filtering at the loader (not the data file) guarantees
 * the same catalog regardless of which JSON source is loaded; this script's only job is
 * to keep the dev mirror faithful to GLOBAL_CNC_TOOLS.
 *
 * Usage:
 *   node mcp-server/scripts/build-global-cnc-tools-index.mjs            # write the mirror
 *   node mcp-server/scripts/build-global-cnc-tools-index.mjs --dry-run  # counts only
 *   node mcp-server/scripts/build-global-cnc-tools-index.mjs --json     # machine summary
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const CATALOG_TS = path.join(REPO_ROOT, "mcp-server/src/data/global-cnc-tool-catalog.ts");
const OUT_JSON = path.join(REPO_ROOT, "mcp-server/src/data/global-cnc-tools.json");

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const JSON_OUT = argv.includes("--json");

/**
 * Parse the GLOBAL_CNC_TOOLS literal array straight from the .ts source (no transpile).
 * Each record is a flat object literal:
 *   {partNumber:"...",type:"...",subType:"...",productLine:"...",manufacturer:"..."}
 * Field ORDER and presence vary, so we parse each `{...}` block and pull keys by name.
 * THROWS on a zero-record parse (fail-loud — never emit an empty mirror over real data).
 */
export function parseCatalog(tsSource) {
  // Isolate the array body so we don't match the interface/JSDoc above it.
  const start = tsSource.indexOf("GLOBAL_CNC_TOOLS");
  const body = start >= 0 ? tsSource.slice(start) : tsSource;
  const records = [];
  const objRe = /\{([^{}]*?)\}/g;
  let m;
  while ((m = objRe.exec(body)) !== null) {
    const inner = m[1];
    const rec = {};
    // Pull double-quoted string fields by key (the corpus is all string-valued).
    const fieldRe = /([A-Za-z_]\w*)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let f;
    while ((f = fieldRe.exec(inner)) !== null) {
      rec[f[1]] = f[2];
    }
    if (rec.partNumber && rec.type) records.push(rec);
  }
  if (records.length === 0) {
    throw new Error(
      "build-global-cnc-tools-index: parsed 0 records from GLOBAL_CNC_TOOLS — source shape changed or file empty. Refusing to emit an empty mirror."
    );
  }
  return records;
}

/** Per-type histogram for the honest report (R12) — surfaces what's actually in the mirror. */
export function summarize(records) {
  const byType = {};
  for (const r of records) byType[r.type] = (byType[r.type] ?? 0) + 1;
  return { total: records.length, byType };
}

function main() {
  if (!fs.existsSync(CATALOG_TS)) {
    throw new Error(`build-global-cnc-tools-index: canonical source missing: ${CATALOG_TS}`);
  }
  const records = parseCatalog(fs.readFileSync(CATALOG_TS, "utf8"));
  const stats = summarize(records);

  if (!DRY_RUN) {
    fs.writeFileSync(OUT_JSON, JSON.stringify(records, null, 2) + "\n");
  }

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ ok: true, dryRun: DRY_RUN, out: OUT_JSON, ...stats }, null, 2) + "\n");
  } else {
    const holders = stats.total - (stats.byType.bushing ?? 0);
    process.stdout.write(
      `build-global-cnc-tools-index: mirrored ${stats.total} records ` +
        `(${stats.byType.bushing ?? 0} bushings + ${holders} holders; loader excludes bushings + bad-geometry).\n` +
        `  byType: ${Object.entries(stats.byType).map(([k, v]) => `${k}:${v}`).join(", ")}\n` +
        (DRY_RUN ? "  [dry-run — no file written]\n" : `  wrote ${OUT_JSON}\n`)
    );
  }
}

// Only run when invoked directly (not on import for tests). Windows-safe via pathToFileURL.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
