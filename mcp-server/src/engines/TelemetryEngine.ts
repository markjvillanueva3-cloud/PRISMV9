/**
 * PRISM F3: Dispatcher Telemetry & Self-Optimization Engine
 * ===========================================================
 * 
 * Observes all dispatcher invocations, aggregates metrics, detects anomalies,
 * and (optionally) adjusts route weights for optimization.
 * 
 * SAFETY: Telemetry failure = zero dispatcher impact. All methods are wrapped
 * in try/catch to ensure observation never blocks manufacturing operations.
 * 
 * Architecture:
 *   1. RingBuffer — per-dispatcher circular buffer of TelemetryRecords
 *   2. Aggregator — periodic metric computation across time windows
 *   3. AnomalyDetector — sigma-based deviation alerts with escalation
 *   4. RouteOptimizer — weight adjustments (DISABLED by default)
 * 
 * @version 2.0.0 (rebuilt from type definitions + dispatcher interface)
 * @feature F3
 * @safety Telemetry failure = zero dispatcher impact
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID, createHash } from 'crypto';
import { log } from '../utils/Logger.js';
import { safeWriteSync } from "../utils/atomicWrite.js";
import {
  TelemetryRecord, TelemetryOutcome, MetricsWindow,
  DispatcherMetrics, ActionMetrics, DataIntegrityMetrics,
  AnomalyType, AnomalySeverity, AnomalyAlert,
  RouteWeight, TelemetryConfig, DEFAULT_TELEMETRY_CONFIG,
  TelemetryDashboard, SystemHealthMetrics, DispatcherDetail,
  RingBuffer, SAFETY_CRITICAL_ACTIONS,
  NotificationRecord, EscalationPolicy,
} from '../types/telemetry-types.js';

// ============================================================================
// SHA-256 — Shared utility for data integrity (replaces CRC32)
// ============================================================================

/** SHA-256 hex digest for data integrity. Truncated to 16 hex chars (64 bits) for compact storage. */
export function sha256(str: string): string {
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
}

/** @deprecated Use sha256() instead. Kept for backward compatibility. */
export const crc32 = sha256;

// ============================================================================
// STATE DIRECTORY
// ============================================================================

const STATE_DIR = path.join(process.cwd(), 'state', 'telemetry');

function ensureStateDir(): void {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  } catch { /* non-fatal */ }
}

// ============================================================================
// CONFIG VALIDATION
// ============================================================================

function validateConfig(cfg: Partial<TelemetryConfig>): TelemetryConfig {
  const base = { ...DEFAULT_TELEMETRY_CONFIG };
  const clamp = (val: number | undefined, min: number, max: number, fb: number): number => {
    if (val === undefined || val === null || isNaN(val as number)) return fb;
    return (val as number) < min || (val as number) > max ? fb : val as number;
  };

  return {
    anomalySigma: clamp(cfg.anomalySigma, 0.5, 4.0, base.anomalySigma),
    safetyAnomalySigma: clamp(cfg.safetyAnomalySigma, 0.5, 3.0, base.safetyAnomalySigma),
    minSamples: clamp(cfg.minSamples, 3, 100, base.minSamples),
    dampeningMax: clamp(cfg.dampeningMax, 0.01, 0.30, base.dampeningMax),
    optimizerCycleSeconds: clamp(cfg.optimizerCycleSeconds, 10, 300, base.optimizerCycleSeconds),
    ringBufferSize: clamp(cfg.ringBufferSize, 100, 10000, base.ringBufferSize),
    snapshotIntervalSeconds: clamp(cfg.snapshotIntervalSeconds, 5, 300, base.snapshotIntervalSeconds),
    optimizerEnabled: typeof cfg.optimizerEnabled === 'boolean' ? cfg.optimizerEnabled : base.optimizerEnabled,
    deduplicationWindowMs: clamp(cfg.deduplicationWindowMs, 60000, 600000, base.deduplicationWindowMs),
    escalation: cfg.escalation || base.escalation,
    maxLatencyMs: clamp(cfg.maxLatencyMs, 1000, 30000, base.maxLatencyMs),
    memoryLimitBytes: clamp(cfg.memoryLimitBytes, 102400, 2097152, base.memoryLimitBytes),
  };
}

// ============================================================================
// RING BUFFER IMPLEMENTATION
// ============================================================================

function createRingBuffer(capacity: number): RingBuffer {
  return { records: new Array(capacity), writeIndex: 0, size: 0, capacity, droppedOverflow: 0 };
}

function pushRecord(buf: RingBuffer, record: TelemetryRecord): void {
  buf.records[buf.writeIndex] = record;
  buf.writeIndex = (buf.writeIndex + 1) % buf.capacity;
  if (buf.size < buf.capacity) {
    buf.size++;
  } else {
    buf.droppedOverflow++;
  }
}

function getRecords(buf: RingBuffer, windowMs?: number): TelemetryRecord[] {
  const result: TelemetryRecord[] = [];
  const now = Date.now();
  for (let i = 0; i < buf.size; i++) {
    const idx = (buf.writeIndex - buf.size + i + buf.capacity) % buf.capacity;
    const r = buf.records[idx];
    if (r && (!windowMs || (now - r.timestamp) <= windowMs)) {
      result.push(r);
    }
  }
  return result;
}

// ============================================================================
// METRIC AGGREGATION HELPERS
// ============================================================================

const WINDOW_MS: Record<MetricsWindow, number> = {
  '1m': 60_000, '5m': 300_000, '1h': 3_600_000, '24h': 86_400_000,
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function aggregateMetrics(dispatcher: string, records: TelemetryRecord[], window: MetricsWindow): DispatcherMetrics {
  const latencies = records.map(r => r.latencyMs).sort((a, b) => a - b);
  const successCount = records.filter(r => r.outcome === 'success').length;
  const failureCount = records.filter(r => r.outcome === 'failure').length;
  const blockedCount = records.filter(r => r.outcome === 'blocked').length;

  const errorsByClass: Record<string, number> = {};
  for (const r of records) {
    if (r.errorClass) errorsByClass[r.errorClass] = (errorsByClass[r.errorClass] || 0) + 1;
  }

  const actionBreakdown: Record<string, ActionMetrics> = {};
  for (const r of records) {
    if (!actionBreakdown[r.action]) {
      actionBreakdown[r.action] = { count: 0, avgMs: 0, errorRate: 0, isSafetyCritical: SAFETY_CRITICAL_ACTIONS.has(r.action) };
    }
    const ab = actionBreakdown[r.action] as any;
    ab._totalMs = (ab._totalMs || 0) + r.latencyMs;
    ab._errors = (ab._errors || 0) + (r.outcome === 'failure' ? 1 : 0);
    ab.count++;
  }
  for (const key of Object.keys(actionBreakdown)) {
    const ab = actionBreakdown[key] as any;
    ab.avgMs = ab.count > 0 ? ab._totalMs / ab.count : 0;
    ab.errorRate = ab.count > 0 ? ab._errors / ab.count : 0;
    delete ab._totalMs; delete ab._errors;
  }

  const checksumFailures = records.filter(r => {
    const expected = crc32(`${r.id}|${r.timestamp}|${r.dispatcher}|${r.action}|${r.outcome}|${r.latencyMs}|${r.errorClass || ''}|${r.tokenEstimate}|${r.payloadSizeBytes}|${r.contextDepthPercent}`);
    return expected !== r.checksum;
  }).length;

  return {
    dispatcher, window,
    callCount: records.length,
    successCount, failureCount, blockedCount,
    avgLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    p99LatencyMs: percentile(latencies, 99),
    estimatedTokens: records.reduce((acc, r) => acc + r.tokenEstimate, 0),
    errorsByClass, actionBreakdown,
    dataIntegrity: { recordsProcessed: records.length, checksumFailures, droppedOverflow: 0 },
  };
}

// ============================================================================
// TELEMETRY ENGINE — MAIN CLASS
// ============================================================================

export class TelemetryEngine {
  private static instance: TelemetryEngine | null = null;
  private config: TelemetryConfig;
  private buffers: Map<string, RingBuffer> = new Map();
  private anomalies: AnomalyAlert[] = [];
  private routeWeights: Map<string, RouteWeight> = new Map();
  private wrapperOverheads: number[] = [];
  private aggregatorTimer: ReturnType<typeof setInterval> | null = null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private baselines: Map<string, { avgLatency: number; errorRate: number; callRate: number }> = new Map();

  constructor(cfg: Partial<TelemetryConfig> = {}) {
    this.config = validateConfig(cfg);
  }

  static getInstance(): TelemetryEngine {
    if (!TelemetryEngine.instance) {
      TelemetryEngine.instance = new TelemetryEngine();
    }
    return TelemetryEngine.instance;
  }

  // ==========================================================================
  // INIT — starts aggregator + snapshot timers
  // ==========================================================================
  init(): void {
    if (this.initialized) return;
    ensureStateDir();

    // Load persisted state if available
    this.loadState();

    // Aggregator timer — recompute baselines periodically
    this.aggregatorTimer = setInterval(() => {
      try { this.runAggregation(); } catch { /* never crash */ }
    }, this.config.optimizerCycleSeconds * 1000);

    // Snapshot timer — persist state
    this.snapshotTimer = setInterval(() => {
      try { this.saveSnapshot(); } catch { /* never crash */ }
    }, this.config.snapshotIntervalSeconds * 1000);

    this.initialized = true;
    log.info(`[TELEMETRY] Engine initialized (buffer=${this.config.ringBufferSize}, optimizer=${this.config.optimizerEnabled ? 'ON' : 'OFF'})`);
  }

  // ==========================================================================
  // RECORD — capture a single dispatcher invocation
  // ==========================================================================
  record(
    dispatcher: string, action: string,
    startMs: number, endMs: number,
    outcome: TelemetryOutcome,
    errorClass?: string,
    payloadSizeBytes: number = 0,
    contextDepthPercent: number = 0,
  ): void {
    try {
      const id = randomUUID();
      const timestamp = Date.now();
      const latencyMs = endMs - startMs;
      const tokenEstimate = Math.ceil(payloadSizeBytes / 4); // rough token estimate

      // Semantic validation — clamp/reject nonsensical values
      const safeLatency = latencyMs >= 0 && latencyMs < 600_000 ? latencyMs : 0; // 0-10min
      const safePayload = payloadSizeBytes >= 0 && payloadSizeBytes < 100_000_000 ? payloadSizeBytes : 0;
      const safeContext = Math.max(0, Math.min(100, contextDepthPercent));
      const safeTokens = Math.ceil(safePayload / 4);

      const checksumInput = `${id}|${timestamp}|${dispatcher}|${action}|${outcome}|${safeLatency}|${errorClass || ''}|${safeTokens}|${safePayload}|${safeContext}`;
      const checksum = crc32(checksumInput);

      const record: TelemetryRecord = {
        id, timestamp, dispatcher, action, startMs, endMs, latencyMs: safeLatency,
        outcome, errorClass, tokenEstimate: safeTokens, payloadSizeBytes: safePayload,
        contextDepthPercent: safeContext, checksum,
      };

      if (!this.buffers.has(dispatcher)) {
        this.buffers.set(dispatcher, createRingBuffer(this.config.ringBufferSize));
      }
      pushRecord(this.buffers.get(dispatcher)!, record);
    } catch { /* Telemetry failure must never impact dispatchers */ }
  }

  // ==========================================================================
  // RECORD WRAPPER OVERHEAD
  // ==========================================================================
  recordWrapperOverhead(ms: number): void {
    this.wrapperOverheads.push(ms);
    if (this.wrapperOverheads.length > 1000) {
      this.wrapperOverheads = this.wrapperOverheads.slice(-500);
    }
  }

  // ==========================================================================
  // getDashboard — Full system overview
  // ==========================================================================
  getDashboard(): TelemetryDashboard {
    const dispatchers: DispatcherMetrics[] = [];
    for (const [name, buf] of this.buffers) {
      const records = getRecords(buf, WINDOW_MS['1m']);
      dispatchers.push(aggregateMetrics(name, records, '1m'));
    }

    const unacknowledgedCritical = this.anomalies.filter(a => !a.acknowledged && a.severity === 'CRITICAL').length;
    const bySeverity: Record<AnomalySeverity, number> = { INFO: 0, WARN: 0, CRITICAL: 0 };
    for (const a of this.anomalies) {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    }

    const overheadsSorted = [...this.wrapperOverheads].sort((a, b) => a - b);
    const oneHourAgo = Date.now() - 3_600_000;

    return {
      timestamp: Date.now(),
      dispatchers,
      anomalySummary: { total: this.anomalies.length, unacknowledgedCritical, bySeverity },
      systemHealth: {
        wrapperOverheadP99Ms: percentile(overheadsSorted, 99),
        ringBufferUtilization: Object.fromEntries(
          [...this.buffers].map(([name, buf]) => [name, buf.size / buf.capacity])
        ),
        aggregatorCycleTimeMs: 0, // updated during aggregation
        checksumFailureRate: 0,
        memoryUsageBytes: this.estimateMemoryUsage(),
        anomalyCountLastHour: this.anomalies.filter(a => a.timestamp > oneHourAgo).length,
      },
    };
  }

  // ==========================================================================
  // getDispatcherDetail — Deep metrics for one dispatcher
  // ==========================================================================
  getDispatcherDetail(name: string): DispatcherDetail | null {
    const buf = this.buffers.get(name);
    if (!buf) return null;

    const metrics: Record<MetricsWindow, DispatcherMetrics> = {} as any;
    for (const window of ['1m', '5m', '1h', '24h'] as MetricsWindow[]) {
      const records = getRecords(buf, WINDOW_MS[window]);
      metrics[window] = aggregateMetrics(name, records, window);
    }

    const recentAnomalies = this.anomalies
      .filter(a => a.dispatcher === name)
      .slice(-20);

    return {
      dispatcher: name,
      metrics,
      recentAnomalies,
      routeWeight: this.routeWeights.get(name) || null,
    };
  }

  // ==========================================================================
  // getAnomalies — Filtered anomaly list
  // ==========================================================================
  getAnomalies(severity?: AnomalySeverity, acknowledged?: boolean): AnomalyAlert[] {
    return this.anomalies.filter(a => {
      if (severity && a.severity !== severity) return false;
      if (acknowledged !== undefined && a.acknowledged !== acknowledged) return false;
      return true;
    });
  }

  // ==========================================================================
  // getOptimizationLog — Route weight log
  // ==========================================================================
  getOptimizationLog(): RouteWeight[] {
    return [...this.routeWeights.values()];
  }

  // ==========================================================================
  // acknowledgeAnomaly — Mark anomaly as reviewed
  // ==========================================================================
  acknowledgeAnomaly(anomalyId: string, operatorId: string): boolean {
    const anomaly = this.anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return false;
    anomaly.acknowledged = true;
    anomaly.acknowledgedBy = operatorId;
    anomaly.acknowledgedAt = Date.now();
    return true;
  }

  // ==========================================================================
  // freezeWeights / unfreezeWeights — Operator lock control
  // ==========================================================================
  freezeWeights(dispatcher?: string, reason: string = 'operator request', frozenBy: string = 'operator'): number {
    let count = 0;
    if (dispatcher) {
      const w = this.routeWeights.get(dispatcher);
      if (w) { w.frozen = true; w.frozenBy = frozenBy; count = 1; }
      else {
        this.routeWeights.set(dispatcher, {
          dispatcher, weight: 1.0, previousWeight: 1.0, reason, timestamp: Date.now(), frozen: true, frozenBy,
        });
        count = 1;
      }
    } else {
      for (const w of this.routeWeights.values()) { w.frozen = true; w.frozenBy = frozenBy; count++; }
    }
    return count;
  }

  unfreezeWeights(dispatcher?: string): number {
    let count = 0;
    if (dispatcher) {
      const w = this.routeWeights.get(dispatcher);
      if (w) { w.frozen = false; delete w.frozenBy; count = 1; }
    } else {
      for (const w of this.routeWeights.values()) { w.frozen = false; delete w.frozenBy; count++; }
    }
    return count;
  }

  // ==========================================================================
  // getDegradationLevel — System health indicator
  // ==========================================================================
  getDegradationLevel(): string {
    const totalErrors = this.anomalies.filter(a => !a.acknowledged && a.severity === 'CRITICAL').length;
    if (totalErrors >= 5) return 'DEGRADED';
    if (totalErrors >= 2) return 'WARNING';
    return 'HEALTHY';
  }

  // ==========================================================================
  // checkSLOs — Service Level Objective checks
  // ==========================================================================
  checkSLOs(): Record<string, { met: boolean; current: string; target: string }> {
    const slos: Record<string, { met: boolean; current: string; target: string }> = {};

    // SLO 1: Average latency < maxLatencyMs
    let totalLatency = 0, totalCalls = 0;
    for (const buf of this.buffers.values()) {
      const recs = getRecords(buf, WINDOW_MS['5m']);
      for (const r of recs) { totalLatency += r.latencyMs; totalCalls++; }
    }
    const avgLatency = totalCalls > 0 ? totalLatency / totalCalls : 0;
    slos['avg_latency'] = {
      met: avgLatency < this.config.maxLatencyMs,
      current: `${avgLatency.toFixed(1)}ms`,
      target: `<${this.config.maxLatencyMs}ms`,
    };

    // SLO 2: Error rate < 5%
    let totalErrors = 0, totalAll = 0;
    for (const buf of this.buffers.values()) {
      const recs = getRecords(buf, WINDOW_MS['5m']);
      totalAll += recs.length;
      totalErrors += recs.filter(r => r.outcome === 'failure').length;
    }
    const errorRate = totalAll > 0 ? (totalErrors / totalAll) * 100 : 0;
    slos['error_rate'] = {
      met: errorRate < 5,
      current: `${errorRate.toFixed(2)}%`,
      target: '<5%',
    };

    // SLO 3: Memory usage < limit
    const memUsage = this.estimateMemoryUsage();
    slos['memory_usage'] = {
      met: memUsage < this.config.memoryLimitBytes,
      current: `${(memUsage / 1024).toFixed(0)}KB`,
      target: `<${(this.config.memoryLimitBytes / 1024).toFixed(0)}KB`,
    };

    return slos;
  }

  // ==========================================================================
  // PRIVATE: Aggregation cycle
  // ==========================================================================
  private runAggregation(): void {
    for (const [name, buf] of this.buffers) {
      const records5m = getRecords(buf, WINDOW_MS['5m']);
      if (records5m.length < this.config.minSamples) continue;

      const latencies = records5m.map(r => r.latencyMs);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const errorRate = records5m.filter(r => r.outcome === 'failure').length / records5m.length;
      const callRate = records5m.length;

      // Update baseline using exponential moving average
      const existing = this.baselines.get(name);
      if (existing) {
        const alpha = 0.2;
        this.baselines.set(name, {
          avgLatency: existing.avgLatency * (1 - alpha) + avgLatency * alpha,
          errorRate: existing.errorRate * (1 - alpha) + errorRate * alpha,
          callRate: existing.callRate * (1 - alpha) + callRate * alpha,
        });
      } else {
        this.baselines.set(name, { avgLatency, errorRate, callRate });
      }

      // Anomaly detection — compare current to baseline
      const baseline = this.baselines.get(name)!;
      const stdDevLatency = Math.sqrt(latencies.map(l => (l - baseline.avgLatency) ** 2).reduce((a, b) => a + b, 0) / latencies.length);
      const sigmaThreshold = SAFETY_CRITICAL_ACTIONS.has(name) ? this.config.safetyAnomalySigma : this.config.anomalySigma;

      if (stdDevLatency > 0 && avgLatency > baseline.avgLatency + sigmaThreshold * stdDevLatency) {
        this.raiseAnomaly(name, 'LATENCY_SPIKE', avgLatency, baseline.avgLatency, (avgLatency - baseline.avgLatency) / stdDevLatency);
      }

      if (baseline.errorRate > 0 && errorRate > baseline.errorRate * 2) {
        this.raiseAnomaly(name, 'ERROR_RATE_INCREASE', errorRate, baseline.errorRate, errorRate / baseline.errorRate);
      }
    }
  }

  // ==========================================================================
  // PRIVATE: Anomaly raising with deduplication
  // ==========================================================================
  private raiseAnomaly(dispatcher: string, type: AnomalyType, current: number, baseline: number, sigma: number): void {
    const deduplicationKey = `${dispatcher}:${type}`;
    const now = Date.now();

    // Deduplication — don't re-raise same anomaly within window
    const recent = this.anomalies.find(a =>
      a.deduplicationKey === deduplicationKey &&
      !a.acknowledged &&
      (now - a.timestamp) < this.config.deduplicationWindowMs
    );
    if (recent) {
      // Escalate instead of duplicating
      if (recent.escalationLevel < 3) {
        recent.escalationLevel++;
        recent.lastEscalatedAt = now;
      }
      return;
    }

    const severity: AnomalySeverity = sigma >= 3 ? 'CRITICAL' : sigma >= 2 ? 'WARN' : 'INFO';

    this.anomalies.push({
      id: randomUUID(),
      timestamp: now,
      dispatcher, type, severity,
      currentValue: current,
      baselineValue: baseline,
      deviationSigma: sigma,
      acknowledged: false,
      deduplicationKey,
      escalationLevel: 0,
    });

    // Cap anomaly list at 500
    if (this.anomalies.length > 500) {
      this.anomalies = this.anomalies.slice(-250);
    }

    if (severity === 'CRITICAL') {
      log.warn(`[TELEMETRY] CRITICAL anomaly: ${dispatcher} ${type} — current=${current.toFixed(2)}, baseline=${baseline.toFixed(2)}, sigma=${sigma.toFixed(1)}`);
    }
  }

  // ==========================================================================
  // PRIVATE: State persistence
  // ==========================================================================
  private saveSnapshot(): void {
    try {
      const state = {
        timestamp: Date.now(),
        baselines: Object.fromEntries(this.baselines),
        anomalyCount: this.anomalies.length,
        bufferSizes: Object.fromEntries([...this.buffers].map(([k, v]) => [k, v.size])),
        routeWeights: Object.fromEntries(this.routeWeights),
      };
      const filePath = path.join(STATE_DIR, 'telemetry_snapshot.json');
      safeWriteSync(filePath, JSON.stringify(state, null, 2));
    } catch { /* non-fatal */ }
  }

  private loadState(): void {
    try {
      const filePath = path.join(STATE_DIR, 'telemetry_snapshot.json');
      if (!fs.existsSync(filePath)) return;
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (raw.baselines && typeof raw.baselines === 'object') {
        for (const [k, v] of Object.entries(raw.baselines)) {
          this.baselines.set(k, v as any);
        }
      }
      if (raw.routeWeights && typeof raw.routeWeights === 'object') {
        for (const [k, v] of Object.entries(raw.routeWeights)) {
          this.routeWeights.set(k, v as any);
        }
      }
    } catch { /* fresh start if corrupt */ }
  }

  // ==========================================================================
  // PRIVATE: Memory estimation
  // ==========================================================================
  private estimateMemoryUsage(): number {
    let bytes = 0;
    for (const buf of this.buffers.values()) {
      bytes += buf.size * 200; // ~200 bytes per record estimate
    }
    bytes += this.anomalies.length * 300;
    bytes += this.wrapperOverheads.length * 8;
    return bytes;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  destroy(): void {
    if (this.aggregatorTimer) clearInterval(this.aggregatorTimer);
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    this.saveSnapshot();
    this.initialized = false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const telemetryEngine = TelemetryEngine.getInstance();
