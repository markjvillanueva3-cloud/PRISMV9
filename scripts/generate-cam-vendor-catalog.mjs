#!/usr/bin/env node
/**
 * generate-cam-vendor-catalog.mjs — atomize the CAM + CAD vendor function
 * catalogs into hierarchical L7/L8 nodes:
 *
 *   L7  reg.camfunctioncatalog            (synth parent)
 *     L7  reg.camfunctioncatalog.<vendor>    (vendor rollup — 27 CAM vendors)
 *       L8  reg.camfunctioncatalog.<vendor>.<func>   (per-function entry)
 *
 * Each per-function entry counts sub-entries inside the JSON (training_topics,
 * categories, sources, menus, modules) so the viz can show "richness" via
 * node size. Files larger than 30 KB get tier=2 (high-detail).
 *
 * Output: state/shared/system-viz/cam-vendor-catalog-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");

const CATALOGS = [
  { tag: "camfunction", root: "mcp-server/data/cam-functions", color: "#fb923c" },
  { tag: "cadfunction", root: "mcp-server/data/cad-functions", color: "#22d3ee" },
  { tag: "camui",       root: "mcp-server/data/cam-ui",        color: "#f472b6" },
];

const SIZE_TIER_BYTES = 30_000;
const NESTED_ARRAY_KEYS = ["training_topics", "categories", "sources", "menus", "modules", "physics_formulas_linked", "operations", "functions", "subgroups", "tools"];

function countSubEntries(jsonObj) {
  if (Array.isArray(jsonObj)) return jsonObj.length;
  if (typeof jsonObj !== "object" || !jsonObj) return 0;
  let best = 0;
  for (const k of NESTED_ARRAY_KEYS) {
    if (Array.isArray(jsonObj[k])) best = Math.max(best, jsonObj[k].length);
  }
  if (best === 0) best = Object.keys(jsonObj).length;
  return best;
}

function generate() {
  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  const stats = { catalogs: 0, vendors: 0, files: 0, subEntries: 0, perCatalog: {} };

  for (const cat of CATALOGS) {
    const dir = path.join(ROOT, cat.root);
    if (!fs.existsSync(dir)) continue;
    stats.catalogs++;
    const catParent = `reg.${cat.tag}catalog`;
    if (!seenId.has(catParent)) {
      seenId.add(catParent);
      newNodes.push({
        id: catParent, layer: "L7",
        subgroup: "catalog_root",
        label: `${cat.tag} catalog`, status: "built",
        color: cat.color, size: 0.85, tier: 2, synthetic: true,
      });
    }
    let vendorEntries;
    try { vendorEntries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    const perCatalog = { vendors: 0, files: 0, subEntries: 0 };
    for (const v of vendorEntries) {
      if (!v.isDirectory()) continue;
      const vendor = v.name.toLowerCase();
      const vendorDir = path.join(dir, v.name);
      let files;
      try { files = fs.readdirSync(vendorDir).filter(f => f.endsWith(".json")); }
      catch { continue; }
      if (files.length === 0) continue;
      stats.vendors++;
      perCatalog.vendors++;
      const vendorId = `${catParent}.${vendor}`;
      seenId.add(vendorId);
      newNodes.push({
        id: vendorId, layer: "L7",
        subgroup: "catalog_vendor",
        parent: catParent,
        label: vendor, status: "built",
        color: cat.color, size: 0.55 + Math.sqrt(files.length) * 0.04, tier: 2,
      });
      pushEdge(catParent, vendorId, "contains", "active", 0.18);

      for (const file of files) {
        const stem = file.replace(/\.json$/, "").toLowerCase();
        const id = `${vendorId}.${stem.replace(/[^a-z0-9._-]/g, "_")}`;
        if (seenId.has(id)) continue;
        seenId.add(id);
        const abs = path.join(vendorDir, file);
        let sizeBytes = 0;
        let subEntries = 0;
        try {
          sizeBytes = fs.statSync(abs).size;
          subEntries = countSubEntries(JSON.parse(fs.readFileSync(abs, "utf8")));
        } catch { /* noop */ }
        stats.files++;
        stats.subEntries += subEntries;
        perCatalog.files++;
        perCatalog.subEntries += subEntries;
        const tier = sizeBytes >= SIZE_TIER_BYTES ? 2 : 3;
        newNodes.push({
          id, layer: "L8",
          subgroup: "catalog_function",
          parent: vendorId,
          label: stem, status: "built",
          color: cat.color, size: 0.25 + Math.log10(1 + subEntries) * 0.10,
          tier, ext: "json",
          sizeBytes,
          subEntryCount: subEntries,
          file: path.relative(ROOT, abs).split(path.sep).join("/"),
        });
        pushEdge(vendorId, id, "contains", "active", 0.18);
      }
    }
    stats.perCatalog[cat.tag] = perCatalog;
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes, newEdges, stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "cam-vendor-catalog-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
console.log(`  catalogs:      ${result.stats.catalogs}`);
console.log(`  vendors:       ${result.stats.vendors}`);
console.log(`  function-files:${result.stats.files}`);
console.log(`  sub-entries:   ${result.stats.subEntries}`);
console.log(`  ── per-catalog ──`);
for (const [k, v] of Object.entries(result.stats.perCatalog)) {
  console.log(`    ${k.padEnd(14)} vendors=${v.vendors} files=${v.files} entries=${v.subEntries}`);
}
