/**
 * CAMAnalyzeEngine — CAM Operation Analysis
 * ==========================================
 *
 * Analyzes CAM operations for efficiency, safety,
 * and optimization opportunities.
 *
 * L2-P4-MS1/P0-U03 — Batch 6: CAM Export
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const OperationAnalysisSchema = z.object({
  id: z.string(),
  operationName: z.string(),
  operationType: z.string(),
  metrics: z.object({
    totalDistance: z.number(),
    cuttingDistance: z.number(),
    rapidDistance: z.number(),
    airCuttingTime: z.number(),
    cuttingTime: z.number(),
    totalTime: z.number(),
    efficiency: z.number(),
    mrrAvg: z.number().optional(),
    mrrMax: z.number().optional(),
  }),
  toolEngagement: z.object({
    avgRadialEngagement: z.number(),
    maxRadialEngagement: z.number(),
    avgAxialEngagement: z.number(),
    maxAxialEngagement: z.number(),
    engagementVariation: z.number(),
  }),
  issues: z.array(z.object({
    type: z.enum(["warning", "optimization", "safety"]),
    code: z.string(),
    message: z.string(),
    location: z.string().optional(),
    suggestion: z.string().optional(),
  })),
  score: z.object({
    overall: z.number(),
    efficiency: z.number(),
    safety: z.number(),
    quality: z.number(),
  }),
  analyzedAt: z.string(),
});

export const ToolpathInputSchema = z.object({
  name: z.string(),
  type: z.string(),
  toolDiameter: z.number(),
  spindleSpeed: z.number(),
  feedRate: z.number(),
  stepover: z.number(),
  stepdown: z.number(),
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    type: z.enum(["rapid", "linear", "arc"]),
  })),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type OperationAnalysis = z.infer<typeof OperationAnalysisSchema>;
export type ToolpathInput = z.infer<typeof ToolpathInputSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const analyses: Map<string, OperationAnalysis> = new Map();
let analysisCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class CAMAnalyzeEngine {
  /**
   * Analyze CAM operation
   */
  static analyze(toolpath: ToolpathInput): OperationAnalysis {
    const metrics = this.calculateMetrics(toolpath);
    const toolEngagement = this.analyzeToolEngagement(toolpath);
    const issues = this.detectIssues(toolpath, metrics, toolEngagement);
    const score = this.calculateScore(metrics, toolEngagement, issues);

    const analysis: OperationAnalysis = {
      id: `ANA-${++analysisCounter}`,
      operationName: toolpath.name,
      operationType: toolpath.type,
      metrics,
      toolEngagement,
      issues,
      score,
      analyzedAt: new Date().toISOString(),
    };

    analyses.set(analysis.id, analysis);
    return analysis;
  }

  /**
   * Calculate operation metrics
   */
  private static calculateMetrics(toolpath: ToolpathInput): OperationAnalysis["metrics"] {
    let totalDistance = 0;
    let cuttingDistance = 0;
    let rapidDistance = 0;

    const points = toolpath.points;
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const dist = Math.sqrt(
        (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2
      );

      totalDistance += dist;
      if (p2.type === "rapid") {
        rapidDistance += dist;
      } else {
        cuttingDistance += dist;
      }
    }

    // Calculate times (mm/min to minutes)
    const rapidRate = 10000; // mm/min typical rapid
    const cuttingTime = cuttingDistance / toolpath.feedRate;
    const rapidTime = rapidDistance / rapidRate;
    const totalTime = cuttingTime + rapidTime;

    // Air cutting time (rapid moves while Z is below work surface)
    let airCuttingTime = 0;
    let maxZ = Math.max(...points.map(p => p.z));
    for (let i = 1; i < points.length; i++) {
      if (points[i].type === "rapid" && points[i].z < maxZ * 0.9) {
        const dist = Math.sqrt(
          (points[i].x - points[i - 1].x) ** 2 +
          (points[i].y - points[i - 1].y) ** 2 +
          (points[i].z - points[i - 1].z) ** 2
        );
        airCuttingTime += dist / rapidRate;
      }
    }

    const efficiency = totalTime > 0 ? (cuttingTime / totalTime) * 100 : 0;

    // MRR calculation
    const mrrAvg = toolpath.stepover * toolpath.stepdown * toolpath.feedRate;
    const mrrMax = toolpath.toolDiameter * toolpath.stepdown * toolpath.feedRate;

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      cuttingDistance: Math.round(cuttingDistance * 100) / 100,
      rapidDistance: Math.round(rapidDistance * 100) / 100,
      airCuttingTime: Math.round(airCuttingTime * 100) / 100,
      cuttingTime: Math.round(cuttingTime * 100) / 100,
      totalTime: Math.round(totalTime * 100) / 100,
      efficiency: Math.round(efficiency * 10) / 10,
      mrrAvg: Math.round(mrrAvg),
      mrrMax: Math.round(mrrMax),
    };
  }

  /**
   * Analyze tool engagement
   */
  private static analyzeToolEngagement(toolpath: ToolpathInput): OperationAnalysis["toolEngagement"] {
    const radialEngagement = toolpath.stepover / toolpath.toolDiameter;
    const axialEngagement = toolpath.stepdown / toolpath.toolDiameter;

    // Simplified engagement variation analysis
    const engagementVariation = 0.1; // Would analyze actual path for real variation

    return {
      avgRadialEngagement: Math.round(radialEngagement * 100) / 100,
      maxRadialEngagement: Math.round(radialEngagement * 1.2 * 100) / 100,
      avgAxialEngagement: Math.round(axialEngagement * 100) / 100,
      maxAxialEngagement: Math.round(axialEngagement * 1.1 * 100) / 100,
      engagementVariation: Math.round(engagementVariation * 100) / 100,
    };
  }

  /**
   * Detect issues and optimization opportunities
   */
  private static detectIssues(
    toolpath: ToolpathInput,
    metrics: OperationAnalysis["metrics"],
    engagement: OperationAnalysis["toolEngagement"]
  ): OperationAnalysis["issues"] {
    const issues: OperationAnalysis["issues"] = [];

    // Efficiency issues
    if (metrics.efficiency < 50) {
      issues.push({
        type: "optimization",
        code: "LOW_EFFICIENCY",
        message: `Low cutting efficiency: ${metrics.efficiency}%`,
        suggestion: "Consider reducing rapid moves or optimizing entry/exit paths",
      });
    }

    // Engagement issues
    if (engagement.maxRadialEngagement > 0.6) {
      issues.push({
        type: "warning",
        code: "HIGH_RADIAL_ENGAGEMENT",
        message: `High radial engagement: ${(engagement.maxRadialEngagement * 100).toFixed(0)}%`,
        suggestion: "Reduce stepover or use adaptive clearing",
      });
    }

    if (engagement.maxAxialEngagement > 1.5) {
      issues.push({
        type: "safety",
        code: "HIGH_AXIAL_ENGAGEMENT",
        message: `Axial engagement exceeds recommended: ${engagement.maxAxialEngagement}xD`,
        suggestion: "Reduce stepdown or verify tool rigidity",
      });
    }

    // Speed/feed issues
    const sfm = (Math.PI * toolpath.toolDiameter * toolpath.spindleSpeed) / 1000;
    if (sfm > 300 && toolpath.type.includes("steel")) {
      issues.push({
        type: "warning",
        code: "HIGH_SFM",
        message: `Surface speed ${sfm.toFixed(0)} m/min may be high for steel`,
        suggestion: "Verify tool material and coating support this speed",
      });
    }

    // Air cutting
    if (metrics.airCuttingTime > metrics.cuttingTime * 0.1) {
      issues.push({
        type: "optimization",
        code: "EXCESSIVE_AIR_CUTTING",
        message: "Significant air cutting detected",
        suggestion: "Optimize rapid positions and approach strategies",
      });
    }

    return issues;
  }

  /**
   * Calculate overall score
   */
  private static calculateScore(
    metrics: OperationAnalysis["metrics"],
    engagement: OperationAnalysis["toolEngagement"],
    issues: OperationAnalysis["issues"]
  ): OperationAnalysis["score"] {
    // Efficiency score (0-100)
    const efficiencyScore = Math.min(100, metrics.efficiency * 1.5);

    // Safety score
    let safetyScore = 100;
    for (const issue of issues) {
      if (issue.type === "safety") safetyScore -= 20;
      else if (issue.type === "warning") safetyScore -= 5;
    }
    safetyScore = Math.max(0, safetyScore);

    // Quality score (based on engagement consistency)
    const qualityScore = Math.max(0, 100 - engagement.engagementVariation * 100);

    // Overall
    const overall = (efficiencyScore * 0.4 + safetyScore * 0.4 + qualityScore * 0.2);

    return {
      overall: Math.round(overall),
      efficiency: Math.round(efficiencyScore),
      safety: Math.round(safetyScore),
      quality: Math.round(qualityScore),
    };
  }

  /**
   * Compare multiple operations
   */
  static compare(analyses: OperationAnalysis[]): {
    best: string;
    comparison: { id: string; name: string; score: number; efficiency: number }[];
    recommendation: string;
  } {
    const comparison = analyses.map(a => ({
      id: a.id,
      name: a.operationName,
      score: a.score.overall,
      efficiency: a.metrics.efficiency,
    })).sort((a, b) => b.score - a.score);

    const best = comparison[0];
    let recommendation = `${best.name} has the highest overall score (${best.score})`;

    if (comparison.length > 1) {
      const efficiencyBest = [...comparison].sort((a, b) => b.efficiency - a.efficiency)[0];
      if (efficiencyBest.id !== best.id) {
        recommendation += `. However, ${efficiencyBest.name} has better efficiency (${efficiencyBest.efficiency}%)`;
      }
    }

    return { best: best.id, comparison, recommendation };
  }

  /**
   * Get analysis by ID
   */
  static getAnalysis(id: string): OperationAnalysis | undefined {
    return analyses.get(id);
  }

  static getSelfAwareness() {
    return {
      name: "CAMAnalyzeEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      capabilities: ["analyze", "compare", "getAnalysis"],
      metrics: ["totalDistance", "cuttingDistance", "rapidDistance", "efficiency", "mrr"],
      issueTypes: ["warning", "optimization", "safety"],
      dependencies: [],
    };
  }
}

export const camAnalyzeEngine = new CAMAnalyzeEngine();
