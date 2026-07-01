// fleet-reaper-trigger-stall.test.mjs — U-FR-STALL-TESTS
//
// Regression coverage for FLEET-RESILIENCE-MS0 Unit 1 (U-FR-TRIGGER-STALL-DETECT):
// a Windows scheduled task can read State:Ready yet have its NextRunTime frozen
// in the past (the repetition trigger stalled -> the task never fires again).
// These are the fail-on-revert oracles for the four pure functions that close
// that blind spot. Real-value assertions only — no stubs.
//
// Covered:
//   parseTaskNextRun     (fleet-reaper-sweep.mjs)
//   isTriggerStalled     (fleet-reaper-sweep.mjs)
//   taskSelfHealAction   (fleet-reaper-sweep.mjs)  — incl. the 4-sweep cooldown sequence
//   classifyTask         (fleet-task-health-watch.mjs) — incl. the Running false-positive P1
//   aggregateHealth      (fleet-task-health-watch.mjs) — incl. the trigger-stalled -> critical P2-3

import test from "node:test";
import assert from "node:assert/strict";

import {
  parseTaskNextRun,
  isTriggerStalled,
  taskSelfHealAction,
} from "../fleet-reaper-sweep.mjs";

import {
  classifyTask,
  aggregateHealth,
  MUST_EXIST_TASKS,
} from "../fleet-task-health-watch.mjs";

// ─── parseTaskNextRun ───────────────────────────────────────────────────────

test("parseTaskNextRun: a concrete US-locale timestamp -> epoch ms", () => {
  const raw = "5/19/2026 1:04:00 PM";
  const got = parseTaskNextRun(`Next Run Time:                        ${raw}`);
  assert.equal(got, Date.parse(raw));
  assert.ok(Number.isFinite(got));
});

test("parseTaskNextRun: real multi-line schtasks /V /FO LIST block", () => {
  const block = [
    "Folder: \\",
    "HostName:                             MARKV",
    "TaskName:                             \\PRISM Fleet Reaper",
    "Next Run Time:                        5/19/2026 1:04:00 PM",
    "Status:                               Ready",
    "Logon Mode:                           Interactive/Background",
  ].join("\r\n");
  assert.equal(parseTaskNextRun(block), Date.parse("5/19/2026 1:04:00 PM"));
});

test("parseTaskNextRun: N/A | Disabled | Never -> null (cannot tell, not stalled)", () => {
  assert.equal(parseTaskNextRun("Next Run Time: N/A"), null);
  assert.equal(parseTaskNextRun("Next Run Time: Disabled"), null);
  assert.equal(parseTaskNextRun("Next Run Time: Never"), null);
});

test("parseTaskNextRun: absent field -> null", () => {
  assert.equal(parseTaskNextRun("Status: Ready\r\nLogon Mode: Background"), null);
});

test("parseTaskNextRun: adversarial inputs never throw -> null", () => {
  assert.equal(parseTaskNextRun(null), null);
  assert.equal(parseTaskNextRun(undefined), null);
  assert.equal(parseTaskNextRun(12345), null);
  assert.equal(parseTaskNextRun({}), null);
  assert.equal(parseTaskNextRun(""), null);
  assert.equal(parseTaskNextRun("Next Run Time: not-a-date-at-all"), null);
});

// ─── isTriggerStalled ───────────────────────────────────────────────────────

const CAD = 300_000; // 5-min cadence in ms
const NOW = 1_700_000_000_000;

test("isTriggerStalled: NextRun far in the past -> true", () => {
  // overdue by 10 min, slack is 1.5 * 5min = 7.5 min -> stalled
  assert.equal(isTriggerStalled(NOW - 10 * 60_000, NOW, CAD), true);
});

test("isTriggerStalled: NextRun in the future -> false", () => {
  assert.equal(isTriggerStalled(NOW + 60_000, NOW, CAD), false);
});

test("isTriggerStalled: null/undefined NextRun -> false (cannot assert a stall)", () => {
  assert.equal(isTriggerStalled(null, NOW, CAD), false);
  assert.equal(isTriggerStalled(undefined, NOW, CAD), false);
});

test("isTriggerStalled: boundary is strict > (exactly 1.5x cadence -> false)", () => {
  const exact = NOW - CAD * 1.5; // now - next === 1.5*cadence
  assert.equal(isTriggerStalled(exact, NOW, CAD), false);
  assert.equal(isTriggerStalled(exact - 1, NOW, CAD), true); // 1ms beyond -> stalled
});

test("isTriggerStalled: adversarial non-finite inputs -> false", () => {
  assert.equal(isTriggerStalled(NaN, NOW, CAD), false);
  assert.equal(isTriggerStalled(Infinity, NOW, CAD), false);
  assert.equal(isTriggerStalled(NOW - 1e9, NaN, CAD), false);
  assert.equal(isTriggerStalled(NOW - 1e9, NOW, 0), false);   // cadence <= 0
  assert.equal(isTriggerStalled(NOW - 1e9, NOW, -CAD), false);
});

test("isTriggerStalled: bad mult falls back to 1.5", () => {
  const overdue = NOW - 9 * 60_000; // 9 min overdue: stalled under 1.5x (7.5min)
  assert.equal(isTriggerStalled(overdue, NOW, CAD, 0), true);
  assert.equal(isTriggerStalled(overdue, NOW, CAD, -2), true);
  assert.equal(isTriggerStalled(overdue, NOW, CAD, NaN), true);
});

// ─── taskSelfHealAction ─────────────────────────────────────────────────────

test("taskSelfHealAction: disabled knob -> noop (highest precedence)", () => {
  const r = taskSelfHealAction({ taskStatus: "ready", disabled: true, actionsAllowed: true, triggerStalled: true });
  assert.equal(r.action, "noop");
});

test("taskSelfHealAction: back-compat — pre-change call shape is byte-identical", () => {
  // No triggerStalled/lastSelfHealMs/cooldownSec/nowMs -> defaults -> old behavior.
  assert.equal(taskSelfHealAction({ taskStatus: "ready", disabled: false, actionsAllowed: true }).action, "noop");
  assert.equal(taskSelfHealAction({ taskStatus: "disabled", disabled: false, actionsAllowed: true }).action, "advise");
  // "unknown" (likely uninstalled) is advise-only — the reaper must NOT blindly
  // schtasks /Run a task that may not exist; it tells the operator to install.
  assert.equal(taskSelfHealAction({ taskStatus: "unknown", disabled: false, actionsAllowed: true }).action, "advise");
  assert.equal(taskSelfHealAction({ taskStatus: "unknown", disabled: false, actionsAllowed: false }).action, "advise");
});

test("taskSelfHealAction: a genuinely unexpected status -> run (only when actions allowed)", () => {
  // The `run` fallback is reserved for an unexpected NON-empty status that is
  // not ready/running/queued/disabled/unknown (e.g. a future schtasks string)
  // — re-run it to surface fresh state. Suppressed under status/dry-run.
  assert.equal(taskSelfHealAction({ taskStatus: "stopped", disabled: false, actionsAllowed: true }).action, "run");
  assert.equal(taskSelfHealAction({ taskStatus: "stopped", disabled: false, actionsAllowed: false }).action, "advise");
});

test("taskSelfHealAction: ready + stalled + no prior heal + actions allowed -> run", () => {
  const r = taskSelfHealAction({
    taskStatus: "ready", disabled: false, actionsAllowed: true,
    triggerStalled: true, lastSelfHealMs: 0, cooldownSec: 900, nowMs: NOW,
  });
  assert.equal(r.action, "run");
  assert.match(r.reason, /trigger-stalled/);
});

test("taskSelfHealAction: ready + stalled but status/dry-run -> advise (no kill)", () => {
  const r = taskSelfHealAction({
    taskStatus: "ready", disabled: false, actionsAllowed: false,
    triggerStalled: true, lastSelfHealMs: 0, cooldownSec: 900, nowMs: NOW,
  });
  assert.equal(r.action, "advise");
});

test("taskSelfHealAction: 4-sweep cooldown sequence — run, advise, advise, run", () => {
  const cooldownSec = 900; // 15 min
  const base = { taskStatus: "ready", disabled: false, actionsAllowed: true, triggerStalled: true, cooldownSec };

  // sweep 1: never healed -> run, caller stamps the marker at t0
  const s1 = taskSelfHealAction({ ...base, lastSelfHealMs: 0, nowMs: NOW });
  assert.equal(s1.action, "run");
  const stampedAt = NOW;

  // sweep 2: +5 min, marker fresh (<15min) -> advise (cooldown active, stall persists)
  const s2 = taskSelfHealAction({ ...base, lastSelfHealMs: stampedAt, nowMs: NOW + 5 * 60_000 });
  assert.equal(s2.action, "advise");
  assert.match(s2.reason, /cooldown active/);

  // sweep 3: +10 min, still <15min -> advise
  const s3 = taskSelfHealAction({ ...base, lastSelfHealMs: stampedAt, nowMs: NOW + 10 * 60_000 });
  assert.equal(s3.action, "advise");

  // sweep 4: +15 min, cooldown elapsed -> run again
  const s4 = taskSelfHealAction({ ...base, lastSelfHealMs: stampedAt, nowMs: NOW + 15 * 60_000 });
  assert.equal(s4.action, "run");
});

test("taskSelfHealAction: non-healthy status paths unchanged by the stall feature", () => {
  assert.equal(taskSelfHealAction({ taskStatus: "disabled", disabled: false, actionsAllowed: true }).action, "advise");
  const unk = taskSelfHealAction({ taskStatus: "", disabled: false, actionsAllowed: true });
  assert.equal(unk.action, "advise"); // empty/unknown -> advise (uninstalled)
});

// ─── classifyTask ───────────────────────────────────────────────────────────

const CFG = { staleMultiplier: 3 };
const TNOW = 1_700_000_000_000;
const INTERVAL = 5 * 60_000; // 5-min repetition

test("classifyTask: Ready + NextRun frozen far in the past -> trigger-stalled", () => {
  const v = classifyTask({
    state: "Ready",
    lastRunTimeMs: TNOW - 60_000,                 // ran recently — NOT stale-by-lastrun
    nextRunTimeMs: TNOW - 60 * 60_000,            // NextRun 60 min in the past
    lastTaskResult: 0,
    intervalMs: INTERVAL,
  }, TNOW, CFG);
  assert.equal(v.status, "trigger-stalled");
  assert.match(v.reason, /NextRunTime is .* in the past/);
});

test("classifyTask: P1 — Running with frozen NextRun is NOT trigger-stalled", () => {
  // Windows freezes NextRunTime while a task executes; that is legitimate.
  const v = classifyTask({
    state: "Running",
    lastRunTimeMs: TNOW - 60_000,
    nextRunTimeMs: TNOW - 60 * 60_000,
    lastTaskResult: 0,
    intervalMs: INTERVAL,
  }, TNOW, CFG);
  assert.notEqual(v.status, "trigger-stalled");
  assert.equal(v.status, "healthy"); // recent lastRun -> not stale either
});

test("classifyTask: Queued with past NextRun is NOT trigger-stalled (overdue-pending)", () => {
  const v = classifyTask({
    state: "Queued",
    lastRunTimeMs: TNOW - 60_000,
    nextRunTimeMs: TNOW - 60 * 60_000,
    lastTaskResult: 0,
    intervalMs: INTERVAL,
  }, TNOW, CFG);
  assert.notEqual(v.status, "trigger-stalled");
});

test("classifyTask: Ready + future NextRun -> not stalled", () => {
  const v = classifyTask({
    state: "Ready",
    lastRunTimeMs: TNOW - 60_000,
    nextRunTimeMs: TNOW + 4 * 60_000,
    lastTaskResult: 0,
    intervalMs: INTERVAL,
  }, TNOW, CFG);
  assert.equal(v.status, "healthy");
});

test("classifyTask: Ready + null NextRun -> trigger-stalled skipped (cannot tell)", () => {
  const v = classifyTask({
    state: "Ready",
    lastRunTimeMs: TNOW - 60_000,
    nextRunTimeMs: null,
    lastTaskResult: 0,
    intervalMs: INTERVAL,
  }, TNOW, CFG);
  assert.notEqual(v.status, "trigger-stalled");
});

test("classifyTask: trigger-stalled is diagnosed BEFORE stale (precedence)", () => {
  // Both stale-by-lastrun AND trigger-stalled — the more precise diagnosis wins.
  const v = classifyTask({
    state: "Ready",
    lastRunTimeMs: TNOW - 60 * 60_000,   // also stale by last-run
    nextRunTimeMs: TNOW - 60 * 60_000,   // and trigger frozen
    lastTaskResult: 0,
    intervalMs: INTERVAL,
  }, TNOW, CFG);
  assert.equal(v.status, "trigger-stalled");
});

test("classifyTask: pre-existing statuses unaffected (Disabled / never-ran)", () => {
  assert.equal(classifyTask({ state: "Disabled" }, TNOW, CFG).status, "disabled");
  assert.equal(
    classifyTask({ state: "Ready", lastRunTimeMs: null, lastTaskResult: 0, intervalMs: INTERVAL, nextRunTimeMs: null }, TNOW, CFG).status,
    "never-ran",
  );
});

// ─── aggregateHealth — trigger-stalled severity escalation (P2-3) ────────────

test("aggregateHealth: a MUST_EXIST task that is trigger-stalled drives `critical`", () => {
  const mustExistName = MUST_EXIST_TASKS[0];
  assert.ok(typeof mustExistName === "string" && mustExistName.length > 0);
  const classified = [{ name: mustExistName, status: "trigger-stalled", reason: "frozen" }];
  const agg = aggregateHealth(classified, {
    mustExist: MUST_EXIST_TASKS,
    crashCritical: [],
    knownTasks: [mustExistName],
  });
  assert.equal(agg.level, "critical");
  assert.ok(agg.mustExistHardDown.includes(mustExistName));
});

test("aggregateHealth: a non-critical trigger-stalled task is only `warn`", () => {
  const classified = [{ name: "PRISM Some Optional Task", status: "trigger-stalled", reason: "frozen" }];
  const agg = aggregateHealth(classified, {
    mustExist: [],
    crashCritical: [],
    knownTasks: ["PRISM Some Optional Task"],
  });
  assert.equal(agg.level, "warn");
});

test("aggregateHealth: regression guard — disabled/failing still hard-down (unchanged)", () => {
  const name = MUST_EXIST_TASKS[0];
  const dis = aggregateHealth([{ name, status: "disabled", reason: "x" }], { mustExist: MUST_EXIST_TASKS, crashCritical: [], knownTasks: [name] });
  const fail = aggregateHealth([{ name, status: "failing", reason: "x" }], { mustExist: MUST_EXIST_TASKS, crashCritical: [], knownTasks: [name] });
  assert.equal(dis.level, "critical");
  assert.equal(fail.level, "critical");
});
