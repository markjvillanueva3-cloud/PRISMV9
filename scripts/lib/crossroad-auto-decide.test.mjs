/**
 * Tests for crossroad-auto-decide.mjs -- the safety-critical decide-vs-escalate guardrail.
 * Real-intent assertions (R9): the operator-only set MUST catch every irreversible/financial/
 * external/credential/safety/scope fork; the auto set MUST pass reversible/internal choices.
 * Run: node scripts/lib/crossroad-auto-decide.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyDecision, detectCrossroad, partitionForks } from "./crossroad-auto-decide.mjs";

// ---- classifyDecision: OPERATOR-ONLY (must escalate, never auto-decide) ----
test("operator-only: irreversible data ops escalate", () => {
  for (const t of ["delete the old records", "force-push to the branch", "rm -rf the cache", "overwrite the production config", "drop the table"]) {
    assert.equal(classifyDecision(t).operatorOnly, true, t);
  }
});
test("operator-only: financial decisions escalate", () => {
  for (const t of ["buy the laptop stand", "transfer money to the vendor", "set the pricing to the customer", "issue a refund"]) {
    assert.equal(classifyDecision(t).operatorOnly, true, t);
  }
});
test("operator-only: external-facing actions escalate", () => {
  for (const t of ["publish the post", "send the email to the client", "deploy to prod", "merge to main", "go live with the release"]) {
    assert.equal(classifyDecision(t).operatorOnly, true, t);
  }
});
test("operator-only: credentials/access escalate", () => {
  for (const t of ["rotate the api-key", "change the sharing settings", "grant access to the repo"]) {
    assert.equal(classifyDecision(t).operatorOnly, true, t);
  }
});
test("operator-only: safety/real-machine escalate", () => {
  for (const t of ["override a safety threshold", "ship the g-code to a real machine", "relax a tolerance gate"]) {
    assert.equal(classifyDecision(t).operatorOnly, true, t);
  }
});
test("operator-only: goal/scope changes escalate", () => {
  for (const t of ["change the goal to something else", "abandon the goal", "pivot the architecture", "rewrite from scratch"]) {
    assert.equal(classifyDecision(t).operatorOnly, true, t);
  }
});

// ---- classifyDecision: AUTO-DECIDABLE (decide + proceed) ----
test("auto-decidable: reversible/internal implementation choices", () => {
  for (const t of [
    "which algorithm to use for the cache (hash vs tree)",
    "what to name the new helper function",
    "which file structure for the module",
    "should the extractor process pages sequentially or in a window",
    "which of the three valid test strategies to write first",
    "build the engine before the dispatcher or after",
  ]) {
    assert.equal(classifyDecision(t).operatorOnly, false, t);
    assert.equal(classifyDecision(t).tier, "auto", t);
  }
});
test("auto-decidable: empty/null -> auto (nothing to escalate)", () => {
  assert.equal(classifyDecision("").operatorOnly, false);
  assert.equal(classifyDecision(null).operatorOnly, false);
  assert.equal(classifyDecision(undefined).operatorOnly, false);
});
test("classifyDecision returns a labelled reason for audit", () => {
  assert.match(classifyDecision("delete the file").reason, /irreversible-data/);
  assert.match(classifyDecision("rename the variable").reason, /auto-decidable/);
});

// ---- detectCrossroad ----
test("detectCrossroad: strategic either/or + how-to-proceed + ask-permission fire", () => {
  assert.equal(detectCrossroad("Should we go with option A vs option B here?").isCrossroad, true);
  assert.equal(detectCrossroad("How should we proceed with the migration?").isCrossroad, true);
  assert.equal(detectCrossroad("Should I wire it to prism_ai or prism_intelligence?").isCrossroad, true);
  assert.equal(detectCrossroad("which approach do you prefer").isCrossroad, true);
});
test("detectCrossroad: trivial lookups / statements do NOT fire", () => {
  assert.equal(detectCrossroad("the build passed with 0 errors").isCrossroad, false);
  assert.equal(detectCrossroad("reading the config file now").isCrossroad, false);
});

// ---- partitionForks: the decide-now vs escalate split ----
test("partitionForks: mixed list splits correctly", () => {
  const { decideNow, escalate } = partitionForks([
    "which naming convention for the new actions",   // auto
    "delete the deprecated engine files",            // operator-only (irreversible)
    "process catalogs alphabetically or by yield",   // auto
    "deploy the new gate to prod",                   // operator-only (external)
  ]);
  assert.equal(decideNow.length, 2);
  assert.equal(escalate.length, 2);
  assert.deepEqual(escalate.map((e) => e.tier).sort(), ["external-facing", "irreversible-data"]);
});
test("partitionForks: empty/non-array -> empty split (no throw)", () => {
  assert.deepEqual(partitionForks(null), { decideNow: [], escalate: [] });
  assert.deepEqual(partitionForks([]), { decideNow: [], escalate: [] });
});
