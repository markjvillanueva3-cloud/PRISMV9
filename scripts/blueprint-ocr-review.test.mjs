// scripts/blueprint-ocr-review.test.mjs
// Tests for the overnight-review digest aggregator (U-PSGB-XRAY-REVIEW).
// Run: node --test <file>
import { test } from "node:test";
import assert from "node:assert/strict";
import { confidenceBand, aggregateEvents, DEFAULT_LOW_CONF } from "./blueprint-ocr-review.mjs";

// event matching the batch runner's buildPageEvent payload shape
function ev(pdf, page, extraction) { return { type: "outcome_record", payload: { pdf_path: pdf, page_index: page, extraction } }; }
function ex({ conf = 0.9, dims = [], gdt = [], ur = null, units = "in", tb = {} } = {}) {
  return { confidence: conf, units, title_block: tb, dimensions: dims, gdt, unit_resolution: ur || { dimensions_total: dims.length, dimensions_unit_resolved: dims.length } };
}

test("confidenceBand: bands by score, NaN→unknown", () => {
  assert.equal(confidenceBand(0.95), "high(>=0.9)");
  assert.equal(confidenceBand(0.9), "high(>=0.9)");
  assert.equal(confidenceBand(0.8), "ok(0.7-0.9)");
  assert.equal(confidenceBand(0.6), "low(0.5-0.7)");
  assert.equal(confidenceBand(0.3), "poor(<0.5)");
  assert.equal(confidenceBand("x"), "unknown");
  assert.equal(confidenceBand(undefined), "unknown");
});

test("DEFAULT_LOW_CONF is the verified 0.70 OCR floor", () => {
  assert.equal(DEFAULT_LOW_CONF, 0.70);
});

test("aggregateEvents: empty / non-array → zeroed digest (no crash)", () => {
  const a = aggregateEvents([]);
  assert.equal(a.extraction_events, 0);
  assert.equal(a.ok_rate, null);
  assert.equal(a.unit_resolved_rate, null);
  assert.equal(aggregateEvents(null).extraction_events, 0);
  assert.equal(aggregateEvents(undefined).extraction_events, 0);
});

test("aggregateEvents: counts dims/gdt/bands + ok_rate + avg", () => {
  const events = [
    ev("a.pdf", 0, ex({ conf: 0.95, dims: [{ type: "linear", nominal_mm: 25.4 }, { type: "diameter", nominal_mm: 12.7 }] })),
    ev("b.pdf", 0, ex({ conf: 0.8, dims: [{ type: "radius", nominal_mm: 5 }] })),
  ];
  const a = aggregateEvents(events);
  assert.equal(a.extraction_events, 2);
  assert.equal(a.prints_with_dims, 2);
  assert.equal(a.total_dimensions, 3);
  assert.equal(a.avg_dims_per_print, 1.5);
  assert.equal(a.ok_rate, 1);
  assert.equal(a.confidence_bands["high(>=0.9)"], 1);
  assert.equal(a.confidence_bands["ok(0.7-0.9)"], 1);
});

test("aggregateEvents: no-dims print flagged + counted", () => {
  const a = aggregateEvents([ev("empty.pdf", 0, ex({ conf: 0.9, dims: [] }))]);
  assert.equal(a.prints_no_dims, 1);
  assert.equal(a.prints_with_dims, 0);
  assert.equal(a.no_dims_prints[0].pdf, "empty.pdf");
  assert.equal(a.ok_rate, 0);
});

test("aggregateEvents: low-confidence print flagged at the 0.70 floor", () => {
  const a = aggregateEvents([ev("lo.pdf", 0, ex({ conf: 0.6, dims: [{ type: "linear", nominal_mm: 1 }] }))]);
  assert.equal(a.low_confidence_prints.length, 1);
  assert.equal(a.low_confidence_prints[0].conf, 0.6);
  // boundary: exactly 0.70 is NOT low (floor is "below 0.70")
  const b = aggregateEvents([ev("ok.pdf", 0, ex({ conf: 0.7, dims: [{ type: "linear", nominal_mm: 1 }] }))]);
  assert.equal(b.low_confidence_prints.length, 0);
});

test("aggregateEvents: datum-deficient GD&T counted", () => {
  // realistic combo: a datum-REQUIRING control (position) with no datum is deficient; a FORM
  // tolerance (flatness) with no datum is NOT (ASME §8.2). The aggregator is symbol-blind and
  // just counts the per-frame flag set upstream by extractGdt.
  const a = aggregateEvents([ev("g.pdf", 0, ex({ gdt: [{ symbol: "position", datum_deficient: true }, { symbol: "flatness", datum_deficient: false }] }))]);
  assert.equal(a.total_gdt, 2);
  assert.equal(a.datum_deficient_gdt, 1);
});

test("aggregateEvents: unit-resolution rate + unresolved-unit flagging", () => {
  const a = aggregateEvents([ev("u.pdf", 0, ex({ dims: [{ type: "linear", nominal_mm: 1 }, { type: "linear", nominal_raw: 2 }], ur: { dimensions_total: 2, dimensions_unit_resolved: 1 } }))]);
  assert.equal(a.unit_resolved_rate, 0.5);
  assert.equal(a.unresolved_unit_prints.length, 1);
});

test("aggregateEvents: non-outcome / no-extraction events skipped", () => {
  const a = aggregateEvents([
    { type: "something_else", payload: {} },
    { type: "outcome_record", payload: {} }, // no extraction
    ev("real.pdf", 0, ex({ dims: [{ type: "linear", nominal_mm: 1 }] })),
  ]);
  assert.equal(a.extraction_events, 1);
});
