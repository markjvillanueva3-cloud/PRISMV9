// Tests for task-substrate-router.mjs (U2). Real values; every assertion fails on
// a real routing regression (R9). routeTask is pure (its deps are pure imports).
import { test } from "node:test";
import assert from "node:assert/strict";
import { routeTask } from "./task-substrate-router.mjs";
import { routeForgePhase, forgeConcurrencyCap } from "./forge-route.mjs";

const names = (r) => r.substrates.map((s) => s.name);

// ---- all 5 rows when ctx carries the Hermes scale hints ----
test("all 5 substrates present when ctx is fully populated", () => {
  const r = routeTask("backend-dev", "design", { itemCount: 20, openEnded: true, needsVerification: true, cores: 32 });
  assert.deepEqual(names(r), ["ollama", "obsidian", "hermes", "master-graph", "psn"]);
  assert.equal(r.hermesGated, true);
});

// ---- Hermes row degrades away without scale hints (documented 5->4) ----
test("Hermes row ABSENT for a trivial task with no scale hints (matrix 5->4)", () => {
  const r = routeTask("docstring", "summarize", { itemCount: 1, cores: 32 });
  assert.equal(r.hermesGated, false);
  assert.ok(!names(r).includes("hermes"));
  assert.equal(r.substrates.length, 4);
});

// ---- Ollama lane matches the single-owner forge-route taxonomy (no re-derivation) ----
test("primary for a mechanical phase == routeForgePhase lane (taxonomy not re-derived)", () => {
  const route = routeForgePhase("summarize");
  const r = routeTask("x", "summarize", {});
  assert.equal(route.mechanical, true);
  assert.equal(r.primary.executor, route.lane); // ollama/vllm, whatever forge-route says
});
test("primary for a reasoning phase routes to Claude opus (reserved tier)", () => {
  const route = routeForgePhase("design");
  assert.equal(route.mechanical, false);
  assert.equal(route.claudeModel, "opus");
  const r = routeTask("x", "design", {});
  assert.equal(r.primary.executor, "claude");
  assert.equal(r.primary.model, "opus");
});

// ---- concurrency cap is correct when cores passed (the 2.7x under-report fix) ----
test("concurrencyCap == 16 on a 32-thread host (cores threaded through)", () => {
  const r = routeTask("x", "scout", { itemCount: 50, cores: 32 });
  assert.equal(r.concurrencyCap, 16);
  assert.equal(r.concurrencyCap, forgeConcurrencyCap({ cores: 32 }));
});
test("concurrencyCap floors to forge-route default when cores absent", () => {
  const r = routeTask("x", "scout", { itemCount: 50 });
  assert.equal(r.concurrencyCap, forgeConcurrencyCap({})); // 6
});

// ---- robustness ----
test("unknown phase falls back to forge-route's 'summary' default, never throws", () => {
  const r = routeTask("x", "not-a-real-phase", {});
  assert.equal(r.phase, "not-a-real-phase");
  assert.ok(r.substrates.length >= 4);
});
test("empty/degenerate input never throws and always yields the 4 base substrates", () => {
  const r = routeTask();
  assert.ok(["ollama", "obsidian", "master-graph", "psn"].every((n) => names(r).includes(n)));
});
test("openEnded alone (no itemCount) still gates Hermes on (scale signal)", () => {
  const r = routeTask("audit", "scout", { openEnded: true, cores: 16 });
  assert.equal(r.hermesGated, true);
});
