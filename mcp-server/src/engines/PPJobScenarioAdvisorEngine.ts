/**
 * PPJobScenarioAdvisorEngine — Unified PP-AGI Advisor
 *
 * Orchestrates all Phase 0 + Phase 1 engines to deliver practical job
 * recommendations. Given a job specification, produces:
 *   - Recommended controller dialect + G-code patterns
 *   - Machine compatibility assessment
 *   - Material substitution suggestions
 *   - Toolpath strategy recommendation
 *   - Physics condition validation
 *   - Safety envelope check
 *   - Overall confidence + explanation
 *
 * Pipeline:
 *   Input → Embeddings → Fusion → Uncertainty → Active Learning →
 *   Online Tracker → Explainer → Output
 *
 * @module PPJobScenarioAdvisorEngine
 */

import { ppControllerEmbeddingEngine } from "./PPControllerEmbeddingEngine.js";
import { ppDialectTransferEngine, type PartialControllerSpec } from "./PPDialectTransferEngine.js";
import { ppMachineVectorEncoderEngine } from "./PPMachineVectorEncoderEngine.js";
import { ppCuttingToolEncoderEngine, type ToolSpec } from "./PPCuttingToolEncoderEngine.js";
import { ppMaterialPropertyVectorEngine } from "./PPMaterialPropertyVectorEngine.js";
import { ppToolpathStrategyEncoderEngine, type ToolpathSpec } from "./PPToolpathStrategyEncoderEngine.js";
import { ppPhysicsConditionEncoderEngine, type PhysicsCondition } from "./PPPhysicsConditionEncoderEngine.js";
import { ppSafetyEnvelopeVectorEngine, type SafetyEnvelopeSpec } from "./PPSafetyEnvelopeVectorEngine.js";
import { ppMultiModalFusionEngine, type ScenarioInput } from "./PPMultiModalFusionEngine.js";
import { ppEnsembleUncertaintyEngine } from "./PPEnsembleUncertaintyEngine.js";
import { ppDecisionExplainerEngine } from "./PPDecisionExplainerEngine.js";
import { ppActiveLearningQueueEngine } from "./PPActiveLearningQueueEngine.js";
import { ppOnlineLearningTrackerEngine } from "./PPOnlineLearningTrackerEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface JobSpec {
  controller_id: string;
  machine_id: string;
  material_id: string;
  tool?: ToolSpec;
  toolpath?: ToolpathSpec;
  physics?: PhysicsCondition;
  safety?: SafetyEnvelopeSpec;
  partial_controller?: PartialControllerSpec;
}

export interface JobAdvice {
  job_id: string;
  confidence: number;
  recommendation: "proceed" | "verify" | "caution" | "insufficient_data";
  summary: string;

  controller_advice: {
    dialect_family: string;
    safe_start: string;
    program_header: string[];
    tool_change_sequence: string[];
    coolant_codes: string;
    similar_controllers: Array<{ id: string; similarity: number }>;
  };

  machine_advice: {
    best_match: { id: string; name: string; similarity: number } | null;
    compatibility_notes: string[];
  };

  material_advice: {
    substitution_safe: boolean;
    similar_materials: Array<{ id: string; name: string; similarity: number }>;
    warnings: string[];
  };

  toolpath_advice: {
    recommended_strategies: Array<{ label: string; similarity: number }>;
  };

  risks: Array<{ domain: string; severity: string; message: string }>;

  explanation: {
    top_factors: Array<{ name: string; domain: string; value: number }>;
    analogies: string[];
    risk_narrative: string;
  };

  next_actions: string[];
  queued_for_review?: string;
  tracker_id: string;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPJobScenarioAdvisorEngine {
  /**
   * Generate comprehensive job advice using all PP-AGI engines.
   */
  advise(spec: JobSpec): JobAdvice {
    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const scenario: ScenarioInput = {
      controller_id: spec.controller_id,
      machine_id: spec.machine_id,
      material_id: spec.material_id,
    };

    // 1. Fusion + uncertainty
    const fusion = ppMultiModalFusionEngine.fuse(scenario);
    const uncertainty = ppEnsembleUncertaintyEngine.estimateUncertainty(scenario);
    const explanation = ppDecisionExplainerEngine.explain(scenario);

    // 2. Controller advice
    const controllerAdvice = this.buildControllerAdvice(spec);

    // 3. Machine advice
    const machineAdvice = this.buildMachineAdvice(spec);

    // 4. Material advice
    const materialAdvice = this.buildMaterialAdvice(spec);

    // 5. Toolpath advice
    const toolpathAdvice = this.buildToolpathAdvice(spec);

    // 6. Collect risks from all sources
    const risks = this.collectRisks(spec, fusion, uncertainty);

    // 7. Generate next actions
    const nextActions = this.generateNextActions(uncertainty, risks);

    // 8. Queue for review if uncertain
    let queuedForReview: string | undefined;
    if (uncertainty.confidence < 0.6) {
      const queued = ppActiveLearningQueueEngine.evaluate(scenario, { min_uncertainty: 0.3 });
      if (queued) queuedForReview = queued.id;
    }

    // 9. Record prediction for online tracking
    const trackerId = ppOnlineLearningTrackerEngine.recordPrediction(
      "scenario",
      `${spec.controller_id}+${spec.machine_id}+${spec.material_id}`,
      uncertainty.confidence,
      { job_id: jobId },
    );

    return {
      job_id: jobId,
      confidence: uncertainty.confidence,
      recommendation: uncertainty.recommendation,
      summary: explanation.summary,
      controller_advice: controllerAdvice,
      machine_advice: machineAdvice,
      material_advice: materialAdvice,
      toolpath_advice: toolpathAdvice,
      risks,
      explanation: {
        top_factors: explanation.top_factors.map(f => ({
          name: f.name, domain: f.domain, value: f.value,
        })),
        analogies: explanation.analogies,
        risk_narrative: explanation.risk_narrative,
      },
      next_actions: nextActions,
      queued_for_review: queuedForReview,
      tracker_id: trackerId,
    };
  }

  /**
   * Feedback loop: record actual outcome for a previously-advised job.
   */
  recordOutcome(trackerId: string, actualResult: string, errorMagnitude?: number, notes?: string): boolean {
    return ppOnlineLearningTrackerEngine.recordOutcome(trackerId, actualResult, errorMagnitude, notes);
  }

  // ── Private ──────────────────────────────────────────────────────────

  private buildControllerAdvice(spec: JobSpec): JobAdvice["controller_advice"] {
    const ctrlEmb = ppControllerEmbeddingEngine.embed(spec.controller_id);
    const nearest = ppControllerEmbeddingEngine.findNearest(spec.controller_id, 3);

    // Use dialect transfer engine to get actionable G-code patterns
    const transfer = ppDialectTransferEngine.transfer(
      spec.partial_controller ?? { base_family: ctrlEmb.base_family as any },
    );

    const safeStart = transfer.transferred_patterns.find(p => p.category === "safe_start");
    const programStart = transfer.transferred_patterns.find(p => p.category === "program_start");
    const toolChange = transfer.transferred_patterns.find(p => p.category === "tool_change");
    const coolant = transfer.transferred_patterns.find(p => p.category === "coolant_codes");

    return {
      dialect_family: ctrlEmb.base_family,
      safe_start: (safeStart?.pattern as string) ?? "G90 G21 G17 G40 G80 G49",
      program_header: (programStart?.pattern as string[]) ?? ["%", "O0001"],
      tool_change_sequence: (toolChange?.pattern as string[]) ?? ["G91 G28 Z0", "T{tool} M6", "G90"],
      coolant_codes: (coolant?.pattern as string) ?? "FLOOD=M8 MIST=M7 OFF=M9",
      similar_controllers: nearest.neighbors.map(n => ({
        id: n.controller_id, similarity: n.cosine_similarity,
      })),
    };
  }

  private buildMachineAdvice(spec: JobSpec): JobAdvice["machine_advice"] {
    const machEmb = ppMachineVectorEncoderEngine.embed(spec.machine_id);
    const notes: string[] = [];
    let bestMatch: JobAdvice["machine_advice"]["best_match"] = null;

    if (!machEmb) {
      notes.push(`Machine "${spec.machine_id}" not in kinematic profiles — collision data unavailable`);
      // Find nearest even if query unknown
      const all = ppMachineVectorEncoderEngine.embedAll();
      if (all.length > 0) {
        bestMatch = { id: all[0].machine_id, name: all[0].machine_name, similarity: 0 };
      }
    } else {
      const nearest = ppMachineVectorEncoderEngine.findNearest(spec.machine_id, 1);
      if (nearest && nearest.neighbors.length > 0) {
        const n = nearest.neighbors[0];
        bestMatch = { id: n.machine_id, name: n.machine_name, similarity: n.cosine_similarity };
      }

      if (machEmb.vector[36] === 1) notes.push("Machine is 5-axis — verify controller TCPC support");
      if (machEmb.vector[37] === 1) notes.push("Machine is lathe/Swiss — requires live tool / C-axis codes");
      if (machEmb.vector[38] === 1) notes.push("Machine is EDM — different G-code dialect, not traditional milling");
    }

    return { best_match: bestMatch, compatibility_notes: notes };
  }

  private buildMaterialAdvice(spec: JobSpec): JobAdvice["material_advice"] {
    const matEmb = ppMaterialPropertyVectorEngine.embed(spec.material_id);
    const warnings: string[] = [];

    let similar: JobAdvice["material_advice"]["similar_materials"] = [];
    let substitutionSafe = true;

    if (!matEmb) {
      warnings.push(`Material "${spec.material_id}" not in database — using category defaults`);
      substitutionSafe = false;
    } else {
      const nearest = ppMaterialPropertyVectorEngine.findNearest(spec.material_id, 3);
      if (nearest) {
        similar = nearest.neighbors.map(n => ({
          id: n.material_id, name: n.material_name, similarity: n.cosine_similarity,
        }));
      }

      if (matEmb.vector[29] === 1) warnings.push("Hardened material (HRC >45) — requires CBN or ceramic tooling");
      if (matEmb.vector[30] === 1) warnings.push("Heat-resistant alloy — high-pressure coolant strongly recommended");
      if (matEmb.vector[17] < 0.3) warnings.push("Low machinability — expect shorter tool life and lower MRR");
    }

    return { substitution_safe: substitutionSafe, similar_materials: similar, warnings };
  }

  private buildToolpathAdvice(spec: JobSpec): JobAdvice["toolpath_advice"] {
    if (!spec.toolpath) {
      return { recommended_strategies: [] };
    }

    const rec = ppToolpathStrategyEncoderEngine.recommend(spec.toolpath, 3);
    return {
      recommended_strategies: rec.recommendations.map(r => ({
        label: r.label, similarity: r.cosine_similarity,
      })),
    };
  }

  private collectRisks(
    spec: JobSpec,
    fusion: ReturnType<typeof ppMultiModalFusionEngine.fuse>,
    uncertainty: ReturnType<typeof ppEnsembleUncertaintyEngine.estimateUncertainty>,
  ): JobAdvice["risks"] {
    const risks: JobAdvice["risks"] = [];

    // Fusion compatibility warnings
    if (fusion?.compatibility.warnings.length) {
      for (const w of fusion.compatibility.warnings) {
        risks.push({ domain: "compatibility", severity: "warning", message: w });
      }
    }

    // Gap analysis
    if (fusion) {
      const gaps = ppMultiModalFusionEngine.analyzeGaps({
        controller_id: spec.controller_id,
        machine_id: spec.machine_id,
        material_id: spec.material_id,
      });
      for (const g of gaps.gaps) {
        risks.push({ domain: g.domain, severity: g.severity, message: g.issue });
      }
    }

    // Uncertainty dimensions
    for (const du of uncertainty.dimension_uncertainties) {
      if (du.uncertainty > 0.3) {
        risks.push({ domain: du.domain, severity: "info", message: du.reason });
      }
    }

    // Physics risks
    if (spec.physics) {
      const physEmb = ppPhysicsConditionEncoderEngine.embed(spec.physics);
      for (const r of physEmb.risk_summary.top_risks) {
        risks.push({ domain: "physics", severity: "warning", message: `Elevated ${r} risk` });
      }
    }

    // Safety envelope risks
    if (spec.safety) {
      const safEmb = ppSafetyEnvelopeVectorEngine.embed(spec.safety);
      if (safEmb.risk_level !== "low") {
        risks.push({
          domain: "safety",
          severity: safEmb.risk_level === "critical" ? "critical" : "warning",
          message: `Safety envelope risk level: ${safEmb.risk_level} (${safEmb.risk_factors.join(", ")})`,
        });
      }
    }

    return risks;
  }

  private generateNextActions(
    uncertainty: ReturnType<typeof ppEnsembleUncertaintyEngine.estimateUncertainty>,
    risks: JobAdvice["risks"],
  ): string[] {
    const actions: string[] = [];

    switch (uncertainty.recommendation) {
      case "proceed":
        actions.push("Proceed with recommended settings");
        actions.push("Record actual outcome after machining for online learning");
        break;
      case "verify":
        actions.push("Review recommended G-code patterns before running");
        actions.push("Verify controller dialect matches actual controller");
        actions.push("Record outcome for online learning");
        break;
      case "caution":
        actions.push("Manual review REQUIRED before running");
        actions.push("Cross-check against known-good programs for similar jobs");
        actions.push("Consider adding labeled ground truth via active learning queue");
        break;
      case "insufficient_data":
        actions.push("DO NOT PROCEED with auto-generated post-processor");
        actions.push("Provide missing data: controller family, machine kinematics, material properties");
        actions.push("Add scenario to active learning queue for expert labeling");
        break;
    }

    const criticals = risks.filter(r => r.severity === "critical");
    if (criticals.length > 0) {
      actions.unshift(`Address ${criticals.length} critical risk(s) before proceeding`);
    }

    return actions;
  }
}

export const ppJobScenarioAdvisorEngine = new PPJobScenarioAdvisorEngine();
