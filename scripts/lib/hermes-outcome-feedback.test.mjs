// scripts/lib/hermes-outcome-feedback.test.mjs — U-HFR01 tests.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ABANDON_THRESHOLD,
  MIN_OUTCOMES_TO_JUDGE,
  OUTCOMES,
  checkClusterAgainstNoise,
  summarizeClusterOutcomes,
} from "./hermes-outcome-feedback.mjs";

test("constants exported", () => {
  assert.equal(ABANDON_THRESHOLD, 3);
  assert.equal(MIN_OUTCOMES_TO_JUDGE, 3);
  assert.ok(OUTCOMES.includes("success"));
  assert.ok(OUTCOMES.includes("abandoned"));
});

test("summarizeClusterOutcomes — handles empty + invalid input", () => {
  assert.equal(summarizeClusterOutcomes(null).size, 0);
  assert.equal(summarizeClusterOutcomes([]).size, 0);
  assert.equal(summarizeClusterOutcomes([{ outcome: "invalid-state" }]).size, 0);
});

test("summarizeClusterOutcomes — tallies by signature", () => {
  const outcomes = [
    { signature: "sig-A", outcome: "success" },
    { signature: "sig-A", outcome: "abandoned" },
    { signature: "sig-A", outcome: "abandoned" },
    { signature: "sig-A", outcome: "abandoned" },
    { signature: "sig-B", outcome: "success" },
  ];
  const m = summarizeClusterOutcomes(outcomes);
  assert.equal(m.get("sig-A").totalOutcomes, 4);
  assert.equal(m.get("sig-A").abandoned, 3);
  assert.equal(m.get("sig-A").success, 1);
  assert.equal(m.get("sig-A").isNoise, true); // 3 abandoned >= threshold AND > 1 success
  assert.equal(m.get("sig-B").isNoise, false); // only 1 outcome, below judgement threshold
});

test("summarizeClusterOutcomes — needs MIN_OUTCOMES_TO_JUDGE before noise verdict", () => {
  const outcomes = [
    { signature: "sig-low", outcome: "abandoned" },
    { signature: "sig-low", outcome: "abandoned" },
  ];
  const m = summarizeClusterOutcomes(outcomes);
  assert.equal(m.get("sig-low").isNoise, false); // 2 < MIN_OUTCOMES_TO_JUDGE
});

test("summarizeClusterOutcomes — success > abandoned does NOT mark noise even past threshold", () => {
  const outcomes = [
    { signature: "sig-good", outcome: "success" },
    { signature: "sig-good", outcome: "success" },
    { signature: "sig-good", outcome: "success" },
    { signature: "sig-good", outcome: "success" },
    { signature: "sig-good", outcome: "abandoned" },
    { signature: "sig-good", outcome: "abandoned" },
    { signature: "sig-good", outcome: "abandoned" },
  ];
  const m = summarizeClusterOutcomes(outcomes);
  assert.equal(m.get("sig-good").abandoned, 3);
  assert.equal(m.get("sig-good").success, 4);
  // 3 abandoned reaches threshold but success > abandoned → not noise
  assert.equal(m.get("sig-good").isNoise, false);
});

test("checkClusterAgainstNoise — empty / null inputs return no-match", () => {
  assert.equal(checkClusterAgainstNoise(null, new Map()).match, false);
  assert.equal(checkClusterAgainstNoise({ signature: "x" }, null).match, false);
  assert.equal(checkClusterAgainstNoise({ signature: "x" }, new Map()).match, false);
});

test("checkClusterAgainstNoise — matches known noise pattern", () => {
  const noiseMap = new Map([
    ["noisy-sig", { totalOutcomes: 5, abandoned: 4, success: 1, isNoise: true }],
  ]);
  const result = checkClusterAgainstNoise({ fullSignature: "noisy-sig", signature: "noisy-sig" }, noiseMap);
  assert.equal(result.match, true);
  assert.match(result.reason, /noise-pattern:abandoned=4\/5/);
});

test("variability — 3 spanning noise/non-noise states correctly classified", () => {
  const outcomes = [
    // sig-noise: 4 abandoned, 1 success → noise
    { signature: "sig-noise", outcome: "abandoned" },
    { signature: "sig-noise", outcome: "abandoned" },
    { signature: "sig-noise", outcome: "abandoned" },
    { signature: "sig-noise", outcome: "abandoned" },
    { signature: "sig-noise", outcome: "success" },
    // sig-untriaged: 2 abandoned → too few to judge
    { signature: "sig-untriaged", outcome: "abandoned" },
    { signature: "sig-untriaged", outcome: "abandoned" },
    // sig-mixed: 3 abandoned, 5 success → not noise
    { signature: "sig-mixed", outcome: "abandoned" },
    { signature: "sig-mixed", outcome: "abandoned" },
    { signature: "sig-mixed", outcome: "abandoned" },
    { signature: "sig-mixed", outcome: "success" },
    { signature: "sig-mixed", outcome: "success" },
    { signature: "sig-mixed", outcome: "success" },
    { signature: "sig-mixed", outcome: "success" },
    { signature: "sig-mixed", outcome: "success" },
  ];
  const m = summarizeClusterOutcomes(outcomes);
  assert.equal(m.get("sig-noise").isNoise, true);
  assert.equal(m.get("sig-untriaged").isNoise, false);
  assert.equal(m.get("sig-mixed").isNoise, false);
});
