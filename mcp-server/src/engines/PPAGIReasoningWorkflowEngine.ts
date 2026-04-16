/**
 * PPAGIReasoningWorkflowEngine — Multi-step reasoning orchestration
 *
 * Chains multiple PP-AGI engines together for complex manufacturing
 * reasoning tasks that require sequential or parallel analysis.
 *
 * Supports 8 workflow types:
 *   1. NEW_JOB_SETUP — full analysis for a new job
 *   2. MACHINE_SUBSTITUTION — can I run this on a different machine?
 *   3. MATERIAL_SUBSTITUTION — can I substitute this material?
 *   4. CONTROLLER_MIGRATION — port program between controllers
 *   5. RISK_ASSESSMENT — comprehensive risk analysis
 *   6. PROGRAM_REVIEW — analyze an existing G-code program
 *   7. JOB_COMPARISON — compare two scenarios
 *   8. GAP_DISCOVERY — identify knowledge gaps
 *
 * Each workflow is deterministic, traceable, and produces structured output
 * with confidence scores. Steps are recorded for audit/replay.
 *
 * @module PPAGIReasoningWorkflowEngine
 */

import { ppJobScenarioAdvisorEngine, type JobSpec } from "./PPJobScenarioAdvisorEngine.js";
import { ppGCodeProgramAnalyzerEngine } from "./PPGCodeProgramAnalyzerEngine.js";
import { ppScenarioTemplateLibraryEngine } from "./PPScenarioTemplateLibraryEngine.js";
import { ppDialectTransferEngine } from "./PPDialectTransferEngine.js";
import { ppMaterialPropertyVectorEngine } from "./PPMaterialPropertyVectorEngine.js";
import { ppMachineVectorEncoderEngine } from "./PPMachineVectorEncoderEngine.js";
import { ppKnowledgeIndexEngine } from "./PPKnowledgeIndexEngine.js";
import { ppEnsembleUncertaintyEngine } from "./PPEnsembleUncertaintyEngine.js";
import { ppDecisionExplainerEngine } from "./PPDecisionExplainerEngine.js";
import { ppMultiModalFusionEngine, type ScenarioInput } from "./PPMultiModalFusionEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export type WorkflowType =
  | "new_job_setup"
  | "machine_substitution"
  | "material_substitution"
  | "controller_migration"
  | "risk_assessment"
  | "program_review"
  | "job_comparison"
  | "gap_discovery";

export interface WorkflowStep {
  step: number;
  name: string;
  engine: string;
  result_summary: string;
  latency_ms: number;
}

export interface WorkflowResult {
  workflow_id: string;
  workflow_type: WorkflowType;
  timestamp: number;
  total_latency_ms: number;
  steps: WorkflowStep[];
  output: unknown;
  overall_confidence: number;
  recommendation: string;
}

// ── Workflow input types ─────────────────────────────────────────────

export interface NewJobSetupInput {
  job: JobSpec;
}

export interface MachineSubstitutionInput {
  current_scenario: ScenarioInput;
  candidate_machines: string[];
}

export interface MaterialSubstitutionInput {
  current_scenario: ScenarioInput;
  candidate_materials: string[];
}

export interface ControllerMigrationInput {
  program_gcode: string;
  source_controller: string;
  target_controller: string;
}

export interface RiskAssessmentInput {
  scenario: ScenarioInput;
  operation_type?: string;
  hardened_material?: boolean;
}

export interface ProgramReviewInput {
  gcode: string;
  source_file?: string;
}

export interface JobComparisonInput {
  scenario_a: ScenarioInput;
  scenario_b: ScenarioInput;
}

export interface GapDiscoveryInput {
  topic: string;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPAGIReasoningWorkflowEngine {
  private counter = 0;

  /**
   * Run a workflow by type with typed input.
   */
  run(type: "new_job_setup", input: NewJobSetupInput): WorkflowResult;
  run(type: "machine_substitution", input: MachineSubstitutionInput): WorkflowResult;
  run(type: "material_substitution", input: MaterialSubstitutionInput): WorkflowResult;
  run(type: "controller_migration", input: ControllerMigrationInput): WorkflowResult;
  run(type: "risk_assessment", input: RiskAssessmentInput): WorkflowResult;
  run(type: "program_review", input: ProgramReviewInput): WorkflowResult;
  run(type: "job_comparison", input: JobComparisonInput): WorkflowResult;
  run(type: "gap_discovery", input: GapDiscoveryInput): WorkflowResult;
  run(type: WorkflowType, input: any): WorkflowResult {
    const start = Date.now();
    const workflowId = `wf_${Date.now()}_${this.counter++}`;
    const steps: WorkflowStep[] = [];

    let output: unknown;
    let confidence = 0;
    let recommendation = "";

    switch (type) {
      case "new_job_setup":
        ({ output, confidence, recommendation } = this.runNewJobSetup(input, steps));
        break;
      case "machine_substitution":
        ({ output, confidence, recommendation } = this.runMachineSubstitution(input, steps));
        break;
      case "material_substitution":
        ({ output, confidence, recommendation } = this.runMaterialSubstitution(input, steps));
        break;
      case "controller_migration":
        ({ output, confidence, recommendation } = this.runControllerMigration(input, steps));
        break;
      case "risk_assessment":
        ({ output, confidence, recommendation } = this.runRiskAssessment(input, steps));
        break;
      case "program_review":
        ({ output, confidence, recommendation } = this.runProgramReview(input, steps));
        break;
      case "job_comparison":
        ({ output, confidence, recommendation } = this.runJobComparison(input, steps));
        break;
      case "gap_discovery":
        ({ output, confidence, recommendation } = this.runGapDiscovery(input, steps));
        break;
    }

    return {
      workflow_id: workflowId,
      workflow_type: type,
      timestamp: start,
      total_latency_ms: Date.now() - start,
      steps,
      output,
      overall_confidence: round2(confidence),
      recommendation,
    };
  }

  /** List all available workflow types with descriptions. */
  listWorkflows(): Array<{ type: WorkflowType; description: string }> {
    return [
      { type: "new_job_setup", description: "Full analysis and recommendation for a new machining job" },
      { type: "machine_substitution", description: "Evaluate alternative machines for the same job" },
      { type: "material_substitution", description: "Evaluate alternative materials with parameter transfer" },
      { type: "controller_migration", description: "Port a program from one controller to another" },
      { type: "risk_assessment", description: "Comprehensive multi-domain risk analysis" },
      { type: "program_review", description: "Analyze existing G-code for quality and issues" },
      { type: "job_comparison", description: "Compare two scenarios side-by-side" },
      { type: "gap_discovery", description: "Identify knowledge gaps on a topic" },
    ];
  }

  // ── Workflow implementations ─────────────────────────────────────────

  private runNewJobSetup(input: NewJobSetupInput, steps: WorkflowStep[]) {
    const s1 = Date.now();
    const advice = ppJobScenarioAdvisorEngine.advise(input.job);
    steps.push({
      step: 1, name: "Generate job advice", engine: "PPJobScenarioAdvisorEngine",
      result_summary: `Confidence ${(advice.confidence * 100).toFixed(0)}%, ${advice.risks.length} risks`,
      latency_ms: Date.now() - s1,
    });

    const s2 = Date.now();
    const templates = ppScenarioTemplateLibraryEngine.findSimilar({
      controller_id: input.job.controller_id,
      machine_id: input.job.machine_id,
      material_id: input.job.material_id,
    }, 3);
    steps.push({
      step: 2, name: "Find similar proven templates", engine: "PPScenarioTemplateLibraryEngine",
      result_summary: `${templates.length} templates found, top similarity: ${templates[0]?.similarity ?? 0}`,
      latency_ms: Date.now() - s2,
    });

    return {
      output: { advice, similar_templates: templates },
      confidence: advice.confidence,
      recommendation: `${advice.recommendation}. ${templates.length > 0 ? `Reference template: ${templates[0].template.label}` : "No matching templates found."}`,
    };
  }

  private runMachineSubstitution(input: MachineSubstitutionInput, steps: WorkflowStep[]) {
    const s1 = Date.now();
    const baseAdvice = ppJobScenarioAdvisorEngine.advise({
      controller_id: input.current_scenario.controller_id,
      machine_id: input.current_scenario.machine_id,
      material_id: input.current_scenario.material_id,
    });
    steps.push({
      step: 1, name: "Establish baseline", engine: "PPJobScenarioAdvisorEngine",
      result_summary: `Baseline confidence ${(baseAdvice.confidence * 100).toFixed(0)}%`,
      latency_ms: Date.now() - s1,
    });

    const s2 = Date.now();
    const candidates: Array<{ machine: string; advice: any; delta: number }> = [];
    for (const machineId of input.candidate_machines) {
      const advice = ppJobScenarioAdvisorEngine.advise({
        ...input.current_scenario, machine_id: machineId,
      });
      candidates.push({
        machine: machineId,
        advice,
        delta: round2(advice.confidence - baseAdvice.confidence),
      });
    }
    candidates.sort((a, b) => b.advice.confidence - a.advice.confidence);
    steps.push({
      step: 2, name: "Evaluate candidates", engine: "PPJobScenarioAdvisorEngine",
      result_summary: `${candidates.length} machines evaluated, best: ${candidates[0]?.machine}`,
      latency_ms: Date.now() - s2,
    });

    const best = candidates[0];
    return {
      output: { baseline: baseAdvice, candidates },
      confidence: best?.advice.confidence ?? 0,
      recommendation: best
        ? `Best alternative: ${best.machine} (confidence ${(best.advice.confidence * 100).toFixed(0)}%, delta ${best.delta >= 0 ? "+" : ""}${best.delta})`
        : "No viable alternatives found",
    };
  }

  private runMaterialSubstitution(input: MaterialSubstitutionInput, steps: WorkflowStep[]) {
    const s1 = Date.now();
    const candidates: Array<{ material: string; comparison: any }> = [];
    for (const matId of input.candidate_materials) {
      const cmp = ppMaterialPropertyVectorEngine.compare(input.current_scenario.material_id, matId);
      if (cmp) candidates.push({ material: matId, comparison: cmp });
    }
    candidates.sort((a, b) => b.comparison.parameter_transfer_confidence - a.comparison.parameter_transfer_confidence);
    steps.push({
      step: 1, name: "Compare materials", engine: "PPMaterialPropertyVectorEngine",
      result_summary: `${candidates.length} candidates evaluated`,
      latency_ms: Date.now() - s1,
    });

    const s2 = Date.now();
    const safeSubstitutes = candidates.filter(c => c.comparison.substitution_safe);
    steps.push({
      step: 2, name: "Filter safe substitutes", engine: "PPMaterialPropertyVectorEngine",
      result_summary: `${safeSubstitutes.length} safe substitutes identified`,
      latency_ms: Date.now() - s2,
    });

    const best = candidates[0];
    return {
      output: { candidates, safe_substitutes: safeSubstitutes },
      confidence: best?.comparison.parameter_transfer_confidence ?? 0,
      recommendation: best
        ? `Best substitute: ${best.material} (${best.comparison.substitution_safe ? "SAFE" : "verify parameters"})`
        : "No substitutes evaluated",
    };
  }

  private runControllerMigration(input: ControllerMigrationInput, steps: WorkflowStep[]) {
    const s1 = Date.now();
    const analysis = ppGCodeProgramAnalyzerEngine.analyze(input.program_gcode);
    steps.push({
      step: 1, name: "Analyze source program", engine: "PPGCodeProgramAnalyzerEngine",
      result_summary: `Source: ${analysis.controller.inferred_family}, ${analysis.operations.count} operations`,
      latency_ms: Date.now() - s1,
    });

    const s2 = Date.now();
    const transfer = ppDialectTransferEngine.transfer({
      base_family: analysis.controller.inferred_family as any,
      sample_gcode: input.program_gcode.split("\n").slice(0, 20),
    });
    steps.push({
      step: 2, name: "Transfer patterns to target", engine: "PPDialectTransferEngine",
      result_summary: `Best match: ${transfer.best_match.controller_id}, ${transfer.transferred_patterns.length} patterns`,
      latency_ms: Date.now() - s2,
    });

    return {
      output: {
        source_analysis: analysis,
        target_patterns: transfer.transferred_patterns,
        gaps: transfer.gaps,
      },
      confidence: transfer.overall_confidence,
      recommendation: transfer.gaps.length > 0
        ? `Migration feasible but ${transfer.gaps.length} gap(s) need manual review`
        : `Migration clean — patterns map directly to ${transfer.best_match.display_name}`,
    };
  }

  private runRiskAssessment(input: RiskAssessmentInput, steps: WorkflowStep[]) {
    const s1 = Date.now();
    const uncertainty = ppEnsembleUncertaintyEngine.estimateUncertainty(input.scenario);
    steps.push({
      step: 1, name: "Estimate uncertainty", engine: "PPEnsembleUncertaintyEngine",
      result_summary: `Confidence ${(uncertainty.confidence * 100).toFixed(0)}%, ${uncertainty.dimension_uncertainties.length} domain gaps`,
      latency_ms: Date.now() - s1,
    });

    const s2 = Date.now();
    const gaps = ppMultiModalFusionEngine.analyzeGaps(input.scenario);
    steps.push({
      step: 2, name: "Analyze cross-modal gaps", engine: "PPMultiModalFusionEngine",
      result_summary: `${gaps.gaps.length} gaps (${gaps.gaps.filter(g => g.severity === "critical").length} critical)`,
      latency_ms: Date.now() - s2,
    });

    const s3 = Date.now();
    const explanation = ppDecisionExplainerEngine.explain(input.scenario);
    steps.push({
      step: 3, name: "Generate explanation", engine: "PPDecisionExplainerEngine",
      result_summary: `${explanation.top_factors.length} top factors identified`,
      latency_ms: Date.now() - s3,
    });

    const criticals = gaps.gaps.filter(g => g.severity === "critical");
    return {
      output: { uncertainty, gaps, explanation },
      confidence: uncertainty.confidence,
      recommendation: criticals.length > 0
        ? `CRITICAL: ${criticals.length} critical issue(s) — do not proceed without review`
        : uncertainty.recommendation === "proceed" ? "Risk acceptable — proceed" : `Review required: ${uncertainty.recommendation}`,
    };
  }

  private runProgramReview(input: ProgramReviewInput, steps: WorkflowStep[]) {
    const s1 = Date.now();
    const report = ppGCodeProgramAnalyzerEngine.analyze(input.gcode, input.source_file);
    steps.push({
      step: 1, name: "Analyze G-code program", engine: "PPGCodeProgramAnalyzerEngine",
      result_summary: `${report.line_count} lines, ${report.operations.count} operations, quality ${report.quality.score}`,
      latency_ms: Date.now() - s1,
    });

    return {
      output: report,
      confidence: report.quality.score,
      recommendation: report.quality.score > 0.7
        ? "Program looks good — review risks and proceed"
        : `Quality score ${report.quality.score} — ${report.quality.issues.length} issue(s) to address`,
    };
  }

  private runJobComparison(input: JobComparisonInput, steps: WorkflowStep[]) {
    const s1 = Date.now();
    const adviceA = ppJobScenarioAdvisorEngine.advise({
      controller_id: input.scenario_a.controller_id,
      machine_id: input.scenario_a.machine_id,
      material_id: input.scenario_a.material_id,
    });
    const adviceB = ppJobScenarioAdvisorEngine.advise({
      controller_id: input.scenario_b.controller_id,
      machine_id: input.scenario_b.machine_id,
      material_id: input.scenario_b.material_id,
    });
    steps.push({
      step: 1, name: "Generate advice for both", engine: "PPJobScenarioAdvisorEngine",
      result_summary: `A: ${(adviceA.confidence * 100).toFixed(0)}% | B: ${(adviceB.confidence * 100).toFixed(0)}%`,
      latency_ms: Date.now() - s1,
    });

    const s2 = Date.now();
    const fusionA = ppMultiModalFusionEngine.fuse(input.scenario_a);
    const fusionB = ppMultiModalFusionEngine.fuse(input.scenario_b);
    let similarity = 0;
    if (fusionA && fusionB) {
      similarity = ppMultiModalFusionEngine.cosineSimilarity(fusionA.fused_vector, fusionB.fused_vector);
    }
    steps.push({
      step: 2, name: "Compute scenario similarity", engine: "PPMultiModalFusionEngine",
      result_summary: `Similarity: ${round4(similarity)}`,
      latency_ms: Date.now() - s2,
    });

    const better = adviceA.confidence >= adviceB.confidence ? "A" : "B";
    return {
      output: {
        advice_a: adviceA,
        advice_b: adviceB,
        similarity,
      },
      confidence: Math.max(adviceA.confidence, adviceB.confidence),
      recommendation: `Scenario ${better} has higher confidence. Similarity: ${round4(similarity)}`,
    };
  }

  private runGapDiscovery(input: GapDiscoveryInput, steps: WorkflowStep[]) {
    const s1 = Date.now();
    const search = ppKnowledgeIndexEngine.crossDomainSearch(input.topic, 3);
    steps.push({
      step: 1, name: "Cross-domain search", engine: "PPKnowledgeIndexEngine",
      result_summary: `Controllers: ${search.controllers.length}, Machines: ${search.machines.length}, Materials: ${search.materials.length}`,
      latency_ms: Date.now() - s1,
    });

    const s2 = Date.now();
    const coverage = ppKnowledgeIndexEngine.fullCoverage();
    const totalGaps = coverage.reduce((s, c) => s + c.notable_gaps.length, 0);
    steps.push({
      step: 2, name: "Coverage analysis", engine: "PPKnowledgeIndexEngine",
      result_summary: `${totalGaps} notable gaps across ${coverage.length} domains`,
      latency_ms: Date.now() - s2,
    });

    const totalMatches = search.controllers.length + search.machines.length + search.materials.length +
      search.tools.length + search.toolpaths.length + search.templates.length;

    return {
      output: { search_results: search, coverage_gaps: coverage },
      confidence: totalMatches > 0 ? Math.min(1, totalMatches / 10) : 0,
      recommendation: totalMatches > 0
        ? `${totalMatches} knowledge entries found for "${input.topic}". Gaps: ${totalGaps}`
        : `No knowledge found for "${input.topic}". Consider extraction from external sources.`,
    };
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppAGIReasoningWorkflowEngine = new PPAGIReasoningWorkflowEngine();
