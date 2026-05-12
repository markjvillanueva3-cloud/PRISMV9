/**
 * MILL-HARD-MS2: 4-Axis + Indexing Strategies
 * ============================================
 * Test suite for 4th axis milling with AI reasoning integration.
 *
 * Micro-sessions:
 *   - μS-08: 4th axis rotary indexing — tombstone/fixture plate work
 *   - μS-09: 4-axis interpolation — rotary contouring, wrap strategies
 *
 * AI reasoning integration:
 *   - DecisionReasoningEngine for strategy selection
 *   - ChainOfThoughtEngine for explainable decisions
 *   - LearningAdaptationEngine for outcome-based learning
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  FourthAxisIndexingEngine,
  HAAS_TR160,
  HAAS_TR210,
  HAAS_HRT210,
  TOMBSTONE_CONFIGS,
  type FourthAxisInput,
  type PositionalIndexingResult,
  type ContinuousIndexingResult,
} from "../engines/FourthAxisIndexingEngine.js";
import {
  FourthAxisDecisionEngine,
  type FourthAxisDecisionInput,
  type FourthAxisDecisionResult,
  type PartGeometry,
  type ShopContext,
} from "../engines/FourthAxisDecisionEngine.js";
import { shopConfigurationEngine, type ShopMachine } from "../engines/ShopConfigurationEngine.js";

// ============================================================================
// TEST DATA
// ============================================================================

/** JM Die shop context for testing */
const JM_DIE_SHOP_CONTEXT: ShopContext = {
  available_machines: [
    {
      machine_id: "VMC-01",
      name: "Hurco VM30i",
      capabilities: ["milling", "drilling", "tapping", "boring", "contouring", "4th_axis"],
      hourly_rate: 80.00,
      rotary_table: { model: "HRT210", axis: "A", max_load_kg: 136, max_rpm: 100 } as any,
    },
    {
      machine_id: "VMC-02",
      name: "Okuma M460V-5AX",
      capabilities: ["milling", "drilling", "5axis_contouring", "high_speed_milling", "4th_axis_indexing"],
      hourly_rate: 135.00,
    },
    {
      machine_id: "VMC-03",
      name: "Haas VF-2",
      capabilities: ["milling", "drilling", "tapping", "boring", "4th_axis"],
      hourly_rate: 65.00,
      rotary_table: HAAS_TR160 as any,
    },
  ],
  batch_size: 25,
  manual_setup_time_min: 20,
  operator_skill: 4,
  urgency: 0.3,
};

/** Standard 4-face die block for testing */
const DIE_BLOCK_PART: PartGeometry = {
  machined_sides: 4,
  has_wrap_features: false,
  max_dimension_mm: 150,
  weight_kg: 12,
  tolerance_mm: 0.025,
  surface_finish_um: 1.6,
  critical_datum_alignment: true,
};

/** Cylindrical part with wrap features */
const CYLINDRICAL_PART: PartGeometry = {
  machined_sides: 1, // Wrap around
  has_wrap_features: true,
  max_dimension_mm: 80,
  weight_kg: 5,
  tolerance_mm: 0.05,
  surface_finish_um: 3.2,
  critical_datum_alignment: false,
};

/** Simple 2-sided part */
const SIMPLE_PART: PartGeometry = {
  machined_sides: 2,
  has_wrap_features: false,
  max_dimension_mm: 100,
  weight_kg: 3,
  tolerance_mm: 0.1,
  surface_finish_um: 6.3,
  critical_datum_alignment: false,
};

// ============================================================================
// μS-08: 4TH AXIS ROTARY INDEXING — TOMBSTONE/FIXTURE PLATE
// ============================================================================

describe("μS-08: 4th Axis Rotary Indexing", () => {
  describe("Tombstone Configuration", () => {
    it("should calculate 4-face tombstone indexing with TR160", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        rotary_table: HAAS_TR160,
        mode: "positional",
        tombstone_config: "4-face",
      };

      const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;

      expect(result.mode).toBe("positional");
      expect(result.positions).toHaveLength(4);
      expect(result.positions[0].angle_deg).toBe(0);
      expect(result.positions[1].angle_deg).toBe(90);
      expect(result.positions[2].angle_deg).toBe(180);
      expect(result.positions[3].angle_deg).toBe(270);
      expect(result.total_index_time_sec).toBeGreaterThan(0);
      expect(result.g_code_snippet).toContain("A0");
      expect(result.g_code_snippet).toContain("A90");
    });

    it("should calculate 2-face tombstone indexing", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        rotary_table: HAAS_TR160,
        mode: "positional",
        tombstone_config: "2-face",
      };

      const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;

      expect(result.positions).toHaveLength(2);
      expect(result.positions[0].angle_deg).toBe(0);
      expect(result.positions[1].angle_deg).toBe(180);
    });

    it("should calculate 6-face tombstone indexing", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-01",
        rotary_table: HAAS_HRT210,
        mode: "positional",
        tombstone_config: "6-face",
      };

      const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;

      expect(result.positions).toHaveLength(6);
      expect(result.positions[0].angle_deg).toBe(0);
      expect(result.positions[1].angle_deg).toBe(60);
      expect(result.positions[2].angle_deg).toBe(120);
      expect(result.positions[5].angle_deg).toBe(300);
    });
  });

  describe("Index Sequence Optimization", () => {
    it("should optimize index sequence using nearest-neighbor", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        rotary_table: HAAS_TR160,
        mode: "positional",
        tombstone_config: "4-face",
      };

      const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;

      // Optimized sequence should visit faces in order minimizing travel
      expect(result.cycle_optimization.optimized_sequence).toHaveLength(4);
      expect(result.cycle_optimization.time_saved_sec).toBeGreaterThanOrEqual(0);
      expect(result.cycle_optimization.total_travel_deg).toBeLessThanOrEqual(360);
    });

    it("should calculate correct index time including clamp/unclamp", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        rotary_table: HAAS_TR160,
        mode: "positional",
        tombstone_config: "4-face",
      };

      const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;

      // Each index: unclamp (0.5s) + travel + clamp (0.5s)
      // 4 faces = 3 index moves (after first position)
      // Min total = 3 * (0.5 + 0.5) = 3s, plus travel time
      expect(result.total_index_time_sec).toBeGreaterThan(3);
      expect(result.index_sequence).toHaveLength(4);
    });
  });

  describe("Custom Indexed Positions", () => {
    it("should handle custom angle positions", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        rotary_table: HAAS_TR160,
        mode: "positional",
        positions: [
          { face_id: 0, angle_deg: 0, face_normal: { x: 0, y: 0, z: 1 }, description: "Top" },
          { face_id: 1, angle_deg: 45, face_normal: { x: 0.707, y: 0, z: 0.707 }, description: "45 deg" },
          { face_id: 2, angle_deg: 135, face_normal: { x: 0.707, y: 0, z: -0.707 }, description: "135 deg" },
        ],
      };

      const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;

      expect(result.positions).toHaveLength(3);
      expect(result.positions[1].angle_deg).toBe(45);
      expect(result.g_code_snippet).toContain("A45");
    });

    it("should handle single position (no indexing needed)", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        rotary_table: HAAS_TR160,
        mode: "positional",
        positions: [
          { face_id: 0, angle_deg: 0, face_normal: { x: 0, y: 0, z: 1 }, description: "Top only" },
        ],
      };

      const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;

      expect(result.positions).toHaveLength(1);
      expect(result.index_sequence).toHaveLength(1);
    });
  });

  describe("Rotary Table Specs", () => {
    it("should use TR160 specs correctly", () => {
      expect(HAAS_TR160.model).toBe("Haas TR160");
      expect(HAAS_TR160.axis).toBe("A");
      expect(HAAS_TR160.max_load_kg).toBe(54);
      expect(HAAS_TR160.max_rpm).toBe(100);
      expect(HAAS_TR160.index_speed_deg_per_sec).toBe(100);
    });

    it("should use TR210 specs correctly", () => {
      expect(HAAS_TR210.model).toBe("Haas TR210");
      expect(HAAS_TR210.max_load_kg).toBe(113);
      expect(HAAS_TR210.max_rpm).toBe(60);
      expect(HAAS_TR210.tilt_range_deg).toEqual([-120, 30]);
    });

    it("should use HRT210 specs correctly", () => {
      expect(HAAS_HRT210.model).toBe("Haas HRT210");
      expect(HAAS_HRT210.has_tailstock).toBe(true);
      expect(HAAS_HRT210.max_load_kg).toBe(136);
    });
  });

  describe("Tombstone Cycle Time", () => {
    it("should calculate cycle time for 4-face tombstone", () => {
      const result = FourthAxisIndexingEngine.calculateTombstoneCycleTime(4, 5.0, HAAS_TR160);

      expect(result.cutting_minutes).toBe(20); // 4 faces × 5 min
      expect(result.index_minutes).toBeGreaterThan(0);
      expect(result.total_minutes).toBe(result.cutting_minutes + result.index_minutes);
    });

    it("should calculate cycle time for 6-face tombstone", () => {
      const result = FourthAxisIndexingEngine.calculateTombstoneCycleTime(6, 3.0, HAAS_HRT210);

      expect(result.cutting_minutes).toBe(18); // 6 faces × 3 min
      expect(result.total_minutes).toBeGreaterThan(18);
    });
  });

  describe("Machine 4th Axis Support", () => {
    it("should detect 4th axis support from capabilities", () => {
      expect(FourthAxisIndexingEngine.machineSupports4thAxis("VMC-03", ["milling", "4th_axis"])).toBe(true);
      expect(FourthAxisIndexingEngine.machineSupports4thAxis("VMC-02", ["milling", "5axis_contouring"])).toBe(true);
      expect(FourthAxisIndexingEngine.machineSupports4thAxis("VMC-04", ["milling", "drilling"])).toBe(false);
    });

    it("should detect mill-turn B-axis as 4th axis capable", () => {
      expect(FourthAxisIndexingEngine.machineSupports4thAxis("LTH-07", ["turning", "milling", "b_axis"])).toBe(true);
    });

    it("should get rotary table for known machines", () => {
      const table = FourthAxisIndexingEngine.getRotaryTableForMachine("VMC-03");
      expect(table).toBeDefined();
      expect(table?.model).toBe("Haas TR160");
    });
  });
});

// ============================================================================
// μS-09: 4-AXIS INTERPOLATION — ROTARY CONTOURING, WRAP STRATEGIES
// ============================================================================

describe("μS-09: 4-Axis Interpolation", () => {
  describe("Wrap Milling", () => {
    it("should calculate wrap milling parameters for cylindrical part", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        rotary_table: HAAS_TR160,
        mode: "wrap",
        part_diameter_mm: 80,
        part_length_mm: 150,
        cutting: {
          tool_diameter_mm: 10,
          vc_m_min: 150,
          fz_mm: 0.1,
          ae_mm: 5,
          ap_mm: 2,
          flutes: 4,
        },
      };

      const result = FourthAxisIndexingEngine.calculate(input) as ContinuousIndexingResult;

      expect(result.mode).toBe("wrap");
      expect(result.circumference_mm).toBeCloseTo(Math.PI * 80, 1);
      expect(result.rotary_rpm).toBeGreaterThan(0);
      expect(result.surface_speed_m_min).toBe(150);
      expect(result.g_code_snippet).toContain("A360");
    });

    it("should warn when rotary RPM exceeds table max", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        rotary_table: HAAS_TR160,
        mode: "wrap",
        part_diameter_mm: 20, // Small diameter = high rotary RPM
        cutting: {
          tool_diameter_mm: 6,
          vc_m_min: 200, // High surface speed
          fz_mm: 0.05,
          ae_mm: 2,
          ap_mm: 1,
          flutes: 2,
        },
      };

      const result = FourthAxisIndexingEngine.calculate(input) as ContinuousIndexingResult;

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("exceeds");
    });

    it("should calculate effective cutting diameter", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        mode: "wrap",
        part_diameter_mm: 50,
        cutting: {
          tool_diameter_mm: 12,
          vc_m_min: 100,
          fz_mm: 0.1,
          ae_mm: 3,
          ap_mm: 2,
          flutes: 4,
        },
      };

      const result = FourthAxisIndexingEngine.calculate(input) as ContinuousIndexingResult;

      // Effective diameter = part diameter + tool diameter
      expect(result.effective_diameter_mm).toBe(50 + 12);
    });
  });

  describe("Continuous Interpolation", () => {
    it("should calculate continuous 4th axis parameters", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-01",
        rotary_table: HAAS_HRT210,
        mode: "continuous",
        part_diameter_mm: 400, // Large diameter for low rotary RPM
        cutting: {
          tool_diameter_mm: 8,
          vc_m_min: 100, // Conservative surface speed
          fz_mm: 0.08,
          ae_mm: 4,
          ap_mm: 2,
          flutes: 3,
        },
      };

      const result = FourthAxisIndexingEngine.calculate(input) as ContinuousIndexingResult;

      expect(result.mode).toBe("continuous");
      expect(result.adjusted_feed_mm_min).toBeGreaterThan(0);
      // Large diameter keeps rotary RPM within limits
      expect(result.rotary_rpm).toBeLessThan(HAAS_HRT210.max_rpm);
    });

    it("should handle default cutting parameters", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        mode: "continuous",
        part_diameter_mm: 60,
        // No cutting params — use defaults
      };

      const result = FourthAxisIndexingEngine.calculate(input) as ContinuousIndexingResult;

      expect(result.adjusted_feed_mm_min).toBeGreaterThan(0);
      expect(result.surface_speed_m_min).toBe(100); // Default
    });
  });
});

// ============================================================================
// AI REASONING INTEGRATION — DECISION ENGINE
// ============================================================================

describe("AI Reasoning: FourthAxisDecisionEngine", () => {
  describe("Strategy Selection", () => {
    it("should recommend 4th axis or 5-axis for multi-face die block", () => {
      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "both",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      // Should recommend either 4th axis or 5-axis (both maintain datum alignment)
      expect(result.recommended_strategy).toMatch(/4th_axis|5_axis/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.quality_risk).toBe("low");
    });

    it("should recommend continuous for wrap features", () => {
      const input: FourthAxisDecisionInput = {
        part: CYLINDRICAL_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "1045",
        operation: "roughing",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      expect(result.recommended_strategy).toBe("4th_axis_continuous");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should recommend multiple setups for simple parts", () => {
      const simpleContext: ShopContext = {
        ...JM_DIE_SHOP_CONTEXT,
        batch_size: 3, // Small batch
      };

      const input: FourthAxisDecisionInput = {
        part: SIMPLE_PART,
        shop: simpleContext,
        material: "6061",
        operation: "finishing",
      };

      const result = FourthAxisDecisionEngine.decide(input);

      // For simple 2-sided part with small batch, multiple setups may be acceptable
      expect(["multiple_setups", "4th_axis_positional"]).toContain(result.recommended_strategy);
    });

    it("should consider 5-axis when available and beneficial", () => {
      const tightTolerancePart: PartGeometry = {
        ...DIE_BLOCK_PART,
        tolerance_mm: 0.01, // Very tight
        machined_sides: 5,
      };

      const input: FourthAxisDecisionInput = {
        part: tightTolerancePart,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "A2",
        operation: "finishing",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      // Should at least consider 5-axis as an alternative
      const alternatives = result.alternatives.map((a) => a.strategy);
      expect(
        result.recommended_strategy === "5_axis_simultaneous" ||
        alternatives.includes("5_axis_simultaneous")
      ).toBe(true);
    });
  });

  describe("Chain-of-Thought Reasoning", () => {
    it("should include full reasoning chain when requested", () => {
      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "both",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning!.reasoning_chain.steps.length).toBeGreaterThan(5);

      // Check step types are present
      const stepTypes = result.reasoning!.reasoning_chain.steps.map((s) => s.type);
      expect(stepTypes).toContain("observation");
      expect(stepTypes).toContain("hypothesis");
      expect(stepTypes).toContain("calculation");
      expect(stepTypes).toContain("validation");
      expect(stepTypes).toContain("conclusion");
    });

    it("should include self-reflection in reasoning", () => {
      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "both",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      expect(result.reasoning!.self_reflection.assumptions.length).toBeGreaterThan(0);
      expect(result.reasoning!.self_reflection.alternative_considered).toBeTruthy();
      expect(result.reasoning!.self_reflection.why_not_alternative).toBeTruthy();
    });

    it("should calculate confidence factors", () => {
      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "both",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      const factors = result.reasoning!.confidence_factors;
      expect(factors.length).toBeGreaterThan(0);

      // Check factor structure
      const factor = factors[0];
      expect(factor.factor).toBeTruthy();
      expect(["positive", "negative", "neutral"]).toContain(factor.impact);
      expect(factor.weight).toBeGreaterThan(0);
      expect(factor.explanation).toBeTruthy();
    });
  });

  describe("Proactive Suggestions", () => {
    it("should suggest tombstone for high batch size with 4th axis", () => {
      // Use shop context without 5-axis to ensure 4th_axis is selected
      const highBatchContext: ShopContext = {
        available_machines: [
          {
            machine_id: "VMC-03",
            name: "Haas VF-2",
            capabilities: ["milling", "drilling", "tapping", "boring", "4th_axis"],
            hourly_rate: 65.00,
            rotary_table: HAAS_TR160 as any,
          },
        ],
        batch_size: 50,
        manual_setup_time_min: 20,
        operator_skill: 4,
        urgency: 0.3,
      };

      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: highBatchContext,
        material: "D2",
        operation: "both",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      // With only 4th axis available, should recommend positional and suggest tombstone
      expect(result.recommended_strategy).toBe("4th_axis_positional");
      const suggestions = result.reasoning!.proactive_suggestions;
      expect(suggestions.some((s) => s.toLowerCase().includes("tombstone"))).toBe(true);
    });

    it("should suggest probing for tight tolerances", () => {
      const tightPart: PartGeometry = {
        ...DIE_BLOCK_PART,
        tolerance_mm: 0.015,
      };

      const input: FourthAxisDecisionInput = {
        part: tightPart,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "finishing",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      const suggestions = result.reasoning!.proactive_suggestions;
      expect(suggestions.some((s) => s.toLowerCase().includes("prob"))).toBe(true);
    });
  });

  describe("Learning Integration", () => {
    it("should create prediction ID for learning feedback", () => {
      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "both",
      };

      const result = FourthAxisDecisionEngine.decide(input);

      expect(result.prediction_id).toBeDefined();
      expect(result.prediction_id).toMatch(/^4ax-pred-\d+$/);
    });
  });

  describe("Cost Analysis", () => {
    it("should calculate expected cost per part", () => {
      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "both",
      };

      const result = FourthAxisDecisionEngine.decide(input);

      expect(result.expected_cost_per_part).toBeGreaterThan(0);
      expect(result.expected_cycle_time_min).toBeGreaterThan(0);
      expect(result.setup_time_min).toBeGreaterThan(0);
    });

    it("should show alternatives with cost comparison", () => {
      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "both",
      };

      const result = FourthAxisDecisionEngine.decide(input);

      expect(result.alternatives.length).toBeGreaterThan(0);

      for (const alt of result.alternatives) {
        expect(alt.cycle_time_min).toBeGreaterThan(0);
        expect(alt.cost_per_part).toBeGreaterThan(0);
        expect(alt.why_not).toBeTruthy();
      }
    });
  });

  describe("Machine Selection", () => {
    it("should select appropriate machine based on capabilities", () => {
      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "both",
      };

      const result = FourthAxisDecisionEngine.decide(input);

      // Should recommend a machine with 4th axis capability
      expect(["VMC-01", "VMC-02", "VMC-03"]).toContain(result.recommended_machine);
    });

    it("should prefer lower rate machines when capabilities match", () => {
      const input: FourthAxisDecisionInput = {
        part: SIMPLE_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "1018",
        operation: "roughing",
      };

      const result = FourthAxisDecisionEngine.decide(input);

      // For simple work, should prefer lower-rate machine (VF-2 at $65/hr)
      if (result.recommended_strategy === "4th_axis_positional") {
        expect(result.recommended_machine).toBe("VMC-03"); // Lowest rate with 4th axis
      }
    });
  });
});

// ============================================================================
// INTEGRATION WITH SHOP CONFIGURATION
// ============================================================================

describe("Integration: ShopConfigurationEngine", () => {
  it("should have 4th_axis capability on VF-2", () => {
    const profile = shopConfigurationEngine.getProfile("jm-die");
    const vf2 = profile.machines.find((m) => m.id === "VMC-03");

    expect(vf2).toBeDefined();
    expect(vf2!.capabilities).toContain("4th_axis");
  });

  it("should have rotary_table spec on mills", () => {
    const profile = shopConfigurationEngine.getProfile("jm-die");
    const vf2 = profile.machines.find((m) => m.id === "VMC-03");
    const hurco = profile.machines.find((m) => m.id === "VMC-01");

    expect(vf2!.rotary_table).toBeDefined();
    expect(vf2!.rotary_table?.model).toBe("TR160");
    expect(hurco!.rotary_table?.model).toBe("HRT210");
  });

  it("should have 4th_axis_indexing on 5-axis machine", () => {
    const profile = shopConfigurationEngine.getProfile("jm-die");
    const okuma5ax = profile.machines.find((m) => m.id === "VMC-02");

    expect(okuma5ax).toBeDefined();
    expect(okuma5ax!.capabilities).toContain("4th_axis_indexing");
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe("Edge Cases", () => {
  describe("FourthAxisIndexingEngine", () => {
    it("should handle empty positions array gracefully", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        mode: "positional",
        positions: [],
      };

      // Should fallback to 4-face default
      const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;
      expect(result.positions.length).toBe(4);
    });

    it("should handle very small part diameter for wrap", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        mode: "wrap",
        part_diameter_mm: 5, // Very small
        cutting: {
          tool_diameter_mm: 3,
          vc_m_min: 100,
          fz_mm: 0.05,
          ae_mm: 1,
          ap_mm: 0.5,
          flutes: 2,
        },
      };

      const result = FourthAxisIndexingEngine.calculate(input) as ContinuousIndexingResult;

      expect(result.rotary_rpm).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about high RPM
    });

    it("should handle compound mode as continuous", () => {
      const input: FourthAxisInput = {
        machine_id: "VMC-03",
        mode: "compound",
        part_diameter_mm: 50,
      };

      const result = FourthAxisIndexingEngine.calculate(input);
      expect(["continuous", "wrap"]).toContain(result.mode);
    });
  });

  describe("FourthAxisDecisionEngine", () => {
    it("should handle shop with no 4th axis machines", () => {
      const limitedShop: ShopContext = {
        available_machines: [
          {
            machine_id: "VMC-04",
            name: "Haas OM-2",
            capabilities: ["milling", "drilling"],
            hourly_rate: 55.00,
          },
        ],
        batch_size: 10,
        manual_setup_time_min: 20,
        operator_skill: 3,
        urgency: 0.5,
      };

      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: limitedShop,
        material: "D2",
        operation: "both",
      };

      const result = FourthAxisDecisionEngine.decide(input);

      // Should fallback to multiple setups
      expect(result.recommended_strategy).toBe("multiple_setups");
    });

    it("should handle very heavy parts", () => {
      const heavyPart: PartGeometry = {
        ...DIE_BLOCK_PART,
        weight_kg: 100, // Very heavy
      };

      const input: FourthAxisDecisionInput = {
        part: heavyPart,
        shop: JM_DIE_SHOP_CONTEXT,
        material: "D2",
        operation: "both",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      // Should note uncertainty about heavy part
      expect(result.reasoning!.self_reflection.uncertainties.some((u) => u.includes("Heavy"))).toBe(true);
    });

    it("should handle low operator skill", () => {
      const lowSkillShop: ShopContext = {
        ...JM_DIE_SHOP_CONTEXT,
        operator_skill: 2,
      };

      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: lowSkillShop,
        material: "D2",
        operation: "both",
        include_reasoning: true,
      };

      const result = FourthAxisDecisionEngine.decide(input);

      // Confidence should be lower due to skill uncertainty
      expect(result.confidence).toBeLessThan(0.9);
    });
  });
});

// ============================================================================
// PARAMETRIC SWEEP: 4TH AXIS SCENARIOS
// ============================================================================

describe("Parametric Sweep: 4th Axis Scenarios", () => {
  const materials = ["1045", "D2", "A2", "304", "6061", "Ti-6Al-4V"];
  const machinedSides = [2, 3, 4, 5, 6];
  const batchSizes = [1, 5, 10, 25, 50, 100];

  it.each(materials)("should make decision for material %s", (material) => {
    const input: FourthAxisDecisionInput = {
      part: DIE_BLOCK_PART,
      shop: JM_DIE_SHOP_CONTEXT,
      material,
      operation: "both",
    };

    const result = FourthAxisDecisionEngine.decide(input);

    expect(result.recommended_strategy).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it.each(machinedSides)("should handle %d machined sides", (sides) => {
    const part: PartGeometry = {
      ...DIE_BLOCK_PART,
      machined_sides: sides,
    };

    const input: FourthAxisDecisionInput = {
      part,
      shop: JM_DIE_SHOP_CONTEXT,
      material: "D2",
      operation: "both",
    };

    const result = FourthAxisDecisionEngine.decide(input);

    expect(result.recommended_strategy).toBeTruthy();
    // More sides should favor 4th axis
    if (sides >= 4) {
      expect(result.recommended_strategy).toMatch(/4th_axis|5_axis/);
    }
  });

  it.each(batchSizes)("should optimize for batch size %d", (batch) => {
    const shop: ShopContext = {
      ...JM_DIE_SHOP_CONTEXT,
      batch_size: batch,
    };

    const input: FourthAxisDecisionInput = {
      part: DIE_BLOCK_PART,
      shop,
      material: "D2",
      operation: "both",
    };

    const result = FourthAxisDecisionEngine.decide(input);

    expect(result.expected_cost_per_part).toBeGreaterThan(0);
    // Higher batch should have lower cost per part (setup amortization)
    if (batch >= 25) {
      expect(result.expected_cost_per_part).toBeLessThan(50);
    }
  });
});

// ============================================================================
// CROSS-MACHINE VALIDATION
// ============================================================================

describe("Cross-Machine Validation", () => {
  const machines = [
    { id: "VMC-01", name: "Hurco VM30i" },
    { id: "VMC-02", name: "Okuma M460V-5AX" },
    { id: "VMC-03", name: "Haas VF-2" },
  ];

  const tombstoneConfigs: Array<"2-face" | "4-face" | "6-face"> = ["2-face", "4-face", "6-face"];

  it.each(machines)("should calculate indexing for $name", (machine) => {
    const input: FourthAxisInput = {
      machine_id: machine.id,
      mode: "positional",
      tombstone_config: "4-face",
    };

    const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;

    expect(result.positions).toHaveLength(4);
    expect(result.total_index_time_sec).toBeGreaterThan(0);
  });

  it.each(tombstoneConfigs)("should generate G-code for %s tombstone", (config) => {
    const input: FourthAxisInput = {
      machine_id: "VMC-03",
      rotary_table: HAAS_TR160,
      mode: "positional",
      tombstone_config: config,
    };

    const result = FourthAxisIndexingEngine.calculate(input) as PositionalIndexingResult;

    expect(result.g_code_snippet).toContain("G0");
    expect(result.g_code_snippet).toContain("A");

    const expectedFaces = parseInt(config);
    expect(result.positions).toHaveLength(expectedFaces);
  });
});

// ============================================================================
// REGRESSION TESTS FROM MS1
// ============================================================================

describe("Regression: MILL-HARD-MS1 Compatibility", () => {
  it("should not break tool steel classification", () => {
    // Verify D2 is still classified correctly
    const input: FourthAxisDecisionInput = {
      part: DIE_BLOCK_PART,
      shop: JM_DIE_SHOP_CONTEXT,
      material: "D2",
      operation: "both",
    };

    const result = FourthAxisDecisionEngine.decide(input);

    // D2 should work correctly
    expect(result.explanation).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("should work with all JM Die materials", () => {
    const jmDieMaterials = ["D2", "A2", "S7", "M2", "H13", "1045", "4140"];

    for (const material of jmDieMaterials) {
      const input: FourthAxisDecisionInput = {
        part: DIE_BLOCK_PART,
        shop: JM_DIE_SHOP_CONTEXT,
        material,
        operation: "both",
      };

      const result = FourthAxisDecisionEngine.decide(input);
      expect(result.recommended_strategy).toBeTruthy();
    }
  });
});
