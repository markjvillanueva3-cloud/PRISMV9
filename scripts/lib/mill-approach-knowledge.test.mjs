// scripts/lib/mill-approach-knowledge.test.mjs
// Run: node scripts/lib/mill-approach-knowledge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fireForApproach,
  detectOperations,
  MILL_OPERATIONS,
  JM_MILL_FLEET,
  _internals,
} from "./mill-approach-knowledge.mjs";

const gateIds = (res, op) => {
  const o = res.operations.find((x) => x.operation === op);
  return o ? o.gates.map((g) => g.id) : [];
};

// ---- taxonomy + sourcing integrity ----

test("MILL_OPERATIONS frozen, distinct, non-empty", () => {
  assert.ok(Array.isArray(MILL_OPERATIONS) && MILL_OPERATIONS.length >= 12);
  assert.equal(MILL_OPERATIONS.length, new Set(MILL_OPERATIONS).size);
  assert.ok(Object.isFrozen(MILL_OPERATIONS));
});

test("every gate cites a source + names an enforcing engine (no fabrication)", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    assert.ok(g.cite && g.cite.length > 0, `gate ${id} missing cite`);
    assert.ok(g.enforcedBy && g.enforcedBy.length > 0, `gate ${id} missing enforcedBy`);
    assert.equal(g.confidence, "verified", `gate ${id} not verified-sourced`);
    assert.ok(Array.isArray(g.ops) && g.ops.length > 0);
    for (const op of g.ops) assert.ok(MILL_OPERATIONS.includes(op), `gate ${id} references unknown op ${op}`);
  }
});

test("no inlined cutting constant beyond the canonical-source pointer", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    if (id === "kienzle_taylor_canonical") continue;
    assert.ok(!/kc1\.1|taylor\s*c\b/i.test(g.rule), `gate ${id} restates a cutting constant`);
  }
});

test("tool_deflection gate uses the correct L^3/D^4 cantilever physics", () => {
  assert.match(_internals.GATES.tool_deflection.rule, /L\^3\/D\^4/);
  assert.ok(!/L\^4\/D\^4/.test(_internals.GATES.tool_deflection.rule));
});

// ---- safety-intent firing ----

test("face_mill fires spindle-power headroom + chatter landmine", () => {
  const r = fireForApproach({ operations: ["face_mill"] });
  assert.ok(gateIds(r, "face_mill").includes("spindle_power_headroom"));
  const o = r.operations.find((x) => x.operation === "face_mill");
  assert.ok(o.landmines.some((l) => /SLD|lobe|chatter/i.test(l.rule)));
});

test("profile_mill fires chip-thinning + tool-deflection", () => {
  const ids = gateIds(fireForApproach({ operations: ["profile_mill"] }), "profile_mill");
  assert.ok(ids.includes("chip_thinning"));
  assert.ok(ids.includes("tool_deflection"));
});

test("trochoidal_rough fires the entry-angle gate", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["trochoidal_rough"] }), "trochoidal_rough").includes("trochoidal_entry_angle"));
});

// ---- machine-conditioned gates ----

test("five_axis_singularity fires ONLY when a 5-axis machine is in the fleet", () => {
  const withFive = fireForApproach({ operations: ["five_axis_position"], machines: ["VMC-02"] });
  assert.ok(gateIds(withFive, "five_axis_position").includes("five_axis_singularity"));
  const without = fireForApproach({ operations: ["five_axis_position"], machines: ["VMC-03"] });
  assert.ok(!gateIds(without, "five_axis_position").includes("five_axis_singularity"));
});

test("5-axis op without a 5-axis machine = feasibility BLOCKER", () => {
  const r = fireForApproach({ operations: ["five_axis_position"], machines: ["VMC-01", "VMC-03"] });
  assert.ok(r.summary.includes("5-axis op needs a 5-axis machine"));
});

test("hypermill_coolant_hurco fires only when a Hurco is in the fleet", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["face_mill"], machines: ["VMC-01"] }), "face_mill").includes("hypermill_coolant_hurco"));
  assert.ok(!gateIds(fireForApproach({ operations: ["face_mill"], machines: ["VMC-03"] }), "face_mill").includes("hypermill_coolant_hurco"));
});

test("fleetCaps resolves JM machine ids + free-text machine names", () => {
  assert.deepEqual(fireForApproach({ operations: ["face_mill"], machines: ["VMC-02"] }).fleetCaps.sort(), ["5axis", "okuma"].sort());
  assert.ok(fireForApproach({ operations: ["face_mill"], machines: ["an okuma 5-axis"] }).fleetCaps.includes("5axis"));
  assert.equal(fireForApproach({ operations: ["face_mill"], machines: [] }).fleetCaps.length, 0);
});

// ---- tooling conditioning ----

test("bore needs a boring head; absent -> blocker, present -> available", () => {
  const miss = fireForApproach({ operations: ["bore"], tooling: ["end_mill"] }).operations.find((o) => o.operation === "bore");
  assert.equal(miss.tooling.needs, "boring_head");
  assert.equal(miss.tooling.available, false);
  assert.ok(miss.tooling.blocker);
  const have = fireForApproach({ operations: ["bore"], tooling: ["boring_head"] }).operations.find((o) => o.operation === "bore");
  assert.equal(have.tooling.available, true);
});

test("no tooling list -> available null (unknown, not blocker)", () => {
  const o = fireForApproach({ operations: ["slot_mill"] }).operations.find((x) => x.operation === "slot_mill");
  assert.equal(o.tooling.available, null);
});

// ---- detectOperations ----

test("detectOperations parses mill ops from print text", () => {
  assert.deepEqual(detectOperations("pocket and face milling").sort(), ["face_mill", "pocket_mill"].sort());
  assert.ok(detectOperations("trochoidal roughing of the slot").includes("trochoidal_rough"));
  assert.ok(detectOperations("5-axis positioning with RTCP").includes("five_axis_position"));
  assert.ok(detectOperations("thread mill the M10 hole").includes("thread_mill"));
  assert.deepEqual(detectOperations("write a react quoting frontend"), []);
});

test("detectOperations output feeds fireForApproach end-to-end", () => {
  const r = fireForApproach({ operations: detectOperations("face mill then bore on the Okuma 5-axis"), machines: ["VMC-02"] });
  assert.ok(r.operations.some((o) => o.operation === "face_mill"));
  assert.ok(r.operations.some((o) => o.operation === "bore"));
});

// ---- adversarial ----

test("ADVERSARIAL: null/empty/non-array ctx never throws, empty ops", () => {
  for (const bad of [undefined, null, {}, { operations: "face_mill" }, { operations: [1, {}, ""] }]) {
    const r = fireForApproach(bad);
    assert.ok(Array.isArray(r.operations) && r.operations.length === 0);
    assert.equal(typeof r.summary, "string");
  }
  assert.deepEqual(detectOperations(null), []);
  assert.deepEqual(detectOperations(""), []);
});

test("JM_MILL_FLEET lists the 5 JM mills incl the Okuma 5-axis + Hurco", () => {
  assert.equal(JM_MILL_FLEET.length, 5);
  assert.ok(JM_MILL_FLEET.some((m) => m.caps.includes("5axis")));
  assert.ok(JM_MILL_FLEET.some((m) => m.caps.includes("hurco")));
});
