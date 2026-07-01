// scripts/lib/extraction-aggregator-lib.test.mjs
// Tests for U-TDP03 extraction aggregator pure core.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  welfordInit,
  welfordUpdate,
  welfordFinalize,
  extractFeatureSamples,
  aggregateExtractions,
  parseJsonl,
  templateDivergence,
  AGGREGATABLE_EVENT_TYPES,
  DEFAULT_MIN_SAMPLES_PER_FEATURE,
} from "./extraction-aggregator-lib.mjs";

// ── Welford correctness (numerical reference values) ───────────────

test("welfordInit: clean state", () => {
  const s = welfordInit();
  assert.equal(s.n, 0);
  assert.equal(s.mean, 0);
  assert.equal(s.m2, 0);
});

test("welfordUpdate: single value mean=value, stddev=0", () => {
  let s = welfordInit();
  s = welfordUpdate(s, 5.0);
  const f = welfordFinalize(s);
  assert.equal(f.n, 1);
  assert.equal(f.mean, 5.0);
  assert.equal(f.stddev, 0);
  assert.equal(f.min, 5.0);
  assert.equal(f.max, 5.0);
});

test("welfordUpdate: matches reference mean+stddev for [1,2,3,4,5]", () => {
  let s = welfordInit();
  for (const v of [1, 2, 3, 4, 5]) s = welfordUpdate(s, v);
  const f = welfordFinalize(s);
  // mean = 3, sample variance = ((1-3)^2 + (2-3)^2 + (3-3)^2 + (4-3)^2 + (5-3)^2) / 4 = 10/4 = 2.5
  // sample stddev = sqrt(2.5) ≈ 1.5811388
  assert.equal(f.n, 5);
  assert.equal(f.mean, 3);
  assert.ok(Math.abs(f.stddev - Math.sqrt(2.5)) < 1e-9);
  assert.equal(f.min, 1);
  assert.equal(f.max, 5);
});

test("welfordUpdate: numerically stable across 10K samples", () => {
  let s = welfordInit();
  // [0, 1, 2, ..., 9999] — mean = 4999.5, sample variance = 8334166.6666...
  for (let i = 0; i < 10000; i++) s = welfordUpdate(s, i);
  const f = welfordFinalize(s);
  assert.ok(Math.abs(f.mean - 4999.5) < 1e-6);
  assert.equal(f.n, 10000);
  assert.equal(f.min, 0);
  assert.equal(f.max, 9999);
});

test("welfordUpdate: ignores NaN/Infinity (training-signal preservation)", () => {
  let s = welfordInit();
  s = welfordUpdate(s, 5);
  s = welfordUpdate(s, NaN);     // ignored
  s = welfordUpdate(s, Infinity); // ignored
  s = welfordUpdate(s, 7);
  const f = welfordFinalize(s);
  assert.equal(f.n, 2);
  assert.equal(f.mean, 6);
});

test("welfordFinalize: n=0 returns all zeros", () => {
  const f = welfordFinalize(welfordInit());
  assert.equal(f.n, 0);
  assert.equal(f.mean, 0);
  assert.equal(f.stddev, 0);
});

// ── extractFeatureSamples ──────────────────────────────────────────

test("extractFeatureSamples: dimensions[] with bilateral tolerance computes band correctly", () => {
  const e = {
    dimensions: [
      { kind: "linear", nominal: 25.4, tolerance: { upper: 0.05, lower: -0.05 } },
    ],
  };
  const r = extractFeatureSamples(e);
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, "linear");
  assert.equal(r[0].nominal, 25.4);
  // tolerance band = upper - lower = 0.05 - (-0.05) = 0.10
  assert.ok(Math.abs(r[0].tolerance_band - 0.10) < 1e-9);
});

test("extractFeatureSamples: dimensions[] with unilateral tolerance correctly distinguished", () => {
  const e = {
    dimensions: [
      { kind: "linear", nominal: 25.4, tolerance: { upper: 0.10, lower: 0 } },
    ],
  };
  const r = extractFeatureSamples(e);
  // bilateral 0.05/-0.05 would give 0.10 band; unilateral 0.10/0 also gives 0.10 — same band but
  // different shape. The aggregator currently captures the band; shape distinction is operator's
  // domain. This test pins the band semantics (upper - lower, NOT |upper|+|lower|).
  assert.equal(r[0].tolerance_band, 0.10);
});

test("extractFeatureSamples: dimension without kind falls back to 'unspecified_dim'", () => {
  const e = { dimensions: [{ nominal: 10 }] };
  const r = extractFeatureSamples(e);
  assert.equal(r[0].kind, "unspecified_dim");
});

test("extractFeatureSamples: prefers .kind over .type when both present", () => {
  const e = { dimensions: [{ kind: "central_oil_hole", type: "diameter", nominal: 1.27 }] };
  const r = extractFeatureSamples(e);
  assert.equal(r[0].kind, "central_oil_hole");
});

test("extractFeatureSamples: features[] with typical_size_mm", () => {
  const e = {
    features: [
      { kind: "central_oil_hole", typical_size_mm: 1.27 },
      { kind: "bevel_face_chamfer", size_mm: 0.5 },
    ],
  };
  const r = extractFeatureSamples(e);
  assert.equal(r.length, 2);
  assert.equal(r[0].nominal, 1.27);
  assert.equal(r[1].nominal, 0.5);
});

test("extractFeatureSamples: null/empty/malformed returns []", () => {
  assert.deepEqual(extractFeatureSamples(null), []);
  assert.deepEqual(extractFeatureSamples({}), []);
  assert.deepEqual(extractFeatureSamples({ dimensions: "not array" }), []);
});

test("extractFeatureSamples: corrupt nominal (string/NaN) skipped from sample.nominal but kind preserved", () => {
  const e = { dimensions: [{ kind: "x", nominal: "garbage" }] };
  const r = extractFeatureSamples(e);
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, "x");
  assert.equal(r[0].nominal, undefined); // not finite → not included
});

// ── aggregateExtractions (the headline behavior) ───────────────────

function mkEvent(part_class, dimensions) {
  return {
    type: "outcome_record",
    ts: "2026-05-18T16:00:00Z",
    payload: { part_class, extracted: { dimensions } },
  };
}

test("aggregateExtractions: empty input returns empty classes", () => {
  const r = aggregateExtractions([]);
  assert.equal(r.classes.length, 0);
  assert.equal(r.eventsConsumed, 0);
});

test("aggregateExtractions: groups by part_class (stratified)", () => {
  const events = [
    mkEvent("die", [{ kind: "ejector_pin_hole", nominal: 4.76 }]),
    mkEvent("die", [{ kind: "ejector_pin_hole", nominal: 4.80 }]),
    mkEvent("die", [{ kind: "ejector_pin_hole", nominal: 4.72 }]),
    mkEvent("extrude_punch", [{ kind: "central_oil_hole", nominal: 1.27 }]),
    mkEvent("extrude_punch", [{ kind: "central_oil_hole", nominal: 1.30 }]),
    mkEvent("extrude_punch", [{ kind: "central_oil_hole", nominal: 1.24 }]),
  ];
  const r = aggregateExtractions(events);
  assert.equal(r.classes.length, 2);
  const dieClass = r.classes.find((c) => c.part_class === "die");
  const punchClass = r.classes.find((c) => c.part_class === "extrude_punch");
  assert.equal(dieClass.n_samples, 3);
  assert.equal(punchClass.n_samples, 3);
  // Ejector pin hole: mean of [4.76, 4.80, 4.72] = 4.76
  const ejector = dieClass.features.find((f) => f.kind === "ejector_pin_hole");
  assert.ok(Math.abs(ejector.dimension_distribution.mean - 4.76) < 1e-9);
  assert.equal(ejector.prevalence, 1.0);
});

test("aggregateExtractions: prevalence = count_with_feature / total_samples_for_class", () => {
  // 4 punches: 3 with oil hole, 1 without
  const events = [
    mkEvent("extrude_punch", [{ kind: "central_oil_hole", nominal: 1.27 }]),
    mkEvent("extrude_punch", [{ kind: "central_oil_hole", nominal: 1.30 }]),
    mkEvent("extrude_punch", [{ kind: "central_oil_hole", nominal: 1.20 }]),
    mkEvent("extrude_punch", [{ kind: "bevel_face_chamfer", nominal: 0.5 }]),
  ];
  const r = aggregateExtractions(events, { minSamplesPerFeature: 1 });
  const punch = r.classes[0];
  const oilHole = punch.features.find((f) => f.kind === "central_oil_hole");
  // 3 of 4 punches have it
  assert.ok(Math.abs(oilHole.prevalence - 0.75) < 1e-9);
  assert.equal(oilHole.evidence_count, 3);
});

test("aggregateExtractions: respects minSamplesPerFeature filter (anti-spurious-stat guard)", () => {
  const events = [
    // central_oil_hole has 3 samples → passes default minSamples=3
    mkEvent("extrude_punch", [{ kind: "central_oil_hole", nominal: 1.27 }]),
    mkEvent("extrude_punch", [{ kind: "central_oil_hole", nominal: 1.30 }]),
    mkEvent("extrude_punch", [{ kind: "central_oil_hole", nominal: 1.24 }]),
    // rare_feature has only 1 sample → filtered out
    mkEvent("extrude_punch", [{ kind: "rare_feature", nominal: 99 }]),
  ];
  const r = aggregateExtractions(events);
  const punch = r.classes[0];
  assert.equal(punch.features.length, 1);
  assert.equal(punch.features[0].kind, "central_oil_hole");
});

test("aggregateExtractions: same kind appearing twice in one extraction counts as ONE prevalence hit", () => {
  // Two dimensions of same kind in one print should NOT double-count prevalence.
  const events = [
    mkEvent("die", [
      { kind: "ejector_pin_hole", nominal: 4.76 },
      { kind: "ejector_pin_hole", nominal: 4.80 },
    ]),
    mkEvent("die", [{ kind: "ejector_pin_hole", nominal: 4.72 }]),
  ];
  const r = aggregateExtractions(events, { minSamplesPerFeature: 1 });
  const die = r.classes[0];
  const ej = die.features.find((f) => f.kind === "ejector_pin_hole");
  // 2 prints, BOTH have ejector_pin_hole → prevalence = 1.0 (NOT 1.5)
  assert.equal(ej.prevalence, 1.0);
  assert.equal(ej.evidence_count, 2);
  // But dimension samples count all THREE measurements (3 different nominals)
  assert.equal(ej.dimension_distribution.n, 3);
});

test("aggregateExtractions: tolerance distribution computed correctly", () => {
  const events = [
    mkEvent("die", [{ kind: "ejector_pin_hole", nominal: 4.76, tolerance: { upper: 0.025, lower: -0.025 } }]),
    mkEvent("die", [{ kind: "ejector_pin_hole", nominal: 4.80, tolerance: { upper: 0.050, lower: -0.050 } }]),
    mkEvent("die", [{ kind: "ejector_pin_hole", nominal: 4.72, tolerance: { upper: 0.030, lower: -0.030 } }]),
  ];
  const r = aggregateExtractions(events);
  const ej = r.classes[0].features[0];
  // tolerance bands: 0.05, 0.10, 0.06 — mean = 0.07
  assert.ok(Math.abs(ej.tolerance_distribution.mean - 0.07) < 1e-9);
  assert.equal(ej.tolerance_distribution.n, 3);
});

test("aggregateExtractions: skips non-aggregatable event types", () => {
  const events = [
    { type: "drift_observation", payload: {} },
    { type: "replay_add", payload: {} },
    mkEvent("die", [{ kind: "x", nominal: 1 }]),
  ];
  const r = aggregateExtractions(events, { minSamplesPerFeature: 1 });
  assert.equal(r.classes.length, 1);
  assert.equal(r.summary.skipped.type, 2);
});

test("aggregateExtractions: skips events without part_class", () => {
  const events = [
    { type: "outcome_record", payload: { extracted: { dimensions: [{ kind: "x", nominal: 1 }] } } }, // no part_class
    mkEvent("die", [{ kind: "x", nominal: 1 }]),
  ];
  const r = aggregateExtractions(events, { minSamplesPerFeature: 1 });
  assert.equal(r.classes.length, 1);
  assert.equal(r.summary.skipped.no_class, 1);
});

test("aggregateExtractions: ADVERSARIAL — NaN nominals don't poison the mean", () => {
  const events = [
    mkEvent("die", [{ kind: "x", nominal: NaN }]),       // ignored from dim stats
    mkEvent("die", [{ kind: "x", nominal: 10 }]),
    mkEvent("die", [{ kind: "x", nominal: 20 }]),
    mkEvent("die", [{ kind: "x", nominal: 30 }]),
  ];
  const r = aggregateExtractions(events, { minSamplesPerFeature: 1 });
  const x = r.classes[0].features[0];
  // Prevalence: 4 of 4 prints had the kind (even the NaN one counts toward kind-prevalence)
  assert.equal(x.evidence_count, 4);
  // But dim distribution only saw 3 finite values: mean = 20
  assert.equal(x.dimension_distribution.n, 3);
  assert.equal(x.dimension_distribution.mean, 20);
});

test("aggregateExtractions: ADVERSARIAL — 1000-event batch doesn't crash, classes sorted by n_samples desc", () => {
  const events = [];
  for (let i = 0; i < 700; i++) events.push(mkEvent("die", [{ kind: "x", nominal: i }]));
  for (let i = 0; i < 200; i++) events.push(mkEvent("extrude_punch", [{ kind: "y", nominal: i }]));
  for (let i = 0; i < 100; i++) events.push(mkEvent("shaft", [{ kind: "z", nominal: i }]));
  const r = aggregateExtractions(events, { minSamplesPerFeature: 1 });
  assert.equal(r.classes[0].part_class, "die");
  assert.equal(r.classes[1].part_class, "extrude_punch");
  assert.equal(r.classes[2].part_class, "shaft");
  assert.equal(r.classes[0].n_samples, 700);
});

test("aggregateExtractions: classes have features sorted by prevalence desc", () => {
  const events = [
    mkEvent("die", [{ kind: "high_prev", nominal: 1 }]),
    mkEvent("die", [{ kind: "high_prev", nominal: 1 }]),
    mkEvent("die", [{ kind: "high_prev", nominal: 1 }]),
    mkEvent("die", [{ kind: "high_prev", nominal: 1 }]),
    mkEvent("die", [{ kind: "low_prev", nominal: 1 }]),
  ];
  const r = aggregateExtractions(events, { minSamplesPerFeature: 1 });
  const die = r.classes[0];
  assert.equal(die.features[0].kind, "high_prev");
  assert.equal(die.features[1].kind, "low_prev");
});

// ── parseJsonl ─────────────────────────────────────────────────────

test("parseJsonl: parses valid lines, drops malformed", () => {
  const blob = '{"type":"a"}\n{not json}\n\n{"type":"b"}\n';
  const r = parseJsonl(blob);
  assert.equal(r.length, 2);
});

test("parseJsonl: rejects non-string + arrays", () => {
  assert.deepEqual(parseJsonl(null), []);
  assert.deepEqual(parseJsonl(""), []);
  // Array JSON line should be dropped
  const r = parseJsonl('[1,2,3]\n{"type":"a"}');
  assert.equal(r.length, 1);
});

// ── templateDivergence (operator review surface) ───────────────────

test("templateDivergence: matched features ranked by divergence desc", () => {
  const learned = { features: [{ kind: "a", prevalence: 0.8 }, { kind: "b", prevalence: 0.5 }] };
  const baseline = { features: [{ kind: "a", prevalence: 0.5 }, { kind: "b", prevalence: 0.45 }] };
  const d = templateDivergence(learned, baseline);
  assert.equal(d.matched[0].kind, "a"); // 0.8 - 0.5 = 0.30 (bigger divergence)
  assert.equal(d.matched[1].kind, "b"); // 0.5 - 0.45 = 0.05
  assert.ok(Math.abs(d.matched[0].divergence - 0.30) < 1e-9);
});

test("templateDivergence: only_in_learned + only_in_baseline correctly populated", () => {
  const learned = { features: [{ kind: "a", prevalence: 0.5 }, { kind: "new_in_learned", prevalence: 0.3 }] };
  const baseline = { features: [{ kind: "a", prevalence: 0.5 }, { kind: "only_in_baseline", prevalence: 0.4 }] };
  const d = templateDivergence(learned, baseline);
  assert.deepEqual(d.only_in_learned, ["new_in_learned"]);
  assert.deepEqual(d.only_in_baseline, ["only_in_baseline"]);
});

test("templateDivergence: empty templates safe", () => {
  const d = templateDivergence({}, {});
  assert.equal(d.matched.length, 0);
  assert.equal(d.only_in_learned.length, 0);
  assert.equal(d.only_in_baseline.length, 0);
});

// ── Constants + R12 ────────────────────────────────────────────────

test("constants: AGGREGATABLE_EVENT_TYPES + defaults", () => {
  assert.ok(AGGREGATABLE_EVENT_TYPES.includes("outcome_record"));
  assert.equal(DEFAULT_MIN_SAMPLES_PER_FEATURE, 3);
});

test("R12: summary always surfaces skip counts (never silent)", () => {
  const events = [
    { type: "garbage" },
    { type: "outcome_record" }, // no payload
    { type: "outcome_record", payload: {} }, // no part_class
  ];
  const r = aggregateExtractions(events);
  assert.equal(r.summary.skipped.type, 1);
  assert.equal(r.summary.skipped.no_payload, 1);
  assert.equal(r.summary.skipped.no_class, 1);
});
