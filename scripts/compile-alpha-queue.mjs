#!/usr/bin/env node
/**
 * compile-alpha-queue.mjs — User directive 2026-05-18 (claude-b7530614, slot alpha):
 *   "compile all alpha from previous sessions and work and misc chat work with
 *    no chat slot assignment into alpha task queue, place ahead of rgs tasks"
 *
 * Inputs:
 *   - state/shared/specs/ALPHA-SLOT-CARRYOVER-BACKLOG-2026-05-17.json  (alpha-history units)
 *   - state/shared/specs/MISC-TASKS-INVENTORY.json                     (unassigned chat misc work)
 *   - state/shared/MILESTONE_PROGRESS.json                             (already-shipped filter)
 *   - state/shared/slot-task-claims.json                               (peer-claimed filter)
 *   - state/shared/slot-task-queues.json                               (current alpha queue + dedup)
 *   - state/shared/specs/JULIETT-PER-SLOT-RGS-ALLOCATION-2026-05-17.json (RGS tail-ranked units)
 *
 * Output:
 *   - state/shared/slot-task-queues.json (atomic rewrite of `.queues.alpha`)
 *     Order: [carryover_units (P0)] → [misc_unassigned (P1)] → [pre-existing non-RGS (P2)] → [RGS tail (P3)]
 *   - state/shared/specs/ALPHA-QUEUE-COMPILED-<date>.json  (audit trail)
 *
 * Advisory + idempotent (re-running is byte-equal if inputs unchanged).
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const REPO = "H:/prism";

// Cache: unit_id -> shipped(boolean). Avoids re-running git for repeats across milestones.
const _gitShippedCache = new Map();
function isShippedByGit(uid, depth = 400) {
  if (_gitShippedCache.has(uid)) return _gitShippedCache.get(uid);
  // Hard input-validation gate. execFileSync below feeds argv array (no shell), so
  // uid never enters a shell context — this is defense-in-depth.
  if (!/^U-[A-Z0-9_-]+$/.test(uid)) { _gitShippedCache.set(uid, false); return false; }
  try {
    const args = ["-C", REPO, "log", "--oneline", `-${depth}`, "-E", "--grep", `/${uid}: `];
    const out = execFileSync("git", args, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
      windowsHide: true,
    });
    const shipped = out.trim().length > 0;
    _gitShippedCache.set(uid, shipped);
    return shipped;
  } catch {
    _gitShippedCache.set(uid, false);
    return false;
  }
}
const PATHS = {
  carryover: `${REPO}/state/shared/specs/ALPHA-SLOT-CARRYOVER-BACKLOG-2026-05-17.json`,
  misc:      `${REPO}/state/shared/specs/MISC-TASKS-INVENTORY.json`,
  progress:  `${REPO}/state/shared/MILESTONE_PROGRESS.json`,
  claims:    `${REPO}/state/shared/slot-task-claims.json`,
  queues:    `${REPO}/state/shared/slot-task-queues.json`,
  rgs:       `${REPO}/state/shared/specs/JULIETT-PER-SLOT-RGS-ALLOCATION-2026-05-17.json`,
};

const DRY = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

function readJSON(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function atomicWriteJSON(p, obj) {
  const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

// --- Build shipped set (milestone::unit_id) ---
function buildShippedSet(progress) {
  const s = new Set();
  for (const [ms, info] of Object.entries(progress.milestones || {})) {
    for (const u of info.shipped_units || []) s.add(`${ms}::${u}`);
  }
  return s;
}

// --- Build peer-claimed set ---
function buildPeerClaimedSet(claims, mySlot = "alpha") {
  const s = new Set();
  for (const [key, v] of Object.entries(claims.claims || {})) {
    if (!v || v.status === "released") continue;
    if (v.slot && v.slot !== mySlot) s.add(key);
  }
  return s;
}

// --- Carryover → flat task list (one per unit mentioned, unshipped) ---
function carryoverTasks(carryover, shipped) {
  const tasks = [];
  for (const m of carryover.backlog || []) {
    const ms = m.milestone;
    for (const uid of m.unitsMentioned || []) {
      if (shipped.has(`${ms}::${uid}`)) continue;
      tasks.push({
        unit_id: uid,
        wave: "ALPHA-CARRYOVER",
        cost: "?",
        spec: "pending",
        depends_on: [],
        summary: (m.sampleContext || "").slice(0, 240),
        milestone: ms,
        roi_score: m.pendingPct == null ? 5.0 : Math.max(3, 10 - (m.pendingPct / 20)),
        source_roadmap: "ALPHA-SLOT-CARRYOVER-BACKLOG-2026-05-17",
        tier_hint: 0,
        carryover_meta: {
          firstSeenAlpha: m.firstSeenAlpha,
          lastSeenAlpha: m.lastSeenAlpha,
          alphaChats: (m.alphaChats || []).length,
          claimedStatus: m.claimedStatus,
          derivedStatus: m.derivedStatus,
          shipped: m.shipped,
          total: m.total,
        },
      });
    }
  }
  return tasks;
}

// --- Misc inventory → task list (NO slot assignment by definition; all 318 are unassigned) ---
function miscTasks(misc) {
  const tasks = [];
  for (const item of misc.items || []) {
    if (item.assignedSlot || item.slot) continue; // defensive
    // skip items that are already done (heuristic)
    if (item.status === "done" || item.status === "completed" || item.status === "shipped") continue;
    const uid = item.id || item.title?.slice(0, 80).replace(/[^A-Za-z0-9_:/-]+/g, "-") || `MISC-${tasks.length}`;
    tasks.push({
      unit_id: uid,
      wave: "MISC-UNASSIGNED",
      cost: "?",
      spec: "pending-misc",
      depends_on: [],
      summary: (item.title || item.evidence || "").slice(0, 240),
      milestone: item.milestone || "MISC-TASKS",
      roi_score: 4.0,
      source_roadmap: "MISC-TASKS-INVENTORY",
      tier_hint: 1,
      misc_meta: {
        source_type: item.source_type,
        category: item.category,
        sources: (item.sources || []).slice(0, 3),
      },
    });
  }
  return tasks;
}

// --- RGS allocation → alpha's 6 ranked units (tail) ---
function rgsAllocTasks(rgs) {
  const a = rgs.slots?.alpha?.units || [];
  return a.map((u) => ({
    unit_id: u.unit_id,
    wave: "RGS-ALLOC",
    cost: "?",
    spec: "pending",
    depends_on: [],
    summary: u.title,
    milestone: u.milestone,
    roi_score: 3.5,
    source_roadmap: "JULIETT-PER-SLOT-RGS-ALLOCATION-2026-05-17",
    tier_hint: 2,
    rgs_rank: u.rank,
  }));
}

// --- Classify existing alpha queue into RGS vs non-RGS ---
function classifyExisting(existing) {
  const rgs = [], nonRgs = [];
  for (const t of existing) {
    const isRgs = /RGS/i.test(t.source_roadmap || "") || /^(COMMAND-KERNEL|HOOK-SYNERGY|OBSIDIAN-INTELLIGENCE)-MS/.test(t.milestone || "");
    (isRgs ? rgs : nonRgs).push(t);
  }
  return { rgs, nonRgs };
}

// --- Dedup by milestone::unit_id ---
function dedup(taskListGroups) {
  const seen = new Set();
  const out = [];
  for (const group of taskListGroups) {
    for (const t of group) {
      const k = `${t.milestone || "?"}::${t.unit_id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

// --- Filter shipped + peer-claimed + git-completion-marker ---
function filterShippedPeer(tasks, shipped, peerClaimed, useGitFilter = true) {
  return tasks.filter((t) => {
    const k = `${t.milestone || "?"}::${t.unit_id}`;
    if (shipped.has(k)) return false;
    if (peerClaimed.has(k)) return false;
    if (useGitFilter && isShippedByGit(t.unit_id)) return false;
    return true;
  });
}

// --- Main ---
function main() {
  const carryover = readJSON(PATHS.carryover);
  const misc      = readJSON(PATHS.misc);
  const progress  = readJSON(PATHS.progress);
  const claims    = readJSON(PATHS.claims);
  const queues    = readJSON(PATHS.queues);
  const rgs       = readJSON(PATHS.rgs);

  const shipped = buildShippedSet(progress);
  const peer    = buildPeerClaimedSet(claims, "alpha");

  // Cross-slot dedup: do NOT pull units that are in OTHER slots' queues
  const otherSlotUnits = new Set();
  for (const [slot, arr] of Object.entries(queues.queues || {})) {
    if (slot === "alpha") continue;
    if (!Array.isArray(arr)) continue;
    for (const t of arr) otherSlotUnits.add(`${t.milestone || "?"}::${t.unit_id}`);
  }
  function filterCrossSlot(tasks) {
    return tasks.filter((t) => !otherSlotUnits.has(`${t.milestone || "?"}::${t.unit_id}`));
  }

  const carry = filterCrossSlot(filterShippedPeer(carryoverTasks(carryover, shipped), shipped, peer));
  const mscT  = filterCrossSlot(filterShippedPeer(miscTasks(misc), shipped, peer));
  const existing = Array.isArray(queues.queues?.alpha) ? queues.queues.alpha : [];
  const { rgs: existingRgs, nonRgs: existingNonRgs } = classifyExisting(existing);
  // Apply git-completion-marker filter to existing groups too — previous compile runs
  // (before this filter shipped) may have left already-completed units in the queue.
  const existingRgsFresh    = filterShippedPeer(existingRgs, shipped, peer);
  const existingNonRgsFresh = filterShippedPeer(existingNonRgs, shipped, peer);
  const rgsTail = filterCrossSlot(filterShippedPeer(rgsAllocTasks(rgs), shipped, peer));

  // Compose: [carryover P0] → [misc P1] → [existing non-RGS P2] → [existing RGS] → [new RGS tail]
  const composed = dedup([carry, mscT, existingNonRgsFresh, existingRgsFresh, rgsTail]);

  const stats = {
    carryover_in: carryoverTasks(carryover, shipped).length,
    carryover_kept: carry.length,
    misc_in: miscTasks(misc).length,
    misc_kept: mscT.length,
    existing_total: existing.length,
    existing_rgs: existingRgs.length,
    existing_nonRgs: existingNonRgs.length,
    rgs_tail: rgsTail.length,
    shipped_filtered: shipped.size,
    peer_filtered: peer.size,
    cross_slot_filtered: otherSlotUnits.size,
    git_shipped_unique: _gitShippedCache.size > 0 ? Array.from(_gitShippedCache.values()).filter(Boolean).length : 0,
    final_total: composed.length,
  };

  console.log("compile-alpha-queue stats:", JSON.stringify(stats, null, 2));
  if (VERBOSE) {
    console.log("\nFirst 10 composed:");
    composed.slice(0, 10).forEach((t, i) => console.log(` ${i}. [${t.wave}] ${t.milestone}::${t.unit_id} — ${(t.summary || "").slice(0, 80)}`));
  }

  if (DRY) {
    console.log("\n[DRY-RUN] no write");
    return;
  }

  // Atomic write
  queues.queues.alpha = composed;
  queues.lastCompile = {
    by: "compile-alpha-queue.mjs",
    at: new Date().toISOString(),
    sessionId: "b7530614-3417-4245-bc20-f90161b872c9",
    stats,
  };
  atomicWriteJSON(PATHS.queues, queues);

  const auditPath = `${REPO}/state/shared/specs/ALPHA-QUEUE-COMPILED-${new Date().toISOString().slice(0, 10)}.json`;
  atomicWriteJSON(auditPath, { stats, composed, generatedAt: new Date().toISOString() });
  console.log(`\nWrote: ${PATHS.queues} (alpha queue ${composed.length} units)`);
  console.log(`Audit: ${auditPath}`);
}

main();
