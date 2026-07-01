/**
 * sfc-sweep-oracle.test.mjs (slot:oscar) -- node:test
 * Reference-value + invariant tests for the SFC silent-wrong oracle.
 * Run: node H:/prism/scripts/lib/sfc-sweep-oracle.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rpmFromVc, checkRpmConsistency, checkMrrConsistency, checkMrrFromFeedRate,
  checkChipThinningDirection, perCellOracle, makeCrossCellOracle,
} from "./sfc-sweep-oracle.mjs";

const approx = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

test("rpmFromVc: Vc=100 m/min, D=10mm -> 3183.10 rpm", () => {
  const n = rpmFromVc(100, 10);
  assert.ok(approx(n, 100000 / (Math.PI * 10), 1e-9));
  assert.ok(Math.abs(n - 3183.0989) < 0.01);
});

test("rpmFromVc: guards non-positive inputs", () => {
  assert.equal(rpmFromVc(0, 10), null);
  assert.equal(rpmFromVc(100, 0), null);
  assert.equal(rpmFromVc(-5, 10), null);
});

test("checkRpmConsistency: consistent RPM passes", () => {
  const params = { tool_diameter: 10 };
  const v = { cutting_speed_m_min: 100, spindle_rpm: 3183.1 };
  assert.equal(checkRpmConsistency(params, v), null);
});

test("checkRpmConsistency: 2x-wrong RPM flags rpm_inconsistent", () => {
  const params = { tool_diameter: 10 };
  const v = { cutting_speed_m_min: 100, spindle_rpm: 6366.2 }; // double
  const r = checkRpmConsistency(params, v);
  assert.ok(r && r.kind === "rpm_inconsistent");
  assert.ok(r.relPct > 0.9);
});

test("checkRpmConsistency: low-Vc display-rounding (D3 HSS-on-Ti ~7 m/min) is NOT flagged (quantum floor)", () => {
  // Real 2026-06-30 overnight-sweep cell: internal vc=7.22 -> rpm=766 (exactly consistent), but the
  // engine publishes Math.round(vc)=7 and Math.round(rpm)=766 (ProductEngine.ts:947-948). Re-deriving
  // expected rpm from the rounded Vc=7 gives 742.7 -> a 3.13% gap, OVER the flat 2% relative tol but
  // BELOW the +/-0.5 m/min Vc-rounding floor (~53.5 rpm at D3). Display rounding, NOT silent-wrong math.
  const params = { tool_diameter: 3 };
  const v = { cutting_speed_m_min: 7, spindle_rpm: 766 };
  const r = checkRpmConsistency(params, v);
  assert.equal(r, null, `expected null (display-rounding artifact) but got ${JSON.stringify(r)}`);
});

test("checkRpmConsistency: a GENUINE >quantum rpm inconsistency at the SAME small D still flags", () => {
  // Same D3 low-Vc geometry, but rpm=900 vs the 742.7 implied by published Vc=7: absDiff ~157 rpm
  // exceeds the ~53.5 rpm rounding floor AND 21% >> 2% -> a real inconsistency, must NOT be forgiven.
  const params = { tool_diameter: 3 };
  const v = { cutting_speed_m_min: 7, spindle_rpm: 900 };
  const r = checkRpmConsistency(params, v);
  assert.ok(r && r.kind === "rpm_inconsistent", "genuine small-D inconsistency must still flag");
  assert.ok(r.relPct > 0.15, `expected >15% rel, got ${r && r.relPct}`);
  assert.ok(r.absDiff > 53, `expected absDiff above the rounding floor, got ${r && r.absDiff}`);
});

test("checkMrrConsistency: ap2 ae5 z4 fz0.05 rpm3183.1 -> MRR 6.366 cm3/min passes", () => {
  const params = { operation: "slot_milling", depth: 2, width: 5, number_of_teeth: 4 };
  const vf = 0.05 * 4 * 3183.1; // 636.62
  const mrr = (2 * 5 * vf) / 1000; // 6.3662
  const v = { feed_per_tooth_mm: 0.05, spindle_rpm: 3183.1, mrr_cm3_min: mrr };
  assert.equal(checkMrrConsistency(params, v), null);
});

test("checkMrrConsistency: dropped 1000x unit factor flags mrr_inconsistent", () => {
  const params = { operation: "face_milling", depth: 2, width: 5, number_of_teeth: 4 };
  const v = { feed_per_tooth_mm: 0.05, spindle_rpm: 3183.1, mrr_cm3_min: 6366.2 }; // forgot /1000
  const m = checkMrrConsistency(params, v);
  assert.ok(m && m.kind === "mrr_inconsistent");
  assert.ok(m.relPct > 100);
});

test("checkMrrConsistency: tiny MRR quantised to 2 decimals (0.2149->0.21) is NOT flagged (rounding floor)", () => {
  // Real engine cell: D3 z3 ap0.3 ae0.15 -> true 0.21486, published 0.21 (2-decimal display rounding).
  const params = { operation: "slot_milling", depth: 0.3, width: 0.15, number_of_teeth: 3 };
  const v = { feed_per_tooth_mm: 0.075, spindle_rpm: 21221, mrr_cm3_min: 0.21 };
  // ~2.3% relative, but abs diff ~0.0049 < one 0.01 display quantum -> not silent-wrong math.
  assert.equal(checkMrrConsistency(params, v), null);
});

test("checkMrrConsistency: 2x feed error on a normal cut still flags (abs diff >> quantum)", () => {
  const params = { operation: "slot_milling", depth: 3, width: 8, number_of_teeth: 4 };
  const vf = 0.1 * 4 * 3000;             // 1200
  const trueMrr = (3 * 8 * vf) / 1000;   // 28.8
  const v = { feed_per_tooth_mm: 0.1, spindle_rpm: 3000, mrr_cm3_min: trueMrr * 2 }; // 57.6 (2x bug)
  const m = checkMrrConsistency(params, v);
  assert.ok(m && m.kind === "mrr_inconsistent");
  assert.ok(m.absDiff > 0.01);
});

test("checkMrrConsistency: skips non-milling (axial) operations", () => {
  const params = { operation: "drilling", depth: 2, width: 5, number_of_teeth: 4 };
  const v = { feed_per_tooth_mm: 0.05, spindle_rpm: 3183.1, mrr_cm3_min: 999 };
  assert.equal(checkMrrConsistency(params, v), null);
});

test("checkMrrFromFeedRate: MRR matches ap*ae*feed_rate/1000 (chip-thinning-agnostic) passes", () => {
  const params = { operation: "face_milling", depth: 3, width: 6 };
  const vf = 1800; // engine's own (possibly chip-thinned) table feed
  const v = { feed_rate_mm_min: vf, mrr_cm3_min: (3 * 6 * vf) / 1000 }; // 32.4
  assert.equal(checkMrrFromFeedRate(params, v), null);
});

test("checkMrrFromFeedRate: half-MRR bug flags mrr_feedrate_inconsistent", () => {
  const params = { operation: "slot_milling", depth: 3, width: 6 };
  const vf = 1800;
  const v = { feed_rate_mm_min: vf, mrr_cm3_min: (3 * 6 * vf) / 1000 / 2 }; // 16.2 (half)
  const m = checkMrrFromFeedRate(params, v);
  assert.ok(m && m.kind === "mrr_feedrate_inconsistent");
});

test("checkChipThinningDirection: feed_rate >= geometric fz*z*RPM passes (correct thinning sign)", () => {
  const params = { operation: "slot_milling", number_of_teeth: 4 };
  const v = { feed_per_tooth_mm: 0.1, spindle_rpm: 3000, feed_rate_mm_min: 0.1 * 4 * 3000 * 1.3 }; // thinned-up
  assert.equal(checkChipThinningDirection(params, v), null);
});

test("checkChipThinningDirection: feed_rate well below geometric feed -> chip_thinning_inverted", () => {
  const params = { operation: "slot_milling", number_of_teeth: 4 };
  const geom = 0.1 * 4 * 3000;
  const v = { feed_per_tooth_mm: 0.1, spindle_rpm: 3000, feed_rate_mm_min: geom * 0.6 }; // under-fed
  const r = checkChipThinningDirection(params, v);
  assert.ok(r && r.kind === "chip_thinning_inverted");
});

test("perCellOracle: clean cell returns no violations", () => {
  const params = { operation: "slot_milling", tool_diameter: 10, depth: 2, width: 5, number_of_teeth: 4 };
  const rpm = rpmFromVc(120, 10);
  const fz = 0.04;
  const mrr = (2 * 5 * (fz * 4 * rpm)) / 1000;
  const v = { cutting_speed_m_min: 120, spindle_rpm: rpm, feed_per_tooth_mm: fz, mrr_cm3_min: mrr };
  assert.deepEqual(perCellOracle(params, v), []);
});

test("crossCellOracle: HSS faster than carbide -> hss_not_slower_than_carbide", () => {
  const o = makeCrossCellOracle();
  const base = { material: "4140", tool_diameter: 10, number_of_teeth: 4, operation: "slot_milling", coolant_type: "flood", depth: 2, width: 5 };
  o.record({ ...base, tool_material: "Carbide" }, { cutting_speed_m_min: 200 });
  o.record({ ...base, tool_material: "HSS" }, { cutting_speed_m_min: 260 }); // WRONG: HSS faster
  const vs = o.violations();
  assert.equal(vs.length, 1);
  assert.equal(vs[0].kind, "hss_not_slower_than_carbide");
});

test("crossCellOracle: HSS == carbide Vc (shared RPM-cap binding) is NOT flagged (strict >)", () => {
  // Real case: D6 aluminium finishing clamps BOTH carbide and HSS to the machine 12000-rpm cap
  // -> identical Vc 226. Equal is benign (the cap sets Vc, not the tool); only HSS strictly faster is wrong.
  const o = makeCrossCellOracle();
  const base = { material: "6061", tool_diameter: 6, number_of_teeth: 4, operation: "slot_milling", coolant_type: "flood", depth: 0.5, width: 0.6 };
  o.record({ ...base, tool_material: "Carbide" }, { cutting_speed_m_min: 226 });
  o.record({ ...base, tool_material: "HSS" }, { cutting_speed_m_min: 226 }); // equal -> cap-bound, benign
  assert.deepEqual(o.violations(), []);
});

test("crossCellOracle: HSS correctly slower -> clean", () => {
  const o = makeCrossCellOracle();
  const base = { material: "4140", tool_diameter: 10, number_of_teeth: 4, operation: "slot_milling", coolant_type: "flood", depth: 2, width: 5 };
  o.record({ ...base, tool_material: "Carbide" }, { cutting_speed_m_min: 200 });
  o.record({ ...base, tool_material: "HSS" }, { cutting_speed_m_min: 60 });
  assert.deepEqual(o.violations(), []);
});

test("crossCellOracle: aluminium slower than superalloy -> speed_ordering_violation", () => {
  const o = makeCrossCellOracle();
  const base = { tool_diameter: 10, number_of_teeth: 4, tool_material: "Carbide", operation: "slot_milling", coolant_type: "flood", depth: 2, width: 5 };
  o.record({ ...base, material: "6061" }, { cutting_speed_m_min: 80 });        // N, should be fastest
  o.record({ ...base, material: "Inconel 718" }, { cutting_speed_m_min: 120 }); // S, should be slowest
  const vs = o.violations();
  assert.ok(vs.some((x) => x.kind === "speed_ordering_violation"));
});

test("crossCellOracle: custom keys + lowercase tool_material (all-axis sweep shape) flags HSS faster", () => {
  // All-axis factorial uses lowercase carbide/hss + ISO-letter materials + machine-side axes.
  const o = makeCrossCellOracle({
    toolMatKey: (p) => `${p.way}|${p.iso}|${p.diameter_mm}`,
    materialKey: (p) => `${p.way}|${p.diameter_mm}`,
    isoOf: (p) => p.iso,
  });
  const base = { way: "box_way", iso: "P", diameter_mm: 12 };
  o.record({ ...base, tool_material: "carbide" }, { cutting_speed_m_min: 200 });
  o.record({ ...base, tool_material: "hss" }, { cutting_speed_m_min: 240 }); // WRONG
  const vs = o.violations();
  assert.equal(vs.length, 1);
  assert.equal(vs[0].kind, "hss_not_slower_than_carbide");
  assert.equal(vs[0].carbideVc, 200);
  assert.equal(vs[0].hssVc, 240);
});

test("crossCellOracle: custom isoOf catches all-axis speed ordering (N slower than S)", () => {
  const o = makeCrossCellOracle({
    toolMatKey: (p) => `${p.way}|${p.iso}|${p.diameter_mm}`,
    materialKey: (p) => `${p.way}|${p.diameter_mm}`,
    isoOf: (p) => p.iso,
  });
  const base = { way: "box_way", diameter_mm: 12, tool_material: "carbide" };
  o.record({ ...base, iso: "N", material: "N" }, { cutting_speed_m_min: 90 });   // alu should be fastest
  o.record({ ...base, iso: "S", material: "S" }, { cutting_speed_m_min: 130 });  // super should be slowest
  assert.ok(o.violations().some((x) => x.kind === "speed_ordering_violation"));
});

test("crossCellOracle: correct speed ordering -> clean", () => {
  const o = makeCrossCellOracle();
  const base = { tool_diameter: 10, number_of_teeth: 4, tool_material: "Carbide", operation: "slot_milling", coolant_type: "flood", depth: 2, width: 5 };
  o.record({ ...base, material: "6061" }, { cutting_speed_m_min: 500 });       // N fastest
  o.record({ ...base, material: "1045" }, { cutting_speed_m_min: 200 });       // P mid
  o.record({ ...base, material: "Inconel 718" }, { cutting_speed_m_min: 40 }); // S slowest
  assert.deepEqual(o.violations(), []);
});
