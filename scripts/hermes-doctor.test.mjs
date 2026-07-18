/**
 * Tests for hermes-doctor.mjs pure helpers (HERMES-LAUNCH-RELIABILITY-MS0).
 * Run: node scripts/hermes-doctor.test.mjs   (node:test auto-runs on exit)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseDoctorArgs,
  hasIpv4Preference,
  classifyProxy,
  versionAtLeast,
  buildWarmBody,
  resolvePython,
  summarize,
  enabledCronJobs,
} from "./hermes-doctor.mjs";

test("parseDoctorArgs: defaults are all-on", () => {
  const o = parseDoctorArgs([]);
  assert.equal(o.json, false);
  assert.equal(o.warm, true);
  assert.equal(o.net, true);
  assert.equal(o.reap, true);
  assert.equal(o.config, true);
  assert.equal(o.error, null);
});

test("parseDoctorArgs: flags flip the right toggles", () => {
  const o = parseDoctorArgs(["--json", "--no-warm", "--no-net", "--no-reap", "--no-config", "--warm-model", "gpt-oss:20b"]);
  assert.equal(o.json, true);
  assert.equal(o.warm, false);
  assert.equal(o.net, false);
  assert.equal(o.reap, false);
  assert.equal(o.config, false);
  assert.equal(o.warmModel, "gpt-oss:20b");
});

test("parseDoctorArgs: unknown flag is an error", () => {
  assert.match(parseDoctorArgs(["--bogus"]).error, /unknown flag/);
});

test("parseDoctorArgs: --no-subproxy toggles the sub-proxy ensure step off (default on)", () => {
  assert.equal(parseDoctorArgs([]).subproxy, true);
  assert.equal(parseDoctorArgs(["--no-subproxy"]).subproxy, false);
  const o = parseDoctorArgs(["--no-warm", "--no-subproxy"]);
  assert.equal(o.subproxy, false);
  assert.equal(o.warm, false);
});

test("hasIpv4Preference: real netsh line with precedence 60 -> true", () => {
  const real = "Querying active state...\n\nPrecedence  Label  Prefix\n----------  -----  --------------------------------\n        60      1  ::ffff:0:0/96\n";
  assert.equal(hasIpv4Preference(real), true);
});

test("hasIpv4Preference: default precedence 35 (not preferred) -> false", () => {
  const def = "        35      4  ::ffff:0:0/96\n";
  assert.equal(hasIpv4Preference(def), false);
});

test("hasIpv4Preference: no ::ffff line / empty -> false", () => {
  assert.equal(hasIpv4Preference("        40      1  ::/0\n"), false);
  assert.equal(hasIpv4Preference(""), false);
  assert.equal(hasIpv4Preference(null), false);
});

test("classifyProxy: free / serving / dead", () => {
  assert.equal(classifyProxy({ listening: false, healthOk: false }), "free");
  assert.equal(classifyProxy({ listening: true, healthOk: true }), "serving");
  assert.equal(classifyProxy({ listening: true, healthOk: false }), "dead");
});

test("versionAtLeast: Blackwell gate 0.30.11", () => {
  assert.equal(versionAtLeast("0.30.11", "0.30.11"), true);   // equal
  assert.equal(versionAtLeast("0.30.8", "0.30.11"), false);   // the CPU-only build
  assert.equal(versionAtLeast("0.31.0", "0.30.11"), true);    // newer minor
  assert.equal(versionAtLeast("1.0.0", "0.30.11"), true);     // newer major
  assert.equal(versionAtLeast(null, "0.30.11"), false);
});

test("buildWarmBody: loads model resident at the >=64K ctx, single token", () => {
  const b = buildWarmBody("gpt-oss:120b", 65536);
  assert.equal(b.model, "gpt-oss:120b");
  assert.equal(b.stream, false);
  assert.equal(b.keep_alive, "30m");
  assert.equal(b.options.num_ctx, 65536);
  assert.equal(b.options.num_predict, 1);
});

test("resolvePython: first existing absolute path wins; bare name short-circuits", () => {
  const exists = (p) => p === "C:/has/python.exe";
  assert.equal(resolvePython(["C:/no/python.exe", "C:/has/python.exe"], exists), "C:/has/python.exe");
  assert.equal(resolvePython(["C:/no/python.exe", "python"], exists), "python"); // bare relies on PATH
  assert.equal(resolvePython(["C:/no/python.exe"], exists), null);
});

test("enabledCronJobs: only enabled jobs returned; disabled/empty -> []", () => {
  const obj = { jobs: [
    { id: "a", name: "live", enabled: true },
    { id: "b", name: "paused", enabled: false },
    { id: "c", name: "noflag" },
  ] };
  assert.deepEqual(enabledCronJobs(obj), [{ id: "a", name: "live" }]);
  assert.deepEqual(enabledCronJobs({ jobs: [] }), []);
  assert.deepEqual(enabledCronJobs(null), []);
  assert.deepEqual(enabledCronJobs({}), []);
});

test("summarize: verdict + exit code precedence (fail > warn > ok)", () => {
  assert.deepEqual(
    (({ verdict, exit }) => ({ verdict, exit }))(summarize([{ status: "ok" }, { status: "ok" }])),
    { verdict: "PASS", exit: 0 });
  assert.deepEqual(
    (({ verdict, exit }) => ({ verdict, exit }))(summarize([{ status: "ok" }, { status: "warn" }])),
    { verdict: "DEGRADED", exit: 1 });
  assert.deepEqual(
    (({ verdict, exit }) => ({ verdict, exit }))(summarize([{ status: "warn" }, { status: "fail" }])),
    { verdict: "FAIL", exit: 3 });
});
