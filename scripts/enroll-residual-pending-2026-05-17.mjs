#!/usr/bin/env node
// One-shot: enroll 14 residual known-pending dev-infra + hygiene units into slot queues.
// Source: CLAUDE.md ## Recent regressions + JULIETT iter-3.5 alerts + DEV-TOOL-CONFLICT-AUDIT F1-F5
// Re-applies dev-tools-first ROI sort after injection.

import fs from "node:fs";

const Q_PATH = "H:/prism/state/shared/slot-task-queues.json";
const queues = JSON.parse(fs.readFileSync(Q_PATH, "utf8"));

const newUnits = [
  // Tier 0 — backend-dev / dev-infra (HIGH ROI, user-prioritized)
  {
    unit_id: "U-VIZ-F11-CROSS-LOCK",
    slot: "alpha",
    tier: 0,
    roi: 8.5,
    milestone: "DEV-TOOL-CONFLICT-AUDIT-2026-05-17",
    summary:
      "F11 leg of U-VIZ-SPLIT-OUT-FILE: cross-lock regen-viz.mjs subprocess writer + system-viz-add-node.mjs atomic-rename via shared PID-lock convention. Deferred from MS1 (commit dd735c1871) because neither caught by source-grep detectors.",
    source: "CLAUDE.md Recent regressions 2026-05-17",
  },
  {
    unit_id: "U-ROADMAP-INDEX-WRITER-CONSOLIDATE",
    slot: "mike",
    tier: 0,
    roi: 8.5,
    milestone: "DEV-TOOL-CONFLICT-AUDIT-2026-05-17",
    summary:
      "5 independent roadmap-index.json writers, 3 NON-atomic (reconcile-milestones + register-devtools-roadmap-envelopes + register-revenue-roadmap-envelopes). Route through atomicWriteJson helper; long-term collapse to one mutation library.",
    source: "CLAUDE.md F4 audit",
  },
  {
    unit_id: "U-ERROR-MEMORY-CANONICAL-WRITER",
    slot: "mike",
    tier: 0,
    roi: 7.0,
    milestone: "DEV-TOOL-CONFLICT-AUDIT-2026-05-17",
    summary:
      "F2 latent race: error-memory.json has 2 writers (error-pattern-memory + error-learner-hook). Designate one canonical writer; others reader-only OR convert to append-only JSONL.",
    source: "CLAUDE.md F2 audit",
  },
  {
    unit_id: "U-SKILL-USAGE-CANONICAL-WRITER",
    slot: "mike",
    tier: 0,
    roi: 7.0,
    milestone: "DEV-TOOL-CONFLICT-AUDIT-2026-05-17",
    summary:
      "F3 latent race: skill-usage-stats.json has 3 writers (skill-usage-tracker + smart-skill-suggest + error-learner). All 3 orphan today; the moment any gets wired the race materializes.",
    source: "CLAUDE.md F3 audit",
  },
  {
    unit_id: "U-MASTER-INDEX-200MB-CAP",
    slot: "mike",
    tier: 0,
    roi: 9.0,
    milestone: "JULIETT-12CHAT-ALLOCATION-MS0",
    summary:
      "F1 silent-degrade: master-index-search-lib 200MB cap on 331MB graph silent-fails fleet-wide unified search. Lift the cap or stream-load. Compounds with Docker wedge (U-DOCKER-DAEMON-RECOVERY).",
    source: "JULIETT iter-3.5 F1 critical",
  },
  {
    unit_id: "U-ERROR-PATTERN-CAPTURE-FIX",
    slot: "mike",
    tier: 0,
    roi: 8.0,
    milestone: "JULIETT-12CHAT-ALLOCATION-MS0",
    summary:
      "F3 silent-degrade: error-pattern-capture 0-fire makes the entire 3-stage error-learn chain DEAD. Trace no-fire root cause; verify subscriber wiring.",
    source: "JULIETT iter-3.5 F3",
  },
  {
    unit_id: "U-SYSTEM-VIZ-CLASSIFIER-FIX",
    slot: "mike",
    tier: 0,
    roi: 8.0,
    milestone: "JULIETT-12CHAT-ALLOCATION-MS0",
    summary:
      "system-viz classifier degeneracy still UNFIXED post-MS1 (iter-3.5 alert). Symptom: classifier misroutes nodes into wrong layers.",
    source: "JULIETT iter-3.5",
  },

  // Tier 0 — golf hygiene (fleet maintenance)
  {
    unit_id: "U-DOCKER-DAEMON-RECOVERY",
    slot: "golf",
    tier: 0,
    roi: 9.5,
    milestone: "JULIETT-12CHAT-ALLOCATION-MS0",
    summary:
      "Docker daemon WEDGED (HTTP 500) -> Qdrant/Postgres/Prometheus DOWN -> master-index BM25-only fleet-wide SILENTLY (compounds F1 master-index cap). Recovery procedure + auto-detect health gate.",
    source: "JULIETT iter-3.5 CRITICAL alert",
  },
  {
    unit_id: "U-OBSOLETE-REAPER-TASKS",
    slot: "golf",
    tier: 0,
    roi: 7.5,
    milestone: "FLEET-REAPER-MS1",
    summary:
      "3 obsolete reaper scheduled tasks running concurrent with Fleet Reaper MS1 -> PID-reuse race risk. Identify + uninstall (NOT delete - per feedback_never_delete_only_disable, use Disable-ScheduledTask + -Uninstall).",
    source: "JULIETT iter-3.5",
  },
  {
    unit_id: "U-SKILL-ARCHIVE-FORGE-RGS-BAK",
    slot: "golf",
    tier: 0,
    roi: 6.5,
    milestone: "DEV-TOOL-CONFLICT-AUDIT-2026-05-17",
    summary:
      "F5 audit: 6 forge1-6 + 5 rgs1-5 + 2 .fullcopy-bak files in H:/.claude/commands/ scanned every SessionStart (~250KB never-needed). Move to _archive/ subdir (NOT deleted per feedback_never_delete_only_disable).",
    source: "CLAUDE.md F5 audit",
  },
  {
    unit_id: "U-SKILL-MIRROR-RECONCILE",
    slot: "golf",
    tier: 0,
    roi: 7.0,
    milestone: "DEV-TOOL-CONFLICT-AUDIT-2026-05-17",
    summary:
      "F5b audit: 64 H:/ vs H:/prism/ skill mirrors with size deltas (startup.md 629B vs 22.2KB). Operators do not know which loads first. Reconcile mirror direction or merge.",
    source: "CLAUDE.md F5b audit",
  },
  {
    unit_id: "U-BUG-FINDING-WIKI-FOLLOWUPS",
    slot: "golf",
    tier: 0,
    roi: 6.0,
    milestone: "OBSIDIAN-INTELLIGENCE-MS3",
    summary:
      "Bug-finding wiki gate (commit bb198d9285) is advisory-only; follow-up: add HARD-block mode + auto-stub wiki entry on bug-find detection.",
    source: "CLAUDE.md MANDATORY SELF-AWARENESS",
  },

  // Tier 1 — DOMAIN-PIPELINE missing cell extract (juliett owns speed-feed + DPM milestone)
  {
    unit_id: "U-DPM0-CELL-EXTRACT",
    slot: "juliett",
    tier: 1,
    roi: 8.0,
    milestone: "DOMAIN-PIPELINE-MS0",
    summary:
      "Extract the 62 not-fully-built (domain x stage) cells from DOMAIN-PIPELINE-MS0-CONFIG.json into formal roadmap units. Per CLAUDE.md: 86 cells, 24 built, 34 partial, 28 missing. The 62 not-fully-built need unit IDs + slot routing.",
    source: "CLAUDE.md DOMAIN-PIPELINE-MS0",
  },

  // Tier 1 — AI-TRAINING-FIRST roadmap enrollment (lima owns academy/learning domain)
  {
    unit_id: "U-AI-TRAINING-FIRST-ROADMAP-ENROLL",
    slot: "lima",
    tier: 1,
    roi: 9.5,
    milestone: "AI-TRAINING-FIRST-MS0",
    summary:
      "Derive per-domain AI-training units from existing *MetaLearning/*DeepLearning/*UltraIntelligence engines x JM-DIE 76K-print corpus x MIT-OCW x v8.89 MIT kernels (LEARNING_LOOP stage of DOMAIN-PIPELINE-MS0). Per feedback_ai_training_first_before_revenue: pre-revenue, fleet trains AI on full corpus to ship revenue at full potential.",
    source: "feedback_ai_training_first_before_revenue.md",
  },
];

// Global ID dup check
const globalIds = new Set();
for (const q of Object.values(queues.queues)) {
  for (const it of q) {
    if (it.unit_id) globalIds.add(it.unit_id);
  }
}

let injected = 0;
let skippedDup = 0;
const perSlotAdded = {};

for (const u of newUnits) {
  if (globalIds.has(u.unit_id)) {
    skippedDup++;
    console.log("  SKIP dup:", u.unit_id);
    continue;
  }
  const arr = queues.queues[u.slot];
  if (!Array.isArray(arr)) {
    console.error("BAD slot:", u.slot);
    continue;
  }
  arr.push({
    unit_id: u.unit_id,
    wave: u.tier === 0 ? "DEV-INFRA" : "JULIETT-12CHAT",
    cost: "S",
    spec: "pending-generator",
    depends_on: [],
    summary: u.summary,
    milestone: u.milestone,
    roi_score: u.roi,
    source_roadmap: u.source || null,
    tier_hint: u.tier,
  });
  globalIds.add(u.unit_id);
  injected++;
  perSlotAdded[u.slot] = (perSlotAdded[u.slot] || 0) + 1;
}

// Re-apply dev-tools-first sort using same policy as commit 2be671e191
function tierRank(it) {
  const wave = (it.wave || "").toUpperCase();
  const src = (it.source_roadmap || "").toUpperCase();
  const mil = (it.milestone || "").toUpperCase();
  const id = (it.unit_id || "").toUpperCase();
  if (typeof it.tier_hint === "number") return it.tier_hint;
  if (wave === "DEV-INFRA") return 0;
  if (src.includes("BACKEND-DEVTOOLS") || mil.includes("BACKEND-DEVTOOLS")) return 0;
  if (id.startsWith("U-DEV-") || id.startsWith("U-CK") || id.startsWith("U-SDF")) return 0;
  if (
    /COMMAND-KERNEL|HOOK-SYNERGY|CONTEXT-CHAIN|FLEET-REAPER|FLEET-TASK-HEALTH|CHAT-ORCHESTRATOR|DEV-VELOCITY|RGS-TOOL|DEV-TOOL-CONFLICT|AUDIT-SYNERGY|SLOT-WORKTREE|PER-SLOT-CLAIM|OBSIDIAN-INTELLIGENCE|INTEL-OLLAMA-OBSIDIAN|MEMORY-PRESSURE|TOKEN-BUDGET|SESSION-CONTINUITY/.test(
      mil,
    )
  )
    return 0;
  if (mil.includes("JULIETT-12CHAT-ALLOCATION")) return 1;
  if (wave === "GAP") return 2;
  if (wave === "BRIDGE") return 3;
  if (/^W[0-9]+$/.test(wave) || /^[0-9]+$/.test(wave) || wave === "RGS") return 4;
  if (wave === "PROSE") return 5;
  return 4;
}
function roiScore(it) {
  if (typeof it.roi_score === "number") return it.roi_score;
  if (it.engine_count) return Math.min(10, it.engine_count / 10);
  const w = (it.wave || "").toUpperCase();
  if (w === "GAP") return 7;
  if (w === "BRIDGE") return 6;
  if (w === "PROSE") return 3;
  return 5;
}
function cmp(a, b) {
  const ta = tierRank(a);
  const tb = tierRank(b);
  if (ta !== tb) return ta - tb;
  const ra = roiScore(a);
  const rb = roiScore(b);
  if (ra !== rb) return rb - ra;
  return (a.unit_id || "").localeCompare(b.unit_id || "");
}

for (const arr of Object.values(queues.queues)) arr.sort(cmp);

queues.lastTopup = {
  at: new Date().toISOString(),
  by: "claude-394d72a4 (juliett)",
  source: "CLAUDE.md Recent regressions + JULIETT iter-3.5 alerts + DEV-TOOL-CONFLICT-AUDIT F1-F5",
  unitsAdded: injected,
  skippedDuplicates: skippedDup,
  note: "Residual known-pending dev-infra + hygiene units extracted from CLAUDE.md/memory audit memos and enrolled as proper queue entries. Re-sort applied to land T0 entries at top per dev-tools-first policy.",
  slotsToppedUp: Object.entries(perSlotAdded)
    .map(([slot, added]) => ({ slot, added }))
    .sort((a, b) => a.slot.localeCompare(b.slot)),
  previousTopup: queues.lastTopup ? queues.lastTopup.at : null,
};

const tmp = Q_PATH + ".tmp-" + Date.now();
fs.writeFileSync(tmp, JSON.stringify(queues, null, 2));
fs.renameSync(tmp, Q_PATH);

console.log("\nInjected:", injected, "· Skipped:", skippedDup);
for (const [s, n] of Object.entries(perSlotAdded).sort()) {
  console.log("  +" + s.padEnd(8) + "= " + n);
}

console.log("\nNEW top-of-queue (post-sort) for affected slots:");
const affected = [...new Set(newUnits.map((u) => u.slot))].sort();
for (const s of affected) {
  const top = queues.queues[s].slice(0, 3).map((x) => x.unit_id);
  console.log("  " + s.padEnd(8) + "→ " + top.join(" | "));
}
