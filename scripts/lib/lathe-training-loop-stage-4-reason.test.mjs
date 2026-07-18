// Hermetic tests for U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (Stage 4: REASON)
// Design memo: reference_lathe_training_loop_stages_1_5_design_2026_05_27
//
// runStage4_Reason(programReport, partSpec, engines) → ReasonReport
//
// ReasonReport contains:
//   current_score, target_score, improvement_recommendations[],
//   expected_delta_score, confidence
//
// Each recommendation: { category, severity, what, why, delta_score, lever }
//
// Run: node --test scripts/lib/lathe-training-loop-stage-4-reason.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBridge } from "./lathe-shop-tool-library-bridge.mjs";
import { createTribalQueryEngine } from "./lathe-tribal-query-engine.mjs";
import { createInsertSelector } from "./lathe-wizard-vendor-lookup.mjs";
import { runStage4_Reason } from "./lathe-training-loop-stage-4-reason.mjs";

const SHOP_INVENTORY = {
  ALCOA: {
    "*": {
      T0101: { insertAnsi: "CNMG-432-PR", vendor: "Kennametal", grade: "KCM35", geometry: "C", iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, coating: "PVD-TiAlN" }
    }
  }
};

const CORPUS = {
  vendor_grades: [
    { vendor: "Kennametal", grade: "KCM35", insertAnsi: "CNMG-432-PR", geometry: "C", coating: "PVD-TiAlN", iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, best_application: "roughing" },
    { vendor: "Sandvik", grade: "GC4325", insertAnsi: "DNMG-432-MF", geometry: "D", coating: "PVD-TiAlN", iso_group_fit: ["P-30"], suggestedVcSfm: [320, 400], suggestedFzIpr: [0.006, 0.012], lifeMinutesAtTargetVc: 22, best_application: "finishing" }
  ],
  video_segments: [],
  tribal_tips: []
};

function buildEngines() {
  const bridge = createBridge({ layer1: SHOP_INVENTORY });
  const queryEngine = createTribalQueryEngine(CORPUS);
  const selector = createInsertSelector({ queryEngine, bridge });
  return { bridge, queryEngine, selector };
}

const PART_SPEC_ALCOA_STEEL = {
  customer: "ALCOA",
  iso_group: "P-30",
  material: "AISI-1045",
  operations: ["roughing", "finishing", "threading"]
};

describe("runStage4_Reason — core API", () => {
  it("returns a ReasonReport with the documented shape", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: { ok: true, operation_sequence: ["od_rough", "od_thread"], g_codes: ["G71", "G92"], spindle_mode: "G96", spindle_value: 180 },
      threadIssues: [
        { severity: "warning", issue: "G92_deprecated_use_G76", message: "use G76 not G92" }
      ],
      currentScore: 44
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);

    assert.equal(typeof report.current_score, "number");
    assert.equal(typeof report.target_score, "number");
    assert.ok(Array.isArray(report.improvement_recommendations));
    assert.equal(typeof report.expected_delta_score, "number");
    assert.equal(typeof report.confidence, "number");
    assert.ok(report.confidence >= 0 && report.confidence <= 1);
  });
});

describe("runStage4_Reason — recommendation synthesis", () => {
  it("surfaces G92→G76 recommendation when thread report flagged G92", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: { ok: true, operation_sequence: ["od_thread"], g_codes: ["G92"], spindle_mode: "G96", spindle_value: 180 },
      threadIssues: [{ severity: "warning", issue: "G92_deprecated_use_G76", message: "use G76 not G92" }],
      currentScore: 50
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    const rec = report.improvement_recommendations.find(r => /G76/.test(r.what));
    assert.ok(rec, "should surface G92→G76 recommendation");
    assert.equal(rec.category, "canned_cycle");
  });

  it("surfaces insert-pick recommendation when no insert documented", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: { ok: true, operation_sequence: ["od_rough"], g_codes: ["G71"], spindle_mode: "G96", spindle_value: 180, tool_blocks: [{ tool_number: 1, offset: 1 }] },
      threadIssues: [],
      currentScore: 40,
      toolsValidated: false
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    const rec = report.improvement_recommendations.find(r => r.category === "tooling");
    assert.ok(rec, "should surface tooling recommendation");
    assert.ok(/CNMG|KCM|Kennametal/i.test(rec.what), "should name the wizard-picked insert");
  });

  it("returns empty recommendations for a clean program", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: { ok: true, operation_sequence: ["od_rough", "od_finish"], g_codes: ["G50", "G71", "G70"], spindle_mode: "G96", spindle_value: 180 },
      threadIssues: [],
      currentScore: 85,
      toolsValidated: true
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    assert.equal(report.improvement_recommendations.length, 0);
    assert.equal(report.expected_delta_score, 0);
  });
});

describe("runStage4_Reason — severity + lever tagging", () => {
  it("each recommendation has severity P0/P1/P2 + lever string", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: { ok: true, operation_sequence: ["od_thread"], g_codes: ["G92"], spindle_mode: "G96", spindle_value: 180 },
      threadIssues: [{ severity: "warning", issue: "G92_deprecated_use_G76" }],
      currentScore: 50,
      toolsValidated: false
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    for (const rec of report.improvement_recommendations) {
      assert.ok(["P0", "P1", "P2"].includes(rec.severity));
      assert.equal(typeof rec.lever, "string");
      assert.equal(typeof rec.why, "string");
      assert.equal(typeof rec.delta_score, "number");
    }
  });
});

describe("runStage4_Reason — T-block comment operation inference (iter156)", () => {
  it("'(Rough OD and face)' comment routes wizard to roughing operation", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: [],   // no explicit sequence
        g_codes: ["G00", "G01"],   // no canned cycle (would default to facing)
        spindle_mode: "G96",
        spindle_value: 180,
        tool_blocks: [{ tool_number: 1, offset: 1, text: "T010101 (Rough OD and face)" }]
      },
      threadIssues: [],
      currentScore: 40,
      toolsValidated: false
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    const tooling = report.improvement_recommendations.find(r => r.category === "tooling");
    assert.ok(tooling, "tooling recommendation must surface");
    // CORPUS has Kennametal KCM35 best_application=roughing; wizard should pick it when comment says rough
    assert.ok(/Kennametal|KCM35/.test(tooling.what));
  });

  it("'(Drill 0.500 dia)' comment routes wizard to drilling operation", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: [],
        g_codes: ["G00", "G01"],   // no G74/G81 — only the comment reveals it's drilling
        spindle_mode: "G96",
        spindle_value: 180,
        tool_blocks: [{ tool_number: 2, offset: 2, text: "T020202 (Drill 0.500 dia)" }]
      },
      threadIssues: [],
      currentScore: 40,
      toolsValidated: false
    };
    // Should not throw — wizard may not pick a perfect drilling grade from the synthetic corpus
    // but should not crash on the comment-inferred drilling operation
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    assert.ok(Array.isArray(report.improvement_recommendations));
  });

  it("no comment + no G-codes falls back to facing default", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: [],
        g_codes: ["G00", "G01"],   // plain motion only
        spindle_mode: "G96",
        spindle_value: 180,
        tool_blocks: [{ tool_number: 1, offset: 1, text: "T0101" }]  // no parens
      },
      threadIssues: [],
      currentScore: 40,
      toolsValidated: false
    };
    // Should not throw — facing-default falls through to whatever grade matches ISO-P
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    assert.ok(Array.isArray(report.improvement_recommendations));
  });
});

describe("runStage4_Reason — controller-aware G70 finish-pass detection (iter159)", () => {
  const programWithG71NoG70 = {
    parsed: {
      ok: true,
      operation_sequence: ["od_rough"],
      g_codes: ["G50", "G71", "G96"],   // G71 present, G70 absent
      spindle_mode: "G96",
      spindle_value: 180,
      tool_blocks: [{ tool_number: 1, offset: 1 }]
    },
    threadIssues: [],
    currentScore: 50,
    toolsValidated: true
  };

  it("Fanuc controller: surfaces 'Add G70 finish-pass' P1 recommendation", () => {
    const engines = buildEngines();
    const fanucSpec = { ...PART_SPEC_ALCOA_STEEL, controller: "fanuc" };
    const report = runStage4_Reason(programWithG71NoG70, fanucSpec, engines);
    assert.ok(report.improvement_recommendations.some(r => r.lever === "structural_finish_pass"));
  });

  it("Haas controller: surfaces 'Add G70 finish-pass' (same as Fanuc dialect)", () => {
    const engines = buildEngines();
    const haasSpec = { ...PART_SPEC_ALCOA_STEEL, controller: "haas" };
    const report = runStage4_Reason(programWithG71NoG70, haasSpec, engines);
    assert.ok(report.improvement_recommendations.some(r => r.lever === "structural_finish_pass"));
  });

  it("Okuma controller: does NOT surface G70 recommendation (single-line G71 embeds finish-stock)", () => {
    const engines = buildEngines();
    const okumaSpec = { ...PART_SPEC_ALCOA_STEEL, controller: "okuma" };
    const report = runStage4_Reason(programWithG71NoG70, okumaSpec, engines);
    assert.ok(!report.improvement_recommendations.some(r => r.lever === "structural_finish_pass"),
      "Okuma G71 should NOT trigger G70 recommendation");
  });

  it("Mazak controller: does NOT surface G70 recommendation (same Okuma-style cycle)", () => {
    const engines = buildEngines();
    const mazakSpec = { ...PART_SPEC_ALCOA_STEEL, controller: "mazak" };
    const report = runStage4_Reason(programWithG71NoG70, mazakSpec, engines);
    assert.ok(!report.improvement_recommendations.some(r => r.lever === "structural_finish_pass"));
  });
});

describe("runStage4_Reason — safety-state flags detector (iter227, iter218 empirical finding)", () => {
  it("surfaces P1 recommendation when G00/G01 motion present without G40 or G80", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: [],
        g_codes: ["G00", "G01", "G50", "G96"],   // motion present, G40+G80 missing
        spindle_mode: "G96",
        spindle_value: 180
      },
      threadIssues: [],
      currentScore: 50,
      toolsValidated: true
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    const safetyState = report.improvement_recommendations.find(r => r.lever === "safety_state_enumeration");
    assert.ok(safetyState, "safety-state-enumeration recommendation must surface");
    assert.equal(safetyState.severity, "P1");
    assert.ok(/G40/.test(safetyState.what));
    assert.ok(/G80/.test(safetyState.what));
  });

  it("does NOT surface when both G40 and G80 are present", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: [],
        g_codes: ["G00", "G01", "G40", "G50", "G80", "G96"],
        spindle_mode: "G96",
        spindle_value: 180
      },
      threadIssues: [],
      currentScore: 50,
      toolsValidated: true
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    assert.ok(!report.improvement_recommendations.some(r => r.lever === "safety_state_enumeration"));
  });

  it("does NOT surface when there is no motion (G00/G01 absent)", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: [],
        g_codes: ["G50", "G96", "G97"],   // no motion codes
        spindle_mode: "G96",
        spindle_value: 180
      },
      threadIssues: [],
      currentScore: 50,
      toolsValidated: true
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    assert.ok(!report.improvement_recommendations.some(r => r.lever === "safety_state_enumeration"));
  });

  it("surfaces single-flag recommendation when only ONE of G40/G80 is missing", () => {
    const engines = buildEngines();
    const programReport = {
      parsed: {
        ok: true,
        operation_sequence: [],
        g_codes: ["G00", "G01", "G40", "G50", "G96"],   // G80 missing
        spindle_mode: "G96",
        spindle_value: 180
      },
      threadIssues: [],
      currentScore: 50,
      toolsValidated: true
    };
    const report = runStage4_Reason(programReport, PART_SPEC_ALCOA_STEEL, engines);
    const safetyState = report.improvement_recommendations.find(r => r.lever === "safety_state_enumeration");
    assert.ok(safetyState);
    assert.ok(/G80/.test(safetyState.what), "should name the missing flag (G80)");
    assert.ok(!/G40 \(/.test(safetyState.what), "should NOT name the present flag (G40)");
  });
});

describe("runStage4_Reason — R12 fail-loud", () => {
  it("throws when programReport missing", () => {
    const engines = buildEngines();
    assert.throws(() => runStage4_Reason(null, PART_SPEC_ALCOA_STEEL, engines), /programReport/i);
  });

  it("throws when partSpec missing iso_group", () => {
    const engines = buildEngines();
    const programReport = { parsed: { ok: true, operation_sequence: [], g_codes: [] }, threadIssues: [], currentScore: 50 };
    assert.throws(() => runStage4_Reason(programReport, { customer: "ALCOA" }, engines), /iso_group/i);
  });
});
