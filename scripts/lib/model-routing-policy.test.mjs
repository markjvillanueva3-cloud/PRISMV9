// scripts/lib/model-routing-policy.test.mjs
// Tests for U-MODEL-ROUTE-POLICY: per-prompt verdict fusing tier-router + capability matrix.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ollamaSafeClassModels, routePrompt, BATTERY_TO_CLASS } from "./model-routing-policy.mjs";

// A matrix shaped like ollama-capability-probe.mjs output.
const MATRIX = {
  models: ["small", "big"],
  matrix: {
    "classify-enum": { category: "classification", models: { small: { pass: 1, total: 3, rate: 0.33 }, big: { pass: 3, total: 3, rate: 1.0 } } },
    "boolean-judgment": { category: "classification", models: { small: { pass: 2, total: 3, rate: 0.67 }, big: { pass: 3, total: 3, rate: 1.0 } } },
    "extract-number": { category: "extraction", models: { small: { pass: 3, total: 3, rate: 1.0 }, big: { pass: 3, total: 3, rate: 1.0 } } },
    "json-extract": { category: "extraction", models: { small: { pass: 3, total: 3, rate: 1.0 }, big: { pass: 3, total: 3, rate: 1.0 } } },
  },
};

describe("ollamaSafeClassModels", () => {
  it("a class is safe only when ALL its battery tasks clear the bar on a model", () => {
    const safe = ollamaSafeClassModels(MATRIX, 1.0);
    // classify needs BOTH classify-enum AND boolean-judgment at 100%: only 'big' clears both
    assert.equal(safe.get("classify"), "big");
    // extract needs extract-number AND json-extract at 100%: 'small' clears both -> first-qualifying
    assert.equal(safe.get("extract"), "small");
  });
  it("threshold gates membership", () => {
    const strict = ollamaSafeClassModels(MATRIX, 1.0);
    assert.ok(strict.has("classify"));
    // raise impossible -> nothing
    assert.equal(ollamaSafeClassModels(MATRIX, 1.01).size, 0);
  });
  it("adversarial: null / malformed matrix -> empty map (no throw)", () => {
    assert.doesNotThrow(() => {
      assert.equal(ollamaSafeClassModels(null).size, 0);
      assert.equal(ollamaSafeClassModels({}).size, 0);
      assert.equal(ollamaSafeClassModels({ matrix: {} }).size, 0);
    });
  });
});

describe("routePrompt", () => {
  it("OLLAMA: a matrix-proven mechanical class offloads to the proven model ($0)", () => {
    // 'extract' is matrix-proven -> a clearly-extract prompt routes to ollama
    const r = routePrompt({ prompt: "extract the bore diameter values from this text", matrix: MATRIX });
    assert.equal(r.engine, "ollama");
    assert.equal(r.taskClass, "extract");
    assert.match(r.reason, /matrix-proven/);
  });
  it("FABLE: deep planning stays on Claude top-think tier even with a matrix", () => {
    const r = routePrompt({ prompt: "brainstorm a plan to cover all angles for the routing system", matrix: MATRIX });
    assert.equal(r.engine, "claude");
    assert.equal(r.model, "fable");
  });
  it("OPUS: heavy building stays on Claude build tier", () => {
    const r = routePrompt({ prompt: "implement the engine and wire the dispatcher", matrix: MATRIX });
    assert.equal(r.engine, "claude");
    assert.equal(r.model, "opus");
  });
  it("NO MATRIX: a mechanical class falls back to the cheap Claude tier (not ollama)", () => {
    const r = routePrompt({ prompt: "extract the values from this text", matrix: null });
    assert.equal(r.engine, "claude"); // can't offload without proof
  });
  it("SAFETY: never offloads, always frontier Claude", () => {
    const r = routePrompt({ prompt: "validate the collision-force safety margin", matrix: MATRIX });
    assert.equal(r.engine, "claude");
    assert.equal(r.taskClass, "safety_critical");
  });
  it("adversarial: empty/non-string prompt -> a valid claude verdict, no throw", () => {
    assert.doesNotThrow(() => {
      const r = routePrompt({ prompt: "", matrix: MATRIX });
      assert.equal(r.engine, "claude");
    });
  });
});

describe("BATTERY_TO_CLASS", () => {
  it("maps every battery task to a real class", () => {
    for (const cls of Object.values(BATTERY_TO_CLASS)) {
      assert.ok(["classify", "extract", "format"].includes(cls));
    }
  });
});
