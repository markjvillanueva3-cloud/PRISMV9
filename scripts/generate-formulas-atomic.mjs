#!/usr/bin/env node
/**
 * generate-formulas-atomic.mjs — emit each exported physics constant /
 * formula function from mcp-server/src/physics/*.ts as an atomic L6 node
 * parented to the existing core.formulas placeholder.
 *
 * Detection patterns (per file):
 *   - export const NAME =        → constant
 *   - export function name(      → function (formula or helper)
 *   - export class Name          → class
 *   - // FORMULA: <description>  → narrative tag on the next exported symbol
 *
 * Emitted L6 node:
 *   id     = formula.<file_stem>.<symbol_lower>
 *   parent = core.formulas
 *   layer  = L6
 *   subgroup = "formula" | "constant" | "function" | "class" | "type"
 *
 * Edges:
 *   - core.formulas -> node     (contains)
 *   - node -> core.physics      (use)
 *
 * Output: state/shared/system-viz/formulas-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const PHYS_DIR = path.join(ROOT, "mcp-server", "src", "physics");

const KIND_HUE = {
  constant: "#fbbf24",
  function: "#22c55e",
  class:    "#a855f7",
  formula:  "#ec4899",
  type:     "#94a3b8",
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function classifyKind(line) {
  if (/^export\s+const\s+/.test(line)) return "constant";
  if (/^export\s+function\s+/.test(line)) return "function";
  if (/^export\s+(?:abstract\s+)?class\s+/.test(line)) return "class";
  if (/^export\s+(?:type|interface)\s+/.test(line)) return "type";
  return null;
}

function extractName(line) {
  const m = line.match(/^export\s+(?:const|function|abstract\s+class|class|type|interface)\s+([A-Za-z0-9_]+)/);
  return m ? m[1] : null;
}

function listPhysicsFiles() {
  if (!fs.existsSync(PHYS_DIR)) return [];
  return fs.readdirSync(PHYS_DIR)
    .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"))
    .map(f => ({ name: f, stem: f.replace(/\.ts$/, ""), abs: path.join(PHYS_DIR, f) }));
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const files = listPhysicsFiles();
  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    filesScanned: files.length,
    symbolsFound: 0,
    nodesEmitted: 0,
    perFile: {},
    perKind: {},
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const f of files) {
    const fileSlug = slugify(f.stem);
    const text = fs.readFileSync(f.abs, "utf8");
    const lines = text.split(/\r?\n/);
    let formulaTagPending = null;

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const tag = ln.match(/^\s*\/\/\s*FORMULA:\s*(.+?)\s*$/i);
      if (tag) { formulaTagPending = tag[1].slice(0, 200); continue; }

      const kind = classifyKind(ln);
      if (!kind) continue;
      const name = extractName(ln);
      if (!name) continue;
      stats.symbolsFound++;

      const id = `formula.${fileSlug}.${name.toLowerCase()}`;
      if (existingIds.has(id) || seenId.has(id)) { formulaTagPending = null; continue; }
      seenId.add(id);

      const isCanonical = /^[A-Z_][A-Z0-9_]+$/.test(name);
      const subgroup = formulaTagPending ? "formula" : kind;
      const color = KIND_HUE[subgroup] || "#94a3b8";

      newNodes.push({
        id,
        layer: "L6",
        subgroup,
        parent: "core.formulas",
        label: formulaTagPending ? `${name}\n(formula)` : name,
        status: "built",
        color,
        size: 0.32 + (isCanonical ? 0.05 : 0) + (formulaTagPending ? 0.10 : 0),
        tier: 0,
        ext: "ts",
        symbolKind: kind,
        file: `mcp-server/src/physics/${f.name}`,
        sourceFile: f.stem,
        narrativeTag: formulaTagPending || undefined,
      });
      stats.nodesEmitted++;
      stats.perKind[subgroup] = (stats.perKind[subgroup] || 0) + 1;
      stats.perFile[f.stem] = (stats.perFile[f.stem] || 0) + 1;

      pushEdge("core.formulas", id, "contains", "active", 0.20);
      if (existingIds.has("core.physics")) {
        pushEdge(id, "core.physics", "use", "active", 0.30);
      }
      formulaTagPending = null;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    physicsDir: "mcp-server/src/physics",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "formulas-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  files scanned:   ${result.stats.filesScanned}`);
  console.log(`  symbols found:   ${result.stats.symbolsFound}`);
  console.log(`  nodes emitted:   ${result.stats.nodesEmitted}`);
  console.log(`  per kind:`);
  for (const [k, n] of Object.entries(result.stats.perKind).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(12)} ${n}`);
  }
  console.log(`  per file:`);
  for (const [f, n] of Object.entries(result.stats.perFile).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${f.padEnd(24)} ${n}`);
  }
}
