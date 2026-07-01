#!/usr/bin/env node
/**
 * generate-algorithms-atomic.mjs — drill mcp-server/src/algorithms/*.ts into
 * 53 atomic L6 children of core.algos. Detects class names + key formula
 * references via regex.
 *
 * Each emitted L6 node:
 *   id     = alg.<file_stem>
 *   parent = core.algos
 *   layer  = L6
 *   subgroup = "algorithm"
 *
 * Output: state/shared/system-viz/algorithms-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const ALG_DIR = path.join(ROOT, "mcp-server", "src", "algorithms");

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function extractClassNames(text) {
  return [...text.matchAll(/^export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/gm)].map(m => m[1]);
}

function extractFormulaReferences(text) {
  // Common math/algorithm name patterns in code or comments
  const out = new Set();
  const pats = [
    /\bKienzle\b/i, /\bTaylor\b/i, /\bJohnson[- ]Cook\b/i, /\bMonte[- ]Carlo\b/i,
    /\bKalman\b/i, /\bBayesian\b/i, /\bWeibull\b/i, /\bNURBS\b/i, /\bBSpline\b/i,
    /\bRunge[- ]Kutta\b/i, /\bSimplex\b/i, /\bDijkstra\b/i, /\bAStar\b/i,
    /\bMarching\s+Cubes\b/i, /\bConvex\s+Hull\b/i, /\bDelaunay\b/i, /\bVoronoi\b/i,
    /\bGenetic\s+Algorithm\b/i, /\bAnnealing\b/i, /\bPSO\b/, /\bACO\b/,
  ];
  for (const re of pats) {
    const m = text.match(re);
    if (m) out.add(m[0]);
  }
  return [...out];
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  if (!fs.existsSync(ALG_DIR)) return { error: "alg-dir-missing", newNodes: [], newEdges: [], stats: {} };
  const files = fs.readdirSync(ALG_DIR)
    .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"));

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    filesScanned: files.length,
    nodesEmitted: 0,
    classesFound: 0,
    formulaRefsFound: 0,
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const file of files) {
    const stem = file.replace(/\.ts$/, "");
    const id = `alg.${slugify(stem)}`;
    if (existingIds.has(id) || seenId.has(id)) continue;
    seenId.add(id);

    let text = "";
    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(path.join(ALG_DIR, file)).size;
      text = fs.readFileSync(path.join(ALG_DIR, file), "utf8");
    } catch { /* noop */ }
    const classes = extractClassNames(text);
    const formulas = extractFormulaReferences(text);
    stats.classesFound += classes.length;
    stats.formulaRefsFound += formulas.length;

    newNodes.push({
      id,
      layer: "L6",
      subgroup: "algorithm",
      parent: "core.algos",
      label: stem,
      status: sizeBytes < 512 ? "stub" : "built",
      color: "#84cc16",
      size: 0.35 + Math.min(0.35, Math.log10(1 + sizeBytes / 1024) * 0.12),
      tier: 0,
      ext: "ts",
      sizeBytes,
      file: `mcp-server/src/algorithms/${file}`,
      classes,
      formulaReferences: formulas,
    });
    stats.nodesEmitted++;
    if (existingIds.has("core.algos")) {
      pushEdge("core.algos", id, "contains", "active", 0.20);
    }
    // Cross-reference link to physics/formulas core (heuristic)
    if (formulas.length > 0 && existingIds.has("core.formulas")) {
      pushEdge(id, "core.formulas", "use", "active", 0.25);
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    algorithmsDir: "mcp-server/src/algorithms",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "algorithms-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  files scanned:     ${result.stats.filesScanned}`);
  console.log(`  nodes emitted:     ${result.stats.nodesEmitted}`);
  console.log(`  classes found:     ${result.stats.classesFound}`);
  console.log(`  formula refs:      ${result.stats.formulaRefsFound}`);
}
