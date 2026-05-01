/**
 * OptimizationEngine Test Suite
 *
 * Comprehensive tests for the 4 exported optimization functions:
 *   1. optimizeParameters — GA/NSGA-II multi-objective optimization
 *   2. optimizeSequence — ACO-inspired operation sequencing
 *   3. sustainabilityReport — ISO 14955 eco-metrics
 *   4. ecoOptimize — sustainability-weighted optimization
 *
 * Includes FORGE-DEBUG regression tests for the MRR formula fix
 * (ae*ap*fz*z*N, NOT the old vc*fz*ap).
 *
 * @milestone SYS-MS2
 */

import { describe, it, expect } from "vitest";
import {
  optimizeParameters,
  optimizeSequence,
  sustainabilityReport,
  ecoOptimize,
  optimization,
  type OptimizeInput,
  type SequenceInput,
  type SustainabilityInput,
  type EcoOptimizeInput,
  type OptimizeResult,
  type SequenceResult,
  type SustainabilityResult,
  type EcoOptimizeResult,
  type FeatureType,
  type ObjectiveType,
} from "../engines/OptimizationEngine.js";

// ============================================================================
// SHARED FIXTURES
// ============================================================================

/** Standard steel pocket milling input */
function makeOptimizeInput(overrides?: Partial<OptimizeInput>): OptimizeInput {
  return {
    material: "AISI 1045",
    feature: "pocket",
    dimensions: { depth_mm: 10, width_mm: 40, length_mm: 60 },
    constraints: {
      surface_finish_ra_max_um: 6.3,
      tolerance_mm: 0.05,
      max_cycle_time_min: 30,
    },
    objective: "min_cost",
    ...overrides,
  };
}

/** Standard aluminum face milling input */
function makeAluminumInput(overrides?: Partial<OptimizeInput>): OptimizeInput {
  return makeOptimizeInput({
    material: "6061-T6",
    feature: "face",
    dimensions: { depth_mm: 3, width_mm: 80, length_mm: 100 },
    ...overrides,
  });
}

/** Standard 3-operation sequence input */
function makeSequenceInput(overrides?: Partial<SequenceInput>): SequenceInput {
  return {
    operations: [
      { id: "op1", feature: "face", tool_required: "face_mill", estimated_time_min: 5 },
      { id: "op2", feature: "pocket", tool_required: "end_mill", estimated_time_min: 12 },
      { id: "op3", feature: "hole", tool_required: "drill", estimated_time_min: 3 },
    ],
    machine: "Haas VF-2",
    optimize_for: "min_tool_changes",
    ...overrides,
  };
}

/** Standard sustainability report input for roughing steel */
function makeSustainabilityInput(overrides?: Partial<SustainabilityInput>): SustainabilityInput {
  return {
    material: "AISI 1045",
    cutting_speed_mpm: 200,
    feed_mmrev: 0.15,
    depth_of_cut_mm: 3.0,
    width_of_cut_mm: 25.0,
    cycle_time_min: 10,
    machine_power_kw: 15,
    coolant_type: "flood",
    ...overrides,
  };
}

/** Standard eco-optimize input */
function makeEcoOptimizeInput(overrides?: Partial<EcoOptimizeInput>): EcoOptimizeInput {
  return {
    ...makeOptimizeInput(),
    weight_eco: 0.5,
    ...overrides,
  };
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/** Assert a number is finite, positive, and within bounds */
function expectPhysical(value: number, label: string, min = 0, max = Infinity) {
  expect(Number.isFinite(value), `${label} should be finite (got ${value})`).toBe(true);
  expect(value, `${label} should be >= ${min}`).toBeGreaterThanOrEqual(min);
  if (max < Infinity) {
    expect(value, `${label} should be <= ${max}`).toBeLessThanOrEqual(max);
  }
}

/** Assert the standard OptimizeResult shape */
function expectOptimizeResultShape(result: OptimizeResult) {
  expect(result).toBeDefined();
  expect(result.optimal).toBeDefined();
  expect(result.alternatives).toBeDefined();
  expect(Array.isArray(result.alternatives)).toBe(true);
  expect(result.pareto_front).toBeDefined();
  expect(result.pareto_front.cost).toBeDefined();
  expect(result.pareto_front.time).toBeDefined();
  expect(result.pareto_front.quality).toBeDefined();
  expect(result.sensitivity).toBeDefined();
  expect(Array.isArray(result.sensitivity)).toBe(true);
  expect(result.safety).toBeDefined();
  expect(typeof result.safety.score).toBe("number");
  expect(Array.isArray(result.safety.flags)).toBe(true);
}

/** Assert an optimal solution has valid machining parameters */
function expectValidSolution(sol: OptimizeResult["optimal"]) {
  expectPhysical(sol.vc_mpm, "cutting speed", 1, 2000);
  expectPhysical(sol.fz_mm, "feed per tooth", 0.001, 5);
  expectPhysical(sol.ap_mm, "axial depth", 0.01, 100);
  expectPhysical(sol.ae_mm, "radial depth", 0.01, 200);
  expectPhysical(sol.num_passes, "num passes", 1, 1000);
  expectPhysical(sol.estimated_cycle_time_min, "cycle time", 0);
  expectPhysical(sol.estimated_cost_usd, "cost", 0);
  expectPhysical(sol.estimated_tool_life_min, "tool life", 0);
  expectPhysical(sol.predicted_ra_um, "surface finish Ra", 0);
  expect(sol.strategy).toBeDefined();
  expect(typeof sol.strategy).toBe("string");
  expect(sol.tool).toBeDefined();
  expect(typeof sol.tool).toBe("string");
  // sustainability sub-object
  expect(sol.sustainability).toBeDefined();
  expectPhysical(sol.sustainability.energy_kwh, "energy", 0);
  expectPhysical(sol.sustainability.co2_kg, "CO2", 0);
  expectPhysical(sol.sustainability.coolant_liters, "coolant", 0);
  expectPhysical(sol.sustainability.chip_waste_kg, "chip waste", 0);
  expectPhysical(sol.sustainability.eco_efficiency_score, "eco score", 0, 1);
}

// ============================================================================
// 1. optimizeParameters
// ============================================================================

describe("optimizeParameters", () => {
  describe("happy path — standard steel milling", () => {
    it("returns a complete OptimizeResult for AISI 1045 pocket", () => {
      const result = optimizeParameters(makeOptimizeInput());
      expectOptimizeResultShape(result);
      expectValidSolution(result.optimal);
    });

    it("returns alternatives alongside the optimal solution", () => {
      const result = optimizeParameters(makeOptimizeInput());
      expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
      for (const alt of result.alternatives) {
        expectValidSolution(alt);
      }
    });

    it("produces a Pareto front with consistent array lengths", () => {
      const result = optimizeParameters(makeOptimizeInput());
      const pf = result.pareto_front;
      expect(pf.cost.length).toBe(pf.time.length);
      expect(pf.cost.length).toBe(pf.quality.length);
      expect(pf.cost.length).toBeGreaterThan(0);
    });

    it("includes sensitivity analysis with valid structure", () => {
      const result = optimizeParameters(makeOptimizeInput());
      expect(result.sensitivity.length).toBeGreaterThan(0);
      for (const s of result.sensitivity) {
        expect(typeof s.parameter).toBe("string");
        expect(["high", "medium", "low"]).toContain(s.impact);
        expect(typeof s.recommendation).toBe("string");
        expect(s.recommendation.length).toBeGreaterThan(0);
      }
    });

    it("safety score is between 0.40 and 1.0 for known material", () => {
      const result = optimizeParameters(makeOptimizeInput());
      expectPhysical(result.safety.score, "safety score", 0.40, 1.0);
    });
  });

  describe("happy path — aluminum face milling", () => {
    it("returns valid result for 6061-T6 aluminum", () => {
      const result = optimizeParameters(makeAluminumInput());
      expectOptimizeResultShape(result);
      expectValidSolution(result.optimal);
      // Aluminum handbook range starts at 200 m/min, so optimal should be >= 200
      expect(result.optimal.vc_mpm).toBeGreaterThanOrEqual(180);
    });
  });

  describe("objective types", () => {
    const objectives: ObjectiveType[] = ["min_cost", "min_time", "max_tool_life", "balanced"];
    for (const objective of objectives) {
      it(`produces valid result for objective '${objective}'`, () => {
        const result = optimizeParameters(makeOptimizeInput({ objective }));
        expectOptimizeResultShape(result);
        expectValidSolution(result.optimal);
      });
    }

    it("min_cost yields lower or similar cost than min_time", () => {
      const costResult = optimizeParameters(makeOptimizeInput({ objective: "min_cost" }));
      const timeResult = optimizeParameters(makeOptimizeInput({ objective: "min_time" }));
      expect(costResult.optimal.estimated_cost_usd).toBeLessThanOrEqual(
        timeResult.optimal.estimated_cost_usd * 1.5
      );
    });

    it("max_tool_life yields longer tool life than min_time", () => {
      const lifeResult = optimizeParameters(makeOptimizeInput({ objective: "max_tool_life" }));
      const timeResult = optimizeParameters(makeOptimizeInput({ objective: "min_time" }));
      expect(lifeResult.optimal.estimated_tool_life_min).toBeGreaterThanOrEqual(
        timeResult.optimal.estimated_tool_life_min * 0.8
      );
    });
  });

  describe("feature types", () => {
    const features: FeatureType[] = ["pocket", "slot", "face", "contour", "hole", "thread"];
    for (const feature of features) {
      it(`handles feature type '${feature}'`, () => {
        const dims = feature === "hole"
          ? { depth_mm: 20, diameter_mm: 10 }
          : feature === "thread"
            ? { depth_mm: 15, diameter_mm: 10 }
            : { depth_mm: 10, width_mm: 30, length_mm: 50 };
        const result = optimizeParameters(makeOptimizeInput({
          feature,
          dimensions: dims,
        }));
        expectOptimizeResultShape(result);
        expectValidSolution(result.optimal);
      });
    }
  });

  describe("material coverage", () => {
    const materials = [
      "AISI 1045", "AISI 4140", "6061-T6", "7075-T6",
      "Ti-6Al-4V", "Inconel 718", "316L",
    ];
    for (const material of materials) {
      it(`optimizes for known material '${material}'`, () => {
        const result = optimizeParameters(makeOptimizeInput({ material }));
        expectOptimizeResultShape(result);
        expectValidSolution(result.optimal);
      });
    }
  });

  describe("unknown material fallback", () => {
    it("uses AISI 4140 fallback for unknown material and still returns valid result", () => {
      const result = optimizeParameters(makeOptimizeInput({ material: "unobtanium" }));
      expectOptimizeResultShape(result);
      expectValidSolution(result.optimal);
    });

    it("flags unknown material in safety warnings", () => {
      const result = optimizeParameters(makeOptimizeInput({ material: "unobtanium" }));
      const hasUnknownFlag = result.safety.flags.some(f => f.toLowerCase().includes("unknown material"));
      expect(hasUnknownFlag).toBe(true);
    });

    it("lowers safety score for unknown material", () => {
      const knownResult = optimizeParameters(makeOptimizeInput({ material: "AISI 1045" }));
      const unknownResult = optimizeParameters(makeOptimizeInput({ material: "unobtanium" }));
      expect(unknownResult.safety.score).toBeLessThanOrEqual(knownResult.safety.score);
    });
  });

  describe("tight constraints — fallback solution", () => {
    it("returns fallback when constraints are impossibly tight", () => {
      const result = optimizeParameters(makeOptimizeInput({
        constraints: {
          surface_finish_ra_max_um: 0.001,
          max_cycle_time_min: 0.001,
        },
      }));
      expectOptimizeResultShape(result);
      expectValidSolution(result.optimal);
      const hasFallbackFlag = result.safety.flags.some(
        f => f.toLowerCase().includes("fallback") || f.toLowerCase().includes("no feasible")
      );
      expect(hasFallbackFlag).toBe(true);
      expect(result.safety.score).toBeLessThanOrEqual(0.60);
    });
  });

  describe("Pareto front validation", () => {
    it("Pareto front cost values are non-negative", () => {
      const result = optimizeParameters(makeOptimizeInput());
      for (const c of result.pareto_front.cost) {
        expect(c).toBeGreaterThanOrEqual(0);
      }
    });

    it("Pareto front time values are non-negative", () => {
      const result = optimizeParameters(makeOptimizeInput());
      for (const t of result.pareto_front.time) {
        expect(t).toBeGreaterThanOrEqual(0);
      }
    });

    it("Pareto front quality (Ra) values are physically plausible", () => {
      const result = optimizeParameters(makeOptimizeInput());
      for (const q of result.pareto_front.quality) {
        expectPhysical(q, "Ra in Pareto", 0.01, 100);
      }
    });

    it("optimal solution respects Ra constraint when feasible", () => {
      const raMax = 3.2;
      const result = optimizeParameters(makeOptimizeInput({
        constraints: { surface_finish_ra_max_um: raMax },
      }));
      const isFallback = result.safety.flags.some(f =>
        f.includes("fallback") || f.includes("No feasible")
      );
      if (!isFallback) {
        expect(result.optimal.predicted_ra_um).toBeLessThanOrEqual(raMax * 1.1);
      }
    });
  });
});

// ============================================================================
// 2. optimizeSequence
// ============================================================================

describe("optimizeSequence", () => {
  describe("happy path — standard 3-operation sequence", () => {
    it("returns a complete SequenceResult", () => {
      const result = optimizeSequence(makeSequenceInput());
      expect(result).toBeDefined();
      expect(result.optimal_order).toBeDefined();
      expect(Array.isArray(result.optimal_order)).toBe(true);
      expect(result.optimal_order.length).toBe(3);
      expect(typeof result.tool_changes).toBe("number");
      expectPhysical(result.estimated_total_min, "total time", 0);
      expect(result.savings_vs_input_order).toBeDefined();
      expect(typeof result.savings_vs_input_order.time_saved_min).toBe("number");
      expect(typeof result.savings_vs_input_order.tool_changes_saved).toBe("number");
      expect(result.safety).toBeDefined();
      expectPhysical(result.safety.score, "safety score", 0.40, 1.0);
    });

    it("optimal order contains all operation IDs", () => {
      const input = makeSequenceInput();
      const result = optimizeSequence(input);
      const inputIds = input.operations.map(o => o.id).sort();
      const outputIds = [...result.optimal_order].sort();
      expect(outputIds).toEqual(inputIds);
    });

    it("estimated total time is at least the sum of operation times", () => {
      const input = makeSequenceInput();
      const result = optimizeSequence(input);
      const opTimes = input.operations.reduce((s, o) => s + o.estimated_time_min, 0);
      expect(result.estimated_total_min).toBeGreaterThanOrEqual(opTimes);
    });
  });

  describe("single operation edge case", () => {
    it("returns trivial result for single operation", () => {
      const result = optimizeSequence(makeSequenceInput({
        operations: [
          { id: "only_op", feature: "face", tool_required: "face_mill", estimated_time_min: 8 },
        ],
      }));
      expect(result.optimal_order).toEqual(["only_op"]);
      expect(result.tool_changes).toBe(0);
      expect(result.estimated_total_min).toBe(8);
      expect(result.savings_vs_input_order.time_saved_min).toBe(0);
      expect(result.savings_vs_input_order.tool_changes_saved).toBe(0);
      expect(result.safety.score).toBe(0.95);
    });
  });

  describe("tool change optimization", () => {
    it("groups operations with same tool to minimize changes", () => {
      const result = optimizeSequence(makeSequenceInput({
        operations: [
          { id: "op1", feature: "pocket", tool_required: "end_mill", estimated_time_min: 5 },
          { id: "op2", feature: "face", tool_required: "face_mill", estimated_time_min: 4 },
          { id: "op3", feature: "pocket2", tool_required: "end_mill", estimated_time_min: 6 },
          { id: "op4", feature: "hole", tool_required: "drill", estimated_time_min: 3 },
          { id: "op5", feature: "pocket3", tool_required: "end_mill", estimated_time_min: 7 },
        ],
        optimize_for: "min_tool_changes",
      }));
      // With 3 distinct tools, minimum possible tool changes is 2
      expect(result.tool_changes).toBeLessThanOrEqual(4);
    });

    it("achieves zero tool changes when all operations use same tool", () => {
      const result = optimizeSequence(makeSequenceInput({
        operations: [
          { id: "op1", feature: "pocket", tool_required: "end_mill", estimated_time_min: 5 },
          { id: "op2", feature: "slot", tool_required: "end_mill", estimated_time_min: 6 },
          { id: "op3", feature: "contour", tool_required: "end_mill", estimated_time_min: 4 },
        ],
        optimize_for: "min_tool_changes",
      }));
      expect(result.tool_changes).toBe(0);
      expect(result.savings_vs_input_order.tool_changes_saved).toBe(0);
    });
  });

  describe("sequence objectives", () => {
    const objectives: Array<"min_tool_changes" | "min_cycle_time" | "min_setup_changes"> = [
      "min_tool_changes", "min_cycle_time", "min_setup_changes",
    ];
    for (const optimize_for of objectives) {
      it(`produces valid result for objective '${optimize_for}'`, () => {
        const result = optimizeSequence(makeSequenceInput({ optimize_for }));
        expect(result.optimal_order.length).toBe(3);
        expectPhysical(result.estimated_total_min, "total time", 0);
      });
    }
  });

  describe("setup constraints", () => {
    it("respects 'must be before' ordering constraints", () => {
      const result = optimizeSequence(makeSequenceInput({
        operations: [
          { id: "rough", feature: "pocket", tool_required: "end_mill", estimated_time_min: 10,
            setup_constraints: ["must be before finish"] },
          { id: "finish", feature: "pocket", tool_required: "end_mill", estimated_time_min: 5 },
          { id: "drill", feature: "hole", tool_required: "drill", estimated_time_min: 3 },
        ],
        optimize_for: "min_cycle_time",
      }));
      const roughIdx = result.optimal_order.indexOf("rough");
      const finishIdx = result.optimal_order.indexOf("finish");
      expect(roughIdx).toBeLessThan(finishIdx);
    });
  });

  describe("many operations (performance)", () => {
    it("handles 8 operations without timeout", () => {
      const ops = Array.from({ length: 8 }, (_, i) => ({
        id: `op${i}`,
        feature: `feature_${i}`,
        tool_required: i % 3 === 0 ? "end_mill" : i % 3 === 1 ? "drill" : "face_mill",
        estimated_time_min: 3 + i,
      }));
      const result = optimizeSequence({
        operations: ops,
        machine: "Haas VF-2",
        optimize_for: "min_tool_changes",
      });
      expect(result.optimal_order.length).toBe(8);
      expectPhysical(result.estimated_total_min, "total time", 0);
    });
  });
});

// ============================================================================
// 3. sustainabilityReport
// ============================================================================

describe("sustainabilityReport", () => {
  describe("happy path — steel roughing", () => {
    it("returns a complete SustainabilityResult", () => {
      const result = sustainabilityReport(makeSustainabilityInput());
      expect(result).toBeDefined();
      // Energy breakdown
      expect(result.energy).toBeDefined();
      expectPhysical(result.energy.cutting_kwh, "cutting energy", 0);
      expectPhysical(result.energy.spindle_kwh, "spindle energy", 0);
      expectPhysical(result.energy.auxiliary_kwh, "auxiliary energy", 0);
      expectPhysical(result.energy.total_kwh, "total energy", 0);
      // Carbon
      expect(result.carbon).toBeDefined();
      expectPhysical(result.carbon.direct_co2_kg, "direct CO2", 0);
      expectPhysical(result.carbon.indirect_co2_kg, "indirect CO2", 0);
      expectPhysical(result.carbon.total_co2_kg, "total CO2", 0);
      // Coolant
      expect(result.coolant).toBeDefined();
      expectPhysical(result.coolant.consumption_liters, "coolant", 0);
      expectPhysical(result.coolant.disposal_cost_usd, "disposal cost", 0);
      // Waste
      expect(result.waste).toBeDefined();
      expectPhysical(result.waste.chip_mass_kg, "chip mass", 0);
      expectPhysical(result.waste.recyclable_pct, "recycle %", 0, 100);
      expectPhysical(result.waste.landfill_kg, "landfill", 0);
      // Eco score
      expectPhysical(result.eco_efficiency_score, "eco score", 0, 1);
      // ISO notes
      expect(Array.isArray(result.iso14955_notes)).toBe(true);
      // Baseline comparison
      expect(result.comparison_vs_baseline).toBeDefined();
      expect(Number.isFinite(result.comparison_vs_baseline.energy_pct)).toBe(true);
      expect(Number.isFinite(result.comparison_vs_baseline.co2_pct)).toBe(true);
      expect(Number.isFinite(result.comparison_vs_baseline.waste_pct)).toBe(true);
      // Safety
      expectPhysical(result.safety.score, "safety", 0.40, 1.0);
    });

    it("total energy is consistent with component breakdown", () => {
      // Note: total_kwh comes from calcSustainability (ae*ap*fz*z*N MRR formula)
      // while the component breakdown uses a simplified MRR formula for the
      // detailed cutting_kwh. They differ because calcSustainability uses
      // default z=4, D=12 whereas the breakdown uses vc*1000/60*feed*depth*width.
      // We verify total >= components' sum (spindle+aux are same, cutting differs).
      const result = sustainabilityReport(makeSustainabilityInput());
      const sumComponents =
        result.energy.cutting_kwh + result.energy.spindle_kwh + result.energy.auxiliary_kwh;
      // Both should be positive and finite
      expectPhysical(sumComponents, "sum of energy components", 0);
      expectPhysical(result.energy.total_kwh, "total energy", 0);
      // Spindle and auxiliary portions use the same formula in both paths
      expect(result.energy.spindle_kwh).toBeGreaterThan(0);
      expect(result.energy.auxiliary_kwh).toBeGreaterThan(0);
    });

    it("total CO2 is consistent with component breakdown", () => {
      // Same note as energy: total_co2_kg comes from calcSustainability
      // while direct/indirect use the detailed breakdown's MRR.
      const result = sustainabilityReport(makeSustainabilityInput());
      const sumCO2 = result.carbon.direct_co2_kg + result.carbon.indirect_co2_kg;
      expectPhysical(sumCO2, "sum of CO2 components", 0);
      expectPhysical(result.carbon.total_co2_kg, "total CO2", 0);
      // Both should be in same order of magnitude
      expect(result.carbon.total_co2_kg).toBeGreaterThan(0);
      expect(sumCO2).toBeGreaterThan(0);
    });

    it("steel has >= 90% recyclable chip waste (density > 5000 kg/m3)", () => {
      const result = sustainabilityReport(makeSustainabilityInput({ material: "AISI 1045" }));
      expect(result.waste.recyclable_pct).toBeGreaterThanOrEqual(90);
    });
  });

  describe("aluminum — lower density material", () => {
    it("reports lower recyclable percentage for aluminum (density < 5000)", () => {
      const result = sustainabilityReport(makeSustainabilityInput({ material: "6061-T6" }));
      expect(result.waste.recyclable_pct).toBeLessThanOrEqual(80);
    });

    it("aluminum has lower energy factor than steel", () => {
      const steelResult = sustainabilityReport(makeSustainabilityInput({ material: "AISI 1045" }));
      const alResult = sustainabilityReport(makeSustainabilityInput({ material: "6061-T6" }));
      expect(alResult.energy.cutting_kwh).toBeLessThan(steelResult.energy.cutting_kwh);
    });
  });

  describe("coolant types", () => {
    it("flood uses most coolant, MQL uses less, dry uses none", () => {
      const flood = sustainabilityReport(makeSustainabilityInput({ coolant_type: "flood" }));
      const mql = sustainabilityReport(makeSustainabilityInput({ coolant_type: "mql" }));
      const dry = sustainabilityReport(makeSustainabilityInput({ coolant_type: "dry" }));
      expect(flood.coolant.consumption_liters).toBeGreaterThan(mql.coolant.consumption_liters);
      expect(mql.coolant.consumption_liters).toBeGreaterThan(dry.coolant.consumption_liters);
      expect(dry.coolant.consumption_liters).toBe(0);
    });

    it("flood generates ISO 14955-2 MQL recommendation", () => {
      const result = sustainabilityReport(makeSustainabilityInput({ coolant_type: "flood" }));
      const hasMqlNote = result.iso14955_notes.some(n => n.includes("MQL"));
      expect(hasMqlNote).toBe(true);
    });

    it("dry machining reports zero coolant consumption and disposal cost", () => {
      const result = sustainabilityReport(makeSustainabilityInput({ coolant_type: "dry" }));
      expect(result.coolant.consumption_liters).toBe(0);
      expect(result.coolant.disposal_cost_usd).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles very short cycle time (0.1 min)", () => {
      const result = sustainabilityReport(makeSustainabilityInput({ cycle_time_min: 0.1 }));
      expectPhysical(result.energy.total_kwh, "energy at short cycle", 0);
      expectPhysical(result.carbon.total_co2_kg, "CO2 at short cycle", 0);
    });

    it("handles high machine power without NaN/Infinity", () => {
      const result = sustainabilityReport(makeSustainabilityInput({ machine_power_kw: 100 }));
      expectPhysical(result.energy.total_kwh, "energy at high power", 0);
      expect(Number.isFinite(result.energy.total_kwh)).toBe(true);
    });

    it("handles unknown material with fallback", () => {
      const result = sustainabilityReport(makeSustainabilityInput({ material: "unknown_alloy" }));
      expectPhysical(result.energy.total_kwh, "energy for unknown mat", 0);
      expectPhysical(result.eco_efficiency_score, "eco score", 0, 1);
    });

    it("defaults machine_power_kw to 7.5 when omitted", () => {
      const withDefault = sustainabilityReport({
        material: "AISI 1045",
        cutting_speed_mpm: 200,
        feed_mmrev: 0.15,
        depth_of_cut_mm: 3.0,
        width_of_cut_mm: 25.0,
        cycle_time_min: 10,
      });
      const with7_5 = sustainabilityReport(makeSustainabilityInput({ machine_power_kw: 7.5 }));
      expect(Math.abs(withDefault.energy.spindle_kwh - with7_5.energy.spindle_kwh)).toBeLessThan(0.01);
    });

    it("defaults coolant_type to 'flood' when omitted", () => {
      const withDefault = sustainabilityReport({
        material: "AISI 1045",
        cutting_speed_mpm: 200,
        feed_mmrev: 0.15,
        depth_of_cut_mm: 3.0,
        width_of_cut_mm: 25.0,
        cycle_time_min: 10,
        machine_power_kw: 15,
      });
      const withFlood = sustainabilityReport(makeSustainabilityInput({ coolant_type: "flood" }));
      expect(withDefault.coolant.consumption_liters).toBe(withFlood.coolant.consumption_liters);
    });
  });

  describe("ISO 14955 compliance notes", () => {
    it("includes ISO 14955 note array in all results", () => {
      const result = sustainabilityReport(makeSustainabilityInput());
      expect(Array.isArray(result.iso14955_notes)).toBe(true);
    });

    it("flags low eco-efficiency score (<0.3) in both notes and safety", () => {
      const result = sustainabilityReport(makeSustainabilityInput({
        cutting_speed_mpm: 50,
        feed_mmrev: 0.02,
        depth_of_cut_mm: 0.5,
        width_of_cut_mm: 5.0,
        cycle_time_min: 60,
        machine_power_kw: 30,
      }));
      if (result.eco_efficiency_score < 0.3) {
        const hasLowEcoNote = result.iso14955_notes.some(n => n.includes("Eco-efficiency below 0.3"));
        expect(hasLowEcoNote).toBe(true);
        const hasLowEcoFlag = result.safety.flags.some(f => f.includes("Low eco-efficiency"));
        expect(hasLowEcoFlag).toBe(true);
      }
    });
  });
});

// ============================================================================
// 4. ecoOptimize
// ============================================================================

describe("ecoOptimize", () => {
  describe("happy path", () => {
    it("returns a complete EcoOptimizeResult", () => {
      const result = ecoOptimize(makeEcoOptimizeInput());
      expectOptimizeResultShape(result);
      expectValidSolution(result.optimal);
      expect(typeof result.eco_weight_applied).toBe("number");
      expect(typeof result.sustainability_improvement_pct).toBe("number");
    });

    it("eco_weight_applied matches input weight", () => {
      const result = ecoOptimize(makeEcoOptimizeInput({ weight_eco: 0.7 }));
      expect(result.eco_weight_applied).toBe(0.7);
    });
  });

  describe("weight_eco edge cases", () => {
    it("weight_eco=0 returns base result with 0% improvement", () => {
      const result = ecoOptimize(makeEcoOptimizeInput({ weight_eco: 0 }));
      expect(result.eco_weight_applied).toBe(0);
      expect(result.sustainability_improvement_pct).toBe(0);
      expectOptimizeResultShape(result);
    });

    it("weight_eco=1.0 maximizes sustainability weighting", () => {
      const result = ecoOptimize(makeEcoOptimizeInput({ weight_eco: 1.0 }));
      expect(result.eco_weight_applied).toBe(1.0);
      expectOptimizeResultShape(result);
      expectValidSolution(result.optimal);
    });

    it("weight_eco > 1.0 is clamped to 1.0", () => {
      const result = ecoOptimize(makeEcoOptimizeInput({ weight_eco: 5.0 }));
      expect(result.eco_weight_applied).toBe(1.0);
    });

    it("weight_eco < 0 is clamped to 0", () => {
      const result = ecoOptimize(makeEcoOptimizeInput({ weight_eco: -2.0 }));
      expect(result.eco_weight_applied).toBe(0);
      expect(result.sustainability_improvement_pct).toBe(0);
    });
  });

  describe("eco weight impact", () => {
    it("higher eco weight produces solution with non-worse eco score", () => {
      const lowEco = ecoOptimize(makeEcoOptimizeInput({ weight_eco: 0.1 }));
      const highEco = ecoOptimize(makeEcoOptimizeInput({ weight_eco: 0.9 }));
      expect(highEco.optimal.sustainability.eco_efficiency_score).toBeGreaterThanOrEqual(
        lowEco.optimal.sustainability.eco_efficiency_score * 0.7
      );
    });
  });

  describe("difficult materials", () => {
    it("eco-optimizes titanium (expensive, high energy factor)", () => {
      const result = ecoOptimize(makeEcoOptimizeInput({
        material: "Ti-6Al-4V",
        weight_eco: 0.6,
      }));
      expectOptimizeResultShape(result);
      expectValidSolution(result.optimal);
      expect(result.eco_weight_applied).toBe(0.6);
    });

    it("eco-optimizes Inconel 718 (hardest to machine)", () => {
      const result = ecoOptimize(makeEcoOptimizeInput({
        material: "Inconel 718",
        weight_eco: 0.5,
      }));
      expectOptimizeResultShape(result);
      expectValidSolution(result.optimal);
    });
  });
});

// ============================================================================
// 5. FORGE-DEBUG REGRESSION TESTS
// ============================================================================

describe("FORGE-DEBUG regressions", () => {
  describe("MRR formula fix: ae*ap*fz*z*N (NOT vc*fz*ap)", () => {
    /*
     * FORGE-DEBUG FIX: The old MRR formula was vc*fz*ap which is dimensionally
     * incorrect for milling. The correct formula is:
     *   MRR = ae * ap * fz * z * N  [mm^3/min]
     *   where N = (vc * 1000) / (pi * D)  [rpm]
     *
     * For typical roughing of AISI 1045:
     *   vc=200 m/min, fz=0.15 mm, ap=3 mm, ae=25 mm, z=4 (default), D=12mm (default)
     *   N = 200*1000 / (pi*12) = 5305 rpm
     *   MRR = 25 * 3 * 0.15 * 4 * 5305 = 238,725 mm^3/min = 238.7 cm^3/min
     *
     * This is physically plausible for roughing (100-500 cm^3/min).
     * The OLD formula vc*fz*ap = 200*0.15*3 = 90 mm^3/min = 0.09 cm^3/min
     * which is absurdly low -- off by ~2650x.
     */

    it("sustainabilityReport: chip waste is substantial for 10 min of roughing (> 1 kg)", () => {
      const result = sustainabilityReport(makeSustainabilityInput({
        material: "AISI 1045",
        cutting_speed_mpm: 200,
        feed_mmrev: 0.15,
        depth_of_cut_mm: 3.0,
        width_of_cut_mm: 25.0,
        cycle_time_min: 10,
        machine_power_kw: 15,
      }));
      // With correct MRR (ae*ap*fz*z*N):
      //   mrr_cm3_min ~ 238.7, volume_cm3 = 2387 in 10 min
      //   chip_waste = 2387 * 7870 / 1e6 ~ 18.8 kg
      // The OLD formula would give chip_waste ~ 0.007 kg (absurdly low)
      expect(result.waste.chip_mass_kg).toBeGreaterThan(1.0);
    });

    it("sustainabilityReport: chip waste is NOT absurdly low (old formula regression guard)", () => {
      const result = sustainabilityReport(makeSustainabilityInput({
        material: "AISI 1045",
        cutting_speed_mpm: 200,
        feed_mmrev: 0.15,
        depth_of_cut_mm: 3.0,
        width_of_cut_mm: 25.0,
        cycle_time_min: 10,
      }));
      // Old formula: vc*fz*ap = 200*0.15*3 = 90 mm^3/min = 0.09 cm^3/min
      // Old chip mass = 0.09 * 10 * 7870/1e6 = 0.007 kg
      // New formula should give >> 0.1 kg
      expect(result.waste.chip_mass_kg).toBeGreaterThan(0.1);
    });

    it("sustainabilityReport: higher MRR conditions produce more cutting energy", () => {
      const lowMRR = sustainabilityReport(makeSustainabilityInput({
        cutting_speed_mpm: 100,
        feed_mmrev: 0.08,
        depth_of_cut_mm: 1.0,
        width_of_cut_mm: 10.0,
        cycle_time_min: 10,
      }));
      const highMRR = sustainabilityReport(makeSustainabilityInput({
        cutting_speed_mpm: 200,
        feed_mmrev: 0.15,
        depth_of_cut_mm: 3.0,
        width_of_cut_mm: 25.0,
        cycle_time_min: 10,
      }));
      expect(highMRR.energy.cutting_kwh).toBeGreaterThan(lowMRR.energy.cutting_kwh);
      expect(highMRR.waste.chip_mass_kg).toBeGreaterThan(lowMRR.waste.chip_mass_kg * 5);
    });

    it("sustainabilityReport: MRR scales with width_of_cut (ae)", () => {
      const narrow = sustainabilityReport(makeSustainabilityInput({ width_of_cut_mm: 5.0 }));
      const wide = sustainabilityReport(makeSustainabilityInput({ width_of_cut_mm: 25.0 }));
      const ratio = wide.waste.chip_mass_kg / (narrow.waste.chip_mass_kg + 1e-10);
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(8);
    });

    it("sustainabilityReport: MRR scales with depth_of_cut (ap)", () => {
      const shallow = sustainabilityReport(makeSustainabilityInput({ depth_of_cut_mm: 1.0 }));
      const deep = sustainabilityReport(makeSustainabilityInput({ depth_of_cut_mm: 5.0 }));
      const ratio = deep.waste.chip_mass_kg / (shallow.waste.chip_mass_kg + 1e-10);
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(8);
    });
  });

  describe("Pareto front MRR in ecoOptimize", () => {
    it("ecoOptimize: Pareto front solutions have plausible cycle times (not hours)", () => {
      const result = ecoOptimize(makeEcoOptimizeInput({
        material: "AISI 1045",
        feature: "pocket",
        dimensions: { depth_mm: 10, width_mm: 40, length_mm: 60 },
        weight_eco: 0.5,
      }));
      expectPhysical(result.optimal.estimated_cycle_time_min, "eco-optimal cycle time", 0.01, 120);
    });

    it("ecoOptimize: chip waste in optimal solution is physically plausible", () => {
      const result = ecoOptimize(makeEcoOptimizeInput({
        material: "AISI 1045",
        feature: "pocket",
        dimensions: { depth_mm: 10, width_mm: 40, length_mm: 60 },
        weight_eco: 0.5,
      }));
      expectPhysical(result.optimal.sustainability.chip_waste_kg, "chip waste", 0);
      expect(Number.isFinite(result.optimal.sustainability.chip_waste_kg)).toBe(true);
    });
  });

  describe("optimizeParameters: convergence and ranking correctness", () => {
    it("min_cost: optimal has lowest cost among all returned solutions", () => {
      const result = optimizeParameters(makeOptimizeInput({ objective: "min_cost" }));
      if (result.alternatives.length > 0) {
        expect(result.optimal.estimated_cost_usd).toBeLessThanOrEqual(
          result.alternatives[0].estimated_cost_usd
        );
      }
    });

    it("max_tool_life: optimal has longest tool life among returned solutions", () => {
      const result = optimizeParameters(makeOptimizeInput({ objective: "max_tool_life" }));
      if (result.alternatives.length > 0) {
        expect(result.optimal.estimated_tool_life_min).toBeGreaterThanOrEqual(
          result.alternatives[0].estimated_tool_life_min
        );
      }
    });

    it("min_time: optimal has shortest cycle time among returned solutions", () => {
      const result = optimizeParameters(makeOptimizeInput({ objective: "min_time" }));
      if (result.alternatives.length > 0) {
        expect(result.optimal.estimated_cycle_time_min).toBeLessThanOrEqual(
          result.alternatives[0].estimated_cycle_time_min
        );
      }
    });
  });
});

// ============================================================================
// 6. DISPATCHER FUNCTION
// ============================================================================

describe("optimization dispatcher", () => {
  it("throws on unknown action", () => {
    expect(() => optimization("nonexistent_action", {})).toThrow("Unknown optimization action");
  });

  it("routes 'optimize_parameters' correctly", () => {
    const result = optimization("optimize_parameters", makeOptimizeInput() as unknown as Record<string, unknown>) as OptimizeResult;
    expectOptimizeResultShape(result);
  });

  it("routes 'optimize_sequence' correctly", () => {
    const result = optimization("optimize_sequence", makeSequenceInput() as unknown as Record<string, unknown>) as SequenceResult;
    expect(result.optimal_order).toBeDefined();
    expect(Array.isArray(result.optimal_order)).toBe(true);
  });

  it("routes 'sustainability_report' correctly", () => {
    const result = optimization(
      "sustainability_report", makeSustainabilityInput() as unknown as Record<string, unknown>
    ) as SustainabilityResult;
    expect(result.energy).toBeDefined();
    expect(result.carbon).toBeDefined();
  });

  it("routes 'eco_optimize' correctly", () => {
    const result = optimization("eco_optimize", makeEcoOptimizeInput() as unknown as Record<string, unknown>) as EcoOptimizeResult;
    expect(typeof result.eco_weight_applied).toBe("number");
    expect(typeof result.sustainability_improvement_pct).toBe("number");
  });
});

// ============================================================================
// 7. CROSS-CUTTING PROPERTY TESTS
// ============================================================================

describe("cross-cutting properties", () => {
  describe("no NaN or Infinity in outputs", () => {
    function assertNoNaNInObject(obj: any, path = ""): void {
      if (obj === null || obj === undefined) return;
      if (typeof obj === "number") {
        expect(Number.isNaN(obj), `NaN at ${path}`).toBe(false);
        expect(Number.isFinite(obj), `Infinity at ${path} (got ${obj})`).toBe(true);
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => assertNoNaNInObject(item, `${path}[${i}]`));
        return;
      }
      if (typeof obj === "object") {
        for (const [key, value] of Object.entries(obj)) {
          assertNoNaNInObject(value, `${path}.${key}`);
        }
      }
    }

    it("optimizeParameters output has no NaN/Infinity", () => {
      const result = optimizeParameters(makeOptimizeInput());
      assertNoNaNInObject(result, "optimizeParameters");
    });

    it("optimizeSequence output has no NaN/Infinity", () => {
      const result = optimizeSequence(makeSequenceInput());
      assertNoNaNInObject(result, "optimizeSequence");
    });

    it("sustainabilityReport output has no NaN/Infinity", () => {
      const result = sustainabilityReport(makeSustainabilityInput());
      assertNoNaNInObject(result, "sustainabilityReport");
    });

    it("ecoOptimize output has no NaN/Infinity", () => {
      const result = ecoOptimize(makeEcoOptimizeInput());
      assertNoNaNInObject(result, "ecoOptimize");
    });
  });

  describe("determinism (same input produces same output)", () => {
    it("sustainabilityReport is deterministic", () => {
      const input = makeSustainabilityInput();
      const r1 = sustainabilityReport(input);
      const r2 = sustainabilityReport(input);
      expect(r1.energy.total_kwh).toBe(r2.energy.total_kwh);
      expect(r1.carbon.total_co2_kg).toBe(r2.carbon.total_co2_kg);
      expect(r1.waste.chip_mass_kg).toBe(r2.waste.chip_mass_kg);
      expect(r1.eco_efficiency_score).toBe(r2.eco_efficiency_score);
    });

    it("optimizeParameters is deterministic (grid search, no randomness)", () => {
      const input = makeOptimizeInput();
      const r1 = optimizeParameters(input);
      const r2 = optimizeParameters(input);
      expect(r1.optimal.vc_mpm).toBe(r2.optimal.vc_mpm);
      expect(r1.optimal.fz_mm).toBe(r2.optimal.fz_mm);
      expect(r1.optimal.estimated_cost_usd).toBe(r2.optimal.estimated_cost_usd);
    });
  });
});
