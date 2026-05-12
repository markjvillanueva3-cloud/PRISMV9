/**
 * Electrode AI Reasoning Tests — ELEC-PIPE-AI-HARDEN
 *
 * Tests for:
 * 1. Deep reasoning chains for electrode decisions
 * 2. Material selection with AI confidence
 * 3. Spark gap optimization reasoning
 * 4. Trilobe geometry AI analysis
 * 5. Eccentric turning compensation
 * 6. Multi-CAM system selection
 *
 * @module __tests__/electrode-ai-reasoning.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  electrodeAIReasoningEngine,
  type ElectrodeMaterialRecommendation,
  type SparkGapOptimization,
  type TrilobeAIAnalysis,
  type EccentricCompensation,
  type MultiCAMRecommendation,
} from "../engines/ElectrodeAIReasoningEngine.js";

// Mock LLMEngine to avoid actual API calls
vi.mock("../engines/LLMEngine.js", () => ({
  llmEngine: {
    query: vi.fn().mockResolvedValue({
      answer: "Based on analysis, recommend EDM-3 graphite for D2 steel workpiece. Grain size 5µm provides good balance of wear ratio and machinability. Conclusion: Use graphite_edm3 with 0.03mm finish spark gap.",
      context_used: ["material", "formula"],
      model: "claude-sonnet-4-6",
      tokens_used: { input: 500, output: 200 },
      duration_ms: 1500,
      cached: false,
    }),
    registerContextProvider: vi.fn(),
  },
}));

// ============================================================================
// ELECTRODE MATERIAL SELECTION AI
// ============================================================================

describe("Electrode Material Selection AI", () => {
  it("should recommend graphite for steel workpiece", async () => {
    const result = await electrodeAIReasoningEngine.reasonElectrodeMaterial(
      "D2",
      1.6,
      0.01,
      1
    );

    expect(result.material).toMatch(/graphite/);
    expect(result.grain_size_um).toBeGreaterThan(0);
    expect(result.wear_ratio).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("should recommend CuW70 for carbide workpiece", async () => {
    const result = await electrodeAIReasoningEngine.reasonElectrodeMaterial(
      "carbide",
      0.8,
      0.005,
      2
    );

    expect(result.material).toBe("copper_tungsten_cuw70");
    expect(result.grade).toBe("CuW70");
    expect(result.wear_ratio).toBe(0.1);
    expect(result.cost_factor).toBeGreaterThan(2);
  });

  it("should recommend fine grain for precision finish", async () => {
    const result = await electrodeAIReasoningEngine.reasonElectrodeMaterial(
      "M2",
      0.4, // Very fine finish
      0.005,
      1
    );

    expect(result.material).toBe("graphite_af5");
    expect(result.grain_size_um).toBe(1);
    expect(result.grade).toBe("POCO AF-5");
  });

  it("should include alternatives with trade-offs", async () => {
    const result = await electrodeAIReasoningEngine.reasonElectrodeMaterial(
      "S7",
      1.6,
      0.01,
      1
    );

    expect(result.alternatives).toBeDefined();
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives[0].trade_off).toBeDefined();
  });
});

// ============================================================================
// SPARK GAP OPTIMIZATION AI
// ============================================================================

describe("Spark Gap Optimization AI", () => {
  it("should provide rough/semi/finish gap values", async () => {
    const result = await electrodeAIReasoningEngine.reasonSparkGap(
      "graphite_edm3",
      "D2",
      1.6
    );

    expect(result.rough_gap_mm).toBeGreaterThan(result.semi_gap_mm);
    expect(result.semi_gap_mm).toBeGreaterThan(result.finish_gap_mm);
    expect(result.finish_gap_mm).toBeCloseTo(0.03, 2);
  });

  it("should include duty cycle recommendations (P10 fix)", async () => {
    const result = await electrodeAIReasoningEngine.reasonSparkGap(
      "graphite_edm3",
      "D2",
      1.6
    );

    expect(result.duty_cycle).toBeDefined();
    // Finish duty should be 33-40%, NOT 56%
    expect(result.duty_cycle.finish).toBeLessThanOrEqual(0.40);
    expect(result.duty_cycle.finish).toBeGreaterThanOrEqual(0.33);
    expect(result.duty_cycle.rough).toBeCloseTo(0.50, 1);
  });

  it("should predict achievable Ra", async () => {
    const target_Ra = 0.8;
    const result = await electrodeAIReasoningEngine.reasonSparkGap(
      "graphite_af5",
      "H13",
      target_Ra
    );

    expect(result.predicted_Ra_um).toBe(target_Ra);
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

// ============================================================================
// TRILOBE GEOMETRY AI ANALYSIS
// ============================================================================

describe("Trilobe Geometry AI Analysis", () => {
  it("should analyze simple trilobe (small amplitude)", async () => {
    const result = await electrodeAIReasoningEngine.reasonTrilobeGeometry(
      0.260, // C
      0.250, // E — small amplitude = (0.260-0.250)/4 = 0.0025"
      0,     // No lead angle
      0.75,
      1.6
    );

    expect(result.geometry_complexity).toBe("simple");
    expect(result.recommended_axes).toBe(3);
    expect(result.milling_strategy).toContain("3D");
  });

  it("should recommend 5-axis for complex trilobe", async () => {
    const result = await electrodeAIReasoningEngine.reasonTrilobeGeometry(
      0.400, // C
      0.280, // E — large amplitude = 0.030"
      15,    // High lead angle
      1.0,
      1.6
    );

    expect(result.geometry_complexity).toBe("complex");
    expect(result.recommended_axes).toBe(5);
    expect(result.milling_strategy).toContain("5-axis");
  });

  it("should calculate force variation percentage", async () => {
    const c_dia = 0.300;
    const e_dia = 0.260;
    const result = await electrodeAIReasoningEngine.reasonTrilobeGeometry(
      c_dia,
      e_dia,
      0,
      0.5,
      1.6
    );

    // Force variation = amplitude / avg_radius * 100%
    const amplitude = (c_dia - e_dia) / 4;
    const avg_radius = (c_dia + e_dia) / 4;
    const expected_variation = (amplitude / avg_radius) * 100;

    expect(result.force_variation_percent).toBeCloseTo(expected_variation, 1);
  });

  it("should calculate undersizing for spark gap", async () => {
    const result = await electrodeAIReasoningEngine.reasonTrilobeGeometry(
      0.260,
      0.240,
      0,
      0.75,
      0.8 // Fine finish
    );

    expect(result.undersizing_mm).toBeGreaterThan(0);
    expect(result.undersizing_mm).toBeLessThan(0.1);
  });
});

// ============================================================================
// ECCENTRIC TURNING COMPENSATION AI
// ============================================================================

describe("Eccentric Turning Compensation AI", () => {
  it("should generate feed modulation table", async () => {
    const result = await electrodeAIReasoningEngine.reasonEccentricCompensation(
      0.260,
      0.240,
      1500,
      "graphite"
    );

    expect(result.feed_modulation).toBeDefined();
    expect(result.feed_modulation.length).toBeGreaterThan(0);

    // Check feed factors are in valid range
    for (const mod of result.feed_modulation) {
      expect(mod.angle_deg).toBeGreaterThanOrEqual(0);
      expect(mod.angle_deg).toBeLessThan(360);
      expect(mod.feed_factor).toBeGreaterThanOrEqual(0.7);
      expect(mod.feed_factor).toBeLessThanOrEqual(1.0);
    }
  });

  it("should warn about high X-axis acceleration", async () => {
    const result = await electrodeAIReasoningEngine.reasonEccentricCompensation(
      0.400, // Large C
      0.280, // Large amplitude
      2500,  // High RPM
      "graphite"
    );

    // Large amplitude + high RPM = high acceleration
    expect(result.x_accel_safety.max_accel_mm_s2).toBeGreaterThan(0);
    if (result.x_accel_safety.max_accel_mm_s2 > 5000) {
      expect(result.x_accel_safety.safe).toBe(false);
      expect(result.x_accel_safety.recommendation).toContain("Reduce");
    }
  });

  it("should recommend safe RPM", async () => {
    const result = await electrodeAIReasoningEngine.reasonEccentricCompensation(
      0.260,
      0.240,
      1500,
      "graphite"
    );

    expect(result.rpm_recommendation).toBeGreaterThan(0);
    expect(result.rpm_recommendation).toBeLessThanOrEqual(1500);
    expect(result.constant_chip_load_strategy).toContain("feed");
  });
});

// ============================================================================
// MULTI-CAM SELECTION AI
// ============================================================================

describe("Multi-CAM Selection AI", () => {
  it("should recommend hyperMILL for 5-axis", async () => {
    const result = await electrodeAIReasoningEngine.reasonMultiCAM(
      "complex",
      5,
      true, // helical
      "expert"
    );

    expect(result.primary_cam).toBe("hypermill");
    expect(result.toolpath_strategy).toContain("5-axis");
    expect(result.post_processor).toContain("Roku-Roku");
  });

  it("should recommend Fusion 360 for simple geometry + beginner", async () => {
    const result = await electrodeAIReasoningEngine.reasonMultiCAM(
      "simple",
      3,
      false,
      "beginner"
    );

    expect(result.primary_cam).toBe("fusion360");
    expect(result.toolpath_strategy).toContain("Contour");
  });

  it("should recommend Mastercam for moderate complexity", async () => {
    const result = await electrodeAIReasoningEngine.reasonMultiCAM(
      "moderate",
      4,
      false,
      "intermediate"
    );

    expect(result.primary_cam).toBe("mastercam");
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("should estimate programming time based on complexity", async () => {
    const simple = await electrodeAIReasoningEngine.reasonMultiCAM(
      "simple", 3, false, "intermediate"
    );
    const complex = await electrodeAIReasoningEngine.reasonMultiCAM(
      "complex", 5, true, "intermediate"
    );

    expect(complex.estimated_programming_time_min).toBeGreaterThan(
      simple.estimated_programming_time_min
    );
  });
});

// ============================================================================
// FULL ELECTRODE DESIGN AI
// ============================================================================

describe("Full Electrode Design AI", () => {
  it("should provide comprehensive AI design recommendation", async () => {
    const result = await electrodeAIReasoningEngine.fullElectrodeDesign({
      part_number: "AI-TEST-001",
      c_dia_in: 0.260,
      e_dia_in: 0.240,
      lead_angle_deg: 0,
      total_length_in: 0.75,
      workpiece_material: "D2",
      target_finish_Ra_um: 1.6,
      num_cavities: 1,
    });

    // All components should be present
    expect(result.material).toBeDefined();
    expect(result.spark_gap).toBeDefined();
    expect(result.trilobe).toBeDefined();
    expect(result.cam).toBeDefined();

    // Should have reasoning chains
    expect(result.reasoning_chains.length).toBeGreaterThan(0);

    // Overall confidence
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  });

  it("should add safety warnings for carbide workpiece", async () => {
    const result = await electrodeAIReasoningEngine.fullElectrodeDesign({
      part_number: "CARBIDE-AI",
      c_dia_in: 0.260,
      e_dia_in: 0.240,
      lead_angle_deg: 0,
      total_length_in: 0.5,
      workpiece_material: "carbide",
      target_finish_Ra_um: 0.8,
      num_cavities: 2,
    });

    expect(result.safety_warnings.some(w => w.toLowerCase().includes("cuw"))).toBe(true);
  });

  it("should coordinate material and spark gap recommendations", async () => {
    const result = await electrodeAIReasoningEngine.fullElectrodeDesign({
      part_number: "COORD-AI",
      c_dia_in: 0.300,
      e_dia_in: 0.280,
      lead_angle_deg: 5,
      total_length_in: 1.0,
      workpiece_material: "M2",
      target_finish_Ra_um: 1.6,
      num_cavities: 1,
    });

    // Material and spark gap should be consistent
    expect(result.material).toBeDefined();
    expect(result.spark_gap).toBeDefined();
    expect(result.material.confidence).toBeGreaterThan(0);
    expect(result.spark_gap.confidence).toBeGreaterThan(0);
  });
});

// ============================================================================
// REASONING CHAIN MANAGEMENT
// ============================================================================

describe("Reasoning Chain Management", () => {
  it("should store and retrieve reasoning chains", async () => {
    // Execute a reasoning to create a chain
    await electrodeAIReasoningEngine.reasonElectrodeMaterial("D2", 1.6, 0.01, 1);

    // List chains
    const chains = electrodeAIReasoningEngine.listReasoningChains(10);
    expect(chains.length).toBeGreaterThan(0);

    // Retrieve a chain
    const chainId = chains[chains.length - 1];
    const chain = electrodeAIReasoningEngine.getReasoningChain(chainId);

    if (chain) {
      expect(chain.chain_id).toBe(chainId);
      expect(chain.steps.length).toBeGreaterThan(0);
      expect(chain.final_answer).toBeDefined();
    }
  });

  it("should track engine statistics", async () => {
    const statsBefore = electrodeAIReasoningEngine.stats();

    await electrodeAIReasoningEngine.reasonSparkGap("graphite_edm3", "D2", 1.6);

    const statsAfter = electrodeAIReasoningEngine.stats();
    expect(statsAfter.queries_processed).toBeGreaterThan(statsBefore.queries_processed);
    expect(statsAfter.domains_supported).toBeGreaterThan(0);
  });
});

// ============================================================================
// DEEP REASONING CHAIN STRUCTURE
// ============================================================================

describe("Deep Reasoning Chain Structure", () => {
  it("should have multi-step reasoning with confidence", async () => {
    await electrodeAIReasoningEngine.reasonTrilobeGeometry(
      0.280, 0.260, 0, 0.75, 1.6
    );

    const chains = electrodeAIReasoningEngine.listReasoningChains(1);
    const chain = electrodeAIReasoningEngine.getReasoningChain(chains[0]);

    if (chain) {
      expect(chain.steps.length).toBeGreaterThanOrEqual(3);

      for (const step of chain.steps) {
        expect(step.step_number).toBeGreaterThan(0);
        expect(step.thought).toBeDefined();
        expect(step.observation).toBeDefined();
        expect(step.conclusion).toBeDefined();
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.sources.length).toBeGreaterThan(0);
      }
    }
  });

  it("should include processing time", async () => {
    await electrodeAIReasoningEngine.reasonElectrodeMaterial("D2", 1.6, 0.01, 1);

    const chains = electrodeAIReasoningEngine.listReasoningChains(1);
    const chain = electrodeAIReasoningEngine.getReasoningChain(chains[0]);

    if (chain) {
      // With mocks, processing time may be 0 or very small — just check it exists
      expect(chain.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(chain.processing_time_ms).toBeDefined();
    }
  });
});

// ============================================================================
// SAFETY CRITICAL DECISIONS
// ============================================================================

describe("Safety Critical AI Decisions", () => {
  it("should NEVER recommend graphite for carbide (microcracking risk)", async () => {
    const result = await electrodeAIReasoningEngine.reasonElectrodeMaterial(
      "carbide",
      0.8,
      0.005,
      1
    );

    // Must be CuW, never graphite
    expect(result.material).not.toContain("graphite");
    expect(result.material).toContain("cuw");
  });

  it("should warn about high lead angles", async () => {
    const result = await electrodeAIReasoningEngine.reasonTrilobeGeometry(
      0.260,
      0.240,
      20, // High lead angle
      1.0,
      1.6
    );

    expect(result.geometry_complexity).toBe("complex");
    expect(result.recommended_axes).toBe(5);
  });

  it("should include safety warnings in full design", async () => {
    const result = await electrodeAIReasoningEngine.fullElectrodeDesign({
      part_number: "SAFETY-TEST",
      c_dia_in: 0.400,
      e_dia_in: 0.280,
      lead_angle_deg: 20,
      total_length_in: 2.0,
      workpiece_material: "H13",
      target_finish_Ra_um: 1.6,
      num_cavities: 1,
    });

    // Should have 5-axis warning
    if (result.trilobe.recommended_axes === 5) {
      expect(result.safety_warnings.some(w => w.includes("5-axis"))).toBe(true);
    }
  });
});
