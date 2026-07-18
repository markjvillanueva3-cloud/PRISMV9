// scripts/probe-vision-model.test.mjs
// Tests for the vision-model probe's pure thinking-trap detector. WHY it matters: the detector is the
// definitive answer to the zulu ladder work-order ("is bare qwen3-vl:32b JSON-safe?"). A false negative
// (calling a thinking model "clean") would let a trap into the OCR ensemble -> garbled extraction; a
// false positive would wrongly reject a usable stronger model. So the detector must key ONLY on the
// explicit reasoning tags, never on incidental text.

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectThinkingTrap } from "./probe-vision-model.mjs";

test("detectThinkingTrap: TRUE only when explicit reasoning tags leak", () => {
  assert.equal(detectThinkingTrap("<think>let me reason</think>{\"dimensions\":[]}"), true, "open+close think");
  assert.equal(detectThinkingTrap("<think>partial..."), true, "open think only (truncated)");
  assert.equal(detectThinkingTrap("text </think> more"), true, "stray close think");
  assert.equal(detectThinkingTrap("<reasoning>step</reasoning> answer"), true, "reasoning tag");
  assert.equal(detectThinkingTrap("<think >trailing-space-before-gt</think >"), true, "space before > still caught");
  assert.equal(detectThinkingTrap("<think>\nmulti\nline\n</think>\n{}"), true, "multiline think block");
});

test("detectThinkingTrap: FALSE for clean JSON / dimension text (no false positives)", () => {
  assert.equal(detectThinkingTrap('{"dimensions":[{"value":12.7,"unit":"mm","type":"linear"}]}'), false, "clean JSON");
  assert.equal(detectThinkingTrap("0.171 DIA THRU, 4 PLACES"), false, "raw dimension text");
  // adversarial: the WORD 'think' in prose must NOT trip the tag detector
  assert.equal(detectThinkingTrap("I think this hole is 5mm"), false, "the word think is not the tag");
  assert.equal(detectThinkingTrap("rethinking the datum"), false, "substring 'think' not the tag");
});

test("detectThinkingTrap: empty / null / non-string never throw, return false", () => {
  assert.equal(detectThinkingTrap(""), false);
  assert.equal(detectThinkingTrap(null), false);
  assert.equal(detectThinkingTrap(undefined), false);
  assert.equal(detectThinkingTrap(12345), false);
});
