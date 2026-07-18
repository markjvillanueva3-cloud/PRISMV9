#!/usr/bin/env node
/**
 * meta-task-suppressor.test.mjs — node:test suite (no vitest dep).
 *
 * Run: node --test H:/prism/.claude/helpers/meta-task-suppressor.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isMetaTask } from "./meta-task-suppressor.mjs";

test("meta: audit + harness keywords → suppress", () => {
  const r = isMetaTask("audit + replace auto-injection pipelines (hook signal-to-noise)");
  assert.equal(r.suppress, true);
  assert.match(r.reason, /meta-task/);
  assert.ok(r.bucketsHit >= 2);
});

test("meta: this session's actual prompt → suppress", () => {
  const r = isMetaTask("look for nodes that need updating reflecting whats now built and optimize their usage");
  assert.equal(r.suppress, true);
});

test("meta: fleet + harness → suppress", () => {
  const r = isMetaTask("add a 13th chat slot to fleet (mike) — intake everywhere");
  assert.equal(r.suppress, true);
});

test("meta: system + audit → suppress", () => {
  const r = isMetaTask("audit the awareness layer and refresh the wiki index");
  assert.equal(r.suppress, true);
});

test("domain: kienzle calc → DO NOT suppress", () => {
  const r = isMetaTask("calculate kienzle feed rate for AISI 1045 with 12mm endmill at 8000 rpm");
  assert.equal(r.suppress, false);
  assert.equal(r.strongDomainHit, true);
});

test("domain: WEDM strong-domain → DO NOT suppress (even if 'program' incidentally meta-adjacent)", () => {
  const r = isMetaTask("set up wedm-program for sodick AQ327L with brass wire");
  assert.equal(r.suppress, false);
});

test("domain: quote/customer → DO NOT suppress", () => {
  const r = isMetaTask("generate a quote for customer ABC Manufacturing on this fixture plate");
  assert.equal(r.suppress, false);
});

test("edge: single meta bucket (only 'hook') → DO NOT suppress", () => {
  const r = isMetaTask("implement a new hook for after-edit events");
  // single bucket only — could be domain-leaning code work; let the hook fire
  assert.equal(r.suppress, false);
});

test("edge: empty prompt → DO NOT suppress", () => {
  const r = isMetaTask("");
  assert.equal(r.suppress, false);
  assert.equal(r.reason, "empty-prompt");
});

test("edge: null prompt → DO NOT suppress", () => {
  const r = isMetaTask(null);
  assert.equal(r.suppress, false);
});

test("edge: undefined prompt → DO NOT suppress", () => {
  const r = isMetaTask(undefined);
  assert.equal(r.suppress, false);
});

test("edge: oversize prompt (70KB) → still runs, capped to 50KB scan", () => {
  const r = isMetaTask("audit hook " + "x".repeat(70000));
  // bounded scan still picks up the prefix
  assert.equal(typeof r.suppress, "boolean");
});

test("adversarial: NaN-like input → DO NOT suppress", () => {
  const r = isMetaTask(NaN);
  assert.equal(r.suppress, false);
});

test("adversarial: number input → DO NOT suppress (not a string)", () => {
  const r = isMetaTask(42);
  assert.equal(r.suppress, false);
});

test("env: PRISM_META_SUPPRESS_DISABLE=1 → DO NOT suppress even when meta", () => {
  const orig = process.env.PRISM_META_SUPPRESS_DISABLE;
  process.env.PRISM_META_SUPPRESS_DISABLE = "1";
  try {
    const r = isMetaTask("audit hooks dispatcher settings slot fleet");
    assert.equal(r.suppress, false);
    assert.equal(r.reason, "disabled-via-env");
  } finally {
    if (orig === undefined) delete process.env.PRISM_META_SUPPRESS_DISABLE;
    else process.env.PRISM_META_SUPPRESS_DISABLE = orig;
  }
});

test("returned shape: always {suppress, reason, bucketsHit, strongDomainHit}", () => {
  const r = isMetaTask("anything");
  assert.equal(typeof r.suppress, "boolean");
  assert.equal(typeof r.reason, "string");
  assert.equal(typeof r.bucketsHit, "number");
  assert.equal(typeof r.strongDomainHit, "boolean");
});
