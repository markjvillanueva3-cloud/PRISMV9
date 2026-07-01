// ollama-mode-sufficiency.test.mjs (slot:alpha) -- node:test
// Verifies the per-mode measured cheap-floor for ask-ollama's loaded-first selection.
// INTENT (R9): a measured mode (summarize/explain) prepends the cheap-sufficient floor so a WARM
// 7b is preferred; an UNMEASURED mode (codegen/triage/viz/ask/rerank) is left on its big-first base
// unchanged. The base array is never mutated. These pin the EXACT modes that are downshift-eligible
// -- a future edit that silently downshifts an unmeasured mode (e.g. codegen, which has NO judged
// quality data) must fail here.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MODE_MIN_SUFFICIENT,
  loadedPreferenceForMode,
  hasMeasuredCheapFloor,
} from "./ollama-mode-sufficiency.mjs";

// Mirror of the real OFFLOAD_LOADED_PREFERENCE shape (big-first, no tiny coders).
const BASE = Object.freeze([
  "gpt-oss:120b", "qwen2.5-coder:32b", "qwen3-coder:30b", "deepseek-r1:32b",
  "gpt-oss:20b", "deepseek-r1:14b", "qwen2.5-coder:14b",
]);

test("summarize: prepends the measured cheap floor (7b) ahead of the big-first base", () => {
  const pref = loadedPreferenceForMode("summarize", BASE);
  assert.equal(pref[0], "qwen2.5-coder:7b"); // a WARM 7b now wins for summarize
  // the entire big-first base survives, in order, after the floor (cold-7b falls straight through)
  assert.deepEqual(pref.slice(1), [...BASE]);
});

test("explain: prepends the measured cheap floor (7b) -- the second measured mode", () => {
  const pref = loadedPreferenceForMode("explain", BASE);
  assert.equal(pref[0], "qwen2.5-coder:7b");
  assert.deepEqual(pref.slice(1), [...BASE]);
});

test("UNMEASURED modes get NO cheap floor (big-first base unchanged) -- the safety boundary", () => {
  // codegen/triage/viz/ask/rerank have NO judged generative-quality data -> must NOT downshift.
  for (const mode of ["codegen", "triage", "viz", "ask", "rerank"]) {
    const pref = loadedPreferenceForMode(mode, BASE);
    assert.deepEqual(pref, [...BASE], `${mode} must keep the big-first base (no cheap floor)`);
    assert.equal(pref[0], "gpt-oss:120b", `${mode} must still rank the big model first`);
  }
});

test("1.5b is NOT a floor for any measured mode (below the hard-explain bar) -- quality gate intact", () => {
  // The judged ladder put 1.5b at 67% on hard-explain (vs 7b 100%); excluding it keeps the
  // existing 1.5b offload quality gate honest.
  for (const floor of Object.values(MODE_MIN_SUFFICIENT)) {
    assert.ok(!floor.includes("qwen2.5-coder:1.5b"), "1.5b must never be a measured cheap floor");
  }
});

test("never mutates the caller's base array (returns a fresh array)", () => {
  const base = ["gpt-oss:120b", "qwen2.5-coder:32b"];
  const snapshot = [...base];
  const pref = loadedPreferenceForMode("summarize", base);
  assert.deepEqual(base, snapshot, "input base must be untouched");
  assert.notEqual(pref, base, "must return a new array, not the caller's reference");
});

test("de-dupes if the cheap floor already appears in the base (no duplicate entry)", () => {
  const base = ["qwen2.5-coder:7b", "qwen2.5-coder:32b"]; // 7b already present (hypothetical)
  const pref = loadedPreferenceForMode("summarize", base);
  assert.equal(pref.filter((m) => m === "qwen2.5-coder:7b").length, 1, "7b must appear exactly once");
  assert.equal(pref[0], "qwen2.5-coder:7b");
});

test("adversarial: bad mode (null/empty/whitespace/unknown) -> base unchanged, never throws", () => {
  for (const mode of [null, undefined, "", "   ", "SUMMARIZEX", 42, {}]) {
    const pref = loadedPreferenceForMode(mode, BASE);
    assert.deepEqual(pref, [...BASE], `mode=${JSON.stringify(mode)} must fall back to base`);
  }
});

test("adversarial: bad base (null/undefined/non-array) -> empty/clean, never throws", () => {
  assert.deepEqual(loadedPreferenceForMode("summarize", null), ["qwen2.5-coder:7b"]);
  assert.deepEqual(loadedPreferenceForMode("summarize", undefined), ["qwen2.5-coder:7b"]);
  assert.deepEqual(loadedPreferenceForMode("triage", null), []);
  // junk entries inside base are filtered (Boolean) so a null never reaches pickLoadedChatModel
  assert.deepEqual(loadedPreferenceForMode("triage", ["a", null, "", "b"]), ["a", "b"]);
});

test("case/whitespace-insensitive mode match (the dispatcher may pass ' Summarize ')", () => {
  assert.equal(loadedPreferenceForMode(" Summarize ", BASE)[0], "qwen2.5-coder:7b");
  assert.equal(loadedPreferenceForMode("EXPLAIN", BASE)[0], "qwen2.5-coder:7b");
});

test("hasMeasuredCheapFloor: true only for the two measured modes", () => {
  assert.equal(hasMeasuredCheapFloor("summarize"), true);
  assert.equal(hasMeasuredCheapFloor("explain"), true);
  for (const mode of ["codegen", "triage", "viz", "ask", "rerank", "", null]) {
    assert.equal(hasMeasuredCheapFloor(mode), false, `${mode} is not measured`);
  }
});

test("MODE_MIN_SUFFICIENT is frozen (table can't be mutated at runtime)", () => {
  assert.ok(Object.isFrozen(MODE_MIN_SUFFICIENT));
  assert.throws(() => { MODE_MIN_SUFFICIENT.codegen = ["x"]; }, TypeError);
});
