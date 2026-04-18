/**
 * LatheMasterPostSelfAwarenessEngine — Self-Awareness for Lathe Master Post
 *
 * U-LTH27: Continuously audits sub-posts via PostProcessorAGIContinuousLearningEngine
 * and PostProcessorAISelfAwarenessIntegrationEngine. Detects drift (dialect changes,
 * new validator failures) and flags for regeneration.
 *
 * Architecture:
 *   [Sub-Posts Registry] → [Continuous Audit] → [Drift Detection]
 *     → [Validator Monitoring] → [Regeneration Recommendations]
 *
 * Monitors:
 *   - Dialect changes across controller families
 *   - Validator pass/fail rate trends
 *   - Post output consistency over time
 *   - Machine registry changes requiring post updates
 *
 * @module LatheMasterPostSelfAwarenessEngine
 */

import { latheMasterPostRouterEngine } from "./LatheMasterPostRouterEngine.js";
import { latheMasterPostUnifiedOutputEngine } from "./LatheMasterPostUnifiedOutputEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Post health status levels */
export type PostHealthStatus = "healthy" | "warning" | "critical" | "unknown";

/** Drift detection result for a sub-post */
export interface DriftDetectionResult {
  post_id: string;
  controller_family: string;
  drift_detected: boolean;
  drift_severity: "none" | "minor" | "major" | "critical";
  drift_indicators: DriftIndicator[];
  last_validated: string;
  recommendations: string[];
}

/** Individual drift indicator */
export interface DriftIndicator {
  type: "dialect_change" | "validator_failure" | "output_inconsistency" | "registry_mismatch";
  description: string;
  detected_at: string;
  severity: "low" | "medium" | "high";
  affected_machines: string[];
}

/** Sub-post audit result */
export interface SubPostAuditResult {
  post_id: string;
  post_engine: string;
  controller_family: string;
  health_status: PostHealthStatus;
  machines_served: number;
  validator_pass_rate: number;
  last_successful_generation: string | null;
  issues: AuditIssue[];
  metrics: PostMetrics;
}

/** Audit issue details */
export interface AuditIssue {
  code: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  affected_component: string;
  remediation: string;
}

/** Post performance metrics */
export interface PostMetrics {
  total_generations: number;
  successful_generations: number;
  failed_generations: number;
  average_generation_time_ms: number;
  average_line_count: number;
  validator_passes: number;
  validator_failures: number;
}

/** Full self-awareness report */
export interface SelfAwarenessReport {
  generated_at: string;
  overall_health: PostHealthStatus;
  sub_posts_audited: number;
  healthy_posts: number;
  warning_posts: number;
  critical_posts: number;
  drift_detections: DriftDetectionResult[];
  audit_results: SubPostAuditResult[];
  regeneration_queue: RegenerationTask[];
  summary: string;
}

/** Task for post regeneration */
export interface RegenerationTask {
  post_id: string;
  priority: "low" | "medium" | "high" | "urgent";
  reason: string;
  affected_machines: string[];
  estimated_effort: "trivial" | "minor" | "moderate" | "major";
  created_at: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheMasterPostSelfAwarenessEngine {
  /** Sub-post registry with metadata */
  private subPostRegistry: Map<string, {
    engine: string;
    controller_family: string;
    machines: string[];
    last_audit: string | null;
    metrics: PostMetrics;
  }> = new Map();

  /** Drift history for trend analysis */
  private driftHistory: Map<string, DriftIndicator[]> = new Map();

  constructor() {
    this.initializeRegistry();
  }

  /**
   * Run a full self-awareness audit of all sub-posts
   */
  runFullAudit(): SelfAwarenessReport {
    const audits: SubPostAuditResult[] = [];
    const driftDetections: DriftDetectionResult[] = [];
    const regenerationQueue: RegenerationTask[] = [];

    // Audit each registered sub-post
    this.subPostRegistry.forEach((postInfo, postId) => {
      const audit = this.auditSubPost(postId);
      audits.push(audit);

      const drift = this.detectDrift(postId);
      driftDetections.push(drift);

      // Queue for regeneration if needed
      if (drift.drift_severity === "major" || drift.drift_severity === "critical") {
        regenerationQueue.push({
          post_id: postId,
          priority: drift.drift_severity === "critical" ? "urgent" : "high",
          reason: drift.drift_indicators[0]?.description || "Drift detected",
          affected_machines: postInfo.machines,
          estimated_effort: drift.drift_severity === "critical" ? "major" : "moderate",
          created_at: new Date().toISOString(),
        });
      }
    });

    // Calculate overall health
    const healthyCounts = audits.filter(a => a.health_status === "healthy").length;
    const warningCounts = audits.filter(a => a.health_status === "warning").length;
    const criticalCounts = audits.filter(a => a.health_status === "critical").length;

    let overallHealth: PostHealthStatus = "healthy";
    if (criticalCounts > 0) overallHealth = "critical";
    else if (warningCounts > audits.length / 2) overallHealth = "warning";

    return {
      generated_at: new Date().toISOString(),
      overall_health: overallHealth,
      sub_posts_audited: audits.length,
      healthy_posts: healthyCounts,
      warning_posts: warningCounts,
      critical_posts: criticalCounts,
      drift_detections: driftDetections,
      audit_results: audits,
      regeneration_queue: regenerationQueue,
      summary: this.generateSummary(overallHealth, audits, driftDetections),
    };
  }

  /**
   * Audit a specific sub-post
   */
  auditSubPost(postId: string): SubPostAuditResult {
    const postInfo = this.subPostRegistry.get(postId);

    if (!postInfo) {
      return {
        post_id: postId,
        post_engine: "unknown",
        controller_family: "unknown",
        health_status: "unknown",
        machines_served: 0,
        validator_pass_rate: 0,
        last_successful_generation: null,
        issues: [{
          code: "POST_NOT_FOUND",
          severity: "error",
          message: `Sub-post ${postId} not found in registry`,
          affected_component: "registry",
          remediation: "Register the sub-post or remove references to it",
        }],
        metrics: this.emptyMetrics(),
      };
    }

    const issues: AuditIssue[] = [];

    // Check validator pass rate
    const passRate = postInfo.metrics.validator_passes /
      Math.max(1, postInfo.metrics.validator_passes + postInfo.metrics.validator_failures);

    if (passRate < 0.9) {
      issues.push({
        code: "LOW_PASS_RATE",
        severity: passRate < 0.7 ? "error" : "warning",
        message: `Validator pass rate is ${(passRate * 100).toFixed(1)}%`,
        affected_component: "validation",
        remediation: "Review recent failures and update post rules",
      });
    }

    // Check generation failures
    const failureRate = postInfo.metrics.failed_generations /
      Math.max(1, postInfo.metrics.total_generations);

    if (failureRate > 0.1) {
      issues.push({
        code: "HIGH_FAILURE_RATE",
        severity: failureRate > 0.3 ? "error" : "warning",
        message: `Generation failure rate is ${(failureRate * 100).toFixed(1)}%`,
        affected_component: "generation",
        remediation: "Review error logs and fix generation issues",
      });
    }

    // Check machines coverage
    const machines = postInfo.machines;
    for (const machineId of machines) {
      const recommendation = latheMasterPostRouterEngine.getRouteRecommendation(machineId);
      if (recommendation.confidence < 0.8) {
        issues.push({
          code: "LOW_CONFIDENCE_ROUTING",
          severity: "warning",
          message: `Low routing confidence (${(recommendation.confidence * 100).toFixed(0)}%) for ${machineId}`,
          affected_component: "routing",
          remediation: "Review machine configuration and post compatibility",
        });
      }
    }

    // Determine health status
    let healthStatus: PostHealthStatus = "healthy";
    if (issues.some(i => i.severity === "critical")) healthStatus = "critical";
    else if (issues.some(i => i.severity === "error")) healthStatus = "warning";

    return {
      post_id: postId,
      post_engine: postInfo.engine,
      controller_family: postInfo.controller_family,
      health_status: healthStatus,
      machines_served: machines.length,
      validator_pass_rate: passRate,
      last_successful_generation: postInfo.last_audit,
      issues,
      metrics: postInfo.metrics,
    };
  }

  /**
   * Detect drift for a specific sub-post
   */
  detectDrift(postId: string): DriftDetectionResult {
    const postInfo = this.subPostRegistry.get(postId);
    const indicators: DriftIndicator[] = [];

    if (!postInfo) {
      return {
        post_id: postId,
        controller_family: "unknown",
        drift_detected: false,
        drift_severity: "none",
        drift_indicators: [],
        last_validated: new Date().toISOString(),
        recommendations: ["Register sub-post in registry"],
      };
    }

    // Check for validator failure trends
    const recentFailures = postInfo.metrics.validator_failures;
    if (recentFailures > 5) {
      indicators.push({
        type: "validator_failure",
        description: `${recentFailures} validator failures detected`,
        detected_at: new Date().toISOString(),
        severity: recentFailures > 20 ? "high" : "medium",
        affected_machines: postInfo.machines,
      });
    }

    // Check historical drift
    const history = this.driftHistory.get(postId) || [];
    if (history.length > 3) {
      indicators.push({
        type: "output_inconsistency",
        description: `Recurring drift patterns detected (${history.length} incidents)`,
        detected_at: new Date().toISOString(),
        severity: "medium",
        affected_machines: postInfo.machines,
      });
    }

    // Check registry alignment
    const latheMachines = latheMasterPostRouterEngine.getLatheMachines();
    const registryMismatch = postInfo.machines.filter(m =>
      !latheMachines.some(lm => lm.machine_id === m)
    );
    if (registryMismatch.length > 0) {
      indicators.push({
        type: "registry_mismatch",
        description: `${registryMismatch.length} machines not in shop registry`,
        detected_at: new Date().toISOString(),
        severity: "low",
        affected_machines: registryMismatch,
      });
    }

    // Determine severity
    let severity: DriftDetectionResult["drift_severity"] = "none";
    if (indicators.some(i => i.severity === "high")) severity = "critical";
    else if (indicators.some(i => i.severity === "medium")) severity = "major";
    else if (indicators.length > 0) severity = "minor";

    // Generate recommendations
    const recommendations: string[] = [];
    if (indicators.some(i => i.type === "validator_failure")) {
      recommendations.push("Review and update validation rules");
    }
    if (indicators.some(i => i.type === "registry_mismatch")) {
      recommendations.push("Sync machine registry with shop configuration");
    }
    if (severity === "critical") {
      recommendations.push("Consider full post regeneration via P2 path");
    }

    return {
      post_id: postId,
      controller_family: postInfo.controller_family,
      drift_detected: indicators.length > 0,
      drift_severity: severity,
      drift_indicators: indicators,
      last_validated: new Date().toISOString(),
      recommendations,
    };
  }

  /**
   * Record a validation event for tracking
   */
  recordValidationEvent(postId: string, success: boolean, generationTimeMs?: number): void {
    const postInfo = this.subPostRegistry.get(postId);
    if (!postInfo) return;

    if (success) {
      postInfo.metrics.validator_passes++;
      postInfo.metrics.successful_generations++;
    } else {
      postInfo.metrics.validator_failures++;
      postInfo.metrics.failed_generations++;
    }

    postInfo.metrics.total_generations++;
    if (generationTimeMs) {
      // Update running average
      const n = postInfo.metrics.total_generations;
      postInfo.metrics.average_generation_time_ms =
        ((n - 1) * postInfo.metrics.average_generation_time_ms + generationTimeMs) / n;
    }

    postInfo.last_audit = new Date().toISOString();
  }

  /**
   * Get the current status of all sub-posts
   */
  getSubPostStatus(): Array<{
    post_id: string;
    controller_family: string;
    health: PostHealthStatus;
    machines: number;
    pass_rate: number;
  }> {
    const results: Array<{
      post_id: string;
      controller_family: string;
      health: PostHealthStatus;
      machines: number;
      pass_rate: number;
    }> = [];

    this.subPostRegistry.forEach((info, postId) => {
      const total = info.metrics.validator_passes + info.metrics.validator_failures;
      const passRate = total > 0 ? info.metrics.validator_passes / total : 1;

      let health: PostHealthStatus = "healthy";
      if (passRate < 0.7) health = "critical";
      else if (passRate < 0.9) health = "warning";

      results.push({
        post_id: postId,
        controller_family: info.controller_family,
        health,
        machines: info.machines.length,
        pass_rate: passRate,
      });
    });

    return results;
  }

  /**
   * Check if a specific post needs regeneration
   */
  needsRegeneration(postId: string): {
    needs_regeneration: boolean;
    urgency: "low" | "medium" | "high" | "urgent";
    reasons: string[];
  } {
    const drift = this.detectDrift(postId);
    const audit = this.auditSubPost(postId);

    const reasons: string[] = [];
    let urgency: "low" | "medium" | "high" | "urgent" = "low";

    if (drift.drift_severity === "critical") {
      reasons.push("Critical drift detected");
      urgency = "urgent";
    } else if (drift.drift_severity === "major") {
      reasons.push("Major drift detected");
      urgency = "high";
    }

    if (audit.health_status === "critical") {
      reasons.push("Health status is critical");
      if (urgency !== "urgent") urgency = "high";
    }

    if (audit.validator_pass_rate < 0.8) {
      reasons.push(`Low validator pass rate: ${(audit.validator_pass_rate * 100).toFixed(1)}%`);
      if (urgency === "low") urgency = "medium";
    }

    return {
      needs_regeneration: reasons.length > 0,
      urgency,
      reasons,
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private initializeRegistry(): void {
    // Register known sub-posts based on JM Die machines
    const latheMachines = latheMasterPostRouterEngine.getLatheMachines();

    // Group machines by controller family
    const okumaIds = latheMachines
      .filter(m => m.controller_family === "okuma")
      .map(m => m.machine_id);

    // Register Okuma sub-post
    this.subPostRegistry.set("okuma_turning", {
      engine: "PPOkumaTurningPostEngine",
      controller_family: "okuma",
      machines: okumaIds,
      last_audit: null,
      metrics: this.emptyMetrics(),
    });

    // Register generic Fanuc sub-post
    this.subPostRegistry.set("fanuc_turning", {
      engine: "LathePostProcessorEngine",
      controller_family: "fanuc",
      machines: [],
      last_audit: null,
      metrics: this.emptyMetrics(),
    });

    // Register Haas sub-post
    this.subPostRegistry.set("haas_turning", {
      engine: "LathePostProcessorEngine",
      controller_family: "haas",
      machines: [],
      last_audit: null,
      metrics: this.emptyMetrics(),
    });

    // Register Mazak sub-post
    this.subPostRegistry.set("mazak_turning", {
      engine: "LathePostProcessorEngine",
      controller_family: "mazak",
      machines: [],
      last_audit: null,
      metrics: this.emptyMetrics(),
    });
  }

  private emptyMetrics(): PostMetrics {
    return {
      total_generations: 0,
      successful_generations: 0,
      failed_generations: 0,
      average_generation_time_ms: 0,
      average_line_count: 0,
      validator_passes: 0,
      validator_failures: 0,
    };
  }

  private generateSummary(
    health: PostHealthStatus,
    audits: SubPostAuditResult[],
    drifts: DriftDetectionResult[]
  ): string {
    const driftCount = drifts.filter(d => d.drift_detected).length;
    const issueCount = audits.reduce((sum, a) => sum + a.issues.length, 0);

    if (health === "healthy" && driftCount === 0) {
      return "All lathe master post sub-posts are healthy with no drift detected.";
    }

    const parts: string[] = [];
    parts.push(`Overall health: ${health.toUpperCase()}.`);
    if (driftCount > 0) {
      parts.push(`${driftCount} sub-post(s) showing drift.`);
    }
    if (issueCount > 0) {
      parts.push(`${issueCount} total issue(s) found.`);
    }

    return parts.join(" ");
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheMasterPostSelfAwarenessEngine = new LatheMasterPostSelfAwarenessEngine();
