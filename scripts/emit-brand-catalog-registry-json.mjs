#!/usr/bin/env node
/**
 * emit-brand-catalog-registry-json.mjs -- emit the 72K-tool brand catalog as TRACKED ToolRegistry
 * `.json` shards so the EXISTING POST /api/v1/data/tool/search route + the EXISTING frontend
 * "Search tool catalog (75K+ tools)" field serve the real corpus. (slot:romeo, BRAND-CATALOG-APP-WIRING)
 *
 * WHY: ToolRegistry.load() (mcp-server/src/registries/ToolRegistry.ts) auto-ingests every `.json`
 * under DATA_DIR/tools (= H:/prism/data/tools) into the CuttingTool schema, and routes/data.ts:60
 * serves `toolRegistry.search()`. Writing the brand corpus there is the whole wire -- no route,
 * registry, or frontend edit. One shard per brand keeps the artifact diffable (a brand refresh
 * touches one file) and matches the per-brand CAM lane structure. This RESOLVES the durability gap
 * the upstream spec flagged (the CAM lane files are gitignored; these registry shards are tracked).
 *
 * Idempotent: clears prior `brand-catalog__*.json` then rewrites, so a shrunk brand set never
 * leaves a stale shard. Namespaced ids (BC::<slug>::<id>) can never collide with existing tools.
 *
 * Usage:
 *   node scripts/emit-brand-catalog-registry-json.mjs            # emit into H:/prism/data/tools
 *   node scripts/emit-brand-catalog-registry-json.mjs --dry-run  # count only, write nothing
 *   node scripts/emit-brand-catalog-registry-json.mjs --out <dir> [--stamp <iso>]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrandCatalog } from "./lib/brand-tool-catalog.mjs";
import { toCuttingTool, brandSlug, BRAND_CATALOG_SOURCE } from "./lib/brand-catalog-to-cuttingtool.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Default emit target == ToolRegistry's DATA_DIR/tools load path (PRISM_ROOT/data/tools). */
export const DEFAULT_TOOLS_DIR = path.resolve(HERE, "../data/tools");
const SHARD_PREFIX = "brand-catalog__";

/** Remove all prior brand-catalog shards in `dir` (idempotent re-emit; handles brand-set shrink). */
function clearPriorShards(dir) {
  let removed = 0;
  if (!fs.existsSync(dir)) return removed;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(SHARD_PREFIX) && f.endsWith(".json")) {
      fs.rmSync(path.join(dir, f));
      removed++;
    }
  }
  return removed;
}

/**
 * Emit the brand catalog as registry JSON shards.
 *
 * @param {object} [opts]
 * @param {string} [opts.outDir]   target dir (default DEFAULT_TOOLS_DIR)
 * @param {boolean} [opts.dryRun]  count only, write nothing
 * @param {string} [opts.stampedAt] ISO timestamp stamped as each tool's last_updated
 * @param {Array}  [opts.records]  pre-loaded canonical records (default: loadBrandCatalog())
 * @returns {{outDir, totalRecords, totalTools, skipped, brands, shards, removed, dryRun}}
 */
export function emitRegistryJson(opts = {}) {
  const outDir = opts.outDir || DEFAULT_TOOLS_DIR;
  const stampedAt = opts.stampedAt || new Date().toISOString();
  // loadBrandCatalog() returns {records, byBrand, ...}; tests pass a bare array. Accept either.
  // An EXPLICITLY-passed records (even null/garbage) is validated below -- only a fully absent
  // `records` key triggers the live load, so a broken `records:null` still fails loud.
  const raw = "records" in opts ? opts.records : loadBrandCatalog();
  const records = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.records) ? raw.records : raw);
  if (!Array.isArray(records) || records.length === 0) {
    // fail loud: an empty corpus means the loader broke -- never silently emit nothing (R12).
    throw new Error(`emit-brand-catalog-registry-json: loadBrandCatalog returned ${Array.isArray(records) ? "0" : "non-array"} records`);
  }

  // group canonical records by brand slug
  const bySlug = new Map();
  for (const rec of records) {
    const slug = brandSlug(rec?.brand);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(rec);
  }

  let totalTools = 0;
  let skipped = 0;
  let diameterSuppressed = 0; // records whose implausible diameter was dropped (R12 -- surfaced, not silent)
  const shards = [];
  for (const [slug, recs] of [...bySlug.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const tools = [];
    for (const rec of recs) {
      // count only records where an actual positive diameter was dropped (honest to the label):
      // a geometry_plausible:false record with no parsed diameter had nothing to suppress.
      if (rec && rec.geometry_plausible === false &&
          typeof rec.diameter_mm === "number" && Number.isFinite(rec.diameter_mm) && rec.diameter_mm > 0) {
        diameterSuppressed++;
      }
      const t = toCuttingTool(rec, { stampedAt });
      if (t) tools.push(t);
      else skipped++;
    }
    if (tools.length === 0) continue;
    totalTools += tools.length;
    shards.push({
      slug,
      file: `${SHARD_PREFIX}${slug}.json`,
      count: tools.length,
      brand: String(recs.find((r) => r?.brand)?.brand ?? slug),
      tools,
    });
  }

  let removed = 0;
  if (!opts.dryRun) {
    fs.mkdirSync(outDir, { recursive: true });
    removed = clearPriorShards(outDir);
    for (const s of shards) {
      const payload = {
        category: BRAND_CATALOG_SOURCE,
        source: BRAND_CATALOG_SOURCE,
        brand: s.brand,
        slug: s.slug,
        generatedAt: stampedAt,
        count: s.count,
        tools: s.tools,
      };
      fs.writeFileSync(path.join(outDir, s.file), JSON.stringify(payload));
    }
  }

  return {
    outDir,
    totalRecords: records.length,
    totalTools,
    skipped,
    diameterSuppressed,
    brands: shards.length,
    shards: shards.map(({ slug, file, count, brand }) => ({ slug, file, count, brand })),
    removed,
    dryRun: !!opts.dryRun,
  };
}

/** CLI */
function parseArgs(argv) {
  const a = { dryRun: argv.includes("--dry-run") };
  const outIdx = argv.indexOf("--out");
  if (outIdx >= 0 && argv[outIdx + 1]) a.outDir = path.resolve(argv[outIdx + 1]);
  const stampIdx = argv.indexOf("--stamp");
  if (stampIdx >= 0 && argv[stampIdx + 1]) a.stampedAt = argv[stampIdx + 1];
  return a;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const r = emitRegistryJson(parseArgs(process.argv.slice(2)));
    const head = r.dryRun ? "[dry-run] would emit" : "emitted";
    console.log(`${head} ${r.totalTools} tools across ${r.brands} brand shards -> ${r.outDir}`);
    console.log(`  source records: ${r.totalRecords} | skipped (no id): ${r.skipped} | implausible-diameter dropped: ${r.diameterSuppressed} | prior shards removed: ${r.removed}`);
    for (const s of r.shards) console.log(`  ${s.file.padEnd(34)} ${String(s.count).padStart(6)}  (${s.brand})`);
    process.exit(0);
  } catch (e) {
    console.error(`emit-brand-catalog-registry-json FAILED: ${e.message}`);
    process.exit(1);
  }
}
