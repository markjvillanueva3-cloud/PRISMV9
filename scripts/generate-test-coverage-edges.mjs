#!/usr/bin/env node
/**
 * generate-test-coverage-edges.mjs — emit test→engine "covers" edges so the
 * viz shows which tests exercise which engines. Two signals:
 *
 *   1. Filename convention:  FooEngine.test.ts  ↔ eng.<dom>.fooengine
 *      (strongest signal — explicit per-engine coverage by Vitest convention)
 *
 *   2. Import resolution: any test file that imports from a relative path
 *      whose stem matches an engine stem.
 *
 * Output: state/shared/system-viz/test-coverage-edges-augmentation.json
 *   Edge type: "covers" (active) — the test exercises the engine
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEST_DIR = path.join(ROOT, "mcp-server", "src", "__tests__");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const ATOMIC_DEPTH = 3;
const IMPORT_RE = /import\s+(?:[^"']+?\s+from\s+)?["'](\.[^"']+)["']/g;
const TEST_SUFFIX = /\.(test|spec)\.ts$/i;
const ENGINE_SUFFIX = /engine$/;

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", stats: {} };
  const graph = JSON.parse(fs.readFileSync(GRAPH, "utf8"));

  // Build engine-stem → id index and test-stem → id index
  const engineStemToId = new Map();
  const testStemToId = new Map();
  for (const n of graph.nodes) {
    if (n.layer === "L5" && n.id?.startsWith("eng.") && n.id.split(".").length === ATOMIC_DEPTH) {
      const stem = n.id.split(".").pop();
      engineStemToId.set(stem, n.id);
    }
    if (n.layer === "L6" && n.subgroup === "test" && n.id?.startsWith("test.")) {
      // test ids look like test.<lowercase-stem>
      const stem = n.id.slice("test.".length).toLowerCase();
      testStemToId.set(stem, n.id);
    }
  }

  const newEdges = [];
  const seenEdge = new Set();
  function pushEdge(from, to, signal) {
    const k = `${from}|${to}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({
      from, to,
      type: "covers",
      status: "active",
      intensity: signal === "filename" ? 0.55 : 0.30,
      signal,
    });
    return true;
  }

  const stats = {
    testsScanned: 0,
    coveredByFilename: 0,
    coveredByImport: 0,
    importEdges: 0,
    enginesWithoutTest: 0,
    multiCovered: 0,
    perEngineHits: {},
  };

  // Walk test dir recursively
  function walk(dir) {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.isFile() || !TEST_SUFFIX.test(e.name)) continue;
      stats.testsScanned++;
      processTest(p);
    }
  }

  function processTest(testPath) {
    const fname = path.basename(testPath).replace(TEST_SUFFIX, "");
    const fnameLower = fname.toLowerCase();
    const testId = testStemToId.get(fnameLower);
    if (!testId) return;

    // Signal 1: filename convention
    if (ENGINE_SUFFIX.test(fnameLower)) {
      const engId = engineStemToId.get(fnameLower);
      if (engId) {
        if (pushEdge(testId, engId, "filename")) {
          stats.coveredByFilename++;
          stats.perEngineHits[engId] = (stats.perEngineHits[engId] || 0) + 1;
        }
      }
    }

    // Signal 2: imports
    let content;
    try { content = fs.readFileSync(testPath, "utf8"); }
    catch { return; }
    let m;
    while ((m = IMPORT_RE.exec(content)) !== null) {
      const target = m[1];
      const stem = path.basename(target.replace(/\.(js|ts|mjs)$/, "")).toLowerCase();
      const engId = engineStemToId.get(stem);
      if (engId) {
        if (pushEdge(testId, engId, "import")) {
          stats.coveredByImport++;
          stats.importEdges++;
          stats.perEngineHits[engId] = (stats.perEngineHits[engId] || 0) + 1;
        }
      }
    }
  }

  walk(TEST_DIR);

  // Find engines without any test coverage
  for (const id of engineStemToId.values()) {
    if (!stats.perEngineHits[id]) stats.enginesWithoutTest++;
  }
  stats.multiCovered = Object.values(stats.perEngineHits).filter(c => c >= 2).length;

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes: [],
    newEdges,
    stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "test-coverage-edges-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  const s = result.stats;
  console.log(`  tests scanned:           ${s.testsScanned}`);
  console.log(`  filename-convention hits:${s.coveredByFilename}`);
  console.log(`  import-based hits:       ${s.coveredByImport}`);
  console.log(`  total covers edges:      ${result.newEdges.length}`);
  console.log(`  engines w/o test:        ${s.enginesWithoutTest}`);
  console.log(`  engines w/ ≥2 tests:     ${s.multiCovered}`);
  console.log(`  ── top 10 most-tested engines ──`);
  for (const [id, n] of Object.entries(s.perEngineHits).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${id.padEnd(50)} ${n}`);
  }
}
