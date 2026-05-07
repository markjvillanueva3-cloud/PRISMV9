/**
 * LatheLoRAMonitoringEngine — LATHE-LORA-MS0 U-LLR49
 * ====================================================
 *
 * Real-time monitoring of deployed LoRA models.
 * Tracks latency, throughput, error rates, and drift.
 *
 * Features:
 *   - Request/response logging
 *   - Latency histograms
 *   - Error tracking
 *   - Alert thresholds
 *   - Drift detection signals
 *
 * @module engines/LatheLoRAMonitoringEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = "info" | "warning" | "error" | "critical";
export type HealthState = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface RequestRecord {
  timestamp: number;
  deployment_id: string;
  latency_ms: number;
  success: boolean;
  input_tokens?: number;
  output_tokens?: number;
  error_code?: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  deployment_id: string;
  metric: string;
  threshold: number;
  actual: number;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface DeploymentHealth {
  deployment_id: string;
  state: HealthState;
  request_count: number;
  error_count: number;
  error_rate: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  last_checked: number;
}

export interface MonitoringConfig {
  max_records_per_deployment: number;
  error_rate_threshold: number;
  latency_threshold_ms: number;
  window_size_ms: number;
  enable_alerts: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: MonitoringConfig = {
  max_records_per_deployment: 10000,
  error_rate_threshold: 0.05, // 5%
  latency_threshold_ms: 2000,
  window_size_ms: 5 * 60 * 1000, // 5 minutes
  enable_alerts: true,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAMonitoringEngine {
  private config: MonitoringConfig = DEFAULT_CONFIG;
  private records: Map<string, RequestRecord[]> = new Map();
  private alerts: Alert[] = [];

  setConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Record a request
   */
  recordRequest(record: RequestRecord): void {
    let records = this.records.get(record.deployment_id);
    if (!records) {
      records = [];
      this.records.set(record.deployment_id, records);
    }
    records.push(record);

    // Trim
    if (records.length > this.config.max_records_per_deployment) {
      records.splice(0, records.length - Math.floor(this.config.max_records_per_deployment / 2));
    }

    // Check for alerts
    if (this.config.enable_alerts) {
      this.evaluateAlerts(record.deployment_id);
    }
  }

  /**
   * Get records in window
   */
  getRecordsInWindow(deploymentId: string, windowMs?: number): RequestRecord[] {
    const records = this.records.get(deploymentId) || [];
    const window = windowMs ?? this.config.window_size_ms;
    const cutoff = Date.now() - window;
    return records.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Compute percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  /**
   * Get health for a deployment
   */
  getHealth(deploymentId: string): DeploymentHealth {
    const records = this.getRecordsInWindow(deploymentId);
    const count = records.length;

    if (count === 0) {
      return {
        deployment_id: deploymentId,
        state: "unknown",
        request_count: 0,
        error_count: 0,
        error_rate: 0,
        avg_latency_ms: 0,
        p50_latency_ms: 0,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
        last_checked: Date.now(),
      };
    }

    const errors = records.filter(r => !r.success).length;
    const latencies = records.map(r => r.latency_ms);
    const avgLat = latencies.reduce((s, l) => s + l, 0) / count;
    const errorRate = errors / count;

    let state: HealthState = "healthy";
    if (errorRate > this.config.error_rate_threshold * 2 || avgLat > this.config.latency_threshold_ms * 2) {
      state = "unhealthy";
    } else if (errorRate > this.config.error_rate_threshold || avgLat > this.config.latency_threshold_ms) {
      state = "degraded";
    }

    return {
      deployment_id: deploymentId,
      state,
      request_count: count,
      error_count: errors,
      error_rate: errorRate,
      avg_latency_ms: avgLat,
      p50_latency_ms: this.percentile(latencies, 0.5),
      p95_latency_ms: this.percentile(latencies, 0.95),
      p99_latency_ms: this.percentile(latencies, 0.99),
      last_checked: Date.now(),
    };
  }

  /**
   * Evaluate and emit alerts
   */
  private evaluateAlerts(deploymentId: string): void {
    const health = this.getHealth(deploymentId);
    if (health.request_count < 10) return; // Not enough data

    if (health.error_rate > this.config.error_rate_threshold) {
      this.emitAlert({
        severity: health.error_rate > this.config.error_rate_threshold * 2 ? "critical" : "warning",
        deployment_id: deploymentId,
        metric: "error_rate",
        threshold: this.config.error_rate_threshold,
        actual: health.error_rate,
        message: `Error rate ${(health.error_rate * 100).toFixed(1)}% exceeds threshold`,
      });
    }

    if (health.p95_latency_ms > this.config.latency_threshold_ms) {
      this.emitAlert({
        severity: health.p95_latency_ms > this.config.latency_threshold_ms * 2 ? "critical" : "warning",
        deployment_id: deploymentId,
        metric: "p95_latency",
        threshold: this.config.latency_threshold_ms,
        actual: health.p95_latency_ms,
        message: `P95 latency ${health.p95_latency_ms.toFixed(0)}ms exceeds threshold`,
      });
    }
  }

  /**
   * Emit an alert (deduped by dep+metric within 1 minute)
   */
  private emitAlert(data: Omit<Alert, "id" | "timestamp" | "acknowledged">): void {
    const recent = this.alerts.find(
      a =>
        a.deployment_id === data.deployment_id &&
        a.metric === data.metric &&
        Date.now() - a.timestamp < 60000,
    );
    if (recent) return;

    const alert: Alert = {
      ...data,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(-250);
    }
  }

  /**
   * Get active (unacknowledged) alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  /**
   * Get all deployment IDs being monitored
   */
  getMonitoredDeployments(): string[] {
    return Array.from(this.records.keys());
  }

  /**
   * Get aggregate stats
   */
  getStats(): {
    monitored_deployments: number;
    total_requests: number;
    total_errors: number;
    overall_error_rate: number;
    active_alerts: number;
    total_alerts: number;
    health_distribution: Record<HealthState, number>;
  } {
    let totalReq = 0;
    let totalErr = 0;
    const healthDist: Record<HealthState, number> = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
    };

    for (const deploymentId of this.records.keys()) {
      const health = this.getHealth(deploymentId);
      totalReq += health.request_count;
      totalErr += health.error_count;
      healthDist[health.state]++;
    }

    return {
      monitored_deployments: this.records.size,
      total_requests: totalReq,
      total_errors: totalErr,
      overall_error_rate: totalReq > 0 ? totalErr / totalReq : 0,
      active_alerts: this.getActiveAlerts().length,
      total_alerts: this.alerts.length,
      health_distribution: healthDist,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    return [
      "Monitoring Engine Summary",
      "=========================",
      `Monitored Deployments: ${stats.monitored_deployments}`,
      `Total Requests: ${stats.total_requests}`,
      `Error Rate: ${(stats.overall_error_rate * 100).toFixed(2)}%`,
      `Active Alerts: ${stats.active_alerts}`,
      `Healthy: ${stats.health_distribution.healthy}`,
      `Degraded: ${stats.health_distribution.degraded}`,
      `Unhealthy: ${stats.health_distribution.unhealthy}`,
    ].join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.records.clear();
    this.alerts = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAMonitoringEngine = new LatheLoRAMonitoringEngine();
