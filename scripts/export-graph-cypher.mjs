#!/usr/bin/env node
/**
 * export-graph-cypher.mjs
 *
 * Converts state/shared/system-viz/system-graph.json into Neo4j-compatible
 * Cypher MERGE statements for true graph-database queries.
 *
 * Output: state/shared/system-viz/graph.cypher
 *
 * Each L0..L11 layer becomes a node label. Node properties: id, label,
 * status, count, layer, kind. Edges become typed relationships
 * (CONSUMES / WIRES_TO / etc., default ROUTES).
 *
 * Usage in Neo4j after import:
 *   cypher-shell < state/shared/system-viz/graph.cypher
 *   MATCH (n:L5 {status:"unwired"}) RETURN n.label  // find unwired engines
 *   MATCH (d:L4)-->(a:L4a) RETURN d.label, count(a) ORDER BY count(a) DESC
 *
 * Scope: skips L11 (102K filesystem nodes) by default — Neo4j Community
 * Edition imports them fine but they dwarf the semantic graph. Pass --full
 * to include them.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const OUT_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/graph.cypher");

const args = new Set(process.argv.slice(2));
const FLAGS = { full: args.has("--full") };

const SKIP_LAYERS_WHEN_NOT_FULL = new Set(["L11"]);

const REL_BY_LAYERS = {
  "L0->L1": "PERSONA_USES",
  "L1->L2": "PAGE_CALLS",
  "L2->L3": "TRANSPORT_TO_AI",
  "L2->L4": "TRANSPORT_TO_DISPATCHER",
  "L3->L4": "AI_ROUTES",
  "L4->L4a": "EXPOSES_ACTION",
  "L4->L5": "INVOKES_ENGINE",
  "L4a->L5": "ACTION_INVOKES",
  "L5->L6": "ENGINE_USES_CORE",
  "L5->L7": "ENGINE_QUERIES_REGISTRY",
  "L7->L8": "REGISTRY_CONTAINS",
  "L8->L8": "KNOWLEDGE_RELATES",
};

function readJson(p) { return JSON.parse(readFileSync(p, "utf8")); }
function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }

function escapeStr(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
}

function nodeLabel(layer) {
  // Layer ids like L0..L11, L4a. Neo4j labels can't start with digits, so prefix.
  return layer; // already safe; L0..L11 + L4a all alphanumeric and start with letter
}

function relType(fromLayer, toLayer) {
  const key = `${fromLayer}->${toLayer}`;
  if (REL_BY_LAYERS[key]) return REL_BY_LAYERS[key];
  // Generic fallback
  return "ROUTES";
}

function main() {
  if (!existsSync(GRAPH_PATH)) {
    console.error("graph missing");
    process.exit(2);
  }
  const G = readJson(GRAPH_PATH);
  const nodeById = new Map();
  for (const n of G.nodes) nodeById.set(n.id, n);

  const lines = [
    "// PRISM system-viz graph — Cypher export",
    `// Generated: ${new Date().toISOString()}`,
    `// Total nodes: ${G.nodes.length}  ·  edges: ${G.edges.length}`,
    `// Mode: ${FLAGS.full ? "FULL (includes L11 filesystem)" : "SEMANTIC (L11 skipped)"}`,
    "",
    "// Constraints — speed up MERGE",
    "CREATE CONSTRAINT prism_node_id IF NOT EXISTS FOR (n:Node) REQUIRE n.id IS UNIQUE;",
    "",
  ];

  let nodeCount = 0;
  let edgeCount = 0;

  // Nodes
  for (const n of G.nodes) {
    if (!FLAGS.full && SKIP_LAYERS_WHEN_NOT_FULL.has(n.layer)) continue;
    const label = nodeLabel(n.layer);
    const props = [
      `id: '${escapeStr(n.id)}'`,
      `label: '${escapeStr(n.label || n.id)}'`,
      `layer: '${escapeStr(n.layer)}'`,
      n.kind ? `kind: '${escapeStr(n.kind)}'` : null,
      n.subgroup ? `subgroup: '${escapeStr(n.subgroup)}'` : null,
      n.status ? `status: '${escapeStr(n.status)}'` : null,
      typeof n.count === "number" ? `count: ${n.count}` : null,
    ].filter(Boolean).join(", ");
    lines.push(`MERGE (n:Node:${label} { id: '${escapeStr(n.id)}' }) SET n += { ${props} };`);
    nodeCount++;
  }
  lines.push("");

  // Edges
  for (const e of G.edges) {
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    if (!from || !to) continue;
    if (!FLAGS.full && (SKIP_LAYERS_WHEN_NOT_FULL.has(from.layer) || SKIP_LAYERS_WHEN_NOT_FULL.has(to.layer))) continue;
    const rel = relType(from.layer, to.layer);
    lines.push(
      `MATCH (a:Node { id: '${escapeStr(e.from)}' }), (b:Node { id: '${escapeStr(e.to)}' }) MERGE (a)-[:${rel}]->(b);`
    );
    edgeCount++;
  }

  ensureDir(dirname(OUT_PATH));
  writeFileSync(OUT_PATH, lines.join("\n"), "utf8");
  console.log(`wrote ${OUT_PATH} · ${nodeCount} node MERGEs · ${edgeCount} edge MERGEs · ${(lines.join("\n").length / (1024 * 1024)).toFixed(1)}MB`);
}

main();
