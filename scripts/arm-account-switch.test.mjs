// Tests for arm-account-switch.mjs -- the one-command arm/disarm helper for the
// auto account-switch watchdog. The critical invariant: NEVER arm blind -- arming
// requires exactly one positive calibration value (budget XOR trigger), so a
// fat-finger `arm` with no ceiling cannot silently enable autonomous fleet-restart.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArmArgs, composeEnvPlan, composeAutoPlan, preflightGateVerdict, armPlan, ARM_VARS, DEFAULT_PCT } from "./arm-account-switch.mjs";

// Fake preflight reports + ceiling doc for armPlan wiring tests (no real creds, no env writes).
const RED_REPORT = { grade: "RED", safeToArm: false, reasons: ["current live account is UNIDENTIFIABLE"], currentAccount: null, nextTarget: "account-1" };
const GREEN_REPORT = { grade: "GREEN", safeToArm: true, reasons: [], currentAccount: "account-2", nextTarget: "account-1" };
const FAKE_CEILING = () => ({ observedCeiling: 67_000_000, crossings: 36, recommend: { pct: 0.92 }, schemaVersion: "1.0.0" });

// ---- parseArmArgs ----
test("parseArmArgs: defaults to arm action", () => {
  assert.equal(parseArmArgs([]).action, "arm");
});
test("parseArmArgs: --disarm / --status set the action", () => {
  assert.equal(parseArmArgs(["--disarm"]).action, "disarm");
  assert.equal(parseArmArgs(["--status"]).action, "status");
});
test("parseArmArgs: parses budget/trigger/pct numerics", () => {
  const a = parseArmArgs(["--budget", "250000000", "--pct", "0.9"]);
  assert.equal(a.budget, 250000000);
  assert.equal(a.pct, 0.9);
  assert.equal(a.trigger, null);
});

// ---- composeEnvPlan: arm (the safety-critical path) ----
test("composeEnvPlan: arm with --budget -> pct path env, AUTO_APPLY=1, default pct", () => {
  const plan = composeEnvPlan("arm", { budget: 250000000 });
  assert.equal(plan[ARM_VARS.AUTO_APPLY], "1");
  assert.equal(plan[ARM_VARS.BUDGET], "250000000");
  assert.equal(plan[ARM_VARS.PCT], String(DEFAULT_PCT));
  assert.equal(plan[ARM_VARS.TRIGGER], undefined, "budget path must NOT also set an absolute trigger");
});
test("composeEnvPlan: arm with --trigger -> absolute path env (no budget key)", () => {
  const plan = composeEnvPlan("arm", { trigger: 230000000 });
  assert.equal(plan[ARM_VARS.TRIGGER], "230000000");
  assert.equal(plan[ARM_VARS.BUDGET], undefined);
  assert.equal(plan[ARM_VARS.AUTO_APPLY], "1");
});
test("composeEnvPlan: arm honors an explicit --pct", () => {
  assert.equal(composeEnvPlan("arm", { budget: 1e8, pct: 0.9 })[ARM_VARS.PCT], "0.9");
});
test("composeEnvPlan: arm rounds fractional budgets to integer tokens", () => {
  assert.equal(composeEnvPlan("arm", { budget: 250000000.7 })[ARM_VARS.BUDGET], "250000001");
});

// ---- composeEnvPlan: NEVER ARM BLIND (the load-bearing safety guard) ----
test("composeEnvPlan: arm with NEITHER budget nor trigger THROWS (no blind arm)", () => {
  assert.throws(() => composeEnvPlan("arm", {}), /EXACTLY ONE/);
});
test("composeEnvPlan: arm with BOTH budget and trigger THROWS (ambiguous)", () => {
  assert.throws(() => composeEnvPlan("arm", { budget: 1e8, trigger: 2e8 }), /EXACTLY ONE/);
});
test("composeEnvPlan: arm rejects non-positive / non-finite calibration values", () => {
  assert.throws(() => composeEnvPlan("arm", { budget: 0 }), /EXACTLY ONE/);
  assert.throws(() => composeEnvPlan("arm", { budget: -5 }), /EXACTLY ONE/);
  assert.throws(() => composeEnvPlan("arm", { trigger: NaN }), /EXACTLY ONE/);
  assert.throws(() => composeEnvPlan("arm", { budget: Infinity }), /EXACTLY ONE/);
});
test("composeEnvPlan: arm rejects out-of-range pct", () => {
  assert.throws(() => composeEnvPlan("arm", { budget: 1e8, pct: 0 }), /pct/);
  assert.throws(() => composeEnvPlan("arm", { budget: 1e8, pct: 1.5 }), /pct/);
  assert.throws(() => composeEnvPlan("arm", { budget: 1e8, pct: -0.1 }), /pct/);
});

// ---- composeEnvPlan: disarm ----
test("composeEnvPlan: disarm flips AUTO_APPLY off and sets nothing else", () => {
  const plan = composeEnvPlan("disarm", {});
  assert.deepEqual(plan, { [ARM_VARS.AUTO_APPLY]: "0" });
});
test("composeEnvPlan: unknown action throws", () => {
  assert.throws(() => composeEnvPlan("frob", {}), /unknown action/);
});

// ---- parseArmArgs: --auto / --accept-low-confidence ----
test("parseArmArgs: --auto sets action auto; --accept-low-confidence sets the flag", () => {
  const a = parseArmArgs(["--auto", "--accept-low-confidence"]);
  assert.equal(a.action, "auto");
  assert.equal(a.acceptLowConfidence, true);
});
test("parseArmArgs: acceptLowConfidence defaults false", () => {
  assert.equal(parseArmArgs(["--auto"]).acceptLowConfidence, false);
});

// ---- composeAutoPlan: arm from the observed-ceiling sidecar (the P1 guard lives here) ----
test("composeAutoPlan: high-confidence doc -> arm at observedCeiling, AUTO_APPLY=1, uses doc.recommend.pct", () => {
  const doc = { observedCeiling: 67_000_000, crossings: 36, lowConfidence: false, recommend: { pct: 0.92 } };
  const plan = composeAutoPlan(doc, {});
  assert.equal(plan[ARM_VARS.AUTO_APPLY], "1");
  assert.equal(plan[ARM_VARS.BUDGET], "67000000");
  assert.equal(plan[ARM_VARS.PCT], "0.92");
  assert.equal(plan[ARM_VARS.TRIGGER], undefined, "auto uses the budget(pct) path, not an absolute trigger");
});
test("composeAutoPlan: explicit pct overrides the doc's recommend.pct", () => {
  const doc = { observedCeiling: 1e8, crossings: 10, lowConfidence: false, recommend: { pct: 0.92 } };
  assert.equal(composeAutoPlan(doc, { pct: 0.85 })[ARM_VARS.PCT], "0.85");
});
test("composeAutoPlan: lowConfidence WITHOUT override THROWS (P1 -- one artifact crossing must not arm)", () => {
  const doc = { observedCeiling: 12_000_000, crossings: 1, lowConfidence: true, recommend: { pct: 0.92 } };
  assert.throws(() => composeAutoPlan(doc, {}), /REFUSING|low-confidence/i);
});
test("composeAutoPlan: lowConfidence WITH --accept-low-confidence arms", () => {
  const doc = { observedCeiling: 12_000_000, crossings: 1, lowConfidence: true, recommend: { pct: 0.92 } };
  const plan = composeAutoPlan(doc, { acceptLowConfidence: true });
  assert.equal(plan[ARM_VARS.BUDGET], "12000000");
  assert.equal(plan[ARM_VARS.AUTO_APPLY], "1");
});
test("composeAutoPlan: no doc / no observedCeiling THROWS (nothing to arm against, R12)", () => {
  assert.throws(() => composeAutoPlan(null, {}), /calibrate/i);
  assert.throws(() => composeAutoPlan({}, {}), /nothing to arm|observedCeiling/i);
  assert.throws(() => composeAutoPlan({ observedCeiling: 0 }, {}), /nothing to arm|observedCeiling/i);
});
test("composeAutoPlan: stale ceiling (computedAt old) THROWS without --accept-stale (P2 freshness guard)", () => {
  const now = Date.parse("2026-06-18T00:00:00Z");
  const doc = { observedCeiling: 67_000_000, crossings: 36, computedAt: "2026-05-01T00:00:00Z", recommend: { pct: 0.92 } };
  assert.throws(() => composeAutoPlan(doc, { nowMs: now }), /stale/i); // 48d old > 14d default
  // override arms it
  assert.equal(composeAutoPlan(doc, { nowMs: now, acceptStale: true })[ARM_VARS.BUDGET], "67000000");
});
test("composeAutoPlan: fresh ceiling passes the freshness guard", () => {
  const now = Date.parse("2026-06-18T00:00:00Z");
  const doc = { observedCeiling: 67_000_000, crossings: 36, computedAt: "2026-06-17T00:00:00Z", recommend: { pct: 0.92 } };
  assert.equal(composeAutoPlan(doc, { nowMs: now })[ARM_VARS.AUTO_APPLY], "1"); // 1d old < 14d
});
test("composeAutoPlan: no clock injected -> freshness check skipped (pure-safe default)", () => {
  const doc = { observedCeiling: 67_000_000, crossings: 36, computedAt: "2020-01-01T00:00:00Z", recommend: { pct: 0.92 } };
  assert.equal(composeAutoPlan(doc, {})[ARM_VARS.BUDGET], "67000000"); // no nowMs -> no staleness throw
});
test("composeAutoPlan: incompatible schemaVersion THROWS (P2 schema gate); compatible/absent OK", () => {
  const base = { observedCeiling: 67_000_000, crossings: 36, recommend: { pct: 0.92 } };
  assert.throws(() => composeAutoPlan({ ...base, schemaVersion: "2.0.0" }, {}), /incompatible|schemaVersion/i);
  assert.equal(composeAutoPlan({ ...base, schemaVersion: "1.0.0" }, {})[ARM_VARS.BUDGET], "67000000"); // compatible major
  assert.equal(composeAutoPlan(base, {})[ARM_VARS.BUDGET], "67000000"); // absent version tolerated
});

// ---- preflightGateVerdict: the account-set safety gate on arming ----
test("parseArmArgs: --accept-unsafe-accounts sets the override flag", () => {
  assert.equal(parseArmArgs([]).acceptUnsafe, false);
  assert.equal(parseArmArgs(["--accept-unsafe-accounts"]).acceptUnsafe, true);
});

test("preflightGateVerdict: GREEN report -> arming allowed", () => {
  const v = preflightGateVerdict({ grade: "GREEN", safeToArm: true, reasons: [] }, {});
  assert.equal(v.block, false);
  assert.equal(v.grade, "GREEN");
  assert.equal(v.overridden, false);
});

test("preflightGateVerdict: YELLOW (degraded-but-safe) report -> arming allowed", () => {
  const v = preflightGateVerdict({ grade: "YELLOW", safeToArm: true, reasons: ["stale captures"] }, {});
  assert.equal(v.block, false);
  assert.equal(v.grade, "YELLOW");
});

test("preflightGateVerdict: RED report -> arming BLOCKED, reason carries the preflight reasons", () => {
  const v = preflightGateVerdict({ grade: "RED", safeToArm: false, reasons: ["current live account is UNIDENTIFIABLE"] }, {});
  assert.equal(v.block, true);
  assert.equal(v.grade, "RED");
  assert.match(v.reason, /RED \(NO-GO\)/);
  assert.match(v.reason, /UNIDENTIFIABLE/); // the underlying reasons are surfaced, not swallowed
});

test("preflightGateVerdict: safeToArm=false alone blocks even if grade label is missing", () => {
  // defends against a report shape where grade is absent but safeToArm is the gate
  const v = preflightGateVerdict({ safeToArm: false, reasons: [] }, {});
  assert.equal(v.block, true);
});

test("preflightGateVerdict: null/failed report -> FAIL-CLOSED block (cannot assess => refuse)", () => {
  const vNull = preflightGateVerdict(null, {});
  assert.equal(vNull.block, true);
  assert.equal(vNull.grade, "UNKNOWN");
  assert.match(vNull.reason, /fail-closed/);
  assert.equal(preflightGateVerdict("garbage", {}).block, true);
});

test("preflightGateVerdict: --accept-unsafe-accounts overrides a RED block (logged as overridden)", () => {
  const v = preflightGateVerdict({ grade: "RED", safeToArm: false, reasons: ["x"] }, { acceptUnsafe: true });
  assert.equal(v.block, false);
  assert.equal(v.overridden, true);
  assert.match(v.reason, /overridden by --accept-unsafe-accounts/);
});

test("preflightGateVerdict: override also rescues a fail-closed (null) report", () => {
  const v = preflightGateVerdict(null, { acceptUnsafe: true });
  assert.equal(v.block, false);
  assert.equal(v.overridden, true);
});

// ---- armPlan: regression-lock the CLI wiring seam (gate-before-env-set + disarm exemption) ----
test("armPlan: auto + RED preflight THROWS (no plan returned -> CLI never reaches setUserEnv)", () => {
  assert.throws(
    () => armPlan("auto", parseArmArgs(["--auto"]), { runPreflightFn: () => RED_REPORT, readCeilingFn: FAKE_CEILING, nowMs: 0 }),
    /RED \(NO-GO\)|UNIDENTIFIABLE/,
  );
});

test("armPlan: auto + RED reads the gate BEFORE the ceiling (ordering proof)", () => {
  let ceilingRead = false;
  assert.throws(() => armPlan("auto", parseArmArgs(["--auto"]), {
    runPreflightFn: () => RED_REPORT,
    readCeilingFn: () => { ceilingRead = true; return FAKE_CEILING(); },
    nowMs: 0,
  }));
  assert.equal(ceilingRead, false, "gate must throw before the ceiling is read -- no work past a RED block");
});

test("armPlan: auto + GREEN -> plan arms AUTO_APPLY=1 from the observed ceiling + carries preflight summary", () => {
  const { plan, preflight, meta } = armPlan("auto", parseArmArgs(["--auto"]), { runPreflightFn: () => GREEN_REPORT, readCeilingFn: FAKE_CEILING, nowMs: 0 });
  assert.equal(plan[ARM_VARS.AUTO_APPLY], "1");
  assert.equal(plan[ARM_VARS.BUDGET], "67000000");
  assert.equal(meta.observedCeiling, 67_000_000);
  assert.equal(preflight.grade, "GREEN");
  assert.equal(preflight.currentAccount, "account-2");
});

test("armPlan: manual arm (--budget) + RED THROWS (the manual path is gated too)", () => {
  assert.throws(
    () => armPlan("arm", parseArmArgs(["--budget", "250000000"]), { runPreflightFn: () => RED_REPORT, nowMs: 0 }),
    /RED \(NO-GO\)/,
  );
});

test("armPlan: manual arm (--budget) + GREEN -> plan arms (env-set reachable only via returned plan)", () => {
  const { plan, preflight } = armPlan("arm", parseArmArgs(["--budget", "250000000"]), { runPreflightFn: () => GREEN_REPORT, nowMs: 0 });
  assert.equal(plan[ARM_VARS.AUTO_APPLY], "1");
  assert.equal(plan[ARM_VARS.BUDGET], "250000000");
  assert.equal(preflight.grade, "GREEN");
});

test("armPlan: disarm does NOT run the preflight and returns preflight:null (turns auto-apply off)", () => {
  let preflightCalled = false;
  const { plan, preflight } = armPlan("disarm", parseArmArgs(["--disarm"]), { runPreflightFn: () => { preflightCalled = true; return RED_REPORT; }, nowMs: 0 });
  assert.equal(preflightCalled, false, "disarm must never gate -- it only turns auto-apply OFF");
  assert.equal(plan[ARM_VARS.AUTO_APPLY], "0");
  assert.equal(preflight, null);
});

test("armPlan: auto + RED + --accept-unsafe-accounts overrides -> arms with overridden preflight", () => {
  const { plan, preflight } = armPlan("auto", parseArmArgs(["--auto", "--accept-unsafe-accounts"]), { runPreflightFn: () => RED_REPORT, readCeilingFn: FAKE_CEILING, nowMs: 0 });
  assert.equal(plan[ARM_VARS.AUTO_APPLY], "1");
  assert.equal(preflight.overridden, true);
});

test("armPlan: fail-closed -- auto with a throwing preflight blocks (cannot assess => no arm)", () => {
  assert.throws(
    () => armPlan("auto", parseArmArgs(["--auto"]), { runPreflightFn: () => { throw new Error("vault unreadable"); }, readCeilingFn: FAKE_CEILING, nowMs: 0 }),
    /fail-closed/,
  );
});
