#!/usr/bin/env node
/**
 * generate-extracted-data-atomic.mjs — Phase 3a of the system-viz layer
 * saturation pass.
 *
 * When the original PRISM monolith was decomposed, the harvested vendor
 * knowledge (hyperMILL atoms, tribal tips, CAM workflows, API references,
 * Okuma program disassemblies, …) landed in aggregation JSON files under
 * `mcp-server/data/extracted-knowledge/**` and `mcp-server/data/box-extraction/**`.
 * In the viz those files showed up as ~5 opaque "root" nodes — the individual
 * records inside were invisible.
 *
 * This generator atomises them:
 *
 *   L7  extract.<source>                       (per-source hub, e.g. extract.hypermill)
 *     L8  extract.<source>.<file>                 (per-JSON-file node)
 *       L9  extract.<source>.<file>.<recordSlug>    (per-record atomic node)
 *
 * Record detection: if the JSON root is an array → that's the record list;
 * otherwise the largest array-valued property wins (atoms / tips / nodes /
 * results / ... ). Each record gets a stable slug from its `id` / `title` /
 * `name` / `filename` field (falls back to index). Records are capped per file
 * so a single 1000-entry catalog can't flood the graph; the cap is generous.
 *
 * Output: state/shared/system-viz/extracted-data-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

// Source roots to atomise. Each entry: { dir, hubPrefix, label, color }
const SOURCES = [
  { dir: "mcp-server/data/extracted-knowledge", hubPrefix: "extract", label: "Extracted Knowledge", color: "#f59e0b" },
  { dir: "mcp-server/data/box-extraction",      hubPrefix: "boxextract", label: "Box Extraction",     color: "#fb923c" },
];

const MAX_RECORDS_PER_FILE = 600;   // generous cap — biggest known file is ~434
const SECONDARY_ARRAY_MIN = 5;      // emit a section sub-node for every other array >= this size
const MAX_DEPTH = 4;
// Standalone monolith catalogs (not directory trees) handled after the SOURCES loop.
const PPG_CATALOG_REL = "mcp-server/data/ppg-asset-catalog.json";
const PPG_SECTION_CAP = { nc_programs: 800, cps_posts: 600, step_models: 200, prism_posts: 50 };
const SLUG_NONALNUM = /[^a-z0-9._-]/g;
// Property names that, when array-valued, are treated as the record list.
// Ranked: a file may have several arrays; we prefer these names, then fall
// back to "largest array".
const RECORD_KEY_PRIORITY = [
  "atoms", "tips", "warnings", "nodes", "edges", "records", "entries", "items",
  "results", "commands", "document_properties", "keyboard_shortcuts",
  "api_namespaces", "python_api_modules", "workbenches", "categories",
  "cycle_names", "order_of_operations", "sources", "languages", "gaps",
  "extraction_priority", "tools", "programs",
];
// Keys to skip when picking a "category" / "subcategory" hint from a record.
const HINT_KEYS = ["category", "subcategory", "type", "kind", "source", "vendor"];

function slug(s) {
  return String(s).toLowerCase().replace(SLUG_NONALNUM, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function recordLabel(r, i) {
  if (r && typeof r === "object") {
    for (const k of ["title", "name", "filename", "id", "label", "command", "shortcut", "property", "key", "term"]) {
      if (typeof r[k] === "string" && r[k].trim()) return r[k].trim();
    }
    // string-valued first field
    for (const k of Object.keys(r)) {
      if (typeof r[k] === "string" && r[k].trim() && r[k].length < 80) return r[k].trim();
    }
  }
  if (typeof r === "string") return r;
  return `record-${i}`;
}

function recordSlug(r, i) {
  if (r && typeof r === "object") {
    for (const k of ["id", "filename", "title", "name", "key", "command", "shortcut", "property"]) {
      if (typeof r[k] === "string" && r[k].trim()) return slug(r[k]);
    }
  }
  if (typeof r === "string" && r.trim()) return slug(r.slice(0, 60));
  return `r${i}`;
}

function recordHint(r) {
  if (!r || typeof r !== "object") return null;
  for (const k of HINT_KEYS) {
    if (typeof r[k] === "string" && r[k].trim()) return r[k].trim();
  }
  return null;
}

function pickRecordArray(json) {
  if (Array.isArray(json)) return { key: "(root)", arr: json };
  if (!json || typeof json !== "object") return null;
  // priority pass
  for (const k of RECORD_KEY_PRIORITY) {
    if (Array.isArray(json[k]) && json[k].length > 0) return { key: k, arr: json[k] };
  }
  // largest-array fallback
  let bestKey = null, bestArr = null;
  for (const k of Object.keys(json)) {
    if (Array.isArray(json[k]) && (!bestArr || json[k].length > bestArr.length)) { bestKey = k; bestArr = json[k]; }
  }
  if (bestArr && bestArr.length > 0) return { key: bestKey, arr: bestArr };
  return null;
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", stats: {} };
  const graph = JSON.parse(fs.readFileSync(GRAPH, "utf8"));
  const byId = new Set();
  for (const n of graph.nodes) byId.add(n.id);

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  function addNode(n) {
    if (byId.has(n.id) || seenId.has(n.id)) return false;
    seenId.add(n.id);
    newNodes.push(n);
    return true;
  }
  function pushEdge(from, to, type, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status: "active", intensity });
    return true;
  }

  const stats = {
    sources: 0, fileNodes: 0, recordNodes: 0, hubNodes: 0,
    parseFailures: 0, filesWithNoRecords: 0, perSource: {}, perFileTop: [],
  };

  function walkDir(absDir, depth) {
    if (depth > MAX_DEPTH) return [];
    let ents;
    try { ents = fs.readdirSync(absDir, { withFileTypes: true }); }
    catch { return []; }
    const out = [];
    for (const e of ents) {
      const p = path.join(absDir, e.name);
      if (e.isDirectory()) out.push(...walkDir(p, depth + 1));
      else if (e.isFile() && e.name.endsWith(".json")) out.push(p);
    }
    return out;
  }

  for (const src of SOURCES) {
    const absRoot = path.join(ROOT, src.dir);
    if (!fs.existsSync(absRoot)) continue;
    stats.sources++;
    const hubId = `${src.hubPrefix}_root`;
    // Root hub: if knowledge-galaxy already emitted "extracted_root" etc, reuse;
    // else create our own. We always create the per-vendor sub-hubs below.
    const perSrc = { files: 0, records: 0, vendors: new Set() };

    const files = walkDir(absRoot, 0);
    for (const fp of files) {
      let json;
      try { json = JSON.parse(fs.readFileSync(fp, "utf8")); }
      catch { stats.parseFailures++; continue; }
      const rel = path.relative(absRoot, fp).split(path.sep);
      // first path segment → vendor sub-hub; if file sits at root, use "misc"
      const vendor = rel.length > 1 ? rel[0] : "misc";
      const vendorSlug = slug(vendor);
      const vendorHubId = `${src.hubPrefix}.${vendorSlug}`;
      if (addNode({
        id: vendorHubId, layer: "L7",
        subgroup: `${src.hubPrefix}_vendor`,
        label: vendor, status: "built",
        color: src.color, size: 0.55, tier: 1,
        synthetic: true,
        sourceDir: src.dir,
      })) { stats.hubNodes++; perSrc.vendors.add(vendorSlug); }

      const fileStem = slug(path.basename(fp, ".json").replace(/-\d{10,}$/, ""));
      const fileNodeId = `${src.hubPrefix}.${vendorSlug}.${fileStem}`;
      const recPick = pickRecordArray(json);
      const recCount = recPick ? recPick.arr.length : 0;
      if (addNode({
        id: fileNodeId, layer: "L8",
        subgroup: `${src.hubPrefix}_file`,
        parent: vendorHubId,
        label: path.basename(fp).replace(/-\d{10,}(\.json)$/, "$1"),
        status: "built",
        color: src.color, size: 0.30 + Math.min(0.20, Math.log10(1 + recCount) * 0.06),
        tier: 2,
        ext: "json",
        file: path.relative(ROOT, fp).split(path.sep).join("/"),
        recordKey: recPick ? recPick.key : null,
        recordCount: recCount,
      })) { stats.fileNodes++; perSrc.files++; }
      pushEdge(vendorHubId, fileNodeId, "contains", 0.2);

      if (!recPick) { stats.filesWithNoRecords++; continue; }
      const arr = recPick.arr.slice(0, MAX_RECORDS_PER_FILE);
      const slugCounts = new Map();
      let emitted = 0;
      for (let i = 0; i < arr.length; i++) {
        const r = arr[i];
        let rs = recordSlug(r, i);
        // de-collide within this file
        if (slugCounts.has(rs)) { const c = slugCounts.get(rs) + 1; slugCounts.set(rs, c); rs = `${rs}_${c}`; }
        else slugCounts.set(rs, 1);
        const recId = `${fileNodeId}.${rs}`.slice(0, 200);
        const hint = recordHint(r);
        if (addNode({
          id: recId, layer: "L9",
          subgroup: `${src.hubPrefix}_record`,
          parent: fileNodeId,
          label: recordLabel(r, i).slice(0, 70),
          status: "built",
          color: src.color, size: 0.14, tier: 3,
          recordKind: recPick.key,
          hint: hint || undefined,
          vendor: vendorSlug,
        })) { stats.recordNodes++; perSrc.records++; emitted++; }
        pushEdge(fileNodeId, recId, "contains", 0.12);
      }
      stats.perFileTop.push({ file: path.relative(ROOT, fp).split(path.sep).join("/"), records: emitted, key: recPick.key });
      if (recPick.arr.length > MAX_RECORDS_PER_FILE) {
        // tag the file node so the viewer knows it was truncated
        const fn = newNodes.find(n => n.id === fileNodeId);
        if (fn) fn.recordCount = recPick.arr.length, fn.truncated = MAX_RECORDS_PER_FILE;
      }

      // Secondary arrays — every other array-valued property >= SECONDARY_ARRAY_MIN
      // gets its own section sub-node, with its records under it. This recovers the
      // ~600 records the "biggest array only" pass dropped (e.g. hyperMILL
      // knowledge-graph edges, hyperMILL-API tool/feature properties, Mastercam
      // parameter_guidance/procedures/high_speed_machining).
      if (json && typeof json === "object" && !Array.isArray(json)) {
        for (const [arrKey, arrVal] of Object.entries(json)) {
          if (!Array.isArray(arrVal) || arrVal.length < SECONDARY_ARRAY_MIN) continue;
          if (recPick && arrKey === recPick.key) continue;
          const secId = `${fileNodeId}.${slug(arrKey)}`;
          if (addNode({
            id: secId, layer: "L8", subgroup: `${src.hubPrefix}_section`,
            parent: fileNodeId, label: arrKey, status: "built",
            color: src.color, size: 0.22, tier: 2,
            recordKind: arrKey, recordCount: arrVal.length,
          })) stats.fileNodes++;
          pushEdge(fileNodeId, secId, "contains", 0.15);
          const sa = arrVal.slice(0, MAX_RECORDS_PER_FILE);
          const scSlugs = new Map();
          for (let i = 0; i < sa.length; i++) {
            const r = sa[i];
            let rs = recordSlug(r, i);
            if (scSlugs.has(rs)) { const c = scSlugs.get(rs) + 1; scSlugs.set(rs, c); rs = `${rs}_${c}`; }
            else scSlugs.set(rs, 1);
            const recId = `${secId}.${rs}`.slice(0, 200);
            if (addNode({
              id: recId, layer: "L9", subgroup: `${src.hubPrefix}_record`,
              parent: secId, label: recordLabel(r, i).slice(0, 70), status: "built",
              color: src.color, size: 0.13, tier: 3,
              recordKind: arrKey, hint: recordHint(r) || undefined, vendor: vendorSlug,
            })) { stats.recordNodes++; perSrc.records++; }
            pushEdge(secId, recId, "contains", 0.1);
          }
          if (arrVal.length > MAX_RECORDS_PER_FILE) {
            const sn = newNodes.find(n => n.id === secId);
            if (sn) sn.truncated = MAX_RECORDS_PER_FILE;
          }
        }
      }
    }
    perSrc.vendors = perSrc.vendors.size;
    stats.perSource[src.hubPrefix] = perSrc;
  }

  // PPG asset catalog — a standalone monolith inventorying every deliverable
  // post-processor asset: CPS posts, NC programs, STEP models, PRISM posts.
  // None of these surfaced in the viz before. Each asset class becomes an L8
  // section under one L7 hub; each asset becomes an L9 record.
  {
    const ppgAbs = path.join(ROOT, PPG_CATALOG_REL);
    if (fs.existsSync(ppgAbs)) {
      let ppg = null;
      try { ppg = JSON.parse(fs.readFileSync(ppgAbs, "utf8")); } catch { ppg = null; }
      if (ppg && typeof ppg === "object" && !Array.isArray(ppg)) {
        const hubId = "ppg.assets";
        if (addNode({
          id: hubId, layer: "L7", subgroup: "ppg_assets_hub",
          label: "PPG Asset Catalog", status: "built",
          color: "#0ea5e9", size: 0.6, tier: 1, synthetic: true,
          file: PPG_CATALOG_REL,
        })) stats.hubNodes++;
        const ppgStat = { sections: 0, records: 0 };
        for (const [secKey, arr] of Object.entries(ppg)) {
          if (!Array.isArray(arr) || arr.length === 0) continue;
          const secId = `ppg.assets.${slug(secKey)}`;
          if (addNode({
            id: secId, layer: "L8", subgroup: "ppg_assets_section",
            parent: hubId, label: secKey, status: "built",
            color: "#0ea5e9", size: 0.30 + Math.min(0.20, Math.log10(1 + arr.length) * 0.06),
            tier: 2, recordKind: secKey, recordCount: arr.length,
          })) { stats.fileNodes++; ppgStat.sections++; }
          pushEdge(hubId, secId, "contains", 0.2);
          const cap = PPG_SECTION_CAP[secKey] || MAX_RECORDS_PER_FILE;
          const sl = arr.slice(0, cap);
          const sc = new Map();
          for (let i = 0; i < sl.length; i++) {
            const r = sl[i];
            let rs = recordSlug(r, i);
            if (sc.has(rs)) { const c = sc.get(rs) + 1; sc.set(rs, c); rs = `${rs}_${c}`; }
            else sc.set(rs, 1);
            const recId = `${secId}.${rs}`.slice(0, 200);
            if (addNode({
              id: recId, layer: "L9", subgroup: "ppg_asset_record",
              parent: secId, label: recordLabel(r, i).slice(0, 70), status: "built",
              color: "#0ea5e9", size: 0.12, tier: 3,
              recordKind: secKey,
              hint: (r && (r.vendor || r.controller || r.machine_hint)) || undefined,
            })) { stats.recordNodes++; ppgStat.records++; }
            pushEdge(secId, recId, "contains", 0.1);
          }
          if (arr.length > cap) {
            const sn = newNodes.find(n => n.id === secId);
            if (sn) sn.truncated = cap;
          }
        }
        stats.perSource.ppgAssets = ppgStat;
      }
    }
  }

  stats.perFileTop.sort((a, b) => b.records - a.records);
  stats.perFileTop = stats.perFileTop.slice(0, 15);

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes, newEdges, stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "extracted-data-atomic-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) { console.log(`  error: ${result.error}`); }
else {
  const s = result.stats;
  console.log(`  sources scanned:    ${s.sources}`);
  console.log(`  vendor hub nodes:   ${s.hubNodes}`);
  console.log(`  file nodes:         ${s.fileNodes}`);
  console.log(`  record nodes (L9):  ${s.recordNodes}`);
  console.log(`  parse failures:     ${s.parseFailures}`);
  console.log(`  files w/ no records:${s.filesWithNoRecords}`);
  console.log(`  total new nodes:    ${result.newNodes.length}`);
  console.log(`  total new edges:    ${result.newEdges.length}`);
  console.log(`  ── per source ──`);
  for (const [k, v] of Object.entries(s.perSource)) {
    console.log(`    ${k.padEnd(12)} files=${v.files}  records=${v.records}  vendors=${v.vendors}`);
  }
  console.log(`  ── top files by record count ──`);
  for (const f of s.perFileTop) console.log(`    ${String(f.records).padStart(4)}  ${f.key.padEnd(22)} ${f.file}`);
}
