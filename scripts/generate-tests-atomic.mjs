#!/usr/bin/env node
/**
 * generate-tests-atomic.mjs — emit each mcp-server/src/__tests__/*.test.ts
 * file as an atomic L6 node parented under core.tests. Counts describe()
 * and it()/test() blocks for label metrics. Derives engine-under-test from
 * filename and emits a "tested_by" edge to that engine's atomic node if
 * resolvable.
 *
 * Output: state/shared/system-viz/tests-atomic-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const TEST_DIR = path.join(ROOT, "mcp-server", "src", "__tests__");

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  if (!fs.existsSync(TEST_DIR)) return { error: "tests-dir-missing", newNodes: [], newEdges: [], stats: {} };

  // Build a lookup of L5 atomic engines by lowercased stem for the engine-of-test resolver
  const engineLookup = new Map();
  for (const n of graph.nodes) {
    if (n.layer !== "L5") continue;
    if (!n.id?.match(/^eng\..+\..+$/)) continue;
    const stem = n.id.split(".").slice(2).join(".");
    engineLookup.set(stem, n.id);
  }

  const files = fs.readdirSync(TEST_DIR)
    .filter(f => f.endsWith(".test.ts") && !f.endsWith(".d.ts"));

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    filesScanned: files.length,
    nodesEmitted: 0,
    testedByEdges: 0,
    unresolvedEngine: 0,
    totalDescribes: 0,
    totalIts: 0,
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const file of files) {
    const stem = file.replace(/\.test\.ts$/, "");
    const slug = slugify(stem);
    const id = `test.${slug}`;
    if (existingIds.has(id) || seenId.has(id)) continue;
    seenId.add(id);

    let sizeBytes = 0;
    let text = "";
    try {
      sizeBytes = fs.statSync(path.join(TEST_DIR, file)).size;
      text = fs.readFileSync(path.join(TEST_DIR, file), "utf8");
    } catch { /* noop */ }
    const describes = (text.match(/^\s*describe\s*\(/gm) || []).length;
    const its       = (text.match(/^\s*(?:it|test)\s*\(/gm) || []).length;
    stats.totalDescribes += describes;
    stats.totalIts += its;

    newNodes.push({
      id,
      layer: "L6",
      subgroup: "test",
      parent: "core.tests",
      label: stem,
      status: its > 0 ? "built" : "stub",
      color: "#22c55e",
      size: 0.28 + Math.min(0.20, Math.log10(1 + its) * 0.06),
      tier: 0,
      ext: "ts",
      sizeBytes,
      file: `mcp-server/src/__tests__/${file}`,
      describeCount: describes,
      itCount: its,
    });
    stats.nodesEmitted++;
    if (existingIds.has("core.tests")) {
      pushEdge("core.tests", id, "contains", "active", 0.15);
    }

    // Engine-of-test resolution: filename stem usually matches engine name
    const engineId = engineLookup.get(slug);
    if (engineId) {
      pushEdge(engineId, id, "tested_by", "active", 0.30);
      stats.testedByEdges++;
    } else {
      stats.unresolvedEngine++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    testsDir: "mcp-server/src/__tests__",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "tests-atomic-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  files scanned:        ${result.stats.filesScanned}`);
  console.log(`  emitted:              ${result.stats.nodesEmitted}`);
  console.log(`  tested_by edges:      ${result.stats.testedByEdges}`);
  console.log(`  unresolved engine:    ${result.stats.unresolvedEngine}`);
  console.log(`  total describes / its: ${result.stats.totalDescribes} / ${result.stats.totalIts}`);
}
