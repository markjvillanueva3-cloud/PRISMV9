/**
 * LatheAIReasoningEngine Tests
 *
 * Tests for the AI-enhanced lathe programming intelligence layer.
 *
 * @milestone LATHE-AI-MS1
 */

import { describe, it, expect } from "vitest";
import {
  latheAIReasoningEngine,
  type LatheOperationContext,
} from "../engines/LatheAIReasoningEngine.js";
import { threadTurningEngine, G76_DIALECTS, getG76Dialect, generateG76Code } from "../engines/ThreadTurningEngine.js";

describe("LatheAIReasoningEngine — G76 Threading Dialects", () => {
  // Source-of-truth: ThreadTurningEngine cites the Fanuc 0i/30i, Okuma OSP-P200/P300L,
  // Mitsubishi M70V, Siemens 840D and Mazak Mazatrol M-Plus manuals (5-dialect design,
  // authored ENGINE-WIRE-MS0/U-WIRE04 2026-04-27; behaviorally locked by the 14/14
  // LatheAIReasoningEngine.test.ts companion 2026-05-16). Haas/Doosan/Hwacheon are
  // Fanuc-G76 compatible and fold into fanuc_double by design.
  // DEFERRED GAP (whiskey/echo -- see reference_lathe_g76_dialect_fossil_2026_06_21):
  //   native LinuxCNC + Mach3 G76 dialects (single-block R-degression / H spring-pass)
  //   are NOT yet modeled; an unmodeled controller falls back to fanuc_double. Adding
  //   them is a real .cps-grounded post-processor build + threading-G-code safety review,
  //   NOT a unilateral india edit. (This block was the U-TEST-FOSSIL orphan that asserted
  //   a speculative 7-dialect design with non-canonical Mazak/Okuma/Haas codes.)
  it("defines the 5 cited controller G76 dialects", () => {
    expect(G76_DIALECTS.length).toBe(5);
    const dialects = G76_DIALECTS.map(d => d.dialect);
    expect(dialects).toContain("fanuc_double");
    expect(dialects).toContain("okuma");
    expect(dialects).toContain("mitsubishi");
    expect(dialects).toContain("siemens");
    expect(dialects).toContain("mazak");
  });

  it("getG76Dialect returns correct dialect for Fanuc", () => {
    const dialect = getG76Dialect("Fanuc 0i-TF");
    expect(dialect).toBeDefined();
    expect(dialect?.dialect).toBe("fanuc_double");
  });

  it("getG76Dialect folds a Haas controller into fanuc_double (Haas is Fanuc-G76 compatible)", () => {
    const dialect = getG76Dialect("Haas ST-20");
    expect(dialect?.dialect).toBe("fanuc_double");
  });

  it("getG76Dialect returns correct dialect for Okuma", () => {
    const dialect = getG76Dialect("Okuma OSP-P200L");
    expect(dialect).toBeDefined();
    expect(dialect?.dialect).toBe("okuma");
  });

  it("getG76Dialect returns correct dialect for Mazak", () => {
    const dialect = getG76Dialect("Mazak INTEGREX");
    expect(dialect).toBeDefined();
    expect(dialect?.dialect).toBe("mazak");
  });

  it("getG76Dialect maps a Siemens controller to the siemens CYCLE99 dialect", () => {
    const dialect = getG76Dialect("Sinumerik 840D");
    expect(dialect?.dialect).toBe("siemens");
  });

  it("getG76Dialect returns no match for an unmodeled controller so callers default to fanuc_double", () => {
    // PathPilot (LinuxCNC) + Mach3 are the deferred gap above -- no dialect matches today.
    const matched = getG76Dialect("PathPilot");
    expect(matched ? matched.dialect : "no-match").toBe("no-match");
  });

  it("generateG76Code emits a labeled two-line Fanuc G76 cycle (P/Q/R header + X/Z/P/Q/F move)", () => {
    const code = generateG76Code("fanuc_double", {
      end_x_mm: 48,
      end_z_mm: -30,
      thread_depth_mm: 0.974,
      first_cut_mm: 0.2,
      pitch_mm: 1.5,
      spring_passes: 2,
      infeed_angle: 29,
    });
    expect(code).toContain("( G76 TWO-LINE )");
    const cycle = code.split("\n").filter(l => l.startsWith("G76"));
    expect(cycle.length).toBe(2); // two-line Fanuc cycle (header + move)
    expect(cycle[0]).toContain("G76 P"); // P{repeat}{chamfer}{angle} Q R header
    expect(cycle[1]).toContain("G76 X48.000 Z-30.000");
    expect(cycle[1]).toContain("P974"); // thread depth in microns
    expect(cycle[1]).toContain("Q200"); // first-cut depth in microns
    expect(cycle[1]).toContain("F1.5000"); // pitch as lead
  });

  it("generateG76Code folds Haas into the Fanuc two-line cycle (Haas is Fanuc-G76 compatible)", () => {
    // getG76Dialect("Haas") -> fanuc_double, so a Haas program renders the two-line shape.
    const code = generateG76Code(getG76Dialect("Haas ST-20")!.dialect, {
      end_x_mm: 48,
      end_z_mm: -30,
      thread_depth_mm: 0.974,
      first_cut_mm: 0.2,
      pitch_mm: 1.5,
    });
    expect(code).toContain("( G76 TWO-LINE )");
    expect(code).toContain("G76 X48.000 Z-30.000 P974 Q200 F1.5000");
  });

  it("generateG76Code emits an Okuma single-line G76 with micron depth and infeed angle", () => {
    const code = generateG76Code("okuma", {
      end_x_mm: 48,
      end_z_mm: -30,
      thread_depth_mm: 0.974,
      first_cut_mm: 0.2,
      pitch_mm: 1.5,
    });
    expect(code).toContain("( G76 OKUMA SINGLE-LINE )");
    expect(code).toContain("G76 X48.000 Z-30.000 I0 K974 D200 F1.5000 A60");
  });

  it("generateG76Code renders Mazak EIA mode as the Fanuc two-line shape", () => {
    const code = generateG76Code("mazak", {
      end_x_mm: 48,
      end_z_mm: -30,
      thread_depth_mm: 0.974,
      first_cut_mm: 0.2,
      pitch_mm: 1.5,
    });
    const cycle = code.split("\n").filter(l => l.startsWith("G76"));
    expect(cycle.length).toBe(2);
    expect(cycle[1]).toContain("G76 X48.000 Z-30.000 P974 Q200 F1.5000");
  });

  it("generateG76Code wraps Siemens threading in a CYCLE99 call, not a raw G76", () => {
    const code = generateG76Code("siemens", {
      end_x_mm: 48,
      end_z_mm: -30,
      thread_depth_mm: 0.974,
      first_cut_mm: 0.2,
      pitch_mm: 1.5,
    });
    // Exact CYCLE99 positional contract: (SPL,FPL,DM1,DM2,APP,ROP,TDEP,FAL,IANG,NSP,NRC,NID,PIT,VARI,NUMTH,SDAC,MID,GAMW)
    // -- pins pitch (PIT) in its 13th slot = 1.5000, not a free-floating substring.
    expect(code).toContain(
      "CYCLE99(0, 0, 48.000, -30.000, 0, 0.020, 0.974, 0.020, 60, 0, 1, 0, 1.5000, 1, 1, 0, 0, 0)",
    );
    expect(code).not.toContain("G76 X"); // Siemens has no raw G76 move
  });
});

describe("LatheAIReasoningEngine — Controller Recommendations", () => {
  it("returns Haas-specific recommendations for Haas controller", () => {
    const recs = latheAIReasoningEngine.getControllerRecommendations("Haas ST-20");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some(r => r.title.includes("G95") || r.title.includes("SSV"))).toBe(true);
  });

  it("returns Fanuc-specific recommendations for Fanuc controller", () => {
    const recs = latheAIReasoningEngine.getControllerRecommendations("Fanuc 30i");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some(r => r.title.includes("double-line") || r.title.includes("G76"))).toBe(true);
  });

  it("returns Okuma-specific recommendations for Okuma controller", () => {
    const recs = latheAIReasoningEngine.getControllerRecommendations("Okuma OSP-P300");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some(r => r.title.includes("G199") || r.title.includes("sync"))).toBe(true);
  });

  it("returns LinuxCNC-specific recommendations for PathPilot", () => {
    const recs = latheAIReasoningEngine.getControllerRecommendations("PathPilot");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some(r => r.title.includes("R=2") || r.title.includes("H parameter"))).toBe(true);
  });
});

describe("LatheAIReasoningEngine — Threading Dialect Selection", () => {
  it("selects correct dialect for Fanuc controller", () => {
    const result = latheAIReasoningEngine.selectG76Dialect({
      controller: "Fanuc 0i-TF",
      thread_pitch_mm: 1.5,
      major_diameter_mm: 50,
      thread_length_mm: 25,
      material_iso: "P",
    });
    expect(result.recommended_dialect).toBe("fanuc_double");
    expect(result.dialect_confidence).toBeGreaterThan(0.9);
  });

  it("selects fanuc_double for a Haas controller (Haas is Fanuc-G76 compatible)", () => {
    const result = latheAIReasoningEngine.selectG76Dialect({
      controller: "Haas ST-25",
      thread_pitch_mm: 2.0,
      major_diameter_mm: 40,
      thread_length_mm: 20,
      material_iso: "M",
    });
    expect(result.recommended_dialect).toBe("fanuc_double");
  });

  it("recommends modified flank infeed for coarse pitch", () => {
    const result = latheAIReasoningEngine.selectG76Dialect({
      controller: "Fanuc 30i",
      thread_pitch_mm: 4.0, // Coarse
      major_diameter_mm: 60,
      thread_length_mm: 30,
      material_iso: "P",
    });
    expect(result.infeed_recommendation.method).toBe("modified_flank");
    expect(result.infeed_recommendation.angle).toBeCloseTo(29.5, 0);
  });

  it("includes warnings for coarse pitch on small diameter", () => {
    const result = latheAIReasoningEngine.selectG76Dialect({
      controller: "Fanuc 30i",
      thread_pitch_mm: 2.0,
      major_diameter_mm: 6, // Small
      thread_length_mm: 10,
      material_iso: "P",
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes("Small diameter") || w.includes("coarse pitch"))).toBe(true);
  });

  it("returns tribal tips for threading", () => {
    const result = latheAIReasoningEngine.selectG76Dialect({
      controller: "Haas NGC",
      thread_pitch_mm: 1.5,
      major_diameter_mm: 30,
      thread_length_mm: 20,
      material_iso: "P",
    });
    expect(result.tribal_tips.length).toBeGreaterThan(0);
  });
});

describe("LatheAIReasoningEngine — Operation Sequencing", () => {
  it("sequences face operation before OD operations", () => {
    const result = latheAIReasoningEngine.optimizeSequence([
      { id: "od1", type: "od_straight", tool_type: "CNMG" },
      { id: "face1", type: "face", tool_type: "CNMG" },
      { id: "thread1", type: "thread_od", tool_type: "thread" },
    ]);
    const faceIndex = result.recommended_sequence.indexOf("face1");
    const odIndex = result.recommended_sequence.indexOf("od1");
    expect(faceIndex).toBeLessThan(odIndex);
  });

  it("sequences threading after all turning operations", () => {
    const result = latheAIReasoningEngine.optimizeSequence([
      { id: "thread1", type: "thread_od", tool_type: "thread" },
      { id: "od1", type: "od_rough", tool_type: "CNMG" },
      { id: "od2", type: "od_finish", tool_type: "DNMG" },
    ]);
    const threadIndex = result.recommended_sequence.indexOf("thread1");
    const odIndex = result.recommended_sequence.indexOf("od2");
    expect(threadIndex).toBeGreaterThan(odIndex);
  });

  it("sequences part-off last", () => {
    const result = latheAIReasoningEngine.optimizeSequence([
      { id: "partoff1", type: "part_off", tool_type: "cutoff" },
      { id: "od1", type: "od_rough", tool_type: "CNMG" },
      { id: "groove1", type: "groove_od", tool_type: "groove" },
    ]);
    const partoffIndex = result.recommended_sequence.indexOf("partoff1");
    expect(partoffIndex).toBe(result.recommended_sequence.length - 1);
  });

  it("calculates tool change optimization", () => {
    const result = latheAIReasoningEngine.optimizeSequence([
      { id: "op1", type: "od_rough", tool_type: "CNMG" },
      { id: "op2", type: "od_finish", tool_type: "DNMG" },
      { id: "op3", type: "groove", tool_type: "groove" },
    ]);
    expect(result.tool_change_minimization).toBeDefined();
    expect(result.tool_change_minimization.original_changes).toBeGreaterThanOrEqual(0);
  });

  it("includes tribal tips for sequencing", () => {
    const result = latheAIReasoningEngine.optimizeSequence([
      { id: "op1", type: "od_rough", tool_type: "CNMG" },
    ]);
    // May or may not have tips depending on TK engine state
    expect(result.tribal_tips).toBeDefined();
  });
});

describe("LatheAIReasoningEngine — Parameter Optimization", () => {
  it("reduces speed for titanium (ISO S)", () => {
    const result = latheAIReasoningEngine.optimizeParameters(
      { operation_type: "od_rough", material_iso: "S", diameter_mm: 50 },
      { cutting_speed_m_min: 100, feed_mm_rev: 0.3, depth_of_cut_mm: 2.0 }
    );
    expect(result.optimized_params.cutting_speed_m_min).toBeLessThan(100);
  });

  it("increases speed for aluminum (ISO N)", () => {
    const result = latheAIReasoningEngine.optimizeParameters(
      { operation_type: "od_rough", material_iso: "N", diameter_mm: 50 },
      { cutting_speed_m_min: 100, feed_mm_rev: 0.3, depth_of_cut_mm: 2.0 }
    );
    expect(result.optimized_params.cutting_speed_m_min).toBeGreaterThan(100);
  });

  it("reduces feed for surface_quality target", () => {
    const result = latheAIReasoningEngine.optimizeParameters(
      { operation_type: "od_finish", material_iso: "P", diameter_mm: 50, optimization_target: "surface_quality" },
      { cutting_speed_m_min: 200, feed_mm_rev: 0.2, depth_of_cut_mm: 0.5 }
    );
    expect(result.optimized_params.feed_mm_rev).toBeLessThan(0.2);
  });

  it("reduces speed for max_tool_life target", () => {
    const result = latheAIReasoningEngine.optimizeParameters(
      { operation_type: "od_rough", material_iso: "P", diameter_mm: 50, optimization_target: "max_tool_life" },
      { cutting_speed_m_min: 250, feed_mm_rev: 0.3, depth_of_cut_mm: 2.0 }
    );
    expect(result.optimized_params.cutting_speed_m_min).toBeLessThan(250);
    expect(result.improvement.tool_life_impact).toBe("Improved");
  });

  it("calculates RPM from optimized speed and diameter", () => {
    const result = latheAIReasoningEngine.optimizeParameters(
      { operation_type: "od_rough", material_iso: "P", diameter_mm: 50 },
      { cutting_speed_m_min: 200, feed_mm_rev: 0.3, depth_of_cut_mm: 2.0 }
    );
    const expectedRpm = Math.round((1000 * result.optimized_params.cutting_speed_m_min) / (Math.PI * 50));
    expect(result.optimized_params.spindle_rpm).toBeCloseTo(expectedRpm, 0);
  });

  it("includes cross-domain insights for tool life target", () => {
    const result = latheAIReasoningEngine.optimizeParameters(
      { operation_type: "od_rough", material_iso: "P", diameter_mm: 50, optimization_target: "max_tool_life" },
      { cutting_speed_m_min: 250, feed_mm_rev: 0.3, depth_of_cut_mm: 2.0 }
    );
    expect(result.cross_domain_insights.length).toBeGreaterThan(0);
    expect(result.cross_domain_insights.some(i => i.includes("Taylor"))).toBe(true);
  });
});

describe("LatheAIReasoningEngine — Async Reasoning", () => {
  it("returns recommendations for difficult material", async () => {
    const result = await latheAIReasoningEngine.reason({
      operation_type: "od_rough",
      material_iso: "S",
      material_name: "Ti-6Al-4V",
      diameter_mm: 50,
      length_mm: 100,
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r => r.category === "speed_feed")).toBe(true);
  });

  it("assesses risk for slender parts", async () => {
    const result = await latheAIReasoningEngine.reason({
      operation_type: "od_rough",
      material_iso: "P",
      diameter_mm: 20,
      length_mm: 200, // L/D = 10
    });
    expect(result.risk_assessment.risk_factors.length).toBeGreaterThan(0);
    expect(result.risk_assessment.overall_risk).not.toBe("low");
  });

  it("provides controller-specific recommendations", async () => {
    const result = await latheAIReasoningEngine.reason({
      operation_type: "thread_single_point",
      material_iso: "P",
      controller: "Haas ST-20",
      thread_pitch_mm: 1.5,
    });
    expect(result.recommendations.some(r => r.title.includes("G95") || r.title.includes("Haas"))).toBe(true);
  });

  it("includes tribal tips in reasoning result", async () => {
    const result = await latheAIReasoningEngine.reason({
      operation_type: "od_rough",
      material_iso: "P",
      material_name: "4140 steel",
    });
    expect(result.tribal_tips.length).toBeGreaterThanOrEqual(0);
  });
});

describe("ThreadTurningEngine — Pass Schedule", () => {
  it("calculates constant-area pass schedule", () => {
    const result = threadTurningEngine.calculate({
      pitch_mm: 2.0,
      major_diameter_mm: 50,
      material_iso_group: "P",
    });
    expect(result.pass_schedule.length).toBeGreaterThan(0);
    expect(result.pass_schedule[0].depth_mm).toBeGreaterThan(result.pass_schedule[result.pass_schedule.length - 1].depth_mm);
  });

  it("recommends spring passes", () => {
    const result = threadTurningEngine.calculate({
      pitch_mm: 1.5,
      major_diameter_mm: 30,
      num_spring_passes: 3,
    });
    expect(result.spring_passes.value).toBe(3);
  });

  it("selects flank infeed for medium pitch", () => {
    const result = threadTurningEngine.calculate({
      pitch_mm: 2.0,
      major_diameter_mm: 30,
    });
    expect(result.infeed_method).toBe("flank");
    expect(result.infeed_angle.value).toBe(30);
  });

  it("selects modified flank for coarse pitch", () => {
    const result = threadTurningEngine.calculate({
      pitch_mm: 4.0,
      major_diameter_mm: 60,
    });
    expect(result.infeed_method).toBe("modified_flank");
    expect(result.infeed_angle.value).toBeCloseTo(29.5, 0);
  });
});
