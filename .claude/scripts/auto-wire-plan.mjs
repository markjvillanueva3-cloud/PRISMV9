#!/usr/bin/env node
/**
 * auto-wire-plan.mjs
 *
 * When a phase reports state=built (engines created but not yet wired),
 * automatically plan the wiring step. For each newly produced engine:
 *   1. Look up its node in system-graph.json
 *   2. Read its `suggestedDispatchers` (verbatim — never invent)
 *   3. Compute capacity for each candidate (action count vs ceiling)
 *   4. Pick the best target (lowest current capacity load + matching domain)
 *   5. Emit a wiring unit to state/shared/auto-wire-queue.jsonl
 *
 * /run-continuous reads auto-wire-queue.jsonl after marking a phase built.
 * If queue has wire units, the chat continues with them as auto-discovered
 * follow-up units instead of releasing the phase.
 *
 * Usage:
 *   node auto-wire-plan.mjs --phase <phase-id>
 *   node auto-wire-plan.mjs --phase <phase-id> --json     (output queue entries to stdout)
 *   node auto-wire-plan.mjs --status                       (show pending wire units)
 */

import fs from "node:fs";
import path from "node:path";

const GHOSTS = "H:/prism/state/shared/roadmap-ghosts.json";
const GRAPH = "H:/prism/state/shared/system-viz/system-graph.json";
const QUEUE = "H:/prism/state/shared/auto-wire-queue.jsonl";

const ACTION_CEILING = 200; // dispatcher capacity threshold

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return fb; }
}

function args() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

function dispatcherCapacity(G, dispatcherId) {
  const node = G.nodes?.find((n) => n.id === dispatcherId);
  if (!node) return 0;
  return node.actionCount || node.actions || 0;
}

function pickBestDispatcher(candidates, G) {
  // Lowest capacity load wins; reject any over ceiling.
  const ranked = candidates.map((id) => ({
    id,
    capacity: dispatcherCapacity(G, id),
  })).filter((c) => c.capacity < ACTION_CEILING)
    .sort((a, b) => a.capacity - b.capacity);
  return ranked[0] || null;
}

function appendQueue(entry) {
  fs.mkdirSync(path.dirname(QUEUE), { recursive: true });
  fs.appendFileSync(QUEUE, JSON.stringify(entry) + "\n");
}

function planForPhase(phaseId) {
  const state = readJSON(GHOSTS, { ghosts: {} });
  const g = state.ghosts[phaseId];
  if (!g) {
    console.error(`No ghost for phase ${phaseId}`);
    process.exit(2);
  }
  if (g.state !== "built") {
    console.error(`Phase ${phaseId} is in state ${g.state}, not built — cannot plan wire`);
    process.exit(2);
  }

  const G = readJSON(GRAPH, { nodes: [] });
  const plans = [];

  for (const wt of g.wire_targets || []) {
    const best = pickBestDispatcher(wt.candidates || [], G);
    if (!best) {
      plans.push({
        kind: "wire-blocked",
        engine: wt.produced_node,
        reason: "no candidate dispatcher under capacity ceiling",
        candidates: wt.candidates,
      });
      continue;
    }
    plans.push({
      kind: "wire-plan",
      engine: wt.produced_node,
      target_dispatcher: best.id,
      target_capacity_before: best.capacity,
      ceiling: ACTION_CEILING,
      candidates_considered: wt.candidates,
      generated_at: new Date().toISOString(),
      source_phase: phaseId,
    });
  }

  // Emit unit envelopes to queue
  for (const p of plans.filter((x) => x.kind === "wire-plan")) {
    appendQueue({
      type: "auto-wire-unit",
      phase_id: phaseId,
      unit_id: `AUTOWIRE-${p.engine.replace(/[^\w]/g, "_")}-${p.target_dispatcher.replace("disp.", "")}`,
      engine: p.engine,
      target_dispatcher: p.target_dispatcher,
      capacity_before: p.target_capacity_before,
      generated_at: p.generated_at,
      source_phase: phaseId,
      steps: [
        `Import ${p.engine} into ${p.target_dispatcher}`,
        `Add action enum entry`,
        `Add zod schema for action input`,
        `Add lazy_import block`,
        `Write round-trip E2E test through ${p.target_dispatcher}`,
        `Regenerate /system-viz`,
        `Verify coverage delta: 1 engine wired`,
      ],
      exit_criteria: [
        `${p.target_dispatcher} action count = ${p.target_capacity_before + 1}`,
        `Round-trip test passes`,
        `viz coverage shows engine moved unwired→wired`,
      ],
    });
  }

  // Persist plan summary in ghost
  g.auto_wire_plan = {
    generated_at: new Date().toISOString(),
    plans,
  };
  state.ghosts[phaseId] = g;
  fs.writeFileSync(GHOSTS, JSON.stringify(state, null, 2));

  return plans;
}

function showStatus() {
  if (!fs.existsSync(QUEUE)) {
    console.log("auto-wire-queue: empty");
    return;
  }
  const lines = fs.readFileSync(QUEUE, "utf8").split("\n").filter(Boolean);
  console.log(`auto-wire-queue: ${lines.length} unit(s) pending`);
  for (const ln of lines.slice(0, 20)) {
    try {
      const e = JSON.parse(ln);
      console.log(`  ${e.unit_id} :: ${e.engine} → ${e.target_dispatcher} (cap ${e.capacity_before})`);
    } catch { /* skip */ }
  }
  if (lines.length > 20) console.log(`  ...and ${lines.length - 20} more`);
}

const opts = args();
if (opts.status) {
  showStatus();
  process.exit(0);
}
if (!opts.phase) {
  console.error("usage: auto-wire-plan.mjs --phase <id> [--json] | --status");
  process.exit(2);
}
const plans = planForPhase(opts.phase);
if (opts.json) {
  console.log(JSON.stringify(plans, null, 2));
} else {
  const wirePlans = plans.filter((x) => x.kind === "wire-plan");
  const blocked = plans.filter((x) => x.kind === "wire-blocked");
  console.log(`AUTO-WIRE PLAN for ${opts.phase}`);
  console.log(`  ${wirePlans.length} unit(s) queued`);
  console.log(`  ${blocked.length} blocked`);
  for (const p of wirePlans) console.log(`    ✓ ${p.engine} → ${p.target_dispatcher} (cap ${p.target_capacity_before})`);
  for (const p of blocked) console.log(`    ✗ ${p.engine}: ${p.reason}`);
}
