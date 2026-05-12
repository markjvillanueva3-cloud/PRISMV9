/**
 * PPAGIProgramLibraryAuditorEngine — Aggregate analysis of G-code program libraries
 *
 * Audits many G-code programs and produces aggregate analytics:
 *   - Controller distribution (how much of each dialect)
 *   - Complexity histogram
 *   - Quality score distribution + below-threshold count
 *   - Operation type breakdown
 *   - Capability flags (5-axis, probing, macros, subprograms)
 *   - Outlier detection (unusual programs by Z-score)
 *   - Simple clustering (controller + complexity + 5-axis)
 *   - Top issues and strengths
 *
 * Useful for shop program library audits, CAM standardization projects,
 * identifying training opportunities, and detecting anomalies.
 *
 * @module PPAGIProgramLibraryAuditorEngine
 */

import { ppGCodeProgramAnalyzerEngine, type ProgramAnalysisReport } from "./PPGCodeProgramAnalyzerEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface LibraryProgram {
  source_file: string;
  gcode: string;
  metadata?: Record<string, unknown>;
}

export interface BatchDistribution<T extends string = string> {
  values: Record<T, number>;
  mode: T | null;
  total: number;
}

export interface BatchOutlier {
  source_file: string;
  reason: string;
  metric: string;
  value: number;
  median: number;
}

export interface SimilarityCluster {
  cluster_id: number;
  members: string[];
  centroid_features: {
    controller: string;
    complexity: string;
    has_5axis: boolean;
    tool_changes_avg: number;
  };
  size: number;
}

export interface LibraryAuditResult {
  total_programs: number;
  successful_analyses: number;
  failed_analyses: number;
  timestamp: number;

  controller_distribution: BatchDistribution;
  complexity_distribution: BatchDistribution;
  operation_type_distribution: BatchDistribution;

  quality_stats: {
    min: number; max: number; mean: number; median: number;
    below_threshold: number;
  };

  line_count_stats: { min: number; max: number; mean: number; median: number };
  tool_change_stats: { min: number; max: number; mean: number; median: number };

  capability_counts: {
    has_5axis: number;
    has_probing: number;
    has_macros: number;
    has_subprograms: number;
  };

  total_risks: number;
  critical_risk_count: number;
  risk_categories: BatchDistribution;

  outliers: BatchOutlier[];
  clusters: SimilarityCluster[];

  top_issues: Array<{ text: string; count: number }>;
  top_strengths: Array<{ text: string; count: number }>;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPAGIProgramLibraryAuditorEngine {
  /**
   * Audit a batch of programs and produce aggregate analysis.
   */
  audit(programs: LibraryProgram[]): LibraryAuditResult {
    const results: Array<{ file: string; report: ProgramAnalysisReport }> = [];
    let failed = 0;

    for (const prog of programs) {
      try {
        const report = ppGCodeProgramAnalyzerEngine.analyze(prog.gcode, prog.source_file);
        results.push({ file: prog.source_file, report });
      } catch {
        failed++;
      }
    }

    return this.aggregate(results, programs.length, failed);
  }

  /**
   * Quick scan — only key metrics, no clustering/outliers.
   */
  quickScan(programs: LibraryProgram[]): Partial<LibraryAuditResult> {
    const results: ProgramAnalysisReport[] = [];
    for (const prog of programs) {
      try {
        results.push(ppGCodeProgramAnalyzerEngine.analyze(prog.gcode, prog.source_file));
      } catch { /* skip failures */ }
    }

    return {
      total_programs: programs.length,
      successful_analyses: results.length,
      failed_analyses: programs.length - results.length,
      timestamp: Date.now(),
      controller_distribution: distribution(results.map(r => r.controller.inferred_family)),
      complexity_distribution: distribution(results.map(r => r.operations.complexity)),
      quality_stats: computeStats(results.map(r => r.quality.score), 0.5),
    };
  }

  /**
   * Find programs similar to a reference.
   */
  findSimilar(
    referenceGcode: string,
    library: LibraryProgram[],
    limit = 5,
  ): Array<{ file: string; similarity_score: number; reasons: string[] }> {
    const refReport = ppGCodeProgramAnalyzerEngine.analyze(referenceGcode);
    const results: Array<{ file: string; similarity_score: number; reasons: string[] }> = [];

    for (const prog of library) {
      try {
        const report = ppGCodeProgramAnalyzerEngine.analyze(prog.gcode, prog.source_file);
        const { score, reasons } = this.compareReports(refReport, report);
        results.push({ file: prog.source_file, similarity_score: score, reasons });
      } catch { /* skip */ }
    }

    return results.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, limit);
  }

  // ── Private ──────────────────────────────────────────────────────────

  private aggregate(
    results: Array<{ file: string; report: ProgramAnalysisReport }>,
    totalCount: number,
    failedCount: number,
  ): LibraryAuditResult {
    const reports = results.map(r => r.report);

    const controllers = distribution(reports.map(r => r.controller.inferred_family));
    const complexities = distribution(reports.map(r => r.operations.complexity));
    const ops = distribution(reports.flatMap(r => r.operations.types));

    const qualities = reports.map(r => r.quality.score);
    const lineCounts = reports.map(r => r.line_count);
    const toolChanges = reports.map(r => r.tool_changes);

    const capabilities = {
      has_5axis: reports.filter(r => r.operations.has_5axis).length,
      has_probing: reports.filter(r => r.operations.has_probing).length,
      has_macros: reports.filter(r => r.operations.has_macros).length,
      has_subprograms: reports.filter(r => r.operations.has_subprograms).length,
    };

    const allRisks = reports.flatMap(r => r.risks);
    const criticalRisks = allRisks.filter(r => r.severity === "critical").length;
    const riskCategories = distribution(allRisks.map(r => r.category));

    const outliers = this.findOutliers(results);
    const clusters = this.clusterPrograms(results);

    const allIssues = reports.flatMap(r => r.quality.issues);
    const allStrengths = reports.flatMap(r => r.quality.strengths);

    return {
      total_programs: totalCount,
      successful_analyses: reports.length,
      failed_analyses: failedCount,
      timestamp: Date.now(),
      controller_distribution: controllers,
      complexity_distribution: complexities,
      operation_type_distribution: ops,
      quality_stats: computeStats(qualities, 0.5),
      line_count_stats: computeStats(lineCounts),
      tool_change_stats: computeStats(toolChanges),
      capability_counts: capabilities,
      total_risks: allRisks.length,
      critical_risk_count: criticalRisks,
      risk_categories: riskCategories,
      outliers,
      clusters,
      top_issues: topN(allIssues, 10),
      top_strengths: topN(allStrengths, 10),
    };
  }

  private findOutliers(results: Array<{ file: string; report: ProgramAnalysisReport }>): BatchOutlier[] {
    const outliers: BatchOutlier[] = [];
    if (results.length < 3) return outliers;

    const lineCounts = results.map(r => r.report.line_count);
    const medianLines = median(lineCounts);
    const meanLines = mean(lineCounts);
    const stdLines = stdDev(lineCounts);

    for (const r of results) {
      const z = stdLines > 0 ? Math.abs(r.report.line_count - meanLines) / stdLines : 0;
      if (z > 2) {
        outliers.push({
          source_file: r.file,
          reason: r.report.line_count > meanLines ? "Unusually large program" : "Unusually small program",
          metric: "line_count",
          value: r.report.line_count,
          median: medianLines,
        });
      }
    }

    const qualities = results.map(r => r.report.quality.score);
    const medianQ = median(qualities);
    for (const r of results) {
      if (r.report.quality.score < medianQ - 0.3) {
        outliers.push({
          source_file: r.file,
          reason: "Unusually low quality score",
          metric: "quality_score",
          value: r.report.quality.score,
          median: medianQ,
        });
      }
    }

    return outliers.slice(0, 20);
  }

  private clusterPrograms(
    results: Array<{ file: string; report: ProgramAnalysisReport }>,
  ): SimilarityCluster[] {
    const clusterMap = new Map<string, Array<{ file: string; report: ProgramAnalysisReport }>>();

    for (const r of results) {
      const key = `${r.report.controller.inferred_family}__${r.report.operations.complexity}__${r.report.operations.has_5axis ? "5ax" : "3ax"}`;
      if (!clusterMap.has(key)) clusterMap.set(key, []);
      clusterMap.get(key)!.push(r);
    }

    const clusters: SimilarityCluster[] = [];
    let id = 0;
    for (const [_, members] of clusterMap) {
      if (members.length < 2) continue;
      const first = members[0].report;
      clusters.push({
        cluster_id: id++,
        members: members.map(m => m.file),
        centroid_features: {
          controller: first.controller.inferred_family,
          complexity: first.operations.complexity,
          has_5axis: first.operations.has_5axis,
          tool_changes_avg: round2(mean(members.map(m => m.report.tool_changes))),
        },
        size: members.length,
      });
    }

    return clusters.sort((a, b) => b.size - a.size);
  }

  private compareReports(a: ProgramAnalysisReport, b: ProgramAnalysisReport): {
    score: number; reasons: string[];
  } {
    let score = 0;
    const reasons: string[] = [];

    if (a.controller.inferred_family === b.controller.inferred_family) {
      score += 0.25;
      reasons.push("same controller family");
    }
    if (a.operations.complexity === b.operations.complexity) {
      score += 0.2;
      reasons.push(`same complexity: ${a.operations.complexity}`);
    }
    if (a.operations.has_5axis === b.operations.has_5axis) score += 0.15;

    const opsA = new Set(a.operations.types);
    const opsB = new Set(b.operations.types);
    const overlap = [...opsA].filter(o => opsB.has(o)).length;
    const union = new Set([...opsA, ...opsB]).size;
    if (union > 0) {
      const jaccard = overlap / union;
      score += jaccard * 0.2;
      if (jaccard > 0.5) reasons.push("similar operation mix");
    }

    const toolDelta = Math.abs(a.tool_changes - b.tool_changes);
    const toolSim = Math.max(0, 1 - toolDelta / Math.max(a.tool_changes, b.tool_changes, 1));
    score += toolSim * 0.1;

    const qDelta = Math.abs(a.quality.score - b.quality.score);
    score += (1 - qDelta) * 0.1;

    return { score: round4(score), reasons };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function distribution<T extends string>(values: T[]): BatchDistribution<T> {
  const counts = {} as Record<T, number>;
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  let mode: T | null = null;
  let maxCount = 0;
  for (const [k, c] of Object.entries(counts) as [T, number][]) {
    if (c > maxCount) { mode = k; maxCount = c; }
  }
  return { values: counts, mode, total: values.length };
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function computeStats(arr: number[], belowThreshold?: number) {
  if (arr.length === 0) return { min: 0, max: 0, mean: 0, median: 0, below_threshold: 0 };
  return {
    min: round4(Math.min(...arr)),
    max: round4(Math.max(...arr)),
    mean: round4(mean(arr)),
    median: round4(median(arr)),
    below_threshold: belowThreshold !== undefined ? arr.filter(v => v < belowThreshold).length : 0,
  };
}

function topN(values: string[], n: number): Array<{ text: string; count: number }> {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([text, count]) => ({ text, count }));
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppAGIProgramLibraryAuditorEngine = new PPAGIProgramLibraryAuditorEngine();
