/**
 * fleet-task-health-watch.test.mjs — behavioral test suite for the
 * scheduled-task health watchdog (scripts/fleet-task-health-watch.mjs).
 *
 * Covers the six pure exported functions with real-value assertions. Every
 * test encodes WHY the behavior matters; the suite fails loudly if a future
 * edit reverts a load-bearing property.
 *
 * KEY REGRESSION GUARDS (these caught real bugs during the 2026-05-17 build):
 *   - classifyTask must NEVER classify a small script exit code (1/2/3) as
 *     `failing`. PRISM monitors use exit 1/2/3 as FINDINGS (warn/critical/
 *     measurement-fail), not crashes. The first cut treated every nonzero
 *     LastTaskResult as a failure and false-flagged Fleet Memory Monitor +
 *     Synergy Watch (both had simply exited 1). See the "small exit code"
 *     tests below — a revert here re-breaks the watchdog fleet-wide.
 *   - aggregateHealth must classify an EMPTY task set as `critical` (the whole
 *     safety net is gone), never `clean`.
 *
 * Uses node:test (NOT vitest) — the scripts/ test convention; the .claude/
 * vitest config has a known transform bug. node:test runs clean.
 *   Run: node --test H:/prism/scripts/__tests__/fleet-task-health-watch.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseIso8601Duration,
  smallestIntervalMs,
  isLaunchFailureCode,
  isTransientPressureCode,
  classifyTask,
  aggregateHealth,
  isMigrationFreezeActive,
  decideAdvisory,
  discoverInstallerTasks,
  detectInstallerDrift,
  MUST_EXIST_TASKS,
  CRASH_CRITICAL_TASKS,
  KNOWN_PRISM_TASKS,
  selectReenableTargets,
  reenableTasks,
  buildReenableLedgerRows,
  appendReenableLedger,
} from "../fleet-task-health-watch.mjs";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pjoin } from "node:path";

// Synthetic task-name sets for aggregateHealth — deliberately NOT the real
// 8-task list, so these tests stay correct if the real list changes.
const AGG_CFG = {
  mustExist: ["TaskA", "TaskB"],
  crashCritical: ["TaskA", "TaskB", "TaskC"],
  knownTasks: ["TaskA", "TaskB", "TaskC", "TaskD"],
};
const CLASSIFY_CFG = { staleMultiplier: 3 };
const FIVE_MIN_MS = 5 * 60 * 1000;

// ─── parseIso8601Duration ───────────────────────────────────────────────────

test("parseIso8601Duration: minutes / hours / days / seconds", () => {
  assert.equal(parseIso8601Duration("PT5M"), 300_000);
  assert.equal(parseIso8601Duration("PT1H"), 3_600_000);
  assert.equal(parseIso8601Duration("P1D"), 86_400_000);
  assert.equal(parseIso8601Duration("PT30S"), 30_000);
  assert.equal(parseIso8601Duration("P1DT12H"), 86_400_000 + 12 * 3_600_000);
});

test("parseIso8601Duration: empty / bare / malformed → null", () => {
  assert.equal(parseIso8601Duration("P"), null, "bare P has no components");
  assert.equal(parseIso8601Duration("PT"), null, "bare PT has no components");
  assert.equal(parseIso8601Duration(""), null);
  assert.equal(parseIso8601Duration("5M"), null, "missing the P prefix");
  assert.equal(parseIso8601Duration("garbage"), null);
  assert.equal(parseIso8601Duration("P1W"), null, "weeks are not a valid Task Scheduler interval");
  assert.equal(parseIso8601Duration(null), null);
  assert.equal(parseIso8601Duration(undefined), null);
  assert.equal(parseIso8601Duration(300000), null, "non-string input");
});

// ─── smallestIntervalMs ─────────────────────────────────────────────────────

test("smallestIntervalMs: picks the shortest interval", () => {
  assert.equal(smallestIntervalMs(["PT5M", "PT1H"]), 300_000);
  assert.equal(smallestIntervalMs(["PT1H", "PT10M", "PT30M"]), 600_000);
});

test("smallestIntervalMs: no usable interval → null (task is staleness-exempt)", () => {
  assert.equal(smallestIntervalMs([]), null, "AtStartup-only task has no repetition");
  assert.equal(smallestIntervalMs(["", "garbage"]), null);
  assert.equal(smallestIntervalMs([null, "PT10M"]), 600_000, "skips the unparseable, keeps the valid");
  assert.equal(smallestIntervalMs("PT5M"), null, "non-array input");
  assert.equal(smallestIntervalMs(null), null);
});

// ─── isLaunchFailureCode ────────────────────────────────────────────────────

test("isLaunchFailureCode: small script exit codes are NOT launch failures", () => {
  // THE load-bearing distinction — PRISM monitors exit 1/2/3 as findings.
  assert.equal(isLaunchFailureCode(0), false, "success");
  assert.equal(isLaunchFailureCode(1), false, "fleet-memory-monitor 'warn' finding");
  assert.equal(isLaunchFailureCode(2), false, "fleet-memory-monitor 'critical' finding");
  assert.equal(isLaunchFailureCode(3), false, "monitor 'measurement-fail' finding");
  assert.equal(isLaunchFailureCode(255), false, "still a small exit code");
  assert.equal(isLaunchFailureCode(0x41301), false, "Task Scheduler 'currently running' status");
});

test("isLaunchFailureCode: Windows HRESULT/NTSTATUS codes ARE launch failures", () => {
  assert.equal(isLaunchFailureCode(0x80070002), true, "ERROR_FILE_NOT_FOUND as HRESULT");
  assert.equal(isLaunchFailureCode(0x80070005), true, "ERROR_ACCESS_DENIED as HRESULT");
  assert.equal(isLaunchFailureCode(0xC0000005), true, "STATUS_ACCESS_VIOLATION");
  // PowerShell may surface an HRESULT as a signed int32 — normalize via >>> 0.
  assert.equal(isLaunchFailureCode(-2147024894), true, "0x80070002 as a signed int32");
});

test("isLaunchFailureCode: non-finite / null inputs → false", () => {
  assert.equal(isLaunchFailureCode(NaN), false);
  assert.equal(isLaunchFailureCode(null), false);
  assert.equal(isLaunchFailureCode(undefined), false);
});

// ─── classifyTask ───────────────────────────────────────────────────────────

const NOW = Date.parse("2026-05-17T20:00:00.000Z");

test("classifyTask: Ready + result 0 + recent run → healthy", () => {
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: NOW - 60_000, lastTaskResult: 0, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "healthy");
});

test("classifyTask: small exit code 1/2/3 is NOT failing (the regression guard)", () => {
  // A monitor that ran fine and exited 1 to report a finding is a HEALTHY
  // task. Reverting this re-breaks task-health detection fleet-wide.
  for (const code of [1, 2, 3]) {
    const v = classifyTask(
      { state: "Ready", lastRunTimeMs: NOW - 60_000, lastTaskResult: code, intervalMs: FIVE_MIN_MS },
      NOW, CLASSIFY_CFG,
    );
    assert.equal(v.status, "healthy", `exit code ${code} is a finding, not a task failure`);
  }
});

test("classifyTask: Windows launch-failure HRESULT → failing", () => {
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: NOW - 60_000, lastTaskResult: 0x80070002, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "failing");
  assert.match(v.reason, /0x80070002/i);
});

test("classifyTask: Disabled state → disabled (beats every other signal)", () => {
  const v = classifyTask(
    { state: "Disabled", lastRunTimeMs: NOW - 60_000, lastTaskResult: 0, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "disabled");
});

test("classifyTask: no LastRunTime → never-ran", () => {
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: null, lastTaskResult: 0, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "never-ran");
});

test("classifyTask: last run older than interval×multiplier → stale", () => {
  // interval 5min × multiplier 3 = 15min limit. 20min ago → stale.
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: NOW - 20 * 60_000, lastTaskResult: 0, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "stale");
});

test("classifyTask: just inside the stale window → still healthy", () => {
  // 10min ago, limit 15min → healthy.
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: NOW - 10 * 60_000, lastTaskResult: 0, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "healthy");
});

test("classifyTask: exactly at the stale boundary → still healthy (strict >)", () => {
  // age === interval×multiplier (precisely 15min). The stale check is
  // `ageMs > limitMs` (strict), so a precisely-aligned LastRunTime is healthy,
  // not stale — a revert to `>=` would flip this and false-flag on-time tasks.
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: NOW - 15 * 60_000, lastTaskResult: 0, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "healthy");
});

test("classifyTask: stale-by-lastRun but a FUTURE NextRunTime -> healthy (overnight-windowed task waiting)", () => {
  // interval 5min x 3 = 15min limit. lastRun 5h ago (far past the stale window) BUT
  // NextRun is 2h in the future -- an overnight-windowed task (daily trigger +
  // bounded repetition window) idle during the day. NOT stale, it is waiting.
  // Regression: this exact false-flag fired "PRISM CAD Gen Loop=stale" every afternoon.
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: NOW - 5 * 60 * 60_000, nextRunTimeMs: NOW + 2 * 60 * 60_000, lastTaskResult: 0, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "healthy");
});

test("classifyTask: stale-by-lastRun with NO upcoming run (null NextRun) -> still stale (not masked)", () => {
  // Same far-past lastRun but nothing scheduled ahead -> genuinely stale, must still flag.
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: NOW - 5 * 60 * 60_000, nextRunTimeMs: null, lastTaskResult: 0, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "stale");
});

test("classifyTask: no interval → staleness check skipped (an old run stays healthy)", () => {
  // An AtStartup-only task (intervalMs null) cannot be judged stale.
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: NOW - 100 * 60 * 60_000, lastTaskResult: 0, intervalMs: null },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "healthy");
});

test("classifyTask: Running state is operational → healthy", () => {
  const v = classifyTask(
    { state: "Running", lastRunTimeMs: NOW - 5_000, lastTaskResult: 0x41301, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "healthy");
});

test("classifyTask: unrecognized state → unknown-state", () => {
  const v = classifyTask(
    { state: "Unknown", lastRunTimeMs: NOW - 60_000, lastTaskResult: 0, intervalMs: FIVE_MIN_MS },
    NOW, CLASSIFY_CFG,
  );
  assert.equal(v.status, "unknown-state");
});

// ─── aggregateHealth ────────────────────────────────────────────────────────

const healthy = (name) => ({ name, status: "healthy", reason: "ok" });
const degraded = (name, status) => ({ name, status, reason: `${status} reason` });

test("aggregateHealth: every task healthy → clean", () => {
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), healthy("TaskD")],
    AGG_CFG,
  );
  assert.equal(r.level, "clean");
  assert.equal(r.missing.length, 0);
  assert.equal(r.degraded.length, 0);
});

test("aggregateHealth: EMPTY task set → critical (the safety net is gone)", () => {
  // Zero PRISM tasks enumerated → all known tasks missing → both MUST_EXIST
  // tasks missing → critical. Must NEVER report clean.
  const r = aggregateHealth([], AGG_CFG);
  assert.equal(r.level, "critical");
  assert.equal(r.missing.length, 4, "all four known tasks are missing");
  assert.ok(r.missing.includes("TaskA") && r.missing.includes("TaskB"));
});

test("aggregateHealth: a MUST_EXIST task disabled → critical", () => {
  const r = aggregateHealth(
    [degraded("TaskA", "disabled"), healthy("TaskB"), healthy("TaskC"), healthy("TaskD")],
    AGG_CFG,
  );
  assert.equal(r.level, "critical");
});

test("aggregateHealth: a MUST_EXIST task failing → critical", () => {
  const r = aggregateHealth(
    [degraded("TaskB", "failing"), healthy("TaskA"), healthy("TaskC"), healthy("TaskD")],
    AGG_CFG,
  );
  assert.equal(r.level, "critical");
});

test("aggregateHealth: a single non-critical task stale → warn", () => {
  // TaskD is not in mustExist nor crashCritical — its staleness is a warn.
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), degraded("TaskD", "stale")],
    AGG_CFG,
  );
  assert.equal(r.level, "warn");
});

test("aggregateHealth: 2 crash-critical tasks degraded → critical", () => {
  // TaskC is crash-critical but not must-exist; TaskA is both. Two crash-
  // critical tasks degraded (one only stale) escalates to critical.
  const r = aggregateHealth(
    [degraded("TaskA", "stale"), healthy("TaskB"), degraded("TaskC", "stale"), healthy("TaskD")],
    AGG_CFG,
  );
  assert.equal(r.level, "critical");
});

test("aggregateHealth: 1 crash-critical task only stale → warn (not critical)", () => {
  // A single soft degradation of a crash-critical task is a warn — staleness
  // can be a transient (host asleep); it is not, alone, a critical.
  const r = aggregateHealth(
    [degraded("TaskC", "stale"), healthy("TaskA"), healthy("TaskB"), healthy("TaskD")],
    AGG_CFG,
  );
  assert.equal(r.level, "warn");
});

test("aggregateHealth: a known task missing (non-must-exist) → warn", () => {
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC")], // TaskD absent
    AGG_CFG,
  );
  assert.equal(r.level, "warn");
  assert.deepEqual(r.missing, ["TaskD"]);
});

test("aggregateHealth: an expected-unregistered absent task → clean (deferred, not missing)", () => {
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC")], // TaskD absent BUT expected
    { ...AGG_CFG, expectedUnregistered: ["TaskD"] },
  );
  assert.equal(r.level, "clean", "a deliberately-deferred task must NOT escalate to warn");
  assert.deepEqual(r.missing, [], "it is NOT real-missing");
  assert.deepEqual(r.expectedUnregistered, ["TaskD"], "it IS surfaced as expectedUnregistered");
  assert.ok(
    r.reasons.some((x) => /TaskD: deferred \(informational\)/.test(x)),
    "surfaced in reasons as a deferral, not an alarm",
  );
});

test("aggregateHealth: deferral does NOT mask a co-occurring REAL missing task", () => {
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB")], // TaskC and TaskD both absent
    { ...AGG_CFG, expectedUnregistered: ["TaskD"] },
  );
  assert.equal(r.level, "warn", "TaskC is a genuine missing safety net → still warns");
  assert.deepEqual(r.missing, ["TaskC"], "only the un-deferred absent task is real-missing");
  assert.deepEqual(r.expectedUnregistered, ["TaskD"]);
});

test("aggregateHealth: an expected-unregistered MUST_EXIST task does NOT false-critical", () => {
  // Invariant guard: even if a deferred task were promoted to MUST_EXIST, the
  // operator-acknowledged deferral must never read as a load-bearing-task-down.
  const r = aggregateHealth(
    [healthy("TaskB"), healthy("TaskC"), healthy("TaskD")], // TaskA (a MUST_EXIST) absent but expected
    { ...AGG_CFG, expectedUnregistered: ["TaskA"] },
  );
  assert.equal(r.level, "clean", "a deferred MUST_EXIST task is not 'hard down'");
  assert.deepEqual(r.mustExistHardDown, [], "deferral keeps it off the hard-down list");
  assert.deepEqual(r.expectedUnregistered, ["TaskA"]);
});

test("aggregateHealth: deferral is gated on ABSENCE — a present task listed expected is NOT deferred", () => {
  // Adversarial: `expectedUnregistered` is derived from the ABSENT set, so a
  // task that IS registered (present + healthy) must never be reported as
  // deferred even if its name appears in the expected-unregistered config.
  // Locks the "deferral gated on absence" invariant against a future refactor
  // that derived the deferred set from the raw config list instead of `absent`.
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), healthy("TaskD")], // ALL present
    { ...AGG_CFG, expectedUnregistered: ["TaskD"] }, // TaskD is present, so not deferred
  );
  assert.equal(r.level, "clean");
  assert.deepEqual(r.expectedUnregistered, [], "a present task is never 'deferred'");
  assert.deepEqual(r.missing, [], "and never 'missing'");
  assert.ok(
    !r.reasons.some((x) => /deferred \(informational\)/.test(x)),
    "no deferred reason emitted for a present task",
  );
});

// ─── expectedDisabled (registered-but-deliberately-paused freeze tasks) ──────

test("aggregateHealth: a registered-but-DISABLED expected task → clean (paused, not degraded)", () => {
  // The cry-wolf fix: a freeze task the operator deliberately disabled must NOT
  // hold the safety-net alert at warn for a state the operator chose.
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), degraded("TaskD", "disabled")],
    { ...AGG_CFG, expectedDisabled: ["TaskD"] },
  );
  assert.equal(r.level, "clean", "a deliberately-paused freeze task must NOT escalate to warn");
  assert.deepEqual(r.expectedDisabled, ["TaskD"], "it IS surfaced as expectedDisabled");
  assert.ok(!r.degraded.some((t) => t.name === "TaskD"), "and excluded from degraded");
  assert.ok(
    r.reasons.some((x) => /TaskD: disabled \(informational\)/.test(x)),
    "surfaced in reasons as a deliberate pause, not an alarm",
  );
});

test("aggregateHealth: pausing one freeze task does NOT mask a co-occurring REAL disabled task", () => {
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), degraded("TaskC", "disabled"), degraded("TaskD", "disabled")],
    { ...AGG_CFG, expectedDisabled: ["TaskD"] }, // only TaskD is an expected pause
  );
  assert.equal(r.level, "warn", "TaskC is a genuine disabled safety net → still warns");
  assert.ok(r.degraded.some((t) => t.name === "TaskC"), "the un-listed disabled task is still degraded");
  assert.deepEqual(r.expectedDisabled, ["TaskD"], "only the listed task is partitioned out");
});

test("aggregateHealth: STRICT status gate — a listed task that is FAILING is NOT suppressed", () => {
  // R12 guard: only the exact `disabled` status is an expected pause. A freeze
  // task that the operator re-enabled and which then WEDGED (failing) is a real
  // signal and must re-surface as degraded — never silently swallowed.
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), degraded("TaskD", "failing")],
    { ...AGG_CFG, expectedDisabled: ["TaskD"] },
  );
  assert.equal(r.level, "warn", "a failing freeze task is a real degradation");
  assert.deepEqual(r.expectedDisabled, [], "failing ≠ disabled → not an expected pause");
  assert.ok(r.degraded.some((t) => t.name === "TaskD"), "it stays in degraded");
});

test("aggregateHealth: STRICT status gate — a listed task that is STALE is NOT suppressed", () => {
  // Staleness on a task means it is registered+enabled but not firing on
  // schedule — a real "should be running but isn't" signal, distinct from a
  // deliberate disable. Never swallow it via the disabled-only partition.
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), degraded("TaskD", "stale")],
    { ...AGG_CFG, expectedDisabled: ["TaskD"] },
  );
  assert.equal(r.level, "warn", "a stale freeze task still warns");
  assert.deepEqual(r.expectedDisabled, [], "stale ≠ disabled → not an expected pause");
  assert.ok(r.degraded.some((t) => t.name === "TaskD"), "it stays in degraded");
});

test("aggregateHealth: a listed task that is actually HEALTHY is not falsely reported as paused", () => {
  // Adversarial: the partition is gated on the live `disabled` status, so a
  // freeze task the operator re-enabled (now healthy) must never read as paused.
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), healthy("TaskD")],
    { ...AGG_CFG, expectedDisabled: ["TaskD"] },
  );
  assert.equal(r.level, "clean");
  assert.deepEqual(r.expectedDisabled, [], "a healthy task is never an 'expected pause'");
  assert.ok(
    !r.reasons.some((x) => /disabled \(informational\)/.test(x)),
    "no pause reason emitted for a healthy task",
  );
});

// ─── isMigrationFreezeActive (the marker that tracks the ~47-task freeze) ─────

test("isMigrationFreezeActive: env override 1/true → active, 0/false → inactive", () => {
  const noFile = () => false;
  assert.equal(isMigrationFreezeActive({ env: { PRISM_MIGRATION_FREEZE_ACTIVE: "1" }, exists: noFile }), true);
  assert.equal(isMigrationFreezeActive({ env: { PRISM_MIGRATION_FREEZE_ACTIVE: "true" }, exists: noFile }), true);
  // env "0" overrides even a PRESENT flag file → inactive (operator force-off)
  assert.equal(isMigrationFreezeActive({ env: { PRISM_MIGRATION_FREEZE_ACTIVE: "0" }, exists: () => true }), false);
  assert.equal(isMigrationFreezeActive({ env: { PRISM_MIGRATION_FREEZE_ACTIVE: "false" }, exists: () => true }), false);
});

test("isMigrationFreezeActive: no env → driven by the flag file's existence", () => {
  assert.equal(isMigrationFreezeActive({ env: {}, exists: () => true }), true, "flag present → active");
  assert.equal(isMigrationFreezeActive({ env: {}, exists: () => false }), false, "flag absent → inactive");
});

test("isMigrationFreezeActive: a read error fails SOFT to inactive (flag, never suppress)", () => {
  const thrower = () => { throw new Error("EACCES"); };
  assert.equal(isMigrationFreezeActive({ env: {}, exists: thrower }), false);
});

// ─── aggregateHealth × migration-freeze marker ──────────────────────────────

test("aggregateHealth: freeze ACTIVE → a non-load-bearing disabled task is an expected pause → clean", () => {
  // The real cry-wolf fix: while the freeze is active, the ~47 deliberately-
  // disabled non-critical tasks must NOT hold the safety net at warn.
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), degraded("TaskD", "disabled")],
    { ...AGG_CFG, migrationFreezeActive: true }, // TaskD is not must-exist / crash-critical
  );
  assert.equal(r.level, "clean", "a frozen non-critical disabled task does not warn");
  assert.deepEqual(r.expectedDisabled, ["TaskD"], "partitioned by the marker, no static list needed");
  assert.ok(!r.degraded.some((t) => t.name === "TaskD"));
});

test("aggregateHealth: freeze ACTIVE does NOT excuse a disabled MUST_EXIST task → still critical", () => {
  // The load-bearing guard: the operator would never freeze a reaper, so a
  // disabled must-exist task is a REAL down even during the freeze.
  const r = aggregateHealth(
    [degraded("TaskA", "disabled"), healthy("TaskB"), healthy("TaskC"), healthy("TaskD")],
    { ...AGG_CFG, migrationFreezeActive: true }, // TaskA ∈ mustExist
  );
  assert.equal(r.level, "critical", "a disabled load-bearing task is never auto-excused by the freeze");
  assert.ok(r.mustExistHardDown.includes("TaskA"));
  assert.ok(!r.expectedDisabled.includes("TaskA"), "must-exist is excluded from the freeze pass");
});

test("aggregateHealth: freeze ACTIVE does NOT excuse a disabled crash-critical task → stays degraded", () => {
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), degraded("TaskC", "disabled"), healthy("TaskD")],
    { ...AGG_CFG, migrationFreezeActive: true }, // TaskC ∈ crashCritical (not mustExist)
  );
  assert.ok(!r.expectedDisabled.includes("TaskC"), "crash-critical is excluded from the freeze pass");
  assert.ok(r.degraded.some((t) => t.name === "TaskC"), "stays a real degradation");
  assert.equal(r.level, "warn", "one crash-critical degraded → warn (≥2 would be critical)");
});

test("aggregateHealth: freeze INACTIVE → a non-critical disabled task still degrades (no silent suppression)", () => {
  // The staleness-trap guard: once the marker clears, disabled tasks must resume
  // flagging immediately — the whole point of a marker over a static allowlist.
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), degraded("TaskD", "disabled")],
    { ...AGG_CFG, migrationFreezeActive: false },
  );
  assert.equal(r.level, "warn", "no freeze → a disabled task is a real degradation again");
  assert.deepEqual(r.expectedDisabled, [], "nothing partitioned when the marker is off");
  assert.ok(r.degraded.some((t) => t.name === "TaskD"));
});

test("aggregateHealth: freeze ACTIVE does NOT excuse a STALE task (only the exact disabled status)", () => {
  const r = aggregateHealth(
    [healthy("TaskA"), healthy("TaskB"), healthy("TaskC"), degraded("TaskD", "stale")],
    { ...AGG_CFG, migrationFreezeActive: true },
  );
  assert.equal(r.level, "warn", "a stale task is 'should be firing but isn't' — never a freeze pause");
  assert.deepEqual(r.expectedDisabled, []);
  assert.ok(r.degraded.some((t) => t.name === "TaskD"));
});

// ─── decideAdvisory ─────────────────────────────────────────────────────────

const ADV_CFG = { cooldownSec: 900 };
const T0 = Date.parse("2026-05-17T20:00:00.000Z");

test("decideAdvisory: clean → never emits", () => {
  const r = decideAdvisory("clean", { lastAdvisoryAt: null, lastLevel: null }, T0, ADV_CFG);
  assert.equal(r.emit, false);
  assert.equal(r.newLedger.lastLevel, "clean");
});

test("decideAdvisory: first critical → emits", () => {
  const r = decideAdvisory("critical", { lastAdvisoryAt: null, lastLevel: null }, T0, ADV_CFG);
  assert.equal(r.emit, true);
  assert.equal(r.newLedger.lastAdvisoryAt, new Date(T0).toISOString());
});

test("decideAdvisory: repeat critical within cooldown → suppressed", () => {
  const ledger = { lastAdvisoryAt: new Date(T0).toISOString(), lastLevel: "critical" };
  const r = decideAdvisory("critical", ledger, T0 + 60_000, ADV_CFG); // 1min later
  assert.equal(r.emit, false);
  assert.equal(r.reason, "cooldown");
});

test("decideAdvisory: warn→critical escalation bypasses the cooldown", () => {
  // A recent warn advisory must NOT silence a fresh critical.
  const ledger = { lastAdvisoryAt: new Date(T0).toISOString(), lastLevel: "warn" };
  const r = decideAdvisory("critical", ledger, T0 + 60_000, ADV_CFG); // still in cooldown
  assert.equal(r.emit, true, "escalation overrides cooldown");
  assert.equal(r.reason, "escalation");
});

test("decideAdvisory: warn after the cooldown elapsed → emits", () => {
  const ledger = { lastAdvisoryAt: new Date(T0).toISOString(), lastLevel: "warn" };
  const r = decideAdvisory("warn", ledger, T0 + 16 * 60_000, ADV_CFG); // 16min > 15min cooldown
  assert.equal(r.emit, true);
});

// ─── exported task-name constants — structural invariant ────────────────────

test("task-name lists: MUST_EXIST ⊆ CRASH_CRITICAL ⊆ KNOWN_PRISM_TASKS", () => {
  // A must-exist task that is not crash-critical, or a crash-critical task not
  // in the known set, would make missing-detection inconsistent.
  for (const n of MUST_EXIST_TASKS) {
    assert.ok(CRASH_CRITICAL_TASKS.includes(n), `${n} must be in CRASH_CRITICAL_TASKS`);
  }
  for (const n of CRASH_CRITICAL_TASKS) {
    assert.ok(KNOWN_PRISM_TASKS.includes(n), `${n} must be in KNOWN_PRISM_TASKS`);
  }
  assert.ok(MUST_EXIST_TASKS.length >= 2, "Fleet Reaper + Fleet Memory Monitor at minimum");
});

// ─── discoverInstallerTasks (U-FTH-FOLLOWUP-SELF-DISC) ──────────────────────

/**
 * Build a fake helpers-dir IO map with the given file→content fixture.
 * Mirrors the existing fail-soft injection pattern in this file.
 */
function mkInstallerIO(files) {
  return {
    existsSync: () => true,
    readdirSync: () => Object.keys(files),
    readFileSync: (path) => {
      // emulate join(helpersDir, fname) — match on the trailing basename.
      for (const [name, body] of Object.entries(files)) {
        if (typeof path === "string" && path.endsWith(name)) return body;
      }
      throw new Error("ENOENT");
    },
  };
}

test("discoverInstallerTasks: missing helpers dir returns empty Set", () => {
  const result = discoverInstallerTasks({
    helpersDir: "C:/no/such/path",
    _io: { existsSync: () => false, readdirSync: () => { throw new Error("should not be called"); }, readFileSync: () => "" },
  });
  assert.ok(result instanceof Set);
  assert.equal(result.size, 0);
});

// NOTE (U-HERMES-FTH-DRIFT-SYNC): discovery now GATES on a Register-ScheduledTask
// call in the file body, so every fixture below includes one (a real installer
// always does). A glob-matching file without that call is intentionally skipped.
const REG = "\nRegister-ScheduledTask -TaskName $TaskName -Action $a -Trigger $t";

test("discoverInstallerTasks: single-quoted TaskName parsed", () => {
  const io = mkInstallerIO({
    "install-foo-task.ps1": "param([string]$TaskName = 'PRISM Foo')" + REG,
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 1);
  assert.ok(result.has("PRISM Foo"));
});

test("discoverInstallerTasks: an unexpanded $-template-literal name is skipped (U-FTH-DOLLAR-SKIP)", () => {
  // the galaxy-mine installer registers -TaskName "PRISM Galaxy Mine ($Galaxy)";
  // the literal $Galaxy is a RUNTIME variable, not a real task name -- emitting it
  // false-flagged as installer-drift. A sibling real literal must still be kept.
  const io = mkInstallerIO({
    "install-galaxy-mine-task.ps1": 'param([string]$TaskName = "PRISM Galaxy Mine ($Galaxy)")' + REG,
    "install-real-task.ps1": "param([string]$TaskName = 'PRISM Real Task')" + REG,
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.ok(!result.has("PRISM Galaxy Mine ($Galaxy)"), "phantom $-literal must be skipped");
  assert.ok(result.has("PRISM Real Task"), "a real sibling literal is still discovered");
});

test("discoverInstallerTasks: double-quoted TaskName parsed", () => {
  const io = mkInstallerIO({
    "install-bar-task.ps1": '[string]$TaskName = "PRISM Bar"' + REG,
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 1);
  assert.ok(result.has("PRISM Bar"));
});

test("discoverInstallerTasks: non-PRISM names filtered out (out-of-scope)", () => {
  const io = mkInstallerIO({
    "install-thirdparty-task.ps1": "[string]$TaskName = 'OtherVendor Foo'" + REG,
    "install-also-task.ps1":       "[string]$TaskName = 'PRISM Tracked'" + REG,
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 1, "only PRISM-prefixed name kept");
  assert.ok(result.has("PRISM Tracked"));
});

test("discoverInstallerTasks: non-matching filenames ignored", () => {
  const io = mkInstallerIO({
    "install-fleet-reaper-task.ps1": "[string]$TaskName = 'PRISM Fleet Reaper'" + REG,
    "tweak-helper.ps1":              "[string]$TaskName = 'PRISM Should Be Ignored'" + REG,  // not install-/register-
    "README.md":                     "[string]$TaskName = 'PRISM Also Ignored'" + REG,
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 1);
  assert.ok(result.has("PRISM Fleet Reaper"));
});

// --- U-HERMES-FTH-DRIFT-SYNC 2026-06-01: regression tests for the 3-stage
// discovery hardening (each stage a green-but-blind layer caught by per-file
// scrutiny). Stage 2: bare `$TaskName`/`$GuardTaskName` + multi-match per file.
// Stage 3: broad install-/register-* glob (covers -tasks.ps1/-cron.ps1) + the
// spec-key `Name = '…'` style + the Register-ScheduledTask content gate. Each
// asserts a property that FAILS against the prior-stage code.

test("discoverInstallerTasks: bare $TaskName (no [string] type) parsed", () => {
  const io = mkInstallerIO({
    "install-cost-alarm-task.ps1": '$TaskName = "PRISM Cost Alarm"\nRegister-ScheduledTask -TaskName $TaskName',
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.ok(result.has("PRISM Cost Alarm"), "bare $TaskName assignment must be discovered");
  assert.equal(result.size, 1);
});

test("discoverInstallerTasks: alternately-named *TaskName vars parsed (multi per file)", () => {
  const io = mkInstallerIO({
    "install-sfc-variability-task.ps1":
      "$GuardTaskName = 'PRISM SFC Variability Guard'\n" +
      "$MillTaskName  = 'PRISM SFC Variability Batch Mill'\n" +
      "$LatheTaskName = 'PRISM SFC Variability Batch Lathe'\n" +
      "Register-ScheduledTask -TaskName $GuardTaskName\n",
  });
  const result = discoverInstallerTasks({ _io: io });
  // matchAll: ALL three names from ONE installer (old first-match-only got ≤1).
  assert.equal(result.size, 3);
  assert.ok(result.has("PRISM SFC Variability Guard"));
  assert.ok(result.has("PRISM SFC Variability Batch Mill"));
  assert.ok(result.has("PRISM SFC Variability Batch Lathe"));
});

test("discoverInstallerTasks: hashtable splat key + RHS reference do NOT false-match", () => {
  const io = mkInstallerIO({
    // `TaskName = $TaskName` is a @registerParams splat KEY (no leading $);
    // `-TaskName $TaskName` is an RHS reference (no quoted literal). Only the
    // real declaration `$TaskName = 'PRISM Real'` should be captured.
    "install-splat-task.ps1":
      "$TaskName = 'PRISM Real'\n" +
      "$registerParams = @{ TaskName = $TaskName; Trigger = $t }\n" +
      "Register-ScheduledTask @registerParams\n",
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 1, "only the quoted declaration, not the splat key / RHS ref");
  assert.ok(result.has("PRISM Real"));
});

test("discoverInstallerTasks: non-PRISM alternately-named var still filtered", () => {
  const io = mkInstallerIO({
    "install-x-task.ps1": "$GuardTaskName = 'Vendor Thing'\n$MillTaskName = 'PRISM Kept'" + REG,
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 1);
  assert.ok(result.has("PRISM Kept"));
});

test("discoverInstallerTasks: -tasks.ps1 / -cron.ps1 / register-* globs scanned (stage 3)", () => {
  const io = mkInstallerIO({
    // OLD glob `/^install-.*-task\.ps1$/` (singular) skipped all three of these.
    "install-combo-efficiency-tasks.ps1": "$x=1" + REG.replace("$TaskName", "'PRISM Combo Baseline'"),
    "install-tribal-promotion-cron.ps1":  "$TaskName = 'PRISM Tribal Promotion Cron'" + REG,
    "register-fleet-memory-task-unelevated.ps1": "$TaskName = 'PRISM Fleet Memory Monitor'" + REG,
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.ok(result.has("PRISM Combo Baseline"), "-tasks.ps1 (plural) must be scanned");
  assert.ok(result.has("PRISM Tribal Promotion Cron"), "-cron.ps1 must be scanned");
  assert.ok(result.has("PRISM Fleet Memory Monitor"), "register-* must be scanned");
  assert.equal(result.size, 3);
});

test("discoverInstallerTasks: spec-array `Name = '…'` key parsed (stage 3)", () => {
  const io = mkInstallerIO({
    // install-slot-bridge-tasks.ps1 pattern: a $specs array of @{ Name='…' }
    // consumed via `-TaskName $Spec.Name`. The OLD `$…TaskName=` regex missed it.
    "install-slot-bridge-tasks.ps1":
      "$specs = @(\n" +
      "  @{ Name = 'PRISM Slot Bindings Seed';   Script = 'a.mjs' }\n" +
      "  @{ Name = 'PRISM Slot Bindings Verify'; Script = 'b.mjs' }\n" +
      ")\nforeach ($s in $specs) { Register-ScheduledTask -TaskName $s.Name }\n",
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 2);
  assert.ok(result.has("PRISM Slot Bindings Seed"));
  assert.ok(result.has("PRISM Slot Bindings Verify"));
});

test("discoverInstallerTasks: content gate — glob match WITHOUT Register-ScheduledTask is NOT discovered (no phantom)", () => {
  const io = mkInstallerIO({
    // A non-registering install-* helper that merely mentions a `Name = 'PRISM …'`
    // (e.g. a config/uninstall script) must NOT pollute the watched set. This is
    // the guard that makes the broad glob safe.
    "install-config-only.ps1": "$cfg = @{ Name = 'PRISM Phantom Task' }  # config helper, never registers a scheduled task",
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 0, "no Register-ScheduledTask → not a registrar → no name extracted");
});

test("discoverInstallerTasks: $desc / comment mention of a PRISM name is NOT captured", () => {
  const io = mkInstallerIO({
    // Only the real -TaskName literal is a task; the description string that
    // merely names another product (the real-world 'PRISM Weekly Synthesis'
    // desc-only false-positive) must be excluded.
    "install-weekly-task.ps1":
      "$TaskName = 'PRISM Weekly Real'\n" +
      "$desc = 'Runs after PRISM Weekly Synthesis completes'\n" +
      "# see also PRISM Some Other Thing\n" +
      "Register-ScheduledTask -TaskName $TaskName -Description $desc\n",
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 1, "only the $TaskName literal, not the $desc/comment mentions");
  assert.ok(result.has("PRISM Weekly Real"));
  assert.ok(!result.has("PRISM Weekly Synthesis"));
  assert.ok(!result.has("PRISM Some Other Thing"));
});

test("discoverInstallerTasks: file without TaskName parameter skipped silently", () => {
  const io = mkInstallerIO({
    "install-no-task-name-task.ps1": "param([switch]$Uninstall) Write-Host 'no taskname'",
  });
  const result = discoverInstallerTasks({ _io: io });
  assert.equal(result.size, 0);
});

test("discoverInstallerTasks: live scan against real helpers dir (smoke)", () => {
  // Integration smoke: scan the actual H:/prism/.claude/helpers dir. We don't
  // assert specific names (those drift with installer additions/renames —
  // which is exactly what this function is supposed to surface), only that
  // (a) the call succeeds without throwing, (b) every returned name starts
  // with "PRISM ". A failing assertion here means the regex broke or the
  // filter regressed.
  const result = discoverInstallerTasks({});
  assert.ok(result instanceof Set);
  for (const name of result) {
    assert.ok(name.startsWith("PRISM "), `discovered name "${name}" must be PRISM-prefixed`);
  }
});

// ─── detectInstallerDrift ───────────────────────────────────────────────────

test("detectInstallerDrift: empty discovered → no drift (graceful)", () => {
  const r = detectInstallerDrift(new Set(), ["PRISM A", "PRISM B"]);
  assert.equal(r.hasDrift, false);
  assert.deepEqual(r.missingFromHardcoded, []);
  assert.deepEqual(r.staleInHardcoded, []);
});

test("detectInstallerDrift: discovered ⊇ hardcoded surfaces 'missingFromHardcoded'", () => {
  // A 9th task shipped; the hardcoded list hasn't grown.
  const discovered = new Set(["PRISM A", "PRISM B", "PRISM NEW"]);
  const r = detectInstallerDrift(discovered, ["PRISM A", "PRISM B"]);
  assert.equal(r.hasDrift, true);
  assert.deepEqual(r.missingFromHardcoded, ["PRISM NEW"]);
  assert.deepEqual(r.staleInHardcoded, []);
});

test("detectInstallerDrift: hardcoded ⊇ discovered surfaces 'staleInHardcoded'", () => {
  // Hardcoded names a previous task; the installer is gone or renamed.
  const discovered = new Set(["PRISM A"]);
  const r = detectInstallerDrift(discovered, ["PRISM A", "PRISM REMOVED"]);
  assert.equal(r.hasDrift, true);
  assert.deepEqual(r.missingFromHardcoded, []);
  assert.deepEqual(r.staleInHardcoded, ["PRISM REMOVED"]);
});

test("detectInstallerDrift: both drift kinds together, output sorted", () => {
  const discovered = new Set(["PRISM Z", "PRISM B"]);  // unsorted on purpose
  const r = detectInstallerDrift(discovered, ["PRISM A", "PRISM B"]);
  assert.equal(r.hasDrift, true);
  assert.deepEqual(r.missingFromHardcoded, ["PRISM Z"]);
  assert.deepEqual(r.staleInHardcoded, ["PRISM A"]);
});

test("detectInstallerDrift: live discovery vs live KNOWN_PRISM_TASKS — END-TO-END", () => {
  // The real-data oracle (mirrors the lesson from FLEET-TASK-HEALTH-MS0
  // arm-C: hermetic fakes don't prove production wiring). Should pass on a
  // clean repo (discovered IS KNOWN_PRISM_TASKS). A failure here means
  // either an installer just shipped a new task (add it to KNOWN_PRISM_TASKS)
  // OR a hardcoded entry no longer has an installer (rename / remove).
  //
  // Either way, this test fails LOUDLY with the exact list of drifted names
  // — exactly the U-FTH-FOLLOWUP-SELF-DISC fail-loud signal the whole unit
  // exists to surface.
  const discovered = discoverInstallerTasks({});
  if (discovered.size === 0) return;  // CI environments without helpers/ dir — skip
  const r = detectInstallerDrift(discovered, KNOWN_PRISM_TASKS);
  assert.equal(r.hasDrift, false,
    `installer drift detected:\n  missing from KNOWN_PRISM_TASKS: ${JSON.stringify(r.missingFromHardcoded)}\n  stale in KNOWN_PRISM_TASKS: ${JSON.stringify(r.staleInHardcoded)}`);
});

// ─── Transient system-pressure codes (MCP-FLEET-CAPACITY-MS0) ────────────────
// 0x800710E0 (ERROR_NO_SYSTEM_RESOURCES) and siblings are spawn-refusals under
// load — the box was saturated, NOT a task failure. They must NOT classify as
// `failing`, must NOT escalate fleet severity, but must still surface as a finding.

test("isTransientPressureCode: 0x800710E0 + siblings are transient, others are not", () => {
  assert.equal(isTransientPressureCode(0x800710e0), true, "ERROR_NO_SYSTEM_RESOURCES");
  assert.equal(isTransientPressureCode(0x8007000e), true, "E_OUTOFMEMORY");
  assert.equal(isTransientPressureCode(0x800705aa), true);
  assert.equal(isTransientPressureCode(0x8007012b), true);
  // A real launch failure is NOT transient-pressure.
  assert.equal(isTransientPressureCode(0x80070002), false, "FILE_NOT_FOUND is a real failure");
  assert.equal(isTransientPressureCode(0x80070005), false, "ACCESS_DENIED is a real failure");
  assert.equal(isTransientPressureCode(1), false, "small exit code");
  assert.equal(isTransientPressureCode(0), false);
  // Signed-int32 form of 0x800710E0 (PowerShell may surface negative) normalizes via >>> 0.
  assert.equal(isTransientPressureCode(0x800710e0 | 0), true, "signed int32 form normalizes");
});

test("isLaunchFailureCode: transient-pressure code is NOT a launch failure (the fix)", () => {
  assert.equal(isLaunchFailureCode(0x800710e0), false, "0x800710E0 must NOT be a launch failure");
  // But a genuine HRESULT still IS a launch failure.
  assert.equal(isLaunchFailureCode(0x80070002), true, "FILE_NOT_FOUND still fails");
  assert.equal(isLaunchFailureCode(0xc0000005), true, "access violation still fails");
});

test("classifyTask: 0x800710E0 on a Ready task → status 'pressure', not 'failing'", () => {
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: Date.now() - 1000, nextRunTimeMs: Date.now() + 60000, lastTaskResult: 0x800710e0, intervalMs: 180000 },
    Date.now(), { staleMultiplier: 3, cooldownSec: 600 },
  );
  assert.equal(v.status, "pressure", "transient pressure must classify as 'pressure'");
  assert.match(v.reason, /transient system-resource pressure/);
});

test("classifyTask: a REAL launch HRESULT still classifies 'failing'", () => {
  const v = classifyTask(
    { state: "Ready", lastRunTimeMs: Date.now() - 1000, nextRunTimeMs: Date.now() + 60000, lastTaskResult: 0x80070002, intervalMs: 180000 },
    Date.now(), { staleMultiplier: 3, cooldownSec: 600 },
  );
  assert.equal(v.status, "failing");
});

test("aggregateHealth: a 'pressure' task does NOT escalate fleet level (benign finding)", () => {
  const classified = [
    { name: "PRISM MCP Server", status: "pressure", reason: "0x800710E0 transient" },
    { name: "Other Task", status: "healthy", reason: "" },
  ];
  const cfg = { knownTasks: ["PRISM MCP Server", "Other Task"], mustExist: ["PRISM MCP Server"], crashCritical: ["PRISM MCP Server"] };
  const r = aggregateHealth(classified, cfg);
  assert.equal(r.level, "clean", "pressure alone must NOT warn or critical");
  assert.equal(r.degraded.length, 0, "pressure is not 'degraded'");
  assert.equal(r.pressureTasks.length, 1, "but it IS surfaced as a pressure finding");
  assert.ok(r.reasons.some((x) => /pressure \(informational\)/.test(x)), "surfaced in reasons");
});

test("aggregateHealth: pressure does NOT mask a real co-occurring failure", () => {
  const classified = [
    { name: "PRISM MCP Server", status: "pressure", reason: "0x800710E0" },
    { name: "PRISM Fleet Reaper", status: "failing", reason: "0x80070002 missing script" },
  ];
  const cfg = { knownTasks: ["PRISM MCP Server", "PRISM Fleet Reaper"], mustExist: ["PRISM Fleet Reaper"], crashCritical: [] };
  const r = aggregateHealth(classified, cfg);
  assert.equal(r.level, "critical", "a real MUST_EXIST failing task still escalates despite the pressure sibling");
});

// --- selectReenableTargets (G10 auto-re-enable guard) -----------------------
// WHY: a crash-critical reaper silently landing Disabled is recurring (8x so
// far). The guard must re-enable ONLY a task that is genuinely a safety net the
// operator did NOT choose to disable, and NEVER during a migration freeze.

const RE_CFG = {
  crashCritical: ["PRISM Fleet Reaper", "PRISM Zombie Reaper v2", "PRISM Cleanup Orchestrator"],
  expectedDisabled: ["PRISM Vault Rot Sentinel Cron"],
  migrationFreezeActive: false,
};

test("selectReenableTargets: a disabled crash-critical task NOT expected-disabled IS selected", () => {
  const classified = [
    { name: "PRISM Zombie Reaper v2", status: "disabled" },
    { name: "PRISM Fleet Reaper", status: "healthy" },
  ];
  assert.deepEqual(selectReenableTargets(classified, RE_CFG), ["PRISM Zombie Reaper v2"]);
});

test("selectReenableTargets: a disabled NON-crash-critical task is NOT selected", () => {
  const classified = [{ name: "PRISM Blueprint OCR Batch", status: "disabled" }];
  assert.deepEqual(selectReenableTargets(classified, RE_CFG), [],
    "only crash-critical tasks are auto-restored; a benign disabled task is left alone");
});

test("selectReenableTargets: a disabled crash-critical task that IS expected-disabled is NOT selected", () => {
  const classified = [{ name: "PRISM Vault Rot Sentinel Cron", status: "disabled" }];
  const cfg = { ...RE_CFG, crashCritical: [...RE_CFG.crashCritical, "PRISM Vault Rot Sentinel Cron"] };
  assert.deepEqual(selectReenableTargets(classified, cfg), [],
    "expected-disabled (operator chose it) wins even when the task is also crash-critical");
});

test("selectReenableTargets: a healthy crash-critical task is NOT selected (only Disabled is healed)", () => {
  const classified = [{ name: "PRISM Fleet Reaper", status: "healthy" }];
  assert.deepEqual(selectReenableTargets(classified, RE_CFG), []);
});

test("selectReenableTargets: the migration freeze does NOT suppress a crash-critical re-enable (load-bearing is never freeze-excused)", () => {
  // REGRESSION GUARD (2026-06-09 live catch): a prior blanket `if (freeze) return []`
  // made this guard a no-op for the entire weeks-long HW-migration freeze -- it fired
  // NOTHING on a live disabled PRISM Zombie Reaper v2. aggregateHealth excuses a
  // disabled task under the freeze ONLY when NON-load-bearing; a crash-critical task
  // is load-bearing, so it stays `crashCritDegraded` and the guard MUST re-enable it.
  const classified = [{ name: "PRISM Zombie Reaper v2", status: "disabled" }];
  const cfg = { ...RE_CFG, migrationFreezeActive: true };
  assert.deepEqual(selectReenableTargets(classified, cfg), ["PRISM Zombie Reaper v2"],
    "a disabled crash-critical task is re-enabled even under the freeze; the operator's deliberate-disable signal is EXPECTED_DISABLED_TASKS (tested separately), NOT the freeze");
});

test("selectReenableTargets: a disabled PRISM MCP Server / Watchdog IS selected (real CRASH_CRITICAL_TASKS, 2026-06-17 self-heal gap fix)", () => {
  // REGRESSION GUARD: the MCP server keep-alive tasks were in KNOWN_PRISM_TASKS but
  // NOT CRASH_CRITICAL_TASKS, so the self-healer never re-enabled them when they
  // silently landed Disabled -> :3100 had no durable restart -> the operator's
  // recurring "mcp server disconnect". Uses the REAL constant so removing either
  // entry from CRASH_CRITICAL_TASKS fails this test.
  const classified = [
    { name: "PRISM MCP Server", status: "disabled" },
    { name: "PRISM MCP Server Watchdog", status: "disabled" },
  ];
  const cfg = { crashCritical: CRASH_CRITICAL_TASKS, expectedDisabled: [], migrationFreezeActive: false };
  const targets = selectReenableTargets(classified, cfg);
  assert.ok(targets.includes("PRISM MCP Server"), "PRISM MCP Server must be a re-enable target (regression: removed from CRASH_CRITICAL_TASKS)");
  assert.ok(targets.includes("PRISM MCP Server Watchdog"), "PRISM MCP Server Watchdog must be a re-enable target");
});

test("selectReenableTargets: a disabled PRISM Fleet Task Health IS selected (self-healer self-protection, 2026-06-17)", () => {
  // The cadence self-healer (fleet-task-health-watch --once) must itself be a
  // re-enable target -- else if IT lands Disabled, nothing re-enables it and the
  // 5-min self-heal goes dark. Uses the REAL CRASH_CRITICAL_TASKS so removing it fails here.
  const classified = [{ name: "PRISM Fleet Task Health", status: "disabled" }];
  const cfg = { crashCritical: CRASH_CRITICAL_TASKS, expectedDisabled: [], migrationFreezeActive: false };
  assert.ok(selectReenableTargets(classified, cfg).includes("PRISM Fleet Task Health"),
    "the self-healer must self-protect (regression: removed from CRASH_CRITICAL_TASKS)");
});

test("selectReenableTargets: non-array / empty / undefined classified returns [] (never throws)", () => {
  assert.deepEqual(selectReenableTargets(null, RE_CFG), []);
  assert.deepEqual(selectReenableTargets([], RE_CFG), []);
  assert.deepEqual(selectReenableTargets(undefined, RE_CFG), []);
});

test("selectReenableTargets: the same disabled crash-critical name twice is de-duplicated", () => {
  const classified = [
    { name: "PRISM Zombie Reaper v2", status: "disabled" },
    { name: "PRISM Zombie Reaper v2", status: "disabled" },
  ];
  assert.deepEqual(selectReenableTargets(classified, RE_CFG), ["PRISM Zombie Reaper v2"]);
});

// --- reenableTasks (executor with injected _spawn) --------------------------

test("reenableTasks: empty target list spawns NOTHING and returns [] (no side effect on a clean fleet)", () => {
  let calls = 0;
  const _spawn = () => { calls++; return { status: 0, stdout: "OK" }; };
  assert.deepEqual(reenableTasks([], { _spawn }), []);
  assert.equal(calls, 0, "no PowerShell fork when there is nothing to heal");
});

test("reenableTasks: a successful Enable returns ok:true / error:null and single-quotes the task name", () => {
  const seen = [];
  const _spawn = (_cmd, args) => { seen.push(args.join(" ")); return { status: 0, stdout: "OK\r\n" }; };
  const out = reenableTasks(["PRISM Zombie Reaper v2"], { _spawn });
  assert.deepEqual(out, [{ name: "PRISM Zombie Reaper v2", ok: true, error: null }]);
  assert.ok(/Enable-ScheduledTask -TaskName 'PRISM Zombie Reaper v2'/.test(seen[0]),
    "the task name is single-quoted in the PowerShell command (handles the spaces)");
});

test("reenableTasks: a non-zero exit (needs elevation) returns ok:false WITH the stderr (R12 - never claims healed)", () => {
  const _spawn = () => ({ status: 1, stdout: "", stderr: "Access is denied. (0x80070005)" });
  const out = reenableTasks(["PRISM Fleet Reaper"], { _spawn });
  assert.equal(out[0].ok, false);
  assert.ok(/Access is denied/.test(out[0].error), "the real failure reason is surfaced, not swallowed into a false success");
});

test("reenableTasks: a spawn error (ENOENT) returns ok:false (degrades, never throws)", () => {
  const _spawn = () => ({ error: { code: "ENOENT" } });
  const out = reenableTasks(["PRISM Fleet Reaper"], { _spawn });
  assert.equal(out[0].ok, false);
  assert.equal(out[0].error, "ENOENT");
});

// U-GOLF-CRASH-POSTMORTEM-DIGEST: re-enable ledger producer (the write half the
// crash-postmortem-digest consumes for its FLAPPING flag).
test("buildReenableLedgerRows: one row per attempted task; ok = in the healed set (R12 honest failure)", () => {
  const rows = buildReenableLedgerRows(
    ["PRISM Zombie Reaper v2", "PRISM Fleet Reaper"],   // attempted
    ["PRISM Zombie Reaper v2"],                          // healed (Fleet Reaper failed -> elevation)
    "2026-06-10T01:00:00.000Z");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    schemaVersion: 1, ts: "2026-06-10T01:00:00.000Z",
    task: "PRISM Zombie Reaper v2", ok: true, by: "fleet-task-health-watch",
  });
  assert.equal(rows[1].task, "PRISM Fleet Reaper");
  assert.equal(rows[1].ok, false);                       // attempted but NOT healed -> ok:false (never a false heal)
});

test("buildReenableLedgerRows: empty/invalid attempted -> [] (no spurious rows); missing healed -> ok:false", () => {
  assert.deepEqual(buildReenableLedgerRows([], ["x"], "t"), []);
  assert.deepEqual(buildReenableLedgerRows(null, ["x"], "t"), []);
  const rows = buildReenableLedgerRows(["A"], undefined, "t");
  assert.equal(rows[0].ok, false);                       // healed non-array -> fail-closed, no false heal
});

test("appendReenableLedger: writes JSONL to the injected path; empty rows is a no-op (no file)", () => {
  const dir = pjoin(tmpdir(), `prism-reenable-ledger-${process.pid}-${NOW}`);
  const path = pjoin(dir, "fleet-task-reenable-ledger.jsonl");
  try {
    appendReenableLedger([], path);                       // empty -> must NOT create the file
    assert.equal(existsSync(path), false, "empty rows must not create the ledger");
    const rows = buildReenableLedgerRows(["PRISM Fleet Reaper"], ["PRISM Fleet Reaper"], "2026-06-10T01:00:00.000Z");
    appendReenableLedger(rows, path);
    const written = readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(written.length, 1);
    assert.deepEqual(written[0], rows[0]);                 // round-trips the exact producer row the digest consumes
    appendReenableLedger(rows, path);                      // second append accumulates (flap accrues over the window)
    assert.equal(readFileSync(path, "utf8").trim().split("\n").length, 2);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* cleanup best-effort */ }
  }
});

test("appendReenableLedger: a write to an impossible path is FAIL-SOFT (never throws -> never aborts the audit)", () => {
  // A NUL byte makes the path unopenable on every platform; the helper must swallow it.
  assert.doesNotThrow(() => appendReenableLedger(
    buildReenableLedgerRows(["A"], ["A"], "t"), "\u0000nope-ledger.jsonl"));
});
