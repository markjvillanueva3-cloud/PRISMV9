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
 * Persistence layer (2026-05-15, pillar-telemetry-recovery U-PTR01):
 *   Set env `PRISM_HOOK_TELEMETRY_PATH` to an absolute JSON path to enable
 *   crash-survivable telemetry. The engine auto-loads on construct (sync) and
 *   debounce-flushes (default 5000 ms) on every recordEnd. Atomic write via
 *   `.tmp` + rename. Set `PRISM_HOOK_TELEMETRY_DISABLE=1` to skip even when
 *   the path is set. Backward compat: with neither env set, behavior is the
 *   pre-2026-05-15 in-memory-only engine.
 *
 * @module Phase0.25 Scientific Foundations
 * @see UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-ADDENDUM-2026-04-18.md §IV
 */

import * as fs from "node:fs";
import * as path from "node:path";

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

// Persistence (pillar-telemetry-recovery U-PTR01) ──────────────────────────────
const PERSIST_ENV_PATH = "PRISM_HOOK_TELEMETRY_PATH";
const PERSIST_ENV_DISABLE = "PRISM_HOOK_TELEMETRY_DISABLE";
const PERSIST_ENV_DEBOUNCE_MS = "PRISM_HOOK_TELEMETRY_DEBOUNCE_MS";
const DEFAULT_DEBOUNCE_MS = 5000;
const SCHEMA_VERSION = 1;

interface PersistedTelemetry {
  schemaVersion: number;
  savedAt: number;
  windowMs: number;
  maxLatencySamples: number;
  hooks: Record<string, HookMetrics>;
  invocationTimestamps: number[];
  completionTimestamps: number[];
  alerts: Alert[];
}

export interface PersistResult {
  ok: boolean;
  path: string;
  bytesWritten?: number;
  error?: string;
}

export interface LoadResult {
  ok: boolean;
  path: string;
  loadedHooks: number;
  loadedAlerts: number;
  prunedTimestamps: number;
  error?: string;
}

class HookTelemetryEngineImpl {
  private hooks: Map<string, HookMetrics>;
  private invocationTimestamps: number[];  // For arrival rate calculation
  private completionTimestamps: number[];  // For service rate calculation
  private alerts: Alert[];
  private windowMs: number;  // Time window for rate calculations
  private maxLatencySamples: number;

  // Persistence state
  private persistPath: string | null;
  private persistDisabled: boolean;
  private debounceMs: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null;
  private dirty: boolean;

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

    // Persistence config (opt-in via env)
    const envPath = process.env[PERSIST_ENV_PATH]?.trim();
    this.persistPath = envPath && envPath.length > 0 ? envPath : null;
    this.persistDisabled = process.env[PERSIST_ENV_DISABLE] === "1";
    const envDebounce = process.env[PERSIST_ENV_DEBOUNCE_MS];
    const parsedDebounce = envDebounce ? parseInt(envDebounce, 10) : NaN;
    this.debounceMs =
      Number.isFinite(parsedDebounce) && parsedDebounce >= 0
        ? parsedDebounce
        : DEFAULT_DEBOUNCE_MS;
    this.debounceTimer = null;
    this.dirty = false;

    // Auto-load if path is set, persistence not disabled, and file exists.
    // Failures are non-fatal: corrupted state must not block MCP boot.
    if (this.persistPath && !this.persistDisabled && fs.existsSync(this.persistPath)) {
      const result = this.loadPersisted();
      if (!result.ok && result.error) {
        console.warn(
          `[HookTelemetryEngine] auto-load failed from ${this.persistPath}: ${result.error}`,
        );
      }
    }
  }

  /**
   * Get the configured persistence path (null = in-memory only).
   */
  getPersistPath(): string | null {
    return this.persistPath;
  }

  /**
   * Set or clear the persistence path at runtime. Passing null disables
   * persistence and cancels any pending flush.
   */
  setPersistPath(filePath: string | null): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.persistPath = filePath && filePath.trim().length > 0 ? filePath : null;
    this.dirty = false;
  }

  /**
   * Mark the in-memory state dirty and schedule a debounced flush. Public so
   * external mutations (e.g. test fixtures) can trigger persistence. No-op if
   * persistPath is unset or persistence is env-disabled.
   */
  markDirty(): void {
    if (!this.persistPath || this.persistDisabled) return;
    this.dirty = true;
    if (this.debounceTimer) return;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      if (this.dirty) {
        this.persist();
      }
    }, this.debounceMs);
    // Allow the Node process to exit even with a pending flush — recovery on
    // next boot is acceptable.
    if (typeof (this.debounceTimer as { unref?: () => void }).unref === "function") {
      (this.debounceTimer as { unref: () => void }).unref();
    }
  }

  /**
   * Atomically persist current telemetry to disk. Writes to `<path>.tmp` then
   * renames over the destination. Does NOT throw — returns a structured result.
   */
  persist(filePath?: string): PersistResult {
    const target = filePath ?? this.persistPath;
    if (!target) {
      return { ok: false, path: "", error: "no persistPath configured" };
    }
    try {
      // Build a serializable snapshot
      const hooksObj: Record<string, HookMetrics> = {};
      for (const [name, metrics] of this.hooks) {
        hooksObj[name] = {
          latencies: [...metrics.latencies],
          invocations: metrics.invocations,
          successes: metrics.successes,
          failures: metrics.failures,
          blocks: metrics.blocks,
          lastInvocation: metrics.lastInvocation,
        };
      }
      const payload: PersistedTelemetry = {
        schemaVersion: SCHEMA_VERSION,
        savedAt: Date.now(),
        windowMs: this.windowMs,
        maxLatencySamples: this.maxLatencySamples,
        hooks: hooksObj,
        invocationTimestamps: [...this.invocationTimestamps],
        completionTimestamps: [...this.completionTimestamps],
        alerts: [...this.alerts],
      };
      const json = JSON.stringify(payload);
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmp = `${target}.tmp`;
      fs.writeFileSync(tmp, json, { encoding: "utf8" });
      fs.renameSync(tmp, target);
      this.dirty = false;
      return { ok: true, path: target, bytesWritten: Buffer.byteLength(json, "utf8") };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, path: target, error: msg };
    }
  }

  /**
   * Load persisted telemetry from disk and merge into the in-memory state.
   * Replaces (does not append to) the current state — designed for boot.
   * Old timestamps outside `windowMs` are pruned during load.
   */
  loadPersisted(filePath?: string): LoadResult {
    const target = filePath ?? this.persistPath;
    if (!target) {
      return { ok: false, path: "", loadedHooks: 0, loadedAlerts: 0, prunedTimestamps: 0, error: "no persistPath configured" };
    }
    try {
      if (!fs.existsSync(target)) {
        return { ok: false, path: target, loadedHooks: 0, loadedAlerts: 0, prunedTimestamps: 0, error: "file not found" };
      }
      const raw = fs.readFileSync(target, "utf8");
      const parsed = JSON.parse(raw) as PersistedTelemetry;
      if (!parsed || typeof parsed !== "object" || parsed.schemaVersion !== SCHEMA_VERSION) {
        return {
          ok: false,
          path: target,
          loadedHooks: 0,
          loadedAlerts: 0,
          prunedTimestamps: 0,
          error: `schemaVersion mismatch (got ${(parsed as PersistedTelemetry | null)?.schemaVersion ?? "missing"}, want ${SCHEMA_VERSION})`,
        };
      }
      // Replace state
      const newHooks = new Map<string, HookMetrics>();
      const hooksObj = parsed.hooks ?? {};
      for (const [name, metrics] of Object.entries(hooksObj)) {
        newHooks.set(name, {
          latencies: Array.isArray(metrics.latencies) ? [...metrics.latencies] : [],
          invocations: Number(metrics.invocations) || 0,
          successes: Number(metrics.successes) || 0,
          failures: Number(metrics.failures) || 0,
          blocks: Number(metrics.blocks) || 0,
          lastInvocation: Number(metrics.lastInvocation) || 0,
        });
      }
      const beforePrune =
        (Array.isArray(parsed.invocationTimestamps) ? parsed.invocationTimestamps.length : 0) +
        (Array.isArray(parsed.completionTimestamps) ? parsed.completionTimestamps.length : 0);
      this.hooks = newHooks;
      this.invocationTimestamps = Array.isArray(parsed.invocationTimestamps)
        ? [...parsed.invocationTimestamps]
        : [];
      this.completionTimestamps = Array.isArray(parsed.completionTimestamps)
        ? [...parsed.completionTimestamps]
        : [];
      this.alerts = Array.isArray(parsed.alerts) ? [...parsed.alerts] : [];
      // Prune timestamps that fell outside the window since last save
      this.pruneTimestamps();
      const afterPrune = this.invocationTimestamps.length + this.completionTimestamps.length;
      const pruned = Math.max(0, beforePrune - afterPrune);
      this.dirty = false;
      return {
        ok: true,
        path: target,
        loadedHooks: this.hooks.size,
        loadedAlerts: this.alerts.length,
        prunedTimestamps: pruned,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, path: target, loadedHooks: 0, loadedAlerts: 0, prunedTimestamps: 0, error: msg };
    }
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

    // Schedule a debounced persist (no-op if persistPath unset)
    this.markDirty();
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
   * Reset all telemetry. Cancels any pending persist flush so test resets are
   * deterministic — tests can wait for a flush, call reset(), and not have a
   * delayed timer overwrite a fresh fixture moments later.
   */
  reset(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.hooks.clear();
    this.invocationTimestamps = [];
    this.completionTimestamps = [];
    this.alerts = [];
    this.dirty = false;
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
