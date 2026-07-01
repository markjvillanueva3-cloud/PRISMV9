#!/usr/bin/env node
// tier: test
// Regression guard for the FLEET-WIDE loop-cap removal (operator 2026-06-16:
// "remove the iteration cap permanently for all galaxies"). A loop started with no
// --target must be UNBOUNDED (default huge target), while an explicit --target still
// opts into a finite bound. CLI round-trip (loop-state.mjs writes a state file).

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HELPER = fileURLToPath(new URL("./loop-state.mjs", import.meta.url));
const STATE_DIR = "H:/prism/state/shared/loop-state";

function run(args, env = {}) {
  const r = spawnSync(process.execPath, [HELPER, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  try { return JSON.parse(r.stdout.trim().split("\n").pop()); } catch { return { _raw: r.stdout, _err: r.stderr }; }
}
function cleanup(sid) {
  try { run(["end", "--session", sid, "--reason", "test-cleanup"]); } catch {}
  try { rmSync(join(STATE_DIR, `loop-${sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64)}.json`), { force: true }); } catch {}
}

test("loop with NO --target is unbounded (default 1e9, cap removed)", () => {
  const sid = "__test_uncapped__";
  try {
    const out = run(["start", "--session", sid, "--task", "t"]);
    assert.equal(out.ok, true);
    assert.equal(out.target, 1_000_000_000, "default target must be the unbounded sentinel, not 20");
  } finally { cleanup(sid); }
});

test("explicit --target still opts into a finite bound (back-compat)", () => {
  const sid = "__test_bounded__";
  try {
    const out = run(["start", "--session", sid, "--task", "t", "--target", "5"]);
    assert.equal(out.target, 5, "an explicit --target must be honored");
  } finally { cleanup(sid); }
});

test("PRISM_LOOP_DEFAULT_TARGET knob overrides the default", () => {
  const sid = "__test_knob__";
  try {
    const out = run(["start", "--session", sid, "--task", "t"], { PRISM_LOOP_DEFAULT_TARGET: "777" });
    assert.equal(out.target, 777, "the env knob must set the default when no --target is given");
  } finally { cleanup(sid); }
});

// maxRolls (roll-chain cap) -- UNBOUNDED fleet-wide (operator 2026-06-17).
// A roll resets per-unit iter, so maxRolls is the only count-based bound on how many
// UNITS a /loop auto-advances through. The default was 8 (hand back for a human
// checkpoint); the operator opted into auto-advance-forever for all galaxies, so the
// default is now unbounded (1e9) and PRISM_LOOP_MAX_ROLLS still re-imposes a finite bound.
function statePath(sid) {
  return join(STATE_DIR, `loop-${sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64)}.json`);
}
function seedRollsTotal(sid, n) {
  const p = statePath(sid);
  const s = JSON.parse(readFileSync(p, "utf-8"));
  s.rollsTotal = n;
  writeFileSync(p, JSON.stringify(s), "utf-8");
}

test("maxRolls default is UNBOUNDED -- 12 prior rolls do NOT trip the roll-cap", () => {
  const sid = "__test_rollcap_unbounded__";
  try {
    run(["start", "--session", sid, "--task", "t"]);
    seedRollsTotal(sid, 12); // > the old default cap of 8
    const out = run(["next", "--session", sid]);
    // With the old DEFAULT_MAX_ROLLS=8 this would short-circuit to source/reason "roll-cap".
    // Unbounded default => it must NOT roll-cap (it resolves/rolls or exhausts on no unit).
    assert.notEqual(out.source, "roll-cap", "12 rolls must NOT trip the unbounded default cap");
    assert.notEqual(out.reason, "roll-cap", "no roll-cap reason under the unbounded default");
  } finally { cleanup(sid); }
});

test("PRISM_LOOP_MAX_ROLLS still re-imposes a finite bound (knob honored)", () => {
  const sid = "__test_rollcap_knob__";
  try {
    run(["start", "--session", sid, "--task", "t"]);
    seedRollsTotal(sid, 12); // >= the knob bound below
    const out = run(["next", "--session", sid], { PRISM_LOOP_MAX_ROLLS: "5" });
    assert.equal(out.source, "roll-cap", "rollsTotal 12 >= PRISM_LOOP_MAX_ROLLS 5 must roll-cap");
    assert.equal(out.maxRolls, 5, "the capped output reports the honored knob value");
  } finally { cleanup(sid); }
});
