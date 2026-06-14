#!/usr/bin/env node
/**
 * generate-schema-engine-edges.mjs — emit L5.engine → L6.schema edges showing
 * which engines depend on which Zod schemas / TypeScript types.
 *
 * Signal:
 *   For each engine file, scan import statements like:
 *     import { FooSchema } from "../schemas/foo.js"
 *     import { type Bar } from "../schemas/foo.js"
 *   Resolve schemas/<file>.ts to its L6 schema_file node, and the named
 *   imports to L6 schema_zod_schema / schema_type / schema_interface /
 *   schema_constant atomic nodes.
 *
 * Output edges:
 *   - "validates" (engine→schema_zod_schema)   active
 *   - "uses_type" (engine→schema_type)          active
 *   - "uses_constant" (engine→schema_constant) active
 *   - "imports_from" (engine→schema_file)       fallback (weak)
 *
 * Output: state/shared/system-viz/schema-engine-edges-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENG_DIR = path.join(ROOT, "mcp-server", "src", "engines");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const ATOMIC_DEPTH = 3;
const SCHEMA_IMPORT_RE = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["'](\.\.?\/[^"']*schemas?\/[^"']+)["']/g;
const SCHEMA_FROM_RE = /from\s+["'](\.\.?\/[^"']*schemas?\/[^"']+)["']/g;
const NAMED_IMPORT_CLEAN = /^\s*(?:type\s+)?([A-Za-z_$][\w$]*)\s*(?:as\s+[A-Za-z_$][\w$]*)?\s*$/;

function subgroupToEdgeType(sg) {
  switch (sg) {
    case "schema_zod_schema": return "validates";
    case "schema_type":       return "uses_type";
    case "schema_interface":  return "uses_type";
    case "schema_constant":   return "uses_constant";
    case "schema_file":       return "imports_from";
    default: return "uses_schema";
  }
}

function intensityFor(type) {
  switch (type) {
    case "validates":     return 0.55;
    case "uses_type":     return 0.30;
    case "uses_constant": return 0.40;
    case "imports_from":  return 0.20;
    default: return 0.25;
  }
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));

  // Build engine-stem → id index
  const engineStemToId = new Map();
  // Build schema-file-stem → id index
  const schemaFileStemToId = new Map();
  // Build schema atomic-symbol-lower → [{id, subgroup}, ...] index (case-insensitive,
  // multi-value because multiple files can export the same symbol)
  const schemaSymbolToAtomics = new Map();

  for (const n of graph.nodes) {
    if (n.layer === "L5" && n.id?.startsWith("eng.") && n.id.split(".").length === ATOMIC_DEPTH) {
      engineStemToId.set(n.id.split(".").pop(), n.id);
    }
    if (n.layer === "L6") {
      if (n.subgroup === "schema_file" && n.id?.startsWith("schema.")) {
        const stem = n.id.slice("schema.".length);
        schemaFileStemToId.set(stem, n.id);
      }
      if (["schema_zod_schema", "schema_type", "schema_interface", "schema_constant"].includes(n.subgroup) && n.id?.startsWith("schema.")) {
        // id = schema.<file>.<symbol>
        const parts = n.id.split(".");
        if (parts.length < 3) continue;
        const symbol = parts.slice(2).join(".");
        const symLower = symbol.toLowerCase();
        if (!schemaSymbolToAtomics.has(symLower)) schemaSymbolToAtomics.set(symLower, []);
        schemaSymbolToAtomics.get(symLower).push({ id: n.id, subgroup: n.subgroup, file: parts[1] });
      }
    }
  }

  const newEdges = [];
  const seenEdge = new Set();
  function pushEdge(from, to, type) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({
      from, to, type,
      status: "active",
      intensity: intensityFor(type),
    });
    return true;
  }

  const stats = {
    enginesScanned: 0,
    schemaImports: 0,
    edgesEmitted: 0,
    perEdgeType: {},
    unresolvedSymbols: 0,
    unresolvedFiles: 0,
    perTargetTopRefs: {},
  };

  for (const file of fs.readdirSync(ENG_DIR)) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts") || file.endsWith(".d.ts")) continue;
    const stem = file.replace(/\.ts$/, "").toLowerCase();
    const srcId = engineStemToId.get(stem);
    if (!srcId) continue;
    stats.enginesScanned++;

    let content;
    try { content = fs.readFileSync(path.join(ENG_DIR, file), "utf8"); }
    catch { continue; }

    // Walk all imports from a schemas/ path
    SCHEMA_IMPORT_RE.lastIndex = 0;
    let m;
    while ((m = SCHEMA_IMPORT_RE.exec(content)) !== null) {
      stats.schemaImports++;
      const namedList = m[1];
      const fromPath = m[2];
      const fileStem = path.basename(fromPath).replace(/\.(js|ts|mjs)$/, "").toLowerCase();

      // Resolve named imports → schema atomic nodes (filtered to this file)
      const namedSymbols = namedList.split(",").map(s => s.trim()).filter(Boolean);
      let resolvedAny = false;
      for (const raw of namedSymbols) {
        const cleanMatch = raw.match(NAMED_IMPORT_CLEAN);
        if (!cleanMatch) continue;
        const symbol = cleanMatch[1];
        const matches = schemaSymbolToAtomics.get(symbol.toLowerCase());
        if (!matches) { stats.unresolvedSymbols++; continue; }
        // Prefer match in the same file we're importing from
        const inFile = matches.find(c => c.file === fileStem) || matches[0];
        const edgeType = subgroupToEdgeType(inFile.subgroup);
        if (pushEdge(srcId, inFile.id, edgeType)) {
          resolvedAny = true;
          stats.edgesEmitted++;
          stats.perEdgeType[edgeType] = (stats.perEdgeType[edgeType] || 0) + 1;
          stats.perTargetTopRefs[inFile.id] = (stats.perTargetTopRefs[inFile.id] || 0) + 1;
        }
      }

      // Fallback: link to the schema file itself (weaker signal)
      if (!resolvedAny) {
        const fileId = schemaFileStemToId.get(fileStem);
        if (fileId) {
          if (pushEdge(srcId, fileId, "imports_from")) {
            stats.edgesEmitted++;
            stats.perEdgeType.imports_from = (stats.perEdgeType.imports_from || 0) + 1;
          }
        } else {
          stats.unresolvedFiles++;
        }
      }
    }

    // Also capture from-only matches (import * as) that the named-import regex missed
    SCHEMA_FROM_RE.lastIndex = 0;
    while ((m = SCHEMA_FROM_RE.exec(content)) !== null) {
      const fromPath = m[1];
      const fileStem = path.basename(fromPath).replace(/\.(js|ts|mjs)$/, "").toLowerCase();
      const fileId = schemaFileStemToId.get(fileStem);
      if (fileId) pushEdge(srcId, fileId, "imports_from");
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes: [],
    newEdges,
    stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "schema-engine-edges-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  const s = result.stats;
  console.log(`  engines scanned:    ${s.enginesScanned}`);
  console.log(`  schema imports:     ${s.schemaImports}`);
  console.log(`  edges emitted:      ${s.edgesEmitted}`);
  console.log(`  unresolved symbols: ${s.unresolvedSymbols}`);
  console.log(`  unresolved files:   ${s.unresolvedFiles}`);
  console.log(`  ── per edge type ──`);
  for (const [t, n] of Object.entries(s.perEdgeType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t.padEnd(18)} ${n}`);
  }
  console.log(`  ── top 8 most-referenced schemas ──`);
  for (const [id, n] of Object.entries(s.perTargetTopRefs).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${id.padEnd(55)} ${n}`);
  }
}
