/**
 * LatheMasterPostEnsembleCrossCheckEngine — Ensemble Validation for Master Post
 *
 * U-LTH29: When two or more sub-posts could serve a job, runs all viable posts,
 * compares outputs, and flags divergence > 10% block-count or > 5% cycle-time.
 *
 * Architecture:
 *   [Job Request] → [Candidate Posts] → [Parallel Execution]
 *     → [Output Comparison] → [Divergence Analysis] → [Consensus/Warning]
 *
 * Use cases:
 *   1. Validate new posts against established ones
 *   2. Cross-check controller-family posts (e.g., fanuc vs siemens ISO dialect)
 *   3. Detect drift in post behavior over time
 *   4. Ambiguous machine routing verification
 *
 * @module LatheMasterPostEnsembleCrossCheckEngine
 */

import type { MasterPostRouteRequest, RouteDecision } from "./LatheMasterPostRouterEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Result from a single post execution */
export interface PostExecutionResult {
  post_id: string;
  success: boolean;
  gcode: string;
  block_count: number;
  cycle_time_estimate_s: number;
  execution_time_ms: number;
  warnings: string[];
  errors: string[];
}

/** Divergence between two post outputs */
export interface DivergenceMetrics {
  post_a: string;
  post_b: string;
  block_count_delta: number;
  block_count_delta_pct: number;
  cycle_time_delta_s: number;
  cycle_time_delta_pct: number;
  content_similarity: number;
  line_differences: number;
  critical_differences: CriticalDifference[];
}

/** Critical difference that needs attention */
export interface CriticalDifference {
  type: "motion" | "spindle" | "feed" | "tool" | "coolant" | "coordinate" | "cycle";
  line_number_a: number;
  line_number_b: number;
  content_a: string;
  content_b: string;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
}

/** Result of ensemble cross-check */
export interface EnsembleCrossCheckResult {
  check_id: string;
  request_summary: string;
  posts_executed: string[];
  execution_results: PostExecutionResult[];
  divergences: DivergenceMetrics[];
  overall_consensus: boolean;
  consensus_confidence: number;
  recommended_post: string;
  recommendation_reason: string;
  warnings: string[];
  flags: EnsembleFlag[];
  total_execution_time_ms: number;
}

/** Flag raised during cross-check */
export interface EnsembleFlag {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  affected_posts: string[];
}

/** Thresholds for divergence detection */
export interface DivergenceThresholds {
  block_count_pct: number;
  cycle_time_pct: number;
  content_similarity_min: number;
  max_critical_differences: number;
}

/** Candidate post for ensemble execution */
interface CandidatePost {
  post_id: string;
  controller_family: string;
  priority: number;
  reason: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheMasterPostEnsembleCrossCheckEngine {
  private checkCounter = 0;

  /** Default thresholds */
  private readonly defaultThresholds: DivergenceThresholds = {
    block_count_pct: 10,
    cycle_time_pct: 5,
    content_similarity_min: 0.85,
    max_critical_differences: 3
  };

  /** Controller families that can be cross-checked */
  private readonly crossCheckableGroups: string[][] = [
    ["fanuc", "haas"], // Similar ISO dialect
    ["okuma", "mazak"], // Japanese controllers
    ["siemens"], // Sinumerik standalone
    ["generic"] // Fallback
  ];

  /**
   * Run ensemble cross-check on a job request
   */
  crossCheck(
    request: MasterPostRouteRequest,
    candidatePosts: string[],
    thresholds?: Partial<DivergenceThresholds>
  ): EnsembleCrossCheckResult {
    const startTime = Date.now();
    const checkId = `ensemble_${++this.checkCounter}_${Date.now()}`;
    const mergedThresholds = { ...this.defaultThresholds, ...thresholds };

    // Execute all candidate posts
    const executionResults = candidatePosts.map(postId =>
      this.executePost(request, postId)
    );

    // Calculate divergences between all pairs
    const divergences = this.calculateAllDivergences(executionResults);

    // Analyze for flags
    const flags = this.analyzeFlags(divergences, mergedThresholds);

    // Determine consensus
    const consensus = this.determineConsensus(executionResults, divergences, mergedThresholds);

    // Select recommended post
    const recommendation = this.selectRecommendedPost(executionResults, divergences);

    return {
      check_id: checkId,
      request_summary: this.summarizeRequest(request),
      posts_executed: candidatePosts,
      execution_results: executionResults,
      divergences,
      overall_consensus: consensus.hasConsensus,
      consensus_confidence: consensus.confidence,
      recommended_post: recommendation.post_id,
      recommendation_reason: recommendation.reason,
      warnings: this.generateWarnings(divergences, flags, mergedThresholds),
      flags,
      total_execution_time_ms: Date.now() - startTime
    };
  }

  /**
   * Check if two specific posts are compatible (within thresholds)
   */
  compareTwoPosts(
    request: MasterPostRouteRequest,
    postA: string,
    postB: string,
    thresholds?: Partial<DivergenceThresholds>
  ): {
    compatible: boolean;
    divergence: DivergenceMetrics;
    recommendation: string;
  } {
    const mergedThresholds = { ...this.defaultThresholds, ...thresholds };

    const resultA = this.executePost(request, postA);
    const resultB = this.executePost(request, postB);

    const divergence = this.calculateDivergence(resultA, resultB);

    const compatible = this.isWithinThresholds(divergence, mergedThresholds);

    const recommendation = compatible
      ? `Both posts are compatible. Prefer ${resultA.cycle_time_estimate_s <= resultB.cycle_time_estimate_s ? postA : postB} for shorter cycle time.`
      : `Posts diverge significantly. Review differences before selecting.`;

    return {
      compatible,
      divergence,
      recommendation
    };
  }

  /**
   * Find all viable candidate posts for a request
   */
  findCandidatePosts(request: MasterPostRouteRequest): CandidatePost[] {
    const candidates: CandidatePost[] = [];

    // Known controller families and their posts
    const controllerPosts: Record<string, string> = {
      okuma: "okuma_turning",
      fanuc: "fanuc_turning",
      haas: "haas_turning",
      mazak: "mazak_turning",
      siemens: "siemens_turning",
      generic: "generic_turning"
    };

    // Add primary post based on controller
    const primaryController = request.controller?.toLowerCase() || "generic";
    if (controllerPosts[primaryController]) {
      candidates.push({
        post_id: controllerPosts[primaryController],
        controller_family: primaryController,
        priority: 1,
        reason: "Primary controller match"
      });
    }

    // Add cross-checkable alternatives
    for (const group of this.crossCheckableGroups) {
      if (group.includes(primaryController)) {
        for (const controller of group) {
          if (controller !== primaryController && controllerPosts[controller]) {
            candidates.push({
              post_id: controllerPosts[controller],
              controller_family: controller,
              priority: 2,
              reason: `Cross-checkable with ${primaryController}`
            });
          }
        }
      }
    }

    // Always include generic as fallback
    if (!candidates.some(c => c.post_id === "generic_turning")) {
      candidates.push({
        post_id: "generic_turning",
        controller_family: "generic",
        priority: 3,
        reason: "Universal fallback"
      });
    }

    return candidates.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Validate that a new post produces acceptable output compared to baseline
   */
  validateNewPost(
    request: MasterPostRouteRequest,
    newPostId: string,
    baselinePostId: string,
    strictThresholds?: Partial<DivergenceThresholds>
  ): {
    valid: boolean;
    divergence: DivergenceMetrics;
    issues: string[];
    suggestions: string[];
  } {
    const thresholds: DivergenceThresholds = {
      block_count_pct: 5, // Stricter for validation
      cycle_time_pct: 3,
      content_similarity_min: 0.9,
      max_critical_differences: 1,
      ...strictThresholds
    };

    const comparison = this.compareTwoPosts(request, newPostId, baselinePostId, thresholds);

    const issues: string[] = [];
    const suggestions: string[] = [];

    if (comparison.divergence.block_count_delta_pct > thresholds.block_count_pct) {
      issues.push(`Block count diverges by ${comparison.divergence.block_count_delta_pct.toFixed(1)}% (threshold: ${thresholds.block_count_pct}%)`);
      suggestions.push("Review motion optimization in new post");
    }

    if (comparison.divergence.cycle_time_delta_pct > thresholds.cycle_time_pct) {
      issues.push(`Cycle time diverges by ${comparison.divergence.cycle_time_delta_pct.toFixed(1)}% (threshold: ${thresholds.cycle_time_pct}%)`);
      suggestions.push("Check feed rate and rapid traverse handling");
    }

    if (comparison.divergence.content_similarity < thresholds.content_similarity_min) {
      issues.push(`Content similarity ${(comparison.divergence.content_similarity * 100).toFixed(1)}% below threshold ${(thresholds.content_similarity_min * 100).toFixed(1)}%`);
      suggestions.push("Compare G-code structure and formatting");
    }

    if (comparison.divergence.critical_differences.length > thresholds.max_critical_differences) {
      issues.push(`${comparison.divergence.critical_differences.length} critical differences found (max allowed: ${thresholds.max_critical_differences})`);
      for (const diff of comparison.divergence.critical_differences.slice(0, 3)) {
        suggestions.push(`Fix ${diff.type} difference at line ${diff.line_number_a}: ${diff.explanation}`);
      }
    }

    return {
      valid: issues.length === 0,
      divergence: comparison.divergence,
      issues,
      suggestions
    };
  }

  /**
   * Get cross-check statistics for monitoring
   */
  getStatistics(): {
    total_checks: number;
    average_posts_per_check: number;
    consensus_rate: number;
  } {
    return {
      total_checks: this.checkCounter,
      average_posts_per_check: 2.5, // Typical average
      consensus_rate: 0.85 // Simulated - would track actual
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private executePost(
    request: MasterPostRouteRequest,
    postId: string
  ): PostExecutionResult {
    const startTime = Date.now();

    // Simulate post execution based on post ID and request
    const gcode = this.simulateGcodeGeneration(request, postId);
    const blockCount = gcode.split("\n").filter(l => l.trim() && !l.trim().startsWith("(")).length;
    const cycleTime = this.estimateCycleTime(request, blockCount, postId);

    return {
      post_id: postId,
      success: true,
      gcode,
      block_count: blockCount,
      cycle_time_estimate_s: cycleTime,
      execution_time_ms: Date.now() - startTime,
      warnings: [],
      errors: []
    };
  }

  private simulateGcodeGeneration(request: MasterPostRouteRequest, postId: string): string {
    const lines: string[] = [];
    const commentChar = postId.includes("siemens") ? ";" : "(";
    const commentEnd = postId.includes("siemens") ? "" : ")";

    // Header
    lines.push(`O${(request.program_number || 1000).toString().padStart(4, "0")}`);
    lines.push(`${commentChar}${request.program_name || "PART"}${commentEnd}`);
    lines.push(`${commentChar}POST: ${postId}${commentEnd}`);

    // Safe start
    lines.push("G28 U0 W0");
    lines.push("G50 S3000");
    lines.push("G21 G40 G80 G99");

    // Tool call
    lines.push(`T${request.tool_number.toString().padStart(2, "0")}0${request.tool_number}`);
    lines.push(`G96 S${request.spindle_rpm} M03`);
    lines.push("M08");

    // Moves with slight variation per post
    const feedVariation = postId.includes("haas") ? 0.95 : postId.includes("mazak") ? 1.02 : 1.0;

    for (const move of request.moves) {
      if (move.type === "rapid") {
        lines.push(`G00 X${(move.x || 0).toFixed(3)} Z${(move.z || 0).toFixed(3)}`);
      } else if (move.type === "linear") {
        const feed = Math.round((move.feed || request.feed_rate_mmmin) * feedVariation);
        lines.push(`G01 X${(move.x || 0).toFixed(3)} Z${(move.z || 0).toFixed(3)} F${feed}`);
      } else if (move.type === "arc_cw" || move.type === "arc_ccw") {
        const gcode = move.type === "arc_cw" ? "G02" : "G03";
        lines.push(`${gcode} X${(move.x || 0).toFixed(3)} Z${(move.z || 0).toFixed(3)} I${(move.i || 0).toFixed(3)} K${(move.k || 0).toFixed(3)}`);
      }
    }

    // Footer
    lines.push("M09");
    lines.push("M05");
    lines.push("G28 U0 W0");
    lines.push("M30");
    lines.push("%");

    return lines.join("\n");
  }

  private estimateCycleTime(
    request: MasterPostRouteRequest,
    blockCount: number,
    postId: string
  ): number {
    // Base time per block
    let timePerBlock = 0.5; // seconds

    // Adjust for post efficiency
    if (postId.includes("mazak")) timePerBlock *= 0.95;
    if (postId.includes("haas")) timePerBlock *= 1.02;
    if (postId.includes("generic")) timePerBlock *= 1.1;

    // Estimate based on moves
    let totalTime = blockCount * timePerBlock;

    // Add setup/spindle time
    totalTime += 5; // Tool change
    totalTime += 2; // Spindle up

    return Math.round(totalTime * 10) / 10;
  }

  private calculateAllDivergences(results: PostExecutionResult[]): DivergenceMetrics[] {
    const divergences: DivergenceMetrics[] = [];

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        divergences.push(this.calculateDivergence(results[i], results[j]));
      }
    }

    return divergences;
  }

  private calculateDivergence(
    resultA: PostExecutionResult,
    resultB: PostExecutionResult
  ): DivergenceMetrics {
    // Block count divergence
    const avgBlocks = (resultA.block_count + resultB.block_count) / 2;
    const blockDelta = Math.abs(resultA.block_count - resultB.block_count);
    const blockDeltaPct = avgBlocks > 0 ? (blockDelta / avgBlocks) * 100 : 0;

    // Cycle time divergence
    const avgTime = (resultA.cycle_time_estimate_s + resultB.cycle_time_estimate_s) / 2;
    const timeDelta = Math.abs(resultA.cycle_time_estimate_s - resultB.cycle_time_estimate_s);
    const timeDeltaPct = avgTime > 0 ? (timeDelta / avgTime) * 100 : 0;

    // Content similarity
    const similarity = this.calculateContentSimilarity(resultA.gcode, resultB.gcode);

    // Find critical differences
    const criticalDiffs = this.findCriticalDifferences(resultA.gcode, resultB.gcode);

    // Count line differences
    const linesA = resultA.gcode.split("\n");
    const linesB = resultB.gcode.split("\n");
    let lineDiffs = Math.abs(linesA.length - linesB.length);
    const minLen = Math.min(linesA.length, linesB.length);
    for (let i = 0; i < minLen; i++) {
      if (this.normalizeGcodeLine(linesA[i]) !== this.normalizeGcodeLine(linesB[i])) {
        lineDiffs++;
      }
    }

    return {
      post_a: resultA.post_id,
      post_b: resultB.post_id,
      block_count_delta: blockDelta,
      block_count_delta_pct: Math.round(blockDeltaPct * 10) / 10,
      cycle_time_delta_s: Math.round(timeDelta * 10) / 10,
      cycle_time_delta_pct: Math.round(timeDeltaPct * 10) / 10,
      content_similarity: Math.round(similarity * 100) / 100,
      line_differences: lineDiffs,
      critical_differences: criticalDiffs
    };
  }

  private calculateContentSimilarity(gcodeA: string, gcodeB: string): number {
    const linesA = gcodeA.split("\n").map(l => this.normalizeGcodeLine(l));
    const linesB = gcodeB.split("\n").map(l => this.normalizeGcodeLine(l));

    // Use Jaccard similarity
    const setA = new Set(linesA.filter(l => l.length > 0));
    const setB = new Set(linesB.filter(l => l.length > 0));

    let intersection = 0;
    setA.forEach(item => {
      if (setB.has(item)) intersection++;
    });

    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 1;
  }

  private normalizeGcodeLine(line: string): string {
    return line
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/\(.*?\)/g, "")
      .replace(/;.*/g, "")
      .replace(/F\d+/g, "F???") // Normalize feed rates for comparison
      .trim();
  }

  private findCriticalDifferences(gcodeA: string, gcodeB: string): CriticalDifference[] {
    const differences: CriticalDifference[] = [];
    const linesA = gcodeA.split("\n");
    const linesB = gcodeB.split("\n");

    const maxLines = Math.max(linesA.length, linesB.length);

    for (let i = 0; i < maxLines && differences.length < 10; i++) {
      const lineA = linesA[i] || "";
      const lineB = linesB[i] || "";

      const normA = this.normalizeGcodeLine(lineA);
      const normB = this.normalizeGcodeLine(lineB);

      if (normA !== normB) {
        const diff = this.classifyDifference(lineA, lineB, i + 1);
        if (diff) {
          differences.push(diff);
        }
      }
    }

    return differences;
  }

  private classifyDifference(
    lineA: string,
    lineB: string,
    lineNumber: number
  ): CriticalDifference | null {
    const normA = lineA.trim().toUpperCase();
    const normB = lineB.trim().toUpperCase();

    // Skip comment-only differences
    if (normA.startsWith("(") || normA.startsWith(";") ||
        normB.startsWith("(") || normB.startsWith(";")) {
      return null;
    }

    // Classify by G-code type
    if (normA.includes("G00") || normA.includes("G01") ||
        normB.includes("G00") || normB.includes("G01")) {
      return {
        type: "motion",
        line_number_a: lineNumber,
        line_number_b: lineNumber,
        content_a: lineA.trim(),
        content_b: lineB.trim(),
        severity: "medium",
        explanation: "Motion command differs between posts"
      };
    }

    if (normA.includes("S") && normA.includes("M03") ||
        normB.includes("S") && normB.includes("M03")) {
      return {
        type: "spindle",
        line_number_a: lineNumber,
        line_number_b: lineNumber,
        content_a: lineA.trim(),
        content_b: lineB.trim(),
        severity: "high",
        explanation: "Spindle command differs"
      };
    }

    if ((normA.includes("F") && !normA.includes("EOF")) ||
        (normB.includes("F") && !normB.includes("EOF"))) {
      return {
        type: "feed",
        line_number_a: lineNumber,
        line_number_b: lineNumber,
        content_a: lineA.trim(),
        content_b: lineB.trim(),
        severity: "low",
        explanation: "Feed rate differs (may be post-specific optimization)"
      };
    }

    if (normA.includes("T") || normB.includes("T")) {
      return {
        type: "tool",
        line_number_a: lineNumber,
        line_number_b: lineNumber,
        content_a: lineA.trim(),
        content_b: lineB.trim(),
        severity: "high",
        explanation: "Tool call differs"
      };
    }

    return null;
  }

  private analyzeFlags(
    divergences: DivergenceMetrics[],
    thresholds: DivergenceThresholds
  ): EnsembleFlag[] {
    const flags: EnsembleFlag[] = [];

    for (const div of divergences) {
      if (div.block_count_delta_pct > thresholds.block_count_pct) {
        flags.push({
          code: "BLOCK_COUNT_DIVERGENCE",
          severity: div.block_count_delta_pct > thresholds.block_count_pct * 2 ? "error" : "warning",
          message: `Block count differs by ${div.block_count_delta_pct.toFixed(1)}% between ${div.post_a} and ${div.post_b}`,
          affected_posts: [div.post_a, div.post_b]
        });
      }

      if (div.cycle_time_delta_pct > thresholds.cycle_time_pct) {
        flags.push({
          code: "CYCLE_TIME_DIVERGENCE",
          severity: div.cycle_time_delta_pct > thresholds.cycle_time_pct * 2 ? "error" : "warning",
          message: `Cycle time differs by ${div.cycle_time_delta_pct.toFixed(1)}% between ${div.post_a} and ${div.post_b}`,
          affected_posts: [div.post_a, div.post_b]
        });
      }

      if (div.content_similarity < thresholds.content_similarity_min) {
        flags.push({
          code: "LOW_CONTENT_SIMILARITY",
          severity: "warning",
          message: `Content similarity ${(div.content_similarity * 100).toFixed(1)}% below threshold`,
          affected_posts: [div.post_a, div.post_b]
        });
      }

      if (div.critical_differences.length > thresholds.max_critical_differences) {
        flags.push({
          code: "EXCESSIVE_CRITICAL_DIFFERENCES",
          severity: "error",
          message: `${div.critical_differences.length} critical differences found`,
          affected_posts: [div.post_a, div.post_b]
        });
      }
    }

    return flags;
  }

  private determineConsensus(
    results: PostExecutionResult[],
    divergences: DivergenceMetrics[],
    thresholds: DivergenceThresholds
  ): { hasConsensus: boolean; confidence: number } {
    if (results.length < 2) {
      return { hasConsensus: true, confidence: 1.0 };
    }

    // Check if all divergences are within thresholds
    let withinThresholds = 0;
    for (const div of divergences) {
      if (this.isWithinThresholds(div, thresholds)) {
        withinThresholds++;
      }
    }

    const consensusRatio = withinThresholds / divergences.length;
    return {
      hasConsensus: consensusRatio >= 0.8,
      confidence: consensusRatio
    };
  }

  private isWithinThresholds(
    divergence: DivergenceMetrics,
    thresholds: DivergenceThresholds
  ): boolean {
    return (
      divergence.block_count_delta_pct <= thresholds.block_count_pct &&
      divergence.cycle_time_delta_pct <= thresholds.cycle_time_pct &&
      divergence.content_similarity >= thresholds.content_similarity_min &&
      divergence.critical_differences.length <= thresholds.max_critical_differences
    );
  }

  private selectRecommendedPost(
    results: PostExecutionResult[],
    divergences: DivergenceMetrics[]
  ): { post_id: string; reason: string } {
    if (results.length === 0) {
      return { post_id: "generic_turning", reason: "No posts executed" };
    }

    // Prefer post with shortest cycle time among successful ones
    const successful = results.filter(r => r.success);
    if (successful.length === 0) {
      return { post_id: results[0].post_id, reason: "Only available post" };
    }

    successful.sort((a, b) => a.cycle_time_estimate_s - b.cycle_time_estimate_s);
    const best = successful[0];

    return {
      post_id: best.post_id,
      reason: `Shortest cycle time (${best.cycle_time_estimate_s.toFixed(1)}s) with ${best.block_count} blocks`
    };
  }

  private generateWarnings(
    divergences: DivergenceMetrics[],
    flags: EnsembleFlag[],
    thresholds: DivergenceThresholds
  ): string[] {
    const warnings: string[] = [];

    // Summarize flags
    const errorCount = flags.filter(f => f.severity === "error").length;
    const warningCount = flags.filter(f => f.severity === "warning").length;

    if (errorCount > 0) {
      warnings.push(`${errorCount} critical issue(s) detected - manual review recommended`);
    }

    if (warningCount > 0) {
      warnings.push(`${warningCount} warning(s) - posts may have significant differences`);
    }

    // Check for specific patterns
    const highDivergence = divergences.some(d => d.block_count_delta_pct > thresholds.block_count_pct * 2);
    if (highDivergence) {
      warnings.push("Some posts have very different output sizes - verify algorithm differences");
    }

    return warnings;
  }

  private summarizeRequest(request: MasterPostRouteRequest): string {
    return `${request.operation} on ${request.machine_id}, T${request.tool_number}, ${request.moves.length} moves`;
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheMasterPostEnsembleCrossCheckEngine = new LatheMasterPostEnsembleCrossCheckEngine();
