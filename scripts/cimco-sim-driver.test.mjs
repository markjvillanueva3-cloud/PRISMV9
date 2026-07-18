// Tests for scripts/cimco-sim-driver.mjs (U-CIMCO-SIM-2).
//
// Real-behavior tests (R9): every assertion encodes WHY the behavior matters for
// a CNC safety tool. No live CIMCO — the ui-driver spawn is injected as a spy so
// every branch (timeout / spawn-fail / bad-output / good-JSON) is exercised
// deterministically. The crux: no degraded path may ever surface a clearance.
//
// Run: node --test scripts/cimco-sim-driver.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseArgs,
  isMockRun,
  probeEnv,
  parseTailJson,
  runUiDriver,
  modeVerify,
  modeDrive,
  modeLaunch,
  computeBindVerdict,
  buildRunCompleteness,
  assessReadReport,
  modeReadReport,
  driveLiveFsm,
  modeDriveLive,
  composeClearanceInput,
} from "./cimco-sim-driver.mjs";
import { BIND_BLOCKERS } from "./cimco-bind-gate.mjs";
import { createRequire } from "node:module";

const HERE = resolve(fileURLToPath(import.meta.url), "..");
const REAL_NC = resolve(HERE, "..", "JM DIE", "PRISM MODIFIED POST PROCESSORS", "HAAS_VF2_-Ai-Enhanced (iMachining).cps");
const _simMap = createRequire(import.meta.url)("../state/shared/cimco/jm-fleet-sim-map.json");
const machineEntry = (id) => _simMap.machines.find((m) => m.machine_id === id);

// ── parseArgs ────────────────────────────────────────────────────────────
test("parseArgs: defaults are mode=verify, timeout=30000, mock (noMock=false)", () => {
  const a = parseArgs([]);
  assert.equal(a.mode, "verify");
  assert.equal(a.timeoutMs, 30_000);
  assert.equal(a.noMock, false);
  assert.equal(a.json, false);
});

test("parseArgs: every flag parses", () => {
  const a = parseArgs(["--machine", "VMC-01", "--nc", "p.nc", "--mode", "drive",
    "--cimco", "C.exe", "--ui-driver", "U.exe", "--timeout-ms", "5000", "--no-mock",
    "--nc-units", "mm", "--units-double-checked", "--json"]);
  assert.equal(a.machine, "VMC-01");
  assert.equal(a.nc, "p.nc");
  assert.equal(a.mode, "drive");
  assert.equal(a.cimco, "C.exe");
  assert.equal(a.uiDriver, "U.exe");
  assert.equal(a.timeoutMs, 5000);
  assert.equal(a.noMock, true);
  assert.equal(a.ncUnits, "mm");           // U-CIMCO-SIM-4: declared NC units (25.4× guard)
  assert.equal(a.unitsDoubleChecked, true); // U-CIMCO-SIM-4: VMC-03/04 unitsResolved:false double-check
  assert.equal(a.json, true);
});

// ── isMockRun (the safety primitive) ─────────────────────────────────────
test("isMockRun: DEFAULT is mock (no flag, no env)", () => {
  assert.equal(isMockRun(parseArgs([]), {}), true);
});

test("isMockRun: --no-mock ALONE is still mock (env not set to 0)", () => {
  // WHY: a single switch must never accidentally drive metal. Both gates required.
  assert.equal(isMockRun(parseArgs(["--no-mock"]), {}), true);
  assert.equal(isMockRun(parseArgs(["--no-mock"]), { PRISM_CIMCO_MOCK: "1" }), true);
});

test("isMockRun: PRISM_CIMCO_MOCK=0 ALONE is still mock (no --no-mock flag)", () => {
  assert.equal(isMockRun(parseArgs([]), { PRISM_CIMCO_MOCK: "0" }), true);
});

test("isMockRun: ONLY --no-mock AND env=0 together go live", () => {
  // WHY: the AND-of-two-independent-sources is the live-transport authorization.
  assert.equal(isMockRun(parseArgs(["--no-mock"]), { PRISM_CIMCO_MOCK: "0" }), false);
});

// ── probeEnv ─────────────────────────────────────────────────────────────
test("probeEnv: no --machine → fatal BAD_ARGS", () => {
  const env = probeEnv(parseArgs(["--nc", REAL_NC]));
  assert.ok(env.fatal);
  assert.ok(env.issues.some((i) => i.code === "BAD_ARGS" && /machine/.test(i.message)));
});

test("probeEnv: no --nc → fatal BAD_ARGS", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01"]));
  assert.ok(env.fatal);
  assert.ok(env.issues.some((i) => i.code === "BAD_ARGS" && /nc/.test(i.message)));
});

test("probeEnv: nonexistent --nc → fatal NC_MISSING", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", "Z:/no/such.nc"]));
  assert.ok(env.fatal);
  assert.ok(env.issues.some((i) => i.code === "NC_MISSING"));
});

test("probeEnv: unknown machine → fatal MACHINE_UNRESOLVED", () => {
  const env = probeEnv(parseArgs(["--machine", "ZZZ-99", "--nc", REAL_NC]));
  assert.ok(env.fatal);
  assert.ok(env.issues.some((i) => i.code === "MACHINE_UNRESOLVED"));
});

test("probeEnv: EDM machine → fatal EDM_NOT_SIMULABLE (CIMCO models mill/lathe only)", () => {
  const env = probeEnv(parseArgs(["--machine", "EDM-01", "--nc", REAL_NC]));
  assert.ok(env.fatal);
  assert.ok(env.issues.some((i) => i.code === "EDM_NOT_SIMULABLE"));
});

test("probeEnv: bad --mode → fatal BAD_ARGS", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC, "--mode", "bogus"]));
  assert.ok(env.fatal);
  assert.ok(env.issues.some((i) => i.code === "BAD_ARGS" && /mode/.test(i.message)));
});

test("probeEnv: non-positive --timeout-ms → fatal BAD_ARGS", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC, "--timeout-ms", "0"]));
  assert.ok(env.fatal);
  assert.ok(env.issues.some((i) => i.code === "BAD_ARGS" && /timeout/.test(i.message)));
});

test("probeEnv: happy path (mock, real machine + nc) → not fatal, plan resolved", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  assert.equal(env.fatal, false);
  assert.equal(env.mock, true);
  assert.ok(env.plan, "plan composed");
  assert.equal(env.plan.machine.machine_id, "VMC-01");
  assert.ok(env.plan.machine.cimcoMatch?.file, "resolved a sim .mcfg");
});

// ── parseTailJson (immune to nested braces in controls[]) ────────────────
test("parseTailJson: one-line envelope", () => {
  assert.deepEqual(parseTailJson('{"ok":true,"op":"window-info"}'), { ok: true, op: "window-info" });
});

test("parseTailJson: map envelope whose LAST { is inside controls[] still parses the envelope", () => {
  // WHY: a naive lastIndexOf('{') would slice out the last control object, not
  // the envelope — making every live map/find spuriously read 0 controls.
  const line = '{"ok":true,"op":"map","controls":[{"name":"A"},{"name":"Machine Simulation","da":"Click"}]}';
  const got = parseTailJson(line + "\n");
  assert.equal(got.ok, true);
  assert.equal(got.op, "map");
  assert.equal(got.controls.length, 2);
});

test("parseTailJson: scans backward past non-JSON log lines to the JSON line", () => {
  const out = "loading...\nribbon settled\n{\"ok\":true,\"op\":\"find\",\"controls\":[]}\n";
  assert.equal(parseTailJson(out).ok, true);
});

test("parseTailJson: LAST valid JSON line wins (stale envelope before current)", () => {
  // WHY: the live find/map read depends on "last line wins" — if the exe ever
  // emits a stale line then the current one, the current verdict must be read.
  const out = '{"ok":true,"op":"stale"}\n{"ok":true,"op":"current","controls":[]}';
  assert.equal(parseTailJson(out).op, "current");
});

test("parseTailJson: unparseable → null (fail-closed)", () => {
  assert.equal(parseTailJson("not json at all"), null);
  assert.equal(parseTailJson(""), null);
  assert.equal(parseTailJson(null), null);
});

// ── runUiDriver (injected spawn spy) ─────────────────────────────────────
function fakeSpawn(ret) { return () => ret; }

test("runUiDriver: timeout (status===null) → blocked + UI_DRIVER_TIMEOUT, NEVER cleared", () => {
  const r = runUiDriver("U.exe", "map", { timeoutMs: 10 }, fakeSpawn({ status: null, stdout: "", stderr: "" }));
  assert.equal(r.ok, false);
  assert.equal(r.blocked, true);
  assert.equal(r.code, "UI_DRIVER_TIMEOUT");
  // notEqual(undefined,true) passes AND notEqual(true,true) fails — catches a
  // clearance leak whether the key is absent (today) or a future refactor adds it.
  assert.notEqual(r.clearedForLiveRun, true);
});

test("runUiDriver: spawn error → UI_DRIVER_SPAWN_FAIL", () => {
  const r = runUiDriver("U.exe", "map", {}, fakeSpawn({ status: null, error: new Error("ENOENT"), stdout: "", stderr: "" }));
  // status:null with an error → timeout branch fires first (blocked). Verify spawn-error path with a real status.
  const r2 = runUiDriver("U.exe", "map", {}, fakeSpawn({ status: 2, error: new Error("spawn ENOENT"), stdout: "", stderr: "" }));
  assert.equal(r2.ok, false);
  assert.equal(r2.code, "UI_DRIVER_SPAWN_FAIL");
  assert.equal(r.blocked, true); // the status:null one is blocked
});

test("runUiDriver: unparseable stdout → UI_DRIVER_BAD_OUTPUT (fail-closed, not silent pass)", () => {
  const r = runUiDriver("U.exe", "map", {}, fakeSpawn({ status: 0, stdout: "garbage no json", stderr: "" }));
  assert.equal(r.ok, false);
  assert.equal(r.code, "UI_DRIVER_BAD_OUTPUT");
});

test("runUiDriver: good JSON passes through with exit", () => {
  const r = runUiDriver("U.exe", "find", { name: "Machine Simulation" },
    fakeSpawn({ status: 0, stdout: '{"ok":true,"op":"find","controls":[{"name":"Machine Simulation"}]}', stderr: "" }));
  assert.equal(r.ok, true);
  assert.equal(r.exit, 0);
  assert.equal(r.controls.length, 1);
});

test("runUiDriver: builds correct argv (op + name + nc + launch)", () => {
  let captured = null;
  const spy = (exe, argv) => { captured = { exe, argv }; return { status: 0, stdout: '{"ok":true}', stderr: "" }; };
  runUiDriver("U.exe", "map", { name: "X", nc: "p.nc", launch: true, allowActions: false }, spy);
  assert.deepEqual(captured.argv, ["--op", "map", "--name", "X", "--nc", "p.nc", "--launch"]);
  // WHY: --allow-actions must NOT appear unless explicitly true (no accidental motion).
  assert.ok(!captured.argv.includes("--allow-actions"));
});

// ── modeVerify (mock) ────────────────────────────────────────────────────
test("modeVerify mock: resolves machine + step plan, zero spawn", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  const r = modeVerify(env, parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  assert.equal(r.ok, true);
  assert.equal(r.mock, true);
  assert.equal(r.machine.machine_id, "VMC-01");
  assert.ok(r.steps.length >= 1, "step plan present");
  assert.ok(r.summary.length > 0, "summary populated (plan.note) — guards the schema-read regression");
});

// ── U-CIMCO-SIM-4 bind gate, ROUND-TRIPPED THROUGH THE DRIVER ─────────────
// R15-step2: the gate must be verified through its consumer (modeVerify), not
// only as the singleton. Each test here fails if the wiring is removed.
test("modeVerify mock: bind gate round-trips — VMC-03 (Haas PRE-NGC) binds with declared mm units + double-check", () => {
  const cli = ["--machine", "VMC-03", "--nc", REAL_NC, "--nc-units", "mm", "--units-double-checked"];
  const env = probeEnv(parseArgs(cli));
  const r = modeVerify(env, parseArgs(cli));
  // These assertions FAIL if computeBindVerdict is dropped from modeVerify (r.bind → undefined).
  assert.ok(r.bind, "modeVerify must carry the bind verdict (wiring present)");
  assert.equal(r.bind.machineId, "VMC-03");
  assert.equal(r.bind.bound, true, `expected bound: ${r.bind.blocker} ${JSON.stringify(r.bind.notes)}`);
  assert.equal(r.bindReady, true);
  assert.equal(r.bind.checks.postGeneration, "classic", "PRE-NGC machine must classify the synthesized VR post as classic, not ngc");
  assert.equal(r.bind.controllerVerified, false, "irreducible floor preserved through the driver");
});

test("modeVerify mock: the units gate is ENFORCED through the driver — no --nc-units ⇒ bindReady false, UNITS_UNRESOLVED", () => {
  // WHY: proves the driver actually runs the gate (not a bypass). Undeclared NC
  // units must fail CLOSED end-to-end — the 25.4× trap is never inferred away.
  const cli = ["--machine", "VMC-01", "--nc", REAL_NC]; // note: no --nc-units
  const env = probeEnv(parseArgs(cli));
  const r = modeVerify(env, parseArgs(cli));
  assert.equal(r.bindReady, false);
  assert.equal(r.bind.bound, false);
  assert.equal(r.bind.blocker, BIND_BLOCKERS.UNITS_UNRESOLVED);
  // ...and the rest of verify (plan round-trip) still succeeds — bind is additive, ok unchanged.
  assert.equal(r.ok, true, "bind being not-ready does NOT redefine verify's existing ok (plan round-trip)");
});

test("computeBindVerdict live: no read-back source yet (U-CIMCO-SIM-5) ⇒ fail-CLOSED NO_READBACK", () => {
  // The live read-back wires at SIM-5; until then a live bind must be honestly
  // blocked, never a fabricated pass. Tested via computeBindVerdict directly
  // (live modeVerify spawns the real ui-driver `find`).
  const v = computeBindVerdict({ mock: false, machine: machineEntry("VMC-01") }, { ncUnits: "mm" });
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.NO_READBACK);
});

test("computeBindVerdict: null when no machine was resolved (nothing to bind)", () => {
  assert.equal(computeBindVerdict({ mock: true }, {}), null);
});

// ── modeDrive (mock) — the fail-closed verdict wire ──────────────────────
test("modeDrive mock: a collision report → pass:false, firstOffendingLine, NOT cleared", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  const badReport = [
    { line: 42, type: "Collision", description: "tool vs fixture", action: "stop" },
  ];
  const r = modeDrive(env, badReport);
  assert.equal(r.simVerdict.pass, false);
  assert.equal(r.clearedForLiveRun, false);
  assert.notEqual(r.exitCode, 0);
});

test("modeDrive mock: an un-run/empty report is conformance-pass but NEVER cleared-for-live", () => {
  // WHY: the single most important safety invariant — an empty/absent report
  // is the shape a sim that never ran produces. It may read conformance-pass
  // (no defects SEEN), but it must NEVER clear for live run, because the
  // collision/limit check did not demonstrably run (fail-OPEN guard). Pin BOTH
  // load-bearing bits so a regression keying clearance off `pass` can't slip by.
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  const rNull = modeDrive(env, undefined); // no report injected → null
  assert.equal(rNull.clearedForLiveRun, false, "null report can NEVER clear for live run");
  assert.equal(rNull.simVerdict.collisionCheckConfirmed, false, "null report: collision-check NOT confirmed");
  // The literal empty-array shape a UIA extractor of an empty report grid emits.
  const rEmpty = modeDrive(env, []);
  assert.equal(rEmpty.clearedForLiveRun, false, "empty-array report can NEVER clear for live run");
  assert.equal(rEmpty.simVerdict.collisionCheckConfirmed, false, "empty-array report: collision-check NOT confirmed");
});

test("modeDrive mock: machine clearance is DEFERRED to the TS engine, never faked in JS", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  const r = modeDrive(env, []);
  assert.equal(r.machineClearance, "deferred-to-engine");
});

// ── U-CIMCO-SIM-5 run-completeness gate, ROUND-TRIPPED THROUGH modeDrive ──
const COMPLETE_OBS = {
  completion: { progressPct: 100, runReEnabled: true },
  reportReads: [[], []],               // two identical clean reads → quiescent
  simulated: { blocks: 4 },
  sourceNc: "N10 G21 G90\nN20 G0 X0\nN30 G1 X5. F100\nN40 M30", // 4 blocks
  modal: null,
};
test("modeDrive mock: a clean report on an OBSERVED-COMPLETE run clears (collisionCheckRan earned via grouped obj)", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  // Grouped clean report with collisionCheckRan:true (the sim demonstrably ran).
  const r = modeDrive(env, { collisionCheckRan: true }, COMPLETE_OBS);
  assert.ok(r.runCompleteness, "modeDrive must carry the run-completeness verdict (wiring present)");
  assert.equal(r.runCompleteness.runComplete, true);
  assert.equal(r.clearedForLiveRun, true);
});

test("modeDrive mock: a CLEAN report on a PARTIAL run is NOT cleared — the §E2 core safety case", () => {
  // The danger: report shows no defects, but the sim stopped early (covered 2 of
  // 4 blocks). A clean report on an incomplete run must NEVER clear for live.
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  const partial = { ...COMPLETE_OBS, simulated: { blocks: 2 } };
  const r = modeDrive(env, { collisionCheckRan: true }, partial);
  assert.equal(r.simVerdict.pass, true, "the report itself is clean (no defects seen)");
  assert.equal(r.runCompleteness.runComplete, false);
  assert.equal(r.clearedForLiveRun, false, "incomplete run vetoes a clean report — fail-CLOSED");
  assert.ok(r.runCompleteness.blockers.some((b) => b.includes("coverage-incomplete")));
});

test("modeDrive mock: an un-observed-complete run (single signal) does not clear even with a clean report", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  const oneSignal = { ...COMPLETE_OBS, completion: { progressPct: 100 } };
  const r = modeDrive(env, { collisionCheckRan: true }, oneSignal);
  assert.equal(r.clearedForLiveRun, false);
  assert.ok(r.runCompleteness.blockers.some((b) => b.includes("sim-not-observed-complete")));
});

test("modeDrive mock: NO run observations ⇒ runCompleteness null, report-only clearance preserved (SIM-2 back-compat)", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  const r = modeDrive(env, { collisionCheckRan: true }); // no runObs
  assert.equal(r.runCompleteness, null);
  assert.equal(r.clearedForLiveRun, true, "with no observations the report-only signal is preserved (unchanged from SIM-2)");
});

test("buildRunCompleteness: null when no observations supplied", () => {
  assert.equal(buildRunCompleteness(undefined), null);
  assert.equal(buildRunCompleteness(null), null);
});

// ── ADVERSARIAL ──────────────────────────────────────────────────────────
test("ADVERSARIAL: a blocked ui-driver result must not yield a cleared verdict anywhere", () => {
  const blocked = runUiDriver("U.exe", "invoke", { name: "Backplot", timeoutMs: 10 },
    fakeSpawn({ status: null, stdout: "", stderr: "" }));
  assert.equal(blocked.blocked, true);
  assert.notEqual(blocked.ok, true);
  assert.notEqual(blocked.clearedForLiveRun, true);
});

test("ADVERSARIAL: live drive without the FSM fails loud, never fabricates a verdict", () => {
  // Force a live env (both gates) but on this host the probe would catch NOT_WINDOWS;
  // construct the env object directly to isolate modeDrive's live branch behavior.
  const liveEnv = { mock: false, plan: { machine: { machine_id: "VMC-01" } } };
  const r = modeDrive(liveEnv);
  assert.equal(r.ok, false);
  assert.equal(r.blockedBy, "live-drive-needs-ui-map-fsm");
  assert.ok(!("clearedForLiveRun" in r) || r.clearedForLiveRun !== true);
});

test("ADVERSARIAL: modeLaunch mock never spawns (effectUnverified, no process)", () => {
  const env = probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  const r = modeLaunch(env, parseArgs(["--machine", "VMC-01", "--nc", REAL_NC]));
  assert.equal(r.mock, true);
  assert.equal(r.effectUnverified, true);
  assert.ok(r.wouldRun, "reports what it WOULD run, without running it");
});

// ── U-CIMCO-SIM-1A part 2: read-report mode (MSAA report-grid -> verdict) ──────
const okEnv = () => probeEnv(parseArgs(["--machine", "VMC-01", "--nc", REAL_NC])); // mock by default
const liveEnv = () => ({ mock: false, uiDriver: "U.exe", plan: { machine: { machine_id: "VMC-01" } } });
const rrPayload = (nodes, extra = {}) => ({ ok: true, op: "read-report", frameRealized: true, found: true, nodes, frameNodeCount: 200, ...extra });

test("assessReadReport: a clean GRID read (advisory rows) clears for live run", () => {
  const a = assessReadReport(rrPayload([{ text: "3 | Tool Change | T05", role: "listitem", path: "r>R" }, { text: "8 | Warning | high feed", role: "listitem", path: "r>R" }]));
  assert.equal(a.clearanceCapable, true);
  assert.equal(a.simVerdict.pass, true);
  assert.equal(a.clearedForLiveRun, true, "a real read of an advisory-only report clears");
  assert.equal(a.source, "grid");
});

test("assessReadReport: a COLLISION row read fails and never clears (the core safety case)", () => {
  const a = assessReadReport(rrPayload([{ text: "12 | Collision | tool vs fixture", role: "listitem", path: "r>R" }]));
  assert.equal(a.clearanceCapable, true);
  assert.equal(a.simVerdict.pass, false);
  assert.equal(a.clearedForLiveRun, false);
  assert.equal(a.simVerdict.firstOffendingLine, 12);
});

test("assessReadReport: a BLOCKED read (ribbon unrealized) is not clearance-capable and never clears", () => {
  const a = assessReadReport({ ok: true, op: "read-report", frameRealized: false, found: false, blockedBy: "ribbon-uia-unrealized", nodes: null, frameNodeCount: 11 });
  assert.equal(a.clearanceCapable, false);
  assert.equal(a.clearedForLiveRun, false);
  assert.equal(a.blockedBy, "ribbon-uia-unrealized");
});

test("assessReadReport: an OPAQUE read (nodes present, none parse) never clears", () => {
  const a = assessReadReport(rrPayload([{ text: "Simulating...", role: "statictext", path: "r>x" }, { text: "please wait", role: "statictext", path: "r>x" }]));
  assert.equal(a.source, "opaque");
  assert.equal(a.clearanceCapable, false);
  assert.equal(a.clearedForLiveRun, false);
  assert.match(a.blockedBy, /opaque/);
});

test("assessReadReport: a runUiDriver FAIL envelope (timeout) -> error source, never clears", () => {
  const a = assessReadReport({ ok: false, op: "read-report", code: "UI_DRIVER_TIMEOUT", blocked: true, note: "killed" });
  assert.equal(a.source, "error");
  assert.equal(a.clearedForLiveRun, false);
});

test("assessReadReport: an EMPTY found report is clearance-capable but UNCONFIRMED -> not cleared (empty-reads-clean guard)", () => {
  const a = assessReadReport(rrPayload([]));
  assert.equal(a.source, "empty-report");
  assert.equal(a.simVerdict.pass, true, "no findings = conformance pass");
  assert.equal(a.clearedForLiveRun, false, "but an empty report alone never clears (collision-check unconfirmed)");
});

test("modeReadReport mock (default fixture): clean read clears, exit 0, clearance DEFERRED to the engine", () => {
  const r = modeReadReport(okEnv(), {});
  assert.equal(r.mock, true);
  assert.equal(r.exitCode, 0);
  assert.equal(r.clearedForLiveRun, true);
  assert.equal(r.machineClearance, "deferred-to-engine", "JS never owns the final machine clearance (R7)");
});

test("modeReadReport mock: an injected COLLISION report -> exit 1 (sim-surfaced defect), not cleared", () => {
  const r = modeReadReport(okEnv(), {}, rrPayload([{ text: "9 | Gouge | into floor", role: "listitem", path: "r>R" }]));
  assert.equal(r.exitCode, 1);
  assert.equal(r.clearedForLiveRun, false);
});

test("modeReadReport mock: an injected BLOCKED read -> exit 2 (could not read), not cleared", () => {
  const r = modeReadReport(okEnv(), {}, { ok: true, op: "read-report", frameRealized: false, found: false, blockedBy: "ribbon-uia-unrealized", nodes: null });
  assert.equal(r.exitCode, 2);
  assert.equal(r.clearanceCapable, false);
  assert.equal(r.clearedForLiveRun, false);
});

test("modeReadReport LIVE (injected runner): a clean grid read clears; machine carried", () => {
  const fakeRun = () => rrPayload([{ text: "5 | Tool Change | T02", role: "listitem", path: "r>R" }]);
  const r = modeReadReport(liveEnv(), {}, undefined, undefined, fakeRun);
  assert.equal(r.mock, false);
  assert.equal(r.clearedForLiveRun, true);
  assert.equal(r.machine.machine_id, "VMC-01");
});

test("ADVERSARIAL modeReadReport LIVE: a blocked runner result must NEVER surface a clearance", () => {
  const fakeRun = () => ({ ok: false, op: "read-report", code: "UI_DRIVER_TIMEOUT", blocked: true });
  const r = modeReadReport(liveEnv(), {}, undefined, undefined, fakeRun);
  assert.notEqual(r.ok, true);
  assert.notEqual(r.clearedForLiveRun, true);
  assert.equal(r.exitCode, 2);
});

test("ADVERSARIAL: a CLEAN report read on a PARTIAL run is not cleared (SIM-5 run-completeness still gates)", () => {
  const partial = { completion: { signals: ["progress-100"], terminalComplete: false }, simulated: { blocks: 5 }, sourceNc: { blocks: 40 }, modal: null };
  const r = modeReadReport(okEnv(), {}, rrPayload([{ text: "3 | Tool Change | T05", role: "listitem", path: "r>R" }]), partial);
  assert.equal(r.simVerdict.pass, true, "report itself is clean");
  assert.equal(r.clearedForLiveRun, false, "but an incomplete run never clears even with a clean report");
});

// ── U-CIMCO-FSM-LIVE-DRIVE: the live FSM chain (navigate -> run -> read-report -> verdict) ─────────────
// Recorded harness: navigate + read-report are injected so the whole closed-loop chain is hermetic.
const navOk = (target) => Promise.resolve({ ok: true, from: "editor", target, steps: [{ key: "machine-sim", to: target, verified: "exact" }] });
const navFail = (reason, extra = {}) => () => Promise.resolve({ ok: false, reason, ...extra });
const readSeq = (payloads) => { let i = 0; return () => payloads[Math.min(i++, payloads.length - 1)]; };
const noSleep = () => Promise.resolve();
const cleanGrid = rrPayload([{ text: "3 | Tool Change | T05", role: "listitem", path: "r>R" }, { text: "8 | Warning | high feed", role: "listitem", path: "r>R" }]);
const collisionGrid = rrPayload([{ text: "12 | Collision | tool vs fixture", role: "listitem", path: "r>R" }]);
const blockedRead = { ok: true, op: "read-report", frameRealized: false, found: false, blockedBy: "ribbon-uia-unrealized", nodes: null };

test("driveLiveFsm: navigate -> quiescent clean read on a COMPLETE run CLEARS", async () => {
  const r = await driveLiveFsm({ navigate: navOk, readReport: readSeq([cleanGrid, cleanGrid]), sleep: noSleep, runObs: COMPLETE_OBS });
  assert.equal(r.stage, "complete");
  assert.equal(r.quiescent, true, "two content-identical reads = the sim settled");
  assert.equal(r.cleared, true, "complete run + clean clearance-capable read clears");
  assert.equal(r.machineClearance, "deferred-to-engine");
});

test("driveLiveFsm: a COLLISION in the settled report never clears (the core safety case)", async () => {
  const r = await driveLiveFsm({ navigate: navOk, readReport: readSeq([collisionGrid, collisionGrid]), sleep: noSleep, runObs: COMPLETE_OBS });
  assert.equal(r.quiescent, true);
  assert.equal(r.simVerdict.pass, false);
  assert.equal(r.cleared, false);
});

test("driveLiveFsm: an UNREALIZED ribbon halts at navigate, never reads the report, never clears", async () => {
  const r = await driveLiveFsm({ navigate: navFail("ribbon-uia-unrealized", { needsRealization: true }), readReport: readSeq([cleanGrid]), sleep: noSleep, runObs: COMPLETE_OBS });
  assert.equal(r.stage, "navigate");
  assert.equal(r.cleared, false);
  assert.equal(r.blockedBy, "ribbon-uia-unrealized");
  assert.deepEqual(r.reportReads, [], "no report is read when navigation fails closed");
});

test("driveLiveFsm: navigation DRIFT (wrong screen landed) fails closed", async () => {
  const r = await driveLiveFsm({ navigate: navFail("drift after 'machine-sim': expected machine-sim-running, got backplot"), readReport: readSeq([cleanGrid]), sleep: noSleep, runObs: COMPLETE_OBS });
  assert.equal(r.cleared, false);
  assert.match(r.blockedBy, /drift/);
});

test("driveLiveFsm: a sim that NEVER settles (every poll differs) times out and never clears", async () => {
  // Each read has a different line -> different content key -> never quiescent -> fail-closed timeout.
  const everChanging = readSeq([
    rrPayload([{ text: "1 | Info | block 1", role: "listitem", path: "p" }]),
    rrPayload([{ text: "2 | Info | block 2", role: "listitem", path: "p" }]),
    rrPayload([{ text: "3 | Info | block 3", role: "listitem", path: "p" }]),
    rrPayload([{ text: "4 | Info | block 4", role: "listitem", path: "p" }]),
    rrPayload([{ text: "5 | Info | block 5", role: "listitem", path: "p" }]),
    rrPayload([{ text: "6 | Info | block 6", role: "listitem", path: "p" }]),
  ]);
  const r = await driveLiveFsm({ navigate: navOk, readReport: everChanging, maxPolls: 6, sleep: noSleep, runObs: COMPLETE_OBS });
  assert.equal(r.quiescent, false);
  assert.equal(r.pollCount, 6, "polled to the cap");
  assert.equal(r.cleared, false);
  assert.equal(r.blockedBy, "sim-not-quiescent-timeout");
});

test("driveLiveFsm: a BLOCKED read (ribbon unrealized mid-run) is settled-but-not-clearance-capable -> never clears", async () => {
  const r = await driveLiveFsm({ navigate: navOk, readReport: readSeq([blockedRead, blockedRead]), sleep: noSleep, runObs: COMPLETE_OBS });
  assert.equal(r.source, "blocked");
  assert.equal(r.cleared, false);
});

test("driveLiveFsm: missing deps fails closed (never throws, never clears)", async () => {
  const r = await driveLiveFsm({});
  assert.equal(r.cleared, false);
  assert.match(r.blockedBy, /navigate \+ readReport/);
});

test("modeDriveLive mock: injected clean harness on a complete run -> ok, exit 0, cleared", async () => {
  const r = await modeDriveLive(okEnv(), {}, { navigate: navOk, readReport: readSeq([cleanGrid, cleanGrid]), sleep: noSleep, runObs: COMPLETE_OBS });
  assert.equal(r.mode, "drive-live");
  assert.equal(r.exitCode, 0);
  assert.equal(r.cleared, true);
});

test("modeDriveLive mock: a collision harness -> exit 1 (sim-surfaced defect), not cleared", async () => {
  const r = await modeDriveLive(okEnv(), {}, { navigate: navOk, readReport: readSeq([collisionGrid, collisionGrid]), sleep: noSleep, runObs: COMPLETE_OBS });
  assert.equal(r.exitCode, 1);
  assert.equal(r.cleared, false);
});

test("modeDriveLive mock: a nav-fail harness -> exit 2 (could not drive), not cleared", async () => {
  const r = await modeDriveLive(okEnv(), {}, { navigate: navFail("ribbon-uia-unrealized", { needsRealization: true }), readReport: readSeq([cleanGrid]), sleep: noSleep });
  assert.equal(r.exitCode, 2);
  assert.equal(r.cleared, false);
});

test("modeDriveLive mock: NO injected harness -> exit 2, fail-closed (needs a recorded harness or live drivers)", async () => {
  const r = await modeDriveLive(okEnv(), {}, {});
  assert.equal(r.exitCode, 2);
  assert.match(r.blockedBy, /harness|drivers/);
});

test("ADVERSARIAL driveLiveFsm: navigation succeeds but every read is OPAQUE -> never clears", async () => {
  const opaque = rrPayload([{ text: "Simulating...", role: "statictext", path: "x" }, { text: "wait", role: "statictext", path: "x" }]);
  const r = await driveLiveFsm({ navigate: navOk, readReport: readSeq([opaque, opaque]), sleep: noSleep, runObs: COMPLETE_OBS });
  assert.equal(r.source, "opaque");
  assert.equal(r.cleared, false, "an unreadable report can never clear a live run");
});

// ── U-CIMCO-CLEARANCE-COMPOSE: driveLiveFsm result -> cimco_live_run_clearance params ─────────────────
// The capstone wire: the .mjs driver produces the input the TS 5-gate dispatcher consumes (the dispatcher
// side is proven by the SIM-6 cimco_live_run_clearance tests). Round-trips REAL driveLiveFsm output.
test("composeClearanceInput: a cleared drive -> run_complete:true + pass + units/machine/bind passed through", async () => {
  const d = await driveLiveFsm({ navigate: navOk, readReport: readSeq([cleanGrid, cleanGrid]), sleep: noSleep, runObs: COMPLETE_OBS });
  const inp = composeClearanceInput(d, { machine: { machine_id: "VMC-01" }, bindVerdict: { bound: true }, programUnits: "mm", kinematicsVerified: true });
  assert.equal(inp.run_complete.runComplete, true);
  assert.equal(inp.sim_verdict.pass, true);
  assert.equal(inp.program_units, "mm");
  assert.equal(inp.kinematics_verified, true);
  assert.equal(inp.bind_verdict.bound, true);
  assert.equal(inp.machine.machine_id, "VMC-01");
});

test("composeClearanceInput: a COLLISION drive -> sim_verdict.pass false (the 5-gate will veto on simOk)", async () => {
  const d = await driveLiveFsm({ navigate: navOk, readReport: readSeq([collisionGrid, collisionGrid]), sleep: noSleep, runObs: COMPLETE_OBS });
  const inp = composeClearanceInput(d, { machine: { machine_id: "VMC-01" }, bindVerdict: { bound: true }, programUnits: "mm" });
  assert.equal(inp.sim_verdict.pass, false);
});

test("composeClearanceInput: a non-quiescent (timed-out) drive -> run_complete:false + the blocker surfaced", async () => {
  const everChanging = readSeq([
    rrPayload([{ text: "1 | Info | b1", role: "listitem", path: "p" }]), rrPayload([{ text: "2 | Info | b2", role: "listitem", path: "p" }]),
    rrPayload([{ text: "3 | Info | b3", role: "listitem", path: "p" }]), rrPayload([{ text: "4 | Info | b4", role: "listitem", path: "p" }]),
    rrPayload([{ text: "5 | Info | b5", role: "listitem", path: "p" }]), rrPayload([{ text: "6 | Info | b6", role: "listitem", path: "p" }]),
  ]);
  const d = await driveLiveFsm({ navigate: navOk, readReport: everChanging, maxPolls: 6, sleep: noSleep, runObs: COMPLETE_OBS });
  const inp = composeClearanceInput(d, { machine: { machine_id: "VMC-01" }, bindVerdict: { bound: true }, programUnits: "mm" });
  // Even though COMPLETE_OBS says the run was complete, the live drive never went quiescent -> run_complete
  // MUST be false (the sim did not finish), and the timeout blocker is surfaced to the 5-gate.
  assert.equal(inp.run_complete.runComplete, false, "a non-settled drive never yields run_complete:true, even with complete supplied obs");
  assert.ok(inp.run_complete.blockers.includes("sim-not-quiescent-timeout"), "the timeout blocker is surfaced to the gate");
});

test("composeClearanceInput UNITS-FIRST: omitted programUnits stays undefined (the 5-gate fails closed, never inferred)", async () => {
  const d = await driveLiveFsm({ navigate: navOk, readReport: readSeq([cleanGrid, cleanGrid]), sleep: noSleep, runObs: COMPLETE_OBS });
  const inp = composeClearanceInput(d, { machine: { machine_id: "VMC-01" }, bindVerdict: { bound: true } }); // no programUnits
  assert.equal(inp.program_units, undefined, "units must be DECLARED; absent flows as undefined -> gate fails closed (25.4x guard)");
});

test("composeClearanceInput: a nav-failed drive (no runCompleteness) -> run_complete:false + blockedBy surfaced as a blocker", async () => {
  const d = await driveLiveFsm({ navigate: navFail("ribbon-uia-unrealized", { needsRealization: true }), readReport: readSeq([cleanGrid]), sleep: noSleep });
  const inp = composeClearanceInput(d, { machine: { machine_id: "VMC-01" }, bindVerdict: { bound: false, blocker: "NO_READBACK" }, programUnits: "mm" });
  assert.equal(inp.run_complete.runComplete, false);
  assert.ok(inp.run_complete.blockers.includes("ribbon-uia-unrealized"), "the drive blocker is surfaced to the gate");
  assert.equal(inp.sim_verdict, null, "no sim verdict when navigation never reached the report");
});
