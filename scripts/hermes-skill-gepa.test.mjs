#!/usr/bin/env node
// Tests for hermes-skill-gepa.mjs parseTrace -- the extraction core.
// Fixtures mirror REAL Hermes cron trace shapes observed 2026-06-09
// (cron/output/61374a47c8bd/*.md): header, huge ## Prompt block, then one of
// ## Response / ## Error / neither (killed mid-run).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTrace } from "./hermes-skill-gepa.mjs";

const HEADER = `# Cron Job: PRISM inbox sweep

**Job ID:** 61374a47c8bd
**Run Time:** 2026-06-09 21:29:19
**Schedule:** 23 20 * * *

## Prompt

[IMPORTANT: skill loaded below] ... thousands of chars of skill text ...
`;

test("response trace: extracts kind/time/text", () => {
  const t = parseTrace(HEADER + "\n## Response\n\nI'm ready - please let me know what you'd like assistance with.\n");
  assert.equal(t.kind, "response");
  assert.equal(t.runTime, "2026-06-09 21:29:19");
  assert.match(t.text, /I'm ready/);
});

test("error trace: extracts the exception", () => {
  const t = parseTrace(HEADER + "\n## Error\n\n```\nValueError: Model qwen2.5-coder:32b has a context window of 32,768 tokens\n```\n");
  assert.equal(t.kind, "error");
  assert.match(t.text, /ValueError: Model qwen2\.5-coder:32b/);
});

test("killed mid-run: no Response/Error section -> kind none (itself a failure signal)", () => {
  const t = parseTrace(HEADER);
  assert.equal(t.kind, "none");
  assert.equal(t.text, "");
  assert.equal(t.runTime, "2026-06-09 21:29:19"); // header still parsed
});

test("prompt quoting '## Response' literally does not fool the parser (last occurrence wins)", () => {
  // Adversarial: the skill text inside ## Prompt documents the output format by
  // quoting a literal "## Response" heading. The REAL outcome is the Error after it.
  const tricky = HEADER + '\nThe skill says: output under a "\n## Response\n" heading like this example.\n' +
    "\n## Error\n\nHTTP 400 You're out of extra usage\n";
  const t = parseTrace(tricky);
  assert.equal(t.kind, "error");
  assert.match(t.text, /out of extra usage/);
});

test("adversarial inputs: empty / null / non-string never throw", () => {
  for (const bad of ["", null, undefined, 42, {}]) {
    const t = parseTrace(bad);
    assert.equal(t.kind, "none");
    assert.equal(t.text, "");
  }
});

test("tail cap: outcome text bounded at 1200 chars", () => {
  const huge = HEADER + "\n## Response\n\n" + "x".repeat(50_000);
  const t = parseTrace(huge);
  assert.ok(t.text.length <= 1200, `expected <=1200, got ${t.text.length}`);
});
