#!/usr/bin/env node
/**
 * generate-engine-saturate.mjs — emit EVERY engine in
 * mcp-server/src/engines/*.ts as an atomic L5 node, dropping the 9/domain
 * cap that engine-domain-inventory imposes. Goal: from ~275 atomic engines
 * to ~3.2k atomic engines so every named engine has a node.
 *
 * Atomic id format:  eng.<domain>.<lowercased-engine-name>
 *   (matches engine-graph.mjs / engine-domain-inventory.mjs convention)
 *
 * Each engine maps to a domain via the same suffix-classifier we already use
 * elsewhere (longest-suffix-match against a closed list). Engines with no
 * matching suffix fall to "other".
 *
 * Domain rollup parents already exist as L5 rollup nodes (eng.<domain>) so
 * we do NOT create those — only emit the atomic children + their containment
 * edge.
 *
 * Output: state/shared/system-viz/engine-saturate-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const ENG_DIR = path.join(ROOT, "mcp-server", "src", "engines");

// Use the SAME prefix-match classifier as generate-engine-domain-inventory.mjs:
// only known L5 domains in the live graph qualify, sorted longest-first so
// "milling" wins over "mill" and "lathe" doesn't catch "lathethermo".
function loadKnownDomains(graph) {
  const l5 = graph.nodes.filter(n =>
    n.layer === "L5" && n.id?.startsWith("eng.") && n.id.split(".").length === 2
  );
  const seen = new Set();
  const domains = [];
  for (const n of l5) {
    const key = n.id.replace(/^eng\./, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    domains.push(key);
  }
  // Longest first so multi-token names beat their substrings
  domains.sort((a, b) => b.length - a.length);
  return domains;
}

function classifyEngine(engineLower, domains) {
  for (const dom of domains) {
    if (dom === "other") continue;
    if (engineLower.startsWith(dom)) return dom;
  }
  return "other";
}

function generate() {
  if (!fs.existsSync(GRAPH)) {
    console.error("graph missing:", GRAPH);
    return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  }
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));
  const domains = loadKnownDomains(graph);

  const files = fs.readdirSync(ENG_DIR).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"));

  const stats = {
    enginesScanned: files.length,
    nodesEmitted: 0,
    alreadyAtomic: 0,
    domainCreated: 0,
    parentMissing: 0,
    perDomain: {},
  };

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  // Track which domain rollups need to exist (some L5 rollups may not have
  // been emitted by the base graph if the domain is novel)
  const domainsNeeded = new Set();

  for (const file of files) {
    const stem = file.replace(/\.ts$/, "");
    const lower = stem.toLowerCase();
    const dom = classifyEngine(lower, domains);
    const id = `eng.${dom}.${lower}`;
    if (existingIds.has(id) || seenId.has(id)) {
      stats.alreadyAtomic++;
      continue;
    }
    seenId.add(id);
    const parent = `eng.${dom}`;
    domainsNeeded.add(dom);

    let sizeBytes = 0;
    try { sizeBytes = fs.statSync(path.join(ENG_DIR, file)).size; } catch { /* noop */ }
    // status heuristic: <1KB = stub
    const status = sizeBytes < 1024 ? "stub" : "built";

    newNodes.push({
      id,
      layer: "L5",
      subgroup: "atomic_engine",
      parent,
      label: stem,
      status,
      size: 0.32 + Math.min(0.42, Math.log10(1 + sizeBytes / 1024) * 0.15),
      tier: 1,
      ext: "ts",
      sizeBytes,
      file: `mcp-server/src/engines/${file}`,
      domain: dom,
    });
    stats.nodesEmitted++;
    stats.perDomain[dom] = (stats.perDomain[dom] || 0) + 1;
    if (existingIds.has(parent)) {
      pushEdge(parent, id, "contains", "active", 0.18);
    } else {
      stats.parentMissing++;
    }
  }

  // Emit synthetic L5 domain rollups for any domain that doesn't already
  // exist as a node — keeps containment edges valid.
  for (const dom of domainsNeeded) {
    const parent = `eng.${dom}`;
    if (existingIds.has(parent) || seenId.has(parent)) continue;
    const childCount = stats.perDomain[dom] || 0;
    if (childCount === 0) continue;
    seenId.add(parent);
    newNodes.push({
      id: parent,
      layer: "L5",
      subgroup: "rollup",
      label: `${dom}\n(${childCount} engines)`,
      status: "built",
      color: "#22c55e",
      size: 0.7 + Math.sqrt(childCount) * 0.10,
      tier: 1,
      synthetic: true,
    });
    stats.domainCreated++;
    // Re-emit contains edges that previously failed parent-missing
    for (const n of newNodes) {
      if (n.parent === parent) pushEdge(parent, n.id, "contains", "active", 0.18);
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    enginesDir: "mcp-server/src/engines",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "engine-saturate-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) {
  console.log(`  error: ${result.error}`);
} else {
  console.log(`  engines scanned:    ${result.stats.enginesScanned}`);
  console.log(`  atomic emitted:     ${result.stats.nodesEmitted}`);
  console.log(`  already atomic:     ${result.stats.alreadyAtomic}`);
  console.log(`  domains synthesized:${result.stats.domainCreated}`);
  console.log(`  parent missing:     ${result.stats.parentMissing}`);
  console.log(`  top domains:`);
  for (const [d, n] of Object.entries(result.stats.perDomain).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${d.padEnd(20)} ${n}`);
  }
}
