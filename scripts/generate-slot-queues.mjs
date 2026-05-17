#!/usr/bin/env node
// scripts/generate-slot-queues.mjs
//
// Regenerates state/shared/slot-task-queues.json by:
//  1. PRESERVING the existing hand-curated head per slot (36 units from V1+synergy+iter-4)
//  2. APPENDING a long_tail of backend-dev units extracted from ROADMAP-CONSOLIDATED.json
//     - filters pending_units to backend-dev milestones (excludes operator-facing per PRISM-APP-QUEUE rule)
//     - filters unconsolidated_prose to BACKEND-DEVTOOLS-RGS6-MEGA / OBSIDIAN-INTELLIGENCE-MS3 /
//       GIT-TREE-REMEDIATION / prism-stabilization / PRISM-UNIFIED-ROADMAP-v2 (backend slice)
//     - classifies each by slot-domain keyword match (alpha..mike); operator-facing → skipped
//     - caps long_tail at MAX_PER_SLOT to keep operationally reasonable
//  3. Parks REVENUE-ROADMAP-v7.6 prose into phase2_revenue.parked_units (activated after phase 1 complete)
//  4. Surfaces unclassified-backend-dev into long_tail_unclassified (operator triage queue)
//
// Idempotent: re-running preserves head ordering; long_tail entries deduped by unit_id.
// Read-only against ROADMAP-CONSOLIDATED; only writes slot-task-queues.json.
//
// CLI:
//   node scripts/generate-slot-queues.mjs                  → regen + write
//   node scripts/generate-slot-queues.mjs --dry-run        → print stats, no write
//   node scripts/generate-slot-queues.mjs --max-per-slot N → cap long_tail size (default 25)

import fs from "node:fs";

const CONSOLIDATED = "H:/prism/state/shared/specs/ROADMAP-CONSOLIDATED.json";
const QUEUES = "H:/prism/state/shared/slot-task-queues.json";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const MAX_PER_SLOT = (() => {
  const i = args.indexOf("--max-per-slot");
  return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : 25;
})();

const BACKEND_DEV_PROSE_SOURCES = new Set([
  "BACKEND-DEVTOOLS-RGS6-MEGA",
  "OBSIDIAN-INTELLIGENCE-MS3",
  "GIT-TREE-REMEDIATION-MS0",
  "prism-stabilization",
]);

const REVENUE_SOURCE = "REVENUE-ROADMAP-v7.6";
const UNIFIED_SOURCE = "PRISM-UNIFIED-ROADMAP-v2";

const BACKEND_DEV_MILESTONE_PREFIXES = [
  "BACKEND-DEVTOOLS-RGS6",
  "OBSIDIAN-INTELLIGENCE",
  "GIT-TREE-REMEDIATION",
  "HOOK-SYNERGY",
  "KNOWLEDGE-VAULT",
  "COMMAND-KERNEL",
  "WORKTREE-CONSOLIDATE",
  "SYSTEM-VIZ-",
  "RGS-TOOL-AUTOINVOKE",
  "AUTOCOMPACT",
  "OLLAMA-PIPELINE",
  "FLEET-REAPER",
  "FLEET-MEMORY-MONITOR",
  "CLEANUP-MS0",
  "OBSOLESCENCE-CLEANUP",
  "SLOT-WORKTREE",
  "PER-SLOT-CLAIM",
  "AUDIT-SYNERGY",
  "DEV-VELOCITY",
  "AUTO-LEARNING-LOOP",
  "TRIBAL-GRAPH",
  "NN-GRAPH",
  "JULIETT-",
  "SLOT-AUTO-LOOP",
  "ENVELOPE-SYNC",
];

const OPERATOR_FACING_PATTERN = /\b(mill[a-z]*|lathe[a-z]*|wedm|cam[xs]?|cad[a-z]*|edm|grinder|swiss|welder|electrode|sinker|fanuc|mazak|okuma|haas|sodick|mitsubishi|makino|agie|charmilles|hyper[Mm]ill|mastercam|fusion[\s-]?360|esprit|solidcam|inventor[\s-]?hsm|powermill|catia|nx[\s-]?cam|machining|machinist|gcode|g-code|postprocessor|post[\s-]processor|operator|customer|quote|business[\s-]?intel|sales|tool[\s-]catalog|spindle|chuck|fixture|workholding|magazine|coolant|tooling|inserts?|spc|cpk|stock|chip[\s-]control|wire[\s-]?edm|jm[\s-]die|shop[\s-]floor|machining[\s-]playbook)\b/i;

const SLOT_KEYWORDS = {
  alpha: /\b(hook|gate|fleet[\s-]?reaper|NN[\s-]?graph|graphsage|twid|terminal[\s-]?pin|system[\s-]?viz|sessionstart|precheck|build[\s-]?gate|infra|slot[\s-]?drift|cutover|enforcement)\b/i,
  bravo: /\b(ollama|autocompact|precompact|token[\s-]?budget|slot[\s-]?claim|k2[\s-]?cloud|semantic[\s-]?cache|memory[\s-]?index|cost[\s-]?router|docker[\s-]?free|context[\s-]?aggregator|prompt[\s-]?cache)\b/i,
  charlie: /\b(sqlite|conflict[\s-]?resol|coordination|action[\s-]?trace|ownership[\s-]?lib|slot[\s-]?worktree|broker|cross[\s-]?session[\s-]?orch|coord[\s-]?store|liveness[\s-]?sweep|dispatcher[\s-]?map)\b/i,
  delta: /\b(tribal[\s-]?by[\s-]?domain|wiki[\s-]?precheck|vault[\s-]?inject|memory[\s-]?relevance|search[\s-]?lib|bm25|wiki[\s-]?domain|obsidian[\s-]?rag|doctrine[\s-]?obsolescence|vault[\s-]?unified|wiki[\s-]?evolve|tribal[\s-]?bridge|wiki[\s-]?ingest|wiki[\s-]?harvest)\b/i,
  echo: /\b(error[\s-]?pattern|distill|ship[\s-]?report|superseded|doc[\s-]?reflection|post[\s-]?ship|svb[\s-]?ms0|unblock[\s-]?detect|hook[\s-]?orphan[\s-]?reconcile|close[\s-]?out|pathspec|svb|system[\s-]?viz[\s-]?brain)\b/i,
  foxtrot: /\b(cost[\s-]?cascade|synergy[\s-]?regression|telemetry[\s-]?rollup|skill[\s-]?chain[\s-]?manifest|dashboard|cam[\s-]?parity)\b/i,
  golf: /\b(reaper|hygiene[\s-]?baseline|cleanup[\s-]?orchestrator|memory[\s-]?monitor|fleet[\s-]?memory|node[\s-]?janitor|orphan[\s-]?process|crash[\s-]?failover|allowlist|golf[\s-]?slot)\b/i,
  hotel: /\b(idea[\s-]?block|ideablock|oims3|obsidian[\s-]?intel|broker[\s-]?verify|design[\s-]?system[\s-]?extract|daily[\s-]?context)\b/i,
  india: /\b(tribal[\s-]?graph|mit[\s-]?ocw|course[\s-]?embed|course[\s-]?map|course[\s-]?unzip|content[\s-]?mine|tribal[\s-]?ingest)\b/i,
  juliett: /\b(roadmap[\s-]?consolid|misc[\s-]?task|priority[\s-]?queue|allocation|unit[\s-]?spec[\s-]?gen|slot[\s-]?queue[\s-]?fill|comprehensive[\s-]?fill|claude[\s-]?md[\s-]?extract)\b/i,
  kilo: /\b(harness[\s-]?wiring|aam04|error[\s-]?promote|stop[\s-]?hook[\s-]?registry|orphan[\s-]?validate|hook[\s-]?synergy[\s-]?consol|wire[\s-]?hook|stop[\s-]?wiring[\s-]?audit)\b/i,
  lima: /\b(rgs[\s-]?tool|rgs[\s-]?pipeline|domain[\s-]?rules|regen[\s-]?viz|pipeline[\s-]?rules|rgs[\s-]?signal|rgs[\s-]?rule[\s-]?backend|rgs[\s-]?next)\b/i,
  mike: /\b(envelope[\s-]?sync|memory[\s-]?compress|growth[\s-]?gate|new[\s-]?slot[\s-]?onboard|mike[\s-]?sweep|memory[\s-]?size[\s-]?watch)\b/i,
};

function readJsonOrDie(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { console.error(`FATAL: cannot read ${p}: ${e.message}`); process.exit(2); }
}

function looksBackendDev(milestone, title) {
  const m = (milestone || "").toUpperCase();
  const t = (title || "").toLowerCase();
  if (OPERATOR_FACING_PATTERN.test(t)) return false;
  if (OPERATOR_FACING_PATTERN.test(m)) return false;
  for (const prefix of BACKEND_DEV_MILESTONE_PREFIXES) {
    if (m.startsWith(prefix.toUpperCase())) return true;
  }
  return false;
}

function classifySlot(text) {
  for (const [slot, rx] of Object.entries(SLOT_KEYWORDS)) {
    if (rx.test(text)) return slot;
  }
  return null;
}

function synthUnitId(milestone, title) {
  const slug = (title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const ms = (milestone || "MS").split(/[\/:]/)[0];
  return `${ms}::${slug || "untitled"}`;
}

// ─────────────────────────────────────────────────────────────────────
const consolidated = readJsonOrDie(CONSOLIDATED);
const existing = readJsonOrDie(QUEUES);

// Build set of unit_ids already in head queues (preserve head, no duplication)
const headUnitIds = new Set();
const headByUnit = {};
for (const [slot, list] of Object.entries(existing.queues || {})) {
  for (const e of list) {
    if (e.unit_id) {
      headUnitIds.add(e.unit_id);
      headByUnit[e.unit_id] = slot;
    }
  }
}

// Process pending_units
const pendingClassified = { byslot: {}, operator_facing: 0, unclassified: [], dropped_already_in_head: 0, total_examined: 0 };
for (const u of (consolidated.pending_units || [])) {
  pendingClassified.total_examined++;
  if (headUnitIds.has(u.unit_id)) { pendingClassified.dropped_already_in_head++; continue; }
  if (!looksBackendDev(u.milestone, u.title)) { pendingClassified.operator_facing++; continue; }
  const text = `${u.title || ""} ${u.milestone || ""}`;
  const slot = classifySlot(text);
  const entry = {
    unit_id: u.unit_id,
    milestone: u.milestone,
    wave: "long_tail",
    cost: "?",
    spec: "pending-generator",
    depends_on: [],
    summary: u.title || "(no title)",
    source: u.source || "MILESTONE_PROGRESS",
    _origin: "long_tail_pending",
  };
  if (slot) {
    pendingClassified.byslot[slot] = pendingClassified.byslot[slot] || [];
    pendingClassified.byslot[slot].push(entry);
  } else {
    pendingClassified.unclassified.push(entry);
  }
}

// Process unconsolidated_prose
const proseClassified = { byslot: {}, revenue: [], operator_facing: 0, unclassified: [], dropped_already_in_head: 0, total_examined: 0 };
for (const u of (consolidated.unconsolidated_prose || [])) {
  proseClassified.total_examined++;
  const src = u.source_roadmap || "";
  if (src === REVENUE_SOURCE) {
    proseClassified.revenue.push({
      milestone: u.milestone,
      title: u.title,
      intent: u.intent,
      status: u.status,
      source_roadmap: src,
    });
    continue;
  }
  const isBackendProseSrc = BACKEND_DEV_PROSE_SOURCES.has(src);
  const isUnifiedSlice = src === UNIFIED_SOURCE && looksBackendDev(u.milestone, u.title);
  if (!isBackendProseSrc && !isUnifiedSlice) { proseClassified.operator_facing++; continue; }
  const text = `${u.title || ""} ${u.milestone || ""} ${u.intent || ""}`;
  if (OPERATOR_FACING_PATTERN.test(text)) { proseClassified.operator_facing++; continue; }
  const uid = u.unit_id || synthUnitId(u.milestone, u.title);
  if (headUnitIds.has(uid)) { proseClassified.dropped_already_in_head++; continue; }
  const slot = classifySlot(text);
  const entry = {
    unit_id: uid,
    milestone: u.milestone,
    wave: "long_tail_prose",
    cost: "?",
    spec: "pending-generator",
    depends_on: [],
    summary: u.title || "(no title)",
    intent: u.intent ? String(u.intent).slice(0, 200) : "",
    source: src,
    _origin: "long_tail_prose",
  };
  if (slot) {
    proseClassified.byslot[slot] = proseClassified.byslot[slot] || [];
    proseClassified.byslot[slot].push(entry);
  } else {
    proseClassified.unclassified.push(entry);
  }
}

// Build the new queues object: head (preserved) + long_tail (appended, capped at MAX_PER_SLOT)
const newQueues = {};
const longTailStats = {};
for (const slot of Object.keys(existing.queues || {})) {
  const head = existing.queues[slot] || [];
  const longTailPending = pendingClassified.byslot[slot] || [];
  const longTailProse = proseClassified.byslot[slot] || [];
  const combined = [...longTailPending, ...longTailProse];
  // Dedupe within long_tail by unit_id
  const seen = new Set(head.map(e => e.unit_id));
  const deduped = combined.filter(e => {
    if (seen.has(e.unit_id)) return false;
    seen.add(e.unit_id);
    return true;
  });
  const capped = deduped.slice(0, MAX_PER_SLOT);
  newQueues[slot] = [...head, ...capped];
  longTailStats[slot] = {
    head: head.length,
    pending_classified: longTailPending.length,
    prose_classified: longTailProse.length,
    long_tail_added: capped.length,
    long_tail_overflow: Math.max(0, deduped.length - MAX_PER_SLOT),
  };
}

const newDoc = {
  ...existing,
  schemaVersion: "1.1.0",
  generatedAt: new Date().toISOString(),
  generator: "scripts/generate-slot-queues.mjs",
  source: existing.source,
  doctrine: existing.doctrine,
  operator_workflow: existing.operator_workflow,
  queues: newQueues,
  long_tail_unclassified: [...pendingClassified.unclassified, ...proseClassified.unclassified],
  phase2_revenue: {
    activate_when: "all phase-1 backend-dev queues exhausted (slot-queue.mjs --status shows 0 eligible across all slots)",
    parked_units: proseClassified.revenue,
    parked_unit_count: proseClassified.revenue.length,
    source_roadmap: REVENUE_SOURCE,
    note: "Per operator directive 2026-05-17: REVENUE starts only after backend-dev complete. Distribution to slots happens at phase-2 activation, not now.",
  },
  stats: {
    pending_examined: pendingClassified.total_examined,
    pending_operator_facing_skipped: pendingClassified.operator_facing,
    pending_classified_backend_dev: Object.values(pendingClassified.byslot).reduce((a, b) => a + b.length, 0),
    pending_unclassified_backend_dev: pendingClassified.unclassified.length,
    prose_examined: proseClassified.total_examined,
    prose_operator_facing_skipped: proseClassified.operator_facing,
    prose_classified_backend_dev: Object.values(proseClassified.byslot).reduce((a, b) => a + b.length, 0),
    prose_unclassified_backend_dev: proseClassified.unclassified.length,
    prose_revenue_parked: proseClassified.revenue.length,
    per_slot: longTailStats,
  },
  operator_gates: existing.operator_gates,
  silent_degrade_fixes: existing.silent_degrade_fixes,
};

if (DRY_RUN) {
  console.log("DRY RUN — no file written");
  console.log("Stats:", JSON.stringify(newDoc.stats, null, 2));
} else {
  fs.writeFileSync(QUEUES, JSON.stringify(newDoc, null, 2) + "\n");
  console.log(`Wrote ${QUEUES}`);
  console.log("Stats:");
  console.log("  pending_examined:        ", newDoc.stats.pending_examined);
  console.log("  pending_op-facing skip:  ", newDoc.stats.pending_operator_facing_skipped);
  console.log("  pending classified:      ", newDoc.stats.pending_classified_backend_dev);
  console.log("  pending unclassified:    ", newDoc.stats.pending_unclassified_backend_dev);
  console.log("  prose_examined:          ", newDoc.stats.prose_examined);
  console.log("  prose op-facing skip:    ", newDoc.stats.prose_operator_facing_skipped);
  console.log("  prose classified:        ", newDoc.stats.prose_classified_backend_dev);
  console.log("  prose unclassified:      ", newDoc.stats.prose_unclassified_backend_dev);
  console.log("  REVENUE parked phase2:   ", newDoc.stats.prose_revenue_parked);
  console.log("");
  console.log("Per-slot long_tail size:");
  for (const [slot, s] of Object.entries(longTailStats)) {
    console.log(`  ${slot.padEnd(8)} head=${s.head}  long_tail=${s.long_tail_added}  overflow=${s.long_tail_overflow}`);
  }
}
