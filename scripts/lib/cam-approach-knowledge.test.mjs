// scripts/lib/cam-approach-knowledge.test.mjs
// Run: node scripts/lib/cam-approach-knowledge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fireForApproach,
  detectOperations,
  resolveCaps,
  CAM_OPERATIONS,
  CAM_SYSTEMS,
  CAM_UNVERIFIED_GAPS,
  _internals,
} from "./cam-approach-knowledge.mjs";

const gateIds = (res, op) => {
  const o = res.operations.find((x) => x.operation === op);
  return o ? o.gates.map((g) => g.id) : [];
};

// ---- taxonomy + sourcing integrity ----

test("CAM_OPERATIONS frozen, distinct, non-empty", () => {
  assert.ok(Array.isArray(CAM_OPERATIONS) && CAM_OPERATIONS.length >= 6);
  assert.equal(CAM_OPERATIONS.length, new Set(CAM_OPERATIONS).size);
  assert.ok(Object.isFrozen(CAM_OPERATIONS));
});

test("every gate cites a source + names an enforcing engine + is verified (no fabrication)", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    assert.equal(g.id, id, `gate ${id} id mismatch`);
    assert.ok(g.cite && g.cite.length > 0, `gate ${id} missing cite`);
    assert.ok(g.enforcedBy && g.enforcedBy.length > 0, `gate ${id} missing enforcedBy`);
    assert.equal(g.confidence, "verified", `gate ${id} not verified`);
    assert.ok(Array.isArray(g.ops) && g.ops.length > 0, `gate ${id} no ops`);
    for (const op of g.ops) assert.ok(CAM_OPERATIONS.includes(op), `gate ${id} references unknown op ${op}`);
  }
});

test("no inlined physics constant in any gate rule (constants discipline)", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    assert.ok(!/kc1\.1\s*=\s*\d|taylor\s*c\s*=\s*\d/i.test(g.rule), `gate ${id} inlines a physics constant`);
  }
});

test("collision_check_full gate names the CollisionResult struct, not a bare boolean (the verified contract)", () => {
  const r = _internals.GATES.collision_check_full.rule;
  assert.match(r, /CollisionResult struct/i);
  assert.match(r, /minimum_clearance_mm/);
  assert.match(r, /not a bare boolean/i);
});

// ---- always-on export gates ----

test("toolpath_export always fires collision + safety-validate + refuse-without-collision + units", () => {
  const ids = gateIds(fireForApproach({ operations: ["toolpath_export"] }), "toolpath_export");
  assert.ok(ids.includes("collision_check_full"));
  assert.ok(ids.includes("cam_safety_validate"));
  assert.ok(ids.includes("refuse_emit_without_collision"));
  assert.ok(ids.includes("units_first"));
});

// ---- strategy routing gates ----

test("adaptive_rough fires TGAR (thermal) + VCER (chip) + material-map", () => {
  const ids = gateIds(fireForApproach({ operations: ["adaptive_rough"] }), "adaptive_rough");
  assert.ok(ids.includes("thermal_gradient_rough"));
  assert.ok(ids.includes("chip_evacuation_rough"));
  assert.ok(ids.includes("cam_material_map"));
});

test("finish_3d fires HRAF (vibration) + PTDC (deflection) + PARETO (tolerance)", () => {
  const ids = gateIds(fireForApproach({ operations: ["finish_3d"] }), "finish_3d");
  assert.ok(ids.includes("vibration_avoidant_finish"));
  assert.ok(ids.includes("deflection_comp_finish"));
  assert.ok(ids.includes("tolerance_pareto_finish"));
});

test("multi_axis fires the defer-to-cam_multiaxis_recommend gate (never hand-compute tilt)", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["multi_axis"] }), "multi_axis").includes("multiaxis_defer_recommend"));
});

// ---- CAM-system conditioning ----

test("NX vendor gates fire ONLY when NX is the CAM system", () => {
  const withNx = gateIds(fireForApproach({ operations: ["toolpath_export"], camSystems: ["Siemens NX CAM"] }), "toolpath_export");
  assert.ok(withNx.includes("nx_tool_axis_gouge"));
  assert.ok(withNx.includes("nx_fbm_validate"));
  const withFusion = gateIds(fireForApproach({ operations: ["toolpath_export"], camSystems: ["Fusion 360"] }), "toolpath_export");
  assert.ok(!withFusion.includes("nx_tool_axis_gouge"));
});

test("PowerMill 5-axis block-clearance gate fires only for PowerMill multi_axis", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["multi_axis"], camSystems: ["PowerMill"] }), "multi_axis").includes("powermill_block_clearance_5ax"));
  assert.ok(!gateIds(fireForApproach({ operations: ["multi_axis"], camSystems: ["hyperMILL"] }), "multi_axis").includes("powermill_block_clearance_5ax"));
});

test("CATIA part-op-validate gate fires only for CATIA", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["toolpath_export"], camSystems: ["CATIA V5"] }), "toolpath_export").includes("catia_part_op_validate"));
  assert.ok(!gateIds(fireForApproach({ operations: ["toolpath_export"], camSystems: ["Mastercam"] }), "toolpath_export").includes("catia_part_op_validate"));
});

test("resolveCaps maps CAM-system aliases; fireForApproach flags no-system", () => {
  assert.ok(resolveCaps(["Autodesk PowerMill"]).has("powermill"));
  assert.ok(resolveCaps(["hyperMILL v31"]).has("hypermill"));
  assert.equal(resolveCaps([]).size, 0);
  const r = fireForApproach({ operations: ["toolpath_export"], camSystems: ["some unknown cam"] });
  assert.match(r.summary, /no CAM system resolved/);
});

// ---- UNVERIFIED gaps surfaced, not fired ----

test("UNVERIFIED gaps are exported (not fired) and named for the kilo specialist", () => {
  assert.ok(Array.isArray(CAM_UNVERIFIED_GAPS) && CAM_UNVERIFIED_GAPS.length >= 4);
  const allIds = Object.keys(_internals.GATES);
  assert.ok(!allIds.includes("rest_machining_scallop_trigger"));
  assert.ok(!allIds.includes("singularity_angle_threshold"));
});

// ---- detectOperations ----

test("detectOperations parses CAM ops from planning text", () => {
  assert.ok(detectOperations("adaptive rough the pocket then finish the thin wall").includes("adaptive_rough"));
  assert.ok(detectOperations("adaptive rough the pocket then finish the thin wall").includes("finish_3d"));
  assert.ok(detectOperations("5-axis swarf with simultaneous motion").includes("multi_axis"));
  assert.ok(detectOperations("rest machining the leftover stock").includes("rest_machining"));
  assert.ok(detectOperations("export the toolpath / post the NC program").includes("toolpath_export"));
  assert.deepEqual(detectOperations("write a react quoting frontend"), []);
});

test("detectOperations output feeds fireForApproach end-to-end with a CAM system", () => {
  const ops = detectOperations("5-axis finish the deep cavity then post the toolpath in PowerMill");
  const r = fireForApproach({ operations: ops, camSystems: ["PowerMill"] });
  assert.ok(r.operations.some((o) => o.operation === "multi_axis"));
  assert.ok(r.operations.some((o) => o.operation === "toolpath_export"));
  assert.ok(gateIds(r, "multi_axis").includes("powermill_block_clearance_5ax"));
  assert.deepEqual(r.camSystems, ["powermill"]);
});

// ---- adversarial ----

test("ADVERSARIAL: null/empty/non-array ctx never throws, empty ops", () => {
  for (const bad of [undefined, null, {}, { operations: "toolpath_export" }, { operations: [1, {}, ""] }]) {
    const r = fireForApproach(bad);
    assert.ok(Array.isArray(r.operations) && r.operations.length === 0);
    assert.equal(typeof r.summary, "string");
  }
  assert.deepEqual(detectOperations(null), []);
  assert.deepEqual(detectOperations(""), []);
  assert.deepEqual([...resolveCaps(null)], []);
});

test("CAM_SYSTEMS frozen + lists the tier-1 bridges + batch-safety vendors", () => {
  const ids = CAM_SYSTEMS.map((c) => c.id);
  for (const id of ["nx", "powermill", "catia", "fusion", "hypermill", "mastercam", "esprit"]) assert.ok(ids.includes(id), `missing ${id}`);
  assert.ok(Object.isFrozen(CAM_SYSTEMS));
});
