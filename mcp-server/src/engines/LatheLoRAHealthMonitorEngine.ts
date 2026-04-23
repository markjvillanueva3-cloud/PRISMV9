/**
 * LatheLoRAHealthMonitorEngine — LATHE-LORA-MS0 U-LLR23
 * =====================================================
 *
 * Monitors health of deployed LatheLoRA models.
 * Tracks metrics, detects anomalies, and manages alerts.
 *
 * Features:
 *   - Model availability monitoring
 *   - Latency tracking
 *   - Error rate monitoring
 *   - Memory usage tracking
 *   - Quality degradation detection
 *   - Alerting system
 *
 * @module engines/LatheLoRAHealthMonitorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Health status */
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/** Alert severity */
export type AlertSeverity = "info" | "warning" | "error" | "critical";

/** Health check result */
export interface HealthCheck {
  model_id: string;
  timestamp: number;
  status: HealthStatus;
  latency_ms: number;
  available: boolean;
  response_valid: boolean;
  memory_usage_mb?: number;
  gpu_utilization?: number;
  error?: string;
}

/** Model metrics */
export interface ModelMetrics {
  model_id: string;
  checks_total: number;
  checks_passed: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  error_rate: number;
  uptime_percent: number;
  last_check: number;
  last_healthy: number;
  consecutive_failures: number;
}

/** Alert */
export interface Alert {
  id: string;
  model_id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  resolved: boolean;
  resolved_at?: number;
  metadata?: Record<string, unknown>;
}

/** Monitor configuration */
export interface MonitorConfig {
  check_interval_ms: number;
  latency_threshold_ms: number;
  error_rate_threshold: number;
  consecutive_failures_alert: number;
  memory_threshold_mb: number;
  quality_check_enabled: boolean;
  quality_check_interval_ms: number;
}

/** Quality check result */
export interface QualityCheck {
  model_id: string;
  timestamp: number;
  passed: boolean;
  physics_score: number;
  safety_score: number;
  coherence_score: number;
  sample_prompt: string;
  sample_response: string;
  issues: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: MonitorConfig = {
  check_interval_ms: 60000, // 1 minute
  latency_threshold_ms: 5000, // 5 seconds
  error_rate_threshold: 0.1, // 10%
  consecutive_failures_alert: 3,
  memory_threshold_mb: 8000, // 8 GB
  quality_check_enabled: true,
  quality_check_interval_ms: 3600000, // 1 hour
};

/** Quality check prompts */
const QUALITY_CHECK_PROMPTS = [
  {
    prompt: "What is the recommended surface speed for roughing 4140 steel with carbide inserts?",
    expected_keywords: ["SFM", "400", "350", "carbide", "roughing"],
    physics_required: true,
  },
  {
    prompt: "Write a G50 spindle clamp command for 3000 RPM maximum.",
    expected_keywords: ["G50", "S3000", "spindle", "clamp"],
    safety_required: true,
  },
  {
    prompt: "Explain why we reduce cutting speed for stainless steel.",
    expected_keywords: ["work hardening", "heat", "thermal", "harder"],
    reasoning_required: true,
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAHealthMonitorEngine {
  private config: MonitorConfig = DEFAULT_CONFIG;
  private metrics: Map<string, ModelMetrics> = new Map();
  private healthHistory: Map<string, HealthCheck[]> = new Map();
  private qualityHistory: Map<string, QualityCheck[]> = new Map();
  private alerts: Alert[] = [];
  private latencyHistories: Map<string, number[]> = new Map();

  /**
   * Set configuration
   */
  setConfig(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): MonitorConfig {
    return { ...this.config };
  }

  /**
   * Register model for monitoring
   */
  registerModel(modelId: string): void {
    if (!this.metrics.has(modelId)) {
      this.metrics.set(modelId, {
        model_id: modelId,
        checks_total: 0,
        checks_passed: 0,
        avg_latency_ms: 0,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
        error_rate: 0,
        uptime_percent: 100,
        last_check: 0,
        last_healthy: 0,
        consecutive_failures: 0,
      });
      this.healthHistory.set(modelId, []);
      this.qualityHistory.set(modelId, []);
      this.latencyHistories.set(modelId, []);
      log.info(`Registered model for monitoring: ${modelId}`);
    }
  }

  /**
   * Record health check
   */
  recordHealthCheck(check: HealthCheck): void {
    const metrics = this.metrics.get(check.model_id);
    if (!metrics) {
      this.registerModel(check.model_id);
      return this.recordHealthCheck(check);
    }

    // Update history
    const history = this.healthHistory.get(check.model_id) || [];
    history.push(check);
    // Keep last 1000 checks
    if (history.length > 1000) history.shift();
    this.healthHistory.set(check.model_id, history);

    // Update latency history
    if (check.available && check.latency_ms > 0) {
      const latencies = this.latencyHistories.get(check.model_id) || [];
      latencies.push(check.latency_ms);
      if (latencies.length > 100) latencies.shift();
      this.latencyHistories.set(check.model_id, latencies);
    }

    // Update metrics
    metrics.checks_total++;
    metrics.last_check = check.timestamp;

    if (check.status === "healthy") {
      metrics.checks_passed++;
      metrics.last_healthy = check.timestamp;
      metrics.consecutive_failures = 0;
    } else {
      metrics.consecutive_failures++;
    }

    // Calculate averages
    metrics.uptime_percent = (metrics.checks_passed / metrics.checks_total) * 100;
    metrics.error_rate = 1 - metrics.uptime_percent / 100;

    // Calculate latency percentiles
    const latencies = this.latencyHistories.get(check.model_id) || [];
    if (latencies.length > 0) {
      const sorted = [...latencies].sort((a, b) => a - b);
      metrics.avg_latency_ms = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      metrics.p95_latency_ms = sorted[Math.floor(sorted.length * 0.95)] || 0;
      metrics.p99_latency_ms = sorted[Math.floor(sorted.length * 0.99)] || 0;
    }

    // Check for alerts
    this.checkAlertConditions(check, metrics);
  }

  /**
   * Check alert conditions
   */
  private checkAlertConditions(check: HealthCheck, metrics: ModelMetrics): void {
    // High latency
    if (check.latency_ms > this.config.latency_threshold_ms) {
      this.createAlert(
        check.model_id,
        "warning",
        `High latency: ${check.latency_ms}ms exceeds threshold ${this.config.latency_threshold_ms}ms`
      );
    }

    // Consecutive failures
    if (metrics.consecutive_failures >= this.config.consecutive_failures_alert) {
      this.createAlert(
        check.model_id,
        "error",
        `${metrics.consecutive_failures} consecutive health check failures`
      );
    }

    // High error rate
    if (metrics.error_rate > this.config.error_rate_threshold && metrics.checks_total >= 10) {
      this.createAlert(
        check.model_id,
        "warning",
        `Error rate ${(metrics.error_rate * 100).toFixed(1)}% exceeds threshold ${this.config.error_rate_threshold * 100}%`
      );
    }

    // Memory threshold
    if (check.memory_usage_mb && check.memory_usage_mb > this.config.memory_threshold_mb) {
      this.createAlert(
        check.model_id,
        "warning",
        `Memory usage ${check.memory_usage_mb}MB exceeds threshold ${this.config.memory_threshold_mb}MB`
      );
    }

    // Model unavailable
    if (!check.available) {
      this.createAlert(
        check.model_id,
        "error",
        `Model unavailable: ${check.error || "Unknown error"}`
      );
    }
  }

  /**
   * Record quality check
   */
  recordQualityCheck(check: QualityCheck): void {
    const history = this.qualityHistory.get(check.model_id) || [];
    history.push(check);
    if (history.length > 100) history.shift();
    this.qualityHistory.set(check.model_id, history);

    // Alert on quality degradation
    if (!check.passed) {
      this.createAlert(
        check.model_id,
        "warning",
        `Quality check failed: ${check.issues.join(", ")}`
      );
    }

    if (check.physics_score < 70) {
      this.createAlert(
        check.model_id,
        "warning",
        `Physics score degraded: ${check.physics_score}/100`
      );
    }

    if (check.safety_score < 70) {
      this.createAlert(
        check.model_id,
        "error",
        `Safety score critical: ${check.safety_score}/100`
      );
    }
  }

  /**
   * Generate quality check prompts
   */
  getQualityCheckPrompts(): typeof QUALITY_CHECK_PROMPTS {
    return [...QUALITY_CHECK_PROMPTS];
  }

  /**
   * Evaluate quality check response
   */
  evaluateQualityResponse(
    prompt: { prompt: string; expected_keywords: string[]; physics_required?: boolean; safety_required?: boolean; reasoning_required?: boolean },
    response: string
  ): {
    passed: boolean;
    score: number;
    found_keywords: string[];
    missing_keywords: string[];
  } {
    const lower = response.toLowerCase();
    const found: string[] = [];
    const missing: string[] = [];

    for (const keyword of prompt.expected_keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        found.push(keyword);
      } else {
        missing.push(keyword);
      }
    }

    const score = (found.length / prompt.expected_keywords.length) * 100;
    const passed = score >= 60; // At least 60% keywords found

    return { passed, score, found_keywords: found, missing_keywords: missing };
  }

  /**
   * Create alert
   */
  createAlert(modelId: string, severity: AlertSeverity, message: string): Alert {
    // Check for duplicate unresolved alert
    const existing = this.alerts.find(
      a => a.model_id === modelId && a.message === message && !a.resolved
    );
    if (existing) return existing;

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      model_id: modelId,
      severity,
      message,
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.push(alert);
    log.warn(`Alert [${severity}] ${modelId}: ${message}`);

    return alert;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolved_at = Date.now();
    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(modelId?: string): Alert[] {
    return this.alerts.filter(a =>
      !a.resolved && (modelId ? a.model_id === modelId : true)
    );
  }

  /**
   * Get all alerts
   */
  getAllAlerts(modelId?: string, limit: number = 100): Alert[] {
    return this.alerts
      .filter(a => modelId ? a.model_id === modelId : true)
      .slice(-limit);
  }

  /**
   * Get model metrics
   */
  getMetrics(modelId: string): ModelMetrics | undefined {
    return this.metrics.get(modelId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): ModelMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get current health status
   */
  getHealthStatus(modelId: string): HealthStatus {
    const metrics = this.metrics.get(modelId);
    if (!metrics || metrics.checks_total === 0) return "unknown";

    if (metrics.consecutive_failures >= this.config.consecutive_failures_alert) {
      return "unhealthy";
    }

    if (metrics.error_rate > this.config.error_rate_threshold) {
      return "degraded";
    }

    if (metrics.avg_latency_ms > this.config.latency_threshold_ms) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * Get health history
   */
  getHealthHistory(modelId: string, limit: number = 100): HealthCheck[] {
    return (this.healthHistory.get(modelId) || []).slice(-limit);
  }

  /**
   * Get quality history
   */
  getQualityHistory(modelId: string, limit: number = 10): QualityCheck[] {
    return (this.qualityHistory.get(modelId) || []).slice(-limit);
  }

  /**
   * Generate health report
   */
  generateReport(modelId: string): string {
    const metrics = this.metrics.get(modelId);
    const activeAlerts = this.getActiveAlerts(modelId);
    const status = this.getHealthStatus(modelId);
    const qualityHistory = this.getQualityHistory(modelId, 5);

    if (!metrics) {
      return `Model ${modelId} not registered for monitoring`;
    }

    const lines = [
      `# Health Report: ${modelId}`,
      ``,
      `## Status: ${status.toUpperCase()}`,
      ``,
      `## Metrics`,
      `- Uptime: ${metrics.uptime_percent.toFixed(1)}%`,
      `- Checks: ${metrics.checks_passed}/${metrics.checks_total} passed`,
      `- Avg Latency: ${metrics.avg_latency_ms.toFixed(0)}ms`,
      `- P95 Latency: ${metrics.p95_latency_ms.toFixed(0)}ms`,
      `- P99 Latency: ${metrics.p99_latency_ms.toFixed(0)}ms`,
      `- Error Rate: ${(metrics.error_rate * 100).toFixed(1)}%`,
      `- Last Check: ${new Date(metrics.last_check).toISOString()}`,
      `- Last Healthy: ${new Date(metrics.last_healthy).toISOString()}`,
      ``,
    ];

    if (activeAlerts.length > 0) {
      lines.push(`## Active Alerts (${activeAlerts.length})`);
      for (const alert of activeAlerts) {
        lines.push(`- [${alert.severity.toUpperCase()}] ${alert.message}`);
      }
      lines.push(``);
    }

    if (qualityHistory.length > 0) {
      const latestQuality = qualityHistory[qualityHistory.length - 1];
      lines.push(`## Latest Quality Check`);
      lines.push(`- Physics: ${latestQuality.physics_score}/100`);
      lines.push(`- Safety: ${latestQuality.safety_score}/100`);
      lines.push(`- Coherence: ${latestQuality.coherence_score}/100`);
      lines.push(`- Passed: ${latestQuality.passed ? "Yes" : "No"}`);
    }

    return lines.join("\n");
  }

  /**
   * Get summary of all models
   */
  getSummary(): string {
    const allMetrics = this.getAllMetrics();
    const activeAlerts = this.getActiveAlerts();

    const healthy = allMetrics.filter(m => this.getHealthStatus(m.model_id) === "healthy").length;
    const degraded = allMetrics.filter(m => this.getHealthStatus(m.model_id) === "degraded").length;
    const unhealthy = allMetrics.filter(m => this.getHealthStatus(m.model_id) === "unhealthy").length;

    return [
      `LatheLoRA Health Monitor Summary`,
      `================================`,
      `Models: ${allMetrics.length} total`,
      `  Healthy: ${healthy}`,
      `  Degraded: ${degraded}`,
      `  Unhealthy: ${unhealthy}`,
      `Active Alerts: ${activeAlerts.length}`,
      `  Critical: ${activeAlerts.filter(a => a.severity === "critical").length}`,
      `  Error: ${activeAlerts.filter(a => a.severity === "error").length}`,
      `  Warning: ${activeAlerts.filter(a => a.severity === "warning").length}`,
    ].join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.metrics.clear();
    this.healthHistory.clear();
    this.qualityHistory.clear();
    this.alerts = [];
    this.latencyHistories.clear();
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAHealthMonitorEngine = new LatheLoRAHealthMonitorEngine();
