// scripts/lib/cad-approach-knowledge.test.mjs
// Run: node scripts/lib/cad-approach-knowledge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fireForApproach,
  detectOperations,
  resolveCaps,
  CAD_OPERATIONS,
  CAD_SEATS,
  _internals,
} from "./cad-approach-knowledge.mjs";

const gateIds = (res, op) => {
  const o = res.operations.find((x) => x.operation === op);
  return o ? o.gates.map((g) => g.id) : [];
};

test("CAD_OPERATIONS frozen, distinct, non-empty", () => {
  assert.ok(Array.isArray(CAD_OPERATIONS) && CAD_OPERATIONS.length >= 6);
  assert.equal(CAD_OPERATIONS.length, new Set(CAD_OPERATIONS).size);
  assert.ok(Object.isFrozen(CAD_OPERATIONS));
});

test("every gate cites a delta source + names an enforcer + is verified (no fabrication)", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    assert.equal(g.id, id, `gate ${id} id mismatch`);
    assert.ok(g.cite && g.cite.length > 0, `gate ${id} missing cite`);
    assert.ok(g.enforcedBy && g.enforcedBy.length > 0, `gate ${id} missing enforcedBy`);
    assert.equal(g.confidence, "verified", `gate ${id} not verified`);
    assert.ok(Array.isArray(g.ops) && g.ops.length > 0, `gate ${id} no ops`);
    for (const op of g.ops) assert.ok(CAD_OPERATIONS.includes(op), `gate ${id} references unknown op ${op}`);
  }
});

test("no inlined ISO286 fit value in any gate rule (constants discipline)", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    assert.ok(!/\bH\d\/[a-z]\d\b|\b[a-z]\d\/H\d\b/.test(g.rule), `gate ${id} inlines an ISO286 fit`);
  }
});

test("STEP units gate carries the INCH/25.4 verified rule (the 25.4x trap)", () => {
  const r = _internals.GATES.units_inch_step.rule;
  assert.match(r, /INCH/);
  assert.match(r, /25\.4/);
});

test("step_parse fires the inch-units gate (every geometry op does)", () => {
  for (const op of ["step_parse", "archetype_replicate", "electrode_gen", "bspline_emit", "tolerance_apply"]) {
    assert.ok(gateIds(fireForApproach({ operations: [op] }), op).includes("units_inch_step"), `${op} missing units gate`);
  }
});

test("archetype_replicate fires match-before-scale", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["archetype_replicate"] }), "archetype_replicate").includes("archetype_match_before_scale"));
});

test("electrode_gen fires spark-gap + no-malformed-bspline; a plain part does not get spark-gap", () => {
  const elec = gateIds(fireForApproach({ operations: ["electrode_gen"] }), "electrode_gen");
  assert.ok(elec.includes("sinker_edm_spark_gap"));
  assert.ok(elec.includes("no_malformed_periodic_bspline"));
  // spark gap is electrode-only -- a tolerance op must NOT fire it
  assert.ok(!gateIds(fireForApproach({ operations: ["tolerance_apply"] }), "tolerance_apply").includes("sinker_edm_spark_gap"));
});

test("tolerance_apply fires topology-before-tolerance (no inline ISO286)", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["tolerance_apply"] }), "tolerance_apply").includes("topology_before_tolerance"));
});

test("bspline_emit fires the no-malformed-periodic-bspline gate", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["bspline_emit"] }), "bspline_emit").includes("no_malformed_periodic_bspline"));
});

test("assembly_analyze fires the collision SAFETY gate", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["assembly_analyze"] }), "assembly_analyze").includes("collision_safety_assembly"));
});

test("resolveCaps maps CAD seats", () => {
  assert.ok(resolveCaps(["Fusion 360"]).has("fusion"));
  assert.ok(resolveCaps(["FreeCAD"]).has("freecad"));
  assert.equal(resolveCaps([]).size, 0);
});

test("detectOperations parses CAD ops from print/planning text", () => {
  assert.ok(detectOperations("parse the STEP file then replicate the archetype at new dims").includes("step_parse"));
  assert.ok(detectOperations("parse the STEP file then replicate the archetype at new dims").includes("archetype_replicate"));
  assert.ok(detectOperations("generate a sinker electrode for the cavity").includes("electrode_gen"));
  assert.ok(detectOperations("apply the press fit tolerance").includes("tolerance_apply"));
  assert.ok(detectOperations("emit the trilobe b-spline surface").includes("bspline_emit"));
  assert.ok(detectOperations("check the assembly for interference").includes("assembly_analyze"));
  assert.deepEqual(detectOperations("write a react quoting frontend"), []);
});

test("detectOperations output feeds fireForApproach end-to-end", () => {
  const r = fireForApproach({ operations: detectOperations("generate a sinker electrode from the STEP archetype"), seats: ["Fusion 360"] });
  assert.ok(r.operations.some((o) => o.operation === "electrode_gen"));
  assert.ok(gateIds(r, "electrode_gen").includes("sinker_edm_spark_gap"));
  assert.deepEqual(r.seats, ["fusion"]);
});

test("ADVERSARIAL: null/empty/non-array ctx never throws, empty ops", () => {
  for (const bad of [undefined, null, {}, { operations: "step_parse" }, { operations: [1, {}, ""] }]) {
    const r = fireForApproach(bad);
    assert.ok(Array.isArray(r.operations) && r.operations.length === 0);
    assert.equal(typeof r.summary, "string");
  }
  assert.deepEqual(detectOperations(null), []);
  assert.deepEqual(detectOperations(""), []);
  assert.deepEqual([...resolveCaps(null)], []);
});

test("CAD_SEATS frozen + lists the delta seats", () => {
  const ids = CAD_SEATS.map((c) => c.id);
  for (const id of ["fusion", "hypercad", "mastercam", "freecad"]) assert.ok(ids.includes(id), `missing ${id}`);
  assert.ok(Object.isFrozen(CAD_SEATS));
});
