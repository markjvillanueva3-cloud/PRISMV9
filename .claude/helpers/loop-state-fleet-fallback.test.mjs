// tier: T3
/**
 * .claude/helpers/loop-state-fleet-fallback.test.mjs
 *
 * Hermetic tests for the OWN-DOMAIN-FIRST → FLEET-FALLBACK next-unit resolution
 * added to loop-state.mjs `pickUnitTop` (U-GOAL-CLEAR-ADVANCE, slot:alpha
 * 2026-06-08). Operator directive: a slot must fall back to remaining queued
 * units on goal-clear instead of idling — when its OWN lane is empty, it picks
 * the highest-priority remaining unit FLEET-WIDE (peer-claim-filtered).
 *
 * pickUnitTop is module-internal, so we drive the real CLI `next --resolve-only`
 * (the public contract) against throwaway session ids. `--resolve-only` never
 * mutates roadmap/claim state and never writes loop-state for a non-running
 * session, so these are side-effect-free against the live roadmap.
 *
 * Run: node --test .claude/helpers/loop-state-fleet-fallback.test.mjs
 */

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "loop-state.mjs");
const STATE_DIR = path.join("H:", "prism", "state", "shared", "loop-state");

let counter = 0;
const SESSIONS = [];
function sid() {
  const s = `test-fleetfb-${process.pid}-${counter++}`;
  SESSIONS.push(s);
  return s;
}

function run(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf-8", timeout: 60000 });
  const line = (r.stdout || "").trim().split("\n").filter(Boolean).pop() || "{}";
  return { json: JSON.parse(line), status: r.status };
}

function statePath(s) {
  const safe = String(s).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  return path.join(STATE_DIR, `loop-${safe}.json`);
}

afterEach(() => {
  for (const s of SESSIONS.splice(0)) {
    try { fs.unlinkSync(statePath(s)); } catch { /* not created */ }
  }
});

// ── own-lane EMPTY → fleet fallback resolves a real unit, source=pick-unit-fleet ──
test("non-existent slot lane is empty → falls back to fleet (source pick-unit-fleet)", () => {
  const s = sid();
  // 'zzznonexistent' is not a real slot/domain, so its own pick-unit lane is
  // empty — the resolver MUST fall through to the fleet-wide candidate.
  const { json } = run(["next", "--session", s, "--slot", "zzznonexistent", "--resolve-only"]);
  assert.equal(json.ok, true);
  if (json.exhausted) {
    // Only valid if the ENTIRE fleet roadmap is empty (no units anywhere).
    assert.equal(json.nextTask, "", "exhausted ⇒ empty task");
  } else {
    assert.ok(typeof json.nextTask === "string" && json.nextTask.length > 0, "fallback ⇒ real task");
    assert.equal(json.source, "pick-unit-fleet", "empty own lane must use the fleet fallback source");
  }
  assert.equal(json.rolled, false, "resolve-only never rolls");
  assert.equal(fs.existsSync(statePath(s)), false, "resolve-only must not write state for a fresh session");
});

// ── explicit --resume precedence is UNCHANGED by the fallback addition ──────────
test("--resume still wins over both own-lane and fleet (precedence 1 intact)", () => {
  const s = sid();
  const { json } = run(["next", "--session", s, "--slot", "zzznonexistent", "--resume", "do unit Q", "--resolve-only"]);
  assert.equal(json.nextTask, "do unit Q");
  assert.equal(json.source, "resume-flag", "explicit resume must short-circuit before pick-unit/fleet");
});

// ── source is one of the known honest sources — never fabricated ────────────────
test("resolved source is always a known honest source (never fabricated)", () => {
  const s = sid();
  const { json } = run(["next", "--session", s, "--slot", "zzznonexistent", "--resolve-only"]);
  assert.equal(json.ok, true);
  const KNOWN = ["resume-flag", "handoff-resume", "pick-unit", "pick-unit-fleet", "none"];
  assert.ok(KNOWN.includes(json.source), `source '${json.source}' must be a known honest source`);
  // If a task resolved, source must NOT be 'none'; if none, task must be empty.
  if (json.nextTask) assert.notEqual(json.source, "none");
  else assert.ok(json.source === "none" || json.exhausted, "no task ⇒ source none / exhausted");
});
