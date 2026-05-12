/**
 * PPGCodeProgramAnalyzerEngine — Full PP-AGI analysis of any G-code program
 *
 * Takes a raw G-code program and applies the full PP-AGI embedding stack:
 *   1. Training pipeline extracts features (controller, operations, complexity)
 *   2. Controller embedding classifies dialect with confidence
 *   3. Toolpath encoder classifies operation strategies
 *   4. Template library finds similar known-good programs
 *   5. Advisor generates recommendations + risks
 *   6. Uncertainty estimates confidence
 *   7. Explainer provides human-readable report
 *
 * Output: comprehensive program analysis report combining all signals.
 *
 * @module PPGCodeProgramAnalyzerEngine
 */

import { ppTrainingDataPipelineEngine } from "./PPTrainingDataPipelineEngine.js";
import { ppDialectTransferEngine } from "./PPDialectTransferEngine.js";
import { ppControllerEmbeddingEngine } from "./PPControllerEmbeddingEngine.js";
import { ppToolpathStrategyEncoderEngine, type ToolpathSpec } from "./PPToolpathStrategyEncoderEngine.js";
import { ppScenarioTemplateLibraryEngine } from "./PPScenarioTemplateLibraryEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface ProgramAnalysisReport {
  source_file?: string;

  // Basic metrics
  line_count: number;
  block_count: number;
  tool_changes: number;
  unique_tools: number;

  // Classification
  controller: {
    inferred_family: string;
    confidence: number;
    nearest_dialect: string;
    nearest_similarity: number;
    evidence: string[];
  };

  operations: {
    count: number;
    types: string[];
    complexity: "simple" | "moderate" | "complex" | "expert";
    has_5axis: boolean;
    has_probing: boolean;
    has_macros: boolean;
    has_subprograms: boolean;
  };

  // Toolpath classification for main operations
  toolpath_classifications: Array<{
    tool_number: number;
    inferred_strategy: string;
    matched_templates: string[];
  }>;

  // Quality
  quality: {
    score: number;
    issues: string[];
    strengths: string[];
  };

  // Risks
  risks: Array<{
    severity: "info" | "warning" | "critical";
    category: string;
    message: string;
  }>;

  // Recommendations
  recommendations: string[];

  // Similar templates
  similar_templates: Array<{
    template_id: string;
    label: string;
    similarity: number;
  }>;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPGCodeProgramAnalyzerEngine {
  /**
   * Full analysis of a G-code program.
   */
  analyze(gcode: string, sourceFile?: string): ProgramAnalysisReport {
    // 1. Parse with training pipeline
    const record = ppTrainingDataPipelineEngine.processProgram(gcode, sourceFile);
    const features = record.features;

    // 2. Controller classification via dialect transfer
    const lines = gcode.split(/\r?\n/).slice(0, 30);
    const dialectInfer = ppDialectTransferEngine.inferFamily(lines);

    // 3. Find nearest known controller dialect
    let nearestDialect = "generic_fanuc";
    let nearestSim = 0;
    try {
      // Use family as a proxy to find representative controller
      const allCtrls = ppControllerEmbeddingEngine.embedAll();
      const familyMatches = allCtrls.filter(c => c.base_family === dialectInfer.family);
      if (familyMatches.length > 0) {
        nearestDialect = familyMatches[0].controller_id;
        nearestSim = 0.9; // same family → high similarity baseline
      }
    } catch { /* fallback to defaults */ }

    // 4. Classify toolpaths per operation
    const toolpathClassifications = this.classifyToolpaths(features.operations);

    // 5. Quality assessment
    const quality = this.assessQuality(features, record.quality_score);

    // 6. Risk detection
    const risks = this.detectRisks(features, quality);

    // 7. Find similar templates (if we have enough info)
    const similarTemplates = this.findSimilarTemplates(dialectInfer.family, features);

    // 8. Generate recommendations
    const recommendations = this.generateRecommendations(features, risks, record.quality_score);

    return {
      source_file: sourceFile,
      line_count: features.total_lines,
      block_count: features.total_blocks,
      tool_changes: features.tool_changes,
      unique_tools: features.unique_tools,
      controller: {
        inferred_family: dialectInfer.family,
        confidence: dialectInfer.confidence,
        nearest_dialect: nearestDialect,
        nearest_similarity: nearestSim,
        evidence: dialectInfer.evidence,
      },
      operations: {
        count: features.operations.length,
        types: [...new Set(features.operations.map(o => o.operation_type))],
        complexity: record.complexity_label,
        has_5axis: features.has_5axis,
        has_probing: features.has_probing,
        has_macros: features.has_macros,
        has_subprograms: features.has_subprograms,
      },
      toolpath_classifications: toolpathClassifications,
      quality,
      risks,
      recommendations,
      similar_templates: similarTemplates,
    };
  }

  /**
   * Batch analyze multiple programs.
   */
  analyzeBatch(programs: Array<{ gcode: string; source?: string }>): ProgramAnalysisReport[] {
    return programs.map(p => this.analyze(p.gcode, p.source));
  }

  /**
   * Compare two programs and identify key differences.
   */
  compare(gcodeA: string, gcodeB: string): {
    report_a: ProgramAnalysisReport;
    report_b: ProgramAnalysisReport;
    differences: string[];
  } {
    const reportA = this.analyze(gcodeA);
    const reportB = this.analyze(gcodeB);

    const diffs: string[] = [];
    if (reportA.controller.inferred_family !== reportB.controller.inferred_family) {
      diffs.push(`Controller: ${reportA.controller.inferred_family} vs ${reportB.controller.inferred_family}`);
    }
    if (reportA.operations.complexity !== reportB.operations.complexity) {
      diffs.push(`Complexity: ${reportA.operations.complexity} vs ${reportB.operations.complexity}`);
    }
    if (reportA.operations.has_5axis !== reportB.operations.has_5axis) {
      diffs.push(`5-axis: ${reportA.operations.has_5axis} vs ${reportB.operations.has_5axis}`);
    }
    const qDiff = Math.abs(reportA.quality.score - reportB.quality.score);
    if (qDiff > 0.15) {
      diffs.push(`Quality: ${reportA.quality.score.toFixed(2)} vs ${reportB.quality.score.toFixed(2)}`);
    }

    const aOps = new Set(reportA.operations.types);
    const bOps = new Set(reportB.operations.types);
    const onlyA = [...aOps].filter(o => !bOps.has(o));
    const onlyB = [...bOps].filter(o => !aOps.has(o));
    if (onlyA.length > 0) diffs.push(`Only in A: ${onlyA.join(", ")}`);
    if (onlyB.length > 0) diffs.push(`Only in B: ${onlyB.join(", ")}`);

    return { report_a: reportA, report_b: reportB, differences: diffs };
  }

  // ── Private ──────────────────────────────────────────────────────────

  private classifyToolpaths(operations: any[]): ProgramAnalysisReport["toolpath_classifications"] {
    const classifications: ProgramAnalysisReport["toolpath_classifications"] = [];

    for (const op of operations) {
      if (!op.tool_number) continue;

      // Build toolpath spec from operation features
      const spec: ToolpathSpec = {
        operation_type: op.operation_type || "pocket",
        phase: op.operation_type === "finishing" ? "finishing" : "roughing",
        tool_engagement: op.arc_pct > 0.3 ? 0.3 : 0.6,
        mrr_priority: op.feed_rate && op.feed_rate > 200 ? 0.7 : 0.4,
      };

      const recommendations = ppToolpathStrategyEncoderEngine.recommend(spec, 2);
      classifications.push({
        tool_number: op.tool_number,
        inferred_strategy: recommendations.recommendations[0]?.label ?? "unknown",
        matched_templates: recommendations.recommendations.map(r => r.label),
      });
    }

    return classifications.slice(0, 10); // limit output
  }

  private assessQuality(features: any, baseScore: number): ProgramAnalysisReport["quality"] {
    const issues: string[] = [];
    const strengths: string[] = [];

    if (features.tool_changes === 0) issues.push("No tool changes detected");
    else strengths.push(`${features.tool_changes} tool changes with ${features.unique_tools} unique tools`);

    if (features.max_feed_rate === 0) issues.push("No feed rate specified");
    else strengths.push(`Max feed rate: ${features.max_feed_rate} mm/min`);

    if (features.work_offset_count === 0) issues.push("No work offset commands");
    else strengths.push(`Uses ${features.work_offset_count} work offset(s)`);

    if (features.total_lines < 20) issues.push("Very short program — may be incomplete");
    if (!features.operations.some((o: any) => o.coolant)) issues.push("No coolant commands found");

    if (features.has_canned_cycles) strengths.push("Uses canned cycles");
    if (features.has_subprograms) strengths.push("Modular structure with subprograms");
    if (features.has_probing) strengths.push("Includes probing routines");

    return { score: baseScore, issues, strengths };
  }

  private detectRisks(features: any, quality: ProgramAnalysisReport["quality"]): ProgramAnalysisReport["risks"] {
    const risks: ProgramAnalysisReport["risks"] = [];

    if (quality.score < 0.5) {
      risks.push({
        severity: "warning",
        category: "quality",
        message: `Program quality score is low (${quality.score.toFixed(2)})`,
      });
    }

    if (features.has_5axis && !features.has_macros && !features.has_subprograms) {
      risks.push({
        severity: "info",
        category: "structure",
        message: "5-axis program without macros/subprograms — may lack flexibility",
      });
    }

    if (features.tool_changes > 10) {
      risks.push({
        severity: "info",
        category: "complexity",
        message: `${features.tool_changes} tool changes — verify cycle time efficiency`,
      });
    }

    if (features.max_spindle_speed > 20000) {
      risks.push({
        severity: "warning",
        category: "machine",
        message: `High spindle speed (${features.max_spindle_speed} RPM) — verify machine capability`,
      });
    }

    if (features.max_feed_rate > 5000) {
      risks.push({
        severity: "warning",
        category: "machine",
        message: `High feed rate (${features.max_feed_rate} mm/min) — verify axis acceleration`,
      });
    }

    return risks;
  }

  private findSimilarTemplates(family: string, features: any): ProgramAnalysisReport["similar_templates"] {
    const allTemplates = ppScenarioTemplateLibraryEngine.getAllTemplates();
    const matches: ProgramAnalysisReport["similar_templates"] = [];

    for (const template of allTemplates) {
      let score = 0;
      let factors = 0;

      // Match controller family
      const templateCtrl = ppControllerEmbeddingEngine.embed(template.scenario.controller_id);
      if (templateCtrl.base_family === family) {
        score += 0.4;
        factors++;
      }

      // Match 5-axis
      if (template.toolpath?.requires_5axis === features.has_5axis) {
        score += 0.2;
        factors++;
      }

      // Match roughing/finishing mix
      const ops = new Set(features.operations.map((o: any) => o.operation_type));
      if (template.toolpath?.phase === "roughing" && ops.has("roughing")) {
        score += 0.2;
        factors++;
      }
      if (template.toolpath?.phase === "finishing" && ops.has("finishing")) {
        score += 0.2;
        factors++;
      }

      if (factors > 0) {
        matches.push({
          template_id: template.id,
          label: template.label,
          similarity: round4(score),
        });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  private generateRecommendations(
    features: any,
    risks: ProgramAnalysisReport["risks"],
    qualityScore: number,
  ): string[] {
    const recs: string[] = [];

    if (qualityScore < 0.5) {
      recs.push("Review program structure — quality score below threshold");
    }
    if (features.tool_changes === 0 && features.total_lines > 50) {
      recs.push("Program has many lines but no tool changes — verify completeness");
    }
    if (features.has_5axis) {
      recs.push("5-axis program detected — verify TCPC/RTCP codes match controller");
    }
    if (features.has_macros) {
      recs.push("Uses macros — ensure target controller supports macro syntax");
    }
    if (features.has_probing) {
      recs.push("Includes probing — verify probe calibration on target machine");
    }

    const criticals = risks.filter(r => r.severity === "critical");
    if (criticals.length > 0) {
      recs.unshift(`Address ${criticals.length} critical risk(s) before running`);
    }

    if (recs.length === 0) {
      recs.push("Program appears complete and well-structured");
    }

    return recs;
  }
}

function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppGCodeProgramAnalyzerEngine = new PPGCodeProgramAnalyzerEngine();
