// scripts/lib/dimension-corroborate.test.mjs
// Tests for the cross-source dimension corroboration fold (U-XCSD).
// Load-bearing intent (R9): ≥2 dimensional sources agreeing → corroborated (CAD value as nominal);
// same-type disagreement within band → CONFLICT (surfaced, never averaged); single source →
// unconfirmed; CNC is presence-only (never a value vote); type-aware separation flows through.
// Pure, no I/O. Run: node --test <file>
import { test } from "node:test";
import assert from "node:assert/strict";
import { corroborate, aggregateCorroboration, DEFAULT_CONFLICT_BAND } from "./dimension-corroborate.mjs";

const dim = (type, nominal_mm) => ({ type, nominal_mm });

test("DEFAULT_CONFLICT_BAND is 30%", () => assert.equal(DEFAULT_CONFLICT_BAND, 0.30));

test("print+CAD agree → corroborated; CAD value is the nominal; confirmed_by both", () => {
  const r = corroborate({
    print: { dimensions: [dim("linear", 25.4), dim("diameter", 10.0)] },
    cad: { dimensions: [dim("linear", 25.4), dim("diameter", 10.0)] },
  });
  assert.equal(r.summary.n_corroborated, 2);
  assert.equal(r.summary.n_conflict, 0);
  assert.equal(r.summary.n_unconfirmed, 0);
  assert.equal(r.summary.corroboration_rate, 1);
  for (const c of r.corroborated) {
    assert.deepEqual(c.confirmed_by, ["print", "cad"]);
    assert.equal(c.nominal_mm, c.cad_mm, "CAD geometry is the ground-truth nominal");
  }
});

test("CONFLICT: same type, disagree beyond tolerance but within band → surfaced (never averaged)", () => {
  const r = corroborate({
    print: { dimensions: [dim("diameter", 9.5)] },   // misread of the 10.0 CAD value (5% off)
    cad: { dimensions: [dim("diameter", 10.0)] },
  });
  assert.equal(r.summary.n_corroborated, 0, "5% > 1% tol → not corroborated");
  assert.equal(r.summary.n_conflict, 1);
  const c = r.conflicts[0];
  assert.equal(c.type, "diameter");
  assert.equal(c.cad_mm, 10.0); assert.equal(c.print_mm, 9.5);
  assert.equal(c.delta_mm, -0.5);
  assert.ok(c.rel_diff > 0.01 && c.rel_diff <= DEFAULT_CONFLICT_BAND);
});

test("distinct same-type features beyond the band → both UNCONFIRMED, not a conflict", () => {
  const r = corroborate({
    print: { dimensions: [dim("diameter", 5.0)] },
    cad: { dimensions: [dim("diameter", 50.0)] },   // 90% apart → genuinely different holes
  });
  assert.equal(r.summary.n_conflict, 0);
  assert.equal(r.summary.n_unconfirmed, 2);
  const reasons = r.unconfirmed.map((u) => u.reason).sort();
  assert.deepEqual(reasons, ["cad_only", "print_only"]);
});

test("type-aware separation flows through: a print diameter never corroborates a CAD linear of equal mm", () => {
  const r = corroborate({
    print: { dimensions: [dim("diameter", 10.0)] },
    cad: { dimensions: [dim("linear", 10.0)] },
  });
  assert.equal(r.summary.n_corroborated, 0, "diameter≠linear even at identical value");
  assert.equal(r.summary.n_conflict, 0, "different types are not the same feature");
  assert.equal(r.summary.n_unconfirmed, 2);
});

test("CNC presence corroborates a HOLE dim's existence (boolean support), never votes a value", () => {
  const r = corroborate({
    print: { dimensions: [dim("diameter", 8.0), dim("linear", 30.0)] },
    cad: { dimensions: [dim("diameter", 8.0), dim("linear", 30.0)] },
    cnc: { features: ["central_oil_hole"] },
  });
  const diaPair = r.corroborated.find((c) => c.type === "diameter");
  const linPair = r.corroborated.find((c) => c.type === "linear");
  assert.equal(diaPair.cnc_presence_support, true, "CNC drilling presence supports the hole Ø");
  assert.equal(linPair.cnc_presence_support, null, "a linear dim is not a hole feature → no CNC vote");
  // CNC never appears in confirmed_by (it is presence, not a dimensional source)
  assert.ok(!diaPair.confirmed_by.includes("cnc"));
  assert.deepEqual(r.summary.cnc_presence, ["central_oil_hole"]);
});

test("CNC with no hole evidence → hole dim support is false (not null, not true)", () => {
  const r = corroborate({
    print: { dimensions: [dim("diameter", 8.0)] },
    cad: { dimensions: [dim("diameter", 8.0)] },
    cnc: { features: ["stepped_revolved_axis"] },  // turned profile, no drilling
  });
  assert.equal(r.corroborated[0].cnc_presence_support, false);
});

test("single dimensional source → everything unconfirmed (low-trust), labeled by source", () => {
  const pOnly = corroborate({ print: { dimensions: [dim("linear", 12.7)] } });
  assert.equal(pOnly.summary.n_corroborated, 0);
  assert.equal(pOnly.unconfirmed[0].reason, "single_source:print");
  const cOnly = corroborate({ cad: { dimensions: [dim("diameter", 6.35)] } });
  assert.equal(cOnly.unconfirmed[0].reason, "single_source:cad");
});

test("mixed: 1 agree + 1 conflict + 1 print-only + 1 cad-only", () => {
  const r = corroborate({
    print: { dimensions: [dim("linear", 25.4), dim("diameter", 9.5), dim("radius", 3.0)] },
    cad: { dimensions: [dim("linear", 25.4), dim("diameter", 10.0), dim("linear", 100.0)] },
  });
  assert.equal(r.summary.n_corroborated, 1, "the 25.4 linear agrees");
  assert.equal(r.summary.n_conflict, 1, "9.5 vs 10.0 diameter conflict");
  // radius 3.0 (print-only) + linear 100.0 (cad-only) → unconfirmed
  assert.equal(r.summary.n_unconfirmed, 2);
});

// ── adversarial ──
test("null / empty / malformed sources → empty record, no throw", () => {
  for (const inp of [null, undefined, {}, { print: null }, { print: { dimensions: null } }, { cad: { dimensions: [] } }]) {
    const r = corroborate(inp);
    assert.equal(r.summary.n_corroborated, 0);
    assert.equal(r.summary.total_findings, 0);
    assert.equal(r.summary.corroboration_rate, 0);
  }
});

test("non-array cnc features + non-finite dims are tolerated", () => {
  const r = corroborate({
    print: { dimensions: [dim("diameter", 8.0), dim("diameter", NaN), { type: "linear" }] },
    cad: { dimensions: [dim("diameter", 8.0)] },
    cnc: { features: "not-an-array" },
  });
  assert.equal(r.summary.n_corroborated, 1, "the NaN + value-less dims are filtered");
  assert.deepEqual(r.summary.cnc_presence, []);
});

// ── aggregate ──
test("aggregateCorroboration: corpus roll-up of per-part records", () => {
  const recs = [
    corroborate({ print: { dimensions: [dim("linear", 10)] }, cad: { dimensions: [dim("linear", 10)] } }), // fully corroborated
    corroborate({ print: { dimensions: [dim("diameter", 9.5)] }, cad: { dimensions: [dim("diameter", 10.0)] } }), // conflict
    corroborate({ print: { dimensions: [dim("linear", 5)] } }), // unconfirmed
  ];
  const a = aggregateCorroboration(recs);
  assert.equal(a.parts, 3);
  assert.equal(a.corroborated, 1);
  assert.equal(a.conflict, 1);
  assert.equal(a.unconfirmed, 1);
  assert.equal(a.parts_with_conflict, 1);
  assert.equal(a.parts_fully_corroborated, 1);
  assert.equal(a.corroboration_rate, +(1 / 3).toFixed(4));
});

test("aggregateCorroboration: empty / non-array → zeros, no crash", () => {
  assert.equal(aggregateCorroboration([]).parts, 0);
  assert.equal(aggregateCorroboration(null).corroboration_rate, 0);
});
