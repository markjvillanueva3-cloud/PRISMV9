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

import { progressGate, blockReason, upsertResumeBlock, spiralReleaseReason } from "../stop-force-loop-continue.mjs";

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

// U-FORCE-LOOP-STUCK-PICKER (alpha 2026-06-21): the high-water + task-aware fix. Each of
// these FAILS under the old lastIter logic (which read any iter increase as progress and so
// never tripped stuck on a picker-roll that resets iter). Ref:
// reference_force_loop_continue_stuck_picker_livelock_2026_06_21.

test("progressGate: same-task iter climbing BELOW the high-water is a STALL, not progress (the stuck-picker bug oracle)", () => {
  const dir = tmpDir();
  try {
    const sid = "claude-stuck0001";
    assert.equal(progressGate(sid, 3, dir, "U-NN-TIER05").noProgress, 0); // first sight, high-water=3
    assert.equal(progressGate(sid, 1, dir, "U-NN-TIER05").noProgress, 1); // picker roll reset iter -> stall
    // 2 > 1 (prev iter) but 2 <= 3 (high-water): OLD lastIter logic called this PROGRESS; the fix calls it a STALL.
    assert.equal(progressGate(sid, 2, dir, "U-NN-TIER05").noProgress, 2);
    const g = progressGate(sid, 0, dir, "U-NN-TIER05");                   // another roll-reset -> 3rd stall
    assert.equal(g.noProgress, 3);
    assert.equal(g.stuck, true, "a stuck-picker loop (same task, iter oscillating below high-water) MUST be released");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("progressGate: a healthy MULTI-UNIT loop (distinct task each roll, iter resets to 0) NEVER false-releases", () => {
  const dir = tmpDir();
  try {
    const sid = "claude-multi0002";
    assert.equal(progressGate(sid, 2, dir, "UNIT-A").noProgress, 0);  // unit A reached iter 2
    // each new unit's iter resets to 0 (< the prior high-water) but the TASK changed = real progress:
    assert.equal(progressGate(sid, 0, dir, "UNIT-B").noProgress, 0, "task change resets the high-water");
    assert.equal(progressGate(sid, 0, dir, "UNIT-C").noProgress, 0);
    assert.equal(progressGate(sid, 1, dir, "UNIT-C").noProgress, 0, "same task, iter beyond its fresh high-water");
    const g = progressGate(sid, 0, dir, "UNIT-D");
    assert.equal(g.noProgress, 0);
    assert.equal(g.stuck, false, "a productive multi-unit loop must never be wedge-released");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("progressGate: 3-arg back-compat (no task) STILL detects a reset-stall via the high-water", () => {
  const dir = tmpDir();
  try {
    const sid = "claude-compat0003";
    assert.equal(progressGate(sid, 5, dir).noProgress, 0);          // high-water=5
    assert.equal(progressGate(sid, 3, dir).noProgress, 1);          // reset below high-water -> stall
    // 4 > 3 (prev) but 4 <= 5 (high-water): OLD logic = progress; fix = stall (this is the single-task reset case).
    assert.equal(progressGate(sid, 4, dir).noProgress, 2);
    const g = progressGate(sid, 2, dir);
    assert.equal(g.stuck, true, "even without a task, a single-task loop whose iter never re-exceeds the high-water is wedged");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("progressGate: a pre-fix {lastIter,...} stamp migrates (lastIter seeds the high-water)", () => {
  const dir = tmpDir();
  try {
    const sid = "claude-migrate0004";
    fs.mkdirSync(dir, { recursive: true });
    // simulate an old stamp written by the pre-fix code
    fs.writeFileSync(path.join(dir, `${sid}.progress`), JSON.stringify({ lastIter: 8, noProgress: 0 }));
    // iter 4 is below the migrated high-water (8) -> must be a stall, not a fresh-progress reset
    const g = progressGate(sid, 4, dir, "U-NN-TIER05");
    assert.equal(g.noProgress, 1, "old lastIter=8 must seed maxIter so iter=4 is correctly a stall");
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

// --- spiralReleaseReason: the U-LOOP-SPIRAL-GATE consumer (within-unit failing-streak stop) ---
// loop-state.mjs cmdTick flips status to "spiral" on a critical consecutive-eval-FAILURE streak.
// This hook RELEASES such a loop (never force-continues it) with an explicit reason. R9: these FAIL
// if the consumer regresses to ignore the spiral status, or stops citing the spiralReason / recovery.
test("spiralReleaseReason: a status='spiral' loop -> explicit release reason citing spiralReason + R6 recovery", () => {
  const r = spiralReleaseReason({ status: "spiral", spiralReason: "27 consecutive failing iterations (>= PRISM_LOOP_SPIRAL_FAILS=25)" });
  assert.equal(typeof r, "string");
  assert.match(r, /SPIRAL/, "names the spiral stop");
  assert.match(r, /27 consecutive failing iterations/, "carries the loop-state spiralReason verbatim");
  assert.match(r, /restart the APPROACH/, "R6 recovery: restart approach, not goal");
  assert.match(r, /end --session/, "offers the abandon escape hatch");
});
test("spiralReleaseReason: a running loop -> null (do NOT release a healthy loop here)", () => {
  assert.equal(spiralReleaseReason({ status: "running", iter: 5, target: 100 }), null);
});
test("spiralReleaseReason: null / missing status / other terminal status -> null (fail-soft, spiral-only)", () => {
  assert.equal(spiralReleaseReason(null), null);
  assert.equal(spiralReleaseReason({}), null);
  assert.equal(spiralReleaseReason({ status: "ended" }), null);
  assert.equal(spiralReleaseReason({ status: "abandoned" }), null);
});
test("spiralReleaseReason: spiral with NO spiralReason -> honest generic fallback (never empty)", () => {
  const r = spiralReleaseReason({ status: "spiral" });
  assert.match(r, /consecutive failing iterations/, "falls back to a generic-but-honest reason");
});

// --- upsertResumeBlock: the m-flag hybrid-replace fix (RESUME_LOOP idempotency) ---
// The prior regex carried the `m` flag, so `$` in the lookahead `(?=\n##\s|$)` matched
// end-of-LINE and the lazy `[\s\S]*?` stopped at the first newline -> only the marker header
// was replaced, leaving the rest of the OLD block as a hybrid old+new corruption. R9: these
// FAIL against the m-flagged regex and pass once it is removed.
const MARK = "## RESUME_LOOP";
const NEWBLOCK = `\n\n${MARK}\n\nNEW DIRECTIVE line1\nNEW line2\n`;
const countMarks = (s) => (s.match(/## RESUME_LOOP/g) || []).length;

test("upsertResumeBlock: appends a fresh block when none exists", () => {
  const out = upsertResumeBlock("# Handoff\n\nbody\n", NEWBLOCK);
  assert.ok(out.includes("NEW DIRECTIVE line1"));
  assert.equal(countMarks(out), 1, "exactly one RESUME_LOOP block");
});

test("upsertResumeBlock: FULLY replaces a MULTI-LINE prior block (no hybrid old+new) -- the m-flag bug", () => {
  const prior = `# Handoff\n\nbody\n\n${MARK}\n\nOLD line A\nOLD line B\nOLD line C\n`;
  const out = upsertResumeBlock(prior, NEWBLOCK);
  assert.equal(countMarks(out), 1, "exactly one RESUME_LOOP block (m-flag bug left two header fragments)");
  assert.ok(!out.includes("OLD line A"), "old block line A removed");
  assert.ok(!out.includes("OLD line B"), "old block line B removed (the m-flag bug left these mid-block lines)");
  assert.ok(!out.includes("OLD line C"), "old block line C removed");
  assert.ok(out.includes("NEW DIRECTIVE line1") && out.includes("NEW line2"), "new block fully present");
});

test("upsertResumeBlock: replaces the prior block but PRESERVES a following ## section", () => {
  const prior = `# Handoff\n\n${MARK}\n\nOLD line A\nOLD line B\n\n## OTHER SECTION\n\nkeep me\n`;
  const out = upsertResumeBlock(prior, NEWBLOCK);
  assert.ok(!out.includes("OLD line A"), "old RESUME_LOOP content removed");
  assert.ok(out.includes("## OTHER SECTION") && out.includes("keep me"), "following section preserved");
  assert.equal(countMarks(out), 1);
});

test("upsertResumeBlock: idempotent -- replacing twice is stable (one block, no growth)", () => {
  const once = upsertResumeBlock(`# H\n\n${MARK}\n\nOLD\n`, NEWBLOCK);
  const twice = upsertResumeBlock(once, NEWBLOCK);
  assert.equal(twice, once, "second upsert is stable");
  assert.equal(countMarks(twice), 1);
});

test("upsertResumeBlock: marker is NEVER glued onto prior content -- own-line heading (line-scanner invariant)", () => {
  // The fragile `\n*`+trimStart regex variant produced `...body text## RESUME_LOOP` (3-of-3 P1);
  // the line-scanner must keep the marker on its own line on BOTH the replace and append paths.
  const replaced = upsertResumeBlock(`# H\n\nbody text\n\n${MARK}\n\nOLD\n`, NEWBLOCK);
  assert.doesNotMatch(replaced, /\S## RESUME_LOOP/, "replace path: marker not glued to prior line");
  const appended = upsertResumeBlock(`# H\n\nbody text\n`, NEWBLOCK);
  assert.doesNotMatch(appended, /\S## RESUME_LOOP/, "append path: marker not glued to prior line");
  assert.ok(replaced.includes("body text") && appended.includes("body text"), "prior content preserved intact");
});

test("upsertResumeBlock: strips MULTIPLE stale blocks down to one (two-blocks case)", () => {
  const prior = `# H\n\n${MARK}\n\nfirst stale\n\n${MARK}\n\nsecond stale\n`;
  const out = upsertResumeBlock(prior, NEWBLOCK);
  assert.equal(countMarks(out), 1, "both stale blocks collapsed to exactly one");
  assert.ok(!out.includes("first stale") && !out.includes("second stale"), "all stale bodies removed");
});
