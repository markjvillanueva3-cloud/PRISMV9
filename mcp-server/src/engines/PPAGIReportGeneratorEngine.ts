/**
 * PPAGIReportGeneratorEngine — Human-readable markdown reports
 *
 * Converts PP-AGI analysis results into formatted markdown reports suitable
 * for shop floor operators, managers, or stakeholders. Each report type is
 * structured for specific audiences and use cases.
 *
 * Report types:
 *   - Job advice report (for operators planning a job)
 *   - Program analysis report (for reviewing existing programs)
 *   - Library audit report (for managers auditing a program library)
 *   - Uncertainty report (for engineers assessing risk)
 *   - Dashboard report (for IT/admin monitoring system health)
 *
 * All reports include: context, findings, recommendations, next steps.
 *
 * @module PPAGIReportGeneratorEngine
 */

import type { JobAdvice } from "./PPJobScenarioAdvisorEngine.js";
import type { ProgramAnalysisReport } from "./PPGCodeProgramAnalyzerEngine.js";
import type { LibraryAuditResult } from "./PPAGIProgramLibraryAuditorEngine.js";
import type { SystemDashboard } from "./PPAGISystemDashboardEngine.js";
import type { WorkflowResult } from "./PPAGIReasoningWorkflowEngine.js";

// ── Engine ─────────────────────────────────────────────────────────────

export class PPAGIReportGeneratorEngine {
  /**
   * Generate a markdown report from a JobAdvice result.
   */
  jobAdviceReport(advice: JobAdvice): string {
    const lines: string[] = [];
    lines.push(`# Job Advice Report`);
    lines.push(`**Job ID:** ${advice.job_id}`);
    lines.push(`**Confidence:** ${(advice.confidence * 100).toFixed(0)}% — **${advice.recommendation.toUpperCase()}**`);
    lines.push(``);
    lines.push(`## Summary`);
    lines.push(advice.summary);
    lines.push(``);

    lines.push(`## Controller Advice`);
    lines.push(`- Dialect family: \`${advice.controller_advice.dialect_family}\``);
    lines.push(`- Safe start: \`${advice.controller_advice.safe_start}\``);
    lines.push(`- Tool change: ${advice.controller_advice.tool_change_sequence.map(t => `\`${t}\``).join(" → ")}`);
    lines.push(`- Coolant codes: ${advice.controller_advice.coolant_codes}`);
    if (advice.controller_advice.similar_controllers.length > 0) {
      lines.push(`- Similar controllers:`);
      for (const c of advice.controller_advice.similar_controllers) {
        lines.push(`  - ${c.id} (${(c.similarity * 100).toFixed(0)}% similar)`);
      }
    }
    lines.push(``);

    if (advice.machine_advice.best_match) {
      lines.push(`## Machine Compatibility`);
      lines.push(`- Best match: **${advice.machine_advice.best_match.name}** (${(advice.machine_advice.best_match.similarity * 100).toFixed(0)}% similar)`);
      if (advice.machine_advice.compatibility_notes.length > 0) {
        lines.push(`- Notes:`);
        for (const n of advice.machine_advice.compatibility_notes) lines.push(`  - ${n}`);
      }
      lines.push(``);
    }

    lines.push(`## Material`);
    lines.push(`- Substitution safe: ${advice.material_advice.substitution_safe ? "✓ YES" : "✗ NO — verify parameters"}`);
    if (advice.material_advice.warnings.length > 0) {
      lines.push(`- Warnings:`);
      for (const w of advice.material_advice.warnings) lines.push(`  - ⚠ ${w}`);
    }
    if (advice.material_advice.similar_materials.length > 0) {
      lines.push(`- Similar materials:`);
      for (const m of advice.material_advice.similar_materials) {
        lines.push(`  - ${m.name} (${(m.similarity * 100).toFixed(0)}%)`);
      }
    }
    lines.push(``);

    if (advice.toolpath_advice.recommended_strategies.length > 0) {
      lines.push(`## Recommended Strategies`);
      for (const s of advice.toolpath_advice.recommended_strategies) {
        lines.push(`- ${s.label} (${(s.similarity * 100).toFixed(0)}% match)`);
      }
      lines.push(``);
    }

    if (advice.risks.length > 0) {
      lines.push(`## Risks (${advice.risks.length})`);
      for (const r of advice.risks) {
        const icon = r.severity === "critical" ? "🔴" : r.severity === "warning" ? "🟡" : "ℹ️";
        lines.push(`- ${icon} **${r.domain}/${r.severity}**: ${r.message}`);
      }
      lines.push(``);
    }

    lines.push(`## Risk Narrative`);
    lines.push(advice.explanation.risk_narrative);
    lines.push(``);

    if (advice.explanation.analogies.length > 0) {
      lines.push(`## Analogies`);
      for (const a of advice.explanation.analogies) lines.push(`- ${a}`);
      lines.push(``);
    }

    lines.push(`## Next Actions`);
    for (const a of advice.next_actions) lines.push(`- [ ] ${a}`);
    lines.push(``);

    if (advice.queued_for_review) {
      lines.push(`> ⚠ Queued for expert review: \`${advice.queued_for_review}\``);
      lines.push(``);
    }

    lines.push(`_Tracker ID: \`${advice.tracker_id}\`_`);

    return lines.join("\n");
  }

  /**
   * Generate a markdown report from a ProgramAnalysisReport.
   */
  programAnalysisReport(report: ProgramAnalysisReport): string {
    const lines: string[] = [];
    lines.push(`# G-Code Program Analysis`);
    if (report.source_file) lines.push(`**Source:** \`${report.source_file}\``);
    lines.push(`**Quality:** ${(report.quality.score * 100).toFixed(0)}/100`);
    lines.push(``);

    lines.push(`## Program Metrics`);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Lines | ${report.line_count} |`);
    lines.push(`| Blocks | ${report.block_count} |`);
    lines.push(`| Tool changes | ${report.tool_changes} |`);
    lines.push(`| Unique tools | ${report.unique_tools} |`);
    lines.push(`| Operations | ${report.operations.count} |`);
    lines.push(`| Complexity | ${report.operations.complexity} |`);
    lines.push(``);

    lines.push(`## Controller Inference`);
    lines.push(`- Family: **${report.controller.inferred_family}** (confidence: ${(report.controller.confidence * 100).toFixed(0)}%)`);
    lines.push(`- Nearest dialect: \`${report.controller.nearest_dialect}\``);
    if (report.controller.evidence.length > 0) {
      lines.push(`- Evidence:`);
      for (const e of report.controller.evidence) lines.push(`  - ${e}`);
    }
    lines.push(``);

    lines.push(`## Operation Types`);
    for (const t of report.operations.types) lines.push(`- ${t}`);
    lines.push(``);

    lines.push(`## Capabilities`);
    lines.push(`- 5-axis: ${report.operations.has_5axis ? "✓" : "✗"}`);
    lines.push(`- Probing: ${report.operations.has_probing ? "✓" : "✗"}`);
    lines.push(`- Macros: ${report.operations.has_macros ? "✓" : "✗"}`);
    lines.push(`- Subprograms: ${report.operations.has_subprograms ? "✓" : "✗"}`);
    lines.push(``);

    if (report.quality.issues.length > 0) {
      lines.push(`## Issues (${report.quality.issues.length})`);
      for (const i of report.quality.issues) lines.push(`- ⚠ ${i}`);
      lines.push(``);
    }

    if (report.quality.strengths.length > 0) {
      lines.push(`## Strengths`);
      for (const s of report.quality.strengths) lines.push(`- ✓ ${s}`);
      lines.push(``);
    }

    if (report.risks.length > 0) {
      lines.push(`## Risks`);
      for (const r of report.risks) {
        const icon = r.severity === "critical" ? "🔴" : r.severity === "warning" ? "🟡" : "ℹ️";
        lines.push(`- ${icon} [${r.category}] ${r.message}`);
      }
      lines.push(``);
    }

    if (report.similar_templates.length > 0) {
      lines.push(`## Similar Known-Good Templates`);
      for (const t of report.similar_templates) {
        lines.push(`- ${t.label} (${(t.similarity * 100).toFixed(0)}%)`);
      }
      lines.push(``);
    }

    lines.push(`## Recommendations`);
    for (const r of report.recommendations) lines.push(`- ${r}`);

    return lines.join("\n");
  }

  /**
   * Generate a markdown report from a LibraryAuditResult.
   */
  libraryAuditReport(audit: LibraryAuditResult): string {
    const lines: string[] = [];
    lines.push(`# Program Library Audit`);
    lines.push(`**Generated:** ${new Date(audit.timestamp).toISOString()}`);
    lines.push(`**Programs:** ${audit.successful_analyses}/${audit.total_programs} analyzed`);
    if (audit.failed_analyses > 0) lines.push(`**⚠ Failed:** ${audit.failed_analyses}`);
    lines.push(``);

    lines.push(`## Controller Distribution`);
    for (const [k, v] of Object.entries(audit.controller_distribution.values)) {
      const pct = audit.controller_distribution.total > 0
        ? ((v / audit.controller_distribution.total) * 100).toFixed(0) : "0";
      lines.push(`- ${k}: ${v} programs (${pct}%)`);
    }
    if (audit.controller_distribution.mode) {
      lines.push(`- **Mode:** ${audit.controller_distribution.mode}`);
    }
    lines.push(``);

    lines.push(`## Complexity Distribution`);
    for (const [k, v] of Object.entries(audit.complexity_distribution.values)) {
      lines.push(`- ${k}: ${v}`);
    }
    lines.push(``);

    lines.push(`## Quality Statistics`);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Min | ${audit.quality_stats.min.toFixed(2)} |`);
    lines.push(`| Max | ${audit.quality_stats.max.toFixed(2)} |`);
    lines.push(`| Mean | ${audit.quality_stats.mean.toFixed(2)} |`);
    lines.push(`| Median | ${audit.quality_stats.median.toFixed(2)} |`);
    lines.push(`| Below 0.5 | ${audit.quality_stats.below_threshold} |`);
    lines.push(``);

    lines.push(`## Capabilities (across ${audit.successful_analyses} programs)`);
    lines.push(`- 5-axis programs: ${audit.capability_counts.has_5axis}`);
    lines.push(`- Programs with probing: ${audit.capability_counts.has_probing}`);
    lines.push(`- Programs with macros: ${audit.capability_counts.has_macros}`);
    lines.push(`- Programs with subprograms: ${audit.capability_counts.has_subprograms}`);
    lines.push(``);

    if (audit.critical_risk_count > 0) {
      lines.push(`## ⚠ Critical Risks: ${audit.critical_risk_count}`);
      lines.push(``);
    }

    if (audit.clusters.length > 0) {
      lines.push(`## Program Clusters`);
      for (const c of audit.clusters.slice(0, 5)) {
        lines.push(`### Cluster ${c.cluster_id}: ${c.size} programs`);
        lines.push(`- Controller: ${c.centroid_features.controller}`);
        lines.push(`- Complexity: ${c.centroid_features.complexity}`);
        lines.push(`- 5-axis: ${c.centroid_features.has_5axis}`);
        lines.push(`- Avg tool changes: ${c.centroid_features.tool_changes_avg}`);
        lines.push(`- Members: ${c.members.slice(0, 5).join(", ")}${c.members.length > 5 ? `...+${c.members.length - 5}` : ""}`);
        lines.push(``);
      }
    }

    if (audit.outliers.length > 0) {
      lines.push(`## Outliers (${audit.outliers.length})`);
      for (const o of audit.outliers.slice(0, 10)) {
        lines.push(`- \`${o.source_file}\`: ${o.reason} (${o.metric}=${o.value}, median=${o.median})`);
      }
      lines.push(``);
    }

    if (audit.top_issues.length > 0) {
      lines.push(`## Top Issues`);
      for (const i of audit.top_issues.slice(0, 5)) {
        lines.push(`- ${i.text} (${i.count}×)`);
      }
      lines.push(``);
    }

    if (audit.top_strengths.length > 0) {
      lines.push(`## Top Strengths`);
      for (const s of audit.top_strengths.slice(0, 5)) {
        lines.push(`- ${s.text} (${s.count}×)`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Generate a markdown report from a SystemDashboard.
   */
  dashboardReport(dashboard: SystemDashboard): string {
    const lines: string[] = [];
    const healthIcon = dashboard.health === "healthy" ? "✓" : dashboard.health === "degraded" ? "⚠" : "✗";
    lines.push(`# PP-AGI System Dashboard`);
    lines.push(`**Status:** ${healthIcon} ${dashboard.health.toUpperCase()}`);
    lines.push(`**Version:** ${dashboard.version}`);
    lines.push(`**Generated:** ${new Date(dashboard.timestamp).toISOString()}`);
    lines.push(``);

    lines.push(`## Embedding Engines (${dashboard.capabilities.total_embedding_engines} total, ${dashboard.capabilities.total_embedding_dimensions} dims)`);
    const emb = dashboard.embeddings;
    lines.push(`| Engine | Dimension | Known Items |`);
    lines.push(`|--------|-----------|-------------|`);
    lines.push(`| Controller | ${emb.controller.dimension} | ${emb.controller.known_items} |`);
    lines.push(`| Machine | ${emb.machine.dimension} | ${emb.machine.known_items} |`);
    lines.push(`| Material | ${emb.material.dimension} | ${emb.material.known_items} |`);
    lines.push(`| Tool | ${emb.tool.dimension} | ${emb.tool.known_items} |`);
    lines.push(`| Physics | ${emb.physics.dimension} | stateless |`);
    lines.push(`| Safety | ${emb.safety.dimension} | stateless |`);
    lines.push(`| Toolpath | ${emb.toolpath.dimension} | ${emb.toolpath.known_items} |`);
    lines.push(`| **Fused (combined)** | **${emb.fused_total}** | — |`);
    lines.push(``);

    lines.push(`## Learning State`);
    const al = dashboard.learning.active_queue;
    lines.push(`### Active Learning Queue`);
    lines.push(`- Total: ${al.total}, Pending: ${al.pending}, Labeled: ${al.labeled}`);
    if (al.oldest_pending_hours > 0) {
      lines.push(`- Oldest pending: ${al.oldest_pending_hours.toFixed(1)} hours`);
    }
    lines.push(``);

    const ot = dashboard.learning.online_tracker;
    lines.push(`### Online Learning Tracker`);
    lines.push(`- Total predictions: ${ot.total_predictions}`);
    lines.push(`- Overall accuracy: ${(ot.overall_accuracy * 100).toFixed(0)}%`);
    lines.push(`- Calibration error: ${(ot.calibration * 100).toFixed(0)}%`);
    if (ot.drift_alert_count > 0) {
      lines.push(`- ⚠ Drift alerts: ${ot.drift_alert_count}`);
    }
    lines.push(``);

    const tp = dashboard.learning.training_pipeline;
    lines.push(`### Training Pipeline`);
    lines.push(`- Programs processed: ${tp.programs_processed}`);
    lines.push(`- Lines parsed: ${tp.total_lines}`);
    lines.push(`- Operations: ${tp.total_operations}`);
    lines.push(``);

    lines.push(`## Knowledge`);
    const k = dashboard.knowledge.templates;
    lines.push(`- Templates: ${k.total}`);
    lines.push(`- Avg success rate: ${(k.avg_success_rate * 100).toFixed(0)}%`);
    lines.push(``);

    lines.push(`## System Capabilities`);
    const cap = dashboard.capabilities;
    lines.push(`- G-code analysis: ${cap.can_analyze_gcode ? "✓" : "✗"}`);
    lines.push(`- Uncertainty scoring: ${cap.can_score_uncertainty ? "✓" : "✗"}`);
    lines.push(`- Decision explanation: ${cap.can_explain_decisions ? "✓" : "✗"}`);
    lines.push(`- Learning from feedback: ${cap.can_learn_from_feedback ? "✓" : "✗"}`);

    return lines.join("\n");
  }

  /**
   * Generate a markdown report from a WorkflowResult.
   */
  workflowReport(workflow: WorkflowResult): string {
    const lines: string[] = [];
    lines.push(`# Workflow Report: ${workflow.workflow_type}`);
    lines.push(`**ID:** ${workflow.workflow_id}`);
    lines.push(`**Duration:** ${workflow.total_latency_ms}ms`);
    lines.push(`**Confidence:** ${(workflow.overall_confidence * 100).toFixed(0)}%`);
    lines.push(``);

    lines.push(`## Recommendation`);
    lines.push(`> ${workflow.recommendation}`);
    lines.push(``);

    lines.push(`## Execution Trace`);
    for (const step of workflow.steps) {
      lines.push(`### Step ${step.step}: ${step.name}`);
      lines.push(`- Engine: \`${step.engine}\``);
      lines.push(`- Latency: ${step.latency_ms}ms`);
      lines.push(`- Result: ${step.result_summary}`);
      lines.push(``);
    }

    return lines.join("\n");
  }

  /**
   * Generate a compact executive summary (1-paragraph) from any advice result.
   */
  executiveSummary(advice: JobAdvice): string {
    const confPct = (advice.confidence * 100).toFixed(0);
    const riskStr = advice.risks.length > 0
      ? `${advice.risks.length} risk(s) identified (${advice.risks.filter(r => r.severity === "critical").length} critical)`
      : "no risks identified";
    return `Scenario ${advice.scenario?.controller_id ?? "unknown"} + ${advice.scenario?.machine_id ?? "unknown"} + ${advice.scenario?.material_id ?? "unknown"}: ` +
      `${confPct}% confidence, recommendation **${advice.recommendation}**, ${riskStr}. ` +
      (advice.queued_for_review ? "Queued for expert review. " : "") +
      `${advice.next_actions[0] ?? ""}`.trim();
  }
}

export const ppAGIReportGeneratorEngine = new PPAGIReportGeneratorEngine();
