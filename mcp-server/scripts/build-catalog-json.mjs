#!/usr/bin/env node
/**
 * Build-time catalog extractor.
 *
 * Reads the large TypeScript catalog source files, evaluates the exported
 * arrays/objects, and writes them as JSON to dist/data/.
 *
 * Runs as a postbuild step: the TS catalogs are the source of truth,
 * the JSON files are the runtime cache that the bundle's catalogLoader reads.
 *
 * Usage: node scripts/build-catalog-json.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");
const DIST_DATA = path.join(ROOT, "dist", "data");
const SRC_DATA = path.join(ROOT, "src", "data");

// --sync-src ALSO writes each catalog JSON to src/data/ (the tracked dev/vitest read
// location), not just dist/data/ (the prod runtime cache). Fixes the dev/prod split-brain
// where a tracked src/data/<catalog>.json was an empty [] while its .ts source held
// thousands of records: production (reads dist) saw the data, dev (reads src, no dist)
// saw nothing. With --sync-src the same esbuild-evaluated export feeds BOTH locations.
// (DB-COVERAGE-GAPFILL-MS0/U-CATALOG-MIRROR-SYNC)
const SYNC_SRC = process.argv.includes("--sync-src");

fs.mkdirSync(DIST_DATA, { recursive: true });

// We use dynamic import of the built bundle to access the catalog data.
// But the bundle is huge — instead, we'll use esbuild to build JUST the
// catalog files into small standalone modules, then read them.
//
// Simpler approach: use tsx to evaluate each catalog TS directly.

const require = createRequire(import.meta.url);

/**
 * Catalog extraction manifest.
 * Each entry: { json, tsFile, exports: { jsonKey: exportName } }
 *
 * Single-export catalogs: JSON is the raw array.
 * Multi-export catalogs: JSON is { key1: [...], key2: [...] }.
 */
const CATALOGS = [
  {
    json: "helical-tools.json",
    tsFile: "src/data/helical-tool-catalog.ts",
    singleExport: "helicalToolCatalog",
  },
  {
    json: "emuge-tools.json",
    tsFile: "src/data/emuge-tool-catalog.ts",
    singleExport: "EMUGE_TOOLS",
  },
  {
    json: "additional-tools.json",
    tsFile: "src/data/additional-tool-catalog.ts",
    singleExport: "ADDITIONAL_TOOLS",
  },
  {
    json: "indexable-tools.json",
    tsFile: "src/data/indexable-tool-catalog.ts",
    singleExport: "INDEXABLE_TOOLS",
  },
  {
    json: "sandvik-2018-rotating.json",
    tsFile: "src/data/sandvik-2018-rotating-catalog.ts",
    singleExport: "SANDVIK_2018_ROTATING_TOOLS",
  },
  {
    json: "osg-tools.json",
    tsFile: "src/data/osg-tool-catalog.ts",
    singleExport: "OSG_TOOLS",
  },
  {
    json: "sumitomo-tools.json",
    tsFile: "src/data/sumitomo-tool-catalog.ts",
    singleExport: "sumitomoToolCatalog",
  },
  {
    json: "ampc-tools.json",
    tsFile: "src/data/ampc-tool-catalog.ts",
    multiExport: ["AMPC_TOOLS", "AMPC_CUTTING_DATA"],
  },
  {
    json: "kennametal-turning.json",
    tsFile: "src/data/kennametal-turning-catalog.ts",
    singleExport: "KENNAMETAL_TURNING_TOOLS",
  },
  {
    json: "tungaloy-turning.json",
    tsFile: "src/data/tungaloy-turning-catalog.ts",
    multiExport: ["TUNGALOY_TURNING_INSERTS", "TUNGALOY_TURNING_GRADES", "TUNGALOY_GROOVING_INSERTS"],
  },
  {
    json: "global-cnc-tools.json",
    tsFile: "src/data/global-cnc-tool-catalog.ts",
    singleExport: "GLOBAL_CNC_TOOLS",
  },
  {
    json: "guhring-tools.json",
    tsFile: "src/data/guhring-tool-catalog.ts",
    singleExport: "GUHRING_TOOLS",
  },
  {
    json: "sandvik-tools.json",
    tsFile: "src/data/sandvik-tool-catalog.ts",
    singleExport: "SANDVIK_TOOLS",
  },
  {
    json: "hypermill-materials.json",
    tsFile: "src/data/hypermill-materials-catalog.ts",
    multiExport: ["HYPERMILL_MATERIALS_CATALOG", "HYPERMILL_MATERIAL_MAP", "HYPERMILL_ISO_GROUP_MAP"],
  },
  {
    json: "machine-torque-curves.json",
    tsFile: "src/data/machine-torque-curves.ts",
    singleExport: "MACHINE_TORQUE_CURVES",
  },
];

/**
 * Build a single catalog TS file into a temp .mjs, import it, extract the
 * named export(s), and write JSON.
 */
async function extractCatalog(cat) {
  const tsPath = path.join(ROOT, cat.tsFile);
  if (!fs.existsSync(tsPath)) {
    console.warn(`  SKIP ${cat.json} — source not found: ${cat.tsFile}`);
    return { json: cat.json, status: "skipped" };
  }

  const tmpOut = path.join(DIST_DATA, `_tmp_${cat.json.replace(".json", ".mjs")}`);
  try {
    // Use esbuild to compile just this one file (fast, handles TS + @ts-nocheck)
    const esbuild = await import("esbuild");
    await esbuild.build({
      entryPoints: [tsPath],
      bundle: true,
      platform: "node",
      target: "node18",
      format: "esm",
      outfile: tmpOut,
      banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
      external: ["node:*"],
      logLevel: "silent",
    });

    // Dynamic import the compiled module
    const mod = await import(`file://${tmpOut.replace(/\\/g, "/")}`);

    let data;
    if (cat.singleExport) {
      data = mod[cat.singleExport];
      if (!data) {
        console.warn(`  WARN ${cat.json} — export '${cat.singleExport}' is undefined`);
        return { json: cat.json, status: "empty" };
      }
    } else if (cat.multiExport) {
      data = {};
      for (const name of cat.multiExport) {
        data[name] = mod[name];
      }
    }

    const jsonStr = JSON.stringify(data);
    fs.writeFileSync(path.join(DIST_DATA, cat.json), jsonStr);

    // Mirror to the tracked dev read-location so vitest/dev sees the same records as prod.
    // Pretty-printed there for readable diffs (dist stays minified for runtime size).
    let synced = false;
    if (SYNC_SRC) {
      fs.writeFileSync(path.join(SRC_DATA, cat.json), JSON.stringify(data, null, 2) + "\n");
      synced = true;
    }

    const sizeMB = (Buffer.byteLength(jsonStr) / 1024 / 1024).toFixed(2);
    console.log(`  OK   ${cat.json} — ${sizeMB} MB${synced ? " (+src)" : ""}`);
    return { json: cat.json, status: "ok", sizeMB };
  } catch (err) {
    console.error(`  FAIL ${cat.json} — ${err.message}`);
    return { json: cat.json, status: "error", error: err.message };
  } finally {
    // Cleanup temp file
    try { fs.unlinkSync(tmpOut); } catch {}
  }
}

// ── Main ──
console.log(
  `[build-catalog-json] Extracting ${CATALOGS.length} catalogs to dist/data/${SYNC_SRC ? " + src/data/ (--sync-src)" : ""}`
);
const start = Date.now();

const results = [];
for (const cat of CATALOGS) {
  results.push(await extractCatalog(cat));
}

const ok = results.filter((r) => r.status === "ok").length;
const elapsed = Date.now() - start;
console.log(`[build-catalog-json] Done: ${ok}/${CATALOGS.length} extracted in ${elapsed}ms`);
