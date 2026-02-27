/**
 * PRISM F3: Telemetry Type Definitions
 * =====================================
 * 
 * All interfaces for the Dispatcher Telemetry & Self-Optimization system.
 * PRISM is SOFTWARE ORCHESTRATION for CNC manufacturing intelligence.
 * Telemetry is OBSERVATION ONLY — failure never impacts dispatchers.
 * 
 * @version 1.0.0
 * @feature F3
 * @safety Telemetry failure = zero dispatcher impact
 */

// ============================================================================
// CORE TELEMETRY RECORD
// ============================================================================

/**
 * Individual telemetry record captured per dispatcher action invocation.
 * SHA-256 checksum ensures data integrity during aggregation.
 */
export interface TelemetryRecord {
  readonly id: string;                    // UUID v4
  readonly timestamp: number;             // Unix ms
  readonly dispatcher: string;            // e.g. 'prism_calc'
  readonly action: string;                // e.g. 'cutting_force'
  readonly startMs: number;               // performance.now()
  readonly endMs: number;                 // performance.now()
  readonly latencyMs: number;             // endMs - startMs
  readonly outcome: TelemetryOutcome;
  readonly errorClass?: string;           // categorized error type
  readonly tokenEstimate: number;         // payload-based estimate
  readonly payloadSizeBytes: number;
  readonly contextDepthPercent: number;   // 0-100
  readonly checksum: string;              // SHA-256 (truncated) of all fields above
}

export type TelemetryOutcome = 'success' | 'failure' | 'partial' | 'blocked';

// ============================================================================
// DISPATCHER METRICS (AGGREGATED)
// ============================================================================

export type MetricsWindow = '1m' | '5m' | '1h' | '24h';

/**
 * Aggregated metrics for a single dispatcher across a time window.
 */
export interface DispatcherMetrics {
  readonly dispatcher: string;
  readonly window: MetricsWindow;
  readonly callCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly blockedCount: number;
  readonly avgLatencyMs: number;
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly estimatedTokens: number;
  readonly errorsByClass: Record<string, number>;
  readonly actionBreakdown: Record<string, ActionMetrics>;
  readonly dataIntegrity: DataIntegrityMetrics;
}

export interface ActionMetrics {
  readonly count: number;
  readonly avgMs: number;
  readonly errorRate: number;
  readonly isSafetyCritical: boolean;
}

export interface DataIntegrityMetrics {
  readonly recordsProcessed: number;
  readonly checksumFailures: number;
  readonly droppedOverflow: number;
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

export type AnomalyType =
  | 'LATENCY_SPIKE'
  | 'ERROR_RATE_INCREASE'
  | 'THROUGHPUT_DROP'
  | 'TOKEN_CONSUMPTION_SURGE'
  | 'DATA_INTEGRITY_DEGRADATION';

export type AnomalySeverity = 'INFO' | 'WARN' | 'CRITICAL';

/**
 * Anomaly alert generated when metrics deviate from baseline.
 */
export interface AnomalyAlert {
  readonly id: string;
  readonly timestamp: number;
  readonly dispatcher: string;
  readonly type: AnomalyType;
  readonly severity: AnomalySeverity;
  readonly currentValue: number;
  readonly baselineValue: number;
  readonly deviationSigma: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  readonly deduplicationKey: string;
  escalationLevel: number;             // 0 = initial, 1/2/3 = escalated
  lastEscalatedAt?: number;
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

export type NotificationDeliveryMethod = 'dashboard_persistent' | 'event_stream' | 'webhook';
export type NotificationDeliveryStatus = 'pending' | 'delivered' | 'acknowledged' | 'escalated';

export interface NotificationRecord {
  readonly id: string;
  readonly anomalyId: string;
  readonly createdAt: number;
  readonly deliveryMethod: NotificationDeliveryMethod;
  deliveryStatus: NotificationDeliveryStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

// ============================================================================
// ROUTE OPTIMIZATION
// ============================================================================

export interface RouteWeight {
  readonly dispatcher: string;
  weight: number;                       // 0.0-1.0
  readonly previousWeight: number;
  readonly reason: string;
  readonly timestamp: number;
  frozen: boolean;
  frozenBy?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface EscalationPolicy {
  escalationIntervalsMinutes: number[]; // default [5, 15, 30]
  autoActionsOnEscalation3: string[];   // default ['disable_optimizer']
}

export interface TelemetryConfig {
  anomalySigma: number;                 // default 2.0, range [0.5, 4.0]
  safetyAnomalySigma: number;           // default 1.5, range [0.5, 3.0]
  minSamples: number;                   // default 5, range [3, 100]
  dampeningMax: number;                 // default 0.15, range [0.01, 0.30]
  optimizerCycleSeconds: number;        // default 60, range [10, 300]
  ringBufferSize: number;               // default 1000, range [100, 10000]
  snapshotIntervalSeconds: number;      // default 30, range [5, 300]
  optimizerEnabled: boolean;            // default false (OBSERVE-ONLY)
  deduplicationWindowMs: number;        // default 300000 (5 min)
  escalation: EscalationPolicy;
  maxLatencyMs: number;                 // default 5000, semantic validation bound
  memoryLimitBytes: number;             // default 512000 (500KB)
}

/**
 * Default configuration — conservative, observation-only.
 */
export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  anomalySigma: 2.0,
  safetyAnomalySigma: 1.5,
  minSamples: 5,
  dampeningMax: 0.15,
  optimizerCycleSeconds: 60,
  ringBufferSize: 1000,
  snapshotIntervalSeconds: 30,
  optimizerEnabled: false,
  deduplicationWindowMs: 300_000,
  escalation: {
    escalationIntervalsMinutes: [5, 15, 30],
    autoActionsOnEscalation3: ['disable_optimizer'],
  },
  maxLatencyMs: 5000,
  memoryLimitBytes: 512_000,
};

// ============================================================================
// SAFETY-CRITICAL ACTION REGISTRY
// ============================================================================

/**
 * Actions that get tighter anomaly thresholds (safetyAnomalySigma).
 */
export const SAFETY_CRITICAL_ACTIONS: ReadonlySet<string> = new Set([
  'cutting_force', 'tool_life', 'speed_feed', 'flow_stress',
  'power', 'chip_load', 'stability', 'deflection', 'thermal',
  'material_get', 'material_search',
  'check_toolpath_collision', 'validate_rapid_moves',
  'check_spindle_torque', 'check_spindle_power',
  'predict_tool_breakage', 'calculate_tool_stress',
  'check_chip_load_limits', 'calculate_clamp_force_required',
]);

// ============================================================================
// DASHBOARD / API RESPONSE TYPES
// ============================================================================

export interface TelemetryDashboard {
  readonly timestamp: number;
  readonly dispatchers: DispatcherMetrics[];
  readonly anomalySummary: {
    readonly total: number;
    readonly unacknowledgedCritical: number;
    readonly bySeverity: Record<AnomalySeverity, number>;
  };
  readonly systemHealth: SystemHealthMetrics;
}

export interface SystemHealthMetrics {
  readonly wrapperOverheadP99Ms: number;
  readonly ringBufferUtilization: Record<string, number>; // dispatcher → % full
  readonly aggregatorCycleTimeMs: number;
  readonly checksumFailureRate: number;
  readonly memoryUsageBytes: number;
  readonly anomalyCountLastHour: number;
}

export interface DispatcherDetail {
  readonly dispatcher: string;
  readonly metrics: Record<MetricsWindow, DispatcherMetrics>;
  readonly recentAnomalies: AnomalyAlert[];
  readonly routeWeight: RouteWeight | null;
}

// ============================================================================
// RING BUFFER TYPES
// ============================================================================

export interface RingBuffer {
  records: TelemetryRecord[];
  writeIndex: number;
  size: number;
  capacity: number;
  droppedOverflow: number;
}
