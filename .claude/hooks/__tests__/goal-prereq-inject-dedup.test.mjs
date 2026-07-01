#!/usr/bin/env node
/**
 * Integration test for the loop-context dedup wired into goal-prereq-inject.mjs.
 *
 * The dedup *library* (scripts/lib/loop-inject-dedup.mjs) is unit-tested
 * separately; this oracle drives the REAL hook as a subprocess — the seam where
 * session_id extraction, the lazy import, the additionalContext swap, and the
 * fail-open catch actually live. Per the standing PRISM lesson: a pure-core +
 * injected-deps design MUST ship a real subprocess integration oracle.
 *
 * Run: node --test .claude/hooks/__tests__/goal-prereq-inject-dedup.test.mjs
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOOK = path.join(import.meta.dirname, "..", "goal-prereq-inject.mjs");
const PRISM_ROOT = path.join(import.meta.dirname, "..", "..", "..").replace(/\\/g, "/");

let tmpRoot; // isolates the dedup cache (state/shared/.loop-inject-cache/) per run

before(() => { tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "goal-prereq-dedup-")); });
after(() => { try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ } });

/** Fire the hook once; return {json, ctx} where ctx is the injected additionalContext (or ""). */
function fire(prompt, sessionId, extraEnv = {}) {
  const stdin = JSON.stringify({ prompt, session_id: sessionId, cwd: PRISM_ROOT });
  const r = spawnSync(process.execPath, [HOOK], {
    input: stdin, encoding: "utf8", cwd: PRISM_ROOT,
    timeout: 15000,
    env: { ...process.env, PRISM_ROOT: tmpRoot, ...extraEnv },
  });
  assert.equal(r.status, 0, `hook exited ${r.status}: ${r.stderr}`);
  let json;
  try { json = JSON.parse(r.stdout); }
  catch { assert.fail(`hook stdout was not valid JSON: ${r.stdout.slice(0, 200)}`); }
  const ctx = json?.hookSpecificOutput?.additionalContext ?? "";
  return { json, ctx };
}

const isDedupPointer = (s) => /loop-context dedup/.test(s);
const isFullPanel = (s) => /\/goal pre-flight/.test(s) && !isDedupPointer(s);

describe("goal-prereq-inject — loop-context dedup wiring", () => {
  it("emits the full /goal pre-flight panel on the first fire", () => {
    const { json, ctx } = fire("/goal complete the task", "fire1-sess");
    assert.equal(json.continue, true);
    assert.ok(isFullPanel(ctx), `expected full panel, got: ${ctx.slice(0, 120)}`);
  });

  it("emits a compact dedup pointer on an identical second fire (same session)", () => {
    const sid = "repeat-sess";
    const first = fire("/goal complete", sid);
    assert.ok(isFullPanel(first.ctx), "first fire should be the full panel");
    const second = fire("/goal complete", sid);
    assert.ok(isDedupPointer(second.ctx), `expected dedup pointer, got: ${second.ctx.slice(0, 120)}`);
    assert.ok(second.ctx.length < first.ctx.length, "pointer must be shorter than the panel");
    assert.equal(second.json.continue, true);
  });

  it("keeps emitting the full panel when PRISM_LOOP_INJECT_DEDUP_DISABLE=1", () => {
    const sid = "killknob-sess";
    const env = { PRISM_LOOP_INJECT_DEDUP_DISABLE: "1" };
    const first = fire("/goal complete", sid, env);
    const second = fire("/goal complete", sid, env);
    assert.ok(isFullPanel(first.ctx), "first fire full panel");
    assert.ok(isFullPanel(second.ctx), "kill-knob: second fire must STILL be the full panel");
  });

  it("does NOT dedup when stdin carries no session_id (fail-open to full panel)", () => {
    // session_id omitted -> dedup is skipped, full panel every time.
    const stdin = JSON.stringify({ prompt: "/goal complete", cwd: PRISM_ROOT });
    const run = () => {
      const r = spawnSync(process.execPath, [HOOK], {
        input: stdin, encoding: "utf8", cwd: PRISM_ROOT, timeout: 15000,
        env: { ...process.env, PRISM_ROOT: tmpRoot },
      });
      assert.equal(r.status, 0);
      return JSON.parse(r.stdout)?.hookSpecificOutput?.additionalContext ?? "";
    };
    assert.ok(isFullPanel(run()), "no session_id: first fire full panel");
    assert.ok(isFullPanel(run()), "no session_id: second fire must STILL be full (dedup skipped)");
  });

  it("injects nothing for a non-/goal prompt (trigger gate intact)", () => {
    const { json, ctx } = fire("just a normal prompt with no slash command", "nontrigger-sess");
    assert.equal(json.continue, true);
    assert.equal(ctx, "", "non-/goal prompt must not inject a panel");
  });

  // 2026-06-10 (operator: "make /goal force 100% full build, wired, tested,
  // validated and synergized... determine galaxy placement, auto-invocation,
  // domain-vs-fleet"). GOAL_DISCIPLINE rule 5 encodes that contract; this guard
  // fails loud if a future edit drops it (R9 — intent, not tautology).
  it("forces the R15 100%-completion contract on every /goal (rule 5)", () => {
    const { ctx } = fire("/goal build a new engine", "rule5-sess");
    assert.ok(isFullPanel(ctx), "rule 5 lives in the full panel");
    assert.match(ctx, /FORCE 100% COMPLETION/, "names the 100%-completion mandate");
    assert.match(ctx, /WIRE->TEST->VALIDATE->APPLY/, "cites the R15 chain");
    // The 4 operator-named determinations must all be present.
    assert.match(ctx, /GALAXY placement/, "determine galaxy placement");
    assert.match(ctx, /consumer NODES to actively wire\/bridge/, "determine consumer-node bridging");
    assert.match(ctx, /AUTO-INVOCATION/, "determine auto-invocation + when");
    assert.match(ctx, /DOMAIN-ONLY or FLEET\/ALL-GALAXY-WIDE/, "determine domain-vs-fleet scope");
  });

  it("rule 5 can be dropped via PRISM_GOAL_RULES_DISABLE without killing the panel", () => {
    const { ctx } = fire("/goal build", "rule5-off-sess", { PRISM_GOAL_RULES_DISABLE: "1" });
    assert.ok(isFullPanel(ctx), "panel still emits with the rules block off");
    assert.doesNotMatch(ctx, /FORCE 100% COMPLETION/, "rule block suppressed by the knob");
  });

  it("re-emits the full panel after the kill-knob is toggled back off", () => {
    // A session deduped while the knob was OFF, then DISABLE set -> full panel again.
    const sid = "toggle-sess";
    fire("/goal complete", sid);                                  // record
    assert.ok(isDedupPointer(fire("/goal complete", sid).ctx), "should dedup while enabled");
    const withKnob = fire("/goal complete", sid, { PRISM_LOOP_INJECT_DEDUP_DISABLE: "1" });
    assert.ok(isFullPanel(withKnob.ctx), "kill-knob must restore the full panel mid-session");
  });
});
