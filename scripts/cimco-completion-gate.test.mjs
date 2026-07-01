#!/usr/bin/env node
/**
 * Tests for the CIMCO "real, complete run" gate (U-CIMCO-SIM-5).
 *
 * R9 — each test encodes WHY: the §E2/§E4 doctrine is that a clean report is
 * worthless if the sim did not OBSERVABLY finish the WHOLE program with no error
 * modal. Every gate is fail-CLOSED; the dangerous case is a partial/early-stopped
 * run reading as "complete". Happy path + every fail-CLOSED path + adversarial.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countNcProgram,
  assessSimCompletion,
  assessReportQuiescence,
  assessLineCoverage,
  classifyModal,
  assessRunCompleteness,
} from "./cimco-completion-gate.mjs";

// ── countNcProgram ───────────────────────────────────────────────────
test("countNcProgram: counts real blocks, excludes comments / blanks / % markers", () => {
  const nc = "%\nO1234 (PART NAME)\nN10 G21 G90\nN20 G0 X0 Y0\n( comment only )\n\nN30 G1 X5. F100\n;eol comment\nN40 M30\n%";
  const c = countNcProgram(nc);
  assert.equal(c.blocks, 5, "O1234 + N10 + N20 + N30 + N40 = 5 (comment-only line, blank, and % excluded)");
  assert.equal(c.lastLineNumber, 40);
  assert.ok(c.lines >= 5);
});

test("countNcProgram: inline comment after code still counts the block", () => {
  const c = countNcProgram("N10 G1 X1. (plunge)\nN20 G0 Z5.");
  assert.equal(c.blocks, 2);
});

test("countNcProgram: empty / whitespace / pure-comment program → 0 blocks (fail-CLOSED for coverage)", () => {
  assert.equal(countNcProgram("").blocks, 0);
  assert.equal(countNcProgram("   \n\n  ").blocks, 0);
  assert.equal(countNcProgram("(only)\n( comments )\n%").blocks, 0);
});

// ── assessSimCompletion (observed, not a timer) ──────────────────────
test("assessSimCompletion: ≥2 corroborating signals → complete", () => {
  assert.equal(assessSimCompletion({ progressPct: 100, runReEnabled: true }).complete, true);
  assert.equal(assessSimCompletion({ distanceCovered: 10, distanceTotal: 10, terminalModalPresent: true }).complete, true);
});

test("assessSimCompletion: a SINGLE signal is NOT complete (could be a glitch/pause)", () => {
  assert.equal(assessSimCompletion({ progressPct: 100 }).complete, false);
  assert.equal(assessSimCompletion({ runReEnabled: true }).complete, false);
  const r = assessSimCompletion({ progressPct: 100 });
  assert.equal(r.signalCount, 1);
});

test("assessSimCompletion: NO time input — an empty snapshot is never complete (no timer ever clears)", () => {
  assert.equal(assessSimCompletion({}).complete, false);
  assert.equal(assessSimCompletion(null).complete, false);
  assert.equal(assessSimCompletion({ elapsedMs: 999999 }).complete, false, "elapsed time is not a signal");
});

test("assessSimCompletion: distance signal requires total>0 AND covered>=total", () => {
  assert.equal(assessSimCompletion({ distanceCovered: 5, distanceTotal: 10, progressPct: 100 }).signals.includes("distance-covered==total"), false);
  assert.equal(assessSimCompletion({ distanceCovered: 0, distanceTotal: 0, progressPct: 100, runReEnabled: true }).complete, true, "zero-distance ignored, other 2 signals carry");
});

// ── assessReportQuiescence ───────────────────────────────────────────
test("assessReportQuiescence: two equal reads → quiescent; differing reads → not", () => {
  const rows = [{ line: 5, type: "Collision", description: "x", action: "stop" }];
  assert.equal(assessReportQuiescence(rows, [{ line: 5, type: "Collision", description: "x", action: "stop" }]).quiescent, true);
  assert.equal(assessReportQuiescence([], rows).quiescent, false, "a report that grew between reads is still settling");
});

test("assessReportQuiescence: a null read can NEVER confirm quiescence (fail-CLOSED)", () => {
  assert.equal(assessReportQuiescence(null, []).quiescent, false);
  assert.equal(assessReportQuiescence([], null).quiescent, false);
});

test("assessReportQuiescence: canonicalizes whitespace/shape (equal-after-trim is quiescent)", () => {
  assert.equal(assessReportQuiescence(["  L5 | Collision  "], ["L5 | Collision"]).quiescent, true);
});

// ── assessLineCoverage ───────────────────────────────────────────────
test("assessLineCoverage: full coverage when simulated blocks >= source", () => {
  assert.equal(assessLineCoverage({ blocks: 5 }, { blocks: 5 }).covered, true);
  assert.equal(assessLineCoverage({ blocks: 6 }, { blocks: 5 }).covered, true);
});

test("assessLineCoverage: PARTIAL run (sim stopped early) → not covered + shortfall", () => {
  const r = assessLineCoverage({ blocks: 3 }, { blocks: 5 });
  assert.equal(r.covered, false);
  assert.equal(r.shortfall, 2);
});

test("assessLineCoverage: gross overcount (>2× — runaway loop) is refused, not silently clean", () => {
  assert.equal(assessLineCoverage({ blocks: 11 }, { blocks: 5 }).covered, false);
});

test("assessLineCoverage: missing/zero counts fail CLOSED", () => {
  assert.equal(assessLineCoverage({}, { blocks: 5 }).covered, false);
  assert.equal(assessLineCoverage({ blocks: 5 }, { blocks: 0 }).covered, false);
});

// ── classifyModal (§E4 error-dialog watcher) ─────────────────────────
test("classifyModal: error/collision modal during run is BLOCKING", () => {
  assert.equal(classifyModal({ title: "Error", text: "collision detected" }).blocking, true);
  assert.equal(classifyModal({ text: "Axis over-travel" }).blocking, true);
  assert.equal(classifyModal({ title: "Exception" }).blocking, true);
});

test("classifyModal: an UNKNOWN modal is BLOCKING (not provably benign)", () => {
  assert.equal(classifyModal({ title: "Mystery Dialog" }).blocking, true);
  assert.equal(classifyModal({ title: "", text: "" }).blocking, true, "empty modal text cannot be proven benign");
});

test("classifyModal: affirmatively-benign + warning modals are non-blocking; no modal is fine", () => {
  assert.equal(classifyModal({ title: "Simulation Complete" }).blocking, false);
  assert.equal(classifyModal({ title: "Warning", text: "tool near limit" }).blocking, false);
  assert.equal(classifyModal(null).blocking, false);
});

// ── assessRunCompleteness (§E2+§E4 combined gate) ────────────────────
const good = () => ({
  completion: assessSimCompletion({ progressPct: 100, runReEnabled: true }),
  quiescence: assessReportQuiescence([], []),
  coverage: assessLineCoverage({ blocks: 5 }, { blocks: 5 }),
  modal: classifyModal(null),
});

test("assessRunCompleteness: all four gates pass → runComplete", () => {
  const r = assessRunCompleteness(good());
  assert.equal(r.runComplete, true);
  assert.equal(r.blockers.length, 0);
});

test("assessRunCompleteness: a CLEAN report on a PARTIAL run is NOT runComplete (the core danger)", () => {
  const r = assessRunCompleteness({ ...good(), coverage: assessLineCoverage({ blocks: 3 }, { blocks: 5 }) });
  assert.equal(r.runComplete, false);
  assert.ok(r.blockers.some((b) => b.includes("coverage-incomplete")));
});

test("assessRunCompleteness: not-observed-complete blocks even with full coverage + clean modal", () => {
  const r = assessRunCompleteness({ ...good(), completion: assessSimCompletion({ progressPct: 100 }) }); // 1 signal
  assert.equal(r.runComplete, false);
  assert.ok(r.blockers.some((b) => b.includes("sim-not-observed-complete")));
});

test("assessRunCompleteness: a blocking error modal vetoes an otherwise-complete run", () => {
  const r = assessRunCompleteness({ ...good(), modal: classifyModal({ title: "Error", text: "collision" }) });
  assert.equal(r.runComplete, false);
  assert.ok(r.blockers.some((b) => b.includes("blocking-modal")));
});

test("assessRunCompleteness: empty input fails CLOSED on the 3 AFFIRMATIVE gates (modal-absence is correctly NOT a blocker)", () => {
  // The asymmetry matters: completion/quiescence/coverage each need affirmative
  // evidence the run finished, so their absence blocks. A modal is only present
  // when an error dialog pops — its ABSENCE is the §E4 pass condition (matches
  // classifyModal(null)), so it must NOT manufacture a 4th blocker.
  const r = assessRunCompleteness({});
  assert.equal(r.runComplete, false);
  assert.equal(r.blockers.length, 3);
  assert.ok(r.blockers.some((b) => b.includes("sim-not-observed-complete")));
  assert.ok(r.blockers.some((b) => b.includes("report-not-quiescent")));
  assert.ok(r.blockers.some((b) => b.includes("coverage-incomplete")));
  assert.ok(!r.blockers.some((b) => b.includes("blocking-modal")), "no modal observed ⇒ not a blocker");
});

// ── ADVERSARIAL ──────────────────────────────────────────────────────
test("ADVERSARIAL: a non-quiescent report whose two reads happen to both be 'clean' is still not complete", () => {
  // read1 empty (collision not yet written), read2 has the collision — the danger of reading too early.
  const r = assessRunCompleteness({ ...good(), quiescence: assessReportQuiescence([], [{ line: 7, type: "Collision" }]) });
  assert.equal(r.runComplete, false);
  assert.ok(r.blockers.some((b) => b.includes("report-not-quiescent")));
});
