import { test } from "node:test";
import assert from "node:assert/strict";
import { isArmed, extractDriverSummary, runSweep } from "./hermes-fleet-sweep.mjs";

const T = Date.UTC(2026, 5, 30, 18, 0, 0);
const DAY = "2026-06-30";
const HOUR = 3600_000;

// An eligible base state: last swept 3h ago, no budget spent today.
const eligibleState = () => ({ lastSweepMs: T - 3 * HOUR, dailyCallsUsed: 0, budgetDay: DAY, sweeps: 1 });

/** Build injected deps that capture ledger rows + state writes and never touch disk. */
function harness(over = {}) {
  const ledger = [];
  const writes = [];
  const spawnCalls = [];
  const deps = {
    now: () => T,
    env: { PRISM_HERMES_FLEET_SWEEP: "0" },
    readState: () => eligibleState(),
    readIdleSlots: () => 8,
    appendLedger: (r) => { ledger.push(r); return r; },
    writeState: (s) => { writes.push(s); },
    spawn: (...a) => { spawnCalls.push(a); return JSON.stringify({ ranAgents: 3, picked: 3 }); },
    log: () => {},
    ...over,
  };
  return { deps, ledger, writes, spawnCalls };
}

test("isArmed: only explicit truthy arming tokens arm", () => {
  for (const v of ["1", "on", "true", "YES", "On"]) assert.equal(isArmed({ PRISM_HERMES_FLEET_SWEEP: v }), true, v);
  for (const v of ["0", "", "off", "no", undefined]) assert.equal(isArmed({ PRISM_HERMES_FLEET_SWEEP: v }), false, String(v));
  assert.equal(isArmed({}), false);
});

test("extractDriverSummary: clean JSON, JSON behind a warning line, and garbage", () => {
  assert.equal(extractDriverSummary('{"ranAgents":2,"picked":2}').ranAgents, 2);
  // a child notice leaked a line before the summary -> still extracted
  const withNoise = "some/path not found as a file; treating as text\n{\"ranAgents\":5,\"picked\":5}";
  assert.equal(extractDriverSummary(withNoise).ranAgents, 5);
  assert.deepEqual(extractDriverSummary("no json here"), {});
  assert.deepEqual(extractDriverSummary(""), {});
});

test("extractDriverSummary: pathological all-brace input terminates fast (no infinite loop / hang)", () => {
  // Regression: lastIndexOf("{", -1) returns 0 (not -1), so an input starting with '{' looped
  // forever. Must return {} quickly and never hang. Bounded by MAX_SUMMARY_SCAN_TRIES.
  const t = Date.now();
  for (const n of [1, 2, 100, 1000, 5000]) {
    assert.deepEqual(extractDriverSummary("{".repeat(n)), {});
  }
  // a real (pretty-printed, multi-line) summary embedded after noise still extracts
  const pretty = "child notice line\n{\n  \"ranAgents\": 4,\n  \"picked\": 4\n}\n";
  assert.equal(extractDriverSummary(pretty).ranAgents, 4);
  assert.ok(Date.now() - t < 2000, "must complete well under 2s (was an unbounded hang pre-fix)");
});

test("runSweep NO-FIRE: budget exhausted -> records, never spawns, never writes state", () => {
  const { deps, ledger, writes, spawnCalls } = harness({
    env: { PRISM_HERMES_FLEET_SWEEP: "1" }, // armed, but...
    readState: () => ({ lastSweepMs: T - 5 * HOUR, dailyCallsUsed: 99999, budgetDay: DAY }), // ...no budget
    spawn: () => { throw new Error("spawn must NOT be called when budget is exhausted"); },
  });
  const { receipt, exitCode } = runSweep(["--json", "--quiet"], deps);
  assert.equal(exitCode, 0);
  assert.equal(receipt.fired, false);
  assert.equal(receipt.plan.reason, "daily-budget-exhausted");
  assert.equal(spawnCalls.length, 0);
  assert.equal(writes.length, 0);          // no budget spent, no state mutation
  assert.equal(ledger.length, 1);
});

test("runSweep WOULD-FIRE: eligible but NOT armed -> wouldFire, spawns nothing, no budget spent", () => {
  const { deps, writes, spawnCalls } = harness({ env: { PRISM_HERMES_FLEET_SWEEP: "0" } });
  const { receipt } = runSweep(["--json", "--quiet"], deps);
  assert.equal(receipt.plan.fire, true);   // the PLAN says fire...
  assert.equal(receipt.fired, false);      // ...but un-armed suppresses the spawn
  assert.equal(receipt.wouldFire, true);
  assert.match(receipt.suppressedReason, /not-armed/);
  assert.equal(spawnCalls.length, 0);
  assert.equal(writes.length, 0);
});

test("runSweep ARMED: eligible + armed -> spawns driver, folds ranAgents into budget, persists", () => {
  const { deps, writes, spawnCalls } = harness({ env: { PRISM_HERMES_FLEET_SWEEP: "1" } });
  const { receipt } = runSweep(["--json", "--quiet"], deps);
  assert.equal(receipt.fired, true);
  assert.equal(receipt.agentsFired, 3);
  assert.equal(spawnCalls.length, 1);
  // the driver was invoked via tsx with --gate + the planned width
  const args = spawnCalls[0][1];
  assert.ok(args.includes("--gate"));
  assert.ok(args.includes("--max-units"));
  // budget folded: 0 + 3 fired -> 3 spent today, sweeps incremented
  assert.equal(writes.length, 1);
  assert.equal(writes[0].dailyCallsUsed, 3);
  assert.equal(writes[0].budgetDay, DAY);
  assert.equal(writes[0].sweeps, 2);
});

test("runSweep DRY-RUN: armed but --dry-run -> never spawns", () => {
  const { deps, writes, spawnCalls } = harness({
    env: { PRISM_HERMES_FLEET_SWEEP: "1" },
    spawn: () => { throw new Error("dry-run must NOT spawn"); },
  });
  const { receipt } = runSweep(["--json", "--quiet", "--dry-run"], deps);
  assert.equal(receipt.fired, false);
  assert.equal(receipt.wouldFire, true);
  assert.equal(spawnCalls.length, 0);
  assert.equal(writes.length, 0);
});
