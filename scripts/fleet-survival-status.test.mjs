// Tests for fleet-survival-status.mjs -- the orchestrator GO/NO-GO that answers
// "will the fleet survive the next 5h limit without operator action?". Survival ==
// (armed AND account-set-not-RED). Proximity is informational and never gates survival.
// R9: each test fails if the survival logic changes.
//
// Run directly:  node scripts/fleet-survival-status.test.mjs   (node:test auto-runs)
import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeSurvival, readArmed, runSurvivalStatus, ARMED_ENV } from "./fleet-survival-status.mjs";

const GREEN_PF = { grade: "GREEN", safeToArm: true, currentAccount: "account-2", nextTarget: "account-1", reasons: [] };
const YELLOW_PF = { grade: "YELLOW", safeToArm: true, currentAccount: "account-1", nextTarget: "account-2", reasons: ["stale captures"] };
const RED_PF = { grade: "RED", safeToArm: false, currentAccount: null, nextTarget: "account-1", reasons: ["current live account is UNIDENTIFIABLE"] };
const LIVE = { zone: "warn", pctUsed: 0.83, currentWeighted: 60_000_000, ceiling: 73_000_000, armTrigger: 67_000_000, armWouldFire: false, etaMinutes: 42.4, burnPerMin: 310_000 };

// --- gradeSurvival ---
test("gradeSurvival: armed + GREEN preflight -> SURVIVABLE, no blockers/actions", () => {
  const g = gradeSurvival({ live: LIVE, preflight: GREEN_PF, armed: true });
  assert.equal(g.survives, true);
  assert.match(g.verdict, /SURVIVABLE/);
  assert.equal(g.blockers.length, 0);
  assert.equal(g.actions.length, 0);
});

test("gradeSurvival: armed + YELLOW (degraded-but-safe) -> still SURVIVABLE", () => {
  const g = gradeSurvival({ live: LIVE, preflight: YELLOW_PF, armed: true });
  assert.equal(g.survives, true); // YELLOW.safeToArm===true, so the switch can fire
});

test("gradeSurvival: NOT armed + GREEN -> WILL BLOCK, blocker names the env, action = arm", () => {
  const g = gradeSurvival({ live: LIVE, preflight: GREEN_PF, armed: false });
  assert.equal(g.survives, false);
  assert.ok(g.blockers.some((b) => b.includes(ARMED_ENV)));
  assert.ok(g.actions.some((a) => /arm-account-switch\.mjs --auto/.test(a)));
  assert.match(g.verdict, /WILL BLOCK/);
});

test("gradeSurvival: armed + RED preflight -> WILL BLOCK, action = re-capture current", () => {
  const g = gradeSurvival({ live: LIVE, preflight: RED_PF, armed: true });
  assert.equal(g.survives, false);
  assert.ok(g.blockers.some((b) => /not arm-safe \(RED\)/.test(b)));
  assert.ok(g.actions.some((a) => /capture-claude-credentials/.test(a)));
});

test("gradeSurvival: NOT armed + RED -> two blockers", () => {
  const g = gradeSurvival({ live: LIVE, preflight: RED_PF, armed: false });
  assert.equal(g.survives, false);
  assert.equal(g.blockers.length, 2);
});

test("gradeSurvival: null preflight (could not run) -> blocked, not survivable", () => {
  const g = gradeSurvival({ live: LIVE, preflight: null, armed: true });
  assert.equal(g.survives, false);
  assert.ok(g.blockers.some((b) => /could not run|UNKNOWN/.test(b)));
});

test("gradeSurvival: proximity passthrough -- pctUsed rounded to 1 decimal", () => {
  const g = gradeSurvival({ live: LIVE, preflight: GREEN_PF, armed: true });
  assert.equal(g.proximity.zone, "warn");
  assert.equal(g.proximity.pctUsed, 83); // 0.83 -> 83.0
  assert.equal(g.proximity.armTrigger, 67_000_000);
  assert.equal(g.proximity.armWouldFire, false);
});

test("gradeSurvival: proximity carries the time-to-limit projection (eta + burn, rounded)", () => {
  const g = gradeSurvival({ live: LIVE, preflight: GREEN_PF, armed: true });
  assert.equal(g.proximity.etaMinutes, 42); // 42.4 -> 42 (whole minutes)
  assert.equal(g.proximity.burnPerMin, 310_000);
  // null when burn is absent (e.g. live could not run -> no projection)
  const gNull = gradeSurvival({ live: null, preflight: GREEN_PF, armed: true });
  assert.equal(gNull.proximity.etaMinutes, null);
  assert.equal(gNull.proximity.burnPerMin, null);
});

test("gradeSurvival: live null -> proximity unknown, but survival still computed from armed+preflight", () => {
  const g = gradeSurvival({ live: null, preflight: GREEN_PF, armed: true });
  assert.equal(g.survives, true); // survival does NOT depend on proximity
  assert.equal(g.proximity.zone, "unknown");
  assert.equal(g.proximity.pctUsed, null);
});

// --- readArmed ---
test("readArmed: only the exact string '1' is armed", () => {
  assert.equal(readArmed({ [ARMED_ENV]: "1" }), true);
  assert.equal(readArmed({ [ARMED_ENV]: "0" }), false);
  assert.equal(readArmed({ [ARMED_ENV]: "true" }), false); // not '1'
  assert.equal(readArmed({}), false);
});

// --- runSurvivalStatus (injected deps -- no live transcript/vault read) ---
test("runSurvivalStatus: nowMs required (fail-loud)", () => {
  assert.throws(() => runSurvivalStatus({}), /nowMs/);
});

test("runSurvivalStatus: survivable end-to-end (injected armed + GREEN)", () => {
  const r = runSurvivalStatus({
    nowMs: 1_700_000_000_000,
    env: { [ARMED_ENV]: "1" },
    _live: () => LIVE,
    _preflight: () => GREEN_PF,
    _readArmed: (e) => e[ARMED_ENV] === "1",
  });
  assert.equal(r.survives, true);
  assert.equal(r.armed, true);
  assert.equal(r.preflightGrade, "GREEN");
  assert.equal(r.currentAccount, "account-2");
  assert.equal(r.schemaVersion, "1.0.0");
  assert.equal(r.computedAt, "2023-11-14T22:13:20.000Z");
});

test("runSurvivalStatus: will-block end-to-end (not armed + RED) with the live host shape", () => {
  const r = runSurvivalStatus({
    nowMs: 1_700_000_000_000,
    env: {},
    _live: () => LIVE,
    _preflight: () => RED_PF,
  });
  assert.equal(r.survives, false);
  assert.equal(r.armed, false);
  assert.equal(r.preflightGrade, "RED");
  assert.ok(r.actions.length >= 1);
});

test("runSurvivalStatus: a throwing live degrades to unknown proximity, verdict still produced", () => {
  const r = runSurvivalStatus({
    nowMs: 1_700_000_000_000,
    env: { [ARMED_ENV]: "1" },
    _live: () => { throw new Error("transcript unreadable"); },
    _preflight: () => GREEN_PF,
  });
  assert.equal(r.survives, true); // proximity failure does not block the verdict
  assert.equal(r.proximity.zone, "unknown");
});

test("runSurvivalStatus: a throwing preflight degrades to a blocker (fail-soft, not a crash)", () => {
  const r = runSurvivalStatus({
    nowMs: 1_700_000_000_000,
    env: { [ARMED_ENV]: "1" },
    _live: () => LIVE,
    _preflight: () => { throw new Error("vault unreadable"); },
  });
  assert.equal(r.survives, false);
  assert.equal(r.preflightGrade, "UNKNOWN");
  assert.ok(r.blockers.some((b) => /could not run|UNKNOWN/.test(b)));
});
