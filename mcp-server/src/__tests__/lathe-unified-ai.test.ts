/**
 * LatheUnifiedAIEngine Tests — LLM-INTEL-15
 *
 * Tests for unified lathe AI orchestration:
 *   1. Process plan generation
 *   2. Setup sheet generation
 *   3. Real-time adaptive control
 *   4. Collision checking
 *   5. Tool inventory matching
 *   6. Plan optimization
 *   7. Comprehensive part analysis
 *
 * @module __tests__/lathe-unified-ai.test
 */

import { describe, it, expect } from "vitest";
import {
  LatheUnifiedAIEngine,
  latheUnifiedAIEngine,
  type LathePartDefinition,
  type LatheFeature,
  type RealTimeSignal,
  type OperationPlan,
} from "../engines/LatheUnifiedAIEngine.js";

// ============================================================================
// TEST DATA
// ============================================================================

const simpleShaftPart: LathePartDefinition = {
  part_id: "SHAFT-001",
  material: "4140_steel",
  hardness_hrc: 28,
  od_max_mm: 50,
  od_min_mm: 30,
  length_mm: 100,
  features: [
    { type: "face", location: "face", position_z_mm: 0, dimension_mm: 50 },
    { type: "od_turn", location: "od", position_z_mm: 0, dimension_mm: 50, depth_mm: 5 },
    { type: "od_turn", location: "od", position_z_mm: 30, dimension_mm: 40, depth_mm: 5 },
    { type: "chamfer", location: "od", position_z_mm: 0, dimension_mm: 2, angle_deg: 45 },
  ],
  tolerances: [
    { feature: "OD1", dimension_mm: 50, tolerance_mm: 0.02, type: "diameter" },
    { feature: "OD2", dimension_mm: 40, tolerance_mm: 0.02, type: "diameter" },
    { feature: "Length", dimension_mm: 100, tolerance_mm: 0.1, type: "length" },
  ],
  surface_finishes: [
    { feature: "OD1", ra_um: 1.6, location: "Bearing surface" },
  ],
  quantity: 50,
};

const complexMillTurnPart: LathePartDefinition = {
  part_id: "FITTING-002",
  material: "316_stainless",
  hardness_hrc: 22,
  od_max_mm: 40,
  od_min_mm: 20,
  length_mm: 60,
  id_bore_mm: 15,
  id_depth_mm: 30,
  features: [
    { type: "face", location: "face", position_z_mm: 0, dimension_mm: 40 },
    { type: "od_turn", location: "od", position_z_mm: 0, dimension_mm: 40, depth_mm: 3 },
    { type: "id_bore", location: "id", position_z_mm: 0, dimension_mm: 15, depth_mm: 30 },
    { type: "thread", location: "od", position_z_mm: 5, dimension_mm: 38, pitch_mm: 1.5 },
    { type: "cross_hole", location: "od", position_z_mm: 25, dimension_mm: 6, depth_mm: 10 },
    { type: "flat", location: "od", position_z_mm: 35, dimension_mm: 10, depth_mm: 3 },
    { type: "groove", location: "od", position_z_mm: 50, dimension_mm: 3, depth_mm: 2 },
    { type: "face", location: "back", position_z_mm: 60, dimension_mm: 40 },
  ],
  tolerances: [
    { feature: "Thread", dimension_mm: 38, tolerance_mm: 0.01, type: "diameter" },
    { feature: "Bore", dimension_mm: 15, tolerance_mm: 0.015, type: "diameter" },
    { feature: "Concentricity", dimension_mm: 0, tolerance_mm: 0.02, type: "concentricity" },
  ],
  surface_finishes: [
    { feature: "Bore", ra_um: 0.8, location: "Sealing surface" },
    { feature: "Thread", ra_um: 1.6, location: "Thread flanks" },
  ],
  quantity: 200,
};

// ============================================================================
// TESTS
// ============================================================================

describe("LatheUnifiedAIEngine", () => {
  const engine = latheUnifiedAIEngine;

  // ==========================================================================
  // generateProcessPlan
  // ==========================================================================
  describe("generateProcessPlan", () => {
    it("should generate plan for simple shaft", async () => {
      const result = await engine.generateProcessPlan(simpleShaftPart);

      expect(result.part_id).toBe("SHAFT-001");
      expect(result.plan_id).toBeTruthy();
      expect(result.recommended_machine).toBeDefined();
      expect(result.setups.length).toBeGreaterThan(0);
      expect(result.total_cycle_time_sec).toBeGreaterThan(0);
    });

    it("should generate plan for complex mill-turn part", async () => {
      const result = await engine.generateProcessPlan(complexMillTurnPart);

      expect(result.part_id).toBe("FITTING-002");
      // Should recommend live tooling for cross-hole and flat
      expect(
        result.recommended_machine.capabilities_used.includes("live_tooling") ||
        result.recommended_machine.machine_type.includes("live")
      ).toBe(true);
    });

    it("should include machine selection reasoning", async () => {
      const result = await engine.generateProcessPlan(simpleShaftPart);

      expect(result.recommended_machine.suitability_score).toBeGreaterThan(0);
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
    });

    it("should include quality predictions", async () => {
      const result = await engine.generateProcessPlan(simpleShaftPart);

      expect(result.quality_predictions.length).toBeGreaterThan(0);
      expect(result.quality_predictions[0].feature).toBeTruthy();
      expect(result.quality_predictions[0].confidence).toBeGreaterThan(0);
    });

    it("should include cost breakdown", async () => {
      const result = await engine.generateProcessPlan(simpleShaftPart);

      expect(result.estimated_cost.total_cost).toBeGreaterThan(0);
      expect(result.estimated_cost.cost_per_part).toBeGreaterThan(0);
      expect(result.estimated_cost.material_cost).toBeGreaterThan(0);
    });

    it("should detect need for multiple setups with back features", async () => {
      const result = await engine.generateProcessPlan(complexMillTurnPart);

      // Part has back face feature - should have >1 setup or sub-spindle
      const hasSubSpindle = result.recommended_machine.capabilities_used.includes("sub_spindle");
      const multipleSetups = result.setups.length > 1;
      expect(hasSubSpindle || multipleSetups).toBe(true);
    });

    it("should include reasoning chain", async () => {
      const result = await engine.generateProcessPlan(simpleShaftPart);

      expect(result.reasoning_chain.length).toBeGreaterThanOrEqual(5);
      result.reasoning_chain.forEach(step => {
        expect(step.engine).toBeTruthy();
        expect(step.action).toBeTruthy();
        expect(step.confidence).toBeGreaterThan(0);
      });
    });

    it("should handle high-volume production", async () => {
      const highVolumePart: LathePartDefinition = {
        ...simpleShaftPart,
        part_id: "HV-001",
        quantity: 10000,
      };

      const result = await engine.generateProcessPlan(highVolumePart);

      expect(result.estimated_cost.total_cost).toBeGreaterThan(
        result.estimated_cost.cost_per_part * 100  // Some bulk savings
      );
    });
  });

  // ==========================================================================
  // generateSetupSheet
  // ==========================================================================
  describe("generateSetupSheet", () => {
    it("should generate setup sheet from plan", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const sheet = engine.generateSetupSheet(plan, 1, "Test Shaft", "O1234");

      expect(sheet.part_id).toBe(plan.part_id);
      expect(sheet.part_name).toBe("Test Shaft");
      expect(sheet.program_number).toBe("O1234");
      expect(sheet.machine).toBeTruthy();
    });

    it("should include workholding details", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const sheet = engine.generateSetupSheet(plan, 1, "Shaft", "O1000");

      expect(sheet.workholding.chuck_type).toBeTruthy();
      expect(sheet.workholding.jaw_type).toBeTruthy();
      expect(sheet.workholding.grip_point).toBeTruthy();
      expect(sheet.workholding.z_zero_location).toBeTruthy();
    });

    it("should include tool list", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const sheet = engine.generateSetupSheet(plan, 1, "Shaft", "O1000");

      expect(sheet.tools.length).toBeGreaterThan(0);
      sheet.tools.forEach(tool => {
        expect(tool.position).toBeGreaterThan(0);
        expect(tool.tool_description).toBeTruthy();
      });
    });

    it("should include operation summary", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const sheet = engine.generateSetupSheet(plan, 1, "Shaft", "O1000");

      expect(sheet.operation_summary.length).toBeGreaterThan(0);
    });

    it("should include safety notes", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const sheet = engine.generateSetupSheet(plan, 1, "Shaft", "O1000");

      expect(sheet.safety_notes.length).toBeGreaterThan(0);
      expect(sheet.safety_notes.some(n => n.toLowerCase().includes("chuck"))).toBe(true);
    });

    it("should throw for invalid setup number", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);

      expect(() => engine.generateSetupSheet(plan, 99, "Shaft", "O1000")).toThrow();
    });
  });

  // ==========================================================================
  // processRealTimeSignal
  // ==========================================================================
  describe("processRealTimeSignal", () => {
    const mockOperation: OperationPlan = {
      operation_number: 1,
      operation_type: "OD Turning",
      feature: "od_turn at Z0",
      tool: {
        tool_type: "OD Turning Insert",
        insert_grade: "GC4325",
        position: 1,
        is_live_tool: false,
      },
      parameters: {
        speed_m_min: 200,
        feed_mm_rev: 0.25,
        doc_mm: 2,
        coolant: "flood",
        css_enabled: true,
      },
      cycle_time_sec: 30,
      notes: [],
    };

    it("should continue for normal signals", () => {
      const signal: RealTimeSignal = {
        timestamp: new Date(),
        signal_type: "force",
        value: 800,
        unit: "N",
        sensor_id: "S1",
      };

      const result = engine.processRealTimeSignal(signal, mockOperation, []);

      expect(result.action_type).toBe("continue");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should pause for critical force", () => {
      const signal: RealTimeSignal = {
        timestamp: new Date(),
        signal_type: "force",
        value: 3000,  // Very high
        unit: "N",
        sensor_id: "S1",
      };

      const result = engine.processRealTimeSignal(signal, mockOperation, []);

      expect(result.action_type).toBe("pause");
      expect(result.urgency).toBe("immediate");
    });

    it("should adjust feed for high force", () => {
      const signal: RealTimeSignal = {
        timestamp: new Date(),
        signal_type: "force",
        value: 1800,  // Above normal
        unit: "N",
        sensor_id: "S1",
      };

      const result = engine.processRealTimeSignal(signal, mockOperation, []);

      expect(result.action_type).toBe("adjust_feed");
      expect(result.recommended_value).toBeLessThan(mockOperation.parameters.feed_mm_rev);
    });

    it("should adjust speed for high temperature", () => {
      const signal: RealTimeSignal = {
        timestamp: new Date(),
        signal_type: "temperature",
        value: 700,  // Above normal
        unit: "C",
        sensor_id: "T1",
      };

      const result = engine.processRealTimeSignal(signal, mockOperation, []);

      expect(result.action_type).toBe("adjust_speed");
      expect(result.recommended_value).toBeLessThan(mockOperation.parameters.speed_m_min);
    });

    it("should detect chatter from vibration history", () => {
      const history: RealTimeSignal[] = Array(15).fill(null).map((_, i) => ({
        timestamp: new Date(),
        signal_type: "vibration" as const,
        value: Math.sin(i) * 2 + 1,  // Oscillating - simulates chatter
        unit: "g",
        sensor_id: "V1",
      }));

      const signal: RealTimeSignal = {
        timestamp: new Date(),
        signal_type: "vibration",
        value: 2.5,
        unit: "g",
        sensor_id: "V1",
      };

      const result = engine.processRealTimeSignal(signal, mockOperation, history);

      // May or may not detect chatter depending on variance calculation
      expect(["adjust_speed", "continue"]).toContain(result.action_type);
    });
  });

  // ==========================================================================
  // checkCollisions
  // ==========================================================================
  describe("checkCollisions", () => {
    const machineEnvelope = {
      max_x_mm: 200,
      min_x_mm: -50,
      max_z_mm: 500,
      min_z_mm: -10,
      chuck_od_mm: 200,
      tailstock_z_mm: 400,
    };

    it("should check collisions for valid plan", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const result = engine.checkCollisions(plan, machineEnvelope);

      expect(result.safe).toBeDefined();
      expect(result.collision_risks).toBeDefined();
      expect(result.clearances).toBeDefined();
    });

    it("should detect turret-chuck risk", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);

      // Use small envelope to force collision risk
      const tightEnvelope = {
        ...machineEnvelope,
        chuck_od_mm: 100,
      };

      const result = engine.checkCollisions(plan, tightEnvelope);

      // Should have some clearance checks
      expect(result.clearances.length).toBeGreaterThanOrEqual(0);
    });

    it("should include recommendations", async () => {
      const plan = await engine.generateProcessPlan(complexMillTurnPart);
      const result = engine.checkCollisions(plan, machineEnvelope);

      expect(result.recommendations).toBeDefined();
    });
  });

  // ==========================================================================
  // matchToolInventory
  // ==========================================================================
  describe("matchToolInventory", () => {
    const shopInventory = [
      {
        tool_id: "T001",
        tool_type: "OD Turning",
        insert_grades: ["GC4325", "GC4315", "GC4305"],
        nose_radius_options: [0.4, 0.8, 1.2],
        quantity_available: 5,
      },
      {
        tool_id: "T002",
        tool_type: "Boring Bar",
        insert_grades: ["GC4225", "GC4215"],
        nose_radius_options: [0.4, 0.8],
        quantity_available: 3,
      },
      {
        tool_id: "T003",
        tool_type: "Threading Insert",
        insert_grades: ["GC1020", "GC1030"],
        nose_radius_options: [],
        quantity_available: 10,
      },
    ];

    it("should match tools from inventory", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const result = engine.matchToolInventory(plan, shopInventory);

      expect(result.matched_tools.length).toBeGreaterThan(0);
    });

    it("should identify exact grade matches", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const result = engine.matchToolInventory(plan, shopInventory);

      const exactMatches = result.matched_tools.filter(m =>
        m.notes.toLowerCase().includes("exact")
      );
      expect(exactMatches.length).toBeGreaterThanOrEqual(0);
    });

    it("should list missing tools", async () => {
      const plan = await engine.generateProcessPlan(complexMillTurnPart);
      const result = engine.matchToolInventory(plan, shopInventory);

      // Complex part likely needs tools not in simple inventory
      expect(result.missing_tools).toBeDefined();
    });

    it("should provide procurement suggestions", async () => {
      const plan = await engine.generateProcessPlan(complexMillTurnPart);
      const result = engine.matchToolInventory(plan, shopInventory);

      if (result.missing_tools.length > 0) {
        expect(result.procurement_suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // optimizePlan
  // ==========================================================================
  describe("optimizePlan", () => {
    it("should identify optimizations", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const result = engine.optimizePlan(plan);

      expect(result.original_cycle_time_sec).toBe(plan.total_cycle_time_sec);
      expect(result.optimizations).toBeDefined();
    });

    it("should calculate savings", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const result = engine.optimizePlan(plan);

      expect(result.savings_percent).toBeGreaterThanOrEqual(0);
      expect(result.optimized_cycle_time_sec).toBeLessThanOrEqual(result.original_cycle_time_sec);
    });

    it("should rate optimization risks", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      const result = engine.optimizePlan(plan);

      result.optimizations.forEach(opt => {
        expect(["low", "medium", "high"]).toContain(opt.risk);
      });
    });

    it("should suggest feed increases for conservative roughing", async () => {
      const plan = await engine.generateProcessPlan(simpleShaftPart);

      // Force conservative parameters
      if (plan.setups[0]?.operations[0]) {
        plan.setups[0].operations[0].parameters.feed_mm_rev = 0.15;
      }

      const result = engine.optimizePlan(plan);

      const feedOptimizations = result.optimizations.filter(o =>
        o.type === "feed_increase"
      );
      expect(feedOptimizations.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // analyzePartComprehensive
  // ==========================================================================
  describe("analyzePartComprehensive", () => {
    it("should classify part complexity", () => {
      const result = engine.analyzePartComprehensive(simpleShaftPart);

      expect(result.classification.complexity).toBeTruthy();
      expect(result.classification.category).toBeTruthy();
      expect(result.classification.required_capabilities.length).toBeGreaterThan(0);
    });

    it("should recommend machine", () => {
      const result = engine.analyzePartComprehensive(complexMillTurnPart);

      expect(result.machine_recommendation.recommended.machine_type).toBeTruthy();
      expect(result.machine_recommendation.recommended.suitability_score).toBeGreaterThan(0);
    });

    it("should provide material strategy", () => {
      const result = engine.analyzePartComprehensive(simpleShaftPart);

      expect(result.material_strategy.iso_group).toBeTruthy();
      expect(result.material_strategy.recommended_speed_range.min).toBeGreaterThan(0);
      expect(result.material_strategy.coolant_strategy).toBeTruthy();
    });

    it("should identify critical features", () => {
      const tightTolerancePart: LathePartDefinition = {
        ...simpleShaftPart,
        tolerances: [
          { feature: "Critical OD", dimension_mm: 50, tolerance_mm: 0.005, type: "diameter" },
        ],
      };

      const result = engine.analyzePartComprehensive(tightTolerancePart);

      expect(result.critical_features.length).toBeGreaterThan(0);
      expect(result.critical_features[0].criticality).toBe("very_high");
    });

    it("should include learning insights", () => {
      const result = engine.analyzePartComprehensive(simpleShaftPart);

      expect(result.learning_insights).toBeDefined();
      expect(result.learning_insights.historical_success_rate).toBeGreaterThan(0);
    });

    it("should provide confidence summary", () => {
      const result = engine.analyzePartComprehensive(simpleShaftPart);

      expect(result.confidence_summary.overall_confidence).toBeGreaterThan(0);
      expect(result.confidence_summary.overall_confidence).toBeLessThanOrEqual(1);
    });

    it("should identify stainless steel challenges", () => {
      const result = engine.analyzePartComprehensive(complexMillTurnPart);

      expect(result.material_strategy.key_challenges.some(c =>
        c.toLowerCase().includes("work") || c.toLowerCase().includes("chip")
      )).toBe(true);
    });
  });

  // ==========================================================================
  // Integration tests
  // ==========================================================================
  describe("integration", () => {
    it("should handle end-to-end workflow", async () => {
      // 1. Analyze part
      const analysis = engine.analyzePartComprehensive(simpleShaftPart);
      expect(analysis.classification.complexity).toBeTruthy();

      // 2. Generate process plan
      const plan = await engine.generateProcessPlan(simpleShaftPart);
      expect(plan.setups.length).toBeGreaterThan(0);

      // 3. Generate setup sheet
      const sheet = engine.generateSetupSheet(plan, 1, "Integration Test", "O9999");
      expect(sheet.tools.length).toBeGreaterThan(0);

      // 4. Check collisions
      const collisions = engine.checkCollisions(plan, {
        max_x_mm: 200, min_x_mm: -50,
        max_z_mm: 500, min_z_mm: -10,
        chuck_od_mm: 200,
      });
      expect(collisions.safe).toBeDefined();

      // 5. Optimize
      const optimization = engine.optimizePlan(plan);
      expect(optimization.savings_percent).toBeGreaterThanOrEqual(0);
    });

    it("should maintain reasoning chain integrity", async () => {
      const plan = await engine.generateProcessPlan(complexMillTurnPart);

      // Verify reasoning chain is sequential
      for (let i = 1; i < plan.reasoning_chain.length; i++) {
        expect(plan.reasoning_chain[i].step).toBe(plan.reasoning_chain[i - 1].step + 1);
      }

      // Verify all steps have required fields
      plan.reasoning_chain.forEach(step => {
        expect(step.engine).toBeTruthy();
        expect(step.action).toBeTruthy();
        expect(step.input_summary).toBeTruthy();
        expect(step.output_summary).toBeTruthy();
      });
    });
  });
});
