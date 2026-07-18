#!/usr/bin/env node
/**
 * CIMCO fleet sim-readiness rollup -- U-CIMCO-SIM-7.
 *
 * The single "is the whole JM fleet ready to start closed-loop sim testing, and
 * what blocks each machine?" answer the operator goal needs. Over planFleet()
 * (all 15 JM machines):
 *   - sim-able mill/lathe -> run the U-CIMCO-SIM-4 bind gate (machine + controller
 *     post + units) with a mock read-back -> DRIVE-READY iff it binds, else
 *     BLOCKED-BIND (a build problem to fix before any drive).
 *   - EDM -> routed to discharge-physics (CIMCO models mill/lathe kinematics only).
 *
 * Static/mock -- the live sim DRIVE is operator-supervised (needs an operator-
 * opened CIMCO; the report-grid read is U-CIMCO-SIM-1/6, operator-gated). A
 * DRIVE-READY verdict means "binds clean -- the closed loop runs the moment an
 * operator opens CIMCO Edit", NOT "already validated on metal" (controllerVerified
 * is structurally false; the final go/no-go is assessLiveRunClearance at the
 * dispatcher per live sim).
 *
 * CLI: node scripts/cimco-sim-fleet.mjs [--json] [--nc-units mm|inch]
 */
import { planFleet, loadSimMap, resolveJmMachine } from "./cimco-nav-planner.mjs";
import { assessMachineBind, synthesizeMockReadback, isEdmMachine } from "./cimco-bind-gate.mjs";

export const READINESS = Object.freeze({
  DRIVE_READY: "drive-ready", // binds clean -- drivable the moment an operator opens CIMCO
  BLOCKED_BIND: "blocked-bind", // the bind gate refuses (wrong machine/post/units) -- a build problem
  EDM_ROUTED: "edm-discharge-physics", // not a CIMCO drive (CIMCO models mill/lathe only)
});

/**
 * Assess closed-loop sim readiness for every JM machine.
 * @param {object} [ctx] - { simMap, navMap, launchSurface } (defaults loaded)
 * @param {object} [opts]
 * @param {string} [opts.ncUnits] - declared NC units (the sim .mcfg is mm; the NC
 *   must be posted mm to match, or the bind refuses -- 25.4x guard). Default "mm".
 * @returns {object} fleet readiness rollup
 */
export function assessFleetReadiness(ctx = {}, opts = {}) {
  const simMap = ctx.simMap || loadSimMap();
  const fleet = planFleet({ ...ctx, simMap });
  // NO default -- units must be DECLARED, never inferred (units-first rule / 25.4x
  // trap). Absent ncUnits flows to the bind gate as undefined -> UNITS_UNRESOLVED ->
  // every machine BLOCKED-BIND (fail-closed), NEVER a silent mm assumption.
  const ncUnits = opts.ncUnits;
  const machines = fleet.machines.map((row) => {
    const m = resolveJmMachine(simMap, row.machine_id);
    if (isEdmMachine(m)) {
      return {
        machine_id: row.machine_id, machine_name: row.machine_name, type: row.type, status: row.status,
        readiness: READINESS.EDM_ROUTED, bound: null, bindBlocker: null, downgrades: [],
        notes: ["CIMCO models mill/lathe kinematics only -- EDM verdict is PRISM discharge-physics."],
        verdictArm: row.verdictArm, simMcfg: row.simMcfg,
      };
    }
    const bind = assessMachineBind(m, synthesizeMockReadback(m), { ncUnits, unitsDoubleChecked: true });
    return {
      machine_id: row.machine_id, machine_name: row.machine_name, type: row.type, status: row.status,
      readiness: bind.bound ? READINESS.DRIVE_READY : READINESS.BLOCKED_BIND,
      bound: bind.bound, bindBlocker: bind.blocker, downgrades: bind.downgrades,
      notes: bind.notes ?? [], verdictArm: row.verdictArm, simMcfg: row.simMcfg,
    };
  });
  const count = (r) => machines.filter((x) => x.readiness === r).length;
  const rollup = {
    driveReady: count(READINESS.DRIVE_READY),
    blockedByBind: count(READINESS.BLOCKED_BIND),
    edmRouted: count(READINESS.EDM_ROUTED),
  };
  return {
    schemaVersion: "1.0.0",
    machineCount: machines.length,
    ncUnits,
    rollup,
    // build-ready iff there ARE machines AND none are bind-blocked -- an empty
    // fleet (corrupt/empty sim-map) must NOT read vacuously "ready" (Ollama-preflight catch).
    allSimAbleReady: machines.length > 0 && rollup.blockedByBind === 0,
    operatorGate: "The live sim DRIVE is operator-supervised: open CIMCO Edit (realizes the ribbon), then the per-machine closed loop runs (navigate -> run -> report -> assessLiveRunClearance). DRIVE-READY = binds clean, NOT validated on metal.",
    note: fleet.note,
    machines,
  };
}

/** Human-readable one-screen fleet readiness report (pure ASCII). */
export function renderFleetReport(result) {
  const lines = [];
  lines.push(`CIMCO FLEET SIM-READINESS -- ${result.machineCount} JM machines (NC units: ${result.ncUnits ?? "UNDECLARED -- pass --nc-units mm|inch; until declared every machine fails closed"})`);
  lines.push(`  drive-ready (binds): ${result.rollup.driveReady} | blocked-bind: ${result.rollup.blockedByBind} | EDM-routed: ${result.rollup.edmRouted}`);
  lines.push(`  fleet build-ready: ${result.allSimAbleReady ? "YES -- every mill/lathe machine binds" : "NO -- fix blocked-bind machines first"}`);
  for (const m of result.machines) {
    const tag = m.readiness === READINESS.DRIVE_READY ? "[OK] DRIVE-READY"
      : m.readiness === READINESS.EDM_ROUTED ? "[->] EDM (discharge-physics)"
        : `[X] BLOCKED (${m.bindBlocker})`;
    const dg = m.downgrades && m.downgrades.length ? ` [${m.downgrades.join(", ")}]` : "";
    lines.push(`    ${String(m.machine_id).padEnd(8)} ${String(m.machine_name ?? "").padEnd(20)} ${tag}${dg}`);
  }
  lines.push(`  ${result.operatorGate}`);
  return lines.join("\n");
}

// -- CLI ----------------------------------------------------------------
function isMain() {
  try { return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href; }
  catch { return false; }
}
if (isMain()) {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const uIdx = argv.indexOf("--nc-units");
  // Omit --nc-units -> undefined -> fail-closed (every machine BLOCKED on UNITS_UNRESOLVED),
  // NEVER a silent default. Units must be declared (units-first / 25.4x guard).
  const ncUnits = uIdx >= 0 ? argv[uIdx + 1] : undefined;
  const result = assessFleetReadiness({}, { ncUnits });
  process.stdout.write(json ? JSON.stringify(result, null, 2) + "\n" : renderFleetReport(result) + "\n");
  // Exit 0 always (a readiness report is informational); blocked-bind is surfaced in the rollup, not an error code.
}
