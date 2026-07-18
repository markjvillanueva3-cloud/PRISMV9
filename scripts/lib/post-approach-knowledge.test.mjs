// scripts/lib/post-approach-knowledge.test.mjs
// Run: node scripts/lib/post-approach-knowledge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fireForApproach,
  detectOperations,
  resolveCaps,
  POST_OPERATIONS,
  JM_POST_FLEET,
  _internals,
} from "./post-approach-knowledge.mjs";

const gateIds = (res, op) => {
  const o = res.operations.find((x) => x.operation === op);
  return o ? o.gates.map((g) => g.id) : [];
};

// ---- taxonomy + sourcing integrity ----

test("POST_OPERATIONS frozen, distinct, non-empty", () => {
  assert.ok(Array.isArray(POST_OPERATIONS) && POST_OPERATIONS.length >= 10);
  assert.equal(POST_OPERATIONS.length, new Set(POST_OPERATIONS).size);
  assert.ok(Object.isFrozen(POST_OPERATIONS));
});

test("every gate cites a source + names an enforcing engine + is verified (no fabrication)", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    assert.equal(g.id, id, `gate ${id} id mismatch`);
    assert.ok(g.cite && g.cite.length > 0, `gate ${id} missing cite`);
    assert.ok(g.enforcedBy && g.enforcedBy.length > 0, `gate ${id} missing enforcedBy`);
    assert.equal(g.confidence, "verified", `gate ${id} not verified-sourced`);
    assert.ok(Array.isArray(g.ops) && g.ops.length > 0, `gate ${id} no ops`);
    for (const op of g.ops) assert.ok(POST_OPERATIONS.includes(op), `gate ${id} references unknown op ${op}`);
  }
});

test("no inlined physics cutting constant in any gate rule", () => {
  for (const [id, g] of Object.entries(_internals.GATES)) {
    assert.ok(!/kc1\.1|taylor\s*c\b|johnson[\s-]?cook/i.test(g.rule), `gate ${id} restates a physics constant`);
  }
});

test("Okuma TCP gate carries the CORRECT G170-off code, not the wrong G168", () => {
  const r = _internals.GATES.okuma_tcp_g170_off.rule;
  assert.match(r, /G170/);
  assert.match(r, /G169/);
  assert.match(r, /G168 is WRONG/);
});

// ---- always-on emit gates ----

test("program_emit always fires pipeline-safety + constants-discipline", () => {
  const ids = gateIds(fireForApproach({ operations: ["program_emit"] }), "program_emit");
  assert.ok(ids.includes("pipeline_safety_nonnegotiable"));
  assert.ok(ids.includes("constants_discipline"));
});

// ---- coolant sequencing (machine-conditioned) ----

test("coolant_on always fires aux-mcode gate; coolant-after-spindle fires ONLY for mill", () => {
  const noMachine = gateIds(fireForApproach({ operations: ["coolant_on"] }), "coolant_on");
  assert.ok(noMachine.includes("aux_mcode_not_coolant"));
  assert.ok(!noMachine.includes("coolant_after_spindle_mill"), "mill-only gate must not fire without a mill");
  const mill = gateIds(fireForApproach({ operations: ["coolant_on"], machines: ["Haas VF-2 mill"] }), "coolant_on");
  assert.ok(mill.includes("coolant_after_spindle_mill"));
});

// ---- feed mode ----

test("feed_mode fires the G93/G94/G95 dialect gate", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["feed_mode"] }), "feed_mode").includes("feed_mode_dialect"));
});

// ---- controller-conditioned dialect gates ----

test("okuma bracket-comment gate fires ONLY when an Okuma controller is present", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["program_emit"], machines: ["Okuma OSP-P300"] }), "program_emit").includes("okuma_bracket_comment"));
  assert.ok(!gateIds(fireForApproach({ operations: ["program_emit"], machines: ["Haas VF-2"] }), "program_emit").includes("okuma_bracket_comment"));
});

test("siemens MCALL gate fires ONLY when Siemens is present", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["tap"], machines: ["Siemens 840D"] }), "tap").includes("siemens_mcall_vs_fanuc_g84"));
  assert.ok(!gateIds(fireForApproach({ operations: ["tap"], machines: ["Fanuc 31i"] }), "tap").includes("siemens_mcall_vs_fanuc_g84"));
});

test("okuma 5-axis TCP gate fires ONLY with okuma AND a 5-axis machine", () => {
  const five = fireForApproach({ operations: ["five_axis_tcp"], machines: ["Okuma Genos M460V 5-axis"] });
  assert.ok(gateIds(five, "five_axis_tcp").includes("okuma_tcp_g170_off"));
  const okumaMillOnly = fireForApproach({ operations: ["five_axis_tcp"], machines: ["Okuma OSP mill"] });
  assert.ok(!gateIds(okumaMillOnly, "five_axis_tcp").includes("okuma_tcp_g170_off"), "needs the 5-axis cap, not just okuma");
});

test("okuma threading G71 gate fires ONLY with okuma AND a lathe", () => {
  const lathe = fireForApproach({ operations: ["threading"], machines: ["Okuma LB lathe"] });
  assert.ok(gateIds(lathe, "threading").includes("okuma_thread_g71_single_line"));
  const millThread = fireForApproach({ operations: ["threading"], machines: ["Okuma OSP mill"] });
  assert.ok(!gateIds(millThread, "threading").includes("okuma_thread_g71_single_line"));
});

test("okuma part-off dwell + 6-digit tool-call gates fire for okuma", () => {
  assert.ok(gateIds(fireForApproach({ operations: ["part_off"], machines: ["Okuma LB"] }), "part_off").includes("okuma_dwell_g4_f_seconds"));
  assert.ok(gateIds(fireForApproach({ operations: ["tool_call"], machines: ["Okuma OSP"] }), "tool_call").includes("okuma_tool_call_6digit"));
});

// ---- caps resolution ----

test("resolveCaps maps controller aliases + machine-type markers; bare controller adds NO type", () => {
  const c1 = resolveCaps(["Okuma Genos M460V 5-axis"]);
  assert.ok(c1.has("okuma") && c1.has("mill") && c1.has("5axis"));
  const c2 = resolveCaps(["Okuma LB Multus"]);
  assert.ok(c2.has("okuma") && c2.has("lathe"));
  assert.ok(!c2.has("5axis"), "a lathe descriptor must not assert 5axis");
  const bare = resolveCaps(["okuma"]);
  assert.ok(bare.has("okuma"));
  assert.ok(!bare.has("mill") && !bare.has("lathe") && !bare.has("5axis"), "bare controller asserts no machine type");
  assert.equal(resolveCaps([]).size, 0);
});

test("fireForApproach surfaces resolved controllers + okuma-without-okuma-target feasibility note", () => {
  const r = fireForApproach({ operations: ["threading"], machines: ["Fanuc 31i lathe"] });
  assert.deepEqual(r.controllers, ["fanuc"]);
  assert.match(r.summary, /no Okuma OSP target resolved/);
});

// ---- detectOperations ----

test("detectOperations parses post-processor ops from prompt text", () => {
  assert.ok(detectOperations("emit the Okuma 5-axis program with RTCP").includes("five_axis_tcp"));
  assert.ok(detectOperations("emit the Okuma 5-axis program with RTCP").includes("program_emit"));
  assert.ok(detectOperations("thread the M10 then part off").includes("threading"));
  assert.ok(detectOperations("thread the M10 then part off").includes("part_off"));
  assert.ok(detectOperations("turn the coolant M8 on after spindle").includes("coolant_on"));
  assert.deepEqual(detectOperations("write a react quoting frontend"), []);
});

test("detectOperations output feeds fireForApproach end-to-end", () => {
  const ops = detectOperations("emit a tapping canned cycle and turn coolant on for the Siemens mill");
  const r = fireForApproach({ operations: ops, machines: ["Siemens 840D mill"] });
  assert.ok(r.operations.some((o) => o.operation === "tap"));
  assert.ok(gateIds(r, "tap").includes("siemens_mcall_vs_fanuc_g84"));
});

// ---- adversarial ----

test("ADVERSARIAL: null/empty/non-array ctx never throws, empty ops", () => {
  for (const bad of [undefined, null, {}, { operations: "program_emit" }, { operations: [1, {}, ""] }]) {
    const r = fireForApproach(bad);
    assert.ok(Array.isArray(r.operations) && r.operations.length === 0);
    assert.equal(typeof r.summary, "string");
  }
  assert.deepEqual(detectOperations(null), []);
  assert.deepEqual(detectOperations(""), []);
  assert.deepEqual(resolveCaps(null) instanceof Set ? [...resolveCaps(null)] : "throw", []);
});

test("JM_POST_FLEET lists the JM controller fleet incl Okuma + Haas + Hurco + Fanuc", () => {
  const ids = JM_POST_FLEET.map((c) => c.id);
  for (const id of ["haas", "hurco", "okuma", "fanuc"]) assert.ok(ids.includes(id), `missing ${id}`);
  assert.ok(Object.isFrozen(JM_POST_FLEET));
});
