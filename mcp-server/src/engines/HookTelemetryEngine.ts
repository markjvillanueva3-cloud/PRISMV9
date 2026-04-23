/**
 * HookTelemetryEngine — Queueing Theory Metrics for Hook Health
 *
 * Implements Little's Law monitoring: L = λW
 * - λ = arrival rate (tool calls/sec)
 * - μ = service rate (hook completions/sec)
 * - ρ = utilization = λ/μ (must be < 1 for stability)
 * - L_q = average queue length = ρ²/(1-ρ)
 * - W_q = average wait time = L_q/λ
 *
 * Alerts when ρ > 0.8 (system saturating)
 *
 * Theory: M/M/1 queue for single-threaded hook execution
 *
 * @module Phase0.25 Scientific Foundations
 * @see UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-ADDENDUM-2026-04-18.md §IV
 */

export interface HookInvocation {
  hookName: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  blocked: boolean;  // Did hook block the operation?
  error?: string;
}

export interface HookStats {
  hookName: string;
  invocations: number;
  successes: number;
  failures: number;
  blocks: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  lastInvocation: number;
}

export interface SystemMetrics {
  arrivalRate: number;        // λ - invocations per second
  serviceRate: number;        // μ - completions per second
  utilization: number;        // ρ = λ/μ
  avgQueueLength: number;     // L_q
  avgWaitTime: number;        // W_q
  isHealthy: boolean;         // ρ < 0.8
  isStable: boolean;          // ρ < 1.0
  bottleneckHook: string | null;
}

export interface Alert {
  type: 'saturation' | 'failure_rate' | 'latency' | 'block_rate';
  severity: 'warning' | 'critical';
  hookName: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

interface HookMetrics {
  latencies: number[];
  invocations: number;
  successes: number;
  failures: number;
  blocks: number;
  lastInvocation: number;
}

class HookTelemetryEngineImpl {
  private hooks: Map<string, HookMetrics>;
  private invocationTimestamps: number[];  // For arrival rate calculation
  private completionTimestamps: number[];  // For service rate calculation
  private alerts: Alert[];
  private windowMs: number;  // Time window for rate calculations
  private maxLatencySamples: number;

  // Thresholds
  private readonly UTILIZATION_WARNING = 0.7;
  private readonly UTILIZATION_CRITICAL = 0.9;
  private readonly FAILURE_RATE_WARNING = 0.05;
  private readonly FAILURE_RATE_CRITICAL = 0.10;
  private readonly LATENCY_WARNING_MS = 50;
  private readonly LATENCY_CRITICAL_MS = 100;
  private readonly BLOCK_RATE_WARNING = 0.10;

  constructor(windowMs: number = 60000, maxLatencySamples: number = 1000) {
    this.hooks = new Map();
    this.invocationTimestamps = [];
    this.completionTimestamps = [];
    this.alerts = [];
    this.windowMs = windowMs;
    this.maxLatencySamples = maxLatencySamples;
  }

  /**
   * Record start of hook invocation
   */
  recordStart(hookName: string): HookInvocation {
    const now = Date.now();

    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, {
        latencies: [],
        invocations: 0,
        successes: 0,
        failures: 0,
        blocks: 0,
        lastInvocation: now
      });
    }

    this.invocationTimestamps.push(now);
    this.pruneTimestamps();

    return {
      hookName,
      startTime: now,
      success: false,
      blocked: false
    };
  }

  /**
   * Record completion of hook invocation
   */
  recordEnd(invocation: HookInvocation, success: boolean, blocked: boolean, error?: string): void {
    const now = Date.now();
    invocation.endTime = now;
    invocation.success = success;
    invocation.blocked = blocked;
    invocation.error = error;

    const metrics = this.hooks.get(invocation.hookName);
    if (!metrics) return;

    const latency = now - invocation.startTime;

    // Update metrics
    metrics.invocations++;
    metrics.lastInvocation = now;

    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }

    if (blocked) {
      metrics.blocks++;
    }

    // Store latency (with rotation)
    metrics.latencies.push(latency);
    if (metrics.latencies.length > this.maxLatencySamples) {
      metrics.latencies.shift();
    }

    this.completionTimestamps.push(now);
    this.pruneTimestamps();

    // Check for alerts
    this.checkAlerts(invocation.hookName, metrics, latency);
  }

  /**
   * Get stats for a specific hook
   */
  getHookStats(hookName: string): HookStats | null {
    const metrics = this.hooks.get(hookName);
    if (!metrics || metrics.latencies.length === 0) return null;

    const sorted = [...metrics.latencies].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      hookName,
      invocations: metrics.invocations,
      successes: metrics.successes,
      failures: metrics.failures,
      blocks: metrics.blocks,
      avgLatencyMs: sorted.reduce((a, b) => a + b, 0) / len,
      p50LatencyMs: sorted[Math.floor(len * 0.5)],
      p95LatencyMs: sorted[Math.floor(len * 0.95)],
      p99LatencyMs: sorted[Math.floor(len * 0.99)],
      maxLatencyMs: sorted[len - 1],
      lastInvocation: metrics.lastInvocation
    };
  }

  /**
   * Get system-wide queueing metrics
   */
  getSystemMetrics(): SystemMetrics {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Calculate arrival rate (λ)
    const recentArrivals = this.invocationTimestamps.filter(t => t >= windowStart).length;
    const arrivalRate = recentArrivals / (this.windowMs / 1000);

    // Calculate service rate (μ)
    const recentCompletions = this.completionTimestamps.filter(t => t >= windowStart).length;
    const serviceRate = recentCompletions / (this.windowMs / 1000);

    // Calculate utilization (ρ)
    const utilization = serviceRate > 0 ? arrivalRate / serviceRate : 0;

    // M/M/1 queue metrics
    const avgQueueLength = utilization < 1
      ? (utilization * utilization) / (1 - utilization)
      : Infinity;

    const avgWaitTime = arrivalRate > 0
      ? avgQueueLength / arrivalRate
      : 0;

    // Find bottleneck (hook with highest average latency)
    let bottleneckHook: string | null = null;
    let maxAvgLatency = 0;
    for (const [name, metrics] of this.hooks) {
      if (metrics.latencies.length > 0) {
        const avg = metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length;
        if (avg > maxAvgLatency) {
          maxAvgLatency = avg;
          bottleneckHook = name;
        }
      }
    }

    return {
      arrivalRate,
      serviceRate,
      utilization,
      avgQueueLength,
      avgWaitTime,
      isHealthy: utilization < this.UTILIZATION_WARNING,
      isStable: utilization < 1,
      bottleneckHook
    };
  }

  /**
   * Get all recent alerts
   */
  getAlerts(since?: number): Alert[] {
    if (since) {
      return this.alerts.filter(a => a.timestamp >= since);
    }
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get stats for all hooks
   */
  getAllHookStats(): HookStats[] {
    const stats: HookStats[] = [];
    for (const hookName of this.hooks.keys()) {
      const s = this.getHookStats(hookName);
      if (s) stats.push(s);
    }
    return stats.sort((a, b) => b.avgLatencyMs - a.avgLatencyMs);
  }

  /**
   * Check if system is healthy
   */
  isHealthy(): boolean {
    const metrics = this.getSystemMetrics();
    return metrics.isHealthy && metrics.isStable;
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    status: 'healthy' | 'degraded' | 'critical';
    utilization: number;
    bottleneck: string | null;
    recentAlerts: number;
  } {
    const metrics = this.getSystemMetrics();
    const recentAlerts = this.alerts.filter(
      a => a.timestamp > Date.now() - 300000  // Last 5 min
    ).length;

    let status: 'healthy' | 'degraded' | 'critical';
    if (metrics.utilization >= this.UTILIZATION_CRITICAL || !metrics.isStable) {
      status = 'critical';
    } else if (metrics.utilization >= this.UTILIZATION_WARNING || recentAlerts > 5) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      utilization: metrics.utilization,
      bottleneck: metrics.bottleneckHook,
      recentAlerts
    };
  }

  /**
   * Prune old timestamps outside the window
   */
  private pruneTimestamps(): void {
    const cutoff = Date.now() - this.windowMs;
    this.invocationTimestamps = this.invocationTimestamps.filter(t => t >= cutoff);
    this.completionTimestamps = this.completionTimestamps.filter(t => t >= cutoff);
  }

  /**
   * Check and emit alerts
   */
  private checkAlerts(hookName: string, metrics: HookMetrics, latency: number): void {
    const now = Date.now();

    // Latency alert
    if (latency >= this.LATENCY_CRITICAL_MS) {
      this.alerts.push({
        type: 'latency',
        severity: 'critical',
        hookName,
        message: `Hook ${hookName} latency ${latency}ms exceeds critical threshold`,
        value: latency,
        threshold: this.LATENCY_CRITICAL_MS,
        timestamp: now
      });
    } else if (latency >= this.LATENCY_WARNING_MS) {
      this.alerts.push({
        type: 'latency',
        severity: 'warning',
        hookName,
        message: `Hook ${hookName} latency ${latency}ms exceeds warning threshold`,
        value: latency,
        threshold: this.LATENCY_WARNING_MS,
        timestamp: now
      });
    }

    // Failure rate alert
    if (metrics.invocations >= 10) {
      const failureRate = metrics.failures / metrics.invocations;
      if (failureRate >= this.FAILURE_RATE_CRITICAL) {
        this.alerts.push({
          type: 'failure_rate',
          severity: 'critical',
          hookName,
          message: `Hook ${hookName} failure rate ${(failureRate * 100).toFixed(1)}% exceeds critical threshold`,
          value: failureRate,
          threshold: this.FAILURE_RATE_CRITICAL,
          timestamp: now
        });
      } else if (failureRate >= this.FAILURE_RATE_WARNING) {
        this.alerts.push({
          type: 'failure_rate',
          severity: 'warning',
          hookName,
          message: `Hook ${hookName} failure rate ${(failureRate * 100).toFixed(1)}% exceeds warning threshold`,
          value: failureRate,
          threshold: this.FAILURE_RATE_WARNING,
          timestamp: now
        });
      }

      // Block rate alert
      const blockRate = metrics.blocks / metrics.invocations;
      if (blockRate >= this.BLOCK_RATE_WARNING) {
        this.alerts.push({
          type: 'block_rate',
          severity: 'warning',
          hookName,
          message: `Hook ${hookName} blocking ${(blockRate * 100).toFixed(1)}% of operations`,
          value: blockRate,
          threshold: this.BLOCK_RATE_WARNING,
          timestamp: now
        });
      }
    }

    // Utilization alert
    const sysMetrics = this.getSystemMetrics();
    if (sysMetrics.utilization >= this.UTILIZATION_CRITICAL) {
      this.alerts.push({
        type: 'saturation',
        severity: 'critical',
        hookName: 'system',
        message: `System utilization ${(sysMetrics.utilization * 100).toFixed(1)}% - approaching saturation`,
        value: sysMetrics.utilization,
        threshold: this.UTILIZATION_CRITICAL,
        timestamp: now
      });
    }

    // Prune old alerts (keep last 1000)
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  /**
   * Reset all telemetry
   */
  reset(): void {
    this.hooks.clear();
    this.invocationTimestamps = [];
    this.completionTimestamps = [];
    this.alerts = [];
  }

  /**
   * Export telemetry as JSON
   */
  export(): {
    hooks: HookStats[];
    system: SystemMetrics;
    alerts: Alert[];
  } {
    return {
      hooks: this.getAllHookStats(),
      system: this.getSystemMetrics(),
      alerts: this.getAlerts()
    };
  }
}

export const hookTelemetryEngine = new HookTelemetryEngineImpl();
export type HookTelemetryEngine = HookTelemetryEngineImpl;
