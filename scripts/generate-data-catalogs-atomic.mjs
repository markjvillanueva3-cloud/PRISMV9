#!/usr/bin/env node
/**
 * generate-data-catalogs-atomic.mjs — Phase 3b of the system-viz layer
 * saturation pass.
 *
 * `mcp-server/src/data/*.ts` are bulk-data monolith files: vendor tool catalogs
 * (Sandvik, Kennametal, Emuge, Guhring, OSG, Helical, Indexable, Ingersoll,
 * Sumitomo, Tungaloy, AMPC, …), per-CAM tribal-tip dumps (Mastercam, hyperMILL,
 * NX, PowerMill, SolidCAM, EdgeCAM, WorkNC, Tebis, Cimatron, BobCAD, CAMWorks,
 * SurfCAM, GibbsCAM, SprutCAM, CATIA), machine catalogs (kinematics, enrichment,
 * post-enriched, profiles, torque-curves), user-proven cutting data, CNC
 * dimensions. Each holds tens-to-thousands of records but appeared in the viz —
 * at best — as a single export symbol.
 *
 * This generator transpiles each file with esbuild, eval's the exported arrays,
 * and atomises them:
 *
 *   L7  datacat.<category>                      (category hub: tool_catalog,
 *                                                cam_tips, machine_catalog,
 *                                                cutting_data, dimensions, other)
 *     L8  datacat.<category>.<file>               (per-source-file node, carries
 *                                                  lineCount + recordCount)
 *       L9  datacat.<category>.<file>.<recordSlug>  (per-record atomic node,
 *                                                    capped per file)
 *
 * It also emits `imports_data` edges from any engine that does
 * `from "../data/<file>"` to the file node, so the viz shows which engines
 * consume which catalog.
 *
 * Output: state/shared/system-viz/data-catalogs-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const DATA_DIR = path.join(ROOT, "mcp-server", "src", "data");
const ENGINES_DIR = path.join(ROOT, "mcp-server", "src", "engines");

// esbuild lives in mcp-server/node_modules
const requireFromServer = createRequire(path.join(ROOT, "mcp-server", "package.json"));
let esbuild = null;
try { esbuild = requireFromServer("esbuild"); } catch { /* fall back to regex count */ }

const MAX_RECORDS_PER_FILE = 400;       // huge catalogs (helical = thousands) get truncated
const SLUG_NONALNUM = /[^a-z0-9._-]/g;
const IMPORT_DATA_RE = /from\s+["'][^"']*\/data\/([a-z0-9._-]+)(?:\.js)?["']/gi;

function slug(s) {
  return String(s).toLowerCase().replace(SLUG_NONALNUM, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

// Ordered — first match wins. Specific patterns before generic ones.
function categoryOf(fileBase) {
  const b = fileBase.toLowerCase();
  if (/holder|toolholder|workholding|tooling-system/.test(b)) return "holder_catalog";
  if (/speed-feed|speedfeed/.test(b)) return "speed_feed_data";
  if (/thread/.test(b)) return "thread_data";
  if (/wedm/.test(b)) return "wedm_data";
  if (/^jm-?die|jm-?die-/.test(b)) return "jm_die";
  if (/benchmark/.test(b)) return "benchmark";
  if (/-cam-tips/.test(b)) return "cam_tips";
  if (/okuma|hurco|fanuc|haas|mazak|siemens|dialect|osp/.test(b)) return "controller_knowledge";
  if (/tribal|physics-science-tips|knowledge-tips|controller-knowledge-tips/.test(b)) return "tribal_tips";
  if (/cutting-data|proven/.test(b)) return "cutting_data";
  if (/dimension|iso286/.test(b)) return "dimensions";
  if (/material|grade/.test(b)) return "materials";
  if (/^machine-|machine-/.test(b)) return "machine_catalog";
  if (/tool-catalog|turning-catalog|rotating-catalog|drill-catalog|endmill-catalog|-catalog$/.test(b)) return "tool_catalog";
  if (/extracted|ingested/.test(b)) return "extracted";
  if (/hypermill|hypercad|mastercam|automation-center|formula-registry|strategy-catalog/.test(b)) return "cam_knowledge";
  if (/registry|index|loader|taxonomy|schema|profile|types$/.test(b)) return "infra";
  return "other";
}

const CATEGORY_COLOR = {
  tool_catalog:        "#22d3ee",
  holder_catalog:      "#06b6d4",
  speed_feed_data:     "#facc15",
  thread_data:         "#d8b4fe",
  wedm_data:           "#fb7185",
  jm_die:              "#f97316",
  benchmark:           "#84cc16",
  cam_tips:            "#a78bfa",
  cam_knowledge:       "#8b5cf6",
  controller_knowledge:"#38bdf8",
  tribal_tips:         "#c084fc",
  machine_catalog:     "#34d399",
  cutting_data:        "#fbbf24",
  dimensions:          "#94a3b8",
  materials:           "#f472b6",
  extracted:           "#f59e0b",
  infra:               "#64748b",
  other:               "#cbd5e1",
};

// Pull the largest exported array from a transpiled-and-eval'd CJS module.
function evalLargestArray(jsSource) {
  const module = { exports: {} };
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("module", "exports", "require", jsSource);
    fn(module, module.exports, () => ({}));
  } catch { return null; }
  let bestKey = null, bestArr = null;
  for (const [k, v] of Object.entries(module.exports)) {
    if (Array.isArray(v) && (!bestArr || v.length > bestArr.length)) { bestKey = k; bestArr = v; }
  }
  if (!bestArr || bestArr.length === 0) return null;
  return { key: bestKey, arr: bestArr };
}

// Regex fallback: count top-level `{...}` objects inside the first `= [` … `]`.
function regexCount(tsSource) {
  const m = tsSource.match(/=\s*\[/);
  if (!m) return 0;
  // crude: count "{partNumber" / "{name" / "{id" style record starts
  const recStart = tsSource.match(/\{\s*(partNumber|name|id|series|model|term|tip|title|key)\s*:/g);
  return recStart ? recStart.length : 0;
}

function recordLabel(r, i) {
  if (r && typeof r === "object") {
    for (const k of ["partNumber", "name", "title", "id", "series", "model", "term", "key", "designation", "code"]) {
      if ((typeof r[k] === "string" || typeof r[k] === "number") && String(r[k]).trim()) return String(r[k]).trim();
    }
    for (const k of Object.keys(r)) {
      const v = r[k];
      if ((typeof v === "string" || typeof v === "number") && String(v).trim() && String(v).length < 60) return String(v).trim();
    }
  }
  if (typeof r === "string" || typeof r === "number") return String(r);
  return `record-${i}`;
}

function recordSlug(r, i) {
  if (r && typeof r === "object") {
    for (const k of ["partNumber", "id", "name", "series", "model", "code", "key"]) {
      if ((typeof r[k] === "string" || typeof r[k] === "number") && String(r[k]).trim()) return slug(String(r[k]));
    }
  }
  if ((typeof r === "string" || typeof r === "number") && String(r).trim()) return slug(String(r).slice(0, 50));
  return `r${i}`;
}

function recordHint(r) {
  if (!r || typeof r !== "object") return null;
  for (const k of ["type", "kind", "category", "subcategory", "grade", "materialApplication", "vendor", "cam"]) {
    if ((typeof r[k] === "string") && r[k].trim()) return r[k].trim();
  }
  return null;
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", stats: {} };
  if (!fs.existsSync(DATA_DIR)) return { error: "data-dir-missing", stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const byId = new Set();
  for (const n of graph.nodes) byId.add(n.id);
  // engine slug -> node id (for imports_data edges)
  const engSlugToId = new Map();
  for (const n of graph.nodes) {
    if (typeof n.id === "string" && n.id.startsWith("eng.")) {
      const last = n.id.split(".").pop();
      if (last) engSlugToId.set(slug(last), n.id);
    }
  }

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

  // Pre-scan engines for `from "../data/<file>"` references → file -> [engineId]
  const fileToEngines = new Map();
  if (fs.existsSync(ENGINES_DIR)) {
    for (const e of fs.readdirSync(ENGINES_DIR)) {
      if (!e.endsWith(".ts")) continue;
      let src;
      try { src = fs.readFileSync(path.join(ENGINES_DIR, e), "utf8"); }
      catch { continue; }
      IMPORT_DATA_RE.lastIndex = 0;
      let m;
      const engSlug = slug(e.replace(/\.ts$/, ""));
      const engId = engSlugToId.get(engSlug);
      if (!engId) continue;
      while ((m = IMPORT_DATA_RE.exec(src)) !== null) {
        const dataFile = m[1].replace(/\.js$/, "");
        if (!fileToEngines.has(dataFile)) fileToEngines.set(dataFile, new Set());
        fileToEngines.get(dataFile).add(engId);
      }
    }
  }

  const stats = {
    esbuildAvailable: !!esbuild,
    filesScanned: 0, hubNodes: 0, fileNodes: 0, recordNodes: 0,
    evalFailures: 0, regexFallbacks: 0, importEdges: 0,
    perCategory: {}, perFileTop: [],
  };

  // Category hubs created lazily
  const hubCreated = new Set();
  function ensureHub(category) {
    const id = `datacat.${category}`;
    if (hubCreated.has(id)) return id;
    hubCreated.add(id);
    if (addNode({
      id, layer: "L7",
      subgroup: "datacat_hub",
      label: category.replace(/_/g, " "),
      status: "built",
      color: CATEGORY_COLOR[category] || "#cbd5e1",
      size: 0.6, tier: 1, synthetic: true,
    })) stats.hubNodes++;
    return id;
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".ts")).sort();
  for (const fname of files) {
    const fpath = path.join(DATA_DIR, fname);
    let tsSource;
    try { tsSource = fs.readFileSync(fpath, "utf8"); }
    catch { continue; }
    stats.filesScanned++;
    const base = fname.replace(/\.ts$/, "");
    const category = categoryOf(base);
    const hubId = ensureHub(category);
    const fileSlug = slug(base);
    const fileNodeId = `datacat.${category}.${fileSlug}`;
    const lineCount = tsSource.split("\n").length;

    // Try esbuild eval → fall back to regex count
    let recPick = null;
    if (esbuild) {
      try {
        const out = esbuild.transformSync(tsSource, { loader: "ts", format: "cjs", target: "es2022" });
        recPick = evalLargestArray(out.code);
      } catch { /* fall through */ }
    }
    let recordCount;
    if (recPick) {
      recordCount = recPick.arr.length;
    } else {
      stats.evalFailures++;
      stats.regexFallbacks++;
      recordCount = regexCount(tsSource);
    }

    if (addNode({
      id: fileNodeId, layer: "L8",
      subgroup: "datacat_file",
      parent: hubId,
      label: fname,
      status: "built",
      color: CATEGORY_COLOR[category] || "#cbd5e1",
      size: 0.28 + Math.min(0.22, Math.log10(1 + recordCount) * 0.05),
      tier: 2,
      ext: "ts",
      file: `mcp-server/src/data/${fname}`,
      lineCount,
      recordCount,
      recordKey: recPick ? recPick.key : null,
    })) { stats.fileNodes++; stats.perCategory[category] = (stats.perCategory[category] || 0) + 1; }
    pushEdge(hubId, fileNodeId, "contains", 0.2);

    // imports_data edges from consuming engines
    const consumers = fileToEngines.get(base) || fileToEngines.get(fileSlug);
    if (consumers) {
      for (const engId of consumers) {
        if (pushEdge(engId, fileNodeId, "imports_data", 0.3)) stats.importEdges++;
      }
    }

    // Per-record atomics (only if we eval'd successfully)
    if (recPick) {
      const arr = recPick.arr.slice(0, MAX_RECORDS_PER_FILE);
      const slugCounts = new Map();
      let emitted = 0;
      for (let i = 0; i < arr.length; i++) {
        const r = arr[i];
        let rs = recordSlug(r, i);
        if (slugCounts.has(rs)) { const c = slugCounts.get(rs) + 1; slugCounts.set(rs, c); rs = `${rs}_${c}`; }
        else slugCounts.set(rs, 1);
        const recId = `${fileNodeId}.${rs}`.slice(0, 200);
        const hint = recordHint(r);
        if (addNode({
          id: recId, layer: "L9",
          subgroup: "datacat_record",
          parent: fileNodeId,
          label: recordLabel(r, i).slice(0, 70),
          status: "built",
          color: CATEGORY_COLOR[category] || "#cbd5e1",
          size: 0.12, tier: 3,
          recordKind: recPick.key,
          hint: hint || undefined,
          category,
        })) { stats.recordNodes++; emitted++; }
        pushEdge(fileNodeId, recId, "contains", 0.1);
      }
      if (recPick.arr.length > MAX_RECORDS_PER_FILE) {
        const fn = newNodes.find(n => n.id === fileNodeId);
        if (fn) fn.truncated = MAX_RECORDS_PER_FILE;
      }
      stats.perFileTop.push({ file: fname, records: emitted, total: recPick.arr.length, key: recPick.key, category });
    } else {
      stats.perFileTop.push({ file: fname, records: 0, total: recordCount, key: "(regex)", category });
    }
  }

  stats.perFileTop.sort((a, b) => b.total - a.total);
  stats.perFileTop = stats.perFileTop.slice(0, 20);

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes, newEdges, stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "data-catalogs-atomic-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) { console.log(`  error: ${result.error}`); }
else {
  const s = result.stats;
  console.log(`  esbuild available:  ${s.esbuildAvailable}`);
  console.log(`  files scanned:      ${s.filesScanned}`);
  console.log(`  category hubs:      ${s.hubNodes}`);
  console.log(`  file nodes:         ${s.fileNodes}`);
  console.log(`  record nodes (L9):  ${s.recordNodes}`);
  console.log(`  eval failures:      ${s.evalFailures} (regex fallback)`);
  console.log(`  imports_data edges: ${s.importEdges}`);
  console.log(`  total new nodes:    ${result.newNodes.length}`);
  console.log(`  total new edges:    ${result.newEdges.length}`);
  console.log(`  ── per category ──`);
  for (const [c, n] of Object.entries(s.perCategory).sort((a, b) => b[1] - a[1])) console.log(`    ${c.padEnd(16)} ${n} files`);
  console.log(`  ── top files by record count ──`);
  for (const f of s.perFileTop) console.log(`    ${String(f.total).padStart(6)} (atom ${String(f.records).padStart(4)})  ${f.category.padEnd(16)} ${f.file}`);
}
