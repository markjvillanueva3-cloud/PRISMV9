// precompact-reentry.test.mjs -- buildReentryDirective contract (R9).
// The directive is the half that makes a synthesized RESUME non-stub: every
// auto-generated handoff ends with an actionable /loop /goal re-entry so the
// next session continues autonomous work instead of idling. Slot-keyed when
// known. These assert the EXACT strings (not toBeDefined) so a regression that
// drops the loop/goal directive -- the operator's "handoffs are stubs" bug --
// fails the test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReentryDirective } from "./precompact-handoff.mjs";

test("slot-known -> slot-keyed /startup + /loop [10m] /goal", () => {
  const d = buildReentryDirective("alpha");
  assert.match(d, /\/startup-alpha /);
  assert.match(d, /\/loop \[10m\] \/goal/);
  assert.match(d, /re-reads handoff \+ roadmap/);
});

test("slotless -> generic /loop /goal (still actionable, no bare slot)", () => {
  const d = buildReentryDirective("");
  assert.match(d, /\/loop \/goal/);
  assert.doesNotMatch(d, /\/startup-/); // no slot -> no /startup-<slot>
  assert.doesNotMatch(d, /-\s*\/loop/); // never emits a dangling `-` slot
});

test("normalizes case + whitespace to the canonical lowercase slot", () => {
  assert.match(buildReentryDirective("  BRAVO "), /\/startup-bravo /);
});

test("null / undefined / non-string degrade to the slotless directive", () => {
  for (const bad of [null, undefined, 42, {}]) {
    const d = buildReentryDirective(bad);
    assert.match(d, /\/loop \/goal/);
    assert.doesNotMatch(d, /\/startup-/);
  }
});

test("the directive is never empty and never a known placeholder", () => {
  // A stub is the failure mode; assert real content for both branches.
  for (const slot of ["", "charlie"]) {
    const d = buildReentryDirective(slot);
    assert.ok(d.length >= 30, `directive too short to be actionable: ${d}`);
    assert.doesNotMatch(d.toLowerCase(), /^check git log/);
    assert.match(d, /Re-enter autonomous work/);
  }
});
