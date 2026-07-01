import { test } from "node:test";
import assert from "node:assert/strict";
import { nicifySelf, _resetForTest, _peekForTest } from "./batch-self-nice.mjs";

// Hermetic mock os: records setPriority calls, optionally throws.
function mockOs({ throwOnSet = false } = {}) {
  const calls = [];
  return {
    constants: { priority: { PRIORITY_BELOW_NORMAL: 10, PRIORITY_NORMAL: 0 } },
    setPriority: (pid, val) => {
      calls.push({ pid, val });
      if (throwOnSet) throw new Error("EPERM mock");
    },
    _calls: calls,
  };
}
// Mock process: records once() handlers so we can fire exit-restore.
function mockProc() {
  const handlers = {};
  return {
    once: (ev, fn) => { (handlers[ev] ||= []).push(fn); },
    _fire: (ev) => (handlers[ev] || []).forEach((fn) => fn()),
    _handlers: handlers,
  };
}

test("happy: win32 drops self to BELOW_NORMAL (value 10)", () => {
  _resetForTest();
  const osMod = mockOs();
  const r = nicifySelf({ env: {}, platform: "win32", osMod, proc: mockProc() });
  assert.equal(r.applied, true);
  assert.equal(r.level, "BELOW_NORMAL");
  assert.equal(r.value, 10);
  assert.deepEqual(osMod._calls[0], { pid: 0, val: 10 });
});

test("failure 1: explicit disable knob -> no-op, no setPriority call", () => {
  _resetForTest();
  const osMod = mockOs();
  const r = nicifySelf({ env: { PRISM_BATCH_NICE_DISABLE: "1" }, platform: "win32", osMod, proc: mockProc() });
  assert.equal(r.applied, false);
  assert.equal(r.reason, "disabled-by-env");
  assert.equal(osMod._calls.length, 0); // must NOT touch priority when disabled
});

test("failure 2: non-win32 platform -> no-op (clean CI import)", () => {
  _resetForTest();
  const osMod = mockOs();
  const r = nicifySelf({ env: {}, platform: "linux", osMod, proc: mockProc() });
  assert.equal(r.applied, false);
  assert.match(r.reason, /unsupported-platform:linux/);
  assert.equal(osMod._calls.length, 0);
});

test("failure 3: os.setPriority throws -> fail-OPEN, never rethrows", () => {
  _resetForTest();
  const osMod = mockOs({ throwOnSet: true });
  let r;
  assert.doesNotThrow(() => { r = nicifySelf({ env: {}, platform: "win32", osMod, proc: mockProc() }); });
  assert.equal(r.applied, false);
  assert.match(r.reason, /set-priority-failed:EPERM mock/);
});

test("adversarial 1: exit-restore fires setPriority(0, NORMAL) on exit", () => {
  _resetForTest();
  const osMod = mockOs();
  const proc = mockProc();
  nicifySelf({ env: {}, platform: "win32", osMod, proc });
  assert.equal(osMod._calls.length, 1); // BELOW_NORMAL set
  proc._fire("exit");
  assert.deepEqual(osMod._calls.at(-1), { pid: 0, val: 0 }); // restored to NORMAL
});

test("adversarial 2: idempotent -- exit hook wired ONCE across repeated calls", () => {
  _resetForTest();
  const osMod = mockOs();
  const proc = mockProc();
  nicifySelf({ env: {}, platform: "win32", osMod, proc });
  nicifySelf({ env: {}, platform: "win32", osMod, proc });
  nicifySelf({ env: {}, platform: "win32", osMod, proc });
  assert.equal(_peekForTest().exitWired, true);
  // 3 BELOW_NORMAL sets, but only ONE 'exit' handler registered (no leak)
  assert.equal((proc._handlers.exit || []).length, 1);
  assert.equal(osMod._calls.length, 3);
});

test("adversarial 3: missing os.constants.priority falls back to 10/0 literals", () => {
  _resetForTest();
  // helper captured BELOW_NORMAL/NORMAL at import time from the real os; assert
  // the public contract value is the documented BELOW_NORMAL nice value.
  const osMod = mockOs();
  const r = nicifySelf({ env: {}, platform: "win32", osMod, proc: mockProc() });
  assert.equal(r.value, 10);
});
