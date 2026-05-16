#!/usr/bin/env node
/**
 * generate-engine-graph.mjs — emit the engine↔engine internal wiring net.
 *
 * Two outputs:
 *   1. SOLID edges (status: "active") — real `from "./XEngine.js"` imports
 *      between engine files. Shows the actual neural net of who-calls-whom.
 *   2. GHOST edges (status: "ghost", type: "suggested_peer") — engines that
 *      should plausibly be wired (same domain, complementary names) but
 *      currently share zero imports either direction. Surfaces "could
 *      benefit from being bridged" wiring opportunities.
 *
 * Edges are L5-atomic ↔ L5-atomic (the engine molecule ids minted by
 * generate-galaxy-constituents). When an atomic id is missing from the
 * graph we fall back to the engine-domain rollup (`eng.<domain>`).
 *
 * Output: state/shared/system-viz/engine-graph-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGraph } from "./lib/system-viz-graph.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const ENGINE_DIR = path.join(ROOT, "mcp-server", "src", "engines");

const MAX_GHOST_PER_ENGINE = 4;     // cap noise: top-K suggested peers per engine
const MIN_DOMAIN_FOR_GHOST = 3;     // need ≥3 engines in domain to suggest within-domain peers

function listEngines() {
  if (!fs.existsSync(ENGINE_DIR)) return [];
  return fs.readdirSync(ENGINE_DIR, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") && !e.name.endsWith(".d.ts"))
    .map(e => ({
      name: e.name.replace(/\.ts$/, ""),
      path: path.join(ENGINE_DIR, e.name),
      lower: e.name.replace(/\.ts$/, "").toLowerCase(),
    }));
}


function loadDomainKeys(graph) {
  const rollups = graph.nodes.filter(n =>
    n.layer === "L5" && n.id.startsWith("eng.")
    && (!n.parent || !n.parent.startsWith("eng."))
  );
  const list = rollups.map(n => ({
    nodeId: n.id,
    key: (n.id.replace(/^eng\./, "") || "").toLowerCase(),
  })).filter(x => x.key.length > 0);
  list.sort((a, b) => b.key.length - a.key.length);
  return list;
}

function classifyEngine(engineName, domains) {
  const lower = engineName.toLowerCase();
  for (const { key, nodeId } of domains) {
    if (lower.startsWith(key)) return nodeId;
  }
  return "eng.other";
}

function scrapeEngineImports(text) {
  const out = new Set();
  // from "./SomethingEngine.js"  OR  from "./Something.js"
  // import("./SomethingEngine.js")
  const re = /(?:from\s+["']|import\s*\(\s*["'])\.\/([A-Za-z0-9_]+)(?:\.js)?["']/g;
  let m;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

function tokenize(name) {
  // Split CamelCase into tokens: AdaptiveControlEngine → ['adaptive','control','engine']
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/\s+/).filter(t => t && t !== "engine");
}

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

function generate() {
  const graph = loadGraph();
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  const domains = loadDomainKeys(graph);
  const engines = listEngines();

  // Build atomic-id resolver. Atomic engine L5 nodes are emitted by
  // engine-domain-inventory and shaped `eng.<domain>.<enginename-lower>`
  // (dot delimiter, top-9 by domain). We try the atomic form first and
  // fall back to the `eng.<domain>` rollup when an engine isn't in the
  // top-K drilled set.
  function atomicIdFor(eng) {
    const dom = classifyEngine(eng.name, domains);
    const atomDot = `${dom}.${eng.lower}`;
    if (nodeIds.has(atomDot)) return atomDot;
    return nodeIds.has(dom) ? dom : null;
  }

  const stats = {
    enginesScanned: 0,
    realImports: 0,
    realEdgesEmitted: 0,
    selfLoops: 0,
    unresolvedTarget: 0,
    ghostEdgesEmitted: 0,
    ghostSkippedAlreadyWired: 0,
    ghostSkippedSmallDomain: 0,
  };

  // ===== 1. REAL engine→engine import edges =====
  const realByEngine = new Map();      // engineName → Set of imported engine names
  const incomingByEngine = new Map();  // engineName → Set of engines that import it
  const engineNameSet = new Set(engines.map(e => e.name));
  const engineByName = new Map(engines.map(e => [e.name, e]));

  for (const eng of engines) {
    let text = "";
    try { text = fs.readFileSync(eng.path, "utf8"); } catch { continue; }
    stats.enginesScanned++;
    const imp = scrapeEngineImports(text).filter(n => engineNameSet.has(n));
    realByEngine.set(eng.name, new Set(imp));
    stats.realImports += imp.length;
    for (const target of imp) {
      if (!incomingByEngine.has(target)) incomingByEngine.set(target, new Set());
      incomingByEngine.get(target).add(eng.name);
    }
  }

  // ===== 1a. Emit atomic L5 engine nodes for any engine that has cross-import
  // activity (at least 1 import out OR at least 1 incoming import). Without
  // these nodes, intra-domain edges collapse to self-loops on the rollup.
  // We only emit for the active subset — silent isolates would just bloat
  // the graph without showing a wire.
  const newNodes = [];
  for (const eng of engines) {
    const out = realByEngine.get(eng.name) || new Set();
    const inc = incomingByEngine.get(eng.name) || new Set();
    if (out.size === 0 && inc.size === 0) continue;
    const dom = classifyEngine(eng.name, domains);
    const atomDot = `${dom}.${eng.lower}`;
    if (nodeIds.has(atomDot)) continue;
    if (!nodeIds.has(dom)) continue;
    newNodes.push({
      id: atomDot,
      label: eng.name,
      layer: "L5",
      kind: "engine",
      parent: dom,
      info: `${out.size} imports → · ${inc.size} ← incoming`,
      file: path.relative(ROOT, eng.path).replace(/\\/g, "/"),
    });
    nodeIds.add(atomDot);
  }
  stats.atomicNodesEmitted = newNodes.length;

  const newEdges = [];
  const seen = new Set();
  function pushEdge(from, to, type, status, intensity) {
    if (from === to) { stats.selfLoops++; return false; }
    const k = `${from}|${to}|${type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    if (!nodeIds.has(from) || !nodeIds.has(to)) {
      stats.unresolvedTarget++;
      return false;
    }
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const eng of engines) {
    const fromId = atomicIdFor(eng);
    if (!fromId) continue;
    const imports = realByEngine.get(eng.name) || new Set();
    for (const tgtName of imports) {
      const tgt = engineByName.get(tgtName);
      if (!tgt) continue;
      const toId = atomicIdFor(tgt);
      if (!toId) continue;
      if (pushEdge(fromId, toId, "engine_import", "active", 0.45)) {
        stats.realEdgesEmitted++;
      }
    }
  }

  // ===== 2. GHOST engine↔engine peer suggestions =====
  // Strategy: for each engine, find candidates within the same domain that
  // share ≥1 token with it AND have no real import edge in either direction.
  // Rank by token-jaccard score, take top K, emit ghost "suggested_peer".
  const enginesByDomain = new Map();   // domainId → engine[]
  for (const eng of engines) {
    const dom = classifyEngine(eng.name, domains);
    if (!enginesByDomain.has(dom)) enginesByDomain.set(dom, []);
    enginesByDomain.get(dom).push(eng);
  }

  const tokensCache = new Map();
  function tokensFor(name) {
    if (!tokensCache.has(name)) tokensCache.set(name, tokenize(name));
    return tokensCache.get(name);
  }

  for (const [domId, peers] of enginesByDomain.entries()) {
    if (peers.length < MIN_DOMAIN_FOR_GHOST) {
      stats.ghostSkippedSmallDomain += peers.length;
      continue;
    }
    for (const a of peers) {
      const fromId = atomicIdFor(a);
      if (!fromId) continue;
      const aImports = realByEngine.get(a.name) || new Set();
      const aIncoming = incomingByEngine.get(a.name) || new Set();
      const aTok = tokensFor(a.name);
      if (aTok.length === 0) continue;

      const candidates = [];
      for (const b of peers) {
        if (b.name === a.name) continue;
        if (aImports.has(b.name) || aIncoming.has(b.name)) {
          stats.ghostSkippedAlreadyWired++;
          continue;
        }
        const bTok = tokensFor(b.name);
        if (bTok.length === 0) continue;
        const score = jaccard(aTok, bTok);
        if (score < 0.34) continue;     // must share ≥1/3 tokens
        candidates.push({ b, score });
      }
      candidates.sort((x, y) => y.score - x.score);
      const top = candidates.slice(0, MAX_GHOST_PER_ENGINE);
      for (const { b, score } of top) {
        const toId = atomicIdFor(b);
        if (!toId) continue;
        if (pushEdge(fromId, toId, "suggested_peer", "ghost", Math.min(0.6, 0.2 + score * 0.4))) {
          stats.ghostEdgesEmitted++;
        }
      }
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "engine-graph-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  engines scanned:           ${result.stats.enginesScanned}`);
console.log(`  atomic L5 nodes emitted:   ${result.stats.atomicNodesEmitted}`);
console.log(`  real imports detected:     ${result.stats.realImports}`);
console.log(`  real edges emitted:        ${result.stats.realEdgesEmitted}`);
console.log(`  ghost peer edges:          ${result.stats.ghostEdgesEmitted}`);
console.log(`  ghost skipped (existing):  ${result.stats.ghostSkippedAlreadyWired}`);
console.log(`  ghost skipped (sm dom):    ${result.stats.ghostSkippedSmallDomain}`);
console.log(`  unresolved targets:        ${result.stats.unresolvedTarget}`);
console.log(`  self-loops dropped:        ${result.stats.selfLoops}`);
console.log(`  total edges in this aug:   ${result.newEdges.length}`);
