#!/usr/bin/env node
// audit-phase2-crossdomain.mjs
// Phase 2 — cross-domain analysis: bridge detection, cycle detection,
// doctrine sweep, dead-code candidates. Reads phase0_awareness.json (cache)
// and emits phase2_crossdomain.json.
//
// Spec §80-86. Tier 1 only — no madge/jq, just node fs + JSON traversal.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/prism";
const VIZ = join(ROOT, "state/shared/system-viz");
const ARGS = new Set(process.argv.slice(2));
const VERBOSE = ARGS.has("--verbose");
const QUICK = ARGS.has("--quick");

function log(...m) { if (VERBOSE) console.log("[ph2]", ...m); }

// 1. Load cached awareness — DO NOT re-parse system-graph.json.
function loadAwareness() {
  const p = join(VIZ, "phase0_awareness.json");
  if (!existsSync(p)) {
    throw new Error("phase0_awareness.json missing — run phase 0 first");
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

// 2. We DO need raw graph for bridge/cycle. One-shot read, free memory after.
function loadGraph() {
  const p = join(VIZ, "system-graph.json");
  if (!existsSync(p)) return null;
  log(`loading raw graph (${(statSync(p).size / 1e6).toFixed(1)}MB) — phase 2 needs adjacency`);
  return JSON.parse(readFileSync(p, "utf8"));
}

// 3. Bridge detection: intra-domain pairs of nodes that share a 1-hop neighbor
//    but have no direct edge. Heuristic for "should be 0-hop" couplings.
//    Uses subgroup as domain proxy (most precise field on PRISM nodes).
function detectBridges(graph) {
  const adj = new Map(); // nodeId → Set<nodeId>
  const nodeMeta = new Map(); // nodeId → {domain, layer}
  for (const n of graph.nodes) {
    nodeMeta.set(n.id, { domain: n.subgroup || n.layer || "other", layer: n.layer });
    adj.set(n.id, new Set());
  }
  for (const e of graph.edges) {
    const a = e.from, b = e.to;
    if (!adj.has(a) || !adj.has(b)) continue;
    adj.get(a).add(b);
    adj.get(b).add(a);
  }

  const bridges = [];
  let pairsConsidered = 0;
  const HARD_CAP = QUICK ? 50 : 500;

  for (const [hub, neighbors] of adj.entries()) {
    if (neighbors.size < 2 || neighbors.size > 50) continue; // skip mega-hubs
    const arr = [...neighbors];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        pairsConsidered++;
        const a = arr[i], b = arr[j];
        const ma = nodeMeta.get(a), mb = nodeMeta.get(b);
        if (!ma || !mb) continue;
        if (ma.domain !== mb.domain) continue; // intra-domain only
        if (adj.get(a).has(b)) continue; // already connected
        bridges.push({
          a, b, sharedHub: hub, domain: ma.domain,
          reason: `intra-${ma.domain} pair shares hub ${hub} but no direct edge`,
        });
        if (bridges.length >= HARD_CAP) break;
      }
      if (bridges.length >= HARD_CAP) break;
    }
    if (bridges.length >= HARD_CAP) break;
  }
  log(`  bridges: ${bridges.length} (from ${pairsConsidered} intra-pairs)`);
  return bridges;
}

// 4. Cycle detection: capped DFS, depth ≤ 6, only intra-engine cycles.
function detectCycles(graph) {
  if (QUICK) {
    log("  cycles: skipped (--quick)");
    return [];
  }
  const adj = new Map();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const e of graph.edges) {
    if (!adj.has(e.from)) continue;
    adj.get(e.from).push(e.to);
  }
  const cycles = [];
  const onStack = new Set();
  const visited = new Set();
  const HARD_CAP = 50;
  const DEPTH_CAP = 6;
  const NODE_BUDGET = 5000; // visit limit

  let visitedNodes = 0;

  function dfs(node, stack) {
    if (cycles.length >= HARD_CAP) return;
    if (visitedNodes >= NODE_BUDGET) return;
    visitedNodes++;
    if (stack.length > DEPTH_CAP) return;
    onStack.add(node);
    stack.push(node);
    const neighbors = adj.get(node) || [];
    for (const nb of neighbors) {
      if (cycles.length >= HARD_CAP) break;
      if (onStack.has(nb)) {
        const idx = stack.indexOf(nb);
        if (idx >= 0 && stack.length - idx >= 2) {
          cycles.push({ cycle: [...stack.slice(idx), nb], length: stack.length - idx });
        }
      } else if (!visited.has(nb)) {
        dfs(nb, stack);
      }
    }
    stack.pop();
    onStack.delete(node);
    visited.add(node);
  }

  for (const n of graph.nodes) {
    if (cycles.length >= HARD_CAP || visitedNodes >= NODE_BUDGET) break;
    if (!visited.has(n.id)) dfs(n.id, []);
  }
  log(`  cycles: ${cycles.length} (visited ${visitedNodes} nodes)`);
  return cycles;
}

// 5. Doctrine sweep — extract HARD RULE patterns from CLAUDE.md and grep
//    src/engines for violations. Tier 1: regex over file contents only.
const DOCTRINE_RULES = [
  {
    id: "no-inline-kienzle",
    label: "Inline Kienzle/Taylor/material constants forbidden",
    pattern: /(?:kc1\.?1\s*[=:]\s*\d{3,}|taylorC\s*[=:]\s*\d|\bkienzleConstant\s*=\s*\d)/i,
    severity: "CRITICAL",
    fix: "import from src/physics/constants.ts",
  },
  {
    id: "no-stub-engines",
    label: "Stub/placeholder return forbidden",
    pattern: /return\s*\{\s*ok\s*:\s*false\s*,\s*stub\s*:\s*true/,
    severity: "CRITICAL",
    fix: "implement real logic or remove dispatcher reference",
  },
  {
    id: "no-todo-fixme",
    label: "TODO/FIXME/HACK markers in production code",
    pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i,
    severity: "MAJOR",
    fix: "resolve or convert to roadmap unit",
  },
  {
    id: "no-empty-catch",
    label: "Empty catch block silences errors",
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: "MAJOR",
    fix: "log + rethrow or recover with explicit reason",
  },
  {
    id: "no-as-any",
    label: "Type-erasing cast (as any / as unknown as)",
    pattern: /\bas\s+any\b|\bas\s+unknown\s+as\s+\w+/,
    severity: "MAJOR",
    fix: "narrow types properly or extend interface",
  },
];

function doctrineSweep() {
  const enginesDir = join(ROOT, "mcp-server/src/engines");
  if (!existsSync(enginesDir)) return [];
  const files = readdirSync(enginesDir).filter((f) => f.endsWith(".ts"));
  const violations = [];
  const FILE_BUDGET = QUICK ? 200 : files.length;
  let scanned = 0;

  for (const f of files.slice(0, FILE_BUDGET)) {
    const fullPath = join(enginesDir, f);
    let text;
    try { text = readFileSync(fullPath, "utf8"); } catch { continue; }
    scanned++;
    for (const rule of DOCTRINE_RULES) {
      const m = text.match(rule.pattern);
      if (m) {
        // approximate line number
        const before = text.slice(0, m.index || 0);
        const line = (before.match(/\n/g) || []).length + 1;
        violations.push({
          file: `mcp-server/src/engines/${f}`,
          line,
          ruleId: rule.id,
          label: rule.label,
          severity: rule.severity,
          fix: rule.fix,
          excerpt: (m[0] || "").slice(0, 80),
        });
      }
    }
  }
  log(`  doctrine: ${violations.length} violations across ${scanned} engine files`);
  return violations;
}

// 6. Dead-code candidates: orphans from phase0 with size > 0
function deadCodeCandidates(awareness, graph) {
  const orphans = (awareness.layers?.systemGraph?.orphanCandidates || [])
    .filter((o) => o.outboundEdges > 0)
    .map((o) => {
      const n = graph?.nodes?.find((nn) => nn.id === o.id);
      return {
        id: o.id,
        domain: o.domain,
        outboundEdges: o.outboundEdges,
        size: n?.size || 0,
        status: n?.status || "unknown",
        importance: n?.awareness?.svi || 0,
      };
    })
    .filter((o) => o.size > 0 && o.importance > 0)
    .slice(0, 100);
  log(`  dead-code candidates: ${orphans.length}`);
  return orphans;
}

async function main() {
  log("phase2: cross-domain analysis");
  const aware = loadAwareness();
  const graph = loadGraph();

  const result = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    quick: QUICK,
    bridges: graph ? detectBridges(graph) : [],
    cycles: graph ? detectCycles(graph) : [],
    doctrineViolations: doctrineSweep(),
    deadCodeCandidates: graph ? deadCodeCandidates(aware, graph) : [],
  };

  result.stats = {
    bridges: result.bridges.length,
    cycles: result.cycles.length,
    doctrineViolations: result.doctrineViolations.length,
    deadCodeCandidates: result.deadCodeCandidates.length,
  };

  const out = join(VIZ, "phase2_crossdomain.json");
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`phase2: wrote ${out}`);
  console.log(
    `phase2: bridges=${result.stats.bridges} cycles=${result.stats.cycles} doctrine=${result.stats.doctrineViolations} dead=${result.stats.deadCodeCandidates}`,
  );
}

main().catch((e) => {
  console.error("phase2 failed:", e);
  process.exit(1);
});
