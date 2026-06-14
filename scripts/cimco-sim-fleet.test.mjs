#!/usr/bin/env node
/**
 * Tests for the CIMCO fleet sim-readiness rollup (U-CIMCO-SIM-7).
 *
 * R9 -- each test encodes WHY: the fleet rollup is the operator's "is every JM
 * machine ready to start closed-loop testing, and what blocks each?" answer.
 * Real values from the live jm-fleet-sim-map (15 machines). The dangerous case
 * is a units mismatch (inch NC into mm .mcfg) silently reading as ready.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assessFleetReadiness, renderFleetReport, READINESS } from "./cimco-sim-fleet.mjs";

test("fleet readiness over all 15 JM machines: 12 drive-ready (mill/lathe) + 3 EDM-routed", () => {
  const r = assessFleetReadiness({}, { ncUnits: "mm" });
  assert.equal(r.machineCount, 15);
  assert.equal(r.rollup.driveReady, 12, "12 sim-able mill/lathe machines bind clean");
  assert.equal(r.rollup.blockedByBind, 0, "no mill/lathe machine has a build-level bind problem");
  assert.equal(r.rollup.edmRouted, 3, "3 EDM machines route to discharge-physics");
  assert.equal(r.allSimAbleReady, true, "the fleet is build-ready");
  // rollup partitions the fleet exactly (no machine double-counted or dropped):
  assert.equal(r.rollup.driveReady + r.rollup.blockedByBind + r.rollup.edmRouted, r.machineCount);
});

test("every EDM machine routes to discharge-physics, never a CIMCO drive", () => {
  const r = assessFleetReadiness({}, { ncUnits: "mm" });
  const edms = r.machines.filter((m) => /edm/i.test(m.machine_id));
  assert.equal(edms.length, 3);
  for (const e of edms) {
    assert.equal(e.readiness, READINESS.EDM_ROUTED);
    assert.equal(e.bound, null, "EDM is not bind-assessed (CIMCO can't model it)");
  }
});

test("Haas PRE-NGC machines (VMC-03/04) are DRIVE-READY without the generic-template downgrade", () => {
  const r = assessFleetReadiness({}, { ncUnits: "mm" });
  for (const id of ["VMC-03", "VMC-04"]) {
    const m = r.machines.find((x) => x.machine_id === id);
    assert.equal(m.readiness, READINESS.DRIVE_READY);
    assert.ok(!m.downgrades.includes("generic-template"), `${id} is a native-cimco-match, not generic`);
  }
});

test("generic-template machines carry the kinematics-CANDIDATE downgrade (not controller-verified)", () => {
  const r = assessFleetReadiness({}, { ncUnits: "mm" });
  const vmc01 = r.machines.find((x) => x.machine_id === "VMC-01"); // Hurco, generic-template
  assert.equal(vmc01.readiness, READINESS.DRIVE_READY);
  assert.ok(vmc01.downgrades.includes("generic-template"));
});

test("UNITS GUARD: inch NC against the mm .mcfg fleet BLOCKS every sim-able machine (25.4x trap)", () => {
  // The single most important fleet-level safety property: an inch NC posted against
  // the mm CIMCO machines is a 25.4x scale error. NONE may read as drive-ready.
  const r = assessFleetReadiness({}, { ncUnits: "inch" });
  assert.equal(r.rollup.driveReady, 0, "no machine is drive-ready with mismatched units");
  assert.equal(r.rollup.blockedByBind, 12, "all 12 sim-able machines blocked on units");
  assert.equal(r.allSimAbleReady, false, "the fleet is NOT build-ready with an inch NC");
  // EDM still routes regardless of units:
  assert.equal(r.rollup.edmRouted, 3);
  const lth01 = r.machines.find((x) => x.machine_id === "LTH-01");
  assert.ok(/units/i.test(lth01.bindBlocker), `blocked on units, got ${lth01.bindBlocker}`);
});

test("UNITS GUARD: an UNRECOGNIZED unit (e.g. 'cm') fails CLOSED too -- no machine drive-ready", () => {
  // Defense beyond inch/mm: a garbage/unknown unit must never clear. The bind
  // gate compares against the mm .mcfg, so anything != 'mm' blocks (fail-closed).
  const r = assessFleetReadiness({}, { ncUnits: "cm" });
  assert.equal(r.rollup.driveReady, 0);
  assert.equal(r.rollup.blockedByBind, 12);
  assert.equal(r.allSimAbleReady, false);
});

test("UNITS-FIRST: OMITTED/null NC units fail CLOSED -- never a silent default, no machine drive-ready", () => {
  // The most likely operator error: running the rollup WITHOUT declaring units.
  // The bind gate refuses to infer units (UNITS_UNRESOLVED); the fleet rollup must
  // NOT paper over that with a silent 'mm' assumption (the 25.4x trap, reviewer-C catch).
  for (const opts of [{}, { ncUnits: null }, { ncUnits: undefined }]) {
    const r = assessFleetReadiness({}, opts);
    assert.equal(r.rollup.driveReady, 0, `omitted units must yield 0 drive-ready (opts=${JSON.stringify(opts)})`);
    assert.equal(r.rollup.blockedByBind, 12, "all 12 sim-able machines blocked when units undeclared");
    assert.equal(r.allSimAbleReady, false);
    const lth01 = r.machines.find((x) => x.machine_id === "LTH-01");
    assert.ok(/unresolved|declared/i.test(lth01.bindBlocker), `blocked on units-unresolved, got ${lth01.bindBlocker}`);
  }
});

test("empty fleet does NOT read vacuously build-ready (allSimAbleReady guards on machineCount)", () => {
  // A corrupt/empty sim-map yields zero machines; allSimAbleReady must be false,
  // not a misleading "ready" from 0 bind-blockers.
  const r = assessFleetReadiness({ simMap: { schemaVersion: "1.0.0", machines: [] } }, { ncUnits: "mm" });
  assert.equal(r.machineCount, 0);
  assert.equal(r.allSimAbleReady, false, "no machines != build-ready");
});

test("renderFleetReport is pure ASCII (PS-5.1 / parser / grep safe) and carries the rollup + operator gate", () => {
  const r = assessFleetReadiness({}, { ncUnits: "mm" });
  const text = renderFleetReport(r);
  const firstNonAscii = [...text].find((c) => c.charCodeAt(0) > 127);
  assert.equal(firstNonAscii, undefined, `report must be pure ASCII (found ${firstNonAscii ? JSON.stringify(firstNonAscii) : ""})`);
  assert.ok(text.includes("drive-ready (binds): 12"));
  assert.ok(text.includes("EDM-routed: 3"));
  assert.ok(/operator-supervised/i.test(text), "operator-gate note present (DRIVE-READY != validated on metal)");
});

test("controllerVerified honesty: no machine is presented as controller-verified", () => {
  // DRIVE-READY is a bind + build-readiness signal, never a metal-safety guarantee.
  const r = assessFleetReadiness({}, { ncUnits: "mm" });
  assert.ok(/NOT validated on metal/i.test(r.operatorGate));
});
