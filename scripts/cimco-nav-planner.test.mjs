// cimco-nav-planner.test.mjs — real-behavior tests for the CIMCO goal-driven blind-nav PLANNER.
// Run: node --test scripts/cimco-nav-planner.test.mjs
//
// Asserts INTENT, not just shape: a sim plan must be NOT blind-driveable (verdict is UIA+license);
// a verify-external/compare plan must be blind-driveable; EDM must route to discharge-physics; the
// units-unresolved Haas .mcfg must raise the 25.4× guard. Fixtures use the REAL on-disk artifacts
// plus temp-dir fail-loud probes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  PROOF_ARMS, JOB_TYPES, PHASES,
  loadLaunchSurface, loadSimMap, resolveJmMachine, surfaceIdsMatching,
  planNavigation, planFleet, summary,
  LAUNCH_SURFACE_PATH, JM_SIM_MAP_PATH,
} from "./cimco-nav-planner.mjs";
import { loadNavMap, NAV_MAP_PATH } from "./cimco-nav-map.mjs";

// Load the real artifacts ONCE; inject as ctx so each plan call is hermetic + fast.
const NAV = loadNavMap(NAV_MAP_PATH);
const LAUNCH = loadLaunchSurface(LAUNCH_SURFACE_PATH);
const SIM = loadSimMap(JM_SIM_MAP_PATH);
const CTX = { navMap: NAV, launchSurface: LAUNCH, simMap: SIM };

// ─── Loaders — fail-loud ───────────────────────────────────────────────────
test("loadLaunchSurface + loadSimMap read the real artifacts", () => {
  assert.ok(Array.isArray(LAUNCH.launchPatterns), "launch patterns present");
  assert.ok(Array.isArray(SIM.machines) && SIM.machines.length === 15, `15 JM machines, got ${SIM.machines?.length}`);
});
test("loaders THROW fail-loud on a missing path (never silently empty)", () => {
  assert.throws(() => loadLaunchSurface("H:/prism/state/shared/cimco/__nope__.json"), /not found/);
  assert.throws(() => loadSimMap("H:/prism/state/shared/cimco/__nope__.json"), /not found/);
});

// ─── resolveJmMachine ──────────────────────────────────────────────────────
test("resolveJmMachine resolves a known id (case-insensitive)", () => {
  assert.equal(resolveJmMachine(SIM, "vmc-03").machine_name, "Haas VF-2");
});
test("resolveJmMachine THROWS on unknown id, listing known ids", () => {
  assert.throws(() => resolveJmMachine(SIM, "ZZ-99"), /unknown JM machine.*VMC-03/s);
});
test("resolveJmMachine THROWS on empty id", () => {
  assert.throws(() => resolveJmMachine(SIM, ""), /required/);
});

// ─── surfaceIdsMatching (back steps with REAL nav surface ids) ──────────────
test("surfaceIdsMatching finds real proof-relevant surfaces for the sim workflow", () => {
  const ids = surfaceIdsMatching(NAV, ["report", "collision"], { limit: 4 });
  assert.ok(ids.length > 0, "expected real simulation-report/collision surfaces");
  assert.ok(ids.every((id) => typeof id === "string" && id.length > 0));
});
test("surfaceIdsMatching returns honest empty [] for a nonsense keyword (no faking)", () => {
  assert.deepEqual(surfaceIdsMatching(NAV, ["zzqqxx_nonexistent_surface"], { limit: 4 }), []);
});

// ─── planNavigation — input validation (fail-loud) ──────────────────────────
test("planNavigation THROWS on invalid jobType", () => {
  assert.throws(() => planNavigation({ jobType: "frobnicate", ncFile: "a.nc" }, CTX), /invalid jobType/);
});
test("planNavigation THROWS on missing ncFile", () => {
  assert.throws(() => planNavigation({ jobType: "open", ncFile: "" }, CTX), /ncFile is required/);
});
test("planNavigation THROWS: compare without golden, simulate without machine", () => {
  assert.throws(() => planNavigation({ jobType: "compare", ncFile: "a.nc" }, CTX), /goldenFile is required/);
  assert.throws(() => planNavigation({ jobType: "simulate", ncFile: "a.nc" }, CTX), /jmMachineId is required/);
});

// ─── open ──────────────────────────────────────────────────────────────────
test("open: a single verified blind CLI launch, no verdict", () => {
  const p = planNavigation({ jobType: "open", ncFile: "C:/jobs/cand.nc" }, CTX);
  assert.equal(p.steps.length, 1);
  assert.equal(p.steps[0].channel, "cli");
  assert.equal(p.steps[0].blindSafe, true);
  assert.equal(p.verdictArm, null);
  assert.ok(p.steps[0].template.includes("C:/jobs/cand.nc"), "ncFile substituted into launch template");
});

// ─── verify-external (blind-safe FILE verdict) ──────────────────────────────
test("verify-external: external-cmd arm, FILE channel, blind-driveable, no UIA/license", () => {
  const p = planNavigation({ jobType: "verify-external", ncFile: "cand.nc" }, CTX);
  assert.equal(p.verdictArm, PROOF_ARMS.EXTERNAL_CMD);
  assert.equal(p.verdictProducible, true);
  assert.equal(p.blindDriveable, true);
  const verdictStep = p.steps.find((s) => s.phase === "read-verdict");
  assert.equal(verdictStep.channel, "file");
  assert.equal(verdictStep.requiresUia, false);
  assert.equal(verdictStep.requiresLicense, false);
  assert.ok(p.alternativeArms.includes(PROOF_ARMS.BYTE_EQUIV));
});
test("verify-external with NO integration hook: verdictArm null → NOT blind-driveable (honesty gate)", () => {
  // Mutated launch-surface: integrationHook present but not blindSafe → no verdict producible.
  const ls = JSON.parse(JSON.stringify(LAUNCH));
  ls.integrationHook = { id: "external-command", blindSafe: false };
  const p = planNavigation({ jobType: "verify-external", ncFile: "cand.nc" }, { ...CTX, launchSurface: ls });
  assert.equal(p.verdictArm, null);
  assert.equal(p.verdictProducible, false);
  assert.equal(p.blindDriveable, false, "no verdict producible ⇒ must NOT read blind-driveable");
  assert.ok(p.blockedBy.some((b) => /external-command-hook-unavailable/.test(b)));
  assert.ok(/NO verdict producible/i.test(p.note), "note must not falsely claim a blind-safe verdict");
});

// ─── compare (offline byte-equivalence is the blind verdict) ────────────────
test("compare: byte-equiv arm is blind-driveable; optional CIMCO File-Compare is UIA-only", () => {
  const p = planNavigation({ jobType: "compare", ncFile: "cand.nc", goldenFile: "gold.nc" }, CTX);
  assert.equal(p.verdictArm, PROOF_ARMS.BYTE_EQUIV);
  assert.equal(p.blindDriveable, true, "offline compareNC is blind-safe → plan blind-driveable");
  const cmp = p.steps.find((s) => s.phase === "compare");
  assert.equal(cmp.channel, "file");
  assert.ok(cmp.template.includes("gold.nc") && cmp.template.includes("cand.nc"));
  const optionalUia = p.steps.find((s) => s.optional === true);
  assert.equal(optionalUia.channel, "uia");
  assert.equal(optionalUia.blindSafe, false);
  assert.ok(p.warnings.some((w) => /CAM source/i.test(w)), "surfaces the same-source parity caveat");
});

// ─── simulate (the UIA+license-gated collision verdict) ─────────────────────
test("simulate VMC-03 (Haas native-match): sim-uia arm, NOT blind-driveable, cli→uia ordering", () => {
  const p = planNavigation({ jobType: "simulate", ncFile: "vf2.nc", jmMachineId: "VMC-03" }, CTX);
  assert.equal(p.verdictArm, PROOF_ARMS.SIM_UIA);
  assert.equal(p.blindDriveable, false, "the collision verdict is GUI-only → never blind-driveable");
  assert.equal(p.steps.length, 4);
  assert.equal(p.steps[0].channel, "cli"); // verified blind launch first
  assert.ok(p.steps.slice(1).every((s) => s.channel === "uia"), "load/run/read are UIA");
  // The verdict step routes through the existing dispatcher gate.
  const verdict = p.steps.find((s) => s.phase === "read-verdict");
  assert.ok(/cimco_sim_report_evaluate/.test(verdict.action) || /cimco_sim_report_evaluate/.test(verdict.template));
  assert.ok(verdict.navSurfaceIds.length > 0, "verdict step backed by real nav surfaces");
  // Real blockers, not fake green.
  assert.ok(p.blockedBy.some((b) => /SPINE-2/.test(b)), "SPINE-2 UIA driver blocker");
  assert.ok(p.blockedBy.some((b) => /license/.test(b)), "live-license blocker");
  assert.ok(p.alternativeArms.includes(PROOF_ARMS.EXTERNAL_CMD) && p.alternativeArms.includes(PROOF_ARMS.BYTE_EQUIV));
});
test("simulate VMC-03: units-unresolved Haas .mcfg raises the 25.4× guard (R12 units-first)", () => {
  const p = planNavigation({ jobType: "simulate", ncFile: "vf2.nc", jmMachineId: "VMC-03" }, CTX);
  assert.ok(p.blockedBy.includes("units-unverified-25.4x-guard"), "VMC-03 cimcoMatch.unitsResolved=false → guard");
  assert.ok(p.warnings.some((w) => /25\.4/.test(w)));
  assert.equal(p.machine.mustVerifyKinematics, true);
});
test("simulate VMC-01 (generic mill, units RESOLVED): no 25.4× blocker", () => {
  const p = planNavigation({ jobType: "simulate", ncFile: "hurco.nc", jmMachineId: "VMC-01" }, CTX);
  assert.equal(p.machine.cimcoMatch.unitsResolved, true);
  assert.ok(!p.blockedBy.includes("units-unverified-25.4x-guard"), "resolved-units machine must not raise the guard");
  assert.equal(p.verdictArm, PROOF_ARMS.SIM_UIA);
});
test("simulate LTH-01 (lathe generic-template): sim-uia, mapped to a Cimco lathe .mcfg", () => {
  const p = planNavigation({ jobType: "simulate", ncFile: "okuma.min", jmMachineId: "LTH-01" }, CTX);
  assert.equal(p.verdictArm, PROOF_ARMS.SIM_UIA);
  assert.equal(p.machine.type, "lathe");
  assert.ok(/Lathe/i.test(p.machine.cimcoMatch.displayName));
});
test("simulate EDM-01: routes to discharge-physics (CIMCO can't model EDM), single blind FILE step", () => {
  const p = planNavigation({ jobType: "simulate", ncFile: "edm.nc", jmMachineId: "EDM-01" }, CTX);
  assert.equal(p.verdictArm, PROOF_ARMS.DISCHARGE_PHYSICS);
  assert.equal(p.steps.length, 1);
  assert.equal(p.steps[0].channel, "file");
  assert.equal(p.steps[0].blindSafe, true);
  assert.ok(p.blockedBy.includes("cimco-cannot-model-edm"));
  assert.ok(p.warnings.some((w) => /mill\/lathe only/i.test(w)));
});

// ─── degraded launch-surface: never promote an unverified launch to blind-safe (contract §4) ──
test("unverified open-file launch ⇒ blindSafe:false + launch-pattern-unverified blocker + NOT blind-driveable", () => {
  const ls = JSON.parse(JSON.stringify(LAUNCH));
  const open = ls.launchPatterns.find((p) => p.id === "open-file");
  open.verified = false;
  open.needsLiveVerify = true;
  const p = planNavigation({ jobType: "open", ncFile: "cand.nc" }, { ...CTX, launchSurface: ls });
  assert.equal(p.steps[0].blindSafe, false, "an unverified launch must never be marked blind-safe");
  assert.equal(p.steps[0].verified, false);
  assert.ok(p.blockedBy.includes("launch-pattern-unverified"));
  assert.equal(p.blindDriveable, false);
});

// ─── data-integrity fail-loud: corrupt mill/lathe entry must THROW, never mis-route to EDM ──
test("simulate on a corrupt mill entry (cimcoMatch:null, status!=not-applicable) THROWS data-integrity", () => {
  const sm = JSON.parse(JSON.stringify(SIM));
  const vmc = sm.machines.find((m) => m.machine_id === "VMC-01");
  vmc.cimcoMatch = null; // corrupt: a mill lost its sim mapping
  assert.throws(
    () => planNavigation({ jobType: "simulate", ncFile: "x.nc", jmMachineId: "VMC-01" }, { ...CTX, simMap: sm }),
    /corrupt jm-fleet-sim-map|no cimcoMatch/,
  );
});

// ─── verdictProducible invariant across job types ───────────────────────────
test("verdictProducible: true for compare/simulate, false-but-benign for open", () => {
  const cmp = planNavigation({ jobType: "compare", ncFile: "c.nc", goldenFile: "g.nc" }, CTX);
  assert.equal(cmp.verdictProducible, true);
  const sim = planNavigation({ jobType: "simulate", ncFile: "x.nc", jmMachineId: "VMC-03" }, CTX);
  assert.equal(sim.verdictProducible, true);
  const open = planNavigation({ jobType: "open", ncFile: "x.nc" }, CTX);
  assert.equal(open.verdictProducible, false); // verdict-less by design
  assert.equal(open.blindDriveable, true); // but opening blind is fine
});

// ─── adversarial: paths with spaces/quotes substitute safely ────────────────
test("ncFile with spaces is substituted verbatim into the launch template", () => {
  const nc = "C:/JM DIE/PRISM MODIFIED POST PROCESSORS/part 9007405.nc";
  const p = planNavigation({ jobType: "open", ncFile: nc }, CTX);
  assert.ok(p.steps[0].template.includes(nc));
});

// ─── planFleet rollup ──────────────────────────────────────────────────────
test("planFleet: 15 machines → 12 sim-uia gated + 3 EDM discharge-physics", () => {
  const f = planFleet(CTX);
  assert.equal(f.machineCount, 15);
  assert.equal(f.byVerdictArm[PROOF_ARMS.SIM_UIA], 12);
  assert.equal(f.byVerdictArm[PROOF_ARMS.DISCHARGE_PHYSICS], 3);
  assert.equal(f.simUiaGated, 12);
  assert.equal(f.edmNotApplicable, 3);
  // Every fleet row carries an honest blocker set + the resolved sim .mcfg (or null for EDM).
  for (const r of f.machines) {
    if (r.verdictArm === PROOF_ARMS.SIM_UIA) {
      assert.equal(r.blindDriveable, false);
      assert.ok(r.simMcfg, `${r.machine_id} must carry a sim .mcfg`);
    } else {
      assert.equal(r.simMcfg, null); // EDM has no CIMCO sim machine
    }
  }
});

// ─── summary + invariants ──────────────────────────────────────────────────
test("summary exposes job types, proof arms, and fleet rollup", () => {
  const s = summary(CTX);
  assert.deepEqual(s.jobTypes, JOB_TYPES);
  assert.equal(s.proofArms.length, 4);
  assert.equal(s.fleet.machineCount, 15);
});
test("INVARIANT: every step has a valid channel + the verdict half of a sim plan is never blind-safe", () => {
  const valid = new Set(["file", "sql", "dnc-api", "cli", "uia"]);
  const p = planNavigation({ jobType: "simulate", ncFile: "x.nc", jmMachineId: "VMC-02" }, CTX);
  for (const s of p.steps) {
    assert.ok(valid.has(s.channel), `bad channel ${s.channel}`);
    assert.ok(PHASES.includes(s.phase), `bad phase ${s.phase}`);
  }
  // run-sim + read-verdict (the actual verdict) must require UIA + license, never blind-safe.
  for (const phase of ["run-sim", "read-verdict"]) {
    const st = p.steps.find((s) => s.phase === phase);
    assert.equal(st.blindSafe, false);
    assert.equal(st.requiresUia, true);
  }
});

// ─── auto-load path (no injected ctx) still resolves against real on-disk data ──
test("planNavigation auto-loads artifacts when no ctx is passed", () => {
  assert.ok(existsSync(NAV_MAP_PATH) && existsSync(LAUNCH_SURFACE_PATH) && existsSync(JM_SIM_MAP_PATH));
  const p = planNavigation({ jobType: "simulate", ncFile: "x.nc", jmMachineId: "VMC-03" });
  assert.equal(p.verdictArm, PROOF_ARMS.SIM_UIA);
});
