// tier: T0
// Tests for fork-storm-circuit-breaker.mjs (GOLF-FLEET-HYGIENE / U-FORKSTORM-BREAKER).
// Real behavior checks: the breaker must BLOCK a spawning tool at/above the live-bash ceiling and
// FAIL-OPEN on every uncertainty. Each assertion fails if the gating logic regresses (R9).
//   run: node --test H:/prism/.claude/hooks/fork-storm-circuit-breaker.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideBreaker, liveBashCount } from "./fork-storm-circuit-breaker.mjs";

const base = { ceiling: 400, disabled: false, scoped: false };

test("BLOCK: Bash at/above ceiling (the storm case)", () => {
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: 500 }).action, "block");
});

test("ALLOW: Bash comfortably under ceiling (normal busy fleet)", () => {
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: 113 }).action, "allow");
});

test("BOUNDARY: >= ceiling blocks, ceiling-1 allows", () => {
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: 400 }).action, "block");
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: 399 }).action, "allow");
});

test("Workflow trips EARLY at 0.7x ceiling (it fans out hard)", () => {
  // floor(400*0.7)=280. 300 blocks a Workflow but a Bash is still allowed at 300.
  assert.equal(decideBreaker({ ...base, tool: "Workflow", bashCount: 300, wfFactor: 0.7 }).action, "block");
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: 300 }).action, "allow");
  assert.equal(decideBreaker({ ...base, tool: "Workflow", bashCount: 279, wfFactor: 0.7 }).action, "allow");
});

test("Agent is gated too (the burst that 429'd this very session)", () => {
  assert.equal(decideBreaker({ ...base, tool: "Agent", bashCount: 500 }).action, "block");
});

test("FAIL-OPEN: disabled -> allow even far over ceiling", () => {
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: 9999, disabled: true }).action, "allow");
});

test("OVERRIDE: [SCOPED]/--force-spawn (scoped=true) -> allow over ceiling", () => {
  assert.equal(decideBreaker({ ...base, tool: "Workflow", bashCount: 9999, scoped: true }).action, "allow");
});

test("ALLOW: lighter tools are never gated (session stays usable during a storm)", () => {
  for (const tool of ["Read", "Edit", "Grep", "Glob", "Write"]) {
    assert.equal(decideBreaker({ ...base, tool, bashCount: 9999 }).action, "allow", `${tool} must not be gated`);
  }
});

test("FAIL-OPEN: unknown count (-1 from a tasklist failure) -> allow", () => {
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: -1 }).action, "allow");
});

test("FAIL-OPEN: NaN / undefined / non-number count -> allow", () => {
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: NaN }).action, "allow");
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: undefined }).action, "allow");
  assert.equal(decideBreaker({ ...base, tool: "Bash", bashCount: "lots" }).action, "allow");
});

test("FAIL-SAFE: a non-positive ceiling falls back to the 400 default (still blocks at 500)", () => {
  assert.equal(decideBreaker({ tool: "Bash", bashCount: 500, ceiling: 0, disabled: false, scoped: false }).action, "block");
});

test("liveBashCount smoke: returns a number, either -1 or a non-negative count", () => {
  const n = liveBashCount({ ttlMs: 0 });
  assert.ok(typeof n === "number");
  assert.ok(n === -1 || n >= 0);
});
