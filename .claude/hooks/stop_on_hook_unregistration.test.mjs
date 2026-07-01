#!/usr/bin/env node
/**
 * Tests for stop_on_hook_unregistration.mjs — the anti-hook-unregistration Stop
 * gate, invoked via the stop-regression-bundle (NOT standalone in settings.json).
 *
 * The load-bearing bug these encode (2026-06-09): the hook used the exit-code
 * protocol (exit 0 = allow with EMPTY stdout; exit 1 = block via stderr box), but
 * the bundle uses the JSON-stdout protocol (it keys "evaluated" + "block" on
 * parsed stdout, ignoring exit code). So every Stop the gate was reported "NOT
 * evaluated" (empty stdout → r.parsed null) AND a real block would NOT block
 * (the bundle never saw {continue:false}). buildVerdict + the stdout emit fix it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildVerdict } from "./stop_on_hook_unregistration.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK = join(HERE, "stop_on_hook_unregistration.mjs");

test("buildVerdict allow (no hooks removed) → {continue:true} so the bundle counts it EVALUATED", () => {
  assert.deepEqual(buildVerdict([]), { continue: true });
  assert.deepEqual(buildVerdict(), { continue: true });
});

test("buildVerdict block (hooks removed) → {continue:false,...} so the bundle ACTUALLY blocks", () => {
  const v = buildVerdict(["a.mjs", "b.mjs"]);
  assert.equal(v.continue, false, "must be continue:false or the bundle won't block");
  assert.match(v.stopReason, /2 hook script\(s\)/);
  assert.match(v.stopReason, /a\.mjs/);
  assert.match(v.stopReason, /b\.mjs/);
  assert.equal(v.systemMessage, v.stopReason, "systemMessage surfaces the same reason the bundle reads");
});

test("buildVerdict truncates a long removed list (no unbounded reason string)", () => {
  const many = Array.from({ length: 20 }, (_, i) => `hook${i}.mjs`);
  const v = buildVerdict(many);
  assert.equal(v.continue, false);
  assert.match(v.stopReason, /20 hook script\(s\)/);
  assert.match(v.stopReason, /\(\+8 more\)/, "shows first 12 then '(+8 more)'");
  assert.equal((v.stopReason.match(/hook\d+\.mjs/g) || []).length, 12, "names at most 12");
});

test("INTEGRATION: the hook now EMITS bundle-protocol JSON on stdout (was empty → the false-timeout bug)", () => {
  // Run the real hook against the real baseline dir. Before the fix the allow
  // path exited 0 with EMPTY stdout → the bundle's `!r.parsed` flagged it "NOT
  // evaluated" every Stop. After the fix stdout MUST be parseable JSON carrying a
  // boolean `continue` (allow=true normally; block=false if a removal exists).
  const out = execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: "Stop", session_id: "test-integration" }),
    encoding: "utf8", timeout: 20000, windowsHide: true,
  });
  assert.ok(out.trim().length > 0, "stdout must NOT be empty (the bug was empty stdout)");
  const parsed = JSON.parse(out);
  assert.equal(typeof parsed.continue, "boolean", "must emit a {continue:boolean} the bundle can parse");
});
