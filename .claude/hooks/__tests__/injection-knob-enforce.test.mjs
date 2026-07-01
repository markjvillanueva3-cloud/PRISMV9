// Tests for injection-knob-enforce.mjs -- TOKEN-EFFICIENCY-INJECT/U-INJECTION-KNOB-ENFORCE
// (2026-06-10, slot:bravo). The enforcement counterpart to the census: proves the
// gate BLOCKS a knobless recurring context-injector and lets everything else pass.
// R9: each test pins WHY the behavior matters (the un-silenceable-injector regression).

import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, targetsRecurringInjection, suggestKnobName } from "../injection-knob-enforce.mjs";

// A knobless UserPromptSubmit context injector -- the exact regression to block.
const KNOBLESS_UPS = `
import * as fs from "node:fs";
function main() {
  const ctx = "some per-prompt awareness";
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx } }));
}
main();
`;
// Same injector, but WITH a disable knob -> must pass.
const GATED_UPS = `
function main() {
  if (process.env.PRISM_MY_THING_DISABLE === "1") { console.log(JSON.stringify({ continue: true })); return; }
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: "x" } }));
}
main();
`;
// A Stop hook that emits hookSpecificOutput -> NOT the recurring surface -> pass.
const STOP_EMITTER = `
function main() {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "Stop", additionalContext: "feedback" } }));
}
main();
`;
// A guard that emits NO context -> not our concern even though knobless.
const GUARD_NO_CONTEXT = `
function main() { if (!process.argv[1]) process.exit(1); console.log(JSON.stringify({ continue: true })); }
main();
`;

const mkWrite = (file_path, content) => ({ tool_name: "Write", tool_input: { file_path, content } });
const HOOK = "H:/prism/.claude/hooks/my-thing-inject.mjs";

// --- targetsRecurringInjection ---

test("targetsRecurringInjection: true for a UPS additionalContext emitter", () => {
  assert.equal(targetsRecurringInjection(KNOBLESS_UPS), true);
});

test("targetsRecurringInjection: false for a Stop emitter (different budget, out of scope)", () => {
  assert.equal(targetsRecurringInjection(STOP_EMITTER), false);
});

test("targetsRecurringInjection: false for a guard that emits no context", () => {
  assert.equal(targetsRecurringInjection(GUARD_NO_CONTEXT), false);
});

// --- suggestKnobName ---

test("suggestKnobName: filename -> canonical PRISM_<NAME>_DISABLE", () => {
  assert.equal(suggestKnobName("H:/prism/.claude/hooks/foo-bar-inject.mjs"), "PRISM_FOO_BAR_INJECT_DISABLE");
  assert.equal(suggestKnobName("x/y/slot-domain-awareness-inject.mjs"), "PRISM_SLOT_DOMAIN_AWARENESS_INJECT_DISABLE");
});

// --- evaluate: the enforcement decision ---

test("evaluate: BLOCKS a knobless UPS context injector (the regression this gate exists to stop)", () => {
  const r = evaluate({ stdin: mkWrite(HOOK, KNOBLESS_UPS), env: {} });
  assert.equal(r.action, "block");
  assert.equal(r.knob, "PRISM_MY_THING_INJECT_DISABLE");
  assert.match(r.reason, /KNOBLESS INJECTOR BLOCKED/);
});

test("evaluate: ALLOWS the same injector once it carries a disable knob (R9: the knob is what clears it)", () => {
  const r = evaluate({ stdin: mkWrite(HOOK, GATED_UPS), env: {} });
  assert.equal(r.action, "allow");
});

test("evaluate: ALLOWS a Stop emitter (precise signal -- not the recurring surface)", () => {
  const r = evaluate({ stdin: mkWrite("H:/prism/.claude/hooks/stop-x.mjs", STOP_EMITTER), env: {} });
  assert.equal(r.action, "allow");
});

test("evaluate: ALLOWS a knobless guard that emits no context", () => {
  const r = evaluate({ stdin: mkWrite("H:/prism/.claude/hooks/guard-x.mjs", GUARD_NO_CONTEXT), env: {} });
  assert.equal(r.action, "allow");
});

test("evaluate: ALLOWS non-Write tools and non-hooks files (scope guard)", () => {
  assert.equal(evaluate({ stdin: { tool_name: "Edit", tool_input: { file_path: HOOK, content: KNOBLESS_UPS } }, env: {} }).action, "allow");
  assert.equal(evaluate({ stdin: mkWrite("H:/prism/scripts/foo.mjs", KNOBLESS_UPS), env: {} }).action, "allow");
});

test("evaluate: bypass env downgrades block -> advise (emergency escape, violation still surfaced)", () => {
  const r = evaluate({ stdin: mkWrite(HOOK, KNOBLESS_UPS), env: { PRISM_INJECTION_KNOB_ENFORCE_DISABLE: "1" } });
  assert.equal(r.action, "advise");
  assert.match(r.reason, /KNOBLESS INJECTOR BLOCKED/);
});

test("evaluate: empty content / missing file_path fail OPEN (never wedge legit work)", () => {
  assert.equal(evaluate({ stdin: mkWrite(HOOK, ""), env: {} }).action, "allow");
  assert.equal(evaluate({ stdin: { tool_name: "Write", tool_input: {} }, env: {} }).action, "allow");
  assert.equal(evaluate({ stdin: null, env: {} }).action, "allow");
});
