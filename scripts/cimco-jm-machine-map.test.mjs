// cimco-jm-machine-map.test.mjs — real-behavior tests for the JM→CIMCO sim-machine mapper.
// Run: node --test scripts/cimco-jm-machine-map.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { jmMachineType, parseJmInventory, tokens, vendorOf, scoreMatch, buildJmSimMap, run, axisHints } from "./cimco-jm-machine-map.mjs";

// ─── pure helpers ────────────────────────────────────────────────────────────

test("jmMachineType maps id prefixes to process types", () => {
  assert.equal(jmMachineType("LTH-01"), "lathe");
  assert.equal(jmMachineType("VMC-03"), "mill");
  assert.equal(jmMachineType("EDM-01"), "sinker_edm");
  assert.equal(jmMachineType("WEDM-01"), "wire_edm");
  assert.equal(jmMachineType("ZZZ-9"), "unknown");
  assert.equal(jmMachineType(null), "unknown");
});

test("parseJmInventory extracts canonical rows (single source of truth, not duplicated)", () => {
  const ts = `
    { machine_id: "VMC-03", machine_name: "Haas VF-2", controller_family: "haas", controller_model: "PRE-NGC", post_processor: "x.cps" },
    { machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M", controller_family: "okuma", controller_model: "OSP-P300L-R" },
  `;
  const rows = parseJmInventory(ts);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].machine_id, "VMC-03");
  assert.equal(rows[0].machine_name, "Haas VF-2");
  assert.equal(rows[1].controller_family, "okuma");
});

test("tokens + vendorOf strip noise and surface the make", () => {
  assert.equal(vendorOf("Haas VF-2"), "haas");
  assert.equal(vendorOf("Okuma GENOS L300-M"), "okuma");
  // length-1 tokens (the bare "2") are dropped as matching noise — vendor+model-word carry the match
  assert.deepEqual(tokens("Haas VF-2"), ["haas", "vf"]);
});

// ─── scoreMatch: the candidate scorer ────────────────────────────────────────

test("scoreMatch: same-vendor mill scores high; cross-vendor scores low", () => {
  const jm = { machine_id: "VMC-03", machine_name: "Haas VF-2", controller_model: "PRE-NGC" };
  const haas = { displayName: "Haas VF1", orientation: "unknown", unit: "unknown" };
  const doosan = { displayName: "Doosan DNM350", orientation: "unknown", unit: "unknown" };
  const sHaas = scoreMatch(jm, haas);
  const sDoosan = scoreMatch(jm, doosan);
  assert.ok(sHaas.score >= 0.6, `same-vendor should be native-tier: ${sHaas.score}`);
  assert.match(sHaas.basis, /vendor:haas/);
  assert.ok(sHaas.score > sDoosan.score, "same vendor must beat cross vendor");
});

test("axisHints: trunnion is 5-axis in BOTH token directions (TR210 and VF-2TR) — P0 regression lock", () => {
  assert.equal(axisHints("Haas VF-2TR").fiveAxis, true, "VF-2TR (digit-before-TR) is a 5-axis trunnion");
  assert.equal(axisHints("Haas VF-3YT-TR210").fiveAxis, true, "TR210 (digit-after-TR) is a 5-axis trunnion");
  assert.equal(axisHints("Haas VF1").fiveAxis, false, "VF1 is a plain 3-axis mill");
  assert.equal(axisHints("Haas VF2-HRT210").fiveAxis, false, "HRT is a 4-axis single rotary, NOT a 5-axis trunnion");
});

test("scoreMatch: hard type gate — a mill never maps to a lathe sim (score 0)", () => {
  const jmMill = { machine_id: "VMC-01", machine_name: "Hurco VM30i", controller_model: "WinMAX v10" };
  const lathe = { displayName: "Cimco Lathe 3 Axis C", orientation: "Lathe", unit: "mm" };
  const r = scoreMatch(jmMill, lathe);
  assert.equal(r.score, 0);
  assert.equal(r.basis, "type-mismatch");
});

test("scoreMatch: generic Cimco template is a usable fallback (>= generic floor)", () => {
  const jm = { machine_id: "LTH-03", machine_name: "Okuma LNC8", controller_model: "OSP-U10L" };
  // plain 2-axis turning (jmAxisCount→3) should fit the 3-axis-C template, not the 4-axis-CY one
  const generic = { displayName: "Cimco Lathe 3 Axis C", orientation: "Lathe", unit: "mm" };
  const r = scoreMatch(jm, generic);
  assert.ok(r.score >= 0.3, `generic lathe template should be usable fallback: ${r.score}`);
  // and an axis-mismatched template (4-axis CY) must score LOWER (wrong kinematics penalty)
  const mismatch = scoreMatch(jm, { displayName: "Cimco Lathe 4 Axis CY", orientation: "Lathe", unit: "mm" });
  assert.ok(mismatch.score < r.score, "axis-count mismatch must score lower than the matching template");
});

// ─── buildJmSimMap: integration on a representative fixture ───────────────────

test("buildJmSimMap tiers machines correctly + always flags kinematics verify on mill/lathe", () => {
  const jm = [
    { machine_id: "VMC-03", machine_name: "Haas VF-2", controller_family: "haas", controller_model: "PRE-NGC" },
    { machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M", controller_family: "okuma", controller_model: "OSP-P300L-R" },
    { machine_id: "EDM-01", machine_name: "Mitsubishi EA12S", controller_family: "mitsubishi", controller_model: "FP80S" },
  ];
  const cimco = [
    { file: "Haas VF1.mcfg", displayName: "Haas VF1", orientation: "unknown", unit: "unknown", unitsResolved: false },
    { file: "Cimco Lathe 4 Axis CY.mcfg", displayName: "Cimco Lathe 4 Axis CY", orientation: "Lathe", unit: "mm", unitsResolved: true },
  ];
  const map = buildJmSimMap(jm, cimco);
  const byId = Object.fromEntries(map.machines.map((m) => [m.machine_id, m]));

  assert.equal(byId["VMC-03"].status, "native-cimco-match");
  assert.match(byId["VMC-03"].cimcoMatch.displayName, /Haas/);
  assert.equal(byId["VMC-03"].mustVerifyKinematics, true);

  assert.equal(byId["LTH-01"].status, "generic-template");
  assert.equal(byId["LTH-01"].mustVerifyKinematics, true);

  // EDM is out of CIMCO sim scope — not-applicable, no kinematics-verify needed
  assert.equal(byId["EDM-01"].status, "not-applicable");
  assert.equal(byId["EDM-01"].cimcoMatch, null);
  assert.equal(byId["EDM-01"].mustVerifyKinematics, false);

  assert.equal(map.jmMachineCount, 3);
  assert.ok(map.safety.includes("CANDIDATE"));
});

test("buildJmSimMap: a metric .mcfg match raises a units warning (25.4x guard)", () => {
  const jm = [{ machine_id: "VMC-01", machine_name: "Acme Mill X", controller_family: "fanuc", controller_model: "0i" }];
  const cimco = [{ file: "Acme Mill X.mcfg", displayName: "Acme Mill X", orientation: "Vertical", unit: "mm", unitsResolved: true }];
  const map = buildJmSimMap(jm, cimco);
  assert.match(map.machines[0].unitsNote, /UNITS WARNING/);
});

test("buildJmSimMap: an INFERRED-mm .mcfg (unitsResolved:false) STILL raises the 25.4x warning (U-CIMCO-MCFG-UNITS-INFER)", () => {
  // The 44 vendor .mcfg now INFER unit:"mm" (magnitude heuristic) while keeping unitsResolved:false.
  // The JM=inch shop MUST still be warned of the mm-vs-inch mismatch — the warning keys on the
  // candidate unit (!= "inch"), NOT on declaration. This regression-locks the louder warning branch
  // that flipped from the soft "unresolved" message when inference shipped.
  const jm = [{ machine_id: "VMC-09", machine_name: "Acme Mill Z", controller_family: "fanuc", controller_model: "0i" }];
  const cimco = [{ file: "Acme Mill Z.mcfg", displayName: "Acme Mill Z", orientation: "Vertical", unit: "mm", unitsResolved: false, unitsInferred: true }];
  const map = buildJmSimMap(jm, cimco);
  assert.match(map.machines[0].unitsNote, /UNITS WARNING/);
  assert.match(map.machines[0].unitsNote, /mm/);
  assert.equal(map.machines[0].cimcoMatch.unitsResolved, false); // honest: matched, but NOT declared-resolved
});

// ─── live corpus integration (graceful-skip) ─────────────────────────────────

test("integration: run() against the real JM profile + CIMCO index produces a complete, honest map", (t) => {
  if (!existsSync("mcp-server/src/data/jm-die-profile.ts") || !existsSync("state/shared/cimco/machine-index.json"))
    return t.skip("JM profile or CIMCO index not present");
  const map = run({ write: false });
  assert.ok(map.jmMachineCount >= 15, `expected >=15 JM machines, got ${map.jmMachineCount}`);
  // Haas mills must resolve to a native CIMCO Haas .mcfg (CIMCO ships 18 Haas defs).
  const haas = map.machines.filter((m) => /haas/i.test(m.machine_name));
  assert.ok(haas.length >= 2);
  for (const h of haas) {
    assert.equal(h.status, "native-cimco-match", `${h.machine_name} should match a native Haas .mcfg`);
    assert.match(h.cimcoMatch.displayName, /Haas/);
  }
  // P0 regression lock (workflow-caught): the plain 3-axis Haas VF-2 must NOT map to a 5-axis
  // trunnion / UMC sim machine — wrong kinematics at the highest trust tier is a false-confidence vector.
  const vf2 = map.machines.find((m) => m.machine_id === "VMC-03");
  assert.ok(vf2 && vf2.cimcoMatch, "VMC-03 resolves a Haas sim machine");
  assert.doesNotMatch(vf2.cimcoMatch.displayName, /TR\d|\dTR\b|trunnion|UMC|5\s*ax/i, `VMC-03 (3-axis VF-2) must not map to a 5-axis machine, got ${vf2.cimcoMatch.displayName}`);
  // Okuma (no CIMCO vendor def) must NOT be a native match — generic-template or needs-authoring.
  const okuma = map.machines.filter((m) => /okuma/i.test(m.machine_name));
  for (const o of okuma) assert.notEqual(o.status, "native-cimco-match");
  // EDM out of scope.
  const edm = map.machines.filter((m) => m.type === "sinker_edm" || m.type === "wire_edm");
  for (const e of edm) assert.equal(e.status, "not-applicable");
  // every mill/lathe mapping demands kinematics verification (safety).
  for (const m of map.machines) {
    if (m.type === "mill" || m.type === "lathe") assert.equal(m.mustVerifyKinematics, true);
  }
});
