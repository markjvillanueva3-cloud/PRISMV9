#!/usr/bin/env node
/**
 * generate-jm-die-customers.mjs — atomize the JM Die test-shop archive into
 * customer-keyed L8 nodes under a new L7 hub.
 *
 * Layout:
 *   L7  reg.jmdiecustomers                  (synth catalog root)
 *     L8  reg.jmdiecustomers.<slug>           (per-customer atomic)
 *
 * Source: H:/prism/JM DIE/<machine>/<customer>/*    (depth-2 walk)
 *   Top-level is machine/process (CNC LATHE, WIRE EDM, HAAS-HURCO, etc.)
 *   Second level is customer name. A customer can appear under multiple
 *   machines; we aggregate.
 *
 * Each customer node carries:
 *   * fileCount        — total programs across all machines
 *   * machineTags[]    — which top-level machine dirs they appear in
 *   * camSystemTags[]  — CAM systems inferred from file extensions
 *   * topExts          — extension distribution
 *
 * Edges:
 *   reg.jmdiecustomers      → reg.jmdiecustomers.<slug>  (contains)
 *   reg.jmdiecustomers.<slug> → reg.camsystemregistry.entry.<cam>  (uses_cam,
 *                                  optional — only if target node exists)
 *
 * Output: state/shared/system-viz/jm-die-customers-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const JM_ROOT = path.join(ROOT, "JM DIE");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const PARENT_ID = "reg.jmdiecustomers";
const TOP_CUSTOMER_CAP = 60;           // top N atomic nodes; rest aggregated
const MIN_FILES_PER_CUSTOMER = 3;
const MAX_WALK_DEPTH = 6;
const SLUG_NONALNUM = /[^a-z0-9._-]/g;
const SLUG_UNDERSCORE_RUN = /_+/g;

// File ext → CAM system. Conservative tagging — only canonical extensions.
const EXT_TO_CAM = {
  ".min": "mazak",            // canonical Mazak/Okuma lathe save (line-1 $<>%)
  ".min1": "mazak", ".min2": "mazak",
  ".mcx": "mastercam",
  ".mcx-8": "mastercam", ".mcx-9": "mastercam", ".mcx-7": "mastercam",
  ".mcam": "mastercam",
  ".ipt": "inventor",
  ".iam": "inventor",
  ".idw": "inventor",
  ".ipn": "inventor",
  ".f3d": "fusion360",
  ".f3z": "fusion360",
  ".sldprt": "solidworks", ".sldasm": "solidworks", ".slddrw": "solidworks",
  ".esp": "esprit",
  ".cps": "postprocessor",
  ".nc": "generic_gcode", ".nci": "generic_gcode", ".pgm": "generic_gcode",
  ".x_b": "parasolid",
  ".x_t": "parasolid",
  ".step": "neutral_cad", ".stp": "neutral_cad",
  ".iges": "neutral_cad", ".igs": "neutral_cad",
  ".stl": "mesh",
  ".dwg": "autocad", ".dxf": "autocad",
};

// Customer-name canonicalization
const SUFFIX_NORMALIZE = /\s+(group|inc\.?|corp\.?|corporation|company|co\.?|llc|fasteners?|products?|manufacturing|industries|mfg\.?)$/i;
const PREFIX_NORMALIZE = /^(anixter[-_\s]+)/i;

function slugifyCustomer(name) {
  let s = name.trim();
  s = s.replace(PREFIX_NORMALIZE, "");
  s = s.replace(SUFFIX_NORMALIZE, "");
  s = s.toLowerCase().replace(SLUG_NONALNUM, "_").replace(SLUG_UNDERSCORE_RUN, "_").replace(/^_|_$/g, "");
  return s;
}

function readDirSafe(d) {
  try { return fs.readdirSync(d, { withFileTypes: true }); }
  catch { return []; }
}

function walkCount(dir, depth = 0, acc = { count: 0, ext: {} }) {
  if (depth >= MAX_WALK_DEPTH) return acc;
  for (const e of readDirSafe(dir)) {
    const p = path.join(dir, e.name);
    if (e.isFile()) {
      acc.count++;
      const ext = path.extname(e.name).toLowerCase();
      acc.ext[ext] = (acc.ext[ext] || 0) + 1;
    } else if (e.isDirectory()) {
      walkCount(p, depth + 1, acc);
    }
  }
  return acc;
}

function generate() {
  if (!fs.existsSync(JM_ROOT)) return { error: "jm-die-missing", stats: {} };

  // Aggregate by customer slug
  const customers = new Map();   // slug → { rawNames:Set, fileCount, ext:{}, machines:Set }

  for (const machine of readDirSafe(JM_ROOT)) {
    if (!machine.isDirectory()) continue;
    const mdir = path.join(JM_ROOT, machine.name);
    // Some machine dirs have direct files (no customer-level), skip those for L8a
    for (const sub of readDirSafe(mdir)) {
      if (!sub.isDirectory()) continue;
      const slug = slugifyCustomer(sub.name);
      if (!slug) continue;
      // Filter dirs that don't look like real customers (single-purpose folders)
      if (/^(setups?|tooling|posts?|fixture|finalized|cad_files|cps|backup|old|new_folder|recycle|downloads|libraries|mcam_x8|mcam_x2|x[0-9]+|cmm|cnc_lathe_mods|programs|programs_mcam_x[0-9]+|tomek_programs|hyperCAD_S|hypermill|electrode)$/i.test(slug)) continue;
      const cust = customers.get(slug) || { rawNames: new Set(), fileCount: 0, ext: {}, machines: new Set(), exemplarPath: null };
      cust.rawNames.add(sub.name);
      cust.machines.add(machine.name);
      const r = walkCount(path.join(mdir, sub.name));
      cust.fileCount += r.count;
      if (!cust.exemplarPath && r.count > 0) cust.exemplarPath = `JM DIE/${machine.name}/${sub.name}`;
      for (const [k, v] of Object.entries(r.ext)) cust.ext[k] = (cust.ext[k] || 0) + v;
      customers.set(slug, cust);
    }
  }

  // Rank + cap
  const ranked = [...customers.entries()]
    .filter(([, c]) => c.fileCount >= MIN_FILES_PER_CUSTOMER)
    .sort((a, b) => b[1].fileCount - a[1].fileCount);

  const top = ranked.slice(0, TOP_CUSTOMER_CAP);
  const tail = ranked.slice(TOP_CUSTOMER_CAP);

  const graph = fs.existsSync(GRAPH) ? (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8"))) : { nodes: [] };
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  function addNode(n) {
    if (existingIds.has(n.id) || seenId.has(n.id)) return false;
    seenId.add(n.id);
    newNodes.push(n);
    return true;
  }
  function pushEdge(from, to, type, status, intensity) {
    newEdges.push({ from, to, type, status, intensity });
  }

  // Catalog root
  addNode({
    id: PARENT_ID, layer: "L7",
    subgroup: "jmdie_root",
    label: `jmdiecustomers\n(${ranked.length})`,
    status: "built", color: "#10b981",
    size: 1.0, tier: 2, synthetic: true,
  });

  let tailCount = 0;
  let tailFiles = 0;
  for (const [, c] of tail) {
    tailCount++;
    tailFiles += c.fileCount;
  }
  if (tailCount > 0) {
    addNode({
      id: `${PARENT_ID}.long_tail`,
      layer: "L8", subgroup: "jmdie_customer_aggregate",
      parent: PARENT_ID,
      label: `long_tail × ${tailCount}\n(${tailFiles} programs)`,
      status: "built", color: "#10b981",
      size: 0.35 + Math.log10(1 + tailFiles) * 0.08,
      tier: 3,
      customerCount: tailCount,
      fileCount: tailFiles,
    });
    pushEdge(PARENT_ID, `${PARENT_ID}.long_tail`, "contains", "active", 0.18);
  }

  const stats = {
    customersDiscovered: customers.size,
    customersWithFiles: ranked.length,
    topNodesEmitted: top.length,
    longTailCustomers: tailCount,
    longTailFiles: tailFiles,
    totalFiles: 0,
    perCustomer: [],
  };

  for (const [slug, c] of top) {
    const id = `${PARENT_ID}.${slug}`;
    const camSet = new Set();
    let mazakishFiles = 0, mastercamFiles = 0, inventorFiles = 0;
    for (const [ext, count] of Object.entries(c.ext)) {
      const cam = EXT_TO_CAM[ext];
      if (cam) camSet.add(cam);
      if (cam === "mazak") mazakishFiles += count;
      else if (cam === "mastercam") mastercamFiles += count;
      else if (cam === "inventor") inventorFiles += count;
    }
    stats.totalFiles += c.fileCount;
    const topExts = Object.entries(c.ext).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([e, n]) => ({ ext: e, count: n }));
    addNode({
      id, layer: "L8",
      subgroup: "jmdie_customer",
      parent: PARENT_ID,
      label: [...c.rawNames][0] || slug,
      status: "built",
      color: "#10b981",
      size: 0.30 + Math.log10(1 + c.fileCount) * 0.10,
      tier: 3,
      fileCount: c.fileCount,
      machines: [...c.machines],
      camSystems: [...camSet],
      topExts,
      exemplarPath: c.exemplarPath,
      rawNames: [...c.rawNames],
    });
    pushEdge(PARENT_ID, id, "contains", "active", 0.18);
    stats.perCustomer.push({ slug, fileCount: c.fileCount, machines: c.machines.size, cams: [...camSet] });

    // Optionally connect to existing reg.camsystemregistry entries
    for (const cam of camSet) {
      const camTargetId = `reg.camsystemregistry.entry.${cam}`;
      if (existingIds.has(camTargetId)) {
        pushEdge(id, camTargetId, "uses_cam", "active", 0.22);
      }
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes, newEdges, stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "jm-die-customers-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  customers discovered:    ${result.stats.customersDiscovered}`);
  console.log(`  customers w/ ≥3 files:   ${result.stats.customersWithFiles}`);
  console.log(`  atomic nodes (top):      ${result.stats.topNodesEmitted}`);
  console.log(`  long-tail customers:     ${result.stats.longTailCustomers}`);
  console.log(`  long-tail files:         ${result.stats.longTailFiles}`);
  console.log(`  files indexed (top):     ${result.stats.totalFiles}`);
  console.log(`  ── top 15 customers ──`);
  for (const p of result.stats.perCustomer.slice(0, 15)) {
    console.log(`    ${String(p.fileCount).padStart(6)}  ${p.slug.padEnd(20)}  machines=${p.machines}  cams=[${p.cams.join(",")}]`);
  }
}
