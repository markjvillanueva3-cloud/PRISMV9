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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildShippedIdsUnion } from "./lib/shipped-units-source-of-truth.mjs";

const QUEUE_FILE = "H:/prism/state/shared/slot-task-queues.json";
const CLAIMS_FILE = "H:/prism/state/shared/slot-task-claims.json";

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

// Canonical shipped-detection (was broken: read m.shipped as if it were an array
// of unit-ids, but MILESTONE_PROGRESS.shipped is a count number — so the set
// was always empty fleet-wide and every unit appeared unshipped).
// Now delegates to shipped-units-source-of-truth which unions:
//   (a) MILESTONE_PROGRESS m.units[].shipped===true (git-inferred)
//   (b) milestone envelope status ∈ {complete,completed,shipped,superseded}
function loadShippedSet() { return buildShippedIdsUnion(); }
const normId = (id) => String(id || "").trim().toUpperCase();

// Entry-level done marker — complements the envelope/git shipped-set for
// generator/enroller queue entries whose own id is in no envelope (so the
// SSOT in shipped-units-source-of-truth.mjs structurally can't see them).
// Stamped by slot-queue-mark-done.mjs post-commit. Back-compat: pre-existing
// entries lack the field → not "done" here.
//
// STRICTLY ADDITIVE to the SSOT, never authoritative over it: every caller
// skips an entry if entryCompleted() OR shipped.has(uid) — a union, the same
// shape as the echo SSOT's own (git ∪ envelope) union. It therefore cannot
// contradict the SSOT (a unit done by either signal is skipped); it only
// covers the queue-entry class the SSOT structurally cannot. No drift path.
const TERMINAL_STATUS = new Set(["shipped", "completed", "done"]);
export function entryCompleted(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.completed_at) return true;
  const s = typeof entry.status === "string" ? entry.status.trim().toLowerCase() : "";
  return TERMINAL_STATUS.has(s);
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
    const uid = normId(entry.unit_id);
    if (entryCompleted(entry)) continue;
    if (shipped.has(uid)) continue;
    if (claimed.has(entry.unit_id) || claimed.has(uid)) continue;
    const deps = entry.depends_on || [];
    const depsBlocked = deps.some(d => !shipped.has(normId(d)));
    if (depsBlocked) continue;
    return { ...entry, _eligible: true };
  }
  return null;
}

function listQueue(slot, shipped, claimed) {
  const q = loadQueue();
  const slotQueue = q.queues[slot] || [];
  return slotQueue.map(e => {
    const uid = normId(e.unit_id);
    return {
      ...e,
      _completed: entryCompleted(e),
      _shipped: shipped.has(uid),
      _claimed: claimed.has(e.unit_id) || claimed.has(uid),
      _dep_blocked: (e.depends_on || []).some(d => !shipped.has(normId(d))),
    };
  });
}

function statusAll(shipped, claimed) {
  const q = loadQueue();
  const out = {};
  for (const [slot, queue] of Object.entries(q.queues)) {
    let s = 0, c = 0, blocked = 0, eligible = 0;
    for (const e of queue) {
      const uid = normId(e.unit_id);
      if (entryCompleted(e) || shipped.has(uid)) s++;
      else if (claimed.has(e.unit_id) || claimed.has(uid)) c++;
      else if ((e.depends_on || []).some(d => !shipped.has(normId(d)))) blocked++;
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
    const uid = normId(e.unit_id);
    if (entryCompleted(e)) continue;
    if (shipped.has(uid)) continue;
    if (claimed.has(e.unit_id) || claimed.has(uid)) continue;
    if ((e.depends_on || []).some(d => !shipped.has(normId(d)))) continue;
    remain++;
  }
  return remain;
}

const isMain = (() => {
  try {
    return process.argv[1]
      && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url));
  } catch { return false; }
})();

if (isMain) {
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
      const flag = e._completed ? "DONE     " : e._shipped ? "SHIPPED " : e._claimed ? "IN-FLIGHT" : e._dep_blocked ? "DEP-BLOCK" : "ELIGIBLE ";
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
}
