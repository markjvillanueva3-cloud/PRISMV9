// fleet-work-digest-inject.test.mjs -- regression test for the UserPromptSubmit keyword gate.
// Guards the 2026-06-15 (golf) P1 fix: a bare NATO slot-name in an ordinary prompt must NOT
// trigger a ~320-token inject ("WITHOUT losing tokens"); a real per-slot work query must.
// Run: node --test .claude/hooks/__tests__/fleet-work-digest-inject.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { isFleetQuery } from "../fleet-work-digest-inject.mjs";

// [prompt, shouldInject]
const NEGATIVE = [
  "what is uniform",                                    // uniform distribution / CSS
  "what is november",
  "what is alpha",                                      // alpha channel / alphanumeric
  "the alpha channel is broken, what is alpha blending",
  "explain what is victor going to do here in my code review of victor.ts",
  "what is the india tariff",
  "what is mike's microphone setting",
  "fix the login bug",
  "refactor the tango parser",
  "what is a uniform distribution",
  "implement the golf scoring rules",                   // golf = the sport, not the slot
];
const POSITIVE = [
  "what is oscar doing",
  "what did kilo build",
  "what is india doing",
  "what has papa shipped",
  "give me fleet status",
  "what's everyone working on",
  "who built the cam bridge",
  "show me the other chats",
  "what are all the slots doing",
  "fleet work digest",
  "what is alpha working on",                            // NATO + fleet verb -> legit
];

for (const p of NEGATIVE) {
  test(`gate: NO inject -> "${p}"`, () => assert.equal(isFleetQuery(p), false));
}
for (const p of POSITIVE) {
  test(`gate: inject -> "${p}"`, () => assert.equal(isFleetQuery(p), true));
}
test("gate: adversarial empty/null never throws", () => {
  assert.equal(isFleetQuery(""), false);
  assert.equal(isFleetQuery(null), false);
  assert.equal(isFleetQuery(undefined), false);
});
