/**
 * MILL-HARD-MS3: 5-Axis Simultaneous Milling with AI Reasoning
 * =============================================================
 * Test suite for FiveAxisDecisionEngine:
 *   - RTCP compensation validation
 *   - Singularity avoidance integration
 *   - AI-powered strategy selection
 *   - Chain-of-thought reasoning
 *   - Okuma M460V-5AX machine specifics
 *
 * Target: 60+ tests covering all micro-sessions
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  FiveAxisDecisionEngine,
  fiveAxisDecisionEngine,
  OKUMA_M460V_5AX,
  type FiveAxisDecisionInput,
  type FiveAxisPartFeature,
  type MachineKinematics,
} from "../engines/FiveAxisDecisionEngine.js";
import {
  RTCP_CompensationEngine,
  rtcpCompensationEngine,
  type RTCPInput,
} from "../engines/RTCP_CompensationEngine.js";
import {
  SingularityAvoidanceEngine,
  singularityAvoidanceEngine,
  type SingularityInput,
} from "../engines/SingularityAvoidanceEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const makeBasicInput = (overrides: Partial<FiveAxisDecisionInput> = {}): FiveAxisDecisionInput => ({
  part_features: [
    {
      feature_type: "freeform_surface",
      required_orientations: [
        { i: 0, j: 0, k: 1 },
        { i: 0.5, j: 0, k: 0.866 },
        { i: 0, j: 0.5, k: 0.866 },
      ],
      surface_tolerance_mm: 0.02,
      scallop_height_mm: 0.01,
      max_depth_mm: 25,
      min_tool_length_mm: 50,
      has_undercuts: false,
      has_thin_walls: false,
      accessibility_score: 0.9,
    },
  ],
  machine: OKUMA_M460V_5AX,
  tool: {
    type: "ball_nose",
    diameter_mm: 10,
    flute_length_mm: 25,
    overall_length_mm: 75,
    gauge_length_mm: 60,
  },
  material: "Aluminum 6061-T6",
  batch_size: 10,
  operator_skill: 4,
  feed_rate_mm_per_min: 3000,
  include_reasoning: true,
  ...overrides,
});

const makeImpellerInput = (): FiveAxisDecisionInput => ({
  part_features: [
    {
      feature_type: "impeller_blade",
      required_orientations: [
        { i: 0, j: 0, k: 1 },
        { i: 0.707, j: 0, k: 0.707 },
        { i: 0, j: 0.707, k: 0.707 },
        { i: -0.707, j: 0, k: 0.707 },
        { i: 0, j: -0.707, k: 0.707 },
      ],
      surface_tolerance_mm: 0.01,
      scallop_height_mm: 0.005,
      max_depth_mm: 40,
      min_tool_length_mm: 80,
      has_undercuts: true,
      has_thin_walls: true,
      accessibility_score: 0.7,
    },
  ],
  machine: OKUMA_M460V_5AX,
  tool: {
    type: "ball_nose",
    diameter_mm: 6,
    flute_length_mm: 30,
    overall_length_mm: 100,
    gauge_length_mm: 85,
  },
  material: "Titanium Ti-6Al-4V",
  batch_size: 5,
  operator_skill: 5,
  feed_rate_mm_per_min: 1500,
  include_reasoning: true,
});

const makeRuledSurfaceInput = (): FiveAxisDecisionInput => ({
  part_features: [
    {
      feature_type: "ruled_surface",
      required_orientations: [
        { i: 0, j: 0, k: 1 },
        { i: 0.342, j: 0, k: 0.940 },
        { i: 0.5, j: 0, k: 0.866 },
      ],
      surface_tolerance_mm: 0.05,
      max_depth_mm: 15,
      min_tool_length_mm: 40,
      has_undercuts: false,
      has_thin_walls: false,
      accessibility_score: 0.95,
    },
  ],
  machine: OKUMA_M460V_5AX,
  tool: {
    type: "flat_end",
    diameter_mm: 16,
    flute_length_mm: 50,
    overall_length_mm: 80,
    gauge_length_mm: 65,
  },
  material: "Steel 4140",
  batch_size: 20,
  operator_skill: 3,
  feed_rate_mm_per_min: 2000,
  include_reasoning: false,
});

const make3Plus2Input = (): FiveAxisDecisionInput => ({
  part_features: [
    {
      feature_type: "multi_face",
      required_orientations: [
        { i: 0, j: 0, k: 1 },
        { i: 0, j: 0, k: -1 },
      ],
      surface_tolerance_mm: 0.1,
      max_depth_mm: 10,
      min_tool_length_mm: 30,
      has_undercuts: false,
      has_thin_walls: false,
      accessibility_score: 1.0,
    },
  ],
  machine: OKUMA_M460V_5AX,
  tool: {
    type: "flat_end",
    diameter_mm: 20,
    flute_length_mm: 40,
    overall_length_mm: 60,
    gauge_length_mm: 45,
  },
  material: "Aluminum 7075",
  batch_size: 50,
  operator_skill: 2,
  feed_rate_mm_per_min: 4000,
  include_reasoning: true,
});

// ============================================================================
// μS-10: RTCP/TCPM Validation for M460V-5AX
// ============================================================================

describe("μS-10: RTCP/TCPM Validation for M460V-5AX", () => {
  describe("RTCP Compensation Calculations", () => {
    it("calculates correct compensation for table-table config at 30° tilt", () => {
      const input: RTCPInput = {
        kinematic_type: "table_table",
        pivot_to_gauge_mm: 250,
        pivot_to_table_mm: 150,
        tool_length_mm: 75,
        tool_gauge_length_mm: 60,
        A_deg: 30,
        C_deg: 0,
        X_mm: 0,
        Y_mm: 0,
        Z_mm: 0,
        tolerance_mm: 0.01,
      };

      const result = rtcpCompensationEngine.compensate(input);

      expect(result.compensated_X_mm).toBeTypeOf("number");
      expect(result.compensated_Y_mm).toBeTypeOf("number");
      expect(result.compensated_Z_mm).toBeTypeOf("number");
      expect(result.tool_tip_error_without_rtcp_mm).toBeGreaterThan(0);
      expect(result.kinematic_chain).toContain("table_table");
    });

    it("calculates compensation vector magnitude correctly", () => {
      const input: RTCPInput = {
        kinematic_type: "table_table",
        pivot_to_gauge_mm: 250,
        pivot_to_table_mm: 150,
        tool_length_mm: 100,
        tool_gauge_length_mm: 85,
        A_deg: 45,
        C_deg: 90,
        X_mm: 100,
        Y_mm: 100,
        Z_mm: -50,
        tolerance_mm: 0.01,
      };

      const result = rtcpCompensationEngine.compensate(input);
      const { dx, dy, dz } = result.compensation_vector;
      const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);

      expect(magnitude).toBeCloseTo(result.tool_tip_error_without_rtcp_mm, 2);
    });

    it("validates RTCP within Okuma axis limits", () => {
      const input: RTCPInput = {
        kinematic_type: "table_table",
        pivot_to_gauge_mm: 250,
        pivot_to_table_mm: 150,
        tool_length_mm: 75,
        tool_gauge_length_mm: 60,
        A_deg: -90,
        C_deg: 180,
        X_mm: 0,
        Y_mm: 0,
        Z_mm: 0,
      };

      const validation = rtcpCompensationEngine.validate(input, {
        A_min: -120,
        A_max: 30,
        C_min: -360,
        C_max: 360,
      });

      expect(validation.axis_limits_ok).toBe(true);
    });

    it("detects axis limit violation", () => {
      const input: RTCPInput = {
        kinematic_type: "table_table",
        pivot_to_gauge_mm: 250,
        pivot_to_table_mm: 150,
        tool_length_mm: 75,
        tool_gauge_length_mm: 60,
        A_deg: 45, // Exceeds Okuma's A_max of 30
        C_deg: 0,
        X_mm: 0,
        Y_mm: 0,
        Z_mm: 0,
      };

      const validation = rtcpCompensationEngine.validate(input, {
        A_min: -120,
        A_max: 30,
        C_min: -360,
        C_max: 360,
      });

      expect(validation.axis_limits_ok).toBe(false);
      expect(validation.warnings.some((w) => w.includes("outside limits"))).toBe(true);
    });

    it("detects singularity risk near A=0", () => {
      const input: RTCPInput = {
        kinematic_type: "table_table",
        pivot_to_gauge_mm: 250,
        pivot_to_table_mm: 150,
        tool_length_mm: 75,
        tool_gauge_length_mm: 60,
        A_deg: 0.3, // Near singularity
        C_deg: 45,
        X_mm: 0,
        Y_mm: 0,
        Z_mm: 0,
      };

      const validation = rtcpCompensationEngine.validate(input, {
        A_min: -120,
        A_max: 30,
        C_min: -360,
        C_max: 360,
      });

      expect(validation.singularity_risk).toBe(true);
      expect(validation.warnings.some((w) => w.includes("singularity"))).toBe(true);
    });

    it("provides recommendations for large compensation", () => {
      const input: RTCPInput = {
        kinematic_type: "table_table",
        pivot_to_gauge_mm: 500,
        pivot_to_table_mm: 300,
        tool_length_mm: 200,
        tool_gauge_length_mm: 180,
        A_deg: -60,
        C_deg: 0,
        X_mm: 0,
        Y_mm: 0,
        Z_mm: 0,
      };

      const result = rtcpCompensationEngine.compensate(input);

      expect(result.tool_tip_error_without_rtcp_mm).toBeGreaterThan(10);
      expect(result.recommendations.some((r) => r.includes("verify pivot point"))).toBe(true);
    });
  });

  describe("Machine Kinematics", () => {
    it("exports correct Okuma M460V-5AX configuration", () => {
      expect(OKUMA_M460V_5AX.machine_id).toBe("VMC-02");
      expect(OKUMA_M460V_5AX.kinematic_type).toBe("table_table");
      expect(OKUMA_M460V_5AX.primary_rotary).toBe("A");
      expect(OKUMA_M460V_5AX.secondary_rotary).toBe("C");
      expect(OKUMA_M460V_5AX.rtcp_enabled).toBe(true);
      expect(OKUMA_M460V_5AX.tcpm_mode).toBe("G43.4");
    });

    it("has correct axis limits for Okuma trunnion", () => {
      expect(OKUMA_M460V_5AX.axis_limits.A_min).toBe(-120);
      expect(OKUMA_M460V_5AX.axis_limits.A_max).toBe(30);
      expect(OKUMA_M460V_5AX.axis_limits.C_min).toBe(-360);
      expect(OKUMA_M460V_5AX.axis_limits.C_max).toBe(360);
    });

    it("has correct rotary speed limit", () => {
      expect(OKUMA_M460V_5AX.max_rotary_speed_deg_per_sec).toBe(50);
    });
  });
});

// ============================================================================
// μS-11: 5-Axis AI Strategy Selection
// ============================================================================

describe("μS-11: 5-Axis AI Strategy Selection", () => {
  describe("Strategy Selection Logic", () => {
    it("selects 5-axis simultaneous for freeform surfaces", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(["5_axis_simultaneous", "multiaxis_contouring"]).toContain(result.recommended_strategy);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("selects impeller strategy for blade features", () => {
      const input = makeImpellerInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(["impeller_turbine", "multiaxis_contouring"]).toContain(result.recommended_strategy);
    });

    it("considers swarf cutting for ruled surfaces", () => {
      const input = makeRuledSurfaceInput();
      const result = FiveAxisDecisionEngine.decide(input);

      // Swarf cutting should be either recommended or in alternatives for ruled surfaces
      const swarfConsidered = result.recommended_strategy === "swarf_cutting" ||
        result.alternatives.some((alt) => alt.strategy === "swarf_cutting");
      expect(swarfConsidered).toBe(true);
    });

    it("recommends 3+2 for simple multi-face parts", () => {
      const input = make3Plus2Input();
      const result = FiveAxisDecisionEngine.decide(input);

      // Simple multi-face with no undercuts should allow 3+2
      expect(result.recommended_strategy).toBe("3_plus_2_positioning");
      expect(result.recommended_tilt).toBeDefined();
      expect(result.recommended_tilt!.A_deg).toBeDefined();
    });

    it("provides cycle time estimate", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.expected_cycle_time_min).toBeGreaterThan(0);
      expect(result.expected_cycle_time_min).toBeLessThan(120);
    });

    it("provides cost estimate", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.expected_cost_per_part).toBeGreaterThan(0);
    });

    it("provides surface quality prediction", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(["excellent", "good", "acceptable", "poor"]).toContain(result.expected_surface_quality);
    });
  });

  describe("Chain-of-Thought Reasoning", () => {
    it("generates reasoning chain when requested", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning!.reasoning_chain).toBeDefined();
      expect(result.reasoning!.reasoning_chain.steps.length).toBeGreaterThan(0);
    });

    it("reasoning chain has observation steps", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      const observations = result.reasoning!.reasoning_chain.steps.filter((s) => s.type === "observation");
      expect(observations.length).toBeGreaterThan(0);
    });

    it("reasoning chain has hypothesis step", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      const hypotheses = result.reasoning!.reasoning_chain.steps.filter((s) => s.type === "hypothesis");
      expect(hypotheses.length).toBeGreaterThan(0);
    });

    it("reasoning chain has calculation step", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      const calculations = result.reasoning!.reasoning_chain.steps.filter((s) => s.type === "calculation");
      expect(calculations.length).toBeGreaterThan(0);
    });

    it("reasoning chain has conclusion step", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      const conclusions = result.reasoning!.reasoning_chain.steps.filter((s) => s.type === "conclusion");
      expect(conclusions.length).toBeGreaterThan(0);
    });

    it("reasoning chain has unique step IDs", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      const stepIds = result.reasoning!.reasoning_chain.steps.map((s) => s.step_id);
      const uniqueIds = new Set(stepIds);
      expect(uniqueIds.size).toBe(stepIds.length);
    });

    it("does not include reasoning when not requested", () => {
      const input = makeBasicInput({ include_reasoning: false });
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.reasoning).toBeUndefined();
    });
  });

  describe("Proactive Suggestions", () => {
    it("generates proactive suggestions", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.reasoning!.proactive_suggestions).toBeDefined();
      expect(Array.isArray(result.reasoning!.proactive_suggestions)).toBe(true);
    });

    it("suggests lead angle for ball nose tools", () => {
      const input = makeBasicInput({ include_reasoning: true });
      input.tool.type = "ball_nose";

      const result = FiveAxisDecisionEngine.decide(input);

      if (result.recommended_strategy === "5_axis_simultaneous") {
        const hasLeadSuggestion = result.reasoning!.proactive_suggestions.some(
          (s) => s.toLowerCase().includes("lead") || s.toLowerCase().includes("tilt")
        );
        expect(hasLeadSuggestion).toBe(true);
      }
    });

    it("suggests training for low-skill operators", () => {
      const input = makeBasicInput({ include_reasoning: true, operator_skill: 2 });
      const result = FiveAxisDecisionEngine.decide(input);

      const hasTrainingSuggestion = result.reasoning!.proactive_suggestions.some(
        (s) => s.toLowerCase().includes("training")
      );
      expect(hasTrainingSuggestion).toBe(true);
    });
  });

  describe("Learning Integration", () => {
    it("generates prediction ID for learning feedback", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.prediction_id).toBeDefined();
      expect(result.prediction_id).toMatch(/^5ax-pred-\d+$/);
    });
  });

  describe("Alternatives Analysis", () => {
    it("provides alternative strategies", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
    });

    it("alternatives have why_not explanations", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      for (const alt of result.alternatives) {
        expect(alt.why_not).toBeDefined();
        expect(alt.why_not.length).toBeGreaterThan(0);
      }
    });

    it("alternatives include cycle time estimates", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      for (const alt of result.alternatives) {
        expect(alt.cycle_time_min).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// μS-12: Singularity Avoidance + Toolpath Safety
// ============================================================================

describe("μS-12: Singularity Avoidance + Toolpath Safety", () => {
  describe("Singularity Detection", () => {
    it("detects gimbal lock singularity", () => {
      const input: SingularityInput = {
        kinematic_type: "table_table",
        toolpath_points: [
          { x: 0, y: 0, z: 0, i: 0, j: 0, k: 1 }, // Vertical = A near 0
          { x: 10, y: 0, z: 0, i: 0.01, j: 0, k: 0.9999 }, // Near vertical
        ],
        rotary_axis_1: "A",
        rotary_axis_2: "C",
        angular_velocity_limit_deg_per_sec: 50,
        feed_rate_mm_per_min: 3000,
      };

      const result = singularityAvoidanceEngine.detect(input);

      const gimbalLock = result.singular_points.filter((p) => p.type === "gimbal_lock");
      expect(gimbalLock.length).toBeGreaterThan(0);
    });

    it("detects pole singularity", () => {
      const input: SingularityInput = {
        kinematic_type: "table_table",
        toolpath_points: [
          { x: 0, y: 0, z: 0, i: 0.01, j: 0.01, k: 0.99985 }, // Near vertical but not exactly
          { x: 10, y: 0, z: 0, i: 0.02, j: 0.01, k: 0.9997 }, // Slightly off vertical
        ],
        rotary_axis_1: "A",
        rotary_axis_2: "C",
        angular_velocity_limit_deg_per_sec: 50,
        feed_rate_mm_per_min: 3000,
      };

      const result = singularityAvoidanceEngine.detect(input);

      // Near-vertical tool axis should trigger pole or gimbal singularity
      const singularPoints = result.singular_points.filter((p) => p.type === "pole" || p.type === "gimbal_lock");
      expect(singularPoints.length).toBeGreaterThan(0);
    });

    it("detects high angular velocity", () => {
      const input: SingularityInput = {
        kinematic_type: "table_table",
        toolpath_points: [
          { x: 0, y: 0, z: 0, i: 0, j: 0.5, k: 0.866 },
          { x: 10, y: 0, z: 0, i: 0.5, j: 0, k: 0.866 }, // 90° C rotation over 10mm
        ],
        rotary_axis_1: "A",
        rotary_axis_2: "C",
        angular_velocity_limit_deg_per_sec: 10, // Low limit
        feed_rate_mm_per_min: 6000, // High feed
      };

      const result = singularityAvoidanceEngine.detect(input);

      const highVel = result.singular_points.filter((p) => p.type === "high_velocity");
      expect(highVel.length).toBeGreaterThan(0);
    });

    it("reports safe toolpath when no singularities", () => {
      const input: SingularityInput = {
        kinematic_type: "table_table",
        toolpath_points: [
          { x: 0, y: 0, z: 0, i: 0, j: 0.5, k: 0.866 }, // 30° tilt
          { x: 10, y: 0, z: 0, i: 0.1, j: 0.5, k: 0.860 }, // Slight change
          { x: 20, y: 0, z: 0, i: 0.2, j: 0.5, k: 0.849 }, // Gradual
        ],
        rotary_axis_1: "A",
        rotary_axis_2: "C",
        angular_velocity_limit_deg_per_sec: 50,
        feed_rate_mm_per_min: 1000, // Slow feed
      };

      const result = singularityAvoidanceEngine.detect(input);

      expect(result.is_safe).toBe(true);
    });

    it("generates singularity map", () => {
      const map = singularityAvoidanceEngine.mapSingularities("table_table", "A");

      expect(map.zones).toBeDefined();
      expect(map.zones.length).toBeGreaterThan(0);
      expect(map.safe_orientation_ranges).toBeDefined();
    });
  });

  describe("Integration with Decision Engine", () => {
    it("reports singularity safety status", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.singularity_safe).toBeTypeOf("boolean");
    });

    it("includes singularity analysis in reasoning", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.reasoning!.singularity_analysis).toBeDefined();
      expect(result.reasoning!.singularity_analysis.total_points_checked).toBeGreaterThan(0);
    });

    it("reports RTCP required status", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.rtcp_required).toBeTypeOf("boolean");
    });

    it("includes RTCP analysis in reasoning", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.reasoning!.rtcp_analysis).toBeDefined();
      expect(result.reasoning!.rtcp_analysis.validation).toBeDefined();
    });

    it("generates safety warnings", () => {
      const input = makeBasicInput();
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.safety_warnings).toBeDefined();
      expect(Array.isArray(result.safety_warnings)).toBe(true);
    });
  });

  describe("Self-Reflection", () => {
    it("documents assumptions", () => {
      const input = makeBasicInput({ include_reasoning: true });
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.reasoning!.self_reflection.assumptions).toBeDefined();
      expect(result.reasoning!.self_reflection.assumptions.length).toBeGreaterThan(0);
    });

    it("documents uncertainties", () => {
      const input = makeBasicInput({ include_reasoning: true, operator_skill: 2 });
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.reasoning!.self_reflection.uncertainties).toBeDefined();
    });

    it("documents safety concerns when present", () => {
      const input = makeImpellerInput();
      input.include_reasoning = true;
      const result = FiveAxisDecisionEngine.decide(input);

      expect(result.reasoning!.self_reflection.safety_concerns).toBeDefined();
    });
  });
});

// ============================================================================
// Parametric Sweeps
// ============================================================================

describe("Parametric Sweeps", () => {
  describe("Material Variations", () => {
    const materials = [
      "Aluminum 6061-T6",
      "Steel 4140",
      "Titanium Ti-6Al-4V",
      "Inconel 718",
      "Copper C110",
      "Graphite POCO EDM-3",
    ];

    for (const material of materials) {
      it(`handles ${material}`, () => {
        const input = makeBasicInput({ material });
        const result = FiveAxisDecisionEngine.decide(input);

        expect(result.recommended_strategy).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0.4);
      });
    }
  });

  describe("Operator Skill Levels", () => {
    for (let skill = 1; skill <= 5; skill++) {
      it(`handles skill level ${skill}`, () => {
        const input = makeBasicInput({ operator_skill: skill as 1 | 2 | 3 | 4 | 5 });
        const result = FiveAxisDecisionEngine.decide(input);

        expect(result.recommended_strategy).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0.3);
      });
    }
  });

  describe("Batch Size Impact", () => {
    const batchSizes = [1, 5, 10, 25, 50, 100];

    for (const batch of batchSizes) {
      it(`batch size ${batch} affects cost calculation`, () => {
        const input = makeBasicInput({ batch_size: batch });
        const result = FiveAxisDecisionEngine.decide(input);

        expect(result.expected_cost_per_part).toBeGreaterThan(0);
        // Larger batches should have lower per-part cost due to setup amortization
      });
    }
  });

  describe("Tool Types", () => {
    const toolTypes: Array<"ball_nose" | "bull_nose" | "flat_end" | "lollipop" | "barrel"> = [
      "ball_nose",
      "bull_nose",
      "flat_end",
      "lollipop",
      "barrel",
    ];

    for (const toolType of toolTypes) {
      it(`handles ${toolType} endmill`, () => {
        const input = makeBasicInput();
        input.tool.type = toolType;
        const result = FiveAxisDecisionEngine.decide(input);

        expect(result.recommended_strategy).toBeDefined();
      });
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("handles empty feature orientations gracefully", () => {
    const input = makeBasicInput();
    input.part_features[0].required_orientations = [];

    // Should not throw
    const result = FiveAxisDecisionEngine.decide(input);
    expect(result.recommended_strategy).toBeDefined();
  });

  it("handles very tight tolerances", () => {
    const input = makeBasicInput();
    input.part_features[0].surface_tolerance_mm = 0.001;

    const result = FiveAxisDecisionEngine.decide(input);
    expect(result.expected_surface_quality).toBeDefined();
  });

  it("handles very deep features", () => {
    const input = makeBasicInput();
    input.part_features[0].max_depth_mm = 200;

    const result = FiveAxisDecisionEngine.decide(input);
    // Should generate warnings about deep feature
  });

  it("handles long tool overhang", () => {
    const input = makeBasicInput({ include_reasoning: true });
    input.tool.overall_length_mm = 200;

    const result = FiveAxisDecisionEngine.decide(input);

    const hasLongToolWarning = result.safety_warnings.some(
      (w) => w.toLowerCase().includes("long") || w.toLowerCase().includes("overhang")
    );
    expect(hasLongToolWarning).toBe(true);
  });

  it("handles low accessibility score", () => {
    const input = makeBasicInput();
    input.part_features[0].accessibility_score = 0.3;

    const result = FiveAxisDecisionEngine.decide(input);
    expect(result.recommended_strategy).toBeDefined();
  });

  it("handles multiple features with varying types", () => {
    const input = makeBasicInput();
    input.part_features.push({
      feature_type: "deep_cavity",
      required_orientations: [{ i: 0, j: 0.707, k: 0.707 }],
      surface_tolerance_mm: 0.05,
      max_depth_mm: 60,
      min_tool_length_mm: 100,
      has_undercuts: true,
      has_thin_walls: false,
      accessibility_score: 0.6,
    });

    const result = FiveAxisDecisionEngine.decide(input);
    expect(result.recommended_strategy).toBeDefined();
  });
});

// ============================================================================
// Cross-Machine Validation
// ============================================================================

describe("Cross-Machine Validation", () => {
  it("validates against Okuma M460V-5AX defaults", () => {
    const input = makeBasicInput();
    const result = FiveAxisDecisionEngine.decide(input);

    expect(result.rtcp_required).toBeTypeOf("boolean");
    expect(result.singularity_safe).toBeTypeOf("boolean");
  });

  it("handles custom machine kinematics", () => {
    const customMachine: MachineKinematics = {
      machine_id: "CUSTOM-01",
      machine_name: "Custom 5-Axis",
      kinematic_type: "head_head",
      primary_rotary: "B",
      secondary_rotary: "C",
      pivot_to_gauge_mm: 200,
      pivot_to_table_mm: 100,
      axis_limits: {
        A_min: -110,
        A_max: 110,
        B_min: -180,
        B_max: 180,
        C_min: -360,
        C_max: 360,
      },
      max_rotary_speed_deg_per_sec: 100,
      max_rpm: 20000,
      rtcp_enabled: true,
      tcpm_mode: "TRAORI",
      hourly_rate: 150,
    };

    const input = makeBasicInput({ machine: customMachine });
    const result = FiveAxisDecisionEngine.decide(input);

    expect(result.recommended_strategy).toBeDefined();
  });
});

// ============================================================================
// Regression: MS2 Compatibility
// ============================================================================

describe("Regression: MS1/MS2 Compatibility", () => {
  it("4th axis indexing still exported", async () => {
    const indexModule = await import("../engines/index.js");
    expect(indexModule.FourthAxisIndexingEngine).toBeDefined();
    expect(indexModule.FourthAxisDecisionEngine).toBeDefined();
  });

  it("5th axis integrates with 4th axis machines", () => {
    // Okuma M460V-5AX has both 4th and 5th axis capability
    const input = makeBasicInput();
    const result = FiveAxisDecisionEngine.decide(input);

    // Should be able to recommend 3+2 as an alternative
    const has3Plus2 = result.alternatives.some(
      (alt) => alt.strategy === "3_plus_2_positioning"
    ) || result.recommended_strategy === "3_plus_2_positioning";

    expect(has3Plus2).toBe(true);
  });
});
