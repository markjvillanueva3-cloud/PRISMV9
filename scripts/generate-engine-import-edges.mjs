#!/usr/bin/env node
/**
 * generate-engine-import-edges.mjs — parse every engine source file's
 * `import` statements and emit L5→L5 edges for engine-to-engine references.
 *
 * This is the connective tissue between engines that was previously invisible
 * in the viz. Strong import → engine A actively uses engine B; weak/dynamic
 * import → suggested coupling.
 *
 * Heuristic:
 *   - Match  `import ... from "..."  or  `import("...")` patterns.
 *   - Filter to relative-path imports referencing another engine file.
 *   - Resolve target by filename stem → lookup matching L5 atomic node by id
 *     (eng.<dom>.<stem>) using a name→id map built from system-graph.json.
 *
 * Output: state/shared/system-viz/engine-import-edges-augmentation.json
 *   Edge type: "engine_import" (active) or "engine_import_dynamic" (ghost)
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

const STATIC_IMPORT = /import\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
const IMPORT_TARGET_TRIM = /\.(js|ts|mjs)$/;

const ATOMIC_DEPTH = 3;  // eng.<dom>.<name>

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));

  // Build name → id index for L5 atomic engines
  const stemToId = new Map();   // lowercased engine stem → eng.<dom>.<stem>
  for (const n of graph.nodes) {
    if (n.layer !== "L5") continue;
    if (!n.id?.startsWith("eng.")) continue;
    if (n.id.split(".").length !== ATOMIC_DEPTH) continue;
    const stem = n.id.split(".").pop();
    stemToId.set(stem, n.id);
  }

  const newEdges = [];
  const seenEdge = new Set();
  const stats = {
    enginesScanned: 0,
    imports: 0,
    resolved: 0,
    unresolved: 0,
    dynamicImports: 0,
    selfImports: 0,
    perTargetTopRefs: {},
  };

  function pushEdge(from, to, dynamic) {
    if (from === to) { stats.selfImports++; return; }
    const k = `${from}|${to}|${dynamic ? "dyn" : "st"}`;
    if (seenEdge.has(k)) return;
    seenEdge.add(k);
    newEdges.push({
      from, to,
      type: dynamic ? "engine_import_dynamic" : "engine_import",
      status: dynamic ? "ghost" : "active",
      intensity: dynamic ? 0.22 : 0.45,
    });
    stats.perTargetTopRefs[to] = (stats.perTargetTopRefs[to] || 0) + 1;
  }

  const files = fs.readdirSync(ENG_DIR).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"));
  for (const file of files) {
    stats.enginesScanned++;
    const srcStem = file.replace(/\.ts$/, "").toLowerCase();
    const srcId = stemToId.get(srcStem);
    if (!srcId) continue;

    let content;
    try { content = fs.readFileSync(path.join(ENG_DIR, file), "utf8"); }
    catch { continue; }

    function processMatches(re, dynamic) {
      let m;
      while ((m = re.exec(content)) !== null) {
        stats.imports++;
        if (dynamic) stats.dynamicImports++;
        const target = m[1];
        // Only relative imports
        if (!target.startsWith("./") && !target.startsWith("../")) continue;
        // Resolve to a file path
        const cleaned = target.replace(IMPORT_TARGET_TRIM, "");
        const stem = path.basename(cleaned).toLowerCase();
        const targetId = stemToId.get(stem);
        if (targetId) {
          pushEdge(srcId, targetId, dynamic);
          stats.resolved++;
        } else {
          stats.unresolved++;
        }
      }
    }
    processMatches(STATIC_IMPORT, false);
    processMatches(DYNAMIC_IMPORT, true);
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
const out = path.join(VIZ_DIR, "engine-import-edges-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  engines scanned:    ${result.stats.enginesScanned}`);
  console.log(`  imports parsed:     ${result.stats.imports}`);
  console.log(`  resolved (edges):   ${result.stats.resolved}`);
  console.log(`  unresolved:         ${result.stats.unresolved}`);
  console.log(`  dynamic imports:    ${result.stats.dynamicImports}`);
  console.log(`  self-imports:       ${result.stats.selfImports}`);
  console.log(`  ── top 12 most-imported engines (HOTNESS signal) ──`);
  const top = Object.entries(result.stats.perTargetTopRefs).sort((a, b) => b[1] - a[1]).slice(0, 12);
  for (const [id, n] of top) console.log(`    ${id.padEnd(50)} ${n}`);
}
