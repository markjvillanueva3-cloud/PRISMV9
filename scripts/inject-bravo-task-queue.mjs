#!/usr/bin/env node
/**
 * inject-bravo-task-queue.mjs
 *
 * One-shot injector: compile pending units cited by every bravo
 * handoff RESUME (auto-write template "Next: INFRA-CONSENSUS-WIRE-MS0,
 * INFRA-AGI-ROUTER-MS2, L8-P0-MS2") and place them at the TOP of
 * bravo's slot queue, ahead of the RGS-allocated lathe-domain units.
 *
 * - Idempotent: re-running replaces only the bravo-injected block,
 *   preserves any RGS units already present after it (no duplicates).
 * - Non-destructive: atomic write via .tmp + rename.
 * - Advisory metadata: every injected unit carries
 *   source="bravo-session-handoff" + injected_at + injected_by.
 * - Dedup: drops any unit_id that already appears in the queue's
 *   tail (RGS items) or in the global shipped list.
 *
 * Usage:
 *   node H:/prism/scripts/inject-bravo-task-queue.mjs
 *   node H:/prism/scripts/inject-bravo-task-queue.mjs --dry-run
 *   node H:/prism/scripts/inject-bravo-task-queue.mjs --json
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const SLOT_QUEUES = path.join(ROOT, "state/shared/slot-task-queues.json");
const ENV_DIR     = path.join(ROOT, "mcp-server/data/milestones");
const args        = new Set(process.argv.slice(2));
const DRY_RUN     = args.has("--dry-run");
const AS_JSON     = args.has("--json");
const INJECT_TAG  = "bravo-session-handoff";

const BRAVO_RECOMMENDED_MILESTONES = [
  // priority 1: cited as "Next" by every bravo handoff RESUME
  { id: "INFRA-CONSENSUS-WIRE-MS0", priority: 1 },
  { id: "INFRA-AGI-ROUTER-MS2",    priority: 1 },
  { id: "L8-P0-MS2",                priority: 2 },
];

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { return fallback; }
}

function atomicWriteJson(p, obj) {
  const tmp = p + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  fs.renameSync(tmp, p);
}

function extractUnits(envelope, milestone_id, priority) {
  const out = [];
  if (!envelope || !Array.isArray(envelope.phases)) return out;
  for (const phase of envelope.phases) {
    const units = Array.isArray(phase.units) ? phase.units : [];
    for (const u of units) {
      if (!u.id) continue;
      const status = (u.status || "").toLowerCase();
      // skip shipped/complete/in_progress; we want pending only
      if (status === "complete" || status === "completed" ||
          status === "shipped"  || status === "done") continue;
      out.push({
        unit_id: `${milestone_id}::${u.id}`,
        milestone_id,
        phase_id: phase.id || "P0",
        unit_short_id: u.id,
        title: u.title || "(no title)",
        effort_min: u.effort || null,
        dependencies: Array.isArray(u.dependencies) ? u.dependencies : [],
        priority,
        wave: "BRAVO-HANDOFF-INJECT",
        source: INJECT_TAG,
        injected_at: new Date().toISOString(),
        injected_by: "claude-df944902",
      });
    }
  }
  return out;
}

function main() {
  // 1. Build the injection set from milestone envelopes
  const inject = [];
  const missing = [];
  for (const m of BRAVO_RECOMMENDED_MILESTONES) {
    const envPath = path.join(ENV_DIR, m.id + ".json");
    const env = readJson(envPath, null);
    if (!env) { missing.push(m.id); continue; }
    const units = extractUnits(env, m.id, m.priority);
    inject.push(...units);
  }

  // 2. Read current queue state
  const queues = readJson(SLOT_QUEUES, { queues: {} });
  if (!queues.queues) queues.queues = {};
  const bravo = queues.queues.bravo || { domain: "lathe", units: [] };
  if (!Array.isArray(bravo.units)) bravo.units = [];

  // 3. Partition existing units: drop any prior bravo-handoff-inject (re-inject
  //    cleanly), keep everything else as the RGS tail.
  const rgsTail = bravo.units.filter(u => u && u.source !== INJECT_TAG);

  // 4. Dedup the injection against the RGS tail
  const tailIds = new Set(rgsTail.map(u => u.unit_id).filter(Boolean));
  const injectFiltered = inject.filter(u => !tailIds.has(u.unit_id));

  // 5. Concat: injected (ahead) + RGS tail (behind)
  const merged = [...injectFiltered, ...rgsTail];

  // 6. Stamp meta + write
  const summary = {
    milestones_targeted: BRAVO_RECOMMENDED_MILESTONES.map(m => m.id),
    milestones_missing: missing,
    injected_count: injectFiltered.length,
    injected_unit_ids: injectFiltered.map(u => u.unit_id),
    rgs_tail_count: rgsTail.length,
    total_after_inject: merged.length,
    dropped_as_duplicate: inject.length - injectFiltered.length,
  };

  const newBravo = {
    ...bravo,
    domain: bravo.domain || "lathe",
    lastTopup: {
      ...(bravo.lastTopup || {}),
      lastInjectAt: new Date().toISOString(),
      lastInjectSource: INJECT_TAG,
      lastInjectSummary: summary,
    },
    units: merged,
  };

  if (DRY_RUN) {
    console.log("[DRY RUN] would write bravo queue —", JSON.stringify(summary, null, 2));
    return;
  }

  queues.queues.bravo = newBravo;
  atomicWriteJson(SLOT_QUEUES, queues);

  if (AS_JSON) {
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
  } else {
    console.log("bravo queue injected — wrote", SLOT_QUEUES);
    console.log("milestones targeted:", summary.milestones_targeted.join(", "));
    console.log("injected:", summary.injected_count, "units");
    console.log("RGS tail preserved:", summary.rgs_tail_count, "units");
    console.log("total after inject:", summary.total_after_inject);
    if (missing.length) console.log("MISSING ENVELOPES:", missing.join(", "));
    console.log("\ntop 5 injected:");
    for (const u of injectFiltered.slice(0, 5)) {
      console.log(`  ${u.unit_id} — ${u.title} [${u.effort_min || "?"}min]`);
    }
  }
}

main();
