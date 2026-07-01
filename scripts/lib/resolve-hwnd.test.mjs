// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA01 — tests for resolve-hwnd.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validatePid,
  parsePsOutput,
  resolveHwndFromPid,
  tryResolveHwnd,
} from "./resolve-hwnd.mjs";

describe("validatePid", () => {
  it("rejects null", () => {
    assert.deepEqual(validatePid(null), { ok: false, error: "pid-missing" });
  });
  it("rejects undefined", () => {
    assert.deepEqual(validatePid(undefined), { ok: false, error: "pid-missing" });
  });
  it("rejects NaN", () => {
    assert.deepEqual(validatePid(NaN), { ok: false, error: "pid-not-numeric" });
  });
  it("rejects Infinity", () => {
    assert.deepEqual(validatePid(Infinity), { ok: false, error: "pid-not-numeric" });
  });
  it("rejects non-integer float", () => {
    assert.deepEqual(validatePid(1234.5), { ok: false, error: "pid-not-integer" });
  });
  it("rejects zero", () => {
    assert.deepEqual(validatePid(0), { ok: false, error: "pid-not-positive" });
  });
  it("rejects negative", () => {
    assert.deepEqual(validatePid(-5), { ok: false, error: "pid-not-positive" });
  });
  it("rejects garbage string", () => {
    assert.deepEqual(validatePid("not-a-pid"), { ok: false, error: "pid-not-numeric" });
  });
  it("coerces numeric string", () => {
    assert.deepEqual(validatePid("12345"), { ok: true, pid: 12345 });
  });
  it("accepts positive integer", () => {
    assert.deepEqual(validatePid(46816), { ok: true, pid: 46816 });
  });
});

describe("parsePsOutput", () => {
  it("classifies non-zero exit as ps-failed with stderr reason", () => {
    const r = parsePsOutput("", "Cannot find process", 2);
    assert.equal(r.ok, false);
    assert.equal(r.error, "ps-failed");
    assert.equal(r.reason, "Cannot find process");
  });
  it("classifies non-zero exit with empty stderr as ps-exit-N", () => {
    const r = parsePsOutput("", "", 2);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "ps-exit-2");
  });
  it("classifies empty stdout as process-not-found", () => {
    assert.deepEqual(parsePsOutput("", "", 0), { ok: false, error: "process-not-found" });
  });
  it("classifies whitespace-only stdout as process-not-found", () => {
    assert.deepEqual(parsePsOutput("   \r\n  \n", "", 0), { ok: false, error: "process-not-found" });
  });
  it("classifies 0 as process-has-no-window", () => {
    assert.deepEqual(parsePsOutput("0\r\n", "", 0), { ok: false, error: "process-has-no-window" });
  });
  it("classifies negative integer as hwnd-negative", () => {
    assert.deepEqual(parsePsOutput("-1\r\n", "", 0), { ok: false, error: "hwnd-negative" });
  });
  it("classifies non-numeric output as ps-output-not-numeric", () => {
    const r = parsePsOutput("garbage-output\r\n", "", 0);
    assert.equal(r.ok, false);
    assert.equal(r.error, "ps-output-not-numeric");
    assert.equal(r.raw, "garbage-output");
  });
  it("accepts valid hwnd", () => {
    assert.deepEqual(parsePsOutput("459832\r\n", "", 0), { ok: true, hwnd: 459832 });
  });
  it("accepts large hwnd value", () => {
    assert.deepEqual(parsePsOutput("18874632\r\n", "", 0), { ok: true, hwnd: 18874632 });
  });
  it("takes first non-empty line when multi-line", () => {
    assert.deepEqual(parsePsOutput("\n\n  459832  \n\n123\n", "", 0), { ok: true, hwnd: 459832 });
  });
});

describe("resolveHwndFromPid", () => {
  it("returns platform-not-windows on non-Windows", () => {
    const r = resolveHwndFromPid(12345, { _platform: "linux", _spawn: () => { throw new Error("should not spawn"); } });
    assert.equal(r.ok, false);
    assert.equal(r.error, "platform-not-windows");
    assert.equal(r.platform, "linux");
  });
  it("returns pid-missing on null pid before spawning", () => {
    const r = resolveHwndFromPid(null, { _platform: "win32", _spawn: () => { throw new Error("should not spawn"); } });
    assert.deepEqual(r, { ok: false, error: "pid-missing" });
  });
  it("returns ok on successful spawn + valid hwnd", () => {
    const fakeSpawn = () => ({ stdout: "459832\n", stderr: "", status: 0, signal: null });
    const r = resolveHwndFromPid(12345, { _platform: "win32", _spawn: fakeSpawn });
    assert.deepEqual(r, { ok: true, hwnd: 459832 });
  });
  it("returns process-not-found on empty stdout", () => {
    const fakeSpawn = () => ({ stdout: "", stderr: "", status: 0, signal: null });
    const r = resolveHwndFromPid(12345, { _platform: "win32", _spawn: fakeSpawn });
    assert.deepEqual(r, { ok: false, error: "process-not-found" });
  });
  it("returns ps-failed on non-zero exit", () => {
    const fakeSpawn = () => ({ stdout: "", stderr: "BOOM", status: 2, signal: null });
    const r = resolveHwndFromPid(12345, { _platform: "win32", _spawn: fakeSpawn });
    assert.equal(r.ok, false);
    assert.equal(r.error, "ps-failed");
    assert.equal(r.reason, "BOOM");
  });
  it("returns spawn-signal on signaled spawn", () => {
    const fakeSpawn = () => ({ stdout: "", stderr: "", status: null, signal: "SIGKILL" });
    const r = resolveHwndFromPid(12345, { _platform: "win32", _spawn: fakeSpawn });
    assert.equal(r.ok, false);
    assert.equal(r.error, "spawn-signal");
    assert.equal(r.signal, "SIGKILL");
  });
  it("returns spawn-threw when _spawn throws", () => {
    const fakeSpawn = () => { throw new Error("ETIMEDOUT"); };
    const r = resolveHwndFromPid(12345, { _platform: "win32", _spawn: fakeSpawn });
    assert.equal(r.ok, false);
    assert.equal(r.error, "spawn-threw");
    assert.match(r.reason, /ETIMEDOUT/);
  });
  it("returns spawn-returned-null when _spawn returns null", () => {
    const fakeSpawn = () => null;
    const r = resolveHwndFromPid(12345, { _platform: "win32", _spawn: fakeSpawn });
    assert.equal(r.ok, false);
    assert.equal(r.error, "spawn-returned-null");
  });
});

describe("tryResolveHwnd (fail-soft)", () => {
  it("returns the hwnd on ok", () => {
    const fakeSpawn = () => ({ stdout: "459832\n", stderr: "", status: 0, signal: null });
    assert.equal(tryResolveHwnd(12345, { _platform: "win32", _spawn: fakeSpawn }), 459832);
  });
  it("returns null on any error (no throw)", () => {
    assert.equal(tryResolveHwnd(null), null);
    assert.equal(tryResolveHwnd(0), null);
    assert.equal(tryResolveHwnd("not-pid", { _platform: "win32", _spawn: () => ({ stdout: "", stderr: "", status: 0 }) }), null);
  });
});
