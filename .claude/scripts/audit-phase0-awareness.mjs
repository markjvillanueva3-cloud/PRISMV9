#!/usr/bin/env node
// audit-phase0-awareness.mjs
// Phase 0 of forge-audit-omniscient — load 5 awareness layers and dispatch
// pagerank-analyzer for importance scoring. Emits phase0_awareness.json.
//
// 5 awareness layers (per spec 2026-05-09-U-FORGE-AUDIT-OMNISCIENT.md):
//   1. system-graph.json — orphans, bridges, coverage-by-domain
//   2. CODE_SYSTEM_INDEX.json — DSL shortcodes
//   3. wiki/index.md + memories/ — prior-art dedup
//   4. CLAUDE.md (project + global) — doctrine grading
//   5. PRISM-INVENTORY-LATEST + BUILD_STATE.json + MILESTONE_PROGRESS.json + BASELINE
//
// Output: state/shared/system-viz/phase0_awareness.json
// Cached so Phase 1+ subagents read this — no 41MB system-graph re-load per agent.

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const ROOT = "H:/prism";
const OUT = join(ROOT, "state/shared/system-viz/phase0_awareness.json");
const ARGS = new Set(process.argv.slice(2));
const VERBOSE = ARGS.has("--verbose");

function log(...m) { if (VERBOSE) console.log(...m); }
function maybeRead(p, transform = (x) => x) {
  if (!existsSync(p)) return null;
  try { return transform(readFileSync(p, "utf8")); } catch (e) { return { _error: e.message }; }
}
function shaOf(p) {
  if (!existsSync(p)) return null;
  return createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 12);
}

function streamGraphSummary(graphPath) {
  // 41MB — don't load whole into memory if we only need adjacency stats.
  // For Phase 0 we read it once, extract: nodeCount, edgeCount, orphan candidates
  // (zero inbound), per-domain bucket counts. Subsequent phases read this summary
  // instead of the raw graph when possible.
  if (!existsSync(graphPath)) return { _missing: true };
  const sz = statSync(graphPath).size;
  log(`  loading system-graph.json (${(sz / 1e6).toFixed(1)}MB) — single read`);
  const raw = readFileSync(graphPath, "utf8");
  let g;
  try { g = JSON.parse(raw); } catch (e) { return { _parseError: e.message }; }

  const nodes = g.nodes || [];
  const edges = g.edges || g.links || [];
  const inbound = new Map();
  const outbound = new Map();
  for (const e of edges) {
    const src = e.source || e.from;
    const dst = e.target || e.to;
    if (src) outbound.set(src, (outbound.get(src) || 0) + 1);
    if (dst) inbound.set(dst, (inbound.get(dst) || 0) + 1);
  }

  const orphans = [];
  const bridges = [];
  const domainCounts = {};
  for (const n of nodes) {
    const id = n.id || n.path || n.name;
    const dom = n.domain || n.layer || "other";
    domainCounts[dom] = (domainCounts[dom] || 0) + 1;
    if (!inbound.has(id) && (outbound.get(id) || 0) > 0) {
      orphans.push({ id, domain: dom, outboundEdges: outbound.get(id) });
    }
  }

  // Bridge candidates: pairs where shortest intra-domain path > 1.
  // Cheap heuristic at this phase — full betweenness deferred to Phase 2.
  // We just record adjacency-by-domain; Phase 2 walks it.
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    orphanCandidates: orphans.slice(0, 500),
    domainCounts,
    sha: shaOf(graphPath),
  };
}

function loadCodeIndex() {
  return maybeRead(
    join(ROOT, "mcp-server/data/docs/CODE_SYSTEM_INDEX.json"),
    JSON.parse
  );
}

function loadWikiIndex() {
  const idx = maybeRead(join(ROOT, "knowledge/wiki/index.md"));
  if (!idx) return { _missing: true };
  // Extract entry slugs only — full text load would balloon the cache
  const entries = (idx.match(/^- \[\[([^\]]+)\]\]/gm) || []).map((l) =>
    l.replace(/^- \[\[/, "").replace(/\]\].*$/, "")
  );
  return { entries, totalLines: idx.split(/\r?\n/).length };
}

function loadDoctrine() {
  return {
    project: maybeRead(join(ROOT, "CLAUDE.md")),
    global: maybeRead("C:/Users/wompu/.claude/CLAUDE.md"),
  };
}

function loadInventory() {
  return {
    inventoryMd: maybeRead(join(ROOT, "PRISM-INVENTORY-LATEST.md")),
    buildState: maybeRead(join(ROOT, "state/shared/BUILD_STATE.json"), JSON.parse),
    milestoneProgress: maybeRead(
      join(ROOT, "state/shared/MILESTONE_PROGRESS.json"),
      JSON.parse
    ),
    baseline: maybeRead(
      join(ROOT, "mcp-server/data/state/BASELINE_INVENTORY.json"),
      JSON.parse
    ),
    tribalUtilization: maybeRead(
      join(ROOT, "state/shared/tribal-utilization-report.json"),
      JSON.parse
    ),
  };
}

async function main() {
  log("phase0: loading 5 awareness layers");

  const layer1 = streamGraphSummary(
    join(ROOT, "state/shared/system-viz/system-graph.json")
  );
  log(`  layer 1 (graph): nodes=${layer1.nodeCount} edges=${layer1.edgeCount} orphans=${(layer1.orphanCandidates || []).length}`);

  const layer2 = loadCodeIndex();
  log(`  layer 2 (code index): ${layer2 ? Object.keys(layer2).length : "missing"} top-level keys`);

  const layer3 = loadWikiIndex();
  log(`  layer 3 (wiki): ${(layer3.entries || []).length} entries`);

  const layer4 = loadDoctrine();
  log(`  layer 4 (doctrine): project=${!!layer4.project} global=${!!layer4.global}`);

  const layer5 = loadInventory();
  log(`  layer 5 (inventory/state): buildState=${!!layer5.buildState} milestones=${!!layer5.milestoneProgress}`);

  // Importance scoring is dispatched out-of-band by the orchestrator
  // (pagerank-analyzer subagent). Phase 0 just shapes the input the agent
  // will read and writes the cache. The orchestrator merges the agent's
  // result back into phase0_awareness.json under .importance.
  const awareness = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    layers: {
      systemGraph: layer1,
      codeIndex: layer2 ? { _embedded: true, keys: Object.keys(layer2).slice(0, 20) } : { _missing: true },
      wiki: layer3,
      doctrine: {
        projectClaudeBytes: layer4.project ? layer4.project.length : 0,
        globalClaudeBytes: layer4.global ? layer4.global.length : 0,
      },
      inventory: {
        buildStateSummary: layer5.buildState
          ? {
              wired: layer5.buildState.wired_count ?? layer5.buildState.wiredCount,
              unwired: layer5.buildState.unwired_count ?? layer5.buildState.unwiredCount,
              pending_units: layer5.buildState.pending_units ?? layer5.buildState.pendingUnits,
              frontends_pending: (layer5.buildState.frontends_pending || layer5.buildState.frontendsPending || []).length,
              envelope_drift: (layer5.buildState.envelope_drift || layer5.buildState.envelopeDrift || []).length,
            }
          : null,
        milestoneSummary: layer5.milestoneProgress
          ? {
              total: (layer5.milestoneProgress.milestones || []).length,
              drifted: (layer5.milestoneProgress.milestones || []).filter(
                (m) => m.claimedStatus !== m.derivedStatus
              ).length,
            }
          : null,
        baselineSchemaVersion: layer5.baseline?.schemaVersion || null,
      },
    },
    importance: null,
  };

  writeFileSync(OUT, JSON.stringify(awareness, null, 2));
  console.log(`phase0: wrote ${OUT}`);
  console.log(
    `phase0: nodes=${layer1.nodeCount} edges=${layer1.edgeCount} orphans=${(layer1.orphanCandidates || []).length} wiki=${(layer3.entries || []).length}`
  );
}

main().catch((e) => {
  console.error("phase0 failed:", e);
  process.exit(1);
});
