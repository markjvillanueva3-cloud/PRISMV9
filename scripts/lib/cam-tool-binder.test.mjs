/**
 * Tests for cam-tool-binder.mjs — verifies kilo binds an op-family to a CONCRETE JM-owned tool,
 * prefers an ISO-group grade match, and FAILS LOUD (pending / no-match — never fabricates) when
 * the tool DB is absent or no tool fits. The fixture is real JM tool vocabulary (CNMG/DNMG inserts,
 * Capto C6 / ER-32 / VDI holders per jmDieSelectorCatalog) in the TOOL-DATA-CONTRACT shape — it is
 * the binder's INPUT data (what charlie/hotel will supply), not a mock of the binder itself.
 *
 *   node --test scripts/lib/cam-tool-binder.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { bindTool, bindToolsForPart } from "./cam-tool-binder.mjs";

// A representative slice of JM's owned turning tools, in the contract shape.
const JM_TOOL_DB = {
  tools: [
    { id: "T01-CNMG432-PR1535", tcode: "T0101", holder: "REGO-FIX CAPTO C6", op_families: ["facing", "OD_roughing"],
      insert: { iso_shape: "CNMG", nose_radius_in: 0.032, grade_iso_groups: ["P", "M", "K"] } },
    { id: "T02-DNMG431-TN60", tcode: "T0202", holder: "REGO-FIX CAPTO C6", op_families: ["OD_finishing"],
      insert: { iso_shape: "DNMG", nose_radius_in: 0.0156, grade_iso_groups: ["P", "M"] } },
    { id: "T07-BORE-MCLNR12", tcode: "T0707", holder: "BIG DAISHOWA ER-32", op_families: ["ID_boring"],
      insert: { iso_shape: "CCMT", nose_radius_in: 0.0156, grade_iso_groups: ["P", "M", "K"] } },
    { id: "T06-THREAD-16ER", tcode: "T0606", holder: "VDI30", op_families: ["threading"],
      insert: { iso_shape: "16ER-AG60", nose_radius_in: 0, grade_iso_groups: ["P", "M"] } },
    { id: "T11-PART-GIP318", tcode: "T1111", holder: "VDI30", op_families: ["parting_cutoff", "grooving"],
      insert: { iso_shape: "GIP", nose_radius_in: 0, grade_iso_groups: ["P", "M", "K"] } },
    { id: "T05-CDRILL90", tcode: "T0505", holder: "BIG DAISHOWA ER-32", op_families: ["drilling_centering"],
      insert: { iso_shape: "spot-drill-90", nose_radius_in: 0, grade_iso_groups: ["P", "M", "K", "N", "S", "H"] } },
  ],
};

const recipe = (family) => ({ family, jm_tool: { tcode: "Txx" } });

test("absent tool DB → pending_tool_data, never fabricates a tool", () => {
  const r = bindTool(recipe("OD_roughing"), null, { material_iso_group: "P" });
  assert.equal(r.bound, null);
  assert.equal(r.status, "pending_tool_data");
  assert.match(r.reason, /CAM-TOOL-DATA-CONTRACT/);
});

test("empty tools array is treated as absent (pending, not a crash)", () => {
  const r = bindTool(recipe("facing"), { tools: [] }, { material_iso_group: "P" });
  assert.equal(r.status, "pending_tool_data");
  assert.equal(r.bound, null);
});

test("throws when given no recipe / no family (fail-loud on bad call)", () => {
  assert.throws(() => bindTool(null, JM_TOOL_DB), /family is required/);
  assert.throws(() => bindTool({}, JM_TOOL_DB), /family is required/);
});

test("ISO-group grade match → bound_iso_matched with the exact JM tool + insert", () => {
  const r = bindTool(recipe("OD_roughing"), JM_TOOL_DB, { material_iso_group: "K" });
  assert.equal(r.status, "bound_iso_matched");
  assert.equal(r.bound.id, "T01-CNMG432-PR1535");
  assert.equal(r.bound.tcode, "T0101");
  assert.equal(r.bound.holder, "REGO-FIX CAPTO C6");
  assert.equal(r.bound.insert.iso_shape, "CNMG");
  assert.equal(r.bound.insert.nose_radius_in, 0.032);
  assert.equal(r.alternatives, 0); // only T01 covers OD_roughing
});

test("material unknown → bound_material_pending (units-first: never assumes an ISO group)", () => {
  const r = bindTool(recipe("facing"), JM_TOOL_DB, {}); // no material_iso_group
  assert.equal(r.status, "bound_material_pending");
  assert.equal(r.bound.id, "T01-CNMG432-PR1535");
  assert.match(r.reason, /pending material/i);
});

test("family covered but JM owns no grade for that ISO group → bound_no_iso_grade_match", () => {
  // DNMG finishing insert only carries P,M grades; ask for K
  const r = bindTool(recipe("OD_finishing"), JM_TOOL_DB, { material_iso_group: "K" });
  assert.equal(r.status, "bound_no_iso_grade_match");
  assert.equal(r.bound.id, "T02-DNMG431-TN60");
  assert.match(r.reason, /no insert grade for ISO-K|verify grade|procurement/i);
});

test("no JM tool covers the op family → no_tool_for_family (procurement gap, surfaced)", () => {
  const r = bindTool(recipe("knurling"), JM_TOOL_DB, { material_iso_group: "P" });
  assert.equal(r.bound, null);
  assert.equal(r.status, "no_tool_for_family");
  assert.match(r.reason, /procurement|no JM-owned tool/i);
});

test("prefers the ISO-matched candidate over the first listed when both cover the family", () => {
  // two parting tools; only the second carries the requested grade
  const db = { tools: [
    { id: "PART-A", tcode: "T1101", holder: "VDI30", op_families: ["parting_cutoff"], insert: { iso_shape: "GIP", grade_iso_groups: ["P"] } },
    { id: "PART-B", tcode: "T1102", holder: "VDI30", op_families: ["parting_cutoff"], insert: { iso_shape: "GIP", grade_iso_groups: ["S"] } },
  ]};
  const r = bindTool(recipe("parting_cutoff"), db, { material_iso_group: "S" });
  assert.equal(r.bound.id, "PART-B");
  assert.equal(r.status, "bound_iso_matched");
  assert.equal(r.alternatives, 1);
});

test("bindToolsForPart tallies bound / pending / no_tool across a part plan", () => {
  const plan = {
    material_iso_group: "P",
    ordered_ops: [
      { family: "facing" },         // bound (P grade exists)
      { family: "OD_roughing" },    // bound
      { family: "threading" },      // bound (P)
      { family: "knurling" },       // no_tool_for_family
    ],
  };
  const out = bindToolsForPart(plan, JM_TOOL_DB);
  assert.equal(out.tool_summary.total, 4);
  assert.equal(out.tool_summary.bound, 3);
  assert.equal(out.tool_summary.no_tool, 1);
  assert.equal(out.tool_summary.pending, 0);
  assert.equal(out.ordered_ops[0].tool_binding.bound.id, "T01-CNMG432-PR1535");
  assert.equal(out.ordered_ops[3].tool_binding.status, "no_tool_for_family");
});

test("bindToolsForPart with absent DB → every op pending (no fabrication anywhere)", () => {
  const plan = { material_iso_group: "P", ordered_ops: [{ family: "facing" }, { family: "OD_finishing" }] };
  const out = bindToolsForPart(plan, null);
  assert.equal(out.tool_summary.pending, 2);
  assert.equal(out.tool_summary.bound, 0);
});

test("bindToolsForPart throws on a malformed plan", () => {
  assert.throws(() => bindToolsForPart({}, JM_TOOL_DB), /ordered_ops/);
  assert.throws(() => bindToolsForPart(null, JM_TOOL_DB), /ordered_ops/);
});
