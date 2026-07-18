#!/usr/bin/env node
/**
 * winmax-autotest.test.mjs — tests the autonomous WinMax post-test harness. The macro engine is
 * pure over an injected driver, so these run WITHOUT WinMax (a mock driver records calls + returns
 * scripted JSON). Run: node --test scripts/winmax-autotest.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SOFTKEY_IDS, FAIL_PATTERNS, classifyStatus, ensureUp, readStatus, runStep, runMacro,
} from "./winmax-autotest.mjs";

// a mock driver: returns scripted responses by op, records every call
function mockDriver(script = {}) {
  const calls = [];
  const d = async (op, args = []) => { calls.push({ op, args }); const r = script[op]; return typeof r === "function" ? r(args, calls) : (r || { ok: true, op, value: {} }); };
  d.calls = calls;
  return d;
}

test("classifyStatus: clean vs each failure pattern (real WinMax status lines)", () => {
  assert.equal(classifyStatus("Enter part zero.").ok, true);
  assert.equal(classifyStatus("").ok, true);
  assert.equal(classifyStatus("ERROR IN BLOCK 21: TOOL 1 IS NOT DEFINED.").ok, false);
  assert.equal(classifyStatus("ALARM 1234 SPINDLE FAULT").ok, false);
  assert.equal(classifyStatus("TOOL 4 IS NOT DEFINED").failReason.length > 0, true);
  // every declared fail pattern actually trips classifyStatus (no dead patterns)
  for (const re of FAIL_PATTERNS) {
    const sample = { "not\\s+defined": "tool not defined", "error\\s+in\\s+block": "error in block 3",
      "\\balarm\\b": "alarm 5", "\\bfault\\b": "servo fault", "collision": "collision detected",
      "exceed": "travel exceed", "not\\s+allowed": "move not allowed", "invalid": "invalid value",
      "out\\s+of\\s+range": "out of range" }[re.source] || "error in block 1";
    assert.equal(classifyStatus(sample).ok, false, `pattern ${re} should flag '${sample}'`);
  }
});

test("classifyStatus adversarial: null/number/garbage never throw", () => {
  for (const v of [null, undefined, 12345, {}, [], "\x00%%%"]) assert.doesNotThrow(() => classifyStatus(v));
  assert.equal(classifyStatus(null).ok, true);
});

test("SOFTKEY_IDS: F1..F8 map to 301..308 (matches the live driver ids)", () => {
  assert.equal(SOFTKEY_IDS.F1, "301");
  assert.equal(SOFTKEY_IDS.F8, "308");
  assert.equal(Object.keys(SOFTKEY_IDS).length, 8);
});

test("runStep softkey: actuates via sendkeys {Fn} (PROVEN mechanism, NOT UIA invoke); unknown key fails loud", async () => {
  const d = mockDriver({ sendkeys: { ok: true } });
  const r = await runStep(d, { op: "softkey", key: "F2" });
  assert.equal(r.ok, true);
  assert.deepEqual(d.calls[0], { op: "sendkeys", args: ["{F2}"] }, "softkeys use a real keypress, not invoke");
  const bad = await runStep(mockDriver(), { op: "softkey", key: "F9" });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /unknown softkey/);
});

test("runStep set-value + sendkeys pass through to the driver with the right args", async () => {
  const d = mockDriver({ "set-value": { ok: true }, sendkeys: { ok: true } });
  await runStep(d, { op: "set-value", id: "tool1dia", value: 0.5 });
  assert.deepEqual(d.calls[0], { op: "set-value", args: ["tool1dia", "0.5"] });
  await runStep(d, { op: "sendkeys", keys: "{TAB}2{ENTER}" });
  assert.deepEqual(d.calls[1], { op: "sendkeys", args: ["{TAB}2{ENTER}"] });
});

test("runStep assert-status: clean passes, error fails (the autonomous PASS/FAIL gate)", async () => {
  const clean = mockDriver({ find: { ok: true, value: { matches: [{ name: "Enter part zero." }] } } });
  assert.equal((await runStep(clean, { op: "assert-status", expectClean: true })).ok, true);
  const err = mockDriver({ find: { ok: true, value: { matches: [{ name: "ERROR IN BLOCK 21: TOOL 1 IS NOT DEFINED." }] } } });
  const r = await runStep(err, { op: "assert-status", expectClean: true });
  assert.equal(r.ok, false);
  assert.match(r.error, /TOOL 1 IS NOT DEFINED/);
  // expectClean:false inverts (used to assert an error IS present, e.g. before tool setup)
  assert.equal((await runStep(err, { op: "assert-status", expectClean: false })).ok, true);
});

test("runMacro: runs steps in order and ABORTS on first failure (no blind continue)", async () => {
  const d = mockDriver({
    sendkeys: (args) => ({ ok: args[0] !== "{F3}" }),  // the F3 softkey fails
  });
  const macro = { name: "t", steps: [{ op: "softkey", key: "F2" }, { op: "softkey", key: "F3" }, { op: "softkey", key: "F1" }] };
  const r = await runMacro(d, macro);
  assert.equal(r.ok, false);
  assert.equal(r.failedAt, 1, "aborts at the F3 step");
  assert.equal(r.results.length, 2, "does NOT run the 3rd step after failure");
  assert.equal(d.calls.length, 2, "driver not called for the aborted step");
});

test("runMacro: all-clean macro succeeds end to end", async () => {
  const d = mockDriver({ invoke: { ok: true }, "set-value": { ok: true },
    find: { ok: true, value: { matches: [{ name: "Ready." }] } } });
  const macro = { name: "ok", steps: [
    { op: "softkey", key: "F2" }, { op: "set-value", id: "x", value: 1 }, { op: "wait", ms: 1 }, { op: "assert-status", expectClean: true },
  ] };
  const r = await runMacro(d, macro);
  assert.equal(r.ok, true);
  assert.equal(r.results.length, 4);
});

test("ensureUp: throws LOUD when WinMax is not reachable (never silently proceeds)", async () => {
  const down = mockDriver({ "window-info": { ok: false, error: "no window" } });
  await assert.rejects(() => ensureUp(down), /not reachable/);
  const up = mockDriver({ "window-info": { ok: true, value: { name: "WinMax Mill" } } });
  const info = await ensureUp(up);
  assert.equal(info.name, "WinMax Mill");
});

test("readStatus: joins UIA matches and classifies (no vision needed)", async () => {
  const d = mockDriver({ find: { ok: true, value: { matches: [{ name: "ERROR IN BLOCK 21: TOOL 1 IS NOT DEFINED." }, { name: "x" }] } } });
  const st = await readStatus(d);
  assert.equal(st.ok, false);
  assert.match(st.raw, /TOOL 1/);
});
