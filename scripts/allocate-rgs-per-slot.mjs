#!/usr/bin/env node
/**
 * allocate-rgs-per-slot.mjs — deterministic per-slot RGS work allocation.
 *
 * Spec: JULIETT-12CHAT-ALLOCATION-MS0 (slot juliett, 2026-05-17).
 * Work order: "begin rgs pipeline for each chat slot" → produce a per-slot
 * RGS-assigned unit queue so each of the 13 fleet slots has a deconflicted
 * queue to pull from on /checkin-<slot> /loop.
 *
 * This script does NOT re-implement unit picking — it DELEGATES to the
 * canonical priority-queue helper (.claude/helpers/priority-queue.mjs), reads
 * its priority-ordered output once, and partitions it across slots:
 *   - 12 work slots (alpha..foxtrot, hotel..mike): round-robin over the
 *     priority-ordered pool so every slot's #1 unit is comparably high-rank
 *     and the queue descends together. backend-dev (priority 0) leads.
 *   - golf: the hygiene/integrator slot. Gets ONLY hygiene-milestone units
 *     (CLEANUP / FLEET-REAPER / FLEET-MEMORY / OBSOLESCENCE / REAP); golf's
 *     units are removed from the work-slot pool first (deconfliction).
 *
 * OUTPUT (both written atomically):
 *   state/shared/specs/JULIETT-PER-SLOT-RGS-ALLOCATION-<date>.json  (sidecar)
 *   state/shared/specs/JULIETT-PER-SLOT-RGS-ALLOCATION-<date>.md    (the spec)
 *
 * Advisory only — never claims a unit, never mutates a roadmap or envelope.
 * The allocation is a starting suggestion; an operator may swap slots freely.
 *
 * Usage:  node scripts/allocate-rgs-per-slot.mjs [--per-slot N] [--pool N]
 *                                                [--json] [--date YYYY-MM-DD]
 * Exit:   0 ok · 1 validation error · 2 runtime error
 */

import { execFileSync } from "node:child_process";
import { writeFileSync, renameSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { SLOT_NAMES } from "../.claude/helpers/chat-slots.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PQ = resolve(ROOT, ".claude/helpers/priority-queue.mjs");
const SPEC_DIR = resolve(ROOT, "state/shared/specs");

const MAX_PER_SLOT = 25;          // CLI clamp — refuse absurd queue depths
const MAX_TITLE_LEN = 96;         // markdown table title truncation
const POOL_HEADROOM_PER_SLOT = 4; // extra pool rows per slot so golf-sieve never starves work slots
const POOL_HEADROOM_FLAT = 40;    // flat extra pool rows on top of per-slot headroom

const HYGIENE_RX = /CLEANUP|FLEET-REAPER|FLEET-MEMORY|OBSOLESCENCE|REAP|HYGIENE/i;
const GOLF_STANDING_DUTIES = [
  "Own the Fleet Reaper (golf-slot-reaper-guardian.mjs) + Fleet Memory Monitor scheduled tasks.",
  "Reconcile envelope drift (`node scripts/audit-roadmap-drift.mjs`) — flip claimed-vs-derived mismatches.",
  "Integrate slot branches into cad-fusion-live-ms0 (golf is the integrator slot).",
  "Watch MEMORY.md size ceiling (`node scripts/memory-size-watch.mjs`) — compress before 24576 B.",
  "Sweep dead claims / zombie slots (`node .claude/helpers/chat-slots.mjs reclaim`).",
];

function parseArgs(argv) {
  const a = { perSlot: 6, pool: 0, json: false, date: null };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--per-slot") a.perSlot = Number(argv[++i]);
    else if (t === "--pool") a.pool = Number(argv[++i]);
    else if (t === "--json") a.json = true;
    else if (t === "--date") a.date = argv[++i];
    else { process.stderr.write(`unknown arg: ${t}\n`); process.exit(1); }
  }
  if (!Number.isInteger(a.perSlot) || a.perSlot < 1 || a.perSlot > MAX_PER_SLOT) {
    process.stderr.write(`--per-slot must be 1..${MAX_PER_SLOT} (got ${a.perSlot})\n`);
    process.exit(1);
  }
  if (a.date && !/^\d{4}-\d{2}-\d{2}$/.test(a.date)) {
    process.stderr.write(`--date must be YYYY-MM-DD (got ${a.date})\n`);
    process.exit(1);
  }
  return a;
}

function pullPool(topN) {
  let raw;
  try {
    raw = execFileSync(process.execPath, [PQ, "--pick", "--top", String(topN), "--json"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    // priority-queue.mjs exits 1 with a valid `[]` on stdout when the queue is
    // empty (no eligible units). execFileSync throws on the non-zero exit, but
    // an empty queue is a valid advisory result — recover the stdout payload.
    const so = e && e.stdout != null ? String(e.stdout) : "";
    try {
      const a = JSON.parse(so);
      if (Array.isArray(a)) return a;
    } catch { /* not valid JSON — fall through to a real failure */ }
    process.stderr.write(`priority-queue subprocess failed: ${e.message}\n`);
    process.exit(2);
  }
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`priority-queue did not emit valid JSON: ${e.message}\n`);
    process.exit(2);
  }
  if (!Array.isArray(arr)) {
    process.stderr.write(`priority-queue JSON is not an array\n`);
    process.exit(2);
  }
  return arr;
}

function cleanTitle(t, max = MAX_TITLE_LEN) {
  const s = String(t ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function main() {
  const args = parseArgs(process.argv);
  const workSlots = SLOT_NAMES.filter((s) => s !== "golf");
  if (workSlots.length === 0) {
    process.stderr.write(`no work slots resolved from SLOT_NAMES\n`);
    process.exit(2);
  }
  // Pull enough that work slots fill AND golf can be sieved out without starving.
  const need = workSlots.length * args.perSlot;
  const topN = args.pool > 0 ? args.pool : need + workSlots.length * POOL_HEADROOM_PER_SLOT + POOL_HEADROOM_FLAT;
  const pool = pullPool(topN);

  // Dedup the pool by unit_id (priority-queue should not repeat, but assert-clean).
  const seen = new Set();
  const uniq = [];
  for (const u of pool) {
    const id = u && u.unit_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    uniq.push(u);
  }

  // Fail loud on priority-queue schema drift. A renamed field would otherwise
  // silently drop every row and emit an empty allocation with exit 0. An empty
  // pool (pool.length === 0) is a legitimate result and is NOT drift.
  if (pool.length > 0 && uniq.length === 0) {
    process.stderr.write(
      `schema drift: priority-queue returned ${pool.length} rows but none carried a usable unit_id\n`
    );
    process.exit(2);
  }
  if (uniq.length > 0) {
    const f = uniq[0];
    if (f._category == null || f.title == null || f.milestone == null) {
      process.stderr.write(
        `schema drift: priority-queue row missing _category/title/milestone — keys [${Object.keys(f).join(",")}]\n`
      );
      process.exit(2);
    }
  }

  // golf = hygiene-only. Take up to perSlot hygiene units off the front.
  const golfUnits = [];
  const workPool = [];
  for (const u of uniq) {
    if (golfUnits.length < args.perSlot && HYGIENE_RX.test(String(u.milestone || ""))) {
      golfUnits.push(u);
    } else {
      workPool.push(u);
    }
  }

  // Round-robin the priority-ordered workPool across the 12 work slots.
  const slots = {};
  for (const s of workSlots) slots[s] = [];
  for (let i = 0; i < need && i < workPool.length; i++) {
    slots[workSlots[i % workSlots.length]].push(workPool[i]);
  }

  // Deconfliction proof — every assigned unit_id must be globally unique.
  const assigned = [];
  for (const s of workSlots) for (const u of slots[s]) assigned.push(u.unit_id);
  for (const u of golfUnits) assigned.push(u.unit_id);
  const dupCheck = new Set();
  const dups = [];
  for (const id of assigned) {
    if (dupCheck.has(id)) dups.push(id);
    dupCheck.add(id);
  }
  if (dups.length > 0) {
    process.stderr.write(`FAIL-LOUD: duplicate unit assignment across slots: ${dups.join(", ")}\n`);
    process.exit(1);
  }

  const date = args.date || new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString();
  const underfilled = workSlots.filter((s) => slots[s].length < args.perSlot);

  const sidecar = {
    schemaVersion: "1.0.0",
    generatedAt,
    spec: "JULIETT-12CHAT-ALLOCATION-MS0",
    advisoryOnly: true,
    mustHumanVerify: true,
    poolRequested: topN,
    poolUnique: uniq.length,
    perSlot: args.perSlot,
    workSlots: workSlots.length,
    totalAssigned: assigned.length,
    underfilledSlots: underfilled,
    slots: {},
  };
  for (const s of workSlots) {
    sidecar.slots[s] = {
      role: "work",
      launch: `/checkin-${s} /loop work my RGS queue`,
      units: slots[s].map((u, idx) => ({
        rank: idx + 1,
        unit_id: u.unit_id,
        milestone: u.milestone,
        category: u._category,
        title: u.title,
      })),
    };
  }
  sidecar.slots.golf = {
    role: "hygiene",
    launch: `/checkin-golf /loop fleet hygiene`,
    standingDuties: GOLF_STANDING_DUTIES,
    units: golfUnits.map((u, idx) => ({
      rank: idx + 1,
      unit_id: u.unit_id,
      milestone: u.milestone,
      category: u._category,
      title: u.title,
    })),
  };

  const md = renderMarkdown(sidecar, date);

  if (args.json) {
    process.stdout.write(JSON.stringify(sidecar, null, 2) + "\n");
    return;
  }

  mkdirSync(SPEC_DIR, { recursive: true });
  const base = `JULIETT-PER-SLOT-RGS-ALLOCATION-${date}`;
  atomicWrite(join(SPEC_DIR, base + ".json"), JSON.stringify(sidecar, null, 2) + "\n");
  atomicWrite(join(SPEC_DIR, base + ".md"), md);

  process.stdout.write(
    `[allocate-rgs] ${assigned.length} units across ${workSlots.length} work slots + golf ` +
      `(${golfUnits.length} hygiene); per-slot=${args.perSlot}\n` +
      `[allocate-rgs] wrote ${base}.{json,md} → ${SPEC_DIR}\n`
  );
  if (underfilled.length > 0) {
    process.stdout.write(`[allocate-rgs] WARN underfilled slots: ${underfilled.join(", ")}\n`);
  }
  if (golfUnits.length < args.perSlot) {
    process.stdout.write(
      `[allocate-rgs] note: golf got ${golfUnits.length}/${args.perSlot} hygiene units ` +
        `(remainder = standing duties; not an error)\n`
    );
  }
}

function atomicWrite(path, content) {
  const tmp = path + ".tmp-" + process.pid;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, path);
}

function renderMarkdown(sc, date) {
  const L = [];
  L.push(`# JULIETT — Per-Slot RGS Allocation (${date})`);
  L.push("");
  L.push(`> Generated by \`scripts/allocate-rgs-per-slot.mjs\` — re-run any time, no hand-drift.`);
  L.push(`> Work order: "begin rgs pipeline for each chat slot" (slot juliett, ${date}).`);
  L.push(`> **Advisory only** — never claims a unit; an operator may swap slot assignments freely.`);
  L.push(`> Picking delegated to \`.claude/helpers/priority-queue.mjs\` (backend-dev priority 0 first).`);
  L.push("");
  L.push("## Summary");
  L.push("");
  L.push(`| Field | Value |`);
  L.push(`|-------|-------|`);
  L.push(`| Generated | ${sc.generatedAt} |`);
  L.push(`| Pool (unique) | ${sc.poolUnique} priority-ordered units |`);
  L.push(`| Per-slot queue depth | ${sc.perSlot} |`);
  L.push(`| Work slots | ${sc.workSlots} (alpha..foxtrot, hotel..mike) |`);
  L.push(`| Total assigned | ${sc.totalAssigned} units |`);
  L.push(`| golf | hygiene slot — ${sc.slots.golf.units.length} hygiene unit(s) |`);
  L.push(`| Underfilled slots | ${sc.underfilledSlots.length ? sc.underfilledSlots.join(", ") : "none"} |`);
  L.push("");
  L.push("Each work slot's queue descends in global priority — its rank-1 unit is the");
  L.push("highest-priority unit assigned to it, picked round-robin so all 12 slots start");
  L.push("on comparable-priority work. Launch a slot with the line in its section header.");
  L.push("");

  for (const s of Object.keys(sc.slots).filter((k) => k !== "golf")) {
    const slot = sc.slots[s];
    L.push(`## ${s.toUpperCase()} — ${slot.units.length} units`);
    L.push("");
    L.push(`Launch: \`${slot.launch}\``);
    L.push("");
    if (slot.units.length === 0) {
      L.push("_(no units — pool exhausted; pull from priority-queue directly)_");
      L.push("");
      continue;
    }
    L.push(`| # | Unit | Milestone | Cat | Title |`);
    L.push(`|---|------|-----------|-----|-------|`);
    for (const u of slot.units) {
      L.push(`| ${u.rank} | \`${u.unit_id}\` | ${u.milestone} | ${u.category} | ${cleanTitle(u.title)} |`);
    }
    L.push("");
  }

  const golf = sc.slots.golf;
  L.push(`## GOLF — hygiene / integrator slot`);
  L.push("");
  L.push(`Launch: \`${golf.launch}\``);
  L.push("");
  L.push("Golf is NOT a feature slot — it never gets a work-unit queue. Standing duties:");
  L.push("");
  for (const d of golf.standingDuties) L.push(`- ${d}`);
  L.push("");
  if (golf.units.length > 0) {
    L.push("Hygiene-milestone units golf may also pick up this cycle:");
    L.push("");
    L.push(`| # | Unit | Milestone | Cat | Title |`);
    L.push(`|---|------|-----------|-----|-------|`);
    for (const u of golf.units) {
      L.push(`| ${u.rank} | \`${u.unit_id}\` | ${u.milestone} | ${u.category} | ${cleanTitle(u.title)} |`);
    }
    L.push("");
  } else {
    L.push("_(no hygiene-milestone units in the current priority pool — standing duties only)_");
    L.push("");
  }

  L.push("## Deconfliction");
  L.push("");
  L.push(`All ${sc.totalAssigned} assigned unit IDs are globally unique — no two slots`);
  L.push("share a unit (the allocator fail-louds and exits non-zero on any collision).");
  L.push("");
  L.push("**Caveat (mustHumanVerify):** priority-queue filters units flagged shipped in");
  L.push("`MILESTONE_PROGRESS`. Its claim filter is best-effort only — a topic-string");
  L.push("token match, NOT a `slot-task-claim` lookup — so a unit actively claimed by a");
  L.push("peer may still appear here; run `node .claude/helpers/slot-task-claim.mjs check`");
  L.push("before claiming. A unit whose deliverable shipped but whose envelope was never");
  L.push("flipped (silent close-out debt) can also still appear — verify against");
  L.push("`/close-out-audit`. Most likely for the golf CLEANUP-MS0 queue, several of which look complete.");
  L.push("");
  L.push("## How a slot consumes this");
  L.push("");
  L.push("1. Operator runs the launch line for the slot (e.g. `/checkin-alpha /loop work my RGS queue`).");
  L.push("2. The slot reads its row in this spec, picks its rank-1 unit.");
  L.push("3. `/checkin` claims the unit (slot-task-claim), builds, per-file scrutiny, 3-of-3 Stop gate, commits.");
  L.push("4. The autonomous loop advances to rank-2, and so on down the queue.");
  L.push("5. On queue exhaustion, the slot pulls fresh from `node .claude/helpers/priority-queue.mjs --pick --slot <s>`.");
  L.push("");
  L.push(`_Regenerate: \`node scripts/allocate-rgs-per-slot.mjs\` — advisory, mustHumanVerify._`);
  L.push("");
  return L.join("\n");
}

main();
