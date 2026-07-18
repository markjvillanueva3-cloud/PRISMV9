/**
 * Tests for hermes-model-router.mjs (HERMES-HYBRID-ROUTER-MS0). Real reference-value assertions.
 * Run: node scripts/hermes-model-router.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyHermesTask, routeHermesTask, cheapestLocalTier, TIERS, DEFAULT_TIER } from "./hermes-model-router.mjs";

test("classifyHermesTask: maps each task family to the right local tier", () => {
  assert.equal(classifyHermesTask("classify this material into an ISO group"), "fast");
  assert.equal(classifyHermesTask("extract the dimensions and summarize"), "fast");
  assert.equal(classifyHermesTask("refactor this function and fix the lint errors"), "code");
  assert.equal(classifyHermesTask("write a docstring for foo.mjs"), "code");
  assert.equal(classifyHermesTask("design the architecture and plan the build"), "reason");
  assert.equal(classifyHermesTask("read this screenshot and describe the diagram"), "vision");
});

test("classifyHermesTask: BOTH mechanical + deep -> reason (quality wins); empty -> default", () => {
  assert.equal(classifyHermesTask("summarize then deeply analyze the tradeoffs"), "reason");
  assert.equal(classifyHermesTask(""), DEFAULT_TIER);
  assert.equal(classifyHermesTask(null), DEFAULT_TIER);
  assert.equal(classifyHermesTask("just chat with me"), DEFAULT_TIER); // no signal -> reason (main loop)
});

test("routeHermesTask: default is ALWAYS local (cloud never auto-selected)", () => {
  const r = routeHermesTask("plan the release");
  assert.equal(r.local, true);
  assert.equal(r.provider, "ollama");
  assert.equal(r.tier, "reason");
  assert.equal(r.model, "gpt-oss:120b");
});

test("routeHermesTask: cloud is GATED -- needs allowCloud AND an explicit-cloud phrase", () => {
  // explicit phrase but allowCloud=false -> still local (safe default)
  assert.equal(routeHermesTask("use nvidia cloud for this").local, true);
  // allowCloud=true but NO explicit phrase -> still local
  assert.equal(routeHermesTask("plan the release", { allowCloud: true }).tier, "reason");
  // allowCloud=true AND explicit -> cloud
  const c = routeHermesTask("route to the cloud model", { allowCloud: true });
  assert.equal(c.tier, "cloud");
  assert.equal(c.local, false);
  assert.equal(c.provider, "nvidia");
});

test("SAFETY: no tier is a <think> reasoning model; every tool-use tier clears the 64K floor", () => {
  // never a reasoning model (nemotron / deepseek-r1 / *reasoner) -- those hang the agent loop
  for (const t of Object.values(TIERS)) {
    assert.ok(!/nemotron|deepseek[-.]?r1|reasoner|:r1\b/i.test(t.model), `tier model must not be a reasoning model: ${t.model}`);
  }
  // the tool-use tiers (fast/code/reason) + cloud must be >= Hermes's 64000 hard floor
  for (const key of ["fast", "code", "reason", "cloud"]) {
    assert.ok(TIERS[key].ctx >= 64000, `${key} ctx ${TIERS[key].ctx} must clear the 64K floor`);
  }
  // the cloud tier is explicitly a NON-reasoning instruct model
  assert.match(TIERS.cloud.model, /instruct/i);
});

test("cheapestLocalTier: picks the smallest local model (gpt-oss:20b = fast)", () => {
  assert.equal(cheapestLocalTier(0), "fast");
  // require >= 30b -> not the 20b fast tier
  assert.notEqual(cheapestLocalTier(30), "fast");
});

test("TIERS: every entry is well-formed (model, provider, base_url, ctx)", () => {
  for (const [key, t] of Object.entries(TIERS)) {
    assert.ok(t.model && t.provider && t.base_url && t.ctx, `tier ${key} complete`);
    if (t.provider === "ollama") assert.match(t.base_url, /127\.0\.0\.1:11434/, `${key} local base_url`);
  }
});
