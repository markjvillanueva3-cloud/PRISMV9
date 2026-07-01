// tier: T3
/**
 * .claude/helpers/loop-state-next.test.mjs
 *
 * Hermetic tests for the `next` command (U-LOOP-AUTO-ADVANCE) added to
 * loop-state.mjs — the autonomous loop-advance that resolves the NEXT unit so a
 * /loop continues instead of ending and waiting for a human "continue" prompt.
 *
 * Drives the real CLI as a subprocess against throwaway session ids. Every test
 * uses `--resume "<...>"` (the deterministic, dependency-free precedence-1
 * source) for the roll mechanics, plus a `--resolve-only` exhaustion guard. The
 * handoff-resume and pick-unit precedence paths shell out to live helpers, so
 * they are asserted only at the contract level (resolve-only, no state mutation).
 *
 * Run: node --test .claude/helpers/loop-state-next.test.mjs
 */

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "loop-state.mjs");
const STATE_DIR = path.join("H:", "prism", "state", "shared", "loop-state");

// Unique-ish session ids per test run (no Date.now in module scope — use pid+counter).
let counter = 0;
const SESSIONS = [];
function sid() {
  const s = `test-lsnext-${process.pid}-${counter++}`;
  SESSIONS.push(s);
  return s;
}

function run(args, env) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf-8", timeout: 40000,
    env: { ...process.env, ...(env || {}) },
  });
  // CLI prints one JSON line on stdout for these commands.
  const line = (r.stdout || "").trim().split("\n").filter(Boolean).pop() || "{}";
  return { json: JSON.parse(line), status: r.status, raw: r.stdout };
}
// Force the roadmap pick to return nothing → exhaustion is deterministic.
const NO_PICKUNIT = { PRISM_LOOP_NEXT_NO_PICKUNIT: "1" };

function statePath(s) {
  const safe = String(s).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  return path.join(STATE_DIR, `loop-${safe}.json`);
}

afterEach(() => {
  for (const s of SESSIONS.splice(0)) {
    try { fs.unlinkSync(statePath(s)); } catch { /* not created */ }
  }
});

// ── precedence 1: explicit --resume flag wins ────────────────────────────────
test("resolve-only: --resume flag is the resolved nextTask (source resume-flag)", () => {
  const s = sid();
  const { json } = run(["next", "--session", s, "--resume", "do unit Z", "--resolve-only"]);
  assert.equal(json.ok, true);
  assert.equal(json.nextTask, "do unit Z");
  assert.equal(json.source, "resume-flag");
  assert.equal(json.exhausted, false);
  assert.equal(json.rolled, false);
  // resolve-only must NOT create state.
  assert.equal(fs.existsSync(statePath(s)), false, "resolve-only must not write state");
});

// ── U-HANDOFF-READ-SLOT-AWARE consumer fix (2026-06-18, slot:alpha) ──────────
// handoffResume() gates on HANDOFF_OWN_MATCH. The slot-aware read tier in
// per-agent-handoff.mjs returns matchedBy:"same-instance-current-slot"; if that
// label is missing from the allowlist, /loop silently drops the chat's OWN
// resume directive and falls through to pick-unit -- breaking auto-resume for
// any terminal that churned slots. This drives the REAL CLI through the live
// per-agent-handoff helper against a hermetic handoffs dir + chat-slots fixture.
test("handoff-resume accepts a same-instance-current-slot match (not fall-through)", () => {
  const s = sid();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prism-lsnext-curslot-"));
  const hdir = path.join(root, "handoffs");
  fs.mkdirSync(hdir, { recursive: true });
  const term = "claude-lsn1cur";
  // This terminal currently OWNS alpha (chat-slots ground truth lives one level
  // up from the handoffs dir, matching per-agent-handoff.chatSlotsPath()).
  fs.writeFileSync(path.join(root, "chat-slots.json"),
    JSON.stringify({ schemaVersion: 1, slots: { alpha: { chatId: term } } }));
  const mkHandoff = (name, slot, topic, resume, ageSec) => {
    const fp = path.join(hdir, name);
    fs.writeFileSync(fp, `---\nsession: ${term}\ntopic: ${topic}\nslot: ${slot}\n---\n\n## RESUME\n${resume}\n\n## CONTEXT\n`);
    if (ageSec) { const t = new Date(Date.now() - ageSec * 1000); fs.utimesSync(fp, t, t); }
  };
  // PAPA handoff -- NEWER (the churned-away stale one a slot-blind read would pick).
  mkHandoff(`HANDOFF-${term}-papa-work.md`, "papa", "papa-work", "PAPA stale resume", 0);
  // ALPHA handoff -- OLDER (the chat's CURRENT slot -> what resume must pick).
  mkHandoff(`HANDOFF-${term}-alpha-x.md`, "alpha", "alpha-x", "ALPHA-RESUME-OK", 1000);
  try {
    const { json } = run(["next", "--session", s, "--terminal", term, "--resolve-only"],
      { PRISM_HANDOFFS_DIR: hdir, ...NO_PICKUNIT });
    assert.equal(json.ok, true);
    assert.equal(json.source, "handoff-resume",
      "must accept the same-instance-current-slot match, not drop it and fall through to pick-unit");
    assert.match(json.nextTask, /ALPHA-RESUME-OK/, "resumed the CURRENT-slot (alpha) handoff");
    assert.doesNotMatch(json.nextTask, /PAPA stale resume/, "must NOT resume the newer cross-slot papa handoff");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ── roll: end current + start next in one call ───────────────────────────────
test("roll: next ends the current loop and starts fresh on the resolved task", () => {
  const s = sid();
  run(["start", "--session", s, "--task", "unit A", "--target", "5"]);
  run(["tick", "--session", s, "--status", "ok", "--note", "did A"]);
  const { json } = run(["next", "--session", s, "--resume", "unit B"]);
  assert.equal(json.rolled, true);
  assert.equal(json.nextTask, "unit B");
  assert.equal(json.prevIters, 1, "prevIters carries the finished loop's iter count");

  const st = JSON.parse(fs.readFileSync(statePath(s), "utf-8"));
  assert.equal(st.task, "unit B", "rolled state task is the next unit");
  assert.equal(st.iter, 0, "rolled state resets the iter counter");
  assert.equal(st.status, "running", "rolled state is running, not ended");
  assert.equal(st.rolledFrom.task, "unit A", "rolledFrom preserves the prior task");
  assert.equal(st.rolledFrom.iters, 1, "rolledFrom preserves the prior iter count");
  assert.equal(st.advanceSource, "resume-flag");
});

// ── roll preserves target when not overridden ────────────────────────────────
test("roll: target carries over from the prior loop unless --target overrides", () => {
  const s = sid();
  run(["start", "--session", s, "--task", "A", "--target", "7"]);
  const carry = run(["next", "--session", s, "--resume", "B"]);
  assert.equal(carry.json.rolled, true);
  let st = JSON.parse(fs.readFileSync(statePath(s), "utf-8"));
  assert.equal(st.target, 7, "target inherited from prior loop");

  run(["next", "--session", s, "--resume", "C", "--target", "12"]);
  st = JSON.parse(fs.readFileSync(statePath(s), "utf-8"));
  assert.equal(st.target, 12, "explicit --target overrides the inherited target");
});

// ── exhaustion: ALL sources empty → honest stop + loop ENDS (deterministic) ──
test("exhausted: no --resume/--terminal + pick-unit seam off → exhausted:true and the loop ends", () => {
  const s = sid();
  run(["start", "--session", s, "--task", "A", "--target", "3"]);
  // No --resume, no --terminal, and the pick-unit seam returns nothing → the
  // ONLY honest outcome is exhausted. This deterministically exercises the
  // exhaustion-ends-loop branch (the live roadmap's hundreds of units otherwise
  // make real exhaustion unreachable — the old conditional test was a tautology).
  const { json } = run(["next", "--session", s], NO_PICKUNIT);
  assert.equal(json.ok, true);
  assert.equal(json.exhausted, true, "no source ⇒ exhausted");
  assert.equal(json.nextTask, "");
  assert.equal(json.rolled, false);
  // A real (non-dry-run) exhaustion ends the loop.
  const st = JSON.parse(fs.readFileSync(statePath(s), "utf-8"));
  assert.equal(st.status, "ended", "exhaustion ends the loop");
  assert.match(String(st.endReason), /exhausted/);
});

// ── resolve-only + exhausted MUST NOT mutate (the dry-run contract) ──────────
test("resolve-only on an exhausted session is a TRUE dry-run — does NOT end the loop", () => {
  const s = sid();
  run(["start", "--session", s, "--task", "A", "--target", "3"]);
  const { json } = run(["next", "--session", s, "--resolve-only"], NO_PICKUNIT);
  assert.equal(json.exhausted, true);
  assert.equal(json.rolled, false);
  const st = JSON.parse(fs.readFileSync(statePath(s), "utf-8"));
  assert.equal(st.status, "running", "resolve-only must NOT end the loop even when exhausted");
});

// ── P0 roll-cap: auto-advance is BOUNDED, never the whole roadmap unattended ─
test("roll-cap: refuses to roll past PRISM_LOOP_MAX_ROLLS (exhausted + reason roll-cap)", () => {
  const s = sid();
  run(["start", "--session", s, "--task", "A", "--target", "5"]);
  // Cap at 2 rolls. Roll twice (always resolvable via --resume), the 3rd must cap.
  let r = run(["next", "--session", s, "--resume", "B"], { PRISM_LOOP_MAX_ROLLS: "2" });
  assert.equal(r.json.rolled, true); assert.equal(r.json.rollsTotal, 1);
  r = run(["next", "--session", s, "--resume", "C"], { PRISM_LOOP_MAX_ROLLS: "2" });
  assert.equal(r.json.rolled, true); assert.equal(r.json.rollsTotal, 2);
  // 3rd: rollsSoFar(2) >= cap(2) → capped, even though "D" is resolvable.
  r = run(["next", "--session", s, "--resume", "D"], { PRISM_LOOP_MAX_ROLLS: "2" });
  assert.equal(r.json.rolled, false, "must NOT roll past the cap");
  assert.equal(r.json.exhausted, true);
  assert.equal(r.json.source, "roll-cap");
  assert.equal(r.json.reason, "roll-cap");
  const st = JSON.parse(fs.readFileSync(statePath(s), "utf-8"));
  assert.equal(st.status, "ended", "roll-cap ends the loop for a human checkpoint");
  assert.match(String(st.endReason), /roll-cap/);
});

// ── P1 handoff contamination: a non-matching terminal must NOT inherit a peer's RESUME ─
test("handoff fail-soft: a bogus --terminal does not return a peer slot's RESUME (falls through)", () => {
  const s = sid();
  // Bogus terminal → per-agent-handoff may family-fallback to a PEER handoff.
  // handoffResume must reject any non-own-instance match. With the pick-unit seam
  // off too, the only honest result is exhausted (NOT a peer's next-action line).
  const { json } = run(
    ["next", "--session", s, "--terminal", "totally-bogus-terminal-xyz-999", "--resolve-only"],
    NO_PICKUNIT,
  );
  assert.equal(json.ok, true);
  assert.notEqual(json.source, "handoff-resume", "must NOT inherit a cross-session handoff");
  assert.equal(json.exhausted, true, "bogus terminal + no pickunit ⇒ exhausted, not peer work");
});

// ── resolve-only never mutates a running loop ────────────────────────────────
test("resolve-only: a running loop is untouched (no roll, no end)", () => {
  const s = sid();
  run(["start", "--session", s, "--task", "keepme", "--target", "9"]);
  run(["tick", "--session", s, "--status", "ok"]);
  run(["next", "--session", s, "--resume", "would-be-next", "--resolve-only"]);
  const st = JSON.parse(fs.readFileSync(statePath(s), "utf-8"));
  assert.equal(st.task, "keepme", "resolve-only leaves the task unchanged");
  assert.equal(st.iter, 1, "resolve-only leaves the iter counter unchanged");
  assert.equal(st.status, "running", "resolve-only leaves status running");
});

// ── --session is required (fail-loud) ────────────────────────────────────────
test("next without --session fails loud (R12)", () => {
  const { json, status } = run(["next", "--resume", "x"]);
  assert.equal(json.ok, false);
  assert.match(String(json.error), /--session required/);
  assert.notEqual(status, 0);
});
