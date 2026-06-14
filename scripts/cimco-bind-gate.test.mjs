#!/usr/bin/env node
/**
 * Tests for the CIMCO machine+controller bind gate (U-CIMCO-SIM-4).
 *
 * R9 — every test encodes WHY the bind matters: the kinematic-mismatch, the
 * wrong-NGC-post, and the 25.4× units traps are each load-time ways to "prove" a
 * post that was never really validated. Real values from the live JM fleet
 * sim-map; happy path + every fail-CLOSED blocker + adversarial cases.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  assessMachineBind,
  synthesizeMockReadback,
  isEdmMachine,
  isPreNgcHaas,
  classifyHaasPostGeneration,
  BIND_BLOCKERS,
} from "./cimco-bind-gate.mjs";

const require = createRequire(import.meta.url);
const simMap = require("../state/shared/cimco/jm-fleet-sim-map.json");
const byId = (id) => simMap.machines.find((m) => m.machine_id === id);
const VMC03 = byId("VMC-03"); // Haas VF-2, PRE-NGC, native-cimco-match, unitsResolved:false
const VMC01 = byId("VMC-01"); // Hurco, generic-template, unitsResolved:true
const LTH01 = byId("LTH-01"); // lathe, generic-template
const EDM01 = byId("EDM-01"); // sinker_edm, cimcoMatch:null

// ── helpers ──────────────────────────────────────────────────────────
function bindOk(m, overrides = {}, opts = {}) {
  return assessMachineBind(m, synthesizeMockReadback(m, overrides), {
    ncUnits: "mm",
    unitsDoubleChecked: true,
    ...opts,
  });
}

// ── classifiers ──────────────────────────────────────────────────────
test("classifyHaasPostGeneration — classic checked BEFORE ngc (pre-NGC substring trap)", () => {
  // "pre-NGC" contains "ngc"; it MUST classify as classic, not ngc — the exact inversion the gate guards.
  assert.equal(classifyHaasPostGeneration("Haas pre-NGC"), "classic");
  assert.equal(classifyHaasPostGeneration("Haas VR (classic)"), "classic");
  assert.equal(classifyHaasPostGeneration("Haas Classic"), "classic");
  assert.equal(classifyHaasPostGeneration("Haas NGC"), "ngc");
  assert.equal(classifyHaasPostGeneration("Haas Next Gen Control"), "ngc");
  assert.equal(classifyHaasPostGeneration("Some Random Post"), "unknown");
  assert.equal(classifyHaasPostGeneration(""), "unknown");
  assert.equal(classifyHaasPostGeneration(null), "unknown");
});

test("isPreNgcHaas — only Haas PRE-NGC machines (VMC-03/04)", () => {
  assert.equal(isPreNgcHaas(VMC03), true);
  assert.equal(isPreNgcHaas(VMC01), false); // hurco
  assert.equal(isPreNgcHaas(LTH01), false);
  assert.equal(isPreNgcHaas({ controller_family: "haas", controller_model: "NGC" }), false);
});

test("isEdmMachine — sinker + wire EDM detected by type/cimcoMatch/status", () => {
  assert.equal(isEdmMachine(EDM01), true);
  assert.equal(isEdmMachine(byId("WEDM-01")), true);
  assert.equal(isEdmMachine(VMC01), false);
  assert.equal(isEdmMachine({ type: "mill", cimcoMatch: null }), true); // null mcfg ⇒ treat as not-simulable
});

// ── happy path: every one of the 15 fleet machines ───────────────────
test("all 15 JM fleet machines: 12 mill/lathe BIND, 3 EDM route to discharge-physics", () => {
  let bound = 0, edm = 0;
  for (const m of simMap.machines) {
    if (isEdmMachine(m)) {
      const v = assessMachineBind(m, null, {});
      assert.equal(v.blocker, BIND_BLOCKERS.EDM_NOT_SIMULABLE, `${m.machine_id} should EDM-route`);
      assert.equal(v.verdictArm, "discharge-physics");
      assert.equal(v.bound, false);
      edm++;
      continue;
    }
    const v = bindOk(m);
    assert.equal(v.bound, true, `${m.machine_id} should bind: ${v.blocker} ${JSON.stringify(v.notes)}`);
    assert.equal(v.controllerVerified, false, `${m.machine_id} controllerVerified must be the irreducible false`);
    bound++;
  }
  assert.equal(bound, 12, "12 sim-able mill/lathe machines bind");
  assert.equal(edm, 3, "3 EDM machines route away from CIMCO");
});

// ── trap 1: kinematic mismatch ───────────────────────────────────────
test("MACHINE_MISMATCH — loaded .mcfg ≠ expected refuses the bind (kinematic-mismatch trap)", () => {
  const v = assessMachineBind(VMC01,
    { machineFile: "Totally Different.mcfg", machineDisplayName: "Some Other Machine", controllerPost: "hurco post", units: "mm" },
    { ncUnits: "mm" });
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.MACHINE_MISMATCH);
  assert.equal(v.checks.machineMatch, false);
});

test("machine match accepts a file-only OR displayName-only read-back", () => {
  const byFile = assessMachineBind(VMC01, { machineFile: VMC01.cimcoMatch.file, controllerPost: "hurco post", units: "mm" }, { ncUnits: "mm" });
  assert.equal(byFile.bound, true);
  const byName = assessMachineBind(VMC01, { machineDisplayName: VMC01.cimcoMatch.displayName, controllerPost: "hurco post", units: "mm" }, { ncUnits: "mm" });
  assert.equal(byName.bound, true);
});

// ── trap 2: wrong controller post (VR-not-NGC for VMC-03/04) ──────────
test("WRONG_POST_NGC — NGC post on a PRE-NGC Haas (VMC-03) is fail-CLOSED", () => {
  const v = bindOk(VMC03, { controllerPost: "Haas NGC" });
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.WRONG_POST_NGC);
  assert.equal(v.checks.postGeneration, "ngc");
});

test("POST_UNVERIFIED — unclassifiable post on PRE-NGC Haas fails CLOSED (can't confirm VR)", () => {
  const v = bindOk(VMC03, { controllerPost: "mystery post" });
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.POST_UNVERIFIED);
});

test("PRE-NGC Haas with the correct VR/classic post BINDS", () => {
  const v = bindOk(VMC03, { controllerPost: "Haas VR (classic)" });
  assert.equal(v.bound, true);
  assert.equal(v.checks.postGeneration, "classic");
});

test("non-PRE-NGC machines do NOT hard-gate the post (no verified RPost table)", () => {
  const v = bindOk(VMC01, { controllerPost: "literally anything" });
  assert.equal(v.bound, true);
  assert.equal(v.checks.postGeneration, "not-gated");
});

// ── trap 3: 25.4× units ──────────────────────────────────────────────
test("UNITS_MISMATCH — inch NC into a mm .mcfg is the 25.4× trap, refused", () => {
  const v = assessMachineBind(VMC01, synthesizeMockReadback(VMC01), { ncUnits: "inch" });
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.UNITS_MISMATCH);
});

test("UNITS_MISMATCH — loaded units disagreeing with the mm .mcfg is refused", () => {
  const v = assessMachineBind(VMC01, synthesizeMockReadback(VMC01, { units: "inch" }), { ncUnits: "mm" });
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.UNITS_MISMATCH);
});

test("UNITS_UNRESOLVED — undeclared NC units fail CLOSED (never inferred)", () => {
  const v = assessMachineBind(VMC01, synthesizeMockReadback(VMC01), {}); // no ncUnits
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.UNITS_UNRESOLVED);
});

test("UNITS_UNRESOLVED — unitsResolved:false machine (VMC-03) needs a double-check", () => {
  // Correct machine + post + matching units, but no double-check on an unitsResolved:false mapping.
  const v = assessMachineBind(VMC03, synthesizeMockReadback(VMC03), { ncUnits: "mm" });
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.UNITS_UNRESOLVED);
  // ...and it BINDS once the double-check is supplied:
  const ok = assessMachineBind(VMC03, synthesizeMockReadback(VMC03), { ncUnits: "mm", unitsDoubleChecked: true });
  assert.equal(ok.bound, true);
});

// ── fail-CLOSED: no read-back ─────────────────────────────────────────
test("NO_READBACK — a null read-back is NEVER a pass (same doctrine as an empty report)", () => {
  const v = assessMachineBind(VMC01, null, { ncUnits: "mm" });
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.NO_READBACK);
});

// ── downgrades (bound, but caveated) ─────────────────────────────────
test("generic-template machines bind but carry the kinematics-CANDIDATE downgrade", () => {
  const v = bindOk(VMC01);
  assert.equal(v.bound, true);
  assert.ok(v.downgrades.includes("generic-template"));
  assert.equal(v.controllerVerified, false);
});

test("native-cimco-match (VMC-03) does NOT carry generic-template downgrade", () => {
  const v = bindOk(VMC03, { controllerPost: "Haas VR" });
  assert.equal(v.bound, true);
  assert.ok(!v.downgrades.includes("generic-template"));
  assert.ok(v.downgrades.includes("verify-kinematics-vs-real-machine"));
});

// ── programming-error guard ──────────────────────────────────────────
test("assessMachineBind THROWS on a missing expected entry (programming error, not a bind failure)", () => {
  assert.throws(() => assessMachineBind(null, {}, {}), /expected machine entry is required/);
  assert.throws(() => assessMachineBind({}, {}, {}), /expected machine entry is required/);
});

// ── adversarial: a wrong machine that "happens" to read mm + right family ──
test("adversarial — right units + right family but WRONG machine still refused (mismatch beats units)", () => {
  // An attacker-shaped read-back that passes units and looks plausible but is the wrong .mcfg.
  const v = assessMachineBind(VMC01,
    { machineFile: "Cimco Mill 5 Axis.mcfg", machineDisplayName: "Cimco Mill 5 Axis", controllerPost: "hurco", units: "mm" },
    { ncUnits: "mm" });
  assert.equal(v.bound, false);
  assert.equal(v.blocker, BIND_BLOCKERS.MACHINE_MISMATCH, "machine identity is checked before units — a matching unit cannot launder a wrong machine");
});
