#!/usr/bin/env node
/**
 * Tests for lathe-tip-classify.mjs (tribal free-text -> structured LatheTribalSignal).
 * Run: node scripts/lib/lathe-tip-classify.test.mjs
 * R9: clamp band [0.25,2.5], no-op drop, enum validation, advisory fallback (never fabricate an adjustment).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseClassification, extractJsonObject, FACTOR_MIN, FACTOR_MAX } from "./lathe-tip-classify.mjs";

// ---- extractJsonObject ----------------------------------------------------
test("extractJsonObject: bare / prose-wrapped / fenced JSON", () => {
  assert.deepEqual(extractJsonObject('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJsonObject('here is the result: {"a":1} done'), { a: 1 });
  assert.deepEqual(extractJsonObject('```json\n{"a":1}\n```'), { a: 1 });
  assert.equal(extractJsonObject("no json here"), null);
  assert.equal(extractJsonObject(""), null);
});

// ---- advisory classification ---------------------------------------------
test("model advisory_only=true -> advisory_only signal", () => {
  const r = parseClassification({ advisory_only: true }, { tip_id: "t1" });
  assert.equal(r.advisory_only, true);
  assert.equal(r.tip_id, "t1");
});
test("no parametric factors -> advisory_only (never fabricate an adjustment)", () => {
  const r = parseClassification({ advisory_only: false, operation_type: "turn_rough", adjustment: {} });
  assert.equal(r.advisory_only, true);
});
test("all factors null -> advisory_only", () => {
  const r = parseClassification({ adjustment: { rpm_factor: null, feed_factor: null, doc_factor: null } });
  assert.equal(r.advisory_only, true);
});
test("no-op factor 1.0 is dropped -> advisory_only", () => {
  const r = parseClassification({ adjustment: { feed_factor: 1.0 } });
  assert.equal(r.advisory_only, true);
});

// ---- parametric classification -------------------------------------------
test("real parametric tip -> structured signal with affects + adjustment", () => {
  const r = parseClassification({
    operation_type: "turn_rough", material_iso: "M", signal_type: "negative",
    adjustment: { feed_factor: 0.8 },
  }, { tip_id: "t2", tip_title: "stainless rough" });
  assert.equal(r.advisory_only, false);
  assert.equal(r.operation_type, "turn_rough");
  assert.equal(r.material_iso, "M");
  assert.equal(r.signal_type, "negative");
  assert.equal(r.adjustment.feed_factor, 0.8);
  assert.deepEqual(r.affects_parameters, ["feed"]);
  assert.equal(r.clamped, true);
});

test("parametric signal carries confidence + rationale (LatheTribalSignal contract)", () => {
  const r = parseClassification({ adjustment: { feed_factor: 0.8 } }, { rationale: "stainless work-hardens" });
  assert.equal(r.advisory_only, false);
  assert.equal(typeof r.confidence, "number");
  assert.equal(r.rationale, "stainless work-hardens");
  const d = parseClassification({ adjustment: { feed_factor: 0.8 } }, {});
  assert.equal(d.confidence, 0.5);               // default
  assert.equal(d.rationale, "tribal-derived signal"); // default
});

// ---- clamp band [0.25, 2.5] ----------------------------------------------
test("out-of-band factors are CLAMPED to [0.25, 2.5] (never override physics)", () => {
  const lo = parseClassification({ adjustment: { rpm_factor: 0.05 } }); // -> 0.25
  assert.equal(lo.adjustment.rpm_factor, FACTOR_MIN);
  const hi = parseClassification({ adjustment: { doc_factor: 9 } });    // -> 2.5
  assert.equal(hi.adjustment.doc_factor, FACTOR_MAX);
});
test("NaN/Infinity factors dropped, not coerced", () => {
  const r = parseClassification({ adjustment: { rpm_factor: NaN, feed_factor: Infinity, doc_factor: 0.7 } });
  assert.equal(r.adjustment.rpm_factor, undefined);
  assert.equal(r.adjustment.feed_factor, undefined);
  assert.equal(r.adjustment.doc_factor, 0.7);
});

// ---- sfm_max -------------------------------------------------------------
test("sfm_max (absolute cap) is kept + affects rpm", () => {
  const r = parseClassification({ operation_type: "turn_finish", adjustment: { sfm_max: 180 } });
  assert.equal(r.advisory_only, false);
  assert.equal(r.adjustment.sfm_max, 180);
  assert.ok(r.affects_parameters.includes("rpm"));
});
test("non-positive sfm_max dropped", () => {
  const r = parseClassification({ adjustment: { sfm_max: 0 } });
  assert.equal(r.advisory_only, true); // nothing parametric survives
});
test("out-of-band sfm_max dropped (hallucination guard, ft/min [20,3000])", () => {
  assert.equal(parseClassification({ adjustment: { sfm_max: 99999 } }).advisory_only, true); // too high
  assert.equal(parseClassification({ adjustment: { sfm_max: 5 } }).advisory_only, true);     // too low
  assert.equal(parseClassification({ adjustment: { sfm_max: 180 } }).advisory_only, false);  // in band
});

// ---- enum validation -----------------------------------------------------
test("invalid operation_type / material_iso -> dropped (undefined), not a crash", () => {
  const r = parseClassification({ operation_type: "milling", material_iso: "Z", adjustment: { feed_factor: 0.9 } });
  assert.equal(r.advisory_only, false);
  assert.equal(r.operation_type, undefined);
  assert.equal(r.material_iso, undefined);
});
test("invalid signal_type defaults to constraint", () => {
  const r = parseClassification({ signal_type: "bogus", adjustment: { feed_factor: 0.9 } });
  assert.equal(r.signal_type, "constraint");
});

// ---- quantitative-evidence guard (FF2 hallucination suppression) ---------
test("guard: factor REJECTED when tip lacks verb+number (FF2 control-code hallucination)", () => {
  const r = parseClassification({ adjustment: { feed_factor: 1.2 } },
    { tipText: "Use FF2 for setting the feedrate when inserting in the turret." });
  assert.equal(r.advisory_only, true); // no directional change verb -> hallucinated factor dropped
});
test("guard: factor KEPT when tip states a real quantitative change", () => {
  const r = parseClassification({ adjustment: { feed_factor: 0.8 } },
    { tipText: "Reduce feed 20% for interrupted cuts in stainless." });
  assert.equal(r.advisory_only, false);
  assert.equal(r.adjustment.feed_factor, 0.8);
});
test("guard inert when no tipText supplied (backward-compat)", () => {
  const r = parseClassification({ adjustment: { feed_factor: 0.8 } }, {});
  assert.equal(r.advisory_only, false); // older callers unaffected
});
test("sfm_max guard: kept with surface-speed context + number, dropped without", () => {
  assert.equal(parseClassification({ adjustment: { sfm_max: 180 } },
    { tipText: "Cap surface speed at 180 SFM for titanium." }).advisory_only, false);
  assert.equal(parseClassification({ adjustment: { sfm_max: 180 } },
    { tipText: "Use a rigid setup and sharp insert." }).advisory_only, true); // no sfm context
});

// ---- adversarial ---------------------------------------------------------
test("unparseable / null -> advisory_only fallback (no throw)", () => {
  assert.equal(parseClassification("not json", { tip_id: "x" }).advisory_only, true);
  assert.equal(parseClassification(null).advisory_only, true);
  assert.equal(parseClassification(undefined).advisory_only, true);
});
test("prose-wrapped real JSON is parsed end-to-end", () => {
  const raw = 'Sure! Here you go:\n```json\n{"operation_type":"bore","adjustment":{"rpm_factor":0.7}}\n```';
  const r = parseClassification(raw);
  assert.equal(r.advisory_only, false);
  assert.equal(r.operation_type, "bore");
  assert.equal(r.adjustment.rpm_factor, 0.7);
});
