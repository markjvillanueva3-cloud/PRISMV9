#!/usr/bin/env node
/**
 * generate-schemas-atomic.mjs — drill mcp-server/src/schemas/*.ts into per-
 * file atomic L6 nodes, plus per-export atomic L6 grand-children for each
 * exported Zod schema / type. So the viz can show every Zod contract.
 *
 * One node per schema FILE (parent = core.schemas).
 * One additional node per exported schema/type symbol (parent = schema file).
 *
 * Output: state/shared/system-viz/schemas-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const SCHEMA_DIR = path.join(ROOT, "mcp-server", "src", "schemas");

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function extractExports(text) {
  const out = [];
  // export const NAME = z.object  (Zod schema)
  for (const m of text.matchAll(/^export\s+const\s+([A-Za-z0-9_]+)\s*=\s*z\./gm)) {
    out.push({ name: m[1], kind: "zod_schema" });
  }
  // export const NAME = <not Zod> — generic constant
  for (const m of text.matchAll(/^export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(?!z\.)/gm)) {
    if (!out.some(o => o.name === m[1])) out.push({ name: m[1], kind: "constant" });
  }
  // export type NAME =
  for (const m of text.matchAll(/^export\s+type\s+([A-Za-z0-9_]+)\b/gm)) {
    out.push({ name: m[1], kind: "type" });
  }
  // export interface NAME
  for (const m of text.matchAll(/^export\s+interface\s+([A-Za-z0-9_]+)\b/gm)) {
    out.push({ name: m[1], kind: "interface" });
  }
  // export enum NAME
  for (const m of text.matchAll(/^export\s+enum\s+([A-Za-z0-9_]+)\b/gm)) {
    out.push({ name: m[1], kind: "enum" });
  }
  return out;
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  if (!fs.existsSync(SCHEMA_DIR)) return { error: "schemas-dir-missing", newNodes: [], newEdges: [], stats: {} };
  const files = fs.readdirSync(SCHEMA_DIR)
    .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"));

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    filesScanned: files.length,
    fileNodesEmitted: 0,
    symbolNodesEmitted: 0,
    perKind: {},
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
    const fileSlug = slugify(stem);
    const fileId = `schema.${fileSlug}`;
    if (existingIds.has(fileId) || seenId.has(fileId)) continue;
    seenId.add(fileId);

    let text = "";
    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(path.join(SCHEMA_DIR, file)).size;
      text = fs.readFileSync(path.join(SCHEMA_DIR, file), "utf8");
    } catch { /* noop */ }

    newNodes.push({
      id: fileId,
      layer: "L6",
      subgroup: "schema_file",
      parent: "core.schemas",
      label: stem,
      status: sizeBytes < 256 ? "stub" : "built",
      color: "#a78bfa",
      size: 0.40 + Math.min(0.30, Math.log10(1 + sizeBytes / 1024) * 0.10),
      tier: 0,
      ext: "ts",
      sizeBytes,
      file: `mcp-server/src/schemas/${file}`,
    });
    stats.fileNodesEmitted++;
    if (existingIds.has("core.schemas")) {
      pushEdge("core.schemas", fileId, "contains", "active", 0.20);
    }

    // Per-symbol atomic children
    const symbols = extractExports(text);
    for (const sym of symbols) {
      const symId = `schema.${fileSlug}.${sym.name.toLowerCase()}`;
      if (existingIds.has(symId) || seenId.has(symId)) continue;
      seenId.add(symId);
      newNodes.push({
        id: symId,
        layer: "L6",
        subgroup: `schema_${sym.kind}`,
        parent: fileId,
        label: sym.name,
        status: "built",
        color: sym.kind === "zod_schema" ? "#c084fc" : "#94a3b8",
        size: 0.25 + (sym.kind === "zod_schema" ? 0.10 : 0),
        tier: 0,
        symbolKind: sym.kind,
      });
      stats.symbolNodesEmitted++;
      stats.perKind[sym.kind] = (stats.perKind[sym.kind] || 0) + 1;
      pushEdge(fileId, symId, "contains", "active", 0.18);
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    schemasDir: "mcp-server/src/schemas",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "schemas-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  files scanned:    ${result.stats.filesScanned}`);
  console.log(`  file nodes:       ${result.stats.fileNodesEmitted}`);
  console.log(`  symbol nodes:     ${result.stats.symbolNodesEmitted}`);
  console.log(`  per kind:`);
  for (const [k, n] of Object.entries(result.stats.perKind).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(18)} ${n}`);
  }
}
