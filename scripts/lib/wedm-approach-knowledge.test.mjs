// scripts/lib/wedm-approach-knowledge.test.mjs
// Run: node scripts/lib/wedm-approach-knowledge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fireForApproach,
  detectOperations,
  resolveCaps,
  WEDM_OPERATIONS,
  WEDM_CONTROLLERS,
  WEDM_UNVERIFIED_GAPS,
  _internals,
} from "./wedm-approach-knowledge.mjs";

const gateIds = (res, op) => {
  const o = res.operations.find((x) => x.operation === op);
  return o ? o.gates.map((g) => g.id) : [];
};

// ---- taxonomy + sourcing integrity ----

test("WEDM_OPERATIONS frozen, distinct, non-empty", () => {
  assert.ok(Array.isArray(WEDM_OPERATIONS) && WEDM_OPERATIONS.length >= 7);
  assert.equal(WEDM_OPERATIONS.length, new Set(WEDM_OPERATIONS).size);
  assert.ok(Object.isFrozen(WEDM_OPERATIONS));
});

test("every gate cites a source + names an enforcing engine + is verified (no fabrication)", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    assert.equal(g.id, id, `gate ${id} id mismatch`);
    assert.ok(g.cite && g.cite.length > 0, `gate ${id} missing cite`);
    assert.ok(g.enforcedBy && g.enforcedBy.length > 0, `gate ${id} missing enforcedBy`);
    assert.equal(g.confidence, "verified", `gate ${id} not verified`);
    assert.ok(Array.isArray(g.ops) && g.ops.length > 0, `gate ${id} no ops`);
    for (const op of g.ops) assert.ok(WEDM_OPERATIONS.includes(op), `gate ${id} references unknown op ${op}`);
  }
});

test("no inlined physics threshold value in any gate rule (constants discipline)", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    // the rules name bands/relations + cite constants; they must not restate a hard numeric threshold like "0.5 m/s" or "8.0mm clearance"
    assert.ok(!/\d+(?:\.\d+)?\s*m\/s/.test(g.rule), `gate ${id} inlines a flush-velocity number`);
    assert.ok(!/clearance.*\d+(?:\.\d+)?\s*mm/i.test(g.rule), `gate ${id} inlines a clearance number`);
  }
});

test("mandatory S(x) gates (collision + unit_tag) fire for every cutting operation", () => {
  for (const op of ["rough_cut", "skim_pass", "taper_cut", "corner_engagement", "thick_section"]) {
    const ids = gateIds(fireForApproach({ operations: [op] }), op);
    assert.ok(ids.includes("collision_path_check"), `${op} missing collision`);
    assert.ok(ids.includes("unit_system_consistency"), `${op} missing unit_tag`);
  }
});

test("UNVERIFIED gaps are exported (not fired) and named for the specialist", () => {
  assert.ok(Array.isArray(WEDM_UNVERIFIED_GAPS) && WEDM_UNVERIFIED_GAPS.length >= 3);
  // none of the unverified gap topics appear as a fired gate id
  const allIds = Object.keys(_internals.GATES);
  assert.ok(!allIds.includes("no_core_cut_sequence"));
  assert.ok(!allIds.includes("gap_voltage_correction"));
});

// ---- per-op gate firing ----

test("taper_cut fires the wire-deflection bow-correction gate; rough_cut does not", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["taper_cut"] }), "taper_cut").includes("wire_deflection_taper"));
  assert.ok(!gateIds(fireForApproach({ operations: ["rough_cut"] }), "rough_cut").includes("wire_deflection_taper"));
});

test("corner_engagement fires the corner feed-slowdown/off-time gate", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["corner_engagement"] }), "corner_engagement").includes("corner_slowdown_offtime"));
});

test("wire_break_recovery fires the re-thread-backup gate", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["wire_break_recovery"] }), "wire_break_recovery").includes("rethread_backup_distance"));
});

test("thick_section fires flush-pressure + flush-velocity + deflection", () => {
  const ids = gateIds(fireForApproach({ operations: ["thick_section"] }), "thick_section");
  assert.ok(ids.includes("thick_section_flush_pressure"));
  assert.ok(ids.includes("flush_velocity_kerf"));
  assert.ok(ids.includes("wire_deflection_taper"));
});

test("thermal_release fires recast + aero/medical spec gates", () => {
  const ids = gateIds(fireForApproach({ operations: ["thermal_release"] }), "thermal_release");
  assert.ok(ids.includes("recast_depth_release"));
  assert.ok(ids.includes("recast_aero_medical_spec"));
});

// ---- controller conditioning ----

test("JM Mitsubishi M-code gate fires ONLY when a Mitsubishi controller is resolved", () => {
  const withMits = gateIds(fireForApproach({ operations: ["rough_cut"], machines: ["Mitsubishi FA-10S"] }), "rough_cut");
  assert.ok(withMits.includes("jm_mitsubishi_mcode_sequence"));
  const withSodick = gateIds(fireForApproach({ operations: ["rough_cut"], machines: ["Sodick AQ"] }), "rough_cut");
  assert.ok(!withSodick.includes("jm_mitsubishi_mcode_sequence"));
});

test("resolveCaps maps WEDM controller aliases; fireForApproach flags no-controller", () => {
  assert.ok(resolveCaps(["Mitsubishi FA-10S"]).has("mitsubishi"));
  assert.ok(resolveCaps(["Sodick VL400Q"]).has("sodick"));
  assert.equal(resolveCaps([]).size, 0);
  const r = fireForApproach({ operations: ["rough_cut"], machines: ["some unknown box"] });
  assert.match(r.summary, /no WEDM controller resolved/);
});

// ---- detectOperations ----

test("detectOperations parses WEDM ops from print-reading text", () => {
  assert.ok(detectOperations("rough cut then 3 skim passes on the die").includes("rough_cut"));
  assert.ok(detectOperations("rough cut then 3 skim passes on the die").includes("skim_pass"));
  assert.ok(detectOperations("15 degree taper with sharp inside corners").includes("taper_cut"));
  assert.ok(detectOperations("15 degree taper with sharp inside corners").includes("corner_engagement"));
  assert.ok(detectOperations("wire broke at 80mm thick section, re-thread").includes("wire_break_recovery"));
  assert.ok(detectOperations("wire broke at 80mm thick section, re-thread").includes("thick_section"));
  assert.ok(detectOperations("control recast for the aerospace part").includes("thermal_release"));
  assert.deepEqual(detectOperations("write a react quoting frontend"), []);
});

test("detectOperations output feeds fireForApproach end-to-end with controller", () => {
  const ops = detectOperations("rough cut a 100mm thick carbide die on the Mitsubishi");
  const r = fireForApproach({ operations: ops, machines: ["Mitsubishi FA-10S"] });
  assert.ok(r.operations.some((o) => o.operation === "rough_cut"));
  assert.ok(r.operations.some((o) => o.operation === "thick_section"));
  assert.ok(gateIds(r, "rough_cut").includes("coated_wire_hard_material"));
  assert.deepEqual(r.controllers, ["mitsubishi"]);
});

// ---- adversarial ----

test("ADVERSARIAL: null/empty/non-array ctx never throws, empty ops", () => {
  for (const bad of [undefined, null, {}, { operations: "rough_cut" }, { operations: [1, {}, ""] }]) {
    const r = fireForApproach(bad);
    assert.ok(Array.isArray(r.operations) && r.operations.length === 0);
    assert.equal(typeof r.summary, "string");
  }
  assert.deepEqual(detectOperations(null), []);
  assert.deepEqual(detectOperations(""), []);
  assert.deepEqual([...resolveCaps(null)], []);
});

test("WEDM_CONTROLLERS frozen + lists the 5 controller families", () => {
  const ids = WEDM_CONTROLLERS.map((c) => c.id);
  for (const id of ["mitsubishi", "sodick", "makino", "agie", "fanuc"]) assert.ok(ids.includes(id), `missing ${id}`);
  assert.ok(Object.isFrozen(WEDM_CONTROLLERS));
});
