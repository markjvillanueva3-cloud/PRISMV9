/**
 * PRISM Hook System v1.1 - COMPREHENSIVE EDITION (EXTENDED)
 * ==========================================================
 * Additional hook categories for complete coverage.
 * 
 * v1.1 ADDITIONS:
 * - Transaction hooks (rollback, atomic, commit)
 * - Health/Monitoring hooks (memory, CPU, disk, heartbeat)
 * - Cache hooks (invalidation, warming, hit/miss)
 * - Circuit Breaker hooks (threshold, recovery)
 * - Rate Limiting hooks (throttle, quota)
 * - Audit Trail hooks (compliance, change log)
 * - Feature Flag hooks (A/B test, canary)
 * - MCP Integration hooks (connect, disconnect)
 * - Planning Integration (overhead factors)
 * 
 * @module prism/core/hooks/extended
 * @version 1.1.0
 * @created 2026-01-26
 */

import { HookFn, HookContext, HookResult } from './HookSystem.types';

// =============================================================================
// SECTION 1: TRANSACTION HOOKS
// =============================================================================

export interface TransactionPayload {
  id: string;
  type: 'SINGLE' | 'MULTI_STEP' | 'DISTRIBUTED';
  operations: Array<{
    id: string;
    type: string;
    target: string;
    data?: unknown;
  }>;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    exponential: boolean;
  };
}

export interface TransactionStepPayload extends TransactionPayload {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  currentOperation: {
    id: string;
    type: string;
    target: string;
  };
}

export interface TransactionRollbackPayload extends TransactionPayload {
  failedStep: number;
  failureReason: string;
  rollbackOrder: string[];  // Reverse order of completed ops
  rollbackResults: Array<{
    operationId: string;
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
    error?: string;
  }>;
}

export interface TransactionCompletePayload extends TransactionPayload {
  status: 'COMMITTED' | 'ROLLED_BACK' | 'PARTIAL';
  duration: number;
  stepsCompleted: number;
  stepsRolledBack: number;
}

// =============================================================================
// SECTION 2: HEALTH/MONITORING HOOKS
// =============================================================================

export interface HealthCheckPayload {
  timestamp: string;
  checkType: 'SCHEDULED' | 'ON_DEMAND' | 'ALERT_TRIGGERED';
  components: Array<{
    name: string;
    type: 'DATABASE' | 'FILE_SYSTEM' | 'NETWORK' | 'MEMORY' | 'CPU' | 'EXTERNAL_SERVICE';
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
    latency?: number;
    details?: Record<string, unknown>;
  }>;
}

export interface MemoryPressurePayload {
  timestamp: string;
  level: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  metrics: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    percentUsed: number;
  };
  trend: 'STABLE' | 'INCREASING' | 'DECREASING';
  recommendation: 'CONTINUE' | 'CHECKPOINT' | 'GC' | 'REDUCE_LOAD' | 'EMERGENCY_SAVE';
}

export interface ResourceAlertPayload {
  timestamp: string;
  resource: 'MEMORY' | 'CPU' | 'DISK' | 'NETWORK' | 'API_QUOTA';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  current: number;
  threshold: number;
  unit: string;
  message: string;
  suggestedAction: string;
}

export interface SystemHeartbeatPayload {
  timestamp: string;
  uptimeSeconds: number;
  sessionId: string;
  metrics: {
    toolCallsThisSession: number;
    errorsThisSession: number;
    warningsThisSession: number;
    checkpointsThisSession: number;
    learningsExtracted: number;
  };
  health: {
    overall: 'GREEN' | 'YELLOW' | 'RED';
    components: Record<string, 'GREEN' | 'YELLOW' | 'RED'>;
  };
}

// =============================================================================
// SECTION 3: CACHE HOOKS
// =============================================================================

export interface CacheOperationPayload {
  operation: 'GET' | 'SET' | 'DELETE' | 'CLEAR' | 'INVALIDATE';
  cache: {
    name: string;
    type: 'MEMORY' | 'FILE' | 'DISTRIBUTED';
    maxSize?: number;
    currentSize?: number;
  };
  key?: string;
  pattern?: string;  // For bulk invalidation
  ttl?: number;
  value?: unknown;
}

export interface CacheHitPayload extends CacheOperationPayload {
  hit: boolean;
  latency: number;
  staleWhileRevalidate?: boolean;
  fromTier?: 'L1' | 'L2' | 'L3';
}

export interface CacheInvalidatePayload {
  cache: { name: string; type: string };
  reason: 'DATA_CHANGE' | 'TTL_EXPIRED' | 'MANUAL' | 'DEPENDENCY_CHANGE' | 'CALIBRATION';
  affectedKeys: string[];
  cascadeInvalidations: Array<{
    cache: string;
    keys: string[];
  }>;
}

export interface CacheWarmPayload {
  cache: { name: string; type: string };
  strategy: 'FULL' | 'PARTIAL' | 'PREDICTIVE' | 'ON_DEMAND';
  keysToWarm: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'BACKGROUND';
  estimatedDuration: number;
}

// =============================================================================
// SECTION 4: CIRCUIT BREAKER HOOKS
// =============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerPayload {
  id: string;
  name: string;
  target: string;  // What the circuit protects (service, endpoint, etc.)
  state: CircuitState;
  config: {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    halfOpenMaxCalls: number;
  };
}

export interface CircuitFailurePayload extends CircuitBreakerPayload {
  failure: {
    type: string;
    message: string;
    timestamp: string;
  };
  metrics: {
    consecutiveFailures: number;
    totalFailures: number;
    failureRate: number;
    lastSuccess?: string;
  };
  action: 'COUNT' | 'TRIP' | 'IGNORE';
}

export interface CircuitStateChangePayload extends CircuitBreakerPayload {
  previousState: CircuitState;
  newState: CircuitState;
  reason: string;
  metrics: {
    failureCount: number;
    successCount: number;
    lastFailure?: string;
    lastSuccess?: string;
  };
}

export interface CircuitRecoveryPayload extends CircuitBreakerPayload {
  recoveryAttempt: number;
  testResult: 'SUCCESS' | 'FAILURE';
  nextAction: 'CLOSE' | 'REOPEN' | 'CONTINUE_TESTING';
}

// =============================================================================
// SECTION 5: RATE LIMITING HOOKS
// =============================================================================

export interface RateLimitPayload {
  resource: string;
  type: 'API' | 'TOOL' | 'AGENT' | 'EXTERNAL_SERVICE';
  limits: {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
    tokensPerMinute?: number;
    concurrentRequests?: number;
  };
  current: {
    requestsThisSecond: number;
    requestsThisMinute: number;
    requestsThisHour: number;
    tokensThisMinute: number;
    activeRequests: number;
  };
}

export interface RateLimitHitPayload extends RateLimitPayload {
  limitHit: string;  // Which limit was hit
  waitTime: number;  // How long to wait (ms)
  action: 'WAIT' | 'QUEUE' | 'REJECT' | 'DEGRADE';
  retryAfter?: string;
}

export interface QuotaCheckPayload {
  quotaType: 'API_CALLS' | 'TOKENS' | 'STORAGE' | 'COMPUTE';
  used: number;
  limit: number;
  percentUsed: number;
  resetTime?: string;
  overage: boolean;
}

// =============================================================================
// SECTION 6: AUDIT TRAIL HOOKS
// =============================================================================

export interface AuditEventPayload {
  id: string;
  timestamp: string;
  eventType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'ACCESS' | 'EXPORT';
  actor: {
    type: 'USER' | 'AGENT' | 'SYSTEM' | 'SCHEDULED';
    id: string;
    name?: string;
  };
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  metadata?: Record<string, unknown>;
}

export interface ComplianceCheckPayload {
  checkType: 'DATA_RETENTION' | 'ACCESS_CONTROL' | 'ENCRYPTION' | 'AUDIT_LOG' | 'SAFETY';
  standard: string;  // e.g., 'AS9100', 'ISO27001', 'PRISM-SAFETY'
  requirement: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW' | 'EXEMPT';
  evidence: string[];
  findings: Array<{
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    remediation?: string;
  }>;
}

export interface ChangeLogPayload {
  entityType: string;
  entityId: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  before?: unknown;
  after?: unknown;
  diff?: Array<{
    path: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  reason?: string;
  approvedBy?: string;
}

// =============================================================================
// SECTION 7: FEATURE FLAG HOOKS
// =============================================================================

export interface FeatureFlagPayload {
  flag: {
    id: string;
    name: string;
    description: string;
    type: 'BOOLEAN' | 'PERCENTAGE' | 'USER_LIST' | 'GRADUAL_ROLLOUT';
  };
  context: {
    userId?: string;
    sessionId?: string;
    environment?: string;
    version?: string;
  };
}

export interface FeatureEvaluationPayload extends FeatureFlagPayload {
  result: {
    enabled: boolean;
    variant?: string;
    reason: 'DEFAULT' | 'RULE_MATCH' | 'PERCENTAGE' | 'OVERRIDE' | 'KILL_SWITCH';
  };
  evaluation: {
    rules: Array<{ rule: string; matched: boolean }>;
    percentile?: number;
  };
}

export interface FeatureRolloutPayload {
  flag: { id: string; name: string };
  rollout: {
    strategy: 'IMMEDIATE' | 'GRADUAL' | 'CANARY' | 'SCHEDULED';
    currentPercentage: number;
    targetPercentage: number;
    stepSize: number;
    stepInterval: number;
  };
  metrics: {
    usersAffected: number;
    errorRate: number;
    successRate: number;
  };
  decision: 'CONTINUE' | 'PAUSE' | 'ROLLBACK' | 'COMPLETE';
}

// =============================================================================
// SECTION 8: MCP INTEGRATION HOOKS
// =============================================================================

export interface MCPServerPayload {
  server: {
    id: string;
    name: string;
    type: 'FILESYSTEM' | 'BROWSER' | 'DATABASE' | 'EXTERNAL';
    version?: string;
  };
  connection: {
    status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
    latency?: number;
    lastPing?: string;
  };
}

export interface MCPToolCallPayload {
  server: { id: string; name: string };
  tool: {
    name: string;
    parameters: Record<string, unknown>;
  };
  timeout: number;
  retryable: boolean;
}

export interface MCPToolResultPayload extends MCPToolCallPayload {
  result: {
    success: boolean;
    data?: unknown;
    error?: string;
    duration: number;
  };
  metrics: {
    inputSize: number;
    outputSize: number;
    retries: number;
  };
}

export interface MCPConnectionErrorPayload extends MCPServerPayload {
  error: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  retry: {
    attempt: number;
    maxAttempts: number;
    nextAttempt?: string;
  };
}

// =============================================================================
// SECTION 9: PLANNING INTEGRATION HOOKS
// =============================================================================

export interface PlanningOverheadPayload {
  task: { id: string; name: string };
  overheadFactors: {
    hookExecution: {
      estimatedCalls: number;
      avgLatencyMs: number;
      totalOverheadMs: number;
    };
    contextBuilding: {
      stateLoadMs: number;
      skillLoadMs: number;
      historyLoadMs: number;
      totalMs: number;
    };
    verificationChain: {
      levelsRequired: number;
      avgTimePerLevel: number;
      totalMs: number;
    };
    learningExtraction: {
      enabled: boolean;
      estimatedMs: number;
    };
    swarmCoordination?: {
      agentCount: number;
      coordinationOverheadMs: number;
    };
    ralphIterations?: {
      estimatedIterations: number;
      overheadPerIteration: number;
    };
  };
  totalOverheadMs: number;
  overheadPercent: number;  // As percentage of base effort
}

export interface EffortAdjustmentPayload {
  originalEstimate: { value: number; uncertainty: number };
  adjustments: Array<{
    factor: string;
    multiplier: number;
    reason: string;
  }>;
  adjustedEstimate: { value: number; uncertainty: number };
  confidenceImpact: number;  // How much adjustments affect confidence
}

// =============================================================================
// SECTION 10: EXTENDED HOOK REGISTRY
// =============================================================================

export interface ExtendedHookRegistry {
  // Transaction hooks (5)
  'transaction:start': HookFn<TransactionPayload>;
  'transaction:step': HookFn<TransactionStepPayload>;
  'transaction:rollback': HookFn<TransactionRollbackPayload>;
  'transaction:commit': HookFn<TransactionCompletePayload>;
  'transaction:complete': HookFn<TransactionCompletePayload>;
  
  // Health hooks (5)
  'health:check': HookFn<HealthCheckPayload>;
  'health:memoryPressure': HookFn<MemoryPressurePayload>;
  'health:resourceAlert': HookFn<ResourceAlertPayload>;
  'health:heartbeat': HookFn<SystemHeartbeatPayload>;
  'health:degraded': HookFn<HealthCheckPayload>;
  
  // Cache hooks (5)
  'cache:hit': HookFn<CacheHitPayload>;
  'cache:miss': HookFn<CacheHitPayload>;
  'cache:invalidate': HookFn<CacheInvalidatePayload>;
  'cache:warm': HookFn<CacheWarmPayload>;
  'cache:evict': HookFn<CacheOperationPayload>;
  
  // Circuit breaker hooks (4)
  'circuit:failure': HookFn<CircuitFailurePayload>;
  'circuit:stateChange': HookFn<CircuitStateChangePayload>;
  'circuit:recovery': HookFn<CircuitRecoveryPayload>;
  'circuit:reset': HookFn<CircuitBreakerPayload>;
  
  // Rate limiting hooks (4)
  'rateLimit:check': HookFn<RateLimitPayload>;
  'rateLimit:hit': HookFn<RateLimitHitPayload>;
  'rateLimit:quota': HookFn<QuotaCheckPayload>;
  'rateLimit:reset': HookFn<RateLimitPayload>;
  
  // Audit hooks (4)
  'audit:event': HookFn<AuditEventPayload>;
  'audit:compliance': HookFn<ComplianceCheckPayload>;
  'audit:changeLog': HookFn<ChangeLogPayload>;
  'audit:export': HookFn<{ format: string; dateRange: [string, string]; events: AuditEventPayload[] }>;
  
  // Feature flag hooks (4)
  'feature:evaluate': HookFn<FeatureEvaluationPayload>;
  'feature:rollout': HookFn<FeatureRolloutPayload>;
  'feature:override': HookFn<FeatureFlagPayload & { override: boolean; reason: string }>;
  'feature:killSwitch': HookFn<FeatureFlagPayload>;
  
  // MCP hooks (5)
  'mcp:connect': HookFn<MCPServerPayload>;
  'mcp:disconnect': HookFn<MCPServerPayload>;
  'mcp:toolCall': HookFn<MCPToolCallPayload>;
  'mcp:toolResult': HookFn<MCPToolResultPayload>;
  'mcp:error': HookFn<MCPConnectionErrorPayload>;
  
  // Planning integration hooks (4)
  'planning:overheadCalculate': HookFn<PlanningOverheadPayload>;
  'planning:effortAdjust': HookFn<EffortAdjustmentPayload>;
  'planning:timeAdjust': HookFn<EffortAdjustmentPayload>;
  'planning:uncertaintyPropagate': HookFn<{ sources: Array<{ name: string; uncertainty: number }>; combined: number }>;
}

/**
 * Extended hook counts
 */
export const EXTENDED_HOOK_COUNTS = {
  transaction: 5,
  health: 5,
  cache: 5,
  circuitBreaker: 4,
  rateLimit: 4,
  audit: 4,
  featureFlag: 4,
  mcp: 5,
  planningIntegration: 4,
  EXTENDED_TOTAL: 40,
  
  // Combined with base system
  BASE_TOTAL: 107,
  GRAND_TOTAL: 147
} as const;

// =============================================================================
// SECTION 11: PLANNING FORMULA UPDATES
// =============================================================================

/**
 * Updated F-PLAN-002 with hook overhead
 * 
 * EFFORT(T) = Σᵢ(Baseᵢ × Complexityᵢ × Riskᵢ) × HOOK_FACTOR × COORD_FACTOR
 * 
 * Where:
 *   HOOK_FACTOR = 1 + (hookPoints × avgHookTime / avgOperationTime)
 *   COORD_FACTOR = 1 + (agents - 1) × 0.05  // 5% overhead per additional agent
 */
export interface UpdatedEffortFormula {
  id: 'F-PLAN-002';
  version: '2.0';
  form: 'EFFORT(T) = Σᵢ(Baseᵢ × Complexityᵢ × Riskᵢ) × HOOK_FACTOR × COORD_FACTOR';
  newCoefficients: [
    'K-HOOK-001',    // Average hook execution time (ms)
    'K-HOOK-002',    // Average hooks per operation
    'K-COORD-001',   // Coordination overhead per agent
    'K-VERIFY-001',  // Verification chain overhead
    'K-LEARN-001'    // Learning extraction overhead
  ];
}

/**
 * Updated F-PLAN-005 with latency factors
 * 
 * TIME(T) = EFFORT(T) × AVG_TIME × BUFFER × LATENCY_FACTOR
 * 
 * Where:
 *   LATENCY_FACTOR = 1 + (stateLoadTime + contextBuildTime + verifyTime) / baseTime
 */
export interface UpdatedTimeFormula {
  id: 'F-PLAN-005';
  version: '2.0';
  form: 'TIME(T) = EFFORT(T) × AVG_TIME × BUFFER × LATENCY_FACTOR';
  newCoefficients: [
    'K-LATENCY-001',  // State load time (ms)
    'K-LATENCY-002',  // Context build time (ms)
    'K-LATENCY-003',  // Verification time per level (ms)
    'K-LATENCY-004'   // Learning extraction time (ms)
  ];
}

/**
 * New coefficients needed for hook-aware planning
 */
export const NEW_COEFFICIENTS = {
  'K-HOOK-001': {
    name: 'Average Hook Execution Time',
    value: 5,
    uncertainty: 2,
    unit: 'ms',
    status: 'ESTIMATED',
    calibrationRequired: true
  },
  'K-HOOK-002': {
    name: 'Average Hooks Per Operation',
    value: 3.2,
    uncertainty: 0.8,
    unit: 'hooks/op',
    status: 'ESTIMATED',
    calibrationRequired: true
  },
  'K-COORD-001': {
    name: 'Agent Coordination Overhead',
    value: 0.05,
    uncertainty: 0.02,
    unit: 'dimensionless',
    status: 'ESTIMATED',
    calibrationRequired: true
  },
  'K-VERIFY-001': {
    name: 'Verification Level Overhead',
    value: 0.08,
    uncertainty: 0.03,
    unit: 'dimensionless',
    status: 'ESTIMATED',
    calibrationRequired: true
  },
  'K-LEARN-001': {
    name: 'Learning Extraction Overhead',
    value: 0.03,
    uncertainty: 0.01,
    unit: 'dimensionless',
    status: 'ESTIMATED',
    calibrationRequired: true
  },
  'K-LATENCY-001': {
    name: 'State Load Latency',
    value: 50,
    uncertainty: 20,
    unit: 'ms',
    status: 'ESTIMATED',
    calibrationRequired: true
  },
  'K-LATENCY-002': {
    name: 'Context Build Latency',
    value: 100,
    uncertainty: 40,
    unit: 'ms',
    status: 'ESTIMATED',
    calibrationRequired: true
  },
  'K-LATENCY-003': {
    name: 'Verification Latency Per Level',
    value: 200,
    uncertainty: 80,
    unit: 'ms',
    status: 'ESTIMATED',
    calibrationRequired: true
  },
  'K-LATENCY-004': {
    name: 'Learning Extraction Latency',
    value: 150,
    uncertainty: 50,
    unit: 'ms',
    status: 'ESTIMATED',
    calibrationRequired: true
  }
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export default ExtendedHookRegistry;
