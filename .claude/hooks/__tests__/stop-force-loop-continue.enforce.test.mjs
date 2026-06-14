// stop-force-loop-continue.enforce.test.mjs
// Tests the AUTO-ENFORCE addition (operator directive 2026-06-11): the no-progress
// stuck-detector that bounds the block-to-continue so an active /loop is forced onward
// while iter advances, but a WEDGED loop is released instead of spun forever.
// R9: pins the SAFETY intent (never infinite-block) + the continue-directive content.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { progressGate, blockReason } from "../stop-force-loop-continue.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "force-loop-"));
}

test("progressGate: first call on a fresh loop counts as progress (iter > -1)", () => {
  const dir = tmpDir();
  try {
    const g = progressGate("claude-aaaa1111", 0, dir);
    assert.equal(g.noProgress, 0);
    assert.equal(g.stuck, false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("progressGate: advancing iter keeps noProgress at 0 (healthy loop never trips stuck)", () => {
  const dir = tmpDir();
  try {
    for (let i = 0; i < 6; i++) {
      const g = progressGate("claude-bbbb2222", i, dir);
      assert.equal(g.noProgress, 0, `iter ${i} should be progress`);
      assert.equal(g.stuck, false);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("progressGate: a STALLED iter increments noProgress and becomes stuck at the limit (default 3)", () => {
  const dir = tmpDir();
  try {
    const sid = "claude-cccc3333";
    assert.equal(progressGate(sid, 5, dir).noProgress, 0); // first sight = progress
    assert.equal(progressGate(sid, 5, dir).noProgress, 1); // stalled
    assert.equal(progressGate(sid, 5, dir).noProgress, 2);
    const g = progressGate(sid, 5, dir);                   // 3rd stall -> stuck
    assert.equal(g.noProgress, 3);
    assert.equal(g.stuck, true, "wedged loop must be released at STUCK_LIMIT");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("progressGate: making progress after stalls RESETS the no-progress counter", () => {
  const dir = tmpDir();
  try {
    const sid = "claude-dddd4444";
    progressGate(sid, 2, dir);                 // progress
    assert.equal(progressGate(sid, 2, dir).noProgress, 1); // stall
    assert.equal(progressGate(sid, 2, dir).noProgress, 2); // stall
    const g = progressGate(sid, 3, dir);       // iter advanced -> reset
    assert.equal(g.noProgress, 0);
    assert.equal(g.stuck, false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("progressGate: corrupt stamp is fail-soft (treated as fresh, not a throw)", () => {
  const dir = tmpDir();
  try {
    const sid = "claude-eeee5555";
    fs.writeFileSync(path.join(dir, `${sid}.progress`), "{ not json");
    const g = progressGate(sid, 7, dir);
    assert.equal(g.noProgress, 0);
    assert.equal(g.stuck, false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("blockReason: states remaining iters, the task, and the tick instruction", () => {
  const r = blockReason({ iter: 3, target: 10, task: "fix auth tests" });
  assert.ok(r.includes("3/10"), "shows iter/target");
  assert.ok(r.includes("7 remaining"), "shows remaining count");
  assert.ok(r.includes("fix auth tests"), "names the task");
  assert.ok(/tick/i.test(r), "instructs to tick loop-state");
  assert.ok(/loop-state\.mjs end/.test(r), "offers an abandon escape hatch");
});

test("blockReason: tolerates a missing task field", () => {
  const r = blockReason({ iter: 0, target: 5 });
  assert.ok(r.includes("0/5"));
  assert.ok(r.includes("the task"), "falls back to a generic task label");
});
