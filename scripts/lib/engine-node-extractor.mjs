#!/usr/bin/env node
/**
 * engine-node-extractor.mjs — NN-GRAPH-MS0/U-NNG-EDGE-NORMALIZE companion
 *
 * Walks mcp-server/src/engines/*.ts and emits PER-ENGINE nodes for the
 * system-viz graph. Closes the gap surfaced in v2 plan scrutiny Arm D:
 * the existing generate-system-viz.mjs scrapes engine COUNTS from
 * PRISM-INVENTORY-LATEST.md and buckets them into named-domain L5 clusters,
 * but does NOT emit a discrete node per engine class. Without per-engine
 * nodes, the GNN's recursive-self property is rhetoric — new engines added
 * by NN-GRAPH-MS0 wouldn't appear in the next training run.
 *
 * This extractor closes that gap by walking the .ts files directly and
 * emitting {id: "engine.<ClassName>", kind: "engine", label, info, layer,
 * file} per engine. The output is meant to be merged into the graph
 * between generate-system-viz.mjs's L5 cluster emission and L6.
 *
 * Pure-export contract (no top-level side effects):
 *   extractEngineNodes(enginesDir, opts?) → { nodes, edges, stats }
 *   readEngineFile(path) → { className, jsdoc, exports, deps }
 *   classNameFromPath(filePath) → string
 *
 * Stats include skipped counts (test files, type-only files, no-class files)
 * so the caller can verify the walk was exhaustive.
 *
 * @milestone NN-GRAPH-MS0
 * @unit U-NNG-EDGE-NORMALIZE
 */

import fs from "node:fs";
import path from "node:path";

/** Files to skip during the walk. */
const SKIP_PATTERNS = [
  /\.d\.ts$/,           // type declarations
  /\.test\.ts$/,        // test files
  /\.spec\.ts$/,        // spec files
  /^_/,                 // underscore-prefixed
  /^\./,                // hidden
];

/** Match `export class XEngine ...` or `export default class XEngine ...`. */
const CLASS_REGEX = /^\s*export\s+(?:default\s+)?(?:abstract\s+)?class\s+([A-Z][A-Za-z0-9_]*)/m;

/** Match a leading JSDoc comment block on a file. */
const JSDOC_REGEX = /^\/\*\*([\s\S]*?)\*\//;

/** Derive class name from file basename when no `export class` line matches. */
export function classNameFromPath(filePath) {
  if (typeof filePath !== "string") return null;
  const base = path.basename(filePath).replace(/\.ts$/, "").replace(/\.mjs$/, "").replace(/\.js$/, "");
  // CamelCase the base if not already
  if (/^[A-Z]/.test(base)) return base;
  return null;
}

/** Read one engine file and parse its public surface. */
export function readEngineFile(filePath) {
  if (typeof filePath !== "string" || !fs.existsSync(filePath)) {
    return { className: null, jsdoc: "", exports: [], deps: [] };
  }
  let src;
  try { src = fs.readFileSync(filePath, "utf8"); }
  catch { return { className: null, jsdoc: "", exports: [], deps: [] }; }

  // Class name: explicit export wins; fallback to filename
  const classMatch = src.match(CLASS_REGEX);
  const className = classMatch ? classMatch[1] : classNameFromPath(filePath);

  // JSDoc (first block) — first line becomes the engine's `info` summary
  const jsdocMatch = src.match(JSDOC_REGEX);
  let jsdoc = "";
  if (jsdocMatch) {
    const lines = jsdocMatch[1].split("\n").map(l => l.replace(/^\s*\*\s?/, "").trim()).filter(Boolean);
    jsdoc = lines.length ? lines[0] : "";
  }

  // Top-level dependencies (engine imports): /\.\.\/(\w*)Engine/ etc.
  const deps = [];
  const importRe = /from\s+["'][^"']*\/engines\/([A-Z][A-Za-z0-9_]*)(?:\.js)?["']/g;
  let dm;
  while ((dm = importRe.exec(src)) !== null) {
    if (dm[1] !== className) deps.push(dm[1]);
  }

  // Other named exports (top-level)
  const exportRe = /^\s*export\s+(?:const|function|class)\s+([A-Z][A-Za-z0-9_]*)/gm;
  const exports = [];
  let em;
  while ((em = exportRe.exec(src)) !== null) {
    if (em[1] !== className) exports.push(em[1]);
  }

  return { className, jsdoc, exports, deps };
}

/** Should this filename be skipped? */
function shouldSkip(filename) {
  return SKIP_PATTERNS.some(p => p.test(filename));
}

/**
 * Walk the engines directory and emit per-engine nodes + dep edges.
 * Returns { nodes, edges, stats }.
 *
 * Idempotent: same input dir → same output (assuming no file changes).
 */
export function extractEngineNodes(enginesDir, opts = {}) {
  const layer = opts.layer ?? "L5";
  const stats = { scanned: 0, emitted: 0, skipped: 0, noClass: 0 };
  const nodes = [];
  const edges = [];

  if (!fs.existsSync(enginesDir)) return { nodes, edges, stats };

  let files;
  try { files = fs.readdirSync(enginesDir).filter(f => f.endsWith(".ts")); }
  catch { return { nodes, edges, stats }; }

  for (const f of files) {
    stats.scanned += 1;
    if (shouldSkip(f)) { stats.skipped += 1; continue; }
    const full = path.join(enginesDir, f);
    const parsed = readEngineFile(full);
    if (!parsed.className) { stats.noClass += 1; continue; }
    const id = `engine.${parsed.className}`;
    const relFile = path.relative(opts.repoRoot ?? "H:/prism", full).replace(/\\/g, "/");
    nodes.push({
      id,
      kind: "engine",
      label: parsed.className,
      layer,
      info: parsed.jsdoc.slice(0, 200),
      file: relFile,
      exports: parsed.exports.slice(0, 20), // bound: avoid huge node objects
    });
    for (const dep of parsed.deps) {
      edges.push({
        from: id,
        to: `engine.${dep}`,
        type: "engine_import",
      });
    }
    stats.emitted += 1;
  }

  return { nodes, edges, stats };
}

/**
 * Merge engine extraction output into a system-viz graph.
 * Idempotent: re-merging same input doesn't duplicate nodes/edges.
 *
 * Pure — returns a copy. Does NOT mutate input graph.
 */
export function mergeIntoGraph(graph, extraction) {
  if (!graph || typeof graph !== "object" || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new TypeError("mergeIntoGraph: graph must have {nodes:[], edges:[]}");
  }
  const out = { ...graph };
  const existingNodeIds = new Set(graph.nodes.map(n => n?.id));
  const existingEdgeKeys = new Set(graph.edges.map(e => `${e?.from}::${e?.to}::${e?.type}`));

  const newNodes = (extraction?.nodes ?? []).filter(n => !existingNodeIds.has(n.id));
  const newEdges = (extraction?.edges ?? []).filter(e => !existingEdgeKeys.has(`${e.from}::${e.to}::${e.type}`));

  out.nodes = [...graph.nodes];
  for (let i = 0; i < newNodes.length; i++) out.nodes.push(newNodes[i]);
  out.edges = [...graph.edges];
  for (let i = 0; i < newEdges.length; i++) out.edges.push(newEdges[i]);

  return out;
}
