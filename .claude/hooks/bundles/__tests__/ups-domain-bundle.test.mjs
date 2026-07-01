// ups-domain-bundle.test.mjs -- revert-proof tests for the operator kill-switch
// (PRISM_UPS_DOMAIN_DISABLE) added 2026-06-18 (slot:golf) to close the injection-
// surface audit's sole "knobless context-injector" gap.
//
// Run: node H:/prism/.claude/hooks/bundles/__tests__/ups-domain-bundle.test.mjs
// (node:test auto-runs on process exit; pipe to tail for the summary).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { isBundleDisabled } from "../ups-domain-bundle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLE = join(__dirname, "..", "ups-domain-bundle.mjs");

// ---- Pure knob predicate (revert-proof: deleting the knob breaks the import) -------
test("isBundleDisabled: exact '1' disables", () => {
  assert.equal(isBundleDisabled({ PRISM_UPS_DOMAIN_DISABLE: "1" }), true);
});

test("isBundleDisabled: unset runs normally (default)", () => {
  assert.equal(isBundleDisabled({}), false);
});

test("isBundleDisabled: '0' runs normally", () => {
  assert.equal(isBundleDisabled({ PRISM_UPS_DOMAIN_DISABLE: "0" }), false);
});

test("isBundleDisabled: any non-'1' truthy value runs normally (only '1' disables)", () => {
  // Mirrors the fleet PRISM_*_DISABLE convention -- a stray "true"/"yes" must NOT
  // silently silence the bundle; the operator must opt in with the exact "1".
  assert.equal(isBundleDisabled({ PRISM_UPS_DOMAIN_DISABLE: "true" }), false);
  assert.equal(isBundleDisabled({ PRISM_UPS_DOMAIN_DISABLE: "" }), false);
});

// ---- Integration: the kill-switch short-circuits BEFORE the 9-hook pool ------------
test("disabled bundle emits {continue:true} with NO additionalContext", () => {
  const r = spawnSync(process.execPath, [BUNDLE], {
    input: JSON.stringify({ prompt: "mill a slot in 4140 steel", session_id: "test1234" }),
    encoding: "utf8",
    env: { ...process.env, PRISM_UPS_DOMAIN_DISABLE: "1" },
    timeout: 15000,
  });
  assert.equal(r.status, 0, `exit 0 expected; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout.trim());
  assert.equal(out.continue, true);
  // The kill-switch returns before the pool, so NO domain context is ever attached.
  assert.equal(out.hookSpecificOutput, undefined, "disabled bundle must not emit context");
});

// ---- Guard regression: the bundle still runs end-to-end when NOT disabled ----------
test("enabled bundle runs to completion (CLI guard intact) and emits valid JSON", () => {
  const r = spawnSync(process.execPath, [BUNDLE], {
    // No slot bound for this test process -> every member self-gates off -> the
    // bundle aggregates to a plain {continue:true}. Proves the CLI guard did NOT
    // break direct hook invocation (the risk of adding the export + guard).
    input: JSON.stringify({ prompt: "hello", session_id: "test1234" }),
    encoding: "utf8",
    env: { ...process.env, PRISM_UPS_DOMAIN_DISABLE: "0" },
    timeout: 30000,
  });
  assert.equal(r.status, 0, `exit 0 expected; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout.trim());
  assert.equal(out.continue, true);
});
