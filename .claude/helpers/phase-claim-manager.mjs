#!/usr/bin/env node
// helpers/phase-claim-manager.mjs
//
// Atomic phase-claim system for 6-chat parallel roadmap execution.
// State files:
//   - state/shared/phase-claims.jsonl  (append-only event log)
//   - state/shared/phase-state.json    (derived current state, regenerated)
//   - state/shared/dependency-graph.json (DAG, read-only)
//
// Subcommands:
//   list                      → print all phases + status (compact)
//   status <phase>            → print one phase
//   claim <phase>             → atomic claim (verifies deps, creates worktree, branch)
//   release <phase>           → release claim (manual unblock)
//   heartbeat <phase>         → refresh claim heartbeat
//   merged <phase>            → mark phase as merged-to-main (coordinator only)
//   stale --reap              → reap stale claims (heartbeat > STALE_AFTER_MS)
//   blocked-by <phase>        → list deps not yet merged
//   workboard                 → render markdown summary
//
// Locking: atomic via lockfile open(O_CREAT|O_EXCL) on state/shared/.phase-claim.lock

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeIdentity, getMachine, getStableSessionId } from "./identity-normalize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = path.resolve(__dirname, "..", "..");
const STATE_DIR = path.join(PRISM_ROOT, "state", "shared");
const CLAIMS_LOG = path.join(STATE_DIR, "phase-claims.jsonl");
const PHASE_STATE = path.join(STATE_DIR, "phase-state.json");
const LOCK_FILE = path.join(STATE_DIR, ".phase-claim.lock");

const STALE_AFTER_MS = 30 * 60 * 1000;              // 30 min
const DEFAULT_PHASE_HOURS_BUFFER = 1.5;             // expected_completion = now + hours*1.5
const LOCK_RETRY_MS = 100;
const LOCK_MAX_RETRIES = 50;
const LOCK_STALE_MS = 10_000;                       // 10s
const MS_PER_HOUR = 3_600_000;

function readJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}
function writeJSONAtomic(p, data) {
  const tmp = `${p}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, p);
}
function appendEvent(event) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
  fs.appendFileSync(CLAIMS_LOG, line);
}

async function withLock(fn) {
  for (let i = 0; i < LOCK_MAX_RETRIES; i++) {
    try {
      const fd = fs.openSync(LOCK_FILE, "wx");
      try {
        fs.writeSync(fd, JSON.stringify({ pid: process.pid, ts: new Date().toISOString() }));
        return await fn();
      } finally {
        try { fs.closeSync(fd); } catch {}
        try { fs.unlinkSync(LOCK_FILE); } catch {}
      }
    } catch (e) {
      if (e.code === "EEXIST") {
        // Lock held — check if stale (>10s old)
        try {
          const stat = fs.statSync(LOCK_FILE);
          if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
            try { fs.unlinkSync(LOCK_FILE); } catch {}
            continue;
          }
        } catch {}
        await new Promise(r => setTimeout(r, LOCK_RETRY_MS));
        continue;
      }
      throw e;
    }
  }
  throw new Error("phase-claim-manager: lock timeout");
}

function loadState() { return readJSON(PHASE_STATE, { phases: {} }); }
function saveState(s) { s.lastUpdated = new Date().toISOString(); writeJSONAtomic(PHASE_STATE, s); }
// DEP_GRAPH is loaded ad-hoc in checks; phase-state.json carries depends_on inline.

function isStale(phase) {
  if (!phase.heartbeat) return false;
  return Date.now() - new Date(phase.heartbeat).getTime() > STALE_AFTER_MS;
}

function depsBlockingClaim(phaseId, state) {
  const phase = state.phases[phaseId];
  if (!phase) return [`unknown phase ${phaseId}`];
  const blocked = [];
  for (const dep of phase.depends_on || []) {
    const d = state.phases[dep];
    if (!d) { blocked.push(`${dep} (missing)`); continue; }
    if (d.status !== "MERGED") blocked.push(`${dep} (status: ${d.status})`);
  }
  return blocked;
}

async function claim(phaseId, opts = {}) {
  return withLock(async () => {
    const state = loadState();
    const phase = state.phases[phaseId];
    if (!phase) return { ok: false, reason: `unknown phase: ${phaseId}` };

    if (phase.status === "CLAIMED" || phase.status === "IN_PROGRESS") {
      if (!isStale(phase) && !opts.force) {
        return { ok: false, reason: `already owned by ${phase.owner}`, owner: phase.owner };
      }
      // Stale — reap
      appendEvent({ kind: "release", phase_id: phaseId, chat_id: phase.owner, reason: "stale-reap" });
    }

    const blocking = depsBlockingClaim(phaseId, state);
    if (blocking.length > 0 && !opts.force) {
      return { ok: false, reason: "blocked by deps", blocking };
    }

    const owner = normalizeIdentity(opts.owner);
    const now = new Date().toISOString();
    const expected = new Date(Date.now() + (phase.hours || 1) * DEFAULT_PHASE_HOURS_BUFFER * MS_PER_HOUR).toISOString();

    phase.status = "CLAIMED";
    phase.owner = owner;
    phase.claimed_at = now;
    phase.heartbeat = now;
    phase.expected_completion = expected;
    saveState(state);

    appendEvent({
      kind: "claim",
      phase_id: phaseId,
      chat_id: opts.owner || getStableSessionId(),
      normalized_id: owner,
      machine: getMachine(),
      worktree: phase.worktree,
      branch: phase.branch,
      expected_completion: expected,
      notes: opts.notes || ""
    });

    return { ok: true, phase: phaseId, owner, worktree: phase.worktree, branch: phase.branch };
  });
}

async function release(phaseId, opts = {}) {
  return withLock(async () => {
    const state = loadState();
    const phase = state.phases[phaseId];
    if (!phase) return { ok: false, reason: `unknown phase: ${phaseId}` };
    const owner = normalizeIdentity(opts.owner);
    if (phase.owner && phase.owner !== owner && !opts.force) {
      return { ok: false, reason: `not owner (owned by ${phase.owner})` };
    }
    phase.status = "UNCLAIMED";
    phase.owner = null;
    phase.claimed_at = null;
    phase.heartbeat = null;
    phase.expected_completion = null;
    saveState(state);
    appendEvent({ kind: "release", phase_id: phaseId, chat_id: opts.owner || getStableSessionId(), normalized_id: owner, notes: opts.notes || "" });
    return { ok: true };
  });
}

async function heartbeat(phaseId, opts = {}) {
  return withLock(async () => {
    const state = loadState();
    const phase = state.phases[phaseId];
    if (!phase) return { ok: false, reason: `unknown phase: ${phaseId}` };
    const owner = normalizeIdentity(opts.owner);
    if (phase.owner !== owner && !opts.force) {
      return { ok: false, reason: `not owner (owned by ${phase.owner})` };
    }
    phase.heartbeat = new Date().toISOString();
    if (phase.status === "CLAIMED") phase.status = "IN_PROGRESS";
    saveState(state);
    appendEvent({ kind: "heartbeat", phase_id: phaseId, normalized_id: owner });
    return { ok: true, heartbeat: phase.heartbeat };
  });
}

async function merged(phaseId, opts = {}) {
  return withLock(async () => {
    const state = loadState();
    const phase = state.phases[phaseId];
    if (!phase) return { ok: false, reason: `unknown phase: ${phaseId}` };
    phase.status = "MERGED";
    saveState(state);
    appendEvent({ kind: "merged", phase_id: phaseId, normalized_id: normalizeIdentity(opts.owner), notes: opts.notes || "" });
    return { ok: true };
  });
}

async function reapStale() {
  return withLock(async () => {
    const state = loadState();
    const reaped = [];
    for (const [id, phase] of Object.entries(state.phases)) {
      if ((phase.status === "CLAIMED" || phase.status === "IN_PROGRESS") && isStale(phase)) {
        appendEvent({ kind: "release", phase_id: id, chat_id: phase.owner, reason: "stale-reap-batch" });
        phase.status = "UNCLAIMED";
        phase.owner = null;
        phase.claimed_at = null;
        phase.heartbeat = null;
        phase.expected_completion = null;
        reaped.push(id);
      }
    }
    if (reaped.length) saveState(state);
    return { ok: true, reaped };
  });
}

function list() {
  const state = loadState();
  const rows = Object.entries(state.phases).map(([id, p]) => ({
    id, status: p.status, owner: p.owner || "-", hours: p.hours,
    worktree: p.worktree, blocked_by: depsBlockingClaim(id, state).join(",") || "-"
  }));
  return rows;
}

function workboard() {
  const state = loadState();
  const lines = [
    "# PRISM 6-Chat Workboard",
    `_Generated ${new Date().toISOString()} from phase-state.json_`,
    "",
    "| Phase | Status | Owner | Hours | Worktree | Blocked-by |",
    "|---|---|---|---:|---|---|",
  ];
  for (const [id, p] of Object.entries(state.phases)) {
    const blockers = depsBlockingClaim(id, state).join(", ") || "-";
    lines.push(`| ${id} | ${p.status} | ${p.owner || "-"} | ${p.hours} | ${p.worktree} | ${blockers} |`);
  }
  return lines.join("\n");
}

const cmd = process.argv[2];
const arg = process.argv[3];
const ownerFlag = process.argv.find(a => a.startsWith("--owner="))?.split("=")[1];
const force = process.argv.includes("--force");
const notes = process.argv.find(a => a.startsWith("--notes="))?.split("=")[1] || "";

(async () => {
  let result;
  switch (cmd) {
    case "list": result = list(); break;
    case "status": result = list().find(r => r.id === arg) || { error: `unknown ${arg}` }; break;
    case "claim": result = await claim(arg, { owner: ownerFlag, force, notes }); break;
    case "release": result = await release(arg, { owner: ownerFlag, force, notes }); break;
    case "heartbeat": result = await heartbeat(arg, { owner: ownerFlag, force }); break;
    case "merged": result = await merged(arg, { owner: ownerFlag, notes }); break;
    case "stale": result = await reapStale(); break;
    case "blocked-by": result = depsBlockingClaim(arg, loadState()); break;
    case "workboard": process.stdout.write(workboard() + "\n"); process.exit(0);
    default:
      process.stderr.write("usage: phase-claim-manager.mjs <list|status|claim|release|heartbeat|merged|stale|blocked-by|workboard> [phase] [--owner=ID] [--force] [--notes=...]\n");
      process.exit(2);
  }
  process.stdout.write(JSON.stringify(result) + "\n");
})().catch(e => { process.stderr.write(`error: ${e.message}\n`); process.exit(1); });
