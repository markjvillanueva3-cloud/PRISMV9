import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseProgram,
  validateTools,
  validateConsistency,
  validatePhysics,
  scoreOperationSequence,
  aggregateQualityScore,
  extractProgramParameters,
  scorePhysicsIssues,
  parseBlocks,
  validateThreading,
} from "./lathe-quality-pipeline.mjs";

describe("parseProgram", () => {
  it("extracts T-blocks, G-codes, and CSS mode from a real .MIN snippet", () => {
    const text = [
      "O1234 (TEST PART)",
      "G50 S3000",
      "T0101 (CNMG-432-MA OD ROUGH)",
      "G96 S200 M03",
      "G00 X50 Z2",
      "G71 U2.0 R0.5",
      "G71 P100 Q200 U0.3 W0.1 F0.25",
      "N100 G00 X20",
      "N200 G00 X50",
      "T0202 (DNMG-432-PF OD FINISH)",
      "G70 P100 Q200",
      "M30",
    ].join("\n");
    const r = parseProgram(text);
    assert.equal(r.ok, true);
    assert.ok(r.tool_blocks.length >= 2);
    assert.equal(r.spindle_mode, "G96");
    assert.equal(r.spindle_value, 200);
    assert.ok(r.g_codes.includes("G71"));
    assert.ok(r.g_codes.includes("G70"));
    assert.ok(r.g_codes.includes("G96"));
    assert.ok(r.operation_sequence.includes("od_rough"));
    assert.ok(r.operation_sequence.includes("od_finish"));
  });

  it("returns ok=false for empty input", () => {
    assert.equal(parseProgram("").ok, false);
    assert.equal(parseProgram(null).ok, false);
  });

  it("detects threading via G76", () => {
    const r = parseProgram("T0303\nG97 S1000\nG76 P020060 Q100 R0.05\nG76 X19.0 Z-30 P1300 Q400 F2.0\n");
    assert.ok(r.operation_sequence.includes("od_thread"));
  });
});

describe("validateTools", () => {
  it("finds CNMG + WNMG codes in program text", () => {
    const text = "T0101 CNMG-432-MA\nT0202 WNMG-431-PF\nM30";
    const r = validateTools(text, null);
    assert.ok(r.insertsFound.includes("CNMG"));
    assert.ok(r.insertsFound.includes("WNMG"));
  });

  it("emits suggestion when program has no explicit insert codes", () => {
    const r = validateTools("T0101 (OD ROUGH)\nT0202 (FINISH)\nM30", null);
    assert.ok(r.issues.some(i => i.issue === "no-explicit-insert-codes"));
  });

  it("returns empty for null program text", () => {
    const r = validateTools("", null);
    assert.equal(r.insertsFound.length, 0);
  });
});

describe("validateConsistency", () => {
  it("emits info for known (op, iso) pair when master index is provided", () => {
    const parsed = { ok: true, operation_sequence: ["od_rough"] };
    const masterIndex = {
      wizard_query_records: [
        { query_keys: ["od_rough", "M", "stainless general"], first_choice: "AH725", alternatives: ["KCM25"], rationale: "test" },
      ],
    };
    const r = validateConsistency(parsed, "M", masterIndex);
    assert.equal(r.issues.length, 1);
    assert.equal(r.issues[0].recommended_first_choice, "AH725");
  });

  it("returns empty when master index missing", () => {
    const parsed = { ok: true, operation_sequence: ["od_rough"] };
    const r = validateConsistency(parsed, "M", null);
    assert.equal(r.issues.length, 0);
  });
});

describe("extractProgramParameters", () => {
  it("extracts G50 RPM cap + G96 CSS + G71 DOC + feed-per-rev from metric program", () => {
    const text = "G21\nG50 S3000\nG96 S180 M03\nG71 U2.5 R0.5\nG71 P10 Q20 U0.3 W0.1 F0.25\nM30";
    const p = extractProgramParameters(text);
    assert.equal(p.rpm_cap, 3000);
    assert.equal(p.css_m_min, 180);
    assert.equal(p.css_units, "m/min");
    assert.equal(p.doc_mm, 2.5);
    assert.equal(p.feed_per_rev, 0.25);
  });

  it("converts inch program to metric (G20 + sfm + ipr)", () => {
    const text = "G20\nG50 S2500\nG96 S400 M03\nG71 U0.05 R0.02\nF0.012\nM30";
    const p = extractProgramParameters(text);
    assert.equal(p.css_units, "sfm");
    assert.ok(p.css_m_min > 100 && p.css_m_min < 130);  // 400 sfm ≈ 122 m/min
    assert.ok(p.doc_mm > 1.2 && p.doc_mm < 1.3);         // 0.05" ≈ 1.27 mm
    assert.ok(p.feed_per_rev > 0.29 && p.feed_per_rev < 0.31);  // 0.012 ipr ≈ 0.30 mm/rev
  });

  it("returns empty object for non-string input", () => {
    assert.deepEqual(extractProgramParameters(null), {});
    assert.deepEqual(extractProgramParameters(""), {});
  });
});

describe("validatePhysics with deviation detection", () => {
  const priors = {
    priors: [{
      tool_type: "od_rough",
      param_ranges: { doc_mm: [1, 5], feed_mm_rev: [0.15, 0.35], rpm: [0, 3000] },
      physics_basis: "academy/course-5/mod-1: OD Roughing",
    }],
  };

  it("emits info when program value is well inside range", () => {
    const parsed = { ok: true, operation_sequence: ["od_rough"] };
    const r = validatePhysics(parsed, "P", priors, { doc_mm: 3.0, feed_per_rev: 0.25 });
    const docIssue = r.issues.find(i => i.parameter === "doc_mm");
    assert.equal(docIssue.severity, "info");
    assert.equal(docIssue.issue, "value-within-range");
  });

  it("emits warning when program value exceeds expected range by 10-50%", () => {
    const parsed = { ok: true, operation_sequence: ["od_rough"] };
    // DOC 6.5mm against [1,5] = 30% over
    const r = validatePhysics(parsed, "P", priors, { doc_mm: 6.5 });
    const docIssue = r.issues.find(i => i.parameter === "doc_mm");
    assert.equal(docIssue.severity, "warning");
    assert.equal(docIssue.issue, "above-expected-range");
    assert.ok(docIssue.deviation_pct >= 25);
  });

  it("emits critical when program value deviates >50%", () => {
    const parsed = { ok: true, operation_sequence: ["od_rough"] };
    const r = validatePhysics(parsed, "P", priors, { doc_mm: 8.0 });  // 60% over [1,5]
    const docIssue = r.issues.find(i => i.parameter === "doc_mm");
    assert.equal(docIssue.severity, "critical");
  });

  it("emits suggestion when value is at extreme of range (top 10%)", () => {
    const parsed = { ok: true, operation_sequence: ["od_rough"] };
    const r = validatePhysics(parsed, "P", priors, { feed_per_rev: 0.34 });  // close to 0.35 max
    const feedIssue = r.issues.find(i => i.parameter === "feed_mm_rev");
    assert.equal(feedIssue.severity, "suggestion");
    assert.equal(feedIssue.issue, "value-at-extreme-of-range");
  });

  it("emits info when no program value available", () => {
    const parsed = { ok: true, operation_sequence: ["od_rough"] };
    const r = validatePhysics(parsed, "P", priors, {});
    const issue = r.issues.find(i => i.issue === "no-program-value-to-compare");
    assert.ok(issue);
  });

  it("returns empty when priors missing", () => {
    const r = validatePhysics({ ok: true, operation_sequence: ["od_rough"] }, "P", null, {});
    assert.equal(r.issues.length, 0);
  });
});

describe("scorePhysicsIssues severity weighting", () => {
  it("perfect 100 when no issues", () => {
    assert.equal(scorePhysicsIssues([{ severity: "info" }, { severity: "info" }]), 100);
  });

  it("deducts 25 per critical", () => {
    assert.equal(scorePhysicsIssues([{ severity: "critical" }, { severity: "critical" }]), 50);
  });

  it("deducts 10 per warning", () => {
    assert.equal(scorePhysicsIssues([{ severity: "warning" }, { severity: "warning" }, { severity: "warning" }]), 70);
  });

  it("deducts 3 per suggestion", () => {
    assert.equal(scorePhysicsIssues([{ severity: "suggestion" }, { severity: "suggestion" }]), 94);
  });

  it("clamps to 0 minimum (heavy critical load)", () => {
    const issues = Array.from({ length: 10 }, () => ({ severity: "critical" }));
    assert.equal(scorePhysicsIssues(issues), 0);
  });

  it("returns 50 for empty/invalid input (no priors → neutral)", () => {
    assert.equal(scorePhysicsIssues([]), 50);
    assert.equal(scorePhysicsIssues(null), 50);
  });
});

describe("scoreOperationSequence", () => {
  it("gives perfect score for canonical order", () => {
    const r = scoreOperationSequence({ ok: true, operation_sequence: ["face", "od_rough", "od_finish", "od_thread", "cutoff"] });
    assert.equal(r.score, 100);
    assert.equal(r.inversions, 0);
  });

  it("penalizes inverted order (thread before rough)", () => {
    const r = scoreOperationSequence({ ok: true, operation_sequence: ["od_thread", "od_rough"] });
    assert.ok(r.score < 100);
    assert.ok(r.inversions >= 1);
  });

  it("handles empty sequence gracefully", () => {
    const r = scoreOperationSequence({ ok: true, operation_sequence: [] });
    assert.equal(r.score, 50);
  });
});

describe("aggregateQualityScore", () => {
  it("weights and renormalizes when some stages skipped", () => {
    const r = aggregateQualityScore({
      tool_validation: 80,
      consistency:     75,
      physics:         70,
      sequence:        100,
      // stability/deflection/chip_control/post intentionally absent
    });
    // weighted = (80*.20 + 75*.20 + 70*.20 + 100*.10) / (.20+.20+.20+.10)
    //         = (16 + 15 + 14 + 10) / .70 = 55 / .70 ≈ 78.57 → 79
    assert.ok(r.score >= 78 && r.score <= 80);
    assert.equal(r.breakdown.stability.skipped, true);
  });

  it("returns null when every stage skipped", () => {
    const r = aggregateQualityScore({});
    assert.equal(r.score, null);
  });

  it("clamps scores to [0, 100]", () => {
    const r = aggregateQualityScore({ tool_validation: 150, consistency: -20 });
    assert.ok(r.breakdown.tool_validation.score === 100);
    assert.ok(r.breakdown.consistency.score === 0);
  });
});

describe("integration — full mini-pipeline on synthetic .MIN", () => {
  it("runs all stages on a realistic snippet without error", () => {
    const text = [
      "O5001 (FONTANA-PIN-LATHE-PROG)",
      "G50 S3500",
      "T0101 (CNMG-432-MA OD ROUGH)",
      "G96 S180 M03",
      "G00 X52 Z2",
      "G71 U2.5 R0.5",
      "G71 P10 Q20 U0.4 W0.1 F0.30",
      "N10 G00 X22",
      "N20 G00 X52",
      "T0202 (DNMG-431-PF OD FINISH)",
      "G70 P10 Q20",
      "T0303 (THREADING)",
      "G97 S1200",
      "G76 P020060 Q100 R0.05",
      "M30",
    ].join("\n");
    const parsed = parseProgram(text);
    const tools = validateTools(text, null);
    const seq = scoreOperationSequence(parsed);
    const agg = aggregateQualityScore({
      tool_validation: tools.insertsFound.length > 0 ? 80 : 50,
      sequence: seq.score,
    });
    assert.equal(parsed.ok, true);
    assert.ok(tools.insertsFound.length >= 2);
    assert.ok(seq.score >= 75);  // canonical-ish order
    assert.ok(typeof agg.score === "number" && agg.score >= 70);
  });
});

describe("parseBlocks", () => {
  it("extracts G-code + X/Z/P/Q/F args per line", () => {
    const text = "G50 S3200\nG96 S180 M03\nG76 X28.0 Z-25.0 P1300 Q300 F2.0";
    const blocks = parseBlocks(text);
    assert.equal(blocks.length, 3);
    assert.equal(blocks[0].g, "G50");
    assert.equal(blocks[2].g, "G76");
    assert.equal(blocks[2].x, 28.0);
    assert.equal(blocks[2].z, -25.0);
    assert.equal(blocks[2].p, 1300);
    assert.equal(blocks[2].f, 2.0);
  });

  it("returns empty array for non-string input", () => {
    assert.deepEqual(parseBlocks(null), []);
    assert.deepEqual(parseBlocks(undefined), []);
    assert.deepEqual(parseBlocks(42), []);
  });

  // iter265: locks in fix for parenthesized-comment G-code contamination.
  // See [[reference_iter218_alcoa_outlier_retraction_2026_05_27]] for the bug story.
  it("ignores G-codes inside parenthesized comments (iter265 regression)", () => {
    const text = "(  rationale: HSSco TiAlN; uses G81 drill cycle reference)\nG0 X20 Z20\nT010101";
    const blocks = parseBlocks(text);
    const gcodes = [...new Set(blocks.filter(b => b.g).map(b => b.g))];
    assert.deepEqual(gcodes, ["G00"], "G81 inside parens must NOT be parsed as a real G-code");
  });

  it("ignores X/Z args inside parenthesized comments (iter265 regression)", () => {
    const text = "(safety note: clear of X-20 Z-50)\nG0 X10 Z5";
    const blocks = parseBlocks(text);
    assert.equal(blocks[0].g, undefined, "comment-only line must have no g");
    assert.equal(blocks[0].x, undefined, "X inside parens must NOT be parsed");
    assert.equal(blocks[1].x, 10, "real X arg must still be parsed");
    assert.equal(blocks[1].z, 5);
  });

  it("ignores multiple parenthesized comments per line (iter272 regression)", () => {
    const text = "G0 X10 (positioning rapid) (using G81 elsewhere) Z5";
    const blocks = parseBlocks(text);
    assert.equal(blocks[0].g, "G00", "G0 outside parens must parse");
    assert.equal(blocks[0].x, 10, "X outside parens must parse");
    assert.equal(blocks[0].z, 5, "Z outside parens must parse");
  });
});

describe("validateThreading (G76 sub-validator wired to pipeline)", () => {
  it("clean Fanuc G76 thread on steel passes all rules", () => {
    const text = [
      "G50 S3200",
      "T0303 M06",
      "G96 S180 M03",
      "G99",
      "G00 X32.0 Z2.0",
      "G76 P020060 Q50 R0.003",
      "G76 X28.0 Z-25.0 P1300 Q300 F2.0",
      "G00 X100.0 Z100.0",
    ].join("\n");
    const r = validateThreading(text, { controller: "fanuc", iso_group: "P", material_grade: "AISI-1045" });
    assert.equal(r.all_passed, true);
    assert.equal(r.thread_block_count, 1);
    assert.equal(r.issues.length, 0);
  });

  it("flags G98 (feed/min) + G76 as critical via pipeline severity mapping", () => {
    const text = "G50 S3200\nG96 S180 M03\nG98\nG76 X28.0 Z-25.0 P1300 Q300 F2.0";
    const r = validateThreading(text, { controller: "haas", iso_group: "P" });
    assert.equal(r.all_passed, false);
    assert.ok(r.issues.some(i => i.severity === "critical" && /feed_mode/.test(i.issue)));
  });

  it("flags G92 deprecated as warning via pipeline severity mapping", () => {
    const text = "G50 S3200\nG99\nG92 X28.0 Z-25.0 F2.0";
    const r = validateThreading(text, { controller: "fanuc", iso_group: "P" });
    assert.ok(r.issues.some(i => i.severity === "warning" && /G92/.test(i.issue)));
  });

  it("operation tag is od_thread + physics_basis populated for all issues", () => {
    const text = "G50 S3200\nG96 S180 M03\nG98\nG76 X28.0 Z-25.0 P3000 Q300 F2.0";
    const r = validateThreading(text, { controller: "haas", iso_group: "P" });
    for (const issue of r.issues) {
      assert.equal(issue.operation, "od_thread");
      assert.equal(issue.physics_basis, "G76-thread-validator-rules-1-6-7");
    }
  });
});
