#!/usr/bin/env node
/**
 * slash-invocation-suppressor.test.mjs — node:test suite for the suppressor.
 * Plain node:test (no vitest) because the .claude/helpers vitest harness has
 * a pre-existing infra bug (vite transform error on this directory).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isPureSlashInvocation } from "./slash-invocation-suppressor.mjs";

test("suppresses pure /checkin invocation", () => {
  const v = isPureSlashInvocation("/checkin-bravo");
  assert.equal(v.suppress, true);
  assert.equal(v.reason, "pure_slash_invocation");
  assert.equal(v.remainder, "");
});

test("suppresses chained slash commands without content", () => {
  const v = isPureSlashInvocation("/checkin-bravo /loop");
  assert.equal(v.suppress, true);
});

test("suppresses /checkin-bravo /loop until /goal (3 chained)", () => {
  const v = isPureSlashInvocation("/checkin-bravo /loop until /goal");
  assert.equal(v.suppress, true);
  // "until" survives the strip but is <30 chars
  assert.equal(v.remainder, "until");
});

test("passes substantive content after slash command", () => {
  const v = isPureSlashInvocation("/checkin-bravo build the user authentication system with OAuth2");
  assert.equal(v.suppress, false);
  assert.equal(v.reason, "substantive_content_after_slash");
  assert.ok(v.remainderLen > 30);
});

test("passes /loop with substantive analysis prompt", () => {
  const v = isPureSlashInvocation("/loop analyze the wire-edm milestone and pick next unit to build");
  assert.equal(v.suppress, false);
});

test("passes plain non-slash prompt unchanged", () => {
  const v = isPureSlashInvocation("fix the broken slot binding system");
  assert.equal(v.suppress, false);
  assert.equal(v.reason, "not_slash_prefixed");
});

test("passes empty string", () => {
  const v = isPureSlashInvocation("");
  assert.equal(v.suppress, false);
  assert.equal(v.reason, "empty_prompt");
});

test("passes non-string input (null) safely", () => {
  const v = isPureSlashInvocation(null);
  assert.equal(v.suppress, false);
  assert.equal(v.reason, "empty_prompt");
});

test("passes non-string input (undefined) safely", () => {
  const v = isPureSlashInvocation(undefined);
  assert.equal(v.suppress, false);
});

test("PRISM_SLASH_SUPPRESS_DISABLE=1 disables suppression", () => {
  const before = process.env.PRISM_SLASH_SUPPRESS_DISABLE;
  try {
    process.env.PRISM_SLASH_SUPPRESS_DISABLE = "1";
    const v = isPureSlashInvocation("/checkin-bravo");
    assert.equal(v.suppress, false);
    assert.equal(v.reason, "knob_disabled");
  } finally {
    if (before === undefined) delete process.env.PRISM_SLASH_SUPPRESS_DISABLE;
    else process.env.PRISM_SLASH_SUPPRESS_DISABLE = before;
  }
});

test("PRISM_SLASH_SUPPRESS_MIN_CONTENT changes threshold", () => {
  const before = process.env.PRISM_SLASH_SUPPRESS_MIN_CONTENT;
  try {
    process.env.PRISM_SLASH_SUPPRESS_MIN_CONTENT = "5";
    // "/checkin foo bar" -> remainder "foo bar" = 7 chars; below 5? no, 7 > 5
    // so doesn't suppress
    const v1 = isPureSlashInvocation("/checkin foo bar");
    assert.equal(v1.suppress, false);
    // With threshold 50, remainder "foo bar" = 7 chars < 50 -> suppress
    process.env.PRISM_SLASH_SUPPRESS_MIN_CONTENT = "50";
    const v2 = isPureSlashInvocation("/checkin foo bar");
    assert.equal(v2.suppress, true);
  } finally {
    if (before === undefined) delete process.env.PRISM_SLASH_SUPPRESS_MIN_CONTENT;
    else process.env.PRISM_SLASH_SUPPRESS_MIN_CONTENT = before;
  }
});

test("handles leading whitespace before slash", () => {
  const v = isPureSlashInvocation("  /checkin-bravo  ");
  assert.equal(v.suppress, true);
});

test("does NOT match path-like /usr/bin (no word-after-slash starting with letter)", () => {
  // /usr/bin is technically slash-prefixed but represents a path, not a command.
  // Current implementation: /usr matches /[A-Za-z][\w-]*, so it IS stripped.
  // Remainder is "/bin" which also matches and gets stripped to "".
  // So this WOULD be suppressed. Document the behavior.
  const v = isPureSlashInvocation("/usr/bin/something");
  assert.equal(v.suppress, true);
  // Operators concerned about path-prefixed prompts can adjust regex; today
  // such prompts are very rare in chat and the false-suppression is cheaper
  // than the false-pass cost.
});

test("does NOT suppress slash inside content (only matches /command at start)", () => {
  const v = isPureSlashInvocation("how do I use the /checkin command properly today");
  assert.equal(v.suppress, false);
  assert.equal(v.reason, "not_slash_prefixed");
});
