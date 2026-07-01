#!/usr/bin/env node
/**
 * system-viz-completeness-check.mjs
 *
 * Precondition checker for `/rgs4 atomic-roadmap`. The atomic-first master
 * roadmap is only as good as the graph it's emitted from — and the graph
 * has known incompleteness modes (orphan nodes, missing hook→engine edges,
 * under-counted dispatcher actions). This script audits the graph against
 * a fixed completeness rubric and returns ok/blocked verdict.
 *
 * Usage:
 *   node H:/prism/.claude/scripts/system-viz-completeness-check.mjs
 *   node H:/prism/.claude/scripts/system-viz-completeness-check.mjs --json
 *
 * Exit codes:
 *   0 — graph is sufficiently complete; atomic-roadmap may proceed
 *   1 — graph has blocker(s); list them and fail
 *   2 — graph file missing or unreadable
 *
 * Closes the v4 V5-POINTER gap "No graph-completeness self-check — /rgs4
 * atomic-roadmap should refuse to emit a master roadmap if orphan rate >5%
 * or Tier-0 inbound-edge coverage <50%."
 */

import fs from "node:fs";

const GRAPH = "H:/prism/state/shared/system-viz/system-graph.json";
const BUILD_STATE = "H:/prism/state/shared/BUILD_STATE.json";
const INVENTORY = "H:/prism/PRISM-INVENTORY-LATEST.md";

const JSON_FLAG = process.argv.includes("--json");

function fail(reason, exitCode = 2) {
  if (JSON_FLAG) {
    console.log(JSON.stringify({ ok: false, error: reason, exitCode }));
  } else {
    console.error(`system-viz-completeness-check: ${reason}`);
  }
  process.exit(exitCode);
}

function readJSON(path) {
  if (!fs.existsSync(path)) return null;
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (e) {
    return null;
  }
}

const G = readJSON(GRAPH);
if (!G) fail(`graph not found or unreadable at ${GRAPH}`);

const BS = readJSON(BUILD_STATE);

// Build adjacency maps once.
const inEdges = new Map();
const outEdges = new Map();
for (const e of G.edges || []) {
  outEdges.set(e.from, (outEdges.get(e.from) || 0) + 1);
  inEdges.set(e.to, (inEdges.get(e.to) || 0) + 1);
}

const checks = [];

// 1. Orphan rate — nodes with zero edges in any direction. Target ≤5%.
{
  const orphans = (G.nodes || []).filter(
    (n) => !inEdges.has(n.id) && !outEdges.has(n.id),
  );
  const pct = ((orphans.length / Math.max(1, G.nodes.length)) * 100);
  checks.push({
    name: "orphan_rate_pct",
    threshold: 5,
    actual: Number(pct.toFixed(1)),
    ok: pct <= 5,
    detail: `${orphans.length}/${G.nodes.length} nodes orphan (${pct.toFixed(1)}%)`,
    fix: orphans.length === 0 ? null :
      `Top orphans: ${orphans.slice(0, 5).map((n) => n.id).join(", ")}. ` +
      `Wire these in generate-system-viz.mjs by emitting fs/use/import edges.`,
  });
}

// 2. Tier-0 inbound coverage — atomic primitives (L6/L7/L8/L9) must be
// referenced by SOMETHING for the gate to be meaningful. Target ≥50%.
{
  const t0 = (G.nodes || []).filter((n) =>
    ["L6", "L7", "L8", "L9"].includes(n.layer),
  );
  const connected = t0.filter((n) => inEdges.has(n.id));
  const pct = ((connected.length / Math.max(1, t0.length)) * 100);
  checks.push({
    name: "tier0_inbound_coverage_pct",
    threshold: 50,
    actual: Number(pct.toFixed(1)),
    ok: pct >= 50,
    detail: `${connected.length}/${t0.length} Tier-0 nodes have inbound edges (${pct.toFixed(1)}%)`,
    fix: pct >= 50 ? null :
      `${t0.length - connected.length} Tier-0 atoms unused. Add 'use'/'reference' ` +
      `edges from L4/L5 nodes that consume them.`,
  });
}

// 3. Hook modeling — `core.hooks_cl` should have edges showing what hooks
// fire on what events / which engines they protect. Currently 0 edges.
{
  const hookNode = (G.nodes || []).find((n) => n.id === "core.hooks_cl");
  const hasEdges = hookNode &&
    (inEdges.has(hookNode.id) || outEdges.has(hookNode.id));
  checks.push({
    name: "hook_node_has_edges",
    threshold: 1,
    actual: hasEdges ? 1 : 0,
    ok: !!hasEdges,
    detail: hookNode
      ? hasEdges ? "core.hooks_cl has edges" : "core.hooks_cl is orphan (440 hooks unmodeled)"
      : "core.hooks_cl node missing entirely",
    fix: hasEdges ? null :
      "Add 'fire' edges from each hook to the engine/event it protects. " +
      "Source: H:/.claude/settings.json hook registrations.",
  });
}

// 4. Phase 1 (atomic foundation gap) detector — must produce items OR an
// explicit "no gaps detected" annotation. Empty array = unimplemented.
{
  const phase1 = (G.meta?.roadmap?.phases || [])[1];
  const items = phase1?.items?.length || 0;
  const explicitlyClean = phase1?.detected === true || phase1?.note?.includes("no atomic gap");
  checks.push({
    name: "phase1_atomic_detector_implemented",
    threshold: 1,
    actual: (items > 0 || explicitlyClean) ? 1 : 0,
    ok: items > 0 || explicitlyClean,
    detail: items > 0
      ? `Phase 1 has ${items} item(s)`
      : explicitlyClean
        ? "Phase 1 explicitly clean"
        : "Phase 1 empty AND not annotated — detector unimplemented",
    fix: (items > 0 || explicitlyClean) ? null :
      "Implement atomic-gap detection in generate-system-viz.mjs: diff " +
      "physics-constants exports vs CLAUDE-BRIEF physics list, FormulaRegistry vs " +
      "expected formulas, AlgorithmRegistry vs expected algorithms.",
  });
}

// 5. Dispatcher action-count fidelity — graph should model ≥50% of real
// dispatcher actions. Real count comes from PRISM-INVENTORY-LATEST or
// BUILD_STATE; graph count is sum of actionCount across disp.* nodes.
{
  const disps = (G.nodes || []).filter((n) => n.id?.startsWith("disp."));
  const graphActions = disps.reduce(
    (s, d) => s + (d.actionCount || d.actions || 0),
    0,
  );
  const realActions = BS?.headline?.actions ||
    BS?.headline?.total_actions ||
    extractInventoryCount(INVENTORY, /actions?:\s*(\d+)/i) ||
    7302;
  const ratio = realActions > 0 ? graphActions / realActions : 0;
  checks.push({
    name: "dispatcher_action_modeling_ratio",
    threshold: 0.5,
    actual: Number(ratio.toFixed(2)),
    ok: ratio >= 0.5,
    detail: `Graph reports ${graphActions} actions across ${disps.length} dispatchers; ` +
      `inventory says ${realActions}. Coverage: ${(ratio * 100).toFixed(0)}%`,
    fix: ratio >= 0.5 ? null :
      `Populate node.actionCount per dispatcher in generate-system-viz.mjs. ` +
      `Source: each dispatcher's z.enum action list.`,
  });
}

// 6. Drift reconciliation — Phase 0 must be EMPTY (no drift) before atomic-
// roadmap emits a Phase-1+ heavy roadmap. Otherwise Phase 0 reconciliation
// is a prereq.
{
  const drift = BS?.headline?.drift_milestones ||
    BS?.headline?.drift ||
    G.meta?.headline?.drift ||
    0;
  checks.push({
    name: "envelope_drift_zero",
    threshold: 0,
    actual: drift,
    ok: drift === 0,
    detail: drift === 0
      ? "No envelope drift cases"
      : `${drift} envelope drift case(s) — Phase 0 reconciliation required first`,
    fix: drift === 0 ? null :
      "Run /envelope-sync to reconcile each drift case before /rgs4 atomic-roadmap.",
  });
}

// 7. Graph freshness — staler than 30 minutes means planning from
// possibly-out-of-date state.
{
  const generatedAt = G.generatedAt || G.meta?.generatedAt;
  if (!generatedAt) {
    checks.push({
      name: "graph_freshness_min",
      threshold: 30,
      actual: -1,
      ok: false,
      detail: "graph has no generatedAt timestamp",
      fix: "Regenerate via `node H:/prism/scripts/generate-system-viz.mjs`.",
    });
  } else {
    const ageMin = (Date.now() - new Date(generatedAt).getTime()) / 60000;
    checks.push({
      name: "graph_freshness_min",
      threshold: 30,
      actual: Math.round(ageMin),
      ok: ageMin <= 30,
      detail: `Graph generated ${Math.round(ageMin)} min ago`,
      fix: ageMin <= 30 ? null :
        "Regenerate via `node H:/prism/scripts/generate-system-viz.mjs`.",
    });
  }
}

// 8. Pending-merge frontends are visible in the graph (not just in disk).
{
  const pendingMerge = (G.nodes || []).filter((n) => n.status === "pending_merge");
  const expected = BS?.headline?.needs_frontend_merge_count || 0;
  const ok = pendingMerge.length === expected;
  checks.push({
    name: "pending_merge_visible",
    threshold: expected,
    actual: pendingMerge.length,
    ok,
    detail: `Graph models ${pendingMerge.length} pending merges; BUILD_STATE expects ${expected}`,
    fix: ok ? null :
      "Sync pending-merge node status in generate-system-viz.mjs against " +
      "BUILD_STATE.NEEDS_FRONTEND.",
  });
}

// Score: each check contributes equally; passing = 100/N, failing scaled
// to how close it is to threshold (capped at 90/N to never reward a fail
// as fully passing).
const N = checks.length;
const score = Math.round(
  checks.reduce((s, c) => {
    if (c.ok) return s + 100 / N;
    if (typeof c.threshold !== "number" || typeof c.actual !== "number") return s;
    const closeness = c.threshold > 0
      ? Math.max(0, Math.min(0.9, c.actual / c.threshold))
      : Math.max(0, Math.min(0.9, 1 - c.actual / 100)); // for "must be 0" thresholds
    return s + (closeness * 100) / N;
  }, 0),
);

const blockers = checks.filter((c) => !c.ok);
const ok = blockers.length === 0;

const out = {
  ok,
  score,
  generated_at: new Date().toISOString(),
  graph_path: GRAPH,
  checks,
  blockers: blockers.map((b) => ({ name: b.name, detail: b.detail, fix: b.fix })),
  recommendation: ok
    ? "Graph is sufficiently complete. /rgs4 atomic-roadmap may proceed."
    : `Graph has ${blockers.length} blocker(s). Resolve before /rgs4 atomic-roadmap to avoid emitting a misleading master roadmap.`,
};

if (JSON_FLAG) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log("SYSTEM-VIZ COMPLETENESS CHECK");
  console.log("==============================");
  console.log(`Verdict:     ${ok ? "PASS" : "BLOCK"}`);
  console.log(`Score:       ${score} / 100`);
  console.log("");
  console.log("Checks:");
  for (const c of checks) {
    console.log(`  ${c.ok ? "✓" : "✗"} ${c.name.padEnd(38)} ${c.detail}`);
  }
  if (blockers.length > 0) {
    console.log("");
    console.log("Blockers (resolve before atomic-roadmap):");
    for (const b of blockers) {
      console.log(`  - ${b.name}`);
      console.log(`      ${b.detail}`);
      if (b.fix) console.log(`      fix: ${b.fix}`);
    }
  }
  console.log("");
  console.log(out.recommendation);
}

function extractInventoryCount(file, regex) {
  if (!fs.existsSync(file)) return 0;
  const text = fs.readFileSync(file, "utf8");
  const m = text.match(regex);
  return m ? Number(m[1]) : 0;
}

process.exit(ok ? 0 : 1);
