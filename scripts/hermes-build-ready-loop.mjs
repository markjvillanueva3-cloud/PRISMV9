#!/usr/bin/env node
// hermes-build-ready-loop.mjs -- HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-CONSUME driver (slot:zulu).
//
// The CONSUMER/IO shell for the build-ready-queue -- the R15-WIRE stage completing the pipeline
//   draft (hermes-unit-plan-harness) -> verify (hermes-unit-plan-verify-harness) -> SURFACE (here).
// A cron-driven tick that reads knowledge/hermes-outputs/units/work/build-ready-queue.json
// READ-ONLY, routes each VERIFIED unit to its owner/lead slot (pure core hermes-build-ready-queue),
// and emits four orthogonal surfaces so specialist slots pick up work with no down time:
//   1. state/shared/hermes-build-ready-next.json     -- single-writer per-slot pointer (hook reads)
//   2. state/shared/hermes-build-ready-dashboard.md  -- standalone human dashboard
//   3. state/shared/hermes-build-ready-log.jsonl     -- run ledger (ok/skipped rows)
//   4. state/shared/AGENT_CHAT.jsonl                 -- throttled per-slot advisory (6h cooldown)
//
// BOUNDARY (hard invariant): NEVER builds, commits, dequeues, or writes build-ready-queue.json /
// claims.json. Read/route/advertise only. Actual pickup flows slot -> /loop -> slot-task-claim ->
// per-unit build+test+3-of-3. Clones the zulu-build-loop conventions (atomicWriteJson, git-reality
// grounding, exclusive-file-lock overlap guard, ledgerRecord). No Ollama -- titles are already terse.
//
// Knobs: PRISM_HBR_DISABLE=1 (no-op), PRISM_HBR_BUS_DISABLE=1 (skip chat-bus advisory),
//        PRISM_HBR_COOLDOWN_MS (default 21600000 = 6h), PRISM_ROOT (default H:/prism).
// Exit: 0 always (never fails a cron); 2 only if the repo root itself is unreadable.
// ASCII-only (ascii-guard). Node 22.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { routeQueue, unwrapClaims, shippedIds, builtIdsFromLedger } from "./lib/hermes-build-ready-queue.mjs";
import { renderDashboard, decideAdvisories } from "./lib/hermes-build-ready-pointer.mjs";
import { acquireExclusiveLock, releaseExclusiveLock } from "./lib/exclusive-file-lock.mjs";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
const QUEUE_PATH = path.join(ROOT, "knowledge/hermes-outputs/units/work/build-ready-queue.json");
const CLAIMS_PATH = path.join(ROOT, "knowledge/hermes-outputs/units/work/claims.json");
const POINTER_PATH = path.join(ROOT, "state/shared/hermes-build-ready-next.json");
const DASHBOARD_PATH = path.join(ROOT, "state/shared/hermes-build-ready-dashboard.md");
const LEDGER_PATH = path.join(ROOT, "state/shared/hermes-build-ready-log.jsonl");
// Deterministic 2nd completion source, unioned with the git-subject signal (see builtIdsFromLedger):
// the `mark-unit-built` CLI appends one JSON line here per built unit so the queue drains even
// though the fleet ships `[SCOPE]/U-<id>` (which carries no `UNIT-<id>` token for shippedIds).
const BUILT_LEDGER_PATH = process.env.PRISM_BUILT_LEDGER_PATH
  || path.join(ROOT, "state/shared/hermes-unit-plan-built-ledger.jsonl");
const BUS_PATH = path.join(ROOT, "state/shared/AGENT_CHAT.jsonl");
const ADVISORY_LEDGER_PATH = path.join(ROOT, "state/shared/hermes-build-ready-advisory-ledger.json");
const LOCK_PATH = `${POINTER_PATH}.loop-process.lock`;

const COOLDOWN_MS = (() => {
  const n = Number(process.env.PRISM_HBR_COOLDOWN_MS);
  return Number.isFinite(n) && n >= 0 ? n : 21_600_000; // 6h
})();
// Stale headroom: derived floor so a legitimately-slow run is never stolen -> two parallel writers.
const PROCESS_STALE_FLOOR_MS = Number(process.env.PRISM_HBR_STALE_MS) || 120_000;
const GIT_LOG_WORST_MS = 15_000;

function readJsonOptional(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

function atomicWriteJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, p);
}
function atomicWriteText(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, p);
}

/** Read-only recent commit subjects for the git-reality shipped signal. Fail-soft: "" on any error. */
function readShippedCommitsText() {
  try {
    return execFileSync("git", ["-C", ROOT, "log", "--oneline", "-400"], {
      encoding: "utf8", timeout: GIT_LOG_WORST_MS, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 8 * 1024 * 1024,
    });
  } catch { return ""; }
}

/** Read-only built-ledger contents for the explicit completion signal. Fail-soft: "" when absent. */
function readBuiltLedgerText() {
  try { return fs.readFileSync(BUILT_LEDGER_PATH, "utf8"); }
  catch { return ""; } // absent ledger (nothing marked built yet) -> empty -> no-op union
}

function ledgerRecord(nowIso, status, fields = {}) {
  return { at: nowIso, status, source: "hermes-build-ready-loop", ...fields };
}
function appendLedger(record) {
  try {
    fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
    fs.appendFileSync(LEDGER_PATH, JSON.stringify(record) + "\n", "utf8");
  } catch { /* best-effort */ }
}

/** Append throttled per-slot advisories to the chat bus (O_APPEND, one JSON line each). */
function postAdvisories(posts, nowIso) {
  if (process.env.PRISM_HBR_BUS_DISABLE === "1" || !posts.length) return 0;
  let n = 0;
  try {
    fs.mkdirSync(path.dirname(BUS_PATH), { recursive: true });
    for (const p of posts) {
      const rec = { timestamp: nowIso, from: "zulu", to: [p.slot], kind: "build-ready-available", summary: p.message, unitId: p.unitId, roi: p.roi };
      fs.appendFileSync(BUS_PATH, JSON.stringify(rec) + "\n", "utf8");
      n++;
    }
  } catch { /* bus append best-effort -- never fails the cron */ }
  return n;
}

function main() {
  if (process.env.PRISM_HBR_DISABLE === "1") { console.log("[hbr] disabled (PRISM_HBR_DISABLE=1)"); return 0; }
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  // Overlap guard: a concurrent run SKIPS (skip-if-held) rather than racing the single-writer
  // pointer/dashboard/advisory-ledger writes. Pointer is durable -> the loser runs next tick.
  const staleMs = Math.max(PROCESS_STALE_FLOOR_MS, Math.ceil(GIT_LOG_WORST_MS * 3));
  const lk = acquireExclusiveLock(LOCK_PATH, { retries: 2, retryMs: 1, staleMs });
  if (!lk.acquired) {
    appendLedger(ledgerRecord(nowIso, "skipped", { reason: "another hermes-build-ready-loop run holds the process lock" }));
    console.log("[hbr] another run holds the lock; skipping this tick (pointer is durable)");
    return 0;
  }
  try {
    // The queue is OPTIONAL: if no unit has ever been verified it is absent -> route an empty
    // directive (perSlot:{}) so the hook no-ops and no false nudge fires. A parse error degrades
    // the same way (fail-soft) -- never crashes the cron.
    const queue = readJsonOptional(QUEUE_PATH);
    const claims = unwrapClaims(readJsonOptional(CLAIMS_PATH));
    // Union the two completion sources: git-subject `UNIT-<id>` tokens (drift-immune but dormant
    // under the fleet's `U-<id>` convention) + the explicit built-ledger (mark-unit-built CLI).
    // Either signal drains a unit -> the queue is genuinely drainable (true "no down time").
    const shipped = new Set([
      ...shippedIds(readShippedCommitsText()),
      ...builtIdsFromLedger(readBuiltLedgerText()),
    ]);
    const directive = routeQueue({ queue, claims, shipped, nowIso, queuePath: path.relative(ROOT, QUEUE_PATH) });

    atomicWriteJson(POINTER_PATH, directive);
    atomicWriteText(DASHBOARD_PATH, renderDashboard(directive));

    const prevLedger = readJsonOptional(ADVISORY_LEDGER_PATH);
    const { posts, nextLedger } = decideAdvisories({ directive, ledger: prevLedger, nowMs, cooldownMs: COOLDOWN_MS });
    const posted = postAdvisories(posts, nowIso);
    // Advance the advisory ledger ONLY when advisories were actually POSTED -- writing it on
    // `posts.length` would stamp slots as "advised" even when the bus was disabled / append failed,
    // wrongly suppressing the next real advisory (caught in validation: a --bus-disabled run had
    // polluted the ledger and silenced 7 of 8 slots on the next tick).
    if (posted > 0) atomicWriteJson(ADVISORY_LEDGER_PATH, nextLedger);

    const slotCount = Object.keys(directive.perSlot).length;
    appendLedger(ledgerRecord(nowIso, "ok", {
      totalReady: directive.totalReady, slots: slotCount, fleet: directive.fleet.length,
      owned: directive.owned.length, suppressed: directive.done.length, advisoriesPosted: posted,
    }));
    console.log(`[hbr] ready=${directive.totalReady} slots=${slotCount} fleet=${directive.fleet.length} suppressed=${directive.done.length} advisories=${posted} -> ${path.relative(ROOT, POINTER_PATH)}`);
    return 0;
  } catch (e) {
    // Only a genuinely broken repo root reaches here (the reads are fail-soft). Record a durable
    // failure row so a ledger monitor sees "cron broken", not a phantom drained state.
    appendLedger(ledgerRecord(nowIso, "failed", { reason: String(e && e.message || e) }));
    console.error(`[hbr] FAILED: ${e && e.message || e}`);
    return 2;
  } finally {
    releaseExclusiveLock(LOCK_PATH);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { process.exit(main() || 0); } catch (e) { console.error("[hbr] fatal:", e && e.message); process.exit(2); }
}

export { main, routeQueue };
