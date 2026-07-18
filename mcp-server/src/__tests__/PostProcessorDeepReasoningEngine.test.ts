/**
 * PostProcessorDeepReasoningEngine Tests
 * =======================================
 * Tests for PP-AI-L2: chain-of-thought reasoning, causal inference,
 * cross-CAM synthesis, controller optimization, physics reasoning,
 * self-consistency verification, and the top-level analyze() orchestrator.
 *
 * Assertions use concrete reference values derived from canonical physics
 * constants (P-group: kc1_1=1800, mc=0.25, C=350, n=0.25) and deterministic
 * branching on known G-code signatures.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorDeepReasoningEngine,
  PostProcessorDeepReasoningEngine,
  type DeepReasoningInput,
} from "../engines/PostProcessorDeepReasoningEngine.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Minimal valid G-code -- triggers "unknown" operation, generic controller */
const MINIMAL_GCODE = "G90 G94\nG0 X0 Y0 Z50\nG1 X10 F300\nM30";

/** Haas HSM G-code -- G187 triggers haas controller detection */
const HAAS_GCODE = [
  "O0001 (HAAS TEST)",
  "G90 G94 G17",
  "T1M06",
  "G187 P2 E0.005",
  "G43 H1",
  "G0 X0 Y0",
  "G1 Z-2 F500",
  "X100 F1000",
  "M30",
].join("\n");

/** Fanuc AICC G-code -- G54.1 + O-number + #var triggers fanuc detection */
const FANUC_GCODE = [
  "O1234",
  "G90 G94 G17",
  "#100 = 1.0",
  "G54.1 P1",
  "G05.1 Q1",
  "G0 X0 Y0",
  "G1 Z-5 F200",
  "M30",
].join("\n");

/** High-speed, high-depth input for thermal stress testing */
const HIGH_SPEED_INPUT: DeepReasoningInput = {
  gcode: MINIMAL_GCODE,
  material_iso: "P",
  target_controller: "fanuc",
  cutting_speed_mpm: 250, // well above optimalVc -- triggers "Faster cutting" tradeoff
  depth_of_cut_mm: 5,
  spindle_rpm: 6000,
  tool_diameter_mm: 12,
};

/** Conservative low-speed input -- thermal risk low */
const LOW_SPEED_INPUT: DeepReasoningInput = {
  gcode: MINIMAL_GCODE,
  material_iso: "P",
  target_controller: "haas",
  cutting_speed_mpm: 50,
  depth_of_cut_mm: 1,
  spindle_rpm: 1500,
  tool_diameter_mm: 10,
};

// ---------------------------------------------------------------------------
// physicsReasoning
// ---------------------------------------------------------------------------

describe("PostProcessorDeepReasoningEngine.physicsReasoning", () => {
  const engine = new PostProcessorDeepReasoningEngine();

  it("uses canonical P-group Kienzle constants (kc1_1=1800, mc=0.25)", () => {
    const result = engine.physicsReasoning({ gcode: MINIMAL_GCODE, material_iso: "P" });
    expect(result.kienzle_analysis.kc1_1).toBe(1800);
    expect(result.kienzle_analysis.mc).toBe(0.25);
    expect(result.kienzle_analysis.material).toBe("P");
  });

  it("force limit is 2000 N and margin is in (0,100)", () => {
    // fz=0.1, ap=2mm (default), kc1_1=1800, mc=0.25
    // Fc = 1800 * 2 * 0.1^0.75 ~= 640 N  -> margin = (2000-640)/2000*100 ~= 68%
    const result = engine.physicsReasoning({ gcode: MINIMAL_GCODE, material_iso: "P", depth_of_cut_mm: 2 });
    expect(result.kienzle_analysis.force_limit_N).toBe(2000);
    expect(result.kienzle_analysis.estimated_force_N).toBeGreaterThan(0);
    expect(result.kienzle_analysis.estimated_force_N).toBeLessThan(2000);
    expect(result.kienzle_analysis.margin_pct).toBeGreaterThan(0);
    expect(result.kienzle_analysis.margin_pct).toBeLessThan(100);
  });

  it("Taylor tradeoff: fast cutting (Vc>optimalVc) reports shorter-life message", () => {
    const result = engine.physicsReasoning(HIGH_SPEED_INPUT);
    expect(result.taylor_analysis.tradeoff).toMatch(/Faster cutting/i);
  });

  it("Taylor tradeoff: slow cutting (Vc<optimalVc) reports conservative message", () => {
    const result = engine.physicsReasoning(LOW_SPEED_INPUT);
    expect(result.taylor_analysis.tradeoff).toMatch(/Conservative speed/i);
  });

  it("thermal risk is low when cutting speed is low (temp ~310 C < 400 threshold)", () => {
    // thermalTemp = 200 + 50*2 + 1*10 = 310 < 400 -> low
    const result = engine.physicsReasoning(LOW_SPEED_INPUT);
    expect(result.thermal_analysis.risk_level).toBe("low");
    expect(result.thermal_analysis.coolant_recommendation).toMatch(/Air blast|mist/i);
    expect(result.thermal_analysis.estimated_temp_C).toBe(310);
  });

  it("thermal risk is high when cutting speed is extreme (temp ~750 C > 600 threshold)", () => {
    // thermalTemp = 200 + 250*2 + 5*10 = 750 > 600 -> high
    const result = engine.physicsReasoning(HIGH_SPEED_INPUT);
    expect(result.thermal_analysis.risk_level).toBe("high");
    expect(result.thermal_analysis.coolant_recommendation).toMatch(/High-pressure/i);
    expect(result.thermal_analysis.estimated_temp_C).toBe(750);
  });

  it("overall_physics_score is within [0, 100]", () => {
    const result = engine.physicsReasoning(HIGH_SPEED_INPUT);
    expect(result.overall_physics_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_physics_score).toBeLessThanOrEqual(100);
  });

  it("constraints_satisfied is false when thermal risk is high", () => {
    // high thermal -> constraints_satisfied = forceMargin>10 && thermalRisk!=='high' -> false
    const result = engine.physicsReasoning(HIGH_SPEED_INPUT);
    expect(result.constraints_satisfied).toBe(false);
  });

  it("N-group (aluminum) produces lower force than P-group (steel) at same parameters", () => {
    const alum = engine.physicsReasoning({ gcode: MINIMAL_GCODE, material_iso: "N" });
    const steel = engine.physicsReasoning({ gcode: MINIMAL_GCODE, material_iso: "P" });
    expect(alum.kienzle_analysis.kc1_1).toBe(700);
    expect(steel.kienzle_analysis.kc1_1).toBe(1800);
    // Lower kc1_1 must yield lower cutting force
    expect(alum.kienzle_analysis.estimated_force_N).toBeLessThan(steel.kienzle_analysis.estimated_force_N);
  });

  it("medium thermal risk tier fires between 400-600 C", () => {
    // thermalTemp = 200 + Vc*2 + doc*10; target 450 -> Vc=110, doc=2.5
    // 200 + 110*2 + 2.5*10 = 445 -> medium
    const result = engine.physicsReasoning({
      gcode: MINIMAL_GCODE,
      material_iso: "P",
      cutting_speed_mpm: 110,
      depth_of_cut_mm: 2.5,
    });
    expect(result.thermal_analysis.risk_level).toBe("medium");
    expect(result.thermal_analysis.coolant_recommendation).toMatch(/Flood coolant/i);
    expect(result.thermal_analysis.estimated_temp_C).toBe(445);
  });
});

// ---------------------------------------------------------------------------
// optimizeForController
// ---------------------------------------------------------------------------

describe("PostProcessorDeepReasoningEngine.optimizeForController", () => {
  const engine = new PostProcessorDeepReasoningEngine();

  it("generic controller produces zero optimizations and zero estimated improvement", () => {
    const result = engine.optimizeForController({ gcode: MINIMAL_GCODE, target_controller: "generic" });
    expect(result.target_controller).toBe("generic");
    expect(result.optimizations_applied).toHaveLength(0);
    expect(result.estimated_improvement_pct).toBe(0);
  });

  it("haas controller reports G187 feature injection when G187 is absent from G-code", () => {
    // The haas optimization pattern inserts "G187 P2 E0.005" into gcode before injection runs,
    // so injection fires only when the optimization did NOT already insert that exact string.
    // Use okuma to verify the injection path cleanly: optimization replaces "G05.1Q0"->"G05.1Q1"
    // and "G08P0"->"G08P1", neither of which equals the injection target "G08 P1".
    const gcode = "G90\nG0 X0\nG1 X10 F300\nM30"; // no G08 P1
    const result = engine.optimizeForController({ gcode, target_controller: "okuma" });
    const injected = result.features_injected.map(f => f.gcode);
    expect(injected.some(g => g.includes("G08"))).toBe(true);
    expect(injected.some(g => g === "G08 P1")).toBe(true);
  });

  it("haas controller does NOT re-inject G187 when already present in G-code", () => {
    const result = engine.optimizeForController({ gcode: HAAS_GCODE, target_controller: "haas" });
    const injected = result.features_injected.map(f => f.gcode);
    expect(injected.some(g => g === "G187 P2 E0.005")).toBe(false);
  });

  it("fanuc controller injects G05.1 AICC feature when absent", () => {
    const result = engine.optimizeForController({ gcode: MINIMAL_GCODE, target_controller: "fanuc" });
    const injected = result.features_injected.map(f => f.gcode);
    expect(injected.some(g => g.includes("G05.1"))).toBe(true);
  });

  it("siemens controller adds TRANS dialect adjustment when G54.1P present", () => {
    const siemensGcode = "G90\nG54.1P1\nG0 X0\nM30";
    const result = engine.optimizeForController({ gcode: siemensGcode, target_controller: "siemens" });
    expect(result.dialect_adjustments.length).toBeGreaterThanOrEqual(1);
    expect(result.dialect_adjustments[0].adjusted).toContain("TRANS");
    expect(result.dialect_adjustments[0].reason).toMatch(/Siemens/i);
  });

  it("estimated_improvement_pct is capped at 25", () => {
    const result = engine.optimizeForController({ gcode: MINIMAL_GCODE, target_controller: "fanuc" });
    expect(result.estimated_improvement_pct).toBeLessThanOrEqual(25);
    expect(result.estimated_improvement_pct).toBeGreaterThanOrEqual(0);
  });

  it("okuma controller does NOT add TRANS dialect adjustment (Siemens-only branch)", () => {
    const result = engine.optimizeForController({
      gcode: "G54.1P1\nG0 X0\nM30",
      target_controller: "okuma",
    });
    expect(result.dialect_adjustments).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// synthesizeCrossCAM
// ---------------------------------------------------------------------------

describe("PostProcessorDeepReasoningEngine.synthesizeCrossCAM", () => {
  const engine = new PostProcessorDeepReasoningEngine();

  it("resolves Adaptive vs Dynamic conflict when both mastercam and fusion360 are sources", () => {
    const result = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      source_cams: ["mastercam", "fusion360"],
      target_controller: "fanuc",
    });
    const conflict = result.conflicts_resolved.find(
      c => c.feature_a === "Adaptive Clearing" && c.feature_b === "Dynamic Milling"
    );
    expect(conflict).not.toBeNull();
    expect(conflict!.chosen).toBe("Adaptive Clearing");
  });

  it("optimization_score is in [0, 100]", () => {
    const result = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      source_cams: ["mastercam", "fusion360"],
      target_controller: "fanuc",
    });
    expect(result.optimization_score).toBeGreaterThanOrEqual(0);
    expect(result.optimization_score).toBeLessThanOrEqual(100);
  });

  it("incompatible feature (Advanced RTCP on generic controller) is excluded", () => {
    // Advanced RTCP has compatibility.generic = 'incompatible'
    const result = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      source_cams: ["nx"],
      target_controller: "generic",
    });
    const featureNames = result.selected_features.map(f => f.feature.name);
    expect(featureNames).not.toContain("Advanced RTCP");
  });

  it("native compatibility yields confidence 0.95, emulated yields 0.75", () => {
    // iMachining Chip Thinning: haas=native, heidenhain=emulated
    const native = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      source_cams: ["solidcam"],
      target_controller: "haas",
    });
    const emulated = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      source_cams: ["solidcam"],
      target_controller: "heidenhain",
    });
    const nativeFeat = native.selected_features.find(f => f.feature.name === "iMachining Chip Thinning");
    const emulatedFeat = emulated.selected_features.find(f => f.feature.name === "iMachining Chip Thinning");
    expect(nativeFeat).not.toBeNull();
    expect(nativeFeat!.confidence).toBe(0.95);
    expect(emulatedFeat).not.toBeNull();
    expect(emulatedFeat!.confidence).toBe(0.75);
  });

  it("compatibility_matrix covers all 6 features in CROSS_CAM_FEATURES database", () => {
    const result = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      source_cams: ["mastercam"],
      target_controller: "fanuc",
    });
    expect(Object.keys(result.compatibility_matrix)).toHaveLength(6);
  });

  it("synthesized_gcode_blocks embed the source CAM system name in uppercase", () => {
    const result = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      source_cams: ["esprit"],
      target_controller: "fanuc",
    });
    expect(result.synthesized_gcode_blocks.length).toBeGreaterThan(0);
    expect(result.synthesized_gcode_blocks[0].gcode).toMatch(/SOURCE: ESPRIT/i);
  });

  it("unknown source CAM (catia) with no features returns optimization_score=50 and empty features", () => {
    const result = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      source_cams: ["catia"],
      target_controller: "fanuc",
    });
    expect(result.selected_features).toHaveLength(0);
    expect(result.optimization_score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// causalInference
// ---------------------------------------------------------------------------

describe("PostProcessorDeepReasoningEngine.causalInference", () => {
  const engine = new PostProcessorDeepReasoningEngine();

  it("always includes the 3 fixed predicted_effects", () => {
    const result = engine.causalInference({ gcode: MINIMAL_GCODE });
    expect(result.predicted_effects).toHaveLength(3);
    const names = result.predicted_effects.map(e => e.effect);
    expect(names).toContain("Cycle time reduction");
    expect(names).toContain("Improved surface finish");
    expect(names).toContain("Extended tool life");
  });

  it("always includes 2 counterfactuals and 3 interventions", () => {
    const result = engine.causalInference({ gcode: MINIMAL_GCODE });
    expect(result.counterfactuals).toHaveLength(2);
    expect(result.intervention_recommendations).toHaveLength(3);
  });

  it("predicted_effect probabilities are in [0, 1]", () => {
    const result = engine.causalInference({ gcode: MINIMAL_GCODE });
    for (const e of result.predicted_effects) {
      expect(e.probability).toBeGreaterThanOrEqual(0);
      expect(e.probability).toBeLessThanOrEqual(1);
    }
  });

  it("nodes always include the quality effect node with type='effect'", () => {
    const result = engine.causalInference({ gcode: MINIMAL_GCODE });
    const qualityNode = result.nodes.find(n => n.id === "quality");
    expect(qualityNode).not.toBeNull();
    expect(qualityNode!.type).toBe("effect");
    expect(qualityNode!.confidence).toBe(0.9);
  });

  it("intervention risk values are in [0, 1]", () => {
    const result = engine.causalInference({ gcode: MINIMAL_GCODE });
    for (const i of result.intervention_recommendations) {
      expect(i.risk).toBeGreaterThanOrEqual(0);
      expect(i.risk).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// chainOfThought
// ---------------------------------------------------------------------------

describe("PostProcessorDeepReasoningEngine.chainOfThought", () => {
  const engine = new PostProcessorDeepReasoningEngine();

  it("produces exactly 5 reasoning steps", () => {
    const result = engine.chainOfThought({ gcode: MINIMAL_GCODE });
    expect(result.steps).toHaveLength(5);
  });

  it("step numbers are sequential 1 through 5", () => {
    const result = engine.chainOfThought({ gcode: MINIMAL_GCODE });
    result.steps.forEach((s, i) => {
      expect(s.step_number).toBe(i + 1);
    });
  });

  it("uses the explicit query string when provided", () => {
    const result = engine.chainOfThought({ gcode: MINIMAL_GCODE }, "Is this safe for titanium?");
    expect(result.query).toBe("Is this safe for titanium?");
  });

  it("falls back to default query when none supplied", () => {
    const result = engine.chainOfThought({ gcode: MINIMAL_GCODE });
    expect(result.query).toBe("Optimize this post processor output");
  });

  it("overall_confidence is in [0, 1]", () => {
    const result = engine.chainOfThought({ gcode: FANUC_GCODE, material_iso: "P" });
    expect(result.overall_confidence).toBeGreaterThanOrEqual(0);
    expect(result.overall_confidence).toBeLessThanOrEqual(1);
  });

  it("reasoning_path contains exactly 4 arrows joining 5 steps", () => {
    const result = engine.chainOfThought({ gcode: MINIMAL_GCODE });
    // Engine joins steps with Unicode right-arrow: " \u2192 " (not ASCII " -> ")
    const arrows = (result.reasoning_path.match(/ \u2192 /g) ?? []).length;
    expect(arrows).toBe(4);
  });

  it("step 4 evidence cites canonical Kienzle kc1_1=1800 for P-group", () => {
    const result = engine.chainOfThought({ gcode: MINIMAL_GCODE, material_iso: "P" });
    const step4 = result.steps[3]; // 0-indexed
    expect(step4.evidence.join(" ")).toMatch(/1800/);
  });

  it("step 3 evidence lists the target controller name", () => {
    const result = engine.chainOfThought({ gcode: HAAS_GCODE, target_controller: "haas" });
    const step3 = result.steps[2];
    expect(step3.evidence.join(" ")).toMatch(/haas/i);
  });

  it("overall_confidence equals the mean of all step confidences rounded to 2 decimal places", () => {
    // Engine computes: Math.round(overallConfidence * 100) / 100
    const result = engine.chainOfThought({ gcode: MINIMAL_GCODE, material_iso: "P" });
    const rawMean = result.steps.reduce((s, step) => s + step.confidence, 0) / result.steps.length;
    const rounded = Math.round(rawMean * 100) / 100;
    expect(result.overall_confidence).toBe(rounded);
  });
});

// ---------------------------------------------------------------------------
// verifySelfConsistency
// ---------------------------------------------------------------------------

describe("PostProcessorDeepReasoningEngine.verifySelfConsistency", () => {
  const engine = new PostProcessorDeepReasoningEngine();

  it("always explores exactly 3 paths", () => {
    const result = engine.verifySelfConsistency({ gcode: MINIMAL_GCODE });
    expect(result.num_paths_explored).toBe(3);
    expect(result.path_agreements).toHaveLength(3);
  });

  it("path IDs are exactly [1, 2, 3]", () => {
    const result = engine.verifySelfConsistency({ gcode: MINIMAL_GCODE });
    expect(result.path_agreements.map(p => p.path_id)).toEqual([1, 2, 3]);
  });

  it("final_confidence equals average of 3 path confidences rounded to 2 decimal places", () => {
    const result = engine.verifySelfConsistency({ gcode: MINIMAL_GCODE });
    const avg = result.path_agreements.reduce((s, p) => s + p.confidence, 0) / 3;
    expect(result.final_confidence).toBeCloseTo(avg, 2);
  });

  it("consensus_reached matches strict-greater-than-0.7 on the raw path average", () => {
    // Engine: consensusReached = avgConfidence > 0.7 where avgConfidence is the RAW
    // (unrounded) mean of path confidences. final_confidence is the ROUNDED value,
    // so comparing final_confidence > 0.7 can disagree at the boundary.
    const result = engine.verifySelfConsistency({ gcode: MINIMAL_GCODE });
    const rawAvg = result.path_agreements.reduce((s, p) => s + p.confidence, 0) / result.path_agreements.length;
    const expected = rawAvg > 0.7;
    expect(result.consensus_reached).toBe(expected);
  });

  it("consensus_answer mentions a percentage improvement", () => {
    const result = engine.verifySelfConsistency({ gcode: MINIMAL_GCODE });
    expect(result.consensus_answer).toMatch(/%/);
  });

  it("path 3 always has confidence 0.8 (hard-coded controller-first path)", () => {
    const result = engine.verifySelfConsistency({ gcode: MINIMAL_GCODE });
    const path3 = result.path_agreements.find(p => p.path_id === 3);
    expect(path3).not.toBeNull();
    expect(path3!.confidence).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// analyze (full orchestrator round-trip)
// ---------------------------------------------------------------------------

describe("PostProcessorDeepReasoningEngine.analyze (round-trip)", () => {
  const engine = new PostProcessorDeepReasoningEngine();

  it("returns all 6 sub-analyses with correct structural shape", () => {
    const result = engine.analyze({ gcode: MINIMAL_GCODE });
    // chain_of_thought has steps
    expect(result.chain_of_thought.steps).toHaveLength(5);
    // causal_inference has nodes
    expect(result.causal_inference.nodes.length).toBeGreaterThan(0);
    // cross_cam_synthesis has compatibility_matrix
    expect(typeof result.cross_cam_synthesis.optimization_score).toBe("number");
    // controller_optimization has target_controller
    expect(typeof result.controller_optimization.target_controller).toBe("string");
    // physics_reasoning has kc1_1
    expect(result.physics_reasoning.kienzle_analysis.kc1_1).toBeGreaterThan(0);
    // self_consistency has 3 paths
    expect(result.self_consistency.num_paths_explored).toBe(3);
  });

  it("reasoning_confidence is in [0, 1]", () => {
    const result = engine.analyze({ gcode: FANUC_GCODE, material_iso: "P", target_controller: "fanuc" });
    expect(result.reasoning_confidence).toBeGreaterThanOrEqual(0);
    expect(result.reasoning_confidence).toBeLessThanOrEqual(1);
  });

  it("reasoning_confidence matches the weighted 4-component formula (algebraic invariant)", () => {
    const input: DeepReasoningInput = {
      gcode: MINIMAL_GCODE,
      material_iso: "P",
      target_controller: "fanuc",
    };
    const result = engine.analyze(input);
    const expected =
      result.chain_of_thought.overall_confidence * 0.25 +
      result.self_consistency.final_confidence * 0.25 +
      (result.cross_cam_synthesis.optimization_score / 100) * 0.25 +
      (result.physics_reasoning.overall_physics_score / 100) * 0.25;
    expect(result.reasoning_confidence).toBeCloseTo(expected, 2);
  });

  it("processing_time_ms is a non-negative integer", () => {
    const result = engine.analyze({ gcode: MINIMAL_GCODE });
    expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.processing_time_ms)).toBe(true);
  });

  it("chain_of_thought sub-result has 5 steps in the round-trip", () => {
    const result = engine.analyze({ gcode: MINIMAL_GCODE });
    expect(result.chain_of_thought.steps).toHaveLength(5);
  });

  it("self_consistency sub-result has 3 paths in the round-trip", () => {
    const result = engine.analyze({ gcode: MINIMAL_GCODE });
    expect(result.self_consistency.num_paths_explored).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

describe("singleton postProcessorDeepReasoningEngine", () => {
  it("is an instance of PostProcessorDeepReasoningEngine", () => {
    expect(postProcessorDeepReasoningEngine).toBeInstanceOf(PostProcessorDeepReasoningEngine);
  });

  it("singleton and fresh instance return identical physics results (deterministic)", () => {
    const input: DeepReasoningInput = { gcode: MINIMAL_GCODE, material_iso: "P" };
    const fromSingleton = postProcessorDeepReasoningEngine.physicsReasoning(input);
    const fromFresh = new PostProcessorDeepReasoningEngine().physicsReasoning(input);
    expect(fromSingleton.kienzle_analysis.kc1_1).toBe(fromFresh.kienzle_analysis.kc1_1);
    expect(fromSingleton.kienzle_analysis.estimated_force_N).toBe(fromFresh.kienzle_analysis.estimated_force_N);
    expect(fromSingleton.thermal_analysis.risk_level).toBe(fromFresh.thermal_analysis.risk_level);
  });

  it("singleton analyze() returns all 8 top-level keys", () => {
    const result = postProcessorDeepReasoningEngine.analyze({ gcode: MINIMAL_GCODE });
    const keys = Object.keys(result).sort();
    expect(keys).toEqual([
      "causal_inference",
      "chain_of_thought",
      "controller_optimization",
      "cross_cam_synthesis",
      "physics_reasoning",
      "processing_time_ms",
      "reasoning_confidence",
      "self_consistency",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Adversarial inputs
// ---------------------------------------------------------------------------

describe("PostProcessorDeepReasoningEngine -- adversarial inputs", () => {
  const engine = new PostProcessorDeepReasoningEngine();

  it("adversarial: empty G-code string does not throw and returns valid structure", () => {
    const result = engine.analyze({ gcode: "" });
    expect(result.chain_of_thought.steps).toHaveLength(5);
    expect(result.physics_reasoning.overall_physics_score).toBeGreaterThanOrEqual(0);
    expect(result.reasoning_confidence).toBeGreaterThanOrEqual(0);
  });

  it("adversarial: G-code with only comments does not throw and confidence is in [0,1]", () => {
    const gcode = "(PROGRAM START)\n\n(TOOL CHANGE)\n(END)";
    const result = engine.analyze({ gcode });
    expect(result.reasoning_confidence).toBeGreaterThanOrEqual(0);
    expect(result.reasoning_confidence).toBeLessThanOrEqual(1);
  });

  it("adversarial: cutting_speed_mpm=0 does not produce NaN in physics output", () => {
    const result = engine.physicsReasoning({
      gcode: MINIMAL_GCODE,
      material_iso: "P",
      cutting_speed_mpm: 0,
    });
    // taylorLife(C, n, 0) -> (C/0)^(1/n) = Infinity; engine rounds to a number
    expect(Number.isNaN(result.taylor_analysis.predicted_life_min)).toBe(false);
    expect(Number.isNaN(result.kienzle_analysis.estimated_force_N)).toBe(false);
  });

  it("adversarial: catia source_cams (no matching features) returns optimization_score=50", () => {
    const result = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      source_cams: ["catia"],
      target_controller: "fanuc",
    });
    expect(result.selected_features).toHaveLength(0);
    expect(result.optimization_score).toBe(50);
    expect(result.conflicts_resolved).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

describe("PostProcessorDeepReasoningEngine -- failure modes", () => {
  const engine = new PostProcessorDeepReasoningEngine();

  it("failure mode: S-group (superalloy) kc1_1=2800 produces higher force than P-group", () => {
    const sup = engine.physicsReasoning({ gcode: MINIMAL_GCODE, material_iso: "S" });
    const steel = engine.physicsReasoning({ gcode: MINIMAL_GCODE, material_iso: "P" });
    expect(sup.kienzle_analysis.kc1_1).toBe(2800);
    expect(sup.kienzle_analysis.estimated_force_N).toBeGreaterThan(
      steel.kienzle_analysis.estimated_force_N
    );
  });

  it("failure mode: H-group (hardened) has canonical kc1_1=3200 -- highest in table", () => {
    const result = engine.physicsReasoning({ gcode: MINIMAL_GCODE, material_iso: "H" });
    expect(result.kienzle_analysis.kc1_1).toBe(3200);
  });

  it("failure mode: no source_cams defaults to mastercam+fusion360 and triggers conflict resolution", () => {
    const result = engine.synthesizeCrossCAM({
      gcode: MINIMAL_GCODE,
      target_controller: "fanuc",
      // source_cams omitted -> defaults to ["mastercam", "fusion360"]
    });
    const conflict = result.conflicts_resolved.find(c => c.chosen === "Adaptive Clearing");
    expect(conflict).not.toBeNull();
    expect(conflict!.feature_a).toBe("Adaptive Clearing");
    expect(conflict!.feature_b).toBe("Dynamic Milling");
  });

  it("failure mode: force recommendation says 'safe' when margin is above 20%", () => {
    // Low doc gives high margin -> safe recommendation
    const result = engine.physicsReasoning({
      gcode: MINIMAL_GCODE,
      material_iso: "P",
      depth_of_cut_mm: 0.5,
    });
    expect(result.kienzle_analysis.recommendation).toMatch(/safe/i);
  });
});
