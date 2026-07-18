/**
 * LathePostProcessorAIEngine.test.ts
 *
 * Reference-value / algebraic-invariant coverage for the AI-powered lathe
 * post-processor engine (critical-path A1, ECHO-ULTIMATE-ROADMAP).
 *
 * Every assertion encodes WHY the behaviour matters (R9):
 *   - Profile lookup returns controller-family-correct codes (G96/SFM/G96+LIMS).
 *   - debugPost detects G50-missing before G96, G00/G01 modal conflicts, missing F.
 *   - recommendCycle maps cycleType x family -> correct cycle mnemonic.
 *   - translateCode rewrites Fanuc mnemonics to Okuma and Siemens idioms.
 *   - optimizePost removes redundant modal / coolant codes; cycle_selection fires.
 *   - convertMacro maps Fanuc #vars to Siemens R-params and Okuma V-vars.
 *   - executeDeepReasoning returns a structured chain with >= 3 steps.
 *   - getLearningContext returns 3 known learned patterns with concrete ids.
 *   - processLLMQuery (async) answers G71 roughing cycle questions.
 *   - Unknown-controller inputs fail loudly (success:false with an error string).
 */

import { describe, it, expect } from "vitest";
import {
  LathePostProcessorAIEngine,
  lathePostProcessorAIEngine,
} from "../engines/LathePostProcessorAIEngine.js";

// ============================================================================
// SHARED FIXTURES
// ============================================================================

const engine = new LathePostProcessorAIEngine();

// A minimal but syntactically valid Fanuc program used across several tests.
const FANUC_SIMPLE: string[] = [
  "O0001 (TEST PROGRAM)",
  "G50 S3000",
  "G96 S220 M03",
  "G00 X52.0 Z2.0",
  "G99",
  "G01 X50.0 F0.25",
  "G01 Z-30.0",
  "G00 X200.0 Z100.0",
  "M05",
  "M30",
];

// Omits G50 before G96 -- triggers the CSS safety warning.
const FANUC_NO_G50: string[] = [
  "G96 S220 M03",
  "G01 X50.0 F0.25",
  "M30",
];

// G00/G01 modal conflict on the same line.
const FANUC_MODAL_CONFLICT: string[] = [
  "G50 S3000",
  "G00 G01 X50.0 F0.1",
  "M30",
];

// G01 move but no F word anywhere before it.
const FANUC_MISSING_F: string[] = [
  "G01 X50.0",
  "M30",
];

// Okuma-dialect source used for translation tests.
const OKUMA_PROGRAM: string[] = [
  "RPID X52 Z2",
  "GROU,A2,D2,F0.25,S220,X50,Z-30",
  "GFIN",
  "MOFF",
];

// Fanuc code that contains G76 canned-cycle lines.
const FANUC_WITH_G76: string[] = [
  "G50 S1500",
  "G97 S800 M03",
  "G76 P020060 Q100 R0.05",
  "G76 X23.376 Z-25.0 P812 Q200 F1.5",
  "M30",
];

// ============================================================================
// 1. SINGLETON EXPORT
// ============================================================================

describe("LathePostProcessorAIEngine -- singleton export", () => {
  it("the named singleton is an instance of the class", () => {
    expect(lathePostProcessorAIEngine).toBeInstanceOf(LathePostProcessorAIEngine);
  });

  it("the class exposes its identity metadata", () => {
    expect(engine.name).toBe("LathePostProcessorAIEngine");
    expect(engine.version).toBe("1.0.0");
  });
});

// ============================================================================
// 2. getPostProfile
// ============================================================================

describe("LathePostProcessorAIEngine -- getPostProfile", () => {
  it("fanuc_0i_tf: cssCode=G96, rpmCode=G97, coordinateSystem=diameter", () => {
    const res = engine.getPostProfile("fanuc_0i_tf");
    expect(res.success).toBe(true);
    const p = res.data!;
    expect(p.cssCode).toBe("G96");
    expect(p.rpmCode).toBe("G97");
    expect(p.coordinateSystem).toBe("diameter");
    expect(p.family).toBe("fanuc");
  });

  it("okuma_osp_p300l: cssCode=SFM, spindleCW=MCW, modalGCodes=false", () => {
    const res = engine.getPostProfile("okuma_osp_p300l");
    expect(res.success).toBe(true);
    const p = res.data!;
    expect(p.cssCode).toBe("SFM");
    expect(p.spindleCWCode).toBe("MCW");
    expect(p.modalGCodes).toBe(false);
    expect(p.family).toBe("okuma");
  });

  it("siemens_828d: cssCode='G96 LIMS=' (includes LIMS suffix), feedPerRevCode='G95 F', family=siemens", () => {
    const res = engine.getPostProfile("siemens_828d");
    expect(res.success).toBe(true);
    const p = res.data!;
    // Siemens uses G96 with mandatory LIMS= spindle cap -- the full token is 'G96 LIMS='
    expect(p.cssCode).toBe("G96 LIMS=");
    // Siemens feed-per-rev is G95 (not Fanuc G99); stored with trailing ' F'
    expect(p.feedPerRevCode).toBe("G95 F");
    expect(p.family).toBe("siemens");
  });

  it("haas_ngc: roughingCycles includes G71 and G72", () => {
    const res = engine.getPostProfile("haas_ngc");
    expect(res.success).toBe(true);
    expect(res.data!.roughingCycles).toContain("G71");
    expect(res.data!.roughingCycles).toContain("G72");
  });

  it("[failure] unknown controller returns success:false with error string", () => {
    const res = engine.getPostProfile("bogus_ctrl" as never);
    expect(res.success).toBe(false);
    expect(typeof res.error).toBe("string");
    expect(res.error).toMatch(/unknown controller/i);
  });
});

// ============================================================================
// 3. listPostProfiles
// ============================================================================

describe("LathePostProcessorAIEngine -- listPostProfiles", () => {
  it("no filter returns all 21 supported controllers", () => {
    const res = engine.listPostProfiles();
    expect(res.success).toBe(true);
    expect(res.data!.controllers.length).toBe(21);
  });

  it("family=fanuc returns exactly 6 Fanuc variants, all with family='fanuc'", () => {
    const res = engine.listPostProfiles("fanuc");
    expect(res.success).toBe(true);
    expect(res.data!.controllers.length).toBe(6);
    res.data!.controllers.forEach((c) => {
      expect(res.data!.profiles[c].family).toBe("fanuc");
    });
  });

  it("family=okuma returns exactly 3 Okuma variants", () => {
    const res = engine.listPostProfiles("okuma");
    expect(res.success).toBe(true);
    expect(res.data!.controllers.length).toBe(3);
  });

  it("family=siemens returns exactly 2 Siemens variants", () => {
    const res = engine.listPostProfiles("siemens");
    expect(res.success).toBe(true);
    expect(res.data!.controllers.length).toBe(2);
  });
});

// ============================================================================
// 4. debugPost
// ============================================================================

describe("LathePostProcessorAIEngine -- debugPost", () => {
  it("clean Fanuc program: hasErrors=false, confidence=0.95, fixedCode=undefined", () => {
    const res = engine.debugPost("fanuc_0i_tf", FANUC_SIMPLE);
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.hasErrors).toBe(false);
    expect(d.errors.length).toBe(0);
    expect(d.confidence).toBeCloseTo(0.95, 5);
    // fixedCode is only returned when errors exist
    expect(d.fixedCode).toBeUndefined();
  });

  it("G96 without preceding G50 generates a safety warning recommending G50", () => {
    const res = engine.debugPost("fanuc_0i_tf", FANUC_NO_G50);
    expect(res.success).toBe(true);
    const warning = res.data!.warnings.find((w) => w.code.includes("G96"));
    expect(warning).not.toBeUndefined();
    expect(warning!.category).toBe("safety");
    expect(warning!.recommendation).toMatch(/G50/);
  });

  it("G00 + G01 on same line generates modal error; suggestedFix removes G00", () => {
    const res = engine.debugPost("fanuc_30i_b", FANUC_MODAL_CONFLICT);
    expect(res.success).toBe(true);
    const err = res.data!.errors.find((e) => e.category === "modal");
    expect(err).not.toBeUndefined();
    expect(err!.severity).toBe("error");
    expect(err!.suggestedFix).not.toContain("G00");
  });

  it("G01 with no F word generates parameter error; suggestedFix appends F0.1", () => {
    const res = engine.debugPost("haas_ngc", FANUC_MISSING_F);
    expect(res.success).toBe(true);
    const err = res.data!.errors.find((e) => e.category === "parameter");
    expect(err).not.toBeUndefined();
    expect(err!.message).toMatch(/feed rate/i);
    expect(err!.suggestedFix).toContain("F0.1");
  });

  it("Okuma program containing Fanuc G71 generates critical syntax error mentioning GROU", () => {
    const res = engine.debugPost("okuma_osp_p200l", [
      "RPID X52 Z2",
      "G71 U2.0 R1.0",   // Fanuc canned cycle in an Okuma program -- critical
      "GFIN",
      "MOFF",
    ]);
    expect(res.success).toBe(true);
    const err = res.data!.errors.find((e) => e.severity === "critical");
    expect(err).not.toBeUndefined();
    expect(err!.category).toBe("syntax");
    expect(err!.suggestedFix).toContain("GROU");
  });

  it("when errors exist: confidence drops to 0.7, fixedCode is a string array", () => {
    const res = engine.debugPost("fanuc_0i_tf", FANUC_MODAL_CONFLICT);
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.hasErrors).toBe(true);
    expect(d.confidence).toBeCloseTo(0.7, 5);
    expect(Array.isArray(d.fixedCode)).toBe(true);
  });

  it("[failure] unknown controller returns success:false", () => {
    const res = engine.debugPost("fanuc_99" as never, FANUC_SIMPLE);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unknown controller/i);
  });

  it("[adversarial] Siemens G96 without LIMS generates a safety warning mentioning LIMS", () => {
    const res = engine.debugPost("siemens_828d", [
      "G96 S220",
      "G01 X50.0 F0.2",
      "M30",
    ]);
    expect(res.success).toBe(true);
    const w = res.data!.warnings.find((x) => x.message.includes("LIMS"));
    expect(w).not.toBeUndefined();
    expect(w!.category).toBe("safety");
  });

  it("[adversarial] empty program: hasErrors=false, warnings=[]. no crash", () => {
    const res = engine.debugPost("fanuc_0i_tf", []);
    expect(res.success).toBe(true);
    expect(res.data!.hasErrors).toBe(false);
    expect(res.data!.warnings.length).toBe(0);
  });
});

// ============================================================================
// 5. recommendCycle
// ============================================================================

describe("LathePostProcessorAIEngine -- recommendCycle", () => {
  it("rough_od on fanuc_0i_tf -> G71, estimatedTimeReduction=30, two-line gcodeExample", () => {
    const res = engine.recommendCycle("fanuc_0i_tf", "rough_od", {});
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.recommendedCycle).toBe("G71");
    expect(d.estimatedTimeReduction_pct).toBe(30);
    expect(d.gcodeExample.some((l) => l.startsWith("G71 U"))).toBe(true);
    expect(d.gcodeExample.some((l) => l.startsWith("G71 P"))).toBe(true);
  });

  it("rough_od on okuma_osp_p300l -> GROU", () => {
    const res = engine.recommendCycle("okuma_osp_p300l", "rough_od", {});
    expect(res.success).toBe(true);
    expect(res.data!.recommendedCycle).toBe("GROU");
    expect(res.data!.gcodeExample.some((l) => l.includes("GROU"))).toBe(true);
  });

  it("rough_od on siemens_828d -> CYCLE95", () => {
    const res = engine.recommendCycle("siemens_828d", "rough_od", {});
    expect(res.success).toBe(true);
    expect(res.data!.recommendedCycle).toBe("CYCLE95");
  });

  it("thread_external on fanuc_0i_tf -> G76, estimatedTimeReduction=40, F word = pitch", () => {
    const res = engine.recommendCycle("fanuc_0i_tf", "thread_external", {
      diameter_mm: 25,
      length_mm: 30,
      pitch_mm: 2.0,
    });
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.recommendedCycle).toBe("G76");
    expect(d.estimatedTimeReduction_pct).toBe(40);
    expect(d.gcodeExample.some((l) => l.includes("F2"))).toBe(true);
  });

  it("thread_external on okuma_osp_p200l -> GTHR", () => {
    const res = engine.recommendCycle("okuma_osp_p200l", "thread_external", {});
    expect(res.success).toBe(true);
    expect(res.data!.recommendedCycle).toBe("GTHR");
  });

  it("groove_external on fanuc_30i_b -> G75, estimatedTimeReduction=25", () => {
    const res = engine.recommendCycle("fanuc_30i_b", "groove_external", {
      diameter_mm: 30,
      length_mm: 8,
    });
    expect(res.success).toBe(true);
    expect(res.data!.recommendedCycle).toBe("G75");
    expect(res.data!.estimatedTimeReduction_pct).toBe(25);
  });

  it("drill_peck on haas_ngc -> G74, alternative G83 for deep holes > 4x diameter", () => {
    const res = engine.recommendCycle("haas_ngc", "drill_peck", {
      depth_mm: 40,
      diameter_mm: 12,
    });
    expect(res.success).toBe(true);
    expect(res.data!.recommendedCycle).toBe("G74");
    const alt = res.data!.alternatives.find((a) => a.cycle === "G83");
    expect(alt).not.toBeUndefined();
    expect(alt!.whenToUse).toMatch(/4x diameter/i);
  });

  it("[failure] unknown controller -> success:false", () => {
    const res = engine.recommendCycle("ctrl_xyz" as never, "rough_od", {});
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unknown controller/i);
  });

  it("[adversarial] unhandled cycleType returns 'Manual programming'", () => {
    const res = engine.recommendCycle("fanuc_0i_tf", "pattern_repeat", {});
    expect(res.success).toBe(true);
    expect(res.data!.recommendedCycle).toBe("Manual programming");
  });
});

// ============================================================================
// 6. translateCode
// ============================================================================

describe("LathePostProcessorAIEngine -- translateCode", () => {
  it("same-family: code passes through unchanged, warns 'compatible', confidence >= 0.8", () => {
    const res = engine.translateCode("fanuc_0i_tf", "fanuc_30i_b", FANUC_SIMPLE);
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.translatedCode.length).toBe(FANUC_SIMPLE.length);
    expect(d.warnings.some((w) => /compatible/i.test(w))).toBe(true);
    expect(d.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("fanuc->okuma: G00->RPID, G01->CUT, M03->MCW, M08->CLN, M09->CLOF, M05->MOFF", () => {
    const res = engine.translateCode("fanuc_0i_tf", "okuma_osp_p300l", [
      "G00 X52.0 Z2.0",
      "G01 X50.0 F0.25",
      "G96 S220 M03",
      "M08",
      "M09",
      "M05",
    ]);
    expect(res.success).toBe(true);
    const t = res.data!.translatedCode;
    expect(t.some((l) => l.includes("RPID"))).toBe(true);
    expect(t.some((l) => l.includes("CUT"))).toBe(true);
    expect(t.some((l) => l.includes("MCW"))).toBe(true);
    expect(t.some((l) => l.includes("CLN"))).toBe(true);
    expect(t.some((l) => l.includes("CLOF"))).toBe(true);
    expect(t.some((l) => l.includes("MOFF"))).toBe(true);
  });

  it("fanuc->okuma: G76 canned cycle is flagged as MANUAL CONVERSION REQUIRED", () => {
    const res = engine.translateCode("fanuc_0i_tf", "okuma_osp_p200l", FANUC_WITH_G76);
    expect(res.success).toBe(true);
    expect(res.data!.manualReviewRequired.length).toBeGreaterThan(0);
    const flagged = res.data!.translatedCode.some((l) =>
      l.includes("MANUAL CONVERSION REQUIRED")
    );
    expect(flagged).toBe(true);
    // confidence drops below 0.9 when manual review is required
    expect(res.data!.confidence).toBeLessThan(0.9);
  });

  it("okuma->fanuc: RPID->G00, MCW->M03, CLN->M08, MOFF->M05; Okuma cycles flagged", () => {
    // Use a fixture with explicit Okuma mnemonics -- OKUMA_PROGRAM omits MCW
    const res = engine.translateCode("okuma_osp_p200l", "fanuc_0i_tf", [
      "RPID X52 Z2",
      "MCW",
      "CLN",
      "CUT X50.0 F0.25",
      "MOFF",
      "GROU,A2,D2,F0.25,S220,X50,Z-30",  // canned cycle -- needs manual conversion
    ]);
    expect(res.success).toBe(true);
    const t = res.data!.translatedCode;
    expect(t.some((l) => l.includes("G00"))).toBe(true);   // RPID -> G00
    expect(t.some((l) => l.includes("M03"))).toBe(true);   // MCW -> M03
    expect(t.some((l) => l.includes("M08"))).toBe(true);   // CLN -> M08
    expect(t.some((l) => l.includes("M05"))).toBe(true);   // MOFF -> M05
    // GROU is an Okuma canned cycle and must be flagged for manual conversion
    expect(res.data!.manualReviewRequired.length).toBeGreaterThan(0);
  });

  it("fanuc->siemens: G99->G95, G98->G94", () => {
    const res = engine.translateCode("fanuc_0i_tf", "siemens_828d", [
      "G99",
      "G98",
      "G01 X50.0 F0.2",
    ]);
    expect(res.success).toBe(true);
    const t = res.data!.translatedCode;
    expect(t.some((l) => l.includes("G95"))).toBe(true);
    expect(t.some((l) => l.includes("G94"))).toBe(true);
  });

  it("siemens->fanuc: G95->G99, G50 injected before first G96, CYCLE97 flagged", () => {
    const res = engine.translateCode("siemens_828d", "fanuc_0i_tf", [
      "G95",
      "G96 S220 LIMS=3000 M3",
      "CYCLE97(25,0,,1.5,1,0.975,0,0,8,1,60,,)",
    ]);
    expect(res.success).toBe(true);
    const t = res.data!.translatedCode;
    expect(t.some((l) => l.includes("G99"))).toBe(true);
    expect(t.some((l) => l.includes("G50 S3000"))).toBe(true);
    expect(res.data!.manualReviewRequired.length).toBeGreaterThan(0);
  });

  it("[failure] unknown target controller returns success:false", () => {
    const res = engine.translateCode("fanuc_0i_tf", "fake_ctrl" as never, FANUC_SIMPLE);
    expect(res.success).toBe(false);
  });

  it("[adversarial] hurco->doosan (generic path) wraps every line in REVIEW REQUIRED", () => {
    const res = engine.translateCode("hurco_max5", "doosan_siemens", [
      "G00 X50",
      "G01 Z-20 F0.2",
    ]);
    expect(res.success).toBe(true);
    const allFlagged = res.data!.translatedCode.every((l) =>
      l.includes("REVIEW REQUIRED")
    );
    expect(allFlagged).toBe(true);
    expect(res.data!.unsupportedFeatures.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 7. optimizePost
// ============================================================================

describe("LathePostProcessorAIEngine -- optimizePost", () => {
  it("modal_grouping on Fanuc (modalGCodes=true): removes redundant G01 modal codes", () => {
    const code = [
      "G01 X50.0 F0.25",
      "G01 X48.0",    // redundant -- same modal as previous line
      "G01 X46.0",
      "G00 X200.0",
    ];
    const res = engine.optimizePost("fanuc_0i_tf", code, "modal_grouping");
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.optimizationType).toBe("modal_grouping");
    expect(d.improvements.some((i) => i.type === "modal_removal")).toBe(true);
    expect(d.confidence).toBeCloseTo(0.85, 5);
  });

  it("modal_grouping on Okuma (modalGCodes=false): zero modal_removal improvements", () => {
    const code = ["CUT X50.0 F0.25", "CUT X48.0"];
    const res = engine.optimizePost("okuma_osp_p300l", code, "modal_grouping");
    expect(res.success).toBe(true);
    const removals = res.data!.improvements.filter((i) => i.type === "modal_removal");
    expect(removals.length).toBe(0);
  });

  it("coolant_optimization: removes duplicate M08, optimized code has fewer M08 than original", () => {
    const code = [
      "G00 X52.0 Z2.0",
      "M08",
      "G01 X50.0 F0.2",
      "M08",   // redundant -- coolant already on
      "G01 X48.0",
      "M09",
    ];
    const res = engine.optimizePost("fanuc_0i_tf", code, "coolant_optimization");
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.improvements.some((i) => i.type === "coolant_redundant")).toBe(true);
    const origM08 = code.filter((l) => l.includes("M08")).length;
    const optM08 = d.optimizedCode.filter((l) => l.includes("M08")).length;
    expect(optM08).toBeLessThan(origM08);
  });

  it("cycle_selection: >= 3 consecutive cuts produce a cycle_candidate improvement", () => {
    const code = [
      "G01 X50.0 F0.2",
      "G01 X48.0",
      "G01 X46.0",
      "G01 X44.0",
      "G00 X200.0",
    ];
    const res = engine.optimizePost("fanuc_0i_tf", code, "cycle_selection");
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.improvements.some((i) => i.type === "cycle_candidate")).toBe(true);
    const candidate = d.improvements.find((i) => i.type === "cycle_candidate")!;
    expect(candidate.benefit).toMatch(/Reduce/);
  });

  it("[failure] unknown controller returns success:false", () => {
    const res = engine.optimizePost("ctrl_unknown" as never, FANUC_SIMPLE, "modal_grouping");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unknown controller/i);
  });

  it("[adversarial] unhandled optimizationType passes code through unchanged, no improvements", () => {
    const code = ["G00 X50.0", "G01 Z-20.0 F0.2"];
    const res = engine.optimizePost("fanuc_0i_tf", code, "path_smoothing");
    expect(res.success).toBe(true);
    expect(res.data!.optimizedCode).toEqual(code);
    expect(res.data!.improvements.length).toBe(0);
  });
});

// ============================================================================
// 8. convertMacro
// ============================================================================

describe("LathePostProcessorAIEngine -- convertMacro", () => {
  it("fanuc_b->siemens: #1 (local) -> R0, #100 (common) -> R100, no # chars remain", () => {
    const macro = [
      "#1 = 25.0",
      "#100 = 0.5",
      "IF [#1 GT 0] THEN",
      "  G01 X#1 F#100",
      "END1",
    ];
    const res = engine.convertMacro("fanuc_b", "siemens", macro);
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.variableMapping["#1"]).toBe("R0");
    expect(d.variableMapping["#100"]).toBe("R100");
    const hasHash = d.convertedMacro.some((l) => l.includes("#"));
    expect(hasHash).toBe(false);
    // IF [...] THEN -> IF without brackets
    expect(d.convertedMacro.some((l) => l.includes("IF R0"))).toBe(true);
  });

  it("siemens->fanuc_b: R1 -> #2, R32 -> #33, '==' converted to 'EQ'", () => {
    const macro = [
      "R1 = 25.0",
      "R32 = 0.5",
      "IF R1 == 0",
    ];
    const res = engine.convertMacro("siemens", "fanuc_b", macro);
    expect(res.success).toBe(true);
    const d = res.data!;
    // R1 (varNum=1, <33) -> #(1+1) = #2
    expect(d.variableMapping["R1"]).toBe("#2");
    // R32 (varNum=32, <33) -> #33
    expect(d.variableMapping["R32"]).toBe("#33");
    expect(d.convertedMacro.some((l) => l.includes("EQ"))).toBe(true);
  });

  it("fanuc_b->okuma: #10 -> V10, #50 -> VC50, limitations note present", () => {
    const macro = ["#10 = 5.0", "#50 = 10.0"];
    const res = engine.convertMacro("fanuc_b", "okuma", macro);
    expect(res.success).toBe(true);
    expect(res.data!.variableMapping["#10"]).toBe("V10");
    expect(res.data!.variableMapping["#50"]).toBe("VC50");
    expect(res.data!.limitations.some((l) => /okuma/i.test(l))).toBe(true);
  });

  it("same-dialect passthrough: convertedMacro is byte-identical to input", () => {
    const macro = ["#1 = 1.0", "G01 X#1 F0.2"];
    const res = engine.convertMacro("fanuc_b", "fanuc_b", macro);
    expect(res.success).toBe(true);
    expect(res.data!.convertedMacro).toEqual(macro);
    expect(res.data!.limitations.length).toBe(0);
  });

  it("[adversarial] unsupported dialect pair adds a limitation note matching 'not fully supported'", () => {
    const res = engine.convertMacro("haas", "custom", ["#1 = 0"]);
    expect(res.success).toBe(true);
    expect(res.data!.limitations.some((l) => /not fully supported/i.test(l))).toBe(true);
  });
});

// ============================================================================
// 9. executeDeepReasoning
// ============================================================================

describe("LathePostProcessorAIEngine -- executeDeepReasoning", () => {
  it("post_debug chain: >= 3 steps numbered sequentially, non-empty conclusion", () => {
    const res = engine.executeDeepReasoning("post_debug", { code: FANUC_SIMPLE }, "fanuc_0i_tf");
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.chainType).toBe("post_debug");
    expect(d.steps.length).toBeGreaterThanOrEqual(3);
    expect(d.conclusion.length).toBeGreaterThan(0);
    expect(d.confidence).toBeGreaterThan(0);
    d.steps.forEach((s, i) => {
      expect(s.stepNumber).toBe(i + 1);
    });
  });

  it("cycle_select chain: conclusion references fanuc primary roughing cycle G71", () => {
    const res = engine.executeDeepReasoning(
      "cycle_select",
      { operation: "rough_od" },
      "fanuc_0i_tf"
    );
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.chainType).toBe("cycle_select");
    expect(d.conclusion).toMatch(/G71/);
    expect(d.alternatives.length).toBeGreaterThan(0);
  });

  it("translate chain: exactly 3 steps, confidence=0.75", () => {
    const res = engine.executeDeepReasoning(
      "translate",
      { sourceController: "fanuc_0i_tf", targetController: "okuma_osp_p200l" },
      "okuma_osp_p200l"
    );
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.steps.length).toBe(3);
    expect(d.confidence).toBeCloseTo(0.75, 5);
  });

  it("chainId is a non-empty string prefixed with 'CHAIN_'", () => {
    const res = engine.executeDeepReasoning("post_debug", {}, "fanuc_0i_tf");
    expect(res.data!.chainId.startsWith("CHAIN_")).toBe(true);
    expect(res.data!.chainId.length).toBeGreaterThan(6);
  });

  it("[failure] unknown controller returns success:false", () => {
    const res = engine.executeDeepReasoning("post_debug", {}, "bogus" as never);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unknown controller/i);
  });
});

// ============================================================================
// 10. getLearningContext
// ============================================================================

describe("LathePostProcessorAIEngine -- getLearningContext", () => {
  it("returns exactly 3 learned patterns with concrete IDs PATTERN_001/002/003", () => {
    const res = engine.getLearningContext();
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.learnedPatterns.length).toBe(3);
    expect(d.learnedPatterns[0].patternId).toBe("PATTERN_001");
    expect(d.learnedPatterns[1].patternId).toBe("PATTERN_002");
    expect(d.learnedPatterns[2].patternId).toBe("PATTERN_003");
  });

  it("historicalPostCount=24545 (matches the JM Die archive count)", () => {
    const res = engine.getLearningContext();
    expect(res.data!.historicalPostCount).toBe(24545);
  });

  it("all three learning flags are enabled", () => {
    const res = engine.getLearningContext();
    const d = res.data!;
    expect(d.jobSimilarityEnabled).toBe(true);
    expect(d.parameterLearningEnabled).toBe(true);
    expect(d.optimizationLearningEnabled).toBe(true);
  });

  it("all pattern confidence values are in range (0, 1]", () => {
    const res = engine.getLearningContext();
    res.data!.learnedPatterns.forEach((p) => {
      expect(p.confidence).toBeGreaterThan(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// 11. processLLMQuery (async)
// ============================================================================

describe("LathePostProcessorAIEngine -- processLLMQuery (async)", () => {
  it("G71 roughing query on Fanuc: answer mentions G71, gcode starts with G71, sources present", async () => {
    const res = await engine.processLLMQuery({
      query: "How do I use the G71 roughing cycle?",
      controller: "fanuc_0i_tf",
    });
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.answer).toMatch(/G71/);
    expect(Array.isArray(d.gcode)).toBe(true);
    expect(d.gcode!.some((l) => l.startsWith("G71"))).toBe(true);
    expect(d.sources.length).toBeGreaterThan(0);
    expect(d.followUpQuestions.length).toBeGreaterThan(0);
  });

  it("G71 roughing query on Okuma redirects to GROU (Okuma has no G71)", async () => {
    const res = await engine.processLLMQuery({
      query: "roughing cycle G71",
      controller: "okuma_osp_p200l",
    });
    expect(res.success).toBe(true);
    expect(res.data!.answer).toMatch(/GROU|GROF/i);
  });

  it("CSS/G96 query on Fanuc: answer mentions G50, gcode contains G96", async () => {
    const res = await engine.processLLMQuery({
      query: "How do I enable CSS mode?",
      controller: "fanuc_30i_b",
    });
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.answer).toMatch(/G50/);
    expect(d.gcode!.some((l) => l.includes("G96"))).toBe(true);
  });

  it("G76 threading query on Fanuc: gcode has exactly 2 lines (two-line G76 format)", async () => {
    const res = await engine.processLLMQuery({
      query: "G76 threading cycle format",
      controller: "fanuc_0i_tf",
    });
    expect(res.success).toBe(true);
    const d = res.data!;
    expect(d.answer).toMatch(/G76/);
    expect(d.gcode!.length).toBe(2);
  });

  it("generic query: confidence > 0, followUpQuestions non-empty", async () => {
    const res = await engine.processLLMQuery({
      query: "what can you help me with?",
      controller: "siemens_840d_sl",
    });
    expect(res.success).toBe(true);
    expect(res.data!.followUpQuestions.length).toBeGreaterThan(0);
    expect(res.data!.confidence).toBeGreaterThan(0);
  });

  it("[failure] unknown controller returns success:false with error", async () => {
    const res = await engine.processLLMQuery({
      query: "roughing cycle",
      controller: "fake_ctrl" as never,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unknown controller/i);
  });
});

// ============================================================================
// 12. executeAction -- round-trip through the dispatcher bridge
// ============================================================================

describe("LathePostProcessorAIEngine -- executeAction round-trip", () => {
  it("post_ai_get_profile dispatches to getPostProfile -> returns family='haas'", async () => {
    const res = await engine.executeAction("post_ai_get_profile", {
      controller: "haas_ngc",
    });
    expect(res.success).toBe(true);
    const p = res.data as { family: string };
    expect(p.family).toBe("haas");
  });

  it("post_ai_list_profiles (no filter) returns all 21 controllers", async () => {
    const res = await engine.executeAction("post_ai_list_profiles", {});
    expect(res.success).toBe(true);
    const data = res.data as { controllers: string[] };
    expect(data.controllers.length).toBe(21);
  });

  it("post_ai_debug catches the modal conflict in FANUC_MODAL_CONFLICT", async () => {
    const res = await engine.executeAction("post_ai_debug", {
      controller: "fanuc_0i_tf",
      code: FANUC_MODAL_CONFLICT,
    });
    expect(res.success).toBe(true);
    const d = res.data as { hasErrors: boolean; errors: Array<{ category: string }> };
    expect(d.hasErrors).toBe(true);
    expect(d.errors.some((e) => e.category === "modal")).toBe(true);
  });

  it("post_ai_recommend_cycle returns G71 for rough_od on fanuc_0i_tf", async () => {
    const res = await engine.executeAction("post_ai_recommend_cycle", {
      controller: "fanuc_0i_tf",
      cycleType: "rough_od",
      parameters: {},
    });
    expect(res.success).toBe(true);
    const d = res.data as { recommendedCycle: string };
    expect(d.recommendedCycle).toBe("G71");
  });

  it("post_ai_learning_context returns 3 patterns, first is PATTERN_001", async () => {
    const res = await engine.executeAction("post_ai_learning_context", {});
    expect(res.success).toBe(true);
    const d = res.data as { learnedPatterns: Array<{ patternId: string }> };
    expect(d.learnedPatterns.length).toBe(3);
    expect(d.learnedPatterns[0].patternId).toBe("PATTERN_001");
  });

  it("[failure] unknown action returns success:false with 'unknown action' message", async () => {
    const res = await engine.executeAction("post_ai_nonexistent_action", {});
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unknown action/i);
  });
});
