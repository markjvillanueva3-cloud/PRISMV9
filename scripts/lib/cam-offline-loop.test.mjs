/**
 * Tests for cam-offline-loop.mjs — the offline closed-loop oracle. Verifies the self-improvement
 * SIGNAL is computed correctly: op-coverage (recall vs JM's real ops), sequence fidelity, the
 * weighted score, and the missing/extra learn-targets. Concrete computed values, not stubs.
 *
 *   node --test scripts/lib/cam-offline-loop.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreGeneratedVsCorpus, buildLoopOutcome, aggregateLoopOutcomes } from "./cam-offline-loop.mjs";

const gen = (...fams) => ({ ordered_ops: fams.map((f) => ({ family: f })) });
const ref = (...fams) => ({ ops: fams.map((f) => ({ family: f })) });

test("perfect match -> score 1, coverage 1, sequence 1, no missing/extra", () => {
  const s = scoreGeneratedVsCorpus(gen("facing", "OD_roughing", "parting_cutoff"), ref("facing", "OD_roughing", "parting_cutoff"));
  assert.equal(s.op_coverage, 1);
  assert.equal(s.sequence_fidelity, 1);
  assert.equal(s.score, 1);
  assert.deepEqual(s.missing_families, []);
  assert.deepEqual(s.extra_families, []);
});

test("under-generation: missing a family JM used -> coverage<1, listed in missing", () => {
  const s = scoreGeneratedVsCorpus(gen("facing", "OD_roughing"), ref("facing", "OD_roughing", "parting_cutoff"));
  assert.equal(s.op_coverage, 0.6667); // 2/3
  assert.deepEqual(s.missing_families, ["parting_cutoff"]);
  assert.equal(s.sequence_fidelity, 1); // common pair in order
  assert.equal(s.score, 0.7667); // 0.7*0.6667 + 0.3*1
  assert.ok(s.notes.some((n) => /under-generation/.test(n)));
});

test("over-generation: extra family generation added -> listed in extra, flagged", () => {
  const s = scoreGeneratedVsCorpus(gen("facing", "OD_roughing", "chamfer"), ref("facing", "OD_roughing"));
  assert.deepEqual(s.extra_families, ["chamfer"]);
  assert.equal(s.op_coverage, 1); // covered all of JM's ops
  assert.ok(s.notes.some((n) => /over-generation/.test(n)));
});

test("sequence inversion -> Kendall concordance over common-family pairs", () => {
  // ref order facing<OD_roughing<parting; generated swaps facing/OD_roughing.
  // pairs: (OD_roughing,facing) discordant; (OD_roughing,parting) concordant; (facing,parting) concordant => 2/3.
  const s = scoreGeneratedVsCorpus(gen("OD_roughing", "facing", "parting_cutoff"), ref("facing", "OD_roughing", "parting_cutoff"));
  assert.equal(s.op_coverage, 1);
  assert.equal(s.sequence_fidelity, 0.6667);
  assert.equal(s.score, 0.9); // 0.7*1 + 0.3*0.6667
  assert.deepEqual(s.inversions, [{ before: "OD_roughing", after: "facing" }]);
  assert.ok(s.notes.some((n) => /sequence inversion/.test(n)));
});

test("REGRESSION: identical order with a re-visited family scores 1.0 (no spurious inversion)", () => {
  // The old adjacent-rank/last-wins-Map bug reported inversions here even though gen==ref.
  const seq = ["OD_roughing", "drilling_centering", "OD_roughing"]; // OD revisited (rough then re-cut)
  const s = scoreGeneratedVsCorpus(gen(...seq), ref(...seq));
  assert.equal(s.sequence_fidelity, 1, "identical sequences must score 1.0 even with a repeated family");
  assert.deepEqual(s.inversions, []);
});

test("multi-pass repeats of a family do not skew sequence (first-appearance order)", () => {
  const s = scoreGeneratedVsCorpus(gen("OD_roughing", "OD_roughing", "OD_finishing"), ref("OD_roughing", "OD_finishing"));
  assert.equal(s.op_coverage, 1);
  assert.equal(s.sequence_fidelity, 1);
});

test("empty reference -> coverage 1 but flagged (no silent perfect signal)", () => {
  const s = scoreGeneratedVsCorpus(gen("facing"), ref());
  assert.equal(s.op_coverage, 1);
  assert.ok(s.notes.some((n) => /zero ops/.test(n)), "must flag the empty-reference no-signal case");
});

test("throws on malformed input (fail-loud)", () => {
  assert.throws(() => scoreGeneratedVsCorpus({}, ref("facing")), /ordered_ops/);
  assert.throws(() => scoreGeneratedVsCorpus(gen("facing"), {}), /ops/);
});

test("buildLoopOutcome: deterministic timestamp + learn_targets from missing/extra", () => {
  const NOW = "2026-06-02T14:00:00.000Z";
  const o = buildLoopOutcome("A-11-10715-0-A", gen("facing", "OD_roughing"), ref("facing", "OD_roughing", "grooving"), NOW);
  assert.equal(o.kind, "cam_offline_loop_outcome");
  assert.equal(o.partId, "A-11-10715-0-A");
  assert.equal(o.atIso, NOW);
  assert.deepEqual(o.learn_targets.add, ["grooving"]); // under-generated -> teach the generator
  assert.equal(o.score, 0.7667);
});

test("aggregateLoopOutcomes: tallies top missing families + mean score; empty -> zeros", () => {
  const NOW = "2026-06-02T14:00:00.000Z";
  const outs = [
    buildLoopOutcome("p1", gen("facing"), ref("facing", "grooving"), NOW),            // missing grooving
    buildLoopOutcome("p2", gen("facing"), ref("facing", "grooving", "threading"), NOW), // missing grooving, threading
  ];
  const agg = aggregateLoopOutcomes(outs);
  assert.equal(agg.count, 2);
  assert.equal(agg.top_missing[0][0], "grooving"); // grooving missing in both -> ranked first
  assert.equal(agg.top_missing[0][1], 2);
  assert.ok(agg.mean_score > 0 && agg.mean_score < 1);
  assert.deepEqual(aggregateLoopOutcomes([]), { count: 0, mean_score: 0, mean_coverage: 0, top_missing: [], top_extra: [] });
});
