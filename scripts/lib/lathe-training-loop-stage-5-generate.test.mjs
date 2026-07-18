// Hermetic tests for U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (Stage 5: GENERATE)
// Design memo: reference_lathe_training_loop_stages_1_5_design_2026_05_27
//
// runStage5_Generate(originalProgram, reasonReport, ctx) → ProposedProgram
//
// ProposedProgram contains:
//   text, diff_from_original, changes_applied[], estimated_new_score,
//   unapplied_recommendations[], needs_operator_review
//
// Run: node --test scripts/lib/lathe-training-loop-stage-5-generate.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runStage5_Generate } from "./lathe-training-loop-stage-5-generate.mjs";

const AMATEUR_PROGRAM = `% O1234
G99
T0101 M06
G96 S180 M03
G00 X32.0 Z2.0
G71 U2.0 R0.5
G71 P10 Q20 U0.02 W0.005 F0.020
N10 G00 X20.0 Z0.1
N20 G01 X28.0 Z-25.0
G92 X28.0 Z-25.0 F2.0
G00 X100.0 Z100.0
M30
%`;

const REASON_REPORT_FULL = {
  current_score: 44,
  target_score: 87,
  expected_delta_score: 43,
  confidence: 0.75,
  improvement_recommendations: [
    {
      category: "safety",
      severity: "P0",
      what: "Add G50 max-RPM cap before G96 CSS mode",
      why: "G96 can over-rev at small diameters",
      delta_score: 12,
      lever: "structural_safety_gate"
    },
    {
      category: "canned_cycle",
      severity: "P1",
      what: "Replace G92 single-pass threading with G76 canned cycle",
      why: "G76 handles multi-pass + chamfer in one block",
      delta_score: 8,
      lever: "structural_cycle_substitution"
    },
    {
      category: "canned_cycle",
      severity: "P1",
      what: "Add G70 finish-pass after G71 roughing",
      why: "G71 leaves finish stock; G70 follows profile at finish feed",
      delta_score: 10,
      lever: "structural_finish_pass"
    }
  ]
};

const CTX = { controller: "fanuc", iso_group: "P-30" };

describe("runStage5_Generate — core API", () => {
  it("returns a ProposedProgram with the documented shape", () => {
    const r = runStage5_Generate(AMATEUR_PROGRAM, REASON_REPORT_FULL, CTX);
    assert.equal(typeof r.text, "string");
    assert.equal(typeof r.diff_from_original, "string");
    assert.ok(Array.isArray(r.changes_applied));
    assert.equal(typeof r.estimated_new_score, "number");
    assert.ok(Array.isArray(r.unapplied_recommendations));
    assert.equal(typeof r.needs_operator_review, "boolean");
  });
});

describe("runStage5_Generate — applies safety G50 cap before G96", () => {
  it("inserts G50 line before G96 when reasonReport has safety-gate recommendation", () => {
    const r = runStage5_Generate(AMATEUR_PROGRAM, REASON_REPORT_FULL, CTX);
    const g50Idx = r.text.indexOf("G50");
    const g96Idx = r.text.indexOf("G96");
    assert.ok(g50Idx >= 0, "G50 should be inserted");
    assert.ok(g50Idx < g96Idx, "G50 must come BEFORE G96");
    assert.ok(r.changes_applied.some(c => /safety_gate/.test(c.lever)));
  });
});

describe("runStage5_Generate — applies G92→G76 substitution", () => {
  it("replaces G92 line with G76 cycle when reasonReport has cycle-substitution recommendation", () => {
    const r = runStage5_Generate(AMATEUR_PROGRAM, REASON_REPORT_FULL, CTX);
    assert.ok(r.text.includes("G76"), "G76 should appear in output");
    assert.ok(!r.text.includes("G92 X28.0 Z-25.0"), "G92 thread block should be removed");
    assert.ok(r.changes_applied.some(c => /cycle_substitution/.test(c.lever)));
  });
});

describe("runStage5_Generate — applies G70 finish-pass insertion", () => {
  it("adds G70 block after G71 when reasonReport has finish-pass recommendation", () => {
    const r = runStage5_Generate(AMATEUR_PROGRAM, REASON_REPORT_FULL, CTX);
    assert.ok(r.text.includes("G70"), "G70 should be inserted");
    assert.ok(r.changes_applied.some(c => /finish_pass/.test(c.lever)));
  });
});

describe("runStage5_Generate — estimated_new_score + diff", () => {
  it("estimated_new_score equals current + delta when all recs applied", () => {
    const r = runStage5_Generate(AMATEUR_PROGRAM, REASON_REPORT_FULL, CTX);
    assert.equal(r.estimated_new_score, REASON_REPORT_FULL.current_score + REASON_REPORT_FULL.expected_delta_score);
  });

  it("diff_from_original is non-empty when changes applied", () => {
    const r = runStage5_Generate(AMATEUR_PROGRAM, REASON_REPORT_FULL, CTX);
    assert.ok(r.diff_from_original.length > 0);
  });
});

describe("runStage5_Generate — line-ending preservation (iter148 regression)", () => {
  it("preserves CRLF line endings when original program is Windows-style", () => {
    const crlfProgram = AMATEUR_PROGRAM.replace(/\n/g, "\r\n");
    const r = runStage5_Generate(crlfProgram, REASON_REPORT_FULL, CTX);
    assert.ok(r.text.includes("\r\n"), "output should retain CRLF");
    // Original char count should be preserved within the lines that weren't changed
    const originalLineCount = crlfProgram.split(/\r\n/).length;
    const newLineCount = r.text.split(/\r\n/).length;
    // Output may have additional lines from G50/G70 insertions; should never drop lines
    assert.ok(newLineCount >= originalLineCount);
  });

  it("preserves LF line endings when original program is Unix-style", () => {
    const lfProgram = AMATEUR_PROGRAM;  // already LF
    const r = runStage5_Generate(lfProgram, REASON_REPORT_FULL, CTX);
    assert.ok(!r.text.includes("\r\n"), "LF-only input should produce LF-only output");
    assert.ok(r.text.includes("\n"), "still uses LF separators");
  });

  it("clean program (no changes) round-trips byte-exact for CRLF input", () => {
    const crlfProgram = AMATEUR_PROGRAM.replace(/\n/g, "\r\n");
    const r = runStage5_Generate(
      crlfProgram,
      { current_score: 85, target_score: 85, expected_delta_score: 0, confidence: 1.0, improvement_recommendations: [] },
      CTX
    );
    assert.equal(r.text, crlfProgram, "byte-exact round-trip when no changes applied");
  });

  it("mixed-eol input with unapplied-only recommendations round-trips byte-exact (iter154 regression)", () => {
    // Simulate a file with mixed LF/CRLF that has only tooling recommendations (unautomatable).
    const mixedEolProgram = "G99\r\nT0101 M06\nG96 S180 M03\r\nG00 X32.0 Z2.0\nM30";
    const onlyUnapplicable = {
      current_score: 40,
      target_score: 55,
      expected_delta_score: 15,
      confidence: 0.5,
      improvement_recommendations: [
        {
          category: "tooling",
          severity: "P0",
          lever: "tooling_documentation",  // no applier in LEVER_APPLIERS
          delta_score: 15,
          what: "Document insert in T01 preamble",
          why: "amateur — no insert documented"
        }
      ]
    };
    const r = runStage5_Generate(mixedEolProgram, onlyUnapplicable, CTX);
    assert.equal(r.text, mixedEolProgram, "byte-exact when no levers fire even with mixed-eol input");
    assert.equal(r.changes_applied.length, 0);
    assert.equal(r.unapplied_recommendations.length, 1);
    assert.equal(r.diff_from_original, "");
  });
});

describe("runStage5_Generate — unapplied + R12", () => {
  it("records unapplied recommendations when wizard can't auto-apply", () => {
    const reasonWithUnautomatable = {
      current_score: 50,
      target_score: 60,
      expected_delta_score: 10,
      confidence: 0.7,
      improvement_recommendations: [
        {
          category: "tooling",
          severity: "P1",
          what: "Operator-confirm insert for T0303 — wizard had no high-confidence pick",
          why: "selectInsert raised: no candidate scored",
          delta_score: 0,
          lever: "tooling_documentation"
        }
      ]
    };
    const r = runStage5_Generate(AMATEUR_PROGRAM, reasonWithUnautomatable, CTX);
    assert.ok(r.unapplied_recommendations.length >= 1);
    assert.equal(r.needs_operator_review, true);
  });

  it("returns input unchanged for empty reasonReport (clean program)", () => {
    const r = runStage5_Generate(AMATEUR_PROGRAM, { current_score: 85, target_score: 85, expected_delta_score: 0, confidence: 1.0, improvement_recommendations: [] }, CTX);
    assert.equal(r.text, AMATEUR_PROGRAM);
    assert.equal(r.changes_applied.length, 0);
    assert.equal(r.diff_from_original, "");
  });

  it("throws when reasonReport missing", () => {
    assert.throws(() => runStage5_Generate(AMATEUR_PROGRAM, null, CTX), /reasonReport/i);
  });
});
