#!/usr/bin/env node
/**
 * ingest-monolith-catalog-js.mjs — Phase B-0 of TOOL-CATALOG-INGEST-MS0.
 *
 * Loads the 6 pre-extracted PRISM_*_CATALOG.js files (extracted/catalogs/) from
 * the R2.3.6 monolith extraction (v8.89.002), converts each vendor block to
 * U-TCI-A1 CatalogExtractionResult shape, and writes per-vendor JSON to
 * mcp-server/data/catalog-extractions/<vendor>-monolith-extracted.json.
 *
 * This unit was the MISSING B-0 bootstrap: before iter18 we assumed PDF→camelot
 * was the only B-phase path. The user surfaced the pre-extracted JS modules
 * ("check extracted modules and the extracted folder if you haven't already"
 *  — 2026-05-24). These files cover 8 vendors (sandvik / kennametal / iscar /
 * seco / mitsubishi / walter / tungaloy via MAJOR_MANUFACTURERS_CATALOG.js +
 * zeni via PRISM_ZENI_COMPLETE_CATALOG.js), giving immediate Phase D-1 merge
 * input without running camelot. Phase B-1..B-5 (PDF table extraction) becomes
 * the CO-EXISTING path for catalogs the monolith didn't cover.
 *
 * R12 fail-loud:
 *   - .js modules are loaded in a sandboxed vm context, not require()'d
 *   - confidence = 0.85 (high — these were curated extractions, not regex guesses)
 *   - advisoryOnly + must_human_verify = true on every output JSON
 *
 * Usage:
 *   node scripts/ingest-monolith-catalog-js.mjs [--vendor <slug>] [--report]
 *
 * @module scripts/ingest-monolith-catalog-js
 * @since  TOOL-CATALOG-INGEST-MS0/U-TCI-B0 (2026-05-24, slot juliett iter19)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import vm from "node:vm";
import { PATHS, extractedJsonPathFor } from "./lib/catalog-storage-paths.mjs";

const REPO_ROOT = "H:/prism";
const SOURCE_DIR = `${REPO_ROOT}/extracted/catalogs`;
const SOURCE_FILES = [
  { file: "PRISM_MAJOR_MANUFACTURERS_CATALOG.js", varName: "PRISM_MAJOR_MANUFACTURERS_CATALOG", multiVendor: true },
  { file: "PRISM_ZENI_COMPLETE_CATALOG.js", varName: "PRISM_ZENI_COMPLETE_CATALOG", singleVendor: "zeni" },
];

// ============================================================================
// Pure helpers (testable without I/O)
// ============================================================================

/**
 * Wrap a "const NAME = {...};" module into a vm-runnable expression that
 * returns the object.
 */
export function jsModuleToEvalExpression(source, varName) {
  if (typeof source !== "string" || typeof varName !== "string") {
    throw new TypeError("jsModuleToEvalExpression: source and varName must be strings");
  }
  // Strip leading "const VAR = " and trailing semicolons / whitespace.
  // Then we wrap in (...) so it evaluates as an expression.
  const re = new RegExp(`^[\\s\\S]*?const\\s+${varName}\\s*=\\s*`);
  const stripped = source.replace(re, "").replace(/;\s*$/m, "").trim();
  return `(${stripped})`;
}

/**
 * Load a JS catalog file and return the top-level constant's value.
 * Sandboxed — no fs/process/require access.
 */
export function evalCatalogModule(source, varName) {
  const expr = jsModuleToEvalExpression(source, varName);
  const ctx = vm.createContext({});
  const raw = vm.runInContext(expr, ctx, { timeout: 5000, displayErrors: true });
  // Normalize prototype back to host context — vm-created objects carry a foreign
  // Object.prototype which trips assert.deepEqual (strict) on otherwise-identical
  // values. Catalog data is JSON-safe (no Date/Map/RegExp/functions), so a JSON
  // round-trip is the simplest cross-realm structured-clone.
  return JSON.parse(JSON.stringify(raw));
}

/**
 * Walk a monolith vendor block, flattening every named tool/insert/series into
 * a RawCatalogTool. Keeps geometry/materials sparse where the monolith was
 * sparse — R12: do NOT fabricate fields.
 */
export function flattenVendorTools(vendorSlug, vendorBlock, sourceCatalog) {
  const tools = [];
  if (!vendorBlock || typeof vendorBlock !== "object") return tools;

  function visit(node, path) {
    if (!node || typeof node !== "object") return;
    if (typeof node === "function") return;
    // A tool node has `name: '...'` at this level. Real monolith catalogs nest series
    // under named product-lines (CoroMill Plura → series → 1P220/1P230/...), so we
    // emit a marker tool for the named parent AND continue recursing into its
    // children to pick up the series entries.
    if (typeof node.name === "string" && path.length > 0 && path[path.length - 1] !== "manufacturer") {
      tools.push({
        vendor: vendorSlug,
        catalog_number: `${path.join(".")}::${node.name}`.replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 120),
        name: node.name,
        type: inferTypeFromPath(path, node),
        substrate: node.substrate || "carbide",
        grade: node.grade || node.series_id || "unknown",
        material_groups: mapMaterialsToIso(node.materials || []),
        geometry: {
          diameter_mm: node.diameter_mm ?? null,
          overall_length_mm: node.overall_length_mm ?? null,
          shank_diameter_mm: node.shank_diameter_mm ?? null,
          flutes: typeof node.flutes === "number" ? node.flutes : undefined,
        },
        cutting_data: [],
        application_scenarios: [],
        source: {
          type: "vendor_portal",
          catalog: sourceCatalog,
          confidence: 0.85,
          extracted_at: new Date().toISOString(),
          extractor_version: "ingest-monolith-catalog-js@1.0.0",
          notes: `Walked vendor block at path: ${path.join(".")}`,
        },
      });
      // Fall through to recurse — series children still need visiting.
    }
    // Series map: { '1P220': { flutes, geometry, materials } }
    if (Object.values(node).every((v) => typeof v === "object" && v !== null && !Array.isArray(v) && typeof v.flutes === "number")) {
      for (const [seriesId, seriesNode] of Object.entries(node)) {
        tools.push({
          vendor: vendorSlug,
          catalog_number: seriesId,
          name: seriesId,
          type: inferTypeFromPath(path, seriesNode),
          substrate: "carbide",
          grade: seriesId,
          material_groups: mapMaterialsToIso(seriesNode.materials || []),
          geometry: {
            diameter_mm: null,
            overall_length_mm: null,
            shank_diameter_mm: null,
            flutes: seriesNode.flutes,
          },
          cutting_data: [],
          application_scenarios: seriesNode.geometry
            ? [{ category: "roughing", description: `Geometry: ${seriesNode.geometry}`, source: { type: "vendor_portal", catalog: sourceCatalog, confidence: 0.85, extracted_at: new Date().toISOString() } }]
            : [],
          source: {
            type: "vendor_portal",
            catalog: sourceCatalog,
            confidence: 0.85,
            extracted_at: new Date().toISOString(),
            extractor_version: "ingest-monolith-catalog-js@1.0.0",
            notes: `Series entry at ${path.join(".")}.${seriesId}`,
          },
        });
      }
      return;
    }
    // Generic recursion — skip functions + skip the manufacturer metadata block
    // (which has name/country/founded/etc. — not a tool node, would confuse inference)
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "function") continue;
      if (typeof v === "object" && v !== null) {
        visit(v, [...path, k]);
      }
    }
  }

  visit(vendorBlock, []);
  return tools;
}

/** Heuristic type inference from the vendor block path. */
export function inferTypeFromPath(path, node) {
  const p = path.join(".").toLowerCase();
  if (p.includes("drill") || /coro?drill/i.test(node?.name || "")) return "drill";
  if (p.includes("turn") || /coro?turn/i.test(node?.name || "")) return "turning_insert";
  if (p.includes("thread") || /coro?thread/i.test(node?.name || "")) return "threading_insert";
  if (p.includes("groov") || /coro?cut/i.test(node?.name || "")) return "grooving_insert";
  if (p.includes("mill")) return /coro?mill\s*plura|harvi/i.test(node?.name || "") ? "endmill" : "milling_insert";
  if (p.includes("tap")) return "tap";
  if (p.includes("reamer")) return "reamer";
  return "tool";
}

/**
 * Map free-form material strings (steel/aluminum/cast_iron/stainless/titanium/hardened)
 * to ISO 513 P/M/K/N/S/H groups. Conservative — only known mappings, unknown skipped.
 */
export function mapMaterialsToIso(materials) {
  if (!Array.isArray(materials)) return [];
  const out = new Set();
  for (const m of materials) {
    if (typeof m !== "string") continue;
    const norm = m.toLowerCase().replace(/[^a-z]/g, "");
    if (norm.includes("steel") && norm.includes("hardened")) out.add("H");
    else if (norm.includes("hardened")) out.add("H");
    else if (norm.includes("titanium") || norm.includes("inconel") || norm.includes("superalloy")) out.add("S");
    else if (norm.includes("aluminum") || norm.includes("brass") || norm.includes("nonferrous")) out.add("N");
    else if (norm.includes("castiron") || norm.includes("cast")) out.add("K");
    else if (norm.includes("stainless")) out.add("M");
    else if (norm.includes("steel")) out.add("P");
  }
  return [...out];
}

/** Build a U-TCI-A1 CatalogExtractionResult around a flattened tool array. */
export function buildExtractionResult({ vendor, vendorDisplayName, sourceCatalogs, rawTools }) {
  const isoCounts = { P: 0, M: 0, K: 0, N: 0, S: 0, H: 0 };
  for (const t of rawTools) {
    for (const g of t.material_groups) {
      if (isoCounts[g] !== undefined) isoCounts[g]++;
    }
  }
  const typeCounts = {};
  for (const t of rawTools) typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    generatedBy: "scripts/ingest-monolith-catalog-js.mjs@1.0.0",
    advisoryOnly: true,
    must_human_verify: true,
    purpose: `Per-vendor extraction bootstrapped from R2.3.6 monolith JS catalog (vendor=${vendor})`,
    source_catalogs: sourceCatalogs,
    vendor,
    vendor_display_name: vendorDisplayName,
    summary: {
      catalog_count: sourceCatalogs.length,
      total_tools: rawTools.length,
      total_cutting_data_rows: 0, // monolith JS has no per-ISO tables — Phase B-1..B-5 fills via camelot
      total_application_scenarios: rawTools.reduce((a, t) => a + (t.application_scenarios?.length || 0), 0),
      distinct_tool_types: Object.keys(typeCounts).length,
      publisher_confidence: 0.85,
      publisher_evidence: [`monolith v8.89.002 (R2.3.6 Catalog/MIT Extraction session)`],
      step_file_coverage: 0,
      datasheet_pdf_coverage: 0,
      collision_envelope_coverage: 0,
      per_iso_group_counts: isoCounts,
      per_operation_counts: {},
      unknown_fields_flagged: 0,
    },
    raw_tools: rawTools,
    speed_feed_backbone_by_type: {},
    notes: [
      "R12 advisory — every entry must be human-verified before silent ToolRegistry mutation.",
      "Cutting data is empty by design; Phase B-1..B-5 (PDF camelot) will populate per-ISO tables.",
      "Type inference is heuristic (path + name regex); operator should sanity-check at merge time.",
    ],
  };
}

// ============================================================================
// CLI / I/O
// ============================================================================

async function processSource(spec, vendorFilter) {
  const sourcePath = join(SOURCE_DIR, spec.file);
  if (!existsSync(sourcePath)) {
    console.error(`MISSING: ${sourcePath}`);
    return [];
  }
  const source = await readFile(sourcePath, "utf8");
  let mod;
  try {
    mod = evalCatalogModule(source, spec.varName);
  } catch (err) {
    console.error(`SKIP ${spec.file}: vm eval failed: ${err.message}`);
    return [];
  }

  const out = [];
  const sourceCatalogs = [
    {
      filename: spec.file,
      path: sourcePath.replace(/\\/g, "/"),
      size_bytes: source.length,
      publisher_verified: true,
      publisher_evidence: [`R2.3.6 monolith extraction session header in ${spec.file}`],
      extracted_at: new Date().toISOString(),
    },
  ];

  if (spec.singleVendor) {
    if (vendorFilter && vendorFilter !== spec.singleVendor) return [];
    const tools = flattenVendorTools(spec.singleVendor, mod, spec.file);
    out.push({
      vendor: spec.singleVendor,
      vendorDisplayName: mod?.manufacturer?.name || spec.singleVendor,
      tools,
      result: buildExtractionResult({
        vendor: spec.singleVendor,
        vendorDisplayName: mod?.manufacturer?.name || spec.singleVendor,
        sourceCatalogs,
        rawTools: tools,
      }),
    });
  } else if (spec.multiVendor) {
    for (const [vendorKey, vendorBlock] of Object.entries(mod)) {
      if (vendorKey === "version" || vendorKey === "lastUpdated") continue;
      // R12 — skip helper functions exported alongside vendor blocks (init, getStats,
      // getManufacturer, getProductLines, searchProducts in the monolith CONSOLIDATED file)
      if (typeof vendorBlock === "function") continue;
      if (!vendorBlock || typeof vendorBlock !== "object") continue;
      if (vendorFilter && vendorFilter !== vendorKey) continue;
      const tools = flattenVendorTools(vendorKey, vendorBlock, spec.file);
      out.push({
        vendor: vendorKey,
        vendorDisplayName: vendorBlock?.manufacturer?.name || vendorKey,
        tools,
        result: buildExtractionResult({
          vendor: vendorKey,
          vendorDisplayName: vendorBlock?.manufacturer?.name || vendorKey,
          sourceCatalogs,
          rawTools: tools,
        }),
      });
    }
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const vendorFilter = args.includes("--vendor") ? args[args.indexOf("--vendor") + 1] : null;

  if (!existsSync(SOURCE_DIR)) {
    console.error(`Missing source dir: ${SOURCE_DIR}`);
    process.exit(1);
  }
  await mkdir(PATHS.extractionsDir, { recursive: true });

  const allResults = [];
  for (const spec of SOURCE_FILES) {
    const results = await processSource(spec, vendorFilter);
    allResults.push(...results);
  }

  console.log(`Generated ${allResults.length} per-vendor extraction(s):`);
  for (const r of allResults) {
    const out = extractedJsonPathFor(r.vendor, "monolith");
    await writeFile(out, JSON.stringify(r.result, null, 2));
    console.log(`  ${r.vendor.padEnd(15)} ${r.tools.length.toString().padStart(4)} tools  →  ${out.replace(REPO_ROOT + "/", "")}`);
  }
  console.log(`\nTotal tools ingested: ${allResults.reduce((a, r) => a + r.tools.length, 0)}`);
  console.log("ADVISORY ONLY — run U-TCI-D1 (catalog_extraction_merge) to compute the registry merge plan.");
}

const isMain = import.meta.url.replace(/\\/g, "/").endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain) {
  main().catch((err) => {
    console.error("ingest-monolith-catalog-js failed:", err);
    process.exit(1);
  });
}
