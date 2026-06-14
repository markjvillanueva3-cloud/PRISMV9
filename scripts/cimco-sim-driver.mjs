#!/usr/bin/env node
/**
 * CIMCO Machine-Simulation Driver — Node orchestrator (U-CIMCO-SIM-2).
 *
 * The connective tissue between the shipped C# MSAA helper (PrismCimcoUI.exe)
 * and the shipped verdict core (cimco-control-map.parseSimulationReport +
 * CimcoVerificationBridgeEngine.assessLiveRunClearance), so a PRISM-emitted .NC
 * can be round-tripped:
 *   post → .NC → CIMCO Edit Machine Simulation → report → fail-closed verdict
 * against the REAL machine + controller the post is for, across the JM fleet.
 *
 * Clones the structure of scripts/winmax-driver.mjs (parseArgs → probeEnv →
 * mode-dispatch → exit 0/1/2/3 → --json/human format), adapted for CIMCO.
 *
 * SCOPE (U-CIMCO-SIM-2): lifecycle + pre-flight env probe + mock E2E. It does
 * NOT build the cimco-ui-map FSM (U-CIMCO-SIM-3), the --op read-report scrape
 * (U-CIMCO-SIM-6 — needs a PrismCimcoUI.exe change), or run live CIMCO end-to-end
 * (U-CIMCO-SIM-5+). Those wire cleanly onto this lifecycle as they land.
 *
 * MOCK-BY-DEFAULT (spec CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04 §C, NON-NEGOTIABLE):
 *   Live transport is operator-supervised. The driver NEVER launches CIMCOEdit
 *   or the ui-driver in mock mode. Going live requires BOTH `--no-mock` AND
 *   env PRISM_CIMCO_MOCK=0 — a single switch can never accidentally drive metal.
 *
 * SAFETY (spec §E): a blocked / timed-out / empty / unconfirmed report is NEVER
 *   `cleared`. controllerVerified is structurally false. EDM short-circuits
 *   (CIMCO models mill/lathe only). The full machine-clearance gate
 *   (assessLiveRunClearance) is TS and lives at the dispatcher (U-CIMCO-SIM-7) —
 *   this driver returns the SimReport-level verdict and DEFERS machine clearance,
 *   never duplicating the TS gate in JS (single-source; R7).
 *
 * Usage:
 *   node scripts/cimco-sim-driver.mjs --machine <jmId> --nc <path>
 *        [--mode launch|verify|drive] [--cimco <exe>] [--ui-driver <exe>]
 *        [--timeout-ms 30000] [--no-mock] [--json] [--help]
 *
 * Modes:
 *   launch — (live) start+attach CIMCO with the NC, confirm the ribbon realized;
 *            (mock) return the would-run plan without spawning.
 *   verify — (mock/default) compose the planNavigation step plan + resolved
 *            machine (.mcfg/controller/units) WITHOUT touching CIMCO; (live)
 *            confirm the Machine-Simulation control is resolved+enabled.
 *   drive  — (mock) drive the full hop sequence as a PLAN + feed a SimReportRow[]
 *            through the real parseSimulationReport so the fail-closed verdict is
 *            exercised end-to-end; (live) fail-loud — the live hop sequence is
 *            U-CIMCO-SIM-3's FSM + U-CIMCO-SIM-6's report read; never faked here.
 *
 * Exit codes: 0 ok · 1 sim-surfaced-defect · 2 env/CIMCO-fault · 3 bad-args.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadSimMap, resolveJmMachine, planNavigation, PROOF_ARMS } from "./cimco-nav-planner.mjs";
import { parseSimulationReport } from "./cimco-control-map.mjs";
import { assessMachineBind, synthesizeMockReadback } from "./cimco-bind-gate.mjs";
import {
  countNcProgram, assessSimCompletion, assessReportQuiescence,
  assessLineCoverage, classifyModal, assessRunCompleteness,
} from "./cimco-completion-gate.mjs";
import { normalizeReportNodes, CLEARANCE_CAPABLE } from "./lib/cimco-report-normalize.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

const DEFAULT_CIMCO = "C:\\Program Files\\CIMCO 2026\\CIMCOEdit\\CIMCOEdit.exe";
const DEFAULT_UI_DRIVER = join(
  REPO_ROOT,
  "mcp-server", "data", "posts", "prism-base", "cimco-bridge", "ui-driver", "PrismCimcoUI.exe",
);
const DEFAULT_TIMEOUT_MS = 30_000;
const MODES = Object.freeze(["launch", "verify", "drive", "read-report", "drive-live"]);

// ──────────────────────────────────────────────────────────────────────
// Arg parsing
// ──────────────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const args = {
    mode: "verify",
    cimco: DEFAULT_CIMCO,
    uiDriver: DEFAULT_UI_DRIVER,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    noMock: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--machine") args.machine = argv[++i];
    else if (a === "--nc") args.nc = argv[++i];
    else if (a === "--mode") args.mode = argv[++i];
    else if (a === "--cimco") args.cimco = argv[++i];
    else if (a === "--ui-driver") args.uiDriver = argv[++i];
    else if (a === "--timeout-ms") args.timeoutMs = Number(argv[++i]);
    else if (a === "--no-mock") args.noMock = true;
    else if (a === "--mock") args.noMock = false; // explicit mock (the default); kept for symmetry
    else if (a === "--nc-units") args.ncUnits = argv[++i]; // declared NC units (inch|mm) — never inferred (25.4× guard)
    else if (a === "--units-double-checked") args.unitsDoubleChecked = true; // confirm units for an unitsResolved:false machine (VMC-03/04)
    else if (a === "--report-name") args.reportName = argv[++i]; // override the report-pane container heuristic once the live name is known
    else if (a === "--json") args.json = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

/**
 * Mock-by-default invariant. Live transport requires BOTH `--no-mock` AND
 * env PRISM_CIMCO_MOCK=0 — a single flag can never accidentally drive CIMCO.
 * Returns true when the run is a (safe) mock.
 */
export function isMockRun(args, env = process.env) {
  const envWantsLive = env.PRISM_CIMCO_MOCK === "0";
  const flagWantsLive = args.noMock === true;
  return !(envWantsLive && flagWantsLive);
}

function printHelp() {
  process.stdout.write(`CIMCO Machine-Simulation Driver (U-CIMCO-SIM-2)

Usage:
  node scripts/cimco-sim-driver.mjs --machine <jmId> --nc <path> [--mode verify]

Options:
  --machine <jmId>     JM machine id (e.g. VMC-01, LTH-03)            (REQUIRED)
  --nc <path>          Path to the posted .NC file                    (REQUIRED)
  --mode <m>           launch | verify | drive | read-report | drive-live  (default: verify)
  --cimco <path>       CIMCOEdit.exe                  (default: Program Files install)
  --ui-driver <path>   PrismCimcoUI.exe              (default: cimco-bridge/ui-driver)
  --timeout-ms <ms>    ui-driver spawn timeout-kill backstop   (default: 30000)
  --no-mock            Request LIVE transport (also needs env PRISM_CIMCO_MOCK=0)
  --json               Emit JSON result
  --help               This message

Mock-by-default: live CIMCO is driven ONLY with --no-mock AND PRISM_CIMCO_MOCK=0.
`);
}

// ──────────────────────────────────────────────────────────────────────
// Environment probe — resolve + validate before any spawn attempt
// ──────────────────────────────────────────────────────────────────────
export function probeEnv(args, env = process.env) {
  const issues = [];
  const mock = isMockRun(args, env);
  const ncPath = args.nc ? resolve(args.nc) : null;

  if (!args.machine) issues.push({ severity: "fatal", code: "BAD_ARGS", message: "--machine required" });
  if (!MODES.includes(args.mode)) {
    issues.push({ severity: "fatal", code: "BAD_ARGS", message: `--mode must be one of: ${MODES.join(", ")}` });
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    issues.push({ severity: "fatal", code: "BAD_ARGS", message: "--timeout-ms must be a positive number" });
  }
  if (!ncPath) issues.push({ severity: "fatal", code: "BAD_ARGS", message: "--nc required" });
  else if (!existsSync(ncPath)) issues.push({ severity: "fatal", code: "NC_MISSING", message: `NC file not found: ${ncPath}` });

  // The ui-driver exe is required for any live op; in mock it's advisory (warn).
  if (!existsSync(args.uiDriver)) {
    issues.push({
      severity: mock ? "warn" : "fatal",
      code: "UI_DRIVER_MISSING",
      message: `PrismCimcoUI.exe not found at ${args.uiDriver}` + (mock ? " (mock run — advisory)" : ""),
    });
  }
  // CIMCOEdit.exe only required for live transport.
  if (!mock && !existsSync(args.cimco)) {
    issues.push({ severity: "fatal", code: "CIMCO_MISSING", message: `CIMCOEdit.exe not found at ${args.cimco}` });
  }
  if (!mock && process.platform !== "win32") {
    issues.push({ severity: "fatal", code: "NOT_WINDOWS", message: `live transport requires Windows (platform=${process.platform})` });
  }

  // Resolve the machine + its sim plan. resolveJmMachine throws on unknown id;
  // planNavigation throws on a corrupt sim-map. Both → fatal, never a fake verdict.
  let machine = null;
  let plan = null;
  if (args.machine && ncPath) {
    try {
      const simMap = loadSimMap();
      machine = resolveJmMachine(simMap, args.machine);
      plan = planNavigation({ jobType: "simulate", ncFile: ncPath, jmMachineId: args.machine }, { simMap });
    } catch (e) {
      const msg = String(e?.message || e);
      const code = /unknown JM machine/i.test(msg) ? "MACHINE_UNRESOLVED" : "SIMMAP_CORRUPT";
      issues.push({ severity: "fatal", code, message: msg });
    }
  }

  // EDM short-circuit: CIMCO models mill/lathe kinematics only (spec §F, tribal #10).
  // planNavigation marks EDM with verdictArm=DISCHARGE_PHYSICS and status "not-applicable".
  if (plan && plan.verdictArm === PROOF_ARMS.DISCHARGE_PHYSICS) {
    issues.push({
      severity: "fatal",
      code: "EDM_NOT_SIMULABLE",
      message: `${machine?.machine_id} is ${machine?.type} — CIMCO Machine-Simulation models mill/lathe only; verdict belongs to PRISM discharge-physics.`,
    });
  }

  return {
    mock,
    ncPath,
    cimco: args.cimco,
    uiDriver: args.uiDriver,
    machine,
    plan,
    isWindows: process.platform === "win32",
    issues,
    fatal: issues.some((i) => i.severity === "fatal"),
  };
}

// ──────────────────────────────────────────────────────────────────────
// runUiDriver — the single spawnSync wrapper around PrismCimcoUI.exe.
// Adds the 2nd-backstop timeout-kill the spec §A7 mandates (the exe has its
// own 8s watchdog; the orchestrator ALSO spawns with timeout-kill). Parses
// the exe's JSON-on-stdout contract (last {...} line). A `blocked` or timeout
// result is NEVER a clearance signal.
// ──────────────────────────────────────────────────────────────────────
export function runUiDriver(uiDriver, op, opts = {}, spawn = spawnSync) {
  const argvList = ["--op", op];
  if (opts.name) argvList.push("--name", opts.name);
  if (opts.nc) argvList.push("--nc", opts.nc);
  if (opts.launch) argvList.push("--launch");
  if (opts.keep) argvList.push("--keep");
  if (opts.allowActions) argvList.push("--allow-actions");
  if (opts.settleMs != null) argvList.push("--settle", String(opts.settleMs));
  if (opts.waitSec != null) argvList.push("--wait", String(opts.waitSec));

  const r = spawn(uiDriver, argvList, {
    encoding: "utf8",
    windowsHide: false,
    timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  // status === null ⇒ killed by the spawnSync timeout (the 2nd backstop fired).
  if (r.status === null) {
    return { ok: false, blocked: true, code: "UI_DRIVER_TIMEOUT", op, exit: null,
      note: "ui-driver killed by orchestrator timeout-backstop; a hung action is NEVER a clearance signal." };
  }
  if (r.error) {
    return { ok: false, code: "UI_DRIVER_SPAWN_FAIL", op, exit: r.status, error: String(r.error.message || r.error) };
  }

  const parsed = parseTailJson(r.stdout);
  if (!parsed) {
    // Fail-CLOSED: unparseable stdout is an error, never a silent pass.
    return { ok: false, code: "UI_DRIVER_BAD_OUTPUT", op, exit: r.status,
      stdout_excerpt: String(r.stdout || "").slice(0, 300),
      stderr_excerpt: String(r.stderr || "").slice(0, 300) };
  }
  return { ...parsed, exit: r.status };
}

/**
 * Parse the exe's JSON-on-stdout contract: it prints exactly one JSON object
 * per line. Scan from the LAST line backward for the first line that parses to
 * an object — immune to nested braces in `controls[]`/path values (a naive
 * lastIndexOf('{') would mis-slice a `map`/`find` envelope whose last `{` is
 * inside the controls array). Returns null (fail-closed) when nothing parses.
 */
export function parseTailJson(stdout) {
  const lines = String(stdout || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const o = JSON.parse(lines[i]);
      if (o && typeof o === "object") return o;
    } catch { /* not a JSON line — keep scanning backward */ }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────
// Modes
// ──────────────────────────────────────────────────────────────────────
export function modeLaunch(env, args) {
  if (env.mock) {
    return {
      ok: true, mode: "launch", mock: true, exitCode: 0, effectUnverified: true,
      machine: env.plan?.machine ?? null,
      wouldRun: { exe: env.uiDriver, op: "map", launch: true, nc: env.ncPath },
      plan: env.plan,
      message: "MOCK launch — would start+attach CIMCO and confirm ribbon realization. No process spawned.",
    };
  }
  // LIVE: start+attach CIMCO via the ui-driver, confirm the ribbon realized.
  const res = runUiDriver(env.uiDriver, "map", { launch: true, nc: env.ncPath, timeoutMs: args.timeoutMs });
  const controlCount = Array.isArray(res.controls) ? res.controls.length : (res.count ?? 0);
  // spec §B/§A4: subtree/control count below the realization floor ⇒ ribbon never realized.
  const realized = res.ok && controlCount >= 50;
  return {
    ok: realized, mode: "launch", mock: false,
    exitCode: realized ? 0 : 2,
    blockedBy: realized ? undefined : "ribbon-uia-unrealized",
    controlCount, uiDriver: res,
    message: realized
      ? `LIVE launch ok — CIMCO ribbon realized (${controlCount} controls).`
      : `LIVE launch BLOCKED — ribbon unrealized (${controlCount} controls < 50 floor) or ui-driver fault.`,
  };
}

/**
 * The U-CIMCO-SIM-4 bind verdict for the verify result: is the LOADED CIMCO
 * machine/controller/units the one this post is for? Mock synthesizes a CORRECT
 * read-back (the gate then enforces the declared --nc-units); live defers the
 * read-back source to U-CIMCO-SIM-5 (the ui-driver `read-machine` op), so a live
 * call honestly fails CLOSED with NO_READBACK until that lands. Returns null when
 * no machine was resolved (nothing to bind).
 */
export function computeBindVerdict(env, args = {}) {
  const machine = env.machine;
  if (!machine) return null;
  const loaded = env.mock ? synthesizeMockReadback(machine) : null; // live read-back: U-CIMCO-SIM-5
  return assessMachineBind(machine, loaded, {
    ncUnits: args.ncUnits,
    unitsDoubleChecked: args.unitsDoubleChecked === true,
  });
}

export function modeVerify(env, args = {}) {
  const bind = computeBindVerdict(env, args); // U-CIMCO-SIM-4 — machine+controller+units bind gate
  // MOCK (and default): the pure planning round-trip — resolved machine + step
  // plan, WITHOUT touching CIMCO. This is the unit's mock E2E.
  if (env.mock) {
    return {
      ok: true, mode: "verify", mock: true, exitCode: 0,
      machine: env.plan?.machine ?? null,
      steps: env.plan?.steps ?? [],
      blockedBy: env.plan?.blockedBy ?? [],
      warnings: env.plan?.warnings ?? [],
      summary: env.plan?.note ?? "", // planNavigation's headline field is `note`, not `summary`
      bind, // U-CIMCO-SIM-4 bind verdict (null if no machine; bound:false fail-CLOSED if units undeclared)
      bindReady: bind ? bind.bound === true : null,
      message: "MOCK verify — resolved machine + planNavigation step plan; no CIMCO contact.",
    };
  }
  // LIVE: confirm the Machine-Simulation control is resolved + present.
  const res = runUiDriver(env.uiDriver, "find", { name: "Machine Simulation", timeoutMs: args.timeoutMs ?? DEFAULT_TIMEOUT_MS });
  const found = res.ok && (Array.isArray(res.controls) ? res.controls.length > 0 : false);
  return {
    ok: found, mode: "verify", mock: false, exitCode: found ? 0 : 2,
    machine: env.plan?.machine ?? null, uiDriver: res,
    bind, // live read-back source wires at U-CIMCO-SIM-5 → fail-CLOSED NO_READBACK until then
    bindReady: bind ? bind.bound === true : null,
    message: found ? "LIVE verify — Machine Simulation control resolved." : "LIVE verify — Machine Simulation control NOT resolved (ribbon unrealized?).",
  };
}

/**
 * Drive mode.
 *  - MOCK: drive the hop sequence as a PLAN and feed `mockReport` (a
 *    SimReportRow[] / report) through the REAL parseSimulationReport so the
 *    fail-closed verdict is exercised end-to-end. Proves the wire without CIMCO.
 *  - LIVE: fail-loud — the live hop+read is U-CIMCO-SIM-3/6; never faked here.
 *
 * @param {object|Array|null} mockReport - injectable sim report for the mock E2E.
 */
/**
 * Build the U-CIMCO-SIM-5 §E2/§E4 "real, complete run" verdict from observed run
 * signals. Returns null when no observations are supplied (nothing to assess).
 * @param {object} [runObs] - {completion:<snapshot>, reportReads:[r1,r2],
 *   simulated:{blocks}, sourceNc:<NC text|{blocks}>, modal:{title,text}|null}
 */
export function buildRunCompleteness(runObs) {
  if (!runObs || typeof runObs !== "object") return null;
  const completion = assessSimCompletion(runObs.completion);
  const reads = Array.isArray(runObs.reportReads) ? runObs.reportReads : [];
  const quiescence = assessReportQuiescence(reads[0], reads[1]);
  const source = typeof runObs.sourceNc === "string" ? countNcProgram(runObs.sourceNc) : (runObs.sourceNc || {});
  const coverage = assessLineCoverage(runObs.simulated, source);
  const modal = classifyModal(runObs.modal);
  return assessRunCompleteness({ completion, quiescence, coverage, modal });
}

export function modeDrive(env, mockReport = undefined, runObs = undefined) {
  if (!env.mock) {
    return {
      ok: false, mode: "drive", mock: false, exitCode: 2,
      blockedBy: "live-drive-needs-ui-map-fsm",
      machine: env.plan?.machine ?? null,
      message: "LIVE drive not yet wired — the live hop sequence is U-CIMCO-SIM-3 (cimco-ui-map FSM) + U-CIMCO-SIM-6 (--op read-report). This unit does not fake a live verdict (R12).",
    };
  }
  // MOCK: the report defaults to null when none injected. parseSimulationReport's
  // fail-OPEN guard makes a null/empty report NEVER clean — exactly the behavior
  // we want surfaced (an un-run sim is not a pass).
  const report = mockReport === undefined ? null : mockReport;
  const verdict = parseSimulationReport(report);
  // U-CIMCO-SIM-5 §E2/§E4: a clean report counts toward clearance ONLY on an
  // observably-complete run (observed terminal-complete + quiescent report + full
  // line/block coverage + no blocking modal). When run observations are supplied,
  // AND run-completeness into the displayed clearance; with none, preserve the
  // report-only signal (SIM-2 behavior). The TS assessLiveRunClearance (SIM-7) is
  // the authoritative combiner — this never duplicates that final gate (R7).
  const runCompleteness = buildRunCompleteness(runObs);
  const clearedForLiveRun = verdict.clearedForLiveRun && (runCompleteness ? runCompleteness.runComplete : true);
  return {
    ok: verdict.pass === true, mode: "drive", mock: true,
    exitCode: verdict.pass === true ? 0 : 1,
    machine: env.plan?.machine ?? null,
    simVerdict: verdict,
    runCompleteness, // U-CIMCO-SIM-5 §E2/§E4 (null when no run observations supplied)
    clearedForLiveRun, // report pass AND collision-check ran AND (if observed) run-complete
    machineClearance: "deferred-to-engine", // assessLiveRunClearance (TS) @ dispatcher U-CIMCO-SIM-7
    steps: env.plan?.steps ?? [],
    message: `MOCK drive — SimReport verdict: pass=${verdict.pass}, clearedForLiveRun=${clearedForLiveRun}` +
      `${verdict.firstOffendingLine != null ? `, firstOffendingLine=${verdict.firstOffendingLine}` : ""}` +
      `${runCompleteness ? `, runComplete=${runCompleteness.runComplete}${runCompleteness.blockers.length ? ` [${runCompleteness.blockers.length} blocker(s)]` : ""}` : ""}. Machine clearance deferred to the TS engine gate.`,
  };
}

/**
 * Assess a `--op read-report` payload (U-CIMCO-SIM-1A): normalize the MSAA node
 * dump -> rows -> the REAL parseSimulationReport verdict, gated by whether the
 * read was clearance-capable (a real grid/textscrape/empty read, never a
 * blocked/opaque/error one). clearedForLiveRun requires ALL of: a clearance-capable
 * read AND verdict.clearedForLiveRun AND (if observed) a complete run. Single-source:
 * defers the final machine clearance to assessLiveRunClearance (TS) at the dispatcher.
 * @param {object} payload - the read-report JSON (or a runUiDriver fail envelope).
 * @param {object} [runObs] - optional run observations (SIM-5 completeness).
 */
export function assessReadReport(payload, runObs = undefined) {
  const norm = normalizeReportNodes(payload);
  const verdict = parseSimulationReport(norm.rows);
  const runCompleteness = buildRunCompleteness(runObs);
  const clearanceCapable = CLEARANCE_CAPABLE.has(norm.source);
  const clearedForLiveRun = clearanceCapable && verdict.clearedForLiveRun && (runCompleteness ? runCompleteness.runComplete : true);
  return {
    source: norm.source,
    // A non-clearance-capable read MUST surface a blocker (never a silent clean read).
    blockedBy: norm.blockedBy ?? (clearanceCapable ? null : `report-not-clearance-capable:${norm.source}`),
    rowCount: norm.rows.length,
    rows: norm.rows,
    container: norm.container ?? null,
    simVerdict: verdict,
    runCompleteness,
    clearanceCapable,
    clearedForLiveRun,
  };
}

/** A small clean 2-row grid for the mock wire E2E (advisory tool-change + warning -> conformance pass). */
const MOCK_READ_REPORT = Object.freeze({
  ok: true, op: "read-report", frameRealized: true, found: true, frameNodeCount: 200,
  nodes: [
    { text: "3 | Tool Change | T05", role: "listitem", path: "root>Report" },
    { text: "8 | Warning | high feed near rapid", role: "listitem", path: "root>Report" },
  ],
});

/**
 * read-report mode (U-CIMCO-SIM-1A part 2).
 *  - MOCK: run an injected (default clean) read-report payload through the REAL
 *    normalizer + parseSimulationReport so the wire is exercised end-to-end.
 *  - LIVE: read the CURRENTLY-shown CIMCO sim report (the operator has opened CIMCO
 *    + run the sim) via `--op read-report`. This unit READS; the FSM that RUNS the
 *    sim first is U-CIMCO-SIM-3's live drive (operator-gated). Fail-closed: a
 *    blocked/opaque/empty read never clears.
 * @param {object|undefined} injectedPayload - mock read-report payload override.
 */
export function modeReadReport(env, args = {}, injectedPayload = undefined, runObs = undefined, runUi = runUiDriver) {
  if (env.mock) {
    const payload = injectedPayload === undefined ? MOCK_READ_REPORT : injectedPayload;
    const a = assessReadReport(payload, runObs);
    return {
      ok: a.clearanceCapable, mode: "read-report", mock: true,
      exitCode: !a.clearanceCapable ? 2 : a.simVerdict.pass ? 0 : 1,
      machine: env.plan?.machine ?? null, ...a, machineClearance: "deferred-to-engine",
      message: `MOCK read-report -- source=${a.source} rows=${a.rowCount} pass=${a.simVerdict.pass} cleared=${a.clearedForLiveRun}` +
        `${a.blockedBy ? ` blockedBy=${a.blockedBy}` : ""}. Machine clearance deferred to the TS engine gate.`,
    };
  }
  // LIVE: read whatever sim report is currently shown (operator opened CIMCO + ran the sim).
  // runUi is injectable (DI, like runUiDriver's spawn) so the live branch is hermetically testable.
  const res = runUi(env.uiDriver, "read-report", { name: args.reportName, timeoutMs: args.timeoutMs ?? DEFAULT_TIMEOUT_MS });
  const a = assessReadReport(res, runObs);
  return {
    ok: a.clearanceCapable, mode: "read-report", mock: false,
    exitCode: !a.clearanceCapable ? 2 : a.simVerdict.pass ? 0 : 1,
    machine: env.plan?.machine ?? null, uiDriver: res, ...a, machineClearance: "deferred-to-engine",
    message: `LIVE read-report -- source=${a.source} rows=${a.rowCount} pass=${a.simVerdict.pass} cleared=${a.clearedForLiveRun}` +
      `${a.blockedBy ? ` blockedBy=${a.blockedBy}` : ""}.`,
  };
}

/** Structural content key of a read-report payload (normalized rows + source) for quiescence detection. */
function reportContentKey(payload) {
  const n = normalizeReportNodes(payload);
  return n.source + "|" + JSON.stringify(n.rows);
}

/**
 * FSM live-drive orchestrator (U-CIMCO-FSM-LIVE-DRIVE). Chains the shipped pieces into the closed loop:
 *   navigate (cimco-ui-map FSM, per-step verified) -> run Machine Simulation -> poll read-report to
 *   quiescence -> assessReadReport verdict. FAIL-CLOSED at EVERY hop: a failed/blocked/unrealized
 *   navigation, a poll that never settles (the sim may not have finished), or a non-clearance-capable
 *   read all yield cleared:false. Deps (navigate/readReport/sleep) are injected so the whole chain is
 *   hermetically testable with a recorded harness; live wiring supplies navigateLive + the read-report op.
 * Machine clearance stays DEFERRED to the TS assessLiveRunClearance gate (single-source, R7).
 * @returns {Promise<object>} composite drive verdict.
 */
export async function driveLiveFsm(opts = {}) {
  const {
    navigate, readReport,
    target = "machine-sim-running",
    maxPolls = 6, settleMs = 1200,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    runObs = undefined,
  } = opts;
  if (typeof navigate !== "function" || typeof readReport !== "function") {
    return { cleared: false, clearedForLiveRun: false, stage: "args", blockedBy: "driveLiveFsm needs navigate + readReport fns" };
  }
  // 1. Navigate to the running-sim screen: realize-gate + per-step-verified hops + invoke Machine Simulation.
  //    navigateLive fails CLOSED (unrealized / ambiguous / drift / blocked-modal) -> we propagate that.
  const nav = await navigate(target);
  if (!nav || nav.ok !== true) {
    return {
      cleared: false, clearedForLiveRun: false, stage: "navigate",
      blockedBy: (nav && (nav.reason || (nav.needsRealization ? "ribbon-uia-unrealized" : null))) || "navigation-failed",
      navigation: nav ?? null, reportReads: [], simVerdict: null,
    };
  }
  // 2. Poll read-report until two consecutive reads are content-identical (the sim stopped producing) or maxPolls.
  const reads = [];
  let prevKey = null, quiescent = false;
  for (let i = 0; i < maxPolls; i++) {
    if (i > 0) await sleep(settleMs);
    const r = readReport();
    reads.push(r);
    const key = reportContentKey(r);
    if (prevKey !== null && key === prevKey) { quiescent = true; break; }
    prevKey = key;
  }
  const finalPayload = reads.length ? reads[reads.length - 1] : null;
  // 3. Assess the final read; the two final reads feed SIM-5 run-completeness.
  const obs = runObs ?? { reportReads: [reads.length >= 2 ? reads[reads.length - 2] : null, finalPayload] };
  const a = assessReadReport(finalPayload, obs);
  // 4. Compose. RE-GATE on quiescence: a sim that never settled NEVER clears (it may not have finished).
  const cleared = quiescent && a.clearedForLiveRun;
  return {
    cleared, clearedForLiveRun: cleared, stage: "complete", quiescent, pollCount: reads.length,
    blockedBy: !quiescent ? "sim-not-quiescent-timeout" : a.blockedBy,
    navigation: nav, reportReads: reads, source: a.source, rows: a.rows, simVerdict: a.simVerdict,
    runCompleteness: a.runCompleteness, machineClearance: "deferred-to-engine",
  };
}

/**
 * drive-live mode (U-CIMCO-FSM-LIVE-DRIVE): the real live FSM chain. MOCK runs driveLiveFsm against an
 * injected recorded harness (navigate + a scripted read-report sequence) so the wire is exercised with NO
 * live CIMCO; LIVE binds navigateLive + the read-report op. Mock-by-default (env.mock). Additive to the
 * existing `drive` mode (which stays the SIM-2 mock report-verdict path); never breaks it.
 */
export async function modeDriveLive(env, args = {}, deps = {}) {
  let navigate = deps.navigate;
  let readReport = deps.readReport;
  if (!env.mock) {
    const { navigateLive } = await import("./cimco-ui-map.mjs");
    navigate = navigate || ((target) => navigateLive(target, { exe: env.uiDriver }));
    readReport = readReport || (() => runUiDriver(env.uiDriver, "read-report", { name: args.reportName, timeoutMs: args.timeoutMs ?? DEFAULT_TIMEOUT_MS }));
  }
  if (typeof navigate !== "function" || typeof readReport !== "function") {
    return {
      ok: false, mode: "drive-live", mock: env.mock, exitCode: 2, machine: env.plan?.machine ?? null,
      blockedBy: "drive-live needs injected navigate + readReport (mock harness) or live drivers (--no-mock)",
      message: "drive-live (mock) requires an injected recorded harness; live requires --no-mock + PRISM_CIMCO_MOCK=0.",
    };
  }
  const d = await driveLiveFsm({ navigate, readReport, ...deps });
  return {
    ok: d.cleared, mode: "drive-live", mock: env.mock,
    exitCode: d.cleared ? 0 : (d.simVerdict && d.simVerdict.pass === false ? 1 : 2),
    machine: env.plan?.machine ?? null, ...d,
    message: `${env.mock ? "MOCK" : "LIVE"} drive-live -- stage=${d.stage} quiescent=${d.quiescent ?? false} cleared=${d.cleared}` +
      `${d.blockedBy ? ` blockedBy=${d.blockedBy}` : ""}. Machine clearance deferred to the TS engine gate.`,
  };
}

/**
 * Map a driveLiveFsm result -> the prism_cimco:cimco_live_run_clearance params (U-CIMCO-CLEARANCE-COMPOSE).
 * The driver NEVER owns the final machine clearance (R7) -- it produces the input the TS 5-gate combiner
 * (machineBound + units + kinematics + sim cleared + run complete) needs. FAIL-CLOSED: a non-cleared /
 * non-quiescent drive yields run_complete.runComplete:false so the 5-gate can never pass; the drive's
 * blockedBy is surfaced as a blocker. program_units must be DECLARED (never inferred -- 25.4x guard); an
 * absent value flows to the gate as undefined -> the gate's units check fails closed.
 * @param {object} driveResult - a driveLiveFsm result
 * @param {object} [opts] - { machine, bindVerdict, kinematicsVerified, programUnits }
 * @returns {object} cimco_live_run_clearance params (feed to prism_cimco)
 */
export function composeClearanceInput(driveResult, opts = {}) {
  const d = driveResult || {};
  const rc = d.runCompleteness;
  // The DRIVE's actual settling gates run-completeness -- a sim that never went quiescent did NOT finish,
  // even if the caller supplied complete SIM-5 observations. Quiescence AND (the SIM-5 verdict if present)
  // must both hold. A non-settled drive surfaces its blocker.
  const settled = d.quiescent === true;
  const run_complete = rc
    ? {
        runComplete: settled && rc.runComplete === true,
        blockers: [...(Array.isArray(rc.blockers) ? rc.blockers : []), ...(!settled && d.blockedBy ? [d.blockedBy] : [])],
      }
    : { runComplete: settled && d.cleared === true, blockers: d.blockedBy ? [d.blockedBy] : [] };
  return {
    machine: opts.machine ?? null,
    bind_verdict: opts.bindVerdict ?? null,
    sim_verdict: d.simVerdict ?? null,
    run_complete,
    kinematics_verified: opts.kinematicsVerified === true,
    program_units: opts.programUnits, // inch|mm declared only; absent -> gate fails closed (25.4x guard)
  };
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }

  const env = probeEnv(args);

  if (env.fatal) {
    const out = { mode: "diagnostic", mock: env.mock, env: { issues: env.issues }, message: "Environment probe FAILED — see issues[]" };
    emit(out, args.json);
    // Exit-code contract: 3 = "you called me wrong" (bad-args ONLY); 2 = "the
    // environment/CIMCO is wrong" (missing exe/nc, unresolved machine, EDM, etc.).
    const onlyBadArgs = env.issues.filter((i) => i.severity === "fatal").every((i) => i.code === "BAD_ARGS");
    process.exit(onlyBadArgs ? 3 : 2);
  }

  let result;
  if (args.mode === "launch") result = modeLaunch(env, args);
  else if (args.mode === "verify") result = modeVerify(env, args);
  else if (args.mode === "drive") result = modeDrive(env);
  else if (args.mode === "read-report") result = modeReadReport(env, args);
  else if (args.mode === "drive-live") result = await modeDriveLive(env, args);
  else { process.stderr.write(`Unknown mode: ${args.mode}\n`); process.exit(3); }

  emit(result, args.json);
  process.exit(result.exitCode ?? (result.ok ? 0 : 1));
}

function emit(r, json) {
  if (json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); return; }
  process.stdout.write(formatHuman(r) + "\n");
}

function formatHuman(r) {
  const lines = [`mode=${r.mode} mock=${r.mock ?? "?"} ok=${r.ok ?? "?"} exit=${r.exitCode ?? "?"}`];
  if (r.machine) lines.push(`  machine:    ${r.machine.machine_id ?? r.machine.machine_name ?? "?"} (${r.machine.type ?? "?"})`);
  if (r.machine?.cimcoMatch) lines.push(`  .mcfg:      ${r.machine.cimcoMatch.displayName} [${r.machine.cimcoMatch.file}] unitsResolved=${r.machine.cimcoMatch.unitsResolved}`);
  if (r.controlCount != null) lines.push(`  controls:   ${r.controlCount}`);
  if (r.source && r.mode === "read-report") lines.push(`  read:       source=${r.source} rows=${r.rowCount ?? 0} clearanceCapable=${r.clearanceCapable}`);
  if (r.simVerdict) lines.push(`  verdict:    pass=${r.simVerdict.pass} cleared=${r.clearedForLiveRun} collisions=${r.simVerdict.counts?.collision ?? 0} errors=${r.simVerdict.counts?.error ?? 0}`);
  if (r.machineClearance) lines.push(`  clearance:  ${r.machineClearance}`);
  if (Array.isArray(r.steps) && r.steps.length) lines.push(`  steps:      ${r.steps.length} (${r.steps.map((s) => s.phase).join(" → ")})`);
  if (r.blockedBy) lines.push(`  blockedBy:  ${Array.isArray(r.blockedBy) ? r.blockedBy.join(", ") : r.blockedBy}`);
  if (r.message) lines.push(`  message:    ${r.message}`);
  if (r.env?.issues?.length) {
    lines.push(`  issues:`);
    for (const i of r.env.issues) lines.push(`    [${i.severity}] ${i.code}: ${i.message}`);
  }
  return lines.join("\n");
}

// Only run main() when invoked directly (not when imported by the test).
const INVOKED_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (INVOKED_DIRECTLY) main().catch((e) => { process.stderr.write(String(e?.stack || e) + "\n"); process.exit(1); });
