// Stage 4 + Stage 5 pipeline integration test
// Proves: amateur program → REASON → GENERATE → improved program
// with measurable quality lift from current_score to estimated_new_score.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBlocks, validateThreading } from "../lathe-quality-pipeline.mjs";
import { createBridge } from "./lathe-shop-tool-library-bridge.mjs";
import { createTribalQueryEngine } from "./lathe-tribal-query-engine.mjs";
import { createInsertSelector } from "./lathe-wizard-vendor-lookup.mjs";
import { runStage4_Reason } from "./lathe-training-loop-stage-4-reason.mjs";
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

const SHOP_INVENTORY = {
  ALCOA: {
    "*": {
      T0101: { insertAnsi: "CNMG-432-PR", vendor: "Kennametal", grade: "KCM35", geometry: "C", iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, coating: "PVD-TiAlN" }
    }
  }
};

const CORPUS = {
  vendor_grades: [
    { vendor: "Kennametal", grade: "KCM35", insertAnsi: "CNMG-432-PR", geometry: "C", coating: "PVD-TiAlN", iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, best_application: "roughing" }
  ],
  video_segments: [],
  tribal_tips: []
};

const PART_SPEC = {
  customer: "ALCOA",
  iso_group: "P-30",
  material: "AISI-1045",
  operations: ["roughing", "finishing", "threading"]
};

const CTX = { controller: "fanuc", iso_group: "P-30" };

describe("Stage 4 + Stage 5 full pipeline — amateur to improved program", () => {
  function buildEngines() {
    const bridge = createBridge({ layer1: SHOP_INVENTORY });
    const queryEngine = createTribalQueryEngine(CORPUS);
    const selector = createInsertSelector({ queryEngine, bridge });
    return { bridge, queryEngine, selector };
  }

  it("amateur program produces a non-empty ReasonReport", () => {
    const engines = buildEngines();
    const threadReport = validateThreading(AMATEUR_PROGRAM, CTX);
    const parsedBlocks = parseBlocks(AMATEUR_PROGRAM);
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: ["od_rough", "od_thread"],
        g_codes: parsedBlocks.filter(b => b.g).map(b => b.g),
        spindle_mode: "G96",
        spindle_value: 180,
        tool_blocks: [{ tool_number: 1, offset: 1 }]
      },
      threadIssues: threadReport.issues,
      currentScore: 44,
      toolsValidated: false
    };
    const reasonReport = runStage4_Reason(programReport, PART_SPEC, engines);

    assert.ok(reasonReport.improvement_recommendations.length >= 3, "should surface 3+ recommendations");
    assert.ok(reasonReport.expected_delta_score >= 20, "expected lift should be substantial");
    const categories = new Set(reasonReport.improvement_recommendations.map(r => r.category));
    assert.ok(categories.has("safety"), "safety recommendation");
    assert.ok(categories.has("canned_cycle"), "canned_cycle recommendation");
    assert.ok(categories.has("tooling"), "tooling recommendation");
  });

  it("Stage 5 applies safety + cycle + finish-pass levers from Stage 4 report", () => {
    const engines = buildEngines();
    const threadReport = validateThreading(AMATEUR_PROGRAM, CTX);
    const parsedBlocks = parseBlocks(AMATEUR_PROGRAM);
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: ["od_rough", "od_thread"],
        g_codes: parsedBlocks.filter(b => b.g).map(b => b.g),
        spindle_mode: "G96",
        spindle_value: 180,
        tool_blocks: [{ tool_number: 1, offset: 1 }]
      },
      threadIssues: threadReport.issues,
      currentScore: 44,
      toolsValidated: false
    };
    const reasonReport = runStage4_Reason(programReport, PART_SPEC, engines);
    const proposed = runStage5_Generate(AMATEUR_PROGRAM, reasonReport, CTX);

    // Safety gate
    assert.ok(proposed.text.includes("G50"), "should add G50 cap");
    const g50Idx = proposed.text.indexOf("G50");
    const g96Idx = proposed.text.indexOf("G96");
    assert.ok(g50Idx < g96Idx, "G50 before G96");

    // Cycle substitution
    assert.ok(proposed.text.includes("G76"), "should add G76");
    assert.ok(!proposed.text.includes("G92 X28.0 Z-25.0"), "G92 thread removed");

    // Finish pass
    assert.ok(proposed.text.includes("G70 P10 Q20"), "G70 finish-pass inserted");

    // Score lift
    assert.ok(proposed.estimated_new_score > 44, "score should lift from baseline 44");

    // Tooling rec is unautomatable in current applier set → goes to operator review
    assert.ok(proposed.needs_operator_review === true);
    assert.ok(proposed.unapplied_recommendations.some(r => r.category === "tooling"));
  });

  it("improved program has fewer thread issues than original (re-validation)", () => {
    const engines = buildEngines();
    const threadReport = validateThreading(AMATEUR_PROGRAM, CTX);
    const parsedBlocks = parseBlocks(AMATEUR_PROGRAM);
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: ["od_rough", "od_thread"],
        g_codes: parsedBlocks.filter(b => b.g).map(b => b.g),
        spindle_mode: "G96",
        spindle_value: 180,
        tool_blocks: [{ tool_number: 1, offset: 1 }]
      },
      threadIssues: threadReport.issues,
      currentScore: 44
    };
    const reasonReport = runStage4_Reason(programReport, PART_SPEC, engines);
    const proposed = runStage5_Generate(AMATEUR_PROGRAM, reasonReport, CTX);

    // Re-validate the proposed program
    const newThreadReport = validateThreading(proposed.text, CTX);
    const origWarnings = threadReport.issues.filter(i => i.severity === "warning").length;
    const newWarnings = newThreadReport.issues.filter(i => i.severity === "warning").length;
    assert.ok(newWarnings < origWarnings, "warning count should drop after G92→G76 substitution");
  });
});
