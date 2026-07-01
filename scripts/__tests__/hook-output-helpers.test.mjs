import { test } from "node:test";
import assert from "node:assert/strict";
import { capAdditionalContext, shouldFireNoop, hookProfileReminder, DEFAULT_CAP_BYTES } from "../lib/hook-output-helpers.mjs";

test("capAdditionalContext: short text passes through", () => {
  assert.equal(capAdditionalContext("hello"), "hello");
});
test("capAdditionalContext: long text truncated with marker", () => {
  const long = "x".repeat(3000);
  const out = capAdditionalContext(long);
  assert.ok(out.length <= DEFAULT_CAP_BYTES + 20);
  assert.ok(out.includes("truncated"));
});
test("capAdditionalContext: non-string → empty string", () => {
  assert.equal(capAdditionalContext(null), "");
  assert.equal(capAdditionalContext(undefined), "");
  assert.equal(capAdditionalContext(42), "");
});
test("capAdditionalContext: custom maxBytes honored", () => {
  const out = capAdditionalContext("x".repeat(500), 100);
  assert.ok(out.length <= 120);
});

test("shouldFireNoop: tool in array → true", () => {
  assert.equal(shouldFireNoop("Bash", ["Bash", "Read"]), true);
});
test("shouldFireNoop: tool not in array → false", () => {
  assert.equal(shouldFireNoop("Edit", ["Bash", "Read"]), false);
});
test("shouldFireNoop: tool in Set → true", () => {
  assert.equal(shouldFireNoop("Read", new Set(["Read"])), true);
});
test("shouldFireNoop: empty/null tool → false", () => {
  assert.equal(shouldFireNoop("", ["Bash"]), false);
  assert.equal(shouldFireNoop(null, ["Bash"]), false);
});

test("hookProfileReminder: mentions canonical helper path", () => {
  const r = hookProfileReminder();
  assert.ok(r.includes("helpers/hook-profile.mjs"));
  assert.ok(r.includes("shouldSkipHook"));
});
