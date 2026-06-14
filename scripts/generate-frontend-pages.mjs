#!/usr/bin/env node
/**
 * generate-frontend-pages.mjs — drill the rollup blobs `fe.pages.<cluster>`
 * into per-page atomic L1 children so the viz can show each individual
 * React page as its own node.
 *
 * Source: filesystem walk of `mcp-server/web/src/pages/*.tsx`.
 * Cluster classifier: same `pageCluster()` regex used by generate-system-viz.mjs
 * (kept inline here so the two stay in lockstep without an import cycle).
 *
 * Each emitted page node:
 *   {
 *     id: `fe.page.<slug>`,
 *     parent: `fe.pages.<cluster>`,    // re-roosts under the existing rollup
 *     layer: "L1",
 *     subgroup: "page",
 *     label: <name without .tsx>,
 *     status: "built" | "stub",
 *     ext: "tsx",
 *     sizeBytes: <real file size>,
 *     file: "mcp-server/web/src/pages/<file>.tsx",
 *     cluster: <cluster name>
 *   }
 *
 * Edges:
 *   - parent rollup → page  (type=contains, intensity 0.3)
 *   - page → tr.rest        (type=http,     intensity 0.45)  — every page hits REST
 *   - page → fe.web         (type=embedded, intensity 0.35)  — embedded in shell
 *
 * Output: state/shared/system-viz/frontend-pages-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const PAGES_DIR = path.join(ROOT, "mcp-server", "web", "src", "pages");

function pageCluster(name) {
  const n = name.toLowerCase();
  if (/quote|rfq|quoteanalytics|quotebuilder|quotefollowup/.test(n)) return "quoting";
  if (/quote|estimate|costestimator|jobprofitability|tooling/.test(n)) return "quoting";
  if (/lathe/.test(n)) return "lathe";
  if (/mill|milling/.test(n)) return "mill";
  if (/wireedm|edm/.test(n)) return "wedm";
  if (/cad|sfc|speedfeed|threadcalc/.test(n)) return "cad_calc";
  if (/cam|toolpath|postprocessor|setupsheet|proveout/.test(n)) return "cam";
  if (/erp|invoice|payroll|generalledger|purchaseorder|purchasing|customerportal|customers|salespipeline|commission|financialanalysis|machinerates|materialpricing/.test(n)) return "erp";
  if (/quality|spc|fai|cmm|inspect/.test(n)) return "quality";
  if (/hr|employee|timecard|safety|osha|hrcompliance/.test(n)) return "hr_safety";
  if (/shopfloor|kanban|kaizen|valuestream|capacity|scheduling|jobs|jobplanner|programrelease|maintenance|preventivemaintenance/.test(n)) return "shopfloor";
  if (/dashboard|executivedashboard|departmentdashboard|oee|telemetry|machinelive|fleet|reports|optimization|analytics/.test(n)) return "analytics";
  if (/knowledge|courseviewer|learning|aill|coursebrowser/.test(n)) return "learning";
  if (/setting|admin|featuretoggle|integrations|exports|datamanagement|machinedataaudit/.test(n)) return "admin";
  return "specialty";
}

const CLUSTER_HUE = {
  quoting:   "#fb923c", lathe: "#22c55e", mill: "#34d399", wedm: "#06b6d4",
  cad_calc:  "#a855f7", cam: "#8b5cf6", erp: "#f59e0b", quality: "#ef4444",
  hr_safety: "#facc15", shopfloor: "#10b981", analytics: "#3b82f6",
  learning:  "#ec4899", admin: "#94a3b8", specialty: "#64748b",
};

function slugify(name) {
  return name.replace(/\.tsx$/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_");
}

function generate() {
  if (!fs.existsSync(PAGES_DIR)) {
    return { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), error: "pages-dir-missing", newNodes: [], newEdges: [], stats: {} };
  }
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const entries = fs.readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith(".tsx"));

  const newNodes = [];
  const newEdges = [];
  const seenEdge = new Set();
  const stats = {
    pagesScanned: entries.length,
    pageNodesEmitted: 0,
    duplicateIds: 0,
    orphanedRollup: 0,
    perCluster: {},
    extEdges: 0,
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const e of entries) {
    const name = e.name;
    const stem = name.replace(/\.tsx$/, "");
    const cluster = pageCluster(stem);
    const parent = `fe.pages.${cluster}`;
    const rollupExists = existingIds.has(parent);
    if (!rollupExists) stats.orphanedRollup++;

    let id = `fe.page.${slugify(stem)}`;
    let suffix = 1;
    while (existingIds.has(id) || newNodes.some(n => n.id === id)) {
      id = `fe.page.${slugify(stem)}_${suffix++}`;
      stats.duplicateIds++;
    }

    let sizeBytes = 0;
    try { sizeBytes = fs.statSync(path.join(PAGES_DIR, name)).size; } catch { /* noop */ }
    const status = sizeBytes < 300 ? "stub" : "built"; // <300 bytes = empty placeholder

    const color = CLUSTER_HUE[cluster] || "#64748b";

    newNodes.push({
      id,
      layer: "L1",
      subgroup: "page",
      parent: rollupExists ? parent : "fe.web",
      label: stem,
      color,
      status,
      size: 0.45 + Math.min(0.45, Math.log10(1 + sizeBytes / 1024) * 0.18),
      tier: 4,
      ext: "tsx",
      sizeBytes,
      file: `mcp-server/web/src/pages/${name}`,
      cluster,
    });
    stats.pageNodesEmitted++;
    stats.perCluster[cluster] = (stats.perCluster[cluster] || 0) + 1;

    // hierarchy edge from cluster rollup to atomic page
    if (rollupExists) pushEdge(parent, id, "contains", "active", 0.30);
    // pages call REST + sit inside the shell
    if (existingIds.has("tr.rest")) {
      if (pushEdge(id, "tr.rest", "http", "active", 0.45)) stats.extEdges++;
    }
    if (existingIds.has("fe.web")) {
      if (pushEdge(id, "fe.web", "embedded", "active", 0.35)) stats.extEdges++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    pagesDir: "mcp-server/web/src/pages",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "frontend-pages-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
if (result.error) {
  console.log(`  error: ${result.error}`);
} else {
  console.log(`  pages scanned: ${result.stats.pagesScanned}`);
  console.log(`  page nodes:    ${result.stats.pageNodesEmitted}`);
  console.log(`  ext edges:     ${result.stats.extEdges}`);
  console.log(`  orphan rollup: ${result.stats.orphanedRollup} (re-rooted to fe.web)`);
  console.log(`  per cluster:`);
  for (const [c, n] of Object.entries(result.stats.perCluster).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c.padEnd(12)} ${n}`);
  }
}
