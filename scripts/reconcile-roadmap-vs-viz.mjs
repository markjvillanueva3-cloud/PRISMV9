#!/usr/bin/env node
/**
 * reconcile-roadmap-vs-viz.mjs — MS-VIZ-ROADMAP-BIND
 *
 * Named deliverable from the milestone brief: a one-purpose CLI that reconciles
 * every milestone-envelope unit against the live system-viz graph. The
 * implementation lives in roadmap-to-viz-nodes.mjs (reconcileRoadmapVsViz) — this
 * is the dedicated entry point so the reconcile pass has a stable invocation
 * separate from the resolver CLI.
 *
 * Usage:
 *   node scripts/reconcile-roadmap-vs-viz.mjs [--json] [--graph <path>] [--milestones <dir>]
 *
 * Exit codes: 0 = clean · 2 = graph/dir error · 3 = UNRESOLVED units found (drift).
 */
import { reconcileRoadmapVsViz } from "./roadmap-to-viz-nodes.mjs";

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined; };

let rep;
try {
  rep = reconcileRoadmapVsViz({ graphPath: opt("--graph"), milestonesDir: opt("--milestones") });
} catch (err) {
  console.error(`reconcile failed: ${err?.message || String(err)}`);
  process.exit(2);
}
if (!rep.ok) {
  console.error(`reconcile error: ${rep.error}`);
  process.exit(2);
}
if (json) {
  process.stdout.write(JSON.stringify(rep, null, 2) + "\n");
} else {
  console.log(`roadmap<->viz reconcile — ${rep.envelopes} envelopes, ${rep.units} units, graph ${rep.graphNodeCount.toLocaleString()} nodes`);
  for (const [k, v] of Object.entries(rep.byClass).sort()) console.log(`  ${k.padEnd(14)} ${v}`);
  if (rep.unresolved.length) {
    console.log(`  — UNRESOLVED (${rep.unresolved.length}):`);
    for (const x of rep.unresolved.slice(0, 25)) {
      console.log(`      ${String(x.milestone).padEnd(30)} ${String(x.unit || "?").padEnd(28)} ${x.detail}`);
    }
  }
}
process.exit(rep.unresolved.length > 0 ? 3 : 0);
