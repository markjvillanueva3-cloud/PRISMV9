/**
 * Test for the baseline runner's prompt builder — it MUST match the format
 * train_wedm_lora_peft.py uses (instruction + blank line + input) so the
 * baseline is a fair apples-to-apples comparison against the fine-tuned adapter.
 *   node --test scripts/wedm-p2p-baseline-ollama.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt } from "./wedm-p2p-baseline-ollama.mjs";

test("buildPrompt matches the trainer format: instruction + blank line + input", () => {
  assert.equal(buildPrompt({ instruction: "Do X", input: "ctx" }), "Do X\n\nctx");
});

test("buildPrompt omits the separator when there is no input (trainer parity)", () => {
  assert.equal(buildPrompt({ instruction: "Do X", input: "" }), "Do X");
  assert.equal(buildPrompt({ instruction: "Do X" }), "Do X");
});

test("buildPrompt coerces missing/non-string fields without throwing", () => {
  assert.equal(buildPrompt({}), "");
  assert.equal(buildPrompt({ instruction: 7, input: 0 }), "7"); // 0 input is falsy -> no separator
});
