// Tests for audit-probe-roster-coverage.mjs (U-ALPHA-OLLAMA-ROSTER-COVERAGE-GUARD, slot:alpha 2026-06-25).
// R9: real invariant, not stubs. The headline test is the REGRESSION ORACLE -- it reproduces the
// exact pre-fix drift (a 3-model probe roster blind to qwen3-coder:30b that the router prefers) and
// asserts the guard catches it. Run: node scripts/audit-probe-roster-coverage.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { flattenTierModels, findUncoveredRoutableModels, NON_TEXT_RE } from "./audit-probe-roster-coverage.mjs";

test("flattenTierModels flattens + de-dupes the tier object", () => {
  const tiers = {
    cheap: ["qwen2.5-coder:1.5b"],
    balanced: ["qwen2.5-coder:7b", "qwen2.5-coder:1.5b"], // dup across tiers
    best: ["gpt-oss:120b", "qwen3-coder:30b"],
  };
  const flat = flattenTierModels(tiers);
  assert.deepEqual([...flat].sort(), ["gpt-oss:120b", "qwen2.5-coder:1.5b", "qwen2.5-coder:7b", "qwen3-coder:30b"]);
});

test("flattenTierModels tolerates null/empty/garbage entries", () => {
  assert.deepEqual(flattenTierModels(null), []);
  assert.deepEqual(flattenTierModels({}), []);
  assert.deepEqual(flattenTierModels({ a: null, b: [null, 42, "", "ok:1b"] }), ["ok:1b"]);
});

test("REGRESSION ORACLE: the pre-fix 3-model roster is flagged BLIND to the router's preferred coder", () => {
  // The exact drift U-ALPHA-OLLAMA-ROSTER-SYNC fixed: the probe measured only these 3...
  const probeRoster = ["qwen2.5-coder:1.5b", "gpt-oss:20b", "qwen2.5-coder:32b"];
  // ...while the router could route to these (qwen3-coder:30b was its PREFERRED coder)...
  const tierModels = ["qwen2.5-coder:1.5b", "gpt-oss:20b", "qwen2.5-coder:32b", "qwen3-coder:30b", "deepseek-r1:32b"];
  // ...and all of them are installed.
  const installed = [...tierModels];
  const missing = findUncoveredRoutableModels({ tierModels, installed, probeRoster });
  assert.deepEqual(missing.sort(), ["deepseek-r1:32b", "qwen3-coder:30b"]);
});

test("the FIXED roster (covers all installed routable models) reports NO drift", () => {
  const tierModels = ["qwen2.5-coder:1.5b", "qwen2.5-coder:32b", "qwen3-coder:30b", "deepseek-r1:32b"];
  const installed = [...tierModels];
  const probeRoster = [...tierModels]; // roster now superset
  assert.deepEqual(findUncoveredRoutableModels({ tierModels, installed, probeRoster }), []);
});

test("a routable model that is NOT installed is NOT flagged (registry option, e.g. gemma4:31b)", () => {
  const tierModels = ["qwen2.5-coder:32b", "gemma4:31b", "llama3.3:70b"]; // 31b/70b are uninstalled registry options
  const installed = ["qwen2.5-coder:32b"];
  const probeRoster = ["qwen2.5-coder:32b"];
  assert.deepEqual(findUncoveredRoutableModels({ tierModels, installed, probeRoster }), []);
});

test("vision/embed families are excluded even when installed + tiered (text battery can't score them)", () => {
  const tierModels = ["qwen2.5-coder:32b", "qwen3-vl:32b", "llama3.2-vision:11b", "nomic-embed-text:latest"];
  const installed = [...tierModels];
  const probeRoster = ["qwen2.5-coder:32b"]; // vl/vision/embed deliberately absent
  assert.deepEqual(findUncoveredRoutableModels({ tierModels, installed, probeRoster }), []);
  // sanity: the exclusion regex really matches those families
  assert.ok(NON_TEXT_RE.test("qwen3-vl:32b"));
  assert.ok(NON_TEXT_RE.test("llama3.2-vision:11b"));
  assert.ok(NON_TEXT_RE.test("nomic-embed-text:latest"));
  assert.ok(!NON_TEXT_RE.test("qwen2.5-coder:32b"));
  assert.ok(!NON_TEXT_RE.test("qwen3-coder:30b"));
});

test("LIVE WIRING: the real probe roster covers the real cost-router tiers for installed models", async () => {
  // Imports the ACTUAL DEFAULT_MODELS + TIER_PREFERENCES and asserts the shipped invariant holds
  // for the set of models that are BOTH tiered and in the probe roster (install-agnostic slice:
  // every probe-roster model that the router tiers must be one the probe can measure -- trivially
  // true, but this pins that the two real modules import + flatten without error).
  const probe = await import("./ollama-capability-probe.mjs");
  const router = await import("../.claude/hooks/lib/ollama-cost-router.mjs");
  const tierModels = flattenTierModels(router.TIER_PREFERENCES);
  // The router's PREFERRED installed coder + reasoner must be measured by the probe roster.
  for (const must of ["qwen3-coder:30b", "qwen2.5-coder:32b", "qwen2.5-coder:7b", "deepseek-r1:32b"]) {
    if (tierModels.includes(must)) {
      assert.ok(probe.DEFAULT_MODELS.includes(must), `probe roster must measure the routable model ${must}`);
    }
  }
});
