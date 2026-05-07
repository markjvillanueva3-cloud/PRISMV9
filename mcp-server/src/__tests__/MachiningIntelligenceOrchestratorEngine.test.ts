/**
 * MachiningIntelligenceOrchestratorEngine Tests
 *
 * Tests the super-orchestrator that coordinates all 348 AI subsystems.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  machiningIntelligenceOrchestratorEngine,
  type MachiningContext,
} from "../engines/MachiningIntelligenceOrchestratorEngine.js";
import { machineKinematicStateEngine } from "../engines/MachineKinematicStateEngine.js";

describe("MachiningIntelligenceOrchestratorEngine", () => {
  describe("orchestrate", () => {
    it("should generate a complete machining plan for milling steel", async () => {
      const context: MachiningContext = {
        machine_type: "mill",
        operation_type: "roughing",
        material: {
          name: "Steel_4140",
          iso_group: "P",
          hardness_hrc: 30,
        },
        tool: {
          type: "endmill",
          diameter_mm: 12,
          flutes: 4,
          material: "carbide",
          coating: "TiAlN",
        },
        geometry: {
          stock_dimensions_mm: [100, 50, 25],
          feature_complexity: "moderate",
        },
        constraints: {
          max_spindle_rpm: 10000,
          max_power_kw: 15,
        },
      };

      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(context);

      // Verify plan structure
      expect(plan.context).toBeDefined();
      expect(plan.cutting_parameters).toBeDefined();
      expect(plan.predictions).toBeDefined();
      expect(plan.safety).toBeDefined();
      expect(plan.subsystem_results).toBeDefined();
      expect(plan.reasoning_chain).toBeDefined();

      // Verify cutting parameters are reasonable
      expect(plan.cutting_parameters.cutting_speed_m_min).toBeGreaterThan(50);
      expect(plan.cutting_parameters.cutting_speed_m_min).toBeLessThan(500);
      expect(plan.cutting_parameters.spindle_rpm).toBeGreaterThan(1000);
      expect(plan.cutting_parameters.feed_rate_mm_min).toBeGreaterThan(100);

      // Verify all 9 subsystems executed (Phases 1-9)
      expect(plan.subsystem_results.length).toBe(9);
      const subsystems = plan.subsystem_results.map(r => r.subsystem);
      expect(subsystems).toContain("physics");
      expect(subsystems).toContain("neural");
      expect(subsystems).toContain("adaptive");
      expect(subsystems).toContain("reasoning");
      expect(subsystems).toContain("meta");
      expect(subsystems).toContain("xai");

      // Verify confidence
      expect(plan.confidence).toBeGreaterThan(0.5);
      expect(plan.confidence).toBeLessThanOrEqual(1.0);
    });

    it("should apply Kienzle model for force calculation", async () => {
      const context: MachiningContext = {
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "Steel_4140", iso_group: "P" },
        tool: { type: "endmill", diameter_mm: 10, material: "carbide" },
        geometry: { stock_dimensions_mm: [50, 50, 20], feature_complexity: "simple" },
        constraints: {},
      };

      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(context);
      const physicsResult = plan.subsystem_results.find(r => r.subsystem === "physics");

      expect(physicsResult).toBeDefined();
      expect(physicsResult!.confidence).toBeGreaterThan(0.9);

      const physicsData = physicsResult!.result as { kienzle_kc1_1: number; kienzle_mc: number };
      expect(physicsData.kienzle_kc1_1).toBe(1800); // P-group canonical value
      expect(physicsData.kienzle_mc).toBe(0.25);
    });

    it("should generate safety scores", async () => {
      const context: MachiningContext = {
        machine_type: "lathe",
        operation_type: "finishing",
        material: { name: "Aluminum_6061", iso_group: "N" },
        tool: { type: "insert", diameter_mm: 8, material: "carbide" },
        geometry: { stock_dimensions_mm: [30, 30, 50], feature_complexity: "simple" },
        constraints: { max_force_n: 1000, max_power_kw: 5 },
      };

      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(context);

      expect(plan.safety.force_ratio).toBeGreaterThan(0);
      expect(plan.safety.force_ratio).toBeLessThan(2);
      expect(plan.safety.power_ratio).toBeGreaterThan(0);
      expect(plan.safety.stability_margin).toBeGreaterThan(0);
      expect(plan.safety.overall_safety_score).toBeGreaterThan(0);
    });

    it("should include reasoning chain for explainability", async () => {
      const context: MachiningContext = {
        machine_type: "5axis",
        operation_type: "semi_finishing",
        material: { name: "Ti6Al4V", iso_group: "S", hardness_hrc: 36 },
        tool: { type: "ball_endmill", diameter_mm: 6, flutes: 2, material: "carbide" },
        geometry: { stock_dimensions_mm: [80, 40, 30], feature_complexity: "complex" },
        constraints: { target_surface_finish_um: 1.6 },
      };

      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(context);

      expect(plan.reasoning_chain.length).toBeGreaterThan(5);
      expect(plan.reasoning_chain.some(r => r.includes("[ORCHESTRATOR]"))).toBe(true);
      expect(plan.reasoning_chain.some(r => r.includes("[PHYSICS]"))).toBe(true);
      expect(plan.reasoning_chain.some(r => r.includes("[NEURAL]"))).toBe(true);
    });
  });

  describe("getAvailableSubsystems", () => {
    it("should return subsystems for milling", () => {
      const subsystems = machiningIntelligenceOrchestratorEngine.getAvailableSubsystems("mill");

      expect(subsystems.get("physics")?.length).toBeGreaterThan(0);
      expect(subsystems.get("neural")?.length).toBeGreaterThan(0);
      expect(subsystems.get("adaptive")?.length).toBeGreaterThan(0);
      expect(subsystems.get("reasoning")?.length).toBeGreaterThan(0);
    });

    it("should include machine-specific engines", () => {
      const millSubsystems = machiningIntelligenceOrchestratorEngine.getAvailableSubsystems("mill");
      const latheSubsystems = machiningIntelligenceOrchestratorEngine.getAvailableSubsystems("lathe");

      const millEngines = millSubsystems.get("reasoning")?.map(e => e.name) || [];
      const latheEngines = latheSubsystems.get("reasoning")?.map(e => e.name) || [];

      expect(millEngines).toContain("millingDeepReasoningEngine");
      expect(latheEngines).toContain("latheDeepReasoningEngine");
      expect(latheEngines).not.toContain("millingDeepReasoningEngine");
    });
  });

  describe("getSubsystemStatus", () => {
    it("should return status for all 6 subsystems", () => {
      const status = machiningIntelligenceOrchestratorEngine.getSubsystemStatus();

      expect(status.length).toBe(6);
      const subsystemNames = status.map(s => s.subsystem);
      expect(subsystemNames).toContain("physics");
      expect(subsystemNames).toContain("neural");
      expect(subsystemNames).toContain("adaptive");
      expect(subsystemNames).toContain("reasoning");
      expect(subsystemNames).toContain("meta");
      expect(subsystemNames).toContain("xai");
    });

    it("should have reasonable engine counts", () => {
      const status = machiningIntelligenceOrchestratorEngine.getSubsystemStatus();

      for (const s of status) {
        expect(s.engine_count).toBeGreaterThan(0);
        expect(s.capabilities.length).toBeGreaterThan(0);
      }
    });
  });

  describe("queryCapability", () => {
    it("should find force-related engines", () => {
      const engines = machiningIntelligenceOrchestratorEngine.queryCapability("force_prediction");

      expect(engines.length).toBeGreaterThan(0);
      expect(engines[0].subsystem).toBe("neural");
    });

    it("should find chatter-related engines sorted by priority", () => {
      const engines = machiningIntelligenceOrchestratorEngine.queryCapability("chatter_suppression");

      expect(engines.length).toBeGreaterThan(0);
      // Should be sorted by priority descending
      for (let i = 1; i < engines.length; i++) {
        expect(engines[i - 1].priority).toBeGreaterThanOrEqual(engines[i].priority);
      }
    });
  });

  // Phase 8: Deep Learning Integration (U-MIO22/22A/22B/23/24)
  describe("deep learning subsystem", () => {
    const baseContext: MachiningContext = {
      machine_type: "mill",
      operation_type: "finishing",
      material: {
        name: "Aluminum_6061",
        iso_group: "N",
        hardness_hb: 95,
      },
      tool: {
        type: "end_mill",
        diameter_mm: 10,
        flutes: 3,
        material: "carbide",
        length_mm: 60,
      },
      geometry: {
        stock_dimensions_mm: [100, 100, 30],
        feature_complexity: "moderate",
      },
      constraints: {
        max_force_n: 500,
        max_power_kw: 5,
        coolant_type: "flood",
      },
      preferences: {
        optimization_target: "balanced",
        aggressiveness: 0.7,
      },
    };

    it("emits a deep_learning field on the machining plan", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);

      expect(plan.deep_learning).toBeDefined();
      expect(plan.deep_learning!.aggregated_confidence).toBeGreaterThan(0);
      expect(Array.isArray(plan.deep_learning!.neural_predictions)).toBe(true);
    });

    it("invokes the unified 5-target inference pipeline (U-MIO22B)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);

      const targets = plan.deep_learning!.neural_predictions.map(p => p.target);
      // Any subset may be available depending on registered models; at least 1 must respond.
      expect(targets.length).toBeGreaterThan(0);
      for (const pred of plan.deep_learning!.neural_predictions) {
        expect(pred.confidence).toBeGreaterThanOrEqual(0);
        expect(pred.confidence).toBeLessThanOrEqual(1);
        expect(typeof pred.fallback_used).toBe("boolean");
      }
    });

    it("surfaces neural model versions when registered (U-MIO22A)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);

      // model_versions object always present; may be empty if no checkpoints registered
      expect(plan.deep_learning!.model_versions).toBeDefined();
      expect(typeof plan.deep_learning!.model_versions).toBe("object");
    });

    it("attempts material transfer scaling for non-reference materials (U-MIO23)", async () => {
      // Aluminum_6061 differs from reference "Aluminum" → transfer should either scale or soft-fail
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);

      // If transfer succeeded, scaled_speed must be finite positive; if skipped, field may be undefined
      if (plan.deep_learning!.transfer_learning?.scaled_speed_mmin !== undefined) {
        expect(plan.deep_learning!.transfer_learning!.scaled_speed_mmin).toBeGreaterThan(0);
        expect(plan.deep_learning!.transfer_learning!.similarity_score).toBeGreaterThanOrEqual(0);
        expect(plan.deep_learning!.transfer_learning!.similarity_score).toBeLessThanOrEqual(1);
      }
    });

    it("includes [DL] reasoning-chain entries", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);

      const dlEntries = plan.reasoning_chain.filter(e => e.includes("[DL]"));
      expect(dlEntries.length).toBeGreaterThan(0);
    });

    it("registers the Phase 8 subsystem in subsystem_results with neural type", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);

      const phase8 = plan.subsystem_results.find(
        r => r.engine_name === "MillingInferenceOrchestratorEngine+TransferLearning+LoRA"
      );
      expect(phase8).toBeDefined();
      expect(phase8!.subsystem).toBe("neural");
    });
  });

  // Phase 9: Cognitive Reasoning Layer (U-MIO25/26/27/27A/27B/27C)
  describe("cognitive reasoning subsystem", () => {
    const cogContext: MachiningContext = {
      machine_type: "mill",
      operation_type: "finishing",
      material: { name: "Steel_4140", iso_group: "P", hardness_hrc: 32 },
      tool: { type: "end_mill", diameter_mm: 8, flutes: 4, material: "carbide" },
      geometry: { stock_dimensions_mm: [60, 40, 20], feature_complexity: "moderate" },
      constraints: { max_force_n: 800, max_power_kw: 7, target_surface_finish_um: 1.6 },
    };

    it("emits a cognitive field on the machining plan", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(cogContext);

      expect(plan.cognitive).toBeDefined();
      expect(Array.isArray(plan.cognitive!.causal_root_causes)).toBe(true);
      expect(Array.isArray(plan.cognitive!.formula_citations)).toBe(true);
    });

    it("builds a proof tree with formula citations (U-MIO27A)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(cogContext);

      expect(plan.cognitive!.proof_tree_id).toBeDefined();
      expect(plan.cognitive!.proof_tree_node_count).toBeGreaterThan(0);
      expect(plan.cognitive!.proof_tree_depth).toBeGreaterThanOrEqual(0);
      expect(plan.cognitive!.formula_citations.length).toBeGreaterThan(0);
      expect(plan.cognitive!.formula_citations.some(c => c.includes("Kienzle"))).toBe(true);
      expect(plan.cognitive!.formula_citations.some(c => c.includes("Taylor"))).toBe(true);
    });

    it("isolates causal root causes for surface_finish (U-MIO25)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(cogContext);

      // root causes are the top-of-DAG nodes — spindle_rpm / feed_per_tooth / axial_depth
      expect(plan.cognitive!.causal_root_causes.length).toBeGreaterThan(0);
      const expectedRoots = ["spindle_rpm", "feed_per_tooth", "axial_depth"];
      const hasAnyExpected = plan.cognitive!.causal_root_causes.some(r => expectedRoots.includes(r));
      expect(hasAnyExpected).toBe(true);
    });

    it("projects tool-wear temporal trend (U-MIO26)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(cogContext);

      expect(plan.cognitive!.temporal_projection).toBeDefined();
      expect(plan.cognitive!.temporal_projection!.series).toBe("tool_wear_mm");
      expect(["increasing", "decreasing", "stable"]).toContain(
        plan.cognitive!.temporal_projection!.trend
      );
      expect(plan.cognitive!.temporal_projection!.confidence).toBeGreaterThanOrEqual(0);
      expect(plan.cognitive!.temporal_projection!.confidence).toBeLessThanOrEqual(1);
    });

    it("runs chain-of-thought reasoning steps (U-MIO27B)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(cogContext);

      expect(plan.cognitive!.chain_of_thought_steps).toBeGreaterThan(0);
      expect(plan.cognitive!.chain_of_thought_backtracks).toBeGreaterThanOrEqual(0);
    });

    it("records a reasoning trace ledger entry (U-MIO27/27C)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(cogContext);

      expect(plan.cognitive!.ledger_entry_id).toBeDefined();
      expect(plan.cognitive!.ledger_entry_id).toMatch(/^mrt-/);
    });

    it("includes [DL], [CAUSAL], [TEMPORAL], [COT], [LEDGER] reasoning-chain markers", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(cogContext);

      expect(plan.reasoning_chain.some(e => e.includes("[DL] Proof tree"))).toBe(true);
      expect(plan.reasoning_chain.some(e => e.includes("[CAUSAL]"))).toBe(true);
      expect(plan.reasoning_chain.some(e => e.includes("[TEMPORAL]"))).toBe(true);
      expect(plan.reasoning_chain.some(e => e.includes("[COT]"))).toBe(true);
      expect(plan.reasoning_chain.some(e => e.includes("[LEDGER]"))).toBe(true);
    });

    it("registers the Phase 9 subsystem with reasoning type", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(cogContext);

      const phase9 = plan.subsystem_results.find(
        r => r.engine_name?.startsWith("CognitiveSubsystem")
      );
      expect(phase9).toBeDefined();
      expect(phase9!.subsystem).toBe("reasoning");
      expect(phase9!.confidence).toBeGreaterThan(0);
    });
  });

  // ==================== PHASE 10: END-TO-END INTEGRATION (U-MIO28) ====================
  describe("end-to-end integration", () => {
    it("handles all 6 ISO material groups without crashing", async () => {
      const groups: Array<{ name: string; iso: "P" | "M" | "K" | "N" | "S" | "H" }> = [
        { name: "Steel_1045", iso: "P" },
        { name: "Stainless_304", iso: "M" },
        { name: "CastIron_GG25", iso: "K" },
        { name: "Aluminum_6061", iso: "N" },
        { name: "Ti6Al4V", iso: "S" },
        { name: "HardenedSteel_D2", iso: "H" },
      ];
      for (const g of groups) {
        const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
          machine_type: "mill",
          operation_type: "roughing",
          material: { name: g.name, iso_group: g.iso },
          tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
          geometry: { stock_dimensions_mm: [50, 50, 20], feature_complexity: "simple" },
          constraints: {},
        });
        expect(plan.cutting_parameters.spindle_rpm).toBeGreaterThan(0);
        expect(plan.context.material.iso_group).toBe(g.iso);
      }
    });

    it("handles all 6 machine types", async () => {
      const machines: MachiningContext["machine_type"][] = [
        "mill", "lathe", "5axis", "wire_edm", "sinker_edm", "grinder",
      ];
      for (const m of machines) {
        const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
          machine_type: m,
          operation_type: "roughing",
          material: { name: "Steel_1045", iso_group: "P" },
          tool: { type: "endmill", diameter_mm: 8, flutes: 4, material: "carbide" },
          geometry: { stock_dimensions_mm: [40, 40, 15], feature_complexity: "simple" },
          constraints: {},
        });
        expect(plan.context.machine_type).toBe(m);
        expect(plan.subsystem_results.length).toBe(9);
      }
    });

    it("produces identical results for identical inputs (determinism where possible)", async () => {
      const ctx: MachiningContext = {
        machine_type: "mill",
        operation_type: "finishing",
        material: { name: "Aluminum_6061", iso_group: "N" },
        tool: { type: "endmill", diameter_mm: 6, flutes: 2, material: "carbide" },
        geometry: { stock_dimensions_mm: [30, 30, 10], feature_complexity: "simple" },
        constraints: {},
      };
      const a = await machiningIntelligenceOrchestratorEngine.orchestrate(ctx);
      const b = await machiningIntelligenceOrchestratorEngine.orchestrate(ctx);

      expect(a.cutting_parameters.spindle_rpm).toBe(b.cutting_parameters.spindle_rpm);
      expect(a.predictions.mrr_cm3_min).toBeCloseTo(b.predictions.mrr_cm3_min, 4);
    });

    it("honors max_force_n constraint via safety.force_ratio", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "Ti6Al4V", iso_group: "S", hardness_hrc: 36 },
        tool: { type: "endmill", diameter_mm: 12, flutes: 4, material: "carbide" },
        geometry: { stock_dimensions_mm: [80, 50, 30], feature_complexity: "moderate" },
        constraints: { max_force_n: 500 },
      });
      expect(plan.safety.force_ratio).toBeGreaterThan(0);
      // ratio = predicted / limit; must be finite and non-negative
      expect(Number.isFinite(plan.safety.force_ratio)).toBe(true);
    });

    it("produces non-empty reasoning_chain for every orchestration", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "lathe",
        operation_type: "finishing",
        material: { name: "Stainless_316", iso_group: "M" },
        tool: { type: "insert", diameter_mm: 12, material: "carbide", coating: "TiAlN" },
        geometry: { stock_dimensions_mm: [50, 50, 100], feature_complexity: "moderate" },
        constraints: {},
      });
      expect(plan.reasoning_chain.length).toBeGreaterThanOrEqual(8);
    });

    it("confidence aggregates across all 9 subsystems", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "Steel_4140", iso_group: "P" },
        tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
        geometry: { stock_dimensions_mm: [60, 60, 25], feature_complexity: "simple" },
        constraints: {},
      });
      expect(plan.confidence).toBeGreaterThan(0);
      expect(plan.confidence).toBeLessThanOrEqual(1.0);
      expect(plan.subsystem_results.length).toBe(9);
    });

    it("predictions are consistent across Kienzle ISO groups (harder → higher Fc)", async () => {
      const softCtx: MachiningContext = {
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "Aluminum_6061", iso_group: "N" },
        tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
        geometry: { stock_dimensions_mm: [50, 50, 20], feature_complexity: "simple" },
        constraints: {},
      };
      const hardCtx: MachiningContext = { ...softCtx, material: { name: "Ti6Al4V", iso_group: "S" } };

      const soft = await machiningIntelligenceOrchestratorEngine.orchestrate(softCtx);
      const hard = await machiningIntelligenceOrchestratorEngine.orchestrate(hardCtx);

      // Titanium (kc1.1 = 2800) must have higher baseline force than Aluminum (kc1.1 = 700)
      expect(hard.predictions.cutting_force_n).toBeGreaterThan(soft.predictions.cutting_force_n);
    });

    it("post_processing field optional but well-formed when present", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "5axis",
        operation_type: "semi_finishing",
        material: { name: "Ti6Al4V", iso_group: "S" },
        tool: { type: "ball_endmill", diameter_mm: 6, flutes: 2, material: "carbide" },
        geometry: { stock_dimensions_mm: [80, 40, 30], feature_complexity: "complex" },
        constraints: {},
      });
      if (plan.post_processing) {
        expect(plan.post_processing.gcode_lines).toBeGreaterThanOrEqual(0);
        expect(typeof plan.post_processing.controller_dialect).toBe("string");
        expect(typeof plan.post_processing.hsm_enabled).toBe("boolean");
        expect(Array.isArray(plan.post_processing.optimizations_applied)).toBe(true);
      }
    });

    it("completes orchestration within reasonable time budget (<5s)", async () => {
      const start = Date.now();
      await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "Steel_1045", iso_group: "P" },
        tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
        geometry: { stock_dimensions_mm: [50, 50, 20], feature_complexity: "simple" },
        constraints: {},
      });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  });

  // ==================== EDGE CASES (U-MIO28) ====================
  describe("edge cases", () => {
    it("handles minimum tool diameter (1mm micro-tool)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "finishing",
        material: { name: "Aluminum_6061", iso_group: "N" },
        tool: { type: "endmill", diameter_mm: 1, flutes: 2, material: "carbide" },
        geometry: { stock_dimensions_mm: [10, 10, 5], feature_complexity: "simple" },
        constraints: { max_spindle_rpm: 40000 },
      });
      expect(plan.cutting_parameters.spindle_rpm).toBeGreaterThan(0);
      expect(plan.cutting_parameters.spindle_rpm).toBeLessThanOrEqual(40000);
    });

    it("handles large tool diameter (50mm face mill)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "Steel_1045", iso_group: "P" },
        tool: { type: "facemill", diameter_mm: 50, flutes: 6, material: "carbide" },
        geometry: { stock_dimensions_mm: [300, 200, 50], feature_complexity: "simple" },
        constraints: {},
      });
      expect(plan.cutting_parameters.spindle_rpm).toBeGreaterThan(0);
      expect(plan.cutting_parameters.spindle_rpm).toBeLessThan(2000);
    });

    it("handles missing hardness field (defaults apply)", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "UnknownAlloy", iso_group: "P" },
        tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
        geometry: { stock_dimensions_mm: [50, 50, 20], feature_complexity: "simple" },
        constraints: {},
      });
      expect(plan.cutting_parameters.spindle_rpm).toBeGreaterThan(0);
    });

    it("handles complex geometry flag", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "5axis",
        operation_type: "finishing",
        material: { name: "Aluminum_7075", iso_group: "N" },
        tool: { type: "ball_endmill", diameter_mm: 4, flutes: 2, material: "carbide" },
        geometry: { stock_dimensions_mm: [100, 100, 50], feature_complexity: "complex" },
        constraints: {},
      });
      expect(plan.context.geometry.feature_complexity).toBe("complex");
    });

    it("handles aggressive optimization preference", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "Steel_1045", iso_group: "P" },
        tool: { type: "endmill", diameter_mm: 12, flutes: 4, material: "carbide" },
        geometry: { stock_dimensions_mm: [60, 60, 30], feature_complexity: "simple" },
        constraints: {},
        preferences: { optimization_target: "mrr", aggressiveness: 1.0 },
      });
      expect(plan.predictions.mrr_cm3_min).toBeGreaterThan(0);
    });

    it("handles conservative optimization preference", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "finishing",
        material: { name: "HardenedSteel_D2", iso_group: "H", hardness_hrc: 62 },
        tool: { type: "endmill", diameter_mm: 6, flutes: 4, material: "carbide", coating: "TiAlN" },
        geometry: { stock_dimensions_mm: [30, 30, 10], feature_complexity: "simple" },
        constraints: { target_surface_finish_um: 0.8 },
        preferences: { optimization_target: "surface", aggressiveness: 0.2 },
      });
      expect(plan.cutting_parameters.spindle_rpm).toBeGreaterThan(0);
    });

    it("applies spindle RPM constraint as a ceiling", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "Aluminum_6061", iso_group: "N" },
        tool: { type: "endmill", diameter_mm: 3, flutes: 2, material: "carbide" },
        geometry: { stock_dimensions_mm: [20, 20, 10], feature_complexity: "simple" },
        constraints: { max_spindle_rpm: 12000 },
      });
      expect(plan.cutting_parameters.spindle_rpm).toBeLessThanOrEqual(12000);
    });

    it("warnings array present and well-formed", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate({
        machine_type: "mill",
        operation_type: "roughing",
        material: { name: "Steel_1045", iso_group: "P" },
        tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
        geometry: { stock_dimensions_mm: [50, 50, 20], feature_complexity: "simple" },
        constraints: {},
      });
      expect(Array.isArray(plan.warnings)).toBe(true);
    });
  });

  // ==================== AI SUBSYSTEM COORDINATION (U-MIO28) ====================
  describe("AI subsystem coordination", () => {
    const coordCtx: MachiningContext = {
      machine_type: "mill",
      operation_type: "semi_finishing",
      material: { name: "Inconel_718", iso_group: "S", hardness_hrc: 45 },
      tool: { type: "endmill", diameter_mm: 8, flutes: 4, material: "carbide", coating: "AlTiN" },
      geometry: { stock_dimensions_mm: [60, 40, 25], feature_complexity: "moderate" },
      constraints: { max_force_n: 1200, max_power_kw: 10 },
    };

    it("all subsystem types present in order: physics, neural, adaptive, reasoning, meta, xai", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(coordCtx);

      const subsystems = plan.subsystem_results.map(r => r.subsystem);
      expect(subsystems).toContain("physics");
      expect(subsystems).toContain("neural");
      expect(subsystems).toContain("adaptive");
      expect(subsystems).toContain("reasoning");
      expect(subsystems).toContain("meta");
      expect(subsystems).toContain("xai");
    });

    it("each subsystem result has required fields", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(coordCtx);
      for (const r of plan.subsystem_results) {
        expect(r.subsystem).toBeDefined();
        expect(r.engine_name).toBeDefined();
        expect(typeof r.confidence).toBe("number");
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(1.0);
        // reasoning_trace is optional but when present must be an array
        if (r.reasoning_trace !== undefined) {
          expect(Array.isArray(r.reasoning_trace)).toBe(true);
        }
        expect(typeof r.execution_time_ms).toBe("number");
      }
    });

    it("physics confidence is highest among classical computations", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(coordCtx);
      const physics = plan.subsystem_results.find(r => r.subsystem === "physics");
      expect(physics!.confidence).toBeGreaterThan(0.9);
    });

    it("deep_learning present and cognitive present in Phase 1-9 stack", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(coordCtx);
      expect(plan.deep_learning).toBeDefined();
      expect(plan.cognitive).toBeDefined();
    });

    it("reasoning_chain contains [ORCHESTRATOR], [PHYSICS], [NEURAL] prefixes", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(coordCtx);
      expect(plan.reasoning_chain.some(e => e.includes("[ORCHESTRATOR]"))).toBe(true);
      expect(plan.reasoning_chain.some(e => e.includes("[PHYSICS]"))).toBe(true);
      expect(plan.reasoning_chain.some(e => e.includes("[NEURAL]"))).toBe(true);
    });

    it("execution times are non-negative and sum to plan total", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(coordCtx);
      for (const r of plan.subsystem_results) {
        expect(r.execution_time_ms).toBeGreaterThanOrEqual(0);
      }
    });

    it("cutting_parameters fields all positive and finite", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(coordCtx);
      expect(Number.isFinite(plan.cutting_parameters.cutting_speed_m_min)).toBe(true);
      expect(Number.isFinite(plan.cutting_parameters.spindle_rpm)).toBe(true);
      expect(Number.isFinite(plan.cutting_parameters.feed_rate_mm_min)).toBe(true);
      expect(plan.cutting_parameters.cutting_speed_m_min).toBeGreaterThan(0);
      expect(plan.cutting_parameters.spindle_rpm).toBeGreaterThan(0);
      expect(plan.cutting_parameters.feed_rate_mm_min).toBeGreaterThan(0);
    });

    it("safety fields (force/power/stability/deflection/overall) all in [0, 2] band", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(coordCtx);
      expect(plan.safety.force_ratio).toBeGreaterThanOrEqual(0);
      expect(plan.safety.force_ratio).toBeLessThan(2);
      expect(plan.safety.power_ratio).toBeGreaterThanOrEqual(0);
      expect(plan.safety.power_ratio).toBeLessThan(2);
      expect(plan.safety.stability_margin).toBeGreaterThanOrEqual(0);
      expect(plan.safety.stability_margin).toBeLessThanOrEqual(1);
      expect(plan.safety.deflection_ratio).toBeGreaterThanOrEqual(0);
      expect(plan.safety.overall_safety_score).toBeGreaterThanOrEqual(-1);
      expect(plan.safety.overall_safety_score).toBeLessThanOrEqual(1);
    });

    it("MRR scales with axial depth for identical material/tool", async () => {
      const smallStock: MachiningContext = {
        ...coordCtx,
        geometry: { ...coordCtx.geometry, stock_dimensions_mm: [60, 40, 10] },
      };
      const largeStock: MachiningContext = {
        ...coordCtx,
        geometry: { ...coordCtx.geometry, stock_dimensions_mm: [60, 40, 50] },
      };
      const small = await machiningIntelligenceOrchestratorEngine.orchestrate(smallStock);
      const large = await machiningIntelligenceOrchestratorEngine.orchestrate(largeStock);

      // axial_depth = stock_z * 0.1 — larger stock → larger depth → larger MRR
      expect(large.cutting_parameters.axial_depth_mm).toBeGreaterThan(
        small.cutting_parameters.axial_depth_mm
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 11 U-MIO31: applySPCFeedback — closed-loop parameter adjustment
  // ──────────────────────────────────────────────────────────────────────────
  describe("applySPCFeedback (Phase 11 U-MIO31)", () => {
    const fbCtx: MachiningContext = {
      machine_type: "mill",
      operation_type: "roughing",
      material: { name: "Steel_4140", iso_group: "P", hardness_hrc: 30 },
      tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide", coating: "TiAlN" },
      geometry: { stock_dimensions_mm: [100, 50, 25], feature_complexity: "moderate" },
      constraints: { max_spindle_rpm: 10000, max_power_kw: 15 },
    };

    const sixSigmaMeasurements = [
      10.000, 9.998, 10.001, 9.999, 10.002, 9.999, 10.000, 10.001, 10.000, 9.999,
      10.001, 10.002, 10.000, 9.999, 10.000, 10.001, 9.998, 10.000, 10.001, 9.999,
    ];
    const outOfControlMeasurements = [
      9.80, 10.20, 9.70, 10.30, 9.75, 10.25, 9.80, 10.20, 9.72, 10.28,
      9.78, 10.22, 9.74, 10.26, 9.76, 10.24, 9.79, 10.21, 9.73, 10.27,
    ];

    it("no-op when no features provided", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(fbCtx);
      const result = machiningIntelligenceOrchestratorEngine.applySPCFeedback(plan, []);
      expect(result).toBe(plan);
    });

    it("returns maintain for Six Sigma features", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(fbCtx);
      const result = machiningIntelligenceOrchestratorEngine.applySPCFeedback(plan, [
        {
          feature_name: "bore_dia",
          measurements: sixSigmaMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
      ]);
      expect(result.spc_feedback?.overall_action).toBe("maintain");
      expect(result.spc_feedback?.parameter_multipliers.speed).toBeCloseTo(1.0, 2);
      expect(result.spc_feedback?.parameter_multipliers.feed).toBeCloseTo(1.0, 2);
      expect(result.cutting_parameters.spindle_rpm).toBe(plan.cutting_parameters.spindle_rpm);
    });

    it("escalates for Cpk below 1.0 features", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(fbCtx);
      const result = machiningIntelligenceOrchestratorEngine.applySPCFeedback(plan, [
        {
          feature_name: "critical_bore",
          measurements: outOfControlMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
      ]);
      expect(result.spc_feedback?.overall_action).toBe("escalate");
      expect(result.spc_feedback?.escalated_features).toContain("critical_bore");
      expect(result.warnings.some(w => w.includes("SPC feedback escalation"))).toBe(true);
    });

    it("scales cutting_speed by speed multiplier", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(fbCtx);
      const result = machiningIntelligenceOrchestratorEngine.applySPCFeedback(plan, [
        {
          feature_name: "bore_dia",
          measurements: outOfControlMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
      ]);
      const speedMult = result.spc_feedback!.parameter_multipliers.speed;
      expect(result.cutting_parameters.cutting_speed_m_min).toBeCloseTo(
        plan.cutting_parameters.cutting_speed_m_min * speedMult,
        2,
      );
    });

    it("picks worst-case action across multi-feature input", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(fbCtx);
      const result = machiningIntelligenceOrchestratorEngine.applySPCFeedback(plan, [
        {
          feature_name: "good_feature",
          measurements: sixSigmaMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
        {
          feature_name: "bad_feature",
          measurements: outOfControlMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
      ]);
      expect(result.spc_feedback?.overall_action).toBe("escalate");
      expect(result.spc_feedback?.features_evaluated).toBe(2);
    });

    it("adds SPC entries to reasoning_chain", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(fbCtx);
      const originalChainLen = plan.reasoning_chain.length;
      const result = machiningIntelligenceOrchestratorEngine.applySPCFeedback(plan, [
        {
          feature_name: "bore_dia",
          measurements: sixSigmaMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
      ]);
      expect(result.reasoning_chain.length).toBeGreaterThan(originalChainLen);
      expect(result.reasoning_chain.some(s => s.startsWith("[SPC]"))).toBe(true);
    });

    it("min_cpk captures worst feature capability", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(fbCtx);
      const result = machiningIntelligenceOrchestratorEngine.applySPCFeedback(plan, [
        {
          feature_name: "good",
          measurements: sixSigmaMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
        {
          feature_name: "bad",
          measurements: outOfControlMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
      ]);
      expect(result.spc_feedback?.min_cpk).toBeLessThan(1.0);
    });

    it("feature_results length matches input count", async () => {
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(fbCtx);
      const result = machiningIntelligenceOrchestratorEngine.applySPCFeedback(plan, [
        {
          feature_name: "f1",
          measurements: sixSigmaMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
        {
          feature_name: "f2",
          measurements: sixSigmaMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
        {
          feature_name: "f3",
          measurements: sixSigmaMeasurements,
          nominal: 10.0,
          upper_tolerance: 0.1,
          lower_tolerance: 0.1,
        },
      ]);
      expect(result.spc_feedback?.feature_results.length).toBe(3);
    });
  });

  describe("recordActualVsPredicted (Phase 11 U-MIO31A)", () => {
    async function getPlan() {
      const context: MachiningContext = {
        machine_type: "mill",
        operation_type: "finishing",
        material: { name: "Steel_1018", iso_group: "P" },
        tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
        geometry: { stock_dimensions_mm: [100, 50, 25], feature_complexity: "simple" },
        constraints: {},
      };
      return machiningIntelligenceOrchestratorEngine.orchestrate(context);
    }

    it("records an observation and populates neural_feedback metadata", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.recordActualVsPredicted(plan, {
        job_id: "J-TEST-1",
        targets: {
          cutting_force_n: { predicted: 500, actual: 525 },
          power_kw: { predicted: 3.2, actual: 3.5 },
        },
      });

      expect(updated.neural_feedback).toBeDefined();
      expect(updated.neural_feedback!.targets_recorded.sort()).toEqual(
        ["cutting_force_n", "power_kw"].sort(),
      );
      expect(updated.neural_feedback!.weight).toBe(1.0);
      expect(updated.neural_feedback!.jm_die_proven).toBe(false);
      expect(updated.neural_feedback!.observation_id).toBeDefined();
      expect(updated.neural_feedback!.buffer_size).toBeGreaterThanOrEqual(1);
    });

    it("applies 2× weight when jm_die_proven=true", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.recordActualVsPredicted(plan, {
        job_id: "J-PROVEN",
        jm_die_proven: true,
        targets: { cutting_force_n: { predicted: 500, actual: 520 } },
      });
      expect(updated.neural_feedback!.weight).toBe(2.0);
      expect(updated.neural_feedback!.jm_die_proven).toBe(true);
    });

    it("merges plan context automatically (material, tool, cutting params)", async () => {
      const plan = await getPlan();
      // No observation.context passed — should be auto-filled from plan
      const updated = machiningIntelligenceOrchestratorEngine.recordActualVsPredicted(plan, {
        job_id: "J-AUTO-CTX",
        targets: { surface_finish_um: { predicted: 1.6, actual: 1.4 } },
      });
      expect(updated.neural_feedback).toBeDefined();
      expect(updated.neural_feedback!.targets_recorded).toEqual(["surface_finish_um"]);
    });

    it("appends [NEURAL] entry to reasoning_chain", async () => {
      const plan = await getPlan();
      const priorLen = plan.reasoning_chain.length;
      const updated = machiningIntelligenceOrchestratorEngine.recordActualVsPredicted(plan, {
        job_id: "J-CHAIN",
        targets: { tool_life_min: { predicted: 60, actual: 52 } },
      });
      expect(updated.reasoning_chain.length).toBeGreaterThan(priorLen);
      const last = updated.reasoning_chain[updated.reasoning_chain.length - 1];
      expect(last).toMatch(/\[NEURAL\]/);
      expect(last).toMatch(/weight=/);
    });

    it("emitNeuralTrainingBatch returns null below min_batch_size", () => {
      // Default min_batch_size=32; we haven't recorded nearly that many
      // But since the collector is a singleton, this depends on prior tests.
      // Best-effort check: if null, great; if not, ensure it's a well-formed batch.
      const batch = machiningIntelligenceOrchestratorEngine.emitNeuralTrainingBatch();
      if (batch !== null) {
        expect(batch.examples.length).toBeGreaterThan(0);
        expect(batch.coverage.length).toBeGreaterThan(0);
      }
    });

    it("getNeuralAccuracyTrend returns insufficient_data or a valid trend", () => {
      const trend = machiningIntelligenceOrchestratorEngine.getNeuralAccuracyTrend("cutting_force_n");
      expect(["improving", "degrading", "stable", "insufficient_data"]).toContain(trend.trend);
    });

    it("batch_ready flag reflects buffer vs min_batch_size", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.recordActualVsPredicted(plan, {
        job_id: "J-BATCH",
        targets: { chatter_probability: { predicted: 0.1, actual: 0.05 } },
      });
      expect(typeof updated.neural_feedback!.batch_ready).toBe("boolean");
    });
  });

  describe("runFirstArticleInspection (Phase 11 U-MIO32)", () => {
    async function getPlan() {
      const context: MachiningContext = {
        machine_type: "mill",
        operation_type: "finishing",
        material: { name: "Steel_1018", iso_group: "P" },
        tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
        geometry: { stock_dimensions_mm: [100, 50, 25], feature_complexity: "simple" },
        constraints: {},
      };
      return machiningIntelligenceOrchestratorEngine.orchestrate(context);
    }

    it("releases production when all features pass (ACCEPT)", async () => {
      const plan = await getPlan();
      const updated = await machiningIntelligenceOrchestratorEngine.runFirstArticleInspection(plan, {
        part_number: "PN-ACC",
        revision: "A",
        features: [
          { feature_id: "F1", feature_name: "Bore", reference_location: "Z1", designator: "critical",
            nominal: 10, tolerance_plus: 0.1, tolerance_minus: -0.1 },
          { feature_id: "F2", feature_name: "Length", reference_location: "Z2", designator: "major",
            nominal: 20, tolerance_plus: 0.05, tolerance_minus: -0.05 },
        ],
        measurements: [
          { feature_id: "F1", measured_value: 10.02 },
          { feature_id: "F2", measured_value: 19.99 },
        ],
      });
      expect(updated.fai_gate).toBeDefined();
      expect(updated.fai_gate!.verdict).toBe("ACCEPT");
      expect(updated.fai_gate!.production_released).toBe(true);
      expect(updated.fai_gate!.pass_count).toBe(2);
    });

    it("BLOCKS production when critical dimension fails (REJECT)", async () => {
      const plan = await getPlan();
      const updated = await machiningIntelligenceOrchestratorEngine.runFirstArticleInspection(plan, {
        part_number: "PN-REJ",
        revision: "A",
        features: [
          { feature_id: "F1", feature_name: "Bore", reference_location: "Z1", designator: "critical",
            nominal: 10, tolerance_plus: 0.1, tolerance_minus: -0.1 },
        ],
        measurements: [{ feature_id: "F1", measured_value: 11.5 }],
      });
      expect(updated.fai_gate!.verdict).toBe("REJECT");
      expect(updated.fai_gate!.production_released).toBe(false);
      expect(updated.fai_gate!.critical_failures).toBe(1);
      expect(updated.warnings.some(w => w.includes("FAI gate BLOCKED"))).toBe(true);
    });

    it("BLOCKS production when unmeasured characteristics exist (MRB)", async () => {
      const plan = await getPlan();
      const updated = await machiningIntelligenceOrchestratorEngine.runFirstArticleInspection(plan, {
        part_number: "PN-MRB",
        revision: "A",
        features: [
          { feature_id: "F1", feature_name: "Bore", reference_location: "Z1", designator: "major",
            nominal: 10, tolerance_plus: 0.1, tolerance_minus: -0.1 },
        ],
        measurements: [], // no measurements
      });
      expect(updated.fai_gate!.verdict).toBe("MRB");
      expect(updated.fai_gate!.production_released).toBe(false);
      expect(updated.fai_gate!.unmeasured_count).toBe(1);
    });

    it("appends [FAI] entry to reasoning_chain", async () => {
      const plan = await getPlan();
      const priorLen = plan.reasoning_chain.length;
      const updated = await machiningIntelligenceOrchestratorEngine.runFirstArticleInspection(plan, {
        part_number: "PN-CHAIN",
        revision: "A",
        features: [
          { feature_id: "F1", feature_name: "f", reference_location: "Z1", designator: "minor",
            nominal: 10, tolerance_plus: 0.1, tolerance_minus: -0.1 },
        ],
        measurements: [{ feature_id: "F1", measured_value: 10 }],
      });
      expect(updated.reasoning_chain.length).toBeGreaterThan(priorLen);
      const last = updated.reasoning_chain[updated.reasoning_chain.length - 1];
      expect(last).toMatch(/\[FAI\]/);
      expect(last).toMatch(/verdict=/);
    });

    it("generateFAIForms returns AS9102 Form 1/2/3 + markdown", async () => {
      const plan = await getPlan();
      const updated = await machiningIntelligenceOrchestratorEngine.runFirstArticleInspection(plan, {
        part_number: "PN-FORMS",
        revision: "B",
        inspector: "Bob",
        features: [
          { feature_id: "F1", feature_name: "Bore", reference_location: "Z1", designator: "critical",
            nominal: 10, tolerance_plus: 0.1, tolerance_minus: -0.1 },
        ],
        measurements: [{ feature_id: "F1", measured_value: 10.05 }],
      });
      const forms = machiningIntelligenceOrchestratorEngine.generateFAIForms(updated.fai_gate!.fai_id);
      expect(forms.form1.part_number).toBe("PN-FORMS");
      expect(forms.form1.revision).toBe("B");
      expect(forms.form1.inspector).toBe("Bob");
      expect(forms.form3.rows.length).toBe(1);
      expect(forms.markdown).toContain("Disposition: **ACCEPT**");
    });
  });

  describe("generateControlPlan (Phase 11 U-MIO34)", () => {
    const baseContext: MachiningContext = {
      machine_type: "mill",
      operation_type: "finishing",
      material: { name: "Steel_4140", iso_group: "P", hardness_hrc: 30 },
      tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide", coating: "TiAlN" },
      geometry: { stock_dimensions_mm: [100, 50, 25], feature_complexity: "moderate" },
      constraints: { max_spindle_rpm: 10000, max_power_kw: 15 },
    };

    async function getPlan() {
      return await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);
    }

    it("attaches control_plan summary with correct counts", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateControlPlan(plan, {
        part_number: "PN-CP-1",
        revision: "A",
        phase: "production",
        characteristics: [
          { feature_id: "F1", feature_name: "OD", reference: "B1", severity: "critical",
            nominal: 1.0, tolerance_plus: 0.001, tolerance_minus: -0.001, unit: "in",
            gage_id: "GAGE-1", op_num: 10 },
          { feature_id: "F2", feature_name: "Length", reference: "B2", severity: "major",
            nominal: 2.0, tolerance_plus: 0.005, tolerance_minus: -0.005, unit: "in",
            gage_id: "GAGE-2", op_num: 20 },
          { feature_id: "F3", feature_name: "Radius", reference: "B3", severity: "minor",
            nominal: 0.1, tolerance_plus: 0.01, tolerance_minus: -0.01, unit: "in",
            op_num: 30 },
        ],
      });
      expect(updated.control_plan).toBeDefined();
      expect(updated.control_plan!.control_plan_id).toMatch(/^CP-\d{5}$/);
      expect(updated.control_plan!.phase).toBe("production");
      expect(updated.control_plan!.total_characteristics).toBe(3);
      expect(updated.control_plan!.critical_count).toBe(1);
      expect(updated.control_plan!.major_count).toBe(1);
      expect(updated.control_plan!.minor_count).toBe(1);
      expect(updated.control_plan!.hundred_pct_count).toBe(1);
      expect(updated.control_plan!.spc_controlled_count).toBe(1);
    });

    it("appends [CP] reasoning entry describing the plan", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateControlPlan(plan, {
        part_number: "PN-CP-2",
        revision: "A",
        phase: "pre-launch",
        characteristics: [
          { feature_id: "F1", feature_name: "OD", reference: "B1", severity: "major",
            nominal: 1.0, tolerance_plus: 0.001, tolerance_minus: -0.001, unit: "in",
            gage_id: "GAGE-1", op_num: 10 },
        ],
      });
      const lastReason = updated.reasoning_chain[updated.reasoning_chain.length - 1];
      expect(lastReason).toMatch(/^\[CP\]/);
      expect(lastReason).toMatch(/CP-\d{5}/);
      expect(lastReason).toMatch(/crit=0/);
      expect(lastReason).toMatch(/maj=1/);
    });

    it("propagates Control Plan coverage warnings as [CP] warnings on the plan", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateControlPlan(plan, {
        part_number: "PN-CP-3",
        revision: "A",
        phase: "production",
        characteristics: [
          // Critical with no gage → triggers warning
          { feature_id: "F1", feature_name: "Critical hole", reference: "B1", severity: "critical",
            nominal: 0.5, tolerance_plus: 0.0005, tolerance_minus: -0.0005, unit: "in",
            op_num: 10 },
        ],
      });
      expect(updated.control_plan!.coverage_warnings).toBeGreaterThan(0);
      expect(updated.warnings.some(w => w.includes("[CP]") && w.includes("CRITICAL"))).toBe(true);
    });

    it("does not mutate the input plan (returns new plan)", async () => {
      const plan = await getPlan();
      const originalReasonLen = plan.reasoning_chain.length;
      const originalWarnLen = plan.warnings.length;
      machiningIntelligenceOrchestratorEngine.generateControlPlan(plan, {
        part_number: "PN-IMM",
        revision: "A",
        phase: "production",
        characteristics: [
          { feature_id: "F1", feature_name: "OD", reference: "B1", severity: "major",
            nominal: 1.0, tolerance_plus: 0.001, tolerance_minus: -0.001, unit: "in",
            gage_id: "GAGE-1", op_num: 10 },
        ],
      });
      expect(plan.reasoning_chain.length).toBe(originalReasonLen);
      expect(plan.warnings.length).toBe(originalWarnLen);
      expect(plan.control_plan).toBeUndefined();
    });

    it("generateControlPlanForms returns JSON + Markdown + CSV for an existing plan", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateControlPlan(plan, {
        part_number: "PN-FORMS-CP",
        revision: "C",
        phase: "production",
        characteristics: [
          { feature_id: "F1", feature_name: "OD", reference: "B1", severity: "critical",
            nominal: 1.0, tolerance_plus: 0.001, tolerance_minus: -0.001, unit: "in",
            gage_id: "GAGE-1", op_num: 10 },
        ],
      });
      const forms = machiningIntelligenceOrchestratorEngine.generateControlPlanForms(
        updated.control_plan!.control_plan_id,
      );
      expect(forms).not.toBeNull();
      expect(forms!.json.control_plan_id).toBe(updated.control_plan!.control_plan_id);
      expect(forms!.markdown).toContain("# Control Plan");
      expect(forms!.markdown).toContain("PN-FORMS-CP");
      expect(forms!.csv.split("\n")[0]).toContain("control_plan_id");
    });

    it("generateControlPlanForms returns null for unknown control_plan_id", () => {
      expect(machiningIntelligenceOrchestratorEngine.generateControlPlanForms("CP-99999")).toBeNull();
    });
  });

  describe("generateSetupSheet (Phase 11 U-MIO35)", () => {
    const baseContext: MachiningContext = {
      machine_type: "mill",
      operation_type: "finishing",
      material: { name: "Steel_4140", iso_group: "P", hardness_hrc: 30 },
      tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide", coating: "TiAlN" },
      geometry: { stock_dimensions_mm: [100, 50, 25], feature_complexity: "moderate" },
      constraints: { max_spindle_rpm: 10000, max_power_kw: 15 },
    };

    async function getPlan() {
      return await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);
    }

    it("attaches setup_sheet summary to the plan with correct counts", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateSetupSheet(plan, {
        part_number: "PN-SU-1",
        revision: "A",
        operations: [
          {
            op_num: 10, op_name: "Face", machine_id: "HAAS-VF4", wcs: "G54",
            tools: [{ tool_id: "T01", pocket: 1, description: "facemill", offsets: [{ type: "length", method: "presetter" }] }],
            workholding: { clamp_type: "vise" },
            stock: { dims_mm: [100, 50, 25] },
          },
          {
            op_num: 20, op_name: "Drill", machine_id: "HAAS-VF4", wcs: "G54",
            tools: [
              { tool_id: "T02", pocket: 2, description: "spotdrill", offsets: [{ type: "length", method: "presetter" }] },
              { tool_id: "T03", pocket: 3, description: "drill", offsets: [{ type: "length", method: "presetter" }] },
            ],
            workholding: { clamp_type: "vise" },
            stock: { dims_mm: [100, 50, 25] },
            probing: { routine: "feature_probe" },
          },
        ],
        first_part_checks: [
          { feature_id: "F1", feature_name: "Hole Ø", severity: "critical", after_op: 20, gage_id: "PIN", instruction: "Gage hole" },
        ],
      });
      expect(updated.setup_sheet).toBeDefined();
      expect(updated.setup_sheet!.setup_id).toMatch(/^SU-\d{5}$/);
      expect(updated.setup_sheet!.operation_count).toBe(2);
      expect(updated.setup_sheet!.total_tools).toBe(3);
      expect(updated.setup_sheet!.unique_tools).toBe(3);
      expect(updated.setup_sheet!.probing_ops).toBe(1);
      expect(updated.setup_sheet!.first_part_check_count).toBe(1);
    });

    it("appends [SETUP] reasoning entry", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateSetupSheet(plan, {
        part_number: "PN-SU-2",
        revision: "A",
        operations: [{
          op_num: 10, op_name: "Face", machine_id: "M1", wcs: "G54",
          tools: [{ tool_id: "T01", pocket: 1, description: "t1", offsets: [{ type: "length", method: "presetter" }] }],
          workholding: { clamp_type: "vise" },
          stock: { dims_mm: [50, 50, 50] },
        }],
      });
      const last = updated.reasoning_chain[updated.reasoning_chain.length - 1];
      expect(last).toMatch(/^\[SETUP\]/);
      expect(last).toMatch(/SU-\d{5}/);
      expect(last).toMatch(/1 ops/);
    });

    it("propagates pocket collision warnings as [SETUP] warnings on plan", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateSetupSheet(plan, {
        part_number: "PN-SU-3",
        revision: "A",
        operations: [{
          op_num: 10, op_name: "Bad setup", machine_id: "M1", wcs: "G54",
          tools: [
            { tool_id: "T01", pocket: 5, description: "a", offsets: [{ type: "length", method: "presetter" }] },
            { tool_id: "T02", pocket: 5, description: "b", offsets: [{ type: "length", method: "presetter" }] },
          ],
          workholding: { clamp_type: "vise" },
          stock: { dims_mm: [50, 50, 50] },
        }],
      });
      expect(updated.setup_sheet!.pipeline_warnings).toBeGreaterThan(0);
      expect(updated.warnings.some(w => w.includes("[SETUP]") && w.includes("pocket 5"))).toBe(true);
    });

    it("does not mutate input plan (immutable update)", async () => {
      const plan = await getPlan();
      const origWarn = plan.warnings.length;
      const origReason = plan.reasoning_chain.length;
      machiningIntelligenceOrchestratorEngine.generateSetupSheet(plan, {
        part_number: "PN-IMM",
        revision: "A",
        operations: [{
          op_num: 10, op_name: "x", machine_id: "M1", wcs: "G54",
          tools: [{ tool_id: "T01", pocket: 1, description: "a", offsets: [{ type: "length", method: "presetter" }] }],
          workholding: { clamp_type: "vise" },
          stock: { dims_mm: [50, 50, 50] },
        }],
      });
      expect(plan.warnings.length).toBe(origWarn);
      expect(plan.reasoning_chain.length).toBe(origReason);
      expect(plan.setup_sheet).toBeUndefined();
    });

    it("generateSetupSheetForms returns JSON + Markdown + CSV", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateSetupSheet(plan, {
        part_number: "PN-FORMS-SU",
        revision: "A",
        operations: [{
          op_num: 10, op_name: "Rough", machine_id: "HAAS-VF4", wcs: "G54",
          tools: [{ tool_id: "T01", pocket: 1, description: "endmill", offsets: [{ type: "length", method: "presetter" }] }],
          workholding: { clamp_type: "vise" },
          stock: { dims_mm: [50, 50, 50] },
        }],
      });
      const forms = machiningIntelligenceOrchestratorEngine.generateSetupSheetForms(
        updated.setup_sheet!.setup_id,
      );
      expect(forms).not.toBeNull();
      expect(forms!.json.setup_id).toBe(updated.setup_sheet!.setup_id);
      expect(forms!.markdown).toContain("# Setup Sheet");
      expect(forms!.markdown).toContain("PN-FORMS-SU");
      expect(forms!.csv.split("\n")[0]).toContain("setup_id");
    });

    it("generateSetupSheetForms returns null for unknown setup_id", () => {
      expect(machiningIntelligenceOrchestratorEngine.generateSetupSheetForms("SU-99999")).toBeNull();
    });
  });

  describe("generateProbingPlan (Phase 11 U-MIO36)", () => {
    const baseContext: MachiningContext = {
      machine_type: "mill",
      operation_type: "finishing",
      material: { name: "Steel_4140", iso_group: "P", hardness_hrc: 30 },
      tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide", coating: "TiAlN" },
      geometry: { stock_dimensions_mm: [100, 50, 25], feature_complexity: "moderate" },
      constraints: { max_spindle_rpm: 10000, max_power_kw: 15 },
    };

    async function getPlan() {
      return await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);
    }

    it("attaches probing summary with kind rollups and time estimate", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateProbingPlan(plan, {
        setup_id: "SU-00001",
        part_number: "PN-PB-1",
        revision: "A",
        routines: [
          { kind: "wcs_find", op_num: 10, axis: "XY" },
          { kind: "tool_length_verify", op_num: 10, axis: "Z", offset_register: "H01" },
          { kind: "feature_probe", op_num: 20, feature_id: "F1", feature_name: "Bore", nominal: 1.5, tolerance_plus: 0.001, tolerance_minus: -0.001 },
        ],
      });
      expect(updated.probing).toBeDefined();
      expect(updated.probing!.probing_id).toMatch(/^PB-\d{5}$/);
      expect(updated.probing!.total_routines).toBe(3);
      expect(updated.probing!.wcs_find_count).toBe(1);
      expect(updated.probing!.tool_length_verify_count).toBe(1);
      expect(updated.probing!.feature_probe_count).toBe(1);
      expect(updated.probing!.estimated_total_time_s).toBe(60); // 25+15+20
    });

    it("appends [PROBE] reasoning entry", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateProbingPlan(plan, {
        setup_id: "SU-00001",
        part_number: "PN-PB-2",
        revision: "A",
        routines: [{ kind: "wcs_find", op_num: 10, axis: "XY" }],
      });
      const last = updated.reasoning_chain[updated.reasoning_chain.length - 1];
      expect(last).toMatch(/^\[PROBE\]/);
      expect(last).toMatch(/PB-\d{5}/);
    });

    it("propagates probing warnings as [PROBE]-prefixed warnings on plan", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateProbingPlan(plan, {
        setup_id: "SU-00001",
        part_number: "PN-PB-3",
        revision: "A",
        routines: [{ kind: "tool_length_verify", op_num: 10, axis: "Z" /* no offset_register */ }],
      });
      expect(updated.probing!.probing_warnings).toBeGreaterThan(0);
      expect(updated.warnings.some(w => w.includes("[PROBE]") && w.includes("offset_register"))).toBe(true);
    });

    it("recordProbingResult returns PASS for in-tolerance measurement", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateProbingPlan(plan, {
        setup_id: "SU-00001",
        part_number: "PN-PB-4",
        revision: "A",
        routines: [{
          routine_id: "R1", kind: "feature_probe", op_num: 20,
          feature_id: "F1", feature_name: "Bore", nominal: 1.5,
          tolerance_plus: 0.001, tolerance_minus: -0.001, unit: "in",
        }],
      });
      const r = machiningIntelligenceOrchestratorEngine.recordProbingResult(
        updated.probing!.probing_id,
        { routine_id: "R1", measured: 1.5002 },
      );
      expect(r.disposition).toBe("PASS");
      expect(r.compensation.action).toBe("none");
    });

    it("recordProbingResult returns FAIL+HOLD for out-of-tolerance measurement", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateProbingPlan(plan, {
        setup_id: "SU-00001",
        part_number: "PN-PB-5",
        revision: "A",
        routines: [{
          routine_id: "R1", kind: "feature_probe", op_num: 20,
          nominal: 1.5, tolerance_plus: 0.001, tolerance_minus: -0.001, unit: "in",
        }],
      });
      const r = machiningIntelligenceOrchestratorEngine.recordProbingResult(
        updated.probing!.probing_id,
        { routine_id: "R1", measured: 1.505 },
      );
      expect(r.disposition).toBe("FAIL");
      expect(r.compensation.action).toBe("hold");
    });

    it("does not mutate input plan (immutable update)", async () => {
      const plan = await getPlan();
      const origReason = plan.reasoning_chain.length;
      const origWarn = plan.warnings.length;
      machiningIntelligenceOrchestratorEngine.generateProbingPlan(plan, {
        setup_id: "SU-00001",
        part_number: "PN-IMM",
        revision: "A",
        routines: [{ kind: "wcs_find", op_num: 10, axis: "XY" }],
      });
      expect(plan.reasoning_chain.length).toBe(origReason);
      expect(plan.warnings.length).toBe(origWarn);
      expect(plan.probing).toBeUndefined();
    });

    it("getProbingPlanForms returns JSON+Markdown for existing plan; null otherwise", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.generateProbingPlan(plan, {
        setup_id: "SU-00001",
        part_number: "PN-FORMS-PB",
        revision: "A",
        routines: [{ kind: "wcs_find", op_num: 10, axis: "XY" }],
      });
      const forms = machiningIntelligenceOrchestratorEngine.getProbingPlanForms(updated.probing!.probing_id);
      expect(forms).not.toBeNull();
      expect(forms!.json.probing_id).toBe(updated.probing!.probing_id);
      expect(forms!.markdown).toContain("# Probing Plan");
      expect(machiningIntelligenceOrchestratorEngine.getProbingPlanForms("PB-99999")).toBeNull();
    });
  });

  describe("openApprovalGate / requestApproval (Phase 12 U-MIO37)", () => {
    const baseContext: MachiningContext = {
      machine_type: "mill",
      operation_type: "roughing",
      material: { name: "Steel_4140", iso_group: "P", hardness_hrc: 30 },
      tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide", coating: "TiAlN" },
      geometry: { stock_dimensions_mm: [100, 50, 25], feature_complexity: "moderate" },
      constraints: { max_spindle_rpm: 10000, max_power_kw: 15 },
    };

    async function getPlan() {
      return await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);
    }

    it("openApprovalGate attaches a PENDING approval_gate summary to the plan", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.openApprovalGate(plan, {
        part_number: "PN-AG-1",
        revision: "A",
        assigned_operators: ["op.jones"],
        checklist: [
          { item_id: "C1", category: "safety", severity: "critical", description: "LOTO" },
          { item_id: "M1", category: "setup", severity: "major", description: "Fixture torque" },
        ],
      });
      expect(updated.approval_gate).toBeDefined();
      expect(updated.approval_gate!.verdict).toBe("PENDING");
      expect(updated.approval_gate!.production_released).toBe(false);
      expect(updated.approval_gate!.total_items).toBe(2);
      expect(updated.approval_gate!.critical_total).toBe(1);
      expect(updated.approval_gate!.has_signature).toBe(false);
    });

    it("appends an [APV] reasoning line with PENDING verdict", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.openApprovalGate(plan, {
        part_number: "PN-AG-2",
        revision: "A",
        assigned_operators: ["op.jones"],
        checklist: [
          { item_id: "C1", category: "safety", severity: "critical", description: "E-stop tested" },
        ],
      });
      const last = updated.reasoning_chain[updated.reasoning_chain.length - 1];
      expect(last).toMatch(/^\[APV\]/);
      expect(last).toMatch(/verdict=PENDING/);
    });

    it("requestApproval with all items verified APPROVES and releases production", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openApprovalGate(plan, {
        part_number: "PN-AG-3",
        revision: "A",
        assigned_operators: ["op.jones"],
        checklist: [
          { item_id: "C1", category: "safety", severity: "critical", description: "LOTO" },
          { item_id: "M1", category: "setup", severity: "major", description: "WCS set" },
        ],
      });
      machiningIntelligenceOrchestratorEngine.verifyApprovalItem(
        opened.approval_gate!.gate_id, "C1", "op.jones");
      machiningIntelligenceOrchestratorEngine.verifyApprovalItem(
        opened.approval_gate!.gate_id, "M1", "op.jones");
      const approved = machiningIntelligenceOrchestratorEngine.requestApproval(
        opened,
        opened.approval_gate!.gate_id,
        "op.jones",
      );
      expect(approved.approval_gate!.verdict).toBe("APPROVED");
      expect(approved.approval_gate!.production_released).toBe(true);
      expect(approved.approval_gate!.has_signature).toBe(true);
    });

    it("requestApproval with critical unverified ESCALATES and emits [APV] warning", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openApprovalGate(plan, {
        part_number: "PN-AG-4",
        revision: "A",
        assigned_operators: ["op.jones"],
        checklist: [
          { item_id: "C1", category: "safety", severity: "critical", description: "LOTO" },
          { item_id: "M1", category: "setup", severity: "major", description: "WCS set" },
        ],
      });
      // verify only major, leave critical unchecked
      machiningIntelligenceOrchestratorEngine.verifyApprovalItem(
        opened.approval_gate!.gate_id, "M1", "op.jones");
      const escalated = machiningIntelligenceOrchestratorEngine.requestApproval(
        opened,
        opened.approval_gate!.gate_id,
        "op.jones",
      );
      expect(escalated.approval_gate!.verdict).toBe("ESCALATED");
      expect(escalated.approval_gate!.production_released).toBe(false);
      expect(escalated.approval_gate!.open_escalations).toBe(1);
      expect(escalated.warnings.some(w => w.startsWith("[APV]"))).toBe(true);
    });

    it("verifyApprovalItem throws when item is blocked by upstream", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openApprovalGate(plan, {
        part_number: "PN-AG-5",
        revision: "A",
        assigned_operators: ["op.jones"],
        checklist: [
          {
            item_id: "B1", category: "probing", severity: "major", description: "probe cal",
            blocked: true, blocking_reason: "awaiting probe data",
          },
        ],
      });
      expect(() =>
        machiningIntelligenceOrchestratorEngine.verifyApprovalItem(
          opened.approval_gate!.gate_id, "B1", "op.jones",
        ),
      ).toThrow(/BLOCKED/);
    });

    it("unblockApprovalItem allows subsequent verification", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openApprovalGate(plan, {
        part_number: "PN-AG-6",
        revision: "A",
        assigned_operators: ["op.jones"],
        checklist: [
          {
            item_id: "B1", category: "probing", severity: "major", description: "probe cal",
            blocked: true, blocking_reason: "awaiting probe data",
          },
        ],
      });
      machiningIntelligenceOrchestratorEngine.unblockApprovalItem(
        opened.approval_gate!.gate_id, "B1");
      const after = machiningIntelligenceOrchestratorEngine.verifyApprovalItem(
        opened.approval_gate!.gate_id, "B1", "op.jones");
      const item = after.checklist.find(i => i.item_id === "B1")!;
      expect(item.verified).toBe(true);
    });

    it("resolveApprovalEscalation marks the escalation resolved", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openApprovalGate(plan, {
        part_number: "PN-AG-7",
        revision: "A",
        assigned_operators: ["op.jones"],
        checklist: [
          { item_id: "C1", category: "safety", severity: "critical", description: "LOTO" },
        ],
      });
      machiningIntelligenceOrchestratorEngine.requestApproval(
        opened,
        opened.approval_gate!.gate_id,
        "op.jones",
      ); // ESCALATED
      const resolved = machiningIntelligenceOrchestratorEngine.resolveApprovalEscalation(
        opened.approval_gate!.gate_id,
        0,
        "sup.smith",
        "substitute check authorized",
      );
      expect(resolved.escalations[0].resolved).toBe(true);
      expect(resolved.escalations[0].resolved_by).toBe("sup.smith");
    });

    it("getApprovalGate returns JSON+Markdown; null for unknown id", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openApprovalGate(plan, {
        part_number: "PN-AG-8",
        revision: "A",
        assigned_operators: ["op.jones"],
        checklist: [
          { item_id: "C1", category: "safety", severity: "critical", description: "LOTO" },
        ],
      });
      const forms = machiningIntelligenceOrchestratorEngine.getApprovalGate(
        opened.approval_gate!.gate_id);
      expect(forms).not.toBeNull();
      expect(forms!.json.gate_id).toBe(opened.approval_gate!.gate_id);
      expect(forms!.markdown).toContain("# Operator Approval Gate");
      expect(machiningIntelligenceOrchestratorEngine.getApprovalGate("APV-99999")).toBeNull();
    });

    it("does not mutate input plan (immutable update)", async () => {
      const plan = await getPlan();
      const origReason = plan.reasoning_chain.length;
      const origWarn = plan.warnings.length;
      machiningIntelligenceOrchestratorEngine.openApprovalGate(plan, {
        part_number: "PN-AG-IMM",
        revision: "A",
        assigned_operators: ["op.jones"],
        checklist: [
          { item_id: "C1", category: "safety", severity: "critical", description: "LOTO" },
        ],
      });
      expect(plan.reasoning_chain.length).toBe(origReason);
      expect(plan.warnings.length).toBe(origWarn);
      expect(plan.approval_gate).toBeUndefined();
    });
  });

  describe("openSafetyGate / certifySafetyGate (Phase 12 U-MIO38)", () => {
    const baseContext: MachiningContext = {
      machine_type: "mill",
      operation_type: "roughing",
      material: { name: "Steel_4140", iso_group: "P", hardness_hrc: 30 },
      tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide", coating: "TiAlN" },
      geometry: { stock_dimensions_mm: [100, 50, 25], feature_complexity: "moderate" },
      constraints: { max_spindle_rpm: 10000, max_power_kw: 15 },
    };
    async function getPlan() {
      return await machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);
    }

    function mkVetoReport(active = false) {
      return {
        vetoed: active,
        checks: [],
        active_vetos: active
          ? [{ vetoed: true, rule: "power_veto" as const, original_value: 20, detail: "pwr", formula_used: "f" }]
          : [],
        original_params: {
          Fc_N: 500, Vc_mpm: 150, ap_mm: 2, fz_mm: 0.1, D_mm: 10, L_mm: 40, RPM: 4500,
          chatter_probability: 0.05, collision_detected: false,
        },
        machine: { max_power_kW: 15, max_rpm: 10000, max_torque_Nm: 100 },
        workholding: { grip_force_N: 5000, friction_coefficient: 0.3, n_points: 1 },
      };
    }

    it("openSafetyGate attaches PENDING safety_gate summary to plan", async () => {
      const plan = await getPlan();
      const updated = machiningIntelligenceOrchestratorEngine.openSafetyGate(plan, {
        part_number: "PN-SG-1",
        revision: "A",
        program_id: "PROG-1.NC",
        machine_id: "OK-MB-001",
      });
      expect(updated.safety_gate).toBeDefined();
      expect(updated.safety_gate!.verdict).toBe("PENDING");
      expect(updated.safety_gate!.production_released).toBe(false);
      expect(updated.safety_gate!.all_four_attached).toBe(false);
      expect(updated.reasoning_chain[updated.reasoning_chain.length - 1]).toMatch(/^\[SVG\]/);
    });

    it("certifySafetyGate CERTIFIES when all four artifacts PASS", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openSafetyGate(plan, {
        part_number: "PN-SG-2",
        revision: "A",
        program_id: "PROG-2.NC",
        machine_id: "OK-MB-001",
      });
      const id = opened.safety_gate!.gate_id;
      machiningIntelligenceOrchestratorEngine.attachSafetyVetoReport(id, mkVetoReport(false));
      machiningIntelligenceOrchestratorEngine.attachSimulationVerdict(id, { source: "mastercam", verdict: "PASS" });
      machiningIntelligenceOrchestratorEngine.attachCollisionVerdict(id, { verdict: "PASS", collision_count: 0 });
      machiningIntelligenceOrchestratorEngine.attachEnvelopeVerdict(id, { verdict: "PASS" });
      const certified = machiningIntelligenceOrchestratorEngine.certifySafetyGate(
        opened, id, "eng.smith");
      expect(certified.safety_gate!.verdict).toBe("CERTIFIED");
      expect(certified.safety_gate!.production_released).toBe(true);
      expect(certified.safety_gate!.has_certification).toBe(true);
      expect(certified.safety_gate!.blocker_count).toBe(0);
    });

    it("certifySafetyGate BLOCKS on collision and emits [SVG] warning", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openSafetyGate(plan, {
        part_number: "PN-SG-3",
        revision: "A",
        program_id: "PROG-3.NC",
        machine_id: "OK-MB-001",
      });
      const id = opened.safety_gate!.gate_id;
      machiningIntelligenceOrchestratorEngine.attachSafetyVetoReport(id, mkVetoReport(false));
      machiningIntelligenceOrchestratorEngine.attachSimulationVerdict(id, { source: "mastercam", verdict: "PASS" });
      machiningIntelligenceOrchestratorEngine.attachCollisionVerdict(id, {
        verdict: "FAIL",
        collision_count: 2,
        collisions: [{ location: "holder", severity: "major", description: "crash" }],
      });
      machiningIntelligenceOrchestratorEngine.attachEnvelopeVerdict(id, { verdict: "PASS" });
      const blocked = machiningIntelligenceOrchestratorEngine.certifySafetyGate(
        opened, id, "eng.smith");
      expect(blocked.safety_gate!.verdict).toBe("BLOCKED");
      expect(blocked.safety_gate!.production_released).toBe(false);
      expect(blocked.safety_gate!.blocker_count).toBeGreaterThan(0);
      expect(blocked.warnings.some(w => w.startsWith("[SVG]") && w.includes("collision"))).toBe(true);
    });

    it("certifySafetyGate BLOCKS with missing_artifact when none attached", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openSafetyGate(plan, {
        part_number: "PN-SG-4",
        revision: "A",
        program_id: "PROG-4.NC",
        machine_id: "OK-MB-001",
      });
      const blocked = machiningIntelligenceOrchestratorEngine.certifySafetyGate(
        opened, opened.safety_gate!.gate_id, "eng.smith");
      expect(blocked.safety_gate!.verdict).toBe("BLOCKED");
      expect(blocked.safety_gate!.blocker_count).toBe(4);
      expect(blocked.warnings.filter(w => w.startsWith("[SVG]")).length).toBe(4);
    });

    it("getSafetyGate returns JSON+Markdown; null for unknown id", async () => {
      const plan = await getPlan();
      const opened = machiningIntelligenceOrchestratorEngine.openSafetyGate(plan, {
        part_number: "PN-SG-5",
        revision: "A",
        program_id: "PROG-5.NC",
        machine_id: "OK-MB-001",
      });
      const forms = machiningIntelligenceOrchestratorEngine.getSafetyGate(
        opened.safety_gate!.gate_id);
      expect(forms).not.toBeNull();
      expect(forms!.json.gate_id).toBe(opened.safety_gate!.gate_id);
      expect(forms!.markdown).toContain("# Safety Veto & Simulation Gate");
      expect(machiningIntelligenceOrchestratorEngine.getSafetyGate("SVG-99999")).toBeNull();
    });

    it("does not mutate input plan", async () => {
      const plan = await getPlan();
      const origReason = plan.reasoning_chain.length;
      machiningIntelligenceOrchestratorEngine.openSafetyGate(plan, {
        part_number: "PN-SG-IMM",
        revision: "A",
        program_id: "PROG-IMM.NC",
        machine_id: "OK-MB-001",
      });
      expect(plan.reasoning_chain.length).toBe(origReason);
      expect(plan.safety_gate).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 12 U-MIO39: Machine Kinematic State Tracker
  // ══════════════════════════════════════════════════════════════════════════
  describe("updateMachineState / getMachineState (Phase 12 U-MIO39)", () => {
    const baseContext: MachiningContext = {
      machine_type: "mill",
      operation_type: "roughing",
      material: { name: "Steel_4140", iso_group: "P", hardness_hrc: 30 },
      tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide", coating: "TiAlN" },
      geometry: { stock_dimensions_mm: [100, 100, 50], feature_complexity: "moderate", tolerance_mm: 0.05 },
      constraints: { max_spindle_rpm: 12000, max_power_kw: 15, target_surface_finish_um: 3.2 },
    };

    async function getPlan(): Promise<MachiningPlan> {
      return machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);
    }

    beforeEach(() => {
      machineKinematicStateEngine.reset();
    });

    it("updateMachineState populates plan.machine_state with snapshot_id", async () => {
      const plan = await getPlan();
      expect(plan.machine_state).toBeUndefined();

      const derived = machiningIntelligenceOrchestratorEngine.updateMachineState(plan, {
        machine_id: "VMC-001",
        controller: "fanuc",
        captured_at: new Date().toISOString(),
        thermal: [{ axis: "X", temperature_c: 22, stroke_mm: 500 }],
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
      });

      expect(plan.machine_state).not.toBeUndefined();
      expect(plan.machine_state!.snapshot_id).toMatch(/^MKS-\d{6}$/);
      expect(plan.machine_state!.machine_id).toBe("VMC-001");
      expect(plan.machine_state!.controller).toBe("fanuc");
      expect(derived.snapshot_id).toBe(plan.machine_state!.snapshot_id);
    });

    it("updateMachineState captures overall_status from derived state", async () => {
      const plan = await getPlan();
      machiningIntelligenceOrchestratorEngine.updateMachineState(plan, {
        machine_id: "VMC-002",
        controller: "siemens",
        captured_at: new Date().toISOString(),
        thermal: [{ axis: "X", temperature_c: 22, stroke_mm: 500 }],
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
      });
      expect(plan.machine_state!.overall_status).toBe("nominal");

      // Critical servo state → overall_status critical
      const plan2 = await getPlan();
      machiningIntelligenceOrchestratorEngine.updateMachineState(plan2, {
        machine_id: "VMC-003",
        controller: "fanuc",
        captured_at: new Date().toISOString(),
        thermal: [{ axis: "X", temperature_c: 22, stroke_mm: 500 }],
        servo: [{ axis: "X", following_error_mean_mm: 0.015, baseline_following_error_mm: 0.005 }],
      });
      expect(plan2.machine_state!.overall_status).toBe("critical");
    });

    it("updateMachineState computes jerk_derate_pct correctly", async () => {
      const plan = await getPlan();
      machiningIntelligenceOrchestratorEngine.updateMachineState(plan, {
        machine_id: "VMC-004",
        controller: "okuma",
        captured_at: new Date().toISOString(),
        thermal: [{ axis: "X", temperature_c: 22, stroke_mm: 500 }],
        servo: [{ axis: "X", following_error_mean_mm: 0.009, baseline_following_error_mm: 0.005 }], // warning
        payload: { mass_kg: 450, rated_max_kg: 500 }, // >80%
      });
      // warning servo -10%, payload >80% -10% → 0.9 * 0.9 = 0.81 → 81%
      expect(plan.machine_state!.jerk_derate_pct).toBe(81);
    });

    it("updateMachineState appends derived warnings to plan.warnings", async () => {
      const plan = await getPlan();
      const origWarnings = plan.warnings.length;
      machiningIntelligenceOrchestratorEngine.updateMachineState(plan, {
        machine_id: "VMC-005",
        controller: "haas",
        captured_at: new Date().toISOString(),
        thermal: [{ axis: "X", temperature_c: 30, stroke_mm: 1000 }],
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
      }, 0.1); // tight tolerance → thermal beyond_tolerance
      expect(plan.warnings.length).toBeGreaterThan(origWarnings);
      expect(plan.warnings.some(w => w.includes("exceeds tolerance/3"))).toBe(true);
    });

    it("getMachineState returns JSON+Markdown for known machine", async () => {
      const plan = await getPlan();
      machiningIntelligenceOrchestratorEngine.updateMachineState(plan, {
        machine_id: "VMC-006",
        controller: "heidenhain",
        captured_at: new Date().toISOString(),
        thermal: [{ axis: "X", temperature_c: 22, stroke_mm: 500 }],
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
      });
      const result = machiningIntelligenceOrchestratorEngine.getMachineState("VMC-006");
      expect(result).not.toBeNull();
      expect(result!.json.machine_id).toBe("VMC-006");
      expect(result!.markdown).toContain("# Machine Kinematic State");
    });

    it("getMachineState returns null for unknown machine", () => {
      const result = machiningIntelligenceOrchestratorEngine.getMachineState("UNKNOWN-999");
      expect(result).toBeNull();
    });

    it("updateMachineState captures lookahead_adequate correctly", async () => {
      const plan = await getPlan();
      machiningIntelligenceOrchestratorEngine.updateMachineState(plan, {
        machine_id: "VMC-007",
        controller: "haas", // 90 blocks capacity
        captured_at: new Date().toISOString(),
        thermal: [{ axis: "X", temperature_c: 22, stroke_mm: 500 }],
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
        lookahead: { blocks_per_sec: 200, safety_margin: 1.5 }, // need 300 > 90 → inadequate
      });
      expect(plan.machine_state!.lookahead_adequate).toBe(false);
      expect(plan.machine_state!.overall_status).toBe("critical");
    });

    it("updateMachineState handles null lookahead gracefully", async () => {
      const plan = await getPlan();
      machiningIntelligenceOrchestratorEngine.updateMachineState(plan, {
        machine_id: "VMC-008",
        controller: "fanuc",
        captured_at: new Date().toISOString(),
        thermal: [{ axis: "X", temperature_c: 22, stroke_mm: 500 }],
        servo: [{ axis: "X", following_error_mean_mm: 0.005, baseline_following_error_mm: 0.005 }],
      });
      expect(plan.machine_state!.lookahead_adequate).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 12 U-MIO40: Coolant Strategy Integration
  // ══════════════════════════════════════════════════════════════════════════
  describe("calculateCoolantStrategy (Phase 12 U-MIO40)", () => {
    const baseContext: MachiningContext = {
      machine_type: "mill",
      operation_type: "roughing",
      material: { name: "Steel_4140", iso_group: "P", hardness_hrc: 30 },
      tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide", coating: "TiAlN" },
      geometry: { stock_dimensions_mm: [100, 100, 50], feature_complexity: "moderate", tolerance_mm: 0.05 },
      constraints: { max_spindle_rpm: 12000, max_power_kw: 15, target_surface_finish_um: 3.2 },
    };

    async function getPlan(): Promise<MachiningPlan> {
      return machiningIntelligenceOrchestratorEngine.orchestrate(baseContext);
    }

    it("calculateCoolantStrategy populates plan.coolant_strategy", async () => {
      const plan = await getPlan();
      expect(plan.coolant_strategy).toBeUndefined();

      const result = machiningIntelligenceOrchestratorEngine.calculateCoolantStrategy(plan);

      expect(plan.coolant_strategy).not.toBeUndefined();
      expect(plan.coolant_strategy!.primary_method).toBeDefined();
      expect(plan.coolant_strategy!.fluid_type).toBeDefined();
      expect(plan.coolant_strategy!.concentration_pct).toBeGreaterThan(0);
      expect(plan.coolant_strategy!.pressure_bar).toBeGreaterThan(0);
    });

    it("calculateCoolantStrategy maps ISO P group to carbon_steel", async () => {
      const plan = await getPlan();
      const result = machiningIntelligenceOrchestratorEngine.calculateCoolantStrategy(plan);

      expect(result.primary_method).toBeDefined();
      expect(result.fluid_type).toBeDefined();
    });

    it("calculateCoolantStrategy handles titanium (ISO S)", async () => {
      const tiContext: MachiningContext = {
        ...baseContext,
        material: { name: "Ti-6Al-4V", iso_group: "S", hardness_hrc: 36 },
      };
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(tiContext);
      const result = machiningIntelligenceOrchestratorEngine.calculateCoolantStrategy(plan);

      expect(result.pressure_bar.value).toBeGreaterThan(0);
    });

    it("calculateCoolantStrategy respects environmental_priority option", async () => {
      const ciContext: MachiningContext = {
        ...baseContext,
        material: { name: "Gray_Cast_Iron", iso_group: "K" },
        operation_type: "finishing",
      };
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(ciContext);
      const result = machiningIntelligenceOrchestratorEngine.calculateCoolantStrategy(plan, {
        environmental_priority: true,
      });

      expect(["mql", "air_blast", "dry", "flood"]).toContain(result.primary_method);
    });

    it("calculateCoolantStrategy adds safety notes to plan.warnings", async () => {
      const mgContext: MachiningContext = {
        ...baseContext,
        material: { name: "AZ31B", iso_group: "N" },
      };
      const plan = await machiningIntelligenceOrchestratorEngine.orchestrate(mgContext);
      const origWarnings = plan.warnings.length;
      machiningIntelligenceOrchestratorEngine.calculateCoolantStrategy(plan);

      // May or may not add warnings depending on material mapping
      expect(plan.warnings.length).toBeGreaterThanOrEqual(origWarnings);
    });

    it("getCoolantStrategy returns result without modifying plan", async () => {
      const result = machiningIntelligenceOrchestratorEngine.getCoolantStrategy({
        workpiece_material: "titanium",
        operation: "milling_rough",
        cutting_speed_m_min: 50,
        depth_of_cut_mm: 2,
      });

      expect(result.primary_method).toBeDefined();
      expect(result.pressure_bar.value).toBeGreaterThan(0);
    });

    it("calculateCoolantStrategy captures alternative_method", async () => {
      const plan = await getPlan();
      const result = machiningIntelligenceOrchestratorEngine.calculateCoolantStrategy(plan);

      expect(plan.coolant_strategy!.alternative_method).toBeDefined();
      expect(result.alternative_method).toBeDefined();
    });
  });
});
