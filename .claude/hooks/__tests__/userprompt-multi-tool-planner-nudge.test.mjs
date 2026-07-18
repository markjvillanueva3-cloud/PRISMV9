// U-PSN-MULTI-TOOL-PLANNER (gap-C1, 2026-05-23, slot:alpha)
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreMultiToolPrompt, formatPlannerNudge } from "../userprompt-multi-tool-planner-nudge.mjs";

test("scoreMultiToolPrompt: 'for each engine, run X' → high score", () => {
  assert.ok(scoreMultiToolPrompt("for each engine, verify wiring") >= 2);
});

test("scoreMultiToolPrompt: 'ship all remaining unwired engines' → high score", () => {
  assert.ok(scoreMultiToolPrompt("ship all remaining unwired engines wired to dispatchers") >= 2);
});

test("scoreMultiToolPrompt: 'audit the entire codebase' → high score", () => {
  assert.ok(scoreMultiToolPrompt("audit the entire codebase for fake actions") >= 2);
});

test("scoreMultiToolPrompt: 'check each file' → mid score", () => {
  assert.ok(scoreMultiToolPrompt("check each file in the directory") >= 1);
});

test("scoreMultiToolPrompt: '50 of files need refactor' → high score (numeric)", () => {
  assert.ok(scoreMultiToolPrompt("50 of files need refactor") >= 2);
});

test("scoreMultiToolPrompt: 'dozens of engines to wire' → high score", () => {
  assert.ok(scoreMultiToolPrompt("dozens of engines to wire today") >= 2);
});

test("scoreMultiToolPrompt: small task prompt → score 0", () => {
  assert.equal(scoreMultiToolPrompt("fix the typo in line 42"), 0);
  assert.equal(scoreMultiToolPrompt("what's 2+2"), 0);
});

test("scoreMultiToolPrompt: empty / null returns 0", () => {
  assert.equal(scoreMultiToolPrompt(""), 0);
  assert.equal(scoreMultiToolPrompt(null), 0);
  assert.equal(scoreMultiToolPrompt(undefined), 0);
  assert.equal(scoreMultiToolPrompt(42), 0);
});

test("formatPlannerNudge: high-score prompt → nudge emitted", () => {
  const n = formatPlannerNudge("ship all remaining unwired engines for each domain");
  assert.ok(n !== null);
  // Real nudge text says "dispatching a single Agent"; assertion verifies
  // the semantic contract (Agent-based dispatch suggestion) without locking
  // exact wording.
  assert.ok(/Agent/.test(n) && /dispatch/i.test(n));
  assert.ok(n.includes("subagent_type"));
  assert.ok(n.includes("isolation"));
});

test("formatPlannerNudge: small task → null", () => {
  assert.equal(formatPlannerNudge("fix typo"), null);
});

test("formatPlannerNudge: custom threshold honored", () => {
  // Single-weight match (score=1); below default threshold (2), above threshold=1.
  assert.equal(formatPlannerNudge("check each file", { threshold: 2 }), null);
  assert.ok(formatPlannerNudge("check each file", { threshold: 1 }) !== null);
});

test("formatPlannerNudge: includes kill-switch reference", () => {
  const n = formatPlannerNudge("audit the entire repo");
  assert.ok(n.includes("PRISM_MULTI_TOOL_PLANNER_DISABLE"));
});

test("formatPlannerNudge: surfaces score in advisory", () => {
  const n = formatPlannerNudge("audit the entire codebase for fake actions");
  // The text says "Pattern score: N/2 threshold" so N should appear
  assert.ok(/score:\s*\d/.test(n));
});
