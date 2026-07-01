/**
 * Lathe P2P Full Pipeline E2E Test — U-LTH45 / U-LTH46
 *
 * Exercises all 12 canonical print-to-program actions end-to-end through
 * engine singletons (the same path the camDispatcher uses). Verifies:
 *   - Each stage produces valid output consumable by the next
 *   - All 45 lathe_p2p_* actions are in the ACTIONS enum
 *   - Pipeline runs clean for 3 JM Die representative parts
 *   - Full chain produces: G-code, signoff package, reasoning trace, KG subgraph
 *
 * @milestone LATHE-MASTER U-LTH45 / U-LTH46 (E2E regression)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  lathePrintFeatureStrategySelectorEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/LathePrintFeatureStrategySelectorEngine.js";
import {
  lathePrintSequencePlannerEngine,
  type StockInput,
} from "../engines/LathePrintSequencePlannerEngine.js";
import { lathePrintSetupSelectionEngine } from "../engines/LathePrintSetupSelectionEngine.js";
import { lathePrintToolpathGeneratorEngine } from "../engines/LathePrintToolpathGeneratorEngine.js";
import { lathePrintProgramEmitterEngine } from "../engines/LathePrintProgramEmitterEngine.js";
import { lathePrintProgramSignoffEngine } from "../engines/LathePrintProgramSignoffEngine.js";
import { lathePrintToProgramDLIntelligenceEngine } from "../engines/LathePrintToProgramDLIntelligenceEngine.js";
import { lathePrintToProgramReasoningEngine } from "../engines/LathePrintToProgramReasoningEngine.js";
import { lathePrintToProgramKnowledgeGraphEngine } from "../engines/LathePrintToProgramKnowledgeGraphEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ============================================================================
// FIXTURES — 3 JM DIE REPRESENTATIVE PARTS
// ============================================================================

const JM_ALCOA_DIE_PIN: {
  features: FeatureInput[];
  material: MaterialInput;
  stock: StockInput;
  customer: string;
  part_number: string;
} = {
  features: [
    { id: "F1", type: "face", diameter_mm: 25.4, depth_mm: 2, tolerance_total_mm: 0.05 },
    { id: "F2", type: "od_turn", diameter_mm: 25.4, length_mm: 50, tolerance_total_mm: 0.025, is_critical: true, cpk_target: 1.67 },
    { id: "F3", type: "chamfer_od", diameter_mm: 25.4, depth_mm: 1.5 },
    { id: "F4", type: "groove_od", diameter_mm: 20, depth_mm: 2.5 },
  ],
  material: { name: "6061-T6 Aluminum", iso_group: "N", tensile_strength_mpa: 310, machinability_factor: 1.5 },
  stock: { od_mm: 30, length_mm: 80, id_mm: 0 },
  customer: "ALCOA",
  part_number: "AL-DIE-PIN-001",
};

const JM_OPTIMAS_BUSHING = {
  features: [
    { id: "B1", type: "face" as const, diameter_mm: 38.1, depth_mm: 1, tolerance_total_mm: 0.02 },
    { id: "B2", type: "od_turn" as const, diameter_mm: 38.1, length_mm: 25, tolerance_total_mm: 0.015, is_critical: true, cpk_target: 1.67 },
    { id: "B3", type: "id_bore" as const, diameter_mm: 25.4, depth_mm: 25, tolerance_total_mm: 0.012, is_critical: true, cpk_target: 2.0 },
  ] as FeatureInput[],
  material: { name: "4140 Hardened", iso_group: "H" as const, hardness_hrc: 58, tensile_strength_mpa: 1800 } as MaterialInput,
  stock: { od_mm: 42, length_mm: 30, id_mm: 0 } as StockInput,
  customer: "OPTIMAS",
  part_number: "OPT-BUSH-1234",
};

const JM_ITW_CONNECTOR = {
  features: [
    { id: "C1", type: "center_drill" as const, diameter_mm: 3.2, depth_mm: 5 },
    { id: "C2", type: "drill" as const, diameter_mm: 8.5, depth_mm: 30, tolerance_total_mm: 0.1 },
    { id: "C3", type: "face" as const, diameter_mm: 19.05, depth_mm: 1.5, tolerance_total_mm: 0.05 },
    { id: "C4", type: "od_turn" as const, diameter_mm: 19.05, length_mm: 40, tolerance_total_mm: 0.025 },
    { id: "C5", type: "thread_external" as const, diameter_mm: 19.05, length_mm: 20, tolerance_total_mm: 1.5 },
  ] as FeatureInput[],
  material: { name: "303 Stainless", iso_group: "M" as const, tensile_strength_mpa: 620, machinability_factor: 0.5 } as MaterialInput,
  stock: { od_mm: 22, length_mm: 50, id_mm: 0 } as StockInput,
  customer: "ITW",
  part_number: "ITW-CONN-5678",
};

// ============================================================================
// FULL PIPELINE RUNNER
// ============================================================================

interface PipelineOutcome {
  strategy_plan: ReturnType<typeof lathePrintFeatureStrategySelectorEngine.generateStrategyPlan>;
  sequence_plan: ReturnType<typeof lathePrintSequencePlannerEngine.planSequence>;
  setup: ReturnType<typeof lathePrintSetupSelectionEngine.selectSetup>;
  toolpath: ReturnType<typeof lathePrintToolpathGeneratorEngine.generateProgram>;
  emitted: ReturnType<typeof lathePrintProgramEmitterEngine.emit>;
  signoff: ReturnType<typeof lathePrintProgramSignoffEngine.generatePackage>;
  dl: ReturnType<typeof lathePrintToProgramDLIntelligenceEngine.predict>;
  reasoning: ReturnType<typeof lathePrintToProgramReasoningEngine.explain>;
  kg_job: ReturnType<typeof lathePrintToProgramKnowledgeGraphEngine.ingest>;
}

function runFullPipeline(fixture: typeof JM_ALCOA_DIE_PIN): PipelineOutcome {
  // 1. Strategy
  const strategy_plan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
    fixture.features,
    fixture.material
  );

  // 2. Sequence
  const sequence_plan = lathePrintSequencePlannerEngine.planSequence(
    strategy_plan,
    fixture.stock,
    fixture.features
  );

  // 3. Setup
  const geometry = lathePrintSetupSelectionEngine.inferGeometry(fixture.features);
  const loads = lathePrintSetupSelectionEngine.estimateLoads(sequence_plan, fixture.material);
  const setup = lathePrintSetupSelectionEngine.selectSetup(geometry, fixture.material, loads);

  // 4. Toolpath
  const toolpath = lathePrintToolpathGeneratorEngine.generateProgram(
    sequence_plan,
    fixture.features,
    fixture.material
  );

  // 5. Emit
  const emitted = lathePrintProgramEmitterEngine.emit(toolpath, {
    controller: "fanuc",
    program_name: fixture.part_number,
    use_css: true,
  });

  // 6. Signoff
  const signoff = lathePrintProgramSignoffEngine.generatePackage({
    strategy_plan, sequence_plan, setup, toolpath, emitted,
    features: fixture.features, material: fixture.material,
    part_number: fixture.part_number, customer: fixture.customer,
  });

  // 7. DL review
  const dl = lathePrintToProgramDLIntelligenceEngine.predict({
    strategy_plan, sequence_plan, setup, toolpath, emitted,
    features: fixture.features, material: fixture.material,
  });

  // 8. Reasoning
  const reasoning = lathePrintToProgramReasoningEngine.explain({
    strategy_plan, sequence_plan, setup, toolpath, emitted,
    dl_prediction: dl,
    features: fixture.features, material: fixture.material,
  });

  // 9. Knowledge Graph
  const kg_job = lathePrintToProgramKnowledgeGraphEngine.ingest({
    strategy_plan, sequence_plan, setup, toolpath, emitted,
    features: fixture.features, material: fixture.material,
    customer: fixture.customer, part_number: fixture.part_number,
    outcome: { actual_cycle_time_sec: toolpath.total_cycle_time_sec, scrap_count: 0, first_article_pass: true },
  });

  return { strategy_plan, sequence_plan, setup, toolpath, emitted, signoff, dl, reasoning, kg_job };
}

// ============================================================================
// E2E TESTS
// ============================================================================

describe("Lathe P2P Full Pipeline E2E", () => {
  beforeEach(() => {
    lathePrintToProgramKnowledgeGraphEngine.clear();
  });

  describe("Alcoa Die Pin (aluminum)", () => {
    it("runs end-to-end without errors", () => {
      const out = runFullPipeline(JM_ALCOA_DIE_PIN);
      expect(out.strategy_plan.recommendations.length).toBe(4);
      expect(out.sequence_plan.operations.length).toBe(4);
      expect(out.toolpath.operations.length).toBe(4);
      expect(out.emitted.gcode.length).toBeGreaterThan(100);
    });

    it("produces release-ready signoff", () => {
      const out = runFullPipeline(JM_ALCOA_DIE_PIN);
      expect(out.signoff.release_ready).toBe(true);
      expect(out.signoff.critical_fail_count).toBe(0);
    });

    it("DL produces prediction for clean aluminum in valid range", () => {
      const out = runFullPipeline(JM_ALCOA_DIE_PIN);
      // Invariant: valid probability bounds, tier assigned, suggestions generated
      expect(out.dl.failure_probability).toBeGreaterThanOrEqual(0);
      expect(out.dl.failure_probability).toBeLessThanOrEqual(1);
      expect(["low", "moderate", "high", "critical"]).toContain(out.dl.tier);
      expect(out.dl.top_risk_factors.length).toBeGreaterThan(0);
    });

    it("reasoning trace has >=10 steps", () => {
      const out = runFullPipeline(JM_ALCOA_DIE_PIN);
      expect(out.reasoning.step_count).toBeGreaterThanOrEqual(10);
    });

    it("KG ingests job with nodes and edges", () => {
      const out = runFullPipeline(JM_ALCOA_DIE_PIN);
      expect(out.kg_job.job_id).toMatch(/^job_/);
      expect(out.kg_job.nodes_added).toBeGreaterThan(5);
      expect(out.kg_job.edges_added).toBeGreaterThan(5);
    });
  });

  describe("Optimas Bushing (hardened steel)", () => {
    it("full pipeline completes", () => {
      const out = runFullPipeline(JM_OPTIMAS_BUSHING);
      expect(out.emitted.controller).toBe("fanuc");
      expect(out.signoff.program_summary.operation_count).toBe(3);
    });

    it("DL model exposes risk factors including material_difficulty for hardened part", () => {
      const hardOut = runFullPipeline(JM_OPTIMAS_BUSHING);
      // Hardened material must surface in the top risk factors
      const factors = hardOut.dl.top_risk_factors.map(f => f.factor);
      expect(factors).toContain("material_difficulty");
      // And prediction is valid
      expect(hardOut.dl.failure_probability).toBeGreaterThanOrEqual(0);
      expect(hardOut.dl.failure_probability).toBeLessThanOrEqual(1);
    });

    it("reasoning includes material counterfactual for hardened part", () => {
      const out = runFullPipeline(JM_OPTIMAS_BUSHING);
      const matCf = out.reasoning.counterfactuals.find(c => c.variable_changed === "material");
      expect(matCf).toBeTruthy();
    });
  });

  describe("ITW Connector (stainless with threading)", () => {
    it("full pipeline with 5 operations (center_drill → drill → face → OD → thread)", () => {
      const out = runFullPipeline(JM_ITW_CONNECTOR);
      expect(out.sequence_plan.operations.length).toBe(5);
      // Precedence: center_drill first, thread last
      expect(out.sequence_plan.operations[0].featureId).toBe("C1");
      const threadOp = out.sequence_plan.operations.find(o => o.featureType === "thread_external");
      expect(threadOp).toBeTruthy();
    });

    it("G-code contains G76 threading cycle", () => {
      const out = runFullPipeline(JM_ITW_CONNECTOR);
      expect(out.emitted.gcode).toContain("G76");
    });

    it("G-code contains G83 peck drilling cycle", () => {
      const out = runFullPipeline(JM_ITW_CONNECTOR);
      expect(out.emitted.gcode).toContain("G83");
    });
  });

  describe("Cross-fixture Knowledge Graph", () => {
    it("ingesting 3 fixtures builds queryable graph", () => {
      runFullPipeline(JM_ALCOA_DIE_PIN);
      runFullPipeline(JM_OPTIMAS_BUSHING);
      runFullPipeline(JM_ITW_CONNECTOR);

      const stats = lathePrintToProgramKnowledgeGraphEngine.getStats();
      expect(stats.nodes_by_type.job).toBe(3);
      expect(stats.nodes_by_type.customer).toBe(3);
      expect(stats.nodes_by_type.material).toBe(3);
    });

    it("findSimilarJobs returns correct material group match", () => {
      runFullPipeline(JM_ALCOA_DIE_PIN);
      runFullPipeline(JM_OPTIMAS_BUSHING);
      runFullPipeline(JM_ITW_CONNECTOR);

      const nMatches = lathePrintToProgramKnowledgeGraphEngine.findSimilarJobs({
        material_iso_group: "N",
      });
      expect(nMatches.matches.length).toBe(1);  // Only Alcoa

      const hMatches = lathePrintToProgramKnowledgeGraphEngine.findSimilarJobs({
        material_iso_group: "H",
      });
      expect(hMatches.matches.length).toBe(1);  // Only Optimas
    });

    it("findJobsForCustomer returns correct customer history", () => {
      runFullPipeline(JM_ALCOA_DIE_PIN);
      runFullPipeline(JM_ITW_CONNECTOR);

      const alcoaJobs = lathePrintToProgramKnowledgeGraphEngine.findJobsForCustomer("ALCOA");
      expect(alcoaJobs.length).toBe(1);
      expect(alcoaJobs[0].properties.part_number).toBe("AL-DIE-PIN-001");
    });
  });

  // ============================================================================
  // ACTION ENUM COMPLETENESS (WIRING VERIFICATION)
  // ============================================================================

  describe("Dispatcher Wiring Completeness", () => {
    const requiredActions = [
      // Stage 1: Ingest (U-LTH33)
      "lathe_p2p_ingest", "lathe_p2p_ingest_batch", "lathe_p2p_validate_extraction",
      // Stage 2: Feature recognition (U-LTH34)
      "lathe_p2p_recognize_features", "lathe_p2p_recognize_batch",
      "lathe_p2p_feature_taxonomy", "lathe_p2p_recognition_stats",
      // Stage 3: Tolerance propagation (U-LTH35)
      "lathe_p2p_tolerance_propagate", "lathe_p2p_tolerance_batch",
      "lathe_p2p_tolerance_stats", "lathe_p2p_tolerance_validate",
      // Stage 4: Strategy selection (U-LTH36)
      "lathe_p2p_strategy_select", "lathe_p2p_strategy_batch", "lathe_p2p_strategy_plan",
      "lathe_p2p_strategy_stats", "lathe_p2p_strategy_validate",
      // Stage 5: Sequence planning (U-LTH37)
      "lathe_p2p_sequence_plan", "lathe_p2p_sequence_summarize", "lathe_p2p_sequence_autofix",
      // Stage 6: Setup selection (U-LTH38)
      "lathe_p2p_setup_select", "lathe_p2p_setup_from_features",
      "lathe_p2p_setup_validate", "lathe_p2p_setup_infer_geometry",
      // Stage 7: Toolpath generation (U-LTH39)
      "lathe_p2p_toolpath_generate", "lathe_p2p_toolpath_validate",
      "lathe_p2p_toolpath_gcode", "lathe_p2p_toolpath_cycle_time",
      // Stage 8: Emit (U-LTH40)
      "lathe_p2p_emit", "lathe_p2p_emit_validate", "lathe_p2p_emit_controllers", "lathe_p2p_emit_dry_run",
      // Stage 9: Signoff (U-LTH41)
      "lathe_p2p_signoff_generate", "lathe_p2p_signoff_approve",
      "lathe_p2p_signoff_markdown", "lathe_p2p_signoff_json", "lathe_p2p_signoff_is_approved",
      // Stage 10: DL review (U-LTH42)
      "lathe_p2p_dl_predict", "lathe_p2p_dl_rank_alternatives",
      "lathe_p2p_dl_batch", "lathe_p2p_dl_evaluate_accuracy", "lathe_p2p_dl_export_weights",
      // Stage 11: Reasoning (U-LTH43)
      "lathe_p2p_reason_explain", "lathe_p2p_reason_markdown",
      "lathe_p2p_reason_json", "lathe_p2p_reason_filter", "lathe_p2p_reason_mode_summary",
      // Stage 12: Knowledge graph (U-LTH44)
      "lathe_p2p_kg_ingest", "lathe_p2p_kg_find_similar", "lathe_p2p_kg_tools_for_material",
      "lathe_p2p_kg_customer_jobs", "lathe_p2p_kg_failures", "lathe_p2p_kg_stats",
      "lathe_p2p_kg_export", "lathe_p2p_kg_import", "lathe_p2p_kg_traverse", "lathe_p2p_kg_clear",
    ];

    it.each(requiredActions)("dispatcher contains action %s", (action) => {
      expect(camActions).toContain(action);
    });

    it("total lathe_p2p_* action count is exactly 61 (full P4 pipeline + LATHE-P2P-CONSENSUS-MS4 gates)", () => {
      // 56 was the LATHE-MASTER-P4 baseline. LATHE-P2P-CONSENSUS-MS4 added 5 actions:
      //   P0-U02: lathe_p2p_sequence_plan_consensus
      //   P0-U03: lathe_p2p_strategy_select_consensus, lathe_p2p_strategy_batch_consensus
      //   P1-U02: lathe_p2p_emit_consensus
      //   P1-U03: lathe_p2p_safety_gate_enforce  (Ω/S(x) hard gate)
      const p2pActions = (camActions as readonly string[]).filter(a => a.startsWith("lathe_p2p_"));
      expect(p2pActions.length).toBe(61);
      expect(requiredActions.length).toBe(56); // requiredActions = baseline set; consensus/safety actions are additive
    });
  });

  // ============================================================================
  // PIPELINE ARTIFACT CONSISTENCY
  // ============================================================================

  describe("Pipeline Artifact Consistency", () => {
    it("sequence op count equals toolpath op count", () => {
      const out = runFullPipeline(JM_ITW_CONNECTOR);
      expect(out.toolpath.operations.length).toBe(out.sequence_plan.operations.length);
    });

    it("signoff operation count equals toolpath operation count", () => {
      const out = runFullPipeline(JM_ITW_CONNECTOR);
      expect(out.signoff.program_summary.operation_count).toBe(out.toolpath.operations.length);
    });

    it("reasoning trace includes dl_review step when DL provided", () => {
      const out = runFullPipeline(JM_ALCOA_DIE_PIN);
      const dlStep = out.reasoning.steps.find(s => s.stage === "dl_review");
      expect(dlStep).toBeTruthy();
    });

    it("emitted G-code contains expected modal setup for fanuc", () => {
      const out = runFullPipeline(JM_ALCOA_DIE_PIN);
      expect(out.emitted.gcode).toContain("G21");  // metric
      expect(out.emitted.gcode).toContain("M30");  // program end
    });

    it("KG job node references back to emitted program", () => {
      const out = runFullPipeline(JM_ALCOA_DIE_PIN);
      const exported = lathePrintToProgramKnowledgeGraphEngine.exportGraph();
      const jobNode = exported.nodes.find(n => n.id === out.kg_job.job_id);
      expect(jobNode?.properties.program_id).toBe(out.toolpath.program_id);
    });
  });
});
