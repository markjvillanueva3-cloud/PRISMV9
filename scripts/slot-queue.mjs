#!/usr/bin/env node
// scripts/slot-queue.mjs — per-slot unit queue API for /checkin-<nato> auto-loop
//
// Reads state/shared/slot-task-queues.json; cross-checks MILESTONE_PROGRESS (shipped)
// and slot-task-claims.json (peer-claimed in-flight) and depends_on graph.
//
// CLI:
//   node scripts/slot-queue.mjs --pick --slot <nato> [--json]    next eligible unit (skipped if shipped/claimed/dep-blocked)
//   node scripts/slot-queue.mjs --list --slot <nato> [--json]    full queue for a slot
//   node scripts/slot-queue.mjs --status [--json]                cross-slot completion summary
//   node scripts/slot-queue.mjs --remaining --slot <nato>        count of un-shipped, un-claimed eligible units
//
// Exit codes: 0 ok / 1 queue-empty-or-all-blocked / 2 usage-error / 3 io-error

import fs from "node:fs";

const QUEUE_FILE = "H:/prism/state/shared/slot-task-queues.json";
const CLAIMS_FILE = "H:/prism/state/shared/slot-task-claims.json";
const PROGRESS_FILE = "H:/prism/state/shared/MILESTONE_PROGRESS.json";

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}

function loadQueue() {
  const data = readJsonSafe(QUEUE_FILE);
  if (!data || !data.queues) {
    console.error(JSON.stringify({ ok: false, error: "queue_missing_or_malformed", path: QUEUE_FILE }));
    process.exit(3);
  }
  return data;
}

function loadShippedSet() {
  const prog = readJsonSafe(PROGRESS_FILE) || {};
  const shipped = new Set();
  const milestones = Array.isArray(prog.milestones) ? prog.milestones : Object.values(prog.milestones || {});
  for (const m of milestones) {
    const ships = Array.isArray(m?.shipped) ? m.shipped : [];
    for (const u of ships) shipped.add(typeof u === "string" ? u : u?.unit_id || u?.id || "");
  }
  return shipped;
}

function loadActiveClaims() {
  const claims = readJsonSafe(CLAIMS_FILE) || {};
  const active = new Set();
  const claimList = Array.isArray(claims.claims) ? claims.claims : Object.values(claims.claims || {});
  for (const c of claimList) {
    const status = c?.status || c?.phase;
    if (status === "claimed" || status === "building" || status === "testing" || status === "committing") {
      const uid = c?.unitId || c?.unit_id || c?.unit;
      if (uid) active.add(uid);
    }
  }
  return active;
}

function pickNext(slot, shipped, claimed) {
  const q = loadQueue();
  const slotQueue = q.queues[slot] || [];
  for (const entry of slotQueue) {
    if (shipped.has(entry.unit_id)) continue;
    if (claimed.has(entry.unit_id)) continue;
    const deps = entry.depends_on || [];
    const depsBlocked = deps.some(d => !shipped.has(d));
    if (depsBlocked) continue;
    return { ...entry, _eligible: true };
  }
  return null;
}

function listQueue(slot, shipped, claimed) {
  const q = loadQueue();
  const slotQueue = q.queues[slot] || [];
  return slotQueue.map(e => ({
    ...e,
    _shipped: shipped.has(e.unit_id),
    _claimed: claimed.has(e.unit_id),
    _dep_blocked: (e.depends_on || []).some(d => !shipped.has(d)),
  }));
}

function statusAll(shipped, claimed) {
  const q = loadQueue();
  const out = {};
  for (const [slot, queue] of Object.entries(q.queues)) {
    let s = 0, c = 0, blocked = 0, eligible = 0;
    for (const e of queue) {
      if (shipped.has(e.unit_id)) s++;
      else if (claimed.has(e.unit_id)) c++;
      else if ((e.depends_on || []).some(d => !shipped.has(d))) blocked++;
      else eligible++;
    }
    out[slot] = { total: queue.length, shipped: s, claimed: c, dep_blocked: blocked, eligible };
  }
  return out;
}

function remaining(slot, shipped, claimed) {
  const q = loadQueue();
  const slotQueue = q.queues[slot] || [];
  let remain = 0;
  for (const e of slotQueue) {
    if (shipped.has(e.unit_id)) continue;
    if (claimed.has(e.unit_id)) continue;
    if ((e.depends_on || []).some(d => !shipped.has(d))) continue;
    remain++;
  }
  return remain;
}

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
}
const wantJson = args.includes("--json");

const shipped = loadShippedSet();
const claimed = loadActiveClaims();

if (args.includes("--pick")) {
  const slot = getArg("--slot");
  if (!slot) { console.error("--slot required"); process.exit(2); }
  const next = pickNext(slot, shipped, claimed);
  if (wantJson) {
    console.log(JSON.stringify({ ok: !!next, slot, next, shipped: shipped.size, claimed: claimed.size }, null, 2));
  } else if (!next) {
    console.log(`${slot}: queue empty OR all remaining items shipped/claimed/dep-blocked. Run --list for detail.`);
  } else {
    const specHint = next.spec === "pending-generator" ? " (spec pending U-UNIT-SPEC-GENERATOR)" : ` (spec: ${next.spec})`;
    console.log(`${slot} next: ${next.unit_id} [${next.wave} ${next.cost}]${specHint}\n  ${next.summary}`);
  }
  if (!next) process.exit(1);
} else if (args.includes("--list")) {
  const slot = getArg("--slot");
  if (!slot) { console.error("--slot required"); process.exit(2); }
  const list = listQueue(slot, shipped, claimed);
  if (wantJson) {
    console.log(JSON.stringify({ ok: true, slot, queue: list }, null, 2));
  } else {
    if (!list.length) { console.log(`${slot}: queue empty`); process.exit(0); }
    for (const e of list) {
      const flag = e._shipped ? "SHIPPED " : e._claimed ? "IN-FLIGHT" : e._dep_blocked ? "DEP-BLOCK" : "ELIGIBLE ";
      console.log(`  ${flag}  ${e.unit_id.padEnd(38)} [${e.wave} ${e.cost}]`);
    }
  }
} else if (args.includes("--status")) {
  const out = statusAll(shipped, claimed);
  if (wantJson) {
    console.log(JSON.stringify({ ok: true, status: out, totals: { shipped: shipped.size, claimed: claimed.size } }, null, 2));
  } else {
    console.log("slot       total  shipped  in-flight  dep-blocked  eligible");
    console.log("---------  -----  -------  ---------  -----------  --------");
    for (const [slot, s] of Object.entries(out)) {
      console.log(`${slot.padEnd(10)} ${String(s.total).padStart(5)}  ${String(s.shipped).padStart(7)}  ${String(s.claimed).padStart(9)}  ${String(s.dep_blocked).padStart(11)}  ${String(s.eligible).padStart(8)}`);
    }
  }
} else if (args.includes("--remaining")) {
  const slot = getArg("--slot");
  if (!slot) { console.error("--slot required"); process.exit(2); }
  const n = remaining(slot, shipped, claimed);
  if (wantJson) console.log(JSON.stringify({ ok: true, slot, remaining: n }));
  else console.log(n);
  if (n === 0) process.exit(1);
} else {
  console.error("Usage:");
  console.error("  slot-queue.mjs --pick --slot <nato> [--json]");
  console.error("  slot-queue.mjs --list --slot <nato> [--json]");
  console.error("  slot-queue.mjs --status [--json]");
  console.error("  slot-queue.mjs --remaining --slot <nato> [--json]");
  process.exit(2);
}
