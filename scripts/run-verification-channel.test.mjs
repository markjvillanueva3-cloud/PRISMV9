// Tests for run-verification-channel.mjs (U-FORGE-VERIFY-CHANNEL). Real values;
// every assertion fails on a real gate regression (R9). spawn is injected.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decideVerification,
  parseCommand,
  readVerifiesVia,
  runVerification,
} from "./run-verification-channel.mjs";

// ---- decideVerification: the BINDING gate logic ----
test("decideVerification: exit 0, no signal -> PASS", () => {
  const r = decideVerification({ exitCode: 0 });
  assert.equal(r.pass, true);
});
test("decideVerification: non-zero exit -> FAIL (the gate bites)", () => {
  assert.equal(decideVerification({ exitCode: 1 }).pass, false);
  assert.equal(decideVerification({ exitCode: 2 }).pass, false);
  assert.equal(decideVerification({ exitCode: -1 }).pass, false); // killed/timeout
});
test("decideVerification: exit 0 but required signal MISSING -> FAIL", () => {
  const r = decideVerification({ exitCode: 0, stdout: "all good", expectSignal: "Tests.*passed" });
  assert.equal(r.pass, false);
  assert.match(r.reason, /signal/);
});
test("decideVerification: exit 0 + signal present -> PASS", () => {
  const r = decideVerification({ exitCode: 0, stdout: "# Tests 16 passed", expectSignal: "Tests.*passed" });
  assert.equal(r.pass, true);
});
test("decideVerification: signal matched in stderr too", () => {
  const r = decideVerification({ exitCode: 0, stdout: "", stderr: "BUILD OK", expectSignal: "BUILD OK" });
  assert.equal(r.pass, true);
});
test("decideVerification: did-not-run -> FAIL loud (R12)", () => {
  const r = decideVerification({ ran: false });
  assert.equal(r.pass, false);
  assert.match(r.reason, /did not run/);
});
test("decideVerification: invalid regex signal -> FAIL (never crashes)", () => {
  const r = decideVerification({ exitCode: 0, stdout: "x", expectSignal: "(" });
  assert.equal(r.pass, false);
  assert.match(r.reason, /invalid expect-signal/);
});

// ---- parseCommand: no-shell tokenization (injection-safe) ----
test("parseCommand: splits argv, strips quotes", () => {
  assert.deepEqual(parseCommand('node x.mjs --json'), ["node", "x.mjs", "--json"]);
  assert.deepEqual(parseCommand('vitest run "a b.test.ts"'), ["vitest", "run", "a b.test.ts"]);
});
test("parseCommand: null/empty/junk -> null", () => {
  for (const bad of [null, undefined, "", "   ", 42]) assert.equal(parseCommand(bad), null);
});

// ---- readVerifiesVia: extract the declared channel from a spec ----
test("readVerifiesVia: nested YAML block form", () => {
  const spec = "---\nid: U-X\nverifies_via:\n  channel: test\n  tool: node scripts/declared-vs-actual.mjs --json\n---\nbody";
  assert.equal(readVerifiesVia(spec), "node scripts/declared-vs-actual.mjs --json");
});
test("readVerifiesVia: inline form", () => {
  assert.equal(readVerifiesVia("verifies_via: tool: vitest run x"), "vitest run x");
});
test("readVerifiesVia: absent -> null", () => {
  assert.equal(readVerifiesVia("no channel here"), null);
  assert.equal(readVerifiesVia(null), null);
});

// ---- runVerification: end-to-end with injected spawn (no real subprocess) ----
const fakeSpawn = (status, stdout = "", stderr = "", signal = null) => () => ({ status, stdout, stderr, signal });

test("runVerification: passing command -> ran + pass", () => {
  const r = runVerification({ tool: "node x.mjs", spawnImpl: fakeSpawn(0, "# Tests 5 passed") });
  assert.equal(r.ran, true);
  assert.equal(r.pass, true);
  assert.equal(r.exitCode, 0);
});
test("runVerification: failing command -> fail with exit code", () => {
  const r = runVerification({ tool: "node x.mjs", spawnImpl: fakeSpawn(1, "", "boom") });
  assert.equal(r.pass, false);
  assert.equal(r.exitCode, 1);
});
test("runVerification: exit 0 but signal required + missing -> fail (the real gate)", () => {
  const r = runVerification({ tool: "node x.mjs", expectSignal: "16 passed", spawnImpl: fakeSpawn(0, "only 15 passed") });
  assert.equal(r.pass, false);
});
test("runVerification: killed (timeout, signal set, status null) -> fail", () => {
  const r = runVerification({ tool: "node x.mjs", spawnImpl: fakeSpawn(null, "", "", "SIGTERM") });
  assert.equal(r.pass, false);
  assert.equal(r.exitCode, -1);
});
test("runVerification: spawn throws -> ran:false, fail (never crashes)", () => {
  const r = runVerification({ tool: "node x.mjs", spawnImpl: () => { throw new Error("ENOENT"); } });
  assert.equal(r.ran, false);
  assert.equal(r.pass, false);
});
test("runVerification: empty tool -> ran:false fail", () => {
  const r = runVerification({ tool: "", spawnImpl: fakeSpawn(0) });
  assert.equal(r.ran, false);
  assert.equal(r.pass, false);
});
