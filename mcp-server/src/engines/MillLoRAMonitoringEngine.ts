/**
 * MillLoRAMonitoringEngine — Real-time Deployment Monitor (Mill parity)
 * ======================================================================
 *
 * Real-time monitoring of deployed MillLoRA models. Tracks latency,
 * throughput, error rates, and MILL-CANONICAL physical-process drift
 * signals (chatter / FPA / TCPM).
 *
 * Mill parity for LatheLoRAMonitoringEngine (LATHE-LORA-MS0 U-LLR49) with
 * MILL-CANONICAL extensions:
 *
 *   - Per-request mill-canonical signals (optional per record):
 *       chatter_breach    — true if the cut triggered a chatter event
 *       fpa_failed        — true if first-piece-approval rejected the part
 *       tcpm_solver_fault — true if 5-axis Heidenhain/Fanuc transform failed
 *   - Per-deployment health adds mill-canonical rate fields with their
 *     own breach thresholds (config: chatter_rate_threshold,
 *     fpa_failure_threshold, tcpm_fault_threshold)
 *   - Mill-canonical alert metrics layered on lathe-shared error_rate +
 *     latency: chatter_rate, fpa_failure_rate, tcpm_fault_rate. Chatter
 *     alerts always start at "critical" severity (no warning step) —
 *     chatter damages tools immediately.
 *   - Per-axis health aggregation — health_distribution_by_axis groups
 *     the heath_distribution counts by axis_mode tag on the record.
 *
 * @module engines/MillLoRAMonitoringEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-MONITORING (iter93)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillAlertSeverity = "info" | "warning" | "error" | "critical";
export type MillHealthState = "healthy" | "degraded" | "unhealthy" | "unknown";

/** Per-axis training mode — matches MillLoRACadenceEngine taxonomy. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

export const MILL_CANONICAL_ALERT_METRICS = ["chatter_rate", "fpa_failure_rate", "tcpm_fault_rate"] as const;
export type MillCanonicalAlertMetric = (typeof MILL_CANONICAL_ALERT_METRICS)[number];

export interface MillRequestRecord {
  timestamp: number;
  deployment_id: string;
  latency_ms: number;
  success: boolean;
  input_tokens?: number;
  output_tokens?: number;
  error_code?: string;
  /** MILL-CANONICAL: per-request axis mode tag. */
  axis_mode?: MillAxisMode;
  /** MILL-CANONICAL: chatter event recorded against this request. */
  chatter_breach?: boolean;
  /** MILL-CANONICAL: first-piece-approval rejected. */
  fpa_failed?: boolean;
  /** MILL-CANONICAL: 5-axis solver fault. */
  tcpm_solver_fault?: boolean;
}

export interface MillAlert {
  id: string;
  severity: MillAlertSeverity;
  deployment_id: string;
  metric: string;
  threshold: number;
  actual: number;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface MillDeploymentHealth {
  deployment_id: string;
  state: MillHealthState;
  request_count: number;
  error_count: number;
  error_rate: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  /** MILL-CANONICAL: chatter event rate in window (0..1). */
  chatter_rate: number;
  /** MILL-CANONICAL: first-piece-approval failure rate in window. */
  fpa_failure_rate: number;
  /** MILL-CANONICAL: TCPM solver fault rate in window. */
  tcpm_fault_rate: number;
  last_checked: number;
}

export interface MillMonitoringConfig {
  max_records_per_deployment: number;
  error_rate_threshold: number;
  latency_threshold_ms: number;
  window_size_ms: number;
  enable_alerts: boolean;
  /** MILL-CANONICAL: chatter event rate above which we alert critical. */
  chatter_rate_threshold: number;
  /** MILL-CANONICAL: FPA rejection rate above which we alert. */
  fpa_failure_threshold: number;
  /** MILL-CANONICAL: 5-axis TCPM fault rate above which we alert. */
  tcpm_fault_threshold: number;
  /** Min requests in window before alerts fire (avoid noise on cold start). */
  min_requests_for_alert: number;
}

const DEFAULT_CONFIG: MillMonitoringConfig = {
  max_records_per_deployment: 10000,
  error_rate_threshold: 0.05,
  latency_threshold_ms: 2000,
  window_size_ms: 5 * 60 * 1000,
  enable_alerts: true,
  chatter_rate_threshold: 0.02,
  fpa_failure_threshold: 0.15,
  tcpm_fault_threshold: 0.02,
  min_requests_for_alert: 10,
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRAMonitoringEngine {
  private config: MillMonitoringConfig = { ...DEFAULT_CONFIG };
  private records: Map<string, MillRequestRecord[]> = new Map();
  private alerts: MillAlert[] = [];

  setConfig(config: Partial<MillMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillMonitoringConfig {
    return { ...this.config };
  }

  recordRequest(record: MillRequestRecord): void {
    let records = this.records.get(record.deployment_id);
    if (!records) {
      records = [];
      this.records.set(record.deployment_id, records);
    }
    records.push(record);

    if (records.length > this.config.max_records_per_deployment) {
      records.splice(0, records.length - Math.floor(this.config.max_records_per_deployment / 2));
    }

    if (this.config.enable_alerts) {
      this.evaluateAlerts(record.deployment_id);
    }
  }

  getRecordsInWindow(deploymentId: string, windowMs?: number): MillRequestRecord[] {
    const records = this.records.get(deploymentId) ?? [];
    const window = windowMs ?? this.config.window_size_ms;
    const cutoff = Date.now() - window;
    return records.filter((r) => r.timestamp >= cutoff);
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  getHealth(deploymentId: string): MillDeploymentHealth {
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
        chatter_rate: 0,
        fpa_failure_rate: 0,
        tcpm_fault_rate: 0,
        last_checked: Date.now(),
      };
    }

    const errors = records.filter((r) => !r.success).length;
    const chatterBreaches = records.filter((r) => r.chatter_breach === true).length;
    const fpaFails = records.filter((r) => r.fpa_failed === true).length;
    const tcpmFaults = records.filter((r) => r.tcpm_solver_fault === true).length;

    const latencies = records.map((r) => r.latency_ms);
    const avgLat = latencies.reduce((s, l) => s + l, 0) / count;
    const errorRate = errors / count;
    const chatterRate = chatterBreaches / count;
    const fpaFailureRate = fpaFails / count;
    const tcpmFaultRate = tcpmFaults / count;

    let state: MillHealthState = "healthy";
    // MILL-CANONICAL: chatter breach is immediately unhealthy (tool damage risk).
    if (
      errorRate > this.config.error_rate_threshold * 2 ||
      avgLat > this.config.latency_threshold_ms * 2 ||
      chatterRate > this.config.chatter_rate_threshold ||
      tcpmFaultRate > this.config.tcpm_fault_threshold * 2
    ) {
      state = "unhealthy";
    } else if (
      errorRate > this.config.error_rate_threshold ||
      avgLat > this.config.latency_threshold_ms ||
      fpaFailureRate > this.config.fpa_failure_threshold ||
      tcpmFaultRate > this.config.tcpm_fault_threshold
    ) {
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
      chatter_rate: chatterRate,
      fpa_failure_rate: fpaFailureRate,
      tcpm_fault_rate: tcpmFaultRate,
      last_checked: Date.now(),
    };
  }

  private evaluateAlerts(deploymentId: string): void {
    const health = this.getHealth(deploymentId);
    if (health.request_count < this.config.min_requests_for_alert) return;

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

    // MILL-CANONICAL: chatter — always critical (no warning step).
    if (health.chatter_rate > this.config.chatter_rate_threshold) {
      this.emitAlert({
        severity: "critical",
        deployment_id: deploymentId,
        metric: "chatter_rate",
        threshold: this.config.chatter_rate_threshold,
        actual: health.chatter_rate,
        message: `Chatter rate ${(health.chatter_rate * 100).toFixed(2)}% — tool damage risk`,
      });
    }

    if (health.fpa_failure_rate > this.config.fpa_failure_threshold) {
      this.emitAlert({
        severity: health.fpa_failure_rate > this.config.fpa_failure_threshold * 2 ? "critical" : "warning",
        deployment_id: deploymentId,
        metric: "fpa_failure_rate",
        threshold: this.config.fpa_failure_threshold,
        actual: health.fpa_failure_rate,
        message: `FPA rejection ${(health.fpa_failure_rate * 100).toFixed(1)}% — scrap risk`,
      });
    }

    if (health.tcpm_fault_rate > this.config.tcpm_fault_threshold) {
      this.emitAlert({
        severity: health.tcpm_fault_rate > this.config.tcpm_fault_threshold * 2 ? "critical" : "warning",
        deployment_id: deploymentId,
        metric: "tcpm_fault_rate",
        threshold: this.config.tcpm_fault_threshold,
        actual: health.tcpm_fault_rate,
        message: `TCPM solver fault ${(health.tcpm_fault_rate * 100).toFixed(2)}% — 5-axis transform failing`,
      });
    }
  }

  private emitAlert(data: Omit<MillAlert, "id" | "timestamp" | "acknowledged">): void {
    const recent = this.alerts.find(
      (a) =>
        a.deployment_id === data.deployment_id &&
        a.metric === data.metric &&
        Date.now() - a.timestamp < 60000,
    );
    if (recent) return;
    const alert: MillAlert = {
      ...data,
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
      acknowledged: false,
    };
    this.alerts.push(alert);
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(-250);
    }
  }

  getActiveAlerts(): MillAlert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  getAllAlerts(): MillAlert[] {
    return [...this.alerts];
  }

  acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  getMonitoredDeployments(): string[] {
    return Array.from(this.records.keys());
  }

  /**
   * MILL-CANONICAL: health distribution grouped by axis_mode tag.
   * Returns { axis_mode -> { state -> count } } where unknown-axis
   * (records missing axis_mode) is bucketed under "shared".
   */
  getHealthDistributionByAxis(): Record<string, Record<MillHealthState, number>> {
    const out: Record<string, Record<MillHealthState, number>> = {};
    for (const [depId, records] of this.records.entries()) {
      // Pick a representative axis_mode from the most-recent record.
      const recent = records[records.length - 1];
      const axis = recent?.axis_mode ?? "shared";
      if (!out[axis]) out[axis] = { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 };
      const health = this.getHealth(depId);
      out[axis][health.state]++;
    }
    return out;
  }

  getStats(): {
    monitored_deployments: number;
    total_requests: number;
    total_errors: number;
    overall_error_rate: number;
    overall_chatter_rate: number;
    overall_fpa_failure_rate: number;
    overall_tcpm_fault_rate: number;
    active_alerts: number;
    total_alerts: number;
    health_distribution: Record<MillHealthState, number>;
    health_distribution_by_axis: Record<string, Record<MillHealthState, number>>;
    alerts_by_metric: Record<string, number>;
  } {
    let totalReq = 0;
    let totalErr = 0;
    let totalChatter = 0;
    let totalFpaFail = 0;
    let totalTcpm = 0;
    const healthDist: Record<MillHealthState, number> = { healthy: 0, degraded: 0, unhealthy: 0, unknown: 0 };

    for (const deploymentId of this.records.keys()) {
      const health = this.getHealth(deploymentId);
      totalReq += health.request_count;
      totalErr += health.error_count;
      totalChatter += health.chatter_rate * health.request_count;
      totalFpaFail += health.fpa_failure_rate * health.request_count;
      totalTcpm += health.tcpm_fault_rate * health.request_count;
      healthDist[health.state]++;
    }

    const alertsByMetric: Record<string, number> = {};
    for (const a of this.alerts) {
      alertsByMetric[a.metric] = (alertsByMetric[a.metric] ?? 0) + 1;
    }

    return {
      monitored_deployments: this.records.size,
      total_requests: totalReq,
      total_errors: totalErr,
      overall_error_rate: totalReq > 0 ? totalErr / totalReq : 0,
      overall_chatter_rate: totalReq > 0 ? totalChatter / totalReq : 0,
      overall_fpa_failure_rate: totalReq > 0 ? totalFpaFail / totalReq : 0,
      overall_tcpm_fault_rate: totalReq > 0 ? totalTcpm / totalReq : 0,
      active_alerts: this.getActiveAlerts().length,
      total_alerts: this.alerts.length,
      health_distribution: healthDist,
      health_distribution_by_axis: this.getHealthDistributionByAxis(),
      alerts_by_metric: alertsByMetric,
    };
  }

  getSummary(): string {
    const stats = this.getStats();
    return [
      "Mill LoRA Monitoring Summary",
      "============================",
      `Monitored Deployments: ${stats.monitored_deployments}`,
      `Total Requests: ${stats.total_requests}`,
      `Error Rate: ${(stats.overall_error_rate * 100).toFixed(2)}%`,
      `Chatter Rate: ${(stats.overall_chatter_rate * 100).toFixed(2)}%`,
      `FPA Failure: ${(stats.overall_fpa_failure_rate * 100).toFixed(2)}%`,
      `TCPM Fault: ${(stats.overall_tcpm_fault_rate * 100).toFixed(2)}%`,
      `Active Alerts: ${stats.active_alerts}`,
      `Healthy: ${stats.health_distribution.healthy}`,
      `Degraded: ${stats.health_distribution.degraded}`,
      `Unhealthy: ${stats.health_distribution.unhealthy}`,
    ].join("\n");
  }

  reset(): void {
    this.records.clear();
    this.alerts = [];
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRAMonitoringEngine = new MillLoRAMonitoringEngine();
export { MillLoRAMonitoringEngine };
